# 种子化对局设计规格

## 概述

为广东麻将训练器引入"种子"概念。每局游戏都有一个数字种子号，决定牌墙的洗牌顺序。用户可以通过输入种子号来重玩完全相同牌序的对局，以便反复练习同一手牌，尤其是流局场景的实战推演。

## 需求

1. 每局游戏自动生成并记录种子号
2. 用户可在开始新游戏时输入种子号以重播特定牌局
3. 游戏开始前、进行中、结束后都显示种子号
4. 种子仅固定牌墙洗牌顺序，机器人和玩家的操作不受种子约束
5. 种子号格式为数字，长度约 10 位

## 方案

**种子化 PRNG（方案 A）**：在 `src/engine/rng.ts` 中实现一个轻量的 mulberry32 伪随机数生成器，替换 `Math.random()`。零外部依赖。

## 技术设计

### 1. 种子化随机数引擎

**新文件**：`src/engine/rng.ts`

```typescript
function createRNG(seed: number): () => number
```

- 使用 mulberry32 算法，输入整数种子，返回 `() => [0, 1)` 的函数
- 纯函数实现，约 5 行核心代码
- 新游戏未指定种子时，用 `Date.now()` 生成种子

### 2. GameState 变更

**文件**：`src/engine/types.ts`

- `GameState` 新增 `seed: number` 字段

**文件**：`src/engine/game.ts`

- `createGame(dealerIndex, seed?)` 接受可选种子参数
- 未传种子时用 `Date.now()` 自动生成
- 种子号通过 `createRNG(seed)` 创建 PRNG 实例
- PRNG 实例传给 `shuffleWall(tiles, rng)`

**文件**：`src/engine/wall.ts`

- `shuffleWall(tiles, rng)` 新增 `rng` 参数，替代 `Math.random()`

### 3. PRNG 实例管理

PRNG 实例（函数对象）不存入 GameState（不可序列化），而是：

- 在 `useGame` composable 中以模块级变量持有当前 PRNG 实例
- `createGame` 返回 PRNG 实例，由 composable 保存
- `robot.ts` 中 `robotDiscard()` 的 fallback 随机也需要接收 rng 参数

### 4. UI 交互

**游戏开始前**：
- 新游戏按钮改为弹出种子设置面板
- 面板中显示随机生成的种子号（可编辑）
- 用户可手动输入种子号进行重播
- 确认后开始游戏

**游戏进行中**：
- 界面信息栏显示当前种子号

**游戏结束后**：
- 结果面板显示种子号 + "复制"按钮
- 提示文字："输入此种子号可重玩相同牌局"

### 5. 种子号格式

- 10 位数字（如 `3857291046`）
- 输入时接受任意正整数，内部统一处理
- 自动生成的种子使用 `Date.now() % 10000000000` 或类似方式

## 改动范围

| 文件 | 改动类型 | 说明 |
|------|---------|------|
| `src/engine/rng.ts` | 新增 | mulberry32 PRNG 实现 |
| `src/engine/types.ts` | 修改 | GameState 新增 seed 字段 |
| `src/engine/game.ts` | 修改 | createGame 接受 seed 参数 |
| `src/engine/wall.ts` | 修改 | shuffleWall 接受 rng 参数 |
| `src/engine/index.ts` | 修改 | 导出 createRNG |
| `src/robot/robot.ts` | 修改 | fallback 随机使用 rng |
| `src/composables/useGame.ts` | 修改 | 管理 PRNG 实例、种子输入逻辑 |
| `src/components/GameView.vue` | 修改 | 种子设置面板、种子号显示 |

## 不包含的内容

- 不固定机器人行为（仅固定牌序）
- 不引入外部依赖
- 不实现种子号的持久化存储（种子号仅在对局信息中展示）
- 不实现历史种子号列表
