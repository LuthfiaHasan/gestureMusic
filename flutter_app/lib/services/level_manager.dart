// level_manager.dart - 10-level campaign configuration for Flutter
class GameLevel {
  final int level;
  final String title;
  final String subtitle;
  final int chordCount;
  final int memoryTimeSec;
  final List<String> allowedChords;
  final int perfectWindowMs;
  final int goodWindowMs;

  const GameLevel({
    required this.level,
    required this.title,
    required this.subtitle,
    required this.chordCount,
    required this.memoryTimeSec,
    required this.allowedChords,
    this.perfectWindowMs = 350,
    this.goodWindowMs = 750,
  });
}

class LevelManager {
  static const List<GameLevel> levels = [
    GameLevel(level: 1, title: 'Neon Dawn', subtitle: 'Foundation', chordCount: 3, memoryTimeSec: 10, allowedChords: ['C', 'Am', 'F'], perfectWindowMs: 400, goodWindowMs: 850),
    GameLevel(level: 2, title: 'Harmonic Pulse', subtitle: 'Palette Expansion', chordCount: 4, memoryTimeSec: 10, allowedChords: ['C', 'Am', 'F', 'G'], perfectWindowMs: 380, goodWindowMs: 800),
    GameLevel(level: 3, title: 'Synthwave Breeze', subtitle: 'Minor Reflections', chordCount: 5, memoryTimeSec: 9, allowedChords: ['C', 'G', 'Am', 'Em', 'F'], perfectWindowMs: 350, goodWindowMs: 750),
    GameLevel(level: 4, title: 'Cyber Groove', subtitle: 'Single Hand Mastery', chordCount: 5, memoryTimeSec: 8, allowedChords: ['C', 'D', 'Em', 'F', 'G', 'Am'], perfectWindowMs: 320, goodWindowMs: 700),
    GameLevel(level: 5, title: 'Midnight Reverie', subtitle: 'Tighter Precision', chordCount: 6, memoryTimeSec: 8, allowedChords: ['C', 'D', 'Em', 'F', 'G', 'A', 'Am'], perfectWindowMs: 280, goodWindowMs: 650),
    GameLevel(level: 6, title: 'Electric Horizon', subtitle: 'Seventh Harmonies', chordCount: 6, memoryTimeSec: 7, allowedChords: ['C', 'D', 'Em', 'F', 'G', 'A', 'Bm', 'Cmaj7'], perfectWindowMs: 260, goodWindowMs: 600),
    GameLevel(level: 7, title: 'Dual Nexus', subtitle: 'Bimanual Flow', chordCount: 7, memoryTimeSec: 7, allowedChords: ['C', 'Am', 'F', 'G', 'A', 'Bm', 'Dm', 'Cmaj7'], perfectWindowMs: 240, goodWindowMs: 550),
    GameLevel(level: 8, title: 'Polyphonic Rush', subtitle: 'Velocity Recall', chordCount: 8, memoryTimeSec: 6, allowedChords: ['C', 'D', 'Em', 'F', 'G', 'A', 'Bm', 'Cmaj7', 'Dm', 'Em7'], perfectWindowMs: 220, goodWindowMs: 500),
    GameLevel(level: 9, title: 'Cosmic Velocity', subtitle: 'Subconscious Reflexes', chordCount: 9, memoryTimeSec: 5, allowedChords: ['C', 'D', 'Em', 'F', 'G', 'A', 'Bm', 'Cmaj7', 'Dm', 'Em7'], perfectWindowMs: 200, goodWindowMs: 460),
    GameLevel(level: 10, title: 'Master of Motion', subtitle: 'Ultimate Synthesis', chordCount: 10, memoryTimeSec: 4, allowedChords: ['C', 'D', 'Em', 'F', 'G', 'A', 'Bm', 'Cmaj7', 'Dm', 'Em7'], perfectWindowMs: 180, goodWindowMs: 420),
  ];

  GameLevel getLevel(int levelNum) {
    final idx = (levelNum.clamp(1, 10)) - 1;
    return levels[idx];
  }
}
