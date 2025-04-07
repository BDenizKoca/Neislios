import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import SideMenu from './SideMenu';
import { Bars3Icon, XMarkIcon, PlusIcon, SparklesIcon, HomeIcon, ArrowLeftIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import FloatingActionButton from '../common/FloatingActionButton';
import CreateWatchlistModal from '../watchlists/CreateWatchlistModal';
import { useLayoutActions } from '../../context/LayoutActionContext';
import { useAuth } from '../../context/AuthContext';
import { useHeader } from '../../context/HeaderContext'; // Import useHeader

const MainLayout: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { triggerRandomPick } = useLayoutActions();
  const { user: _user } = useAuth(); // Keep user, might be needed later
  const { headerTitle, setHeaderTitle } = useHeader(); // Get title and setter

  // Determine if back button should be shown
  const showBackButton = location.pathname !== '/';

  // Set header title based on route
  useEffect(() => {
    // Default title
    let title = 'Neislios';
    // You might need more specific logic here if titles depend on fetched data
    // For now, set based on static paths
    if (location.pathname === '/profile') title = 'Your Profile';
    else if (location.pathname === '/friends') title = 'Friends';
    else if (location.pathname === '/settings') title = 'Settings';
    else if (location.pathname === '/search') title = 'Search';
    // Watchlist detail, manage, collaborators pages will set their own titles dynamically
    setHeaderTitle(title);
  }, [location.pathname, setHeaderTitle]);


  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  // --- FAB Logic ---
  let fabIcon: React.ReactNode = <HomeIcon className="h-6 w-6" />;
  let fabAction: () => void = () => navigate('/');
  let fabLabel = "Go to Home";

  if (location.pathname === '/') {
    fabIcon = <PlusIcon className="h-6 w-6" />;
    fabAction = () => setIsCreateModalOpen(true);
    fabLabel = "Create new watchlist";
  }
  else if (location.pathname.startsWith('/watchlist/') && !location.pathname.includes('/manage') && !location.pathname.includes('/collaborators')) {
    if (triggerRandomPick) {
        fabIcon = <SparklesIcon className="h-6 w-6" />;
        fabAction = triggerRandomPick;
        fabLabel = "Pick random item";
    }
  }

  const handleCloseCreateModal = () => setIsCreateModalOpen(false);
  const handleWatchlistCreated = () => {
    handleCloseCreateModal();
    // Subscription should handle refresh
    console.log("New list created, HomePage might need refresh if not using subscriptions effectively.");
  };


  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <SideMenu isOpen={isMenuOpen} onClose={closeMenu} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar - Restore original structure */}
        <header className="bg-primary text-white shadow-md z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"> {/* Restore original padding */}
            <div className="relative flex justify-between items-center h-16">
              {/* Left Section (Back or Burger) */}
              <div className="absolute left-0 flex items-center pl-1 sm:pl-0"> {/* Adjust padding for mobile */}
                {showBackButton ? (
                  <button
                    onClick={() => navigate(-1)}
                    className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded focus:outline-none"
                    aria-label="Go back"
                  >
                    <ArrowLeftIcon className="h-6 w-6" />
                  </button>
                ) : (
                  <button
                    onClick={toggleMenu}
                    className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded focus:outline-none"
                    aria-label="Open sidebar"
                  >
                    {isMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
                  </button>
                )}
              </div>

              {/* Center Section (Title) */}
              <div className="flex-1 flex justify-center items-center px-12"> {/* Ensure title doesn't overlap icons */}
                 <h1 className="text-lg font-semibold text-white truncate">{headerTitle}</h1>
              </div>

              {/* Right Section (Search) */}
              <div className="absolute right-0 flex items-center pr-1 sm:pr-0"> {/* Adjust padding for mobile */}
                 <Link
                    to="/search"
                    className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded focus:outline-none"
                    aria-label="Search"
                 >
                    <MagnifyingGlassIcon className="h-6 w-6" />
                 </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900">
           <Outlet />
        </main>

         {/* Context-Aware Floating Action Button */}
         <FloatingActionButton
            onClick={fabAction}
            icon={fabIcon}
            ariaLabel={fabLabel}
         />

         {/* Create Watchlist Modal */}
         <CreateWatchlistModal
            isOpen={isCreateModalOpen}
            onClose={handleCloseCreateModal}
            onWatchlistCreated={handleWatchlistCreated}
         />

      </div>
    </div>
  );
};

export default MainLayout;