// KomangService.js - Interactive Play-Along Engine for "Komang" by Raim Laode
// Transcribed faithfully from Piano Arrangement by Aga Pratama Alamsyah:
// Key: G Major (1 Sharp: F#) • Tempo: 130 BPM • 4/4 Time Signature • 16 Measures

import { audioManager } from '../audio/AudioManager.js';
import { competitionLeaderboardService } from './CompetitionLeaderboardService.js';

export const KOMANG_MEASURES = [
  // SYSTEM 1 (Measures 1 - 4: Bait 1: G ➔ D/F#)
  {
    index: 0,
    measure: 1,
    system: 1,
    chord: 'G',
    fingerCount: 1,
    emoji: '☝️',
    label: '1 Jari: G (Do)',
    lyric: 'Dari kejauhan, tergambar cerita tentang kita',
    notes: 'B4 - D5 - B4 - D5 - G5',
    melodyNotes: ['B4', 'D5', 'B4', 'D5', 'G5'],
    bassNote: 'G2',
    chordDesc: 'G Major (Tonika Hangat)',
    keys: ['G3', 'D4', 'G4', 'B4'],
  },
  {
    index: 1,
    measure: 2,
    system: 1,
    chord: 'G',
    fingerCount: 1,
    emoji: '☝️',
    label: '1 Jari: G (Do)',
    lyric: 'Dari kejauhan, tergambar cerita tentang kita',
    notes: 'E5 - D5 - B4 - A4 - G4',
    melodyNotes: ['E5', 'D5', 'B4', 'A4', 'G4'],
    bassNote: 'G2',
    chordDesc: 'G Major (Melodi Turun)',
    keys: ['G3', 'D4', 'G4', 'B4'],
  },
  {
    index: 2,
    measure: 3,
    system: 1,
    chord: 'D/F#',
    fingerCount: 2,
    emoji: '✌️',
    label: '2 Jari: D/F# (Transisi)',
    lyric: 'Terpisah jarak dan waktu',
    notes: 'A4 - D5 - A4 - D5 - F#5',
    melodyNotes: ['A4', 'D5', 'A4', 'D5', 'F#5'],
    bassNote: 'F#2',
    chordDesc: 'D Major / Bass F# (Descending Bass)',
    keys: ['F#3', 'D4', 'F#4', 'A4'],
  },
  {
    index: 3,
    measure: 4,
    system: 1,
    chord: 'D/F#',
    fingerCount: 2,
    emoji: '✌️',
    label: '2 Jari: D/F# (Transisi)',
    lyric: 'Terpisah jarak dan waktu',
    notes: 'E5 - D5 - A4 - F#4',
    melodyNotes: ['E5', 'D5', 'A4', 'F#4'],
    bassNote: 'F#2',
    chordDesc: 'D Major / Bass F# (Transisi Menuju Am)',
    keys: ['F#3', 'D4', 'F#4', 'A4'],
  },

  // SYSTEM 2 (Measures 5 - 8: Bait 1 Lanjutan: Am ➔ Cm)
  {
    index: 4,
    measure: 5,
    system: 2,
    chord: 'Am',
    fingerCount: 3,
    emoji: '🤟',
    label: '3 Jari: Am (Lembut)',
    lyric: 'Ingin kuungkapkan rindu lewat kata indah',
    notes: 'C5 - E5 - C5 - E5 - A5',
    melodyNotes: ['C5', 'E5', 'C5', 'E5', 'A5'],
    bassNote: 'A2',
    chordDesc: 'A Minor (Sentuhan Emosional)',
    keys: ['A3', 'E4', 'A4', 'C5'],
  },
  {
    index: 5,
    measure: 6,
    system: 2,
    chord: 'Am',
    fingerCount: 3,
    emoji: '🤟',
    label: '3 Jari: Am (Lembut)',
    lyric: 'Ingin kuungkapkan rindu lewat kata indah',
    notes: 'G5 - E5 - D5 - C5',
    melodyNotes: ['G5', 'E5', 'D5', 'C5'],
    bassNote: 'A2',
    chordDesc: 'A Minor (Alunan Lembut)',
    keys: ['A3', 'E4', 'A4', 'C5'],
  },
  {
    index: 6,
    measure: 7,
    system: 2,
    chord: 'Cm',
    fingerCount: 4,
    emoji: '🖐️',
    label: '4 Jari: Cm (Syahdu)',
    lyric: 'Tak cukup untuk dirimu',
    notes: 'Eb5 - G5 - Eb5 - G5 - C6',
    melodyNotes: ['Eb5', 'G5', 'Eb5', 'G5', 'C6'],
    bassNote: 'C2',
    chordDesc: 'C Minor (Minor Plagal Cadence • Paling Khas)',
    keys: ['C3', 'C4', 'Eb4', 'G4', 'C5'],
  },
  {
    index: 7,
    measure: 8,
    system: 2,
    chord: 'Cm',
    fingerCount: 4,
    emoji: '🖐️',
    label: '4 Jari: Cm (Syahdu)',
    lyric: 'Tak cukup untuk dirimu',
    notes: 'Bb5 - G5 - Eb5 - D5',
    melodyNotes: ['Bb5', 'G5', 'Eb5', 'D5'],
    bassNote: 'C2',
    chordDesc: 'C Minor (Resolusi Syahdu Menuju G)',
    keys: ['C3', 'C4', 'Eb4', 'G4', 'C5'],
  },

  // SYSTEM 3 (Measures 9 - 12: Pre-Chorus: G ➔ D/F#)
  {
    index: 8,
    measure: 9,
    system: 3,
    chord: 'G',
    fingerCount: 1,
    emoji: '☝️',
    label: '1 Jari: G (Do)',
    lyric: 'Sebab kau terlalu indah dari sekedar kata',
    notes: 'B4 - D5 - B4 - D5 - G5',
    melodyNotes: ['B4', 'D5', 'B4', 'D5', 'G5'],
    bassNote: 'G2',
    chordDesc: 'G Major (Kembali ke Rumah)',
    keys: ['G3', 'D4', 'G4', 'B4'],
  },
  {
    index: 9,
    measure: 10,
    system: 3,
    chord: 'G',
    fingerCount: 1,
    emoji: '☝️',
    label: '1 Jari: G (Do)',
    lyric: 'Sebab kau terlalu indah dari sekedar kata',
    notes: 'E5 - D5 - B4 - A4 - G4',
    melodyNotes: ['E5', 'D5', 'B4', 'A4', 'G4'],
    bassNote: 'G2',
    chordDesc: 'G Major (Harmoni Manis)',
    keys: ['G3', 'D4', 'G4', 'B4'],
  },
  {
    index: 10,
    measure: 11,
    system: 3,
    chord: 'D/F#',
    fingerCount: 2,
    emoji: '✌️',
    label: '2 Jari: D/F# (Transisi)',
    lyric: 'Dunia berhenti sejenak menikmati indahmu',
    notes: 'A4 - D5 - A4 - D5 - F#5',
    melodyNotes: ['A4', 'D5', 'A4', 'D5', 'F#5'],
    bassNote: 'F#2',
    chordDesc: 'D Major / Bass F#',
    keys: ['F#3', 'D4', 'F#4', 'A4'],
  },
  {
    index: 11,
    measure: 12,
    system: 3,
    chord: 'D/F#',
    fingerCount: 2,
    emoji: '✌️',
    label: '2 Jari: D/F# (Transisi)',
    lyric: 'Dunia berhenti sejenak menikmati indahmu',
    notes: 'E5 - D5 - A4 - F#4',
    melodyNotes: ['E5', 'D5', 'A4', 'F#4'],
    bassNote: 'F#2',
    chordDesc: 'D Major / Bass F#',
    keys: ['F#3', 'D4', 'F#4', 'A4'],
  },

  // SYSTEM 4 (Measures 13 - 16: Reff Utama: Am ➔ Cm ➔ G)
  {
    index: 12,
    measure: 13,
    system: 4,
    chord: 'Am',
    fingerCount: 3,
    emoji: '🤟',
    label: '3 Jari: Am (Lembut)',
    lyric: 'Dan apabila tak bersamamu',
    notes: 'C5 - E5 - C5 - E5 - A5',
    melodyNotes: ['C5', 'E5', 'C5', 'E5', 'A5'],
    bassNote: 'A2',
    chordDesc: 'A Minor (Janji Cinta)',
    keys: ['A3', 'E4', 'A4', 'C5'],
  },
  {
    index: 13,
    measure: 14,
    system: 4,
    chord: 'Am',
    fingerCount: 3,
    emoji: '🤟',
    label: '3 Jari: Am (Lembut)',
    lyric: 'Kupastikan kujalani dunia tak seindah kemarin',
    notes: 'G5 - E5 - D5 - C5',
    melodyNotes: ['G5', 'E5', 'D5', 'C5'],
    bassNote: 'A2',
    chordDesc: 'A Minor (Tulus Mengalir)',
    keys: ['A3', 'E4', 'A4', 'C5'],
  },
  {
    index: 14,
    measure: 15,
    system: 4,
    chord: 'Cm',
    fingerCount: 4,
    emoji: '🖐️',
    label: '4 Jari: Cm (Syahdu)',
    lyric: 'Sederhana, tertawamu sudah cukup',
    notes: 'Eb5 - G5 - Eb5 - G5 - D6',
    melodyNotes: ['Eb5', 'G5', 'Eb5', 'G5', 'D6'],
    bassNote: 'C2',
    chordDesc: 'C Minor (Puncak Emosi Lagu)',
    keys: ['C3', 'C4', 'Eb4', 'G4', 'C5'],
  },
  {
    index: 15,
    measure: 16,
    system: 4,
    chord: 'G',
    fingerCount: 1,
    emoji: '☝️',
    label: '1 Jari: G (Resolusi)',
    lyric: 'Lengkapi sempurnanya hidup bersamamu... ✨',
    notes: 'B5 - G5 - D5 - B4 - G4',
    melodyNotes: ['B5', 'G5', 'D5', 'B4', 'G4'],
    bassNote: 'G2',
    chordDesc: 'G Major (Akor Penutup Manis)',
    keys: ['G3', 'D4', 'G4', 'B4'],
  },
];

