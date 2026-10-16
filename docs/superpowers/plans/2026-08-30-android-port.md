# Android 移植（Capacitor）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有 Vue 3 麻将游戏打包为安卓 APK（Capacitor 8），横屏锁定，并提供手机横屏专属的「牌桌 + 右侧信息抽屉」布局。

**Architecture:** 在仓库中新增 Capacitor 原生壳（`android/`），WebView 加载 `dist/` 产物；游戏逻辑零改动。UI 层新增 `InfoDrawer` 组件与 `useMediaQuery`/`useBackButton` 两个 composable，`GameView` 按媒体查询在「桌面原布局」与「紧凑布局」间切换。

**Tech Stack:** Capacitor 8.x（core/android/cli/app/toast/assets）、Vue 3 + Vite 6 + vitest（新增 @vue/test-utils + happy-dom 做组件测试）、Gradle debug 签名。

**Spec:** `docs/superpowers/specs/2026-08-30-android-port-design.md`（执行者请同时阅读本计划与规格）

## Global Constraints

- Capacitor **8.x**（要求 Node ≥22，本机 v24.15.0 ✅）
- `appId: 'com.bertramoon.mahjong'`，`appName: '广东麻将训练助手'`，`webDir: 'dist'`
- `src/` 业务逻辑零改动；UI 适配仅限：`GameView.vue`、`GameBoard.vue`、`PlayerHand.vue` 的样式/模板 + 新组件（InfoDrawer）与新 composable
- 紧凑布局**仅在** `@media (orientation: landscape) and (max-height: 520px)` 生效，桌面浏览器布局零回归
- 触摸目标 ≥ 44dp；debug 签名（零配置）
- 本机环境：`ANDROID_HOME=D:\code\androidsdk`（已装 `platforms;android-36`、`build-tools;36.0.0`、platform-tools、licenses 已接受）；`JAVA_HOME` → JDK 25（Gradle 不兼容时的缓解见 Task 2）
- 提交信息：中文 + conventional 前缀（`feat:` / `chore:` / `docs:`），与仓库现有风格一致
- 所有 shell 命令均为 PowerShell（Windows）

---

### Task 1: Capacitor 工程初始化

**Files:**
- Modify: `package.json`（依赖 + 脚本）
- Modify: `tsconfig.node.json:6`（include 数组）
- Modify: `.gitignore`（追加安卓相关）
- Create: `capacitor.config.ts`
- Create: `android/`（`cap add android` 生成，整体提交）

**Interfaces:**
- Consumes: 现有 `npm run build` 产出 `dist/`
- Produces: `capacitor.config.ts`（后续任务引用其中 `plugins.CapacitorHttp`）；npm 脚本 `android:build` / `android:install` / `android:dev`（Task 2/8 使用）

- [ ] **Step 1: 安装 Capacitor 依赖**

```powershell
npm install @capacitor/core@^8 @capacitor/android@^8
npm install -D @capacitor/cli@^8
```

- [ ] **Step 2: 创建 capacitor.config.ts**

创建 `capacitor.config.ts`：

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bertramoon.mahjong',
  appName: '广东麻将训练助手',
  webDir: 'dist',
  android: { allowMixedContent: true },
  plugins: {
    CapacitorHttp: { enabled: true },
  },
};

export default config;
```

- [ ] **Step 3: 把 capacitor.config.ts 纳入 node 侧 TS 工程**

修改 `tsconfig.node.json` 第 6 行：

```json
  "include": ["vite.config.ts", "capacitor.config.ts"]
```

- [ ] **Step 4: 构建网页产物并生成 android 工程**

```powershell
npm run build
npx cap add android
npx cap ls android
```

Expected: `cap add` 输出 "Adding native android project..." 且末尾提示 sync 完成；`cap ls` 列出 `@capacitor/core` 等官方插件，无 missing 报错。

- [ ] **Step 5: 整理 .gitignore**

检查 `android/.gitignore`（生成器自带）是否包含 `app/build`、`local.properties`、`app/src/main/assets/public`；然后在**根** `.gitignore` 末尾追加（保留现有 4 行不动）：

```
# Capacitor / Android
android/.gradle
android/app/build
android/build
android/local.properties
android/app/src/main/assets/public
android/capacitor-cordova-android-plugins
```

- [ ] **Step 6: 添加 android 脚本**

修改 `package.json` 的 `scripts`，在 `"test:watch"` 之后追加三行：

```json
    "android:build": "vue-tsc -b && vite build && cap sync",
    "android:install": "npm run android:build && cap run android",
    "android:dev": "cap run android -l --external"
