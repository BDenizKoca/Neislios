import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom'; // Import Link
import toast from 'react-hot-toast';
import { TmdbMediaDetails } from '../../services/tmdbService';
import { isMovieDetails } from '../../utils/tmdbUtils';
import { WatchlistItemWithDetails } from '../../hooks/useWatchlistItems';

interface RandomItemPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    items: WatchlistItemWithDetails[]; // Receive the already filtered/sorted items
}

const spinDuration = 2000; // Spin for 2 seconds
// Calculate item height based on Tailwind class - now accounting for padding and margins
const itemHeight = 86; // 70px height + 12px padding (top/bottom) + 4px margin (top/bottom)

export function RandomItemPickerModal({ isOpen, onClose, items }: RandomItemPickerModalProps) {
    const [randomPick, setRandomPick] = useState<TmdbMediaDetails | null>(null);
    const [isSpinning, setIsSpinning] = useState(false);
    const [showPickerContent, setShowPickerContent] = useState(false);
    const [spinProgress, setSpinProgress] = useState(0);
    const [availableTitles, setAvailableTitles] = useState<string[]>([]);
    const [reelTranslation, setReelTranslation] = useState<number>(0); // State for CSS variable
    const [isVisuallySpinning, setIsVisuallySpinning] = useState(false);
    
    // Audio refs for sound effects
    const spinningAudioRef = useRef<HTMLAudioElement | null>(null);
    const winAudioRef = useRef<HTMLAudioElement | null>(null);

    const startPicking = useCallback(() => {
        setRandomPick(null);
        setShowPickerContent(false);
        setIsSpinning(true);
        setIsVisuallySpinning(true);
        setSpinProgress(0);
        setAvailableTitles([]);
        setReelTranslation(0); // Reset translation

        const availableItems = items.filter(item => item.tmdbDetails);

        if (availableItems.length === 0) {
            toast.error("No available items to pick from.");
            setIsSpinning(false);
            setIsVisuallySpinning(false);
            onClose();
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
                setIsSpinning(false);
                setIsVisuallySpinning(false);
                onClose();
            }
            return;
        }

        const titles = availableItems.map(item =>
            item.tmdbDetails ? (isMovieDetails(item.tmdbDetails) ? item.tmdbDetails.title : item.tmdbDetails.name) : 'Unknown'
        );
        setAvailableTitles(titles);
        // Calculate the exact translation needed based on the number of titles
        setReelTranslation(-(titles.length * itemHeight));

        let progressInterval: NodeJS.Timeout | null = null;
        const startTime = Date.now();

        const updateProgress = () => {
            const elapsedTime = Date.now() - startTime;
            const currentProgress = Math.min(elapsedTime, spinDuration);
            setSpinProgress(currentProgress);
            if (elapsedTime < spinDuration) {
                 progressInterval = setTimeout(updateProgress, 25);
            }
        };
        progressInterval = setTimeout(updateProgress, 25);


        const spinTimeout = setTimeout(() => {
            if (progressInterval) clearTimeout(progressInterval);
            setIsSpinning(false);
            setSpinProgress(spinDuration);
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
                onClose();
            }
        }, spinDuration);

        return () => {
            if (progressInterval) clearTimeout(progressInterval);
            clearTimeout(spinTimeout);
        };

    }, [items, onClose]);

    useEffect(() => {
        let cleanup: (() => void) | undefined;
        if (isOpen) {
            cleanup = startPicking();
            
            // Play spinning sound when animation starts
            if (spinningAudioRef.current) {
                spinningAudioRef.current.volume = 0.5;
                spinningAudioRef.current.currentTime = 0;
                spinningAudioRef.current.play().catch(() => {});
            }
        } else {
            setRandomPick(null);
            setIsSpinning(false);
            setIsVisuallySpinning(false);
            setShowPickerContent(false);
            setSpinProgress(0);
            setAvailableTitles([]);
            setReelTranslation(0);
        }
        return cleanup;
    }, [isOpen, startPicking]);
    
    // Play win sound when spinning stops and result is shown
    useEffect(() => {
        if (!isSpinning && randomPick && isOpen) {
            if (winAudioRef.current) {
                // Small delay to make it feel like the win sound is tied to the final selection
                setTimeout(() => {
                    if (winAudioRef.current) {
                        winAudioRef.current.volume = 0.6;
                        winAudioRef.current.currentTime = 0;
                        winAudioRef.current.play().catch(() => {});
                    }
                }, 200);
            }
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
            {/* Sound effects */}
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
                                className={`slot-reel ${isVisuallySpinning ? 'animate-slot-spin' : ''}`}
                                style={{
                                    '--reel-translation': `${reelTranslation}px`,
                                    filter: isVisuallySpinning ? 'blur(1px)' : 'none',
                                    transition: 'filter 0.3s ease-out'
                                } as React.CSSProperties}
                             >
                                {availableTitles.map((title, index) => (
                                    <div
                                        key={`slot-${index}`}
                                        className="slot-item h-14 flex items-center justify-center"
                                        style={{
                                            top: `${index * itemHeight}px`,
                                            fontSize: '1.2rem'
                                        }}
                                    >
                                        {title}
                                    </div>
                                ))}
                                {/* Duplicate the ENTIRE list for seamless looping */}
                                {availableTitles.map((title, index) => (
                                    <div
                                        key={`slot-dup-${index}`}
                                        className="slot-item h-14 flex items-center justify-center"
                                        style={{
                                            top: `${(availableTitles.length + index) * itemHeight}px`,
                                            fontSize: '1.2rem'
                                        }}
                                    >
                                        {title}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="h-2 w-full bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-100 ease-linear rounded-full"
                                style={{ width: `${(spinProgress / spinDuration) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                ) : (
                    <div className={`transition-opacity duration-300 ease-in ${showPickerContent ? 'opacity-100' : 'opacity-0'}`}>
                        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Your Random Pick!</h3>
                        {randomPick ? (
                            <>
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
                            showPickerContent && <p className="text-gray-500 dark:text-gray-400">...</p>
                        )}
                        <button onClick={onClose} className="mt-6 bg-primary hover:bg-opacity-80 text-white py-2 px-4 rounded">Close</button>
                    </div>
                )}
            </div>
        </div>
    );
}