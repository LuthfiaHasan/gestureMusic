// test_evaluation_rules.js
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 16);
globalThis.cancelAnimationFrame = clearTimeout;

import { RhythmEngine } from '../src/services/RhythmEngine.js';

const engine = new RhythmEngine();

const fakeLevelConfig = {
  bpm: 80,
  durationBeats: 4,
  timingWindows: { perfect: 220, great: 550, good: 1100, bad: 2000 }
};

const fakePhrase = {
  chords: ['C', 'F'] // C = 1 finger, F = 4 fingers
};

engine.setup(fakePhrase, fakeLevelConfig, 'CLASSIC');
engine.start();

console.log('--- TEST 1: NO HAND ON CAMERA ---');
// At count-in / beat 1 (currentTimeMs = 3000ms = Chord C start)
engine.currentTimeMs = 3100;
const targetC = engine.targets[0];
console.log('Target C:', targetC.chord, 'expected fingers:', targetC.fingerCount);

// Player shows no hand (hasHand = false, totalFingers = 0)
const noHandRes = engine.evaluateLiveTracking({
  hasHand: false,
  totalFingers: 0,
  timestamp: performance.now()
});
console.log('noHandRes:', noHandRes);
console.log('Target C isEvaluated:', targetC.isEvaluated, 'isHit:', targetC.isHit);
if (!targetC.isEvaluated && !noHandRes) {
  console.log('TEST 1 PASSED: No hand does not trigger hit or false perfect!');
} else {
  console.error('TEST 1 FAILED!');
  process.exit(1);
}

console.log('\n--- TEST 2: INTERMEDIATE FINGERS DURING TRANSITION ---');
// Fast forward to Chord F (startTimeMs = 6000ms, endTimeMs = 9000ms, fingerCount = 4)
// First mark target C as hit so we're on target F
targetC.isEvaluated = true;
targetC.isHit = true;

engine.currentTimeMs = 6200; // 200ms into Chord F
const targetF = engine.targets[1];
console.log('Target F:', targetF.chord, 'expected fingers:', targetF.fingerCount);

// Player is transitioning: hand has 2 fingers
const transRes = engine.evaluateLiveTracking({
  hasHand: true,
  totalFingers: 2,
  timestamp: performance.now()
});
console.log('transRes:', transRes);
console.log('Target F isEvaluated:', targetF.isEvaluated, 'isHit:', targetF.isHit);
if (!targetF.isEvaluated && !transRes) {
  console.log('TEST 2 PASSED: Intermediate gesture does NOT mark target as MISS!');
} else {
  console.error('TEST 2 FAILED!');
  process.exit(1);
}

console.log('\n--- TEST 3: PLAYER SETTLES ON CORRECT GESTURE ---');
// 200ms later (currentTimeMs = 6400ms, 400ms after start of Chord F)
engine.currentTimeMs = 6400;
const hitRes = engine.evaluateLiveTracking({
  hasHand: true,
  totalFingers: 4,
  timestamp: performance.now()
});
console.log('hitRes rating:', hitRes?.rating, 'timingDiffMs:', hitRes?.timingDiffMs);
console.log('Target F isEvaluated:', targetF.isEvaluated, 'isHit:', targetF.isHit);
if (targetF.isEvaluated && targetF.isHit && hitRes?.rating === 'GREAT') {
  console.log('TEST 3 PASSED: Correct gesture hits successfully as GREAT!');
} else {
  console.error('TEST 3 FAILED!');
  process.exit(1);
}

console.log('\n--- TEST 4: UNTOUCHED CHORD TURNS TO MISS AT END OF MEASURE ---');
// Create a new fresh phrase
const engine2 = new RhythmEngine();
engine2.setup({ chords: ['C'] }, fakeLevelConfig, 'CLASSIC');
engine2.start();
engine2.currentTimeMs = 3000;
const targetC2 = engine2.targets[0];
// End of measure is 6000ms. Move clock to 6010ms:
engine2.currentTimeMs = 6010;
engine2._checkMissedTargets();
console.log('Target C2 isEvaluated:', targetC2.isEvaluated, 'isHit:', targetC2.isHit, 'rating:', targetC2.rating);
if (targetC2.isEvaluated && !targetC2.isHit && targetC2.rating === 'MISS') {
  console.log('TEST 4 PASSED: Untouched target correctly evaluates as MISS at end of measure!');
} else {
  console.error('TEST 4 FAILED!');
  process.exit(1);
}

console.log('\nALL 4 LOGIC TESTS PASSED PERFECTLY!');
engine.stop();
engine2.stop();