```

- [ ] **Step 7: 提交**

```powershell
git add capacitor.config.ts tsconfig.node.json package.json package-lock.json .gitignore android/
git commit -m "chore: 引入 Capacitor 安卓工程"
```

---

### Task 2: 安卓原生配置（横屏 / cleartext / 沉浸式）与首次构建

**Files:**
- Modify: `android/app/src/main/AndroidManifest.xml`
- Modify: `android/app/src/main/java/com/bertramoon/mahjong/MainActivity.java`
- Verify: `android/app/build/outputs/apk/debug/app-debug.apk`

**Interfaces:**
- Consumes: Task 1 的 android 工程
- Produces: 可产出的 debug APK；`sensorLandscape` 方向配置（Task 6 布局的前提）；`CapacitorHttp` 在原生层的可用性

- [ ] **Step 1: AndroidManifest — 锁横屏 + 允许明文**

打开 `android/app/src/main/AndroidManifest.xml`：

1. 给 `<application>` 标签加属性（与现有属性并列）：

```xml
        android:usesCleartextTraffic="true"
```

2. 给 `<activity android:name=".MainActivity" ...>` 标签加属性：

```xml
            android:screenOrientation="sensorLandscape"
```

- [ ] **Step 2: MainActivity — 沉浸式隐藏系统栏**

修改 `android/app/src/main/java/com/bertramoon/mahjong/MainActivity.java`，在文件头部 import 区追加：

```java
import android.os.Bundle;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
```

（`android.os.Bundle` 若已存在则跳过；Capacitor 模板的 onCreate 通常是 `protected void onCreate(Bundle savedInstanceState)`，且部分模板把 onCreate 写在括号内联形式 `public class MainActivity extends BridgeActivity {}` 无 onCreate——若无 onCreate 则新增如下方法体。）

将类体改为：

```java
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WindowInsetsControllerCompat insets =
            new WindowInsetsControllerCompat(getWindow(), getWindow().getDecorView());
        insets.setSystemBarsBehavior(
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        insets.hide(WindowInsetsCompat.Type.systemBars());
    }
}
```

- [ ] **Step 3: 首次 gradle 构建（含 JDK 25 兼容性验证）**

```powershell
npx cap sync android
```

然后在 `android/` 目录下（用 bash 工具时传 `workdir: "android"`）：

```powershell
.\gradlew.bat assembleDebug
```

Expected: `BUILD SUCCESSFUL`，产物在 `android/app/build/outputs/apk/debug/app-debug.apk`。

- [ ] **Step 4:（仅当 Step 3 失败）JDK 25 → JDK 21 缓解**

若报错含 `Unsupported class file major version` / `Could not determine java version`：

```powershell
winget install EclipseAdoptium.Temurin.21.JDK
Get-ChildItem "C:\Program Files\Eclipse Adoptium" | Select-Object -ExpandProperty Name
```

然后创建/编辑 `android/gradle.properties`，追加一行（路径替换为上一步实际目录）：

```
org.gradle.java.home=C:/Program Files/Eclipse Adoptium/jdk-21.0.9.10-hotspot
```

重新运行 Step 3 的 `.\gradlew.bat assembleDebug`。

- [ ] **Step 5: 提交**

```powershell
git add android/app/src/main/AndroidManifest.xml android/app/src/main/java android/gradle.properties
git commit -m "chore: 安卓横屏锁定、沉浸式全屏与明文流量配置"
```

---

### Task 3: index.html viewport 与全局触屏 CSS

**Files:**
- Modify: `index.html:5`
- Modify: `src/styles/base.css`（文件末尾追加）

**Interfaces:**
- Consumes: 无
- Produces: `env(safe-area-inset-*)` 生效的前提（viewport-fit=cover）；全局禁缩放/禁橡皮筋（Task 6 紧凑布局的触屏前提）

- [ ] **Step 1: index.html — viewport 禁缩放 + 刘海安全区**

把第 5 行：

```html
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

替换为：

```html
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
```

> 注：`index.html` 引用了 Google Fonts，离线时加载失败会自动回退系统字体，不影响功能。

- [ ] **Step 2: base.css — 触屏基础行为**

