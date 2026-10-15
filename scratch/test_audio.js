// Check audio file info
const fs = require('fs');
const stats = fs.statSync('public/sounds/selalu_ada_di_nadimu.mp3');
console.log('Audio file size:', stats.size, 'bytes');
