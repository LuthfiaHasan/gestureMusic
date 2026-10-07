// VirtualBackgroundService.js - Real-time AI Virtual Background (Zoom-style)
// Features:
// 1. Replaces camera room background with Cyber AI wallpaper without green screen.
// 2. Uses outputConfidenceMasks with feathered anti-aliasing for smooth person edges.
// 3. Perfect mirror alignment between webcam video and segmentation mask.
// 4. Guaranteed person visibility: fallback renders 100% solid video while model loads.

import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision';

export class VirtualBackgroundService {
  constructor() {
    this.segmenter = null;
    this.isModelLoaded = false;
    this.isLoading = false;
    this.isEnabled = true; // Default ON: Zoom-style virtual background
    this.hasValidMask = false;

    // Background Image
    this.bgImage = new Image();
    this.bgImageLoaded = false;
    this.bgImageSrc = '/images/cyber_ai_bg.jpg';
    this._preloadBgImage();

    // Offscreen buffers for fast mask & cutout compositing
    this.maskCanvas = null;
    this.maskCtx = null;
    this.personCanvas = null;
    this.personCtx = null;
    this.isSegmenting = false;
    this.lastProcessedTime = -1;

    // Mask initial resolution
    this.maskWidth = 256;
    this.maskHeight = 256;
    this._initOffscreenBuffers();
  }

  _preloadBgImage() {
    this.bgImage.onload = () => {
      this.bgImageLoaded = true;
    };
    this.bgImage.onerror = (e) => {
      console.warn('VirtualBackground: Failed to load bg image, fallback to gradient:', e);
    };
    this.bgImage.src = this.bgImageSrc;
  }

  _initOffscreenBuffers() {
    if (typeof document === 'undefined') return;

    this.maskCanvas = document.createElement('canvas');
    this.maskCanvas.width = this.maskWidth;
    this.maskCanvas.height = this.maskHeight;
    this.maskCtx = this.maskCanvas.getContext('2d', { willReadFrequently: false });

    this.personCanvas = document.createElement('canvas');
    this.personCanvas.width = 360;
    this.personCanvas.height = 450;
    this.personCtx = this.personCanvas.getContext('2d', { willReadFrequently: false });
  }

