// main.js - Main Application Orchestrator for Gesture Synth

import './style.css';
import { audioManager } from './audio/AudioManager.js';
import { chordEngine } from './audio/ChordEngine.js';
import { chordMappingService } from './services/ChordMappingService.js';
import { cameraService } from './services/CameraService.js';
import { handTrackingService } from './services/HandTrackingService.js';
import { gestureRecognitionService } from './services/GestureRecognitionService.js';
import { scoreManager } from './services/ScoreManager.js';
import { levelManager, LEVELS } from './services/LevelManager.js';
import { settingsManager } from './services/SettingsManager.js';
import { adaptiveDifficulty } from './services/AdaptiveDifficulty.js';
import { gameEngine, GAME_STATES, GAME_MODES } from './game/GameEngine.js';
import { rhythmEngine } from './services/RhythmEngine.js';
import { virtualBackgroundService } from './services/VirtualBackgroundService.js';
import { ParticleSystem } from './ui/ParticleSystem.js';
import { WaveformVisualizer } from './ui/WaveformVisualizer.js';
import { HandVisualizer } from './ui/HandVisualizer.js';
import { jingleBellsService, JINGLE_BELLS_NOTES, PIANO_KEYS } from './services/JingleBellsService.js';

class App {
  constructor() {
    this.appEl = document.getElementById('app');
    this.bgCanvas = document.getElementById('bg-canvas');
    this.particleSystem = null;
    this.waveformVisualizer = null;

    // Viewport Mode
    this.isFullscreen = settingsManager.settings.viewportMode === 'fullscreen';

    // Tracking state
    this.isTrackingRunning = false;
    this.lastDetectedFingers = 0;
    this.stabilityProgress = 0;

    // Calibration state
    this.calibStepIndex = 0;
    this.calibSteps = [
      { id: 'left', title: 'Show your left hand', check: (g) => g.leftFingers > 0 },
      { id: 'right', title: 'Show your right hand', check: (g) => g.rightFingers > 0 },
      { id: 'open', title: 'Open your hand (5 fingers)', check: (g) => g.totalFingers === 5 },
      { id: 'fist', title: 'Close your hand (Fist - 0 fingers)', check: (g) => g.hasHand && g.totalFingers === 0 },
      { id: 'one', title: 'Try 1 finger (Index)', check: (g) => g.totalFingers === 1 },
      { id: 'two', title: 'Try 2 fingers (Peace)', check: (g) => g.totalFingers === 2 },
      { id: 'both', title: 'Try both hands (6+ fingers)', check: (g) => g.totalFingers >= 6 },
    ];

    this.init();
  }

  async init() {
    // 1. Start background particles
    if (this.bgCanvas) {
      this.particleSystem = new ParticleSystem(this.bgCanvas);
      this.particleSystem.start();
    }

    // 2. Wire game engine callbacks
    this._bindGameEngine();

    // 3. Preload HandLandmarker model in background
    handTrackingService.loadModel().catch(err => {
      console.warn('Initial model load deferred:', err);
    });

    // 4. Setup Global Keyboard Shortcuts for Testing (Keys 0-9 & - for 10)
    window.addEventListener('keydown', (e) => {
      let count = null;
      if (e.key >= '0' && e.key <= '9') count = parseInt(e.key, 10);
      else if (e.key === '-' || e.key === '0' && e.shiftKey) count = 10;

      if (count !== null) {
        this.triggerVirtualGesture(count);
      }
    });

    // 5. Initial Render
    this.render();
  }

  _bindGameEngine() {
    gameEngine.onStateChange = (state, payload) => {
      this.render();
    };

    gameEngine.onRhythmFrame = (frameData) => {
      this._updateRhythmUI(frameData);
    };

    gameEngine.onRhythmBeat = (beatData) => {
      this._onRhythmBeatPulse(beatData);
    };

    gameEngine.onChordEvaluated = (data) => {
      if (data.mode === 'FREE_SYNTH') {
        const nameEl = document.getElementById('synth-chord-name');
        const voicingEl = document.getElementById('synth-chord-voicing');
        const chordInfo = chordEngine.getChordInfo(data.chord);
        if (nameEl) nameEl.innerText = data.chord;
        if (voicingEl && chordInfo) voicingEl.innerText = chordInfo.displayNotes;
      } else {
        this._showHitFeedback(data);
      }
      if (this.particleSystem) this.particleSystem.triggerPulse();
    };

    // Gesture stability ring callback
    gestureRecognitionService.onStabilityProgress = (prog) => {
      this.stabilityProgress = prog;
      this._drawStabilityRing(prog);
    };

    // Gesture confirmation callback
    gestureRecognitionService.onGestureConfirmed = (gestureEvent) => {
      gameEngine.handleGestureConfirmed(gestureEvent);
    };
  }

  triggerVirtualGesture(fingerCount) {
    const shape = fingerCount === 0 ? 'FIST' : fingerCount === 5 ? 'OPEN_PALM' : 'OTHER';
    const gestureEvent = {
      hasHand: true,
      totalFingers: fingerCount,
      leftFingers: fingerCount > 5 ? 5 : fingerCount,
      rightFingers: fingerCount > 5 ? fingerCount - 5 : 0,
      gestureType: shape,
      timestamp: performance.now(),
      activeFingersPerHand: [],
    };

    // If on calibration screen
    if (gameEngine.currentState === GAME_STATES.CALIBRATION) {
      this._checkCalibrationStep(gestureEvent);
    } else {
      gameEngine.handleGestureConfirmed(gestureEvent);
    }
  }

  // ----------------------------------------------------
  // RENDER DISPATCHER
  // ----------------------------------------------------
  render() {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    this.appEl.innerHTML = `
      <button class="viewport-toggle-btn" id="btn-toggle-viewport">
        ${this.isFullscreen ? '📱 Phone Frame' : '🖥️ Fullscreen'}
      </button>

      <div class="phone-shell ${this.isFullscreen ? 'fullscreen-mode' : ''}">
        <div class="phone-status-bar">
          <span>${timeStr}</span>
          <div class="notch-pill"></div>
          <span>5G ⚡</span>
        </div>

        <div class="screen-container" id="screen-viewport">
          ${this._getScreenTemplate()}
        </div>
      </div>
    `;

    // Rebind Viewport Toggle Button
    const toggleBtn = document.getElementById('btn-toggle-viewport');
    if (toggleBtn) {
      toggleBtn.onclick = () => {
        this.isFullscreen = !this.isFullscreen;
        settingsManager.update('viewportMode', this.isFullscreen ? 'fullscreen' : 'mobile-frame');
        this.render();
      };
    }

    // Attach view-specific hooks
    this._afterRender();
  }

  _getScreenTemplate() {
    switch (gameEngine.currentState) {
      case GAME_STATES.HOME:
        return this._templateHome();
      case GAME_STATES.LEVEL_SELECT:
        return this._templateLevels();
      case GAME_STATES.CALIBRATION:
        return this._templateCalibration();
      case GAME_STATES.HOW_TO_PLAY:
        return this._templateHowToPlay();
      case GAME_STATES.SETTINGS:
        return this._templateSettings();
      case GAME_STATES.FREE_SYNTH:
        return this._templateFreeSynth();
      case GAME_STATES.GAMEPLAY_PHASE:
        return this._templateGameplayPhase();
      case GAME_STATES.RESULT_PHASE:
        return this._templateResultPhase();
      case GAME_STATES.JINGLE_BELLS:
        return this._templateJingleBells();
      default:
        return this._templateHome();
    }
  }

  _clearAutoAdvance() {
    if (this._autoAdvanceTimer) {
      clearInterval(this._autoAdvanceTimer);
      this._autoAdvanceTimer = null;
    }
  }

  _afterRender() {
    const state = gameEngine.currentState;

    if (state === GAME_STATES.HOME) {
      this._clearAutoAdvance();
      this._setupHomeWaveform();
      this._stopCameraAndTracking();
    } else if (state === GAME_STATES.FREE_SYNTH) {
      this._clearAutoAdvance();
      this._setupSynthWaveform();
      this._setupCameraAndTracking();
    } else if (state === GAME_STATES.CALIBRATION || state === GAME_STATES.GAMEPLAY_PHASE) {
      this._clearAutoAdvance();
      this._setupCameraAndTracking();
    } else if (state === GAME_STATES.JINGLE_BELLS) {
      this._clearAutoAdvance();
      this._setupCameraAndTracking();
      this._setupJingleBellsListeners();
    } else if (state === GAME_STATES.RESULT_PHASE) {
      this._clearAutoAdvance();
      this._stopCameraAndTracking();

      // If passed (score >= 70%) and not finale: auto-advance countdown to next level
      const summary = scoreManager.getSummary();
      if (summary.scorePct >= 70 && gameEngine.currentMode === GAME_MODES.CLASSIC && gameEngine.currentLevel < 8) {
        let countdown = 3;
        const nextBtn = document.getElementById('btn-result-next');
        const nextLvl = gameEngine.currentLevel + 1;
        if (nextBtn) {
          nextBtn.innerHTML = `<span>▶</span> LANJUT LV ${nextLvl} (${countdown}s)`;
        }
        this._autoAdvanceTimer = setInterval(() => {
          countdown--;
          if (nextBtn) {
            nextBtn.innerHTML = `<span>▶</span> LANJUT LV ${nextLvl} (${countdown}s)`;
          }
          if (countdown <= 0) {
            this._clearAutoAdvance();
            gameEngine.startRound(GAME_MODES.CLASSIC, nextLvl);
          }
        }, 1000);
      }
    } else {
      this._clearAutoAdvance();
      this._stopCameraAndTracking();
    }
  }

  _templateCameraOverlay() {
    return `
      <div class="camera-permission-prompt" id="camera-prompt-overlay" style="${cameraService.isStreaming ? 'display:none;' : ''}">
        <div class="camera-prompt-icon">📷</div>
        <div class="camera-prompt-title">KAMERA BELUM AKTIF</div>
        <div class="camera-prompt-desc" id="camera-prompt-desc">
          ${cameraService.errorMessage || 'Klik tombol di bawah untuk mengizinkan akses webcam / kamera smartphone.'}
        </div>
        <button class="btn-primary" id="btn-activate-camera" style="margin-top:6px;padding:8px 18px;font-size:12px;">
          ▶ AKTIFKAN KAMERA
        </button>
      </div>
    `;
  }

