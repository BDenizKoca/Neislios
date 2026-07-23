import { useState, useCallback } from 'react';
import * as tmdbService from '../services/tmdbService';
import type { TmdbMovieSearchResult, TmdbTvSearchResult, TmdbSearchResult } from '../services/tmdbService';
import type { WatchlistItemWithDetails } from './useWatchlistItems';
import { mediaScoringService } from '../services/mediaScoringService';

export interface MediaRecommendation {
  id: number;
  title: string;
  poster_path: string | null;
  vote_average: number;
  overview: string;
  release_date: string;
  media_type: 'movie' | 'tv';
  score: number;
}

export const useAIRecommendations = () => {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<MediaRecommendation[]>([]);
  const [error, setError] = useState<string | null>(null);

  const restoreRecommendations = useCallback((savedRecommendations: MediaRecommendation[]) => {
    setRecommendations(savedRecommendations);
    setError(null);
    setLoading(false);
  }, []);

  const generateRecommendations = useCallback(async (items: WatchlistItemWithDetails[]) => {
    const mediaItems = items
      .filter(item => item.tmdbDetails && (item.tmdbDetails.media_type === 'movie' || item.tmdbDetails.media_type === 'tv'))
      .map(item => item.tmdbDetails as tmdbService.TmdbMediaDetails);

    if (mediaItems.length < 10) {
      setError(`Need at least 10 movies/TV series in the list with details to generate recommendations. Found ${mediaItems.length}.`);
      setRecommendations([]);
      return [];
    }

    setLoading(true);
    setError(null);
    setRecommendations([]);

    try {
      const genreFrequency: Record<number, number> = {};
      const keywordFrequency: Record<string, number> = {};

      mediaItems.forEach(mediaItem => {
        (mediaItem.genre_ids || mediaItem.genres?.map(g => g.id) || []).forEach((genreId: number) => {
          genreFrequency[genreId] = (genreFrequency[genreId] || 0) + 1;
        });
      });

      const keywordPromises = mediaItems.slice(0, 15).map(mediaItem => {
        return mediaItem.media_type === 'movie'
          ? tmdbService.getMovieKeywords(mediaItem.id)
          : tmdbService.getTvKeywords(mediaItem.id);
      });
      const keywordsResults = await Promise.all(keywordPromises);

      keywordsResults.forEach(result => {
        const keywords = 'keywords' in result ? result.keywords : result.results;
        (keywords || []).forEach((keyword: { id: number; name: string }) => {
          keywordFrequency[keyword.name] = (keywordFrequency[keyword.name] || 0) + 1;
        });
      });

      const seedCount = 6 + Math.floor(Math.random() * 5);
      const seedItems = selectSeedItems(mediaItems, genreFrequency, seedCount);

      const recommendationPromises = seedItems.map(item => {
        return item.media_type === 'movie'
          ? tmdbService.getMovieRecommendations(item.id)
          : tmdbService.getTvRecommendations(item.id);
      });
      const recommendationsResults = await Promise.all(recommendationPromises);

      let candidatePool: TmdbSearchResult[] = [];
      recommendationsResults.forEach(result => {
        if (Array.isArray(result?.results)) {
          candidatePool = [...candidatePool, ...result.results];
        }
      });

      candidatePool = candidatePool.filter((item, index, self) =>
        item.id && index === self.findIndex(m => m.id === item.id && m.media_type === item.media_type)
      );

      const listItemIds = new Set(mediaItems.map(m => `${m.media_type}:${m.id}`));
      candidatePool = candidatePool.filter(item => item.id && !listItemIds.has(`${item.media_type}:${item.id}`));

      if (candidatePool.length === 0) {
        setRecommendations([]);
        setLoading(false);
        return [];
      }

      // Use dedicated mediaScoringService with random weight jitter for freshness
      const scoredCandidates = await mediaScoringService.scoreMedia(candidatePool, {
        genreFrequency,
        keywordFrequency,
        popularityWeight: 0.15 + (Math.random() * 0.3), // Jitter between 0.15 - 0.45
        genreWeight: 0.25 + (Math.random() * 0.3),      // Jitter between 0.25 - 0.55
        keywordWeight: 0.15 + (Math.random() * 0.3),    // Jitter between 0.15 - 0.45
      });

      // Softmax (Roulette Wheel) temperature 0.5 provides a great balance of relevance and discovery
      const selected = mediaScoringService.selectWithRouletteWheel(scoredCandidates, 10, 0.5);

      const finalRecommendations: MediaRecommendation[] = selected.map(c => {
        const title = c.media_type === 'movie'
          ? (c as unknown as TmdbMovieSearchResult).title || ''
          : (c as unknown as TmdbTvSearchResult).name || '';

        const releaseDate = c.media_type === 'movie'
          ? (c as unknown as TmdbMovieSearchResult).release_date || ''
          : (c as unknown as TmdbTvSearchResult).first_air_date || '';

        return {
          id: c.id,
          title,
          poster_path: c.poster_path || null,
          vote_average: c.vote_average || 0,
          overview: c.overview || '',
          release_date: releaseDate,
          media_type: c.media_type,
          score: c.score,
        };
      });

      setRecommendations(finalRecommendations);
      return finalRecommendations;
    } catch {
      setError('Failed to generate recommendations. Please try again.');
      setRecommendations([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const selectSeedItems = (
    mediaItems: tmdbService.TmdbMediaDetails[],
    genreFrequency: Record<number, number>,
    count: number
  ) => {
    const scoredItems = mediaItems.map(item => {
      let representationScore = 0;
      (item.genre_ids || item.genres?.map(g => g.id) || []).forEach((genreId: number) => {
        if (genreFrequency[genreId]) {
          representationScore += genreFrequency[genreId];
        }
      });
      return { ...item, representationScore };
    });

    const coreCount = 2;
    const recentCount = 2;
    const wildcardCount = Math.max(1, count - coreCount - recentCount);

    // 1. Core Vibe (Highest math score)
    const sortedByScore = [...scoredItems].sort((a, b) => b.representationScore - a.representationScore);
    const coreVibe = sortedByScore.slice(0, coreCount);
    const usedIds = new Set(coreVibe.map(i => i.id));

    // 2. Recent Mood (First items in the list, typically the most recently added)
    const recentMood = [];
    for (const item of scoredItems) {
      if (!usedIds.has(item.id)) {
        recentMood.push(item);
        usedIds.add(item.id);
      }
      if (recentMood.length >= recentCount) break;
    }

    // 3. True Wildcards (Completely random from the remaining watchlist)
    const remainingItems = scoredItems.filter(item => !usedIds.has(item.id));
    const wildcards = remainingItems.sort(() => Math.random() - 0.5).slice(0, wildcardCount);

    return [...coreVibe, ...recentMood, ...wildcards];
  };

  return {
    loading,
    recommendations,
    error,
    generateRecommendations,
    restoreRecommendations,
  };
};
