# 广东麻将训练助手 Android 移植设计

- 日期：2026-08-30
- 状态：待审阅
- 范围：将现有 Web 应用打包为安卓 APK；横屏；个人使用，本地构建

## 1. 背景与目标

本项目是 Vue 3 + TypeScript + Vite 的**纯前端 SPA**（无后端），已在桌面浏览器完成：四方牌桌 UI、Web Worker 牌效计算、IndexedDB 向听缓存（约 40 万条）、用户自配 API 的 LLM 分析、种子回放。

**目标**：产出可安装到安卓手机的 APK，横屏使用，游戏本体离线可玩（AI 分析联网时可用），游戏源码（`src/`）零改动。

**非目标**：iOS、上架应用商店、竖屏布局、README 中「未来开发计划」的新功能。

## 2. 方案选型

| 方案 | 结论 | 理由 |
|------|------|------|
| **A. Capacitor 打包（选定）** | ✅ | Vue SPA 上安卓的事实标准；dist 产物直接进 WebView，代码 100% 复用；未来可顺路上 iOS；构建链成熟 |
| B. Tauri 2 移动端 | ❌ | 同为 WebView 壳，对纯前端项目无收益，强制引入 Rust 工具链，构建链复杂 |
| C. PWA + TWA（Bubblewrap） | ❌ | TWA 要求应用在线托管才能打开，与「随时能玩」的离线诉求冲突 |

选定 **Capacitor 8.x**（当前稳定版 8.5.0）。要求：Node 22+（本机 v24.15.0 ✅）、Android SDK Platform API 36、JDK 21+（本机 JDK 25，兼容性风险见 §8）。

## 3. 工程结构与构建流程

### 3.1 依赖

```
dependencies:      @capacitor/core、@capacitor/android
devDependencies:   @capacitor/cli
可选 devDependency: @capacitor/assets（图标生成，一次性）
```

### 3.2 目录变化

```
guangdong_mahjong/
├── android/                  # cap add android 生成的原生工程，整体提交进 git
│   └── app/src/main/         # AndroidManifest.xml、styles 主题、图标资源
├── capacitor.config.ts       # 新增，见 3.3
├── index.html                # 微调 viewport（§5.3）
├── package.json              # 新增 android:* 脚本（3.4）
└── vite.config.ts            # 不改（webDir 即 dist 默认产物）
```

**Git 规则**：以 `cap add android` 生成的 `android/.gitignore` 为准（排除 `app/build/`、`.gradle/`、`local.properties`、`app/src/main/assets/public/` 等构建产物），其余原生工程文件提交，保证换机构建可复现。根 `.gitignore` 增补 Capacitor 官方推荐条目（如 `.DS_Store` 无关项不引入，仅安卓相关）。

### 3.3 capacitor.config.ts

```ts
const config: CapacitorConfig = {
  appId: 'com.bertramoon.mahjong',
  appName: '广东麻将训练助手',
  webDir: 'dist',
  android: { allowMixedContent: true },
  plugins: {
    CapacitorHttp: { enabled: true },    // 原生 HTTP 通道，绕开 CORS（§4.4）
  },
};
```

### 3.4 构建脚本与日常命令

`package.json` 新增：

| 脚本 | 内容 |
|------|------|
| `android:build` | `vue-tsc -b && vite build && cap sync`（类型检查 → 构建产物 → 拷入 android） |
| `android:install` | `npm run android:build && cap run android`（gradle 打 debug APK → adb 安装 → 启动） |
| `android:dev` | `cap run android -l --external`（热更新模式，§7.5） |

签名：**debug 签名**（gradle 默认自带，零配置），APK 位于 `android/app/build/outputs/apk/debug/app-debug.apk`。未来分发给朋友时再生成正式 keystore，不在本期范围。

## 4. 安卓端特有配置

全部为配置层改动，`src/` 游戏源码零修改。

### 4.1 横屏锁定

`AndroidManifest.xml`：`android:screenOrientation="sensorLandscape"`——跟随重力传感器，左右横屏皆可，竖持时自动横置。

### 4.2 沉浸式全屏

主题（`styles.xml`）隐藏状态栏/导航栏，游戏铺满全屏。Android 15+ 默认 edge-to-edge，配合 §5.3 的安全区内边距处理刘海。

### 4.3 返回键（新增 `@capacitor/app` 依赖）

监听 `backButton` 事件：

1. 设置弹窗 / 结算弹窗开着 → 关闭弹窗；
2. 否则 → 显示 toast「再按一次退出」，2 秒内再按才 `App.exitApp()`，防误触退出对局。

