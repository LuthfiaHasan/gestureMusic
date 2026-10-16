// TaragakPulangSyncService.js - Real-time 10-Finger Motion & Audio Synchronization Engine
// Lagu: "Taragak Pulang" (.m4a) - Minang Classic
// Features:
// 1. 5-Lives System (Nyawa ❤️❤️❤️❤️❤️ - Salah 5 kali = Lagu Hangus / Game Over)
// 2. Dynamic Target Sequence synchronized with the Minang song "Taragak Pulang"
// 3. Multi-Hand 1-10 Finger Tracking (Landmarks across both hands)
// 4. Real-time aggregate fingertip velocity & smoothing (EMA)
// 5. Dual Modes: Play/Pause Biner & Playback Speed Dinamis (0.0x - 1.25x)
// 6. Score, Combo Tracker & Star Rating

export const SYNC_MODES = {
  PLAY_PAUSE: 'PLAY_PAUSE',
  PLAYBACK_SPEED: 'PLAYBACK_SPEED',
};

export const FINGER_GESTURE_DEFS = {
  1: {
    fingerCount: 1,
    name: '1 JARI (TELUNJUK)',
    label: '1 JARI TELUNJUK',
    emoji: '☝️',
    tip: 'Ayunkan 1 jari telunjuk santai ikuti dendang Minang!',
  },
  2: {
    fingerCount: 2,
    name: '2 JARI (PEACE)',
    label: '2 JARI PEACE',
    emoji: '✌️',
    tip: 'Tunjukkan 2 jari peace mengikuti ketukan irama!',
  },
  3: {
    fingerCount: 3,
    name: '3 JARI (SWAG)',
    label: '3 JARI SWAG',
    emoji: '🤟',
    tip: 'Angkat 3 jari (telunjuk, tengah, manis)!',
  },
  4: {
    fingerCount: 4,
    name: '4 JARI (TEGAK)',
    label: '4 JARI TEGAK',
    emoji: '🖖',
    tip: 'Buka 4 jari tegak, jempol terlipat!',
  },
  5: {
    fingerCount: 5,
    name: '5 JARI (TELAPAK)',
    label: '5 JARI TELAPAK',
    emoji: '🖐️',
    tip: 'Buka 5 jari telapak penuh menghadap kamera!',
  },
  10: {
    fingerCount: 10,
    name: '10 JARI (DUA TANGAN)',
    label: '10 JARI DUA TANGAN',
    emoji: '🙌',
    tip: 'Angkat kedua tangan! Mainkan 10 jari basamo-samo!',
  },
};

