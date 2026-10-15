// GestureRecognitionService.js - Ultra-Fast Low-Latency Finger Detection & Temporal Confirmation
// Features: 2-frame fast confirmation (~50ms), immediate old-gesture eviction, noise filtering, and latency measurement.

export class GestureRecognitionService {
  constructor() {
    // Fast temporal confirmation parameters
    // 2 consecutive frames (~50-60ms at 30-40 FPS) provides rock-solid anti-flicker noise filtering
    // while responding 4x to 6x faster than legacy 200ms+ debounce!
    this.requiredConfirmationFrames = 2;
    this.maxConfirmationDurationMs = 75; // Max time window for fast confirmation

    // Active state
    this.confirmedFingers = 0;
    this.confirmedShape = 'NONE';
    this.candidateFingers = null;
    this.candidateShape = 'NONE';
    this.candidateFrames = 0;
    this.candidateStartTime = 0;

    // Latency & Metrics (Requirement 17)
    this.lastTransitionLatencyMs = 0;
    this.lastGestureCalcMs = 0;

    // Guidance status
    this.guidanceMessage = 'SHOW YOUR HAND';

    // Callback on confirmed gesture lock-in
    this.onGestureConfirmed = null;
    // Callback on stability progress (0 to 1)
    this.onStabilityProgress = null;
  }

