import {
  NoteNameSharp,
  NoteNameFlat,
  ScaleDefinition,
  ScaleId,
  QuantizeDivision,
  SwingPreset,
} from '../types/music';

export const NOTES_SHARP: NoteNameSharp[] = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];

export const NOTES_FLAT: NoteNameFlat[] = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'Gb',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
];

export const CHROMATIC_KEYS: {
  pitchClass: number;
  sharp: NoteNameSharp;
  flat: NoteNameFlat;
  dualLabel: string;
  isBlack: boolean;
}[] = [
  { pitchClass: 0, sharp: 'C', flat: 'C', dualLabel: 'C', isBlack: false },
  { pitchClass: 1, sharp: 'C#', flat: 'Db', dualLabel: 'C# / Db', isBlack: true },
  { pitchClass: 2, sharp: 'D', flat: 'D', dualLabel: 'D', isBlack: false },
  { pitchClass: 3, sharp: 'D#', flat: 'Eb', dualLabel: 'D# / Eb', isBlack: true },
  { pitchClass: 4, sharp: 'E', flat: 'E', dualLabel: 'E', isBlack: false },
  { pitchClass: 5, sharp: 'F', flat: 'F', dualLabel: 'F', isBlack: false },
  { pitchClass: 6, sharp: 'F#', flat: 'Gb', dualLabel: 'F# / Gb', isBlack: true },
  { pitchClass: 7, sharp: 'G', flat: 'G', dualLabel: 'G', isBlack: false },
  { pitchClass: 8, sharp: 'G#', flat: 'Ab', dualLabel: 'G# / Ab', isBlack: true },
  { pitchClass: 9, sharp: 'A', flat: 'A', dualLabel: 'A', isBlack: false },
  { pitchClass: 10, sharp: 'A#', flat: 'Bb', dualLabel: 'A# / Bb', isBlack: true },
  { pitchClass: 11, sharp: 'B', flat: 'B', dualLabel: 'B', isBlack: false },
];

