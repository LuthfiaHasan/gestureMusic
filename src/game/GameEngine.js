// GameEngine.js - Real-Time Rhythm Music Following Orchestrator
import { chordEngine } from '../audio/ChordEngine.js';
import { audioManager } from '../audio/AudioManager.js';
import { chordMappingService } from '../services/ChordMappingService.js';
import { levelManager } from '../services/LevelManager.js';
import { scoreManager } from '../services/ScoreManager.js';
import { adaptiveDifficulty } from '../services/AdaptiveDifficulty.js';
import { settingsManager } from '../services/SettingsManager.js';
import { rhythmEngine } from '../services/RhythmEngine.js';
import { jingleBellsService } from '../services/JingleBellsService.js';
import { komangService } from '../services/KomangService.js';
import { nadimuService } from '../services/NadimuService.js';
import confetti from 'canvas-confetti';

import { competitionLeaderboardService } from '../services/CompetitionLeaderboardService.js';

export const GAME_STATES = {
  HOME: 'HOME',
  TRACK_SELECT: 'TRACK_SELECT',
  LEVEL_SELECT: 'LEVEL_SELECT',
  CALIBRATION: 'CALIBRATION',
  HOW_TO_PLAY: 'HOW_TO_PLAY',
  SETTINGS: 'SETTINGS',
  FREE_SYNTH: 'FREE_SYNTH',
  GAMEPLAY_PHASE: 'GAMEPLAY_PHASE',
  RESULT_PHASE: 'RESULT_PHASE',
  JINGLE_BELLS: 'JINGLE_BELLS',
  KOMANG: 'KOMANG',
  NADIMU: 'NADIMU',
  MIDI_IMPORT: 'MIDI_IMPORT',
  LEADERBOARD: 'LEADERBOARD',
};

export const GAME_MODES = {
  CLASSIC: 'CLASSIC',
  TIME_ATTACK: 'TIME_ATTACK',
  ENDLESS: 'ENDLESS',
  MIDI: 'MIDI',
};

export class GameEngine {
  constructor() {
    this.currentState = GAME_STATES.HOME;
    this.currentMode = GAME_MODES.CLASSIC;

    // Active round state
    this.currentLevel = 1;
    this.currentPhrase = null;
    this.endlessLives = 3;
    this.endlessStreak = 0;

    // Callbacks for UI updates
    this.onStateChange = null;
    this.onRhythmFrame = null;      // High-res rAF updates for timeline, moving notes, and hit zone
    this.onRhythmBeat = null;       // Beat events (count-in, song beat pulses)
    this.onChordEvaluated = null;   // Hit feedback (PERFECT, GREAT, GOOD, BAD, MISS)
    this.onRoundFinished = null;
  }

  setState(newState, payload = {}) {
    this._cleanup();
    if (newState !== GAME_STATES.GAMEPLAY_PHASE && newState !== GAME_STATES.FREE_SYNTH && newState !== GAME_STATES.JINGLE_BELLS) {
      chordEngine.stop();
      rhythmEngine.stop();
    }
    if (this.currentState === GAME_STATES.JINGLE_BELLS && newState !== GAME_STATES.JINGLE_BELLS) {
      jingleBellsService.stop();
    }
    if (this.currentState === GAME_STATES.KOMANG && newState !== GAME_STATES.KOMANG) {
      komangService.stop();
    }
    if (this.currentState === GAME_STATES.NADIMU && newState !== GAME_STATES.NADIMU) {
      nadimuService.stop();
    }
    this.currentState = newState;
    if (this.onStateChange) {
      this.onStateChange(newState, payload);
    }
  }

  _cleanup() {
    rhythmEngine.stop();
    jingleBellsService.stop();
    if (komangService) komangService.stop();
    if (nadimuService) nadimuService.stop();
  }

  /**
   * Pause active gameplay session
   */
  pause() {
    if (this.currentState === GAME_STATES.GAMEPLAY_PHASE) {
      rhythmEngine.pause();
    } else if (this.currentState === GAME_STATES.KOMANG) {
      komangService.pause();
    } else if (this.currentState === GAME_STATES.NADIMU) {
      nadimuService.pause();
    }
  }

