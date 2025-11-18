// JS / TS facade for the simple Dummy Detector.
// The JSI function is installed as a global function `detectObjects` (synchronous).

export type Detection = { x1: number; y1: number; x2: number; y2: number; score: number; label?: string };

export default function detectObjects(width?: number, height?: number, data?: Uint8Array | null): Detection[] {
  if (typeof (global as any).detectObjects === 'function') {
    try {
      // JSI host function returns an array synchronously.
      return (global as any).detectObjects(width || 0, height || 0, data || null) as Detection[];
    } catch (e) {
      console.warn('detectObjects: native call failed', e);
    }
  }

  // Fallback mock
  return [{ x1: 0.1, y1: 0.15, x2: 0.5, y2: 0.6, score: 0.85, label: 'person' }];
}

export function loadModel(paramPath: string, binPath: string): boolean {
  if (typeof (global as any).loadDetectionModel === 'function') {
    try {
      return !!(global as any).loadDetectionModel(paramPath, binPath);
    } catch (e) {
      console.warn('loadModel: native call failed', e);
      return false;
    }
  }
  return false;
}