export const SCALES: Record<ScaleId, ScaleDefinition> = {
  major: {
    id: 'major',
    name: 'Major (Ionian)',
    shortName: 'Major',
    intervals: [0, 2, 4, 5, 7, 9, 11],
    formula: ['1', '2', '3', '4', '5', '6', '7'],
    category: 'Diatonic & Minor',
    description: 'The foundational Western diatonic scale built on W-W-H-W-W-W-H steps.',
    mood: 'Bright, uplifting, consonant, resolved',
    preferFlatsInRoots: [1, 3, 5, 8, 10], // Db, Eb, F, Ab, Bb
  },
  natural_minor: {
    id: 'natural_minor',
    name: 'Natural Minor (Aeolian)',
    shortName: 'Natural Minor',
    intervals: [0, 2, 3, 5, 7, 8, 10],
    formula: ['1', '2', 'b3', '4', '5', 'b6', 'b7'],
    category: 'Diatonic & Minor',
    description: 'The relative minor scale (6th mode of Major) with lowered 3rd, 6th, and 7th degrees.',
    mood: 'Melancholic, introspective, emotional, serious',
    preferFlatsInRoots: [0, 2, 3, 5, 7, 8, 10],
  },
  harmonic_minor: {
    id: 'harmonic_minor',
    name: 'Harmonic Minor',
    shortName: 'Harmonic Min',
    intervals: [0, 2, 3, 5, 7, 8, 11],
    formula: ['1', '2', 'b3', '4', '5', 'b6', '7'],
    category: 'Diatonic & Minor',
    description: 'Natural minor with a raised 7th degree creating a strong leading tone and exotic augmented 2nd.',
    mood: 'Dramatic, classical, neoclassical, Middle-Eastern tension',
    preferFlatsInRoots: [0, 2, 3, 5, 7, 8, 10],
  },
  melodic_minor: {
    id: 'melodic_minor',
    name: 'Melodic Minor (Jazz Minor)',
    shortName: 'Melodic Min',
    intervals: [0, 2, 3, 5, 7, 9, 11],
    formula: ['1', '2', 'b3', '4', '5', '6', '7'],
    category: 'Diatonic & Minor',
    description: 'Minor third combined with a major upper tetrachord (natural 6th and 7th).',
    mood: 'Sophisticated, jazz-infused, mysterious yet ascending',
    preferFlatsInRoots: [0, 2, 3, 5, 7, 8, 10],
  },
  major_pentatonic: {
    id: 'major_pentatonic',
    name: 'Major Pentatonic',
    shortName: 'Maj Pentatonic',
    intervals: [0, 2, 4, 7, 9],
    formula: ['1', '2', '3', '5', '6'],
    category: 'Pentatonic & Blues',
    description: 'Five-note scale omitting the 4th and 7th degrees, eliminating semitone dissonance.',
    mood: 'Open, folk, joyful, universally consonant',
    preferFlatsInRoots: [1, 3, 5, 8, 10],
  },
  minor_pentatonic: {
    id: 'minor_pentatonic',
    name: 'Minor Pentatonic',
    shortName: 'Min Pentatonic',
    intervals: [0, 3, 5, 7, 10],
    formula: ['1', 'b3', '4', '5', 'b7'],
    category: 'Pentatonic & Blues',
    description: 'Essential five-note minor scale used across rock, pop, soul, and world traditions.',
    mood: 'Soulful, grounded, expressive, bold',
    preferFlatsInRoots: [0, 2, 3, 5, 7, 8, 10],
  },
  blues: {
    id: 'blues',
    name: 'Blues Scale',
    shortName: 'Blues',
    intervals: [0, 3, 5, 6, 7, 10],
    formula: ['1', 'b3', '4', 'b5', '5', 'b7'],
    category: 'Pentatonic & Blues',
    description: 'Minor pentatonic enriched with the expressive flat-5th "blue note".',
    mood: 'Gritty, bluesy, groovy, soulful tension',
    preferFlatsInRoots: [0, 2, 3, 5, 7, 8, 10],
  },
  dorian: {
    id: 'dorian',
    name: 'Dorian',
    shortName: 'Dorian',
    intervals: [0, 2, 3, 5, 7, 9, 10],
    formula: ['1', '2', 'b3', '4', '5', '6', 'b7'],
    category: 'Modal',
    description: 'Second mode of the Major scale; minor quality brightened by a raised natural 6th.',
    mood: 'Cool, groovy, jazz/funk, bittersweet',
    preferFlatsInRoots: [0, 2, 3, 5, 7, 8, 10],
  },
  phrygian: {
    id: 'phrygian',
    name: 'Phrygian',
    shortName: 'Phrygian',
    intervals: [0, 1, 3, 5, 7, 8, 10],
    formula: ['1', 'b2', 'b3', '4', '5', 'b6', 'b7'],
    category: 'Modal',
    description: 'Third mode of Major featuring a signature minor 2nd (flat-2) above the root.',
    mood: 'Flamenco, dark, Spanish, cinematic intensity',
    preferFlatsInRoots: [0, 1, 2, 3, 5, 7, 8, 10],
  },
  lydian: {
    id: 'lydian',
    name: 'Lydian',
    shortName: 'Lydian',
    intervals: [0, 2, 4, 6, 7, 9, 11],
    formula: ['1', '2', '3', '#4', '5', '6', '7'],
    category: 'Modal',
    description: 'Fourth mode of Major featuring an elevated #4 degree that creates floating wonder.',
    mood: 'Dreamy, celestial, film-score magic, weightless',
    preferFlatsInRoots: [5, 10],
  },
  mixolydian: {
    id: 'mixolydian',
    name: 'Mixolydian',
    shortName: 'Mixolydian',
    intervals: [0, 2, 4, 5, 7, 9, 10],
    formula: ['1', '2', '3', '4', '5', '6', 'b7'],
    category: 'Modal',
    description: 'Fifth mode of Major (dominant scale); major triad with a lowered b7 degree.',
    mood: 'Upbeat rock, blues-major, driving, adventurous',
    preferFlatsInRoots: [0, 1, 3, 5, 8, 10],
  },
  locrian: {
    id: 'locrian',
    name: 'Locrian',
    shortName: 'Locrian',
    intervals: [0, 1, 3, 5, 6, 8, 10],
    formula: ['1', 'b2', 'b3', '4', 'b5', 'b6', 'b7'],
    category: 'Modal',
    description: 'Seventh mode of Major with a diminished fifth (b5) and minor second (b2).',
    mood: 'Unstable, tense, enigmatic, avant-garde',
    preferFlatsInRoots: [0, 1, 2, 3, 5, 7, 8, 10],
  },
  whole_tone: {
    id: 'whole_tone',
    name: 'Whole Tone',
    shortName: 'Whole Tone',
    intervals: [0, 2, 4, 6, 8, 10],
    formula: ['1', '2', '3', '#4', '#5', 'b7'],
    category: 'Symmetric',
    description: 'Six-note symmetric scale built exclusively from whole-step (2-semitone) intervals.',
    mood: 'Impressionistic, floating, ambiguous, dreamlike',
  },
  chromatic: {
    id: 'chromatic',
    name: 'Chromatic (12-Tone)',
    shortName: 'Chromatic',
    intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    formula: ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'],
    category: 'Symmetric',
    description: 'All twelve semitones of the octave with unrestricted pitch freedom.',
    mood: 'Unrestricted, expressive, tension & release',
  },
};