  /**
   * Resume active gameplay session
   */
  resume() {
    if (this.currentState === GAME_STATES.GAMEPLAY_PHASE) {
      rhythmEngine.resume();
    } else if (this.currentState === GAME_STATES.KOMANG) {
      komangService.play();
    } else if (this.currentState === GAME_STATES.NADIMU) {
      nadimuService.play();
    }
  }

  /**
   * Toggle pause state
   */
  togglePause() {
    if (this.currentState === GAME_STATES.GAMEPLAY_PHASE) {
      return rhythmEngine.togglePause();
    } else if (this.currentState === GAME_STATES.KOMANG) {
      if (komangService.isPlaying) {
        komangService.pause();
        return true;
      } else {
        komangService.play();
        return false;
      }
    } else if (this.currentState === GAME_STATES.NADIMU) {
      if (nadimuService.isPlaying) {
        nadimuService.pause();
        return true;
      } else {
        nadimuService.play();
        return false;
      }
    }
    return false;
  }

  /**
   * Start a real-time rhythm following round for a given mode and level
   */
  startRound(mode = GAME_MODES.CLASSIC, levelNum = 1) {
    this.currentMode = mode;
    this.currentLevel = levelNum;
    this.endlessLives = 3;
    this.endlessStreak = 0;
    scoreManager.resetRound();
    chordEngine.stop();

    // Get level configuration and apply rule-based adaptive difficulty
    const rawConfig = levelManager.getLevel(levelNum);
    const config = adaptiveDifficulty.applyToLevelConfig(rawConfig);

    // Generate Indonesian Pop musical phrase sequence
    levelManager.generateSequenceForLevel(levelNum);
    this.currentPhrase = levelManager.getLastPhrase();

    // Setup Rhythm Engine with the phrase, level config, and game mode
    const setupInfo = rhythmEngine.setup(this.currentPhrase, config, this.currentMode);

    // Wire rhythm engine callbacks
    this._bindRhythmEngine(config);

    // Transition directly into Real-Time Rhythm Challenge (No Memory Phase!)
    this.setState(GAME_STATES.GAMEPLAY_PHASE, {
      phrase: this.currentPhrase,
      config,
      setupInfo,
      mode: this.currentMode,
      currentLevel: this.currentLevel,
      lives: this.endlessLives,
      streak: this.endlessStreak,
    });

    // Start the music & rhythm timeline
    rhythmEngine.start();
  }

  /**
   * Start a custom round imported from a MIDI file
   */
  startMidiRound(midiData) {
    this.currentMode = GAME_MODES.MIDI;
    this.currentLevel = 1;
    this.endlessLives = 3;
    this.endlessStreak = 0;
    scoreManager.resetRound();
    chordEngine.stop();

    const phrase = midiData.phrase;
    this.currentPhrase = phrase;

    const config = {
      level: 1,
      title: midiData.title || phrase.title || 'Custom MIDI Track',
      subtitle: `${midiData.noteCount || 0} Notes • ${midiData.durationFormatted || '0:00'}`,
      bpm: midiData.bpm || phrase.tempo || 120,
      durationBeats: 4,
      lookaheadBeats: 3.5,
      allowedChords: phrase.allowedChords || ['C', 'G', 'Am', 'F'],
      allowedFingers: phrase.allowedFingers || [1, 5, 0, 4],
      timingWindows: { perfect: 180, great: 450, good: 850, bad: 1600 },
      difficultyLabel: 'CUSTOM MIDI',
    };

    const setupInfo = rhythmEngine.setup(this.currentPhrase, config, this.currentMode);
    this._bindRhythmEngine(config);

    this.setState(GAME_STATES.GAMEPLAY_PHASE, {
      phrase: this.currentPhrase,
      config,
      setupInfo,
      mode: this.currentMode,
      currentLevel: 1,
      lives: this.endlessLives,
      streak: this.endlessStreak,
      midiData,
    });

    rhythmEngine.start();
  }

