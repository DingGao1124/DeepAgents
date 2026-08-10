# 轮播抽奖 业务规范

> 本文档面向使用 AI 生成 轮播抽奖 组件 HTML 的设计师和运营。
> **默认基线忠实**——mode HTML 的默认 DOM、样式和状态视觉必须与源组件一致。
> **最终 UI 受控生成**——可在声明的视觉权限内重新设计颜色、字体、间距、图形和布局。
> **业务契约不可更改**——业务脚本、稳定钩子和第二层规则必须完整保留。

---

## 第一层：模式目录

### 模式一：标准抽奖

**适合场景：** 页面中需要提供抽奖功能，展示奖品轮播、抽1次/抽10次操作按钮、我的中奖记录入口和中奖名单滚动播报。

**必须包含的功能元素：**
- 顶部区：抽奖次数/积分余额展示 + 刷新按钮（点击刷新次数）+ 查看奖池入口（可选）
- 奖品轮播区：横向滚动展示所有奖品（头像图 + 奖品名），数量超过3个时自动循环轮播
- 按钮区：抽1次按钮（必须），抽10次按钮（可选，由 `styleConfig.open_lottery_ten_btn` 控制）
- 我的中奖记录：跳转到活动中奖记录页
- 中奖名单区（可选，由 `styleConfig.open_wlist` 控制）：滚动播报中奖用户

**可选业务输入：** `activityId`（用于中奖记录跳转）；`openTenBtn`（是否展示抽10次按钮，默认 true）；`openWinList`（是否展示中奖名单，默认 true）；`openPrizePool`（是否展示查看奖池入口，默认 true）

**源码默认视觉基线：**
- 组件宽度 750px（设计稿基准），`font-size: 28px`，`padding: 10px 25px`
- 顶部栏高 80px，背景色 `bgColor`（默认 `rgba(35,211,250,1)`，无配置时回退 `#3C3F69`），下边框 `rgba(255,255,255,0.3)` 1px
- 主文字色 `majorTextColor` 默认 `rgba(255,255,255,1)`；辅助文字色 `auxiliaryTextColor` 默认 `rgba(148,153,160,1)`
- 奖品卡片：`1.6rem × 1.6rem` 白底半透明背景 `rgba(255,255,255,0.2)`，图片 80×80
- 按钮区：高 72px，flex: 0 0 310px，无图时显示文字"抽一次"/"抽十次"
- 中奖名单区域高 184px，垂直循环滚动，记录行高 40px
- 来源：`src/EraLottery/normaModeIndex.vue`，`src/EraLottery/assets/index.scss`

**AI 视觉权限规范：**

| 区域 | 稳定钩子 | `data-eva-visual` | `data-fill` | 说明 |
|---|---|---|---|---|
| 组件容器 | `data-eva-slot="content"` | `layout` | — | 可改非业务包装布局，保留后代钩子 |
| 头部区域 | `data-eva-slot="header"` | `style-only` | `color` | 可改背景色/文字色，不改 DOM 结构 |
| 次数文字 | `data-eva-bind="lottery-count"` | `style-only` | `none` | 动态渲染，只改 CSS |
| 奖品列表挂载点 | `data-eva-slot="gift-list"` | `locked` | — | JS 动态渲染，不移动或删除 |
| 抽1次按钮 | `data-eva-action="draw-one"` | `style-only` | `image` | 保留点击行为；可换背景图或颜色 |
| 抽10次按钮 | `data-eva-action="draw-ten"` | `style-only` | `image` | 保留显隐与点击行为 |
| 我的中奖记录 | `data-eva-action="view-records"` | `style-only` | `none` | 保留点击跳转行为 |
| 中奖名单挂载点 | `data-eva-slot="win-list"` | `locked` | — | JS 动态渲染，不移动或删除 |

---

### 模式选择指引

| 条件 | 推荐模式 |
|---|---|
| 活动页需要抽奖功能 | 模式一（标准抽奖）|

> 目前只有一种标准模式。编辑器的"自由模式"（freeMode 拖拽布局）属于编辑器能力，fragment 不实现。

---

## 第二层：业务约束（生成 HTML 时必须完整实现）

### 2.1 初始化流程

