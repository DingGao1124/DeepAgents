---
name: eva-page-template-spec
description: 将多个 Eva 组件 fragment 拼合为可直接上线的完整单文件 HTML 活动页。当用户完成组件选择后说"生成完整页面"、"拼合 HTML"、"生成活动页"时触发。
allowed-tools: Read, Glob, Grep, Bash, Write, Edit
---

# 背景与目标

运营/设计师在 UBW 界面完成组件选择和排序后，需要将 N 个组件 fragment 拼合为一个可直接部署的完整 HTML 活动页。产出物：

- 单文件 HTML，包含完整页面基础设施（rem 适配、图片懒加载、埋点、jsbridge）
- 所有组件的 DOM、CSS、JS 合并注入，样式/脚本无冲突
- 区分 **H5** 和 **PC** 两套模板

---

# 任务

根据用户提供的平台类型和组件 fragment 列表，生成完整的活动页 HTML。

---

## 第一步：确认输入

需要以下信息（从用户输入或上下文获取，无法确定时询问）：

1. **平台**：H5 或 PC
2. **组件列表**（有序）：每项包含组件名和业务行为模式。如用户未指定，可先 Glob `skills/` 目录列出可用组件供选择。
3. **API 环境**：`production` 或 `preview`。生成可上线页面默认 `production`；只有用户明确要求预览/mock 时使用 `preview`。
4. **页面信息**：活动页标题，以及可选设计稿、KV、素材或自然语言设计方向。不要向运营询问 theme-color、背景色、宽高等结构化视觉配置。

---

## 第二步：读取 fragment 文件

**优先使用内联 fragment（跳过文件读取）：**

如果用户 prompt 中包含 `## Inline Fragments` 区块，说明前端已并行 fetch 并内联了所有 fragment 内容，**直接使用该区块中的数据，跳过本步骤的所有文件读取（Glob/Read）**。内联格式如下：

```
## Inline Fragments
<!-- component: h5-follow-new, mode: mode1, schemaVersion: 2 -->
<fragment 内容>
<!-- /component -->
```

meta 校验（schemaVersion、dataFields）所需信息已从 `## Inline Meta` 区块中提供，同样直接使用。

**无内联时才执行文件读取：**

首先用 Glob 列出 `skills/` 目录下所有组件 skill，排除流程 skill：`component-skill-spec`、
`eva-page-template-spec`、`eva-visual-fill`。只把存在 `references/meta.json` 且 meta 含
`schemaVersion/componentDir/modes/dataFields` 的目录视为组件 skill。

按组件列表顺序，依次读取每个 `skills/<componentDir>/references/fragments/mode{N}.html`。

**同时读取并确认每个 `meta.json`：**
- `schemaVersion` 必须为 `2`，否则停止拼装并报告对应 skill
- 只按所选 mode 收集 `dataFields` 中的 business-data / business-asset；遵守
  `availableForModes` 的适用范围和 `requiredForModes` 的必填语义
- `sourceDefaults` 只用于理解默认基线，不注入页面配置
- `previewData` 只允许在明确的 preview 页面使用，production 禁止注入
- 每个 fragment 根节点同时包含正确的 `data-eva` 和 `data-mode`
- 每个 fragment 是否有 `crossComponentEvents`，需读取 `skills/<componentDir>/references/meta.json`

---

## 第三步：合并规则

### 3.1 实例 ID 注入

将每个 fragment 根节点的 `data-instance="{{INSTANCE_ID}}"` 替换为实际序号。**instanceId 按组件维度独立计数**，从 `0` 开始，同组件多实例依次递增：

```
关注组件第1个实例 → data-instance="0"
关注组件第2个实例 → data-instance="1"
抽奖组件第1个实例 → data-instance="0"  ← 不同组件重新从 0 开始
```

同时将 fragment JS 中对应的 Store 初始化也会自动关联到正确的 instanceId（fragment 本身已按 instanceId 索引，注入后自动生效）。

### 3.2 dataFields 注入

