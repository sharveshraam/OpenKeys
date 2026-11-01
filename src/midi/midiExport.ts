import { NoteEvent, PresetId, ProjectData } from '../types/music';
import { applySwingOffset } from '../theory/engine';

const PPQ = 480; // Ticks per quarter note

const PRESET_TO_GM_PROGRAM: Record<PresetId, number> = {
  grand_piano: 0, // Acoustic Grand Piano
  warm_epiano: 4, // Electric Piano 1 (Rhodes)
  fm_bell: 11, // Vibraphone / Marimba
  crystal_pluck: 46, // Orchestral Harp
  analog_poly: 81, // Lead 2 (Sawtooth) / Poly
  velvet_pad: 89, // Pad 2 (Warm)
  cyber_lead: 80, // Lead 1 (Square/Saw)
  sub_bass: 38, // Synth Bass 1
};

function writeVarLen(value: number): number[] {
  let v = Math.max(0, Math.round(value));
  const bytes: number[] = [v & 0x7f];
  v >>= 7;
  while (v > 0) {
    bytes.unshift((v & 0x7f) | 0x80);
    v >>= 7;
  }
  return bytes;
}

function writeUint16BE(val: number): number[] {
  return [(val >> 8) & 0xff, val & 0xff];
}

function writeUint32BE(val: number): number[] {
  return [
    (val >> 24) & 0xff,
    (val >> 16) & 0xff,
    (val >> 8) & 0xff,
    val & 0xff,
  ];
}

function stringToAsciiBytes(str: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    bytes.push(str.charCodeAt(i) & 0x7f);
  }
  return bytes;
}

export function encodeProjectToMidiBytes(project: ProjectData): Uint8Array {
  const activeTracks = project.tracks.filter((t) => !t.muted);
  const anySolo = activeTracks.some((t) => t.solo);
  const tracksToExport = anySolo
    ? activeTracks.filter((t) => t.solo)
    : activeTracks;

  const trackChunks: number[][] = [];

  // Track 0: Conductor Track (Tempo, Time Signature, Project Name)
  const conductorEvents: number[] = [];
  const nameBytes = stringToAsciiBytes(project.name || 'OpenKeys Composition');
  conductorEvents.push(
    0x00,
    0xff,
    0x03,
    ...writeVarLen(nameBytes.length),
    ...nameBytes
  );

  // Time signature 4/4
  conductorEvents.push(0x00, 0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08);

  // Tempo in microseconds per quarter note
  const mpqn = Math.round(60_000_000 / Math.max(20, project.bpm));
  conductorEvents.push(
    0x00,
    0xff,
    0x51,
    0x03,
    (mpqn >> 16) & 0xff,
    (mpqn >> 8) & 0xff,
    mpqn & 0xff
  );

  // End of Track 0
  conductorEvents.push(0x00, 0xff, 0x2f, 0x00);
  trackChunks.push(conductorEvents);

  // Musical Tracks
  tracksToExport.forEach((track, idx) => {
    const channel = idx % 16 === 9 ? 10 : idx % 16; // Avoid GM drum channel 10 (index 9)
    const trackEvents: number[] = [];

    // Track Name Meta Event
    const tName = stringToAsciiBytes(track.name);
    trackEvents.push(
      0x00,
      0xff,
      0x03,
      ...writeVarLen(tName.length),
      ...tName
    );

    // Program Change
    const gmProgram = PRESET_TO_GM_PROGRAM[track.instrument] ?? 0;
    trackEvents.push(0x00, 0xc0 | channel, gmProgram & 0x7f);

    // Collect note on & off events for this track
    const trackNotes = project.notes.filter((n) => n.trackId === track.id);
    interface RawTickEvent {
      tick: number;
      type: 'on' | 'off';
      midi: number;
      velocity127: number;
    }
    const tickEvents: RawTickEvent[] = [];

    for (const note of trackNotes) {
      const swungStart = applySwingOffset(note.startBeat, project.swingAmount);
      const startTick = Math.max(0, Math.round(swungStart * PPQ));
      const durationTicks = Math.max(
        10,
        Math.round(note.durationBeats * PPQ)
      );
      const endTick = startTick + durationTicks;
      const vel127 = Math.max(
        1,
        Math.min(127, Math.round(note.velocity * track.volume * 127))
      );

      tickEvents.push({
        tick: startTick,
        type: 'on',
        midi: note.midi & 0x7f,
        velocity127: vel127,
      });
      tickEvents.push({
        tick: endTick,
        type: 'off',
        midi: note.midi & 0x7f,
        velocity127: 0,
      });
    }

    // Sort by tick, putting 'off' before 'on' at identical ticks to prevent overlapping note cutoffs
    tickEvents.sort((a, b) => {
      if (a.tick !== b.tick) return a.tick - b.tick;
      if (a.type === b.type) return a.midi - b.midi;
      return a.type === 'off' ? -1 : 1;
    });

    let lastTick = 0;
    for (const ev of tickEvents) {
      const delta = Math.max(0, ev.tick - lastTick);
      lastTick = ev.tick;
      const status = (ev.type === 'on' ? 0x90 : 0x80) | channel;
      trackEvents.push(
        ...writeVarLen(delta),
        status,
        ev.midi,
        ev.velocity127
      );
    }

    // End of Track
    trackEvents.push(0x00, 0xff, 0x2f, 0x00);
    trackChunks.push(trackEvents);
  });

  // Build final SMF Format 1 binary
  const headerChunk: number[] = [
    ...stringToAsciiBytes('MThd'),
    ...writeUint32BE(6),
    ...writeUint16BE(1), // Format 1 (multi-track)
    ...writeUint16BE(trackChunks.length),
    ...writeUint16BE(PPQ),
  ];

  const allBytes: number[] = [...headerChunk];
  for (const chunk of trackChunks) {
    allBytes.push(
      ...stringToAsciiBytes('MTrk'),
      ...writeUint32BE(chunk.length),
      ...chunk
    );
  }

  return new Uint8Array(allBytes);
}

