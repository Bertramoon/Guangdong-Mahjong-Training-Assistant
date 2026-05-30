import type { AIProviderConfig } from '../ai/provider';

const KEYS = {
  AI_CONFIG: 'mahjong_ai_config',
  GAME_HISTORY: 'mahjong_game_history',
  SETTINGS: 'mahjong_settings',
} as const;

export interface AppSettings {
  autoAnalysis: boolean;
  soundEnabled: boolean;
  robotSmartDiscard: boolean;
  robotCanHu: boolean;
  robotOpenHand: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  autoAnalysis: false,
  soundEnabled: false,
  robotSmartDiscard: false,
  robotCanHu: false,
  robotOpenHand: false,
};

const DEFAULT_AI_CONFIG: AIProviderConfig = {
  endpoint: 'https://api.openai.com',
  apiKey: '',
  model: 'gpt-4o-mini',
};

export interface GameSummary {
  date: string;
  winner: number | null;
  turns: number;
  ghostType: string;
  ghostValue: number;
}

/** Save AI config */
export function saveAIConfig(config: AIProviderConfig): void {
  localStorage.setItem(KEYS.AI_CONFIG, JSON.stringify(config));
}

/** Load AI config (returns default if not found or parse error) */
export function loadAIConfig(): AIProviderConfig {
  const raw = localStorage.getItem(KEYS.AI_CONFIG);
  if (!raw) return { ...DEFAULT_AI_CONFIG };
  try {
    return { ...DEFAULT_AI_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_AI_CONFIG };
  }
}

/** Save app settings */
export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
}

/** Load app settings (returns default if not found) */
export function loadSettings(): AppSettings {
  const raw = localStorage.getItem(KEYS.SETTINGS);
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** Save game summary (prepend to history, max 20 entries) */
export function saveGameSummary(summary: GameSummary): void {
  const history = loadGameHistory();
  history.unshift(summary);
  localStorage.setItem(KEYS.GAME_HISTORY, JSON.stringify(history.slice(0, 20)));
}

/** Load game history */
export function loadGameHistory(): GameSummary[] {
  const raw = localStorage.getItem(KEYS.GAME_HISTORY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
