import React from 'react';
import { useSyncOnOnline } from '../hooks/useSyncOnOnline';

/**
 * Component that enables automatic sync of offline data when coming online
 * Must be placed inside ConvexAuthProvider
 */
export function SyncProvider({ children }: { children: React.ReactNode }) {
  // This hook will automatically sync data when coming online
  useSyncOnOnline();

  return <>{children}</>;
}
