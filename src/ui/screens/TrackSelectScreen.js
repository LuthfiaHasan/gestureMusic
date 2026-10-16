// TrackSelectScreen.js - Song/Track Selection for Competition Leaderboard
// Allows players to choose which song they want to play while competing fairly on 1 unified leaderboard.

import { COMPETITION_TRACKS } from '../../services/CompetitionLeaderboardService.js';
import { gameEngine, GAME_STATES } from '../../game/GameEngine.js';
import { settingsManager } from '../../services/SettingsManager.js';
import { audioManager } from '../../audio/AudioManager.js';

const TRACK_ICONS = {
  KOMANG: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="M6 4v10"></path><path d="M10 4v10"></path><path d="M14 4v10"></path><path d="M18 4v10"></path><path d="M2 14h20"></path></svg>`,
  NADIMU: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="3.5" fill="currentColor"></circle><circle cx="18.5" cy="15.5" r="3.5" fill="currentColor"></circle><path d="M9 17.5V5l13-2v12.5"></path></svg>`,
  JINGLE_BELLS: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`,
  NEON_DAWN: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>`,
  CYBER_GROOVE: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>`,
  ENDLESS: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.356-8-5.096 0-5.096 8 0 8 5.223 0 7.26-8 12.356-8z"></path></svg>`,
};

