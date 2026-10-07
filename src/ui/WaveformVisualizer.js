// WaveformVisualizer.js - Real-time glowing oscilloscope and frequency spectrum

export class WaveformVisualizer {
  constructor(canvas, analyser) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.analyser = analyser;
    this.dataArray = null;
    this.freqArray = null;
    this.animationId = null;

    if (this.analyser) {
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      this.freqArray = new Uint8Array(bufferLength);
    }

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  setAnalyser(analyser) {
    this.analyser = analyser;
    if (this.analyser) {
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      this.freqArray = new Uint8Array(bufferLength);
    }
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = this.canvas.clientWidth || 320;
    this.canvas.height = this.canvas.clientHeight || 70;
  }

  start() {
    const loop = () => {
      this.draw();
      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  draw() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.ctx.clearRect(0, 0, w, h);

    if (!this.analyser || !this.dataArray) {
      // Draw subtle idle sine wave
      this._drawIdleWave(w, h);
      return;
    }

    this.analyser.getByteTimeDomainData(this.dataArray);
    this.analyser.getByteFrequencyData(this.freqArray);

    // 1. Draw glowing subtle frequency bars in background
    const barWidth = (w / 32);
    for (let i = 0; i < 32; i++) {
      const val = this.freqArray[i * 4] / 255;
      const barHeight = val * h * 0.8;
      const x = i * barWidth;
      const y = h - barHeight;

      const grad = this.ctx.createLinearGradient(0, y, 0, h);
      grad.addColorStop(0, 'rgba(255, 0, 127, 0.4)');
      grad.addColorStop(1, 'rgba(0, 247, 255, 0.05)');

      this.ctx.fillStyle = grad;
      this.ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
    }

    // 2. Draw glowing oscilloscope waveform line
    this.ctx.save();
    this.ctx.lineWidth = 2.5;
    this.ctx.strokeStyle = '#00f7ff';
    this.ctx.shadowColor = '#00f7ff';
    this.ctx.shadowBlur = 12;

    this.ctx.beginPath();
    const sliceWidth = w / this.dataArray.length;
    let x = 0;

    for (let i = 0; i < this.dataArray.length; i++) {
      const v = this.dataArray[i] / 128.0;
      const y = (v * h) / 2;

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    this.ctx.lineTo(w, h / 2);
    this.ctx.stroke();
    this.ctx.restore();
  }

  _drawIdleWave(w, h) {
    const time = performance.now() * 0.002;
    this.ctx.save();
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeStyle = 'rgba(0, 247, 255, 0.35)';
    this.ctx.shadowColor = '#00f7ff';
    this.ctx.shadowBlur = 6;

    this.ctx.beginPath();
    for (let x = 0; x < w; x += 3) {
      const y = h / 2 + Math.sin(x * 0.04 + time) * 6;
      if (x === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.stroke();
    this.ctx.restore();
  }
}
