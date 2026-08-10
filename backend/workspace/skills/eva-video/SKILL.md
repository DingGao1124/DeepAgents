---
name: eva-video
description: 为 Eva 活动页生成自动播放视频 fragment，支持加载占位与播放失败兜底，只收集真实视频和图片素材。当用户说“用 eva-video 生成视频模块”“生成视频 Banner/背景视频”时使用。
allowed-tools: Read
---

# Eva 视频组件

## 第一步：确认输入

只收集 `videoSrc`（必填）、`imgSrc`（必填）、`posterSrc`（可选）三项 business-asset，
以及可选设计方向。不得询问 objectFit、宽高、背景色、圆角或其他视觉参数。

## 第二步：读取文件

完整读取 `references/meta.json`、`references/reference.md`、`references/fragments/mode1.html`。

## 第三步：生成

- 无设计方向时保持源码默认 UI；有设计方向时只在 `data-eva-visual` 权限内修改；
- 三项素材由 `__EVA_DATA_FIELDS__['eva-video_<instanceId>']` 注入，视觉阶段不得覆盖；
- 保留 play Promise 拒绝、error、loadeddata、reduced-motion 和多实例逻辑；
- 不生成接口 Adapter，不把视觉结果写入业务数据。

## 第四步：自检

- [ ] 未询问 objectFit、width、height 或样式字段
- [ ] 根节点包含默认基线和视觉权限标记
- [ ] 动态媒体包含 `data-eva-bind`，业务 JS 不依赖视觉 class 查找节点
- [ ] 自动播放失败、资源错误和减少动效均正确降级
- [ ] 正式输出已替换 `{{INSTANCE_ID}}`
