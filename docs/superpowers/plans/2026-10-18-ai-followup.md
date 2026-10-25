# 局内 AI 追问实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans，按任务执行并记录验证。

**Goal:** 实现已确认的局面追问、本地对比与安全的会话切换。
**Architecture:** 本地为同一快照计算全部合法弃牌（已有建议默认仍为 TOP10），问题和回答携带这一证据。独立 Vue composable 管理冻结局面、请求取消、历史和失败恢复；现有 AI 面板扩展为单局讨论界面。
**Tech Stack:** Vue 3、TypeScript、现有 Web Worker、Vitest，无新增运行依赖。
**Spec:** `docs/superpowers/specs/2026-10-18-ai-followup-design.md`（用户已确认）

## Global Constraints

- 基于 dev `d265164` 的 `codex/ai-followup` 分支；只操作本任务文件，原有未提交文件保持原状。
- 1000 字符、20 轮成功问答；会话仅在内存；统一有效进张种数及未扣除可见牌口径。
- 数值、牌种、交集和差集由本地计算，首版不建设结构分解与路线推演。
- 普通玩家视角，无对手暗手、真实牌墙、种子和未来记录。
- 用户已授权继续开发；实施在当前分支完成，不再次要求确认实现细节，不推送或合并。

## Review Focus

- TOP10 外及同牌重复候选：本地补足全部合法弃牌，不改变机器人默认建议。
- 旧请求在新局面/取消之后返回：请求序号与 AbortSignal 双重隔离。
- 失败重试和取消：保留草稿与成功消息，不重复计数或丢失本地比较。
- 自动分析：开始追问后固定会话，不能覆盖问题和旧局面。
- 中文输入法与 Android 矮视口：不误发送、不触发出牌、面板内部滚动。

## Task 1：本地证据和 AI 请求

Files: `src/engine/advisor.ts`, `compute-client.ts`, `compute-worker.ts`; `src/ai/provider.ts`, `analyzer.ts`, `prompt.ts`; 新建 `src/ai/followup.ts`，`tests/ai/followup.test.ts`, `provider.test.ts`。

Interfaces: `getDiscardRecommendation(..., limit=10)` 与异步客户端同参数；`captureSnapshot(game): AnalysisSnapshot`；`compareDiscards(evaluations, keys): DiscardComparison|null`；`answerQuestion(config,snapshot,evaluations,messages,question,comparison,signal): Promise<FollowupAnswer>`。所有候选先本地计算后再发问，不需要额外模型识别请求。

- [x] RED：隐藏信息、快照独立性、种数与双方集合、TOP10 外、非法牌、provider assistant 消息及取消测试。
- [x] Run `npm test -- tests/ai/followup.test.ts tests/ai/provider.test.ts`，确认因缺少功能失败。
- [x] 实现上述接口，模型只解释已有证据，结构化回答中的比较牌种必须验证后用于本地展示。
- [x] GREEN：重跑定向测试及现有 advisor/prompt/robot 测试。

## Task 2：会话生命周期

Files: 新建 `src/composables/useAIConversation.ts`, `tests/composables/useAIConversation.test.ts`。

Interfaces: `useAIConversation(gameState,config,reactionAdvice?)` 返回结果、快照、消息、草稿、比较、loading/error/stale/locked/canAsk 及 analyze/send/cancel/reset 方法。依赖可注入以测试真实状态流而不调用远程服务。

- [x] RED：固定快照、引用推荐、直接提问、失败重试、取消与乱序、新局清理、上限、本地比较保留。
- [x] Run `npm test -- tests/composables/useAIConversation.test.ts`，确认缺少实现失败。
- [x] 实现捕获后等待本地同快照结果、请求隔离、单会话20轮和草稿1000字符规则。
- [x] GREEN：重跑上述测试。

## Task 3：界面与牌局接入

Files: `AIAnalysisPanel.vue`, 新建 `DiscardComparison.vue`, `GameView.vue`, `DiscardAdvisor.vue`, `ReactionAdvisor.vue`, 新建 `tests/ai-panel.test.ts`。

Interfaces: 面板接收 Task 2 状态与事件；比较组件只渲染本地 DiscardComparison。

- [x] RED：快捷项只填草稿、合法输入提交、中文组合输入不提交、旧局面标识、比较与错误同时显示、取消与上限状态。
- [x] Run `npm test -- tests/ai-panel.test.ts`，确认新行为失败。
- [x] 扩展现有面板，接入会话；新局/重播重置，自动分析尊重 locked；出牌建议与碰杠建议统一种数用语。
- [x] GREEN：定向测试、`npm test` 和 `npm run build`。

## Task 4：验收与交付

- [x] 浏览器验证桌面与横屏矮视口，使用可控模拟 AI 响应验证提问/追问/失败/切换，不使用用户密钥。
- [x] 独立代码审阅并修复重要问题，补充回归测试。
- [x] 更新 README，记录实际测试结果；只提交本任务文件，不合并 dev 或推送。

## 执行记录

- 基线：21 个文件、223 项测试通过。已有 Worker 不可用时的回退警告，不属本次失败。
- 前置核对：Task 1 的证据类型由 Task 2、3 复用；Task 2 的生命周期由 Task 3 驱动，接口一致。现有机器人调用依然使用默认10项。