  /**
   * Process MediaPipe landmarks and return analyzed gesture data with low latency
   */
  process(landmarksList, handednessList, requiredTwoHands = false, frameMeta = {}) {
    const now = performance.now();
    const calcStart = performance.now();

    if (!landmarksList || landmarksList.length === 0) {
      this.guidanceMessage = 'SHOW YOUR HAND';
      this.resetCandidate();
      this.lastGestureCalcMs = +(performance.now() - calcStart).toFixed(2);
      return {
        hasHand: false,
        totalFingers: 0,
        confirmedFingers: 0,
        leftFingers: 0,
        rightFingers: 0,
        gestureType: 'NONE',
        guidance: this.guidanceMessage,
        activeFingersPerHand: [],
        stability: 0,
        gestureCalcMs: this.lastGestureCalcMs,
        transitionLatencyMs: this.lastTransitionLatencyMs,
        profiling: null,
      };
    }

    // -------------------------------------------------------------
    // EVENT MODE: ANTI-PASSERBY & PROXIMITY HAND FILTERING
    // -------------------------------------------------------------
    // Discard hands from people walking in the background or extreme edges,
    // and strictly select only the player's dominant hand(s) in front of camera.
    const candidateHands = [];

    landmarksList.forEach((landmarks, idx) => {
      const wrist = landmarks[0];
      const middleMCP = landmarks[9];
      const indexMCP = landmarks[5];
      const pinkyMCP = landmarks[17];

      // Hand dimensions in normalized space
      const handSize = Math.hypot(wrist.x - middleMCP.x, wrist.y - middleMCP.y);
      const palmWidth = Math.hypot(indexMCP.x - pinkyMCP.x, indexMCP.y - pinkyMCP.y);

      // Discard small hands (< 0.09): Background passersby far away!
      if (handSize < 0.09 || palmWidth < 0.035) {
        return;
      }

      // Discard hands at extreme screen edges (people walking into frame edge)
      if (wrist.x < 0.03 || wrist.x > 0.97 || wrist.y < 0.03 || wrist.y > 0.97) {
        return;
      }

      // Proximity score: larger hand (closer to camera) + closer to central player zone
      const distFromCenter = Math.hypot(wrist.x - 0.5, wrist.y - 0.6);
      const playerPriority = handSize * 2.5 - distFromCenter * 0.9;

      candidateHands.push({
        landmarks,
        handedness: handednessList[idx],
        handSize,
        playerPriority,
        origIdx: idx,
      });
    });

    // If no candidate hands passed proximity filter (e.g. only background passersby or no hand):
    if (candidateHands.length === 0) {
      this.guidanceMessage = 'SHOW YOUR HAND TO CAMERA';
      this.resetCandidate();
      this.lastGestureCalcMs = +(performance.now() - calcStart).toFixed(2);
      return {
        hasHand: false,
        totalFingers: 0,
        confirmedFingers: 0,
        leftFingers: 0,
        rightFingers: 0,
        gestureType: 'NONE',
        guidance: this.guidanceMessage,
        activeFingersPerHand: [],
        stability: 0,
        gestureCalcMs: this.lastGestureCalcMs,
        transitionLatencyMs: this.lastTransitionLatencyMs,
        profiling: null,
      };
    }

    // Sort candidate hands: closest player hand first
    candidateHands.sort((a, b) => b.playerPriority - a.playerPriority);

    // For single-hand challenge, strictly keep ONLY the single most dominant player hand!
    // For two-hand challenge, keep at most 2 hands.
    const maxHandsToKeep = requiredTwoHands ? 2 : 1;
    const selectedHands = candidateHands.slice(0, maxHandsToKeep);

    let leftFingers = 0;
    let rightFingers = 0;
    let primaryHandShape = 'UNKNOWN';
    const activeFingersPerHand = [];
    let isTooFar = false;

    selectedHands.forEach((item, idx) => {
      const landmarks = item.landmarks;
      let isLeft = false;

      if (selectedHands.length === 2) {
        const side0 = selectedHands[0].handedness?.[0]?.categoryName?.toLowerCase();
        const side1 = selectedHands[1].handedness?.[0]?.categoryName?.toLowerCase();
        if (side0 && side1 && side0 !== side1) {
          isLeft = (item.handedness?.[0]?.categoryName?.toLowerCase() === 'left');
        } else {
          isLeft = (landmarks[0].x < selectedHands[1 - idx].landmarks[0].x);
        }
      } else {
        const detectedSide = item.handedness?.[0]?.categoryName?.toLowerCase();
        isLeft = detectedSide ? detectedSide === 'left' : (idx === 0);
      }

      if (item.handSize < 0.11) {
        isTooFar = true;
      }

      // Detect each finger
      const fingers = this._analyzeHandFingers(landmarks, isLeft);
      activeFingersPerHand.push(fingers.states);

      if (idx === 0) {
        leftFingers = fingers.count;
        primaryHandShape = fingers.shape;
      } else {
        rightFingers = fingers.count;
      }
    });

    const tFingerEnd = performance.now();

    // Sum open fingers across selected player hands only
    const totalFingers = activeFingersPerHand.reduce(
      (acc, states) => acc + states.filter(Boolean).length, 
      0
    );

    // Guidance evaluation
    if (isTooFar) {
      this.guidanceMessage = 'MOVE YOUR HAND CLOSER';
    } else if (requiredTwoHands && landmarksList.length < 2 && totalFingers <= 5) {
      this.guidanceMessage = 'SHOW BOTH HANDS';
    } else {
      this.guidanceMessage = 'GESTURE READY';
    }

    // -------------------------------------------------------------
    // FAST TEMPORAL CONFIRMATION (Requirements 7, 8, 9, 10):
    // -------------------------------------------------------------
    let isNewConfirmation = false;
    let stabilityProgress = 1.0;

    if (totalFingers === this.confirmedFingers) {
      // Current gesture matches confirmed: keep stable
      this.candidateFingers = null;
      this.candidateFrames = 0;
      stabilityProgress = 1.0;
    } else {
      // Finger count is changing!
      if (this.candidateFingers === totalFingers) {
        this.candidateFrames++;
        const elapsed = now - this.candidateStartTime;
        stabilityProgress = Math.min(1.0, this.candidateFrames / this.requiredConfirmationFrames);

        // Confirm when 2 consecutive frames match OR elapsed >= 70ms with >= 2 frames
        if (this.candidateFrames >= this.requiredConfirmationFrames || elapsed >= this.maxConfirmationDurationMs) {
          // GESTURE CONFIRMED AT HIGH SPEED!
          const tGestureEnd = performance.now();
          this.lastTransitionLatencyMs = Math.max(1, Math.round(now - this.candidateStartTime));
          this.confirmedFingers = totalFingers;
          this.confirmedShape = primaryHandShape;
          this.candidateFingers = null;
          this.candidateFrames = 0;
          stabilityProgress = 1.0;
          isNewConfirmation = true;

          const gestureEvent = {
            hasHand: true,
            totalFingers,
            confirmedFingers: totalFingers,
            leftFingers,
            rightFingers,
            gestureType: primaryHandShape,
            timestamp: now,
            activeFingersPerHand,
            transitionLatencyMs: this.lastTransitionLatencyMs,
            profiling: {
              tCamera: frameMeta.tCamera || now,
              tMediaPipe: frameMeta.tMediaPipe || now,
              tFinger: tFingerEnd,
              tGesture: tGestureEnd,
              cameraToMediaPipeMs: frameMeta.inferenceMs || 0,
              mediaPipeToFingerMs: frameMeta.tMediaPipe ? +(tFingerEnd - frameMeta.tMediaPipe).toFixed(2) : 0,
              fingerToGestureMs: +(tGestureEnd - tFingerEnd).toFixed(2),
            },
          };

          if (this.onGestureConfirmed) {
            this.onGestureConfirmed(gestureEvent);
          }
        }
      } else {
        // First frame of a new physical gesture transition
        this.candidateFingers = totalFingers;
        this.candidateShape = primaryHandShape;
        this.candidateFrames = 1;
        this.candidateStartTime = now;
        stabilityProgress = 0.5;
      }
    }

    if (this.onStabilityProgress) {
      this.onStabilityProgress(stabilityProgress);
    }

    const tEnd = performance.now();
    this.lastGestureCalcMs = +(tEnd - calcStart).toFixed(2);

    return {
      hasHand: true,
      totalFingers,
      confirmedFingers: this.confirmedFingers,
      leftFingers,
      rightFingers,
      gestureType: primaryHandShape,
      guidance: this.guidanceMessage,
      activeFingersPerHand,
      stability: stabilityProgress,
      isConfirmed: isNewConfirmation || (totalFingers === this.confirmedFingers),
      gestureCalcMs: this.lastGestureCalcMs,
      transitionLatencyMs: this.lastTransitionLatencyMs,
      profiling: {
        cameraToMediaPipeMs: frameMeta.inferenceMs || 0,
        mediaPipeToFingerMs: frameMeta.tMediaPipe ? +(tFingerEnd - frameMeta.tMediaPipe).toFixed(2) : 0,
        fingerToGestureMs: +(tEnd - tFingerEnd).toFixed(2),
      },
    };
  }

