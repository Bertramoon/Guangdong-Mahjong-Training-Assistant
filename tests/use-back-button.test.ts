import { describe, expect, it } from 'vitest';
import { resolveBackAction } from '../src/composables/useBackButton';

describe('resolveBackAction', () => {
  it('设置弹窗打开时优先返回关闭设置', () => {
    expect(
      resolveBackAction({ settingsOpen: true, gameResultOpen: false, revealMode: true, exitArmed: true })
    ).toBe('close-settings');
  });

  it('无弹窗但处于复盘模式时返回关闭复盘', () => {
    expect(
      resolveBackAction({ settingsOpen: false, gameResultOpen: false, revealMode: true, exitArmed: false })
    ).toBe('close-reveal');
  });

  it('无弹窗且未武装时返回 arm-exit（提示再按一次）', () => {
    expect(
      resolveBackAction({ settingsOpen: false, gameResultOpen: false, revealMode: false, exitArmed: false })
    ).toBe('arm-exit');
  });

  it('武装期内第二次按下返回 exit', () => {
    expect(
      resolveBackAction({ settingsOpen: false, gameResultOpen: false, revealMode: false, exitArmed: true })
    ).toBe('exit');
  });

  it('结算弹窗打开时返回 ignore（不做任何处理）', () => {
    expect(
      resolveBackAction({ settingsOpen: false, gameResultOpen: true, revealMode: false, exitArmed: false })
    ).toBe('ignore');
  });

  it('结算弹窗优先级最高，其余状态一律 ignore', () => {
    expect(
      resolveBackAction({ settingsOpen: true, gameResultOpen: true, revealMode: true, exitArmed: true })
    ).toBe('ignore');
  });
});
