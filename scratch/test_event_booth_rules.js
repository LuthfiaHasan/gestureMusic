// test_event_booth_rules.js
import { LEVELS, levelManager } from '../src/services/LevelManager.js';
import { scoreManager } from '../src/services/ScoreManager.js';
import { gestureRecognitionService } from '../src/services/GestureRecognitionService.js';

console.log('=== TEST 1: MAX LEVEL VERIFICATION ===');
console.log('Total Levels in LEVELS:', LEVELS.length);
if (LEVELS.length === 8 && levelManager.getLevel(10).level === 8) {
  console.log('TEST 1 PASSED: Max level is strictly 8!');
} else {
  console.error('TEST 1 FAILED: Max level is not 8!');
  process.exit(1);
}

console.log('\n=== TEST 2: ANTI-PASSERBY HAND FILTERING ===');
// Create a fake small passerby hand (handSize ~ 0.05, distant background)
const passerbyHand = Array.from({ length: 21 }, () => ({ x: 0.8, y: 0.2 }));
passerbyHand[0] = { x: 0.8, y: 0.25 }; // wrist
passerbyHand[9] = { x: 0.8, y: 0.20 }; // middle MCP (diff = 0.05)
passerbyHand[5] = { x: 0.79, y: 0.22 };
passerbyHand[17] = { x: 0.81, y: 0.22 };

const passerbyRes = gestureRecognitionService.process([passerbyHand], [[{ categoryName: 'Right' }]]);
console.log('Passerby only result hasHand:', passerbyRes.hasHand);
if (!passerbyRes.hasHand) {
  console.log('TEST 2A PASSED: Small passerby in background was successfully filtered out!');
} else {
  console.error('TEST 2A FAILED: Passerby was not filtered out!');
  process.exit(1);
}

// Create a realistic player hand in foreground (handSize ~ 0.22, centered)
const playerHand = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 }));
playerHand[0] = { x: 0.5, y: 0.7 }; // wrist
playerHand[9] = { x: 0.5, y: 0.48 }; // middle MCP (diff = 0.22)
playerHand[5] = { x: 0.43, y: 0.52 }; // index MCP
playerHand[17] = { x: 0.57, y: 0.52 }; // pinky MCP
// Make index finger open:
playerHand[6] = { x: 0.43, y: 0.40 };
playerHand[7] = { x: 0.43, y: 0.32 };
playerHand[8] = { x: 0.43, y: 0.24 }; // tip high up

// Now test mixed scenario: Player hand + Passerby hand both in frame!
const mixedRes = gestureRecognitionService.process(
  [playerHand, passerbyHand], 
  [[{ categoryName: 'Right' }], [{ categoryName: 'Left' }]], 
  false // single hand mode
);
console.log('Mixed frame hasHand:', mixedRes.hasHand, 'active hands:', mixedRes.activeFingersPerHand.length);
if (mixedRes.hasHand && mixedRes.activeFingersPerHand.length === 1) {
  console.log('TEST 2B PASSED: Selected ONLY player hand, passerby completely discarded!');
} else {
  console.error('TEST 2B FAILED: Passerby leaked into active hands!');
  process.exit(1);
}

console.log('\n=== TEST 3: CAMPAIGN CUMULATIVE SCORE & PRIZE ELIGIBILITY ===');
scoreManager.resetCampaign();
// Simulate player completing levels 1 to 8 with scores:
// Level 1: 90%, Level 2: 85%, Level 3: 88%, Level 4: 82%, Level 5: 80%, Level 6: 78%, Level 7: 84%, Level 8: 86%
const mockScores = [90, 85, 88, 82, 80, 78, 84, 86];
mockScores.forEach((score, idx) => {
  scoreManager.recordLevelScore(idx + 1, score);
});

const grandSummary = scoreManager.getCampaignGrandSummary();
console.log('Grand Total Score:', grandSummary.grandScorePct + '%');
console.log('Completed Count:', grandSummary.completedCount);
console.log('Prize Tier:', grandSummary.prizeTier);
console.log('Prize Title:', grandSummary.prizeTitle);
console.log('Is Grand Finale:', grandSummary.isGrandFinale);

// Average of [90, 85, 88, 82, 80, 78, 84, 86] = 673 / 8 = 84.125 -> 84%
if (grandSummary.grandScorePct === 84 && grandSummary.prizeTier === 'SPECIAL_MERCH' && grandSummary.isGrandFinale) {
  console.log('TEST 3 PASSED: Cumulative score & prize eligibility calculated accurately!');
} else {
  console.error('TEST 3 FAILED!');
  process.exit(1);
}

// Test Grand Prize tier (>= 85%)
mockScores.forEach((score, idx) => {
  scoreManager.recordLevelScore(idx + 1, 92);
});
const grandPrizeSummary = scoreManager.getCampaignGrandSummary();
console.log('Grand Prize tier check:', grandPrizeSummary.grandScorePct + '% ->', grandPrizeSummary.prizeTier);
if (grandPrizeSummary.grandScorePct === 92 && grandPrizeSummary.prizeTier === 'GRAND_PRIZE') {
  console.log('TEST 3B PASSED: Grand Prize tier correctly unlocked!');
} else {
  console.error('TEST 3B FAILED!');
  process.exit(1);
}

console.log('\nALL EVENT BOOTH VERIFICATION TESTS PASSED PERFECTLY!');
