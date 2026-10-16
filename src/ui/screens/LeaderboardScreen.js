// LeaderboardScreen.js - Single Unified Fair Leaderboard, QR Code Scan, and Panitia Booth System
// Displays all players ranked on a single fair 100,000 pts competition scale across all songs.
// Features scannable QR Code registration, on-screen manual entry, WhatsApp winner notification, and Panitia Booth tools.

import { competitionLeaderboardService, COMPETITION_TRACKS } from '../../services/CompetitionLeaderboardService.js';
import { qrCodeService } from '../../services/QrCodeService.js';
import { gameEngine, GAME_STATES } from '../../game/GameEngine.js';

export class LeaderboardScreen {
  static currentFilter = 'ALL';
  static isPanitiaMode = false;
  static showQrModal = false;
  static showManualInputModal = false;

  static render() {
    const filter = this.currentFilter;
    const scores = competitionLeaderboardService.getLeaderboard(filter);
    const isPanitia = this.isPanitiaMode;
    const kioskHost = competitionLeaderboardService.getKioskHost();

    return `
      <div class="subpage-screen leaderboard-screen">
        <div class="subpage-header">
          <button class="btn-icon-back" id="btn-back-home">‹</button>
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:8px;">
              <h2 class="subpage-title">PAPAN PERINGKAT RESMI</h2>
              <span class="unified-lead-badge">🏆 1 PAPAN PERINGKAT TERPADU</span>
            </div>
            <span style="font-size:11px;color:var(--text-muted);">
              Sistem Skor Setara (Max 100.000 Poin) • Pemenang Berhak Mendapatkan Hadiah Riil!
            </span>
          </div>

          <!-- Panitia Mode Toggle & Actions -->
          <div style="display:flex;align-items:center;gap:6px;">
            <button class="btn-panitia-toggle ${isPanitia ? 'active' : ''}" id="btn-toggle-panitia">
              ${isPanitia ? '👑 Mode Panitia: AKTIF' : '👤 Mode Publik'}
            </button>
          </div>
        </div>

        <div class="leaderboard-container">
          <!-- Top Prize & Scan Banner -->
          <div class="leaderboard-prize-banner">
            <div class="prize-banner-left">
              <span class="prize-trophy-icon">🏆</span>
              <div>
                <h3 class="prize-banner-title">KOMPETISI BERHADIAH EVENT</h3>
                <p class="prize-banner-desc">
                  Mainkan lagu apa pun (Komang, Jingle Bells, Pop Tracks)! Skor dinilai secara adil dengan standar 100k poin. 
                  Peserta dengan skor tertinggi di papan peringkat berhak membawa pulang hadiah!
                </p>
              </div>
            </div>

            <div class="prize-banner-actions">
              <button class="btn-prize-qr" id="btn-open-qr-modal">
                <span>📱</span> SCAN QR INPUT NAMA & HP
              </button>
              <button class="btn-prize-input" id="btn-open-manual-input">
                <span>✏️</span> INPUT DI LAYAR INI
              </button>
            </div>
          </div>

          <!-- Panitia Booth Operator Bar (Visible when Panitia Mode is Active) -->
          ${isPanitia ? `
            <div class="panitia-operator-bar">
              <div class="panitia-bar-left">
                <span style="font-size:16px;">👑</span>
                <strong>PANEL PANITIA BOOTH:</strong>
                <span style="font-size:11px;color:var(--text-muted);">Nomor HP lengkap ditampilkan • Klik tombol WA untuk hubungi pemenang!</span>
              </div>
              <div class="panitia-bar-actions">
                <button class="btn-panitia-action" id="btn-export-csv">
                  <span>📥</span> Unduh Data CSV
                </button>
                <button class="btn-panitia-action" id="btn-config-host">
                  <span>⚙️</span> Atur Host/IP Kiosk
                </button>
                <button class="btn-panitia-action danger" id="btn-reset-leaderboard">
                  <span>🗑️</span> Reset Papan Skor
                </button>
              </div>
            </div>
          ` : ''}

          <!-- Filter Tabs (Papan Utama vs Filter Lagu) -->
          <div class="leaderboard-tabs-bar">
            <div class="lead-tabs-group">
              <button class="lead-tab-btn ${filter === 'ALL' ? 'active' : ''}" data-filter="ALL">
                🌟 SEMUA LAGU (Peringkat Utama)
              </button>
              <button class="lead-tab-btn ${filter === 'KOMANG' ? 'active' : ''}" data-filter="KOMANG">
                🌺 KOMANG
              </button>
              <button class="lead-tab-btn ${filter === 'NADIMU' ? 'active' : ''}" data-filter="NADIMU">
                🎵 NADIMU
              </button>
              <button class="lead-tab-btn ${filter === 'JINGLE_BELLS' ? 'active' : ''}" data-filter="JINGLE_BELLS">
                🔔 JINGLE BELLS
              </button>
              <button class="lead-tab-btn ${filter === 'NEON_DAWN' ? 'active' : ''}" data-filter="NEON_DAWN">
                ⭐ NEON DAWN
              </button>
              <button class="lead-tab-btn ${filter === 'CYBER_GROOVE' ? 'active' : ''}" data-filter="CYBER_GROOVE">
                ⚡ CYBER GROOVE
              </button>
            </div>

            <div class="lead-meta-right">
              <span class="total-players-pill">${scores.length} Peserta Terdaftar</span>
            </div>
          </div>

          <!-- Unified Leaderboard Table Card -->
          <div class="leaderboard-card">
            <div class="table-container">
              ${scores.length === 0 ? `
                <div class="empty-scores-state">
                  <span>🎵</span>
                  <p>Belum ada peserta yang mendaftarkan skor untuk kategori ini.</p>
                  <small>Jadilah yang pertama mencatatkan namamu di papan peringkat!</small>
                  <button class="btn-play-now-lead" id="btn-play-from-lead">
                    <span>▶</span> PILIH LAGU & MAIN SEKARANG
                  </button>
                </div>
              ` : `
                <table class="scores-table unified-table">
                  <thead>
                    <tr>
                      <th style="width:48px;text-align:center;">#</th>
                      <th>Nama Peserta</th>
                      <th>Lagu yang Dimainkan</th>
                      <th style="text-align:center;">Nomor HP / WhatsApp</th>
                      <th style="text-align:right;">Skor Kompetisi</th>
                      <th style="text-align:right;">Akurasi / Combo</th>
                      <th style="text-align:center;">Status Hadiah</th>
                      ${isPanitia ? '<th style="text-align:center;width:120px;">Aksi Panitia</th>' : ''}
                    </tr>
                  </thead>
                  <tbody>
                    ${scores.map((s, idx) => {
                      const rank = idx + 1;
                      const rankMedal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}`;
                      const isTop3 = rank <= 3;
                      const displayPhone = isPanitia 
                        ? (s.phone || '--') 
                        : competitionLeaderboardService.maskPhoneNumber(s.phone);
                      const waLink = competitionLeaderboardService.getWhatsAppWinnerLink(s, rank);

                      return `
                        <tr class="${isTop3 ? 'top-rank rank-' + rank : ''}">
                          <td class="col-rank" style="text-align:center;font-size:${isTop3 ? '18px' : '13px'};">
                            ${rankMedal}
                          </td>
                          <td class="col-player">
                            <div class="player-name-wrapper">
                              <span class="p-name">${s.playerName || 'Peserta'}</span>
                              ${s.notes ? `<span class="p-notes">${s.notes}</span>` : ''}
                              <span class="p-time">${s.dateFormatted || ''}</span>
                            </div>
                          </td>
                          <td class="col-track">
                            <span class="song-badge-pill ${s.songId?.toLowerCase() || ''}">
                              ${s.songBadge || s.songTitle || '🎵 Lagu Pop'}
                            </span>
                          </td>
                          <td class="col-phone" style="text-align:center;">
                            <span class="phone-number-pill ${isPanitia ? 'unmasked' : ''}">
                              ${displayPhone}
                            </span>
                          </td>
                          <td class="col-score" style="text-align:right;">
                            <div class="score-number-cell">
                              <span class="score-main">${(s.score || 0).toLocaleString()}</span>
                              <span class="score-sub">/ 100k</span>
                            </div>
                          </td>
                          <td class="col-metrics" style="text-align:right;">
                            <div class="metrics-cell">
                              <span class="acc-val">${s.accuracy || 0}% Akurasi</span>
                              <span class="combo-val">x${s.combo || 0} Combo</span>
                            </div>
                          </td>
                          <td class="col-prize" style="text-align:center;">
                            ${s.prizeClaimed ? `
                              <span class="prize-pill claimed">✔ Hadiah Diambil</span>
                            ` : `
                              <span class="prize-pill ready">🎁 Berhak Hadiah</span>
                            `}
                          </td>
                          ${isPanitia ? `
                            <td class="col-panitia-actions" style="text-align:center;">
                              <div class="panitia-action-btns">
                                <a href="${waLink}" target="_blank" class="btn-wa-action" title="Hubungi Pemenang via WhatsApp">
                                  <span>📲</span> WA
                                </a>
                                <button class="btn-claim-toggle ${s.prizeClaimed ? 'claimed' : ''}" data-entry-id="${s.id}" title="Tandai Hadiah">
                                  ${s.prizeClaimed ? 'Batal' : 'Klaim'}
                                </button>
                              </div>
                            </td>
                          ` : ''}
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              `}
            </div>
          </div>

          <!-- Bottom Action Buttons -->
          <div class="leaderboard-bottom-row">
            <button class="lead-footer-btn challenge-btn" id="btn-lead-play-again">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polygon points="10 8 16 12 10 16 10 8" fill="currentColor"></polygon>
              </svg>
              <span>PILIH LAGU & TANTANG SKOR INI</span>
            </button>

            <div style="display:flex; gap:12px; align-items:center;">
              <button class="lead-footer-btn refresh-btn" id="btn-lead-refresh">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 2v6h-6"></path>
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                  <path d="M3 22v-6h6"></path>
                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
                </svg>
                <span>SEGARKAN DATA</span>
              </button>

              <button class="lead-footer-btn home-btn" id="btn-lead-goto-home">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                <span>KEMBALI KE HOME</span>
              </button>
            </div>
          </div>
        </div>

        <!-- MODAL 1: SCAN QR CODE MODAL -->
        <div class="lead-modal-backdrop" id="qr-scan-modal" style="display:none;">
          <div class="lead-modal-dialog">
            <button class="modal-close-btn" id="btn-close-qr-modal">×</button>
            <div class="modal-qr-header">
              <span style="font-size:28px;">📱</span>
              <h3>SCAN QR CODE UNTUK DAFTAR</h3>
              <p>Buka kamera HP Anda, scan QR di bawah ini untuk memasukkan Nama dan Nomor HP ke Papan Peringkat!</p>
            </div>

            <div class="modal-qr-canvas-wrapper">
              <canvas id="leaderboard-qr-canvas"></canvas>
            </div>

            <div style="background:rgba(0,247,255,0.12);border:1px solid rgba(0,247,255,0.4);border-radius:8px;padding:8px 12px;margin:8px 0;text-align:left;font-size:11.5px;color:#00f7ff;line-height:1.45;">
              <strong>🔒 KONEKSI ONLINE RESMI (CLOUDFLARE SSL):</strong><br/>
              Bisa di-scan dari HP mana saja dengan <strong>Paket Data 4G/5G apa pun maupun Wi-Fi mana saja</strong>! Koneksi 100% aman (gembok hijau resmi, bebas peringatan browser).
            </div>

            <div class="modal-qr-url-box">
              <span class="qr-url-label">🔗 Link Pendaftaran Resmi (Online HTTPS):</span>
              <a href="#" target="_blank" class="qr-url-link" id="qr-direct-link">Memuat link...</a>
            </div>

            <div style="display:flex;gap:6px;margin:8px 0;">
              <input type="text" id="quick-ip-input" class="claim-input" style="padding:6px 8px;font-size:11px;" value="${kioskHost}" placeholder="https://...">
              <button class="btn-secondary" id="btn-quick-save-ip" style="white-space:nowrap;padding:6px 12px;font-size:11px;">Ganti Host</button>
            </div>

            <div class="modal-qr-footer-actions" style="display:flex;gap:8px;margin-top:10px;">
              <button class="btn-secondary" id="btn-qr-test-tab" style="flex:1;font-size:11px;">
                <span>🔗</span> Buka Tab Baru (Tes)
              </button>
              <button class="btn-primary" id="btn-qr-switch-manual" style="flex:1;font-size:11px;">
                <span>✏️</span> Input di Layar Ini
              </button>
            </div>
          </div>
        </div>

        <!-- MODAL 2: MANUAL ON-SCREEN ENTRY MODAL -->
        <div class="lead-modal-backdrop" id="manual-input-modal" style="display:none;">
          <div class="lead-modal-dialog">
            <button class="modal-close-btn" id="btn-close-manual-modal">×</button>
            <div class="modal-qr-header">
              <span style="font-size:28px;">✏️</span>
              <h3>INPUT NAMA & NOMOR HP</h3>
              <p>Masukkan data pemain langsung di layar ini untuk mencatat skor ke Papan Peringkat!</p>
            </div>

            <form id="form-kiosk-direct-entry" onsubmit="return false;" style="margin-top:16px;">
              <div class="claim-field-group">
                <label for="kiosk-input-name">Nama Lengkap Peserta <span style="color:var(--pink);">*</span></label>
                <input type="text" id="kiosk-input-name" class="claim-input" placeholder="Contoh: Budi Santoso" maxlength="30" required>
              </div>

              <div class="claim-field-group">
                <label for="kiosk-input-phone">Nomor HP / WhatsApp <span style="color:var(--pink);">*</span></label>
                <input type="tel" id="kiosk-input-phone" class="claim-input" placeholder="Contoh: 081234567890" maxlength="15" required>
                <span class="field-hint">Digunakan panitia booth untuk konfirmasi hadiah (Format: 08...)</span>
              </div>

              <div class="claim-field-group">
                <label for="kiosk-select-track">Lagu yang Dimainkan</label>
                <select id="kiosk-select-track" class="claim-input" style="background:#120826;color:#fff;">
                  <option value="KOMANG">🌺 Komang - Raim Laode</option>
                  <option value="NADIMU">🎵 Selalu Ada di Nadimu - OST Jumbo</option>
                  <option value="JINGLE_BELLS">🔔 Jingle Bells Piano</option>
                  <option value="NEON_DAWN">⭐ Neon Dawn (Pop Ballad)</option>
                  <option value="CYBER_GROOVE">⚡ Cyber Groove</option>
                  <option value="ENDLESS">♾️ Endless Groove</option>
                </select>
              </div>

              <div class="claim-field-group">
                <label for="kiosk-input-score">Skor Standar (0 - 100.000)</label>
                <input type="number" id="kiosk-input-score" class="claim-input" value="92000" min="0" max="100000" required>
              </div>

              <div id="kiosk-error-box" class="claim-error-msg" style="display:none;"></div>

              <button type="submit" id="btn-submit-kiosk-entry" class="btn-submit-claim" style="margin-top:12px;">
                <span>🚀</span> SIMPAN KE PAPAN PERINGKAT
              </button>
            </form>
          </div>
        </div>

        <!-- MODAL 3: KIOSK HOST SETTINGS MODAL -->
        <div class="lead-modal-backdrop" id="kiosk-host-modal" style="display:none;">
          <div class="lead-modal-dialog">
            <button class="modal-close-btn" id="btn-close-host-modal">×</button>
            <div class="modal-qr-header">
              <span style="font-size:28px;">⚙️</span>
              <h3>ATUR HOST / IP KIOSK BOOTH</h3>
              <p>Agar QR Code bisa discan dari HP yang tersambung Wi-Fi booth, ganti URL di bawah dengan alamat IP komputer Anda.</p>
            </div>

            <div style="margin:16px 0;">
              <label style="font-size:12px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:6px;">
                Host URL (Contoh: http://192.168.1.10:5173 atau https://booth.my-domain.com):
              </label>
              <input type="text" id="input-kiosk-host" class="claim-input" value="${kioskHost}">
            </div>

            <div style="display:flex;gap:8px;justify-content:flex-end;">
              <button class="btn-secondary" id="btn-host-use-origin">Gunakan Origin Saat Ini</button>
              <button class="btn-primary" id="btn-save-kiosk-host">Simpan Alamat Host</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  static bindEvents(app) {
    // 1. Filter tabs
    const tabBtns = document.querySelectorAll('.lead-tab-btn');
    tabBtns.forEach(btn => {
      btn.onclick = () => {
        this.currentFilter = btn.dataset.filter || 'ALL';
        app.render();
      };
    });

    // 2. Play Again / Choose Song button
    const playAgainBtn = document.getElementById('btn-lead-play-again');
    const playFromLeadBtn = document.getElementById('btn-play-from-lead');
    [playAgainBtn, playFromLeadBtn].forEach(b => {
      if (b) {
        b.onclick = () => {
          gameEngine.setState(GAME_STATES.TRACK_SELECT);
        };
      }
    });

    // 3. Refresh scores
    const refreshBtn = document.getElementById('btn-lead-refresh');
    if (refreshBtn) {
      refreshBtn.onclick = () => {
        app.render();
      };
    }

    // 4. Return to Home
    const leadHomeBtn = document.getElementById('btn-lead-goto-home');
    if (leadHomeBtn) {
      leadHomeBtn.onclick = () => {
        gameEngine.setState(GAME_STATES.HOME);
      };
    }

    // 4. Panitia Mode Toggle
    const panitiaToggle = document.getElementById('btn-toggle-panitia');
    if (panitiaToggle) {
      panitiaToggle.onclick = () => {
        this.isPanitiaMode = !this.isPanitiaMode;
        app.render();
      };
    }

    // 5. Open QR Modal
    const openQrBtn = document.getElementById('btn-open-qr-modal');
    const qrModal = document.getElementById('qr-scan-modal');
    const closeQrBtn = document.getElementById('btn-close-qr-modal');
    if (openQrBtn && qrModal) {
      openQrBtn.onclick = () => {
        qrModal.style.display = 'flex';
        this.renderQrCode();
      };
    }
    if (closeQrBtn && qrModal) {
      closeQrBtn.onclick = () => {
        qrModal.style.display = 'none';
      };
    }

    // 6. Switch from QR to Manual Input
    const switchManualBtn = document.getElementById('btn-qr-switch-manual');
    if (switchManualBtn && qrModal) {
      switchManualBtn.onclick = () => {
        qrModal.style.display = 'none';
        const manModal = document.getElementById('manual-input-modal');
        if (manModal) manModal.style.display = 'flex';
      };
    }

    const testTabBtn = document.getElementById('btn-qr-test-tab');
    if (testTabBtn) {
      testTabBtn.onclick = () => {
        const link = document.getElementById('qr-direct-link');
        if (link && link.href) window.open(link.href, '_blank');
      };
    }

    const quickSaveBtn = document.getElementById('btn-quick-save-ip');
    const quickIpInput = document.getElementById('quick-ip-input');
    if (quickSaveBtn && quickIpInput) {
      quickSaveBtn.onclick = () => {
        const val = quickIpInput.value.trim();
        if (val) {
          competitionLeaderboardService.setKioskHost(val);
          this.renderQrCode();
          quickSaveBtn.innerText = '✔ Disimpan';
          setTimeout(() => { if (quickSaveBtn) quickSaveBtn.innerText = 'Ganti IP'; }, 1500);
        }
      };
    }

    // 7. Open Manual Input Modal
    const openManBtn = document.getElementById('btn-open-manual-input');
    const manModal = document.getElementById('manual-input-modal');
    const closeManBtn = document.getElementById('btn-close-manual-modal');
    if (openManBtn && manModal) {
      openManBtn.onclick = () => {
        manModal.style.display = 'flex';
      };
    }
    if (closeManBtn && manModal) {
      closeManBtn.onclick = () => {
        manModal.style.display = 'none';
      };
    }

    // 8. Submit Manual On-Screen Kiosk Entry
    const directForm = document.getElementById('form-kiosk-direct-entry');
    if (directForm) {
      directForm.onsubmit = async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('kiosk-input-name');
        const phoneInput = document.getElementById('kiosk-input-phone');
        const trackSelect = document.getElementById('kiosk-select-track');
        const scoreInput = document.getElementById('kiosk-input-score');
        const errBox = document.getElementById('kiosk-error-box');

        const playerName = nameInput?.value.trim() || '';
        const phone = phoneInput?.value.trim() || '';
        const songId = trackSelect?.value || 'KOMANG';
        const score = parseInt(scoreInput?.value || '90000', 10);

        const track = COMPETITION_TRACKS[songId] || { title: '🌺 Komang - Raim Laode', badge: '🌺 KOMANG', emoji: '🌺' };

        const res = await competitionLeaderboardService.submitLeaderboardClaim({
          playerName,
          phone,
          sessionData: {
            songId,
            songTitle: track.title,
            songBadge: track.badge,
            songEmoji: track.emoji,
            score,
            accuracy: Math.min(100, Math.round(score / 1000)),
            combo: 30,
            stars: 4,
          },
        });

        if (!res.success) {
          if (errBox) {
            errBox.innerText = res.message;
            errBox.style.display = 'block';
          }
          return;
        }

        if (manModal) manModal.style.display = 'none';
        app.render();
      };
    }

    // 9. Panitia Tools: Export CSV
    const exportBtn = document.getElementById('btn-export-csv');
    if (exportBtn) {
      exportBtn.onclick = () => {
        competitionLeaderboardService.exportToCSV();
      };
    }

    // 10. Panitia Tools: Host Config Modal
    const configHostBtn = document.getElementById('btn-config-host');
    const hostModal = document.getElementById('kiosk-host-modal');
    const closeHostBtn = document.getElementById('btn-close-host-modal');
    const saveHostBtn = document.getElementById('btn-save-kiosk-host');
    const useOriginBtn = document.getElementById('btn-host-use-origin');
    const hostInput = document.getElementById('input-kiosk-host');

    if (configHostBtn && hostModal) {
      configHostBtn.onclick = () => {
        hostModal.style.display = 'flex';
      };
    }
    if (closeHostBtn && hostModal) {
      closeHostBtn.onclick = () => {
        hostModal.style.display = 'none';
      };
    }
    if (useOriginBtn && hostInput) {
      useOriginBtn.onclick = () => {
        hostInput.value = window.location.origin + window.location.pathname.replace(/\/$/, '');
      };
    }
    if (saveHostBtn && hostInput && hostModal) {
      saveHostBtn.onclick = () => {
        competitionLeaderboardService.setKioskHost(hostInput.value);
        hostModal.style.display = 'none';
        app.render();
      };
    }

    // 11. Panitia Tools: Reset Leaderboard
    const resetBtn = document.getElementById('btn-reset-leaderboard');
    if (resetBtn) {
      resetBtn.onclick = () => {
        if (confirm('APAKAH ANDA YAKIN ingin mereset seluruh data papan skor untuk memulai event baru?')) {
          competitionLeaderboardService.resetLeaderboard();
          app.render();
        }
      };
    }

    // 12. Toggle Prize Claim Status per row
    const claimBtns = document.querySelectorAll('.btn-claim-toggle');
    claimBtns.forEach(b => {
      b.onclick = () => {
        const entryId = b.dataset.entryId;
        if (entryId) {
          competitionLeaderboardService.togglePrizeClaimed(entryId);
          app.render();
        }
      };
    });
  }

  static renderQrCode() {
    const canvas = document.getElementById('leaderboard-qr-canvas');
    const linkEl = document.getElementById('qr-direct-link');
    if (!canvas) return;

    const pending = competitionLeaderboardService.getPendingSession();
    const kioskHost = competitionLeaderboardService.getKioskHost();

    let targetUrl = '';
    if (pending && pending.claimUrl) {
      targetUrl = pending.claimUrl;
    } else {
      targetUrl = `${kioskHost}/#claim?session=BOOTH-REG&song=KOMANG&score=90000`;
    }

    qrCodeService.renderToCanvas(canvas, targetUrl, {
      size: 240,
      padding: 16,
      darkColor: '#0c061a',
      lightColor: '#ffffff',
      showEmblem: true,
    });

    if (linkEl) {
      linkEl.href = targetUrl;
      linkEl.innerText = targetUrl;
    }
  }
}