export const SCALE_LIST: ScaleDefinition[] = [
  SCALES.major_pentatonic,
  SCALES.minor_pentatonic,
  SCALES.major,
  SCALES.natural_minor,
  SCALES.harmonic_minor,
  SCALES.melodic_minor,
  SCALES.blues,
  SCALES.dorian,
  SCALES.phrygian,
  SCALES.lydian,
  SCALES.mixolydian,
  SCALES.locrian,
  SCALES.whole_tone,
  SCALES.chromatic,
];

export interface IntervalInfo {
  semitones: number;
  shortName: string;
  name: string;
  quality: 'Perfect' | 'Major' | 'Minor' | 'Augmented/Diminished';
  consonance: 'Perfect Consonance' | 'Imperfect Consonance' | 'Mild Dissonance' | 'Sharp Dissonance';
  justRatio: string;
  songReference: string;
}

export const INTERVALS: IntervalInfo[] = [
  {
    semitones: 0,
    shortName: 'P1',
    name: 'Perfect Unison',
    quality: 'Perfect',
    consonance: 'Perfect Consonance',
    justRatio: '1:1',
    songReference: 'Same note repeated',
  },
  {
    semitones: 1,
    shortName: 'm2',
    name: 'Minor Second',
    quality: 'Minor',
    consonance: 'Sharp Dissonance',
    justRatio: '16:15',
    songReference: 'Jaws Theme',
  },
  {
    semitones: 2,
    shortName: 'M2',
    name: 'Major Second',
    quality: 'Major',
    consonance: 'Mild Dissonance',
    justRatio: '9:8',
    songReference: 'Happy Birthday ("Hap-py")',
  },
  {
    semitones: 3,
    shortName: 'm3',
    name: 'Minor Third',
    quality: 'Minor',
    consonance: 'Imperfect Consonance',
    justRatio: '6:5',
    songReference: 'Greensleeves / Smoke on the Water',
  },
  {
    semitones: 4,
    shortName: 'M3',
    name: 'Major Third',
    quality: 'Major',
    consonance: 'Imperfect Consonance',
    justRatio: '5:4',
    songReference: 'When the Saints Go Marching In',
  },
  {
    semitones: 5,
    shortName: 'P4',
    name: 'Perfect Fourth',
    quality: 'Perfect',
    consonance: 'Perfect Consonance',
    justRatio: '4:3',
    songReference: 'Here Comes the Bride',
  },
  {
    semitones: 6,
    shortName: 'TT',
    name: 'Tritone (Aug 4th / Dim 5th)',
    quality: 'Augmented/Diminished',
    consonance: 'Sharp Dissonance',
    justRatio: '45:32',
    songReference: 'The Simpsons / Maria (West Side Story)',
  },
  {
    semitones: 7,
    shortName: 'P5',
    name: 'Perfect Fifth',
    quality: 'Perfect',
    consonance: 'Perfect Consonance',
    justRatio: '3:2',
    songReference: 'Star Wars Main Theme / Twinkle Twinkle',
  },
  {
    semitones: 8,
    shortName: 'm6',
    name: 'Minor Sixth',
    quality: 'Minor',
    consonance: 'Imperfect Consonance',
    justRatio: '8:5',
    songReference: 'The Entertainer (crest leap)',
  },
  {
    semitones: 9,
    shortName: 'M6',
    name: 'Major Sixth',
    quality: 'Major',
    consonance: 'Imperfect Consonance',
    justRatio: '5:3',
    songReference: 'My Bonnie Lies Over the Ocean / NBC Chime',
  },
  {
    semitones: 10,
    shortName: 'm7',
    name: 'Minor Seventh',
    quality: 'Minor',
    consonance: 'Mild Dissonance',
    justRatio: '9:5',
    songReference: 'Star Trek Original Theme',
  },
  {
    semitones: 11,
    shortName: 'M7',
    name: 'Major Seventh',
    quality: 'Major',
    consonance: 'Sharp Dissonance',
    justRatio: '15:8',
    songReference: 'Take On Me (chorus leap)',
  },
  {
    semitones: 12,
    shortName: 'P8',
    name: 'Perfect Octave',
    quality: 'Perfect',
    consonance: 'Perfect Consonance',
    justRatio: '2:1',
    songReference: 'Somewhere Over the Rainbow',
  },
];

