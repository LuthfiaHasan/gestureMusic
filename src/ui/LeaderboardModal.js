// LeaderboardModal.js - UI Modal for Player Registration & Cyberpunk Leaderboard Display

import { leaderboardService } from '../services/LeaderboardService.js';

export class LeaderboardUI {
  constructor() {
    this.activeFilter = 'all';
    this.highlightEntryId = null;
    this.onPlayerSavedCallback = null;
    this.onPlayerCancelledCallback = null;

    this.ensureModalsInDOM();
  }

  ensureModalsInDOM() {
    if (document.getElementById('gm-modals-root')) return;

    const root = document.createElement('div');
    root.id = 'gm-modals-root';
    root.innerHTML = `
      <!-- 1. MODAL REGISTRASI PEMAIN (WAJIB NAMA & NO TELPON) -->
      <div class="player-modal-backdrop" id="player-modal" style="display: none;" role="dialog" aria-modal="true" aria-labelledby="pm-title">
        <div class="player-modal-card">
          <div class="pm-header">
            <div class="pm-badge-alert">WAJIB SEBELUM MAIN</div>
            <div class="pm-avatar-circle">
              <span class="pm-avatar-emoji">👤</span>
            </div>
            <h2 class="pm-title" id="pm-title">DATA PEMAIN</h2>
            <p class="pm-subtitle">Silakan masukkan Nama dan Nomor Telepon Anda sebelum memulai lagu agar perolehan skormu tercatat di Papan Peringkat (Leaderboard)!</p>
          </div>

          <form id="player-form" class="pm-form" novalidate>
            <div class="pm-field-group">
              <label for="player-name-input" class="pm-label">
                <span>NAMA LENGKAP / PANGGILAN</span>
                <span class="req-star">*</span>
              </label>
              <div class="pm-input-wrapper">
                <span class="pm-input-icon">👤</span>
                <input 
                  type="text" 
                  id="player-name-input" 
                  class="pm-input" 
                  placeholder="Contoh: Rian Soundmaster" 
                  maxlength="32" 
                  autocomplete="name" 
                  required 
                />
              </div>
            </div>

            <div class="pm-field-group">
              <label for="player-phone-input" class="pm-label">
                <span>NOMOR TELEPON / WHATSAPP</span>
                <span class="req-star">*</span>
              </label>
              <div class="pm-input-wrapper">
                <span class="pm-input-icon">📱</span>
                <input 
                  type="tel" 
                  id="player-phone-input" 
                  class="pm-input" 
                  placeholder="Contoh: 081234567890 (min. 8 digit)" 
                  maxlength="16" 
                  autocomplete="tel" 
                  required 
                />
              </div>
            </div>

            <div class="pm-error-box" id="player-error-box" style="display: none;"></div>

            <div class="pm-btn-group">
              <button type="submit" class="btn-pm-start" id="btn-player-submit">
                <span>🚀 SIMPAN & LANJUT MAIN</span>
              </button>
              <button type="button" class="btn-pm-cancel" id="btn-player-cancel" style="display: none;">
                Batal
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- 2. MODAL PAPAN PERINGKAT (LEADERBOARD) -->
      <div class="leaderboard-modal-backdrop" id="leaderboard-modal" style="display: none;" role="dialog" aria-modal="true" aria-labelledby="lbm-title">
        <div class="leaderboard-modal-card">
          <header class="lbm-header">
            <div class="lbm-title-group">
              <div class="lbm-trophy-box">🏆</div>
              <div>
                <div class="lbm-badge">TOP SKOR EVENT</div>
                <h2 class="lbm-title" id="lbm-title">PAPAN PERINGKAT</h2>
                <p class="lbm-subtitle">Siapakah pemain dengan sinkronisasi gestur musik terbaik?</p>
              </div>
            </div>
            <button class="btn-close-lbm" id="btn-close-leaderboard" aria-label="Tutup Papan Peringkat">✕</button>
          </header>

          <!-- TABS FILTER -->
          <div class="lbm-tabs-bar">
            <button class="lbm-tab active" data-filter="all">🌟 Semua Lagu</button>
            <button class="lbm-tab" data-filter="jatuhsuka">🎸 Jatuh Suka</button>
            <button class="lbm-tab" data-filter="taragak">🏔️ Taragak Pulang</button>
          </div>

          <!-- LIST TABLE -->
          <div class="lbm-table-wrapper">
            <div class="lbm-table-head">
              <span class="col-rank">RANK</span>
              <span class="col-player">PEMAIN & KONTAK</span>
              <span class="col-song">LAGU</span>
              <span class="col-stars">RATING</span>
              <span class="col-score">SKOR</span>
            </div>
            <div class="lbm-rows-container" id="lbm-rows-container">
              <!-- Dynamically populated rows -->
            </div>
          </div>

          <!-- FOOTER -->
          <footer class="lbm-footer">
            <div class="lbm-active-player-bar" id="lbm-active-player-bar">
              <!-- Info pemain aktif saat ini -->
            </div>
            <div class="lbm-footer-btns">
              <button class="btn-lbm-reset" id="btn-lbm-reset-all" title="Reset data skor jika booth selesai">
                🔄 Reset Data Papan
              </button>
              <button class="btn-lbm-close-primary" id="btn-lbm-close-primary">
                Tutup Papan
              </button>
            </div>
          </footer>
        </div>
      </div>
    `;

    document.body.appendChild(root);
    this.bindDOMEvents();
  }

