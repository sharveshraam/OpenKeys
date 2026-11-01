import { describe, expect, it } from 'vitest';
import {
  CHROMATIC_KEYS,
  CIRCLE_OF_FIFTHS,
  SCALES,
  SCALE_LIST,
} from '../theory/constants';
import {
  analyzeInterval,
   applySwingOffset,
  buildChordMidiNotes,
  getDiatonicChordsForScale,
  getKeySignatureInfo,
  getPitchClassName,
  identifyChordsFromMidi,
  isPitchClassInScale,
  midiToFrequency,
  midiToNoteName,
  quantizeBeat,
  snapMidiToScale,
} from '../theory/engine';
import {
  encodeProjectToMidiBytes,
  parseMidiBytesToNotes,
} from '../midi/midiExport';
import { renderProjectToWavBytes } from '../export/wavExport';
import { DEMO_PROJECTS } from '../storage/demoProjects';
import {
  deleteProjectFromDb,
  listProjectsFromDb,
  saveProjectToDb,
  validateImportedProjectJson,
} from '../storage/projectDb';

describe('OpenKeys Music Theory, MIDI, Audio Export & Storage Suite', () => {
  it('supports all 12 chromatic keys in both sharp and flat enharmonic spellings', () => {
    expect(CHROMATIC_KEYS).toHaveLength(12);
    expect(getPitchClassName(1, 'sharps')).toBe('C#');
    expect(getPitchClassName(1, 'flats')).toBe('Db');
    expect(getPitchClassName(3, 'sharps')).toBe('D#');
    expect(getPitchClassName(3, 'flats')).toBe('Eb');
    expect(getPitchClassName(6, 'sharps')).toBe('F#');
    expect(getPitchClassName(6, 'flats')).toBe('Gb');
    expect(getPitchClassName(8, 'sharps')).toBe('G#');
    expect(getPitchClassName(8, 'flats')).toBe('Ab');
    expect(getPitchClassName(10, 'sharps')).toBe('A#');
    expect(getPitchClassName(10, 'flats')).toBe('Bb');
    expect(midiToNoteName(60, 'sharps')).toBe('C4');
    expect(midiToNoteName(69, 'sharps')).toBe('A4');
  });

  it('implements all 14 required scales accurately', () => {
    const requiredIds = [
      'major',
      'natural_minor',
      'harmonic_minor',
      'melodic_minor',
      'major_pentatonic',
      'minor_pentatonic',
      'blues',
      'chromatic',
      'whole_tone',
      'dorian',
      'phrygian',
      'lydian',
      'mixolydian',
      'locrian',
    ] as const;

    expect(SCALE_LIST).toHaveLength(14);
    for (const id of requiredIds) {
      expect(SCALES[id]).toBeDefined();
      expect(SCALES[id].intervals[0]).toBe(0);
    }

    // Verify C Major Pentatonic (C D E G A -> 0, 2, 4, 7, 9)
    expect(isPitchClassInScale(0, 0, 'major_pentatonic')).toBe(true); // C
    expect(isPitchClassInScale(5, 0, 'major_pentatonic')).toBe(false); // F omitted
    expect(isPitchClassInScale(11, 0, 'major_pentatonic')).toBe(false); // B omitted
    expect(snapMidiToScale(65, 0, 'major_pentatonic')).toBe(64); // F4 snaps to E4
  });

  it('calculates exact Equal Temperament note frequencies', () => {
    expect(midiToFrequency(69, 440)).toBeCloseTo(440.0, 4);
    expect(midiToFrequency(57, 440)).toBeCloseTo(220.0, 4);
    expect(midiToFrequency(81, 440)).toBeCloseTo(880.0, 4);
    expect(midiToFrequency(60, 440)).toBeCloseTo(261.6256, 3);
    expect(midiToFrequency(69, 432)).toBeCloseTo(432.0, 4);
  });

  it('builds chords and identifies chords + inversions accurately', () => {
    // C Major 7th root position: C4 (60), E4 (64), G4 (67), B4 (71)
    const cMaj7 = buildChordMidiNotes(0, 'maj7', 4, 0, false);
    expect(cMaj7).toEqual([60, 64, 67, 71]);

    const matches = identifyChordsFromMidi(cMaj7, 'sharps', 0, 'major');
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].symbol).toBe('Cmaj7');
    expect(matches[0].inversionLabel).toBe('Root Position');

    // First inversion C Major Triad: E4 (64), G4 (67), C5 (72) -> C/E
    const cFirstInv = buildChordMidiNotes(0, 'maj', 4, 1, false);
    expect(cFirstInv).toEqual([64, 67, 72]);
    const invMatches = identifyChordsFromMidi(cFirstInv, 'sharps', 0, 'major');
    expect(invMatches[0].symbol).toBe('C/E');
    expect(invMatches[0].inversionLabel).toBe('1st Inversion');
  });

  it('analyzes intervals, diatonic chords, and Circle of Fifths key signatures', () => {
    const p5 = analyzeInterval(60, 67, 'sharps', 0, 'major', 440);
    expect(p5.totalSemitones).toBe(7);
    expect(p5.info.shortName).toBe('P5');
    expect(p5.info.justRatio).toBe('3:2');

    const cMajDiatonic = getDiatonicChordsForScale(0, 'major', 'sharps');
    expect(cMajDiatonic).toHaveLength(7);
    expect(cMajDiatonic[0].triadSymbol).toBe('C');
    expect(cMajDiatonic[1].triadSymbol).toBe('Dm');
    expect(cMajDiatonic[4].seventhSymbol).toBe('G7');
    expect(cMajDiatonic[6].triadSymbol).toBe('Bdim');

    expect(CIRCLE_OF_FIFTHS).toHaveLength(12);
    const gMajSig = getKeySignatureInfo(7, 'major');
    expect(gMajSig.sharps).toBe(1);
    expect(gMajSig.accidentalNotes).toEqual(['F#']);
  });

  it('quantizes beats and applies swing offset properly', () => {
    expect(quantizeBeat(1.11, '1/4')).toBeCloseTo(1.0, 4);
    expect(quantizeBeat(1.24, '1/16')).toBeCloseTo(1.25, 4);
    expect(applySwingOffset(0.5, 0)).toBeCloseTo(0.5, 4);
    expect(applySwingOffset(0.5, 0.5)).toBeGreaterThan(0.5);
  });

  it('encodes multi-track Standard MIDI Files (.mid) and parses them back', () => {
    const demo = DEMO_PROJECTS[0];
    const midiBytes = encodeProjectToMidiBytes(demo);
    expect(midiBytes.byteLength).toBeGreaterThan(100);
    // Check 'MThd' magic header
    const header = String.fromCharCode(
      midiBytes[0],
      midiBytes[1],
      midiBytes[2],
      midiBytes[3]
    );
    expect(header).toBe('MThd');

    // Parse back the generated MIDI binary
    const parsed = parseMidiBytesToNotes(midiBytes.buffer, 'track-1');
    expect(parsed.notes.length).toBe(demo.notes.length);
    expect(parsed.bpm).toBe(demo.bpm);
  });

  it('renders a valid stereo 16-bit PCM RIFF WAVE (.wav) audio file', async () => {
    const demo = DEMO_PROJECTS[0];
    const { bytes, durationSeconds } = await renderProjectToWavBytes(
      demo,
      440,
      22050
    );
    expect(durationSeconds).toBeGreaterThan(5);
    expect(bytes.byteLength).toBeGreaterThan(44);
    const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    const wave = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    expect(riff).toBe('RIFF');
    expect(wave).toBe('WAVE');
  });

  it('saves, lists, validates, and deletes projects in local storage/IndexedDB', async () => {
    const customProj = {
      ...DEMO_PROJECTS[0],
      id: 'test-custom-proj',
      name: 'Automated Test Composition',
    };
    await saveProjectToDb(customProj);
    const all = await listProjectsFromDb();
    expect(all.some((p) => p.id === 'test-custom-proj')).toBe(true);

    const validated = validateImportedProjectJson(JSON.stringify(customProj));
    expect(validated.name).toBe('Automated Test Composition');

    await deleteProjectFromDb('test-custom-proj');
    const afterDel = await listProjectsFromDb();
    expect(afterDel.some((p) => p.id === 'test-custom-proj')).toBe(false);
  });
});
