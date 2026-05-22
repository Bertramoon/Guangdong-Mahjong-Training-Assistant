import { describe, it, expect } from 'vitest';
import { createTile, tileToString, getTileName, tilesEqual, createAllTiles } from '../../src/engine/tile';

describe('createTile', () => {
  it('创建万子牌', () => {
    const t = createTile('wan', 5, 0);
    expect(t.type).toBe('wan');
    expect(t.value).toBe(5);
    expect(t.id).toBe(0);
  });

  it('创建风牌', () => {
    const t = createTile('feng', 1, 100);
    expect(t.type).toBe('feng');
    expect(t.value).toBe(1);
  });
});

describe('getTileName', () => {
  it('万子牌名称', () => {
    const t = createTile('wan', 3, 0);
    expect(getTileName(t)).toBe('三万');
  });

  it('风牌名称', () => {
    expect(getTileName(createTile('feng', 1, 0))).toBe('东');
    expect(getTileName(createTile('feng', 4, 0))).toBe('北');
  });

  it('箭牌名称', () => {
    expect(getTileName(createTile('jian', 1, 0))).toBe('中');
    expect(getTileName(createTile('jian', 3, 0))).toBe('白');
  });

  it('条子牌名称', () => {
    expect(getTileName(createTile('tiao', 9, 0))).toBe('九条');
  });
});

describe('tilesEqual', () => {
  it('相同花色相同数值的牌相等', () => {
    const a = createTile('wan', 1, 0);
    const b = createTile('wan', 1, 1);
    expect(tilesEqual(a, b)).toBe(true);
  });

  it('不同牌不相等', () => {
    const a = createTile('wan', 1, 0);
    const b = createTile('wan', 2, 0);
    expect(tilesEqual(a, b)).toBe(false);
  });
});

describe('createAllTiles', () => {
  it('创建完整136张牌', () => {
    const tiles = createAllTiles();
    expect(tiles.length).toBe(136);

    const wanTiles = tiles.filter(t => t.type === 'wan');
    expect(wanTiles.length).toBe(36);

    const fengTiles = tiles.filter(t => t.type === 'feng');
    expect(fengTiles.length).toBe(16);

    const jianTiles = tiles.filter(t => t.type === 'jian');
    expect(jianTiles.length).toBe(12);
  });

  it('所有牌 id 唯一', () => {
    const tiles = createAllTiles();
    const ids = new Set(tiles.map(t => t.id));
    expect(ids.size).toBe(136);
  });
});
