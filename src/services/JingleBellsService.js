// JingleBellsService.js - Interactive Jingle Bells Piano & Sheet Music Guide
// Transcribed faithfully from the standard C Major treble sheet music:
// 16 Measures, 4 Systems, 48 Notes, with Lyrics and Hand Gesture Finger Cues.

import { audioManager } from '../audio/AudioManager.js';

export const JINGLE_BELLS_NOTES = [
  // LINE 1 (SYSTEM 1: Measures 1 - 4)
  // Measure 1: "Jin - gle bells,"
  { index: 0, measure: 1, system: 1, beat: 1, note: 'E4', midi: 64, solfege: 'Mi', fingerCount: 3, emoji: '🤟', lyric: 'Jin -', duration: 1, chord: 'C' },
  { index: 1, measure: 1, system: 1, beat: 2, note: 'E4', midi: 64, solfege: 'Mi', fingerCount: 3, emoji: '🤟', lyric: 'gle', duration: 1, chord: 'C' },
  { index: 2, measure: 1, system: 1, beat: 3, note: 'E4', midi: 64, solfege: 'Mi', fingerCount: 3, emoji: '🤟', lyric: 'bells,', duration: 2, chord: 'C' },

  // Measure 2: "jin - gle bells,"
  { index: 3, measure: 2, system: 1, beat: 1, note: 'E4', midi: 64, solfege: 'Mi', fingerCount: 3, emoji: '🤟', lyric: 'jin -', duration: 1, chord: 'C' },
  { index: 4, measure: 2, system: 1, beat: 2, note: 'E4', midi: 64, solfege: 'Mi', fingerCount: 3, emoji: '🤟', lyric: 'gle', duration: 1, chord: 'C' },
  { index: 5, measure: 2, system: 1, beat: 3, note: 'E4', midi: 64, solfege: 'Mi', fingerCount: 3, emoji: '🤟', lyric: 'bells,', duration: 2, chord: 'C' },

  // Measure 3: "jin - gle all the"
  { index: 6, measure: 3, system: 1, beat: 1, note: 'E4', midi: 64, solfege: 'Mi', fingerCount: 3, emoji: '🤟', lyric: 'jin -', duration: 1, chord: 'C' },
  { index: 7, measure: 3, system: 1, beat: 2, note: 'G4', midi: 67, solfege: 'Sol', fingerCount: 5, emoji: '🖐️', lyric: 'gle', duration: 1, chord: 'C' },
  { index: 8, measure: 3, system: 1, beat: 3, note: 'C4', midi: 60, solfege: 'Do', fingerCount: 1, emoji: '☝️', lyric: 'all', duration: 1, chord: 'C' },
  { index: 9, measure: 3, system: 1, beat: 4, note: 'D4', midi: 62, solfege: 'Re', fingerCount: 2, emoji: '✌️', lyric: 'the', duration: 1, chord: 'C' },

  // Measure 4: "way."
  { index: 10, measure: 4, system: 1, beat: 1, note: 'E4', midi: 64, solfege: 'Mi', fingerCount: 3, emoji: '🤟', lyric: 'way.', duration: 4, chord: 'C' },

  // LINE 2 (SYSTEM 2: Measures 5 - 8)
  // Measure 5: "Oh, what fun it"
  { index: 11, measure: 5, system: 2, beat: 1, note: 'F4', midi: 65, solfege: 'Fa', fingerCount: 4, emoji: '🖐️', lyric: 'Oh,', duration: 1, chord: 'F' },
  { index: 12, measure: 5, system: 2, beat: 2, note: 'F4', midi: 65, solfege: 'Fa', fingerCount: 4, emoji: '🖐️', lyric: 'what', duration: 1, chord: 'F' },
  { index: 13, measure: 5, system: 2, beat: 3, note: 'F4', midi: 65, solfege: 'Fa', fingerCount: 4, emoji: '🖐️', lyric: 'fun', duration: 1, chord: 'F' },
  { index: 14, measure: 5, system: 2, beat: 4, note: 'F4', midi: 65, solfege: 'Fa', fingerCount: 4, emoji: '🖐️', lyric: 'it', duration: 1, chord: 'F' },

  // Measure 6: "is to ride in a"
  { index: 15, measure: 6, system: 2, beat: 1, note: 'F4', midi: 65, solfege: 'Fa', fingerCount: 4, emoji: '🖐️', lyric: 'is', duration: 1, chord: 'C' },
  { index: 16, measure: 6, system: 2, beat: 2, note: 'E4', midi: 64, solfege: 'Mi', fingerCount: 3, emoji: '🤟', lyric: 'to', duration: 1, chord: 'C' },
  { index: 17, measure: 6, system: 2, beat: 3, note: 'E4', midi: 64, solfege: 'Mi', fingerCount: 3, emoji: '🤟', lyric: 'ride', duration: 1, chord: 'C' },
  { index: 18, measure: 6, system: 2, beat: 4, note: 'E4', midi: 64, solfege: 'Mi', fingerCount: 3, emoji: '🤟', lyric: 'in a', duration: 1, chord: 'C' },

  // Measure 7: "one - horse op - en"
  { index: 19, measure: 7, system: 2, beat: 1, note: 'D4', midi: 62, solfege: 'Re', fingerCount: 2, emoji: '✌️', lyric: 'one -', duration: 1, chord: 'G' },
  { index: 20, measure: 7, system: 2, beat: 2, note: 'D4', midi: 62, solfege: 'Re', fingerCount: 2, emoji: '✌️', lyric: 'horse', duration: 1, chord: 'G' },
  { index: 21, measure: 7, system: 2, beat: 3, note: 'E4', midi: 64, solfege: 'Mi', fingerCount: 3, emoji: '🤟', lyric: 'op -', duration: 1, chord: 'G' },
  { index: 22, measure: 7, system: 2, beat: 4, note: 'D4', midi: 62, solfege: 'Re', fingerCount: 2, emoji: '✌️', lyric: 'en', duration: 1, chord: 'G' },

  // Measure 8: "sleigh!"
  { index: 23, measure: 8, system: 2, beat: 1, note: 'G4', midi: 67, solfege: 'Sol', fingerCount: 5, emoji: '🖐️', lyric: 'sleigh!', duration: 4, chord: 'G' },

  // LINE 3 (SYSTEM 3: Measures 9 - 12)
  // Measure 9: "Jin - gle bells,"
  { index: 24, measure: 9, system: 3, beat: 1, note: 'E4', midi: 64, solfege: 'Mi', fingerCount: 3, emoji: '🤟', lyric: 'Jin -', duration: 1, chord: 'C' },
  { index: 25, measure: 9, system: 3, beat: 2, note: 'E4', midi: 64, solfege: 'Mi', fingerCount: 3, emoji: '🤟', lyric: 'gle', duration: 1, chord: 'C' },
  { index: 26, measure: 9, system: 3, beat: 3, note: 'E4', midi: 64, solfege: 'Mi', fingerCount: 3, emoji: '🤟', lyric: 'bells,', duration: 2, chord: 'C' },

  // Measure 10: "jin - gle bells,"
  { index: 27, measure: 10, system: 3, beat: 1, note: 'E4', midi: 64, solfege: 'Mi', fingerCount: 3, emoji: '🤟', lyric: 'jin -', duration: 1, chord: 'C' },
  { index: 28, measure: 10, system: 3, beat: 2, note: 'E4', midi: 64, solfege: 'Mi', fingerCount: 3, emoji: '🤟', lyric: 'gle', duration: 1, chord: 'C' },
  { index: 29, measure: 10, system: 3, beat: 3, note: 'E4', midi: 64, solfege: 'Mi', fingerCount: 3, emoji: '🤟', lyric: 'bells,', duration: 2, chord: 'C' },

  // Measure 11: "jin - gle all the"
  { index: 30, measure: 11, system: 3, beat: 1, note: 'E4', midi: 64, solfege: 'Mi', fingerCount: 3, emoji: '🤟', lyric: 'jin -', duration: 1, chord: 'C' },
  { index: 31, measure: 11, system: 3, beat: 2, note: 'G4', midi: 67, solfege: 'Sol', fingerCount: 5, emoji: '🖐️', lyric: 'gle', duration: 1, chord: 'C' },
  { index: 32, measure: 11, system: 3, beat: 3, note: 'C4', midi: 60, solfege: 'Do', fingerCount: 1, emoji: '☝️', lyric: 'all', duration: 1, chord: 'C' },
  { index: 33, measure: 11, system: 3, beat: 4, note: 'D4', midi: 62, solfege: 'Re', fingerCount: 2, emoji: '✌️', lyric: 'the', duration: 1, chord: 'C' },

  // Measure 12: "way."
  { index: 34, measure: 12, system: 3, beat: 1, note: 'E4', midi: 64, solfege: 'Mi', fingerCount: 3, emoji: '🤟', lyric: 'way.', duration: 4, chord: 'C' },

  // LINE 4 (SYSTEM 4: Measures 13 - 16)
  // Measure 13: "Oh, what fun it"
  { index: 35, measure: 13, system: 4, beat: 1, note: 'F4', midi: 65, solfege: 'Fa', fingerCount: 4, emoji: '🖐️', lyric: 'Oh,', duration: 1, chord: 'F' },
  { index: 36, measure: 13, system: 4, beat: 2, note: 'F4', midi: 65, solfege: 'Fa', fingerCount: 4, emoji: '🖐️', lyric: 'what', duration: 1, chord: 'F' },
  { index: 37, measure: 13, system: 4, beat: 3, note: 'F4', midi: 65, solfege: 'Fa', fingerCount: 4, emoji: '🖐️', lyric: 'fun', duration: 1, chord: 'F' },
  { index: 38, measure: 13, system: 4, beat: 4, note: 'F4', midi: 65, solfege: 'Fa', fingerCount: 4, emoji: '🖐️', lyric: 'it', duration: 1, chord: 'F' },

  // Measure 14: "is to ride in a"
  { index: 39, measure: 14, system: 4, beat: 1, note: 'F4', midi: 65, solfege: 'Fa', fingerCount: 4, emoji: '🖐️', lyric: 'is', duration: 1, chord: 'C' },
  { index: 40, measure: 14, system: 4, beat: 2, note: 'E4', midi: 64, solfege: 'Mi', fingerCount: 3, emoji: '🤟', lyric: 'to', duration: 1, chord: 'C' },
  { index: 41, measure: 14, system: 4, beat: 3, note: 'E4', midi: 64, solfege: 'Mi', fingerCount: 3, emoji: '🤟', lyric: 'ride', duration: 1, chord: 'C' },
  { index: 42, measure: 14, system: 4, beat: 4, note: 'E4', midi: 64, solfege: 'Mi', fingerCount: 3, emoji: '🤟', lyric: 'in a', duration: 1, chord: 'C' },

  // Measure 15: "one - horse op - en"
  { index: 43, measure: 15, system: 4, beat: 1, note: 'G4', midi: 67, solfege: 'Sol', fingerCount: 5, emoji: '🖐️', lyric: 'one -', duration: 1, chord: 'G' },
  { index: 44, measure: 15, system: 4, beat: 2, note: 'G4', midi: 67, solfege: 'Sol', fingerCount: 5, emoji: '🖐️', lyric: 'horse', duration: 1, chord: 'G' },
  { index: 45, measure: 15, system: 4, beat: 3, note: 'F4', midi: 65, solfege: 'Fa', fingerCount: 4, emoji: '🖐️', lyric: 'op -', duration: 1, chord: 'G' },
  { index: 46, measure: 15, system: 4, beat: 4, note: 'D4', midi: 62, solfege: 'Re', fingerCount: 2, emoji: '✌️', lyric: 'en', duration: 1, chord: 'G' },

  // Measure 16: "sleigh!"
  { index: 47, measure: 16, system: 4, beat: 1, note: 'C4', midi: 60, solfege: 'Do', fingerCount: 1, emoji: '☝️', lyric: 'sleigh!', duration: 4, chord: 'C' },
];

