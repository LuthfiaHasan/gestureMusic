// NadimuService.js - Interactive Play-Along Engine for "Selalu Ada di Nadimu" (OST Jumbo - Peaceful Piano)
// Key: C Major • Tempo: 78 BPM • 4/4 Time Signature • 16 Measures
// Features 30-Second Random Play Sessions, 5 Lives Challenge, No-Fail Relaxed Mode, and 100k Standardized Competition Scoring!

import { audioManager } from '../audio/AudioManager.js';
import { competitionLeaderboardService } from './CompetitionLeaderboardService.js';

export const NADIMU_MEASURES = [
  // SYSTEM 1 (Measures 1 - 4: Verse 1 & Opening Theme)
  {
    index: 0,
    measure: 1,
    system: 1,
    chord: 'C',
    fingerCount: 1,
    emoji: '☝️',
    label: '1 Jari: C (Do)',
    lyric: "Kala nanti badai 'kan datang",
    notes: 'G4 - E5 - D5 - C5 - G4',
    melodyNotes: ['G4', 'E5', 'D5', 'C5', 'G4'],
    bassNote: 'C2',
    chordDesc: 'C Major (Akar Hangat & Kedamaian)',
    keys: ['C3', 'G3', 'C4', 'E4', 'G4'],
  },
  {
    index: 1,
    measure: 2,
    system: 1,
    chord: 'F',
    fingerCount: 2,
    emoji: '✌️',
    label: '2 Jari: F (Hangat)',
    lyric: 'Angin akan buat kau goyah',
    notes: 'A4 - C5 - A4 - G4 - F4',
    melodyNotes: ['A4', 'C5', 'A4', 'G4', 'F4'],
    bassNote: 'F2',
    chordDesc: 'F Major (Hembusan Angin Lembut)',
    keys: ['F3', 'C4', 'F4', 'A4'],
  },
  {
    index: 2,
    measure: 3,
    system: 1,
    chord: 'Em',
    fingerCount: 3,
    emoji: '🤟',
    label: '3 Jari: Em (Melankolis)',
    lyric: 'Maafkan, hidup memang',
    notes: 'B4 - G4 - E4 - G4 - B4',
    melodyNotes: ['B4', 'G4', 'E4', 'G4', 'B4'],
    bassNote: 'E2',
    chordDesc: 'E Minor (Sentuhan Penuh Kasih Sayang)',
    keys: ['E3', 'B3', 'E4', 'G4'],
  },
  {
    index: 3,
    measure: 4,
    system: 1,
    chord: 'Am',
    fingerCount: 3,
    emoji: '🤟',
    label: '3 Jari: Am (Teguh)',
    lyric: 'Ingin kau lebih kuat...',
    notes: 'C5 - B4 - A4 - E4',
    melodyNotes: ['C5', 'B4', 'A4', 'E4'],
    bassNote: 'A2',
    chordDesc: 'A Minor (Keteguhan Jiwa & Nasihat)',
    keys: ['A3', 'E4', 'A4', 'C5'],
  },

  // SYSTEM 2 (Measures 5 - 8: Verse 2 & Transition)
  {
    index: 4,
    measure: 5,
    system: 2,
    chord: 'Dm',
    fingerCount: 2,
    emoji: '✌️',
    label: '2 Jari: Dm (Alunan)',
    lyric: 'Andaikan saat itu datang',
    notes: 'F4 - A4 - D5 - F5',
    melodyNotes: ['F4', 'A4', 'D5', 'F5'],
    bassNote: 'D2',
    chordDesc: 'D Minor (Alunan Rindu & Pesan Hangat)',
    keys: ['D3', 'A3', 'D4', 'F4'],
  },
  {
    index: 5,
    measure: 6,
    system: 2,
    chord: 'G',
    fingerCount: 4,
    emoji: '🖐️',
    label: '4 Jari: G (Dominan)',
    lyric: 'Kami tak ada menemani',
    notes: 'G4 - B4 - D5 - F5 - E5',
    melodyNotes: ['G4', 'B4', 'D5', 'F5', 'E5'],
    bassNote: 'G2',
    chordDesc: 'G Major (Janji Cinta Abadi)',
    keys: ['G3', 'D4', 'G4', 'B4'],
  },
  {
    index: 6,
    measure: 7,
    system: 2,
    chord: 'C',
    fingerCount: 1,
    emoji: '☝️',
    label: '1 Jari: C (Do)',
    lyric: 'Aku ingin kamu mendengar',
    notes: 'E5 - D5 - C5 - G4 - E4',
    melodyNotes: ['E5', 'D5', 'C5', 'G4', 'E4'],
    bassNote: 'C2',
    chordDesc: 'C Major (Pesan Tulus Dari Hati)',
    keys: ['C3', 'G3', 'C4', 'E4', 'G4'],
  },
  {
    index: 7,
    measure: 8,
    system: 2,
    chord: 'G',
    fingerCount: 4,
    emoji: '🖐️',
    label: '4 Jari: G (Persiapan)',
    lyric: 'Nyanyianku di sini... 🕊️',
    notes: 'G4 - A4 - B4 - D5',
    melodyNotes: ['G4', 'A4', 'B4', 'D5'],
    bassNote: 'G2',
    chordDesc: 'G Major (Menuju Reff Kasih Sayang)',
    keys: ['G3', 'D4', 'G4', 'B4'],
  },

  // SYSTEM 3 (Measures 9 - 12: Main Chorus / Reff Utama)
  {
    index: 8,
    measure: 9,
    system: 3,
    chord: 'F',
    fingerCount: 2,
    emoji: '✌️',
    label: '2 Jari: F (Reff)',
    lyric: 'Sedikit demi sedikit...',
    notes: 'C5 - C5 - D5 - E5 - F5',
    melodyNotes: ['C5', 'C5', 'D5', 'E5', 'F5'],
    bassNote: 'F2',
    chordDesc: 'F Major (Reff Kasih Sayang Mengalun)',
    keys: ['F3', 'C4', 'F4', 'A4'],
  },
  {
    index: 9,
    measure: 10,
    system: 3,
    chord: 'G',
    fingerCount: 4,
    emoji: '🖐️',
    label: '4 Jari: G (Nasihat)',
    lyric: 'Engkau akan berteman pahit',
    notes: 'G5 - F5 - E5 - D5',
    melodyNotes: ['G5', 'F5', 'E5', 'D5'],
    bassNote: 'G2',
    chordDesc: 'G Major (Nasihat Kehidupan)',
    keys: ['G3', 'D4', 'G4', 'B4'],
  },
  {
    index: 10,
    measure: 11,
    system: 3,
    chord: 'Em',
    fingerCount: 3,
    emoji: '🤟',
    label: '3 Jari: Em (Pelukan)',
    lyric: 'Luapkanlah bila menangis',
    notes: 'E5 - D5 - C5 - B4 - G4',
    melodyNotes: ['E5', 'D5', 'C5', 'B4', 'G4'],
    bassNote: 'E2',
    chordDesc: 'E Minor (Pelukan Hangat Orang Tua)',
    keys: ['E3', 'B3', 'E4', 'G4'],
  },
  {
    index: 11,
    measure: 12,
    system: 3,
    chord: 'Am',
    fingerCount: 3,
    emoji: '🤟',
    label: '3 Jari: Am (Ikatan)',
    lyric: 'Anakku, ingatlah semua...',
    notes: 'A4 - C5 - E5 - D5 - C5',
    melodyNotes: ['A4', 'C5', 'E5', 'D5', 'C5'],
    bassNote: 'A2',
    chordDesc: 'A Minor (Ikatan Batin yang Kuat)',
    keys: ['A3', 'E4', 'A4', 'C5'],
  },

  // SYSTEM 4 (Measures 13 - 16: Climax & Resolution)
  {
    index: 12,
    measure: 13,
    system: 4,
    chord: 'Dm',
    fingerCount: 2,
    emoji: '✌️',
    label: '2 Jari: Dm (Semangat)',
    lyric: 'Lelah tak akan tersia...',
    notes: 'F5 - E5 - D5 - A4',
    melodyNotes: ['F5', 'E5', 'D5', 'A4'],
    bassNote: 'D2',
    chordDesc: 'D Minor (Semangat & Perjuangan)',
    keys: ['D3', 'A3', 'D4', 'F4'],
  },
  {
    index: 13,
    measure: 14,
    system: 4,
    chord: 'G',
    fingerCount: 4,
    emoji: '🖐️',
    label: '4 Jari: G (Yakin)',
    lyric: 'Usah kau takut keras dunia',
    notes: 'B4 - D5 - G5 - F5',
    melodyNotes: ['B4', 'D5', 'G5', 'F5'],
    bassNote: 'G2',
    chordDesc: 'G Major (Keberanian Menghadapi Dunia)',
    keys: ['G3', 'D4', 'G4', 'B4'],
  },
  {
    index: 14,
    measure: 15,
    system: 4,
    chord: 'F',
    fingerCount: 2,
    emoji: '✌️',
    label: '2 Jari: F (Doa)',
    lyric: 'Doaku slalu bersamamu...',
    notes: 'A4 - C5 - E5 - G5',
    melodyNotes: ['A4', 'C5', 'E5', 'G5'],
    bassNote: 'F2',
    chordDesc: 'F Major (Pesan Kasih Terindah)',
    keys: ['F3', 'C4', 'F4', 'A4'],
  },
  {
    index: 15,
    measure: 16,
    system: 4,
    chord: 'C',
    fingerCount: 1,
    emoji: '☝️',
    label: '1 Jari: C (Resolusi)',
    lyric: 'Selalu ada di nadimu... ✨',
    notes: 'E5 - D5 - C5 - G4 - C5',
    melodyNotes: ['E5', 'D5', 'C5', 'G4', 'C5'],
    bassNote: 'C2',
    chordDesc: 'C Major (Resolusi Cinta Abadi Jumbo)',
    keys: ['C3', 'G3', 'C4', 'E4', 'G4'],
  },
];

