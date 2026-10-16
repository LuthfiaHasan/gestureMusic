// OnlineLeaderboardService.js - Cloud Leaderboard Integration & Anti-Tamper Adapter
// Provides an offline-first boundary for Supabase/Firebase/REST API score synchronization.
// Note: Never hardcode private service keys here. Configure via Settings or Environment.

import { scoreManager } from './ScoreManager.js';

export class OnlineLeaderboardService {
  constructor() {
    this.endpointUrl = localStorage.getItem('gs_leaderboard_endpoint') || '';
    this.apiKey = localStorage.getItem('gs_leaderboard_apikey') || '';
    this.lastSubmitTime = 0;
    this.submitCooldownMs = 5000; // 5-second anti-spam rate limit
  }

  /**
   * Checks whether a valid online backend is currently configured
   */
  isConfigured() {
    return Boolean(this.endpointUrl && this.endpointUrl.trim().startsWith('http'));
  }

  /**
   * Sets backend REST endpoint (e.g. Supabase REST URL or Custom Server)
   */
  configure(endpointUrl, apiKey = '') {
    this.endpointUrl = (endpointUrl || '').trim();
    this.apiKey = (apiKey || '').trim();
    try {
      localStorage.setItem('gs_leaderboard_endpoint', this.endpointUrl);
      localStorage.setItem('gs_leaderboard_apikey', this.apiKey);
    } catch (e) {}
  }

  /**
   * Simple client-side anti-tamper checksum
   */
  _generateChecksum(playerName, mode, score, combo, timestamp) {
    const raw = `${playerName}:${mode}:${score}:${combo}:${timestamp}:gesture_synth_salt`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Submit player's game score to online backend (or fallback to local records)
   */
  async submitScore(runEntry) {
    // 1. Always record in local robust storage first
    if (!runEntry) return { success: false, message: 'Data skor tidak valid.' };

    const now = Date.now();
    if (now - this.lastSubmitTime < this.submitCooldownMs) {
      return { 
        success: false, 
        isRateLimited: true,
        message: 'Mohon tunggu beberapa detik sebelum mengirimkan skor berikutnya.' 
      };
    }

    if (!this.isConfigured()) {
      return {
        success: true,
        isLocalOnly: true,
        message: 'Tersimpan di Papan Skor Lokal (Offline). Konfigurasikan REST endpoint di Pengaturan untuk sinkronisasi cloud.',
        entry: runEntry,
      };
    }

    this.lastSubmitTime = now;
    const checksum = this._generateChecksum(
      runEntry.playerName,
      runEntry.mode,
      runEntry.scorePct,
      runEntry.combo,
      now
    );

    const payload = {
      player_name: runEntry.playerName,
      mode: runEntry.mode,
      score: runEntry.scorePct,
      score_points: runEntry.scorePoints,
      combo: runEntry.combo,
      stars: runEntry.stars,
      level: runEntry.level,
      checksum,
      timestamp: now,
    };

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (this.apiKey) {
        headers['apikey'] = this.apiKey;
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const res = await fetch(this.endpointUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Server merespons status ${res.status}: ${res.statusText}`);
      }

      return {
        success: true,
        isLocalOnly: false,
        message: 'Skor berhasil disinkronkan ke Cloud Leaderboard!',
      };
    } catch (err) {
      console.warn('OnlineLeaderboard sync notice:', err);
      return {
        success: false,
        isLocalOnly: true,
        message: `Gagal tersambung ke Cloud Server (${err.message}). Skor tetap tersimpan di penyimpanan lokal.`,
      };
    }
  }

  /**
   * Fetch leaderboard rankings from cloud (or local storage if unconfigured)
   */
  async fetchLeaderboard(mode = 'CLASSIC') {
    if (!this.isConfigured()) {
      return {
        mode,
        isOnline: false,
        scores: scoreManager.getLocalLeaderboard(mode),
        notice: 'Menampilkan Papan Skor Lokal. Untuk mengaktifkan skor global antar-pemain, masukkan Endpoint REST di menu Pengaturan.',
      };
    }

    try {
      const headers = { 'Accept': 'application/json' };
      if (this.apiKey) {
        headers['apikey'] = this.apiKey;
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      // Query top 10 descending by score
      const queryUrl = `${this.endpointUrl}?mode=eq.${mode}&order=score.desc&limit=10`;
      const res = await fetch(queryUrl, { method: 'GET', headers });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      return {
        mode,
        isOnline: true,
        scores: Array.isArray(data) ? data : [],
        notice: 'Terhubung ke Cloud Leaderboard Live 🌐',
      };
    } catch (e) {
      console.warn('Fetch online leaderboard failed, fallback to local:', e);
      return {
        mode,
        isOnline: false,
        scores: scoreManager.getLocalLeaderboard(mode),
        notice: 'Koneksi ke server online terputus. Menampilkan data lokal cadangan.',
      };
    }
  }
}

export const onlineLeaderboardService = new OnlineLeaderboardService();