export const PIANO_KEYS = [
  { note: 'C4', label: 'C', solfege: 'Do', fingerCount: 1, emoji: '☝️', midi: 60, isBlack: false },
  { note: 'C#4', label: 'C#', solfege: 'Di', fingerCount: null, emoji: '', midi: 61, isBlack: true },
  { note: 'D4', label: 'D', solfege: 'Re', fingerCount: 2, emoji: '✌️', midi: 62, isBlack: false },
  { note: 'D#4', label: 'D#', solfege: 'Ri', fingerCount: null, emoji: '', midi: 63, isBlack: true },
  { note: 'E4', label: 'E', solfege: 'Mi', fingerCount: 3, emoji: '🤟', midi: 64, isBlack: false },
  { note: 'F4', label: 'F', solfege: 'Fa', fingerCount: 4, emoji: '🖐️', midi: 65, isBlack: false },
  { note: 'F#4', label: 'F#', solfege: 'Fi', fingerCount: null, emoji: '', midi: 66, isBlack: true },
  { note: 'G4', label: 'G', solfege: 'Sol', fingerCount: 5, emoji: '🖐️', midi: 67, isBlack: false },
  { index: 8, note: 'G#4', label: 'G#', solfege: 'Si', fingerCount: null, emoji: '', midi: 68, isBlack: true },
  { note: 'A4', label: 'A', solfege: 'La', fingerCount: null, emoji: '', midi: 69, isBlack: false },
  { note: 'A#4', label: 'A#', solfege: 'Li', fingerCount: null, emoji: '', midi: 70, isBlack: true },
  { note: 'B4', label: 'B', solfege: 'Si', fingerCount: null, emoji: '', midi: 71, isBlack: false },
  { note: 'C5', label: 'C5', solfege: 'Do', fingerCount: null, emoji: '', midi: 72, isBlack: false },
];