在 `src/styles/base.css` 文件末尾追加：

```css
/* —— 移动端 / WebView 适配 —— */
/* 撑满视口，禁橡皮筋滚动与双击缩放（页面本身不滚动，由内部面板滚动） */
html,
body,
#app {
  height: 100%;
}
body {
  overscroll-behavior: none;
  -webkit-tap-highlight-color: transparent;
}
button,
[role='button'] {
  touch-action: manipulation;
}
```

- [ ] **Step 3: 验证不破坏现有页面**

```powershell
npm run build
npm test
```

Expected: build 与全部 vitest 用例通过。

再起 `npm run dev`，浏览器打开确认桌面外观与之前一致（标题字体、按钮、面板无异常）。

- [ ] **Step 4: 提交**

```powershell
git add index.html src/styles/base.css
git commit -m "chore: 视口禁缩放与触屏基础行为，为移动端适配打底"
```

---

### Task 4: Android 返回键（TDD）

**Files:**
- Create: `src/composables/useBackButton.ts`
- Test: `tests/use-back-button.test.ts`
- Modify: `package.json`（新增 `@capacitor/app`、`@capacitor/toast` 依赖）
- Modify: `src/components/GameView.vue`（script 区新增 onMounted 监听）

**Interfaces:**
- Consumes: `GameView.vue` 现有的 `showSettings: Ref<boolean>`、`revealMode: Ref<boolean>`
- Produces: `resolveBackAction(state: BackState): BackAction`（纯函数，已被单测覆盖）；GameView 挂载的原生返回键监听

- [ ] **Step 1: 安装插件依赖**

```powershell
npm install @capacitor/app @capacitor/toast
npx cap sync android
```

- [ ] **Step 2: 写失败测试**

创建 `tests/use-back-button.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { resolveBackAction } from '../src/composables/useBackButton';

describe('resolveBackAction', () => {
  it('设置弹窗打开时优先返回关闭设置', () => {
    expect(
      resolveBackAction({ settingsOpen: true, revealMode: true, exitArmed: true })
    ).toBe('close-settings');
  });

  it('无弹窗但处于复盘模式时返回关闭复盘', () => {
    expect(
      resolveBackAction({ settingsOpen: false, revealMode: true, exitArmed: false })
    ).toBe('close-reveal');
  });

  it('无弹窗且未武装时返回 arm-exit（提示再按一次）', () => {
    expect(
      resolveBackAction({ settingsOpen: false, revealMode: false, exitArmed: false })
    ).toBe('arm-exit');
  });

  it('武装期内第二次按下返回 exit', () => {
    expect(
      resolveBackAction({ settingsOpen: false, revealMode: false, exitArmed: true })
    ).toBe('exit');
  });
});
```

- [ ] **Step 3: 运行测试确认失败**

```powershell
npx vitest run tests/use-back-button.test.ts
```

Expected: FAIL，`Cannot find module '../src/composables/useBackButton'`。

- [ ] **Step 4: 实现 composable**

创建 `src/composables/useBackButton.ts`：

```ts
export type BackAction = 'close-settings' | 'close-reveal' | 'arm-exit' | 'exit';

export interface BackState {
  settingsOpen: boolean;
  revealMode: boolean;
  exitArmed: boolean;
}

/** 返回键动作裁决：弹窗 > 复盘模式 > 双击退出武装窗口 */
export function resolveBackAction(state: BackState): BackAction {
  if (state.settingsOpen) return 'close-settings';
  if (state.revealMode) return 'close-reveal';
  return state.exitArmed ? 'exit' : 'arm-exit';
}
```

- [ ] **Step 5: 运行测试确认通过**

```powershell
npx vitest run tests/use-back-button.test.ts
```

Expected: 4 个用例 PASS。

- [ ] **Step 6: GameView 接线**

修改 `src/components/GameView.vue` 的 `<script setup>`：

1. 在 Vue import 中补充 `onMounted`（若未引入）。
2. import 区追加：

```ts
import { Capacitor } from '@capacitor/core';
import { resolveBackAction } from '../composables/useBackButton';
```

3. setup 主体内（现有 ref 定义之后）追加：

