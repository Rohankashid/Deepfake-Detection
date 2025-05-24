import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import Image from 'next/image';

// Avatar styles configuration using API URLs
const AVATAR_STYLES = {
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

export const UserProfile = () => {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [dataSharing, setDataSharing] = useState(false);
  const [avatarStyle, setAvatarStyle] = useState('adventurer');
  const [isHovering, setIsHovering] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);

  // Generate a consistent seed from user's email
  const avatarSeed = user?.email || 'default';
  const avatarUrl = `${AVATAR_STYLES[avatarStyle].url}${avatarSeed}`;

  // Only show sign out button for logged-in users
  const isLoggedIn = !!user;

  // Handle login click
  const handleLogin = () => {
    // Clear the proceed without login flag
    localStorage.removeItem('proceedWithoutLogin');
    // Force a page reload to show the login form
    window.location.reload();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto px-4 sm:px-6 py-8"
    >
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 sm:p-8 border border-white/20">
        {/* Profile Header */}
        <div className="flex flex-col items-center sm:items-start sm:flex-row gap-6 mb-8">
          <motion.div
            className="relative group"
            onHoverStart={() => setIsHovering(true)}
            onHoverEnd={() => setIsHovering(false)}
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 p-1">
              <Image
                src={avatarUrl}
                alt="User Avatar"
                width={128}
                height={128}
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            {isLoggedIn && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: isHovering ? 1 : 0, y: isHovering ? 0 : 10 }}
                className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-3 py-1 rounded-full text-sm whitespace-nowrap"
              >
                Change Style
              </motion.div>
            )}
          </motion.div>

          <div className="flex-grow text-center sm:text-left min-w-0">
            <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-transparent bg-clip-text mb-2">
              {user?.email || 'Guest User'}
            </h2>
            <p className={`${theme === 'dark' ? 'text-white/60' : 'text-gray-600'} text-sm sm:text-base`}>
              {isLoggedIn ? 'Your AI-powered avatar companion' : 'Proceeding without login'}
            </p>
          </div>

          {isLoggedIn ? (
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto">
              <Button
                onClick={() => setShowAvatarSelector(!showAvatarSelector)}
                className={`px-3 sm:px-4 py-2 transition-all duration-300 rounded-xl ${
                  theme === 'dark'
                    ? 'bg-white/10 text-white hover:bg-white/20'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.582m-15.356-2A8.001 8.001 0 0119.418 15m0 0H15" />
                </svg>
                <span className="ml-1 sm:ml-2">Change Avatar</span>
              </Button>
              <Button
                onClick={() => setIsEditing(!isEditing)}
                className={`px-3 sm:px-4 py-2 transition-all duration-300 rounded-xl ${
                  theme === 'dark'
                    ? 'bg-white/10 text-white hover:bg-white/20'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                {isEditing ? 'Save Changes' : 'Edit Profile'}
              </Button>
            </div>
          ) : (
            <div className="w-full sm:w-auto">
              <Button
                onClick={handleLogin}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition-all duration-300 rounded-xl"
              >
                Login to Access Full Features
              </Button>
            </div>
          )}
        </div>

        {/* Avatar Style Selector */}
        <AnimatePresence>
          {showAvatarSelector && isLoggedIn && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-8">
                {Object.entries(AVATAR_STYLES).map(([style, config]) => (
                  <motion.button
                    key={style}
                    onClick={() => {
                      setAvatarStyle(style);
                      setShowAvatarSelector(false);
                    }}
                    className={`p-2 rounded-xl transition-all duration-300 ${
                      avatarStyle === style
                        ? 'bg-purple-500/20 border-2 border-purple-500'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className="w-full aspect-square relative">
                      <Image
                        src={`${config.url}${avatarSeed}`}
                        alt={`${config.name} avatar`}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <p className="text-center text-sm mt-2">{config.name}</p>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Account Settings and Usage Statistics */}
        {isLoggedIn && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Account Settings */}
            <div className="space-y-4">
              <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>
                Account Settings
              </h3>
              
              {/* Email Notifications */}
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all duration-300">
                <div className="flex-grow mr-4">
                  <h4 className={`font-medium mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Email Notifications
                  </h4>
                  <p className={`text-sm ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
                    Receive updates about your analyses
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={notifications}
                    onChange={(e) => setNotifications(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:rounded-full after:h-5 after:w-5 after:transition-all ${
                    theme === 'dark' 
                      ? 'bg-white/10 peer-checked:bg-purple-500 after:bg-white' 
                      : 'bg-gray-200 peer-checked:bg-purple-500 after:bg-white'
                  }`}></div>
                </label>
              </div>

              {/* Data Sharing */}
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all duration-300">
                <div className="flex-grow mr-4">
                  <h4 className={`font-medium mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Data Sharing
                  </h4>
                  <p className={`text-sm ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
                    Help improve our detection model
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={dataSharing}
                    onChange={(e) => setDataSharing(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:rounded-full after:h-5 after:w-5 after:transition-all ${
                    theme === 'dark' 
                      ? 'bg-white/10 peer-checked:bg-purple-500 after:bg-white' 
                      : 'bg-gray-200 peer-checked:bg-purple-500 after:bg-white'
                  }`}></div>
                </label>
              </div>
            </div>

            {/* Usage Statistics */}
            <div className="space-y-4">
              <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>
                Usage Statistics
              </h3>
              
              {/* Total Analyses */}
              <div className="p-4 sm:p-6 bg-white/5 rounded-xl hover:bg-white/10 transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Total Analyses
                  </h4>
                  <span className="text-xl sm:text-2xl font-bold text-purple-500">24</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500" style={{ width: '60%' }} />
                </div>
              </div>

              {/* Storage Used */}
              <div className="p-4 sm:p-6 bg-white/5 rounded-xl hover:bg-white/10 transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Storage Used
                  </h4>
                  <span className="text-xl sm:text-2xl font-bold text-purple-500">2.4 GB</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500" style={{ width: '40%' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sign Out Button - Only show for logged-in users */}
        {isLoggedIn && (
          <div className="mt-8 flex justify-center sm:justify-end">
            <Button
              onClick={logout}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all duration-300 rounded-xl w-full sm:w-auto"
            >
              Sign Out
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}; 