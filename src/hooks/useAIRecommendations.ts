import { useState, useCallback } from 'react';
import * as tmdbService from '../services/tmdbService';
import type { TmdbMovieSearchResult } from '../services/tmdbService';
import type { WatchlistItemWithDetails } from './useWatchlistItems';

interface MovieRecommendation {
  id: number;
  title: string;
  poster_path: string | null;
  vote_average: number;
  overview: string;
  release_date: string;
  score: number; // Our calculated recommendation score
}

export const useAIRecommendations = () => {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<MovieRecommendation[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Generate recommendations based on a list of WatchlistItemWithDetails
  const generateRecommendations = useCallback(async (items: WatchlistItemWithDetails[]) => {
    // Filter out items without TMDB details or that aren't movies
    const movies = items.filter(
      item => item.tmdbDetails && item.tmdbDetails.media_type === 'movie'
    ).map(item => item.tmdbDetails as tmdbService.TmdbMovieDetails);

    if (movies.length < 10) {
      setError(`Need at least 10 movies in the list with details to generate recommendations. Found ${movies.length}.`);
      setRecommendations([]);
      return [];
    }

    setLoading(true);
    setError(null);
    setRecommendations([]);

    try {
      // Step 1: Extract list preferences (genres + keywords)
      const genreFrequency: Record<number, number> = {};
      const keywordFrequency: Record<string, number> = {};
      
      // Process all movies for genres
      movies.forEach(movie => {
        (movie.genre_ids || movie.genres?.map(g => g.id) || []).forEach((genreId: number) => {
          genreFrequency[genreId] = (genreFrequency[genreId] || 0) + 1;
        });
      });
      
      // Fetch keywords for each movie (limited to first 15 to avoid rate limiting)
      const keywordPromises = movies
        .slice(0, 15)
        .map(movie => tmdbService.getMovieKeywords(movie.id));
      
      const keywordsResults = await Promise.all(keywordPromises);
      
      // Process keywords
      keywordsResults.forEach((result) => {
        (result.keywords || []).forEach((keyword: {id: number, name: string}) => {
          keywordFrequency[keyword.name] = (keywordFrequency[keyword.name] || 0) + 1;
        });
      });

      // Step 2: Generate candidate pool from top seed movies
      const seedMovies = selectSeedMovies(movies, genreFrequency, 8);

      // Get recommendations for each seed movie
      const recommendationPromises = seedMovies.map(movie => 
        tmdbService.getMovieRecommendations(movie.id)
      );
      
      const recommendationsResults = await Promise.all(recommendationPromises);

      // Combine all recommendations and remove duplicates
      let candidatePool: TmdbMovieSearchResult[] = [];
      recommendationsResults.forEach((result) => {
        // Ensure result.results is an array before spreading
        if (Array.isArray(result?.results)) {
          candidatePool = [...candidatePool, ...result.results];
        }
      });

      // Remove duplicates by movie ID
      candidatePool = candidatePool.filter((movie, index, self) =>
        movie.id && index === self.findIndex(m => m.id === movie.id)
      );

      // Remove movies that are already in the list
      const listMovieIds = new Set(movies.map(m => m.id));
      
      candidatePool = candidatePool.filter(movie => movie.id && !listMovieIds.has(movie.id));

      if (candidatePool.length === 0) {
        setRecommendations([]);
        setLoading(false);
        return [];
      }

      // Step 3: Score candidates
      const scoredCandidates: MovieRecommendation[] = [];
      
      // Sort by popularity (descending)
      const sortedMovies = candidatePool.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
      
      // Limit to top 30 candidates by popularity for efficiency
      const topCandidates = sortedMovies.slice(0, 30);

      for (const movie of topCandidates) {
        // Start with base score
        let score = 0;
        let genreScore = 0;
        
        // Calculate genre score
        (movie.genre_ids || []).forEach((genreId: number) => {
          if (genreFrequency[genreId]) {
            genreScore += genreFrequency[genreId];
          }
        });
        
        // Get keywords for this candidate
        let keywordData;        try {
          keywordData = await tmdbService.getMovieKeywords(movie.id);
        } catch {
          keywordData = { keywords: [] };
        }
        
        let keywordScore = 0;
        
        // Calculate keyword score
        (keywordData.keywords || []).forEach((keyword: {id: number, name: string}) => {
          if (keywordFrequency[keyword.name]) {
            keywordScore += keywordFrequency[keyword.name] * 1.5;
          }
        });
        
        // Normalize popularity
        const normalizedPopularity = (movie.popularity ?? 0) / 100;
        
        // Calculate final score using the formula
        score = (
          genreScore * 1.0 +
          keywordScore * 1.5 +
          normalizedPopularity * 0.25
        );
        
        scoredCandidates.push({
          id: movie.id,
          title: movie.title,
          poster_path: movie.poster_path,
          vote_average: movie.vote_average,
          overview: movie.overview,
          release_date: movie.release_date,
          score
        });
      }

      // Sort by score (highest first) and return top results
      const finalRecommendations = scoredCandidates
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      setRecommendations(finalRecommendations);
      return finalRecommendations;    } catch {
      setError('Failed to generate recommendations. Please try again.');
      setRecommendations([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Helper function to select seed movies that best represent the list
  const selectSeedMovies = (movies: tmdbService.TmdbMovieDetails[], genreFrequency: Record<number, number>, count: number) => {
    // Score movies by how well they represent the list's genres
    const scoredMovies = movies.map(movie => {
      let representationScore = 0;
      (movie.genre_ids || movie.genres?.map(g => g.id) || []).forEach((genreId: number) => {
        if (genreFrequency[genreId]) {
          representationScore += genreFrequency[genreId];
        }
      });
      return {
        ...movie,
        representationScore
      };
    });
    
    // Sort by representation score and take the top 'count'
    return scoredMovies
      .sort((a, b) => b.representationScore - a.representationScore)
      .slice(0, count);
  };

  return {
    loading,
    recommendations,
    error,
    generateRecommendations
  };
};
