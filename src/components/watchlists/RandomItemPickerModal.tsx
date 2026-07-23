import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { TmdbMediaDetails } from '../../services/tmdbService';
import { isMovieDetails } from '../../utils/tmdbUtils';
import { WatchlistItemWithDetails } from '../../hooks/useWatchlistItems';
import Modal from '../common/Modal';
import { SparklesIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface RandomItemPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: WatchlistItemWithDetails[];
  watchedMediaIds?: Set<string>;
}

type SpinPhase = 'idle' | 'spinning' | 'slowing' | 'landed';

const ITEM_HEIGHT = 48;
const REEL_LENGTH = 44;
const TARGET_INDEX = 30;
const TOTAL_REEL_HEIGHT = REEL_LENGTH * ITEM_HEIGHT;
const TARGET_OFFSET = TARGET_INDEX * ITEM_HEIGHT - ITEM_HEIGHT; // Center row alignment
const SPIN_SPEED = 2800; // Fast spin speed in px/s
const SPIN_DURATION = 1000; // Duration of fast spin in ms
const SLOW_DURATION = 1400; // Duration of deceleration easing in ms

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

const vibrate = (pattern: number | number[]) => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};

const getItemTitle = (item: WatchlistItemWithDetails): string => {
  if (!item.tmdbDetails) return 'Unknown Title';
  return isMovieDetails(item.tmdbDetails) ? item.tmdbDetails.title : item.tmdbDetails.name;
};

