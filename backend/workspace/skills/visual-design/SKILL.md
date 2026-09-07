---
name: visual-design
description: Create an implementation-ready visual direction or rendered page design from a key visual and wireframe. Use before HTML implementation when visual references are available.
---

# Visual Design

Translate source artwork and page structure into a coherent page design without conflating style and layout.

## Inputs

- **Key visual:** palette, typography mood, material, lighting, illustration style, and brand character
- **Wireframe:** section order, element count, alignment, approximate proportions, and interaction locations
- **Content:** real copy and supplied media
- **Target viewport:** dimensions or responsive breakpoint expectations

## Create the design brief

Record:

- Page purpose and primary action
- Section order and content priority
- Palette with accessible foreground/background pairs
- Typography roles and scale
- Spacing and radius system
- Image treatment and decorative motifs
- Interaction states and motion guidance
- Mobile/desktop adaptation rules

Distinguish observed facts from design decisions. Do not infer brand rules that are not visible in the provided references.

## Generate the visual

When an image-generation tool is available:

1. Provide the wireframe as the structural reference and the key visual as the style reference.
2. Preserve section order, element count, content hierarchy, and target aspect ratio.
3. Change only presentation: color, typography, material, imagery treatment, depth, and decoration.
4. Use real supplied copy when legibility is essential; otherwise avoid relying on generated image text as the final implementation source.
5. Generate mobile and desktop designs separately when both are required.

Reject a result only for structural drift, missing primary content, unusable contrast, or a wrong viewport. Allow at most two regeneration attempts, then report remaining differences.

When image generation is unavailable, return the complete design brief and state that no rendered visual was produced.

## Handoff

Return the design asset or reference, target dimensions, design tokens, section map, interaction notes, and any deliberate differences from the wireframe. This handoff must be sufficient for `/skills/design-to-html/SKILL.md`.
