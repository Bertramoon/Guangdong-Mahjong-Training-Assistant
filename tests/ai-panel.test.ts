// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import AIAnalysisPanel from '../src/components/AIAnalysisPanel.vue';
import { captureSnapshot, compareDiscards } from '../src/ai/followup';
import { createGame } from '../src/engine/game';

const base = { result: null, loading: false, error: '', draft: '', canAsk: true };
describe('AI followup panel', () => {
  it('quick questions fill the draft without firing a paid request', async () => {
    const wrapper = mount(AIAnalysisPanel, {props:base});
    await wrapper.get('[data-question="acceptance"]').trigger('click');
    expect(wrapper.emitted('update:draft')?.[0]).toEqual(['有哪些有效进张？']);
    expect(wrapper.emitted('send')).toBeUndefined();
  });
  it('sends on Enter, but not during IME composition or Shift+Enter', async () => {
    const wrapper = mount(AIAnalysisPanel, {props:{...base,draft:'为什么'}});
    const input=wrapper.get('textarea');
    await input.trigger('keydown',{key:'Enter',isComposing:true});
    await input.trigger('keydown',{key:'Enter',shiftKey:true});
    expect(wrapper.emitted('send')).toBeUndefined();
    await input.trigger('keydown',{key:'Enter'});
    expect(wrapper.emitted('send')).toHaveLength(1);
  });
  it('shows the old hand, deterministic comparison and an AI error together', () => {
    const game=createGame(0,123);game.phase='discard';
    const entries=[4,7].map(value=>({discardTile:{type:'tong' as const,value,id:value},shanten:1,acceptanceCount:1,acceptanceTiles:[{type:'wan' as const,value,maxCount:4}],waitingTiles:[]}));
    const wrapper=mount(AIAnalysisPanel,{props:{...base,snapshot:captureSnapshot(game),stale:true,error:'离线',comparison:compareDiscards(entries,['tong-4','tong-7'])}});
    expect(wrapper.text()).toContain('正在讨论此前局面');
    expect(wrapper.text()).toContain('四筒');
    expect(wrapper.text()).toContain('未扣除可见牌');
    expect(wrapper.text()).toContain('离线');
    expect(wrapper.find('[data-action="settings"]').exists()).toBe(true);
  });
  it('offers cancel while busy and prevents duplicate sends', async () => {
    const wrapper=mount(AIAnalysisPanel,{props:{...base,loading:true,draft:'问题'}});
    expect(wrapper.get('[data-action="send"]').attributes('disabled')).toBeDefined();
    await wrapper.get('[data-action="cancel"]').trigger('click');
    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });
  it('preserves text and exposes restarting when the discussion limit is reached', () => {
    const wrapper=mount(AIAnalysisPanel,{props:{...base,atLimit:true,draft:'保留的问题'}});
    expect(wrapper.get('textarea').element.value).toBe('保留的问题');
    expect(wrapper.get('[data-action="send"]').attributes('disabled')).toBeDefined();
    expect(wrapper.text()).toContain('20');
    expect(wrapper.find('[data-action="restart"]').exists()).toBe(true);
  });
});