  _bindRhythmEngine(config) {
    rhythmEngine.onFrameTick = (frameData) => {
      if (this.onRhythmFrame) {
        this.onRhythmFrame({
          ...frameData,
          mode: this.currentMode,
          lives: this.endlessLives,
          streak: this.endlessStreak,
        });
      }
    };

    rhythmEngine.onBeatTick = (beatData) => {
      if (this.onRhythmBeat) {
        this.onRhythmBeat(beatData);
      }
    };

    rhythmEngine.onTargetHit = (hitResult) => {
      // Register hit in score manager
      const scoreResult = scoreManager.registerHit(
        hitResult.rating,
        hitResult.timingDiffMs,
        hitResult.isChordCorrect
      );

      // In Endless mode, miss/bad costs a life
      if (this.currentMode === GAME_MODES.ENDLESS) {
        if (hitResult.rating === 'MISS' || hitResult.rating === 'BAD') {
          this.endlessLives = Math.max(0, this.endlessLives - 1);
          if (this.endlessLives <= 0) {
            this.finishRound();
            return;
          }
        }
      }

      // Trigger haptics
      if (hitResult.rating === 'PERFECT') {
        settingsManager.triggerHaptic('perfect');
      } else if (hitResult.rating === 'GREAT' || hitResult.rating === 'GOOD') {
        settingsManager.triggerHaptic('good');
      } else {
        settingsManager.triggerHaptic('miss');
      }

      if (this.onChordEvaluated) {
        this.onChordEvaluated({
          targetChord: hitResult.target.chord,
          targetFingers: hitResult.target.fingerCount,
          playedFingers: hitResult.playedFingers,
          isMatch: hitResult.isHit,
          rating: hitResult.rating,
          timingDiffMs: hitResult.timingDiffMs,
          scoreResult,
          mode: this.currentMode,
          lives: this.endlessLives,
          streak: this.endlessStreak,
        });
      }
    };

    rhythmEngine.onEndlessPhraseEnd = () => {
      // When a phrase completes in Endless mode, advance streak and seamlessly continue
      this.endlessStreak++;
      const nextLevelNum = Math.min(10, this.currentLevel + Math.floor(this.endlessStreak / 2));
      levelManager.generateSequenceForLevel(nextLevelNum);
      this.currentPhrase = levelManager.getLastPhrase();

      const nextConfig = {
        ...config,
        bpm: Math.min(145, rhythmEngine.bpm + 3),
      };

      rhythmEngine.setup(this.currentPhrase, nextConfig, this.currentMode);
      rhythmEngine.start();
    };

    rhythmEngine.onSongCompleted = () => {
      this.finishRound();
    };
  }

