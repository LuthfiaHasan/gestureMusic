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
      this._renderSingleHand(ctx, w * 0.28, h * 0.55, w * 0.42, 5, '#14b3d4', true); // Left hand (5)
      this._renderSingleHand(ctx, w * 0.72, h * 0.55, w * 0.42, leftCount, '#fbb040', false); // Right hand (remainder)
    } else {
      // Draw single hand centered
      const color = fingerCount === 0 ? '#0b5fa5' : '#14b3d4';
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
    ctx.fillStyle = 'rgba(10, 42, 102, 0.75)';
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 3;

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
    const color = isConfirmed ? '#00e5a3' : '#14b3d4';
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Draws a dedicated, high-contrast illustrated hand guide for TV display
   * showing target fingers raised with clear numbers, glowing joints, and match feedback.
   */
  static drawTVHandGuide(canvas, targetFingers = 1, currentFingers = 0, chordName = 'G', isMatched = false) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w * 0.5;
    const cy = h * 0.55;
    const size = Math.min(w * 0.72, h * 0.68);

    // Flash Tech Brand Theme: Cyan for target, Emerald for match, Amber for highlights
    const targetColor = isMatched ? '#00e5a3' : '#14b3d4';
    const accentGlow = isMatched ? 'rgba(0, 229, 163, 0.35)' : 'rgba(20, 179, 212, 0.28)';

    // 1. Subtle illuminated circular radar backdrop
    ctx.save();
    const bgRadGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, size * 0.95);
    bgRadGrad.addColorStop(0, accentGlow);
    bgRadGrad.addColorStop(0.5, 'rgba(10, 42, 102, 0.22)');
    bgRadGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = bgRadGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.95, 0, Math.PI * 2);
    ctx.fill();

    // Radar subtle ring
    ctx.strokeStyle = isMatched ? 'rgba(0, 229, 163, 0.35)' : 'rgba(20, 179, 212, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.88, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 2. Draw Hand Anatomy
    ctx.save();
    ctx.translate(cx, cy);
    const scale = size / 160;
    ctx.scale(scale, scale);

    // Palm base
    ctx.fillStyle = 'rgba(7, 25, 60, 0.92)';
    ctx.strokeStyle = targetColor;
    ctx.lineWidth = isMatched ? 3.5 : 2.5;

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

    // Palm chord label in center
    ctx.save();
    ctx.fillStyle = isMatched ? '#00e5a3' : '#fbb040';
    ctx.font = 'bold 13px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(chordName, 0, 15);
    ctx.restore();

    // Circuit palm accents
    ctx.strokeStyle = isMatched ? 'rgba(0, 229, 163, 0.7)' : 'rgba(20, 179, 212, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, 42);
    ctx.lineTo(0, 24);
    ctx.moveTo(0, 5);
    ctx.lineTo(-12, -6);
    ctx.moveTo(0, 5);
    ctx.lineTo(12, -6);
    ctx.stroke();

    // Finger open states based on targetFingers: [thumb, index, middle, ring, pinky]
    let openStates = [false, false, false, false, false];
    switch (targetFingers) {
      case 1: openStates = [false, true, false, false, false]; break;
      case 2: openStates = [false, true, true, false, false]; break;
      case 3: openStates = [false, true, true, true, false]; break;
      case 4: openStates = [false, true, true, true, true]; break;
      case 5: openStates = [true, true, true, true, true]; break;
      default: openStates = [false, true, false, false, false]; break;
    }

    const fingerSpecs = [
      { angle: -0.85, len: 42, x: -35, y: 12, open: openStates[0], num: targetFingers === 5 ? 5 : null },
      { angle: -0.22, len: 54, x: -20, y: -18, open: openStates[1], num: 1 },
      { angle: 0.0,   len: 60, x: 0,   y: -22, open: openStates[2], num: targetFingers >= 2 ? 2 : null },
      { angle: 0.20,  len: 54, x: 20,  y: -18, open: openStates[3], num: targetFingers >= 3 ? 3 : null },
      { angle: 0.42,  len: 44, x: 35,  y: -5,  open: openStates[4], num: targetFingers >= 4 ? 4 : null },
    ];

    fingerSpecs.forEach(f => {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.angle);

      const fLen = f.open ? f.len : 18;
      const fColor = f.open ? targetColor : 'rgba(90, 115, 150, 0.35)';

      ctx.strokeStyle = fColor;
      ctx.lineWidth = f.open ? (isMatched ? 4.5 : 3.5) : 2;

      // Finger bone line
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -fLen);
      ctx.stroke();

      // Fingertip joint
      ctx.beginPath();
      ctx.arc(0, -fLen, f.open ? 6 : 3.5, 0, Math.PI * 2);
      ctx.fillStyle = f.open ? '#ffffff' : fColor;
      ctx.fill();

      // Glowing tip ring if open
      if (f.open) {
        ctx.beginPath();
        ctx.arc(0, -fLen, 10, 0, Math.PI * 2);
        ctx.strokeStyle = targetColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Finger number badge at tip
        if (f.num !== null) {
          ctx.save();
          ctx.rotate(-f.angle);
          ctx.fillStyle = isMatched ? '#003318' : '#071f45';
          ctx.beginPath();
          ctx.arc(0, -fLen - 12, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = targetColor;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(f.num), 0, -fLen - 12);
          ctx.restore();
        }
      }

      ctx.restore();
    });

    ctx.restore();

    // 3. Match Status Banner in Canvas
    if (isMatched) {
      ctx.save();
      ctx.fillStyle = '#00e5a3';
      ctx.font = '800 13px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✔ GESTUR COCOK!', w * 0.5, 20);
      ctx.restore();
    }
  }
}