export const KOMANG_PIANO_KEYS = [
  { note: 'C3', label: 'C3', isBlack: false },
  { note: 'D3', label: 'D3', isBlack: false },
  { note: 'E3', label: 'E3', isBlack: false },
  { note: 'F#3', label: 'F#', isBlack: true, isBassHighlight: true },
  { note: 'G3', label: 'G3', isBlack: false, isBassHighlight: true },
  { note: 'A3', label: 'A3', isBlack: false, isBassHighlight: true },
  { note: 'B3', label: 'B3', isBlack: false },
  { note: 'C4', label: 'C4', isBlack: false },
  { note: 'D4', label: 'D4', isBlack: false },
  { note: 'Eb4', label: 'Eb', isBlack: true, isSpecialCm: true },
  { note: 'E4', label: 'E4', isBlack: false },
  { note: 'F#4', label: 'F#', isBlack: true },
  { note: 'G4', label: 'G4', isBlack: false },
  { note: 'A4', label: 'A4', isBlack: false },
  { note: 'B4', label: 'B4', isBlack: false },
  { note: 'C5', label: 'C5', isBlack: false },
  { note: 'D5', label: 'D5', isBlack: false },
];

// Official Timeline Lyrics for Raim Laode's "Komang" (Key G Major • 4/4 Ballad ~84.2 BPM)
// Synchronized accurately with the 16.5s Intro and authentic song timeline matching all 24 lyric lines!
export const KOMANG_TIMELINE_LYRICS = [
  // --- INTRO (0.00s - 16.50s) ---
  {
    startSec: 0.00,
    endSec: 16.50,
    chord: 'G',
    fingerCount: 1,
    emoji: '☝️',
    lyric: '🎵 [Intro Piano Akustik - Bersiap 1 Jari: G]',
    chordDesc: 'G Major (Intro Piano Akustik)',
    melodyNotes: ['G4', 'B4', 'D5'],
    keys: ['G3', 'D4', 'G4', 'B4'],
  },

  // --- BAIT 1 (16.50s - 39.30s) ---
  // Line 1: Dari kejauhan, tergambar cerita tentang kita
  {
    startSec: 16.50,
    endSec: 22.20,
    chord: 'G',
    fingerCount: 1,
    emoji: '☝️',
    lyric: 'Dari kejauhan, tergambar cerita tentang kita',
    chordDesc: 'G Major (Cerita Tentang Kita)',
    melodyNotes: ['B4', 'D5', 'G5'],
    keys: ['G3', 'D4', 'G4', 'B4'],
  },
  // Line 2: Terpisah jarak dan waktu
  {
    startSec: 22.20,
    endSec: 27.90,
    chord: 'D/F#',
    fingerCount: 2,
    emoji: '✌️',
    lyric: 'Terpisah jarak dan waktu',
    chordDesc: 'D Major / Bass F# (Transisi Nada Turun)',
    melodyNotes: ['A4', 'D5', 'F#5'],
    keys: ['F#3', 'D4', 'F#4', 'A4'],
  },
  // Line 3: Ingin kuungkapkan rindu lewat kata indah
  {
    startSec: 27.90,
    endSec: 33.60,
    chord: 'Am',
    fingerCount: 3,
    emoji: '🤟',
    lyric: 'Ingin kuungkapkan rindu lewat kata indah',
    chordDesc: 'A Minor (Sentuhan Emosional)',
    melodyNotes: ['C5', 'E5', 'A5'],
    keys: ['A3', 'E4', 'A4', 'C5'],
  },
  // Line 4: Tak cukup untuk dirimu
  {
    startSec: 33.60,
    endSec: 39.30,
    chord: 'Cm',
    fingerCount: 4,
    emoji: '🖐️',
    lyric: 'Tak cukup untuk dirimu',
    chordDesc: 'C Minor (Minor Plagal Syahdu)',
    melodyNotes: ['Eb5', 'G5', 'C6'],
    keys: ['C3', 'C4', 'Eb4', 'G4', 'C5'],
  },

  // --- PRE-CHORUS (39.30s - 50.70s) ---
  // Line 5: Sebab kau terlalu indah dari sekedar kata
  {
    startSec: 39.30,
    endSec: 45.00,
    chord: 'G',
    fingerCount: 1,
    emoji: '☝️',
    lyric: 'Sebab kau terlalu indah dari sekedar kata',
    chordDesc: 'G Major (Harmoni Manis)',
    melodyNotes: ['B4', 'D5', 'G5'],
    keys: ['G3', 'D4', 'G4', 'B4'],
  },
  // Line 6: Dunia berhenti sejenak menikmati indahmu
  {
    startSec: 45.00,
    endSec: 50.70,
    chord: 'D/F#',
    fingerCount: 2,
    emoji: '✌️',
    lyric: 'Dunia berhenti sejenak menikmati indahmu',
    chordDesc: 'D Major / Bass F# (Menikmati Indahmu)',
    melodyNotes: ['A4', 'D5', 'F#5'],
    keys: ['F#3', 'D4', 'F#4', 'A4'],
  },

  // --- REFF 1 / CHORUS 1 (50.70s - 73.50s) ---
  // Line 7: Dan apabila tak bersamamu
  {
    startSec: 50.70,
    endSec: 56.40,
    chord: 'G',
    fingerCount: 1,
    emoji: '☝️',
    lyric: 'Dan apabila tak bersamamu',
    chordDesc: 'G Major (Reff Ikonik Komang)',
    melodyNotes: ['B4', 'D5', 'G5'],
    keys: ['G3', 'D4', 'G4', 'B4'],
  },
  // Line 8: Kupastikan kujalani dunia tak seindah kemarin
  {
    startSec: 56.40,
    endSec: 62.10,
    chord: 'D/F#',
    fingerCount: 2,
    emoji: '✌️',
    lyric: 'Kupastikan kujalani dunia tak seindah kemarin',
    chordDesc: 'D Major / Bass F# (Alunan Tulus)',
    melodyNotes: ['A4', 'D5', 'F#5'],
    keys: ['F#3', 'D4', 'F#4', 'A4'],
  },
  // Line 9: Sederhana, tertawamu sudah cukup
  {
    startSec: 62.10,
    endSec: 67.80,
    chord: 'Am',
    fingerCount: 3,
    emoji: '🤟',
    lyric: 'Sederhana, tertawamu sudah cukup',
    chordDesc: 'A Minor (Janji Cinta Lembut)',
    melodyNotes: ['C5', 'E5', 'A5'],
    keys: ['A3', 'E4', 'A4', 'C5'],
  },
  // Line 10: Lengkapi sempurnanya hidup bersamamu
  {
    startSec: 67.80,
    endSec: 73.50,
    chord: 'Cm',
    fingerCount: 4,
    emoji: '🖐️',
    lyric: 'Lengkapi sempurnanya hidup bersamamu',
    chordDesc: 'C Minor (Puncak Emosional Reff)',
    melodyNotes: ['Eb5', 'G5', 'C6'],
    keys: ['C3', 'C4', 'Eb4', 'G4', 'C5'],
  },

  // --- INTERLUDE (73.50s - 79.20s) ---
  {
    startSec: 73.50,
    endSec: 79.20,
    chord: 'G',
    fingerCount: 1,
    emoji: '☝️',
    lyric: '🎵 [Melodi Piano Interlude - G]',
    chordDesc: 'G Major (Interlude Alunan Piano)',
    melodyNotes: ['G4', 'B4', 'D5'],
    keys: ['G3', 'D4', 'G4', 'B4'],
  },

  // --- BRIDGE (79.20s - 90.60s) ---
  // Line 11: Jika hari kulalui tanpa hawamu
  {
    startSec: 79.20,
    endSec: 84.90,
    chord: 'Am',
    fingerCount: 3,
    emoji: '🤟',
    lyric: 'Jika hari kulalui tanpa hawamu',
    chordDesc: 'A Minor (Bridge Penuh Penghayatan)',
    melodyNotes: ['C5', 'E5', 'A5'],
    keys: ['A3', 'E4', 'A4', 'C5'],
  },
  // Line 12: Percuma senyumku dengan dia, oh
  {
    startSec: 84.90,
    endSec: 90.60,
    chord: 'Cm',
    fingerCount: 4,
    emoji: '🖐️',
    lyric: 'Percuma senyumku dengan dia, oh',
    chordDesc: 'C Minor (Klimaks Bridge)',
    melodyNotes: ['Eb5', 'G5', 'C6'],
    keys: ['C3', 'C4', 'Eb4', 'G4', 'C5'],
  },

  // --- REFF 2 (CHORUS 2: 90.60s - 113.40s) ---
  // Line 13: Dan apabila tak bersamamu
  {
    startSec: 90.60,
    endSec: 96.30,
    chord: 'G',
    fingerCount: 1,
    emoji: '☝️',
    lyric: 'Dan apabila tak bersamamu',
    chordDesc: 'G Major (Reff Ke-2)',
    melodyNotes: ['B4', 'D5', 'G5'],
    keys: ['G3', 'D4', 'G4', 'B4'],
  },
  // Line 14: Kupastikan kujalani dunia tak seindah kemarin
  {
    startSec: 96.30,
    endSec: 102.00,
    chord: 'D/F#',
    fingerCount: 2,
    emoji: '✌️',
    lyric: 'Kupastikan kujalani dunia tak seindah kemarin',
    chordDesc: 'D Major / Bass F# (Alunan Mengalun)',
    melodyNotes: ['A4', 'D5', 'F#5'],
    keys: ['F#3', 'D4', 'F#4', 'A4'],
  },
  // Line 15: Sederhana, tertawamu sudah cukup
  {
    startSec: 102.00,
    endSec: 107.70,
    chord: 'Am',
    fingerCount: 3,
    emoji: '🤟',
    lyric: 'Sederhana, tertawamu sudah cukup',
    chordDesc: 'A Minor (Ketulusan Hati)',
    melodyNotes: ['C5', 'E5', 'A5'],
    keys: ['A3', 'E4', 'A4', 'C5'],
  },
  // Line 16: Lengkapi sempurnanya hidup bersamamu
  {
    startSec: 107.70,
    endSec: 113.40,
    chord: 'Cm',
    fingerCount: 4,
    emoji: '🖐️',
    lyric: 'Lengkapi sempurnanya hidup bersamamu',
    chordDesc: 'C Minor (Menuju Puncak Modulasi)',
    melodyNotes: ['Eb5', 'G5', 'C6'],
    keys: ['C3', 'C4', 'Eb4', 'G4', 'C5'],
  },

  // --- REFF 3 / MODULASI KLIMAKS (113.40s - 136.20s) ---
  // Line 17: Apabila tak bersamamu
  {
    startSec: 113.40,
    endSec: 119.10,
    chord: 'G',
    fingerCount: 1,
    emoji: '☝️',
    lyric: 'Apabila tak bersamamu',
    chordDesc: 'G Major (Puncak Klimaks Lagu)',
    melodyNotes: ['B4', 'D5', 'G5'],
    keys: ['G3', 'D4', 'G4', 'B4'],
  },
  // Line 18: Kupastikan kujalani dunia tak seindah kemarin
  {
    startSec: 119.10,
    endSec: 124.80,
    chord: 'D/F#',
    fingerCount: 2,
    emoji: '✌️',
    lyric: 'Kupastikan kujalani dunia tak seindah kemarin',
    chordDesc: 'D Major / Bass F# (Klimaks Penghayatan)',
    melodyNotes: ['A4', 'D5', 'F#5'],
    keys: ['F#3', 'D4', 'F#4', 'A4'],
  },
  // Line 19: Sederhana, tertawamu sudah cukup
  {
    startSec: 124.80,
    endSec: 130.50,
    chord: 'Am',
    fingerCount: 3,
    emoji: '🤟',
    lyric: 'Sederhana, tertawamu sudah cukup',
    chordDesc: 'A Minor (Getaran Cinta Mendalam)',
    melodyNotes: ['C5', 'E5', 'A5'],
    keys: ['A3', 'E4', 'A4', 'C5'],
  },
  // Line 20: Lengkapi sempurnanya hidup bersamamu
  {
    startSec: 130.50,
    endSec: 136.20,
    chord: 'Cm',
    fingerCount: 4,
    emoji: '🖐️',
    lyric: 'Lengkapi sempurnanya hidup bersamamu',
    chordDesc: 'C Minor (Resolusi Klimaks Tertinggi)',
    melodyNotes: ['Eb5', 'G5', 'C6'],
    keys: ['C3', 'C4', 'Eb4', 'G4', 'C5'],
  },

  // --- CODA (136.20s - 147.60s) ---
  // Line 21: Hu-uh-uh
  {
    startSec: 136.20,
    endSec: 141.90,
    chord: 'G',
    fingerCount: 1,
    emoji: '☝️',
    lyric: 'Hu-uh-uh',
    chordDesc: 'G Major (Coda Harmoni Vokal)',
    melodyNotes: ['B4', 'D5', 'G5'],
    keys: ['G3', 'D4', 'G4', 'B4'],
  },
  // Line 22: Hu, hu-uh-uh
  {
    startSec: 141.90,
    endSec: 147.60,
    chord: 'D/F#',
    fingerCount: 2,
    emoji: '✌️',
    lyric: 'Hu, hu-uh-uh',
    chordDesc: 'D Major / Bass F# (Alunan Lembut Penutup)',
    melodyNotes: ['A4', 'D5', 'F#5'],
    keys: ['F#3', 'D4', 'F#4', 'A4'],
  },

  // --- OUTRO (147.60s - 260.00s+) ---
  // Line 23: Sebab kau terlalu indah dari sekedar kata
  {
    startSec: 147.60,
    endSec: 156.00,
    chord: 'G',
    fingerCount: 1,
    emoji: '☝️',
    lyric: 'Sebab kau terlalu indah dari sekedar kata',
    chordDesc: 'G Major (Outro Penutup Syahdu)',
    melodyNotes: ['B4', 'D5', 'G5'],
    keys: ['G3', 'D4', 'G4', 'B4'],
  },
  // Line 24: Dunia berhenti sejenak menikmati indahmu
  {
    startSec: 156.00,
    endSec: 260.00,
    chord: 'Cm',
    fingerCount: 4,
    emoji: '🖐️',
    lyric: 'Dunia berhenti sejenak menikmati indahmu... ✨',
    chordDesc: 'C Minor (Dunia Berhenti Sejenak)',
    melodyNotes: ['Eb5', 'G5', 'C6'],
    keys: ['C3', 'C4', 'Eb4', 'G4', 'C5'],
  },
];

