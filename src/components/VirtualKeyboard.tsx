import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Lock,
  Unlock,
  Layers,
  Eye,
} from 'lucide-react';
import {
  EnharmonicPreference,
  KeyLabelMode,
  ScaleId,
} from '../types/music';
import {
  getPitchClassName,
  getScaleDegreeInfo,
  identifyChordsFromMidi,
  isBlackKey,
  midiToFrequency,
  midiToNoteName,
  snapMidiToScale,
} from '../theory/engine';

export const QWERTY_KEY_OFFSETS: Record<string, number> = {
  // Lower row -> starting at baseOctave C
  z: 0,
  s: 1,
  x: 2,
  d: 3,
  c: 4,
  v: 5,
  g: 6,
  b: 7,
  h: 8,
  n: 9,
  j: 10,
  m: 11,
  ',': 12,
  l: 13,
  '.': 14,
  ';': 15,
  '/': 16,
  // Upper row -> starting at (baseOctave + 1) C
  q: 12,
  '2': 13,
  w: 14,
  '3': 15,
  e: 16,
  r: 17,
  '5': 18,
  t: 19,
  '6': 20,
  y: 21,
  '7': 22,
  u: 23,
  i: 24,
  '9': 25,
  o: 26,
  '0': 27,
  p: 28,
};

