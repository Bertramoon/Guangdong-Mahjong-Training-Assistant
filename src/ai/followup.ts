import type { GameState, Tile, TileType } from '../engine/types';
import type { AcceptanceTile, DiscardEvaluation } from '../engine/advisor';
import { getTileName } from '../engine/tile';
import { buildSystemPrompt, buildUserPrompt } from './prompt';
import { callAI, type AIMessage, type AIProviderConfig } from './provider';

export interface AnalysisSnapshot { key: string; game: GameState; context: string }
export interface DiscardComparison {
  a: DiscardEvaluation; b: DiscardEvaluation;
  common: AcceptanceTile[]; onlyA: AcceptanceTile[]; onlyB: AcceptanceTile[];
}
export interface FollowupAnswer { content: string; comparison: DiscardComparison | null }
export const tileKey = (tile: { type: TileType; value: number }) => `${tile.type}-${tile.value}`;
export const tileLabel = (tile: { type: TileType; value: number }) => getTileName({ ...tile, id: -1 });

// Keep only the ordinary player's knowledge, even when the app's reveal setting is enabled.
export function captureSnapshot(source: GameState): AnalysisSnapshot {
  const game: GameState = {
    ...source,
    hands: [source.hands[0], [], [], []],
    melds: source.melds.map((melds, i) => i === 0 ? melds : melds.filter(m => m.type !== 'an_gang')),
    wall: Array.from({ length: source.wall.length }, () => ({ type: 'wan' as const, value: 0, id: -1 })),
    seed: 0, history: [],
  };
  const copy = JSON.parse(JSON.stringify(game)) as GameState;
  const context = buildUserPrompt(copy, 0);
  return { key: JSON.stringify([copy.turnCount, context]), game: copy, context };
}

export function compareDiscards(evaluations: DiscardEvaluation[], keys: string[]): DiscardComparison | null {
  if (keys.length !== 2 || keys[0] === keys[1]) return null;
  const a = evaluations.find(e => tileKey(e.discardTile) === keys[0]);
  const b = evaluations.find(e => tileKey(e.discardTile) === keys[1]);
  if (!a || !b) return null;
  const left = new Set(a.acceptanceTiles.map(tileKey));
  const right = new Set(b.acceptanceTiles.map(tileKey));
  return { a, b, common: a.acceptanceTiles.filter(t => right.has(tileKey(t))), onlyA: a.acceptanceTiles.filter(t => !right.has(tileKey(t))), onlyB: b.acceptanceTiles.filter(t => !left.has(tileKey(t))) };
}

function tileMentions(text: string): { key: string; role: 'discard' | 'incoming' | 'unknown' }[] {
  const mentions: { key: string; role: 'discard' | 'incoming' | 'unknown' }[] = [];
  const values = '一二三四五六七八九';
  const suits: Record<string, TileType> = { 万: 'wan', 条: 'tiao', 筒: 'tong' };
  const pattern = /([一二三四五六七八九1-9])([万条筒])|东风?|南风?|西风?|北风?|红中|发财|白板|(?<=[打出丢弃摸碰杠留、和与])(?:中|发|白)(?=$|[，。？！、和与牌呢吗后有])/g;
  let end = 0;
  let role: 'discard' | 'incoming' | 'unknown' = 'unknown';
  for (const match of text.matchAll(pattern)) {
    const prefix = text.slice(end, match.index);
    if (/[，。？！;；]/.test(prefix)) role = 'unknown';
    for (const verb of prefix.matchAll(/打|出(?!现)|丢|弃|切|摸|抓|进张|等|听|补/g)) {
      role = /打|出|丢|弃|切/.test(verb[0]) ? 'discard' : 'incoming';
    }
    let key: string;
    if (match[1]) key = `${suits[match[2]]}-${Number(match[1]) || values.indexOf(match[1]) + 1}`;
    else if ('东南西北'.includes(match[0][0])) key = `feng-${'东南西北'.indexOf(match[0][0]) + 1}`;
    else key = `jian-${match[0] === '中' ? 1 : match[0] === '发' ? 2 : match[0] === '白' ? 3 : ['红中', '发财', '白板'].indexOf(match[0]) + 1}`;
    mentions.push({ key, role });
    end = match.index! + match[0].length;
  }
  return mentions;
}