  // ----------------------------------------------------
  // TEMPLATES
  // ----------------------------------------------------

  _templateHome() {
    return `
      <div class="home-screen">
        <div>
          <div class="logo-badge">✦ Interactive Motion Synthesizer ✦</div>
          <h1 class="game-title">GESTURE SYNTH</h1>
          <p class="game-tagline">"Move Your Hands. Make Music."</p>

          <div class="visualizer-container">
            <canvas id="home-waveform-canvas"></canvas>
          </div>

          <div class="stats-row">
            <div class="stat-card">
              <span class="stat-label">Best Score</span>
              <span class="stat-value">${scoreManager.bestScore.toLocaleString()}%</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">Max Combo</span>
              <span class="stat-value">x${scoreManager.bestCombo}</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">Highest Lv</span>
              <span class="stat-value">Lv ${scoreManager.highestLevel}</span>
            </div>
          </div>
        </div>

        <div class="mode-cards-grid">
          <button class="mode-btn classic" id="btn-home-play">
            <div class="mode-btn-left">
              <span class="mode-btn-title">▶ CLASSIC CAMPAIGN</span>
              <span class="mode-btn-desc">8 Levels • Indonesian Pop Phrases • Event Progression</span>
            </div>
            <span style="font-size:16px;">⭐</span>
          </button>

          <button class="mode-btn time-attack" id="btn-home-timeattack">
            <div class="mode-btn-left">
              <span class="mode-btn-title">⚡ TIME ATTACK</span>
              <span class="mode-btn-desc">High BPM • Tight Timing • Rapid Harmonic Sprint</span>
            </div>
            <span style="font-size:16px;">⏱️</span>
          </button>

          <button class="mode-btn endless" id="btn-home-endless">
            <div class="mode-btn-left">
              <span class="mode-btn-title">♾️ ENDLESS GROOVE</span>
              <span class="mode-btn-desc">Non-Stop Pop Following • 3 Lives • Ramping BPM</span>
            </div>
            <span style="font-size:16px;">🔥</span>
          </button>

          <button class="mode-btn free-synth" id="btn-home-free">
            <div class="mode-btn-left">
              <span class="mode-btn-title">🎹 FREE SYNTH STUDIO</span>
              <span class="mode-btn-desc">Open Jam • Direct Chord Sounds • Audio Presets</span>
            </div>
            <span style="font-size:16px;">🎵</span>
          </button>

          <button class="mode-btn jingle-bells" id="btn-home-jingle">
            <div class="mode-btn-left">
              <span class="mode-btn-title">🔔 JINGLE BELLS PIANO</span>
              <span class="mode-btn-desc">Tutorial & Lagu • Petunjuk Not & Gesture • Partitur Asli</span>
            </div>
            <span style="font-size:18px;">🎄</span>
          </button>
        </div>

        <div class="home-util-grid">
          <button class="btn-secondary" id="btn-home-levels" style="padding:10px 8px;font-size:11px;">
            <span>🎚️</span> CAMPAIGN LEVELS
          </button>
          <button class="btn-secondary" id="btn-home-calibration" style="padding:10px 8px;font-size:11px;">
            <span>🎯</span> CALIBRATE HAND
          </button>
          <button class="btn-secondary" id="btn-home-how" style="padding:10px 8px;font-size:11px;">
            <span>📖</span> HOW TO PLAY
          </button>
          <button class="btn-secondary" id="btn-home-settings" style="padding:10px 8px;font-size:11px;">
            <span>⚙️</span> SETTINGS
          </button>
        </div>
      </div>
    `;
  }

