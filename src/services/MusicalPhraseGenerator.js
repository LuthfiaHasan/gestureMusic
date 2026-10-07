// MusicalPhraseGenerator.js - Indonesian Pop Musical Phrase & Chord Progression Generator
// Generates coherent, diatonic musical phrases inspired by popular Indonesian Pop genres.

export const POP_INDO_MOODS = [
  {
    id: 'romantic_pop',
    name: 'Romantic Pop',
    description: 'Sweet, warm, and heartfelt progressions with lush romantic cadences',
    tempo: 78,
  },
  {
    id: 'pop_ballad',
    name: 'Pop Ballad',
    description: 'Emotional piano ballad with gentle tension and grand resolution',
    tempo: 74,
  },
  {
    id: 'nostalgic_pop',
    name: 'Nostalgic Pop',
    description: 'Sentimental minor-major shifts reminiscent of golden era melodies',
    tempo: 82,
  },
  {
    id: 'acoustic_pop',
    name: 'Acoustic Pop',
    description: 'Intimate storytelling progressions with warm acoustic clarity',
    tempo: 90,
  },
  {
    id: 'emotional_pop',
    name: 'Emotional Pop',
    description: 'Deep emotional build-ups resolving into hopeful harmonic peaks',
    tempo: 76,
  },
  {
    id: 'happy_pop',
    name: 'Happy Pop',
    description: 'Uplifting, bright major cadences with optimistic bounce',
    tempo: 100,
  },
  {
    id: 'dreamy_pop',
    name: 'Dreamy Pop',
    description: 'Spacious, ethereal seventh chords and floating harmonies',
    tempo: 80,
  },
  {
    id: 'upbeat_pop',
    name: 'Upbeat Pop',
    description: 'Energetic cyclic groove with punchy harmonic transitions',
    tempo: 104,
  },
  {
    id: 'indonesian_pop',
    name: 'Indonesian Pop',
    description: 'Classic radio pop signature with memorable melodic contours',
    tempo: 86,
  },
];

// Diatonic scales mapped strictly to available gestures in GestureSynth:
// 0: Am, 1: C, 2: D, 3: Em, 4: F, 5: G, 6: A, 7: Bm, 8: Cmaj7, 9: Dm, 10: Em7
export const DIATONIC_KEYS = {
  'C_MAJOR': {
    name: 'C Major',
    root: 'C',
    type: 'major',
    degrees: {
      'I': 'C',
      'ii': 'Dm',
      'iii': 'Em',
      'IV': 'F',
      'V': 'G',
      'vi': 'Am',
      'Imaj7': 'Cmaj7',
      'iii7': 'Em7',
    },
    resolutions: ['I', 'Imaj7'],
    cadences: [
      ['V', 'I'],
      ['IV', 'I'],
      ['ii', 'V', 'I'],
      ['IV', 'V', 'I'],
    ],
  },
  'G_MAJOR': {
    name: 'G Major',
    root: 'G',
    type: 'major',
    degrees: {
      'I': 'G',
      'ii': 'Am',
      'iii': 'Bm',
      'IV': 'C',
      'V': 'D',
      'vi': 'Em',
      'vi7': 'Em7',
    },
    resolutions: ['I'],
    cadences: [
      ['V', 'I'],
      ['IV', 'I'],
      ['ii', 'V', 'I'],
      ['IV', 'V', 'I'],
    ],
  },
  'D_MAJOR': {
    name: 'D Major',
    root: 'D',
    type: 'major',
    degrees: {
      'I': 'D',
      'ii': 'Em',
      'IV': 'G',
      'V': 'A',
      'vi': 'Bm',
    },
    resolutions: ['I'],
    cadences: [
      ['V', 'I'],
      ['IV', 'I'],
      ['ii', 'V', 'I'],
    ],
  },
  'A_MINOR': {
    name: 'A Minor',
    root: 'Am',
    type: 'minor',
    degrees: {
      'i': 'Am',
      'III': 'C',
      'iv': 'Dm',
      'v': 'Em',
      'v7': 'Em7',
      'VI': 'F',
      'VII': 'G',
    },
    resolutions: ['i', 'III'],
    cadences: [
      ['VII', 'i'],
      ['VI', 'VII', 'i'],
      ['iv', 'v', 'i'],
      ['VI', 'VII', 'III'],
    ],
  },
  'E_MINOR': {
    name: 'E Minor',
    root: 'Em',
    type: 'minor',
    degrees: {
      'i': 'Em',
      'i7': 'Em7',
      'III': 'G',
      'iv': 'Am',
      'v': 'Bm',
      'VI': 'C',
      'VII': 'D',
    },
    resolutions: ['i', 'III'],
    cadences: [
      ['VII', 'i'],
      ['VI', 'VII', 'i'],
      ['iv', 'v', 'i'],
      ['VI', 'VII', 'III'],
    ],
  },
};