export interface ChordDefinition {
  id: string;
  name: string;
  symbol: string; // e.g. '', 'm', '7', 'maj7'
  intervals: number[]; // semitones from root
  formula: string[];
  category: 'Triads' | 'Seventh Chords' | 'Extended & Suspended';
  description: string;
}

export const CHORD_DEFINITIONS: ChordDefinition[] = [
  {
    id: 'maj',
    name: 'Major Triad',
    symbol: '',
    intervals: [0, 4, 7],
    formula: ['1', '3', '5'],
    category: 'Triads',
    description: 'Bright, stable three-note triad consisting of Root, Major 3rd, and Perfect 5th.',
  },
  {
    id: 'min',
    name: 'Minor Triad',
    symbol: 'm',
    intervals: [0, 3, 7],
    formula: ['1', 'b3', '5'],
    category: 'Triads',
    description: 'Warm, melancholic triad with Root, Minor 3rd, and Perfect 5th.',
  },
  {
    id: 'dim',
    name: 'Diminished Triad',
    symbol: 'dim',
    intervals: [0, 3, 6],
    formula: ['1', 'b3', 'b5'],
    category: 'Triads',
    description: 'Tense, symmetrical triad stacked from two minor thirds.',
  },
  {
    id: 'aug',
    name: 'Augmented Triad',
    symbol: 'aug',
    intervals: [0, 4, 8],
    formula: ['1', '3', '#5'],
    category: 'Triads',
    description: 'Dreamy, unstable triad stacked from two major thirds.',
  },
  {
    id: 'sus2',
    name: 'Suspended 2nd',
    symbol: 'sus2',
    intervals: [0, 2, 7],
    formula: ['1', '2', '5'],
    category: 'Extended & Suspended',
    description: 'Open, modern triad replacing the 3rd with a Major 2nd.',
  },
  {
    id: 'sus4',
    name: 'Suspended 4th',
    symbol: 'sus4',
    intervals: [0, 5, 7],
    formula: ['1', '4', '5'],
    category: 'Extended & Suspended',
    description: 'Anticipatory triad replacing the 3rd with a Perfect 4th.',
  },
  {
    id: '5',
    name: 'Power Chord (Fifth)',
    symbol: '5',
    intervals: [0, 7],
    formula: ['1', '5'],
    category: 'Triads',
    description: 'Root and Perfect 5th dyad with no 3rd, adaptable to both major and minor contexts.',
  },
  {
    id: 'maj7',
    name: 'Major 7th',
    symbol: 'maj7',
    intervals: [0, 4, 7, 11],
    formula: ['1', '3', '5', '7'],
    category: 'Seventh Chords',
    description: 'Lush, jazzy, nostalgic four-note chord with a Major 7th.',
  },
  {
    id: 'min7',
    name: 'Minor 7th',
    symbol: 'm7',
    intervals: [0, 3, 7, 10],
    formula: ['1', 'b3', '5', 'b7'],
    category: 'Seventh Chords',
    description: 'Smooth, soulful minor chord essential to jazz, R&B, and lo-fi.',
  },
  {
    id: 'dom7',
    name: 'Dominant 7th',
    symbol: '7',
    intervals: [0, 4, 7, 10],
    formula: ['1', '3', '5', 'b7'],
    category: 'Seventh Chords',
    description: 'Strong harmonic pull containing an internal tritone between 3 and b7.',
  },
  {
    id: 'm7b5',
    name: 'Half-Diminished 7th',
    symbol: 'm7b5',
    intervals: [0, 3, 6, 10],
    formula: ['1', 'b3', 'b5', 'b7'],
    category: 'Seventh Chords',
    description: 'Diminished triad with a minor 7th; the iiø7 chord in minor keys.',
  },
  {
    id: 'dim7',
    name: 'Fully Diminished 7th',
    symbol: 'dim7',
    intervals: [0, 3, 6, 9],
    formula: ['1', 'b3', 'b5', 'bb7'],
    category: 'Seventh Chords',
    description: 'Symmetrical chord dividing the octave into four equal minor thirds.',
  },
  {
    id: 'minmaj7',
    name: 'Minor-Major 7th',
    symbol: 'm(maj7)',
    intervals: [0, 3, 7, 11],
    formula: ['1', 'b3', '5', '7'],
    category: 'Seventh Chords',
    description: 'Cinematic " Hitchcock / Bond" mystery chord with minor 3rd and major 7th.',
  },
  {
    id: '6',
    name: 'Major 6th',
    symbol: '6',
    intervals: [0, 4, 7, 9],
    formula: ['1', '3', '5', '6'],
    category: 'Extended & Suspended',
    description: 'Warm, classic swing and bossa nova tonic chord.',
  },
  {
    id: 'm6',
    name: 'Minor 6th',
    symbol: 'm6',
    intervals: [0, 3, 7, 9],
    formula: ['1', 'b3', '5', '6'],
    category: 'Extended & Suspended',
    description: 'Dorian/melodic minor tonic color with a characteristic tritone between b3 and 6.',
  },
  {
    id: 'add9',
    name: 'Major Add9',
    symbol: 'add9',
    intervals: [0, 4, 7, 14],
    formula: ['1', '3', '5', '9'],
    category: 'Extended & Suspended',
    description: 'Sparkling major triad with an added 9th (no 7th).',
  },
  {
    id: 'maj9',
    name: 'Major 9th',
    symbol: 'maj9',
    intervals: [0, 4, 7, 11, 14],
    formula: ['1', '3', '5', '7', '9'],
    category: 'Extended & Suspended',
    description: 'Rich, expansive five-note chord popular in neo-soul and film scores.',
  },
  {
    id: 'min9',
    name: 'Minor 9th',
    symbol: 'm9',
    intervals: [0, 3, 7, 10, 14],
    formula: ['1', 'b3', '5', 'b7', '9'],
    category: 'Extended & Suspended',
    description: 'Velvety, expressive minor extension.',
  },
  {
    id: 'dom9',
    name: 'Dominant 9th',
    symbol: '9',
    intervals: [0, 4, 7, 10, 14],
    formula: ['1', '3', '5', 'b7', '9'],
    category: 'Extended & Suspended',
    description: 'Funky, soulful dominant chord used extensively in funk and jazz.',
  },
];

