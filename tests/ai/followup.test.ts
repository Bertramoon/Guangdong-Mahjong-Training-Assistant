import { describe, it, expect, vi, afterEach } from 'vitest';
import { createGame } from '../../src/engine/game';
import { getDiscardRecommendation } from '../../src/engine/advisor';
import { captureSnapshot, compareDiscards, resolveQuestionTiles, answerQuestion, tileKey } from '../../src/ai/followup';
import type { DiscardEvaluation } from '../../src/engine/advisor';

const ev = (value: number, values: number[]): DiscardEvaluation => ({
  discardTile: { type: 'tong', value, id: value }, shanten: 1, acceptanceCount: values.length,
  acceptanceTiles: values.map(value => ({ type: 'tiao', value, maxCount: 4 })), waitingTiles: [],
});
afterEach(() => vi.unstubAllGlobals());

describe('followup evidence', () => {
  it('captures an independent public snapshot without opponents, real wall, seed or history', () => {
    const game = createGame(0, 54321);
    game.phase = 'discard';
    game.melds[1] = [{ type: 'an_gang', tiles: [{ type: 'tong', value: 9, id: 135 }] }];
    const snapshot = captureSnapshot(game);
    expect(snapshot.game.hands.slice(1)).toEqual([[], [], []]);
    expect(snapshot.game.wall.every(t => t.id === -1)).toBe(true);
    expect(snapshot.game.seed).toBe(0);
    expect(snapshot.game.history).toEqual([]);
    expect(snapshot.game.melds[1]).toEqual([]);
    const before = JSON.stringify(snapshot);
    game.hands[0][0].value = 99;
    expect(JSON.stringify(snapshot)).toBe(before);
  });
  it('computes both differences instead of assuming 6 vs 5 is one extra tile', () => {
    const comparison = compareDiscards([ev(4, [1,2,3,4,5,6]), ev(7, [3,4,5,7,8])], ['tong-4', 'tong-7'])!;
    expect(comparison.common.map(t => t.value)).toEqual([3,4,5]);
    expect(comparison.onlyA.map(t => t.value)).toEqual([1,2,6]);
    expect(comparison.onlyB.map(t => t.value)).toEqual([7,8]);
    expect(compareDiscards([ev(4, [1])], ['tong-4','tong-9'])).toBeNull();
  });
  it('retains default TOP10 while making all legal candidates available', () => {
    const hand = Array.from({ length: 14 }, (_, i) => ({ type: (i < 9 ? 'wan' : 'tong') as 'wan'|'tong', value: i < 9 ? i+1 : i-8, id: i }));
    expect(getDiscardRecommendation(hand, null, null).evaluations).toHaveLength(10);
    const all = getDiscardRecommendation(hand, null, null, 0, 34).evaluations;
    expect(all).toHaveLength(14);
    expect(new Set(all.map(e => tileKey(e.discardTile))).size).toBe(14);
  });
  it('resolves Arabic and Chinese names, recommendation and followup references; rejects illegal tiles', () => {
    const evaluations = [ev(4, [1]),ev(7, [2])];
    expect(resolveQuestionTiles('四筒和7筒有什么区别', evaluations)).toEqual(['tong-4','tong-7']);
    expect(resolveQuestionTiles('为什么不打四筒', evaluations, 'tong-7')).toEqual(['tong-7','tong-4']);
    expect(resolveQuestionTiles('共有的有哪些', evaluations, undefined, ['tong-4','tong-7'])).toEqual(['tong-4','tong-7']);
    expect(() => resolveQuestionTiles('为什么不打九筒', evaluations)).toThrow('合法');
  });
  it('distinguishes future draws from discard choices and does not reject incoming tiles outside the hand', () => {
    const evaluations = [ev(4,[1]), { ...ev(7,[2]), discardTile:{type:'tiao' as const,value:7,id:7} }];
    expect(resolveQuestionTiles('打四筒后摸七条能听牌吗', evaluations, 'tiao-7')).toEqual([]);
    expect(resolveQuestionTiles('为什么打四筒后摸七条能听牌', evaluations, 'tiao-7')).toEqual([]);
    expect(resolveQuestionTiles('打四筒后摸九筒能听牌吗', evaluations)).toEqual([]);
    expect(resolveQuestionTiles('四筒和七条分别有哪些有效进张', evaluations)).toEqual(['tong-4','tiao-7']);
    expect(resolveQuestionTiles('摸四筒和七条有什么区别', evaluations)).toEqual([]);
    expect(resolveQuestionTiles('打四筒后打七条能听牌吗', evaluations)).toEqual([]);
  });
  it('sends local evidence and successful assistant history and validates model comparison references', async () => {
    let body: any;
    vi.stubGlobal('fetch', vi.fn(async (_url, init) => {
      body = JSON.parse(init.body);
      return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ answer: '依据本地数据进行比较', comparisonTiles: ['tong-4','tong-9'] }) } }] }) };
    }));
    const game = createGame(0, 54321); game.phase = 'discard';
    const result = await answerQuestion({ endpoint: 'https://example.test', apiKey:'key', model:'test' }, captureSnapshot(game), [ev(4,[1]),ev(7,[2])], [{role:'assistant',content:'之前的解释'}], '继续解释', null);
    expect(body.messages.some((m: any) => m.role === 'assistant')).toBe(true);
    expect(body.messages[0].content).toContain('未扣除可见牌');
    expect(body.messages[1].content).toContain('tong-4');
    expect(JSON.stringify(body)).not.toContain('54321');
    expect(result.comparison).toBeNull();
    expect(result.content).toContain('依据');
  });
});
