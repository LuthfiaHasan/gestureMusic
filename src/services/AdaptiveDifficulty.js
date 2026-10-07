// AdaptiveDifficulty.js - Rule-Based Dynamic Difficulty Balancer
// Adjusts timing tolerance and rhythm challenge based purely on player performance (No Reinforcement Learning)

export class AdaptiveDifficulty {
  constructor() {
    this.modifiers = {
      sequenceLengthDelta: 0,
      timingWindowMultiplier: 1.0, // 1.0 = standard, <1.0 = tighter, >1.0 = relaxed
      bpmModifier: 0,
      simplifyGestures: false,
    };
    this.lastEvaluation = null;
  }

  reset() {
    this.modifiers = {
      sequenceLengthDelta: 0,
      timingWindowMultiplier: 1.0,
      bpmModifier: 0,
      simplifyGestures: false,
    };
    this.lastEvaluation = null;
  }

  /**
   * Evaluates the round summary and updates difficulty rules:
   * - Accuracy > 90% -> increase difficulty / tighter timing
   * - Accuracy 70-90% -> maintain
   * - Accuracy < 70% -> lower difficulty / relaxed tolerance
   */
  evaluateRound(summary) {
    const accuracy = summary.chordAccuracy !== undefined ? summary.chordAccuracy : (summary.scorePct || 0);
    const misses = (summary.missCount || 0) + (summary.badCount || 0);

    let status = 'BALANCED';
    let feedback = 'Difficulty maintained for your skill level.';

    if (accuracy >= 90 && misses <= 2) {
      status = 'INCREASE';
      feedback = 'Outstanding accuracy! Tightening timing window & increasing tempo.';
      this.modifiers.sequenceLengthDelta = Math.min(2, this.modifiers.sequenceLengthDelta + 1);
      this.modifiers.timingWindowMultiplier = Math.max(0.75, +(this.modifiers.timingWindowMultiplier - 0.08).toFixed(2));
      this.modifiers.bpmModifier = Math.min(10, this.modifiers.bpmModifier + 3);
      this.modifiers.simplifyGestures = false;
    } else if (accuracy < 70 || misses >= 4) {
      status = 'DECREASE';
      feedback = 'Difficulty relaxed: granting larger timing tolerance & gentle tempo.';
      this.modifiers.sequenceLengthDelta = Math.max(-2, this.modifiers.sequenceLengthDelta - 1);
      this.modifiers.timingWindowMultiplier = Math.min(1.35, +(this.modifiers.timingWindowMultiplier + 0.12).toFixed(2));
      this.modifiers.bpmModifier = Math.max(-10, this.modifiers.bpmModifier - 4);
      this.modifiers.simplifyGestures = true;
    } else {
      status = 'BALANCED';
      feedback = 'Solid groove! Challenge tuned perfectly to your rhythm.';
    }

    this.lastEvaluation = {
      status,
      feedback,
      accuracy,
      misses,
      modifiers: { ...this.modifiers },
    };

    return this.lastEvaluation;
  }

  /**
   * Backward-compatible alias for evaluateRound
   */
  evaluatePerformance(data) {
    return this.evaluateRound({
      chordAccuracy: data.accuracy,
      missCount: data.misses,
      scorePct: data.accuracy,
    });
  }

  /**
   * Applies rule-based modifiers to the level configuration
   */
  applyToLevelConfig(levelConfig) {
    const chordCount = Math.max(3, Math.min(14, levelConfig.chordCount + this.modifiers.sequenceLengthDelta));
    const effectiveBpm = Math.max(44, Math.min(150, (levelConfig.bpm || 80) + this.modifiers.bpmModifier));

    const baseWindows = levelConfig.timingWindows || { perfect: 90, great: 160, good: 260, bad: 400 };
    const mult = this.modifiers.timingWindowMultiplier;

    return {
      ...levelConfig,
      bpm: effectiveBpm,
      chordCount,
      timingWindows: {
        perfect: Math.round(baseWindows.perfect * mult),
        great: Math.round(baseWindows.great * mult),
        good: Math.round(baseWindows.good * mult),
        bad: Math.round(baseWindows.bad * mult),
      },
    };
  }
}

export const adaptiveDifficulty = new AdaptiveDifficulty();
