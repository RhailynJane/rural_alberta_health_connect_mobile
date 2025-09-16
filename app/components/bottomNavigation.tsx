// components/BottomNavigation.tsx
import { usePathname, useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FONTS } from '../constants/constants';

interface Tab {
  name: string;
  label: string;
  route: string;
}

const tabs: Tab[] = [
  { name: 'Home', label: 'Home', route: '/dashboard' },
  { name: 'AIAssess', label: 'AI Assess', route: '/ai-assess' },
  { name: 'Tracker', label: 'Tracker', route: '/tracker' },
  { name: 'Emergency', label: 'Emergency', route: '/emergency' },
  { name: 'Profile', label: 'Profile', route: '/profile' },
];

const BottomNavigation: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isFocused = pathname === tab.route;

        const onPress = () => {
          router.push(tab.route as any);
        };

        return (
          <TouchableOpacity
            key={tab.name}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={onPress}
            style={[styles.tab, isFocused && styles.tabFocused]}
          >
            <Text style={[styles.tabText, isFocused && styles.tabTextFocused]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabFocused: {
    borderTopWidth: 2,
    borderTopColor: '#2A7DE1',
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  tabTextFocused: {
    color: '#2A7DE1',
    fontWeight: '600',
  },
});

export default BottomNavigation;