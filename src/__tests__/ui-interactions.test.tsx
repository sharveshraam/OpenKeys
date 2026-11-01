// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, fireEvent, screen } from '@testing-library/react';
import App from '../App';

afterEach(() => {
  window.history.replaceState(null, '', '#/');
  cleanup();
});

describe('OpenKeys Multi-Page Platform: Landing Page, Visual Paper Instrument & DAW Studio', () => {
  it('renders the Landing Page with interactive sound pads and navigates to the Visual Paper Instrument', () => {
    render(<App />);

    // Verify Landing Page hero & CTAs
    expect(screen.getByText(/Draw a mark\. Play a chord\./)).toBeTruthy();
    expect(screen.getByText('Open Visual Paper Instrument')).toBeTruthy();
    expect(screen.getByText('Open Full DAW & Theory Studio')).toBeTruthy();

    // Navigate to Visual Paper Instrument page
    fireEvent.click(screen.getByText('Open Visual Paper Instrument'));

    // Verify Visual Paper Instrument controls (Key, Scale, Range, Octave, Quantize, Swing, Voices 1-4, 9-Square Gallery)
    expect(screen.getByLabelText('Visual Instrument Scale')).toBeTruthy();
    expect(screen.getByText('9-Square Gallery & Photo')).toBeTruthy();
    expect(screen.getByText('4 (Drums)')).toBeTruthy();

    // Open 9-Square Gallery modal & load a preset
    fireEvent.click(screen.getByText('9-Square Gallery & Photo'));
    expect(screen.getByText('Your photo here')).toBeTruthy();
    fireEvent.click(screen.getByText('2 · Stepping Stones'));

    // Convert visual drawing into DAW Studio Piano Roll
    fireEvent.click(screen.getByText(/Open in DAW Studio/));
    expect(screen.getByDisplayValue('Visual Paper Loop')).toBeTruthy();
  });

  it('renders the DAW Studio, Virtual Piano, 16-Step Drum Machine, and Piano Roll workflows', () => {
    window.history.replaceState(null, '', '#/studio');
    render(<App />);

    expect(screen.getByText('OPENKEYS')).toBeTruthy();
    expect(screen.getByDisplayValue('Pentatonic Daydream')).toBeTruthy();

    // Virtual Piano chord hold & chord identification
    fireEvent.click(screen.getByText('Chord Hold'));
    fireEvent.pointerDown(screen.getByLabelText('Piano key C4'));
    fireEvent.pointerDown(screen.getByLabelText('Piano key E4'));
    fireEvent.pointerDown(screen.getByLabelText('Piano key G4'));
    expect(screen.getByText(/261\.6Hz/)).toBeTruthy();
    expect(screen.getByText(/Chord:/)).toBeTruthy();

    // Navigate to Drums & Arp tab
    fireEvent.click(screen.getByText('Drums & Arp'));
    expect(
      screen.getByText(/16-Step Polyphonic Drum & Percussion Sequencer/)
    ).toBeTruthy();
    expect(
      screen.getByText(/Live MPC Finger-Drumming Pad Rack/)
    ).toBeTruthy();
    expect(
      screen.getByText(/Live Arpeggiator & Diatonic Chord Pads/)
    ).toBeTruthy();

    // Test Randomize Beat & Drum Kit switching
    fireEvent.click(screen.getByText('Randomize Beat'));
    const kitSelect = screen.getByLabelText('Drum Kit') as HTMLSelectElement;
    fireEvent.change(kitSelect, { target: { value: 'electro_909' } });
    expect(kitSelect.value).toBe('electro_909');
  });

  it('navigates across Synth & FX, Theory Lab (including Guitar Fretboard), Ear & Practice, and MIDI/Export/Style panels', () => {
    window.history.replaceState(null, '', '#/studio');
    render(<App />);

    // 1. Synth & FX
    fireEvent.click(screen.getByText('Synth & FX'));
    expect(screen.getByText('ADSR AMPLITUDE & FILTER ENVELOPE')).toBeTruthy();
    const attackSlider = screen.getByLabelText('Attack Time') as HTMLInputElement;
    fireEvent.change(attackSlider, { target: { value: '0.25' } });
    expect(screen.getByText('250 ms')).toBeTruthy();

    // 2. Theory Lab + Guitar & Bass Fretboard
    fireEvent.click(screen.getByText('Theory Lab'));
    expect(screen.getByText('Key Signature & Staff Notation')).toBeTruthy();

    fireEvent.click(screen.getByText('Guitar & Bass Fretboard'));
    expect(screen.getByText(/6-String Guitar/)).toBeTruthy();
    fireEvent.click(screen.getByText(/4-String Bass/));

    fireEvent.click(screen.getByText('Chord Builder & Identifier'));
    expect(screen.getByText('Interactive Chord Builder')).toBeTruthy();

    fireEvent.click(screen.getByText('Circle of Fifths'));
    expect(screen.getByText('Interactive Circle of Fifths')).toBeTruthy();

    // 3. Ear & Practice
    fireEvent.click(screen.getByText('Ear & Practice'));
    expect(
      screen.getByText('Listen and identify the musical interval:')
    ).toBeTruthy();

    // 4. MIDI, Export & Style
    fireEvent.click(screen.getByText('MIDI, Export & Style'));
    fireEvent.click(screen.getByText('Send MIDI #60'));
    expect(screen.getByText('Virtual MIDI Loopback')).toBeTruthy();
  });
});
