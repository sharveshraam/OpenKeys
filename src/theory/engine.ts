import {
  EnharmonicPreference,
  QuantizeDivision,
  ScaleId,
} from '../types/music';
import {
  CHORD_DEFINITIONS,
  ChordDefinition,
  CIRCLE_OF_FIFTHS,
  INTERVALS,
  IntervalInfo,
  NOTES_FLAT,
  NOTES_SHARP,
  QUANTIZE_OPTIONS,
  SCALES,
} from './constants';

export function normalizePitchClass(pc: number): number {
  return ((pc % 12) + 12) % 12;
}

export function shouldUseFlats(
  enharmonic: EnharmonicPreference,
  rootPitchClass = 0,
  scaleId: ScaleId = 'major'
): boolean {
  if (enharmonic === 'flats') return true;
  if (enharmonic === 'sharps') return false;
  const scale = SCALES[scaleId];
  if (scale?.preferFlatsInRoots?.includes(normalizePitchClass(rootPitchClass))) {
    return true;
  }
  return [1, 3, 5, 8, 10].includes(normalizePitchClass(rootPitchClass));
}

export function getPitchClassName(
  pitchClass: number,
  enharmonic: EnharmonicPreference = 'auto',
  rootPitchClass = 0,
  scaleId: ScaleId = 'major'
): string {
  const pc = normalizePitchClass(pitchClass);
  const useFlats = shouldUseFlats(enharmonic, rootPitchClass, scaleId);
  return useFlats ? NOTES_FLAT[pc] : NOTES_SHARP[pc];
}

export function getMidiOctave(midi: number): number {
  return Math.floor(midi / 12) - 1;
}

export function midiToNoteName(
  midi: number,
  enharmonic: EnharmonicPreference = 'auto',
  rootPitchClass = 0,
  scaleId: ScaleId = 'major'
): string {
  const name = getPitchClassName(midi, enharmonic, rootPitchClass, scaleId);
  const octave = getMidiOctave(midi);
  return `${name}${octave}`;
}

export function midiToFrequency(midi: number, referenceA4 = 440): number {
  return referenceA4 * Math.pow(2, (midi - 69) / 12);
}

export function frequencyToWavelengthCm(freqHz: number): number {
  if (freqHz <= 0) return 0;
  // Speed of sound in dry air at 20°C ~ 34,300 cm/s
  return 34300 / freqHz;
}

export function isBlackKey(midiOrPitchClass: number): boolean {
  const pc = normalizePitchClass(midiOrPitchClass);
  return [1, 3, 6, 8, 10].includes(pc);
}

export function isPitchClassInScale(
  pitchClass: number,
  rootPitchClass: number,
  scaleId: ScaleId
): boolean {
  const scale = SCALES[scaleId];
  if (!scale) return true;
  const interval = normalizePitchClass(pitchClass - rootPitchClass);
  return scale.intervals.includes(interval);
}

export function getScaleDegreeInfo(
  pitchClass: number,
  rootPitchClass: number,
  scaleId: ScaleId
): {
  inScale: boolean;
  isRoot: boolean;
  degreeNumber: number | null; // 1-based index in scale
  formulaLabel: string | null; // e.g. '1', 'b3', '5'
  semitonesFromRoot: number;
} {
  const semitonesFromRoot = normalizePitchClass(pitchClass - rootPitchClass);
  const scale = SCALES[scaleId];
  const idx = scale.intervals.indexOf(semitonesFromRoot);
  if (idx === -1) {
    return {
      inScale: false,
      isRoot: false,
      degreeNumber: null,
      formulaLabel: null,
      semitonesFromRoot,
    };
  }
  return {
    inScale: true,
    isRoot: semitonesFromRoot === 0,
    degreeNumber: idx + 1,
    formulaLabel: scale.formula[idx] ?? `${idx + 1}`,
    semitonesFromRoot,
  };
}

export function snapMidiToScale(
  midi: number,
  rootPitchClass: number,
  scaleId: ScaleId
): number {
  if (isPitchClassInScale(midi, rootPitchClass, scaleId)) {
    return midi;
  }
  for (let offset = 1; offset <= 6; offset++) {
    const lower = midi - offset;
    if (lower >= 0 && isPitchClassInScale(lower, rootPitchClass, scaleId)) {
      return lower;
    }
    const upper = midi + offset;
    if (upper <= 127 && isPitchClassInScale(upper, rootPitchClass, scaleId)) {
      return upper;
    }
  }
  return midi;
}

