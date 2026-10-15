
// RhythmEngine.js - Real-Time Rhythm, Beat Tracking, and Hit Zone Timing Engine
// Synchronizes music timeline, chord targets, moving notes, and player gesture timing.

import { chordMappingService } from './ChordMappingService.js';
import { audioManager } from '../audio/AudioManager.js';

export const HIT_RATINGS = {
  PERFECT: 'PERFECT',
  GREAT: 'GREAT',
  GOOD: 'GOOD',
  BAD: 'BAD',
  MISS: 'MISS',
};

export class RhythmEngine {
  constructor() {
    this.bpm = 85;
    this.beatDurationMs = (60 / this.bpm) * 1000;
    this.countInBeats = 4; // 4-beat preparatory lead-in
    this.countInDurationMs = this.countInBeats * this.beatDurationMs;
    this.phrase = null;
    this.levelConfig = null;
    this.mode = 'CLASSIC';

    // Timeline state
    this.startTime = 0;
    this.currentTimeMs = 0;
    this.isPlaying = false;
    this.animFrameId = null;

    // Targets on the timeline
    this.targets = [];
    this.currentTargetIndex = 0;

    // Metronome / Beat accompaniment scheduler
    this.lastScheduledBeat = -1;

    // Dynamic timing tolerances (ms) - tuned strictly by level difficulty
    this.tolerance = {
      perfect: 90,
      great: 160,
      good: 260,
      bad: 400,
    };

    // Callbacks for UI updates
    this.onFrameTick = null;        // Called each rAF frame with timeline info
    this.onBeatTick = null;         // Called on each beat (beatIndex, isCountIn)
    this.onTargetHit = null;        // Called when a target is hit or missed
    this.onSongCompleted = null;    // Called when the song reaches the end
    this.onEndlessPhraseEnd = null; // Called in ENDLESS mode when phrase completes
  }

  /**
   * Initializes the rhythm challenge for a given musical phrase and level
   */
  setup(phrase, levelConfig, mode = 'CLASSIC') {
    this.stop();
    this.phrase = phrase;
    this.levelConfig = levelConfig;
    this.mode = mode;

    // Set BPM: in Time Attack, boost BPM; otherwise use level/phrase tempo
    let targetBpm = levelConfig.bpm || phrase.tempo || 85;
    if (this.mode === 'TIME_ATTACK') {
      targetBpm = Math.min(145, Math.max(110, targetBpm + 22));
    }
    this.bpm = targetBpm;
    this.beatDurationMs = (60 / this.bpm) * 1000;
    this.countInBeats = 4;
    this.countInDurationMs = this.countInBeats * this.beatDurationMs;

    // Configure timing tolerances based on level difficulty and game mode
    this._configureTolerances(levelConfig.level || 1, this.mode);

    // Build the rhythm target timeline with musical variety
    this.targets = this._buildTargetTimeline(phrase, levelConfig);
    this.currentTargetIndex = 0;
    this.lastScheduledBeat = -1;

    return {
      bpm: this.bpm,
      beatDurationMs: this.beatDurationMs,
      totalDurationMs: this.getTotalDurationMs(),
      totalTargets: this.targets.length,
      targets: this.targets,
    };
  }

  _configureTolerances(level, mode) {
    if (this.levelConfig?.timingWindows) {
      const modeMultiplier = mode === 'TIME_ATTACK' ? 0.8 : 1.0;
      this.tolerance = {
        perfect: Math.round(this.levelConfig.timingWindows.perfect * modeMultiplier),
        great: Math.round(this.levelConfig.timingWindows.great * modeMultiplier),
        good: Math.round(this.levelConfig.timingWindows.good * modeMultiplier),
        bad: Math.round(this.levelConfig.timingWindows.bad * modeMultiplier),
      };
      return;
    }

    // Dynamic difficulty scaling fallback: higher level = tighter timing tolerance
    const factor = Math.max(0.66, 1 - (level - 1) * 0.038);
    const modeMultiplier = mode === 'TIME_ATTACK' ? 0.78 : 1.0;

    this.tolerance = {
      perfect: Math.round(140 * factor * modeMultiplier),
      great: Math.round(230 * factor * modeMultiplier),
      good: Math.round(350 * factor * modeMultiplier),
      bad: Math.round(500 * factor * modeMultiplier),
    };
  }

