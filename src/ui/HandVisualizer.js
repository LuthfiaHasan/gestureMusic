// HandVisualizer.js - Renders holographic glowing hands and stability charge rings

export class HandVisualizer {
  /**
   * Draws a holographic cyberpunk hand schematic for a given finger count
   */
  static drawHandSchematic(canvas, fingerCount, shape = null) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const isTwoHands = fingerCount > 5;
    const leftCount = isTwoHands ? Math.min(5, fingerCount - 5) : 0;
    const rightCount = isTwoHands ? 5 : Math.min(5, fingerCount);

    if (isTwoHands) {
      // Draw two hands side by side
      this._renderSingleHand(ctx, w * 0.28, h * 0.55, w * 0.42, 5, '#00f7ff', true); // Left hand (5)
      this._renderSingleHand(ctx, w * 0.72, h * 0.55, w * 0.42, leftCount, '#ff007f', false); // Right hand (remainder)
    } else {
      // Draw single hand centered
      const color = fingerCount === 0 ? '#a020f0' : '#00f7ff';
      this._renderSingleHand(ctx, w * 0.5, h * 0.55, w * 0.7, fingerCount, color, false, shape);
    }
  }

  static _renderSingleHand(ctx, cx, cy, size, fingersOpen, mainColor, isLeft = false, shape = null) {
    ctx.save();
    ctx.translate(cx, cy);
    if (isLeft) ctx.scale(-1, 1);

    const scale = size / 160;
    ctx.scale(scale, scale);

    // Palm base
    ctx.fillStyle = 'rgba(20, 15, 45, 0.7)';
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 3;
    ctx.shadowColor = mainColor;
    ctx.shadowBlur = 10;

    // Draw palm polygon
    ctx.beginPath();
    ctx.moveTo(-25, 45); // wrist left
    ctx.lineTo(25, 45);  // wrist right
    ctx.lineTo(35, -5);  // pinky mcp
    ctx.lineTo(20, -18); // ring mcp
    ctx.lineTo(0, -22);  // middle mcp
    ctx.lineTo(-20, -18);// index mcp
    ctx.lineTo(-38, 10); // thumb mcp
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Circuit accents on palm
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 40);
    ctx.lineTo(0, 10);
    ctx.lineTo(-12, -2);
    ctx.moveTo(0, 10);
    ctx.lineTo(12, -2);
    ctx.stroke();

    // Finger configurations: [thumb, index, middle, ring, pinky]
    let openStates = [false, false, false, false, false];
    if (shape === 'THUMB_UP') {
      openStates = [true, false, false, false, false];
    } else {
      switch (fingersOpen) {
        case 0: openStates = [false, false, false, false, false]; break;
        case 1: openStates = [false, true, false, false, false]; break; // 1 = index
        case 2: openStates = [false, true, true, false, false]; break; // 2 = index+middle
        case 3: openStates = [false, true, true, true, false]; break; // 3 = index+mid+ring
        case 4: openStates = [false, true, true, true, true]; break;  // 4 = 4 fingers
        case 5: openStates = [true, true, true, true, true]; break;   // 5 = all open
      }
    }

    // Finger specs: [angle, length, mcpX, mcpY, isOpen]
    const fingerSpecs = [
      { angle: -0.85, len: 40, x: -35, y: 12, open: openStates[0], name: 'thumb' },
      { angle: -0.22, len: 52, x: -20, y: -18, open: openStates[1], name: 'index' },
      { angle: 0.0,   len: 58, x: 0,   y: -22, open: openStates[2], name: 'middle' },
      { angle: 0.20,  len: 52, x: 20,  y: -18, open: openStates[3], name: 'ring' },
      { angle: 0.42,  len: 42, x: 35,  y: -5,  open: openStates[4], name: 'pinky' },
    ];

    fingerSpecs.forEach(f => {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.angle);

      const fLen = f.open ? f.len : 18; // extended or folded
      const fColor = f.open ? mainColor : 'rgba(120, 120, 160, 0.45)';

      ctx.strokeStyle = fColor;
      ctx.lineWidth = f.open ? 4 : 3;
      ctx.shadowColor = f.open ? mainColor : 'transparent';
      ctx.shadowBlur = f.open ? 14 : 0;

      // Draw finger bone segments
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -fLen);
      ctx.stroke();

      // Fingertip joint
      ctx.beginPath();
      ctx.arc(0, -fLen, f.open ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fillStyle = f.open ? '#ffffff' : fColor;
      ctx.fill();

      // Glowing tip beacon if open
      if (f.open) {
        ctx.beginPath();
        ctx.arc(0, -fLen, 8, 0, Math.PI * 2);
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.restore();
    });

    ctx.restore();
  }

  /**
   * Draws a circular progress ring indicating gesture stabilization lock-in
   */
  static drawStabilityRing(ctx, cx, cy, radius, progress, isConfirmed = false) {
    if (progress <= 0.01) return;

    ctx.save();
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (Math.PI * 2 * Math.min(1.0, progress));

    // Background track ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Active charging arc
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    const color = isConfirmed ? '#00ff88' : '#00f7ff';
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.restore();
  }
}
