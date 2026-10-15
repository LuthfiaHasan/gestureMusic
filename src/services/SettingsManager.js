// SettingsManager.js - User preferences, audio presets, and haptic feedback

import { audioManager } from '../audio/AudioManager.js';

export const AVAILABLE_INSTRUMENT_PRESETS = [
  { id: 'Dreamy Piano', name: 'Dreamy Piano', emoji: '🎹', desc: 'Lembut, hangat, dan kaya reverb' },
  { id: 'Acoustic Piano', name: 'Steinway Acoustic Piano', emoji: '🎹', desc: 'Jernih, elegan, akustik natural' },
  { id: 'Acoustic Guitar', name: 'Steel Acoustic Guitar', emoji: '🎸', desc: 'Petikan dawai baja cerah & renyah' },
  { id: 'Nylon Guitar', name: 'Nylon Classical Guitar', emoji: '🎸', desc: 'Petikan nilon klasik lembut & syahdu' },
  { id: 'Warm Synth', name: 'Warm Analog Synth', emoji: '🎛️', desc: 'Lead analog tebal nuansa synthwave' },
  { id: 'Soft Electronic', name: 'Soft Electronic Bell', emoji: '🔔', desc: 'Kloningan elektrik berkilau & modern' },
  { id: 'Ambient', name: 'Ambient Ethereal Pad', emoji: '🌌', desc: 'Swell atmosferik luas & menenangkan' },
];

export class SettingsManager {
  constructor() {
    this.defaults = {
      masterVolume: 0.85,
      chordVolume: 0.9,
      padVolume: 0.35,
      sfxVolume: 0.8,
      reverbAmount: 0.4,
      soundPreset: 'Acoustic Piano',
      hapticEnabled: true,
      cameraMirrored: true,
      viewportMode: 'mobile-frame', // 'mobile-frame' or 'fullscreen'
      showVirtualControls: true, // allows on-screen fallback buttons
      stabilityDurationMs: 250,
    };

    this.settings = { ...this.defaults };
    this.load();
  }

  load() {
    try {
      const stored = localStorage.getItem('gs_settings');
      if (stored) {
        this.settings = { ...this.defaults, ...JSON.parse(stored) };
      }
    } catch (e) {
      this.settings = { ...this.defaults };
    }
    this.apply();
  }

  save() {
    try {
      localStorage.setItem('gs_settings', JSON.stringify(this.settings));
    } catch (e) {
      // storage unavailable
    }
    this.apply();
  }

  apply() {
    audioManager.setMasterVolume(this.settings.masterVolume);
    audioManager.setChordVolume(this.settings.chordVolume);
    audioManager.setPadVolume(this.settings.padVolume);
    audioManager.setSFXVolume(this.settings.sfxVolume);
    audioManager.setReverbAmount(this.settings.reverbAmount);
    audioManager.setPreset(this.settings.soundPreset);
  }

  /**
   * Randomize instrument sound preset every time play/main is clicked
   */
  pickRandomPreset(showToast = true, isPianoOnly = false) {
    const current = this.settings.soundPreset;
    let pool = AVAILABLE_INSTRUMENT_PRESETS;
    if (isPianoOnly) {
      // Exclude guitar instruments for peaceful piano songs like Nadimu!
      pool = AVAILABLE_INSTRUMENT_PRESETS.filter(p => !p.id.toLowerCase().includes('guitar'));
    }
    const filteredPool = pool.filter(p => p.id !== current);
    const candidateList = filteredPool.length > 0 ? filteredPool : pool;
    const picked = candidateList[Math.floor(Math.random() * candidateList.length)] || pool[0];
    this.update('soundPreset', picked.id);
    audioManager.setPreset(picked.id);

    if (showToast && typeof window !== 'undefined' && window.app && window.app.showInstrumentToast) {
      window.app.showInstrumentToast(picked);
    }
    return picked;
  }

  triggerHaptic(type = 'good') {
    if (!this.settings.hapticEnabled || !navigator.vibrate) return;
    try {
      if (type === 'perfect') {
        navigator.vibrate([40, 30, 60]);
      } else if (type === 'good') {
        navigator.vibrate([25]);
      } else if (type === 'miss') {
        navigator.vibrate([15]);
      }
    } catch (e) {
      // ignore
    }
  }

  update(key, value) {
    this.settings[key] = value;
    this.save();
  }

  reset() {
    this.settings = { ...this.defaults };
    this.save();
  }
}

export const settingsManager = new SettingsManager();
