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
    color: '#14b3d4',
    glowColor: 'rgba(20, 179, 212, 0.45)',
    name: 'C (Do)',
    keyHint: '1 / D',
  },
  {
    lane: 1,
    chord: 'F',
    fingerCount: 2,
    emoji: '✌️',
    color: '#3b82f6',
    glowColor: 'rgba(59, 130, 246, 0.45)',
    name: 'F / Dm',
    keyHint: '2 / F',
  },
  {
    lane: 2,
    chord: 'Em',
    fingerCount: 3,
    emoji: '🤟',
    color: '#fbb040',
    glowColor: 'rgba(251, 176, 64, 0.45)',
    name: 'Em / Am',
    keyHint: '3 / J',
  },
  {
    lane: 3,
    chord: 'G',
    fingerCount: 4,
    emoji: '🖐️',
    color: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.45)',
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

    // Highway Geometry & Elongated Grand Piano Keys
    this.width = 600;
    this.height = 700;
    this.lanesCount = 4;
    this.pianoKeyHeight = 110;
    this.hitLineY = 560;
    this.hitWindowSec = 0.55;

    // Visual Speed
    this.travelTimeSec = 3.2;
    this.speedMultiplier = 1.0;

    // Tile generation & state
    this.tiles = [];
    this.measureDurationSec = 3.076;
    this.cycleDurationSec = 49.23;

    // Particles & Feedback FX
    this.particles = [];
    this.hitEffects = [];
    this.lanePressAnim = [0, 0, 0, 0];

    // High Precision Interpolation
    this._lastAudioTime = 0;
    this._lastPerfTime = 0;
    this._smoothSongTime = 0;

    this._boundOnFrame = this._onFrame.bind(this);
  }

  init(canvas, nadimuService) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.nadimuService = nadimuService;

    this.resize();
    this._generateTileSchedule();
    this._bindEvents();
    this._renderHighway(0);
  }

  setSpeed(multiplier = 1.0) {
    this.speedMultiplier = Math.max(0.6, Math.min(2.0, multiplier));
    this.travelTimeSec = 3.2 / this.speedMultiplier;
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
    this.cycleDurationSec = this.measureDurationSec * NADIMU_MEASURES.length;

    const sweetVoicings = {
      'C': ['C4', 'E4', 'G4', 'C5'],
      'F': ['F4', 'A4', 'C5', 'F5'],
      'Em': ['E4', 'G4', 'B4', 'E5'],
      'Am': ['A4', 'C5', 'E5', 'A5'],
      'Dm': ['D4', 'F4', 'A4', 'D5'],
      'G': ['G4', 'B4', 'D5', 'G5'],
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
          melodyNotes: chordVoicing,
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
    if (this.isRunning) return;
    this.isRunning = true;
    this._lastAudioTime = 0;
    this._lastPerfTime = performance.now();
    this._smoothSongTime = 0;
    this.animFrameId = requestAnimationFrame(this._boundOnFrame);
  }

  stop() {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  reset() {
    this.tiles.forEach(t => {
      t.status = 'PENDING';
      t.hitRating = null;
    });
    this.particles = [];
    this.hitEffects = [];
    this.lanePressAnim = [0, 0, 0, 0];
    this._smoothSongTime = 0;
  }

  seekTime(targetSec) {
    this._smoothSongTime = targetSec;
    this._lastAudioTime = targetSec;
    this._lastPerfTime = performance.now();
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

    this.lanePressAnim[laneIndex] = 1.0;
    const songTime = this.getCurrentSongTime();

    let closestTile = null;
    let minDelta = Infinity;

    for (let i = 0; i < this.tiles.length; i++) {
      const t = this.tiles[i];
      if (t.lane === laneIndex && t.status === 'PENDING') {
        const delta = Math.abs(t.timeSec - songTime);
        if (delta <= this.hitWindowSec && delta < minDelta) {
          minDelta = delta;
          closestTile = t;
        }
      }
    }

    if (!closestTile) {
      if (isManualClick) {
        this.nadimuService.playChordNotes(NADIMU_LANES[laneIndex].chord);
      }
      return null;
    }

    const absDelta = minDelta;
    let rating = 'GOOD';
    let baseScore = 300;

    if (absDelta <= 0.16) {
      rating = 'PERFECT';
      baseScore = 1000;
    } else if (absDelta <= 0.32) {
      rating = 'GREAT';
      baseScore = 600;
    } else {
      rating = 'GOOD';
      baseScore = 300;
    }

    closestTile.status = 'HIT';
    closestTile.hitRating = rating;

    this._spawnHitParticles(laneIndex, rating);
    this._addHitFeedback(laneIndex, rating);

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
    }

    this.nadimuService.evaluatedMeasures.add(closestTile.measureIndex);

    if (this.nadimuService.onChordHit) {
      this.nadimuService.onChordHit({
        tile: closestTile,
        rating,
        measure: NADIMU_MEASURES[closestTile.measureIndex],
        earnedPoints,
        combo: this.nadimuService.combo,
        maxCombo: this.nadimuService.maxCombo,
        score: this.nadimuService.score,
        lives: this.nadimuService.lives,
        isWildcard,
      });
    }

    this.nadimuService.playChordNotes(closestTile.chord);

    return {
      tile: closestTile,
      rating,
      score: earnedPoints,
    };
  }

  getCurrentSongTime() {
    if (!this.nadimuService) return 0;

    if (this.nadimuService.mode === 'PLAY_ALONG' && this.nadimuService.audioEl) {
      const audio = this.nadimuService.audioEl;
      const audioTime = audio.currentTime;
      const now = performance.now();

      if (audio.paused) {
        return Math.max(0, audioTime - this.nadimuService.audioOffsetSec);
      }

      if (audioTime !== this._lastAudioTime) {
        this._lastAudioTime = audioTime;
        this._lastPerfTime = now;
        this._smoothSongTime = audioTime;
      } else {
        const deltaSec = (now - this._lastPerfTime) / 1000;
        if (deltaSec < 0.25) {
          this._smoothSongTime = audioTime + deltaSec;
        } else {
          this._smoothSongTime = audioTime;
        }
      }

      return Math.max(0, this._smoothSongTime - this.nadimuService.audioOffsetSec);
    }

    const ms = (this.nadimuService.currentTempoBeat || 0) * (60 / 78) * 1000;
    return ms / 1000;
  }

  _onFrame(now) {
    if (!this.isRunning) return;

    this.resize();
    const songTime = this.getCurrentSongTime();

    this._updateTiles(songTime);
    this._updateParticles();
    this._renderHighway(songTime);

    this.animFrameId = requestAnimationFrame(this._boundOnFrame);
  }

  _updateTiles(songTime) {
    for (let i = 0; i < this.tiles.length; i++) {
      const tile = this.tiles[i];

      if (this.nadimuService && this.nadimuService.sessionMode === '30S_RANDOM') {
        if (tile.timeSec < this.nadimuService.sessionStartSec - 0.1) {
          if (tile.status === 'PENDING') {
            tile.status = 'MISSED';
          }
          continue;
        }
      }

      if (tile.status === 'PENDING' && songTime > tile.timeSec + this.hitWindowSec) {
        tile.status = 'MISSED';
        if (this.nadimuService) {
          this.nadimuService.missHits++;
          if (!this.nadimuService.isNoFail) {
            this.nadimuService.loseLife('CHORD_MISSED');
          }
          if (this.nadimuService.onLifeLost) {
            this.nadimuService.onLifeLost({
              tile,
              lives: this.nadimuService.lives,
              maxLives: this.nadimuService.maxLives,
              reason: 'CHORD_MISSED',
            });
          }
          this.nadimuService.combo = 0;
        }
        this._addHitFeedback(tile.lane, 'MISS');
      }
    }
  }

  _updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15;
      p.alpha -= p.fade;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.hitEffects.length - 1; i >= 0; i--) {
      const ef = this.hitEffects[i];
      ef.alpha -= 0.04;
      ef.scale += 0.03;
      if (ef.alpha <= 0) {
        this.hitEffects.splice(i, 1);
      }
    }

    for (let l = 0; l < 4; l++) {
      if (this.lanePressAnim[l] > 0) {
        this.lanePressAnim[l] = Math.max(0, this.lanePressAnim[l] - 0.06);
      }
    }
  }

  _spawnHitParticles(laneIndex, rating) {
    const laneWidth = this.width / 4;
    const cx = (laneIndex + 0.5) * laneWidth;
    const cy = this.hitLineY;
    const count = rating === 'PERFECT' ? 24 : rating === 'GREAT' ? 16 : 10;
    const baseColor = NADIMU_LANES[laneIndex].color;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 7 + 2;
      this.particles.push({
        x: cx + (Math.random() - 0.5) * 30,
        y: cy + (Math.random() - 0.5) * 15,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.5,
        radius: Math.random() * 4 + 2,
        color: baseColor,
        alpha: 1.0,
        fade: Math.random() * 0.035 + 0.02,
      });
    }
  }

  _addHitFeedback(laneIndex, rating) {
    const laneWidth = this.width / 4;
    const cx = (laneIndex + 0.5) * laneWidth;
    this.hitEffects.push({
      x: cx,
      y: this.hitLineY - 35,
      rating,
      alpha: 1.0,
      scale: 0.8,
    });
  }

  _renderHighway(songTime) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const laneW = w / 4;
    this.hitLineY = h - this.pianoKeyHeight;

    ctx.clearRect(0, 0, w, h);

    // Highway Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#060a14');
    bgGrad.addColorStop(0.7, '#0b162c');
    bgGrad.addColorStop(1, '#050c1b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Lane Dividers & Glow
    for (let l = 0; l <= 4; l++) {
      const lx = l * laneW;
      ctx.strokeStyle = 'rgba(0, 247, 255, 0.22)';
      ctx.lineWidth = l === 0 || l === 4 ? 2 : 1.2;
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx, h);
      ctx.stroke();
    }

    // Lane Press Backdrops
    for (let l = 0; l < 4; l++) {
      const press = this.lanePressAnim[l];
      if (press > 0) {
        ctx.fillStyle = NADIMU_LANES[l].glowColor;
        ctx.globalAlpha = press * 0.45;
        ctx.fillRect(l * laneW, 0, laneW, this.hitLineY);
        ctx.globalAlpha = 1.0;
      }
    }

    // Render Falling Tiles
    const visibleMinTime = songTime - 0.5;
    const visibleMaxTime = songTime + this.travelTimeSec + 0.3;

    for (let i = 0; i < this.tiles.length; i++) {
      const tile = this.tiles[i];
      if (tile.status === 'HIT') continue;
      if (tile.timeSec < visibleMinTime || tile.timeSec > visibleMaxTime) continue;

      const timeUntilHit = tile.timeSec - songTime;
      const progress = 1.0 - (timeUntilHit / this.travelTimeSec);
      const targetY = progress * this.hitLineY;
      const tileH = Math.max(38, Math.min(75, (tile.durationSec / this.travelTimeSec) * this.hitLineY * 0.35));
      const tileY = targetY - tileH;

      if (tileY + tileH < 0 || tileY > h + 50) continue;

      this._renderSingleTile(ctx, tile, tileY, tileH, laneW);
    }

    // Render Elongated Grand Piano Keys
    this._renderPianoKeys(ctx, w, h, laneW);

    // Render Particles & Feedback
    this._renderParticles(ctx);
    this._renderHitFeedback(ctx);
  }

  _renderSingleTile(ctx, tile, y, height, laneW) {
    const laneConfig = NADIMU_LANES[tile.lane];
    const x = tile.lane * laneW + 5;
    const w = laneW - 10;
    const radius = 10;

    ctx.save();

    // Tile Glow
    ctx.shadowColor = laneConfig.color;
    ctx.shadowBlur = 16;

    // Tile Body Gradient
    const grad = ctx.createLinearGradient(x, y, x + w, y + height);
    grad.addColorStop(0, laneConfig.color);
    grad.addColorStop(0.5, '#ffffff');
    grad.addColorStop(1, laneConfig.color);

    ctx.fillStyle = grad;
    this._roundRect(ctx, x, y, w, height, radius);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner Chord & Gesture Text
    ctx.fillStyle = '#060a14';
    ctx.font = 'bold 13px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${tile.emoji} ${tile.chord}`, x + w / 2, y + height / 2 - 4);

    ctx.font = '600 9.5px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#111827';
    ctx.fillText(tile.lyric ? tile.lyric.slice(0, 18) : `${tile.fingerCount} JARI`, x + w / 2, y + height / 2 + 10);

    ctx.restore();
  }

  _renderPianoKeys(ctx, w, h, laneW) {
    const keyY = this.hitLineY;
    const keyH = this.pianoKeyHeight;

    // Hit Line Bar
    ctx.strokeStyle = '#00f7ff';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(0, 247, 255, 0.8)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, keyY);
    ctx.lineTo(w, keyY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    for (let l = 0; l < 4; l++) {
      const kx = l * laneW + 4;
      const kw = laneW - 8;
      const lane = NADIMU_LANES[l];
      const isPressed = this.lanePressAnim[l] > 0.1;

      // Piano Key Surface
      const keyGrad = ctx.createLinearGradient(kx, keyY, kx, keyY + keyH);
      if (isPressed) {
        keyGrad.addColorStop(0, lane.color);
        keyGrad.addColorStop(1, '#0c1a36');
      } else {
        keyGrad.addColorStop(0, '#101c38');
        keyGrad.addColorStop(0.7, '#0c162c');
        keyGrad.addColorStop(1, '#060a14');
      }

      ctx.fillStyle = keyGrad;
      this._roundRect(ctx, kx, keyY + 4, kw, keyH - 8, 8);
      ctx.fill();

      ctx.strokeStyle = isPressed ? lane.color : 'rgba(0, 247, 255, 0.3)';
      ctx.lineWidth = isPressed ? 2.5 : 1.2;
      ctx.stroke();

      // Key Labels
      ctx.fillStyle = isPressed ? '#ffffff' : lane.color;
      ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${lane.emoji} ${lane.name}`, kx + kw / 2, keyY + 36);

      ctx.font = '700 11px Outfit, sans-serif';
      ctx.fillStyle = '#a6b8db';
      ctx.fillText(`${lane.fingerCount} JARI`, kx + kw / 2, keyY + 58);

      ctx.font = '600 10px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText(`Key: ${lane.keyHint}`, kx + kw / 2, keyY + 78);
    }
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

  _renderHitFeedback(ctx) {
    for (let i = 0; i < this.hitEffects.length; i++) {
      const ef = this.hitEffects[i];
      ctx.save();
      ctx.globalAlpha = Math.max(0, ef.alpha);
      ctx.font = `900 ${Math.round(22 * ef.scale)}px Orbitron, sans-serif`;
      ctx.textAlign = 'center';

      if (ef.rating === 'PERFECT') {
        ctx.fillStyle = '#00ffaa';
        ctx.shadowColor = '#00ffaa';
        ctx.shadowBlur = 14;
        ctx.fillText('✨ PERFECT! ✨', ef.x, ef.y);
      } else if (ef.rating === 'GREAT') {
        ctx.fillStyle = '#00f7ff';
        ctx.shadowColor = '#00f7ff';
        ctx.shadowBlur = 10;
        ctx.fillText('GREAT!', ef.x, ef.y);
      } else if (ef.rating === 'GOOD') {
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 8;
        ctx.fillText('GOOD', ef.x, ef.y);
      } else {
        ctx.fillStyle = '#ff2d75';
        ctx.fillText('MISS', ef.x, ef.y);
      }

      ctx.restore();
    }
  }

  _roundRect(ctx, x, y, width, height, radius) {
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
  }
}

export const nadimuTilesEngine = new NadimuTilesEngine();
