// chord_mapping_service.dart - Gesture to chord mapping for Flutter mobile
class ChordMappingDetails {
  final int fingerCount;
  final String chord;
  final String name;
  final String emoji;
  final String label;

  const ChordMappingDetails({
    required this.fingerCount,
    required this.chord,
    required this.name,
    required this.emoji,
    required this.label,
  });
}

class ChordMappingService {
  final Map<int, ChordMappingDetails> _mapping = {
    0: ChordMappingDetails(fingerCount: 0, chord: 'Am', name: 'A Minor', emoji: '✊', label: 'Fist (0 Fingers)'),
    1: ChordMappingDetails(fingerCount: 1, chord: 'C', name: 'C Major', emoji: '☝️', label: '1 Finger'),
    2: ChordMappingDetails(fingerCount: 2, chord: 'D', name: 'D Major', emoji: '✌️', label: '2 Fingers'),
    3: ChordMappingDetails(fingerCount: 3, chord: 'Em', name: 'E Minor', emoji: '🤟', label: '3 Fingers'),
    4: ChordMappingDetails(fingerCount: 4, chord: 'F', name: 'F Major', emoji: '🖐️ (4)', label: '4 Fingers'),
    5: ChordMappingDetails(fingerCount: 5, chord: 'G', name: 'G Major', emoji: '🖐️', label: 'Open Palm (5)'),
    6: ChordMappingDetails(fingerCount: 6, chord: 'A', name: 'A Major', emoji: '🖐️ + ☝️', label: '6 Fingers (Two Hands)'),
    7: ChordMappingDetails(fingerCount: 7, chord: 'Bm', name: 'B Minor', emoji: '🖐️ + ✌️', label: '7 Fingers (Two Hands)'),
    8: ChordMappingDetails(fingerCount: 8, chord: 'Cmaj7', name: 'C Major 7', emoji: '🖐️ + 3', label: '8 Fingers (Two Hands)'),
    9: ChordMappingDetails(fingerCount: 9, chord: 'Dm', name: 'D Minor', emoji: '🖐️ + 4', label: '9 Fingers (Two Hands)'),
    10: ChordMappingDetails(fingerCount: 10, chord: 'Em7', name: 'E Minor 7', emoji: '🖐️ + 🖐️', label: '10 Fingers (Both Palms)'),
  };

  ChordMappingDetails getDetails(int fingerCount) {
    return _mapping[fingerCount] ?? _mapping[1]!;
  }

  String getChord(int fingerCount) {
    return getDetails(fingerCount).chord;
  }

  int getFingerCountForChord(String chord) {
    for (var entry in _mapping.entries) {
      if (entry.value.chord.toLowerCase() == chord.toLowerCase()) {
        return entry.key;
      }
    }
    return 1;
  }

  List<ChordMappingDetails> getAllMappings() => _mapping.values.toList();
}
