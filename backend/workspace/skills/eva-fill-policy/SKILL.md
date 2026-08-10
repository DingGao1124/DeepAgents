---
name: eva-fill-policy
description: 接收活动页 HTML，扫描 data-eva-visual、data-fill、data-fill-gen 属性和节点语义，输出结构化填充策略清单，明确每个节点应生图、填色还是 CSS 实现。输出结果可直接交给 eva-visual-fill、design-title-components 等生图 skill 消费。用于"分析填充策略""哪些地方生图""哪些填色""生成填充清单"等任务。
---

# Eva Fill Policy

分析活动页 HTML，输出结构化填充策略清单——明确每个可填充节点的处理方式，作为生图 skill（如 design-title-components）和 eva-visual-fill 的前置输入。

---

## 输入

1. **活动页 HTML**（必须）：本地文件路径或内联字符串。缺少时必须询问。
2. **KV 图**（可选）：提供时用于判断主视觉节点是否可复用 KV URL，并在摘要中标注。

---

## 第一步：扫描节点

读取 HTML，收集所有带有以下任一标记的节点：

- `data-fill="image"`
- `data-fill="color"`
- `data-fill-gen="true"` 或 `data-fill-gen="false"`
- `data-eva-visual`（非 `locked` 或未标注者）

对每个节点记录：

| 字段 | 说明 |
|------|------|
| `selector` | 可唯一定位该节点的 CSS 选择器或 XPath |
| `data-eva` / `data-mode` | 所属组件和模式 |
| `data-eva-visual` | `style-only` / `layout` / `free-decoration` / `locked` / 未标注 |
| `data-fill` | `image` / `color` / `none` / 未标注 |
| `data-fill-gen` | `true` / `false` / 未标注 |
| `data-gen-prompt` | 若存在，记录完整值 |
| `semantic` | 从 class、aria-label、周边 DOM 推断的节点语义（banner / logo / 插画 / 标题图 / 装饰图 / 按钮 / 图标 / 背景 / 其他） |
| `size` | 从 CSS 推断的宽高或宽高比 |

---

## 第二步：判定填充策略

对每个节点，依次应用以下规则，遇到第一个命中规则即停止：

### 规则 1：视觉权限锁定

`data-eva-visual` 为 `locked` 或未标注 → 策略：**锁定，不处理**

### 规则 2：运营显式标注（优先级最高）

- `data-fill-gen="true"` → 策略：**强制 AI 生图**
- `data-fill-gen="false"` → 策略：**强制 CSS 实现**

### 规则 3：颜色节点

`data-fill="color"` → 策略：**颜色填充**（写入 CSS 变量或 `style` 属性）

### 规则 4：图片节点 AI 自动判断（`data-fill="image"` 且无显式 `data-fill-gen`）

按节点语义判断：

| 语义 | 策略 |
|------|------|
| banner、主视觉、大背景图 | **复用 KV**（若有 KV 图则直接用其 URL；无 KV 则 AI 生图） |
| logo、品牌标识 | **复用 logo**（若有素材则直接用其 URL；无素材则标注"待补充"） |
| 插画、角色、定制装饰图 | **AI 生图** |
| 按钮图片（有配套状态节点） | **AI 生图**（须覆盖全部状态，同组策略统一） |
| 小图标、几何装饰 | **CSS 实现** |
| 无法明确判断 | **AI 生图**（`data-fill="image"` 表明运营期望图片呈现） |

### 规则 5：`data-fill` 未标注但有视觉权限

`data-eva-visual` 为 `style-only` 或 `free-decoration`，且 `data-fill` 未标注 → 策略：**CSS 样式调整**（只改颜色、字体等视觉属性，不涉及图片）

---

## 第三步：识别按钮状态组

对所有策略为"AI 生图"或"CSS 实现"的按钮节点，识别状态组：

1. 优先按相同 `data-eva-action` + 不同 `data-eva-state` 归组
2. 旧页面兼容：相同父容器下多个 `data-fill="image"` 节点，或 class 含 `-default`/`-followed`/`-active`/`-disabled`/`-loading`
3. CSS 通过 `opacity: 0/1` 或 `display` 切换显隐的兄弟节点

**同一状态组内策略必须统一**（要么全部生图，要么全部 CSS）。若判断结果混用，统一改为 AI 生图。

---

## 第四步：识别可由 design-title-components 处理的节点

扫描以下特征，标记为 `title-gen` 类型（可交给 design-title-components skill 生成）：

- `data-fill-gen="true"` 且节点语义为标题图、艺术字、栏目标题
- class 含 `title`、`art-text`、`section-title`、`module-title` 等
- `aria-label` 或周边文本表明其为页面栏目标题

对 `title-gen` 节点，同时记录：

- 节点内 `textContent`（即标题文案）
- 节点宽高或宽高比
- 建议交给 design-title-components 的输入参数：`titles` 列表、`size`

---

## 第五步：输出填充策略清单

### 5.1 节点级清单

```
## 填充策略清单

### 生图节点（AI 生图）
| 节点 | 语义 | 尺寸 | 备注 |
|------|------|------|------|
| [selector] | banner | 750×400 | 复用 KV URL |
| [selector] | 插画 | 400×300 | 需生图，建议结合 KV 风格 |
| [selector] | 按钮-默认态 | 200×80 | 状态组：默认/已关注 |
| [selector] | 按钮-已关注态 | 200×80 | 同上状态组，策略统一 |

### 颜色填充节点
| 节点 | 语义 | 目标属性 |
|------|------|----------|
| [selector] | 背景色 | --primary-bg |

### CSS 实现节点
| 节点 | 语义 | 说明 |
|------|------|------|
| [selector] | 小图标 | 几何装饰，用伪元素实现 |

### 栏目标题节点（建议交给 design-title-components）
| 节点 | 文案 | 尺寸 | 建议输入 |
|------|------|------|----------|
| [selector] | 活动投稿 | 710×80 | titles: ["活动投稿"], kv: [KV图] |

### 锁定节点（不处理）
| 节点 | 原因 |
|------|------|
| [selector] | locked 或未标注 data-eva-visual |
```

### 5.2 汇总摘要

```
填充策略分析完成
HTML 路径：[文件路径]
扫描节点总数：N
- AI 生图：N 个（其中 title-gen：N 个）
- 颜色填充：N 个
- CSS 实现：N 个
- 复用 KV/Logo：N 个
- 锁定不处理：N 个
按钮状态组：N 组

下一步建议：
1. 将 title-gen 节点列表交给 design-title-components skill，输入 KV 图和标题列表
2. 将完整清单和 KV 图交给 eva-visual-fill，进入整页填充流程
```

---

## 与其他 skill 的衔接

| 下游 skill | 输入 | 说明 |
|-----------|------|------|
| `design-title-components` | `title-gen` 节点的标题文案列表 + KV 图 | 生成栏目标题图片，结果回填对应节点 |
| `eva-visual-fill` | 完整填充策略清单 + HTML + KV 图（可选） | 执行视觉填充，跳过已由本 skill 分析的策略推导步骤 |
