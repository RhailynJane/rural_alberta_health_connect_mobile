/**
 * LLM Test Component
 *
 * Standalone component for testing ExecuTorch on-device LLM.
 * Import into any screen to test model loading and inference.
 *
 * Usage:
 *   import { LLMTest } from '@/utils/llm/LLMTest';
 *   <LLMTest />
 */

import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useWoundLLM } from './useWoundLLM';
import type { Detection } from '@/utils/yolo/types';

const MOCK_DETECTION: Detection = {
  classId: 6,
  className: 'cut',
  confidence: 0.85,
  box: { x: 100, y: 100, width: 50, height: 50 },
  boxCorners: { x1: 75, y1: 75, x2: 125, y2: 125 },
};

export function LLMTest() {
  const [output, setOutput] = useState<string>('');
  const [timing, setTiming] = useState<number | null>(null);

  const {
    isAvailable,
    isReady,
    isLoading,
    isGenerating,
    downloadProgress,
    response,
    error,
    generateContext,
    interrupt,
  } = useWoundLLM();

  const runTest = async () => {
    setOutput('');
    setTiming(null);

    const result = await generateContext([MOCK_DETECTION], {
      bodyLocation: 'left hand',
      injuryDuration: '10 minutes ago',
      userSymptoms: 'minor bleeding',
    });

    if (result.success) {
      setOutput(result.context);
      setTiming(result.generationTimeMs ?? null);
    } else {
      setOutput(`Error: ${result.error}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>LLM Test</Text>

      {/* Status */}
      <View style={styles.statusRow}>
        <Text style={styles.label}>Platform:</Text>
        <Text style={styles.value}>{Platform.OS}</Text>
      </View>
      <View style={styles.statusRow}>
        <Text style={styles.label}>Available:</Text>
        <Text style={[styles.value, { color: isAvailable ? '#4CAF50' : '#F44336' }]}>
          {isAvailable ? 'Yes' : 'No'}
        </Text>
      </View>
      <View style={styles.statusRow}>
        <Text style={styles.label}>Status:</Text>
        <Text style={styles.value}>
          {error ? 'Error' : isReady ? 'Ready' : isLoading ? `Loading (${Math.round(downloadProgress)}%)` : 'Idle'}
        </Text>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, (!isReady || isGenerating) && styles.buttonDisabled]}
          onPress={runTest}
          disabled={!isReady || isGenerating}
        >
          {isGenerating ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Run Test</Text>
          )}
        </TouchableOpacity>

        {isGenerating && (
          <TouchableOpacity style={styles.stopButton} onPress={interrupt}>
            <Text style={styles.stopButtonText}>Stop</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Streaming Response */}
      {(response || isGenerating) && (
        <View style={styles.responseBox}>
          <Text style={styles.responseLabel}>Streaming:</Text>
          <Text style={styles.responseText}>{response || '...'}</Text>
        </View>
      )}

      {/* Final Output */}
      {output && !isGenerating && (
        <ScrollView style={styles.outputBox}>
          <Text style={styles.outputLabel}>
            Output {timing ? `(${(timing / 1000).toFixed(1)}s)` : ''}:
          </Text>
          <Text style={styles.outputText}>{output}</Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    margin: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#1a1a1a',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  error: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    flex: 1,
    backgroundColor: '#2A7DE1',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  stopButton: {
    backgroundColor: '#F44336',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  stopButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  responseBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
  },
  responseLabel: {
    fontSize: 12,
    color: '#1565C0',
    marginBottom: 4,
  },
  responseText: {
    fontSize: 13,
    color: '#1a1a1a',
    lineHeight: 18,
  },
  outputBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    maxHeight: 200,
  },
  outputLabel: {
    fontSize: 12,
    color: '#4CAF50',
    marginBottom: 4,
  },
  outputText: {
    fontSize: 13,
    color: '#1a1a1a',
    lineHeight: 18,
  },
});

export default LLMTest;
