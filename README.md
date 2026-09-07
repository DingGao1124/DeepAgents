# DeepAgents for Web Development

DeepAgents for Web Development turns a key visual (KV), wireframe, content, and viewport requirements into a visual design, responsive HTML, and an isolated browser preview. Rather than relying on the model alone, it is implemented around the concept of **Harness Engineering**: a controlled runtime supplies the agent with context, planning, memory, scoped capabilities, specialist delegation, human checkpoints, and deterministic quality gates.

## 🌟 Key Features

- **Harness-first execution** — surrounds model calls with state, permissions, retries, budgets, and validation.
- **Visual-to-code pipeline** — moves from visual references to design, responsive HTML, and preview.
- **Governed delegation** — assigns design, implementation, and review to bounded specialist subagents.
- **Human control and observability** — streams plans, reasoning, tools, and approval requests to the UI.
- **Isolated artifacts** — scopes drafts, uploads, final pages, and previews to individual threads.
- **Extensible capabilities** — loads reusable Skills and optional MCP tools without coupling them to the core agent.

## ✨ Workflow

```text
🖼️  KV + wireframe + content
              ↓
🎨  Visual analysis and page design
              ↓
💻  Responsive, self-contained HTML
              ↓
✅  Validation → review → preview
```

Visual generation is available when an image-capable MCP tool is connected; otherwise, the agent produces an implementation-ready design brief.

## 🧩 Architecture

```text
┌──────────────────────────────── React + Vite ────────────────────────────────┐
│ Threads · streaming chat · reasoning · tool activity · approvals · run state │
└──────────────────────────────────────┬────────────────────────────────────────┘
                                       │ @langchain/react useStream
                                       ▼
┌──────────────────────── LangGraph Agent Harness :2024 ───────────────────────┐
│ Web Page Automation Agent                                                    │
│                                                                              │
│  Control   Planning · retries · call budgets · approval interrupts           │
│  Context   Thread state · system instructions · on-demand Skills             │
│  Workers   Design Planner · HTML Builder · Quality Reviewer                  │
│  Gates     Filesystem permissions · HTML validation · preview publication    │
└────────────────────────┬─────────────────────────────┬─────────────────────────┘
                         │                             │
                         ▼                             ▼
┌────────────────────────────────┐      ┌───────────────────────────────────────┐
│ Per-thread workspace           │      │ Workflow knowledge                    │
│ /drafts                        │      │ /skills/web-page-workflow             │
│ /artifacts                     │      │ /skills/visual-design                 │
│ /uploads                       │      │ /skills/design-to-html                │
│ /large_tool_results            │      │ /skills/html-quality                  │
└────────────────┬───────────────┘      └───────────────────────────────────────┘
                 │ validate and publish
                 ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│ Thread-scoped HTML previews · CSP sandbox · no-store · nosniff                │
└───────────────────────────────────────────────────────────────────────────────┘
```

## 🧠 Harness Engineering

The harness turns an open-ended model into a bounded system that can plan, delegate, recover, and produce verifiable artifacts.

| Layer | Project implementation | Purpose |
| --- | --- | --- |
| 🧭 Planning | Todo middleware and streamed run state | Makes multi-step work visible and resumable |
| 🧠 Memory | LangGraph thread state | Retains conversation and execution context |
| 🧰 Context | Read-only Skills loaded on demand | Supplies task knowledge without inflating every prompt |
| 🤝 Delegation | Design, HTML, and review subagents | Isolates roles, tools, and filesystem permissions |
| 📁 Sandbox | Per-thread virtual filesystem | Contains uploads, drafts, artifacts, and large results |
| ✋ Oversight | Interrupts for writes, edits, and previews | Keeps consequential actions under user control |
| 🔁 Resilience | Model/tool retries and call budgets | Bounds transient failures and runaway loops |
| 🛡️ Verification | Fixed HTML validator before publication | Prevents unchecked artifacts from becoming previews |

```text
Request → assemble context → plan → delegate → approve write → validate → approve preview
```

## 🛠️ Runtime Skills

| Skill | Purpose |
| --- | --- |
| `web-page-workflow` | Coordinates the end-to-end workflow |
| `visual-design` | Derives a design from the KV and wireframe |
| `design-to-html` | Reconstructs the approved design as responsive HTML |
| `html-quality` | Reviews accessibility, safety, responsiveness, and fidelity |

Skills are stored in [`backend/workspace/skills`](backend/workspace/skills) and mounted read-only at runtime.

## 🚀 Getting Started

**Requirements:** Node.js 22+, pnpm, and a DeepSeek API key.

```bash
pnpm setup
```

Configure `backend/.env`:

```dotenv
DEEPSEEK_API_KEY=your-api-key
AGENT_PUBLIC_URL=http://localhost:2024
```

Optional image-generation MCP server:

```dotenv
MCP_SERVERS={"image-tools":{"url":"http://localhost:8000/mcp","transport":"http"}}
```

Start the frontend and agent backend:

```bash
pnpm dev
```

- Frontend: `http://localhost:5173`
- LangGraph API: `http://localhost:2024`
- Health check: `http://localhost:2024/api/health`

## ✅ Validation

```bash
pnpm typecheck
pnpm build
node backend/workspace/skills/html-quality/scripts/validate-html.mjs <page.html>
```

Previews are isolated by thread and served with restrictive browser security headers.
