'use client';
import { Button } from "@/components/ui/button";
import { UserProfileDropdown } from '@/components/user/UserProfileDropdown';
import { useTheme } from '@/contexts/ThemeContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { motion, AnimatePresence } from "framer-motion";
import React, { useState } from "react";

export const MainNavbar = () => {
  const { theme, toggleTheme } = useTheme();
  const { currentSection, setCurrentSection } = useNavigation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className={`w-full fixed top-0 z-50 backdrop-blur-md ${theme === 'dark' ? 'bg-black/40 border-white/10' : 'bg-white/40 border-gray-200'} border-b sticky top-0 shadow-lg`}>
      {/* Theme Toggle Button */}
      <Button
        id="themeToggle"
        variant="outline"
        size="icon"
        className={`absolute top-4 left-4 rounded-full text-xl shadow-md transition-colors duration-300 ${theme === 'dark' ? 'bg-white/10 text-white hover:bg-white/20 border-white/20' : 'bg-gray-200 text-gray-800 hover:bg-gray-300 border-gray-300'}`}
        aria-label="Toggle theme"
        onClick={toggleTheme}
      >
        {theme === 'dark' ? '🌙' : '☀️'}
      </Button>

      <nav className="max-w-screen-xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-2 group">
          <a href="#home" className="flex items-center space-x-2 group">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs sm:text-sm font-bold transition-transform duration-300 group-hover:rotate-12">AI</div> 
            <span className="text-base sm:text-lg font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-transparent bg-clip-text transition-opacity duration-300 group-hover:opacity-80">DeepFake AI</span>
          </a>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center space-x-2 ml-8">
          {['home', 'history', 'dashboard', 'profile'].map(section => (
            <button
              key={section}
              onClick={() => setCurrentSection(section as any)}
              className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 overflow-hidden group ${
                currentSection === section
                  ? 'bg-gray-800 text-white shadow-lg'
                  : 'bg-transparent text-gray-300 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <span className="relative z-10">{section.charAt(0).toUpperCase() + section.slice(1)}</span>
              {currentSection === section && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 bg-gray-800"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          ))}
          <UserProfileDropdown />
        </nav>

        {/* Mobile Menu Button */}
        <Button
          variant="outline"
          size="icon"
          aria-label="Open menu"
          onClick={() => setIsMobileMenuOpen(true)}
          className="md:hidden ml-2"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </Button>
      </nav>

      {/* Mobile Menu Overlay and Panel */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={`fixed top-0 right-0 w-64 h-full ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg z-50 p-6 flex flex-col`}
            >
              <div className="flex justify-end mb-6">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Close menu"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`rounded-md text-xl ${theme === 'dark' ? 'text-white/80 hover:text-white border-white/20' : 'text-gray-600 hover:text-gray-900 border-gray-300'}`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </Button>
              </div>
              <nav className="flex flex-col space-y-4">
                {['home', 'history', 'dashboard', 'profile'].map(section => (
                  <button
                    key={section}
                    onClick={() => {
                      setCurrentSection(section as any);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`px-4 py-3 rounded-xl transition-all duration-300 ${
                      currentSection === section
                        ? 'bg-gray-800 text-white shadow-lg'
                        : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                    }`}
                  >
                    {section.charAt(0).toUpperCase() + section.slice(1)}
                  </button>
                ))}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
};