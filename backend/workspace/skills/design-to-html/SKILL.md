---
name: design-to-html
description: Reconstruct an approved page design as responsive, accessible, self-contained HTML and CSS. Use when a visual design, screenshot, or detailed design brief must become a working page.
---

# Design to HTML

Build a faithful page from the approved visual reference and its structural brief.

## Implementation rules

- Produce one complete HTML file with `<!doctype html>`, semantic landmarks, embedded CSS, and minimal embedded JavaScript when interactions require it.
- Use CSS custom properties for palette, typography, spacing, radii, shadows, and layout widths.
- Match the visual hierarchy, proportions, alignment, and rhythm before refining decoration.
- Use supplied asset URLs or workspace files. Do not invent remote URLs or embed base64 placeholders.
- Preserve real copy as text rather than baking it into generated artwork.
- Implement meaningful controls with native elements, visible focus states, keyboard behavior, and accessible names.
- Add responsive behavior from the brief. Avoid scaling an entire desktop canvas down for mobile.
- Respect `prefers-reduced-motion` and avoid motion required to understand content.
- Keep JavaScript scoped and small. Do not add frameworks, trackers, network requests, or data collection unless explicitly requested.

## Visual comparison

Check the implementation in this order:

1. Section order and overall geometry
2. Content and asset fidelity
3. Typography and spacing
4. Color, borders, shadows, and decoration
5. Responsive states and interactions

When the design and wireframe disagree, follow the approved design for presentation and the wireframe for required content/behavior. Report any consequential conflict rather than silently dropping content.

## Output

Write work in progress to `/drafts/<short-name>.html`. Once reviewed, write the final file to `/artifacts/<short-name>.html`. Call `validate_html_page` before returning either file as complete.
