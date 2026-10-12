#!/usr/bin/env node
/**
 * build.mjs — tokens.json → design-system.html + tokens.css + DESIGN.md
 *
 * Usage:  node build.mjs <project-dir> [--tokens tokens.json] [--out <dir>]
 *   project-dir must contain tokens.json (or pass --tokens).
 *   Outputs land in project-dir (or --out).
 *
 * DESIGN.md: generated sections are rewritten every build. Anything between
 *   <!-- CUSTOM:START --> and <!-- CUSTOM:END --> is preserved verbatim.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const T = require(path.join(here, 'lib/tokens.js'));

const args = process.argv.slice(2);
if (!args.length || args.includes('-h') || args.includes('--help')) {
  console.log('usage: node build.mjs <project-dir> [--tokens file] [--out dir]');
  process.exit(args.length ? 0 : 1);
}
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const projectDir = path.resolve(args[0]);
const tokensPath = path.resolve(flag('--tokens') || path.join(projectDir, 'tokens.json'));
const outDir = path.resolve(flag('--out') || projectDir);
fs.mkdirSync(outDir, { recursive: true });

const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
const name = (tokens.meta && tokens.meta.name) || 'Untitled';
const template = fs.readFileSync(path.join(here, '../templates/visualizer.html'), 'utf8');
const lib = fs.readFileSync(path.join(here, 'lib/tokens.js'), 'utf8');

/* ---------- font links ---------- */
const fams = Object.values(tokens.fonts || {}).map((f) => f.google).filter(Boolean);
const fontLinks = fams.length
  ? `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link id="gf-dyn" rel="stylesheet" href="https://fonts.googleapis.com/css2?${fams.map((f) => 'family=' + f).join('&')}&display=swap">`
  : '';

/* ---------- html ---------- */
const css = T.tokensToCSS(tokens);
const html = template
  .replaceAll('@@NAME@@', esc(name))
  .replace('<!-- @@FONT_LINKS@@ -->', fontLinks)
  .replace('/* @@TOKENS_CSS@@ */', css)
  .replace('@@TOKENS_JSON@@', JSON.stringify(tokens).replace(/<\/script/gi, '<\\/script'))
  .replace('/* @@TOKENS_LIB@@ */', lib);
fs.writeFileSync(path.join(outDir, 'design-system.html'), html);
fs.writeFileSync(path.join(outDir, 'tokens.css'), `/* ${name} design tokens — generated from tokens.json. Do not hand-edit. */\n${css}`);

/* ---------- DESIGN.md ---------- */
const mdPath = path.join(outDir, 'DESIGN.md');
let custom = '';
if (fs.existsSync(mdPath)) {
  const m = fs.readFileSync(mdPath, 'utf8').match(/<!-- CUSTOM:START -->([\s\S]*?)<!-- CUSTOM:END -->/);
  if (m) custom = m[1];
}
fs.writeFileSync(mdPath, designMd(tokens, custom));

/* ---------- tailwind snippet ---------- */
fs.writeFileSync(path.join(outDir, 'tailwind.tokens.js'), tailwind(tokens));

console.log(`built ${name}:\n  ${path.relative(process.cwd(), path.join(outDir, 'design-system.html'))}\n  ${path.relative(process.cwd(), path.join(outDir, 'tokens.css'))}\n  ${path.relative(process.cwd(), mdPath)}\n  ${path.relative(process.cwd(), path.join(outDir, 'tailwind.tokens.js'))}`);

/* ================================================================ */
function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function table(head, rows) { return `| ${head.join(' | ')} |\n| ${head.map(() => '---').join(' | ')} |\n` + rows.map((r) => `| ${r.join(' | ')} |`).join('\n') + '\n'; }

