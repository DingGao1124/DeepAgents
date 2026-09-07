# Web Page Automation Agent

Web Page Automation Agent turns a key visual (KV), wireframe, content, and viewport requirements into a visual design, responsive HTML, and an isolated browser preview. It is implemented around the concept of **Harness Engineering**, using planning, memory, sandboxed workspaces, on-demand Skills, specialist subagents, approval checkpoints, and deterministic validation to keep the visual-to-code workflow reliable.

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
┌──────────────────────────── LangGraph API :2024 ─────────────────────────────┐
│ Web Page Automation Agent                                                    │
│                                                                              │
│  Planning / retries / budgets      Read-only, on-demand Skills               │
│  Thread-scoped state               Design / HTML / review subagents           │
│  HTML validation and preview       Optional MCP tools                        │
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

**Harness:** 🧠 thread memory · 📁 workspace isolation · 🧰 Skill management · 🤝 specialist delegation · ✋ approval interrupts · 🛡️ retries, budgets, and validation

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
