---
name: html-quality
description: Review generated single-file HTML for structure, accessibility, responsiveness, security, maintainability, and visual-reference fidelity. Use before preview publication or when auditing an existing page.
---

# HTML Quality Review

Review the page against both deterministic requirements and the user's visual reference.

## Deterministic gate

Call `validate_html_page` exactly once per revision. Treat every returned error as a blocker. After a repair, call it again; do not claim success from inspection alone.

## Review checklist

### Structure

- Complete document with language, charset, viewport, title, and semantic landmarks
- One clear primary heading and logical heading order
- No broken tags, unresolved template placeholders, or accidental debug content

### Accessibility

- Informative images have useful alt text; decorative images use empty alt text
- Controls use native elements, accessible names, keyboard behavior, and visible focus
- Text and essential UI states have sufficient contrast
- Motion respects `prefers-reduced-motion`

### Responsive behavior

- Layout remains usable at narrow mobile, tablet, and desktop widths
- No unintended horizontal scrolling or clipped essential content
- Tap targets, line length, spacing, and image crops adapt appropriately

### Security and portability

- No `javascript:` URLs, inline event-handler attributes, iframes, embedded credentials, or local absolute file paths
- No unexpected network requests, trackers, or external scripts
- Assets use explicit, reviewable HTTPS URLs when external resources are necessary

### Visual fidelity

- Section geometry and content hierarchy match the wireframe
- Palette, typography, material, and decoration match the approved design
- Real text and assets are not replaced by approximations

## Output

Return three sections: **Blockers**, **Warnings**, and **Passed**. Keep findings specific and actionable. A clean deterministic result does not override visible fidelity or accessibility problems.
