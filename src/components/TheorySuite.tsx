import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Compass,
  Disc,
  Layers,
  Play,
  PlusCircle,
  Radio,
  Search,
  Sparkles,
  Trash2,
  Volume2,
} from 'lucide-react';
import {
  EnharmonicPreference,
  NoteEvent,
  ScaleId,
  SynthParams,
} from '../types/music';
import {
  CHORD_DEFINITIONS,
  CHROMATIC_KEYS,
  CIRCLE_OF_FIFTHS,
  PROGRESSION_PRESETS,
  SCALES,
} from '../theory/constants';
import {
  analyzeInterval,
  buildChordMidiNotes,
  frequencyToWavelengthCm,
  getDiatonicChordsForScale,
  getKeySignatureInfo,
  getPitchClassName,
  getScaleNotes,
  identifyChordsFromMidi,
  midiToFrequency,
  midiToNoteName,
  normalizePitchClass,
} from '../theory/engine';
import { soundEngine } from '../audio/soundEngine';

type TheorySubTab =
  | 'scales'
  | 'chords'
  | 'progressions'
  | 'circle'
  | 'fretboard'
  | 'intervals';

interface TheorySuiteProps {
  rootPitchClass: number;
  scaleId: ScaleId;
  enharmonic: EnharmonicPreference;
  onChangeRoot: (pc: number) => void;
  onChangeScale: (scale: ScaleId) => void;
  activeMidiNotes: Set<number>;
  synthParams: SynthParams;
  activeTrackId: string;
  onAppendNotesToTrack: (newNotes: NoteEvent[]) => void;
  referenceA4: number;
  onChangeReferenceA4: (hz: number) => void;
}

