---
name: h5-follow-new
description: 为 Eva H5 活动页生成单UP主或多UP主关注 fragment，保留关注/取关、过滤和换一换业务行为，视觉仅在授权区域生成。当用户说“生成关注组件”“单UP主关注”“多UP主关注列表”时使用。
allowed-tools: Read
---

# H5 关注组件

## 第一步：确认输入

1. 选择 `mode1` 单UP主或 `mode2` 多UP主；
2. 只收集当前 mode 在 `meta.json` 声明的业务数据/素材；
3. 可选设计方向。

不得询问 layout、列数、间距、颜色、按钮图片/尺寸或 `styles`。`unfollow`、
`exChange`、`showUpCount`、`filterFollowedUp` 是会改变业务行为的数据，不是视觉配置。

## 第二步：读取文件

完整读取 `references/meta.json`、`references/reference.md` 和对应 mode fragment。

## 第三步：生成

- 无设计方向保持源码默认 UI；有设计方向只在 `data-eva-visual` 权限内修改；
- 头像容器 `.h5fn-face`、头像图片、昵称 `.h5fn-name` 均为 `data-eva-visual="style-only"`，可修改圆角、尺寸、颜色、字号等样式；`data-fill="none"` 只表示不替换头像图片 URL 和昵称文字内容，不限制样式修改；
- 完整保留接口、登录、错误码、请求锁、事件总线、过滤、换一换和埋点；
- `<script>` 只通过 `data-eva-action/bind/slot/state` 绑定业务节点；
- 视觉结果只进入 CSS/视觉 DOM，不写 `__EVA_DATA_FIELDS__`。

## 第四步：自检

- [ ] 只收集 meta 声明的业务字段，没有结构化视觉输入
- [ ] 根节点包含默认基线和视觉权限
- [ ] 稳定业务钩子完整，业务 JS 不依赖视觉 class 查询节点
- [ ] production/preview、错误码、取关、过滤、换一换、多实例行为未改变
- [ ] `getFollowList` 使用 `/x/relation/followings/simple`，解析时兼容纯数字与对象两种 list 格式，不能用 `item.mid` 直接取值
- [ ] `isFetching` 在 finally 释放，mock 不随机失败
- [ ] 正式输出已替换 `{{INSTANCE_ID}}`