export interface ScaleNoteDetail {
  degree: number;
  pitchClass: number;
  noteName: string;
  formula: string;
  semitones: number;
  intervalName: string;
  midiExample: number; // in octave 4
  frequencyHz: number;
}

export function getScaleNotes(
  rootPitchClass: number,
  scaleId: ScaleId,
  enharmonic: EnharmonicPreference = 'auto',
  referenceA4 = 440
): ScaleNoteDetail[] {
  const scale = SCALES[scaleId];
  const baseRootMidi = 60 + normalizePitchClass(rootPitchClass);
  return scale.intervals.map((semitones, index) => {
    const pc = normalizePitchClass(rootPitchClass + semitones);
    const noteName = getPitchClassName(pc, enharmonic, rootPitchClass, scaleId);
    const midiExample = baseRootMidi + semitones;
    const intervalObj = INTERVALS[semitones] ?? INTERVALS[0];
    return {
      degree: index + 1,
      pitchClass: pc,
      noteName,
      formula: scale.formula[index] ?? `${index + 1}`,
      semitones,
      intervalName: intervalObj.name,
      midiExample,
      frequencyHz: midiToFrequency(midiExample, referenceA4),
    };
  });
}

export function buildChordMidiNotes(
  rootPitchClass: number,
  chordId: string,
  baseOctave = 4,
  inversion = 0,
  openVoicing = false
): number[] {
  const def = CHORD_DEFINITIONS.find((c) => c.id === chordId) ?? CHORD_DEFINITIONS[0];
  const rootMidi = (baseOctave + 1) * 12 + normalizePitchClass(rootPitchClass);
  const rawNotes = def.intervals.map((semi) => rootMidi + semi);

  // Apply inversion by shifting lowest notes up an octave
  const inverted = [...rawNotes];
  const invCount = Math.max(0, Math.min(inversion, inverted.length - 1));
  for (let i = 0; i < invCount; i++) {
    inverted[i] += 12;
  }
  inverted.sort((a, b) => a - b);

  if (openVoicing && inverted.length >= 3) {
    // Raise the 2nd voice from the bottom by an octave for lush spread voicing
    inverted[1] += 12;
    inverted.sort((a, b) => a - b);
  }
  return inverted;
}

export interface IdentifiedChordMatch {
  symbol: string;
  fullName: string;
  rootPitchClass: number;
  rootName: string;
  bassPitchClass: number;
  bassName: string;
  isSlashChord: boolean;
  inversionLabel: string;
  chordDefinition: ChordDefinition;
  confidence: number;
  notes: string[];
}