1. 读取 `window.__EVA_DATA_FIELDS__['eva-lottery_{instanceId}']` 获取 `lotteryId` 和 `activityId`
2. `lotteryId` 为空时不发起任何请求，展示默认占位 UI
3. 调用 `checkLogin()` 获取登录状态（`/x/web-interface/nav`），结果缓存在 `window.BiliEvaLotteryStore.userInfoPromise`
4. 并行调用：
   - `getGiftsList(lotteryId)` 获取奖品列表 → 渲染奖品轮播区，列表为空时展示占位图（3张 placeholder）
   - `getWinList(lotteryId)` 获取中奖名单 → 渲染中奖名单区，启动滚动动画
   - `getUserTimes(lotteryId)` 获取可用次数/积分 → 更新顶部次数文字
5. 加载完成后：`loadStatus = 'done'`；任意接口失败：`loadStatus = 'error'`，展示错误状态

### 2.2 数据源填充规范

```
lotteryId（运营填写）→ 传入所有业务接口的 sid/lottery_id 参数
activityId（运营填写）→ 拼接「我的中奖记录」跳转 URL：{recordLink}?activity_id={activityId}
openTenBtn（运营填写，默认 true）→ false 时隐藏抽10次按钮（不渲染该节点）
openWinList（运营填写，默认 true）→ false 时隐藏整个中奖名单区域（不渲染该节点）

奖品列表（接口返回）→ 渲染到 [data-eva-slot="gift-list"]（动态，不加 data-editable）
中奖名单（接口返回）→ 渲染到 [data-eva-slot="win-list"]（动态，不加 data-editable）
抽奖次数（接口返回）→ 渲染到 [data-eva-bind="lottery-count"]（动态，不加 data-editable）
```

静态文字（加 `data-editable="true"`）：抽1次按钮文案（无图时）、我的中奖记录、查看奖池、中奖名单标题

### 2.3 接口规范

**域名路由规则（所有接口通用）：**
```
正式环境：                                api.bilibili.com
hostname 含 uat- 或 URL 含 _apiEnv_=uat：uat-api.bilibili.com
hostname 含 pre- 或 URL 含 _apiEnv_=pre：pre-api.bilibili.com
```

#### 接口一：获取当前用户信息

- **用途：** 判断登录状态，未登录时点击按钮唤起登录
- **HTTP 方法：** GET
- **路径：** `/x/web-interface/nav`
- **响应格式：**
```json
{ "code": 0, "data": { "mid": 12345678, "isLogin": true } }
```
- **多实例共用：** 结果缓存在 `window.BiliEvaLotteryStore.userInfoPromise`

#### 接口二：获取奖品列表

- **用途：** 渲染奖品轮播区，展示可抽奖项
- **HTTP 方法：** GET
- **路径：** `/x/lottery/x/gift`
- **请求参数：** `sid`（lotteryId）
- **响应格式：**
```json
{ "code": 0, "data": [{ "id": "gift_1", "name": "奖品名", "img_url": "https://...", "award_info": { "name": "...", "icon": "https://..." } }] }
```

#### 接口三：获取抽奖次数/积分

- **用途：** 展示当前可用次数或积分余额
- **HTTP 方法：** GET
- **路径：** `/x/lottery/x/mytimes`
- **请求参数：** `sid`（lotteryId）
- **响应格式：**
```json
{ "code": 0, "data": { "times": 3, "lottery_type": 2, "intergral": { "name": "积分", "icon": "https://..." }, "points": 100, "points_per_time": 10 } }
```
- `lottery_type: 2` = 次数型；`lottery_type: 1` = 积分型

#### 接口四：获取中奖名单轮播

- **用途：** 中奖名单滚动播报
- **HTTP 方法：** GET
- **路径：** `/x/lottery/x/win/list`
- **请求参数：** `sid`（lotteryId）
- **响应格式：**
```json
{ "code": 0, "data": [{ "name": "用户昵称", "gift_name": "奖品名", "award_info": { "name": "..." } }] }
```

#### 接口五：执行抽奖

- **用途：** 用户点击抽奖按钮触发
- **HTTP 方法：** POST
- **路径：** `/x/lottery/x/do`
- **请求参数（application/x-www-form-urlencoded）：**

