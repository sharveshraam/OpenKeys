import { ProjectData } from '../types/music';
import { applySwingOffset, midiToFrequency } from '../theory/engine';
import {
  createImpulseResponseBuffer,
  scheduleNoteOnAudioContext,
} from '../audio/soundEngine';

export function encodeStereoFloatToWav16(
  left: Float32Array,
  right: Float32Array,
  sampleRate = 44100
): Uint8Array {
  const numChannels = 2;
  const bytesPerSample = 2; // 16-bit PCM
  const numFrames = left.length;
  const dataByteLength = numFrames * numChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataByteLength);
  const view = new DataView(buffer);

  function writeAscii(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  // RIFF WAVE Header
  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + dataByteLength, true);
  writeAscii(8, 'WAVE');

  // fmt subchunk
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true); // ByteRate
  view.setUint16(32, numChannels * bytesPerSample, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample

  // data subchunk
  writeAscii(36, 'data');
  view.setUint32(40, dataByteLength, true);

  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    const lSample = Math.max(-1, Math.min(1, left[i]));
    const rSample = Math.max(-1, Math.min(1, right[i]));
    view.setInt16(
      offset,
      lSample < 0 ? lSample * 0x8000 : lSample * 0x7fff,
      true
    );
    view.setInt16(
      offset + 2,
      rSample < 0 ? rSample * 0x8000 : rSample * 0x7fff,
      true
    );
    offset += 4;
  }

  return new Uint8Array(buffer);
}

export async function renderProjectToWavBytes(
  project: ProjectData,
  referenceA4 = 440,
  sampleRate = 44100
): Promise<{
  bytes: Uint8Array;
  durationSeconds: number;
}> {
  const secondsPerBeat = 60 / Math.max(20, project.bpm);
  const loopDurationSeconds = project.loopBeats * secondsPerBeat;
  const tailSeconds = 1.6; // Allow reverb and release tails to decay naturally
  const totalDurationSeconds = Math.max(2, loopDurationSeconds + tailSeconds);
  const totalSamples = Math.ceil(totalDurationSeconds * sampleRate);

  const activeTracks = project.tracks.filter((t) => !t.muted);
  const anySolo = activeTracks.some((t) => t.solo);
  const audibleTracks = anySolo
    ? activeTracks.filter((t) => t.solo)
    : activeTracks;
  const trackMap = new Map(audibleTracks.map((t) => [t.id, t]));

  const OfflineCtx =
    typeof window !== 'undefined'
      ? window.OfflineAudioContext ||
        (
          window as unknown as {
            webkitOfflineAudioContext: typeof OfflineAudioContext;
          }
        ).webkitOfflineAudioContext
      : undefined;

  if (OfflineCtx) {
    const offline = new OfflineCtx(2, totalSamples, sampleRate);
    const masterGain = offline.createGain();
    masterGain.gain.value = Math.max(0.05, project.masterVolume);

    const compressor = offline.createDynamicsCompressor();
    compressor.threshold.value = -12;
    compressor.ratio.value = 3.5;

    const reverb = offline.createConvolver();
    reverb.buffer = createImpulseResponseBuffer(offline, 1.8, 2.8);
    const reverbReturn = offline.createGain();
    reverbReturn.gain.value = 0.65;
    reverb.connect(reverbReturn);
    reverbReturn.connect(compressor);

    const delay = offline.createDelay(1.5);
    delay.delayTime.value = 0.26;
    const delayFeedback = offline.createGain();
    delayFeedback.gain.value = 0.3;
    delay.connect(delayFeedback);
    delayFeedback.connect(delay);
    delay.connect(compressor);

    compressor.connect(masterGain);
    masterGain.connect(offline.destination);

    for (const note of project.notes) {
      const track = trackMap.get(note.trackId);
      if (!track) continue;

      const swungBeat = applySwingOffset(note.startBeat, project.swingAmount);
      const startTime = swungBeat * secondsPerBeat;
      const durationSec = Math.max(0.04, note.durationBeats * secondsPerBeat);

      scheduleNoteOnAudioContext(
        offline,
        compressor,
        reverb,
        delay,
        note.midi,
        startTime,
        durationSec,
        note.velocity,
        track.synthParams,
        track.volume,
        track.pan,
        referenceA4
      );
    }

    const renderedBuffer = await offline.startRendering();
    const left = renderedBuffer.getChannelData(0);
    const right =
      renderedBuffer.numberOfChannels > 1
        ? renderedBuffer.getChannelData(1)
        : left;

    return {
      bytes: encodeStereoFloatToWav16(left, right, sampleRate),
      durationSeconds: totalDurationSeconds,
    };
  }

  // Fallback software PCM synthesizer (for headless environments without OfflineAudioContext)
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  for (const note of project.notes) {
    const track = trackMap.get(note.trackId);
    if (!track) continue;

    const swungBeat = applySwingOffset(note.startBeat, project.swingAmount);
    const startSec = swungBeat * secondsPerBeat;
    const durSec = Math.max(0.04, note.durationBeats * secondsPerBeat);
    const relSec = Math.max(0.04, track.synthParams.release);
    const freq = midiToFrequency(note.midi, referenceA4);
    const amp =
      note.velocity *
      track.volume *
      track.synthParams.volume *
      project.masterVolume *
      0.22;

    const startSample = Math.max(0, Math.floor(startSec * sampleRate));
    const endSample = Math.min(
      totalSamples,
      Math.ceil((startSec + durSec + relSec) * sampleRate)
    );

    for (let i = startSample; i < endSample; i++) {
      const t = (i - startSample) / sampleRate;
      const attack = Math.max(0.005, track.synthParams.attack);
      let env = 1;
      if (t < attack) {
        env = t / attack;
      } else if (t > durSec) {
        env = Math.max(0, 1 - (t - durSec) / relSec);
      }
      const sig =
        (Math.sin(2 * Math.PI * freq * t) * 0.7 +
          Math.sin(4 * Math.PI * freq * t) * 0.3) *
        amp *
        env;
      left[i] += sig * (1 - Math.max(0, track.pan) * 0.5);
      right[i] += sig * (1 + Math.min(0, track.pan) * 0.5);
    }
  }

  return {
    bytes: encodeStereoFloatToWav16(left, right, sampleRate),
    durationSeconds: totalDurationSeconds,
  };
}

export async function downloadWavFile(
  project: ProjectData,
  referenceA4 = 440
): Promise<{
  filename: string;
  byteLength: number;
  durationSeconds: number;
}> {
  const { bytes, durationSeconds } = await renderProjectToWavBytes(
    project,
    referenceA4
  );
  const safeName =
    (project.name || 'openkeys-composition')
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/^-|-$/g, '') || 'openkeys';
  const filename = `${safeName}.wav`;

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  return { filename, byteLength: bytes.byteLength, durationSeconds };
}
