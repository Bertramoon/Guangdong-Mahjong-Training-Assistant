# 广东麻将训练助手 - 实施计划 v2

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建广东推倒胡麻将训练 Web 应用，1 真人 + 3 机器人，每步可调用 AI 分析牌局。

**Architecture:** 分 4 个阶段迭代。Phase 4 补齐引擎能力（加杠+机器人+终端模拟），Phase 5 构建核心 UI（游戏桌面+手动操作），Phase 6 实现完整对局流程（机器人自动+游戏结束），Phase 7 加入 AI 分析和存储。每个阶段独立可运行/可验证。

**Tech Stack:** Vue 3 + TypeScript + Vite + Vitest, 纯前端无后端

**前置状态:** Phase 1-3 已完成（61 个测试通过，TS 编译无错误），牌系统/手牌管理/副露/游戏状态机/胡牌判定均已实现。

---

## 阶段总览

| 阶段 | 内容 | 可运行验证方式 | 预计任务数 |
|------|------|---------------|-----------|
| Phase 4 | 加杠 + 机器人策略 + 终端模拟 | `npx vitest run` + `npx tsx scripts/simulate.ts` | 6 |
| Phase 5 | Vue UI 核心游戏桌面 + 手动出牌 | `npm run dev` 浏览器看牌桌并手动操作 | 7 |
| Phase 6 | 机器人自动流转 + 碰杠胡交互 + 对局结束 | `npm run dev` 浏览器体验完整对局 | 5 |
| Phase 7 | AI 分析面板 + localStorage 存储 + 设置 | `npm run dev` 浏览器体验完整产品 | 5 |

---

## Phase 4: 加杠 + 机器人策略 + 终端模拟

> **可运行验证:** `npx vitest run` 全部通过（预计 ~85 tests），`npx tsx scripts/simulate.ts` 输出完整对局过程

### 新增/修改文件

```
src/engine/
├── types.ts          # 修改: MeldType 新增 'jia_gang'
├── meld.ts           # 修改: 新增 canJiaGang, createJiaGang
├── game.ts           # 修改: 新增 jiaGangPhase, 修复 reaction 处理
src/robot/
├── robot.ts          # 创建: 机器人决策逻辑
├── index.ts          # 创建: 桶导出
scripts/
├── simulate.ts       # 重写: 完整终端模拟对局脚本
tests/
├── engine/
│   └── meld.test.ts  # 修改: 新增 jia_gang 测试
├── robot/
│   └── robot.test.ts # 创建: 机器人决策测试
└── integration/
    └── full-game.test.ts  # 创建: 完整对局集成测试
```

### Task 4.1: 添加加杠 (jia_gang) 支持

**Files:**
- Modify: `src/engine/types.ts:12`
- Modify: `src/engine/meld.ts`
- Modify: `tests/engine/meld.test.ts`

- [ ] **Step 1: 更新 MeldType 添加 jia_gang**

```typescript
// src/engine/types.ts 第12行修改
export type MeldType = 'peng' | 'ming_gang' | 'an_gang' | 'jia_gang';
```

- [ ] **Step 2: 编写 jia_gang 测试**

```typescript
// 追加到 tests/engine/meld.test.ts

describe('canJiaGang', () => {
  it('有 peng 且手中有第4张时可以加杠', () => {
    const hand = [createTile('wan', 1, 3)];  // 手中有第4张一万
    const melds: Meld[] = [
      { type: 'peng', tiles: [
        createTile('wan', 1, 0),
        createTile('wan', 1, 1),
        createTile('wan', 1, 2),
      ]},
    ];
    expect(canJiaGang(hand, melds)).toBe(true);
  });

  it('没有对应 peng 不能加杠', () => {
    const hand = [createTile('wan', 1, 3)];
    const melds: Meld[] = [];
    expect(canJiaGang(hand, melds)).toBe(false);
  });

  it('手中有牌但 peng 不匹配不能加杠', () => {
    const hand = [createTile('wan', 2, 3)];
    const melds: Meld[] = [
      { type: 'peng', tiles: [
        createTile('wan', 1, 0),
        createTile('wan', 1, 1),
        createTile('wan', 1, 2),
      ]},
    ];
    expect(canJiaGang(hand, melds)).toBe(false);
  });
});

describe('createJiaGang', () => {
  it('加杠后 peng 变 ming_gang，手牌-1', () => {
    const hand = [createTile('wan', 1, 3), createTile('tiao', 2, 10)];
    const melds: Meld[] = [
      { type: 'peng', tiles: [
        createTile('wan', 1, 0),
        createTile('wan', 1, 1),
        createTile('wan', 1, 2),
      ]},
    ];
    const result = createJiaGang(hand, melds, 'wan', 1);
    expect(result.hand.length).toBe(1);
    expect(result.melds.length).toBe(1);
    expect(result.melds[0].type).toBe('jia_gang');
    expect(result.melds[0].tiles.length).toBe(4);
  });
});
```

- [ ] **Step 3: 运行测试验证失败**

Run: `npx vitest run tests/engine/meld.test.ts`
Expected: 2 new tests FAIL

- [ ] **Step 4: 实现 canJiaGang 和 createJiaGang**

```typescript
// 追加到 src/engine/meld.ts

/** 检查是否可以加杠（手中有第4张，且已有 peng 的副露） */
export function canJiaGang(hand: Tile[], melds: Meld[]): boolean {
  return getJiaGangCandidates(hand, melds).length > 0;
}

/** 获取所有可加杠的候选 */
export function getJiaGangCandidates(
  hand: Tile[],
  melds: Meld[],
): { type: TileType; value: number }[] {
  const result: { type: TileType; value: number }[] = [];
  for (const meld of melds) {
    if (meld.type !== 'peng') continue;
    const t = meld.tiles[0];
    const inHand = hand.some(h => h.type === t.type && h.value === t.value);
    if (inHand) {
      result.push({ type: t.type, value: t.value });
    }
  }
  return result;
}

/** 执行加杠 */
export function createJiaGang(
  hand: Tile[],
  melds: Meld[],
  type: TileType,
  value: number,
): { hand: Tile[]; melds: Meld[] } | null {
  // 找到对应的 peng
  const meldIdx = melds.findIndex(
    m => m.type === 'peng' && m.tiles[0].type === type && m.tiles[0].value === value,
  );
  if (meldIdx === -1) return null;

  const rm = removeTile(hand, type, value);
  if (!rm) return null;

  const newMelds = [...melds];
  newMelds[meldIdx] = {
    type: 'jia_gang',
    tiles: [...melds[meldIdx].tiles, rm.removed],
  };

  return { hand: sortHand(rm.hand), melds: newMelds };
}
```

需要更新 meld.ts 顶部的 import：
```typescript
// 将第一行改为：
import type { Tile, TileType, Meld } from './types';
```

- [ ] **Step 5: 运行测试验证通过**

Run: `npx vitest run tests/engine/meld.test.ts`
Expected: all tests PASS (11 tests: 9 原有 + 2 新增)

- [ ] **Step 6: Commit**

```bash
git add src/engine/types.ts src/engine/meld.ts tests/engine/meld.test.ts
git commit -m "feat: add jia_gang (加杠) support - upgrade peng to gang"
```

### Task 4.2: 在 game.ts 中添加加杠阶段

**Files:**
- Modify: `src/engine/game.ts`
- Modify: `tests/engine/game.test.ts`

- [ ] **Step 1: 编写 jiaGangPhase 测试**

```typescript
// 追加到 tests/engine/game.test.ts

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
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest run tests/engine/game.test.ts`
Expected: 2 new tests FAIL (jiaGangPhase not defined)

- [ ] **Step 3: 实现 jiaGangPhase**

```typescript
// 追加到 src/engine/game.ts

/** 执行加杠（摸牌后，手中有第4张且已碰过该牌） */
export function jiaGangPhase(game: GameState, type: string, value: number): GameState {
  const player = game.currentPlayer;
  const result = createJiaGang(
    game.hands[player],
    game.melds[player],
    type as TileType,
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
  };
}
```

需要在 game.ts 顶部更新 import：
```typescript
// 更新 meld 的 import：
import { canPeng, canMingGang, createPeng, createMingGang, createAnGang, canJiaGang, createJiaGang } from './meld';
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npx vitest run tests/engine/game.test.ts`
Expected: all tests PASS (11 tests: 9 原有 + 2 新增)

- [ ] **Step 5: Commit**

```bash
git add src/engine/game.ts tests/engine/game.test.ts
git commit -m "feat: add jiaGangPhase to game state machine"
```

### Task 4.3: 实现机器人策略

**Files:**
- Create: `src/robot/robot.ts`
- Create: `tests/robot/robot.test.ts`

- [ ] **Step 1: 编写机器人测试**