export function identifyChordsFromMidi(
  midiNotes: number[],
  enharmonic: EnharmonicPreference = 'auto',
  keyRoot = 0,
  scaleId: ScaleId = 'major'
): IdentifiedChordMatch[] {
  if (midiNotes.length < 2) return [];

  const sortedMidi = [...midiNotes].sort((a, b) => a - b);
  const bassPc = normalizePitchClass(sortedMidi[0]);
  const bassName = getPitchClassName(bassPc, enharmonic, keyRoot, scaleId);

  const uniquePcs = Array.from(
    new Set(sortedMidi.map((m) => normalizePitchClass(m)))
  );

  if (uniquePcs.length < 2) {
    const rootName = getPitchClassName(uniquePcs[0], enharmonic, keyRoot, scaleId);
    return [
      {
        symbol: `${rootName} (Octave)`,
        fullName: `${rootName} Perfect Octave`,
        rootPitchClass: uniquePcs[0],
        rootName,
        bassPitchClass: bassPc,
        bassName,
        isSlashChord: false,
        inversionLabel: 'Octave / Unison',
        chordDefinition: CHORD_DEFINITIONS[0],
        confidence: 100,
        notes: [rootName],
      },
    ];
  }

  const matches: IdentifiedChordMatch[] = [];

  for (const candidateRootPc of uniquePcs) {
    const activeIntervals = uniquePcs
      .map((pc) => normalizePitchClass(pc - candidateRootPc))
      .sort((a, b) => a - b);

    for (const def of CHORD_DEFINITIONS) {
      const defPitchClassSet = Array.from(
        new Set(def.intervals.map((i) => normalizePitchClass(i)))
      ).sort((a, b) => a - b);

      // Check exact pitch-class set match or match where only the 5th (7 semitones) is omitted in a 4+ note chord
      const isExact =
        defPitchClassSet.length === activeIntervals.length &&
        defPitchClassSet.every((val, i) => val === activeIntervals[i]);

      const withoutFifth = defPitchClassSet.filter((i) => i !== 7);
      const isFifthOmittedMatch =
        def.intervals.length >= 4 &&
        withoutFifth.length === activeIntervals.length &&
        withoutFifth.every((val, i) => val === activeIntervals[i]);

      if (isExact || isFifthOmittedMatch) {
        const rootName = getPitchClassName(
          candidateRootPc,
          enharmonic,
          keyRoot,
          scaleId
        );
        const isSlash = candidateRootPc !== bassPc;
        const bassInterval = normalizePitchClass(bassPc - candidateRootPc);
        let inversionLabel = 'Root Position';
        if (isSlash) {
          const idx = def.intervals.findIndex(
            (i) => normalizePitchClass(i) === bassInterval
          );
          if (idx === 1) inversionLabel = '1st Inversion';
          else if (idx === 2) inversionLabel = '2nd Inversion';
          else if (idx === 3) inversionLabel = '3rd Inversion';
          else inversionLabel = 'Slash Voicing';
        }

        const confidence =
          (isExact ? 90 : 75) +
          (isSlash ? 0 : 10) +
          (candidateRootPc === keyRoot ? 3 : 0);

        const symbol = isSlash
          ? `${rootName}${def.symbol}/${bassName}`
          : `${rootName}${def.symbol}`;

        const chordNotes = def.intervals.map((semi) =>
          getPitchClassName(
            candidateRootPc + semi,
            enharmonic,
            keyRoot,
            scaleId
          )
        );

        matches.push({
          symbol,
          fullName: `${rootName} ${def.name}${isSlash ? ` (over ${bassName})` : ''}`,
          rootPitchClass: candidateRootPc,
          rootName,
          bassPitchClass: bassPc,
          bassName,
          isSlashChord: isSlash,
          inversionLabel,
          chordDefinition: def,
          confidence,
          notes: chordNotes,
        });
      }
    }
  }

  // If 2 notes and no standard chord match, describe the dyad interval
  if (matches.length === 0 && uniquePcs.length === 2) {
    const semi = normalizePitchClass(sortedMidi[1] - sortedMidi[0]);
    const interval = INTERVALS[semi] ?? INTERVALS[0];
    const rootName = getPitchClassName(bassPc, enharmonic, keyRoot, scaleId);
    const upperName = getPitchClassName(
      sortedMidi[1],
      enharmonic,
      keyRoot,
      scaleId
    );
    matches.push({
      symbol: `${rootName} + ${upperName} (${interval.shortName})`,
      fullName: `${rootName}–${upperName} ${interval.name} Dyad`,
      rootPitchClass: bassPc,
      rootName,
      bassPitchClass: bassPc,
      bassName: rootName,
      isSlashChord: false,
      inversionLabel: 'Dyad Interval',
      chordDefinition: CHORD_DEFINITIONS[0],
      confidence: 65,
      notes: [rootName, upperName],
    });
  }

  return matches.sort((a, b) => b.confidence - a.confidence);
}

export interface AnalyzedInterval {
  midiLow: number;
  midiHigh: number;
  noteLow: string;
  noteHigh: string;
  totalSemitones: number;
  simpleSemitones: number;
  octaves: number;
  info: IntervalInfo;
  freqLow: number;
  freqHigh: number;
  freqRatioDecimal: number;
}

