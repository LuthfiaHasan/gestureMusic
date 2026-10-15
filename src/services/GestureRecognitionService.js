import { virtualBackgroundService } from './VirtualBackgroundService.js';

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
        validLandmarks: [],
        validHandedness: [],
        stability: 0,
        isConfirmed: false,
        gestureCalcMs: this.lastGestureCalcMs,
        transitionLatencyMs: this.lastTransitionLatencyMs,
        profiling: null,
      };
    }

    // -------------------------------------------------------------
    // EVENT MODE: ANTI-BACKGROUND & ANTI-PASSERBY PROXIMITY FILTER
    // -------------------------------------------------------------
    // 1. If Virtual Background is ON, discard any hands located in the replaced background.
    // 2. Discard hands from distant people / background noise (< 0.11 handSize).
    // 3. Discard hands outside the central interaction zone.
    const candidateHands = [];

    landmarksList.forEach((landmarks, idx) => {
      const wrist = landmarks[0];
      const middleMCP = landmarks[9];
      const indexMCP = landmarks[5];
      const pinkyMCP = landmarks[17];

      // Hand dimensions in normalized space
      const handSize = Math.hypot(wrist.x - middleMCP.x, wrist.y - middleMCP.y);
      const palmWidth = Math.hypot(indexMCP.x - pinkyMCP.x, indexMCP.y - pinkyMCP.y);

      // Check 1: Virtual Background Masking
      // If virtual background is active, reject any hand situated in the replaced background
      if (typeof virtualBackgroundService?.isHandInForeground === 'function') {
        if (!virtualBackgroundService.isHandInForeground(landmarks, 0.10)) {
          return;
        }
      }

      // Check 2: Minimum size filter - reject hands smaller than 0.11 or narrow palms
      if (handSize < 0.11 || palmWidth < 0.040) {
        return;
      }

      // Check 3: Discard hands at extreme screen boundaries
      if (wrist.x < 0.04 || wrist.x > 0.96 || wrist.y < 0.05 || wrist.y > 0.96) {
        return;
      }

      // Proximity score: prioritize larger hand (closer to camera) + closer to central player zone
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

    // If no candidate hands passed filter (e.g. only background passersby or no hand):
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
        validLandmarks: [],
        validHandedness: [],
        stability: 0,
        isConfirmed: false,
        gestureCalcMs: this.lastGestureCalcMs,
        transitionLatencyMs: this.lastTransitionLatencyMs,
        profiling: null,
      };
    }

    // Sort candidate hands: closest player hand first
    candidateHands.sort((a, b) => b.playerPriority - a.playerPriority);

    // Dynamic two-hand selection: allow two hands if requested OR if two distinct player hands are clearly present
    let maxHandsToKeep = 1;
    if (requiredTwoHands) {
      maxHandsToKeep = 2;
    } else if (candidateHands.length >= 2) {
      const h0 = candidateHands[0];
      const h1 = candidateHands[1];
      const bothInInteractionZone = h0.handSize >= 0.135 && h1.handSize >= 0.135;
      const xSeparation = Math.abs(h0.landmarks[0].x - h1.landmarks[0].x);
      if (bothInInteractionZone && xSeparation >= 0.12) {
        maxHandsToKeep = 2;
      }
    }
    const selectedHands = candidateHands.slice(0, maxHandsToKeep);

    // Check if hands are close enough to the camera to be interactive (handSize >= 0.135)
    // If all hands are < 0.135 (borderline/too far away), DO NOT register as active gesture!
    const hasCloseHand = selectedHands.some(h => h.handSize >= 0.135);
    if (!hasCloseHand) {
      this.guidanceMessage = 'MOVE YOUR HAND CLOSER';
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
        validLandmarks: [],
        validHandedness: [],
        stability: 0,
        isConfirmed: false,
        gestureCalcMs: this.lastGestureCalcMs,
        transitionLatencyMs: this.lastTransitionLatencyMs,
        profiling: null,
      };
    }

    let leftFingers = 0;
    let rightFingers = 0;
    let primaryHandShape = 'UNKNOWN';
    const activeFingersPerHand = [];

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
    if (requiredTwoHands && selectedHands.length < 2 && totalFingers <= 5) {
      this.guidanceMessage = 'SHOW BOTH HANDS';
    } else {
      this.guidanceMessage = 'GESTURE READY';
    }

    // -------------------------------------------------------------
    // FAST TEMPORAL CONFIRMATION & JITTER FILTER
    // -------------------------------------------------------------
    let isNewConfirmation = false;
    let stabilityProgress = 1.0;

    if (totalFingers === this.confirmedFingers) {
      // Current gesture matches confirmed: keep rock-solid stable, clear any 1-frame candidate jitter
      this.candidateFingers = null;
      this.candidateFrames = 0;
      stabilityProgress = 1.0;
    } else {
      // Finger count is changing!
      if (this.candidateFingers === totalFingers) {
        this.candidateFrames++;
        const elapsed = now - this.candidateStartTime;
        stabilityProgress = Math.min(1.0, this.candidateFrames / this.requiredConfirmationFrames);

        // Confirm when required consecutive frames match OR elapsed >= max window with >= 2 frames
        if (this.candidateFrames >= this.requiredConfirmationFrames || (elapsed >= this.maxConfirmationDurationMs && this.candidateFrames >= 2)) {
          // GESTURE CONFIRMED AT HIGH SPEED!
          const tGestureEnd = performance.now();
          this.lastTransitionLatencyMs = Math.max(1, Math.round(now - this.candidateStartTime));
          
          const prevFingers = this.confirmedFingers;
          const prevShape = this.confirmedShape;
          const hasActualChange = (totalFingers !== prevFingers) || (primaryHandShape !== prevShape);

          this.confirmedFingers = totalFingers;
          this.confirmedShape = primaryHandShape;
          this.candidateFingers = null;
          this.candidateFrames = 0;
          stabilityProgress = 1.0;
          isNewConfirmation = true;

          // Only dispatch sound/chord event when finger count or gesture shape has ACTUALLY changed
          // to prevent intra-frame jitter from re-triggering the same chord repeatedly!
          if (hasActualChange) {
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
      validLandmarks: selectedHands.map(h => h.landmarks),
      validHandedness: selectedHands.map(h => h.handedness),
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
   * Determine open/closed status for all 5 fingers of a hand with 3D landmark depth
   */
  _analyzeHandFingers(lm, isLeft) {
    const wrist = lm[0];
    const dist2D = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
    const dist3D = (p1, p2) => {
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      const dz = (p1.z !== undefined && p2.z !== undefined) ? (p1.z - p2.z) * 1.15 : 0;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    };

    const thumbCMC = lm[1];
    const thumbMCP = lm[2];
    const thumbIP = lm[3];
    const thumbTip = lm[4];
    const indexMCP = lm[5];
    const middleMCP = lm[9];
    const ringMCP = lm[13];
    const pinkyMCP = lm[17];

    const palmWidth = dist3D(indexMCP, pinkyMCP);
    const palmLength = dist3D(wrist, middleMCP);

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
    const isFingerOpen = (tipIdx, dipIdx, pipIdx, mcpIdx, isPinky = false) => {
      const tip = lm[tipIdx];
      const dip = lm[dipIdx];
      const pip = lm[pipIdx];
      const mcp = lm[mcpIdx];

      const dTipWrist = dist3D(tip, wrist);
      const dDipWrist = dist3D(dip, wrist);
      const dPipWrist = dist3D(pip, wrist);

      const dTipMcp = dist3D(tip, mcp);
      const dPipMcp = dist3D(pip, mcp);

      // Pinky is naturally shorter, so adapt relative thresholds
      const wristMult = isPinky ? 0.90 : 0.95;
      const pipMult = isPinky ? 0.98 : 1.04;
      const mcpMult = isPinky ? 1.08 : 1.15;

      // 1. Extension relative to wrist in 3D
      const isExtendedFromWrist = (dTipWrist > dDipWrist * wristMult) && (dTipWrist > dPipWrist * pipMult);

      // 2. Extension relative to MCP joint
      const isExtendedFromMcp = dTipMcp > dPipMcp * mcpMult;

      // 3. Collinear joint straightness in 3D: Vector MCP->PIP vs PIP->TIP
      const vProx = { x: pip.x - mcp.x, y: pip.y - mcp.y, z: (pip.z || 0) - (mcp.z || 0) };
      const vDist = { x: tip.x - pip.x, y: tip.y - pip.y, z: (tip.z || 0) - (pip.z || 0) };
      const lenProx = Math.hypot(vProx.x, vProx.y, vProx.z) || 1e-6;
      const lenDist = Math.hypot(vDist.x, vDist.y, vDist.z) || 1e-6;
      const collinearity = (vProx.x * vDist.x + vProx.y * vDist.y + vProx.z * vDist.z) / (lenProx * lenDist);
      const isStraight = collinearity > (isPinky ? 0.25 : 0.32);

      // 4. Projection along upward palm axis
      const tipUpProj = (tip.x - pip.x) * uUp.x + (tip.y - pip.y) * uUp.y;

      return (isExtendedFromWrist && isExtendedFromMcp && isStraight) || 
             (isExtendedFromMcp && tipUpProj > 0 && isStraight);
    };

    const isIndexOpen = isFingerOpen(8, 7, 6, 5, false);
    const isMiddleOpen = isFingerOpen(12, 11, 10, 9, false);
    const isRingOpen = isFingerOpen(16, 15, 14, 13, false);
    const isPinkyOpen = isFingerOpen(20, 19, 18, 17, true);

    const indexPIP = lm[6];

    // Check for "0" circular gesture (touching thumb and index tip together to form an 'O' ring with other fingers curled)
    const dThumbIndexTip = dist2D(thumbTip, lm[8]);
    const isOZeroRing = (dThumbIndexTip < palmWidth * 0.28) && (!isMiddleOpen && !isRingOpen && !isPinkyOpen);

    // ---------------------------------------------------------
    // 2. Thumb (Landmarks 1, 2, 3, 4)
    // ---------------------------------------------------------
    const thumbTipOutwardProj = (thumbTip.x - indexMCP.x) * uThumbSide.x + 
                                (thumbTip.y - indexMCP.y) * uThumbSide.y;

    const dTipIndexMCP = dist3D(thumbTip, indexMCP);
    const dTipPinkyMCP = dist3D(thumbTip, pinkyMCP);
    const dIpPinkyMCP = dist3D(thumbIP, pinkyMCP);

    const dThumbMcpTip = dist3D(thumbMCP, thumbTip);
    const dThumbMcpIp = dist3D(thumbMCP, thumbIP);
    const dThumbIpTip = dist3D(thumbIP, thumbTip);
    const isThumbStraight = dThumbMcpTip > (dThumbMcpIp + dThumbIpTip) * 0.74;

    // Normal spread out thumb (as in 5 fingers / Open Palm)
    // Resilient to angle and foreshortening
    const isThumbSpreadOut = (
      (thumbTipOutwardProj > palmWidth * 0.16 || dTipIndexMCP > palmWidth * 0.48) && 
      (dTipPinkyMCP > dIpPinkyMCP * 1.01) &&
      isThumbStraight
    );

    // Thumbs-up (👍) - Thumb held high above knuckles while 4 fingers are curled
    const otherFingersClosed = !isIndexOpen && !isMiddleOpen && !isRingOpen && !isPinkyOpen;
    
    // Projection of thumb tip above index PIP knuckle along the hand vertical axis:
    const thumbTipAboveIndexPIP = (thumbTip.x - indexPIP.x) * uUp.x + (thumbTip.y - indexPIP.y) * uUp.y;
    // Projection from thumb MCP along uUp:
    const thumbUpProj = (thumbTip.x - thumbMCP.x) * uUp.x + (thumbTip.y - thumbMCP.y) * uUp.y;
    // Thumb tip should be extending upwards from thumb IP joint:
    const thumbTipAboveIP = (thumbTip.x - thumbIP.x) * uUp.x + (thumbTip.y - thumbIP.y) * uUp.y;

    const isThumbsUp = otherFingersClosed && 
                       !isOZeroRing &&
                       (thumbTipAboveIndexPIP > palmLength * 0.12) && 
                       (thumbUpProj > palmLength * 0.48) && 
                       (thumbTipAboveIP > 0.005) &&
                       (dist3D(thumbTip, wrist) > dist3D(thumbMCP, wrist) * 1.25) &&
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
