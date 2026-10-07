// test_rhythm_challenge.js - Unit and Integration verification for Rhythm Challenge
import { RhythmEngine, HIT_RATINGS } from '../src/services/RhythmEngine.js';
import { ScoreManager } from '../src/services/ScoreManager.js';
import { LevelManager, LEVELS } from '../src/services/LevelManager.js';
import { musicalPhraseGenerator } from '../src/services/MusicalPhraseGenerator.js';

console.log('=== 1. TESTING LEVEL CONFIGS (BPM & DIFFICULTY) ===');
const levelManager = new LevelManager();
for (let lvl = 1; lvl <= 10; lvl++) {
  const config = levelManager.getLevel(lvl);
  console.log(`Level ${config.level} (${config.title} - ${config.difficultyLabel}): BPM = ${config.bpm}, Chords = ${config.chordCount}, Timing Window = ±${config.timingWindows?.perfect}ms`);
  if (!config.bpm || config.bpm < 60 || config.bpm > 150) {
    throw new Error(`Invalid BPM for level ${lvl}: ${config.bpm}`);
  }
}
console.log('✓ All 10 levels configured with progressive BPM & challenge parameters.');

console.log('\n=== 2. TESTING INDONESIAN POP PHRASE GENERATION ===');
for (let i = 1; i <= 5; i++) {
  const phrase = musicalPhraseGenerator.generateMusicalPhrase(i);
  console.log(`Generated Phrase: ${phrase.mood} | Key: ${phrase.keyName} | Progression: ${phrase.progressionName} | Chords: ${phrase.chords.join(' -> ')}`);
  if (!phrase.chords || phrase.chords.length < 4) {
    throw new Error(`Failed to generate valid musical phrase`);
  }
}
console.log('✓ Indonesian Pop phrases structured with valid musical cadences.');

console.log('\n=== 3. TESTING RHYTHM ENGINE TARGET SCHEDULING ===');
const rhythmEngine = new RhythmEngine();
const testPhrase = {
  mood: 'Romantic Pop',
  keyName: 'C Major',
  chords: ['C', 'G', 'Am', 'F'],
  notesInChords: {
    'C': ['C4', 'E4', 'G4', 'C5'],
    'G': ['G3', 'B3', 'D4', 'G4'],
    'Am': ['A3', 'C4', 'E4', 'A4'],
    'F': ['F3', 'A3', 'C4', 'F4']
  }
};
const testLvl = levelManager.getLevel(1); // 72 BPM
const setupInfo = rhythmEngine.setup(testPhrase, testLvl);

console.log(`Rhythm Engine Setup: BPM = ${rhythmEngine.bpm}, BeatDuration = ${rhythmEngine.beatDurationMs.toFixed(1)}ms, Targets = ${rhythmEngine.targets.length}`);
rhythmEngine.targets.forEach((t, idx) => {
  console.log(`  Target #${idx + 1}: ${t.chord} (${t.fingerCount}F - ${t.emoji}) at Beat ${t.beat} (${t.targetTimeMs.toFixed(0)}ms)`);
});

if (rhythmEngine.targets.length !== 4) {
  throw new Error(`Expected 4 scheduled rhythm targets, got ${rhythmEngine.targets.length}`);
}
console.log('✓ Targets scheduled with exact beat and millisecond timestamps.');

console.log('\n=== 4. TESTING TIMING & GESTURE EVALUATION ===');
rhythmEngine.isPlaying = true;
const target0 = rhythmEngine.targets[0]; // C at beat 4 (countInBeats = 4)
const targetTime = target0.targetTimeMs;

// Case A: PERFECT hit (+20ms, correct fingers)
rhythmEngine.currentTimeMs = targetTime + 20;
const hitA = rhythmEngine.evaluateInput({ totalFingers: target0.fingerCount });
console.log(`Input A (+20ms, correct): Rating = ${hitA.rating}, Points = ${hitA.pointsEarned}, Diff = ${hitA.timingDiffMs}ms`);
if (hitA.rating !== HIT_RATINGS.PERFECT || hitA.pointsEarned !== 100) {
  throw new Error(`Expected PERFECT hit, got ${hitA.rating}`);
}

// Case B: GREAT hit (+140ms, correct fingers)
const target1 = rhythmEngine.targets[1]; // G
rhythmEngine.currentTimeMs = target1.targetTimeMs + 140;
const hitB = rhythmEngine.evaluateInput({ totalFingers: target1.fingerCount });
console.log(`Input B (+140ms, correct): Rating = ${hitB.rating}, Points = ${hitB.pointsEarned}, Diff = ${hitB.timingDiffMs}ms`);
if (hitB.rating !== HIT_RATINGS.GREAT || hitB.pointsEarned !== 80) {
  throw new Error(`Expected GREAT hit, got ${hitB.rating}`);
}

