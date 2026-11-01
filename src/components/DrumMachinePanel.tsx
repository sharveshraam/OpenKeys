import React, { useMemo, useState } from 'react';
import {
  Disc,
  Flame,
  Layers,
  Play,
  Shuffle,
  Sparkles,
  Trash2,
  Volume2,
  Zap,
} from 'lucide-react';
import {
  DrumKitId,
  DrumVoiceConfig,
  DrumVoiceId,
  DRUM_PATTERN_PRESETS,
  triggerDrumLive,
} from '../audio/drumEngine';
import {
  EnharmonicPreference,
  NoteEvent,
  ScaleId,
  SynthParams,
} from '../types/music';
import {
  buildChordMidiNotes,
  getDiatonicChordsForScale,
} from '../theory/engine';
import { soundEngine } from '../audio/soundEngine';

export type ArpMode = 'block' | 'up' | 'down' | 'updown' | 'strum';

interface DrumMachinePanelProps {
  drumsEnabled: boolean;
  onToggleDrumsEnabled: () => void;
  drumKit: DrumKitId;
  onChangeDrumKit: (kit: DrumKitId) => void;
  drumVoices: DrumVoiceConfig[];
  onUpdateDrumVoice: (
    voiceId: DrumVoiceId,
    updater: (v: DrumVoiceConfig) => DrumVoiceConfig
  ) => void;
  drumSteps: Record<DrumVoiceId, number[]>;
  onChangeDrumSteps: (next: Record<DrumVoiceId, number[]>) => void;
  currentBeat: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  rootPitchClass: number;
  scaleId: ScaleId;
  enharmonic: EnharmonicPreference;
  synthParams: SynthParams;
  activeTrackId: string;
  onAppendNotesToTrack: (notes: NoteEvent[]) => void;
}

const KIT_OPTIONS: { id: DrumKitId; label: string; desc: string }[] = [
  {
    id: 'studio_808',
    label: '808 Sub Studio Kit',
    desc: 'Deep booming 808 sub kick and crisp trap hats',
  },
  {
    id: 'electro_909',
    label: '909 Club & Techno Kit',
    desc: 'Punchy club kick, snappy clap, and bright hi-hats',
  },
  {
    id: 'acoustic_warm',
    label: 'Warm Studio Kit',
    desc: 'Balanced natural drum tuning for pop, rock, and jazz',
  },
  {
    id: 'lofi_dust',
    label: 'Lo-Fi Dusty Kit',
    desc: 'Tight, low-tuned vintage percussion with short decay',
  },
];

