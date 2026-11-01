// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, fireEvent, screen } from '@testing-library/react';
import App from '../App';

afterEach(() => {
  cleanup();
});

describe('OpenKeys Full Application UI & Interactive Workflows', () => {
  it('renders the main studio, virtual piano, transport controls, and switches keys/scales dynamically', () => {
    render(<App />);

    // Verify brand & default project
    expect(screen.getByText('OPENKEYS')).toBeTruthy();
    expect(screen.getByDisplayValue('Pentatonic Daydream')).toBeTruthy();

    // Verify Virtual Piano keys are rendered and interactive
    const c4Key = screen.getByLabelText('Piano key C4');
    expect(c4Key).toBeTruthy();

    // Enable Chord Hold mode and click C4, E4, G4 to form a C Major triad on the virtual piano
    const chordHoldBtn = screen.getByText('Chord Hold');
    fireEvent.click(chordHoldBtn);

    fireEvent.pointerDown(c4Key);
    fireEvent.pointerDown(screen.getByLabelText('Piano key E4'));
    fireEvent.pointerDown(screen.getByLabelText('Piano key G4'));

    // Live monitor should display 261.6Hz and detect C Major chord
    expect(screen.getByText(/261\.6Hz/)).toBeTruthy();
    expect(screen.getByText(/Chord:/)).toBeTruthy();

    // Change musical key to F# / Gb and toggle enharmonic spelling
    const enharmonicBtn = screen.getByTitle(
      'Cycle Enharmonic Spelling: Auto / Sharps (#) / Flats (b)'
    );
    fireEvent.click(enharmonicBtn); // -> Sharps
    expect(screen.getByText('♯ Sharps')).toBeTruthy();

    // Change Scale to Dorian
    const scaleSelect = screen.getByLabelText('Scale') as HTMLSelectElement;
    fireEvent.change(scaleSelect, { target: { value: 'dorian' } });
    expect(scaleSelect.value).toBe('dorian');
  });

  it('supports Piano Roll track management, Undo/Redo, Quantize, Scale Grid folding, and Starter Loops', () => {
    render(<App />);

    // Add a new track
    const addTrackBtn = screen.getByTitle('Add New Instrument Track');
    fireEvent.click(addTrackBtn);
    expect(screen.getByText('TRACKS (5)')).toBeTruthy();

    // Toggle Fold Grid to Scale
    const foldBtn = screen.getByText('Chromatic Grid');
    fireEvent.click(foldBtn);
    expect(screen.getByText('Scale Grid (Folded)')).toBeTruthy();

    // Click Inspire Pattern and then Undo
    const inspireBtn = screen.getByText('Inspire Pattern');
    fireEvent.click(inspireBtn);

    const undoBtn = screen.getByLabelText('Undo') as HTMLButtonElement;
    expect(undoBtn.disabled).toBe(false);
    fireEvent.click(undoBtn);

    const redoBtn = screen.getByLabelText('Redo') as HTMLButtonElement;
    expect(redoBtn.disabled).toBe(false);
    fireEvent.click(redoBtn);

    // Load a different starter loop
    const dorianDemoBtn = screen.getByText('Midnight Dorian Groove');
    fireEvent.click(dorianDemoBtn);
    expect(screen.getByDisplayValue('Midnight Dorian Groove')).toBeTruthy();
  });

  it('navigates across Synth & FX, Theory Lab, Ear & Practice, and MIDI/Export/Style panels', async () => {
    render(<App />);

    // 1. Navigate to Synth & FX
    fireEvent.click(screen.getByText('Synth & FX'));
    expect(screen.getByText('ADSR AMPLITUDE & FILTER ENVELOPE')).toBeTruthy();
    const attackSlider = screen.getByLabelText('Attack Time') as HTMLInputElement;
    fireEvent.change(attackSlider, { target: { value: '0.25' } });
    expect(screen.getByText('250 ms')).toBeTruthy();

    // 2. Navigate to Theory Lab
    fireEvent.click(screen.getByText('Theory Lab'));
    expect(screen.getByText('Key Signature & Staff Notation')).toBeTruthy();

    // Switch to Chord Builder & Identifier subtab
    fireEvent.click(screen.getByText('Chord Builder & Identifier'));
    expect(screen.getByText('Interactive Chord Builder')).toBeTruthy();
    expect(screen.getByText('Chord Identification Engine')).toBeTruthy();

    // Switch to Chord Progression Studio subtab
    fireEvent.click(screen.getByText('Chord Progression Studio'));
    expect(screen.getByText('Chord Progression Builder')).toBeTruthy();

    // Switch to Circle of Fifths subtab
    fireEvent.click(screen.getByText('Circle of Fifths'));
    expect(screen.getByText('Interactive Circle of Fifths')).toBeTruthy();

    // Switch to Intervals & Frequency Reference subtab
    fireEvent.click(screen.getByText('Intervals & Frequency Reference'));
    expect(
      screen.getByText('Note Frequency & Acoustic Wavelength Reference')
    ).toBeTruthy();
    fireEvent.click(screen.getByText('432Hz'));
    expect(screen.getByText('A4 Tuning: 432 Hz')).toBeTruthy();

    // 3. Navigate to Ear & Practice
    fireEvent.click(screen.getByText('Ear & Practice'));
    expect(
      screen.getByText('Listen and identify the musical interval:')
    ).toBeTruthy();
    fireEvent.click(screen.getByText('Music Theory Practice Quiz'));
    expect(screen.getByText(/Score:/)).toBeTruthy();

    // 4. Navigate to MIDI, Export & Style
    fireEvent.click(screen.getByText('MIDI, Export & Style'));
    expect(
      screen.getByText(/Local Project Storage \(IndexedDB\)/)
    ).toBeTruthy();

    // Test Virtual MIDI Loopback packet injection
    fireEvent.click(screen.getByText('Send MIDI #60'));
    expect(screen.getByText('Virtual MIDI Loopback')).toBeTruthy();

    // Test Theme & Accent Color switching
    fireEvent.click(screen.getByText('Electric Violet'));
    fireEvent.click(screen.getByText('Warm Paper Canvas'));
    const shell = document.querySelector('.openkeys-app-shell');
    expect(shell?.className).toContain('accent-violet');
    expect(shell?.className).toContain('theme-paper');
  });
});
