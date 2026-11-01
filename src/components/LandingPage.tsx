import React from 'react';
import {
  BookOpen,
  Compass,
  Disc,
  Download,
  Flame,
  Headphones,
  Layers,
  Music,
  Palette,
  Piano,
  Play,
  Sliders,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { WorkspaceTab } from '../types/music';
import { cloneSynthParams } from '../audio/presets';
import { soundEngine } from '../audio/soundEngine';
import { triggerDrumLive } from '../audio/drumEngine';

export type AppPageRoute = 'landing' | 'visual' | 'studio';

interface LandingPageProps {
  onNavigatePage: (page: AppPageRoute, studioTab?: WorkspaceTab) => void;
}

const HERO_PREVIEW_NOTES = [
  { midi: 60, label: 'C4', deg: '1' },
  { midi: 62, label: 'D4', deg: '2' },
  { midi: 64, label: 'E4', deg: '3' },
  { midi: 67, label: 'G4', deg: '5' },
  { midi: 69, label: 'A4', deg: '6' },
  { midi: 72, label: 'C5', deg: '8' },
  { midi: 74, label: 'D5', deg: '9' },
  { midi: 76, label: 'E5', deg: '10' },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigatePage,
}) => {
  const playHeroNote = (midi: number) => {
    soundEngine.triggerNote(
      midi,
      0.48,
      0.85,
      cloneSynthParams('fm_bell'),
      0.85,
      0
    );
  };

  const playHeroChord = () => {
    soundEngine.triggerChord(
      [60, 64, 67, 71, 74],
      0.95,
      0.84,
      cloneSynthParams('warm_epiano'),
      0.07
    );
  };

  return (
    <div className="landing-page-scroll">
      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-hero-badge">
          <Sparkles size={14} />
          <span>100% UNLOCKED · VISUAL INSTRUMENT + FULL DAW & THEORY STUDIO</span>
        </div>

        <h1 className="landing-hero-title">
          Draw a mark. Play a chord.{' '}
          <span className="landing-gradient-text">Master music theory.</span>
        </h1>

        <p className="landing-hero-subtitle">
          OpenKeys unites two complete browser-based musical workspaces in one
          portable studio: the <strong>Visual Paper Instrument</strong> (draw
          lines and shapes that loop into music with zero wrong notes) and the{' '}
          <strong>OpenKeys DAW & Theory Studio</strong> (multi-track Piano Roll,
          16-step Drum Machine, Polyphonic Synth, Fretboard, Circle of Fifths,
          Ear Training, and WAV/MIDI export).
        </p>

        {/* Primary Dual Call-to-Action Buttons */}
        <div className="landing-cta-row">
          <button
            type="button"
            className="landing-cta-btn cta-visual"
            onClick={() => onNavigatePage('visual')}
          >
            <Palette size={19} />
            <div className="cta-text-col">
              <strong>Open Visual Paper Instrument</strong>
              <small>Draw-to-Music Loop Canvas · All Features Unlocked</small>
            </div>
          </button>

          <button
            type="button"
            className="landing-cta-btn cta-studio"
            onClick={() => onNavigatePage('studio', 'studio')}
          >
            <Piano size={19} />
            <div className="cta-text-col">
              <strong>Open Full DAW & Theory Studio</strong>
              <small>Piano Roll · Drum Machine · Synth · Theory Lab</small>
            </div>
          </button>
        </div>

        {/* Live Interactive Sound Teaser Bar right on the Landing Page */}
        <div className="landing-sound-teaser">
          <div className="teaser-header">
            <span>
              <Wand2 size={14} /> TRY THE AUDIO ENGINE LIVE (CLICK ANY PAD)
            </span>
            <button
              type="button"
              className="chip-btn active-chip"
              onClick={playHeroChord}
            >
              <Play size={12} /> Audition Lush Cmaj9 Voicing
            </button>
          </div>

          <div className="teaser-pads-row">
            {HERO_PREVIEW_NOTES.map((n) => (
              <button
                key={n.midi}
                type="button"
                className="teaser-note-pad"
                onPointerDown={() => playHeroNote(n.midi)}
              >
                <span className="teaser-deg">Deg {n.deg}</span>
                <strong>{n.label}</strong>
              </button>
            ))}
            <button
              type="button"
              className="teaser-note-pad drum-teaser"
              onPointerDown={() => triggerDrumLive('kick', 0.95)}
            >
              <span className="teaser-deg">808</span>
              <strong>KICK</strong>
            </button>
            <button
              type="button"
              className="teaser-note-pad drum-teaser"
              onPointerDown={() => triggerDrumLive('snare', 0.9)}
            >
              <span className="teaser-deg">CRISP</span>
              <strong>SNARE</strong>
            </button>
            <button
              type="button"
              className="teaser-note-pad drum-teaser"
              onPointerDown={() => triggerDrumLive('hihat_open', 0.85)}
            >
              <span className="teaser-deg">909</span>
              <strong>HI-HAT</strong>
            </button>
          </div>
        </div>
      </section>

      {/* Two Main Experiences Comparison Cards */}
      <section className="landing-experiences-grid">
        <div className="experience-showcase-card visual-showcase">
          <div className="exp-badge">EXPERIENCE 01 · PLAY CANVAS</div>
          <h2>Visual Paper Instrument</h2>
          <p>
            Draw freehand lines, curves, arches, and rhythms onto a living
            musical sheet. Every feature — including Key & Scale selection,
            Quantize, Swing, Tap Tempo, Metronome Click, Custom Colors, MIDI In,
            9-Square Photo Gallery, and WAV/MIDI export — is 100% unlocked.
          </p>
          <ul className="exp-feature-list">
            <li>
              <strong>Draw-to-Music Loop Engine:</strong> Horizontal position
              controls time; vertical position maps to the selected Key & Scale.
            </li>
            <li>
              <strong>4 Multi-Timbral Voices + Drum Brush:</strong> Glass
              Marimba, Vintage Rhodes, Harp Pluck, and Percussion Brush.
            </li>
            <li>
              <strong>All 12 Keys & 14 Scales:</strong> Default Major Pentatonic
              ensures every stroke sounds consonant, or explore Dorian, Lydian,
              Blues, and Harmonic Minor.
            </li>
            <li>
              <strong>9-Square Gallery & Photo Upload:</strong> Load starter
              visual loops or place your own photo onto the canvas.
            </li>
          </ul>
          <button
            type="button"
            className="chip-btn active-chip exp-launch-btn"
            onClick={() => onNavigatePage('visual')}
          >
            <Palette size={15} /> Launch Visual Paper Instrument →
          </button>
        </div>

        <div className="experience-showcase-card studio-showcase">
          <div className="exp-badge">EXPERIENCE 02 · PRODUCTION DAW</div>
          <h2>OpenKeys DAW & Music Theory Studio</h2>
          <p>
            A complete browser-based music production and theory workstation
            with a multi-track Piano Roll, 16-step Drum & Beat Sequencer,
            Polyphonic Synthesizer, and Interactive Music Theory Suite.
          </p>
          <ul className="exp-feature-list">
            <li>
              <strong>Multi-Track Piano Roll & Velocity Editor:</strong> Add,
              move, resize, quantize, and sketch notes across multiple tracks.
            </li>
            <li>
              <strong>16-Step Drum Machine & Arpeggiator Pads:</strong> 9
              synthesized drum voices (Kick, Snare, Clap, Hats, Toms, Rim,
              Cymbal), 4 drum kits, MPC pads, and live Chord Arpeggiator.
            </li>
            <li>
              <strong>Polyphonic Synth & FX Lab:</strong> 8 instrument presets,
              interactive ADSR curve, resonant filter, reverb/delay, and live
              Web Audio oscilloscope.
            </li>
            <li>
              <strong>Theory Lab & Ear Training:</strong> Staff Key Signatures,
              Chord Builder/Identifier, Circle of Fifths, Guitar/Bass Fretboard,
              and Ear Trainer.
            </li>
          </ul>
          <button
            type="button"
            className="chip-btn active-chip exp-launch-btn"
            onClick={() => onNavigatePage('studio', 'studio')}
          >
            <Music size={15} /> Launch DAW & Theory Studio →
          </button>
        </div>
      </section>

      {/* Deep-Link Feature Grid */}
      <section className="landing-modules-grid">
        <div
          className="module-quick-card"
          onClick={() => onNavigatePage('studio', 'studio')}
        >
          <Layers size={20} className="mod-icon" />
          <h3>Piano Roll & Sketch Sequencer</h3>
          <p>
            Multi-track arrangement with Scale-Folded grid mode, ghost notes,
            velocity stalks, and undo/redo history.
          </p>
        </div>

        <div
          className="module-quick-card"
          onClick={() => onNavigatePage('studio', 'drums' as WorkspaceTab)}
        >
          <Flame size={20} className="mod-icon" />
          <h3>808 / 909 Drum Machine & Arp</h3>
          <p>
            16-step polyphonic beat sequencer, 9 drum voices with tune/decay,
            live MPC pads, and diatonic chord arpeggiator.
          </p>
        </div>

        <div
          className="module-quick-card"
          onClick={() => onNavigatePage('studio', 'synth')}
        >
          <Sliders size={20} className="mod-icon" />
          <h3>Polyphonic Synth & Oscilloscope</h3>
          <p>
            Dual oscillators, sub-bass, interactive ADSR envelope graph,
            low-pass resonant filter, reverb, and stereo delay.
          </p>
        </div>

        <div
          className="module-quick-card"
          onClick={() => onNavigatePage('studio', 'theory')}
        >
          <BookOpen size={20} className="mod-icon" />
          <h3>Theory, Fretboard & Circle of 5ths</h3>
          <p>
            Interactive Treble Staff, Chord Builder & Identifier, Progression
            Studio, Guitar/Bass Fretboard, and Frequency Reference.
          </p>
        </div>

        <div
          className="module-quick-card"
          onClick={() => onNavigatePage('studio', 'eartraining')}
        >
          <Headphones size={20} className="mod-icon" />
          <h3>Ear Training & Theory Practice</h3>
          <p>
            Audio recognition drills for Intervals, Chords, and Scales/Modes
            plus interactive Key Signature and Harmony quizzes.
          </p>
        </div>

        <div
          className="module-quick-card"
          onClick={() => onNavigatePage('studio', 'projects')}
        >
          <Download size={20} className="mod-icon" />
          <h3>WAV, MIDI & IndexedDB Projects</h3>
          <p>
            Export 44.1kHz stereo WAV audio, multi-track Standard MIDI (.mid)
            files, or save projects locally in IndexedDB.
          </p>
        </div>
      </section>
    </div>
  );
};
