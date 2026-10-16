// MidiParserService.js - Native Standard MIDI File (.mid / .midi) Binary Parser
// Parses format 0 & 1 SMF files into structured musical phrases and playable rhythm targets

import { chordMappingService } from './ChordMappingService.js';

export class MidiParserService {
  /**
   * Parse an ArrayBuffer containing a standard MIDI file
   * @param {ArrayBuffer} buffer
   * @param {string} fileName
   */
  static parseMidiFile(buffer, fileName = 'custom_song.mid') {
    if (!buffer || buffer.byteLength < 14) {
      throw new Error('File MIDI terlalu kecil atau rusak.');
    }

    const data = new DataView(buffer);
    let offset = 0;

    // 1. Verify Header Chunk "MThd" (0x4D546864)
    const headerTag = this._readString(data, offset, 4);
    offset += 4;
    if (headerTag !== 'MThd') {
      throw new Error('Bukan file MIDI standar yang valid (Header MThd tidak ditemukan).');
    }

    const headerLength = data.getUint32(offset, false);
    offset += 4;
    if (headerLength < 6) {
      throw new Error('Header MIDI tidak valid (ukuran header < 6).');
    }

    const format = data.getUint16(offset, false);
    offset += 2;
    const numTracks = data.getUint16(offset, false);
    offset += 2;
    const division = data.getUint16(offset, false);
    offset += 2;

    // Skip any extra header bytes if headerLength > 6
    if (headerLength > 6) {
      offset += (headerLength - 6);
    }

    // division: ticks per quarter note (if positive)
    if (division & 0x8000) {
      throw new Error('Format pembagian waktu SMPTE saat ini belum didukung. Gunakan file MIDI bertempo standar (PPQ).');
    }
    const ticksPerQuarter = division || 480;

    // 2. Parse Tracks
    let defaultBpm = 120;
    const tempoEvents = []; // { tick, bpm }
    const noteEvents = []; // { tick, durationTicks, note, velocity, channel }
    const trackNames = [];

    for (let trackIdx = 0; trackIdx < numTracks; trackIdx++) {
      if (offset >= data.byteLength) break;

      const trackTag = this._readString(data, offset, 4);
      offset += 4;
      if (trackTag !== 'MTrk') {
        // Skip unexpected chunk
        if (offset + 4 <= data.byteLength) {
          const skipLen = data.getUint32(offset, false);
          offset += 4 + skipLen;
          continue;
        } else {
          break;
        }
      }

      const trackLen = data.getUint32(offset, false);
      offset += 4;
      const trackEndOffset = offset + trackLen;

      let currentTick = 0;
      let runningStatus = 0;
      const activeNotes = {}; // noteKey -> { tick, note, velocity, channel }

      while (offset < trackEndOffset && offset < data.byteLength) {
        // Read Delta Time (Variable Length Quantity)
        const { value: deltaTicks, bytesRead: dtBytes } = this._readVLQ(data, offset);
        offset += dtBytes;
        currentTick += deltaTicks;

        let statusByte = data.getUint8(offset);

        // Check Running Status
        if (statusByte < 0x80) {
          if (!runningStatus) {
            throw new Error(`Running status tidak valid pada offset ${offset}`);
          }
          statusByte = runningStatus;
        } else {
          offset++;
          runningStatus = statusByte;
        }

        // Meta Events
        if (statusByte === 0xFF) {
          const metaType = data.getUint8(offset++);
          const { value: metaLen, bytesRead: mlBytes } = this._readVLQ(data, offset);
          offset += mlBytes;

          if (metaType === 0x51 && metaLen === 3) {
            // Set Tempo: microseconds per quarter note
            const mpqn = (data.getUint8(offset) << 16) | (data.getUint8(offset + 1) << 8) | data.getUint8(offset + 2);
            const bpm = Math.round(60000000 / (mpqn || 500000));
            tempoEvents.push({ tick: currentTick, bpm: Math.max(40, Math.min(220, bpm)) });
            if (tempoEvents.length === 1) defaultBpm = bpm;
          } else if (metaType === 0x03) {
            // Track Name
            const nameStr = this._readString(data, offset, metaLen);
            if (nameStr && nameStr.trim()) trackNames.push(nameStr.trim());
          }

          offset += metaLen;
          continue;
        }

        // Sysex Events
        if (statusByte === 0xF0 || statusByte === 0xF7) {
          const { value: sysexLen, bytesRead: slBytes } = this._readVLQ(data, offset);
          offset += slBytes + sysexLen;
          continue;
        }

        const eventType = statusByte & 0xF0;
        const channel = statusByte & 0x0F;

        if (eventType === 0x90) {
          // Note On
          const noteNumber = data.getUint8(offset++);
          const velocity = data.getUint8(offset++);
          const noteKey = `${channel}_${noteNumber}`;

          if (velocity > 0) {
            // End any already ringing instance of this note
            if (activeNotes[noteKey]) {
              const prev = activeNotes[noteKey];
              noteEvents.push({
                tick: prev.tick,
                durationTicks: Math.max(1, currentTick - prev.tick),
                note: prev.note,
                velocity: prev.velocity,
                channel: prev.channel,
              });
            }
            activeNotes[noteKey] = { tick: currentTick, note: noteNumber, velocity, channel };
          } else {
            // Velocity 0 is Note Off
            if (activeNotes[noteKey]) {
              const prev = activeNotes[noteKey];
              noteEvents.push({
                tick: prev.tick,
                durationTicks: Math.max(1, currentTick - prev.tick),
                note: prev.note,
                velocity: prev.velocity,
                channel: prev.channel,
              });
              delete activeNotes[noteKey];
            }
          }
        } else if (eventType === 0x80) {
          // Note Off
          const noteNumber = data.getUint8(offset++);
          const velocity = data.getUint8(offset++);
          const noteKey = `${channel}_${noteNumber}`;
          if (activeNotes[noteKey]) {
            const prev = activeNotes[noteKey];
            noteEvents.push({
              tick: prev.tick,
              durationTicks: Math.max(1, currentTick - prev.tick),
              note: prev.note,
              velocity: prev.velocity,
              channel: prev.channel,
            });
            delete activeNotes[noteKey];
          }
        } else if (eventType === 0xA0 || eventType === 0xB0 || eventType === 0xE0) {
          // 2 data bytes
          offset += 2;
        } else if (eventType === 0xC0 || eventType === 0xD0) {
          // 1 data byte
          offset += 1;
        }
      }

      // Close remaining active notes
      for (const k in activeNotes) {
        const item = activeNotes[k];
        noteEvents.push({
          tick: item.tick,
          durationTicks: ticksPerQuarter,
          note: item.note,
          velocity: item.velocity,
          channel: item.channel,
        });
      }
    }

    if (noteEvents.length === 0) {
      throw new Error('File MIDI ini tidak memiliki event not musik yang dapat dimainkan.');
    }

    // Sort notes by tick
    noteEvents.sort((a, b) => a.tick - b.tick);

    // 3. Convert Ticks to Milliseconds using Tempo Map
    const tempoMap = tempoEvents.length > 0 ? tempoEvents : [{ tick: 0, bpm: defaultBpm }];
    tempoMap.sort((a, b) => a.tick - b.tick);

    const tickToMs = (targetTick) => {
      let totalMs = 0;
      let lastTick = 0;
      let curBpm = defaultBpm;

      for (const tEvent of tempoMap) {
        if (targetTick <= tEvent.tick) break;
        const segmentTicks = tEvent.tick - lastTick;
        const msPerQuarter = (60000 / curBpm);
        totalMs += (segmentTicks / ticksPerQuarter) * msPerQuarter;
        lastTick = tEvent.tick;
        curBpm = tEvent.bpm;
      }

      const remainingTicks = targetTick - lastTick;
      const msPerQuarter = (60000 / curBpm);
      totalMs += (remainingTicks / ticksPerQuarter) * msPerQuarter;
      return Math.round(totalMs);
    };

    const notesWithTime = noteEvents.map(n => ({
      ...n,
      startMs: tickToMs(n.tick),
      durationMs: Math.max(80, tickToMs(n.tick + n.durationTicks) - tickToMs(n.tick)),
    }));

    const totalDurationMs = notesWithTime.length > 0 
      ? notesWithTime[notesWithTime.length - 1].startMs + notesWithTime[notesWithTime.length - 1].durationMs
      : 0;

    // 4. Harmonic Segmentation into Diatonic Chords & Playable Finger Targets
    const playablePhrase = this._generatePlayableChart(notesWithTime, defaultBpm, fileName);

    return {
      title: (trackNames[0] || fileName.replace(/\.[^/.]+$/, "")).toUpperCase(),
      bpm: defaultBpm,
      numTracks,
      noteCount: noteEvents.length,
      durationMs: totalDurationMs,
      durationFormatted: this._formatDuration(totalDurationMs / 1000),
      rawNotes: notesWithTime,
      phrase: playablePhrase,
    };
  }

