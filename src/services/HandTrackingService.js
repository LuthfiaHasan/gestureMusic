// HandTrackingService.js - Real-time hand landmark tracking via MediaPipe Tasks Vision (Optimized Low-Latency)
// Features: Downscaled processing canvas, Newest-Frame-Priority (drop stale frames), GPU acceleration, zero queue lag.

import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { virtualBackgroundService } from './VirtualBackgroundService.js';

export class HandTrackingService {
  constructor() {
    this.handLandmarker = null;
    this.isModelLoaded = false;
    this.isLoading = false;
    this.lastVideoTime = -1;
    this.animationFrameId = null;
    this.onResultsCallback = null;
    
    // Performance & Latency Metrics
    this.fps = 0;
    this.frameCount = 0;
    this.lastFpsUpdate = performance.now();
    this.lastInferenceMs = 0;
    this.isDetecting = false;

    // Optimized Offscreen Processing Canvas (320x240 resolution)
    // MediaPipe normalizes landmarks to [0, 1], so downscaling reduces memory/texture bandwidth
    // by ~75% while maintaining identical finger classification accuracy!
    this.processWidth = 320;
    this.processHeight = 240;
    this.processCanvas = null;
    this.processCtx = null;
    this._initProcessCanvas();
  }

  _initProcessCanvas() {
    if (typeof document === 'undefined') return;
    this.processCanvas = document.createElement('canvas');
    this.processCanvas.width = this.processWidth;
    this.processCanvas.height = this.processHeight;
    this.processCtx = this.processCanvas.getContext('2d', { willReadFrequently: false });
    if (this.processCtx) {
      this.processCtx.imageSmoothingEnabled = false; // Fast pixel blit
    }
  }

  async loadModel() {
    if (this.isModelLoaded) return;
    if (this.isLoading) return;
    this.isLoading = true;

    try {
      // 1. Load vision tasks WASM
      let vision = null;
      try {
        vision = await FilesetResolver.forVisionTasks('/wasm');
      } catch (e) {
        console.warn('Local wasm load fallback to CDN:', e);
        vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
      }

      // 2. Load model task asset
      let modelPath = '/models/hand_landmarker.task';
      try {
        const testRes = await fetch(modelPath, { method: 'HEAD' });
        if (!testRes.ok) throw new Error('Local task model not found');
      } catch (err) {
        modelPath = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
      }

      // 3. Initialize with GPU delegate and real-time video parameters
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: modelPath,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.65, // Reject non-hand artifacts & clothes patterns
        minHandPresenceConfidence: 0.65,  // Strict hand presence
        minTrackingConfidence: 0.60,      // Robust landmark tracking
      });

      this.isModelLoaded = true;
      this.isLoading = false;
      console.log('HandLandmarker loaded with GPU delegate & fast pipeline');

