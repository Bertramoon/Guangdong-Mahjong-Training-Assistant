# 单局结算、杠分与买马设计

## 背景

当前结算只展示胡牌番型与 `2^总番` 的基础分，没有计算：

- 明杠、暗杠、加杠产生的杠分；
- 胡牌后买马对最终胡牌分数的影响；
- 四家最终净输赢；
- 固定预留 6 张牌导致的流局边界；
- 本局庄家与后续庄家流转。

本设计只处理**单局结算**。未来如果要做多局累计，直接把每局输出的四家 `balances` 逐位累加即可。

## 规则确认

### 基础番数

沿用现有计分约定：

- 鸡胡 = 0 番；
- 基础分 `baseScore = 2^总番`；
- 自摸、杠上开花等番型仍由 `calculateFan` 负责；
- 本阶段仍只考虑自摸胡，不引入点炮/抢杠胡。

### 牌墙预留与流局

牌墙固定预留 **6 张**，这 6 张不参与摸牌。

- 普通摸牌、杠后补牌都不能摸走预留 6 张；
- 若剩余牌数已经不能继续摸牌，即只剩预留 6 张且无人胡牌，则本局流局；
- 流局时胡牌账和杠账都不结算，四家净分全为 0。

### 买马

胡牌后从预留牌中翻马。

翻牌数量由赢家牌型是否使用鬼牌决定：

| 赢家牌型 | 翻牌数量 |
| --- | --- |
| 含鬼牌 | 4 张 |
| 无鬼牌 | 6 张 |

“是否含鬼牌”按赢家最终胡牌手牌与副露中是否存在本局鬼牌判断。若赢家手牌/副露中有 `ghostType + ghostValue` 的牌，则翻 4 张；否则翻 6 张。

中马按**庄家相对位置**判断，而不是按固定座位风判断：

| 相对庄家位置 | 中马牌 |
| --- | --- |
| 庄家 | 1、5、9、东、中 |
| 庄家下家 | 2、6、南、发 |
| 庄家对家 | 3、7、西、白 |
| 庄家上家 | 4、8、北 |

每张马先映射到一个相对庄家位置，再映射到实际玩家。只有映射到赢家位置的马计入 `horseCount`。

最终胡牌分数：

```text
finalHuScore = baseScore × (horseCount + 1)
```

胡牌账：

```text
赢家 += 3 × finalHuScore
其余三家各 -= finalHuScore
```

### 杠分

杠分独立于买马倍率，只按面值结算；但只有本局有人胡牌时才生效，流局时所有杠分作废。

| 杠类型 | 付分方式 |
| --- | --- |
| 明杠 | 杠者 +3，放杠者 -3 |
| 加杠 | 杠者 +3，其余三家各 -1 |
| 暗杠 | 杠者 +6，其余三家各 -2 |

### 庄家流转

- 第一把庄家固定为玩家 0；
- 有人胡牌后，下一把庄家变为上一把赢家；
- 流局时庄家不变；
- 庄家只需保存在内存中，不持久化。

## 设计目标

1. 单局结束时能展示四家净输赢。
2. 胡牌分数正确纳入买马：`2^总番 × (中马数 + 1)`。
3. 杠分独立结算，流局作废。
4. 牌墙固定预留 6 张，避免游戏摸走买马牌。
5. 庄家状态支持单次会话内流转，为未来多局累计留接口。
6. 结算逻辑保持纯函数，便于测试与未来累计。

## 非目标

- 不实现多局累计积分榜；
- 不持久化庄家或积分；
- 不新增点炮、抢杠胡；
- 不改变既有番型计算规则；
- 不把杠分并入番数或买马倍率。

## 数据模型

新增 `src/engine/settlement.ts`。

```ts
export type SettlementKind = 'hu' | 'ming_gang' | 'an_gang' | 'jia_gang';

export interface SettlementLine {
  kind: SettlementKind;
  label: string;
  deltas: number[]; // 长度 4，该明细造成的四家净变动
}

export interface Settlement {
  balances: number[];      // 长度 4，四家净输赢，sum 恒为 0
  lines: SettlementLine[]; // 胡牌行 + 杠行
  isDraw: boolean;
  baseScore: number;       // 2^总番
  finalHuScore: number;    // baseScore × (horseCount + 1)
  horseCount: number;      // 赢家中马数
  horseTiles: Tile[];      // 实际翻出的马牌
}
```

`multiplier` 不作为字段保存，因为它永远等于 `horseCount + 1`，保存会形成重复状态。需要展示时直接计算。

## 结算函数

```ts
export function computeSettlement(params: {
  winner: number | null;
  melds: Meld[][];
  hands: Tile[][];
  huResult: FanResult | null;
  dealerIndex: number;
  reserveTiles: Tile[];
  ghostType: TileType;
  ghostValue: number;
}): Settlement
```

### 处理流程

1. 若 `winner === null || winner < 0 || huResult === null`：
   - 返回流局结算；
   - `balances = [0, 0, 0, 0]`；
   - `lines = []`；
   - `isDraw = true`。
