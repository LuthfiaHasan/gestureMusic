// TaragakPulangService.js - Real-Time Finger Rhythm Engine
// Lagu Minang: "TARAGAK PULANG / TARAGAK KAMPUANG" (Dira Sati, Eja, Abdi)
// Dual-screen rhythm gameplay: Pre-set Minang melody, finger gestures (1-5 fingers), falling tiles stream & tempo radar.

import { audioManager } from '../audio/AudioManager.js';

export const TARAGAK_PULANG_NOTES = [
  // ========================================================
  // BAIT 1: "Alah batahun rantau manjadi labuahan hiduik"
  // ========================================================
  { index: 0, section: 'BAIT 1', beat: 1.0, note: 'G4', midi: 67, solfege: 'Sol', fingerCount: 5, emoji: '🖐️', lyric: 'A -', duration: 0.75, chord: 'C' },
  { index: 1, section: 'BAIT 1', beat: 1.75, note: 'G4', midi: 67, solfege: 'Sol', fingerCount: 5, emoji: '🖐️', lyric: 'lah', duration: 0.75, chord: 'C' },
  { index: 2, section: 'BAIT 1', beat: 2.5, note: 'E4', midi: 64, solfege: 'Mi', fingerCount: 3, emoji: '🤟', lyric: 'ba -', duration: 0.75, chord: 'C' },
  { index: 3, section: 'BAIT 1', beat: 3.25, note: 'F4', midi: 65, solfege: 'Fa', fingerCount: 4, emoji: '🖐️', lyric: 'ta -', duration: 0.75, chord: 'C' },
  { index: 4, section: 'BAIT 1', beat: 4.0, note: 'G4', midi: 67, solfege: 'Sol', fingerCount: 5, emoji: '🖐️', lyric: 'hun', duration: 1.5, chord: 'C' },

  { index: 5, section: 'BAIT 1', beat: 5.75, note: 'G4', midi: 67, solfege: 'Sol', fingerCount: 5, emoji: '🖐️', lyric: 'ran -', duration: 0.75, chord: 'C' },
  { index: 6, section: 'BAIT 1', beat: 6.5, note: 'G4', midi: 67, solfege: 'Sol', fingerCount: 5, emoji: '🖐️', lyric: 'tau', duration: 0.75, chord: 'C' },
  { index: 7, section: 'BAIT 1', beat: 7.25, note: 'E4', midi: 64, solfege: 'Mi', fingerCount: 3, emoji: '🤟', lyric: 'man -', duration: 0.75, chord: 'C' },
  { index: 8, section: 'BAIT 1', beat: 8.0, note: 'F4', midi: 65, solfege: 'Fa', fingerCount: 4, emoji: '🖐️', lyric: 'ja -', duration: 0.75, chord: 'C' },
  { index: 9, section: 'BAIT 1', beat: 8.75, note: 'G4', midi: 67, solfege: 'Sol', fingerCount: 5, emoji: '🖐️', lyric: 'di', duration: 1.5, chord: 'C' },

  { index: 10, section: 'BAIT 1', beat: 10.5, note: 'F4', midi: 65, solfege: 'Fa', fingerCount: 4, emoji: '🖐️', lyric: 'la -', duration: 0.75, chord: 'F' },
  { index: 11, section: 'BAIT 1', beat: 11.25, note: 'E4', midi: 64, solfege: 'Mi', fingerCount: 3, emoji: '🤟', lyric: 'bu -', duration: 0.75, chord: 'F' },
  { index: 12, section: 'BAIT 1', beat: 12.0, note: 'D4', midi: 62, solfege: 'Re', fingerCount: 2, emoji: '✌️', lyric: 'a -', duration: 0.75, chord: 'G' },
  { index: 13, section: 'BAIT 1', beat: 12.75, note: 'E4', midi: 64, solfege: 'Mi', fingerCount: 3, emoji: '🤟', lyric: 'han', duration: 0.75, chord: 'G' },
  { index: 14, section: 'BAIT 1', beat: 13.5, note: 'C4', midi: 60, solfege: 'Do', fingerCount: 1, emoji: '☝️', lyric: 'hi - duik', duration: 2.0, chord: 'C' },

  // ========================================================
  // BAIT 2: "Tabayang kampuang tampek bamain maso dulunyo"
  // ========================================================
  { index: 15, section: 'BAIT 2', beat: 16.0, note: 'G4', midi: 67, solfege: 'Sol', fingerCount: 5, emoji: '🖐️', lyric: 'Ta -', duration: 0.75, chord: 'C' },
  { index: 16, section: 'BAIT 2', beat: 16.75, note: 'G4', midi: 67, solfege: 'Sol', fingerCount: 5, emoji: '🖐️', lyric: 'ba -', duration: 0.75, chord: 'C' },
  { index: 17, section: 'BAIT 2', beat: 17.5, note: 'E4', midi: 64, solfege: 'Mi', fingerCount: 3, emoji: '🤟', lyric: 'yang', duration: 0.75, chord: 'C' },
  { index: 18, section: 'BAIT 2', beat: 18.25, note: 'F4', midi: 65, solfege: 'Fa', fingerCount: 4, emoji: '🖐️', lyric: 'kam -', duration: 0.75, chord: 'C' },
  { index: 19, section: 'BAIT 2', beat: 19.0, note: 'G4', midi: 67, solfege: 'Sol', fingerCount: 5, emoji: '🖐️', lyric: 'puang', duration: 1.5, chord: 'C' },

  { index: 20, section: 'BAIT 2', beat: 20.75, note: 'G4', midi: 67, solfege: 'Sol', fingerCount: 5, emoji: '🖐️', lyric: 'tam -', duration: 0.75, chord: 'C' },
  { index: 21, section: 'BAIT 2', beat: 21.5, note: 'G4', midi: 67, solfege: 'Sol', fingerCount: 5, emoji: '🖐️', lyric: 'pek', duration: 0.75, chord: 'C' },
  { index: 22, section: 'BAIT 2', beat: 22.25, note: 'E4', midi: 64, solfege: 'Mi', fingerCount: 3, emoji: '🤟', lyric: 'ba -', duration: 0.75, chord: 'C' },
  { index: 23, section: 'BAIT 2', beat: 23.0, note: 'F4', midi: 65, solfege: 'Fa', fingerCount: 4, emoji: '🖐️', lyric: 'ma -', duration: 0.75, chord: 'C' },
  { index: 24, section: 'BAIT 2', beat: 23.75, note: 'G4', midi: 67, solfege: 'Sol', fingerCount: 5, emoji: '🖐️', lyric: 'in', duration: 1.5, chord: 'C' },

  { index: 25, section: 'BAIT 2', beat: 25.5, note: 'F4', midi: 65, solfege: 'Fa', fingerCount: 4, emoji: '🖐️', lyric: 'ma -', duration: 0.75, chord: 'F' },
  { index: 26, section: 'BAIT 2', beat: 26.25, note: 'E4', midi: 64, solfege: 'Mi', fingerCount: 3, emoji: '🤟', lyric: 'so', duration: 0.75, chord: 'F' },
  { index: 27, section: 'BAIT 2', beat: 27.0, note: 'D4', midi: 62, solfege: 'Re', fingerCount: 2, emoji: '✌️', lyric: 'du -', duration: 0.75, chord: 'G' },
  { index: 28, section: 'BAIT 2', beat: 27.75, note: 'E4', midi: 64, solfege: 'Mi', fingerCount: 3, emoji: '🤟', lyric: 'lu -', duration: 0.75, chord: 'G' },
  { index: 29, section: 'BAIT 2', beat: 28.5, note: 'C4', midi: 60, solfege: 'Do', fingerCount: 1, emoji: '☝️', lyric: 'nyo', duration: 2.0, chord: 'C' },

  // ========================================================
  // BAIT 3: "Rindu manahun manyeso diri, siang jo malam samakin laruik"
  // ========================================================
  { index: 30, section: 'BAIT 3', beat: 31.0, note: 'C4', midi: 60, solfege: 'Do', fingerCount: 1, emoji: '☝️', lyric: 'Rin -', duration: 0.75, chord: 'Am' },
  { index: 31, section: 'BAIT 3', beat: 31.75, note: 'D4', midi: 62, solfege: 'Re', fingerCount: 2, emoji: '✌️', lyric: 'du', duration: 0.75, chord: 'Am' },
  { index: 32, section: 'BAIT 3', beat: 32.5, note: 'E4', midi: 64, solfege: 'Mi', fingerCount: 3, emoji: '🤟', lyric: 'ma -', duration: 0.75, chord: 'Am' },
  { index: 33, section: 'BAIT 3', beat: 33.25, note: 'F4', midi: 65, solfege: 'Fa', fingerCount: 4, emoji: '🖖', lyric: 'na -', duration: 0.75, chord: 'Dm' },
  { index: 34, section: 'BAIT 3', beat: 34.0, note: 'G4', midi: 67, solfege: 'Sol', fingerCount: 5, emoji: '🖐️', lyric: 'hun', duration: 1.5, chord: 'Dm' },

  { index: 35, section: 'BAIT 3', beat: 35.75, note: 'A4', midi: 69, solfege: 'La', fingerCount: 6, emoji: '🖐️☝️', lyric: 'ma -', duration: 0.75, chord: 'G' },
  { index: 36, section: 'BAIT 3', beat: 36.5, note: 'G4', midi: 67, solfege: 'Sol', fingerCount: 5, emoji: '🖐️', lyric: 'nye -', duration: 0.75, chord: 'G' },
  { index: 37, section: 'BAIT 3', beat: 37.25, note: 'F4', midi: 65, solfege: 'Fa', fingerCount: 4, emoji: '🖖', lyric: 'so', duration: 0.75, chord: 'G' },
  { index: 38, section: 'BAIT 3', beat: 38.0, note: 'E4', midi: 64, solfege: 'Mi', fingerCount: 3, emoji: '🤟', lyric: 'di -', duration: 0.75, chord: 'G' },
  { index: 39, section: 'BAIT 3', beat: 38.75, note: 'C4', midi: 60, solfege: 'Do', fingerCount: 1, emoji: '☝️', lyric: 'ri', duration: 1.5, chord: 'C' },

  { index: 40, section: 'BAIT 3', beat: 40.5, note: 'D4', midi: 62, solfege: 'Re', fingerCount: 2, emoji: '✌️', lyric: 'si -', duration: 0.75, chord: 'Dm' },
  { index: 41, section: 'BAIT 3', beat: 41.25, note: 'E4', midi: 64, solfege: 'Mi', fingerCount: 3, emoji: '🤟', lyric: 'ang', duration: 0.75, chord: 'Dm' },
  { index: 42, section: 'BAIT 3', beat: 42.0, note: 'F4', midi: 65, solfege: 'Fa', fingerCount: 4, emoji: '🖖', lyric: 'jo', duration: 0.75, chord: 'G' },
  { index: 43, section: 'BAIT 3', beat: 42.75, note: 'G4', midi: 67, solfege: 'Sol', fingerCount: 5, emoji: '🖐️', lyric: 'ma -', duration: 0.75, chord: 'G' },
  { index: 44, section: 'BAIT 3', beat: 43.5, note: 'A4', midi: 69, solfege: 'La', fingerCount: 6, emoji: '🖐️☝️', lyric: 'lam', duration: 1.0, chord: 'G' },
  { index: 45, section: 'BAIT 3', beat: 44.75, note: 'E4', midi: 64, solfege: 'Mi', fingerCount: 3, emoji: '🤟', lyric: 'sa -', duration: 0.75, chord: 'G' },
  { index: 46, section: 'BAIT 3', beat: 45.5, note: 'D4', midi: 62, solfege: 'Re', fingerCount: 2, emoji: '✌️', lyric: 'ma - kin', duration: 0.75, chord: 'G' },
  { index: 47, section: 'BAIT 3', beat: 46.25, note: 'C4', midi: 60, solfege: 'Do', fingerCount: 1, emoji: '☝️', lyric: 'la - ruik', duration: 2.0, chord: 'C' },

  // ========================================================
  // REFF: "Mandayo badan pulang ka kampuang nan denai cinto"
  // ========================================================
  { index: 48, section: 'REFF', beat: 48.5, note: 'G4', midi: 67, solfege: 'Sol', fingerCount: 5, emoji: '🖐️', lyric: 'Man -', duration: 0.75, chord: 'F' },
  { index: 49, section: 'REFF', beat: 49.25, note: 'A4', midi: 69, solfege: 'La', fingerCount: 6, emoji: '🖐️☝️', lyric: 'da -', duration: 0.75, chord: 'F' },
  { index: 50, section: 'REFF', beat: 50.0, note: 'B4', midi: 71, solfege: 'Si', fingerCount: 7, emoji: '🖐️✌️', lyric: 'yo', duration: 0.75, chord: 'F' },
  { index: 51, section: 'REFF', beat: 50.75, note: 'E4', midi: 64, solfege: 'Mi', fingerCount: 3, emoji: '🤟', lyric: 'ba -', duration: 0.75, chord: 'C' },
  { index: 52, section: 'REFF', beat: 51.5, note: 'D4', midi: 62, solfege: 'Re', fingerCount: 2, emoji: '✌️', lyric: 'dan', duration: 1.0, chord: 'C' },

  { index: 53, section: 'REFF', beat: 52.75, note: 'D4', midi: 62, solfege: 'Re', fingerCount: 2, emoji: '✌️', lyric: 'pu -', duration: 0.75, chord: 'G' },
  { index: 54, section: 'REFF', beat: 53.5, note: 'E4', midi: 64, solfege: 'Mi', fingerCount: 3, emoji: '🤟', lyric: 'lang', duration: 0.75, chord: 'G' },
  { index: 55, section: 'REFF', beat: 54.25, note: 'A4', midi: 69, solfege: 'La', fingerCount: 6, emoji: '🖐️☝️', lyric: 'ka', duration: 0.75, chord: 'G' },
  { index: 56, section: 'REFF', beat: 55.0, note: 'B4', midi: 71, solfege: 'Si', fingerCount: 7, emoji: '🖐️✌️', lyric: 'kam -', duration: 0.75, chord: 'G' },
  { index: 57, section: 'REFF', beat: 55.75, note: 'C5', midi: 72, solfege: 'Do\'', fingerCount: 8, emoji: '🖐️🤟', lyric: 'puang', duration: 1.5, chord: 'G' },

  { index: 58, section: 'REFF', beat: 57.5, note: 'B4', midi: 71, solfege: 'Si', fingerCount: 7, emoji: '🖐️✌️', lyric: 'nan', duration: 0.75, chord: 'G' },
  { index: 59, section: 'REFF', beat: 58.25, note: 'A4', midi: 69, solfege: 'La', fingerCount: 6, emoji: '🖐️☝️', lyric: 'de -', duration: 0.75, chord: 'G' },
  { index: 60, section: 'REFF', beat: 59.0, note: 'G4', midi: 67, solfege: 'Sol', fingerCount: 5, emoji: '🖐️', lyric: 'nai', duration: 0.75, chord: 'G' },
  { index: 61, section: 'REFF', beat: 59.75, note: 'C4', midi: 60, solfege: 'Do', fingerCount: 1, emoji: '☝️', lyric: 'cin - to', duration: 2.0, chord: 'C' },

  // ========================================================
  // REFF LANJUTAN: "Oh mandeh kanduang, usah risaukan denai di siko"
  // ========================================================
  { index: 62, section: 'CHORUS', beat: 62.5, note: 'G4', midi: 67, solfege: 'Sol', fingerCount: 5, emoji: '🖐️', lyric: 'Oh', duration: 0.75, chord: 'C' },
  { index: 63, section: 'CHORUS', beat: 63.25, note: 'A4', midi: 69, solfege: 'La', fingerCount: 6, emoji: '🖐️☝️', lyric: 'man -', duration: 0.75, chord: 'C' },
  { index: 64, section: 'CHORUS', beat: 64.0, note: 'B4', midi: 71, solfege: 'Si', fingerCount: 7, emoji: '🖐️✌️', lyric: 'deh', duration: 0.75, chord: 'C' },
  { index: 65, section: 'CHORUS', beat: 64.75, note: 'C5', midi: 72, solfege: 'Do\'', fingerCount: 8, emoji: '🖐️🤟', lyric: 'kan -', duration: 0.75, chord: 'C' },
  { index: 66, section: 'CHORUS', beat: 65.5, note: 'D5', midi: 74, solfege: 'Re\'', fingerCount: 9, emoji: '🖐️🖖', lyric: 'duang...', duration: 1.5, chord: 'C' },

  { index: 67, section: 'CHORUS', beat: 67.25, note: 'C5', midi: 72, solfege: 'Do\'', fingerCount: 8, emoji: '🖐️🤟', lyric: 'u -', duration: 0.75, chord: 'F' },
  { index: 68, section: 'CHORUS', beat: 68.0, note: 'B4', midi: 71, solfege: 'Si', fingerCount: 7, emoji: '🖐️✌️', lyric: 'sah', duration: 0.75, chord: 'F' },
  { index: 69, section: 'CHORUS', beat: 68.75, note: 'A4', midi: 69, solfege: 'La', fingerCount: 6, emoji: '🖐️☝️', lyric: 'ri -', duration: 0.75, chord: 'F' },
  { index: 70, section: 'CHORUS', beat: 69.5, note: 'G4', midi: 67, solfege: 'Sol', fingerCount: 5, emoji: '🖐️', lyric: 'sau - kan', duration: 1.0, chord: 'G' },
  { index: 71, section: 'CHORUS', beat: 70.75, note: 'E4', midi: 64, solfege: 'Mi', fingerCount: 3, emoji: '🤟', lyric: 'de - nai', duration: 0.75, chord: 'G' },
  { index: 72, section: 'CHORUS', beat: 71.5, note: 'C4', midi: 60, solfege: 'Do', fingerCount: 1, emoji: '☝️', lyric: 'di si - ko', duration: 2.0, chord: 'C' },

  // ========================================================
  // CLIMAX: "Oi dunsanak marilah kito, pulang ka kampuang basamo-samo"
  // ========================================================
  { index: 73, section: 'PULANG BASAMO', beat: 74.0, note: 'G4', midi: 67, solfege: 'Sol', fingerCount: 5, emoji: '🖐️', lyric: 'Oi', duration: 0.75, chord: 'C' },
  { index: 74, section: 'PULANG BASAMO', beat: 74.75, note: 'A4', midi: 69, solfege: 'La', fingerCount: 6, emoji: '🖐️☝️', lyric: 'dun -', duration: 0.75, chord: 'C' },
  { index: 75, section: 'PULANG BASAMO', beat: 75.5, note: 'B4', midi: 71, solfege: 'Si', fingerCount: 7, emoji: '🖐️✌️', lyric: 'sa -', duration: 0.75, chord: 'C' },
  { index: 76, section: 'PULANG BASAMO', beat: 76.25, note: 'C5', midi: 72, solfege: 'Do\'', fingerCount: 8, emoji: '🖐️🤟', lyric: 'nak', duration: 1.0, chord: 'C' },

  { index: 77, section: 'PULANG BASAMO', beat: 77.5, note: 'B4', midi: 71, solfege: 'Si', fingerCount: 7, emoji: '🖐️✌️', lyric: 'ma -', duration: 0.75, chord: 'F' },
  { index: 78, section: 'PULANG BASAMO', beat: 78.25, note: 'A4', midi: 69, solfege: 'La', fingerCount: 6, emoji: '🖐️☝️', lyric: 'ri -', duration: 0.75, chord: 'F' },
  { index: 79, section: 'PULANG BASAMO', beat: 79.0, note: 'G4', midi: 67, solfege: 'Sol', fingerCount: 5, emoji: '🖐️', lyric: 'lah', duration: 0.75, chord: 'G' },
  { index: 80, section: 'PULANG BASAMO', beat: 79.75, note: 'C4', midi: 60, solfege: 'Do', fingerCount: 1, emoji: '☝️', lyric: 'ki - to', duration: 1.5, chord: 'C' },

  { index: 81, section: 'PULANG BASAMO', beat: 81.5, note: 'A4', midi: 69, solfege: 'La', fingerCount: 6, emoji: '🖐️☝️', lyric: 'Pu -', duration: 0.75, chord: 'G' },
  { index: 82, section: 'PULANG BASAMO', beat: 82.25, note: 'B4', midi: 71, solfege: 'Si', fingerCount: 7, emoji: '🖐️✌️', lyric: 'lang', duration: 0.75, chord: 'G' },
  { index: 83, section: 'PULANG BASAMO', beat: 83.0, note: 'C5', midi: 72, solfege: 'Do\'', fingerCount: 8, emoji: '🖐️🤟', lyric: 'ka', duration: 0.75, chord: 'G' },
  { index: 84, section: 'PULANG BASAMO', beat: 83.75, note: 'D5', midi: 74, solfege: 'Re\'', fingerCount: 9, emoji: '🖐️🖖', lyric: 'kam -', duration: 0.75, chord: 'G' },
  { index: 85, section: 'PULANG BASAMO', beat: 84.5, note: 'E5', midi: 76, solfege: 'Mi\'', fingerCount: 10, emoji: '🙌', lyric: 'puang', duration: 1.0, chord: 'G' },

  { index: 86, section: 'PULANG BASAMO', beat: 85.75, note: 'C5', midi: 72, solfege: 'Do\'', fingerCount: 8, emoji: '🖐️🤟', lyric: 'ba -', duration: 0.75, chord: 'G' },
  { index: 87, section: 'PULANG BASAMO', beat: 86.5, note: 'D5', midi: 74, solfege: 'Re\'', fingerCount: 9, emoji: '🖐️🖖', lyric: 'sa -', duration: 0.75, chord: 'G' },
  { index: 88, section: 'PULANG BASAMO', beat: 87.25, note: 'E5', midi: 76, solfege: 'Mi\'', fingerCount: 10, emoji: '🙌', lyric: 'mo -', duration: 0.75, chord: 'G' },
  { index: 89, section: 'PULANG BASAMO', beat: 88.0, note: 'E5', midi: 76, solfege: 'Mi\'', fingerCount: 10, emoji: '🙌', lyric: 'sa - mo! (10 JARI)', duration: 2.5, chord: 'C' },
];

