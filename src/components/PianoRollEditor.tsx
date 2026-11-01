import React, { useMemo, useRef, useState } from 'react';
import {
  Pencil,
  Sparkles,
  Trash2,
  ZoomIn,
  ZoomOut,
  Layers,
  Magnet,
  Wand2,
  Plus,
  Volume2,
  Eye,
  FolderHeart,
} from 'lucide-react';
import {
  EnharmonicPreference,
  NoteEvent,
  PresetId,
  ProjectData,
  QuantizeDivision,
  ScaleId,
  Track,
} from '../types/music';
import { PRESET_LIST, cloneSynthParams } from '../audio/presets';
import {
  getQuantizeStepBeats,
  getScaleDegreeInfo,
  isBlackKey,
  isPitchClassInScale,
  midiToNoteName,
  quantizeBeat,
  snapMidiToScale,
} from '../theory/engine';
import { DEMO_PROJECTS } from '../storage/demoProjects';

type EditorTool = 'draw' | 'sketch' | 'erase';

interface PianoRollEditorProps {
  tracks: Track[];
  activeTrackId: string;
  onSelectTrack: (trackId: string) => void;
  onUpdateTrack: (trackId: string, updater: (t: Track) => Track) => void;
  onAddTrack: () => void;
  notes: NoteEvent[];
  onChangeNotes: (nextNotes: NoteEvent[], pushHistory?: boolean) => void;
  rootPitchClass: number;
  scaleId: ScaleId;
  enharmonic: EnharmonicPreference;
  loopBeats: number;
  onChangeLoopBeats: (beats: number) => void;
  currentBeat: number;
  onSeekBeat: (beat: number) => void;
  quantize: QuantizeDivision;
  foldToScale: boolean;
  onToggleFoldToScale: () => void;
  onAuditionNote: (midi: number, velocity: number, track: Track) => void;
  onLoadDemoProject: (demo: ProjectData) => void;
}

const MIN_MIDI = 36; // C2
const MAX_MIDI = 84; // C6