```ts
// Android 返回键：关弹窗 → 退复盘 → 2 秒内双击退出（仅原生环境注册）
onMounted(() => {
  if (!Capacitor.isNativePlatform()) return;
  void (async () => {
    const { App } = await import('@capacitor/app');
    const { Toast } = await import('@capacitor/toast');
    let exitArmed = false;
    let armTimer: ReturnType<typeof setTimeout> | undefined;
    await App.addListener('backButton', () => {
      const action = resolveBackAction({
        settingsOpen: showSettings.value,
        revealMode: revealMode.value,
        exitArmed,
      });
      if (action === 'close-settings') {
        showSettings.value = false;
        return;
      }
      if (action === 'close-reveal') {
        revealMode.value = false;
        return;
      }
      if (action === 'exit') {
        void App.exitApp();
        return;
      }
      exitArmed = true;
      void Toast.show({ text: '再按一次退出' });
      clearTimeout(armTimer);
      armTimer = setTimeout(() => {
        exitArmed = false;
      }, 2000);
    });
  })();
});
```

- [ ] **Step 7: 全量回归 + 提交**

```powershell
npm test
npm run build
```

Expected: 全部通过（`@capacitor/core` 进入 web bundle 但 web 上 `isNativePlatform()` 为 false，监听不注册）。

```powershell
git add src/composables/useBackButton.ts tests/use-back-button.test.ts src/components/GameView.vue package.json package-lock.json android/
git commit -m "feat: Android 返回键（关弹窗/退复盘/双击退出）"
```

---

### Task 5: useMediaQuery 与 InfoDrawer 组件（TDD）

**Files:**
- Create: `src/composables/useMediaQuery.ts`
- Test: `tests/use-media-query.test.ts`
- Create: `src/components/InfoDrawer.vue`
- Test: `tests/info-drawer.test.ts`
- Modify: `package.json`（devDependencies：`@vue/test-utils`、`happy-dom`）

**Interfaces:**
- Consumes: 无
- Produces:
  - `useMediaQuery(query: string): Ref<boolean>`（Task 6 用 `'(orientation: landscape) and (max-height: 520px)'` 消费）
  - `InfoDrawer`：props `tabs: readonly { id: string; label: string }[]`、`v-model:open`；具名插槽按 `tab.id` 命名；`.drawer-handle` 折叠把手

- [ ] **Step 1: 安装组件测试依赖**

```powershell
npm install -D @vue/test-utils happy-dom
```

- [ ] **Step 2: 写 useMediaQuery 失败测试**

创建 `tests/use-media-query.test.ts`：

```ts
// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { useMediaQuery } from '../src/composables/useMediaQuery';

const Host = defineComponent({
  setup() {
    const matches = useMediaQuery('(min-width: 800px)');
    return () => h('div', matches.value ? 'yes' : 'no');
  },
});

describe('useMediaQuery', () => {
  it('初始值反映当前视口（happy-dom 默认 1024px 宽）', () => {
    const wrapper = mount(Host);
    expect(wrapper.text()).toBe('yes');
  });

  it('视口变化后响应 change 事件', async () => {
    const wrapper = mount(Host);
    await (window as unknown as { happyDOM: { setViewport: (v: { width: number }) => Promise<void> } })
      .happyDOM.setViewport({ width: 375 });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(wrapper.text()).toBe('no');
  });
});
```

- [ ] **Step 3: 运行确认失败**

```powershell
npx vitest run tests/use-media-query.test.ts
```

Expected: FAIL（模块不存在）。

- [ ] **Step 4: 实现 useMediaQuery**

创建 `src/composables/useMediaQuery.ts`：

```ts
import { onMounted, onUnmounted, ref, type Ref } from 'vue';

/** 响应式媒体查询：返回随视口变化更新的布尔 ref */
export function useMediaQuery(query: string): Ref<boolean> {
  const matches = ref(false);
  let mql: MediaQueryList | null = null;

  const update = (event: MediaQueryList | MediaQueryListEvent) => {
    matches.value = event.matches;
  };

  onMounted(() => {
    mql = window.matchMedia(query);
    update(mql);
    mql.addEventListener('change', update);
  });

  onUnmounted(() => {
    mql?.removeEventListener('change', update);
    mql = null;
  });

  return matches;
}
```

- [ ] **Step 5: 运行确认通过**

```powershell
npx vitest run tests/use-media-query.test.ts
```

Expected: 2 个用例 PASS。

- [ ] **Step 6: 写 InfoDrawer 失败测试**

创建 `tests/info-drawer.test.ts`：

