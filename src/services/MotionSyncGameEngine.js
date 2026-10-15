// main.js - Gesture Musik
// Song Selection Menu + Jatuh Suka + Taragak Pulang
// High-Fidelity 10-Finger Motion Audio Synchronization Game Engine

import '../style.css';
import { handTrackingService } from './HandTrackingService.js';
import { jatuhSukaSyncService, JATUH_SUKA_SEQUENCE } from './JatuhSukaAudioMotionService.js';
import { taragakPulangSyncService, TARAGAK_PULANG_SEQUENCE } from './TaragakPulangSyncService.js';
import { leaderboardService } from './LeaderboardService.js';
import { leaderboardUI } from '../ui/LeaderboardModal.js';

// ─────────────────────────────────────────────
// 1. SONG SELECTION MENU
// ─────────────────────────────────────────────
class SongMenuScreen {
  constructor(onSelect) {
    this.onSelect = onSelect;
    this.appEl = document.getElementById('app');
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  render() {
    const particles = Array.from({ length: 20 }, (_, i) =>
      `<div class="menu-particle" style="--d:${i * 18}deg;--delay:${(i * 0.31).toFixed(2)}s"></div>`
    ).join('');

    const player = leaderboardService.getCurrentPlayer();
    const hasPlayer = leaderboardService.hasCurrentPlayer();

    const playerStripHtml = hasPlayer ? `
      <div class="menu-player-strip">
        <div class="mps-info-group">
          <div class="mps-avatar">👤</div>
          <div class="mps-text">
            <div class="mps-label-row">
              <span class="mps-status-tag active">PEMAIN AKTIF</span>
            </div>
            <div class="mps-name">${this.escapeHtml(player.name)}</div>
            <div class="mps-phone">📱 ${leaderboardService.formatPhone(player.phone, true)}</div>
          </div>
        </div>
        <div class="mps-actions">
          <button class="btn-mps-change" id="btn-mps-change" title="Ubah Nama atau Nomor Telepon">
            ✏️ Ganti Pemain
          </button>
          <button class="btn-mps-leaderboard" id="btn-mps-leaderboard" title="Lihat Papan Peringkat Skor">
            🏆 Papan Peringkat
          </button>
        </div>
      </div>
    ` : `
      <div class="menu-player-strip">
        <div class="mps-info-group">
          <div class="mps-avatar unregistered">⚠️</div>
          <div class="mps-text">
            <div class="mps-label-row">
              <span class="mps-status-tag required">WAJIB ISI DATA</span>
            </div>
            <div class="mps-name">Silakan Masukkan Nama & Nomor Telepon</div>
            <div class="mps-phone" style="color: rgba(255,255,255,0.65);">Wajib diisi sebelum bermain agar skormu tercatat di Leaderboard</div>
          </div>
        </div>
        <div class="mps-actions">
          <button class="btn-mps-change" id="btn-mps-register" style="border-color: var(--cyan); color: var(--cyan); background: rgba(0,247,255,0.18);">
            📝 Isi Data Pemain
          </button>
          <button class="btn-mps-leaderboard" id="btn-mps-leaderboard" title="Lihat Papan Peringkat Skor">
            🏆 Papan Peringkat
          </button>
        </div>
      </div>
    `;

    this.appEl.innerHTML = `
      <div class="menu-screen">
        <div class="menu-particles" aria-hidden="true">${particles}</div>

        <header class="menu-header" role="banner">
          <div class="menu-logo">
            <span class="neon-text-cyan">GESTURE</span>
            <span class="neon-text-magenta">MUSIK</span>
          </div>
          <p class="menu-tagline">🎵 Kendalikan Musik Dengan Gerakan Tanganmu!</p>
        </header>

        <main class="menu-content" id="menu-content" role="main">
          <!-- STRIP IDENTITAS PEMAIN -->
          ${playerStripHtml}

          <h1 class="menu-choose-title">✨ PILIH LAGU</h1>
          <p class="menu-choose-sub">Pilih salah satu lagu di bawah ini untuk memulai permainan</p>

          <div class="menu-song-grid">
            <!-- Card 1: Jatuh Suka -->
            <button class="menu-song-card" id="btn-song-jatuhsuka" aria-label="Pilih lagu Jatuh Suka">
              <div class="song-card-glow glow-cyan"></div>
              <div class="song-card-inner">
                <div class="song-cover-art cover-jatuhsuka" aria-hidden="true">
                  <div class="cover-vinyl"><div class="cover-vinyl-inner">♪</div></div>
                  <div class="cover-eq-bars"><span></span><span></span><span></span><span></span><span></span></div>
                </div>
                <div class="song-info">
                  <div class="song-badge badge-pop">🎸 POP INDONESIA</div>
                  <h2 class="song-title">Jatuh Suka</h2>
                  <p class="song-artist">Ost. Sinetron • Pop Romantis</p>
                  <div class="song-meta-row">
                    <span class="song-meta-chip chip-cyan">⏱ 1 Menit</span>
                    <span class="song-meta-chip chip-green">❤️ 5 Nyawa</span>
                    <span class="song-meta-chip chip-yellow">☝️–🙌 1–10 Jari</span>
                  </div>
                  <p class="song-desc">Ayunkan 1–10 jari sesuai ketukan lagu pop romantis! Sinkronisasi gerakan tangan dengan irama musik real-time.</p>
                </div>
                <div class="song-card-cta">
                  <span class="cta-arrow">▶ MULAI MAIN</span>
                </div>
              </div>
            </button>

            <!-- Card 2: Taragak Pulang -->
            <button class="menu-song-card" id="btn-song-taragak" aria-label="Pilih lagu Taragak Pulang">
              <div class="song-card-glow glow-gold"></div>
              <div class="song-card-inner">
                <div class="song-cover-art cover-taragak" aria-hidden="true">
                  <div class="cover-vinyl"><div class="cover-vinyl-inner">🎵</div></div>
                  <div class="cover-eq-bars"><span></span><span></span><span></span><span></span><span></span></div>
                </div>
                <div class="song-info">
                  <div class="song-badge badge-minang">🏔️ MINANG KLASIK</div>
                  <h2 class="song-title">Taragak Pulang</h2>
                  <p class="song-artist">Dira Sati, Eja, Abdi • Lagu Minang</p>
                  <div class="song-meta-row">
                    <span class="song-meta-chip chip-gold">⏱ 1 Menit</span>
                    <span class="song-meta-chip chip-green">❤️ 5 Nyawa</span>
                    <span class="song-meta-chip chip-yellow">☝️–🙌 1–10 Jari</span>
                  </div>
                  <p class="song-desc">Ayunkan 1–10 jari sesuai ketukan irama Minang Taragak Pulang! Sinkronisasi gerakan tangan dengan lagu Minang real-time.</p>
                </div>
                <div class="song-card-cta cta-gold">
                  <span class="cta-arrow">▶ MULAI MAIN</span>
                </div>
              </div>
            </button>
          </div>

          <!-- PANDUAN GESTUR JARI STRIP (6 GESTUR) -->
          <div class="menu-gestures-strip">
            <div class="mgs-title">✨ PANDUAN GESTUR JARI DALAM PERMAINAN (1 – 10 JARI)</div>
            <div class="mgs-cards-row">
              <div class="mgs-card">
                <div class="mgs-thumb-wrap"><img src="/images/gesture_hand_1.png" alt="1 Jari" class="mgs-thumb"/></div>
                <span class="mgs-label">1. Satu Jari</span>
              </div>
              <div class="mgs-card">
                <div class="mgs-thumb-wrap"><img src="/images/gesture_hand_2.png" alt="2 Jari" class="mgs-thumb"/></div>
                <span class="mgs-label">2. Dua Jari</span>
              </div>
              <div class="mgs-card">
                <div class="mgs-thumb-wrap"><img src="/images/gesture_hand_3.png" alt="3 Jari" class="mgs-thumb"/></div>
                <span class="mgs-label">3. Tiga Jari</span>
              </div>
              <div class="mgs-card">
                <div class="mgs-thumb-wrap"><img src="/images/gesture_hand_4.png" alt="4 Jari" class="mgs-thumb"/></div>
                <span class="mgs-label">4. Empat Jari</span>
              </div>
              <div class="mgs-card">
                <div class="mgs-thumb-wrap"><img src="/images/gesture_hand_5.png" alt="5 Jari" class="mgs-thumb"/></div>
                <span class="mgs-label">5. Lima Jari</span>
              </div>
              <div class="mgs-card">
                <div class="mgs-thumb-wrap"><img src="/images/gesture_hand_10.png" alt="10 Jari" class="mgs-thumb"/></div>
                <span class="mgs-label">6. Sepuluh Jari</span>
              </div>
            </div>
          </div>
        </main>

        <footer class="menu-footer" role="contentinfo">
          <p>🤚 Butuh kamera webcam untuk deteksi gerakan jari real-time (tersedia Mode Virtual jika webcam tidak aktif)</p>
        </footer>
      </div>
    `;

    // Handler memulai lagu dengan verifikasi data pemain
    const startSongWithCheck = (songId) => {
      if (!leaderboardService.hasCurrentPlayer()) {
        leaderboardUI.openPlayerModal({
          title: 'DAFTAR SEBELUM MAIN',
          allowCancel: true,
          onSave: () => {
            this.render();
            if (songId === 'jatuhsuka') jatuhSukaSyncService.unlockAudio();
            else taragakPulangSyncService.unlockAudio();
            this.onSelect(songId);
          }
        });
        return;
      }

      if (songId === 'jatuhsuka') jatuhSukaSyncService.unlockAudio();
      else taragakPulangSyncService.unlockAudio();
      this.onSelect(songId);
    };

    document.getElementById('btn-song-jatuhsuka')?.addEventListener('click', () => {
      startSongWithCheck('jatuhsuka');
    });
    document.getElementById('btn-song-taragak')?.addEventListener('click', () => {
      startSongWithCheck('taragak');
    });

    // Tombol ganti / isi data pemain
    document.getElementById('btn-mps-change')?.addEventListener('click', () => {
      leaderboardUI.openPlayerModal({
        title: 'GANTI IDENTITAS PEMAIN',
        allowCancel: true,
        onSave: () => this.render()
      });
    });
    document.getElementById('btn-mps-register')?.addEventListener('click', () => {
      leaderboardUI.openPlayerModal({
        title: 'DATA PEMAIN BARU',
        allowCancel: true,
        onSave: () => this.render()
      });
    });

    // Tombol leaderboard di menu
    document.getElementById('btn-mps-leaderboard')?.addEventListener('click', () => {
      leaderboardUI.openLeaderboard();
    });
  }
}

// ─────────────────────────────────────────────
// 2. UNIFIED GAME ENGINE
// ─────────────────────────────────────────────
class GestureMusicGameEngine {
  constructor(appEl, onBackToMenu, config) {
    this.appEl = appEl;
    this.onBackToMenu = onBackToMenu;
    this.config = config;
    this.syncService = config.syncService;
    this.defaultSequence = config.defaultSequence;

    this.stream = null;
    this.isCameraActive = false;
    this.isMirrored = true;
    this.isSimulating = false;
    this.simInterval = null;
    this.lastSavedRecordId = null;
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  start() {
    this.syncService.restartGame();
    this.render();
    this.bindEvents();

    this.syncService.onTelemetryUpdate = (tel) => this.updateUI(tel);
    this.syncService.onLifeLost = (remainingLives, reason) => this.showLifeLostToast(remainingLives, reason);
    this.syncService.onGameOver = (stats) => this.showGameOverModal(stats);
    this.syncService.onVictory = (stats) => this.showVictoryModal(stats);

    this.startCamera(false).catch(() => {});
  }

  stop() {
    if (this.stream) {
      try { this.stream.getTracks().forEach(t => t.stop()); } catch(e) {}
      this.stream = null;
    }
    if (this.simInterval) { clearInterval(this.simInterval); this.simInterval = null; }
    this.syncService.onTelemetryUpdate = null;
    this.syncService.onLifeLost = null;
    this.syncService.onGameOver = null;
    this.syncService.onVictory = null;
    try { handTrackingService.stopTracking(); } catch(e) {}
    try { this.syncService.restartGame(); } catch(e) {}
  }

  renderCyberHandSvg(fingerCount) {
    const is4 = fingerCount === 4;
    const activeColor = this.config.primaryColor || '#00f7ff';
    const dimColor = 'rgba(255, 255, 255, 0.22)';
    return `<svg viewBox="0 0 160 170" class="cyber-hand-svg" xmlns="http://www.w3.org/2000/svg">
      <defs><filter id="cyber-glow-${this.config.songId}-${fingerCount}" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="3" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter></defs>
      <circle cx="80" cy="85" r="70" fill="rgba(0,247,255,0.04)" stroke="${activeColor}" stroke-opacity="0.28" stroke-width="1.5" stroke-dasharray="5 3"/>
      <path d="M 48 150 L 112 150 L 116 108 L 44 108 Z" fill="rgba(12,18,38,0.9)" stroke="${activeColor}" stroke-opacity="0.55" stroke-width="2"/>
      <circle cx="80" cy="128" r="11" fill="rgba(0,247,255,0.15)" stroke="${activeColor}" stroke-width="2" filter="url(#cyber-glow-${this.config.songId}-${fingerCount})"/>
      <circle cx="80" cy="128" r="4" fill="#00ff88"/>
      <path d="M 45 120 Q 32 114 42 100" fill="none" stroke="${dimColor}" stroke-width="3" stroke-linecap="round"/>
      <circle cx="42" cy="100" r="3.5" fill="${dimColor}"/>
      <path d="M 58 108 L 56 60 L 56 26" fill="none" stroke="${activeColor}" stroke-width="4.5" stroke-linecap="round" filter="url(#cyber-glow-${this.config.songId}-${fingerCount})"/>
      <circle cx="56" cy="26" r="6" fill="${activeColor}" filter="url(#cyber-glow-${this.config.songId}-${fingerCount})"/>
      <circle cx="56" cy="26" r="2.5" fill="#ffffff"/>
      <path d="M 74 108 L 74 52 L 74 16" fill="none" stroke="${activeColor}" stroke-width="4.5" stroke-linecap="round" filter="url(#cyber-glow-${this.config.songId}-${fingerCount})"/>
      <circle cx="74" cy="16" r="6" fill="${activeColor}" filter="url(#cyber-glow-${this.config.songId}-${fingerCount})"/>
      <circle cx="74" cy="16" r="2.5" fill="#ffffff"/>
      <path d="M 90 108 L 90 56 L 90 22" fill="none" stroke="${activeColor}" stroke-width="4.5" stroke-linecap="round" filter="url(#cyber-glow-${this.config.songId}-${fingerCount})"/>
      <circle cx="90" cy="22" r="6" fill="${activeColor}" filter="url(#cyber-glow-${this.config.songId}-${fingerCount})"/>
      <circle cx="90" cy="22" r="2.5" fill="#ffffff"/>
      ${is4 ? `<path d="M 106 108 L 106 68 L 106 38" fill="none" stroke="${activeColor}" stroke-width="4" stroke-linecap="round" filter="url(#cyber-glow-${this.config.songId}-${fingerCount})"/>
        <circle cx="106" cy="38" r="5" fill="${activeColor}" filter="url(#cyber-glow-${this.config.songId}-${fingerCount})"/>
        <circle cx="106" cy="38" r="2" fill="#ffffff"/>` :
       `<path d="M 106 108 Q 112 102 106 92" fill="none" stroke="${dimColor}" stroke-width="3" stroke-linecap="round"/>
        <circle cx="106" cy="92" r="3.5" fill="${dimColor}"/>`}
    </svg>`;
  }

  getHologramHandHtml(fingerCount = 1) {
    const validCount = [1, 2, 3, 4, 5, 10].includes(Number(fingerCount)) ? Number(fingerCount) : 1;
    const isTen = validCount === 10;
    const gestureNames = {
      1: '☝️ 1 JARI TELUNJUK',
      2: '✌️ 2 JARI PEACE',
      3: '🤟 3 JARI (INDEX + MID + RING)',
      4: '🖖 4 JARI (LIPAT JEMPOL)',
      5: '🖐️ 5 JARI TELAPAK',
      10: '🙌 10 JARI (DUA TANGAN)'
    };
    const chipText = gestureNames[validCount] || `${validCount} JARI`;
    const imgSrc = `/images/gesture_hand_${validCount}.png`;

    return `<div class="hologram-img-wrapper ${isTen ? 'two-hands' : ''}">
      <img src="${imgSrc}" alt="Petunjuk ${validCount} Jari" class="hologram-real-hand-img ${isTen ? 'hand-ten' : ''}"/>
      <div class="hologram-pose-chip">${chipText}</div>
    </div>`;
  }

  renderUpcomingCues(upcomingQueue) {
    if (!upcomingQueue || !upcomingQueue.length) return '';
    return upcomingQueue.map((item, idx) => {
      const isCur = item.isCurrent;
      const tag = isCur ? 'SEKARANG' : (idx === 1 ? 'BERIKUTNYA' : (idx === 2 ? 'NANTI' : 'LALU'));
      const timeStr = isCur ? `Ketukan ${item.beatsLeft || 4}/4` : `Dalam ${item.secondsUntil}s`;
      const cardType = isCur ? 'cue-card active' : (idx === 1 ? 'cue-card next' : 'cue-card future');
      const lyricSnippet = item.target.lyric ? `<div class="cue-lyric-hint" style="font-size:9.5px;color:rgba(255,255,255,0.65);margin-top:2px;max-width:115px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">"${item.target.lyric}"</div>` : '';
      const fCount = [1, 2, 3, 4, 5, 10].includes(Number(item.target.fingerCount)) ? item.target.fingerCount : 1;
      return `<div class="${cardType}">
        <div class="cue-pill-tag">${tag}</div>
        <div class="cue-content-row">
          <div class="cue-hand-thumb-wrap">
            <img src="/images/gesture_hand_${fCount}.png" alt="${fCount} Jari" class="cue-hand-thumb"/>
          </div>
          <div class="cue-meta">
            <span class="cue-fingers-title">${item.target.fingerCount} JARI</span>
            <span class="cue-time-chip">${timeStr}</span>
          </div>
        </div>
        ${lyricSnippet}
        ${isCur ? '<div class="cue-active-glow-bar"></div>' : ''}
      </div>`;
    }).join('');
  }

  render() {
    const tel = this.syncService.getTelemetry();
    const curTarget = tel.currentTarget || this.syncService.currentTarget || this.syncService.sequence?.[0] || this.defaultSequence[0];
    const themeCls = this.config.themeClass ? ` ${this.config.themeClass}` : '';

    this.appEl.innerHTML = `
      <div class="gm-app-container${themeCls}">
        <header class="gm-top-bar">
          <div class="gm-logo-group">
            <button class="btn-back-menu" id="btn-back-menu">⬅ MENU</button>
            <span class="neon-text-cyan">${this.config.title}</span>
            <span class="neon-text-magenta">${this.config.genre || 'MUSIK'}</span>
          </div>
          <div class="gm-header-actions">
            <div class="top-player-chip" id="btn-top-player-chip" title="Klik untuk ubah profil pemain">
              <span>👤</span>
              <span id="top-player-name">${this.escapeHtml(leaderboardService.getCurrentPlayer()?.name || 'Pemain')}</span>
            </div>
            <button class="btn-top-leaderboard" id="btn-top-leaderboard" title="Buka Papan Peringkat">
              <span>🏆</span> Leaderboard
            </button>
            <button class="btn-camera-status ${this.isCameraActive ? 'online' : ''}" id="btn-camera-status-toggle">
              <span class="status-pulse-dot"></span>
              <span id="cam-status-label">${this.isCameraActive ? 'Kamera Aktif' : 'Buka Kamera'}</span>
            </button>
            <button class="btn-kembali" id="btn-kembali">
              <span class="kembali-arrow">↩</span> Reset Lagu
            </button>
          </div>
        </header>

        <div class="gm-sub-status-bar">
          <div class="status-card-inner">
            <div class="vinyl-track-info">
              <div class="vinyl-disc-mini" id="vinyl-disc-mini"></div>
              <div class="track-info-text">
                <span class="np-caption">NOW PLAYING:</span>
                <span class="np-title" id="np-title">${this.config.title} (${this.config.durationLabel || '60s / 1 MENIT'})</span>
              </div>
            </div>
            <div class="active-beat-indicator" id="active-beat-indicator">
              <span class="abi-label">TARGET KETUKAN:</span>
              <span class="abi-val" id="abi-val">${curTarget.emoji} ${curTarget.label || curTarget.name}</span>
            </div>
            <div class="lives-display-badge">
              <span class="lives-caption">NYAWA:</span>
              <div class="hearts-row" id="hearts-row">
                <span class="heart-icon active" id="heart-1">❤️</span>
                <span class="heart-icon active" id="heart-2">❤️</span>
                <span class="heart-icon active" id="heart-3">❤️</span>
                <span class="heart-icon active" id="heart-4">❤️</span>
                <span class="heart-icon active" id="heart-5">❤️</span>
              </div>
            </div>
            <div class="stars-display-badge" id="stars-display-badge">
              <span class="stars-caption">RATING:</span>
              <span class="stars-val" id="stars-val">⭐⭐⭐⭐⭐ PERFECT!</span>
            </div>
            <div class="score-progress-group">
              <div class="score-line">
                <span class="score-caption">WAKTU:</span>
                <span class="time-digit" id="time-display">00:00 / 01:00</span>
                <span class="score-sep">•</span>
                <span class="score-caption">SKOR:</span>
                <span class="score-digit" id="score-digit">0</span>
              </div>
              <div class="progress-track-strip">
                <div class="progress-fill-gradient" id="progress-fill-gradient" style="width: 0%;"></div>
              </div>
            </div>
          </div>
        </div>

        <main class="gm-main-layout">
          <!-- LEFT PANEL: CAMERA VIEWPORT -->
          <section class="gm-panel camera-stage-panel">
            <div class="panel-box-header">
              <h2 class="panel-title">KAMERA AKTIF (REAL-TIME DETECTION)</h2>
              <span class="panel-tag-cyan">FAST RESPONSE</span>
            </div>
            <div class="camera-stage-frame" id="camera-stage-frame">
              <div class="cyber-corner corner-top-left"></div>
              <div class="cyber-corner corner-top-right"></div>
              <div class="cyber-corner corner-bottom-left"></div>
              <div class="cyber-corner corner-bottom-right"></div>
              <div class="hud-badge-tracking">
                <span class="hud-tracking-dot"></span>
                <span>HAND TRACKING ACTIVE</span>
              </div>
              <button class="btn-stop-virtual" id="btn-stop-virtual" style="display: none;">🛑 Hentikan Mode Virtual</button>
              <video id="camera-video" autoplay playsinline muted></video>
              <canvas id="tracking-canvas"></canvas>
              <div class="camera-gate-card" id="camera-gate-card" style="${this.isCameraActive ? 'display:none;' : 'display:flex;'}">
                <div class="gate-modal-content">
                  <div class="gate-cam-icon">📷</div>
                  <h3 class="gate-head">KAMERA WEBCAM</h3>
                  <p class="gate-hint" id="gate-hint">Buka webcam laptop Anda untuk mengendalikan musik, atau gunakan Mode Virtual jika kamera sedang sibuk.</p>
                  <div class="gate-buttons-col">
                    <button class="btn-gate-activate" id="btn-gate-activate">▶ BUKA KAMERA SEKARANG</button>
                    <button class="btn-gate-sim" id="btn-gate-sim">🖱️ Uji Mode Virtual (Rotasi Jari Otomatis)</button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- RIGHT PANEL: REFINED PETUNJUK GERAKAN JARI -->
          <section class="gm-panel guide-stage-panel">
            <div class="panel-box-header">
              <h2 class="panel-title">PETUNJUK GERAKAN JARI</h2>
              <button class="btn-guide-help" id="btn-open-gesture-guide" title="Lihat Panduan 6 Jari">📖 Panduan Jari</button>
              <div class="next-target-countdown" id="next-target-countdown">Berikutnya: ✌️ 2 Jari (dalam 4s)</div>
            </div>
            <div class="finger-arena-stage" id="finger-arena-stage">
              <!-- 1. Antrean Petunjuk 4 Kotak Horizontal -->
              <div class="upcoming-cues-strip" id="upcoming-cues-strip">
                ${this.renderUpcomingCues(this.syncService.getUpcomingTargetsQueue(4))}
              </div>

              <!-- 2. Target Saat Ini Badge -->
              <div class="target-hero-badge" id="target-hero-badge">
                <div class="thb-thumb-wrap">
                  <img id="thb-thumb-img" src="/images/gesture_hand_${curTarget.fingerCount || 1}.png" alt="${curTarget.fingerCount || 1} Jari" class="thb-hand-thumb" />
                </div>
                <div class="thb-text">
                  <h3 class="thb-title" id="thb-title">TARGET: ${curTarget.label || curTarget.name}</h3>
                  <p class="thb-desc" id="thb-desc">${curTarget.tip || 'Ayunkan jarimu naik-turun santai mengikuti ketukan!'}</p>
                  ${curTarget.lyric ? `<p class="thb-lyric" id="thb-lyric" style="font-size:11px;color:#ffd700;margin-top:2px;font-style:italic;">🎵 "${curTarget.lyric}"</p>` : ''}
                </div>
              </div>

              <!-- 3. Central Holographic Hand Guide with Halo -->
              <div class="hologram-display-center">
                <div class="holo-energy-halo"></div>
                <div class="hologram-hand-slot" id="hologram-hand-slot" data-current-fingers="${curTarget.fingerCount}">
                  ${this.getHologramHandHtml(curTarget.fingerCount)}
                </div>
              </div>

              <!-- 4. Rhythmic Beat Metronome Strip (1 - 2 - 3 - 4 Pil Horizontal) -->
              <div class="beat-rhythm-strip">
                <span class="beat-strip-lbl">IRAMA KETUKAN (BEAT):</span>
                <div class="beat-pills-row" id="beat-pills-row">
                  <span class="beat-pill ${tel.beatCount4 === 1 ? 'active' : ''}" id="beat-pill-1">1</span>
                  <span class="beat-pill ${tel.beatCount4 === 2 ? 'active' : ''}" id="beat-pill-2">2</span>
                  <span class="beat-pill ${tel.beatCount4 === 3 ? 'active' : ''}" id="beat-pill-3">3</span>
                  <span class="beat-pill ${tel.beatCount4 === 4 ? 'active' : ''}" id="beat-pill-4">4</span>
                </div>
                <div class="beat-motion-indicator">
                  <span class="bmi-wave">⚡ AYUN NAIK-TURUN</span>
                </div>
              </div>

              <!-- 5. Live Comparison Card: Terdeteksi vs Target & Bar Kecepatan -->
              <div class="live-finger-comparison-card">
                <div class="comparison-row">
                  <div class="comp-col">
                    <span class="comp-lbl">TERDETEKSI:</span>
                    <span class="comp-val" id="comp-detected-text">Belum ada tangan</span>
                  </div>
                  <div class="comp-status-badge idle" id="comp-status-badge">👋 Angkat Jari ke Kamera</div>
                  <div class="comp-col">
                    <span class="comp-lbl">KECEPATAN:</span>
                    <div class="motion-mini-track">
                      <div class="motion-mini-bar" id="motion-mini-bar" style="width: 0%;"></div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 6. Bottom Bold Banner -->
              <div class="guide-bottom-banner">
                <div class="banner-heading" id="banner-heading">${tel.guidanceMessage || this.config.defaultGuidance}</div>
                <div class="banner-sub">Tahan bentuk jari yang tepat & ayunkan naik-turun santai! Musik akan berputar mulus.</div>
              </div>
            </div>
          </section>
        </main>

        <footer class="gm-bottom-strip">
          <div class="audio-hud-controls" style="display:flex;align-items:center;justify-content:space-between;width:100%;padding:4px 6px;">
            <div class="waveform-box">
              <canvas id="waveform-canvas" width="220" height="34"></canvas>
            </div>
            <div class="volume-slider-group" style="display:flex;align-items:center;gap:8px;">
              <span class="vol-icon">🔊</span>
              <input type="range" id="volume-slider" min="0" max="100" value="85" class="slider-cyber"/>
            </div>
            <button class="btn-mode-toggle" id="btn-mirror-toggle">🪞 Cermin Kamera</button>
          </div>
        </footer>

        <!-- Toast -1 Nyawa -->
        <div class="toast-life-lost" id="toast-life-lost" style="display: none;">
          <div class="toast-heart">💔</div>
          <div class="toast-msg" id="toast-msg">-1 NYAWA (SISA: 4)</div>
        </div>

        <!-- Modal Game Over (Lagu Hangus) -->
        <div class="game-over-modal-backdrop" id="game-over-modal" style="display: none;">
          <div class="game-over-modal-card">
            <div class="modal-skull-icon">💀</div>
            <h2 class="modal-title">LAGU HANGUS!</h2>
            <p class="modal-subtitle">Nyawa Anda Habis! Anda salah melakukan gerakan sebanyak 5 kali.</p>
            <div class="modal-star-section">
              <span class="modal-star-banner" id="stat-gameover-stars">⭐</span>
              <span class="stat-lbl" id="stat-gameover-rank">SURVIVE</span>
            </div>
            <div style="display:flex;gap:18px;margin:8px 0;width:100%;justify-content:center;">
              <div><span style="font-size:18px;font-weight:900;color:#fff;" id="stat-final-score">0</span><br><span style="font-size:10px;color:rgba(255,255,255,0.6);">SKOR AKHIR</span></div>
              <div><span style="font-size:18px;font-weight:900;color:var(--cyan);" id="stat-final-time">00:00</span><br><span style="font-size:10px;color:rgba(255,255,255,0.6);">WAKTU</span></div>
            </div>
            <div class="modal-player-rank-chip" id="stat-gameover-leaderboard-chip" style="display: none;"></div>
            <button class="btn-modal-leaderboard" id="btn-leaderboard-gameover">🏆 Lihat Papan Peringkat (Leaderboard)</button>
            <button class="btn-modal-restart" id="btn-retry-gameover">🔄 Coba Lagi (Ulangi Lagu)</button>
            <button class="btn-modal-menu" id="btn-menu-gameover">📋 Kembali ke Menu</button>
          </div>
        </div>

        <!-- Modal Kemenangan (Lagu Selesai) -->
        <div class="game-over-modal-backdrop" id="victory-modal" style="display: none;">
          <div class="game-over-modal-card victory-card">
            <div class="modal-skull-icon victory-icon">🏆</div>
            <h2 class="modal-title victory-title">LAGU SELESAI!</h2>
            <p class="modal-subtitle">Selamat! Anda berhasil menyelesaikan tantangan 1 Menit lagu ${this.config.title}!</p>
            <div class="modal-star-section">
              <span class="modal-star-banner animated-stars" id="stat-victory-stars">⭐⭐⭐⭐⭐</span>
              <span class="stat-lbl" id="stat-victory-rank">PERFECT!</span>
            </div>
            <div style="display:flex;gap:18px;margin:8px 0;width:100%;justify-content:center;">
              <div><span style="font-size:18px;font-weight:900;color:#ffd700;" id="stat-victory-score">1,250</span><br><span style="font-size:10px;color:rgba(255,255,255,0.6);">SKOR TOTAL</span></div>
              <div><span style="font-size:18px;font-weight:900;color:#00ff88;" id="stat-victory-lives">5/5 ❤️</span><br><span style="font-size:10px;color:rgba(255,255,255,0.6);">SISA NYAWA</span></div>
            </div>
            <p style="font-size:12px;color:rgba(255,255,255,0.8);line-height:1.4;" id="stat-victory-desc">Luar Biasa! Irama dan gerakan jari Anda sangat presisi!</p>
            <div class="modal-player-rank-chip" id="stat-victory-leaderboard-chip" style="display: none;"></div>
            <button class="btn-modal-leaderboard" id="btn-leaderboard-victory">🏆 Lihat Papan Peringkat (Leaderboard)</button>
            <button class="btn-modal-restart btn-victory-restart" id="btn-retry-victory">🔄 Mainkan Lagi</button>
            <button class="btn-modal-menu" id="btn-menu-victory">📋 Pilih Lagu Lain</button>
          </div>
        </div>

        <!-- Modal Panduan Gestur Jari (Kamus 6 Gestur) -->
        <div class="gesture-guide-modal-backdrop" id="gesture-guide-modal" style="display: none;">
          <div class="gesture-guide-modal-card">
            <div class="gesture-modal-header">
              <h2 class="gesture-modal-title">🖐️ PANDUAN GESTUR JARI (1 – 10 JARI)</h2>
              <button class="btn-close-gesture-modal" id="btn-close-gesture-guide" aria-label="Tutup Panduan">✕</button>
            </div>
            <div class="gesture-guide-grid">
              <div class="gesture-guide-item">
                <div class="gesture-guide-img-box"><img src="/images/gesture_hand_1.png" alt="1 Jari" class="gesture-guide-img"/></div>
                <div class="gesture-guide-label">1. Satu Jari</div>
                <p class="gesture-guide-desc">Tegakkan 1 jari telunjuk ke atas, jari lainnya dilipat.</p>
              </div>
              <div class="gesture-guide-item">
                <div class="gesture-guide-img-box"><img src="/images/gesture_hand_2.png" alt="2 Jari" class="gesture-guide-img"/></div>
                <div class="gesture-guide-label">2. Dua Jari (Peace)</div>
                <p class="gesture-guide-desc">Buka 2 jari membentuk huruf V (telunjuk & tengah).</p>
              </div>
              <div class="gesture-guide-item">
                <div class="gesture-guide-img-box"><img src="/images/gesture_hand_3.png" alt="3 Jari" class="gesture-guide-img"/></div>
                <div class="gesture-guide-label">3. Tiga Jari</div>
                <p class="gesture-guide-desc">Angkat 3 jari lurus (telunjuk, tengah, dan manis).</p>
              </div>
              <div class="gesture-guide-item">
                <div class="gesture-guide-img-box"><img src="/images/gesture_hand_4.png" alt="4 Jari" class="gesture-guide-img"/></div>
                <div class="gesture-guide-label">4. Empat Jari</div>
                <p class="gesture-guide-desc">Buka 4 jari ke atas, jempol terlipat di depan telapak.</p>
              </div>
              <div class="gesture-guide-item">
                <div class="gesture-guide-img-box"><img src="/images/gesture_hand_5.png" alt="5 Jari" class="gesture-guide-img"/></div>
                <div class="gesture-guide-label">5. Lima Jari</div>
                <p class="gesture-guide-desc">Buka telapak tangan penuh dengan 5 jari terbentang.</p>
              </div>
              <div class="gesture-guide-item">
                <div class="gesture-guide-img-box"><img src="/images/gesture_hand_10.png" alt="10 Jari" class="gesture-guide-img"/></div>
                <div class="gesture-guide-label">6. Sepuluh Jari</div>
                <p class="gesture-guide-desc">Angkat kedua tangan dengan total 10 jari terbuka lebar!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    document.getElementById('btn-back-menu')?.addEventListener('click', () => {
      this.stop();
      this.onBackToMenu();
    });

    document.getElementById('btn-camera-status-toggle')?.addEventListener('click', () => {
      if (this.isCameraActive) this.stopCamera();
      else this.startCamera(true);
    });

    document.getElementById('btn-gate-activate')?.addEventListener('click', () => {
      this.syncService.unlockAudio();
      this.startCamera(true);
    });

    document.getElementById('btn-gate-sim')?.addEventListener('click', () => {
      this.syncService.unlockAudio();
      this.simulateMovement();
    });

    document.getElementById('btn-stop-virtual')?.addEventListener('click', () => {
      this.stopSimulation();
    });

    document.getElementById('btn-kembali')?.addEventListener('click', () => {
      this.syncService.restartGame();
    });

    document.getElementById('btn-mirror-toggle')?.addEventListener('click', () => {
      this.isMirrored = !this.isMirrored;
      const vid = document.getElementById('camera-video');
      const can = document.getElementById('tracking-canvas');
      if (vid) vid.style.transform = this.isMirrored ? 'scaleX(-1)' : 'none';
      if (can) can.style.transform = this.isMirrored ? 'scaleX(-1)' : 'none';
    });

    document.getElementById('volume-slider')?.addEventListener('input', (e) => {
      this.syncService.setVolume(Number(e.target.value) / 100);
    });

    document.getElementById('btn-top-leaderboard')?.addEventListener('click', () => {
      leaderboardUI.openLeaderboard(null, this.config.songId);
    });

    document.getElementById('btn-top-player-chip')?.addEventListener('click', () => {
      leaderboardUI.openPlayerModal({
        title: 'IDENTITAS PEMAIN AKTIF',
        allowCancel: true,
        onSave: (p) => {
          const el = document.getElementById('top-player-name');
          if (el) el.innerText = p.name;
        }
      });
    });

    document.getElementById('btn-leaderboard-gameover')?.addEventListener('click', () => {
      leaderboardUI.openLeaderboard(this.lastSavedRecordId, this.config.songId);
    });

    document.getElementById('btn-leaderboard-victory')?.addEventListener('click', () => {
      leaderboardUI.openLeaderboard(this.lastSavedRecordId, this.config.songId);
    });

    document.getElementById('btn-retry-gameover')?.addEventListener('click', () => {
      const modal = document.getElementById('game-over-modal');
      if (modal) modal.style.display = 'none';
      this.syncService.restartGame();
    });

    document.getElementById('btn-menu-gameover')?.addEventListener('click', () => {
      this.stop();
      this.onBackToMenu();
    });

    document.getElementById('btn-retry-victory')?.addEventListener('click', () => {
      const modal = document.getElementById('victory-modal');
      if (modal) modal.style.display = 'none';
      this.syncService.restartGame();
    });

    document.getElementById('btn-menu-victory')?.addEventListener('click', () => {
      this.stop();
      this.onBackToMenu();
    });

    // Gesture guide modal listeners
    document.getElementById('btn-open-gesture-guide')?.addEventListener('click', () => {
      const modal = document.getElementById('gesture-guide-modal');
      if (modal) modal.style.display = 'flex';
    });

    document.getElementById('btn-close-gesture-guide')?.addEventListener('click', () => {
      const modal = document.getElementById('gesture-guide-modal');
      if (modal) modal.style.display = 'none';
    });

    document.getElementById('gesture-guide-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'gesture-guide-modal') {
        e.target.style.display = 'none';
      }
    });

    // Waveform ticker
    const wfCanvas = document.getElementById('waveform-canvas');
    if (wfCanvas) {
      const drawWf = () => {
        if (this.syncService && document.getElementById('waveform-canvas')) {
          this.syncService.drawAudioWaveform(wfCanvas);
          requestAnimationFrame(drawWf);
        }
      };
      requestAnimationFrame(drawWf);
    }
  }

  async startCamera(isUserAction = true) {
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('tracking-canvas');
    const gateCard = document.getElementById('camera-gate-card');
    const gateHint = document.getElementById('gate-hint');
    const statusBtn = document.getElementById('btn-camera-status-toggle');
    const statusLbl = document.getElementById('cam-status-label');

    if (!video || !canvas) return;

    try {
      this.syncService.resumeAudioContext().catch(() => {});
      this.syncService.initWebAudioGraph();

      if (this.isSimulating) this.stopSimulation();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
        audio: false,
      });

      this.stream = stream;
      video.srcObject = stream;
      await video.play();

      this.isCameraActive = true;
      if (gateCard) gateCard.style.display = 'none';
      if (statusBtn) statusBtn.classList.add('online');
      if (statusLbl) statusLbl.innerText = 'Kamera Aktif';

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      await handTrackingService.loadModel();
      handTrackingService.startTracking(video, (results) => {
        this.onHandTrackingResults(results, canvas, video);
      });
    } catch (err) {
      this.isCameraActive = false;
      if (statusBtn) statusBtn.classList.remove('online');
      if (statusLbl) statusLbl.innerText = 'Buka Kamera';
      if (gateCard) gateCard.style.display = 'flex';
      if (gateHint) {
        if (err.name === 'NotAllowedError') gateHint.innerText = '⚠️ Izin webcam ditolak browser. Izinkan webcam atau klik tombol Uji Mode Virtual di bawah!';
        else if (err.name === 'NotFoundError') gateHint.innerText = '⚠️ Kamera tidak ditemukan. Silakan gunakan tombol Uji Mode Virtual di bawah!';
        else gateHint.innerText = `⚠️ Webcam belum aktif (${err.message || 'sibuk'}). Anda bisa menggunakan Mode Virtual!`;
      }
      if (!isUserAction) {
        console.warn('Autostart camera note:', err.message);
      }
    }
  }

  stopCamera() {
    if (this.stream) {
      try { this.stream.getTracks().forEach(t => t.stop()); } catch(e) {}
      this.stream = null;
    }
    this.isCameraActive = false;
    handTrackingService.stopTracking();

    const gateCard = document.getElementById('camera-gate-card');
    const statusBtn = document.getElementById('btn-camera-status-toggle');
    const statusLbl = document.getElementById('cam-status-label');
    if (gateCard) gateCard.style.display = 'flex';
    if (statusBtn) statusBtn.classList.remove('online');
    if (statusLbl) statusLbl.innerText = 'Buka Kamera';
  }

  simulateMovement() {
    this.stopCamera();
    this.isSimulating = true;

    const gateCard = document.getElementById('camera-gate-card');
    const stopBtn = document.getElementById('btn-stop-virtual');
    const canvas = document.getElementById('tracking-canvas');
    if (gateCard) gateCard.style.display = 'none';
    if (stopBtn) stopBtn.style.display = 'block';
    if (canvas) { canvas.width = 640; canvas.height = 480; }

    this.syncService.resumeAudioContext().catch(() => {});
    this.syncService.initWebAudioGraph();

    let angle = 0;
    this.simInterval = setInterval(() => {
      if (!this.isSimulating) return;
      angle += 0.08;
      const curTarget = this.syncService.currentTarget || this.defaultSequence[0];
      const targetFingers = curTarget.fingerCount;

      const baseLandmarks = [];
      const wrist = { x: 0.5, y: 0.72 + Math.sin(angle) * 0.06 };
      baseLandmarks.push(wrist);

      const fingerConfigs = [
        { tipIdx: 4, open: targetFingers >= 5 || targetFingers === 10, openOffset: -0.16 },
        { tipIdx: 8, open: targetFingers >= 1, openOffset: -0.28 },
        { tipIdx: 12, open: targetFingers >= 2 && targetFingers !== 1, openOffset: -0.30 },
        { tipIdx: 16, open: (targetFingers >= 3 && targetFingers !== 1 && targetFingers !== 2) || targetFingers === 10, openOffset: -0.27 },
        { tipIdx: 20, open: targetFingers >= 4 || targetFingers === 10, openOffset: -0.24 },
      ];

      for (let i = 1; i <= 20; i++) {
        const fingerIdx = Math.floor((i - 1) / 4);
        const joint = (i - 1) % 4;
        const cfg = fingerConfigs[fingerIdx];
        const spread = (fingerIdx - 2) * 0.045;
        const extension = cfg.open ? (cfg.openOffset * ((joint + 1) / 4)) : -0.06;
        baseLandmarks.push({
          x: wrist.x + spread + Math.cos(angle * 0.5) * 0.01,
          y: wrist.y + extension + Math.sin(angle) * 0.04,
        });
      }

      const landmarksList = [baseLandmarks];
      if (targetFingers === 10) {
        const leftHand = baseLandmarks.map(p => ({ x: p.x - 0.25, y: p.y }));
        landmarksList.push(leftHand);
      }

      this.syncService.updateMotion(landmarksList, [{ label: 'Right' }, { label: 'Left' }], performance.now());

      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.drawHandSkeleton(ctx, baseLandmarks, canvas.width, canvas.height, true);
        if (targetFingers === 10) {
          const leftLandmarks = baseLandmarks.map(p => ({ x: p.x - 0.25, y: p.y }));
          this.drawHandSkeleton(ctx, leftLandmarks, canvas.width, canvas.height, true);
        }
      }
    }, 33);
  }

  stopSimulation() {
    this.isSimulating = false;
    if (this.simInterval) { clearInterval(this.simInterval); this.simInterval = null; }
    const gateCard = document.getElementById('camera-gate-card');
    const stopBtn = document.getElementById('btn-stop-virtual');
    const canvas = document.getElementById('tracking-canvas');
    if (stopBtn) stopBtn.style.display = 'none';
    if (gateCard) gateCard.style.display = 'flex';
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  onHandTrackingResults(results, canvas, video) {
    if (!canvas || !video) return;

    // Dynamically match canvas internal resolution to client display pixels for 1:1 sharp rendering
    const clientW = canvas.clientWidth || video.videoWidth || 640;
    const clientH = canvas.clientHeight || video.videoHeight || 480;
    if (canvas.width !== clientW || canvas.height !== clientH) {
      canvas.width = clientW;
      canvas.height = clientH;
    }

    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const landmarksList = results.landmarks || results.multiHandLandmarks || [];
    const handednessList = results.handedness || results.multiHandedness || results.handednesses || [];

    const tel = this.syncService.updateMotion(landmarksList, handednessList, performance.now());

    if (landmarksList.length > 0) {
      landmarksList.forEach(landmarks => {
        this.drawHandSkeleton(ctx, landmarks, w, h, tel.isTargetMatch, video);
      });
    } else {
      this.drawPoseGuide(ctx, w, h, tel.currentTarget);
    }
  }

  drawHandSkeleton(ctx, landmarks, w, h, isTargetMatch, video = null) {
    const CONNECTIONS = [
      [0,1],[1,2],[2,3],[3,4],
      [0,5],[5,6],[6,7],[7,8],
      [0,9],[9,10],[10,11],[11,12],
      [0,13],[13,14],[14,15],[15,16],
      [0,17],[17,18],[18,19],[19,20],
      [5,9],[9,13],[13,17]
    ];

    // Compute proper aspect-ratio cover projection so landmarks align precisely over webcam image
    let renderW = w;
    let renderH = h;
    let offsetX = 0;
    let offsetY = 0;

    if (video && video.videoWidth > 0 && video.videoHeight > 0) {
      const scale = Math.max(w / video.videoWidth, h / video.videoHeight);
      renderW = video.videoWidth * scale;
      renderH = video.videoHeight * scale;
      offsetX = (w - renderW) / 2;
      offsetY = (h - renderH) / 2;
    }

    const toScreen = (p) => ({
      x: offsetX + p.x * renderW,
      y: offsetY + p.y * renderH
    });

    const strokeColor = isTargetMatch ? '#00ff88' : (this.config.primaryColor || '#00f7ff');
    const glowColor = isTargetMatch ? 'rgba(0, 255, 136, 0.45)' : 'rgba(255, 215, 0, 0.35)';

    ctx.save();
    // 1. Sleek, thin cybernetic skeleton lines
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = strokeColor;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    CONNECTIONS.forEach(([i, j]) => {
      const p1 = landmarks[i], p2 = landmarks[j];
      if (p1 && p2) {
        const s1 = toScreen(p1);
        const s2 = toScreen(p2);
        ctx.beginPath();
        ctx.moveTo(s1.x, s1.y);
        ctx.lineTo(s2.x, s2.y);
        ctx.stroke();
      }
    });

    // 2. Refined, precise joint and fingertip markers (No chunky oversized balls!)
    landmarks.forEach((p, idx) => {
      const isTip = [4, 8, 12, 16, 20].includes(idx);
      const s = toScreen(p);

      if (isTip) {
        // Outer thin tracker ring for fingertips
        ctx.beginPath();
        ctx.arc(s.x, s.y, 6.5, 0, 2 * Math.PI);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.2;
        ctx.shadowBlur = 4;
        ctx.stroke();

        // Inner solid core
        ctx.beginPath();
        ctx.arc(s.x, s.y, 3.8, 0, 2 * Math.PI);
        ctx.fillStyle = isTargetMatch ? '#ffffff' : strokeColor;
        ctx.shadowBlur = 4;
        ctx.fill();
      } else {
        // Small, clean knuckle dots
        ctx.beginPath();
        ctx.arc(s.x, s.y, 2.2, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.shadowBlur = 2;
        ctx.fill();
      }
    });

    ctx.restore();
  }

  drawPoseGuide(ctx, w, h, target) {
    if (!target) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 247, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);

    const cx = w * 0.5, cy = h * 0.65;
    ctx.beginPath();
    ctx.arc(cx, cy, 70, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(0, 247, 255, 0.7)';
    ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`ANGKAT ${target.fingerCount} JARI (${target.emoji}) KE SINI`, cx, cy + 95);
    ctx.restore();
  }

  updateUI(tel) {
    if (!tel) return;

    const vinyl = document.getElementById('vinyl-disc-mini');
    if (vinyl) vinyl.classList.toggle('spinning', !!(tel.isMoving && tel.isPlaying));

    const timeEl = document.getElementById('time-display');
    if (timeEl) {
      const curSec = Math.floor(tel.currentTime || 0);
      const m = Math.floor(curSec / 60), s = curSec % 60;
      timeEl.innerText = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} / 01:00`;
    }

    const scoreEl = document.getElementById('score-digit');
    if (scoreEl) scoreEl.innerText = Number(tel.score).toLocaleString();

    const progBar = document.getElementById('progress-fill-gradient');
    if (progBar) progBar.style.width = `${tel.progressPct}%`;

    for (let i = 1; i <= 5; i++) {
      const heartEl = document.getElementById(`heart-${i}`);
      if (heartEl) {
        if (i <= tel.lives) { heartEl.innerText = '❤️'; heartEl.className = 'heart-icon active'; }
        else { heartEl.innerText = '🖤'; heartEl.className = 'heart-icon lost'; }
      }
    }

    const starVal = document.getElementById('stars-val');
    if (starVal && tel.starRating) {
      starVal.innerText = `${tel.starRating.starIcons} ${tel.starRating.title}`;
      starVal.style.color = tel.starRating.color || '#ffd700';
    }

    const curTarget = tel.currentTarget || this.defaultSequence[0];
    const abiVal = document.getElementById('abi-val');
    if (abiVal) abiVal.innerText = `${curTarget.emoji} ${curTarget.label || curTarget.name}`;

    const thbEmoji = document.getElementById('thb-emoji');
    const thbTitle = document.getElementById('thb-title');
    const thbDesc = document.getElementById('thb-desc');
    const thbLyric = document.getElementById('thb-lyric');
    const thbThumbImg = document.getElementById('thb-thumb-img');
    if (thbEmoji) thbEmoji.innerText = curTarget.emoji || '☝️';
    if (thbTitle) thbTitle.innerText = `TARGET: ${curTarget.label || curTarget.name}`;
    if (thbDesc) thbDesc.innerText = curTarget.tip || 'Ayunkan jarimu naik-turun santai mengikuti ketukan!';
    if (thbThumbImg) {
      const validFingers = [1, 2, 3, 4, 5, 10].includes(Number(curTarget.fingerCount)) ? curTarget.fingerCount : 1;
      const targetSrc = `/images/gesture_hand_${validFingers}.png`;
      if (!thbThumbImg.src.endsWith(targetSrc)) {
        thbThumbImg.src = targetSrc;
      }
    }
    if (thbLyric) {
      if (curTarget.lyric) {
        thbLyric.innerText = `🎵 "${curTarget.lyric}"`;
        thbLyric.style.display = 'block';
      } else {
        thbLyric.style.display = 'none';
      }
    }

    const handSlot = document.getElementById('hologram-hand-slot');
    if (handSlot && handSlot.dataset.currentFingers !== String(curTarget.fingerCount)) {
      handSlot.dataset.currentFingers = String(curTarget.fingerCount);
      handSlot.innerHTML = this.getHologramHandHtml(curTarget.fingerCount);
    }

    const activeBeat = tel.beatCount4 || 1;
    for (let b = 1; b <= 4; b++) {
      const pillEl = document.getElementById(`beat-pill-${b}`);
      if (pillEl) pillEl.classList.toggle('active', b === activeBeat);
    }

    const cdEl = document.getElementById('next-target-countdown');
    if (cdEl) {
      if (tel.nextTargetInfo) cdEl.innerText = `Berikutnya: ${tel.nextTargetInfo.nextTarget.emoji} ${tel.nextTargetInfo.nextTarget.name} (Ketukan ${tel.beatCount4 || 1}/4)`;
      else cdEl.innerText = `Menuju Selesai (${Math.max(0, 60 - Math.floor(tel.currentTime || 0))}s)`;
    }

    const cuesStrip = document.getElementById('upcoming-cues-strip');
    if (cuesStrip && tel.upcomingQueue) cuesStrip.innerHTML = this.renderUpcomingCues(tel.upcomingQueue);

    const compDet = document.getElementById('comp-detected-text');
    const compBadge = document.getElementById('comp-status-badge');
    const miniBar = document.getElementById('motion-mini-bar');
    if (compDet) compDet.innerText = tel.isTargetMatch ? `${curTarget.fingerCount} Jari (Cocok!)` : `${tel.totalFingers} Jari`;
    if (compBadge) {
      if (!tel.hasHand) { compBadge.className = 'comp-status-badge idle'; compBadge.innerText = '👋 Angkat Jari ke Kamera'; }
      else if (tel.isTargetMatch && tel.isMoving) { compBadge.className = 'comp-status-badge match'; compBadge.innerText = '🟢 TEPAT & BERGERAK!'; }
      else if (tel.isTargetMatch && !tel.isMoving) { compBadge.className = 'comp-status-badge match'; compBadge.innerText = '✨ BENTUK TEPAT! (AYUN NAIK-TURUN)'; }
      else if (curTarget.fingerCount <= 5 && tel.totalFingers > 5) {
        compBadge.className = 'comp-status-badge wrong'; compBadge.innerText = `⚠️ GUNAKAN 1 TANGAN SAJA!`;
      } else { compBadge.className = 'comp-status-badge wrong'; compBadge.innerText = `⚠️ SALAH! GUNAKAN ${curTarget.fingerCount} JARI (${curTarget.emoji})`; }
    }

    if (miniBar) {
      const motionPct = Math.min(100, Math.max(0, (tel.smoothedSpeed / 0.04) * 100));
      miniBar.style.width = `${motionPct}%`;
    }

    const bannerHead = document.getElementById('banner-heading');
    if (bannerHead) bannerHead.innerText = tel.guidanceMessage || this.config.defaultGuidance || 'AYUNKAN JARIMU NAIK-TURUN SESUAI KETUKAN LAGU!';
  }

