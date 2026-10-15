// TrackSelectScreen.js - Song/Track Selection for Competition Leaderboard
// Allows players to choose which song they want to play while competing fairly on 1 unified leaderboard.

import { COMPETITION_TRACKS } from '../../services/CompetitionLeaderboardService.js';
import { gameEngine, GAME_STATES } from '../../game/GameEngine.js';
import { settingsManager } from '../../services/SettingsManager.js';
import { audioManager } from '../../audio/AudioManager.js';

export class TrackSelectScreen {
  static render() {
    const tracks = Object.values(COMPETITION_TRACKS);

    return `
      <div class="subpage-screen track-select-screen">
        <div class="subpage-header">
          <button class="btn-icon-back" id="btn-back-home">‹</button>
          <div>
            <h2 class="subpage-title">PILIH LAGU KOMPETISI</h2>
            <span style="font-size:11px; color:var(--text-muted);">Pilih lagu favoritmu • Papan peringkat tetap 1 & setara untuk semua lagu!</span>
          </div>
        </div>

        <div class="track-select-container">
          <!-- Fairness Notice Banner -->
          <div class="fairness-banner">
            <div class="fairness-badge">⚖️ SISTEM SKOR SETARA (STANDAR 100.000 POIN)</div>
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
                  <span class="track-emoji">${t.emoji}</span>
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
                  <span class="tmeta-item">⏱️ ${t.bpm} BPM</span>
                  <span class="tmeta-item">⭐ Max: 100k Pts</span>
                  <span class="tmeta-item">🏆 Hadiah Ready</span>
                </div>

                <button class="btn-play-track" data-track-id="${t.id}">
                  <span>▶</span> PILIH & MAINKAN LAGU INI
                </button>
              </div>
            `).join('')}
          </div>

          <!-- Bottom Utility Row -->
          <div class="track-select-footer-row">
            <button class="btn-secondary" id="btn-goto-leaderboard">
              <span>🏆</span> LIHAT PAPAN PERINGKAT SAAT INI
            </button>
            <button class="btn-secondary" id="btn-goto-home">
              <span>🏠</span> KEMBALI KE HOME
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
  }

  static startTrack(trackId, app) {
    if (trackId === 'KOMANG' || trackId === 'NADIMU') {
      settingsManager.update('soundPreset', 'Acoustic Piano');
      audioManager.setPreset('Acoustic Piano');
      audioManager.loadPianoSamples().catch(() => {});
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
