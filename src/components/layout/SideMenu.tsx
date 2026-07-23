import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePWA } from '../../hooks/usePWA';
import InstallAppModal from '../common/InstallAppModal';
import { 
  XMarkIcon, 
  HomeIcon, 
  UserIcon, 
  UserGroupIcon, 
  Cog6ToothIcon, 
  ArrowLeftOnRectangleIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline';

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const SideMenu: React.FC<SideMenuProps> = ({ isOpen, onClose }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { isInstallable, isStandalone, isIOS, triggerPrompt } = usePWA();
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  const handleInstallClick = () => {
    if (isIOS) {
      setIsInstallModalOpen(true);
    } else {
      triggerPrompt();
    }
  };

  const handleLogout = async () => {
    onClose();
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error("Logout failed:", error);
      alert('Logout failed. Please try again.');
    }
  };

  const navItems = [
    { label: 'Home', path: '/', icon: <HomeIcon className="w-5 h-5" /> },
    { label: 'Profile', path: '/profile', icon: <UserIcon className="w-5 h-5" /> },
    { label: 'Friends', path: '/friends', icon: <UserGroupIcon className="w-5 h-5" /> },
    { label: 'Settings', path: '/settings', icon: <Cog6ToothIcon className="w-5 h-5" /> },
  ];

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 z-40 bg-slate-950/60 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Menu Panel */}
      <aside 
        className={`fixed top-0 left-0 z-50 h-full w-72 glass-modal p-6 flex flex-col justify-between transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog" 
        aria-modal="true" 
        aria-label="Navigation Menu"
      >
        <div>
          {/* Header */}
          <div className="flex justify-between items-center pb-6 border-b border-slate-200/60 dark:border-slate-800/60">
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold text-red-600 dark:text-red-500 tracking-tight">Neislios</span>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* User Brief */}
          {user && (
            <div className="my-6 p-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/50 flex items-center gap-3 border border-slate-200/50 dark:border-slate-700/50">
              <div className="w-10 h-10 rounded-full bg-red-600/20 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-sm">
                {(user.email || 'U')[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-500 dark:text-slate-400">Logged in as</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{user.email}</p>
              </div>
            </div>
          )}

          {/* Nav items */}
          <nav className="space-y-1 mt-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className="flex items-center gap-3.5 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 rounded-2xl transition-all"
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800/60 space-y-1">
          {(!isStandalone && (isInstallable || isIOS)) && (
            <button 
              onClick={handleInstallClick} 
              className="flex items-center gap-3.5 w-full px-4 py-3 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 rounded-2xl transition-colors"
            >
              <DevicePhoneMobileIcon className="w-5 h-5" />
              <span>Install App</span>
            </button>
          )}

          <button 
            onClick={handleLogout} 
            className="flex items-center gap-3.5 w-full px-4 py-3 text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-2xl transition-colors"
          >
            <ArrowLeftOnRectangleIcon className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <InstallAppModal 
        isOpen={isInstallModalOpen} 
        onClose={() => setIsInstallModalOpen(false)} 
      />
    </>
  );
};

export default SideMenu;
