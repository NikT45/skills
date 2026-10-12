# tokens.json — schema

The single source of truth. Everything else (`design-system.html`, `tokens.css`, `DESIGN.md`, `tailwind.tokens.js`, `figma-payload.json`) is generated from it. See `templates/tokens.example.json` for a complete instance.

```
meta        { name, tagline, version, createdAt (YYYY-MM-DD), platform[], vibe[], references[], antiReferences[] }
fonts       { display, body, [mono] }   each: { family, fallback, google (Google Fonts css2 family spec), weights[], role }
type        { baseSize, scaleRatio, scale: { <name>: { font: display|body|mono, size(px), lineHeight(unitless), weight, tracking(em), [transform] } } }
            Required names: display h1 h2 h3 h4 body-lg body body-sm label caption overline code
color       primitives: { <ramp>: { <step>: hex } }   ramps: neutral (0..950), brand, accent, danger, warning, success, info
            semantic: { light: {...}, dark: {...} }   values are "{ramp.step}" refs or literal hex/rgba
            Required semantic keys (shadcn baseline):
              background foreground card card-foreground popover popover-foreground
              primary primary-foreground secondary secondary-foreground muted muted-foreground
              accent accent-foreground destructive destructive-foreground border input ring
            Recommended extras: primary-hover secondary-hover accent-soft destructive-soft
              success success-soft warning warning-soft info info-soft border-strong overlay
spacing     { grid, halfStep, scale: { "0":0, "1":4, "2":8, ... }, roles: { inline, control, component, section, page } }
radius      { scale: { none xs sm md lg xl 2xl full }, nesting (string), defaults: { control, card, sheet, chip, image } }
layout      { grid, containerMax, columns, gutter, margin: { mobile, tablet, desktop }, safeArea: { touchTarget, readingMeasure }, breakpoints: { sm, md, lg, xl } }
elevation   { none, sm, md, lg (CSS box-shadow strings), rule }
motion      { duration: { instant fast base slow slower } (ms), easing: { standard enter exit spring }, rule }
components  { control: { height{sm,md,lg}, paddingX{sm,md,lg}, radius, gap, iconSize{sm,md,lg} },
              card: { padding, radius, border, shadow }, input: { height, paddingX, radius, borderWidth, focusRing },
              badge: { height, paddingX, radius, textStyle }, dialog: { maxWidth, padding, radius }, avatar: { size{sm,md,lg}, radius } }
rules       [ string, ... ]   the opinions, in the user's words where possible. 8–12 is the sweet spot.
```

## Generated CSS variable names
`--font-{role}` · `--text-{style}` `--leading-{style}` `--weight-{style}` `--tracking-{style}` `--face-{style}` · `--{ramp}-{step}` · `--{semantic}` · `--space-{key}` · `--radius-{key}` · `--radius-{role}` · `--shadow-{key}` · `--duration-{key}` · `--ease-{key}` · `--control-h-{size}` `--control-px-{size}` `--control-radius` `--card-pad` `--card-radius` `--input-h` `--input-px` `--input-radius` `--focus-ring` `--badge-*` `--dialog-*` `--avatar-*` · `--container-max` `--gutter` `--margin-{bp}` `--touch-target` `--measure` `--grid`

Utility classes in the visualizer: `.t-{style}` for every type style, `.btn .btn-{variant} .btn-{size}`, `.input`, `.card`, `.badge .badge-{variant}`, `.alert .alert-{kind}`, `.tabs`, `.menu`, `.dialog`, `.toast`, `.table`, `.avatar`.

## Conventions
- Hex uppercase, 6 digits. `rgba()` only for overlay/scrim.
- Semantic values should be refs (`{neutral.50}`), so Figma gets aliases. Literal hex is allowed but loses the link.
- Every light key must exist in dark. `validate.mjs` enforces this.
- Add a key, never rename one, once a project has shipped code against it.