function designMd(t, custom) {
  const m = t.meta || {}, f = t.fonts || {}, ty = t.type || {}, sp = t.spacing || {}, rd = t.radius || {}, lay = t.layout || {}, el = t.elevation || {}, mo = t.motion || {}, c = t.components || {};
  const light = T.semantic(t, 'light'), dark = T.semantic(t, 'dark');
  const rawL = (t.color.semantic || {}).light || {}, rawD = (t.color.semantic || {}).dark || {};
  const audit = (mode) => T.contrastPairs(t, mode).map((p) => [p.label, `\`${p.fg}\` on \`${p.bg}\``, p.ratio ? p.ratio.toFixed(2) + ':1' : '—', p.fg === 'border' && p.grade === 'FAIL' ? 'advisory' : p.grade]);

  return `# ${m.name || 'Untitled'} — Design System

> ${m.tagline || ''}
>
> Version ${m.version || '0.0.0'} · ${m.createdAt || ''} · Source of truth: \`tokens.json\`. Regenerate this file with the design-system skill; do not hand-edit generated sections.

## 1. Identity

- **Platforms:** ${(m.platform || []).join(', ') || '—'}
- **Vibe:** ${(m.vibe || []).join(', ') || '—'}
- **References:** ${(m.references || []).join('; ') || '—'}
- **Not this:** ${(m.antiReferences || []).join('; ') || '—'}

<!-- CUSTOM:START -->${custom || `
### Rationale

_Written by the agent during the design session. Why these fonts, why this palette, what the product should feel like on first open. Preserved across rebuilds._
`}<!-- CUSTOM:END -->

## 2. Typography

${table(['Role', 'Family', 'Fallback', 'Weights', 'Use'], Object.entries(f).map(([k, v]) => [`\`${k}\``, v.family, v.fallback || '', (v.weights || []).join(', '), v.role || '']))}
**Scale** — ratio ${ty.scaleRatio}, base ${ty.baseSize}px. Sizes ≥ 20px round to 4px.

${table(['Token', 'Font', 'Size', 'Line height', 'Weight', 'Tracking', 'CSS'], Object.entries(ty.scale || {}).map(([k, v]) => [`\`${k}\``, v.font, `${v.size}px`, `${v.lineHeight} (${Math.round(v.size * v.lineHeight)}px)`, v.weight, `${v.tracking || 0}em${v.transform ? ' · ' + v.transform : ''}`, `\`.t-${T.fontKey(k)}\``]))}
Rules: display font only at \`h2\` and above. Max five text levels on any one screen. Reading text capped at ${(lay.safeArea || {}).readingMeasure || 68}ch.

## 3. Color

Components use **semantic tokens only**. Primitives exist to define semantics and for charts.

### Semantic tokens

${table(['Token', 'Light', 'Dark', 'Use'], Object.keys(rawL).map((k) => [`\`--${k}\``, `${rawL[k]} → \`${light[k]}\``, `${rawD[k] || '—'} → \`${dark[k] || '—'}\``, semanticUse(k)]))}
### Contrast audit (light)

${table(['Use', 'Pair', 'Ratio', 'Grade'], audit('light'))}
### Contrast audit (dark)

${table(['Use', 'Pair', 'Ratio', 'Grade'], audit('dark'))}
### Primitives

${Object.entries(t.color.primitives || {}).map(([ramp, steps]) => `**${ramp}:** ` + Object.entries(steps).map(([s, h]) => `${s} \`${h}\``).join(' · ')).join('\n\n')}

## 4. Spacing & Layout

- **Grid:** ${sp.grid}px. Half-step ${sp.halfStep || sp.grid / 2}px allowed only inside compact controls.
- **Scale:** ${Object.entries(sp.scale || {}).map(([k, v]) => `\`${k}\`=${v}`).join(', ')}
${Object.entries(sp.roles || {}).map(([k, v]) => `- **${k}:** ${v}`).join('\n')}
- **Container:** ${lay.containerMax}px max, ${lay.columns} columns, ${lay.gutter}px gutter.
- **Page margins:** ${Object.entries(lay.margin || {}).map(([k, v]) => `${k} ${v}px`).join(' · ')}
- **Breakpoints:** ${Object.entries(lay.breakpoints || {}).map(([k, v]) => `${k} ≥ ${v}px`).join(' · ')}
- **Touch target:** ${(lay.safeArea || {}).touchTarget || 44}px minimum.

