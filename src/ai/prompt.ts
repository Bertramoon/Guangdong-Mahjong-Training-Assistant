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

规则要点：
- 不允许吃牌（chi），只允许碰（peng）、杠（gang）、胡（hu）
- 每局都会指定任意一种牌作为鬼牌（万能牌），因此鬼牌固定有四张。鬼牌可以替代任意牌，但不能在碰或杠时作为鬼牌使用
- 绝对不允许丢弃鬼牌
- 共136张牌：万（1-9）、条（1-9）、筒（1-9）各4张，风牌（东南西北）各4张，箭牌（中发白）各4张
- 3n + 2的经典组合可胡牌，如果胡牌了就直接告诉用户已经可以胡牌了就行
- 牌局阶段如下
  - draw: 摸牌阶段
  - discard: 出牌阶段，等待出牌。注意，此时已经是摸完牌的阶段了
  - reaction: 反应阶段（等待决定碰/杠）

请根据当前牌局状况，分析并给出建议。你的输出必须是JSON格式：
\`\`\`json
{
  "recommendation": "建议的操作",
  "draws": "如果已经听牌，听哪几张牌",
  "reasoning": "分析原因",
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