export interface CircleOfFifthsSlice {
  position: number; // 0..11 clockwise from 12 o'clock (C)
  majorRoot: number; // pitch class
  majorLabel: string;
  minorRoot: number; // relative minor pitch class
  minorLabel: string;
  diminishedRoot: number;
  diminishedLabel: string;
  sharps: number;
  flats: number;
  accidentalNotes: string[];
}

export const CIRCLE_OF_FIFTHS: CircleOfFifthsSlice[] = [
  {
    position: 0,
    majorRoot: 0,
    majorLabel: 'C',
    minorRoot: 9,
    minorLabel: 'Am',
    diminishedRoot: 11,
    diminishedLabel: 'B°',
    sharps: 0,
    flats: 0,
    accidentalNotes: [],
  },
  {
    position: 1,
    majorRoot: 7,
    majorLabel: 'G',
    minorRoot: 4,
    minorLabel: 'Em',
    diminishedRoot: 6,
    diminishedLabel: 'F#°',
    sharps: 1,
    flats: 0,
    accidentalNotes: ['F#'],
  },
  {
    position: 2,
    majorRoot: 2,
    majorLabel: 'D',
    minorRoot: 11,
    minorLabel: 'Bm',
    diminishedRoot: 1,
    diminishedLabel: 'C#°',
    sharps: 2,
    flats: 0,
    accidentalNotes: ['F#', 'C#'],
  },
  {
    position: 3,
    majorRoot: 9,
    majorLabel: 'A',
    minorRoot: 6,
    minorLabel: 'F#m',
    diminishedRoot: 8,
    diminishedLabel: 'G#°',
    sharps: 3,
    flats: 0,
    accidentalNotes: ['F#', 'C#', 'G#'],
  },
  {
    position: 4,
    majorRoot: 4,
    majorLabel: 'E',
    minorRoot: 1,
    minorLabel: 'C#m',
    diminishedRoot: 3,
    diminishedLabel: 'D#°',
    sharps: 4,
    flats: 0,
    accidentalNotes: ['F#', 'C#', 'G#', 'D#'],
  },
  {
    position: 5,
    majorRoot: 11,
    majorLabel: 'B',
    minorRoot: 8,
    minorLabel: 'G#m',
    diminishedRoot: 10,
    diminishedLabel: 'A#°',
    sharps: 5,
    flats: 0,
    accidentalNotes: ['F#', 'C#', 'G#', 'D#', 'A#'],
  },
  {
    position: 6,
    majorRoot: 6,
    majorLabel: 'F# / Gb',
    minorRoot: 3,
    minorLabel: 'D#m / Ebm',
    diminishedRoot: 5,
    diminishedLabel: 'E#° / F°',
    sharps: 6,
    flats: 6,
    accidentalNotes: ['F#', 'C#', 'G#', 'D#', 'A#', 'E#'],
  },
  {
    position: 7,
    majorRoot: 1,
    majorLabel: 'Db',
    minorRoot: 10,
    minorLabel: 'Bbm',
    diminishedRoot: 0,
    diminishedLabel: 'C°',
    sharps: 0,
    flats: 5,
    accidentalNotes: ['Bb', 'Eb', 'Ab', 'Db', 'Gb'],
  },
  {
    position: 8,
    majorRoot: 8,
    majorLabel: 'Ab',
    minorRoot: 5,
    minorLabel: 'Fm',
    diminishedRoot: 7,
    diminishedLabel: 'G°',
    sharps: 0,
    flats: 4,
    accidentalNotes: ['Bb', 'Eb', 'Ab', 'Db'],
  },
  {
    position: 9,
    majorRoot: 3,
    majorLabel: 'Eb',
    minorRoot: 0,
    minorLabel: 'Cm',
    diminishedRoot: 2,
    diminishedLabel: 'D°',
    sharps: 0,
    flats: 3,
    accidentalNotes: ['Bb', 'Eb', 'Ab'],
  },
  {
    position: 10,
    majorRoot: 10,
    majorLabel: 'Bb',
    minorRoot: 7,
    minorLabel: 'Gm',
    diminishedRoot: 9,
    diminishedLabel: 'A°',
    sharps: 0,
    flats: 2,
    accidentalNotes: ['Bb', 'Eb'],
  },
  {
    position: 11,
    majorRoot: 5,
    majorLabel: 'F',
    minorRoot: 2,
    minorLabel: 'Dm',
    diminishedRoot: 4,
    diminishedLabel: 'E°',
    sharps: 0,
    flats: 1,
    accidentalNotes: ['Bb'],
  },
];