export const DrumMachinePanel: React.FC<DrumMachinePanelProps> = ({
  drumsEnabled,
  onToggleDrumsEnabled,
  drumKit,
  onChangeDrumKit,
  drumVoices,
  onUpdateDrumVoice,
  drumSteps,
  onChangeDrumSteps,
  currentBeat,
  isPlaying,
  onTogglePlay,
  rootPitchClass,
  scaleId,
  enharmonic,
  synthParams,
  activeTrackId,
  onAppendNotesToTrack,
}) => {
  const [arpMode, setArpMode] = useState<ArpMode>('up');
  const [arpOctaves, setArpOctaves] = useState<number>(2);

  // Current 16th-note step (0..15)
  const activeStep = isPlaying ? Math.floor(currentBeat * 4) % 16 : -1;

  const diatonicChords = useMemo(
    () => getDiatonicChordsForScale(rootPitchClass, scaleId, enharmonic),
    [rootPitchClass, scaleId, enharmonic]
  );

  const handleToggleStep = (
    voice: DrumVoiceConfig,
    stepIdx: number,
    cycleAccent = false
  ) => {
    const row = drumSteps[voice.id] || Array(16).fill(0);
    const currentVal = row[stepIdx] ?? 0;
    let nextVal = 0;
    if (cycleAccent) {
      // Cycle 0 -> 1 (normal) -> 2 (accent) -> 3 (ghost) -> 0
      nextVal = (currentVal + 1) % 4;
    } else {
      nextVal = currentVal > 0 ? 0 : 1;
    }

    if (nextVal > 0) {
      const vel = nextVal === 2 ? 1.0 : nextVal === 3 ? 0.45 : 0.82;
      triggerDrumLive(voice.id, vel, voice, drumKit);
    }

    const nextRow = [...row];
    nextRow[stepIdx] = nextVal;
    onChangeDrumSteps({
      ...drumSteps,
      [voice.id]: nextRow,
    });
  };

  const handleLoadPattern = (presetId: string) => {
    const found = DRUM_PATTERN_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    const cloned: Record<DrumVoiceId, number[]> = {} as Record<
      DrumVoiceId,
      number[]
    >;
    (Object.keys(found.steps) as DrumVoiceId[]).forEach((k) => {
      cloned[k] = [...found.steps[k]];
    });
    onChangeDrumSteps(cloned);
  };

  const handleRandomizeGroove = () => {
    const next = {} as Record<DrumVoiceId, number[]>;
    drumVoices.forEach((v) => {
      const row = Array(16).fill(0);
      for (let i = 0; i < 16; i++) {
        if (v.id === 'kick') {
          row[i] = i === 0 || i === 8 ? 2 : Math.random() < 0.2 ? 1 : 0;
        } else if (v.id === 'snare' || v.id === 'clap') {
          row[i] = i === 4 || i === 12 ? 2 : Math.random() < 0.08 ? 3 : 0;
        } else if (v.id === 'hihat_closed') {
          row[i] = i % 2 === 0 ? 1 : Math.random() < 0.45 ? 3 : 0;
        } else if (v.id === 'hihat_open') {
          row[i] = i === 14 && Math.random() < 0.7 ? 1 : 0;
        } else {
          row[i] = Math.random() < 0.12 ? 1 : 0;
        }
      }
      next[v.id] = row;
    });
    onChangeDrumSteps(next);
  };

  const handleClearDrums = () => {
    const empty = {} as Record<DrumVoiceId, number[]>;
    drumVoices.forEach((v) => {
      empty[v.id] = Array(16).fill(0);
    });
    onChangeDrumSteps(empty);
  };

  const triggerChordPadWithArp = (rootPc: number, chordId: string) => {
    const baseNotes = buildChordMidiNotes(rootPc, chordId, 4, 0, false);
    let expanded = [...baseNotes];
    if (arpOctaves >= 2) {
      expanded = [...expanded, ...baseNotes.map((m) => m + 12)];
    }

    if (arpMode === 'block') {
      soundEngine.triggerChord(baseNotes, 0.85, 0.85, synthParams, 0);
    } else if (arpMode === 'strum') {
      soundEngine.triggerChord(expanded, 0.9, 0.82, synthParams, 0.045);
    } else if (arpMode === 'up') {
      soundEngine.triggerChord(expanded, 0.28, 0.82, synthParams, 0.12);
    } else if (arpMode === 'down') {
      soundEngine.triggerChord(
        [...expanded].reverse(),
        0.28,
        0.82,
        synthParams,
        0.12
      );
    } else if (arpMode === 'updown') {
      const seq = [...expanded, ...[...expanded].reverse().slice(1, -1)];
      soundEngine.triggerChord(seq, 0.24, 0.82, synthParams, 0.11);
    }
  };

  return (
    <div className="synth-panel-container">
      {/* Top Drum Machine Controls */}
      <div className="synth-header-bar">
        <div className="kb-control-group">
          <button
            type="button"
            className={`transport-btn play-btn ${isPlaying ? 'playing' : ''}`}
            onClick={onTogglePlay}
          >
            <Play size={15} fill="currentColor" />
            <span>{isPlaying ? 'Playing Beat' : 'Play Beat'}</span>
          </button>

          <button
            type="button"
            className={`chip-btn ${drumsEnabled ? 'active-chip' : ''}`}
            onClick={onToggleDrumsEnabled}
            title="Enable/Disable Drum Machine playback alongside Piano Roll"
          >
            <Flame size={14} />
            <span>Drum Engine: {drumsEnabled ? 'ACTIVE' : 'MUTED'}</span>
          </button>

          <div className="control-item">
            <span className="strip-label">Drum Kit:</span>
            <select
              className="studio-select"
              value={drumKit}
              onChange={(e) => onChangeDrumKit(e.target.value as DrumKitId)}
              aria-label="Drum Kit"
            >
              {KIT_OPTIONS.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="kb-control-group">
          <span className="strip-label">Groove Presets:</span>
          {DRUM_PATTERN_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="chip-btn"
              onClick={() => handleLoadPattern(p.id)}
              title={`${p.name} (${p.genre})`}
            >
              {p.name}
            </button>
          ))}
          <button
            type="button"
            className="chip-btn active-chip"
            onClick={handleRandomizeGroove}
          >
            <Shuffle size={13} />
            <span>Randomize Beat</span>
          </button>
          <button
            type="button"
            className="chip-btn danger-chip"
            onClick={handleClearDrums}
          >
            <Trash2 size={13} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* 16-Step Drum Sequencer Matrix */}
      <div className="theory-card">
        <div className="theory-card-header">
          <div>
            <h3>
              <Disc size={16} /> 16-Step Polyphonic Drum & Percussion Sequencer
            </h3>
            <p className="theory-subtitle">
              Click steps to toggle hits · Right-click any step to cycle Normal
              / Accent / Ghost velocity · Plays synced with the Studio & exports
              to WAV/MIDI
            </p>
          </div>
        </div>

        <div className="drum-sequencer-table">
          {/* Step Numbers Header */}
          <div className="drum-seq-header-row">
            <div className="drum-voice-col-header">VOICE / CONTROLS</div>
            <div className="drum-steps-row">
              {Array.from({ length: 16 }, (_, sIdx) => (
                <div
                  key={sIdx}
                  className={`drum-step-num ${
                    sIdx % 4 === 0 ? 'beat-down' : ''
                  } ${activeStep === sIdx ? 'step-playing' : ''}`}
                >
                  {sIdx + 1}
                </div>
              ))}
            </div>
          </div>

          {/* 9 Drum Voice Rows */}
          {drumVoices.map((voice) => {
            const row = drumSteps[voice.id] || Array(16).fill(0);
            return (
              <div key={voice.id} className="drum-seq-voice-row">
                {/* Left Voice Controls */}
                <div className="drum-voice-controls">
                  <button
                    type="button"
                    className="drum-audition-pill"
                    style={{ borderLeft: `4px solid ${voice.color}` }}
                    onClick={() =>
                      triggerDrumLive(voice.id, 0.9, voice, drumKit)
                    }
                    title={`Click to audition ${voice.name}`}
                  >
                    <strong>{voice.shortName}</strong>
                    <small>{voice.name}</small>
                  </button>

                  <button
                    type="button"
                    className={`track-ms-btn ${voice.muted ? 'muted' : ''}`}
                    onClick={() =>
                      onUpdateDrumVoice(voice.id, (v) => ({
                        ...v,
                        muted: !v.muted,
                      }))
                    }
                    title="Mute Drum Voice"
                  >
                    M
                  </button>

                  <button
                    type="button"
                    className={`track-ms-btn ${voice.solo ? 'soloed' : ''}`}
                    onClick={() =>
                      onUpdateDrumVoice(voice.id, (v) => ({
                        ...v,
                        solo: !v.solo,
                      }))
                    }
                    title="Solo Drum Voice"
                  >
                    S
                  </button>

                  <div className="drum-mini-Knob" title="Voice Volume">
                    <Volume2 size={11} />
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.02}
                      value={voice.volume}
                      onChange={(e) =>
                        onUpdateDrumVoice(voice.id, (v) => ({
                          ...v,
                          volume: parseFloat(e.target.value),
                        }))
                      }
                      className="compact-slider"
                      style={{ width: '48px' }}
                    />
                  </div>

                  <div className="drum-mini-Knob" title="Pitch Tune">
                    <span>Tune</span>
                    <input
                      type="range"
                      min={-8}
                      max={8}
                      step={1}
                      value={voice.tune}
                      onChange={(e) =>
                        onUpdateDrumVoice(voice.id, (v) => ({
                          ...v,
                          tune: parseInt(e.target.value, 10),
                        }))
                      }
                      className="compact-slider"
                      style={{ width: '42px' }}
                    />
                  </div>
                </div>

                {/* 16 Step Pads */}
                <div className="drum-steps-row">
                  {row.map((val, stepIdx) => {
                    const isQuarterStart = stepIdx % 4 === 0;
                    const isCurrent = activeStep === stepIdx;
                    return (
                      <button
                        key={stepIdx}
                        type="button"
                        className={[
                          'drum-step-pad',
                          isQuarterStart ? 'pad-beat-start' : '',
                          val === 1 ? 'pad-on-normal' : '',
                          val === 2 ? 'pad-on-accent' : '',
                          val === 3 ? 'pad-on-ghost' : '',
                          isCurrent ? 'pad-playhead' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        style={
                          val > 0
                            ? {
                                backgroundColor: voice.color,
                                opacity:
                                  val === 2 ? 1 : val === 3 ? 0.45 : 0.82,
                              }
                            : undefined
                        }
                        onClick={() =>
                          handleToggleStep(voice, stepIdx, false)
                        }
                        onContextMenu={(e) => {
                          e.preventDefault();
                          handleToggleStep(voice, stepIdx, true);
                        }}
                        title={`${voice.name} · Step ${stepIdx + 1} (${
                          val === 0
                            ? 'Off'
                            : val === 2
                            ? 'Accent 100%'
                            : val === 3
                            ? 'Ghost 45%'
                            : 'Normal 82%'
                        })`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom 2-Column: Live MPC Drum Pads + Performance Chord & Arpeggiator Matrix */}
      <div className="theory-grid-two">
        {/* Live MPC Finger Drumming Pad Bank */}
        <div className="theory-card">
          <div className="theory-card-header">
            <div>
              <h3>
                <Zap size={15} /> Live MPC Finger-Drumming Pad Rack
              </h3>
              <p className="theory-subtitle">
                Tap pads to play synthesized percussion live over your loop
              </p>
            </div>
          </div>

          <div className="mpc-pads-grid">
            {drumVoices.map((v) => (
              <button
                key={v.id}
                type="button"
                className="mpc-drum-pad"
                style={{ borderColor: v.color }}
                onPointerDown={() => triggerDrumLive(v.id, 0.95, v, drumKit)}
              >
                <span
                  className="mpc-pad-led"
                  style={{ backgroundColor: v.color }}
                />
                <strong>{v.shortName}</strong>
                <small>{v.name}</small>
              </button>
            ))}
          </div>
        </div>

        {/* Live Arpeggiator & Diatonic Performance Chord Pads */}
        <div className="theory-card">
          <div className="theory-card-header">
            <div>
              <h3>
                <Sparkles size={15} /> Live Arpeggiator & Diatonic Chord Pads
              </h3>
              <p className="theory-subtitle">
                Trigger arpeggiated or strummed diatonic chords in your active
                Key & Scale
              </p>
            </div>

            <div className="kb-control-group">
              <select
                className="studio-select"
                value={arpMode}
                onChange={(e) => setArpMode(e.target.value as ArpMode)}
                aria-label="Arpeggiator Mode"
              >
                <option value="up">Arp: Ascending (Up)</option>
                <option value="down">Arp: Descending (Down)</option>
                <option value="updown">Arp: Up & Down</option>
                <option value="strum">Guitar / Harp Strum</option>
                <option value="block">Block Chord Stab</option>
              </select>

              <button
                type="button"
                className="kb-mini-btn"
                onClick={() => setArpOctaves((o) => (o === 1 ? 2 : 1))}
              >
                {arpOctaves} Oct Span
              </button>
            </div>
          </div>

          <div className="chord-pads-matrix">
            {diatonicChords.map((dc, idx) => (
              <div key={dc.degree} className="perf-chord-pad-wrap">
                <button
                  type="button"
                  className="perf-chord-pad"
                  onPointerDown={() =>
                    triggerChordPadWithArp(dc.rootPitchClass, dc.seventhId)
                  }
                >
                  <span className="perf-roman">{dc.romanSeventh}</span>
                  <strong>{dc.seventhSymbol}</strong>
                  <small>{dc.functionRole.split(' ')[0]}</small>
                </button>
                <button
                  type="button"
                  className="perf-send-mini"
                  onClick={() => {
                    const midis = buildChordMidiNotes(
                      dc.rootPitchClass,
                      dc.seventhId,
                      4,
                      0
                    );
                    const created: NoteEvent[] = midis.map((m, i) => ({
                      id: `arp-pad-${Date.now()}-${i}`,
                      midi: m,
                      startBeat: (idx * 2) % 16,
                      durationBeats: 1.75,
                      velocity: 0.82,
                      trackId: activeTrackId,
                    }));
                    onAppendNotesToTrack(created);
                  }}
                  title="Write chord into active Piano Roll track"
                >
                  <Layers size={11} /> +Roll
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
