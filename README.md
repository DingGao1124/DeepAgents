# Langchain-Powered AI Agent

面向运营的活动页生成 Agent：用户用自然语言描述页面、组件、内容和目标场景，后端把需求转换为 Eva 单文件页面，完成确定性校验并返回真实预览链接。

## 当前架构

```text
React useStream (:5173)
        │
        ▼
LangGraph API (:2024)
        │
        ├─ Eva activity-page Deep Agent
        ├─ curated Eva Skills（按需加载）
        ├─ FilesystemBackend（virtualMode）
        │    ├─ /drafts
        │    ├─ /artifacts
        │    ├─ /uploads
        │    └─ /large_tool_results
        └─ 固定工具：组件目录、页面校验、预览发布
```

后端不再暴露通用 Researcher、`execute`、邮件或演示删除工具，也没有嵌套人工审批。`task` 只用于三个受限的活动页领域子智能体，因此不会再出现子智能体内部 Shell 审批无法实时显示、主 Agent 一直等待而不回复的问题。

文件工具由 `FilesystemBackend({ virtualMode: true })` 限制在 `backend/workspace/sandbox/threads/<thread_id>/`，不同会话拥有独立文件根。`/skills` 通过 `CompositeBackend` 映射到只读知识库，并由权限规则禁止写入。模型没有 Shell 权限；页面验证器由后端以固定程序和固定参数调用，不接受任意命令。

## 后端能力

- `list_eva_components`：从组件 `meta.json` 返回合法组件、模式和必填业务字段。
- `validate_eva_page`：只校验 `/drafts`、`/artifacts` 中的 HTML，返回结构化错误。
- `create_preview`：校验通过后复制到线程预览目录并返回真实 URL。
- `eva-page-builder`：活动页需求提取、组件选择、按需加载、组装、校验、预览的端到端 Skill。
- `requirements_analyst`：只读整理复杂需求、组件模式和必填字段。
- `page_assembler`：组装页面并校验文件，但无权发布预览。
- `quality_reviewer`：只读检查确定性规则和业务发布风险。
- 稳定性中间件：todo 规划、模型重试、模型/工具调用上限、长会话摘要。

当前运行时只公开页面构建、模板、填充策略和五个业务组件 Skill。组件 Skill 生成规范及依赖图像生成工具的视觉 Skill 保留在仓库中供维护，但不会注入此 Agent 的运行时能力列表。

## 启动

```bash
pnpm setup
pnpm dev
```

- 前端：http://localhost:5173
- 后端：http://localhost:2024
- 健康检查：http://localhost:2024/api/health

必要环境变量在 `backend/.env.example`：

```dotenv
DEEPSEEK_API_KEY=
AGENT_PUBLIC_URL=http://localhost:2024
```

如果后端部署在反向代理或公网域名下，把 `AGENT_PUBLIC_URL` 改为浏览器实际可访问的基地址，否则预览链接仍会指向本机。

## 关键文件

- `backend/src/agent.ts`：角色、运行时 Skill 白名单、权限和中间件。
- `backend/src/subagents.ts`：领域子智能体、独立工具集和文件权限。
- `backend/src/workspace.ts`：文件沙盒、路径校验、页面验证和线程预览发布。
- `backend/src/tools.ts`：三个领域工具。
- `backend/src/http.ts`：健康检查和带 CSP 沙盒的预览路由。
- `backend/workspace/skills/eva-page-builder/SKILL.md`：端到端页面构建流程。

## 验证

```bash
pnpm typecheck
pnpm build
node backend/workspace/skills/eva-page-template-spec/scripts/validate-eva-page.mjs <page.html>
```

`langgraphjs dev` 的线程状态默认只适合本地开发。正式部署建议使用 LangSmith Deployment 或持久化 LangGraph 服务；预览文件也应迁移到带鉴权和生命周期管理的对象存储/CDN。

## 安全边界

- 当前是文件能力沙盒，不是容器/虚拟机代码执行沙盒；因为模型没有 `execute`，无需给模型提供宿主机执行能力。
- 预览响应使用 CSP `sandbox`、`no-store` 和 `nosniff`，并按线程目录发布。
- production 页面缺少组件必填业务数据时必须先询问，不得用 preview/mock 数据冒充正式数据。
- Agent 只能返回 `create_preview` 工具实际生成的链接。