export class JingleBellsService {
  constructor() {
    this.notes = JINGLE_BELLS_NOTES;
    this.currentIndex = 0;
    this.mode = 'GUIDE'; // 'GUIDE' (Step-by-Step), 'TEMPO' (Rhythm flow), 'DEMO' (Auto-play)
    this.bpm = 92;
    this.beatDurationMs = (60 / this.bpm) * 1000;

    this.isPlaying = false;
    this.timerId = null;
    this.lastTriggerTime = 0;
    this.completedCount = 0;
    this.combo = 0;

    // Callbacks
    this.onNoteChanged = null;
    this.onNoteHit = null;
    this.onSongFinished = null;
    this.onTempoBeat = null;
  }

  reset() {
    this.stop();
    this.currentIndex = 0;
    this.completedCount = 0;
    this.combo = 0;
    if (this.onNoteChanged) {
      this.onNoteChanged(this.getCurrentNote(), this.currentIndex);
    }
  }

  setMode(mode) {
    this.stop();
    this.mode = mode;
    this.reset();
  }

  getCurrentNote() {
    return this.notes[this.currentIndex] || this.notes[0];
  }

  getNextNote() {
    return this.notes[this.currentIndex + 1] || null;
  }

  /**
   * Trigger note execution (via camera gesture, virtual button, or piano click)
   */
  triggerNote(index = this.currentIndex, isUserAction = true) {
    if (index < 0 || index >= this.notes.length) return null;

    const note = this.notes[index];
    const now = performance.now();

    // Prevent unintentional instant multi-triggers (debounce 160ms for user gestures)
    if (isUserAction && now - this.lastTriggerTime < 160) {
      return null;
    }
    this.lastTriggerTime = now;

    // 1. Play Authentic Piano Sound
    audioManager.init();
    audioManager.resume();
    audioManager.playPianoNote(note.note, { duration: note.duration * 0.45 + 0.35 });

    // 2. Play subtle sleigh bell chime on key phrase anchors
    if (note.lyric.includes('bells') || note.lyric.includes('sleigh') || note.beat === 1) {
      audioManager.playSleighBells();
    }

    // 3. Update completion progress
    this.completedCount = Math.max(this.completedCount, index + 1);
    this.combo++;

    if (this.onNoteHit) {
      this.onNoteHit(note, index, isUserAction);
    }

    // 4. Advance note
    const nextIdx = index + 1;
    if (nextIdx < this.notes.length) {
      this.currentIndex = nextIdx;
      if (this.onNoteChanged) {
        this.onNoteChanged(this.getCurrentNote(), this.currentIndex);
      }
    } else {
      // Song Completed!
      this.finish();
    }

    return note;
  }

