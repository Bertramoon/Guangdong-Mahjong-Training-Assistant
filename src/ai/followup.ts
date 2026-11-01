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
  const pattern = /([一二三四五六七八九1-9])([万条筒])|东风?|南风?|西风?|北风?|红中|发财|白板|(?<=[打出丢弃摸碰杠留、和与比])(?:中|发|白)(?=$|[\s,;?!，。？！；、和与牌呢吗后有都也是更会能可各的]|相比|比较|对比|还是|之后|之前)/g;
  let end = 0;
  let role: 'discard' | 'incoming' | 'unknown' = 'unknown';
  for (const match of text.matchAll(pattern)) {
    if (match[0] === '一条' && text[match.index! - 1] === '上' && /^(?:回答|回复|消息)/.test(text.slice(match.index! + match[0].length))) continue;
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

const comparisonIntent = (text: string) => /比较|对比|相比|区别|差异|还是|哪[个种]|两[种张]|分别|各有|各自|换成|比.*[更好]/.test(text);

// Earlier-round claims and counterfactuals are not proposals to discard from this hand.
const earlierRoundQuestion = (text: string) => /前[面几]*[一二三四五六七八九十\d]*(?:轮|回合)|(?:前面|之前|当时|上一轮|上几轮).{0,30}(?:留|打|出|弃|建议|推荐)/.test(text);

function questionScope(text: string): { text: string; historical: boolean } {
  // Track clauses so historical remarks before OR after a current question do not
  // turn their tile names into current candidates. A counterfactual keeps its scope.
  const current: string[] = [];
  let historical = false;
  let counterfactual = false;
  for (const clause of text.split(/[，,。；;！？?]/).map(part => part.trim()).filter(Boolean)) {
    if (/如果|假如|假设|要是/.test(clause)) counterfactual = true;
    if (earlierRoundQuestion(clause)) historical = true;
    else if (/现在|本轮|这轮|当前/.test(clause) && !counterfactual) historical = false;
    if (!historical && !/^(?:我是说|你看|我的意思是|我想问的是)$/.test(clause)) current.push(clause);
  }
  return { text: current.join('，'), historical: current.length === 0 };
}

export function resolveQuestionTiles(question: string, evaluations: DiscardEvaluation[], recommendation?: string, previous: string[] = []): string[] {
  const scope = questionScope(question);
  if (scope.historical) return [];
  question = scope.text;
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
  if (mentions.length === 0 && previous.length === 2 && (comparisonIntent(question) || /共有|独有|进张/.test(question))) return previous;
  return [];
}

function readFollowupReply(content: string): { answer: string; comparisonTiles?: unknown } {
  const text = content.trim();
  if (!text || /^\s*<(?:!doctype\b|html\b|body\b)/i.test(text)) {
    throw new Error('AI 服务未返回有效回答，请重试。');
  }
  const candidates = [text, ...Array.from(text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi), match => match[1].trim())];
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start && /"answer"\s*:/.test(text.slice(start, end + 1))) candidates.push(text.slice(start, end + 1));
  let parsedJSON = false;
  for (const candidate of candidates) {
    let parsed: unknown;
    try { parsed = JSON.parse(candidate); }
    catch { continue; }
    parsedJSON = true;
    if (typeof parsed === 'string' && parsed.trim()) return { answer: parsed.trim() };
    if (parsed && typeof parsed === 'object' && 'answer' in parsed && typeof parsed.answer === 'string' && parsed.answer.trim()) {
      return { answer: parsed.answer.trim(), comparisonTiles: 'comparisonTiles' in parsed ? parsed.comparisonTiles : undefined };
    }
  }
  if (parsedJSON) throw new Error('AI 未返回有效回答，请重试。');
  if (/^[{\[]|^```|\{\s*"(?:answer|comparisonTiles)"\s*:|```json\b/i.test(text)) throw new Error('AI 回答格式不完整或无法识别，请重试。');
  // Some compatible providers ignore JSON output mode. A readable text reply is still usable.
  return { answer: text };
}

export async function answerQuestion(
  config: AIProviderConfig, snapshot: AnalysisSnapshot, evaluations: DiscardEvaluation[],
  history: AIMessage[], question: string, comparison: DiscardComparison | null, signal?: AbortSignal,
): Promise<FollowupAnswer> {
  const evidence = evaluations.map(e => ({ key: tileKey(e.discardTile), discard: tileLabel(e.discardTile), shanten: e.shanten, acceptanceKinds: e.acceptanceTiles.map(tileLabel), acceptanceCount: e.acceptanceTiles.length }));
  const describeKinds = (tiles: AcceptanceTile[]) => ({ count: tiles.length, kinds: tiles.map(tileLabel) });
  const comparisonEvidence = comparison ? {
    a: evidence.find(e => e.key === tileKey(comparison.a.discardTile)),
    b: evidence.find(e => e.key === tileKey(comparison.b.discardTile)),
    common: describeKinds(comparison.common), onlyA: describeKinds(comparison.onlyA), onlyB: describeKinds(comparison.onlyB),
  } : null;
  const system = buildSystemPrompt().split('### 出牌阶段决策规则')[0] + `
### 追问任务
直接回答玩家问题，并结合下方同一冻结局面的本地证据。有效进张单位是种，未扣除可见牌。
用户要求总结“刚才”“上一条”或“上一个回答”时，必须只总结对话中紧邻当前问题之前的最后一条 AI 回答，不能总结更早的话题。
所有合法候选均已计算；数值与具体进张必须引用本地结果，不自行修改。共有及独有牌种由程序展示。
对比中的 count 是程序已算好的牌种数，直接引用，不重新数牌或按进张总数之差猜测共有及独有种数。
用户引用错误数量时先纠正口径和数值。不得生成未计算的胜率、剩余张数或确定后续路线。
牌墙内容和其他玩家的暗牌不可见：即使某种牌没有出现在弃牌或副露中，也不能确定牌墙中有几张，更不能说全部四张都在牌墙；未见牌包括自己的手牌和其他玩家手中的牌，不等于牌墙中的牌。
提及摸入牌、听牌或进张，不等于提出弃牌方案；必须区分问题中牌的作用，不把摸入牌当作另一种出牌。
上下文中的分析建议与本地证据只属于本轮讨论快照，不是前几轮的 AI 建议记录。没有提供历史分析时，不能确认或否认自己前几轮建议过什么，也不能拿本轮数据证明当时的决策正确。
用户说“我是说”或补充澄清时，优先修正对其问题的理解，区分用户描述的历史、当前已知事实与无法核实的历史。
用户讨论“如果前几轮留着北，现在就有一对北”时，应先承接这一留牌的假设：若当时保留且后来仍摸到北，可组成对子。实际后续局面是否相同未经验证，不据此宣称整条路线确定发生；也不能用事后摸牌结果直接判断当时选择对错。
历史假设不受本轮合法弃牌列表约束，不能因为所提牌不在本轮手牌中就拒绝讨论；历史数值没有依据时说明无法精确复算，而不是编造。
按需解释结构，未经验证的路线只能说是可能。指代不明确时简短澄清，不猜测比较对象。
手牌中的鬼牌不能打；不在本地合法候选中的牌不能作为弃牌方案。
直接用自然语言回答，不返回 JSON、代码围栏或候选 key 等内部格式。共有与独有进张的对比由程序负责展示。
无需重新推荐或套用300字单次分析格式。`;
  const response = await callAI(config, [
    { role: 'system', content: system },
    { role: 'user', content: `讨论范围：本轮第 ${snapshot.game.turnCount} 轮的快照。下列本地证据不包含前几轮的分析记录。\n${snapshot.context}\n本地候选证据：${JSON.stringify(evidence)}\n已明确的本地对比：${JSON.stringify(comparisonEvidence)}` },
    ...history, { role: 'user', content: question },
  ], 0.3, 4096, signal, 'text');
  if (response.error) throw new Error(response.error);
  const parsed = readFollowupReply(response.content);
  const keys = Array.isArray(parsed.comparisonTiles) && parsed.comparisonTiles.every(k => typeof k === 'string') ? parsed.comparisonTiles as string[] : [];
  const scope = questionScope(question);
  const canInferComparison = !scope.historical && comparisonIntent(scope.text) && !tileMentions(scope.text).some(m => m.role === 'incoming');
  return { content: parsed.answer.trim(), comparison: comparison ?? (canInferComparison ? compareDiscards(evaluations, keys) : null) };
}
