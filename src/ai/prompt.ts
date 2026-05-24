import type { GameState, MeldType } from '../engine/types';
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
- 即使是胡牌了也继续分析，但是在原因分析中提醒用户“当前可能已经胡牌了”。接着假设当前不是处于自摸阶段，而是碰完需要出牌的阶段，分析应该出什么牌
- 牌局阶段如下
  - discard: 出牌阶段，等待出牌。注意，此时已经是摸完牌的阶段了，总共14张牌，包括手牌和副露。如果没胡牌，需要出牌
  - reaction: 反应阶段（等待决定碰/杠）

### 决策推理步骤
1. **手牌分析**：整理手牌，计算向听数，找出所有可能的搭子、对子、顺子。判断最快胜利可能。
2. **进张效率**：对比不同舍牌选项的进张数、改良机会。
3. **舍牌优先级（仅限未听牌时）：**
  - 先扔孤张幺九（非鬼）。
  - 一般情况下，再扔无法靠张的浮牌、重复的边坎张。
4. **安全度评估**：根据牌河内的现物、舍牌顺序、对手动作，识别“危险牌”（尤其是生张、尖张）。
5. **动作可行性检查**：
   - 若摸入的牌可自摸胡，直接判定“胡”。
   - 若有碰/杠机会：需要权衡，尤其是考虑碰完对当前牌型是否有改善。
   - 若手牌已听牌：选择听牌形态最佳（最大进张数、高番、可改良）的一张舍出。

### 注意点（重要）
- **不要质疑当前牌组局势**: 无需思考我给定的牌组情况和阶段描述是否符合规则，直接思考如何操作即可
- **不应过多思考**：考虑常见打法即可，无需思考冷门打法
- **忌“贪大弃胡”**：不要为了硬做清一色、碰碰胡，把已经可以自摸的鸡胡拆掉。先胡为赢。
- **忌“乱碰乱杠”**：随意碰牌破坏门清，损失平胡或更高番种机会；无谓的明杠可能点炮（被抢杠），也可能帮助对手多摸牌。
- **忌“死抱生张”**：手中危险生张早该处理时不忍舍，到后盘成为“炮弹”。早中盘适度打出生张探路，但后盘必须谨守。
- **忌“拆对子留搭子”**：除非番型必须（如强制平胡），一般不要拆已有的对子去做顺子，对子能碰能当将，价值更高。
- **忌“听口过窄”**：听边张、卡张、单吊且无改良时，若不安全应主动转听，勿等死。
- **忌“丢鬼牌”**: 绝对不允许出鬼牌

### 输出规则
请根据当前牌局状况，分析并给出建议。你的输出必须是JSON格式：
\`\`\`json
{
  "recommendation": "建议的操作",
  "reasoning": "分析原因。精简输出核心理由，不超过300字",
  "alternative": "备选方案（可选）"
}
\`\`\``;
}

export function buildUserPrompt(game: GameState, playerIndex: number): string {
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

  lines.push(`\n请分析当前局面并给出建议。`);

  return lines.join('\n');
}