```ts
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
    });
    await wrapper.findAll('.drawer-tab')[1].trigger('click');
    expect(wrapper.text()).toContain('日志内容');
    expect(wrapper.text()).not.toContain('AI内容');
  });

  it('点击把手发出 update:open', async () => {
    const wrapper = mount(InfoDrawer, { props: { tabs } });
    await wrapper.find('.drawer-handle').trigger('click');
    expect(wrapper.emitted('update:open')).toEqual([[false]]);
  });
});
```

- [ ] **Step 7: 运行确认失败**

```powershell
npx vitest run tests/info-drawer.test.ts
```

Expected: FAIL（组件不存在）。

- [ ] **Step 8: 实现 InfoDrawer**

创建 `src/components/InfoDrawer.vue`：

```vue
<template>
  <aside class="info-drawer glass-panel" :class="{ 'info-drawer--closed': !open }">
    <div v-show="open" class="drawer-inner">
      <div class="drawer-tabs" role="tablist">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="drawer-tab"
          :class="{ 'drawer-tab--active': active === tab.id }"
          role="tab"
          :aria-selected="active === tab.id"
          @click="active = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>
      <div class="drawer-body">
        <template v-for="tab in tabs" :key="tab.id">
          <div v-show="active === tab.id" class="drawer-pane">
            <slot :name="tab.id" />
          </div>
        </template>
      </div>
    </div>
    <button
      class="drawer-handle"
      :aria-label="open ? '收起信息面板' : '展开信息面板'"
      @click="$emit('update:open', !open)"
    >
      {{ open ? '›' : '‹' }}
    </button>
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  tabs: readonly { id: string; label: string }[];
}>();

const open = defineModel<boolean>('open', { default: true });
const active = ref<string>(props.tabs[0]?.id ?? '');
</script>

<style scoped>
.info-drawer {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: flex-basis var(--dur-fast) var(--ease-out);
}
.drawer-tabs {
  display: flex;
  gap: 4px;
  padding: 8px 8px 0;
}
.drawer-tab {
  flex: 1;
  min-height: 44px;
  padding: 0 4px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-muted);
  font-size: var(--font-sm);
  font-family: inherit;
  cursor: pointer;
  touch-action: manipulation;
}
.drawer-tab--active {
  background: var(--color-surface);
  border-color: var(--color-surface-border);
  color: var(--color-text-inverse);
}
.drawer-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.drawer-pane {
  height: 100%;
  overflow-y: auto;
  padding: var(--space-3);
}
.drawer-handle {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  left: 0;
  width: 20px;
  min-height: 64px;
  border: none;
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  background: var(--color-surface);
  color: var(--color-text-muted);
  font-size: 16px;
  cursor: pointer;
  touch-action: manipulation;
}
</style>
```

- [ ] **Step 9: 运行确认通过 + 提交**

```powershell
npx vitest run tests/info-drawer.test.ts tests/use-media-query.test.ts
npm test
```

Expected: 全部 PASS。

```powershell
git add src/composables/useMediaQuery.ts src/components/InfoDrawer.vue tests/use-media-query.test.ts tests/info-drawer.test.ts package.json package-lock.json
git commit -m "feat: 新增 useMediaQuery 与 InfoDrawer 信息抽屉组件"
```

---

### Task 6: GameView 紧凑布局（牌桌 + 右侧抽屉）

**Files:**
- Modify: `src/components/GameView.vue`（template + script + style）
- Modify: `src/components/GameBoard.vue`（style 末尾追加媒体查询）
- Modify: `src/components/PlayerHand.vue`（style 末尾追加媒体查询）

**Interfaces:**
- Consumes: Task 5 的 `useMediaQuery`、`InfoDrawer`；现有组件 `AIAnalysisPanel`/`DiscardAdvisorVue`/`ReactionAdvisorVue` 的 props 原样不变
- Produces: `compact` 布局（手机横屏）；桌面布局 DOM 与现在逐字节一致

- [ ] **Step 1: GameView script — 状态与导入**

在 `src/components/GameView.vue` 的 `<script setup>` 中：

1. import 区追加：

```ts
import InfoDrawer from './InfoDrawer.vue';
import { useMediaQuery } from '../composables/useMediaQuery';
```

2. 现有 ref 定义区追加：