  /**
   * Groups MIDI notes into rhythmic measures and detects chord roots mapped to gestures
   */
  static _generatePlayableChart(notes, bpm, songTitle) {
    const msPerBeat = (60000 / bpm);
    const msPerMeasure = msPerBeat * 4; // Standard 4/4 meter
    const maxMeasure = Math.ceil(notes[notes.length - 1].startMs / msPerMeasure);

    const diatonicChordNames = ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bm'];
    const chordFingers = { 'Am': 0, 'C': 1, 'D': 2, 'Dm': 2, 'Em': 3, 'F': 4, 'G': 5, 'Bm': 7 };
    const pitchClasses = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    const chartChords = [];

    for (let m = 0; m <= maxMeasure; m++) {
      const measureStart = m * msPerMeasure;
      const measureEnd = measureStart + msPerMeasure;
      const measureNotes = notes.filter(n => n.startMs >= measureStart && n.startMs < measureEnd);

      if (measureNotes.length === 0) continue;

      // Histogram of pitch classes
      const counts = {};
      measureNotes.forEach(n => {
        const pc = pitchClasses[n.note % 12];
        counts[pc] = (counts[pc] || 0) + 1;
      });

      // Find most prominent diatonic chord
      let bestChord = 'C';
      let maxScore = -1;

      // Score matching diatonic chords
      const candidateRoots = ['C', 'G', 'Am', 'F', 'Dm', 'Em', 'D', 'Bm'];
      for (const ch of candidateRoots) {
        const chordPcs = this._getChordPitchClasses(ch);
        let score = 0;
        chordPcs.forEach(pc => {
          score += (counts[pc] || 0) * 2;
        });
        if (score > maxScore) {
          maxScore = score;
          bestChord = ch;
        }
      }

      const fingerCount = chordFingers[bestChord] !== undefined ? chordFingers[bestChord] : 1;

      chartChords.push({
        measure: m + 1,
        chord: bestChord,
        fingerCount,
        startTimeMs: measureStart,
        durationMs: msPerMeasure,
        melodyNote: pitchClasses[measureNotes[0].note % 12] + Math.floor(measureNotes[0].note / 12),
        noteCount: measureNotes.length,
      });
    }

    // Limit to reasonable song phrases if extremely long (max 32 measures for active round)
    const limitedChords = chartChords.slice(0, 32);

    return {
      title: songTitle.replace(/\.[^/.]+$/, ""),
      mood: 'Custom MIDI Import',
      tempo: bpm,
      timeSignature: '4/4',
      scale: 'C Major / Diatonic',
      chords: limitedChords.map(c => c.chord),
      measures: limitedChords,
      allowedChords: Array.from(new Set(limitedChords.map(c => c.chord))),
      allowedFingers: Array.from(new Set(limitedChords.map(c => c.fingerCount))),
    };
  }

  static _getChordPitchClasses(chordSymbol) {
    const table = {
      'C': ['C', 'E', 'G'],
      'D': ['D', 'F#', 'A'],
      'Dm': ['D', 'F', 'A'],
      'Em': ['E', 'G', 'B'],
      'F': ['F', 'A', 'C'],
      'G': ['G', 'B', 'D'],
      'Am': ['A', 'C', 'E'],
      'Bm': ['B', 'D', 'F#'],
    };
    return table[chordSymbol] || ['C', 'E', 'G'];
  }

  static _readString(dataView, offset, length) {
    let str = '';
    for (let i = 0; i < length; i++) {
      if (offset + i < dataView.byteLength) {
        str += String.fromCharCode(dataView.getUint8(offset + i));
      }
    }
    return str;
  }

  static _readVLQ(dataView, offset) {
    let value = 0;
    let bytesRead = 0;
    while (offset + bytesRead < dataView.byteLength) {
      const byte = dataView.getUint8(offset + bytesRead);
      bytesRead++;
      value = (value << 7) | (byte & 0x7F);
      if (!(byte & 0x80)) break;
    }
    return { value, bytesRead };
  }

  static _formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
