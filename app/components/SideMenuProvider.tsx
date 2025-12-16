import { usePathname } from "expo-router";
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

  // Hide menu during auth and onboarding flows
  const isAuthOrOnboarding = pathname?.startsWith('/auth') || pathname?.startsWith('/onboarding') || pathname === '/';
  const menuVisible = visible && !isAuthOrOnboarding;

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
      <SideMenu visible={menuVisible} onClose={() => setVisible(false)} />
    </SideMenuContext.Provider>
  );
};

export default SideMenuProvider;