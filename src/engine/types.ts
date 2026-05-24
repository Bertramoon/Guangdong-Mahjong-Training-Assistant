/** 牌的花色类型 */
export type TileType = 'wan' | 'tiao' | 'tong' | 'feng' | 'jian';

/** 单张牌 */
export interface Tile {
  type: TileType;
  value: number;   // 万条筒 1-9, 风 1-4 (东南西北), 箭 1-3 (中发白)
  id: number;      // 0-135 唯一标识
}

/** 副露类型 */
export type MeldType = 'peng' | 'ming_gang' | 'an_gang' | 'jia_gang';

/** 副露（碰/杠） */
export interface Meld {
  type: MeldType;
  tiles: Tile[];
  source?: number; // 明杠/碰时，来源玩家索引
}

/** 游戏阶段 */
export type GamePhase =
  | 'idle'           // 未开始
  | 'deal'           // 发牌中
  | 'draw'           // 摸牌阶段
  | 'discard'        // 出牌阶段（等待当前玩家出牌）
  | 'reaction'       // 反应阶段（等待其他玩家决定碰/杠）
  | 'hu'             // 胡牌
  | 'draw_end';      // 流局

/** 一步操作记录 */
export interface TurnRecord {
  playerIndex: number;
  action: 'draw' | 'discard' | 'peng' | 'ming_gang' | 'an_gang' | 'hu';
  tile?: Tile;
  meld?: Meld;
}

/** 弃牌记录（按实际出牌顺序） */
export interface DiscardEntry {
  playerIndex: number;
  tile: Tile;
}

/** 单局游戏状态 */
export interface GameState {
  wall: Tile[];               // 牌墙（剩余牌）
  hands: Tile[][];            // 四个玩家的手牌 [playerIndex]
  melds: Meld[][];            // 四个玩家的副露
  discards: Tile[][];         // 四个玩家的弃牌历史
  discardOrder: DiscardEntry[]; // 按实际出牌顺序的全局弃牌序列
  currentPlayer: number;      // 当前操作玩家索引 (0=玩家, 1=西, 2=北, 3=东)
  phase: GamePhase;
  ghostType: TileType;        // 鬼牌的花色
  ghostValue: number;         // 鬼牌的数值
  turnCount: number;          // 当前轮次
  history: TurnRecord[];      // 操作历史
  lastDiscard: Tile | null;   // 最近打出的一张牌（用于碰/杠判定）
  lastDiscardPlayer: number;  // 最近出牌的玩家
  winner: number | null;      // 胡牌玩家，-1 表示流局
}

/** 有效操作 */
export type ValidAction =
  | { type: 'discard'; tile: Tile }
  | { type: 'peng'; tile: Tile }
  | { type: 'ming_gang'; tile: Tile }
  | { type: 'an_gang'; tile: Tile }
  | { type: 'hu' }
  | { type: 'pass' };

/** 花色对应中文名 */
export const TILE_TYPE_NAMES: Record<TileType, string> = {
  wan: '万',
  tiao: '条',
  tong: '筒',
  feng: '风',
  jian: '箭',
};

/** 风牌数值对应名称 */
export const FENG_NAMES: Record<number, string> = {
  1: '东',
  2: '南',
  3: '西',
  4: '北',
};

/** 箭牌数值对应名称 */
export const JIAN_NAMES: Record<number, string> = {
  1: '中',
  2: '发',
  3: '白',
};
