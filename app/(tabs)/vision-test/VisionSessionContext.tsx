import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type Detection = {
  label: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

type FrameDim = { width: number; height: number };

type VisionSessionState = {
  capturedImage: string | null;
  capturedDetections: Detection[] | null;
  frameDimensions: FrameDim;
  setCapturedImage: (p: string | null) => void;
  setCapturedDetections: (d: Detection[] | null) => void;
  setFrameDimensions: (fd: FrameDim) => void;
  reset: () => void;
};

const VisionSessionContext = createContext<VisionSessionState | undefined>(undefined);

export const VisionSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedDetections, setCapturedDetections] = useState<Detection[] | null>(null);
  const [frameDimensions, setFrameDimensions] = useState<FrameDim>({ width: 0, height: 0 });

  const reset = useCallback(() => {
    setCapturedImage(null);
    setCapturedDetections(null);
    setFrameDimensions({ width: 0, height: 0 });
  }, []);

  const value = useMemo(() => ({
    capturedImage,
    capturedDetections,
    frameDimensions,
    setCapturedImage,
    setCapturedDetections,
    setFrameDimensions,
    reset,
  }), [capturedImage, capturedDetections, frameDimensions, reset]);

  return (
    <VisionSessionContext.Provider value={value}>{children}</VisionSessionContext.Provider>
  );
};

export const useVisionSession = () => {
  const ctx = useContext(VisionSessionContext);
  if (!ctx) throw new Error('useVisionSession must be used within VisionSessionProvider');
  return ctx;
};
