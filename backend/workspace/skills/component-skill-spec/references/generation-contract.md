# Eva 组件 skill 生成契约

本文件是 `component-skill-spec` 的唯一详细生成契约。完成源码分析并确认摘要后再读取；生成的组件 skill 与本文件冲突时，以本文件为准。

## 核心分层

同一个组件 skill 同时承担“可信基线”和“受控视觉生成”的职责，必须按阶段区分：

1. **生成 skill 时**：`fragments/modeX.html` 是源组件默认参考实现。业务行为和默认
   视觉都必须忠实于源码，不得擅自美化或重新设计。
2. **运营调用组件 skill 时**：只询问业务行为模式及必要业务数据/素材，不询问原组件
   的颜色、尺寸、间距、字体、圆角、阴影、`objectFit` 等视觉 Props。
3. **生成最终页面时**：AI 可以根据设计稿、KV 或自然语言，在组件声明的视觉权限内
   调整样式、素材、布局和非业务包装层；用户没有提供设计方向时保留 mode HTML 的源码
   默认视觉。业务脚本、业务钩子、必需节点、状态语义、接口、埋点、登录、降级和跨组件
   事件均被锁定，不得修改或删除。

“mode HTML 默认视觉忠实于源码”不等于最终 UI 被锁死；它提供可验证、可回退的默认
基线。最终页面允许在明确授权的视觉区域内生成 UI，而不是任意重写整个 DOM。

## 目录

