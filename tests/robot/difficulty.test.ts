// tests/robot/difficulty.test.ts
import { describe, it, expect } from 'vitest';
import {
  SMART_PROBABILITY,
  shouldPlaySmart,
  isRobotDifficulty,
  resolveRobotDifficulty,
} from '../../src/robot/difficulty';

describe('SMART_PROBABILITY', () => {
  it('五个难度档位的概率值正确', () => {
    expect(SMART_PROBABILITY.off).toBe(0);
    expect(SMART_PROBABILITY.low).toBe(0.2);
    expect(SMART_PROBABILITY.medium).toBe(0.6);
    expect(SMART_PROBABILITY.high).toBe(0.85);
    expect(SMART_PROBABILITY.master).toBe(1);
  });
});

describe('shouldPlaySmart', () => {
  it('off 档位恒为 false', () => {
    expect(shouldPlaySmart('off', () => 0)).toBe(false);
    expect(shouldPlaySmart('off', () => 0.9999)).toBe(false);
  });

  it('master 档位恒为 true（0.9999 < 1）', () => {
    expect(shouldPlaySmart('master', () => 0)).toBe(true);
    expect(shouldPlaySmart('master', () => 0.9999)).toBe(true);
  });

  it('medium：阈值 0.6', () => {
    expect(shouldPlaySmart('medium', () => 0.5)).toBe(true);
    expect(shouldPlaySmart('medium', () => 0.7)).toBe(false);
  });

  it('low：阈值 0.2', () => {
    expect(shouldPlaySmart('low', () => 0.1)).toBe(true);
    expect(shouldPlaySmart('low', () => 0.3)).toBe(false);
  });

  it('high：阈值 0.85', () => {
    expect(shouldPlaySmart('high', () => 0.8)).toBe(true);
    expect(shouldPlaySmart('high', () => 0.9)).toBe(false);
  });

  it('off 不传 rng 时恒 false（默认 Math.random）', () => {
    for (let i = 0; i < 50; i++) {
      expect(shouldPlaySmart('off')).toBe(false);
    }
  });
});

describe('isRobotDifficulty', () => {
  it('对 5 个合法值返回 true', () => {
    expect(isRobotDifficulty('off')).toBe(true);
    expect(isRobotDifficulty('low')).toBe(true);
    expect(isRobotDifficulty('medium')).toBe(true);
    expect(isRobotDifficulty('high')).toBe(true);
    expect(isRobotDifficulty('master')).toBe(true);
  });

  it("对 'easy' / 123 / undefined 返回 false", () => {
    expect(isRobotDifficulty('easy')).toBe(false);
    expect(isRobotDifficulty(123)).toBe(false);
    expect(isRobotDifficulty(undefined)).toBe(false);
  });
});

describe('resolveRobotDifficulty', () => {
  it("合法 robotDifficulty 直接返回", () => {
    expect(resolveRobotDifficulty({ robotDifficulty: 'medium' })).toBe('medium');
  });

  it("非法 robotDifficulty 且无旧字段回落 'off'", () => {
    expect(resolveRobotDifficulty({ robotDifficulty: 'bogus' })).toBe('off');
  });

  it('robotSmartDiscard=true 映射为 master', () => {
    expect(resolveRobotDifficulty({ robotSmartDiscard: true })).toBe('master');
  });

  it('robotSmartDiscard=false 映射为 off', () => {
    expect(resolveRobotDifficulty({ robotSmartDiscard: false })).toBe('off');
  });

  it('新字段优先于旧字段', () => {
    expect(
      resolveRobotDifficulty({ robotDifficulty: 'high', robotSmartDiscard: false }),
    ).toBe('high');
  });

  it("空对象回落 'off'", () => {
    expect(resolveRobotDifficulty({})).toBe('off');
  });
});