export const NADIMU_PIANO_KEYS = [
  { note: 'C3', label: 'C3', isBlack: false, isBassHighlight: true },
  { note: 'D3', label: 'D3', isBlack: false, isBassHighlight: true },
  { note: 'E3', label: 'E3', isBlack: false, isBassHighlight: true },
  { note: 'F3', label: 'F3', isBlack: false, isBassHighlight: true },
  { note: 'G3', label: 'G3', isBlack: false, isBassHighlight: true },
  { note: 'A3', label: 'A3', isBlack: false, isBassHighlight: true },
  { note: 'B3', label: 'B3', isBlack: false },
  { note: 'C4', label: 'C4', isBlack: false },
  { note: 'D4', label: 'D4', isBlack: false },
  { note: 'E4', label: 'E4', isBlack: false },
  { note: 'F4', label: 'F4', isBlack: false },
  { note: 'G4', label: 'G4', isBlack: false },
  { note: 'A4', label: 'A4', isBlack: false },
  { note: 'B4', label: 'B4', isBlack: false },
  { note: 'C5', label: 'C5', isBlack: false },
  { note: 'D5', label: 'D5', isBlack: false },
  { note: 'E5', label: 'E5', isBlack: false },
  { note: 'F5', label: 'F5', isBlack: false },
  { note: 'G5', label: 'G5', isBlack: false },
];