export function downloadMidiFile(project: ProjectData): {
  filename: string;
  byteLength: number;
} {
  const bytes = encodeProjectToMidiBytes(project);
  const safeName =
    (project.name || 'openkeys-composition')
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/^-|-$/g, '') || 'openkeys';
  const filename = `${safeName}.mid`;

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  return { filename, byteLength: bytes.byteLength };
}

export function parseMidiBytesToNotes(
  buffer: ArrayBufferLike,
  targetTrackId: string
): { notes: NoteEvent[]; bpm?: number } {
  const bytes = new Uint8Array(buffer);
  let pos = 0;

  function readStr(len: number): string {
    let s = '';
    for (let i = 0; i < len && pos < bytes.length; i++) {
      s += String.fromCharCode(bytes[pos++]);
    }
    return s;
  }
  function readU16(): number {
    const v = (bytes[pos] << 8) | bytes[pos + 1];
    pos += 2;
    return v;
  }
  function readU32(): number {
    const v =
      ((bytes[pos] << 24) >>> 0) +
      (bytes[pos + 1] << 16) +
      (bytes[pos + 2] << 8) +
      bytes[pos + 3];
    pos += 4;
    return v;
  }
  function readVarLen(): number {
    let result = 0;
    while (pos < bytes.length) {
      const b = bytes[pos++];
      result = (result << 7) | (b & 0x7f);
      if ((b & 0x80) === 0) break;
    }
    return result;
  }

  if (readStr(4) !== 'MThd') {
    throw new Error('Invalid MIDI file header (missing MThd).');
  }
  const headerLen = readU32();
  readU16(); // format
  const numTracks = readU16();
  const division = readU16();
  const ticksPerBeat = division & 0x7fff || 480;
  pos = 8 + headerLen;

  const importedNotes: NoteEvent[] = [];
  let detectedBpm: number | undefined;

  for (let t = 0; t < numTracks && pos < bytes.length; t++) {
    const chunkId = readStr(4);
    const chunkLen = readU32();
    const chunkEnd = pos + chunkLen;
    if (chunkId !== 'MTrk') {
      pos = chunkEnd;
      continue;
    }

    let currentTick = 0;
    let runningStatus = 0;
    const openNotes = new Map<number, { startTick: number; velocity: number }>();

    while (pos < chunkEnd) {
      const delta = readVarLen();
      currentTick += delta;

      let status = bytes[pos];
      if (status < 0x80) {
        status = runningStatus;
      } else {
        pos++;
        if (status < 0xf0) runningStatus = status;
      }

      const cmd = status & 0xf0;
      if (cmd === 0x90) {
        const midi = bytes[pos++];
        const vel = bytes[pos++];
        if (vel > 0) {
          openNotes.set(midi, { startTick: currentTick, velocity: vel / 127 });
        } else {
          const started = openNotes.get(midi);
          if (started) {
            openNotes.delete(midi);
            const durBeats = Math.max(
              0.125,
              (currentTick - started.startTick) / ticksPerBeat
            );
            importedNotes.push({
              id: `midi-${Date.now()}-${importedNotes.length}`,
              midi,
              startBeat: started.startTick / ticksPerBeat,
              durationBeats: durBeats,
              velocity: started.velocity,
              trackId: targetTrackId,
            });
          }
        }
      } else if (cmd === 0x80) {
        const midi = bytes[pos++];
        pos++; // release vel
        const started = openNotes.get(midi);
        if (started) {
          openNotes.delete(midi);
          const durBeats = Math.max(
            0.125,
            (currentTick - started.startTick) / ticksPerBeat
          );
          importedNotes.push({
            id: `midi-${Date.now()}-${importedNotes.length}`,
            midi,
            startBeat: started.startTick / ticksPerBeat,
            durationBeats: durBeats,
            velocity: started.velocity,
            trackId: targetTrackId,
          });
        }
      } else if (cmd === 0xa0 || cmd === 0xb0 || cmd === 0xe0) {
        pos += 2;
      } else if (cmd === 0xc0 || cmd === 0xd0) {
        pos += 1;
      } else if (status === 0xff) {
        const metaType = bytes[pos++];
        const metaLen = readVarLen();
        if (metaType === 0x51 && metaLen === 3) {
          const mpqn =
            (bytes[pos] << 16) | (bytes[pos + 1] << 8) | bytes[pos + 2];
          if (mpqn > 0) {
            detectedBpm = Math.round(60_000_000 / mpqn);
          }
        }
        pos += metaLen;
      } else if (status === 0xf0 || status === 0xf7) {
        const sysexLen = readVarLen();
        pos += sysexLen;
      } else {
        break;
      }
    }
    pos = chunkEnd;
  }

  return { notes: importedNotes, bpm: detectedBpm };
}
