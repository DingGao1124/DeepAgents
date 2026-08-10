# 短文本 业务规范

> 本文档面向使用 AI 生成短文本组件 HTML 的设计师和运营。
> mode HTML 保持源码默认 UI；最终视觉只在声明权限内生成；第二层业务契约不可修改。

---

## 第一层：模式目录

### 模式一：短文本

**适合场景：** 展示运营填写的一段文案，支持多行换行；视觉填充阶段通过 CSS 变量调整字号/颜色/字重/行高。

**必须包含的功能元素：**
- 文案节点（从 `window.__EVA_DATA_FIELDS__` 读取 `content`，由 JS 注入 `textContent`）

**源码默认视觉基线：**
- 字号：12px（`getRem(12)` → 0.24rem）——来自 `Text.tsx` defaultProps
- 颜色：`rgb(0, 0, 0)`——来自 `Text.tsx` defaultProps
- 字重：400——来自 `Text.tsx` defaultProps
- 行高：1.5 倍——来自 `Text.tsx` defaultProps
- 宽度：自适应（不设 width）——来自 `Text.tsx` defaultProps
- overflow: hidden, word-wrap: break-word——来自 `text.module.scss`

---

### 模式二：文本转图片

**适合场景：** 将文案内容通过 AI 生图渲染为图片展示，适合标题、标语等需要个性化视觉效果的短文案。

**必须包含的功能元素：**
- 图片节点（`data-fill="image" data-fill-gen="true"`，由视觉填充阶段生图）
- 图片节点携带 `data-gen-prompt="{{content}}"` 提示 AI 生图内容（组装时替换为实际文案）
- JS 将 `content` 写入图片节点的 `aria-label`，保障无障碍语义

**源码默认视觉基线：**
- 宽度：自适应（不设 width）
- 高度：24px（`getRem(24)` → 0.48rem）
- background-size: contain

---

## 第二层：业务约束（生成 HTML 时必须完整实现）

### 2.1 模式一初始化流程

1. 从 `window.__EVA_DATA_FIELDS__[eva-text_{instanceId}]` 读取 `content`
2. 将 `content` 写入文案节点的 `textContent`（禁止 innerHTML，防 XSS）
3. 无 content 时保持空白，不渲染占位文字

### 2.2 模式二初始化流程

1. 从 `window.__EVA_DATA_FIELDS__[eva-text_{instanceId}]` 读取 `content`
2. 将 `content` 写入图片节点的 `aria-label`（无障碍语义；图片内容由视觉填充阶段注入 background-image）
3. 无 content 时 aria-label 保持空字符串

### 2.3 数据源填充规范

- `content` 是运营填写的真实文案，由 dataFields 驱动，**不得硬编码**
- 模式一文案节点为动态渲染，不加 `data-fill` 相关属性
- 模式二图片节点不写入 `textContent`，文案只通过 `aria-label` 和 `data-gen-prompt` 传递

---

## 第三层：验证清单

### 模式一
- [ ] content 由 dataFields 驱动，非硬编码
- [ ] textContent 赋值，无 innerHTML
- [ ] 根节点包含 `data-ui-baseline="source-default"` 和 `data-eva-visual="style-only"`
- [ ] 文案节点无 `data-fill`、`data-fill-gen`、`data-gen-prompt`

### 模式二
- [ ] content 由 dataFields 驱动，非硬编码
- [ ] 图片节点有 `data-fill="image" data-fill-gen="true" data-gen-prompt="{{content}}"`
- [ ] JS 将 content 写入 aria-label，无 textContent 写入
- [ ] 根节点包含 `data-ui-baseline="source-default"` 和 `data-eva-visual="style-only"`

---

## 第四层：生成规范

### Fragment 格式（强制）

- 文件内只能包含 `<style>`、组件根节点 DOM、`<script>` 三部分
- **禁止出现 `<html>`、`<head>`、`<body>` 标签**
- 模式一根节点格式：`<div data-eva="eva-text" data-mode="mode1" data-instance="{{INSTANCE_ID}}">`
- 模式二根节点格式：`<div data-eva="eva-text" data-mode="mode2" data-instance="{{INSTANCE_ID}}">`

### AI 视觉权限规范

| 模式 | 区域 | 稳定钩子 | 权限 | 说明 |
|---|---|---|---|---|
| mode1 | 组件容器 | — | `style-only` | 可改 CSS 变量调整字号/颜色/字重/行高，不改 DOM |
| mode1 | 文案节点 | `data-eva-bind="content"` | `style-only` | 只改文字样式，不生图，不替换内容 |
| mode2 | 组件容器 | — | `style-only` | 可改 CSS 变量调整宽高，不改 DOM |
| mode2 | 图片节点 | `data-eva-bind="content"` | `style-only` | `data-fill-gen="true"`：AI 根据 `data-gen-prompt` 生成图片，注入 `background-image` |
