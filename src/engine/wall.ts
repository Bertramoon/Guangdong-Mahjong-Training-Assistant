import type { Tile } from './types';

export function createWall(tiles: Tile[]): Tile[] {
  return [...tiles];
}

export function shuffleWall(tiles: Tile[]): Tile[] {
  const wall = [...tiles];
  for (let i = wall.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [wall[i], wall[j]] = [wall[j], wall[i]];
  }
  return wall;
}

export function drawTile(wall: Tile[]): { tile: Tile | null; wall: Tile[] } {
  if (wall.length === 0) return { tile: null, wall };
  const newWall = [...wall];
  const tile = newWall.pop()!;
  return { tile, wall: newWall };
}

export function drawInitialHands(
  wall: Tile[],
  dealerIndex: number,
): { hands: Tile[][]; remaining: Tile[] } {
  let current = [...wall];
  const hands: Tile[][] = [[], [], [], []];

  for (let round = 0; round < 13; round++) {
    for (let player = 0; player < 4; player++) {
      const { tile, wall: newWall } = drawTile(current);
      current = newWall;
      hands[player].push(tile!);
    }
  }

  const { tile: dealerExtra, wall: finalWall } = drawTile(current);
  hands[dealerIndex].push(dealerExtra!);
  current = finalWall;

  return { hands, remaining: current };
}
