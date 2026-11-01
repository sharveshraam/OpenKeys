import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  Eraser,
  FolderOpen,
  Image as ImageIcon,
  Music,
  Palette,
  Play,
  RotateCcw,
  Save,
  Sparkles,
  Square,
  Trash2,
  Undo2,
  Volume2,
} from 'lucide-react';
import {
  PresetId,
  ProjectData,
  QuantizeDivision,
  ScaleId,
  SwingPreset,
} from '../types/music';
import {
  CHROMATIC_KEYS,
  QUANTIZE_OPTIONS,
  SCALES,
  SWING_OPTIONS,
} from '../theory/constants';
import {
  applySwingOffset,
  getPitchClassName,
  getQuantizeStepBeats,
  midiToNoteName,
  normalizePitchClass,
} from '../theory/engine';
import { cloneSynthParams } from '../audio/presets';
import { soundEngine } from '../audio/soundEngine';
import { triggerDrumLive } from '../audio/drumEngine';
import { downloadMidiFile } from '../midi/midiExport';
import { downloadWavFile } from '../export/wavExport';
import { webMidiManager } from '../midi/webMidi';
import { QWERTY_KEY_OFFSETS } from './VirtualKeyboard';

export interface DrawnPoint {
  xNorm: number; // 0..1 across loop duration
  yNorm: number; // 0..1 top (high pitch) to bottom (low pitch)
}

export interface DrawnStroke {
  id: string;
  voiceIndex: 1 | 2 | 3 | 4; // 1=Bell/Marimba, 2=Warm Keys, 3=Pluck/Pad, 4=Percussion Brush
  color: string;
  lineWidth: number;
  points: DrawnPoint[];
}

interface VisualPresetArt {
  id: string;
  title: string;
  subtitle: string;
  rootPc: number;
  scaleId: ScaleId;
  bpm: number;
  bgGradient: string;
  strokes: DrawnStroke[];
}

const INK_COLORS = [
  '#111827',
  '#06b6d4',
  '#8b5cf6',
  '#f43f5e',
  '#10b981',
  '#f59e0b',
];

const PAPER_STYLES: {
  id: string;
  name: string;
  bg: string;
  line: string;
  text: string;
  isDark: boolean;
}[] = [
  {
    id: 'warm_paper',
    name: 'Warm Sketch Paper',
    bg: '#f8f5ec',
    line: 'rgba(30, 41, 59, 0.11)',
    text: '#334155',
    isDark: false,
  },
  {
    id: 'pure_white',
    name: 'Gallery White',
    bg: '#ffffff',
    line: 'rgba(15, 23, 42, 0.09)',
    text: '#1e293b',
    isDark: false,
  },
  {
    id: 'sakura',
    name: 'Rose Parchment',
    bg: '#fdf2f8',
    line: 'rgba(131, 24, 67, 0.1)',
    text: '#831843',
    isDark: false,
  },
  {
    id: 'blueprint',
    name: 'Studio Blueprint',
    bg: '#0f172a',
    line: 'rgba(56, 189, 248, 0.16)',
    text: '#94a3b8',
    isDark: true,
  },
  {
    id: 'midnight',
    name: 'Midnight Canvas',
    bg: '#070a12',
    line: 'rgba(148, 163, 184, 0.13)',
    text: '#94a3b8',
    isDark: true,
  },
];

const VOICE_PRESET_MAP: Record<1 | 2 | 3 | 4, { name: string; preset: PresetId }> = {
  1: { name: 'Voice 1 · Glass Marimba', preset: 'fm_bell' },
  2: { name: 'Voice 2 · Vintage Rhodes', preset: 'warm_epiano' },
  3: { name: 'Voice 3 · Harp & Synth', preset: 'crystal_pluck' },
  4: { name: 'Voice 4 · Rhythm Drums', preset: 'sub_bass' },
};

function generateWaveStroke(
  id: string,
  voiceIndex: 1 | 2 | 3 | 4,
  color: string,
  lineWidth: number,
  xStart: number,
  xEnd: number,
  yCenter: number,
  amp: number,
  cycles: number,
  steps = 42
): DrawnStroke {
  const points: DrawnPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const xNorm = xStart + t * (xEnd - xStart);
    const yNorm = Math.max(
      0.05,
      Math.min(0.95, yCenter + Math.sin(t * Math.PI * 2 * cycles) * amp)
    );
    points.push({ xNorm, yNorm });
  }
  return { id, voiceIndex, color, lineWidth, points };
}