```ts
// 手机横屏（矮视口）紧凑布局开关
const compact = useMediaQuery('(orientation: landscape) and (max-height: 520px)');
const drawerOpen = ref(true);
const drawerTabs = [
  { id: 'ai', label: 'AI 分析' },
  { id: 'advice', label: '出牌推荐' },
  { id: 'reaction', label: '应对推荐' },
  { id: 'log', label: '日志' },
] as const;
```

- [ ] **Step 2: GameView template — 双布局分支**

把 `<div v-else class="game-container">` 改为：

```html
    <div v-else class="game-container" :class="{ 'game-container--compact': compact }">
```

把 `GameBoard`、`ActionPanel`、`AIAnalysisPanel`、`DiscardAdvisorVue`、`ReactionAdvisorVue`、`log-panel` 这六块（`GameResult` 除外）包进 `<template v-if="!compact"> … </template>`，内容**逐字节保持原样**；紧随其后加入紧凑分支（组件 props/事件与桌面分支完全相同，此处不再重复 props 行，直接复制原标签）：

```html
    <template v-else>
      <div class="compact-main">
        <GameBoard ... />
        <ActionPanel ... />
      </div>
      <InfoDrawer v-model:open="drawerOpen" :tabs="drawerTabs" class="game-drawer">
        <template #ai>
          <AIAnalysisPanel :result="aiResult" :loading="aiLoading" :error="aiError" @analyze="analyzeCurrentGame" />
        </template>
        <template #advice>
          <DiscardAdvisorVue v-if="discardAdvice" :evaluations="discardAdvice.evaluations" :current-shanten="discardAdvice.currentShanten" />
          <p v-else class="drawer-empty">轮到你出牌时，这里会显示牌效推荐</p>
        </template>
        <template #reaction>
          <ReactionAdvisorVue v-if="reactionAdvice" :analysis="reactionAdvice" />
          <p v-else class="drawer-empty">需要应对别人打牌时，这里会显示建议</p>
        </template>
        <template #log>
          <div class="log-panel log-panel--drawer glass-panel">
            <div
              v-for="(msg, i) in gameLog.slice(-8)"
              :key="i"
              class="log-line"
              :style="{ color: logColor(msg) }"
            >{{ msg }}</div>
          </div>
        </template>
      </InfoDrawer>
    </template>
```

`GameResult` 移到两个分支之后（作为 `game-container` 的最后一个子元素），props/事件原样不动。

- [ ] **Step 3: GameView style — 紧凑容器与抽屉**

在 `<style scoped>` 末尾追加：

```css
/* —— 手机横屏紧凑布局 —— */
.game-container--compact {
  width: 100%;
  flex-direction: row;
  align-items: stretch;
  gap: 0;
  padding: 0 max(env(safe-area-inset-right), 4px) 0 max(env(safe-area-inset-left), 4px);
}
.game-container--compact .top-bar {
  flex: 1 1 100%;
  max-width: none;
}
.compact-main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 0 4px 8px;
}
.game-drawer {
  flex: 0 0 320px;
  min-width: 0;
  height: calc(100vh - 48px);
}
.drawer-empty {
  color: var(--color-text-muted);
  font-size: var(--font-sm);
  padding: var(--space-4);
  text-align: center;
}
.log-panel--drawer {
  width: 100%;
  max-height: none;
  height: 100%;
}
```

- [ ] **Step 4: GameBoard — 压缩桌体高度**

在 `src/components/GameBoard.vue` 的 `<style scoped>` 末尾（现有 `@media (max-width: 880px)` 块之后）追加：

```css
@media (orientation: landscape) and (max-height: 520px) {
  .game-board {
    min-height: 0;
    padding: var(--space-2);
  }
  .board-middle {
    gap: var(--space-2);
  }
}
```

- [ ] **Step 5: PlayerHand — 紧凑牌面尺寸**

在 `src/components/PlayerHand.vue` 的 `<style scoped>` 末尾追加：

```css
@media (orientation: landscape) and (max-height: 520px) {
  .hand-tiles {
    --tile-w: 44px;
    --tile-h: 60px;
    min-height: 64px;
  }
  .hand-label {
    display: none;
  }
}
```

- [ ] **Step 6: 类型检查与单测**

```powershell
npm run build
npm test
```

Expected: vue-tsc 无错误，全部用例通过。

- [ ] **Step 7: 浏览器双向目检**

```powershell
npm run dev
```