export function getKomangTimelineItemAtTime(timeSec) {
  if (typeof timeSec !== 'number' || isNaN(timeSec) || timeSec < 0) {
    return KOMANG_TIMELINE_LYRICS[0];
  }
  const match = KOMANG_TIMELINE_LYRICS.find(item => timeSec >= item.startSec && timeSec < item.endSec);
  if (match) return match;
  return KOMANG_TIMELINE_LYRICS[KOMANG_TIMELINE_LYRICS.length - 1];
}

export function getKomangLyricAtTime(timeSec) {
  const item = getKomangTimelineItemAtTime(timeSec);
  return item ? item.lyric : 'Dunia berhenti sejenak menikmati indahmu... ✨';
}

// 45-Second Song Segments for Random Play Sessions
// Transcribed with authentic starting points, chords, and genuine lyrics matching each section!
export const KOMANG_SEGMENTS = [
  {
    id: 0,
    startMeasureIndex: 0,
    measureNum: 1,
    startChord: 'G',
    fingerCount: 1,
    title: 'Intro Piano: Melodi Pembuka (G)',
    startSec: 0.0,
    lyricHint: '🎵 Intro Piano Akustik (Siapkan 1 Jari: G)…',
    desc: '☝️ 1 Jari (G) • Intro Piano Akustik',
  },
  {
    id: 1,
    startMeasureIndex: 0,
    measureNum: 1,
    startChord: 'G',
    fingerCount: 1,
    title: 'Bait 1: Cerita Tentang Kita (G)',
    startSec: 16.5,
    lyricHint: 'Dari kejauhan, tergambar cerita tentang kita…',
    desc: '☝️ 1 Jari (G) • Cerita Tentang Kita',
  },
  {
    id: 2,
    startMeasureIndex: 2,
    measureNum: 3,
    startChord: 'D/F#',
    fingerCount: 2,
    title: 'Bait 1: Terpisah Jarak (D/F#)',
    startSec: 22.2,
    lyricHint: 'Terpisah jarak dan waktu…',
    desc: '✌️ 2 Jari (D/F#) • Transisi Nada Turun',
  },
  {
    id: 3,
    startMeasureIndex: 4,
    measureNum: 5,
    startChord: 'Am',
    fingerCount: 3,
    title: 'Bait 1: Ungkapkan Rindu (Am)',
    startSec: 27.9,
    lyricHint: 'Ingin kuungkapkan rindu lewat kata indah…',
    desc: '🤟 3 Jari (Am) • Sentuhan Lembut Emosional',
  },
  {
    id: 4,
    startMeasureIndex: 6,
    measureNum: 7,
    startChord: 'Cm',
    fingerCount: 4,
    title: 'Bait 1: Tak Cukup Untuk Dirimu (Cm)',
    startSec: 33.6,
    lyricHint: 'Tak cukup untuk dirimu…',
    desc: '🖐️ 4 Jari (Cm) • Minor Plagal Syahdu',
  },
  {
    id: 5,
    startMeasureIndex: 8,
    measureNum: 9,
    startChord: 'G',
    fingerCount: 1,
    title: 'Pre-Chorus: Terlalu Indah (G)',
    startSec: 39.3,
    lyricHint: 'Sebab kau terlalu indah dari sekedar kata…',
    desc: '☝️ 1 Jari (G) • Menikmati Indahmu',
  },
  {
    id: 6,
    startMeasureIndex: 12,
    measureNum: 13,
    startChord: 'G',
    fingerCount: 1,
    title: 'Reff Utama: Tak Bersamamu (G)',
    startSec: 50.7,
    lyricHint: 'Dan apabila tak bersamamu, kupastikan…',
    desc: '☝️ 1 Jari (G) • Reff Ikonik Komang',
  },
  {
    id: 7,
    startMeasureIndex: 4,
    measureNum: 5,
    startChord: 'Am',
    fingerCount: 3,
    title: 'Bridge: Tanpa Hawamu (Am)',
    startSec: 79.2,
    lyricHint: 'Jika hari kulalui tanpa hawamu…',
    desc: '🤟 3 Jari (Am) • Bagian Bridge Penuh Penghayatan',
  },
];

