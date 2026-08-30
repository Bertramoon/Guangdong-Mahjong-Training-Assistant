import { describe, expect, it } from 'vitest';
import { computeStageScale } from '../src/composables/useStageScale';

describe('computeStageScale', () => {
  it('904×407 视口（设计分辨率）缩放恰为 1', () => {
    expect(computeStageScale(904, 407, true)).toBe(1);
  });

  it('更小视口按比例缩小（≈0.8845）', () => {
    expect(computeStageScale(800, 360, true)).toBeCloseTo(Math.min(800 / 904, 360 / 407, 1.15), 4);
  });

  it('更大视口封顶 1.15', () => {
    expect(computeStageScale(1200, 500, true)).toBe(1.15);
  });

  it('非紧凑档恒为 1', () => {
    expect(computeStageScale(904, 407, false)).toBe(1);
  });

  it('更小视口（≈0.7743）取宽高比最小值', () => {
    expect(computeStageScale(700, 330, true)).toBeCloseTo(Math.min(700 / 904, 330 / 407, 1.15), 4);
  });
});
