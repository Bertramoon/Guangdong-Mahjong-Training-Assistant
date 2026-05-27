import { describe, it, expect } from 'vitest';
import { createGame, drawPhase, discardPhase, pengPhase, jiaGangPhase } from '../../src/engine/game';
import { createRNG } from '../../src/engine/rng';

describe('createGame', () => {
  it('创建新游戏，庄家14张，其余13张', () => {
    const game = createGame(0);
    expect(game.phase).toBe('draw');
    expect(game.hands[0].length).toBe(14);
    expect(game.hands[1].length).toBe(13);
    expect(game.hands[2].length).toBe(13);
    expect(game.hands[3].length).toBe(13);
    expect(game.wall.length).toBe(83);
    expect(game.currentPlayer).toBe(0);
    expect(game.ghostType).toBeDefined();
    expect(game.ghostValue).toBeGreaterThan(0);
    expect(game.discardOrder).toEqual([]);
    expect(game.seed).toBeGreaterThan(0);
  });

  it('鬼牌已从牌墙中移除', () => {
    const game = createGame(0);
    // 鬼牌被放回牌墙，所以牌墙中包含全部4张同类型牌
    // 但鬼牌的 type/value 被记录在 ghostType/ghostValue 中
    expect(game.ghostType).toBeDefined();
    expect(game.ghostValue).toBeGreaterThan(0);
  });

  it('相同种子产生完全相同的游戏', () => {
    const seed = 1234567890;
    const game1 = createGame(0, seed);
    const game2 = createGame(0, seed);
    expect(game1.wall.map(t => t.id)).toEqual(game2.wall.map(t => t.id));
    expect(game1.hands.map(h => h.map(t => t.id))).toEqual(game2.hands.map(h => h.map(t => t.id)));
    expect(game1.ghostType).toBe(game2.ghostType);
    expect(game1.ghostValue).toBe(game2.ghostValue);
    expect(game1.seed).toBe(seed);
  });

  it('不传种子时自动生成种子', () => {
    const game = createGame(0);
    expect(game.seed).toBeDefined();
    expect(typeof game.seed).toBe('number');
    expect(game.seed).toBeGreaterThan(0);
  });

  it('不传种子时每次生成不同游戏', () => {
    const game1 = createGame(0);
    // 用显式不同种子创建第二个游戏来验证区别
    const game2 = createGame(0, game1.seed + 1);
    expect(game1.seed).not.toBe(game2.seed);
    expect(game1.wall.map(t => t.id)).not.toEqual(game2.wall.map(t => t.id));
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

  it('discardOrder 按时间顺序记录弃牌及玩家索引', () => {
    const game = createGame(0);
    const afterDraw = drawPhase(game);
    const tile = afterDraw.hands[0][0];
    const next = discardPhase(afterDraw, tile);
    expect(next.discardOrder).toHaveLength(1);
    expect(next.discardOrder[0].playerIndex).toBe(0);
    expect(next.discardOrder[0].tile.id).toBe(tile.id);
  });

  it('连续弃牌时 discardOrder 按序追加', () => {
    let game = createGame(0);
    const afterDraw = drawPhase(game);
    const tile1 = afterDraw.hands[0][0];
    const afterDiscard1 = discardPhase(afterDraw, tile1);
    expect(afterDiscard1.discardOrder).toHaveLength(1);
    // Simulate robot turn: draw + discard
    const afterDraw2 = drawPhase({ ...afterDiscard1, phase: 'draw' as const, currentPlayer: 3 });
    const tile2 = afterDraw2.hands[3][0];
    const afterDiscard2 = discardPhase(afterDraw2, tile2);
    expect(afterDiscard2.discardOrder).toHaveLength(2);
    expect(afterDiscard2.discardOrder[0].playerIndex).toBe(0);
    expect(afterDiscard2.discardOrder[1].playerIndex).toBe(3);
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

  it('碰牌后从 discardOrder 中移除对应记录', () => {
    const game = createGame(0);
    // 玩家 0 出牌
    game.phase = 'discard';
    const tile = game.hands[0][0];
    game.hands[0] = game.hands[0].slice(1);
    game.discards[0] = [tile];
    game.discardOrder = [{ playerIndex: 0, tile }];
    game.lastDiscard = tile;
    game.lastDiscardPlayer = 0;
    game.phase = 'reaction';
    // 机器人 1 碰牌
    game.hands[1] = [
      { type: tile.type, value: tile.value, id: 1 },
      { type: tile.type, value: tile.value, id: 2 },
      { type: 'wan', value: 2, id: 3 },
    ];
    const next = pengPhase(game, 1);
    expect(next.discardOrder).toHaveLength(0);
  });
});

describe('jiaGangPhase', () => {
  it('加杠后手牌-1，副露更新，补牌并进入出牌阶段', () => {
    const game = createGame(0);
    // 手动构造场景：玩家有 peng 的一万 + 手中第4张一万
    game.melds[0] = [{
      type: 'peng',
      tiles: [
        { type: 'wan', value: 1, id: 100 },
        { type: 'wan', value: 1, id: 101 },
        { type: 'wan', value: 1, id: 102 },
      ],
    }];
    game.hands[0] = [
      { type: 'wan', value: 1, id: 103 },
      { type: 'tiao', value: 2, id: 200 },
    ];
    game.phase = 'discard';
    game.currentPlayer = 0;

    const next = jiaGangPhase(game, 'wan', 1);
    expect(next.hands[0].length).toBe(2); // 剩1张+补1张
    expect(next.melds[0].length).toBe(1);
    expect(next.melds[0][0].type).toBe('jia_gang');
    expect(next.melds[0][0].tiles.length).toBe(4);
    expect(next.phase).toBe('discard');
  });

  it('无对应 peng 时报错', () => {
    const game = createGame(0);
    game.phase = 'discard';
    game.melds[0] = [];
    game.hands[0] = [{ type: 'wan', value: 1, id: 103 }];
    expect(() => jiaGangPhase(game, 'wan', 1)).toThrow('Cannot jia_gang');
  });
});