在页面 `<script>` 中注入 `window.__EVA_DATA_FIELDS__`，结构为：

```javascript
window.__EVA_DATA_FIELDS__ = {
  // key 格式："{component-name}_{instanceId}"
  "h5-follow-new_0": { "uid": "运营填写的uid值" },
  "h5-follow-new_1": { "uid": "第二个实例的uid值" },
  "era-lottery_0": { "sourceId": "运营填写的数据源ID" },
};
```

fragment JS 读取方式（已在 fragment 模板中约定）：
```javascript
const fields = (window.__EVA_DATA_FIELDS__ && window.__EVA_DATA_FIELDS__[`${componentName}_${instanceId}`]) || {};
```

注入前逐项校验 `required` / `requiredForModes`。production 页面缺少必填业务字段或素材时
停止生成，不得用 `previewData`、源码默认素材或空字符串冒充正式数据。禁止向配置块写入
`sourceDefaults`、颜色、宽高、objectFit、styles 等视觉字段。

### 3.3 CSS 合并

- 按 `<style>` 块的完整规范化内容去重：仅当去除首尾空白后的内容完全相同时才保留一份
- 禁止仅按 `data-eva` 去重：同一组件的不同模式可能拥有不同 CSS
- 不同组件或不同模式的非重复 `<style>` 块按首次出现顺序保留
- 组件 CSS 选择器必须同时限定 `data-eva` 和 `data-mode`，避免同组件不同模式的同名 class 相互覆盖

### 3.4 JS 合并

- **组件工具命名空间**：fragment 使用 `window.Bili{ComponentName}Utils`，每个方法按能力幂等补齐；不同 mode 任意顺序拼接都不得缺方法
- **组件 Store**：各组件 Store 命名不同（`window.BiliXxxStore`），直接拼接
- **API 模式**：宿主页只注入一次 `window.__EVA_API_MODE__`，fragment 统一读取该值
- **模式隔离**：每段脚本的初始化选择器必须同时限定 `data-eva` 和 `data-mode`
- **局部变量**：每个 fragment 是独立 IIFE，变量作用域隔离

---

## 第四步：选择基础模板

根据平台选择对应模板结构。

### H5 模板结构