export const NADIMU_SEGMENTS = [
  {
    id: 0,
    cycle: 0,
    startMeasureIndex: 0,
    measureNum: 1,
    startChord: 'C',
    fingerCount: 1,
    title: 'Bait 1 & Pembuka (C Major)',
    startSec: 0.0,
    lyricHint: "Kala nanti badai 'kan datang…",
    desc: '☝️ 1 Jari (C) • Intro Piano Tenang & Hangat',
  },
  {
    id: 1,
    cycle: 0,
    startMeasureIndex: 2,
    measureNum: 3,
    startChord: 'Em',
    fingerCount: 3,
    title: 'Bait 1 Part 2: Maafkan Hidup (Em)',
    startSec: 6.15,
    lyricHint: "Maafkan, hidup memang ingin kau lebih kuat… ✨",
    desc: '🤟 3 Jari (Em) • Alunan Lembut Penuh Makna',
  },
  {
    id: 2,
    cycle: 0,
    startMeasureIndex: 4,
    measureNum: 5,
    startChord: 'Dm',
    fingerCount: 2,
    title: 'Bait 2: Andaikan Saat Itu (Dm)',
    startSec: 12.31,
    lyricHint: 'Andaikan saat itu datang kami tak ada…',
    desc: '✌️ 2 Jari (Dm) • Alunan Pesan Kasih Sayang',
  },
  {
    id: 3,
    cycle: 0,
    startMeasureIndex: 6,
    measureNum: 7,
    startChord: 'C',
    fingerCount: 1,
    title: 'Bait 2 Part 2: Nyanyianku di Sini (C)',
    startSec: 18.46,
    lyricHint: 'Aku ingin kamu mendengar nyanyianku di sini… 🕊️',
    desc: '☝️ 1 Jari (C) • Pesan Tulus dari Hati',
  },
  {
    id: 4,
    cycle: 0,
    startMeasureIndex: 8,
    measureNum: 9,
    startChord: 'F',
    fingerCount: 2,
    title: 'Reff Utama Jumbo (F Major)',
    startSec: 24.62,
    lyricHint: 'Reff: Sedikit demi sedikit engkau akan…',
    desc: '✌️ 2 Jari (F) • Melodi Reff Utama Mengalun',
  },
  {
    id: 5,
    cycle: 0,
    startMeasureIndex: 10,
    measureNum: 11,
    startChord: 'Em',
    fingerCount: 3,
    title: 'Reff Part 2: Luapkanlah Menangis (Em)',
    startSec: 30.77,
    lyricHint: 'Luapkanlah bila menangis, anakku ingatlah…',
    desc: '🤟 3 Jari (Em) • Pelukan Hangat Kasih Orang Tua',
  },
  {
    id: 6,
    cycle: 0,
    startMeasureIndex: 12,
    measureNum: 13,
    startChord: 'Dm',
    fingerCount: 2,
    title: 'Klimaks: Lelah Tak Akan Tersia (Dm)',
    startSec: 36.92,
    lyricHint: 'Lelah tak akan tersia, usah kau takut…',
    desc: '✌️ 2 Jari (Dm) • Puncak Semangat Perjuangan',
  },
  {
    id: 7,
    cycle: 0,
    startMeasureIndex: 14,
    measureNum: 15,
    startChord: 'F',
    fingerCount: 2,
    title: 'Resolusi: Selalu Ada di Nadimu (F / C)',
    startSec: 43.08,
    lyricHint: 'Doaku slalu bersamamu, selalu ada di nadimu… ✨',
    desc: '✌️ 2 Jari (F) • Puncak Emosional Terindah Jumbo',
  },
];