export const TheorySuite: React.FC<TheorySuiteProps> = ({
  rootPitchClass,
  scaleId,
  enharmonic,
  onChangeRoot,
  onChangeScale,
  activeMidiNotes,
  synthParams,
  activeTrackId,
  onAppendNotesToTrack,
  referenceA4,
  onChangeReferenceA4,
}) => {
  const [subTab, setSubTab] = useState<TheorySubTab>('scales');

  // Chord Builder state
  const [chordRoot, setChordRoot] = useState<number>(rootPitchClass);
  const [selectedChordId, setSelectedChordId] = useState<string>('maj7');
  const [chordInversion, setChordInversion] = useState<number>(0);
  const [openVoicing, setOpenVoicing] = useState<boolean>(false);

  // Chord Identifier interactive pitch-class / MIDI selector
  const [identifierMidis, setIdentifierMidis] = useState<number[]>([
    60, 64, 67, 71,
  ]);

  // Progression Builder state
  const [progressionSlots, setProgressionSlots] = useState<
    { rootPc: number; chordId: string; label: string; roman: string }[]
  >([
    { rootPc: 0, chordId: 'maj7', label: 'Cmaj7', roman: 'Imaj7' },
    { rootPc: 7, chordId: 'dom7', label: 'G7', roman: 'V7' },
    { rootPc: 9, chordId: 'min7', label: 'Am7', roman: 'vi7' },
    { rootPc: 5, chordId: 'maj7', label: 'Fmaj7', roman: 'IVmaj7' },
  ]);

  // Interval Analyzer state
  const [intervalMidiA, setIntervalMidiA] = useState<number>(60); // C4
  const [intervalMidiB, setIntervalMidiB] = useState<number>(67); // G4
  const [freqFilterOctave, setFreqFilterOctave] = useState<number | 'all'>(4);
  const [fretboardTuning, setFretboardTuning] = useState<
    'guitar_std' | 'guitar_dropd' | 'bass_4' | 'ukulele'
  >('guitar_std');

  const scaleDef = SCALES[scaleId];
  const scaleNotes = useMemo(
    () => getScaleNotes(rootPitchClass, scaleId, enharmonic, referenceA4),
    [rootPitchClass, scaleId, enharmonic, referenceA4]
  );
  const keySigInfo = useMemo(
    () => getKeySignatureInfo(rootPitchClass, scaleId),
    [rootPitchClass, scaleId]
  );

  // Built chord details
  const builtChordMidis = useMemo(
    () =>
      buildChordMidiNotes(
        chordRoot,
        selectedChordId,
        4,
        chordInversion,
        openVoicing
      ),
    [chordRoot, selectedChordId, chordInversion, openVoicing]
  );

  const currentChordDef =
    CHORD_DEFINITIONS.find((c) => c.id === selectedChordId) ??
    CHORD_DEFINITIONS[0];

  // Combine live keyboard notes (if >= 2) or manual identifierMidis for Chord Identification
  const effectiveIdentifierMidis =
    activeMidiNotes.size >= 2
      ? Array.from(activeMidiNotes).sort((a, b) => a - b)
      : identifierMidis;

  const identifiedChords = useMemo(
    () =>
      identifyChordsFromMidi(
        effectiveIdentifierMidis,
        enharmonic,
        rootPitchClass,
        scaleId
      ),
    [effectiveIdentifierMidis, enharmonic, rootPitchClass, scaleId]
  );

  const diatonicChords = useMemo(
    () => getDiatonicChordsForScale(rootPitchClass, scaleId, enharmonic),
    [rootPitchClass, scaleId, enharmonic]
  );

  const intervalResult = useMemo(
    () =>
      analyzeInterval(
        intervalMidiA,
        intervalMidiB,
        enharmonic,
        rootPitchClass,
        scaleId,
        referenceA4
      ),
    [
      intervalMidiA,
      intervalMidiB,
      enharmonic,
      rootPitchClass,
      scaleId,
      referenceA4,
    ]
  );

  const handlePlayScaleAscending = () => {
    const midis = scaleNotes.map((n) => n.midiExample);
    midis.push(60 + normalizePitchClass(rootPitchClass) + 12); // top octave root
    soundEngine.triggerChord(midis, 0.32, 0.82, synthParams, 0.22);
  };

  const handleSendChordToTrack = (
    midis: number[],
    startBeatOffset = 0,
    durationBeats = 2
  ) => {
    const created: NoteEvent[] = midis.map((m, idx) => ({
      id: `theory-chord-${Date.now()}-${idx}-${Math.random()
        .toString(36)
        .slice(2, 6)}`,
      midi: m,
      startBeat: startBeatOffset,
      durationBeats,
      velocity: 0.8,
      trackId: activeTrackId,
    }));
    onAppendNotesToTrack(created);
  };

  const handlePlayProgression = () => {
    progressionSlots.forEach((slot, idx) => {
      const midis = buildChordMidiNotes(slot.rootPc, slot.chordId, 4, 0, false);
      midis.forEach((m) => {
        soundEngine.triggerNote(
          m,
          0.75,
          0.78,
          synthParams,
          0.8,
          0,
          idx * 0.85
        );
      });
    });
  };

  const handleSendProgressionToPianoRoll = () => {
    const newNotes: NoteEvent[] = [];
    progressionSlots.forEach((slot, slotIdx) => {
      const midis = buildChordMidiNotes(slot.rootPc, slot.chordId, 4, 0, false);
      const startBeat = (slotIdx * 4) % 16;
      midis.forEach((m, nIdx) => {
        newNotes.push({
          id: `prog-${Date.now()}-${slotIdx}-${nIdx}`,
          midi: m,
          startBeat,
          durationBeats: 3.75,
          velocity: 0.78,
          trackId: activeTrackId,
        });
      });
    });
    onAppendNotesToTrack(newNotes);
  };

  const loadProgressionPreset = (presetId: string) => {
    const preset = PROGRESSION_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const majorIntervals = SCALES.major.intervals;
    const nextSlots = preset.degrees.map((deg) => {
      const semi = majorIntervals[deg.degreeIndex % majorIntervals.length] ?? 0;
      const pc = normalizePitchClass(rootPitchClass + semi);
      const rootName = getPitchClassName(
        pc,
        enharmonic,
        rootPitchClass,
        scaleId
      );
      const cDef =
        CHORD_DEFINITIONS.find((c) => c.id === deg.chordId) ??
        CHORD_DEFINITIONS[0];
      return {
        rootPc: pc,
        chordId: deg.chordId,
        label: `${rootName}${cDef.symbol}`,
        roman: deg.roman,
      };
    });
    setProgressionSlots(nextSlots);
  };

  // Staff Y position helper for Treble Clef visualization
  const getStaffYForNote = (noteName: string, indexInScale: number): number => {
    const letter = noteName.charAt(0).toUpperCase();
    const diatonicOrder = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const rootLetter = scaleNotes[0]?.noteName.charAt(0).toUpperCase() || 'C';
    const rootIdx = diatonicOrder.indexOf(rootLetter);
    let letterIdx = diatonicOrder.indexOf(letter);
    if (letterIdx < rootIdx && indexInScale > 0) {
      letterIdx += 7;
    }
    // C4 ledger line at y = 112; each diatonic step goes up by 7px
    return 112 - letterIdx * 7;
  };

  return (
    <div className="theory-suite-container">
      {/* Sub-Navigation Bar */}
      <div className="theory-subnav">
        <button
          type="button"
          className={`theory-subtab ${subTab === 'scales' ? 'active' : ''}`}
          onClick={() => setSubTab('scales')}
        >
          <BookOpen size={14} />
          <span>Scale & Key Signature Visualizer</span>
        </button>
        <button
          type="button"
          className={`theory-subtab ${subTab === 'chords' ? 'active' : ''}`}
          onClick={() => setSubTab('chords')}
        >
          <Layers size={14} />
          <span>Chord Builder & Identifier</span>
        </button>
        <button
          type="button"
          className={`theory-subtab ${
            subTab === 'progressions' ? 'active' : ''
          }`}
          onClick={() => setSubTab('progressions')}
        >
          <Sparkles size={14} />
          <span>Chord Progression Studio</span>
        </button>
        <button
          type="button"
          className={`theory-subtab ${subTab === 'circle' ? 'active' : ''}`}
          onClick={() => setSubTab('circle')}
        >
          <Compass size={14} />
          <span>Circle of Fifths</span>
        </button>
        <button
          type="button"
          className={`theory-subtab ${subTab === 'fretboard' ? 'active' : ''}`}
          onClick={() => setSubTab('fretboard')}
        >
          <Disc size={14} />
          <span>Guitar & Bass Fretboard</span>
        </button>
        <button
          type="button"
          className={`theory-subtab ${subTab === 'intervals' ? 'active' : ''}`}
          onClick={() => setSubTab('intervals')}
        >
          <Radio size={14} />
          <span>Intervals & Frequency Reference</span>
        </button>
      </div>

      {/* TAB 1: SCALE & KEY SIGNATURE VISUALIZATION */}
      {subTab === 'scales' && (
        <div className="theory-grid-two">
          <div className="theory-card">
            <div className="theory-card-header">
              <div>
                <h3>
                  {getPitchClassName(
                    rootPitchClass,
                    enharmonic,
                    rootPitchClass,
                    scaleId
                  )}{' '}
                  {scaleDef.name}
                </h3>
                <p className="theory-subtitle">{scaleDef.description}</p>
              </div>
              <button
                type="button"
                className="chip-btn active-chip"
                onClick={handlePlayScaleAscending}
              >
                <Play size={13} />
                <span>Play Scale</span>
              </button>
            </div>

            <div className="theory-mood-banner">
              <span>Mood & Character:</span>
              <strong>{scaleDef.mood}</strong>
            </div>

            {/* Scale Degree Cards */}
            <div className="scale-degrees-row">
              {scaleNotes.map((n) => (
                <button
                  key={n.degree}
                  type="button"
                  className="scale-degree-card"
                  onClick={() =>
                    soundEngine.triggerNote(
                      n.midiExample,
                      0.55,
                      0.85,
                      synthParams
                    )
                  }
                  title={`Click to audition ${n.noteName} (${n.frequencyHz.toFixed(
                    1
                  )} Hz)`}
                >
                  <span className="deg-formula">{n.formula}</span>
                  <span className="deg-note">{n.noteName}</span>
                  <span className="deg-interval">{n.intervalName}</span>
                  <span className="deg-freq">{n.frequencyHz.toFixed(1)} Hz</span>
                </button>
              ))}
            </div>
          </div>

          {/* Key Signature & Treble Staff SVG Visualization */}
          <div className="theory-card">
            <div className="theory-card-header">
              <div>
                <h3>Key Signature & Staff Notation</h3>
                <p className="theory-subtitle">
                  Relative Major: <strong>{keySigInfo.majorLabel}</strong> ·
                  Relative Minor: <strong>{keySigInfo.minorLabel}</strong> ·{' '}
                  {keySigInfo.sharps > 0
                    ? `${keySigInfo.sharps} Sharp${
                        keySigInfo.sharps > 1 ? 's' : ''
                      } (${keySigInfo.accidentalNotes.join(', ')})`
                    : keySigInfo.flats > 0
                    ? `${keySigInfo.flats} Flat${
                        keySigInfo.flats > 1 ? 's' : ''
                      } (${keySigInfo.accidentalNotes.join(', ')})`
                    : 'No Sharps or Flats (Natural Key Signature)'}
                </p>
              </div>
            </div>

            <div className="staff-svg-wrapper">
              <svg
                viewBox="0 0 560 145"
                className="musical-staff-svg"
                aria-label="Musical Staff Scale Visualization"
              >
                {/* 5 Treble Staff Lines (E4=98, G4=84, B4=70, D5=56, F5=42) */}
                {[42, 56, 70, 84, 98].map((y) => (
                  <line
                    key={y}
                    x1="20"
                    y1={y}
                    x2="540"
                    y2={y}
                    stroke="rgba(148, 163, 184, 0.45)"
                    strokeWidth="1.4"
                  />
                ))}

                {/* Treble Clef Symbol */}
                <text
                  x="30"
                  y="94"
                  fontSize="58"
                  fill="#06b6d4"
                  fontFamily="serif"
                >
                  𝄞
                </text>

                {/* Key Signature Accidentals */}
                {keySigInfo.accidentalNotes.map((acc, i) => {
                  const sharpY = [42, 63, 35, 56, 77, 49, 70][i] ?? 56;
                  const flatY = [70, 49, 77, 56, 84, 63, 91][i] ?? 70;
                  const yPos = keySigInfo.sharps > 0 ? sharpY : flatY;
                  return (
                    <text
                      key={acc}
                      x={78 + i * 13}
                      y={yPos + 5}
                      fontSize="18"
                      fill="#a855f7"
                      fontWeight="bold"
                    >
                      {keySigInfo.sharps > 0 ? '♯' : '♭'}
                    </text>
                  );
                })}

                {/* Scale Notes on Staff */}
                {scaleNotes.map((n, i) => {
                  const x = 180 + i * 48;
                  const y = getStaffYForNote(n.noteName, i);
                  const hasAccidental =
                    n.noteName.includes('#') || n.noteName.includes('b');
                  return (
                    <g
                      key={n.degree}
                      className="staff-note-group"
                      onClick={() =>
                        soundEngine.triggerNote(
                          n.midiExample,
                          0.5,
                          0.85,
                          synthParams
                        )
                      }
                      style={{ cursor: 'pointer' }}
                    >
                      {/* Ledger line if near C4 (y >= 110) */}
                      {y >= 110 && (
                        <line
                          x1={x - 14}
                          y1={112}
                          x2={x + 14}
                          y2={112}
                          stroke="#94a3b8"
                          strokeWidth="1.5"
                        />
                      )}
                      {hasAccidental && (
                        <text
                          x={x - 20}
                          y={y + 5}
                          fontSize="15"
                          fill="#38bdf8"
                        >
                          {n.noteName.includes('#') ? '♯' : '♭'}
                        </text>
                      )}
                      <ellipse
                        cx={x}
                        cy={y}
                        rx="7.5"
                        ry="5.5"
                        transform={`rotate(-18 ${x} ${y})`}
                        fill={i === 0 ? '#06b6d4' : '#f8fafc'}
                      />
                      {/* Note Stem */}
                      <line
                        x1={y > 70 ? x + 6.5 : x - 6.5}
                        y1={y}
                        x2={y > 70 ? x + 6.5 : x - 6.5}
                        y2={y > 70 ? y - 30 : y + 30}
                        stroke={i === 0 ? '#06b6d4' : '#f8fafc'}
                        strokeWidth="1.8"
                      />
                      <text
                        x={x}
                        y={134}
                        textAnchor="middle"
                        fontSize="11"
                        fill="#cbd5e1"
                      >
                        {n.noteName}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CHORD BUILDER & REAL-TIME CHORD IDENTIFIER */}
      {subTab === 'chords' && (
        <div className="theory-grid-two">
          {/* Left: Interactive Chord Builder */}
          <div className="theory-card">
            <div className="theory-card-header">
              <div>
                <h3>Interactive Chord Builder</h3>
                <p className="theory-subtitle">
                  Construct triads, 7ths, extended 9ths, and inversions
                </p>
              </div>
              <div className="btn-group">
                <button
                  type="button"
                  className="chip-btn active-chip"
                  onClick={() =>
                    soundEngine.triggerChord(
                      builtChordMidis,
                      0.95,
                      0.85,
                      synthParams,
                      0
                    )
                  }
                >
                  <Play size={13} />
                  <span>Play Block</span>
                </button>
                <button
                  type="button"
                  className="chip-btn"
                  onClick={() =>
                    soundEngine.triggerChord(
                      builtChordMidis,
                      0.85,
                      0.82,
                      synthParams,
                      0.12
                    )
                  }
                >
                  <Volume2 size={13} />
                  <span>Arpeggiate</span>
                </button>
                <button
                  type="button"
                  className="chip-btn"
                  onClick={() => handleSendChordToTrack(builtChordMidis, 0, 4)}
                  title="Insert this chord at Bar 1 of the active track"
                >
                  <PlusCircle size={13} />
                  <span>Add to Track</span>
                </button>
              </div>
            </div>

            {/* Root Note Selector */}
            <div className="builder-section">
              <span className="strip-label">Chord Root</span>
              <div className="key-pill-row">
                {CHROMATIC_KEYS.map((k) => {
                  const label = getPitchClassName(
                    k.pitchClass,
                    enharmonic,
                    rootPitchClass,
                    scaleId
                  );
                  return (
                    <button
                      key={k.pitchClass}
                      type="button"
                      className={`key-pill ${
                        chordRoot === k.pitchClass ? 'selected' : ''
                      }`}
                      onClick={() => setChordRoot(k.pitchClass)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chord Quality Selector */}
            <div className="builder-section">
              <span className="strip-label">Chord Quality & Extensions</span>
              <div className="chord-quality-grid">
                {CHORD_DEFINITIONS.map((def) => (
                  <button
                    key={def.id}
                    type="button"
                    className={`chord-type-btn ${
                      selectedChordId === def.id ? 'active' : ''
                    }`}
                    onClick={() => setSelectedChordId(def.id)}
                  >
                    <strong>
                      {getPitchClassName(
                        chordRoot,
                        enharmonic,
                        rootPitchClass,
                        scaleId
                      )}
                      {def.symbol}
                    </strong>
                    <small>{def.name}</small>
                  </button>
                ))}
              </div>
            </div>

            {/* Inversion & Voicing Options */}
            <div className="builder-row-split">
              <div className="control-item">
                <span className="strip-label">Inversion</span>
                <div className="btn-group">
                  {[0, 1, 2, 3].map((inv) => (
                    <button
                      key={inv}
                      type="button"
                      className={`kb-mini-btn ${
                        chordInversion === inv ? 'active' : ''
                      }`}
                      onClick={() => setChordInversion(inv)}
                    >
                      {inv === 0 ? 'Root' : `${inv} Inv`}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className={`chip-btn ${openVoicing ? 'active-chip' : ''}`}
                onClick={() => setOpenVoicing(!openVoicing)}
              >
                Spread / Open Voicing {openVoicing ? 'On' : 'Off'}
              </button>
            </div>

            {/* Built Chord Result Card */}
            <div className="chord-result-banner">
              <div className="chord-symbol-large">
                {getPitchClassName(
                  chordRoot,
                  enharmonic,
                  rootPitchClass,
                  scaleId
                )}
                {currentChordDef.symbol}
              </div>
              <div className="chord-result-details">
                <div>
                  <strong>{currentChordDef.name}</strong> · Formula:{' '}
                  <code>{currentChordDef.formula.join(' – ')}</code>
                </div>
                <p>{currentChordDef.description}</p>
                <div className="chord-notes-pills">
                  {builtChordMidis.map((m) => (
                    <span key={m} className="kb-note-badge">
                      {midiToNoteName(m, enharmonic, rootPitchClass, scaleId)} (
                      {midiToFrequency(m, referenceA4).toFixed(1)} Hz)
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Reverse Chord Identifier */}
          <div className="theory-card">
            <div className="theory-card-header">
              <div>
                <h3>Chord Identification Engine</h3>
                <p className="theory-subtitle">
                  Toggle notes below or hold notes on the Virtual Piano to
                  identify any chord or inversion
                </p>
              </div>
              <button
                type="button"
                className="chip-btn"
                onClick={() =>
                  soundEngine.triggerChord(
                    effectiveIdentifierMidis,
                    0.85,
                    0.85,
                    synthParams,
                    0.04
                  )
                }
              >
                <Play size={13} />
                <span>Audition Notes</span>
              </button>
            </div>

            {/* Interactive Note Toggle Strip (C4 to B5) */}
            <div className="identifier-note-picker">
              {Array.from({ length: 18 }, (_, i) => 60 + i).map((m) => {
                const isSelected = effectiveIdentifierMidis.includes(m);
                const label = midiToNoteName(
                  m,
                  enharmonic,
                  rootPitchClass,
                  scaleId
                );
                return (
                  <button
                    key={m}
                    type="button"
                    className={`id-note-btn ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      soundEngine.triggerNote(m, 0.35, 0.8, synthParams);
                      setIdentifierMidis((prev) =>
                        prev.includes(m)
                          ? prev.filter((x) => x !== m)
                          : [...prev, m].sort((a, b) => a - b)
                      );
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Identified Matches */}
            <div className="identified-matches-list">
              {identifiedChords.length === 0 ? (
                <div className="empty-theory-state">
                  Select at least 2 notes to identify chords and inversions.
                </div>
              ) : (
                identifiedChords.map((match, idx) => (
                  <div
                    key={`${match.symbol}-${idx}`}
                    className={`identified-match-card ${
                      idx === 0 ? 'primary-match' : ''
                    }`}
                  >
                    <div className="match-symbol">{match.symbol}</div>
                    <div className="match-info">
                      <strong>{match.fullName}</strong>
                      <span>
                        {match.inversionLabel} · Bass: {match.bassName} · Notes:{' '}
                        {match.notes.join(' – ')}
                      </span>
                    </div>
                    <span className="match-score">
                      {idx === 0 ? 'Best Match' : 'Enharmonic / Alt'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CHORD PROGRESSION STUDIO */}
      {subTab === 'progressions' && (
        <div className="theory-grid-two">
          {/* Left: Diatonic Palette for Active Key & Scale */}
          <div className="theory-card">
            <div className="theory-card-header">
              <div>
                <h3>
                  Diatonic Harmony in{' '}
                  {getPitchClassName(
                    rootPitchClass,
                    enharmonic,
                    rootPitchClass,
                    scaleId
                  )}{' '}
                  {scaleDef.shortName}
                </h3>
                <p className="theory-subtitle">
                  Click any chord to audition it, or click + to append it to
                  your progression
                </p>
              </div>
            </div>

            <div className="diatonic-chords-grid">
              {diatonicChords.map((item) => (
                <div key={item.degree} className="diatonic-chord-card">
                  <div className="diatonic-roman-row">
                    <span className="roman-badge">{item.romanTriad}</span>
                    <span className="function-label">{item.functionRole}</span>
                  </div>

                  <div className="diatonic-buttons-pair">
                    <button
                      type="button"
                      className="diatonic-play-btn"
                      onClick={() => {
                        const midis = buildChordMidiNotes(
                          item.rootPitchClass,
                          item.triadId,
                          4,
                          0
                        );
                        soundEngine.triggerChord(
                          midis,
                          0.75,
                          0.82,
                          synthParams,
                          0.03
                        );
                      }}
                    >
                      <strong>{item.triadSymbol}</strong>
                      <small>Triad</small>
                    </button>
                    <button
                      type="button"
                      className="diatonic-add-btn"
                      onClick={() =>
                        setProgressionSlots((prev) => [
                          ...prev,
                          {
                            rootPc: item.rootPitchClass,
                            chordId: item.triadId,
                            label: item.triadSymbol,
                            roman: item.romanTriad,
                          },
                        ])
                      }
                      title={`Add ${item.triadSymbol} to Progression`}
                    >
                      +
                    </button>
                  </div>

                  <div className="diatonic-buttons-pair">
                    <button
                      type="button"
                      className="diatonic-play-btn seventh-btn"
                      onClick={() => {
                        const midis = buildChordMidiNotes(
                          item.rootPitchClass,
                          item.seventhId,
                          4,
                          0
                        );
                        soundEngine.triggerChord(
                          midis,
                          0.8,
                          0.82,
                          synthParams,
                          0.04
                        );
                      }}
                    >
                      <strong>{item.seventhSymbol}</strong>
                      <small>{item.romanSeventh}</small>
                    </button>
                    <button
                      type="button"
                      className="diatonic-add-btn"
                      onClick={() =>
                        setProgressionSlots((prev) => [
                          ...prev,
                          {
                            rootPc: item.rootPitchClass,
                            chordId: item.seventhId,
                            label: item.seventhSymbol,
                            roman: item.romanSeventh,
                          },
                        ])
                      }
                      title={`Add ${item.seventhSymbol} to Progression`}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Progression Sequencer & Templates */}
          <div className="theory-card">
            <div className="theory-card-header">
              <div>
                <h3>Chord Progression Builder</h3>
                <p className="theory-subtitle">
                  Audition harmonic progressions or write them directly into the
                  Piano Roll
                </p>
              </div>
              <div className="btn-group">
                <button
                  type="button"
                  className="chip-btn active-chip"
                  onClick={handlePlayProgression}
                >
                  <Play size={13} />
                  <span>Play Progression</span>
                </button>
                <button
                  type="button"
                  className="chip-btn"
                  onClick={handleSendProgressionToPianoRoll}
                >
                  <PlusCircle size={13} />
                  <span>Send to Piano Roll</span>
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setProgressionSlots([])}
                  title="Clear Progression"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Active Progression Chain */}
            <div className="progression-chain-slots">
              {progressionSlots.map((slot, idx) => (
                <div key={`${slot.label}-${idx}`} className="prog-slot-card">
                  <span className="prog-slot-step">Bar {idx + 1}</span>
                  <button
                    type="button"
                    className="prog-slot-main"
                    onClick={() => {
                      const midis = buildChordMidiNotes(
                        slot.rootPc,
                        slot.chordId,
                        4,
                        0
                      );
                      soundEngine.triggerChord(
                        midis,
                        0.75,
                        0.82,
                        synthParams,
                        0.03
                      );
                    }}
                  >
                    <strong>{slot.label}</strong>
                    <small>{slot.roman}</small>
                  </button>
                  <button
                    type="button"
                    className="prog-slot-remove"
                    onClick={() =>
                      setProgressionSlots((prev) =>
                        prev.filter((_, i) => i !== idx)
                      )
                    }
                    title="Remove chord"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* Classic Progression Templates */}
            <div className="builder-section">
              <span className="strip-label">Classic Progression Templates</span>
              <div className="prog-templates-list">
                {PROGRESSION_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className="prog-template-btn"
                    onClick={() => loadProgressionPreset(preset.id)}
                  >
                    <div className="prog-template-top">
                      <strong>{preset.name}</strong>
                      <span className="preset-category-tag">{preset.genre}</span>
                    </div>
                    <p>{preset.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: INTERACTIVE CIRCLE OF FIFTHS */}
      {subTab === 'circle' && (
        <div className="theory-grid-two">
          <div className="theory-card circle-card-center">
            <div className="theory-card-header">
              <div>
                <h3>Interactive Circle of Fifths</h3>
                <p className="theory-subtitle">
                  Click an outer wedge for Major keys or an inner wedge for
                  Relative Minor keys
                </p>
              </div>
            </div>

            <div className="circle-svg-container">
              <svg
                viewBox="-190 -190 380 380"
                className="circle-of-fifths-svg"
                aria-label="Interactive Circle of Fifths"
              >
                {CIRCLE_OF_FIFTHS.map((slice) => {
                  const angleDeg = slice.position * 30 - 90;
                  const angleRad = (angleDeg * Math.PI) / 180;
                  const majX = Math.cos(angleRad) * 142;
                  const majY = Math.sin(angleRad) * 142;
                  const minX = Math.cos(angleRad) * 92;
                  const minY = Math.sin(angleRad) * 92;
                  const sigX = Math.cos(angleRad) * 52;
                  const sigY = Math.sin(angleRad) * 52;

                  const isMajorActive =
                    rootPitchClass === slice.majorRoot &&
                    !scaleId.includes('minor');
                  const isMinorActive =
                    rootPitchClass === slice.minorRoot &&
                    scaleId.includes('minor');

                  return (
                    <g key={slice.position}>
                      {/* Spoke line */}
                      <line
                        x1="0"
                        y1="0"
                        x2={Math.cos(angleRad) * 172}
                        y2={Math.sin(angleRad) * 172}
                        stroke="rgba(148, 163, 184, 0.14)"
                        strokeWidth="1"
                      />

                      {/* Outer Major Node */}
                      <g
                        onClick={() => {
                          onChangeRoot(slice.majorRoot);
                          onChangeScale('major');
                          const midis = buildChordMidiNotes(
                            slice.majorRoot,
                            'maj',
                            4,
                            0
                          );
                          soundEngine.triggerChord(
                            midis,
                            0.65,
                            0.82,
                            synthParams,
                            0.03
                          );
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <circle
                          cx={majX}
                          cy={majY}
                          r="24"
                          fill={
                            isMajorActive
                              ? '#06b6d4'
                              : 'rgba(30, 41, 59, 0.92)'
                          }
                          stroke={isMajorActive ? '#f8fafc' : '#334155'}
                          strokeWidth="2"
                        />
                        <text
                          x={majX}
                          y={majY + 4}
                          textAnchor="middle"
                          fontSize="12"
                          fontWeight="700"
                          fill={isMajorActive ? '#0f172a' : '#f8fafc'}
                        >
                          {slice.majorLabel}
                        </text>
                      </g>

                      {/* Middle Relative Minor Node */}
                      <g
                        onClick={() => {
                          onChangeRoot(slice.minorRoot);
                          onChangeScale('natural_minor');
                          const midis = buildChordMidiNotes(
                            slice.minorRoot,
                            'min',
                            4,
                            0
                          );
                          soundEngine.triggerChord(
                            midis,
                            0.65,
                            0.82,
                            synthParams,
                            0.03
                          );
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <circle
                          cx={minX}
                          cy={minY}
                          r="18"
                          fill={
                            isMinorActive
                              ? '#8b5cf6'
                              : 'rgba(15, 23, 42, 0.95)'
                          }
                          stroke={isMinorActive ? '#f8fafc' : '#475569'}
                          strokeWidth="1.5"
                        />
                        <text
                          x={minX}
                          y={minY + 3.5}
                          textAnchor="middle"
                          fontSize="10"
                          fontWeight="600"
                          fill="#e2e8f0"
                        >
                          {slice.minorLabel}
                        </text>
                      </g>

                      {/* Inner Key Signature count */}
                      <text
                        x={sigX}
                        y={sigY + 3}
                        textAnchor="middle"
                        fontSize="9"
                        fill="#94a3b8"
                      >
                        {slice.sharps === 0 && slice.flats === 0
                          ? '0'
                          : slice.sharps === 6 && slice.flats === 6
                          ? '6♯/6♭'
                          : slice.sharps > 0
                          ? `${slice.sharps}♯`
                          : `${slice.flats}♭`}
                      </text>
                    </g>
                  );
                })}
                <circle
                  cx="0"
                  cy="0"
                  r="32"
                  fill="#0f172a"
                  stroke="#334155"
                />
                <text
                  x="0"
                  y="4"
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="700"
                  fill="#06b6d4"
                >
                  5THS
                </text>
              </svg>
            </div>
          </div>

          <div className="theory-card">
            <div className="theory-card-header">
              <div>
                <h3>Harmonic Relationships & Neighbors</h3>
                <p className="theory-subtitle">
                  Closely related keys for modulation, borrowing chords, and
                  songwriting
                </p>
              </div>
            </div>

            <div className="harmonic-neighbors-grid">
              <div className="neighbor-box">
                <span>Tonic (Home Key · I)</span>
                <strong>{keySigInfo.majorLabel} Major</strong>
                <small>Relative Minor: {keySigInfo.minorLabel}</small>
              </div>
              <div className="neighbor-box">
                <span>Subdominant (Counter-Clockwise · IV)</span>
                <strong>
                  {getPitchClassName(
                    rootPitchClass + 5,
                    enharmonic,
                    rootPitchClass,
                    scaleId
                  )}
                </strong>
                <small>Perfect 4th above (+5 semitones)</small>
              </div>
              <div className="neighbor-box">
                <span>Dominant (Clockwise · V)</span>
                <strong>
                  {getPitchClassName(
                    rootPitchClass + 7,
                    enharmonic,
                    rootPitchClass,
                    scaleId
                  )}
                </strong>
                <small>Perfect 5th above (+7 semitones)</small>
              </div>
              <div className="neighbor-box">
                <span>Leading-Tone Diminished (vii°)</span>
                <strong>{keySigInfo.diminishedLabel}</strong>
                <small>Resolves strongly to Tonic</small>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4.5: INTERACTIVE GUITAR / BASS / UKULELE FRETBOARD */}
      {subTab === 'fretboard' && (
        <div className="theory-card">
          <div className="theory-card-header">
            <div>
              <h3>
                Interactive Guitar, Bass & Ukulele Fretboard (
                {getPitchClassName(
                  rootPitchClass,
                  enharmonic,
                  rootPitchClass,
                  scaleId
                )}{' '}
                {scaleDef.name})
              </h3>
              <p className="theory-subtitle">
                Click any fret position to play the note · Cyan badges mark the
                Root note, Violet badges mark scale tones
              </p>
            </div>
            <div className="btn-group">
              {(
                [
                  { id: 'guitar_std', label: '6-String Guitar (E A D G B E)' },
                  { id: 'guitar_dropd', label: 'Drop D Guitar (D A D G B E)' },
                  { id: 'bass_4', label: '4-String Bass (E A D G)' },
                  { id: 'ukulele', label: 'Ukulele (G C E A)' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`chip-btn ${
                    fretboardTuning === t.id ? 'active-chip' : ''
                  }`}
                  onClick={() => setFretboardTuning(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="fretboard-scroll-wrap">
            <div className="fretboard-board">
              {/* Fret Number Header */}
              <div className="fretboard-string-row fret-numbers-row">
                <div className="fret-open-label">OPEN</div>
                {Array.from({ length: 15 }, (_, fIdx) => {
                  const fret = fIdx + 1;
                  const isMarker = [3, 5, 7, 9, 12, 15].includes(fret);
                  return (
                    <div
                      key={fret}
                      className={`fret-cell-header ${
                        isMarker ? 'fret-marker-col' : ''
                      }`}
                    >
                      {fret}
                      {fret === 12 ? ' ••' : isMarker ? ' •' : ''}
                    </div>
                  );
                })}
              </div>

              {(fretboardTuning === 'guitar_std'
                ? [64, 59, 55, 50, 45, 40]
                : fretboardTuning === 'guitar_dropd'
                ? [64, 59, 55, 50, 45, 38]
                : fretboardTuning === 'bass_4'
                ? [43, 38, 33, 28]
                : [69, 64, 60, 67]
              ).map((openMidi, sIdx) => (
                <div
                  key={`${openMidi}-${sIdx}`}
                  className="fretboard-string-row"
                >
                  {/* Open String (Fret 0) */}
                  {Array.from({ length: 16 }, (_, fret) => {
                    const midi = openMidi + fret;
                    const pc = normalizePitchClass(midi);
                    const isRoot = pc === normalizePitchClass(rootPitchClass);
                    const inScale = scaleDef.intervals.includes(
                      normalizePitchClass(pc - rootPitchClass)
                    );
                    const label = midiToNoteName(
                      midi,
                      enharmonic,
                      rootPitchClass,
                      scaleId
                    );
                    return (
                      <button
                        key={fret}
                        type="button"
                        className={[
                          'fret-cell',
                          fret === 0 ? 'fret-zero-nut' : '',
                          isRoot
                            ? 'fret-root'
                            : inScale
                            ? 'fret-in-scale'
                            : 'fret-out-scale',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() =>
                          soundEngine.triggerNote(
                            midi,
                            0.55,
                            0.85,
                            synthParams
                          )
                        }
                        title={`${label} (Fret ${fret})`}
                      >
                        <span className="fret-string-wire" />
                        <span className="fret-note-dot">{label}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: INTERVAL IDENTIFICATION & NOTE FREQUENCY REFERENCE */}
      {subTab === 'intervals' && (
        <div className="theory-grid-two">
          {/* Left: Interactive Interval Calculator */}
          <div className="theory-card">
            <div className="theory-card-header">
              <div>
                <h3>Interval Identification & Acoustic Ratio</h3>
                <p className="theory-subtitle">
                  Select any two notes to inspect interval quality, semitones,
                  and harmonic ratio
                </p>
              </div>
              <div className="btn-group">
                <button
                  type="button"
                  className="chip-btn active-chip"
                  onClick={() =>
                    soundEngine.triggerChord(
                      [intervalResult.midiLow, intervalResult.midiHigh],
                      0.7,
                      0.85,
                      synthParams,
                      0.38
                    )
                  }
                >
                  <Play size={13} />
                  <span>Melodic</span>
                </button>
                <button
                  type="button"
                  className="chip-btn"
                  onClick={() =>
                    soundEngine.triggerChord(
                      [intervalResult.midiLow, intervalResult.midiHigh],
                      0.9,
                      0.85,
                      synthParams,
                      0
                    )
                  }
                >
                  <Disc size={13} />
                  <span>Harmonic</span>
                </button>
              </div>
            </div>

            <div className="interval-selectors-row">
              <div className="control-item">
                <label className="strip-label">Note A (Lower / First)</label>
                <select
                  className="studio-select"
                  value={intervalMidiA}
                  onChange={(e) =>
                    setIntervalMidiA(parseInt(e.target.value, 10))
                  }
                >
                  {Array.from({ length: 37 }, (_, i) => 48 + i).map((m) => (
                    <option key={m} value={m}>
                      {midiToNoteName(m, enharmonic, rootPitchClass, scaleId)} (
                      MIDI {m})
                    </option>
                  ))}
                </select>
              </div>

              <div className="control-item">
                <label className="strip-label">Note B (Upper / Second)</label>
                <select
                  className="studio-select"
                  value={intervalMidiB}
                  onChange={(e) =>
                    setIntervalMidiB(parseInt(e.target.value, 10))
                  }
                >
                  {Array.from({ length: 37 }, (_, i) => 48 + i).map((m) => (
                    <option key={m} value={m}>
                      {midiToNoteName(m, enharmonic, rootPitchClass, scaleId)} (
                      MIDI {m})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="chord-result-banner">
              <div className="chord-symbol-large">
                {intervalResult.info.shortName}
              </div>
              <div className="chord-result-details">
                <div>
                  <strong>{intervalResult.info.name}</strong> ·{' '}
                  {intervalResult.totalSemitones} Semitones
                </div>
                <p>
                  {intervalResult.noteLow} (
                  {intervalResult.freqLow.toFixed(2)} Hz) →{' '}
                  {intervalResult.noteHigh} (
                  {intervalResult.freqHigh.toFixed(2)} Hz)
                </p>
                <div className="chord-notes-pills">
                  <span className="kb-note-badge">
                    Consonance: <strong>{intervalResult.info.consonance}</strong>
                  </span>
                  <span className="kb-note-badge">
                    Just Ratio: <strong>{intervalResult.info.justRatio}</strong>
                  </span>
                  <span className="kb-note-badge">
                    Song Guide:{' '}
                    <strong>{intervalResult.info.songReference}</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Complete Note Frequency Reference & Tuning Standard */}
          <div className="theory-card">
            <div className="theory-card-header">
              <div>
                <h3>Note Frequency & Acoustic Wavelength Reference</h3>
                <p className="theory-subtitle">
                  Equal Temperament tuning reference ($f = A4 \times 2^
                  {'{(n-69)/12}'}$)
                </p>
              </div>

              <div className="control-item">
                <span className="strip-label">A4 Tuning: {referenceA4} Hz</span>
                <div className="btn-group">
                  {[432, 440, 442].map((hz) => (
                    <button
                      key={hz}
                      type="button"
                      className={`kb-mini-btn ${
                        referenceA4 === hz ? 'active' : ''
                      }`}
                      onClick={() => onChangeReferenceA4(hz)}
                    >
                      {hz}Hz
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="freq-filter-bar">
              <span className="strip-label">
                <Search size={12} /> Octave Filter:
              </span>
              {(['all', 2, 3, 4, 5, 6] as const).map((oct) => (
                <button
                  key={oct}
                  type="button"
                  className={`kb-mini-btn ${
                    freqFilterOctave === oct ? 'active' : ''
                  }`}
                  onClick={() => setFreqFilterOctave(oct)}
                >
                  {oct === 'all' ? 'All' : `Oct ${oct}`}
                </button>
              ))}
            </div>

            <div className="freq-table-scroll">
              <table className="studio-table">
                <thead>
                  <tr>
                    <th>Note (♯ / ♭)</th>
                    <th>MIDI #</th>
                    <th>Frequency (Hz)</th>
                    <th>Wavelength</th>
                    <th>Audition</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 61 }, (_, i) => 36 + i)
                    .filter((m) =>
                      freqFilterOctave === 'all'
                        ? true
                        : Math.floor(m / 12) - 1 === freqFilterOctave
                    )
                    .map((midi) => {
                      const sharp = midiToNoteName(midi, 'sharps');
                      const flat = midiToNoteName(midi, 'flats');
                      const freq = midiToFrequency(midi, referenceA4);
                      const waveCm = frequencyToWavelengthCm(freq);
                      return (
                        <tr key={midi}>
                          <td>
                            <strong>
                              {sharp === flat ? sharp : `${sharp} / ${flat}`}
                            </strong>
                          </td>
                          <td>{midi}</td>
                          <td>{freq.toFixed(2)} Hz</td>
                          <td>{waveCm.toFixed(1)} cm</td>
                          <td>
                            <button
                              type="button"
                              className="kb-mini-btn"
                              onClick={() =>
                                soundEngine.triggerNote(
                                  midi,
                                  0.45,
                                  0.82,
                                  synthParams
                                )
                              }
                            >
                              Play
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
