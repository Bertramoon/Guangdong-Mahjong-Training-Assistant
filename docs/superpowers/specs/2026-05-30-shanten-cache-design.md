# 出牌建议缓存设计

## 设计背景

`getDiscardRecommendation` 每次调用约执行 420 次 `calculateShanten`，每次 shanten 内部对 5 个花色各跑一次 `suitMaxTaatsu` 的递归回溯。手牌复杂（多鬼牌、清一色）时，单次计算可达数百毫秒，会冻结 UI 主线程。

**核心洞察**：`suitMaxTaatsu(counts, isNumber)` 的输入是纯 count 数组（如 `[2,0,1,0,0,0,0,0,0]`），与具体牌的物理 ID 无关。相同的 count 分布必然产生相同结果，适合预计算并缓存。

## 方案：枚举预生成 + IndexedDB 持久化

### 缓存 Key 编码

```
key = `${suitKind}:${counts.join(',')}`
```

- `suitKind = 'N'`：数牌（万/条/筒，支持顺子），count 长度 9
- `suitKind = 'H'`：字牌（风/箭，不支持顺子），count 长度 3-4

万/条/筒共享 N 类缓存，风/箭共享 H 类缓存。Value 为 `SuitResult`：`{ any: number[], withPair: number[] }`。

### 枚举范围与规模

`enumerateCounts(length, maxTotal)` 递归生成每个位置 0-4、所有位置总和 ≤ `maxTotal` 的 count 数组。单花色在一手牌中最多 14 张，故 `maxTotal = 14`。

> **注意**：实际规模远大于早期估算（曾误估为 5,000-7,000）。真实条数为：

| 花色 | 配置 | 条数 |
|------|------|------|
| 数牌 | `enumerateCounts(9, 14)` | 405,350 |
| 风牌 | `enumerateCounts(4, 14)` | 620 |
| 箭牌 | `enumerateCounts(3, 14)` | 125 |
| **合计** | | **406,095** |

总计约 40.6 万次 `suitMaxTaatsu` 调用，数据量数十 MB。

### 存储格式：单条 blob

整个缓存作为**单条 IndexedDB 记录**存取（`store = suit_cache`）：

- key = `'__cache__'`，value = `{ version: CURRENT_CACHE_VERSION, entries: [string, SuitResult][] }`，一次结构化克隆写入/读取，替代逐条 `put`/`getAll`（40 万次逐条操作开销极大）。
- 另存极小的 key = `'__version__'`（仅版本号整数），供 UI 用单次 `get` 毫秒级探测缓存是否就绪，无需反序列化整条 blob。

预计算在 Web Worker（`shanten-worker.ts`）中完成，`writeEntriesToDB` 在一个 `readwrite` 事务内 `clear()` + 写 `__version__` + 写 `__cache__`。

### 运行时使用

1. `suitMaxTaatsu` 被调用 → 先查内存 `Map<string, SuitResult>`，命中即 O(1) 返回。
2. 未命中 → 计算，写入内存 Map（运行期不再回写 IndexedDB）。
3. 游戏开始前 `ensureCache`：从 IndexedDB 读 blob 灌入主线程 Map；版本不匹配则触发 worker 重新预计算。

计算重路径（出牌建议、反应分析、机器人智能出牌）已移入常驻 compute worker，worker 启动时也各自加载一份 blob 到自己的内存 Map；worker 不可用时回退主线程，主线程命中缓存仍为 O(1)。

### 版本失效

代码常量 `CURRENT_CACHE_VERSION`（当前 = 2）。IndexedDB 中存版本号，不匹配 → `ensureCache` 走重建，`writeEntriesToDB` 的 `store.clear()` 清掉旧数据后写新 blob。

### 首次加载与刷新体验

- **首次（无缓存）**：预计算约 2-3 秒，开始按钮显示"准备中…"。
- **刷新（已持久化）**：`hasCachedVersion()` 读 `__version__` 毫秒级确认缓存存在，按钮**立即**亮起；整份 blob 在后台载入（约 1 秒内）；真正开局前 `handleStart` 会 `await` 载入完成，确保主线程 Map 已填满（`GameBoard` 听牌判定等热路径依赖它）。
