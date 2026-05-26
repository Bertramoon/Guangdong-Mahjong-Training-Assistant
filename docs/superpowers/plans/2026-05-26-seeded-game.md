# 种子化对局实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 引入种子化 PRNG，使每局游戏可通过种子号重播相同牌序。

**Architecture:** 新增 `rng.ts` 实现 mulberry32 PRNG，替换 `wall.ts` 和 `robot.ts` 中的 `Math.random()`。`createGame` 接受可选种子参数，种子号存入 GameState。UI 层在开始前、进行中、结束后均展示种子号。

**Tech Stack:** TypeScript, Vue 3, Vitest

---

### Task 1: 创建种子化 PRNG 模块

**Files:**
- Create: `src/engine/rng.ts`
- Create: `tests/engine/rng.test.ts`

- [ ] **Step 1: 编写 PRNG 测试**

```typescript
// tests/engine/rng.test.ts
import { describe, it, expect } from 'vitest';
import { createRNG } from '../../src/engine/rng';

describe('createRNG', () => {
  it('相同种子产生相同序列', () => {
    const rng1 = createRNG(12345);
    const rng2 = createRNG(12345);
    const seq1 = Array.from({ length: 100 }, () => rng1());
    const seq2 = Array.from({ length: 100 }, () => rng2());
    expect(seq1).toEqual(seq2);
  });

  it('不同种子产生不同序列', () => {
    const rng1 = createRNG(12345);
    const rng2 = createRNG(67890);
    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());
    expect(seq1).not.toEqual(seq2);
  });

  it('返回值在 [0, 1) 范围内', () => {
    const rng = createRNG(42);
    for (let i = 0; i < 1000; i++) {
      const val = rng();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('序列在多次调用中不重复', () => {
    const rng = createRNG(99999);
    const values = new Set(Array.from({ length: 1000 }, () => rng()));
    expect(values.size).toBeGreaterThan(900);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/engine/rng.test.ts`
Expected: FAIL — `createRNG` 模块不存在

- [ ] **Step 3: 实现 createRNG**

```typescript
// src/engine/rng.ts
/** mulberry32 种子化伪随机数生成器 */
export function createRNG(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/engine/rng.test.ts`
Expected: 4 tests PASS

- [ ] **Step 5: 提交**

```bash
git add src/engine/rng.ts tests/engine/rng.test.ts
git commit -m "feat: 添加种子化 PRNG (mulberry32)"
```

---

### Task 2: 改造 shuffleWall 接受 rng 参数

**Files:**
- Modify: `src/engine/wall.ts:7-14`
- Modify: `tests/engine/wall.test.ts:20-34`

- [ ] **Step 1: 更新 shuffleWall 测试**

在 `tests/engine/wall.test.ts` 的 `describe('shuffleWall')` 中新增测试，并更新现有测试以传入 rng：

```typescript
import { createRNG } from '../../src/engine/rng';

// 修改现有 "洗牌后数量不变" 测试：
it('洗牌后数量不变', () => {
  const tiles = createAllTiles();
  const rng = createRNG(42);
  const wall = shuffleWall(tiles, rng);
  expect(wall.length).toBe(136);
});

// 修改现有 "洗牌后包含所有原始牌" 测试：
it('洗牌后包含所有原始牌', () => {
  const tiles = createAllTiles();
  const rng = createRNG(42);
  const wall = shuffleWall(tiles, rng);
  const originalIds = new Set(tiles.map(t => t.id));
  const wallIds = new Set(wall.map(t => t.id));
  expect(wallIds).toEqual(originalIds);
});

// 新增测试：
it('相同种子产生相同洗牌结果', () => {
  const tiles = createAllTiles();
  const wall1 = shuffleWall(tiles, createRNG(12345));
  const wall2 = shuffleWall(tiles, createRNG(12345));
  expect(wall1.map(t => t.id)).toEqual(wall2.map(t => t.id));
});

it('不同种子产生不同洗牌结果', () => {
  const tiles = createAllTiles();
  const wall1 = shuffleWall(tiles, createRNG(11111));
  const wall2 = shuffleWall(tiles, createRNG(22222));
  expect(wall1.map(t => t.id)).not.toEqual(wall2.map(t => t.id));
});

it('不修改原始牌数组', () => {
  const tiles = createAllTiles();
  const original = [...tiles];
  shuffleWall(tiles, createRNG(42));
  expect(tiles).toEqual(original);
});
```

