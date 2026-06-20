export type RobotDifficulty = 'off' | 'low' | 'medium' | 'high' | 'master';

/** 每档难度"本回合走智能出牌"的概率。off=纯启发式，master=恒智能。 */
export const SMART_PROBABILITY: Record<RobotDifficulty, number> = {
  off: 0,
  low: 0.2,
  medium: 0.6,
  high: 0.85,
  master: 1,
};

/** 本回合是否走智能出牌。注入 rng 仅为可测（默认 Math.random）。 */
export function shouldPlaySmart(
  d: RobotDifficulty,
  rng: () => number = Math.random,
): boolean {
  return rng() < SMART_PROBABILITY[d];
}

const VALID_DIFFICULTIES: RobotDifficulty[] = ['off', 'low', 'medium', 'high', 'master'];

export function isRobotDifficulty(v: unknown): v is RobotDifficulty {
  return typeof v === 'string' && (VALID_DIFFICULTIES as string[]).includes(v);
}

/**
 * 从已保存的设置对象解析难度：
 * 1. 优先取合法的 robotDifficulty；
 * 2. 否则用旧字段 robotSmartDiscard（boolean）映射 true->'master' / false->'off'；
 * 3. 都没有或非法则回落 'off'。
 */
export function resolveRobotDifficulty(saved: {
  robotDifficulty?: unknown;
  robotSmartDiscard?: unknown;
}): RobotDifficulty {
  if (isRobotDifficulty(saved.robotDifficulty)) return saved.robotDifficulty;
  if (typeof saved.robotSmartDiscard === 'boolean') {
    return saved.robotSmartDiscard ? 'master' : 'off';
  }
  return 'off';
}