export function RandomItemPickerModal({ isOpen, onClose, items, watchedMediaIds }: RandomItemPickerModalProps) {
  const [hasSpun, setHasSpun] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinPhase, setSpinPhase] = useState<SpinPhase>('idle');
  const [randomPick, setRandomPick] = useState<TmdbMediaDetails | null>(null);

  const [unwatchedOnly, setUnwatchedOnly] = useState(false);
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'movie' | 'tv'>('all');
  const [under120Only, setUnder120Only] = useState(false);

  const [reelList, setReelList] = useState<string[]>([]);
  const [displayOffset, setDisplayOffset] = useState(0);

  const reelRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const offsetRef = useRef(0);
  const phaseRef = useRef<SpinPhase>('idle');
  const targetOffsetRef = useRef(0);
  const slowStartOffsetRef = useRef(0);
  const slowStartTimeRef = useRef(0);
  const spinStartTimeRef = useRef(0);
  const winnerRef = useRef<WatchlistItemWithDetails | null>(null);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearAllTimers = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    timeoutsRef.current.forEach(t => clearTimeout(t));
    timeoutsRef.current = [];
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (!item.tmdbDetails) return false;

      if (unwatchedOnly && watchedMediaIds && watchedMediaIds.has(item.media_id)) {
        return false;
      }

      if (mediaTypeFilter !== 'all') {
        const isMovie = isMovieDetails(item.tmdbDetails);
        if (mediaTypeFilter === 'movie' && !isMovie) return false;
        if (mediaTypeFilter === 'tv' && isMovie) return false;
      }

      if (under120Only) {
        if (isMovieDetails(item.tmdbDetails)) {
          if (item.tmdbDetails.runtime && item.tmdbDetails.runtime > 120) {
            return false;
          }
        }
      }

      return true;
    });
  }, [items, unwatchedOnly, mediaTypeFilter, under120Only, watchedMediaIds]);

  // Populate initial reel from available filtered items on open or filter change
  useEffect(() => {
    if (filteredItems.length > 0 && !isSpinning && !hasSpun) {
      const titlesPool = filteredItems.map(getItemTitle);
      const initialReel: string[] = [];
      for (let i = 0; i < REEL_LENGTH; i++) {
        initialReel.push(titlesPool[i % titlesPool.length]);
      }
      setReelList(initialReel);
    }
  }, [filteredItems, isSpinning, hasSpun]);

  useEffect(() => {
    if (!isOpen) {
      clearAllTimers();
      setHasSpun(false);
      setIsSpinning(false);
      setSpinPhase('idle');
      setRandomPick(null);
      setDisplayOffset(0);
      setReelList([]);
      offsetRef.current = 0;
      phaseRef.current = 'idle';
    }
    return () => clearAllTimers();
  }, [isOpen]);

  const runAnimation = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      if (phaseRef.current === 'spinning') {
        offsetRef.current += SPIN_SPEED * dt;
        setDisplayOffset(offsetRef.current % TOTAL_REEL_HEIGHT);

        if (now - spinStartTimeRef.current >= SPIN_DURATION) {
          phaseRef.current = 'slowing';
          slowStartOffsetRef.current = offsetRef.current;
          slowStartTimeRef.current = now;

          const startMod = offsetRef.current % TOTAL_REEL_HEIGHT;
          const distToTarget = (TARGET_OFFSET - startMod + TOTAL_REEL_HEIGHT) % TOTAL_REEL_HEIGHT;
          const totalSlowDist = distToTarget + 2 * TOTAL_REEL_HEIGHT; // 2 full extra rotations for smooth deceleration
          targetOffsetRef.current = offsetRef.current + totalSlowDist;
        }
      }

      if (phaseRef.current === 'slowing') {
        const elapsed = now - slowStartTimeRef.current;
        const progress = Math.min(elapsed / SLOW_DURATION, 1);
        const eased = easeOutCubic(progress);
        const current = slowStartOffsetRef.current + (targetOffsetRef.current - slowStartOffsetRef.current) * eased;
        offsetRef.current = current;
        setDisplayOffset(current % TOTAL_REEL_HEIGHT);

        if (progress >= 1) {
          setDisplayOffset(TARGET_OFFSET);
          cancelAnimationFrame(rafRef.current!);
          rafRef.current = null;

          const winner = winnerRef.current;
          phaseRef.current = 'landed';
          setSpinPhase('landed');
          setIsSpinning(false);
          setHasSpun(true);
          if (winner?.tmdbDetails) {
            setRandomPick(winner.tmdbDetails);
          }
          vibrate([150, 50, 250]);
          return;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  };

  const handleRoll = () => {
    if (filteredItems.length === 0) {
      toast.error('No items match your filter criteria.');
      return;
    }

    clearAllTimers();

    const winnerIndex = Math.floor(Math.random() * filteredItems.length);
    const winnerItem = filteredItems[winnerIndex];
    winnerRef.current = winnerItem;

    const titlesPool = filteredItems.map(getItemTitle);
    const dummyReel: string[] = [];
    for (let i = 0; i < REEL_LENGTH; i++) {
      if (i === TARGET_INDEX) {
        dummyReel.push(getItemTitle(winnerItem));
      } else {
        dummyReel.push(titlesPool[Math.floor(Math.random() * titlesPool.length)]);
      }
    }

    offsetRef.current = 0;
    phaseRef.current = 'spinning';
    spinStartTimeRef.current = performance.now();

    setIsSpinning(true);
    setHasSpun(false);
    setRandomPick(null);
    setSpinPhase('spinning');
    setReelList(dummyReel);
    setDisplayOffset(0);
    vibrate([40, 20, 40]);

    intervalRef.current = setInterval(() => {
      vibrate([12]);
    }, 85);

    const t1 = setTimeout(() => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, SPIN_DURATION);

    const dt1 = setTimeout(() => vibrate([15]), SPIN_DURATION + 300);
    const dt2 = setTimeout(() => vibrate([22]), SPIN_DURATION + 600);
    const dt3 = setTimeout(() => vibrate([30]), SPIN_DURATION + 900);
    const dt4 = setTimeout(() => vibrate([40]), SPIN_DURATION + 1100);
    timeoutsRef.current.push(t1, dt1, dt2, dt3, dt4);

    runAnimation();
  };

  // Tripled reel guarantees seamless infinite scrolling without any end-of-reel gaps
  const tripledReel = useMemo(() => {
    if (reelList.length === 0) return [];
    return [...reelList, ...reelList, ...reelList];
  }, [reelList]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-lg"
      title="Random Item Picker"
      subtitle="Can't decide what to watch? Configure filters and roll!"
    >
      <div className="space-y-6">
        <div className="space-y-3 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Filter Options
            </span>
            <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-600/10 px-2.5 py-0.5 rounded-full">
              {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'} available
            </span>
          </div>

          <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <button
              type="button"
              disabled={isSpinning}
              onClick={() => setMediaTypeFilter('all')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                mediaTypeFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              All Types
            </button>
            <button
              type="button"
              disabled={isSpinning}
              onClick={() => setMediaTypeFilter('movie')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                mediaTypeFilter === 'movie'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Movies Only
            </button>
            <button
              type="button"
              disabled={isSpinning}
              onClick={() => setMediaTypeFilter('tv')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                mediaTypeFilter === 'tv'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              TV Series Only
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={isSpinning}
              onClick={() => setUnwatchedOnly(!unwatchedOnly)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                unwatchedOnly
                  ? 'bg-red-600/10 border-red-500/40 text-red-600 dark:text-red-400 shadow-sm'
                  : 'bg-slate-100/80 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <span>{unwatchedOnly ? '\u2713' : '+'}</span>
              <span>Unwatched Only</span>
            </button>

            <button
              type="button"
              disabled={isSpinning}
              onClick={() => setUnder120Only(!under120Only)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                under120Only
                  ? 'bg-red-600/10 border-red-500/40 text-red-600 dark:text-red-400 shadow-sm'
                  : 'bg-slate-100/80 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <span>{under120Only ? '\u2713' : '+'}</span>
              <span>Under 2 Hours</span>
            </button>
          </div>
        </div>

        {/* Stable container prevents scrollbar triggers & layout jumps */}
        <div className="relative overflow-hidden min-h-[144px] flex items-center justify-center">
          {(!hasSpun || isSpinning) && (
            <div className="relative slot-machine-container w-full glass-panel rounded-3xl overflow-hidden border border-red-500/30 shadow-2xl">
              {/* Highlight Window & Center Marker with crisp vector SVG arrows */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-12 bg-red-600/15 border-y-2 border-red-500/50 z-10 pointer-events-none flex items-center justify-between px-4 shadow-[0_0_20px_rgba(239,68,68,0.25)]">
                <svg className="w-3.5 h-3.5 text-red-500 fill-current animate-pulse drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <svg className="w-3.5 h-3.5 text-red-500 fill-current animate-pulse drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]" viewBox="0 0 24 24">
                  <path d="M16 5v14l-11-7z" />
                </svg>
              </div>

              {filteredItems.length === 0 ? (
                <div className="z-30 text-center px-4">
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                    No matching items available.
                  </p>
                </div>
              ) : (
                <div
                  ref={reelRef}
                  className="slot-reel"
                  style={{
                    transform: `translateY(-${displayOffset}px)`,
                    transition: 'none',
                  }}
                >
                  {tripledReel.map((title, idx) => {
                    const modIdx = idx % REEL_LENGTH;
                    const isWinningItem = spinPhase === 'landed' && modIdx === TARGET_INDEX;
                    return (
                      <div
                        key={idx}
                        className={`slot-item px-4 text-slate-800 dark:text-slate-100 truncate ${
                          isWinningItem ? 'text-red-600 dark:text-red-400 text-lg font-black slot-final-pick' : ''
                        }`}
                      >
                        {title}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {hasSpun && !isSpinning && randomPick && (
            <div className="w-full p-5 sm:p-6 rounded-3xl glass-modal border border-red-500/40 text-center animate-hype shadow-xl shadow-red-600/10 space-y-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-red-500 block">
                {'\uD83C\uDF89'} Selected Pick
              </span>
              <Link
                to={`/${randomPick.media_type}/${randomPick.id}`}
                onClick={onClose}
                className="block group"
              >
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-red-500 transition-colors tracking-tight">
                  {isMovieDetails(randomPick) ? randomPick.title : randomPick.name}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mt-1">
                  {isMovieDetails(randomPick) ? randomPick.release_date?.substring(0, 4) : randomPick.first_air_date?.substring(0, 4)}
                  {isMovieDetails(randomPick) && randomPick.runtime ? ` \u2022 ${randomPick.runtime} min` : ''}
                </p>
              </Link>
            </div>
          )}
        </div>

        <div className="flex justify-center gap-3 pt-2">
          {!hasSpun ? (
            <button
              type="button"
              disabled={isSpinning || filteredItems.length === 0}
              onClick={handleRoll}
              className="btn-primary px-8 py-3 w-full sm:w-auto min-w-[160px] text-base"
            >
              <SparklesIcon className="w-5 h-5" />
              <span>{isSpinning ? 'Spinning...' : 'Roll!'}</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={isSpinning || filteredItems.length === 0}
                onClick={handleRoll}
                className="btn-primary px-6 py-2.5 min-w-[130px]"
              >
                <ArrowPathIcon className="w-4 h-4" />
                <span>Reroll</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary px-6 py-2.5 min-w-[130px]"
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default RandomItemPickerModal;