同时需要更新 `drawInitialHands` 测试中的 `shuffleWall` 调用，传入 rng：

```typescript
it('每人13张，庄家14张', () => {
  const tiles = createAllTiles();
  const wall = shuffleWall(tiles, createRNG(42));
  const { hands, remaining } = drawInitialHands(wall, 0);
  // ... assertions unchanged
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/engine/wall.test.ts`
Expected: FAIL — shuffleWall 签名不匹配

- [ ] **Step 3: 修改 shuffleWall 实现**

替换 `src/engine/wall.ts` 中的 `shuffleWall` 函数：

```typescript
export function shuffleWall(tiles: Tile[], rng: () => number): Tile[] {
  const wall = [...tiles];
  for (let i = wall.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [wall[i], wall[j]] = [wall[j], wall[i]];
  }
  return wall;
}
```

注意：只改了参数 `rng` 替换 `Math.random()`，其余逻辑完全不变。

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/engine/wall.test.ts`
Expected: 全部 PASS

- [ ] **Step 5: 提交**

```bash
git add src/engine/wall.ts tests/engine/wall.test.ts
git commit -m "refactor: shuffleWall 接受 rng 参数替代 Math.random()"
```

---

### Task 3: GameState 新增 seed 字段，改造 createGame

**Files:**
- Modify: `src/engine/types.ts:46-61` (GameState interface)
- Modify: `src/engine/game.ts:12-39` (createGame function)
- Modify: `tests/engine/game.test.ts`

- [ ] **Step 1: 更新 game.test.ts 测试**

在 `tests/engine/game.test.ts` 中新增测试并更新现有测试：

```typescript
import { createRNG } from '../../src/engine/rng';

// 修改现有 "创建新游戏" 测试：
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
  expect(game.discardOrder).toEqual([]);
  expect(game.seed).toBeGreaterThan(0); // 新增：验证种子存在
});

// 新增测试：
it('相同种子产生完全相同的游戏', () => {
  const seed = 1234567890;
  const game1 = createGame(0, seed);
  const game2 = createGame(0, seed);
  expect(game1.wall.map(t => t.id)).toEqual(game2.wall.map(t => t.id));
  expect(game1.hands.map(h => h.map(t => t.id))).toEqual(game2.hands.map(h => h.map(t => t.id)));
  expect(game1.ghostType).toBe(game2.ghostType);
  expect(game1.ghostValue).toBe(game2.ghostValue);
  expect(game1.seed).toBe(seed);
});

it('不传种子时自动生成种子', () => {
  const game = createGame(0);
  expect(game.seed).toBeDefined();
  expect(typeof game.seed).toBe('number');
  expect(game.seed).toBeGreaterThan(0);
});

it('不传种子时每次生成不同游戏', () => {
  const game1 = createGame(0);
  const game2 = createGame(0);
  // 种子不同（极小概率相同，但实际不会）
  expect(game1.seed).not.toBe(game2.seed);
});
```

同时更新 `drawPhase` 和 `discardPhase` 测试中的 `createGame` 调用——这些不需要改动，因为 `createGame(0)` 仍可正常调用（种子参数可选）。

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/engine/game.test.ts`
Expected: FAIL — GameState 缺少 seed 字段，createGame 签名不匹配

- [ ] **Step 3: 修改 GameState 类型**

在 `src/engine/types.ts` 的 `GameState` interface 中，在 `winner` 字段后新增：

```typescript
  seed: number;               // 本局种子号
```

