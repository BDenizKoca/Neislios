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
  LightBulbIcon 
} from '@heroicons/react/24/outline';
import { FloatingActionButton, Position } from '../common/index';
import CreateWatchlistModal from '../watchlists/CreateWatchlistModal';
import MediaRecommendationModal from '../recommendations/MediaRecommendationModal';
import { logger } from '../../utils/logger';
import { useLayoutActions } from '../../hooks/useLayoutActions';
import { useHeader } from '../../hooks/useHeader';
import { useWatchlistAI } from '../../hooks/useWatchlistAI';

interface MainLayoutProps {
  children?: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [fabPosition, setFabPosition] = useState<Position>(() => {
    const savedPosition = localStorage.getItem('fabPosition');
    return savedPosition ? JSON.parse(savedPosition) : { right: 24, bottom: 24 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [showAIRecommendModal, setShowAIRecommendModal] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { headerTitle, setHeaderTitle } = useHeader(); 
  const mainContentRef = useRef<HTMLElement>(null);
  const currentPathRef = useRef(location.pathname);

  const { triggerRandomPick, isRandomPickModalOpen } = useLayoutActions();

  const getWatchlistIdFromPath = useCallback((pathname: string): string | undefined => {
    if (pathname.startsWith('/watchlist/') && 
        !pathname.includes('/manage') && 
        !pathname.includes('/collaborators')) {
      return pathname.split('/').pop();
    }
    return undefined;
  }, []);

  const currentWatchlistId = getWatchlistIdFromPath(location.pathname);
  const { checkListEligibleForAI } = useWatchlistAI(currentWatchlistId);

  useEffect(() => {
    const handleWatchlistUpdate = (event: CustomEvent) => {
      const { watchlistId } = event.detail;
      if (watchlistId === currentWatchlistId) {
        // Watchlist updated trigger
      }
    };

    window.addEventListener('watchlist-updated', handleWatchlistUpdate as EventListener);
    return () => {
      window.removeEventListener('watchlist-updated', handleWatchlistUpdate as EventListener);
    };
  }, [currentWatchlistId]);

  useEffect(() => {
    const savedModalState = sessionStorage.getItem('recommendation-modal-open');
    if (savedModalState && savedModalState === currentWatchlistId) {
      setShowAIRecommendModal(true);
    }
  }, [location.pathname, currentWatchlistId]);

  useEffect(() => {
    currentPathRef.current = location.pathname;
  });

  useEffect(() => {
    const handlePopState = () => {
      if (currentPathRef.current === '/') {
        logger.info("Back navigation attempt from '/' detected. Preventing.");
        navigate('/', { replace: true });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigate]);

  const showBackButton = location.pathname !== '/';

  useEffect(() => {
    const routeTitles: Record<string, string> = {
      '/profile': 'Your Profile',
      '/friends': 'Friends',
      '/settings': 'Settings',
      '/search': 'Search Movies & TV'
    };
    
    const title = routeTitles[location.pathname] || 'Neislios';
    setHeaderTitle(title);
  }, [location.pathname, setHeaderTitle]);

  useEffect(() => {
    setShowAIRecommendModal(false);
    if (currentWatchlistId) {
      checkListEligibleForAI().then((isEligible: boolean) => {
        logger.info(`Watchlist AI eligibility: ${isEligible}`);
      }).catch((err: Error) => {
        logger.error("Error checking AI eligibility:", err);
      });
    }
  }, [currentWatchlistId, checkListEligibleForAI]);
  
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  const getFabConfig = useCallback(() => {
    let config = {
      icon: <HomeIcon className="h-6 w-6" />,
      action: () => navigate('/'),
      label: "Go to Home"
    };
    
    if (location.pathname === '/') {
      config = {
        icon: <PlusIcon className="h-6 w-6" />,
        action: () => setIsCreateModalOpen(true),
        label: "Create new watchlist"
      };
    } else if (
      location.pathname.startsWith('/watchlist/') && 
      !location.pathname.includes('/manage') && 
      !location.pathname.includes('/collaborators')
    ) {
      const showAIOption = () => {
        checkListEligibleForAI().then((isEligible: boolean) => {
          if (isEligible) {
            setShowAIRecommendModal(true);
          } else {
            logger.info("List not eligible for AI recommendations");
          }
        }).catch((error) => {
          logger.error("Error checking AI eligibility:", error);
        });
      };

      config = {
        icon: <LightBulbIcon className="h-6 w-6" />,
        action: showAIOption,
        label: "Get AI recommendations"
      };

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
  const isFabDisabled = isCreateModalOpen || showAIRecommendModal || isRandomPickModalOpen;
  const handleCloseCreateModal = useCallback(() => setIsCreateModalOpen(false), []);
  
  const handleWatchlistCreated = useCallback(() => {
    handleCloseCreateModal();
  }, [handleCloseCreateModal]);

  const handleTitleClick = useCallback(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const resetFabPosition = useCallback(() => {
    const defaultPosition: Position = { right: 24, bottom: 24 };
    setFabPosition(defaultPosition);
    localStorage.setItem('fabPosition', JSON.stringify(defaultPosition));
  }, []);
  
  const handleFabDoubleClick = useCallback(() => {
    resetFabPosition();
  }, [resetFabPosition]);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 font-sans">
      <SideMenu isOpen={isMenuOpen} onClose={closeMenu} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Modern Glass Top Bar */}
        <header className="sticky top-0 z-30 glass-panel border-b border-slate-200/60 dark:border-slate-800/60 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative flex justify-between items-center h-16">
              {/* Left Action */}
              <div className="flex items-center">
                {showBackButton ? (
                  <button
                    onClick={() => navigate(-1)}
                    className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/60 rounded-full transition-colors"
                    aria-label="Go back"
                  >
                    <ArrowLeftIcon className="h-5 w-5" />
                  </button>
                ) : (
                  <button
                    onClick={toggleMenu}
                    className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/60 rounded-full transition-colors"
                    aria-label="Open sidebar"
                  >
                    {isMenuOpen ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
                  </button>
                )}
              </div>

              {/* Title / Logo Header */}
              <div className="flex-1 flex justify-center items-center px-4">
                <h1
                  className="text-lg font-bold tracking-tight cursor-pointer hover:opacity-80 transition-opacity text-slate-900 dark:text-slate-100 truncate max-w-xs sm:max-w-md text-center"
                  onClick={handleTitleClick}
                  title={headerTitle}
                >
                  {headerTitle}
                </h1>
              </div>

              {/* Right Action (Search) */}
              <div className="flex items-center">
                <Link
                  to="/search"
                  className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/60 rounded-full transition-colors"
                  aria-label="Search"
                >
                  <MagnifyingGlassIcon className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main ref={mainContentRef} className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 dark:bg-[#0b0f17] scroll-smooth">
          {children || <Outlet />}
        </main>

        {/* Floating Action Button */}
        {!location.pathname.includes('/manage') && !isFabDisabled && (
          <FloatingActionButton
            onClick={fabAction}
            icon={fabIcon}
            ariaLabel={fabLabel}
            position={fabPosition}
            onPositionChange={(newPosition: Position) => {
              setFabPosition(newPosition);
              localStorage.setItem('fabPosition', JSON.stringify(newPosition));
            }}
            isDraggable={true}
            onDoubleClick={handleFabDoubleClick}
            onLongPress={() => setIsDragging(true)}
            onDragEnd={() => setIsDragging(false)}
            isDragging={isDragging}
            style={{
              transition: isDragging ? 'none' : 'all 0.3s ease',
              cursor: isDragging ? 'grabbing' : (isFabDisabled ? 'not-allowed' : 'pointer'),
              opacity: isDragging ? 0.8 : (isFabDisabled ? 0.5 : 1),
            }}
          />
        )}

        {/* Modals */}
        <CreateWatchlistModal
          isOpen={isCreateModalOpen}
          onClose={handleCloseCreateModal}
          onWatchlistCreated={handleWatchlistCreated}
        />

        {showAIRecommendModal && currentWatchlistId && (
          <MediaRecommendationModal
            isOpen={showAIRecommendModal}
            onClose={() => setShowAIRecommendModal(false)}
            watchlistId={currentWatchlistId}
          />
        )}
      </div>
    </div>
  );
};

export default MainLayout;