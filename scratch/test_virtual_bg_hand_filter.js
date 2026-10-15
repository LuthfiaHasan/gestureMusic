// test_virtual_bg_hand_filter.js
import { gestureRecognitionService } from '../src/services/GestureRecognitionService.js';
import { virtualBackgroundService } from '../src/services/VirtualBackgroundService.js';

console.log('=== TEST 1: VIRTUAL BACKGROUND MASK FILTERING ===');

// Setup mock segmentation mask (256x256)
// Person is centered: x: 0.35 to 0.65, y: 0.20 to 0.85
const mw = 256;
const mh = 256;
const mockMask = new Float32Array(mw * mh); // all 0 (background)
for (let y = 0; y < mh; y++) {
  for (let x = 0; x < mw; x++) {
    const normX = x / mw;
    const normY = y / mh;
    if (normX >= 0.35 && normX <= 0.65 && normY >= 0.20 && normY <= 0.85) {
      mockMask[y * mw + x] = 0.95; // solid foreground player
    }
  }
}

virtualBackgroundService.isEnabled = true;
virtualBackgroundService.hasValidMask = true;
virtualBackgroundService.maskWidth = mw;
virtualBackgroundService.maskHeight = mh;
virtualBackgroundService.latestConfidenceData = mockMask;

// Create a hand located in the background on the right (x: 0.82, y: 0.30 - exactly like user's screenshot!)
const backgroundHand = Array.from({ length: 21 }, () => ({ x: 0.82, y: 0.30 }));
backgroundHand[0] = { x: 0.82, y: 0.38 }; // wrist
backgroundHand[9] = { x: 0.82, y: 0.22 }; // middle MCP (diff = 0.16)
backgroundHand[5] = { x: 0.77, y: 0.25 };
backgroundHand[17] = { x: 0.87, y: 0.25 };

// Check if isHandInForeground correctly detects it as background
const isBgHandFg = virtualBackgroundService.isHandInForeground(backgroundHand);
console.log('Is background hand in foreground?', isBgHandFg);
if (isBgHandFg === false) {
  console.log('PASSED: isHandInForeground identified hand in virtual background as FALSE!');
} else {
  console.error('FAILED: isHandInForeground allowed background hand!');
  process.exit(1);
}

// Now process via GestureRecognitionService
const bgResult = gestureRecognitionService.process([backgroundHand], [[{ categoryName: 'Right' }]]);
console.log('GestureRecognition result for background hand hasHand:', bgResult.hasHand, 'totalFingers:', bgResult.totalFingers);
if (!bgResult.hasHand && bgResult.totalFingers === 0 && bgResult.validLandmarks.length === 0) {
  console.log('PASSED: GestureRecognitionService completely discarded background hand under virtual background!');
} else {
  console.error('FAILED: GestureRecognitionService leaked background hand!');
  process.exit(1);
}

console.log('\n=== TEST 2: FOREGROUND PLAYER HAND WITH VIRTUAL BACKGROUND ===');
// Create player hand in center (x: 0.50, y: 0.50) inside the foreground mask
const foregroundHand = Array.from({ length: 21 }, () => ({ x: 0.50, y: 0.50 }));
foregroundHand[0] = { x: 0.50, y: 0.65 }; // wrist in player chest area
foregroundHand[9] = { x: 0.50, y: 0.45 }; // middle MCP
foregroundHand[5] = { x: 0.44, y: 0.48 };
foregroundHand[17] = { x: 0.56, y: 0.48 };
// Open index finger (point)
foregroundHand[6] = { x: 0.44, y: 0.38 };
foregroundHand[7] = { x: 0.44, y: 0.30 };
foregroundHand[8] = { x: 0.44, y: 0.22 }; // index tip up

const isFgHandFg = virtualBackgroundService.isHandInForeground(foregroundHand);
console.log('Is foreground hand in foreground?', isFgHandFg);
if (isFgHandFg === true) {
  console.log('PASSED: Foreground hand correctly identified as TRUE!');
} else {
  console.error('FAILED: Foreground hand was rejected!');
  process.exit(1);
}

const fgResult = gestureRecognitionService.process([foregroundHand], [[{ categoryName: 'Right' }]]);
console.log('GestureRecognition result for player hand hasHand:', fgResult.hasHand, 'validLandmarks:', fgResult.validLandmarks.length);
if (fgResult.hasHand && fgResult.validLandmarks.length === 1) {
  console.log('PASSED: Player hand accepted and exported in validLandmarks for skeleton drawing!');
} else {
  console.error('FAILED: Player hand was not accepted!');
  process.exit(1);
}

console.log('\n=== TEST 3: TOO FAR / DISTANT HAND HANDLING ===');
// Hand that is too far away (handSize = 0.12 < 0.135)
const distantHand = Array.from({ length: 21 }, () => ({ x: 0.50, y: 0.50 }));
distantHand[0] = { x: 0.50, y: 0.60 }; // wrist
distantHand[9] = { x: 0.50, y: 0.48 }; // middle MCP (handSize = 0.12)
distantHand[5] = { x: 0.46, y: 0.50 };
distantHand[17] = { x: 0.54, y: 0.50 };

const farResult = gestureRecognitionService.process([distantHand], [[{ categoryName: 'Right' }]]);
console.log('Distant hand hasHand:', farResult.hasHand, 'totalFingers:', farResult.totalFingers, 'guidance:', farResult.guidance);
if (!farResult.hasHand && farResult.totalFingers === 0 && farResult.guidance === 'MOVE YOUR HAND CLOSER') {
  console.log('PASSED: Distant hand did NOT trigger false fingers, guided to MOVE YOUR HAND CLOSER!');
} else {
  console.error('FAILED: Distant hand incorrectly triggered fingers or confirmed!');
  process.exit(1);
}

console.log('\nALL VIRTUAL BACKGROUND & DISTANCE HAND TESTS PASSED PERFECTLY!');
