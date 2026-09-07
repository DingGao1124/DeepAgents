---
name: web-page-workflow
description: Coordinate an end-to-end web page automation request from a key visual and wireframe through visual design, responsive HTML implementation, validation, and preview publication. Use whenever a user asks to create, revise, validate, or preview a web page.
---

# Web Page Workflow

Use this Skill as the entry point for page-building work.

## Required inputs

- A key visual or another reliable style reference
- A wireframe, layout image, or sufficiently precise structural description
- Page copy and required assets
- Target viewport: mobile, desktop, or responsive

Ask one concise set of questions only when a missing input would materially change the result. Never invent logos, legal copy, product claims, or asset URLs.

## Workflow

1. **Understand** — summarize the page goal, audience, content hierarchy, viewport, interaction needs, and constraints.
2. **Plan** — read `/skills/visual-design/SKILL.md` and create a visual brief grounded in the supplied assets.
3. **Design** — use an available image-generation tool to produce a page design. Keep wireframe geometry stable and use the key visual only as the visual-language reference. If no image tool is available, produce the brief but do not claim that a design image exists.
4. **Confirm** — use the approved design, or the latest design when the user explicitly requested autonomous completion, as the implementation reference.
5. **Implement** — read `/skills/design-to-html/SKILL.md` and write a self-contained page to `/drafts/<short-name>.html`.
6. **Review** — read `/skills/html-quality/SKILL.md`, call `validate_html_page`, and repair deterministic failures. Use no more than three repair passes.
7. **Finalize** — write the accepted version to `/artifacts/<short-name>.html`, validate it again, and call `create_preview`.

## Boundaries

- `/skills` is read-only.
- Store working files only under `/drafts`, `/artifacts`, `/uploads`, or `/large_tool_results`.
- Preserve user-provided copy and brand assets exactly unless the user asks for changes.
- Never construct a preview URL. Return only the URL produced by `create_preview`.
- Report an unavailable capability or failed stage plainly; do not imply that an artifact was generated when it was not.

## Final response

Include the implemented page name, target viewport, notable design decisions, validation status, preview URL, and any remaining limitations.
