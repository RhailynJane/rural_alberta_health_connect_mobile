import { useAuthActions } from "@convex-dev/auth/react";
import { usePathname, useRouter } from "expo-router";
import React, { createContext, useContext, useMemo, useState } from "react";
import SideMenu from "./SideMenu";

interface SideMenuContextValue {
  open: () => void;
  close: () => void;
  visible: boolean;
}

const SideMenuContext = createContext<SideMenuContextValue | undefined>(undefined);

export const useSideMenu = () => {
  const ctx = useContext(SideMenuContext);
  if (!ctx) {
    throw new Error("useSideMenu must be used within SideMenuProvider");
  }
  return ctx;
};

interface Props {
  children: React.ReactNode;
}

const SideMenuProvider: React.FC<Props> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuthActions();

  // Hide menu during auth and onboarding flows
  const isAuthOrOnboarding = pathname?.startsWith('/auth') || pathname?.startsWith('/onboarding') || pathname === '/';
  const menuVisible = visible && !isAuthOrOnboarding;
  
  // Debug logging
  if (isAuthOrOnboarding) {
    console.log(`🚫 [SideMenu] Hidden on route: ${pathname}`);
  }

  // Handle sign out
  const handleSignOut = async () => {
    try {
      console.log("🔄 [SideMenu] Signing out...");
      await signOut();
      console.log("✅ [SideMenu] Signed out successfully");
      router.replace("/auth/signin");
    } catch (error) {
      console.error("❌ [SideMenu] Sign out failed:", error);
      // Still redirect to sign in even if sign out fails
      router.replace("/auth/signin");
    }
  };

  const value = useMemo(
    () => ({
      visible: menuVisible,
      open: () => !isAuthOrOnboarding && setVisible(true),
      close: () => setVisible(false),
    }),
    [menuVisible, isAuthOrOnboarding]
  );

  return (
    <SideMenuContext.Provider value={value}>
      {children}
      <SideMenu 
        visible={menuVisible} 
        onClose={() => setVisible(false)} 
        onSignOut={handleSignOut}
      />
    </SideMenuContext.Provider>
  );
};

export default SideMenuProvider;