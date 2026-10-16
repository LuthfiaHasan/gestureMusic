// JatuhSukaAudioMotionService.js - Real-time 10-Finger Motion & Audio Synchronization Engine
// Lagu: "Jatuh Suka" (.m4a)
// Features:
// 1. 5-Lives System (Nyawa ❤️❤️❤️❤️❤️ - Salah 5 kali = Lagu Hangus / Game Over)
// 2. Dynamic Target Sequence synchronized with the song "Jatuh Suka"
// 3. Multi-Hand 1-10 Finger Tracking (Landmarks across both hands)
// 4. Real-time aggregate fingertip velocity & smoothing (EMA)
// 5. Dual Modes: Play/Pause Biner & Playback Speed Dinamis (0.0x - 1.25x)
// 6. Score & Combo Tracker

export const SYNC_MODES = {
  PLAY_PAUSE: 'PLAY_PAUSE',           // Mode 1: Play/Pause Sederhana
  PLAYBACK_SPEED: 'PLAYBACK_SPEED',   // Mode 2: Playback Speed Dinamis (1-10 Jari)
};

export const FINGER_GESTURE_DEFS = {
  1: {
    fingerCount: 1,
    name: '1 JARI (TELUNJUK)',
    label: '1 JARI TELUNJUK',
    emoji: '☝️',
    tip: 'Ayunkan 1 jari telunjuk naik-turun santai!',
  },
  2: {
    fingerCount: 2,
    name: '2 JARI (PEACE)',
    label: '2 JARI PEACE',
    emoji: '✌️',
    tip: 'Refleks cepat! Tunjukkan 2 jari peace!',
  },
  3: {
    fingerCount: 3,
    name: '3 JARI (INDEX+MID+RING)',
    label: '3 JARI SWAG',
    emoji: '🤟',
    tip: 'Angkat 3 jari (telunjuk, tengah, manis)!',
  },
  4: {
    fingerCount: 4,
    name: '4 JARI (LIPAT JEMPOL)',
    label: '4 JARI TEGAK',
    emoji: '🖖',
    tip: 'Buka 4 jari tegak, jempol terlipat!',
  },
  5: {
    fingerCount: 5,
    name: '5 JARI (TELAPAK)',
    label: '5 JARI TELAPAK',
    emoji: '🖐️',
    tip: 'Buka 5 jari telapak tangan penuh!',
  },
  10: {
    fingerCount: 10,
    name: '10 JARI (DUA TANGAN)',
    label: '10 JARI DUA TANGAN',
    emoji: '🙌',
    tip: 'Angkat kedua tangan! Mainkan 10 jari!',
  },
};

export const JATUH_SUKA_LYRICS = [
  'Ku rasa ku sedang jatuh suka padamu...',
  'Saat tatap matamu pertama kali memandang...',
  'Jantung berdegup kencang tak karuan...',
  'Senyum manismu selalu terbayang di benakku...',
  'Mungkinkah ini yang dinamakan cinta sejati?...',
  'Kuingin selalu ada di dekatmu setiap waktu...',
  'Jangan pernah pergi dari sisiku lagi...',
  'Hati ini hanya memilih dirimu seorang...',
  'Beri aku kesempatan tuk membuktikannya padamu...',
  'Dua hati yang kini menyatu dalam irama...',
  'Bila ku tatap senyummu, hilang semua resahku...',
  'Tak mampu ku sembunyikan rasa suka ini...',
  'Kau buat duniaku lebih berwarna dan ceria...',
  'Jatuh suka padamu berkali-kali setiap hari...',
  'Katakanlah kau juga merasakan getaran ini...',
  'Ku genggam jemarimu, melangkah bersama selamanya...',
  'Ada rasa yang berbeda saat kau tersenyum manis...',
  'Setiap detik bersamamu terasa begitu indah...',
  'Apakah kau merasakan degup yang sama denganku?...',
  'Mata tak bisa bohong saat kita saling memandang...',
  'Izinkan ku jadi tempatmu bersandar kala lelah...',
  'Kau lagu terindah yang selalu ku dengar di hati...',
  'Sejak hari itu, hanya namamu yang selalu terukir...',
  'Biarkan rasa ini mengalir mengikuti irama kita...',
  'Tak ada yang lebih manis dari tawamu hari ini...',
  'Bersamamu, semua terasa begitu sempurna...',
  'Melodi cinta ini tercipta khusus hanya untukmu...',
  'Kuharap rasa ini kan bertahan abadi selamanya...',
  'Hangat dekapan angin mengingatkanku padamu...',
  'Detik jam berputar, rinduku padamu tak pudar...',
  'Bintang malam bersinar saksi janji kita berdua...',
  'Di setiap bait lagu, ada namamu yang terselip...',
  'Rona merah di pipimu buat hatiku berdebar...',
  'Tak perlu kata-kata, tatap matamu sudah cukup...',
  'Hadirmu melengkapi setiap kepingan hatiku...',
  'Dunia terasa sunyi saat kau tak ada di sini...',
  'Langkah kaki kita beriringan menuju masa depan...',
  'Sebuah rasa sederhana yang tumbuh luar biasa...',
  'Terima kasih telah hadir mewarnai hidupku...',
  'Jatuh cinta kepadamu adalah takdir terindahku...',
  'Ayunkan jemari cinta kita mengikuti nada ini...',
  'Cahaya senja temani rasa kagumku padamu...',
  'Tak pernah bosan memandang wajah ceriamu...',
  'Biarkan denting piano ini sampaikan isi hatiku...',
  'Setiap senyumanmu adalah anugerah terindah...',
  'Kita adalah melodi yang tercipta berpasangan...',
  'Dekap hangat pelukanmu tenangkan jiwaku...',
  'Hati ini berbisik lembut memanggil namamu...',
  'Melangkah berdua di bawah taburan bintang malam...',
  'Cinta ini tulus mengalir tanpa ada syarat...',
  'Selamanya ku ingin kau tetap ada di sisiku...',
  'Nada-nada ini berdendang hanya untuk dirimu...',
  'Genggam tanganku erat, jangan pernah lepaskan!'
];

