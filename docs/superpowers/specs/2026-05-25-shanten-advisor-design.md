# 出牌建议算法设计：向听数 + 进账枚举法

## 概述

为广东麻将训练助手实现一个出牌建议算法，在出牌阶段（14 张手牌）实时计算每种打法的向听数和进账效率，输出排名前十的出牌建议及其听牌目标。

**核心目标：** 给定 14 张手牌，遍历所有可能的出牌选择，对每种选择评估打出后的牌面质量，按向听数和进账种数排序，给出 Top 10 建议。

## 规则约束

- 广东推倒胡规则：无吃（chi），可碰（peng）可杠（gang）
- 自摸胡牌，不包含点炮胡
- 有鬼牌（癞子），鬼牌可替代任意牌
- 胡牌牌型：标准形（N×面子 + 1×雀头）或七对子
- 牌种：万/条/筒（各 1-9）、风（东南西北）、箭（中发白）

## 算法流程

```
输入: 14 张手牌 + 鬼牌信息
输出: DiscardRecommendation（Top 10 出牌建议）

1. 从手牌中识别鬼牌，分离鬼牌和正常牌
2. 对每张非鬼牌作为候选出牌:
   a. 移除该牌，得到 13 张候选手牌
   b. 对 13 张牌计算向听数 S
   c. 枚举 34 种牌型，对每种牌型:
      - 虚拟加入 1 张，计算新向听数 S'
      - 若 S' < S，标记为进账牌
   d. 统计进账种数和进账牌列表
   e. 若 S = 0（已听牌），进账牌即听牌目标
3. 所有候选出牌按（向听数升序, 进账种数降序）排序
4. 取前 10 名，封装为 DiscardRecommendation 返回
```

## 向听数计算

### 标准形公式

```
向听数 = 8 - 2 × 面子数 - 搭子数
```

- **面子 (mentsu)**：完整的 3 张组合（刻子或顺子）
- **搭子 (taatsu)**：不完整的 2 张组合，包括：
  - 对子（两张相同）
  - 两面搭子（如二万三万，等一万或四万）
  - 嵌张搭子（如一万三万，等二万）
  - 边张搭子（如一万二万，等三万；或八万九万，等七万）
- **雀头**：在公式中视为一种搭子

### 七对子公式

```
向听数 = 6 - 对子数
```

### 最终向听数

```
向听数 = min(标准形向听数, 七对子向听数)
```

### 单花色分解算法

对每种花色独立计算最优分解：

1. 将该花色的牌编码为计数数组（如万=[1,1,0,0,2,0,0,0,0]）
2. 递归提取面子（刻子/顺子）和搭子，回溯搜索最优分解
3. 记录该花色能提供的（面子数, 搭子数）组合

### 跨花色组合

5 个花色各自给出（面子数, 搭子数）组合后，用简单递归（深度 5）分配：
- 约束：总面子数 + 总搭子数 ≤ 4（不含雀头时）或 ≤ 5（含雀头时）
- 恰好 1 个搭子作为雀头
- 找到使向听数最小的分配方案

### 鬼牌处理

1. 从手牌中分离鬼牌
2. 对正常牌计算无鬼向听数
3. 含鬼牌向听数 = max(0, 无鬼向听数 - ghostCount)
4. 精确处理：枚举鬼牌的最优替换位置（替代雀头、补全搭子、形成新搭子等），取向听数最小值

## 进账枚举

对打出某张牌后的 13 张手牌：

1. 计算当前向听数 S
2. 遍历 34 种牌型（万 1-9, 条 1-9, 筒 1-9, 风 1-4, 箭 1-3）
3. 对每种牌型虚拟加入 1 张，重新计算向听数 S'
4. 若 S' < S，该牌为进账牌
5. 若 S = 0（已听牌），进账牌即听牌目标

## 数据结构

```typescript
/** 出牌建议（最终输出） */
interface DiscardRecommendation {
  evaluations: DiscardEvaluation[]; // 前十排名
  currentShanten: number;           // 当前向听数（取所有出牌中的最小值）
}

/** 单个出牌评估 */
interface DiscardEvaluation {
  discardTile: Tile;           // 建议打出的牌
  shanten: number;             // 打出后的向听数
  acceptanceCount: number;     // 进账种数
  acceptanceTiles: AcceptanceTile[]; // 进账详情
  waitingTiles: WaitingTile[];      // 听牌目标（仅 shanten=0）
}

/** 进账牌 */
interface AcceptanceTile {
  type: TileType;
  value: number;
  maxCount: number;  // 理论最大张数（固定 4，不考虑牌池）
}

/** 听牌目标 */
interface WaitingTile {
  type: TileType;
  value: number;
  maxCount: number;
}
```

## 文件结构

```
src/engine/
  shanten.ts           # 向听数计算核心
    - calculateShanten(hand: Tile[], ghostType, ghostValue): number
    - calculateShantenForSuit(counts: number[], suitType: TileType): SuitDecomposition
    - combineSuits(decompositions: SuitDecomposition[], ghostCount: number): number

  advisor.ts            # 出牌建议
    - getDiscardRecommendation(hand: Tile[], ghostType, ghostValue): DiscardRecommendation
    - enumerateAcceptance(hand: Tile[], ghostType, ghostValue, shanten: number): AcceptanceTile[]

src/components/
  DiscardAdvisor.vue   # UI 面板，展示 Top 10 出牌建议
```

## 集成点

- `useGame.ts`：在 `discard` 阶段，手牌变化时调用 `getDiscardRecommendation()` 生成建议
- 建议面板显示在游戏界面侧边，实时更新

## 性能预算

- 14 种候选出牌
- 每种出牌：1 次向听数计算 + 34 次进账判定（每次含 1 次向听数计算）
- 每次向听数计算：5 花色分解 + 跨花色组合递归
- 预估总计：14 × 35 × 5 × ~200 次操作 ≈ 490,000 次操作
- JavaScript 执行时间：约 10-50ms，满足实时要求

## 不做的事

- 不考虑牌池剩余牌数（纯数学概率）
- 不考虑对手策略
- 不做番种计算
- 不预计算查表数据