export const MINANG_LYRICS = [
  'Alah batahun rantau manjadi labuahan hiduik...',
  'Tabayang kampuang tampek bamain maso dulunyo...',
  'Rindu manahun manyeso diri di parantauan...',
  'Siang jo malam samakin laruik marusuah hati...',
  'Mandayo badan pulang ka kampuang nan denai cinto...',
  'Oh mandeh kanduang, usah risaukan denai di siko...',
  'Oi dunsanak marilah kito pulang basamo-samo...',
  'Denai pulang manjalang kampuang halaman cinto...',
  'Taragak mandeh, taragak ranah Minang nan tacinto...',
  'Basamo kito babaliak pulang ka tanah tapian...',
  'Takana kasiah mandeh mananti di pintu rumah gadang...',
  'Gunuang Singgalang jo Marapi tagak manjago ranah...',
  'Bansaik di rantau urang, kok pulang lai ka sanang...',
  'Aie mato jatuah manitiak takana pasan mandeh...',
  'Laruik sanjo di rantau urang, rindu kampuang samakin jadi...',
  'Bialah jauah di mato, mandeh tatap di dalam doa...',
  'Baputa roda padati baitu pulo parasaian diri...',
  'Uda jo adiak mananti pulang di halaman surau...',
  'Dulang ameh bakeh siriah, denai pulang manjalang...',
  'Ranah Minang nan den cinto, tumpah darah nan tanamo...',
  'Pulanglah adiak pulanglah kito ka kampuang halaman...',
  'Hati den taragak pulang, rindu bundo takah rindu...',
  'Kok lai untuang tabali kain saruang ka bundo...',
  'Rantau marantau biaso, kampuang tacinto tak tabaia...',
  'Dakek lautan jauah di darik, kasiah mandeh nomor satu...',
  'Langkah bajalan manuju kampuang nan alah lamo...',
  'Tabik taragak dalam dado, nak basuo jo urang tuo...',
  'Pasan mandeh jan lupo sumbayang di nagari urang...',
  'Basuo kawan saikua di lapau kito maota...',
  'Taragak randang jo dendeng balado buatan mandeh...',
  'Pulang basamo rami-rami manjapuik kasiah sayang...',
  'Singgah sabanta di Lembah Anai mancaliak aia tajun...',
  'Bukittinggi kota Jam Gadang, tampek kenangan basamo kawan...',
  'Ngarai Sianok nan maimbau, hati taragak nak pulang basamo...',
  'Danau Maninjau nan tenang, marantau jauah takana kampuang...',
  'Kelok Sambilan megah mambantang, manuju ranah Minang tacinto...',
  'Tabik matohari di Ranah Minang, baitu tarang kasih sayang mandeh...',
  'Kok malang badan di rantau, doa mandeh pananang jiwa...',
  'Biduak lalu kiambang batauik, dunsanak tatap basaudara...',
  'Kain songket Pandai Sikek, dibaok pulang ka rumah gadang...',
  'Salangik sabumi jo urang tuo, tiado bandiang kasiah bundo...',
  'Marantau bujang mancari asa, pulang mambaok carito sanang...',
  'Aroma gulai kaniang di tungku, mandeh mananti di anjuang...',
  'Riuh randai di tangah malam, dendang Minang mangguncang jiwa...',
  'Surau tuo di ujuang nagari, tampek mangaji maso dulunyo...',
  'Kulebuik rindu dalam pantun, nak sampai pasan ka Ranah Bundo...',
  'Angin marantau mambao pasan, denai lai ka pulang sabanta lai...',
  'Kawasan Mandeh di pasisia, cinto mandeh sapanjang maso...',
  'Payakumbuh batiah jo galamai, taragak manikmati basamo kaluarga...',
  'Danga dendang saluang malam, maratok rindu di parantauan...',
  'Rantau jauah tak jadi panghalang, hati tatap taragak pulang...',
  'Puncak Lawang manatap awan, rindu kampuang indak tatimbang...',
  'Maniti jambatan ka surau tuo, taragak mandanga pasan abak...',
  'Kato mandeh nan panuah tuah, panuntun langkah di rantau urang...',
  'Dendang talempong pacik basamo, maimbau anak rantau pulang...',
  'Bungo siriah di carano adaik, basamo kito manjago marwah...',
  'Basaba mandeh di kampuang, denai manjalang mambaok kasanangan...',
  'Taratak tuo panuah kenangan, di sinan denai dibadangkan...',
  'Rindu basuo kawan kasadonyo, minum kopi maota di lapau...',
  'Samanjak langkah denai jatuahkan, tiado sahari tanpo takana mandeh...',
  'Hujan rintek di tapi Danau Singkarak, taragak ranah tacinto...',
  'Angkek tangan basamo-samo, kito dendangkan Taragak Pulang!'
];