```html
<!DOCTYPE html>
<html lang="zh-Hans" class="env-mobile">
<head>
  <link rel="preconnect" href="//i0.hdslb.com" />
  <link rel="preconnect" href="//s1.hdslb.com" />
  <meta charset="utf-8" />
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta http-equiv="Cache-Control" content="no-transform" />
  <meta name="renderer" content="webkit" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <meta name="applicable-device" content="mobile" />
  <meta name="theme-color" content="{theme-color，默认 #de698c}" />
  <meta name="format-detection" content="telephone=no" />
  <meta name="force-rendering" content="webkit" />
  <meta name="full-screen" content="true" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black" />
  <title>{活动页标题}</title>

  <!-- DNS 预解析 -->
  <link rel="dns-prefetch" href="//s1.hdslb.com" />
  <link rel="dns-prefetch" href="//i0.hdslb.com" />
  <link rel="dns-prefetch" href="//i1.hdslb.com" />
  <link rel="dns-prefetch" href="//api.bilibili.com" />
  <link rel="dns-prefetch" href="//i2.hdslb.com" />
  <link rel="dns-prefetch" href="//activity.hdslb.com" />

  <!-- 设备兼容检测：Android8+ / iOS14+ / Chrome63+ / BiliApp7.0+ -->
  <!-- 注：此脚本在 <head> 中同步执行，body 尚未解析，不存在覆写已初始化组件的风险 -->
  <script>
    (function () {
      var ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '';

      function getMajorVersion(matchIndex) {
        var m = matchIndex;
        if (!m || !m[1]) return null;
        var n = parseInt(m[1], 10);
        return isNaN(n) ? null : n;
      }

      var androidMajor = null;
      var androidMatch = /Android\s+([0-9]+)(?:\.[0-9]+)?/i.exec(ua);
      androidMajor = getMajorVersion(androidMatch);

      var iosMajor = null;
      var iosMatch = /OS\s+([0-9]+)[._][0-9]+/i.exec(ua);
      if (/iPhone|iPad|iPod/i.test(ua) && iosMatch) {
        iosMajor = getMajorVersion(iosMatch);
      }

      var chromeMajor = null;
      var chromeMatch = /(?:Chrome|CriOS)\/([0-9]+)/i.exec(ua);
      chromeMajor = getMajorVersion(chromeMatch);

      var biliVersion = null;
      var biliApp = (ua.match(/BiliApp\/([^ ]*)/) || [])[1];
      if (biliApp) {
        biliVersion = Number.parseInt(biliApp.split('.')[0], 10);
      }

      var isUnsupported = false;
      var textTip1 = '您的设备系统版本过低';
      var textTip2 = '暂不支持访问';

      if (androidMajor !== null && androidMajor < 8) {
        textTip1 = '您的 Android 系统版本过低';
        textTip2 = '请升级系统至 Android 8 及以上查看活动';
        isUnsupported = true;
      } else if (iosMajor !== null && iosMajor < 14) {
        textTip1 = '您的 iOS 系统版本过低';
        textTip2 = '请升级系统至 iOS 14 及以上查看活动';
        isUnsupported = true;
      } else if (chromeMajor !== null && chromeMajor < 63) {
        textTip1 = '您的浏览器版本过低';
        textTip2 = '请升级系统至 Chrome 63 及以上内核查看活动';
        isUnsupported = true;
      } else if (biliVersion !== null && biliVersion < 7) {
        textTip1 = '您的 App 版本过低';
        textTip2 = '请升级哔哩哔哩查看活动';
        isUnsupported = true;
      }

      if (location.search.indexOf('jumpEvaSysCheck=1') !== -1) {
        isUnsupported = false;
      }

      if (!isUnsupported) return;

      function showErrorPage() {
        if (!document.body) return;
        var htmlParts = [
          '<div class="eva-unsupported" style="display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fff;min-height:100vh">',
          '<div class="eva-unsupported__img" style="width:125px;height:125px;background-image:url(//i0.hdslb.com/bfs/activity-plat/static/d41d8cd98f00b204e9800998ecf8427e/3m0aWx6v6d.png);background-size:contain;background-repeat:no-repeat;background-position:center"></div>',
          '<div class="eva-unsupported__text" style="color:#333;font-size:13px;font-weight:bold;margin-top:20px">' + textTip1 + '</div>',
          '<div class="eva-unsupported__text" style="color:#333;font-size:13px;font-weight:bold">' + textTip2 + '</div>',
          '</div>'
        ];
        document.body.innerHTML = htmlParts.join('');
      }

      function initErrorPage() {
        var readyState = document.readyState;
        if (readyState === 'complete' || readyState === 'interactive') {
          setTimeout(showErrorPage, 0);
        } else {
          document.addEventListener('DOMContentLoaded', showErrorPage, { once: true });
        }
      }

      initErrorPage();
    })();
  </script>

  <!-- 平台全局脚本 -->
  <script defer src="//s1.hdslb.com/bfs/activity-seed/activity/plat/h5/plat.global.min.js"></script>
  <script>
    window.__BILI_JSB_CONFIG__ = { useAdapter: "all" };
    window.__PB_CONFIG__ = { disableLoadSc: true };
  </script>
  <script defer src="//s1.hdslb.com/bfs/seed/jinkela/short/jsb/js-bridge.min.js"
    onload="window.biliBridge && window.biliBridge.initEnv();"></script>

  <style>
    html, body { margin: 0; padding: 0; }
    body { position: relative; font-size: 0.12rem; }
    #app { max-width: 7.5rem; margin: auto; position: relative; }
    /* 页面背景色（可选，由运营/AI 填充）*/
    /* body { background: #xxx; } */
    /* 页面背景图容器 */
    .page-bg {
      position: fixed;
      inset: 0;
      z-index: -1;
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      pointer-events: none;
    }
  </style>
</head>
<body>

  <!-- H5 rem 适配：1rem = clientWidth/375*50px，最大宽 600px -->
  <script>
    !function (doc) {
      var resizeEvt = "orientationchange" in window ? "orientationchange" : "resize";
      if (!doc.addEventListener) return;
      setRemValue();
      window.addEventListener(resizeEvt, setRemValue, false);
      window.addEventListener('pageshow', function (e) { if (e.persisted) setRemValue(); });
      window.addEventListener('load', setRemValue);
      setTimeout(setRemValue, 500);
      function setRemValue() {
        var maxWidth = (window.$evaCustom && window.$evaCustom.artboardMaxWidthInH5) || 600;
        var docEl = doc.documentElement;
        var clientWidth = docEl.clientWidth > maxWidth ? maxWidth : docEl.clientWidth;
        var remValue = clientWidth / 375 * 50;
        docEl.style.fontSize = remValue + 'px';
        docEl.style.setProperty('--eva-rem-rate', clientWidth / 375);
        window.$eva = window.$eva || {};
        window.$eva.remValue = remValue;
      }
    }(document);
  </script>

  <!-- dataFields 注入（由拼合脚本生成） -->
  <script>
    window.__EVA_API_MODE__ = '{api-mode: production | preview}';
    window.__EVA_DATA_FIELDS__ = {
      /* {component-name}_{instanceId}: { key: value } */
    };
  </script>

  <!-- 组件区域：按运营选择顺序排列 -->
  <article id="app" class="tpl-wrap">

    <!-- 页面背景图（视觉填充阶段由 AI 注入 background-image，不需要背景图时可删除此节点） -->
    <div class="page-bg" data-fill="image" data-eva-visual="style-only" aria-hidden="true"></div>

    <!-- ══ 在此按顺序插入各组件 fragment 的 DOM 部分 ══ -->

  </article>

  <!-- 图片懒加载 + BmgTemplateRenderer -->
  <script src="//s1.hdslb.com/bfs/seed/jinkela/short/bmg/autofallback.js"></script>
  <script src="//s1.hdslb.com/bfs/seed/jinkela/short/bmg/detect.js"></script>
  <script src="//s1.hdslb.com/bfs/seed/jinkela/short/bmg/template-renderer.js"></script>

  <!-- 合并后的组件 CSS（去重后按顺序）-->
  <!-- 注：<style> 块放 <body> 末尾而非 <head>，是为了避免阻塞首屏渲染。
       浏览器对 body 内 style 的支持已足够稳定，不会产生可见的 FOUC。-->
  <!-- ══ 在此插入各组件 <style> 块 ══ -->

  <!-- 合并后的组件 JS（按顺序，每个 fragment 的 <script> IIFE） -->
  <!-- ══ 在此插入各组件 <script> 块 ══ -->

  <!-- 埋点上报 -->
  <script src="//s1.hdslb.com/bfs/activity-plat/static/20260612/53704fc8d3ac45ac4b9a45153a694277/report_new.js"></script>
  <!-- iframeBridge（预览环境通信） -->
  <script defer src="//s1.hdslb.com/bfs/activity-plat/static/20260529/53704fc8d3ac45ac4b9a45153a694277/iframeBridge.js"></script>

</body>
</html>
```

