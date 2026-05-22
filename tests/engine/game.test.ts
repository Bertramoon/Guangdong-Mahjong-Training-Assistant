import { describe, it, expect } from 'vitest';
import { createGame } from '../../src/engine/game';

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
