// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { useMediaQuery } from '../src/composables/useMediaQuery';

const Host = defineComponent({
  setup() {
    const matches = useMediaQuery('(min-width: 800px)');
    return () => h('div', matches.value ? 'yes' : 'no');
  },
});

describe('useMediaQuery', () => {
  it('初始值反映当前视口（happy-dom 默认 1024px 宽）', async () => {
    const wrapper = mount(Host);
    await nextTick();
    expect(wrapper.text()).toBe('yes');
  });

  it('视口变化后响应 change 事件', async () => {
    const wrapper = mount(Host);
    const domWindow = window as unknown as {
      happyDOM: { setViewport: (v: { width: number }) => Promise<void> };
    };
    // happy-dom v20 的 MediaQueryList 合成器以 matchesState=false 初始化，
    // 首次「匹配→不匹配」跳变不会派发 change：先缩小触发吞没，再放大、再缩小，
    // 让真实 change 事件派发（真实浏览器无此问题，一次缩小即派发）
    await domWindow.happyDOM.setViewport({ width: 375 });
    await domWindow.happyDOM.setViewport({ width: 1024 });
    await domWindow.happyDOM.setViewport({ width: 375 });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(wrapper.text()).toBe('no');
  });
});