export class NadimuService {
  constructor() {
    this.measures = NADIMU_MEASURES;
    this.currentMeasureIndex = 0;
    this.mode = 'PLAY_ALONG';
    this.bpm = 78;
    this.beatDurationSec = 60 / this.bpm; // ~0.769s
    this.measureDurationSec = this.beatDurationSec * 4; // ~3.076s
    this.cycleDurationSec = this.measureDurationSec * 16; // ~49.23s

    // Backing track audio
    this.audioEl = null;
    this.audioSrc = '/sounds/selalu_ada_di_nadimu.mp3';
    this.audioOffsetSec = 0.0;
    this.backingVolume = 0.85;
    this.playerVolume = 0.50;

    // 45-Second Random Session Mode
    this.sessionMode = '30S_RANDOM';
    this.sessionDurationSec = 45.0;
    this.sessionStartSec = 0.0;
    this.currentSegment = NADIMU_SEGMENTS[0];
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

    // Accompaniment fallback
    this.tempoTimerId = null;
    this.currentTempoBeat = 0;

    // View Mode & Piano Tiles Engine
    this.viewMode = 'TILES';
    this.tilesEngine = null;

    // Gameplay Challenge & Lives System (5 Lives ❤️❤️❤️❤️❤️ + No-Fail Mode)
    this.maxLives = 5;
    this.lives = 5;
    this.isNoFail = false;
    this.introShieldDurationSec = 4.0;
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

    this.pickRandomSegment(false);
  }

