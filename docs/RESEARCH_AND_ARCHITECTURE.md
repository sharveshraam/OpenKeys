# OpenKeys — Phase 1 & Phase 2: Research & Architecture Documentation

## Phase 1: Reference Website Research (`https://playmusictheory.net/play`)

### 1. Overview of Reference Application
`playmusictheory.net/play` ("play_music_theory" by Tala Rae Schlossberg) is a browser-based and mobile visual musical instrument designed to explore the relationship between sound, shape, and time.

### 2. Documented Public Features & Interface Behavior

| Feature Category | Reference Website Behavior (`playmusictheory.net/play`) | OpenKeys Independent Implementation & Enhancements |
| :--- | :--- | :--- |
| **Overall Interface & Layout** | Minimalist canvas ("Paper") surrounded by compact floating controls for Key, Scale, Range, Octave, Quantize, Swing, Click, MIDI In, and Export. Includes a 9-square gallery/preset loader and "The instrument" modal. | Full-featured modern DAW & Music Theory Studio with a persistent dockable multi-octave Virtual Piano, a dual-mode Composition Editor (DAW Piano Roll + Visual Sketch Loop Canvas), Synth Rack, Theory Suite, Ear Training, and Project/MIDI Manager. |
| **Musical Keys** | Supports 12 keys: `C, C#, D, Eb, E, F, F#, G, Ab, A, Bb, B`. | Supports all 12 chromatic keys with toggleable Sharp (`C, C#, D, D#, E, F, F#, G, G#, A, A#, B`), Flat (`C, Db, D, Eb, E, F, Gb, G, Ab, A, Bb, B`), and Theory-Smart enharmonic spellings. |
| **Scales** | 10 scales: Major pentatonic (default), Minor pentatonic, Major, Minor, Harmonic minor, Dorian, Phrygian, Lydian, Mixolydian, Blues. Grid rows automatically map to scale degrees ("the grid names the notes") so drawn lines never clash in pentatonic mode. | Implements all 14 required scales: Major, Natural Minor, Harmonic Minor, Melodic Minor, Major Pentatonic, Minor Pentatonic, Blues, Chromatic, Whole Tone, Dorian, Phrygian, Lydian, Mixolydian, Locrian. Supports both Chromatic Grid (with scale lane highlighting) and Scale-Folded Grid ("Scale Lock" mode where every row is a scale tone). |
| **Octave & Range Controls** | Range selector (`1 octave`, `2 octaves`, `3 octaves`) and Octave shift (`-`, `0`, `+`). | Adjustable visible range (`1` to `4` octaves) and dynamic octave transposition (`C1` through `C7`), with quick keyboard shortcuts and visual range indicators. |
| **Composition Interface** | Freehand drawing/sketching onto a looping time-pitch canvas where horizontal position = time and vertical position = pitch. Includes multi-layer/color slots (`1, 2, 3` and color dots). | Full Piano Roll & Visual Grid Editor supporting: click/draw to add notes, freehand melodic sketch brush, drag to move notes, right-edge drag to resize durations, per-note velocity lane editor, multi-track arrangement (4 independent tracks with mute, solo, volume, instrument preset, color), adjustable loop length, playhead scrub/indicator, grid resolution (`1/4` to `1/32` including triplets), horizontal/vertical zoom, and full Undo/Redo history stack. |
| **Tempo, Quantize & Swing** | Tempo control with `Tap` tempo button, `Click` (metronome Off/On), `Quantize` (`1/4, 1/8, 1/8 triplet, 1/16, 1/16 triplet, 1/32`), and `Swing` (`Off, Light, Medium, Hard`). | Real-time BPM (30–280 BPM) with interactive Tap Tempo calculator, synthesized downbeat/beat Metronome Click, Quantize (`Off, 1/4, 1/8, 1/8T, 1/16, 1/16T, 1/32`) with one-click "Quantize Selected/Track", and Swing (`Off 0%, Light 25%, Medium 50%, Hard 75%`, plus continuous 0–100% slider). |
| **Playback & Recording** | Continuous loop playback of drawn marks and recorded MIDI input (`record`). | Sample-accurate Web Audio scheduling loop playback, real-time step/live recording from Virtual Piano, Computer QWERTY Keyboard, or external Web MIDI controller directly into the active track. |
| **MIDI Functionality** | `MIDI in` toggle (Off/On) and `MIDI` loop export (gated behind $4.99 "The instrument" upgrade on reference site). | Unrestricted Web MIDI API input support with live device detection, channel filtering, MIDI monitor log, and complete binary Standard MIDI File (`.mid`) export and import. |
| **Audio Export** | `WAV` loop export (gated behind upgrade on reference site). | Unrestricted offline PCM `.wav` rendering (`OfflineAudioContext`) that synthesizes all tracks, ADSR envelopes, instruments, and swing into a broadcast-quality 44.1kHz 16-bit stereo WAV download. |
| **Project Storage** | `Save` / `Open` local session state and preset slots. | Full IndexedDB database for local projects (Save, Load, Duplicate, Delete, Rename), JSON `.openkeys` file export/import, and built-in curated Demo Projects. |
| **Customization** | "Paper" / color dots customization. | Customizable accent colors (Cyan, Violet, Emerald, Amber, Rose, Cobalt), interface theme modes (Studio Dark, Midnight OLED, Warm Paper), keyboard label modes (Note Names, Scale Degrees, Intervals, Computer Keys, MIDI Numbers). |

