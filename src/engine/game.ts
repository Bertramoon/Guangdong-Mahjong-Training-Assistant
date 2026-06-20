import type { GameState, Tile, TileType } from './types';
import { createAllTiles } from './tile';

export const RESERVED_HORSE_TILE_COUNT = 6;
import { createRNG } from './rng';
import { shuffleWall, drawInitialHands, drawTile } from './wall';
import { sortHand } from './hand';
import { canPeng, canMingGang, createPeng, createMingGang, createAnGang, createJiaGang } from './meld';

/** 逆时针顺序：南(0)→东(3)→北(2)→西(1) */
export function nextPlayerAfter(player: number): number {
  return (player + 3) % 4;
}

export function createGame(dealerIndex: number = 0, seed?: number): GameState {
  const actualSeed = seed ?? Date.now();
  const rng = createRNG(actualSeed);
  const allTiles = createAllTiles();
  const shuffled = shuffleWall(allTiles, rng);
  const { hands, remaining } = drawInitialHands(shuffled, dealerIndex);

  const ghostDraw = drawTile(remaining);
  const ghostTile = ghostDraw.tile!;
  const wall = [...ghostDraw.wall, ghostTile];

  const game: GameState = {
    wall,
    hands: hands.map(h => sortHand(h)),
    melds: [[], [], [], []],
    discards: [[], [], [], []],
    discardOrder: [],
    currentPlayer: dealerIndex,
    phase: 'draw',
    ghostType: ghostTile.type,
    ghostValue: ghostTile.value,
    turnCount: 0,
    history: [],
    lastDiscard: null,
    lastDiscardPlayer: -1,
    lastDrawSource: 'normal',
    winner: null,
    seed: actualSeed,
  };

  return game;
}

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
  const newDiscardOrder = [...game.discardOrder, { playerIndex: player, tile }];

  const nextPhase = player === 0 ? 'reaction' : 'draw';
  const nextPlayer = player === 0 ? player : nextPlayerAfter(player);

  return {
    ...game,
    hands: newHands,
    discards: newDiscards,
    discardOrder: newDiscardOrder,
    phase: nextPhase,
    currentPlayer: nextPlayer,
    lastDiscard: tile,
    lastDiscardPlayer: player,
  };
}

export function drawPhase(
  game: GameState,
  source: 'normal' | 'gang_replacement' = 'normal',
): GameState {
  if (game.phase !== 'draw') {
    throw new Error(`Cannot draw in phase: ${game.phase}`);
  }

  if (game.wall.length <= RESERVED_HORSE_TILE_COUNT) {
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
    lastDrawSource: source,
  };
}

export function checkReactions(game: GameState): number[] {
  if (game.phase !== 'reaction' || !game.lastDiscard) return [];
  const reactors: number[] = [];
  let p = nextPlayerAfter(game.lastDiscardPlayer);
  for (let i = 0; i < 3; i++) {
    const hand = game.hands[p];
    if (canPeng(hand, game.lastDiscard) || canMingGang(hand, game.lastDiscard)) {
      reactors.push(p);
    }
    p = nextPlayerAfter(p);
  }
  return reactors;
}

export function pengPhase(game: GameState, playerIndex: number): GameState {
  if (!game.lastDiscard) throw new Error('No discard to peng');
  const { hand, meld } = createPeng(game.hands[playerIndex], game.lastDiscard);
  const newHands = game.hands.map((h, i) => (i === playerIndex ? hand : [...h]));
  const newMelds = game.melds.map((m, i) => (i === playerIndex ? [...m, meld] : [...m]));
  const newDiscards = game.discards.map((d, i) =>
    i === game.lastDiscardPlayer ? d.slice(0, -1) : [...d],
  );
  const newDiscardOrder = game.discardOrder.slice(0, -1);
  return {
    ...game,
    hands: newHands,
    melds: newMelds,
    discards: newDiscards,
    discardOrder: newDiscardOrder,
    phase: 'discard',
    currentPlayer: playerIndex,
    lastDiscard: null,
    lastDiscardPlayer: -1,
  };
}

export function mingGangPhase(game: GameState, playerIndex: number): GameState {
  if (!game.lastDiscard) throw new Error('No discard to gang');
  const { hand, meld } = createMingGang(game.hands[playerIndex], game.lastDiscard);
  const gangMeld = { ...meld, source: game.lastDiscardPlayer };
  const newHands = game.hands.map((h, i) => (i === playerIndex ? hand : [...h]));
  const newMelds = game.melds.map((m, i) => (i === playerIndex ? [...m, gangMeld] : [...m]));
  const newDiscards = game.discards.map((d, i) =>
    i === game.lastDiscardPlayer ? d.slice(0, -1) : [...d],
  );
  const newDiscardOrder = game.discardOrder.slice(0, -1);
  return {
    ...game,
    hands: newHands,
    melds: newMelds,
    discards: newDiscards,
    discardOrder: newDiscardOrder,
    phase: 'draw',
    currentPlayer: playerIndex,
    lastDiscard: null,
    lastDiscardPlayer: -1,
  };
}

export function anGangPhase(game: GameState, type: TileType, value: number): GameState {
  const result = createAnGang(game.hands[game.currentPlayer], type, value);
  if (!result) throw new Error('Cannot an_gang');
  const newHands = game.hands.map((h, i) =>
    i === game.currentPlayer ? result.hand : [...h],
  );
  const newMelds = game.melds.map((m, i) =>
    i === game.currentPlayer ? [...m, result.meld] : [...m],
  );
  const { tile, wall } = drawTile(game.wall);
  const finalHands = newHands.map((h, i) =>
    i === game.currentPlayer && tile ? sortHand([...h, tile]) : [...h],
  );
  return {
    ...game,
    hands: finalHands,
    melds: newMelds,
    wall,
    phase: 'discard',
    lastDiscard: null,
    lastDrawSource: 'gang_replacement',
  };
}

/** 执行加杠（摸牌后，手中有第4张且已碰过该牌） */
export function jiaGangPhase(game: GameState, type: TileType, value: number): GameState {
  const player = game.currentPlayer;
  const result = createJiaGang(
    game.hands[player],
    game.melds[player],
    type,
    value,
  );
  if (!result) throw new Error('Cannot jia_gang');

  const newHands = game.hands.map((h, i) =>
    i === player ? result.hand : [...h],
  );
  const newMelds = game.melds.map((m, i) =>
    i === player ? result.melds : [...m],
  );

  // 加杠后补牌
  const { tile, wall } = drawTile(game.wall);
  const finalHands = newHands.map((h, i) =>
    i === player && tile ? sortHand([...h, tile]) : [...h],
  );

  return {
    ...game,
    hands: finalHands,
    melds: newMelds,
    wall,
    phase: 'discard',
    lastDiscard: null,
    lastDrawSource: 'gang_replacement',
  };
}

export function passReaction(game: GameState, _playerIndex: number): GameState {
  const nextPlayer = nextPlayerAfter(game.lastDiscardPlayer!);
  return {
    ...game,
    phase: 'draw',
    currentPlayer: nextPlayer,
    lastDiscard: null,
    lastDiscardPlayer: -1,
  };
}
