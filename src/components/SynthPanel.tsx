import React, { useEffect, useRef } from 'react';
import {
  Sliders,
  Waves,
  Activity,
  RotateCcw,
  Volume2,
  Sparkles,
} from 'lucide-react';
import {
  OscillatorWaveType,
  PresetId,
  SynthParams,
  Track,
} from '../types/music';
import { PRESET_LIST, cloneSynthParams } from '../audio/presets';
import { soundEngine } from '../audio/soundEngine';

interface SynthPanelProps {
  tracks: Track[];
  activeTrackId: string;
  onSelectTrack: (id: string) => void;
  onUpdateTrack: (id: string, updater: (t: Track) => Track) => void;
  onAuditionNote: (midi: number, velocity: number, track: Track) => void;
}

const WAVE_TYPES: OscillatorWaveType[] = [
  'sine',
  'triangle',
  'sawtooth',
  'square',
];

export const SynthPanel: React.FC<SynthPanelProps> = ({
  tracks,
  activeTrackId,
  onSelectTrack,
  onUpdateTrack,
  onAuditionNote,
}) => {
  const activeTrack =
    tracks.find((t) => t.id === activeTrackId) ?? tracks[0];
  const params = activeTrack.synthParams;
  const scopeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const updateParam = <K extends keyof SynthParams>(
    key: K,
    val: SynthParams[K]
  ) => {
    onUpdateTrack(activeTrack.id, (t) => ({
      ...t,
      synthParams: {
        ...t.synthParams,
        [key]: val,
      },
    }));
  };

  // Real-time Oscilloscope + Frequency Spectrum animation loop
  useEffect(() => {
    let rafId = 0;
    const renderScope = () => {
      const canvas = scopeCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          ctx.clearRect(0, 0, w, h);

          // Draw frequency bars in background
          const freqData = soundEngine.getFrequencyData();
          const barCount = 48;
          const barW = w / barCount;
          ctx.fillStyle = 'rgba(6, 182, 212, 0.22)';
          for (let i = 0; i < barCount; i++) {
            const val = freqData[i] / 255;
            const barH = val * (h * 0.85);
            ctx.fillRect(
              i * barW + 1,
              h - barH,
              Math.max(2, barW - 2),
              barH
            );
          }

          // Draw time-domain waveform
          const waveData = soundEngine.getWaveformData();
          ctx.beginPath();
          ctx.strokeStyle = activeTrack.color || '#06b6d4';
          ctx.lineWidth = 2.2;
          const slice = w / (waveData.length - 1);
          for (let i = 0; i < waveData.length; i++) {
            const v = waveData[i] / 128.0;
            const y = (v * h) / 2;
            if (i === 0) ctx.moveTo(0, y);
            else ctx.lineTo(i * slice, y);
          }
          ctx.stroke();
        }
      }
      rafId = requestAnimationFrame(renderScope);
    };
    rafId = requestAnimationFrame(renderScope);
    return () => cancelAnimationFrame(rafId);
  }, [activeTrack.color]);

  // Compute SVG path for ADSR envelope visualization
  const totalEnvSec = Math.max(
    1.2,
    params.attack + params.decay + 0.5 + params.release
  );
  const envW = 320;
  const envH = 110;
  const attackX = 12 + (params.attack / totalEnvSec) * (envW - 24);
  const decayX = attackX + (params.decay / totalEnvSec) * (envW - 24);
  const sustainY = envH - 14 - params.sustain * (envH - 28);
  const sustainHoldX = decayX + (0.45 / totalEnvSec) * (envW - 24);
  const releaseX = Math.min(
    envW - 10,
    sustainHoldX + (params.release / totalEnvSec) * (envW - 24)
  );

  const adsrPath = `M 12 ${envH - 14} L ${attackX.toFixed(
    1
  )} 14 L ${decayX.toFixed(1)} ${sustainY.toFixed(
    1
  )} L ${sustainHoldX.toFixed(1)} ${sustainY.toFixed(
    1
  )} L ${releaseX.toFixed(1)} ${envH - 14}`;

  const adsrFillPath = `${adsrPath} L 12 ${envH - 14} Z`;

  return (
    <div className="synth-panel-container">
      {/* Top Track Selector & Quick Audition Bar */}
      <div className="synth-header-bar">
        <div className="synth-track-tabs">
          {tracks.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`synth-track-pill ${
                t.id === activeTrack.id ? 'active' : ''
              }`}
              onClick={() => onSelectTrack(t.id)}
            >
              <span
                className="track-color-swatch"
                style={{ backgroundColor: t.color }}
              />
              <span>{t.name}</span>
            </button>
          ))}
        </div>

        <div className="synth-header-actions">
          <button
            type="button"
            className="chip-btn active-chip"
            onClick={() => onAuditionNote(60, 0.88, activeTrack)}
          >
            <Sparkles size={13} />
            <span>Audition C4</span>
          </button>
          <button
            type="button"
            className="chip-btn"
            onClick={() => {
              soundEngine.triggerChord(
                [60, 64, 67, 71],
                1.1,
                0.82,
                activeTrack.synthParams,
                0.06
              );
            }}
          >
            <Waves size={13} />
            <span>Audition Maj7 Chord</span>
          </button>
          <button
            type="button"
            className="chip-btn"
            onClick={() =>
              onUpdateTrack(activeTrack.id, (t) => ({
                ...t,
                synthParams: cloneSynthParams(t.instrument),
              }))
            }
            title="Reset ADSR and Synth parameters to preset defaults"
          >
            <RotateCcw size={13} />
            <span>Reset Preset</span>
          </button>
        </div>
      </div>

      {/* Instrument Presets Grid */}
      <div className="preset-cards-grid">
        {PRESET_LIST.map((preset) => {
          const isSelected = activeTrack.instrument === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              className={`preset-card ${isSelected ? 'selected' : ''}`}
              onClick={() => {
                const cloned = cloneSynthParams(preset.id as PresetId);
                onUpdateTrack(activeTrack.id, (t) => ({
                  ...t,
                  instrument: preset.id as PresetId,
                  synthParams: cloned,
                }));
                soundEngine.triggerChord([60, 64, 67], 0.65, 0.82, cloned, 0.04);
              }}
            >
              <div className="preset-card-top">
                <span className="preset-category-tag">{preset.category}</span>
                {isSelected && <span className="preset-active-dot">ACTIVE</span>}
              </div>
              <div className="preset-name">{preset.name}</div>
              <div className="preset-desc">{preset.description}</div>
            </button>
          );
        })}
      </div>

      {/* 3-Column Synth Modules: Oscillators | ADSR Envelope | Filter, FX & Oscilloscope */}
      <div className="synth-modules-grid">
        {/* Module 1: Oscillators & Mixer */}
        <div className="synth-module-card">
          <div className="module-title">
            <Waves size={15} />
            <span>OSCILLATORS & VOICE MIXER</span>
          </div>

          <div className="param-row">
            <span className="param-label">Oscillator 1 Wave</span>
            <div className="wave-selector">
              {WAVE_TYPES.map((w) => (
                <button
                  key={w}
                  type="button"
                  className={`wave-btn ${
                    params.osc1Type === w ? 'active' : ''
                  }`}
                  onClick={() => updateParam('osc1Type', w)}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          <div className="param-row">
            <span className="param-label">Oscillator 2 Wave</span>
            <div className="wave-selector">
              {WAVE_TYPES.map((w) => (
                <button
                  key={w}
                  type="button"
                  className={`wave-btn ${
                    params.osc2Type === w ? 'active' : ''
                  }`}
                  onClick={() => updateParam('osc2Type', w)}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          <div className="param-slider-row">
            <div className="param-slider-header">
              <span>Osc 1 / Osc 2 Balance</span>
              <strong>{Math.round(params.oscMix * 100)}%</strong>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={params.oscMix}
              onChange={(e) =>
                updateParam('oscMix', parseFloat(e.target.value))
              }
              className="studio-slider"
            />
          </div>

          <div className="param-slider-row">
            <div className="param-slider-header">
              <span>Osc 2 Detune (Chorus Width)</span>
              <strong>{params.osc2Detune} cents</strong>
            </div>
            <input
              type="range"
              min={-50}
              max={50}
              step={1}
              value={params.osc2Detune}
              onChange={(e) =>
                updateParam('osc2Detune', parseInt(e.target.value, 10))
              }
              className="studio-slider"
            />
          </div>

          <div className="param-slider-row">
            <div className="param-slider-header">
              <span>Sub-Octave Sine Level (-1 Oct)</span>
              <strong>{Math.round(params.subOscLevel * 100)}%</strong>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={params.subOscLevel}
              onChange={(e) =>
                updateParam('subOscLevel', parseFloat(e.target.value))
              }
              className="studio-slider"
            />
          </div>

          <div className="param-slider-row">
            <div className="param-slider-header">
              <span>Preset Output Gain</span>
              <strong>{Math.round(params.volume * 100)}%</strong>
            </div>
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.01}
              value={params.volume}
              onChange={(e) =>
                updateParam('volume', parseFloat(e.target.value))
              }
              className="studio-slider"
            />
          </div>
        </div>

        {/* Module 2: ADSR Envelope Generator */}
        <div className="synth-module-card">
          <div className="module-title">
            <Sliders size={15} />
            <span>ADSR AMPLITUDE & FILTER ENVELOPE</span>
          </div>

          {/* Interactive SVG ADSR Curve */}
          <div className="adsr-graph-box">
            <svg
              viewBox={`0 0 ${envW} ${envH}`}
              className="adsr-svg"
              aria-label="ADSR Envelope Curve"
            >
              <defs>
                <linearGradient id="adsrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={activeTrack.color}
                    stopOpacity="0.45"
                  />
                  <stop
                    offset="100%"
                    stopColor={activeTrack.color}
                    stopOpacity="0.02"
                  />
                </linearGradient>
              </defs>
              <path d={adsrFillPath} fill="url(#adsrGrad)" />
              <path
                d={adsrPath}
                fill="none"
                stroke={activeTrack.color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx={attackX} cy={14} r="4" fill="#f8fafc" />
              <circle cx={decayX} cy={sustainY} r="4" fill="#f8fafc" />
              <circle cx={sustainHoldX} cy={sustainY} r="4" fill="#f8fafc" />
              <circle cx={releaseX} cy={envH - 14} r="4" fill="#f8fafc" />
            </svg>
          </div>

          <div className="param-slider-row">
            <div className="param-slider-header">
              <span>Attack Time (A)</span>
              <strong>{(params.attack * 1000).toFixed(0)} ms</strong>
            </div>
            <input
              type="range"
              min={0.003}
              max={1.5}
              step={0.005}
              value={params.attack}
              onChange={(e) =>
                updateParam('attack', parseFloat(e.target.value))
              }
              className="studio-slider"
              aria-label="Attack Time"
            />
          </div>

          <div className="param-slider-row">
            <div className="param-slider-header">
              <span>Decay Time (D)</span>
              <strong>{(params.decay * 1000).toFixed(0)} ms</strong>
            </div>
            <input
              type="range"
              min={0.02}
              max={2.0}
              step={0.01}
              value={params.decay}
              onChange={(e) =>
                updateParam('decay', parseFloat(e.target.value))
              }
              className="studio-slider"
              aria-label="Decay Time"
            />
          </div>

          <div className="param-slider-row">
            <div className="param-slider-header">
              <span>Sustain Level (S)</span>
              <strong>{Math.round(params.sustain * 100)}%</strong>
            </div>
            <input
              type="range"
              min={0.01}
              max={1}
              step={0.01}
              value={params.sustain}
              onChange={(e) =>
                updateParam('sustain', parseFloat(e.target.value))
              }
              className="studio-slider"
              aria-label="Sustain Level"
            />
          </div>

          <div className="param-slider-row">
            <div className="param-slider-header">
              <span>Release Time (R)</span>
              <strong>{(params.release * 1000).toFixed(0)} ms</strong>
            </div>
            <input
              type="range"
              min={0.03}
              max={3.0}
              step={0.01}
              value={params.release}
              onChange={(e) =>
                updateParam('release', parseFloat(e.target.value))
              }
              className="studio-slider"
              aria-label="Release Time"
            />
          </div>
        </div>

        {/* Module 3: Filter, Spatial Effects & Live Oscilloscope */}
        <div className="synth-module-card">
          <div className="module-title">
            <Activity size={15} />
            <span>FILTER, SPATIAL FX & LIVE OSCILLOSCOPE</span>
          </div>

          <div className="scope-canvas-wrap">
            <canvas
              ref={scopeCanvasRef}
              width={320}
              height={92}
              className="live-scope-canvas"
            />
            <span className="scope-badge">REAL-TIME WEB AUDIO ANALYSER</span>
          </div>

          <div className="param-slider-row">
            <div className="param-slider-header">
              <span>Low-Pass Filter Cutoff</span>
              <strong>{Math.round(params.filterCutoff)} Hz</strong>
            </div>
            <input
              type="range"
              min={120}
              max={14000}
              step={20}
              value={params.filterCutoff}
              onChange={(e) =>
                updateParam('filterCutoff', parseFloat(e.target.value))
              }
              className="studio-slider"
              aria-label="Filter Cutoff"
            />
          </div>

          <div className="param-slider-row">
            <div className="param-slider-header">
              <span>Filter Resonance (Q)</span>
              <strong>{params.filterResonance.toFixed(1)}</strong>
            </div>
            <input
              type="range"
              min={0.5}
              max={12}
              step={0.1}
              value={params.filterResonance}
              onChange={(e) =>
                updateParam('filterResonance', parseFloat(e.target.value))
              }
              className="studio-slider"
              aria-label="Filter Resonance"
            />
          </div>

          <div className="param-slider-row">
            <div className="param-slider-header">
              <span>Hall Convolution Reverb Mix</span>
              <strong>{Math.round(params.reverbMix * 100)}%</strong>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={params.reverbMix}
              onChange={(e) =>
                updateParam('reverbMix', parseFloat(e.target.value))
              }
              className="studio-slider"
              aria-label="Reverb Mix"
            />
          </div>

          <div className="param-slider-row">
            <div className="param-slider-header">
              <span>Stereo Echo Delay Mix</span>
              <strong>{Math.round(params.delayMix * 100)}%</strong>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={params.delayMix}
              onChange={(e) =>
                updateParam('delayMix', parseFloat(e.target.value))
              }
              className="studio-slider"
              aria-label="Delay Mix"
            />
          </div>

          <div className="param-slider-row">
            <div className="param-slider-header">
              <span>
                <Volume2 size={12} /> Stereo Panning
              </span>
              <strong>
                {activeTrack.pan === 0
                  ? 'Center'
                  : activeTrack.pan < 0
                  ? `${Math.round(Math.abs(activeTrack.pan) * 100)}% L`
                  : `${Math.round(activeTrack.pan * 100)}% R`}
              </strong>
            </div>
            <input
              type="range"
              min={-1}
              max={1}
              step={0.05}
              value={activeTrack.pan}
              onChange={(e) =>
                onUpdateTrack(activeTrack.id, (t) => ({
                  ...t,
                  pan: parseFloat(e.target.value),
                }))
              }
              className="studio-slider"
              aria-label="Track Stereo Pan"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
