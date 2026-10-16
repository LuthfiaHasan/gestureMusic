// KomangTilesEngine.js - Real-Time Piano Tiles Highway for "Komang" by Raim Laode
// 4-Lane Falling Tiles Engine synchronized with Komang's 16-measure chord progression,
// backing track audio, live camera hand gesture recognition, and interactive input.

import { KOMANG_MEASURES } from './KomangService.js';
import { audioManager } from '../audio/AudioManager.js';

export const KOMANG_LANES = [
  {
    lane: 0,
    chord: 'G',
    fingerCount: 1,
    emoji: '☝️',
    color: '#14b3d4',
    glowColor: 'rgba(20, 179, 212, 0.45)',
    name: 'G (Do)',
    keyHint: '1 / D',
  },
  {
    lane: 1,
    chord: 'D/F#',
    fingerCount: 2,
    emoji: '✌️',
    color: '#3b82f6',
    glowColor: 'rgba(59, 130, 246, 0.45)',
    name: 'D/F# (Transisi)',
    keyHint: '2 / F',
  },
  {
    lane: 2,
    chord: 'Am',
    fingerCount: 3,
    emoji: '🤟',
    color: '#fbb040',
    glowColor: 'rgba(251, 176, 64, 0.45)',
    name: 'Am (Lembut)',
    keyHint: '3 / J',
  },
  {
    lane: 3,
    chord: 'Cm',
    fingerCount: 4,
    emoji: '🖐️',
    color: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.45)',
    name: 'Cm (Syahdu)',
    keyHint: '4 / K',
  },
];

export class KomangTilesEngine {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.komangService = null;
    this.animFrameId = null;
    this.isRunning = false;

    // Highway Geometry & Elongated Grand Piano Keys
    this.width = 600;
    this.height = 700;
    this.hitLineRatio = 0.65; // Elongated grand piano keys (~35% of highway height)
    this.keyHeightModes = [
      { ratio: 0.65, label: 'Panjang (35%)' },
      { ratio: 0.55, label: 'Ekstra Panjang (45%)' },
      { ratio: 0.78, label: 'Kompak (22%)' },
    ];
    this.currentKeyHeightModeIdx = 0;

    // Tiles timeline
    this.tiles = [];
    this.cycleDurationSec = 29.538; // 16 measures * ~1.846s
    this.measureDurationSec = 1.84615;

    // Visual Effects
    this.hitParticles = [];
    this.lightPillars = [0, 0, 0, 0]; // Intensity for each lane 0..3
    this.floatingToasts = [];
    this.laneActiveStates = [false, false, false, false];

    // Challenge & Feedback
    this.screenShakeTime = 0;
    this.redVignetteAlpha = 0;
    this.lastWrongGestureTime = 0;
    this.baseFallDurationSec = 4.2; // Sangat santai & anggun, tidak terburu-buru
    this.speed = 1.0;
    this.fallDurationSec = 4.2;
    this.missThresholdSec = 0.50;

    // High-Precision Audio Clock Interpolation (Silky 60/120fps smooth motion)
    this._lastReportedAudioTime = -1;
    this._lastAudioSyncTime = 0;
    this._smoothSongTime = 0;

    this.isEcoMode = false;

