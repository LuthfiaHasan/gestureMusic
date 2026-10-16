// main.js - Main Application Orchestrator for Gesture Synth

import './style.css';
import './ui/styles/motion_sync_game.css';
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
import { komangService, KOMANG_MEASURES, KOMANG_PIANO_KEYS, KOMANG_SEGMENTS } from './services/KomangService.js';
import { komangTilesEngine, KOMANG_LANES } from './services/KomangTilesEngine.js';
import { nadimuService, NADIMU_MEASURES, NADIMU_PIANO_KEYS, NADIMU_SEGMENTS } from './services/NadimuService.js';
import { nadimuTilesEngine, NADIMU_LANES } from './services/NadimuTilesEngine.js';
import { MidiImportScreen } from './ui/screens/MidiImportScreen.js';
import { LeaderboardScreen } from './ui/screens/LeaderboardScreen.js';
import { TrackSelectScreen } from './ui/screens/TrackSelectScreen.js';
import { ClaimScoreScreen } from './ui/screens/ClaimScoreScreen.js';
import { sessionTimerService } from './services/SessionTimerService.js';
import { onlineLeaderboardService } from './services/OnlineLeaderboardService.js';
import { competitionLeaderboardService, COMPETITION_TRACKS } from './services/CompetitionLeaderboardService.js';
import { qrCodeService } from './services/QrCodeService.js';
import { JatuhSukaGame, TaragakPulangGame } from './services/MotionSyncGameEngine.js';

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
    // 1. Setup background particles (disabled on Home screen as requested)
    if (this.bgCanvas) {
      this.particleSystem = new ParticleSystem(this.bgCanvas);
      if (gameEngine.currentState !== GAME_STATES.HOME) {
        this.particleSystem.start();
      } else {
        this.bgCanvas.style.display = 'none';
      }
    }

    // 2. Wire game engine callbacks
    this._bindGameEngine();

    // 3. Preload HandLandmarker model in background
    handTrackingService.loadModel().catch(err => {
      console.warn('Initial model load deferred:', err);
    });

    // 4. Setup Global Keyboard Shortcuts for Testing & Pause (Keys 0-9, -, Esc/P)
    window.addEventListener('keydown', (e) => {
      if (['input', 'textarea'].includes(document.activeElement?.tagName?.toLowerCase())) return;

      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        if (gameEngine.currentState === GAME_STATES.GAMEPLAY_PHASE) {
          e.preventDefault();
          gameEngine.togglePause();
          return;
        }
      }

      let count = null;
      if (e.key >= '0' && e.key <= '9') count = parseInt(e.key, 10);
      else if (e.key === '-' || (e.key === '0' && e.shiftKey)) count = 10;

      if (count !== null) {
        this.triggerVirtualGesture(count);
      }
    });

    // 5. Session Timer & Rest Reminders
    sessionTimerService.onTick = (timeStr) => {
      const el = document.getElementById('session-timer-display');
      if (el) el.textContent = `⏱️ ${timeStr}`;
    };
    sessionTimerService.onRestReminder = (minutes) => {
      this._showRestReminderToast(minutes);
    };

    // 6. Real-time Remote Leaderboard Submissions from Smartphone QR Scan!
    competitionLeaderboardService.onNewScoreSubmitted = (entry) => {
      this._showNewSubmissionToast(entry);
      if (gameEngine.currentState === GAME_STATES.LEADERBOARD) {
        this.render();
      }
    };

    // 7. Hash Routing for Mobile QR Scan (#claim) or Navigation
    window.addEventListener('hashchange', () => {
      this.render();
    });

    // 8. Initial Render
    this.render();
  }

  _showNewSubmissionToast(entry) {
    audioManager.init();
    audioManager.playLevelComplete();
    try {
      confetti({
        particleCount: 160,
        spread: 90,
        origin: { y: 0.6 }
      });
    } catch (e) { }

    setTimeout(() => {
      audioManager.speakAnnouncer(`Selamat kepada ${entry.playerName}! Skor berhasil masuk ke papan peringkat!`);
    }, 350);

    let toast = document.getElementById('lead-submission-toast');
    if (toast) toast.remove();

    toast = document.createElement('div');
    toast.id = 'lead-submission-toast';
    toast.className = 'lead-submission-toast';
    toast.innerHTML = `
      <div class="lead-toast-icon">🎉</div>
      <div>
        <div class="lead-toast-title">SKOR BARU DITERIMA DARI HP!</div>
        <div class="lead-toast-body">
          <strong>${entry.playerName}</strong> (${competitionLeaderboardService.maskPhoneNumber(entry.phone)})<br/>
          Lagu: <em>${entry.songTitle}</em> • <strong>${entry.score.toLocaleString()} PTS</strong>
        </div>
      </div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      if (toast) toast.remove();
    }, 7000);
  }

  showInstrumentToast(preset) {
    let toast = document.getElementById('instrument-random-toast');
    if (toast) toast.remove();

    toast = document.createElement('div');
    toast.id = 'instrument-random-toast';
    toast.className = 'instrument-toast';
    toast.innerHTML = `
      <span class="instrument-toast-emoji">${preset.emoji || '🎵'}</span>
      <div class="instrument-toast-info">
        <span class="instrument-toast-tag">🎲 INSTRUMEN ACAK:</span>
        <span class="instrument-toast-name">${preset.name}</span>
      </div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      if (toast) {
        toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        toast.style.opacity = '0';
        toast.style.transform = 'translate(-50%, -15px)';
        setTimeout(() => toast.remove(), 400);
      }
    }, 2500);
  }

  _setupResultQrCode() {
    const canvas = document.getElementById('result-qr-canvas');
    if (!canvas) return;
    const pending = competitionLeaderboardService.getPendingSession();
    if (pending && pending.claimUrl) {
      qrCodeService.renderToCanvas(canvas, pending.claimUrl, {
        size: 180,
        padding: 10,
        darkColor: '#0a0518',
        lightColor: '#ffffff',
        showEmblem: true,
      });
    }
  }

  _showPhoneQrModal() {
    let modal = document.getElementById('phone-qr-modal');
    if (modal) modal.remove();

    const localUrl = `https://${window.__LOCAL_IP__ || '192.168.1.18'}:5173`;

    modal = document.createElement('div');
    modal.id = 'phone-qr-modal';
    modal.className = 'modal-backdrop';
    modal.style.cssText = `
      position: fixed; inset: 0; z-index: 99999;
      background: rgba(8, 4, 18, 0.88); backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center; padding: 20px;
    `;
    modal.innerHTML = `
      <div style="background: linear-gradient(135deg, rgba(10, 42, 102, 0.98), rgba(6, 21, 45, 0.98)); border: 1.5px solid #14b3d4; box-shadow: 0 0 35px rgba(11, 95, 165, 0.4); border-radius: 18px; padding: 24px; max-width: 420px; width: 100%; text-align: center; color: #fff; font-family: 'Plus Jakarta Sans', sans-serif;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
          <h3 style="margin:0; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 16px; color: #14b3d4;">📱 SCAN DENGAN KAMERA HP</h3>
          <button id="btn-close-qr-modal" style="background:none; border:none; color:#fbb040; font-size:24px; cursor:pointer; font-weight:bold; line-height:1;">✕</button>
        </div>
        <p style="font-size: 13px; color: #d0c8e8; margin-bottom: 14px; line-height: 1.4;">
          Buka <strong>Kamera bawaan HP</strong> Anda, arahkan ke QR Code di bawah untuk membuka game langsung di HP:
        </p>
        <div style="background:#ffffff; border-radius:14px; padding:12px; display:inline-block; box-shadow: 0 0 20px rgba(0,247,255,0.35);">
          <canvas id="popup-qr-canvas" width="220" height="220"></canvas>
        </div>
        <div style="margin-top: 14px; font-size: 12.5px; color: #00ffaa; font-weight: 700;">
          🔗 Link WiFi Lokal (HTTPS): <br/>
          <a href="${localUrl}" target="_blank" style="color:#00f7ff; text-decoration: underline; word-break:break-all;">${localUrl}</a>
        </div>
        <div style="margin-top: 12px; font-size: 11.5px; color: #ff94c2; line-height: 1.4; background: rgba(255, 45, 117, 0.12); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255, 45, 117, 0.3);">
          💡 <strong>Tips saat dibuka di HP:</strong><br/>
          Jika muncul peringatan sertifikat lokal di browser HP, pilih <strong>Lanjutan (Advanced) ➔ Lanjutkan ke situs (Proceed)</strong>, lalu klik <strong>Izinkan Kamera</strong>!
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const canvas = document.getElementById('popup-qr-canvas');
    if (canvas) {
      qrCodeService.renderToCanvas(canvas, localUrl, {
        size: 220,
        padding: 8,
        darkColor: '#0a0518',
        lightColor: '#ffffff',
      });
    }

    const closeBtn = document.getElementById('btn-close-qr-modal');
    if (closeBtn) closeBtn.onclick = () => modal.remove();
    modal.onclick = (e) => {
      if (e.target === modal) modal.remove();
    };
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

    rhythmEngine.onPauseChange = (isPaused) => {
      const overlay = document.getElementById('game-pause-overlay');
      if (overlay) {
        overlay.style.display = isPaused ? 'flex' : 'none';
      }
      const pauseBtn = document.getElementById('btn-hud-pause');
      if (pauseBtn) {
        pauseBtn.innerHTML = isPaused ? '▶️' : '⏸️';
      }
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

  _showRestReminderToast(minutes) {
    let toast = document.getElementById('rest-reminder-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'rest-reminder-toast';
      toast.className = 'rest-reminder-toast';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `
      <div class="toast-title">🧘 REHAT SEJENAK DULU YUK!</div>
      <div class="toast-body">
        Kamu sudah bermain selama <strong>${minutes} menit</strong>. Istirahatkan pergelangan tangan & jari sejenak agar tetap rileks!
      </div>
      <div class="toast-actions">
        <button class="toast-btn toast-btn-pause" id="btn-toast-pause">⏸️ Jeda Game</button>
        <button class="toast-btn toast-btn-dismiss" id="btn-toast-dismiss">Tutup ✕</button>
      </div>
    `;
    toast.classList.add('visible');

    const pauseBtn = toast.querySelector('#btn-toast-pause');
    if (pauseBtn) {
      pauseBtn.onclick = () => {
        if (gameEngine.currentState === GAME_STATES.GAMEPLAY_PHASE) {
          gameEngine.pause();
        }
        toast.classList.remove('visible');
      };
    }
    const dismissBtn = toast.querySelector('#btn-toast-dismiss');
    if (dismissBtn) {
      dismissBtn.onclick = () => {
        toast.classList.remove('visible');
      };
    }
    setTimeout(() => {
      if (toast && toast.classList.contains('visible')) {
        toast.classList.remove('visible');
      }
    }, 12000);
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
    try {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const isMotionSyncSong = gameEngine.currentState === GAME_STATES.JATUH_SUKA || gameEngine.currentState === GAME_STATES.TARAGAK_PULANG;
      const isTvSong = gameEngine.currentState === GAME_STATES.KOMANG || gameEngine.currentState === GAME_STATES.NADIMU || isMotionSyncSong;
      const isHome = gameEngine.currentState === GAME_STATES.HOME;
      const isFullscreenActive = this.isFullscreen || isTvSong || isHome;

      // Handle background particle canvas: Disabled on Home screen (bagian awal)
      if (this.bgCanvas) {
        if (isHome) {
          this.bgCanvas.style.display = 'none';
          if (this.particleSystem) this.particleSystem.stop();
        } else {
          this.bgCanvas.style.display = 'block';
          if (this.particleSystem) {
            this.particleSystem.resize();
            this.particleSystem.start();
          }
        }
      }

      this.appEl.innerHTML = `
        ${(isHome || isMotionSyncSong) ? '' : `
          <button class="viewport-toggle-btn" id="btn-toggle-viewport">
            ${this.isFullscreen ? '📱 Phone Frame' : '🖥️ Fullscreen'}
          </button>
        `}

        <div class="phone-shell ${isFullscreenActive ? 'fullscreen-mode tv-mode home-fullscreen-shell' : ''}">
          ${isFullscreenActive ? '' : `
            <div class="phone-status-bar">
              <span>${timeStr}</span>
              <div class="notch-pill"></div>
              <span>5G ⚡</span>
            </div>
          `}

          <div class="screen-container ${(isTvSong || isHome) ? 'tv-screen-container home-screen-container' : ''}" id="screen-viewport">
            ${this._getScreenTemplate()}
          </div>
        </div>
      `;

      // Rebind Viewport Toggle Button (if present)
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
    } catch (renderError) {
      console.error('Render pipeline error caught:', renderError);
    }
  }

  _getScreenTemplate() {
    if (window.location.hash.startsWith('#claim')) {
      return ClaimScoreScreen.render();
    }

    switch (gameEngine.currentState) {
      case GAME_STATES.HOME:
        return this._templateHome();
      case GAME_STATES.TRACK_SELECT:
        return TrackSelectScreen.render();
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
      case GAME_STATES.KOMANG:
        return this._templateKomang();
      case GAME_STATES.NADIMU:
        return this._templateNadimu();
      case GAME_STATES.JATUH_SUKA:
      case GAME_STATES.TARAGAK_PULANG:
        return '<div id="motion-sync-game-root" style="width:100%; height:100%; min-height:100%;"></div>';
      case GAME_STATES.MIDI_IMPORT:
        return MidiImportScreen.render();
      case GAME_STATES.LEADERBOARD:
        return LeaderboardScreen.render();
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
    if (window.location.hash.startsWith('#claim')) {
      this._clearAutoAdvance();
      this._stopCameraAndTracking();
      ClaimScoreScreen.bindEvents(this);
      return;
    }

    const state = gameEngine.currentState;

    // Track active gameplay sessions for ergonomic rest reminders
    const isPlayingSession = [
      GAME_STATES.GAMEPLAY_PHASE,
      GAME_STATES.KOMANG,
      GAME_STATES.NADIMU,
      GAME_STATES.JINGLE_BELLS,
      GAME_STATES.FREE_SYNTH
    ].includes(state);

    if (isPlayingSession) {
      sessionTimerService.resume();
    } else {
      sessionTimerService.pause();
    }

    if (state !== GAME_STATES.JATUH_SUKA && state !== GAME_STATES.TARAGAK_PULANG) {
      if (this._currentMotionSyncGame && typeof this._currentMotionSyncGame.stop === 'function') {
        try { this._currentMotionSyncGame.stop(); } catch (e) { }
        this._currentMotionSyncGame = null;
      }
    }

    if (state === GAME_STATES.HOME) {
      this._clearAutoAdvance();
      this._setupHomeWaveform();
      this._stopCameraAndTracking();
      this._initMascotInteraction();
    } else if (state === GAME_STATES.TRACK_SELECT) {
      this._clearAutoAdvance();
      this._stopCameraAndTracking();
      TrackSelectScreen.bindEvents(this);
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
    } else if (state === GAME_STATES.KOMANG) {
      this._clearAutoAdvance();
      this._setupCameraAndTracking();
      this._setupKomangListeners();
    } else if (state === GAME_STATES.NADIMU) {
      this._clearAutoAdvance();
      this._setupCameraAndTracking();
      this._setupNadimuListeners();
    } else if (state === GAME_STATES.JATUH_SUKA) {
      this._clearAutoAdvance();
      this._stopCameraAndTracking();
      const root = document.getElementById('motion-sync-game-root');
      if (root) {
        this._currentMotionSyncGame = new JatuhSukaGame(root, () => gameEngine.setState(GAME_STATES.TRACK_SELECT));
        this._currentMotionSyncGame.start();
      }
    } else if (state === GAME_STATES.TARAGAK_PULANG) {
      this._clearAutoAdvance();
      this._stopCameraAndTracking();
      const root = document.getElementById('motion-sync-game-root');
      if (root) {
        this._currentMotionSyncGame = new TaragakPulangGame(root, () => gameEngine.setState(GAME_STATES.TRACK_SELECT));
        this._currentMotionSyncGame.start();
      }
    } else if (state === GAME_STATES.MIDI_IMPORT) {
      this._clearAutoAdvance();
      this._stopCameraAndTracking();
      MidiImportScreen.bindEvents(this);
    } else if (state === GAME_STATES.LEADERBOARD) {
      this._clearAutoAdvance();
      this._stopCameraAndTracking();
      LeaderboardScreen.bindEvents(this);
    } else if (state === GAME_STATES.RESULT_PHASE) {
      this._clearAutoAdvance();
      this._stopCameraAndTracking();
      this._setupResultQrCode();

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
      <div class="home-screen vibrant-home home-split-layout">
        <div class="home-main-split">
          <!-- KOLOM KIRI (50%): ANIMASI MASKOT FLIX BEBAS & MEGAH -->
          <div class="home-mascot-panel" id="mascot-interactive-box" title="Klik maskot Flix untuk tips & suara seru!">
            <div class="mascot-speech-bubble" id="mascot-speech-bubble">
              <div class="bubble-header">
                <span class="bubble-name-badge">⚡ FLIX</span>
                <span class="bubble-tap-hint">💡 Sentuh Aku!</span>
              </div>
              <p class="bubble-message" id="mascot-bubble-text">Hai! 👋 Aku <strong>Flix</strong>! Yuk mainkan musik dengan gerakan tanganmu di depan kamera!</p>
            </div>
            <div class="mascot-stage-platform">
              <div class="mascot-stage-glow"></div>
              <span class="felix-sparkle note1">♪</span>
              <span class="felix-sparkle note2">♫</span>
              <span class="felix-sparkle note3">♬</span>
              <img src="/images/maskot_transparent.png" alt="Flix - Maskot Flash Tech" class="mascot-hero-img" id="mascot-hero-img" />
              <div class="mascot-floor-shadow"></div>
            </div>
          </div>

          <!-- KOLOM KANAN: GAMBAR 2 & GAMBAR 3 (HEADLINE, STATS, PLAY BANNER, NAV) -->
          <section class="home-controls-panel">
            <!-- BAGIAN GAMBAR 2: Headline & Quick Stats -->
            <div class="home-headline-card">
              <div class="brand-headline-wrapper">
                <img src="/images/FLASH%20TECH.png" alt="Flash Tech Indonesia" class="brand-headline-logo" />
              </div>
              
              <div class="game-badge-clean">
                <span class="badge-dot"></span>
                <span>GAME RITME MUSIK SENSOR TANGAN</span>
              </div>

              <h1 class="game-title-clean">GESTURE SYNTH</h1>
              <p class="game-tagline-clean">Gerakkan jari & telapak tangan di depan kamera untuk menghasilkan harmoni nada musik yang indah!</p>

              <div class="visualizer-container-clean">
                <canvas id="home-waveform-canvas"></canvas>
              </div>

              <div class="stats-row-clean">
                <div class="stat-card-clean">
                  <span class="stat-icon-wrap trophy">🏆</span>
                  <div class="stat-meta">
                    <span class="stat-label">Skor Terbaik</span>
                    <span class="stat-val">${scoreManager.bestScore.toLocaleString()}%</span>
                  </div>
                </div>
                <div class="stat-card-clean">
                  <span class="stat-icon-wrap fire">🔥</span>
                  <div class="stat-meta">
                    <span class="stat-label">Rekor Kombo</span>
                    <span class="stat-val">x${scoreManager.bestCombo}</span>
                  </div>
                </div>
                <div class="stat-card-clean">
                  <span class="stat-icon-wrap star">⭐</span>
                  <div class="stat-meta">
                    <span class="stat-label">Level Tertinggi</span>
                    <span class="stat-val">Lv ${scoreManager.highestLevel}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- BAGIAN GAMBAR 3: Featured Action Banner (Pilih Lagu & Papan Skor) -->
            <div class="home-main-action-wrap">
              <button class="vibrant-card hero-competition-card" id="btn-home-tracks">
                <div class="hero-card-left">
                  <div class="hero-card-tag">🏆 TANTANGAN UTAMA BERHADIAH</div>
                  <div class="hero-card-title">PILIH LAGU & PAPAN SKOR JUARA</div>
                  <div class="hero-card-desc">Mainkan lagu pilihan (Komang, Jingle Bells & Pop) • 1 Papan Peringkat Terpadu (100.000 Pts) • Scan QR Rebut Hadiah!</div>
                </div>
                <div class="hero-card-action">
                  <span>PILIH LAGU</span>
                  <span class="action-arrow">→</span>
                </div>
              </button>
            </div>

            <!-- BAGIAN GAMBAR 3: Bottom Navigation Bar -->
            <div class="home-bottom-nav">
              <button class="nav-pill-btn" id="btn-home-leaderboard">
                <span class="nav-icon">🏆</span> <span>PAPAN SKOR</span>
              </button>
              <button class="nav-pill-btn" id="btn-home-levels">
                <span class="nav-icon">🗺️</span> <span>CAMPAIGN</span>
              </button>
              <button class="nav-pill-btn" id="btn-home-calibration">
                <span class="nav-icon">🎯</span> <span>KALIBRASI</span>
              </button>
              <button class="nav-pill-btn" id="btn-home-how">
                <span class="nav-icon">📖</span> <span>CARA MAIN</span>
              </button>
              <button class="nav-pill-btn" id="btn-home-settings">
                <span class="nav-icon">⚙️</span> <span>PENGATURAN</span>
              </button>
            </div>
          </section>
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
          <div class="hud-pill" id="hud-timer-pill" title="Durasi Sesi Bermain">
            <span id="session-timer-display">⏱️ 00:00</span>
          </div>
          <button class="hud-pause-btn" id="btn-hud-pause" title="Jeda Permainan (Esc / P)">
            ⏸️
          </button>
        </div>

        <!-- Pause Modal Overlay -->
        <div class="pause-modal-overlay" id="game-pause-overlay" style="display:none;">
          <div class="pause-modal-card">
            <div class="pause-modal-title">⏸️ PERMAINAN DIJEDA</div>
            <div class="pause-modal-desc">
              Istirahatkan pergelangan tangan dan lengan Anda sejenak. Skor, kombo, dan ritme permainan tersimpan aman.
            </div>
            <div class="pause-modal-actions">
              <button class="btn-primary" id="btn-pause-resume" style="padding:12px;font-size:13px;letter-spacing:1px;">▶ LANJUTKAN BERMAIN</button>
              <button class="btn-secondary" id="btn-pause-restart" style="padding:10px;font-size:11px;">↺ ULANGI TAHAP INI</button>
              <button class="btn-secondary" id="btn-pause-quit" style="padding:10px;font-size:11px;">‹ KELUAR KE MENU</button>
            </div>
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
          <button class="btn-icon-back" id="btn-back-home" title="Kembali ke Pilih Lagu">‹</button>
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
                ${[1, 2, 3, 4, 5, 6, 7, 8].map(lvl => {
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
            <div class="result-btn-row" style="margin-top:6px;">
              <button class="btn-secondary" id="btn-result-leaderboard" style="font-size:11px;">
                <span>🏆</span> PAPAN SKOR
              </button>
              <button class="btn-secondary" id="btn-result-share" style="font-size:11px;border-color:gold;color:gold;">
                <span>☁️</span> CLOUD SYNC
              </button>
            </div>
            <button class="btn-secondary" id="btn-result-home" style="width:100%;margin-top:6px;">
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

          <!-- OFFICIAL COMPETITION LEADERBOARD PRIZE & QR CLAIM SECTION -->
          <div class="result-qr-claim-section">
            <div class="rqr-header">
              <span class="rqr-badge">🏆 KOMPETISI BERHADIAH RESMI BOOTH</span>
              <div class="rqr-title">KLAIM SKOR KE PAPAN PERINGKAT</div>
              <div class="rqr-desc">Scan QR di bawah menggunakan kamera HP untuk memasukkan Nama & No. HP pemenang:</div>
            </div>

            <div class="rqr-body">
              <div class="rqr-canvas-box">
                <canvas id="result-qr-canvas" width="180" height="180"></canvas>
              </div>
              <div class="rqr-info-side">
                <div class="rqr-score-stat">
                  <span>SKOR STANDAR KOMPETISI:</span>
                  <strong class="rqr-pts">${(summary.compSession?.score || Math.round(summary.scorePct * 1000)).toLocaleString()} PTS</strong>
                  <small>Dinilai adil & setara dari max 100.000 Pts</small>
                </div>
                <div class="rqr-btns-row">
                  <button class="btn-primary" id="btn-result-direct-claim" style="font-size:11px;padding:8px 12px;">
                    <span>✏️</span> Input di Layar Ini
                  </button>
                  <button class="btn-secondary" id="btn-result-open-lead" style="font-size:11px;padding:8px 12px;">
                    <span>🏆</span> Buka Papan Peringkat
                  </button>
                </div>
              </div>
            </div>
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
          <div class="result-btn-row" style="margin-top:6px;">
            <button class="btn-secondary" id="btn-result-leaderboard" style="font-size:11px;">
              <span>🏆</span> PAPAN SKOR
            </button>
            <button class="btn-secondary" id="btn-result-share" style="font-size:11px;border-color:var(--cyan);color:var(--cyan);">
              <span>☁️</span> CLOUD SYNC
            </button>
          </div>
          <button class="btn-secondary" id="btn-result-home" style="width:100%;margin-top:6px;">
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

          <div class="setting-group">
            <span style="font-family:var(--font-display);font-size:12px;color:var(--cyan);letter-spacing:1px;">PERFORMA & BATERAI (ECO MODE)</span>

            <div class="setting-row">
              <div>
                <div class="setting-label">Eco / Low Performance Mode</div>
                <div class="setting-desc">Optimalkan pemrosesan untuk laptop ringan & hemat baterai</div>
              </div>
              <label class="switch">
                <input type="checkbox" id="set-eco-mode" ${s.ecoMode ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
            </div>
          </div>

          <div class="setting-group">
            <span style="font-family:var(--font-display);font-size:12px;color:var(--gold);letter-spacing:1px;">ERGONOMI & KENYAMANAN BERMAIN</span>

            <div class="setting-row">
              <div>
                <div class="setting-label">Pengingat Istirahat Lengan</div>
                <div class="setting-desc">Peringatan santai tiap 15 menit untuk meregangkan tangan</div>
              </div>
              <label class="switch">
                <input type="checkbox" id="set-rest-reminder" ${s.restReminderEnabled !== false ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
            </div>

            <div class="setting-row">
              <div>
                <div class="setting-label">Nama Pemain</div>
                <div class="setting-desc">Ditampilkan pada Papan Skor</div>
              </div>
              <input type="text" id="set-player-name" value="${scoreManager.playerName || 'CYBER_PLAYER'}" style="background:rgba(0,0,0,0.4);border:1px solid var(--border-neon);color:#fff;border-radius:6px;padding:4px 8px;font-family:var(--font-display);font-size:11px;width:130px;" maxlength="16">
            </div>
          </div>

          <div class="setting-group">
            <span style="font-family:var(--font-display);font-size:12px;color:var(--pink);letter-spacing:1px;">CLOUD LEADERBOARD SYNC (OPSIONAL)</span>

            <div class="setting-row" style="flex-direction:column;align-items:flex-start;gap:6px;">
              <div class="setting-label">REST API Endpoint URL</div>
              <input type="text" id="set-cloud-endpoint" placeholder="https://your-api.supabase.co/rest/v1/scores" value="${onlineLeaderboardService.endpointUrl || ''}" style="width:100%;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.2);color:#fff;border-radius:6px;padding:6px 8px;font-size:10px;font-family:monospace;">
              <span style="font-size:9.5px;color:var(--text-muted);">Biarkan kosong untuk menggunakan penyimpanan lokal offline tanpa cloud backend.</span>
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
          const isSongGameplay = [
            GAME_STATES.KOMANG,
            GAME_STATES.NADIMU,
            GAME_STATES.JINGLE_BELLS
          ].includes(gameEngine.currentState);

          if (!settingsManager.settings.ecoMode && virtualBackgroundService.isEnabled && !isSongGameplay) {
            virtualBackgroundService.updateSegmentation(videoEl, result.timestamp || performance.now());
          }
          virtualBackgroundService.render(cameraCanvasEl, videoEl, cameraService.isMirrored);
        }

        // 1. Process landmarks in gesture recognizer with frame timestamps
        const isTwoHandLevel = (gameEngine.currentState === GAME_STATES.GAMEPLAY_PHASE && gameEngine.currentLevel >= 7);
        const isFreeSynth = (gameEngine.currentState === GAME_STATES.FREE_SYNTH);
        const allowTwoHands = isTwoHandLevel || isFreeSynth;

        const gestureResult = gestureRecognitionService.process(
          result.landmarks,
          result.handedness,
          allowTwoHands,
          result
        );

        // 2. Draw skeleton ONLY for validated active player hands (passing videoEl for exact cover-fit mapping)
        handTrackingService.drawLandmarks(
          ctx,
          canvasEl.width,
          canvasEl.height,
          gestureResult.validLandmarks || [],
          gestureResult.validHandedness || [],
          cameraService.isMirrored,
          gestureResult.activeFingersPerHand,
          videoEl
        );

        // 3. Update UI displays
        this._updateTrackingHUD(gestureResult, result.fps, result);

        // 4. Live camera evaluation for real-time rhythm & song challenges (low-latency)
        if (gameEngine.currentState === GAME_STATES.GAMEPLAY_PHASE ||
          gameEngine.currentState === GAME_STATES.JINGLE_BELLS ||
          gameEngine.currentState === GAME_STATES.KOMANG ||
          gameEngine.currentState === GAME_STATES.NADIMU) {
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
    const chordStr = (gestureResult.hasHand && chordDetail) ? ` → ${chordDetail.chord} (${chordDetail.name})` : '';

    const detectedText = document.getElementById('detected-gesture-text');
    if (detectedText) {
      if (gestureResult.hasHand) {
        detectedText.innerText = `${gestureResult.totalFingers} Fingers${chordStr}`;
      } else {
        detectedText.innerText = (gestureResult.guidance === 'MOVE YOUR HAND CLOSER')
          ? 'Dekatkan Tangan ke Kamera ✋'
          : 'Menunggu Tangan...';
      }
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
          liveText.innerText = (gestureResult.guidance === 'MOVE YOUR HAND CLOSER')
            ? 'Kamera: Dekatkan tangan ke kamera ✋'
            : 'Kamera: Tunjukkan tangan di depan kamera 📷';
        } else if (gestureResult.totalFingers === curNote.fingerCount) {
          liveDot.className = 'live-dot matched';
          liveText.innerText = `Terdeteksi: ${gestureResult.totalFingers} Jari (COCOK! ✔)`;
        } else {
          liveDot.className = 'live-dot waiting';
          liveText.innerText = `Terdeteksi: ${gestureResult.totalFingers} Jari (Butuh: ${curNote.fingerCount} Jari ${curNote.emoji})`;
        }
      }
    }

    // Update Komang live status indicator & bottom-corner hand guide
    if (gameEngine.currentState === GAME_STATES.KOMANG) {
      const liveDot = document.getElementById('komang-live-dot');
      const liveText = document.getElementById('komang-live-text');
      const curMeasure = komangService.getCurrentMeasure();
      if (liveDot && liveText && curMeasure) {
        const isMatched = gestureResult.hasHand && (gestureResult.totalFingers === curMeasure.fingerCount);
        if (!gestureResult.hasHand) {
          liveDot.className = 'live-dot';
          liveText.innerText = (gestureResult.guidance === 'MOVE YOUR HAND CLOSER')
            ? 'Kamera: Dekatkan tangan ke kamera ✋'
            : 'Kamera: Tunjukkan tangan di depan kamera 📷';
        } else if (isMatched) {
          liveDot.className = 'live-dot matched';
          liveText.innerText = `Terdeteksi: ${gestureResult.totalFingers} Jari (COCOK ${curMeasure.chord}! ✔ PERFECT)`;
        } else {
          liveDot.className = 'live-dot waiting';
          liveText.innerText = `Terdeteksi: ${gestureResult.totalFingers} Jari (Butuh: ${curMeasure.fingerCount} Jari ${curMeasure.emoji})`;
        }

        // Live update the illustrated hand guide in the bottom corner
        this._renderKomangHandGuide(curMeasure, gestureResult.totalFingers, isMatched);
      }
    }

    // Update Nadimu live status indicator & bottom-corner hand guide
    if (gameEngine.currentState === GAME_STATES.NADIMU) {
      const liveDot = document.getElementById('nadimu-live-dot');
      const liveText = document.getElementById('nadimu-live-text');
      const curMeasure = nadimuService.getCurrentMeasure();
      if (liveDot && liveText && curMeasure) {
        const isMatched = gestureResult.hasHand && (gestureResult.totalFingers === curMeasure.fingerCount);
        if (!gestureResult.hasHand) {
          liveDot.className = 'live-dot';
          liveText.innerText = (gestureResult.guidance === 'MOVE YOUR HAND CLOSER')
            ? 'Kamera: Dekatkan tangan ke kamera ✋'
            : 'Kamera: Tunjukkan tangan di depan kamera 📷';
        } else if (isMatched) {
          liveDot.className = 'live-dot matched';
          liveText.innerText = `Terdeteksi: ${gestureResult.totalFingers} Jari (COCOK ${curMeasure.chord}! ✔ PERFECT)`;
        } else {
          liveDot.className = 'live-dot waiting';
          liveText.innerText = `Terdeteksi: ${gestureResult.totalFingers} Jari (Butuh: ${curMeasure.fingerCount} Jari ${curMeasure.emoji})`;
        }

        this._renderNadimuHandGuide(curMeasure, gestureResult.totalFingers, isMatched);
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

  _initMascotInteraction() {
    const mascotBox = document.getElementById('mascot-interactive-box');
    const mascotImg = document.getElementById('mascot-hero-img');
    const bubbleText = document.getElementById('mascot-bubble-text');
    if (!mascotBox || !mascotImg || !bubbleText) return;

    const MASCOT_TIPS = [
      "Hai! 👋 Aku Flix! Ayo mainkan musik hanya dengan gerakan tanganmu di depan kamera!",
      "Lagu 'Komang' paling asyik lho! Coba pilih mode 30 Detik untuk main kilat! ⏱️",
      "Tips Rahasia dari Flix: 1 Jari = G, 2 Jari = D/F#, 3 Jari = Am, 4 Jari = Cm! 👍",
      "Kalau tanganmu pegal, kamu juga bisa ketuk tuts piano langsung di layar lho! 🎹",
      "Mau main santai tanpa takut kehabisan nyawa? Ada tombol 'Lanjutkan Santai' di modal akhir! 🛡️",
      "Semakin panjang streak combo kamu, skor dan multiplier kamu bakal melesat tinggi! 🔥",
      "Keren! Kamu bisa tantang teman-temanmu rebut posisi teratas di Papan Skor! 🏆"
    ];

    let tipIdx = 0;

    mascotBox.onclick = () => {
      try {
        audioManager.init();
        audioManager.playGoodHit();
      } catch (e) { }

      // Trigger pop jump animation
      mascotImg.classList.remove('mascot-pop');
      void mascotImg.offsetWidth; // force reflow
      mascotImg.classList.add('mascot-pop');

      // Next tip with quick fade transition
      tipIdx = (tipIdx + 1) % MASCOT_TIPS.length;
      bubbleText.style.opacity = '0';
      bubbleText.style.transform = 'translateY(4px)';
      setTimeout(() => {
        bubbleText.innerText = MASCOT_TIPS[tipIdx];
        bubbleText.style.opacity = '1';
        bubbleText.style.transform = 'translateY(0)';
      }, 140);
    };
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
        } catch (e) { }
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
    } catch (e) { }

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
          <span>🎵</span> PILIH LAGU LAIN
        </button>
      </div>
    `;

    document.body.appendChild(modal);
  }

  // ----------------------------------------------------
  // KOMANG (RAIM LAODE) INTERACTIVE PLAY-ALONG ENGINE
  // ----------------------------------------------------
  _templateKomang() {
    const curMeasure = komangService.getCurrentMeasure();
    const curIdx = komangService.currentMeasureIndex;
    const isPlayAlong = komangService.mode === 'PLAY_ALONG';
    const isGuide = komangService.mode === 'GUIDE';
    const isTempo = komangService.mode === 'TEMPO';
    const isPlaying = komangService.isPlaying;
    const isTilesView = komangService.viewMode === 'TILES';

    // 4 Systems (16 Measures) - Piano Arrangement Aga Pratama Alamsyah
    const systems = [
      { id: 1, measures: [1, 2, 3, 4], label: 'Line 1: G ➔ D/F# (Intro Melodi)' },
      { id: 2, measures: [5, 6, 7, 8], label: 'Line 2: Am ➔ Cm (Syahdu Menuju Vokal)' },
      { id: 3, measures: [9, 10, 11, 12], label: 'Line 3: G ➔ D/F# ("Sebab kau terlalu indah...")' },
      { id: 4, measures: [13, 14, 15, 16], label: 'Line 4: Am ➔ Cm ➔ G ("Kau Komang-ku...")' },
    ];

    const systemsHtml = systems.map(sys => {
      const measuresHtml = sys.measures.map(mNum => {
        const m = KOMANG_MEASURES.find(item => item.measure === mNum);
        if (!m) return '';
        const isActive = m.index === curIdx;
        const isDone = komangService.evaluatedMeasures.has(m.index);

        return `
          <div class="komang-measure-box ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}" data-measure-idx="${m.index}">
            <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
              <span class="komang-m-chord">${m.chord}</span>
              <span class="komang-m-finger">${m.emoji} ${m.fingerCount}F</span>
            </div>
            <span class="komang-m-lyric" title="${m.lyric}">"${m.lyric}"</span>
            <span class="komang-m-notes">${m.notes}</span>
          </div>
        `;
      }).join('');

      return `
        <div class="komang-score-system" data-system="${sys.id}">
          <div class="komang-system-header">
            <span>BAR ${sys.measures[0]} - ${sys.measures[sys.measures.length - 1]} • ${sys.label}</span>
            <span>𝄞 ♯ G Major</span>
          </div>
          <div class="komang-system-measures">
            ${measuresHtml}
          </div>
        </div>
      `;
    }).join('');

    const activeKeys = curMeasure?.keys || [];
    const whiteKeys = KOMANG_PIANO_KEYS.filter(k => !k.isBlack);
    const blackKeys = KOMANG_PIANO_KEYS.filter(k => k.isBlack);

    const whiteKeysHtml = whiteKeys.map(k => {
      const isTarget = activeKeys.includes(k.note);
      return `
        <div class="komang-white-key ${isTarget ? 'target-chord-key' : ''}" data-note="${k.note}">
          <span>${k.label}</span>
        </div>
      `;
    }).join('');

    const blackKeyPositions = {
      'F#3': '21%',
      'Eb4': '55%',
      'F#4': '68%',
    };

    const blackKeysHtml = blackKeys.map(k => {
      const isTarget = activeKeys.includes(k.note);
      const leftPos = blackKeyPositions[k.note] || '50%';
      return `
        <div class="komang-black-key ${isTarget ? 'target-chord-key' : ''}" data-note="${k.note}" style="left:${leftPos};"></div>
      `;
    }).join('');

    return `
      <div class="komang-screen tv-landscape">
        <!-- TOP HEADER: TV Friendly, Sleek Synthwave Bar -->
        <div class="komang-header">
          <div style="display:flex; align-items:center; gap:12px;">
            <button class="btn-icon-back" id="btn-back-home" title="Kembali ke Pilih Lagu">‹</button>
            <div>
              <div class="komang-title">
                <span class="komang-logo-pulse">🌺</span> KOMANG — RAIM LAODE
              </div>
              <span class="komang-subtitle">
                ${komangService.sessionMode === '30S_RANDOM'
        ? `⏱️ SESI 45 DETIK (BAGIAN RANDOM: ${komangService.currentSegment?.title || 'Intro'}) • 130 BPM`
        : '🎹 MODE LAGU PENUH (4:30) • Raim Laode • G Major'}
              </span>
            </div>
          </div>

          <!-- Mode controls & View Switcher -->
          <div class="komang-header-actions">
            <!-- 45S RANDOM vs FULL SONG Switcher -->
            <div class="komang-view-switcher">
              <button class="komang-view-btn ${komangService.sessionMode === '30S_RANDOM' ? 'active' : ''}" id="btn-komang-mode-30s" title="Main cepat 45 detik dari bagian acak lagu Komang (Makin lama makin cepat!)">
                🎲 45s RANDOM
              </button>
              <button class="komang-view-btn ${komangService.sessionMode === 'FULL_SONG' ? 'active' : ''}" id="btn-komang-mode-full" title="Main lagu penuh dari awal sampai akhir">
                🎵 Penuh
              </button>
            </div>

            <!-- PIANO TILES vs PARTITUR View Toggle -->
            <div class="komang-view-switcher">
              <button class="komang-view-btn ${isTilesView ? 'active' : ''}" id="btn-komang-view-tiles">
                🎹 Tiles
              </button>
              <button class="komang-view-btn ${!isTilesView ? 'active' : ''}" id="btn-komang-view-sheet">
                🎼 Partitur
              </button>
            </div>

            <!-- Audio Modes -->
            <div class="jingle-mode-pills">
              <button class="mode-pill ${isPlayAlong ? 'active' : ''}" id="btn-komang-mode-playalong">🎵 MP3</button>
              <button class="mode-pill ${isGuide ? 'active' : ''}" id="btn-komang-mode-guide">🎓 Belajar</button>
              <button class="mode-pill ${isTempo ? 'active' : ''}" id="btn-komang-mode-tempo">⏱️ 130 BPM</button>
            </div>

            <!-- No-Fail / Challenge Mode Toggle Button -->
            <button class="mode-pill ${komangService.isNoFail ? 'active' : ''}" id="btn-komang-nofail-toggle" title="Klik untuk beralih antara Mode Santai atau Tantangan">
              ${komangService.isNoFail ? '🛡️ Santai' : '🎮 5 Nyawa'}
            </button>

            <!-- TV Fullscreen Button -->
            <button class="btn-tv-fullscreen" id="btn-komang-fullscreen-tv" title="Tampilkan Fullscreen">
              🖥️ TV
            </button>
          </div>
        </div>

        <!-- MAIN STAGE: 3-Column TV Landscape Layout (NO GEPENG!) -->
        <div class="komang-tv-stage ${isTilesView ? 'tiles-mode' : 'sheet-mode'}">

          <!-- 1. LEFT COLUMN: TV HUD, BIG LYRICS, SCORE & TRANSPORT -->
          <div class="komang-left-col">
            <!-- Score, Combo & Lives Card -->
            <div class="komang-tv-score-card">
              <div class="tv-score-row">
                <div class="tv-score-item">
                  <span class="tv-stat-kicker">TOTAL SKOR</span>
                  <span class="tv-score-num" id="komang-cur-score">${komangService.score} PTS</span>
                </div>
                <div class="tv-score-item combo-item">
                  <span class="tv-stat-kicker">STREAK COMBO</span>
                  <span class="tv-combo-num" id="komang-cur-combo">x${komangService.combo} COMBO</span>
                </div>
                <div class="tv-score-item lives-item">
                  <span class="tv-stat-kicker">SISA NYAWA</span>
                  <div class="komang-hearts-row" id="komang-hearts-row">
                    ${komangService.isNoFail ? '<span style="font-size:12px; color:#00ffaa; font-weight:900; font-family:var(--font-display);">🛡️ BEBAS</span>' : `${'❤️'.repeat(Math.max(0, komangService.lives))}${'🖤'.repeat(Math.max(0, komangService.maxLives - komangService.lives))}`}
                  </div>
                </div>
              </div>
              <div class="tv-multiplier-row">
                <span class="multiplier-pill" id="komang-multiplier-pill">⚡ MULTIPLIER 1.0x</span>
                <div class="komang-speed-selector">
                  <span style="font-size:10px; color:var(--text-muted); font-weight:800; letter-spacing:0.5px;">KECEPATAN UBIN:</span>
                  <button class="speed-chip ${komangService.speedMultiplier === 0.75 ? 'active' : ''}" data-speed="0.75" title="Sangat Santai & Pelan (Cocok untuk Pemula)">🐢 Santai (0.75x)</button>
                  <button class="speed-chip ${komangService.speedMultiplier === 1.0 ? 'active' : ''}" data-speed="1.0" title="Tenang & Pas (Rekomendasi Standar)">🌿 Normal (1.0x)</button>
                  <button class="speed-chip ${komangService.speedMultiplier === 1.3 ? 'active' : ''}" data-speed="1.3" title="Lebih Cepat (Tantangan)">⚡ Cepat (1.3x)</button>
                </div>
              </div>
            </div>

            <!-- Giant Karaoke Lyrics Display (High Legibility from TV Couch) -->
            <div class="komang-karaoke-card">
              <div class="karaoke-badge-row">
                <span class="tv-tag" id="komang-session-tag">
                  ${komangService.sessionMode === '30S_RANDOM' ? `🎲 45s: ${komangService.currentSegment?.title || 'Intro'}` : '🎤 LIRIK SEKARANG'}
                </span>
                <span class="komang-chord-badge" id="komang-cur-chord">${curMeasure.chord}</span>
              </div>
              <div class="komang-big-lyric" id="komang-cur-lyric">
                "${curMeasure.lyric}"
              </div>
              <div class="komang-next-lyric-cue" id="komang-next-preview">
                👉 Bar ${curMeasure.measure} / 16 (G Major)
              </div>
              <div class="komang-chord-desc-bar" id="komang-cur-desc">
                ${curMeasure.chordDesc}
              </div>
            </div>

            <!-- Audio Backing Player Card -->
            <div class="komang-player-card">
              <div class="komang-transport-row">
                <span style="font-size:10.5px; font-weight:800; color:var(--ice-blue); letter-spacing:0.5px; font-family:var(--font-display);">🎚️ PENGATURAN SUARA & SYNC</span>
                <span class="komang-time-badge" style="font-size:10px;">G Major • 130 BPM</span>
              </div>

              <div class="komang-progress-bar" id="komang-progress-bar">
                <div class="komang-progress-fill" id="komang-progress-fill"></div>
              </div>

              <div class="komang-sync-row">
                <div class="komang-offset-controls">
                  <span>⏱️ Sync:</span>
                  <button class="komang-offset-btn" id="komang-offset-minus">-0.1s</button>
                  <span id="komang-offset-val">${komangService.audioOffsetSec.toFixed(1)}s</span>
                  <button class="komang-offset-btn" id="komang-offset-plus">+0.1s</button>
                  <button class="komang-offset-btn" id="komang-offset-zero">0.0s</button>
                </div>
                <div class="komang-vol-row">
                  <span>🔊 MP3:</span>
                  <input type="range" class="komang-vol-slider" id="komang-vol-backing" min="0" max="1" step="0.05" value="${komangService.backingVolume}">
                  <span>🎹 Piano:</span>
                  <input type="range" class="komang-vol-slider" id="komang-vol-player" min="0" max="1" step="0.05" value="${komangService.playerVolume}">
                </div>
              </div>
            </div>

            <!-- 4. PANDUAN PINTASAN & INPUT (Mengisi kolom kiri secara seimbang & informatif) -->
            <div class="komang-controls-card">
              <div class="controls-card-header">
                <span>🎮</span> PANDUAN PINTASAN & INPUT
              </div>
              <div class="controls-guide-grid">
                <div class="cguide-item">
                  <span class="cguide-key">1 / D</span>
                  <span class="cguide-desc">☝️ G (1 Jari)</span>
                </div>
                <div class="cguide-item">
                  <span class="cguide-key">2 / F</span>
                  <span class="cguide-desc">✌️ D/F# (2 Jari)</span>
                </div>
                <div class="cguide-item">
                  <span class="cguide-key">3 / J</span>
                  <span class="cguide-desc">🤟 Am (3 Jari)</span>
                </div>
                <div class="cguide-item">
                  <span class="cguide-key">4 / K</span>
                  <span class="cguide-desc">🖐️ Cm (4 Jari)</span>
                </div>
              </div>
              <div class="controls-tips-row">
                <span>⌨️ Ketuk Tuts</span>
                <span>•</span>
                <span>📹 Kamera 1-5 Jari</span>
                <span>•</span>
                <span>⏸️ Esc: Jeda</span>
              </div>
            </div>
          </div>

          <!-- 2. CENTER COLUMN: PIANO TILES HIGHWAY OR SHEET MUSIC -->
          <div class="komang-center-col">
            ${isTilesView ? `
              <!-- PIANO TILES 4-LANE HIGHWAY -->
              <div class="komang-highway-wrapper">
                <div class="highway-top-header">
                  <span>🎵 PIANO TILES RHYTHM HIGHWAY (4 JALUR NADA)</span>
                  <div style="display:flex; align-items:center; gap:8px;">
                    <button class="komang-offset-btn" id="btn-toggle-piano-height" title="Ubah ukuran tuts piano (Panjang, Ekstra Panjang, Kompak)">
                      🎹 Tuts: <span id="label-piano-height">${komangTilesEngine.getKeyHeightLabel ? komangTilesEngine.getKeyHeightLabel() : 'Panjang (35%)'}</span>
                    </button>
                    <span class="highway-hint-keys">Ketuk tuts atau kamera tangan ✋</span>
                  </div>
                </div>
                <div class="komang-highway-stage">
                  <canvas id="komang-tiles-canvas"></canvas>
                </div>
              </div>
            ` : `
              <!-- SHEET MUSIC & PIANO VIEW -->
              <div class="komang-sheet-wrapper">
                <div class="komang-score-card">
                  <div class="score-card-header">
                    <span class="score-title">🎼 PARTITUR KOMANG — RAIM LAODE (G MAJOR • 130 BPM)</span>
                    <span style="font-size:11px; color:var(--text-muted);">Klik bar untuk melompat langsung</span>
                  </div>
                  <div style="display:flex; flex-direction:column; gap:8px;" id="komang-score-container">
                    ${systemsHtml}
                  </div>
                </div>

                <div class="komang-piano-card">
                  <div class="piano-card-header">
                    <span>🎹 VIRTUAL PIANO (Akor ${curMeasure.chord} • Tuts Menyala Pink)</span>
                    <span class="piano-hint-text">1F=G • 2F=D/F# • 3F=Am • 4F=Cm • 5F=G</span>
                  </div>
                  <div class="komang-piano-keyboard" id="komang-piano-keyboard">
                    ${whiteKeysHtml}
                    ${blackKeysHtml}
                  </div>
                </div>
              </div>
            `}
          </div>

          <!-- 3. RIGHT COLUMN: LIVE CAMERA & HERO PLAY CONTROLS -->
          <div class="komang-right-col">
            <!-- Camera Viewport with Hand Skeleton Tracking -->
            <div class="camera-viewport komang-camera-box">
              <video id="camera-video" autoplay playsinline muted></video>
              <canvas id="camera-canvas"></canvas>
              <canvas id="tracking-canvas"></canvas>
              <button class="btn-camera-bg-toggle ${virtualBackgroundService.isEnabled ? 'active' : ''}" id="btn-camera-bg-toggle" type="button" title="Ganti Mode Latar Kamera (Flash Tech / Asli)">
                ${virtualBackgroundService.isEnabled ? '✨ Latar: Flash Tech' : '📷 Latar: Asli'}
              </button>
              <div class="camera-guide-frame"></div>
              <div class="camera-guidance-pill" id="komang-guidance-pill">
                TUNJUKKAN ${curMeasure.fingerCount} JARI UNTUK ${curMeasure.chord} ${curMeasure.emoji}
              </div>
              ${this._templateCameraOverlay()}
            </div>

            <!-- Live Status Bar -->
            <div class="komang-live-status-pill">
              <span class="live-dot waiting" id="komang-live-dot"></span>
              <span class="live-text" id="komang-live-text">Kamera: Tunjukkan ${curMeasure.fingerCount} Jari ${curMeasure.emoji}</span>
            </div>

            <!-- PROMINENT HERO PLAY ACTION CARD (Sangat Terlihat & Jelas) -->
            <div class="komang-hero-cta-card">
              <button class="komang-hero-play-btn ${isPlaying ? 'playing' : ''}" id="btn-komang-play-pause">
                <span class="hero-play-icon">${isPlaying ? '⏸️' : '▶️'}</span>
                <div class="hero-play-info">
                  <span class="hero-play-main" id="komang-play-label">${isPlaying ? 'JEDA PERMAINAN' : (komangService.sessionMode === '30S_RANDOM' ? 'MAIN 30 DETIK' : 'PUTAR LAGU PENUH')}</span>
                  <span class="hero-play-sub">${isPlaying ? 'Klik untuk berhenti sejenak' : 'Ketuk tombol atau langsung gunakan kamera'}</span>
                </div>
              </button>

              <div class="hero-cta-quick-actions">
                <button class="btn-hero-util" id="btn-komang-random-segment" title="Ganti bagian 30s acak">
                  🎲 Acak Bagian
                </button>
                <button class="btn-hero-util" id="btn-komang-reset" title="Ulang dari awal bagian ini">
                  ↺ Ulang
                </button>
                <span class="hero-time-badge" id="komang-time-display">
                  ${komangService.sessionMode === '30S_RANDOM' ? '⏱️ SISA: 30s' : '0:00 / 4:30'}
                </span>
              </div>
            </div>

            <!-- Quick fallback touch buttons for TV remote/mouse -->
            <div class="komang-quick-fbtns-row">
              <button class="komang-fbtn ${curMeasure.fingerCount === 1 ? 'active' : ''}" data-fingers="1" data-chord="G">
                <span>☝️ 1: G</span>
              </button>
              <button class="komang-fbtn ${curMeasure.fingerCount === 2 ? 'active' : ''}" data-fingers="2" data-chord="D/F#">
                <span>✌️ 2: D/F#</span>
              </button>
              <button class="komang-fbtn ${curMeasure.fingerCount === 3 ? 'active' : ''}" data-fingers="3" data-chord="Am">
                <span>🤟 3: Am</span>
              </button>
              <button class="komang-fbtn ${curMeasure.fingerCount === 4 ? 'active' : ''}" data-fingers="4" data-chord="Cm">
                <span>🖐️ 4: Cm</span>
              </button>
              <button class="komang-fbtn wildcard-fbtn ${curMeasure.fingerCount === 5 ? 'active' : ''}" data-fingers="5" data-chord="WILDCARD" title="5 Jari: Wildcard Bebas (Pukul Jalur Aktif)">
                <span>✨ 5: SAKTI</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    `;
  }

  _setupKomangListeners() {
    // 1. Setup Piano Tiles Highway canvas if in TILES view
    const tilesCanvas = document.getElementById('komang-tiles-canvas');
    if (tilesCanvas) {
      komangTilesEngine.init(tilesCanvas, komangService);
      komangService.setTilesEngine(komangTilesEngine);
      if (komangService.isPlaying) {
        komangTilesEngine.start();
      } else {
        komangTilesEngine.draw();
      }
    }

    // 2. Initial render of bottom corner hand guide
    this._renderKomangHandGuide();

    komangService.onMeasureChanged = (measure, idx) => {
      this._updateKomangUI(measure, idx);
      this._renderKomangHandGuide(measure);
    };

    komangService.onTimelineTick = (data) => {
      this._onKomangTimelineTick(data);
    };

    komangService.onChordHit = (data) => {
      this._onKomangChordHit(data);
      this._renderKomangHandGuide(data.measure, data.measure.fingerCount, true);
    };

    komangService.onLifeLost = (data) => {
      this._onKomangLifeLost(data);
    };

    komangService.onLifeRecovered = (data) => {
      const heartsRow = document.getElementById('komang-hearts-row');
      if (heartsRow && !komangService.isNoFail) {
        const activeHearts = '❤️'.repeat(Math.max(0, data.lives));
        const deadHearts = '🖤'.repeat(Math.max(0, data.maxLives - data.lives));
        heartsRow.innerHTML = `${activeHearts}${deadHearts}`;
      }
    };

    komangService.onGameOver = (result) => {
      this._showKomangGameOverModal(result);
    };

    komangService.onSongFinished = (stats) => {
      this._showKomangVictoryModal(stats);
    };

    komangService.onAudioStateChanged = (isPlaying) => {
      const label = document.getElementById('komang-play-label');
      if (label) {
        label.innerText = isPlaying ? 'JEDA PERMAINAN' : (komangService.sessionMode === '30S_RANDOM' ? 'MAIN 30 DETIK' : 'PUTAR LAGU PENUH');
      }
      const icon = document.querySelector('#btn-komang-play-pause .hero-play-icon');
      if (icon) {
        icon.innerText = isPlaying ? '⏸️' : '▶️';
      }
      const heroBtn = document.getElementById('btn-komang-play-pause');
      if (heroBtn) {
        heroBtn.classList.toggle('playing', isPlaying);
      }
      if (isPlaying && komangTilesEngine) {
        komangTilesEngine.start();
      } else if (!isPlaying && komangTilesEngine) {
        komangTilesEngine.stop();
      }
    };

    this._updateKomangUI(komangService.getCurrentMeasure(), komangService.currentMeasureIndex);
  }

  _renderKomangHandGuide(curMeasure = null, detectedFingers = 0, isMatched = false) {
    const guideCanvas = document.getElementById('komang-hand-guide-canvas');
    if (!guideCanvas) return;
    const m = curMeasure || komangService.getCurrentMeasure();
    if (!m) return;

    const targetFingers = m.fingerCount;
    const matched = isMatched || (this.lastDetectedFingers === targetFingers);
    const stateKey = `${m.chord}_${targetFingers}_${detectedFingers}_${matched}`;

    if (this._lastKomangHandGuideKey === stateKey) return;
    this._lastKomangHandGuideKey = stateKey;

    HandVisualizer.drawTVHandGuide(guideCanvas, targetFingers, detectedFingers, m.chord, matched);

    // Target badge
    const badge = document.getElementById('komang-hand-target-badge');
    if (badge) {
      badge.innerText = `${m.emoji} ${m.fingerCount} JARI`;
      badge.style.color = matched ? '#00e5a3' : '#fbb040';
    }

    // Guide chord name
    const chordNameEl = document.getElementById('komang-guide-chord-name');
    if (chordNameEl) {
      chordNameEl.innerHTML = `AKOR: <strong style="color:${matched ? '#00e5a3' : '#fbb040'};">${m.chord}</strong> (${m.label}) ${matched ? '✔ COCOK!' : ''}`;
    }

    // Update tags in mini legend
    const tags = document.querySelectorAll('.hand-guide-mini-legend .guide-tag');
    tags.forEach(t => {
      const isTarget = t.innerText.startsWith(`${targetFingers}F`);
      t.classList.toggle('active', isTarget);
    });
  }

  _updateKomangUI(curMeasure, idx) {
    if (!curMeasure) return;

    const chordEl = document.getElementById('komang-cur-chord');
    if (chordEl) chordEl.innerText = curMeasure.chord;

    const lyricEl = document.getElementById('komang-cur-lyric');
    if (lyricEl) lyricEl.innerText = `"${curMeasure.lyric}"`;

    const descEl = document.getElementById('komang-cur-desc');
    if (descEl) descEl.innerText = curMeasure.chordDesc;

    const guidancePill = document.getElementById('komang-guidance-pill');
    if (guidancePill) {
      guidancePill.innerText = `TUNJUKKAN ${curMeasure.fingerCount} JARI UNTUK ${curMeasure.chord} ${curMeasure.emoji}`;
    }

    // Update Bottom Corner Hand Guide
    this._renderKomangHandGuide(curMeasure);

    // Highlight active measure box on sheet music (if in sheet view)
    const mBoxes = document.querySelectorAll('.komang-measure-box');
    mBoxes.forEach(box => {
      const i = parseInt(box.dataset.measureIdx, 10);
      const isCur = i === idx;
      const isDone = komangService.evaluatedMeasures.has(i);
      box.classList.toggle('active', isCur);
      box.classList.toggle('done', isDone);
      if (isCur) {
        try {
          box.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        } catch (e) { }
      }
    });

    // Highlight active chord keys on piano
    const activeKeys = curMeasure.keys || [];
    const pKeys = document.querySelectorAll('.komang-white-key, .komang-black-key');
    pKeys.forEach(k => {
      const note = k.dataset.note;
      k.classList.toggle('target-chord-key', activeKeys.includes(note));
    });

    // Update quick finger buttons
    const fbtns = document.querySelectorAll('.komang-fbtn');
    fbtns.forEach(btn => {
      const f = parseInt(btn.dataset.fingers, 10);
      btn.classList.toggle('active', f === curMeasure.fingerCount);
    });
  }

  _onKomangTimelineTick(data) {
    const now = performance.now();
    if (!this._lastKomangTickUiTime) this._lastKomangTickUiTime = 0;

    // 1. Time display formatted e.g. ⏱️ SISA: 28s or 1:12 / 4:30 (Only update when second changes!)
    const curSec = data.is30sSession ? Math.ceil(data.sessionRemainingSec) : Math.floor(data.currentTimeSec);
    if (this._lastKomangDisplaySec !== curSec) {
      this._lastKomangDisplaySec = curSec;
      const timeEl = document.getElementById('komang-time-display');
      if (timeEl) {
        if (data.is30sSession) {
          timeEl.innerText = `⏱️ SISA: ${curSec}s`;
        } else {
          const curM = Math.floor(data.currentTimeSec / 60);
          const curS = Math.floor(data.currentTimeSec % 60);
          const totM = Math.floor(data.totalDurationSec / 60);
          const totS = Math.floor(data.totalDurationSec % 60);
          timeEl.innerText = `${curM}:${curS.toString().padStart(2, '0')} / ${totM}:${totS.toString().padStart(2, '0')}`;
        }
      }
    }

    // 2. Audio progress fill bar & preview text (Throttled to ~12Hz / every 80ms to avoid DOM reflows)
    if (now - this._lastKomangTickUiTime > 80) {
      this._lastKomangTickUiTime = now;

      const fillEl = document.getElementById('komang-progress-fill');
      if (fillEl) {
        if (data.is30sSession) {
          fillEl.style.width = `${(data.sessionProgress * 100).toFixed(1)}%`;
        } else if (data.totalDurationSec > 0) {
          const pct = Math.min(100, Math.max(0, (data.currentTimeSec / data.totalDurationSec) * 100));
          fillEl.style.width = `${pct}%`;
        }
      }

      // 3. Next chord preview countdown
      const nextPreviewEl = document.getElementById('komang-next-preview');
      if (nextPreviewEl && data.nextMeasure) {
        const nxt = data.nextMeasure;
        const timeSec = data.timeToNextMeasureSec;
        if (timeSec <= 1.2) {
          nextPreviewEl.innerHTML = `<span style="color:#00f7ff; font-weight:800;">👉 ${nxt.chord} (${nxt.emoji} ${nxt.fingerCount}F) in ${timeSec.toFixed(1)}s!</span>`;
        } else {
          nextPreviewEl.innerText = `👉 Bar ${data.activeMeasure.measure} / 16 • Selanjutnya ${nxt.chord} (${nxt.emoji} ${nxt.fingerCount}F)`;
        }
      }
    }

    // 4. Particle pulse on downbeat (Only once per measure downbeat)
    if (data.measureProgress < 0.08 && this.particleSystem && !this._downbeatPulsed) {
      this._downbeatPulsed = true;
      this.particleSystem.triggerPulse(0.2);
    } else if (data.measureProgress >= 0.15) {
      this._downbeatPulsed = false;
    }
  }

  _onKomangChordHit(data) {
    if (this.particleSystem) {
      this.particleSystem.triggerPulse(0.45);
    }

    // Flash live dot
    const liveDot = document.getElementById('komang-live-dot');
    const liveText = document.getElementById('komang-live-text');
    if (liveDot && liveText) {
      liveDot.className = 'live-dot matched';
      liveText.innerText = `Terdeteksi: ${data.measure.chord} [${data.rating} HIT! +${data.points} pts] ⭐`;
      setTimeout(() => {
        if (liveDot) liveDot.className = 'live-dot waiting';
      }, 350);
    }

    // Update score, combo & multiplier HUD
    const scoreEl = document.getElementById('komang-cur-score');
    if (scoreEl) scoreEl.innerText = `${data.score} PTS`;

    const comboEl = document.getElementById('komang-cur-combo');
    if (comboEl) comboEl.innerText = `x${data.combo} COMBO`;

    const multEl = document.getElementById('komang-multiplier-pill');
    if (multEl && data.multiplier) {
      multEl.innerText = `⚡ MULTIPLIER ${data.multiplier.toFixed(1)}x`;
      multEl.classList.toggle('high-mult', data.multiplier >= 2.0);
    }

    // Ensure hearts are synced
    const heartsRow = document.getElementById('komang-hearts-row');
    if (heartsRow && data.lives !== undefined) {
      const activeHearts = '❤️'.repeat(Math.max(0, data.lives));
      const deadHearts = '🖤'.repeat(Math.max(0, komangService.maxLives - data.lives));
      heartsRow.innerHTML = `${activeHearts}${deadHearts}`;
    }

    // Piano keys press flash
    const activeKeys = data.measure.keys || [];
    activeKeys.forEach(note => {
      const keyEl = document.querySelector(`.komang-white-key[data-note="${note}"], .komang-black-key[data-note="${note}"]`);
      if (keyEl) {
        keyEl.classList.add('pressed');
        setTimeout(() => keyEl.classList.remove('pressed'), 180);
      }
    });
  }

  _onKomangLifeLost(data) {
    // 1. Update Hearts UI with shake animation
    const heartsRow = document.getElementById('komang-hearts-row');
    if (heartsRow) {
      const activeHearts = '❤️'.repeat(Math.max(0, data.lives));
      const deadHearts = '🖤'.repeat(Math.max(0, data.maxLives - data.lives));
      heartsRow.innerHTML = `${activeHearts}${deadHearts}`;
      heartsRow.classList.add('heart-damage');
      setTimeout(() => heartsRow.classList.remove('heart-damage'), 350);
    }

    // 2. Reset combo & multiplier
    const comboEl = document.getElementById('komang-cur-combo');
    if (comboEl) comboEl.innerText = 'x0 COMBO';

    const multEl = document.getElementById('komang-multiplier-pill');
    if (multEl) {
      multEl.innerText = '⚡ MULTIPLIER 1.0x';
      multEl.classList.remove('high-mult');
    }

    // 3. Flash live status banner red
    const liveDot = document.getElementById('komang-live-dot');
    const liveText = document.getElementById('komang-live-text');
    if (liveDot && liveText) {
      liveDot.className = 'live-dot miss';
      liveText.innerText = data.reason === 'WRONG_FINGER' ? 'SALAH JARI! Nyawa -1 💔' : 'MISS! Ubin Terlewat -1 💔';
      setTimeout(() => {
        if (liveDot) liveDot.className = 'live-dot waiting';
      }, 450);
    }
  }

  _showKomangGameOverModal(result) {
    const existing = document.getElementById('komang-gameover-backdrop');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.className = 'komang-modal-backdrop';
    modal.id = 'komang-gameover-backdrop';
    modal.innerHTML = `
      <div class="komang-modal-dialog gameover-dialog">
        <div class="modal-icon-header">💔</div>
        <h2 class="modal-title-gameover">LAGU TERHENTI</h2>
        <p class="modal-subtitle-gameover">Kehabisan Nyawa di Bar ${result.barReached || 1} / ${result.totalMeasures || 16}</p>

        <!-- Mascot Encouragement -->
        <div class="modal-mascot-row">
          <img src="/images/maskot_transparent.png" alt="Flix" class="modal-mascot-avatar" />
          <div class="modal-mascot-speech">
            <span class="mascot-speech-name">Flix Menyemangati:</span>
            <p class="mascot-speech-quote">"Jangan patah semangat! Balok nada terlewat saat meluncur. Coba lagi atau aktifkan <strong>MAIN SANTAI (NO-FAIL)</strong> ya! 👍"</p>
          </div>
        </div>

        <!-- Penjelasan Ramah & Panduan Bermain -->
        <div class="gameover-notice-card">
          <div class="gameover-notice-header">
            <span>ℹ️</span> <span>MENGAPA PERMAINAN BERHENTI?</span>
          </div>
          <p class="gameover-notice-desc">
            Nyawa berkurang saat <strong>ubin balok meluncur melewati garis hit</strong> tanpa sempat tertekan atau terdeteksi oleh kamera tangan (Total: <strong>${result.missHits || 5} ubin terlewat</strong>).
          </p>
          <div class="gameover-notice-tip">
            <span>🛡️</span> <span>Ingin bermain bebas tanpa rasa kalah? Gunakan mode <strong>MAIN SANTAI</strong> untuk latihan bebas tanpa nyawa!</span>
          </div>
        </div>

        <div class="modal-stats-grid">
          <div class="mstat-box">
            <span class="mstat-label">TOTAL SKOR</span>
            <span class="mstat-val gold">${result.score} PTS</span>
          </div>
          <div class="mstat-box">
            <span class="mstat-label">AKURASI</span>
            <span class="mstat-val cyan">${result.accuracy}%</span>
          </div>
          <div class="mstat-box">
            <span class="mstat-label">MAX COMBO</span>
            <span class="mstat-val pink">x${result.maxCombo}</span>
          </div>
          <div class="mstat-box">
            <span class="mstat-label">UBIN TERLEWAT</span>
            <span class="mstat-val red">${result.missHits}</span>
          </div>
        </div>

        <div class="modal-actions-row">
          <button class="btn-modal-hero" id="btn-komang-gameover-retry">
            <span>↺</span> ULANG SEGMEN INI
          </button>
          <button class="btn-modal-secondary" id="btn-komang-random-next">
            <span>🎲</span> COBA 30s LAIN
          </button>
          <button class="btn-modal-nofail" id="btn-komang-gameover-nofail">
            <span>🛡️</span> MAIN SANTAI (NO-FAIL)
          </button>
          <button class="btn-modal-home" id="btn-komang-gameover-home">
            <span>🎵</span> PILIH LAGU LAIN
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  _showKomangVictoryModal(stats) {
    try {
      confetti({
        particleCount: 220,
        spread: 110,
        origin: { y: 0.5 },
      });
    } catch (e) { }

    const existing = document.getElementById('komang-victory-backdrop');
    if (existing) existing.remove();

    const gradeColorMap = {
      'S+': '#ffd700',
      'S': '#00f7ff',
      'A': '#00ff88',
      'B': '#a855f7',
      'C': '#ff7eb3',
    };
    const gradeColor = gradeColorMap[stats.grade] || '#00f7ff';

    const modal = document.createElement('div');
    modal.className = 'komang-modal-backdrop';
    modal.id = 'komang-victory-backdrop';
    modal.innerHTML = `
      <div class="komang-modal-dialog victory-dialog">
        <div class="modal-confetti-badge">🎉 ${stats.is30sSession ? 'SESI 45 DETIK SELESAI!' : 'LAGU KOMANG SELESAI!'} 🎉</div>
        <h2 class="modal-title-victory">VICTORY CLEAR!</h2>
        <p class="modal-subtitle-victory">
          ${stats.is30sSession ? `Bagian: <strong>${stats.segment?.title || 'Komang'}</strong> (${stats.segment?.lyricHint || ''})` : 'Piano Karaoke • Raim Laode • Key G Major'}
        </p>

        <!-- Grade & Star Celebration Banner -->
        <div class="victory-grade-banner">
          <div class="victory-grade-circle" style="color:${gradeColor}; border-color:${gradeColor}; box-shadow:0 0 35px ${gradeColor}88;">
            ${stats.grade}
          </div>
          <div class="victory-stars-box">
            <div class="victory-stars-row">
              ${'⭐'.repeat(stats.stars || 1)}
            </div>
            ${stats.isFullCombo ? `
              <span class="full-combo-pill">👑 PERFECT FULL COMBO!</span>
            ` : `
              <span class="clear-pill">✨ TINGKAT: ${stats.grade === 'S' || stats.grade === 'S+' ? 'MASTER PIANIS' : 'PIANIS MAHIR'}</span>
            `}
          </div>
        </div>

        <!-- Mascot Celebration -->
        <div class="modal-mascot-row victory">
          <img src="/images/maskot_transparent.png" alt="Flix" class="modal-mascot-avatar mascot-victory-bounce" />
          <div class="modal-mascot-speech victory">
            <span class="mascot-speech-name">Flix Bangga Banget:</span>
            <p class="mascot-speech-quote">"LUAR BIASA! 🌟 Permainan musik dan gerakan jarimu lincah banget! Kamu musisi berbakat!"</p>
          </div>
        </div>

        <div class="modal-stats-grid">
          <div class="mstat-box">
            <span class="mstat-label">TOTAL SKOR</span>
            <span class="mstat-val gold">${stats.score} PTS</span>
          </div>
          <div class="mstat-box">
            <span class="mstat-label">AKURASI</span>
            <span class="mstat-val cyan">${stats.accuracy}%</span>
          </div>
          <div class="mstat-box">
            <span class="mstat-label">MAX COMBO</span>
            <span class="mstat-val pink">x${stats.maxCombo}</span>
          </div>
          <div class="mstat-box">
            <span class="mstat-label">SISA NYAWA</span>
            <span class="mstat-val red">${'❤️'.repeat(stats.remainingLives || 1)}</span>
          </div>
        </div>

        <!-- Hit Detail Breakdown -->
        <div class="victory-breakdown-row">
          <span class="vbreak-item perfect">PERFECT: ${stats.perfectHits}</span>
          <span class="vbreak-item great">GREAT: ${stats.greatHits}</span>
          <span class="vbreak-item good">GOOD: ${stats.goodHits}</span>
          <span class="vbreak-item miss">MISS: ${stats.missHits}</span>
        </div>

        <!-- OFFICIAL KOMANG COMPETITION QR CLAIM CARD -->
        <div class="komang-qr-claim-card">
          <div class="kqc-left">
            <canvas id="komang-victory-qr-canvas" width="130" height="130"></canvas>
          </div>
          <div class="kqc-right">
            <span class="kqc-badge">🎁 KOMPETISI BERHADIAH RESMI</span>
            <div class="kqc-title">SCAN QR UNTUK DAFTAR NAMA & HP</div>
            <div class="kqc-score">Skor Standar: <strong>${(stats.compSession?.score || Math.round(stats.accuracy * 1000)).toLocaleString()} PTS / 100k</strong></div>
            <div class="kqc-buttons">
              <button class="btn-kqc-manual" id="btn-komang-manual-claim">✏️ Input di Layar</button>
              <button class="btn-kqc-lead" id="btn-komang-view-lead">🏆 Papan Peringkat</button>
            </div>
          </div>
        </div>

        <div class="modal-actions-row">
          <button class="btn-modal-retry" id="btn-komang-random-next" style="background:linear-gradient(135deg, #00f7ff 0%, #0088ff 100%); color:#000; font-weight:900;">
            <span>🎲</span> MAIN 45 DETIK LAIN (RANDOM)
          </button>
          <button class="btn-modal-retry" id="btn-komang-victory-retry">
            <span>↺</span> ULANG SEGMEN INI
          </button>
          <button class="btn-modal-home" id="btn-komang-victory-home">
            <span>🎵</span> PILIH LAGU LAIN
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Render scannable QR Code on modal
    setTimeout(() => {
      const qrCanvas = document.getElementById('komang-victory-qr-canvas');
      const session = stats.compSession || competitionLeaderboardService.getPendingSession();
      if (qrCanvas && session?.claimUrl) {
        qrCodeService.renderToCanvas(qrCanvas, session.claimUrl, {
          size: 130,
          padding: 8,
          darkColor: '#0a0518',
          lightColor: '#ffffff',
          showEmblem: false,
        });
      }
    }, 60);
  }

  // ----------------------------------------------------
  // SELALU ADA DI NADIMU (OST JUMBO) INTERACTIVE ENGINE
  // ----------------------------------------------------
  _templateNadimu() {
    const curMeasure = nadimuService.getCurrentMeasure();
    const curIdx = nadimuService.currentMeasureIndex;
    const isPlaying = nadimuService.isPlaying;
    const isTilesView = nadimuService.viewMode === 'TILES';

    const systems = [
      { id: 1, measures: [1, 2, 3, 4], label: 'Bait 1: C ➔ F ➔ Em ➔ Am ("Kala nanti badai...")' },
      { id: 2, measures: [5, 6, 7, 8], label: 'Bait 2: Dm ➔ G ➔ C ➔ G ("Andaikan saat itu...")' },
      { id: 3, measures: [9, 10, 11, 12], label: 'Reff: F ➔ G ➔ Em ➔ Am ("Sedikit demi sedikit...")' },
      { id: 4, measures: [13, 14, 15, 16], label: 'Klimaks: Dm ➔ G ➔ F ➔ C ("Selalu ada di nadimu...")' },
    ];

    const systemsHtml = systems.map(sys => {
      const measuresHtml = sys.measures.map(mNum => {
        const m = NADIMU_MEASURES.find(item => item.measure === mNum);
        if (!m) return '';
        const isActive = m.index === curIdx;
        const isDone = nadimuService.evaluatedMeasures.has(m.index);

        return `
          <div class="komang-measure-box ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}" data-measure-idx="${m.index}">
            <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
              <span class="komang-m-chord">${m.chord}</span>
              <span class="komang-m-finger">${m.emoji} ${m.fingerCount}F</span>
            </div>
            <span class="komang-m-lyric" title="${m.lyric}">"${m.lyric}"</span>
            <span class="komang-m-notes">${m.notes}</span>
          </div>
        `;
      }).join('');

      return `
        <div class="komang-score-system" data-system="${sys.id}">
          <div class="komang-system-header">
            <span>BAR ${sys.measures[0]} - ${sys.measures[sys.measures.length - 1]} • ${sys.label}</span>
            <span>𝄞 C Major</span>
          </div>
          <div class="komang-system-measures">
            ${measuresHtml}
          </div>
        </div>
      `;
    }).join('');

    const activeKeys = curMeasure?.keys || [];
    const whiteKeys = NADIMU_PIANO_KEYS.filter(k => !k.isBlack);
    const whiteKeysHtml = whiteKeys.map(k => {
      const isTarget = activeKeys.includes(k.note);
      return `
        <div class="komang-white-key ${isTarget ? 'target-chord-key' : ''}" data-note="${k.note}">
          <span>${k.label}</span>
        </div>
      `;
    }).join('');

    return `
      <div class="komang-screen tv-landscape">
        <!-- TOP HEADER: TV Friendly Bar -->
        <div class="komang-header">
          <div style="display:flex; align-items:center; gap:12px;">
            <button class="btn-icon-back" id="btn-back-home" title="Kembali ke Pilih Lagu">‹</button>
            <div>
              <div class="komang-title">
                <span class="komang-logo-pulse">🎵</span> SELALU ADA DI NADIMU — OST JUMBO
              </div>
              <span class="komang-subtitle">
                ${nadimuService.sessionMode === '30S_RANDOM'
        ? `⏱️ SESI 45 DETIK (BAGIAN RANDOM: ${nadimuService.currentSegment?.title || 'Bait 1'}) • 78 BPM`
        : '🎵 FULL SONG • OST JUMBO • KEY C MAJOR • 78 BPM'}
              </span>
            </div>
          </div>

          <div class="komang-header-actions">
            <!-- 45S vs Full Song switcher -->
            <div class="komang-view-switcher">
              <button class="komang-view-btn ${nadimuService.sessionMode === '30S_RANDOM' ? 'active' : ''}" id="btn-nadimu-mode-30s" title="Main cepat 30 detik bagian acak lagu Nadimu">
                🎲 30s
              </button>
              <button class="komang-view-btn ${nadimuService.sessionMode === 'FULL_SONG' ? 'active' : ''}" id="btn-nadimu-mode-full" title="Main lagu penuh dari awal sampai akhir">
                🎵 Penuh
              </button>
            </div>

            <!-- View Switcher (Tiles vs Sheet) -->
            <div class="komang-view-switcher">
              <button class="komang-view-btn ${isTilesView ? 'active' : ''}" id="btn-nadimu-view-tiles">
                🎹 Tiles
              </button>
              <button class="komang-view-btn ${!isTilesView ? 'active' : ''}" id="btn-nadimu-view-sheet">
                🎼 Partitur
              </button>
            </div>

            <!-- Mode Santai vs Nyawa -->
            <div class="hud-pill-group">
              <button class="mode-pill ${nadimuService.isNoFail ? 'active' : ''}" id="btn-nadimu-nofail-toggle" title="Klik untuk beralih antara Mode Santai atau Tantangan">
                ${nadimuService.isNoFail ? '🛡️ Santai' : '🎮 5 Nyawa'}
              </button>
            </div>
          </div>
        </div>

        <!-- MAIN 3-COLUMN TV STAGE -->
        <div class="komang-tv-stage">
          
          <!-- 1. LEFT COLUMN: SCORE, SPEED, LYRIC KARAOKE CARD & CONTROLS -->
          <div class="komang-left-col">
            <!-- Score & Combo Big Card -->
            <div class="komang-tv-score-card">
              <div class="tv-score-row">
                <div class="tv-stat-block">
                  <span class="tv-score-label">SKOR ANDA</span>
                  <span class="tv-score-num" id="nadimu-cur-score">${nadimuService.score} PTS</span>
                </div>
                <div class="tv-stat-block">
                  <span class="tv-score-label">COMBO</span>
                  <span class="tv-combo-num" id="nadimu-cur-combo">x${nadimuService.combo} COMBO</span>
                </div>
              </div>
              <div class="tv-lives-row">
                <span class="tv-lives-label">STATUS NYAWA:</span>
                <span class="tv-hearts-display" id="nadimu-hearts-row">
                  ${nadimuService.isNoFail ? '<span style="font-size:12px; color:#00ffaa; font-weight:900; font-family:var(--font-display);">🛡️ BEBAS</span>' : `${'❤️'.repeat(Math.max(0, nadimuService.lives))}${'🖤'.repeat(Math.max(0, nadimuService.maxLives - nadimuService.lives))}`}
                </span>
                <span class="multiplier-pill" id="nadimu-multiplier-pill">⚡ MULTIPLIER 1.0x</span>
              </div>
            </div>

            <!-- Speed Selector -->
            <div class="komang-speed-selector">
              <div class="speed-header">
                <span class="speed-title">KECEPATAN UBIN (SPEED)</span>
                <span class="speed-value" id="nadimu-speed-val">${nadimuService.speedMultiplier.toFixed(2)}x</span>
              </div>
              <div class="speed-chips-row">
                <button class="speed-chip ${nadimuService.speedMultiplier === 0.75 ? 'active' : ''}" data-speed="0.75" data-song="nadimu" title="Sangat Santai & Pelan">🐢 Santai (0.75x)</button>
                <button class="speed-chip ${nadimuService.speedMultiplier === 1.0 ? 'active' : ''}" data-speed="1.0" data-song="nadimu" title="Tenang & Pas (Rekomendasi)">🌿 Normal (1.0x)</button>
                <button class="speed-chip ${nadimuService.speedMultiplier === 1.3 ? 'active' : ''}" data-speed="1.3" data-song="nadimu" title="Lebih Cepat">⚡ Cepat (1.3x)</button>
              </div>
            </div>

            <!-- Big Karaoke & Chord Visualizer Card -->
            <div class="komang-karaoke-card">
              <div class="karaoke-card-header">
                <span class="karaoke-badge">
                  ${nadimuService.sessionMode === '30S_RANDOM' ? `🎲 45s: ${nadimuService.currentSegment?.title || 'Bait 1'}` : '🎤 LIRIK SEKARANG'}
                </span>
                <span class="measure-indicator" id="nadimu-measure-indicator">Bar ${curMeasure.measure} / 16</span>
              </div>

              <div class="karaoke-body">
                <div class="komang-chord-badge" id="nadimu-cur-chord" style="color:#00f7ff; border-color:#00f7ff; text-shadow:0 0 15px rgba(0,247,255,0.6);">
                  ${curMeasure.chord}
                </div>
                <div class="komang-big-lyric" id="nadimu-cur-lyric">
                  "${curMeasure.lyric}"
                </div>
                <div class="komang-next-lyric-cue" id="nadimu-next-preview">
                  👉 Selanjutnya: ${nadimuService.getNextMeasure().chord} ("${nadimuService.getNextMeasure().lyric}")
                </div>
              </div>

              <div class="komang-chord-desc-bar" id="nadimu-cur-desc">
                ${curMeasure.chordDesc}
              </div>
            </div>

            <!-- Player & Progress Card -->
            <div class="komang-player-card">
              <div class="komang-transport-row">
                <span style="font-size:10.5px; font-weight:800; color:var(--ice-blue); letter-spacing:0.5px; font-family:var(--font-display);">🎚️ PENGATURAN SUARA & SYNC</span>
                <span class="komang-time-badge" style="font-size:10px;">C Major • 78 BPM</span>
              </div>
              <div class="komang-progress-bar" id="nadimu-progress-bar">
                <div class="komang-progress-fill" id="nadimu-progress-fill" style="background:linear-gradient(90deg, #14b3d4, #fbb040);"></div>
              </div>
            </div>

            <!-- 4. PANDUAN PINTASAN & INPUT (Nadimu) -->
            <div class="komang-controls-card">
              <div class="controls-card-header">
                <span>🎮</span> PANDUAN PINTASAN & INPUT
              </div>
              <div class="controls-guide-grid">
                <div class="cguide-item">
                  <span class="cguide-key">1 / D</span>
                  <span class="cguide-desc">☝️ C (1 Jari)</span>
                </div>
                <div class="cguide-item">
                  <span class="cguide-key">2 / F</span>
                  <span class="cguide-desc">✌️ F (2 Jari)</span>
                </div>
                <div class="cguide-item">
                  <span class="cguide-key">3 / J</span>
                  <span class="cguide-desc">🤟 Em (3 Jari)</span>
                </div>
                <div class="cguide-item">
                  <span class="cguide-key">4 / K</span>
                  <span class="cguide-desc">🖐️ G (4 Jari)</span>
                </div>
              </div>
              <div class="controls-tips-row">
                <span>⌨️ Ketuk Tuts</span>
                <span>•</span>
                <span>📹 Kamera 1-5 Jari</span>
                <span>•</span>
                <span>⏸️ Esc: Jeda</span>
              </div>
            </div>

          </div>

          <!-- 2. CENTER COLUMN: PIANO TILES HIGHWAY -->
          <div class="komang-center-col">
            ${isTilesView ? `
              <div class="komang-highway-wrapper">
                <div class="highway-top-header">
                  <span>🎵 PIANO TILES RHYTHM HIGHWAY (4 JALUR NADA)</span>
                  <div style="display:flex; align-items:center; gap:8px;">
                    <button class="komang-offset-btn" id="btn-toggle-piano-height" title="Ubah ukuran tuts piano (Panjang, Ekstra Panjang, Kompak)">
                      🎹 Tuts: <span id="label-piano-height">${nadimuTilesEngine.getKeyHeightLabel ? nadimuTilesEngine.getKeyHeightLabel() : 'Panjang (35%)'}</span>
                    </button>
                    <span class="highway-hint-keys">Ketuk tuts atau kamera tangan ✋</span>
                  </div>
                </div>
                <div class="komang-highway-stage">
                  <canvas id="nadimu-tiles-canvas"></canvas>
                </div>
              </div>
            ` : `
              <div class="komang-sheet-wrapper">
                <div class="komang-score-card">
                  <div class="score-card-header">
                    <span class="score-title">🎼 PARTITUR SELALU ADA DI NADIMU (C MAJOR • 78 BPM)</span>
                  </div>
                  <div style="display:flex; flex-direction:column; gap:8px;" id="nadimu-score-container">
                    ${systemsHtml}
                  </div>
                </div>

                <div class="komang-piano-card">
                  <div class="piano-card-header">
                    <span>🎹 VIRTUAL PIANO (Akor ${curMeasure.chord} • Tuts Menyala Cyan)</span>
                  </div>
                  <div class="komang-piano-keyboard" id="nadimu-piano-keyboard">
                    ${whiteKeysHtml}
                  </div>
                </div>
              </div>
            `}
          </div>

          <!-- 3. RIGHT COLUMN: LIVE CAMERA & HERO PLAY CONTROLS -->
          <div class="komang-right-col">
            <div class="camera-viewport komang-camera-box">
              <video id="camera-video" autoplay playsinline muted></video>
              <canvas id="camera-canvas"></canvas>
              <canvas id="tracking-canvas"></canvas>
              <button class="btn-camera-bg-toggle ${virtualBackgroundService.isEnabled ? 'active' : ''}" id="btn-camera-bg-toggle" type="button" title="Ganti Mode Latar Kamera (Flash Tech / Asli)">
                ${virtualBackgroundService.isEnabled ? '✨ Latar: Flash Tech' : '📷 Latar: Asli'}
              </button>
              <div class="camera-guide-frame"></div>
              <div class="camera-guidance-pill" id="nadimu-guidance-pill" style="border-color:#14b3d4; color:#14b3d4;">
                TUNJUKKAN ${curMeasure.fingerCount} JARI UNTUK ${curMeasure.chord} ${curMeasure.emoji}
              </div>
              ${this._templateCameraOverlay()}
            </div>

            <div class="komang-live-status-pill">
              <span class="live-dot waiting" id="nadimu-live-dot"></span>
              <span class="live-text" id="nadimu-live-text">Kamera: Tunjukkan ${curMeasure.fingerCount} Jari ${curMeasure.emoji}</span>
            </div>

            <!-- PROMINENT HERO PLAY ACTION CARD -->
            <div class="komang-hero-cta-card">
              <button class="komang-hero-play-btn ${isPlaying ? 'playing' : ''}" id="btn-nadimu-play-toggle">
                <span class="hero-play-icon">${isPlaying ? '⏸️' : '▶️'}</span>
                <div class="hero-play-info">
                  <span class="hero-play-main" id="nadimu-play-label">${isPlaying ? 'JEDA PERMAINAN' : (nadimuService.sessionMode === '30S_RANDOM' ? 'MAIN 30 DETIK' : 'PUTAR LAGU PENUH')}</span>
                  <span class="hero-play-sub">${isPlaying ? 'Klik untuk berhenti sejenak' : 'Ketuk tombol atau langsung gunakan kamera'}</span>
                </div>
              </button>

              <div class="hero-cta-quick-actions">
                <button class="btn-hero-util" id="btn-nadimu-random-segment" title="Pilih bagian lagu acak baru">
                  🎲 Ganti Bagian
                </button>
                <button class="btn-hero-util" id="btn-nadimu-reset" title="Ulang dari awal bagian ini">
                  ↺ Ulang
                </button>
                <span class="hero-time-badge" id="nadimu-time-display">
                  ${nadimuService.sessionMode === '30S_RANDOM' ? '⏱️ SISA: 30s' : '0:00 / 4:10'}
                </span>
              </div>
            </div>

            <!-- Quick fallback buttons for touch/mouse -->
            <div class="komang-quick-fbtns-row">
              <button class="komang-fbtn ${curMeasure.fingerCount === 1 ? 'active' : ''}" data-song="nadimu" data-fingers="1" data-chord="C">
                <span>☝️ 1: C</span>
              </button>
              <button class="komang-fbtn ${curMeasure.fingerCount === 2 ? 'active' : ''}" data-song="nadimu" data-fingers="2" data-chord="F">
                <span>✌️ 2: F</span>
              </button>
              <button class="komang-fbtn ${curMeasure.fingerCount === 3 ? 'active' : ''}" data-song="nadimu" data-fingers="3" data-chord="Em">
                <span>🤟 3: Em</span>
              </button>
              <button class="komang-fbtn ${curMeasure.fingerCount === 4 ? 'active' : ''}" data-song="nadimu" data-fingers="4" data-chord="G">
                <span>🖐️ 4: G</span>
              </button>
              <button class="komang-fbtn wildcard-fbtn ${curMeasure.fingerCount === 5 ? 'active' : ''}" data-song="nadimu" data-fingers="5" data-chord="WILDCARD" title="5 Jari: Wildcard Bebas">
                <span>✨ 5: SAKTI</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    `;
  }

  _setupNadimuListeners() {
    const tilesCanvas = document.getElementById('nadimu-tiles-canvas');
    if (tilesCanvas) {
      nadimuTilesEngine.init(tilesCanvas, nadimuService);
      nadimuService.setTilesEngine(nadimuTilesEngine);
      if (nadimuService.isPlaying) {
        nadimuTilesEngine.start();
      }
    }

    this._renderNadimuHandGuide();

    nadimuService.onMeasureChanged = (measure, idx) => {
      this._updateNadimuUI(measure, idx);
      this._renderNadimuHandGuide(measure);
    };

    nadimuService.onTimelineTick = (data) => {
      this._onNadimuTimelineTick(data);
    };

    nadimuService.onChordHit = (data) => {
      this._onNadimuChordHit(data);
      this._renderNadimuHandGuide(data.measure, data.measure.fingerCount, true);
    };

    nadimuService.onLifeLost = (data) => {
      this._onNadimuLifeLost(data);
    };

    nadimuService.onLifeRecovered = (data) => {
      const heartsRow = document.getElementById('nadimu-hearts-row');
      if (heartsRow && !nadimuService.isNoFail) {
        const activeHearts = '❤️'.repeat(Math.max(0, data.lives));
        const deadHearts = '🖤'.repeat(Math.max(0, data.maxLives - data.lives));
        heartsRow.innerHTML = `${activeHearts}${deadHearts}`;
      }
    };

    nadimuService.onGameOver = (result) => {
      this._showNadimuGameOverModal(result);
    };

    nadimuService.onSongFinished = (stats) => {
      this._showNadimuVictoryModal(stats);
    };

    nadimuService.onAudioStateChanged = (isPlaying) => {
      const label = document.getElementById('nadimu-play-label');
      if (label) {
        label.innerText = isPlaying ? '⏸️ JEDA' : '▶️ PUTAR LAGU';
      }
      if (isPlaying && nadimuTilesEngine) {
        nadimuTilesEngine.start();
      } else if (!isPlaying && nadimuTilesEngine) {
        nadimuTilesEngine.stop();
      }
    };

    this._updateNadimuUI(nadimuService.getCurrentMeasure(), nadimuService.currentMeasureIndex);
  }

  _renderNadimuHandGuide(curMeasure = null, detectedFingers = 0, isMatched = false) {
    const guideCanvas = document.getElementById('nadimu-hand-guide-canvas');
    if (!guideCanvas) return;
    const m = curMeasure || nadimuService.getCurrentMeasure();
    if (!m) return;

    const targetFingers = m.fingerCount;
    const matched = isMatched || (this.lastDetectedFingers === targetFingers);
    const stateKey = `${m.chord}_${targetFingers}_${detectedFingers}_${matched}`;

    if (this._lastNadimuHandGuideKey === stateKey) return;
    this._lastNadimuHandGuideKey = stateKey;

    HandVisualizer.drawTVHandGuide(guideCanvas, targetFingers, detectedFingers, m.chord, matched);

    const badge = document.getElementById('nadimu-hand-target-badge');
    if (badge) {
      badge.innerText = `${m.emoji} ${m.fingerCount} JARI`;
      badge.style.color = matched ? '#00ffaa' : '#00f7ff';
    }

    const chordNameEl = document.getElementById('nadimu-guide-chord-name');
    if (chordNameEl) {
      chordNameEl.innerHTML = `AKOR: <strong style="color:${matched ? '#00ffaa' : '#00f7ff'};">${m.chord}</strong> (${m.label}) ${matched ? '✔ COCOK!' : ''}`;
    }

    const tags = document.querySelectorAll('#nadimu-hand-guide-card .guide-tag');
    tags.forEach(t => {
      const isTarget = t.innerText.startsWith(`${targetFingers}F`);
      t.classList.toggle('active', isTarget);
    });
  }

  _updateNadimuUI(curMeasure, idx) {
    if (!curMeasure) return;

    const chordEl = document.getElementById('nadimu-cur-chord');
    if (chordEl) chordEl.innerText = curMeasure.chord;

    const lyricEl = document.getElementById('nadimu-cur-lyric');
    if (lyricEl) lyricEl.innerText = `"${curMeasure.lyric}"`;

    const descEl = document.getElementById('nadimu-cur-desc');
    if (descEl) descEl.innerText = curMeasure.chordDesc;

    const guidancePill = document.getElementById('nadimu-guidance-pill');
    if (guidancePill) {
      guidancePill.innerText = `TUNJUKKAN ${curMeasure.fingerCount} JARI UNTUK ${curMeasure.chord} ${curMeasure.emoji}`;
    }

    const indicator = document.getElementById('nadimu-measure-indicator');
    if (indicator) {
      indicator.innerText = `Bar ${curMeasure.measure} / 16`;
    }

    this._renderNadimuHandGuide(curMeasure);

    // Highlight active measure box on sheet music
    const mBoxes = document.querySelectorAll('#nadimu-score-container .komang-measure-box');
    mBoxes.forEach(box => {
      const i = parseInt(box.dataset.measureIdx, 10);
      const isCur = i === idx;
      const isDone = nadimuService.evaluatedMeasures.has(i);
      box.classList.toggle('active', isCur);
      box.classList.toggle('done', isDone);
    });

    // Piano key highlight
    const activeKeys = curMeasure.keys || [];
    const pKeys = document.querySelectorAll('#nadimu-piano-keyboard .komang-white-key');
    pKeys.forEach(k => {
      const note = k.dataset.note;
      k.classList.toggle('target-chord-key', activeKeys.includes(note));
    });

    // Quick finger buttons
    const fbtns = document.querySelectorAll('.komang-fbtn[data-song="nadimu"]');
    fbtns.forEach(btn => {
      const f = parseInt(btn.dataset.fingers, 10);
      btn.classList.toggle('active', f === curMeasure.fingerCount);
    });
  }

  _onNadimuTimelineTick(data) {
    const now = performance.now();
    if (!this._lastNadimuTickUiTime) this._lastNadimuTickUiTime = 0;

    const curSec = data.is30sSession ? Math.ceil(data.sessionRemainingSec) : Math.floor(data.currentTimeSec || data.songTime);
    if (this._lastNadimuDisplaySec !== curSec) {
      this._lastNadimuDisplaySec = curSec;
      const timeEl = document.getElementById('nadimu-time-display');
      if (timeEl) {
        if (data.is30sSession) {
          timeEl.innerText = `⏱️ SISA: ${curSec}s`;
        } else {
          const curM = Math.floor((data.currentTimeSec || data.songTime) / 60);
          const curS = Math.floor((data.currentTimeSec || data.songTime) % 60);
          timeEl.innerText = `${curM}:${curS.toString().padStart(2, '0')} / 4:43`;
        }
      }
    }

    if (now - this._lastNadimuTickUiTime > 80) {
      this._lastNadimuTickUiTime = now;

      const fillEl = document.getElementById('nadimu-progress-fill');
      if (fillEl) {
        if (data.is30sSession) {
          fillEl.style.width = `${(data.sessionProgress * 100).toFixed(1)}%`;
        } else if (data.totalDurationSec > 0) {
          const pct = Math.min(100, Math.max(0, (data.songTime / data.totalDurationSec) * 100));
          fillEl.style.width = `${pct}%`;
        }
      }

      const nextPreviewEl = document.getElementById('nadimu-next-preview');
      if (nextPreviewEl && nadimuService) {
        const nxt = nadimuService.getNextMeasure();
        if (nxt) {
          nextPreviewEl.innerText = `👉 Selanjutnya: ${nxt.chord} (${nxt.emoji} ${nxt.fingerCount}F) • "${nxt.lyric}"`;
        }
      }
    }
  }

  _onNadimuChordHit(data) {
    if (this.particleSystem) {
      this.particleSystem.triggerPulse(0.45);
    }

    const liveDot = document.getElementById('nadimu-live-dot');
    const liveText = document.getElementById('nadimu-live-text');
    if (liveDot && liveText) {
      liveDot.className = 'live-dot matched';
      liveText.innerText = `Terdeteksi: ${data.measure.chord} [${data.rating} HIT! +${data.earnedPoints} pts] ⭐`;
      setTimeout(() => {
        if (liveDot) liveDot.className = 'live-dot waiting';
      }, 350);
    }

    const scoreEl = document.getElementById('nadimu-cur-score');
    if (scoreEl) scoreEl.innerText = `${data.score} PTS`;

    const comboEl = document.getElementById('nadimu-cur-combo');
    if (comboEl) comboEl.innerText = `x${data.combo} COMBO`;

    const multEl = document.getElementById('nadimu-multiplier-pill');
    if (multEl) {
      let mult = 1.0;
      if (data.combo >= 20) mult = 2.5;
      else if (data.combo >= 10) mult = 2.0;
      else if (data.combo >= 5) mult = 1.5;
      multEl.innerText = `⚡ MULTIPLIER ${mult.toFixed(1)}x`;
      multEl.classList.toggle('high-mult', mult >= 2.0);
    }

    const heartsRow = document.getElementById('nadimu-hearts-row');
    if (heartsRow && data.lives !== undefined && !nadimuService.isNoFail) {
      const activeHearts = '❤️'.repeat(Math.max(0, data.lives));
      const deadHearts = '🖤'.repeat(Math.max(0, nadimuService.maxLives - data.lives));
      heartsRow.innerHTML = `${activeHearts}${deadHearts}`;
    }
  }

  _onNadimuLifeLost(data) {
    const heartsRow = document.getElementById('nadimu-hearts-row');
    if (heartsRow) {
      const activeHearts = '❤️'.repeat(Math.max(0, data.lives));
      const deadHearts = '🖤'.repeat(Math.max(0, data.maxLives - data.lives));
      heartsRow.innerHTML = `${activeHearts}${deadHearts}`;
      heartsRow.classList.add('heart-damage');
      setTimeout(() => heartsRow.classList.remove('heart-damage'), 350);
    }

    const comboEl = document.getElementById('nadimu-cur-combo');
    if (comboEl) comboEl.innerText = 'x0 COMBO';

    const multEl = document.getElementById('nadimu-multiplier-pill');
    if (multEl) {
      multEl.innerText = '⚡ MULTIPLIER 1.0x';
      multEl.classList.remove('high-mult');
    }

    const liveDot = document.getElementById('nadimu-live-dot');
    const liveText = document.getElementById('nadimu-live-text');
    if (liveDot && liveText) {
      liveDot.className = 'live-dot miss';
      liveText.innerText = 'MISS! Ubin Terlewat -1 Nyawa 💔';
      setTimeout(() => {
        if (liveDot) liveDot.className = 'live-dot waiting';
      }, 450);
    }
  }

  _showNadimuGameOverModal(result) {
    const existing = document.getElementById('nadimu-gameover-backdrop');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.className = 'komang-modal-backdrop';
    modal.id = 'nadimu-gameover-backdrop';
    modal.innerHTML = `
      <div class="komang-modal-dialog gameover-dialog">
        <div class="modal-icon-header">💔</div>
        <h2 class="modal-title-gameover">LAGU TERHENTI</h2>
        <p class="modal-subtitle-gameover">Kehabisan Nyawa • Selalu Ada di Nadimu</p>

        <!-- Penjelasan Ramah & Panduan Bermain -->
        <div class="gameover-notice-card">
          <div class="gameover-notice-header">
            <span>ℹ️</span> <span>MENGAPA PERMAINAN BERHENTI?</span>
          </div>
          <p class="gameover-notice-desc">
            Nyawa habis karena ada <strong>ubin balok yang meluncur melewati garis hit</strong> tanpa sempat tertekan atau terdeteksi oleh kamera (Total: <strong>${result.missHits || 5} ubin</strong>).
          </p>
          <div class="gameover-notice-tip">
            <span>🛡️</span> <span>Ingin bermain santai tanpa batasan nyawa? Gunakan tombol <strong>MAIN SANTAI</strong>!</span>
          </div>
        </div>

        <div class="modal-stats-grid">
          <div class="mstat-box">
            <span class="mstat-label">TOTAL SKOR</span>
            <span class="mstat-val gold">${result.score} PTS</span>
          </div>
          <div class="mstat-box">
            <span class="mstat-label">AKURASI</span>
            <span class="mstat-val cyan">${result.accuracyPct}%</span>
          </div>
          <div class="mstat-box">
            <span class="mstat-label">MAX COMBO</span>
            <span class="mstat-val pink">x${result.maxCombo}</span>
          </div>
          <div class="mstat-box">
            <span class="mstat-label">MISS</span>
            <span class="mstat-val red">${result.missHits}</span>
          </div>
        </div>

        <div class="modal-actions-row">
          <button class="btn-modal-hero" id="btn-nadimu-gameover-retry">
            <span>↺</span> ULANG SEGMEN INI
          </button>
          <button class="btn-modal-secondary" id="btn-nadimu-random-next">
            <span>🎲</span> COBA 30s LAIN
          </button>
          <button class="btn-modal-nofail" id="btn-nadimu-gameover-nofail">
            <span>🛡️</span> MAIN SANTAI (NO-FAIL)
          </button>
          <button class="btn-modal-home" id="btn-nadimu-gameover-home">
            <span>🎵</span> PILIH LAGU LAIN
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  _showNadimuVictoryModal(stats) {
    try {
      confetti({
        particleCount: 220,
        spread: 110,
        origin: { y: 0.5 },
      });
    } catch (e) { }

    const existing = document.getElementById('nadimu-victory-backdrop');
    if (existing) existing.remove();

    const gradeColorMap = {
      'S+': '#ffd700',
      'S': '#00f7ff',
      'A': '#00ff88',
      'B': '#a855f7',
      'C': '#ff7eb3',
    };
    const gradeColor = gradeColorMap[stats.grade] || '#00f7ff';

    // Create official competition session for leaderboard
    const compSession = competitionLeaderboardService.createPendingSession({
      songId: 'NADIMU',
      songTitle: '🎵 Selalu Ada di Nadimu - OST Jumbo',
      songBadge: '🎵 NADIMU',
      songEmoji: '🎵',
      totalNotes: Math.max(12, stats.perfectHits + stats.greatHits + stats.goodHits + stats.missHits),
      perfectCount: stats.perfectHits,
      greatCount: stats.greatHits,
      goodCount: stats.goodHits,
      badCount: 0,
      missCount: stats.missHits,
      maxCombo: stats.maxCombo,
      scorePct: stats.accuracyPct,
      grade: stats.grade,
    });
    stats.compSession = compSession;

    const modal = document.createElement('div');
    modal.className = 'komang-modal-backdrop';
    modal.id = 'nadimu-victory-backdrop';
    modal.innerHTML = `
      <div class="komang-modal-dialog victory-dialog">
        <div class="modal-confetti-badge">🎉 ${nadimuService.sessionMode === '30S_RANDOM' ? 'SESI 45 DETIK SELESAI!' : 'LAGU SELESAI!'} 🎉</div>
        <h2 class="modal-title-victory" style="color:#00f7ff;">VICTORY CLEAR!</h2>
        <p class="modal-subtitle-victory">
          ${nadimuService.sessionMode === '30S_RANDOM'
        ? `Bagian: <strong>${nadimuService.currentSegment?.title || 'Bait 1'}</strong> ("${nadimuService.currentSegment?.lyricHint || ''}")`
        : 'Selalu Ada di Nadimu • OST Jumbo • Key C Major'}
        </p>

        <!-- Grade & Star Celebration Banner -->
        <div class="victory-grade-banner">
          <div class="victory-grade-circle" style="color:${gradeColor}; border-color:${gradeColor}; box-shadow:0 0 35px ${gradeColor}88;">
            ${stats.grade || 'A'}
          </div>
          <div class="victory-stars-box">
            <div class="victory-stars-row">
              ${'⭐'.repeat(stats.stars || 4)}
            </div>
            <span class="clear-pill">✨ TINGKAT: ${stats.grade === 'S' || stats.grade === 'S+' ? 'MASTER PIANIS' : 'PIANIS MAHIR'}</span>
          </div>
        </div>

        <div class="modal-stats-grid">
          <div class="mstat-box">
            <span class="mstat-label">TOTAL SKOR</span>
            <span class="mstat-val gold">${stats.score} PTS</span>
          </div>
          <div class="mstat-box">
            <span class="mstat-label">AKURASI</span>
            <span class="mstat-val cyan">${stats.accuracyPct}%</span>
          </div>
          <div class="mstat-box">
            <span class="mstat-label">MAX COMBO</span>
            <span class="mstat-val pink">x${stats.maxCombo}</span>
          </div>
          <div class="mstat-box">
            <span class="mstat-label">SISA NYAWA</span>
            <span class="mstat-val red">${'❤️'.repeat(stats.lives || nadimuService.lives || 1)}</span>
          </div>
        </div>

        <div class="victory-breakdown-row">
          <span class="vbreak-item perfect">PERFECT: ${stats.perfectHits}</span>
          <span class="vbreak-item great">GREAT: ${stats.greatHits}</span>
          <span class="vbreak-item good">GOOD: ${stats.goodHits}</span>
          <span class="vbreak-item miss">MISS: ${stats.missHits}</span>
        </div>

        <!-- OFFICIAL COMPETITION QR CLAIM CARD -->
        <div class="komang-qr-claim-card" style="border-color:#00f7ff;">
          <div class="kqc-left">
            <canvas id="nadimu-victory-qr-canvas" width="130" height="130"></canvas>
          </div>
          <div class="kqc-right">
            <span class="kqc-badge" style="background:#00f7ff; color:#060a14;">🎁 KOMPETISI BERHADIAH RESMI</span>
            <div class="kqc-title">SCAN QR UNTUK DAFTAR NAMA & HP</div>
            <div class="kqc-score">Skor Standar: <strong>${(compSession?.score || 90000).toLocaleString()} PTS / 100k</strong></div>
            <div class="kqc-buttons">
              <button class="btn-kqc-manual" id="btn-nadimu-manual-claim">✏️ Input di Layar</button>
              <button class="btn-kqc-lead" id="btn-nadimu-view-lead">🏆 Papan Peringkat</button>
            </div>
          </div>
        </div>

        <div class="modal-actions-row">
          <button class="btn-modal-retry" id="btn-nadimu-random-next" style="background:linear-gradient(135deg, #00f7ff 0%, #0088ff 100%); color:#000; font-weight:900;">
            <span>🎲</span> MAIN 45 DETIK LAIN (RANDOM)
          </button>
          <button class="btn-modal-retry" id="btn-nadimu-victory-retry">
            <span>↺</span> ULANG SEGMEN INI
          </button>
          <button class="btn-modal-home" id="btn-nadimu-victory-home">
            <span>🎵</span> PILIH LAGU LAIN
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    setTimeout(() => {
      const qrCanvas = document.getElementById('nadimu-victory-qr-canvas');
      if (qrCanvas && compSession?.claimUrl) {
        qrCodeService.renderToCanvas(qrCanvas, compSession.claimUrl, {
          size: 130,
          padding: 8,
          darkColor: '#0a0518',
          lightColor: '#ffffff',
          showEmblem: false,
        });
      }
    }, 60);
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

  // 0b. Virtual Background Toggle (Flash Tech / Kamera Asli)
  else if (e.target.closest('#btn-camera-bg-toggle')) {
    virtualBackgroundService.isEnabled = !virtualBackgroundService.isEnabled;
    const btns = document.querySelectorAll('#btn-camera-bg-toggle');
    btns.forEach(btn => {
      btn.innerHTML = virtualBackgroundService.isEnabled ? '✨ Latar: Flash Tech' : '📷 Latar: Asli';
      btn.classList.toggle('active', virtualBackgroundService.isEnabled);
    });
  }

  // 1. Home Buttons
  else if (e.target.closest('#btn-home-tracks')) {
    audioManager.init();
    gameEngine.setState(GAME_STATES.TRACK_SELECT);
  } else if (e.target.closest('#btn-home-play')) {
    audioManager.init();
    scoreManager.resetCampaign();
    const tempVideo = document.getElementById('camera-video');
    cameraService.requestCamera(tempVideo).catch(() => { });
    gameEngine.startRound(GAME_MODES.CLASSIC, 1);
  } else if (e.target.closest('#btn-home-timeattack')) {
    audioManager.init();
    const tempVideo = document.getElementById('camera-video');
    cameraService.requestCamera(tempVideo).catch(() => { });
    gameEngine.startRound(GAME_MODES.TIME_ATTACK, 4);
  } else if (e.target.closest('#btn-home-endless')) {
    audioManager.init();
    const tempVideo = document.getElementById('camera-video');
    cameraService.requestCamera(tempVideo).catch(() => { });
    gameEngine.startRound(GAME_MODES.ENDLESS, 1);
  } else if (e.target.closest('#btn-home-levels')) {
    audioManager.init();
    gameEngine.setState(GAME_STATES.LEVEL_SELECT);
  } else if (e.target.closest('#btn-home-free')) {
    audioManager.init();
    const tempVideo = document.getElementById('camera-video');
    cameraService.requestCamera(tempVideo).catch(() => { });
    gameEngine.setState(GAME_STATES.FREE_SYNTH);
  } else if (e.target.closest('#btn-home-calibration')) {
    audioManager.init();
    const tempVideo = document.getElementById('camera-video');
    cameraService.requestCamera(tempVideo).catch(() => { });
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
    cameraService.requestCamera(tempVideo).catch(() => { });
    jingleBellsService.setMode('GUIDE');
    gameEngine.setState(GAME_STATES.JINGLE_BELLS);
  } else if (e.target.closest('#btn-home-komang')) {
    audioManager.init();
    audioManager.resume();
    settingsManager.update('soundPreset', 'Acoustic Piano');
    audioManager.setPreset('Acoustic Piano');
    audioManager.loadPianoSamples().catch(() => { });
    const tempVideo = document.getElementById('camera-video');
    cameraService.requestCamera(tempVideo).catch(() => { });
    komangService.setMode('PLAY_ALONG');
    gameEngine.setState(GAME_STATES.KOMANG);
  } else if (e.target.closest('#btn-home-midi')) {
    audioManager.init();
    gameEngine.setState(GAME_STATES.MIDI_IMPORT);
  } else if (e.target.closest('#btn-home-leaderboard')) {
    audioManager.init();
    gameEngine.setState(GAME_STATES.LEADERBOARD);
  }

  // 1b. Pause Controls & Modal Actions
  else if (e.target.closest('#btn-hud-pause')) {
    gameEngine.togglePause();
  } else if (e.target.closest('#btn-pause-resume')) {
    gameEngine.resume();
  } else if (e.target.closest('#btn-pause-restart')) {
    gameEngine.resume();
    gameEngine.startRound(gameEngine.currentMode, gameEngine.currentLevel);
  } else if (e.target.closest('#btn-pause-quit')) {
    gameEngine.resume();
    gameEngine.finishRound(false);
    if (gameEngine.previousState === GAME_STATES.TRACK_SELECT) {
      gameEngine.setState(GAME_STATES.TRACK_SELECT);
    } else {
      gameEngine.setState(GAME_STATES.HOME);
    }
  }

  // 2. Navigation Back
  else if (e.target.closest('#btn-back-home')) {
    jingleBellsService.stop();
    komangService.stop();
    nadimuService.stop();

    if (
      gameEngine.currentState === GAME_STATES.KOMANG ||
      gameEngine.currentState === GAME_STATES.NADIMU ||
      gameEngine.currentState === GAME_STATES.JINGLE_BELLS
    ) {
      gameEngine.setState(GAME_STATES.TRACK_SELECT);
    } else if (gameEngine.currentState === GAME_STATES.LEADERBOARD) {
      if (gameEngine.previousState === GAME_STATES.TRACK_SELECT) {
        gameEngine.setState(GAME_STATES.TRACK_SELECT);
      } else {
        gameEngine.setState(GAME_STATES.HOME);
      }
    } else {
      gameEngine.setState(GAME_STATES.HOME);
    }
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
    if (gameEngine.previousState === GAME_STATES.TRACK_SELECT) {
      gameEngine.setState(GAME_STATES.TRACK_SELECT);
    } else {
      gameEngine.setState(GAME_STATES.HOME);
    }
  } else if (e.target.closest('#btn-result-leaderboard') || e.target.closest('#btn-result-open-lead')) {
    if (window.app) window.app._clearAutoAdvance();
    gameEngine.setState(GAME_STATES.LEADERBOARD);
  } else if (e.target.closest('#btn-result-direct-claim') || e.target.closest('#btn-komang-manual-claim')) {
    if (window.app) window.app._clearAutoAdvance();
    const existing = document.getElementById('komang-victory-backdrop');
    if (existing) existing.remove();
    gameEngine.setState(GAME_STATES.LEADERBOARD);
    setTimeout(() => {
      const manModal = document.getElementById('manual-input-modal');
      if (manModal) manModal.style.display = 'flex';
    }, 150);
  } else if (e.target.closest('#btn-komang-view-lead')) {
    const existing = document.getElementById('komang-victory-backdrop');
    if (existing) existing.remove();
    gameEngine.setState(GAME_STATES.LEADERBOARD);
  } else if (e.target.closest('#btn-result-share')) {
    const summary = scoreManager.getSummary();
    const shareBtn = document.getElementById('btn-result-share');
    if (shareBtn) shareBtn.innerText = '⌛ MENGIRIM...';
    onlineLeaderboardService.submitScore({
      playerName: scoreManager.playerName || 'CYBER_PLAYER',
      mode: summary.mode,
      level: summary.level,
      scorePct: summary.scorePct,
      maxCombo: summary.maxCombo,
      stars: summary.stars,
      rating: summary.rating
    }).then(res => {
      if (shareBtn) {
        shareBtn.innerText = res.success ? '✔ TERSIMPAN KE CLOUD!' : '💾 TERSIMPAN DI LOKAL';
        shareBtn.disabled = true;
      }
    });
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
    gameEngine.setState(GAME_STATES.TRACK_SELECT);
  }

  // 9. Komang Actions & Controls
  else if (e.target.closest('#btn-komang-play-pause')) {
    if (komangService.isPlaying) {
      komangService.pause();
      if (window.app) window.app.render();
    } else {
      // Clean up any open victory or gameover backdrop
      const vModal = document.getElementById('komang-victory-backdrop');
      if (vModal) vModal.remove();
      const gModal = document.getElementById('komang-gameover-backdrop');
      if (gModal) gModal.remove();

      // Suara selalu Grand Piano akustik merdu, bukan instrumen acak!
      settingsManager.update('soundPreset', 'Acoustic Piano');
      audioManager.setPreset('Acoustic Piano');

      // In 45s Random mode: if starting a new session or replaying after finished/game-over,
      // AUTOMATICALLY pick a new random segment! No need to press 'Acak' beforehand!
      const isFreshOrFinished = (
        komangService.isFinished ||
        komangService.isGameOver ||
        komangService.sessionRemainingSec <= 0.2 ||
        komangService.sessionElapsedSec === 0
      );

      if (komangService.sessionMode === '30S_RANDOM' && isFreshOrFinished) {
        komangService.pickRandomSegment(true);
        komangService.reset();
        if (window.app) window.app.render();
      } else if (isFreshOrFinished) {
        komangService.reset();
        if (window.app) window.app.render();
      }

      komangService.play();
      if (window.app) window.app.render();
    }
  } else if (e.target.closest('#btn-komang-reset')) {
    komangService.reset();
    if (window.app) window.app.render();
  } else if (e.target.closest('#btn-komang-mode-playalong')) {
    komangService.setMode('PLAY_ALONG');
    if (window.app) window.app.render();
  } else if (e.target.closest('#btn-komang-mode-guide')) {
    komangService.setMode('GUIDE');
    if (window.app) window.app.render();
  } else if (e.target.closest('#btn-komang-mode-tempo')) {
    komangService.setMode('TEMPO');
    if (window.app) window.app.render();
  } else if (e.target.closest('#komang-offset-minus')) {
    komangService.setAudioOffset(komangService.audioOffsetSec - 0.1);
    const offsetEl = document.getElementById('komang-offset-val');
    if (offsetEl) offsetEl.innerText = `${komangService.audioOffsetSec.toFixed(1)}s`;
  } else if (e.target.closest('#komang-offset-plus')) {
    komangService.setAudioOffset(komangService.audioOffsetSec + 0.1);
    const offsetEl = document.getElementById('komang-offset-val');
    if (offsetEl) offsetEl.innerText = `${komangService.audioOffsetSec.toFixed(1)}s`;
  } else if (e.target.closest('#komang-offset-zero')) {
    komangService.setAudioOffset(0.0);
    const offsetEl = document.getElementById('komang-offset-val');
    if (offsetEl) offsetEl.innerText = `0.0s`;
  } else if (e.target.closest('.komang-measure-box')) {
    const box = e.target.closest('.komang-measure-box');
    const idx = parseInt(box.dataset.measureIdx, 10);
    if (!isNaN(idx)) {
      komangService.jumpToMeasure(idx);
    }
  } else if (e.target.closest('.komang-white-key') || e.target.closest('.komang-black-key')) {
    const keyEl = e.target.closest('.komang-white-key') || e.target.closest('.komang-black-key');
    const note = keyEl.dataset.note;
    if (note) {
      audioManager.playPianoNote(note, { duration: 1.2, noPad: true, pureAcoustic: true });
      keyEl.classList.add('pressed');
      setTimeout(() => keyEl.classList.remove('pressed'), 180);
      const isNadimu = gameEngine.currentState === GAME_STATES.NADIMU;
      const svc = isNadimu ? nadimuService : komangService;
      const cur = svc.getCurrentMeasure();
      if (cur && cur.keys && cur.keys.includes(note)) {
        svc.triggerChord(svc.currentMeasureIndex, true);
      }
    }
  } else if (e.target.closest('.komang-fbtn')) {
    const fbtn = e.target.closest('.komang-fbtn');
    const fingers = parseInt(fbtn.dataset.fingers, 10);
    if (!isNaN(fingers)) {
      const isNadimu = fbtn.dataset.song === 'nadimu' || gameEngine.currentState === GAME_STATES.NADIMU;
      if (isNadimu) {
        if (nadimuTilesEngine) {
          nadimuTilesEngine.evaluateGesture(fingers, true);
        }
      } else {
        if (komangService.viewMode === 'TILES' && komangTilesEngine) {
          komangTilesEngine.evaluateGesture(fingers, true);
        } else {
          if (window.app) window.app.triggerVirtualGesture(fingers);
        }
      }
    }
  } else if (e.target.closest('#btn-komang-random-segment') || e.target.closest('#btn-komang-random-next')) {
    const vModal = document.getElementById('komang-victory-backdrop');
    if (vModal) vModal.remove();
    const gModal = document.getElementById('komang-gameover-backdrop');
    if (gModal) gModal.remove();

    audioManager.setPreset('Acoustic Piano');
    komangService.pickRandomSegment(true);
    komangService.reset();
    komangService.play();
    if (window.app) window.app.render();
  } else if (e.target.closest('#btn-nadimu-play-toggle')) {
    if (nadimuService.isPlaying) {
      nadimuService.pause();
      if (window.app) window.app.render();
    } else {
      const vModal = document.getElementById('nadimu-victory-backdrop');
      if (vModal) vModal.remove();
      const gModal = document.getElementById('nadimu-gameover-backdrop');
      if (gModal) gModal.remove();

      settingsManager.update('soundPreset', 'Acoustic Piano');
      audioManager.setPreset('Acoustic Piano');

      const isFreshOrFinished = (
        nadimuService.isFinished ||
        nadimuService.isGameOver ||
        nadimuService.sessionRemainingSec <= 0.2 ||
        nadimuService.sessionElapsedSec === 0
      );

      if (nadimuService.sessionMode === '30S_RANDOM' && isFreshOrFinished) {
        nadimuService.pickRandomSegment(true);
        nadimuService.reset();
        if (window.app) window.app.render();
      } else if (isFreshOrFinished) {
        nadimuService.reset();
        if (window.app) window.app.render();
      }

      nadimuService.play();
      if (window.app) window.app.render();
    }
  } else if (e.target.closest('#btn-nadimu-random-segment') || e.target.closest('#btn-nadimu-random-next')) {
    const vModal = document.getElementById('nadimu-victory-backdrop');
    if (vModal) vModal.remove();
    const gModal = document.getElementById('nadimu-gameover-backdrop');
    if (gModal) gModal.remove();

    audioManager.setPreset('Acoustic Piano');
    nadimuService.pickRandomSegment(true);
    nadimuService.stop();
    nadimuService.play();
    if (window.app) window.app.render();
  } else if (e.target.closest('#btn-nadimu-reset')) {
    audioManager.setPreset('Acoustic Piano');
    nadimuService.stop();
    nadimuService.play();
    if (window.app) window.app.render();
  } else if (e.target.closest('#btn-nadimu-mode-30s')) {
    nadimuService.setSessionMode('30S_RANDOM');
    nadimuService.stop();
    if (window.app) window.app.render();
  } else if (e.target.closest('#btn-nadimu-mode-full')) {
    nadimuService.setSessionMode('FULL_SONG');
    nadimuService.stop();
    if (window.app) window.app.render();
  } else if (e.target.closest('#btn-nadimu-view-tiles')) {
    nadimuService.viewMode = 'TILES';
    if (window.app) window.app.render();
  } else if (e.target.closest('#btn-nadimu-view-sheet')) {
    nadimuService.viewMode = 'SHEET';
    if (window.app) window.app.render();
  } else if (e.target.closest('#btn-nadimu-nofail-toggle')) {
    nadimuService.setNoFail(!nadimuService.isNoFail);
    if (window.app) window.app.render();
  } else if (e.target.closest('#btn-nadimu-gameover-retry') || e.target.closest('#btn-nadimu-victory-retry')) {
    const vModal = document.getElementById('nadimu-victory-backdrop');
    if (vModal) vModal.remove();
    const gModal = document.getElementById('nadimu-gameover-backdrop');
    if (gModal) gModal.remove();

    audioManager.setPreset('Acoustic Piano');
    nadimuService.pickRandomSegment(true);
    nadimuService.stop();
    nadimuService.play();
    if (window.app) window.app.render();
  } else if (e.target.closest('#btn-nadimu-gameover-nofail')) {
    const gModal = document.getElementById('nadimu-gameover-backdrop');
    if (gModal) gModal.remove();

    nadimuService.setNoFail(true);
    nadimuService.play();
    if (window.app) window.app.render();
  } else if (e.target.closest('#btn-nadimu-gameover-home') || e.target.closest('#btn-nadimu-victory-home')) {
    const vModal = document.getElementById('nadimu-victory-backdrop');
    if (vModal) vModal.remove();
    const gModal = document.getElementById('nadimu-gameover-backdrop');
    if (gModal) gModal.remove();

    nadimuService.stop();
    gameEngine.setState(GAME_STATES.TRACK_SELECT);
  } else if (e.target.closest('#btn-nadimu-view-lead')) {
    const vModal = document.getElementById('nadimu-victory-backdrop');
    if (vModal) vModal.remove();
    nadimuService.stop();
    gameEngine.setState(GAME_STATES.LEADERBOARD);
  } else if (e.target.closest('#btn-nadimu-manual-claim')) {
    const vModal = document.getElementById('nadimu-victory-backdrop');
    if (vModal) vModal.remove();
    nadimuService.stop();
    gameEngine.setState(GAME_STATES.LEADERBOARD);
    setTimeout(() => {
      const openManBtn = document.getElementById('btn-open-manual-input');
      if (openManBtn) openManBtn.click();
    }, 150);
  } else if (e.target.closest('.komang-fbtn[data-song="nadimu"]')) {
    const fbtn = e.target.closest('.komang-fbtn[data-song="nadimu"]');
    const fingers = parseInt(fbtn.dataset.fingers, 10);
    if (!isNaN(fingers)) {
      nadimuTilesEngine.evaluateGesture(fingers, true);
    }
  } else if (e.target.closest('#btn-komang-mode-30s')) {
    komangService.setSessionMode('30S_RANDOM');
    komangService.reset();
    if (window.app) window.app.render();
  } else if (e.target.closest('#btn-komang-mode-full')) {
    komangService.setSessionMode('FULL_SONG');
    komangService.reset();
    if (window.app) window.app.render();
  } else if (e.target.closest('#btn-komang-replay') || e.target.closest('#btn-komang-victory-retry')) {
    const modal = document.getElementById('komang-complete-modal') || document.getElementById('komang-victory-backdrop');
    if (modal) modal.remove();
    audioManager.setPreset('Acoustic Piano');
    komangService.pickRandomSegment(true);
    komangService.reset();
    komangService.play();
    if (window.app) window.app.render();
  } else if (e.target.closest('#btn-komang-home') || e.target.closest('#btn-komang-victory-home') || e.target.closest('#btn-komang-gameover-home')) {
    const modal = document.getElementById('komang-complete-modal') || document.getElementById('komang-victory-backdrop') || document.getElementById('komang-gameover-backdrop');
    if (modal) modal.remove();
    komangService.stop();
    gameEngine.setState(GAME_STATES.TRACK_SELECT);
  } else if (e.target.closest('#btn-komang-gameover-retry')) {
    const modal = document.getElementById('komang-gameover-backdrop');
    if (modal) modal.remove();
    audioManager.setPreset('Acoustic Piano');
    komangService.pickRandomSegment(true);
    komangService.reset();
    komangService.play();
    if (window.app) window.app.render();
  } else if (e.target.closest('#btn-komang-gameover-nofail')) {
    const modal = document.getElementById('komang-gameover-backdrop');
    if (modal) modal.remove();
    komangService.setNoFail(true);
    komangService.play();
    if (window.app) window.app.render();
  } else if (e.target.closest('#btn-komang-nofail-toggle')) {
    komangService.setNoFail(!komangService.isNoFail);
    if (window.app) window.app.render();
  } else if (e.target.closest('.speed-chip')) {
    const chip = e.target.closest('.speed-chip');
    const speed = parseFloat(chip.dataset.speed) || 1.0;
    komangService.setSpeed(speed);
    document.querySelectorAll('.speed-chip').forEach(c => c.classList.toggle('active', c === chip));
  } else if (e.target.closest('#komang-progress-bar')) {
    const bar = e.target.closest('#komang-progress-bar');
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (komangService.audioEl && komangService.audioEl.duration) {
      const targetSec = ratio * komangService.audioEl.duration;
      komangService.seek(targetSec);
      if (komangTilesEngine) {
        komangTilesEngine.tiles.forEach(t => {
          if (t.timeSec >= targetSec - 0.2) {
            t.status = 'PENDING';
            t.hitRating = null;
          }
        });
      }
    }
  } else if (e.target.closest('#btn-toggle-piano-height')) {
    const isKomang = gameEngine.currentState === GAME_STATES.KOMANG;
    const activeEngine = isKomang ? komangTilesEngine : nadimuTilesEngine;
    const newLabel = activeEngine.cycleKeyHeightMode();
    const labelEl = document.getElementById('label-piano-height');
    if (labelEl) labelEl.innerText = newLabel;
  } else if (e.target.closest('#btn-komang-view-tiles')) {
    komangService.setViewMode('TILES');
    if (window.app) window.app.render();
  } else if (e.target.closest('#btn-komang-view-sheet')) {
    komangService.setViewMode('SHEET');
    if (window.app) window.app.render();
  } else if (e.target.closest('#btn-komang-fullscreen-tv')) {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => { });
      if (window.app) {
        window.app.isFullscreen = true;
        settingsManager.update('viewportMode', 'fullscreen');
        window.app.render();
      }
    } else {
      document.exitFullscreen().catch(() => { });
      if (window.app) window.app.render();
    }
  } else if (e.target.closest('#btn-show-phone-qr') || e.target.closest('#btn-home-show-qr')) {
    if (window.app) window.app._showPhoneQrModal();
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
  } else if (target.id === 'set-eco-mode') {
    settingsManager.update('ecoMode', target.checked);
    if (typeof audioManager?.setEcoMode === 'function') audioManager.setEcoMode(target.checked);
    if (typeof virtualBackgroundService?.setEcoMode === 'function') virtualBackgroundService.setEcoMode(target.checked);
    if (window.app?.particleSystem?.setEcoMode) window.app.particleSystem.setEcoMode(target.checked);
    if (komangTilesEngine?.setEcoMode) komangTilesEngine.setEcoMode(target.checked);
  } else if (target.id === 'set-rest-reminder') {
    settingsManager.update('restReminderEnabled', target.checked);
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
  } else if (target.id === 'komang-vol-backing') {
    komangService.setVolumes(parseFloat(target.value), komangService.playerVolume);
  } else if (target.id === 'komang-vol-player') {
    komangService.setVolumes(komangService.backingVolume, parseFloat(target.value));
  } else if (target.id === 'set-player-name') {
    scoreManager.playerName = target.value.trim() || 'CYBER_PLAYER';
    scoreManager.save();
  } else if (target.id === 'set-cloud-endpoint') {
    onlineLeaderboardService.setEndpoint(target.value.trim());
  }
});

