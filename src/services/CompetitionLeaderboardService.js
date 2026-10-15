// CompetitionLeaderboardService.js - Single Unified Fair Leaderboard & Prize System
// Normalizes scores across any song/mode to a standardized 100,000 points scale.
// Provides QR Code claim session generation, phone number validation, cross-device sync, and Panitia Booth mode.

import { onlineLeaderboardService } from './OnlineLeaderboardService.js';

export const COMPETITION_TRACKS = {
  KOMANG: {
    id: 'KOMANG',
    title: '🌺 Komang - Raim Laode',
    artist: 'Raim Laode',
    genre: 'Indonesian Pop Piano',
    bpm: 130,
    difficulty: 'MEDIUM',
    badge: '🌺 KOMANG',
    color: '#ff2d75',
    emoji: '🌺',
    desc: 'Piano Tiles Pop • Key G Major • 130 BPM • Sentuhan Melodi Romantis',
  },
  NADIMU: {
    id: 'NADIMU',
    title: '🎵 Selalu Ada di Nadimu - OST Jumbo',
    artist: 'BCL / Prince Poetiray (OST Jumbo)',
    genre: 'Peaceful Piano Pop',
    bpm: 78,
    difficulty: 'MEDIUM',
    badge: '🎵 NADIMU',
    color: '#00f7ff',
    emoji: '🎵',
    desc: 'Piano Tiles Pop • Key C Major • 78 BPM • Sentuhan Hangat & Haru Keluarga',
  },
  JINGLE_BELLS: {
    id: 'JINGLE_BELLS',
    title: '🔔 Jingle Bells Piano',
    artist: 'James Lord Pierpont',
    genre: 'Classic Holiday Pop',
    bpm: 110,
    difficulty: 'EASY',
    badge: '🔔 JINGLE BELLS',
    color: '#00f7ff',
    emoji: '🔔',
    desc: 'Melodi Ceria C Major • 48 Not • Cocok untuk Pemula & Adu Kecepatan',
  },
  NEON_DAWN: {
    id: 'NEON_DAWN',
    title: '⭐ Neon Dawn (Pop Ballad)',
    artist: 'Indonesian Pop Synth',
    genre: 'Pop Ballad',
    bpm: 80,
    difficulty: 'BEGINNER',
    badge: '⭐ NEON DAWN',
    color: '#00ffaa',
    emoji: '⭐',
    desc: 'Akor Pop Harmonis • 80 BPM • 1 Measure Per Akor • Santai & Presisi',
  },
  CYBER_GROOVE: {
    id: 'CYBER_GROOVE',
    title: '⚡ Cyber Groove',
    artist: 'Modern Pop Beat',
    genre: 'Upbeat Funk',
    bpm: 115,
    difficulty: 'HARD',
    badge: '⚡ CYBER GROOVE',
    color: '#ffd700',
    emoji: '⚡',
    desc: 'Upbeat Dynamic Pop • 115 BPM • Transisi Cepat & Combo Multiplier',
  },
  ENDLESS: {
    id: 'ENDLESS',
    title: '♾️ Endless Groove Jam',
    artist: 'Non-Stop Rhythm',
    genre: 'Endurance Pop',
    bpm: 120,
    difficulty: 'SURVIVAL',
    badge: '♾️ ENDLESS',
    color: '#a855f7',
    emoji: '♾️',
    desc: 'Uji Ketahanan Non-Stop • 3 Nyawa • BPM Bertahap Meningkat',
  },
  JATUH_SUKA: {
    id: 'JATUH_SUKA',
    title: '✨ Jatuh Suka - 10 Jari Motion',
    artist: 'Tulus / Indonesian Pop',
    genre: 'Pop Motion Audio Sync',
    bpm: 110,
    difficulty: 'HARD',
    badge: '✨ JATUH SUKA',
    color: '#00f7ff',
    emoji: '✨',
    desc: '10-Finger Motion Audio Sync • 5 Nyawa ❤️ • Sinkronisasi Gerakan Jari Real-Time',
  },
  TARAGAK_PULANG: {
    id: 'TARAGAK_PULANG',
    title: '🌾 Taragak Pulang - Minang Klasik',
    artist: 'Dima / Minang Heritage',
    genre: 'Minang Motion Audio Sync',
    bpm: 105,
    difficulty: 'HARD',
    badge: '🌾 TARAGAK PULANG',
    color: '#ffd700',
    emoji: '🌾',
    desc: '10-Finger Motion Audio Sync • Dendang Minang • 5 Nyawa ❤️ • Adu Kecepatan Refleks Jari',
  },
};

