import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { useGame } from '../../src/composables/useGame';
import type { AppSettings } from '../../src/storage/store';

const settings: AppSettings = {
  autoAnalysis: false,
  robotDifficulty: 'off',
  robotCanHu: false,
  robotOpenHand: false,
};

describe('useGame', () => {
  it('机器人接庄后的新局能从庄家出牌继续推进', async () => {
    const game = useGame(ref(settings));
    game.startNewGame(123);
    game.gameState.value = { ...game.gameState.value!, phase: 'hu', winner: 1 };

    await expect(game.startGameAndAutoPlay(456)).resolves.toBeUndefined();

    expect(game.gameLog.value.some(msg => msg.startsWith('机器人1打出:'))).toBe(true);
  });
});