export interface ProgressionPreset {
  id: string;
  name: string;
  genre: string;
  description: string;
  degrees: { degreeIndex: number; chordId: string; roman: string }[];
}

export const PROGRESSION_PRESETS: ProgressionPreset[] = [
  {
    id: 'pop_anthem',
    name: 'Pop Anthem (I – V – vi – IV)',
    genre: 'Pop / Rock',
    description: 'The most iconic modern progression, balancing optimism and emotional depth.',
    degrees: [
      { degreeIndex: 0, chordId: 'maj', roman: 'I' },
      { degreeIndex: 4, chordId: 'maj', roman: 'V' },
      { degreeIndex: 5, chordId: 'min', roman: 'vi' },
      { degreeIndex: 3, chordId: 'maj', roman: 'IV' },
    ],
  },
  {
    id: 'jazz_251',
    name: 'Jazz Cadence (ii7 – V7 – Imaj7 – vi7)',
    genre: 'Jazz / Lo-Fi',
    description: 'The cornerstone of jazz harmony with rich 7th voicings and smooth voice leading.',
    degrees: [
      { degreeIndex: 1, chordId: 'min7', roman: 'ii7' },
      { degreeIndex: 4, chordId: 'dom7', roman: 'V7' },
      { degreeIndex: 0, chordId: 'maj7', roman: 'Imaj7' },
      { degreeIndex: 5, chordId: 'min7', roman: 'vi7' },
    ],
  },
  {
    id: 'royal_road',
    name: 'Royal Road / Odo Shinko (IVmaj7 – V7 – iii7 – vi7)',
    genre: 'J-Pop / Anime / Electronic',
    description: 'Emotional, forward-moving progression beloved in Japanese pop and game soundtracks.',
    degrees: [
      { degreeIndex: 3, chordId: 'maj7', roman: 'IVmaj7' },
      { degreeIndex: 4, chordId: 'dom7', roman: 'V7' },
      { degreeIndex: 2, chordId: 'min7', roman: 'iii7' },
      { degreeIndex: 5, chordId: 'min7', roman: 'vi7' },
    ],
  },
  {
    id: 'andalusian',
    name: 'Andalusian Cadence (vi – V – IV – III7)',
    genre: 'Flamenco / Classical / Synthwave',
    description: 'Descending stepwise minor progression ending on a fiery Phrygian dominant chord.',
    degrees: [
      { degreeIndex: 5, chordId: 'min', roman: 'i (vi)' },
      { degreeIndex: 4, chordId: 'maj', roman: 'VII (V)' },
      { degreeIndex: 3, chordId: 'maj', roman: 'VI (IV)' },
      { degreeIndex: 2, chordId: 'dom7', roman: 'V7 (III7)' },
    ],
  },
  {
    id: 'neosoul_floating',
    name: 'Neo-Soul Drift (iv9 – bVII9 – Imaj9 – VI7)',
    genre: 'Neo-Soul / R&B',
    description: 'Lush extended 9th chords with modal interchange.',
    degrees: [
      { degreeIndex: 1, chordId: 'min9', roman: 'ii9' },
      { degreeIndex: 3, chordId: 'maj9', roman: 'IVmaj9' },
      { degreeIndex: 0, chordId: 'maj9', roman: 'Imaj9' },
      { degreeIndex: 5, chordId: 'min9', roman: 'vi9' },
    ],
  },
  {
    id: 'cinematic_lift',
    name: 'Cinematic Lift (i – VI – III – VII)',
    genre: 'Film Score / EDM',
    description: 'Heroic minor-key progression used in epic soundtracks.',
    degrees: [
      { degreeIndex: 5, chordId: 'min', roman: 'vi (i)' },
      { degreeIndex: 3, chordId: 'maj', roman: 'IV (VI)' },
      { degreeIndex: 0, chordId: 'maj', roman: 'I (III)' },
      { degreeIndex: 4, chordId: 'maj', roman: 'V (VII)' },
    ],
  },
];