  showLifeLostToast(remainingLives, reason) {
    const toast = document.getElementById('toast-life-lost');
    const msg = document.getElementById('toast-msg');
    if (toast && msg) {
      msg.innerText = `-1 NYAWA! ${reason.toUpperCase()} (SISA: ${remainingLives})`;
      toast.style.display = 'flex';
      toast.classList.remove('shake'); void toast.offsetWidth; toast.classList.add('shake');
      document.body.classList.add('screen-red-flash');
      setTimeout(() => document.body.classList.remove('screen-red-flash'), 350);
      setTimeout(() => { if (toast) toast.style.display = 'none'; }, 2000);
    }
  }

  showGameOverModal(stats) {
    const modal = document.getElementById('game-over-modal');
    if (!modal) return;
    const scoreVal = document.getElementById('stat-final-score');
    const timeVal = document.getElementById('stat-final-time');
    const starEl = document.getElementById('stat-gameover-stars');
    const rankEl = document.getElementById('stat-gameover-rank');
    if (scoreVal) scoreVal.innerText = Number(stats.score || 0).toLocaleString();
    if (timeVal) {
      const sec = Math.floor(stats.duration || 0), m = Math.floor(sec / 60), s = sec % 60;
      timeVal.innerText = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }
    if (stats.starRating) {
      if (starEl) starEl.innerText = stats.starRating.starIcons;
      if (rankEl) rankEl.innerText = `${stats.starRating.title} (${stats.starRating.stars}/5 Bintang)`;
    }

    // Catat perolehan ke Leaderboard secara otomatis
    const player = leaderboardService.getCurrentPlayer() || { name: 'Pemain', phone: '-' };
    const recordResult = leaderboardService.addScore({
      name: player.name,
      phone: player.phone,
      songId: this.config.songId,
      songTitle: this.config.title,
      score: stats.score || 0,
      lives: 0,
      starRating: stats.starRating,
      duration: stats.duration,
    });
    this.lastSavedRecordId = recordResult.entry.id;

    const rankChip = document.getElementById('stat-gameover-leaderboard-chip');
    if (rankChip) {
      rankChip.style.display = 'flex';
      rankChip.innerHTML = `
        <div class="mpr-left">
          <span class="mpr-player-lbl">PEMAIN TERCATAT:</span>
          <span class="mpr-player-val">👤 ${this.escapeHtml(player.name)}</span>
        </div>
        <div class="mpr-right">
          <span class="mpr-rank-val">Peringkat #${recordResult.overallRank}</span>
          <span class="mpr-rank-sub">dari ${recordResult.totalEntries} Pemain</span>
        </div>
      `;
    }

    modal.style.display = 'flex';
  }