- [ ] **Step 4: 修改 createGame 函数**

替换 `src/engine/game.ts` 中的 `createGame`：

```typescript
import { createRNG } from './rng';

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
    winner: null,
    seed: actualSeed,
  };

  return game;
}
```

注意：需要在 `game.ts` 顶部新增 `import { createRNG } from './rng';`。

- [ ] **Step 5: 运行测试确认通过**

Run: `npx vitest run tests/engine/game.test.ts`
Expected: 全部 PASS

- [ ] **Step 6: 运行全量测试确认无回归**

Run: `npx vitest run`
Expected: 全部 PASS（注意 `wall.test.ts` 中 `drawInitialHands` 测试需要确认已更新 rng 参数）

- [ ] **Step 7: 提交**

```bash
git add src/engine/types.ts src/engine/game.ts tests/engine/game.test.ts
git commit -m "feat: GameState 新增 seed 字段，createGame 支持种子参数"
```

---

### Task 4: 更新 index.ts 导出

**Files:**
- Modify: `src/engine/index.ts`

- [ ] **Step 1: 添加 rng 导出**

在 `src/engine/index.ts` 中新增一行：

```typescript
export * from './rng';
```

- [ ] **Step 2: 运行全量测试确认无回归**

Run: `npx vitest run`
Expected: 全部 PASS

- [ ] **Step 3: 提交**

```bash
git add src/engine/index.ts
git commit -m "feat: 导出 createRNG"
```

---

### Task 5: robotDiscard 接受可选 rng 参数

**Files:**
- Modify: `src/robot/robot.ts:15,55`
- Modify: `tests/robot/robot.test.ts`

- [ ] **Step 1: 编写测试**

在 `tests/robot/robot.test.ts` 中新增测试：

```typescript
import { createRNG } from '../../src/engine/rng';

it('极端情况使用 rng 而非 Math.random', () => {
  // 构造全是鬼牌的手牌（触发 fallback 分支）
  const ghostType = 'wan';
  const ghostValue = 1;
  const hand: Tile[] = [
    { type: ghostType, value: ghostValue, id: 0 },
    { type: ghostType, value: ghostValue, id: 1 },
    { type: ghostType, value: ghostValue, id: 2 },
  ];
  const rng = createRNG(42);
  const result = robotDiscard(hand, ghostType, ghostValue, rng);
  expect(result).toBeDefined();
  // 相同 rng 种子应返回相同结果
  const result2 = robotDiscard(hand, ghostType, ghostValue, createRNG(42));
  expect(result.id).toBe(result2.id);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/robot/robot.test.ts`
Expected: FAIL — robotDiscard 不接受 rng 参数

- [ ] **Step 3: 修改 robotDiscard**

在 `src/robot/robot.ts` 中修改 `robotDiscard` 函数签名和 fallback 分支：

```typescript
export function robotDiscard(
  hand: Tile[],
  ghostType: TileType,
  ghostValue: number,
  rng: () => number = Math.random,
): Tile {
```

然后修改第 55 行的 fallback 分支：

```typescript
    return nonGhost[Math.floor(rng() * nonGhost.length)];
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/robot/robot.test.ts`
Expected: 全部 PASS

- [ ] **Step 5: 运行全量测试**

Run: `npx vitest run`
Expected: 全部 PASS

- [ ] **Step 6: 提交**

```bash
git add src/robot/robot.ts tests/robot/robot.test.ts
git commit -m "refactor: robotDiscard 接受可选 rng 参数"
```

---

### Task 6: UI - 开始前种子输入面板

**Files:**
- Modify: `src/composables/useGame.ts:129-147` (startNewGame)
- Modify: `src/components/GameView.vue:1-6,98-136,182-269`

- [ ] **Step 1: 修改 useGame composable**

修改 `src/composables/useGame.ts` 中的 `startNewGame` 接受可选种子参数，并导出 `startGameAndAutoPlay` 也接受种子：

