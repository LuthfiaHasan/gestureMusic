// AudioManager.js - Web Audio Engine for Gesture Synth
// Implements Soft Piano + Dreamy Synth Pad, ADSR, Algorithmic Reverb, Delay, and Musical SFX

import { getChordData, midiToFreq, noteToMidi } from './ChordLibrary.js';

class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.chordGain = null;
    this.padGain = null;
    this.sfxGain = null;
    this.reverbNode = null;
    this.reverbGain = null;
    this.delayNode = null;
    this.delayFeedback = null;
    this.delayGain = null;
    this.limiter = null;
    this.analyser = null;

    this.activeVoices = [];
    this.currentPreset = 'Dreamy Piano';

    // Settings default
    this.volumes = {
      master: 0.85,
      chord: 0.9,
      pad: 0.35,
      sfx: 0.8,
      reverb: 0.4,
    };

    this.lastAudioTriggerMs = 0;
    this.initialized = false;

    // Real Sampled Instruments (Tone.js / Studio recordings)
    this.instrumentBuffers = {
      piano: {},
      acousticGuitar: {},
      nylonGuitar: {},
    };
    this.instrumentsLoaded = {
      piano: false,
      acousticGuitar: false,
      nylonGuitar: false,
    };
    this.instrumentsLoading = {
      piano: false,
      acousticGuitar: false,
      nylonGuitar: false,
    };

    // Backwards compatibility aliases
    this.pianoBuffers = this.instrumentBuffers.piano;
    this.isPianoSamplesLoaded = false;
    this.isPianoSamplesLoading = false;
  }

  async init() {
    if (this.initialized) return;
    if (typeof window === 'undefined') return;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();

    // Master Limiter / Compressor
    this.limiter = this.ctx.createDynamicsCompressor();
    this.limiter.threshold.setValueAtTime(-4, this.ctx.currentTime);
    this.limiter.knee.setValueAtTime(15, this.ctx.currentTime);
    this.limiter.ratio.setValueAtTime(10, this.ctx.currentTime);
    this.limiter.attack.setValueAtTime(0.003, this.ctx.currentTime);
    this.limiter.release.setValueAtTime(0.25, this.ctx.currentTime);

    // Analyser Node for Visualizers
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.82;

    // Gains
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volumes.master, this.ctx.currentTime);

    this.chordGain = this.ctx.createGain();
    this.chordGain.gain.setValueAtTime(this.volumes.chord, this.ctx.currentTime);

    this.padGain = this.ctx.createGain();
    this.padGain.gain.setValueAtTime(this.volumes.pad, this.ctx.currentTime);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(this.volumes.sfx, this.ctx.currentTime);

    this.rhythmGain = this.ctx.createGain();
    this.rhythmGain.gain.setValueAtTime(0.7, this.ctx.currentTime);

    // Reverb: Impulse Response Convolution
    this.reverbNode = this.ctx.createConvolver();
    this.reverbNode.buffer = this._createImpulseResponse(2.4, 2.0); // Medium room / hall
    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.setValueAtTime(this.volumes.reverb, this.ctx.currentTime);

    // Light Ambient Stereo Delay
    this.delayNode = this.ctx.createDelay(1.0);
    this.delayNode.delayTime.setValueAtTime(0.32, this.ctx.currentTime); // ~320ms ambient delay
    this.delayFeedback = this.ctx.createGain();
    this.delayFeedback.gain.setValueAtTime(0.22, this.ctx.currentTime); // Gentle feedback
    this.delayGain = this.ctx.createGain();
    this.delayGain.gain.setValueAtTime(0.25, this.ctx.currentTime);

    // High cut filter on delay for warm tape echo feel
    const delayFilter = this.ctx.createBiquadFilter();
    delayFilter.type = 'lowpass';
    delayFilter.frequency.setValueAtTime(1800, this.ctx.currentTime);

    // Wire Delay feedback loop
    this.delayNode.connect(delayFilter);
    delayFilter.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);
    delayFilter.connect(this.delayGain);

    // Connect Reverb
    this.reverbNode.connect(this.reverbGain);

    // Main bus routing
    // Direct -> Master
    this.chordGain.connect(this.masterGain);
    this.padGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.rhythmGain.connect(this.masterGain);

    // FX sends
    this.chordGain.connect(this.reverbNode);
    this.padGain.connect(this.reverbNode);
    this.sfxGain.connect(this.reverbNode);
    this.rhythmGain.connect(this.reverbNode);

    this.chordGain.connect(this.delayNode);
    this.padGain.connect(this.delayNode);

    this.reverbGain.connect(this.masterGain);
    this.delayGain.connect(this.masterGain);

    // Master -> Analyser -> Limiter -> Destination
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.limiter);
    this.limiter.connect(this.ctx.destination);

    this.initialized = true;
    this.loadPianoSamples().catch(() => {});
    this.loadAcousticGuitarSamples().catch(() => {});
    this.loadNylonGuitarSamples().catch(() => {});
  }

  async resume() {
    if (!this.ctx) await this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  /**
   * Generates a stereo impulse response buffer for warm reverb
   */
  _createImpulseResponse(duration = 2.0, decay = 2.0) {
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = this.ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i;
      // Exponential decay envelope with random Gaussian noise
      const env = Math.pow(1 - n / length, decay);
      left[i] = (Math.random() * 2 - 1) * env;
      right[i] = (Math.random() * 2 - 1) * env;
    }
    return impulse;
  }

  /**
   * Play a full chord with voice leading and smooth transition
   */
  playChord(chordSymbol, options = {}) {
    const tAudioStart = performance.now();
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (!this.ctx) return getChordData(chordSymbol);

    const chordData = getChordData(chordSymbol);
    const now = this.ctx.currentTime;
    const holdDuration = options.duration || 1.6;

    // Gracefully release currently ringing chord voices (smooth crossfade)
    this.stopPreviousVoices(now, 0.25);

    const newVoices = [];

    // ADSR settings based on preset
    const adsr = this._getPresetADSR();

    const isSamplePreset = (
      (this.currentPreset === 'Acoustic Piano' && this.instrumentsLoaded.piano) ||
      (this.currentPreset === 'Acoustic Guitar' && this.instrumentsLoaded.acousticGuitar) ||
      (this.currentPreset === 'Nylon Guitar' && this.instrumentsLoaded.nylonGuitar)
    );

    chordData.frequencies.forEach((freq, idx) => {
      // Pan each note slightly across the stereo field for rich depth
      const panOffset = ((idx / (chordData.frequencies.length - 1 || 1)) - 0.5) * 0.6;
      const midi = (chordData.midis && chordData.midis[idx]) || 60;

      // Natural acoustic strum timing cascade for guitar presets (~16ms between strings)
      const isGuitar = (this.currentPreset === 'Acoustic Guitar' || this.currentPreset === 'Nylon Guitar');
      const noteStartTime = isGuitar ? (now + idx * 0.016) : now;

      // 1. Primary Instrument Voice Layer: Sampled Real Instrument or Soft Synth
      if (this.currentPreset === 'Acoustic Piano' && this.instrumentsLoaded.piano) {
        const pianoVoice = this._createSamplePianoVoice(midi, freq, noteStartTime, panOffset, holdDuration);
        newVoices.push(pianoVoice);
      } else if (this.currentPreset === 'Acoustic Guitar' && this.instrumentsLoaded.acousticGuitar) {
        const guitarVoice = this._createSampleAcousticGuitarVoice(midi, freq, noteStartTime, panOffset, holdDuration);
        newVoices.push(guitarVoice);
      } else if (this.currentPreset === 'Nylon Guitar' && this.instrumentsLoaded.nylonGuitar) {
        const guitarVoice = this._createSampleNylonGuitarVoice(midi, freq, noteStartTime, panOffset, holdDuration);
        newVoices.push(guitarVoice);
      } else {
        const pianoVoice = this._createPianoVoice(freq, noteStartTime, adsr, panOffset, holdDuration);
        newVoices.push(pianoVoice);
      }

      // 2. Pad Layer (adds atmospheric warmth for synth and piano presets)
      if (!isSamplePreset) {
        const padVoice = this._createPadVoice(freq, now, adsr, panOffset, holdDuration);
        newVoices.push(padVoice);
      } else if (this.currentPreset === 'Acoustic Piano') {
        // Subtle natural hall acoustic pad for real piano preset
        const padVoice = this._createPadVoice(freq, now, { ...adsr, sustain: 0.25, release: 0.9 }, panOffset, holdDuration);
        newVoices.push(padVoice);
      }
    });

    this.activeVoices = newVoices;
    this.lastAudioTriggerMs = +(performance.now() - tAudioStart).toFixed(2);
    return chordData;
  }

  /**
   * Play an authentic individual piano note (e.g. 'C4', 'E4', 'G4' or MIDI 60, 64, 67)
   */
  playPianoNote(noteOrMidi, options = {}) {
    const tAudioStart = performance.now();
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (!this.ctx) return null;

    let midi = 60;
    let freq = 261.63;
    let noteName = typeof noteOrMidi === 'string' ? noteOrMidi : 'C4';

    if (typeof noteOrMidi === 'number') {
      midi = noteOrMidi;
      freq = midiToFreq(midi);
    } else if (typeof noteOrMidi === 'string') {
      midi = noteToMidi(noteOrMidi);
      freq = midiToFreq(midi);
    }

    const now = this.ctx.currentTime;
    const holdDuration = options.duration || 1.1;
    const adsr = this._getPresetADSR();
    const panOffset = options.pan !== undefined ? options.pan : 0;

    let voice;
    if (this.instrumentsLoaded.piano) {
      voice = this._createSamplePianoVoice(midi, freq, now, panOffset, holdDuration);
    } else {
      voice = this._createPianoVoice(freq, now, adsr, panOffset, holdDuration);
    }

    // Warm atmospheric pad overtone layer
    const padVoice = this._createPadVoice(freq, now, { ...adsr, sustain: 0.2, release: 0.8 }, panOffset, holdDuration * 0.75);

    this.activeVoices.push(voice, padVoice);
    this.lastAudioTriggerMs = +(performance.now() - tAudioStart).toFixed(2);
    return { midi, freq, note: noteName };
  }

  /**
   * Festive Sleigh Bells Sound Effect for Jingle Bells
   */
  playSleighBells() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const bellFreqs = [2489, 2960, 3520, 4186, 4978];
    bellFreqs.forEach((baseFreq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      const jitter = (Math.random() * 40 - 20);
      osc.frequency.setValueAtTime(baseFreq + jitter, now + i * 0.012);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(baseFreq, now);
      filter.Q.setValueAtTime(6.0, now);

      gain.gain.setValueAtTime(0.0001, now + i * 0.012);
      gain.gain.linearRampToValueAtTime(0.07, now + i * 0.012 + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.012 + 0.22);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + i * 0.012);
      osc.stop(now + i * 0.012 + 0.25);
    });
  }

  _getPresetADSR() {
    switch (this.currentPreset) {
      case 'Acoustic Piano':
        return { attack: 0.01, decay: 0.25, sustain: 0.55, release: 1.0, filterFreq: 3200 };
      case 'Acoustic Guitar':
        return { attack: 0.008, decay: 0.35, sustain: 0.5, release: 0.9, filterFreq: 3400 };
      case 'Nylon Guitar':
        return { attack: 0.01, decay: 0.3, sustain: 0.45, release: 0.85, filterFreq: 3000 };
      case 'Warm Synth':
        return { attack: 0.06, decay: 0.35, sustain: 0.75, release: 1.2, filterFreq: 2200 };
      case 'Soft Electronic':
        return { attack: 0.02, decay: 0.25, sustain: 0.6, release: 0.8, filterFreq: 3200 };
      case 'Ambient':
        return { attack: 0.12, decay: 0.5, sustain: 0.85, release: 1.8, filterFreq: 1600 };
      case 'Dreamy Piano':
      default:
        return { attack: 0.04, decay: 0.28, sustain: 0.65, release: 1.1, filterFreq: 2600 };
    }
  }

  /**
   * Create an additive soft piano voice with hammer overtone decay and natural release
   */
  _createPianoVoice(freq, startTime, adsr, pan = 0, holdDuration = 1.6) {
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const osc3 = this.ctx.createOscillator();

    // Harmonics
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, startTime);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, startTime); // 2nd harmonic octave

    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(freq * 3, startTime); // 3rd harmonic fifth

    // Gains for harmonics
    const g1 = this.ctx.createGain();
    const g2 = this.ctx.createGain();
    const g3 = this.ctx.createGain();

    g1.gain.setValueAtTime(0.75, startTime);
    g2.gain.setValueAtTime(0.22, startTime);
    g3.gain.setValueAtTime(0.08, startTime);

    // Warm Felt Filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(adsr.filterFreq, startTime);
    filter.frequency.exponentialRampToValueAtTime(Math.max(200, adsr.filterFreq * 0.45), startTime + adsr.decay + 0.5);

    // Voice ADSR Master Gain
    const voiceGain = this.ctx.createGain();
    voiceGain.gain.setValueAtTime(0.0001, startTime);
    // Attack
    voiceGain.gain.linearRampToValueAtTime(0.85, startTime + adsr.attack);
    // Decay to sustain
    const sustainLevel = Math.max(0.0001, adsr.sustain * 0.85);
    voiceGain.gain.exponentialRampToValueAtTime(sustainLevel, startTime + adsr.attack + adsr.decay);

    // Natural Musical Release: Note fades to silence naturally even if not manually stopped
    const releaseStart = startTime + adsr.attack + adsr.decay + holdDuration;
    const releaseDuration = adsr.release || 1.1;
    const naturalStopTime = releaseStart + releaseDuration;
    voiceGain.gain.setValueAtTime(sustainLevel, releaseStart);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, naturalStopTime);

    // Stereo Panner
    let panner = null;
    if (this.ctx.createStereoPanner) {
      panner = this.ctx.createStereoPanner();
      panner.pan.setValueAtTime(pan, startTime);
    }

    // Connect oscillators
    osc1.connect(g1);
    osc2.connect(g2);
    osc3.connect(g3);

    g1.connect(filter);
    g2.connect(filter);
    g3.connect(filter);

    filter.connect(voiceGain);

    if (panner) {
      voiceGain.connect(panner);
      panner.connect(this.chordGain);
    } else {
      voiceGain.connect(this.chordGain);
    }

    osc1.start(startTime);
    osc2.start(startTime);
    osc3.start(startTime);

    try {
      osc1.stop(naturalStopTime + 0.05);
      osc2.stop(naturalStopTime + 0.05);
      osc3.stop(naturalStopTime + 0.05);
    } catch (e) {}

    let isStopped = false;
    return {
      nodes: [osc1, osc2, osc3],
      gain: voiceGain,
      releaseTime: adsr.release,
      stop: (stopTime, fadeDuration = 0.25) => {
        if (isStopped) return;
        isStopped = true;
        try {
          const fade = Math.min(fadeDuration, adsr.release);
          voiceGain.gain.cancelScheduledValues(stopTime);
          voiceGain.gain.setTargetAtTime(0.0001, stopTime, fade / 3);
          const killTime = stopTime + fade + 0.05;
          osc1.stop(killTime);
          osc2.stop(killTime);
          osc3.stop(killTime);
        } catch (e) {
          // ignore already stopped
        }
      }
    };
  }

  /**
   * Load and cache multi-sampled audio buffers (Tone.js Instrument samples)
   */
  async loadInstrumentSamples(type) {
    if (!this.ctx) return;
    if (this.instrumentsLoaded[type] || this.instrumentsLoading[type]) return;
    this.instrumentsLoading[type] = true;

    let sampleMap = null;
    let targetBuffers = null;
    if (type === 'piano') {
      sampleMap = {
        45: '/sounds/piano/A2.mp3',
        48: '/sounds/piano/C3.mp3',
        51: '/sounds/piano/Ds3.mp3',
        54: '/sounds/piano/Fs3.mp3',
        57: '/sounds/piano/A3.mp3',
        60: '/sounds/piano/C4.mp3',
        63: '/sounds/piano/Ds4.mp3',
        66: '/sounds/piano/Fs4.mp3',
        69: '/sounds/piano/A4.mp3',
        72: '/sounds/piano/C5.mp3',
        75: '/sounds/piano/Ds5.mp3',
        78: '/sounds/piano/Fs5.mp3',
        81: '/sounds/piano/A5.mp3',
        84: '/sounds/piano/C6.mp3',
      };
      targetBuffers = this.instrumentBuffers.piano;
    } else if (type === 'acousticGuitar') {
      sampleMap = {
        45: '/sounds/guitar-acoustic/A2.mp3',
        48: '/sounds/guitar-acoustic/C3.mp3',
        51: '/sounds/guitar-acoustic/Ds3.mp3',
        54: '/sounds/guitar-acoustic/Fs3.mp3',
        57: '/sounds/guitar-acoustic/A3.mp3',
        60: '/sounds/guitar-acoustic/C4.mp3',
        63: '/sounds/guitar-acoustic/Ds4.mp3',
        66: '/sounds/guitar-acoustic/Fs4.mp3',
        69: '/sounds/guitar-acoustic/A4.mp3',
        72: '/sounds/guitar-acoustic/C5.mp3',
      };
      targetBuffers = this.instrumentBuffers.acousticGuitar;
    } else if (type === 'nylonGuitar') {
      sampleMap = {
        38: '/sounds/guitar-nylon/D2.mp3',
        42: '/sounds/guitar-nylon/Fs2.mp3',
        45: '/sounds/guitar-nylon/A2.mp3',
        49: '/sounds/guitar-nylon/Cs3.mp3',
        52: '/sounds/guitar-nylon/E3.mp3',
        57: '/sounds/guitar-nylon/A3.mp3',
        61: '/sounds/guitar-nylon/Cs4.mp3',
        66: '/sounds/guitar-nylon/Fs4.mp3',
        69: '/sounds/guitar-nylon/A4.mp3',
        73: '/sounds/guitar-nylon/Cs5.mp3',
        76: '/sounds/guitar-nylon/E5.mp3',
      };
      targetBuffers = this.instrumentBuffers.nylonGuitar;
    }

    if (!sampleMap || !targetBuffers) {
      this.instrumentsLoading[type] = false;
      return;
    }

    const loadPromises = Object.entries(sampleMap).map(async ([midiStr, url]) => {
      const midi = parseInt(midiStr, 10);
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const arrayBuf = await res.arrayBuffer();
        const audioBuf = await this.ctx.decodeAudioData(arrayBuf);
        targetBuffers[midi] = audioBuf;
      } catch (err) {
        // Fallback silently
      }
    });

    await Promise.all(loadPromises);
    const count = Object.keys(targetBuffers).length;
    this.instrumentsLoaded[type] = count > 0;
    this.instrumentsLoading[type] = false;

    if (type === 'piano') {
      this.isPianoSamplesLoaded = this.instrumentsLoaded.piano;
      this.isPianoSamplesLoading = false;
      this.pianoBuffers = targetBuffers;
    }

    if (this.instrumentsLoaded[type]) {
      console.log(`Tone.js ${type} samples ready (${count} notes loaded)`);
    }
  }

  async loadPianoSamples() {
    return this.loadInstrumentSamples('piano');
  }

  async loadAcousticGuitarSamples() {
    return this.loadInstrumentSamples('acousticGuitar');
  }

  async loadNylonGuitarSamples() {
    return this.loadInstrumentSamples('nylonGuitar');
  }

  /**
   * Generalized realistic sampled instrument voice using pitch-shifted sample buffers
   */
  _createSampledVoice(buffers, midi, freq, startTime, pan = 0, holdDuration = 1.6, releaseTime = 0.9, gainScale = 0.9) {
    const availableMidis = Object.keys(buffers).map(Number);
    if (availableMidis.length === 0) {
      const adsr = this._getPresetADSR();
      return this._createPianoVoice(freq, startTime, adsr, pan, holdDuration);
    }

    // Find closest anchor sample
    let closestMidi = availableMidis[0];
    let minDiff = Math.abs(midi - closestMidi);
    for (const m of availableMidis) {
      const diff = Math.abs(midi - m);
      if (diff < minDiff) {
        minDiff = diff;
        closestMidi = m;
      }
    }

    const sampleBuffer = buffers[closestMidi];
    const semitoneDiff = midi - closestMidi;
    const playbackRate = Math.pow(2, semitoneDiff / 12);

    const source = this.ctx.createBufferSource();
    source.buffer = sampleBuffer;
    source.playbackRate.setValueAtTime(playbackRate, startTime);

    const voiceGain = this.ctx.createGain();
    voiceGain.gain.setValueAtTime(0.0001, startTime);
    voiceGain.gain.linearRampToValueAtTime(gainScale, startTime + 0.008);

    // Natural instrument resonance release
    const releaseStart = startTime + holdDuration;
    const naturalStopTime = releaseStart + releaseTime;
    voiceGain.gain.setValueAtTime(gainScale, releaseStart);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, naturalStopTime);

    let panner = null;
    if (this.ctx.createStereoPanner) {
      panner = this.ctx.createStereoPanner();
      panner.pan.setValueAtTime(pan, startTime);
    }

    source.connect(voiceGain);
    if (panner) {
      voiceGain.connect(panner);
      panner.connect(this.chordGain);
    } else {
      voiceGain.connect(this.chordGain);
    }

    source.start(startTime);
    try {
      source.stop(naturalStopTime + 0.05);
    } catch (e) {}

    let isStopped = false;
    return {
      nodes: [source],
      gain: voiceGain,
      releaseTime: releaseTime,
      stop: (stopTime, fadeDuration = 0.25) => {
        if (isStopped) return;
        isStopped = true;
        try {
          voiceGain.gain.cancelScheduledValues(stopTime);
          voiceGain.gain.setTargetAtTime(0.0001, stopTime, fadeDuration / 3);
          source.stop(stopTime + fadeDuration + 0.05);
        } catch (e) {}
      }
    };
  }

  _createSamplePianoVoice(midi, freq, startTime, pan = 0, holdDuration = 1.6) {
    return this._createSampledVoice(this.instrumentBuffers.piano, midi, freq, startTime, pan, holdDuration, 0.9, 0.9);
  }

  _createSampleAcousticGuitarVoice(midi, freq, startTime, pan = 0, holdDuration = 1.6) {
    return this._createSampledVoice(this.instrumentBuffers.acousticGuitar, midi, freq, startTime, pan, holdDuration, 0.8, 0.95);
  }

  _createSampleNylonGuitarVoice(midi, freq, startTime, pan = 0, holdDuration = 1.6) {
    return this._createSampledVoice(this.instrumentBuffers.nylonGuitar, midi, freq, startTime, pan, holdDuration, 0.75, 0.95);
  }

  /**
   * Create warm dreamy pad voice with natural decay
   */
  _createPadVoice(freq, startTime, adsr, pan = 0, holdDuration = 1.6) {
    const oscA = this.ctx.createOscillator();
    const oscB = this.ctx.createOscillator();

    // Dual detuned oscillators
    oscA.type = 'sawtooth';
    oscA.frequency.setValueAtTime(freq, startTime);
    oscA.detune.setValueAtTime(-8, startTime); // -8 cents

    oscB.type = 'triangle';
    oscB.frequency.setValueAtTime(freq, startTime);
    oscB.detune.setValueAtTime(8, startTime); // +8 cents

    // Warm Low-pass Filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(adsr.filterFreq * 0.65, startTime);
    filter.Q.setValueAtTime(1.4, startTime);

    // Subtle LFO modulation for shimmer
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.setValueAtTime(0.8, startTime); // 0.8 Hz gentle modulation
    lfoGain.gain.setValueAtTime(60, startTime);
    lfo.connect(filter.frequency);
    lfo.start(startTime);

    // Pad Gain ADSR
    const padVoiceGain = this.ctx.createGain();
    padVoiceGain.gain.setValueAtTime(0.0001, startTime);
    padVoiceGain.gain.linearRampToValueAtTime(0.4, startTime + adsr.attack + 0.05);
    const padSustainLevel = Math.max(0.0001, adsr.sustain * 0.4);
    padVoiceGain.gain.exponentialRampToValueAtTime(padSustainLevel, startTime + adsr.attack + adsr.decay + 0.1);

    // Natural Musical Release
    const releaseStart = startTime + adsr.attack + adsr.decay + holdDuration;
    const releaseDuration = (adsr.release || 1.2) * 1.1;
    const naturalStopTime = releaseStart + releaseDuration;
    padVoiceGain.gain.setValueAtTime(padSustainLevel, releaseStart);
    padVoiceGain.gain.exponentialRampToValueAtTime(0.0001, naturalStopTime);

    // Panner
    let panner = null;
    if (this.ctx.createStereoPanner) {
      panner = this.ctx.createStereoPanner();
      panner.pan.setValueAtTime(-pan, startTime); // opposite pan from piano for width
    }

    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(padVoiceGain);

    if (panner) {
      padVoiceGain.connect(panner);
      panner.connect(this.padGain);
    } else {
      padVoiceGain.connect(this.padGain);
    }

    oscA.start(startTime);
    oscB.start(startTime);

    try {
      oscA.stop(naturalStopTime + 0.05);
      oscB.stop(naturalStopTime + 0.05);
      lfo.stop(naturalStopTime + 0.05);
    } catch (e) {}

    let isStopped = false;
    return {
      nodes: [oscA, oscB, lfo],
      gain: padVoiceGain,
      releaseTime: adsr.release * 1.2,
      stop: (stopTime, fadeDuration = 0.25) => {
        if (isStopped) return;
        isStopped = true;
        try {
          const fade = Math.min(fadeDuration * 1.2, 1.8);
          padVoiceGain.gain.cancelScheduledValues(stopTime);
          padVoiceGain.gain.setTargetAtTime(0.0001, stopTime, fade / 3);
          const killTime = stopTime + fade + 0.05;
          oscA.stop(killTime);
          oscB.stop(killTime);
          lfo.stop(killTime);
        } catch (e) {
          // ignore
        }
      }
    };
  }

  /**
   * Stop previous voices smoothly
   */
  stopPreviousVoices(time = (this.ctx ? this.ctx.currentTime : 0), fade = 0.3) {
    if (!this.ctx) return;
    const t = time || this.ctx.currentTime;
    this.activeVoices.forEach(v => {
      if (v && v.stop) v.stop(t, fade);
    });
    this.activeVoices = [];
  }

  /**
   * SFX: Soft Harmonic Chime on "PERFECT!"
   * Dynamically tuned to the harmonics of the chord being played!
   */
  playPerfectChime(chordSymbol = null) {
    if (!this.initialized) this.init();
    this.resume();

    const now = this.ctx.currentTime;
    let notes = [1046.50, 1318.51, 1567.98, 2093.00]; // default C6, E6, G6, C7
    if (chordSymbol) {
      try {
        const chordData = getChordData(chordSymbol);
        if (chordData && chordData.frequencies && chordData.frequencies.length > 0) {
          notes = chordData.frequencies.map(f => {
            let freq = f;
            while (freq < 900) freq *= 2;
            return freq;
          });
        }
      } catch (e) {
        // fallback
      }
    }

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.045);

      gain.gain.setValueAtTime(0.0001, now + idx * 0.045);
      gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.045 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.045 + 0.4);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.045);
      osc.stop(now + idx * 0.045 + 0.45);
    });
  }

  /**
   * SFX: Soft Good Hit
   */
  playGoodHit(chordSymbol = null) {
    if (!this.initialized) this.init();
    this.resume();

    const now = this.ctx.currentTime;
    let freq = 880;
    if (chordSymbol) {
      try {
        const chordData = getChordData(chordSymbol);
        if (chordData && chordData.frequencies && chordData.frequencies.length > 0) {
          freq = chordData.frequencies[0];
          while (freq < 700) freq *= 2;
        }
      } catch (e) {
        // fallback
      }
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.10, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  /**
   * SFX: Miss - gentle, warm low chime (never an annoying buzzer!)
   */
  playMissSound() {
    if (!this.initialized) this.init();
    this.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.22); // subtle low pitch glide

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  /**
   * SFX: Round/Level Fanfare
   */
  playLevelComplete() {
    this.playRatingSFX(5);
  }

  /**
   * Rhythm Drum Synthesizer: Warm Punchy Kick
   */
  playKick() {
    if (!this.initialized) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.12);

    gain.gain.setValueAtTime(0.85, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.rhythmGain);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  /**
   * Rhythm Drum Synthesizer: Soft Pop Snare / Rim Snap
   */
  playSnare() {
    if (!this.initialized) return;
    const now = this.ctx.currentTime;

    // Body tone
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(185, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
    oscGain.gain.setValueAtTime(0.4, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(oscGain);
    oscGain.connect(this.rhythmGain);
    osc.start(now);
    osc.stop(now + 0.15);

    // Noise snap
    const bufferSize = this.ctx.sampleRate * 0.12;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.025));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1200, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.rhythmGain);

    noise.start(now);
  }

  /**
   * Rhythm Drum Synthesizer: Gentle Hi-Hat Tap
   */
  playHiHat() {
    if (!this.initialized) return;
    const now = this.ctx.currentTime;

    const bufferSize = this.ctx.sampleRate * 0.04;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.008));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(8000, now);
    filter.Q.setValueAtTime(4, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.038);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.rhythmGain);

    noise.start(now);
  }

  /**
   * Rhythm Bass Synthesizer: Warm Indonesian Pop Ballad Bassline
   */
  playBassNote(chordSymbol, duration = 0.8) {
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Map chord root note to sub-bass frequency
    const rootMap = {
      'C': 65.41, 'Cmaj7': 65.41,
      'D': 73.42, 'Dm': 73.42,
      'E': 82.41, 'Em': 41.20, 'Em7': 41.20,
      'F': 43.65,
      'G': 49.00,
      'A': 55.00, 'Am': 55.00,
      'B': 61.74, 'Bm': 61.74,
    };
    const freq = rootMap[chordSymbol] || 65.41;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(260, now);
    filter.frequency.exponentialRampToValueAtTime(110, now + duration * 0.75);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.rhythmGain);

    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  /**
   * Count-In Rhythm Beep ("3, 2, 1, GO!")
   */
  playCountInBeep(isDownbeat = false) {
    if (!this.initialized) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(isDownbeat ? 1046.50 : 783.99, now); // C6 on downbeat, G5 on beats

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  /**
   * Real-time Hit Rating SFX
   */
  playHitRating(rating) {
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    switch (rating) {
      case 'PERFECT':
        this.playPerfectChime();
        break;
      case 'GREAT': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1174.66, now); // D6
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.14, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.32);
        break;
      }
      case 'GOOD':
        this.playGoodHit();
        break;
      case 'BAD': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(330, now);
        osc.frequency.exponentialRampToValueAtTime(260, now + 0.15);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.22);
        break;
      }
      case 'MISS':
      default:
        this.playMissSound();
        break;
    }
  }

  /**
   * 5-Star Rating Musical Celebration Fanfare & Feedback
   */
  playRatingSFX(stars) {
    if (!this.initialized) this.init();
    this.resume();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (stars === 5) {
      // 5 STARS: Grand Celebration Fanfare + Sparkle
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98, 2093.00]; // C5 to C7
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0.0001, now + idx * 0.06);
        gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.06 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.7);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.8);
      });
    } else if (stars === 4) {
      // 4 STARS: Strong positive harmonic chime
      const notes = [587.33, 739.99, 880.00, 1174.66]; // D5, F#5, A5, D6
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.0001, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.6);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.7);
      });
    } else if (stars === 3) {
      // 3 STARS: Warm positive chime
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);

        gain.gain.setValueAtTime(0.0001, now + idx * 0.09);
        gain.gain.linearRampToValueAtTime(0.16, now + idx * 0.09 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.09 + 0.5);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.6);
      });
    } else if (stars === 2) {
      // 2 STARS: Neutral soft chime
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(392.00, now); // G4
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.5);
    } else {
      // 1 STAR: Soft low feedback sound
      this.playMissSound();
    }
  }

  /**
   * Game Announcer Voice Feedback (Web Speech Synthesis + Energetic arcade tone)
   */
  speakAnnouncer(text) {
    // 1. Synthesize arcade announcer vocal tone
    this._playAnnouncerChime(text);

    // 2. Announce using Web Speech Synthesis if available
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel(); // Cancel any prior speech
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.02;
        utterance.pitch = 1.12;
        utterance.volume = 1.0;

        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          const enVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('David')));
          if (enVoice) utterance.voice = enVoice;
        }

        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('Speech synthesis note:', e);
      }
    }
  }

  _playAnnouncerChime(text) {
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    const isExc = text.toLowerCase().includes('excellent') || text.toLowerCase().includes('great');
    osc.frequency.setValueAtTime(isExc ? 880 : 587.33, now);
    osc.frequency.exponentialRampToValueAtTime(isExc ? 1318.51 : 880, now + 0.18);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  // Setting controls
  setMasterVolume(val) {
    this.volumes.master = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volumes.master, this.ctx.currentTime);
    }
  }

  setChordVolume(val) {
    this.volumes.chord = Math.max(0, Math.min(1, val));
    if (this.chordGain && this.ctx) {
      this.chordGain.gain.setValueAtTime(this.volumes.chord, this.ctx.currentTime);
    }
  }

  setPadVolume(val) {
    this.volumes.pad = Math.max(0, Math.min(1, val));
    if (this.padGain && this.ctx) {
      this.padGain.gain.setValueAtTime(this.volumes.pad, this.ctx.currentTime);
    }
  }

  setSFXVolume(val) {
    this.volumes.sfx = Math.max(0, Math.min(1, val));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.volumes.sfx, this.ctx.currentTime);
    }
  }

  setReverbAmount(val) {
    this.volumes.reverb = Math.max(0, Math.min(1, val));
    if (this.reverbGain && this.ctx) {
      this.reverbGain.gain.setValueAtTime(this.volumes.reverb, this.ctx.currentTime);
    }
  }

  setPreset(presetName) {
    this.currentPreset = presetName;
    if (this.ctx) {
      if (presetName === 'Acoustic Piano' && !this.instrumentsLoaded.piano) {
        this.loadPianoSamples().catch(() => {});
      } else if (presetName === 'Acoustic Guitar' && !this.instrumentsLoaded.acousticGuitar) {
        this.loadAcousticGuitarSamples().catch(() => {});
      } else if (presetName === 'Nylon Guitar' && !this.instrumentsLoaded.nylonGuitar) {
        this.loadNylonGuitarSamples().catch(() => {});
      }
    }
  }
}

export const audioManager = new AudioManager();
