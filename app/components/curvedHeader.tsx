import { Barlow_600SemiBold, useFonts } from "@expo-google-fonts/barlow";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ReminderSettings } from "../_utils/notifications";
import NotificationBell from "./NotificationBell";
import { useSideMenu } from "./SideMenuProvider";

interface CurvedHeaderProps {
  title?: string;
  subtitle?: string;
  backgroundColor?: string;
  textColor?: string;
  height?: number;
  children?: React.ReactNode;
  showLogo?: boolean;
  screenType?: 'onboarding' | 'signin'; // New prop to determine screen type
  bottomSpacing?: number; // controls margin below header container
  showNotificationBell?: boolean; // New prop to show notification bell
  reminderEnabled?: boolean; // New prop to pass reminder status
  reminderSettings?: ReminderSettings | null; // New prop to pass full reminder settings
  showMenuButton?: boolean;
  showProfileButton?: boolean;
  onMenuPress?: () => void;
  onProfilePress?: () => void;
}

const CurvedHeader: React.FC<CurvedHeaderProps> = ({
  title,
  subtitle,
  backgroundColor = "#eef2f8",
  textColor = "#2c3e50",
  height = 60,
  children,
  showLogo = false,
  screenType = 'onboarding',
  bottomSpacing = 0,
  showNotificationBell = false,
  reminderEnabled = false,
  reminderSettings = null,
  showMenuButton = true,
  showProfileButton = false,
  onMenuPress,
  onProfilePress,
}) => {
  const [fontsLoaded] = useFonts({
    BarlowSemiCondensed: Barlow_600SemiBold,
  });
  const sideMenu = useSideMenu();
  
  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor, marginBottom: bottomSpacing }]}>
      {children ? (
        children
      ) : (
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            {showLogo && (
              <Image 
                source={require("../../assets/images/logo-no-name.png")} 
                style={styles.logo}
                resizeMode="contain"
              />
            )}
            {(title || subtitle) && (
              <View style={styles.titleBlock}>
                {title && <Text style={[styles.titleText, { color: textColor }]} numberOfLines={1}>{title}</Text>}
                {subtitle && <Text style={[styles.subtitleText, { color: textColor }]} numberOfLines={1}>{subtitle}</Text>}
              </View>
            )}
          </View>
          <View style={styles.headerRight}>
            {showNotificationBell && (
              <NotificationBell 
                reminderEnabled={reminderEnabled} 
                reminderSettings={reminderSettings} 
              />
            )}
            {showMenuButton && (
              <TouchableOpacity 
                onPress={onMenuPress ?? sideMenu.open} 
                style={styles.menuButton} 
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="menu" size={28} color={textColor} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  logo: {
    width: 50,
    height: 50,
  },
  titleBlock: {
    flexShrink: 1,
  },
  titleText: {
    fontSize: 20,
    fontFamily: "BarlowSemiCondensed",
    fontWeight: "700",
  },
  subtitleText: {
    fontSize: 14,
    fontFamily: "BarlowSemiCondensed",
    opacity: 0.8,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuButton: {
    padding: 4,
  },
});

export default CurvedHeader;