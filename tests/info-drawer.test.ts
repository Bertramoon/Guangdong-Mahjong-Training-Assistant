// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import InfoDrawer from '../src/components/InfoDrawer.vue';

const tabs = [
  { id: 'ai', label: 'AI 分析' },
  { id: 'log', label: '日志' },
] as const;

describe('InfoDrawer', () => {
  it('渲染全部 tab 并默认激活第一个', () => {
    const wrapper = mount(InfoDrawer, {
      props: { tabs },
      slots: { ai: '<p>AI内容</p>', log: '<p>日志内容</p>' },
    });
    expect(wrapper.findAll('.drawer-tab')).toHaveLength(2);
    expect(wrapper.findAll('.drawer-tab')[0].classes()).toContain('drawer-tab--active');
    expect(wrapper.text()).toContain('AI内容');
  });

  it('点击 tab 切换到对应插槽内容', async () => {
    const wrapper = mount(InfoDrawer, {
      props: { tabs },
      slots: { ai: '<p>AI内容</p>', log: '<p>日志内容</p>' },
      // 挂到 document 上：happy-dom 的 getComputedStyle 仅对已挂载元素解析样式
      attachTo: document.body,
    });
    await wrapper.findAll('.drawer-tab')[1].trigger('click');
    expect(wrapper.text()).toContain('日志内容');
    // 组件用 v-show 隐藏非激活 pane（textContent 仍包含其文本），改查可见性
    expect(wrapper.findAll('.drawer-pane')[0].isVisible()).toBe(false);
    expect(wrapper.findAll('.drawer-pane')[1].isVisible()).toBe(true);
    expect(wrapper.findAll('.drawer-tab')[1].classes()).toContain('drawer-tab--active');
    wrapper.unmount();
  });

  it('点击把手发出 update:open', async () => {
    const wrapper = mount(InfoDrawer, { props: { tabs } });
    await wrapper.find('.drawer-handle').trigger('click');
    expect(wrapper.emitted('update:open')).toEqual([[false]]);
  });
});
