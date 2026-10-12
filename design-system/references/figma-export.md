# Figma export — pushing the finalized system into a Figma file

Run this only after the user says the HTML visualizer is final. It is a multi-call process; never one-shot it.

## 0. Prerequisites
1. Ask for the Figma file URL. If none, load `figma:figma-create-new-file` and create one named `<Project> Design System`.
2. Load `figma:figma-use` (API rules) **and** `figma:figma-generate-library` (what to build in what order). Both are mandatory before any `use_figma` call. Pass `skillNames: "figma-use,figma-generate-library"`.
3. Run `node scripts/figma-payload.mjs <project>/tokens.json`. It writes `figma-payload.json`: collections, ~100–150 variables with mode values / aliases / scopes / code syntax, text styles, and effect styles, already in Plugin-API shapes (colors as 0..1 rgba).
4. Call `get_metadata` on the file to check for existing collections. If a collection with the same name exists, ask: update in place or create versioned (`Semantic v2`)?

## 1. Variables (Phase 1 of figma-generate-library)
Order matters because aliases must point at existing variables.

1. Create collections: `Primitives` (mode `Value`), `Semantic` (modes `Light`, `Dark`), `Layout` (mode `Value`). Rename the default mode rather than adding a second one.
2. Create **Primitives** COLOR variables in batches of ~25 (one ramp per call is a good unit). Names like `color/neutral/50`. Set scopes and `codeSyntax.WEB` from the payload.
3. Create **Primitives** STRING font-family variables.
4. Create **Layout** FLOAT variables (spacing, radius, control heights, container, motion durations).
5. Create **Semantic** COLOR variables. For each mode value that is `{ alias }`, look the target up by name and use `figma.variables.createVariableAlias(target)`; otherwise set the rgba. Batch by ~15.
6. Verify: `get_variable_defs` on the file (or a `use_figma` read returning counts per collection). Counts must match `figma-payload.json.counts`.

✋ Checkpoint: show the user the collection summary before continuing.

## 2. Styles
1. Text styles from `payload.textStyles`: load each font with `figma.loadFontAsync({family, style})` first. If a Google font isn't available in Figma, tell the user and ask for the substitute; do not silently swap. Bind `fontFamily` to the `font/family/*` variable where the API allows (`setBoundVariable` on the style's `fontFamily`).
2. Effect styles from `payload.effectStyles`.

## 3. Foundations page (Phase 2)
Build one `Foundations` page that mirrors `design-system.html` sections, using bound variables everywhere:
- Color: one frame per ramp with swatches (fill bound to the primitive), and a semantic grid with Light/Dark shown side by side by setting `explicitVariableModes` on two sibling frames.
- Type: one text node per style, using the text style.
- Spacing: bars whose width is bound to `spacing/*`.
- Radius: squares with `cornerRadius` bound to `radius/*`.
- Rules: a text block with `tokens.rules`.
Screenshot (`get_screenshot`) and show the user.

✋ Checkpoint.

## 4. Components (Phase 3, optional, one at a time)
Only if the user asks. Order: Button → Input → Badge → Card → Tabs → Dialog. Each is its own page, built with auto-layout, every fill/stroke/radius/gap bound to a variable, variants via `combineAsVariants`. Follow `figma-generate-library` §3 exactly. Screenshot after each.

## 5. Hand-off
Tell the user:
- collection names and counts,
- which fonts were substituted (if any),
- that `tokens.json` remains the source of truth: re-running the export after a token change updates values in place by name.

## Name map (tokens.json → Figma)
| tokens.json | Figma variable | Type | Collection |
| --- | --- | --- | --- |
| color.primitives.neutral.50 | color/neutral/50 | COLOR | Primitives |
| color.semantic.*.background | semantic/background | COLOR (alias) | Semantic (Light/Dark) |
| fonts.display.family | font/family/display | STRING | Primitives |
| spacing.scale.4 | spacing/4 | FLOAT | Layout |
| radius.scale.lg | radius/lg | FLOAT | Layout |
| components.control.height.md | control/height/md | FLOAT | Layout |
| type.scale.h1 | text style `<Project>/h1` | Text style | — |
| elevation.md | effect style `<Project>/shadow/md` | Effect style | — |
