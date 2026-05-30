# 机器人智能对局实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为机器人增加智能弃牌（基于向听数推荐算法）和自摸胡两个可配置行为。

**Architecture:** 在 `robotDiscard` 函数中新增 `smartMode` 参数，开启时调用已有的 `getDiscardRecommendation` 取 TOP 1 结果。在 `executeRobotTurn` 中，机器人摸牌后使用已有的 `isSelfHu` 检查是否可以胡牌。两个行为通过 `AppSettings` 中的开关控制，由 `GameView` 传入 `useGame` composable。

**Tech Stack:** Vue 3 + TypeScript + Vitest

---

### Task 1: 设置存储 — 新增两个 boolean 字段

**Files:**
- Modify: `src/storage/store.ts:9-17`

- [ ] **Step 1: 给 AppSettings 接口和默认值添加两个新字段**

在 `src/storage/store.ts` 中修改：

```typescript
export interface AppSettings {
  autoAnalysis: boolean;
  soundEnabled: boolean;
  robotSmartDiscard: boolean;
  robotCanHu: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  autoAnalysis: false,
  soundEnabled: false,
  robotSmartDiscard: false,
  robotCanHu: false,
};
```

`loadSettings` 已经用 `{ ...DEFAULT_SETTINGS, ...JSON.parse(raw) }` 合并，所以旧数据缺少新字段时自动获得默认值 `false`。

- [ ] **Step 2: 运行构建确认无类型错误**

Run: `npx vue-tsc --noEmit`
Expected: PASS（无类型错误）

- [ ] **Step 3: 提交**

```bash
git add src/storage/store.ts
git commit -m "feat: AppSettings 新增 robotSmartDiscard 和 robotCanHu 字段"
```

---

### Task 2: 设置弹窗 — 新增两个 checkbox

**Files:**
- Modify: `src/components/SettingsModal.vue:21-24`

- [ ] **Step 1: 在模板中添加两个 checkbox**

在 `SettingsModal.vue` 模板的现有 `autoAnalysis` checkbox（第 21-24 行）之后、`modal-buttons` div 之前，添加：

```html
      <label class="checkbox-field">
        <input v-model="localSettings.robotSmartDiscard" type="checkbox" />
        <span>机器人智能弃牌（基于向听数推荐算法）</span>
      </label>

      <label class="checkbox-field">
        <input v-model="localSettings.robotCanHu" type="checkbox" />
        <span>机器人自摸胡（机器人摸牌后可自动胡牌）</span>
      </label>
```

无需修改 `<script>` 部分——`localSettings` 已经绑定到完整的 `AppSettings` 类型，新增字段自动可用。

- [ ] **Step 2: 运行构建确认**

Run: `npx vue-tsc --noEmit`
Expected: PASS

- [ ] **Step 3: 手动验证**

Run: `npm run dev`，打开设置弹窗，确认新增的两个 checkbox 显示且可切换。

- [ ] **Step 4: 提交**

```bash
git add src/components/SettingsModal.vue
git commit -m "feat: 设置弹窗新增机器人智能弃牌和自摸胡开关"
```

---

### Task 3: robotDiscard 智能模式 — 测试先行

**Files:**
- Modify: `tests/robot/robot.test.ts`
- Modify: `src/robot/robot.ts:1-4,15-20`

- [ ] **Step 1: 编写失败测试**

在 `tests/robot/robot.test.ts` 中添加新的 describe 块：

