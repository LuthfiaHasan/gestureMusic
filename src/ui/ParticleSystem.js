// ParticleSystem.js - Ambient synthwave floating particles, grid, and musical notes

export class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.notes = ['♪', '♫', '♬', '♩', '✦', '✧'];
    this.animationId = null;
    this.pulseGlow = 0;

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this._initParticles();
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = this.canvas.parentElement ? this.canvas.parentElement.clientWidth : window.innerWidth;
    this.canvas.height = this.canvas.parentElement ? this.canvas.parentElement.clientHeight : window.innerHeight;
  }

  _initParticles(count = 35) {
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 2.5 + 1.2,
        speedX: (Math.random() - 0.5) * 0.4,
        speedY: -Math.random() * 0.6 - 0.2, // slow rise
        color: Math.random() > 0.5 ? '#00f7ff' : '#ff007f',
        alpha: Math.random() * 0.5 + 0.2,
        symbol: Math.random() > 0.7 ? this.notes[Math.floor(Math.random() * this.notes.length)] : null,
      });
    }
  }

  triggerPulse() {
    this.pulseGlow = 1.0;
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

    // Subtle background cyber grid at the bottom
    this._drawPerspectiveGrid(w, h);

    // Pulse decay
    if (this.pulseGlow > 0) {
      this.ctx.save();
      const grad = this.ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, Math.max(w, h) * 0.75);
      grad.addColorStop(0, `rgba(0, 247, 255, ${0.12 * this.pulseGlow})`);
      grad.addColorStop(0.5, `rgba(255, 0, 127, ${0.08 * this.pulseGlow})`);
      grad.addColorStop(1, 'rgba(10, 5, 25, 0)');
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(0, 0, w, h);
      this.ctx.restore();
      this.pulseGlow = Math.max(0, this.pulseGlow - 0.03);
    }

    // Render particles
    this.particles.forEach(p => {
      p.x += p.speedX;
      p.y += p.speedY;

      if (p.y < -20) {
        p.y = h + 10;
        p.x = Math.random() * w;
      }
      if (p.x < -20) p.x = w + 10;
      if (p.x > w + 20) p.x = -10;

      this.ctx.save();
      this.ctx.shadowBlur = 8;
      this.ctx.shadowColor = p.color;

      if (p.symbol) {
        this.ctx.font = `${Math.floor(p.size * 5 + 9)}px 'Outfit', sans-serif`;
        this.ctx.fillStyle = p.color;
        this.ctx.globalAlpha = p.alpha;
        this.ctx.fillText(p.symbol, p.x, p.y);
      } else {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fillStyle = p.color;
        this.ctx.globalAlpha = p.alpha;
        this.ctx.fill();
      }

      this.ctx.restore();
    });
  }

  _drawPerspectiveGrid(w, h) {
    this.ctx.save();
    const horizon = h * 0.72;
    this.ctx.strokeStyle = 'rgba(160, 40, 240, 0.15)';
    this.ctx.lineWidth = 1;

    // Vanishing point at bottom center
    const vpX = w / 2;
    const vpY = horizon;

    // Horizon line
    this.ctx.beginPath();
    this.ctx.moveTo(0, horizon);
    this.ctx.lineTo(w, horizon);
    this.ctx.stroke();

    // Perspective lines
    const numLines = 14;
    for (let i = 0; i <= numLines; i++) {
      const bottomX = (w / numLines) * i;
      this.ctx.beginPath();
      this.ctx.moveTo(vpX, vpY);
      this.ctx.lineTo(bottomX, h);
      this.ctx.stroke();
    }

    // Horizontal depth lines
    for (let y = horizon; y < h; y += (y - horizon + 12) * 0.35) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(w, y);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }
}