### 4.4 AI 分析联网（CORS 处理）

WebView 内 fetch 的来源为 `https://localhost`，多数 OpenAI 兼容端点即使返回 `Access-Control-Allow-Origin: *` 也可直连，但为确保**任意用户自配端点**（含不带 CORS 头、`http://` 协议）均可用，**启用 `CapacitorHttp`**（原生 HTTP 通道，fetch/XHR 请求整体走原生转发，绕开 CORS；已确认 `src/ai/provider.ts` 为纯 JSON POST、无流式响应，可安全启用）。Manifest 加 `android:usesCleartextTraffic="true"` 兼容 `http://` 端点（个人使用，风险可接受）。若 CapacitorHttp 对某端点表现异常，可通过配置一键关闭回退直连。

### 4.5 应用图标

`@capacitor/assets`：以现有 SVG 牌面风格制作一张 1024×1024 图标（+ 启动图），`npx capacitor-assets generate --android` 生成全套分辨率资源。

### 4.6 权限与存储

仅需模板自带的 INTERNET 权限。IndexedDB / localStorage 存于应用私有目录，随卸载清除，无系统回收风险。

## 5. 横屏布局适配

### 5.1 布局方案：右侧信息抽屉

现状是纵向长条（牌桌→操作→AI 分析→出牌推荐→应对推荐→日志），手机横屏（高约 360–420dp）装不下。横屏手机宽度有富余（~900dp，牌桌只需 ~600dp），因此信息向右放：

```
┌─────────────────────────────────────────────┐
│ 鬼牌:🀫  种子:1781…              ⚙ 设置      │  ← 顶栏
│ ┌─────────────────────┐  ┌───────────────┐ │
│ │                     │  │ [AI分析|推荐|  │ │
│ │    四方牌桌          │  │  应对|日志]    │ │
│ │   (上/左/右三个对手)  │  │ ┌───────────┐ │ │
│ │      弃牌池          │  │ │ 面板内容    │ │ │
│ │                     │  │ │ (独立滚动)  │ │ │
│ └─────────────────────┘  │ │           │ │ │
│ ┌─────────────────────────┐│           │ │ │
│ │ 你的手牌（横跨全宽）       │└───────────┘ │ │
│ │ [出牌][碰][杠][胡][过]    │               │ │
│ └─────────────────────────┴───────────────┘ │
└─────────────────────────────────────────────┘
```

要点：

- **手牌 + 操作按钮横跨全宽**：14 张手牌在 ~900dp 宽度下每张约 60dp，点选精度无忧；
- **右侧抽屉 ~320dp，tab 切换**四个面板（AI 分析 / 出牌推荐 / 应对推荐 / 操作日志），内容独立滚动，牌桌与建议**同时可见**；
- **抽屉可一键收起**（边缘把手）；
- 新增 `src/components/InfoDrawer.vue`（tab 容器 + 折叠逻辑），现有 `AIAnalysisPanel`、`DiscardAdvisor`、`ReactionAdvisor` 组件与 `GameView.vue` 的日志渲染**原样复用**；
- **作用域隔离**：新布局限定在 `@media (orientation: landscape) and (max-height: 520px)`，桌面浏览器布局零回归。

已否决备选：双页签全屏切换（打牌时看不到建议，违背训练助手定位）、浮层弹出（面板遮挡牌桌，无法边打边对照）。

### 5.2 牌桌区自适应

`GameBoard` 在抽屉布局下的可用高度约 280–320dp，利用其现有响应式规则微调间距/牌面尺寸（实施时真机校准），不改组件接口。

### 5.3 触屏专项

| 问题 | 处理 |
|------|------|
| 双击/双指误缩放 | `index.html` viewport 设 `user-scalable=no` + CSS `touch-action: manipulation` |
| 橡皮筋滚动 / 下拉刷新 | `overscroll-behavior: none` |
| 刘海遮挡 | `viewport-fit=cover` + 左右 `env(safe-area-inset-*)` 内边距 |
| 触摸目标 | 操作按钮与 tab 保持 ≥ 44dp 高 |

## 6. 测试与验收

分三层，不引入新测试框架：

**① 逻辑层（零改动）**：现有 vitest 单测跑纯 TS 逻辑，与运行环境无关，`npm test` 通过即可。

**② 构建链验证**：`npm run android:install` 全链路跑通（类型检查 → vite build → cap sync → gradle 出 APK → adb 装机启动）。

**③ 真机冒烟清单**：

