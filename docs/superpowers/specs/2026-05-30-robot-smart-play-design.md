# 机器人智能对局设计

日期：2026-05-30

## 概述

为机器人增加两个可配置的智能行为：

1. **智能弃牌** — 使用向听数推荐算法的 TOP 1 选择替代现有启发式规则
2. **自摸胡** — 机器人摸牌后自动检测并声明胡牌，结束对局

两个行为均有独立开关，默认关闭，保持现有行为不变。

## 需求

- 机器人弃牌可切换为推荐算法最优选择（TOP 1）
- 机器人可在摸牌后自摸胡牌（仅自摸，不含荣和）
- 两个开关均放在设置弹窗中，持久化到 localStorage
- 开关默认关闭

## 设计

### 1. 设置系统

**文件**: `src/storage/store.ts`

`AppSettings` 新增两个字段：

```typescript
export interface AppSettings {
  autoAnalysis: boolean;
  soundEnabled: boolean;
  robotSmartDiscard: boolean;  // true = 用推荐算法弃牌，默认 false
  robotCanHu: boolean;         // true = 机器人可自摸胡，默认 false
}
```

默认值：

```typescript
const DEFAULT_SETTINGS: AppSettings = {
  autoAnalysis: false,
  soundEnabled: false,
  robotSmartDiscard: false,
  robotCanHu: false,
};
```

**文件**: `src/components/SettingsModal.vue`

在现有 "Auto AI Analysis" checkbox 下方增加两个 checkbox：

- 标签 "机器人智能弃牌"，绑定 `robotSmartDiscard`
- 标签 "机器人自摸胡"，绑定 `robotCanHu`

### 2. 智能弃牌

**文件**: `src/robot/robot.ts`

修改 `robotDiscard` 函数签名，新增 `smartMode` 参数：

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
    // fallback 到原有逻辑（理论上不会走到）
  }
  // ... 原有启发式逻辑不变
}
```

需要在 `robot.ts` 中导入 `getDiscardRecommendation`。

**文件**: `src/composables/useGame.ts`

`executeRobotTurn` 中调用 `robotDiscard` 的地方，传入设置中的 `robotSmartDiscard` 值作为 `smartMode` 参数。

### 3. 机器人自摸胡

**文件**: `src/composables/useGame.ts`

在 `executeRobotTurn` 中，机器人摸牌之后、出牌之前，插入胡牌检查：

```
机器人摸牌 (drawPhase)
  ↓
如果 robotCanHu 开关开启:
  调用 canHu(robotHand, ghostType, ghostValue)
  如果能胡:
    设置 phase = 'hu', winner = currentPlayer
    返回（结束对局）
  ↓
继续现有逻辑（检查加杠、出牌...）
```

使用已有的 `canHu` 函数（来自 `src/engine/hu.ts`）。当机器人胡牌时，`GameResult.vue` 会自动弹出显示胜者信息（已支持 winner 为任意玩家索引）。

## 变更文件清单

| 文件 | 变更 |
|------|------|
| `src/storage/store.ts` | `AppSettings` 新增两个 boolean 字段 |
| `src/components/SettingsModal.vue` | 增加两个 checkbox |
| `src/robot/robot.ts` | `robotDiscard` 新增 `smartMode` 参数，导入 advisor |
| `src/composables/useGame.ts` | 传入 `smartMode` 参数；机器人摸牌后插入胡牌检查 |

## 不在范围内

- 荣和（点炮胡牌）— 仅自摸
- 机器人碰/杠策略优化 — 仅改动弃牌和胡牌
- UI 动画或特殊提示 — 机器人胡牌直接结束对局
