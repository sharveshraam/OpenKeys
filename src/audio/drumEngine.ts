import { soundEngine } from './soundEngine';

export type DrumVoiceId =
  | 'kick'
  | 'snare'
  | 'clap'
  | 'hihat_closed'
  | 'hihat_open'
  | 'tom_low'
  | 'tom_high'
  | 'rim'
  | 'cymbal';

export type DrumKitId = 'studio_808' | 'acoustic_warm' | 'electro_909' | 'lofi_dust';

export interface DrumVoiceConfig {
  id: DrumVoiceId;
  name: string;
  shortName: string;
  gmMidiNote: number; // General MIDI Channel 10 note number
  color: string;
  volume: number; // 0..1
  tune: number; // -12..+12 semitones
  decay: number; // 0.2..2.0 multiplier
  muted: boolean;
  solo: boolean;
}

export interface DrumPatternPreset {
  id: string;
  name: string;
  genre: string;
  bpm?: number;
  // 16 steps per voice: 0 = off, 1 = normal (0.8), 2 = accent (1.0), 3 = ghost (0.45)
  steps: Record<DrumVoiceId, number[]>;
}

export const DEFAULT_DRUM_VOICES: DrumVoiceConfig[] = [
  {
    id: 'kick',
    name: 'Sub Punch Kick',
    shortName: 'KICK',
    gmMidiNote: 36,
    color: '#ef4444',
    volume: 0.92,
    tune: 0,
    decay: 1.0,
    muted: false,
    solo: false,
  },
  {
    id: 'snare',
    name: 'Crisp Studio Snare',
    shortName: 'SNARE',
    gmMidiNote: 38,
    color: '#f59e0b',
    volume: 0.85,
    tune: 0,
    decay: 1.0,
    muted: false,
    solo: false,
  },
  {
    id: 'clap',
    name: 'Stereo Hand Clap',
    shortName: 'CLAP',
    gmMidiNote: 39,
    color: '#ec4899',
    volume: 0.78,
    tune: 0,
    decay: 1.0,
    muted: false,
    solo: false,
  },
  {
    id: 'hihat_closed',
    name: 'Closed Hi-Hat',
    shortName: 'CHH',
    gmMidiNote: 42,
    color: '#06b6d4',
    volume: 0.72,
    tune: 0,
    decay: 1.0,
    muted: false,
    solo: false,
  },
  {
    id: 'hihat_open',
    name: 'Open Hi-Hat',
    shortName: 'OHH',
    gmMidiNote: 46,
    color: '#38bdf8',
    volume: 0.7,
    tune: 0,
    decay: 1.0,
    muted: false,
    solo: false,
  },
  {
    id: 'tom_low',
    name: 'Floor Tom',
    shortName: 'LTOM',
    gmMidiNote: 45,
    color: '#8b5cf6',
    volume: 0.8,
    tune: 0,
    decay: 1.0,
    muted: false,
    solo: false,
  },
  {
    id: 'tom_high',
    name: 'High Rack Tom',
    shortName: 'HTOM',
    gmMidiNote: 50,
    color: '#a855f7',
    volume: 0.78,
    tune: 0,
    decay: 1.0,
    muted: false,
    solo: false,
  },
  {
    id: 'rim',
    name: 'Rimshot / Wood',
    shortName: 'RIM',
    gmMidiNote: 37,
    color: '#10b981',
    volume: 0.75,
    tune: 0,
    decay: 1.0,
    muted: false,
    solo: false,
  },
  {
    id: 'cymbal',
    name: 'Shimmer Ride / Crash',
    shortName: 'CYM',
    gmMidiNote: 49,
    color: '#eab308',
    volume: 0.65,
    tune: 0,
    decay: 1.0,
    muted: false,
    solo: false,
  },
];

