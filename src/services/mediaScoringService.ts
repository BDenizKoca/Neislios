import * as tmdbService from './tmdbService';
import type { TmdbSearchResult } from './tmdbService';
import { logger } from '../utils/logger';

export interface ScoredMedia {
  id: number;
  media_type: 'movie' | 'tv';
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  genre_ids?: number[];
  popularity?: number;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  score: number;
}

export interface MediaScoringOptions {
  genreFrequency: Record<number, number>;
  keywordFrequency: Record<string, number>;
  popularityWeight?: number;
  genreWeight?: number;
  keywordWeight?: number;
}

export class MediaScoringService {
  private defaultOptions: Required<Omit<MediaScoringOptions, 'genreFrequency' | 'keywordFrequency'>> = {
    popularityWeight: 0.3,
    genreWeight: 0.4,
    keywordWeight: 0.3
  };

  async scoreMedia(
    candidates: TmdbSearchResult[],
    options: MediaScoringOptions
  ): Promise<ScoredMedia[]> {
    const scoredCandidates: ScoredMedia[] = [];
    const weights = { ...this.defaultOptions, ...options };

    for (const candidate of candidates) {
      try {
        const score = await this.calculateMediaScore(candidate, options, weights);
        scoredCandidates.push({
          ...candidate,
          score
        });
      } catch (error) {
        logger.warn(`Failed to score media ${candidate.id}:`, error);
        // Assign a base score for items that failed to score
        scoredCandidates.push({
          ...candidate,
          score: candidate.popularity || 0
        });
      }
    }

    return scoredCandidates.sort((a, b) => b.score - a.score);
  }

  private async calculateMediaScore(
    candidate: TmdbSearchResult,
    options: MediaScoringOptions,
    weights: Required<Omit<MediaScoringOptions, 'genreFrequency' | 'keywordFrequency'>>
  ): Promise<number> {
    let score = 0;

    // Calculate genre score
    const genreScore = this.calculateGenreScore(candidate, options.genreFrequency);
    score += genreScore * weights.genreWeight;

    // Calculate keyword score
    const keywordScore = await this.calculateKeywordScore(candidate, options.keywordFrequency);
    score += keywordScore * weights.keywordWeight;

    // Add popularity score (normalized)
    const popularityScore = Math.min((candidate.popularity || 0) / 100, 10);
    score += popularityScore * weights.popularityWeight;

    return score;
  }

  private calculateGenreScore(candidate: TmdbSearchResult, genreFrequency: Record<number, number>): number {
    let genreScore = 0;
    const candidateGenres = candidate.genre_ids || [];

    candidateGenres.forEach((genreId: number) => {
      if (genreFrequency[genreId]) {
        genreScore += genreFrequency[genreId];
      }
    });

    return genreScore;
  }

  private async calculateKeywordScore(
    candidate: TmdbSearchResult,
    keywordFrequency: Record<string, number>
  ): Promise<number> {
    try {
      let keywordData;
      if (candidate.media_type === 'movie') {
        keywordData = await tmdbService.getMovieKeywords(candidate.id);
      } else {
        keywordData = await tmdbService.getTvKeywords(candidate.id);
      }

      let keywordScore = 0;
      const keywords = 'keywords' in keywordData ? keywordData.keywords : keywordData.results;
      
      (keywords || []).forEach((keyword: { id: number; name: string }) => {
        if (keywordFrequency[keyword.name]) {
          keywordScore += keywordFrequency[keyword.name];
        }
      });

      return keywordScore;
    } catch (error) {
      logger.debug(`Failed to get keywords for ${candidate.media_type} ${candidate.id}:`, error);
      return 0;
    }
  }

  selectTopWithRandomness<T extends { score: number }>(
    items: T[],
    count: number,
    guaranteedRatio = 0.5
  ): T[] {
    if (items.length <= count) return items;

    const guaranteedCount = Math.ceil(count * guaranteedRatio);
    const guaranteed = items.slice(0, guaranteedCount);

    const remainingCount = count - guaranteedCount;
    const candidatePool = items.slice(guaranteedCount, Math.min(count * 2, items.length));
    const randomSelection = candidatePool
      .sort(() => Math.random() - 0.5)
      .slice(0, remainingCount);

    return [...guaranteed, ...randomSelection];
  }
}

export const mediaScoringService = new MediaScoringService();