  bindDOMEvents() {
    // Form player submit
    const form = document.getElementById('player-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handlePlayerSubmit();
      });
    }

    // Cancel player modal
    const cancelBtn = document.getElementById('btn-player-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.closePlayerModal();
        if (typeof this.onPlayerCancelledCallback === 'function') {
          this.onPlayerCancelledCallback();
        }
      });
    }

    // Close leaderboard buttons
    document.getElementById('btn-close-leaderboard')?.addEventListener('click', () => {
      this.closeLeaderboard();
    });
    document.getElementById('btn-lbm-close-primary')?.addEventListener('click', () => {
      this.closeLeaderboard();
    });

    // Backdrop click to close leaderboard
    document.getElementById('leaderboard-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'leaderboard-modal') {
        this.closeLeaderboard();
      }
    });

    // Tabs filter
    const tabs = document.querySelectorAll('.lbm-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeFilter = tab.getAttribute('data-filter') || 'all';
        this.renderLeaderboardRows();
      });
    });

    // Reset leaderboard button
    document.getElementById('btn-lbm-reset-all')?.addEventListener('click', () => {
      const confirmReset = window.confirm('Apakah Anda yakin ingin mereset data Leaderboard ke posisi awal?');
      if (confirmReset) {
        leaderboardService.clearLeaderboard();
        this.renderLeaderboardRows();
      }
    });
  }

  /**
   * Buka modal pendaftaran pemain jika belum terdaftar, atau untuk ganti pemain
   */
  openPlayerModal({ onSave, onCancel, allowCancel = false, title = 'DATA PEMAIN' } = {}) {
    this.ensureModalsInDOM();
    this.onPlayerSavedCallback = onSave;
    this.onPlayerCancelledCallback = onCancel;

    const modal = document.getElementById('player-modal');
    const nameInput = document.getElementById('player-name-input');
    const phoneInput = document.getElementById('player-phone-input');
    const errorBox = document.getElementById('player-error-box');
    const cancelBtn = document.getElementById('btn-player-cancel');
    const titleEl = document.getElementById('pm-title');

    if (!modal) return;

    if (titleEl) titleEl.innerText = title;
    if (errorBox) {
      errorBox.style.display = 'none';
      errorBox.innerText = '';
    }

    const cur = leaderboardService.getCurrentPlayer();
    if (cur) {
      if (nameInput) nameInput.value = cur.name || '';
      if (phoneInput) phoneInput.value = cur.phone || '';
    } else {
      if (nameInput) nameInput.value = '';
      if (phoneInput) phoneInput.value = '';
    }

    if (cancelBtn) {
      cancelBtn.style.display = allowCancel ? 'inline-block' : 'none';
    }

    modal.style.display = 'flex';
    setTimeout(() => {
      if (nameInput) nameInput.focus();
    }, 100);
  }

  closePlayerModal() {
    const modal = document.getElementById('player-modal');
    if (modal) modal.style.display = 'none';
  }

  handlePlayerSubmit() {
    const nameInput = document.getElementById('player-name-input');
    const phoneInput = document.getElementById('player-phone-input');
    const errorBox = document.getElementById('player-error-box');

    const name = (nameInput?.value || '').trim();
    const phone = (phoneInput?.value || '').trim();

    if (!name || name.length < 2) {
      if (errorBox) {
        errorBox.style.display = 'block';
        errorBox.innerText = '⚠️ Silakan masukkan Nama Lengkap / Panggilan minimal 2 karakter.';
      }
      if (nameInput) nameInput.focus();
      return;
    }

    const digitsOnly = phone.replace(/[^0-9]/g, '');
    if (!digitsOnly || digitsOnly.length < 8) {
      if (errorBox) {
        errorBox.style.display = 'block';
        errorBox.innerText = '⚠️ Silakan masukkan Nomor Telepon valid minimal 8 digit angka.';
      }
      if (phoneInput) phoneInput.focus();
      return;
    }

    try {
      const savedPlayer = leaderboardService.setPlayer(name, phone);
      this.closePlayerModal();
      if (typeof this.onPlayerSavedCallback === 'function') {
        this.onPlayerSavedCallback(savedPlayer);
      }
    } catch (err) {
      if (errorBox) {
        errorBox.style.display = 'block';
        errorBox.innerText = `⚠️ ${err.message || 'Gagal menyimpan data pemain.'}`;
      }
    }
  }

  /**
   * Buka Leaderboard Modal
   * @param {string|null} highlightEntryId - ID skor yang baru selesai untuk di-highlight
   * @param {'all'|'jatuhsuka'|'taragak'} initialFilter
   */
  openLeaderboard(highlightEntryId = null, initialFilter = 'all') {
    this.ensureModalsInDOM();
    this.highlightEntryId = highlightEntryId;
    this.activeFilter = initialFilter;

    // Sinkronkan tab active
    const tabs = document.querySelectorAll('.lbm-tab');
    tabs.forEach(t => {
      if (t.getAttribute('data-filter') === initialFilter) t.classList.add('active');
      else t.classList.remove('active');
    });

    this.renderLeaderboardRows();
    this.updateActivePlayerFooter();

    const modal = document.getElementById('leaderboard-modal');
    if (modal) modal.style.display = 'flex';
  }

  closeLeaderboard() {
    const modal = document.getElementById('leaderboard-modal');
    if (modal) modal.style.display = 'none';
  }

  updateActivePlayerFooter() {
    const container = document.getElementById('lbm-active-player-bar');
    if (!container) return;

    const cur = leaderboardService.getCurrentPlayer();
    if (cur) {
      container.innerHTML = `
        <div class="lbm-cur-player-box">
          <span class="lbm-cur-icon">👤</span>
          <div class="lbm-cur-details">
            <span class="lbm-cur-lbl">Pemain Aktif:</span>
            <span class="lbm-cur-name">${this.escapeHtml(cur.name)}</span>
            <span class="lbm-cur-phone">(${leaderboardService.formatPhone(cur.phone, true)})</span>
          </div>
          <button class="btn-lbm-switch-player" id="btn-lbm-switch-player">Ganti Pemain</button>
        </div>
      `;
      document.getElementById('btn-lbm-switch-player')?.addEventListener('click', () => {
        this.closeLeaderboard();
        this.openPlayerModal({
          allowCancel: true,
          title: 'GANTI IDENTITAS PEMAIN',
          onSave: () => {
            this.openLeaderboard(this.highlightEntryId, this.activeFilter);
          }
        });
      });
    } else {
      container.innerHTML = `
        <div class="lbm-cur-player-box empty">
          <span>⚠️ Belum ada pemain aktif terdaftar.</span>
          <button class="btn-lbm-switch-player" id="btn-lbm-register-player">Daftar Sekarang</button>
        </div>
      `;
      document.getElementById('btn-lbm-register-player')?.addEventListener('click', () => {
        this.closeLeaderboard();
        this.openPlayerModal({
          allowCancel: true,
          title: 'DATA PEMAIN BARU',
          onSave: () => {
            this.openLeaderboard(this.highlightEntryId, this.activeFilter);
          }
        });
      });
    }
  }

  renderLeaderboardRows() {
    const container = document.getElementById('lbm-rows-container');
    if (!container) return;

    const records = leaderboardService.getLeaderboard(this.activeFilter);
    const curPlayer = leaderboardService.getCurrentPlayer();

    if (!records || records.length === 0) {
      container.innerHTML = `
        <div class="lbm-empty-state">
          <div class="lbm-empty-icon">🎵</div>
          <h3>Belum Ada Catatan Skor</h3>
          <p>Mainkan lagu ini dan jadilah yang pertama memuncaki Papan Peringkat!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = records.map((item) => {
      const isHighlighted = this.highlightEntryId && item.id === this.highlightEntryId;
      const isCurUser = curPlayer && curPlayer.phone === item.phone;
      const rankNum = item.rank;

      let rankBadgeHtml = `<span class="rank-number">#${rankNum}</span>`;
      let rankRowClass = '';

      if (rankNum === 1) {
        rankBadgeHtml = `<span class="rank-trophy gold">🥇 #1</span>`;
        rankRowClass = 'rank-first';
      } else if (rankNum === 2) {
        rankBadgeHtml = `<span class="rank-trophy silver">🥈 #2</span>`;
        rankRowClass = 'rank-second';
      } else if (rankNum === 3) {
        rankBadgeHtml = `<span class="rank-trophy bronze">🥉 #3</span>`;
        rankRowClass = 'rank-third';
      }

      const songBadgeClass = item.songId === 'taragak' ? 'badge-song-taragak' : 'badge-song-jatuhsuka';
      const songTitleShort = item.songId === 'taragak' ? 'Taragak Pulang' : 'Jatuh Suka';
      const maskedPhone = leaderboardService.formatPhone(item.phone, true);

      return `
        <div class="lbm-row ${rankRowClass} ${isHighlighted ? 'row-highlight-new' : ''} ${isCurUser ? 'row-user' : ''}">
          <div class="col-rank">
            ${rankBadgeHtml}
          </div>
          <div class="col-player">
            <div class="player-cell-main">
              <span class="player-cell-name">${this.escapeHtml(item.name)}</span>
              ${isCurUser ? '<span class="chip-you-tag">ANDA</span>' : ''}
              ${isHighlighted ? '<span class="chip-new-record">BARU!</span>' : ''}
            </div>
            <div class="player-cell-sub">
              <span class="player-cell-phone">📱 ${maskedPhone}</span>
              <span class="player-cell-dot">•</span>
              <span class="player-cell-date">${item.date || '-'}</span>
            </div>
          </div>
          <div class="col-song">
            <span class="lbm-song-chip ${songBadgeClass}">${songTitleShort}</span>
          </div>
          <div class="col-stars">
            <div class="stars-icons">${item.starIcons || '⭐⭐⭐⭐⭐'}</div>
            <div class="stars-sub">${item.starTitle || 'PERFECT'} (❤️ ${item.lives || 5})</div>
          </div>
          <div class="col-score">
            <span class="lbm-score-pts">${Number(item.score).toLocaleString()}</span>
            <span class="lbm-score-unit">PTS</span>
          </div>
        </div>
      `;
    }).join('');

    // Auto scroll to newly highlighted row if exists
    if (this.highlightEntryId) {
      setTimeout(() => {
        const highlightedEl = container.querySelector('.row-highlight-new');
        if (highlightedEl) {
          highlightedEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 150);
    }
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
}

export const leaderboardUI = new LeaderboardUI();
