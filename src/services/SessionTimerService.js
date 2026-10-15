// SessionTimerService.js - Play duration tracker and ergonomic wrist/arm rest reminder
import { settingsManager } from './SettingsManager.js';

export class SessionTimerService {
  constructor() {
    this.sessionStart = Date.now();
    this.continuousPlaySeconds = 0;
    this.timerId = null;
    this.isActive = false;
    this.hasRemindedThisPeriod = false;

    // Callbacks
    this.onTick = null; // (seconds, formattedString)
    this.onRestReminder = null; // (continuousMinutes)
  }

  start() {
    if (this.timerId) return;
    this.isActive = true;
    this.timerId = setInterval(() => {
      this.continuousPlaySeconds++;
      const formatted = this.getFormattedDuration();

      if (this.onTick) {
        this.onTick(this.continuousPlaySeconds, formatted);
      }

      this._checkRestReminder();
    }, 1000);
  }

  pause() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isActive = false;
  }

  resume() {
    if (!this.timerId) {
      this.start();
    }
  }

  reset() {
    this.continuousPlaySeconds = 0;
    this.hasRemindedThisPeriod = false;
    this.sessionStart = Date.now();
  }

  getFormattedDuration() {
    const mins = Math.floor(this.continuousPlaySeconds / 60);
    const secs = this.continuousPlaySeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  _checkRestReminder() {
    const reminderEnabled = settingsManager.settings.restReminderEnabled !== false;
    if (!reminderEnabled) return;

    const intervalMinutes = settingsManager.settings.restReminderIntervalMins || 15;
    const intervalSeconds = intervalMinutes * 60;

    if (this.continuousPlaySeconds > 0 && this.continuousPlaySeconds % intervalSeconds === 0) {
      const minutesPlayed = Math.round(this.continuousPlaySeconds / 60);
      if (this.onRestReminder) {
        this.onRestReminder(minutesPlayed);
      }
    }
  }
}

export const sessionTimerService = new SessionTimerService();
