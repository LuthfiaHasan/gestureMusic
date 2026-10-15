// scratch/test_komang_30s_random.js
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};
globalThis.Audio = class {
  constructor() {
    this.currentTime = 0;
    this.duration = 240;
    this.volume = 1;
    this.paused = true;
  }
  play() {
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
  addEventListener() {}
  removeEventListener() {}
};
globalThis.AudioContext = class {
  constructor() {
    this.currentTime = 0;
  }
  resume() { return Promise.resolve(); }
  createGain() {
    return {
      gain: {
        setValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
      },
      connect: () => {},
    };
  }
  createOscillator() { return { connect: () => {}, start: () => {}, stop: () => {}, frequency: { setValueAtTime: () => {} } }; }
};
globalThis.window = {
  devicePixelRatio: 1,
  AudioContext: globalThis.AudioContext,
  location: { hostname: 'localhost', origin: 'http://localhost:3000', pathname: '/' },
  addEventListener: () => {},
  removeEventListener: () => {},
};
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 16);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

import assert from 'assert';

console.log('--- Testing KOMANG_SEGMENTS & 30s Random Session Logic ---');

const { KOMANG_SEGMENTS, KomangService } = await import('../src/services/KomangService.js');

// 1. Verify 8 segments have diverse start chords and gestures
assert.strictEqual(KOMANG_SEGMENTS.length, 8, 'Must have 8 segments');
const chords = KOMANG_SEGMENTS.map(s => s.startChord);
console.log('Segments start chords:', chords);
assert(chords.includes('G'), 'Must include G');
assert(chords.includes('D/F#'), 'Must include D/F#');
assert(chords.includes('Am'), 'Must include Am');
assert(chords.includes('Cm'), 'Must include Cm');

const startingFingers = KOMANG_SEGMENTS.map(s => s.fingerCount);
console.log('Segments starting finger counts:', startingFingers);
assert(startingFingers.includes(1), 'Must include 1 finger');
assert(startingFingers.includes(2), 'Must include 2 fingers');
assert(startingFingers.includes(3), 'Must include 3 fingers');
assert(startingFingers.includes(4), 'Must include 4 fingers');

// 2. Verify startSec are distinct
const startSecs = KOMANG_SEGMENTS.map(s => s.startSec);
const uniqueStartSecs = new Set(startSecs);
assert.strictEqual(uniqueStartSecs.size, 8, 'All 8 segments must have unique start times');
console.log('Segments unique startSec:', startSecs);

// 3. Test KomangService random picking and reset
const svc = new KomangService();
assert(svc.currentSegment, 'Should initialize with a valid segment');
console.log('Initial picked segment:', svc.currentSegment.title, 'Chord:', svc.currentSegment.startChord);

// Pick 20 times and ensure different segments are selected
const pickedIds = new Set();
for (let i = 0; i < 20; i++) {
  const seg = svc.pickRandomSegment(true);
  pickedIds.add(seg.id);
}
console.log(`Picked ${pickedIds.size} distinct segments over 20 randomizations`);
assert(pickedIds.size > 1, 'Should pick varying segments');

// 4. Test 30s session finish and restart lifecycle
svc.isFinished = true;
svc.isPlaying = false;
// When user calls play()
svc.play();
assert.strictEqual(svc.isFinished, false, 'play() must reset isFinished to false so subsequent 30s stops work!');
assert.strictEqual(svc.isPlaying, true, 'isPlaying should be true');

// Call finish()
svc.finish();
assert.strictEqual(svc.isFinished, true, 'finish() should set isFinished to true');
assert.strictEqual(svc.isPlaying, false, 'finish() should set isPlaying to false');

// Calling finish again shouldn't crash
svc.finish();
assert.strictEqual(svc.isFinished, true);

console.log('✅ ALL KOMANG 30S RANDOM & TIMEOUT LIFECYCLE TESTS PASSED!');
process.exit(0);