  pickRandomSegment(excludeCurrent = true) {
    let pool = NADIMU_SEGMENTS;
    if (excludeCurrent && this.currentSegment) {
      pool = NADIMU_SEGMENTS.filter(s => s.id !== this.currentSegment.id);
    }
    const idx = Math.floor(Math.random() * pool.length);
    this.currentSegment = pool[idx] || NADIMU_SEGMENTS[0];
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
    if (this.lives < this.maxLives) {
      this.lives = Math.min(this.maxLives, this.lives + amount);
      if (this.onLifeRecovered) {
        this.onLifeRecovered({
          lives: this.lives,
          maxLives: this.maxLives,
          amount,
        });
      }
    }
  }

  loseLife(reason = 'CHORD_MISSED') {
    if (this.isNoFail || this.isGameOver || this.isFinished) return;

    const curSongTime = this.getCurrentSongTime();
    if (curSongTime < this.introShieldDurationSec) {
      return;
    }

    this.lives = Math.max(0, this.lives - 1);

    if (this.onLifeLost) {
      this.onLifeLost({
        lives: this.lives,
        maxLives: this.maxLives,
        reason,
        isGameOver: this.lives <= 0,
      });
    }

    if (this.lives <= 0) {
      this.triggerGameOver('LIVES_DEPLETED');
    }
  }

  triggerGameOver(reason = 'LIVES_DEPLETED') {
    if (this.isGameOver || this.isFinished) return;
    this.isGameOver = true;
    this.pause();

    const standardScore = this.getStandardizedScore();
    this.gameResult = {
      isVictory: false,
      reason,
      score: this.score,
      standardScore: standardScore.standardScore,
      accuracyPct: standardScore.accuracyPct,
      grade: standardScore.grade,
      maxCombo: this.maxCombo,
      perfectHits: this.perfectHits,
      greatHits: this.greatHits,
      goodHits: this.goodHits,
      missHits: this.missHits,
      songId: 'NADIMU',
      songTitle: '🎵 Selalu Ada di Nadimu - OST Jumbo',
    };

    if (this.onGameOver) {
      this.onGameOver(this.gameResult);
    }
  }

  triggerSongFinished() {
    if (this.isFinished || this.isGameOver) return;
    this.isFinished = true;
    this.pause();

    const standardScore = this.getStandardizedScore();
    const accuracy = standardScore.accuracyPct;

    // Grade Determination (S+, S, A, B, C)
    let grade = 'B';
    if (accuracy >= 98 && this.missHits === 0) grade = 'S+';
    else if (accuracy >= 90) grade = 'S';
    else if (accuracy >= 80) grade = 'A';
    else if (accuracy >= 65) grade = 'B';
    else grade = 'C';

    // Stars Rating (1 - 4 Stars)
    let stars = 1;
    if (accuracy >= 90 && this.missHits === 0) stars = 4;
    else if (accuracy >= 85) stars = 4;
    else if (accuracy >= 70) stars = 3;
    else if (accuracy >= 50) stars = 2;
    else stars = 1;

    this.gameResult = {
      isVictory: true,
      reason: 'SONG_COMPLETED',
      score: this.score,
      standardScore: standardScore.standardScore,
      accuracyPct: standardScore.accuracyPct,
      grade,
      stars,
      maxCombo: this.maxCombo,
      perfectHits: this.perfectHits,
      greatHits: this.greatHits,
      goodHits: this.goodHits,
      missHits: this.missHits,
      songId: 'NADIMU',
      songTitle: '🎵 Selalu Ada di Nadimu - OST Jumbo',
    };

    if (this.onSongFinished) {
      this.onSongFinished(this.gameResult);
    }
  }

