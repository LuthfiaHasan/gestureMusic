// LevelManager.js - 10-level campaign configuration & rhythm challenge settings
import { musicalPhraseGenerator } from './MusicalPhraseGenerator.js';

export const LEVELS = [
  {
    level: 1,
    title: 'Neon Dawn',
    subtitle: 'Rhythm Foundation (Full Measure Chords)',
    difficultyLabel: 'BEGINNER',
    bpm: 80,
    durationBeats: 4,
    lookaheadBeats: 3.5,
    chordCount: 4,
    allowedChords: ['C', 'G', 'Am', 'F'],
    allowedFingers: [1, 5, 0, 4],
    timingWindows: { perfect: 220, great: 550, good: 1100, bad: 2000 },
    description: 'Tempo 80 BPM. Setiap chord bertahan 1 measure penuh (4 beat / ~3.0 detik). Waktu lapang untuk melihat petunjuk, membentuk gesture, dan bermain tanpa tergesa-gesa.'
  },
  {
    level: 2,
    title: 'Harmonic Pulse',
    subtitle: 'Steady Pop Ballad',
    difficultyLabel: 'EASY',
    bpm: 88,
    durationBeats: 4,
    lookaheadBeats: 3.5,
    chordCount: 4,
    allowedChords: ['C', 'G', 'Am', 'F', 'Em'],
    allowedFingers: [0, 1, 2, 3, 4],
    timingWindows: { perfect: 200, great: 500, good: 950, bad: 1800 },
    description: 'Tempo 88 BPM, 1 chord = 1 measure (4 beat / ~2.7 detik). Transisi bertahap sedikit lebih cepat.'
  },
  {
    level: 3,
    title: 'Synthwave Breeze',
    subtitle: 'Cadence Transitions',
    difficultyLabel: 'MILD',
    bpm: 100,
    durationBeats: 4,
    lookaheadBeats: 3.5,
    chordCount: 5,
    allowedChords: ['C', 'G', 'Am', 'Em', 'F', 'D'],
    allowedFingers: [0, 1, 2, 3, 4, 5],
    timingWindows: { perfect: 180, great: 450, good: 850, bad: 1600 },
    description: 'Tempo 100 BPM, 1 chord = 1 measure (4 beat / ~2.4 detik). Harmoni pop mengalir santai.'
  },
  {
    level: 4,
    title: 'Cyber Groove',
    subtitle: 'Dynamic Turnaround',
    difficultyLabel: 'MEDIUM',
    bpm: 115,
    durationBeats: 4,
    lookaheadBeats: 3.5,
    chordCount: 6,
    allowedChords: ['C', 'D', 'Em', 'F', 'G', 'Am', 'Bm'],
    allowedFingers: [0, 1, 2, 3, 4, 5, 7],
    timingWindows: { perfect: 160, great: 400, good: 750, bad: 1400 },
    description: 'Tempo 115 BPM, 1 chord = 1 measure (4 beat / ~2.08 detik). Irama 4/4 stabil dan dinamis.'
  },
  {
    level: 5,
    title: 'Midnight Reverie',
    subtitle: 'Half-Measure Cadence',
    difficultyLabel: 'STEADY',
    bpm: 80,
    durationBeats: 2,
    lookaheadBeats: 3.0,
    chordCount: 7,
    allowedChords: ['C', 'D', 'Em', 'F', 'G', 'A', 'Am', 'Bm'],
    allowedFingers: [0, 1, 2, 3, 4, 5, 6, 7],
    timingWindows: { perfect: 130, great: 320, good: 600, bad: 1050 },
    description: 'Tempo 80 BPM, 1 chord = 2 beat (~1.5 detik/chord). Mulai transisi 2 chord per measure.'
  },
  {
    level: 6,
    title: 'Electric Horizon',
    subtitle: 'Upbeat Pop Dance',
    difficultyLabel: 'ADVANCED',
    bpm: 90,
    durationBeats: 2,
    lookaheadBeats: 3.0,
    chordCount: 8,
    allowedChords: ['C', 'D', 'Em', 'F', 'G', 'A', 'Bm', 'Cmaj7'],
    allowedFingers: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    timingWindows: { perfect: 110, great: 280, good: 520, bad: 900 },
    description: 'Tempo 90 BPM, 1 chord = 2 beat (~1.33 detik/chord). Upbeat pop groove.'
  },
  {
    level: 7,
    title: 'Dual Nexus',
    subtitle: 'Bimanual Velocity',
    difficultyLabel: 'HARD',
    bpm: 100,
    durationBeats: 2,
    lookaheadBeats: 3.0,
    chordCount: 9,
    allowedChords: ['C', 'Am', 'F', 'G', 'A', 'Bm', 'Dm', 'Cmaj7', 'Em7'],
    allowedFingers: [0, 1, 4, 5, 6, 7, 8, 9, 10],
    timingWindows: { perfect: 95, great: 240, good: 450, bad: 800 },
    description: 'Tempo 100 BPM, 1 chord = 2 beat (~1.2 detik/chord) dengan variasi dua tangan.'
  },
  {
    level: 8,
    title: 'Polyphonic Rush',
    subtitle: 'Grand Finale Event Challenge',
    difficultyLabel: 'FINALE',
    bpm: 112,
    durationBeats: 2,
    lookaheadBeats: 2.8,
    chordCount: 8,
    allowedChords: ['C', 'D', 'Em', 'F', 'G', 'A', 'Bm', 'Cmaj7'],
    allowedFingers: [0, 1, 2, 3, 4, 5, 6, 7],
    timingWindows: { perfect: 100, great: 240, good: 450, bad: 800 },
    description: 'Level Puncak (Maksimal Level 8)! Selesaikan untuk mendapatkan total skor kumulatif dan klaim Hadiah Event.'
  }
];

export class LevelManager {
  constructor() {
    this.currentLevelIndex = 0;
    this.lastGeneratedPhrase = null;
  }

  getLevel(levelNum) {
    const idx = Math.max(1, Math.min(8, levelNum)) - 1;
    return LEVELS[idx];
  }

  getCurrentLevel() {
    return LEVELS[this.currentLevelIndex];
  }

  setCurrentLevel(levelNum) {
    this.currentLevelIndex = Math.max(1, Math.min(8, levelNum)) - 1;
    return this.getCurrentLevel();
  }

  nextLevel() {
    if (this.currentLevelIndex < LEVELS.length - 1) {
      this.currentLevelIndex++;
      return this.getCurrentLevel();
    }
    return null; // reached end
  }

  /**
   * Generates a coherent Indonesian Pop musical phrase for the level
   */
  generateSequenceForLevel(levelNum) {
    const phrase = musicalPhraseGenerator.generateMusicalPhrase(levelNum);
    this.lastGeneratedPhrase = phrase;
    return phrase.chords;
  }

  /**
   * Returns the metadata of the most recently generated musical phrase
   */
  getLastPhrase() {
    return this.lastGeneratedPhrase;
  }
}

export const levelManager = new LevelManager();
