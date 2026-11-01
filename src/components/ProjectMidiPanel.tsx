import React, { useRef, useState } from 'react';
import {
  Download,
  FolderOpen,
  HardDrive,
  Palette,
  Plus,
  Radio,
  Save,
  Trash2,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Copy,
} from 'lucide-react';
import {
  AccentColorId,
  ProjectData,
  ThemeMode,
  UICustomization,
} from '../types/music';
import {
  MidiDeviceInfo,
  MidiLogEntry,
  MidiSupportState,
  webMidiManager,
} from '../midi/webMidi';
import { parseMidiBytesToNotes } from '../midi/midiExport';
import {
  exportProjectAsJsonFile,
  validateImportedProjectJson,
} from '../storage/projectDb';

interface ProjectMidiPanelProps {
  currentProject: ProjectData;
  savedProjects: ProjectData[];
  onSaveProject: () => Promise<void>;
  onSaveAsNewProject: () => Promise<void>;
  onCreateNewBlankProject: () => void;
  onLoadProject: (proj: ProjectData) => void;
  onDeleteProject: (id: string) => Promise<void>;
  onExportWav: () => Promise<void>;
  onExportMidi: () => void;
  isExportingWav: boolean;
  exportStatusMessage: string | null;
  midiSupportState: MidiSupportState;
  midiDevices: MidiDeviceInfo[];
  midiError: string | null;
  midiLogs: MidiLogEntry[];
  onConnectMidi: () => void;
  activeTrackId: string;
  onImportMidiNotes: (
    notes: ProjectData['notes'],
    detectedBpm?: number
  ) => void;
  uiConfig: UICustomization;
  onChangeUiConfig: (updater: (prev: UICustomization) => UICustomization) => void;
}

const ACCENT_COLORS: { id: AccentColorId; label: string; hex: string }[] = [
  { id: 'cyan', label: 'Studio Cyan', hex: '#06b6d4' },
  { id: 'violet', label: 'Electric Violet', hex: '#8b5cf6' },
  { id: 'emerald', label: 'Emerald Synth', hex: '#10b981' },
  { id: 'amber', label: 'Warm Amber', hex: '#f59e0b' },
  { id: 'rose', label: 'Neon Rose', hex: '#f43f5e' },
  { id: 'cobalt', label: 'Deep Cobalt', hex: '#3b82f6' },
];

const THEME_MODES: { id: ThemeMode; label: string; desc: string }[] = [
  {
    id: 'dark',
    label: 'Studio Dark (Default)',
    desc: 'Balanced low-glare slate DAW palette',
  },
  {
    id: 'oled',
    label: 'Midnight OLED',
    desc: 'High-contrast deep black mastering console',
  },
  {
    id: 'paper',
    label: 'Warm Paper Canvas',
    desc: 'Minimalist daylight sketch paper aesthetic',
  },
];

