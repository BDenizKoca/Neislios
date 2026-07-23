import React, { useEffect, useState, useCallback } from 'react';
import { PlusIcon, ArrowLeftIcon, ArrowTopRightOnSquareIcon, StarIcon } from '@heroicons/react/24/outline';
import { SparklesIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabaseClient';
import { useAIRecommendations } from '../../hooks/useAIRecommendations';
import { getMoviePosterUrl, getMovieDetails, getTvDetails, TmdbMediaDetails } from '../../services/tmdbService';
import { isMovieDetails } from '../../utils/tmdbUtils';
import { useWatchlistItems } from '../../hooks/useWatchlistItems';
import Modal from '../common/Modal';
import { localAIService } from '../../services/localAIService';

interface MediaRecommendationModalProps {
  isOpen: boolean;
  onClose: () => void;
  watchlistId: string;
}

const MediaRecommendationModal: React.FC<MediaRecommendationModalProps> = ({
  isOpen,
  onClose,
  watchlistId
}) => {
  const { loading: recommendationsLoading, recommendations, error: recommendationsError, generateRecommendations } = useAIRecommendations();
  const { items, loading: itemsLoading, error: itemsError, refetch: refetchWatchlistItems } = useWatchlistItems(watchlistId);
  const [isGenerating, setIsGenerating] = useState(false);
  const [addingItemId, setAddingItemId] = useState<number | null>(null);
  const [previewMedia, setPreviewMedia] = useState<{id: number, media_type: 'movie' | 'tv', details?: TmdbMediaDetails} | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [addedItems, setAddedItems] = useState<Set<number>>(new Set());
  
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const handleGenerate = useCallback(async (currentItems: any[]) => {
    setIsGenerating(true);
    setAiSummary(null);
    try {
      const recs = await generateRecommendations(currentItems);
      if (recs && recs.length > 0) {
        setIsGeneratingSummary(true);
        const watchlistTitles = currentItems
          .filter(i => i.tmdbDetails)
          .slice(0, 15)
          .map(i => isMovieDetails(i.tmdbDetails!) ? i.tmdbDetails!.title : i.tmdbDetails!.name);
        const recTitles = recs.map(r => r.title);
        
        localAIService.generateRecommendationSummary(watchlistTitles, recTitles)
          .then(summary => {
            if (summary) setAiSummary(summary);
          })
          .catch(err => console.error("AI Summary error:", err))
          .finally(() => setIsGeneratingSummary(false));
      }
    } finally {
      setIsGenerating(false);
    }
  }, [generateRecommendations]);

  useEffect(() => {
    if (isOpen && items && items.length >= 10 && recommendations.length === 0 && !recommendationsLoading) {
      handleGenerate(items);
    }
  }, [isOpen, items, recommendations.length, recommendationsLoading, handleGenerate]);

  useEffect(() => {
    if (!isOpen) {
      setPreviewMedia(null);
      setAiSummary(null);
    }
  }, [isOpen]);

  const handleAddToList = async (mediaId: number, mediaType: 'movie' | 'tv') => {
    if (addedItems.has(mediaId) || addingItemId === mediaId) return;

    setAddingItemId(mediaId);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('watchlist_items')
        .insert({
          watchlist_id: watchlistId,
          media_id: `tmdb:${mediaType}:${mediaId}`,
          added_by_user_id: user.id,
        });

      if (error) throw error;

      setAddedItems(prev => new Set(prev).add(mediaId));
      toast.success('Added to watchlist!');
      refetchWatchlistItems();
    } catch (err: any) {
      console.error('Error adding item:', err);
      toast.error(err.message || 'Failed to add item');
    } finally {
      setAddingItemId(null);
    }
  };

  const handleMediaClick = async (mediaId: number, mediaType: 'movie' | 'tv') => {
    setLoadingPreview(true);
    setPreviewMedia({ id: mediaId, media_type: mediaType });

    try {
      if (mediaType === 'movie') {
        const details = await getMovieDetails(mediaId);
        setPreviewMedia({ id: mediaId, media_type: mediaType, details: details || undefined });
      } else {
        const details = await getTvDetails(mediaId);
        setPreviewMedia({ id: mediaId, media_type: mediaType, details: details || undefined });
      }
    } catch (err) {
      console.error('Error fetching details:', err);
      toast.error('Failed to load media details');
    } finally {
      setLoadingPreview(false);
    }
  };

  const isLoading = isGenerating || recommendationsLoading || itemsLoading;
  const error = recommendationsError || itemsError;
  const existingMediaIds = new Set(items?.map(item => item.media_id) || []);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-4xl"
      title={
        <div className="flex items-center gap-2">
          {previewMedia && (
            <button
              onClick={() => setPreviewMedia(null)}
              className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Back to recommendations"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
          )}
          <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {previewMedia ? 'Media Preview' : 'AI Recommendations'}
          </span>
        </div>
      }
      subtitle={previewMedia ? undefined : "Tailored movies & series based on your watchlist"}
      footer={
        <>
          <button
            onClick={onClose}
            className="btn-secondary text-sm px-6 py-2.5"
          >
            Close
          </button>
          <button
            onClick={() => {
              if (items && items.length >= 10) {
                handleGenerate(items);
              }
            }}
            className="btn-primary text-sm px-6 py-2.5 flex items-center gap-2"
            disabled={isLoading || !items || items.length < 10}
          >
            {isLoading && (
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            <span>{isLoading ? 'Generating...' : 'Regenerate'}</span>
          </button>
        </>
      }
    >
      <div className="p-1">
        {previewMedia ? (
          // Preview mode
          <div className="space-y-4">
            {loadingPreview ? (
              <div className="flex flex-col items-center justify-center p-8">
                <svg className="animate-spin h-12 w-12 text-red-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-slate-600 dark:text-slate-300 font-medium">Loading preview...</p>
              </div>
            ) : previewMedia.details ? (
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Poster */}
                <div className="lg:w-1/3 flex-shrink-0">
                  {previewMedia.details.poster_path ? (
                    <img
                      src={getMoviePosterUrl(previewMedia.details.poster_path, 'w500') ?? undefined}
                      alt={isMovieDetails(previewMedia.details) ? previewMedia.details.title : previewMedia.details.name}
                      className="w-full h-auto rounded-2xl shadow-lg object-cover"
                    />
                  ) : (
                    <div className="w-full h-64 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500">
                      No Poster
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="lg:w-2/3 space-y-4">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                      {isMovieDetails(previewMedia.details) ? previewMedia.details.title : previewMedia.details.name}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-slate-600 dark:text-slate-300">
                      <span className="flex items-center text-amber-400 font-semibold">
                        <StarIcon className="w-4 h-4 mr-1 text-amber-400 fill-amber-400" />
                        {previewMedia.details.vote_average.toFixed(1)}
                      </span>
                      <span>
                        {isMovieDetails(previewMedia.details) 
                          ? previewMedia.details.release_date?.substring(0, 4)
                          : previewMedia.details.first_air_date?.substring(0, 4)}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-200/60 dark:bg-slate-800/80 rounded-lg text-xs font-semibold">
                        {previewMedia.media_type === 'movie' ? 'Movie' : 'TV Series'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">Overview</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {previewMedia.details.overview || 'No description available.'}
                    </p>
                  </div>

                  {previewMedia.details.genres && previewMedia.details.genres.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">Genres</h4>
                      <div className="flex flex-wrap gap-2">
                        {previewMedia.details.genres.map(genre => (
                          <span
                            key={genre.id}
                            className="px-2.5 py-1 text-xs rounded-lg bg-slate-200/60 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-medium"
                          >
                            {genre.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 flex flex-wrap gap-3">
                    <button
                      onClick={() => handleAddToList(previewMedia.details!.id, previewMedia.media_type)}
                      disabled={addedItems.has(previewMedia.details.id) || addingItemId === previewMedia.details.id}
                      className={`btn-primary text-sm ${
                        addedItems.has(previewMedia.details.id)
                          ? 'opacity-60 cursor-not-allowed'
                          : ''
                      }`}
                    >
                      <PlusIcon className="w-4 h-4 inline mr-1" />
                      {addedItems.has(previewMedia.details.id) ? 'Added to List' : 'Add to List'}
                    </button>

                    {(() => {
                      const imdbId = isMovieDetails(previewMedia.details!)
                        ? previewMedia.details.imdb_id
                        : (previewMedia.details.external_ids?.imdb_id ?? null);
                      const imdbUrl = imdbId
                        ? `https://www.imdb.com/title/${imdbId}/`
                        : `https://www.imdb.com/find/?q=${encodeURIComponent(isMovieDetails(previewMedia.details!) ? previewMedia.details.title : previewMedia.details.name)}`;

                      return (
                        <a
                          href={imdbUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-black font-extrabold py-2 px-4 rounded-xl text-sm transition-all shadow-md w-fit"
                        >
                          <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                          <span>View on IMDb</span>
                        </a>
                      );
                    })()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-rose-500 p-4 text-center">
                Failed to load preview details.
              </div>
            )}
          </div>
        ) : (
          // Recommendation list mode
          <div className="space-y-4">
            {(aiSummary || isGeneratingSummary) && !isLoading && !previewMedia && (
              <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
                 <div className="flex items-center gap-2 mb-2">
                   <SparklesIcon className="w-5 h-5 text-indigo-500 animate-pulse" />
                   <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">AI Curator</span>
                 </div>
                 {isGeneratingSummary ? (
                   <div className="animate-pulse space-y-2">
                      <div className="h-2 bg-indigo-400/50 rounded w-3/4"></div>
                      <div className="h-2 bg-indigo-400/50 rounded w-1/2"></div>
                   </div>
                 ) : (
                   <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                     {aiSummary}
                   </p>
                 )}
              </div>
            )}

            {isLoading ? (
              <div className="min-h-[220px] flex flex-col items-center justify-center text-center p-8 sm:p-12 w-full">
                <svg className="animate-spin h-12 w-12 text-red-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-200 text-center max-w-xs mx-auto">
                  Generating tailored recommendations...
                </p>
              </div>
            ) : error ? (
              <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-center text-sm">
                {error}
              </div>
            ) : !items || items.length < 10 ? (
              <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:amber-400 text-center text-sm">
                Add at least 10 items to your watchlist to unlock AI recommendations!
              </div>
            ) : recommendations.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">
                No recommendations found. Try regenerating!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {recommendations.map(media => {
                  const mediaKey = `tmdb:${media.media_type}:${media.id}`;
                  const isAlreadyAdded = existingMediaIds.has(mediaKey) || addedItems.has(media.id);
                  const isCurrentlyAdding = addingItemId === media.id;

                  return (
                    <div
                      key={`${media.media_type}-${media.id}`}
                      className="glass-panel rounded-2xl p-3 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                    >
                      <div className="flex space-x-3 cursor-pointer" onClick={() => handleMediaClick(media.id, media.media_type)}>
                        <div className="w-20 h-28 flex-shrink-0 bg-slate-800 rounded-xl overflow-hidden shadow-sm">
                          {media.poster_path ? (
                            <img
                              src={getMoviePosterUrl(media.poster_path, 'w185') ?? undefined}
                              alt={media.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                              No Poster
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-sm mb-1 text-slate-900 dark:text-slate-100 line-clamp-2">
                            {media.title}
                          </h3>
                          <div className="flex items-center mb-1.5 text-xs">
                            <StarIcon className="w-3.5 h-3.5 mr-1 text-amber-400 fill-amber-400" />
                            <span className="text-slate-600 dark:text-slate-300 font-semibold">
                              {media.vote_average.toFixed(1)}
                            </span>
                            <span className="text-slate-400 ml-2">
                              {media.release_date?.substring(0, 4) || 'N/A'}
                            </span>
                            <span className="text-slate-400 ml-2 text-xs">
                              {media.media_type === 'movie' ? 'Movie' : 'TV Series'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                            {media.overview || 'No description available.'}
                          </p>
                        </div>
                      </div>

                      {/* Add Button Area */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 mt-3">
                        <button
                          onClick={() => handleAddToList(media.id, media.media_type)}
                          disabled={isAlreadyAdded || isCurrentlyAdding}
                          className={`w-full flex items-center justify-center px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                            isAlreadyAdded
                              ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                              : 'btn-primary'
                          }`}
                        >
                          {isCurrentlyAdding ? (
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <PlusIcon className="h-4 w-4 mr-1" />
                          )}
                          {isAlreadyAdded ? 'Added to List' : isCurrentlyAdding ? 'Adding...' : 'Add to List'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default MediaRecommendationModal;
