// ChordLibrary.js - Comprehensive Chord Voicings & Frequencies for Gesture Synth

// Base note frequencies (Octave 4)
const NOTE_BASE_SEMITONES = {
  'C': 0, 'C#': 1, 'Db': 1,
  'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4,
  'F': 5, 'F#': 6, 'Gb': 6,
  'G': 7, 'G#': 8, 'Ab': 8,
  'A': 9, 'A#': 10, 'Bb': 10,
  'B': 11
};

export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function noteToMidi(noteName, octave = 4) {
  const match = noteName.match(/^([A-G][#b]?)(-?\d+)?$/);
  if (!match) return 60; // fallback C4
  const name = match[1];
  const oct = match[2] !== undefined ? parseInt(match[2], 10) : octave;
  const semitone = NOTE_BASE_SEMITONES[name] ?? 0;
  return (oct + 1) * 12 + semitone;
}

// Chord type definitions: intervals relative to root
export const CHORD_DEFINITIONS = {
  // Major
  '': { name: 'Major', intervals: [0, 4, 7, 12], symbol: '' },
  'm': { name: 'Minor', intervals: [0, 3, 7, 12], symbol: 'm' },
  '7': { name: 'Dominant 7th', intervals: [0, 4, 7, 10], symbol: '7' },
  'maj7': { name: 'Major 7th', intervals: [0, 4, 7, 11], symbol: 'maj7' },
  'm7': { name: 'Minor 7th', intervals: [0, 3, 7, 10], symbol: 'm7' },
  'sus2': { name: 'Suspended 2nd', intervals: [0, 2, 7, 12], symbol: 'sus2' },
  'sus4': { name: 'Suspended 4th', intervals: [0, 5, 7, 12], symbol: 'sus4' },
  'dim': { name: 'Diminished', intervals: [0, 3, 6, 12], symbol: 'dim' },
  'aug': { name: 'Augmented', intervals: [0, 4, 8, 12], symbol: 'aug' },
};

// Root notes in order of fifths or chromatic
export const ROOT_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

// Curated specific voicings for warm, musical sound
export const SPECIAL_VOICINGS = {
  'C': { rootMidi: 60, intervals: [0, 4, 7, 12], displayNotes: 'C4 - E4 - G4 - C5' },
  'D': { rootMidi: 62, intervals: [0, 4, 7, 12], displayNotes: 'D4 - F#4 - A4 - D5' },
  'E': { rootMidi: 64, intervals: [0, 4, 7, 12], displayNotes: 'E4 - G#4 - B4 - E5' },
  'F': { rootMidi: 53, intervals: [0, 7, 12, 16], displayNotes: 'F3 - C4 - F4 - A4' }, // Rich spread voicing
  'G': { rootMidi: 55, intervals: [0, 7, 12, 16], displayNotes: 'G3 - D4 - G4 - B4' },
  'A': { rootMidi: 57, intervals: [0, 7, 12, 16], displayNotes: 'A3 - E4 - A4 - C#5' },
  'B': { rootMidi: 59, intervals: [0, 7, 12, 16], displayNotes: 'B3 - F#4 - B4 - D#5' },
  
  'Am': { rootMidi: 57, intervals: [0, 7, 12, 15], displayNotes: 'A3 - E4 - A4 - C5' },
  'Bm': { rootMidi: 59, intervals: [0, 7, 12, 15], displayNotes: 'B3 - F#4 - B4 - D5' },
  'Cm': { rootMidi: 60, intervals: [0, 3, 7, 12], displayNotes: 'C4 - Eb4 - G4 - C5' },
  'Dm': { rootMidi: 62, intervals: [0, 3, 7, 12], displayNotes: 'D4 - F4 - A4 - D5' },
  'Em': { rootMidi: 52, intervals: [0, 7, 12, 15], displayNotes: 'E3 - B3 - E4 - G4' },
  'Fm': { rootMidi: 53, intervals: [0, 7, 12, 15], displayNotes: 'F3 - C4 - F4 - Ab4' },
  'Gm': { rootMidi: 55, intervals: [0, 7, 12, 15], displayNotes: 'G3 - D4 - G4 - Bb4' },

  'Cmaj7': { rootMidi: 60, intervals: [0, 4, 7, 11, 12], displayNotes: 'C4 - E4 - G4 - B4' },
  'Em7': { rootMidi: 52, intervals: [0, 7, 10, 15], displayNotes: 'E3 - B3 - D4 - G4' },
};

/**
 * Get note frequencies and display info for a given chord symbol
 */
export function getChordData(chordSymbol) {
  if (SPECIAL_VOICINGS[chordSymbol]) {
    const v = SPECIAL_VOICINGS[chordSymbol];
    const freqs = v.intervals.map(semi => midiToFreq(v.rootMidi + semi));
    const midis = v.intervals.map(semi => v.rootMidi + semi);
    return {
      symbol: chordSymbol,
      frequencies: freqs,
      midis: midis,
      displayNotes: v.displayNotes
    };
  }

  // Parse root and quality
  const match = chordSymbol.match(/^([A-G][#b]?)(.*)$/);
  if (!match) {
    // default C
    return getChordData('C');
  }
  const root = match[1];
  const quality = match[2];
  const def = CHORD_DEFINITIONS[quality] || CHORD_DEFINITIONS[''];
  
  // Decide base octave for good musical spread
  let baseOctave = 4;
  const semitone = NOTE_BASE_SEMITONES[root] ?? 0;
  if (semitone >= 5) {
    baseOctave = 3; // F, G, A, B sound richer in octave 3
  }
  const rootMidi = (baseOctave + 1) * 12 + semitone;
  const midis = def.intervals.map(semi => rootMidi + semi);
  const frequencies = midis.map(m => midiToFreq(m));

  return {
    symbol: chordSymbol,
    frequencies,
    midis,
    displayNotes: `${chordSymbol} Voicing (${root}${baseOctave})`
  };
}

/**
 * Musical Progression Templates for game sequence generation
 */
export const HARMONIC_PROGRESSIONS = [
  ['C', 'G', 'Am', 'F'],
  ['C', 'Am', 'F', 'G'],
  ['G', 'D', 'Em', 'C'],
  ['Am', 'F', 'C', 'G'],
  ['F', 'C', 'G', 'Am'],
  ['C', 'Em', 'F', 'G'],
  ['Am', 'Dm', 'G', 'C'],
  ['C', 'G', 'Am', 'Em', 'F', 'C', 'F', 'G'],
  ['Cmaj7', 'Am', 'Dm', 'G'],
  ['Em', 'C', 'G', 'D'],
  ['C', 'F', 'Am', 'G'],
  ['Dm', 'G', 'C', 'Am']
];