export const ProjectMidiPanel: React.FC<ProjectMidiPanelProps> = ({
  currentProject,
  savedProjects,
  onSaveProject,
  onSaveAsNewProject,
  onCreateNewBlankProject,
  onLoadProject,
  onDeleteProject,
  onExportWav,
  onExportMidi,
  isExportingWav,
  exportStatusMessage,
  midiSupportState,
  midiDevices,
  midiError,
  midiLogs,
  onConnectMidi,
  activeTrackId,
  onImportMidiNotes,
  uiConfig,
  onChangeUiConfig,
}) => {
  const jsonInputRef = useRef<HTMLInputElement | null>(null);
  const midiFileInputRef = useRef<HTMLInputElement | null>(null);
  const [localBanner, setLocalBanner] = useState<string | null>(null);

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = validateImportedProjectJson(text);
      onLoadProject(imported);
      setLocalBanner(`Loaded project "${imported.name}" from JSON file.`);
    } catch (err) {
      setLocalBanner(
        err instanceof Error ? err.message : 'Failed to import project file.'
      );
    }
    e.target.value = '';
  };

  const handleImportMidiFile = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const { notes, bpm } = parseMidiBytesToNotes(buf, activeTrackId);
      onImportMidiNotes(notes, bpm);
      setLocalBanner(
        `Imported ${notes.length} notes from "${file.name}" into active track.`
      );
    } catch (err) {
      setLocalBanner(
        err instanceof Error ? err.message : 'Failed to parse MIDI file.'
      );
    }
    e.target.value = '';
  };

  return (
    <div className="project-midi-container">
      {(exportStatusMessage || localBanner) && (
        <div className="status-toast-banner">
          <CheckCircle2 size={16} />
          <span>{localBanner || exportStatusMessage}</span>
        </div>
      )}

      <div className="theory-grid-two">
        {/* Column 1: IndexedDB Project Manager & Export Studio */}
        <div className="theory-card">
          <div className="theory-card-header">
            <div>
              <h3>
                <HardDrive size={16} /> Local Project Storage (IndexedDB)
              </h3>
              <p className="theory-subtitle">
                Save compositions locally in your browser or export portable
                files
              </p>
            </div>
            <div className="btn-group">
              <button
                type="button"
                className="chip-btn active-chip"
                onClick={async () => {
                  await onSaveProject();
                  setLocalBanner(
                    `Saved "${currentProject.name}" to IndexedDB.`
                  );
                }}
              >
                <Save size={13} />
                <span>Save Project</span>
              </button>
              <button
                type="button"
                className="chip-btn"
                onClick={async () => {
                  await onSaveAsNewProject();
                  setLocalBanner(
                    `Saved duplicate copy of "${currentProject.name}".`
                  );
                }}
              >
                <Copy size={13} />
                <span>Duplicate</span>
              </button>
              <button
                type="button"
                className="chip-btn"
                onClick={() => {
                  onCreateNewBlankProject();
                  setLocalBanner('Created new blank composition.');
                }}
              >
                <Plus size={13} />
                <span>New Blank</span>
              </button>
            </div>
          </div>

          {/* Saved Projects List */}
          <div className="saved-projects-list">
            {savedProjects.map((proj) => {
              const isCurrent = proj.id === currentProject.id;
              const isDemo = proj.id.startsWith('demo-');
              return (
                <div
                  key={proj.id}
                  className={`saved-project-row ${isCurrent ? 'active' : ''}`}
                >
                  <div className="saved-proj-meta">
                    <strong>
                      {proj.name}{' '}
                      {isDemo && <span className="demo-tag">FACTORY</span>}
                    </strong>
                    <small>
                      {proj.bpm} BPM · {proj.notes.length} notes ·{' '}
                      {proj.tracks.length} tracks
                    </small>
                  </div>
                  <div className="btn-group">
                    <button
                      type="button"
                      className="chip-btn"
                      onClick={() => {
                        onLoadProject(proj);
                        setLocalBanner(`Loaded project "${proj.name}".`);
                      }}
                    >
                      <FolderOpen size={12} />
                      <span>Load</span>
                    </button>
                    {!isDemo && (
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => onDeleteProject(proj.id)}
                        title="Delete Project"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Export & Import Actions */}
          <div className="export-actions-box">
            <h4>Audio, MIDI & Project File Export / Import</h4>
            <div className="export-buttons-grid">
              <button
                type="button"
                className="export-action-card"
                onClick={onExportWav}
                disabled={isExportingWav}
              >
                <Download size={18} />
                <div>
                  <strong>
                    {isExportingWav
                      ? 'Rendering Offline WAV...'
                      : 'Export WAV Audio (.wav)'}
                  </strong>
                  <small>44.1kHz 16-bit Stereo PCM Master Render</small>
                </div>
              </button>

              <button
                type="button"
                className="export-action-card"
                onClick={onExportMidi}
              >
                <Download size={18} />
                <div>
                  <strong>Export Standard MIDI (.mid)</strong>
                  <small>Multi-track SMF Format 1 with tempo & swing</small>
                </div>
              </button>

              <button
                type="button"
                className="export-action-card"
                onClick={() => {
                  const fname = exportProjectAsJsonFile(currentProject);
                  setLocalBanner(`Exported project file "${fname}".`);
                }}
              >
                <Download size={18} />
                <div>
                  <strong>Export Project JSON (.openkeys.json)</strong>
                  <small>Full synth presets, tracks, and notes</small>
                </div>
              </button>

              <button
                type="button"
                className="export-action-card"
                onClick={() => jsonInputRef.current?.click()}
              >
                <Upload size={18} />
                <div>
                  <strong>Import Project JSON</strong>
                  <small>Load an .openkeys.json file from disk</small>
                </div>
              </button>

              <button
                type="button"
                className="export-action-card"
                onClick={() => midiFileInputRef.current?.click()}
              >
                <Upload size={18} />
                <div>
                  <strong>Import MIDI File (.mid)</strong>
                  <small>Load external MIDI notes into active track</small>
                </div>
              </button>
            </div>

            <input
              ref={jsonInputRef}
              type="file"
              accept=".json,application/json"
              style={{ display: 'none' }}
              onChange={handleImportJson}
            />
            <input
              ref={midiFileInputRef}
              type="file"
              accept=".mid,.midi,audio/midi"
              style={{ display: 'none' }}
              onChange={handleImportMidiFile}
            />
          </div>
        </div>

        {/* Column 2: Web MIDI Controller & UI Customization */}
        <div className="theory-card">
          <div className="theory-card-header">
            <div>
              <h3>
                <Radio size={16} /> Web MIDI API Input & Monitor
              </h3>
              <p className="theory-subtitle">
                Connect external USB/Bluetooth MIDI keyboards or test with the
                Virtual MIDI Loopback
              </p>
            </div>
            <button
              type="button"
              className="chip-btn active-chip"
              onClick={onConnectMidi}
            >
              Scan MIDI Devices
            </button>
          </div>

          <div
            className={`midi-status-box ${
              midiSupportState === 'supported'
                ? 'status-ok'
                : 'status-warning'
            }`}
          >
            {midiSupportState === 'supported' ? (
              <CheckCircle2 size={16} />
            ) : (
              <AlertTriangle size={16} />
            )}
            <div>
              <strong>
                Web MIDI Status: {midiSupportState.toUpperCase()} (
                {midiDevices.length} hardware input
                {midiDevices.length === 1 ? '' : 's'} detected)
              </strong>
              {midiError && <p>{midiError}</p>}
            </div>
          </div>

          {/* Virtual MIDI Loopback Test Strip */}
          <div className="builder-section">
            <span className="strip-label">
              Virtual MIDI Loopback Test (Simulates Hardware MIDI Packets)
            </span>
            <div className="btn-group">
              {[60, 64, 67, 71, 72].map((m) => (
                <button
                  key={m}
                  type="button"
                  className="chip-btn"
                  onClick={() => webMidiManager.simulateMidiNote(m, 108, 400)}
                >
                  Send MIDI #{m}
                </button>
              ))}
            </div>
          </div>

          {/* MIDI Monitor Log */}
          <div className="midi-log-box">
            {midiLogs.length === 0 ? (
              <div className="empty-theory-state">
                No MIDI messages received yet. Press a key on your MIDI
                controller or click a Virtual MIDI Loopback button above.
              </div>
            ) : (
              <table className="studio-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Source</th>
                    <th>Event</th>
                    <th>Ch</th>
                    <th>Data</th>
                    <th>Hex</th>
                  </tr>
                </thead>
                <tbody>
                  {midiLogs.slice(0, 6).map((log) => (
                    <tr key={log.id}>
                      <td>{log.timestamp}</td>
                      <td>{log.source}</td>
                      <td>{log.type}</td>
                      <td>{log.channel}</td>
                      <td>
                        {log.data1} / {log.data2}
                      </td>
                      <td>
                        <code>{log.rawHex}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* UI Customization & Accent Color Studio */}
          <div className="customization-section">
            <h4>
              <Palette size={15} /> Studio Theme & Accent Color Customization
            </h4>

            <div className="builder-section">
              <span className="strip-label">Accent Color</span>
              <div className="accent-swatches-row">
                {ACCENT_COLORS.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    className={`accent-swatch-btn ${
                      uiConfig.accentColor === acc.id ? 'selected' : ''
                    }`}
                    onClick={() =>
                      onChangeUiConfig((prev) => ({
                        ...prev,
                        accentColor: acc.id,
                      }))
                    }
                  >
                    <span
                      className="swatch-dot"
                      style={{ backgroundColor: acc.hex }}
                    />
                    <span>{acc.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="builder-section">
              <span className="strip-label">Interface Theme Mode</span>
              <div className="theme-modes-row">
                {THEME_MODES.map((tm) => (
                  <button
                    key={tm.id}
                    type="button"
                    className={`theme-mode-card ${
                      uiConfig.themeMode === tm.id ? 'selected' : ''
                    }`}
                    onClick={() =>
                      onChangeUiConfig((prev) => ({
                        ...prev,
                        themeMode: tm.id,
                      }))
                    }
                  >
                    <strong>{tm.label}</strong>
                    <small>{tm.desc}</small>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
