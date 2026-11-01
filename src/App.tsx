import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Home, Music, Palette } from 'lucide-react';
import {
  EnharmonicPreference,
  NoteEvent,
  PresetId,
  ProjectData,
  QuantizeDivision,
  ScaleId,
  SwingPreset,
  Track,
  UICustomization,
  WorkspaceTab,
} from './types/music';
import { SWING_OPTIONS } from './theory/constants';
import {
  applySwingOffset,
  getQuantizeStepBeats,
  quantizeBeat,
} from './theory/engine';
import { cloneSynthParams } from './audio/presets';
import { soundEngine } from './audio/soundEngine';
import {
  DEFAULT_DRUM_VOICES,
  DRUM_PATTERN_PRESETS,
  DrumKitId,
  DrumVoiceConfig,
  DrumVoiceId,
  triggerDrumLive,
} from './audio/drumEngine';
import {
  MidiDeviceInfo,
  MidiLogEntry,
  MidiSupportState,
  webMidiManager,
} from './midi/webMidi';
import { downloadMidiFile } from './midi/midiExport';
import { downloadWavFile } from './export/wavExport';
import { createDefaultTracks, DEMO_PROJECTS } from './storage/demoProjects';
import {
  deleteProjectFromDb,
  listProjectsFromDb,
  saveProjectToDb,
} from './storage/projectDb';
import { TopTransportBar } from './components/TopTransportBar';
import { VirtualKeyboard } from './components/VirtualKeyboard';
import { PianoRollEditor } from './components/PianoRollEditor';
import { DrumMachinePanel } from './components/DrumMachinePanel';
import { SynthPanel } from './components/SynthPanel';
import { TheorySuite } from './components/TheorySuite';
import { EarTraining } from './components/EarTraining';
import { ProjectMidiPanel } from './components/ProjectMidiPanel';
import { AppPageRoute, LandingPage } from './components/LandingPage';
import { VisualPaperInstrument } from './components/VisualPaperInstrument';

const TRACK_COLORS = [
  '#06b6d4',
  '#8b5cf6',
  '#10b981',
  '#f59e0b',
  '#f43f5e',
  '#3b82f6',
];

function getInitialRouteFromHash(): AppPageRoute {
  if (typeof window === 'undefined') return 'studio';
  const hash = window.location.hash.toLowerCase();
  if (hash.includes('visual') || hash.includes('play')) return 'visual';
  if (hash.includes('studio') || hash.includes('daw')) return 'studio';
  if (hash.includes('landing') || hash.includes('home')) return 'landing';
  // Default to Landing Page on real browser visits, or studio if running headless tests without hash
  return 'landing';
}

