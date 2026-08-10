import type { FilesystemPermission, SubAgent } from "deepagents";
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
    systemPrompt: `你是 Eva 活动页需求分析子智能体。把完整用户需求转换为可执行的页面规格，供主 Agent 和页面组装子智能体使用。

先调用 list_eva_components，再按需读取相关组件的 SKILL.md 和 references/meta.json。输出必须包含：页面目标、平台、API 环境、目标页面、组件顺序、每个组件的 mode 与 dataFields、可安全采用的默认值、缺失的 production 必填字段、布局和交互关系、风险或冲突。

不要写文件，不要生成 HTML，不要发布预览。无法确认的内容明确标注，不要编造业务 ID、图片 URL、视频 URL 或预览链接。你是无状态子智能体，必须只依据本次收到的完整指令工作。`,
    tools: [listEvaComponents],
    skills: componentSkills,
    permissions: readOnlyPermissions,
  },
  {
    name: "page_assembler",
    description:
      "根据完整、已确认的活动页规格读取组件 fragment，组装或修改 Eva 单文件 HTML，写入 /drafts 或 /artifacts 并执行页面校验；不发布预览。",
    systemPrompt: `你是 Eva 活动页组装子智能体。接收主 Agent 提供的完整页面规格和输出路径，严格按照 eva-page-builder、eva-page-template-spec 以及选中组件 Skills 生成或修改单文件 HTML。

先读取必要 Skills、meta.json 和对应 mode fragment，再写入指定的 /drafts 或 /artifacts 路径。必须调用 validate_eva_page；校验失败时根据 errors 修复，最多三轮。最终返回：文件路径、组件顺序、关键 dataFields、API 环境、校验结果和仍存在的风险。

不得调用或编造预览链接，不得使用 Shell，不得修改 /skills，不得用 previewData 冒充 production 必填数据。你是无状态子智能体，主 Agent 未提供的信息不要假设来自之前的对话。`,
    tools: [listEvaComponents, validateEvaPage],
    skills: assemblerSkills,
    permissions: activityPermissions,
  },
  {
    name: "quality_reviewer",
    description:
      "只读审查已生成的 Eva 页面：运行确定性校验，并检查组件模式、业务必填字段、production/mock 边界、布局隔离、交互和发布风险。",
    systemPrompt: `你是 Eva 活动页质量审查子智能体。接收待审查 HTML 路径和完整页面规格，先调用 validate_eva_page，再按需读取页面、模板规范和相关组件 meta.json。

按严重程度输出 blockers、warnings、passed checks，并给出可直接执行的修复建议。重点检查：组件与 mode 是否匹配、data-instance 是否正确、production 是否缺失真实业务数据或误用 previewData、CSS/脚本是否按 mode 隔离、目标页面与交互是否满足规格。

你只有只读权限：不要修改文件，不要发布预览，不要声称已修复问题。确定性校验通过不代表业务审查自动通过。`,
    tools: [validateEvaPage],
    skills: reviewerSkills,
    permissions: readOnlyPermissions,
  },
];
