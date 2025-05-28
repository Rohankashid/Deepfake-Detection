'use client'

import React, { useState } from 'react';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';

// Avatar styles configuration using API URLs
type AvatarStyle = 'adventurer' | 'bottts' | 'lorelei' | 'micah' | 'pixel-art';

const AVATAR_STYLES: Record<AvatarStyle, { url: string; name: string }> = {
  'adventurer': {
    url: 'https://api.dicebear.com/7.x/adventurer/svg?backgroundColor=65c9ff&seed=',
    name: 'Adventurer'
  },
  'bottts': {
    url: 'https://api.dicebear.com/7.x/bottts/svg?backgroundColor=65c9ff&seed=',
    name: 'Robot'
  },
  'lorelei': {
    url: 'https://api.dicebear.com/7.x/lorelei/svg?backgroundColor=65c9ff&seed=',
    name: 'Lorelei'
  },
  'micah': {
    url: 'https://api.dicebear.com/7.x/micah/svg?backgroundColor=65c9ff&seed=',
    name: 'Micah'
  },
  'pixel-art': {
    url: 'https://api.dicebear.com/7.x/pixel-art/svg?backgroundColor=65c9ff&seed=',
    name: 'Pixel Art'
  }
};

export const Navbar = () => {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>('adventurer');
  const [notifications, setNotifications] = useState(true);
  const [dataSharing, setDataSharing] = useState(false);

  const handleAnalysisHistoryClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (pathname !== '/') {
      router.push('/');
      setTimeout(() => {
        const element = document.getElementById('analysis-history');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      const element = document.getElementById('analysis-history');
      if (element) {
        const rect = element.getBoundingClientRect();
        const isInView = (
          rect.top >= 0 &&
          rect.bottom <= (window.innerHeight || document.documentElement.clientHeight)
        );
        
        if (!isInView) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
  };

  // Generate a consistent seed from user's email
  const avatarSeed = user?.email || 'default';
  const avatarUrl = `${AVATAR_STYLES[avatarStyle].url}${avatarSeed}`;

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b ${
      theme === 'dark' ? 'bg-black/40 border-white/10' : 'bg-white/40 border-gray-200'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-transparent bg-clip-text">
              DeepFake Detection
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className={`${
              theme === 'dark' ? 'text-white/60 hover:text-white' : 'text-gray-600 hover:text-gray-900'
            } transition-colors duration-200`}>
              Home
            </Link>
            {user && (
              <>
                <Link href="/dashboard" className={`${
                  theme === 'dark' ? 'text-white/60 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                } transition-colors duration-200`}>
                  Dashboard
                </Link>
                <Link 
                  href="/" 
                  onClick={handleAnalysisHistoryClick}
                  className={`${
                    theme === 'dark' ? 'text-white/60 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                  } transition-colors duration-200`}
                >
                  Analysis History
                </Link>
              </>
            )}
          </div>

          {/* User Profile */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="relative">
                <Button 
                  variant="ghost" 
                  className="rounded-full"
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                >
                  <img
                    src={avatarUrl}
                    alt="User Avatar"
                    className="w-8 h-8 rounded-full"
                  />
                </Button>

                {/* Profile Dropdown Menu */}
                <AnimatePresence>
                  {showProfileMenu && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40"
                        onClick={() => setShowProfileMenu(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className={`absolute right-0 mt-2 w-72 rounded-xl shadow-lg ${
                          theme === 'dark' ? 'bg-gray-900' : 'bg-white'
                        } ring-1 ring-black ring-opacity-5 z-50`}
                      >
                        <div className="p-4">
                          {/* User Info */}
                          <div className="flex items-center space-x-3 mb-4">
                            <img
                              src={avatarUrl}
                              alt="User Avatar"
                              className="w-12 h-12 rounded-full"
                            />
                            <div>
                              <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {user.email}
                              </p>
                              <p className={`text-sm ${theme === 'dark' ? 'text-white/60' : 'text-gray-500'}`}>
                                {user.email}
                              </p>
                            </div>
                          </div>

                          {/* Settings */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5">
                              <span className={`text-sm ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
                                Email Notifications
                              </span>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={notifications}
                                  onChange={(e) => setNotifications(e.target.checked)}
                                  className="sr-only peer"
                                />
                                <div className={`w-9 h-5 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:rounded-full after:h-4 after:w-4 after:transition-all ${
                                  theme === 'dark' 
                                    ? 'bg-white/10 peer-checked:bg-purple-500 after:bg-white' 
                                    : 'bg-gray-200 peer-checked:bg-purple-500 after:bg-white'
                                }`}></div>
                              </label>
                            </div>

                            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5">
                              <span className={`text-sm ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
                                Data Sharing
                              </span>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={dataSharing}
                                  onChange={(e) => setDataSharing(e.target.checked)}
                                  className="sr-only peer"
                                />
                                <div className={`w-9 h-5 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:rounded-full after:h-4 after:w-4 after:transition-all ${
                                  theme === 'dark' 
                                    ? 'bg-white/10 peer-checked:bg-purple-500 after:bg-white' 
                                    : 'bg-gray-200 peer-checked:bg-purple-500 after:bg-white'
                                }`}></div>
                              </label>
                            </div>
                          </div>

                          {/* Avatar Styles */}
                          <div className="mt-4">
                            <p className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
                              Avatar Style
                            </p>
                            <div className="grid grid-cols-5 gap-2">
                              {Object.entries(AVATAR_STYLES).map(([style, config]) => (
                                <button
                                  key={style}
                                  onClick={() => setAvatarStyle(style as AvatarStyle)}
                                  className={`p-1 rounded-lg transition-all duration-300 ${
                                    avatarStyle === style
                                      ? 'bg-purple-500/20 border-2 border-purple-500'
                                      : 'bg-white/5 hover:bg-white/10'
                                  }`}
                                >
                                  <img
                                    src={`${config.url}${avatarSeed}`}
                                    alt={`${config.name} avatar`}
                                    className="w-full h-full rounded"
                                  />
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Sign Out Button */}
                          <div className="mt-4 pt-4 border-t border-white/10">
                            <Button
                              onClick={logout}
                              className="w-full px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all duration-300 rounded-xl"
                            >
                              Sign Out
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link href="/login">
                <Button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}; 