export const App: React.FC = () => {
  const [pageRoute, setPageRoute] = useState<AppPageRoute>(() =>
    getInitialRouteFromHash()
  );
  const [project, setProject] = useState<ProjectData>(() =>
    JSON.parse(JSON.stringify(DEMO_PROJECTS[0]))
  );
  const [savedProjects, setSavedProjects] = useState<ProjectData[]>([]);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('studio');
  const [activeTrackId, setActiveTrackId] = useState<string>('track-1');

  // Drum Machine State (16-step beat sequencer synced with DAW transport)
  const [drumsEnabled, setDrumsEnabled] = useState<boolean>(true);
  const [drumKit, setDrumKit] = useState<DrumKitId>('studio_808');
  const [drumVoices, setDrumVoices] = useState<DrumVoiceConfig[]>(() =>
    JSON.parse(JSON.stringify(DEFAULT_DRUM_VOICES))
  );
  const [drumSteps, setDrumSteps] = useState<Record<DrumVoiceId, number[]>>(() =>
    JSON.parse(JSON.stringify(DRUM_PATTERN_PRESETS[0].steps))
  );

  // Undo / Redo stacks for note edits
  const [undoStack, setUndoStack] = useState<NoteEvent[][]>([]);
  const [redoStack, setRedoStack] = useState<NoteEvent[][]>([]);

  // Transport state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isLooping, setIsLooping] = useState(true);
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);

  // Virtual Keyboard state
  const [baseOctave, setBaseOctave] = useState(3);
  const [visibleOctaves, setVisibleOctaves] = useState(3);
  const [keyboardVelocity, setKeyboardVelocity] = useState(0.84);
  const [userHeldNotes, setUserHeldNotes] = useState<Set<number>>(new Set());
  const [playbackActiveNotes, setPlaybackActiveNotes] = useState<Set<number>>(
    new Set()
  );

  // UI Customization
  const [uiConfig, setUiConfig] = useState<UICustomization>({
    accentColor: 'cyan',
    themeMode: 'dark',
    keyLabelMode: 'notes',
    highlightScaleOnKeyboard: true,
    scaleLockKeyboard: false,
    pianoRollFoldScale: false,
    showPianoDock: true,
    referencePitchA4: 440,
  });

  // Export & MIDI state
  const [isExportingWav, setIsExportingWav] = useState(false);
  const [exportStatusMessage, setExportStatusMessage] = useState<string | null>(
    null
  );
  const [midiSupportState, setMidiSupportState] =
    useState<MidiSupportState>('uninitialized');
  const [midiDevices, setMidiDevices] = useState<MidiDeviceInfo[]>([]);
  const [midiError, setMidiError] = useState<string | null>(null);
  const [midiLogs, setMidiLogs] = useState<MidiLogEntry[]>([]);

  // Sync URL hash for portable GitHub Pages navigation
  const navigateToPage = useCallback(
    (nextPage: AppPageRoute, targetTab?: WorkspaceTab) => {
      if (nextPage !== 'studio') {
        setIsPlaying(false);
      }
      setPageRoute(nextPage);
      if (targetTab) {
        setActiveTab(targetTab);
      }
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', `#/${nextPage}`);
      }
    },
    []
  );

  // Refs for transport loop and live recording
  const projectRef = useRef(project);
  projectRef.current = project;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const isRecordingRef = useRef(isRecording);
  isRecordingRef.current = isRecording;
  const isLoopingRef = useRef(isLooping);
  isLoopingRef.current = isLooping;
  const metronomeRef = useRef(metronomeEnabled);
  metronomeRef.current = metronomeEnabled;
  const currentBeatRef = useRef(0);
  const activeTrackIdRef = useRef(activeTrackId);
  activeTrackIdRef.current = activeTrackId;

  const drumsEnabledRef = useRef(drumsEnabled);
  drumsEnabledRef.current = drumsEnabled;
  const drumKitRef = useRef(drumKit);
  drumKitRef.current = drumKit;
  const drumVoicesRef = useRef(drumVoices);
  drumVoicesRef.current = drumVoices;
  const drumStepsRef = useRef(drumSteps);
  drumStepsRef.current = drumSteps;

  const liveRecordingOpenNotesRef = useRef<
    Map<number, { startBeat: number; velocity: number }>
  >(new Map());

  // Load saved projects from IndexedDB on mount
  const refreshProjectsList = useCallback(async () => {
    const list = await listProjectsFromDb();
    setSavedProjects(list);
  }, []);

  useEffect(() => {
    refreshProjectsList();
  }, [refreshProjectsList]);

  useEffect(() => {
    soundEngine.setMasterVolume(project.masterVolume);
  }, [project.masterVolume]);

  useEffect(() => {
    soundEngine.setReferenceA4(uiConfig.referencePitchA4);
  }, [uiConfig.referencePitchA4]);

  const activeTrack =
    project.tracks.find((t) => t.id === activeTrackId) ?? project.tracks[0];

  const handleChangeNotes = useCallback(
    (nextNotes: NoteEvent[], pushHistory = true) => {
      setProject((prev) => {
        if (pushHistory) {
          setUndoStack((u) => [...u.slice(-29), prev.notes]);
          setRedoStack([]);
        }
        return {
          ...prev,
          notes: nextNotes,
          updatedAt: Date.now(),
        };
      });
    },
    []
  );

  const handleUndo = useCallback(() => {
    setUndoStack((prevUndo) => {
      if (prevUndo.length === 0) return prevUndo;
      const previousNotes = prevUndo[prevUndo.length - 1];
      setProject((curr) => {
        setRedoStack((r) => [...r, curr.notes]);
        return { ...curr, notes: previousNotes };
      });
      return prevUndo.slice(0, -1);
    });
  }, []);

  const handleRedo = useCallback(() => {
    setRedoStack((prevRedo) => {
      if (prevRedo.length === 0) return prevRedo;
      const nextNotes = prevRedo[prevRedo.length - 1];
      setProject((curr) => {
        setUndoStack((u) => [...u, curr.notes]);
        return { ...curr, notes: nextNotes };
      });
      return prevRedo.slice(0, -1);
    });
  }, []);

  const handleAuditionNote = useCallback(
    (midi: number, velocity: number, track: Track) => {
      soundEngine.triggerNote(
        midi,
        0.32,
        velocity,
        track.synthParams,
        track.volume,
        track.pan
      );
    },
    []
  );

  const handleLiveNoteOn = useCallback(
    (midi: number, velocity: number, source: string) => {
      const proj = projectRef.current;
      const track =
        proj.tracks.find((t) => t.id === activeTrackIdRef.current) ??
        proj.tracks[0];

      soundEngine.noteOn(
        `${source}-${midi}`,
        midi,
        velocity,
        track.synthParams,
        track.volume,
        track.pan
      );

      setUserHeldNotes((prev) => {
        const next = new Set(prev);
        next.add(midi);
        return next;
      });

      if (isRecordingRef.current) {
        if (!isPlayingRef.current) {
          setIsPlaying(true);
        }
        const snappedStart = quantizeBeat(
          currentBeatRef.current,
          proj.quantize
        );
        liveRecordingOpenNotesRef.current.set(midi, {
          startBeat: snappedStart % proj.loopBeats,
          velocity,
        });
      }
    },
    []
  );

  const handleLiveNoteOff = useCallback(
    (midi: number, source: string) => {
      soundEngine.noteOff(`${source}-${midi}`);

      setUserHeldNotes((prev) => {
        const next = new Set(prev);
        next.delete(midi);
        return next;
      });

      const recordedStart = liveRecordingOpenNotesRef.current.get(midi);
      if (recordedStart && isRecordingRef.current) {
        liveRecordingOpenNotesRef.current.delete(midi);
        const proj = projectRef.current;
        const minStep = getQuantizeStepBeats(proj.quantize);
        let rawDur = currentBeatRef.current - recordedStart.startBeat;
        if (rawDur <= 0) rawDur += proj.loopBeats;
        const durationBeats = Math.max(
          minStep,
          Math.min(proj.loopBeats, Math.round(rawDur / minStep) * minStep)
        );

        const newNote: NoteEvent = {
          id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          midi,
          startBeat: recordedStart.startBeat,
          durationBeats,
          velocity: recordedStart.velocity,
          trackId: activeTrackIdRef.current,
        };
        handleChangeNotes([...proj.notes, newNote], true);
      }
    },
    [handleChangeNotes]
  );

  useEffect(() => {
    const unsubMsg = webMidiManager.onMidiMessage(
      (type, midiOrState, velocity, _channel, logEntry) => {
        setMidiLogs((prev) => [logEntry, ...prev.slice(0, 29)]);
        if (type === 'noteon') {
          handleLiveNoteOn(midiOrState, velocity, 'midi');
        } else if (type === 'noteoff') {
          handleLiveNoteOff(midiOrState, 'midi');
        }
      }
    );

    const unsubDev = webMidiManager.onDevicesChange((state, devices, err) => {
      setMidiSupportState(state);
      setMidiDevices(devices);
      setMidiError(err);
    });

    return () => {
      unsubMsg();
      unsubDev();
    };
  }, [handleLiveNoteOn, handleLiveNoteOff]);

  // High-precision Sequencer Playback Loop (Piano Roll + 16-Step Drum Machine!)
  useEffect(() => {
    if (!isPlaying) {
      setPlaybackActiveNotes(new Set());
      return;
    }

    soundEngine.initContext();
    let lastTime = performance.now();
    let lastQuarterBeatTriggered = Math.floor(currentBeatRef.current) - 1;
    let lastSixteenthDrumStep = -1;
    const triggeredNoteIdsInCycle = new Set<string>();
    let rafId = 0;

    const tick = (now: number) => {
      const dtSeconds = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      const proj = projectRef.current;
      const beatsPerSecond = proj.bpm / 60;
      const prevBeat = currentBeatRef.current;
      let nextBeat = prevBeat + dtSeconds * beatsPerSecond;

      if (nextBeat >= proj.loopBeats) {
        if (isLoopingRef.current) {
          nextBeat = nextBeat % proj.loopBeats;
          triggeredNoteIdsInCycle.clear();
          lastQuarterBeatTriggered = -1;
          lastSixteenthDrumStep = -1;
        } else {
          currentBeatRef.current = 0;
          setCurrentBeat(0);
          setIsPlaying(false);
          return;
        }
      }

      currentBeatRef.current = nextBeat;
      setCurrentBeat(nextBeat);

      // 1. Metronome click on quarter-note beats
      const currentWholeBeat = Math.floor(nextBeat);
      if (
        metronomeRef.current &&
        currentWholeBeat !== lastQuarterBeatTriggered
      ) {
        lastQuarterBeatTriggered = currentWholeBeat;
        const isDownbeat = currentWholeBeat % 4 === 0;
        soundEngine.triggerMetronomeClick(isDownbeat, 0.5);
      }

      // 2. 16-Step Drum Machine Triggering (each step = 0.25 beat = 1/16th note)
      const drumStepIndex = Math.floor(nextBeat * 4) % 16;
      if (
        drumsEnabledRef.current &&
        drumStepIndex !== lastSixteenthDrumStep
      ) {
        lastSixteenthDrumStep = drumStepIndex;
        const voices = drumVoicesRef.current;
        const unmutedDrums = voices.filter((v) => !v.muted);
        const anyDrumSolo = unmutedDrums.some((v) => v.solo);
        const audibleDrums = anyDrumSolo
          ? unmutedDrums.filter((v) => v.solo)
          : unmutedDrums;

        for (const dv of audibleDrums) {
          const stepVal = drumStepsRef.current[dv.id]?.[drumStepIndex] ?? 0;
          if (stepVal > 0) {
            const vel =
              stepVal === 2 ? 1.0 : stepVal === 3 ? 0.45 : 0.82;
            triggerDrumLive(dv.id, vel, dv, drumKitRef.current);
          }
        }
      }

      // 3. Melodic Piano Roll Tracks Triggering
      const unmuted = proj.tracks.filter((t) => !t.muted);
      const anySolo = unmuted.some((t) => t.solo);
      const audibleTracks = anySolo
        ? unmuted.filter((t) => t.solo)
        : unmuted;
      const audibleMap = new Map(audibleTracks.map((t) => [t.id, t]));

      const soundingMidis = new Set<number>();
      const secondsPerBeat = 60 / proj.bpm;

      for (const note of proj.notes) {
        const track = audibleMap.get(note.trackId);
        if (!track) continue;

        const swungStart = applySwingOffset(note.startBeat, proj.swingAmount);
        const swungEnd = swungStart + note.durationBeats;

        if (nextBeat >= swungStart && nextBeat <= swungEnd) {
          soundingMidis.add(note.midi);
        }

        const crossed =
          swungStart >= prevBeat &&
          swungStart <= nextBeat + 0.02 &&
          !triggeredNoteIdsInCycle.has(note.id);

        if (crossed) {
          triggeredNoteIdsInCycle.add(note.id);
          soundEngine.triggerNote(
            note.midi,
            note.durationBeats * secondsPerBeat,
            note.velocity,
            track.synthParams,
            track.volume,
            track.pan
          );
        }
      }

      setPlaybackActiveNotes(soundingMidis);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying]);

  const combinedActiveNotes = new Set<number>([
    ...Array.from(userHeldNotes),
    ...Array.from(playbackActiveNotes),
  ]);

  const handleExportWav = async () => {
    setIsExportingWav(true);
    setExportStatusMessage('Rendering multi-track WAV audio...');
    try {
      const res = await downloadWavFile(project, uiConfig.referencePitchA4);
      const kb = (res.byteLength / 1024).toFixed(1);
      setExportStatusMessage(
        `Exported "${res.filename}" (${kb} KB · ${res.durationSeconds.toFixed(
          1
        )}s 44.1kHz Stereo PCM WAV)`
      );
    } catch (err) {
      setExportStatusMessage(
        err instanceof Error ? err.message : 'WAV export failed.'
      );
    } finally {
      setIsExportingWav(false);
    }
  };

  const handleExportMidi = () => {
    const res = downloadMidiFile(project);
    setExportStatusMessage(
      `Exported "${res.filename}" (${res.byteLength} bytes Standard MIDI Format 1)`
    );
  };

  const handleSaveProject = async () => {
    const saved = await saveProjectToDb(project);
    setProject(saved);
    await refreshProjectsList();
  };

  const handleSaveAsNewProject = async () => {
    const copy: ProjectData = {
      ...JSON.parse(JSON.stringify(project)),
      id: `proj-${Date.now()}`,
      name: `${project.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const saved = await saveProjectToDb(copy);
    setProject(saved);
    await refreshProjectsList();
  };

  const handleCreateNewBlankProject = () => {
    const blank: ProjectData = {
      id: `proj-${Date.now()}`,
      name: 'Untitled Composition',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      bpm: 120,
      rootPitchClass: project.rootPitchClass,
      scaleId: project.scaleId,
      enharmonic: project.enharmonic,
      loopBeats: 16,
      quantize: '1/8',
      swingPreset: 'off',
      swingAmount: 0,
      masterVolume: 0.85,
      tracks: createDefaultTracks(),
      notes: [],
    };
    setProject(blank);
    setActiveTrackId(blank.tracks[0].id);
    setUndoStack([]);
    setRedoStack([]);
  };

  const handleAddTrack = () => {
    const nextIdx = project.tracks.length + 1;
    const presetCycle: PresetId[] = [
      'analog_poly',
      'velvet_pad',
      'cyber_lead',
      'grand_piano',
    ];
    const preset = presetCycle[(nextIdx - 1) % presetCycle.length];
    const newTrack: Track = {
      id: `track-${Date.now()}`,
      name: `Track ${nextIdx} · Synth`,
      color: TRACK_COLORS[(nextIdx - 1) % TRACK_COLORS.length],
      instrument: preset,
      volume: 0.8,
      pan: 0,
      muted: false,
      solo: false,
      synthParams: cloneSynthParams(preset),
    };
    setProject((prev) => ({
      ...prev,
      tracks: [...prev.tracks, newTrack],
    }));
    setActiveTrackId(newTrack.id);
  };

  return (
    <div
      className={`openkeys-app-shell theme-${uiConfig.themeMode} accent-${uiConfig.accentColor}`}
    >
      {/* Top Global Multi-Page Navigation Strip */}
      <div className="global-experience-bar">
        <div className="global-exp-left">
          <span className="global-brand-pill" onClick={() => navigateToPage('landing')}>
            OPENKEYS PLATFORM
          </span>
          <span className="global-exp-divider">·</span>
          <span className="global-exp-caption">
            Choose Workspace Experience:
          </span>
        </div>

        <div className="global-exp-tabs" role="navigation" aria-label="Platform Pages">
          <button
            type="button"
            className={`global-exp-btn ${
              pageRoute === 'landing' ? 'active' : ''
            }`}
            onClick={() => navigateToPage('landing')}
          >
            <Home size={13} />
            <span>Landing & Overview</span>
          </button>

          <button
            type="button"
            className={`global-exp-btn ${
              pageRoute === 'visual' ? 'active' : ''
            }`}
            onClick={() => navigateToPage('visual')}
          >
            <Palette size={13} />
            <span>Visual Paper Instrument (Draw-to-Music)</span>
          </button>

          <button
            type="button"
            className={`global-exp-btn ${
              pageRoute === 'studio' ? 'active' : ''
            }`}
            onClick={() => navigateToPage('studio')}
          >
            <Music size={13} />
            <span>OpenKeys DAW & Theory Studio</span>
          </button>
        </div>
      </div>

      {/* PAGE 1: LANDING PAGE */}
      {pageRoute === 'landing' && (
        <LandingPage onNavigatePage={navigateToPage} />
      )}

      {/* PAGE 2: VISUAL PAPER INSTRUMENT (playmusictheory.net/play with ALL features unlocked!) */}
      {pageRoute === 'visual' && (
        <VisualPaperInstrument
          onNavigateToStudioWithStrokes={(convertedProj) => {
            setProject(convertedProj);
            setActiveTrackId(convertedProj.tracks[0]?.id ?? 'track-1');
            navigateToPage('studio', 'studio');
          }}
        />
      )}

      {/* PAGE 3: FULL OPENKEYS DAW & MUSIC THEORY STUDIO */}
      {pageRoute === 'studio' && (
        <>
          <TopTransportBar
            projectName={project.name}
            onRenameProject={(name) =>
              setProject((prev) => ({ ...prev, name }))
            }
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying((p) => !p)}
            onStop={() => {
              setIsPlaying(false);
              setIsRecording(false);
              currentBeatRef.current = 0;
              setCurrentBeat(0);
              soundEngine.stopAllVoices();
            }}
            isRecording={isRecording}
            onToggleRecord={() => setIsRecording((r) => !r)}
            isLooping={isLooping}
            onToggleLoop={() => setIsLooping((l) => !l)}
            currentBeat={currentBeat}
            loopBeats={project.loopBeats}
            bpm={project.bpm}
            onChangeBpm={(bpm) => setProject((prev) => ({ ...prev, bpm }))}
            metronomeEnabled={metronomeEnabled}
            onToggleMetronome={() => setMetronomeEnabled((m) => !m)}
            quantize={project.quantize}
            onChangeQuantize={(quantize: QuantizeDivision) =>
              setProject((prev) => ({ ...prev, quantize }))
            }
            swingPreset={project.swingPreset}
            swingAmount={project.swingAmount}
            onChangeSwingPreset={(swingPreset: SwingPreset) => {
              const opt = SWING_OPTIONS.find((s) => s.id === swingPreset);
              setProject((prev) => ({
                ...prev,
                swingPreset,
                swingAmount: opt ? opt.amount : 0,
              }));
            }}
            rootPitchClass={project.rootPitchClass}
            onChangeRoot={(rootPitchClass) =>
              setProject((prev) => ({ ...prev, rootPitchClass }))
            }
            scaleId={project.scaleId}
            onChangeScale={(scaleId: ScaleId) =>
              setProject((prev) => ({ ...prev, scaleId }))
            }
            enharmonic={project.enharmonic}
            onChangeEnharmonic={(enharmonic: EnharmonicPreference) =>
              setProject((prev) => ({ ...prev, enharmonic }))
            }
            masterVolume={project.masterVolume}
            onChangeMasterVolume={(masterVolume) =>
              setProject((prev) => ({ ...prev, masterVolume }))
            }
            canUndo={undoStack.length > 0}
            canRedo={redoStack.length > 0}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onQuickExportWav={handleExportWav}
            onQuickExportMidi={handleExportMidi}
            isExportingWav={isExportingWav}
            showPianoDock={uiConfig.showPianoDock}
            onTogglePianoDock={() =>
              setUiConfig((prev) => ({
                ...prev,
                showPianoDock: !prev.showPianoDock,
              }))
            }
          />

          <main className="openkeys-workspace">
            {activeTab === 'studio' && (
              <PianoRollEditor
                tracks={project.tracks}
                activeTrackId={activeTrack.id}
                onSelectTrack={setActiveTrackId}
                onUpdateTrack={(trackId, updater) =>
                  setProject((prev) => ({
                    ...prev,
                    tracks: prev.tracks.map((t) =>
                      t.id === trackId ? updater(t) : t
                    ),
                  }))
                }
                onAddTrack={handleAddTrack}
                notes={project.notes}
                onChangeNotes={handleChangeNotes}
                rootPitchClass={project.rootPitchClass}
                scaleId={project.scaleId}
                enharmonic={project.enharmonic}
                loopBeats={project.loopBeats}
                onChangeLoopBeats={(loopBeats) =>
                  setProject((prev) => ({ ...prev, loopBeats }))
                }
                currentBeat={currentBeat}
                onSeekBeat={(beat) => {
                  currentBeatRef.current = beat;
                  setCurrentBeat(beat);
                }}
                quantize={project.quantize}
                foldToScale={uiConfig.pianoRollFoldScale}
                onToggleFoldToScale={() =>
                  setUiConfig((prev) => ({
                    ...prev,
                    pianoRollFoldScale: !prev.pianoRollFoldScale,
                  }))
                }
                onAuditionNote={handleAuditionNote}
                onLoadDemoProject={(demo) => {
                  const cloned = JSON.parse(
                    JSON.stringify(demo)
                  ) as ProjectData;
                  setProject(cloned);
                  setActiveTrackId(cloned.tracks[0].id);
                  currentBeatRef.current = 0;
                  setCurrentBeat(0);
                }}
              />
            )}

            {activeTab === 'drums' && (
              <DrumMachinePanel
                drumsEnabled={drumsEnabled}
                onToggleDrumsEnabled={() => setDrumsEnabled((d) => !d)}
                drumKit={drumKit}
                onChangeDrumKit={setDrumKit}
                drumVoices={drumVoices}
                onUpdateDrumVoice={(voiceId, updater) =>
                  setDrumVoices((prev) =>
                    prev.map((v) => (v.id === voiceId ? updater(v) : v))
                  )
                }
                drumSteps={drumSteps}
                onChangeDrumSteps={setDrumSteps}
                currentBeat={currentBeat}
                isPlaying={isPlaying}
                onTogglePlay={() => setIsPlaying((p) => !p)}
                rootPitchClass={project.rootPitchClass}
                scaleId={project.scaleId}
                enharmonic={project.enharmonic}
                synthParams={activeTrack.synthParams}
                activeTrackId={activeTrack.id}
                onAppendNotesToTrack={(newNotes) => {
                  handleChangeNotes([...project.notes, ...newNotes], true);
                  setActiveTab('studio');
                }}
              />
            )}

            {activeTab === 'synth' && (
              <SynthPanel
                tracks={project.tracks}
                activeTrackId={activeTrack.id}
                onSelectTrack={setActiveTrackId}
                onUpdateTrack={(trackId, updater) =>
                  setProject((prev) => ({
                    ...prev,
                    tracks: prev.tracks.map((t) =>
                      t.id === trackId ? updater(t) : t
                    ),
                  }))
                }
                onAuditionNote={handleAuditionNote}
              />
            )}

            {activeTab === 'theory' && (
              <TheorySuite
                rootPitchClass={project.rootPitchClass}
                scaleId={project.scaleId}
                enharmonic={project.enharmonic}
                onChangeRoot={(rootPitchClass) =>
                  setProject((prev) => ({ ...prev, rootPitchClass }))
                }
                onChangeScale={(scaleId) =>
                  setProject((prev) => ({ ...prev, scaleId }))
                }
                activeMidiNotes={combinedActiveNotes}
                synthParams={activeTrack.synthParams}
                activeTrackId={activeTrack.id}
                onAppendNotesToTrack={(newNotes) => {
                  handleChangeNotes([...project.notes, ...newNotes], true);
                  setActiveTab('studio');
                }}
                referenceA4={uiConfig.referencePitchA4}
                onChangeReferenceA4={(hz) =>
                  setUiConfig((prev) => ({ ...prev, referencePitchA4: hz }))
                }
              />
            )}

            {activeTab === 'eartraining' && (
              <EarTraining
                synthParams={activeTrack.synthParams}
                enharmonic={project.enharmonic}
                rootPitchClass={project.rootPitchClass}
                scaleId={project.scaleId}
              />
            )}

            {activeTab === 'projects' && (
              <ProjectMidiPanel
                currentProject={project}
                savedProjects={savedProjects}
                onSaveProject={handleSaveProject}
                onSaveAsNewProject={handleSaveAsNewProject}
                onCreateNewBlankProject={handleCreateNewBlankProject}
                onLoadProject={(proj) => {
                  const cloned = JSON.parse(
                    JSON.stringify(proj)
                  ) as ProjectData;
                  setProject(cloned);
                  setActiveTrackId(cloned.tracks[0]?.id ?? 'track-1');
                  currentBeatRef.current = 0;
                  setCurrentBeat(0);
                }}
                onDeleteProject={async (id) => {
                  await deleteProjectFromDb(id);
                  await refreshProjectsList();
                }}
                onExportWav={handleExportWav}
                onExportMidi={handleExportMidi}
                isExportingWav={isExportingWav}
                exportStatusMessage={exportStatusMessage}
                midiSupportState={midiSupportState}
                midiDevices={midiDevices}
                midiError={midiError}
                midiLogs={midiLogs}
                onConnectMidi={() => webMidiManager.initialize()}
                activeTrackId={activeTrack.id}
                onImportMidiNotes={(importedNotes, detectedBpm) => {
                  handleChangeNotes(
                    [...project.notes, ...importedNotes],
                    true
                  );
                  if (detectedBpm && detectedBpm >= 30 && detectedBpm <= 280) {
                    setProject((prev) => ({ ...prev, bpm: detectedBpm }));
                  }
                }}
                uiConfig={uiConfig}
                onChangeUiConfig={setUiConfig}
              />
            )}
          </main>

          {uiConfig.showPianoDock && (
            <VirtualKeyboard
              rootPitchClass={project.rootPitchClass}
              scaleId={project.scaleId}
              enharmonic={project.enharmonic}
              baseOctave={baseOctave}
              onChangeBaseOctave={setBaseOctave}
              visibleOctaves={visibleOctaves}
              onChangeVisibleOctaves={setVisibleOctaves}
              velocity={keyboardVelocity}
              onChangeVelocity={setKeyboardVelocity}
              activeMidiNotes={combinedActiveNotes}
              onNoteOn={handleLiveNoteOn}
              onNoteOff={handleLiveNoteOff}
              highlightScale={uiConfig.highlightScaleOnKeyboard}
              onToggleHighlightScale={() =>
                setUiConfig((prev) => ({
                  ...prev,
                  highlightScaleOnKeyboard: !prev.highlightScaleOnKeyboard,
                }))
              }
              scaleLock={uiConfig.scaleLockKeyboard}
              onToggleScaleLock={() =>
                setUiConfig((prev) => ({
                  ...prev,
                  scaleLockKeyboard: !prev.scaleLockKeyboard,
                }))
              }
              keyLabelMode={uiConfig.keyLabelMode}
              onChangeKeyLabelMode={(keyLabelMode) =>
                setUiConfig((prev) => ({ ...prev, keyLabelMode }))
              }
              referenceA4={uiConfig.referencePitchA4}
            />
          )}
        </>
      )}
    </div>
  );
};

export default App;
