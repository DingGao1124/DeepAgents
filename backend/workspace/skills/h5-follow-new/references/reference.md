# H5关注 业务规范

> 本文档面向使用 AI 生成 H5关注 组件 HTML 的设计师和运营。
> mode HTML 保持源码默认 UI；最终视觉只在声明权限内生成；第二层业务契约不可修改。

---

## 第一层：模式目录

### 模式一：单UP主关注

**适合场景：** 页面中只需要关注一个指定UP主，展示头像、昵称和关注按钮。

**必须包含的功能元素：**
- 头像（圆形，可点击跳转UP主空间）
- 昵称（可点击跳转UP主空间）
- 关注按钮（未关注状态）
- 已关注按钮（已关注状态，切换显示）

**可选业务行为：** `unfollow` 控制已关注后是否允许取关。

---

### 模式二：多UP主关注列表

**适合场景：** 页面需要展示多个UP主供用户批量关注，支持网格布局和换一换随机刷新。

**必须包含的功能元素：**
- 多个UP主卡片（头像 + 昵称 + 关注按钮），以 grid 网格排列
- 每张卡片独立维护关注状态
- （可选）换一换按钮：点击后从完整列表中随机抽取新一批UP主显示

**可选：**
- 换一换功能（告知 AI：`exChange: true`，同时配置 `showUpCount` 每页显示数量）
- 过滤已关注UP主（告知 AI：`filterFollowedUp: true`，需配合页面级 `window.filterFollowedUp` 注入）

**模式选择指引：**

| 需求 | 推荐模式 |
|---|---|
| 只关注一个UP主 | 模式一 |
| 关注多个UP主，固定展示全部 | 模式二（不开换一换）|
| 关注多个UP主，随机抽取展示 | 模式二（开换一换）|

---

## 第二层：业务约束（生成 HTML 时必须完整实现）

### 2.1 初始化流程

1. 初始化 `window.BiliFollowNewStore`（幂等，多实例共存只建一次）
2. 调用 `getUserInfo` 获取当前用户 mid（用于过滤本人出现在列表中）
3. 通过统一的 `window.BiliActEvents.on` 监听 `FOLLOW_INFO_READY`，接收已关注列表
4. 调用 `tryFetchFollowInfo`：
   - 若 Store 中已有进行中的 Promise，复用同一次请求结果，不重复发请求
   - 若事件已提前触发（后挂载的组件可能收不到），用返回值兜底更新已关注列表
5. 根据 `followListMode`（模式二）执行 `onExChange` 初始化展示列表

### 2.2 接口规范

> **编辑器专用接口（fragment 中不实现）**
>
> `//manager.bilibili.co/x/admin/activity/user/cards/info?mids={mid}` 是 UBW 编辑器在运营填写 UID 后自动拉取昵称和头像的内部接口，**仅在编辑阶段使用**。运营配置完成后，`uname` 和 `face` 已通过 `window.__EVA_DATA_FIELDS__` 注入页面，fragment 运行时直接读取，**无需再调用此接口**。

**UBW 编辑器自动填充逻辑（编辑器侧实现，fragment 不需要）：**

运营在 UBW 填写 `uid` 字段后，编辑器调用以下接口自动填充昵称和头像：

- **接口：** `GET //manager.bilibili.co/x/admin/activity/user/cards/info?mids={mid}`
- **响应结构：** `{ data: { cards: { [mid]: { name: string, face: string } } } }`
- **行为：**
  - 单UP主模式（mode1）：将 `name` 写入 `uname` 字段，`face` 写入 `face` 字段
  - 多UP主模式（mode2）：将 `name` 写入 `followUidList[i].uname`，`face` 写入 `followUidList[i].face`
- **触发时机：** `uid` 字段值变更时（`uid:value:change` / `followUidList.$x.uid:value:change`）

**域名路由规则（以下运行时接口通用）：**
```
正式环境：                                api.bilibili.com
hostname 含 uat- 或 URL 含 _apiEnv_=uat：uat-api.bilibili.com
hostname 含 pre- 或 URL 含 _apiEnv_=pre：pre-api.bilibili.com
```

#### 接口一：获取当前用户信息

- **用途：** 获取当前登录用户的 mid，用于在列表中过滤本人
- **HTTP 方法：** GET
- **路径：** `/x/web-interface/nav`（来自 `@plat-components/utils2` 的 `getUserInfo`，实际调用此接口）
- **请求参数：** 无（依赖 Cookie 鉴权）
- **响应格式：**
```json
{ "code": 0, "data": { "mid": 12345678, "isLogin": true } }
```
- **多实例共用：** 请求结果缓存在 `window.BiliFollowNewStore.userInfoPromise`，同页面多个关注组件共用同一次请求

#### 接口二：获取已关注列表

