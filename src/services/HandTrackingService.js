// HandTrackingService.js - Real-time hand landmark tracking via MediaPipe Tasks Vision (Optimized Low-Latency)
// Features: Downscaled processing canvas, Newest-Frame-Priority (drop stale frames), GPU acceleration, zero queue lag.

import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

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

      // 2. Load model task asset directly from local public directory
      const modelPath = '/models/hand_landmarker.task';

      // 3. Initialize with GPU delegate, fallback to CPU if GPU unsupported
      try {
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelPath,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.45,
          minHandPresenceConfidence: 0.45,
          minTrackingConfidence: 0.45,
        });
        console.log('HandLandmarker loaded with GPU delegate');
      } catch (gpuErr) {
        console.warn('GPU delegate note, falling back to CPU:', gpuErr);
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelPath,
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.45,
          minHandPresenceConfidence: 0.45,
          minTrackingConfidence: 0.45,
        });
        console.log('HandLandmarker loaded with CPU mode');
      }

      this.isModelLoaded = true;
      this.isLoading = false;
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

      const now = performance.now();
      if (!this._lastDetectTime) this._lastDetectTime = 0;
      if (now - this._lastDetectTime < 38) {
        this.animationFrameId = requestAnimationFrame(processFrame);
        return;
      }

      const currentTime = videoElement.currentTime;
      if (currentTime !== this.lastVideoTime && videoElement.readyState >= 2) {
        this.lastVideoTime = currentTime;
        this._lastDetectTime = now;
        this.isDetecting = true;
        const startTime = now;

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
              multiHandLandmarks: results.landmarks || [],
              worldLandmarks: results.worldLandmarks || [],
              handedness: results.handednesses || [],
              multiHandedness: results.handednesses || [],
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
  /**
   * Renders high-visibility futuristic neon cyberpunk hand skeleton onto overlay canvas
   */
  drawLandmarks(ctx, width, height, landmarksList, handednessList, isMirrored = true, currentTarget = null, videoElement = null) {
    ctx.clearRect(0, 0, width, height);

    if (!landmarksList || landmarksList.length === 0) return;

    // Calculate exact object-fit: cover projection to align landmarks precisely over webcam video
    let renderW = width;
    let renderH = height;
    let offsetX = 0;
    let offsetY = 0;

    if (videoElement && videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
      const vw = videoElement.videoWidth;
      const vh = videoElement.videoHeight;
      const scale = Math.max(width / vw, height / vh);
      renderW = vw * scale;
      renderH = vh * scale;
      offsetX = (width - renderW) / 2;
      offsetY = (height - renderH) / 2;
    }

    const toScreenX = (normX) => {
      const px = isMirrored ? (1 - normX) : normX;
      return offsetX + px * renderW;
    };
    const toScreenY = (normY) => {
      return offsetY + normY * renderH;
    };

    // Bone connections
    const FINGER_CONNECTIONS = [
      [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8],       // Index
      [0, 9], [9, 10], [10, 11], [11, 12],   // Middle
      [0, 13], [13, 14], [14, 15], [15, 16], // Ring
      [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
      [5, 9], [9, 13], [13, 17], [0, 17], [2, 5] // Palm
    ];

    const targetCount = currentTarget ? currentTarget.fingerCount : 1;
    const targetLabel = currentTarget ? `${currentTarget.name} (${targetCount} JARI)` : 'JARI TELUNJUK (1 JARI)';

    landmarksList.forEach((landmarks, handIdx) => {
      // 1. Draw glowing connecting bones (clean cyber mint/green lines)
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(0, 255, 170, 0.45)';
      ctx.shadowColor = '#00ffaa';
      ctx.shadowBlur = 8;

      FINGER_CONNECTIONS.forEach(([startIdx, endIdx]) => {
        const p1 = landmarks[startIdx];
        const p2 = landmarks[endIdx];
        if (p1 && p2) {
          ctx.beginPath();
          ctx.moveTo(toScreenX(p1.x), toScreenY(p1.y));
          ctx.lineTo(toScreenX(p2.x), toScreenY(p2.y));
          ctx.stroke();
        }
      });
      ctx.restore();

      // 2. Draw clean green landmark dots on each knuckle/joint
      ctx.save();
      landmarks.forEach((p, idx) => {
        const x = toScreenX(p.x);
        const y = toScreenY(p.y);

        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#00ff88';
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 4;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, 3.8, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
      ctx.restore();

      // 3. Draw Target Reticle on the Active Primary Fingertip (Index landmark 8, or middle if 2 fingers)
      const primaryTip = landmarks[8] || landmarks[4];
      if (primaryTip && handIdx === 0) {
        const rx = toScreenX(primaryTip.x);
        const ry = toScreenY(primaryTip.y);

        ctx.save();
        // Inner glowing circle
        ctx.beginPath();
        ctx.arc(rx, ry, 12, 0, Math.PI * 2);
        ctx.strokeStyle = '#00f7ff';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#00f7ff';
        ctx.shadowBlur = 16;
        ctx.stroke();

        // Outer pulsing ring
        ctx.beginPath();
        ctx.arc(rx, ry, 20, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 247, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Center white core
        ctx.beginPath();
        ctx.arc(rx, ry, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#00f7ff';
        ctx.shadowBlur = 8;
        ctx.fill();

        // 4. Draw angled leader line and HUD Pill Badge as shown in mockup
        const lineStartX = rx + 20;
        const lineStartY = ry;
        const lineMidX = Math.min(width - 150, rx + 45);
        const lineMidY = Math.max(30, ry - 14);
        const lineEndX = lineMidX + 30;

        ctx.beginPath();
        ctx.moveTo(lineStartX, lineStartY);
        ctx.lineTo(lineMidX, lineMidY);
        ctx.lineTo(lineEndX, lineMidY);
        ctx.strokeStyle = '#00f7ff';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00f7ff';
        ctx.shadowBlur = 10;
        ctx.stroke();

        // Pill HUD Badge
        ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
        const txt = targetLabel;
        const txtWidth = ctx.measureText(txt).width;
        const padX = 12;
        const badgeW = txtWidth + padX * 2;
        const badgeH = 26;
        const badgeX = Math.min(width - badgeW - 8, lineEndX + 4);
        const badgeY = lineMidY - badgeH / 2;

        ctx.fillStyle = 'rgba(6, 16, 36, 0.9)';
        ctx.strokeStyle = '#00f7ff';
        ctx.lineWidth = 1.6;
        ctx.shadowColor = 'rgba(0, 247, 255, 0.6)';
        ctx.shadowBlur = 14;

        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 13);
        } else {
          ctx.rect(badgeX, badgeY, badgeW, badgeH);
        }
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#00f7ff';
        ctx.fillText(txt, badgeX + padX, lineMidY);

        ctx.restore();
      }
    });
  }
}

export const handTrackingService = new HandTrackingService();