```typescript
import { getDiscardRecommendation } from '../../src/engine/advisor';

describe('robotDiscard smartMode', () => {
  it('smartMode=true 时使用推荐算法 TOP 1', () => {
    // 一手明显的手牌：一万孤张最优丢弃
    const hand: Tile[] = [
      h('wan', 2, 0), h('wan', 3, 1), h('wan', 4, 2),
      h('tiao', 5, 3), h('tiao', 6, 4), h('tiao', 7, 5),
      h('tong', 1, 6), h('tong', 2, 7), h('tong', 3, 8),
      h('feng', 1, 9), h('feng', 2, 10), h('feng', 3, 11),
      h('jian', 1, 12),
      h('wan', 1, 13),  // 14th tile
    ];
    const smartDiscard = robotDiscard(hand, 'wan', 9, Math.random, true);

    // 用 advisor 直接算出 TOP 1 验证一致
    const rec = getDiscardRecommendation(hand, 'wan', 9, 0);
    expect(rec.evaluations.length).toBeGreaterThan(0);
    expect(smartDiscard.type).toBe(rec.evaluations[0].discardTile.type);
    expect(smartDiscard.value).toBe(rec.evaluations[0].discardTile.value);
  });

  it('smartMode=false 时使用原有启发式逻辑', () => {
    const hand: Tile[] = [
      h('wan', 2, 0), h('wan', 3, 1), h('wan', 4, 2),
      h('tiao', 5, 3), h('tiao', 6, 4), h('tiao', 7, 5),
      h('tong', 1, 6), h('tong', 2, 7), h('tong', 3, 8),
      h('feng', 1, 9), h('feng', 2, 10), h('feng', 3, 11),
      h('jian', 1, 12),
      h('wan', 1, 13),
    ];
    const discard = robotDiscard(hand, 'wan', 9, Math.random, false);
    // 不抛异常即可，原有逻辑有独立测试
    expect(discard).toBeDefined();
  });

  it('smartMode=true 但推荐为空时 fallback 到原有逻辑', () => {
    // 构造极端手牌：只有鬼牌（advisor 会返回空 evaluations 因为无候选）
    const hand: Tile[] = [
      h('wan', 1, 0), h('wan', 1, 1), h('wan', 1, 2),
    ];
    const discard = robotDiscard(hand, 'wan', 1, Math.random, true);
    expect(discard).toBeDefined();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/robot/robot.test.ts`
Expected: FAIL — `robotDiscard` 不接受第 5 个参数

- [ ] **Step 3: 实现 smartMode 参数**

在 `src/robot/robot.ts` 顶部添加导入：

```typescript
import { getDiscardRecommendation } from '../engine/advisor';
```

修改 `robotDiscard` 函数签名和开头：

```typescript
export function robotDiscard(
  hand: Tile[],
  ghostType: TileType,
  ghostValue: number,
  rng: () => number = Math.random,
  smartMode: boolean = false,
): Tile {
  if (smartMode) {
    const recommendation = getDiscardRecommendation(hand, ghostType, ghostValue, 0);
    if (recommendation.evaluations.length > 0) {
      return recommendation.evaluations[0].discardTile;
    }
  }
```

