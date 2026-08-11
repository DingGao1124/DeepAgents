import type { FilesystemPermission, SubAgent } from "deepagents";
import { toolCallLimitMiddleware } from "langchain";
import { listEvaComponents, validateEvaPage } from "./tools.js";

export const activityPermissions: FilesystemPermission[] = [
  {
    operations: ["read"],
    paths: [
      "/",
      "/skills",
      "/skills/**",
      "/drafts",
      "/drafts/**",
      "/artifacts",
      "/artifacts/**",
      "/uploads",
      "/uploads/**",
      "/large_tool_results",
      "/large_tool_results/**",
    ],
    mode: "allow",
  },
  {
    operations: ["write"],
    paths: ["/drafts/**", "/artifacts/**", "/large_tool_results/**"],
    mode: "allow",
  },
  { operations: ["read", "write"], paths: ["/**"], mode: "deny" },
];

const readOnlyPermissions: FilesystemPermission[] = [
  {
    operations: ["read"],
    paths: [
      "/",
      "/skills",
      "/skills/**",
      "/drafts",
      "/drafts/**",
      "/artifacts",
      "/artifacts/**",
      "/uploads",
      "/uploads/**",
      "/large_tool_results",
      "/large_tool_results/**",
    ],
    mode: "allow",
  },
  { operations: ["read", "write"], paths: ["/**"], mode: "deny" },
];

export const runtimeSkills = [
  "/skills/eva-page-builder/",
  "/skills/eva-page-template-spec/",
  "/skills/eva-fill-policy/",
  "/skills/eva-image/",
  "/skills/eva-lottery/",
  "/skills/eva-text/",
  "/skills/eva-video/",
  "/skills/h5-follow-new/",
];

const componentSkills = [
  "/skills/eva-image/",
  "/skills/eva-lottery/",
  "/skills/eva-text/",
  "/skills/eva-video/",
  "/skills/h5-follow-new/",
];

const assemblerSkills = [
  "/skills/eva-page-builder/",
  "/skills/eva-page-template-spec/",
  ...componentSkills,
];

const reviewerSkills = ["/skills/eva-page-template-spec/", ...componentSkills];

export const activitySubagents: SubAgent[] = [
  {
    name: "requirements_analyst",
    description:
      "分析复杂或多组件活动页需求，选择合法组件与模式，整理必填业务字段、默认值、布局顺序和需要向用户确认的问题；只读，不生成页面。",
    systemPrompt: `你是 Eva 活动页需求分析子智能体。将用户需求转换为简洁可执行的页面规格。

先调用一次 list_eva_components，再按需读取相关组件 SKILL.md 和 meta.json。不要重复调用同一工具。

## 输出格式（精炼，每项一行）

- 页面目标：[一句话]
- 平台 / API 环境 / 目标页面
- 组件顺序：[comp(mode), ...]
- 关键 dataFields：[field: value]
- 默认值：[可安全采用的]
- 待确认：[仅列出 production 必填且缺失的字段]
- 风险：[如有]

不要写文件，不要生成 HTML，不要发布预览。不要编造业务 ID、图片/视频 URL。总输出控制在 20 行以内。`,
    tools: [listEvaComponents],
    skills: componentSkills,
    permissions: readOnlyPermissions,
    middleware: [toolCallLimitMiddleware({ runLimit: 12, exitBehavior: "continue" })],
  },
  {
    name: "page_assembler",
    description:
      "根据完整、已确认的活动页规格读取组件 fragment，组装或修改 Eva 单文件 HTML，写入 /drafts 或 /artifacts 并执行页面校验；不发布预览。",
    systemPrompt: `你是 Eva 活动页组装子智能体。接收完整页面规格和输出路径，严格按 eva-page-builder、eva-page-template-spec 及组件 Skills 生成单文件 HTML。

工作流（精简）：
1. 读取必要 Skills、meta.json、mode fragment（一次性批量读取）
2. 写入 HTML 到指定路径
3. 调用 validate_eva_page；校验失败最多修复 3 轮
4. 返回结果（3 行内）：文件路径、校验结果、残留风险

禁止：调用或编造预览链接、使用 Shell、修改 /skills、previewData 冒充 production 数据。`,
    tools: [listEvaComponents, validateEvaPage],
    skills: assemblerSkills,
    permissions: activityPermissions,
    middleware: [toolCallLimitMiddleware({ runLimit: 20, exitBehavior: "continue" })],
  },
  {
    name: "quality_reviewer",
    description:
      "只读审查已生成的 Eva 页面：运行确定性校验，并检查组件模式、业务必填字段、production/mock 边界、布局隔离、交互和发布风险。",
    systemPrompt: `你是 Eva 活动页质量审查子智能体。接收 HTML 路径和页面规格，调用一次 validate_eva_page，再按需读取页面和组件 meta.json。

## 输出格式（按严重程度）

### 🔴 Blockers
[必须修复，每条一行]

### 🟡 Warnings
[建议修复，每条一行]

### ✅ Passed
[通过项，限 3 条]

忽略琐碎格式问题。只读，不修改文件，不发布预览。总输出控制在 15 行以内。`,
    tools: [validateEvaPage],
    skills: reviewerSkills,
    permissions: readOnlyPermissions,
    middleware: [toolCallLimitMiddleware({ runLimit: 8, exitBehavior: "continue" })],
  },
];