```typescript
function startNewGame(seed?: number) {
  let game = createGame(0, seed);
  // 庄家已有14张牌（初始发牌时已多摸一张），直接进入出牌阶段
  if (game.currentPlayer === 0 && game.hands[0].length === 14) {
    game = { ...game, phase: 'discard' as const };
  }
  gameState.value = game;
  selectedTile.value = null;
  gameLog.value = [];
  canHuNow.value = false;
  canJiaGangNow.value = false;
  canAnGangNow.value = false;
  jiaGangOptions.value = [];
  anGangOptions.value = [];
  highlightedTileIds.value = [];
  addLog(`新游戏开始！鬼牌: ${getTileName({ type: game.ghostType, value: game.ghostValue, id: -1 })}`);
  addLog(`种子号: ${game.seed}`);

  updateActions(game);
}

async function startGameAndAutoPlay(seed?: number): Promise<void> {
  startNewGame(seed);
  await delay(300);
  await autoPlayUntilPlayer();
}
```

- [ ] **Step 2: 修改 GameView.vue 开始界面**

将开始按钮改为带种子输入的界面。替换 template 中的 start-screen 部分：

```html
<div v-if="!gameState" class="start-screen">
  <h1>广东麻将训练助手</h1>
  <div class="seed-panel">
    <label class="seed-label">种子号（留空随机生成）</label>
    <input
      v-model="seedInput"
      class="seed-input"
      type="text"
      placeholder="输入种子号重播牌局"
      @keyup.enter="handleStart"
    />
    <button class="btn" @click="handleStart">开始新游戏</button>
  </div>
</div>
```

在 script setup 中添加：

```typescript
const seedInput = ref('');

function handleStart() {
  const trimmed = seedInput.value.trim();
  const seed = trimmed ? parseInt(trimmed, 10) : undefined;
  if (trimmed && (isNaN(seed!) || seed! <= 0)) {
    return; // 无效输入，不做任何事
  }
  seedInput.value = '';
  startGameAndAutoPlay(seed);
}
```

添加样式：

```css
.seed-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.seed-label {
  color: #aaa;
  font-size: 14px;
}
.seed-input {
  width: 280px;
  padding: 10px 16px;
  border: 1px solid #555;
  border-radius: 6px;
  background: rgba(255,255,255,0.1);
  color: #fff;
  font-size: 16px;
  text-align: center;
}
.seed-input::placeholder {
  color: #777;
}
.seed-input:focus {
  outline: none;
  border-color: #3388cc;
}
```

- [ ] **Step 3: 验证 UI**

Run: `npx vite dev`
在浏览器中确认：
1. 开始页面有种子输入框
2. 不输入种子直接开始 → 正常游戏
3. 输入种子号开始 → 可正常游戏
4. 用同一种子号开始两局 → 初始手牌相同

- [ ] **Step 4: 提交**

```bash
git add src/composables/useGame.ts src/components/GameView.vue
git commit -m "feat: 开始界面支持种子号输入"
```

---

### Task 7: UI - 游戏中显示种子号

**Files:**
- Modify: `src/components/GameView.vue:9-15`

- [ ] **Step 1: 在 top-bar 中显示种子号**

在 `GameView.vue` 的 top-bar 区域的 ghost-badge 旁边添加种子号显示：

```html
<div class="top-bar">
  <div class="top-bar-info">
    <span class="ghost-badge">鬼牌: {{ ghostName }}</span>
    <span class="seed-badge">种子: {{ gameState.seed }}</span>
  </div>
  <div class="top-bar-actions">
    <button v-if="revealMode" class="btn-new-game" @click="handleNewGame">再来一局</button>
    <button class="settings-btn" @click="showSettings = true">⚙ 设置</button>
  </div>
</div>
```

添加样式：

```css
.top-bar-info {
  display: flex;
  gap: 8px;
  align-items: center;
}
.seed-badge {
  font-size: 13px;
  color: #aaa;
  background: rgba(0,0,0,0.2);
  padding: 4px 10px;
  border-radius: 4px;
}
```

