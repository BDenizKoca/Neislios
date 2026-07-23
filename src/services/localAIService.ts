import { logger } from '../utils/logger';

declare global {
  interface Window {
    ai?: any;
  }
}

export class LocalAIService {
  async isSupported(): Promise<boolean> {
    if (!window.ai) return false;
    
    // Check for the modern languageModel API (Chrome 128+)
    if (window.ai.languageModel && typeof window.ai.languageModel.capabilities === 'function') {
      try {
        const capabilities = await window.ai.languageModel.capabilities();
        return capabilities.available !== 'no';
      } catch (e) {
        return false;
      }
    }
    
    // Fallback to legacy assistant API (Chrome 127)
    if (window.ai.assistant && typeof window.ai.assistant.capabilities === 'function') {
        try {
          const capabilities = await window.ai.assistant.capabilities();
          return capabilities.available !== 'no';
        } catch (e) {
            return false;
        }
    }
    
    // Fallback to older textSession API
    if (typeof window.ai.canCreateTextSession === 'function') {
      try {
        const canCreate = await window.ai.canCreateTextSession();
        return canCreate !== 'no';
      } catch (e) {
        return false;
      }
    }
    
    return false;
  }

  async generateRecommendationSummary(watchlistTitles: string[], recommendedTitles: string[]): Promise<string | null> {
    const supported = await this.isSupported();
    if (!supported) return null;

    const prompt = `I have a movie and tv watchlist containing these titles: ${watchlistTitles.join(', ')}. 
Based on those, I was recommended these titles: ${recommendedTitles.join(', ')}.
Write a brief, 2-sentence summary explaining why these recommendations fit the vibe of my watchlist. Address me directly and concisely. Do not list the movies.`;

    try {
      // Try modern languageModel API first
      if (window.ai.languageModel && typeof window.ai.languageModel.create === 'function') {
        const session = await window.ai.languageModel.create();
        const result = await session.prompt(prompt);
        return result;
      }
      
      // Try legacy assistant API
      if (window.ai.assistant && typeof window.ai.assistant.create === 'function') {
        const session = await window.ai.assistant.create();
        const result = await session.prompt(prompt);
        return result;
      }

      // Try older textSession API
      if (typeof window.ai.createTextSession === 'function') {
        const session = await window.ai.createTextSession();
        const result = await session.prompt(prompt);
        return result;
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to generate local AI summary:', error);
      return null;
    }
  }
}

export const localAIService = new LocalAIService();