export class TrackSelectScreen {
  static render() {
    const tracks = Object.values(COMPETITION_TRACKS);
    const isWallpaper = localStorage.getItem('gestureMusic_useWallpaper') === 'true';
    if (isWallpaper) {
      document.body.classList.add('with-custom-wallpaper');
    }

    return `
      <div class="subpage-screen track-select-screen">
        <div class="subpage-header">
          <div style="display:flex;align-items:center;gap:10px;">
            <button class="btn-icon-back" id="btn-back-home">‹</button>
            <div>
              <h2 class="subpage-title">PILIH LAGU KOMPETISI</h2>
              <span style="font-size:11px; color:var(--text-muted);">Pilih lagu favoritmu • Papan peringkat tetap 1 & setara untuk semua lagu!</span>
            </div>
          </div>
          <button class="btn-toggle-wallpaper-chip ${isWallpaper ? 'active' : ''}" id="btn-toggle-wallpaper-track" title="Ganti Mode Latar Belakang (Flash Tech Wallpaper / Cyber Theme)">
            <span>🖼️</span> <span id="track-wp-label">${isWallpaper ? 'Wallpaper: On ✦' : 'Wallpaper: Off'}</span>
          </button>
        </div>

        <div class="track-select-container">
          <!-- Fairness Notice Banner -->
          <div class="fairness-banner">
            <div class="fairness-badge">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 3v18"></path>
                <path d="m19 8 3 4H16l3-4z"></path>
                <path d="m5 8 3 4H2l3-4z"></path>
                <path d="M6 8h12"></path>
              </svg>
              <span>SISTEM SKOR SETARA (STANDAR 100.000 POIN)</span>
            </div>
            <p>
              Pilih lagu apa pun yang Anda kuasai! Semua lagu dinormalisasi ke <strong>skala standar 100.000 poin</strong>. 
              Siapa pun yang bermain paling akurat dengan combo tinggi akan memuncaki <strong>Papan Peringkat Utama</strong> untuk memperebutkan hadiah!
            </p>
          </div>

          <!-- Tracks Grid -->
          <div class="tracks-cards-grid">
            ${tracks.map(t => `
              <div class="track-card ${t.id.toLowerCase()}" data-track-id="${t.id}">
                <div class="track-card-top">
                  <div class="track-icon-badge ${t.id.toLowerCase()}">
                    ${TRACK_ICONS[t.id] || TRACK_ICONS.KOMANG}
                  </div>
                  <div class="track-main-info">
                    <div class="track-title-row">
                      <h3 class="track-title">${t.title}</h3>
                      <span class="track-diff-badge ${t.difficulty.toLowerCase()}">${t.difficulty}</span>
                    </div>
                    <span class="track-artist">${t.artist} • ${t.genre}</span>
                  </div>
                </div>

                <p class="track-desc">${t.desc}</p>

                <div class="track-meta-row">
                  <span class="tmeta-item">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    ${t.bpm} BPM
                  </span>
                  <span class="tmeta-item">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                    Max: 100k Pts
                  </span>
                  <span class="tmeta-item">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-2.34"></path><path d="M18 14.66V17c0 .55-.45 1-1 1h-2c-.55 0-1-.45-1-1v-2.34"></path><path d="M6 2v10a6 6 0 0 0 12 0V2H6z"></path></svg>
                    Hadiah Ready
                  </span>
                </div>

                <button class="btn-play-track" data-track-id="${t.id}">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                  <span>PILIH & MAINKAN LAGU INI</span>
                </button>
              </div>
            `).join('')}
          </div>

          <!-- Bottom Utility Row -->
          <div class="track-select-footer-row">
            <button class="track-footer-btn leaderboard-btn" id="btn-goto-leaderboard">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
                <path d="M4 22h16"></path>
                <path d="M10 14.66V17c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-2.34"></path>
                <path d="M18 14.66V17c0 .55-.45 1-1 1h-2c-.55 0-1-.45-1-1v-2.34"></path>
                <path d="M6 2v10a6 6 0 0 0 12 0V2H6z"></path>
              </svg>
              <span>LIHAT PAPAN PERINGKAT SAAT INI</span>
            </button>
            <button class="track-footer-btn home-btn" id="btn-goto-home">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
              <span>KEMBALI KE HOME</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  static bindEvents(app) {
    const playBtns = document.querySelectorAll('.btn-play-track, .track-card');
    playBtns.forEach(el => {
      el.onclick = (e) => {
        // Prevent double trigger if clicking button inside card
        const btn = e.target.closest('.btn-play-track') || el;
        const trackId = btn.dataset.trackId || el.dataset.trackId;
        if (!trackId) return;

        this.startTrack(trackId, app);
      };
    });

    const leadBtn = document.getElementById('btn-goto-leaderboard');
    if (leadBtn) {
      leadBtn.onclick = () => {
        gameEngine.setState(GAME_STATES.LEADERBOARD);
      };
    }

    const homeBtn = document.getElementById('btn-goto-home');
    if (homeBtn) {
      homeBtn.onclick = () => {
        gameEngine.setState(GAME_STATES.HOME);
      };
    }

    const wpBtn = document.getElementById('btn-toggle-wallpaper-track');
    if (wpBtn) {
      wpBtn.onclick = () => {
        const current = localStorage.getItem('gestureMusic_useWallpaper') === 'true';
        const next = !current;
        localStorage.setItem('gestureMusic_useWallpaper', next ? 'true' : 'false');
        document.body.classList.toggle('with-custom-wallpaper', next);
        wpBtn.classList.toggle('active', next);
        const lbl = document.getElementById('track-wp-label');
        if (lbl) lbl.textContent = next ? 'Wallpaper: On ✦' : 'Wallpaper: Off';
      };
    }
  }

  static startTrack(trackId, app) {
    if (trackId === 'KOMANG' || trackId === 'NADIMU') {
      settingsManager.update('soundPreset', 'Acoustic Piano');
      audioManager.setPreset('Acoustic Piano');
      audioManager.loadPianoSamples().catch(() => { });
    }
    switch (trackId) {
      case 'KOMANG':
        gameEngine.setState(GAME_STATES.KOMANG);
        break;
      case 'NADIMU':
        gameEngine.setState(GAME_STATES.NADIMU);
        break;
      case 'JINGLE_BELLS':
        gameEngine.setState(GAME_STATES.JINGLE_BELLS);
        break;
      case 'JATUH_SUKA':
        gameEngine.setState(GAME_STATES.JATUH_SUKA);
        break;
      case 'TARAGAK_PULANG':
        gameEngine.setState(GAME_STATES.TARAGAK_PULANG);
        break;
      case 'NEON_DAWN':
        gameEngine.startRound('CLASSIC', 1);
        break;
      case 'CYBER_GROOVE':
        gameEngine.startRound('CLASSIC', 4);
        break;
      case 'ENDLESS':
        gameEngine.startRound('ENDLESS', 1);
        break;
      default:
        gameEngine.startRound('CLASSIC', 1);
        break;
    }
  }
}