### PC 模板结构

```html
<!DOCTYPE html>
<html lang="zh-Hans">
<head>
  <link rel="preconnect" href="//i0.hdslb.com" />
  <link rel="preconnect" href="//s1.hdslb.com" />
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta http-equiv="Cache-Control" content="no-transform" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="renderer" content="webkit" />
  <title>{活动页标题}</title>

  <!-- DNS 预解析 -->
  <link rel="dns-prefetch" href="//s1.hdslb.com" />
  <link rel="dns-prefetch" href="//i0.hdslb.com" />
  <link rel="dns-prefetch" href="//i1.hdslb.com" />
  <link rel="dns-prefetch" href="//i2.hdslb.com" />
  <link rel="dns-prefetch" href="//api.bilibili.com" />
  <link rel="dns-prefetch" href="//activity.hdslb.com" />

  <!-- 平台全局脚本 -->
  <script defer src="//s1.hdslb.com/bfs/activity-seed/activity/plat/pc/plat.global.min.js"></script>
  <script>window.__PB_CONFIG__ = { disableLoadSc: true };</script>

  <!-- PC rem 适配：固定 1rem = 50px，--eva-rem-rate 固定为 1 -->
  <script>
    !function (doc, remBase) {
      function recalc() {
        var docEl = doc.documentElement;
        docEl.style.fontSize = remBase + 'px';
        docEl.style.setProperty('--eva-rem-rate', 1);
      }
      recalc();
      window.addEventListener('load', recalc);
      setTimeout(recalc, 500);
    }(document, 50);
  </script>

  <style>
    html, body { margin: 0; padding: 0; }
    body {
      position: relative;
      min-width: 1280px;
      overscroll-behavior: none;
      overflow-x: hidden;
    }
    /* 页面背景色（可选）*/
    /* body { background: #xxx; } */
    /* 页面背景图容器 */
    .page-bg {
      position: fixed;
      inset: 0;
      z-index: -1;
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      pointer-events: none;
    }
  </style>
</head>
<body>

  <!-- dataFields 注入（由拼合脚本生成） -->
  <script>
    window.__EVA_API_MODE__ = '{api-mode: production | preview}';
    window.__EVA_DATA_FIELDS__ = {
      /* {component-name}_{instanceId}: { key: value } */
    };
  </script>

  <!-- 组件区域 -->
  <article id="app" class="tpl-wrap">

    <!-- 页面背景图（视觉填充阶段由 AI 注入 background-image，不需要背景图时可删除此节点） -->
    <div class="page-bg" data-fill="image" data-eva-visual="style-only" aria-hidden="true"></div>

    <!-- ══ 在此按顺序插入各组件 fragment 的 DOM 部分 ══ -->

  </article>

  <!-- 图片懒加载 + BmgTemplateRenderer -->
  <script src="//s1.hdslb.com/bfs/seed/jinkela/short/bmg/autofallback.js"></script>
  <script src="//s1.hdslb.com/bfs/seed/jinkela/short/bmg/detect.js"></script>
  <script src="//s1.hdslb.com/bfs/seed/jinkela/short/bmg/template-renderer.js"></script>

  <!-- 合并后的组件 CSS（去重后按顺序）-->
  <!-- 注：<style> 块放 <body> 末尾而非 <head>，是为了避免阻塞首屏渲染。
       浏览器对 body 内 style 的支持已足够稳定，不会产生可见的 FOUC。-->
  <!-- ══ 在此插入各组件 <style> 块 ══ -->

  <!-- 合并后的组件 JS（按顺序） -->
  <!-- ══ 在此插入各组件 <script> 块 ══ -->

  <!-- 埋点上报 -->
  <script src="//s1.hdslb.com/bfs/activity-plat/static/20260612/53704fc8d3ac45ac4b9a45153a694277/report_new.js"></script>
  <!-- iframeBridge（预览环境通信） -->
  <script defer src="//s1.hdslb.com/bfs/activity-plat/static/20260529/53704fc8d3ac45ac4b9a45153a694277/iframeBridge.js"></script>

</body>
</html>
```

