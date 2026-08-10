# 视频业务规范

> mode HTML 保持源码默认视觉；最终视觉受权限控制；视频、兜底图和 poster 均为不可覆盖的业务素材。

## 第一层：模式目录

mode1 用于自动静音循环播放，并在加载中、播放受限或资源错误时展示兜底图。

| 区域 | 稳定钩子 | `data-eva-visual` | `data-fill` | 说明 |
|---|---|---|---|---|
| 容器 | `data-eva-slot="media"` | `style-only` | `none` | 可改 CSS，不改媒体业务 |
| 视频 | `data-eva-bind="videoSrc"` | `locked` | `none` | 业务素材 |
| 兜底图 | `data-eva-bind="imgSrc"` | `locked` | `none` | 业务素材 |

纯视觉差异不增加模式。

## 第二层：业务约束

1. 只读取 `videoSrc/imgSrc/posterSrc`；objectFit 固定使用源码默认 `cover`，尺寸由默认容器/最终视觉负责。
2. 加载前创建兜底图；创建 muted/autoplay/loop/playsInline video。
3. `loadeddata` 后移除占位图；`play()` reject 或 `error` 时移除视频并恢复兜底图。
4. reduced-motion 时不创建视频，直接显示兜底图。
5. `videoSrc` 为空不创建视频；`imgSrc` 为空时安全保持空容器。
6. formControl 读取 metadata 回填尺寸属于编辑器能力，不进入运行时或运营输入。

## 第三层：验证清单

- [ ] muted/autoplay/loop/playsInline/preload 正确
- [ ] loadeddata、play reject、error、reduced-motion 状态正确
- [ ] objectFit 为源码默认 cover，未从业务数据读取宽高或样式
- [ ] 多实例幂等且素材不串实例
- [ ] 默认根容器没有源码不存在的背景、裁剪、圆角或阴影

## 第四层：生成规范

遵守 component-skill-spec。媒体通过 `createElement` 创建并携带稳定 `data-eva-bind`；
视觉阶段不得修改 `<script>` 或三项业务素材。