| 参数 | 说明 |
|---|---|
| `sid` | lotteryId |
| `num` | 抽奖次数（1 或 10）|
| `page_id` | 从页面路径解析，`pathname.slice(lastIndexOf('/')+1, lastIndexOf('.'))` |
| `gaia_vtoken` | 风控校验 token，正常为空，触发验证码后填入 |

- **响应格式：**
```json
{ "code": 0, "data": [{ "gift_id": "...", "gift_name": "奖品名", "img_url": "https://..." }] }
```

### 2.4 状态机

```
初始状态
  └─ lotteryId 为空 → 不发请求，展示占位 UI
  └─ lotteryId 有值
       ├─ 加载中 → 展示 loadStatus='loading'（次数显示 '-'，奖品展示占位图）
       ├─ 加载成功 → loadStatus='done'，渲染奖品/次数/中奖名单
       └─ 加载失败 → loadStatus='error'，展示错误状态

点击抽奖按钮（已加载成功）
  └─ 未登录 → 唤起登录
  └─ 已登录
       ├─ drawing=true（1秒去抖）
       ├─ POST /x/lottery/x/do
       │   ├─ code=0 → 展示中奖弹窗 DrawResultModal，刷新次数
       │   ├─ code=-504 → toast "当前网络不稳定，请点击我的中奖列表确认或稍后再试"
       │   ├─ code=170998 → 触发风控验证码，拿到 token 后重新抽奖
       │   └─ 其他 code → toast res.message
       └─ drawing=false

刷新次数（头部刷新图标）
  └─ 未登录 → 唤起登录（不刷新）
  └─ 已登录 → 调用 getUserTimes，刷新图标动画持续 ≥1s
```

### 2.5 中奖弹窗

抽奖成功（`code=0`）后，弹出中奖弹窗。Fragment 中用简单 DOM 实现以下两态：

- **有奖品**（`res.length > 0`）：展示获奖奖品列表，包含奖品图和名称
- **未中奖**（`res.length === 0` 或 `res[0]` 为谢谢参与图）：展示谢谢参与图或文字

弹窗关闭后调用 `getUserTimes` 刷新次数。

> 注意：源码通过 `openLayer('DrawResultModal', ...)` 动态加载弹层组件，fragment 中使用原生 DOM 创建弹窗替代实现。

### 2.6 奖品轮播动画

- 奖品数量 > 3 时启动横向循环滚动（`requestAnimationFrame`，速度 `0.05px/ms`）
- 通过复制两份 DOM（`.r1` 和 `.r2`）实现无缝循环：`scrollLeft` 到达 `.r1` 末端时跳回 `.r2` 起始
- 初始 `scrollLeft = r1.clientWidth + space`（space = rem * 0.21）

### 2.7 中奖名单滚动

- 名单数量 ≥ 4 时启动垂直循环滚动（`requestAnimationFrame`，速度 `0.03px/ms`）
- 同样复制两份（`.c1` 和 `.c2`），交替用 `top` 绝对定位实现滚动
- 名单区高度固定 184px，`overflow: hidden`

### 2.8 埋点事件汇总

| 事件名 | 触发时机 | 参数 |
|---|---|---|
| `lottery_show` | 组件挂载时 | — |
| `lottery1_click` | 点击抽1次 | — |
| `lottery10_click` | 点击抽10次 | — |
| `unit_lottery_refresh_click` | 点击刷新次数 | — |
| `unit_lottery_jackpot_click` | 点击查看奖池 | — |

埋点通过 `window.logger && window.logger('click', eventName)` 调用。

### 2.9 错误码处理

| code | 行为 |
|---|---|
| 0 | 成功 |
| -101 | 未登录：App 内调用 `biliBridge.useNative('auth.login', { type: 'default' })`，浏览器跳转 passport 登录页 |
| -504 | toast 提示"当前网络不稳定，请点击我的中奖列表确认或稍后再试" |
| 170998 | 触发风控验证码（fragment 中不实现，直接 toast 提示"请完成安全验证后重试"）|
| 其他 | toast 提示 `res.message`，恢复原状态 |

### 2.10 边界情况