interface VirtualKeyboardProps {
  rootPitchClass: number;
  scaleId: ScaleId;
  enharmonic: EnharmonicPreference;
  baseOctave: number;
  onChangeBaseOctave: (oct: number) => void;
  visibleOctaves: number;
  onChangeVisibleOctaves: (count: number) => void;
  velocity: number;
  onChangeVelocity: (vel: number) => void;
  activeMidiNotes: Set<number>; // Currently sounding notes (user + playback)
  onNoteOn: (midi: number, velocity: number, source: string) => void;
  onNoteOff: (midi: number, source: string) => void;
  highlightScale: boolean;
  onToggleHighlightScale: () => void;
  scaleLock: boolean;
  onToggleScaleLock: () => void;
  keyLabelMode: KeyLabelMode;
  onChangeKeyLabelMode: (mode: KeyLabelMode) => void;
  referenceA4: number;
}

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  rootPitchClass,
  scaleId,
  enharmonic,
  baseOctave,
  onChangeBaseOctave,
  visibleOctaves,
  onChangeVisibleOctaves,
  velocity,
  onChangeVelocity,
  activeMidiNotes,
  onNoteOn,
  onNoteOff,
  highlightScale,
  onToggleHighlightScale,
  scaleLock,
  onToggleScaleLock,
  keyLabelMode,
  onChangeKeyLabelMode,
  referenceA4,
}) => {
  const [chordHoldMode, setChordHoldMode] = useState(false);
  const [sustainPedal, setSustainPedal] = useState(false);
  const heldChordNotesRef = useRef<Set<number>>(new Set());
  const mouseDownMidiRef = useRef<number | null>(null);
  const pressedQwertyRef = useRef<Map<string, number>>(new Map());

  const startMidi = (baseOctave + 1) * 12; // e.g. baseOctave 3 -> C3 (48)
  const endMidi = Math.min(108, startMidi + visibleOctaves * 12); // inclusive top C

  // Map MIDI -> QWERTY shortcut badge
  const midiToQwertyLabel = useMemo(() => {
    const map = new Map<number, string>();
    Object.entries(QWERTY_KEY_OFFSETS).forEach(([key, offset]) => {
      const midi = startMidi + offset;
      if (!map.has(midi)) {
        map.set(midi, key.toUpperCase());
      }
    });
    return map;
  }, [startMidi]);

  const resolveTriggeredMidi = (rawMidi: number): number => {
    if (!scaleLock) return rawMidi;
    return snapMidiToScale(rawMidi, rootPitchClass, scaleId);
  };

  // Global Computer Keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        onChangeBaseOctave(Math.max(1, baseOctave - 1));
        return;
      }
      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        onChangeBaseOctave(Math.min(6, baseOctave + 1));
        return;
      }

      const lower = e.key.toLowerCase();
      if (lower in QWERTY_KEY_OFFSETS) {
        e.preventDefault();
        if (pressedQwertyRef.current.has(lower)) return;
        const rawMidi = startMidi + QWERTY_KEY_OFFSETS[lower];
        const midi = resolveTriggeredMidi(rawMidi);
        pressedQwertyRef.current.set(lower, midi);
        onNoteOn(midi, velocity, `qwerty-${lower}`);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const lower = e.key.toLowerCase();
      const triggeredMidi = pressedQwertyRef.current.get(lower);
      if (triggeredMidi !== undefined) {
        pressedQwertyRef.current.delete(lower);
        if (!sustainPedal && !chordHoldMode) {
          onNoteOff(triggeredMidi, `qwerty-${lower}`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    baseOctave,
    startMidi,
    velocity,
    scaleLock,
    rootPitchClass,
    scaleId,
    sustainPedal,
    chordHoldMode,
    onNoteOn,
    onNoteOff,
    onChangeBaseOctave,
  ]);

  const clearLatchedNotes = () => {
    heldChordNotesRef.current.forEach((m) => {
      onNoteOff(m, 'mouse');
      onNoteOff(m, 'latch');
    });
    heldChordNotesRef.current.clear();
  };

  const handlePointerDownKey = (rawMidi: number) => {
    const midi = resolveTriggeredMidi(rawMidi);
    if (chordHoldMode) {
      if (heldChordNotesRef.current.has(midi)) {
        heldChordNotesRef.current.delete(midi);
        onNoteOff(midi, 'latch');
      } else {
        heldChordNotesRef.current.add(midi);
        onNoteOn(midi, velocity, 'latch');
      }
      return;
    }

    mouseDownMidiRef.current = midi;
    onNoteOn(midi, velocity, 'mouse');
  };

  const handlePointerEnterKey = (rawMidi: number) => {
    if (chordHoldMode || mouseDownMidiRef.current === null) return;
    const midi = resolveTriggeredMidi(rawMidi);
    if (midi !== mouseDownMidiRef.current) {
      if (!sustainPedal) {
        onNoteOff(mouseDownMidiRef.current, 'mouse');
      }
      mouseDownMidiRef.current = midi;
      onNoteOn(midi, velocity, 'mouse');
    }
  };

  const handlePointerUpGlobal = () => {
    if (mouseDownMidiRef.current !== null) {
      if (!sustainPedal) {
        onNoteOff(mouseDownMidiRef.current, 'mouse');
      }
      mouseDownMidiRef.current = null;
    }
  };

  useEffect(() => {
    window.addEventListener('pointerup', handlePointerUpGlobal);
    return () => window.removeEventListener('pointerup', handlePointerUpGlobal);
  });

  // Build keys array from startMidi to endMidi
  const allKeys = useMemo(() => {
    const list: {
      midi: number;
      isBlack: boolean;
      whiteIndex: number;
    }[] = [];
    let wIdx = 0;
    for (let m = startMidi; m <= endMidi; m++) {
      const black = isBlackKey(m);
      list.push({
        midi: m,
        isBlack: black,
        whiteIndex: black ? wIdx - 1 : wIdx,
      });
      if (!black) wIdx++;
    }
    return list;
  }, [startMidi, endMidi]);

  const whiteKeys = allKeys.filter((k) => !k.isBlack);
  const blackKeys = allKeys.filter((k) => k.isBlack);
  const totalWhiteKeys = whiteKeys.length;

  // Live active notes analysis (chord identification + frequencies)
  const activeMidiArray = useMemo(
    () => Array.from(activeMidiNotes).sort((a, b) => a - b),
    [activeMidiNotes]
  );

  const detectedChord = useMemo(() => {
    if (activeMidiArray.length < 2) return null;
    const matches = identifyChordsFromMidi(
      activeMidiArray,
      enharmonic,
      rootPitchClass,
      scaleId
    );
    return matches[0] ?? null;
  }, [activeMidiArray, enharmonic, rootPitchClass, scaleId]);

  const formatKeyLabel = (midi: number): string => {
    const degInfo = getScaleDegreeInfo(midi, rootPitchClass, scaleId);
    switch (keyLabelMode) {
      case 'notes':
        return midiToNoteName(midi, enharmonic, rootPitchClass, scaleId);
      case 'degrees':
        return degInfo.inScale && degInfo.degreeNumber
          ? `${degInfo.degreeNumber}°`
          : '';
      case 'intervals':
        return degInfo.inScale && degInfo.formulaLabel
          ? degInfo.formulaLabel
          : '';
      case 'qwerty':
        return midiToQwertyLabel.get(midi) ?? '';
      case 'midi':
        return `${midi}`;
      case 'none':
      default:
        return '';
    }
  };

  return (
    <section
      className="virtual-keyboard-dock"
      aria-label="Interactive Virtual Piano Keyboard"
    >
      {/* Keyboard Header Bar */}
      <div className="keyboard-toolbar">
        {/* Left: Octave & Range Controls */}
        <div className="kb-control-group">
          <div className="kb-pill-control">
            <span className="kb-label">Octave</span>
            <button
              type="button"
              className="kb-step-btn"
              onClick={() => onChangeBaseOctave(Math.max(1, baseOctave - 1))}
              disabled={baseOctave <= 1}
              title="Octave Down (-)"
              aria-label="Octave Down"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="kb-value">
              C{baseOctave}–C{Math.min(8, baseOctave + visibleOctaves)}
            </span>
            <button
              type="button"
              className="kb-step-btn"
              onClick={() => onChangeBaseOctave(Math.min(6, baseOctave + 1))}
              disabled={baseOctave >= 6}
              title="Octave Up (+)"
              aria-label="Octave Up"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="kb-pill-control">
            <span className="kb-label">Range</span>
            {[1, 2, 3, 4].map((octCount) => (
              <button
                key={octCount}
                type="button"
                className={`kb-mini-btn ${
                  visibleOctaves === octCount ? 'active' : ''
                }`}
                onClick={() => onChangeVisibleOctaves(octCount)}
              >
                {octCount} Oct
              </button>
            ))}
          </div>

          <div className="kb-pill-control">
            <span className="kb-label">Vel</span>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.02}
              value={velocity}
              onChange={(e) => onChangeVelocity(parseFloat(e.target.value))}
              className="compact-slider kb-vel-slider"
              aria-label="Keyboard Velocity"
            />
            <span className="kb-value">{Math.round(velocity * 127)}</span>
          </div>
        </div>

        {/* Center: Live Active Notes, Frequencies & Instant Chord Identification */}
        <div className="kb-live-monitor">
          {activeMidiArray.length === 0 ? (
            <span className="kb-monitor-idle">
              Click keys, drag glissando, or use QWERTY (Z–M / Q–P) · Simultaneous polyphony ready
            </span>
          ) : (
            <div className="kb-monitor-active">
              <div className="kb-active-notes-list">
                {activeMidiArray.slice(0, 6).map((m) => (
                  <span key={m} className="kb-note-badge">
                    <strong>
                      {midiToNoteName(m, enharmonic, rootPitchClass, scaleId)}
                    </strong>{' '}
                    <small>{midiToFrequency(m, referenceA4).toFixed(1)}Hz</small>
                  </span>
                ))}
              </div>
              {detectedChord && (
                <span className="kb-chord-badge" title={detectedChord.fullName}>
                  Chord: <strong>{detectedChord.symbol}</strong> ·{' '}
                  {detectedChord.inversionLabel}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: Scale Highlight, Scale Lock, Chord Latch, Sustain & Labels */}
        <div className="kb-control-group">
          <button
            type="button"
            className={`chip-btn ${highlightScale ? 'active-chip' : ''}`}
            onClick={onToggleHighlightScale}
            title="Highlight notes in the selected Key & Scale"
          >
            <Eye size={13} />
            <span>Scale Guide</span>
          </button>

          <button
            type="button"
            className={`chip-btn ${scaleLock ? 'active-chip' : ''}`}
            onClick={onToggleScaleLock}
            title="Scale Lock: Snaps out-of-scale key presses to nearest scale tone"
          >
            {scaleLock ? <Lock size={13} /> : <Unlock size={13} />}
            <span>Scale Lock</span>
          </button>

          <button
            type="button"
            className={`chip-btn ${chordHoldMode ? 'active-chip' : ''}`}
            onClick={() => {
              if (chordHoldMode) clearLatchedNotes();
              setChordHoldMode(!chordHoldMode);
            }}
            title="Chord Hold: Click multiple keys with the mouse to sustain chords simultaneously"
          >
            <Layers size={13} />
            <span>Chord Hold</span>
          </button>

          <button
            type="button"
            className={`chip-btn ${sustainPedal ? 'active-chip' : ''}`}
            onClick={() => {
              if (sustainPedal) clearLatchedNotes();
              setSustainPedal(!sustainPedal);
            }}
            title="Toggle Sustain Damper Pedal"
          >
            <span>Sustain {sustainPedal ? 'On' : 'Off'}</span>
          </button>

          <select
            className="studio-select"
            value={keyLabelMode}
            onChange={(e) =>
              onChangeKeyLabelMode(e.target.value as KeyLabelMode)
            }
            aria-label="Key Label Mode"
            title="Choose what labels appear on piano keys"
          >
            <option value="notes">Labels: Notes</option>
            <option value="degrees">Labels: Scale Degrees</option>
            <option value="intervals">Labels: Intervals</option>
            <option value="qwerty">Labels: Computer Keys</option>
            <option value="midi">Labels: MIDI #</option>
            <option value="none">Labels: Hidden</option>
          </select>
        </div>
      </div>

      {/* Piano Keybed */}
      <div
        className="piano-keybed"
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* White Keys */}
        {whiteKeys.map((k, idx) => {
          const isActive = activeMidiNotes.has(k.midi);
          const degInfo = getScaleDegreeInfo(k.midi, rootPitchClass, scaleId);
          const qwertyHint = midiToQwertyLabel.get(k.midi);
          const primaryLabel = formatKeyLabel(k.midi);
          const widthPct = 100 / totalWhiteKeys;

          return (
            <button
              key={k.midi}
              type="button"
              data-midi={k.midi}
              className={[
                'piano-key',
                'white-key',
                isActive ? 'key-active' : '',
                highlightScale && degInfo.isRoot ? 'key-scale-root' : '',
                highlightScale && degInfo.inScale && !degInfo.isRoot
                  ? 'key-in-scale'
                  : '',
                highlightScale && !degInfo.inScale ? 'key-out-of-scale' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{
                left: `${idx * widthPct}%`,
                width: `${widthPct}%`,
              }}
              onPointerDown={() => handlePointerDownKey(k.midi)}
              onPointerEnter={() => handlePointerEnterKey(k.midi)}
              aria-label={`Piano key ${midiToNoteName(
                k.midi,
                enharmonic,
                rootPitchClass,
                scaleId
              )}`}
            >
              {qwertyHint && keyLabelMode !== 'qwerty' && (
                <span className="key-qwerty-hint">{qwertyHint}</span>
              )}
              {highlightScale && degInfo.inScale && (
                <span
                  className={`key-scale-dot ${
                    degInfo.isRoot ? 'root-dot' : ''
                  }`}
                />
              )}
              <span className="key-primary-label">{primaryLabel}</span>
            </button>
          );
        })}

        {/* Black Keys */}
        {blackKeys.map((k) => {
          const isActive = activeMidiNotes.has(k.midi);
          const degInfo = getScaleDegreeInfo(k.midi, rootPitchClass, scaleId);
          const qwertyHint = midiToQwertyLabel.get(k.midi);
          const primaryLabel = formatKeyLabel(k.midi);
          const whiteWidthPct = 100 / totalWhiteKeys;
          const blackWidthPct = whiteWidthPct * 0.62;
          const leftPct =
            (k.whiteIndex + 1) * whiteWidthPct - blackWidthPct / 2;

          return (
            <button
              key={k.midi}
              type="button"
              data-midi={k.midi}
              className={[
                'piano-key',
                'black-key',
                isActive ? 'key-active' : '',
                highlightScale && degInfo.isRoot ? 'key-scale-root' : '',
                highlightScale && degInfo.inScale && !degInfo.isRoot
                  ? 'key-in-scale'
                  : '',
                highlightScale && !degInfo.inScale ? 'key-out-of-scale' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{
                left: `${leftPct}%`,
                width: `${blackWidthPct}%`,
              }}
              onPointerDown={() => handlePointerDownKey(k.midi)}
              onPointerEnter={() => handlePointerEnterKey(k.midi)}
              aria-label={`Piano key ${midiToNoteName(
                k.midi,
                enharmonic,
                rootPitchClass,
                scaleId
              )}`}
            >
              {qwertyHint && keyLabelMode !== 'qwerty' && (
                <span className="key-qwerty-hint">{qwertyHint}</span>
              )}
              {highlightScale && degInfo.inScale && (
                <span
                  className={`key-scale-dot ${
                    degInfo.isRoot ? 'root-dot' : ''
                  }`}
                />
              )}
              <span className="key-primary-label">
                {primaryLabel ||
                  getPitchClassName(
                    k.midi,
                    enharmonic,
                    rootPitchClass,
                    scaleId
                  )}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