```typescript
// tests/robot/robot.test.ts
import { describe, it, expect } from 'vitest';
import {
  robotDiscard,
  robotShouldPeng,
  robotShouldMingGang,
  robotShouldAnGang,
  robotShouldJiaGang,
  findSingles,
} from '../../src/robot/robot';
import { createTile } from '../../src/engine/tile';
import type { Tile, Meld } from '../../src/engine/types';

function h(type: Tile['type'], value: number, id: number): Tile {
  return { type, value, id };
}

describe('robotDiscard', () => {
  it('优先丢单张字牌', () => {
    const hand: Tile[] = [
      h('wan', 1, 0), h('wan', 1, 1),        // 对子一万
      h('wan', 2, 2), h('wan', 3, 3), h('wan', 4, 4), // 顺子搭
      h('feng', 1, 5),                        // 单张东风
      h('tiao', 7, 6),                        // 单张七条
    ];
    const discard = robotDiscard(hand, 'wan', 1);
    // 优先丢单张字牌(东风)
    expect(discard.type).toBe('feng');
  });

  it('优先丢单张(非字牌但无对无搭)', () => {
    const hand: Tile[] = [
      h('wan', 1, 0), h('wan', 1, 1),        // 对子一万
      h('tiao', 7, 5),                        // 单张七条
      h('tong', 3, 6),                        // 单张三筒
    ];
    const discard = robotDiscard(hand, 'wan', 1);
    // 有对子，单张七条和三筒都是孤张，任选一个
    expect(discard).toBeDefined();
    expect(['tiao', 'tong']).toContain(discard.type);
  });

  it('不丢弃鬼牌', () => {
    const hand: Tile[] = [
      h('wan', 1, 0), h('wan', 1, 1),
      h('wan', 1, 2), h('wan', 1, 3),        // 鬼牌！一万=鬼
      h('feng', 1, 5),                        // 单张东风
    ];
    const discard = robotDiscard(hand, 'wan', 1);
    expect(discard.type).not.toBe('wan');
    expect(discard.value).not.toBe(1);
  });

  it('无单张时丢双张中一张', () => {
    const hand: Tile[] = [
      h('wan', 1, 0), h('wan', 1, 1),
      h('tiao', 2, 2), h('tiao', 2, 3),
      h('tong', 5, 4), h('tong', 5, 5),
      h('feng', 1, 6), h('feng', 1, 7),
      h('jian', 3, 8), h('jian', 3, 9),
      h('wan', 7, 10), h('wan', 7, 11),
      h('tong', 9, 12),
    ];
    const discard = robotDiscard(hand, 'wan', 1);
    expect(discard).toBeDefined();
  });

  it('全是顺子搭时丢结构最弱的那张', () => {
    const hand: Tile[] = [
      h('wan', 1, 0), h('wan', 2, 1), h('wan', 3, 2),  // 顺子
      h('tiao', 4, 3), h('tiao', 5, 4), h('tiao', 6, 5), // 顺子
      h('tong', 7, 6), h('tong', 8, 7),                   // 搭子
      h('feng', 1, 8), h('feng', 1, 9),                   // 对子
      h('jian', 3, 10), h('jian', 3, 11),                 // 对子
      h('wan', 9, 12),                                     // 单张
    ];
    const discard = robotDiscard(hand, 'wan', 1);
    // 优先丢单张九万
    expect(discard.type).toBe('wan');
    expect(discard.value).toBe(9);
  });
});

describe('robotShouldPeng', () => {
  it('有2张可碰时返回true', () => {
    const hand = [h('wan', 1, 0), h('wan', 1, 1)];
    const discard = h('wan', 1, 2);
    expect(robotShouldPeng(hand, discard)).toBe(true);
  });

  it('不足2张返回false', () => {
    const hand = [h('wan', 1, 0)];
    const discard = h('wan', 1, 2);
    expect(robotShouldPeng(hand, discard)).toBe(false);
  });
});

describe('robotShouldMingGang', () => {
  it('有3张可明杠时返回true', () => {
    const hand = [h('wan', 1, 0), h('wan', 1, 1), h('wan', 1, 2)];
    const discard = h('wan', 1, 3);
    expect(robotShouldMingGang(hand, discard)).toBe(true);
  });
});

describe('robotShouldJiaGang', () => {
  it('有 peng 且手中有第4张时返回true', () => {
    const hand = [h('wan', 1, 3)];
    const melds: Meld[] = [{
      type: 'peng',
      tiles: [h('wan', 1, 0), h('wan', 1, 1), h('wan', 1, 2)],
    }];
    expect(robotShouldJiaGang(hand, melds)).toBe(true);
  });
});
```

需要更新测试文件顶部的 import：
```typescript
import type { Meld } from '../../src/engine/types';
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest run tests/robot/robot.test.ts`
Expected: FAIL (文件不存在)

- [ ] **Step 3: 实现机器人策略**

```typescript
// src/robot/robot.ts
import type { Tile, TileType, Meld } from '../engine/types';
import { canPeng, canMingGang, canAnGang, canJiaGang } from '../engine/meld';

/**
 * 机器人选择一张手牌丢弃
 *
 * 策略（由优到劣）：
 * 1. 保留鬼牌（绝不丢弃）
 * 2. 优先丢弃字牌孤张（不成对不成搭的风/箭）
 * 3. 丢弃非字牌孤张
 * 4. 无孤张时，丢弃双张中一张（优先丢价值低的）
 * 5. 极端情况：随机丢一张非鬼牌
 */
export function robotDiscard(hand: Tile[], ghostType: TileType, ghostValue: number): Tile {
  const singles = findSingles(hand);

  // 过滤掉鬼牌（绝不丢弃）
  const nonGhostSingles = singles.filter(
    t => !(t.type === ghostType && t.value === ghostValue),
  );

  if (nonGhostSingles.length > 0) {
    // 优先丢弃字牌孤张
    const honorSingles = nonGhostSingles.filter(
      t => t.type === 'feng' || t.type === 'jian',
    );
    if (honorSingles.length > 0) {
      return honorSingles[0];
    }
    // 丢弃孤张（选择偏大的数牌）
    nonGhostSingles.sort((a, b) => b.value - a.value);
    return nonGhostSingles[0];
  }

  // 无孤张：找双张（count=2），优先丢价值低的
  const pairs = findPairs(hand);
  const nonGhostPairs = pairs.filter(
    t => !(t.type === ghostType && t.value === ghostValue),
  );
  if (nonGhostPairs.length > 0) {
    // 优先丢字牌对子
    const honorPair = nonGhostPairs.find(
      t => t.type === 'feng' || t.type === 'jian',
    );
    if (honorPair) return honorPair;
    return nonGhostPairs[0];
  }

  // 极端情况：丢任意一张非鬼牌
  const nonGhost = hand.filter(
    t => !(t.type === ghostType && t.value === ghostValue),
  );
  return nonGhost[Math.floor(Math.random() * nonGhost.length)];
}

/**
 * 找出所有单张（不成对、不成搭）
 */
export function findSingles(hand: Tile[]): Tile[] {
  const countMap = new Map<string, number>();
  for (const t of hand) {
    const key = `${t.type}-${t.value}`;
    countMap.set(key, (countMap.get(key) || 0) + 1);
  }

  // 成对或成刻的牌
  const safeKeys = new Set<string>();
  for (const [key, count] of countMap) {
    if (count >= 2) safeKeys.add(key);
  }

  // 成顺子搭的牌（通过检查是否同时有+1和+2的同花色牌，或-1和+1）
  for (const t of hand) {
    if (t.type === 'feng' || t.type === 'jian') continue;
    const k0 = `${t.type}-${t.value}`;
    const k1 = `${t.type}-${t.value + 1}`;
    const k2 = `${t.type}-${t.value + 2}`;
    if (countMap.has(k1) && countMap.has(k2)) {
      safeKeys.add(k0);
      safeKeys.add(k1);
      safeKeys.add(k2);
    }
    // 检查中间牌
    if (t.value >= 2 && t.value <= 8) {
      const km1 = `${t.type}-${t.value - 1}`;
      const kp1 = `${t.type}-${t.value + 1}`;
      if (countMap.has(km1) && countMap.has(kp1)) {
        safeKeys.add(`${t.type}-${t.value}`);
        safeKeys.add(km1);
        safeKeys.add(kp1);
      }
    }
  }

  const singles: Tile[] = [];
  const seen = new Set<string>();
  for (const t of hand) {
    const key = `${t.type}-${t.value}`;
    if (!safeKeys.has(key) && !seen.has(key)) {
      seen.add(key);
      singles.push(t);
    }
  }
  return singles;
}

/** 找出所有双张（count=2）中的一张代表 */
function findPairs(hand: Tile[]): Tile[] {
  const countMap = new Map<string, { count: number; tile: Tile }>();
  for (const t of hand) {
    const key = `${t.type}-${t.value}`;
    if (!countMap.has(key)) countMap.set(key, { count: 0, tile: t });
    countMap.get(key)!.count++;
  }

  const pairs: Tile[] = [];
  for (const [key, info] of countMap) {
    if (info.count === 2) pairs.push(info.tile);
  }
  return pairs;
}

/** 机器人是否应该碰 */
export function robotShouldPeng(hand: Tile[], discard: Tile): boolean {
  return canPeng(hand, discard);
}

/** 机器人是否应该明杠 */
export function robotShouldMingGang(hand: Tile[], discard: Tile): boolean {
  return canMingGang(hand, discard);
}

/** 机器人是否应该暗杠 */
export function robotShouldAnGang(hand: Tile[]): boolean {
  return canAnGang(hand);
}

/** 机器人是否应该加杠 */
export function robotShouldJiaGang(hand: Tile[], melds: Meld[]): boolean {
  return canJiaGang(hand, melds);
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npx vitest run tests/robot/robot.test.ts`
Expected: all tests PASS (~9 tests)

- [ ] **Step 5: Commit**

```bash
git add src/robot/robot.ts tests/robot/robot.test.ts
git commit -m "feat: implement robot discard strategy and decision logic"
```

### Task 4.4: 创建 robot 桶导出

**Files:**
- Create: `src/robot/index.ts`

- [ ] **Step 1: 创建导出文件**

```typescript
// src/robot/index.ts
export * from './robot';
```

- [ ] **Step 2: Commit**

```bash
git add src/robot/index.ts
git commit -m "feat: add robot barrel export"
```

### Task 4.5: 终端模拟对局脚本

**Files:**
- Rewrite: `scripts/simulate.ts`

- [ ] **Step 1: 重写模拟脚本（完整对局，含加杠）**

