import type { AIProviderConfig } from '../ai/provider';
import type { RobotDifficulty } from '../robot/difficulty';
import { resolveRobotDifficulty } from '../robot/difficulty';

const KEYS = {
  AI_CONFIG: 'mahjong_ai_config',
  GAME_HISTORY: 'mahjong_game_history',
  SETTINGS: 'mahjong_settings',
} as const;

export interface AppSettings {
  autoAnalysis: boolean;
  robotDifficulty: RobotDifficulty;
  robotCanHu: boolean;
  robotOpenHand: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  autoAnalysis: false,
  robotDifficulty: 'off',
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
    const parsed = JSON.parse(raw);
    const settings: AppSettings = {
      ...DEFAULT_SETTINGS,
      ...parsed,
      robotDifficulty: resolveRobotDifficulty(parsed),
    };
    // 迁移：移除已废弃的旧字段 robotSmartDiscard
    delete (settings as { robotSmartDiscard?: unknown }).robotSmartDiscard;
    return settings;
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