      // Initialize Zoom-style Virtual Background with the same vision instance
      virtualBackgroundService.loadModel(vision).catch((e) => {
        console.warn('VirtualBackground load note:', e);
      });
    } catch (err) {
      this.isLoading = false;
      console.error('Failed to load HandLandmarker model:', err);
      throw err;
    }
  }

  /**
   * Start tracking with strict "Newest-Frame-Priority" and single-loop guarantee
   */
  startTracking(videoElement, onResults) {
    // 1. Prevent duplicate concurrent loops (P0: Multiple processing listeners bug fix)
    this.stopTracking();

    this.onResultsCallback = onResults;
    this.isDetecting = false;
    this.lastVideoTime = -1;

    const processFrame = () => {
      // If tracking stopped or elements unavailable
      if (!this.handLandmarker || !videoElement || videoElement.paused || videoElement.ended) {
        this.animationFrameId = requestAnimationFrame(processFrame);
        return;
      }

      // 2. Newest-Frame-Priority (Requirement 4):
      // If previous inference is still in-flight, SKIP this animation frame.
      // NEVER queue up backlogged frames! When ready, always process the newest frame.
      if (this.isDetecting) {
        this.animationFrameId = requestAnimationFrame(processFrame);
        return;
      }

      const currentTime = videoElement.currentTime;
      if (currentTime !== this.lastVideoTime && videoElement.readyState >= 2) {
        this.lastVideoTime = currentTime;
        this.isDetecting = true;
        const startTime = performance.now();

        try {
          // 3. Downscale camera frame to fast 320x240 offscreen canvas (Requirement 6)
          if (this.processCtx) {
            this.processCtx.drawImage(
              videoElement, 
              0, 0, 
              this.processWidth, 
              this.processHeight
            );
          }

          const targetInput = this.processCanvas || videoElement;
          const results = this.handLandmarker.detectForVideo(targetInput, startTime);
          
          const tMediaPipe = performance.now();
          this.lastInferenceMs = Math.round(tMediaPipe - startTime);

          // Update FPS calculation
          this.frameCount++;
          const now = performance.now();
          if (now - this.lastFpsUpdate >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
            this.frameCount = 0;
            this.lastFpsUpdate = now;
          }

          if (this.onResultsCallback) {
            this.onResultsCallback({
              landmarks: results.landmarks || [],
              worldLandmarks: results.worldLandmarks || [],
              handedness: results.handednesses || [],
              fps: this.fps,
              inferenceMs: this.lastInferenceMs,
              timestamp: startTime,
              tCamera: startTime,
              tMediaPipe: tMediaPipe,
            });
          }
        } catch (detectionErr) {
          console.warn('Hand detection frame note:', detectionErr);
        } finally {
          this.isDetecting = false;
        }
      }

      this.animationFrameId = requestAnimationFrame(processFrame);
    };

    this.animationFrameId = requestAnimationFrame(processFrame);
  }

  stopTracking() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.isDetecting = false;
  }

  /**
   * Renders futuristic neon cyberpunk hand skeleton onto overlay canvas
   */
  drawLandmarks(ctx, width, height, landmarksList, handednessList, isMirrored = true, activeFingersPerHand = []) {
    ctx.clearRect(0, 0, width, height);

    if (!landmarksList || landmarksList.length === 0) return;

    // Landmark connections
    const FINGER_CONNECTIONS = [
      // Thumb
      [0, 1], [1, 2], [2, 3], [3, 4],
      // Index
      [0, 5], [5, 6], [6, 7], [7, 8],
      // Middle
      [0, 9], [9, 10], [10, 11], [11, 12],
      // Ring
      [0, 13], [13, 14], [14, 15], [15, 16],
      // Pinky
      [0, 17], [17, 18], [18, 19], [19, 20],
      // Palm cross connections
      [5, 9], [9, 13], [13, 17], [0, 17]
    ];

    const FINGERTIP_INDICES = [4, 8, 12, 16, 20];

    landmarksList.forEach((landmarks, handIdx) => {
      const handLabel = handednessList[handIdx]?.[0]?.categoryName || (handIdx === 0 ? 'Left' : 'Right');
      const isLeft = handLabel.toLowerCase() === 'left';
      
      // Cyber colors: Left Hand = Cyan / Electric Blue, Right Hand = Magenta / Hot Pink
      const primaryColor = isLeft ? '#00f7ff' : '#ff007f';
      const secondaryColor = isLeft ? '#0077ff' : '#c000ff';
      const glowColor = isLeft ? 'rgba(0, 247, 255, 0.45)' : 'rgba(255, 0, 127, 0.45)';

      const activeFingers = activeFingersPerHand[handIdx] || [false, false, false, false, false];

      // Draw skeleton lines
      ctx.lineWidth = 3;
      ctx.strokeStyle = primaryColor;
      ctx.shadowColor = primaryColor;
      ctx.shadowBlur = 10;

      FINGER_CONNECTIONS.forEach(([startIdx, endIdx]) => {
        const p1 = landmarks[startIdx];
        const p2 = landmarks[endIdx];

        const x1 = isMirrored ? (1 - p1.x) * width : p1.x * width;
        const y1 = p1.y * height;
        const x2 = isMirrored ? (1 - p2.x) * width : p2.x * width;
        const y2 = p2.y * height;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });

      // Draw joints
      landmarks.forEach((p, idx) => {
        const x = isMirrored ? (1 - p.x) * width : p.x * width;
        const y = p.y * height;

        const isTip = FINGERTIP_INDICES.includes(idx);
        const fingerTipIdx = FINGERTIP_INDICES.indexOf(idx);
        const isActiveTip = isTip && activeFingers[fingerTipIdx];

        ctx.beginPath();
        if (isActiveTip) {
          // Large glowing beacon for active finger!
          ctx.arc(x, y, 9, 0, 2 * Math.PI);
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = primaryColor;
          ctx.shadowBlur = 20;
          ctx.fill();

          // Outer halo ring
          ctx.beginPath();
          ctx.arc(x, y, 15, 0, 2 * Math.PI);
          ctx.strokeStyle = primaryColor;
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (isTip) {
          ctx.arc(x, y, 6, 0, 2 * Math.PI);
          ctx.fillStyle = secondaryColor;
          ctx.shadowBlur = 8;
          ctx.fill();
        } else {
          ctx.arc(x, y, 4, 0, 2 * Math.PI);
          ctx.fillStyle = primaryColor;
          ctx.shadowBlur = 4;
          ctx.fill();
        }
      });

      // Draw Hand Center Label Tag
      const wrist = landmarks[0];
      const wx = isMirrored ? (1 - wrist.x) * width : wrist.x * width;
      const wy = Math.min(height - 20, wrist.y * height + 24);

      ctx.save();
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#000000';
      ctx.fillStyle = glowColor;
      ctx.fillRect(wx - 36, wy - 14, 72, 22);
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(wx - 36, wy - 14, 72, 22);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${handLabel.toUpperCase()} HAND`, wx, wy + 2);
      ctx.restore();
    });
  }
}

export const handTrackingService = new HandTrackingService();