```typescript
// scripts/simulate.ts
import { createGame, drawPhase, discardPhase, pengPhase, mingGangPhase, jiaGangPhase, checkReactions, passReaction } from '../src/engine/game';
import { isSelfHu } from '../src/engine/hu';
import { getTileName } from '../src/engine/tile';
import { robotDiscard, robotShouldPeng, robotShouldMingGang, robotShouldJiaGang } from '../src/robot/robot';
import type { GameState } from '../src/engine/types';

const LOG_DELAY_MS = 0; // 控制台无需延迟

function log(msg: string) {
  console.log(msg);
}

/** 机器人回合：摸牌→检查暗杠/加杠→检查自摸→出牌 */
function robotTurn(game: GameState): GameState {
  let g = game;
  const player = g.currentPlayer;

  log(`--- [机器人${player}] 回合开始 ---`);

  // 摸牌
  if (g.phase !== 'draw') return g;
  g = drawPhase(g);
  if (g.phase === 'draw_end') {
    log(`[机器人${player}] 牌墙空，流局`);
    return g;
  }

  // 检查加杠（手中有第4张且已碰过）
  if (robotShouldJiaGang(g.hands[player], g.melds[player])) {
    const candidates = getJiaGangCandidates(g.hands[player], g.melds[player]);
    for (const c of candidates) {
      g = jiaGangPhase(g, c.type, c.value);
      log(`[机器人${player}] 加杠: ${getTileName({ type: c.type, value: c.value, id: -1 })}`);
      // 加杠后补了牌，需要出牌
      const discard = robotDiscard(g.hands[player], g.ghostType, g.ghostValue);
      g = discardPhase(g, discard);
      log(`[机器人${player}] 出牌: ${getTileName(discard)}, 手牌${g.hands[player].length}张`);
      return g;
    }
  }

  // 检查暗杠
  if (robotShouldAnGang(g.hands[player])) {
    // 逻辑由 anGangPhase 处理，但目前没有暴露 getAnGangCandidates
    // 暂跳过暗杠检查，保留在后续优化
  }

  // 检查自摸 (机器人不胡牌，但记录)
  if (isSelfHu(g.hands[player], g.ghostType, g.ghostValue)) {
    log(`[机器人${player}] (可自摸，但机器人不胡)`);
  }

  // 出牌
  const discard = robotDiscard(g.hands[player], g.ghostType, g.ghostValue);
  g = discardPhase(g, discard);
  log(`[机器人${player}] 出牌: ${getTileName(discard)}, 手牌${g.hands[player].length}张`);

  return g;
}

/** 处理反应阶段（机器人自动碰杠） */
function handleReactions(game: GameState): GameState {
  let g = game;
  if (g.phase !== 'reaction') return g;

  const reactors = checkReactions(g);

  for (const idx of reactors) {
    if (idx === 0) continue; // 玩家不自动操作
    const hand = g.hands[idx];
    const discard = g.lastDiscard!;

    // 优先明杠
    if (robotShouldMingGang(hand, discard)) {
      log(`[机器人${idx}] 明杠: ${getTileName(discard)}`);
      g = mingGangPhase(g, idx);
      // 杠后补牌→出牌
      if (g.phase === 'draw') {
        g = drawPhase(g);
        const newDiscard = robotDiscard(g.hands[idx], g.ghostType, g.ghostValue);
        g = discardPhase(g, newDiscard);
        log(`[机器人${idx}] 杠后出牌: ${getTileName(newDiscard)}`);
      }
      return g;
    }

    // 碰牌
    if (robotShouldPeng(hand, discard)) {
      log(`[机器人${idx}] 碰: ${getTileName(discard)}`);
      g = pengPhase(g, idx);
      // 碰后出牌
      const newDiscard = robotDiscard(g.hands[idx], g.ghostType, g.ghostValue);
      g = discardPhase(g, newDiscard);
      log(`[机器人${idx}] 碰后出牌: ${getTileName(newDiscard)}`);
      return g;
    }
  }

  // 无人碰杠，过
  g = passReaction(g, 0);
  return g;
}

/** 玩家回合（简化：摸牌→自动丢第一张） */
function playerTurn(game: GameState): GameState {
  let g = game;
  const player = 0;

  log(`--- [你] 回合开始 ---`);

  if (g.phase !== 'draw') return g;
  g = drawPhase(g);
  if (g.phase === 'draw_end') {
    log('[你] 牌墙空，流局');
    return g;
  }

  // 检查自摸
  if (isSelfHu(g.hands[player], g.ghostType, g.ghostValue)) {
    log('[你] 可以自摸胡！');
    return { ...g, phase: 'hu', winner: 0 };
  }

  // 自动出第一张（模拟玩家操作）
  const discard = g.hands[player][0];
  g = discardPhase(g, discard);
  log(`[你] 打出: ${getTileName(discard)}, 手牌${g.hands[player].length}张`);

  return g;
}

// ====== 主流程 ======

function runSimulation() {
  log('=== 广东麻将训练助手 - 终端模拟对局 ===');
  log('');

  const game = createGame(0);
  log(`鬼牌指示: ${getTileName({ type: game.ghostType, value: game.ghostValue, id: -1 })}`);
  log(`牌墙剩余: ${game.wall.length} 张`);
  log('');

  // 打印4家手牌
  for (let i = 0; i < 4; i++) {
    const role = i === 0 ? '你(庄)' : `机器人${i}`;
    const hand = game.hands[i].map(t => getTileName(t)).join(' ');
    log(`${role} 手牌(${game.hands[i].length}张): ${hand}`);
  }
  log('');

  // 模拟对局
  let state = game;
  let turn = 0;
  const MAX_TURNS = 200;

  while (turn < MAX_TURNS) {
    if (state.phase === 'draw_end' || state.phase === 'hu') break;

    if (state.phase === 'reaction') {
      state = handleReactions(state);
    } else if (state.phase === 'draw') {
      if (state.currentPlayer === 0) {
        state = playerTurn(state);
      } else {
        state = robotTurn(state);
      }
    }

    turn++;
  }

  log('');
  log('=== 对局结束 ===');
  log(`总轮次: ${state.turnCount}`);
  log(`牌墙剩余: ${state.wall.length} 张`);
  if (state.winner === 0) {
    log('结果: 你胡了！');
  } else if (state.winner === -1 || state.phase === 'draw_end') {
    log('结果: 流局');
  }
  log(`你的最终手牌(${state.hands[0].length}张): ${state.hands[0].map(t => getTileName(t)).join(' ')}`);
  // 打印每家的副露
  for (let i = 0; i < 4; i++) {
    if (state.melds[i].length > 0) {
      const meldStr = state.melds[i].map(m => {
        const names = m.tiles.map(t => getTileName(t)).join('');
        return `[${m.type}]${names}`;
      }).join(' ');
      const role = i === 0 ? '你' : `机器人${i}`;
      log(`${role} 副露: ${meldStr}`);
    }
  }
}

// 需要从 meld.ts 导入 getJiaGangCandidates
import { getJiaGangCandidates } from '../src/engine/meld';

runSimulation();
```

注意：需要在 meld.ts 中导出 `getJiaGangCandidates`（当前是内部函数，需要改为 export）。

- [ ] **Step 2: 导出 getJiaGangCandidates**

```typescript
// 修改 src/engine/meld.ts 中 getJiaGangCandidates 的声明
// 将 function getJiaGangCandidates 改为 export function getJiaGangCandidates
```

- [ ] **Step 3: 运行模拟脚本**

Run: `npx tsx scripts/simulate.ts`
Expected: 看到完整的对局输出，4 家轮流摸牌出牌，直到流局或玩家胡牌。

- [ ] **Step 4: Commit**

```bash
git add scripts/simulate.ts src/engine/meld.ts
git commit -m "feat: rewrite terminal simulation with complete game flow"
```

### Task 4.6: Phase 4 完整性验证

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: all ~82 tests pass

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: 多次运行模拟验证随机性**

Run: `npx tsx scripts/simulate.ts` 运行 3 次
Expected: 每次输出不同（洗牌随机 + 机器人决策随机）

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(phase-4): add jia_gang, robot strategy, and terminal simulation"
```

**Phase 4 可交付物:** 完整的麻将引擎 + 加杠 + 机器人策略 + 终端模拟对局，~82 测试通过。

---

## Phase 5: Vue UI 核心游戏桌面 + 手动操作

> **可运行验证:** `npm run dev` 浏览器打开可看到完整麻将桌面，点击手牌可选中，点击"出牌"按钮出牌，机器人位置显示手牌背面

### UI 组件结构

```
src/
├── composables/
│   └── useGame.ts           # 创建: 游戏状态管理 composable
├── components/
│   ├── TileComponent.vue    # 创建: 单张麻将牌渲染
│   ├── PlayerHand.vue       # 创建: 玩家手牌（可选中）
│   ├── MeldArea.vue         # 创建: 副露展示
│   ├── DiscardPool.vue      # 创建: 弃牌池
│   ├── OtherPlayer.vue      # 创建: 其他玩家（3 个方位组合展示）
│   ├── GameBoard.vue        # 创建: 主游戏桌面
│   └── GameView.vue         # 创建: 对局页面（组装 GameBoard + 操作区）
├── App.vue                  # 修改: 加载 GameView
├── main.ts                  # 保留
└── style.css                # 修改: 全局样式 + 麻将桌面
```

### Task 5.1: 创建 Vue Composable (useGame)

**Files:**
- Create: `src/composables/useGame.ts`

- [ ] **Step 1: 实现 useGame Composable**

```typescript
// src/composables/useGame.ts
import { ref, computed } from 'vue';
import type { GameState, Tile, TileType, Meld } from '../engine/types';
import {
  createGame, drawPhase, discardPhase,
  pengPhase, mingGangPhase, jiaGangPhase,
  checkReactions, passReaction,
} from '../engine/game';
import { isSelfHu } from '../engine/hu';
import { getTileName } from '../engine/tile';
import { canJiaGang, getJiaGangCandidates } from '../engine/meld';

