// NadimuTilesEngine.js - Real-Time Piano Tiles Highway for "Selalu Ada di Nadimu" (OST Jumbo - Peaceful Piano)
// 4-Lane Falling Tiles Engine synchronized with Nadimu's 16-measure chord progression,
// backing track audio, live camera hand gesture recognition, and interactive input.

import { NADIMU_MEASURES } from './NadimuService.js';
import { audioManager } from '../audio/AudioManager.js';

export const NADIMU_LANES = [
  {
    lane: 0,
    chord: 'C',
    fingerCount: 1,
    emoji: '☝️',
    color: '#00f7ff',
    glowColor: 'rgba(0, 247, 255, 0.45)',
    name: 'C (Do)',
    keyHint: '1 / D',
  },
  {
    lane: 1,
    chord: 'F',
    fingerCount: 2,
    emoji: '✌️',
    color: '#00ffaa',
    glowColor: 'rgba(0, 255, 170, 0.45)',
    name: 'F / Dm',
    keyHint: '2 / F',
  },
  {
    lane: 2,
    chord: 'Em',
    fingerCount: 3,
    emoji: '🤟',
    color: '#ff2d75',
    glowColor: 'rgba(255, 45, 117, 0.45)',
    name: 'Em / Am',
    keyHint: '3 / J',
  },
  {
    lane: 3,
    chord: 'G',
    fingerCount: 4,
    emoji: '🖐️',
    color: '#ffd700',
    glowColor: 'rgba(255, 215, 0, 0.45)',
    name: 'G Dominan',
    keyHint: '4 / K',
  },
];

export class NadimuTilesEngine {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.nadimuService = null;
    this.animFrameId = null;
    this.isRunning = false;

    // Highway Geometry & Elongated Grand Piano Keys (Matching Komang)
    this.width = 600;
    this.height = 700;
    this.lanesCount = 4;
    this.hitLineRatio = 0.65; // Elongated grand piano keys (~35% of highway height)
    this.keyHeightModes = [
      { ratio: 0.65, label: 'Panjang (35%)' },
      { ratio: 0.55, label: 'Ekstra Panjang (45%)' },
      { ratio: 0.78, label: 'Kompak (22%)' },
    ];
    this.currentKeyHeightModeIdx = 0;
    this.hitLineY = 455;
    this.hitWindowSec = 0.52; // Generous, comfortable hit window matching Komang

    // Visual Speed
    this.baseTravelTimeSec = 4.2;
    this.speedMultiplier = 1.0;
    this.travelTimeSec = 4.2;

    // Tile generation & state
    this.tiles = [];
    this.measureDurationSec = 3.076;
    this.cycleDurationSec = 49.23;

    // Particles & Feedback FX (Matching Komang Visual Excellence)
    this.particles = [];
    this.lightPillars = [0, 0, 0, 0]; // Intensity for each lane 0..3 (Vertical Glowing Neon Pillars)
    this.floatingToasts = []; // Floating judgment toasts (+1000 PERFECT! ✨)
    this.laneActiveStates = [false, false, false, false];
    this.screenShakeTime = 0;
    this.redVignetteAlpha = 0;
    this.hitEffects = [];
    this.lanePressAnim = [0, 0, 0, 0];

    // High Precision Interpolation (Monotonic anchor with gentle drift damping)
    this._audioAnchorTime = 0;
    this._audioAnchorPerf = 0;
    this._lastRawAudioTime = -1;
    this._smoothSongTime = 0;

