import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Helper: decide online using both flags when available
    const computeOnline = (state: NetInfoState) => {
      const connected = state.isConnected ?? false;
      // Treat explicitly false as offline; null/undefined means unknown => assume offline
      const reachable = state.isInternetReachable === true;
      return connected && reachable;
    };

    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(computeOnline(state));
      setIsChecking(false);
    });

    // Initial check
    NetInfo.fetch().then(state => {
      setIsOnline(computeOnline(state));
      setIsChecking(false);
    });

    return () => unsubscribe();
  }, []);

  return { isOnline, isChecking };
}