export class CompetitionLeaderboardService {
  constructor() {
    this.storageKey = 'gs_competition_leaderboard_v2';
    this.pendingSessionKey = 'gs_competition_pending_session';
    this.kioskHostKey = 'gs_kiosk_host_url';
    this.broadcastChannel = null;

    // Listeners for UI updates
    this.onNewScoreSubmitted = null;

    this.initBroadcastChannel();
    this.initCrossTabListener();
    this.startKioskSync();
  }

  initBroadcastChannel() {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel('gesture_music_competition');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.type === 'NEW_COMPETITION_SUBMISSION') {
            if (this.onNewScoreSubmitted) {
              this.onNewScoreSubmitted(event.data.entry);
            }
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel not supported or error:', e);
      }
    }
  }

  initCrossTabListener() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'gs_last_submitted_entry' && e.newValue) {
          try {
            const entry = JSON.parse(e.newValue);
            if (this.onNewScoreSubmitted) {
              this.onNewScoreSubmitted(entry);
            }
          } catch (err) {}
        }
      });
    }
  }

  startKioskSync() {
    if (typeof window === 'undefined') return;
    const isKioskHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isKioskHost) return;

    let lastPollTime = Date.now() - 300000;
    setInterval(async () => {
      try {
        const res = await fetch(`/api/poll-submissions?since=${lastPollTime}`);
        if (res.ok) {
          const data = await res.json();
          if (data.items && data.items.length > 0) {
            data.items.forEach(item => {
              lastPollTime = Math.max(lastPollTime, item.timestamp);
              const list = this.getLeaderboard('ALL');
              if (!list.some(x => x.id === item.id)) {
                list.push(item);
                this.saveLeaderboard(list);
                if (this.onNewScoreSubmitted) {
                  this.onNewScoreSubmitted(item);
                }
              }
            });
          }
        }
      } catch (e) {}
    }, 1800);
  }

  /**
   * Calculates a strictly normalized, standardized 100,000 points competition score.
   * Ensures mathematical fairness between songs with different note counts and lengths!
   */
  calculateStandardScore({
    totalNotes = 20,
    perfectCount = 0,
    greatCount = 0,
    goodCount = 0,
    badCount = 0,
    missCount = 0,
    maxCombo = 0,
    chordAccuracyPct = 100,
    scorePct = 0,
  }) {
    const notes = Math.max(1, totalNotes);

    // 1. Hit Timing Accuracy Component: 70,000 Points max
    // Perfect = 1.0, Great = 0.8, Good = 0.6, Bad = 0.3, Miss = 0.0
    const timingRatio = Math.min(1.0, (perfectCount * 1.0 + greatCount * 0.80 + goodCount * 0.60 + badCount * 0.30) / notes);
    const timingScore = Math.round(timingRatio * 70000);

    // 2. Gesture / Shape Matching Component: 20,000 Points max
    const gestureRatio = Math.max(0, Math.min(1.0, (chordAccuracyPct || scorePct || 90) / 100));
    const gestureScore = Math.round(gestureRatio * 20000);

    // 3. Full Combo & Streak Flow Component: 10,000 Points max
    // Full Combo gets the full 10,000 pts!
    const comboRatio = Math.min(1.0, maxCombo / notes);
    const comboScore = Math.round(comboRatio * 10000);

    const total = Math.min(100000, Math.max(0, timingScore + gestureScore + comboScore));

    return {
      standardScore: total,
      timingScore,
      gestureScore,
      comboScore,
      accuracyPct: Math.round(timingRatio * 100),
      isFullCombo: missCount === 0 && (perfectCount + greatCount) > 0,
    };
  }

  /**
   * Retrieves all entries in the 1 Unified Leaderboard, sorted descending by score
   */
  getLeaderboard(filterSong = 'ALL') {
    let list = [];
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        list = JSON.parse(raw);
      }
    } catch (e) {
      list = [];
    }

    if (!Array.isArray(list) || list.length === 0) {
      list = this._getSeedLeaderboard();
      this.saveLeaderboard(list);
    }

    if (filterSong && filterSong !== 'ALL') {
      list = list.filter(item => item.songId === filterSong || item.trackId === filterSong);
    }

    // Sort descending by score, tiebreaker: combo, then timestamp
    list.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.combo !== a.combo) return b.combo - a.combo;
      return a.timestamp - b.timestamp;
    });

    return list;
  }

  saveLeaderboard(list) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(list));
    } catch (e) {
      console.warn('Leaderboard save warning:', e);
    }
  }

  /**
   * Formats a phone number for privacy display (e.g. 0812-****-5678)
   */
  maskPhoneNumber(phone) {
    if (!phone) return '08**-****-****';
    const cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.length < 8) return phone;
    const prefix = cleaned.slice(0, 4);
    const suffix = cleaned.slice(-4);
    return `${prefix}-****-${suffix}`;
  }

  /**
   * Cleans a phone number into international format for WhatsApp (e.g. 628123456789)
   */
  cleanPhoneForWhatsApp(phone) {
    if (!phone) return '';
    let digits = phone.replace(/[^0-9]/g, '');
    if (digits.startsWith('0')) {
      digits = '62' + digits.slice(1);
    } else if (digits.startsWith('8')) {
      digits = '62' + digits;
    }
    return digits;
  }

  /**
   * Validates Indonesian mobile phone number format
   */
  validatePhoneNumber(phone) {
    if (!phone) return { valid: false, message: 'Nomor HP tidak boleh kosong.' };
    const digits = phone.replace(/[^0-9]/g, '');
    if (digits.length < 10) {
      return { valid: false, message: 'Nomor HP terlalu pendek (minimal 10 digit).' };
    }
    if (digits.length > 15) {
      return { valid: false, message: 'Nomor HP terlalu panjang (maksimal 14 digit).' };
    }
    if (!digits.startsWith('08') && !digits.startsWith('628') && !digits.startsWith('8')) {
      return { valid: false, message: 'Format nomor HP tidak valid (harus diawali 08... atau +628...).' };
    }
    return { valid: true, cleaned: digits };
  }

  /**
   * Configured kiosk host URL (e.g. http://192.168.1.19:5173 or https://event.domain.com)
   */
  getKioskHost() {
    // Public Cloudflare Tunnel (Official Trusted SSL, Zero Security Warnings, Works on any 4G/5G mobile data)
    const activePublicTunnel = 'https://title-oct-gdp-inserted.trycloudflare.com';

    try {
      const saved = localStorage.getItem(this.kioskHostKey);
      if (saved && saved.trim().startsWith('http') && !saved.includes('localhost') && !saved.includes('127.0.0.1') && !saved.includes('192.168.')) {
        return saved.trim().replace(/\/$/, '');
      }
    } catch (e) {}

    if (activePublicTunnel) {
      return activePublicTunnel;
    }

    // Check if __LOCAL_IP__ is provided by Vite or fallback to detected IP 192.168.1.18
    let detectedIp = '192.168.1.18';
    try {
      if (typeof __LOCAL_IP__ !== 'undefined' && __LOCAL_IP__ && __LOCAL_IP__ !== 'localhost') {
        detectedIp = __LOCAL_IP__;
      }
    } catch (e) {}

    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      const proto = window.location.protocol || 'https:';
      const port = window.location.port ? `:${window.location.port}` : ':5173';
      const pathname = window.location.pathname.replace(/\/$/, '');

      // CRITICAL: If the app is currently running on localhost or 127.0.0.1, ALWAYS use the computer's actual Wi-Fi IPv4 address with current protocol!
      // This allows any smartphone on the same Wi-Fi to scan the QR code and load the form immediately!
      if (host === 'localhost' || host === '127.0.0.1') {
        return `${proto}//${detectedIp}${port}${pathname}`;
      }

      return `${window.location.origin}${pathname}`;
    }
    return `https://${detectedIp}:5173`;
  }

  setKioskHost(url) {
    try {
      if (url && typeof url === 'string') {
        localStorage.setItem(this.kioskHostKey, url.trim().replace(/\/$/, ''));
      }
    } catch (e) {}
  }

  /**
   * Creates an official pending session when a game ends.
   * Returns session object with scannable QR Code URL!
   */
  createPendingSession(stats) {
    const id = 'GS-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 5).toUpperCase();
    
    const trackInfo = COMPETITION_TRACKS[stats.songId] || {
      id: stats.songId || 'CUSTOM',
      title: stats.songTitle || 'Lagu Pilihan Peserta',
      badge: stats.songBadge || '🎵 LAGU POP',
      emoji: '🎵',
      color: '#00f7ff',
    };

    const stdScoreCalc = this.calculateStandardScore(stats);
    const score = stdScoreCalc.standardScore;

    const session = {
      id,
      songId: trackInfo.id,
      songTitle: trackInfo.title,
      songBadge: trackInfo.badge,
      songEmoji: trackInfo.emoji,
      score,
      scoreBreakdown: stdScoreCalc,
      accuracy: stdScoreCalc.accuracyPct,
      combo: stats.maxCombo || stats.combo || 0,
      stars: stats.stars || 3,
      grade: stats.grade || (score >= 90000 ? 'S' : score >= 80000 ? 'A' : 'B'),
      timestamp: Date.now(),
      dateFormatted: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    try {
      localStorage.setItem(this.pendingSessionKey, JSON.stringify(session));
    } catch (e) {}

    const kioskBase = this.getKioskHost();
    // Build QR Code Claim URL
    const params = new URLSearchParams({
      session: session.id,
      song: session.songId,
      score: session.score.toString(),
      acc: session.accuracy.toString(),
      combo: session.combo.toString(),
      t: session.timestamp.toString(),
    });
    session.claimUrl = `${kioskBase}/#claim?${params.toString()}`;

    return session;
  }

  getPendingSession() {
    try {
      const raw = localStorage.getItem(this.pendingSessionKey);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Submits player details (Name & Phone Number) to claim entry into the Unified Leaderboard
   */
  async submitLeaderboardClaim({
    sessionId = null,
    playerName = '',
    phone = '',
    notes = '',
    sessionData = null,
  }) {
    const trimmedName = (playerName || '').trim().slice(0, 30);
    if (!trimmedName) {
      return { success: false, message: 'Mohon masukkan nama lengkap peserta.' };
    }

    const phoneCheck = this.validatePhoneNumber(phone);
    if (!phoneCheck.valid) {
      return { success: false, message: phoneCheck.message };
    }

    // Retrieve active session details
    let session = sessionData;
    if (!session && sessionId) {
      const pending = this.getPendingSession();
      if (pending && pending.id === sessionId) {
        session = pending;
      }
    }

    // Fallback if session expired or direct submit
    if (!session) {
      session = {
        id: sessionId || ('GS-' + Date.now().toString(36).toUpperCase()),
        songId: 'KOMANG',
        songTitle: '🌺 Komang - Raim Laode',
        songBadge: '🌺 KOMANG',
        songEmoji: '🌺',
        score: 85000,
        accuracy: 88,
        combo: 25,
        stars: 3,
        grade: 'A',
        timestamp: Date.now(),
      };
    }

    const entryId = session.id || ('GS-' + Date.now().toString(36).toUpperCase());
    const now = Date.now();

    const newEntry = {
      id: entryId,
      playerName: trimmedName,
      phone: phoneCheck.cleaned,
      notes: (notes || '').trim().slice(0, 50),
      songId: session.songId,
      songTitle: session.songTitle,
      songBadge: session.songBadge || '🎵 LAGU POP',
      songEmoji: session.songEmoji || '🎵',
      score: session.score || 0,
      accuracy: session.accuracy || 0,
      combo: session.combo || 0,
      stars: session.stars || 3,
      grade: session.grade || 'A',
      timestamp: now,
      dateFormatted: new Date(now).toLocaleDateString('id-ID', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      prizeClaimed: false,
      prizeClaimedAt: null,
    };

    // 1. Save into local persistent store
    const list = this.getLeaderboard('ALL');
    // Remove duplicate session if already submitted
    const filtered = list.filter(item => item.id !== newEntry.id);
    filtered.push(newEntry);
    this.saveLeaderboard(filtered);

    // 2. Broadcast to arcade kiosk window
    try {
      localStorage.setItem('gs_last_submitted_entry', JSON.stringify(newEntry));
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({
          type: 'NEW_COMPETITION_SUBMISSION',
          entry: newEntry,
        });
      }
      // Send to Kiosk Server API so TV window is instantly notified from mobile device
      fetch('/api/submit-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry),
      }).catch(() => {});
    } catch (e) {}

    // 3. Clear pending session
    try {
      localStorage.removeItem(this.pendingSessionKey);
    } catch (e) {}

    // 4. Optionally sync to Online REST / Supabase backend
    if (onlineLeaderboardService.isConfigured()) {
      onlineLeaderboardService.submitScore({
        playerName: newEntry.playerName,
        mode: newEntry.songId,
        scorePct: Math.round(newEntry.score / 1000),
        scorePoints: newEntry.score,
        combo: newEntry.combo,
        stars: newEntry.stars,
        phone: newEntry.phone,
      }).catch(() => {});
    }

    // Determine current rank position
    const sorted = this.getLeaderboard('ALL');
    const rank = sorted.findIndex(item => item.id === newEntry.id) + 1;

    return {
      success: true,
      rank,
      entry: newEntry,
      message: `Selamat, ${newEntry.playerName}! Skor berhasil masuk ke Papan Peringkat di Peringkat #${rank}!`,
    };
  }

  /**
   * Panitia Booth Action: Mark prize as given / claimed by player
   */
  togglePrizeClaimed(entryId) {
    const list = this.getLeaderboard('ALL');
    const item = list.find(it => it.id === entryId);
    if (item) {
      item.prizeClaimed = !item.prizeClaimed;
      item.prizeClaimedAt = item.prizeClaimed ? Date.now() : null;
      this.saveLeaderboard(list);
      return item;
    }
    return null;
  }

  /**
   * Panitia Action: Generates WhatsApp greeting link to notify the winner
   */
  getWhatsAppWinnerLink(entry, rank = 1) {
    if (!entry || !entry.phone) return '#';
    const cleanPhone = this.cleanPhoneForWhatsApp(entry.phone);
    const medal = rank === 1 ? '🥇 JUARA 1' : rank === 2 ? '🥈 JUARA 2' : rank === 3 ? '🥉 JUARA 3' : `Peringkat #${rank}`;
    const message = `Halo Kak ${entry.playerName}! 🎮🎉\n\nSelamat! Anda meraih ${medal} di Kompetisi Gesture Synth!\nLagu: ${entry.songTitle}\nSkor: ${entry.score.toLocaleString()} PTS (${entry.accuracy}% Akurasi, x${entry.combo} Combo)\n\nSilakan datang ke Booth Panitia untuk mengambil HADIAH Anda! 🎁✨`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  }

  /**
   * Export leaderboard to CSV for Panitia report
   */
  exportToCSV() {
    const list = this.getLeaderboard('ALL');
    const headers = ['Peringkat', 'ID Sesi', 'Nama Peserta', 'Nomor HP', 'Lagu', 'Skor Kompetisi', 'Akurasi %', 'Max Combo', 'Status Hadiah', 'Waktu'];
    const rows = list.map((item, idx) => [
      idx + 1,
      item.id,
      `"${(item.playerName || '').replace(/"/g, '""')}"`,
      `"${item.phone || ''}"`,
      `"${(item.songTitle || item.songId || '').replace(/"/g, '""')}"`,
      item.score || 0,
      `${item.accuracy || 0}%`,
      `x${item.combo || 0}`,
      item.prizeClaimed ? 'SUDAH DIAMBIL' : 'BELUM DIAMBIL',
      `"${item.dateFormatted || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Leaderboard_Gesture_Synth_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Panitia Action: Reset all records for a new event round
   */
  resetLeaderboard() {
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.pendingSessionKey);
    localStorage.removeItem('gs_last_submitted_entry');
  }

  /**
   * Realistic initial seed data for lively booth demonstration
   */
  _getSeedLeaderboard() {
    return [
      {
        id: 'GS-DEMO-01',
        playerName: 'Dimas Wicaksono',
        phone: '081298765432',
        notes: '@dimas_piano',
        songId: 'KOMANG',
        songTitle: '🌺 Komang - Raim Laode',
        songBadge: '🌺 KOMANG',
        songEmoji: '🌺',
        score: 98450,
        accuracy: 99,
        combo: 48,
        stars: 5,
        grade: 'S+',
        timestamp: Date.now() - 3600000 * 2,
        dateFormatted: 'Hari ini, 13:45',
        prizeClaimed: false,
      },
      {
        id: 'GS-DEMO-02',
        playerName: 'Sarah Nabila',
        phone: '085712345678',
        notes: '',
        songId: 'JINGLE_BELLS',
        songTitle: '🔔 Jingle Bells Piano',
        songBadge: '🔔 JINGLE BELLS',
        songEmoji: '🔔',
        score: 96800,
        accuracy: 97,
        combo: 48,
        stars: 5,
        grade: 'S',
        timestamp: Date.now() - 3600000 * 3,
        dateFormatted: 'Hari ini, 12:30',
        prizeClaimed: false,
      },
      {
        id: 'GS-DEMO-03',
        playerName: 'Reza Pratama',
        phone: '081345678901',
        notes: '',
        songId: 'NEON_DAWN',
        songTitle: '⭐ Neon Dawn (Pop Ballad)',
        songBadge: '⭐ NEON DAWN',
        songEmoji: '⭐',
        score: 94200,
        accuracy: 95,
        combo: 32,
        stars: 4,
        grade: 'S',
        timestamp: Date.now() - 3600000 * 4,
        dateFormatted: 'Hari ini, 11:15',
        prizeClaimed: true,
        prizeClaimedAt: Date.now() - 3600000 * 2,
      },
      {
        id: 'GS-DEMO-04',
        playerName: 'Alya Putri',
        phone: '087890123456',
        notes: '',
        songId: 'KOMANG',
        songTitle: '🌺 Komang - Raim Laode',
        songBadge: '🌺 KOMANG',
        songEmoji: '🌺',
        score: 91500,
        accuracy: 92,
        combo: 38,
        stars: 4,
        grade: 'A',
        timestamp: Date.now() - 3600000 * 5,
        dateFormatted: 'Hari ini, 10:20',
        prizeClaimed: false,
      },
      {
        id: 'GS-DEMO-05',
        playerName: 'Bagus Setiawan',
        phone: '082123456789',
        notes: '',
        songId: 'CYBER_GROOVE',
        songTitle: '⚡ Cyber Groove',
        songBadge: '⚡ CYBER GROOVE',
        songEmoji: '⚡',
        score: 87600,
        accuracy: 89,
        combo: 26,
        stars: 3,
        grade: 'A',
        timestamp: Date.now() - 3600000 * 6,
        dateFormatted: 'Hari ini, 09:40',
        prizeClaimed: false,
      },
    ];
  }
}

export const competitionLeaderboardService = new CompetitionLeaderboardService();
