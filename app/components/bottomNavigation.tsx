// components/BottomNavigation.tsx
import { usePathname, useRouter } from 'expo-router';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONTS } from '../constants/constants';

interface Tab {
  name: string;
  label: string;
  route: string;
  iconSource: any;
  iconSourceFocused: any;
}

const tabs: Tab[] = [
  {
    name: 'Home',
    label: 'Home',
    route: '/dashboard',
    iconSource: require('../../assets/images/home-icon.png'),
    iconSourceFocused: require('../../assets/images/home-icon.png'),
  },
  {
    name: 'AIAssess',
    label: 'AI Assess',
    route: '/ai-assess',
    iconSource: require('../../assets/images/assess-icon.png'),
    iconSourceFocused: require('../../assets/images/assess-icon.png'),
  },
  {
    name: 'Tracker',
    label: 'Tracker',
    route: '/tracker',
    iconSource: require('../../assets/images/tracker-icon.png'),
    iconSourceFocused: require('../../assets/images/tracker-icon.png'),
  },
  {
    name: 'Emergency',
    label: 'Emergency',
    route: '/emergency',
    iconSource: require('../../assets/images/emergency-icon.png'),
    iconSourceFocused: require('../../assets/images/emergency-icon.png'),
  },
  {
    name: 'Profile',
    label: 'Profile',
    route: '/profile',
    iconSource: require('../../assets/images/profile-icon.png'),
    iconSourceFocused: require('../../assets/images/profile-icon.png'),
  },
];

const BottomNavigation: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  // Calculate dynamic height with safe area + minimal padding
  const containerHeight = 70 + insets.bottom;

  return (
    <View style={[styles.container, { 
      height: containerHeight,
      paddingBottom: insets.bottom + 4 
    }]}>
      {tabs.map((tab) => {
        const isFocused = pathname === tab.route;

        const onPress = () => {
          // Use navigate for tab switching - doesn't add to stack
          if (!isFocused) {
            router.navigate(tab.route as any);
          }
        };

        return (
          <TouchableOpacity
            key={tab.name}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={onPress}
            style={[styles.tab, isFocused && styles.tabFocused]}
          >
            <Image 
              source={isFocused ? tab.iconSourceFocused : tab.iconSource} 
              style={{ width: 24, height: 24, tintColor: isFocused ? '#2A7DE1' : '#666' }}
              resizeMode='contain'
            />
            <Text 
              style={[styles.tabText, isFocused && styles.tabTextFocused]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
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
    paddingHorizontal: 2,
    paddingVertical: 8,
  },
  tabFocused: {
    borderTopWidth: 2,
    borderTopColor: '#2A7DE1',
  },
  tabText: {
    fontSize: 9,
    color: '#666',
    fontFamily: FONTS.BarlowSemiCondensed,
    marginTop: 4,
    textAlign: 'center',
    width: '100%',
  },
  tabTextFocused: {
    color: '#2A7DE1',
    fontWeight: '600',
  },
});

export default BottomNavigation;