export class KomangService {
  constructor() {
    this.measures = KOMANG_MEASURES;
    this.currentMeasureIndex = 0;
    this.mode = 'PLAY_ALONG'; // 'PLAY_ALONG' (MP3 sync), 'GUIDE' (Step by Step), 'TEMPO' (Metronome synth)
    this.bpm = 84.21; // Ballad Tempo of Komang (~2.85s per measure)
    this.beatDurationSec = 60 / this.bpm; // ~0.7125s
    this.measureDurationSec = 2.85; // Exactly 2.85s per measure
    this.cycleDurationSec = this.measureDurationSec * 16; // ~45.6s
    this.introDurationSec = 16.5; // 16.5s Piano Intro Prelude

    // Audio Backing Track
    this.audioEl = null;
    this.audioSrc = '/sounds/komang_piano.mp3'; // Piano Karaoke by Andre Panggabean
    this.audioOffsetSec = 0.0; // Adjustable sync offset in seconds
    this.backingVolume = 0.82;
    this.playerVolume = 0.0; // Default muted so pure song plays without artificial sound clash

    // 45-Second Random Session Mode
    this.sessionMode = '30S_RANDOM'; // '30S_RANDOM' (45 Detik per main) or 'FULL_SONG'
    this.sessionDurationSec = 45.0;
    this.sessionStartSec = 0.0;
    this.currentSegment = KOMANG_SEGMENTS[0];
    this.sessionElapsedSec = 0.0;
    this.sessionRemainingSec = 45.0;

    // Timeline state
    this.isPlaying = false;
    this.animFrameId = null;
    this.lastTriggerTime = 0;
    this.score = 0;
    this.combo = 0;
    this.perfectHits = 0;
    this.totalEvaluatedMeasures = 0;
    this.evaluatedMeasures = new Set();
    this.playedMeasureIndices = new Set();
    this.lastDetectedFingers = -1;

    // Built-in Accompaniment fallback
    this.tempoTimerId = null;
    this.currentTempoBeat = 0;

    // View Mode & Piano Tiles Engine
    this.viewMode = 'TILES'; // 'TILES' (Piano Tiles Highway) or 'SHEET' (16-Measure Sheet Music)
    this.tilesEngine = null;

    // Gameplay Challenge & Lives System (5 Lives ❤️❤️❤️❤️❤️ + No-Fail Mode)
    this.maxLives = 5;
    this.lives = 5;
    this.isNoFail = false; // Mode Santai (lagu jalan terus tanpa terhenti)
    this.introShieldDurationSec = 2.0; // Toleransi 2 detik awal saja
    this.isGameOver = false;
    this.isFinished = false;
    this.gameResult = null;
    this.speedMultiplier = 1.0;

    // Detailed Hit Statistics
    this.maxCombo = 0;
    this.greatHits = 0;
    this.goodHits = 0;
    this.missHits = 0;

    // Callbacks
    this.onMeasureChanged = null;
    this.onTimelineTick = null;
    this.onChordHit = null;
    this.onLifeLost = null;
    this.onLifeRecovered = null;
    this.onGameOver = null;
    this.onSongFinished = null;
    this.onAudioStateChanged = null;
    this.onStateChanged = null;

    // Pick an initial random segment so every launch starts fresh
    this.pickRandomSegment(false);
  }