export function namedTiles(text: string): string[] {
  return [...new Set(tileMentions(text).map(m => m.key))];
}

const comparisonIntent = (text: string) => /比较|对比|相比|区别|差异|还是|哪[个种]|两[种张]|分别|换成|比.*[更好]/.test(text);

export function resolveQuestionTiles(question: string, evaluations: DiscardEvaluation[], recommendation?: string, previous: string[] = []): string[] {
  const mentions = tileMentions(question);
  const explicit = [...new Set(mentions.filter(m => m.role === 'discard' || (m.role === 'unknown' && comparisonIntent(question))).map(m => m.key))];
  const legal = new Set(evaluations.map(e => tileKey(e.discardTile)));
  if (explicit.some(key => !legal.has(key))) {
    throw new Error('所提方案不是此局面的合法出牌（可能不在手牌中或是鬼牌），请确认牌名。');
  }
  const candidates = explicit.filter(key => legal.has(key));
  if (candidates.length > 2) throw new Error('一次请选择两种出牌进行比较。');
  const incoming = mentions.some(m => m.role === 'incoming');
  if (candidates.length === 2 && comparisonIntent(question)) return candidates;
  if (!incoming && candidates.length === 1 && recommendation && recommendation !== candidates[0] && /不打|不出|为什么|为何|比较|对比|相比|换/.test(question)) return [recommendation, candidates[0]];
  if (mentions.length === 0 && previous.length === 2) return previous;
  return [];
}

export async function answerQuestion(
  config: AIProviderConfig, snapshot: AnalysisSnapshot, evaluations: DiscardEvaluation[],
  history: AIMessage[], question: string, comparison: DiscardComparison | null, signal?: AbortSignal,
): Promise<FollowupAnswer> {
  const evidence = evaluations.map(e => ({ key: tileKey(e.discardTile), discard: tileLabel(e.discardTile), shanten: e.shanten, acceptanceKinds: e.acceptanceTiles.map(tileLabel), acceptanceCount: e.acceptanceTiles.length }));
  const system = buildSystemPrompt().split('### 输出规则')[0] + `
### 追问任务（优先于上文的单次推荐任务）
直接回答玩家问题，并结合下方同一冻结局面的本地证据。有效进张单位是种，未扣除可见牌。
所有合法候选均已计算；数值与具体进张必须引用本地结果，不自行修改。共有及独有牌种由程序展示。
用户引用错误数量时先纠正口径和数值。不得生成未计算的胜率、剩余张数或确定后续路线。
提及摸入牌、听牌或进张，不等于提出弃牌方案；必须区分问题中牌的作用，不把摸入牌当作另一种出牌。
按需解释结构，未经验证的路线只能说是可能。指代不明确时简短澄清，不猜测比较对象。
手牌中的鬼牌不能打；不在本地合法候选中的牌不能作为弃牌方案。
返回JSON：{"answer":"针对问题的解释","comparisonTiles":["两个被比较的候选key"]}。
只有用户明确要求比较且对象清楚时返回两个key；其他情况返回空数组。无需重新推荐或套用300字单次分析格式。`;
  const response = await callAI(config, [
    { role: 'system', content: system },
    { role: 'user', content: `${snapshot.context}\n本地候选证据：${JSON.stringify(evidence)}\n已明确的本地对比：${JSON.stringify(comparison)}` },
    ...history, { role: 'user', content: question },
  ], 0.3, 4096, signal);
  if (response.error) throw new Error(response.error);
  let parsed: { answer?: unknown; comparisonTiles?: unknown };
  try { parsed = JSON.parse(response.content.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()); }
  catch { throw new Error('AI 回答格式无法识别，请重试。'); }
  if (typeof parsed.answer !== 'string' || !parsed.answer.trim()) throw new Error('AI 未返回有效回答，请重试。');
  const keys = Array.isArray(parsed.comparisonTiles) && parsed.comparisonTiles.every(k => typeof k === 'string') ? parsed.comparisonTiles as string[] : [];
  const canInferComparison = comparisonIntent(question) && !tileMentions(question).some(m => m.role === 'incoming');
  return { content: parsed.answer.trim(), comparison: comparison ?? (canInferComparison ? compareDiscards(evaluations, keys) : null) };
}
