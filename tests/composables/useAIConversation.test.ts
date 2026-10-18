import { describe, expect, it, vi } from 'vitest';
import { effectScope, ref } from 'vue';
import { createGame } from '../../src/engine/game';
import { useAIConversation } from '../../src/composables/useAIConversation';
import type { DiscardRecommendation } from '../../src/engine/advisor';

function setup() {
  const game = createGame(0, 123); game.phase = 'discard'; game.ghostType='jian'; game.ghostValue=3;
  game.hands[0] = [{type:'tong',value:4,id:1},{type:'tiao',value:7,id:2}];
  const state = ref(game);
  const advice: DiscardRecommendation = {currentShanten:1,evaluations: game.hands[0].map(discardTile => ({discardTile, shanten:1,acceptanceCount:1,acceptanceTiles:[{type:'wan',value: discardTile.value,maxCount:4}],waitingTiles:[]}))};
  const answer = vi.fn(async () => ({content:'本地依据的解释',comparison:null}));
  const analyze = vi.fn(async () => ({recommendation:'打七条',reasoning:'测试理由'}));
  const loadAdvice = vi.fn(async () => advice);
  const config = ref({endpoint:'https://example.test',apiKey:'test',model:'test'});
  const scope = effectScope();
  const api = scope.run(() => useAIConversation(state, config, ref(null), {answer,analyze,loadAdvice}))!;
  return {api,state,answer,analyze,loadAdvice,config,scope};
}
describe('AI conversation lifecycle', () => {
  it('asks directly using all candidates and freezes the snapshot across further turns', async () => {
    const {api,state,answer,loadAdvice,scope}=setup();
    api.draft.value='四筒和七条有什么区别'; await api.send();
    expect(loadAdvice.mock.calls[0][4]).toBe(34);
    expect(api.comparison.value?.a.discardTile.value).toBe(4);
    expect(api.messages.value).toHaveLength(2);
    state.value.turnCount++;
    state.value.hands[0][0].value=9;
    expect(api.stale.value).toBe(true);
    api.draft.value='共有的有哪些'; await api.send();
    expect(answer.mock.calls[1][1].game.hands[0][0].value).toBe(4);
    expect(answer.mock.calls[1][3]).toHaveLength(2);
    expect(api.locked.value).toBe(true);
    scope.stop();
  });
  it('uses the existing recommendation when asking why not discard another tile', async () => {
    const {api,scope}=setup();
    await api.analyze();
    api.draft.value='为什么不打四筒'; await api.send();
    expect(api.comparison.value?.a.discardTile.type).toBe('tiao');
    expect(api.comparison.value?.b.discardTile.value).toBe(4);
    scope.stop();
  });
  it('preserves local comparison, draft and successful history after failure; retry adds one exchange', async () => {
    const {api,answer,scope}=setup();
    answer.mockRejectedValueOnce(new Error('offline'));
    api.draft.value='四筒和七条有什么区别'; await api.send();
    expect(api.error.value).toContain('offline');
    expect(api.comparison.value).not.toBeNull();
    expect(api.draft.value).toBe('四筒和七条有什么区别');
    expect(api.messages.value).toHaveLength(0);
    await api.send();
    expect(api.messages.value).toHaveLength(2);
    expect(api.draft.value).toBe('');
    scope.stop();
  });
  it('ignores late answers after cancel/reset and preserves a canceled draft', async () => {
    const {api,answer,scope}=setup();
    let finish!: (v:any)=>void;
    answer.mockImplementationOnce(() => new Promise(resolve=>{finish=resolve;}));
    api.draft.value='四筒和七条有什么区别';
    const pending=api.send();
    await vi.waitFor(()=>expect(answer).toHaveBeenCalled());
    api.cancel();
    expect(api.draft.value).toContain('四筒');
    api.reset();
    finish({content:'旧回答',comparison:null}); await pending;
    expect(api.messages.value).toEqual([]);
    expect(api.snapshot.value).toBeNull();
    expect(api.loading.value).toBe(false);
    scope.stop();
  });
  it('does not let automatic analysis replace an active discussion', async () => {
    const {api,state,analyze,scope}=setup();
    api.draft.value='有哪些进张'; await api.send();
    state.value.turnCount++;
    await api.analyze(true);
    expect(analyze).not.toHaveBeenCalled();
    expect(api.messages.value).toHaveLength(2);
    await api.analyze();
    expect(api.messages.value).toHaveLength(0);
    expect(api.stale.value).toBe(false);
    scope.stop();
  });
  it('keeps an explicitly restarted old snapshot protected from automatic replacement', async () => {
    const {api,state,analyze,scope}=setup();
    api.draft.value='解释';await api.send();
    api.restart();state.value.turnCount++;
    await api.analyze(true);
    expect(analyze).not.toHaveBeenCalled();
    expect(api.stale.value).toBe(true);
    scope.stop();
  });
  it('rejects empty/long questions, missing config and the 21st successful round without losing messages', async () => {
    const {api,answer,config,scope}=setup();
    await api.send(); expect(answer).not.toHaveBeenCalled();
    api.draft.value='长'.repeat(1001); await api.send(); expect(api.error.value).toContain('1000');
    api.draft.value='问题'; config.value.apiKey=''; await api.send(); expect(api.error.value).toContain('设置');
    config.value.apiKey='test';
    for(let i=0;i<20;i++){api.draft.value='解释';await api.send();}
    api.draft.value='再问'; await api.send();
    expect(api.messages.value).toHaveLength(40);
    expect(api.error.value).toContain('20');
    api.restart(); expect(api.snapshot.value).not.toBeNull(); expect(api.messages.value).toHaveLength(0);
    scope.stop();
  });
});