  resetCandidate() {
    this.candidateFingers = null;
    this.candidateFrames = 0;
    this.candidateStartTime = 0;
    this.confirmedFingers = 0;
    this.confirmedShape = 'NONE';
    if (this.onStabilityProgress) this.onStabilityProgress(0);
  }

  _resetCandidate() {
    this.resetCandidate();
  }

  /**
   * Determine open/closed status for all 5 fingers of a hand
   */
  _analyzeHandFingers(lm, isLeft) {
    const wrist = lm[0];
    const dist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);

    const thumbCMC = lm[1];
    const thumbMCP = lm[2];
    const thumbIP = lm[3];
    const thumbTip = lm[4];
    const indexMCP = lm[5];
    const middleMCP = lm[9];
    const ringMCP = lm[13];
    const pinkyMCP = lm[17];

    const palmWidth = dist(indexMCP, pinkyMCP);
    const palmLength = dist(wrist, middleMCP);

    // Vector pointing from Pinky MCP (17) to Index MCP (5)
    const vThumbSide = { x: indexMCP.x - pinkyMCP.x, y: indexMCP.y - pinkyMCP.y };
    const vThumbSideLen = Math.hypot(vThumbSide.x, vThumbSide.y) || 1e-6;
    const uThumbSide = { x: vThumbSide.x / vThumbSideLen, y: vThumbSide.y / vThumbSideLen };

    // Vector pointing up the hand from Wrist (0) towards Middle MCP (9)
    const vUp = { x: middleMCP.x - wrist.x, y: middleMCP.y - wrist.y };
    const vUpLen = Math.hypot(vUp.x, vUp.y) || 1e-6;
    const uUp = { x: vUp.x / vUpLen, y: vUp.y / vUpLen };

    // ---------------------------------------------------------
    // 1. Fingers 2-5 (Index, Middle, Ring, Pinky)
    // ---------------------------------------------------------
    const isFingerOpen = (tipIdx, dipIdx, pipIdx, mcpIdx) => {
      const tip = lm[tipIdx];
      const dip = lm[dipIdx];
      const pip = lm[pipIdx];
      const mcp = lm[mcpIdx];

      const dTipWrist = dist(tip, wrist);
      const dDipWrist = dist(dip, wrist);
      const dPipWrist = dist(pip, wrist);

      const dTipMcp = dist(tip, mcp);
      const dPipMcp = dist(pip, mcp);

      // 1. Radial extension relative to wrist
      const isExtendedFromWrist = (dTipWrist > dDipWrist * 0.96) && (dTipWrist > dPipWrist * 1.05);

      // 2. Linear extension relative to MCP joint
      const isExtendedFromMcp = dTipMcp > dPipMcp * 1.18;

      // 3. Collinear joint straightness: Vector MCP->PIP vs PIP->TIP
      const vProx = { x: pip.x - mcp.x, y: pip.y - mcp.y };
      const vDist = { x: tip.x - pip.x, y: tip.y - pip.y };
      const lenProx = Math.hypot(vProx.x, vProx.y) || 1e-6;
      const lenDist = Math.hypot(vDist.x, vDist.y) || 1e-6;
      const collinearity = (vProx.x * vDist.x + vProx.y * vDist.y) / (lenProx * lenDist);
      const isStraight = collinearity > 0.35; // Positive dot product means extended along finger axis

      // 4. Projection along upward palm axis
      const tipUpProj = (tip.x - pip.x) * uUp.x + (tip.y - pip.y) * uUp.y;

      return (isExtendedFromWrist && isExtendedFromMcp && isStraight) || 
             (isExtendedFromMcp && tipUpProj > 0 && isStraight);
    };

