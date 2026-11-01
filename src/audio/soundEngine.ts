import { SynthParams } from '../types/music';
import { midiToFrequency } from '../theory/engine';

interface ActiveVoice {
  osc1: OscillatorNode;
  osc2: OscillatorNode;
  subOsc: OscillatorNode;
  envGain: GainNode;
  filter: BiquadFilterNode;
  releaseTime: number;
  stopTimer?: number;
}

export function createImpulseResponseBuffer(
  ctx: BaseAudioContext,
  durationSeconds = 2.1,
  decayRate = 2.8
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * durationSeconds);
  const impulse = ctx.createBuffer(2, length, sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const channelData = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const t = i / length;
      const noise = Math.random() * 2 - 1;
      channelData[i] = noise * Math.pow(1 - t, decayRate);
    }
  }
  return impulse;
}

export function scheduleNoteOnAudioContext(
  ctx: BaseAudioContext,
  dryDestination: AudioNode,
  reverbSendDestination: AudioNode | null,
  delaySendDestination: AudioNode | null,
  midi: number,
  startTime: number,
  durationSeconds: number,
  velocity: number,
  params: SynthParams,
  trackVolume = 0.85,
  pan = 0,
  referenceA4 = 440
): void {
  const freq = midiToFrequency(midi, referenceA4);
  const velGain = Math.max(0.05, Math.min(1, velocity));
  const peakGain = Math.max(0.001, velGain * params.volume * trackVolume * 0.32);

  const attack = Math.max(0.003, params.attack);
  const decay = Math.max(0.01, params.decay);
  const sustain = Math.max(0.01, Math.min(1, params.sustain));
  const release = Math.max(0.02, params.release);

  const noteEnd = startTime + Math.max(0.04, durationSeconds);
  const stopAt = noteEnd + release + 0.05;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const subOsc = ctx.createOscillator();

  osc1.type = params.osc1Type;
  osc2.type = params.osc2Type;
  subOsc.type = 'sine';

  osc1.frequency.setValueAtTime(freq, startTime);
  osc2.frequency.setValueAtTime(freq, startTime);
  osc2.detune.setValueAtTime(params.osc2Detune, startTime);
  subOsc.frequency.setValueAtTime(freq * 0.5, startTime);

  const osc1Gain = ctx.createGain();
  const osc2Gain = ctx.createGain();
  const subGain = ctx.createGain();

  osc1Gain.gain.setValueAtTime(1 - params.oscMix * 0.6, startTime);
  osc2Gain.gain.setValueAtTime(params.oscMix * 0.8, startTime);
  subGain.gain.setValueAtTime(params.subOscLevel * 0.45, startTime);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  // Dynamic velocity-sensitive filter envelope
  const baseCutoff = Math.max(80, Math.min(18000, params.filterCutoff));
  const envCutoff = Math.min(
    18000,
    baseCutoff * (1 + velGain * 0.85)
  );
  filter.frequency.setValueAtTime(baseCutoff * 0.6, startTime);
  filter.frequency.linearRampToValueAtTime(envCutoff, startTime + attack);
  filter.frequency.exponentialRampToValueAtTime(
    Math.max(80, baseCutoff),
    startTime + attack + decay
  );
  filter.Q.setValueAtTime(Math.max(0.5, Math.min(15, params.filterResonance)), startTime);

  const envGain = ctx.createGain();
  envGain.gain.setValueAtTime(0.0001, startTime);
  envGain.gain.linearRampToValueAtTime(peakGain, startTime + attack);
  envGain.gain.exponentialRampToValueAtTime(
    Math.max(0.0005, peakGain * sustain),
    startTime + attack + decay
  );
  envGain.gain.setValueAtTime(
    Math.max(0.0005, peakGain * sustain),
    Math.max(startTime + attack + decay, noteEnd)
  );
  envGain.gain.exponentialRampToValueAtTime(0.0001, stopAt);

  const panner = ctx.createStereoPanner();
  panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), startTime);

  osc1.connect(osc1Gain);
  osc2.connect(osc2Gain);
  subOsc.connect(subGain);

  osc1Gain.connect(filter);
  osc2Gain.connect(filter);
  subGain.connect(filter);

  filter.connect(envGain);
  envGain.connect(panner);
  panner.connect(dryDestination);

  if (reverbSendDestination && params.reverbMix > 0.01) {
    const revSend = ctx.createGain();
    revSend.gain.setValueAtTime(params.reverbMix * 0.65, startTime);
    panner.connect(revSend);
    revSend.connect(reverbSendDestination);
  }

  if (delaySendDestination && params.delayMix > 0.01) {
    const delSend = ctx.createGain();
    delSend.gain.setValueAtTime(params.delayMix * 0.5, startTime);
    panner.connect(delSend);
    delSend.connect(delaySendDestination);
  }

  osc1.start(startTime);
  osc2.start(startTime);
  subOsc.start(startTime);

  osc1.stop(stopAt);
  osc2.stop(stopAt);
  subOsc.stop(stopAt);
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private reverbConvolver: ConvolverNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;

  private activeVoices: Map<string, ActiveVoice> = new Map();
  private masterVolume = 0.85;
  private referenceA4 = 440;
  private waveformArray: Uint8Array<ArrayBuffer> = new Uint8Array(256);
  private frequencyArray: Uint8Array<ArrayBuffer> = new Uint8Array(128);

  public initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;

      this.ctx = new AudioCtx();
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -14;
      this.compressor.knee.value = 18;
      this.compressor.ratio.value = 4;
      this.compressor.attack.value = 0.005;
      this.compressor.release.value = 0.18;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.masterVolume;

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.78;
      this.waveformArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.frequencyArray = new Uint8Array(this.analyser.frequencyBinCount);

      // Reverb bus
      this.reverbConvolver = this.ctx.createConvolver();
      this.reverbConvolver.buffer = createImpulseResponseBuffer(this.ctx, 2.0, 2.7);
      const reverbReturn = this.ctx.createGain();
      reverbReturn.gain.value = 0.75;
      this.reverbConvolver.connect(reverbReturn);
      reverbReturn.connect(this.compressor);

      // Stereo feedback delay bus
      this.delayNode = this.ctx.createDelay(1.5);
      this.delayNode.delayTime.value = 0.28;
      this.delayFeedback = this.ctx.createGain();
      this.delayFeedback.gain.value = 0.34;
      const delayFilter = this.ctx.createBiquadFilter();
      delayFilter.type = 'lowpass';
      delayFilter.frequency.value = 2600;

      this.delayNode.connect(delayFilter);
      delayFilter.connect(this.delayFeedback);
      this.delayFeedback.connect(this.delayNode);
      delayFilter.connect(this.compressor);

      this.compressor.connect(this.masterGain);
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public getCurrentTime(): number {
    const ctx = this.initContext();
    return ctx ? ctx.currentTime : performance.now() / 1000;
  }

  public setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.masterVolume,
        this.ctx.currentTime,
        0.015
      );
    }
  }

  public setReferenceA4(a4Hz: number): void {
    this.referenceA4 = Math.max(400, Math.min(480, a4Hz));
  }

  public noteOn(
    voiceKey: string,
    midi: number,
    velocity: number,
    params: SynthParams,
    trackVolume = 0.85,
    pan = 0
  ): void {
    const ctx = this.initContext();
    if (!ctx || !this.compressor) return;

    // If voice already active, stop it cleanly first
    if (this.activeVoices.has(voiceKey)) {
      this.noteOff(voiceKey, true);
    }

    const now = ctx.currentTime;
    const freq = midiToFrequency(midi, this.referenceA4);
    const velGain = Math.max(0.05, Math.min(1, velocity));
    const peakGain = Math.max(0.001, velGain * params.volume * trackVolume * 0.34);

    const attack = Math.max(0.003, params.attack);
    const decay = Math.max(0.01, params.decay);
    const sustain = Math.max(0.02, Math.min(1, params.sustain));

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const subOsc = ctx.createOscillator();

    osc1.type = params.osc1Type;
    osc2.type = params.osc2Type;
    subOsc.type = 'sine';

    osc1.frequency.setValueAtTime(freq, now);
    osc2.frequency.setValueAtTime(freq, now);
    osc2.detune.setValueAtTime(params.osc2Detune, now);
    subOsc.frequency.setValueAtTime(freq * 0.5, now);

    const osc1Gain = ctx.createGain();
    const osc2Gain = ctx.createGain();
    const subGain = ctx.createGain();

    osc1Gain.gain.setValueAtTime(1 - params.oscMix * 0.6, now);
    osc2Gain.gain.setValueAtTime(params.oscMix * 0.8, now);
    subGain.gain.setValueAtTime(params.subOscLevel * 0.45, now);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const baseCutoff = Math.max(80, Math.min(18000, params.filterCutoff));
    const envCutoff = Math.min(18000, baseCutoff * (1 + velGain * 0.85));
    filter.frequency.setValueAtTime(baseCutoff * 0.6, now);
    filter.frequency.linearRampToValueAtTime(envCutoff, now + attack);
    filter.frequency.exponentialRampToValueAtTime(
      Math.max(80, baseCutoff),
      now + attack + decay
    );
    filter.Q.setValueAtTime(
      Math.max(0.5, Math.min(15, params.filterResonance)),
      now
    );

    const envGain = ctx.createGain();
    envGain.gain.setValueAtTime(0.0001, now);
    envGain.gain.linearRampToValueAtTime(peakGain, now + attack);
    envGain.gain.exponentialRampToValueAtTime(
      Math.max(0.0005, peakGain * sustain),
      now + attack + decay
    );

    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), now);

    osc1.connect(osc1Gain);
    osc2.connect(osc2Gain);
    subOsc.connect(subGain);

    osc1Gain.connect(filter);
    osc2Gain.connect(filter);
    subGain.connect(filter);

    filter.connect(envGain);
    envGain.connect(panner);
    panner.connect(this.compressor);

    if (this.reverbConvolver && params.reverbMix > 0.01) {
      const revSend = ctx.createGain();
      revSend.gain.setValueAtTime(params.reverbMix * 0.65, now);
      panner.connect(revSend);
      revSend.connect(this.reverbConvolver);
    }

    if (this.delayNode && params.delayMix > 0.01) {
      this.delayNode.delayTime.setTargetAtTime(
        Math.max(0.05, Math.min(1.0, params.delayTime)),
        now,
        0.02
      );
      const delSend = ctx.createGain();
      delSend.gain.setValueAtTime(params.delayMix * 0.5, now);
      panner.connect(delSend);
      delSend.connect(this.delayNode);
    }

    osc1.start(now);
    osc2.start(now);
    subOsc.start(now);

    this.activeVoices.set(voiceKey, {
      osc1,
      osc2,
      subOsc,
      envGain,
      filter,
      releaseTime: Math.max(0.03, params.release),
    });
  }

  public noteOff(voiceKey: string, immediate = false): void {
    const voice = this.activeVoices.get(voiceKey);
    if (!voice || !this.ctx) return;

    this.activeVoices.delete(voiceKey);
    const now = this.ctx.currentTime;
    const rel = immediate ? 0.015 : voice.releaseTime;

    try {
      voice.envGain.gain.cancelScheduledValues(now);
      voice.envGain.gain.setValueAtTime(
        Math.max(0.0001, voice.envGain.gain.value),
        now
      );
      voice.envGain.gain.exponentialRampToValueAtTime(0.0001, now + rel);

      const stopTime = now + rel + 0.03;
      voice.osc1.stop(stopTime);
      voice.osc2.stop(stopTime);
      voice.subOsc.stop(stopTime);
    } catch {
      // Ignore already stopped oscillators
    }
  }

  public triggerNote(
    midi: number,
    durationSeconds: number,
    velocity: number,
    params: SynthParams,
    trackVolume = 0.85,
    pan = 0,
    delayOffsetSeconds = 0
  ): void {
    const ctx = this.initContext();
    if (!ctx || !this.compressor) return;

    const startTime = ctx.currentTime + Math.max(0, delayOffsetSeconds);
    if (this.delayNode) {
      this.delayNode.delayTime.setValueAtTime(
        Math.max(0.05, Math.min(1.0, params.delayTime)),
        startTime
      );
    }

    scheduleNoteOnAudioContext(
      ctx,
      this.compressor,
      this.reverbConvolver,
      this.delayNode,
      midi,
      startTime,
      durationSeconds,
      velocity,
      params,
      trackVolume,
      pan,
      this.referenceA4
    );
  }

  public triggerChord(
    midiNotes: number[],
    durationSeconds: number,
    velocity: number,
    params: SynthParams,
    arpeggiateStepSeconds = 0
  ): void {
    midiNotes.forEach((midi, idx) => {
      this.triggerNote(
        midi,
        durationSeconds,
        velocity,
        params,
        0.8,
        0,
        idx * arpeggiateStepSeconds
      );
    });
  }

  public triggerMetronomeClick(isDownbeat: boolean, volume = 0.45): void {
    const ctx = this.initContext();
    if (!ctx || !this.compressor) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    const baseFreq = isDownbeat ? 1180 : 780;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.45, now + 0.045);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume * 0.35, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);

    osc.connect(gain);
    gain.connect(this.compressor);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  public stopAllVoices(): void {
    for (const key of Array.from(this.activeVoices.keys())) {
      this.noteOff(key, true);
    }
  }

  public getWaveformData(): Uint8Array {
    if (!this.analyser) return this.waveformArray;
    this.analyser.getByteTimeDomainData(this.waveformArray);
    return this.waveformArray;
  }

  public getFrequencyData(): Uint8Array {
    if (!this.analyser) return this.frequencyArray;
    this.analyser.getByteFrequencyData(this.frequencyArray);
    return this.frequencyArray;
  }

  public getPeakLevel(): number {
    if (!this.analyser) return 0;
    this.analyser.getByteTimeDomainData(this.waveformArray);
    let maxDiff = 0;
    for (let i = 0; i < this.waveformArray.length; i++) {
      const diff = Math.abs(this.waveformArray[i] - 128) / 128;
      if (diff > maxDiff) maxDiff = diff;
    }
    return Math.min(1, maxDiff * 1.6);
  }
}

export const soundEngine = new SoundEngine();
