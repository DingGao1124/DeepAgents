import type { FilesystemPermission, SubAgent } from "deepagents";
import { toolCallLimitMiddleware } from "langchain";
import { validateHtmlPage } from "./tools.js";

export const workspacePermissions: FilesystemPermission[] = [
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
  "/skills/web-page-workflow/",
  "/skills/visual-design/",
  "/skills/design-to-html/",
  "/skills/html-quality/",
];

const designSkills = ["/skills/visual-design/"];
const builderSkills = [
  "/skills/web-page-workflow/",
  "/skills/design-to-html/",
  "/skills/html-quality/",
];
const reviewerSkills = ["/skills/html-quality/"];

export const visualPageSubagents: SubAgent[] = [
  {
    name: "design_planner",
    description:
      "Analyze a key visual, wireframe, copy, and target viewport; produce an implementation-ready visual brief without modifying files.",
    systemPrompt: `You are a visual design planner for web pages. Read /skills/visual-design/SKILL.md and analyze the supplied key visual, wireframe, content, and viewport.

Return a concise brief with:
- page goal and primary action
- section map and content hierarchy
- palette and typography roles
- spacing, shape, material, and imagery treatment
- responsive and interaction behavior
- missing inputs and risks

Separate observations from proposed decisions. Do not invent brand rules, copy, claims, or asset URLs. Remain read-only and keep the response within 25 lines.`,
    tools: [],
    skills: designSkills,
    permissions: readOnlyPermissions,
    middleware: [toolCallLimitMiddleware({ runLimit: 10, exitBehavior: "continue" })],
  },
  {
    name: "html_builder",
    description:
      "Convert an approved visual design and structural brief into responsive, self-contained HTML, then validate the result without publishing it.",
    systemPrompt: `You are an HTML implementation specialist. Read /skills/design-to-html/SKILL.md and /skills/html-quality/SKILL.md before working.

Given complete design references, content, viewport requirements, and an output path:
1. Read all referenced inputs once.
2. Write one self-contained HTML document to /drafts or /artifacts.
3. Call validate_html_page and make at most three repair passes.
4. Return the file path, validation result, and remaining fidelity or accessibility risks.

Do not publish a preview, modify /skills, invent assets, add trackers, or add network behavior that the user did not request.`,
    tools: [validateHtmlPage],
    skills: builderSkills,
    permissions: workspacePermissions,
    middleware: [toolCallLimitMiddleware({ runLimit: 20, exitBehavior: "continue" })],
  },
  {
    name: "quality_reviewer",
    description:
      "Review generated HTML for deterministic validity, accessibility, responsiveness, security, and fidelity to the supplied design.",
    systemPrompt: `You are a read-only web page quality reviewer. Read /skills/html-quality/SKILL.md, call validate_html_page once, then inspect the page and its supplied references as needed.

Return three short sections:
### Blockers
### Warnings
### Passed

Prioritize actionable structural, accessibility, responsive, security, and visual-fidelity findings. Do not modify files or publish previews. Keep the response within 20 lines.`,
    tools: [validateHtmlPage],
    skills: reviewerSkills,
    permissions: readOnlyPermissions,
    middleware: [toolCallLimitMiddleware({ runLimit: 8, exitBehavior: "continue" })],
  },
];