    const isIndexOpen = isFingerOpen(8, 7, 6, 5);
    const isMiddleOpen = isFingerOpen(12, 11, 10, 9);
    const isRingOpen = isFingerOpen(16, 15, 14, 13);
    const isPinkyOpen = isFingerOpen(20, 19, 18, 17);

    const indexPIP = lm[6];

    // Check for "0" circular gesture (touching thumb and index tip together to form an 'O' ring with other fingers curled)
    const dThumbIndexTip = dist(thumbTip, lm[8]);
    const isOZeroRing = (dThumbIndexTip < palmWidth * 0.28) && (!isMiddleOpen && !isRingOpen && !isPinkyOpen);

    // ---------------------------------------------------------
    // 2. Thumb (Landmarks 1, 2, 3, 4)
    // ---------------------------------------------------------
    const thumbTipOutwardProj = (thumbTip.x - indexMCP.x) * uThumbSide.x + 
                                (thumbTip.y - indexMCP.y) * uThumbSide.y;

    const dTipIndexMCP = dist(thumbTip, indexMCP);
    const dTipPinkyMCP = dist(thumbTip, pinkyMCP);
    const dIpPinkyMCP = dist(thumbIP, pinkyMCP);

    const dThumbMcpTip = dist(thumbMCP, thumbTip);
    const dThumbMcpIp = dist(thumbMCP, thumbIP);
    const dThumbIpTip = dist(thumbIP, thumbTip);
    const isThumbStraight = dThumbMcpTip > (dThumbMcpIp + dThumbIpTip) * 0.80;

    // Normal spread out thumb (as in 5 fingers / Open Palm)
    // Must extend outward laterally from the index base by a noticeable distance
    const isThumbSpreadOut = (thumbTipOutwardProj > palmWidth * 0.22) && 
                             (dTipIndexMCP > palmWidth * 0.55) && 
                             (dTipPinkyMCP > dIpPinkyMCP * 1.05) &&
                             isThumbStraight;

    // Thumbs-up (👍) - Thumb held high above knuckles while 4 fingers are curled
    const otherFingersClosed = !isIndexOpen && !isMiddleOpen && !isRingOpen && !isPinkyOpen;
    
    // Projection of thumb tip above index PIP knuckle along the hand vertical axis:
    const thumbTipAboveIndexPIP = (thumbTip.x - indexPIP.x) * uUp.x + (thumbTip.y - indexPIP.y) * uUp.y;
    // Projection from thumb MCP along uUp:
    const thumbUpProj = (thumbTip.x - thumbMCP.x) * uUp.x + (thumbTip.y - thumbMCP.y) * uUp.y;
    // Thumb tip should be extending upwards from thumb IP joint:
    const thumbTipAboveIP = (thumbTip.x - thumbIP.x) * uUp.x + (thumbTip.y - thumbIP.y) * uUp.y;

    // In a fist, thumb is curled ON/ACROSS fingers, so thumbTipAboveIndexPIP <= 0 and thumbUpProj is small!
    // In a real thumbs-up, thumb sticks out HIGH above index PIP (> 0.15 * palmLength) and thumbUpProj > 0.55 * palmLength!
    const isThumbsUp = otherFingersClosed && 
                       !isOZeroRing &&
                       (thumbTipAboveIndexPIP > palmLength * 0.15) && 
                       (thumbUpProj > palmLength * 0.55) && 
                       (thumbTipAboveIP > 0.01) &&
                       (dist(thumbTip, wrist) > dist(thumbMCP, wrist) * 1.35) &&
                       isThumbStraight;

    const isThumbOpen = isThumbSpreadOut || isThumbsUp;

    // If user forms an O-Zero ring (thumb and index touching into a circle with other fingers curled) -> count is 0!
    if (isOZeroRing) {
      return { states: [false, false, false, false, false], count: 0, shape: 'FIST' };
    }

    const states = [isThumbOpen, isIndexOpen, isMiddleOpen, isRingOpen, isPinkyOpen];
    const count = states.filter(Boolean).length;

    let shape = 'OTHER';
    if (count === 0) shape = 'FIST';
    else if (count === 5) shape = 'OPEN_PALM';
    else if (count === 1 && isIndexOpen) shape = 'POINT';
    else if (count === 1 && isThumbsUp) shape = 'THUMB_UP';
    else if (count === 2 && isIndexOpen && isMiddleOpen) shape = 'PEACE';
    else if (count === 3 && isIndexOpen && isMiddleOpen && isRingOpen) shape = 'THREE_FINGERS';
    else if (count === 4 && !isThumbOpen) shape = 'FOUR_FINGERS';

    return { states, count, shape };
  }
}

export const gestureRecognitionService = new GestureRecognitionService();
