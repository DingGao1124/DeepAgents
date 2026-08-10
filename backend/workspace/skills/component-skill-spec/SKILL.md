---
name: component-skill-spec
description: 为 Eva 活动平台的业务组件生成或更新完整 skill，区分运营业务输入与源码默认视觉，产出忠实还原默认 UI 的 mode HTML、meta.json、reference.md、组件 SKILL.md 和 agents/openai.yaml。用户要求从 Eva 组件源码创建、补全或更新组件 skill 时使用。
allowed-tools: Read, Glob, Grep, Bash, Write, Edit
---

# Eva 组件 skill 生成

将 Eva 业务组件源码转换为标准组件 skill。`component-skill-spec` 是组件 skill 的生成规范和单一来源；不要以现有组件产物反向覆盖规范。

## 第一步：定位并阅读源码

用户提供源码路径时直接使用。只有组件名时，依次：

1. Glob 搜索同名或近似目录。
2. 搜索 `packages/`、`components/`、`src/`、`component/`、`widget/`。
3. Grep `package.json` 的 `name`。
4. 仍无法定位时请求源码路径。

定位后按顺序阅读：

1. `package.json`；
2. 组件入口；
3. Props/types；
4. 默认 Props、`componentInfo.json` 及其表单默认值；
5. CSS/SCSS/CSS Modules、内联样式、默认图片/SVG 等视觉资源；
6. 接口、加载/成功/失败/降级状态机、埋点等核心逻辑；
7. Store；
8. `formControl.ts`，包括编辑器自动填充和字段显隐逻辑。

不得用经验补写接口、错误码或埋点。无法从源码确定的内容必须标为待确认。
Props 扁平化或重命名为 dataFields 时，必须记录逐字段映射；编辑器行为与 fragment
运行时行为必须分开描述，禁止把 `formControl.ts` 的能力写成 fragment 自带能力。

严格区分三类信息：

- `dataFields`：运营必须提供的业务数据或业务素材；
- `sourceDefaults`：源组件的默认视觉 Props、布局和状态样式，只用于生成默认 mode HTML；
- `previewData`：让默认 mode HTML 可预览的业务假数据，不得作为正式默认业务内容。

颜色、尺寸、间距、字体、圆角、阴影、`objectFit` 等纯视觉或布局字段，
不得因为存在于原组件表单中就转成运营输入。只有确实改变业务流程、数据范围或接口
语义的字段才可进入 `dataFields`。

## 第二步：确认源码摘要

生成文件前输出并确认：

```markdown
## 源码摘要

- 组件名、中文名、版本、平台
- 业务行为模式列表及选择条件；纯视觉差异不得拆成模式
- 各模式必填 dataFields
- 每个 dataField 的 `business-data` / `business-asset` 分类
- 源组件默认 Props、默认 DOM、默认样式和默认视觉资源
- 编辑器自动填充逻辑
- 运行时接口和跨组件事件
- 加载、成功、失败、空数据、降级及属性变化状态
- 源 Props → dataFields 映射，以及编辑器行为的运行边界
- `sourceDefaults` 与 `previewData`，以及二者不进入运营输入的确认
- 已知源码 bug
```

用户指出修正时更新摘要；确认后再写文件。

## 第三步：读取生成契约

确认摘要后，完整读取 [references/generation-contract.md](references/generation-contract.md)，严格使用其中的：

- meta schema 和命名约定；
- 业务输入、源码默认视觉基线与最终受控视觉生成的分层；
- reference 四层结构；
- `data-eva + data-mode + data-instance` 运行时协议；
- CSS/JS 模式隔离；
- API 环境、mock、事件总线和视觉填充协议；
- fragment、组件 SKILL.md 和 OpenAI metadata 模板。

契约与现有组件产物冲突时，以契约为准，并同步修正产物。

## 第四步：生成文件

在 `skills/<componentDir>/` 生成：

```text
SKILL.md
agents/openai.yaml
references/meta.json
references/reference.md
references/fragments/mode1.html
references/fragments/modeN.html
```

只创建实际需要的模式和资源。不要生成过程说明、临时文件或未被引用的文档。

## 第五步：确定性校验

运行：

```bash
node <component-skill-spec目录>/scripts/validate-eva-component.mjs <生成的组件skill目录>
```

修复全部错误并重跑。然后按生成契约末尾的人工清单核对源码语义、默认视觉忠实度、
视觉权限边界、业务钩子完整性和业务状态。只有自动校验及人工检查都通过才算完成。

## 输出

告知用户生成路径、业务行为模式、运营必填 dataFields、默认视觉还原依据、
保留的源码兼容行为、修复的源码 bug 和校验结果。