1. **桌面回归**：浏览器窗口最大化（≥900px 高）打开对局，布局应与改动前一致（牌桌下方堆叠各面板）。
2. **紧凑布局**：DevTools → 设备工具栏 → 响应式，设 915×412：应看到「左牌桌 + 右侧四 tab 抽屉」；点 tab 切换内容；点左缘把手可收起抽屉、再点展开；开局打一轮确认出牌/碰杠按钮可点。
3. 记录是否溢出：若 `OtherPlayer`/`DiscardPool` 在紧凑视口溢出，在对应组件 `<style scoped>` 末尾补同样的 `@media (orientation: landscape) and (max-height: 520px)` 块做尺寸微调（思路同 PlayerHand：调 `--tile-w/--tile-h` 或间距变量）。

- [ ] **Step 8: 提交**

```powershell
git add src/components/GameView.vue src/components/GameBoard.vue src/components/PlayerHand.vue
git commit -m "feat: 手机横屏紧凑布局——牌桌 + 右侧信息抽屉"
```

---

### Task 7: 应用图标与启动图

**Files:**
- Create: `scripts/make-icon.mjs`
- Create: `resources/icon.svg`、`resources/splash.svg`（脚本生成，中间产物）
- Create: `resources/icon.png`、`resources/splash.png`（Edge headless 截图生成）
- Modify: `android/app/src/main/res/`（capacitor-assets 批量写入）

**Interfaces:**
- Consumes: Task 1 的 android 工程
- Produces: 安卓全套自适应图标 + 启动图

- [ ] **Step 1: 写 SVG 生成脚本**

创建 `scripts/make-icon.mjs`：

```js
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(join(root, 'resources'), { recursive: true });

const tile = (size) => `
  <g transform="translate(${size * 0.21}, ${size * 0.11}) rotate(8 ${size * 0.29} ${size * 0.39})">
    <rect width="${size * 0.585}" height="${size * 0.78}" rx="${size * 0.07}" fill="#f7f3e8"/>
    <rect width="${size * 0.585}" height="${size * 0.78}" rx="${size * 0.07}"
      fill="none" stroke="#c9c2ad" stroke-width="${size * 0.01}"/>
    <circle cx="${size * 0.2925}" cy="${size * 0.27}" r="${size * 0.058}" fill="#1a5c3a"/>
    <circle cx="${size * 0.2925}" cy="${size * 0.27}" r="${size * 0.033}" fill="#f7f3e8"/>
    <text x="${size * 0.2925}" y="${size * 0.72}"
      font-family="Microsoft YaHei, SimSun, serif" font-size="${size * 0.47}"
      font-weight="bold" fill="#c0392b" text-anchor="middle">萬</text>
  </g>`;

const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="felt" cx="50%" cy="32%" r="80%">
      <stop offset="0%" stop-color="#2a7a4f"/>
      <stop offset="100%" stop-color="#123f28"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#felt)"/>${tile(1024)}
</svg>`;

const splashSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732" viewBox="0 0 2732 2732">
  <defs>
    <radialGradient id="felt" cx="50%" cy="40%" r="75%">
      <stop offset="0%" stop-color="#1e6b43"/>
      <stop offset="100%" stop-color="#0e2f1d"/>
    </radialGradient>
  </defs>
  <rect width="2732" height="2732" fill="url(#felt)"/>${tile(2732)}
</svg>`;

writeFileSync(join(root, 'resources', 'icon.svg'), iconSvg);
writeFileSync(join(root, 'resources', 'splash.svg'), splashSvg);
console.log('SVG written to resources/');
```

- [ ] **Step 2: 生成 SVG 并用 Edge headless 转 PNG**

```powershell
node scripts/make-icon.mjs
$edge = @("$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe", "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe") |
  Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge) { throw "未找到 Edge，请改用 Chrome 路径执行同样命令" }
& $edge --headless --disable-gpu --hide-scrollbars --virtual-time-budget=4000 `
  --window-size=1024,1024 --screenshot="$PWD\resources\icon.png" "file:///$($PWD -replace '\\','/')/resources/icon.svg"
& $edge --headless --disable-gpu --hide-scrollbars --virtual-time-budget=4000 `
  --window-size=2732,2732 --screenshot="$PWD\resources\splash.png" "file:///$($PWD -replace '\\','/')/resources/splash.svg"
Add-Type -AssemblyName System.Drawing
foreach ($f in 'icon', 'splash') {
  $img = [System.Drawing.Image]::FromFile("$PWD\resources\$f.png")
  "$f : $($img.Width)x$($img.Height)"
  $img.Dispose()
}
```