    // Callbacks
    this.onHit = null;
    this.onMiss = null;
  }

  setHitLineRatio(ratio) {
    this.hitLineRatio = Math.max(0.50, Math.min(0.85, ratio));
  }

  cycleKeyHeightMode() {
    this.currentKeyHeightModeIdx = (this.currentKeyHeightModeIdx + 1) % this.keyHeightModes.length;
    this.hitLineRatio = this.keyHeightModes[this.currentKeyHeightModeIdx].ratio;
    return this.keyHeightModes[this.currentKeyHeightModeIdx].label;
  }

  getKeyHeightLabel() {
    return this.keyHeightModes[this.currentKeyHeightModeIdx]?.label || 'Panjang (35%)';
  }

  setEcoMode(enabled) {
    this.isEcoMode = !!enabled;
  }

  setSpeed(speed = 1.0) {
    this.speed = Math.max(0.6, Math.min(2.0, speed));
    this.fallDurationSec = this.baseFallDurationSec / this.speed;
  }

  triggerMissEffect() {
    if (!this.isEcoMode) {
      this.screenShakeTime = 14;
    }
    this.redVignetteAlpha = 0.55;
  }

  init(canvas, komangService) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.komangService = komangService;

    this.resize();
    this._generateTileSchedule();
    this._bindEvents();
    this.draw(); // Immediate initial render so highway is never blank!
  }

  resize() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    const rect = parent ? parent.getBoundingClientRect() : { width: 600, height: 700 };

    // Clamp DPR to 1.35 to prevent massive GPU fillrate lag on high-DPI laptops
    const dpr = Math.min(window.devicePixelRatio || 1, 1.35);
    this.width = Math.max(300, Math.floor(rect.width));
    this.height = Math.max(400, Math.floor(rect.height));

    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
  }

  _generateTileSchedule() {
    this.tiles = [];
    const bpm = this.komangService?.bpm || 130;
    const beatSec = 60 / bpm;
    this.measureDurationSec = beatSec * 4;
    this.cycleDurationSec = this.measureDurationSec * KOMANG_MEASURES.length;

    // Sweet upper-register harmonies for primary chord downbeats (Octaves 4-5 only, NO boomy bass)
    const sweetVoicings = {
      'G': ['G4', 'B4', 'D5'],
      'D/F#': ['F#4', 'A4', 'D5'],
      'Am': ['A4', 'C5', 'E5'],
      'Cm': ['G4', 'C5', 'Eb5'],
    };

    // Generate tiles for 14 full cycles (~7 minutes of song, comfortably covering 4:30 MP3)
    const totalCycles = 14;
    let globalId = 0;

    for (let cycle = 0; cycle < totalCycles; cycle++) {
      const cycleOffsetSec = cycle * this.cycleDurationSec;

      KOMANG_MEASURES.forEach((m) => {
        const targetTimeSec = cycleOffsetSec + m.index * this.measureDurationSec;
        let laneIndex = 0;
        if (m.fingerCount === 1) laneIndex = 0;
        else if (m.fingerCount === 2) laneIndex = 1;
        else if (m.fingerCount === 3) laneIndex = 2;
        else if (m.fingerCount === 4) laneIndex = 3;
        else laneIndex = 0;

        const mainMelody = (m.melodyNotes && m.melodyNotes[0]) ? m.melodyNotes[0] : 'G4';
        const chordVoicing = sweetVoicings[m.chord] || ['G4', 'B4', 'D5'];

        // 1. Primary Chord Downbeat Tile (Beat 1) - 1 Akor per Bar (1.85 detik jeda santai)
        this.tiles.push({
          id: `tile_${globalId++}`,
          cycle,
          measureIndex: m.index,
          measureNum: m.measure,
          chord: m.chord,
          chordDesc: m.chordDesc,
          fingerCount: m.fingerCount,
          emoji: m.emoji,
          lane: laneIndex,
          lyric: m.lyric,
          displayNote: mainMelody,
          melodyNotes: chordVoicing, // Sweet sparkling triad in octave 4-5
          timeSec: targetTimeSec,
          durationSec: this.measureDurationSec * 0.85,
          status: 'PENDING',
          hitRating: null,
          isMelodySubtile: false,
        });
      });
    }
  }

  _bindEvents() {
    if (!this.canvas) return;

    // Click / Touch hit on lanes
    const handlePointerDown = (e) => {
      e.preventDefault();
      if (this.komangService && !this.komangService.isPlaying) {
        if (this.komangService.sessionMode === '30S_RANDOM') {
          this.komangService.start30sSession().catch(() => {});
        } else {
          this.komangService.playFullSong().catch(() => {});
        }
      }
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : rect.left);
      const x = clientX - rect.left;
      const laneWidth = this.width / 4;
      const clickedLane = Math.min(3, Math.max(0, Math.floor(x / laneWidth)));
      this.triggerLaneAction(clickedLane, true);
    };

    this.canvas.onpointerdown = handlePointerDown;
  }

  start() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.isRunning = true;
    this._lastAudioSyncTime = performance.now();

    const loop = (timestamp) => {
      if (!this.isRunning) return;
      try {
        this.update(timestamp);
        this.draw();
      } catch (err) {
        console.error('KomangTilesEngine frame loop error:', err);
      }
      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  stop() {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  reset() {
    this.hitParticles = [];
    this.floatingToasts = [];
    this.lightPillars = [0, 0, 0, 0];
    this.laneActiveStates = [false, false, false, false];
    this._audioAnchorTime = 0;
    this._audioAnchorPerf = 0;
    this._lastRawAudioTime = -1;
    this._smoothSongTime = 0;
    this.tiles.forEach(t => {
      t.status = 'PENDING';
      t.hitRating = null;
    });
  }

  /**
   * Called when player provides hand gesture input from camera
   */
  evaluateGesture(totalFingers, hasHand = true) {
    if (!hasHand || !this.komangService) return null;

    if (totalFingers === 5) {
      // 🖐️ 5 Jari (Telapak Terbuka): SUPER WILDCARD!
      // Otomatis menargetkan ubin PENDING terdekat di jalur mana saja yang mendekati garis hit
      const curTime = this._getCurrentSongTime();
      let bestTile = null;
      let minDiff = 999;
      for (let i = 0; i < this.tiles.length; i++) {
        const t = this.tiles[i];
        if (t.timeSec > curTime + 0.6) break;
        if (t.status !== 'PENDING') continue;
        const diff = Math.abs(curTime - t.timeSec);
        if (diff <= 0.46 && diff < minDiff) {
          minDiff = diff;
          bestTile = t;
        }
      }
      if (bestTile) {
        return this.triggerLaneAction(bestTile.lane, false, true);
      }
      return null;
    }

    let targetLane = -1;
    if (totalFingers === 1) targetLane = 0;
    else if (totalFingers === 2) targetLane = 1;
    else if (totalFingers === 3) targetLane = 2;
    else if (totalFingers === 4) targetLane = 3;

    if (targetLane >= 0) {
      return this.triggerLaneAction(targetLane, false, false);
    }
    return null;
  }

  /**
   * Trigger judgment check on a specific lane
   */
  triggerLaneAction(laneIndex, isDirectTap = false, isWildcard = false) {
    if (!this.komangService) return null;

    const currentTimeSec = this._getCurrentSongTime();
    const hitToleranceSec = 0.52; // Nyaman & toleran untuk gestur kamera TV

    // Find the closest pending tile in this lane near hit line
    let candidate = null;
    let minDiff = 999;

    for (let i = 0; i < this.tiles.length; i++) {
      const tile = this.tiles[i];
      if (tile.timeSec > currentTimeSec + hitToleranceSec + 0.5) break;
      if (tile.status !== 'PENDING') continue;
      if (tile.lane !== laneIndex) continue;

      const diff = Math.abs(currentTimeSec - tile.timeSec);
      if (diff <= hitToleranceSec && diff < minDiff) {
        minDiff = diff;
        candidate = tile;
      }
    }

    if (candidate) {
      // Light up the receptor pad upon successful hit
      this.lightPillars[laneIndex] = 1.0;
      this.laneActiveStates[laneIndex] = true;
      setTimeout(() => {
        this.laneActiveStates[laneIndex] = false;
      }, 160);

      return this._executeHit(candidate, minDiff, isDirectTap, isWildcard);
    } else if (isDirectTap) {
      // Direct screen touch/click with no pending tile: gentle single-note feedback
      this.lightPillars[laneIndex] = 0.55;
      this.laneActiveStates[laneIndex] = true;
      setTimeout(() => {
        this.laneActiveStates[laneIndex] = false;
      }, 120);

      const lanePreviewNotes = ['G4', 'F#4', 'A4', 'C5'];
      const previewNote = lanePreviewNotes[laneIndex] || 'G4';
      audioManager.playKomangMelodyNote(previewNote, { duration: 1.1, lane: laneIndex, isPerfect: false, preset: 'Acoustic Piano' });
    }

    // Camera gesture input without an active tile nearby returns cleanly without strobing or noise
    return null;
  }

  _executeHit(tile, timeDiffSec, isDirectTap, isWildcard = false) {
    tile.status = 'HIT';

    // Judgment Rating
    let rating = 'PERFECT';
    let points = 100;
    if (timeDiffSec <= 0.20) {
      rating = 'PERFECT';
      points = 100;
    } else if (timeDiffSec <= 0.38) {
      rating = 'GREAT';
      points = 80;
    } else {
      rating = 'GOOD';
      points = 50;
    }
    tile.hitRating = rating;

    // 1. Play crystal-clear, sweet singing Steinway Grand Piano melody note!
    audioManager.init();
    audioManager.resume();
    audioManager.playKomangMelodyNote(tile.melodyNotes || tile.displayNote || 'G4', {
      duration: 1.6,
      isPerfect: rating === 'PERFECT',
      lane: tile.lane,
      preset: 'Acoustic Piano',
    });

    // 2. Spawn Particle Burst & Toast
    const laneWidth = this.width / 4;
    const hitX = (tile.lane + 0.5) * laneWidth;
    const hitY = this.height * this.hitLineRatio;
    this._spawnHitParticles(hitX, hitY, isWildcard ? '#ffd700' : KOMANG_LANES[tile.lane].color);
    if (isWildcard) {
      this._spawnToast(hitX, hitY - 30, 'WILDCARD! ✨', points, '#ffd700');
    } else {
      this._spawnToast(hitX, hitY - 30, rating, points, KOMANG_LANES[tile.lane].color);
    }

    // 3. Update KomangService Score & State with Dynamic Multiplier
    if (this.komangService) {
      this.komangService.combo++;
      if (this.komangService.combo > this.komangService.maxCombo) {
        this.komangService.maxCombo = this.komangService.combo;
      }

      if (rating === 'PERFECT') this.komangService.perfectHits++;
      else if (rating === 'GREAT') this.komangService.greatHits++;
      else if (rating === 'GOOD') this.komangService.goodHits++;

      // Dynamic Combo Multiplier (1.0x -> 1.5x -> 2.0x -> 2.5x)
      let multiplier = 1.0;
      if (this.komangService.combo >= 20) multiplier = 2.5;
      else if (this.komangService.combo >= 10) multiplier = 2.0;
      else if (this.komangService.combo >= 5) multiplier = 1.5;

      const earnedPoints = Math.round(points * multiplier);
      this.komangService.score += earnedPoints;
      // Combo Health Recovery: Setiap streak 6 kombo, pulihkan +1 nyawa!
      if (this.komangService.combo > 0 && this.komangService.combo % 6 === 0) {
        this.komangService.recoverLife(1);
        this._spawnToast(hitX, hitY - 45, '+1 NYAWA! ❤️', 0, '#00ffaa');
      }

      this.komangService.evaluatedMeasures.add(tile.measureIndex);

      if (this.komangService.onChordHit) {
        this.komangService.onChordHit({
          measure: KOMANG_MEASURES[tile.measureIndex],
          measureIndex: tile.measureIndex,
          rating,
          points: earnedPoints,
          multiplier,
          combo: this.komangService.combo,
          maxCombo: this.komangService.maxCombo,
          score: this.komangService.score,
          lives: this.komangService.lives,
          isUserAction: true,
          isWildcard,
        });
      }
    }

    if (this.onHit) {
      this.onHit({ tile, rating, points, isWildcard });
    }

    return { tile, rating, points, isWildcard };
  }

  _getCurrentSongTime() {
    if (!this.komangService) return 0;

    if (this.komangService.mode === 'PLAY_ALONG' && this.komangService.audioEl) {
      const audio = this.komangService.audioEl;
      const rawTime = audio.currentTime;
      const now = performance.now();

      if (audio.paused || audio.seeking || audio.playbackRate === 0) {
        this._audioAnchorTime = rawTime;
        this._audioAnchorPerf = now;
        this._lastRawAudioTime = rawTime;
        this._smoothSongTime = rawTime;
      } else {
        if (!this._audioAnchorPerf || this._audioAnchorPerf === 0) {
          this._audioAnchorTime = rawTime;
          this._audioAnchorPerf = now;
          this._lastRawAudioTime = rawTime;
        }

        // Expected audio time calculated with sub-millisecond precision from high-res monotonic clock
        const elapsedSec = (now - this._audioAnchorPerf) / 1000;
        const rate = audio.playbackRate || 1.0;
        const predictedTime = this._audioAnchorTime + elapsedSec * rate;

        // If audio element currentTime has advanced, check for clock drift
        if (rawTime !== this._lastRawAudioTime) {
          this._lastRawAudioTime = rawTime;
          const drift = rawTime - predictedTime;

          // Re-anchor if drift is noticeably large (e.g. user seeked, tab slept, or audio stuttered > 160ms)
          if (Math.abs(drift) > 0.16) {
            this._audioAnchorTime = rawTime;
            this._audioAnchorPerf = now;
            this._smoothSongTime = rawTime;
          } else {
            // Very gentle micro-nudge of anchor (imperceptible to human eyes, zero velocity spikes)
            this._audioAnchorTime += drift * 0.04;
            this._smoothSongTime = predictedTime;
          }
        } else {
          this._smoothSongTime = predictedTime;
        }
      }

      return Math.max(0, this._smoothSongTime - this.komangService.audioOffsetSec);
    }

    // Tempo mode fallback
    const ms = (this.komangService.currentTempoBeat || 0) * (60 / 130) * 1000;
    return ms / 1000;
  }

  /**
   * Computes the integrated distance metric S(t) for butter-smooth, non-stuttering acceleration.
   * Speed starts calm and slow (1.0x), and accelerates smoothly up to 1.85x over the 45s session.
   * Because velocity dS/dt > 0 is strictly monotonic and uniform across the highway,
   * tiles NEVER stutter, jerk, or jump!
   */
  _getIntegratedSongTime(t) {
    if (!this.komangService || this.komangService.sessionMode !== '30S_RANDOM') {
      return t;
    }
    const start = this.komangService.sessionStartSec;
    const dur = this.komangService.sessionDurationSec || 45.0;
    const maxBoost = 0.85; // Accelerates from 1.0x to 1.85x smoothly

    if (t <= start) {
      return t;
    }

    const u = Math.min(dur, t - start);
    // Integral of (1 + maxBoost * (x / dur)) dx from 0 to u:
    // = u + (maxBoost / (2 * dur)) * (u * u)
    const integralInSession = u + (maxBoost / (2 * dur)) * (u * u);

    if (t > start + dur) {
      const extra = t - (start + dur);
      return start + integralInSession + extra * (1.0 + maxBoost);
    }

    return start + integralInSession;
  }

  getSpeedMultiplier(curTime = this._getCurrentSongTime()) {
    if (!this.komangService || this.komangService.sessionMode !== '30S_RANDOM') {
      return 1.0;
    }
    const start = this.komangService.sessionStartSec;
    const dur = this.komangService.sessionDurationSec || 45.0;
    const u = curTime - start;
    if (u <= 0) return 1.0;
    const progress = Math.min(1.0, u / dur);
    return 1.0 + progress * 0.85;
  }

  update(timestamp) {
    const curTime = this._getCurrentSongTime();
    const laneWidth = this.width / 4;
    const hitY = this.height * this.hitLineRatio;
    const missThresholdSec = 0.50; // Lebih tenang dan tidak gampang terlewat

    this.speed = this.getSpeedMultiplier(curTime);

    // Check for missed tiles that scrolled past hit line
    for (let i = 0; i < this.tiles.length; i++) {
      const tile = this.tiles[i];

      // Since tiles are strictly chronological by timeSec, far future tiles cannot be missed yet
      if (tile.timeSec > curTime + 1.0) break;

      if (tile.status !== 'PENDING') continue;

      // In 30s session mode, do NOT miss or penalize tiles before sessionStartSec
      if (this.komangService && this.komangService.sessionMode === '30S_RANDOM') {
        if (tile.timeSec < this.komangService.sessionStartSec - 0.1) {
          tile.status = 'PAST';
          continue;
        }
      }

      if ((curTime - tile.timeSec) > missThresholdSec) {
        tile.status = 'MISSED';
        if (this.komangService) {
          if (!tile.isMelodySubtile) {
            // HANYA ubin akor utama yang mengurangi nyawa
            this.komangService.loseLife('CHORD_MISSED');
            const hitX = (tile.lane + 0.5) * laneWidth;
            this._spawnToast(hitX, hitY - 25, 'MISS! 💔 -1 NYAWA', 0, '#ff3b3b');
            this.lightPillars[tile.lane] = 0.75;
            this.laneActiveStates[tile.lane] = true;
            setTimeout(() => {
              this.laneActiveStates[tile.lane] = false;
            }, 200);
          } else {
            // Ubin permata melodi hanya me-reset kombo, tidak mengurangi nyawa
            this.komangService.combo = 0;
            const comboEl = document.getElementById('komang-cur-combo');
            if (comboEl) comboEl.innerText = 'x0 COMBO';
          }
        }
        if (this.onMiss) {
          this.onMiss(tile);
        }
      }
    }

    // Fade light pillars
    for (let l = 0; l < 4; l++) {
      this.lightPillars[l] = Math.max(0, this.lightPillars[l] - 0.045);
    }

    // Update particles
    for (let i = this.hitParticles.length - 1; i >= 0; i--) {
      const p = this.hitParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15; // subtle gravity
      p.alpha -= 0.03;
      p.size = Math.max(0, p.size - 0.1);
      if (p.alpha <= 0) {
        this.hitParticles.splice(i, 1);
      }
    }

    // Update toasts
    for (let i = this.floatingToasts.length - 1; i >= 0; i--) {
      const t = this.floatingToasts[i];
      t.y -= 1.4;
      t.alpha -= 0.024;
      t.scale += 0.015;
      if (t.alpha <= 0) {
        this.floatingToasts.splice(i, 1);
      }
    }
  }

  _spawnHitParticles(x, y, color) {
    const count = this.isEcoMode ? 6 : 22;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5);
      const speed = Math.random() * 6 + 2.5;
      this.hitParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.5,
        size: Math.random() * 4 + 2,
        color,
        alpha: 1.0,
      });
    }
  }

  _spawnToast(x, y, rating, points, color) {
    this.floatingToasts.push({
      x,
      y,
      rating,
      points,
      color,
      alpha: 1.0,
      scale: 1.0,
    });
  }

  draw() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const curTime = this._getCurrentSongTime();
    const laneWidth = w / 4;
    const hitY = h * this.hitLineRatio;

    // 1. Clear background with deep synthwave stage
    ctx.clearRect(0, 0, w, h);

    ctx.save();

    // Screen Shake effect on Damage / Miss
    if (this.screenShakeTime > 0) {
      const shakeMag = (this.screenShakeTime / 14) * 8;
      const ox = (Math.random() - 0.5) * shakeMag;
      const oy = (Math.random() - 0.5) * shakeMag;
      ctx.translate(ox, oy);
      this.screenShakeTime--;
    }

    // Deep Flash Tech corporate navy highway gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, 'rgba(4, 14, 34, 0.98)');
    bgGrad.addColorStop(0.7, 'rgba(7, 24, 56, 0.98)');
    bgGrad.addColorStop(1, 'rgba(10, 38, 85, 0.98)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Draw 4 Lanes and Light Pillars
    for (let i = 0; i < 4; i++) {
      const lx = i * laneWidth;
      const lane = KOMANG_LANES[i];

      // Lane divider lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx, h);
      ctx.stroke();

      // Light Pillar when lane is pressed/hit
      if (this.lightPillars[i] > 0.01) {
        const pillarGrad = ctx.createLinearGradient(0, hitY, 0, 0);
        pillarGrad.addColorStop(0, lane.color);
        pillarGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = pillarGrad;
        ctx.globalAlpha = this.lightPillars[i] * 0.45;
        ctx.fillRect(lx + 2, 0, laneWidth - 4, hitY);
        ctx.globalAlpha = 1.0;
      }
    }
    // Rightmost lane border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.moveTo(w, 0);
    ctx.lineTo(w, h);
    ctx.stroke();

    const S_now = this._getIntegratedSongTime(curTime);
    this.speed = this.getSpeedMultiplier(curTime);

    // Visual distance between bars in the same lane (uniform, elegant dimensions)
    const measureDistance = (this.measureDurationSec / this.baseFallDurationSec) * hitY;
    const tileHeight = Math.max(110, Math.min(190, Math.round(measureDistance - 24)));

    // 3. Draw Falling Piano Tiles
    for (let i = 0; i < this.tiles.length; i++) {
      const tile = this.tiles[i];
      const S_tile = this._getIntegratedSongTime(tile.timeSec);
      const deltaS = S_tile - S_now;

      // Only draw tiles that are within visible horizon
      if (deltaS < -0.45) continue;
      if (deltaS > this.baseFallDurationSec + 0.35) break; // Future tiles are beyond top horizon, stop early!

      // Calculate Y position smoothly without any denominator jitter
      const progress = 1.0 - (deltaS / this.baseFallDurationSec);
      const tileY = progress * hitY;
      const topY = tileY - tileHeight;

      const lx = tile.lane * laneWidth + 4;
      const lWidth = laneWidth - 8;
      const lane = KOMANG_LANES[tile.lane];

      ctx.save();

      if (tile.status === 'HIT') {
        // Saat sudah ditekan/kena hit, langsung lenyap dan digantikan ledakan partikel kembang api!
        // Tidak meninggalkan bayangan samar / hantu yang membingungkan pemain!
        continue;
      } else if (tile.status === 'MISSED') {
        // Jika ubin terlewat, pudar cepat dalam 0.2 detik dan segera lenyap
        const elapsedMiss = curTime - tile.timeSec - this.missThresholdSec;
        if (elapsedMiss > 0.22) continue;
        ctx.globalAlpha = Math.max(0, 0.4 - elapsedMiss * 1.6);
      } else {
        ctx.globalAlpha = 0.96;
      }

      // Subtle Motion Flow Trail above falling tile (creates liquid-smooth perception!)
      if (tile.status === 'PENDING' && topY > 0) {
        const trailH = Math.min(48, tileHeight * 0.2);
        const trailGrad = ctx.createLinearGradient(0, topY - trailH, 0, topY);
        trailGrad.addColorStop(0, 'transparent');
        trailGrad.addColorStop(1, lane.glowColor || 'rgba(0, 247, 255, 0.25)');
        ctx.fillStyle = trailGrad;
        ctx.fillRect(lx + 4, topY - trailH, lWidth - 8, trailH);
      }

      // Draw Piano Tile body (Glossy dark glass with glowing neon borders)
      const tileGrad = ctx.createLinearGradient(lx, topY, lx, topY + tileHeight);
      if (tile.isMelodySubtile) {
        tileGrad.addColorStop(0, 'rgba(255, 255, 255, 0.88)');
        tileGrad.addColorStop(1, lane.color);
      } else {
        tileGrad.addColorStop(0, lane.glowColor || 'rgba(0, 247, 255, 0.35)');
        tileGrad.addColorStop(0.35, 'rgba(28, 16, 48, 0.95)');
        tileGrad.addColorStop(1, lane.color);
      }

      ctx.fillStyle = tileGrad;
      this._roundRect(ctx, lx, topY, lWidth, tileHeight, 9, true, false);

      // High-Performance Dual-Pass Neon Glow (Zero CPU Blur, 100% GPU accelerated!)
      ctx.strokeStyle = tile.status === 'MISSED' ? 'rgba(255, 59, 59, 0.35)' : (lane.glowColor || 'rgba(0, 247, 255, 0.35)');
      ctx.lineWidth = 5;
      this._roundRect(ctx, lx, topY, lWidth, tileHeight, 9, false, true);

      ctx.strokeStyle = tile.status === 'MISSED' ? '#ff3b3b' : lane.color;
      ctx.lineWidth = 2;
      this._roundRect(ctx, lx, topY, lWidth, tileHeight, 9, false, true);

      // Top Glass Shine Accent
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      this._roundRect(ctx, lx + 5, topY + 3, lWidth - 10, 4, 2, true, false);

      // Tile Text & Info
      if (tileHeight >= 36) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Big Chord Name near top
        ctx.fillText(tile.chord, lx + lWidth / 2, topY + 34);

        // Finger Icon & Gesture hint below chord
        ctx.font = 'bold 12.5px Outfit, sans-serif';
        ctx.fillStyle = lane.color;
        ctx.fillText(`${tile.emoji} ${tile.fingerCount} JARI`, lx + lWidth / 2, topY + 58);

        // Chord description in middle of long tile
        if (tile.chordDesc && tileHeight >= 140) {
          ctx.font = '600 11px Outfit, sans-serif';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.fillText(tile.chordDesc, lx + lWidth / 2, topY + 84);
        }

        // Lyric preview near bottom of the long tile
        if (tile.lyric && !tile.isMelodySubtile) {
          ctx.font = '600 12px Outfit, sans-serif';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
          const shortLyric = tile.lyric.length > 20 ? tile.lyric.substring(0, 19) + '…' : tile.lyric;
          ctx.fillText(`"${shortLyric}"`, lx + lWidth / 2, topY + tileHeight - 16);
        }
      }

      ctx.restore();
    }

    // 4. Draw Hit Zone / Elongated Grand Piano Keys at hitY
    ctx.save();

    // A. Piano Fallboard / Header Bar above the keys (Flash Tech Navy Trim)
    const headerH = 10;
    const fallboardGrad = ctx.createLinearGradient(0, hitY - headerH, 0, hitY);
    fallboardGrad.addColorStop(0, 'rgba(6, 21, 45, 0.98)');
    fallboardGrad.addColorStop(0.5, 'rgba(11, 40, 85, 0.95)');
    fallboardGrad.addColorStop(1, 'rgba(6, 21, 45, 1)');
    ctx.fillStyle = fallboardGrad;
    ctx.fillRect(0, hitY - headerH, w, headerH);

    // B. Acoustic Grand Piano Damper Strip (Corporate Blue with Cyan Stitch)
    ctx.fillStyle = '#0b5fa5';
    ctx.fillRect(0, hitY - 3, w, 4);
    // Cyan felt stitch accent line
    ctx.strokeStyle = 'rgba(20, 179, 212, 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, hitY - 1);
    ctx.lineTo(w, hitY - 1);
    ctx.stroke();

    // C. Glowing Receptor Neon Line (Flash Tech Cyan)
    ctx.strokeStyle = 'rgba(20, 179, 212, 0.35)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, hitY);
    ctx.lineTo(w, hitY);
    ctx.stroke();

    ctx.strokeStyle = '#14b3d4';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, hitY);
    ctx.lineTo(w, hitY);
    ctx.stroke();

    // D. 4 Elongated Grand Piano Keys
    const padHeight = h - hitY;
    const keyRadius = 8;

    for (let i = 0; i < 4; i++) {
      const lx = i * laneWidth + 4;
      const lWidth = laneWidth - 8;
      const lane = KOMANG_LANES[i];
      const isActive = this.laneActiveStates[i] || (this.lightPillars[i] > 0.15);

      // Key Press 3D travel animation (key depresses down slightly when played)
      const pressOffset = isActive ? 3 : 0;
      const keyTop = hitY + 2 + pressOffset;
      const keyH = padHeight - 6 - pressOffset;

      ctx.save();

      // Soft drop shadow beneath active key
      if (isActive) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        this._roundRect(ctx, lx, keyTop + keyH - 4, lWidth, 6, 4, true, false);
      }

      // Grand Piano Key Body Gradient (Deep Corporate Flash Tech Glass - Zero Glitch, Pristine Clarity)
      const keyGrad = ctx.createLinearGradient(lx, keyTop, lx, keyTop + keyH);
      if (isActive) {
        // Active key lights up with electric neon illumination
        keyGrad.addColorStop(0, '#ffffff');
        keyGrad.addColorStop(0.18, lane.color);
        keyGrad.addColorStop(0.75, 'rgba(11, 95, 165, 0.95)');
        keyGrad.addColorStop(1, 'rgba(6, 21, 45, 0.98)');
      } else {
        // Deep Flash Tech Navy Glossy Key - No foggy white glare!
        keyGrad.addColorStop(0, 'rgba(16, 44, 96, 0.96)'); // Sleek indigo navy head
        keyGrad.addColorStop(0.20, 'rgba(10, 28, 64, 0.96)');
        keyGrad.addColorStop(0.65, 'rgba(7, 20, 48, 0.98)');
        keyGrad.addColorStop(1, 'rgba(4, 12, 30, 1)'); // Grounded dark navy base
      }

      ctx.fillStyle = keyGrad;
      this._roundRect(ctx, lx, keyTop, lWidth, keyH, keyRadius, true, false);

      // Clean 3D Bevel Highlights (Crisp, subtle edges)
      ctx.lineWidth = 1;
      // Top-left subtle highlight
      ctx.strokeStyle = isActive ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.18)';
      ctx.beginPath();
      ctx.moveTo(lx + 2, keyTop + 4);
      ctx.lineTo(lx + 2, keyTop + keyH - 4);
      ctx.stroke();

      // Right shadow
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.moveTo(lx + lWidth - 2, keyTop + 4);
      ctx.lineTo(lx + lWidth - 2, keyTop + keyH - 4);
      ctx.stroke();

      // Outer Key Border with Lane Color Accent
      if (isActive) {
        ctx.strokeStyle = lane.glowColor || 'rgba(20, 179, 212, 0.5)';
        ctx.lineWidth = 4;
        this._roundRect(ctx, lx, keyTop, lWidth, keyH, keyRadius, false, true);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        this._roundRect(ctx, lx, keyTop, lWidth, keyH, keyRadius, false, true);
      } else {
        ctx.strokeStyle = lane.color;
        ctx.lineWidth = 1.5;
        this._roundRect(ctx, lx, keyTop, lWidth, keyH, keyRadius, false, true);
      }

      // Bottom Keycap Lip
      ctx.fillStyle = isActive ? lane.color : 'rgba(0, 0, 0, 0.45)';
      this._roundRect(ctx, lx + 2, keyTop + keyH - 5, lWidth - 4, 3, 2, true, false);

      // --- KEY LABELS & NOTATION (Harmonious, pristine hierarchy) ---
      const centerX = lx + lWidth / 2;

      // 1. Top Target Accent Pill (clean modern indicator instead of floating dot)
      const pillW = 32;
      const pillH = 4;
      ctx.fillStyle = isActive ? '#ffffff' : lane.color;
      this._roundRect(ctx, centerX - pillW / 2, keyTop + 10, pillW, pillH, 2, true, false);

      // 2. Large Bold Chord Name
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lane.chord, centerX, keyTop + keyH * 0.26);

      // 3. Gesture Pill Badge with Finger Count & Emoji
      const badgeY = keyTop + keyH * 0.50;
      const badgeW = lWidth - 16;
      const badgeH = 26;

      ctx.fillStyle = isActive ? 'rgba(0, 0, 0, 0.4)' : 'rgba(4, 14, 34, 0.65)';
      this._roundRect(ctx, centerX - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, 6, true, false);

      ctx.strokeStyle = isActive ? '#ffffff' : lane.color;
      ctx.lineWidth = 1.2;
      this._roundRect(ctx, centerX - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, 6, false, true);

      ctx.fillStyle = isActive ? '#ffffff' : lane.color;
      ctx.font = 'bold 12.5px Outfit, sans-serif';
      ctx.fillText(`${lane.emoji} ${lane.fingerCount} JARI`, centerX, badgeY);

      // 4. Harmonic Role Subtitle
      ctx.fillStyle = isActive ? 'rgba(255, 255, 255, 0.95)' : 'rgba(220, 232, 255, 0.85)';
      ctx.font = '600 11.5px Outfit, sans-serif';
      const roleText = lane.name.split(' ')[1] || lane.name;
      ctx.fillText(roleText, centerX, keyTop + keyH * 0.72);

      // 5. Key Shortcut Hint at Bottom
      const keyHintY = keyTop + keyH * 0.88;
      ctx.fillStyle = isActive ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.08)';
      this._roundRect(ctx, centerX - 24, keyHintY - 9, 48, 18, 4, true, false);

      ctx.fillStyle = isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.75)';
      ctx.font = 'bold 10px Outfit, sans-serif';
      ctx.fillText(`[${lane.keyHint}]`, centerX, keyHintY);

      ctx.restore();
    }
    ctx.restore();

    // 5. Draw Particle Sparks (Fast 60fps rendering without shadow blur)
    for (let i = 0; i < this.hitParticles.length; i++) {
      const p = this.hitParticles[i];
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 6. Draw Floating Judgment Toasts
    for (let i = 0; i < this.floatingToasts.length; i++) {
      const t = this.floatingToasts[i];
      ctx.save();
      ctx.globalAlpha = t.alpha;
      ctx.translate(t.x, t.y);
      ctx.scale(t.scale, t.scale);

      ctx.font = '900 16px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const toastColor = t.rating === 'PERFECT' ? '#ffd700' : t.rating === 'GREAT' ? '#00f7ff' : '#00ff88';

      // Crisp contrast outline (Zero GPU blur stall!)
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.lineWidth = 3;
      ctx.strokeText(`${t.rating}!`, 0, -8);
      ctx.fillStyle = toastColor;
      ctx.fillText(`${t.rating}!`, 0, -8);

      ctx.font = 'bold 11px Orbitron, sans-serif';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.lineWidth = 2.5;
      ctx.strokeText(`+${t.points} PTS`, 0, 10);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`+${t.points} PTS`, 0, 10);

      ctx.restore();
    }

    // Idle Prompt Overlay
    if (!this.isRunning && curTime <= 0.1) {
      ctx.save();
      const badgeW = Math.min(340, w * 0.85);
      const badgeH = 50;
      const bx = (w - badgeW) / 2;
      const by = hitY * 0.42;

      ctx.fillStyle = 'rgba(6, 21, 45, 0.92)';
      this._roundRect(ctx, bx, by, badgeW, badgeH, 12, true, false);

      ctx.strokeStyle = 'rgba(20, 179, 212, 0.5)';
      ctx.lineWidth = 1.5;
      this._roundRect(ctx, bx, by, badgeW, badgeH, 12, false, true);

      ctx.fillStyle = '#14b3d4';
      ctx.font = 'bold 13px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('▶️ KLIK "MAIN 30s" ATAU SENTUH TUTS', w / 2, by + 18);

      ctx.fillStyle = '#bfd9ee';
      ctx.font = '500 11px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Tunjukkan gestur tangan di depan kamera 📷', w / 2, by + 34);

      ctx.restore();
    }

    // Dynamic Speed HUD Badge on Highway
    if (this.speed && this.speed > 1.02) {
      ctx.save();
      const badgeText = `⚡ SPEED ${this.speed.toFixed(1)}x`;
      ctx.font = '900 11px Orbitron, sans-serif';
      const textW = ctx.measureText(badgeText).width;
      const bx = w - textW - 20;
      const by = 16;
      ctx.fillStyle = 'rgba(10, 5, 25, 0.75)';
      this._roundRect(ctx, bx - 8, by - 12, textW + 16, 20, 10, true, false);
      ctx.strokeStyle = this.speed >= 1.8 ? '#ff2d75' : (this.speed >= 1.4 ? '#ffd700' : '#00f7ff');
      ctx.lineWidth = 1;
      this._roundRect(ctx, bx - 8, by - 12, textW + 16, 20, 10, false, true);
      ctx.fillStyle = this.speed >= 1.8 ? '#ff2d75' : (this.speed >= 1.4 ? '#ffd700' : '#00f7ff');
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, bx, by);
      ctx.restore();
    }

    ctx.restore();
  }

  _roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, radius);
      if (fill) ctx.fill();
      if (stroke) ctx.stroke();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }
}

export const komangTilesEngine = new KomangTilesEngine();
