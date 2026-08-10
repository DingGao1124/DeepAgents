---
name: eva-page-builder
description: 编排 Eva 活动页的端到端构建流程：从自然语言提取页面目标、组件、业务数据、布局和目标页面，按需读取组件 Skill 与 fragment，生成单文件 HTML，执行确定性校验并发布真实预览。用户要求创建、搭建、修改、组合、校验或预览活动页面时使用。
---

# Eva Page Builder

把运营表达转换为可校验、可预览的 Eva 活动页，不要求用户理解组件底层字段。

## 1. 判断任务与收集输入

先区分咨询、已有页面修改和新页面构建。仅咨询时直接回答，不创建文件。

构建或修改页面时提取：

- 页面目标、活动场景和目标页面
- H5 或 PC 平台，默认 H5
- 页面标题、组件及顺序、布局层级
- 组件业务数据和素材 URL
- API 环境：明确正式上线时用 `production`，用户明确要 mock/演示时用 `preview`
- 样式、交互和视觉方向

调用 `list_eva_components` 获取合法组件、模式和必填字段。能够安全默认的可选项直接补全。只有 production 所需必填业务字段缺失、目标页面不明确，或歧义会产生实质不同结果时，才用自然语言一次性确认关键问题。

## 2. 按需加载领域知识

始终读取 `/skills/eva-page-template-spec/SKILL.md`。只读取本次选中组件的 `/skills/<component>/SKILL.md`、`references/meta.json` 和相应 mode fragment，不加载无关组件。

需要视觉策略分析时读取 `/skills/eva-fill-policy/SKILL.md`。只有当前运行环境确实提供图像生成能力且用户提供了所需素材时，才进入 `eva-style-ref` 或 `eva-visual-fill` 流程；否则保留用户素材和组件默认视觉基线，并明确说明未执行 AI 生图。

## 3. 生成页面

按 `eva-page-template-spec` 组装页面：

1. 按组件维度从 0 注入 `data-instance`。
2. 只把 business-data 和 business-asset 写入 `window.__EVA_DATA_FIELDS__`。
3. production 禁止注入 `previewData`、`sourceDefaults` 或空值冒充业务必填字段。
4. 保持 CSS、脚本、组件模式和跨组件事件的隔离规则。
5. 把工作草稿写入 `/drafts/<简短英文名>.html`。
6. 用户确认或配置完整后，把最终版写入 `/artifacts/<简短英文名>.html`。

不得修改 `/skills`。不要尝试执行 Shell 命令。

## 4. 校验与修复

对输出 HTML 调用 `validate_eva_page`。如果失败，根据 `errors` 修复文件并重新校验，最多连续修复三轮。仍失败时停止发布，向用户列出具体阻塞项，不能声称构建成功。

校验通过后再调用 `create_preview`，传入实际文件路径和目标页面。只有返回 `ok: true` 时才使用工具返回的 `previewUrl`；不得自行拼接链接。

## 5. 回复

成功时简洁回复：

- 页面或组件
- 关键配置与组件顺序
- 目标页面
- `create_preview` 返回的预览链接
- production 必填字段、登录状态或视觉能力方面的必要提示

失败时说明失败阶段、具体原因和用户可补充或调整的内容。无论工具成功或失败，都必须给出最终自然语言回复。