---

## 第五步：拼合执行

按以下顺序操作：

1. **校验 schema v2 和业务输入**：按 mode 校验必填 business-data/business-asset；production 缺失时停止
2. **生成页面配置块**：只注入业务 `dataFields` 到 `window.__EVA_DATA_FIELDS__`。key 格式 `{component-name}_{instanceId}`；无 dataFields 的页面保留空对象
3. **收集所有 fragment** 的 `<style>` 块，只对规范化后内容完全相同的块去重；同组件不同模式的差异 CSS 必须全部保留
4. **替换 `{{INSTANCE_ID}}`**：按组件维度独立计数，同时更新对应 dataFields key
5. **原样插入各 fragment DOM**：保留 `data-ui-baseline`、`data-eva-visual` 和全部稳定业务钩子
6. **追加样式和脚本**：脚本内容和顺序原样保留，不因视觉生成修改
7. 用户提供设计方向时，再按 `eva-visual-fill` 权限协议生成视觉；未提供时保留 mode 默认基线

---

## 第六步：自检

生成完整 HTML 后，逐项确认：

先运行确定性校验：

```bash
node <eva-page-template-spec目录>/scripts/validate-eva-page.mjs <生成的HTML路径>
```

校验失败时必须修复后重跑。

**结构**
- [ ] 平台选择正确（H5 / PC）
- [ ] `<title>` 已填写
- [ ] `window.__EVA_API_MODE__` 与用途一致：上线为 `production`，预览为 `preview`
- [ ] `window.__EVA_DATA_FIELDS__` 已注入，所有 dataFields 字段均已包含
- [ ] 所有组件 meta 均为 schema v2，production 必填业务数据/素材无缺失
- [ ] 未注入 sourceDefaults、previewData 或结构化视觉字段

