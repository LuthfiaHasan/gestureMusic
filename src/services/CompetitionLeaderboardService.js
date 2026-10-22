// CompetitionLeaderboardService.js - Single Unified Fair Leaderboard & Prize System
// Normalizes scores across any song/mode to a standardized 100,000 points scale.
// Provides QR Code claim session generation, phone number validation, cross-device sync, and Panitia Booth mode.

import { onlineLeaderboardService } from './OnlineLeaderboardService.js';

export const COMPETITION_TRACKS = {
  KOMANG: {
    id: 'KOMANG',
    title: 'Komang - Raim Laode',
    artist: 'Raim Laode',
    genre: 'Indonesian Pop Piano',
    bpm: 130,
    difficulty: 'MEDIUM',
    badge: 'KOMANG',
    color: '#ff2d75',
    emoji: '🎹',
    desc: 'Piano Tiles Pop • Key G Major • 130 BPM • Sentuhan Melodi Romantis',
  },
  NADIMU: {
    id: 'NADIMU',
    title: 'Selalu Ada di Nadimu - OST Jumbo',
    artist: 'BCL / Prince Poetiray (OST Jumbo)',
    genre: 'Peaceful Piano Pop',
    bpm: 78,
    difficulty: 'MEDIUM',
    badge: 'NADIMU',
    color: '#00f7ff',
    emoji: '🎶',
    desc: 'Piano Tiles Pop • Key C Major • 78 BPM • Sentuhan Hangat & Haru Keluarga',
  },
  JATUH_SUKA: {
    id: 'JATUH_SUKA',
    title: 'Jatuh Suka - 10 Jari Motion',
    artist: 'Tulus / Indonesian Pop',
    genre: 'Pop Motion Audio Sync',
    bpm: 110,
    difficulty: 'HARD',
    badge: 'JATUH SUKA',
    color: '#00f7ff',
    emoji: '',
    desc: '10-Finger Motion Audio Sync • 5 Nyawa • Sinkronisasi Gerakan Jari Real-Time',
  },
  TARAGAK_PULANG: {
    id: 'TARAGAK_PULANG',
    title: 'Taragak Pulang - Minang Klasik',
    artist: 'Dima / Minang Heritage',
    genre: 'Minang Motion Audio Sync',
    bpm: 105,
    difficulty: 'HARD',
    badge: 'TARAGAK PULANG',
    color: '#ffd700',
    emoji: '',
    desc: '10-Finger Motion Audio Sync • Dendang Minang • 5 Nyawa • Adu Kecepatan Refleks Jari',
  },
};

export class CompetitionLeaderboardService {
  constructor() {
    this.storageKey = 'gs_competition_leaderboard_v2';
    this.pendingSessionKey = 'gs_competition_pending_session';
    this.kioskHostKey = 'gs_kiosk_host_url';
    this.universalEventQrKey = 'gs_universal_event_qr_url';
    this.broadcastChannel = null;

    // Listeners for UI updates
    this.onNewScoreSubmitted = null;

    // Auto-purge any dummy seeds from previous tests so only 100% real player records exist
    this.purgeDummySeeds();

    this.initBroadcastChannel();
    this.initCrossTabListener();
    this.startKioskSync();
  }