## 5. Radius & Inset

${table(['Token', 'Value'], Object.entries(rd.scale || {}).map(([k, v]) => [`\`radius-${k}\``, v === 9999 ? 'pill' : `${v}px`]))}
**Nesting rule:** ${rd.nesting || 'inner = outer − padding'}

**Defaults:** ${Object.entries(rd.defaults || {}).map(([k, v]) => `${k} → \`${v}\` (${(rd.scale || {})[v]}px)`).join(' · ')}

## 6. Elevation & Motion

${table(['Token', 'Value'], Object.entries(el).filter(([k]) => k !== 'rule').map(([k, v]) => [`\`shadow-${k}\``, `\`${v}\``]))}
${el.rule ? `> ${el.rule}\n` : ''}
**Durations:** ${Object.entries(mo.duration || {}).map(([k, v]) => `${k} ${v}ms`).join(' · ')}

**Easing:** ${Object.entries(mo.easing || {}).map(([k, v]) => `${k} \`${v}\``).join(' · ')}

${mo.rule ? `> ${mo.rule}\n` : ''}
## 7. Component specs

${c.control ? `- **Controls (button/input/select):** heights ${Object.entries(c.control.height).map(([k, v]) => `${k} ${v}px`).join(' / ')}; horizontal padding ${Object.entries(c.control.paddingX || {}).map(([k, v]) => `${k} ${v}px`).join(' / ')}; radius \`${c.control.radius}\`; icon-to-label gap ${c.control.gap}px; icon ${Object.entries(c.control.iconSize || {}).map(([k, v]) => `${k} ${v}px`).join(' / ')}.` : ''}
${c.input ? `- **Input:** ${c.input.height}px tall, ${c.input.paddingX}px side padding, ${c.input.borderWidth}px \`--input\` border, focus ring ${c.input.focusRing}px \`--ring\`. Label above (\`label\` style), help below (\`caption\`), error replaces help in \`--destructive\`.` : ''}
${c.card ? `- **Card:** ${c.card.padding}px padding, radius \`${c.card.radius}\`, ${c.card.border ? '1px `--border`' : 'no border'}, shadow \`${c.card.shadow}\`. Children inherit nested radius.` : ''}
${c.badge ? `- **Badge:** ${c.badge.height}px, ${c.badge.paddingX}px padding, radius \`${c.badge.radius}\`, text \`${c.badge.textStyle}\` 600. Status badges pair color with a dot or word.` : ''}
${c.dialog ? `- **Dialog:** max ${c.dialog.maxWidth}px, ${c.dialog.padding}px padding, radius \`${c.dialog.radius}\`, \`shadow-lg\`, \`--overlay\` scrim.` : ''}
${c.avatar ? `- **Avatar:** ${Object.entries(c.avatar.size).map(([k, v]) => `${k} ${v}px`).join(' / ')}, radius \`${c.avatar.radius}\`.` : ''}
- **Button variants:** primary, secondary, outline, ghost, destructive, accent, link. One primary per view.
- **Tabs:** segmented (inside cards) and underline (page sections).
- **Menu / popover:** \`--popover\` surface, 1px border, \`shadow-md\`, 4px inner padding, 32px rows.

## 8. Rules

${(t.rules || []).map((r, i) => `${i + 1}. ${r}`).join('\n')}

## 9. Implementation

- Import \`tokens.css\` once at the root. Toggle dark mode with \`<html data-theme="dark">\`.
- Tailwind: merge \`tailwind.tokens.js\` into \`theme.extend\`.
- Never write a raw hex, px radius, or shadow in component code. If a value is missing, add a token first.
- Preview and audit: open \`design-system.html\`. Press **P** for the padding audit, **G** for the grid, **H** for grayscale hierarchy check.
`;
}

