// ClaimScoreScreen.js - Mobile-Optimized QR Code Score & Prize Registration Screen
// Opened when players scan the QR code on their smartphone camera.

import { competitionLeaderboardService, COMPETITION_TRACKS } from '../../services/CompetitionLeaderboardService.js';
import confetti from 'canvas-confetti';

export class ClaimScoreScreen {
  static parseParams() {
    let search = window.location.search;
    let hash = window.location.hash;

    // Support both ?query and #claim?query
    let queryString = '';
    if (hash.includes('?')) {
      queryString = hash.split('?')[1];
    } else if (search.startsWith('?')) {
      queryString = search.slice(1);
    }

    const params = new URLSearchParams(queryString);
    const sessionId = params.get('session') || '';
    const songId = params.get('song') || 'KOMANG';
    const score = parseInt(params.get('score') || '85000', 10);
    const accuracy = parseInt(params.get('acc') || '90', 10);
    const combo = parseInt(params.get('combo') || '20', 10);

    const track = COMPETITION_TRACKS[songId] || {
      title: '🌺 Komang - Raim Laode',
      emoji: '🌺',
      badge: '🌺 KOMANG',
      color: '#ff2d75',
    };

    return {
      sessionId,
      songId,
      track,
      score,
      accuracy,
      combo,
    };
  }

  static render() {
    const data = this.parseParams();

    return `
      <div class="claim-screen-wrapper">
        <div class="claim-card-container">
          <!-- Header Banner -->
          <div class="claim-header">
            <div class="claim-event-badge">✦ GESTURE SYNTH ARCADE ✦</div>
            <h1 class="claim-main-title">KLAIM SKOR & DAFTAR HADIAH</h1>
            <p class="claim-subtitle">Papan Peringkat Resmi Booth Event</p>
          </div>

          <!-- Score Showcase Card -->
          <div class="claim-score-summary">
            <div class="css-track-row">
              <span class="css-track-badge">${data.track.emoji} ${data.track.title}</span>
              <span class="css-session-id">ID: ${data.sessionId || 'BARU'}</span>
            </div>

            <div class="css-score-box">
              <span class="css-score-label">SKOR STANDAR KOMPETISI</span>
              <div class="css-score-number">${data.score.toLocaleString()} <span style="font-size:16px;color:var(--text-muted);">/ 100.000</span></div>
            </div>

            <div class="css-metrics-grid">
              <div class="css-metric-item">
                <span class="css-m-label">AKURASI</span>
                <span class="css-m-val cyan">${data.accuracy}%</span>
              </div>
              <div class="css-metric-item">
                <span class="css-m-label">MAX COMBO</span>
                <span class="css-m-val pink">x${data.combo}</span>
              </div>
              <div class="css-metric-item">
                <span class="css-m-label">STANDAR</span>
                <span class="css-m-val gold">SETARA ⭐</span>
              </div>
            </div>
          </div>

          <!-- Registration Form -->
          <div class="claim-form-box" id="claim-form-box">
            <div class="claim-prize-notice">
              <span style="font-size:18px;">🎁</span>
              <div>
                <strong>Pemenang Berhak Mendapatkan Hadiah Riil!</strong>
                <p>Nomor HP diperlukan agar panitia booth dapat menghubungi pemenang atau verifikasi hadiah secara langsung.</p>
              </div>
            </div>

            <form id="form-claim-score" onsubmit="return false;">
              <div class="claim-field-group">
                <label for="input-claim-name">Nama Lengkap / Panggilan <span style="color:var(--pink);">*</span></label>
                <input 
                  type="text" 
                  id="input-claim-name" 
                  class="claim-input" 
                  placeholder="Contoh: Budi Santoso" 
                  maxlength="30" 
                  required
                  autocomplete="name"
                />
              </div>

              <div class="claim-field-group">
                <label for="input-claim-phone">Nomor HP / WhatsApp <span style="color:var(--pink);">*</span></label>
                <input 
                  type="tel" 
                  id="input-claim-phone" 
                  class="claim-input" 
                  placeholder="Contoh: 081234567890" 
                  maxlength="15" 
                  required
                  autocomplete="tel"
                />
                <span class="field-hint">Format Indonesia (diawali 08... atau +628...)</span>
              </div>

              <div class="claim-field-group">
                <label for="input-claim-notes">Akun Instagram / Catatan (Opsional)</label>
                <input 
                  type="text" 
                  id="input-claim-notes" 
                  class="claim-input" 
                  placeholder="Contoh: @budisantoso" 
                  maxlength="40" 
                />
              </div>

              <div id="claim-error-msg" class="claim-error-msg" style="display:none;"></div>

              <button type="submit" id="btn-submit-claim" class="btn-submit-claim">
                <span>🚀</span> KIRIM KE PAPAN PERINGKAT
              </button>
            </form>
          </div>

          <!-- Success State Container (Hidden Initially) -->
          <div class="claim-success-box" id="claim-success-box" style="display:none;">
            <div class="success-icon">🎉</div>
            <h2 class="success-title">PENDAFTARAN BERHASIL!</h2>
            <p class="success-desc">Skor Anda telah resmi dicatat ke Papan Peringkat Utama.</p>

            <div class="success-rank-badge" id="success-rank-badge">
              PERINGKAT #1
            </div>

            <div class="success-info-card">
              <div class="sinfo-row">
                <span>Nama:</span>
                <strong id="success-name">--</strong>
              </div>
              <div class="sinfo-row">
                <span>Nomor HP:</span>
                <strong id="success-phone">--</strong>
              </div>
              <div class="sinfo-row">
                <span>Lagu:</span>
                <strong id="success-song">--</strong>
              </div>
              <div class="sinfo-row">
                <span>Skor Akhir:</span>
                <strong style="color:var(--cyan);font-family:var(--font-display);" id="success-score">--</strong>
              </div>
            </div>

            <div class="success-booth-tip">
              👉 Pantau layar TV/kiosk arcade atau tunjukkan bukti ini kepada panitia booth untuk verifikasi hadiah!
            </div>

            <button class="btn-view-leaderboard-mobile" id="btn-open-leaderboard">
              <span>🏆</span> LIHAT PAPAN PERINGKAT LENGKAP
            </button>
          </div>

          <!-- Footer -->
          <div class="claim-footer">
            <span>Gesture Synth • Interactive Music Booth System</span>
          </div>
        </div>
      </div>
    `;
  }