  pickRandomSegment(excludeCurrent = true) {
    let pool = KOMANG_SEGMENTS;
    if (excludeCurrent && this.currentSegment) {
      pool = KOMANG_SEGMENTS.filter(s => s.id !== this.currentSegment.id);
    }
    const idx = Math.floor(Math.random() * pool.length);
    this.currentSegment = pool[idx] || KOMANG_SEGMENTS[0];
    this.sessionStartSec = this.currentSegment.startSec;
    this.sessionElapsedSec = 0.0;
    this.sessionRemainingSec = this.sessionDurationSec;
    this.currentMeasureIndex = this.currentSegment.startMeasureIndex || 0;
    this.isFinished = false;
    this.isGameOver = false;
    return this.currentSegment;
  }

  setSessionMode(mode) {
    this.sessionMode = mode;
    if (mode === '30S_RANDOM' && !this.currentSegment) {
      this.pickRandomSegment(false);
    }
    if (this.onStateChanged) this.onStateChanged();
  }

  getCurrentSongTime() {
    if (this.mode === 'PLAY_ALONG' && this.audioEl) {
      return Math.max(0, this.audioEl.currentTime - this.audioOffsetSec);
    }
    return (this.currentTempoBeat || 0) * (60 / this.bpm);
  }

  setNoFail(enabled = true) {
    this.isNoFail = enabled;
    if (enabled && this.isGameOver) {
      this.isGameOver = false;
      this.play();
    }
    if (this.onStateChanged) {
      this.onStateChanged();
    }
  }

  setTilesEngine(engine) {
    this.tilesEngine = engine;
    if (this.tilesEngine) {
      this.tilesEngine.setSpeed(this.speedMultiplier);
    }
  }

  setSpeed(speed = 1.0) {
    this.speedMultiplier = Math.max(0.6, Math.min(2.0, speed));
    if (this.tilesEngine) {
      this.tilesEngine.setSpeed(this.speedMultiplier);
    }
    if (this.onStateChanged) {
      this.onStateChanged();
    }
  }

  recoverLife(amount = 1) {
    // Disabled: lives cannot be recovered during gameplay
    return;
  }

  loseLife(reason = 'TILE_MISSED') {
    if (this.isGameOver || this.isFinished || this.isNoFail) return;

    // Warmup Shield: Toleransi 2 detik awal saja agar pemain bisa bersiap santai
    if (this.sessionMode === '30S_RANDOM') {
      if (this.sessionElapsedSec < 2.0) {
        this.combo = 0;
        return;
      }
    } else {
      const curTime = this.getCurrentSongTime();
      if (curTime < this.introShieldDurationSec) {
        this.combo = 0;
        return;
      }
    }

    this.lives = Math.max(0, this.lives - 1);
    this.combo = 0;
    this.missHits++;

    audioManager.playMissSound();

    if (this.onLifeLost) {
      this.onLifeLost({
        lives: this.lives,
        maxLives: this.maxLives,
        reason,
        missHits: this.missHits,
        combo: 0,
      });
    }

    if (this.tilesEngine) {
      this.tilesEngine.triggerMissEffect();
    }

    if (this.lives <= 0) {
      this.handleGameOver(reason);
    }
  }

  handleGameOver(reason = 'OUT_OF_LIVES') {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.stop();

    audioManager.playGameOverSound();

    const totalNotes = Math.max(1, this.perfectHits + this.greatHits + this.goodHits + this.missHits);
    const accuracy = Math.min(100, Math.round(((this.perfectHits * 1.0 + this.greatHits * 0.88 + this.goodHits * 0.75) / totalNotes) * 100));

    this.gameResult = {
      isWin: false,
      reason,
      score: this.score,
      maxCombo: this.maxCombo,
      accuracy,
      perfectHits: this.perfectHits,
      greatHits: this.greatHits,
      goodHits: this.goodHits,
      missHits: this.missHits,
      barReached: this.currentMeasureIndex + 1,
      totalMeasures: this.measures.length,
    };

    if (this.onGameOver) {
      this.onGameOver(this.gameResult);
    }
  }

  setTilesEngine(engine) {
    this.tilesEngine = engine;
  }

  setViewMode(mode) {
    this.viewMode = mode;
  }

  initAudio() {
    if (this.audioEl) return;
    this.audioEl = new Audio();
    this.audioEl.src = this.audioSrc;
    this.audioEl.preload = 'auto';
    this.audioEl.volume = this.backingVolume;

    this.audioEl.addEventListener('ended', () => {
      this.finish();
    });

    this.audioEl.addEventListener('error', (err) => {
      console.warn('Komang audio load fallback note:', err);
    });
  }