2. 判断赢家牌型是否含鬼牌：
   - 检查 `hands[winner]` 与 `melds[winner].tiles` 中是否有 `ghostType + ghostValue`；
   - 有鬼牌翻 4 张，否则翻 6 张。
3. 从 `reserveTiles` 中取对应数量的马牌。
4. 按庄家位置映射每张马所属玩家，统计落在赢家位置的数量为 `horseCount`。
5. 计算：
   - `baseScore = huResult.score`；
   - `finalHuScore = baseScore * (horseCount + 1)`。
6. 生成胡牌明细：
   - 赢家 `+3 * finalHuScore`；
   - 其他玩家各 `-finalHuScore`。
7. 扫描四家副露，生成杠明细：
   - `ming_gang`：杠者 +3，`meld.source` -3；
   - `jia_gang`：杠者 +3，其他三家各 -1；
   - `an_gang`：杠者 +6，其他三家各 -2。
8. 将所有明细 `deltas` 逐位累加为 `balances`。

## 牌墙预留改动

当前 `drawPhase` 只在 `wall.length === 0` 时流局。需要改为固定保留 6 张。

建议新增常量：

```ts
export const RESERVED_HORSE_TILE_COUNT = 6;
```

摸牌逻辑：

```ts
if (game.wall.length <= RESERVED_HORSE_TILE_COUNT) {
  return { ...game, phase: 'draw_end', winner: -1 };
}
```

普通摸牌与杠后补牌都走同一规则，保证预留牌不会被摸走。

`createGame` 当前把鬼牌翻出后又放回牌墙末尾。该行为可保持；预留 6 张从最终牌墙末尾取得。

## 明杠来源记录

`Meld` 类型已有 `source?: number`，但当前创建明杠时未赋值。

修改 `mingGangPhase`：

```ts
const { hand, meld } = createMingGang(game.hands[playerIndex], game.lastDiscard);
const gangMeld = { ...meld, source: game.lastDiscardPlayer };
```

然后写入 `gangMeld`。结算明杠时依赖该字段扣放杠者 3 分。

加杠和暗杠无需来源字段，因为都是三家均摊。

## 庄家状态

在 `useGame` 内增加内存状态：

```ts
const dealerIndex = ref(0);
```

开始新局时：

```ts
let game = createGame(dealerIndex.value, seed);
```

局结束后：

- 胡牌：`dealerIndex.value = winner`，用于下一局；
- 流局：不修改 `dealerIndex`。

为了避免用户点击“重播本局”改变庄家，重播应使用当前 seed 重建牌局，但不推进庄家。若需要完整复现某局庄家，后续可在重播入口额外传入当局 dealerIndex；本期只保证正常连续开局的庄家流转。

## UI 展示

`GameResult.vue` 新增 `settlement` prop。

保留现有番型展示，并新增：

1. 买马信息：
   - `基础分：baseScore`；
   - `中马：horseCount`；
   - `胡牌分：baseScore × (horseCount + 1) = finalHuScore`；
   - 展示翻出的马牌列表。
2. 四家总账：
   - 玩家 0：你；
   - 玩家 1/2/3：机器人 1/2/3；
   - 正分、负分、0 分用不同颜色区分。
3. 明细列表：
   - 自摸胡明细；
   - 每条杠明细。

流局时展示：

- “流局”；
- “杠分作废”；
- 四家净分全 0。

## 测试计划

新增 `tests/engine/settlement.test.ts`。

覆盖：

1. 无杠、自摸、0 中马：
   - `finalHuScore = baseScore`；
   - 赢家 +3 倍，其余各 -1 倍。
2. 无杠、自摸、N 中马：
   - `finalHuScore = baseScore × (N + 1)`。
3. 有鬼牌翻 4 张，无鬼牌翻 6 张。
4. 庄家、庄下家、庄对家、庄上家的马牌映射正确。
5. 明杠：杠者 +3，放杠者 -3。
6. 暗杠：杠者 +6，其余各 -2。
7. 加杠：杠者 +3，其余各 -1。
8. 胡牌账 + 多条杠账可叠加，`balances` 总和为 0。
9. 流局时所有杠作废，`balances` 全 0。

补充 `tests/engine/game.test.ts`：

1. `drawPhase` 在只剩 6 张时流局；
2. 普通摸牌不会摸走预留 6 张；
3. 杠后补牌也不会摸走预留 6 张；
4. 明杠 meld 正确记录 `source`。

## 未来扩展

多局累计时新增会话级积分：

```ts
sessionScores[i] += settlement.balances[i];
```

庄家已经在内存中流转，后续只需把总分表展示到 UI，不需要改 `computeSettlement`。

## 验收标准

- 胡牌结算显示四家净输赢；
- 买马按庄家相对位置计算，只统计赢家中马数；
- 最终胡牌分为 `2^总番 × (中马数 + 1)`；
- 杠分只在有人胡牌时结算，流局作废；
- 牌墙固定预留 6 张，剩余 6 张时流局；
- 庄家首局为玩家 0，后续由上一把赢家接庄，流局不变；
- 新增结算相关测试全部通过；
- 任意结算结果 `balances.reduce((a, b) => a + b, 0) === 0`。
