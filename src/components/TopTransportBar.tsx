import React, { useRef, useState } from 'react';
import {
  Play,
  Square,
  Circle,
  Repeat,
  Volume2,
  VolumeX,
  Undo2,
  Redo2,
  Download,
  FolderOpen,
  Sliders,
  BookOpen,
  Headphones,
  Music,
  Sparkles,
  Piano,
} from 'lucide-react';
import {
  EnharmonicPreference,
  QuantizeDivision,
  ScaleId,
  SwingPreset,
  WorkspaceTab,
} from '../types/music';
import {
  CHROMATIC_KEYS,
  QUANTIZE_OPTIONS,
  SCALE_LIST,
  SWING_OPTIONS,
} from '../theory/constants';
import { getPitchClassName } from '../theory/engine';

interface TopTransportBarProps {
  projectName: string;
  onRenameProject: (name: string) => void;
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStop: () => void;
  isRecording: boolean;
  onToggleRecord: () => void;
  isLooping: boolean;
  onToggleLoop: () => void;
  currentBeat: number;
  loopBeats: number;
  bpm: number;
  onChangeBpm: (bpm: number) => void;
  metronomeEnabled: boolean;
  onToggleMetronome: () => void;
  quantize: QuantizeDivision;
  onChangeQuantize: (q: QuantizeDivision) => void;
  swingPreset: SwingPreset;
  swingAmount: number;
  onChangeSwingPreset: (preset: SwingPreset) => void;
  rootPitchClass: number;
  onChangeRoot: (pc: number) => void;
  scaleId: ScaleId;
  onChangeScale: (scale: ScaleId) => void;
  enharmonic: EnharmonicPreference;
  onChangeEnharmonic: (e: EnharmonicPreference) => void;
  masterVolume: number;
  onChangeMasterVolume: (vol: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onQuickExportWav: () => void;
  onQuickExportMidi: () => void;
  isExportingWav: boolean;
  showPianoDock: boolean;
  onTogglePianoDock: () => void;
}

export const TopTransportBar: React.FC<TopTransportBarProps> = ({
  projectName,
  onRenameProject,
  activeTab,
  onSelectTab,
  isPlaying,
  onTogglePlay,
  onStop,
  isRecording,
  onToggleRecord,
  isLooping,
  onToggleLoop,
  currentBeat,
  bpm,
  onChangeBpm,
  metronomeEnabled,
  onToggleMetronome,
  quantize,
  onChangeQuantize,
  swingPreset,
  onChangeSwingPreset,
  rootPitchClass,
  onChangeRoot,
  scaleId,
  onChangeScale,
  enharmonic,
  onChangeEnharmonic,
  masterVolume,
  onChangeMasterVolume,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onQuickExportWav,
  onQuickExportMidi,
  isExportingWav,
  showPianoDock,
  onTogglePianoDock,
}) => {
  const tapTimesRef = useRef<number[]>([]);
  const [tapFlash, setTapFlash] = useState(false);

  const handleTapTempo = () => {
    const now = performance.now();
    const prev = tapTimesRef.current.filter((t) => now - t < 3000);
    prev.push(now);
    tapTimesRef.current = prev.slice(-6);

    setTapFlash(true);
    setTimeout(() => setTapFlash(false), 160);

    if (tapTimesRef.current.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < tapTimesRef.current.length; i++) {
        intervals.push(tapTimesRef.current[i] - tapTimesRef.current[i - 1]);
      }
      const avgMs =
        intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgMs);
      if (calculatedBpm >= 30 && calculatedBpm <= 280) {
        onChangeBpm(calculatedBpm);
      }
    }
  };

  // Format Bar.Beat.Sixteenth (1-based)
  const bar = Math.floor(currentBeat / 4) + 1;
  const beatInBar = Math.floor(currentBeat % 4) + 1;
  const sixteenth = Math.floor((currentBeat % 1) * 4) + 1;
  const positionString = `${bar}.${beatInBar}.${sixteenth}`;

  return (
    <header className="top-transport-shell">
      {/* Row 1: Brand, Navigation Tabs, Undo/Redo, Export & Master */}
      <div className="transport-row transport-row-primary">
        <div className="brand-cluster">
          <div className="brand-logo" title="OpenKeys Studio">
            <span className="brand-logo-bar bar-1" />
            <span className="brand-logo-bar bar-2" />
            <span className="brand-logo-bar bar-3" />
          </div>
          <div className="brand-titles">
            <span className="brand-name">OPENKEYS</span>
            <input
              type="text"
              className="project-title-input"
              value={projectName}
              onChange={(e) => onRenameProject(e.target.value)}
              aria-label="Project Name"
              title="Click to rename project"
            />
          </div>
        </div>

        {/* Main Workspace Navigation */}
        <nav className="workspace-nav" aria-label="Main Workspace">
          <button
            type="button"
            className={`nav-tab ${activeTab === 'studio' ? 'active' : ''}`}
            onClick={() => onSelectTab('studio')}
          >
            <Music size={15} />
            <span>Studio & Grid</span>
          </button>
          <button
            type="button"
            className={`nav-tab ${activeTab === 'synth' ? 'active' : ''}`}
            onClick={() => onSelectTab('synth')}
          >
            <Sliders size={15} />
            <span>Synth & FX</span>
          </button>
          <button
            type="button"
            className={`nav-tab ${activeTab === 'theory' ? 'active' : ''}`}
            onClick={() => onSelectTab('theory')}
          >
            <BookOpen size={15} />
            <span>Theory Lab</span>
          </button>
          <button
            type="button"
            className={`nav-tab ${activeTab === 'eartraining' ? 'active' : ''}`}
            onClick={() => onSelectTab('eartraining')}
          >
            <Headphones size={15} />
            <span>Ear & Practice</span>
          </button>
          <button
            type="button"
            className={`nav-tab ${activeTab === 'projects' ? 'active' : ''}`}
            onClick={() => onSelectTab('projects')}
          >
            <FolderOpen size={15} />
            <span>MIDI, Export & Style</span>
          </button>
        </nav>

        {/* Right Cluster: History, Quick Export, Piano Toggle, Master Vol */}
        <div className="transport-right-cluster">
          <div className="btn-group">
            <button
              type="button"
              className="icon-btn"
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              aria-label="Undo"
            >
              <Undo2 size={15} />
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              aria-label="Redo"
            >
              <Redo2 size={15} />
            </button>
          </div>

          <div className="btn-group">
            <button
              type="button"
              className="chip-btn export-chip"
              onClick={onQuickExportWav}
              disabled={isExportingWav}
              title="Render and Download WAV Audio"
            >
              <Download size={13} />
              <span>{isExportingWav ? 'Rendering...' : 'WAV'}</span>
            </button>
            <button
              type="button"
              className="chip-btn export-chip"
              onClick={onQuickExportMidi}
              title="Download Standard MIDI File (.mid)"
            >
              <Download size={13} />
              <span>MIDI</span>
            </button>
          </div>

          <button
            type="button"
            className={`chip-btn ${showPianoDock ? 'active-chip' : ''}`}
            onClick={onTogglePianoDock}
            title="Show/Hide Docked Virtual Piano"
          >
            <Piano size={14} />
            <span>Keys</span>
          </button>

          <div className="master-vol-control" title={`Master Volume: ${Math.round(masterVolume * 100)}%`}>
            <button
              type="button"
              className="icon-btn-plain"
              onClick={() => onChangeMasterVolume(masterVolume > 0 ? 0 : 0.85)}
              aria-label="Toggle Mute Master"
            >
              {masterVolume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={masterVolume}
              onChange={(e) => onChangeMasterVolume(parseFloat(e.target.value))}
              className="compact-slider"
              aria-label="Master Volume"
            />
          </div>
        </div>
      </div>

      {/* Row 2: Transport Deck, Tempo/Tap/Click, Quantize/Swing, Key & Scale Selector */}
      <div className="transport-row transport-row-secondary">
        {/* Transport Deck */}
        <div className="transport-deck">
          <button
            type="button"
            className={`transport-btn play-btn ${isPlaying ? 'playing' : ''}`}
            onClick={onTogglePlay}
            title="Play / Pause Loop (Space)"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            <Play size={16} fill="currentColor" />
            <span>{isPlaying ? 'Playing' : 'Play'}</span>
          </button>

          <button
            type="button"
            className="transport-btn"
            onClick={onStop}
            title="Stop & Return to Start"
            aria-label="Stop"
          >
            <Square size={14} fill="currentColor" />
          </button>

          <button
            type="button"
            className={`transport-btn rec-btn ${isRecording ? 'recording' : ''}`}
            onClick={onToggleRecord}
            title="Live Record Keyboard/MIDI into Active Track"
            aria-label="Record"
          >
            <Circle size={13} fill="currentColor" />
            <span>Rec</span>
          </button>

          <button
            type="button"
            className={`transport-btn ${isLooping ? 'active-toggle' : ''}`}
            onClick={onToggleLoop}
            title="Toggle Loop Playback"
            aria-label="Loop"
          >
            <Repeat size={14} />
          </button>

          <div className="transport-lcd" title="Position (Bar.Beat.Sixteenth)">
            <span className="lcd-label">POS</span>
            <span className="lcd-value">{positionString}</span>
          </div>
        </div>

        {/* Tempo, Tap & Metronome Click */}
        <div className="control-strip">
          <div className="control-item">
            <label className="strip-label" htmlFor="bpm-input">
              BPM
            </label>
            <input
              id="bpm-input"
              type="number"
              min={30}
              max={280}
              value={bpm}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!Number.isNaN(v)) {
                  onChangeBpm(Math.max(30, Math.min(280, v)));
                }
              }}
              className="bpm-number-input"
            />
            <input
              type="range"
              min={40}
              max={240}
              value={bpm}
              onChange={(e) => onChangeBpm(parseInt(e.target.value, 10))}
              className="compact-slider bpm-slider"
              aria-label="Tempo Slider"
            />
          </div>

          <button
            type="button"
            className={`chip-btn ${tapFlash ? 'active-chip' : ''}`}
            onClick={handleTapTempo}
            title="Tap repeatedly to set tempo"
          >
            Tap
          </button>

          <button
            type="button"
            className={`chip-btn ${metronomeEnabled ? 'active-chip' : ''}`}
            onClick={onToggleMetronome}
            title="Toggle Metronome Click"
          >
            Click {metronomeEnabled ? 'On' : 'Off'}
          </button>
        </div>

        {/* Quantize & Swing */}
        <div className="control-strip">
          <div className="control-item">
            <label className="strip-label" htmlFor="quantize-select">
              Quantize
            </label>
            <select
              id="quantize-select"
              className="studio-select"
              value={quantize}
              onChange={(e) =>
                onChangeQuantize(e.target.value as QuantizeDivision)
              }
            >
              {QUANTIZE_OPTIONS.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.label}
                </option>
              ))}
            </select>
          </div>

          <div className="control-item">
            <label className="strip-label" htmlFor="swing-select">
              Swing
            </label>
            <select
              id="swing-select"
              className="studio-select"
              value={swingPreset}
              onChange={(e) =>
                onChangeSwingPreset(e.target.value as SwingPreset)
              }
            >
              {SWING_OPTIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Musical Key & Scale Selector */}
        <div className="control-strip key-scale-strip">
          <div className="control-item">
            <span className="strip-label">
              <Sparkles size={11} /> Key
            </span>
            <div className="key-pill-row" role="group" aria-label="Musical Key">
              {CHROMATIC_KEYS.map((k) => {
                const label = getPitchClassName(
                  k.pitchClass,
                  enharmonic,
                  rootPitchClass,
                  scaleId
                );
                const isSelected = rootPitchClass === k.pitchClass;
                return (
                  <button
                    key={k.pitchClass}
                    type="button"
                    className={`key-pill ${isSelected ? 'selected' : ''} ${
                      k.isBlack ? 'accidental' : ''
                    }`}
                    onClick={() => onChangeRoot(k.pitchClass)}
                    title={`Key of ${k.dualLabel}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="control-item">
            <label className="strip-label" htmlFor="scale-select">
              Scale
            </label>
            <select
              id="scale-select"
              className="studio-select scale-select"
              value={scaleId}
              onChange={(e) => onChangeScale(e.target.value as ScaleId)}
            >
              {SCALE_LIST.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="chip-btn enharmonic-btn"
            onClick={() => {
              const next: EnharmonicPreference =
                enharmonic === 'auto'
                  ? 'sharps'
                  : enharmonic === 'sharps'
                  ? 'flats'
                  : 'auto';
              onChangeEnharmonic(next);
            }}
            title="Cycle Enharmonic Spelling: Auto / Sharps (#) / Flats (b)"
          >
            {enharmonic === 'auto'
              ? '♯/♭ Auto'
              : enharmonic === 'sharps'
              ? '♯ Sharps'
              : '♭ Flats'}
          </button>
        </div>
      </div>
    </header>
  );
};