export const PianoRollEditor: React.FC<PianoRollEditorProps> = ({
  tracks,
  activeTrackId,
  onSelectTrack,
  onUpdateTrack,
  onAddTrack,
  notes,
  onChangeNotes,
  rootPitchClass,
  scaleId,
  enharmonic,
  loopBeats,
  onChangeLoopBeats,
  currentBeat,
  onSeekBeat,
  quantize,
  foldToScale,
  onToggleFoldToScale,
  onAuditionNote,
  onLoadDemoProject,
}) => {
  const [tool, setTool] = useState<EditorTool>('draw');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [showGhostNotes, setShowGhostNotes] = useState(true);
  const [beatWidth, setBeatWidth] = useState(64); // px per quarter-note beat
  const [rowHeight, setRowHeight] = useState(22); // px per pitch row

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Dragging state for moving or resizing a note or freehand sketching
  const dragStateRef = useRef<{
    mode: 'move' | 'resize' | 'sketch' | 'velocity';
    noteId?: string;
    initialStartBeat?: number;
    initialDuration?: number;
    initialMidi?: number;
    startX: number;
    startY: number;
    lastSketchedCell?: string;
  } | null>(null);

  const activeTrack = useMemo(
    () => tracks.find((t) => t.id === activeTrackId) ?? tracks[0],
    [tracks, activeTrackId]
  );

  // Visible pitch rows (descending from MAX_MIDI to MIN_MIDI)
  const visibleMidiRows = useMemo(() => {
    const rows: number[] = [];
    for (let m = MAX_MIDI; m >= MIN_MIDI; m--) {
      if (foldToScale) {
        if (isPitchClassInScale(m, rootPitchClass, scaleId)) {
          rows.push(m);
        }
      } else {
        rows.push(m);
      }
    }
    return rows;
  }, [foldToScale, rootPitchClass, scaleId]);

  const stepBeats = getQuantizeStepBeats(quantize);
  const gridWidthPx = loopBeats * beatWidth;
  const gridHeightPx = visibleMidiRows.length * rowHeight;

  const activeTrackNotes = useMemo(
    () => notes.filter((n) => n.trackId === activeTrack.id),
    [notes, activeTrack.id]
  );

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedNoteId) ?? null,
    [notes, selectedNoteId]
  );

  const getBeatAndMidiFromPointer = (
    clientX: number,
    clientY: number,
    gridElement: HTMLElement
  ): { beat: number; midi: number } => {
    const rect = gridElement.getBoundingClientRect();
    const relX = Math.max(0, Math.min(gridWidthPx - 1, clientX - rect.left));
    const relY = Math.max(0, Math.min(gridHeightPx - 1, clientY - rect.top));

    const rawBeat = relX / beatWidth;
    const quantized =
      quantize === 'off'
        ? Math.max(0, Math.round(rawBeat * 16) / 16)
        : Math.floor(rawBeat / stepBeats) * stepBeats;

    const rowIdx = Math.max(
      0,
      Math.min(visibleMidiRows.length - 1, Math.floor(relY / rowHeight))
    );
    const midi = visibleMidiRows[rowIdx] ?? 60;
    return { beat: quantized, midi };
  };

  const handleGridPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button === 2) return;
    // Ignore if user clicked directly on an existing note element
    if ((e.target as HTMLElement).closest('.pr-note-block')) {
      return;
    }

    const gridEl = e.currentTarget;
    const { beat, midi } = getBeatAndMidiFromPointer(
      e.clientX,
      e.clientY,
      gridEl
    );

    if (tool === 'erase') {
      return;
    }

    const dur = Math.max(0.125, stepBeats);
    const newNote: NoteEvent = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      midi,
      startBeat: beat,
      durationBeats: dur,
      velocity: 0.82,
      trackId: activeTrack.id,
    };

    onAuditionNote(midi, 0.82, activeTrack);
    setSelectedNoteId(newNote.id);
    onChangeNotes([...notes, newNote], true);

    if (tool === 'sketch') {
      dragStateRef.current = {
        mode: 'sketch',
        startX: e.clientX,
        startY: e.clientY,
        lastSketchedCell: `${beat.toFixed(3)}-${midi}`,
      };
    }
  };

  const handleGridPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag) return;

    const gridEl = e.currentTarget;
    if (drag.mode === 'sketch') {
      const { beat, midi } = getBeatAndMidiFromPointer(
        e.clientX,
        e.clientY,
        gridEl
      );
      const cellKey = `${beat.toFixed(3)}-${midi}`;
      if (cellKey === drag.lastSketchedCell) return;
      drag.lastSketchedCell = cellKey;

      const exists = notes.some(
        (n) =>
          n.trackId === activeTrack.id &&
          Math.abs(n.startBeat - beat) < 0.05 &&
          n.midi === midi
      );
      if (!exists) {
        const sketchedMidi = snapMidiToScale(midi, rootPitchClass, scaleId);
        const dur = Math.max(0.125, stepBeats);
        const newNote: NoteEvent = {
          id: `sketch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          midi: sketchedMidi,
          startBeat: beat,
          durationBeats: dur,
          velocity: 0.8,
          trackId: activeTrack.id,
        };
        onAuditionNote(sketchedMidi, 0.78, activeTrack);
        onChangeNotes([...notes, newNote], false);
      }
      return;
    }

    if (drag.mode === 'move' && drag.noteId) {
      const dxBeats = (e.clientX - drag.startX) / beatWidth;
      const dyRows = Math.round((e.clientY - drag.startY) / rowHeight);

      const rawNewBeat = Math.max(
        0,
        Math.min(loopBeats - 0.125, (drag.initialStartBeat ?? 0) + dxBeats)
      );
      const nextStartBeat = quantizeBeat(rawNewBeat, quantize);

      const startRowIndex = visibleMidiRows.indexOf(drag.initialMidi ?? 60);
      let nextMidi = drag.initialMidi ?? 60;
      if (startRowIndex !== -1) {
        const targetRow = Math.max(
          0,
          Math.min(visibleMidiRows.length - 1, startRowIndex + dyRows)
        );
        nextMidi = visibleMidiRows[targetRow];
      } else {
        nextMidi = Math.max(
          MIN_MIDI,
          Math.min(MAX_MIDI, (drag.initialMidi ?? 60) - dyRows)
        );
      }

      const prevNote = notes.find((n) => n.id === drag.noteId);
      if (prevNote && prevNote.midi !== nextMidi) {
        onAuditionNote(nextMidi, prevNote.velocity, activeTrack);
      }

      onChangeNotes(
        notes.map((n) =>
          n.id === drag.noteId
            ? { ...n, startBeat: nextStartBeat, midi: nextMidi }
            : n
        ),
        false
      );
    } else if (drag.mode === 'resize' && drag.noteId) {
      const dxBeats = (e.clientX - drag.startX) / beatWidth;
      const minStep = quantize === 'off' ? 0.125 : stepBeats;
      const rawDur = Math.max(
        minStep,
        (drag.initialDuration ?? minStep) + dxBeats
      );
      const snappedDur =
        quantize === 'off'
          ? Math.round(rawDur * 16) / 16
          : Math.max(minStep, Math.round(rawDur / minStep) * minStep);

      onChangeNotes(
        notes.map((n) =>
          n.id === drag.noteId ? { ...n, durationBeats: snappedDur } : n
        ),
        false
      );
    }
  };

  const handleGridPointerUp = () => {
    dragStateRef.current = null;
  };

  const handleNotePointerDown = (
    e: React.PointerEvent,
    note: NoteEvent,
    isResizeHandle: boolean
  ) => {
    e.stopPropagation();

    if (e.button === 2 || tool === 'erase') {
      onChangeNotes(
        notes.filter((n) => n.id !== note.id),
        true
      );
      if (selectedNoteId === note.id) setSelectedNoteId(null);
      return;
    }

    setSelectedNoteId(note.id);
    onAuditionNote(note.midi, note.velocity, activeTrack);

    dragStateRef.current = {
      mode: isResizeHandle ? 'resize' : 'move',
      noteId: note.id,
      initialStartBeat: note.startBeat,
      initialDuration: note.durationBeats,
      initialMidi: note.midi,
      startX: e.clientX,
      startY: e.clientY,
    };
  };

  const handleDeleteNote = (noteId: string) => {
    onChangeNotes(
      notes.filter((n) => n.id !== noteId),
      true
    );
    if (selectedNoteId === noteId) setSelectedNoteId(null);
  };

  const handleQuantizeTrack = () => {
    const updated = notes.map((n) => {
      if (n.trackId !== activeTrack.id) return n;
      const qStart = quantizeBeat(n.startBeat, quantize === 'off' ? '1/16' : quantize);
      return {
        ...n,
        startBeat: Math.min(loopBeats - stepBeats, qStart),
      };
    });
    onChangeNotes(updated, true);
  };

  const handleSnapTrackToScale = () => {
    const updated = notes.map((n) => {
      if (n.trackId !== activeTrack.id) return n;
      return {
        ...n,
        midi: snapMidiToScale(n.midi, rootPitchClass, scaleId),
      };
    });
    onChangeNotes(updated, true);
  };

  const handleGenerateScaleMelody = () => {
    // Generate an inspiring melodic phrase in the current Key & Scale on active track
    const scaleMidis: number[] = [];
    for (let m = 60; m <= 79; m++) {
      if (isPitchClassInScale(m, rootPitchClass, scaleId)) {
        scaleMidis.push(m);
      }
    }
    if (scaleMidis.length === 0) return;

    const otherTrackNotes = notes.filter((n) => n.trackId !== activeTrack.id);
    const generated: NoteEvent[] = [];
    const step = quantize === 'off' ? 0.5 : Math.max(0.25, stepBeats);
    let idx = 0;
    for (let beat = 0; beat < loopBeats; beat += step) {
      if (Math.random() < 0.18 && beat > 0) continue; // musical rest
      const pitch = scaleMidis[idx % scaleMidis.length];
      generated.push({
        id: `gen-${Date.now()}-${beat}`,
        midi: pitch,
        startBeat: beat,
        durationBeats: step,
        velocity: 0.72 + (beat % 4 === 0 ? 0.16 : 0),
        trackId: activeTrack.id,
      });
      idx += Math.random() > 0.35 ? 1 : scaleMidis.length - 1;
    }
    onChangeNotes([...otherTrackNotes, ...generated], true);
  };

  const handleClearTrack = () => {
    onChangeNotes(
      notes.filter((n) => n.trackId !== activeTrack.id),
      true
    );
    setSelectedNoteId(null);
  };

  // Vertical beat lines for grid
  const beatColumns = useMemo(() => {
    const cols: { beat: number; isBar: boolean; isBeat: boolean }[] = [];
    const step = quantize === 'off' ? 0.25 : stepBeats;
    const count = Math.round(loopBeats / step);
    for (let i = 0; i <= count; i++) {
      const b = i * step;
      const isBar = Math.abs(b % 4) < 0.001;
      const isBeat = Math.abs(b % 1) < 0.001;
      cols.push({ beat: b, isBar, isBeat });
    }
    return cols;
  }, [loopBeats, quantize, stepBeats]);

  return (
    <div className="studio-editor-layout">
      {/* Left Sidebar: Multi-Track Mixer & Demo Loop Switcher */}
      <aside className="track-rack-sidebar">
        <div className="rack-section-header">
          <span>TRACKS ({tracks.length})</span>
          <button
            type="button"
            className="chip-btn"
            onClick={onAddTrack}
            title="Add New Instrument Track"
          >
            <Plus size={12} />
            <span>Add Track</span>
          </button>
        </div>

        <div className="track-cards-list">
          {tracks.map((track) => {
            const isSelected = track.id === activeTrack.id;
            const trackNoteCount = notes.filter(
              (n) => n.trackId === track.id
            ).length;

            return (
              <div
                key={track.id}
                className={`track-card ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectTrack(track.id)}
              >
                <div className="track-card-top">
                  <span
                    className="track-color-swatch"
                    style={{ backgroundColor: track.color }}
                  />
                  <input
                    type="text"
                    className="track-name-input"
                    value={track.name}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      onUpdateTrack(track.id, (t) => ({
                        ...t,
                        name: e.target.value,
                      }))
                    }
                    aria-label="Track Name"
                  />
                  <span className="track-note-count" title="Notes in track">
                    {trackNoteCount}
                  </span>
                </div>

                <div className="track-card-row">
                  <select
                    className="studio-select track-preset-select"
                    value={track.instrument}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      const nextPreset = e.target.value as PresetId;
                      onUpdateTrack(track.id, (t) => ({
                        ...t,
                        instrument: nextPreset,
                        synthParams: cloneSynthParams(nextPreset),
                      }));
                    }}
                    aria-label={`Instrument for ${track.name}`}
                  >
                    {PRESET_LIST.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="track-card-controls">
                  <button
                    type="button"
                    className={`track-ms-btn ${track.muted ? 'muted' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateTrack(track.id, (t) => ({
                        ...t,
                        muted: !t.muted,
                      }));
                    }}
                    title="Mute Track"
                  >
                    M
                  </button>
                  <button
                    type="button"
                    className={`track-ms-btn ${track.solo ? 'soloed' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateTrack(track.id, (t) => ({
                        ...t,
                        solo: !t.solo,
                      }));
                    }}
                    title="Solo Track"
                  >
                    S
                  </button>

                  <div
                    className="track-vol-wrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Volume2 size={12} />
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.02}
                      value={track.volume}
                      onChange={(e) =>
                        onUpdateTrack(track.id, (t) => ({
                          ...t,
                          volume: parseFloat(e.target.value),
                        }))
                      }
                      className="compact-slider"
                      aria-label={`Volume for ${track.name}`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Starter / Demo Loop Presets */}
        <div className="rack-demo-box">
          <div className="rack-section-header">
            <span>
              <FolderHeart size={12} /> STARTER LOOPS
            </span>
          </div>
          <div className="demo-buttons-col">
            {DEMO_PROJECTS.map((demo) => (
              <button
                key={demo.id}
                type="button"
                className="demo-preset-btn"
                onClick={() => onLoadDemoProject(demo)}
              >
                <span className="demo-title">{demo.name}</span>
                <small className="demo-meta">{demo.bpm} BPM</small>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Piano Roll & Visual Sketch Editor */}
      <div className="piano-roll-main">
        {/* Editor Action Toolbar */}
        <div className="pr-toolbar">
          <div className="pr-tool-group">
            <button
              type="button"
              className={`chip-btn ${tool === 'draw' ? 'active-chip' : ''}`}
              onClick={() => setTool('draw')}
              title="Note Pencil Tool: Click to place, drag to move, drag right edge to resize"
            >
              <Pencil size={13} />
              <span>Note Tool</span>
            </button>

            <button
              type="button"
              className={`chip-btn ${tool === 'sketch' ? 'active-chip' : ''}`}
              onClick={() => setTool('sketch')}
              title="Visual Sketch Brush: Paint continuous scale-locked melodic lines"
            >
              <Sparkles size={13} />
              <span>Visual Sketch Brush</span>
            </button>

            <button
              type="button"
              className={`chip-btn ${tool === 'erase' ? 'active-chip' : ''}`}
              onClick={() => setTool('erase')}
              title="Eraser Tool: Click any note to remove it (or right-click in any mode)"
            >
              <Trash2 size={13} />
              <span>Erase</span>
            </button>
          </div>

          <div className="pr-tool-group">
            <button
              type="button"
              className={`chip-btn ${foldToScale ? 'active-chip' : ''}`}
              onClick={onToggleFoldToScale}
              title="Fold Grid to Scale: Only display rows belonging to the active Key & Scale"
            >
              <Layers size={13} />
              <span>{foldToScale ? 'Scale Grid (Folded)' : 'Chromatic Grid'}</span>
            </button>

            <button
              type="button"
              className={`chip-btn ${showGhostNotes ? 'active-chip' : ''}`}
              onClick={() => setShowGhostNotes(!showGhostNotes)}
              title="Show Ghost Notes from other tracks"
            >
              <Eye size={13} />
              <span>Ghost Notes</span>
            </button>

            <button
              type="button"
              className="chip-btn"
              onClick={handleQuantizeTrack}
              title="Snap all notes in active track to current Quantize division"
            >
              <Magnet size={13} />
              <span>Quantize Track</span>
            </button>

            <button
              type="button"
              className="chip-btn"
              onClick={handleSnapTrackToScale}
              title="Snap all notes in active track into the current Key & Scale"
            >
              <Sparkles size={13} />
              <span>Fit to Scale</span>
            </button>

            <button
              type="button"
              className="chip-btn"
              onClick={handleGenerateScaleMelody}
              title="Auto-generate a melodic pattern in the selected Key & Scale"
            >
              <Wand2 size={13} />
              <span>Inspire Pattern</span>
            </button>

            <button
              type="button"
              className="chip-btn danger-chip"
              onClick={handleClearTrack}
              title="Clear all notes on the active track"
            >
              <Trash2 size={13} />
              <span>Clear Track</span>
            </button>
          </div>

          {/* Right: Loop Length, Selected Note Velocity & Zoom Controls */}
          <div className="pr-tool-group">
            {selectedNote && (
              <div className="selected-note-inspector">
                <span>
                  Note:{' '}
                  <strong>
                    {midiToNoteName(
                      selectedNote.midi,
                      enharmonic,
                      rootPitchClass,
                      scaleId
                    )}
                  </strong>
                </span>
                <label>
                  Vel {Math.round(selectedNote.velocity * 100)}%
                  <input
                    type="range"
                    min={0.05}
                    max={1}
                    step={0.01}
                    value={selectedNote.velocity}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      onChangeNotes(
                        notes.map((n) =>
                          n.id === selectedNote.id ? { ...n, velocity: v } : n
                        ),
                        false
                      );
                    }}
                    className="compact-slider"
                  />
                </label>
                <button
                  type="button"
                  className="kb-mini-btn"
                  onClick={() => handleDeleteNote(selectedNote.id)}
                  title="Delete Selected Note"
                >
                  Del
                </button>
              </div>
            )}

            <div className="control-item">
              <label className="strip-label" htmlFor="loop-beats-select">
                Loop
              </label>
              <select
                id="loop-beats-select"
                className="studio-select"
                value={loopBeats}
                onChange={(e) =>
                  onChangeLoopBeats(parseInt(e.target.value, 10))
                }
              >
                <option value={8}>2 Bars (8 Beats)</option>
                <option value={16}>4 Bars (16 Beats)</option>
                <option value={32}>8 Bars (32 Beats)</option>
              </select>
            </div>

            <div className="btn-group">
              <button
                type="button"
                className="icon-btn"
                onClick={() => setBeatWidth((w) => Math.max(36, w - 12))}
                title="Zoom Out Horizontally"
                aria-label="Zoom Out"
              >
                <ZoomOut size={14} />
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setBeatWidth((w) => Math.min(128, w + 12))}
                title="Zoom In Horizontally"
                aria-label="Zoom In"
              >
                <ZoomIn size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Piano Roll Viewport */}
        <div className="pr-scroll-viewport" ref={scrollContainerRef}>
          <div
            className="pr-canvas-inner"
            style={{ width: `${gridWidthPx + 76}px` }}
          >
            {/* Timeline Ruler Header */}
            <div className="pr-timeline-row">
              <div className="pr-key-gutter-header">PITCH</div>
              <div
                className="pr-timeline-ruler"
                style={{ width: `${gridWidthPx}px` }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = Math.max(0, e.clientX - rect.left);
                  const targetBeat = Math.min(
                    loopBeats,
                    clickX / beatWidth
                  );
                  onSeekBeat(targetBeat);
                }}
                title="Click anywhere on timeline to scrub playhead position"
              >
                {Array.from({ length: loopBeats }, (_, beatIdx) => (
                  <div
                    key={beatIdx}
                    className={`pr-ruler-beat ${
                      beatIdx % 4 === 0 ? 'bar-start' : ''
                    }`}
                    style={{
                      left: `${beatIdx * beatWidth}px`,
                      width: `${beatWidth}px`,
                    }}
                  >
                    <span>
                      {beatIdx % 4 === 0
                        ? `Bar ${Math.floor(beatIdx / 4) + 1}`
                        : `${Math.floor(beatIdx / 4) + 1}.${(beatIdx % 4) + 1}`}
                    </span>
                  </div>
                ))}

                {/* Playhead Triangle Marker */}
                <div
                  className="pr-playhead-marker"
                  style={{ left: `${currentBeat * beatWidth}px` }}
                />
              </div>
            </div>

            {/* Pitch Rows + Note Grid */}
            <div className="pr-body-row">
              {/* Left Pitch Key Gutter */}
              <div className="pr-key-gutter">
                {visibleMidiRows.map((midi) => {
                  const degInfo = getScaleDegreeInfo(
                    midi,
                    rootPitchClass,
                    scaleId
                  );
                  const black = isBlackKey(midi);
                  const noteLabel = midiToNoteName(
                    midi,
                    enharmonic,
                    rootPitchClass,
                    scaleId
                  );
                  return (
                    <button
                      key={midi}
                      type="button"
                      className={[
                        'pr-gutter-key',
                        black ? 'gutter-black' : 'gutter-white',
                        degInfo.isRoot ? 'gutter-root' : '',
                        degInfo.inScale ? 'gutter-in-scale' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      style={{ height: `${rowHeight}px` }}
                      onClick={() => onAuditionNote(midi, 0.85, activeTrack)}
                      title={`Audition ${noteLabel}`}
                    >
                      <span className="gutter-note-name">{noteLabel}</span>
                      {degInfo.inScale && degInfo.formulaLabel && (
                        <span className="gutter-degree-tag">
                          {degInfo.formulaLabel}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Interactive Note Matrix */}
              <div
                className="pr-grid-matrix"
                style={{
                  width: `${gridWidthPx}px`,
                  height: `${gridHeightPx}px`,
                }}
                onPointerDown={handleGridPointerDown}
                onPointerMove={handleGridPointerMove}
                onPointerUp={handleGridPointerUp}
                onContextMenu={(e) => e.preventDefault()}
              >
                {/* Horizontal Pitch Lanes */}
                {visibleMidiRows.map((midi, rIdx) => {
                  const degInfo = getScaleDegreeInfo(
                    midi,
                    rootPitchClass,
                    scaleId
                  );
                  const black = isBlackKey(midi);
                  return (
                    <div
                      key={midi}
                      className={[
                        'pr-pitch-lane',
                        black ? 'lane-black' : 'lane-white',
                        degInfo.isRoot ? 'lane-root' : '',
                        degInfo.inScale ? 'lane-in-scale' : 'lane-out-scale',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      style={{
                        top: `${rIdx * rowHeight}px`,
                        height: `${rowHeight}px`,
                      }}
                    />
                  );
                })}

                {/* Vertical Beat / Step Lines */}
                {beatColumns.map((col, idx) => (
                  <div
                    key={idx}
                    className={[
                      'pr-grid-vline',
                      col.isBar
                        ? 'vline-bar'
                        : col.isBeat
                        ? 'vline-beat'
                        : 'vline-sub',
                    ].join(' ')}
                    style={{ left: `${col.beat * beatWidth}px` }}
                  />
                ))}

                {/* Ghost Notes from other tracks */}
                {showGhostNotes &&
                  notes
                    .filter((n) => n.trackId !== activeTrack.id)
                    .map((n) => {
                      const rowIndex = visibleMidiRows.indexOf(n.midi);
                      if (rowIndex === -1) return null;
                      const parentTrack = tracks.find(
                        (t) => t.id === n.trackId
                      );
                      return (
                        <div
                          key={n.id}
                          className="pr-ghost-note"
                          style={{
                            left: `${n.startBeat * beatWidth}px`,
                            top: `${rowIndex * rowHeight + 2}px`,
                            width: `${Math.max(
                              6,
                              n.durationBeats * beatWidth - 2
                            )}px`,
                            height: `${rowHeight - 4}px`,
                            backgroundColor: parentTrack?.color ?? '#64748b',
                          }}
                        />
                      );
                    })}

                {/* Active Track Notes */}
                {activeTrackNotes.map((note) => {
                  const rowIndex = visibleMidiRows.indexOf(note.midi);
                  if (rowIndex === -1) return null;
                  const isSelected = note.id === selectedNoteId;
                  const noteLabel = midiToNoteName(
                    note.midi,
                    enharmonic,
                    rootPitchClass,
                    scaleId
                  );

                  return (
                    <div
                      key={note.id}
                      data-note-id={note.id}
                      className={`pr-note-block ${
                        isSelected ? 'note-selected' : ''
                      }`}
                      style={{
                        left: `${note.startBeat * beatWidth}px`,
                        top: `${rowIndex * rowHeight + 1}px`,
                        width: `${Math.max(
                          10,
                          note.durationBeats * beatWidth - 1
                        )}px`,
                        height: `${rowHeight - 2}px`,
                        backgroundColor: activeTrack.color,
                        opacity: 0.45 + note.velocity * 0.55,
                      }}
                      onPointerDown={(e) =>
                        handleNotePointerDown(e, note, false)
                      }
                      onDoubleClick={() => handleDeleteNote(note.id)}
                      title={`${noteLabel} · Start: ${note.startBeat.toFixed(
                        2
                      )} · Dur: ${note.durationBeats.toFixed(
                        2
                      )} · Vel: ${Math.round(
                        note.velocity * 100
                      )}% (Drag to move, right edge to resize, right-click/double-click to delete)`}
                    >
                      <span className="pr-note-label">{noteLabel}</span>
                      <div
                        className="pr-note-resize-handle"
                        onPointerDown={(e) =>
                          handleNotePointerDown(e, note, true)
                        }
                        title="Drag to resize note duration"
                      />
                    </div>
                  );
                })}

                {/* Live Playhead Vertical Indicator */}
                <div
                  className="pr-playhead-line"
                  style={{ left: `${currentBeat * beatWidth}px` }}
                />
              </div>
            </div>

            {/* Bottom Velocity Lane Editor */}
            <div className="pr-velocity-lane-row">
              <div className="pr-velocity-gutter">VELOCITY</div>
              <div
                className="pr-velocity-canvas"
                style={{ width: `${gridWidthPx}px` }}
              >
                {activeTrackNotes.map((note) => {
                  const isSelected = note.id === selectedNoteId;
                  return (
                    <div
                      key={`vel-${note.id}`}
                      className={`pr-vel-stalk-wrap ${
                        isSelected ? 'selected' : ''
                      }`}
                      style={{
                        left: `${note.startBeat * beatWidth}px`,
                        width: `${Math.max(
                          10,
                          note.durationBeats * beatWidth
                        )}px`,
                      }}
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const relY = e.clientY - rect.top;
                        const nextVel = Math.max(
                          0.08,
                          Math.min(1, 1 - relY / rect.height)
                        );
                        setSelectedNoteId(note.id);
                        onChangeNotes(
                          notes.map((n) =>
                            n.id === note.id ? { ...n, velocity: nextVel } : n
                          ),
                          true
                        );
                      }}
                      title={`Click to adjust velocity (${Math.round(
                        note.velocity * 100
                      )}%)`}
                    >
                      <div
                        className="pr-vel-stalk"
                        style={{
                          height: `${Math.round(note.velocity * 100)}%`,
                          backgroundColor: activeTrack.color,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