function shuffleLyrics(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function createTaragakSequence(totalDuration = 60, beatDuration = 0.545) {
  // Tetap pakai patokan 4 ketukan (1-4) irama Minang per langkah (~2.18 detik)
  const stepDuration = Number((beatDuration * 4).toFixed(3));
  const possibleFingers = [1, 2, 3, 4, 5, 10];
  const stepsCount = Math.ceil(totalDuration / stepDuration);
  const sequence = [];
  let prevFinger = -1;

  // Acak murni seluruh lirik lagu secara random sejak awal hingga 1 menit permainan!
  let lyricsPool = shuffleLyrics(MINANG_LYRICS);
  let lyricIdx = 0;

  for (let i = 0; i < stepsCount; i++) {
    const timeStart = Number((i * stepDuration).toFixed(2));
    const timeEnd = Number((Math.min(totalDuration, (i + 1) * stepDuration)).toFixed(2));

    // Pose selalu diacak bervariasi (1, 2, 3, 4, 5, 10 Jari) tanpa mengulang gestur yang sama berturut-turut!
    const candidates = possibleFingers.filter(f => f !== prevFinger);
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    prevFinger = chosen;

    const def = FINGER_GESTURE_DEFS[chosen];

    // Ambil lirik secara random acak dari pool lirik
    if (lyricIdx >= lyricsPool.length) {
      lyricsPool = shuffleLyrics(MINANG_LYRICS);
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

export const TARAGAK_PULANG_SEQUENCE = createTaragakSequence(60, 0.545);

export class TaragakPulangSyncService {
  constructor() {
    this.audioSrc = '/sounds/taragak-pulang.m4a';
    this.audioFallbackSrc = '/TaragakPulang.m4a';
    this.audio = null;
    this.audioCtx = null;
    this.sourceNode = null;
    this.gainNode = null;
    this.analyser = null;
    this.analyserData = null;

    // Durasi maksimal lagu: 60 Detik (1 Menit)
    this.roundDuration = 60;
    this.targetMaxDuration = 60;
    this.songStartOffset = 0; // Tetap mulai lagu normal dari awal
    this.isGameWon = false;

    // Minang Tempo (~110 BPM, ~0.545s per beat, patokan 4 ketukan)
    this.beatDuration = 0.545;
    this.lastBeatIndex = -1;
    this.beatCount4 = 1;
    this.beatProgress = 0;

    // Lirik lagu murni random acak selama 1 menit
    this.sequence = createTaragakSequence(this.roundDuration, this.beatDuration);

    this.mode = SYNC_MODES.PLAY_PAUSE;

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

    this.mistakeCooldownMs = 1500;
    this.lastMistakeTime = 0;
    this.consecutiveMismatchTime = 0;
    this.lastCheckTimestamp = performance.now();
    this.lastTargetSwitchTime = performance.now();

    this.hasHand = false;
    this.isMoving = false;
    this.totalFingers = 0;
    this.fingerStates = new Array(10).fill(false);
    this.currentTarget = this.sequence[0];

    this.centroidX = 0.5;
    this.centroidY = 0.5;
    this.prevFingerPoints = null;
    this.rawSpeed = 0;
    this.smoothedSpeed = 0;

    this.deadzoneThreshold = 0.0001;
    this.motionThreshold = 0.0006;
    this.smoothingAlpha = 0.5;
    this.speedSensitivity = 3.5;
    this.idleGracePeriodMs = 2500;
    this.lastMotionTimestamp = 0;
    this.lastFrameTimestamp = 0;

    this.guidanceMessage = 'AYUNKAN JARIMU NAIK-TURUN MENGIKUTI IRAMA MINANG TARAGAK PULANG!';

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

    this.audio.onerror = () => {
      console.warn('TaragakPulang: Primary audio failed, loading fallback:', this.audioFallbackSrc);
      if (this.audio.src !== window.location.origin + this.audioFallbackSrc) {
        this.audio.src = this.audioFallbackSrc;
        this.audio.load();
      }
    };

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
      this.audioCtx.resume().catch(() => {});
    }
  }

  async resumeAudioContext() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      try {
        await this.audioCtx.resume();
      } catch (e) {}
    }
    if (this.audio && this.audio.paused && !this.isGameOver) {
      this.audio.load();
    }
  }

  setMode(mode) {
    if (mode !== SYNC_MODES.PLAY_PAUSE && mode !== SYNC_MODES.PLAYBACK_SPEED) return;
    this.mode = mode;
    this.currentPlaybackRate = 1.0;
    this.targetPlaybackRate = 1.0;
    if (this.audio) this.audio.playbackRate = 1.0;
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

    // Lagu tetap mulai dari awal (00:00) dengan patokan 4 ketukan irama
    this.songStartOffset = 0;

    // Ambil lirik secara random acak selama 1 menit ronde permainan
    this.sequence = createTaragakSequence(this.roundDuration, this.beatDuration);
    this.currentTarget = this.sequence[0];

    if (this.audio) {
      try { this.audio.currentTime = 0; } catch (e) {}
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
        const beatInMeasure = (this.beatCount4 || 1);
        const beatsLeft = isCurrent ? (4 - (beatInMeasure - 1)) : 4;
        queue.push({
          target: item,
          isCurrent,
          beatsLeft,
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
      this.lastCheckTimestamp = performance.now();
    }
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
    } catch (e) {}
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
    } catch (e) {}
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
    } catch (e) {}
  }

  getStarRating() {
    const score = this.score;
    const lives = this.lives;
    const isWon = this.isGameWon;

    if (isWon) {
      if (lives === 5 && score >= 900) {
        return {
          stars: 5,
          starIcons: '⭐⭐⭐⭐⭐',
          title: 'PERFECT MINANG MASTER!',
          badge: '⭐⭐⭐⭐⭐ PERFECT!',
          description: 'Luar Biasa! Tanpa Kesalahan Memainkan Irama Taragak Pulang!',
          color: '#ffd700',
        };
      }
      if (lives >= 4 && score >= 700) {
        return {
          stars: 4,
          starIcons: '⭐⭐⭐⭐',
          title: 'EXCELLENT!',
          badge: '⭐⭐⭐⭐ EXCELLENT',
          description: 'Hebat! Refleks dan irama gerakan jari Minang sangat presisi!',
          color: '#00f7ff',
        };
      }
      if (lives >= 3 && score >= 450) {
        return {
          stars: 3,
          starIcons: '⭐⭐⭐',
          title: 'GREAT!',
          badge: '⭐⭐⭐ GREAT',
          description: 'Rancak Bana! Berhasil menuntaskan lagu Taragak Pulang!',
          color: '#00ff88',
        };
      }
      if (lives >= 2) {
        return {
          stars: 2,
          starIcons: '⭐⭐',
          title: 'GOOD!',
          badge: '⭐⭐ GOOD',
          description: 'Selamat sampai akhir! Tingkatkan ketelitian gestur jari!',
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
    if (!this.audio || (this.audio.currentTime === 0 && !this.isPlaying)) return;

    const now = performance.now();
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

  triggerVictory() {
    if (this.isGameWon || this.isGameOver) return;
    this.isGameWon = true;
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = this.targetMaxDuration;
    }
    this.isMoving = false;
    this.guidanceMessage = '🎉 SELAMAT! TANTANGAN 60 DETIK TARAGAK PULANG BERHASIL DISELESAIKAN!';

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

    const checkLongFinger = (tipIdx, dipIdx, pipIdx, mcpIdx) => {
      const tip = landmarks[tipIdx];
      const dip = landmarks[dipIdx];
      const pip = landmarks[pipIdx];
      const mcp = landmarks[mcpIdx];

      const dTipWrist = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
      const dPipWrist = Math.hypot(pip.x - wrist.x, pip.y - wrist.y);
      const dTipMcp = Math.hypot(tip.x - mcp.x, tip.y - mcp.y);
      const dPipMcp = Math.hypot(pip.x - mcp.x, pip.y - mcp.y);

      const palmX = mcp.x - wrist.x;
      const palmY = mcp.y - wrist.y;
      const fingerX = tip.x - mcp.x;
      const fingerY = tip.y - mcp.y;
      const dotAlongPalm = (fingerX * palmX) + (fingerY * palmY);

      const isUpright = wrist.y > mcp.y - 0.05;

      if (dTipWrist < dPipWrist * 0.94) return false;
      if (dTipMcp < dPipMcp * 0.82) return false;
      if (isUpright && (tip.y > pip.y + 0.02) && (dTipMcp < dPipMcp * 1.05)) return false;

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
        if (h.index && !h.middle && !h.ring) return true;
        if (h.longFingersCount === 1 && h.index) return true;
        if (h.count === 1) return true;
        return false;

      case 2:
        if (h.index && h.middle && !h.ring && !h.pinky) return true;
        if (h.longFingersCount === 2 && (h.index || h.middle)) return true;
        if (h.count === 2 && (h.index || h.middle)) return true;
        if (h.index && h.middle && !h.ring) return true;
        return false;

      case 3:
        if (h.index && h.middle && h.ring && !h.pinky) return true;
        if (h.thumb && h.index && h.middle && !h.pinky) return true;
        if (h.longFingersCount === 3) return true;
        if (h.count === 3) return true;
        return false;

      case 4:
        if (h.index && h.middle && h.ring && h.pinky) return true;
        if (h.longFingersCount === 4) return true;
        if (h.count === 4) return true;
        return false;

      case 5:
        if (h.index && h.middle && h.ring && h.pinky) return true;
        if (h.longFingersCount === 4) return true;
        if (h.count >= 4) return true;
        return false;

      default:
        return false;
    }
  }

  updateMotion(landmarksList, handednessList = [], timestamp = performance.now()) {
    if (!this.audio || this.isGameOver) return this.getTelemetry();

    this._updateCurrentTarget();

    if (!landmarksList || landmarksList.length === 0) {
      this._handleNoHand(timestamp);
      return this.getTelemetry();
    }

    this.hasHand = true;

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
      // TARGET 10: WAJIB KEDUA TANGAN (2 TANGAN)
      const bothHandsUp = landmarksList.length >= 2;
      const combinedFingers = (hand0 ? hand0.count : 0) + (hand1 ? hand1.count : 0);
      if (bothHandsUp && combinedFingers >= 6) {
        isTargetMatch = true;
        computedTotalFingers = 10;
      } else {
        computedTotalFingers = hand0 ? hand0.count : 0;
        this.guidanceMessage = '🙌 ANGKAT KEDUA TANGAN (10 JARI)!';
      }
    } else {
      // TARGET 1, 2, 3, 4, 5: TIDAK BISA 2 TANGAN! HANYA 1 TANGAN DENGAN JARI COCOK!
      if (landmarksList.length > 1) {
        // Pemain mengangkat 2 tangan -> Ditolak karena harus 1 tangan!
        isTargetMatch = false;
        computedTotalFingers = (hand0 ? hand0.count : 0) + (hand1 ? hand1.count : 0);
        this.guidanceMessage = `⚠️ GUNAKAN 1 TANGAN SAJA! (Target: ${targetCount} Jari)`;
      } else {
        // Tepat 1 tangan terangkat di kamera
        const match = this.matchTargetWithHand(hand0, targetCount);
        if (match) {
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

    let sumX = 0;
    let sumY = 0;
    currentFingerPoints.forEach(pt => {
      sumX += pt.x;
      sumY += pt.y;
    });
    this.centroidX = sumX / currentFingerPoints.length;
    this.centroidY = sumY / currentFingerPoints.length;

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
          const d = Math.hypot(dx, dy * 1.45);
          totalDisplacement += d;
          if (d > maxDisplacement) maxDisplacement = d;
          matchedCount++;
        }
      });

      const avgDisplacement = matchedCount > 0 ? (totalDisplacement / matchedCount) : 0;
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

    this._evaluateBeatRhythm(timestamp);
    this._processPlayPauseApproach(timestamp);

    this._emitTelemetry();
    return this.getTelemetry();
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

    const beatIndex = Math.floor(curTime / this.beatDuration);
    this.beatCount4 = (beatIndex % 4) + 1;
    this.beatProgress = (curTime % this.beatDuration) / this.beatDuration;

    // Cukup angkat jari dan cocokkan target, LAGU LANGSUNG MULAI BERPUTAR!
    if (this.audio.paused && this.hasHand && isTargetMatch && !this.isGameOver && !this.isGameWon) {
      this.audio.playbackRate = 1.0;
      this.audio.play().catch(() => {});
    }

    if (isTargetMatch) {
      this.consecutiveMismatchTime = 0;

      if (isMoving) {
        if (beatIndex !== this.lastBeatIndex && this.isPlaying) {
          this.lastBeatIndex = beatIndex;
          this.score += 25;
          this.combo += 1;
        }
        this.guidanceMessage = `🟢 KETUKAN ${this.beatCount4}! AYUNAN ${this.currentTarget.name} COCOK DENGAN TARAGAK PULANG!`;
      } else {
        this.guidanceMessage = `✨ GESTUR TEPAT (${this.currentTarget.emoji})! AYUNKAN JARIMU IKUTI IRAMA!`;
      }
    } else {
      const dt = Math.max(0, timestamp - this.lastCheckTimestamp);
      this.consecutiveMismatchTime += dt;
      this.guidanceMessage = `⚠️ SALAH GESTUR! HARUS: ${this.currentTarget.label} (${this.currentTarget.emoji})`;

      if (this.consecutiveMismatchTime >= 850) {
        this.consecutiveMismatchTime = 0;
        this.deductLife(`SALAH GESTUR! (Wajib ${this.currentTarget.fingerCount} Jari)`);
      }
    }
    this.lastCheckTimestamp = timestamp;
  }

  _processPlayPauseApproach(timestamp) {
    if (this.isGameOver || this.isGameWon) return;

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
      // Jari salah atau tangan diturunkan
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
    this.guidanceMessage = `👋 TUNJUKKAN KE KAMERA: ${this.currentTarget.label} (${this.currentTarget.emoji})`;

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

    const isAudActive = !this.isAudioPaused && this.isPlaying;
    const bars = 28;
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

      ctx.fillStyle = isAudActive ? '#ffd700' : 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(x, y, bw, bh);
    }
  }

  getTelemetry() {
    const curRoundTime = this.getRoundElapsed();
    const dur = this.roundDuration;
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

export const taragakPulangSyncService = new TaragakPulangSyncService();