  getStandardizedScore() {
    const totalHits = this.perfectHits + this.greatHits + this.goodHits + this.missHits;
    const baseCalc = competitionLeaderboardService.calculateStandardScore({
      totalNotes: Math.max(12, totalHits),
      perfectCount: this.perfectHits,
      greatCount: this.greatHits,
      goodCount: this.goodHits,
      badCount: 0,
      missCount: this.missHits,
      maxCombo: this.maxCombo,
      scorePct: totalHits > 0 ? Math.round(((this.perfectHits + this.greatHits * 0.8 + this.goodHits * 0.6) / totalHits) * 100) : 85,
    });
    return baseCalc;
  }

  getCurrentMeasure() {
    return this.measures[this.currentMeasureIndex] || this.measures[0];
  }

  getNextMeasure() {
    const nextIdx = (this.currentMeasureIndex + 1) % this.measures.length;
    return this.measures[nextIdx];
  }

  play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.isFinished = false;
    this.isGameOver = false;

    if (!this.audioEl) {
      this._initAudio();
    }

    audioManager.init();
    audioManager.resume();

    // In 45s Random mode, ensure audio starts with a gentle lead-in so the first tile glides down smoothly from above
    if (this.sessionMode === '30S_RANDOM' && this.audioEl) {
      const cur = this.audioEl.currentTime;
      const leadIn = Math.min(2.0, this.sessionStartSec);
      const actualStart = Math.max(0, this.sessionStartSec - leadIn);

      if (this.sessionRemainingSec <= 0.2 || this.sessionElapsedSec === 0 || cur < actualStart - 1.0 || cur >= this.sessionStartSec + this.sessionDurationSec) {
        try {
          this.audioEl.currentTime = actualStart;
        } catch (e) {}
        this.sessionElapsedSec = 0;
        this.sessionRemainingSec = this.sessionDurationSec;
        if (this.tilesEngine) {
          this.tilesEngine._audioAnchorTime = actualStart;
          this.tilesEngine._audioAnchorPerf = performance.now();
          this.tilesEngine._lastRawAudioTime = actualStart;
          this.tilesEngine._smoothSongTime = actualStart;
        }
      }
      this.audioEl.playbackRate = 1.0;
    }

    if (this.audioEl) {
      this.audioEl.play().catch(e => {
        console.warn('Audio play prevented, user interaction required:', e);
      });
    }

    this._startLoop();

    if (this.tilesEngine) {
      this.tilesEngine.start();
    }

