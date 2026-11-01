import React, { useCallback, useEffect, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Headphones,
  HelpCircle,
  Play,
  RefreshCw,
  Sparkles,
  Volume2,
  XCircle,
} from 'lucide-react';
import { EnharmonicPreference, ScaleId, SynthParams } from '../types/music';
import {
  CHORD_DEFINITIONS,
  CIRCLE_OF_FIFTHS,
  INTERVALS,
  SCALES,
} from '../theory/constants';
import {
  buildChordMidiNotes,
  getPitchClassName,
  midiToNoteName,
  normalizePitchClass,
} from '../theory/engine';
import { soundEngine } from '../audio/soundEngine';

type DrillCategory = 'ear_interval' | 'ear_chord' | 'ear_scale' | 'theory_quiz';

interface DrillQuestion {
  prompt: string;
  subPrompt: string;
  options: { id: string; label: string; detail?: string }[];
  correctId: string;
  explanation: string;
  playAudio: () => void;
}

interface EarTrainingProps {
  synthParams: SynthParams;
  enharmonic: EnharmonicPreference;
  rootPitchClass: number;
  scaleId: ScaleId;
}

export const EarTraining: React.FC<EarTrainingProps> = ({
  synthParams,
  enharmonic,
}) => {
  const [category, setCategory] = useState<DrillCategory>('ear_interval');
  const [question, setQuestion] = useState<DrillQuestion | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [streak, setStreak] = useState(0);

  const generateQuestion = useCallback(
    (cat: DrillCategory): DrillQuestion => {
      const baseMidi = 58 + Math.floor(Math.random() * 8); // Bb3 to F4

      if (cat === 'ear_interval') {
        const pool = INTERVALS.filter((i) => i.semitones >= 1 && i.semitones <= 12);
        const target = pool[Math.floor(Math.random() * pool.length)];
        const highMidi = baseMidi + target.semitones;
        const n1 = midiToNoteName(baseMidi, enharmonic);
        const n2 = midiToNoteName(highMidi, enharmonic);

        return {
          prompt: 'Listen and identify the musical interval:',
          subPrompt: `Root note is ${n1}. Hear how the second note relates to it.`,
          options: pool.map((item) => ({
            id: item.shortName,
            label: `${item.name} (${item.shortName})`,
            detail: `${item.semitones} semitones · ${item.songReference}`,
          })),
          correctId: target.shortName,
          explanation: `${n1} → ${n2} is a ${target.name} (${target.semitones} semitones, ${target.consonance}). Song cue: ${target.songReference}.`,
          playAudio: () => {
            soundEngine.triggerChord(
              [baseMidi, highMidi],
              0.65,
              0.85,
              synthParams,
              0.42
            );
          },
        };
      }

      if (cat === 'ear_chord') {
        const chordIds = [
          'maj',
          'min',
          'dim',
          'aug',
          'sus4',
          'maj7',
          'min7',
          'dom7',
        ];
        const pool = CHORD_DEFINITIONS.filter((c) => chordIds.includes(c.id));
        const target = pool[Math.floor(Math.random() * pool.length)];
        const rootPc = normalizePitchClass(baseMidi);
        const rootName = getPitchClassName(rootPc, enharmonic);
        const midis = buildChordMidiNotes(rootPc, target.id, 4, 0, false);

        return {
          prompt: 'Listen and identify the chord quality:',
          subPrompt: `Played on root ${rootName} (arpeggiated then harmonic).`,
          options: pool.map((c) => ({
            id: c.id,
            label: c.name,
            detail: `Formula: ${c.formula.join(' – ')}`,
          })),
          correctId: target.id,
          explanation: `That chord was ${rootName}${target.symbol} (${target.name}), built with intervals ${target.formula.join(' – ')}.`,
          playAudio: () => {
            soundEngine.triggerChord(midis, 0.85, 0.82, synthParams, 0.14);
          },
        };
      }

      if (cat === 'ear_scale') {
        const scalePool: ScaleId[] = [
          'major',
          'natural_minor',
          'harmonic_minor',
          'major_pentatonic',
          'minor_pentatonic',
          'dorian',
          'phrygian',
          'lydian',
          'mixolydian',
          'blues',
        ];
        const targetId =
          scalePool[Math.floor(Math.random() * scalePool.length)];
        const targetScale = SCALES[targetId];
        const rootPc = normalizePitchClass(baseMidi);
        const rootName = getPitchClassName(rootPc, enharmonic);
        const midis = [
          ...targetScale.intervals.map((s) => 60 + rootPc + s),
          60 + rootPc + 12,
        ];

        return {
          prompt: 'Listen to the ascending scale and identify its mode/type:',
          subPrompt: `Tonic is ${rootName}. Listen closely to the 3rd, 4th, 6th, and 7th degrees.`,
          options: scalePool.map((sid) => ({
            id: sid,
            label: SCALES[sid].name,
            detail: SCALES[sid].mood,
          })),
          correctId: targetId,
          explanation: `${rootName} ${targetScale.name} has formula [${targetScale.formula.join(', ')}] — ${targetScale.mood}.`,
          playAudio: () => {
            soundEngine.triggerChord(midis, 0.28, 0.82, synthParams, 0.2);
          },
        };
      }

      // Music Theory Practice Mode (Key Signatures, Scale Degrees & Diatonic Harmony)
      const quizType = Math.floor(Math.random() * 3);
      if (quizType === 0) {
        const slice =
          CIRCLE_OF_FIFTHS[Math.floor(Math.random() * CIRCLE_OF_FIFTHS.length)];
        const distractions = CIRCLE_OF_FIFTHS.filter(
          (s) => s.minorLabel !== slice.minorLabel
        )
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);
        const opts = [slice, ...distractions].sort(() => Math.random() - 0.5);

        return {
          prompt: `What is the Relative Minor of ${slice.majorLabel} Major?`,
          subPrompt:
            'The relative minor shares the exact same key signature and starts on the 6th scale degree.',
          options: opts.map((o) => ({
            id: o.minorLabel,
            label: o.minorLabel,
            detail: `${
              o.sharps > 0
                ? `${o.sharps}♯`
                : o.flats > 0
                ? `${o.flats}♭`
                : '0♯/♭'
            }`,
          })),
          correctId: slice.minorLabel,
          explanation: `${slice.minorLabel} is the 6th degree (submediant) of ${slice.majorLabel} Major and shares its key signature.`,
          playAudio: () => {
            const midis = buildChordMidiNotes(slice.minorRoot, 'min', 4, 0);
            soundEngine.triggerChord(midis, 0.75, 0.82, synthParams, 0.05);
          },
        };
      } else if (quizType === 1) {
        const rootPc = Math.floor(Math.random() * 12);
        const rootName = getPitchClassName(rootPc, enharmonic);
        const degIdx = 1 + Math.floor(Math.random() * 6); // 2nd to 7th degree
        const semi = SCALES.major.intervals[degIdx];
        const correctPc = normalizePitchClass(rootPc + semi);
        const correctName = getPitchClassName(correctPc, enharmonic, rootPc, 'major');

        const wrongPcs = [1, 2, 4, 5, 7, 9, 10]
          .map((offset) => normalizePitchClass(correctPc + offset))
          .filter((pc) => pc !== correctPc)
          .slice(0, 3);
        const allPcs = [correctPc, ...wrongPcs].sort(() => Math.random() - 0.5);

        return {
          prompt: `Which note is degree ${degIdx + 1} in the ${rootName} Major scale?`,
          subPrompt: `Count using the Major step formula: W–W–H–W–W–W–H (${semi} semitones above ${rootName}).`,
          options: allPcs.map((pc) => {
            const label = getPitchClassName(pc, enharmonic, rootPc, 'major');
            return {
              id: label,
              label,
            };
          }),
          correctId: correctName,
          explanation: `In ${rootName} Major, degree ${degIdx + 1} (${semi} semitones above ${rootName}) is ${correctName}.`,
          playAudio: () => {
            soundEngine.triggerChord(
              [60 + rootPc, 60 + rootPc + semi],
              0.6,
              0.82,
              synthParams,
              0.3
            );
          },
        };
      } else {
        const slice =
          CIRCLE_OF_FIFTHS[Math.floor(Math.random() * CIRCLE_OF_FIFTHS.length)];
        const sigText =
          slice.sharps === 0 && slice.flats === 0
            ? '0 Sharps / 0 Flats'
            : slice.sharps > 0
            ? `${slice.sharps} Sharp${slice.sharps > 1 ? 's' : ''} (${slice.accidentalNotes.join(', ')})`
            : `${slice.flats} Flat${slice.flats > 1 ? 's' : ''} (${slice.accidentalNotes.join(', ')})`;

        const others = CIRCLE_OF_FIFTHS.filter(
          (s) => s.majorLabel !== slice.majorLabel
        )
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);
        const opts = [slice, ...others].sort(() => Math.random() - 0.5);

        return {
          prompt: `Which Major key has the signature: ${sigText}?`,
          subPrompt: 'Use the Circle of Fifths to determine the tonic key.',
          options: opts.map((o) => ({
            id: o.majorLabel,
            label: `${o.majorLabel} Major`,
            detail: `Relative minor: ${o.minorLabel}`,
          })),
          correctId: slice.majorLabel,
          explanation: `${slice.majorLabel} Major (and ${slice.minorLabel}) has ${sigText}.`,
          playAudio: () => {
            const midis = buildChordMidiNotes(slice.majorRoot, 'maj', 4, 0);
            soundEngine.triggerChord(midis, 0.75, 0.82, synthParams, 0.05);
          },
        };
      }
    },
    [enharmonic, synthParams]
  );

  const startNewQuestion = useCallback(
    (cat: DrillCategory, autoPlay = false) => {
      const q = generateQuestion(cat);
      setQuestion(q);
      setSelectedOption(null);
      if (autoPlay) {
        q.playAudio();
      }
    },
    [generateQuestion]
  );

  useEffect(() => {
    startNewQuestion(category, false);
  }, [category, startNewQuestion]);

  const handleSelectAnswer = (optionId: string) => {
    if (!question || selectedOption !== null) return;
    setSelectedOption(optionId);
    setAttempts((a) => a + 1);
    if (optionId === question.correctId) {
      setScore((s) => s + 1);
      setStreak((st) => st + 1);
    } else {
      setStreak(0);
    }
    question.playAudio();
  };

  const accuracy =
    attempts > 0 ? Math.round((score / attempts) * 100) : 100;

  return (
    <div className="ear-training-container">
      {/* Top Mode Selector & Live Scoreboard */}
      <div className="ear-header-bar">
        <div className="theory-subnav">
          <button
            type="button"
            className={`theory-subtab ${
              category === 'ear_interval' ? 'active' : ''
            }`}
            onClick={() => setCategory('ear_interval')}
          >
            <Headphones size={14} />
            <span>Interval Ear Trainer</span>
          </button>
          <button
            type="button"
            className={`theory-subtab ${
              category === 'ear_chord' ? 'active' : ''
            }`}
            onClick={() => setCategory('ear_chord')}
          >
            <Volume2 size={14} />
            <span>Chord Ear Trainer</span>
          </button>
          <button
            type="button"
            className={`theory-subtab ${
              category === 'ear_scale' ? 'active' : ''
            }`}
            onClick={() => setCategory('ear_scale')}
          >
            <Sparkles size={14} />
            <span>Scale & Mode Ear Trainer</span>
          </button>
          <button
            type="button"
            className={`theory-subtab ${
              category === 'theory_quiz' ? 'active' : ''
            }`}
            onClick={() => setCategory('theory_quiz')}
          >
            <HelpCircle size={14} />
            <span>Music Theory Practice Quiz</span>
          </button>
        </div>

        <div className="score-badges-row">
          <div className="score-pill">
            <Award size={14} />
            <span>
              Score: <strong>{score}</strong> / {attempts}
            </span>
          </div>
          <div className="score-pill">
            <span>
              Accuracy: <strong>{accuracy}%</strong>
            </span>
          </div>
          <div className="score-pill streak-pill">
            <span>
              Streak: <strong>{streak}🔥</strong>
            </span>
          </div>
        </div>
      </div>

      {question && (
        <div className="ear-Stage-card">
          <div className="ear-prompt-header">
            <div>
              <h2>{question.prompt}</h2>
              <p>{question.subPrompt}</p>
            </div>

            <div className="ear-action-buttons">
              <button
                type="button"
                className="transport-btn play-btn"
                onClick={() => question.playAudio()}
              >
                <Play size={16} fill="currentColor" />
                <span>Play Audio Prompt</span>
              </button>

              <button
                type="button"
                className="chip-btn"
                onClick={() => startNewQuestion(category, true)}
              >
                <RefreshCw size={14} />
                <span>Next Challenge</span>
              </button>
            </div>
          </div>

          <div className="ear-options-grid">
            {question.options.map((opt) => {
              const isChosen = selectedOption === opt.id;
              const isCorrect = opt.id === question.correctId;
              let statusClass = '';
              if (selectedOption !== null) {
                if (isCorrect) statusClass = 'option-correct';
                else if (isChosen) statusClass = 'option-wrong';
              }

              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`ear-option-btn ${statusClass}`}
                  onClick={() => handleSelectAnswer(opt.id)}
                >
                  <div className="ear-opt-main">
                    <strong>{opt.label}</strong>
                    {opt.detail && <small>{opt.detail}</small>}
                  </div>
                  {selectedOption !== null && isCorrect && (
                    <CheckCircle2 size={18} className="correct-icon" />
                  )}
                  {selectedOption !== null && isChosen && !isCorrect && (
                    <XCircle size={18} className="wrong-icon" />
                  )}
                </button>
              );
            })}
          </div>

          {selectedOption !== null && (
            <div
              className={`ear-feedback-banner ${
                selectedOption === question.correctId
                  ? 'feedback-correct'
                  : 'feedback-wrong'
              }`}
            >
              <div>
                <strong>
                  {selectedOption === question.correctId
                    ? 'Correct!'
                    : 'Not quite —'}
                </strong>{' '}
                {question.explanation}
              </div>
              <button
                type="button"
                className="chip-btn active-chip"
                onClick={() => startNewQuestion(category, true)}
              >
                Next Question →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
