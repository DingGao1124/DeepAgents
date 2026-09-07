import {
  CompositeBackend,
  FilesystemBackend,
  createDeepAgent,
} from "deepagents";
import {
  modelCallLimitMiddleware,
  modelRetryMiddleware,
  todoListMiddleware,
  toolCallLimitMiddleware,
  toolRetryMiddleware,
} from "langchain";
import { loadMcpTools } from "./mcp.js";
import { createDeepSeek, ModelName } from "./model.js";
import {
  runtimeSkills,
  visualPageSubagents,
  workspacePermissions,
} from "./subagents.js";
import { webPageTools } from "./tools.js";
import { SKILLS_DIR, ThreadFilesystemBackend, ensureWorkspace } from "./workspace.js";

await ensureWorkspace();

const SYSTEM_PROMPT = `You are Web Page Automation Agent. Turn a user's visual references and requirements into an approved visual design, a responsive self-contained HTML page, and a validated browser preview.

## Core workflow

For page creation, revision, validation, or preview work, read /skills/web-page-workflow/SKILL.md first and follow it as the source of truth.

1. Understand the goal, audience, content, interactions, and target viewport.
2. Collect a key visual or equivalent style reference and a wireframe, layout image, or precise structural description.
3. Read /skills/visual-design/SKILL.md. Use an available image-generation tool to create the visual design while preserving wireframe structure. If no such tool is available, provide an implementation-ready visual brief and clearly state that no rendered design was generated.
4. Read /skills/design-to-html/SKILL.md and implement the approved design as a single self-contained HTML file.
5. Read /skills/html-quality/SKILL.md, call validate_html_page, repair failures, and publish only through create_preview.

## Working principles

- Communicate in clear natural language and keep implementation details proportional to the user's needs.
- Preserve user-provided copy, logos, and assets unless the user explicitly requests changes.
- Distinguish observed details in the references from design decisions you introduce.
- Ask for clarification only when missing information would materially change the result. Group essential questions together.
- Write working pages to /drafts and final pages to /artifacts. Treat /skills as a read-only knowledge base.
- Never invent asset URLs, claim that a visual was generated without a tool result, or construct a preview URL manually.

## Delegation

- Handle small, explicit revisions directly.
- Use design_planner when the inputs require visual analysis or a structured design brief.
- Use html_builder once the visual direction and content structure are complete.
- Use quality_reviewer before publishing a substantial or production-bound page.
- Specialists are stateless. Include complete requirements, known decisions, input paths or URLs, output paths, and the expected result in every task call.
- The main agent owns the final validate_html_page call, create_preview call, and user-facing response. If a specialist fails, take over or report the failing stage explicitly.

## Completion

Claim completion only after validate_html_page passes and create_preview returns a previewUrl. Summarize the result, target viewport, key design decisions, validation status, preview URL, and any remaining limitations.`;

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
  name: "web_page_automation_agent",
  model: createDeepSeek(ModelName.FLASH),
  systemPrompt: SYSTEM_PROMPT,
  tools: [...webPageTools, ...await loadMcpTools()],
  backend,
  skills: runtimeSkills,
  subagents: visualPageSubagents,
  permissions: workspacePermissions,
  middleware: [
    todoListMiddleware(),
    toolRetryMiddleware({
      maxRetries: 3,
      initialDelayMs: 1000,
      backoffFactor: 2,
    }),
    modelRetryMiddleware({
      maxRetries: 2,
      initialDelayMs: 500,
      maxDelayMs: 4_000,
      onFailure: (error) =>
        `The model service is temporarily unavailable: ${error.message}. Ask the user to try again later.`,
    }),
    modelCallLimitMiddleware({ runLimit: 50, exitBehavior: "end" }),
    toolCallLimitMiddleware({ runLimit: 60, exitBehavior: "continue" }),
  ],
  interruptOn: {
    write_file: true,
    edit_file: true,
    create_preview: true,
  },
});

export { SANDBOX_DIR, SKILLS_DIR } from "./workspace.js";
