import { describe, it, expect } from 'vitest';
import { createRNG } from '../../src/engine/rng';

describe('createRNG', () => {
  it('相同种子产生相同序列', () => {
    const rng1 = createRNG(12345);
    const rng2 = createRNG(12345);
    const seq1 = Array.from({ length: 100 }, () => rng1());
    const seq2 = Array.from({ length: 100 }, () => rng2());
    expect(seq1).toEqual(seq2);
  });

  it('不同种子产生不同序列', () => {
    const rng1 = createRNG(12345);
    const rng2 = createRNG(67890);
    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());
    expect(seq1).not.toEqual(seq2);
  });

  it('返回值在 [0, 1) 范围内', () => {
    const rng = createRNG(42);
    for (let i = 0; i < 1000; i++) {
      const val = rng();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('序列在多次调用中不重复', () => {
    const rng = createRNG(99999);
    const values = new Set(Array.from({ length: 1000 }, () => rng()));
    expect(values.size).toBeGreaterThan(900);
  });
});
