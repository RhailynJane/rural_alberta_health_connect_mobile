// Deprecated: vision-test removed. Provide no-op stubs to satisfy any lingering imports.
import React from 'react';

export type Detection = {
  label: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export const VisionSessionProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <>{children}</>
);

export const useVisionSession = () => ({
  capturedImage: null as string | null,
  capturedDetections: [] as Detection[],
  frameDimensions: { width: 0, height: 0 },
  setCapturedImage: (_p: string | null) => {},
  setCapturedDetections: (_d: Detection[] | null) => {},
  setFrameDimensions: (_fd: { width: number; height: number }) => {},
  reset: () => {},
});
