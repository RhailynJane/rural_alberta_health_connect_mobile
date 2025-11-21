import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import detectObjects, { Detection, loadModel } from '../../../native/dummy-detector/js/Detector';

// Basic demo screen to exercise the JSI Dummy Detector.
// Route: /(tabs)/vision-test/detector-test
// Appears automatically via expo-router Stack.
export default function DetectorTestScreen() {
  const [modelLoaded, setModelLoaded] = useState<boolean | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jsiAvailable, setJsiAvailable] = useState(false);

  useEffect(() => {
    // Check if native JSI functions are installed.
    const available = typeof (global as any).detectObjects === 'function';
    setJsiAvailable(available);
  }, []);

  const attemptLoadModel = useCallback(() => {
    setError(null);
    try {
      // Provide placeholder paths; adjust if you bundle actual NCNN model files later.
      const ok = loadModel('/data/local/tmp/model.param', '/data/local/tmp/model.bin');
      setModelLoaded(ok);
      if (!ok) {
        setError('Model load reported false (expected without real files).');
      }
    } catch (e: any) {
      setModelLoaded(false);
      setError('Exception loading model: ' + e?.message);
    }
  }, []);

  const runDetection = useCallback(() => {
    setRunning(true);
    setError(null);
    try {
      // We pass dummy frame info (width/height). Data null triggers fallback logic if native not available.
      const result = detectObjects(1920, 1080, null);
      setDetections(result);
    } catch (e: any) {
      setError('Detection failed: ' + e?.message);
    } finally {
      setRunning(false);
    }
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Dummy Detector JSI Bridge</Text>

      <View style={styles.row}>
        <Status label="JSI Installed" value={jsiAvailable ? 'Yes' : 'Fallback (mock)'} state={jsiAvailable ? 'ok' : 'warn'} />
        <Status label="Model Loaded" value={modelLoaded === null ? 'Not attempted' : modelLoaded ? 'Yes' : 'No'} state={modelLoaded == null ? 'idle' : modelLoaded ? 'ok' : 'warn'} />
      </View>

      {error && <Text style={styles.error}>⚠ {error}</Text>}

      <View style={styles.buttons}>
        <ActionButton label="Load Model" onPress={attemptLoadModel} disabled={running} />
        <ActionButton label="Run Detection" onPress={runDetection} disabled={running} />
      </View>

      {running && <ActivityIndicator style={{ marginVertical: 12 }} />}

      <Text style={styles.subtitle}>Detections ({detections.length})</Text>
      {detections.map((d, i) => (
        <View key={i} style={styles.detection}>
          <Text style={styles.detText}>#{i + 1} {d.label || 'unlabeled'} score={d.score.toFixed(2)}</Text>
          <Text style={styles.coords}>[{d.x1.toFixed(2)}, {d.y1.toFixed(2)}] → [{d.x2.toFixed(2)}, {d.y2.toFixed(2)}]</Text>
        </View>
      ))}

      {!detections.length && <Text style={styles.empty}>No detections yet. Press &quot;Run Detection&quot;.</Text>}

      <View style={styles.notes}>
        <Text style={styles.noteHeader}>Notes</Text>
        <Text style={styles.note}>• This uses synchronous JSI host functions if available.</Text>
        <Text style={styles.note}>• Without a compiled native implementation it returns a mock detection.</Text>
        <Text style={styles.note}>• Replace model paths with actual .param/.bin files when integrating NCNN.</Text>
        <Text style={styles.note}>• Monitor with: adb logcat -s ReactNativeJS DummyDetector</Text>
      </View>
    </ScrollView>
  );
}

function Status({ label, value, state }: { label: string; value: string; state: 'ok' | 'warn' | 'idle'; }) {
  const color = state === 'ok' ? '#2e7d32' : state === 'warn' ? '#d32f2f' : '#555';
  return (
    <View style={styles.status}>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={[styles.statusValue, { color }]}>{value}</Text>
    </View>
  );
}

function ActionButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity style={[styles.button, disabled && styles.buttonDisabled]} onPress={onPress} disabled={disabled}>
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 18, fontWeight: '600', marginTop: 20, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 16 },
  status: { flex: 1, paddingVertical: 8 },
  statusLabel: { fontSize: 13, color: '#666' },
  statusValue: { fontSize: 15, fontWeight: '600' },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  button: { backgroundColor: '#1976d2', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 6 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: 'white', fontWeight: '600' },
  detection: { paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#ddd' },
  detText: { fontSize: 14, fontWeight: '600' },
  coords: { fontSize: 12, color: '#444' },
  empty: { fontStyle: 'italic', color: '#666' },
  error: { color: '#d32f2f', marginTop: 8 },
  notes: { marginTop: 28, backgroundColor: '#fafafa', padding: 12, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: '#e0e0e0' },
  noteHeader: { fontWeight: '700', marginBottom: 6 },
  note: { fontSize: 12, color: '#333', marginBottom: 4 },
});
