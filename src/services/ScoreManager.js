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
    try {
      this.bestScorePct = parseInt(localStorage.getItem('gs_best_score_pct') || '0', 10);
      this.bestCombo = parseInt(localStorage.getItem('gs_best_combo') || '0', 10);
      this.highestLevel = parseInt(localStorage.getItem('gs_highest_level') || '1', 10);
      this.campaignScores = JSON.parse(localStorage.getItem('gs_campaign_scores') || '{}');
    } catch (e) {
      this.bestScorePct = 0;
      this.bestCombo = 0;
      this.highestLevel = 1;
      this.campaignScores = {};
    }
  }

  saveRecords() {
    try {
      localStorage.setItem('gs_best_score_pct', this.bestScorePct.toString());
      localStorage.setItem('gs_best_combo', this.bestCombo.toString());
      localStorage.setItem('gs_highest_level', this.highestLevel.toString());
      localStorage.setItem('gs_campaign_scores', JSON.stringify(this.campaignScores));
    } catch (e) {}
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