// File upload listener for custom Komang MP3 & settings change commits
document.addEventListener('change', (e) => {
  const target = e.target;
  if (target.id === 'set-player-name') {
    scoreManager.playerName = target.value.trim() || 'CYBER_PLAYER';
    scoreManager.save();
  } else if (target.id === 'set-cloud-endpoint') {
    onlineLeaderboardService.setEndpoint(target.value.trim());
  } else if (target.id === 'komang-file-input' && target.files && target.files[0]) {
    const file = target.files[0];
    const url = URL.createObjectURL(file);
    komangService.setAudioSource(url, 0.0);
    const nameEl = document.getElementById('komang-track-name');
    if (nameEl) nameEl.innerText = file.name;
    if (window.app) window.app.render();
  }
});

// Keyboard controls for Piano Tiles lanes and Play/Pause
document.addEventListener('keydown', (e) => {
  const isKomang = gameEngine.currentState === GAME_STATES.KOMANG;
  const isNadimu = gameEngine.currentState === GAME_STATES.NADIMU;
  if (!isKomang && !isNadimu) return;
  if (['input', 'textarea'].includes(document.activeElement?.tagName?.toLowerCase())) return;

  const tilesEngine = isKomang ? komangTilesEngine : nadimuTilesEngine;
  const songService = isKomang ? komangService : nadimuService;

  const key = e.key.toLowerCase();
  if (key === '1' || key === 'd') {
    e.preventDefault();
    tilesEngine.triggerLaneAction(0, true);
  } else if (key === '2' || key === 'f') {
    e.preventDefault();
    tilesEngine.triggerLaneAction(1, true);
  } else if (key === '3' || key === 'j') {
    e.preventDefault();
    tilesEngine.triggerLaneAction(2, true);
  } else if (key === '4' || key === 'k') {
    e.preventDefault();
    tilesEngine.triggerLaneAction(3, true);
  } else if (key === '5' || key === 'l') {
    e.preventDefault();
    tilesEngine.evaluateGesture(5, true);
  } else if (key === ' ') {
    e.preventDefault();
    if (songService.isPlaying) songService.pause();
    else songService.play();
  }
});

// Boot app on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('gestureMusic_useWallpaper') === 'true') {
    document.body.classList.add('with-custom-wallpaper');
  }
  window.app = new App();
});