export function useGame() {
  const gameState = ref<GameState | null>(null);
  const selectedTile = ref<Tile | null>(null);
  const gameLog = ref<string[]>([]);
  const isProcessing = ref(false);

  // 玩家可选操作
  const canHu = ref(false);
  const canJiaGangNow = ref(false);
  const canAnGangNow = ref(false);
  const jiaGangOptions = ref<{ type: TileType; value: number }[]>([]);

  const currentPlayerName = computed(() => {
    if (!gameState.value) return '';
    const p = gameState.value.currentPlayer;
    return p === 0 ? '你' : `机器人${p}`;
  });

  const playerHand = computed(() => {
    if (!gameState.value) return [];
    return gameState.value.hands[0];
  });

  const playerMelds = computed(() => {
    if (!gameState.value) return [];
    return gameState.value.melds[0];
  });

  const playerDiscards = computed(() => {
    if (!gameState.value) return [];
    return gameState.value.discards[0];
  });

  const ghostName = computed(() => {
    if (!gameState.value) return '';
    return getTileName({
      type: gameState.value.ghostType,
      value: gameState.value.ghostValue,
      id: -1,
    });
  });

  function addLog(msg: string) {
    gameLog.value.push(msg);
    if (gameLog.value.length > 100) gameLog.value.shift();
  }

  function startNewGame() {
    const game = createGame(0);
    gameState.value = game;
    selectedTile.value = null;
    gameLog.value = [];
    canHu.value = false;
    canJiaGangNow.value = false;
    canAnGangNow.value = false;
    jiaGangOptions.value = [];
    addLog(`新游戏开始！鬼牌: ${getTileName({ type: game.ghostType, value: game.ghostValue, id: -1 })}`);
    updateActions(game);
  }

  function updateActions(game: GameState) {
    if (game.currentPlayer !== 0 || game.phase !== 'discard') {
      canHu.value = false;
      canJiaGangNow.value = false;
      canAnGangNow.value = false;
      jiaGangOptions.value = [];
      return;
    }
    canHu.value = isSelfHu(game.hands[0], game.ghostType, game.ghostValue);
    canAnGangNow.value = canAnGang(game.hands[0]);
    jiaGangOptions.value = getJiaGangCandidates(game.hands[0], game.melds[0]);
    canJiaGangNow.value = jiaGangOptions.value.length > 0;
  }

  function selectTile(tile: Tile) {
    if (!gameState.value || gameState.value.currentPlayer !== 0) return;
    if (gameState.value.phase !== 'discard') return;
    if (selectedTile.value?.id === tile.id) {
      selectedTile.value = null;
    } else {
      selectedTile.value = tile;
    }
  }

  function playerDiscard() {
    const game = gameState.value;
    if (!game || !selectedTile.value) return;
    if (game.currentPlayer !== 0 || game.phase !== 'discard') return;

    const tile = selectedTile.value;
    const next = discardPhase(game, tile);
    addLog(`你打出: ${getTileName(tile)}`);
    gameState.value = next;
    selectedTile.value = null;

    if (next.phase === 'reaction') {
      addLog('等待其他玩家反应...');
    }
  }

  function playerPeng() {
    const game = gameState.value;
    if (!game || !game.lastDiscard || game.phase !== 'reaction') return;
    const next = pengPhase(game, 0);
    addLog(`你碰了: ${getTileName(game.lastDiscard)}`);
    gameState.value = next;
    // 碰后进入出牌阶段
    updateActions(next);
  }

  function playerMingGang() {
    const game = gameState.value;
    if (!game || !game.lastDiscard || game.phase !== 'reaction') return;
    const next = mingGangPhase(game, 0);
    addLog(`你明杠了: ${getTileName(game.lastDiscard)}`);
    gameState.value = next;
  }

  function playerJiaGang(type: TileType, value: number) {
    const game = gameState.value;
    if (!game || game.currentPlayer !== 0) return;
    const next = jiaGangPhase(game, type, value);
    addLog(`你加杠了: ${getTileName({ type, value, id: -1 })}`);
    gameState.value = next;
    updateActions(next);
  }

  function playerPass() {
    const game = gameState.value;
    if (!game || game.phase !== 'reaction') return;
    const next = passReaction(game, 0);
    addLog('你选择过牌');
    gameState.value = next;
  }

  function playerHu() {
    const game = gameState.value;
    if (!game) return;
    // 自摸胡
    const next = { ...game, phase: 'hu' as const, winner: 0 };
    addLog('你胡了！');
    gameState.value = next;
  }

  return {
    gameState,
    selectedTile,
    gameLog,
    isProcessing,
    canHu,
    canJiaGangNow,
    canAnGangNow,
    jiaGangOptions,
    currentPlayerName,
    playerHand,
    playerMelds,
    playerDiscards,
    ghostName,
    startNewGame,
    selectTile,
    playerDiscard,
    playerPeng,
    playerMingGang,
    playerJiaGang,
    playerPass,
    playerHu,
    addLog,
  };
}
```

需要额外导入 `canAnGang`:
```typescript
import { canJiaGang, getJiaGangCandidates, canAnGang } from '../engine/meld';
```

- [ ] **Step 2: Commit**

```bash
git add src/composables/useGame.ts
git commit -m "feat: implement useGame composable for game state management"
```

### Task 5.2: 实现单张麻将牌组件 (TileComponent)

**Files:**
- Create: `src/components/TileComponent.vue`

- [ ] **Step 1: 实现 TileComponent**

```vue
<!-- src/components/TileComponent.vue -->
<template>
  <div
    class="tile"
    :class="{
      'tile--selected': selected,
      'tile--back': faceDown,
      'tile--ghost': isGhost,
      [`tile--${tile?.type}`]: tile && !faceDown,
    }"
    @click="$emit('click', tile)"
  >
    <span v-if="!faceDown && tile" class="tile__text">{{ displayName }}</span>
    <span v-else class="tile__back">🀫</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Tile, TileType } from '../engine/types';
import { getTileName } from '../engine/tile';

const props = defineProps<{
  tile: Tile | null;
  selected?: boolean;
  faceDown?: boolean;
  ghostType?: TileType;
  ghostValue?: number;
}>();

defineEmits<{
  click: [tile: Tile];
}>();

const displayName = computed(() => {
  if (!props.tile) return '';
  return getTileName(props.tile);
});

const isGhost = computed(() => {
  if (!props.tile || !props.ghostType) return false;
  return props.tile.type === props.ghostType && props.tile.value === props.ghostValue;
});
</script>

<style scoped>
.tile {
  width: 48px;
  height: 64px;
  border-radius: 6px;
  border: 1px solid #999;
  background: #fffef5;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  font-size: 14px;
  font-weight: bold;
  transition: transform 0.15s, box-shadow 0.15s;
  flex-shrink: 0;
}
.tile:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}
.tile--selected {
  transform: translateY(-12px);
  box-shadow: 0 4px 12px rgba(0,100,200,0.4);
  border-color: #0066cc;
}
.tile--back {
  background: #1a5276;
  color: #fff;
  cursor: default;
  border-color: #0d3b5e;
}
.tile--ghost {
  background: #ffe8e8;
  border-color: #ff4444;
}
.tile__text {
  line-height: 1;
}
.tile__back {
  font-size: 20px;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/TileComponent.vue
git commit -m "feat: implement tile render component with select/ghost/back states"
```

### Task 5.3: 实现玩家手牌组件 (PlayerHand)

**Files:**
- Create: `src/components/PlayerHand.vue`

- [ ] **Step 1: 实现 PlayerHand**

```vue
<!-- src/components/PlayerHand.vue -->
<template>
  <div class="player-hand">
    <div class="hand-label">{{ label }}</div>
    <div class="hand-tiles">
      <TileComponent
        v-for="tile in tiles"
        :key="tile.id"
        :tile="tile"
        :selected="selectedId === tile.id"
        :ghost-type="ghostType"
        :ghost-value="ghostValue"
        @click="onTileClick"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Tile, TileType } from '../engine/types';
import TileComponent from './TileComponent.vue';

const props = defineProps<{
  tiles: Tile[];
  label: string;
  selectedId: number | null;
  ghostType: TileType;
  ghostValue: number;
}>();

const emit = defineEmits<{
  select: [tile: Tile];
}>();

function onTileClick(tile: Tile) {
  emit('select', tile);
}
</script>

<style scoped>
.player-hand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.hand-label {
  font-size: 14px;
  color: #ccc;
}
.hand-tiles {
  display: flex;
  gap: 2px;
  padding: 8px;
  background: rgba(0,0,0,0.15);
  border-radius: 8px;
  min-height: 80px;
  align-items: center;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/PlayerHand.vue
git commit -m "feat: implement player hand component with tile selection"
```

### Task 5.4: 实现副露展示组件 (MeldArea)

**Files:**
- Create: `src/components/MeldArea.vue`

- [ ] **Step 1: 实现 MeldArea**

```vue
<!-- src/components/MeldArea.vue -->
<template>
  <div class="meld-area" v-if="melds.length > 0">
    <div
      v-for="(meld, i) in melds"
      :key="i"
      class="meld-group"
      :class="`meld--${meld.type}`"
    >
      <TileComponent
        v-for="tile in meld.tiles"
        :key="tile.id"
        :tile="tile"
        :face-down="meld.type === 'an_gang' && tile.id === meld.tiles[0].id"
        :ghost-type="ghostType"
        :ghost-value="ghostValue"
      />
<c:source>
  <span class="meld-type-label">{{ typeLabel(meld.type) }}</span>
</c:source>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Meld, TileType } from '../engine/types';
import TileComponent from './TileComponent.vue';

defineProps<{
  melds: Meld[];
  ghostType: TileType;
  ghostValue: number;
}>();

function typeLabel(type: string): string {
  const map: Record<string, string> = {
    peng: '碰',
    ming_gang: '明杠',
    an_gang: '暗杠',
    jia_gang: '加杠',
  };
  return map[type] || type;
}
</script>

<style scoped>
.meld-area {
  display: flex;
  gap: 12px;
  padding: 4px 8px;
}
.meld-group {
  display: flex;
  gap: 2px;
  align-items: flex-end;
}
.meld-type-label {
  font-size: 11px;
  color: #999;
  margin-left: 4px;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/MeldArea.vue
git commit -m "feat: implement meld display component"
```

### Task 5.5: 实现弃牌池和对手组件

**Files:**
- Create: `src/components/DiscardPool.vue`
- Create: `src/components/OtherPlayer.vue`

- [ ] **Step 1: 实现 DiscardPool**

```vue
<!-- src/components/DiscardPool.vue -->
<template>
  <div class="discard-pool">
    <div class="discard-title">弃牌池</div>
    <div class="discard-grid">
      <TileComponent
        v-for="(tile, i) in tiles"
        :key="i"
        :tile="tile"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Tile } from '../engine/types';
import TileComponent from './TileComponent.vue';

defineProps<{
  tiles: Tile[];
}>();
</script>

<style scoped>
.discard-pool {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.discard-title {
  font-size: 12px;
  color: #999;
}
.discard-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  max-width: 320px;
  justify-content: center;
}
.discard-grid .tile {
  width: 32px;
  height: 42px;
  font-size: 10px;
}
</style>
```

- [ ] **Step 2: 实现 OtherPlayer**

```vue
<!-- src/components/OtherPlayer.vue -->
<template>
  <div class="other-player" :class="`other-player--${position}`">
    <div class="other-name">{{ name }}</div>
    <div class="other-melds">
      <MeldArea :melds="melds" :ghost-type="ghostType" :ghost-value="ghostValue" />
    </div>
    <div class="other-hand">
      <TileComponent
        v-for="i in handCount"
        :key="i"
        :tile="null"
        :face-down="true"
      />
    </div>
    <div class="other-discards" v-if="discards.length > 0">
      <TileComponent
        v-for="(tile, i) in discards.slice(-6)"
        :key="i"
        :tile="tile"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Tile, Meld, TileType } from '../engine/types';
import TileComponent from './TileComponent.vue';
import MeldArea from './MeldArea.vue';

defineProps<{
  name: string;
  position: 'left' | 'top' | 'right';
  handCount: number;
  melds: Meld[];
  discards: Tile[];
  ghostType: TileType;
  ghostValue: number;
}>();
</script>

