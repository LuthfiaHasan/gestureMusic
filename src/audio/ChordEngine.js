// ChordEngine.js - High level chord management, progression handling, and chord querying
import { getChordData, HARMONIC_PROGRESSIONS, CHORD_DEFINITIONS } from './ChordLibrary.js';
import { audioManager } from './AudioManager.js';

class ChordEngine {
  constructor() {
    this.currentChord = null;
    this.history = [];
  }

  play(chordSymbol) {
    const data = audioManager.playChord(chordSymbol);
    this.currentChord = data;
    this.history.push({ chord: chordSymbol, timestamp: Date.now() });
    if (this.history.length > 20) this.history.shift();
    return data;
  }

  stop() {
    audioManager.stopPreviousVoices();
    this.currentChord = null;
  }

  getChordInfo(chordSymbol) {
    return getChordData(chordSymbol);
  }

  /**
   * Generates a musical chord progression based on harmonic templates
   */
  generateProgression(length = 4, allowedChords = null) {
    // Pick a template
    let matchingTemplates = HARMONIC_PROGRESSIONS;
    if (allowedChords && allowedChords.length > 0) {
      const filtered = HARMONIC_PROGRESSIONS.filter(prog => 
        prog.every(ch => allowedChords.includes(ch))
      );
      if (filtered.length > 0) matchingTemplates = filtered;
    }

    const template = matchingTemplates[Math.floor(Math.random() * matchingTemplates.length)];
    const result = [];

    // Build desired length from template with variation
    for (let i = 0; i < length; i++) {
      const chord = template[i % template.length];
      result.push(chord);
    }
    return result;
  }
}

export const chordEngine = new ChordEngine();