    if (this.onAudioStateChanged) {
      this.onAudioStateChanged(true);
    }
  }

  pause() {
    this.isPlaying = false;
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
    if (this.tilesEngine) {
      this.tilesEngine.stop();
    }
    if (this.onAudioStateChanged) {
      this.onAudioStateChanged(false);
    }
  }

  stop() {
    this.pause();
    this.currentMeasureIndex = this.currentSegment ? (this.currentSegment.startMeasureIndex || 0) : 0;
    this.sessionElapsedSec = 0.0;
    this.sessionRemainingSec = this.sessionDurationSec;
    this.score = 0;
    this.combo = 0;
    this.perfectHits = 0;
    this.greatHits = 0;
    this.goodHits = 0;
    this.missHits = 0;
    this.maxCombo = 0;
    this.lives = this.maxLives;
    this.isGameOver = false;
    this.isFinished = false;
    this.evaluatedMeasures.clear();
    this.playedMeasureIndices.clear();

    if (this.audioEl) {
      try {
        this.audioEl.playbackRate = 1.0;
        this.audioEl.currentTime = this.sessionMode === '30S_RANDOM' ? this.sessionStartSec : 0;
      } catch (e) {}
    }

    if (this.tilesEngine) {
      this.tilesEngine.reset();
    }

    if (this.onMeasureChanged) {
      this.onMeasureChanged(this.getCurrentMeasure(), this.currentMeasureIndex);
    }
    if (this.onStateChanged) {
      this.onStateChanged();
    }
  }

  reset() {
    this.stop();
    if (this.tilesEngine) {
      this.tilesEngine.reset();
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
      if (this.tilesEngine.draw) this.tilesEngine.draw();
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
    if (this.onMeasureChanged) {
      this.onMeasureChanged(this.getCurrentMeasure(), this.currentMeasureIndex);
    }
    if (this.onStateChanged) {
      this.onStateChanged();
    }
  }

  finish() {
    this.triggerSongFinished();
  }

  triggerChord(measureIndex, isUserAction = false) {
    if (measureIndex < 0 || measureIndex >= this.measures.length) return null;
    const measure = this.measures[measureIndex];
    const now = performance.now();

    if (isUserAction && now - this.lastTriggerTime < 250) {
      return null;
    }
    this.lastTriggerTime = now;
    this.playedMeasureIndices.add(measureIndex);

    // Play pure acoustic grand piano chord
    audioManager.init();
    audioManager.resume();
    audioManager.loadPianoSamples().catch(() => {});

    const sweetVoicings = {
      'C': ['C4', 'E4', 'G4', 'C5'],
      'F': ['C4', 'F4', 'A4', 'C5'],
      'Em': ['B3', 'E4', 'G4', 'B4'],
      'G': ['B3', 'D4', 'G4', 'B4'],
      'Dm': ['A3', 'D4', 'F4', 'A4'],
      'Am': ['C4', 'E4', 'A4', 'C5'],
    };
    const voicing = sweetVoicings[measure.chord] || (measure.melodyNotes && measure.melodyNotes.slice(0, 3)) || ['C4', 'E4', 'G4'];
    audioManager.playKomangMelodyNote(voicing, {
      duration: 2.2,
      gainScale: this.playerVolume || 0.48,
      isPerfect: true,
      preset: 'Acoustic Piano',
    });

    let rating = 'PERFECT';
    let points = 1000;

    if (this.audioEl) {
      const adjustedSec = Math.max(0, this.audioEl.currentTime - this.audioOffsetSec);
      const cycleSec = adjustedSec % this.cycleDurationSec;
      const measureProgress = (cycleSec % this.measureDurationSec) / this.measureDurationSec;

      if (measureProgress <= 0.35 || measureProgress >= 0.85) {
        rating = 'PERFECT';
        points = 1000;
        this.perfectHits++;
      } else if (measureProgress <= 0.60) {
        rating = 'GREAT';
        points = 600;
        this.greatHits++;
      } else {
        rating = 'GOOD';
        points = 300;
        this.goodHits++;
      }
    }

    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
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
        lives: this.lives,
        isUserAction,
      });
    }
    return { measure, rating, points };
  }

  jumpToMeasure(idx) {
    if (idx < 0 || idx >= this.measures.length) return;
    this.currentMeasureIndex = idx;
    const targetSec = idx * this.measureDurationSec;

    if (this.sessionMode === '30S_RANDOM') {
      this.sessionStartSec = targetSec;
      this.sessionElapsedSec = 0.0;
      this.sessionRemainingSec = this.sessionDurationSec;
    }

    if (this.audioEl) {
      this.audioEl.currentTime = targetSec;
    }

    if (this.tilesEngine) {
      this.tilesEngine.seekTime(targetSec);
    }

    if (this.onMeasureChanged) {
      this.onMeasureChanged(this.getCurrentMeasure(), idx);
    }
  }

  _initAudio() {
    try {
      this.audioEl = new Audio(this.audioSrc);
      this.audioEl.volume = this.backingVolume;
      this.audioEl.preload = 'auto';

      this.audioEl.addEventListener('ended', () => {
        this.triggerSongFinished();
      });

      this.audioEl.addEventListener('error', (e) => {
        console.warn('Nadimu backing audio failed to load:', e);
      });
    } catch (e) {
      console.warn('Audio element initialization failed:', e);
    }
  }

  _startLoop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    const loop = (timestamp) => {
      if (!this.isPlaying) return;

      let songTime = 0;
      if (this.tilesEngine && this.viewMode === 'TILES') {
        songTime = this.tilesEngine.getCurrentSongTime();
      } else if (this.audioEl && !this.audioEl.paused) {
        songTime = Math.max(0, this.audioEl.currentTime - this.audioOffsetSec);
      }

      // Check 45-Second timer countdown with Gradual Speed Acceleration
      if (this.sessionMode === '30S_RANDOM') {
        const elapsed = Math.max(0, songTime - this.sessionStartSec);
        this.sessionElapsedSec = elapsed;
        this.sessionRemainingSec = Math.max(0, this.sessionDurationSec - elapsed);

        if (elapsed >= this.sessionDurationSec && songTime >= this.sessionStartSec) {
          if (this.audioEl) {
            try {
              this.audioEl.playbackRate = 1.0;
              this.audioEl.pause();
            } catch (e) {}
          }
          this.triggerSongFinished();
          return;
        }
      }

      // Calculate active measure
      const activeCycleSec = songTime % this.cycleDurationSec;
      const measureIdx = Math.min(15, Math.floor(activeCycleSec / this.measureDurationSec));

      if (measureIdx !== this.currentMeasureIndex) {
        this.currentMeasureIndex = measureIdx;
        if (this.onMeasureChanged) {
          this.onMeasureChanged(this.getCurrentMeasure(), measureIdx);
        }
      }

      if (this.onTimelineTick) {
        this.onTimelineTick({
          songTime,
          currentTimeSec: songTime,
          measureIndex: this.currentMeasureIndex,
          measure: this.getCurrentMeasure(),
          sessionRemainingSec: this.sessionRemainingSec,
          sessionElapsedSec: this.sessionElapsedSec,
          sessionDurationSec: this.sessionDurationSec,
          totalDurationSec: (this.audioEl && this.audioEl.duration) ? this.audioEl.duration : 283,
          is30sSession: this.sessionMode === '30S_RANDOM',
          sessionProgress: this.sessionDurationSec > 0 ? (this.sessionElapsedSec / this.sessionDurationSec) : 0,
          score: this.score,
          combo: this.combo,
          lives: this.lives,
        });
      }

      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  /**
   * Sound synthesis when chord is triggered - enforces pure, majestic piano sound (no guitars)!
   */
  playChordNotes(chordName, melodyNotes = null, lane = 0, isPerfect = true) {
    try {
      audioManager.init();
      audioManager.resume();
      const keys = (melodyNotes && melodyNotes.length > 0) ? melodyNotes : ['G4', 'C5', 'E5'];
      // Ensure Nadimu always plays beautiful pure piano, never guitar!
      let preset = audioManager.currentPreset;
      if (!preset || preset.toLowerCase().includes('guitar')) {
        preset = 'Acoustic Piano';
      }
      audioManager.playKomangMelodyNote(keys, {
        duration: 1.6,
        gainScale: this.playerVolume || 0.48,
        isPerfect: isPerfect,
        lane: lane,
        preset: 'Acoustic Piano',
      });
    } catch (e) {}
  }

  evaluateGesture(totalFingers, hasHand = true) {
    if (!hasHand) {
      this.lastDetectedFingers = -1;
      return null;
    }
    this.lastDetectedFingers = totalFingers;
    if (this.tilesEngine) {
      return this.tilesEngine.evaluateGesture(totalFingers, hasHand);
    }
    return null;
  }
}

export const nadimuService = new NadimuService();
