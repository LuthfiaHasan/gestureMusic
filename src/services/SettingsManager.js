// SettingsManager.js - User preferences, audio presets, and haptic feedback

import { audioManager } from '../audio/AudioManager.js';

export class SettingsManager {
  constructor() {
    this.defaults = {
      masterVolume: 0.85,
      chordVolume: 0.9,
      padVolume: 0.35,
      sfxVolume: 0.8,
      reverbAmount: 0.4,
      soundPreset: 'Dreamy Piano',
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
