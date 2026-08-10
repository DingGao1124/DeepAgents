# eva-components - Eva 活动平台组件 AI 技能集合

将 Eva 活动平台业务组件的使用场景与最佳实践封装为可复用的 skill。

<table>
  <thead>
    <tr>
      <th>分类</th>
      <th>技能</th>
      <th>命令</th>
      <th>简介</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td rowspan="3">组件规范</td>
      <td>eva-page-builder</td>
      <td><code>$eva-page-builder</code></td>
      <td>从自然语言需求编排组件、校验页面并发布真实预览</td>
    </tr>
    <tr>
      <td>component-skill-spec</td>
      <td><code>$component-skill-spec</code></td>
      <td>从 Eva 组件源码生成标准化 meta、reference、fragment 和组件 skill</td>
    </tr>
    <tr>
      <td>eva-page-template-spec</td>
      <td><code>$eva-page-template-spec</code></td>
      <td>将多个组件模式拼合为 H5/PC 单文件活动页</td>
    </tr>
    <tr>
      <td rowspan="3">视觉换皮</td>
      <td>eva-fill-policy</td>
      <td><code>$eva-fill-policy</code></td>
      <td>扫描 HTML，输出节点级填充策略清单（生图 / 填色 / CSS），可路由至下游 skill</td>
    </tr>
    <tr>
      <td>eva-style-ref</td>
      <td><code>$eva-style-ref</code></td>
      <td>根据 KV + 原型截图生成整页视觉稿或 256×256 风格锚点图，供 eva-visual-fill 使用</td>
    </tr>
    <tr>
      <td>eva-visual-fill</td>
      <td><code>$eva-visual-fill</code></td>
      <td>接收视觉参考图，在 data-eva-visual 权限内填充颜色、生成图片并输出可上线 HTML</td>
    </tr>
    <tr>
      <td rowspan="5">业务组件</td>
      <td>eva-image</td>
      <td><code>$eva-image</code></td>
      <td>生成静态图片组件 fragment</td>
    </tr>
    <tr>
      <td>eva-video</td>
      <td><code>$eva-video</code></td>
      <td>生成自动播放视频组件 fragment，支持加载占位与播放失败兜底</td>
    </tr>
    <tr>
      <td>eva-text</td>
      <td><code>$eva-text</code></td>
      <td>生成文本组件 fragment</td>
    </tr>
    <tr>
      <td>eva-lottery</td>
      <td><code>$eva-lottery</code></td>
      <td>生成抽奖组件 fragment，支持多种抽奖模式</td>
    </tr>
    <tr>
      <td>h5-follow-new</td>
      <td><code>$h5-follow-new</code></td>
      <td>生成单 UP 主或多 UP 主关注组件 fragment</td>
    </tr>
  </tbody>
</table>

## 技能分工

- `eva-page-builder` 是活动页生成 Agent 的端到端运行流程入口。
- `component-skill-spec` 是组件 skill 的生成规范和单一来源。
- `eva-image`、`eva-video`、`eva-text`、`eva-lottery`、`h5-follow-new` 是依据该规范生成并持续校验的组件 skill。
- `eva-page-template-spec` 负责组件拼合和运行环境注入。
- 视觉换皮流水线：`eva-fill-policy` 分析填充策略 → `eva-style-ref` 生成参考图 → `eva-visual-fill` 执行填充，三者各司其职，不修改业务节点。

---

## 目录结构

```
eva-components/
├── .claude-plugin/
│   └── plugin.json                # 插件配置
├── skills/                        # 各组件 skill（按需添加）
│   ├── component-skill-spec/       # 组件 skill 生成规范
│   ├── eva-page-template-spec/     # 页面拼合
│   ├── eva-fill-policy/            # 填充策略分析
│   ├── eva-style-ref/              # 视觉参考图生成
│   ├── eva-visual-fill/            # 视觉填充
│   ├── eva-image/                  # 图片组件
│   ├── eva-video/                  # 视频组件
│   ├── eva-text/                   # 文本组件
│   ├── eva-lottery/                # 抽奖组件
│   └── h5-follow-new/              # H5 关注组件
├── scripts/
│   └── generate-previews/          # 预览图生成 + fragment/catalog 上传脚本
└── README.md
```

## 新 skill 收录原则

每个 skill 对应一个 Eva 平台业务组件，封装该组件的：

- 标准用法与参数说明
- 常见使用场景示例
- 注意事项与最佳实践

## 维护者

- V <wangjianhui@bilibili.com>
- re安穗 <xufujuan01@bilibili.com>
- GG_Bond <gaoding01@bilibili.com>