// Rich Library of authentic Indonesian Pop chord progression patterns (Roman numerals)
export const POP_PROGRESSION_LIBRARY = [
  // Major Key Archetypes
  {
    id: 'pop_anthem',
    name: 'I - V - vi - IV',
    scaleType: 'major',
    phraseA: ['I', 'V', 'vi', 'IV'],
    phraseAVar: ['I', 'V', 'IV', 'V'],
    phraseB: ['vi', 'iii', 'IV', 'V'],
    bridge: ['ii', 'V', 'I', 'vi'],
    resolution: ['I'],
  },
  {
    id: 'classic_ballad',
    name: 'I - vi - IV - V',
    scaleType: 'major',
    phraseA: ['I', 'vi', 'IV', 'V'],
    phraseAVar: ['I', 'vi', 'ii', 'V'],
    phraseB: ['IV', 'V', 'iii', 'vi'],
    bridge: ['ii', 'V', 'IV', 'V'],
    resolution: ['I'],
  },
  {
    id: 'emotional_minor_lift',
    name: 'vi - IV - I - V',
    scaleType: 'major',
    phraseA: ['vi', 'IV', 'I', 'V'],
    phraseAVar: ['vi', 'IV', 'V', 'I'],
    phraseB: ['IV', 'I', 'ii', 'V'],
    bridge: ['iii', 'vi', 'IV', 'V'],
    resolution: ['I'],
  },
  {
    id: 'bright_cadence',
    name: 'I - IV - V - I',
    scaleType: 'major',
    phraseA: ['I', 'IV', 'V', 'I'],
    phraseAVar: ['I', 'IV', 'vi', 'V'],
    phraseB: ['vi', 'ii', 'V', 'I'],
    bridge: ['IV', 'V', 'vi', 'V'],
    resolution: ['I'],
  },
  {
    id: 'subdominant_flow',
    name: 'I - V - IV - I',
    scaleType: 'major',
    phraseA: ['I', 'V', 'IV', 'I'],
    phraseAVar: ['I', 'V', 'vi', 'IV'],
    phraseB: ['IV', 'V', 'iii', 'vi'],
    bridge: ['ii', 'IV', 'V', 'I'],
    resolution: ['I'],
  },
  {
    id: 'romantic_longing',
    name: 'I - IV - vi - V',
    scaleType: 'major',
    phraseA: ['I', 'IV', 'vi', 'V'],
    phraseAVar: ['I', 'IV', 'ii', 'V'],
    phraseB: ['vi', 'IV', 'I', 'V'],
    bridge: ['iii', 'vi', 'ii', 'V'],
    resolution: ['I'],
  },
  {
    id: 'descending_ballad',
    name: 'vi - V - IV - I',
    scaleType: 'major',
    phraseA: ['vi', 'V', 'IV', 'I'],
    phraseAVar: ['vi', 'V', 'IV', 'V'],
    phraseB: ['IV', 'V', 'iii', 'vi'],
    bridge: ['ii', 'V', 'I', 'I'],
    resolution: ['I'],
  },
  {
    id: 'hopeful_climb',
    name: 'vi - IV - V - I',
    scaleType: 'major',
    phraseA: ['vi', 'IV', 'V', 'I'],
    phraseAVar: ['vi', 'ii', 'V', 'I'],
    phraseB: ['IV', 'V', 'I', 'vi'],
    bridge: ['ii', 'iii', 'IV', 'V'],
    resolution: ['I'],
  },
  {
    id: 'acoustic_warmth',
    name: 'I - vi - ii - V',
    scaleType: 'major',
    phraseA: ['I', 'vi', 'ii', 'V'],
    phraseAVar: ['I', 'IV', 'ii', 'V'],
    phraseB: ['iii', 'vi', 'ii', 'V'],
    bridge: ['IV', 'V', 'iii', 'vi'],
    resolution: ['I'],
  },
  {
    id: 'soft_pop_verse',
    name: 'I - IV - ii - V',
    scaleType: 'major',
    phraseA: ['I', 'IV', 'ii', 'V'],
    phraseAVar: ['I', 'vi', 'IV', 'V'],
    phraseB: ['vi', 'iii', 'IV', 'V'],
    bridge: ['ii', 'V', 'I', 'vi'],
    resolution: ['I'],
  },
  {
    id: 'circle_cadence',
    name: 'vi - ii - V - I',
    scaleType: 'major',
    phraseA: ['vi', 'ii', 'V', 'I'],
    phraseAVar: ['vi', 'IV', 'V', 'I'],
    phraseB: ['IV', 'V', 'iii', 'vi'],
    bridge: ['ii', 'V', 'IV', 'I'],
    resolution: ['I'],
  },
  {
    id: 'nostalgic_step',
    name: 'I - iii - IV - V',
    scaleType: 'major',
    phraseA: ['I', 'iii', 'IV', 'V'],
    phraseAVar: ['I', 'iii', 'vi', 'V'],
    phraseB: ['IV', 'V', 'iii', 'vi'],
    bridge: ['ii', 'IV', 'V', 'I'],
    resolution: ['I'],
  },
  {
    id: 'melancholic_drive',
    name: 'vi - iii - IV - V',
    scaleType: 'major',
    phraseA: ['vi', 'iii', 'IV', 'V'],
    phraseAVar: ['vi', 'IV', 'I', 'V'],
    phraseB: ['IV', 'V', 'iii', 'vi'],
    bridge: ['ii', 'V', 'I', 'I'],
    resolution: ['I'],
  },
  {
    id: 'royal_road',
    name: 'IV - V - iii - vi',
    scaleType: 'major',
    phraseA: ['IV', 'V', 'iii', 'vi'],
    phraseAVar: ['IV', 'V', 'I', 'vi'],
    phraseB: ['ii', 'V', 'I', 'vi'],
    bridge: ['IV', 'V', 'ii', 'V'],
    resolution: ['I'],
  },

  // Minor Key Archetypes
  {
    id: 'minor_emotional_ballad',
    name: 'i - VI - III - VII',
    scaleType: 'minor',
    phraseA: ['i', 'VI', 'III', 'VII'],
    phraseAVar: ['i', 'VI', 'VII', 'i'],
    phraseB: ['VI', 'VII', 'III', 'i'],
    bridge: ['iv', 'v', 'VI', 'VII'],
    resolution: ['i'],
  },
  {
    id: 'sentimental_cycle',
    name: 'i - iv - VII - III',
    scaleType: 'minor',
    phraseA: ['i', 'iv', 'VII', 'III'],
    phraseAVar: ['i', 'iv', 'v', 'i'],
    phraseB: ['VI', 'VII', 'III', 'i'],
    bridge: ['iv', 'v', 'VI', 'VII'],
    resolution: ['i'],
  },
  {
    id: 'nostalgic_minor_step',
    name: 'i - v - VI - VII',
    scaleType: 'minor',
    phraseA: ['i', 'v', 'VI', 'VII'],
    phraseAVar: ['i', 'VI', 'VII', 'i'],
    phraseB: ['VI', 'III', 'iv', 'v'],
    bridge: ['iv', 'v', 'VI', 'VII'],
    resolution: ['i'],
  },
  {
    id: 'deep_minor_verse',
    name: 'i - VI - iv - v',
    scaleType: 'minor',
    phraseA: ['i', 'VI', 'iv', 'v'],
    phraseAVar: ['i', 'VI', 'VII', 'i'],
    phraseB: ['VI', 'VII', 'III', 'i'],
    bridge: ['iv', 'v', 'i', 'i'],
    resolution: ['i'],
  },
  {
    id: 'pre_chorus_peak',
    name: 'VI - VII - i - i',
    scaleType: 'minor',
    phraseA: ['VI', 'VII', 'i', 'i'],
    phraseAVar: ['VI', 'VII', 'III', 'i'],
    phraseB: ['iv', 'v', 'VI', 'VII'],
    bridge: ['i', 'iv', 'v', 'i'],
    resolution: ['i'],
  },
];