export function analyzeInterval(
  midiA: number,
  midiB: number,
  enharmonic: EnharmonicPreference = 'auto',
  keyRoot = 0,
  scaleId: ScaleId = 'major',
  referenceA4 = 440
): AnalyzedInterval {
  const midiLow = Math.min(midiA, midiB);
  const midiHigh = Math.max(midiA, midiB);
  const totalSemitones = midiHigh - midiLow;
  const octaves = Math.floor(totalSemitones / 12);
  const simpleSemitones =
    totalSemitones === 12 ? 12 : totalSemitones % 12;
  const info = INTERVALS[simpleSemitones] ?? INTERVALS[0];
  const freqLow = midiToFrequency(midiLow, referenceA4);
  const freqHigh = midiToFrequency(midiHigh, referenceA4);

  return {
    midiLow,
    midiHigh,
    noteLow: midiToNoteName(midiLow, enharmonic, keyRoot, scaleId),
    noteHigh: midiToNoteName(midiHigh, enharmonic, keyRoot, scaleId),
    totalSemitones,
    simpleSemitones,
    octaves,
    info,
    freqLow,
    freqHigh,
    freqRatioDecimal: freqHigh / freqLow,
  };
}

export interface DiatonicChordItem {
  degree: number;
  romanTriad: string;
  romanSeventh: string;
  rootPitchClass: number;
  rootName: string;
  triadId: string;
  triadSymbol: string;
  triadName: string;
  seventhId: string;
  seventhSymbol: string;
  seventhName: string;
  functionRole: string;
}

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

const FUNCTION_ROLES = [
  'Tonic (Home / Resolution)',
  'Supertonic (Predominant)',
  'Mediant (Tonic Counterpart)',
  'Subdominant (Movement / Lift)',
  'Dominant (Tension / Pull Home)',
  'Submediant (Relative Tonic)',
  'Leading Tone / Subtonic (Strong Pull)',
];

export function getDiatonicChordsForScale(
  rootPitchClass: number,
  scaleId: ScaleId,
  enharmonic: EnharmonicPreference = 'auto'
): DiatonicChordItem[] {
  const scale = SCALES[scaleId];
  const intervals = scale.intervals;
  const len = intervals.length;

  return intervals.map((degSemi, idx) => {
    const chordRootPc = normalizePitchClass(rootPitchClass + degSemi);
    const rootName = getPitchClassName(
      chordRootPc,
      enharmonic,
      rootPitchClass,
      scaleId
    );

    // Stack 3rds within the scale (or fallback to standard major/minor intervals for 5-note scales)
    let thirdSemi = 4;
    let fifthSemi = 7;
    let seventhSemi = 11;

    if (len === 7) {
      const thirdAbs = intervals[(idx + 2) % 7] + (idx + 2 >= 7 ? 12 : 0);
      const fifthAbs = intervals[(idx + 4) % 7] + (idx + 4 >= 7 ? 12 : 0);
      const seventhAbs = intervals[(idx + 6) % 7] + (idx + 6 >= 7 ? 12 : 0);
      thirdSemi = thirdAbs - degSemi;
      fifthSemi = fifthAbs - degSemi;
      seventhSemi = seventhAbs - degSemi;
    } else {
      // For pentatonic/blues/whole-tone/chromatic, determine nearest diatonic quality
      const hasMin3 = isPitchClassInScale(chordRootPc + 3, rootPitchClass, scaleId);
      const hasMaj3 = isPitchClassInScale(chordRootPc + 4, rootPitchClass, scaleId);
      thirdSemi = hasMin3 && !hasMaj3 ? 3 : 4;
      fifthSemi = 7;
      seventhSemi = thirdSemi === 3 ? 10 : 11;
    }

    let triadId = 'maj';
    let triadSuffix = '';
    let triadQualityName = 'Major';
    let romanBase = ROMAN_NUMERALS[idx % 7] ?? `${idx + 1}`;

    if (thirdSemi === 3 && fifthSemi === 7) {
      triadId = 'min';
      triadSuffix = 'm';
      triadQualityName = 'Minor';
      romanBase = romanBase.toLowerCase();
    } else if (thirdSemi === 3 && fifthSemi === 6) {
      triadId = 'dim';
      triadSuffix = 'dim';
      triadQualityName = 'Diminished';
      romanBase = `${romanBase.toLowerCase()}°`;
    } else if (thirdSemi === 4 && fifthSemi === 8) {
      triadId = 'aug';
      triadSuffix = 'aug';
      triadQualityName = 'Augmented';
      romanBase = `${romanBase}+`;
    }

    let seventhId = 'maj7';
    let seventhSuffix = 'maj7';
    let seventhQualityName = 'Major 7th';
    let romanSeventh = `${romanBase}maj7`;

    if (triadId === 'maj' && seventhSemi === 10) {
      seventhId = 'dom7';
      seventhSuffix = '7';
      seventhQualityName = 'Dominant 7th';
      romanSeventh = `${romanBase}7`;
    } else if (triadId === 'min' && seventhSemi === 10) {
      seventhId = 'min7';
      seventhSuffix = 'm7';
      seventhQualityName = 'Minor 7th';
      romanSeventh = `${romanBase}7`;
    } else if (triadId === 'min' && seventhSemi === 11) {
      seventhId = 'minmaj7';
      seventhSuffix = 'm(maj7)';
      seventhQualityName = 'Minor-Major 7th';
      romanSeventh = `${romanBase}(maj7)`;
    } else if (triadId === 'dim' && seventhSemi === 10) {
      seventhId = 'm7b5';
      seventhSuffix = 'm7b5';
      seventhQualityName = 'Half-Diminished 7th';
      romanSeventh = `${(ROMAN_NUMERALS[idx % 7] ?? '').toLowerCase()}ø7`;
    } else if (triadId === 'dim' && seventhSemi === 9) {
      seventhId = 'dim7';
      seventhSuffix = 'dim7';
      seventhQualityName = 'Diminished 7th';
      romanSeventh = `${romanBase}7`;
    }

    return {
      degree: idx + 1,
      romanTriad: romanBase,
      romanSeventh,
      rootPitchClass: chordRootPc,
      rootName,
      triadId,
      triadSymbol: `${rootName}${triadSuffix}`,
      triadName: `${rootName} ${triadQualityName}`,
      seventhId,
      seventhSymbol: `${rootName}${seventhSuffix}`,
      seventhName: `${rootName} ${seventhQualityName}`,
      functionRole: FUNCTION_ROLES[idx % 7] ?? 'Scale Tone',
    };
  });
}

