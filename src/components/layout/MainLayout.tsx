import React, { useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import SideMenu from './SideMenu';
import { 
  Bars3Icon, 
  XMarkIcon, 
  PlusIcon, 
  SparklesIcon, 
  HomeIcon, 
  ArrowLeftIcon, 
  MagnifyingGlassIcon,
  LightBulbIcon // Add the light bulb icon for AI recommendations
} from '@heroicons/react/24/outline';
import FloatingActionButton from '../common/FloatingActionButton';
import CreateWatchlistModal from '../watchlists/CreateWatchlistModal';
import MediaRecommendationModal from '../recommendations/MediaRecommendationModal';
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
  const location = useLocation();
  const navigate = useNavigate();
  const { headerTitle, setHeaderTitle } = useHeader(); 
  const mainContentRef = useRef<HTMLElement>(null);
  const currentPathRef = useRef(location.pathname); // Ref to store current path

  // Get necessary context values
  const { 
    triggerRandomPick, 
    isRandomPickModalOpen 
  } = useLayoutActions();
  // Extract watchlistId from URL path (needed for AI recommendations modal)
  const getWatchlistIdFromPath = useCallback((pathname: string): string | undefined => {
    if (pathname.startsWith('/watchlist/') && 
        !pathname.includes('/manage') && 
        !pathname.includes('/collaborators')) {
      return pathname.split('/').pop();
    }
    return undefined;
  }, []);
  const currentWatchlistId = getWatchlistIdFromPath(location.pathname);
    // Use the useWatchlistAI hook with the watchlistId
  const { checkListEligibleForAI } = useWatchlistAI(currentWatchlistId);

  // Listen for watchlist update events
  useEffect(() => {
    const handleWatchlistUpdate = (event: CustomEvent) => {
      const { watchlistId } = event.detail;
      if (watchlistId === currentWatchlistId) {
        // Watchlist updated event detected, refreshing data
        // This will force the useWatchlistAI hook to re-check eligibility and refetch data
        // You might need to add a refetch function to the hook if it doesn't already have one
      }
    };

    window.addEventListener('watchlist-updated', handleWatchlistUpdate as EventListener);
    return () => {
      window.removeEventListener('watchlist-updated', handleWatchlistUpdate as EventListener);
    };
  }, [currentWatchlistId]);

  // Check for saved modal state when component mounts or route changes
  useEffect(() => {
    // Check if we're returning to a watchlist that had the recommendation modal open
    const savedModalState = sessionStorage.getItem('recommendation-modal-open');
    if (savedModalState && savedModalState === currentWatchlistId) {
      setShowAIRecommendModal(true);
    }
  }, [location.pathname, currentWatchlistId]);

  // Update current path ref after each render
  useEffect(() => {
    currentPathRef.current = location.pathname;
  }); // No dependency array, runs after every render

  // Effect to handle browser back navigation from home screen
  useEffect(() => {
    const handlePopState = () => { // Remove 'event: PopStateEvent'
      // Check if the path *before* the popstate event was '/'
      if (currentPathRef.current === '/') {
        console.log("Back navigation attempt from '/' detected. Preventing.");
        // Force navigation back to home screen, replacing the current history entry
        navigate('/', { replace: true });
      }
    };

    // Add listener
    window.addEventListener('popstate', handlePopState);

    // Cleanup listener on component unmount
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigate]); // Depend on navigate

  // Determine if back button should be shown (App's own button)
  const showBackButton = location.pathname !== '/';
  // Set header title based on route
  useEffect(() => {
    // Map of routes to their respective titles
    const routeTitles: Record<string, string> = {
      '/profile': 'Your Profile',
      '/friends': 'Friends',
      '/settings': 'Settings',
      '/search': 'Search'
    };
    
    // Default title
    const title = routeTitles[location.pathname] || 'Neislios';
    
    // Set the header title
    setHeaderTitle(title);
    // Note: Watchlist detail, manage, collaborators pages set their own titles dynamically
  }, [location.pathname, setHeaderTitle]);
  // Check if current path is a watchlist that's eligible for AI
  useEffect(() => {
    // Reset AI modal visibility initially
    setShowAIRecommendModal(false);
    
    // If we are on a watchlist detail page, check eligibility
    if (currentWatchlistId) {
      // Check if list is eligible for AI recommendations (10+ movies)
      checkListEligibleForAI().then((isEligible: boolean) => {
        // Store the eligibility state if needed for further actions
        console.log(`Watchlist AI eligibility: ${isEligible}`);
      }).catch((err: Error) => {
        console.error("Error checking AI eligibility:", err);
      });
    }
  }, [currentWatchlistId, checkListEligibleForAI]);
  
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);
  // --- FAB Logic ---  
  const getFabConfig = useCallback(() => {
    // Default configuration (Home)
    let config = {
      icon: <HomeIcon className="h-6 w-6" />,
      action: () => navigate('/'),
      label: "Go to Home"
    };
    
    // Home page configuration
    if (location.pathname === '/') {
      config = {
        icon: <PlusIcon className="h-6 w-6" />,
        action: () => setIsCreateModalOpen(true),
        label: "Create new watchlist"
      };
    }    // Watchlist detail page configuration
    else if (
      location.pathname.startsWith('/watchlist/') && 
      !location.pathname.includes('/manage') && 
      !location.pathname.includes('/collaborators')
    ) {
      // AI recommendations FAB action
      const showAIOption = () => {
        checkListEligibleForAI().then((isEligible: boolean) => {
          if (isEligible) {
            setShowAIRecommendModal(true);
          } else {
            console.log("List not eligible for AI recommendations");
            // You could add a toast notification here
          }
        }).catch((error) => {
          console.error("Error checking AI eligibility:", error);
        });
      };

      // For watchlists with enough items, show AI recommendation button
      config = {
        icon: <LightBulbIcon className="h-6 w-6" />,
        action: showAIOption,
        label: "Get AI recommendations"
      };

      // If random pick is available, prioritize that feature
      if (triggerRandomPick) {
        config = {
          icon: <SparklesIcon className="h-6 w-6" />,
          action: triggerRandomPick,
          label: "Pick random item"
        };
      }
    }
    
    return config;
  }, [location.pathname, navigate, triggerRandomPick, checkListEligibleForAI]);
  
  const { icon: fabIcon, action: fabAction, label: fabLabel } = getFabConfig();
  
  // Disable FAB if any relevant modal is open
  const isFabDisabled = isCreateModalOpen || showAIRecommendModal || isRandomPickModalOpen;
  const handleCloseCreateModal = useCallback(() => setIsCreateModalOpen(false), []);
  
  const handleWatchlistCreated = useCallback(() => {
    handleCloseCreateModal();
    // Subscription should handle refresh
    console.log("New list created, HomePage might need refresh if not using subscriptions effectively.");
  }, [handleCloseCreateModal]);
    const handleTitleClick = useCallback(() => {
    if (mainContentRef.current) {
      const scrollElement = mainContentRef.current;
      const currentPosition = scrollElement.scrollTop;
      
      // Only perform scroll if we're not already at the top
      if (currentPosition <= 0) return;
      
      // Smooth scroll implementation using animation frames
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
  }, []);
  const resetFabPosition = useCallback(() => {
    const defaultPosition = { right: 24, bottom: 24 };
    setFabPosition(defaultPosition);
    localStorage.setItem('fabPosition', JSON.stringify(defaultPosition));
  }, []);
  
  // Double-tap handler for resetting position
  const handleFabDoubleClick = useCallback(() => {
    resetFabPosition();
  }, [resetFabPosition]);
  
  // Handler for long press to enable drag mode
  const handleFabLongPress = useCallback(() => {
    setIsDragging(true);
  }, []);
  
  // Handler for drag end
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <SideMenu isOpen={isMenuOpen} onClose={closeMenu} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-primary text-white shadow-md z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative flex justify-between items-center h-16">
              {/* Left Section (Back or Burger) */}
              <div className="absolute left-0 flex items-center pl-1 sm:pl-0">
                {showBackButton ? (
                  <button
                    onClick={() => navigate(-1)} // Standard back navigation for app button
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

        {/* Floating Action Button */}
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

        {/* Modals */}
        <CreateWatchlistModal
          isOpen={isCreateModalOpen}
          onClose={handleCloseCreateModal}
          onWatchlistCreated={handleWatchlistCreated}
        />

        {/* AI Recommendation Modal - Remove the onVisibilityChange prop */}
        {showAIRecommendModal && currentWatchlistId && (
          <MediaRecommendationModal
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