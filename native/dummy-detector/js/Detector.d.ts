export type Detection = { x1: number; y1: number; x2: number; y2: number; score: number; label?: string };
export default function detectObjects(width?: number, height?: number, data?: Uint8Array | null): Detection[];
