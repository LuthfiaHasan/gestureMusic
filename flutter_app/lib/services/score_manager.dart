// score_manager.dart - Score and accuracy calculation in Flutter
class ScoreManager {
  int score = 0;
  int combo = 0;
  int maxCombo = 0;
  int perfectCount = 0;
  int goodCount = 0;
  int missCount = 0;
  int totalNotes = 0;

  void reset() {
    score = 0;
    combo = 0;
    maxCombo = 0;
    perfectCount = 0;
    goodCount = 0;
    missCount = 0;
    totalNotes = 0;
  }

  double getMultiplier() {
    if (combo >= 20) return 3.0;
    if (combo >= 15) return 2.5;
    if (combo >= 10) return 2.0;
    if (combo >= 5) return 1.5;
    return 1.0;
  }

  void registerHit(String rating) {
    totalNotes++;
    final mult = getMultiplier();
    int base = 0;

    if (rating == 'PERFECT') {
      base = 100;
      perfectCount++;
      combo++;
    } else if (rating == 'GOOD') {
      base = 70;
      goodCount++;
      combo++;
    } else {
      missCount++;
      combo = 0;
    }

    score += (base * mult).round();
    if (combo > maxCombo) maxCombo = combo;
  }

  int getAccuracy() {
    if (totalNotes == 0) return 100;
    final weighted = (perfectCount * 100) + (goodCount * 70);
    return ((weighted / (totalNotes * 100)) * 100).round();
  }

  int getStars() {
    final acc = getAccuracy();
    if (acc >= 90) return 3;
    if (acc >= 75) return 2;
    if (acc >= 50) return 1;
    return 0;
  }
}
