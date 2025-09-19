import { Text, View } from 'react-native';
import BottomNavigation from '../../components/bottomNavigation';
import CurvedBackground from '../../components/curvedBackground';
import CurvedHeader from '../../components/curvedHeader';
import { FONTS } from '../../constants/constants';

export default function Profile() {
  return (
    <CurvedBackground>
      <CurvedHeader
        title="Profile"
        height={120}
        showLogo={true}
      />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontFamily: FONTS.BarlowSemiCondensed }}>Profile Screen</Text>
      </View>
      <BottomNavigation />
    </CurvedBackground>
  );
}