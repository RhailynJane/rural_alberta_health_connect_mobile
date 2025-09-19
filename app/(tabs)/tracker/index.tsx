import { Alert, Text, View } from 'react-native';
import BottomNavigation from '../../components/bottomNavigation';
import CurvedBackground from '../../components/curvedBackground';
import CurvedHeader from '../../components/curvedHeader';
import { FONTS } from '../../constants/constants';

export default function Tracker() {
  const handleEmergencyCall = (): void => {
    Alert.alert(
      "Emergency Call",
      "For life-threatening emergencies, call 911 immediately.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Call 911",
          onPress: () => {
            console.log("Calling 911...");
          },
        },
      ]
    );
  };

  const callHealthLink = (): void => {
    Alert.alert("Health Link Alberta", "Call 811 for urgent health concerns?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Call 811",
        onPress: () => {
          console.log("Calling Health Link Alberta at 811...");
        },
      },
    ]);
  };

  
  return (
    <CurvedBackground>
      <CurvedHeader
        title="Health Tracker"
        height={120}
        showLogo={true}
      />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontFamily: FONTS.BarlowSemiCondensed }}>Health Tracker Screen</Text>
      </View>
      <BottomNavigation />
    </CurvedBackground>
  );
}