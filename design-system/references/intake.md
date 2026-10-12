# Intake — questions for a new design system

Ask in two rounds. Round 1 is mandatory. Round 2 only where the answer isn't already obvious from round 1 or the codebase. Never ask more than ~8 questions total; propose defaults for the rest and let the user correct them.

Use `AskUserQuestion` when available (one call, up to 4 questions, with sensible options). Otherwise ask in prose, numbered.

## Round 1 — identity (always)

1. **What is it, in one sentence, and who uses it?** (product, audience, platform: web / iOS / Android / desktop)
2. **Three words for how it should feel.** Offer a menu if they stall: calm · warm · precise · playful · serious · editorial · technical · luxurious · friendly · dense · airy · bold · quiet.
3. **Point at two or three products whose look you admire, and one you don't.** References beat adjectives. Ask what specifically they like (type, density, color, motion).
4. **Any hard constraints?** Existing brand color / logo, a font they already own or love, accessibility requirement (AA vs AAA), must-support dark mode, must match a parent brand.

## Round 2 — only if unresolved

5. **Color temperature and intensity.** Neutral-led with one accent, or color-forward? Warm or cool neutrals? A specific hue family they want for primary?
6. **Type personality.** Serif display (editorial, trust) vs grotesk (product, neutral) vs geometric (friendly, tech) vs mono-heavy (developer tools). Do they want a distinct display face at all, or one family throughout?
7. **Density.** Compact (Linear, data tools: 32px controls, 4px steps) · Standard (40px controls, 8px grid) · Roomy (48px controls, 24px+ padding, consumer/mobile-first).
8. **Shape.** Sharp (0–4px), soft (8–12px), rounded (16–24px), pill-heavy. Show the radius row in the visualizer if they can't decide.

## Infer, don't ask

- If a codebase exists, read it first: existing Tailwind config, CSS vars, fonts in `index.html`, logo SVG colors. Present findings as "I found X, keep it?" not as open questions.
- Platform implies defaults: iOS → 44px targets, SF-compatible fallback stack, 16px margins. Desktop data app → denser scale.
- "Like Linear" implies: cool neutrals, 1 accent, compact density, Inter-class UI font, 6–8px radius, subtle borders, dark-mode-first.
- "Like Stripe" implies: neutral canvas, purple/blue accent used sparingly, generous type scale, soft shadows, 8px radius.
- "Editorial / calm / warm" implies: serif display, warm stone neutrals, larger radius, borders over shadows.

## Turn answers into tokens

| Answer | Token consequence |
| --- | --- |
| Warm | neutral ramp tinted toward yellow/red (stone, sand); shadows tinted with the neutral-950 |
| Cool | neutral ramp tinted toward blue (slate, zinc) |
| Calm / quiet | low-chroma primary, accent used only for 1–2 moments, borders not shadows |
| Bold / playful | saturated primary, larger radius, spring easing, display font with personality |
| Precise / technical | tight tracking, mono for numbers, 4px half-steps allowed, sm radius |
| Editorial | serif display, larger type scale ratio (1.25–1.333), generous measure |
| Compact | control 32/36/40, grid 4 with 8 major, radius 6–8 |
| Roomy | control 40/48/56, card padding 24–32, radius 16–24 |
| AA required | validate.mjs must PASS with no contrast errors in both modes |
