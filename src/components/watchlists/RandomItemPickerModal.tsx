import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { TmdbMediaDetails } from '../../services/tmdbService';
import { isMovieDetails } from '../../utils/tmdbUtils';
import { WatchlistItemWithDetails } from '../../hooks/useWatchlistItems';

interface RandomItemPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    items: WatchlistItemWithDetails[];
}

const SPIN_DURATION = 2000;
const ITEM_HEIGHT = 86;
const PROGRESS_UPDATE_INTERVAL = 25;
const WIN_SOUND_DELAY = 200;

const playAudio = (audioRef: React.RefObject<HTMLAudioElement | null>, volume: number) => {
    if (audioRef.current) {
        audioRef.current.volume = volume;
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
    }
};

const extractTitles = (items: WatchlistItemWithDetails[]): string[] => {
    return items.map(item =>
        item.tmdbDetails ? (isMovieDetails(item.tmdbDetails) ? item.tmdbDetails.title : item.tmdbDetails.name) : 'Unknown'
    );
};

export function RandomItemPickerModal({ isOpen, onClose, items }: RandomItemPickerModalProps) {
    const [randomPick, setRandomPick] = useState<TmdbMediaDetails | null>(null);
    const [isSpinning, setIsSpinning] = useState(false);
    const [showPickerContent, setShowPickerContent] = useState(false);
    const [spinProgress, setSpinProgress] = useState(0);
    const [availableTitles, setAvailableTitles] = useState<string[]>([]);
    const [reelTranslation, setReelTranslation] = useState<number>(0);
    const [isVisuallySpinning, setIsVisuallySpinning] = useState(false);
    
    const spinningAudioRef = useRef<HTMLAudioElement | null>(null);
    const winAudioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setRandomPick(null);
            setIsSpinning(false);
            setIsVisuallySpinning(false);
            setShowPickerContent(false);
            setSpinProgress(0);
            setAvailableTitles([]);
            setReelTranslation(0);
            return;
        }

        // Start picking logic directly in useEffect
        setRandomPick(null);
        setShowPickerContent(false);
        setSpinProgress(0);
        setAvailableTitles([]);
        setReelTranslation(0);

        const availableItems = items.filter(item => item.tmdbDetails);

        if (availableItems.length === 0) {
            toast.error("No available items to pick from.");
            setRandomPick(null);
            setIsSpinning(false);
            setIsVisuallySpinning(false);
            setShowPickerContent(true); // Show content so user can see close button
            return;
        }

        if (availableItems.length === 1) {
            const singleItemDetails = availableItems[0].tmdbDetails;
            if (singleItemDetails) {
                setRandomPick(singleItemDetails);
                setShowPickerContent(true);
                setIsSpinning(false);
                setIsVisuallySpinning(false);
            } else {
                toast.error("Could not display the only available item.");
                setRandomPick(null);
                setIsSpinning(false);
                setIsVisuallySpinning(false);
                setShowPickerContent(true); // Show content so user can see close button
            }
            return;
        }

        // Only set spinning states if we have multiple items and will actually spin
        setIsSpinning(true);
        setIsVisuallySpinning(true);

        const titles = extractTitles(availableItems);
        setAvailableTitles(titles);
        
        const translation = -(titles.length * ITEM_HEIGHT);
        setReelTranslation(translation);

        let progressInterval: NodeJS.Timeout | null = null;
        const startTime = Date.now();

        const updateProgress = () => {
            const elapsedTime = Date.now() - startTime;
            const currentProgress = Math.min(elapsedTime, SPIN_DURATION);
            setSpinProgress(currentProgress);
            if (elapsedTime < SPIN_DURATION) {
                 progressInterval = setTimeout(updateProgress, PROGRESS_UPDATE_INTERVAL);
            }
        };
        progressInterval = setTimeout(updateProgress, PROGRESS_UPDATE_INTERVAL);

        const spinTimeout = setTimeout(() => {
            if (progressInterval) clearTimeout(progressInterval);
            setIsSpinning(false);
            setSpinProgress(SPIN_DURATION);
            const finalRandomIndex = Math.floor(Math.random() * availableItems.length);
            const finalPickedItem = availableItems[finalRandomIndex].tmdbDetails;

            if (finalPickedItem) {
                setRandomPick(finalPickedItem);
                setTimeout(() => {
                    setShowPickerContent(true);
                    setTimeout(() => setIsVisuallySpinning(false), 50);
                }, 50);
            } else {
                toast.error("An error occurred selecting the final random item.");
                setIsVisuallySpinning(false);
                setShowPickerContent(true); // Show content so user can see close button
            }
        }, SPIN_DURATION);

        playAudio(spinningAudioRef, 0.5);

        return () => {
            if (progressInterval) clearTimeout(progressInterval);
            clearTimeout(spinTimeout);
        };
    }, [isOpen, items]); // Only depend on isOpen and items
    
    useEffect(() => {
        if (!isSpinning && randomPick && isOpen) {
            setTimeout(() => playAudio(winAudioRef, 0.6), WIN_SOUND_DELAY);
        }
    }, [isSpinning, randomPick, isOpen]);

    if (!isOpen) {
        return null;
    }

    return (
        <div
            className={`fixed inset-0 z-50 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={onClose}
        >
            <audio ref={spinningAudioRef} preload="auto">
                <source src="https://assets.mixkit.co/active_storage/sfx/212/212-preview.mp3" type="audio/mp3" />
            </audio>
            <audio ref={winAudioRef} preload="auto">
                <source src="https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3" type="audio/mp3" />
            </audio>
            
            <div
                className={`bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full text-center transform transition-all duration-300 ease-in-out ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'} animate-hype`}
                onClick={(e) => e.stopPropagation()}
            >
                {isSpinning || isVisuallySpinning ? (
                    <div className="flex flex-col items-center">
                        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Picking Random Item...</h3>
                        <div className="slot-machine-container h-48 mb-4 w-full">
                             <div className="slot-highlight-zone"></div>
                             <div
                                className={`slot-reel ${isVisuallySpinning ? 'animate-slot-spin slot-reel-spinning' : ''} slot-reel-container`}
                                /* Inline style required for dynamic CSS custom property */
                                /* The reel translation is calculated at runtime based on item count */
                                style={{
                                    '--reel-translation': `${reelTranslation}px`
                                } as React.CSSProperties}
                             >
                                {availableTitles.map((title, index) => (
                                    <div
                                        key={`slot-${index}`}
                                        className="slot-item h-14 flex items-center justify-center slot-item-positioned"
                                        /* Inline style required for dynamic positioning */
                                        /* Each slot item needs unique top position calculated at runtime */
                                        style={{ top: `${index * ITEM_HEIGHT}px` }}
                                    >
                                        {title}
                                    </div>
                                ))}
                                {/* Duplicate items for seamless looping */}
                                {availableTitles.map((title, index) => (
                                    <div
                                        key={`slot-dup-${index}`}
                                        className="slot-item h-14 flex items-center justify-center slot-item-positioned"
                                        /* Inline style required for dynamic positioning */
                                        /* Duplicate slot items need offset positioning for seamless loop */
                                        style={{ top: `${(availableTitles.length + index) * ITEM_HEIGHT}px` }}
                                    >
                                        {title}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="h-2 w-full bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary progress-bar-dynamic rounded-full"
                                /* Inline style required for dynamic progress bar width */
                                /* Width percentage changes continuously during spin animation */
                                style={{ width: `${(spinProgress / SPIN_DURATION) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                ) : (
                    <div className={`transition-opacity duration-300 ease-in ${showPickerContent ? 'opacity-100' : 'opacity-0'}`}>
                        {randomPick ? (
                            <>
                                <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Your Random Pick!</h3>
                                <Link
                                    to={`/${randomPick.media_type}/${randomPick.id}`}
                                    onClick={onClose}
                                    className="hover:underline win-reveal block p-3"
                                >
                                    <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                                        {isMovieDetails(randomPick) ? randomPick.title : randomPick.name}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {isMovieDetails(randomPick) ? randomPick.release_date?.substring(0, 4) : randomPick.first_air_date?.substring(0, 4)}
                                    </p>
                                </Link>
                            </>
                        ) : (
                            showPickerContent && (
                                <>
                                    <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Random Pick</h3>
                                    <p className="text-gray-500 dark:text-gray-400 mb-4">Unable to pick a random item. Please try again.</p>
                                </>
                            )
                        )}
                        <button onClick={onClose} className="mt-6 bg-primary hover:bg-opacity-80 text-white py-2 px-4 rounded">
                            Close
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}