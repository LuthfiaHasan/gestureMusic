// ParticleSystem.js - Ambient synthwave floating particles, grid, and musical notes

export class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.notes = ['♪', '♫', '♬', '♩', '✦', '✧'];
    this.animationId = null;
    this.pulseGlow = 0;
    this.isEcoMode = false;

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this._initParticles();
  }

  setEcoMode(enabled) {
    this.isEcoMode = !!enabled;
    this._initParticles(this.isEcoMode ? 12 : 35);
  }

  resize() {
    if (!this.canvas) return;
    this.dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this._initParticles();
  }

  _initParticles(customCount) {
    this.particles = [];
    const w = this.width || window.innerWidth || 1280;
    const h = this.height || window.innerHeight || 800;
    const isDesktop = w > 850;
    const count = customCount || (this.isEcoMode ? 20 : (isDesktop ? 65 : 35));
    const symbols = ['♪', '♫', '♬', '♩', '✦', '✧', '★', '🎵', '🎶'];
    const colors = ['#00f7ff', '#38bdf8', '#fbbf24', '#f43f5e', '#34d399', '#a78bfa', '#f472b6'];

    for (let i = 0; i < count; i++) {
      const sym = symbols[Math.floor(Math.random() * symbols.length)];
      const isNote = ['♪', '♫', '♬', '♩', '🎵', '🎶'].includes(sym);

      this.particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: isNote ? (Math.random() * 12 + 20) : (Math.random() * 8 + 12),
        speedX: (Math.random() - 0.5) * 0.4,
        speedY: -Math.random() * 0.5 - 0.25,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: Math.random() * 0.02 + 0.01,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.35 + 0.65, // Bright, crisp visibility (0.65 - 1.0)
        symbol: sym,
      });
    }
  }

  triggerPulse() {
    this.pulseGlow = 1.0;
  }

  start() {
    if (this.animationId) return; // Prevent multiple concurrent RAF loops
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
    const w = this.width || window.innerWidth;
    const h = this.height || window.innerHeight;
    const dpr = this.dpr || 1;

    this.ctx.save();
    this.ctx.scale(dpr, dpr);
    this.ctx.clearRect(0, 0, w, h);

    // Subtle ambient flash on hit pulse
    if (this.pulseGlow > 0) {
      this.ctx.save();
      const grad = this.ctx.createRadialGradient(w / 2, h / 2, 80, w / 2, h / 2, Math.max(w, h) * 0.7);
      grad.addColorStop(0, `rgba(20, 179, 212, ${0.12 * this.pulseGlow})`);
      grad.addColorStop(1, 'rgba(6, 21, 45, 0)');
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(0, 0, w, h);
      this.ctx.restore();
      this.pulseGlow = Math.max(0, this.pulseGlow - 0.04);
    }

    // Render crisp, sharp particles (NO BLUR, NO FUZZY SHADOWS)
    this.particles.forEach(p => {
      p.swayPhase += p.swaySpeed;
      p.x += p.speedX + Math.sin(p.swayPhase) * 0.4;
      p.y += p.speedY;

      if (p.y < -35) {
        p.y = h + 20;
        p.x = Math.random() * w;
      }
      if (p.x < -35) p.x = w + 20;
      if (p.x > w + 35) p.x = -20;

      this.ctx.save();
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.font = `bold ${Math.round(p.size)}px "Segoe UI Emoji", "Segoe UI Symbol", "Apple Color Emoji", "Plus Jakarta Sans", sans-serif`;
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = 6;
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillText(p.symbol, p.x, p.y);
      this.ctx.restore();
    });

    this.ctx.restore();
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
