// components/BottomNavigation.tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import { usePathname, useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FONTS } from '../constants/constants';

interface Tab {
  name: string;
  label: string;
  route: string;
  iconName: keyof typeof Ionicons.glyphMap;
  iconNameFocused: keyof typeof Ionicons.glyphMap;
}

const tabs: Tab[] = [
  {
    name: 'Home',
    label: 'Home',
    route: '/dashboard',
    iconName: 'home-outline',
    iconNameFocused: 'home'
  },
  {
    name: 'AIAssess',
    label: 'AI Assess',
    route: '/ai-assess',
    iconName: 'medical-outline',
    iconNameFocused: 'medical'
  },
  {
    name: 'AITest',
    label: 'AI Test',
    route: '/ai-test',
    iconName: 'flask-outline',
    iconNameFocused: 'flask'
  },
  {
    name: 'VisionTest',
    label: 'Vision Test',
    route: '/vision-test',
    iconName: 'eye-outline',
    iconNameFocused: 'eye'
  },
  {
    name: 'Tracker',
    label: 'Tracker',
    route: '/tracker',
    iconName: 'stats-chart-outline',
    iconNameFocused: 'stats-chart'
  },
  {
    name: 'Emergency',
    label: 'Emergency',
    route: '/emergency',
    iconName: 'alert-circle-outline',
    iconNameFocused: 'alert-circle'
  },
  {
    name: 'Profile',
    label: 'Profile',
    route: '/profile',
    iconName: 'person-outline',
    iconNameFocused: 'person'
  },
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
            <Ionicons 
              name={isFocused ? tab.iconNameFocused : tab.iconName} 
              size={24} 
              color={isFocused ? '#2A7DE1' : '#666'} 
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
    flexDirection: 'row',
    height: 70,
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
    paddingVertical: 6,
    paddingHorizontal: 2,
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