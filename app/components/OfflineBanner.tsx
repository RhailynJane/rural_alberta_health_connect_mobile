import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

type OfflineBannerProps = {
  // global: used at the very top of the app layout and should include SafeArea padding
  // inline: used within a screen below headers; should NOT include SafeArea padding
  variant?: 'global' | 'inline';
};

export function OfflineBanner({ variant = 'global' }: OfflineBannerProps) {
  const { isOnline } = useNetworkStatus();
  const insets = useSafeAreaInsets();

  if (isOnline) {
    return null;
  }

  return (
    <View
      style={[
        styles.banner,
        variant === 'global' ? { paddingTop: insets.top + 8 } : styles.inlineBanner,
      ]}
    >
      <Text style={styles.text}>📴 Offline Mode - Showing cached data</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FFA500',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  inlineBanner: {
    paddingTop: 8,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