    this._boundOnFrame = this._onFrame.bind(this);
  }

  triggerMissEffect() {
    this.screenShakeTime = 14;
    this.redVignetteAlpha = 0.55;
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

  init(canvas, nadimuService) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.nadimuService = nadimuService;

    this.resize();
    this._generateTileSchedule();
    this._bindEvents();
    this.draw();
  }

  draw() {
    if (!this.ctx) return;
    const songTime = this.getCurrentSongTime();
    this._renderHighway(songTime);
  }

  setSpeed(multiplier = 1.0) {
    this.speedMultiplier = Math.max(0.6, Math.min(2.0, multiplier));
    this.travelTimeSec = this.baseTravelTimeSec / this.speedMultiplier;
  }

  resize() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    const rect = parent ? parent.getBoundingClientRect() : { width: 600, height: 700 };

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
    const bpm = this.nadimuService?.bpm || 78;
    const beatSec = 60 / bpm;
    this.measureDurationSec = beatSec * 4;
    this.halfMeasureSec = beatSec * 2; // ~1.538s (creates dense, continuous flow matching Komang!)
    this.cycleDurationSec = this.measureDurationSec * NADIMU_MEASURES.length;

    // Sweet sparkling 3-note open piano voicings in octaves 4-5 (matching Komang's luminous sound)
    const sweetVoicings = {
      'C': ['G4', 'C5', 'E5'],
      'F': ['A4', 'C5', 'F5'],
      'Em': ['G4', 'B4', 'E5'],
      'Am': ['A4', 'C5', 'E5'],
      'Dm': ['A4', 'D5', 'F5'],
      'G': ['G4', 'B4', 'D5'],
    };

    const sweetVoicingsHigh = {
      'C': ['C5', 'E5', 'G5'],
      'F': ['C5', 'F5', 'A5'],
      'Em': ['B4', 'E5', 'G5'],
      'Am': ['C5', 'E5', 'A5'],
      'Dm': ['D5', 'F5', 'A5'],
      'G': ['B4', 'D5', 'G5'],
    };

    const splitLyrics = {
      0: ["Kala nanti...", "badai 'kan datang ⛈️"],
      1: ["Angin akan...", "buat kau goyah 🍃"],
      2: ["Maafkan...", "hidup memang 🕊️"],
      3: ["Ingin kau...", "lebih kuat... ✨"],
      4: ["Andaikan...", "saat itu datang..."],
      5: ["Kami tak ada...", "menemani... 🕊️"],
      6: ["Aku ingin...", "kamu mendengar..."],
      7: ["Nyanyianku...", "di sini... 🕊️"],
      8: ["Sedikit demi...", "sedikit... ✨"],
      9: ["Lelah tak akan...", "tersia... 💖"],
      10: ["Selalu ada...", "di nadimu... ✨"],
      11: ["Mengalir dalam...", "jiwamu... 🌸"],
      12: ["Tersenyumlah...", "hari ini... ☀️"],
      13: ["Esok kita...", "'kan melangkah... 🚀"],
      14: ["Selalu ada...", "di nadimu... ✨"],
      15: ["Keluarga abadi...", "selamanya... ❤️"],
    };

    const totalCycles = 10;
    let globalId = 0;

    for (let cycle = 0; cycle < totalCycles; cycle++) {
      const cycleOffsetSec = cycle * this.cycleDurationSec;

      NADIMU_MEASURES.forEach((m) => {
        const targetTimeSec = cycleOffsetSec + m.index * this.measureDurationSec;
        let laneIndex = 0;
        if (m.fingerCount === 1) laneIndex = 0;
        else if (m.fingerCount === 2) laneIndex = 1;
        else if (m.fingerCount === 3) laneIndex = 2;
        else if (m.fingerCount === 4) laneIndex = 3;
        else laneIndex = 0;

        const mainMelody = (m.melodyNotes && m.melodyNotes[0]) ? m.melodyNotes[0] : 'C4';
        const chordVoicing = sweetVoicings[m.chord] || ['C4', 'E4', 'G4', 'C5'];
        const chordVoicingHigh = sweetVoicingsHigh[m.chord] || chordVoicing;
        const lyrics = splitLyrics[m.index] || [m.lyric, ''];

        // 1. Beat 1 Primary Downbeat Tile (Matching Komang's elongated grand piano tile)
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
          lyric: lyrics[0],
          displayNote: mainMelody,
          melodyNotes: chordVoicing,
          timeSec: targetTimeSec,
          durationSec: this.halfMeasureSec * 0.85,
          status: 'PENDING',
          hitRating: null,
          isMelodySubtile: false,
        });

        // 2. Beat 3 Secondary Flow Tile (Fills highway so tiles flow continuously like Komang, no single lonely tiles!)
        this.tiles.push({
          id: `tile_${globalId++}`,
          cycle,
          measureIndex: m.index,
          measureNum: m.measure,
          chord: m.chord,
          chordDesc: `${m.chord} (Alunan Melodi)`,
          fingerCount: m.fingerCount,
          emoji: m.emoji,
          lane: laneIndex,
          lyric: lyrics[1] || lyrics[0],
          displayNote: (m.melodyNotes && m.melodyNotes[2]) ? m.melodyNotes[2] : 'G4',
          melodyNotes: chordVoicingHigh,
          timeSec: targetTimeSec + this.halfMeasureSec,
          durationSec: this.halfMeasureSec * 0.85,
          status: 'PENDING',
          hitRating: null,
          isMelodySubtile: true,
        });
      });
    }
  }

  _bindEvents() {
    if (!this.canvas) return;

    const handlePointerDown = (e) => {
      e.preventDefault();
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
    this._lastAudioTime = 0;
    this._lastPerfTime = performance.now();
    this.animFrameId = requestAnimationFrame(this._boundOnFrame);
  }

  stop() {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.draw();
  }

  reset() {
    this.tiles.forEach(t => {
      t.status = 'PENDING';
      t.hitRating = null;
    });
    this.particles = [];
    this.lightPillars = [0, 0, 0, 0];
    this.floatingToasts = [];
    this.laneActiveStates = [false, false, false, false];
    this.screenShakeTime = 0;
    this.redVignetteAlpha = 0;
    this.hitEffects = [];
    this.lanePressAnim = [0, 0, 0, 0];
    this._audioAnchorTime = 0;
    this._audioAnchorPerf = 0;
    this._lastRawAudioTime = -1;
    this._smoothSongTime = 0;
    this.draw();
  }

  seekTime(targetSec) {
    this._smoothSongTime = targetSec;
    this._audioAnchorTime = targetSec;
    this._audioAnchorPerf = performance.now();
    this._lastRawAudioTime = targetSec;
    this.tiles.forEach(t => {
      if (t.timeSec + t.durationSec < targetSec - 0.2) {
        t.status = 'MISSED';
      } else if (t.timeSec >= targetSec - 0.2) {
        t.status = 'PENDING';
        t.hitRating = null;
      }
    });
  }

  evaluateGesture(totalFingers, hasHand = true) {
    return this.processGestureFrame({ hasHand, totalFingers });
  }

  processGestureFrame(gestureResult) {
    if (!this.isRunning || !this.nadimuService) return null;

    const hasHand = gestureResult && gestureResult.hasHand;
    const fingers = hasHand ? (gestureResult.totalFingers ?? gestureResult.fingers ?? 0) : 0;

    if (!hasHand) return null;

    if (fingers === 5) {
      const songTime = this.getCurrentSongTime();
      let bestTile = null;
      let minDelta = Infinity;

      for (let i = 0; i < this.tiles.length; i++) {
        const t = this.tiles[i];
        if (t.status === 'PENDING') {
          const delta = Math.abs(t.timeSec - songTime);
          if (delta <= this.hitWindowSec && delta < minDelta) {
            minDelta = delta;
            bestTile = t;
          }
        }
      }

      if (bestTile) {
        return this.triggerLaneAction(bestTile.lane, false, true);
      }
      return null;
    }

    let targetLane = -1;
    if (fingers === 1) targetLane = 0;
    else if (fingers === 2) targetLane = 1;
    else if (fingers === 3) targetLane = 2;
    else if (fingers === 4) targetLane = 3;

    if (targetLane >= 0) {
      return this.triggerLaneAction(targetLane, false, false);
    }

    return null;
  }

  triggerLaneAction(laneIndex, isManualClick = false, isWildcard = false) {
    if (!this.nadimuService) return null;

    const songTime = this.getCurrentSongTime();
    let closestTile = null;
    let minDelta = Infinity;

    for (let i = 0; i < this.tiles.length; i++) {
      const t = this.tiles[i];
      if (t.timeSec > songTime + this.hitWindowSec + 0.5) break;
      if (t.status !== 'PENDING') continue;
      if (t.lane !== laneIndex) continue;

      const delta = Math.abs(t.timeSec - songTime);
      if (delta <= this.hitWindowSec && delta < minDelta) {
        minDelta = delta;
        closestTile = t;
      }
    }

    if (closestTile) {
      // Light up glowing vertical light pillar and receptor key
      this.lightPillars[laneIndex] = 1.0;
      this.laneActiveStates[laneIndex] = true;
      setTimeout(() => {
        this.laneActiveStates[laneIndex] = false;
      }, 160);

      return this._executeHit(closestTile, minDelta, isManualClick, isWildcard);
    } else if (isManualClick) {
      this.lightPillars[laneIndex] = 0.55;
      this.laneActiveStates[laneIndex] = true;
      if (!this.isRunning) {
        this.draw();
      }
      setTimeout(() => {
        this.laneActiveStates[laneIndex] = false;
        if (!this.isRunning) this.draw();
      }, 120);

      const lanePreviewNotes = ['C4', 'F4', 'E4', 'G4'];
      const previewNote = lanePreviewNotes[laneIndex] || 'C4';
      audioManager.init();
      audioManager.resume();
      audioManager.playKomangMelodyNote(previewNote, {
        duration: 1.1,
        lane: laneIndex,
        isPerfect: false,
        preset: 'Acoustic Piano',
      });
    }

    return null;
  }

  _executeHit(tile, timeDiffSec, isManualClick, isWildcard = false) {
    tile.status = 'HIT';

    let rating = 'PERFECT';
    let baseScore = 1000;
    if (timeDiffSec <= 0.18) {
      rating = 'PERFECT';
      baseScore = 1000;
    } else if (timeDiffSec <= 0.35) {
      rating = 'GREAT';
      baseScore = 600;
    } else {
      rating = 'GOOD';
      baseScore = 300;
    }
    tile.hitRating = rating;

    // 1. Play crystal-pure, sweet singing Steinway Grand Piano melody chord with stereo pan & sparkle overtone!
    audioManager.init();
    audioManager.resume();
    audioManager.playKomangMelodyNote(tile.melodyNotes || tile.displayNote || 'C5', {
      duration: 1.6,
      isPerfect: rating === 'PERFECT',
      lane: tile.lane,
      preset: 'Acoustic Piano',
    });

    // 2. Spawn Particle Burst & Animated Floating Toast
    const laneWidth = this.width / 4;
    const hitX = (tile.lane + 0.5) * laneWidth;
    const hitY = this.height * this.hitLineRatio;
    this._spawnHitParticles(hitX, hitY, isWildcard ? '#ffd700' : NADIMU_LANES[tile.lane].color);
    if (isWildcard) {
      this._spawnToast(hitX, hitY - 30, 'WILDCARD! ✨', baseScore, '#ffd700');
    } else {
      this._spawnToast(hitX, hitY - 30, rating, baseScore, NADIMU_LANES[tile.lane].color);
    }

    // 3. Update NadimuService Score & State with Dynamic Multiplier
    if (this.nadimuService) {
      this.nadimuService.combo++;
      if (this.nadimuService.combo > this.nadimuService.maxCombo) {
        this.nadimuService.maxCombo = this.nadimuService.combo;
      }

      if (rating === 'PERFECT') this.nadimuService.perfectHits++;
      else if (rating === 'GREAT') this.nadimuService.greatHits++;
      else if (rating === 'GOOD') this.nadimuService.goodHits++;

      let multiplier = 1.0;
      if (this.nadimuService.combo >= 20) multiplier = 2.5;
      else if (this.nadimuService.combo >= 10) multiplier = 2.0;
      else if (this.nadimuService.combo >= 5) multiplier = 1.5;

      const earnedPoints = Math.round(baseScore * multiplier);
      this.nadimuService.score += earnedPoints;

      if (this.nadimuService.combo > 0 && this.nadimuService.combo % 6 === 0) {
        this.nadimuService.recoverLife(1);
        this._spawnToast(hitX, hitY - 45, '+1 NYAWA! ❤️', 0, '#00ffaa');
      }

      this.nadimuService.evaluatedMeasures.add(tile.measureIndex);

      if (this.nadimuService.onChordHit) {
        this.nadimuService.onChordHit({
          tile,
          rating,
          measure: NADIMU_MEASURES[tile.measureIndex],
          measureIndex: tile.measureIndex,
          earnedPoints,
          multiplier,
          combo: this.nadimuService.combo,
          maxCombo: this.nadimuService.maxCombo,
          score: this.nadimuService.score,
          lives: this.nadimuService.lives,
          isUserAction: true,
          isWildcard,
        });
      }
    }

    return { tile, rating, score: baseScore, isWildcard };
  }

  _getCurrentSongTime() {
    return this.getCurrentSongTime();
  }

  getCurrentSongTime() {
    if (!this.nadimuService) return 0;

    if (this.nadimuService.mode === 'PLAY_ALONG' && this.nadimuService.audioEl) {
      const audio = this.nadimuService.audioEl;
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

        const elapsedSec = (now - this._audioAnchorPerf) / 1000;
        const rate = audio.playbackRate || 1.0;
        const predictedTime = this._audioAnchorTime + elapsedSec * rate;

        if (rawTime !== this._lastRawAudioTime) {
          this._lastRawAudioTime = rawTime;
          const drift = rawTime - predictedTime;

          if (Math.abs(drift) > 0.16) {
            this._audioAnchorTime = rawTime;
            this._audioAnchorPerf = now;
            this._smoothSongTime = rawTime;
          } else {
            this._audioAnchorTime += drift * 0.04;
            this._smoothSongTime = predictedTime;
          }
        } else {
          this._smoothSongTime = predictedTime;
        }
      }

      return Math.max(0, this._smoothSongTime - this.nadimuService.audioOffsetSec);
    }

    const ms = (this.nadimuService.currentTempoBeat || 0) * (60 / 78) * 1000;
    return ms / 1000;
  }

  /**
   * Integrated distance metric S(t) for butter-smooth acceleration without any tile stutter
   */
  _getIntegratedSongTime(t) {
    if (!this.nadimuService || this.nadimuService.sessionMode !== '30S_RANDOM') {
      return t;
    }
    const start = this.nadimuService.sessionStartSec;
    const dur = this.nadimuService.sessionDurationSec || 45.0;
    const maxBoost = 0.85;

    if (t <= start) {
      return t;
    }

    const u = Math.min(dur, t - start);
    const integralInSession = u + (maxBoost / (2 * dur)) * (u * u);

    if (t > start + dur) {
      const extra = t - (start + dur);
      return start + integralInSession + extra * (1.0 + maxBoost);
    }

    return start + integralInSession;
  }

  getSpeedMultiplier(curTime = this.getCurrentSongTime()) {
    if (!this.nadimuService || this.nadimuService.sessionMode !== '30S_RANDOM') {
      return 1.0;
    }
    const start = this.nadimuService.sessionStartSec;
    const dur = this.nadimuService.sessionDurationSec || 45.0;
    const u = curTime - start;
    if (u <= 0) return 1.0;
    const progress = Math.min(1.0, u / dur);
    return 1.0 + progress * 0.85;
  }

  _onFrame(now) {
    if (!this.isRunning) return;

    try {
      const songTime = this.getCurrentSongTime();
      this.speedMultiplier = this.getSpeedMultiplier(songTime);

      this._updateTiles(songTime);
      this._updateParticles();
      this._renderHighway(songTime);
    } catch (err) {
      console.error('NadimuTilesEngine frame loop error:', err);
    }

    this.animFrameId = requestAnimationFrame(this._boundOnFrame);
  }

  _updateTiles(songTime) {
    const laneWidth = this.width / 4;
    const hitY = this.height * this.hitLineRatio;

    for (let i = 0; i < this.tiles.length; i++) {
      const tile = this.tiles[i];

      if (tile.timeSec > songTime + 1.0) break;
      if (tile.status !== 'PENDING') continue;

      if (this.nadimuService && this.nadimuService.sessionMode === '30S_RANDOM') {
        if (tile.timeSec < this.nadimuService.sessionStartSec - 0.1) {
          tile.status = 'PAST';
          continue;
        }
      }

      if ((songTime - tile.timeSec) > this.hitWindowSec) {
        tile.status = 'MISSED';
        if (this.nadimuService) {
          if (!tile.isMelodySubtile) {
            this.nadimuService.missHits++;
            if (!this.nadimuService.isNoFail) {
              this.nadimuService.loseLife('CHORD_MISSED');
            }
            const hitX = (tile.lane + 0.5) * laneWidth;
            this._spawnToast(hitX, hitY - 25, 'MISS! 💔 -1 NYAWA', 0, '#ff3b3b');
            this.triggerMissEffect();
            this.lightPillars[tile.lane] = 0.75;
            this.laneActiveStates[tile.lane] = true;
            setTimeout(() => {
              this.laneActiveStates[tile.lane] = false;
            }, 200);

            if (this.nadimuService.onLifeLost) {
              this.nadimuService.onLifeLost({
                tile,
                lives: this.nadimuService.lives,
                maxLives: this.nadimuService.maxLives,
                reason: 'CHORD_MISSED',
              });
            }
          } else {
            // Melodic continuation subtile: resets combo but does not lose life
            this.nadimuService.combo = 0;
            const comboEl = document.getElementById('nadimu-cur-combo');
            if (comboEl) comboEl.innerText = 'x0 COMBO';
          }
        }
      }
    }
  }

  _updateParticles() {
    // Fade light pillars
    for (let l = 0; l < 4; l++) {
      this.lightPillars[l] = Math.max(0, this.lightPillars[l] - 0.045);
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15; // subtle gravity
      p.alpha -= p.fade;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update floating toasts
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
    const count = 22;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5);
      const speed = Math.random() * 6 + 2.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.5,
        radius: Math.random() * 4 + 2,
        color,
        alpha: 1.0,
        fade: Math.random() * 0.03 + 0.02,
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

  _renderHighway(songTime) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const laneW = w / 4;
    this.hitLineY = h * this.hitLineRatio;
    const hitY = this.hitLineY;

    ctx.clearRect(0, 0, w, h);

    ctx.save();

    // Screen Shake effect on damage / miss (matching Komang!)
    if (this.screenShakeTime > 0) {
      const shakeMag = (this.screenShakeTime / 14) * 8;
      const ox = (Math.random() - 0.5) * shakeMag;
      const oy = (Math.random() - 0.5) * shakeMag;
      ctx.translate(ox, oy);
      this.screenShakeTime--;
    }

    // Deep neon highway gradient matching Komang
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, 'rgba(8, 4, 18, 0.95)');
    bgGrad.addColorStop(0.7, 'rgba(16, 8, 32, 0.96)');
    bgGrad.addColorStop(1, 'rgba(28, 12, 48, 0.98)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Draw 4 Lanes and Light Pillars
    for (let i = 0; i < 4; i++) {
      const lx = i * laneW;
      const lane = NADIMU_LANES[i];

      // Lane divider lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx, h);
      ctx.stroke();

      // Light Pillar when lane is pressed/hit (Spectacular vertical neon column!)
      if (this.lightPillars[i] > 0.01) {
        const pillarGrad = ctx.createLinearGradient(0, hitY, 0, 0);
        pillarGrad.addColorStop(0, lane.color);
        pillarGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = pillarGrad;
        ctx.globalAlpha = this.lightPillars[i] * 0.45;
        ctx.fillRect(lx + 2, 0, laneW - 4, hitY);
        ctx.globalAlpha = 1.0;
      }
    }
    // Rightmost lane border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.moveTo(w, 0);
    ctx.lineTo(w, h);
    ctx.stroke();

    // Render Falling Tiles using Integrated Distance Metric
    const S_now = this._getIntegratedSongTime(songTime);
    this.speedMultiplier = this.getSpeedMultiplier(songTime);

    // Visual distance between bars in the same lane (using halfMeasureSec so 2-3 tiles are continuously visible!)
    const subMeasureSec = this.halfMeasureSec || (this.measureDurationSec / 2);
    const measureDistance = (subMeasureSec / this.baseTravelTimeSec) * hitY;
    // Grand elongated piano tile height with clean spacing, matching Komang!
    const tileHeight = Math.max(105, Math.min(185, Math.round(measureDistance - 20)));

    for (let i = 0; i < this.tiles.length; i++) {
      const tile = this.tiles[i];
      if (tile.status === 'HIT') continue;
      if (tile.status === 'MISSED') {
        const elapsedMiss = songTime - tile.timeSec - this.hitWindowSec;
        if (elapsedMiss > 0.22) continue;
      }

      const S_tile = this._getIntegratedSongTime(tile.timeSec);
      const deltaS = S_tile - S_now;
      if (deltaS < -0.45) continue;
      if (deltaS > this.baseTravelTimeSec + 0.35) break; // Future tiles are beyond top horizon, stop early!

      const progress = 1.0 - (deltaS / this.baseTravelTimeSec);
      const targetY = progress * hitY;
      const topY = targetY - tileHeight;

      if (topY + tileHeight < 0 || topY > h + 50) continue;

      this._renderSingleTile(ctx, tile, topY, tileHeight, laneW, songTime);
    }

    // Render Elongated Grand Piano Keys
    this._renderPianoKeys(ctx, w, h, laneW);

    // Render Particles
    this._renderParticles(ctx);

    // Render Floating Judgment Toasts (+1000 PERFECT! ✨)
    this._renderFloatingToasts(ctx);

    // Red Vignette on damage / miss
    if (this.redVignetteAlpha > 0.01) {
      ctx.save();
      const vigGrad = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.7);
      vigGrad.addColorStop(0, 'rgba(255, 0, 0, 0)');
      vigGrad.addColorStop(1, `rgba(255, 0, 40, ${this.redVignetteAlpha * 0.45})`);
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
      this.redVignetteAlpha = Math.max(0, this.redVignetteAlpha - 0.03);
    }

    ctx.restore();
  }



  _renderSingleTile(ctx, tile, topY, tileHeight, laneW) {
    const laneConfig = NADIMU_LANES[tile.lane];
    const lx = tile.lane * laneW + 4;
    const lWidth = laneW - 8;

    ctx.save();

    if (tile.status === 'MISSED') {
      ctx.globalAlpha = 0.4;
    } else {
      ctx.globalAlpha = 0.96;
    }

    // Subtle Motion Flow Trail above falling tile (creates liquid-smooth perception!)
    if (tile.status === 'PENDING' && topY > 0) {
      const trailH = Math.min(48, tileHeight * 0.2);
      const trailGrad = ctx.createLinearGradient(0, topY - trailH, 0, topY);
      trailGrad.addColorStop(0, 'transparent');
      trailGrad.addColorStop(1, laneConfig.glowColor || 'rgba(0, 247, 255, 0.25)');
      ctx.fillStyle = trailGrad;
      ctx.fillRect(lx + 4, topY - trailH, lWidth - 8, trailH);
    }

    // Draw Piano Tile body (Glossy dark glass with glowing neon borders matching Komang)
    const tileGrad = ctx.createLinearGradient(lx, topY, lx, topY + tileHeight);
    if (tile.isMelodySubtile) {
      tileGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
      tileGrad.addColorStop(0.35, 'rgba(28, 16, 48, 0.95)');
      tileGrad.addColorStop(1, laneConfig.color);
    } else {
      tileGrad.addColorStop(0, laneConfig.glowColor || 'rgba(0, 247, 255, 0.35)');
      tileGrad.addColorStop(0.35, 'rgba(28, 16, 48, 0.95)');
      tileGrad.addColorStop(1, laneConfig.color);
    }

    ctx.fillStyle = tileGrad;
    this._roundRect(ctx, lx, topY, lWidth, tileHeight, 9, true, false);

    // High-Performance Dual-Pass Neon Glow (Zero CPU Blur, 100% GPU accelerated!)
    ctx.strokeStyle = tile.status === 'MISSED' ? 'rgba(255, 59, 59, 0.35)' : (laneConfig.glowColor || 'rgba(0, 247, 255, 0.35)');
    ctx.lineWidth = 5;
    this._roundRect(ctx, lx, topY, lWidth, tileHeight, 9, false, true);

    ctx.strokeStyle = tile.status === 'MISSED' ? '#ff3b3b' : laneConfig.color;
    ctx.lineWidth = 2;
    this._roundRect(ctx, lx, topY, lWidth, tileHeight, 9, false, true);

    // Top Glass Shine Accent
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    this._roundRect(ctx, lx + 5, topY + 3, lWidth - 10, 4, 2, true, false);

    // Tile Text & Info
    if (tileHeight >= 36) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Big Chord Name near top
      ctx.fillText(tile.chord, lx + lWidth / 2, topY + 34);

      // Finger Icon & Gesture hint below chord
      ctx.font = 'bold 12.5px Outfit, sans-serif';
      ctx.fillStyle = laneConfig.color;
      ctx.fillText(`${tile.emoji} ${tile.fingerCount} JARI`, lx + lWidth / 2, topY + 58);

      // Chord description in middle of long tile
      if (tile.chordDesc && tileHeight >= 130) {
        ctx.font = '600 11px Outfit, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText(tile.chordDesc, lx + lWidth / 2, topY + 84);
      }

      // Lyric preview near bottom of the long tile
      if (tile.lyric) {
        ctx.font = '600 12px Outfit, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        const shortLyric = tile.lyric.length > 20 ? tile.lyric.substring(0, 19) + '…' : tile.lyric;
        ctx.fillText(`"${shortLyric}"`, lx + lWidth / 2, topY + tileHeight - 16);
      }
    }

    ctx.restore();
  }

  _renderPianoKeys(ctx, w, h, laneW) {
    const hitY = this.hitLineY;

    ctx.save();

    // A. Piano Fallboard / Header Bar above the keys (Wooden Cyber Trim)
    const headerH = 10;
    const fallboardGrad = ctx.createLinearGradient(0, hitY - headerH, 0, hitY);
    fallboardGrad.addColorStop(0, 'rgba(6, 10, 20, 0.98)');
    fallboardGrad.addColorStop(0.5, 'rgba(16, 26, 50, 0.95)');
    fallboardGrad.addColorStop(1, 'rgba(8, 14, 30, 1)');
    ctx.fillStyle = fallboardGrad;
    ctx.fillRect(0, hitY - headerH, w, headerH);

    // B. Acoustic Grand Piano Red Velvet Felt Damper Strip
    ctx.fillStyle = '#b91c1c'; // Crimson red felt damper
    ctx.fillRect(0, hitY - 3, w, 4);
    // Gold felt stitch accent line
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, hitY - 1);
    ctx.lineTo(w, hitY - 1);
    ctx.stroke();

    // C. Glowing Receptor Neon Line
    ctx.strokeStyle = 'rgba(0, 247, 255, 0.35)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, hitY);
    ctx.lineTo(w, hitY);
    ctx.stroke();

    ctx.strokeStyle = '#00f7ff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, hitY);
    ctx.lineTo(w, hitY);
    ctx.stroke();

    // D. 4 Elongated Grand Piano Keys (Matching Komang)
    const padHeight = h - hitY;
    const keyRadius = 8;

    for (let i = 0; i < 4; i++) {
      const lx = i * laneW + 4;
      const lWidth = laneW - 8;
      const lane = NADIMU_LANES[i];
      const isActive = this.laneActiveStates[i] || (this.lightPillars[i] > 0.15);

      // Key Press 3D travel animation
      const pressOffset = isActive ? 3 : 0;
      const keyTop = hitY + 2 + pressOffset;
      const keyH = padHeight - 6 - pressOffset;

      ctx.save();

      // Soft drop shadow beneath active key
      if (isActive) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        this._roundRect(ctx, lx, keyTop + keyH - 4, lWidth, 6, 4, true, false);
      }

      // Grand Piano Key Body Gradient
      const keyGrad = ctx.createLinearGradient(lx, keyTop, lx, keyTop + keyH);
      if (isActive) {
        keyGrad.addColorStop(0, '#ffffff');
        keyGrad.addColorStop(0.18, lane.color);
        keyGrad.addColorStop(0.72, lane.color);
        keyGrad.addColorStop(1, 'rgba(255, 255, 255, 0.4)');
      } else {
        keyGrad.addColorStop(0, 'rgba(240, 244, 255, 0.95)'); // Polished ivory key head
        keyGrad.addColorStop(0.10, 'rgba(215, 225, 248, 0.88)');
        keyGrad.addColorStop(0.40, 'rgba(20, 30, 60, 0.92)'); // Deep reflective key body
        keyGrad.addColorStop(0.80, 'rgba(12, 18, 36, 0.98)');
        keyGrad.addColorStop(1, 'rgba(6, 10, 22, 1)'); // Dark weighted key base
      }

      ctx.fillStyle = keyGrad;
      this._roundRect(ctx, lx, keyTop, lWidth, keyH, keyRadius, true, false);

      // Ivory Vertical Reflection Strip
      if (!isActive) {
        const shineGrad = ctx.createLinearGradient(lx + 4, 0, lx + 18, 0);
        shineGrad.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
        shineGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = shineGrad;
        this._roundRect(ctx, lx + 4, keyTop + 6, 12, keyH - 16, 2, true, false);
      }

      // 3D Bevel: Left Edge Highlight & Right Edge Shadow
      ctx.lineWidth = 1;
      ctx.strokeStyle = isActive ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.35)';
      ctx.beginPath();
      ctx.moveTo(lx + 2, keyTop + 4);
      ctx.lineTo(lx + 2, keyTop + keyH - 4);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.beginPath();
      ctx.moveTo(lx + lWidth - 2, keyTop + 4);
      ctx.lineTo(lx + lWidth - 2, keyTop + keyH - 4);
      ctx.stroke();

      // Outer Key Border & Neon Underglow
      if (isActive) {
        ctx.strokeStyle = lane.glowColor || 'rgba(0, 247, 255, 0.45)';
        ctx.lineWidth = 6;
        this._roundRect(ctx, lx, keyTop, lWidth, keyH, keyRadius, false, true);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        this._roundRect(ctx, lx, keyTop, lWidth, keyH, keyRadius, false, true);
      } else {
        ctx.strokeStyle = lane.color;
        ctx.lineWidth = 1.5;
        this._roundRect(ctx, lx, keyTop, lWidth, keyH, keyRadius, false, true);
      }

      // Bottom Keycap Lip
      ctx.fillStyle = isActive ? lane.color : 'rgba(0, 0, 0, 0.5)';
      this._roundRect(ctx, lx + 2, keyTop + keyH - 6, lWidth - 4, 4, 2, true, false);

      // --- KEY LABELS & NOTATION ---
      const centerX = lx + lWidth / 2;

      // 1. Top Target Cue Dot
      ctx.fillStyle = isActive ? '#ffffff' : lane.color;
      ctx.beginPath();
      ctx.arc(centerX, keyTop + 14, 4, 0, Math.PI * 2);
      ctx.fill();

      // 2. Large Bold Chord Name
      ctx.fillStyle = isActive ? '#000000' : '#ffffff';
      ctx.font = 'bold 20px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lane.chord, centerX, keyTop + keyH * 0.25);

      // 3. Gesture Badge with Finger Count & Emoji
      const badgeY = keyTop + keyH * 0.50;
      const badgeW = lWidth - 18;
      const badgeH = 26;

      ctx.fillStyle = isActive ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.55)';
      this._roundRect(ctx, centerX - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, 6, true, false);

      ctx.strokeStyle = isActive ? 'rgba(255, 255, 255, 0.6)' : lane.color;
      ctx.lineWidth = 1;
      this._roundRect(ctx, centerX - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, 6, false, true);

      ctx.fillStyle = isActive ? '#000000' : lane.color;
      ctx.font = 'bold 12.5px Outfit, sans-serif';
      ctx.fillText(`${lane.emoji} ${lane.fingerCount} JARI`, centerX, badgeY);

      // 4. Subtitle / Harmonic Role
      ctx.fillStyle = isActive ? 'rgba(0, 0, 0, 0.75)' : 'rgba(255, 255, 255, 0.75)';
      ctx.font = '600 11px Outfit, sans-serif';
      ctx.fillText(lane.name, centerX, keyTop + keyH * 0.72);

      // 5. Keyboard Key Hint
      ctx.fillStyle = isActive ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.5)';
      ctx.font = '600 10.5px monospace';
      ctx.fillText(`Key: ${lane.keyHint}`, centerX, keyTop + keyH * 0.88);

      ctx.restore();
    }

    // Dynamic Speed HUD Badge on Highway
    if (this.speedMultiplier && this.speedMultiplier > 1.02) {
      ctx.save();
      const badgeText = `⚡ SPEED ${this.speedMultiplier.toFixed(1)}x`;
      ctx.font = '900 11px Orbitron, sans-serif';
      const textW = ctx.measureText(badgeText).width;
      const bx = w - textW - 20;
      const by = 16;
      ctx.fillStyle = 'rgba(10, 5, 25, 0.75)';
      this._roundRect(ctx, bx - 8, by - 12, textW + 16, 20, 10, true, false);
      ctx.strokeStyle = this.speedMultiplier >= 1.8 ? '#ff2d75' : (this.speedMultiplier >= 1.4 ? '#ffd700' : '#00f7ff');
      ctx.lineWidth = 1;
      this._roundRect(ctx, bx - 8, by - 12, textW + 16, 20, 10, false, true);
      ctx.fillStyle = this.speedMultiplier >= 1.8 ? '#ff2d75' : (this.speedMultiplier >= 1.4 ? '#ffd700' : '#00f7ff');
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, bx, by);
      ctx.restore();
    }

    ctx.restore();
  }

  _renderParticles(ctx) {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  _renderFloatingToasts(ctx) {
    for (let i = 0; i < this.floatingToasts.length; i++) {
      const t = this.floatingToasts[i];
      ctx.save();
      ctx.globalAlpha = Math.max(0, t.alpha);
      ctx.translate(t.x, t.y);
      ctx.scale(t.scale, t.scale);

      ctx.font = '900 16px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const toastColor = t.rating === 'PERFECT' ? '#ffd700' : t.rating === 'GREAT' ? '#00f7ff' : t.rating.includes('WILDCARD') ? '#ffd700' : t.rating.includes('NYAWA') ? '#00ffaa' : t.rating.includes('MISS') ? '#ff3b3b' : '#00ffaa';

      // Crisp contrast outline (Zero GPU blur stall!)
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.lineWidth = 3;
      const text = t.rating.endsWith('!') || t.rating.endsWith('✨') ? t.rating : `${t.rating}!`;
      ctx.strokeText(text, 0, -8);
      ctx.fillStyle = toastColor;
      ctx.fillText(text, 0, -8);

      if (t.points > 0) {
        ctx.font = 'bold 11px Orbitron, sans-serif';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.lineWidth = 2.5;
        ctx.strokeText(`+${t.points} PTS`, 0, 10);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`+${t.points} PTS`, 0, 10);
      }

      ctx.restore();
    }
  }

  _roundRect(ctx, x, y, width, height, radius, fill = true, stroke = false) {
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

export const nadimuTilesEngine = new NadimuTilesEngine();