- **用途：** 判断列表中每个UP主是否已被当前用户关注，决定初始按钮状态
- **HTTP 方法：** GET
- **路径：** `/x/relation/followings/simple`
- **请求参数：** 无（依赖 Cookie 鉴权）
- **响应格式：**
```json
{ "code": 0, "data": { "list": [12345678, 87654321] } }
```
  > ⚠️ `list` 实际为**纯数字数组**（mid 列表），解析时需兼容纯数字与对象两种格式：
  > ```js
  > (json.data?.list || []).map(item => Number(typeof item === 'object' ? item?.mid : item)).filter(n => !isNaN(n))
  > ```
- **多实例共用：** 请求结果缓存在 `window.BiliFollowNewStore.followInfoPromise`，完成后清空（关注/取关后可重新拉取）；通过 `FOLLOW_INFO_READY` 事件广播给同页面所有关注组件

#### 接口三：关注/取关

- **HTTP 方法：** POST
- **路径：** `/x/relation/modify`
- **请求参数（application/x-www-form-urlencoded）：**

| 参数 | 说明 |
|---|---|
| `fid` | 要关注/取关的UP主UID |
| `act` | 1=关注，2=取关 |
| `re_src` | 固定值 222 |
| `csrf` | Cookie 中的 `bili_jct` 值 |
| `spmid` | `window.__BILIACT_PAGEINFO__?.spmid` + `.0.0`，无则空字符串 |
| `edit_content` | `{"entity":"activity","entity_id":"页面ID"}`，页面ID来自 `window.__BILIACT_PAGEINFO__?.page_id` |

- **响应格式：**
```json
{ "code": 0, "message": "0" }
```

### 2.3 状态机

```
初始状态
  └─ 未登录 → 点击按钮 → 唤起登录（App内/浏览器跳转）→ 登录后恢复
  └─ 已登录
       ├─ 未关注 → 点击关注按钮 → isFetching=true → POST /x/relation/modify(act=1)
       │     ├─ code=0 → isFollowed=true，刷新关注列表，触发 SUMMER_FITNESS_FOLLOW_SEND_POINTS
       │     └─ 失败  → toast 提示错误，恢复原状态
       └─ 已关注（unfollow=true）→ 点击已关注按钮 → isFetching=true → POST /x/relation/modify(act=2)
             ├─ code=0 → 刷新关注列表（isFollowed 由列表数据驱动更新）
             └─ 失败  → toast 提示错误
```

### 2.4 错误码处理

| code | 行为 |
|---|---|
| 0 | 成功 |
| -101 | 未登录：App 内调用 `biliBridge.useNative('auth.login', { callbackUrl: location.href })`，浏览器跳转 `https://passport.bilibili.com/login?gourl=<当前URL>` |
| -102 | toast 提示"被封禁用户不能关注哦！" |
| -400 | toast 提示"你时刻都在关注自己哦～" |
| 其他 | toast 提示 `response.message`，恢复之前状态 |

### 2.5 换一换逻辑（模式二）

- 使用 Fisher–Yates shuffle（**禁止** `array.sort(() => Math.random() - 0.5)`）
- 每次换一换从完整 `initFollowList` 中随机取 `showUpCount` 个展示
- 点击换一换时触发埋点 `reissue-popup.click`（`pop_type: normal, button: 2`）
- 换一换按钮仅在列表总数 > `showUpCount` 时显示

### 2.6 埋点事件汇总

| 事件名 | 触发时机 | 参数 |
|---|---|---|
| `reissue-popup.click` | 点击换一换按钮 | `{ pop_type: 'normal', button: 2 }` |
| `reissue-popup.click` | 关注成功 | `{ pop_type: 'normal', button: 1, upid: uid }` |
| `activity_follow_success_{uid}` | 关注成功 | — |
| `activity_unfollow_success_{uid}` | 取关成功 | — |

### 2.7 边界情况

| 情况 | 要求的行为 |
|---|---|
| `uid` 为空或 0 | 不渲染该UP主卡片（`v-if="uid > 0"`） |
| `followUidList` 中有重复UID | 去重后展示 |
| `followUidList` 中 uid/uname/face 任一为空 | 过滤掉该条目，不展示 |
| 已关注列表拉取失败 | 静默失败，所有按钮展示"未关注"状态，不阻断渲染 |
| 多个关注组件同时存在 | 共用一次已关注列表请求，通过 FOLLOW_INFO_READY 事件同步状态 |
| 操作进行中（isFetching=true） | 按钮禁用，忽略重复点击 |
| `filterFollowedUp: true` 且已关注列表为空 | 展示完整列表，不过滤 |
| `window.filterFollowedUp` 页面级注入 | 优先使用页面级注入的关注状态初始化 |

### 2.8 ⚠️ 已知源码 Bug（生成时必须修复，不能复制）

**Bug：取关成功后直接赋值 computed 属性**

位置：`FollowItem.vue:158`

❌ 错误写法（来自源码）：
```javascript
this.isFollowed = false; // isFollowed 是 computed，直接赋值无效，Vue 会忽略并在下次更新时覆盖
```

✅ 正确写法（fragment 中应使用）：
```javascript
// isFollowed 应由 followedList 数据驱动，不应直接赋值
// 取关成功后调用 tryFetchFollowInfo() 刷新列表，isFollowed 自动更新
// 如需乐观更新，从 followedList 中移除对应 uid：
state.followedList = state.followedList.filter(id => id !== +uid);
```

