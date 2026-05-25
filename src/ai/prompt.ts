import type { GameState, MeldType } from '../engine/types';
import type { DiscardRecommendation } from '../engine/advisor';
import { getTileName } from '../engine/tile';

const MELD_TYPE_NAMES: Record<MeldType, string> = {
  peng: '碰',
  ming_gang: '明杠',
  an_gang: '暗杠',
  jia_gang: '加杠',
};

export function buildSystemPrompt(): string {
  return `你是一位广东推倒胡麻将策略分析专家。

### 规则要点
- 不允许吃牌（chi），只允许碰（peng）、杠（gang）、胡（hu）
- 有鬼牌（万能牌），鬼牌可以替代任意牌，并且可能有多个鬼牌
- 自摸即赢，没有点炮胡，也没有抢杠胡
- 碰后需要出一张牌。杠后先摸牌，若没有胡牌，需要出一张牌
- 共136张牌：万（1-9）、条（1-9）、筒（1-9）各4张，风牌（东南西北）各4张，箭牌（中发白）各4张
- 牌局阶段如下
  - discard: 出牌阶段，等待出牌。此时手牌14张（含副露），需要出一张
  - reaction: 反应阶段（等待决定碰/杠）

### 出牌阶段决策规则
当用户提供了”算法计算的出牌建议TOP10”时，你的任务是：
1. 从TOP10列表中选择最优的一个出牌，综合考虑向听数、进张数、牌河安全性以及当前牌局情况（弃牌堆、副露）
2. 如果TOP10中有向听数相同的选项，优先选择进张数更大的
3. 如果已听牌（向听数=0），优先选择听牌面最广的

### 注意点
- **不要质疑牌组局势**，直接决策即可
- **优先打孤张风箭牌，其次打边张**：孤张风（东南西北）和箭（中发白）一般最优先打出，其次是不成搭子或者对子的边张（一九）
- **忌“贪大弃胡”**：不要为了硬做清一色、碰碰胡，把已经可以自摸的鸡胡拆掉
- **忌“乱碰乱杠”**：随意碰牌破坏门清，损失平胡或更高番种机会；无谓的明杠可能点炮（被抢杠），也可能帮助对手多摸牌。
- **忌“死抱生张”**：手中危险生张早该处理时不忍舍，到后盘成为“炮弹”。早中盘适度打出生张探路，但后盘必须谨守。
- **忌“拆对子留搭子”**：除非番型必须（如强制平胡），一般不要拆已有的对子去做顺子，对子能碰能当将，价值更高。
- **忌“听口过窄”**：听边张、卡张、单吊且无改良时，若不安全应主动转听，勿等死。
- **忌“丢鬼牌”**：绝对不允许出鬼牌。
- **忌“只看向听数和进张数”**：牌局多变，只看向听数和进张数可能会忽略弃牌堆和对手副露情况，以及通过弃牌堆和对手副露可以推断的关键信息。

### 输出规则
请根据当前牌局状况，分析并给出建议。你的输出必须是JSON格式：
\`\`\`json
{
  "recommendation": "建议的操作",
  "reasoning": "分析原因。精简输出核心理由，不超过300字"
}
\`\`\``;
}

export function buildUserPrompt(game: GameState, playerIndex: number, discardAdvice?: DiscardRecommendation): string {
  const lines: string[] = [];

  // Current player's hand
  const handNames = game.hands[playerIndex].map(getTileName).join('、');
  lines.push(`你的手牌：${handNames}`);

  // Ghost tile
  const ghostName = getTileName({ type: game.ghostType, value: game.ghostValue, id: -1 });
  lines.push(`本局指定鬼牌（万能牌，每局共四张）：${ghostName}`);

  // Wall remaining
  lines.push(`牌墙剩余：${game.wall.length}张`);

  // Current player's melds
  const playerMelds = game.melds[playerIndex];
  if (playerMelds.length > 0) {
    const meldStrs = playerMelds.map(m => {
      const name = MELD_TYPE_NAMES[m.type];
      const tile =  m.tiles.length ? getTileName(m.tiles[0]) : '';
      return `${name}${tile}`;
    });
    lines.push(`你的副露：${meldStrs.join('、')}`);
  }

  // All discards
  const playerLabels = ['你', '西家', '北家', '东家'];
  const discardLines = game.discards.map((discards, i) => {
    const names = discards.map(getTileName).join('、');
    return `${playerLabels[i]}的弃牌：${names || '无'}`;
  });
  lines.push(discardLines.join('\n'));

  // Other players' melds
  for (let i = 0; i < 4; i++) {
    if (i === playerIndex) continue;
    if (game.melds[i].length > 0) {
      const meldStrs = game.melds[i].map(m => {
        const name = MELD_TYPE_NAMES[m.type];
        const tile = m.tiles.length ? getTileName(m.tiles[0]) : '';
        return `${name}${tile}`;
      });
      lines.push(`${playerLabels[i]}的副露：${meldStrs.join('、')}`);
    }
  }

  // Game phase and available actions
  lines.push(`当前阶段：${game.phase}`);
  lines.push(`当前操作玩家：${playerLabels[game.currentPlayer]}`);

  if (game.lastDiscard) {
    lines.push(`最近出牌：${playerLabels[game.lastDiscardPlayer]}打出${getTileName(game.lastDiscard)}`);
  }

  // Discard advisor TOP10 (only in discard phase)
  if (discardAdvice && game.phase === 'discard' && game.currentPlayer === playerIndex) {
    lines.push(`\n### 算法计算的出牌建议TOP10（只根据向听数 + 进张数，排名不代表质量）`);
    lines.push(`当前最优向听数：${discardAdvice.currentShanten}`);
    for (let i = 0; i < discardAdvice.evaluations.length; i++) {
      const e = discardAdvice.evaluations[i];
      const tileName = getTileName(e.discardTile);
      const waiting = e.waitingTiles.map(w => getTileName({ type: w.type, value: w.value, id: -1 })).join('、');
      const acceptance = e.acceptanceTiles.map(a => getTileName({ type: a.type, value: a.value, id: -1 })).join('、');
      lines.push(`${i + 1}. 打${tileName}：向听数=${e.shanten}，进张数=${e.acceptanceCount}${e.shanten === 0 && waiting ? `，听牌：${waiting}` : ''}（进张：${acceptance}）`);
    }
    lines.push(`\n请从以上10个建议中选择最优的一个出牌，给出你的决策。`);
  } else {
    lines.push(`\n请分析当前局面并给出建议。`);
  }

  return lines.join('\n');
}