export function getKeySignatureInfo(rootPitchClass: number, scaleId: ScaleId) {
  // Determine effective major tonic for key signature lookup
  const modeOffsets: Partial<Record<ScaleId, number>> = {
    major: 0,
    major_pentatonic: 0,
    natural_minor: 3,
    harmonic_minor: 3,
    melodic_minor: 3,
    minor_pentatonic: 3,
    blues: 3,
    dorian: 10,
    phrygian: 8,
    lydian: 7,
    mixolydian: 5,
    locrian: 1,
  };
  const offset = modeOffsets[scaleId] ?? 0;
  const effectiveMajorPc = normalizePitchClass(rootPitchClass + offset);
  const slice =
    CIRCLE_OF_FIFTHS.find((s) => s.majorRoot === effectiveMajorPc) ??
    CIRCLE_OF_FIFTHS[0];
  return slice;
}

export function getQuantizeStepBeats(division: QuantizeDivision): number {
  const opt = QUANTIZE_OPTIONS.find((q) => q.id === division);
  return opt ? opt.stepBeats : 0.25;
}

export function quantizeBeat(beat: number, division: QuantizeDivision): number {
  if (division === 'off') {
    return Math.max(0, Math.round(beat * 64) / 64);
  }
  const step = getQuantizeStepBeats(division);
  return Math.max(0, Math.round(beat / step) * step);
}

export function applySwingOffset(beat: number, swingAmount: number): number {
  if (swingAmount <= 0) return beat;
  // Apply swing to off-beat 8th-note subdivisions (every 0.5 beat within a 1-beat cycle)
  const beatFloor = Math.floor(beat);
  const sub = beat - beatFloor;
  // Map [0, 0.5] -> [0, 0.5 + swingAmount * 0.25] and [0.5, 1.0] -> [0.5 + swingAmount * 0.25, 1.0]
  const pivot = 0.5 + swingAmount * 0.22;
  if (sub <= 0.5) {
    return beatFloor + (sub / 0.5) * pivot;
  }
  return beatFloor + pivot + ((sub - 0.5) / 0.5) * (1 - pivot);
}
