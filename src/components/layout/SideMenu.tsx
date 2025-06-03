import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth'; // Updated import path
import { XMarkIcon } from '@heroicons/react/24/outline'; // Import icon

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void; // Function to close the menu
}

const SideMenu: React.FC<SideMenuProps> = ({ isOpen, onClose }) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    onClose(); // Close menu first
    try {
      await signOut();
      navigate('/login');    } catch (error) {
      console.error("Logout failed:", error);
      // Show user-friendly error via toast or notification
      alert('Logout failed. Please try again.');
    }
  };

  // Base class for menu items
  const menuItemClass = "block px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded";

  // Combine base, conditional, and transition classes
  const menuContainerClass = `
    fixed top-0 left-0 z-30 h-full w-64 bg-white dark:bg-gray-800 shadow-lg
    transform transition-transform duration-300 ease-in-out
    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
  `;

  const overlayClass = `
    fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity duration-300 ease-in-out
    ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
  `;


  return (
    <>
      {/* Overlay */}
      <div className={overlayClass} onClick={onClose} aria-hidden="true"></div>

      {/* Menu Panel */}
      <div className={menuContainerClass} role="dialog" aria-modal="true" aria-labelledby="menu-title">
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
             <h2 id="menu-title" className="text-lg font-semibold text-gray-900 dark:text-white">Menu</h2>
             <button onClick={onClose} className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-500">
                <XMarkIcon className="h-6 w-6" aria-hidden="true" />
             </button>
          </div>

          <nav>
            <Link to="/" onClick={onClose} className={menuItemClass}>Home</Link> {/* Add Home link */}
            <Link to="/profile" onClick={onClose} className={menuItemClass}>Profile</Link>
            <Link to="/friends" onClick={onClose} className={menuItemClass}>Friends</Link>
            <Link to="/settings" onClick={onClose} className={menuItemClass}>Settings</Link>
            <hr className="my-2 border-gray-200 dark:border-gray-600" />
            <button onClick={handleLogout} className={`${menuItemClass} w-full text-left`}>
              Logout
            </button>
          </nav>
        </div>
      </div>
    </>
  );
};

export default SideMenu;