export type BackAction = 'ignore' | 'close-settings' | 'close-reveal' | 'arm-exit' | 'exit';

export interface BackState {
  settingsOpen: boolean;
  gameResultOpen: boolean;
  revealMode: boolean;
  exitArmed: boolean;
}

/** 返回键动作裁决：结算弹窗 > 设置弹窗 > 复盘模式 > 双击退出武装窗口 */
export function resolveBackAction(state: BackState): BackAction {
  if (state.gameResultOpen) return 'ignore';
  if (state.settingsOpen) return 'close-settings';
  if (state.revealMode) return 'close-reveal';
  return state.exitArmed ? 'exit' : 'arm-exit';
}