  setAudioSource(src, offsetSec = 0.0) {
    this.audioSrc = src;
    this.audioOffsetSec = offsetSec;
    if (this.audioEl) {
      const wasPlaying = this.isPlaying;
      this.audioEl.src = src;
      this.audioEl.currentTime = 0;
      if (wasPlaying) {
        this.play();
      }
    }
  }

  setAudioOffset(sec) {
    this.audioOffsetSec = Math.max(-5, Math.min(10, sec));
  }

  setVolumes(backingVol, playerVol) {
    this.backingVolume = Math.max(0, Math.min(1, backingVol));
    this.playerVolume = Math.max(0, Math.min(1, playerVol));
    if (this.audioEl) {
      this.audioEl.volume = this.backingVolume;
    }
    audioManager.init();
    if (audioManager.chordGain && audioManager.ctx) {
      audioManager.chordGain.gain.setValueAtTime(this.playerVolume, audioManager.ctx.currentTime);
    }
  }

  setMode(mode) {
    this.stop();
    this.mode = mode;
    this.reset();
  }

  getCurrentMeasure() {
    const curTime = this.getCurrentSongTime();
    const item = getKomangTimelineItemAtTime(curTime);
    const base = this.measures[this.currentMeasureIndex % this.measures.length] || this.measures[0];
    return {
      ...base,
      index: this.currentMeasureIndex,
      measure: this.currentMeasureIndex + 1,
      chord: item.chord,
      fingerCount: item.fingerCount,
      emoji: item.emoji,
      lyric: item.lyric,
      chordDesc: item.chordDesc || base.chordDesc,
      melodyNotes: item.melodyNotes || base.melodyNotes,
      keys: item.keys || base.keys,
    };
  }

  getNextMeasure() {
    const curTime = this.getCurrentSongTime();
    const nextTime = curTime + this.measureDurationSec;
    const item = getKomangTimelineItemAtTime(nextTime);
    const base = this.measures[(this.currentMeasureIndex + 1) % this.measures.length] || this.measures[0];
    return {
      ...base,
      index: this.currentMeasureIndex + 1,
      measure: this.currentMeasureIndex + 2,
      chord: item.chord,
      fingerCount: item.fingerCount,
      emoji: item.emoji,
      lyric: item.lyric,
      chordDesc: item.chordDesc || base.chordDesc,
      melodyNotes: item.melodyNotes || base.melodyNotes,
      keys: item.keys || base.keys,
    };
  }

  play() {
    this.initAudio();
    audioManager.init();
    audioManager.resume();

    this.isFinished = false;
    this.isGameOver = false;
    this.isPlaying = true;

    // In 45s Random mode, ensure audio starts with a gentle lead-in so the first tile glides down from above
    if (this.sessionMode === '30S_RANDOM' && this.audioEl) {
      const cur = this.audioEl.currentTime;
      const leadIn = Math.min(1.85, this.sessionStartSec);
      const actualStart = Math.max(0, this.sessionStartSec - leadIn);

      // If at start, or previous session ended, or out of range, set position
      if (this.sessionRemainingSec <= 0.2 || this.sessionElapsedSec === 0 || cur < actualStart - 1.0 || cur >= this.sessionStartSec + this.sessionDurationSec) {
        try {
          this.audioEl.currentTime = actualStart;
        } catch (e) {}
        this.sessionElapsedSec = 0;
        this.sessionRemainingSec = this.sessionDurationSec;
        if (this.tilesEngine) {
          this.tilesEngine._lastReportedAudioTime = -1;
          this.tilesEngine._smoothSongTime = actualStart;
        }
      }
      this.audioEl.playbackRate = 1.0;
    }

    if (this.tilesEngine) {
      this.tilesEngine.start();
    }

    if (this.mode === 'PLAY_ALONG') {
      this.audioEl.play().catch(err => {
        console.warn('Autoplay audio interaction note:', err);
      });
      this._startTimelineLoop();
    } else if (this.mode === 'TEMPO') {
      this._startTempoLoop();
    } else {
      // GUIDE Mode: waits for user gestures
      this._startTimelineLoop();
    }

    if (this.onAudioStateChanged) {
      this.onAudioStateChanged(true);
    }
  }