function shuffleLyrics(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
export function createRandomizedSequence(totalDuration = 60, beatDuration = 0.517) {
  // Tetap pakai patokan 4 ketukan (1-4) irama lagu per langkah (~2.07 detik per pose)
  const stepDuration = Number((beatDuration * 4).toFixed(3));
  const possibleFingers = [1, 2, 3, 4, 5, 10];
  const stepsCount = Math.ceil(totalDuration / stepDuration);
  const sequence = [];
  let prevFinger = -1;

  // Acak murni seluruh lirik lagu pop romantis secara random selama 1 menit permainan!
  let lyricsPool = shuffleLyrics(JATUH_SUKA_LYRICS);
  let lyricIdx = 0;

  for (let i = 0; i < stepsCount; i++) {
    const timeStart = Number((i * stepDuration).toFixed(2));
    const timeEnd = Number((Math.min(totalDuration, (i + 1) * stepDuration)).toFixed(2));

    // Pilih jari acak yang berbeda dari gestur sebelumnya agar selalu berganti
    const candidates = possibleFingers.filter(f => f !== prevFinger);
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    prevFinger = chosen;

    const def = FINGER_GESTURE_DEFS[chosen];

    if (lyricIdx >= lyricsPool.length) {
      lyricsPool = shuffleLyrics(JATUH_SUKA_LYRICS);
      lyricIdx = 0;
    }
    const lyric = lyricsPool[lyricIdx++];

    sequence.push({
      timeStart,
      timeEnd,
      fingerCount: def.fingerCount,
      name: def.name,
      label: def.label,
      emoji: def.emoji,
      tip: def.tip,
      lyric,
    });
  }

  return sequence;
}

// Sequence default awal 60 Detik (1 Menit)
export const JATUH_SUKA_SEQUENCE = createRandomizedSequence(60, 0.517);

export class JatuhSukaAudioMotionService {
  constructor() {
    this.audioSrc = '/sounds/jatuh-suka.m4a';
    this.audio = null;
    this.audioCtx = null;
    this.sourceNode = null;
    this.gainNode = null;
    this.analyser = null;
    this.analyserData = null;

    // Durasi maksimal lagu: Tepat 60 Detik (1 Menit)!
    this.roundDuration = 60;
    this.targetMaxDuration = 60;
    this.songStartOffset = 0; // Tetap mulai lagu normal dari awal
    this.isGameWon = false;

    // Beat Rhythm System (Tempo ~116 BPM, ~0.517s per beat, patokan 4 ketukan)
    this.beatDuration = 0.517;
    this.lastBeatIndex = -1;
    this.beatCount4 = 1;
    this.beatProgress = 0;

    // Lirik lagu murni random acak selama 1 menit
    this.sequence = createRandomizedSequence(this.roundDuration, this.beatDuration);

    // Active mode: Default Smooth Studio Play/Pause (1.0x konstan tanpa patah-patah)
    this.mode = SYNC_MODES.PLAY_PAUSE;

    // Audio Playback State
    this.isLoaded = false;
    this.isPlaying = false;
    this.isAudioPaused = true;
    this.currentPlaybackRate = 1.0;
    this.targetPlaybackRate = 1.0;
    this.volume = 0.85;
    this.preservesPitch = true;

    // 5-LIVES SYSTEM (NYAWA)
    this.maxLives = 5;
    this.lives = 5;
    this.isGameOver = false;
    this.score = 0;
    this.combo = 0;

    // Mistake detection timer
    this.mistakeCooldownMs = 1500;
    this.lastMistakeTime = 0;
    this.consecutiveMismatchTime = 0;
    this.lastCheckTimestamp = performance.now();
    this.lastTargetSwitchTime = performance.now();

    // 10-Finger Motion Tracking State
    this.hasHand = false;
    this.isMoving = false;
    this.totalFingers = 0; // 0 to 10 fingers
    this.fingerStates = new Array(10).fill(false);
    this.currentTarget = this.sequence[0];

    // Coordinate & Motion Data
    this.centroidX = 0.5;
    this.centroidY = 0.5;
    this.prevFingerPoints = null;
    this.rawSpeed = 0;
    this.smoothedSpeed = 0;

    // Algorithmic Tuning Parameters (Mainin Jari Santai & Halus - Fast Response!)
    this.deadzoneThreshold = 0.0001;
    this.motionThreshold = 0.0006; // Sangat responsif untuk gerakan naik-turun jari santai
    this.smoothingAlpha = 0.5;
    this.speedSensitivity = 3.5;
    this.idleGracePeriodMs = 2500; // Jeda natural antar ketukan naik-turun tanpa musik terputus
    this.lastMotionTimestamp = 0;
    this.lastFrameTimestamp = 0;

    // Guidance Message
    this.guidanceMessage = 'AYUNKAN JARIMU NAIK-TURUN SESUAI KETUKAN LAGU!';

    // Callbacks for UI updates
    this.onTelemetryUpdate = null;
    this.onLifeLost = null;
    this.onGameOver = null;
    this.onVictory = null;

    this._initAudio();
  }

  getRoundElapsed() {
    if (!this.audio) return 0;
    return Math.max(0, Math.min(this.roundDuration, this.audio.currentTime - this.songStartOffset));
  }

  _initAudio() {
    if (typeof window === 'undefined') return;
    this.audio = new Audio(this.audioSrc);
    this.audio.preload = 'auto';
    this.audio.loop = false;
    this.audio.volume = this.volume;
    this.audio.playbackRate = 1.0;

    if ('preservesPitch' in this.audio) {
      this.audio.preservesPitch = this.preservesPitch;
    }

    this.audio.addEventListener('loadedmetadata', () => {
      this.isLoaded = true;
      this._emitTelemetry();
    });

    this.audio.addEventListener('play', () => {
      this.isAudioPaused = false;
      this.isPlaying = true;
      this._emitTelemetry();
    });

    this.audio.addEventListener('pause', () => {
      this.isAudioPaused = true;
      this.isPlaying = false;
      this._emitTelemetry();
    });

    this.audio.addEventListener('ended', () => {
      this.isAudioPaused = true;
      this.isPlaying = false;
      if (!this.isGameWon) {
        this.triggerVictory();
      } else {
        this._emitTelemetry();
      }
    });

    // Cek batas 1 Menit (60 detik) tantangan lagu secara presisi
    this.audio.addEventListener('timeupdate', () => {
      if (this.getRoundElapsed() >= this.roundDuration && !this.isGameWon && !this.isGameOver) {
        this.triggerVictory();
      }
    });
  }

  initWebAudioGraph() {
    if (this.audioCtx || !this.audio) return;
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyserData = new Uint8Array(this.analyser.frequencyBinCount);

      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.value = this.volume;

      this.sourceNode = this.audioCtx.createMediaElementSource(this.audio);
      this.sourceNode.connect(this.gainNode);
      this.gainNode.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);
    } catch (err) {
      console.warn('WebAudio init note:', err);
    }
  }

  unlockAudio() {
    if (this.audio) {
      this.audio.load();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => { });
    }
  }

  async resumeAudioContext() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      try {
        await this.audioCtx.resume();
      } catch (e) { }
    }
    if (this.audio && this.audio.paused && !this.isGameOver) {
      // Unblock user gesture
      this.audio.load();
    }
  }

  setMode(mode) {
    if (mode !== SYNC_MODES.PLAY_PAUSE && mode !== SYNC_MODES.PLAYBACK_SPEED) return;
    this.mode = mode;

    if (this.mode === SYNC_MODES.PLAY_PAUSE) {
      this.currentPlaybackRate = 1.0;
      this.targetPlaybackRate = 1.0;
      if (this.audio) this.audio.playbackRate = 1.0;
    }
    this._emitTelemetry();
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.audio) this.audio.volume = this.volume;
    if (this.gainNode) this.gainNode.gain.value = this.volume;
    this._emitTelemetry();
  }

  seek(seconds) {
    if (this.audio && isFinite(seconds) && !this.isGameOver) {
      this.audio.currentTime = Math.max(0, Math.min(this.audio.duration || 0, seconds));
      this._updateCurrentTarget();
      this._emitTelemetry();
    }
  }

  restart() {
    this.restartGame();
  }

  restartGame() {
    this.lives = this.maxLives;
    this.isGameOver = false;
    this.isGameWon = false;
    this.score = 0;
    this.combo = 0;
    this.lastMistakeTime = 0;
    this.consecutiveMismatchTime = 0;
    this.lastBeatIndex = -1;
    this.beatCount4 = 1;
    this.beatProgress = 0;

    // Lagu tetap mulai normal dari awal (00:00) dengan patokan 4 ketukan irama
    this.songStartOffset = 0;

    // Lirik lagu murni random acak selama 1 menit ronde permainan
    this.sequence = createRandomizedSequence(this.roundDuration, this.beatDuration);
    this.currentTarget = this.sequence[0];

    if (this.audio) {
      try { this.audio.currentTime = 0; } catch (e) { }
      this.audio.playbackRate = 1.0;
      this.audio.pause();
    }
    this.isMoving = false;
    this.hasHand = false;
    this.totalFingers = 0;
    this.currentPlaybackRate = 1.0;
    this._emitTelemetry();
  }

  getUpcomingTargetsQueue(count = 4) {
    const curTime = this.getRoundElapsed();
    const curIndex = this.sequence.findIndex(seq => curTime >= seq.timeStart && curTime < seq.timeEnd);
    const startIndex = curIndex !== -1 ? curIndex : 0;

    const queue = [];
    for (let i = 0; i < count; i++) {
      const idx = startIndex + i;
      if (idx < this.sequence.length) {
        const item = this.sequence[idx];
        const isCurrent = (i === 0);
        const secondsUntil = isCurrent ? 0 : Math.max(0, Math.ceil(item.timeStart - curTime));
        const secondsLeft = isCurrent ? Math.max(0, Math.ceil(item.timeEnd - curTime)) : Math.ceil(item.timeEnd - item.timeStart);
        queue.push({
          target: item,
          isCurrent,
          secondsUntil,
          secondsLeft,
          stepIndex: idx + 1,
        });
      }
    }
    return queue;
  }

  getNextTargetInfo() {
    const curTime = this.getRoundElapsed();
    const curIndex = this.sequence.findIndex(seq => curTime >= seq.timeStart && curTime < seq.timeEnd);
    if (curIndex !== -1 && curIndex < this.sequence.length - 1) {
      const next = this.sequence[curIndex + 1];
      const cur = this.sequence[curIndex];
      return {
        nextTarget: next,
        secondsLeft: Math.max(1, Math.ceil(cur.timeEnd - curTime)),
      };
    }
    return null;
  }

  _updateCurrentTarget() {
    const curTime = this.getRoundElapsed();
    const found = this.sequence.find(seq => curTime >= seq.timeStart && curTime < seq.timeEnd);
    const nextTarget = found || this.sequence[this.sequence.length - 1];
    if (this.currentTarget !== nextTarget) {
      this.currentTarget = nextTarget;
      this.lastTargetSwitchTime = performance.now();
      this.consecutiveMismatchTime = 0;
      // Mulai hitungan mismatch dari titik nol saat target berubah
      this.lastCheckTimestamp = performance.now();
    }
  }

  playTileHitSound(freq = 659.25) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = this.audioCtx || new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.32);
    } catch (e) { }
  }

  playLifeLostSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = this.audioCtx || new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(65, ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) { }
  }

  playGameOverSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = this.audioCtx || new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume();

      [220, 185, 146, 110].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.16);

        gain.gain.setValueAtTime(0.35, ctx.currentTime + idx * 0.16);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.16 + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.16);
        osc.stop(ctx.currentTime + idx * 0.16 + 0.45);
      });
    } catch (e) { }
  }

  getStarRating() {
    const curTime = (this.audio && this.audio.currentTime) || 0;
    const score = this.score;
    const lives = this.lives;
    const isWon = this.isGameWon || curTime >= this.targetMaxDuration;

    if (isWon) {
      if (lives === 5 && score >= 900) {
        return {
          stars: 5,
          starIcons: '⭐⭐⭐⭐⭐',
          title: 'PERFECT!',
          badge: '⭐⭐⭐⭐⭐ PERFECT!',
          description: 'Luar Biasa! Tanpa Kesalahan (5/5 Nyawa & Skor Maksimal)!',
          color: '#ffd700',
        };
      }
      if (lives >= 4 && score >= 700) {
        return {
          stars: 4,
          starIcons: '⭐⭐⭐⭐',
          title: 'EXCELLENT!',
          badge: '⭐⭐⭐⭐ EXCELLENT',
          description: 'Hebat! Refleks dan irama gerakan jari sangat presisi!',
          color: '#00f7ff',
        };
      }
      if (lives >= 3 && score >= 450) {
        return {
          stars: 3,
          starIcons: '⭐⭐⭐',
          title: 'GREAT!',
          badge: '⭐⭐⭐ GREAT',
          description: 'Bagus! Berhasil menuntaskan lagu hingga akhir!',
          color: '#00ff88',
        };
      }
      if (lives >= 2) {
        return {
          stars: 2,
          starIcons: '⭐⭐',
          title: 'GOOD!',
          badge: '⭐⭐ GOOD',
          description: 'Berhasil selamat! Tingkatkan ketelitian gestur jari!',
          color: '#a855f7',
        };
      }
      return {
        stars: 1,
        starIcons: '⭐',
        title: 'PASSED',
        badge: '⭐ PASSED',
        description: 'Lolos di detik terakhir, coba lagi untuk 5 Bintang PERFECT!',
        color: '#ff007f',
      };
    }

    // Live rating saat bermain:
    if (lives === 5 && score >= 400) {
      return { stars: 5, starIcons: '⭐⭐⭐⭐⭐', title: 'PERFECT', badge: '⭐⭐⭐⭐⭐', color: '#ffd700' };
    }
    if (lives >= 4 && score >= 250) {
      return { stars: 4, starIcons: '⭐⭐⭐⭐', title: 'EXCELLENT', badge: '⭐⭐⭐⭐', color: '#00f7ff' };
    }
    if (lives >= 3 && score >= 150) {
      return { stars: 3, starIcons: '⭐⭐⭐', title: 'GREAT', badge: '⭐⭐⭐', color: '#00ff88' };
    }
    if (lives >= 2) {
      return { stars: 2, starIcons: '⭐⭐', title: 'GOOD', badge: '⭐⭐', color: '#a855f7' };
    }
    return { stars: 1, starIcons: '⭐', title: 'SURVIVE', badge: '⭐', color: '#ff0055' };
  }

  deductLife(reason = 'Salah Gerakan!') {
    if (this.isGameOver || this.isGameWon) return;

    // Hanya proteksi saat awal detik 0 sebelum mulai
    if (!this.audio || (this.audio.currentTime === 0 && !this.isPlaying)) return;

    const now = performance.now();
    // Proteksi jeda 950ms antar pengurangan nyawa
    if (now - this.lastMistakeTime < 950) return;

    this.lives = Math.max(0, this.lives - 1);
    this.combo = 0;
    this.lastMistakeTime = now;
    this.consecutiveMismatchTime = 0;

    this.playLifeLostSound();

    if (this.onLifeLost) {
      this.onLifeLost(this.lives, reason);
    }

    if (this.lives <= 0) {
      this.triggerGameOver();
    } else {
      this._emitTelemetry();
    }
  }

  triggerGameOver() {
    this.isGameOver = true;
    if (this.audio) {
      this.audio.pause();
    }
    this.isMoving = false;
    this.guidanceMessage = '💀 LAGU HANGUS! NYAWA HABIS (SALAH 5 KALI)';

    this.playGameOverSound();

    const starRating = this.getStarRating();
    if (this.onGameOver) {
      this.onGameOver({
        score: this.score,
        duration: (this.audio && this.audio.currentTime) || 0,
        starRating,
      });
    }
    this._emitTelemetry();
  }

  playVictorySound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = this.audioCtx || new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume();

      [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.14);

        gain.gain.setValueAtTime(0.3, ctx.currentTime + idx * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.14 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.14);
        osc.stop(ctx.currentTime + idx * 0.14 + 0.4);
      });
    } catch (e) { }
  }

  triggerVictory() {
    if (this.isGameWon || this.isGameOver) return;
    this.isGameWon = true;
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = this.targetMaxDuration;
    }
    this.isMoving = false;
    this.guidanceMessage = '🎉 SELAMAT! TANTANGAN 60 DETIK (1 MENIT) BERHASIL DISELESAIKAN!';

    this.playVictorySound();

    const starRating = this.getStarRating();
    if (this.onVictory) {
      this.onVictory({
        score: this.score,
        duration: this.targetMaxDuration,
        lives: this.lives,
        starRating,
      });
    }
    this._emitTelemetry();
  }

  classifyHandFingers(landmarks) {
    if (!landmarks || landmarks.length < 21) {
      return { thumb: false, index: false, middle: false, ring: false, pinky: false, count: 0, longFingersCount: 0 };
    }

    const wrist = landmarks[0];

    // Helper presisi untuk 4 jari panjang (Index, Middle, Ring, Pinky)
    // Menghitung rasio jarak Euclidean dan vektor telapak agar tahan terhadap rotasi, kemiringan, dan sudut webcam
    const checkLongFinger = (tipIdx, dipIdx, pipIdx, mcpIdx) => {
      const tip = landmarks[tipIdx];
      const dip = landmarks[dipIdx];
      const pip = landmarks[pipIdx];
      const mcp = landmarks[mcpIdx];

      // Jarak 2D Euclidean
      const dTipWrist = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
      const dPipWrist = Math.hypot(pip.x - wrist.x, pip.y - wrist.y);
      const dTipMcp = Math.hypot(tip.x - mcp.x, tip.y - mcp.y);
      const dPipMcp = Math.hypot(pip.x - mcp.x, pip.y - mcp.y);

      // Vektor orientasi telapak tangan (wrist -> MCP) dan vektor jari (MCP -> Tip)
      const palmX = mcp.x - wrist.x;
      const palmY = mcp.y - wrist.y;
      const fingerX = tip.x - mcp.x;
      const fingerY = tip.y - mcp.y;
      const dotAlongPalm = (fingerX * palmX) + (fingerY * palmY);

      // Cek apakah tangan dalam orientasi tegak di depan kamera (wrist berada di bawah knuckle)
      const isUpright = wrist.y > mcp.y - 0.05;

      // 1. Kondisi pasti terlipat (Curled into palm):
      // Jika ujung jari lebih dekat ke wrist daripada buku jari PIP
      if (dTipWrist < dPipWrist * 0.94) return false;
      // Jika ujung jari menempel dekat ke pangkal MCP
      if (dTipMcp < dPipMcp * 0.82) return false;
      // Jika orientasi tegak dan ujung jari berada lebih rendah dari PIP
      if (isUpright && (tip.y > pip.y + 0.02) && (dTipMcp < dPipMcp * 1.05)) return false;

      // 2. Kondisi terbuka (Extended):
      const extendedByWrist = (dTipWrist > dPipWrist * 1.04);
      const extendedByMcp = (dTipMcp > dPipMcp * 1.08);
      const pointingAway = dotAlongPalm > 0;
      const uprightTipAbove = isUpright ? (tip.y < pip.y + 0.015) : true;

      return (extendedByWrist && extendedByMcp && pointingAway) || (uprightTipAbove && extendedByWrist);
    };

    const isIndex = checkLongFinger(8, 7, 6, 5);
    const isMiddle = checkLongFinger(12, 11, 10, 9);
    const isRing = checkLongFinger(16, 15, 14, 13);
    const isPinky = checkLongFinger(20, 19, 18, 17);

    // Cek Jempol (Thumb)
    const thumbTip = landmarks[4];
    const thumbIp = landmarks[3];
    const thumbMcp = landmarks[2];
    const indexMcp = landmarks[5];
    const pinkyMcp = landmarks[17];

    const dThumbIndexMcp = Math.hypot(thumbTip.x - indexMcp.x, thumbTip.y - indexMcp.y);
    const dThumbIpIndex = Math.hypot(thumbIp.x - indexMcp.x, thumbIp.y - indexMcp.y);
    const dThumbPinkyMcp = Math.hypot(thumbTip.x - pinkyMcp.x, thumbTip.y - pinkyMcp.y);
    const dMcpPinkyMcp = Math.hypot(thumbMcp.x - pinkyMcp.x, thumbMcp.y - pinkyMcp.y);
    const dThumbWrist = Math.hypot(thumbTip.x - wrist.x, thumbTip.y - wrist.y);
    const dMcpWrist = Math.hypot(thumbMcp.x - wrist.x, thumbMcp.y - wrist.y);

    // Jempol dianggap terbuka jika meregang keluar menjauhi pangkal telunjuk dan melampaui MCP jempol
    const isThumb = (dThumbIndexMcp > 0.085) &&
      (dThumbIndexMcp > dThumbIpIndex * 1.1) &&
      (dThumbPinkyMcp > dMcpPinkyMcp * 1.1) &&
      (dThumbWrist > dMcpWrist * 1.15);

    const longFingersCount = (isIndex ? 1 : 0) + (isMiddle ? 1 : 0) + (isRing ? 1 : 0) + (isPinky ? 1 : 0);
    const count = (isThumb ? 1 : 0) + longFingersCount;

    return {
      thumb: isThumb,
      index: isIndex,
      middle: isMiddle,
      ring: isRing,
      pinky: isPinky,
      longFingersCount,
      count,
    };
  }

  matchTargetWithHand(h, targetCount) {
    if (!h) return false;

    switch (targetCount) {
      case 1:
        // 1 JARI (TELUNJUK ☝️):
        // Telunjuk harus tegak, jari tengah dan manis terlipat
        // Posisi jempol bebas (bisa nahan jari atau istirahat di samping)
        if (h.index && !h.middle && !h.ring) return true;
        if (h.longFingersCount === 1 && h.index) return true;
        if (h.count === 1) return true;
        return false;

      case 2:
        // 2 JARI (PEACE ✌️):
        // Telunjuk & tengah tegak, jari manis & kelingking terlipat
        if (h.index && h.middle && !h.ring && !h.pinky) return true;
        if (h.longFingersCount === 2 && (h.index || h.middle)) return true;
        if (h.count === 2 && (h.index || h.middle)) return true;
        if (h.index && h.middle && !h.ring) return true;
        return false;

      case 3:
        // 3 JARI (🤟 / '3'):
        // 1. Telunjuk + tengah + manis tegak, kelingking terlipat
        if (h.index && h.middle && h.ring && !h.pinky) return true;
        // 2. Jempol + telunjuk + tengah tegak
        if (h.thumb && h.index && h.middle && !h.pinky) return true;
        // 3. Tepat 3 jari panjang terbuka
        if (h.longFingersCount === 3) return true;
        // 4. Total count = 3
        if (h.count === 3) return true;
        return false;

      case 4:
        // 4 JARI (🖖 / '4'):
        // Ke-4 jari panjang tegak (telunjuk, tengah, manis, kelingking)
        if (h.index && h.middle && h.ring && h.pinky) return true;
        if (h.longFingersCount === 4) return true;
        if (h.count === 4) return true;
        return false;

      case 5:
        // 5 JARI (TELAPAK 🖐️):
        // Telapak terbuka penuh: 4 jari panjang tegak ATAU count >= 4
        if (h.index && h.middle && h.ring && h.pinky) return true;
        if (h.longFingersCount === 4) return true;
        if (h.count >= 4) return true;
        return false;

      default:
        return false;
    }
  }

  /**
   * CORE ALGORITHM: Real-Time 10-Finger Motion & Mistake Evaluation
   */
  updateMotion(landmarksList, handednessList = [], timestamp = performance.now()) {
    if (!this.audio || this.isGameOver) return this.getTelemetry();

    this._updateCurrentTarget();

    // 1. If no hands detected
    if (!landmarksList || landmarksList.length === 0) {
      this._handleNoHand(timestamp);
      return this.getTelemetry();
    }

    this.hasHand = true;

    // 2. Identify open fingers across up to 2 hands (1-10 Jari) with accurate morphology
    const currentFingerPoints = [];
    const newFingerStates = new Array(10).fill(false);

    const handAnalyses = landmarksList.slice(0, 2).map((lm, handIdx) => {
      const analysis = this.classifyHandFingers(lm);
      const offsetIndex = handIdx === 0 ? 0 : 5;
      newFingerStates[offsetIndex + 0] = analysis.thumb;
      newFingerStates[offsetIndex + 1] = analysis.index;
      newFingerStates[offsetIndex + 2] = analysis.middle;
      newFingerStates[offsetIndex + 3] = analysis.ring;
      newFingerStates[offsetIndex + 4] = analysis.pinky;

      // Daftarkan landmark stabil permanen per tangan agar perhitungan kecepatan gerak (naik-turun)
      // selalu mulus dan tidak terputus saat pemain berganti gestur jari
      currentFingerPoints.push({ id: `h${handIdx}_wrist`, x: lm[0].x, y: lm[0].y });
      currentFingerPoints.push({ id: `h${handIdx}_mcp9`, x: lm[9].x, y: lm[9].y });
      currentFingerPoints.push({ id: `h${handIdx}_mcp5`, x: lm[5].x, y: lm[5].y });
      currentFingerPoints.push({ id: `h${handIdx}_mcp17`, x: lm[17].x, y: lm[17].y });
      currentFingerPoints.push({ id: `h${handIdx}_tip8`, x: lm[8].x, y: lm[8].y });
      currentFingerPoints.push({ id: `h${handIdx}_tip12`, x: lm[12].x, y: lm[12].y });

      return analysis;
    });

    const hand0 = handAnalyses[0];
    const hand1 = handAnalyses[1] || null;

    const targetCount = this.currentTarget.fingerCount;
    let isTargetMatch = false;
    let computedTotalFingers = 0;

    if (targetCount === 10) {
      // 10 JARI (DUA TANGAN 🙌): Wajib kedua tangan terangkat
      const bothHandsUp = landmarksList.length >= 2;
      const combinedFingers = (hand0 ? hand0.count : 0) + (hand1 ? hand1.count : 0);
      if (bothHandsUp && combinedFingers >= 6) {
        isTargetMatch = true;
        computedTotalFingers = 10;
      } else {
        computedTotalFingers = hand0 ? hand0.count : 0;
        this.guidanceMessage = '🙌 ANGKAT KEDUA TANGAN UNTUK 10 JARI!';
      }
    } else {
      // 1, 2, 3, 4, 5 JARI (SATU TANGAN): TIDAK BISA 2 TANGAN, HANYA 1 TANGAN SAJA!
      if (landmarksList.length > 1) {
        isTargetMatch = false;
        computedTotalFingers = (hand0 ? hand0.count : 0) + (hand1 ? hand1.count : 0);
        this.guidanceMessage = `⚠️ GUNAKAN 1 TANGAN SAJA! (Target: ${targetCount} Jari)`;
      } else {
        const match0 = this.matchTargetWithHand(hand0, targetCount);
        if (match0) {
          isTargetMatch = true;
          computedTotalFingers = targetCount;
        } else {
          computedTotalFingers = hand0 ? hand0.count : 0;
        }
      }
    }

    this.totalFingers = Math.min(10, Math.max(0, computedTotalFingers));
    this.fingerStates = newFingerStates;
    this.isTargetMatch = isTargetMatch;

    // 3. Centroid
    let sumX = 0;
    let sumY = 0;
    currentFingerPoints.forEach(pt => {
      sumX += pt.x;
      sumY += pt.y;
    });
    this.centroidX = sumX / currentFingerPoints.length;
    this.centroidY = sumY / currentFingerPoints.length;

    // 4. Aggregate Finger Speed (Sangat responsif untuk gerakan jari santai & perlahan)
    if (this.prevFingerPoints && this.lastFrameTimestamp > 0) {
      const dt = Math.max(0.012, (timestamp - this.lastFrameTimestamp) / 1000);
      let totalDisplacement = 0;
      let maxDisplacement = 0;
      let matchedCount = 0;

      currentFingerPoints.forEach(curPt => {
        const prevPt = this.prevFingerPoints.get(curPt.id);
        if (prevPt) {
          const dx = Math.abs(curPt.x - prevPt.x);
          const dy = Math.abs(curPt.y - prevPt.y);
          // Gerakan naik-turun vertikal (dy) diberi bobot responsif
          const d = Math.hypot(dx, dy * 1.45);
          totalDisplacement += d;
          if (d > maxDisplacement) maxDisplacement = d;
          matchedCount++;
        }
      });

      const avgDisplacement = matchedCount > 0 ? (totalDisplacement / matchedCount) : 0;
      // Kombinasi avg dan max displacement agar ayunan santai 1 jari langsung terdeteksi
      const effectiveDisplacement = Math.max(avgDisplacement, maxDisplacement * 0.85);
      const effectiveDist = effectiveDisplacement < this.deadzoneThreshold ? 0 : effectiveDisplacement;

      this.rawSpeed = effectiveDist / dt;
      this.smoothedSpeed = (this.smoothedSpeed * (1 - this.smoothingAlpha)) + (this.rawSpeed * this.smoothingAlpha);
    } else {
      this.rawSpeed = 0;
      this.smoothedSpeed = 0;
    }

    const nextMap = new Map();
    currentFingerPoints.forEach(pt => nextMap.set(pt.id, { x: pt.x, y: pt.y }));
    this.prevFingerPoints = nextMap;
    this.lastFrameTimestamp = timestamp;

    // 5. Evaluate Rhythmic Beat (Naik-Turun sesuai ketukan lagu Jatuh Suka)
    this._evaluateBeatRhythm(timestamp);

    // 6. Execute Audio Effect Synchronization (Smooth Play/Pause tanpa patah-patah)
    this._processPlayPauseApproach(timestamp);

    this._emitTelemetry();
    return this.getTelemetry();
  }

  checkGestureMatch(targetCount) {
    if (!this.hasHand) return false;
    const count = this.totalFingers;
    if (targetCount === 1) {
      return count === 1 || (this.fingerStates[1] && !this.fingerStates[2] && !this.fingerStates[3] && !this.fingerStates[4]);
    }
    if (targetCount === 2) {
      return count === 2 || (this.fingerStates[1] && this.fingerStates[2] && !this.fingerStates[3] && !this.fingerStates[4]);
    }
    if (targetCount === 5) {
      return count >= 4 && count <= 5;
    }
    if (targetCount === 10) {
      return count >= 6;
    }
    return count === targetCount;
  }

  _evaluateBeatRhythm(timestamp) {
    if (!this.audio || this.isGameOver || this.isGameWon) return;

    if (this.getRoundElapsed() >= this.roundDuration) {
      this.triggerVictory();
      return;
    }

    const curTime = this.getRoundElapsed();
    const isMoving = this.smoothedSpeed > this.motionThreshold;
    const isTargetMatch = this.isTargetMatch;

    // Calculate tempo beat metrics (~116 BPM, ~0.517s per beat)
    const beatIndex = Math.floor(curTime / this.beatDuration);
    this.beatCount4 = (beatIndex % 4) + 1;
    this.beatProgress = (curTime % this.beatDuration) / this.beatDuration;

    // Langsung mulai saat jari diangkat & cocok!
    if (this.audio.paused && this.hasHand && isTargetMatch && !this.isGameOver && !this.isGameWon) {
      this.audio.playbackRate = 1.0;
      this.audio.play().catch(() => { });
    }

    if (isTargetMatch) {
      // GESTUR SUDAH BENAR! Nyawa TIDAK PERNAH berkurang saat gestur sudah cocok!
      this.consecutiveMismatchTime = 0;

      if (isMoving) {
        // On new beat change while user is rhythmically moving
        if (beatIndex !== this.lastBeatIndex && this.isPlaying) {
          this.lastBeatIndex = beatIndex;
          this.score += 25;
          this.combo += 1;
        }
        this.guidanceMessage = `🟢 TEPAT KETUKAN ${this.beatCount4}! AYUNAN ${this.currentTarget.name} COCOK!`;
      } else {
        this.guidanceMessage = `✨ GESTUR TEPAT (${this.currentTarget.emoji})! AYUNKAN JARIMU IKUTI IRAMA!`;
      }
    } else {
      // HANYA JIKA GESTUR SALAH:
      const dt = Math.max(0, timestamp - this.lastCheckTimestamp);
      this.consecutiveMismatchTime += dt;
      this.guidanceMessage = `⚠️ SALAH GESTUR! HARUS: ${this.currentTarget.label} (${this.currentTarget.emoji})`;

      // Toleransi salah gestur 850ms sebelum nyawa berkurang (Disiplin: salah gestur = potong nyawa!)
      if (this.consecutiveMismatchTime >= 850) {
        this.consecutiveMismatchTime = 0;
        this.deductLife(`SALAH GESTUR! (Wajib ${this.currentTarget.fingerCount} Jari)`);
      }
    }
    this.lastCheckTimestamp = timestamp;
  }

  _processPlayPauseApproach(timestamp) {
    if (this.isGameOver || this.isGameWon) return;

    // Cek batas 1 Menit (60 detik)
    if (this.getRoundElapsed() >= this.roundDuration) {
      this.triggerVictory();
      return;
    }

    const isTargetMatch = this.isTargetMatch;

    // Saat jari diangkat dan cocok, LAGU LANGSUNG BERPUTAR!
    if (this.hasHand && isTargetMatch) {
      this.isMoving = true;
      this.lastMotionTimestamp = timestamp;

      if (this.audio && this.audio.paused && !this.isGameOver && !this.isGameWon) {
        this.audio.playbackRate = 1.0;
        this.audio.play().catch((e) => console.warn('Play error:', e));
      }
    } else {
      const elapsed = timestamp - this.lastMotionTimestamp;
      const grace = isTargetMatch ? this.idleGracePeriodMs : 300;
      if (elapsed > grace) {
        this.isMoving = false;
        if (this.audio && !this.audio.paused) {
          this.audio.pause();
        }
      }
    }
  }

  _processPlaybackSpeedApproach(timestamp) {
    this._processPlayPauseApproach(timestamp);
  }

  _handleNoHand(timestamp) {
    if (this.isGameOver || this.isGameWon) return;

    if (this.getRoundElapsed() >= this.roundDuration) {
      this.triggerVictory();
      return;
    }

    this.hasHand = false;
    this.totalFingers = 0;
    this.fingerStates.fill(false);
    this.prevFingerPoints = null;
    this.rawSpeed = 0;
    this.smoothedSpeed = 0;
    this.guidanceMessage = `👋 PETUNJUK: TUNJUKKAN ${this.currentTarget.label} (${this.currentTarget.emoji})`;

    // Reset mismatch time agar kamera tidak sengaja menghanguskan nyawa saat jitter/delay
    this.consecutiveMismatchTime = 0;
    this.lastCheckTimestamp = timestamp;

    const elapsed = timestamp - this.lastMotionTimestamp;
    if (elapsed > 450) {
      this.isMoving = false;
      if (this.audio && !this.audio.paused) {
        this.audio.pause();
      }
    }

    this._emitTelemetry();
  }

  drawAudioWaveform(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    if (this.analyser && this.analyserData) {
      this.analyser.getByteFrequencyData(this.analyserData);
      const bars = 28;
      const bw = (w / bars) - 3;

      for (let i = 0; i < bars; i++) {
        const val = this.analyserData[i * 2] || 0;
        const bh = (val / 255) * h * 0.9;
        const x = i * (bw + 3);
        const y = h - bh;

        ctx.fillStyle = this.isMoving ? '#00f7ff' : 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(x, y, bw, bh);
      }
    } else {
      const isAudActive = !this.isAudioPaused && this.isPlaying;
      const bars = 24;
      const bw = (w / bars) - 3;
      const now = performance.now() * 0.006;

      for (let i = 0; i < bars; i++) {
        let mag = 0.15;
        if (isAudActive) {
          mag = 0.25 + 0.65 * Math.abs(Math.sin(now + i * 0.4) * Math.cos(now * 0.9 + i * 0.3));
        }
        const bh = Math.max(4, mag * h * 0.85);
        const x = i * (bw + 3);
        const y = h - bh;

        ctx.fillStyle = isAudActive ? '#00f7ff' : 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(x, y, bw, bh);
      }
    }
  }

  getTelemetry() {
    const curRoundTime = this.getRoundElapsed();
    const dur = this.roundDuration; // 60 Detik (1 Menit)
    const pct = Math.min(100, Math.max(0, (curRoundTime / dur) * 100));

    const isTransitionGrace = (performance.now() - this.lastTargetSwitchTime) < 1600;

    return {
      mode: this.mode,
      isLoaded: this.isLoaded,
      isPlaying: !this.isAudioPaused && this.isPlaying,
      isMoving: this.isMoving,
      hasHand: this.hasHand,
      totalFingers: this.totalFingers,
      fingerStates: this.fingerStates,
      currentTarget: this.currentTarget,
      isTargetMatch: !!this.isTargetMatch,
      isTransitionGrace,
      guidanceMessage: this.guidanceMessage,
      currentPlaybackRate: 1.0,
      targetPlaybackRate: 1.0,
      currentTime: curRoundTime,
      duration: dur,
      progressPct: pct,
      songStartOffset: this.songStartOffset,
      currentSectionName: this.currentSectionName,
      volume: this.volume,
      lives: this.lives,
      maxLives: this.maxLives,
      score: this.score,
      combo: this.combo,
      isGameOver: this.isGameOver,
      isGameWon: this.isGameWon,
      nextTargetInfo: this.getNextTargetInfo(),
      upcomingQueue: this.getUpcomingTargetsQueue(4),
      beatCount4: this.beatCount4,
      beatProgress: this.beatProgress,
      starRating: this.getStarRating(),
    };
  }

  _emitTelemetry() {
    if (this.onTelemetryUpdate) {
      this.onTelemetryUpdate(this.getTelemetry());
    }
  }
}

export const jatuhSukaSyncService = new JatuhSukaAudioMotionService();