| 分类 | 检查项 |
|------|--------|
| 核心玩法 | 随机开局 / 种子开局复现同一牌序、摸打选牌、碰杠胡、流局查看详情 |
| 计算能力 | 出牌推荐出结果（Worker 正常）、首次启动向听缓存构建并持久化（IndexedDB） |
| AI 分析 | 配置 API 后分析返回；重启 app 后配置仍在（WebView 存储持久化） |
| 移动特性 | 横屏锁定（转动手机不变）、返回键行为（关弹窗/两次退出）、刘海不遮挡、无橡皮筋滚动 |
| 布局 | 抽屉四 tab 切换与收起展开、手牌点选精度、桌面浏览器布局与之前一致（回归确认） |

**验收标准**：上表全部通过，且桌面版功能零回归。

## 7. 附录：安卓开发零基础上手指南

### 7.1 本机环境现状（已盘点，2026-08-30）

| 项目 | 状态 |
|------|------|
| Node | v24.15.0 ✅（Cap 8 要求 ≥22） |
| ANDROID_HOME | `D:\code\androidsdk` ✅（platform-tools、build-tools 31、platforms 26/29/30/31、licenses 已接受） |
| adb | `D:\code\androidsdk\platform-tools\adb.exe`，已在 PATH ✅ |
| JDK | JAVA_HOME → OpenJDK 25.0.2 ✅（兼容性备注见 §8.1） |
| 缺口 | **SDK Platform android-36 + 配套 build-tools**（Cap 8 需要，见 7.2） |

### 7.2 补齐缺失的 SDK 平台（一次性）

方式一（推荐，图形界面）：安装 [Android Studio](https://developer.android.com/studio) → 首启向导默认安装即可补齐最新平台。装不装都不影响日常命令行构建，只当 SDK 管理器用。

方式二（命令行，不装 Studio）：下载 Android command-line tools，然后：

```powershell
sdkmanager "platforms;android-36" "build-tools;36.0.0"
```

### 7.3 手机开启 USB 调试（一次性）

1. 设置 → 关于手机 → 连点「版本号」7 下 → 提示已进入开发者模式；
2. 设置 → 系统 → 开发者选项 → 打开「USB 调试」；
3. 数据线连接电脑，手机弹出「是否允许 USB 调试」→ 勾选「始终允许」→ 确定。

### 7.4 验证连接与安装

```powershell
adb devices          # 应列出设备号 + "device"；显示 unauthorized 则重插数据线在手机上确认
npm run android:install   # 构建并安装到手机，自动启动
```

> `adb devices` 显示 `offline`：换根数据线（部分线只能充电）、或手机 USB 模式选「传输文件」。

### 7.5 热更新模式（改代码手机即时生效）

```powershell
# 终端 1
npm run dev
# 终端 2（手机与电脑连同一 Wi-Fi）
npm run android:dev
```

- 手机上的游戏会直接加载电脑的 `localhost:5173`，改完代码手机立即刷新，无需重新打包安装；
- 首次运行 Windows 防火墙弹窗 → 勾选「专用网络」→ 允许；
- 联调结束后 `npm run android:install` 装回正式包。

### 7.6 备选连接方式

- **无 Wi-Fi 时走 USB**：`npx cap run android -l`（不带 `--external`），CLI 自动通过 `adb reverse` 做端口转发；
- **无线调试（Android 11+）**：开发者选项 → 无线调试 → 与电脑配对后拔掉数据线，`adb connect <ip>:<port>`。

## 8. 风险与备注

| # | 风险 | 评估/缓解 |
|---|------|-----------|
| 8.1 | **JDK 25 运行 Gradle**：Cap 8 用 Gradle 8.14+/AGP 8.13，对最新 JDK 的兼容以实测为准 | 若 Gradle 拒绝在 JDK 25 上启动，在 `android/gradle.properties` 指定 `org.gradle.java.home` 指向 JDK 21（Temurin 21 或 Android Studio 自带 JBR），一行配置解决 |
| 8.2 | **WebView 版本**：模块化 Worker 需 Chromium 91+ | Android System WebView 经商店自动更新，2021 年后设备均满足；且现有代码有主线程兜底计算 |
| 8.3 | CapacitorHttp 无流式支持 | 已确认 `ai/provider.ts` 为纯 JSON POST，无 SSE 流式，可安全启用 |
| 8.4 | IndexedDB 数据丢失 | 存应用私有目录，仅卸载清除，无浏览器侧的存储回收问题 |
| 8.5 | 桌面版布局回归 | 新布局严格限定媒体查询作用域；冒烟清单含桌面回归项 |
| 8.6 | 首次启动向听缓存构建耗时（40 万条） | 与桌面浏览器一致，后台 Worker 进行，不阻塞对局 |