- [meta.json 规范](#metajson-规范)
- [命名规范](#命名规范)
- [reference.md 规范](#referencemd-规范)
- [fragment 规范与模板](#fragment-规范与模板)
- [组件 SKILL.md 与 OpenAI metadata](#组件-skillmd-与-openai-metadata)
- [最终校验](#最终校验)

## meta.json 规范

在 `skills/<componentDir>/references/` 目录下创建 `meta.json`：

```json
{
  "schemaVersion": 2,
  "name": "ComponentName（PascalCase，与组件包名对应）",
  "label": "组件中文名",
  "description": "组件功能一句话描述，用于 UBW 选择界面展示，帮助运营判断是否选用",
  "platform": "H5 | PC | H5/PC",
  "version": "与组件 package.json 的 version 一致",
  "componentDir": "kebab-case 目录名，与 skills/<componentDir>/ 路径一致",
  "modes": [
    {
      "id": "mode1",
      "label": "模式中文名",
      "fragment": "fragments/mode1.html",
      "fragmentUrl": "",
      "previewImage": "",
      "wireframe": {
        "format": "svg",
        "variant": "组件类型标识，如 video / image / text / text-image / lottery-mode1",
        "label": "组件中文名"
      }
    }
  ],
  "dataFields": [
    {
      "key": "字段key",
      "label": "字段中文名",
      "type": "string | number | boolean | string[] | object | object[]",
      "kind": "business-data | business-asset",
      "sourceProp": "源组件 prop 路径，如 video.src；非 Props 来源时说明来源",
      "required": false,
      "requiredForModes": ["mode1"],
      "multiple": false,
      "items": {
        "uid": { "type": "string", "required": true },
        "uname": { "type": "string", "required": true },
        "face": { "type": "string", "required": true }
      },
      "description": "用途说明，尤其说明这个字段如何影响接口调用或渲染"
    }
  ],
  "sourceDefaults": {
    "mode1": {
      "props": {
        "源 prop 路径": "从源码读取的默认值，如 video.size: cover"
      },
      "styleSources": ["src/Component/style.module.scss"],
      "notes": "默认 DOM、资源和状态视觉的必要说明"
    }
  },
  "previewData": {
    "mode1": {
      "dataField key": "仅供 mode HTML 预览的假数据；图片可用源码示例或空字符串"
    }
  },
  "crossComponentEvents": [
    {
      "direction": "emit | listen",
      "event": "事件名；新事件使用 EVA_组件名_事件名，兼容源码时可保留既有事件名",
      "transport": "eva-event-bus",
      "payload": "payload 类型描述",
      "description": "何时触发或监听，用于多组件拼接时的协调"
    }
  ]
}
```

**字段说明：**

- `schemaVersion`：固定为 `2`。本项目处于初期阶段，不保留旧 schema 兼容分支；缺失或
  非 `2` 都视为无效产物。
- `dataFields`：运营必须填写的业务数据或业务素材，例如 uid、数据源 ID、视频 URL、
  兜底图片。不得包含纯视觉或布局配置。
- `kind`：`business-data` 表示 ID、数量规则、业务开关等会改变业务语义的数据；
  `business-asset` 表示必须由运营提供的真实图片、视频、音频等业务素材。
- `sourceProp`：记录业务输入在源组件中的来源，避免扁平化后失去可追溯性。
- `requiredForModes`：字段只在列出的 mode 中必填；`availableForModes`：字段只在列出的
  mode 中可用但仍可选。禁止用 `requiredForModes` 表示单纯的适用范围。
- `sourceDefaults`：按 mode 记录从默认 Props、组件信息、CSS/SCSS、内联样式中提取的
  默认值及源码路径，供 mode HTML 忠实还原源组件。它不属于运营输入，组件 SKILL.md
  不得询问这些值。
- `previewData`：按 mode 记录仅用于验证 mode HTML 的业务假数据。禁止把预览昵称、
  UID、素材 URL 当作正式页面默认数据。
- 以下字段默认属于视觉层，禁止放入 `dataFields`：`width`、`height`、`size`、
  `objectFit`、`color`、`fontSize`、`lineHeight`、`margin`、`padding`、
  `borderRadius`、`shadow`、`styles`。若某个同名字段确实改变业务语义，必须在
  `description` 中说明并在源码摘要确认，不能仅因原表单可填写就保留。
- `required`：所有模式都必填时才设为 `true`。仅部分模式必填时设为 `false`，并用 `requiredForModes` 声明模式列表。
- `object` / `object[]`：必须同时声明 `items`，逐项描述对象字段类型及必填性，禁止把对象数组伪装成 `string[]`。
- `multiple: true`：该字段支持多个值（如多个 uid）。
- `crossComponentEvents`：无跨组件通信时省略。统一通过幂等的 `window.BiliActEvents` 总线通信；新事件名使用 `EVA_{COMPONENT}_{EVENT}`，为兼容原组件或既有活动可保留源码事件名并在 description 中注明。
- `previewImage`：留空，由构建脚本自动填充。
- `wireframe`：SVG 线框图配置，由 `generate-previews.mjs` 读取后生成预览图。
  - `format`：固定为 `"svg"`。
  - `variant`：线框图类型标识，与 `generate-previews.mjs` 中 `buildWireframeSvg()` 的 variant 分支对应，如 `video`、`image`、`text`、`text-image`、`lottery-mode1` 等。
  - `label`：显示在线框图中的组件中文名。
  - 线框图**色彩规范**（低饱和度原型风格，所有新组件统一遵守）：
    - 背景：`#e0e0e0`
    - 边框/描边：`#bbbbbb`
    - 卡片/区块背景：`#d4d4d4` ～ `#d8d8d8`
    - 按钮背景：`#b0b0b0`
    - 主文字：`#333333`
    - 次要文字/图标：`#888888`
    - 辅助说明文字：`#888888`
- `fragmentUrl`：留空，由构建脚本上传 fragment 文件到 BFS 后自动填充。前端通过此 URL 并行 fetch fragment 内容，内联进 prompt，避免 Agent 运行时读取文件。不要手动编辑此字段。
- `version`：与组件 `package.json` 的 `version` 字段保持一致，便于追溯 fragment 对应的组件版本。

---

## 命名规范

生成所有文件前，先确认命名：

| 类型 | 格式 | 示例 |
|---|---|---|
| `meta.json` name | PascalCase | `H5FollowNew` |
| `meta.json` componentDir | kebab-case | `h5-follow-new` |
| `data-eva` 属性 | kebab-case | `h5-follow-new` |
| Store 全局变量 | `window.Bili{PascalCase}Store` | `window.BiliH5FollowNewStore` |
| CSS 变量前缀 | `--{kebab-case}-` | `--h5-follow-new-primary` |
| dataFields key（`__EVA_DATA_FIELDS__`） | `{kebab-case}_{instanceId}` | `h5-follow-new_0` |
| 跨组件事件名 | 新事件使用 `EVA_{COMPONENT}_{EVENT}`；源码兼容事件保留原名 | `EVA_TASK_COMPLETE` / `FOLLOW_INFO_READY` |

---

## reference.md 规范

在 `skills/<componentDir>/references/` 目录下创建 `reference.md`，**严格按四层结构**，不得增减层级：

````markdown
# {ComponentLabel} 业务规范

> 本文档面向使用 AI 生成 {ComponentLabel} 组件 HTML 的设计师和运营。
> **默认基线忠实**——mode HTML 的默认 DOM、样式和状态视觉必须与源组件一致。
> **最终 UI 受控生成**——可在声明的视觉权限内重新设计颜色、字体、间距、图形和布局。
> **业务契约不可更改**——业务脚本、稳定钩子和第二层规则必须完整保留。

---

## 第一层：模式目录

{逐一列出每个模式}

### 模式N：{模式中文名}

**适合场景：** {一句话描述，说明在什么业务行为或数据场景下选择此模式}

**必须包含的功能元素：**
- {元素1：说明是静态展示还是动态渲染，动态的注明数据来源}

**可选业务输入：** {只列可选业务数据/素材；不得列颜色、尺寸、排版、objectFit 等视觉配置}

**源码默认视觉基线：**
- {默认 DOM 布局、尺寸行为、颜色、字体、间距、圆角、状态视觉及默认资源}
- {注明对应源码文件和默认 Prop；无法确认时标为待确认，禁止臆造}

**AI 视觉权限规范：**

> 此节告知 AI 在视觉填充阶段（上传 KV 图/logo 后）哪些区域可以改、怎么改。
> **若组件有多状态按钮**，须在表格中为每个状态单独列一行，并标注「与 X 态同组生图」，确保 eva-visual-fill 将其识别为同一状态组。

| 区域 | 稳定钩子 | `data-eva-visual` | `data-fill` | 说明 |
|---|---|---|---|---|
| {banner/背景图} | 无业务钩子 | `style-only` | `image` | 可换素材和 CSS，不改 DOM |
| {纯装饰容器} | 无业务钩子 | `free-decoration` | `image` | 可增删装饰子节点，不得覆盖交互区域 |
| {组件内容布局} | 保留全部后代钩子 | `layout` | 按子节点声明 | 可调整非业务包装层和排列，不得删除或改名钩子 |
| {关注按钮默认态} | `data-eva-action="follow" data-eva-state="default"` | `style-only` | `image` | 与已关注态同组生成；行为节点本身必须保留 |
| {用户头像/昵称} | `data-eva-bind="face/uname"` | `style-only` | `none` | 可改 CSS，不得改动态内容或绑定属性 |

---

### 模式选择指引

> 帮助运营和 AI 快速决定选哪个模式。

| 条件 | 推荐模式 |
|---|---|
| {条件描述，如"只有一个 UP 主，需要视觉突出"} | 模式一 |
| {条件描述} | 模式N |

> 模式只按业务流程、状态机、接口行为或业务数据结构区分。仅视觉布局、颜色或尺寸不同
> 不得创建新模式。

---

## 第二层：业务约束（生成 HTML 时必须完整实现）

### 2.1 初始化流程

{页面加载时的执行顺序，必须包含：数据源字段如何被读取、调用哪个接口、接口返回后如何渲染到 DOM}

### 2.N 数据源填充规范

{仅当组件有 dataFields 时写此节，说明：}
- 运营填写的每个字段（uid、数据源 ID 等）在初始化时如何使用
- 哪些 DOM 节点是由数据源字段驱动渲染的（动态），哪些是静态文字（可编辑）
- 动态渲染的节点不加 `data-editable`，静态文字节点加 `data-editable="true"`
- 只向运营索取 `dataFields`；`sourceDefaults` 和 `previewData` 不得出现在输入问题中

示例说明格式：
```
uid（运营填写）
  → 调用接口获取用户信息（头像 face、昵称 uname）
  → face 渲染到 .{component}__avatar（<img> src 属性，动态，不加 data-editable）
  → uname 渲染到 .{component}__name（textContent，动态，不加 data-editable）
  → 关注按钮文案"关注"为静态文字，加 data-editable="true"
```

### 2.N 接口规范

{每个接口独立描述：HTTP 方法、路径、请求参数、响应格式}

**域名路由规则（所有接口通用）：**
```
正式环境：                              api.bilibili.com
hostname 含 uat- 或 URL 含 _apiEnv_=uat：uat-api.bilibili.com
hostname 含 pre- 或 URL 含 _apiEnv_=pre：pre-api.bilibili.com
```

### 2.N 状态机

{文本流程图描述状态流转}

### 2.N 错误码处理

| code | 行为 |
|---|---|
| 0 | 成功 |
| -101 | 未登录：App 内调用 biliBridge，浏览器跳转 passport 登录页 |
| 其他 | toast 提示 response.message，恢复之前状态 |

### 2.N 埋点事件汇总

| 事件名 | 触发时机 | 参数 |
|---|---|---|

### 2.N 边界情况

| 情况 | 要求的行为 |
|---|---|

### 2.N ⚠️ 已知源码 Bug（生成时必须修复，不能复制）

{阅读源码时发现的 bug，含错误写法（❌）和正确写法（✅）。无 bug 则省略此节}

---

## 第三层：验证清单

生成 HTML 后，按以下清单逐项验证，全部通过才算完成。

### 功能验证

- [ ] {核心功能项}

### 状态验证

- [ ] 已登录用户：{预期行为}
- [ ] 未登录用户：点击操作按钮 → App 内唤起登录，浏览器跳转 passport 登录页
- [ ] 接口失败：组件正常显示，不因接口失败阻断渲染

### 边界验证

- [ ] {边界值、异常数据等}

### 响应式验证

- [ ] **320px 宽度**：组件不溢出屏幕，布局正常
- [ ] **750px 宽度**：组件按设计比例显示

### 无障碍验证

- [ ] **键盘操作**：Tab 键可聚焦可交互元素，Enter/Space 可触发点击
- [ ] **减少动效**：系统开启"减少动态效果"时，状态变化无动画但仍可见

---

## 第四层：生成规范

生成 fragment HTML 时必须遵守以下约束。

### 默认视觉基线（强制）

- mode HTML 首次生成时以源组件默认 UI 为准，不在此阶段自由设计。
- 将 React/Vue 等实现转换为原生 HTML/CSS/JS 时，默认 DOM 可以为脱离框架而调整，
  但相同默认 Props、相同业务状态和相同视口下的可见结果必须等价。
- 默认颜色例外：fragment 作为原型预览用途，**背景色、文字色、卡片/按钮色统一采用低饱和度灰色调**（见下方色彩规范），不还原源码真实颜色；其余视觉（字体、尺寸行为、间距、圆角、阴影、层级、背景图片/SVG、hover、active、disabled、loading、success、error 等状态样式）均从源码提取。
- **fragment 原型色彩规范**（所有组件统一，不随源码变化）：
  - 整体背景：`#e0e0e0`
  - 区块/卡片背景：`#d4d4d4` ～ `#d8d8d8`
  - 按钮背景：`#b0b0b0`
  - 边框/描边：`#bbbbbb`
  - 主文字：`#333333`
  - 次要文字/图标：`#888888`
  - CSS 变量命名遵循 `--{component-name}-{property}` 约定，色值使用上述规范值
- 不得为了“更好看”擅自增加渐变、装饰、动效或修改布局。
- 使用 `previewData` 展示业务状态；previewData 只用于验证，不得硬编码为正式数据。
- 根节点用 `data-ui-baseline="source-default"` 标记该文件是源码默认视觉基线。
- 生成后必须在源组件默认预览尺寸下进行人工对照；具备截图环境时进行截图比对。
- 最终页面生成阶段只允许按 `data-eva-visual` 权限修改视觉；没有设计稿、KV 或风格
  描述时保留此默认基线。禁止任意重写整个组件 DOM。

### Fragment 格式（强制）

- 文件内只能包含 `<style>`、组件根节点 DOM、`<script>` 三部分
- **禁止出现 `<html>`、`<head>`、`<body>` 标签**
- 组件根节点格式：`<div data-eva="{component-name}" data-mode="modeN" data-instance="{{INSTANCE_ID}}" data-ui-baseline="source-default" data-eva-visual="style-only">`。根节点不得默认授予 `layout`；只有源码分析确认安全的子区域才单独声明 `layout`。
- `{{INSTANCE_ID}}` 是拼接时由宿主注入的占位符，fragment 中保持原样

### HTML

- 语义化元素：导航用 `<a>`，操作用 `<button>`，列表用 `<ul>/<li>`，异步反馈用 `aria-live`
- 文本内容用 `textContent` 赋值，禁止 `innerHTML` 插值
- 图片加 `alt`，外链加 `rel="noopener noreferrer"`
- **静态文字**（非接口返回、运营可修改的文案）：直接写在 HTML 里，加 `data-editable="true"`
- **动态文字**（由接口返回数据渲染，如用户昵称）：由 JS 渲染到 DOM，**不加** `data-editable`
- **业务钩子与视觉 class 分离**：业务 JavaScript 只能通过以下稳定属性查找节点，禁止
  通过 `.btn`、`.name` 等视觉 class 绑定行为：
  - `data-eva-action="..."`：点击、提交、换一换等操作；
  - `data-eva-bind="..."`：动态文本、图片、数值等数据绑定；
  - `data-eva-slot="..."`：列表、反馈区、弹层等运行时挂载点；
  - `data-eva-state="..."`：default、loading、success、disabled 等状态节点。
- 视觉阶段不得删除、改名或重复稳定钩子；允许增加的包装层不得改变事件目标、表单语义、
  tab 顺序或无障碍关系。

### CSS

- **所有选择器以 `[data-eva="{component-name}"][data-mode="mode{N}"]` 开头**，禁止裸全局选择器
- 禁止在 fragment 中写 `:root` 变量（由通用模板统一提供）
- mode HTML 可用 CSS 自定义属性表达源码默认视觉，命名：`--{component-name}-{property}`；
  这些变量是最终 UI 的可修改点，不是运营结构化输入
- **尺寸单位使用 rem**，基准为通用模板注入的 `1rem = clientWidth/375*50px`（H5）或 `1rem = 50px`（PC），换算方式：设计稿 px ÷ 50 = rem 值（例：设计稿 100px → `2rem`）
- 必须包含 `@media (prefers-reduced-motion: reduce)`；若动效来自视频、Canvas 或 JS，
  还必须在运行时真正停止或跳过动效，不能只关闭 CSS animation/transition
- 存在可交互元素时必须提供可见的 `:focus-visible`；纯展示组件不生成无效规则
- **`data-eva-visual` 视觉权限**（未标注默认 `locked`）：
  - `locked`：节点、内容、属性和样式均不可修改；
  - `style-only`：只修改 CSS、追加视觉 class 和纯视觉素材；不得删除原 class，也不得改变 DOM 结构、业务属性或动态内容；
  - `layout`：可调整非业务包装层、排列和布局，但必须原样保留全部后代稳定钩子及语义；
  - `free-decoration`：可增删纯装饰子节点，不得承载业务数据、操作或遮挡交互区域。
- **`data-fill` 表达视觉素材策略，不表达 DOM 修改权限**：
  - `data-fill="image"`：AI 可在此区域生成图片（banner、背景图等）
  - `data-fill="color"`：AI 只能替换颜色，不能换图
  - `data-fill="none"`：不替换内容或素材，但若权限为 `style-only` 仍可调整 CSS
  - 未声明 `data-eva-visual` 的节点一律视为 `locked`，不得从 `data-fill` 反推权限
- **视觉资源不得写入业务 dataFields**：颜色写入 CSS 变量；图片写入静态 DOM 的 `src`、
  `background-image` 或 `data-fill-target="css-var:--变量名"`。schema v2 禁止使用
  `data-fill-target="data-field:<key>"`。运营提供的 `business-asset` 必须保持 `data-fill="none"`，
  视觉阶段不得覆盖真实业务素材。

### JavaScript

- 使用 IIFE，**不依赖 Eva、Vue、React 或任何打包器全局变量**
- **工具按组件隔离并按能力幂等补齐**：使用 `window.Bili{ComponentName}Utils`，先初始化空对象，
  再对每个实际使用的方法分别执行 `if (!utils.method) utils.method = ...`。禁止用
  `if (!window.BiliUtils) { window.BiliUtils = { ... } }` 整体初始化；不同 mode 的能力集合
  不同时，该写法会受加载顺序影响。
- **按能力生成**：只有源码确实需要工具时才生成组件工具命名空间，并且只保留
  fragment 实际调用的方法。无接口、登录、用户主页、延时等能力时，禁止复制对应工具。
- **实例隔离**：组件状态挂在 `window.Bili{ComponentName}Store[instanceId]` 下
- **模式隔离**：根节点必须写 `data-mode="modeN"`；每个 fragment 脚本只能选择自己的模式，禁止只按 `data-eva` 扫描所有模式。
- **多实例幂等**：`init()` 首行必须检查 `root.dataset.evaInitialized`，已初始化则直接 return。每个脚本虽然会初始化同模式的全部实例，但不得重复绑定事件。
  ```javascript
  function init(root) {
    if (root.dataset.evaInitialized) return;
    root.dataset.evaInitialized = root.dataset.mode;
    // ...
  }
  ```
- **禁止 `innerHTML` 插值**：动态内容必须用 `createElement` + `textContent`/属性赋值构建，包括模板函数内的列表渲染。`innerHTML` 拼接用户数据（昵称、头像 URL 等）会引入 XSS 风险。
- **事件总线统一**：存在 `crossComponentEvents` 时，幂等初始化 `window.BiliActEvents`，只通过 `on` / `off` / `emit` 通信；禁止同一组件混用 `document.addEventListener` 和事件总线。
- **请求锁**：每个操作维护独立 `isFetching`，操作期间按钮加 `disabled` + `aria-disabled` + `aria-busy`
- `isFetching` **必须在 `finally` 中释放**
- 使用 `AbortController` 管理请求生命周期
- 洗牌用 Fisher–Yates，**禁止 `array.sort(() => Math.random() - 0.5)`**
- 只在 `code === 0` 时更新状态，失败时恢复原状态
- **状态机忠实**：从源码逐一提取加载、成功、空数据、失败、降级和属性变化状态。
  不得只实现主路径；转换 DOM 实现时必须保留等价的进入条件、退出条件和可见结果。
- **字段映射可追溯**：业务 Props 被扁平化或重命名时，reference 必须给出
  `dataField → 源 prop` 映射。`formControl.ts` 属于编辑器行为，除非 fragment 或宿主
  明确重新实现，否则不得描述成 fragment 运行时能力。

### 适配器规范

仅当源码存在运行时接口请求时生成 Adapter。无接口组件不得生成空 Adapter、
`API_MODE`、`MOCK_DATA`、API host、CSRF 或登录工具。

有接口的 Fragment 使用**单一 Adapter**，内部通过可替换的 `fetcher` 切换真实请求和 mock。业务逻辑只写一份，切换只改顶部一个常量。

```javascript
// 宿主页统一注入 preview / production；fragment 单独打开时安全回退到 preview
const API_MODE = window.__EVA_API_MODE__ || 'preview';

// mock 数据表：key 为接口路径（不含域名），value 为 mock 响应
// 生成 fragment 时按实际接口填写
const MOCK_DATA = {
  // '/x/some/api': { code: 0, data: { /* ... */ } },
};

async function realFetch(url, options) {
  const res = await fetch(url, { credentials: 'include', ...options });
  return res.json();
}

async function mockFetch(url, options) {
  await componentUtils.delay(400, options?.signal);
  const path = new URL(url).pathname;
  // 故障模拟必须显式、可复现；禁止随机失败导致预览和测试抖动
  const forcedFailure = window.__EVA_MOCK_FAILURES__?.[path];
  if (forcedFailure) return forcedFailure;
  return MOCK_DATA[path] ?? { code: 0, data: {} };
}

const fetcher = API_MODE === 'production' ? realFetch : mockFetch;

// Adapter：业务方法统一调用 fetcher，真实 / mock 透明切换
const adapter = {
  async getSomeData({ uid, signal } = {}) {
    const url = `https://${componentUtils.getApiHost()}/x/some/api?uid=${uid}`;
    const json = await fetcher(url, { signal });
    if (json.code !== 0) return null;
    return json.data;
  },
  async doAction({ uid, signal } = {}) {
    const url = `https://${componentUtils.getApiHost()}/x/some/modify`;
    const body = new URLSearchParams({ uid, csrf: componentUtils.getCsrf() });
    return fetcher(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal,
    });
  },
};
```

组件工具按能力幂等补齐：

```javascript
window.Bili{ComponentName}Utils = window.Bili{ComponentName}Utils || {};
const componentUtils = window.Bili{ComponentName}Utils;
if (!componentUtils.getApiHost) {
  componentUtils.getApiHost = function () {
    const url = location.href, h = location.hostname;
    if (h.includes('uat-') || url.includes('_apiEnv_=uat')) return 'uat-api.bilibili.com';
    if (h.includes('pre-') || url.includes('_apiEnv_=pre')) return 'pre-api.bilibili.com';
    return 'api.bilibili.com';
  };
}
```
````

---

## fragment 规范与模板

在 `skills/<componentDir>/references/fragments/` 目录下为每个模式创建一个文件。

**文件结构模板：**

```html
<!-- ═══════════════════════════════════════════════════
     {ComponentLabel} · 模式{N}：{模式中文名}
     fragment — 不含 <html>/<head>/<body>，可直接拼入宿主页
     ═══════════════════════════════════════════════════ -->

<!-- ── 1. 组件样式 ── -->
<style>
[data-eva="{component-name}"][data-mode="mode{N}"] {
  --{component-name}-primary: #fb7299;
  /* 组件级 CSS 自定义属性 */
}

[data-eva="{component-name}"][data-mode="mode{N}"] .{component-name}__element {
  /* 组件内部样式，所有选择器带作用域前缀 */
}

@media (prefers-reduced-motion: reduce) {
  [data-eva="{component-name}"][data-mode="mode{N}"] * {
    transition: none !important;
    animation: none !important;
  }
}
</style>

<!-- ── 2. 组件 DOM ── -->
<!--
  data-eva-visual 控制修改权限：
    locked          → 完全锁定（默认）
    style-only      → 只改 CSS、追加视觉 class 和纯视觉素材，不改 DOM 和业务属性
    layout          → 可改非业务包装和排列，必须保留全部稳定钩子
    free-decoration → 可增删纯装饰子节点

  data-fill 只控制视觉素材策略：
    image → AI 判断策略：复用素材 / AI 生图 / CSS 实现
    color → AI 只改颜色（CSS 变量）
    none  → 不替换内容或素材

  data-fill-gen 可选标注（仅用于 data-fill="image" 节点）：
    data-fill-gen="true"  → 强制 AI 生图（适合插画、定制装饰图等）
    data-fill-gen="false" → 强制 CSS 实现，不生图（适合简单几何装饰）
    不标注                → AI 根据节点语义自动判断

  AI 视觉资源由 JS 创建时：
    data-fill-target="css-var:--component-image" → 修改 CSS 变量，不写业务 dataFields
    data-fill-color-var="--component-placeholder-bg" → 修改指定 CSS 变量

  data-editable="true" → 静态文字节点，运营可在 UBW 界面直接修改
    ✅ 静态文字（活动标题、按钮文案）：写在 HTML 里 + data-editable="true"
    ❌ 动态文字（接口返回的昵称、头像）：由 JS 渲染，不加 data-editable
-->
<div data-eva="{component-name}" data-mode="mode{N}" data-instance="{{INSTANCE_ID}}" data-ui-baseline="source-default" data-eva-visual="style-only" role="region" aria-label="{组件中文名}">
  <!-- 组件 DOM 结构 -->
</div>

<!-- ── 3. 组件逻辑 ── -->
<script>
(function () {
  'use strict';

  // ── 组件工具（仅生成实际调用的方法，并按能力补齐）──
  window.Bili{ComponentName}Utils = window.Bili{ComponentName}Utils || {};
  const componentUtils = window.Bili{ComponentName}Utils;
  if (!componentUtils.getApiHost) {
    componentUtils.getApiHost = function () {
      const url = location.href, h = location.hostname;
      if (h.includes('uat-') || url.includes('_apiEnv_=uat')) return 'uat-api.bilibili.com';
      if (h.includes('pre-') || url.includes('_apiEnv_=pre')) return 'pre-api.bilibili.com';
      return 'api.bilibili.com';
    };
  }
  // 其余实际使用的方法也逐个 if (!componentUtils.method) 补齐

  // ── 适配器（仅在源码存在运行时接口时生成本区块）──
  // API 环境由宿主页统一注入；fragment 单独打开时使用 preview
  const API_MODE = window.__EVA_API_MODE__ || 'preview';

  // mock 数据表：key 为接口路径（不含域名），value 为 mock 响应
  const MOCK_DATA = {
    // '/x/some/api': { code: 0, data: {} },
  };

  async function realFetch(url, options) {
    const res = await fetch(url, { credentials: 'include', ...options });
    return res.json();
  }

  async function mockFetch(url, options) {
    await componentUtils.delay(400, options?.signal);
    const path = new URL(url).pathname;
    const forcedFailure = window.__EVA_MOCK_FAILURES__?.[path];
    if (forcedFailure) return forcedFailure;
    return MOCK_DATA[path] ?? { code: 0, data: {} };
  }

  const fetcher = API_MODE === 'production' ? realFetch : mockFetch;

  // 业务方法统一调用 fetcher，真实 / mock 透明切换
  const adapter = {
    // async getSomeData({ uid, signal } = {}) {
    //   const url = `https://${componentUtils.getApiHost()}/x/some/api?uid=${uid}`;
    //   const json = await fetcher(url, { signal });
    //   if (json.code !== 0) return null;
    //   return json.data;
    // },
  };

  // ── 组件状态（按实例隔离）──
  window.Bili{ComponentNamePascalCase}Store = window.Bili{ComponentNamePascalCase}Store || {};

  // dataFields 注入：UBW 平台在拼接时将运营填写的字段注入 window.__EVA_DATA_FIELDS__
  // key 格式："{component-name}_{instanceId}"，component-name 对应 root.dataset.eva
  // 读取方式：
  //   const componentName = root.dataset.eva; // 如 "h5-follow-new"
  //   const fields = (window.__EVA_DATA_FIELDS__ && window.__EVA_DATA_FIELDS__[`${componentName}_${instanceId}`]) || {};
  //   const uid = fields.uid || '';  // 对应 meta.json 中 dataFields 的 key

  function init(root) {
    // 幂等保护：同一模式的多个 fragment 脚本不得重复初始化实例
    if (root.dataset.evaInitialized) return;
    root.dataset.evaInitialized = root.dataset.mode;

    const instanceId = root.dataset.instance || '0';
    // 用 || 保护，避免覆盖已初始化的实例状态
    window.Bili{ComponentNamePascalCase}Store[instanceId] = window.Bili{ComponentNamePascalCase}Store[instanceId] || {
      isFetching: false,
      // 其他初始状态
    };
    render(root, instanceId);
    bindEvents(root, instanceId);
  }

  function render(root, instanceId) {
    // 渲染逻辑
  }

  function bindEvents(root, instanceId) {
    // 事件绑定，所有操作通过 instanceId 隔离状态
    // 请求锁示例：
    // const state = window.Bili{ComponentNamePascalCase}Store[instanceId];
    // if (state.isFetching) return;
    // state.isFetching = true;
    // btn.disabled = true; btn.setAttribute('aria-disabled', 'true'); btn.setAttribute('aria-busy', 'true');
    // try {
    //   const result = await adapter.someMethod({ signal });
    //   if (result.code === 0) { /* 更新状态 */ }
    //   else { /* 按错误码处理 */ }
    // } finally {
    //   state.isFetching = false;
    //   btn.disabled = false; btn.removeAttribute('aria-disabled'); btn.removeAttribute('aria-busy');
    // }
  }

  // 只初始化本 fragment 对应模式，禁止抢先标记其他模式
  document.querySelectorAll('[data-eva="{component-name}"][data-mode="mode{N}"]').forEach(init);

  // ── 跨组件通信（仅在 meta.json 声明了 crossComponentEvents 时实现）──
  // window.BiliActEvents 必须幂等初始化，并提供 on/off/emit。
  // 发出：window.BiliActEvents.emit('EVA_COMPONENT_EVENT', payload);
  // 监听：window.BiliActEvents.on('EVA_OTHER_EVENT', handler);

})();
</script>
```

---

## 组件 SKILL.md 与 OpenAI metadata

每个组件是一个独立的 skill，供运营/设计师直接调用（如 `$h5-follow-new`）来生成 fragment HTML。

### 6.1 生成 `skills/<componentDir>/SKILL.md`

```markdown
---
name: {componentDir}
description: {一句话描述，说明该组件的功能和触发场景。当用户说"用 {componentDir} 生成..."、"帮我生成{label}组件"时触发。}
argument-hint: "<模式: mode1|mode2|...> <运营数据，例如：uid=123456>"
allowed-tools: Read
---

# 角色

你是 Eva 活动平台 {ComponentLabel} 组件的 fragment 生成专家。根据运营选择的业务
行为模式和必要业务数据/素材，生成业务逻辑完整的 fragment HTML。mode 模板提供源码
默认视觉基线；最终视觉只能在模板声明的权限内受控生成。

---

# 任务

根据用户提供的参数：**"$ARGUMENTS"**，生成 {ComponentLabel} 组件的完整 fragment HTML。

---

## 第一步：确认输入

从用户输入中获取以下信息，缺失的向用户询问：

1. **模式**：{列出每个模式及适用场景，来自 reference.md 第一层}
2. **业务数据/素材**（根据模式）：{只列 meta.json 的 dataFields，标注
   business-data / business-asset 及必填情况}
3. **设计方向**（可选）：设计稿、KV、参考图或自然语言描述

禁止向用户询问 `sourceDefaults`、`previewData`，也禁止要求用户填写颜色、宽高、
间距、字体、圆角、阴影、`objectFit`、`styles` 等结构化视觉参数。用户没有提供
设计方向时直接采用 mode 模板的源码默认视觉。

---

## 第二步：读取业务规范和 fragment 模板

读取以下文件（必须，不得跳过）：

1. `references/reference.md` — 业务约束、接口规范、错误码、已知 bug
2. `references/meta.json` — dataFields、sourceDefaults、previewData
3. 对应模式的 fragment 模板：`references/fragments/mode{N}.html`

---

## 第三步：生成 fragment HTML

以 fragment 模板为基础生成，遵守以下规则：

- 用户未提供设计方向：保留 mode 模板的源码默认 DOM 和视觉，不擅自美化
- 用户提供设计方向：按 `data-eva-visual` 权限修改 CSS、视觉素材、布局或纯装饰节点；
  不得修改 `<script>`，不得删除、改名或重复 `data-eva-action/bind/slot/state` 稳定钩子
- `sourceDefaults` 只用于理解默认视觉，不写入运营输入
- `previewData` 只用于预览，正式输出必须替换为用户真实业务数据/素材
- **`data-fill="image"` 区域**：根据 UI 风格生成图片/背景样式
- **`data-fill="color"` 区域**：根据风格调整 CSS 变量颜色值
- **`data-fill="none"` 区域**：不替换内容或素材；是否可改 CSS 仍由 `data-eva-visual` 决定
- 视觉结果只写 CSS、静态视觉 DOM 或视觉 CSS 变量，不写入 `__EVA_DATA_FIELDS__`
- 业务逻辑严格按 reference.md 实现，接口路径、参数、错误码不得臆造
- 已知 Bug 必须修复，不能复制源码错误写法
- 源码有运行时接口时，根据 `window.__EVA_API_MODE__` 选择真实请求或 mock；未注入时默认 `preview`
- 源码有运行时接口时，`MOCK_DATA` 按实际接口路径填写，故障只能通过 `window.__EVA_MOCK_FAILURES__` 显式注入，禁止随机失败
- 源码无接口时，不生成 Adapter、`API_MODE`、`MOCK_DATA` 或无关公共工具

---

## 第四步：自检

- [ ] `{{INSTANCE_ID}}` 已替换为实际序号（通常为 `0`）
- [ ] 没有设计方向时保留源码默认视觉；有设计方向时未越过 `data-eva-visual` 权限
- [ ] 业务脚本及 `data-eva-action/bind/slot/state` 稳定钩子完整且未改名
- [ ] 没有向用户询问 sourceDefaults、previewData 或结构化视觉参数
- [ ] 无 `<html>`、`<head>`、`<body>` 标签
- [ ] CSS 选择器全部以 `[data-eva="{component-name}"][data-mode="mode{N}"]` 开头
- [ ] 源码存在登录态时，已登录/未登录两种状态均有处理
- [ ] 源码存在异步操作时，`isFetching` 在 `finally` 中释放
- [ ] 包含 `@media (prefers-reduced-motion: reduce)`；存在非 CSS 动效时运行时也会停止或跳过
- [ ] 存在可交互元素时包含可见的 `:focus-visible`
- [ ] 源码存在运行时接口时，`MOCK_DATA` 已按实际接口路径填写 mock 响应，mock 行为确定且可复现
```

### 6.2 生成 `skills/<componentDir>/agents/openai.yaml`

```yaml
interface:
  display_name: "Eva {ComponentLabel}"
  short_description: "{英文一句话描述，来自 meta.json description 字段}"
  default_prompt: "Use ${componentDir} to generate a {ComponentLabel} fragment for the Eva activity page."
```

---

## 最终校验

提交前逐项确认，**全部通过才算完成**：

先运行确定性校验：

```bash
node <component-skill-spec目录>/scripts/validate-eva-component.mjs <生成的组件skill目录>
```

校验失败时必须修复后重跑，不得只凭人工清单判断完成。

**meta.json**
- [ ] `schemaVersion` 为 `2`
- [ ] 所有字段填写完整，`previewImage` 留空
- [ ] 有 SVG 线框图的模式已配置 `wireframe`，`variant` 与 `buildWireframeSvg()` 分支一致，色彩遵循低饱和度原型风格规范
- [ ] `description` 字段已填写（一句话组件功能描述）
- [ ] `version` 与组件 `package.json` 版本一致
- [ ] `dataFields` 只包含运营需要填写的业务数据/素材，每项包含 `kind` 和 `sourceProp`
- [ ] `dataFields` 不包含 width、height、objectFit、color、styles 等视觉或布局字段
- [ ] `sourceDefaults` 来自默认 Props、CSS/SCSS、组件信息和默认资源，不臆造
- [ ] `previewData` 仅包含预览假数据，不作为正式业务默认值
- [ ] 有跨组件通信的，`crossComponentEvents` 已声明；无跨组件通信的，该字段已省略

**reference.md**
- [ ] 四层结构完整，无缺层
- [ ] 每个模式包含「AI 视觉权限规范」表格，`data-eva-visual` 和 `data-fill` 覆盖所有视觉区域
- [ ] 每个模式记录源码默认视觉基线及对应源码文件
- [ ] 第一层末尾包含「模式选择指引」表格
- [ ] 有 `dataFields` 的组件，第二层包含「数据源填充规范」节，说明动态/静态节点的区分
- [ ] 接口地址、参数、错误码均来自源码，无臆造内容
- [ ] 加载、成功、空数据、失败、降级和属性变化状态均与源码逐项对照
- [ ] Props 有扁平化或重命名时，已记录 `dataField → 源 prop` 映射
- [ ] `formControl.ts` 编辑器能力与 fragment 运行时能力已明确区分
- [ ] 第三层验证清单已根据第二层业务约束逐项展开，无空占位符
- [ ] 源码中的 bug 已在「⚠️ 已知源码 Bug」节列出（无 bug 则省略该节）

**fragments/modeX.html**
- [ ] 每个模式都有对应的 fragment 文件
- [ ] 根节点包含 `data-ui-baseline="source-default"`
- [ ] 默认 Props、默认状态和默认视口下，DOM 可见结果与源组件默认 UI 等价
- [ ] 颜色遵循原型色彩规范（背景 `#e0e0e0`、卡片 `#d4d4d4`～`#d8d8d8`、按钮 `#b0b0b0`、边框 `#bbbbbb`、主文字 `#333333`、次要文字/图标 `#888888`）；字体、尺寸、间距、圆角、层级及各状态视觉均来自源码
- [ ] 未擅自增加渐变、装饰、动效或“美化”布局
- [ ] 根节点包含正确的 `data-mode="modeN"`，脚本选择器同时限定 `data-eva` 和 `data-mode`
- [ ] 无 `<html>`、`<head>`、`<body>` 标签
- [ ] 所有 CSS 选择器同时带组件和模式作用域前缀
- [ ] 尺寸单位使用 rem，换算基准为设计稿 px ÷ 50
- [ ] `data-fill` 标注覆盖所有视觉区域
- [ ] 所有可修改区域声明 `data-eva-visual`，未标注节点按 `locked` 处理
- [ ] 业务 JavaScript 通过 `data-eva-action/bind/slot/state` 查找节点，不依赖视觉 class
- [ ] schema v2 未使用 `data-fill-target="data-field:<key>"`，视觉结果不写入业务 dataFields
- [ ] `data-editable="true"` 标注了所有静态可修改文字节点，动态渲染文字无此属性
- [ ] 仅生成 fragment 实际使用的组件工具；使用独立命名空间并按方法幂等补齐
- [ ] `init()` 使用 `root.dataset.evaInitialized` 幂等保护，且不会标记其他模式
- [ ] 存在异步操作时，`isFetching` 在 `finally` 中释放
- [ ] 源码存在运行时接口时，包含统一 Adapter、`MOCK_DATA` 表并读取 `window.__EVA_API_MODE__`
- [ ] 源码存在运行时接口时，`MOCK_DATA` 已按实际接口路径填写 mock 响应
- [ ] 源码无运行时接口时，不包含 Adapter、`API_MODE`、`MOCK_DATA` 或接口专用工具
- [ ] dataFields 通过 `window.__EVA_DATA_FIELDS__[componentName + '_' + instanceId]` 读取
- [ ] 有跨组件通信的，`crossComponentEvents` 已在 meta.json 中声明

**skills/<componentDir>/SKILL.md**
- [ ] 已创建，name 与 componentDir 一致
- [ ] description 包含触发关键词
- [ ] 第一步只询问 meta.json 的业务 dataFields，不询问 sourceDefaults、previewData 或视觉 Props
- [ ] 明确无设计方向时保留默认基线，有设计方向时仅在声明权限内生成视觉
- [ ] 第四步自检清单已按组件实际业务填写

**skills/<componentDir>/agents/openai.yaml**
- [ ] 已创建