| 情况 | 要求的行为 |
|---|---|
| `lotteryId` 为空 | 不发请求，展示占位 UI（3张占位奖品图）|
| 奖品列表为空 | 展示占位图 3 张 + 占位名称"奖品名称" |
| 奖品数量 ≤ 3 | 不启动轮播动画 |
| 中奖名单为空 | 显示"还没有人中奖，快来试试吧" |
| 中奖名单 < 4 条 | 不启动滚动动画 |
| `drawing=true` 时再次点击 | 忽略，1秒去抖保护 |
| 接口失败（任意一个）| 整体进入 error 状态，展示"加载失败 请重试"，提供重试按钮 |
| `open_wlist` 为 false | 不渲染中奖名单区域（`openWinList: false`）|
| `open_prize_pool` 为 false | 不渲染查看奖池按钮（`openPrizePool: false`）|
| `open_lottery_ten_btn` 为 false | 不渲染抽10次按钮（`openTenBtn: false`）|

### 2.11 ⚠️ 已知源码 Bug（生成时必须修复，不能复制）

**Bug：`openModal` 方法中次数更新不做下限保护**

位置：`normaModeIndex.vue:530`（openModal 方法，已废弃，主路径 draw 方法已修复）

主路径 `draw()` 方法已正确使用 `Math.max(0, this.count - times)` 做下限保护，fragment 中应沿用此写法：

```javascript
// ✅ 正确写法
state.count = isNaN(state.count - times) ? 0 : Math.max(0, state.count - times);
```

---

## 第三层：验证清单

### 功能验证

- [ ] 组件初始化后，奖品列表、次数、中奖名单正确加载
- [ ] 点击抽1次按钮，成功后展示中奖弹窗，弹窗关闭后次数刷新
- [ ] 点击抽10次按钮，同上
- [ ] 点击刷新图标，次数刷新，图标动画持续约1秒
- [ ] 点击查看奖池，展示奖品详情
- [ ] 点击我的中奖记录，跳转到记录页
- [ ] `open_wlist=false` 时不展示中奖名单区域
- [ ] `open_lottery_ten_btn=false` 时不展示抽10次按钮
- [ ] 奖品 > 3 时横向轮播动画正常
- [ ] 中奖名单 ≥ 4 条时垂直滚动动画正常

### 状态验证

- [ ] 已登录用户：抽奖正常，次数减少
- [ ] 未登录用户：点击按钮 → App 内唤起登录，浏览器跳转 passport 登录页
- [ ] 接口失败：展示错误状态，点击重试可重新加载

### 边界验证

- [ ] `lotteryId` 为空时不发请求，展示占位 UI
- [ ] 奖品列表为空时展示 3 张占位图
- [ ] 中奖名单为空时显示"还没有人中奖，快来试试吧"
- [ ] 快速连续点击抽奖按钮不重复触发（去抖保护）

### 响应式验证

- [ ] **320px 宽度**：组件不溢出屏幕，布局正常
- [ ] **750px 宽度**：组件按设计比例显示

### 无障碍验证

- [ ] **键盘操作**：Tab 键可聚焦抽奖按钮、刷新按钮，Enter/Space 可触发点击
- [ ] **减少动效**：系统开启"减少动态效果"时，轮播和滚动动画停止，但内容仍可见

---

## 第四层：生成规范

### Fragment 格式（强制）

- 文件内只能包含 `<style>`、组件根节点 DOM、`<script>` 三部分
- **禁止出现 `<html>`、`<head>`、`<body>` 标签**
- 组件根节点格式：`<div data-eva="eva-lottery" data-mode="mode1" data-instance="{{INSTANCE_ID}}" data-ui-baseline="source-default" data-eva-visual="style-only">`
- 脚本只选择 `[data-eva="eva-lottery"][data-mode="mode1"]`，不得初始化其他模式

### 按能力生成

- 工具命名空间 `window.BiliEvaLotteryUtils`，按方法幂等补齐
- Store 命名空间 `window.BiliEvaLotteryStore`，按实例隔离

### dataField → 源 prop 映射

| dataField key | 源 prop 路径 |
|---|---|
| `lotteryId` | `config.lottery_id`（同时用作接口参数 `sid`）|
| `activityId` | `config.activity_id` |