---

## 第三层：验证清单

### 功能验证

- [ ] 点击关注按钮，成功关注后按钮切换为已关注状态
- [ ] 已关注状态下点击按钮：`unfollow: false` 时无反应；`unfollow: true` 时触发取关
- [ ] 换一换（模式二）：每次点击展示不同的UP主组合
- [ ] 换一换按钮：列表总数 ≤ showUpCount 时隐藏
- [ ] 同页面多个关注组件共用一次已关注列表请求

### 状态验证

- [ ] 已登录用户：关注/取关正常
- [ ] 未登录用户：点击按钮 → App 内唤起登录，浏览器跳转 passport 登录页
- [ ] 接口失败：toast 提示，按钮恢复可用，不阻断组件渲染

### 边界验证

- [ ] uid=0 的条目不渲染
- [ ] followUidList 有重复UID时只展示一个
- [ ] filterFollowedUp 开启时，列表中不出现已关注的UP主和本人

### 响应式验证

- [ ] **320px 宽度**：组件不溢出屏幕，布局正常
- [ ] **750px 宽度**：组件按设计比例显示

### 无障碍验证

- [ ] **键盘操作**：Tab 键可聚焦关注按钮，Enter/Space 可触发点击
- [ ] **减少动效**：系统开启"减少动态效果"时，关注状态切换无动画但仍可见

---

## 第四层：生成规范

### Fragment 格式（强制）

- 文件内只能包含 `<style>`、组件根节点 DOM、`<script>` 三部分
- **禁止出现 `<html>`、`<head>`、`<body>` 标签**
- 组件根节点格式：`<div data-eva="h5-follow-new" data-mode="modeN" data-instance="{{INSTANCE_ID}}">`
- 每个模式的脚本只选择对应的 `[data-eva="h5-follow-new"][data-mode="modeN"]`，不得初始化其他模式
- 工具统一挂在 `window.BiliH5FollowUtils`，每个方法单独幂等补齐；禁止整体判断命名空间
  是否存在。mode1 与 mode2 任意顺序、多实例拼装时，mode2 的 `shuffle` 必须始终可用。

### AI 视觉权限规范

按钮有两个视觉状态，各为独立节点。模式一和模式二均允许同组生图；模式二的卡片由 JS 动态创建，生图结果须通过公共 CSS 规则（`background-image`）覆盖，不能逐节点内联 style。

| 区域 | 稳定钩子 | 权限 | 说明 |
|---|---|---|---|
| 组件容器 | `data-eva-slot="content"` | `layout` | 可改非业务包装布局，保留后代钩子 |
| 头像/昵称 | `data-eva-bind="face/uname"` | `style-only` | 可改 CSS，不改真实内容/链接 |
| 关注按钮（默认态） | `data-eva-action="toggle-follow" data-eva-state="default"` | `style-only` | 与已关注态同组生图；模式二通过公共 CSS 规则覆盖，不逐节点内联 |
| 关注按钮（已关注态） | `data-eva-action="toggle-follow" data-eva-state="followed"` | `style-only` | 与默认态同组，策略统一 |
| 换一换按钮 | `data-eva-action="exchange"` | `style-only` | 保留显隐与点击行为 |
| 列表挂载点 | `data-eva-slot="user-list"` | `locked` | JS 动态渲染，不移动或删除 |

**模式一按钮状态组生图要求：**

`.h5fn-btn-default` 和 `.h5fn-btn-followed` 是同一按钮的两态，用一次生图请求同时产出，确保：
- 两张图圆角、尺寸、风格一致
- 默认态颜色突出（主色），已关注态颜色低调（灰色/辅助色）
- 图片通过 `background-image` 注入，不影响 CSS `opacity` 状态切换逻辑

### 跨组件通信实现

本组件保留源码中的业务事件名，并通过 Eva fragment 统一的 `window.BiliActEvents` 总线通信：

```javascript
// 初始化事件总线（幂等）
if (!window.BiliActEvents) {
  window.BiliActEvents = {
    _listeners: {},
    on(event, fn) {
      (this._listeners[event] = this._listeners[event] || []).push(fn);
    },
    emit(event, data) {
      (this._listeners[event] || []).forEach(fn => fn(data));
    },
    off(event, fn) {
      if (!this._listeners[event]) return;
      this._listeners[event] = this._listeners[event].filter(f => f !== fn);
    },
  };
}

// 监听（在 init 中调用）
window.BiliActEvents.on('FOLLOW_INFO_READY', function(list) {
  state.followedList = Array.isArray(list) ? list.map(Number) : [];
  render(root, instanceId);
});

// 发出（在 tryFetchFollowInfo 成功后）
window.BiliActEvents.emit('FOLLOW_INFO_READY', (data.list || []).map(item => Number(typeof item === 'object' ? item?.mid : item)).filter(n => !isNaN(n)));
```
