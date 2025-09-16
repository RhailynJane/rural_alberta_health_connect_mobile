import { Text, View } from 'react-native';
import BottomNavigation from '../../components/bottomNavigation';
import CurvedBackground from '../../components/curvedBackground';
import CurvedHeader from '../../components/curvedHeader';
import { FONTS } from '../../constants/constants';

export default function Tracker() {
  return (
    <CurvedBackground>
      <CurvedHeader
        title="Tracker"
        height={120}
        showLogo={true}
      />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontFamily: FONTS.BarlowSemiCondensed }}>Tracker Screen</Text>
      </View>
      <BottomNavigation />
    </CurvedBackground>
  );
}