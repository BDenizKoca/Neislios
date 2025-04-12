import React, { useState, useEffect, ReactNode, useRef } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import SideMenu from './SideMenu';
import { 
  Bars3Icon, 
  XMarkIcon, 
  PlusIcon, 
  SparklesIcon, 
  HomeIcon, 
  ArrowLeftIcon, 
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import FloatingActionButton from '../common/FloatingActionButton';
import CreateWatchlistModal from '../watchlists/CreateWatchlistModal';
import MovieRecommendationModal from '../recommendations/MovieRecommendationModal';
import { useLayoutActions } from '../../hooks/useLayoutActions';
import { useHeader } from '../../hooks/useHeader';
import { useWatchlistAI } from '../../hooks/useWatchlistAI';

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
  const [showAIRecommendModal, setShowAIRecommendModal] = useState(false);
  const [, setIsAIEnabled] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { headerTitle, setHeaderTitle } = useHeader(); // Correctly extract headerTitle
  const mainContentRef = useRef<HTMLElement>(null);
  // Get necessary context values
  const { 
    triggerRandomPick, 
    isRandomPickModalOpen 
  } = useLayoutActions();
    // Extract watchlistId (needed for AI Modal, not FAB)
  const getWatchlistIdFromPath = (pathname: string): string | undefined => {
    if (pathname.startsWith('/watchlist/') && 
        !pathname.includes('/manage') && 
        !pathname.includes('/collaborators')) {
      return pathname.split('/').pop();
    }
    return undefined;
  };
  const currentWatchlistId = getWatchlistIdFromPath(location.pathname);
  
  // Use the useWatchlistAI hook with the watchlistId
  const { checkListEligibleForAI } = useWatchlistAI(currentWatchlistId);

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
  
  // Check if current path is a watchlist that's eligible for AI
  useEffect(() => {
    // Reset AI state initially
    setIsAIEnabled(false);
    
    // If we are on a watchlist detail page, check eligibility
    if (currentWatchlistId) {
      // Check if list is eligible for AI recommendations (10+ movies)
      checkListEligibleForAI().then((isEligible: boolean) => {
        setIsAIEnabled(isEligible);
      }).catch((err: Error) => {
        console.error("Error checking AI eligibility:", err);
        setIsAIEnabled(false); // Ensure it's false on error
      });
    }
  }, [currentWatchlistId]); // Remove checkListEligibleForAI from dependencies
  
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

    // --- FAB Logic ---  
  let fabIcon: React.ReactNode = <HomeIcon className="h-6 w-6" />;
  let fabAction: () => void = () => navigate('/');
  let fabLabel = "Go to Home";
  // Disable FAB if any relevant modal is open - use showAIRecommendModal directly
  let isFabDisabled = isCreateModalOpen || showAIRecommendModal || isRandomPickModalOpen;

  if (location.pathname === '/') {
    fabIcon = <PlusIcon className="h-6 w-6" />;
    fabAction = () => setIsCreateModalOpen(true);
    fabLabel = "Create new watchlist";
  }
  // On watchlist detail page (excluding manage/collaborators)
  else if (location.pathname.startsWith('/watchlist/') && !location.pathname.includes('/manage') && !location.pathname.includes('/collaborators')) {
     // Use the trigger function directly from the context for Random Pick
     if (triggerRandomPick) {
        fabIcon = <SparklesIcon className="h-6 w-6" />;
        fabAction = isFabDisabled ? () => {} : triggerRandomPick; // Use updated isFabDisabled
        fabLabel = "Pick random item";
     } 
     // **REMOVED AI recommendation logic from here**
     // If triggerRandomPick is null (e.g., on initial load or error), 
     // the FAB will keep its default Home icon/action unless explicitly changed.
     // You might want a different fallback behavior here if needed.
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative flex justify-between items-center h-16">
              {/* Left Section (Back or Burger) */}
              <div className="absolute left-0 flex items-center pl-1 sm:pl-0">
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
              <div className="flex-1 flex justify-center items-center px-4">
                 {/* Apply manual truncation */}
                 <h1
                    className="text-lg font-semibold text-white cursor-pointer"
                    onClick={handleTitleClick}
                    title={headerTitle}
                 >
                    {headerTitle.length > 26 ? `${headerTitle.substring(0, 26)}...` : headerTitle}
                 </h1>
              </div>

              {/* Right Section (Search) */}
              <div className="absolute right-0 flex items-center pr-1 sm:pr-0">
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
        <main ref={mainContentRef} className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900 scroll-smooth">
           {children || <Outlet />}
        </main>

        {/* Context-Aware Floating Action Button - Use updated isFabDisabled */}
        {!location.pathname.includes('/manage') && !isFabDisabled && (
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
              cursor: isDragging ? 'grabbing' : (isFabDisabled ? 'not-allowed' : 'pointer'), // Use updated isFabDisabled
              opacity: isDragging ? 0.8 : (isFabDisabled ? 0.5 : 1), // Use updated isFabDisabled
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

        {/* AI Recommendation Modal - Remove the onVisibilityChange prop */}
        {showAIRecommendModal && currentWatchlistId && (
          <MovieRecommendationModal
            isOpen={showAIRecommendModal}
            onClose={() => setShowAIRecommendModal(false)}
            watchlistId={currentWatchlistId}
          />
        )}
        {/* RandomItemPickerModal is rendered in WatchlistDetailPage, controlled by context */}
      </div>
    </div>
  );
};

export default MainLayout;