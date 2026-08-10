import {
  CompositeBackend,
  FilesystemBackend,
  createDeepAgent,
  registerHarnessProfile,
} from "deepagents";
import {
  modelCallLimitMiddleware,
  modelRetryMiddleware,
  summarizationMiddleware,
  todoListMiddleware,
  toolCallLimitMiddleware,
} from "langchain";
import { createDeepSeek, ModelName } from "./model.js";
import {
  activityPermissions,
  activitySubagents,
  runtimeSkills,
} from "./subagents.js";
import { pageTools } from "./tools.js";
import { SKILLS_DIR, ThreadFilesystemBackend, ensureWorkspace } from "./workspace.js";

await ensureWorkspace();

// Keep explicit domain delegation but disable the general-purpose subagent and
// shell execution. No subagent defines interruptOn, so delegation cannot pause
// on a nested approval.
registerHarnessProfile("deepseek", {
  excludedTools: ["execute"],
  generalPurposeSubagent: { enabled: false },
});

const SYSTEM_PROMPT = `你是活动页面生成 Agent，负责通过对话理解用户的页面搭建需求，将自然语言整理为清晰、可执行的页面配置，并完成相应的预览构建流程。

## 工作方式

- 理解用户希望实现的页面效果、组件功能、内容和布局。
- 结合已有 Skills 中的领域知识，识别合适的组件及配置方式。
- 将用户描述转换为符合组件要求的结构化参数。
- 对用户未指定的可选配置使用合理默认值。
- 当缺少必要信息或需求存在歧义时，简洁地向用户确认。
- 完成构建后，向用户返回预览结果和关键配置摘要。

## 对话原则

优先使用自然语言交流，不要求用户了解组件 Props、LayerTree、Slot 等底层概念。

从用户描述中提取页面目标和使用场景、组件与功能、展示内容、布局层级、样式交互和目标页面。能够合理推断的内容直接处理；只有缺少必填信息、存在明显冲突或不同理解会产生实质差异时才确认。

## 页面构建

凡是页面创建、修改或预览任务，先读取 /skills/eva-page-builder/SKILL.md 并严格执行。使用 list_eva_components 获取组件目录，再按需读取对应组件 Skill 和 meta/fragment，避免加载无关内容。

- 草稿写入 /drafts，确认后的页面写入 /artifacts。
- /skills 是只读知识库；不得尝试修改。
- 你没有 Shell、网络研究、邮件或删除文件工具，也不得暗示拥有这些能力。
- 你可以通过 task 委派给三个活动页领域子智能体，但它们是无状态的：每次必须传入完整需求、已知参数、文件路径和预期输出。
- 必须使用 validate_eva_page 校验页面；只有 create_preview 成功返回 previewUrl 后才能声称构建成功。
- 不得自行拼接或编造预览链接。工具失败时根据错误修复；仍无法完成时必须向用户说明具体失败阶段和可调整方式，始终给出最终回复。

### 子智能体委派规则

- 简单咨询、组件能力说明和明确的单组件小修改直接处理，不要为了展示能力而委派。
- 复杂、多组件或需求存在多种配置组合时，先委派 requirements_analyst，拿到规格后再决定是否需要向用户确认。
- 页面规格完整后可委派 page_assembler 生成并校验文件。不要让它发布预览。
- production 页面、多组件页面或重要修改在发布前委派 quality_reviewer；修复 blocker 后由主 Agent 再次校验。
- 主 Agent 始终负责最终 validate_eva_page、create_preview 和面向用户的回复。任何子智能体失败时都要接管或明确报告，不能静默等待。

## 参数处理

- 使用正确字段类型和合法取值，保留用户明确配置，为可选项补合理默认值。
- 根据组件模式处理参数依赖，将用户 ID、颜色、图片、尺寸、布尔值和枚举描述转换为对应格式。
- production 页面不得用 previewData、源码默认业务数据或空值冒充必填参数。
- 涉及平台登录状态时，只提示用户确认当前浏览器已登录，不索取 Cookie 或 Token。

## 回复格式

构建成功后简洁列出：页面或组件、关键配置、目标页面、create_preview 返回的预览链接，以及必要警告。若当前只是咨询或信息不足，不强行构建页面。你的目标是让用户用自然语言完成活动页面搭建，并尽量减少对底层配置的关注。`;

// Curated runtime set. Maintenance-only component-skill-spec and the two
// image-generation skills remain in the repository but are not advertised to
// this backend because it intentionally exposes no image-generation tool.

const sandboxBackend = new ThreadFilesystemBackend();
const skillsBackend = new FilesystemBackend({
  rootDir: SKILLS_DIR,
  virtualMode: true,
  maxFileSizeMb: 5,
});

export const backend = new CompositeBackend(sandboxBackend, {
  "/skills/": skillsBackend,
});

export const agent = createDeepAgent({
  name: "eva_activity_page_agent",
  model: createDeepSeek(ModelName.FLASH),
  systemPrompt: SYSTEM_PROMPT,
  tools: pageTools,
  backend,
  skills: runtimeSkills,
  subagents: activitySubagents,
  permissions: activityPermissions,
  middleware: [
    todoListMiddleware(),
    modelRetryMiddleware({
      maxRetries: 2,
      initialDelayMs: 500,
      maxDelayMs: 4_000,
      onFailure: (error) => `模型服务暂时不可用：${error.message}。请向用户说明稍后重试。`,
    }),
    modelCallLimitMiddleware({ runLimit: 24, exitBehavior: "end" }),
    toolCallLimitMiddleware({ runLimit: 60, exitBehavior: "continue" }),
    summarizationMiddleware({
      model: createDeepSeek(ModelName.FLASH),
      trigger: { tokens: 16_000 },
      keep: { messages: 24 },
    }),
  ],
});

export { SANDBOX_DIR, SKILLS_DIR } from "./workspace.js";