**CSS**
- [ ] 完全相同的 `<style>` 块只出现一次；同组件不同模式的差异 CSS 均保留
- [ ] 组件选择器同时限定 `data-eva` 和 `data-mode`
- [ ] 无裸全局选择器污染（`body`、`html` 等）
- [ ] 所有 rem 值基于 `px ÷ 50` 换算，H5/PC 基准一致

**JS**
- [ ] 每个 fragment 的 `{{INSTANCE_ID}}` 已替换为正确序号
- [ ] 每个根节点包含正确的 `data-mode`，脚本不会初始化其他模式
- [ ] `data-ui-baseline`、`data-eva-visual`、`data-eva-action/bind/slot/state` 原样保留
- [ ] 组件工具使用独立命名空间并按方法幂等补齐，不受 mode 拼接顺序影响
- [ ] 无重复定义的全局函数
- [ ] fragment 统一读取 `window.__EVA_API_MODE__`，无需手工修改每个组件常量

**功能**
- [ ] H5：打开页面，rem 基准正确（375px 宽度下 `html { font-size: 50px }`）
- [ ] PC：打开页面，rem 基准固定 50px
- [ ] 各组件独立初始化，互不干扰
- [ ] 有 dataFields 的组件：填入真实数据后接口正常调用

---

## 附：H5 与 PC 关键差异速查

| 特性 | H5 | PC |
|---|---|---|
| rem 基准 | `clientWidth / 375 * 50`（动态，最大宽 600px） | 固定 50px |
| `--eva-rem-rate` | `clientWidth / 375`（动态） | 固定 `1` |
| 布局宽度 | `#app { max-width: 7.5rem; margin: auto; }` | `body { min-width: 1280px; }` |
| 设备兼容检测 | 有（Android8/iOS14/Chrome63/App7.0+） | 无 |
| jsbridge | 有（`js-bridge.min.js`） | 无 |
| iframeBridge | 有 | 有（两者均需预览通信） |
| 平台脚本 | `plat/h5/plat.global.min.js` | `plat/pc/plat.global.min.js` |
| 方向变化监听 | 有（`orientationchange`） | 无 |

---

## 附：dataFields 注入约定

fragment 中读取 dataFields 的标准写法：

```javascript
// 在 init(root) 函数内
const instanceId = root.dataset.instance || '0';
const componentName = root.dataset.eva; // 如 "h5-follow-new"
const fields = (window.__EVA_DATA_FIELDS__ &&
  window.__EVA_DATA_FIELDS__[`${componentName}_${instanceId}`]) || {};

// 然后按字段 key 读取
const uid = fields.uid || '';
const sourceId = fields.sourceId || '';
```

宿主注入示例（由 page-template-spec 生成）：

```javascript
window.__EVA_DATA_FIELDS__ = {
  "h5-follow-new_0": { "uid": "123456" },
  "h5-follow-new_1": { "uid": "789012" },
  "era-lottery_0": { "sourceId": "ds_abc123" }
};
```