export class MusicalPhraseGenerator {
  constructor() {
    this.recentKeys = [];
    this.recentProgressionIds = [];
    this.recentSequences = [];
    this.maxHistorySize = 6;
  }

  /**
   * Generates a musically coherent phrase for a given level
   * @param {number} level - Current game level (1 - 10)
   * @param {Object} options - Optional overrides
   * @returns {Object} MusicalPhrase metadata and chord sequence
   */
  generateMusicalPhrase(level = 1, options = {}) {
    const targetLength = this._determinePhraseLength(level, options.phraseLength);
    const mood = this._pickMood(options.moodId);
    const keyInfo = this._pickKey(level, options.keyId);
    const progression = this._pickProgression(keyInfo.type, options.progressionId);

    // Build the musical phrase with genuine Indonesian Pop structure:
    // Beginning (A) -> Development (A') -> Tension (B) -> Resolution
    const phraseResult = this._assembleMusicalPhrase(
      progression,
      keyInfo,
      targetLength,
      level
    );

    // Save history for anti-repetition
    this._recordHistory(keyInfo.id, progression.id, phraseResult.chords.join('-'));

    return {
      level,
      key: keyInfo.root,
      keyId: keyInfo.id,
      keyName: keyInfo.name,
      scale: keyInfo.type === 'major' ? 'Major' : 'Minor',
      mood: mood.name,
      moodDesc: mood.description,
      progressionName: progression.name,
      progressionId: progression.id,
      structure: phraseResult.structure,
      chords: phraseResult.chords,
      phraseLength: phraseResult.chords.length,
      displayPhrase: phraseResult.chords.join(' → '),
      tempo: mood.tempo,
    };
  }

