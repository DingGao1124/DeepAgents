# Runtime Skills

These Skills define the reusable workflow of Web Page Automation Agent. Each one has a narrow responsibility and a clear handoff to the next stage.

| Skill | Responsibility |
| --- | --- |
| `web-page-workflow` | Coordinate the complete request from source assets to a validated preview |
| `visual-design` | Turn a key visual and wireframe into a coherent page design |
| `design-to-html` | Reconstruct an approved design as responsive, self-contained HTML |
| `html-quality` | Review and deterministically validate generated HTML |

Skills are mounted read-only at `/skills` and loaded on demand by the main agent and its specialists.
