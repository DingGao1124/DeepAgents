# 图片业务规范

> mode HTML 忠实还原源码默认 UI；最终视觉只能在声明权限内生成；业务素材和点击行为不可更改。

## 第一层：模式目录

### 模式一：静态图片

适用于 Banner、KV、装饰图等单图展示。必填 `src`；可选 `alt`、`clickPointer`。

源码默认视觉基线：PC 424×236，移动端 212×118，默认资源见 `meta.sourceDefaults`；
源码未设置 object-fit、裁剪、背景、圆角或阴影。

| 区域 | 稳定钩子 | `data-eva-visual` | `data-fill` | 说明 |
|---|---|---|---|---|
| 容器 | `data-eva-slot="image"` | `style-only` | `none` | 可改 CSS，不改 DOM/业务属性 |
| 图片 | `data-eva-bind="src"` | `style-only` | `none` | `src` 为业务素材，禁止视觉替换 |

模式选择：静态单图统一使用 mode1，纯视觉差异不新增模式。

## 第二层：业务约束

1. 从 `__EVA_DATA_FIELDS__['eva-image_' + instanceId]` 读取 `src/alt/clickPointer`。
2. 正式实例存在配置 key 但 `src` 为空时不渲染图片；fragment 独立预览时使用 `previewData`。
3. 仅对 B 站 BFS 的 JPG/JPEG/PNG/WebP/GIF/AVIF 位图按源码默认 multiple/quality 和当前默认尺寸格式化；SVG、非 BFS 地址、未知格式及 `closeBmg=1` 资源原样使用。
4. `clickPointer=true` 时容器设置 `pointer-events:none`。
5. 图片动态创建到 `data-eva-slot="image"`，并标记 `data-eva-bind="src"`。
6. 编辑器缩放和 formControl 自动回填不属于 fragment 运行时能力。

## 第三层：验证清单

- [ ] 独立预览与源码默认资源、PC/H5 默认尺寸一致
- [ ] 正式 `src` 为空不误用预览图
- [ ] 外部 URL 不追加 CDN 参数，B 站 CDN 参数不会重复叠加
- [ ] `alt` 始终存在；`clickPointer` 行为正确
- [ ] 多实例互不干扰，初始化幂等
- [ ] 无 object-fit、裁剪背景或无效 focus 样式

## 第四层：生成规范

遵守 component-skill-spec。根节点默认 `style-only`；业务图片使用 `data-fill="none"`；
业务 JS 只使用 `data-eva-slot/bind` 查找业务节点，不使用视觉 class。