Expected: 输出 `icon : 1024x1024` 与 `splash : 2732x2732`。

- [ ] **Step 3: 生成安卓图标资源**

```powershell
npm install -D @capacitor/assets
npx capacitor-assets generate --android
```

Expected: 输出列出为 `android/app/src/main/res/` 各 mipmap 目录写入的文件。

- [ ] **Step 4: 提交**

```powershell
git add scripts/make-icon.mjs resources android/app/src/main/res
git commit -m "feat: 应用图标与启动图（麻将牌面视觉）"
```

---

### Task 8: 全链路真机验收

**Files:** 无新改动（验证 + 可能的修复）

**Interfaces:**
- Consumes: Task 1–7 的全部产出；手机（USB 调试已开，见规格 §7.3）

- [ ] **Step 1: 连接检查**

```powershell
adb devices
```

Expected: 列出设备且状态为 `device`（`unauthorized` → 手机上重新允许授权）。

- [ ] **Step 2: 构建并安装**

```powershell
npm run android:install
```

Expected: 类型检查 → vite build → cap sync → gradle BUILD SUCCESSFUL → APK 安装 → 游戏自动启动，横屏全屏。

- [ ] **Step 3: 真机冒烟清单**（对照规格 §6 逐项勾选）

| 分类 | 检查项 |
|------|--------|
| 核心玩法 | 随机开局；记下种子号，重开输入同一种子 → 牌序一致；摸牌点选、出牌；机器人碰/杠提示出现时可正常操作；自摸胡或流局 → 查看详情 |
| 计算能力 | 「出牌推荐」面板能出结果（Worker 正常）；首次启动等待向听缓存构建完成，杀进程重开 → 缓存仍在 |
| AI 分析 | 设置里填 API 地址/Key/模型 → 分析返回；杀进程重开 → 配置仍在 |
| 移动特性 | 竖持手机界面不变（横屏锁定）；返回键：设置开着关设置 / 复盘模式退复盘 / 游戏中提示「再按一次退出」再按退出；刘海侧无遮挡；无下拉橡皮筋 |
| 抽屉 | 四个 tab 内容切换正常；把手收起/展开；收起后牌桌变宽 |

任一项失败 → 定位修复后重跑 Step 2 与失败项。

- [ ] **Step 4: 热更新模式验证**

```powershell
# 终端 1
npm run dev
# 终端 2
npm run android:dev
```

- 首次运行允许 Windows 防火墙（专用网络）；
- 手机进入热更新加载的游戏后，在 `src/components/GameView.vue` 临时改一个可见文案 → 手机即时刷新；改回后撤销。

- [ ] **Step 5: 桌面回归确认**

浏览器 `npm run dev` 打开对局：布局、面板、键盘操作与移植前一致；`npm test` 全绿。

- [ ] **Step 6: 收尾提交（若有修复）**

```powershell
git add -A
git commit -m "fix: 真机验收问题修复"
```

（无修复则跳过。）

---

## 计划自审记录

- **规格覆盖**：§3 工程结构/脚本（Task 1）、§4.1–4.3 原生配置（Task 2）、§4.4 CapacitorHttp（Task 1 配置默认开启）、§4.5 图标（Task 7）、§5 触屏专项（Task 3）、§5.1 抽屉布局（Task 5+6）、返回键（Task 4）、§6 验收（Task 8）、§7 环境（已完成 android-36 安装）、§8 风险（Task 2 Step 4 JDK 缓解）。无遗漏。
- **占位符扫描**：Task 6 Step 2 的 `... / ...` 表示「原样复制现有标签」，标注了来源与要求（逐字节一致），非未实现内容；Task 8 Step 3 为验收清单非实现步骤。其余步骤均含完整代码/命令。
- **类型一致性**：`resolveBackAction(BackState): BackAction` 在 Task 4 定义与测试一致；`useMediaQuery(query): Ref<boolean>` 在 Task 5 定义、Task 6 消费一致；`InfoDrawer` props/tabs id（`ai`/`advice`/`reaction`/`log`）与 Task 6 插槽名一致；`drawerTabs` 的 `as const` 与 `readonly` props 类型匹配。
