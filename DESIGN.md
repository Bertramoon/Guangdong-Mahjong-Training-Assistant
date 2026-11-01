# 广东麻将训练助手设计约定

## Overview

这是面向中文使用者的单人麻将训练工具。以牌桌为中心，信息抽屉辅助理解当前决策；桌面浏览器与 Android 横屏共用一套界面。延续现有深绿牌桌、半透明信息面板和 SVG 麻将牌，不为单个功能更换视觉风格。

## Colors

运行时唯一 token 来源为 `src/styles/tokens.css`，由 `src/style.css` 引入；本文件不生成另一套色值。

牌桌使用 felt 系列，信息表面使用 surface/glass 系列。primary 用于主动操作，info 用于比较依据，gold 用于推荐与进度，warning 用于旧局面提示，danger 用于错误。状态同时用文字标明。

## Typography

复用 `--font-family-ui` 中文正文与 `--font-family-display` 展示字体。牌面字形归 TileComponent 管理。面板字号沿用 font token，长回答换行，不以截断隐藏关键依据。

## Layout

GameView 拥有牌桌和信息抽屉布局，InfoDrawer 拥有标签与收起行为。AI 面板内仅问答内容滚动，输入区始终可达。窄面板的两种出牌对比采用上下分块，不新增横向宽表。

## Elevation & Depth

复用 glass-panel、shadow token 和现有层级；追问不新增覆盖牌桌的弹层。

## Shapes

圆角、间距与边框复用 radius/space/surface-border token。

## Components

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| 按钮 | `src/styles/base.css` 的 `.btn` | `src/styles/tokens.css` | 原生按钮，复用强调程度与交互状态 | 组件测试、浏览器 |
| 信息抽屉 | `InfoDrawer.vue` | 现有非模态抽屉 | 切换标签保留内容，不隔离牌桌 | info-drawer.test.ts |
| Select/Listbox | `SettingsModal.vue` 原生 select | 现有设置流程 | native，接受系统菜单几何 | 浏览器 |
| Form | `AIAnalysisPanel.vue` | 追问设计文档 | 原生 textarea，不手动缩放，输入法组合阶段不发送 | ai-panel.test.ts |
| 本地对比 | `DiscardComparison.vue` | 本地算法 | 只渲染确定数值，统一有效进张种数 | followup.test.ts |
| 请求恢复 | `useAIConversation.ts` | 追问设计文档 | 页面内存、单局面讨论，隔离旧响应 | useAIConversation.test.ts |
| Scrollbar | `src/styles/base.css` | 现有全局样式 | AI 内容区内部滚动 | 浏览器 |

业务行为以 `docs/superpowers/specs/2026-10-18-ai-followup-design.md` 为准。原有 AI 配置保存行为沿用 storage/store.ts；问答内容不持久化。

## Do's and Don'ts

- 普通玩家视角解释牌局，不能使用隐藏牌墙与对手暗手。
- 本地计算拥有确定数值，AI 只基于证据解释。
- 不为追问重做牌桌，不新增独立路线推演系统。
- 出牌快捷键与文字输入隔离；错误和长内容不能挤出发送及取消操作。