export const DRUM_PATTERN_PRESETS: DrumPatternPreset[] = [
  {
    id: 'lofi_chill',
    name: 'Lo-Fi Chill Groove',
    genre: 'Lo-Fi / Neo-Soul',
    steps: {
      kick:         [2, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0],
      snare:        [0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 3],
      clap:         [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hihat_closed: [1, 0, 1, 0, 1, 0, 1, 3, 1, 0, 1, 0, 1, 0, 1, 0],
      hihat_open:   [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
      tom_low:      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      tom_high:     [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
      rim:          [0, 0, 0, 1, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0],
      cymbal:       [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
  },
  {
    id: 'house_909',
    name: 'Four-on-the-Floor Club',
    genre: 'House / Electronic',
    steps: {
      kick:         [2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0],
      snare:        [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      clap:         [0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0],
      hihat_closed: [1, 3, 0, 3, 1, 3, 0, 3, 1, 3, 0, 3, 1, 3, 0, 3],
      hihat_open:   [0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0],
      tom_low:      [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0],
      tom_high:     [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
      rim:          [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      cymbal:       [2, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    },
  },
  {
    id: 'trap_808',
    name: '808 Bounce & Hat Rolls',
    genre: 'Hip-Hop / Trap',
    steps: {
      kick:         [2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 1, 0, 0, 0, 1, 0],
      snare:        [0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0],
      clap:         [0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 1],
      hihat_closed: [2, 1, 1, 2, 1, 3, 2, 1, 2, 1, 1, 1, 2, 3, 2, 1],
      hihat_open:   [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      tom_low:      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
      tom_high:     [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
      rim:          [0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
      cymbal:       [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
  },
  {
    id: 'synthwave_drive',
    name: 'Synthwave Midnight Drive',
    genre: 'Synthwave / Pop',
    steps: {
      kick:         [2, 0, 0, 1, 0, 0, 2, 0, 2, 0, 0, 1, 0, 0, 2, 0],
      snare:        [0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0],
      clap:         [0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0],
      hihat_closed: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
      hihat_open:   [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0],
      tom_low:      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2],
      tom_high:     [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 0, 0],
      rim:          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      cymbal:       [2, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    },
  },
  {
    id: 'bossa_latin',
    name: 'Bossa Nova & Clave',
    genre: 'Jazz / Latin',
    steps: {
      kick:         [2, 0, 0, 1, 1, 0, 0, 1, 2, 0, 0, 1, 1, 0, 0, 1],
      snare:        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      clap:         [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      hihat_closed: [1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3],
      hihat_open:   [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
      tom_low:      [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
      tom_high:     [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
      rim:          [2, 0, 0, 2, 0, 0, 2, 0, 0, 0, 2, 0, 2, 0, 0, 0],
      cymbal:       [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    },
  },
];

function createNoiseBuffer(ctx: BaseAudioContext, seconds = 1.0): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buf;
}

export function scheduleDrumHitOnContext(
  ctx: BaseAudioContext,
  destination: AudioNode,
  voiceId: DrumVoiceId,
  startTime: number,
  velocity = 0.85,
  voiceConfig?: Partial<DrumVoiceConfig>,
  kit: DrumKitId = 'studio_808'
): void {
  const vol = (voiceConfig?.volume ?? 0.85) * velocity;
  if (vol <= 0.005) return;

  const tuneSemi =
    (voiceConfig?.tune ?? 0) +
    (kit === 'electro_909' ? 2 : kit === 'lofi_dust' ? -2 : 0);
  const pitchMult = Math.pow(2, tuneSemi / 12);
  const decayMult =
    (voiceConfig?.decay ?? 1.0) *
    (kit === 'studio_808' ? 1.25 : kit === 'lofi_dust' ? 0.75 : 1.0);

  if (voiceId === 'kick') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const dur = 0.38 * decayMult;

    osc.frequency.setValueAtTime(145 * pitchMult, startTime);
    osc.frequency.exponentialRampToValueAtTime(
      46 * pitchMult,
      startTime + 0.065
    );
    osc.frequency.exponentialRampToValueAtTime(
      28 * pitchMult,
      startTime + dur
    );

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(vol * 0.9, startTime + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0005, startTime + dur);

    osc.connect(gain);
    gain.connect(destination);
    osc.start(startTime);
    osc.stop(startTime + dur + 0.02);
    return;
  }

  if (voiceId === 'snare') {
    // Tone body
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(210 * pitchMult, startTime);
    osc.frequency.exponentialRampToValueAtTime(
      115 * pitchMult,
      startTime + 0.09
    );

    oscGain.gain.setValueAtTime(vol * 0.55, startTime);
    oscGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.14);
    osc.connect(oscGain);
    oscGain.connect(destination);
    osc.start(startTime);
    osc.stop(startTime + 0.15);

    // Snare noise wires
    const noiseDur = 0.22 * decayMult;
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(ctx, noiseDur + 0.05);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(950 * pitchMult, startTime);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(vol * 0.55, startTime);
    nGain.gain.exponentialRampToValueAtTime(0.0008, startTime + noiseDur);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(destination);
    noise.start(startTime);
    noise.stop(startTime + noiseDur + 0.02);
    return;
  }

  if (voiceId === 'clap') {
    const dur = 0.24 * decayMult;
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(ctx, dur + 0.05);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1350 * pitchMult, startTime);
    filter.Q.setValueAtTime(1.8, startTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, startTime);
    // Multi-burst hand clap envelope
    gain.gain.linearRampToValueAtTime(vol * 0.65, startTime + 0.004);
    gain.gain.linearRampToValueAtTime(vol * 0.15, startTime + 0.011);
    gain.gain.linearRampToValueAtTime(vol * 0.65, startTime + 0.015);
    gain.gain.linearRampToValueAtTime(vol * 0.18, startTime + 0.024);
    gain.gain.linearRampToValueAtTime(vol * 0.6, startTime + 0.029);
    gain.gain.exponentialRampToValueAtTime(0.0008, startTime + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    noise.start(startTime);
    noise.stop(startTime + dur + 0.02);
    return;
  }

  if (voiceId === 'hihat_closed' || voiceId === 'hihat_open' || voiceId === 'cymbal') {
    const baseDur =
      voiceId === 'hihat_closed'
        ? 0.058
        : voiceId === 'hihat_open'
        ? 0.34
        : 0.75;
    const dur = baseDur * decayMult;
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(ctx, dur + 0.04);

    const filter = ctx.createBiquadFilter();
    filter.type = voiceId === 'cymbal' ? 'bandpass' : 'highpass';
    filter.frequency.setValueAtTime(
      (voiceId === 'cymbal' ? 5400 : 7200) * pitchMult,
      startTime
    );

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.48, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0005, startTime + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    noise.start(startTime);
    noise.stop(startTime + dur + 0.02);
    return;
  }

  if (voiceId === 'tom_low' || voiceId === 'tom_high') {
    const startFreq = (voiceId === 'tom_low' ? 115 : 175) * pitchMult;
    const endFreq = (voiceId === 'tom_low' ? 54 : 88) * pitchMult;
    const dur = 0.28 * decayMult;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + dur);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.72, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0008, startTime + dur);

    osc.connect(gain);
    gain.connect(destination);
    osc.start(startTime);
    osc.stop(startTime + dur + 0.02);
    return;
  }

  if (voiceId === 'rim') {
    const dur = 0.055 * decayMult;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(840 * pitchMult, startTime);
    osc.frequency.exponentialRampToValueAtTime(360 * pitchMult, startTime + dur);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.6, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0008, startTime + dur);

    osc.connect(gain);
    gain.connect(destination);
    osc.start(startTime);
    osc.stop(startTime + dur + 0.01);
  }
}

export function triggerDrumLive(
  voiceId: DrumVoiceId,
  velocity = 0.85,
  voiceConfig?: Partial<DrumVoiceConfig>,
  kit: DrumKitId = 'studio_808'
): void {
  const ctx = soundEngine.initContext();
  if (!ctx) return;
  scheduleDrumHitOnContext(
    ctx,
    ctx.destination,
    voiceId,
    ctx.currentTime,
    velocity,
    voiceConfig,
    kit
  );
}