  /**
   * Determine exact phrase length based on level
   */
  _determinePhraseLength(level, overrideLength) {
    if (overrideLength) return overrideLength;

    switch (level) {
      case 1:
        return 4; // Level 1: 4-chord iconic opening phrase (e.g. C -> G -> Am -> F)
      case 2:
        return 4; // Level 2: 4-chord phrase with alternate progression
      case 3:
        return 5; // Level 3: 5 chords (Phrase A + Resolution)
      case 4:
        return 6; // Level 4: 6 chords (Phrase A + Turnaround Cadence)
      case 5:
        return 7; // Level 5: 7 chords (Phrase A + Tension + Resolution)
      case 6:
        return 8; // Level 6: 8 chords (Phrase A + Phrase A' variation)
      case 7:
        return 9; // Level 7: 9 chords (Phrase A + Phrase A' + Resolution)
      case 8:
        return 10; // Level 8: 10 chords (Phrase A + Phrase A' + Phrase B)
      case 9:
        return 12; // Level 9: 12 chords (Phrase A + A' + B + Cadence)
      case 10:
      default:
        return 14; // Level 10: 14 chords (Complete Pop Ballad Sentence)
    }
  }

  _pickMood(overrideMoodId) {
    if (overrideMoodId) {
      const found = POP_INDO_MOODS.find(m => m.id === overrideMoodId);
      if (found) return found;
    }
    const idx = Math.floor(Math.random() * POP_INDO_MOODS.length);
    return POP_INDO_MOODS[idx];
  }

