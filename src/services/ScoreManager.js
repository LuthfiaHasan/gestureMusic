// ScoreManager.js - Rhythm Challenge Scoring, 5-Star Rating, and Combo Engine

export const STAR_RATINGS = {
  5: { stars: 5, label: 'EXCELLENT!', voice: 'Excellent!', emoji: '⭐⭐⭐⭐⭐' },
  4: { stars: 4, label: 'GREAT!', voice: 'Great!', emoji: '⭐⭐⭐⭐' },
  3: { stars: 3, label: 'GOOD!', voice: 'Good!', emoji: '⭐⭐⭐' },
  2: { stars: 2, label: 'POOR!', voice: 'Poor!', emoji: '⭐⭐' },
  1: { stars: 1, label: 'BAD!', voice: 'Bad!', emoji: '⭐' },
};

export class ScoreManager {
  constructor() {
    this.resetRound();
    this.bestScorePct = 0;
    this.bestCombo = 0;
    this.highestLevel = 1;

    this.loadRecords();
  }

  get bestScore() {
    return this.bestScorePct || 0;
  }

  get score() {
    return this.scorePoints || 0;
  }

  resetRound() {
    this.scorePoints = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.totalNotes = 0;

    // Counts
    this.perfectCount = 0;
    this.greatCount = 0;
    this.goodCount = 0;
    this.badCount = 0;
    this.missCount = 0;

    // Detailed metrics
    this.correctChordsHit = 0;
    this.timingPointsTotal = 0;
    this.timingDiffs = [];
  }

  /**
   * Registers a hit evaluation from RhythmEngine
   * @param {string} rating - PERFECT, GREAT, GOOD, BAD, MISS
   * @param {number} timingDiffMs - Time offset in milliseconds
   * @param {boolean} isChordCorrect - Did player match the chord gesture?
   */
  registerHit(rating, timingDiffMs = 0, isChordCorrect = false) {
    this.totalNotes++;
    this.timingDiffs.push(Math.abs(timingDiffMs));

    let timingPoints = 0;

    switch (rating) {
      case 'PERFECT':
        timingPoints = 100;
        this.perfectCount++;
        this.combo++;
        break;
      case 'GREAT':
        timingPoints = 80;
        this.greatCount++;
        this.combo++;
        break;
      case 'GOOD':
        timingPoints = 60;
        this.goodCount++;
        this.combo++;
        break;
      case 'BAD':
        timingPoints = 30;
        this.badCount++;
        this.combo = 0; // Combo reset on BAD
        break;
      case 'MISS':
      default:
        timingPoints = 0;
        this.missCount++;
        this.combo = 0; // Combo reset on MISS
        break;
    }

    if (isChordCorrect && rating !== 'MISS') {
      this.correctChordsHit++;
    }

    this.timingPointsTotal += timingPoints;

    // Arcade points with combo multiplier for display
    const mult = this.getMultiplier();
    const pointsEarned = Math.round(timingPoints * mult);
    this.scorePoints += pointsEarned;

    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }

    return {
      rating,
      timingDiffMs,
      pointsEarned,
      combo: this.combo,
      multiplier: mult,
      currentScorePct: this.getFinalScorePct(),
    };
  }

  getMultiplier() {
    if (this.combo >= 20) return 3.0;
    if (this.combo >= 15) return 2.5;
    if (this.combo >= 10) return 2.0;
    if (this.combo >= 5) return 1.5;
    return 1.0;
  }

  /**
   * Timing Score %: based on millisecond precision
   */
  getTimingScorePct() {
    if (this.totalNotes === 0) return 100;
    return Math.round((this.timingPointsTotal / (this.totalNotes * 100)) * 100);
  }

  /**
   * Chord Accuracy %: proportion of correct chord gestures
   */
  getChordAccuracyPct() {
    if (this.totalNotes === 0) return 100;
    return Math.round((this.correctChordsHit / this.totalNotes) * 100);
  }

  /**
   * Combo Performance %
   */
  getComboPerformancePct() {
    if (this.totalNotes === 0) return 100;
    return Math.min(100, Math.round((this.maxCombo / this.totalNotes) * 100));
  }

  /**
   * Final Score Formula:
   * Final Score = Timing Score × 50% + Chord Accuracy × 30% + Combo Performance × 20%
   */
  getFinalScorePct() {
    if (this.totalNotes === 0) return 0;
    const timing = this.getTimingScorePct();
    const chord = this.getChordAccuracyPct();
    const combo = this.getComboPerformancePct();

    const raw = (timing * 0.50) + (chord * 0.30) + (combo * 0.20);
    return Math.min(100, Math.max(0, Math.round(raw)));
  }

  /**
   * 5-Star Rating determination:
   * Score ≥ 95% -> 5 Stars (EXCELLENT!)
   * Score 85–94% -> 4 Stars (GREAT!)
   * Score 70–84% -> 3 Stars (GOOD!)
   * Score 50–69% -> 2 Stars (POOR!)
   * Score < 50%  -> 1 Star  (BAD!)
   */
  getStarRating() {
    const scorePct = this.getFinalScorePct();
    if (scorePct >= 95) return 5;
    if (scorePct >= 85) return 4;
    if (scorePct >= 70) return 3;
    if (scorePct >= 50) return 2;
    return 1;
  }

  getAverageTimingDiffMs() {
    if (this.timingDiffs.length === 0) return 0;
    const sum = this.timingDiffs.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.timingDiffs.length);
  }

  getSummary() {
    const scorePct = this.getFinalScorePct();
    const stars = this.getStarRating();
    const starInfo = STAR_RATINGS[stars] || STAR_RATINGS[1];
    const avgTimingDiff = this.getAverageTimingDiffMs();

    const isNewHighScore = scorePct > this.bestScorePct;
    if (isNewHighScore) {
      this.bestScorePct = scorePct;
    }
    if (this.maxCombo > this.bestCombo) {
      this.bestCombo = this.maxCombo;
    }

    this.saveRecords();

    return {
      scorePct,
      arcadePoints: this.scorePoints,
      timingScore: this.getTimingScorePct(),
      chordAccuracy: this.getChordAccuracyPct(),
      comboPerformance: this.getComboPerformancePct(),
      stars,
      starLabel: starInfo.label,
      voiceFeedback: starInfo.voice,
      starEmoji: starInfo.emoji,
      totalNotes: this.totalNotes,
      perfectCount: this.perfectCount,
      greatCount: this.greatCount,
      goodCount: this.goodCount,
      badCount: this.badCount,
      missCount: this.missCount,
      combo: this.combo,
      maxCombo: this.maxCombo,
      avgTimingDiffMs: avgTimingDiff,
      isNewHighScore,
      bestScorePct: this.bestScorePct,
      bestCombo: this.bestCombo,
      highestLevel: this.highestLevel,
    };
  }

  loadRecords() {
    // 1. Best Score %
    try {
      const val = parseInt(localStorage.getItem('gs_best_score_pct') || '0', 10);
      this.bestScorePct = Number.isFinite(val) ? val : 0;
    } catch (e) {
      this.bestScorePct = 0;
    }

    // 2. Best Combo
    try {
      const val = parseInt(localStorage.getItem('gs_best_combo') || '0', 10);
      this.bestCombo = Number.isFinite(val) ? val : 0;
    } catch (e) {
      this.bestCombo = 0;
    }

    // 3. Highest Level
    try {
      const val = parseInt(localStorage.getItem('gs_highest_level') || '1', 10);
      this.highestLevel = Number.isFinite(val) ? Math.min(8, Math.max(1, val)) : 1;
    } catch (e) {
      this.highestLevel = 1;
    }

    // 4. Campaign Scores
    try {
      const raw = localStorage.getItem('gs_campaign_scores');
      this.campaignScores = raw ? (JSON.parse(raw) || {}) : {};
      if (typeof this.campaignScores !== 'object' || Array.isArray(this.campaignScores)) {
        this.campaignScores = {};
      }
    } catch (e) {
      this.campaignScores = {};
    }

    // 5. Run History (Last 25 games)
    try {
      const raw = localStorage.getItem('gs_run_history');
      this.runHistory = raw ? (JSON.parse(raw) || []) : [];
      if (!Array.isArray(this.runHistory)) this.runHistory = [];
    } catch (e) {
      this.runHistory = [];
    }

    // 6. Mode Records
    try {
      const raw = localStorage.getItem('gs_mode_records');
      this.modeRecords = raw ? (JSON.parse(raw) || {}) : {};
    } catch (e) {
      this.modeRecords = {};
    }

    // 7. Player Name
    try {
      this.playerName = localStorage.getItem('gs_player_name') || 'CYBER_PLAYER';
    } catch (e) {
      this.playerName = 'CYBER_PLAYER';
    }
  }

  saveRecords() {
    try {
      localStorage.setItem('gs_best_score_pct', this.bestScorePct.toString());
      localStorage.setItem('gs_best_combo', this.bestCombo.toString());
      localStorage.setItem('gs_highest_level', this.highestLevel.toString());
      localStorage.setItem('gs_campaign_scores', JSON.stringify(this.campaignScores));
      localStorage.setItem('gs_run_history', JSON.stringify(this.runHistory.slice(-25)));
      localStorage.setItem('gs_mode_records', JSON.stringify(this.modeRecords));
      localStorage.setItem('gs_player_name', this.playerName || 'CYBER_PLAYER');
    } catch (e) {
      console.warn('LocalStorage save records note:', e);
    }
  }

  setPlayerName(name) {
    if (name && typeof name === 'string') {
      this.playerName = name.trim().slice(0, 16) || 'CYBER_PLAYER';
      this.saveRecords();
    }
  }

  recordGameRun(mode, summary) {
    const runEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
      playerName: this.playerName || 'CYBER_PLAYER',
      mode: mode || 'CLASSIC',
      scorePct: summary.scorePct || 0,
      scorePoints: summary.score || summary.scorePoints || 0,
      combo: summary.maxCombo || summary.combo || 0,
      stars: summary.stars || 1,
      starLabel: summary.starLabel || 'GOOD',
      level: summary.level || 1,
      timestamp: Date.now(),
      dateFormatted: new Date().toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    };

    this.runHistory.push(runEntry);
    if (this.runHistory.length > 25) {
      this.runHistory.shift();
    }

    // Update mode high scores
    if (!this.modeRecords[mode]) this.modeRecords[mode] = { bestScore: 0, bestCombo: 0 };
    if (runEntry.scorePct > (this.modeRecords[mode].bestScore || 0)) {
      this.modeRecords[mode].bestScore = runEntry.scorePct;
    }
    if (runEntry.combo > (this.modeRecords[mode].bestCombo || 0)) {
      this.modeRecords[mode].bestCombo = runEntry.combo;
    }

    this.saveRecords();
    return runEntry;
  }

  getLocalLeaderboard(mode = null) {
    let list = [...this.runHistory];
    if (mode) {
      list = list.filter(r => r.mode === mode);
    }
    list.sort((a, b) => (b.scorePct || 0) - (a.scorePct || 0));
    return list.slice(0, 10);
  }

  unlockLevel(level) {
    if (level > this.highestLevel) {
      this.highestLevel = Math.min(8, level);
      this.saveRecords();
    }
  }

  /**
   * Records a level score in the overall event campaign (Level 1..8)
   */
  recordLevelScore(levelNum, scorePct) {
    this.campaignScores[levelNum] = Math.max(scorePct, this.campaignScores[levelNum] || 0);
    this.saveRecords();
  }

  /**
   * Calculates overall campaign score across all completed levels and determines prize eligibility
   */
  getCampaignGrandSummary() {
    const scores = [];
    for (let l = 1; l <= 8; l++) {
      if (this.campaignScores[l] !== undefined) {
        scores.push({ level: l, score: this.campaignScores[l] });
      }
    }

    const completedCount = scores.length;
    const grandScorePct = completedCount > 0 
      ? Math.round(scores.reduce((sum, item) => sum + item.score, 0) / completedCount) 
      : 0;

    let prizeTier = 'PARTICIPATION';
    let prizeBadge = '🥉';
    let prizeTitle = 'HADIAH HIBURAN BOOTH';
    let prizeDesc = 'Terima kasih telah mencoba! Anda berhak mendapatkan Hadiah Hiburan / Souvenir Booth.';
    let isEligible = grandScorePct >= 70;

    if (grandScorePct >= 85) {
      prizeTier = 'GRAND_PRIZE';
      prizeBadge = '🏆';
      prizeTitle = 'HADIAH UTAMA (GRAND PRIZE)!';
      prizeDesc = 'LUAR BIASA! Rata-rata skor Anda mencapai 85%+. Anda LAYAK mendapatkan Hadiah Utama Event!';
    } else if (grandScorePct >= 70) {
      prizeTier = 'SPECIAL_MERCH';
      prizeBadge = '🎁';
      prizeTitle = 'HADIAH MERCHANDISE SPESIAL!';
      prizeDesc = 'HEBAT! Rata-rata skor Anda mencapai 70%+. Anda LAYAK mendapatkan Merchandise Spesial Event!';
    }

    return {
      scores,
      completedCount,
      grandScorePct,
      prizeTier,
      prizeBadge,
      prizeTitle,
      prizeDesc,
      isEligible,
      isGrandFinale: completedCount >= 8,
    };
  }

  /**
   * Reset campaign progress for the next event booth attendee
   */
  resetCampaign() {
    this.campaignScores = {};
    this.highestLevel = 1;
    this.saveRecords();
  }
}

export const scoreManager = new ScoreManager();
