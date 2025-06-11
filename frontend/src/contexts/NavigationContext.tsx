"use client";

import React, { createContext, useContext, useState } from "react";

export type PageSection = 'home' | 'profile' | 'history';
interface NavigationContextType {
  currentSection: PageSection;
  setCurrentSection: (section: PageSection) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentSection, setCurrentSection] = useState<PageSection>('home');
  return (
    <NavigationContext.Provider value={{ currentSection, setCurrentSection }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error("useNavigation must be used within NavigationProvider");
  return ctx;
};