import React, { useState, useEffect, ReactNode, useRef } from 'react'; // Import useRef
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import SideMenu from './SideMenu';
import { Bars3Icon, XMarkIcon, PlusIcon, SparklesIcon, HomeIcon, ArrowLeftIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import FloatingActionButton from '../common/FloatingActionButton';
import CreateWatchlistModal from '../watchlists/CreateWatchlistModal';
import { useLayoutActions } from '../../hooks/useLayoutActions'; // Updated import path
import { useHeader } from '../../hooks/useHeader'; // Updated import path

interface MainLayoutProps {
  children?: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [fabPosition, setFabPosition] = useState(() => {
    // Load saved position from localStorage or use default
    const savedPosition = localStorage.getItem('fabPosition');
    return savedPosition ? JSON.parse(savedPosition) : { right: 24, bottom: 24 };
  });
  const [isDragging, setIsDragging] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { triggerRandomPick } = useLayoutActions();
  const { headerTitle, setHeaderTitle } = useHeader();
  const mainContentRef = useRef<HTMLElement>(null); // Ref for the main content area

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
  const handleTitleClick = () => {
    if (mainContentRef.current) {
      const scrollElement = mainContentRef.current;
      const currentPosition = scrollElement.scrollTop;
      
      // Only perform scroll if we're not already at the top
      if (currentPosition <= 0) return;
      
      // Better smooth scroll implementation using animation frames
      let start: number | null = null;
      const duration = 500; // ms - duration of scroll animation
      
      function animateScroll(timestamp: number) {
        if (!start) start = timestamp;
        const elapsed = timestamp - start;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smoother deceleration
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        
        scrollElement.scrollTop = currentPosition * (1 - easeOutCubic);
        
        if (progress < 1) {
          window.requestAnimationFrame(animateScroll);
        }
      }
      
      window.requestAnimationFrame(animateScroll);
    }
  };

  const resetFabPosition = () => {
    const defaultPosition = { right: 24, bottom: 24 };
    setFabPosition(defaultPosition);
    localStorage.setItem('fabPosition', JSON.stringify(defaultPosition));
  };
  
  // Double-tap handler for resetting position
  const handleFabDoubleClick = () => {
    resetFabPosition();
  };
  
  // Handler for long press to enable drag mode
  const handleFabLongPress = () => {
    setIsDragging(true);
  };
  
  // Handler for drag end
  const handleDragEnd = () => {
    setIsDragging(false);
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
              <div className="flex-1 flex justify-center items-center px-4"> {/* Reduced padding to give title more space */}
                 {/* Apply manual truncation */}
                 <h1
                    className="text-lg font-semibold text-white cursor-pointer" // Add cursor-pointer
                    onClick={handleTitleClick} // Add onClick handler
                    title={headerTitle} // Show full title on hover
                 >
                    {headerTitle.length > 26 ? `${headerTitle.substring(0, 26)}...` : headerTitle}
                 </h1>
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
            </div>          </div>
        </header>         {/* Page Content */}
        <main ref={mainContentRef} className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900 scroll-smooth"> {/* Keep scroll-smooth */}
           {/* Removed invisible top element */}
           {children || <Outlet />}
        </main>

         {/* Context-Aware Floating Action Button - Hide on manage items page */}
         {!location.pathname.includes('/manage') && (
           <FloatingActionButton
              onClick={fabAction}
              icon={fabIcon}
              ariaLabel={fabLabel}
              position={fabPosition}
              onPositionChange={(newPosition) => {
                setFabPosition(newPosition);
                localStorage.setItem('fabPosition', JSON.stringify(newPosition));
              }}
              isDraggable={true}
              onDoubleClick={handleFabDoubleClick}
              onLongPress={handleFabLongPress}
              onDragEnd={handleDragEnd}
              isDragging={isDragging}
              style={{
                transition: isDragging ? 'none' : 'all 0.3s ease',
                cursor: isDragging ? 'grabbing' : 'pointer',
                opacity: isDragging ? 0.8 : 1,
                boxShadow: isDragging ? '0 0 15px rgba(0,0,0,0.3)' : undefined
              }}
           />
         )}

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