### 最终验证记录

- 2026-10-18：完整 `npm test`，25 个测试文件、242 项测试通过；`npm run build` 通过。
- 浏览器使用 Playwright + 系统 Edge，模拟模型响应；验证直接提问、连续追问、本地比较、失败保留、重试、取消、输入快捷键隔离、旧局面、显式切换与刷新清理。
- 1280×800 与 844×390 布局检查，输入和发送在视口内、无横向溢出、页面错误为0。长内容通过信息抽屉的完整 flex 高度链条内部滚动。
- 独立审阅发现摸入牌可能误作另一弃牌，已补充 RED→GREEN 回归；进一步覆盖连续弃牌措辞及重新讨论后自动分析保护。
- UI 严格静态审计0错误；`git diff --check` 通过。
- 官方 DESIGN.md lint 离线尝试因本地未缓存工具而未运行，不安装额外依赖。产品构建和 UI 严格审计已执行。
- 未使用真实模型服务或用户密钥；真实服务的解释质量及 Android 实机软键盘未在本机验证。

### 运行反馈修复：跨轮留北澄清与回答格式（2026-10-18）

- 用户原话已加入回归：“你看，前面我就说留着北吧，你非让我打出去”及“我是说，如果我前面几轮留着北，现在就有一对北了，但是你前面让我弃牌了”。
- 原服务返回文本未取得，截图只能定位到 JSON 解析失败，不能断言服务当时具体返回格式。
- 追问接受可读普通文本及带说明文字/大小写围栏的有效 JSON；无效或截断的结构化回答仍报错、保留草稿，不把原始损坏 JSON 作为答案。
- 当前建议显式标为本轮及轮次；追问只复用玩法规则，不再继承单次分析“直接决策”的任务。明确缺少历史记录时不能确认或否认过去建议，不能用本轮数据证明当时决策。
- 历史假设与当前合法弃牌验证分离，分句处理历史置前/置后及明确返回当前的比较；反事实延续原假设范围。
- RED→GREEN 回归通过；全套测试249项，生产构建通过；浏览器用原话验证两轮消息、普通文字和带说明的JSON显示，页面无报错（模拟模型响应）。
- 不新增跨轮历史存档；真实服务原始故障响应与模型语义质量未实测。

### 真实服务复现与修复：追问 JSON 模式空输出（2026-10-18）

- 使用浏览器已有 AI 配置实际调用 deepseek-flash，未读取或记录密钥。修复前第二轮“我觉得能凑一对啊”请求成功结束（finish_reason=stop），但正文只有182个空格；继续放宽解析不能解决该问题。
- DeepSeek 官方 JSON Output 文档明确记录可能返回空 content：https://api-docs.deepseek.com/zh-cn/guides/json_mode/ 。
- 追问改用自然语言输出，移除 response_format=json_object 和 JSON 输出指令；单次分析继续使用原有默认 JSON 模式。本地进张比较仍由程序计算。
- 空白正文和达到输出上限分别提示；开发环境仅记录模型、输出模式、结束原因和正文长度等元信息，不记录正文、提问或密钥。
- 修复后同一服务、同一局面连续6轮成功，覆盖原报错短句、跨轮留北假设、本地共有/独有进张比较和进一步总结；6次均正常结束，正文非空。
- 新增默认 JSON/文本请求隔离、真实182空格响应、截断及隐藏推理不作答案的回归。完整测试25个文件、252项通过，生产构建和 git diff --check 通过；独立审阅未发现重要回归。

### 扩大真实服务验收（2026-10-25）

- 使用应用已有配置测试，未读取或记录密钥。两个种子（1792332866255、54321）、三个讨论局面，共32次成功追问及3次单次分析；开发诊断汇总35次正文均非空、结束原因均为stop。
- 第一组连续20轮完成，覆盖原报错原话、历史条件假设、共有/独有进张、种数与张数纠正、未计算概率等。第21轮发送禁用；重新讨论后归零。鬼牌和不在手中的弃牌方案本地拦截，保留草稿且不计成功轮次。
- 取消正在请求的追问后草稿保留，再发送成功且只计一轮。实际出北推进至第3轮后，旧讨论保留第0轮快照；主动分析当前牌面后旧记录清理、计数归零，分析及后续追问采用第3轮。
- 发现并修复：简称“白”后接“相比”“更好”“都是”等时漏识别，导致本地对比卡未切换。原话回归先失败后通过；实际服务验证“打北和打白”“打发和打白”均正确切换。
- 发现模型曾先说共有12种再改为10种。改为传递程序算好的共有/双方独有种数与中文牌名，移除原始maxCount等字段。修复后实际验证共有10、独有3/5，以及共有5、独有0/0，与本地结果一致。
- 发现单次分析会把并列风箭牌解释为“白更易成将”；共享规则补充证据边界，要求无差异依据时说明并列，禁止仅凭风箭身份编造成对概率优势。更新后第二副手牌分析说明并列，追问也明确没有独有差异。此为模型回答约束改进，不能保证任意自然语言解释均无事实错误。
- 最终版本完整 npm test：25个文件、260项通过；npm run build通过。原有Worker不可用回退警告仍存在。独立审阅未发现Important/Critical回归；本次不改变会话上限、历史存档范围或界面布局。
