// CameraService.js - Robust camera management with stream caching, user-gesture permission, and auto-reconnect

export class CameraService {
  constructor() {
    this.stream = null;
    this.videoElement = null;
    this.isMirrored = true;
    this.isReady = false;
    this.isStreaming = false;
    this.permissionState = 'prompt'; // 'prompt', 'granted', 'denied'
    this.errorMessage = null;
    this.currentFacingMode = 'user'; // 'user' or 'environment'
  }

  /**
   * Initialize or attach existing camera stream to videoElement
   */
  async init(videoElement) {
    this.videoElement = videoElement;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.permissionState = 'denied';
      this.errorMessage = 'Browser ini tidak mendukung Camera MediaDevices API.';
      throw new Error(this.errorMessage);
    }

    // 1. If we already have an active stream, simply re-attach to the new video element!
    if (this.stream && this.stream.active && this.stream.getVideoTracks().some(t => t.readyState === 'live')) {
      try {
        await this._attachStreamToVideo(videoElement);
        this.isReady = true;
        this.isStreaming = true;
        this.permissionState = 'granted';
        return true;
      } catch (e) {
        console.warn('Re-attach stream failed, re-requesting:', e);
      }
    }

    // 2. Request new media stream
    return await this.requestCamera(videoElement);
  }

  async requestCamera(videoElement) {
    this.videoElement = videoElement || this.videoElement;

    try {
      const constraints = {
        video: {
          facingMode: this.currentFacingMode,
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30, max: 60 },
        },
        audio: false,
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      await this._attachStreamToVideo(this.videoElement);

      this.isReady = true;
      this.isStreaming = true;
      this.permissionState = 'granted';
      this.errorMessage = null;
      return true;
    } catch (err) {
      console.warn('Camera request error:', err);
      this.isReady = false;
      this.isStreaming = false;

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.permissionState = 'denied';
        this.errorMessage = 'Izin kamera ditolak. Silakan izinkan akses kamera di ikon gembok URL browser Anda.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError' || (err.message && err.message.includes('Device in use'))) {
        this.permissionState = 'denied';
        this.errorMessage = 'Kamera sedang digunakan oleh aplikasi lain (seperti Zoom, Teams, OBS, atau tab browser lain). Harap tutup aplikasi tersebut lalu klik AKTIFKAN KAMERA.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        this.permissionState = 'denied';
        this.errorMessage = 'Kamera tidak ditemukan. Anda dapat bermain menggunakan tombol virtual di bawah.';
      } else {
        this.permissionState = 'denied';
        this.errorMessage = `Kamera belum dapat dibuka: ${err.message || err.name}. Anda tetap bisa bermain dengan tombol virtual di bawah.`;
      }
      throw err;
    }
  }

  async _attachStreamToVideo(videoElement) {
    if (!videoElement || !this.stream) return;

    videoElement.srcObject = this.stream;
    videoElement.setAttribute('playsinline', '');
    videoElement.muted = true;

    // Use robust promise that cannot hang
    await new Promise((resolve) => {
      let resolved = false;
      const done = async () => {
        if (resolved) return;
        resolved = true;
        try {
          await videoElement.play();
        } catch (e) {
          console.warn('video.play() note:', e);
        }
        resolve();
      };

      if (videoElement.readyState >= 2) {
        done();
      } else {
        videoElement.addEventListener('loadeddata', done, { once: true });
        videoElement.addEventListener('loadedmetadata', done, { once: true });
        setTimeout(done, 1200); // 1.2s fallback timeout
      }
    });
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
    this.isReady = false;
    this.isStreaming = false;
  }

  toggleMirror() {
    this.isMirrored = !this.isMirrored;
    return this.isMirrored;
  }

  async switchFacingMode() {
    this.currentFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';
    this.stop();
    if (this.videoElement) {
      await this.requestCamera(this.videoElement);
    }
    return this.currentFacingMode;
  }
}

export const cameraService = new CameraService();
