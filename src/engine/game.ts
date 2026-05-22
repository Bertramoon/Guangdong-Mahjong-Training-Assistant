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

import type { Tile } from './types';

export function discardPhase(game: GameState, tile: Tile): GameState {
  if (game.phase !== 'discard') {
    throw new Error(`Cannot discard in phase: ${game.phase}`);
  }

  const player = game.currentPlayer;
  const hand = game.hands[player];
  const idx = hand.findIndex(t => t.id === tile.id);
  if (idx === -1) {
    throw new Error('Tile not found in hand');
  }

  const newHand = [...hand];
  newHand.splice(idx, 1);

  const newHands = game.hands.map((h, i) => (i === player ? newHand : [...h]));
  const newDiscards = game.discards.map((d, i) =>
    i === player ? [...d, tile] : [...d],
  );

  const nextPhase = player === 0 ? 'reaction' : 'draw';

  return {
    ...game,
    hands: newHands,
    discards: newDiscards,
    phase: nextPhase,
    lastDiscard: tile,
    lastDiscardPlayer: player,
  };
}

export function drawPhase(game: GameState): GameState {
  if (game.phase !== 'draw') {
    throw new Error(`Cannot draw in phase: ${game.phase}`);
  }

  if (game.wall.length === 0) {
    return { ...game, phase: 'draw_end', winner: -1 };
  }

  const { tile, wall } = drawTile(game.wall);
  if (!tile) {
    return { ...game, phase: 'draw_end', winner: -1 };
  }

  const newHands = game.hands.map((h, i) =>
    i === game.currentPlayer ? sortHand([...h, tile]) : [...h],
  );

  return {
    ...game,
    wall,
    hands: newHands,
    phase: 'discard',
    turnCount: game.turnCount + 1,
  };
}
