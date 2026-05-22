import type { GameState } from './types';
import { createAllTiles } from './tile';
import { shuffleWall, drawInitialHands, drawTile } from './wall';
import { sortHand } from './hand';

export function createGame(dealerIndex: number = 0): GameState {
  const allTiles = createAllTiles();
  const shuffled = shuffleWall(allTiles);
  const { hands, remaining } = drawInitialHands(shuffled, dealerIndex);

  const ghostDraw = drawTile(remaining);
  const ghostTile = ghostDraw.tile!;
  const wall = ghostDraw.wall;

  const game: GameState = {
    wall,
    hands: hands.map(h => sortHand(h)),
    melds: [[], [], [], []],
    discards: [[], [], [], []],
    currentPlayer: dealerIndex,
    phase: 'draw',
    ghostType: ghostTile.type,
    ghostValue: ghostTile.value,
    turnCount: 0,
    history: [],
    lastDiscard: null,
    lastDiscardPlayer: -1,
    winner: null,
  };

  return game;
}
