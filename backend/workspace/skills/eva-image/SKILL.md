---
name: eva-image
description: 为 Eva 活动页生成静态图片 fragment，保留源码默认 UI 基线，只向运营收集图片素材和必要业务行为。当用户说“用 eva-image 生成图片模块”“生成 Banner/KV 图片组件”时使用。
allowed-tools: Read
---

# Eva 图片组件

根据用户参数生成 `mode1` fragment。

## 第一步：确认输入

只收集：

1. `src`（必填，business-asset）：真实图片 URL；
2. `alt`（可选，business-data）：信息图片的替代文本，装饰图留空；
3. `clickPointer`（可选，business-data）：是否让点击穿透，默认 `false`；
4. 设计方向（可选）：设计稿、KV 或自然语言风格。

不得询问宽高、倍数、质量、objectFit、圆角、颜色等结构化视觉参数。

## 第二步：读取文件

完整读取 `references/meta.json`、`references/reference.md` 和
`references/fragments/mode1.html`。

## 第三步：生成

- 无设计方向时保持 mode HTML 的源码默认视觉；
- 有设计方向时只按 `data-eva-visual` 权限修改视觉，不修改脚本、业务字段或稳定钩子；
- 正式页面把业务字段注入 `window.__EVA_DATA_FIELDS__['eva-image_<instanceId>']`；
- `src` 是运营业务素材，视觉阶段不得覆盖；
- 不把视觉结果写入 `__EVA_DATA_FIELDS__`。

## 第四步：自检

- [ ] 只询问 `src`、`alt`、`clickPointer` 和可选设计方向
- [ ] 根节点保留 `data-ui-baseline="source-default"` 和视觉权限
- [ ] 业务 JS 通过 `data-eva-slot/bind` 稳定钩子绑定，不依赖视觉 class
- [ ] 未修改 CDN、点击穿透和多实例行为
- [ ] 未写入宽高、质量、倍数或样式 dataFields
- [ ] 正式输出已替换 `{{INSTANCE_ID}}`
