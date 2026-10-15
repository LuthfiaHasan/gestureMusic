// MidiImportScreen.js - Custom MIDI Song Import UI & Playable Preview
import { MidiParserService } from '../../services/MidiParserService.js';
import { gameEngine } from '../../game/GameEngine.js';

export class MidiImportScreen {
  static currentParsedData = null;

  static render() {
    const hasData = Boolean(this.currentParsedData);
    const data = this.currentParsedData;

    return `
      <div class="subpage-screen midi-import-screen">
        <div class="subpage-header">
          <button class="btn-icon-back" id="btn-back-home">‹</button>
          <div>
            <h2 class="subpage-title">IMPORT LAGU MIDI</h2>
            <span style="font-size:11px;color:var(--text-muted);">Mainkan File Musik Sendiri dengan Gestur Tangan</span>
          </div>
        </div>

        <div class="midi-upload-container">
          <!-- File Drop Zone -->
          <div class="midi-drop-zone" id="midi-drop-zone">
            <input type="file" id="midi-file-input" accept=".mid,.midi" style="display:none;">
            <div class="midi-upload-icon">🎼</div>
            <div class="midi-upload-title">PILIH ATAU TARIK FILE MIDI KE SINI</div>
            <div class="midi-upload-subtitle">Mendukung format .mid dan .midi (Format 0 & 1 standar)</div>
            <button class="btn-primary" id="btn-choose-midi" style="margin-top:10px;padding:8px 22px;font-size:12px;">
              📁 BUKA DOKUMEN MIDI
            </button>
          </div>

          <!-- Error Alert Banner -->
          <div class="midi-error-banner" id="midi-error-banner" style="display:none;">
            <span class="error-icon">⚠️</span>
            <span class="error-text" id="midi-error-text">File MIDI tidak valid</span>
          </div>

          <!-- Parsed File Preview Card -->
          <div class="midi-preview-card" id="midi-preview-card" style="${hasData ? '' : 'display:none;'}">
            <div class="midi-meta-header">
              <div>
                <span class="midi-tag">FILE TERVERIFIKASI</span>
                <h3 class="midi-title" id="midi-song-title">${data?.title || 'Judul Lagu'}</h3>
              </div>
              <span class="midi-duration-pill" id="midi-duration">${data?.durationFormatted || '0:00'}</span>
            </div>

            <div class="midi-stats-grid">
              <div class="midi-stat-box">
                <span class="stat-lbl">TEMPO</span>
                <span class="stat-val" id="midi-bpm">${data?.bpm || 120} BPM</span>
              </div>
              <div class="midi-stat-box">
                <span class="stat-lbl">TOTAL NOT</span>
                <span class="stat-val" id="midi-notes-count">${data?.noteCount || 0}</span>
              </div>
              <div class="midi-stat-box">
                <span class="stat-lbl">TRACKS</span>
                <span class="stat-val" id="midi-tracks-count">${data?.numTracks || 1}</span>
              </div>
              <div class="midi-stat-box">
                <span class="stat-lbl">TANGGA NADA</span>
                <span class="stat-val">C DIATONIK</span>
              </div>
            </div>

            <!-- Playable Harmony Sequence Preview -->
            <div class="midi-chords-preview">
              <span class="chords-preview-label">PROGRESI HARMONI YANG DIBENTUK:</span>
              <div class="midi-chords-list" id="midi-chords-list">
                ${data ? data.phrase.measures.map((m, idx) => `
                  <div class="midi-chord-chip">
                    <span class="chip-m">Bar ${m.measure}</span>
                    <span class="chip-ch">${m.chord}</span>
                    <span class="chip-f">${m.fingerCount}F</span>
                  </div>
                `).join('') : ''}
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="midi-actions-row">
              <button class="btn-primary" id="btn-play-midi" style="flex:1;padding:12px;font-size:13px;letter-spacing:1px;">
                ▶ MAINKAN DENGAN GESTUR TANGAN
              </button>
              <button class="btn-secondary" id="btn-reset-midi" style="padding:12px 16px;font-size:12px;">
                ↺ Batal
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  static bindEvents(app) {
    const chooseBtn = document.getElementById('btn-choose-midi');
    const fileInput = document.getElementById('midi-file-input');
    const dropZone = document.getElementById('midi-drop-zone');
    const errorBanner = document.getElementById('midi-error-banner');
    const errorText = document.getElementById('midi-error-text');
    const playBtn = document.getElementById('btn-play-midi');
    const resetBtn = document.getElementById('btn-reset-midi');

    const showError = (msg) => {
      if (errorBanner && errorText) {
        errorText.innerText = msg;
        errorBanner.style.display = 'flex';
      }
    };

    const hideError = () => {
      if (errorBanner) errorBanner.style.display = 'none';
    };

    const processFile = async (file) => {
      if (!file) return;
      hideError();

      if (!file.name.toLowerCase().endsWith('.mid') && !file.name.toLowerCase().endsWith('.midi')) {
        showError('Format file tidak didukung. Harap pilih file berekstensi .mid atau .midi.');
        return;
      }

      try {
        const buffer = await file.arrayBuffer();
        const parsed = MidiParserService.parseMidiFile(buffer, file.name);
        this.currentParsedData = parsed;
        app.render();
      } catch (err) {
        console.error('MIDI parse error:', err);
        showError(`Gagal memuat file MIDI: ${err.message || 'Format tidak dikenali'}`);
      }
    };

    if (chooseBtn && fileInput) {
      chooseBtn.onclick = () => fileInput.click();
      fileInput.onchange = (e) => {
        if (e.target.files && e.target.files[0]) {
          processFile(e.target.files[0]);
        }
      };
    }

    if (dropZone) {
      dropZone.ondragover = (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
      };
      dropZone.ondragleave = () => {
        dropZone.classList.remove('drag-over');
      };
      dropZone.ondrop = (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
          processFile(e.dataTransfer.files[0]);
        }
      };
    }

    if (playBtn) {
      playBtn.onclick = () => {
        if (this.currentParsedData) {
          gameEngine.startMidiRound(this.currentParsedData);
        }
      };
    }

    if (resetBtn) {
      resetBtn.onclick = () => {
        this.currentParsedData = null;
        app.render();
      };
    }
  }
}