  pause() {
    this.isPlaying = false;
    if (this.tilesEngine) {
      this.tilesEngine.stop();
    }
    if (this.audioEl) {
      try {
        this.audioEl.playbackRate = 1.0;
        this.audioEl.pause();
      } catch (e) {}
    }
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.tempoTimerId) {
      clearTimeout(this.tempoTimerId);
      this.tempoTimerId = null;
    }
    if (this.onAudioStateChanged) {
      this.onAudioStateChanged(false);
    }
  }

  stop() {
    this.pause();
    if (this.tilesEngine) {
      this.tilesEngine.stop();
    }
    if (this.audioEl) {
      try {
        this.audioEl.playbackRate = 1.0;
        this.audioEl.pause();
        this.audioEl.currentTime = (this.sessionMode === '30S_RANDOM') ? this.sessionStartSec : 0;
      } catch (e) {}
    }
    this.currentMeasureIndex = this.currentSegment ? (this.currentSegment.startMeasureIndex || 0) : 0;
    this.evaluatedMeasures.clear();
    this.playedMeasureIndices.clear();
    this.lastDetectedFingers = -1;
  }

  reset() {
    this.stop();
    if (this.tilesEngine) {
      this.tilesEngine.reset();
      // Ensure tiles in the active segment window are reset to PENDING, earlier tiles to PAST
      const start = (this.sessionMode === '30S_RANDOM') ? this.sessionStartSec : 0;
      const end = start + (this.sessionMode === '30S_RANDOM' ? this.sessionDurationSec + 2.0 : 300);
      this.tilesEngine.tiles.forEach(t => {
        if (t.timeSec < start - 0.2) {
          t.status = 'PAST';
          t.hitRating = null;
        } else if (t.timeSec <= end) {
          t.status = 'PENDING';
          t.hitRating = null;
        } else {
          t.status = 'PENDING';
          t.hitRating = null;
        }
      });
      this.tilesEngine._lastReportedAudioTime = -1;
      this.tilesEngine._smoothSongTime = start;
    }
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.perfectHits = 0;
    this.greatHits = 0;
    this.goodHits = 0;
    this.missHits = 0;
    this.lives = this.maxLives;
    this.isGameOver = false;
    this.isFinished = false;
    this.gameResult = null;
    this.sessionElapsedSec = 0.0;
    this.sessionRemainingSec = this.sessionDurationSec;
    this.totalEvaluatedMeasures = 0;
    this.currentMeasureIndex = this.currentSegment ? (this.currentSegment.startMeasureIndex || 0) : 0;
    this.evaluatedMeasures.clear();
    this.playedMeasureIndices.clear();
    this.lastDetectedFingers = -1;
    if (this.onMeasureChanged) {
      this.onMeasureChanged(this.getCurrentMeasure(), this.currentMeasureIndex);
    }
  }

  seek(sec) {
    if (this.audioEl) {
      this.audioEl.currentTime = Math.max(0, sec);
    }
  }

  /**
   * Main timeline update loop for PLAY_ALONG and GUIDE modes
   */
  _startTimelineLoop() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);

    const tick = () => {
      if (!this.isPlaying) return;

      let currentTimeSec = 0;
      let totalDurationSec = 240; // Default ~4 mins

      if (this.mode === 'PLAY_ALONG' && this.audioEl) {
        const smoothTime = (this.tilesEngine && this.viewMode === 'TILES') 
          ? this.tilesEngine._getCurrentSongTime() 
          : Math.max(0, this.audioEl.currentTime - this.audioOffsetSec);

        currentTimeSec = smoothTime;
        totalDurationSec = this.audioEl.duration || 240;

        // 45-Second Random Session Check with Gradual Speed Acceleration
        if (this.sessionMode === '30S_RANDOM') {
          const elapsed = Math.max(0, currentTimeSec - this.sessionStartSec);
          this.sessionElapsedSec = elapsed;
          this.sessionRemainingSec = Math.max(0, this.sessionDurationSec - elapsed);


          if (elapsed >= this.sessionDurationSec) {
            // Exact 45 Seconds reached! Hard-stop audio immediately
            if (this.audioEl) {
              try {
                this.audioEl.playbackRate = 1.0;
                this.audioEl.pause();
              } catch (e) {}
            }
            this.finish();
            return;
          }
        }

        // Calculate measure position relative to tempo and sync offset (Accounting for 16.5s intro)
        let cycleSec, measureIdx;
        if (currentTimeSec < 16.5) {
          cycleSec = currentTimeSec;
          measureIdx = Math.min(15, Math.floor(currentTimeSec / this.measureDurationSec));
        } else {
          const songSec = currentTimeSec - 16.5;
          cycleSec = songSec % this.cycleDurationSec;
          measureIdx = Math.min(15, Math.floor(cycleSec / this.measureDurationSec));
        }
        const measureProgress = (cycleSec % this.measureDurationSec) / this.measureDurationSec;
        const timeToNextMeasureSec = Math.max(0, this.measureDurationSec * (1 - measureProgress));

        if (measureIdx !== this.currentMeasureIndex) {
          this.currentMeasureIndex = measureIdx;
          this.playedMeasureIndices.delete(measureIdx);

          // In SHEET mode only: if the player is already holding the matching finger, trigger softly on downbeat
          if (this.viewMode === 'SHEET') {
            const cur = this.getCurrentMeasure();
            if (cur && this.lastDetectedFingers === cur.fingerCount && !this.playedMeasureIndices.has(measureIdx)) {
              this.triggerChord(measureIdx, false);
            }
          }

          if (this.onMeasureChanged) {
            this.onMeasureChanged(this.getCurrentMeasure(), measureIdx);
          }
        }

        if (this.onTimelineTick) {
          const is30s = (this.sessionMode === '30S_RANDOM');
          this.onTimelineTick({
            currentTimeSec,
            totalDurationSec: is30s ? this.sessionDurationSec : totalDurationSec,
            sessionElapsedSec: is30s ? this.sessionElapsedSec : currentTimeSec,
            sessionRemainingSec: is30s ? this.sessionRemainingSec : Math.max(0, totalDurationSec - currentTimeSec),
            sessionProgress: is30s ? Math.min(1.0, this.sessionElapsedSec / this.sessionDurationSec) : (totalDurationSec > 0 ? currentTimeSec / totalDurationSec : 0),
            is30sSession: is30s,
            segment: this.currentSegment,
            measureIndex: measureIdx,
            measureProgress,
            timeToNextMeasureSec,
            bpm: this.bpm,
            activeMeasure: this.getCurrentMeasure(),
            nextMeasure: this.getNextMeasure(),
          });
        }
      }

      this.animFrameId = requestAnimationFrame(tick);
    };

    this.animFrameId = requestAnimationFrame(tick);
  }

  /**
   * Built-in 130 BPM Accompaniment fallback
   */
  _startTempoLoop() {
    if (this.tempoTimerId) clearTimeout(this.tempoTimerId);

    this.currentTempoBeat = 0;
    const beatIntervalMs = (60 / this.bpm) * 1000;

    const tick = () => {
      if (!this.isPlaying) return;

      this.currentTempoBeat++;
      const beatInMeasure = ((this.currentTempoBeat - 1) % 4) + 1;

      // Soft acoustic percussion accompaniment
      if (beatInMeasure === 1) {
        audioManager.playKick();
        // Downbeat chord pad
        const cur = this.getCurrentMeasure();
        if (cur) {
          audioManager.playChord(cur.chord, { duration: 1.6 });
        }
      } else {
        audioManager.playHiHat();
      }

      // Advance measure every 4 beats
      if (beatInMeasure === 1 && this.currentTempoBeat > 1) {
        this.currentMeasureIndex = (this.currentMeasureIndex + 1) % this.measures.length;
        if (this.onMeasureChanged) {
          this.onMeasureChanged(this.getCurrentMeasure(), this.currentMeasureIndex);
        }
      }

      if (this.onTimelineTick) {
        this.onTimelineTick({
          currentTimeSec: (this.currentTempoBeat * beatIntervalMs) / 1000,
          totalDurationSec: this.cycleDurationSec,
          measureIndex: this.currentMeasureIndex,
          measureProgress: (beatInMeasure - 1) / 4,
          timeToNextMeasureSec: ((4 - beatInMeasure + 1) * beatIntervalMs) / 1000,
          bpm: this.bpm,
          activeMeasure: this.getCurrentMeasure(),
          nextMeasure: this.getNextMeasure(),
        });
      }

      this.tempoTimerId = setTimeout(tick, beatIntervalMs);
    };

    tick();
  }

  /**
   * Trigger chord execution (via gesture recognition or user click)
   */
  triggerChord(measureIndex = this.currentMeasureIndex, isUserAction = true) {
    const measure = this.measures[measureIndex];
    if (!measure) return null;

    const now = performance.now();
    // Debounce 250ms for deliberate human taps
    if (isUserAction && now - this.lastTriggerTime < 250) {
      return null;
    }
    this.lastTriggerTime = now;
    this.playedMeasureIndices.add(measureIndex);

    // 1. Play Pure, Warm, Melodious Acoustic Grand Piano
    audioManager.init();
    audioManager.resume();
    audioManager.loadPianoSamples().catch(() => {});

    // Pure acoustic piano melody / sweet high voicing (NO boomy bass octave 3!)
    const sweetVoicings = {
      'G': ['G4', 'B4', 'D5'],
      'D/F#': ['F#4', 'A4', 'D5'],
      'Am': ['A4', 'C5', 'E5'],
      'Cm': ['G4', 'C5', 'Eb5'],
    };
    if (this.playerVolume > 0.01) {
      audioManager.playKomangMelodyNote(voicing, {
        duration: 1.6,
        gainScale: this.playerVolume * 0.25,
        isPerfect: false,
        preset: 'Acoustic Piano',
      });
    }

    // 2. Evaluate timing rating in PLAY_ALONG mode
    let rating = 'PERFECT';
    let points = 100;

    if (this.mode === 'PLAY_ALONG' && this.audioEl) {
      const adjustedSec = Math.max(0, this.audioEl.currentTime - this.audioOffsetSec);
      const cycleSec = adjustedSec % this.cycleDurationSec;
      const measureProgress = (cycleSec % this.measureDurationSec) / this.measureDurationSec;

      // Downbeat timing window: progress near 0.0 or near 1.0 (on-beat transition)
      if (measureProgress <= 0.35 || measureProgress >= 0.85) {
        rating = 'PERFECT';
        points = 100;
        this.perfectHits++;
      } else if (measureProgress <= 0.60) {
        rating = 'GREAT';
        points = 80;
      } else {
        rating = 'GOOD';
        points = 60;
      }
    }

    this.combo++;
    this.score += points;
    this.evaluatedMeasures.add(measureIndex);

    if (this.onChordHit) {
      this.onChordHit({
        measure,
        measureIndex,
        rating,
        points,
        combo: this.combo,
        score: this.score,
        isUserAction,
      });
    }

    // 4. In GUIDE mode, advance to next measure upon hitting
    if (this.mode === 'GUIDE') {
      const nextIdx = (measureIndex + 1);
      if (nextIdx < this.measures.length) {
        this.currentMeasureIndex = nextIdx;
        if (this.onMeasureChanged) {
          this.onMeasureChanged(this.getCurrentMeasure(), nextIdx);
        }
      } else {
        this.finish();
      }
    }

    return { measure, rating, points };
  }

  /**
   * Evaluate live camera hand gesture input
   */
  evaluateGesture(totalFingers, hasHand = true) {
    if (!hasHand) {
      this.lastDetectedFingers = -1;
      return null;
    }

    const cur = this.getCurrentMeasure();
    if (!cur) return null;

    const prevFingers = this.lastDetectedFingers;
    this.lastDetectedFingers = totalFingers;

    // 1. If in Piano Tiles mode, let the tiles engine strictly evaluate falling notes
    if (this.viewMode === 'TILES') {
      if (this.tilesEngine) {
        return this.tilesEngine.evaluateGesture(totalFingers, hasHand);
      }
      return null;
    }

    // 2. Measure level evaluation fallback (only in SHEET mode)
    if (totalFingers === cur.fingerCount) {
      // Trigger ONLY once per measure OR if user deliberately released/re-struck
      if (!this.playedMeasureIndices.has(this.currentMeasureIndex) || prevFingers !== totalFingers) {
        return this.triggerChord(this.currentMeasureIndex, true);
      }
    }

    return null;
  }

  /**
   * Jump to specific measure directly (from sheet music click)
   */
  jumpToMeasure(index) {
    if (index >= 0 && index < this.measures.length) {
      this.currentMeasureIndex = index;
      const measure = this.measures[index];
      const sweetVoicings = {
        'G': ['G4', 'B4', 'D5'],
        'D/F#': ['F#4', 'A4', 'D5'],
        'Am': ['A4', 'C5', 'E5'],
        'Cm': ['G4', 'C5', 'Eb5'],
      };
      if (this.playerVolume > 0.01) {
        audioManager.playKomangMelodyNote(notes, { duration: 1.6, gainScale: this.playerVolume * 0.25, preset: 'Acoustic Piano' });
      }

      if (this.mode === 'PLAY_ALONG' && this.audioEl) {
        // Seek audio to this measure start in the cycle
        const targetSec = this.audioOffsetSec + index * this.measureDurationSec;
        this.seek(targetSec);
      }

      if (this.onMeasureChanged) {
        this.onMeasureChanged(measure, index);
      }
    }
  }

  finish() {
    if (this.isGameOver || this.isFinished) return;
    this.isFinished = true;
    this.isPlaying = false;

    // Hard-stop audio backing track immediately
    if (this.audioEl) {
      try {
        this.audioEl.pause();
      } catch (e) {}
    }

    this.stop();

    const totalNotes = Math.max(1, this.perfectHits + this.greatHits + this.goodHits + this.missHits);
    // Fair Accuracy Calculation: Perfect = 1.0, Great = 0.88, Good = 0.75, Miss = 0.0
    const accuracy = Math.min(100, Math.round(((this.perfectHits * 1.0 + this.greatHits * 0.88 + this.goodHits * 0.75) / totalNotes) * 100));

    const isFullCombo = (this.missHits === 0 && (this.perfectHits + this.greatHits + this.goodHits) > 0);

    // Stars Rating (1 - 3 Stars):
    // ⭐⭐⭐: Full Combo, OR Accuracy >= 80%, OR 4+ lives left, OR 3+ lives with >= 70% accuracy
    let stars = 1;
    if (isFullCombo || accuracy >= 80 || (this.lives >= 4 && this.missHits <= 2) || (this.lives >= 3 && accuracy >= 70)) {
      stars = 3;
    } else if (accuracy >= 60 || this.lives >= 2 || this.missHits <= 4) {
      stars = 2;
    } else {
      stars = 1;
    }

    // Grade Determination (S+, S, A, B, C):
    // S+: Full combo with very high accuracy
    // S: Master (accuracy >= 88% OR accuracy >= 80% with 4+ lives)
    // A: Pianis Mahir (accuracy >= 74% OR 3+ lives with <= 2 misses)
    // B: Pianis Berbakat (accuracy >= 58% OR 2+ lives)
    // C: Pianis Pemula
    let grade = 'B';
    if (isFullCombo && accuracy >= 94) {
      grade = 'S+';
    } else if (accuracy >= 88 || (accuracy >= 80 && this.lives >= 4 && this.missHits <= 1)) {
      grade = 'S';
    } else if (accuracy >= 74 || (this.lives >= 3 && this.missHits <= 2)) {
      grade = 'A';
    } else if (accuracy >= 58 || this.lives >= 2) {
      grade = 'B';
    } else {
      grade = 'C';
    }

    audioManager.playLevelComplete();
    setTimeout(() => {
      if (isFullCombo) {
        audioManager.speakMascot('Yaaay! Kereen banget! Full combo tanpa cela! Kamu jagoan banget deh!');
      } else if (stars === 3) {
        audioManager.speakMascot('Waaah hebat banget! Tiga bintang diraih dengan lincah! Flix bangga deh!');
      } else if (stars === 2) {
        audioManager.speakMascot('Yeay seru banget! Jarimu lincah deh, ayo main lagi bareng Flix!');
      } else {
        audioManager.speakMascot('Horeee! Lagunya selesai! Kamu hebat!');
      }
    }, 450);

    // Create official Competition Session for QR Code Prize Claim!
    const compSession = competitionLeaderboardService.createPendingSession({
      songId: 'KOMANG',
      songTitle: '🌺 Komang - Raim Laode',
      songBadge: '🌺 KOMANG',
      totalNotes: totalNotes,
      perfectCount: this.perfectHits,
      greatCount: this.greatHits,
      goodCount: this.goodHits,
      badCount: 0,
      missCount: this.missHits,
      maxCombo: this.maxCombo,
      chordAccuracyPct: accuracy,
      scorePct: accuracy,
      grade,
      stars,
    });

    this.gameResult = {
      isWin: true,
      stars,
      grade,
      isFullCombo,
      score: this.score,
      maxCombo: this.maxCombo,
      accuracy,
      perfectHits: this.perfectHits,
      greatHits: this.greatHits,
      goodHits: this.goodHits,
      missHits: this.missHits,
      remainingLives: this.lives,
      maxLives: this.maxLives,
      totalMeasures: this.measures.length,
      is30sSession: this.sessionMode === '30S_RANDOM',
      segment: this.currentSegment,
      sessionDurationSec: this.sessionDurationSec,
      compSession,
    };

    if (this.onSongFinished) {
      this.onSongFinished(this.gameResult);
    }
  }
}

export const komangService = new KomangService();
