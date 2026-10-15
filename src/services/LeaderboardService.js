// LeaderboardService.js - Management for Active Player & Event Leaderboard Scores

const STORAGE_KEY_PLAYER = 'gm_active_player';
const STORAGE_KEY_LEADERBOARD = 'gm_leaderboard_records';

const DEFAULT_SEEDS = [
  {
    id: 'seed_1',
    name: 'Rian Melodi',
    phone: '081234567890',
    songId: 'jatuhsuka',
    songTitle: 'JATUH SUKA',
    score: 18450,
    lives: 5,
    stars: 5,
    starTitle: 'SEMPURNA!',
    starIcons: '⭐⭐⭐⭐⭐',
    date: 'Hari ini, 10:15',
    timestamp: Date.now() - 3600000 * 3,
  },
  {
    id: 'seed_2',
    name: 'Siti Rahma',
    phone: '081398765432',
    songId: 'taragak',
    songTitle: 'TARAGAK PULANG',
    score: 16800,
    lives: 5,
    stars: 5,
    starTitle: 'SEMPURNA!',
    starIcons: '⭐⭐⭐⭐⭐',
    date: 'Hari ini, 11:20',
    timestamp: Date.now() - 3600000 * 2,
  },
  {
    id: 'seed_3',
    name: 'Kevin Cyber',
    phone: '082155443322',
    songId: 'jatuhsuka',
    songTitle: 'JATUH SUKA',
    score: 15200,
    lives: 4,
    stars: 4,
    starTitle: 'HEBAT!',
    starIcons: '⭐⭐⭐⭐',
    date: 'Hari ini, 11:45',
    timestamp: Date.now() - 3600000 * 1.5,
  },
  {
    id: 'seed_4',
    name: 'Nadia Putri',
    phone: '085712349876',
    songId: 'taragak',
    songTitle: 'TARAGAK PULANG',
    score: 14100,
    lives: 4,
    stars: 4,
    starTitle: 'HEBAT!',
    starIcons: '⭐⭐⭐⭐',
    date: 'Hari ini, 12:10',
    timestamp: Date.now() - 3600000 * 1,
  },
  {
    id: 'seed_5',
    name: 'Budi HandBeat',
    phone: '087811223344',
    songId: 'jatuhsuka',
    songTitle: 'JATUH SUKA',
    score: 12500,
    lives: 3,
    stars: 3,
    starTitle: 'BAGUS!',
    starIcons: '⭐⭐⭐',
    date: 'Hari ini, 12:35',
    timestamp: Date.now() - 1800000,
  },
];

export class LeaderboardService {
  constructor() {
    this.currentPlayer = this.loadPlayer();
    this.ensureInitialized();
  }

  loadPlayer() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PLAYER);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.name && parsed.phone) return parsed;
      }
    } catch (e) {
      console.warn('Gagal membaca data player dari storage:', e);
    }
    return null;
  }

  savePlayer(player) {
    this.currentPlayer = player;
    try {
      if (player) {
        localStorage.setItem(STORAGE_KEY_PLAYER, JSON.stringify(player));
      } else {
        localStorage.removeItem(STORAGE_KEY_PLAYER);
      }
    } catch (e) {}
  }

  getCurrentPlayer() {
    return this.currentPlayer;
  }

  hasCurrentPlayer() {
    return !!(this.currentPlayer && this.currentPlayer.name && this.currentPlayer.phone);
  }

  setPlayer(name, phone) {
    const trimmedName = (name || '').trim();
    const cleanPhone = (phone || '').replace(/[^0-9+]/g, '').trim();

    if (!trimmedName || trimmedName.length < 2) {
      throw new Error('Nama minimal harus 2 karakter.');
    }
    if (!cleanPhone || cleanPhone.length < 8) {
      throw new Error('Nomor telepon minimal harus 8 digit angka.');
    }

    const player = {
      name: trimmedName,
      phone: cleanPhone,
      registeredAt: Date.now(),
    };

    this.savePlayer(player);
    return player;
  }

  clearPlayer() {
    this.savePlayer(null);
  }

  ensureInitialized() {
    try {
      const existing = localStorage.getItem(STORAGE_KEY_LEADERBOARD);
      if (!existing) {
        localStorage.setItem(STORAGE_KEY_LEADERBOARD, JSON.stringify(DEFAULT_SEEDS));
      }
    } catch (e) {}
  }

  getRecords() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_LEADERBOARD);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [...DEFAULT_SEEDS];
  }

  saveRecords(records) {
    try {
      localStorage.setItem(STORAGE_KEY_LEADERBOARD, JSON.stringify(records));
    } catch (e) {}
  }

  /**
   * Mengambil leaderboard yang sudah disortir berdasarkan skor tertinggi
   * @param {'all'|'jatuhsuka'|'taragak'} filterSong
   * @returns {Array} List skor dengan nomor peringkat (rank)
   */
  getLeaderboard(filterSong = 'all') {
    let records = this.getRecords();

    if (filterSong && filterSong !== 'all') {
      records = records.filter(r => r.songId === filterSong);
    }

    // Sort descending by score, then timestamp newer
    records.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.timestamp || 0) - (a.timestamp || 0);
    });

    return records.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
  }

  /**
   * Menambahkan skor baru pemain ke dalam leaderboard
   */
  addScore({ name, phone, songId, songTitle, score, lives, starRating, duration }) {
    const records = this.getRecords();
    const safeScore = Math.max(0, Math.round(Number(score) || 0));

    const now = new Date();
    const dateFormatted = now.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

    const newEntry = {
      id: 'entry_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      name: (name || (this.currentPlayer ? this.currentPlayer.name : 'Pemain')).trim(),
      phone: (phone || (this.currentPlayer ? this.currentPlayer.phone : '-')).trim(),
      songId: songId || 'jatuhsuka',
      songTitle: songTitle || (songId === 'taragak' ? 'TARAGAK PULANG' : 'JATUH SUKA'),
      score: safeScore,
      lives: typeof lives === 'number' ? lives : 5,
      stars: starRating?.stars || 1,
      starTitle: starRating?.title || 'SURVIVE',
      starIcons: starRating?.starIcons || '⭐',
      duration: duration || 60,
      date: dateFormatted,
      timestamp: Date.now(),
    };

    records.push(newEntry);
    this.saveRecords(records);

    // Hitung peringkat entry baru ini di overall dan lagu terkait
    const allSorted = this.getLeaderboard('all');
    const songSorted = this.getLeaderboard(newEntry.songId);

    const overallRank = allSorted.findIndex(r => r.id === newEntry.id) + 1;
    const songRank = songSorted.findIndex(r => r.id === newEntry.id) + 1;

    return {
      entry: newEntry,
      overallRank,
      songRank,
      totalEntries: allSorted.length,
      isTop3: overallRank <= 3,
      isChampion: overallRank === 1,
    };
  }

  clearLeaderboard() {
    try {
      localStorage.removeItem(STORAGE_KEY_LEADERBOARD);
      this.ensureInitialized();
    } catch (e) {}
  }

  formatPhone(phone, mask = false) {
    if (!phone) return '-';
    const str = String(phone).replace(/\s+/g, '');
    if (mask && str.length >= 8) {
      const start = str.slice(0, 4);
      const end = str.slice(-3);
      return `${start}-****-${end}`;
    }
    if (str.length >= 10) {
      return `${str.slice(0, 4)}-${str.slice(4, 8)}-${str.slice(8)}`;
    }
    return str;
  }
}

export const leaderboardService = new LeaderboardService();