  async loadModel(visionInstance = null) {
    if (this.isModelLoaded || this.isLoading) return;
    this.isLoading = true;

    try {
      let vision = visionInstance;
      if (!vision) {
        try {
          vision = await FilesetResolver.forVisionTasks('/wasm');
        } catch (e) {
          vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
          );
        }
      }

      let modelPath = '/models/selfie_segmenter.tflite';
      try {
        const testRes = await fetch(modelPath, { method: 'HEAD' });
        if (!testRes.ok) throw new Error('Local selfie_segmenter not found');
      } catch (err) {
        modelPath = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';
      }

      this.segmenter = await ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: modelPath,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        outputCategoryMask: false,
        outputConfidenceMasks: true, // Float32 confidence probabilities for person
      });

      this.isModelLoaded = true;
      this.isLoading = false;
      console.log('VirtualBackground: SelfieSegmenter loaded successfully (GPU delegate, confidence mask)');
    } catch (err) {
      this.isLoading = false;
      console.warn('VirtualBackground: Failed to load segmenter model, running in standard camera mode:', err);
    }
  }

  /**
   * Process video frame to update segmentation mask (async / non-blocking)
   */
  updateSegmentation(videoElement, timestamp) {
    if (!this.isEnabled || !this.isModelLoaded || !this.segmenter) return;
    if (this.isSegmenting || !videoElement || videoElement.paused || videoElement.ended) return;
    if (videoElement.currentTime === this.lastProcessedTime || videoElement.readyState < 2) return;

    this.lastProcessedTime = videoElement.currentTime;
    this.isSegmenting = true;

    try {
      this.segmenter.segmentForVideo(videoElement, timestamp, (result) => {
        if (!result || !result.confidenceMasks || result.confidenceMasks.length === 0) {
          this.isSegmenting = false;
          return;
        }

        const mask = result.confidenceMasks[0];
        const conf = mask.getAsFloat32Array();
        const mw = mask.width;
        const mh = mask.height;

        if (this.maskCanvas.width !== mw || this.maskCanvas.height !== mh) {
          this.maskCanvas.width = mw;
          this.maskCanvas.height = mh;
          this.maskCtx = this.maskCanvas.getContext('2d', { willReadFrequently: false });
        }

        const imgData = this.maskCtx.createImageData(mw, mh);
        const data32 = new Uint32Array(imgData.data.buffer);

        for (let i = 0; i < conf.length; i++) {
          const v = conf[i];
          if (v > 0.35) {
            // Smooth anti-aliased edge between 0.35 and 0.65 probability
            const alpha = v >= 0.65 ? 255 : Math.round(((v - 0.35) / 0.3) * 255);
            // Alpha is highest byte in 32-bit little-endian
            data32[i] = (alpha << 24) | 0x00FFFFFF;
          } else {
            data32[i] = 0x00000000;
          }
        }

        this.maskCtx.putImageData(imgData, 0, 0);
        this.hasValidMask = true;
        this.isSegmenting = false;
      });
    } catch (e) {
      this.isSegmenting = false;
    }
  }

  /**
   * Render composite frame onto the target camera canvas
   * @param {HTMLCanvasElement} canvas - Target display canvas
   * @param {HTMLVideoElement} video - Source webcam video
   * @param {boolean} isMirrored - Camera mirror flag
   */
  render(canvas, video, isMirrored = true) {
    if (!canvas || !video || video.readyState < 2) return;

    const ctx = canvas.getContext('2d');
    const cw = canvas.width;
    const ch = canvas.height;

    // Fallback: If virtual background is disabled or model hasn't generated a mask yet,
    // ALWAYS render 100% solid camera video feed so the person is NEVER invisible!
    if (!this.isEnabled || !this.isModelLoaded || !this.hasValidMask) {
      ctx.save();
      if (isMirrored) {
        ctx.translate(cw, 0);
        ctx.scale(-1, 1);
      }
      this._drawVideoCover(ctx, video, cw, ch);
      ctx.restore();
      return;
    }

    // 1. Draw Framed Cyber AI Background (properly scaled to avoid over-zooming)
    if (this.bgImageLoaded && this.bgImage.naturalWidth > 0) {
      this._drawFramedBackground(ctx, this.bgImage, cw, ch);
    } else {
      // Clean sci-fi fallback gradient
      const grad = ctx.createRadialGradient(cw / 2, ch / 2, 20, cw / 2, ch / 2, ch);
      grad.addColorStop(0, '#100624');
      grad.addColorStop(1, '#05020c');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cw, ch);
    }

    // 2. Cut out person from video using segmentation mask
    if (this.personCanvas.width !== cw || this.personCanvas.height !== ch) {
      this.personCanvas.width = cw;
      this.personCanvas.height = ch;
      this.personCtx = this.personCanvas.getContext('2d', { willReadFrequently: false });
    }

    const pCtx = this.personCtx;
    pCtx.clearRect(0, 0, cw, ch);

    // Draw video onto person buffer (MIRRORED)
    pCtx.save();
    if (isMirrored) {
      pCtx.translate(cw, 0);
      pCtx.scale(-1, 1);
    }
    this._drawVideoCover(pCtx, video, cw, ch);
    pCtx.restore();

    // Apply segmentation mask with the EXACT SAME MIRROR TRANSFORM!
    pCtx.globalCompositeOperation = 'destination-in';
    pCtx.save();
    if (isMirrored) {
      pCtx.translate(cw, 0);
      pCtx.scale(-1, 1);
    }
    pCtx.drawImage(this.maskCanvas, 0, 0, cw, ch);
    pCtx.restore();
    pCtx.globalCompositeOperation = 'source-over';

    // 3. Composite solid person over Cyber AI background
    ctx.drawImage(this.personCanvas, 0, 0);

    // 4. Subtle sci-fi ambient vignette around edges for arcade polish
    const vignette = ctx.createRadialGradient(cw / 2, ch / 2, cw * 0.45, cw / 2, ch / 2, cw * 0.78);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(5, 2, 12, 0.4)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, cw, ch);
  }

  /**
   * Scale & center background artwork gracefully without extreme crop
   */
  _drawFramedBackground(ctx, img, targetW, targetH) {
    const imgAspect = img.naturalWidth / img.naturalHeight;
    const targetAspect = targetW / targetH;

    let renderW, renderH, offsetX, offsetY;
    if (imgAspect > targetAspect) {
      renderH = targetH;
      renderW = targetH * imgAspect;
      offsetX = (targetW - renderW) / 2;
      offsetY = 0;
    } else {
      renderW = targetW;
      renderH = targetW / imgAspect;
      offsetX = 0;
      offsetY = (targetH - renderH) / 2;
    }

    ctx.drawImage(img, offsetX, offsetY, renderW, renderH);

    // Soft top & bottom darkening for HUD readability
    const overlayGrad = ctx.createLinearGradient(0, 0, 0, targetH);
    overlayGrad.addColorStop(0, 'rgba(8, 3, 20, 0.45)');
    overlayGrad.addColorStop(0.25, 'rgba(8, 3, 20, 0.08)');
    overlayGrad.addColorStop(0.75, 'rgba(8, 3, 20, 0.1)');
    overlayGrad.addColorStop(1, 'rgba(8, 3, 20, 0.55)');
    ctx.fillStyle = overlayGrad;
    ctx.fillRect(0, 0, targetW, targetH);
  }

  /**
   * Cover-fit video frame to canvas
   */
  _drawVideoCover(ctx, video, targetW, targetH) {
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    const videoAspect = vw / vh;
    const targetAspect = targetW / targetH;

    let sx = 0, sy = 0, sw = vw, sh = vh;
    if (videoAspect > targetAspect) {
      sw = vh * targetAspect;
      sx = (vw - sw) / 2;
    } else {
      sh = vw / targetAspect;
      sy = (vh - sh) / 2;
    }

    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, targetW, targetH);
  }
}

export const virtualBackgroundService = new VirtualBackgroundService();
if (typeof window !== 'undefined') {
  window.virtualBackgroundService = virtualBackgroundService;
}
