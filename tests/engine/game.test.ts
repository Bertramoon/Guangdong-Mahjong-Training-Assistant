import { describe, it, expect } from 'vitest';
import { createGame, drawPhase, discardPhase, pengPhase } from '../../src/engine/game';

describe('createGame', () => {
  it('创建新游戏，庄家14张，其余13张', () => {
    const game = createGame(0);
    expect(game.phase).toBe('draw');
    expect(game.hands[0].length).toBe(14);
    expect(game.hands[1].length).toBe(13);
    expect(game.hands[2].length).toBe(13);
    expect(game.hands[3].length).toBe(13);
    expect(game.wall.length).toBe(82);
    expect(game.currentPlayer).toBe(0);
    expect(game.ghostType).toBeDefined();
    expect(game.ghostValue).toBeGreaterThan(0);
  });

  it('鬼牌已从牌墙中移除', () => {
    const game = createGame(0);
    const ghostInWall = game.wall.filter(
      t => t.type === game.ghostType && t.value === game.ghostValue,
    );
    expect(ghostInWall.length).toBeLessThan(4);
  });
});

describe('drawPhase', () => {
  it('摸牌后手牌+1，进入出牌阶段', () => {
    const game = createGame(0);
    const initialLen = game.hands[0].length;
    const next = drawPhase(game);
    expect(next.hands[0].length).toBe(initialLen + 1);
    expect(next.phase).toBe('discard');
    expect(next.turnCount).toBe(1);
  });

  it('不是draw阶段不能摸牌', () => {
    const game = createGame(0);
    game.phase = 'discard';
    expect(() => drawPhase(game)).toThrow();
  });

  it('牌墙空时进入流局', () => {
    const game = createGame(0);
    game.wall = [];
    const next = drawPhase(game);
    expect(next.phase).toBe('draw_end');
    expect(next.winner).toBe(-1);
  });
});

describe('discardPhase', () => {
  it('出牌后手牌-1，进入反应阶段', () => {
    const game = createGame(0);
    const afterDraw = drawPhase(game);
    const tile = afterDraw.hands[0][0];
    const next = discardPhase(afterDraw, tile);
    expect(next.hands[0].length).toBe(afterDraw.hands[0].length - 1);
    expect(next.lastDiscard).not.toBeNull();
    expect(next.lastDiscardPlayer).toBe(0);
    expect(next.discards[0].length).toBe(1);
  });

  it('非出牌阶段不能出牌', () => {
    const game = createGame(0);
    const tile = game.hands[0][0];
    expect(() => discardPhase(game, tile)).toThrow();
  });

  it('手中没有该牌时报错', () => {
    const game = createGame(0);
    game.phase = 'discard';
    const fakeTile = { type: 'wan' as const, value: 9, id: 999 };
    expect(() => discardPhase(game, fakeTile)).toThrow();
  });
});

describe('pengPhase', () => {
  it('碰牌后手牌减少2张，副露增加，轮到碰牌者出牌', () => {
    const game = createGame(0);
    // Set up: player 0 discarded 一万, robot 1 has 2 copies
    game.phase = 'reaction';
    game.lastDiscard = { type: 'wan', value: 1, id: 100 };
    game.lastDiscardPlayer = 0;
    game.hands[1] = [
      { type: 'wan', value: 1, id: 1 },
      { type: 'wan', value: 1, id: 2 },
      { type: 'wan', value: 2, id: 3 },
    ];
    const next = pengPhase(game, 1);
    expect(next.hands[1].length).toBe(1);  // only 二万 left
    expect(next.melds[1].length).toBe(1);
    expect(next.melds[1][0].type).toBe('peng');
    expect(next.phase).toBe('discard');
    expect(next.currentPlayer).toBe(1);
  });
});
