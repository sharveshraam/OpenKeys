import { NoteEvent, ProjectData, Track } from '../types/music';
import { cloneSynthParams } from '../audio/presets';

export function createDefaultTracks(): Track[] {
  return [
    {
      id: 'track-1',
      name: 'Track 1 · Lead & Sketch',
      color: '#06b6d4',
      instrument: 'fm_bell',
      volume: 0.85,
      pan: -0.1,
      muted: false,
      solo: false,
      synthParams: cloneSynthParams('fm_bell'),
    },
    {
      id: 'track-2',
      name: 'Track 2 · Harmony Keys',
      color: '#8b5cf6',
      instrument: 'warm_epiano',
      volume: 0.78,
      pan: 0.15,
      muted: false,
      solo: false,
      synthParams: cloneSynthParams('warm_epiano'),
    },
    {
      id: 'track-3',
      name: 'Track 3 · Pluck & Arp',
      color: '#10b981',
      instrument: 'crystal_pluck',
      volume: 0.75,
      pan: -0.2,
      muted: false,
      solo: false,
      synthParams: cloneSynthParams('crystal_pluck'),
    },
    {
      id: 'track-4',
      name: 'Track 4 · Studio Bass',
      color: '#f59e0b',
      instrument: 'sub_bass',
      volume: 0.85,
      pan: 0,
      muted: false,
      solo: false,
      synthParams: cloneSynthParams('sub_bass'),
    },
  ];
}

function makeNote(
  id: string,
  trackId: string,
  midi: number,
  startBeat: number,
  durationBeats: number,
  velocity = 0.82
): NoteEvent {
  return { id, trackId, midi, startBeat, durationBeats, velocity };
}

