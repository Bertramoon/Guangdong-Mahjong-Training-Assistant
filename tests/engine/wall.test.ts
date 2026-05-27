import { describe, it, expect } from 'vitest';
import { createWall, shuffleWall, drawTile, drawInitialHands } from '../../src/engine/wall';
import { createAllTiles } from '../../src/engine/tile';
import { createRNG } from '../../src/engine/rng';

describe('createWall', () => {
  it('创建136张牌的牌墙', () => {
    const tiles = createAllTiles();
    const wall = createWall(tiles);
    expect(wall.length).toBe(136);
  });

  it('不修改原始牌数组', () => {
    const tiles = createAllTiles();
    const original = [...tiles];
    createWall(tiles);
    expect(tiles).toEqual(original);
  });
});

describe('shuffleWall', () => {
  it('洗牌后数量不变', () => {
    const tiles = createAllTiles();
    const wall = shuffleWall(tiles, createRNG(42));
    expect(wall.length).toBe(136);
  });

  it('洗牌后包含所有原始牌', () => {
    const tiles = createAllTiles();
    const wall = shuffleWall(tiles, createRNG(42));
    const originalIds = new Set(tiles.map(t => t.id));
    const wallIds = new Set(wall.map(t => t.id));
    expect(wallIds).toEqual(originalIds);
  });

  it('相同种子产生相同洗牌结果', () => {
    const tiles = createAllTiles();
    const wall1 = shuffleWall(tiles, createRNG(42));
    const wall2 = shuffleWall(tiles, createRNG(42));
    expect(wall1.map(t => t.id)).toEqual(wall2.map(t => t.id));
  });

  it('不同种子产生不同洗牌结果', () => {
    const tiles = createAllTiles();
    const wall1 = shuffleWall(tiles, createRNG(42));
    const wall2 = shuffleWall(tiles, createRNG(99));
    expect(wall1.map(t => t.id)).not.toEqual(wall2.map(t => t.id));
  });

  it('不修改原始牌数组', () => {
    const tiles = createAllTiles();
    const original = [...tiles];
    shuffleWall(tiles, createRNG(42));
    expect(tiles).toEqual(original);
  });
});

describe('drawTile', () => {
  it('从牌墙摸一张牌', () => {
    const tiles = createAllTiles();
    const wall = shuffleWall(tiles, createRNG(42));
    const result = drawTile(wall);
    expect(result.tile).toBeDefined();
    expect(result.wall.length).toBe(135);
  });

  it('空牌墙返回 null', () => {
    const result = drawTile([]);
    expect(result.tile).toBeNull();
    expect(result.wall.length).toBe(0);
  });
});

describe('drawInitialHands', () => {
  it('每人13张，庄家14张', () => {
    const tiles = createAllTiles();
    const wall = shuffleWall(tiles, createRNG(42));
    const { hands, remaining } = drawInitialHands(wall, 0);
    expect(hands.length).toBe(4);
    expect(hands[0].length).toBe(14); // 庄家
    expect(hands[1].length).toBe(13);
    expect(hands[2].length).toBe(13);
    expect(hands[3].length).toBe(13);
    expect(remaining.length).toBe(83); // 136 - 14 - 13*3
  });
});
