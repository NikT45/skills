# Design rules — the opinions the skill enforces

These are defaults. The user can override any of them; when they do, record the override in `tokens.rules` so DESIGN.md carries it.

## Grid and spacing
- **8px grid.** Every layout distance (margins, gaps, padding on containers) is a multiple of 8. The visualizer's Padding overlay paints green for on-grid, amber for 4px half-steps, red for anything else.
- **4px half-step** only inside compact controls: icon-to-label gaps, chip padding, badge padding, table cell vertical padding.
- **Spacing has roles, not just sizes.** inline (4–8) · control (12–16) · component (16–24) · section (32–48) · page (64–96). Pick by role, then the number follows.
- **Vertical rhythm.** Line heights round so that `size × lineHeight` lands on 4px (body 16 × 1.5 = 24 ✓).

## Radius and inset
- **Nesting rule:** inner radius = outer radius − padding between them, clamped to `radius-xs`. A 24px card with 16px padding has 8px children. This is why the control radius and the card radius must be chosen together.
- **One radius per role:** control, card, sheet/dialog, chip (pill), image. Don't invent per-component radii.
- **Pill (9999) is for chips, avatars, toggles, and optionally buttons.** If buttons are pills, inputs are too.

## Typography
- **Two families max plus mono.** Display carries brand; body carries the product. If in doubt, one family with two weights beats two families badly paired.
- **Display font only at h2 and above.** Below that it's the body font.
- **Five levels per screen.** display/h1 · h3 · body · label · caption. If a screen needs six, the hierarchy is wrong, not the scale.
- **Scale ratio** 1.2 (dense product) · 1.25 (standard) · 1.333 (editorial/marketing). Sizes ≥ 20px round to 4px.
- **Measure** 60–75ch for reading text. Cap with `max-width`, not by shrinking the font.
- **Tracking** tightens as size grows: display −0.02em, h3 −0.01em, body 0, overline +0.08em.
- **Tabular numbers** in any column of figures.

## Color
- **Semantic tokens only in components.** Primitives are for defining semantics and for charts.
- **Neutral does the work.** 90% of any screen is neutral. Primary is for the one action that matters; accent is for brand moments (marketing, empty states, onboarding), not for every highlight.
- **Status colors come with a word or icon.** Never color alone.
- **Contrast:** body text ≥ 4.5:1, large text (≥ 24px or ≥ 19px bold) and UI boundaries ≥ 3:1. Subtle decorative borders may sit below 3:1 as a deliberate choice; input borders should not.
- **Dark mode is a remap, not an inversion.** Background is a 950 neutral, never #000. Surfaces lift with *lighter* neutrals (card 900 on background 950). Primary shifts to a lighter step (400 instead of 600). Soft/tinted backgrounds use 950-level tints of the status hue, not saturated 700s.
- **Shadows carry the neutral hue.** Use `rgba` of neutral-950, not pure black.

## Elevation
- **Borders at rest, shadows on lift.** Cards: border only. Popovers, menus, dialogs, dragged items: shadow. Never both on the same element at rest.
- Three shadow steps are enough: sm (hover lift), md (popover), lg (dialog).

## Motion
- Durations: 120ms for hover/color, 200ms for reveals, 320ms for layout moves. Nothing on UI chrome over 400ms.
- Enter = fade + 4–8px translate with an ease-out. Exit is faster than enter.
- No bounce/spring on UI chrome. Spring is reserved for playful products, and even then for content, not controls.
- Respect `prefers-reduced-motion`.

## Components
- **Shared control height.** Buttons, inputs, selects share sm/md/lg heights so they align in a row. Default md = 40 (36 compact, 48 roomy).
- **Touch targets** ≥ 44px on mobile even when the visual box is 32px (use padding or a pseudo-element).
- **One primary button per view.** Everything else is secondary, outline, or ghost.
- **Focus rings** are visible, 2px, in `--ring`, offset 2px. Never remove them.
- **Labels above inputs**, help text below, error replaces help.

## The three passes (from the visualizer overlays)
1. **Structure pass** (Structure + Grid overlays): every box is a rectangle on the grid; no orphan pixels.
2. **Spacing pass** (Padding + Gaps overlays): every painted region is green or amber; red means a value that isn't in the scale.
3. **Hierarchy pass** (Gray overlay): with color removed, can you still tell what matters? If not, fix size/weight, not color.
