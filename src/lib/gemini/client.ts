import { GoogleGenAI } from '@google/genai';

let geminiClient: GoogleGenAI | null = null;

/**
 * Get or create the Gemini client instance
 * Follows the lazy-loading pattern used in Azure storage clients
 */
export function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables');
    }
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiClient;
}
