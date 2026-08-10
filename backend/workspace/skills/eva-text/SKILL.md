---
name: eva-text
description: 为 Eva 活动页生成短文本 fragment。模式一展示纯文案，视觉填充阶段通过 CSS 调整样式；模式二将文案通过 AI 生图渲染为图片。当用户说"用 eva-text 生成文本组件""帮我生成短文本""生成文案展示""文字转图片""文案生成图片"时使用。
allowed-tools: Read
---

# Eva 短文本组件

## 第一步：确认输入

1. 只收集以下业务数据，缺失时向用户询问：
   - `content`（必填，business-data）：展示的文案内容

2. 询问模式选择（未明确时询问）：
   - **模式一：短文本** — 纯文字展示，视觉填充阶段可调整字号/颜色/字重/行高
   - **模式二：文本转图片** — 将文案通过 AI 生图渲染为图片，适合标题、标语等需要个性化视觉效果的场景

3. 不询问字号、颜色、字重、行高、宽度等视觉配置，这些通过 `data-eva-visual` 权限在视觉填充阶段处理。

4. 可选设计方向。

## 第二步：读取文件

完整读取 `references/meta.json` 和对应模式的 fragment 文件：
- 模式一：`references/fragments/mode1.html`
- 模式二：`references/fragments/mode2.html`

## 第三步：生成

- 无设计方向保持源码默认 UI；有设计方向只在 `data-eva-visual` 权限内修改；
- 文案由 `window.__EVA_DATA_FIELDS__` 注入，fragment 运行时读取，不得硬编码；
- 模式一：视觉结果只进入 CSS 变量，不写 `__EVA_DATA_FIELDS__`；
- 模式二：`data-gen-prompt` 保留 `{{content}}` 占位符，由组装阶段替换为实际值，不得在 fragment 中硬编码文案。

## 第四步：自检

- [ ] 只收集 meta 声明的 content 字段，没有结构化视觉输入
- [ ] 根节点包含默认基线和视觉权限
- [ ] 文案由 dataFields 驱动，不硬编码
- [ ] 正式输出已替换 `{{INSTANCE_ID}}`
- [ ] 模式一：文案节点无 `data-fill`、`data-fill-gen`、`data-gen-prompt`
- [ ] 模式二：图片节点有 `data-gen-prompt="{{content}}"` 且保留占位符未替换
