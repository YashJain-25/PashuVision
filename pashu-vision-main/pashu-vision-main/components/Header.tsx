import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './icons';
import { useLanguage } from '../contexts/LanguageContext';

interface HeaderProps {
  onSearch: (term: string) => void;
  showSearch: boolean;
  isOnline: boolean;
  isScrolled: boolean;
  onOpenGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSearch, showSearch, isOnline, isScrolled, onOpenGuide }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const { language, toggleLanguage, t } = useLanguage();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timerId = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      onSearch(searchTerm);
    }
  };

  const handleNotificationClick = () => {
    setIsNotificationOpen(prev => !prev);
    setIsProfileOpen(false);
  };

  const handleProfileClick = () => {
    setIsProfileOpen(prev => !prev);
    setIsNotificationOpen(false);
  };

  return (
    <header className={`sticky top-0 z-30 shadow-md transition-colors duration-300 ${isScrolled ? 'bg-primary-900/90 backdrop-blur-sm' : 'bg-primary-900'}`}>
      <div className="container mx-auto px-2 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo and App Name */}
          <div className="flex items-center">
             <div className="p-2 bg-cream-50/20 rounded-full mr-2 sm:mr-3">
                <span className="text-2xl sm:text-3xl">🐮</span>
             </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">पशुVision</h1>
          </div>
          
          {/* Center: Search Bar */}
          {showSearch && (
            <div className="flex-1 flex justify-center px-2 lg:ml-6 lg:justify-end">
              <div className="max-w-md w-full lg:max-w-xs">
                <label htmlFor="search" className="sr-only">Search</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                    <Icon name="search" className="h-5 w-5 text-gray-300" />
                  </div>
                  <input
                    id="search"
                    name="search"
                    className="block w-full bg-primary-800 border border-primary-700 rounded-md py-2 pl-10 pr-3 text-sm placeholder-gray-300 text-white focus:outline-none focus:placeholder-gray-200 focus:ring-1 focus:ring-accent-400 focus:border-accent-400 sm:text-sm"
                    placeholder={t('header.searchPlaceholder')}
                    type="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Right: Icons */}
          <div className="flex items-center gap-1 sm:gap-2">
              {!isOnline && (
                  <div className="px-3 py-1 rounded-full bg-red-500 text-white text-xs font-semibold mr-2 flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    Offline
                  </div>
              )}
              <button onClick={toggleLanguage} className="px-3 py-2 rounded-full text-cream-100 hover:bg-primary-800 hover:text-white transition-colors font-semibold text-xs sm:text-sm w-auto sm:w-20 text-center">
                {language === 'en' ? 'हिन्दी' : 'English'}
              </button>

              <span className="text-sm text-gray-300 font-mono tracking-wider hidden md:block">
                {currentTime.toLocaleTimeString(language === 'en' ? 'en-US' : 'hi-IN', { timeZone: 'Asia/Kolkata' })} IST
              </span>
              
              <button onClick={onOpenGuide} className="p-2 rounded-full text-cream-100 hover:bg-primary-800 hover:text-white transition-colors" title={t('guide.title')}>
                <Icon name="help-circle" className="w-5 h-5 sm:w-6 sm:h-6"/>
              </button>
              
              <div ref={notificationRef} className="relative">
                <button onClick={handleNotificationClick} className="p-2 rounded-full text-cream-100 hover:bg-primary-800 hover:text-white transition-colors">
                    <Icon name="bell" className="w-5 h-5 sm:w-6 sm:h-6"/>
                </button>
                {isNotificationOpen && (
                  <div className="absolute right-0 mt-2 w-72 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                      <div className="px-4 py-3">
                        <p className="text-sm font-bold text-primary-900">Notifications</p>
                      </div>
                      <div className="border-t border-gray-200"></div>
                      <div className="text-center py-8 px-4">
                        <p className="text-sm text-gray-500">No new notifications yet.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div ref={profileRef} className="relative">
                <button onClick={handleProfileClick} className="p-2 rounded-full text-cream-100 hover:bg-primary-800 hover:text-white transition-colors">
                    <Icon name="user-circle" className="w-5 h-5 sm:w-6 sm:h-6"/>
                </button>
                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                      <div className="px-4 py-3">
                        <p className="text-sm font-bold text-primary-900">Dr. Priya Sharma</p>
                        <p className="text-xs text-primary-700">Veterinary Field Officer</p>
                      </div>
                      <div className="border-t border-gray-200"></div>
                      <span className="block px-4 py-2 text-sm text-gray-400 cursor-not-allowed">My Profile</span>
                      <span className="block px-4 py-2 text-sm text-gray-400 cursor-not-allowed">Settings</span>
                      <div className="border-t border-gray-200"></div>
                      <span className="block px-4 py-2 text-sm text-gray-400 cursor-not-allowed">Sign Out</span>
                    </div>
                  </div>
                )}
              </div>
          </div>
        </div>
      </div>
    </header>
  );
};