  _templateLevels() {
    return `
      <div class="subpage-screen">
        <div class="subpage-header">
          <button class="btn-icon-back" id="btn-back-home">‹</button>
          <h2 class="subpage-title">CAMPAIGN LEVELS</h2>
        </div>

        <div class="levels-grid">
          ${LEVELS.map(lvl => {
            const isUnlocked = lvl.level <= scoreManager.highestLevel;
            return `
              <div class="level-card ${isUnlocked ? '' : 'locked'}" data-level="${lvl.level}">
                <div class="level-info">
                  <span class="level-title">Lv ${lvl.level}. ${lvl.title}</span>
                  <span class="level-meta">${lvl.subtitle} • ${lvl.bpm} BPM • ${lvl.chordCount} Chords • ${lvl.difficultyLabel || 'RHYTHM'}</span>
                </div>
                <div>
                  ${isUnlocked ? '<span style="color:var(--cyan);font-weight:800;">START ▶</span>' : '<span>🔒</span>'}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  _templateHowToPlay() {
    const mappings = chordMappingService.getAllMappings();
    return `
      <div class="subpage-screen">
        <div class="subpage-header">
          <button class="btn-icon-back" id="btn-back-home">‹</button>
          <h2 class="subpage-title">HOW TO PLAY</h2>
        </div>

        <p style="font-size:12px;color:var(--text-muted);text-align:center;">
          Tap any card below to hear its harmonic chord!
        </p>

        <div class="cards-grid">
          ${mappings.map(m => `
            <div class="how-card" data-chord="${m.chord}">
              <span class="how-emoji">${m.emoji}</span>
              <span class="how-chord">${m.chord}</span>
              <span class="how-fingers">${m.label}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  _templateCalibration() {
    const currentStep = this.calibSteps[this.calibStepIndex] || this.calibSteps[0];
    return `
      <div class="calibration-screen">
        <div class="subpage-header">
          <button class="btn-icon-back" id="btn-back-home">‹</button>
          <h2 class="subpage-title">HAND CALIBRATION</h2>
        </div>

        <div class="calib-instructions">
          <div class="calib-step-title" id="calib-step-title">"${currentStep.title}"</div>
          <div class="calib-step-desc">Position your hand inside the camera frame. Hold steady for recognition.</div>
        </div>

        <div class="camera-viewport">
          <video id="camera-video" autoplay playsinline muted></video>
          <canvas id="camera-canvas"></canvas>
          <canvas id="tracking-canvas"></canvas>
          <div class="camera-guide-frame"></div>
          <div class="camera-guidance-pill" id="calib-guidance-pill">SHOW YOUR HAND</div>
          ${this._templateCameraOverlay()}
        </div>

        <div class="calib-steps-list">
          ${this.calibSteps.map((step, idx) => `
            <div class="calib-step-item ${idx === this.calibStepIndex ? 'active' : idx < this.calibStepIndex ? 'done' : ''}" id="calib-item-${idx}">
              <span>${idx + 1}. ${step.title}</span>
              <span>${idx < this.calibStepIndex ? '✔' : idx === this.calibStepIndex ? '●' : '○'}</span>
            </div>
          `).join('')}
        </div>

        ${this._templateVirtualControls()}

        <button class="btn-primary" id="btn-calib-finish" style="margin-top:6px;">
          SKIP TO CAMPAIGN ▶
        </button>
      </div>
    `;
  }

  _templateGameplayPhase() {
    return `
      <div class="gameplay-screen">
        <div class="gameplay-hud-top">
          <div class="hud-pill" id="hud-level-pill">
            <span>LV ${gameEngine.currentLevel} • ${rhythmEngine.bpm} BPM</span>
          </div>
          <div class="hud-pill" style="border-color:var(--cyan);background:rgba(0,247,255,0.08);">
            <span class="hud-score" id="game-score-display">0%</span>
          </div>
          <div class="hud-pill combo-pill" id="game-combo-pill">
            <span>x0 COMBO</span>
          </div>
        </div>

        <div class="rhythm-highway-container" id="rhythm-highway">
          <div class="rhythm-next-preview" id="rhythm-next-preview">
            <span class="next-tag">NEXT</span>
            <span class="next-content" id="next-chord-content">Loading...</span>
          </div>

          <div class="rhythm-notes-track" id="rhythm-notes-track"></div>

          <div class="rhythm-hit-zone" id="rhythm-hit-zone">
            <div class="hit-zone-pulse-ring" id="hit-zone-pulse"></div>
            <div class="hit-zone-target-badge">
              <span class="hit-target-chord" id="hit-target-chord">GET READY</span>
              <span class="hit-target-gesture" id="hit-target-gesture">🎵 4-Beat Intro</span>
            </div>
            <div class="hit-player-badge" id="hit-player-badge">
              <span class="player-input-label">LIVE INPUT:</span>
              <span class="player-input-val" id="player-input-val">--</span>
            </div>
            <div class="hit-zone-line">
              <div class="hit-marker-left"></div>
              <div class="hit-marker-center">HIT ZONE</div>
              <div class="hit-marker-right"></div>
            </div>
          </div>

          <div class="count-in-overlay" id="count-in-overlay">
            <span class="count-in-number" id="count-in-number">READY</span>
          </div>
        </div>

        <div class="hit-feedback-overlay" id="hit-feedback-overlay">PERFECT!</div>

        <div class="camera-viewport">
          <video id="camera-video" autoplay playsinline muted></video>
          <canvas id="camera-canvas"></canvas>
          <canvas id="tracking-canvas"></canvas>
          <div class="camera-guide-frame"></div>
          <div class="camera-guidance-pill" id="game-guidance-pill">SHOW YOUR HAND ON BEAT</div>
          ${this._templateCameraOverlay()}
        </div>

        <div class="detection-bar">
          <div class="detection-info">
            <div class="stability-indicator">
              <canvas class="stability-canvas" id="stability-ring-canvas" width="32" height="32"></canvas>
            </div>
            <div class="detected-text-col">
              <span class="detected-title">DETECTED GESTURE</span>
              <span class="detected-fingers" id="detected-gesture-text">0 Fingers</span>
            </div>
          </div>
          <div style="font-size:11px;color:var(--cyan);font-family:var(--font-display);" id="fps-display">
            30 FPS
          </div>
        </div>

        ${this._templateVirtualControls()}
      </div>
    `;
  }

  _templateFreeSynth() {
    return `
      <div class="free-synth-screen">
        <div class="synth-header">
          <button class="btn-icon-back" id="btn-back-home">‹</button>
          <h2 class="subpage-title">FREE SYNTHESIZER</h2>
          <select id="synth-preset-select">
            <option value="Acoustic Piano" ${settingsManager.settings.soundPreset === 'Acoustic Piano' ? 'selected' : ''}>🎹 Acoustic Piano (Tone.js)</option>
            <option value="Acoustic Guitar" ${settingsManager.settings.soundPreset === 'Acoustic Guitar' ? 'selected' : ''}>🎸 Acoustic Guitar (Tone.js)</option>
            <option value="Nylon Guitar" ${settingsManager.settings.soundPreset === 'Nylon Guitar' ? 'selected' : ''}>🎼 Nylon Guitar (Tone.js)</option>
            <option value="Dreamy Piano" ${settingsManager.settings.soundPreset === 'Dreamy Piano' ? 'selected' : ''}>✨ Dreamy Piano</option>
            <option value="Warm Synth" ${settingsManager.settings.soundPreset === 'Warm Synth' ? 'selected' : ''}>🎛️ Warm Synth</option>
            <option value="Soft Electronic" ${settingsManager.settings.soundPreset === 'Soft Electronic' ? 'selected' : ''}>⚡ Soft Electronic</option>
            <option value="Ambient" ${settingsManager.settings.soundPreset === 'Ambient' ? 'selected' : ''}>🌌 Ambient</option>
          </select>
        </div>

        <div class="synth-display-card">
          <span style="font-size:10px;letter-spacing:2px;color:var(--text-muted);">ACTIVE CHORD</span>
          <div class="synth-active-chord" id="synth-chord-name">C</div>
          <div class="synth-voicing-notes" id="synth-chord-voicing">C4 - E4 - G4 - C5</div>
          <div class="visualizer-container" style="height:44px;margin-bottom:0;">
            <canvas id="synth-waveform-canvas"></canvas>
          </div>
        </div>

        <div class="camera-viewport">
          <video id="camera-video" autoplay playsinline muted></video>
          <canvas id="camera-canvas"></canvas>
          <canvas id="tracking-canvas"></canvas>
          <div class="camera-guide-frame"></div>
          <div class="camera-guidance-pill" id="free-guidance-pill">SHOW ANY GESTURE</div>
          ${this._templateCameraOverlay()}
        </div>

        ${this._templateVirtualControls()}
      </div>
    `;
  }

  _templateJingleBells() {
    const curNote = jingleBellsService.getCurrentNote();
    const curIdx = jingleBellsService.currentIndex;
    const isDemo = jingleBellsService.mode === 'DEMO';
    const isTempo = jingleBellsService.mode === 'TEMPO';
    const isGuide = jingleBellsService.mode === 'GUIDE';

    // 4 Systems (Lines 1 to 4) - Matching sheet music in Image 1
    const systems = [
      { id: 1, measures: [1, 2, 3, 4], label: 'Line 1 (Jin-gle bells)' },
      { id: 2, measures: [5, 6, 7, 8], label: 'Line 2 (Oh, what fun it is...)' },
      { id: 3, measures: [9, 10, 11, 12], label: 'Line 3 (Jin-gle bells)' },
      { id: 4, measures: [13, 14, 15, 16], label: 'Line 4 (One-horse open sleigh!)' },
    ];

    const systemsHtml = systems.map(sys => {
      const measuresHtml = sys.measures.map(mNum => {
        const mNotes = JINGLE_BELLS_NOTES.filter(n => n.measure === mNum);
        const mChord = mNotes[0]?.chord || 'C';

        const notesHtml = mNotes.map(n => {
          const isActive = n.index === curIdx;
          const isDone = n.index < curIdx;
          const isHollow = n.duration >= 2;
          const isWhole = n.duration >= 4;

          return `
            <div class="score-note-item pitch-${n.note} ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}" data-index="${n.index}" title="${n.note} (${n.solfege}) - ${n.fingerCount} Jari">
              ${isActive ? '<span class="active-pointer">▼</span>' : ''}
              <span class="note-top-cue">${n.note} • ${n.fingerCount}F</span>
              <div class="note-glyph-box">
                ${n.note === 'C4' ? '<div class="ledger-line"></div>' : ''}
                <div class="notehead-circle ${isHollow ? 'notehead-hollow' : ''}">
                  <div class="note-stem ${isWhole ? 'note-stem-none' : ''}"></div>
                </div>
              </div>
              <span class="note-lyric-cue">${n.lyric}</span>
            </div>
          `;
        }).join('');

        return `
          <div class="score-measure" data-measure="${mNum}">
            <span class="measure-chord-badge">${mChord}</span>
            ${notesHtml}
          </div>
        `;
      }).join('');

      return `
        <div class="score-system" data-system="${sys.id}">
          <div class="system-meta">
            <span>BAR ${sys.measures[0]} - ${sys.measures[sys.measures.length - 1]}</span>
            <span>${sys.label}</span>
          </div>
          <div class="system-staff-wrapper">
            <div class="staff-lines-bg">
              <div class="staff-line"></div>
              <div class="staff-line"></div>
              <div class="staff-line"></div>
              <div class="staff-line"></div>
              <div class="staff-line"></div>
            </div>
            <div class="staff-clef-box">
              <span class="treble-clef">𝄞</span>
              ${sys.id === 1 ? '<div class="time-sig"><span>4</span><span>4</span></div>' : ''}
            </div>
            <div class="system-measures">
              ${measuresHtml}
            </div>
          </div>
        </div>
      `;
    }).join('');

    const whiteKeys = PIANO_KEYS.filter(k => !k.isBlack);
    const blackKeys = PIANO_KEYS.filter(k => k.isBlack);

    const whiteKeysHtml = whiteKeys.map(k => {
      const isTarget = curNote && curNote.note === k.note;
      return `
        <div class="piano-white-key ${isTarget ? 'target-key' : ''}" data-note="${k.note}">
          <span class="key-note-label">${k.label}</span>
          ${k.fingerCount ? `<span class="key-finger-badge">${k.emoji} ${k.fingerCount}</span>` : ''}
        </div>
      `;
    }).join('');

    const blackKeysHtml = blackKeys.map(k => {
      const noteClass = `bkey-${k.note.replace('#', 's')}`;
      return `
        <div class="piano-black-key ${noteClass}" data-note="${k.note}"></div>
      `;
    }).join('');

    return `
      <div class="jingle-bells-screen">
        <div class="jingle-header">
          <button class="btn-icon-back" id="btn-back-home">‹</button>
          <div class="jingle-header-center">
            <div class="jingle-title">
              <span>🔔</span> JINGLE BELLS PIANO
            </div>
            <span class="jingle-subtitle">Petunjuk Notasi Piano • Partitur C Major • 48 Not</span>
          </div>
          <div class="jingle-mode-pills">
            <button class="mode-pill ${isGuide ? 'active' : ''}" id="btn-jingle-mode-guide">🎓 BELAJAR</button>
            <button class="mode-pill ${isTempo ? 'active' : ''}" id="btn-jingle-mode-tempo">⏱️ TEMPO</button>
            <button class="mode-pill ${isDemo ? 'active' : ''}" id="btn-jingle-demo">${isDemo ? '⏹️ STOP' : '▶️ DEMO'}</button>
          </div>
        </div>

        <div class="jingle-hud-card">
          <div class="jingle-hud-top-row">
            <div class="hud-target-block">
              <span class="hud-kicker">🎯 PETUNJUK SEKARANG</span>
              <div class="hud-target-main">
                <span class="hud-note-badge" id="jingle-cur-note">${curNote.note}</span>
                <span class="hud-solfege" id="jingle-cur-solfege">(${curNote.solfege})</span>
                <span class="hud-lyric" id="jingle-cur-lyric">"${curNote.lyric}"</span>
              </div>
            </div>

            <div class="hud-gesture-block">
              <span class="hud-kicker">GESTURE TANGAN</span>
              <div class="hud-gesture-pill" id="jingle-cur-gesture">
                <span class="hud-emoji">${curNote.emoji}</span>
                <span class="hud-gesture-name">${curNote.fingerCount} Jari</span>
              </div>
            </div>

            <div class="hud-piano-block">
              <span class="hud-kicker">TUTS PIANO</span>
              <div class="hud-piano-pill" id="jingle-cur-key">
                <span>🎹 Tuts ${curNote.note}</span>
              </div>
            </div>
          </div>

          <div class="jingle-feedback-strip" id="jingle-feedback-strip">
            <div class="jingle-live-status">
              <span class="live-dot waiting" id="jingle-live-dot"></span>
              <span class="live-text" id="jingle-live-text">Kamera: Tunjukkan ${curNote.fingerCount} Jari ${curNote.emoji}</span>
            </div>
            <div class="jingle-progress-text" id="jingle-progress-text">
              Not ${curIdx + 1} / 48 (Bar ${curNote.measure})
            </div>
          </div>

          <div class="jingle-progress-bar">
            <div class="jingle-progress-fill" id="jingle-progress-fill" style="width: ${Math.round(((curIdx) / 48) * 100)}%;"></div>
          </div>
        </div>

        <div class="jingle-score-card">
          <div class="score-card-header">
            <span class="score-title">🎼 PARTITUR JINGLE BELLS (C MAJOR • 4/4)</span>
            <button class="btn-score-reset" id="btn-jingle-reset">↺ Ulang dari Awal</button>
          </div>
          <div class="jingle-score-container" id="jingle-score-container">
            ${systemsHtml}
          </div>
        </div>

        <div class="jingle-piano-card">
          <div class="piano-card-header">
            <span>🎹 VIRTUAL PIANO (Sentuh / Klik Tuts Emas)</span>
            <span class="piano-hint-text">1F=C • 2F=D • 3F=E • 4F=F • 5F=G</span>
          </div>
          <div class="jingle-piano-keyboard" id="jingle-piano-keyboard">
            ${whiteKeysHtml}
            ${blackKeysHtml}
          </div>
        </div>

        <div class="jingle-camera-row">
          <div class="camera-viewport jingle-camera-viewport">
            <video id="camera-video" autoplay playsinline muted></video>
            <canvas id="camera-canvas"></canvas>
            <canvas id="tracking-canvas"></canvas>
            <div class="camera-guide-frame"></div>
            <div class="camera-guidance-pill" id="jingle-guidance-pill">
              TUNJUKKAN ${curNote.fingerCount} JARI UNTUK ${curNote.note} ${curNote.emoji}
            </div>
            ${this._templateCameraOverlay()}
          </div>

          <div class="jingle-quick-buttons">
            <button class="jingle-fbtn ${curNote.fingerCount === 1 ? 'active' : ''}" data-fingers="1" data-note="C4">
              <span class="jf-emoji">☝️</span>
              <span class="jf-label">1: C4</span>
            </button>
            <button class="jingle-fbtn ${curNote.fingerCount === 2 ? 'active' : ''}" data-fingers="2" data-note="D4">
              <span class="jf-emoji">✌️</span>
              <span class="jf-label">2: D4</span>
            </button>
            <button class="jingle-fbtn ${curNote.fingerCount === 3 ? 'active' : ''}" data-fingers="3" data-note="E4">
              <span class="jf-emoji">🤟</span>
              <span class="jf-label">3: E4</span>
            </button>
            <button class="jingle-fbtn ${curNote.fingerCount === 4 ? 'active' : ''}" data-fingers="4" data-note="F4">
              <span class="jf-emoji">🖐️</span>
              <span class="jf-label">4: F4</span>
            </button>
            <button class="jingle-fbtn ${curNote.fingerCount === 5 ? 'active' : ''}" data-fingers="5" data-note="G4">
              <span class="jf-emoji">🖐️</span>
              <span class="jf-label">5: G4</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  _templateResultPhase() {
    const summary = scoreManager.getSummary();
    const starStr = '⭐'.repeat(summary.stars) + '☆'.repeat(5 - summary.stars);
    const isEndless = summary.mode === 'ENDLESS';
    const isGrandFinale = summary.isGrandFinale;
    const isPassed = summary.scorePct >= 70;
    const campaignGrand = summary.campaignGrand || scoreManager.getCampaignGrandSummary();

    // 1. GRAND FINALE EVENT REWARD SCREEN (LEVEL 8 COMPLETE)
    if (isGrandFinale) {
      return `
        <div class="result-screen">
          <div class="result-header">
            <div class="logo-badge" style="border-color:gold;color:gold;background:rgba(255,215,0,0.15);">
              🏆 EVENT GRAND FINALE 🏆
            </div>
            <h2 class="game-title" style="font-size:24px;background:linear-gradient(135deg, #fff, gold, #ff8c00);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">
              EVENT COMPLETE!
            </h2>
            <div class="star-rating-label" style="color:gold;font-size:20px;margin-top:2px;">
              ${campaignGrand.prizeBadge} ${campaignGrand.prizeTitle}
            </div>
            <p style="font-size:12px;color:var(--text-muted);max-width:320px;margin:4px auto 0;">
              ${campaignGrand.prizeDesc}
            </p>
          </div>

          <div class="result-card" style="border:2px solid gold;box-shadow:0 0 35px rgba(255,215,0,0.35);background:linear-gradient(135deg, rgba(28,14,56,0.95), rgba(20,10,40,0.98));">
            <div class="result-score-block">
              <span class="result-score-title" style="color:gold;letter-spacing:1.5px;">TOTAL SKOR SELURUH LEVEL (1 - 8)</span>
              <div class="result-score-val" style="color:gold;text-shadow:0 0 30px rgba(255,215,0,0.9);font-size:46px;">
                ${campaignGrand.grandScorePct}%
              </div>
            </div>

            <!-- Level 1..8 Breakdown Matrix -->
            <div style="width:100%;background:rgba(255,255,255,0.06);border-radius:12px;padding:10px;margin:6px 0;">
              <div style="font-size:11px;font-family:var(--font-display);color:var(--cyan);letter-spacing:1px;margin-bottom:8px;text-align:center;">
                REKAP SKOR PER LEVEL:
              </div>
              <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;font-size:11px;text-align:center;">
                ${[1,2,3,4,5,6,7,8].map(lvl => {
                  const sc = scoreManager.campaignScores[lvl] !== undefined ? `${scoreManager.campaignScores[lvl]}%` : '--';
                  return `
                    <div style="background:rgba(0,247,255,0.08);padding:5px 2px;border-radius:8px;border:1px solid rgba(0,247,255,0.25);">
                      <div style="color:var(--text-muted);font-size:9.5px;font-weight:700;">LV ${lvl}</div>
                      <div style="font-weight:900;color:#fff;font-family:var(--font-display);">${sc}</div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Prize Claim Certificate Box -->
            <div style="width:100%;border:2px dashed gold;background:rgba(255,215,0,0.12);border-radius:14px;padding:12px;text-align:center;">
              <div style="font-family:var(--font-display);font-size:12px;font-weight:900;color:gold;letter-spacing:1px;">
                🎁 KELAYAKAN HADIAH EVENT:
              </div>
              <div style="font-size:16px;font-weight:900;color:#fff;margin:4px 0;letter-spacing:0.5px;">
                ${campaignGrand.prizeTitle}
              </div>
              <div style="font-size:11.5px;color:var(--cyan);font-weight:700;">
                👉 Tunjukkan layar ini ke panitia booth untuk klaim hadiah!
              </div>
            </div>
          </div>

          <div class="result-buttons-container">
            <button class="btn-primary" id="btn-grand-reset" style="width:100%;background:linear-gradient(135deg, gold 0%, #ff8c00 100%);color:#050210;box-shadow:0 0 25px rgba(255,215,0,0.6);font-size:13px;font-weight:900;">
              <span>🎉</span> PESERTA BERIKUTNYA (RESTART EVENT)
            </button>
            <button class="btn-secondary" id="btn-result-home" style="width:100%;">
              <span>🏠</span> KEMBALI KE HOME
            </button>
          </div>
        </div>
      `;
    }

    // 2. STANDARD LEVEL RESULT (LEVEL 1..7)
    return `
      <div class="result-screen">
        <div class="result-header">
          <div class="logo-badge">✦ ${isEndless ? 'ENDLESS GROOVE FINISHED' : `LEVEL ${gameEngine.currentLevel} COMPLETE`} ✦</div>
          <h2 class="game-title" style="font-size:26px;">${isEndless ? 'ENDLESS RUN' : `LEVEL ${gameEngine.currentLevel}`}</h2>
          <div class="stars-row" id="result-stars">${starStr}</div>
          <div class="star-rating-label" id="result-star-label">
            ${summary.starLabel}
          </div>

          <!-- 70% Pass Status Pill -->
          ${!isEndless ? `
            <div style="margin-top:6px;">
              ${isPassed ? `
                <div style="border:1.5px solid var(--green);background:rgba(0,255,170,0.18);color:var(--green);border-radius:var(--radius-pill);padding:5px 16px;font-size:12px;font-family:var(--font-display);font-weight:800;display:inline-flex;align-items:center;gap:6px;box-shadow:0 0 12px rgba(0,255,170,0.3);">
                  <span>✔ LULUS (Skor ${summary.scorePct}% ≥ 70%)</span>
                </div>
              ` : `
                <div style="border:1.5px solid var(--pink);background:rgba(255,0,127,0.18);color:var(--pink);border-radius:var(--radius-pill);padding:5px 16px;font-size:12px;font-family:var(--font-display);font-weight:800;display:inline-flex;align-items:center;gap:6px;box-shadow:0 0 12px rgba(255,0,127,0.3);">
                  <span>⚠️ BELUM LULUS (Minimal Skor 70%)</span>
                </div>
              `}
            </div>
          ` : ''}

          <button class="btn-voice-replay" id="btn-replay-voice" style="margin-top:8px;">
            🔊 "${summary.voiceFeedback}"
          </button>
        </div>

        <div class="result-card">
          <div class="result-score-block">
            <span class="result-score-title">SCORE</span>
            <div class="result-score-val">${summary.scorePct}%</div>
          </div>

          <div class="result-accuracy-block">
            <span class="result-accuracy-label">ACCURACY</span>
            <span class="result-accuracy-val">${summary.chordAccuracy}%</span>
          </div>

          <div class="stats-grid">
            <div class="stat-box">
              <span class="stat-label">PERFECT</span>
              <span class="stat-value" style="color:var(--cyan);font-weight:900;">${summary.perfectCount}</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">GREAT</span>
              <span class="stat-value" style="color:var(--green);font-weight:900;">${summary.greatCount}</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">GOOD</span>
              <span class="stat-value" style="color:var(--gold);font-weight:900;">${summary.goodCount}</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">BAD/LATE</span>
              <span class="stat-value" style="color:#ff8c00;font-weight:900;">${summary.badCount}</span>
            </div>
            <div class="stat-box" style="grid-column: span 2;">
              <span class="stat-label">MAX COMBO</span>
              <span class="stat-value" style="color:var(--pink);font-size:18px;font-weight:900;">x${summary.maxCombo}</span>
            </div>
          </div>

          <div class="adaptive-badge">
            ${isPassed ? `Hebat! Skor memenuhi kriteria kelulusan (≥ 70%).` : `Coba lagi untuk mencapai skor minimal 70% dan membuka level selanjutnya.`}
          </div>
        </div>

        <div class="result-buttons-container">
          ${isPassed ? `
            <div class="result-btn-row">
              <button class="btn-secondary" id="btn-result-retry">
                <span>↺</span> RETRY
              </button>
              <button class="btn-primary" id="btn-result-next">
                <span>▶</span> ${isEndless ? 'PLAY AGAIN' : `LANJUT LV ${Math.min(8, gameEngine.currentLevel + 1)}`}
              </button>
            </div>
          ` : `
            <button class="btn-primary" id="btn-result-retry" style="width:100%;box-shadow:0 0 25px var(--pink-glow);background:linear-gradient(135deg, var(--pink) 0%, #a020f0 100%);color:#fff;">
              <span>↺</span> COBA LAGI LEVEL ${gameEngine.currentLevel} (TARGET 70%)
            </button>
          `}
          <button class="btn-secondary" id="btn-result-home" style="width:100%;">
            <span>🏠</span> HOME
          </button>
        </div>
      </div>
    `;
  }

  _templateSettings() {
    const s = settingsManager.settings;
    return `
      <div class="subpage-screen">
        <div class="subpage-header">
          <button class="btn-icon-back" id="btn-back-home">‹</button>
          <h2 class="subpage-title">SETTINGS</h2>
        </div>

        <div class="settings-list">
          <div class="setting-group">
            <span style="font-family:var(--font-display);font-size:12px;color:var(--cyan);letter-spacing:1px;">AUDIO ENGINE</span>
            
            <div class="setting-row">
              <div>
                <div class="setting-label">Master Volume</div>
                <div class="setting-desc">Overall app volume</div>
              </div>
              <input type="range" min="0" max="1" step="0.05" value="${s.masterVolume}" id="set-master-vol" />
            </div>

            <div class="setting-row">
              <div>
                <div class="setting-label">Soft Piano Volume</div>
                <div class="setting-desc">Harmonic definition layer</div>
              </div>
              <input type="range" min="0" max="1" step="0.05" value="${s.chordVolume}" id="set-chord-vol" />
            </div>

            <div class="setting-row">
              <div>
                <div class="setting-label">Synth Pad Volume</div>
                <div class="setting-desc">Dreamy atmospheric layer</div>
              </div>
              <input type="range" min="0" max="1" step="0.05" value="${s.padVolume}" id="set-pad-vol" />
            </div>

            <div class="setting-row">
              <div>
                <div class="setting-label">Reverb Amount</div>
                <div class="setting-desc">Convolver room decay</div>
              </div>
              <input type="range" min="0" max="1" step="0.05" value="${s.reverbAmount}" id="set-reverb-vol" />
            </div>

            <div class="setting-row">
              <div>
                <div class="setting-label">Sound Preset</div>
                <div class="setting-desc">Harmonic character</div>
              </div>
              <select id="set-sound-preset">
                <option value="Acoustic Piano" ${s.soundPreset === 'Acoustic Piano' ? 'selected' : ''}>🎹 Acoustic Piano (Tone.js)</option>
                <option value="Acoustic Guitar" ${s.soundPreset === 'Acoustic Guitar' ? 'selected' : ''}>🎸 Acoustic Guitar (Tone.js)</option>
                <option value="Nylon Guitar" ${s.soundPreset === 'Nylon Guitar' ? 'selected' : ''}>🎼 Nylon Guitar (Tone.js)</option>
                <option value="Dreamy Piano" ${s.soundPreset === 'Dreamy Piano' ? 'selected' : ''}>✨ Dreamy Piano</option>
                <option value="Warm Synth" ${s.soundPreset === 'Warm Synth' ? 'selected' : ''}>🎛️ Warm Synth</option>
                <option value="Soft Electronic" ${s.soundPreset === 'Soft Electronic' ? 'selected' : ''}>⚡ Soft Electronic</option>
                <option value="Ambient" ${s.soundPreset === 'Ambient' ? 'selected' : ''}>🌌 Ambient</option>
              </select>
            </div>
          </div>

          <div class="setting-group">
            <span style="font-family:var(--font-display);font-size:12px;color:var(--pink);letter-spacing:1px;">CONTROLS & HAPTICS</span>

            <div class="setting-row">
              <div>
                <div class="setting-label">Haptic Vibration</div>
                <div class="setting-desc">Rhythm feedback pulses</div>
              </div>
              <label class="switch">
                <input type="checkbox" id="set-haptic" ${s.hapticEnabled ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
            </div>

            <div class="setting-row">
              <div>
                <div class="setting-label">Mirror Camera</div>
                <div class="setting-desc">Natural selfie reflection</div>
              </div>
              <label class="switch">
                <input type="checkbox" id="set-mirror" ${s.cameraMirrored ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
            </div>

            <div class="setting-row">
              <div>
                <div class="setting-label">Virtual Background (Zoom Mode)</div>
                <div class="setting-desc">Replace booth room with Cyber AI art</div>
              </div>
              <label class="switch">
                <input type="checkbox" id="set-virtual-bg" ${virtualBackgroundService.isEnabled ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
            </div>

            <div class="setting-row">
              <div>
                <div class="setting-label">Virtual Fallback Bar</div>
                <div class="setting-desc">Show on-screen finger buttons</div>
              </div>
              <label class="switch">
                <input type="checkbox" id="set-virtual" ${s.showVirtualControls ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  _templateVirtualControls() {
    if (!settingsManager.settings.showVirtualControls) return '';
    const mappings = chordMappingService.getAllMappings();
    return `
      <div class="virtual-controls-bar">
        ${mappings.map(m => `
          <button class="virtual-btn" data-fingers="${m.fingerCount}" title="${m.label} -> ${m.chord}">
            <span class="v-count">${m.fingerCount}</span>
            <span class="v-chord">${m.chord}</span>
          </button>
        `).join('')}
      </div>
    `;
  }

  // ----------------------------------------------------
  // CAMERA & TRACKING INTEGRATION
  // ----------------------------------------------------
  async _setupCameraAndTracking() {
    const videoEl = document.getElementById('camera-video');
    const cameraCanvasEl = document.getElementById('camera-canvas');
    const canvasEl = document.getElementById('tracking-canvas');
    if (!videoEl || !canvasEl) return;

    if (cameraService.isMirrored) {
      videoEl.classList.add('mirrored');
    } else {
      videoEl.classList.remove('mirrored');
    }

    try {
      await cameraService.init(videoEl);
      await handTrackingService.loadModel();
      await virtualBackgroundService.loadModel();

      // Compute display dimensions matching camera viewport container
      const vpEl = videoEl.parentElement;
      const rect = vpEl ? vpEl.getBoundingClientRect() : null;
      const viewportWidth = (rect && rect.width > 0) ? Math.round(rect.width) : (videoEl.clientWidth || 360);
      const viewportHeight = (rect && rect.height > 0) ? Math.round(rect.height) : (videoEl.clientHeight || 450);

      canvasEl.width = viewportWidth;
      canvasEl.height = viewportHeight;

      if (cameraCanvasEl) {
        cameraCanvasEl.width = viewportWidth;
        cameraCanvasEl.height = viewportHeight;
      }

      const ctx = canvasEl.getContext('2d');

      handTrackingService.startTracking(videoEl, (result) => {
        // 0. Render Virtual Background (Zoom Style with solid person & cyber wallpaper)
        if (cameraCanvasEl) {
          virtualBackgroundService.updateSegmentation(videoEl, result.timestamp || performance.now());
          virtualBackgroundService.render(cameraCanvasEl, videoEl, cameraService.isMirrored);
        }

        // 1. Process landmarks in gesture recognizer with frame timestamps
        const gestureResult = gestureRecognitionService.process(
          result.landmarks,
          result.handedness,
          false,
          result
        );

        // 2. Draw skeleton
        handTrackingService.drawLandmarks(
          ctx,
          canvasEl.width,
          canvasEl.height,
          result.landmarks,
          result.handedness,
          cameraService.isMirrored,
          gestureResult.activeFingersPerHand
        );

        // 3. Update UI displays
        this._updateTrackingHUD(gestureResult, result.fps, result);

        // 4. Live camera evaluation for real-time rhythm challenge (low-latency)
        if (gameEngine.currentState === GAME_STATES.GAMEPLAY_PHASE) {
          gameEngine.handleLiveTracking(gestureResult);
        }

        // 5. If in Calibration
        if (gameEngine.currentState === GAME_STATES.CALIBRATION) {
          this._checkCalibrationStep(gestureResult);
        }
      });

      this.isTrackingRunning = true;
      const promptOverlay = document.getElementById('camera-prompt-overlay');
      if (promptOverlay) promptOverlay.style.display = 'none';
    } catch (err) {
      console.warn('Camera/Tracking init note:', err.message);
      const promptOverlay = document.getElementById('camera-prompt-overlay');
      const promptDesc = document.getElementById('camera-prompt-desc');
      if (promptOverlay) promptOverlay.style.display = 'flex';
      if (promptDesc && cameraService.errorMessage) {
        promptDesc.innerText = cameraService.errorMessage;
      }
      const pill = document.querySelector('.camera-guidance-pill');
      if (pill) {
        pill.innerText = 'KLIK AKTIFKAN KAMERA ATAU TOMBOL DI BAWAH';
      }
    }
  }

  _stopCameraAndTracking() {
    handTrackingService.stopTracking();
    cameraService.stop();
    this.isTrackingRunning = false;
  }

  _updateTrackingHUD(gestureResult, fps, trackingResult) {
    const guidancePill = document.querySelector('.camera-guidance-pill');
    if (guidancePill) {
      guidancePill.innerText = gestureResult.guidance;
    }

    const chordDetail = chordMappingService.getMappingDetails(gestureResult.totalFingers);
    const chordStr = chordDetail ? ` → ${chordDetail.chord} (${chordDetail.name})` : '';

    const detectedText = document.getElementById('detected-gesture-text');
    if (detectedText) {
      detectedText.innerText = `${gestureResult.totalFingers} Fingers${chordStr}`;
    }

    // Update Live Input in Hit Zone
    const playerInputVal = document.getElementById('player-input-val');
    if (playerInputVal) {
      if (gestureResult.hasHand && chordDetail) {
        playerInputVal.innerText = `${chordDetail.emoji} ${chordDetail.chord} (${gestureResult.totalFingers}F)`;
      } else {
        playerInputVal.innerText = '--';
      }
    }

    const fpsEl = document.getElementById('fps-display');
    if (fpsEl && fps > 0) {
      fpsEl.innerText = `${fps} FPS`;
    }

    // Update Jingle Bells live status indicator
    if (gameEngine.currentState === GAME_STATES.JINGLE_BELLS) {
      const liveDot = document.getElementById('jingle-live-dot');
      const liveText = document.getElementById('jingle-live-text');
      const curNote = jingleBellsService.getCurrentNote();
      if (liveDot && liveText && curNote) {
        if (!gestureResult.hasHand) {
          liveDot.className = 'live-dot';
          liveText.innerText = 'Kamera: Tunjukkan tangan di depan kamera 📷';
        } else if (gestureResult.totalFingers === curNote.fingerCount) {
          liveDot.className = 'live-dot matched';
          liveText.innerText = `Terdeteksi: ${gestureResult.totalFingers} Jari (COCOK! ✔)`;
        } else {
          liveDot.className = 'live-dot waiting';
          liveText.innerText = `Terdeteksi: ${gestureResult.totalFingers} Jari (Butuh: ${curNote.fingerCount} Jari ${curNote.emoji})`;
        }
      }
    }

    // --- Real-time Latency Debug Profiler ---
    const dbgFps = document.getElementById('dbg-fps');
    if (dbgFps && fps > 0) dbgFps.innerText = `${fps}`;

    const prof = gestureResult.profiling || {};
    const latestProfile = rhythmEngine.latestProfile || {};

    const dbgCamMp = document.getElementById('dbg-cam-mp');
    if (dbgCamMp) {
      const camMp = prof.cameraToMediaPipeMs || trackingResult?.inferenceMs || latestProfile.cameraToMediaPipeMs;
      if (camMp !== undefined) dbgCamMp.innerText = `${camMp} ms`;
    }

    const dbgMpFinger = document.getElementById('dbg-mp-finger');
    if (dbgMpFinger) {
      const mpF = prof.mediaPipeToFingerMs || latestProfile.mediaPipeToFingerMs || 1.2;
      dbgMpFinger.innerText = `${mpF} ms`;
    }

    const dbgCalc = document.getElementById('dbg-calc');
    if (dbgCalc) {
      const fG = prof.fingerToGestureMs || gestureResult.gestureCalcMs || latestProfile.fingerToGestureMs || 1.0;
      dbgCalc.innerText = `${fG} ms`;
    }

    const dbgGestGame = document.getElementById('dbg-gest-game');
    if (dbgGestGame) {
      const gG = latestProfile.gestureToGameplayMs !== undefined ? latestProfile.gestureToGameplayMs : 1.5;
      dbgGestGame.innerText = `${gG} ms`;
    }

    const dbgAudio = document.getElementById('dbg-audio');
    if (dbgAudio) {
      const audioMs = latestProfile.gameplayToAudioMs || audioManager.lastAudioTriggerMs || 1.2;
      dbgAudio.innerText = `${audioMs} ms`;
    }

    const dbgTrans = document.getElementById('dbg-transition');
    if (dbgTrans) {
      const totalPipe = latestProfile.totalPipelineMs || gestureResult.transitionLatencyMs || 50;
      dbgTrans.innerText = `${totalPipe} ms`;
    }
  }

  _drawStabilityRing(prog) {
    const canvas = document.getElementById('stability-ring-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    HandVisualizer.drawStabilityRing(ctx, 16, 16, 12, prog, prog >= 1.0);
  }

  _checkCalibrationStep(gesture) {
    const step = this.calibSteps[this.calibStepIndex];
    if (!step) return;

    if (step.check(gesture)) {
      audioManager.playGoodHit();
      const itemEl = document.getElementById(`calib-item-${this.calibStepIndex}`);
      if (itemEl) {
        itemEl.classList.remove('active');
        itemEl.classList.add('done');
      }

      this.calibStepIndex++;
      if (this.calibStepIndex >= this.calibSteps.length) {
        // Calibration finished!
        const titleEl = document.getElementById('calib-step-title');
        if (titleEl) titleEl.innerText = 'CALIBRATION COMPLETE! ⭐';
        audioManager.playLevelComplete();
        setTimeout(() => {
          gameEngine.startRound(GAME_MODES.CLASSIC, 1);
        }, 1200);
      } else {
        const nextStep = this.calibSteps[this.calibStepIndex];
        const titleEl = document.getElementById('calib-step-title');
        if (titleEl) titleEl.innerText = `"${nextStep.title}"`;
        const nextItem = document.getElementById(`calib-item-${this.calibStepIndex}`);
        if (nextItem) nextItem.classList.add('active');
      }
    }
  }

  // ----------------------------------------------------
  // WAVEFORM VISUALIZERS
  // ----------------------------------------------------
  _setupHomeWaveform() {
    const canvas = document.getElementById('home-waveform-canvas');
    if (!canvas) return;
    if (this.waveformVisualizer) this.waveformVisualizer.stop();
    this.waveformVisualizer = new WaveformVisualizer(canvas, audioManager.analyser);
    this.waveformVisualizer.start();
  }

  _setupSynthWaveform() {
    const canvas = document.getElementById('synth-waveform-canvas');
    if (!canvas) return;
    if (this.synthVisualizer) this.synthVisualizer.stop();
    this.synthVisualizer = new WaveformVisualizer(canvas, audioManager.analyser);
    this.synthVisualizer.start();
  }

  _getCleanGestureGuidance(fingerCount, emoji) {
    switch (fingerCount) {
      case 0: return '✊ Kepalan (0 Jari)';
      case 1: return '☝️ 1 Jari';
      case 2: return '✌️ 2 Jari';
      case 3: return '🤟 3 Jari';
      case 4: return '🖐️ 4 Jari';
      case 5: return '🖐️ 5 Jari (Telapak)';
      case 6: return '🖐️+☝️ 6 Jari';
      case 7: return '🖐️+✌️ 7 Jari';
      case 8: return '🖐️+🤟 8 Jari';
      case 9: return '🖐️+🖐️ 9 Jari';
      case 10: return '🙌 10 Jari';
      default: return `${emoji || '✋'} ${fingerCount} Jari`;
    }
  }

  // ----------------------------------------------------
  // REAL-TIME RHYTHM CHALLENGE UI UPDATERS
  // ----------------------------------------------------
  _updateRhythmUI(frameData) {
    if (!frameData) return;

    // 1. HUD Level / Mode / Lives / BPM
    const levelPill = document.getElementById('hud-level-pill');
    if (levelPill) {
      if (frameData.mode === 'ENDLESS') {
        const hearts = '❤️'.repeat(Math.max(0, frameData.lives !== undefined ? frameData.lives : 3)) + 
                       '🖤'.repeat(Math.max(0, 3 - (frameData.lives !== undefined ? frameData.lives : 3)));
        levelPill.innerHTML = `<span>♾️ STREAK ${frameData.streak || 0} • ${hearts} • ${frameData.bpm} BPM</span>`;
      } else if (frameData.mode === 'TIME_ATTACK') {
        levelPill.innerHTML = `<span>⚡ TIME ATTACK • ${frameData.bpm} BPM</span>`;
      } else {
        levelPill.innerHTML = `<span>LV ${gameEngine.currentLevel} • ${frameData.bpm} BPM</span>`;
      }
    }

    // 2. Count-In Overlay visibility
    const countInOverlay = document.getElementById('count-in-overlay');
    if (countInOverlay) {
      countInOverlay.style.display = frameData.isCountIn ? 'flex' : 'none';
    }

    // 3. Hit Zone Active Target Badges
    const targetChordEl = document.getElementById('hit-target-chord');
    const targetGestureEl = document.getElementById('hit-target-gesture');

    if (frameData.isCountIn) {
      if (targetChordEl) targetChordEl.innerText = 'READY';
      if (targetGestureEl) targetGestureEl.innerText = '🎵 Dengar Beat...';
    } else if (frameData.currentTarget) {
      const cur = frameData.currentTarget;
      if (targetChordEl) {
        if (cur.isEvaluated) {
          const ratingColor = cur.isHit ? 'var(--cyan)' : 'var(--pink)';
          targetChordEl.innerHTML = `${cur.chord} <span style="font-size:15px; color:${ratingColor}; font-weight:800; margin-left:6px;">[${cur.rating || (cur.isHit ? 'HIT' : 'MISS')}]</span>`;
        } else {
          targetChordEl.innerText = cur.chord;
        }
      }
      if (targetGestureEl) {
        // CUKUP PETUNJUK JARI YANG BERSIH, JELAS, DAN INDIKATIF
        targetGestureEl.innerText = this._getCleanGestureGuidance(cur.fingerCount, cur.emoji);
      }
      const playerBadge = document.getElementById('hit-player-badge');
      if (playerBadge) {
        const isMatched = gestureRecognitionService.confirmedFingers === cur.fingerCount ||
          (cur.isPreparedEarly && cur.preparedFingers === cur.fingerCount);
        playerBadge.classList.toggle('matched', isMatched);
      }
    } else {
      if (targetChordEl) targetChordEl.innerText = 'FINISH!';
      if (targetGestureEl) targetGestureEl.innerText = '✨ Menghitung Penilaian...';
    }

    // 4. Next Chord Preview Pill with Live Transition Countdown (Terletak di atas track)
    const nextContentEl = document.getElementById('next-chord-content');
    if (nextContentEl) {
      if (frameData.nextTarget) {
        const nxt = frameData.nextTarget;
        const timeToNextSec = Math.max(0, (nxt.startTimeMs - frameData.currentTimeMs) / 1000);
        const nextGuidance = this._getCleanGestureGuidance(nxt.fingerCount, nxt.emoji);
        if (timeToNextSec <= 2.0) {
          nextContentEl.innerHTML = `<span style="color: #00f7ff; font-weight: 800;">👉 ${nxt.chord} • ${nextGuidance} • in ${timeToNextSec.toFixed(1)}s</span>`;
        } else {
          nextContentEl.innerText = `${nxt.chord} • ${nextGuidance} • in ${timeToNextSec.toFixed(1)}s`;
        }
      } else if (frameData.currentTarget) {
        nextContentEl.innerText = 'Chord Terakhir 🏁';
      } else {
        nextContentEl.innerText = 'Selesai 🎉';
      }
    }

    // 5. Moving Note Chips on Track
    const trackEl = document.getElementById('rhythm-notes-track');
    if (trackEl && frameData.visibleTargets) {
      const travelDist = 68; // Distance in px to travel down towards Hit Zone line
      const chipsHtml = frameData.visibleTargets.map(t => {
        const topPx = Math.max(-10, Math.min(78, Math.round(t.hitZoneRatio * travelDist)));
        const opacity = t.isEvaluated ? 0.2 : Math.min(1, 0.4 + t.hitZoneRatio * 0.6);
        const statusClass = t.isHit ? 'chip-hit' : (t.rating === 'MISS' ? 'chip-miss' : '');
        return `
          <div class="rhythm-note-chip ${statusClass}" style="top: ${topPx}px; opacity: ${opacity};">
            <span class="chip-chord">${t.chord}</span>
            <span class="chip-gesture">${t.emoji} ${t.fingerCount}F</span>
          </div>
        `;
      }).join('');
      trackEl.innerHTML = chipsHtml;
    }

    // 6. Score & Combo HUD
    const summary = scoreManager.getSummary();
    const scoreDisplay = document.getElementById('game-score-display');
    if (scoreDisplay) scoreDisplay.innerText = `${summary.scorePct}%`;

    const comboPill = document.getElementById('game-combo-pill');
    if (comboPill) comboPill.innerText = `x${summary.combo} COMBO`;
  }

  _onRhythmBeatPulse(beatData) {
    if (!beatData) return;

    // Pulse hit zone glow ring
    const pulseRing = document.getElementById('hit-zone-pulse');
    if (pulseRing) {
      pulseRing.classList.remove('pulse');
      void pulseRing.offsetWidth;
      pulseRing.classList.add('pulse');
    }

    // Count-in overlay text update
    if (beatData.isCountIn) {
      const countInText = document.getElementById('count-in-number');
      if (countInText) {
        const text = beatData.countInNumber > 0 ? `${beatData.countInNumber}` : 'GO!';
        countInText.innerText = text;
        countInText.style.animation = 'none';
        void countInText.offsetWidth;
        countInText.style.animation = 'countInPop 0.38s cubic-bezier(0.16, 1, 0.3, 1)';
      }
    } else {
      const countInOverlay = document.getElementById('count-in-overlay');
      if (countInOverlay) countInOverlay.style.display = 'none';
    }

    // Gentle particle pulse on rhythm beat
    if (this.particleSystem) {
      this.particleSystem.triggerPulse(0.3);
    }
  }

  _showHitFeedback(data) {
    const overlay = document.getElementById('hit-feedback-overlay');
    if (!overlay) return;

    const rating = data.rating || 'MISS';
    overlay.className = `hit-feedback-overlay ${rating.toLowerCase()}`;

    const sign = data.timingDiffMs > 0 ? '+' : '';
    const diffText = (rating !== 'MISS' && Math.abs(data.timingDiffMs) > 0) ? ` (${sign}${data.timingDiffMs}ms)` : '';

    if (rating === 'PERFECT') {
      overlay.innerText = `PERFECT!${diffText}`;
    } else if (rating === 'GREAT') {
      overlay.innerText = `GREAT!${diffText}`;
    } else if (rating === 'GOOD') {
      overlay.innerText = `GOOD!${diffText}`;
    } else if (rating === 'BAD') {
      overlay.innerText = `BAD${diffText}`;
    } else if (rating === 'MISS') {
      overlay.innerText = 'MISS!';
    } else {
      overlay.innerText = rating;
    }

    // Trigger pop animation
    overlay.classList.remove('show');
    void overlay.offsetWidth;
    overlay.classList.add('show');

    // Update Top HUD
    const summary = scoreManager.getSummary();
    const scoreDisplay = document.getElementById('game-score-display');
    if (scoreDisplay) scoreDisplay.innerText = `${summary.scorePct}%`;

    const comboPill = document.getElementById('game-combo-pill');
    if (comboPill) {
      comboPill.innerText = `x${summary.combo} COMBO`;
      if (summary.combo >= 4) {
        comboPill.classList.add('hot-combo');
      } else {
        comboPill.classList.remove('hot-combo');
      }
    }

    clearTimeout(this._hitFeedbackTimeout);
    this._hitFeedbackTimeout = setTimeout(() => {
      overlay.classList.remove('show');
    }, 420);
  }

  // ----------------------------------------------------
  // JINGLE BELLS INTERACTIVE PIANO & SHEET MUSIC LOGIC
  // ----------------------------------------------------
  _setupJingleBellsListeners() {
    jingleBellsService.onNoteChanged = (curNote, idx) => {
      this._updateJingleBellsUI(curNote, idx);
    };
    jingleBellsService.onNoteHit = (note, idx, isUserAction) => {
      this._onJingleNoteHit(note, idx, isUserAction);
    };
    jingleBellsService.onSongFinished = (stats) => {
      this._showJingleCompleteModal(stats);
    };
    jingleBellsService.onTempoBeat = () => {
      if (this.particleSystem) this.particleSystem.triggerPulse(0.25);
    };
    this._updateJingleBellsUI(jingleBellsService.getCurrentNote(), jingleBellsService.currentIndex);
  }

  _updateJingleBellsUI(curNote, idx) {
    if (!curNote) return;

    // 1. HUD elements
    const noteEl = document.getElementById('jingle-cur-note');
    if (noteEl) noteEl.innerText = curNote.note;

    const solfegeEl = document.getElementById('jingle-cur-solfege');
    if (solfegeEl) solfegeEl.innerText = `(${curNote.solfege})`;

    const lyricEl = document.getElementById('jingle-cur-lyric');
    if (lyricEl) lyricEl.innerText = `"${curNote.lyric}"`;

    const gestureEl = document.getElementById('jingle-cur-gesture');
    if (gestureEl) {
      gestureEl.innerHTML = `
        <span class="hud-emoji">${curNote.emoji}</span>
        <span class="hud-gesture-name">${curNote.fingerCount} Jari</span>
      `;
    }

    const keyEl = document.getElementById('jingle-cur-key');
    if (keyEl) keyEl.innerHTML = `<span>🎹 Tuts ${curNote.note}</span>`;

    const progText = document.getElementById('jingle-progress-text');
    if (progText) progText.innerText = `Not ${idx + 1} / 48 (Bar ${curNote.measure})`;

    const progFill = document.getElementById('jingle-progress-fill');
    if (progFill) progFill.style.width = `${Math.round(((idx) / 48) * 100)}%`;

    const guidancePill = document.getElementById('jingle-guidance-pill');
    if (guidancePill) {
      guidancePill.innerText = `TUNJUKKAN ${curNote.fingerCount} JARI UNTUK ${curNote.note} ${curNote.emoji}`;
    }

    const liveText = document.getElementById('jingle-live-text');
    if (liveText && !gestureRecognitionService.confirmedHasHand) {
      liveText.innerText = `Kamera: Tunjukkan ${curNote.fingerCount} Jari ${curNote.emoji}`;
    }

    // 2. Highlight score notes on sheet music
    const scoreNotes = document.querySelectorAll('.score-note-item');
    scoreNotes.forEach(el => {
      const i = parseInt(el.dataset.index, 10);
      const isCur = i === idx;
      const isPast = i < idx;
      el.classList.toggle('active', isCur);
      el.classList.toggle('done', isPast);

      // Manage active pointer
      let pointer = el.querySelector('.active-pointer');
      if (isCur) {
        if (!pointer) {
          const pt = document.createElement('span');
          pt.className = 'active-pointer';
          pt.innerText = '▼';
          el.prepend(pt);
        }
        try {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        } catch (e) {}
      } else if (pointer) {
        pointer.remove();
      }
    });

    // 3. Highlight target piano white key
    const pKeys = document.querySelectorAll('.piano-white-key');
    pKeys.forEach(k => {
      const isTarget = k.dataset.note === curNote.note;
      k.classList.toggle('target-key', isTarget);
    });

    // 4. Quick buttons
    const fbtns = document.querySelectorAll('.jingle-fbtn');
    fbtns.forEach(btn => {
      const f = parseInt(btn.dataset.fingers, 10);
      btn.classList.toggle('active', f === curNote.fingerCount);
    });
  }

  _onJingleNoteHit(note, idx, isUserAction) {
    if (this.particleSystem) {
      this.particleSystem.triggerPulse(0.4);
    }

    // Flash live feedback dot
    const liveDot = document.getElementById('jingle-live-dot');
    if (liveDot) {
      liveDot.className = 'live-dot matched';
      setTimeout(() => {
        if (liveDot) liveDot.className = 'live-dot waiting';
      }, 350);
    }

    // Flash piano key pressed animation
    const targetKey = document.querySelector(`.piano-white-key[data-note="${note.note}"]`);
    if (targetKey) {
      targetKey.classList.add('pressed');
      setTimeout(() => targetKey.classList.remove('pressed'), 180);
    }
  }

  _showJingleCompleteModal(stats) {
    try {
      confetti({
        particleCount: 160,
        spread: 95,
        origin: { y: 0.55 },
      });
    } catch (e) {}

    const existing = document.getElementById('jingle-complete-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.className = 'jingle-complete-overlay';
    modal.id = 'jingle-complete-modal';
    modal.innerHTML = `
      <div class="jingle-complete-card">
        <div style="font-size:42px;animation:noteBounce 0.8s infinite alternate;">🎄🔔✨</div>
        <h3 style="font-family:var(--font-display);color:#ffd700;font-size:22px;letter-spacing:1.5px;text-shadow:0 0 15px rgba(255,215,0,0.6);">
          LAGU SELESAI!
        </h3>
        <p style="font-size:13px;color:var(--text-main);line-height:1.5;">
          Selamat! Kamu berhasil menyelesaikan lagu <strong style="color:#00ffaa;">Jingle Bells</strong> dengan tutorial piano & gesture!
        </p>

        <div style="display:flex;justify-content:space-around;background:rgba(255,255,255,0.06);padding:12px;border-radius:14px;border:1px solid rgba(0,255,170,0.3);margin:6px 0;">
          <div>
            <div style="font-size:10px;color:var(--text-muted);font-weight:700;">TOTAL NOT</div>
            <div style="font-family:var(--font-display);font-size:20px;font-weight:900;color:#00f7ff;">48 / 48</div>
          </div>
          <div>
            <div style="font-size:10px;color:var(--text-muted);font-weight:700;">AKURASI</div>
            <div style="font-family:var(--font-display);font-size:20px;font-weight:900;color:#00ffaa;">100%</div>
          </div>
          <div>
            <div style="font-size:10px;color:var(--text-muted);font-weight:700;">PREDIKAT</div>
            <div style="font-size:17px;">⭐⭐⭐⭐⭐</div>
          </div>
        </div>

        <button class="btn-primary" id="btn-jingle-replay" style="margin-top:4px;width:100%;box-shadow:0 0 25px rgba(0,255,170,0.6);background:linear-gradient(135deg, #00ffaa 0%, #0099ff 100%);color:#050210;">
          <span>↺</span> MAINKAN LAGI
        </button>
        <button class="btn-secondary" id="btn-jingle-home" style="width:100%;">
          <span>🏠</span> KEMBALI KE HOME
        </button>
      </div>
    `;

    document.body.appendChild(modal);
  }
}

// Global delegated click handler
document.addEventListener('click', (e) => {
  // 0. Manual Camera Activation
  if (e.target.closest('#btn-activate-camera')) {
    const videoEl = document.getElementById('camera-video');
    if (videoEl) {
      cameraService.requestCamera(videoEl).then(() => {
        window.app._setupCameraAndTracking();
      }).catch(err => {
        console.warn('Manual camera activate error:', err);
        const promptDesc = document.getElementById('camera-prompt-desc');
        if (promptDesc) {
          promptDesc.innerText = cameraService.errorMessage || 'Izin kamera ditolak. Silakan izinkan kamera di browser Anda.';
        }
      });
    }
  }

  // 1. Home Buttons
  else if (e.target.closest('#btn-home-play')) {
    audioManager.init();
    scoreManager.resetCampaign();
    const tempVideo = document.getElementById('camera-video');
    cameraService.requestCamera(tempVideo).catch(() => {});
    gameEngine.startRound(GAME_MODES.CLASSIC, 1);
  } else if (e.target.closest('#btn-home-timeattack')) {
    audioManager.init();
    const tempVideo = document.getElementById('camera-video');
    cameraService.requestCamera(tempVideo).catch(() => {});
    gameEngine.startRound(GAME_MODES.TIME_ATTACK, 4);
  } else if (e.target.closest('#btn-home-endless')) {
    audioManager.init();
    const tempVideo = document.getElementById('camera-video');
    cameraService.requestCamera(tempVideo).catch(() => {});
    gameEngine.startRound(GAME_MODES.ENDLESS, 1);
  } else if (e.target.closest('#btn-home-levels')) {
    audioManager.init();
    gameEngine.setState(GAME_STATES.LEVEL_SELECT);
  } else if (e.target.closest('#btn-home-free')) {
    audioManager.init();
    const tempVideo = document.getElementById('camera-video');
    cameraService.requestCamera(tempVideo).catch(() => {});
    gameEngine.setState(GAME_STATES.FREE_SYNTH);
  } else if (e.target.closest('#btn-home-calibration')) {
    audioManager.init();
    const tempVideo = document.getElementById('camera-video');
    cameraService.requestCamera(tempVideo).catch(() => {});
    window.app.calibStepIndex = 0;
    gameEngine.setState(GAME_STATES.CALIBRATION);
  } else if (e.target.closest('#btn-home-how')) {
    audioManager.init();
    gameEngine.setState(GAME_STATES.HOW_TO_PLAY);
  } else if (e.target.closest('#btn-home-settings')) {
    audioManager.init();
    gameEngine.setState(GAME_STATES.SETTINGS);
  } else if (e.target.closest('#btn-home-jingle')) {
    audioManager.init();
    audioManager.resume();
    const tempVideo = document.getElementById('camera-video');
    cameraService.requestCamera(tempVideo).catch(() => {});
    jingleBellsService.setMode('GUIDE');
    gameEngine.setState(GAME_STATES.JINGLE_BELLS);
  }

  // 2. Navigation Back
  else if (e.target.closest('#btn-back-home')) {
    jingleBellsService.stop();
    gameEngine.setState(GAME_STATES.HOME);
  }

  // 3. Level Selection
  else if (e.target.closest('.level-card:not(.locked)')) {
    const card = e.target.closest('.level-card');
    const lvl = parseInt(card.dataset.level, 10);
    audioManager.init();
    gameEngine.startRound(GAME_MODES.CLASSIC, lvl);
  }

  // 4. How to play card preview
  else if (e.target.closest('.how-card')) {
    const card = e.target.closest('.how-card');
    const chord = card.dataset.chord;
    chordEngine.play(chord);
  }

  // 5. Calibration Skip
  else if (e.target.closest('#btn-calib-finish')) {
    gameEngine.startRound(GAME_MODES.CLASSIC, 1);
  }

  // 6. Result Screen Actions
  else if (e.target.closest('#btn-result-next')) {
    if (window.app) window.app._clearAutoAdvance();
    if (gameEngine.currentMode === GAME_MODES.ENDLESS) {
      gameEngine.startRound(GAME_MODES.ENDLESS, 1);
    } else if (gameEngine.currentMode === GAME_MODES.TIME_ATTACK) {
      const nextLvl = Math.min(8, gameEngine.currentLevel + 1);
      gameEngine.startRound(GAME_MODES.TIME_ATTACK, nextLvl);
    } else {
      const nextLvl = Math.min(8, gameEngine.currentLevel + 1);
      gameEngine.startRound(GAME_MODES.CLASSIC, nextLvl);
    }
  } else if (e.target.closest('#btn-result-retry')) {
    if (window.app) window.app._clearAutoAdvance();
    gameEngine.startRound(gameEngine.currentMode, gameEngine.currentLevel);
  } else if (e.target.closest('#btn-grand-reset')) {
    if (window.app) window.app._clearAutoAdvance();
    scoreManager.resetCampaign();
    gameEngine.startRound(GAME_MODES.CLASSIC, 1);
  } else if (e.target.closest('#btn-result-free')) {
    if (window.app) window.app._clearAutoAdvance();
    gameEngine.setState(GAME_STATES.FREE_SYNTH);
  } else if (e.target.closest('#btn-result-home')) {
    if (window.app) window.app._clearAutoAdvance();
    gameEngine.setState(GAME_STATES.HOME);
  } else if (e.target.closest('#btn-replay-voice')) {
    const summary = scoreManager.getSummary();
    audioManager.playRatingSFX(summary.stars);
    audioManager.speakAnnouncer(summary.voiceFeedback);
  }

  // 7. Virtual Buttons
  else if (e.target.closest('.virtual-btn')) {
    const btn = e.target.closest('.virtual-btn');
    const fingers = parseInt(btn.dataset.fingers, 10);
    if (window.app) window.app.triggerVirtualGesture(fingers);
  }

  // 8. Jingle Bells Actions & Controls
  else if (e.target.closest('#btn-jingle-mode-guide')) {
    jingleBellsService.setMode('GUIDE');
    if (window.app) window.app.render();
  } else if (e.target.closest('#btn-jingle-mode-tempo')) {
    jingleBellsService.startTempo();
    if (window.app) window.app.render();
  } else if (e.target.closest('#btn-jingle-demo')) {
    if (jingleBellsService.isPlaying && jingleBellsService.mode === 'DEMO') {
      jingleBellsService.stop();
      if (window.app) window.app.render();
    } else {
      jingleBellsService.startDemo();
      const demoBtn = document.getElementById('btn-jingle-demo');
      if (demoBtn) demoBtn.innerText = '⏹️ STOP';
    }
  } else if (e.target.closest('#btn-jingle-reset')) {
    jingleBellsService.reset();
    if (window.app) window.app.render();
  } else if (e.target.closest('.piano-white-key') || e.target.closest('.piano-black-key')) {
    const keyEl = e.target.closest('.piano-white-key') || e.target.closest('.piano-black-key');
    const note = keyEl.dataset.note;
    if (note) {
      audioManager.playPianoNote(note, { duration: 0.8 });
      keyEl.classList.add('pressed');
      setTimeout(() => keyEl.classList.remove('pressed'), 180);
      const cur = jingleBellsService.getCurrentNote();
      if (cur && cur.note === note) {
        jingleBellsService.triggerNote(jingleBellsService.currentIndex, true);
      }
    }
  } else if (e.target.closest('.score-note-item')) {
    const noteEl = e.target.closest('.score-note-item');
    const idx = parseInt(noteEl.dataset.index, 10);
    if (!isNaN(idx)) {
      jingleBellsService.jumpToNote(idx);
    }
  } else if (e.target.closest('.jingle-fbtn')) {
    const fbtn = e.target.closest('.jingle-fbtn');
    const fingers = parseInt(fbtn.dataset.fingers, 10);
    if (!isNaN(fingers)) {
      if (window.app) window.app.triggerVirtualGesture(fingers);
    }
  } else if (e.target.closest('#btn-jingle-replay')) {
    const modal = document.getElementById('jingle-complete-modal');
    if (modal) modal.remove();
    jingleBellsService.reset();
    if (window.app) window.app.render();
  } else if (e.target.closest('#btn-jingle-home')) {
    const modal = document.getElementById('jingle-complete-modal');
    if (modal) modal.remove();
    jingleBellsService.stop();
    gameEngine.setState(GAME_STATES.HOME);
  }

  // 8. Settings change inputs
  const target = e.target;
  if (target.id === 'set-master-vol') {
    settingsManager.update('masterVolume', parseFloat(target.value));
  } else if (target.id === 'set-chord-vol') {
    settingsManager.update('chordVolume', parseFloat(target.value));
  } else if (target.id === 'set-pad-vol') {
    settingsManager.update('padVolume', parseFloat(target.value));
  } else if (target.id === 'set-reverb-vol') {
    settingsManager.update('reverbAmount', parseFloat(target.value));
  } else if (target.id === 'set-sound-preset') {
    settingsManager.update('soundPreset', target.value);
  } else if (target.id === 'set-haptic') {
    settingsManager.update('hapticEnabled', target.checked);
  } else if (target.id === 'set-mirror') {
    settingsManager.update('cameraMirrored', target.checked);
    cameraService.isMirrored = target.checked;
  } else if (target.id === 'set-virtual-bg') {
    virtualBackgroundService.isEnabled = target.checked;
  } else if (target.id === 'set-virtual') {
    settingsManager.update('showVirtualControls', target.checked);
    window.app.render();
  } else if (target.id === 'synth-preset-select') {
    settingsManager.update('soundPreset', target.value);
  }
});

// Settings input listener for live slider response
document.addEventListener('input', (e) => {
  const target = e.target;
  if (target.id === 'set-master-vol') {
    settingsManager.update('masterVolume', parseFloat(target.value));
  } else if (target.id === 'set-chord-vol') {
    settingsManager.update('chordVolume', parseFloat(target.value));
  } else if (target.id === 'set-pad-vol') {
    settingsManager.update('padVolume', parseFloat(target.value));
  } else if (target.id === 'set-reverb-vol') {
    settingsManager.update('reverbAmount', parseFloat(target.value));
  }
});

// Boot app on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
