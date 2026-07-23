import React, { useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import SideMenu from './SideMenu';
import { 
  Bars3Icon, 
  XMarkIcon, 
  ArrowLeftIcon, 
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import CreateWatchlistModal from '../watchlists/CreateWatchlistModal';
import MediaRecommendationModal from '../recommendations/MediaRecommendationModal';
import InstallAppBanner from '../common/InstallAppBanner';
import { logger } from '../../utils/logger';
import { useHeader } from '../../hooks/useHeader';
import { useWatchlistAI } from '../../hooks/useWatchlistAI';

interface MainLayoutProps {
  children?: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showAIRecommendModal, setShowAIRecommendModal] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { headerTitle, setHeaderTitle } = useHeader(); 
  const mainContentRef = useRef<HTMLElement>(null);
  const currentPathRef = useRef(location.pathname);

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

  const handleCloseCreateModal = useCallback(() => setIsCreateModalOpen(false), []);
  
  const handleWatchlistCreated = useCallback(() => {
    handleCloseCreateModal();
  }, [handleCloseCreateModal]);

  const handleTitleClick = useCallback(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  return (
    <div className="fixed inset-0 flex bg-slate-100 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 font-sans overflow-hidden">
      <SideMenu isOpen={isMenuOpen} onClose={closeMenu} />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Modern Glass Top Bar */}
        <header className="shrink-0 z-30 glass-panel border-b border-slate-200/60 dark:border-slate-800/60 shadow-sm">
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
                  className={`text-lg sm:text-xl tracking-tight cursor-pointer hover:opacity-80 transition-opacity truncate max-w-xs sm:max-w-md text-center ${
                    headerTitle === 'Neislios'
                      ? 'text-red-600 dark:text-red-500 font-black text-xl sm:text-2xl'
                      : 'text-slate-900 dark:text-slate-100 font-bold'
                  }`}
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
        <main ref={mainContentRef} className="flex-1 overflow-x-hidden overflow-y-auto no-scrollbar bg-slate-100 dark:bg-[#0b0f17] scroll-smooth">
          {children || <Outlet />}
        </main>

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

        <InstallAppBanner />
      </div>
    </div>
  );
};

export default MainLayout;