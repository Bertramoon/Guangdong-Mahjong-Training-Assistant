import type { Tile, TileType } from './types';
import { FENG_NAMES, JIAN_NAMES } from './types';

const NUMBER_NAMES: Record<number, string> = {
  1: '一', 2: '二', 3: '三', 4: '四', 5: '五',
  6: '六', 7: '七', 8: '八', 9: '九',
};

export function createTile(type: TileType, value: number, id: number): Tile {
  return { type, value, id };
}

export function getTileName(t: Tile): string {
  switch (t.type) {
    case 'wan':
      return `${NUMBER_NAMES[t.value]}万`;
    case 'tiao':
      return `${NUMBER_NAMES[t.value]}条`;
    case 'tong':
      return `${NUMBER_NAMES[t.value]}筒`;
    case 'feng':
      return FENG_NAMES[t.value];
    case 'jian':
      return JIAN_NAMES[t.value];
  }
}

export function tilesEqual(a: Tile, b: Tile): boolean {
  return a.type === b.type && a.value === b.value;
}

export function createAllTiles(): Tile[] {
  const tiles: Tile[] = [];
  let id = 0;

  for (let v = 1; v <= 9; v++) {
    for (let i = 0; i < 4; i++) {
      tiles.push(createTile('wan', v, id++));
    }
  }
  for (let v = 1; v <= 9; v++) {
    for (let i = 0; i < 4; i++) {
      tiles.push(createTile('tiao', v, id++));
    }
  }
  for (let v = 1; v <= 9; v++) {
    for (let i = 0; i < 4; i++) {
      tiles.push(createTile('tong', v, id++));
    }
  }
  for (let v = 1; v <= 4; v++) {
    for (let i = 0; i < 4; i++) {
      tiles.push(createTile('feng', v, id++));
    }
  }
  for (let v = 1; v <= 3; v++) {
    for (let i = 0; i < 4; i++) {
      tiles.push(createTile('jian', v, id++));
    }
  }

  return tiles;
}

export function tileToString(t: Tile): string {
  return getTileName(t);
}
