# OpenKeys — Music Theory, Synthesizer & Visual Composition Studio

**OpenKeys** is an open, unrestricted browser-based music theory, polyphonic synthesizer, and multi-track composition web application built with **React**, **TypeScript**, **Vite**, **Web Audio API**, **Web MIDI API**, and **IndexedDB**.

Inspired by visual loop instruments such as `playmusictheory.net/play` and modern digital audio workstations (DAWs), OpenKeys combines approachable scale-locked visual sketching with a complete Piano Roll editor, polyphonic synthesis rack, WAV/MIDI export engine, and interactive music theory laboratory.

---

## Quick Start & Installation

### Prerequisites
- **Node.js** `v18+` (tested on Node `v22`)
- **npm** `v9+`

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```
The development server binds to `0.0.0.0:5173` (accessible locally at `http://localhost:5173`).

### 3. Run Automated Tests
```bash
npm run test
```

### 4. Build for Production
```bash
npm run build
```

---

## Core Features

### 1. Musical Keys & Scale Engine (`src/theory/`)
- **All 12 Chromatic Keys**: `C`, `C# / Db`, `D`, `D# / Eb`, `E`, `F`, `F# / Gb`, `G`, `G# / Ab`, `A`, `A# / Bb`, `B`.
- **Dynamic Enharmonic Spelling**: Cycle between **Auto (Theory-Smart)**, **Sharps (`♯`)**, and **Flats (`♭`)**.
- **All 14 Scales & Modes**:
  1. Major (Ionian)
  2. Natural Minor (Aeolian)
  3. Harmonic Minor
  4. Melodic Minor
  5. Major Pentatonic
  6. Minor Pentatonic
  7. Blues
  8. Chromatic
  9. Whole Tone
  10. Dorian
  11. Phrygian
  12. Lydian
  13. Mixolydian
  14. Locrian

### 2. Interactive Multi-Octave Virtual Piano (`src/components/VirtualKeyboard.tsx`)
- **Adjustable Range & Octave**: View `1`, `2`, `3`, or `4` octaves simultaneously and transpose across `C1`–`C7` (`-` / `+` shortcuts).
- **Polyphonic Input**:
  - Click and drag across keys for smooth glissando.
  - **2-Row Polyphonic Computer Keyboard (QWERTY)**:
    - Lower Octave: `Z S X D C V G B H N J M , L . ; /`
    - Upper Octave: `Q 2 W 3 E R 5 T 6 Y 7 U I 9 O 0 P`
  - **Chord Hold (Latch)** & **Sustain Pedal** modes for building multi-note voicings with a mouse.
- **Scale Highlighting & Scale Lock**:
  - Visual indicators for the **Root Note** and **In-Scale Tones**.
  - Optional **Scale Lock** snaps any out-of-scale key press to the nearest note in the active scale.
- **Real-Time Frequency & Chord Readout**: Displays exact Equal Temperament frequencies (`Hz`) for every active note and automatically identifies played chords and inversions.

### 3. Multi-Track Piano Roll & Visual Sketch Editor (`src/components/PianoRollEditor.tsx`)
- **Note Pencil & Visual Sketch Brush**:
  - Place single notes, drag horizontally/vertically to move notes, drag right handles to resize note durations, or right-click/double-click to remove notes.
  - Use the **Visual Sketch Brush** to draw continuous scale-snapped melodic loops across the grid.
- **Chromatic Grid vs. Folded Scale Grid**: Toggle between all 12 semitone rows per octave or **Scale Grid (Folded)** where every row maps directly to a scale degree.
- **Velocity Editor Lane**: Dedicated bottom lane for per-note velocity editing (`5%`–`100%`).
- **Multi-Track Mixer**: Manage multiple independent tracks with per-track Instrument Preset, Mute (`M`), Solo (`S`), Volume, Panning, and Ghost Notes display.
- **Undo / Redo History**: Full `Ctrl+Z` / `Ctrl+Y` history stack plus one-click **Quantize Track**, **Fit to Scale**, and **Inspire Pattern**.

### 4. Browser Audio Engine & Synthesizer (`src/audio/`)
- **8 Multi-Voice Instrument Presets**:
  - *Concert Grand Keys*, *Vintage Rhodes EP*, *Glass Marimba & Bell*, *Acoustic Harp Pluck*, *Juno Analog Polysynth*, *Celestial Velvet Pad*, *Expressive Synth Lead*, and *Deep Studio Sub Bass*.
- **Full Synth & FX Controls**:
  - Dual oscillators (`sine`, `triangle`, `sawtooth`, `square`) + detune + sub-oscillator.
  - Interactive **ADSR Envelope** (`Attack`, `Decay`, `Sustain`, `Release`) with live SVG curve graph.
  - Resonant Low-Pass Filter (`Cutoff Hz`, `Resonance Q`), Hall Convolution Reverb, Stereo Echo Delay, and **Real-Time Web Audio Oscilloscope & Spectrum Analyzer**.
- **Transport, Tempo, Quantize & Swing**:
  - Tempo (`30`–`280` BPM), interactive **Tap Tempo**, synthesized **Metronome Click**, **Quantize** (`Off`, `1/4`, `1/8`, `1/8T`, `1/16`, `1/16T`, `1/32`), **Swing** (`Off`, `Light`, `Medium`, `Hard`), and live **Record** from keyboard/MIDI into the active track.

### 5. Music Theory Lab & Ear Training (`src/components/TheorySuite.tsx`, `src/components/EarTraining.tsx`)
- **Scale & Key Signature Visualizer**: Interactive SVG Treble Staff plotting key signature accidentals (`♯`/`♭`) and scale notes.
- **Chord Builder & Reverse Chord Identifier**: Construct 19 chord types across inversions/spread voicings, or toggle/play notes to identify chords and slash voicings (`Cmaj7`, `C/E`, etc.).
- **Chord Progression Studio**: Explore diatonic triads & 7th chords (`I`–`vii°`), load classic progression templates, audition progressions, or send them directly to the Piano Roll.
- **Interactive Circle of Fifths**: SVG harmonic wheel with Major, Relative Minor, Diminished, and Key Signature rings.
- **Interval Calculator & Note Frequency Reference**: Analyze any two notes (semitones, consonance, Just Intonation ratio, song cue) and browse the complete MIDI frequency/wavelength table with adjustable `A4` reference tuning (`432 Hz`, `440 Hz`, `442 Hz`).
- **Ear Training & Theory Practice Mode**: Interactive audio drills for Intervals, Chords, Scales/Modes, and Music Theory quizzes with live score, accuracy, and streak tracking.

### 6. MIDI, WAV Export & Local Project Storage (`src/midi/`, `src/export/`, `src/storage/`)
- **Web MIDI API**: Hardware MIDI input support with live MIDI Monitor log plus a built-in **Virtual MIDI Loopback** generator for browsers without hardware attached.
- **WAV Audio Export (`.wav`)**: Renders the multi-track composition offline into a downloadable 44.1 kHz 16-bit Stereo PCM `.wav` file.
- **MIDI File Export & Import (`.mid`)**: Encodes and parses Standard MIDI Format 1 files.
- **IndexedDB Project Storage**: Save, load, duplicate, delete, and export/import `.openkeys.json` project files locally.