  /**
   * Picks a diatonic key, respecting anti-repetition and level restrictions
   */
  _pickKey(level, overrideKeyId) {
    const allKeys = Object.entries(DIATONIC_KEYS).map(([kId, val]) => ({
      id: kId,
      ...val,
    }));

    if (overrideKeyId) {
      const match = allKeys.find(k => k.id === overrideKeyId || k.root === overrideKeyId);
      if (match) return match;
    }

    // Early levels (1-3) prioritize C Major, G Major, A Minor, and E Minor
    let candidateKeys = allKeys;
    if (level <= 2) {
      candidateKeys = allKeys.filter(k => ['C_MAJOR', 'G_MAJOR', 'A_MINOR', 'D_MAJOR'].includes(k.id));
    }

    // Anti-repetition weighting: keys not used recently get priority
    const nonRecent = candidateKeys.filter(k => !this.recentKeys.includes(k.id));
    const pool = nonRecent.length > 0 ? nonRecent : candidateKeys;

    return pool[Math.floor(Math.random() * pool.length)];
  }

  /**
   * Picks a progression from the library matching the scale type, with anti-repetition
   */
  _pickProgression(scaleType, overrideProgressionId) {
    if (overrideProgressionId) {
      const match = POP_PROGRESSION_LIBRARY.find(p => p.id === overrideProgressionId);
      if (match) return match;
    }

    const matching = POP_PROGRESSION_LIBRARY.filter(p => p.scaleType === scaleType);
    const nonRecent = matching.filter(p => !this.recentProgressionIds.includes(p.id));
    const pool = nonRecent.length > 0 ? nonRecent : matching;

    return pool[Math.floor(Math.random() * pool.length)];
  }

  /**
   * Assembles a multi-part musical phrase:
   * A -> A' -> B -> Cadential Resolution
   */
  _assembleMusicalPhrase(progression, keyInfo, targetLength, level) {
    const degMap = keyInfo.degrees;

    // Helper: convert Roman numeral degrees into actual chords
    const mapDegreesToChords = (degreeList) => {
      return degreeList.map(deg => {
        if (degMap[deg]) return degMap[deg];
        // Graceful fallback for secondary degrees not in key
        if (deg === 'ii' && !degMap['ii']) return degMap['IV'] || degMap['I'];
        if (deg === 'iii' && !degMap['iii']) return degMap['v'] || degMap['I'];
        return degMap['I'] || 'C';
      });
    };

    const phraseAChords = mapDegreesToChords(progression.phraseA);
    const phraseAVarChords = mapDegreesToChords(progression.phraseAVar);
    const phraseBChords = mapDegreesToChords(progression.phraseB);
    const bridgeChords = mapDegreesToChords(progression.bridge || progression.phraseB);

    let assembled = [];
    let structureLabel = 'A';

    if (targetLength <= 4) {
      // 4 chords: Single iconic opening phrase (e.g. C - G - Am - F)
      assembled = [...phraseAChords.slice(0, targetLength)];
      structureLabel = 'Phrase A';
    } else if (targetLength === 5) {
      // 5 chords: Phrase A (4 chords) + Conclusive Tonic Resolution (1 chord)
      const resChord = degMap[progression.resolution[0]] || degMap['I'];
      assembled = [...phraseAChords.slice(0, 4), resChord];
      structureLabel = 'Phrase A + Resolution';
    } else if (targetLength === 6) {
      // 6 chords: Phrase A (4 chords) + Turnaround Cadence (2 chords)
      const cadDegrees = keyInfo.cadences[0] || ['V', 'I'];
      const cadChords = mapDegreesToChords(cadDegrees);
      assembled = [...phraseAChords.slice(0, 4), ...cadChords.slice(0, 2)];
      structureLabel = 'Phrase A + Turnaround';
    } else if (targetLength === 7) {
      // 7 chords: Phrase A (4 chords) + Phrase B development (2 chords) + Resolution (1 chord)
      const resChord = degMap[progression.resolution[0]] || degMap['I'];
      assembled = [...phraseAChords.slice(0, 4), ...phraseBChords.slice(0, 2), resChord];
      structureLabel = 'Phrase A + B + Resolution';
    } else if (targetLength === 8) {
      // 8 chords: Phrase A (4 chords) + Phrase A' variation (4 chords)
      assembled = [...phraseAChords.slice(0, 4), ...phraseAVarChords.slice(0, 4)];
      structureLabel = "Phrase A + Phrase A'";
    } else if (targetLength === 9) {
      // 9 chords: Phrase A (4) + Phrase A' (4) + Resolution (1)
      const resChord = degMap[progression.resolution[0]] || degMap['I'];
      assembled = [...phraseAChords.slice(0, 4), ...phraseAVarChords.slice(0, 4), resChord];
      structureLabel = "Phrase A + A' + Resolution";
    } else if (targetLength === 10) {
      // 10 chords: Phrase A (4) + Phrase A' (4) + Turnaround (2)
      const cadDegrees = keyInfo.cadences[0] || ['V', 'I'];
      const cadChords = mapDegreesToChords(cadDegrees);
      assembled = [...phraseAChords.slice(0, 4), ...phraseAVarChords.slice(0, 4), ...cadChords.slice(0, 2)];
      structureLabel = "Phrase A + A' + Cadence";
    } else if (targetLength <= 12) {
      // 12 chords: Phrase A (4) + Phrase A' (4) + Phrase B (3) + Resolution (1)
      const resChord = degMap[progression.resolution[0]] || degMap['I'];
      assembled = [
        ...phraseAChords.slice(0, 4),
        ...phraseAVarChords.slice(0, 4),
        ...phraseBChords.slice(0, 3),
        resChord,
      ];
      structureLabel = "Phrase A + A' + B + Resolution";
    } else {
      // 14-16 chords: Complete pop song form:
      // Verse A (4) + Verse A' (4) + Pre-Chorus B (4) + Conclusive Chorus Cadence (2)
      const cadDegrees = keyInfo.cadences[1] || keyInfo.cadences[0] || ['V', 'I'];
      const cadChords = mapDegreesToChords(cadDegrees);
      assembled = [
        ...phraseAChords.slice(0, 4),
        ...phraseAVarChords.slice(0, 4),
        ...phraseBChords.slice(0, 4),
        ...cadChords.slice(0, targetLength - 12),
      ];
      structureLabel = "Verse A + Verse A' + Pre-Chorus + Chorus Finale";
    }

    // Guarantee: Ensure the final chord provides a resolved ending
    assembled = this._ensureHarmonicResolution(assembled, keyInfo, progression);

    return {
      chords: assembled,
      structure: structureLabel,
    };
  }