- [ ] **Step 2: 验证 UI**

在浏览器中确认游戏中 top-bar 同时显示鬼牌和种子号。

- [ ] **Step 3: 提交**

```bash
git add src/components/GameView.vue
git commit -m "feat: 游戏中显示种子号"
```

---

### Task 8: UI - 游戏结束后显示种子号和复制按钮

**Files:**
- Modify: `src/components/GameResult.vue`

- [ ] **Step 1: 修改 GameResult 组件**

更新 `GameResult.vue` 以接受并显示种子号：

Template 修改：

```html
<template>
  <div class="result-overlay" v-if="show">
    <div class="result-card">
      <h2 class="result-title">{{ titleText }}</h2>
      <p class="result-detail">{{ detailText }}</p>
      <div class="seed-info">
        <span>种子号: {{ seed }}</span>
        <button class="btn-copy" @click="copySeed">{{ copied ? '已复制' : '复制' }}</button>
      </div>
      <div class="result-actions">
        <button class="btn btn-primary" @click="$emit('view-details')">查看对局情况</button>
        <button class="btn btn-secondary" @click="$emit('replay', seed)">重播本局</button>
        <button class="btn btn-secondary" @click="$emit('new-game')">再来一局</button>
      </div>
    </div>
  </div>
</template>
```

Script 修改：

```typescript
const props = defineProps<{
  show: boolean;
  winner: number | null;
  turnCount: number;
  seed: number;
}>();

defineEmits<{
  'new-game': [];
  'view-details': [];
  'replay': [seed: number];
}>();

const copied = ref(false);

function copySeed() {
  navigator.clipboard.writeText(String(props.seed));
  copied.value = true;
  setTimeout(() => { copied.value = false; }, 2000);
}
```

样式新增：

```css
.seed-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 20px;
  font-size: 14px;
  color: #888;
}
.btn-copy {
  padding: 3px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  color: #666;
  cursor: pointer;
  font-size: 12px;
}
.btn-copy:hover { background: #f0f0f0; }
```

- [ ] **Step 2: 更新 GameView.vue 传递 seed 并处理 replay 事件**

在 `GameView.vue` 中：

```html
<GameResult
  :show="(gameState.phase === 'hu' || gameState.phase === 'draw_end') && !revealMode"
  :winner="gameState.winner"
  :turn-count="gameState.turnCount"
  :seed="gameState.seed"
  @new-game="handleNewGame"
  @view-details="revealMode = true"
  @replay="handleReplay"
/>
```

在 script 中添加 `handleReplay`：

```typescript
function handleReplay(seed: number) {
  revealMode.value = false;
  startGameAndAutoPlay(seed);
}
```

- [ ] **Step 3: 验证 UI**

在浏览器中确认：
1. 游戏结束弹窗显示种子号
2. 复制按钮可用
3. "重播本局"按钮可用，点击后开始相同种子的新游戏
4. "再来一局"按钮仍正常工作

- [ ] **Step 4: 提交**

```bash
git add src/components/GameResult.vue src/components/GameView.vue
git commit -m "feat: 游戏结束显示种子号、复制和重播按钮"
```

---

### Task 9: 全量测试与验证

- [ ] **Step 1: 运行全量测试**

Run: `npx vitest run`
Expected: 全部 PASS

- [ ] **Step 2: 端到端手动验证**

Run: `npx vite dev`

验证清单：
1. 不输入种子开始新游戏 → 正常游戏，top-bar 显示种子号
2. 记录种子号，结束游戏后确认弹窗显示正确
3. 复制种子号，重新开始游戏时输入该种子 → 初始手牌相同
4. 用同一种子连续开两局确认手牌一致
5. 重播本局按钮正常工作

- [ ] **Step 3: 最终提交（如有修复）**

```bash
git add -A
git commit -m "fix: 种子化对局功能最终修复"
```
