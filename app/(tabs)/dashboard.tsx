import { Text, View } from 'react-native';
import BottomNavigation from '../components/bottomNavigation';
import CurvedBackground from '../components/curvedBackground';
import CurvedHeader from '../components/curvedHeader';
import { FONTS } from '../constants/constants';

export default function dashboard() {
  return (
    <CurvedBackground>
      <CurvedHeader
        title="Dashboard"
        height={120}
        showLogo={true}
      />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontFamily: FONTS.BarlowSemiCondensed }}>Dashboard Screen</Text>
      </View>
      <BottomNavigation />
    </CurvedBackground>
  );
}