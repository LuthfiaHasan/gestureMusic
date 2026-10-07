// ChordMappingService.js - Configurable gesture-to-chord mapping

export class ChordMappingService {
  constructor() {
    // Default finger count mapping as specified in requirements
    this.fingerCountMap = {
      0: { chord: 'Am', name: 'A Minor', emoji: '✊', label: 'Fist (0 Fingers)' },
      1: { chord: 'C', name: 'C Major', emoji: '☝️', label: '1 Finger' },
      2: { chord: 'D', name: 'D Major', emoji: '✌️', label: '2 Fingers' },
      3: { chord: 'Em', name: 'E Minor', emoji: '🤟', label: '3 Fingers' },
      4: { chord: 'F', name: 'F Major', emoji: '🖐️ (4)', label: '4 Fingers' },
      5: { chord: 'G', name: 'G Major', emoji: '🖐️', label: 'Open Palm (5)' },
      6: { chord: 'A', name: 'A Major', emoji: '🖐️ + ☝️', label: '6 Fingers (Two Hands)' },
      7: { chord: 'Bm', name: 'B Minor', emoji: '🖐️ + ✌️', label: '7 Fingers (Two Hands)' },
      8: { chord: 'Cmaj7', name: 'C Major 7', emoji: '🖐️ + 3', label: '8 Fingers (Two Hands)' },
      9: { chord: 'Dm', name: 'D Minor', emoji: '🖐️ + 4', label: '9 Fingers (Two Hands)' },
      10: { chord: 'Em7', name: 'E Minor 7', emoji: '🖐️ + 🖐️', label: '10 Fingers (Both Palms)' },
    };

    // Advanced gesture shape variations (unlocked in later levels)
    this.gestureShapeMap = {
      'OPEN_PALM': 'G',
      'FIST': 'Am',
      'THUMB_UP': 'C7',
      'PEACE': 'D',
      'POINT': 'C',
      'FOUR_FINGERS': 'F7',
    };
  }

  /**
   * Get chord for detected finger count and optional shape variation
   */
  getChord(fingerCount, shapeType = null, level = 1) {
    // For early levels (1-6), strictly use finger counts for maximum predictability and natural feel
    if (level <= 6 || !shapeType || !this.gestureShapeMap[shapeType]) {
      const entry = this.fingerCountMap[fingerCount];
      return entry ? entry.chord : 'C';
    }

    // In higher levels, gesture shape variations can map to 7th qualities when configured
    if (shapeType === 'THUMB_UP') return 'C7';

    const entry = this.fingerCountMap[fingerCount];
    return entry ? entry.chord : 'C';
  }

  getMappingDetails(fingerCount) {
    return this.fingerCountMap[fingerCount] || {
      chord: 'C',
      name: 'C Major',
      emoji: '🖐️',
      label: `${fingerCount} Fingers`
    };
  }

  getFingerCountForChord(chordSymbol) {
    for (const [fingers, data] of Object.entries(this.fingerCountMap)) {
      if (data.chord.toLowerCase() === chordSymbol.toLowerCase()) {
        return parseInt(fingers, 10);
      }
    }
    return 1; // default 1
  }

  getAllMappings() {
    return Object.entries(this.fingerCountMap).map(([count, data]) => ({
      fingerCount: parseInt(count, 10),
      ...data
    }));
  }

  /**
   * Allows customizing the chord mapping at runtime without touching gesture detection logic
   */
  setMapping(fingerCount, chordSymbol, name = null) {
    if (this.fingerCountMap[fingerCount]) {
      this.fingerCountMap[fingerCount].chord = chordSymbol;
      if (name) this.fingerCountMap[fingerCount].name = name;
    }
  }
}

export const chordMappingService = new ChordMappingService();