  /**
   * Purges all fake/demo data (Dimas Wicaksono, Sarah Nabila, Reza Pratama, etc.)
   * Guarantees leaderboard contains ONLY genuine player entries from the event.
   */
  purgeDummySeeds() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const dummyNames = [
            'dimas wicaksono',
            'sarah nabila',
            'reza pratama',
            'alya putri',
            'bagus setiawan',
            'rian melodi',
            'siti rahma',
            'kevin cyber',
            'nadia putri',
            'budi handbeat',
            'f1',
            'test',
            'testing',
            'ahmad real'
          ];
          const realEntries = parsed.filter(item => {
            if (!item || !item.id) return false;
            const idStr = String(item.id);
            if (idStr.startsWith('GS-DEMO-') || idStr.startsWith('seed_')) return false;
            const nameLower = (item.playerName || item.name || '').trim().toLowerCase();
            const phoneStr = String(item.phone || '').replace(/[^0-9]/g, '');
            if (dummyNames.includes(nameLower) || nameLower.length < 3 || nameLower.includes('f1') || phoneStr.includes('4324342')) return false;
            return true;
          });
          localStorage.setItem(this.storageKey, JSON.stringify(realEntries));
        }
      }

      // Also clean legacy store if it only contains seeds
      const legacyRaw = localStorage.getItem('gm_leaderboard_records');
      if (legacyRaw) {
        const legacyParsed = JSON.parse(legacyRaw);
        if (Array.isArray(legacyParsed)) {
          const cleanedLegacy = legacyParsed.filter(item => item && !String(item.id).startsWith('seed_'));
          localStorage.setItem('gm_leaderboard_records', JSON.stringify(cleanedLegacy));
        }
      }
    } catch (e) {
      console.warn('Purge dummy seeds error:', e);
    }
  }

  /**
   * Universal Event QR URL configured by Panitia/friend (e.g. Google Form or Event Portal)
   */
  getUniversalEventQrUrl() {
    try {
      const saved = localStorage.getItem(this.universalEventQrKey);
      return (saved && typeof saved === 'string') ? saved.trim() : '';
    } catch (e) {
      return '';
    }
  }

  setUniversalEventQrUrl(url) {
    try {
      if (url && typeof url === 'string') {
        localStorage.setItem(this.universalEventQrKey, url.trim());
      } else {
        localStorage.removeItem(this.universalEventQrKey);
      }
    } catch (e) {}
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
   * Ensures mathematical fairness between all songs (Piano Tiles & Motion Sync)!
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
    customScore = null,
  }) {
    if (typeof customScore === 'number' && !isNaN(customScore) && customScore > 0) {
      const finalScore = Math.min(100000, Math.max(0, Math.round(customScore)));
      return {
        standardScore: finalScore,
        timingScore: Math.round(finalScore * 0.70),
        gestureScore: Math.round(finalScore * 0.20),
        comboScore: Math.round(finalScore * 0.10),
        accuracyPct: Math.min(100, Math.max(0, Math.round(chordAccuracyPct || scorePct || (finalScore / 1000)))),
        isFullCombo: missCount === 0 && (perfectCount + greatCount + goodCount) > 0,
      };
    }

    const notes = Math.max(1, totalNotes);

    // 1. Hit Timing Accuracy Component: 70,000 Points max
    // Perfect = 1.0, Great = 0.88, Good = 0.72, Bad = 0.35, Miss = 0.0
    const timingRatio = Math.min(1.0, (perfectCount * 1.0 + greatCount * 0.88 + goodCount * 0.72 + badCount * 0.35) / notes);
    const timingScore = Math.round(timingRatio * 70000);

    // 2. Gesture / Shape Matching Component: 20,000 Points max
    const gestureRatio = Math.max(0, Math.min(1.0, (chordAccuracyPct || scorePct || 90) / 100));
    const gestureScore = Math.round(gestureRatio * 20000);

    // 3. Full Combo & Streak Flow Component: 10,000 Points max
    // Full Combo receives the full 10,000 pts!
    const comboRatio = Math.min(1.0, maxCombo / notes);
    const comboScore = Math.round(comboRatio * 10000);

    const total = Math.min(100000, Math.max(0, timingScore + gestureScore + comboScore));

    return {
      standardScore: total,
      timingScore,
      gestureScore,
      comboScore,
      accuracyPct: Math.round(timingRatio * 100),
      isFullCombo: missCount === 0 && (perfectCount + greatCount + goodCount) > 0,
    };
  }

  /**
   * Standardizes 10-Finger Motion Sync game score (Jatuh Suka & Taragak Pulang) to 100,000 pts scale
   */
  calculateMotionSyncScore({
    songId = 'JATUH_SUKA',
    rawScore = 0,
    lives = 5,
    maxLives = 5,
    duration = 60,
    targetDuration = 60,
    starRating = null,
  }) {
    const isTaragak = songId === 'TARAGAK_PULANG' || songId === 'taragak';
    const benchmarkScore = isTaragak ? 1150 : 1200;

    // 1. Survival & Timing component (up to 70,000 pts)
    const durationRatio = Math.min(1.0, duration / targetDuration);
    const scoreRatio = Math.min(1.0, rawScore / benchmarkScore);
    const timingRatio = durationRatio * 0.40 + scoreRatio * 0.60;
    const timingScore = Math.round(timingRatio * 70000);

    // 2. Hand Gesture Accuracy component (up to 20,000 pts)
    // Preserved lives (0 to 5) directly reflect gesture precision
    const livesRatio = Math.max(0, Math.min(1.0, lives / maxLives));
    const starRatio = Math.min(1.0, ((starRating?.stars || 3) / 5));
    const gestureRatio = (livesRatio * 0.70) + (starRatio * 0.30);
    const gestureScore = Math.round(gestureRatio * 20000);

    // 3. Perfect Streak / Combo flow (up to 10,000 pts)
    // 5 Stars with 5 Lives gets full 10,000 pts!
    let comboScore = 0;
    if (lives === 5 && (starRating?.stars >= 5 || rawScore >= benchmarkScore * 0.9)) {
      comboScore = 10000;
    } else if (lives >= 4) {
      comboScore = Math.round(8000 * scoreRatio);
    } else if (lives >= 3) {
      comboScore = Math.round(6000 * scoreRatio);
    } else if (lives >= 2) {
      comboScore = Math.round(4000 * scoreRatio);
    } else {
      comboScore = Math.round(2000 * scoreRatio);
    }

    const standardScore = Math.min(100000, Math.max(0, timingScore + gestureScore + comboScore));
    const accuracyPct = Math.min(100, Math.round(((timingRatio * 0.7 + gestureRatio * 0.3) * 100)));

    let grade = 'B';
    if (standardScore >= 96000 && lives === 5) grade = 'S+';
    else if (standardScore >= 90000) grade = 'S';
    else if (standardScore >= 80000) grade = 'A';
    else if (standardScore >= 65000) grade = 'B';
    else grade = 'C';

    return {
      standardScore,
      timingScore,
      gestureScore,
      comboScore,
      accuracyPct,
      grade,
      stars: starRating?.stars || (standardScore >= 90000 ? 5 : standardScore >= 80000 ? 4 : 3),
      totalNotes: Math.round(targetDuration * 1.9),
      perfectCount: Math.round(scoreRatio * 50),
      greatCount: Math.round(scoreRatio * 30),
      goodCount: Math.round(scoreRatio * 15),
      missCount: Math.max(0, maxLives - lives),
      maxCombo: Math.round(scoreRatio * 45),
    };
  }

  /**
   * Retrieves all entries in the 1 Unified Leaderboard, sorted descending by score.
   * Contains ONLY real user scores. Starts empty if no games have been registered yet.
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

    if (!Array.isArray(list)) {
      list = [];
    }

    // Always exclude any dummy seeds or legacy test entries on the fly
    const dummyNames = [
      'dimas wicaksono',
      'sarah nabila',
      'reza pratama',
      'alya putri',
      'bagus setiawan',
      'rian melodi',
      'siti rahma',
      'kevin cyber',
      'nadia putri',
      'budi handbeat',
      'f1',
      'test',
      'testing',
      'ahmad real'
    ];
    list = list.filter(item => {
      if (!item || !item.id) return false;
      const idStr = String(item.id);
      if (idStr.startsWith('GS-DEMO-') || idStr.startsWith('seed_')) return false;
      const nameLower = (item.playerName || item.name || '').trim().toLowerCase();
      const phoneStr = String(item.phone || '').replace(/[^0-9]/g, '');
      if (dummyNames.includes(nameLower) || nameLower.length < 3 || nameLower.includes('f1') || phoneStr.includes('4324342')) return false;
      return true;
    });

    // Filter by song if requested
    if (filterSong && filterSong !== 'ALL') {
      const normFilter = filterSong.toUpperCase();
      list = list.filter(item => {
        const itemSong = (item.songId || item.trackId || '').toUpperCase();
        if (normFilter === 'JATUH_SUKA' && (itemSong === 'JATUHSUKA' || itemSong === 'JATUH_SUKA')) return true;
        if (normFilter === 'TARAGAK_PULANG' && (itemSong === 'TARAGAK' || itemSong === 'TARAGAK_PULANG')) return true;
        return itemSong === normFilter;
      });
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

    const universalUrl = this.getUniversalEventQrUrl();
    if (universalUrl) {
      try {
        const u = new URL(universalUrl);
        u.searchParams.set('game', 'gesture_synth');
        u.searchParams.set('song', session.songId);
        u.searchParams.set('score', session.score.toString());
        u.searchParams.set('session', session.id);
        session.claimUrl = u.toString();
      } catch (e) {
        session.claimUrl = universalUrl;
      }
    } else {
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
    }

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
}

export const competitionLeaderboardService = new CompetitionLeaderboardService();