export const TARAGAK_DIFFICULTIES = {
  SLOW: {
    id: 'SLOW',
    name: 'Pelan (Santai)',
    bpm: 65,
    speedFactor: 0.85,
    pixelSpeed: 300,
    tolerances: {
      perfect: 120,
      great: 200,
      good: 320,
    },
    label: '65 BPM • Slow Pace • Latihan Jari',
    badge: '🐢 PELAN',
    color: '#00ff88',
  },
  NORMAL: {
    id: 'NORMAL',
    name: 'Normal (Standar)',
    bpm: 88,
    speedFactor: 1.0,
    pixelSpeed: 380,
    tolerances: {
      perfect: 95,
      great: 165,
      good: 270,
    },
    label: '88 BPM • Standard Tempo • Irama Pas',
    badge: '🚶 NORMAL',
    color: '#00f7ff',
  },
  FAST: {
    id: 'FAST',
    name: 'Cepat (Tantangan)',
    bpm: 116,
    speedFactor: 1.3,
    pixelSpeed: 480,
    tolerances: {
      perfect: 75,
      great: 130,
      good: 210,
    },
    label: '116 BPM • High Speed • Uji Refleks',
    badge: '⚡ CEPAT',
    color: '#ff007f',
  },
};

export class TaragakPulangService {
  constructor() {
    this.notes = TARAGAK_PULANG_NOTES;
    this.currentDifficultyKey = 'NORMAL';
    this.difficulty = TARAGAK_DIFFICULTIES.NORMAL;

    // Timeline state
    this.isPlaying = false;
    this.isPaused = false;
    this.startTime = 0;
    this.currentTimeMs = 0;
    this.pauseOffsetMs = 0;
    this.animFrameId = null;

    // Pre-calculated target items with timestamps
    this.targets = [];
    this.currentTargetIndex = 0;
    this.lastProcessedIndex = -1;

    // Metronome / Beat Tracking
    this.lastBeatScheduled = -1;
    this.countInBeats = 4;
    this.countInDurationMs = 0;

    // Score & Combo State
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.hits = {
      perfect: 0,
      great: 0,
      good: 0,
      miss: 0,
    };
    this.lastRating = null;

    // Sound Options
    this.isBackingMusicEnabled = true;
    this.isMelodyGuideEnabled = false;

    // Callbacks
    this.onFrameTick = null;
    this.onBeatTick = null;
    this.onTargetHit = null;
    this.onSongComplete = null;
  }

