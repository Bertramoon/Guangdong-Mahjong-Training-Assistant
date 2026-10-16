import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { useGame } from '../../src/composables/useGame';
import { canPeng } from '../../src/engine/meld';
import { createTile } from '../../src/engine/tile';
import type { AppSettings } from '../../src/storage/store';
import type { Tile, TileType } from '../../src/engine/types';

const settings: AppSettings = {
  autoAnalysis: false,
  robotDifficulty: 'off',
  robotCanHu: false,
  robotOpenHand: false,
};

const t = (type: TileType, value: number, id: number): Tile => createTile(type, value, id);

/** 互不相同的孤张（无对子，避免意外可碰） */
function uniqueFillers(count: number, startId: number): Tile[] {
  const specs: [TileType, number][] = [
    ['tiao', 1], ['tiao', 2], ['tiao', 3], ['tiao', 4], ['tiao', 5], ['tiao', 6],
    ['tiao', 7], ['tiao', 8], ['tiao', 9], ['tong', 1], ['tong', 2], ['tong', 3],
  ];
  return specs.slice(0, count).map(([type, value], i) => t(type, value, startId + i));
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

describe('机器人碰/杠后打出的牌，玩家应能反应', () => {
  it('玩家出牌被机器人3碰后，机器人续打的牌玩家可碰时进入反应阶段', async () => {
    const game = useGame(ref(settings));
    game.startNewGame(42);
    const base = game.gameState.value!;

    // 玩家(0)：2×五筒 + 1×九万 + 11 张孤张；打出九万
    const playerDiscardTile = t('wan', 9, 900);
    const hands0 = [
      t('tong', 5, 0), t('tong', 5, 1),
      playerDiscardTile,
      ...uniqueFillers(11, 10),
    ];
    // 机器人3(东)：2×九万 + 11×五筒；碰九万后手牌只剩五筒，必打五筒
    const hands3 = [
      t('wan', 9, 100), t('wan', 9, 101),
      ...Array.from({ length: 11 }, (_, i) => t('tong', 5, 102 + i)),
    ];

    game.gameState.value = {
      ...base,
      hands: [hands0, base.hands[1], base.hands[2], hands3],
    };
    game.selectedTile.value = playerDiscardTile;

    game.playerDiscard();
    await sleep(150);

    const state = game.gameState.value!;
    expect(game.gameLog.value.some(m => m.includes('机器人3碰了'))).toBe(true);
    expect(game.gameLog.value.some(m => m.includes('机器人3打出'))).toBe(true);
    expect(state.phase).toBe('reaction');
    expect(state.currentPlayer).toBe(0);
    expect(state.lastDiscardPlayer).toBe(3);
    expect(state.lastDiscard && canPeng(state.hands[0], state.lastDiscard)).toBe(true);
  });

  it('对照：机器人普通出牌（无碰杠延续）玩家可碰时进入反应阶段', async () => {
    const game = useGame(ref(settings));
    const promise = game.startGameAndAutoPlay(999);
    await sleep(50); // 趁 startGameAndAutoPlay 内部 delay(300) 注入受控状态

    const base = game.gameState.value!;
    // 机器人3 直接进入出牌阶段：1×二万 + 13×八筒（必打二者之一，玩家两手都备了对子）
    const hands3 = [
      t('wan', 2, 300),
      ...Array.from({ length: 13 }, (_, i) => t('tong', 8, 301 + i)),
    ];
    const hands0 = [
      t('wan', 2, 0), t('wan', 2, 1),
      t('tong', 8, 2), t('tong', 8, 3),
      ...uniqueFillers(10, 10),
    ];
    game.gameState.value = {
      ...base,
      currentPlayer: 3,
      phase: 'discard',
      hands: [hands0, base.hands[1], base.hands[2], hands3],
    };

    await promise;

    const state = game.gameState.value!;
    expect(state.phase).toBe('reaction');
    expect(state.currentPlayer).toBe(0);
    expect(state.lastDiscardPlayer).toBe(3);
    expect(state.lastDiscard && canPeng(state.hands[0], state.lastDiscard)).toBe(true);
  });

  it('对照：机器人碰后续打的牌玩家碰不了时不进入反应阶段', async () => {
    const game = useGame(ref(settings));
    game.startNewGame(42);
    const base = game.gameState.value!;

    // 玩家(0)只有 1×五筒：机器人3 碰九万续打五筒时玩家碰不了
    const playerDiscardTile = t('wan', 9, 900);
    const hands0 = [
      t('tong', 5, 0),
      playerDiscardTile,
      ...uniqueFillers(12, 10),
    ];
    const hands3 = [
      t('wan', 9, 100), t('wan', 9, 101),
      ...Array.from({ length: 11 }, (_, i) => t('tong', 5, 102 + i)),
    ];

    game.gameState.value = {
      ...base,
      hands: [hands0, base.hands[1], base.hands[2], hands3],
    };
    game.selectedTile.value = playerDiscardTile;

    game.playerDiscard();
    await sleep(150);

    const state = game.gameState.value!;
    expect(game.gameLog.value.some(m => m.includes('机器人3打出'))).toBe(true);
    expect(state.phase).not.toBe('reaction');
    expect(state.currentPlayer).not.toBe(0);
  });
});