export const QUANTIZE_OPTIONS: {
  id: QuantizeDivision;
  label: string;
  shortLabel: string;
  stepBeats: number; // in quarter-note beats
}[] = [
  { id: 'off', label: 'Off (Free)', shortLabel: 'Free', stepBeats: 0.0625 },
  { id: '1/4', label: '1/4 Note', shortLabel: '1/4', stepBeats: 1 },
  { id: '1/8', label: '1/8 Note', shortLabel: '1/8', stepBeats: 0.5 },
  { id: '1/8T', label: '1/8 Triplet', shortLabel: '1/8T', stepBeats: 1 / 3 },
  { id: '1/16', label: '1/16 Note', shortLabel: '1/16', stepBeats: 0.25 },
  { id: '1/16T', label: '1/16 Triplet', shortLabel: '1/16T', stepBeats: 1 / 6 },
  { id: '1/32', label: '1/32 Note', shortLabel: '1/32', stepBeats: 0.125 },
];

export const SWING_OPTIONS: {
  id: SwingPreset;
  label: string;
  amount: number;
}[] = [
  { id: 'off', label: 'Off', amount: 0 },
  { id: 'light', label: 'Light (22%)', amount: 0.22 },
  { id: 'medium', label: 'Medium (45%)', amount: 0.45 },
  { id: 'hard', label: 'Hard (66%)', amount: 0.66 },
];
