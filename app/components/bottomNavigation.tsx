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
    name: 'Tracker',
    label: 'Tracker',
    route: '/tracker',
    iconSource: require('../../assets/images/tracker-icon.png'),
    iconSourceFocused: require('../../assets/images/tracker-icon.png'),
  },
  {
    name: 'AIAssess',
    label: 'AI Assess',
    route: '/ai-assess',
    iconSource: require('../../assets/images/assess-icon.png'),
    iconSourceFocused: require('../../assets/images/assess-icon.png'),
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

type BottomNavigationProps = {
  floating?: boolean;
};

const BottomNavigation: React.FC<BottomNavigationProps> = ({ floating = true }) => {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  // Calculate dynamic height with safe area + minimal padding
  const containerHeight = 96 + insets.bottom;

  const centerTab = tabs.find((t) => t.name === 'AIAssess');
  const sideTabs = tabs.filter((t) => t.name !== 'AIAssess');
  const leftTabs = sideTabs.slice(0, 2);
  const rightTabs = sideTabs.slice(2);

  return (
    <View
      style={[
        floating ? styles.containerFloating : styles.containerInline,
        {
          height: containerHeight,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <View style={styles.bar}>
        <View style={styles.sideGroupLeft}>
          {leftTabs.map((tab) => {
            const isFocused = pathname === tab.route;
            const onPress = () => {
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
                style={styles.tab}
              >
                <Image 
                  source={isFocused ? tab.iconSourceFocused : tab.iconSource} 
                  style={[styles.tabIcon, { tintColor: isFocused ? '#2A7DE1' : '#6F7682' }]}
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

        <View style={styles.sideGroupRight}>
          {rightTabs.map((tab) => {
            const isFocused = pathname === tab.route;
            const onPress = () => {
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
                style={styles.tab}
              >
                <Image 
                  source={isFocused ? tab.iconSourceFocused : tab.iconSource} 
                  style={[styles.tabIcon, { tintColor: isFocused ? '#2A7DE1' : '#6F7682' }]}
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
      </View>

      {floating && centerTab && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={pathname === centerTab.route ? { selected: true } : {}}
          onPress={() => {
            if (pathname !== centerTab.route) {
              router.navigate(centerTab.route as any);
            }
          }}
          style={[styles.centerButton, pathname === centerTab.route && styles.centerButtonFocused]}
        >
          <View style={styles.centerGlow} />
          <View style={styles.centerIconWrapper}>
            <Image 
              source={centerTab.iconSourceFocused}
              style={{ width: 28, height: 28, tintColor: '#fff' }}
              resizeMode='contain'
            />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  containerFloating: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  containerInline: {
    position: 'relative',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: 18,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#1E2A3B',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 1,
  },
  sideGroupLeft: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  sideGroupRight: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
    paddingVertical: 2,
  },
  tabIcon: {
    width: 22,
    height: 22,
  },
  tabText: {
    fontSize: 10,
    color: '#6F7682',
    fontFamily: FONTS.BarlowSemiCondensed,
    marginTop: 6,
    textAlign: 'center',
  },
  tabTextFocused: {
    color: '#2A7DE1',
    fontWeight: '700',
  },
  centerButton: {
    position: 'absolute',
    top: -30,
    left: '50%',
    marginLeft: -35,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#2A7DE1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2A7DE1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 14,
    elevation: 18,
    zIndex: 3,
  },
  centerButtonFocused: {
    shadowOpacity: 0.45,
    shadowRadius: 18,
  },
  centerGlow: {
    position: 'absolute',
    width: 106,
    height: 106,
    borderRadius: 53,
    backgroundColor: 'rgba(42,125,225,0.14)',
  },
  centerIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BottomNavigation;