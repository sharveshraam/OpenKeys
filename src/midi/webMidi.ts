export interface MidiDeviceInfo {
  id: string;
  name: string;
  manufacturer: string;
  state: string;
}

export interface MidiLogEntry {
  id: string;
  timestamp: string;
  type: 'Note On' | 'Note Off' | 'Sustain Pedal' | 'Control Change';
  channel: number;
  data1: number;
  data2: number;
  rawHex: string;
  source: string;
}

export type MidiSupportState =
  | 'uninitialized'
  | 'supported'
  | 'unsupported'
  | 'permission_denied';

type MidiNoteCallback = (
  type: 'noteon' | 'noteoff' | 'sustain',
  midiOrState: number,
  velocity: number,
  channel: number,
  logEntry: MidiLogEntry
) => void;

type MidiDevicesChangeCallback = (
  state: MidiSupportState,
  devices: MidiDeviceInfo[],
  errorMessage: string | null
) => void;

class WebMidiManager {
  private access: MIDIAccess | null = null;
  private supportState: MidiSupportState = 'uninitialized';
  private errorMessage: string | null = null;
  private selectedDeviceId: string = 'all';
  private enabled = true;
  private noteCallbacks: Set<MidiNoteCallback> = new Set();
  private deviceCallbacks: Set<MidiDevicesChangeCallback> = new Set();

  public isApiAvailable(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      typeof navigator.requestMIDIAccess === 'function'
    );
  }

  public async initialize(): Promise<{
    state: MidiSupportState;
    devices: MidiDeviceInfo[];
    error: string | null;
  }> {
    if (!this.isApiAvailable()) {
      this.supportState = 'unsupported';
      this.errorMessage =
        'Web MIDI API is not natively supported in this browser. Use Chrome, Edge, or Opera for hardware MIDI controllers, or use the built-in Virtual Piano, QWERTY Keyboard, and Virtual MIDI Generator below.';
      this.notifyDeviceListeners();
      return {
        state: this.supportState,
        devices: [],
        error: this.errorMessage,
      };
    }

    try {
      this.access = await navigator.requestMIDIAccess({ sysex: false });
      this.supportState = 'supported';
      this.errorMessage = null;
      this.bindInputs();
      this.access.onstatechange = () => {
        this.bindInputs();
        this.notifyDeviceListeners();
      };
      this.notifyDeviceListeners();
      return {
        state: this.supportState,
        devices: this.getDevices(),
        error: null,
      };
    } catch (err) {
      this.supportState = 'permission_denied';
      this.errorMessage =
        err instanceof Error
          ? `MIDI access blocked: ${err.message}. Check browser site permissions or use the Virtual MIDI Generator.`
          : 'MIDI permission was denied by the browser.';
      this.notifyDeviceListeners();
      return {
        state: this.supportState,
        devices: [],
        error: this.errorMessage,
      };
    }
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setSelectedDeviceId(id: string): void {
    this.selectedDeviceId = id;
  }

  public getDevices(): MidiDeviceInfo[] {
    if (!this.access) return [];
    const list: MidiDeviceInfo[] = [];
    this.access.inputs.forEach((input) => {
      list.push({
        id: input.id,
        name: input.name || `MIDI Input ${input.id}`,
        manufacturer: input.manufacturer || 'Generic MIDI',
        state: input.state,
      });
    });
    return list;
  }

  private bindInputs(): void {
    if (!this.access) return;
    this.access.inputs.forEach((input) => {
      input.onmidimessage = (event: MIDIMessageEvent) => {
        if (!this.enabled) return;
        if (
          this.selectedDeviceId !== 'all' &&
          input.id !== this.selectedDeviceId
        ) {
          return;
        }
        if (event.data && event.data.length >= 2) {
          this.handleRawMidiMessage(
            event.data,
            input.name || 'External MIDI'
          );
        }
      };
    });
  }

  public handleRawMidiMessage(
    data: Uint8Array | number[],
    sourceName = 'Virtual MIDI'
  ): void {
    if (!this.enabled) return;
    const status = data[0];
    const data1 = data[1] ?? 0;
    const data2 = data[2] ?? 0;
    const command = status & 0xf0;
    const channel = (status & 0x0f) + 1;

    const rawHex = Array.from(data)
      .map((b) => b.toString(16).toUpperCase().padStart(2, '0'))
      .join(' ');
    const timestamp = new Date().toLocaleTimeString([], {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    if (command === 0x90 && data2 > 0) {
      const log: MidiLogEntry = {
        id: `${Date.now()}-${Math.random()}`,
        timestamp,
        type: 'Note On',
        channel,
        data1,
        data2,
        rawHex,
        source: sourceName,
      };
      const velocity = Math.max(0.05, Math.min(1, data2 / 127));
      this.noteCallbacks.forEach((cb) =>
        cb('noteon', data1, velocity, channel, log)
      );
    } else if (command === 0x80 || (command === 0x90 && data2 === 0)) {
      const log: MidiLogEntry = {
        id: `${Date.now()}-${Math.random()}`,
        timestamp,
        type: 'Note Off',
        channel,
        data1,
        data2,
        rawHex,
        source: sourceName,
      };
      this.noteCallbacks.forEach((cb) =>
        cb('noteoff', data1, 0, channel, log)
      );
    } else if (command === 0xb0 && data1 === 64) {
      const isDown = data2 >= 64 ? 1 : 0;
      const log: MidiLogEntry = {
        id: `${Date.now()}-${Math.random()}`,
        timestamp,
        type: 'Sustain Pedal',
        channel,
        data1,
        data2,
        rawHex,
        source: sourceName,
      };
      this.noteCallbacks.forEach((cb) =>
        cb('sustain', isDown, data2 / 127, channel, log)
      );
    }
  }

  public simulateMidiNote(midi: number, velocity127 = 100, durationMs = 350): void {
    this.handleRawMidiMessage([0x90, midi, velocity127], 'Virtual MIDI Loopback');
    setTimeout(() => {
      this.handleRawMidiMessage([0x80, midi, 0], 'Virtual MIDI Loopback');
    }, durationMs);
  }

  public onMidiMessage(cb: MidiNoteCallback): () => void {
    this.noteCallbacks.add(cb);
    return () => this.noteCallbacks.delete(cb);
  }

  public onDevicesChange(cb: MidiDevicesChangeCallback): () => void {
    this.deviceCallbacks.add(cb);
    return () => this.deviceCallbacks.delete(cb);
  }

  private notifyDeviceListeners(): void {
    const devices = this.getDevices();
    this.deviceCallbacks.forEach((cb) =>
      cb(this.supportState, devices, this.errorMessage)
    );
  }
}

export const webMidiManager = new WebMidiManager();
