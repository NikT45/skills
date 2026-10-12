---
name: design-system
description: Initialize and iterate the visual design system for a new app — interview the user, define tokens (two fonts, color ramps + semantic light/dark, 8px grid, radius nesting, type scale, elevation, motion, component specs), build a shadcn-style HTML visualizer with grid/padding/structure/grayscale overlays and a live tweak panel, iterate on feedback, then export to DESIGN.md + tokens.css + Tailwind and push variables/styles into Figma. Use when the user says "init the design system", "set up the design for this app", "design tokens", "color palette and fonts for the project", "theme visualizer", "push the design system to Figma", or wants a DESIGN.md.
---

# Design System

Establish the base design of a new product as data (`tokens.json`), render it as a living HTML visualizer, iterate with the user in the browser, then freeze it as `DESIGN.md` + CSS + Figma variables.

Skill root: `~/skills/design-system` (symlinked into each agent's skills dir). Paths below are relative to it.

```
SKILL.md                      this workflow
templates/visualizer.html     the skeleton — identical for every project, tokens injected at build
templates/tokens.example.json a complete reference instance
scripts/build.mjs             tokens.json → design-system.html, tokens.css, DESIGN.md, tailwind.tokens.js
scripts/validate.mjs          lints tokens.json (structure, refs, contrast, grid, nesting)
scripts/figma-payload.mjs     tokens.json → figma-payload.json (variables/styles in Plugin-API shape)
scripts/lib/tokens.js         shared resolver / CSS emitter / contrast math (Node + browser)
references/intake.md          the interview
references/design-rules.md    the opinions the system enforces
references/token-schema.md    every key in tokens.json and the CSS vars it produces
references/figma-export.md    the Figma phase, step by step
```

## Non-negotiables

- **`tokens.json` is the only thing you hand-edit.** Never edit `design-system.html`, `tokens.css`, or the generated sections of `DESIGN.md`. Change the token, rebuild.
- **The skeleton stays the skeleton.** `templates/visualizer.html` is shared by every project. Project work never modifies it. If the skeleton needs a new component or overlay, that is a skill change, done deliberately and noted to the user.
- **Validate before every build.** `validate.mjs` must print `PASS`. Contrast failures are errors, not warnings.
- **Figma export is a separate, explicit phase** that happens only after the user says the HTML is final.

## Workflow

### Phase 0 — Intake
1. Read `references/intake.md`. If a codebase exists, inspect it first (Tailwind config, CSS vars, fonts, logo colors) and present findings as proposals.
2. Ask round-1 questions (≤ 4, one `AskUserQuestion` call where available). Ask round-2 only for what's still unresolved. Propose defaults for everything else.
3. Restate the brief in ≤ 6 lines: product, platform, three vibe words, references, constraints, density/shape/type direction. Get a nod.

### Phase 1 — Tokens
1. Copy `templates/tokens.example.json` to `<project>/design/tokens.json` (or wherever the user wants it; `design/` at repo root is the default). Set `meta.createdAt` to today.
2. Rewrite it for this product, top to bottom, applying `references/design-rules.md`:
   - **Fonts:** pick display + body (+ mono if the product shows code or figures). Real Google Fonts names with the exact `css2` family spec so the visualizer loads them.
   - **Type scale:** choose the ratio (1.2 / 1.25 / 1.333) from density and vibe. Sizes ≥ 20px on 4px.
   - **Primitives:** build ramps that actually belong to this brand (tint the neutrals; don't copy Tailwind's). 11 steps for neutral and brand; 5–8 for status hues, including a 950 for dark tints.
   - **Semantics:** map light, then dark as a remap (see rules). All values as `{ramp.step}` refs.
   - **Spacing / radius / layout / components:** pick from density and shape. Check the nesting rule: card radius − card padding = a radius in the scale.
   - **Rules:** 8–12 statements, in the user's language where they gave it.
3. `node ~/skills/design-system/scripts/validate.mjs <tokens.json>` — fix until `PASS`. Warnings you're keeping on purpose get mentioned to the user once.

### Phase 2 — Build and present
1. `node ~/skills/design-system/scripts/build.mjs <project-design-dir>` → `design-system.html`, `tokens.css`, `DESIGN.md`, `tailwind.tokens.js`.
2. Open `design-system.html` for the user (`open <path>` on macOS). If a browser/screenshot tool is available, take one light and one dark screenshot yourself and look at them before the user does. Fix anything obviously off, rebuild.
3. Tell the user, briefly: what you chose and why (3–5 bullets), and how to drive the visualizer:
   - **D** dark · **T** tweak panel · **G** 8px grid · **P** padding audit (green on-grid, amber half-step, red off) · **S** structure outlines · **H** grayscale hierarchy check · Gaps / Baseline in the top bar.
   - The tweak panel edits semantic colors, fonts, base size / ratio, radii, grid unit, card padding, control height live. **Copy tokens.json** or the diff pastes straight back into the chat.

### Phase 3 — Iterate
Loop until the user says it's final:
1. Take feedback in any form: prose ("warmer", "less rounded", "the primary is too loud"), a pasted diff from the tweak panel, or a full pasted `tokens.json`.
2. Translate prose into token edits. Say which tokens you changed and to what. Don't change things they didn't mention.
3. Validate → build → tell them to reload (or reopen). Repeat.
4. When something in the *skeleton* is wrong (a component missing, an overlay misbehaving), say so and fix the template as a separate, labelled change.

### Phase 4 — Export
1. **DESIGN.md** is already generated by the build. Now write the `<!-- CUSTOM:START/END -->` block: rationale (why these fonts, this palette, what it should feel like), any overrides of the default rules, and do/don't examples specific to this product. It survives rebuilds.
2. Confirm where the project wants the artifacts (`design/` by default) and that `tokens.css` is imported at the app root and `tailwind.tokens.js` merged into `theme.extend` if they use Tailwind.
3. Ask: **"Ready to push this to Figma? Send me the file URL, or say 'new file'."** On yes, follow `references/figma-export.md` exactly. It is multi-step with checkpoints. Load `figma:figma-use` and `figma:figma-generate-library` first; run `scripts/figma-payload.mjs`; create Primitives → Layout → Semantic (aliases) → text/effect styles → Foundations page; screenshot; hand off. Components in Figma only on request.

## Quality bar (check before presenting each build)
- Both modes pass contrast for every text pair. Dark background is not #000.
- Padding overlay shows no red anywhere in the Components or Composition sections.
- Grayscale overlay: hierarchy is still legible in the Composition section.
- Display font appears only at h2 and above.
- Card radius − card padding equals a scale radius (the nesting demo shows no "clamped").
- Fonts actually loaded (the specimen cards don't show the fallback).
- `DESIGN.md` reads as a spec someone could build from without the HTML.

## Prompts that route here
"init design", "set up the design system", "pick fonts and colors for the app", "design tokens", "make a theme visualizer", "shadcn theme for this project", "write a DESIGN.md", "export the design system to Figma", "8px grid rules".