<style scoped>
.other-player {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.other-name {
  font-size: 13px;
  color: #ccc;
}
.other-hand {
  display: flex;
  gap: 1px;
}
.other-hand .tile {
  width: 28px;
  height: 38px;
  font-size: 10px;
}
.other-discards {
  display: flex;
  gap: 1px;
}
.other-discards .tile {
  width: 24px;
  height: 32px;
  font-size: 8px;
}
.other-melds {
  opacity: 0.85;
}
</style>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/DiscardPool.vue src/components/OtherPlayer.vue
git commit -m "feat: implement discard pool and other player components"
```

### Task 5.6: 实现主游戏桌面 (GameBoard)

**Files:**
- Create: `src/components/GameBoard.vue`

- [ ] **Step 1: 实现 GameBoard**

```vue
<!-- src/components/GameBoard.vue -->
<template>
  <div class="game-board">
    <!-- 上方：机器人2(北) -->
    <div class="board-top">
      <OtherPlayer
        name="机器人2(北)"
        position="top"
        :hand-count="topPlayerHandCount"
        :melds="topPlayerMelds"
        :discards="topPlayerDiscards"
        :ghost-type="ghostType"
        :ghost-value="ghostValue"
      />
    </div>

    <!-- 中间行：左 + 弃牌池 + 右 -->
    <div class="board-middle">
      <div class="board-left">
        <OtherPlayer
          name="机器人1(西)"
          position="left"
          :hand-count="leftPlayerHandCount"
          :melds="leftPlayerMelds"
          :discards="leftPlayerDiscards"
          :ghost-type="ghostType"
          :ghost-value="ghostValue"
        />
      </div>

      <div class="board-center">
        <DiscardPool :tiles="centerDiscards" />
        <div class="ghost-indicator">鬼牌: {{ ghostName }}</div>
        <div class="turn-info" v-if="turnText">{{ turnText }}</div>
      </div>

      <div class="board-right">
        <OtherPlayer
          name="机器人3(东)"
          position="right"
          :hand-count="rightPlayerHandCount"
          :melds="rightPlayerMelds"
          :discards="rightPlayerDiscards"
          :ghost-type="ghostType"
          :ghost-value="ghostValue"
        />
      </div>
    </div>

    <!-- 下方：玩家(南) -->
    <div class="board-bottom">
      <MeldArea :melds="playerMelds" :ghost-type="ghostType" :ghost-value="ghostValue" />
      <PlayerHand
        :tiles="playerHand"
        label="你的手牌"
        :selected-id="selectedTileId"
        :ghost-type="ghostType"
        :ghost-value="ghostValue"
        @select="$emit('select-tile', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Tile, Meld, TileType } from '../engine/types';
import TileComponent from './TileComponent.vue';
import PlayerHand from './PlayerHand.vue';
import MeldArea from './MeldArea.vue';
import DiscardPool from './DiscardPool.vue';
import OtherPlayer from './OtherPlayer.vue';

const props = defineProps<{
  hands: Tile[][];
  melds: Meld[][];
  discards: Tile[][];
  selectedTileId: number | null;
  ghostType: TileType;
  ghostValue: number;
  ghostName: string;
  currentPlayer: number;
  phase: string;
  turnText: string;
}>();

defineEmits<{
  'select-tile': [tile: Tile];
}>();

const playerHand = computed(() => props.hands[0]);
const playerMelds = computed(() => props.melds[0]);

const leftPlayerHandCount = computed(() => props.hands[1].length);
const topPlayerHandCount = computed(() => props.hands[2].length);
const rightPlayerHandCount = computed(() => props.hands[3].length);

const leftPlayerMelds = computed(() => props.melds[1]);
const topPlayerMelds = computed(() => props.melds[2]);
const rightPlayerMelds = computed(() => props.melds[3]);

const leftPlayerDiscards = computed(() => props.discards[1]);
const topPlayerDiscards = computed(() => props.discards[2]);
const rightPlayerDiscards = computed(() => props.discards[3]);

const centerDiscards = computed(() => {
  // 合并所有玩家的弃牌（用于弃牌池展示）
  return props.discards.flat();
});
</script>

<style scoped>
.game-board {
  width: 100%;
  max-width: 1100px;
  min-height: 700px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: radial-gradient(ellipse at center, #2d6a2d 0%, #1a4a1a 100%);
  border-radius: 16px;
}
.board-top {
  display: flex;
  justify-content: center;
}
.board-middle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex: 1;
}
.board-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.ghost-indicator {
  font-size: 14px;
  color: #ffd700;
  background: rgba(0,0,0,0.3);
  padding: 4px 12px;
  border-radius: 4px;
}
.turn-info {
  font-size: 14px;
  color: #fff;
}
.board-left, .board-right {
  display: flex;
  align-items: center;
}
.board-bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/GameBoard.vue
git commit -m "feat: implement main game board layout with 4-player positions"
```

### Task 5.7: 实现对局页面 + 更新 App.vue + 全局样式

**Files:**
- Create: `src/components/GameView.vue`
- Modify: `src/App.vue`
- Modify: `src/style.css`

- [ ] **Step 1: 实现 GameView**

```vue
<!-- src/components/GameView.vue -->
<template>
  <div class="game-view">
    <div v-if="!gameState" class="start-screen">
      <h1>广东麻将训练助手</h1>
      <button class="btn" @click="startNewGame">开始新游戏</button>
    </div>

    <div v-else class="game-container">
      <GameBoard
        :hands="gameState.hands"
        :melds="gameState.melds"
        :discards="gameState.discards"
        :selected-tile-id="selectedTile?.id ?? null"
        :ghost-type="gameState.ghostType"
        :ghost-value="gameState.ghostValue"
        :ghost-name="ghostName"
        :current-player="gameState.currentPlayer"
        :phase="gameState.phase"
        :turn-text="`轮次: ${gameState.turnCount} | 当前: ${currentPlayerName}`"
        @select-tile="selectTile"
      />

      <!-- 操作区 -->
      <div class="action-bar">
        <!-- 出牌按钮 -->
        <button
          v-if="gameState.currentPlayer === 0 && gameState.phase === 'discard'"
          class="btn btn--primary"
          :disabled="!selectedTile"
          @click="playerDiscard"
        >
          {{ selectedTile ? `出牌: ${getTileName(selectedTile)}` : '请选择手牌' }}
        </button>

        <!-- 反应按钮 -->
        <template v-if="gameState.phase === 'reaction' && gameState.lastDiscardPlayer !== 0">
          <button class="btn btn--peng" @click="playerPeng" v-if="canPeng(gameState.hands[0], gameState.lastDiscard!)">
            碰
          </button>
          <button class="btn btn--gang" @click="playerMingGang" v-if="canMingGang(gameState.hands[0], gameState.lastDiscard!)">
            明杠
          </button>
          <button class="btn btn--pass" @click="playerPass">过</button>
        </template>

        <!-- 暗杠/加杠 -->
        <template v-if="gameState.currentPlayer === 0 && gameState.phase === 'discard'">
          <button
            v-for="opt in jiaGangOptions"
            :key="`jg-${opt.type}-${opt.value}`"
            class="btn btn--gang"
            @click="playerJiaGang(opt.type, opt.value)"
          >
            加杠: {{ getTileName({ type: opt.type, value: opt.value, id: -1 }) }}
          </button>
        </template>

        <!-- 胡牌按钮 -->
        <button
          v-if="canHu"
          class="btn btn--hu"
          @click="playerHu"
        >
          自摸胡！
        </button>
      </div>

      <!-- 日志 -->
      <div class="log-panel">
        <div v-for="(msg, i) in gameLog.slice(-8)" :key="i" class="log-line">{{ msg }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGame } from '../composables/useGame';
import { getTileName } from '../engine/tile';
import { canPeng, canMingGang } from '../engine/meld';
import GameBoard from './GameBoard.vue';

const {
  gameState,
  selectedTile,
  gameLog,
  canHu,
  jiaGangOptions,
  currentPlayerName,
  ghostName,
  startNewGame,
  selectTile,
  playerDiscard,
  playerPeng,
  playerMingGang,
  playerJiaGang,
  playerPass,
  playerHu,
} = useGame();
</script>

<style scoped>
.game-view {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.start-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  margin-top: 120px;
  color: #fff;
}
.start-screen h1 {
  font-size: 32px;
}
.game-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.action-bar {
  display: flex;
  gap: 10px;
  min-height: 44px;
}
.btn {
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  font-size: 15px;
  cursor: pointer;
  transition: background 0.2s;
}
.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.btn--primary { background: #3388cc; color: #fff; }
.btn--primary:hover:not(:disabled) { background: #2277bb; }
.btn--peng { background: #cc8833; color: #fff; }
.btn--gang { background: #9933cc; color: #fff; }
.btn--hu { background: #cc3333; color: #fff; }
.btn--pass { background: #666; color: #fff; }
.log-panel {
  width: 100%;
  max-width: 600px;
  max-height: 140px;
  overflow-y: auto;
  background: rgba(0,0,0,0.4);
  border-radius: 8px;
  padding: 8px 12px;
}
.log-line {
  font-size: 13px;
  color: #ccc;
  line-height: 1.6;
}
</style>
```

- [ ] **Step 2: 更新 App.vue**

```vue
<!-- src/App.vue -->
<template>
  <GameView />
</template>

<script setup lang="ts">
import GameView from './components/GameView.vue';
</script>
```

- [ ] **Step 3: 更新全局样式**

```css
/* src/style.css - 追加到现有内容末尾或替换 */

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Microsoft YaHei', 'PingFang SC', -apple-system, sans-serif;
  background: linear-gradient(135deg, #0d2b0d 0%, #1a4a1a 50%, #0d2b0d 100%);
  min-height: 100vh;
  color: #333;
}

#app {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 20px;
}
```

- [ ] **Step 4: 运行验证**

Run: `npm run dev`
Expected: 浏览器打开显示麻将桌面，点击"开始新游戏"看到牌桌，手牌可点击选中，点击"出牌"可执行。

- [ ] **Step 5: Commit**

```bash
git add src/components/GameView.vue src/App.vue src/style.css
git commit -m "feat: implement game view with manual play and desktop layout"
```

**Phase 5 可交付物:** 可运行的 Vue 麻将桌面，玩家可以开始新局、看手牌、选牌出牌，3 个机器人位置正确展示。

---

## Phase 6: 机器人自动流转 + 碰杠胡交互 + 对局结束

> **可运行验证:** `npm run dev` 浏览器体验完整对局，机器人自动摸牌出牌，碰/杠弹出操作按钮，可胡牌结束游戏

### 新增/修改文件

```
src/composables/
├── useGame.ts           # 修改: 添加机器人自动流转逻辑
src/components/
├── ActionPanel.vue      # 创建: 碰/杠/胡/过 操作面板
├── GameResult.vue       # 创建: 对局结果展示
├── GameView.vue         # 修改: 集成机器人和结果展示
```

### Task 6.1: 在 useGame 中添加机器人自动流转

**Files:**
- Modify: `src/composables/useGame.ts`

- [ ] **Step 1: 添加机器人自动执行逻辑**

```typescript
// 追加到 useGame.ts 函数体中（return 之前）

import { robotDiscard, robotShouldPeng, robotShouldMingGang, robotShouldJiaGang } from '../robot/robot';

/** 自动执行机器人回合（带延迟） */
async function executeRobotTurn() {
  const game = gameState.value;
  if (!game || game.currentPlayer === 0) return;
  if (isProcessing.value) return;

  isProcessing.value = true;

  const player = game.currentPlayer;

  // 摸牌
  let g = await withDelay(() => {
    if (gameState.value?.phase !== 'draw') return gameState.value!;
    const next = drawPhase(gameState.value!);
    gameState.value = next;
    return next;
  });

  if (g.phase === 'draw_end') {
    addLog(`牌墙空，流局！`);
    isProcessing.value = false;
    return;
  }

  // 检查加杠
  if (g.currentPlayer === player && robotShouldJiaGang(g.hands[player], g.melds[player])) {
    g = await withDelay(() => {
      const cur = gameState.value!;
      const cands = getJiaGangCandidates(cur.hands[player], cur.melds[player]);
      if (cands.length > 0) {
        const next = jiaGangPhase(cur, cands[0].type, cands[0].value);
        gameState.value = next;
        return next;
      }
      return cur;
    });
    // 加杠后出牌
    await delay(500);
    if (g.currentPlayer === player && g.phase === 'discard') {
      const discard = robotDiscard(g.hands[player], g.ghostType, g.ghostValue);
      g = await withDelay(() => {
        const next = discardPhase(gameState.value!, discard);
        gameState.value = next;
        return next;
      });
      addLog(`[机器人${player}] 加杠后出牌: ${getTileName(discard)}`);
    }
    isProcessing.value = false;
    return;
  }

  // 出牌
  if (g.currentPlayer === player && g.phase === 'discard') {
    await delay(500);
    const discard = robotDiscard(g.hands[player], g.ghostType, g.ghostValue);
    g = await withDelay(() => {
      const next = discardPhase(gameState.value!, discard);
      gameState.value = next;
      return next;
    });
    addLog(`[机器人${player}] 出牌: ${getTileName(discard)}`);

    // 检查是否进入反应阶段
    if (g.phase === 'reaction') {
      await handleRobotReactions(g);
    }
  }

  isProcessing.value = false;
}

/** 处理反应阶段（其他机器人碰杠） */
async function handleRobotReactions(game: GameState) {
  let g = game;

  for (const idx of [1, 2, 3]) {
    if (g.phase !== 'reaction') break;
    if (idx === g.lastDiscardPlayer) continue;

    const hand = g.hands[idx];
    const discard = g.lastDiscard!;

    if (robotShouldMingGang(hand, discard)) {
      await delay(600);
      g = await withDelay(() => {
        const next = mingGangPhase(gameState.value!, idx);
        gameState.value = next;
        return next;
      });
      addLog(`[机器人${idx}] 明杠: ${getTileName(discard)}`);
      // 杠后补牌出牌
      if (g.phase === 'draw') {
        await delay(500);
        g = await withDelay(() => {
          const afterDraw = drawPhase(gameState.value!);
          gameState.value = afterDraw;
          return afterDraw;
        });
        const rbDiscard = robotDiscard(g.hands[idx], g.ghostType, g.ghostValue);
        g = await withDelay(() => {
          const next = discardPhase(gameState.value!, rbDiscard);
          gameState.value = next;
          return next;
        });
        addLog(`[机器人${idx}] 杠后出牌: ${getTileName(rbDiscard)}`);
      }
      return;
    }

    if (robotShouldPeng(hand, discard)) {
      await delay(600);
      g = await withDelay(() => {
        const next = pengPhase(gameState.value!, idx);
        gameState.value = next;
        return next;
      });
      addLog(`[机器人${idx}] 碰: ${getTileName(discard)}`);
      // 碰后出牌
      if (g.phase === 'discard') {
        await delay(500);
        const rbDiscard = robotDiscard(g.hands[idx], g.ghostType, g.ghostValue);
        g = await withDelay(() => {
          const next = discardPhase(gameState.value!, rbDiscard);
          gameState.value = next;
          return next;
        });
        addLog(`[机器人${idx}] 碰后出牌: ${getTileName(rbDiscard)}`);
      }
      return;
    }
  }

  // 无人碰杠则过牌
  if (g.phase === 'reaction') {
    g = await withDelay(() => {
      const next = passReaction(gameState.value!, 0);
      gameState.value = next;
      return next;
    });
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

async function withDelay<T>(fn: () => T): Promise<T> {
  await delay(400);
  return fn();
}

/** 开始新游戏后，如果庄家不是玩家，自动执行机器人回合 */
async function startGameAndAutoPlay() {
  startNewGame();
  await delay(800);
  await autoPlayUntilPlayer();
}

/** 自动执行直到轮到玩家 */
async function autoPlayUntilPlayer() {
  const game = gameState.value;
  if (!game) return;
  while (gameState.value &&
         gameState.value.currentPlayer !== 0 &&
         gameState.value.phase !== 'draw_end' &&
         gameState.value.phase !== 'hu') {
    await executeRobotTurn();
  }
  if (gameState.value) {
    updateActions(gameState.value);
  }
}
```

这些函数需要在 composable 的 `startNewGame` 后面追加，同时在 return 中导出 `executeRobotTurn`, `autoPlayUntilPlayer`, `startGameAndAutoPlay`。

- [ ] **Step 2: Commit**

```bash
git add src/composables/useGame.ts
git commit -m "feat: add robot auto-play with animation delays to useGame"
```

### Task 6.2: 刷新 GameView 使用新的自动流转

**Files:**
- Modify: `src/components/GameView.vue`

- [ ] **Step 1: 更新 GameView 集成机器人自动流转**

```vue
<!-- 修改 GameView.vue 的 script 部分 -->
<script setup lang="ts">
import { watch } from 'vue';
import { useGame } from '../composables/useGame';
import { getTileName } from '../engine/tile';
import { canPeng, canMingGang } from '../engine/meld';
import GameBoard from './GameBoard.vue';
import GameResult from './GameResult.vue';
import ActionPanel from './ActionPanel.vue';

const {
  gameState,
  selectedTile,
  gameLog,
  canHu,
  jiaGangOptions,
  currentPlayerName,
  ghostName,
  startGameAndAutoPlay,
  selectTile,
  playerDiscard,
  playerPeng,
  playerMingGang,
  playerJiaGang,
  playerPass,
  playerHu,
  autoPlayUntilPlayer,
} = useGame();

// 玩家出牌后，自动执行机器人回合
watch(() => gameState.value?.phase, async (phase) => {
  if (phase === 'draw' && gameState.value?.currentPlayer !== 0) {
    await autoPlayUntilPlayer();
  }
});

// 玩家碰/杠后，继续执行机器人回合
watch(() => gameState.value?.currentPlayer, async (player) => {
  if (player !== 0 &&
      gameState.value?.phase === 'draw' &&
      !useGame().isProcessing.value) {
    await autoPlayUntilPlayer();
  }
});
</script>
```

由于 `watch` 中访问 `useGame()` 会创建新实例，需要调整。实际上应该在 `useGame` composable 内部处理，或者在 `GameView` 中直接用 composable 返回的方法。

重构方案：在 `useGame` 内部添加 `watch` 来自动触发机器人流转。

```typescript
// 在 useGame.ts 中添加（需要导入 watch）
import { ref, computed, watch } from 'vue';

// 在 startNewGame 后添加
watch(
  () => gameState.value?.phase,
  async (phase) => {
    if (phase === 'draw' && gameState.value?.currentPlayer !== 0 && !isProcessing.value) {
      await executeRobotTurn();
      // 继续执行直到轮到玩家
      await autoPlayUntilPlayer();
    }
  },
);

watch(
  () => gameState.value?.currentPlayer,
  async (player) => {
    if (player !== 0 &&
        gameState.value?.phase === 'draw' &&
        !isProcessing.value) {
      await autoPlayUntilPlayer();
    }
  },
);
```

- [ ] **Step 2: Commit**

```bash
git add src/composables/useGame.ts src/components/GameView.vue
git commit -m "feat: integrate robot auto-play into game view flow"
```

### Task 6.3: 实现操作面板 (ActionPanel)

**Files:**
- Create: `src/components/ActionPanel.vue`

- [ ] **Step 1: 实现 ActionPanel**

```vue
<!-- src/components/ActionPanel.vue -->
<template>
  <div class="action-panel" v-if="hasActions">
    <button
      v-if="canHuNow"
      class="btn btn--hu"
      @click="$emit('hu')"
    >
      自摸胡！
    </button>
    <button
      v-for="opt in jiaGangOptions"
      :key="`jg-${opt.type}-${opt.value}`"
      class="btn btn--gang"
      @click="$emit('jia-gang', opt.type, opt.value)"
    >
      加杠: {{ getTileName({ type: opt.type, value: opt.value, id: -1 }) }}
    </button>
    <button
      v-if="showPeng"
      class="btn btn--peng"
      @click="$emit('peng')"
    >
      碰: {{ discardName }}
    </button>
    <button
      v-if="showMingGang"
      class="btn btn--gang"
      @click="$emit('ming-gang')"
    >
      明杠: {{ discardName }}
    </button>
    <button
      v-if="showPass"
      class="btn btn--pass"
      @click="$emit('pass')"
    >
      过
    </button>
    <button
      v-if="showDiscard"
      class="btn btn--primary"
      :disabled="!selectedTile"
      @click="$emit('discard')"
    >
      {{ selectedTile ? `出牌: ${getTileName(selectedTile)}` : '请选择手牌' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Tile, TileType } from '../engine/types';
import { getTileName } from '../engine/tile';

const props = defineProps<{
  phase: string;
  currentPlayer: number;
  lastDiscardPlayer: number;
  canHuNow: boolean;
  showPeng: boolean;
  showMingGang: boolean;
  showPass: boolean;
  showDiscard: boolean;
  jiaGangOptions: { type: TileType; value: number }[];
  selectedTile: Tile | null;
  discardName: string;
}>();

defineEmits<{
  discard: [];
  peng: [];
  'ming-gang': [];
  'jia-gang': [type: TileType, value: number];
  hu: [];
  pass: [];
}>();

const hasActions = computed(() => {
  return props.canHuNow ||
         props.showPeng ||
         props.showMingGang ||
         props.showPass ||
         props.showDiscard ||
         props.jiaGangOptions.length > 0;
});
</script>

<style scoped>
.action-panel {
  display: flex;
  gap: 10px;
  min-height: 44px;
  flex-wrap: wrap;
  justify-content: center;
}
.btn {
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  font-size: 15px;
  cursor: pointer;
  transition: background 0.2s;
  color: #fff;
}
.btn:disabled { opacity: 0.4; cursor: not-allowed; }
.btn--primary { background: #3388cc; }
.btn--primary:hover:not(:disabled) { background: #2277bb; }
.btn--peng { background: #cc8833; }
.btn--peng:hover { background: #b87722; }
.btn--gang { background: #9933cc; }
.btn--gang:hover { background: #8822bb; }
.btn--hu { background: #cc3333; font-size: 18px; font-weight: bold; }
.btn--hu:hover { background: #bb2222; }
.btn--pass { background: #666; }
.btn--pass:hover { background: #555; }
</style>
```

需要移除未使用的 `computed` import（如果 `hasActions` 是唯一的 use），改用 `v-if` 检测。

- [ ] **Step 2: Commit**

```bash
git add src/components/ActionPanel.vue
git commit -m "feat: implement action panel with peng/gang/hu/pass buttons"
```

### Task 6.4: 实现游戏结果组件 (GameResult)

**Files:**
- Create: `src/components/GameResult.vue`

- [ ] **Step 1: 实现 GameResult**

```vue
<!-- src/components/GameResult.vue -->
<template>
  <div class="result-overlay" v-if="show">
    <div class="result-card">
      <h2 class="result-title">{{ titleText }}</h2>
      <p class="result-detail">{{ detailText }}</p>
      <button class="btn" @click="$emit('new-game')">再来一局</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  show: boolean;
  winner: number | null;
  turnCount: number;
}>();

defineEmits<{
  'new-game': [];
}>();

const titleText = computed(() => {
  if (props.winner === 0) return '你赢了！';
  if (props.winner === -1 || props.winner === null) return '流局';
  return `机器人${props.winner} 胡了`;
});

const detailText = computed(() => {
  return `总局数: ${props.turnCount} 轮`;
});
</script>

<style scoped>
.result-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.result-card {
  background: #fff;
  border-radius: 12px;
  padding: 40px 60px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
}
.result-title {
  font-size: 28px;
  margin-bottom: 12px;
  color: #cc3333;
}
.result-detail {
  font-size: 16px;
  color: #666;
  margin-bottom: 24px;
}
.btn {
  padding: 10px 32px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  background: #3388cc;
  color: #fff;
}
.btn:hover { background: #2277bb; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/GameResult.vue
git commit -m "feat: implement game result overlay"
```

### Task 6.5: Phase 6 完整性验证

- [ ] **Step 1: Build check**

Run: `npm run build`
Expected: build succeeds with no errors

- [ ] **Step 2: 手工验证**

在浏览器中：
1. 打开 `npm run dev` 地址
2. 点击"开始新游戏"
3. 观察机器人自动摸牌出牌（有延迟动画）
4. 轮到玩家时，选中一张手牌，点击"出牌"
5. 验证其他玩家碰/杠时弹出按钮
6. 点击"过"或"碰"继续
7. 验证游戏可正常流局或胡牌结束

- [ ] **Step 3: 运行所有测试**

Run: `npx vitest run`
Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(phase-6): complete full game flow with robot auto-play and game result"
```

**Phase 6 可交付物:** 完整的可玩麻将游戏，支持手动出牌、机器人自动操作、碰杠胡交互、对局结果展示。

---

## Phase 7: AI 分析 + 存储 + 设置

> **可运行验证:** `npm run dev` 浏览器完整体验：对局中点击"AI 分析"按钮获取建议，设置页配置 API Key，设置持久化到 localStorage

### 新增/修改文件

```
src/ai/
├── provider.ts         # 创建: 统一 AI 接口 (OpenAI 兼容格式)
├── prompt.ts           # 创建: Prompt 构建
├── analyzer.ts         # 创建: 分析调度
├── index.ts            # 创建: 桶导出
src/storage/
├── store.ts            # 创建: localStorage 封装
src/components/
├── AIAnalysisPanel.vue # 创建: AI 建议面板
├── SettingsModal.vue   # 创建: 设置弹窗
├── GameView.vue        # 修改: 集成 AI 面板和设置按钮
src/App.vue             # 修改: 集成设置
```

### Task 7.1: 实现 AI 接口层 (provider + prompt + analyzer)

**Files:**
- Create: `src/ai/provider.ts`
- Create: `src/ai/prompt.ts`
- Create: `src/ai/analyzer.ts`
- Create: `src/ai/index.ts`

- [ ] **Step 1: 实现 provider.ts**

```typescript
// src/ai/provider.ts

export interface AIProviderConfig {
  endpoint: string;    // API endpoint URL
  apiKey: string;      // API Key
  model: string;       // Model name
}

export interface AIRequest {
  messages: { role: 'system' | 'user'; content: string }[];
  temperature?: number;
  maxTokens?: number;
}

export interface AIResponse {
  content: string;
  model: string;
  error?: string;
}

/**
 * 调用 OpenAI 兼容格式的 AI API
 */
export async function callAI(
  config: AIProviderConfig,
  request: AIRequest,
): Promise<AIResponse> {
  const url = config.endpoint.replace(/\/+$/, '') + '/v1/chat/completions';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 1024,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { content: '', model: config.model, error: `API error ${response.status}: ${errText}` };
    }

    const data = await response.json();
    return {
      content: data.choices?.[0]?.message?.content || '',
      model: data.model || config.model,
    };
  } catch (e: any) {
    return { content: '', model: config.model, error: `Network error: ${e.message}` };
  }
}
```

- [ ] **Step 2: 实现 prompt.ts**

```typescript
// src/ai/prompt.ts
import type { GameState } from '../engine/types';
import { getTileName } from '../engine/tile';

/**
 * 构建 AI 分析的系统 Prompt
 */
export function buildSystemPrompt(): string {
  return `你是一个广东麻将（推倒胡）的策略分析助手。你的任务是分析当前牌面，给出最佳操作建议。

## 游戏规则
- 广东推倒胡：不能吃牌，只能碰/杠/胡
- 只支持自摸胡（自己摸到牌后胡牌）
- 有鬼牌（万能牌），可以替代任意牌组成胡牌型
- 庄家14张牌起手，其余13张，胡牌需要14张（3n+2结构）
- 牌型：万(1-9)、条(1-9)、筒(1-9)、风(东南西北)、箭(中发白)，共136张

## 输出格式
请以 JSON 格式输出分析结果：
{
  "recommendation": "具体建议操作的牌（例如：打出 九万）",
  "reasoning": "详细分析理由，包括进张分析、危险牌判断等",
  "alternative": "备选方案（可选）"
}`;
}

/**
 * 构建当前牌面的用户 Prompt
 */
export function buildUserPrompt(game: GameState, playerIndex: number): string {
  const hand = game.hands[playerIndex];
  const melds = game.melds[playerIndex];
  const handStr = hand.map(t => getTileName(t)).join('、');

  const ghostStr = getTileName({ type: game.ghostType, value: game.ghostValue, id: -1 });

  let meldStr = '无';
  if (melds.length > 0) {
    meldStr = melds.map(m => {
      const names = m.tiles.map(t => getTileName(t)).join('');
      return `[${m.type}]${names}`;
    }).join(' ');
  }

  // 所有已打出的牌（弃牌池）
  const allDiscards = game.discards.flat();
  const discardStr = allDiscards.length > 0
    ? allDiscards.map(t => getTileName(t)).join('、')
    : '无';

  // 其他玩家的副露
  const otherMelds: string[] = [];
  for (let i = 0; i < 4; i++) {
    if (i === playerIndex) continue;
    for (const m of game.melds[i]) {
      const names = m.tiles.map(t => getTileName(t)).join('');
      otherMelds.push(`[玩家${i}]${names}`);
    }
  }

  return `## 当前牌面

你的手牌(${hand.length}张): ${handStr}
你的副露: ${meldStr}
鬼牌指示: ${ghostStr}（同花色同数值的所有牌都是鬼牌/万能牌）
牌墙剩余: ${game.wall.length} 张
当前轮次: ${game.turnCount}

## 已打出的牌
${discardStr}

## 其他玩家副露
${otherMelds.length > 0 ? otherMelds.join('\n') : '无'}

## 可选操作
${game.phase === 'discard' ? '- 出牌（选择一张手牌打出）' : ''}
${game.phase === 'reaction' ? '- 碰牌 / 杠牌 / 过牌' : ''}
- 等待自摸胡

请分析当前牌面，给出最佳操作建议。`;
}
```

- [ ] **Step 3: 实现 analyzer.ts**

```typescript
// src/ai/analyzer.ts
import type { GameState } from '../engine/types';
import type { AIProviderConfig } from './provider';
import { callAI } from './provider';
import { buildSystemPrompt, buildUserPrompt } from './prompt';

export interface AnalysisResult {
  recommendation: string;
  reasoning: string;
  alternative?: string;
  error?: string;
}

/**
 * AI 分析牌面
 */
export async function analyzeGame(
  config: AIProviderConfig,
  game: GameState,
  playerIndex: number = 0,
): Promise<AnalysisResult> {
  const request = {
    messages: [
      { role: 'system' as const, content: buildSystemPrompt() },
      { role: 'user' as const, content: buildUserPrompt(game, playerIndex) },
    ],
    temperature: 0.3,
    maxTokens: 800,
  };

  const response = await callAI(config, request);

  if (response.error) {
    return {
      recommendation: '',
      reasoning: '',
      error: response.error,
    };
  }

  // 尝试解析 JSON
  try {
    const json = JSON.parse(response.content);
    return {
      recommendation: json.recommendation || '',
      reasoning: json.reasoning || response.content,
      alternative: json.alternative,
    };
  } catch {
    // JSON 解析失败，返回原始内容
    return {
      recommendation: '',
      reasoning: response.content,
      error: '无法解析 AI 返回的 JSON',
    };
  }
}
```

- [ ] **Step 4: 创建 AI 桶导出**

```typescript
// src/ai/index.ts
export * from './provider';
export * from './prompt';
export * from './analyzer';
```

- [ ] **Step 5: Commit**

```bash
git add src/ai/
git commit -m "feat: implement AI analysis layer with multi-model support"
```

### Task 7.2: 实现 localStorage 存储

**Files:**
- Create: `src/storage/store.ts`

- [ ] **Step 1: 实现 store.ts**

```typescript
// src/storage/store.ts
import type { AIProviderConfig } from '../ai/provider';

const KEYS = {
  AI_CONFIG: 'mahjong_ai_config',
  GAME_HISTORY: 'mahjong_game_history',
  SETTINGS: 'mahjong_settings',
} as const;

export interface AppSettings {
  autoAnalysis: boolean;  // 是否自动触发 AI 分析
  soundEnabled: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  autoAnalysis: false,
  soundEnabled: false,
};

const DEFAULT_AI_CONFIG: AIProviderConfig = {
  endpoint: 'https://api.openai.com',
  apiKey: '',
  model: 'gpt-4o-mini',
};

/** 保存 AI 配置 */
export function saveAIConfig(config: AIProviderConfig): void {
  localStorage.setItem(KEYS.AI_CONFIG, JSON.stringify(config));
}

/** 读取 AI 配置 */
export function loadAIConfig(): AIProviderConfig {
  try {
    const raw = localStorage.getItem(KEYS.AI_CONFIG);
    if (raw) return { ...DEFAULT_AI_CONFIG, ...JSON.parse(raw) };
  } catch { /* ignore parse errors */ }
  return { ...DEFAULT_AI_CONFIG };
}

/** 保存应用设置 */
export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
}

/** 读取应用设置 */
export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEYS.SETTINGS);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore parse errors */ }
  return { ...DEFAULT_SETTINGS };
}

/** 保存游戏历史摘要 */
export interface GameSummary {
  date: string;
  winner: number | null;
  turns: number;
  ghostType: string;
  ghostValue: number;
}

export function saveGameSummary(summary: GameSummary): void {
  const history = loadGameHistory();
  history.unshift(summary);
  if (history.length > 20) history.length = 20;
  localStorage.setItem(KEYS.GAME_HISTORY, JSON.stringify(history));
}

/** 读取游戏历史 */
export function loadGameHistory(): GameSummary[] {
  try {
    const raw = localStorage.getItem(KEYS.GAME_HISTORY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/storage/store.ts
git commit -m "feat: implement localStorage persistence for settings and history"
```

### Task 7.3: 实现 AI 分析面板组件

**Files:**
- Create: `src/components/AIAnalysisPanel.vue`

- [ ] **Step 1: 实现 AIAnalysisPanel**

```vue
<!-- src/components/AIAnalysisPanel.vue -->
<template>
  <div class="ai-panel">
    <div class="ai-header">
      <span class="ai-title">AI 分析</span>
      <button class="ai-btn" @click="$emit('analyze')" :disabled="loading">
        {{ loading ? '分析中...' : '分析当前牌面' }}
      </button>
    </div>

    <div v-if="error" class="ai-error">{{ error }}</div>

    <div v-if="loading" class="ai-loading">正在请求 AI 分析...</div>

    <div v-if="result && !loading" class="ai-result">
      <div class="ai-recommendation">
        <strong>建议:</strong> {{ result.recommendation }}
      </div>
      <div class="ai-reasoning">
        <strong>理由:</strong> {{ result.reasoning }}
      </div>
      <div v-if="result.alternative" class="ai-alternative">
        <strong>备选:</strong> {{ result.alternative }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AnalysisResult } from '../ai/analyzer';

defineProps<{
  result: AnalysisResult | null;
  loading: boolean;
  error: string;
}>();

defineEmits<{
  analyze: [];
}>();
</script>

<style scoped>
.ai-panel {
  width: 100%;
  max-width: 500px;
  background: rgba(0,0,0,0.5);
  border-radius: 8px;
  padding: 12px 16px;
  color: #fff;
}
.ai-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.ai-title {
  font-size: 15px;
  font-weight: bold;
}
.ai-btn {
  padding: 6px 16px;
  border: none;
  border-radius: 4px;
  background: #3388cc;
  color: #fff;
  cursor: pointer;
  font-size: 13px;
}
.ai-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.ai-error {
  color: #ff6666;
  font-size: 13px;
}
.ai-loading {
  color: #ffd700;
  font-size: 13px;
}
.ai-result {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
  line-height: 1.5;
}
.ai-recommendation {
  color: #5f5;
}
.ai-reasoning {
  color: #ccc;
}
.ai-alternative {
  color: #99c;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AIAnalysisPanel.vue
git commit -m "feat: implement AI analysis panel component"
```

### Task 7.4: 实现设置弹窗 + 集成到 GameView

**Files:**
- Create: `src/components/SettingsModal.vue`
- Modify: `src/components/GameView.vue`

- [ ] **Step 1: 实现 SettingsModal**

```vue
<!-- src/components/SettingsModal.vue -->
<template>
  <div class="modal-overlay" v-if="show" @click.self="$emit('close')">
    <div class="modal-card">
      <h2>设置</h2>

      <div class="setting-group">
        <label class="setting-label">API Endpoint</label>
        <input
          v-model="localConfig.endpoint"
          type="text"
          class="setting-input"
          placeholder="https://api.openai.com"
        />
      </div>

      <div class="setting-group">
        <label class="setting-label">API Key</label>
        <input
          v-model="localConfig.apiKey"
          type="password"
          class="setting-input"
          placeholder="sk-..."
        />
      </div>

      <div class="setting-group">
        <label class="setting-label">Model Name</label>
        <input
          v-model="localConfig.model"
          type="text"
          class="setting-input"
          placeholder="gpt-4o-mini"
        />
      </div>

      <div class="setting-group">
        <label class="setting-check">
          <input v-model="localSettings.autoAnalysis" type="checkbox" />
          自动 AI 分析（每次轮到你时自动触发）
        </label>
      </div>

      <div class="modal-actions">
        <button class="btn btn--save" @click="save">保存</button>
        <button class="btn btn--cancel" @click="$emit('close')">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { AIProviderConfig } from '../ai/provider';
import type { AppSettings } from '../storage/store';

const props = defineProps<{
  show: boolean;
  config: AIProviderConfig;
  settings: AppSettings;
}>();

const emit = defineEmits<{
  close: [];
  save: [config: AIProviderConfig, settings: AppSettings];
}>();

const localConfig = ref<AIProviderConfig>({ ...props.config });
const localSettings = ref<AppSettings>({ ...props.settings });

watch(() => props.show, () => {
  localConfig.value = { ...props.config };
  localSettings.value = { ...props.settings };
});

function save() {
  emit('save', { ...localConfig.value }, { ...localSettings.value });
  emit('close');
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}
.modal-card {
  background: #fff;
  border-radius: 12px;
  padding: 32px;
  width: 90%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
h2 { margin: 0 0 8px; }
.setting-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.setting-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}
.setting-input {
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}
.setting-check {
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 8px;
}
.btn {
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
}
.btn--save { background: #3388cc; color: #fff; }
.btn--cancel { background: #eee; color: #333; }
</style>
```

- [ ] **Step 2: 更新 GameView 集成 AI 面板和设置**

修改 `src/components/GameView.vue`，添加：
- AI 分析面板（位于操作区下方）
- 设置按钮（位于顶部）
- 导入新的 store 和 analyzer
- 添加 `analyzeCurrentGame` 方法和设置弹窗状态

关键新增逻辑：
```typescript
import AIAnalysisPanel from './AIAnalysisPanel.vue';
import SettingsModal from './SettingsModal.vue';
import { analyzeGame, type AnalysisResult } from '../ai/analyzer';
import { loadAIConfig, saveAIConfig, loadSettings, saveSettings, saveGameSummary } from '../storage/store';
import type { AIProviderConfig } from '../ai/provider';
import type { AppSettings } from '../storage/store';

// 在 script setup 中添加：
const aiResult = ref<AnalysisResult | null>(null);
const aiLoading = ref(false);
const aiError = ref('');
const showSettings = ref(false);
const aiConfig = ref<AIProviderConfig>(loadAIConfig());
const appSettings = ref<AppSettings>(loadSettings());

async function analyzeCurrentGame() {
  if (!gameState.value || aiLoading.value) return;
  aiLoading.value = true;
  aiError.value = '';
  aiResult.value = null;

  const result = await analyzeGame(aiConfig.value, gameState.value, 0);
  aiResult.value = result;
  if (result.error) aiError.value = result.error;
  aiLoading.value = false;
}

function onSaveSettings(config: AIProviderConfig, settings: AppSettings) {
  aiConfig.value = config;
  appSettings.value = settings;
  saveAIConfig(config);
  saveSettings(settings);
}

// 监听游戏结束保存记录
watch(() => gameState.value?.phase, (phase) => {
  if (phase === 'hu' || phase === 'draw_end') {
    saveGameSummary({
      date: new Date().toISOString(),
      winner: gameState.value?.winner ?? null,
      turns: gameState.value?.turnCount ?? 0,
      ghostType: gameState.value?.ghostType ?? 'wan',
      ghostValue: gameState.value?.ghostValue ?? 1,
    });
  }
});
```

- [ ] **Step 3: Commit**

```bash
git add src/components/SettingsModal.vue src/components/AIAnalysisPanel.vue src/components/GameView.vue
git commit -m "feat: integrate AI analysis panel and settings modal into game view"
```

### Task 7.5: Phase 7 完整性验证

- [ ] **Step 1: Build check**

Run: `npm run build`
Expected: build succeeds with no errors

- [ ] **Step 2: 手工验证**

1. 打开 `npm run dev`
2. 点击设置按钮，填入 API Key（或跳过）
3. 开始新对局
4. 点击"AI 分析"按钮
5. 验证分析结果显示（用真实 API Key）或显示错误（无 API Key）
6. 验证设置保存到 localStorage
7.

- [ ] **Step 3: Run all tests**

Run: `npx vitest run`
Expected: all tests pass

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(phase-7): complete AI analysis, settings, and localStorage persistence"
```

**Phase 7 可交付物:** 完整广东麻将训练助手，含 AI 分析建议、设置持久化、对局历史记录。

---

## 附录: 设计到实现的覆盖检查

| 设计模块 | 实现文件 | 完成阶段 |
|---------|---------|---------|
| 牌的定义和工具函数 | `src/engine/tile.ts` | Phase 1 ✅ |
| 牌墙管理 | `src/engine/wall.ts` | Phase 1 ✅ |
| 手牌管理 | `src/engine/hand.ts` | Phase 2 ✅ |
| 副露（碰/杠/加杠） | `src/engine/meld.ts` | Phase 2+4 |
| 游戏状态机 | `src/engine/game.ts` | Phase 2+4 |
| 胡牌判定（含鬼牌） | `src/engine/hu.ts` | Phase 3 ✅ |
| 机器人策略 | `src/robot/robot.ts` | Phase 4 |
| AI 分析器 | `src/ai/` | Phase 7 |
| Vue 组件 | `src/components/` | Phase 5-6 |
| 状态管理 | `src/composables/useGame.ts` | Phase 5-6 |
| 数据存储 | `src/storage/store.ts` | Phase 7 |