---

## Phase 2: Application Architecture

```
/home/user/OpenKeys
├── docs/
│   └── RESEARCH_AND_ARCHITECTURE.md
├── public/
├── src/
│   ├── types/
│   │   └── music.ts               # Core data structures (Notes, Tracks, Scales, Chords, Projects)
│   ├── theory/
│   │   ├── constants.ts           # 12 keys, 14 scale formulas, intervals, chord formulas, progressions
│   │   └── engine.ts              # Pure music theory calculations (frequencies, chord ID, circle of 5ths, staff positions)
│   ├── audio/
│   │   └── soundEngine.ts         # Web Audio API + Tone-style polyphonic synthesizer, ADSR, effects, metronome, analyser
│   ├── midi/
│   │   ├── webMidi.ts             # Web MIDI API hardware input manager & virtual MIDI generator
│   │   └── midiExport.ts          # Standard MIDI File (.mid) binary encoder & parser
│   ├── export/
│   │   └── wavExport.ts           # OfflineAudioContext multi-track WAV renderer & RIFF WAVE encoder
│   ├── storage/
│   │   ├── projectDb.ts           # IndexedDB project persistence & JSON import/export
│   │   └── demoProjects.ts        # Built-in musical compositions demonstrating multiple tracks & scales
│   ├── components/
│   │   ├── TopTransportBar.tsx    # Transport, BPM, Tap, Metronome, Quantize, Swing, Key/Scale, Undo/Redo, Master Vol
│   │   ├── VirtualKeyboard.tsx    # Multi-octave interactive piano with QWERTY, glissando, scale highlight & live chord ID
│   │   ├── PianoRollEditor.tsx    # Multi-track Piano Roll + Freehand Visual Sketch mode, velocity editor, zoom/scroll
│   │   ├── SynthPanel.tsx         # Instrument presets, ADSR envelope curve, filter, reverb/delay, live oscilloscope
│   │   ├── TheorySuite.tsx        # Chord Builder, Chord Identifier, Intervals, Scale/Staff Visualizer, Circle of Fifths, Progressions, Freq Reference
│   │   ├── EarTraining.tsx        # Interactive Ear Training (Intervals, Chords, Scales) & Theory Practice Mode
│   │   └── ProjectMidiModal.tsx   # Project Manager (IndexedDB), WAV/MIDI Export Center, Web MIDI Status, Theme Customizer
│   ├── App.tsx                    # Main state orchestration, transport loop, keyboard shortcuts, responsive layout
│   ├── index.css                  # Professional DAW styling & dynamic CSS custom properties for accent colors/themes
│   └── main.tsx                   # Application entry point
├── package.json
├── tsconfig.json
└── vite.config.ts
```