  toggleBackingMusic() {
    this.isBackingMusicEnabled = !this.isBackingMusicEnabled;
    return this.isBackingMusicEnabled;
  }

  toggleMelodyGuide() {
    this.isMelodyGuideEnabled = !this.isMelodyGuideEnabled;
    return this.isMelodyGuideEnabled;
  }

  setDifficulty(diffKey) {
    if (TARAGAK_DIFFICULTIES[diffKey]) {
      this.currentDifficultyKey = diffKey;
      this.difficulty = TARAGAK_DIFFICULTIES[diffKey];
      if (this.isPlaying) {
        this.restart();
      }
    }
  }

  setup() {
    this.stop();
    const bpm = this.difficulty.bpm;
    const msPerBeat = (60 / bpm) * 1000;
    this.countInDurationMs = this.countInBeats * msPerBeat;

    this.targets = this.notes.map((n, idx) => {
      const targetTimeMs = this.countInDurationMs + (n.beat * msPerBeat);
      return {
        ...n,
        index: idx,
        targetTimeMs,
        durationMs: n.duration * msPerBeat,
        isHit: false,
        isMissed: false,
        hitRating: null,
        hitOffsetMs: null,
      };
    });

    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.hits = { perfect: 0, great: 0, good: 0, miss: 0 };
    this.currentTargetIndex = 0;
    this.lastProcessedIndex = -1;
    this.lastBeatScheduled = -1;
    this.lastRating = null;
    this.pauseOffsetMs = 0;
  }