  static bindEvents(app) {
    const form = document.getElementById('form-claim-score');
    const submitBtn = document.getElementById('btn-submit-claim');
    const errorBox = document.getElementById('claim-error-msg');
    const formBox = document.getElementById('claim-form-box');
    const successBox = document.getElementById('claim-success-box');

    if (form && submitBtn) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('input-claim-name');
        const phoneInput = document.getElementById('input-claim-phone');
        const notesInput = document.getElementById('input-claim-notes');

        const playerName = nameInput ? nameInput.value.trim() : '';
        const phone = phoneInput ? phoneInput.value.trim() : '';
        const notes = notesInput ? notesInput.value.trim() : '';

        if (!playerName) {
          this.showError('Mohon isi nama lengkap Anda.');
          return;
        }

        const phoneCheck = competitionLeaderboardService.validatePhoneNumber(phone);
        if (!phoneCheck.valid) {
          this.showError(phoneCheck.message);
          return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '⌛ MENGIRIM...';
        if (errorBox) errorBox.style.display = 'none';

        const params = this.parseParams();
        const res = await competitionLeaderboardService.submitLeaderboardClaim({
          sessionId: params.sessionId,
          playerName,
          phone,
          notes,
          sessionData: {
            id: params.sessionId,
            songId: params.songId,
            songTitle: params.track.title,
            songBadge: params.track.badge,
            songEmoji: params.track.emoji,
            score: params.score,
            accuracy: params.accuracy,
            combo: params.combo,
            stars: 3,
            timestamp: Date.now(),
          },
        });

        if (!res.success) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<span>🚀</span> KIRIM KE PAPAN PERINGKAT';
          this.showError(res.message);
          return;
        }

        // Trigger confetti celebration on phone screen
        try {
          confetti({
            particleCount: 150,
            spread: 90,
            origin: { y: 0.6 }
          });
        } catch (err) {}

        // Switch to success state
        if (formBox) formBox.style.display = 'none';
        if (successBox) {
          successBox.style.display = 'block';
          const rankEl = document.getElementById('success-rank-badge');
          if (rankEl) rankEl.innerText = `🏆 PERINGKAT SEMENTARA #${res.rank}`;

          const nameEl = document.getElementById('success-name');
          if (nameEl) nameEl.innerText = res.entry.playerName;

          const phoneEl = document.getElementById('success-phone');
          if (phoneEl) phoneEl.innerText = competitionLeaderboardService.maskPhoneNumber(res.entry.phone);

          const songEl = document.getElementById('success-song');
          if (songEl) songEl.innerText = res.entry.songTitle;

          const scoreEl = document.getElementById('success-score');
          if (scoreEl) scoreEl.innerText = `${res.entry.score.toLocaleString()} PTS`;
        }
      };
    }

    const openLeaderboardBtn = document.getElementById('btn-open-leaderboard');
    if (openLeaderboardBtn) {
      openLeaderboardBtn.onclick = () => {
        window.location.hash = '#leaderboard';
        if (app && app.render) {
          app.render();
        } else {
          window.location.reload();
        }
      };
    }
  }

  static showError(msg) {
    const errorBox = document.getElementById('claim-error-msg');
    if (errorBox) {
      errorBox.innerText = msg;
      errorBox.style.display = 'block';
    }
  }
}
