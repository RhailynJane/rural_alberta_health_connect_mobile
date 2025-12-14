import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FONTS } from "../constants/constants";

interface SideMenuProps {
  visible: boolean;
  onClose: () => void;
  onSignOut?: () => void;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
}

const SideMenu: React.FC<SideMenuProps> = ({ 
  visible, 
  onClose, 
  onSignOut,
  userName = "User",
  userEmail = "user@example.com",
  userAvatar
}) => {
  const router = useRouter();

  const handleNavigation = (route: string) => {
    onClose();
    router.push(route as any);
  };

  const handleSignOut = () => {
    onClose();
    if (onSignOut) {
      onSignOut();
    }
  };

  const menuItems = [
    { label: "Home", icon: "home-outline", route: "/(tabs)/dashboard" },
    { label: "AI Assessment", icon: "medical-outline", route: "/(tabs)/ai-assess" },
    { label: "Tracker", icon: "stats-chart-outline", route: "/(tabs)/tracker" },
    { label: "Emergency Services", icon: "alert-circle-outline", route: "/(tabs)/emergency" },
    { label: "Location Services", icon: "location-outline", route: "/location-services" },
    { label: "Resources", icon: "library-outline", route: "/resources" },
    { label: "Profile", icon: "person-outline", route: "/(tabs)/profile" },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <SafeAreaView style={styles.menuContainer} edges={['top', 'bottom']}>
          {/* Profile Section */}
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              {userAvatar ? (
                <Image source={{ uri: userAvatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={40} color="#fff" />
                </View>
              )}
            </View>
            <Text style={[styles.userName, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              {userName}
            </Text>
            <Text style={[styles.userEmail, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              {userEmail}
            </Text>
          </View>

          <ScrollView style={styles.menuContent} showsVerticalScrollIndicator={false}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={() => handleNavigation(item.route)}
              >
                <Ionicons name={item.icon as any} size={22} color="#2A7DE1" />
                <Text style={[styles.menuItemText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={[styles.signOutText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              Sign out
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  backdrop: {
    flex: 1,
  },
  menuContainer: {
    width: "80%",
    maxWidth: 320,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  profileSection: {
    padding: 24,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
    alignItems: "center",
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#2A7DE1",
    justifyContent: "center",
    alignItems: "center",
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#666",
  },
  menuContent: {
    flex: 1,
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  menuItemText: {
    fontSize: 16,
    color: "#1A1A1A",
    marginLeft: 14,
  },
  signOutButton: {
    backgroundColor: "#f5f5f5",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
  },
  signOutText: {
    fontSize: 16,
    color: "#1A1A1A",
    fontWeight: "600",
  },
});

export default SideMenu;
