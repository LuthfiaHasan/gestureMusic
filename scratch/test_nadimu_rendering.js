// test_nadimu_rendering.js - Verify NadimuTilesEngine rendering in mock Canvas
global.localStorage = { getItem: () => null, setItem: () => {} };
global.window = { addEventListener: () => {}, location: { hostname: 'localhost' } };

class MockCanvasContext {
  constructor() {
    this.calls = [];
    this.fillStyle = '';
    this.strokeStyle = '';
    this.lineWidth = 1;
    this.font = '';
    this.textAlign = '';
    this.textBaseline = '';
    this.globalAlpha = 1;
  }
  createLinearGradient() {
    return { addColorStop: () => {} };
  }
  createRadialGradient() {
    return { addColorStop: () => {} };
  }
  save() { this.calls.push('save'); }
  restore() { this.calls.push('restore'); }
  beginPath() { this.calls.push('beginPath'); }
  closePath() { this.calls.push('closePath'); }
  moveTo() {}
  lineTo() {}
  quadraticCurveTo() {}
  stroke() { this.calls.push('stroke'); }
  fill() { this.calls.push('fill'); }
  fillRect() { this.calls.push('fillRect'); }
  clearRect() { this.calls.push('clearRect'); }
  fillText(text, x, y) {
    this.calls.push({ type: 'fillText', text, x, y });
  }
  strokeText(text, x, y) {
    this.calls.push({ type: 'strokeText', text, x, y });
  }
  measureText(text) {
    return { width: text.length * 8 };
  }
  translate() {}
  scale() {}
  arc() {}
  setTransform() {}
}

const mockCanvas = {
  getContext: () => new MockCanvasContext(),
  width: 600,
  height: 700,
  parentElement: { getBoundingClientRect: () => ({ width: 600, height: 700 }) },
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 600, height: 700 }),
};

async function run() {
  const { nadimuTilesEngine } = await import('../src/services/NadimuTilesEngine.js');
  const { nadimuService } = await import('../src/services/NadimuService.js');

  console.log('Testing NadimuTilesEngine initialization...');
  nadimuTilesEngine.init(mockCanvas, nadimuService);
  console.log('Total tiles generated:', nadimuTilesEngine.tiles.length);

  console.log('Testing draw(0) call...');
  nadimuTilesEngine.draw(0);
  console.log('draw(0) completed without error!');

  const textCalls = nadimuTilesEngine.ctx.calls.filter(c => c && c.type === 'fillText');
  console.log(`Rendered ${textCalls.length} text elements in frame!`);
  
  // Verify key chords are rendered
  const chordTexts = textCalls.map(c => c.text);
  console.log('Sample rendered texts:', chordTexts.slice(0, 15));

  const hasC = chordTexts.includes('C');
  const hasF = chordTexts.includes('F');
  const hasEm = chordTexts.includes('Em');
  const hasG = chordTexts.includes('G');
  const hasPrompt = chordTexts.some(t => t.includes('KLIK "MAIN 30s" ATAU SENTUH TUTS'));

  console.log('Assertions:');
  console.log('- Has C Key:', hasC);
  console.log('- Has F Key:', hasF);
  console.log('- Has Em Key:', hasEm);
  console.log('- Has G Key:', hasG);
  console.log('- Has Idle Overlay Prompt:', hasPrompt);

  if (hasC && hasF && hasEm && hasG && hasPrompt) {
    console.log('ALL NADIMU HIGHWAY RENDERING ASSERTIONS PASSED! ✅');
    process.exit(0);
  } else {
    console.error('FAILED: Missing elements!');
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