export const DEMO_PROJECTS: ProjectData[] = [
  {
    id: 'demo-pentatonic-daydream',
    name: 'Pentatonic Daydream',
    createdAt: 1730000000000,
    updatedAt: 1730000000000,
    bpm: 118,
    rootPitchClass: 0, // C
    scaleId: 'major_pentatonic',
    enharmonic: 'auto',
    loopBeats: 16,
    quantize: '1/8',
    swingPreset: 'light',
    swingAmount: 0.22,
    masterVolume: 0.85,
    tracks: createDefaultTracks(),
    notes: [
      // Track 1: Rising & cascading C Major Pentatonic melody (C D E G A)
      makeNote('pd-1', 'track-1', 72, 0, 0.5, 0.85), // C5
      makeNote('pd-2', 'track-1', 74, 0.5, 0.5, 0.78), // D5
      makeNote('pd-3', 'track-1', 76, 1.0, 1.0, 0.88), // E5
      makeNote('pd-4', 'track-1', 79, 2.0, 0.5, 0.82), // G5
      makeNote('pd-5', 'track-1', 81, 2.5, 1.0, 0.9), // A5
      makeNote('pd-6', 'track-1', 79, 3.5, 0.5, 0.76), // G5

      makeNote('pd-7', 'track-1', 76, 4.0, 0.5, 0.84), // E5
      makeNote('pd-8', 'track-1', 74, 4.5, 0.5, 0.78), // D5
      makeNote('pd-9', 'track-1', 72, 5.0, 1.0, 0.85), // C5
      makeNote('pd-10', 'track-1', 69, 6.0, 1.0, 0.8), // A4
      makeNote('pd-11', 'track-1', 67, 7.0, 1.0, 0.75), // G4

      makeNote('pd-12', 'track-1', 72, 8.0, 0.5, 0.84), // C5
      makeNote('pd-13', 'track-1', 76, 8.5, 0.5, 0.86), // E5
      makeNote('pd-14', 'track-1', 79, 9.0, 0.5, 0.88), // G5
      makeNote('pd-15', 'track-1', 84, 9.5, 1.5, 0.92), // C6
      makeNote('pd-16', 'track-1', 81, 11.0, 1.0, 0.84), // A5

      makeNote('pd-17', 'track-1', 79, 12.0, 0.5, 0.82), // G5
      makeNote('pd-18', 'track-1', 76, 12.5, 0.5, 0.8), // E5
      makeNote('pd-19', 'track-1', 74, 13.0, 1.0, 0.85), // D5
      makeNote('pd-20', 'track-1', 72, 14.0, 2.0, 0.9), // C5

      // Track 2: Warm Rhodes Harmony (C6/9 -> Am7 -> Fmaj9 -> G6)
      makeNote('pd-h1', 'track-2', 60, 0, 3.75, 0.68), // C4
      makeNote('pd-h2', 'track-2', 64, 0, 3.75, 0.65), // E4
      makeNote('pd-h3', 'track-2', 67, 0, 3.75, 0.65), // G4
      makeNote('pd-h4', 'track-2', 69, 0, 3.75, 0.62), // A4

      makeNote('pd-h5', 'track-2', 57, 4, 3.75, 0.68), // A3
      makeNote('pd-h6', 'track-2', 60, 4, 3.75, 0.65), // C4
      makeNote('pd-h7', 'track-2', 64, 4, 3.75, 0.65), // E4
      makeNote('pd-h8', 'track-2', 67, 4, 3.75, 0.64), // G4

      makeNote('pd-h9', 'track-2', 62, 8, 3.75, 0.66), // D4
      makeNote('pd-h10', 'track-2', 64, 8, 3.75, 0.64), // E4
      makeNote('pd-h11', 'track-2', 67, 8, 3.75, 0.65), // G4
      makeNote('pd-h12', 'track-2', 72, 8, 3.75, 0.62), // C5

      makeNote('pd-h13', 'track-2', 55, 12, 3.75, 0.68), // G3
      makeNote('pd-h14', 'track-2', 62, 12, 3.75, 0.64), // D4
      makeNote('pd-h15', 'track-2', 64, 12, 3.75, 0.65), // E4
      makeNote('pd-h16', 'track-2', 69, 12, 3.75, 0.64), // A4

      // Track 4: Studio Bass
      makeNote('pd-b1', 'track-4', 48, 0, 2.5, 0.85), // C3
      makeNote('pd-b2', 'track-4', 55, 3, 1.0, 0.78), // G3
      makeNote('pd-b3', 'track-4', 45, 4, 2.5, 0.85), // A2
      makeNote('pd-b4', 'track-4', 52, 7, 1.0, 0.76), // E3
      makeNote('pd-b5', 'track-4', 50, 8, 2.5, 0.85), // D3
      makeNote('pd-b6', 'track-4', 48, 11, 1.0, 0.8), // C3
      makeNote('pd-b7', 'track-4', 43, 12, 3.5, 0.88), // G2
    ],
  },
  {
    id: 'demo-dorian-midnight',
    name: 'Midnight Dorian Groove',
    createdAt: 1730000100000,
    updatedAt: 1730000100000,
    bpm: 105,
    rootPitchClass: 2, // D
    scaleId: 'dorian',
    enharmonic: 'auto',
    loopBeats: 16,
    quantize: '1/16',
    swingPreset: 'medium',
    swingAmount: 0.45,
    masterVolume: 0.85,
    tracks: createDefaultTracks(),
    notes: [
      // D Dorian: D E F G A B C (Dm7 -> G7 groove)
      makeNote('dm-1', 'track-1', 74, 0, 0.75, 0.86), // D5
      makeNote('dm-2', 'track-1', 77, 1.0, 0.5, 0.82), // F5
      makeNote('dm-3', 'track-1', 81, 1.5, 1.0, 0.9), // A5
      makeNote('dm-4', 'track-1', 83, 2.5, 0.5, 0.88), // B5 (characteristic Dorian natural 6th)
      makeNote('dm-5', 'track-1', 81, 3.0, 1.0, 0.82), // A5

      makeNote('dm-6', 'track-1', 79, 4.5, 0.5, 0.8), // G5
      makeNote('dm-7', 'track-1', 77, 5.0, 0.5, 0.84), // F5
      makeNote('dm-8', 'track-1', 76, 5.5, 1.0, 0.86), // E5
      makeNote('dm-9', 'track-1', 74, 6.5, 1.5, 0.88), // D5

      makeNote('dm-10', 'track-1', 74, 8.0, 0.5, 0.84),
      makeNote('dm-11', 'track-1', 76, 8.5, 0.5, 0.82),
      makeNote('dm-12', 'track-1', 77, 9.0, 0.5, 0.85),
      makeNote('dm-13', 'track-1', 81, 9.5, 0.5, 0.88),
      makeNote('dm-14', 'track-1', 83, 10.0, 1.5, 0.92), // B5
      makeNote('dm-15', 'track-1', 84, 11.5, 0.5, 0.86), // C6
      makeNote('dm-16', 'track-1', 86, 12.0, 2.5, 0.94), // D6

      // Chords Dm9 -> G13
      makeNote('dm-c1', 'track-2', 62, 0, 3.5, 0.7), // D4
      makeNote('dm-c2', 'track-2', 65, 0, 3.5, 0.68), // F4
      makeNote('dm-c3', 'track-2', 69, 0, 3.5, 0.68), // A4
      makeNote('dm-c4', 'track-2', 72, 0, 3.5, 0.66), // C5

      makeNote('dm-c5', 'track-2', 59, 4, 3.5, 0.7), // B3
      makeNote('dm-c6', 'track-2', 65, 4, 3.5, 0.68), // F4
      makeNote('dm-c7', 'track-2', 67, 4, 3.5, 0.66), // G4
      makeNote('dm-c8', 'track-2', 71, 4, 3.5, 0.68), // B4

      makeNote('dm-c9', 'track-2', 62, 8, 3.5, 0.7),
      makeNote('dm-c10', 'track-2', 65, 8, 3.5, 0.68),
      makeNote('dm-c11', 'track-2', 69, 8, 3.5, 0.68),
      makeNote('dm-c12', 'track-2', 72, 8, 3.5, 0.66),

      makeNote('dm-c13', 'track-2', 59, 12, 3.5, 0.7),
      makeNote('dm-c14', 'track-2', 65, 12, 3.5, 0.68),
      makeNote('dm-c15', 'track-2', 69, 12, 3.5, 0.66),
      makeNote('dm-c16', 'track-2', 71, 12, 3.5, 0.68),

      // Bassline
      makeNote('dm-b1', 'track-4', 50, 0, 1.5, 0.88), // D3
      makeNote('dm-b2', 'track-4', 50, 2.0, 1.0, 0.8), // D3
      makeNote('dm-b3', 'track-4', 48, 3.5, 0.5, 0.78), // C3
      makeNote('dm-b4', 'track-4', 43, 4.0, 2.5, 0.88), // G2
      makeNote('dm-b5', 'track-4', 45, 7.0, 1.0, 0.82), // A2
      makeNote('dm-b6', 'track-4', 50, 8.0, 2.5, 0.88), // D3
      makeNote('dm-b7', 'track-4', 43, 12.0, 3.5, 0.88), // G2
    ],
  },
  {
    id: 'demo-lydian-cosmos',
    name: 'Celestial Lydian Horizon',
    createdAt: 1730000200000,
    updatedAt: 1730000200000,
    bpm: 96,
    rootPitchClass: 5, // F
    scaleId: 'lydian',
    enharmonic: 'auto',
    loopBeats: 16,
    quantize: '1/8',
    swingPreset: 'off',
    swingAmount: 0,
    masterVolume: 0.85,
    tracks: createDefaultTracks(),
    notes: [
      // F Lydian: F G A B C D E (featuring the #4 B natural)
      makeNote('ly-1', 'track-3', 65, 0, 0.5, 0.8), // F4
      makeNote('ly-2', 'track-3', 69, 0.5, 0.5, 0.78), // A4
      makeNote('ly-3', 'track-3', 71, 1.0, 0.5, 0.85), // B4 (#4!)
      makeNote('ly-4', 'track-3', 72, 1.5, 0.5, 0.82), // C5
      makeNote('ly-5', 'track-3', 76, 2.0, 1.0, 0.88), // E5
      makeNote('ly-6', 'track-3', 74, 3.0, 1.0, 0.8), // D5

      makeNote('ly-7', 'track-3', 67, 4.0, 0.5, 0.8), // G4
      makeNote('ly-8', 'track-3', 71, 4.5, 0.5, 0.84), // B4
      makeNote('ly-9', 'track-3', 74, 5.0, 0.5, 0.86), // D5
      makeNote('ly-10', 'track-3', 79, 5.5, 1.5, 0.9), // G5
      makeNote('ly-11', 'track-3', 76, 7.0, 1.0, 0.82), // E5

      makeNote('ly-12', 'track-1', 77, 8.0, 1.5, 0.86), // F5
      makeNote('ly-13', 'track-1', 83, 9.5, 1.5, 0.9), // B5
      makeNote('ly-14', 'track-1', 84, 11.0, 1.0, 0.88), // C6
      makeNote('ly-15', 'track-1', 81, 12.0, 2.0, 0.86), // A5
      makeNote('ly-16', 'track-1', 79, 14.0, 2.0, 0.82), // G5

      // Bass F -> G -> F -> G
      makeNote('ly-b1', 'track-4', 41, 0, 3.75, 0.85), // F2
      makeNote('ly-b2', 'track-4', 43, 4, 3.75, 0.85), // G2
      makeNote('ly-b3', 'track-4', 41, 8, 3.75, 0.85), // F2
      makeNote('ly-b4', 'track-4', 43, 12, 3.75, 0.85), // G2
    ],
  },
];
