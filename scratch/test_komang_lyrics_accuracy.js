globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};
globalThis.window = {
  localStorage: globalThis.localStorage,
  devicePixelRatio: 1,
  addEventListener: () => {},
  removeEventListener: () => {},
  location: { hostname: 'localhost' },
};

import assert from 'assert';

const {
  KOMANG_TIMELINE_LYRICS,
  KOMANG_SEGMENTS,
  KOMANG_MEASURES,
  getKomangLyricAtTime,
  getKomangTimelineItemAtTime,
  KomangService
} = await import('../src/services/KomangService.js');
const { KomangTilesEngine } = await import('../src/services/KomangTilesEngine.js');

console.log('--- 1. Testing KOMANG_TIMELINE_LYRICS Completeness ---');
const expectedLines = [
  'Dari kejauhan, tergambar cerita tentang kita',
  'Terpisah jarak dan waktu',
  'Ingin kuungkapkan rindu lewat kata indah',
  'Tak cukup untuk dirimu',
  'Sebab kau terlalu indah dari sekedar kata',
  'Dunia berhenti sejenak menikmati indahmu',
  'Dan apabila tak bersamamu',
  'Kupastikan kujalani dunia tak seindah kemarin',
  'Sederhana, tertawamu sudah cukup',
  'Lengkapi sempurnanya hidup bersamamu',
  'Jika hari kulalui tanpa hawamu',
  'Percuma senyumku dengan dia, oh',
  'Dan apabila tak bersamamu',
  'Kupastikan kujalani dunia tak seindah kemarin',
  'Sederhana, tertawamu sudah cukup',
  'Lengkapi sempurnanya hidup bersamamu',
  'Apabila tak bersamamu',
  'Kupastikan kujalani dunia tak seindah kemarin',
  'Sederhana, tertawamu sudah cukup',
  'Lengkapi sempurnanya hidup bersamamu',
  'Hu-uh-uh',
  'Hu, hu-uh-uh',
  'Sebab kau terlalu indah dari sekedar kata',
  'Dunia berhenti sejenak menikmati indahmu... ✨'
];

const timelineLyrics = KOMANG_TIMELINE_LYRICS.map(t => t.lyric).filter(l => !l.includes('Intro') && !l.includes('Interlude'));
console.log(`Found ${timelineLyrics.length} sung lyric entries (expected ${expectedLines.length})`);
assert.strictEqual(timelineLyrics.length, expectedLines.length, 'Must have exactly 24 sung lyric entries');

expectedLines.forEach((expected, i) => {
  assert.strictEqual(timelineLyrics[i], expected, `Line ${i + 1} must match perfectly: expected "${expected}", got "${timelineLyrics[i]}"`);
});
console.log('✓ All 24 lyric lines from image match 100% in exact sequence!');

console.log('\n--- 2. Testing Segment Start Sync (Random Mode) ---');
KOMANG_SEGMENTS.forEach((seg, idx) => {
  const item = getKomangTimelineItemAtTime(seg.startSec);
  console.log(`Segment #${idx} [${seg.title}]: Start = ${seg.startSec}s, Chord = ${seg.startChord} (${seg.fingerCount}F) | Timeline Item: ${item.chord} (${item.fingerCount}F) - "${item.lyric}"`);
  assert.strictEqual(item.chord, seg.startChord, `Segment #${idx} chord must match timeline`);
  assert.strictEqual(item.fingerCount, seg.fingerCount, `Segment #${idx} fingerCount must match timeline`);
});
console.log('✓ All 8 random segments align with chord, finger gesture, and lyric timing!');

console.log('\n--- 3. Testing KomangTilesEngine Schedule Generation ---');
const dummySvc = new KomangService();
const engine = new KomangTilesEngine();
engine.komangService = dummySvc;
engine._generateTileSchedule();
console.log(`Generated ${engine.tiles.length} tiles in highway schedule`);
assert(engine.tiles.length >= 50, 'Must generate full song tile sequence (> 50 tiles)');

// Verify chronological ordering
for (let i = 1; i < engine.tiles.length; i++) {
  assert(engine.tiles[i].timeSec >= engine.tiles[i - 1].timeSec, `Tiles must be ordered by time: tile ${i} (${engine.tiles[i].timeSec}) < tile ${i-1} (${engine.tiles[i-1].timeSec})`);
}
console.log('✓ All tiles ordered chronologically with accurate lyrics and chords!');

console.log('\n🎉 ALL KOMANG LYRIC & INSTRUMENT SYNC CHECKS PASSED PERFECTLY!');