  /**
   * Guarantees that the sequence does not end hanging on a tense chord (e.g. Dominant or Diminished)
   */
  _ensureHarmonicResolution(chordList, keyInfo, progression) {
    if (chordList.length <= 1) return chordList;

    const tonic = keyInfo.degrees['I'] || keyInfo.degrees['i'];
    const subdominant = keyInfo.degrees['IV'] || keyInfo.degrees['VI'];
    const relativeTonic = keyInfo.type === 'major' ? keyInfo.degrees['vi'] : keyInfo.degrees['III'];

    const validEndings = [tonic, relativeTonic, subdominant].filter(Boolean);
    const lastChord = chordList[chordList.length - 1];

    // If already resolving to a stable harmonic destination, leave as is
    if (validEndings.includes(lastChord)) {
      return chordList;
    }

    // Otherwise, gently resolve the last chord to Tonic
    const resolvedList = [...chordList];
    resolvedList[resolvedList.length - 1] = tonic || 'C';
    return resolvedList;
  }

  _recordHistory(keyId, progressionId, sequenceSig) {
    this.recentKeys.push(keyId);
    if (this.recentKeys.length > this.maxHistorySize) this.recentKeys.shift();

    this.recentProgressionIds.push(progressionId);
    if (this.recentProgressionIds.length > this.maxHistorySize) this.recentProgressionIds.shift();

    this.recentSequences.push(sequenceSig);
    if (this.recentSequences.length > this.maxHistorySize) this.recentSequences.shift();
  }

  clearHistory() {
    this.recentKeys = [];
    this.recentProgressionIds = [];
    this.recentSequences = [];
  }
}

export const musicalPhraseGenerator = new MusicalPhraseGenerator();
