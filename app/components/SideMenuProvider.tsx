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

  const value = useMemo(
    () => ({
      visible,
      open: () => setVisible(true),
      close: () => setVisible(false),
    }),
    [visible]
  );

  return (
    <SideMenuContext.Provider value={value}>
      {children}
      <SideMenu visible={visible} onClose={() => setVisible(false)} />
    </SideMenuContext.Provider>
  );
};

export default SideMenuProvider;