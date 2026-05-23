import type { AIProviderConfig } from './provider';
import type { GameState } from '../engine/types';
import { callAI } from './provider';
import { buildSystemPrompt, buildUserPrompt } from './prompt';

export interface AnalysisResult {
  recommendation: string;
  reasoning: string;
  alternative?: string;
  error?: string;
}

export async function analyzeGame(
  config: AIProviderConfig,
  game: GameState,
  playerIndex?: number,
): Promise<AnalysisResult> {
  const idx = playerIndex ?? game.currentPlayer;

  const response = await callAI(
    config,
    [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: buildUserPrompt(game, idx) },
    ],
    0.3,
    8192,
  );

  if (response.error) {
    return {
      recommendation: '',
      reasoning: '',
      error: response.error,
    };
  }

  // Try to parse as JSON
  try {
    const content = response.content.trim();
    // Extract JSON from possible markdown code blocks
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        recommendation: parsed.recommendation ?? '',
        reasoning: parsed.reasoning ?? '',
        alternative: parsed.alternative,
      };
    }
  } catch {
    // Fall through to raw content
  }

  return {
    recommendation: response.content,
    reasoning: '',
  };
}
