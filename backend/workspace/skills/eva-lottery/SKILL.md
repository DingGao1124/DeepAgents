---
name: eva-lottery
description: 为 Eva 活动页生成轮播抽奖 fragment，支持奖品轮播展示、抽1次/抽10次、中奖弹窗、中奖名单滚动播报。当用户说"用 eva-lottery 生成抽奖模块""帮我生成抽奖组件""生成轮播抽奖"时使用。
argument-hint: "<lotteryId=xxx> [activityId=yyy]"
allowed-tools: Read
---

# Eva 轮播抽奖组件

## 第一步：确认输入

只收集以下业务数据，缺失的向用户询问：

1. **模式**：根据需求选择模式（见下表），无特殊需求默认 mode1
   - mode1：抽1/10次 + 中奖名单
   - mode2：抽1/10次，无中奖名单
   - mode3：仅抽1次 + 中奖名单
   - mode4：仅抽1次，无中奖名单
2. **业务数据**：
   - `lotteryId`（必填，business-data）：后台创建的抽奖活动 SID
   - `activityId`（可选，business-data）：活动页面 ID，用于「我的中奖记录」跳转
   - `openPrizePool`（可选，boolean，默认 true）：是否展示查看奖池入口
3. **设计方向**（可选）：设计稿、KV、参考图或自然语言描述

**禁止询问**：背景色、文字色、按钮颜色/尺寸/图片等视觉或布局参数。无设计方向时保留源码默认视觉。

## 第二步：读取文件

完整读取以下文件（必须，不得跳过）：

1. `references/reference.md` — 业务约束、接口规范、状态机、错误码、埋点
2. `references/meta.json` — dataFields、sourceDefaults、previewData
3. `references/fragments/mode{N}.html` — 对应模式的源码默认视觉基线 fragment

## 第三步：生成

- 无设计方向时保持源码默认 DOM 和视觉，不擅自美化
- 有设计方向时按 `data-eva-visual` 权限修改 CSS、视觉素材或布局；不修改 `<script>`，不删除稳定钩子
- 用用户提供的真实 `lotteryId` 和 `activityId` 替换 previewData
- 保留 Adapter、MOCK_DATA、API_MODE 切换逻辑；生产时走真实接口
- `{{INSTANCE_ID}}` 替换为实际序号（通常为 `0`）

### 背景图生成规则

- **mode2 / mode4**（无中奖名单）：组件根节点带 `data-fill="image"`，直接在根节点设置 `background-image`
- **mode1 / mode3**（有中奖名单）：两个区域各自独立背景图
  - 抽奖区：`.elot-lottery-area`（包含顶部栏 + 奖品轮播 + 按钮），带 `data-fill="image"`
  - 中奖名单区：`.elot-winlist-section`，带 `data-fill="image"`
  - 根节点**不设** `background-image`

### 弹窗生图规则

所有 mode 的中奖/谢谢参与弹窗均强制生图，无需用户提供素材：

- **弹窗背景**：`.elot-modal-box` 带 `data-fill-gen="true"`，生成与活动风格匹配的弹窗背景图，写入 `style="background-image: url(...)"`;  尺寸参考 608×848px（对齐 16 倍数），`background-size: cover`
- **谢谢参与插画**：`.elot-modal-no-result-img`（`<img>` 节点）带 `data-fill-gen="true"`，生成与活动风格匹配的安慰/遗憾类插画，写入 `src` 属性；尺寸 208×208px

## 第四步：自检

- [ ] 只询问了 `lotteryId` 和 `activityId`，未询问任何视觉参数
- [ ] 根节点包含 `data-ui-baseline="source-default"`
- [ ] 所有 CSS 选择器以 `[data-eva="eva-lottery"][data-mode="modeN"]` 开头
- [ ] 业务 JS 通过 `data-eva-action/bind/slot/state` 查找节点，不依赖视觉 class
- [ ] Adapter + MOCK_DATA 完整，`window.__EVA_API_MODE__` 控制切换
- [ ] `drawing` 标志在 `finally` 中释放
- [ ] 未登录时点击抽奖按钮唤起登录
- [ ] 抽奖成功展示弹窗，弹窗关闭后刷新次数
- [ ] 接口失败展示错误状态，可点击重试
- [ ] 包含 `@media (prefers-reduced-motion: reduce)`，减少动效时轮播和滚动动画停止
- [ ] 可交互按钮包含 `:focus-visible`
- [ ] 无 `<html>`、`<head>`、`<body>` 标签
- [ ] mode1/3 背景图分两层（`.elot-lottery-area` + `.elot-winlist-section`），根节点无背景图
- [ ] mode2/4 背景图在根节点
- [ ] `.elot-modal-box` 已生成弹窗背景图并写入 `style="background-image: url(...)"`
- [ ] `.elot-modal-no-result-img` 已生成谢谢参与插画并写入 `src` 属性