export const VISUAL_GALLERY_PRESETS: VisualPresetArt[] = [
  {
    id: 'daydream',
    title: '1 · Daydream Waves',
    subtitle: 'Overlapping pentatonic sine contours',
    rootPc: 0,
    scaleId: 'major_pentatonic',
    bpm: 116,
    bgGradient: 'linear-gradient(135deg, #fde68a, #fca5a5)',
    strokes: [
      generateWaveStroke('dd-1', 1, '#06b6d4', 5, 0.04, 0.96, 0.35, 0.22, 2),
      generateWaveStroke('dd-2', 2, '#8b5cf6', 6, 0.08, 0.92, 0.65, -0.18, 1.5),
      generateWaveStroke('dd-3', 3, '#f43f5e', 4, 0.15, 0.85, 0.22, 0.1, 3),
    ],
  },
  {
    id: 'stepping_stones',
    title: '2 · Stepping Stones',
    subtitle: 'Playful staccato arches & droplets',
    rootPc: 7,
    scaleId: 'major_pentatonic',
    bpm: 122,
    bgGradient: 'linear-gradient(135deg, #a7f3d0, #38bdf8)',
    strokes: [
      generateWaveStroke('ss-1', 1, '#10b981', 7, 0.05, 0.22, 0.72, -0.14, 0.5, 14),
      generateWaveStroke('ss-2', 1, '#06b6d4', 7, 0.28, 0.46, 0.54, -0.14, 0.5, 14),
      generateWaveStroke('ss-3', 1, '#8b5cf6', 7, 0.52, 0.7, 0.36, -0.14, 0.5, 14),
      generateWaveStroke('ss-4', 2, '#f59e0b', 7, 0.74, 0.95, 0.24, 0.22, 1, 18),
    ],
  },
  {
    id: 'sunrise_canon',
    title: '3 · Sunrise Arpeggio',
    subtitle: 'Rising Lydian rays across 3 octaves',
    rootPc: 5,
    scaleId: 'lydian',
    bpm: 104,
    bgGradient: 'linear-gradient(135deg, #fbcfe8, #c084fc)',
    strokes: [
      {
        id: 'sc-1',
        voiceIndex: 1,
        color: '#f59e0b',
        lineWidth: 5,
        points: [
          { xNorm: 0.05, yNorm: 0.85 },
          { xNorm: 0.45, yNorm: 0.15 },
        ],
      },
      {
        id: 'sc-2',
        voiceIndex: 2,
        color: '#ec4899',
        lineWidth: 5,
        points: [
          { xNorm: 0.3, yNorm: 0.85 },
          { xNorm: 0.72, yNorm: 0.18 },
        ],
      },
      {
        id: 'sc-3',
        voiceIndex: 3,
        color: '#06b6d4',
        lineWidth: 5,
        points: [
          { xNorm: 0.55, yNorm: 0.82 },
          { xNorm: 0.95, yNorm: 0.12 },
        ],
      },
    ],
  },
  {
    id: 'dorian_rain',
    title: '4 · Raindrop Canopy',
    subtitle: 'Cascading Dorian droplets & bass line',
    rootPc: 2,
    scaleId: 'dorian',
    bpm: 112,
    bgGradient: 'linear-gradient(135deg, #93c5fd, #818cf8)',
    strokes: [
      generateWaveStroke('dr-1', 3, '#3b82f6', 4, 0.06, 0.94, 0.28, 0.16, 4),
      generateWaveStroke('dr-2', 2, '#8b5cf6', 8, 0.05, 0.95, 0.82, 0.05, 1),
    ],
  },
  {
    id: 'constellation',
    title: '5 · Starlight Spiral',
    subtitle: 'Harmonic minor twin-wave symmetry',
    rootPc: 9,
    scaleId: 'harmonic_minor',
    bpm: 118,
    bgGradient: 'linear-gradient(135deg, #c4b5fd, #f472b6)',
    strokes: [
      generateWaveStroke('cs-1', 1, '#8b5cf6', 5, 0.04, 0.96, 0.5, 0.35, 1.5),
      generateWaveStroke('cs-2', 2, '#06b6d4', 5, 0.04, 0.96, 0.5, -0.35, 1.5),
    ],
  },
  {
    id: 'mountain_echo',
    title: '6 · Mountain Peaks',
    subtitle: 'Zig-zag melodic peaks with rhythm pulse',
    rootPc: 4,
    scaleId: 'minor_pentatonic',
    bpm: 124,
    bgGradient: 'linear-gradient(135deg, #6ee7b7, #3b82f6)',
    strokes: [
      {
        id: 'me-1',
        voiceIndex: 1,
        color: '#111827',
        lineWidth: 6,
        points: [
          { xNorm: 0.04, yNorm: 0.82 },
          { xNorm: 0.26, yNorm: 0.22 },
          { xNorm: 0.48, yNorm: 0.74 },
          { xNorm: 0.72, yNorm: 0.14 },
          { xNorm: 0.96, yNorm: 0.78 },
        ],
      },
      generateWaveStroke('me-2', 4, '#ef4444', 5, 0.05, 0.95, 0.9, 0.02, 2, 16),
    ],
  },
  {
    id: 'blues_river',
    title: '7 · Blues Riverbend',
    subtitle: 'Expressive blue-note bends & groove',
    rootPc: 0,
    scaleId: 'blues',
    bpm: 100,
    bgGradient: 'linear-gradient(135deg, #fdba74, #f87171)',
    strokes: [
      generateWaveStroke('br-1', 2, '#f43f5e', 6, 0.05, 0.95, 0.45, 0.28, 2.5),
      generateWaveStroke('br-2', 1, '#06b6d4', 4, 0.12, 0.88, 0.68, -0.15, 2),
    ],
  },
  {
    id: 'rhythm_sketch',
    title: '8 · Visual Beat & Melody',
    subtitle: 'Melodic arcs with drawn drum brush',
    rootPc: 0,
    scaleId: 'major_pentatonic',
    bpm: 120,
    bgGradient: 'linear-gradient(135deg, #fcd34d, #34d399)',
    strokes: [
      generateWaveStroke('rs-1', 1, '#06b6d4', 5, 0.04, 0.96, 0.34, 0.2, 2),
      generateWaveStroke('rs-2', 4, '#ef4444', 6, 0.04, 0.96, 0.88, 0.08, 4, 16),
    ],
  },
];

interface VisualPaperInstrumentProps {
  onNavigateToStudioWithStrokes?: (project: ProjectData) => void;
}

