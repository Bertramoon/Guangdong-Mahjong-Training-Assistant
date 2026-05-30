import { describe, it, expect } from 'vitest';
import { enumerateCounts, encodeSuitKey } from '../../src/engine/shanten-cache';

describe('enumerateCounts', () => {
  it('长度3、总和≤3 生成20种组合', () => {
    const results = enumerateCounts(3, 3);
    expect(results.length).toBe(20);
  });

  it('长度2、总和≤2 生成6种组合', () => {
    const results = enumerateCounts(2, 2);
    expect(results.length).toBe(6);
  });

  it('长度9、总和≤0 只有全零', () => {
    const results = enumerateCounts(9, 0);
    expect(results.length).toBe(1);
    expect(results[0]).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('每位置不超过4', () => {
    const results = enumerateCounts(3, 14);
    for (const counts of results) {
      for (const c of counts) {
        expect(c).toBeLessThanOrEqual(4);
      }
    }
  });

  it('所有组合总和不超过14', () => {
    const results = enumerateCounts(9, 14);
    for (const counts of results) {
      const sum = counts.reduce((a, b) => a + b, 0);
      expect(sum).toBeLessThanOrEqual(14);
    }
  });

  it('数牌枚举(长度9, 总和≤14)', () => {
    const results = enumerateCounts(9, 14);
    expect(results.length).toBe(405350);
  });

  it('风牌枚举(长度4, 总和≤14)', () => {
    const results = enumerateCounts(4, 14);
    expect(results.length).toBe(620);
  });

  it('箭牌枚举(长度3, 总和≤14)', () => {
    const results = enumerateCounts(3, 14);
    expect(results.length).toBe(125);
  });
});

describe('encodeSuitKey', () => {
  it('数牌编码', () => {
    expect(encodeSuitKey([2, 0, 1, 0, 0, 0, 0, 0, 0], true))
      .toBe('N:2,0,1,0,0,0,0,0,0');
  });

  it('字牌编码', () => {
    expect(encodeSuitKey([3, 1, 0, 0], false))
      .toBe('H:3,1,0,0');
  });

  it('相同分布不同类型产生不同 key', () => {
    const counts = [1, 1, 1];
    expect(encodeSuitKey(counts, true)).not.toBe(encodeSuitKey(counts, false));
  });
});
