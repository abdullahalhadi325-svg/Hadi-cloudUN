import React, { useState, useEffect } from 'react';
import { TabType } from './types';
import { useHadiCloudStore } from './store';
import { Navbar } from './components/Navbar';
import { NavDeck } from './components/NavDeck';
import { DriveTab } from './components/DriveTab';
import { HomeTab } from './components/HomeTab';
import { PhotosTab } from './components/PhotosTab';
import { VaultTab } from './components/VaultTab';
import { SettingsTab } from './components/SettingsTab';
import { TelegramLoginModal } from './components/TelegramLoginModal';
import { ProgressToast } from './components/ProgressToast';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('Drive');
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);

  // Zustand Store
  const theme = useHadiCloudStore((state) => state.theme);
  const user = useHadiCloudStore((state) => state.user);
  const initFirestoreSync = useHadiCloudStore((state) => state.initFirestoreSync);

  // Apply theme physically to document DOM, CSS variables and root classes
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);

    if (theme === 'light') {
      document.body.classList.remove('bg-[#0A0A0A]', 'bg-[#12151B]', 'text-white', 'text-[#E2E8F0]');
      document.body.classList.add('bg-slate-100', 'text-black');
      document.body.style.backgroundColor = '#f1f5f9';
      document.body.style.color = '#000000';
      document.documentElement.style.setProperty('--glass-border', 'rgba(0, 0, 0, 0.10)');
    } else if (theme === 'fade') {
      document.body.classList.remove('bg-slate-100', 'text-black', 'bg-[#0A0A0A]', 'text-white');
      document.body.classList.add('bg-[#12151B]', 'text-[#E2E8F0]');
      document.body.style.backgroundColor = '#12151B';
      document.body.style.color = '#E2E8F0';
      document.documentElement.style.setProperty('--glass-border', 'rgba(255, 255, 255, 0.18)');
    } else {
      document.body.classList.remove('bg-slate-100', 'text-black', 'bg-[#12151B]', 'text-[#E2E8F0]');
      document.body.classList.add('bg-[#0A0A0A]', 'text-white');
      document.body.style.backgroundColor = '#0A0A0A';
      document.body.style.color = '#FFFFFF';
      document.documentElement.style.setProperty('--glass-border', 'rgba(255, 255, 255, 0.20)');
    }
  }, [theme]);

  // If user is already authenticated in localStorage, initialize real-time sync with their Telegram ID
  useEffect(() => {
    if (user?.userId) {
      initFirestoreSync(user.userId);
    }
  }, [user?.userId, initFirestoreSync]);

  return (
    <div 
      id="hadi-cloud-root" 
      className={`min-h-[100dvh] flex flex-col selection:bg-white/20 transition-colors duration-200 relative overflow-x-hidden ${
        theme === 'light' ? 'bg-slate-100 text-black' : theme === 'fade' ? 'bg-[#12151B] text-[#E2E8F0]' : 'bg-[#0A0A0A] text-white'
      }`}
    >
      {/* iOS 27 Liquid Glass Background Gradient & Ambient Glow Mesh */}
      {theme !== 'light' && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute -top-[20%] -left-[10%] w-[65vw] h-[65vw] rounded-full bg-gradient-to-br from-indigo-900/25 via-purple-900/20 to-transparent blur-[110px] transform-gpu will-change-transform" />
          <div className="absolute top-[40%] -right-[15%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tl from-purple-900/20 via-sky-900/15 to-transparent blur-[120px] transform-gpu will-change-transform" />
          <div className="absolute -bottom-[20%] left-[20%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-tr from-indigo-950/30 to-transparent blur-[90px] transform-gpu will-change-transform" />
        </div>
      )}

      {/* Top Header Navbar */}
      <Navbar 
        currentTab={currentTab} 
        onOpenLogin={() => setIsTelegramModalOpen(true)} 
      />

      {/* Real-time Liquid Glass Top-Toast Progress Bar for Chunked I/O */}
      <ProgressToast />

      {/* Main Scrollable View Area */}
      <main className="flex-1 w-full relative pb-32">
        {currentTab === 'Home' && (
          <HomeTab 
            onNavigate={setCurrentTab} 
            onOpenLogin={() => setIsTelegramModalOpen(true)} 
          />
        )}
        {currentTab === 'Drive' && (
          <DriveTab 
            onOpenLoginModal={() => setIsTelegramModalOpen(true)} 
          />
        )}
        {currentTab === 'Photos' && <PhotosTab />}
        {currentTab === 'Vault' && <VaultTab />}
        {currentTab === 'Settings' && (
          <SettingsTab 
            onOpenLoginModal={() => setIsTelegramModalOpen(true)} 
          />
        )}
      </main>

      {/* Floating Pill Nav Deck Fixed 16px From Bottom */}
      <NavDeck currentTab={currentTab} onSelectTab={setCurrentTab} />

      {/* Telegram MTProto Login & Auto-Provisioning Modal */}
      <TelegramLoginModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
      />
    </div>
  );
}