export const VisualPaperInstrument: React.FC<VisualPaperInstrumentProps> = ({
  onNavigateToStudioWithStrokes,
}) => {
  // Musical state matching playmusictheory.net/play controls (all unlocked!)
  const [rootPitchClass, setRootPitchClass] = useState<number>(0); // C
  const [scaleId, setScaleId] = useState<ScaleId>('major_pentatonic');
  const [rangeOctaves, setRangeOctaves] = useState<1 | 2 | 3>(3);
  const [octaveShift, setOctaveShift] = useState<-1 | 0 | 1>(0);
  const [bpm, setBpm] = useState<number>(120);
  const [quantize, setQuantize] = useState<QuantizeDivision>('1/8T');
  const [swingPreset, setSwingPreset] = useState<SwingPreset>('off');
  const [clickEnabled, setClickEnabled] = useState<boolean>(false);
  const [midiInEnabled, setMidiInEnabled] = useState<boolean>(true);

  // Visual Paper & Brush state
  const [paperStyleId, setPaperStyleId] = useState<string>('warm_paper');
  const [showGridNames, setShowGridNames] = useState<boolean>(true);
  const [activeVoice, setActiveVoice] = useState<1 | 2 | 3 | 4>(1);
  const [activeColor, setActiveColor] = useState<string>('#06b6d4');
  const [brushSize, setBrushSize] = useState<number>(5);
  const [eraserMode, setEraserMode] = useState<boolean>(false);
  const [bgImageDataUrl, setBgImageDataUrl] = useState<string | null>(null);

  // Drawn strokes & undo history
  const [strokes, setStrokes] = useState<DrawnStroke[]>(() =>
    JSON.parse(JSON.stringify(VISUAL_GALLERY_PRESETS[0].strokes))
  );
  const [undoHistory, setUndoHistory] = useState<DrawnStroke[][]>([]);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playheadNorm, setPlayheadNorm] = useState<number>(0); // 0..1 across 16-beat loop
  const [activeRipples, setActiveRipples] = useState<
    { id: string; xNorm: number; yNorm: number; color: string; noteName: string }[]
  >([]);
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const [showGalleryModal, setShowGalleryModal] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const photoUploadRef = useRef<HTMLInputElement | null>(null);
  const projectOpenRef = useRef<HTMLInputElement | null>(null);
  const tapTimesRef = useRef<number[]>([]);

  // Active drawing ref
  const drawingStrokeRef = useRef<DrawnStroke | null>(null);
  const lastPreviewMidiRef = useRef<number | null>(null);

  const paperStyle =
    PAPER_STYLES.find((p) => p.id === paperStyleId) ?? PAPER_STYLES[0];

  // Build ordered list of scale MIDI notes from bottom (low) to top (high)
  // Default base octave is C3 (48) + octaveShift * 12
  const scalePitchRows = useMemo(() => {
    const scale = SCALES[scaleId] ?? SCALES.major_pentatonic;
    const baseOctave = 3 + octaveShift;
    const baseMidi = (baseOctave + 1) * 12 + normalizePitchClass(rootPitchClass);
    const list: { midi: number; label: string; isRoot: boolean }[] = [];

    for (let oct = 0; oct < rangeOctaves; oct++) {
      for (const semi of scale.intervals) {
        const m = baseMidi + oct * 12 + semi;
        if (m >= 24 && m <= 108) {
          list.push({
            midi: m,
            label: midiToNoteName(m, 'auto', rootPitchClass, scaleId),
            isRoot: semi === 0,
          });
        }
      }
    }
    // Include top root
    const topMidi = baseMidi + rangeOctaves * 12;
    if (topMidi <= 108) {
      list.push({
        midi: topMidi,
        label: midiToNoteName(topMidi, 'auto', rootPitchClass, scaleId),
        isRoot: true,
      });
    }
    // Reverse so index 0 is highest pitch (top of canvas) and last index is lowest pitch (bottom)
    return list.reverse();
  }, [rootPitchClass, scaleId, rangeOctaves, octaveShift]);

  const yNormToRow = useCallback(
    (yNorm: number) => {
      const clamped = Math.max(0, Math.min(0.999, yNorm));
      const idx = Math.floor(clamped * scalePitchRows.length);
      return scalePitchRows[idx] ?? scalePitchRows[0];
    },
    [scalePitchRows]
  );

  const triggerVoiceSound = useCallback(
    (voiceIndex: 1 | 2 | 3 | 4, yNorm: number, durationSec = 0.28) => {
      if (voiceIndex === 4) {
        // Drum brush: top = hi-hat, middle = snare/clap, bottom = kick
        if (yNorm < 0.33) {
          triggerDrumLive('hihat_closed', 0.8);
        } else if (yNorm < 0.66) {
          triggerDrumLive('snare', 0.85);
        } else {
          triggerDrumLive('kick', 0.92);
        }
        return;
      }
      const row = yNormToRow(yNorm);
      if (!row) return;
      const presetId = VOICE_PRESET_MAP[voiceIndex].preset;
      const params = cloneSynthParams(presetId);
      soundEngine.triggerNote(row.midi, durationSec, 0.82, params, 0.85, 0);
    },
    [yNormToRow]
  );

  // Keep refs for animation loop
  const strokesRef = useRef(strokes);
  strokesRef.current = strokes;
  const playheadRef = useRef(playheadNorm);
  playheadRef.current = playheadNorm;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  // MIDI In & Computer Keyboard live drawing into the visual loop!
  useEffect(() => {
    if (!midiInEnabled) return;

    const recordLivePitchIntoCanvas = (midi: number) => {
      // Find closest row in scalePitchRows
      let bestIdx = 0;
      let bestDist = 999;
      scalePitchRows.forEach((r, idx) => {
        const d = Math.abs(r.midi - midi);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = idx;
        }
      });
      const yNorm = (bestIdx + 0.5) / scalePitchRows.length;
      const xStart = isPlayingRef.current ? playheadRef.current : Math.random() * 0.85 + 0.05;
      const xEnd = Math.min(0.99, xStart + 0.045);

      const presetId = VOICE_PRESET_MAP[activeVoice].preset;
      soundEngine.triggerNote(
        scalePitchRows[bestIdx]?.midi ?? midi,
        0.35,
        0.85,
        cloneSynthParams(presetId)
      );

      const newStroke: DrawnStroke = {
        id: `midi-stroke-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        voiceIndex: activeVoice,
        color: activeColor,
        lineWidth: brushSize + 1,
        points: [
          { xNorm: xStart, yNorm },
          { xNorm: xEnd, yNorm },
        ],
      };
      setStrokes((prev) => [...prev, newStroke]);
    };

    const unsubMidi = webMidiManager.onMidiMessage((type, midi) => {
      if (type === 'noteon') {
        recordLivePitchIntoCanvas(midi);
      }
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'TEXTAREA')
      ) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
        return;
      }
      const lower = e.key.toLowerCase();
      if (lower in QWERTY_KEY_OFFSETS) {
        e.preventDefault();
        const midi = 60 + QWERTY_KEY_OFFSETS[lower];
        recordLivePitchIntoCanvas(midi);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      unsubMidi();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [midiInEnabled, scalePitchRows, activeVoice, activeColor, brushSize]);

  // Playback loop that sweeps playhead across the paper and triggers drawn strokes!
  useEffect(() => {
    if (!isPlaying) {
      setActiveRipples([]);
      return;
    }

    soundEngine.initContext();
    let lastTime = performance.now();
    const loopBeats = 16; // 4 bars of 4/4
    const stepBeats = getQuantizeStepBeats(quantize);
    const stepNorm = Math.max(0.01, stepBeats / loopBeats);
    const swingAmt =
      SWING_OPTIONS.find((s) => s.id === swingPreset)?.amount ?? 0;

    let lastStepTriggered = -1;
    let lastQuarterBeat = -1;
    let rafId = 0;

    const tick = (now: number) => {
      const dtSec = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      const beatsPerSec = bpm / 60;
      const loopDurationSec = loopBeats / beatsPerSec;
      let nextNorm = playheadRef.current + dtSec / loopDurationSec;

      if (nextNorm >= 1) {
        nextNorm = nextNorm % 1;
        lastStepTriggered = -1;
        lastQuarterBeat = -1;
      }

      playheadRef.current = nextNorm;
      setPlayheadNorm(nextNorm);

      // Metronome click
      const currentBeat = nextNorm * loopBeats;
      const wholeBeat = Math.floor(currentBeat);
      if (clickEnabled && wholeBeat !== lastQuarterBeat) {
        lastQuarterBeat = wholeBeat;
        soundEngine.triggerMetronomeClick(wholeBeat % 4 === 0, 0.45);
      }

      // Check quantization step crossings
      const swungBeat = applySwingOffset(currentBeat, swingAmt);
      const currentStepIdx = Math.floor((swungBeat / loopBeats) / stepNorm);

      if (currentStepIdx !== lastStepTriggered) {
        lastStepTriggered = currentStepIdx;
        const windowStart = currentStepIdx * stepNorm;
        const windowEnd = windowStart + stepNorm;

        const newRipples: {
          id: string;
          xNorm: number;
          yNorm: number;
          color: string;
          noteName: string;
        }[] = [];

        // Check every stroke to see if any point or segment crosses [windowStart, windowEnd]
        for (const stroke of strokesRef.current) {
          const pts = stroke.points;
          if (pts.length === 0) continue;

          let matchedYNorm: number | null = null;

          for (let i = 0; i < pts.length; i++) {
            const p = pts[i];
            if (p.xNorm >= windowStart && p.xNorm < windowEnd) {
              matchedYNorm = p.yNorm;
              break;
            }
            if (i > 0) {
              const prev = pts[i - 1];
              const minX = Math.min(prev.xNorm, p.xNorm);
              const maxX = Math.max(prev.xNorm, p.xNorm);
              if (minX <= windowStart && maxX >= windowStart && maxX > minX) {
                const ratio = (windowStart - prev.xNorm) / (p.xNorm - prev.xNorm);
                matchedYNorm = prev.yNorm + ratio * (p.yNorm - prev.yNorm);
                break;
              }
            }
          }

          if (matchedYNorm !== null) {
            const durSec = Math.max(0.12, stepBeats * (60 / bpm) * 1.15);
            triggerVoiceSound(stroke.voiceIndex, matchedYNorm, durSec);
            const row = yNormToRow(matchedYNorm);
            newRipples.push({
              id: `${stroke.id}-${currentStepIdx}`,
              xNorm: nextNorm,
              yNorm: matchedYNorm,
              color: stroke.color,
              noteName: stroke.voiceIndex === 4 ? 'BEAT' : row?.label ?? '',
            });
          }
        }

        if (newRipples.length > 0) {
          setActiveRipples(newRipples);
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [
    isPlaying,
    bpm,
    quantize,
    swingPreset,
    clickEnabled,
    triggerVoiceSound,
    yNormToRow,
  ]);

  // Render Paper Canvas (Grid + Strokes + Active Drawing + Playhead + Ripples)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // 1. Pitch Grid Rows & Note Labels ("Choose your key and scale; the grid names the notes")
    const numRows = scalePitchRows.length;
    const rowH = h / numRows;

    if (showGridNames) {
      ctx.font = '600 11px Inter, sans-serif';
      scalePitchRows.forEach((row, idx) => {
        const y = idx * rowH;
        if (row.isRoot) {
          ctx.fillStyle = paperStyle.isDark
            ? 'rgba(6, 182, 212, 0.08)'
            : 'rgba(6, 182, 212, 0.07)';
          ctx.fillRect(0, y, w, rowH);
        }
        ctx.strokeStyle = paperStyle.line;
        ctx.lineWidth = row.isRoot ? 1.4 : 0.8;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();

        ctx.fillStyle = row.isRoot ? '#06b6d4' : paperStyle.text;
        ctx.globalAlpha = row.isRoot ? 0.85 : 0.48;
        ctx.fillText(row.label, 10, y + rowH * 0.68);
        ctx.globalAlpha = 1;
      });

      // Vertical bar lines (4 bars)
      for (let b = 1; b < 4; b++) {
        const x = (b / 4) * w;
        ctx.strokeStyle = paperStyle.line;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
    }

    // 2. Render all committed strokes + currently active stroke
    const allStrokes = drawingStrokeRef.current
      ? [...strokes, drawingStrokeRef.current]
      : strokes;

    for (const stroke of allStrokes) {
      if (stroke.points.length === 0) continue;
      ctx.save();
      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
      ctx.lineWidth = stroke.lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.voiceIndex === 4) {
        ctx.setLineDash([6, 8]); // Dashed rhythm brush visual cue
      }

      if (stroke.points.length === 1) {
        const p = stroke.points[0];
        ctx.beginPath();
        ctx.arc(p.xNorm * w, p.yNorm * h, stroke.lineWidth, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        stroke.points.forEach((p, idx) => {
          const px = p.xNorm * w;
          const py = p.yNorm * h;
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
      }
      ctx.restore();
    }

    // 3. Playhead Line & Glowing Intersection Ripples
    if (isPlaying || playheadNorm > 0) {
      const px = playheadNorm * w;
      ctx.save();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, h);
      ctx.stroke();

      for (const ripple of activeRipples) {
        const rx = ripple.xNorm * w;
        const ry = ripple.yNorm * h;
        ctx.fillStyle = ripple.color;
        ctx.beginPath();
        ctx.arc(rx, ry, 9, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        if (ripple.noteName) {
          ctx.font = '700 11px monospace';
          ctx.fillStyle = paperStyle.isDark ? '#f8fafc' : '#0f172a';
          ctx.fillText(ripple.noteName, rx + 12, ry + 4);
        }
      }
      ctx.restore();
    }
  }, [
    strokes,
    scalePitchRows,
    showGridNames,
    paperStyle,
    isPlaying,
    playheadNorm,
    activeRipples,
  ]);

  // Pointer drawing handlers on the Paper Canvas
  const getNormalizedCoords = (
    e: React.PointerEvent<HTMLCanvasElement>
  ): DrawnPoint => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xNorm = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const yNorm = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    return { xNorm, yNorm };
  };

  const handleCanvasPointerDown = (
    e: React.PointerEvent<HTMLCanvasElement>
  ) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = getNormalizedCoords(e);

    if (eraserMode) {
      // Erase any stroke close to pt
      setUndoHistory((u) => [...u.slice(-19), strokes]);
      setStrokes((prev) =>
        prev.filter(
          (st) =>
            !st.points.some(
              (p) =>
                Math.hypot(p.xNorm - pt.xNorm, p.yNorm - pt.yNorm) < 0.045
            )
        )
      );
      return;
    }

    const row = yNormToRow(pt.yNorm);
    lastPreviewMidiRef.current = row?.midi ?? null;
    triggerVoiceSound(activeVoice, pt.yNorm, 0.25);

    const newStroke: DrawnStroke = {
      id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      voiceIndex: activeVoice,
      color: activeColor,
      lineWidth: brushSize,
      points: [pt],
    };
    drawingStrokeRef.current = newStroke;
    // Trigger re-render
    setActiveRipples([
      {
        id: 'live-draw',
        xNorm: pt.xNorm,
        yNorm: pt.yNorm,
        color: activeColor,
        noteName: activeVoice === 4 ? 'BEAT' : row?.label ?? '',
      },
    ]);
  };

  const handleCanvasPointerMove = (
    e: React.PointerEvent<HTMLCanvasElement>
  ) => {
    if (eraserMode && e.buttons === 1) {
      const pt = getNormalizedCoords(e);
      setStrokes((prev) =>
        prev.filter(
          (st) =>
            !st.points.some(
              (p) =>
                Math.hypot(p.xNorm - pt.xNorm, p.yNorm - pt.yNorm) < 0.045
            )
        )
      );
      return;
    }

    const active = drawingStrokeRef.current;
    if (!active) return;

    const pt = getNormalizedCoords(e);
    const lastPt = active.points[active.points.length - 1];
    if (
      lastPt &&
      Math.hypot(pt.xNorm - lastPt.xNorm, pt.yNorm - lastPt.yNorm) < 0.006
    ) {
      return;
    }

    active.points.push(pt);
    const row = yNormToRow(pt.yNorm);
    if (row && row.midi !== lastPreviewMidiRef.current) {
      lastPreviewMidiRef.current = row.midi;
      triggerVoiceSound(activeVoice, pt.yNorm, 0.22);
    }

    setActiveRipples([
      {
        id: 'live-draw',
        xNorm: pt.xNorm,
        yNorm: pt.yNorm,
        color: activeColor,
        noteName: activeVoice === 4 ? 'BEAT' : row?.label ?? '',
      },
    ]);
  };

  const handleCanvasPointerUp = () => {
    const finished = drawingStrokeRef.current;
    if (finished) {
      drawingStrokeRef.current = null;
      lastPreviewMidiRef.current = null;
      setUndoHistory((u) => [...u.slice(-19), strokes]);
      setStrokes((prev) => [...prev, finished]);
      if (!isPlaying) {
        setIsPlaying(true); // Automatically start loop playback like playmusictheory.net/play!
      }
    }
  };

  // Convert current drawn strokes into a multi-track ProjectData for WAV / MIDI export or opening in Studio!
  const convertStrokesToProjectData = useCallback((): ProjectData => {
    const loopBeats = 16;
    const stepBeats = getQuantizeStepBeats(
      quantize === 'off' ? '1/16' : quantize
    );
    const stepNorm = stepBeats / loopBeats;
    const totalSteps = Math.round(1 / stepNorm);

    const tracks = ([1, 2, 3] as const).map((vIdx) => {
      const info = VOICE_PRESET_MAP[vIdx];
      return {
        id: `visual-track-${vIdx}`,
        name: info.name,
        color: INK_COLORS[vIdx],
        instrument: info.preset,
        volume: 0.85,
        pan: vIdx === 1 ? -0.1 : vIdx === 2 ? 0.1 : 0,
        muted: false,
        solo: false,
        synthParams: cloneSynthParams(info.preset),
      };
    });

    const notes: ProjectData['notes'] = [];

    for (let s = 0; s < totalSteps; s++) {
      const winStart = s * stepNorm;
      const winEnd = winStart + stepNorm;

      for (const stroke of strokes) {
        if (stroke.voiceIndex === 4) continue; // Skip drum brush for melodic tracks
        let matchedYNorm: number | null = null;
        for (let i = 0; i < stroke.points.length; i++) {
          const p = stroke.points[i];
          if (p.xNorm >= winStart && p.xNorm < winEnd) {
            matchedYNorm = p.yNorm;
            break;
          }
          if (i > 0) {
            const prev = stroke.points[i - 1];
            const minX = Math.min(prev.xNorm, p.xNorm);
            const maxX = Math.max(prev.xNorm, p.xNorm);
            if (minX <= winStart && maxX >= winStart && maxX > minX) {
              const ratio = (winStart - prev.xNorm) / (p.xNorm - prev.xNorm);
              matchedYNorm = prev.yNorm + ratio * (p.yNorm - prev.yNorm);
              break;
            }
          }
        }
        if (matchedYNorm !== null) {
          const row = yNormToRow(matchedYNorm);
          if (row) {
            notes.push({
              id: `vis-n-${stroke.id}-${s}`,
              midi: row.midi,
              startBeat: s * stepBeats,
              durationBeats: stepBeats,
              velocity: Math.min(1, 0.65 + stroke.lineWidth * 0.04),
              trackId: `visual-track-${stroke.voiceIndex}`,
            });
          }
        }
      }
    }

    return {
      id: `visual-proj-${Date.now()}`,
      name: 'Visual Paper Loop',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      bpm,
      rootPitchClass,
      scaleId,
      enharmonic: 'auto',
      loopBeats,
      quantize,
      swingPreset,
      swingAmount:
        SWING_OPTIONS.find((sw) => sw.id === swingPreset)?.amount ?? 0,
      masterVolume: 0.85,
      tracks,
      notes,
    };
  }, [
    strokes,
    quantize,
    bpm,
    rootPitchClass,
    scaleId,
    swingPreset,
    yNormToRow,
  ]);

  const handleExportVisualWav = async () => {
    setStatusToast('Rendering your visual loop to WAV...');
    const proj = convertStrokesToProjectData();
    const res = await downloadWavFile(proj, 440);
    setStatusToast(
      `Exported "${res.filename}" (${(res.byteLength / 1024).toFixed(1)} KB)`
    );
  };

  const handleExportVisualMidi = () => {
    const proj = convertStrokesToProjectData();
    const res = downloadMidiFile(proj);
    setStatusToast(`Exported "${res.filename}" (${res.byteLength} bytes)`);
  };

  const handleExportPngArtwork = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'openkeys-visual-instrument.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setStatusToast('Saved PNG artwork image.');
  };

  const handleSaveVisualJson = () => {
    const payload = {
      rootPitchClass,
      scaleId,
      rangeOctaves,
      octaveShift,
      bpm,
      quantize,
      swingPreset,
      strokes,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'visual-loop.openkeys.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setStatusToast('Saved visual drawing file.');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setBgImageDataUrl(dataUrl);
      // Also generate a musical contour stroke inspired by the uploaded image!
      const generated = generateWaveStroke(
        `photo-${Date.now()}`,
        1,
        '#06b6d4',
        5,
        0.06,
        0.94,
        0.48,
        0.26,
        2.5
      );
      setStrokes((prev) => [...prev, generated]);
      setIsPlaying(true);
      setShowGalleryModal(false);
      setStatusToast(`Loaded photo "${file.name}" onto the musical canvas!`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleTapTempo = () => {
    const now = performance.now();
    const recent = tapTimesRef.current.filter((t) => now - t < 3000);
    recent.push(now);
    tapTimesRef.current = recent.slice(-6);
    if (recent.length >= 2) {
      let sum = 0;
      for (let i = 1; i < recent.length; i++) {
        sum += recent[i] - recent[i - 1];
      }
      const calc = Math.round(60000 / (sum / (recent.length - 1)));
      if (calc >= 40 && calc <= 240) setBpm(calc);
    }
  };

  return (
    <div
      className="visual-instrument-page"
      style={{
        backgroundColor: paperStyle.bg,
        color: paperStyle.text,
      }}
    >
      {/* Top Floating Bar: Key, Scale, Range, Octave, Quantize, Swing, Click, MIDI In, Export */}
      <div className="vi-top-controls-bar">
        {/* Key Selector */}
        <div className="vi-pill-cluster">
          <span className="vi-cluster-label">Key</span>
          <div className="vi-key-buttons">
            {CHROMATIC_KEYS.map((k) => {
              const label = getPitchClassName(
                k.pitchClass,
                'flats',
                rootPitchClass,
                scaleId
              );
              return (
                <button
                  key={k.pitchClass}
                  type="button"
                  className={`vi-key-btn ${
                    rootPitchClass === k.pitchClass ? 'active' : ''
                  }`}
                  onClick={() => setRootPitchClass(k.pitchClass)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scale Selector */}
        <div className="vi-pill-cluster">
          <span className="vi-cluster-label">Scale</span>
          <select
            className="vi-select"
            value={scaleId}
            onChange={(e) => setScaleId(e.target.value as ScaleId)}
            aria-label="Visual Instrument Scale"
          >
            <option value="major_pentatonic">Major pentatonic</option>
            <option value="minor_pentatonic">Minor pentatonic</option>
            <option value="major">Major</option>
            <option value="natural_minor">Minor</option>
            <option value="harmonic_minor">Harmonic minor</option>
            <option value="melodic_minor">Melodic minor</option>
            <option value="dorian">Dorian</option>
            <option value="phrygian">Phrygian</option>
            <option value="lydian">Lydian</option>
            <option value="mixolydian">Mixolydian</option>
            <option value="locrian">Locrian</option>
            <option value="blues">Blues</option>
            <option value="whole_tone">Whole tone</option>
            <option value="chromatic">Chromatic</option>
          </select>
        </div>

        {/* Range (1, 2, 3 octaves) & Octave (- 0 +) */}
        <div className="vi-pill-cluster">
          <span className="vi-cluster-label">Range</span>
          {([1, 2, 3] as const).map((r) => (
            <button
              key={r}
              type="button"
              className={`vi-mini-btn ${rangeOctaves === r ? 'active' : ''}`}
              onClick={() => setRangeOctaves(r)}
            >
              {r} oct
            </button>
          ))}

          <span className="vi-cluster-label">Octave</span>
          {([-1, 0, 1] as const).map((oct) => (
            <button
              key={oct}
              type="button"
              className={`vi-mini-btn ${octaveShift === oct ? 'active' : ''}`}
              onClick={() => setOctaveShift(oct)}
            >
              {oct === -1 ? '-' : oct === 1 ? '+' : '0'}
            </button>
          ))}
        </div>

        {/* Quantize & Swing */}
        <div className="vi-pill-cluster">
          <span className="vi-cluster-label">Quantize</span>
          <select
            className="vi-select"
            value={quantize}
            onChange={(e) => setQuantize(e.target.value as QuantizeDivision)}
            aria-label="Visual Quantize"
          >
            {QUANTIZE_OPTIONS.map((q) => (
              <option key={q.id} value={q.id}>
                {q.label}
              </option>
            ))}
          </select>

          <span className="vi-cluster-label">Swing</span>
          {(['off', 'light', 'medium', 'hard'] as const).map((sw) => (
            <button
              key={sw}
              type="button"
              className={`vi-mini-btn ${swingPreset === sw ? 'active' : ''}`}
              onClick={() => setSwingPreset(sw)}
            >
              {sw.charAt(0).toUpperCase() + sw.slice(1)}
            </button>
          ))}
        </div>

        {/* Tempo, Tap, Click, MIDI In */}
        <div className="vi-pill-cluster">
          <span className="vi-cluster-label">{bpm} BPM</span>
          <input
            type="range"
            min={50}
            max={200}
            value={bpm}
            onChange={(e) => setBpm(parseInt(e.target.value, 10))}
            className="compact-slider"
            style={{ width: '58px' }}
          />
          <button
            type="button"
            className="vi-mini-btn"
            onClick={handleTapTempo}
          >
            Tap
          </button>
          <button
            type="button"
            className={`vi-mini-btn ${clickEnabled ? 'active' : ''}`}
            onClick={() => setClickEnabled(!clickEnabled)}
          >
            Click {clickEnabled ? 'On' : 'Off'}
          </button>
          <button
            type="button"
            className={`vi-mini-btn ${midiInEnabled ? 'active' : ''}`}
            onClick={() => {
              webMidiManager.initialize();
              setMidiInEnabled(!midiInEnabled);
            }}
          >
            MIDI in {midiInEnabled ? 'On' : 'Off'}
          </button>
        </div>
      </div>

      {/* Main Drawing Paper Canvas Area */}
      <div className="vi-canvas-stage">
        {bgImageDataUrl && (
          <img
            src={bgImageDataUrl}
            alt="Custom Background"
            className="vi-bg-photo"
          />
        )}

        <canvas
          ref={canvasRef}
          width={1280}
          height={620}
          className="vi-drawing-canvas"
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
        />

        {strokes.length === 0 && (
          <div className="vi-empty-overlay">
            <Sparkles size={24} />
            <h3>Draw any line, curve, or shape — hear it become a musical loop</h3>
            <p>
              Horizontal position is time · Vertical position is pitch in{' '}
              <strong>
                {getPitchClassName(rootPitchClass, 'flats')}{' '}
                {SCALES[scaleId].name}
              </strong>
            </p>
          </div>
        )}

        {statusToast && (
          <div className="vi-toast-pill" onClick={() => setStatusToast(null)}>
            {statusToast}
          </div>
        )}
      </div>

      {/* Bottom Floating Palette: Play/Stop, Voices 1-2-3-4, Color Dots ••••••, Paper, 9-Square Gallery, Save/Open, WAV/MIDI Export */}
      <div className="vi-bottom-dock">
        {/* Left: Play / Stop / Undo / Erase / Clear */}
        <div className="vi-pill-cluster">
          <button
            type="button"
            className={`vi-play-fab ${isPlaying ? 'playing' : ''}`}
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? (
              <>
                <Square size={15} fill="currentColor" />
                <span>Stop Loop</span>
              </>
            ) : (
              <>
                <Play size={15} fill="currentColor" />
                <span>Play Loop</span>
              </>
            )}
          </button>

          <button
            type="button"
            className="vi-mini-btn"
            disabled={undoHistory.length === 0}
            onClick={() => {
              if (undoHistory.length === 0) return;
              const prev = undoHistory[undoHistory.length - 1];
              setStrokes(prev);
              setUndoHistory((u) => u.slice(0, -1));
            }}
            title="Undo Last Stroke"
          >
            <Undo2 size={14} /> Undo
          </button>

          <button
            type="button"
            className={`vi-mini-btn ${eraserMode ? 'active' : ''}`}
            onClick={() => setEraserMode(!eraserMode)}
            title="Eraser Brush"
          >
            <Eraser size={14} /> Erase
          </button>

          <button
            type="button"
            className="vi-mini-btn"
            onClick={() => {
              setUndoHistory((u) => [...u.slice(-19), strokes]);
              setStrokes([]);
              setBgImageDataUrl(null);
            }}
            title="Clear Paper Canvas"
          >
            <Trash2 size={14} /> Clear
          </button>
        </div>

        {/* Center: Voice Numbers (1 2 3 4) & Color Dots (••••••) + Brush Width */}
        <div className="vi-pill-cluster">
          <span className="vi-cluster-label">Voice</span>
          {([1, 2, 3, 4] as const).map((v) => (
            <button
              key={v}
              type="button"
              className={`vi-voice-num-btn ${
                activeVoice === v && !eraserMode ? 'active' : ''
              }`}
              onClick={() => {
                setEraserMode(false);
                setActiveVoice(v);
                setActiveColor(INK_COLORS[v]);
              }}
              title={VOICE_PRESET_MAP[v].name}
            >
              {v === 4 ? '4 (Drums)' : v}
            </button>
          ))}

          <div className="vi-color-dots" role="group" aria-label="Ink Colors">
            {INK_COLORS.map((hex) => (
              <button
                key={hex}
                type="button"
                className={`vi-color-dot ${
                  activeColor === hex && !eraserMode ? 'selected' : ''
                }`}
                style={{ backgroundColor: hex }}
                onClick={() => {
                  setEraserMode(false);
                  setActiveColor(hex);
                }}
                aria-label={`Ink color ${hex}`}
              />
            ))}
          </div>

          <span className="vi-cluster-label">Pen</span>
          {[3, 5, 9].map((sz) => (
            <button
              key={sz}
              type="button"
              className={`vi-mini-btn ${brushSize === sz ? 'active' : ''}`}
              onClick={() => setBrushSize(sz)}
            >
              {sz === 3 ? 'Thin' : sz === 5 ? 'Med' : 'Bold'}
            </button>
          ))}
        </div>

        {/* Right: Paper Style, 9-Square Gallery, Save/Open, Export WAV & MIDI & Send to DAW */}
        <div className="vi-pill-cluster">
          <select
            className="vi-select"
            value={paperStyleId}
            onChange={(e) => setPaperStyleId(e.target.value)}
            aria-label="Paper Theme"
          >
            {PAPER_STYLES.map((ps) => (
              <option key={ps.id} value={ps.id}>
                Paper: {ps.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            className={`vi-mini-btn ${showGridNames ? 'active' : ''}`}
            onClick={() => setShowGridNames(!showGridNames)}
          >
            Note Lines
          </button>

          <button
            type="button"
            className="vi-mini-btn active"
            onClick={() => setShowGalleryModal(true)}
          >
            <ImageIcon size={13} /> 9-Square Gallery & Photo
          </button>

          <button
            type="button"
            className="vi-mini-btn"
            onClick={handleSaveVisualJson}
          >
            <Save size={13} /> Save
          </button>

          <button
            type="button"
            className="vi-mini-btn"
            onClick={handleExportVisualWav}
          >
            <Download size={13} /> WAV
          </button>

          <button
            type="button"
            className="vi-mini-btn"
            onClick={handleExportVisualMidi}
          >
            <Download size={13} /> MIDI
          </button>

          <button
            type="button"
            className="vi-mini-btn"
            onClick={handleExportPngArtwork}
          >
            <Palette size={13} /> PNG
          </button>

          {onNavigateToStudioWithStrokes && (
            <button
              type="button"
              className="vi-mini-btn active"
              onClick={() => {
                setIsPlaying(false);
                const proj = convertStrokesToProjectData();
                onNavigateToStudioWithStrokes(proj);
              }}
              title="Convert your drawing into editable Piano Roll notes in the DAW Studio!"
            >
              <Music size={13} /> Open in DAW Studio →
            </button>
          )}
        </div>
      </div>

      {/* 9-Square Gallery & Photo Modal (Just like playmusictheory.net/play!) */}
      {showGalleryModal && (
        <div
          className="vi-modal-backdrop"
          onClick={() => setShowGalleryModal(false)}
        >
          <div
            className="vi-gallery-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="vi-modal-header">
              <div>
                <h3>Visual Loops Gallery & Photo Canvas</h3>
                <p>
                  Tap any square to load a visual drawing, or tap the center
                  square to place your own photo on the instrument
                </p>
              </div>
              <button
                type="button"
                className="vi-mini-btn"
                onClick={() => setShowGalleryModal(false)}
              >
                × Close
              </button>
            </div>

            <div className="vi-nine-squares-grid">
              {VISUAL_GALLERY_PRESETS.slice(0, 4).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="vi-square-tile"
                  style={{ background: preset.bgGradient }}
                  onClick={() => {
                    setRootPitchClass(preset.rootPc);
                    setScaleId(preset.scaleId);
                    setBpm(preset.bpm);
                    setStrokes(JSON.parse(JSON.stringify(preset.strokes)));
                    setShowGalleryModal(false);
                    setIsPlaying(true);
                  }}
                >
                  <strong>{preset.title}</strong>
                  <small>{preset.subtitle}</small>
                </button>
              ))}

              {/* Center Square (Square #5): Your Photo Here */}
              <button
                type="button"
                className="vi-square-tile vi-photo-upload-tile"
                onClick={() => photoUploadRef.current?.click()}
              >
                <ImageIcon size={24} />
                <strong>Your photo here</strong>
                <small>(tap a square to upload image)</small>
              </button>

              {VISUAL_GALLERY_PRESETS.slice(4, 8).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="vi-square-tile"
                  style={{ background: preset.bgGradient }}
                  onClick={() => {
                    setRootPitchClass(preset.rootPc);
                    setScaleId(preset.scaleId);
                    setBpm(preset.bpm);
                    setStrokes(JSON.parse(JSON.stringify(preset.strokes)));
                    setShowGalleryModal(false);
                    setIsPlaying(true);
                  }}
                >
                  <strong>{preset.title}</strong>
                  <small>{preset.subtitle}</small>
                </button>
              ))}
            </div>

            <input
              ref={photoUploadRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoUpload}
            />
            <input
              ref={projectOpenRef}
              type="file"
              accept=".json,application/json"
              style={{ display: 'none' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