  start() {
    this.setup();
    audioManager.init();
    audioManager.resume();
    audioManager.loadAcousticGuitarSamples().catch(() => {});

    this.isPlaying = true;
    this.isPaused = false;
    this.startTime = performance.now();
    this.currentTimeMs = 0;

    this._loop();
  }

  stop() {
    this.isPlaying = false;
    this.isPaused = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  pause() {
    if (!this.isPlaying || this.isPaused) return;
    this.isPaused = true;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.pauseOffsetMs = performance.now() - this.startTime;
  }

  resume() {
    if (!this.isPlaying || !this.isPaused) return;
    this.isPaused = false;
    this.startTime = performance.now() - this.pauseOffsetMs;
    this._loop();
  }

  restart() {
    this.stop();
    this.start();
  }

  _loop() {
    if (!this.isPlaying || this.isPaused) return;

    this.currentTimeMs = performance.now() - this.startTime;

    this._checkBeatPulse();
    this._checkMissedTargets();

    // Melody guide playback if enabled
    if (this.isMelodyGuideEnabled) {
      const cur = this.targets[this.currentTargetIndex];
      if (cur && !cur.isHit && !cur.isMissed && !cur._guidePlayed) {
        if (Math.abs(this.currentTimeMs - cur.targetTimeMs) <= 35) {
          cur._guidePlayed = true;
          audioManager.playGuitarNote(cur.note, { duration: cur.duration * 0.5 + 0.4 });
        }
      }
    }

    const lastTarget = this.targets[this.targets.length - 1];
    if (lastTarget && this.currentTimeMs > lastTarget.targetTimeMs + 2000) {
      this._finishSong();
      return;
    }

    if (this.onFrameTick) {
      this.onFrameTick({
        currentTimeMs: this.currentTimeMs,
        countInDurationMs: this.countInDurationMs,
        isCountIn: this.currentTimeMs < this.countInDurationMs,
        countInBeat: Math.floor(this.currentTimeMs / ((60 / this.difficulty.bpm) * 1000)) + 1,
        targets: this.targets,
        currentTarget: this.targets[this.currentTargetIndex] || null,
        pixelSpeed: this.difficulty.pixelSpeed,
        score: this.score,
        combo: this.combo,
        maxCombo: this.maxCombo,
        hits: this.hits,
        progressPct: Math.min(100, Math.round((this.currentTimeMs / (lastTarget?.targetTimeMs || 1)) * 100)),
      });
    }

    this.animFrameId = requestAnimationFrame(() => this._loop());
  }

  _checkBeatPulse() {
    const msPerBeat = (60 / this.difficulty.bpm) * 1000;
    const currentBeat = Math.floor(this.currentTimeMs / msPerBeat);

    if (currentBeat > this.lastBeatScheduled) {
      this.lastBeatScheduled = currentBeat;
      const isCountIn = this.currentTimeMs < this.countInDurationMs;
      const countInNum = isCountIn ? currentBeat + 1 : null;

      if (isCountIn) {
        audioManager.playCountInBeep(countInNum === 4);
      } else if (this.isBackingMusicEnabled) {
        // Authentic Minang acoustic rhythm accompaniment
        const curTarget = this.targets[this.currentTargetIndex] || this.targets[0];
        const chord = (curTarget && curTarget.chord) ? curTarget.chord : 'C';
        const beatInMeasure = ((currentBeat - this.countInBeats) % 4 + 4) % 4; // 0, 1, 2, 3

        if (beatInMeasure === 0) {
          // Downbeat (Beat 1): Acoustic guitar strum + warm bass note + gentle kick
          audioManager.playBassNote(chord, 0.7);
          audioManager.playGuitarChord(chord, { duration: 1.2, strumSpeed: 0.015 });
          audioManager.playKick();
          audioManager.playHiHat();
        } else if (beatInMeasure === 1) {
          // Beat 2: Soft rim snap + hi-hat
          audioManager.playSnare();
          audioManager.playHiHat();
        } else if (beatInMeasure === 2) {
          // Beat 3: Acoustic guitar chord harmony strum
          audioManager.playGuitarChord(chord, { duration: 0.8, strumSpeed: 0.02 });
          audioManager.playHiHat();
        } else if (beatInMeasure === 3) {
          // Beat 4: Soft rim snap + hi-hat
          audioManager.playSnare();
          audioManager.playHiHat();
        }
      }

      if (this.onBeatTick) {
        this.onBeatTick({
          beat: currentBeat,
          isCountIn,
          countInNum,
          bpm: this.difficulty.bpm,
        });
      }
    }
  }

  _checkMissedTargets() {
    const tol = this.difficulty.tolerances;
    for (let i = this.currentTargetIndex; i < this.targets.length; i++) {
      const target = this.targets[i];
      if (target.isHit || target.isMissed) continue;

      if (this.currentTimeMs > target.targetTimeMs + tol.good) {
        target.isMissed = true;
        target.hitRating = 'MISS';
        this.hits.miss++;
        this.combo = 0;

        if (this.onTargetHit) {
          this.onTargetHit({
            rating: 'MISS',
            target,
            scoreDelta: 0,
            combo: 0,
            feedback: 'TERLEWAT!',
          });
        }

        if (i === this.currentTargetIndex) {
          this.currentTargetIndex++;
        }
      } else {
        break;
      }
    }
  }

  evaluateGesture(detectedFingerCount) {
    if (!this.isPlaying || this.isPaused) return null;
    if (detectedFingerCount <= 0) return null;

    const tol = this.difficulty.tolerances;

    let candidate = null;
    let minAbsDiff = Infinity;
    let candidateIdx = -1;

    for (let i = this.currentTargetIndex; i < Math.min(this.targets.length, this.currentTargetIndex + 4); i++) {
      const t = this.targets[i];
      if (t.isHit || t.isMissed) continue;

      const diff = this.currentTimeMs - t.targetTimeMs;
      const absDiff = Math.abs(diff);

      if (absDiff <= tol.good) {
        if (absDiff < minAbsDiff) {
          minAbsDiff = absDiff;
          candidate = t;
          candidateIdx = i;
        }
      }
    }

    if (!candidate) return null;

    if (detectedFingerCount === candidate.fingerCount) {
      candidate.isHit = true;
      candidate.hitOffsetMs = this.currentTimeMs - candidate.targetTimeMs;

      let rating = 'GOOD';
      let scoreDelta = 50;
      let label = 'BAGUS!';

      if (minAbsDiff <= tol.perfect) {
        rating = 'PERFECT';
        scoreDelta = 100;
        label = 'SEMPURNA!';
      } else if (minAbsDiff <= tol.great) {
        rating = 'GREAT';
        scoreDelta = 75;
        label = 'HEBAT!';
      }

      candidate.hitRating = rating;
      this.hits[rating.toLowerCase()]++;

      this.combo++;
      if (this.combo > this.maxCombo) {
        this.maxCombo = this.combo;
      }

      const comboMultiplier = 1 + Math.min(2.0, Math.floor(this.combo / 5) * 0.2);
      const earnedScore = Math.round(scoreDelta * comboMultiplier);
      this.score += earnedScore;

      // Authentic acoustic guitar note trigger
      audioManager.playGuitarNote(candidate.note, { duration: candidate.duration * 0.5 + 0.5 });

      if (candidateIdx === this.currentTargetIndex) {
        this.currentTargetIndex++;
      }

      if (this.onTargetHit) {
        this.onTargetHit({
          rating,
          target: candidate,
          scoreDelta: earnedScore,
          combo: this.combo,
          feedback: label,
        });
      }

      return { rating, target: candidate };
    }

    return null;
  }

  _finishSong() {
    const total = Math.max(1, this.targets.length);
    const accuracy = Math.min(100, Math.round(((this.hits.perfect * 1.0 + this.hits.great * 0.88 + this.hits.good * 0.75) / total) * 100));

    let stars = 1;
    if (accuracy >= 80 || (this.hits.miss <= 2 && accuracy >= 70)) stars = 3;
    else if (accuracy >= 60 || this.hits.miss <= 4) stars = 2;

    if (this.onSongComplete) {
      this.onSongComplete({
        score: this.score,
        maxCombo: this.maxCombo,
        hits: this.hits,
        accuracy,
        stars,
        difficulty: this.difficulty,
      });
    }
  }

  getCurrentTarget() {
    return this.targets[this.currentTargetIndex] || null;
  }
}

export const taragakPulangService = new TaragakPulangService();
