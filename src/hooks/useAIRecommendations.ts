import { useState, useCallback } from 'react';
import * as tmdbService from '../services/tmdbService';
import type { TmdbMovieSearchResult, TmdbTvSearchResult, TmdbSearchResult } from '../services/tmdbService';
import type { WatchlistItemWithDetails } from './useWatchlistItems';

interface MediaRecommendation {
  id: number;
  title: string;
  poster_path: string | null;
  vote_average: number;
  overview: string;
  release_date: string;
  media_type: 'movie' | 'tv';
  score: number; // Our calculated recommendation score
}

export const useAIRecommendations = () => {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<MediaRecommendation[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Generate recommendations based on a list of WatchlistItemWithDetails
  const generateRecommendations = useCallback(async (items: WatchlistItemWithDetails[]) => {
    // Filter out items without TMDB details and separate movies and TV series
    const mediaItems = items.filter(
      item => item.tmdbDetails && (item.tmdbDetails.media_type === 'movie' || item.tmdbDetails.media_type === 'tv')
    ).map(item => item.tmdbDetails as tmdbService.TmdbMediaDetails);

    if (mediaItems.length < 10) {
      setError(`Need at least 10 movies/TV series in the list with details to generate recommendations. Found ${mediaItems.length}.`);
      setRecommendations([]);
      return [];
    }

    setLoading(true);
    setError(null);
    setRecommendations([]);

    try {      // Step 1: Extract list preferences (genres + keywords)
      const genreFrequency: Record<number, number> = {};
      const keywordFrequency: Record<string, number> = {};
      
      // Process all media items for genres
      mediaItems.forEach(mediaItem => {
        (mediaItem.genre_ids || mediaItem.genres?.map(g => g.id) || []).forEach((genreId: number) => {
          genreFrequency[genreId] = (genreFrequency[genreId] || 0) + 1;
        });
      });
      
      // Fetch keywords for each media item (limited to first 15 to avoid rate limiting)
      const keywordPromises = mediaItems
        .slice(0, 15)
        .map(mediaItem => {
          if (mediaItem.media_type === 'movie') {
            return tmdbService.getMovieKeywords(mediaItem.id);
          } else {
            return tmdbService.getTvKeywords(mediaItem.id);
          }
        });      
      const keywordsResults = await Promise.all(keywordPromises);
      
      // Process keywords (different format for movies vs TV)
      keywordsResults.forEach((result) => {
        const keywords = 'keywords' in result ? result.keywords : result.results;
        (keywords || []).forEach((keyword: {id: number, name: string}) => {
          keywordFrequency[keyword.name] = (keywordFrequency[keyword.name] || 0) + 1;
        });
      });      // Step 2: Generate candidate pool from top seed media items
      // Add some randomness to seed selection (vary between 6-10 seeds)
      const seedCount = 6 + Math.floor(Math.random() * 5);
      const seedItems = selectSeedItems(mediaItems, genreFrequency, seedCount);

      // Get recommendations for each seed item
      const recommendationPromises = seedItems.map(item => {
        if (item.media_type === 'movie') {
          return tmdbService.getMovieRecommendations(item.id);
        } else {
          return tmdbService.getTvRecommendations(item.id);
        }
      });      
      const recommendationsResults = await Promise.all(recommendationPromises);

      // Combine all recommendations and remove duplicates
      let candidatePool: TmdbSearchResult[] = [];
      recommendationsResults.forEach((result) => {
        // Ensure result.results is an array before spreading
        if (Array.isArray(result?.results)) {
          candidatePool = [...candidatePool, ...result.results];
        }
      });

      // Remove duplicates by media ID and type
      candidatePool = candidatePool.filter((item, index, self) =>
        item.id && index === self.findIndex(m => m.id === item.id && m.media_type === item.media_type)
      );

      // Remove items that are already in the list
      const listItemIds = new Set(mediaItems.map(m => `${m.media_type}:${m.id}`));
      
      candidatePool = candidatePool.filter(item => item.id && !listItemIds.has(`${item.media_type}:${item.id}`));

      if (candidatePool.length === 0) {
        setRecommendations([]);
        setLoading(false);
        return [];
      }      // Step 3: Score candidates
      const scoredCandidates: MediaRecommendation[] = [];
      
      // Sort by popularity (descending)
      const sortedCandidates = candidatePool.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
        // Add randomness to candidate pool size (vary between 25-40 candidates)
      const candidatePoolSize = 25 + Math.floor(Math.random() * 16);
      const candidatesForScoring = sortedCandidates.slice(0, Math.min(candidatePoolSize, sortedCandidates.length));

      for (const candidate of candidatesForScoring) {
        // Start with base score
        let score = 0;
        let genreScore = 0;
        
        // Calculate genre score
        (candidate.genre_ids || []).forEach((genreId: number) => {
          if (genreFrequency[genreId]) {
            genreScore += genreFrequency[genreId];
          }
        });
        
        // Get keywords for this candidate
        let keywordData;
        try {
          if (candidate.media_type === 'movie') {
            keywordData = await tmdbService.getMovieKeywords(candidate.id);
          } else {
            keywordData = await tmdbService.getTvKeywords(candidate.id);
          }
        } catch {
          keywordData = candidate.media_type === 'movie' ? { keywords: [] } : { results: [] };
        }
        
        let keywordScore = 0;
        
        // Calculate keyword score (handle different formats)
        const keywords = 'keywords' in keywordData ? keywordData.keywords : keywordData.results;
        (keywords || []).forEach((keyword: {id: number, name: string}) => {
          if (keywordFrequency[keyword.name]) {
            keywordScore += keywordFrequency[keyword.name] * 1.5;
          }
        });
        
        // Normalize popularity
        const normalizedPopularity = (candidate.popularity ?? 0) / 100;
        
        // Calculate final score using the formula
        score = (
          genreScore * 1.0 +
          keywordScore * 1.5 +
          normalizedPopularity * 0.25
        );

        // Get title and release date based on media type
        const title = candidate.media_type === 'movie' 
          ? (candidate as TmdbMovieSearchResult).title 
          : (candidate as TmdbTvSearchResult).name;
        
        const releaseDate = candidate.media_type === 'movie'
          ? (candidate as TmdbMovieSearchResult).release_date
          : (candidate as TmdbTvSearchResult).first_air_date;
        
        scoredCandidates.push({
          id: candidate.id,
          title,
          poster_path: candidate.poster_path,
          vote_average: candidate.vote_average,
          overview: candidate.overview,
          release_date: releaseDate,
          media_type: candidate.media_type,
          score
        });
      }      // Sort by score (highest first) and add some randomness to final selection
      const sortedByScore = scoredCandidates.sort((a, b) => b.score - a.score);
      
      // Take top 15 candidates and add some randomness to the final 10 selection
      const topCandidates = sortedByScore.slice(0, Math.min(15, sortedByScore.length));
      
      // Always include the top 5 (most relevant)
      const guaranteedTop = topCandidates.slice(0, 5);
      
      // Randomly select 5 more from the remaining top candidates
      const remainingCandidates = topCandidates.slice(5);
      const shuffledRemaining = remainingCandidates.sort(() => Math.random() - 0.5);
      const randomSelection = shuffledRemaining.slice(0, 5);
      
      const finalRecommendations = [...guaranteedTop, ...randomSelection];

      setRecommendations(finalRecommendations);
      return finalRecommendations;} catch {
      setError('Failed to generate recommendations. Please try again.');
      setRecommendations([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);
  // Helper function to select seed media items that best represent the list
  const selectSeedItems = (mediaItems: tmdbService.TmdbMediaDetails[], genreFrequency: Record<number, number>, count: number) => {
    // Score media items by how well they represent the list's genres
    const scoredItems = mediaItems.map(item => {
      let representationScore = 0;
      (item.genre_ids || item.genres?.map(g => g.id) || []).forEach((genreId: number) => {
        if (genreFrequency[genreId]) {
          representationScore += genreFrequency[genreId];
        }
      });
      return {
        ...item,
        representationScore
      };
    });
      // Sort by representation score and add some randomness
    const sortedItems = scoredItems.sort((a, b) => b.representationScore - a.representationScore);
    
    // Take top performers but add some randomness
    // Always include the top half of requested count
    const guaranteedCount = Math.ceil(count / 2);
    const guaranteed = sortedItems.slice(0, guaranteedCount);
    
    // For the remaining slots, randomly select from the next best items
    const remainingCount = count - guaranteedCount;
    const candidatePool = sortedItems.slice(guaranteedCount, Math.min(count * 2, sortedItems.length));
    const randomSelection = candidatePool.sort(() => Math.random() - 0.5).slice(0, remainingCount);
    
    return [...guaranteed, ...randomSelection];
  };

  return {
    loading,
    recommendations,
    error,
    generateRecommendations
  };
};
