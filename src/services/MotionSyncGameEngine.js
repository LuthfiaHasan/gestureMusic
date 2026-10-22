// main.js - Gesture Musik
// Song Selection Menu + Jatuh Suka + Taragak Pulang
// High-Fidelity 10-Finger Motion Audio Synchronization Game Engine

import '../style.css';
import { cameraService } from './CameraService.js';
import { handTrackingService } from './HandTrackingService.js';
import { jatuhSukaSyncService, JATUH_SUKA_SEQUENCE } from './JatuhSukaAudioMotionService.js';
import { taragakPulangSyncService, TARAGAK_PULANG_SEQUENCE } from './TaragakPulangSyncService.js';
import { leaderboardService } from './LeaderboardService.js';
import { leaderboardUI } from '../ui/LeaderboardModal.js';
import { competitionLeaderboardService, COMPETITION_TRACKS } from './CompetitionLeaderboardService.js';
import { qrCodeService } from './QrCodeService.js';
import { gameEngine, GAME_STATES } from '../game/GameEngine.js';

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
          <div class="mps-avatar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </div>
          <div class="mps-text">
            <div class="mps-label-row">
              <span class="mps-status-tag active">PEMAIN AKTIF</span>
            </div>
            <div class="mps-name">${this.escapeHtml(player.name)}</div>
            <div class="mps-phone">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-1px;margin-right:3px;"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
              ${leaderboardService.formatPhone(player.phone, true)}
            </div>
          </div>
        </div>
        <div class="mps-actions">
          <button class="btn-mps-change" id="btn-mps-change" title="Ubah Nama atau Nomor Telepon">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-1px;margin-right:4px;"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            Ganti Pemain
          </button>
          <button class="btn-mps-leaderboard" id="btn-mps-leaderboard" title="Lihat Papan Peringkat Skor">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-1px;margin-right:4px;"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.45 1-1 1H8c-.55 0-1 .45-1 1v1h10v-1c0-.55-.45-1-1-1h-1c-.55 0-1-.45-1-1v-2.34"></path><path d="M6 4h12v6a6 6 0 0 1-12 0V4z"></path></svg>
            Papan Peringkat
          </button>
        </div>
      </div>
    ` : `
      <div class="menu-player-strip">
        <div class="mps-info-group">
          <div class="mps-avatar unregistered">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          </div>
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
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-1px;margin-right:4px;"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
            Isi Data Pemain
          </button>
          <button class="btn-mps-leaderboard" id="btn-mps-leaderboard" title="Lihat Papan Peringkat Skor">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-1px;margin-right:4px;"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.45 1-1 1H8c-.55 0-1 .45-1 1v1h10v-1c0-.55-.45-1-1-1h-1c-.55 0-1-.45-1-1v-2.34"></path><path d="M6 4h12v6a6 6 0 0 1-12 0V4z"></path></svg>
            Papan Peringkat
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

  cleanGuidance(msg) {
    if (!msg) return '';
    return msg
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, '')
      .replace(/[💀🎉🙌⚠️🟢✨👋✔❤️🖤⭐]/gu, '')
      .replace(/\(\s*\)/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  renderHeartsHtml(lives = 5, maxLives = 5) {
    let html = '';
    const activeCount = Math.max(0, lives !== undefined ? lives : 0);
    for (let i = 0; i < maxLives; i++) {
      if (i < activeCount) {
        html += `<svg width="14" height="14" viewBox="0 0 24 24" fill="#ff3366" class="hud-heart active"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
      } else {
        html += `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="2" class="hud-heart empty"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
      }
    }
    return html;
  }

  getHologramHandHtml(fingerCount = 1) {
    const validCount = [1, 2, 3, 4, 5, 10].includes(Number(fingerCount)) ? Number(fingerCount) : 1;
    const isTen = validCount === 10;
    const gestureNames = {
      1: '1 JARI TELUNJUK',
      2: '2 JARI PEACE',
      3: '3 JARI (INDEX + MID + RING)',
      4: '4 JARI (LIPAT JEMPOL)',
      5: '5 JARI TELAPAK',
      10: '10 JARI (DUA TANGAN)'
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
            <button class="btn-icon-back" id="btn-back-menu" title="Kembali ke Menu">‹</button>
            <div class="gm-title-text-wrap">
              <div class="gm-title-heading">
                <span class="gm-title-pulse">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none" style="color:var(--cyan);"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>
                </span>
                <span class="gm-main-title">${this.config.title}</span>
                <span class="gm-genre-badge">${this.config.genre || 'MUSIK'}</span>
              </div>
              <span class="gm-subtitle">TANTANGAN 60 DETIK • 10-FINGER MOTION SYNC • REFLEKS KAMERA</span>
            </div>
          </div>
          <div class="gm-header-actions">
            <button class="mode-pill gm-head-btn" id="btn-top-player-chip" title="Profil Pemain">
              <svg class="btn-svg-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <span id="top-player-name">${this.escapeHtml(leaderboardService.getCurrentPlayer()?.name || 'Pemain')}</span>
            </button>
            <button class="mode-pill gm-head-btn" id="btn-top-leaderboard" title="Buka Klasemen">
              <svg class="btn-svg-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.45 1-1 1H8c-.55 0-1 .45-1 1v1h10v-1c0-.55-.45-1-1-1h-1c-.55 0-1-.45-1-1v-2.34"></path><path d="M6 4h12v6a6 6 0 0 1-12 0V4z"></path></svg>
              <span>Leaderboard</span>
            </button>
            <button class="mode-pill gm-head-btn ${this.isCameraActive ? 'active' : ''}" id="btn-camera-status-toggle">
              <span class="status-pulse-dot"></span>
              <span id="cam-status-label">${this.isCameraActive ? 'Kamera Aktif' : 'Buka Kamera'}</span>
            </button>
            <button class="mode-pill gm-head-btn" id="btn-kembali" title="Ulang lagu dari awal">
              <svg class="btn-svg-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
              <span>Reset Lagu</span>
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
              <span class="abi-val" id="abi-val">${curTarget.label || curTarget.name}</span>
            </div>
            <div class="lives-display-badge">
              <span class="lives-caption">SISA NYAWA:</span>
              <div class="hearts-row" id="hearts-row">
                ${this.renderHeartsHtml(tel.lives !== undefined ? tel.lives : 5)}
              </div>
            </div>
            <div class="stars-display-badge" id="stars-display-badge">
              <span class="stars-caption">PERFORMA:</span>
              <span class="stars-val" id="stars-val"><svg width="12" height="12" viewBox="0 0 24 24" fill="#ffd700" class="btn-svg-icon" style="margin-right:4px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>PERFECT</span>
            </div>
            <div class="score-progress-group">
              <div class="score-line">
                <span class="score-caption">WAKTU:</span>
                <span class="time-digit" id="time-display">00:00 / 01:00</span>
                <span class="score-sep">•</span>
                <span class="score-caption">SKOR:</span>
                <span class="score-digit" id="score-digit">0 PTS</span>
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
              <button class="btn-stop-virtual" id="btn-stop-virtual" style="display: none;">Hentikan Mode Virtual</button>
              <video id="camera-video" autoplay playsinline muted style="opacity: 1 !important; display: block !important;"></video>
              <canvas id="tracking-canvas"></canvas>
              <div class="camera-gate-card" id="camera-gate-card" style="${this.isCameraActive ? 'display:none;' : 'display:flex;'}">
                <div class="gate-modal-content">
                  <div class="gate-cam-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg></div>
                  <h3 class="gate-head">KAMERA WEBCAM</h3>
                  <p class="gate-hint" id="gate-hint">Buka webcam laptop Anda untuk mengendalikan musik, atau gunakan Mode Virtual jika kamera sedang sibuk.</p>
                  <div class="gate-buttons-col">
                    <button class="btn-gate-activate" id="btn-gate-activate">BUKA KAMERA SEKARANG</button>
                    <button class="btn-gate-sim" id="btn-gate-sim">Uji Mode Virtual (Rotasi Jari Otomatis)</button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- RIGHT PANEL: REFINED PETUNJUK GERAKAN JARI -->
          <section class="gm-panel guide-stage-panel">
            <div class="panel-box-header">
              <h2 class="panel-title">PETUNJUK GERAKAN JARI</h2>
              <button class="btn-guide-help" id="btn-open-gesture-guide" title="Lihat Panduan 6 Jari"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="btn-svg-icon" style="margin-right:4px;"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>Panduan Jari</button>
              <div class="next-target-countdown" id="next-target-countdown">Berikutnya: 2 Jari (dalam 4s)</div>
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
                  ${curTarget.lyric ? `<p class="thb-lyric" id="thb-lyric" style="font-size:11px;color:rgba(220,235,255,0.85);margin-top:2px;font-style:italic;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="btn-svg-icon" style="margin-right:4px;"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3" fill="currentColor"></circle><circle cx="18" cy="16" r="3" fill="currentColor"></circle></svg>"${curTarget.lyric}"</p>` : ''}
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
                  <span class="bmi-wave"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="btn-svg-icon" style="margin-right:4px;"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>AYUN NAIK-TURUN</span>
                </div>
              </div>

              <!-- 5. Live Comparison Card: Terdeteksi vs Target & Bar Kecepatan -->
              <div class="live-finger-comparison-card">
                <div class="comparison-row">
                  <div class="comp-col">
                    <span class="comp-lbl">TERDETEKSI:</span>
                    <span class="comp-val" id="comp-detected-text">Belum ada tangan</span>
                  </div>
                  <div class="comp-status-badge idle" id="comp-status-badge">Angkat Jari ke Kamera</div>
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
                <div class="banner-heading" id="banner-heading">${this.cleanGuidance(tel.guidanceMessage) || this.cleanGuidance(this.config.defaultGuidance)}</div>
                <div class="banner-sub">Tahan bentuk jari yang tepat & ayunkan naik-turun santai! Musik akan berputar mulus.</div>
              </div>
            </div>
          </section>
        </main>

        <footer class="gm-bottom-strip">
          <div class="audio-hud-controls">
            <div class="waveform-box">
              <canvas id="waveform-canvas" width="220" height="34"></canvas>
            </div>
            <div class="volume-slider-group">
              <svg class="vol-svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              </svg>
              <input type="range" id="volume-slider" min="0" max="100" value="85" class="slider-cyber" title="Volume Musik"/>
            </div>
            <button class="btn-mirror-cyber ${this.isMirrored ? 'active' : ''}" id="btn-mirror-toggle" title="Klik untuk balikkan tampilan cermin kamera">
              <svg class="mirror-svg-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2v20"></path>
                <path d="M4 18l8-12v12H4z"></path>
                <path d="M20 18l-8-12v12h8z" stroke-dasharray="2 2"></path>
              </svg>
              <span>Cermin Kamera</span>
            </button>
          </div>
        </footer>

        <!-- Toast -1 Nyawa -->
        <div class="toast-life-lost" id="toast-life-lost" style="display: none;">
          <div class="toast-heart">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#ff2d55" stroke="#ff2d55"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>
          </div>
          <div class="toast-msg" id="toast-msg">-1 NYAWA (SISA: 4)</div>
        </div>

        <!-- Modal Game Over (Lagu Hangus) -->
        <div class="game-over-modal-backdrop" id="game-over-modal" style="display: none;">
          <div class="game-over-modal-card">
            <div class="modal-skull-icon">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#ff2d55" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="gameover-svg-icon">
                <path d="M12 2a8 8 0 0 0-8 8c0 3.3 2 6 4 7.5V20a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.5c2-1.5 4-4.2 4-7.5a8 8 0 0 0-8-8z"></path>
                <circle cx="9" cy="11" r="1.5" fill="#ff2d55"></circle>
                <circle cx="15" cy="11" r="1.5" fill="#ff2d55"></circle>
                <line x1="10" y1="19" x2="10" y2="22"></line>
                <line x1="14" y1="19" x2="14" y2="22"></line>
              </svg>
            </div>
            <h2 class="modal-title">LAGU HANGUS!</h2>
            <p class="modal-subtitle">Nyawa Anda Habis! Anda salah melakukan gerakan sebanyak 5 kali.</p>
            <div class="modal-star-section">
              <div class="modal-star-banner" id="stat-gameover-stars">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#ffd700" stroke="#ffd700" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              </div>
              <span class="stat-lbl" id="stat-gameover-rank">SURVIVE (1/5 Bintang)</span>
            </div>
            <div style="display:flex;gap:18px;margin:8px 0;width:100%;justify-content:center;">
              <div><span style="font-size:18px;font-weight:900;color:#fff;" id="stat-final-score">0</span><br><span style="font-size:10px;color:rgba(255,255,255,0.6);">SKOR KETUKAN</span></div>
              <div><span style="font-size:18px;font-weight:900;color:var(--cyan);" id="stat-final-time">00:00</span><br><span style="font-size:10px;color:rgba(255,255,255,0.6);">WAKTU BERTAHAN</span></div>
            </div>
            <div class="modal-player-rank-chip" id="stat-gameover-leaderboard-chip" style="display: none;"></div>
            <button class="btn-modal-leaderboard" id="btn-leaderboard-gameover">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffd700" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:6px;"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.45 1-1 1H8c-.55 0-1 .45-1 1v1h10v-1c0-.55-.45-1-1-1h-1c-.55 0-1-.45-1-1v-2.34"></path><path d="M6 4h12v6a6 6 0 0 1-12 0V4z"></path></svg>
              <span>Buka Papan Peringkat Terpadu</span>
            </button>
            <button class="btn-modal-restart" id="btn-retry-gameover">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:6px;"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
              <span>Coba Lagi (Ulangi Lagu)</span>
            </button>
            <button class="btn-modal-menu" id="btn-menu-gameover">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:6px;"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
              <span>Kembali ke Menu</span>
            </button>
          </div>
        </div>

        <!-- Modal Kemenangan (Lagu Selesai) -->
        <div class="game-over-modal-backdrop" id="victory-modal" style="display: none;">
          <div class="game-over-modal-card victory-card" style="max-width:440px;">
            <div class="modal-skull-icon victory-icon">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#ffd700" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="victory-svg-icon" style="filter: drop-shadow(0 0 16px rgba(255, 215, 0, 0.8));">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
                <path d="M4 22h16"></path>
                <path d="M10 14.66V17c0 .55-.45 1-1 1H8c-.55 0-1 .45-1 1v1h10v-1c0-.55-.45-1-1-1h-1c-.55 0-1-.45-1-1v-2.34"></path>
                <path d="M6 4h12v6a6 6 0 0 1-12 0V4z"></path>
              </svg>
            </div>
            <h2 class="modal-title victory-title">LAGU SELESAI!</h2>
            <p class="modal-subtitle">Selamat! Anda menyelesaikan tantangan 1 Menit lagu ${this.config.title}!</p>
            <div class="modal-star-section">
              <div class="modal-star-banner animated-stars" id="stat-victory-stars">
                <!-- 5 stars generated dynamically -->
              </div>
              <span class="stat-lbl" id="stat-victory-rank">PERFECT!</span>
            </div>

            <!-- Standardized 100k Points Competition Score Banner -->
            <div style="background:rgba(0,247,255,0.1);border:1.5px solid #00f7ff;border-radius:12px;padding:10px 14px;margin:10px 0;text-align:center;box-shadow:0 0 20px rgba(0,247,255,0.25);">
              <span style="font-size:10.5px;font-weight:800;color:#00f7ff;letter-spacing:1px;display:block;">SKOR RESMI KOMPETISI (STANDAR 100K POIN):</span>
              <span style="font-size:26px;font-weight:900;color:#ffd700;" id="stat-victory-standard-score">96,500 PTS</span>
              <div style="font-size:10.5px;color:rgba(255,255,255,0.8);margin-top:2px;" id="stat-victory-breakdown-desc">Tepat Irama: 66,500 • Gestur 10 Jari: 20,000 • Combo: 10,000</div>
            </div>

            <div style="display:flex;gap:18px;margin:6px 0;width:100%;justify-content:center;">
              <div><span style="font-size:16px;font-weight:900;color:#ffd700;" id="stat-victory-score">1,250</span><br><span style="font-size:9.5px;color:rgba(255,255,255,0.6);">SKOR KETUKAN</span></div>
              <div><span style="font-size:16px;font-weight:900;color:#00ff88;" id="stat-victory-lives">5/5</span><br><span style="font-size:9.5px;color:rgba(255,255,255,0.6);">SISA NYAWA</span></div>
            </div>

            <!-- Official QR Registration Card -->
            <div style="display:flex;align-items:center;gap:12px;background:rgba(12,6,26,0.92);border:1.2px solid rgba(0,247,255,0.4);border-radius:12px;padding:10px 12px;margin:8px 0;text-align:left;">
              <div style="background:#fff;border-radius:8px;padding:4px;flex-shrink:0;">
                <canvas id="motionsync-victory-qr-canvas" width="105" height="105"></canvas>
              </div>
              <div style="flex:1;">
                <span style="background:#00f7ff;color:#060a14;font-size:9.5px;font-weight:800;padding:2px 6px;border-radius:10px;display:inline-block;margin-bottom:3px;">KLAIM HADIAH RESMI</span>
                <div style="font-size:11.5px;font-weight:800;color:#fff;line-height:1.2;">SCAN QR UNTUK DAFTAR NAMA & HP</div>
                <div style="font-size:10px;color:rgba(255,255,255,0.7);margin:3px 0 6px 0;">Atau daftarkan langsung dari layar ini:</div>
                <button class="btn-claim-inline" id="btn-motionsync-manual-claim" style="background:linear-gradient(135deg,#ff2d75,#ff6584);color:#fff;border:none;border-radius:6px;padding:5px 10px;font-size:11px;font-weight:800;cursor:pointer;">Input di Layar Ini</button>
              </div>
            </div>

            <button class="btn-modal-leaderboard" id="btn-leaderboard-victory">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffd700" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:6px;"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.45 1-1 1H8c-.55 0-1 .45-1 1v1h10v-1c0-.55-.45-1-1-1h-1c-.55 0-1-.45-1-1v-2.34"></path><path d="M6 4h12v6a6 6 0 0 1-12 0V4z"></path></svg>
              <span>Buka Papan Peringkat Terpadu</span>
            </button>
            <button class="btn-modal-restart btn-victory-restart" id="btn-retry-victory">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:6px;"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
              <span>Mainkan Lagi</span>
            </button>
            <button class="btn-modal-menu" id="btn-menu-victory">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:6px;"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="M6 4v10"></path><path d="M10 4v10"></path><path d="M14 4v10"></path><path d="M18 4v10"></path><path d="M2 14h20"></path></svg>
              <span>Pilih Lagu Lain</span>
            </button>
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

    document.getElementById('btn-mirror-toggle')?.addEventListener('click', (e) => {
      this.isMirrored = !this.isMirrored;
      const vid = document.getElementById('camera-video');
      const can = document.getElementById('tracking-canvas');
      if (vid) vid.style.transform = this.isMirrored ? 'scaleX(-1)' : 'none';
      if (can) can.style.transform = this.isMirrored ? 'scaleX(-1)' : 'none';
      const btn = e.currentTarget || document.getElementById('btn-mirror-toggle');
      if (btn) btn.classList.toggle('active', this.isMirrored);
    });

    document.getElementById('volume-slider')?.addEventListener('input', (e) => {
      this.syncService.setVolume(Number(e.target.value) / 100);
    });

    document.getElementById('btn-top-leaderboard')?.addEventListener('click', () => {
      this.stop();
      gameEngine.setState(GAME_STATES.LEADERBOARD);
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
      this.stop();
      gameEngine.setState(GAME_STATES.LEADERBOARD);
    });

    document.getElementById('btn-leaderboard-victory')?.addEventListener('click', () => {
      this.stop();
      gameEngine.setState(GAME_STATES.LEADERBOARD);
    });

    document.getElementById('btn-motionsync-manual-claim')?.addEventListener('click', () => {
      this.stop();
      gameEngine.setState(GAME_STATES.LEADERBOARD);
      setTimeout(() => {
        const manModal = document.getElementById('manual-input-modal');
        if (manModal) {
          const trackSelect = document.getElementById('kiosk-select-track');
          const scoreInput = document.getElementById('kiosk-input-score');
          const songId = this.config.songId === 'taragak' ? 'TARAGAK_PULANG' : 'JATUH_SUKA';
          if (trackSelect) trackSelect.value = songId;
          const pending = competitionLeaderboardService.getPendingSession();
          if (scoreInput && pending?.score) scoreInput.value = pending.score;
          manModal.style.display = 'flex';
        }
      }, 150);
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

      let stream = null;
      if (cameraService.stream && cameraService.stream.active && cameraService.stream.getVideoTracks().some(t => t.readyState === 'live')) {
        stream = cameraService.stream;
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 30, max: 60 }
          },
          audio: false,
        });
        cameraService.stream = stream;
        cameraService.isReady = true;
        cameraService.isStreaming = true;
      }

      this.stream = stream;
      video.srcObject = stream;
      video.setAttribute('playsinline', '');
      video.muted = true;
      video.style.opacity = '1';
      video.style.display = 'block';

      if (this.isMirrored) {
        video.classList.add('mirrored');
        canvas.classList.add('mirrored');
      } else {
        video.classList.remove('mirrored');
        canvas.classList.remove('mirrored');
      }

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
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          gateHint.innerText = '⚠️ Izin webcam belum diaktifkan browser. Klik "BUKA KAMERA SEKARANG" dan pilih "Allow", atau klik Uji Mode Virtual!';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          gateHint.innerText = '⚠️ Kamera tidak ditemukan di perangkat ini. Silakan gunakan tombol Uji Mode Virtual di bawah!';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError' || (err.message && err.message.includes('Device in use'))) {
          gateHint.innerText = '⚠️ Kamera sedang digunakan oleh aplikasi lain (seperti Zoom, Teams, OBS). Tutup aplikasi tersebut lalu klik Buka Kamera!';
        } else {
          gateHint.innerText = `⚠️ Webcam belum aktif (${err.message || 'sibuk'}). Anda bisa menggunakan tombol Uji Mode Virtual di bawah!`;
        }
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
    cameraService.stop();
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
    ctx.fillText(`ANGKAT ${target.fingerCount} JARI KE SINI`, cx, cy + 95);
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
    if (scoreEl) scoreEl.innerText = `${Number(tel.score).toLocaleString()} PTS`;

    const progBar = document.getElementById('progress-fill-gradient');
    if (progBar) progBar.style.width = `${tel.progressPct}%`;

    const heartsRow = document.getElementById('hearts-row');
    if (heartsRow && tel.lives !== undefined) {
      heartsRow.innerHTML = this.renderHeartsHtml(tel.lives, 5);
    }

    const starVal = document.getElementById('stars-val');
    if (starVal && tel.starRating) {
      starVal.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="#ffd700" class="btn-svg-icon" style="margin-right:4px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg><span>${tel.starRating.title || 'PERFECT'}</span>`;
      starVal.style.color = tel.starRating.color || '#ffd700';
    }

    const curTarget = tel.currentTarget || this.defaultSequence[0];
    const abiVal = document.getElementById('abi-val');
    if (abiVal) abiVal.innerText = `${curTarget.label || curTarget.name}`;

    const thbTitle = document.getElementById('thb-title');
    const thbDesc = document.getElementById('thb-desc');
    const thbLyric = document.getElementById('thb-lyric');
    const thbThumbImg = document.getElementById('thb-thumb-img');
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
        thbLyric.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="btn-svg-icon" style="margin-right:4px;"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3" fill="currentColor"></circle><circle cx="18" cy="16" r="3" fill="currentColor"></circle></svg>"${curTarget.lyric}"`;
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
      if (tel.nextTargetInfo) cdEl.innerText = `Berikutnya: ${tel.nextTargetInfo.nextTarget.name} (Ketukan ${tel.beatCount4 || 1}/4)`;
      else cdEl.innerText = `Menuju Selesai (${Math.max(0, 60 - Math.floor(tel.currentTime || 0))}s)`;
    }

    const cuesStrip = document.getElementById('upcoming-cues-strip');
    if (cuesStrip && tel.upcomingQueue) cuesStrip.innerHTML = this.renderUpcomingCues(tel.upcomingQueue);

    const compDet = document.getElementById('comp-detected-text');
    const compBadge = document.getElementById('comp-status-badge');
    const miniBar = document.getElementById('motion-mini-bar');
    if (compDet) compDet.innerText = tel.isTargetMatch ? `${curTarget.fingerCount} Jari (Cocok!)` : `${tel.totalFingers} Jari`;
    if (compBadge) {
      if (!tel.hasHand) { compBadge.className = 'comp-status-badge idle'; compBadge.innerText = 'Angkat Jari ke Kamera'; }
      else if (tel.isTargetMatch && tel.isMoving) { compBadge.className = 'comp-status-badge match'; compBadge.innerText = 'TEPAT & BERGERAK!'; }
      else if (tel.isTargetMatch && !tel.isMoving) { compBadge.className = 'comp-status-badge match'; compBadge.innerText = 'BENTUK TEPAT! (AYUN NAIK-TURUN)'; }
      else if (curTarget.fingerCount <= 5 && tel.totalFingers > 5) {
        compBadge.className = 'comp-status-badge wrong'; compBadge.innerText = `GUNAKAN 1 TANGAN SAJA!`;
      } else { compBadge.className = 'comp-status-badge wrong'; compBadge.innerText = `BENTUK SALAH: GUNAKAN ${curTarget.fingerCount} JARI`; }
    }

    if (miniBar) {
      const motionPct = Math.min(100, Math.max(0, (tel.smoothedSpeed / 0.04) * 100));
      miniBar.style.width = `${motionPct}%`;
    }

    const bannerHead = document.getElementById('banner-heading');
    if (bannerHead) bannerHead.innerText = this.cleanGuidance(tel.guidanceMessage) || this.cleanGuidance(this.config.defaultGuidance) || 'AYUNKAN JARIMU NAIK-TURUN SESUAI KETUKAN LAGU!';
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

  _renderStars(earnedCount, max = 5) {
    const earned = Math.max(0, Math.min(max, earnedCount || 1));
    return Array.from({ length: max }, (_, i) => {
      const isEarned = i < earned;
      return `<svg class="star-rating-svg ${isEarned ? 'earned' : 'unearned'}" width="20" height="20" viewBox="0 0 24 24" fill="${isEarned ? '#ffd700' : 'rgba(255,255,255,0.1)'}" stroke="${isEarned ? '#ffd700' : 'rgba(255,255,255,0.22)'}" stroke-width="1.2" style="display:inline-block;margin:0 2px;${isEarned ? 'filter:drop-shadow(0 0 6px rgba(255,215,0,0.7));' : ''}"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
    }).join('');
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
      if (starEl) starEl.innerHTML = this._renderStars(stats.starRating.stars || 1);
      if (rankEl) rankEl.innerText = `${stats.starRating.title} (${stats.starRating.stars}/5 Bintang)`;
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
    if (livesVal) livesVal.innerText = `${stats.lives || 5}/5 Sisa Nyawa`;
    if (stats.starRating) {
      if (starEl) starEl.innerHTML = this._renderStars(stats.starRating.stars || 5);
      if (rankEl) rankEl.innerText = `${stats.starRating.title} (${stats.starRating.stars}/5 Bintang)`;
      if (descEl) descEl.innerText = stats.starRating.description;
    }

    // Standardized competition score for 1 Unified Leaderboard
    const songId = this.config.songId === 'taragak' ? 'TARAGAK_PULANG' : 'JATUH_SUKA';
    const trackInfo = COMPETITION_TRACKS[songId] || { title: this.config.title, badge: this.config.title, emoji: '✨' };

    const stdScoreCalc = competitionLeaderboardService.calculateMotionSyncScore({
      songId,
      rawScore: stats.score || 0,
      lives: stats.lives || 5,
      maxLives: 5,
      duration: stats.duration || 60,
      targetDuration: 60,
      starRating: stats.starRating,
    });

    const compSession = competitionLeaderboardService.createPendingSession({
      songId,
      songTitle: trackInfo.title,
      songBadge: trackInfo.badge,
      songEmoji: trackInfo.emoji,
      totalNotes: stdScoreCalc.totalNotes,
      perfectCount: stdScoreCalc.perfectCount,
      greatCount: stdScoreCalc.greatCount,
      goodCount: stdScoreCalc.goodCount,
      badCount: 0,
      missCount: stdScoreCalc.missCount,
      maxCombo: stdScoreCalc.maxCombo,
      chordAccuracyPct: stdScoreCalc.accuracyPct,
      scorePct: stdScoreCalc.accuracyPct,
      grade: stdScoreCalc.grade,
      stars: stdScoreCalc.stars,
      customScore: stdScoreCalc.standardScore,
    });

    const stdScoreEl = document.getElementById('stat-victory-standard-score');
    if (stdScoreEl) {
      stdScoreEl.innerText = `${stdScoreCalc.standardScore.toLocaleString()} PTS / 100k`;
    }
    const breakdownEl = document.getElementById('stat-victory-breakdown-desc');
    if (breakdownEl) {
      breakdownEl.innerText = `Akurasi Irama: ${stdScoreCalc.timingScore.toLocaleString()} • Gestur Jari: ${stdScoreCalc.gestureScore.toLocaleString()} • Combo Streak: ${stdScoreCalc.comboScore.toLocaleString()}`;
    }

    setTimeout(() => {
      const qrCanvas = document.getElementById('motionsync-victory-qr-canvas');
      if (qrCanvas && compSession?.claimUrl) {
        qrCodeService.renderToCanvas(qrCanvas, compSession.claimUrl, {
          size: 105,
          padding: 6,
          darkColor: '#0a0518',
          lightColor: '#ffffff',
          showEmblem: false,
        });
      }
    }, 60);

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
      themeClass: '',
      primaryColor: '#00f7ff',
      accentColor: '#00ff88',
      defaultGuidance: 'AYUNKAN JARIMU NAIK-TURUN SESUAI KETUKAN LAGU TARAGAK PULANG!',
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