  /**
   * Builds target timeline with authentic pop rhythm durations:
   * Level 1: 4-beat whole notes (~4.1s per chord at 58 BPM) for generous learning time
   * Level 2: 3-beat and 2-beat steady holds
   * Level 3-5: 2-beat half notes with turnaround cadences
   * Level 6-7: Dynamic syncopated pop patterns
   * Level 8-10: Driving syncopated rhythm
   */
  _buildTargetTimeline(phrase, levelConfig) {
    const targets = [];
    const chords = phrase.chords;
    const level = levelConfig.level || 1;

    let currentBeat = this.countInBeats; // Starts after count-in

    chords.forEach((chordSymbol, idx) => {
      let durationBeats = 2; // Default half-note

      if (levelConfig.durationBeats) {
        durationBeats = levelConfig.durationBeats;
      } else if (level <= 4) {
        // Levels 1-4: 4 beats (1 full measure)
        durationBeats = 4;
      } else if (level <= 8) {
        // Levels 5-8: 2 beats (half measure)
        durationBeats = 2;
      } else {
        // Levels 9-10: 2 beats and 1 beat transitions
        const pattern = [2, 1, 2, 1, 2, 2, 1, 2];
        durationBeats = pattern[idx % pattern.length] || 1;
      }

      // Final resolution chord naturally holds longer (at least 4 beats)
      if (idx === chords.length - 1) {
        durationBeats = Math.max(durationBeats, 4);
      }

      const startTimeMs = currentBeat * this.beatDurationMs;
      const durationMs = durationBeats * this.beatDurationMs;
      const endTimeMs = startTimeMs + durationMs;
      const measure = Math.floor((currentBeat - this.countInBeats) / 4) + 1;
      const fingerCount = chordMappingService.getFingerCountForChord(chordSymbol);
      const mapping = chordMappingService.getMappingDetails(fingerCount);

      targets.push({
        index: idx,
        chord: chordSymbol,
        fingerCount,
        emoji: mapping.emoji,
        label: mapping.label,
        name: mapping.name,
        beat: currentBeat,
        measure,
        durationBeats,
        startTimeMs,
        endTimeMs,
        durationMs,
        targetTimeMs: startTimeMs,
        isEvaluated: false,
        isHit: false,
        rating: null,
        timingDiffMs: 0,
        isPreparedEarly: false,
        preparedFingers: null,
      });

      currentBeat += durationBeats;
    });

    return targets;
  }

  getTotalDurationMs() {
    if (this.targets.length === 0) return 10000;
    const lastTarget = this.targets[this.targets.length - 1];
    return lastTarget.targetTimeMs + lastTarget.durationMs + 1000; // Extra graceful release period at end
  }