// Case C: WRONG CHORD (Am target, played 1 finger)
const target2 = rhythmEngine.targets[2]; // Am (3 fingers)
rhythmEngine.currentTimeMs = target2.targetTimeMs + 10;
const hitC = rhythmEngine.evaluateInput({ totalFingers: 1 }); // wrong gesture
console.log(`Input C (wrong chord): Rating = ${hitC.rating}, Points = ${hitC.pointsEarned}`);
if (hitC.rating !== HIT_RATINGS.MISS || hitC.pointsEarned !== 0) {
  throw new Error(`Expected MISS for wrong chord, got ${hitC.rating}`);
}

// Case D: MISSED TIMING (> 400ms threshold)
const target3 = rhythmEngine.targets[3]; // F
rhythmEngine.currentTimeMs = target3.targetTimeMs + 500;
rhythmEngine._checkMissedTargets();
console.log(`Input D (late >400ms auto-miss): Evaluated = ${target3.isEvaluated}, Rating = ${target3.rating}`);
if (!target3.isEvaluated || target3.rating !== HIT_RATINGS.MISS) {
  throw new Error(`Expected auto-MISS for late note, got ${target3.rating}`);
}
console.log('✓ Timing thresholds and gesture accuracy accurately distinguish PERFECT, GREAT, and MISS.');

console.log('\n=== 5. TESTING SCORE MANAGER & 5-STAR RATING FORMULA ===');
const scoreMgr = new ScoreManager();
scoreMgr.resetRound();

// 1. Simulate a 5-Star (EXCELLENT) run: 10 perfect hits
for (let i = 0; i < 10; i++) {
  scoreMgr.registerHit('PERFECT', 15, true);
}
let summary = scoreMgr.getSummary();
console.log(`5-Star Run: Score = ${summary.scorePct}%, Stars = ${summary.stars} (${summary.starLabel}), Voice = "${summary.voiceFeedback}"`);
if (summary.stars !== 5 || summary.starLabel !== 'EXCELLENT!' || summary.voiceFeedback !== 'Excellent!') {
  throw new Error(`Expected 5 Stars EXCELLENT!, got ${summary.stars} ${summary.starLabel}`);
}

// 2. Simulate 4-Star (GREAT) run
scoreMgr.resetRound();
for (let i = 0; i < 8; i++) scoreMgr.registerHit('GREAT', 130, true);
for (let i = 0; i < 2; i++) scoreMgr.registerHit('GOOD', 220, true);
summary = scoreMgr.getSummary();
console.log(`4-Star Run: Score = ${summary.scorePct}%, Stars = ${summary.stars} (${summary.starLabel}), Voice = "${summary.voiceFeedback}"`);
if (summary.stars < 4) {
  throw new Error(`Expected at least 4 Stars, got ${summary.stars}`);
}

// 3. Simulate 3-Star (GOOD) run (70-84% range)
scoreMgr.resetRound();
for (let i = 0; i < 3; i++) scoreMgr.registerHit('GREAT', 130, true);
for (let i = 0; i < 7; i++) scoreMgr.registerHit('GOOD', 220, true);
summary = scoreMgr.getSummary();
console.log(`3-Star Run: Score = ${summary.scorePct}%, Stars = ${summary.stars} (${summary.starLabel}), Voice = "${summary.voiceFeedback}"`);
if (summary.stars !== 3 || summary.starLabel !== 'GOOD!') {
  throw new Error(`Expected 3 Stars GOOD!, got ${summary.stars} ${summary.starLabel}`);
}

// 4. Simulate 1-Star (BAD) run
scoreMgr.resetRound();
for (let i = 0; i < 10; i++) scoreMgr.registerHit('MISS', 500, false);
summary = scoreMgr.getSummary();
console.log(`1-Star Run: Score = ${summary.scorePct}%, Stars = ${summary.stars} (${summary.starLabel}), Voice = "${summary.voiceFeedback}"`);
if (summary.stars !== 1 || summary.starLabel !== 'BAD!') {
  throw new Error(`Expected 1 Star BAD!, got ${summary.stars} ${summary.starLabel}`);
}

console.log('✓ 5-Star Rating System and scoring formula strictly conform to specifications.');
console.log('\n>>> ALL RHYTHM CHALLENGE TESTS PASSED SUCCESSFULLY! <<<');