  /**
   * Evaluate gesture recognition input from the camera or virtual controls
   */
  evaluateGesture(totalFingers, hasHand = true) {
    if (!hasHand || this.mode === 'DEMO') return null;

    const currentTarget = this.getCurrentNote();
    if (!currentTarget) return null;

    if (totalFingers === currentTarget.fingerCount) {
      return this.triggerNote(this.currentIndex, true);
    }

    return null;
  }

  /**
   * Jump to specific note (e.g. clicking directly on the sheet music)
   */
  jumpToNote(index) {
    if (index >= 0 && index < this.notes.length) {
      this.currentIndex = index;
      const note = this.notes[index];
      audioManager.playPianoNote(note.note, { duration: 0.6 });
      if (this.onNoteChanged) {
        this.onNoteChanged(note, this.currentIndex);
      }
    }
  }

  /**
   * Start Auto-Play Demo mode: plays smoothly through the 48 notes
   */
  startDemo() {
    this.stop();
    this.mode = 'DEMO';
    this.isPlaying = true;
    this.currentIndex = 0;

    const playNext = () => {
      if (!this.isPlaying) return;
      if (this.currentIndex >= this.notes.length) {
        this.finish();
        return;
      }

      const note = this.notes[this.currentIndex];
      this.triggerNote(this.currentIndex, false);

      // Duration in ms based on note beats
      const noteDelay = note.duration * (this.beatDurationMs * 0.95);
      this.timerId = setTimeout(playNext, noteDelay);
    };

    playNext();
  }