其余函数体保持不变。

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/robot/robot.test.ts`
Expected: ALL PASS

- [ ] **Step 5: 运行完整测试套件确认无回归**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 6: 提交**

```bash
git add src/robot/robot.ts tests/robot/robot.test.ts
git commit -m "feat: robotDiscard 支持 smartMode 使用推荐算法 TOP 1"
```

---

### Task 4: useGame 接入设置 — 机器人智能弃牌 + 自摸胡

**Files:**
- Modify: `src/composables/useGame.ts`

此任务将 `useGame` composable 与设置系统连接，让机器人根据开关行为变化。

- [ ] **Step 1: 修改 useGame 签名接受 settings ref**

在 `src/composables/useGame.ts` 顶部添加导入：

```typescript
import type { Ref } from 'vue';
import type { AppSettings } from '../storage/store';
```

修改函数签名：

```typescript
export function useGame(settings: Ref<AppSettings>) {
```

- [ ] **Step 2: 在 executeRobotTurn 中插入机器人自摸胡检查**

在 `executeRobotTurn` 函数内，`drawPhase` 调用之后、`await delay(500)` 之前（当前代码第 313 行附近），插入胡牌检查：

```typescript
      // Robot self-draw hu check
      if (settings.value.robotCanHu) {
        const robotHand = afterDraw.hands[player];
        if (isSelfHu(robotHand, afterDraw.ghostType, afterDraw.ghostValue)) {
          addLog(`机器人${player}自摸胡牌！`);
          gameState.value = { ...afterDraw, phase: 'hu' as const, winner: player };
          return;
        }
      }
```

这段代码放在以下两行之间：
```typescript
      gameState.value = afterDraw;
      // >>> 插入位置 <<<
      await delay(500);
```

- [ ] **Step 3: 在所有 robotDiscard 调用处传入 smartMode**

`useGame.ts` 中共有 5 处调用 `robotDiscard`，均需传入 `settings.value.robotSmartDiscard`：

1. **`handleRobotReactions` 中的明杠后弃牌**（约第 271 行）：
```typescript
const tile = robotDiscard(afterDraw.hands[i], afterDraw.ghostType, afterDraw.ghostValue, Math.random, settings.value.robotSmartDiscard);
```

2. **`handleRobotReactions` 中的碰后弃牌**（约第 287 行）：
```typescript
const tile = robotDiscard(afterPeng.hands[i], afterPeng.ghostType, afterPeng.ghostValue, Math.random, settings.value.robotSmartDiscard);
```

3. **`executeRobotTurn` 中的加杠后弃牌**（约第 328 行）：
```typescript
const tile = robotDiscard(afterJiaGang.hands[player], afterJiaGang.ghostType, afterJiaGang.ghostValue, Math.random, settings.value.robotSmartDiscard);
```

4. **`executeRobotTurn` 中的正常弃牌**（约第 338 行）：
```typescript
const tile = robotDiscard(afterDraw.hands[player], afterDraw.ghostType, afterDraw.ghostValue, Math.random, settings.value.robotSmartDiscard);
```

5. **`executeRobotTurn` 中的机器人反应弃牌**（有 2 处，约第 364 行和第 385 行）：
```typescript
const rdTile = robotDiscard(rd.hands[i], rd.ghostType, rd.ghostValue, Math.random, settings.value.robotSmartDiscard);
```
以及：
```typescript
const rdTile = robotDiscard(g.hands[i], g.ghostType, g.ghostValue, Math.random, settings.value.robotSmartDiscard);
```

- [ ] **Step 4: 运行构建确认**

Run: `npx vue-tsc --noEmit`
Expected: 类型错误——`GameView.vue` 调用 `useGame()` 没有传参（将在 Task 5 修复）

- [ ] **Step 5: 提交**

```bash
git add src/composables/useGame.ts
git commit -m "feat: useGame 接入设置，支持机器人智能弃牌和自摸胡"
```

---

### Task 5: GameView 传入 settings ref

**Files:**
- Modify: `src/components/GameView.vue:129-151`

- [ ] **Step 1: 修改 useGame 调用，传入 appSettings**

在 `GameView.vue` 中修改第 129-151 行的 `useGame` 调用：

将：
```typescript
} = useGame();
```

改为：
```typescript
} = useGame(appSettings);
```

- [ ] **Step 2: 运行构建确认**

Run: `npx vue-tsc --noEmit`
Expected: PASS

- [ ] **Step 3: 运行完整测试套件**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 4: 手动验证完整流程**

Run: `npm run dev`

1. 打开设置弹窗，确认两个新开关显示且可切换
2. 关闭两个开关，开始游戏 — 机器人行为应与之前完全一致
3. 开启"机器人智能弃牌"，开始游戏 — 观察机器人弃牌是否更有策略性（不再丢弃有用的搭子）
4. 开启"机器人自摸胡"，开始游戏 — 如果机器人摸牌后能胡，应自动结束对局并在结果弹窗显示胜者
5. 两个开关同时开启 — 验证两种行为都生效

- [ ] **Step 5: 提交**

```bash
git add src/components/GameView.vue
git commit -m "feat: GameView 传入 settings ref 至 useGame"
```

---

## 自检

**Spec 覆盖：**
- 设置系统字段 + UI → Task 1 + 2
- 智能弃牌 → Task 3 + 4
- 自摸胡 → Task 4
- 设置传递 → Task 5

**占位符扫描：** 无 TBD/TODO，所有步骤含完整代码。

**类型一致性：**
- `AppSettings.robotSmartDiscard: boolean` — Task 1 定义，Task 2/3/4 使用
- `AppSettings.robotCanHu: boolean` — Task 1 定义，Task 4 使用
- `robotDiscard(..., smartMode: boolean = false)` — Task 3 定义，Task 4 使用
- `useGame(settings: Ref<AppSettings>)` — Task 4 定义，Task 5 调用