  /**
   * Start the rhythm challenge timeline
   */
  start() {
    this.stop();
    this.isPlaying = true;
    this.startTime = performance.now();
    this.currentTimeMs = 0;
    this.currentTargetIndex = 0;
    this.lastScheduledBeat = -1;
    this.allEvaluatedTime = null;

    // Start background audio system
    audioManager.init();
    audioManager.resume();

    // Start high-precision animation loop
    const loop = (now) => {
      if (!this.isPlaying) return;

      this.currentTimeMs = now - this.startTime;
      this._updateBeatAccompaniment();
      this._checkMissedTargets();

      // Emit frame update for UI rendering
      if (this.onFrameTick) {
        const frameData = this.getFrameData();
        this.onFrameTick(frameData);
      }

      // Check if all targets have been evaluated (either HIT or MISS)
      // Transition promptly after a 1.2s graceful ring-out period for the final chord!
      const allEvaluated = this.targets.length > 0 && this.targets.every(t => t.isEvaluated);
      if (allEvaluated) {
        if (!this.allEvaluatedTime) {
          this.allEvaluatedTime = this.currentTimeMs;
        } else if (this.currentTimeMs - this.allEvaluatedTime >= 1200) {
          if (this.mode === 'ENDLESS' && this.onEndlessPhraseEnd) {
            this.onEndlessPhraseEnd();
          } else {
            this.finishSong();
          }
          return;
        }
      }

      // Fallback check if song reached maximum duration
      if (this.currentTimeMs >= this.getTotalDurationMs()) {
        if (this.mode === 'ENDLESS' && this.onEndlessPhraseEnd) {
          this.onEndlessPhraseEnd();
        } else {
          this.finishSong();
        }
        return;
      }

      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  stop() {
    this.isPlaying = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  /**
   * Schedules beat clicks and drum groove pulses locked to the music timeline
   */
  _updateBeatAccompaniment() {
    const currentBeatExact = this.currentTimeMs / this.beatDurationMs;
    const currentBeatIndex = Math.floor(currentBeatExact);

    if (currentBeatIndex > this.lastScheduledBeat) {
      for (let b = this.lastScheduledBeat + 1; b <= currentBeatIndex; b++) {
        const isCountIn = b < this.countInBeats;
        const countInNumber = isCountIn ? (this.countInBeats - b) : 0;

        if (isCountIn) {
          // Count-in metronome click
          audioManager.playCountInBeep(b === 0);
        } else {
          // Play pop drum groove pulse
          const songBeat = b - this.countInBeats;
          const beatInBar = songBeat % 4; // 4/4 meter
          if (beatInBar === 0 || beatInBar === 2) {
            audioManager.playKick();
          } else {
            audioManager.playSnare();
          }
          audioManager.playHiHat();

          // Play Indonesian Pop bass note on downbeat of active chord
          const activeTarget = this.targets.find(t => {
            const beatOffset = b - t.beat;
            return beatOffset === 0;
          });
          if (activeTarget) {
            audioManager.playBassNote(activeTarget.chord, (activeTarget.durationMs / 1000) * 0.85);

            // If player prepared the correct gesture early during count-in or before beat, evaluate on downbeat
            if (!activeTarget.isEvaluated && activeTarget.isPreparedEarly) {
              this.evaluateInput({
                hasHand: true,
                totalFingers: activeTarget.fingerCount,
                timestamp: performance.now(),
              });
            }
          }
        }

        if (this.onBeatTick) {
          this.onBeatTick({
            beatIndex: b,
            isCountIn,
            countInNumber,
            totalCountIn: this.countInBeats,
            songBeat: Math.max(0, b - this.countInBeats),
          });
        }
      }

      this.lastScheduledBeat = currentBeatIndex;
    }
  }

  /**
   * Automatically marks targets as MISS when they pass beyond the late timing threshold or measure end
   */
  _checkMissedTargets() {
    for (let i = 0; i < this.targets.length; i++) {
      const target = this.targets[i];
      if (target.isEvaluated) continue;

      const diff = this.currentTimeMs - target.targetTimeMs;

      // If the target is past the late tolerance window or chord end time without a hit:
      // In Event Mode: eliminate punishing MISS (0 pts) so attendees never get zeroed out
      if (diff > this.tolerance.bad || this.currentTimeMs >= target.endTimeMs) {
        target.isEvaluated = true;
        target.isHit = true;
        target.rating = HIT_RATINGS.BAD;
        target.timingDiffMs = Math.round(diff);

        audioManager.playHitRating(HIT_RATINGS.BAD);

        if (this.onTargetHit) {
          this.onTargetHit({
            target,
            rating: HIT_RATINGS.BAD,
            timingDiffMs: target.timingDiffMs,
            isHit: true,
            isChordCorrect: true,
            pointsEarned: 30,
            playedFingers: target.fingerCount,
            expectedFingers: target.fingerCount,
          });
        }
      }
    }
  }

  /**
   * Evaluates player's hand gesture input against the active targets in the Hit Zone.
   * Architecture (Music Clock Driven):
   * 1. HAND PRESENCE CHECK: If no hand is detected in camera, do NOT evaluate.
   * 2. INSTANT AUDIO FEEDBACK: Triggers chord sound immediately on gesture change.
   * 3. MUSIC CLOCK TIMELINE: The active chord display is locked to the music clock [startTimeMs, endTimeMs).
   *    Player input NEVER advances the chord early.
   * 4. TOLERANT TRANSITIONS: Intermediate finger gestures NEVER trigger premature MISS.
   *    The player has the full duration of the chord to form the correct gesture.
   */
  evaluateInput(gestureEvent) {
    if (!this.isPlaying || !gestureEvent) return null;

    // Hand presence check: no hand in frame -> no input allowed
    if (!gestureEvent.hasHand) {
      return null;
    }

    const tGameplay = performance.now();
    const playedFingers = gestureEvent.totalFingers;
    const chordDetails = chordMappingService.getMappingDetails(playedFingers);
    const chordName = chordDetails ? chordDetails.chord : null;

    // 1. INSTANT AUDIO FEEDBACK: Trigger chord sound on gesture input
    const tAudioStart = performance.now();
    if (chordName && playedFingers >= 0) {
      audioManager.playChord(chordName, { duration: 0.6 });
    }
    const tAudioEnd = performance.now();

    // 2. TARGET MATCHING (Music Clock Aligned):
    // Check currently active clock target [startTimeMs, endTimeMs)
    const activeTarget = this.targets.find(t => 
      this.currentTimeMs >= t.startTimeMs && this.currentTimeMs < t.endTimeMs
    );

    let target = null;
    if (activeTarget && !activeTarget.isEvaluated) {
      target = activeTarget;
    } else {
      // Check upcoming un-evaluated target within valid tolerance window
      const upcoming = this.targets.find(t => !t.isEvaluated);
      if (upcoming) {
        const diff = this.currentTimeMs - upcoming.targetTimeMs;
        if (Math.abs(diff) <= this.tolerance.bad) {
          target = upcoming;
        } else if (diff < -this.tolerance.bad && Math.abs(diff) <= this.beatDurationMs * 2) {
          // Player prepared early ahead of time! Arm target so on beat cross it scores
          if (playedFingers === upcoming.fingerCount) {
            upcoming.isPreparedEarly = true;
            upcoming.preparedFingers = playedFingers;
            upcoming.preparedTime = this.currentTimeMs;
          }
          return null;
        }
      }
    }

    if (!target) {
      this.lastInputChord = chordName;
      this.lastInputTimeMs = this.currentTimeMs;
      return null;
    }

    // 3. GESTURE MATCH CHECK:
    const isChordCorrect = playedFingers === target.fingerCount;
    if (!isChordCorrect) {
      // Player is transitioning or adjusting fingers:
      // CRITICAL: DO NOT mark target as MISS or isEvaluated = true!
      // They have the remainder of this measure to form the correct gesture.
      this.lastInputChord = chordName;
      this.lastInputTimeMs = this.currentTimeMs;
      return null;
    }

    // 4. TIMING ACCURACY RATING:
    const timingDiff = this.currentTimeMs - target.targetTimeMs;
    const absDiff = Math.abs(timingDiff);

    let rating = HIT_RATINGS.GOOD;
    let points = 60;

    if (absDiff <= this.tolerance.perfect) {
      rating = HIT_RATINGS.PERFECT;
      points = 100;
    } else if (absDiff <= this.tolerance.great) {
      rating = HIT_RATINGS.GREAT;
      points = 80;
    } else if (absDiff <= this.tolerance.good) {
      rating = HIT_RATINGS.GOOD;
      points = 60;
    } else if (absDiff <= this.tolerance.bad) {
      rating = HIT_RATINGS.BAD;
      points = 30;
    } else {
      // Too early, arm for automatic hit on measure downbeat
      target.isPreparedEarly = true;
      target.preparedFingers = playedFingers;
      target.preparedTime = this.currentTimeMs;
      return null;
    }

    target.isEvaluated = true;
    target.isHit = true;
    target.rating = rating;
    target.timingDiffMs = Math.round(timingDiff);

    audioManager.playHitRating(rating);

    // Profile latencies
    const dtGestureToGameplay = gestureEvent.profiling?.tGesture 
      ? +(tGameplay - gestureEvent.profiling.tGesture).toFixed(1) 
      : 1.0;
    const dtGameplayToAudio = +(tAudioEnd - tAudioStart).toFixed(1);
    const dtTotalGameLatency = +(tAudioEnd - (gestureEvent.profiling?.tGesture || tGameplay)).toFixed(1);
    const dtTotalPipeline = gestureEvent.profiling?.tCamera 
      ? +(tAudioEnd - gestureEvent.profiling.tCamera).toFixed(1) 
      : dtTotalGameLatency;

    this.latestProfile = {
      targetChord: target.chord,
      targetTimeS: (target.targetTimeMs / 1000).toFixed(3),
      detectedChord: chordName,
      detectionTimeS: (gestureEvent.timestamp / 1000).toFixed(3),
      gameTimeS: (tGameplay / 1000).toFixed(3),
      audioTimeS: (tAudioEnd / 1000).toFixed(3),
      totalGameLatencyMs: dtTotalGameLatency,
      cameraToMediaPipeMs: gestureEvent.profiling?.cameraToMediaPipeMs || 0,
      mediaPipeToFingerMs: gestureEvent.profiling?.mediaPipeToFingerMs || 0,
      fingerToGestureMs: gestureEvent.profiling?.fingerToGestureMs || 0,
      gestureToGameplayMs: dtGestureToGameplay,
      gameplayToAudioMs: dtGameplayToAudio,
      totalPipelineMs: dtTotalPipeline,
    };

    const result = {
      target,
      rating,
      timingDiffMs: target.timingDiffMs,
      isHit: true,
      isChordCorrect: true,
      pointsEarned: points,
      playedFingers,
      expectedFingers: target.fingerCount,
      profile: this.latestProfile,
    };

    if (this.onTargetHit) {
      this.onTargetHit(result);
    }

    return result;
  }

  /**
   * Live tracking evaluation: checks whether player's hand currently matches
   * active note inside the Hit Zone without waiting for artificial debounce delay.
   */
  evaluateLiveTracking(gestureEvent) {
    if (!this.isPlaying || !gestureEvent || !gestureEvent.hasHand) return null;

    // Active clock target
    const activeTarget = this.targets.find(t => 
      this.currentTimeMs >= t.startTimeMs && this.currentTimeMs < t.endTimeMs
    );
    if (!activeTarget || activeTarget.isEvaluated) return null;

    // Only proceed when player shows the required finger count for the chord
    if (gestureEvent.totalFingers !== activeTarget.fingerCount) {
      return null;
    }

    const diff = this.currentTimeMs - activeTarget.targetTimeMs;
    const absDiff = Math.abs(diff);

    // If within valid timing tolerance window (early or late):
    if (absDiff <= this.tolerance.bad) {
      return this.evaluateInput(gestureEvent);
    }

    return null;
  }

  finishSong() {
    this.stop();
    if (this.onSongCompleted) {
      this.onSongCompleted({
        targets: this.targets,
        phrase: this.phrase,
        levelConfig: this.levelConfig,
      });
    }
  }

  /**
   * Returns snapshot of current frame data for visual rendering
   * PURE MUSIC CLOCK ARCHITECTURE:
   * currentTarget is strictly determined by currentTimeMs in [startTimeMs, endTimeMs)
   */
  getFrameData() {
    const isCountIn = this.currentTimeMs < this.countInDurationMs;
    const countInProgress = isCountIn ? (this.currentTimeMs / this.countInDurationMs) : 1;

    let currentTarget = null;
    let nextTarget = null;

    if (!isCountIn) {
      // Find the target whose time span [startTimeMs, endTimeMs) covers this.currentTimeMs
      const activeIdx = this.targets.findIndex(t => 
        this.currentTimeMs >= t.startTimeMs && this.currentTimeMs < t.endTimeMs
      );

      if (activeIdx !== -1) {
        currentTarget = this.targets[activeIdx];
        nextTarget = this.targets[activeIdx + 1] || null;
        this.currentTargetIndex = activeIdx;
      } else if (this.targets.length > 0) {
        if (this.currentTimeMs < this.targets[0].startTimeMs) {
          currentTarget = null;
          nextTarget = this.targets[0];
        } else {
          // Past all chords
          currentTarget = null;
          nextTarget = null;
        }
      }
    } else {
      nextTarget = this.targets[0] || null;
    }

    // Lookahead runway window based on level
    const lookaheadBeats = (this.levelConfig && this.levelConfig.lookaheadBeats) || 3.5;
    const lookaheadMs = this.beatDurationMs * lookaheadBeats;

    const visibleTargets = this.targets.map(t => {
      const timeToHitMs = t.targetTimeMs - this.currentTimeMs;
      // 1.0 means exactly inside Hit Zone center. 0.0 means just entering top of runway.
      const hitZoneRatio = 1.0 - (timeToHitMs / lookaheadMs);
      return {
        ...t,
        timeToHitMs,
        hitZoneRatio: Math.max(0, Math.min(1.4, hitZoneRatio)),
        isVisible: timeToHitMs <= lookaheadMs && this.currentTimeMs < t.endTimeMs,
      };
    }).filter(t => t.isVisible);

    return {
      currentTimeMs: this.currentTimeMs,
      bpm: this.bpm,
      beatDurationMs: this.beatDurationMs,
      isCountIn,
      countInProgress,
      currentTarget,
      nextTarget,
      visibleTargets,
      totalTargets: this.targets.length,
      evaluatedCount: this.targets.filter(t => t.isEvaluated).length,
      currentBeatExact: this.currentTimeMs / this.beatDurationMs,
      mode: this.mode,
      latestProfile: this.latestProfile,
    };
  }
}

export const rhythmEngine = new RhythmEngine();