  /**
   * Start Steady Tempo / Rhythm mode
   */
  startTempo() {
    this.stop();
    this.mode = 'TEMPO';
    this.isPlaying = true;
    this.currentIndex = 0;

    let currentBeat = 0;

    const tick = () => {
      if (!this.isPlaying) return;

      currentBeat++;
      audioManager.playHiHat();

      // Downbeat kick & soft chord backing
      if (currentBeat % 4 === 1) {
        audioManager.playKick();
        const curNote = this.getCurrentNote();
        if (curNote && curNote.chord) {
          audioManager.playChord(curNote.chord, { duration: 1.2 });
        }
      }

      if (this.onTempoBeat) {
        this.onTempoBeat(currentBeat);
      }

      this.timerId = setTimeout(tick, this.beatDurationMs);
    };

    tick();
  }

  stop() {
    this.isPlaying = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  finish() {
    this.stop();
    audioManager.playRatingSFX(5);
    audioManager.playSleighBells();
    setTimeout(() => {
      audioManager.speakAnnouncer('Wonderful! Jingle Bells complete!');
    }, 400);

    if (this.onSongFinished) {
      this.onSongFinished({
        totalNotes: this.notes.length,
        combo: this.combo,
        accuracy: 100,
      });
    }
  }
}

export const jingleBellsService = new JingleBellsService();