function semanticUse(k) {
  const map = {
    background: 'Page canvas', foreground: 'Default text', card: 'Raised content surface', 'card-foreground': 'Text on cards', popover: 'Menus, tooltips, dropdowns', 'popover-foreground': 'Text in popovers',
    primary: 'Primary actions, active states', 'primary-foreground': 'Text on primary', 'primary-hover': 'Primary hover', secondary: 'Secondary buttons, subtle fills', 'secondary-foreground': 'Text on secondary', 'secondary-hover': 'Secondary hover',
    muted: 'Disabled fills, table headers', 'muted-foreground': 'Secondary text, placeholders', accent: 'Brand highlights, marketing CTAs', 'accent-foreground': 'Text on accent', 'accent-soft': 'Accent tints',
    destructive: 'Delete, errors', 'destructive-foreground': 'Text on destructive', 'destructive-soft': 'Error tints', success: 'Positive status', 'success-soft': 'Positive tints', warning: 'Caution status', 'warning-soft': 'Caution tints', info: 'Informational', 'info-soft': 'Info tints',
    border: 'Dividers, card edges', 'border-strong': 'Emphasised borders, outlines', input: 'Form control borders', ring: 'Focus ring', overlay: 'Dialog scrim'
  };
  return map[k] || '';
}

function tailwind(t) {
  const sem = Object.keys((t.color.semantic || {}).light || {});
  const colors = {};
  for (const k of sem) { const [base, ...rest] = k.split('-'); if (!rest.length) colors[base] = colors[base] || {}; }
  const semObj = {};
  for (const k of sem) {
    const parts = k.split('-');
    if (parts.length === 1) { semObj[k] = typeof semObj[k] === 'object' ? { ...semObj[k], DEFAULT: `var(--${k})` } : `var(--${k})`; }
    else { const base = parts[0], sub = parts.slice(1).join('-'); if (typeof semObj[base] === 'string') semObj[base] = { DEFAULT: semObj[base] }; semObj[base] = semObj[base] || {}; semObj[base][sub] = `var(--${k})`; }
  }
  const prims = {};
  for (const [ramp, steps] of Object.entries(t.color.primitives || {})) { prims[ramp] = {}; for (const s of Object.keys(steps)) prims[ramp][s] = `var(--${ramp}-${s})`; }
  const font = {};
  for (const k of Object.keys(t.fonts || {})) font[k] = [`var(--font-${k})`];
  const radius = {};
  for (const k of Object.keys((t.radius || {}).scale || {})) radius[k === 'none' ? 'none' : k] = `var(--radius-${T.fontKey(k)})`;
  const spacing = {};
  for (const k of Object.keys((t.spacing || {}).scale || {})) spacing[k] = `var(--space-${T.fontKey(k)})`;
  const shadow = {};
  for (const k of Object.keys(t.elevation || {})) if (k !== 'rule') shadow[k] = `var(--shadow-${k})`;
  const fontSize = {};
  for (const [k, v] of Object.entries((t.type || {}).scale || {})) fontSize[k] = [`var(--text-${T.fontKey(k)})`, { lineHeight: `var(--leading-${T.fontKey(k)})`, letterSpacing: `var(--tracking-${T.fontKey(k)})`, fontWeight: `var(--weight-${T.fontKey(k)})` }];
  const out = { colors: { ...semObj, ...prims }, fontFamily: font, borderRadius: radius, spacing, boxShadow: shadow, fontSize };
  return `// ${t.meta.name} — Tailwind theme.extend, generated from tokens.json. Requires tokens.css to be loaded.\nmodule.exports = ${JSON.stringify(out, null, 2)};\n`;
}
