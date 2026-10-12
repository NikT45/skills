#!/usr/bin/env node
/**
 * validate.mjs — lint a tokens.json before building.
 * Usage: node validate.mjs <tokens.json>
 * Exit 1 on errors, 0 on warnings-only. Prints a checklist.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const T = require(path.join(path.dirname(fileURLToPath(import.meta.url)), 'lib/tokens.js'));

const file = process.argv[2];
if (!file) { console.log('usage: node validate.mjs <tokens.json>'); process.exit(1); }
const t = JSON.parse(fs.readFileSync(file, 'utf8'));
const errors = [], warns = [], ok = [];
const E = (m) => errors.push(m), W = (m) => warns.push(m), K = (m) => ok.push(m);

/* required structure */
for (const k of ['meta', 'fonts', 'type', 'color', 'spacing', 'radius', 'layout', 'elevation', 'motion', 'components', 'rules']) if (!t[k]) E(`missing top-level "${k}"`);
if (t.meta && !t.meta.name) E('meta.name is required');
for (const k of ['display', 'body']) if (!t.fonts || !t.fonts[k]) E(`fonts.${k} is required (two-font rule)`);
if (t.fonts && Object.keys(t.fonts).length > 3) W(`${Object.keys(t.fonts).length} font families. Two plus mono is the ceiling.`);

/* semantic completeness + unresolved refs */
const REQ = ['background', 'foreground', 'card', 'card-foreground', 'popover', 'popover-foreground', 'primary', 'primary-foreground', 'secondary', 'secondary-foreground', 'muted', 'muted-foreground', 'accent', 'accent-foreground', 'destructive', 'destructive-foreground', 'border', 'input', 'ring'];
for (const mode of ['light', 'dark']) {
  const raw = ((t.color || {}).semantic || {})[mode];
  if (!raw) { E(`color.semantic.${mode} missing`); continue; }
  for (const k of REQ) if (!(k in raw)) E(`semantic.${mode}.${k} missing (shadcn baseline)`);
  for (const [k, v] of Object.entries(raw)) { const r = T.resolveRef(t, v); if (/^\{/.test(r)) E(`semantic.${mode}.${k} = ${v} does not resolve`); else if (!/^(#[0-9a-f]{6}|#[0-9a-f]{3}|rgba?\()/i.test(r)) W(`semantic.${mode}.${k} = ${r} is not hex/rgb`); }
  const lk = Object.keys(((t.color || {}).semantic || {}).light || {}), dk = Object.keys(raw);
  if (mode === 'dark') for (const k of lk) if (!dk.includes(k)) E(`semantic.dark.${k} missing (defined in light)`);
  /* contrast */
  for (const p of T.contrastPairs(t, mode)) {
    const need = p.large ? 3 : 4.5;
    if (p.ratio == null) continue;
    if (p.ratio < need) { if (p.fg === 'border' || p.fg === 'input') W(`${mode}: ${p.label} ${p.ratio.toFixed(2)}:1 (advisory, subtle borders are a choice)`); else E(`${mode}: ${p.label} ${p.ratio.toFixed(2)}:1 < ${need}:1`); }
  }
  K(`${mode}: ${REQ.length} baseline semantic tokens present`);
  const s = T.semantic(t, mode);
  if (mode === 'dark' && s.background && /^#000000$/i.test(s.background)) W('dark background is pure #000; lift it to a 950 neutral');
}

/* grid */
const grid = (t.spacing || {}).grid || 8, half = (t.spacing || {}).halfStep || grid / 2;
for (const [k, v] of Object.entries((t.spacing || {}).scale || {})) if (v % half) E(`spacing.scale.${k}=${v} is not a multiple of ${half}`);
for (const [k, v] of Object.entries((t.radius || {}).scale || {})) if (v < 999 && v % 2) W(`radius.${k}=${v} is odd; prefer 4px steps`);
const c = t.components || {};
const check = (label, v) => { if (typeof v === 'number' && v % 4) W(`${label}=${v} is off the 4px grid`); };
if (c.control) { for (const [k, v] of Object.entries(c.control.height || {})) check(`control.height.${k}`, v); for (const [k, v] of Object.entries(c.control.paddingX || {})) check(`control.paddingX.${k}`, v); }
if (c.card) check('card.padding', c.card.padding);
if (c.input) check('input.height', c.input.height);
if (c.dialog) check('dialog.padding', c.dialog.padding);
K(`spacing scale on ${grid}px grid (${half}px half-step)`);

/* radius nesting sanity */
if (t.radius && t.radius.scale && t.radius.defaults && c.card) {
  const outer = t.radius.scale[t.radius.defaults.card], pad = c.card.padding;
  const inner = outer - pad;
  if (inner < (t.radius.scale.xs || 4)) W(`card radius ${outer}px − padding ${pad}px = ${inner}px; children clamp to xs. Fine if intentional.`);
  else K(`card nesting: ${outer} − ${pad} = ${inner}px inner radius`);
}

/* type */
const sc = ((t.type || {}).scale) || {};
for (const [k, v] of Object.entries(sc)) { if (v.size >= 20 && v.size % 4) W(`type.${k}.size=${v.size} not on 4px`); if (!t.fonts || !t.fonts[v.font]) E(`type.${k}.font="${v.font}" is not a defined font`); }
const levels = Object.keys(sc).length; if (levels > 14) W(`${levels} type levels; consider trimming`);
for (const [k, v] of Object.entries(sc)) if (v.font === 'display' && ['h3', 'h4', 'body', 'body-sm', 'caption', 'label'].includes(k)) W(`type.${k} uses the display font; keep display at h2 and above`);
K(`${levels} type levels defined`);

/* touch */
if (t.layout && t.layout.safeArea && t.layout.safeArea.touchTarget < 44) W('touchTarget < 44px');
if ((t.rules || []).length < 5) W('fewer than 5 rules; the system needs opinions');

/* report */
const pad = (a) => a.map((m) => '  ' + m).join('\n');
console.log(`\n${t.meta ? t.meta.name : 'tokens'} — validate\n`);
if (ok.length) console.log(`✓ ok\n${pad(ok)}\n`);
if (warns.length) console.log(`⚠ warnings (${warns.length})\n${pad(warns)}\n`);
if (errors.length) console.log(`✗ errors (${errors.length})\n${pad(errors)}\n`);
console.log(errors.length ? 'FAIL' : 'PASS');
process.exit(errors.length ? 1 : 0);