  /**
   * Called when the song timeline completes
   */
  finishRound() {
    rhythmEngine.stop();
    const summary = scoreManager.getSummary();

    // Attach endless streak if in endless mode
    summary.endlessStreak = this.endlessStreak;
    summary.mode = this.currentMode;

    // Record level score in multi-level event campaign history
    if (this.currentMode === GAME_MODES.CLASSIC) {
      scoreManager.recordLevelScore(this.currentLevel, summary.scorePct);
    }

    // Record game run into local run history & mode records
    scoreManager.recordGameRun(this.currentMode, {
      ...summary,
      level: this.currentLevel,
    });

    // Create official Competition Leaderboard Pending Session for QR Code Prize Claim!
    const trackId = this.currentLevel === 4 ? 'CYBER_GROOVE' : (this.currentMode === GAME_MODES.ENDLESS ? 'ENDLESS' : 'NEON_DAWN');
    const compSession = competitionLeaderboardService.createPendingSession({
      songId: trackId,
      songTitle: `⭐ Level ${this.currentLevel}: Neon Dawn`,
      songBadge: `⭐ LEVEL ${this.currentLevel}`,
      totalNotes: summary.totalNotes,
      perfectCount: summary.perfectCount,
      greatCount: summary.greatCount,
      goodCount: summary.goodCount,
      badCount: summary.badCount,
      missCount: summary.missCount,
      maxCombo: summary.maxCombo,
      chordAccuracyPct: summary.chordAccuracy,
      scorePct: summary.scorePct,
    });
    summary.compSession = compSession;

    const isPassed = summary.scorePct >= 70;
    const isGrandFinale = (this.currentMode === GAME_MODES.CLASSIC && this.currentLevel === 8 && isPassed);

    summary.isPassed = isPassed;
    summary.passThreshold = 70;
    summary.isGrandFinale = isGrandFinale;
    summary.campaignGrand = scoreManager.getCampaignGrandSummary();

    // Unlock next level if player scored >= 70% in CLASSIC mode (Max Level 8)
    if (this.currentMode === GAME_MODES.CLASSIC && isPassed) {
      if (this.currentLevel < 8) {
        scoreManager.unlockLevel(this.currentLevel + 1);
      }
    }

    // Evaluate rule-based adaptive difficulty based on performance (No RL)
    adaptiveDifficulty.evaluateRound(summary);

    // Transition to Result Screen
    this.setState(GAME_STATES.RESULT_PHASE, {
      summary,
      phrase: this.currentPhrase,
      level: this.currentLevel,
      mode: this.currentMode,
    });

    // Announcer voice and musical celebration fanfare
    audioManager.playRatingSFX(summary.stars);
    setTimeout(() => {
      audioManager.speakAnnouncer(isGrandFinale ? 'Grand Finale! Congratulations!' : summary.starLabel);
    }, 450);

    // Confetti on passing (>= 70%) or Grand Finale!
    if (isPassed || summary.stars >= 4) {
      try {
        confetti({
          particleCount: isGrandFinale ? 180 : (summary.stars === 5 ? 120 : 70),
          spread: isGrandFinale ? 100 : 75,
          origin: { y: 0.6 }
        });
      } catch (e) {}
    }
  }

  /**
   * Evaluates real-time live camera tracking (instantaneous response)
   */
  handleLiveTracking(gestureEvent) {
    if (this.currentState === GAME_STATES.GAMEPLAY_PHASE) {
      rhythmEngine.evaluateLiveTracking(gestureEvent);
    } else if (this.currentState === GAME_STATES.JINGLE_BELLS) {
      jingleBellsService.evaluateGesture(gestureEvent.totalFingers, gestureEvent.hasHand);
    } else if (this.currentState === GAME_STATES.KOMANG) {
      komangService.evaluateGesture(gestureEvent.totalFingers, gestureEvent.hasHand);
    } else if (this.currentState === GAME_STATES.NADIMU) {
      nadimuService.evaluateGesture(gestureEvent.totalFingers, gestureEvent.hasHand);
    }
  }

  /**
   * Called when a gesture is confirmed from the camera or virtual control / keyboard
   */
  handleGestureConfirmed(gestureEvent) {
    if (this.currentState === GAME_STATES.JINGLE_BELLS) {
      jingleBellsService.evaluateGesture(gestureEvent.totalFingers, gestureEvent.hasHand);
      return;
    }

    if (this.currentState === GAME_STATES.KOMANG) {
      komangService.evaluateGesture(gestureEvent.totalFingers, gestureEvent.hasHand);
      return;
    }

    if (this.currentState === GAME_STATES.NADIMU) {
      nadimuService.evaluateGesture(gestureEvent.totalFingers, gestureEvent.hasHand);
      return;
    }

    if (this.currentState === GAME_STATES.FREE_SYNTH) {
      // In Free Synth, any gesture directly triggers its mapped chord!
      const chord = chordMappingService.getChord(gestureEvent.totalFingers, gestureEvent.gestureType, 10);
      chordEngine.play(chord);
      if (this.onChordEvaluated) {
        this.onChordEvaluated({
          mode: 'FREE_SYNTH',
          chord,
          fingers: gestureEvent.totalFingers,
          shape: gestureEvent.gestureType,
        });
      }
      return;
    }

    if (this.currentState === GAME_STATES.GAMEPLAY_PHASE) {
      // Evaluate real-time gesture input at the Hit Zone
      rhythmEngine.evaluateInput(gestureEvent);
    }
  }
}

export const gameEngine = new GameEngine();
