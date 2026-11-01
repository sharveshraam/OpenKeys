export type NoteNameSharp =
  | 'C'
  | 'C#'
  | 'D'
  | 'D#'
  | 'E'
  | 'F'
  | 'F#'
  | 'G'
  | 'G#'
  | 'A'
  | 'A#'
  | 'B';

export type NoteNameFlat =
  | 'C'
  | 'Db'
  | 'D'
  | 'Eb'
  | 'E'
  | 'F'
  | 'Gb'
  | 'G'
  | 'Ab'
  | 'A'
  | 'Bb'
  | 'B';

export type EnharmonicPreference = 'auto' | 'sharps' | 'flats';

export type ScaleId =
  | 'major'
  | 'natural_minor'
  | 'harmonic_minor'
  | 'melodic_minor'
  | 'major_pentatonic'
  | 'minor_pentatonic'
  | 'blues'
  | 'chromatic'
  | 'whole_tone'
  | 'dorian'
  | 'phrygian'
  | 'lydian'
  | 'mixolydian'
  | 'locrian';

export interface ScaleDefinition {
  id: ScaleId;
  name: string;
  shortName: string;
  intervals: number[]; // semitones from root (0..11)
  formula: string[]; // scale degree labels e.g. ['1', '2', 'b3', ...]
  category: 'Diatonic & Minor' | 'Pentatonic & Blues' | 'Modal' | 'Symmetric';
  description: string;
  mood: string;
  preferFlatsInRoots?: number[]; // pitch classes that naturally use flats in this scale
}

export type QuantizeDivision =
  | 'off'
  | '1/4'
  | '1/8'
  | '1/8T'
  | '1/16'
  | '1/16T'
  | '1/32';

export type SwingPreset = 'off' | 'light' | 'medium' | 'hard';

export type PresetId =
  | 'grand_piano'
  | 'warm_epiano'
  | 'analog_poly'
  | 'fm_bell'
  | 'crystal_pluck'
  | 'velvet_pad'
  | 'cyber_lead'
  | 'sub_bass';

export type OscillatorWaveType = 'sine' | 'triangle' | 'sawtooth' | 'square';

export interface SynthParams {
  osc1Type: OscillatorWaveType;
  osc2Type: OscillatorWaveType;
  osc2Detune: number; // cents (-50 to +50)
  oscMix: number; // 0 (osc1) to 1 (osc2)
  subOscLevel: number; // 0 to 1
  attack: number; // seconds (0.002 to 2.0)
  decay: number; // seconds (0.01 to 3.0)
  sustain: number; // level (0.0 to 1.0)
  release: number; // seconds (0.02 to 5.0)
  filterCutoff: number; // Hz (100 to 16000)
  filterResonance: number; // Q (0.5 to 15)
  reverbMix: number; // 0 to 1
  delayMix: number; // 0 to 1
  delayTime: number; // seconds (0.08 to 0.75)
  volume: number; // 0 to 1
}

export interface InstrumentPreset {
  id: PresetId;
  name: string;
  category: 'Keys' | 'Synth' | 'Mallet & Pluck' | 'Pad & Bass';
  description: string;
  icon: string;
  params: SynthParams;
}

export interface NoteEvent {
  id: string;
  midi: number; // 0..127 (60 = C4)
  startBeat: number; // position in quarter-note beats (0-indexed)
  durationBeats: number; // length in quarter-note beats
  velocity: number; // 0.05..1.0
  trackId: string;
}

export interface Track {
  id: string;
  name: string;
  color: string;
  instrument: PresetId;
  volume: number; // 0..1
  pan: number; // -1..1
  muted: boolean;
  solo: boolean;
  synthParams: SynthParams;
}

export interface ProjectData {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  bpm: number;
  rootPitchClass: number; // 0=C, 1=C#, ..., 11=B
  scaleId: ScaleId;
  enharmonic: EnharmonicPreference;
  loopBeats: number; // e.g., 16 beats (4 bars of 4/4)
  quantize: QuantizeDivision;
  swingPreset: SwingPreset;
  swingAmount: number; // 0..0.75
  masterVolume: number; // 0..1
  tracks: Track[];
  notes: NoteEvent[];
}

export type WorkspaceTab =
  | 'studio'
  | 'synth'
  | 'theory'
  | 'eartraining'
  | 'projects';

export type AccentColorId =
  | 'cyan'
  | 'violet'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'cobalt';

export type ThemeMode = 'dark' | 'oled' | 'paper';

export type KeyLabelMode =
  | 'notes'
  | 'degrees'
  | 'intervals'
  | 'qwerty'
  | 'midi'
  | 'none';

export interface UICustomization {
  accentColor: AccentColorId;
  themeMode: ThemeMode;
  keyLabelMode: KeyLabelMode;
  highlightScaleOnKeyboard: boolean;
  scaleLockKeyboard: boolean; // snaps out-of-scale key presses to nearest scale tone
  pianoRollFoldScale: boolean; // "Paper / Visual Grid" style folded scale rows
  showPianoDock: boolean;
  referencePitchA4: number; // default 440 Hz
}
