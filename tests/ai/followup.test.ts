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
    expect(resolveQuestionTiles('打四筒和打七筒各有多少进张？', evaluations)).toEqual(['tong-4','tong-7']);
    expect(resolveQuestionTiles('打四筒和打七筒各自的独有进张是什么？', evaluations)).toEqual(['tong-4','tong-7']);
    expect(resolveQuestionTiles('为什么不打四筒', evaluations, 'tong-7')).toEqual(['tong-7','tong-4']);
    expect(resolveQuestionTiles('共有的有哪些', evaluations, undefined, ['tong-4','tong-7'])).toEqual(['tong-4','tong-7']);
    expect(resolveQuestionTiles('你刚才的结论用一句话总结。', evaluations, undefined, ['tong-4','tong-7'])).toEqual([]);
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
  it.each(['把打北和打白相比呢？', '打北还是打白更好？', '打白和打北比较一下', '打北和打白相比呢?', '北和白都是3向听17种，有区别吗？', '打北和打白各自的独有进张是什么？'])('resolves white-dragon shorthand in %s', question => {
    const evaluations = [
      { ...ev(1,[1]), discardTile: { type:'feng' as const, value:4, id:1 } },
      { ...ev(2,[2]), discardTile: { type:'jian' as const, value:3, id:2 } },
    ];
    const keys = resolveQuestionTiles(question, evaluations);
    expect(new Set(keys)).toEqual(new Set(['feng-4','jian-3']));
    expect(compareDiscards(evaluations, keys)).not.toBeNull();
  });
  it('does not treat ordinary words containing dragon abbreviations as tile comparisons', () => {
    expect(resolveQuestionTiles('我现在明白了，不过你这个说法和之前相比有什么区别？', [ev(4,[1])])).toEqual([]);
    expect(resolveQuestionTiles('上一条回答比较的是九筒和四筒，请只总结那个比较。', [ev(4,[1]),ev(9,[2])])).toEqual(['tong-9','tong-4']);
  });
  it('recognizes comparison wording before abbreviated dragon tiles', () => {
    const entries = [
      { ...ev(1,[1]), discardTile: { type:'jian' as const, value:2, id:1 } },
      { ...ev(2,[2]), discardTile: { type:'jian' as const, value:3, id:2 } },
    ];
    expect(resolveQuestionTiles('对比发和白的共有及独有进张。', entries)).toEqual(['jian-2','jian-3']);
  });
  it('supplies computed common and exclusive counts without raw maxCount fields', async () => {
    let body:any;
    vi.stubGlobal('fetch',vi.fn(async (_url,init)=>{
      body=JSON.parse(init.body);
      return {ok:true,json:async()=>({choices:[{message:{content:'按本地结果解释'}}]})};
    }));
    const entries=[ev(4,[1,2,3,4,5,6]),ev(7,[3,4,5,7,8])];
    const comparison=compareDiscards(entries,['tong-4','tong-7'])!;
    await answerQuestion({endpoint:'https://example.test',apiKey:'test',model:'test'},captureSnapshot(createGame(0,123)),entries,[],'比较四筒和七筒',comparison);
    const local=JSON.parse(body.messages[1].content.split('已明确的本地对比：')[1]);
    expect(local.common).toEqual({count:3,kinds:['三条','四条','五条']});
    expect(local.onlyA).toEqual({count:3,kinds:['一条','二条','六条']});
    expect(local.onlyB).toEqual({count:2,kinds:['七条','八条']});
    expect(JSON.stringify(body)).not.toContain('maxCount');
  });
  it('does not validate historical or counterfactual discards against the current hand', () => {
    const evaluations = [ev(4,[1]),ev(7,[2])];
    expect(resolveQuestionTiles('前几轮你让我打北，为什么不留着', evaluations)).toEqual([]);
    expect(resolveQuestionTiles('我是说，如果我前面几轮留着北，现在就有一对北了，但是你前面让我弃牌了', evaluations)).toEqual([]);
    expect(resolveQuestionTiles('如果当时留着北而不是打四筒，两种选择有什么区别', evaluations, 'tong-7', ['tong-4','tong-7'])).toEqual([]);
    expect(resolveQuestionTiles('前几轮你让我留北；现在四筒和七筒选哪个？', evaluations)).toEqual(['tong-4','tong-7']);
    expect(resolveQuestionTiles('之前你让我打北，但现在四筒和七筒有什么区别？', evaluations)).toEqual(['tong-4','tong-7']);
    expect(resolveQuestionTiles('现在四筒和七筒有什么区别？之前你让我打北', evaluations)).toEqual(['tong-4','tong-7']);
    expect(resolveQuestionTiles('如果当时留着北，现在打四筒还是七筒好？', evaluations)).toEqual([]);
  });
  it.each([
    ['plain text', '明白，你说的是前几轮留北的假设。若保留原来的北且后来仍摸到北，就能组成一对。'],
    ['JSON preceded by prose', '回答如下：\n```json\n{"answer":"这是关于先前留北的假设。","comparisonTiles":[]}\n```'],
    ['uppercase code fence', '```JSON\n{"answer":"这是关于先前留北的假设。"}\n```'],
  ])('accepts a readable %s response to the exact clarification', async (_name, content) => {
    vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({choices:[{message:{content}}]})})));
    const game=createGame(0,123);game.phase='discard';
    const result=await answerQuestion({endpoint:'https://example.test',apiKey:'test',model:'test'},captureSnapshot(game),[ev(4,[1])],[],
      '我是说，如果我前面几轮留着北，现在就有一对北了，但是你前面让我弃牌了',null);
    expect(result.content).toContain('北');
    expect(result.content).not.toContain('```');
    expect(result.content).not.toContain('"answer"');
    expect(result.comparison).toBeNull();
  });
  it('does not present incomplete JSON or a service HTML error as a successful answer', async () => {
    const game=createGame(0,123);
    for(const content of ['{"answer":"未完整返回', '回答如下：\n{"answer":"未完整返回', '<html><body>502 Bad Gateway</body></html>', '{}']) {
      vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({choices:[{message:{content}}]})})));
      await expect(answerQuestion({endpoint:'https://example.test',apiKey:'test',model:'test'},captureSnapshot(game),[],[],'解释',null)).rejects.toThrow();
    }
  });
  it('marks local evidence as current and tells the model not to invent earlier-round recommendations', async () => {
    let body:any;
    vi.stubGlobal('fetch',vi.fn(async (_url,init)=>{
      body=JSON.parse(init.body);
      return {ok:true,json:async()=>({choices:[{message:{content:'{"answer":"按用户描述讨论先前的假设。","comparisonTiles":["tong-4","tong-7"]}'}}]})};
    }));
    const game=createGame(0,123);game.turnCount=8;
    const result=await answerQuestion({endpoint:'https://example.test',apiKey:'test',model:'test'},captureSnapshot(game),[ev(4,[1]),ev(7,[2])],[],
      '如果当时留着北而不是打四筒，两种选择有什么区别',null);
    expect(body.messages[0].content).toContain('不能确认或否认');
    expect(body.messages[0].content).toContain('事后');
    expect(body.messages[1].content).toContain('本轮第 8 轮');
    expect(result.comparison).toBeNull();
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
    expect(body.messages[0].content).toContain('不能确定牌墙中');
    expect(body).not.toHaveProperty('response_format');
    expect(body.messages[0].content).not.toContain('返回JSON：');
    expect(body.messages[1].content).toContain('tong-4');
    expect(JSON.stringify(body)).not.toContain('54321');
    expect(result.comparison).toBeNull();
    expect(result.content).toContain('依据');
  });
});
