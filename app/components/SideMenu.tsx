// Using PNG icons from assets for menu items
import { api } from "@/convex/_generated/api";
import { useConvexAuth, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  Image,
  ImageBackground,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
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
  userName: userNameProp,
  userEmail: userEmailProp,
  userAvatar: userAvatarProp,
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const currentUser = useQuery(api.users.getCurrentUser, isAuthenticated && !isLoading ? {} : "skip");

  // Derive display fields with graceful fallbacks
  const { displayName, displayEmail, displayAvatar } = useMemo(() => {
    const first = (currentUser as any)?.firstName || (currentUser as any)?.name || undefined;
    const last = (currentUser as any)?.lastName || undefined;
    const combined = [first, last].filter(Boolean).join(" ");
    const email = (currentUser as any)?.email || undefined;
    const avatar = (currentUser as any)?.photoUrl || (currentUser as any)?.avatarUrl || (currentUser as any)?.image || undefined;
    return {
      displayName: userNameProp || combined || "User",
      displayEmail: userEmailProp || email || "user@example.com",
      displayAvatar: userAvatarProp || avatar || undefined,
    };
  }, [currentUser, userNameProp, userEmailProp, userAvatarProp]);

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
    { label: "Home", iconSource: require("../../assets/images/home-icon.png"), route: "/(tabs)/dashboard" },
    { label: "AI Assessment", iconSource: require("../../assets/images/assess-icon.png"), route: "/(tabs)/ai-assess" },
    { label: "Tracker", iconSource: require("../../assets/images/tracker-icon.png"), route: "/(tabs)/tracker" },
    { label: "Emergency Services", iconSource: require("../../assets/images/emergency-icon.png"), route: "/(tabs)/emergency" },
    { label: "Location Services", iconSource: require("../../assets/images/location-icon.png"), route: "/location-services" },
    { label: "Resources", iconSource: require("../../assets/images/resources-icon.png"), route: "/resources" },
    { label: "Profile", iconSource: require("../../assets/images/profile-icon.png"), route: "/(tabs)/profile" },
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
          {/* Hero/Profile Header */}
          <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}>
            <ImageBackground
              source={displayAvatar ? { uri: displayAvatar } : require('../../assets/images/home-icon.png')}
              style={styles.headerBg}
              resizeMode="cover"
              imageStyle={{ opacity: displayAvatar ? 0.6 : 0.15 }}
            >
              <View style={styles.headerOverlay} />
              <View style={styles.headerContent}>
                <View style={styles.headerAvatarWrap}>
                  {displayAvatar ? (
                    <Image source={{ uri: displayAvatar }} style={styles.headerAvatar} />
                  ) : (
                    <View style={styles.headerAvatarPlaceholder}>
                      <Icon name="person" size={36} color="#fff" />
                    </View>
                  )}
                </View>
                <Text style={[styles.headerName, { fontFamily: FONTS.BarlowSemiCondensedBold }]} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={[styles.headerEmail, { fontFamily: FONTS.BarlowSemiCondensed }]} numberOfLines={1}>
                  {displayEmail}
                </Text>
              </View>
            </ImageBackground>
          </View>

          <ScrollView style={styles.menuContent} showsVerticalScrollIndicator={false}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={() => handleNavigation(item.route)}
              >
                <Image source={item.iconSource} style={{ width: 22, height: 22 }} resizeMode="contain" />
                <Text style={[styles.menuItemText, { fontFamily: FONTS.BarlowSemiCondensed }]} numberOfLines={1}>
                  {item.label}
                </Text>
                <Icon name="chevron-right" size={20} color="#9AA1AA" style={styles.menuChevron} />
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Icon name="logout" size={18} color="#DC3545" style={{ marginRight: 8 }} />
            <Text style={[styles.signOutText, { fontFamily: FONTS.BarlowSemiCondensedBold }]}>Sign out</Text>
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
  headerWrap: {
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  headerBg: {
    height: 160,
    width: '100%',
    justifyContent: 'flex-end',
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)'
  },
  headerContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerAvatarWrap: {
    marginBottom: 8,
  },
  headerAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: '#fff',
  },
  headerAvatarPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#2A7DE1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  headerName: {
    fontSize: 20,
    color: '#fff',
  },
  headerEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)'
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
    borderBottomWidth: 1,
    borderBottomColor: '#F2F4F7'
  },
  menuItemText: {
    fontSize: 16,
    color: "#1A1A1A",
    marginLeft: 14,
    flex: 1,
  },
  menuChevron: {
    marginLeft: 8,
  },
  signOutButton: {
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    flexDirection: 'row',
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
  },
  signOutText: {
    fontSize: 15,
    color: "#DC3545",
  },
});

export default SideMenu;
