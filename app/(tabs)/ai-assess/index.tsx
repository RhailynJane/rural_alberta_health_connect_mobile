// app/ai-assess.tsx
import { Text, View } from 'react-native';
import BottomNavigation from '../../components/bottomNavigation';
import CurvedBackground from '../../components/curvedBackground';
import CurvedHeader from '../../components/curvedHeader';
import { FONTS } from '../../constants/constants';

export default function AIAssess() {
  return (
    <CurvedBackground>
      <CurvedHeader
        title="AI Assess"
        height={120}
        showLogo={true}
      />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontFamily: FONTS.BarlowSemiCondensed }}>AI Assess Screen</Text>
      </View>
      <BottomNavigation />
    </CurvedBackground>
  );
}