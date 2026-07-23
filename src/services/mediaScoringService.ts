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
    const weights = { ...this.defaultOptions, ...options };

    // 1. Batch fetch keywords in parallel chunks to build dynamic candidate pool frequencies
    const samplePool = candidates.slice(0, 40);
    const candidateKeywordsMap = new Map<number, string[]>();
    const keywordDocCount: Record<string, number> = {};

    const chunkSize = 10;
    for (let i = 0; i < samplePool.length; i += chunkSize) {
      const chunk = samplePool.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map(async (candidate) => {
          try {
            const keywordData = candidate.media_type === 'movie'
              ? await tmdbService.getMovieKeywords(candidate.id)
              : await tmdbService.getTvKeywords(candidate.id);
            
            const rawKeywords = 'keywords' in keywordData ? keywordData.keywords : keywordData.results;
            const names = (rawKeywords || []).map((k: { name: string }) => k.name.toLowerCase());
            
            candidateKeywordsMap.set(candidate.id, names);

            const uniqueNames = new Set(names);
            uniqueNames.forEach(name => {
              keywordDocCount[name] = (keywordDocCount[name] || 0) + 1;
            });
          } catch (error) {
            logger.debug(`Failed to fetch keywords for ${candidate.id}:`, error);
          }
        })
      );
    }

    const totalDocs = Math.max(1, samplePool.length);

    // 2. Score candidates using dynamic Inverse Document Frequency (IDF)
    const scoredCandidates: ScoredMedia[] = [];

    for (const candidate of candidates) {
      try {
        const candidateKeywords = candidateKeywordsMap.get(candidate.id) || [];
        const score = this.calculateMediaScoreSync(
          candidate,
          candidateKeywords,
          options,
          weights,
          keywordDocCount,
          totalDocs
        );

        scoredCandidates.push({
          ...candidate,
          score
        });
      } catch (error) {
        logger.warn(`Failed to score media ${candidate.id}:`, error);
        scoredCandidates.push({
          ...candidate,
          score: candidate.popularity || 0
        });
      }
    }

    return scoredCandidates.sort((a, b) => b.score - a.score);
  }

  private calculateMediaScoreSync(
    candidate: TmdbSearchResult,
    candidateKeywords: string[],
    options: MediaScoringOptions,
    weights: Required<Omit<MediaScoringOptions, 'genreFrequency' | 'keywordFrequency'>>,
    keywordDocCount: Record<string, number>,
    totalDocs: number
  ): number {
    let score = 0;

    // Calculate genre score
    const genreScore = this.calculateGenreScore(candidate, options.genreFrequency);
    score += genreScore * weights.genreWeight;

    // Calculate dynamic TF-IDF keyword score
    const keywordScore = this.calculateDynamicKeywordScore(
      candidateKeywords,
      options.keywordFrequency,
      keywordDocCount,
      totalDocs
    );
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

  private calculateDynamicKeywordScore(
    candidateKeywords: string[],
    seedKeywordFrequency: Record<string, number>,
    keywordDocCount: Record<string, number>,
    totalDocs: number
  ): number {
    let keywordScore = 0;

    candidateKeywords.forEach((kwName) => {
      const seedFreq = seedKeywordFrequency[kwName] || seedKeywordFrequency[kwName.toLowerCase()] || 0;

      if (seedFreq > 0) {
        // Dynamic Inverse Document Frequency (IDF) Weighting:
        // Compute frequency of this keyword within the candidate pool
        const docFreq = keywordDocCount[kwName] || 1;
        const freqRatio = docFreq / totalDocs;

        // Keywords appearing in 100% of candidate items are penalized (down to 0.1x)
        // Keywords appearing in < 5% of candidate items are boosted (up to 2.0x)
        const idfMultiplier = Math.max(0.1, 2.0 - (1.9 * freqRatio));

        keywordScore += seedFreq * idfMultiplier;
      }
    });

    return keywordScore;
  }

  selectWithRouletteWheel<T extends { score: number }>(
    items: T[],
    count: number,
    temperature: number = 1.0
  ): T[] {
    if (items.length <= count) return items;

    // Normalize scores so the highest score is 1.0
    const maxScore = Math.max(...items.map(i => i.score));
    
    // Create a pool with exponential probability weights (Softmax-style)
    let pool = items.map(item => {
      const normalizedScore = maxScore > 0 ? item.score / maxScore : 0;
      return {
        item,
        // Math.exp creates a probability curve that heavily favors high scores 
        // without making lower scores impossible.
        weight: Math.exp(normalizedScore / temperature)
      };
    });

    const selected: T[] = [];
    
    for (let i = 0; i < count && pool.length > 0; i++) {
      const totalWeight = pool.reduce((sum, p) => sum + p.weight, 0);
      let randomVal = Math.random() * totalWeight;
      
      let selectedIndex = 0;
      for (let j = 0; j < pool.length; j++) {
        randomVal -= pool[j].weight;
        if (randomVal <= 0) {
          selectedIndex = j;
          break;
        }
      }
      
      selected.push(pool[selectedIndex].item);
      pool.splice(selectedIndex, 1);
    }

    return selected;
  }
}

export const mediaScoringService = new MediaScoringService();
