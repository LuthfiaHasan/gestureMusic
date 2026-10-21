import fs from 'fs';

function getMp3Duration(filePath) {
  const buffer = fs.readFileSync(filePath);
  let offset = 0;
  
  // Skip ID3v2 tag if present
  if (buffer.toString('ascii', 0, 3) === 'ID3') {
    const tagSize = (buffer[6] << 21) | (buffer[7] << 14) | (buffer[8] << 7) | buffer[9];
    offset = 10 + tagSize;
  }

  const bitrates = {
    1: [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
    2: [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
    3: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
  };
  const sampleRates = {
    1: [44100, 48000, 32000],
    2: [22050, 24000, 16000],
    2.5: [11025, 12000, 8000]
  };

  let totalDuration = 0;
  let frameCount = 0;
  let firstHeader = null;

  while (offset < buffer.length - 4) {
    if (buffer[offset] === 0xFF && (buffer[offset + 1] & 0xE0) === 0xE0) {
      const b1 = buffer[offset + 1];
      const b2 = buffer[offset + 2];
      const b3 = buffer[offset + 3];

      const versionBits = (b1 >> 3) & 3;
      const layerBits = (b1 >> 1) & 3;
      const bitrateIdx = (b2 >> 4) & 15;
      const sampleRateIdx = (b2 >> 2) & 3;
      const padding = (b2 >> 1) & 1;

      let version = versionBits === 3 ? 1 : (versionBits === 2 ? 2 : (versionBits === 0 ? 2.5 : null));
      let layer = layerBits === 3 ? 1 : (layerBits === 2 ? 2 : (layerBits === 1 ? 3 : null));

      if (version && layer && bitrateIdx > 0 && bitrateIdx < 15 && sampleRateIdx < 3) {
        const bitrate = (version === 1 ? bitrates[layer][bitrateIdx] : bitrates[2][bitrateIdx]) * 1000;
        const sampleRate = sampleRates[version][sampleRateIdx];
        const samplesPerFrame = layer === 1 ? 384 : (version === 1 ? 1152 : 576);
        const frameLength = Math.floor((samplesPerFrame * bitrate / 8) / sampleRate) + padding;

        if (!firstHeader) {
          firstHeader = { version, layer, bitrate, sampleRate };
        }

        totalDuration += samplesPerFrame / sampleRate;
        frameCount++;
        offset += frameLength;
        continue;
      }
    }
    offset++;
  }

  return { firstHeader, frameCount, durationSec: totalDuration };
}

console.log('komang_piano.mp3:', getMp3Duration('public/sounds/komang_piano.mp3'));
console.log('komang.mp3:', getMp3Duration('public/sounds/komang.mp3'));
console.log('komang_full.mp3:', getMp3Duration('public/sounds/komang_full.mp3'));
