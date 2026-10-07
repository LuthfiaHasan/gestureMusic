// gesture_recognition_service.dart - Stability and finger count classification in Flutter
import 'dart:math';

class GestureEvent {
  final int totalFingers;
  final int leftFingers;
  final int rightFingers;
  final String gestureType;
  final DateTime timestamp;

  const GestureEvent({
    required this.totalFingers,
    required this.leftFingers,
    required this.rightFingers,
    required this.gestureType,
    required this.timestamp,
  });
}

class GestureRecognitionService {
  final int stabilityDurationMs;
  final int minFrames;
  int? _currentCandidateFingers;
  DateTime? _candidateStartTime;
  int _candidateFrames = 0;
  int? _confirmedFingers;
  int lastTransitionLatencyMs = 0;

  GestureRecognitionService({this.stabilityDurationMs = 60, this.minFrames = 2});

  GestureEvent? processRawFingers(int leftFingers, int rightFingers) {
    final total = leftFingers + rightFingers;
    final now = DateTime.now();

    if (_currentCandidateFingers == total) {
      _candidateFrames++;
      final elapsed = now.difference(_candidateStartTime!).inMilliseconds;
      // Fast Temporal Confirmation: 2 consistent frames or 60ms
      if (_candidateFrames >= minFrames || elapsed >= stabilityDurationMs) {
        if (_confirmedFingers != total) {
          lastTransitionLatencyMs = elapsed;
          _confirmedFingers = total;
          return GestureEvent(
            totalFingers: total,
            leftFingers: leftFingers,
            rightFingers: rightFingers,
            gestureType: total == 0 ? 'FIST' : total == 5 ? 'OPEN_PALM' : 'NATURAL',
            timestamp: now,
          );
        }
      }
    } else {
      _currentCandidateFingers = total;
      _candidateStartTime = now;
      _candidateFrames = 1;
    }
    return null;
  }

  void reset() {
    _currentCandidateFingers = null;
    _candidateStartTime = null;
    _candidateFrames = 0;
    _confirmedFingers = null;
  }
}