  showVictoryModal(stats) {
    const modal = document.getElementById('victory-modal');
    if (!modal) return;
    const scoreVal = document.getElementById('stat-victory-score');
    const livesVal = document.getElementById('stat-victory-lives');
    const starEl = document.getElementById('stat-victory-stars');
    const rankEl = document.getElementById('stat-victory-rank');
    const descEl = document.getElementById('stat-victory-desc');
    if (scoreVal) scoreVal.innerText = Number(stats.score || 0).toLocaleString();
    if (livesVal) livesVal.innerText = `${stats.lives || 5}/5 ❤️`;
    if (stats.starRating) {
      if (starEl) starEl.innerText = stats.starRating.starIcons;
      if (rankEl) rankEl.innerText = `${stats.starRating.title} (${stats.starRating.stars}/5 BINTANG)`;
      if (descEl) descEl.innerText = stats.starRating.description;
    }

    // Catat perolehan ke Leaderboard secara otomatis
    const player = leaderboardService.getCurrentPlayer() || { name: 'Pemain', phone: '-' };
    const recordResult = leaderboardService.addScore({
      name: player.name,
      phone: player.phone,
      songId: this.config.songId,
      songTitle: this.config.title,
      score: stats.score || 0,
      lives: stats.lives || 5,
      starRating: stats.starRating,
      duration: stats.duration,
    });
    this.lastSavedRecordId = recordResult.entry.id;

    const rankChip = document.getElementById('stat-victory-leaderboard-chip');
    if (rankChip) {
      rankChip.style.display = 'flex';
      const rankTitle = recordResult.isChampion
        ? '👑 REKOR #1 JUARA BARU!'
        : (recordResult.isTop3 ? `🔥 TOP 3 BESAR (#${recordResult.overallRank})` : `Peringkat #${recordResult.overallRank}`);
      rankChip.innerHTML = `
        <div class="mpr-left">
          <span class="mpr-player-lbl">PEMAIN TERCATAT:</span>
          <span class="mpr-player-val">👤 ${this.escapeHtml(player.name)}</span>
        </div>
        <div class="mpr-right">
          <span class="mpr-rank-val">${rankTitle}</span>
          <span class="mpr-rank-sub">dari ${recordResult.totalEntries} Pemain</span>
        </div>
      `;
    }

    modal.style.display = 'flex';
  }
}

// ─────────────────────────────────────────────
// JATUH SUKA GAME
// ─────────────────────────────────────────────
class JatuhSukaGame extends GestureMusicGameEngine {
  constructor(appEl, onBackToMenu) {
    super(appEl, onBackToMenu, {
      songId: 'jatuhsuka',
      title: 'JATUH SUKA',
      durationLabel: '60s / 1 MENIT',
      genre: 'POP INDONESIA',
      syncService: jatuhSukaSyncService,
      defaultSequence: jatuhSukaSyncService.sequence,
      themeClass: '',
      primaryColor: '#00f7ff',
      accentColor: '#ff007f',
      defaultGuidance: 'AYUNKAN JARIMU NAIK-TURUN SESUAI KETUKAN LAGU JATUH SUKA!',
    });
  }
}

// ─────────────────────────────────────────────
// TARAGAK PULANG GAME
// ─────────────────────────────────────────────
class TaragakPulangGame extends GestureMusicGameEngine {
  constructor(appEl, onBackToMenu) {
    super(appEl, onBackToMenu, {
      songId: 'taragak',
      title: 'TARAGAK PULANG',
      durationLabel: '60s / 1 MENIT',
      genre: 'MINANG KLASIK',
      syncService: taragakPulangSyncService,
      defaultSequence: taragakPulangSyncService.sequence,
      themeClass: 'taragak-theme',
      primaryColor: '#ffd700',
      accentColor: '#00ff88',
      defaultGuidance: 'AYUNKAN JARIMU NAIK-TURUN MENGIKUTI IRAMA MINANG TARAGAK PULANG!',
    });
  }
}

// ─────────────────────────────────────────────
// APP ROUTER
// ─────────────────────────────────────────────
class GestureMusikApp {
  constructor() {
    this.appEl = document.getElementById('app');
    this.currentScreen = null;
    this.showMenu();
  }

  showMenu() {
    if (this.currentScreen) {
      if (typeof this.currentScreen.stop === 'function') this.currentScreen.stop();
      this.currentScreen = null;
    }
    const menu = new SongMenuScreen((selectedSong) => {
      if (selectedSong === 'jatuhsuka') this.showJatuhSuka();
      else if (selectedSong === 'taragak') this.showTaragakPulang();
    });
    menu.render();
    this.currentScreen = menu;
  }

  showJatuhSuka() {
    const game = new JatuhSukaGame(this.appEl, () => this.showMenu());
    this.currentScreen = game;
    game.start();
  }

  showTaragakPulang() {
    const game = new TaragakPulangGame(this.appEl, () => this.showMenu());
    this.currentScreen = game;
    game.start();
  }
}

// Global user-gesture unlock for browser audio autoplay policy
window.addEventListener('pointerdown', () => {
  jatuhSukaSyncService.unlockAudio();
  taragakPulangSyncService.unlockAudio();
});

// Initialize
window.addEventListener('DOMContentLoaded', () => {
  window.app = new GestureMusikApp();
});

export { SongMenuScreen, GestureMusicGameEngine, JatuhSukaGame, TaragakPulangGame, GestureMusikApp };
