#!/usr/bin/env node
/**
 * figma-payload.mjs — flatten tokens.json into the exact variable/style lists
 * the Figma export phase feeds into use_figma, chunk by chunk.
 *
 * Usage: node figma-payload.mjs <tokens.json> [--out figma-payload.json]
 *
 * Output shape:
 * {
 *   collections: [{ name, modes: [...] }],
 *   variables: [{ collection, name, type: 'COLOR'|'FLOAT'|'STRING', valuesByMode: {mode: value|{alias}}, scopes, codeSyntax }],
 *   textStyles: [{ name, fontFamily, fontStyle, fontSize, lineHeight, letterSpacing, textCase }],
 *   effectStyles: [{ name, effects: [...] }]
 * }
 * Colors are {r,g,b,a} in 0..1 as the Plugin API expects. Aliases reference another
 * variable by name ({ alias: 'color/neutral/50' }) and must be created after their target.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const T = require(path.join(path.dirname(fileURLToPath(import.meta.url)), 'lib/tokens.js'));

const file = process.argv[2];
if (!file) { console.log('usage: node figma-payload.mjs <tokens.json> [--out file]'); process.exit(1); }
const oi = process.argv.indexOf('--out');
const outPath = oi > 0 ? process.argv[oi + 1] : path.join(path.dirname(path.resolve(file)), 'figma-payload.json');
const t = JSON.parse(fs.readFileSync(file, 'utf8'));

function rgba(hex) {
  const m = String(hex).match(/^rgba?\(([^)]+)\)$/i);
  if (m) { const p = m[1].split(',').map((s) => parseFloat(s)); return { r: p[0] / 255, g: p[1] / 255, b: p[2] / 255, a: p[3] == null ? 1 : p[3] }; }
  const c = T.hexToRgb(hex); if (!c) return null;
  return { r: c.r / 255, g: c.g / 255, b: c.b / 255, a: 1 };
}

const collections = [
  { name: 'Primitives', modes: ['Value'] },
  { name: 'Semantic', modes: ['Light', 'Dark'] },
  { name: 'Layout', modes: ['Value'] }
];
const variables = [];
const V = (collection, name, type, valuesByMode, scopes, codeSyntax) => variables.push({ collection, name, type, valuesByMode, scopes, codeSyntax });

/* primitives */
for (const [ramp, steps] of Object.entries(t.color.primitives || {}))
  for (const [s, hex] of Object.entries(steps))
    V('Primitives', `color/${ramp}/${s}`, 'COLOR', { Value: rgba(hex) }, ['ALL_FILLS', 'STROKE_COLOR', 'EFFECT_COLOR'], { WEB: `var(--${ramp}-${s})` });

/* semantic — alias when the source is a {ref}, raw when it is a literal */
const REF = /^\{([a-zA-Z0-9_.-]+)\}$/;
const light = t.color.semantic.light || {}, dark = t.color.semantic.dark || {};
for (const k of Object.keys(light)) {
  const vm = {};
  for (const [mode, src] of [['Light', light[k]], ['Dark', dark[k] ?? light[k]]]) {
    const m = String(src).match(REF);
    if (m && T.resolveRef(t, src) !== src) vm[mode] = { alias: 'color/' + m[1].replace(/\./g, '/') };
    else vm[mode] = rgba(T.resolveRef(t, src));
  }
  const isText = /foreground$/.test(k);
  const scopes = isText ? ['TEXT_FILL', 'SHAPE_FILL'] : (/border|input|ring/.test(k) ? ['STROKE_COLOR'] : ['ALL_FILLS', 'STROKE_COLOR']);
  V('Semantic', `semantic/${k}`, 'COLOR', vm, scopes, { WEB: `var(--${k})` });
}

/* numbers */
for (const [k, v] of Object.entries((t.spacing || {}).scale || {})) V('Layout', `spacing/${k}`, 'FLOAT', { Value: v }, ['GAP', 'WIDTH_HEIGHT'], { WEB: `var(--space-${T.fontKey(k)})` });
for (const [k, v] of Object.entries((t.radius || {}).scale || {})) V('Layout', `radius/${k}`, 'FLOAT', { Value: v }, ['CORNER_RADIUS'], { WEB: `var(--radius-${T.fontKey(k)})` });
const c = t.components || {};
if (c.control) for (const [k, v] of Object.entries(c.control.height || {})) V('Layout', `control/height/${k}`, 'FLOAT', { Value: v }, ['WIDTH_HEIGHT'], { WEB: `var(--control-h-${k})` });
if (c.card) V('Layout', 'card/padding', 'FLOAT', { Value: c.card.padding }, ['GAP'], { WEB: 'var(--card-pad)' });
const lay = t.layout || {};
if (lay.containerMax) V('Layout', 'container/max', 'FLOAT', { Value: lay.containerMax }, ['WIDTH_HEIGHT'], { WEB: 'var(--container-max)' });
if (lay.gutter) V('Layout', 'grid/gutter', 'FLOAT', { Value: lay.gutter }, ['GAP'], { WEB: 'var(--gutter)' });
for (const [k, v] of Object.entries(lay.margin || {})) V('Layout', `grid/margin/${k}`, 'FLOAT', { Value: v }, ['GAP'], { WEB: `var(--margin-${k})` });
for (const [k, v] of Object.entries(((t.motion || {}).duration) || {})) V('Layout', `motion/duration/${k}`, 'FLOAT', { Value: v }, [], { WEB: `var(--duration-${k})` });
for (const [k, f] of Object.entries(t.fonts || {})) V('Primitives', `font/family/${k}`, 'STRING', { Value: f.family }, ['FONT_FAMILY'], { WEB: `var(--font-${k})` });

/* text styles */
const weightName = (w) => ({ 100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' }[w] || 'Regular');
const textStyles = Object.entries((t.type || {}).scale || {}).map(([k, s]) => ({
  name: `${t.meta.name}/${k}`,
  fontFamily: (t.fonts[s.font] || t.fonts.body).family,
  fontStyle: weightName(s.weight),
  fontSize: s.size,
  lineHeight: { unit: 'PIXELS', value: Math.round(s.size * s.lineHeight) },
  letterSpacing: { unit: 'PERCENT', value: (s.tracking || 0) * 100 },
  textCase: s.transform === 'uppercase' ? 'UPPER' : 'ORIGINAL',
  fontVariable: `font/family/${s.font}`
}));

/* effect styles */
function parseShadow(str) {
  if (!str || str === 'none') return [];
  return str.split(/,(?![^(]*\))/).map((s) => s.trim()).map((s) => {
    const m = s.match(/(-?[\d.]+)(?:px)?\s+(-?[\d.]+)(?:px)?\s+(-?[\d.]+)(?:px)?(?:\s+(-?[\d.]+)(?:px)?)?\s+(rgba?\([^)]+\)|#[0-9a-f]{3,8})/i);
    if (!m) return null;
    return { type: 'DROP_SHADOW', offset: { x: +m[1], y: +m[2] }, radius: +m[3], spread: +(m[4] || 0), color: rgba(m[5]), visible: true, blendMode: 'NORMAL' };
  }).filter(Boolean);
}
const effectStyles = Object.entries(t.elevation || {}).filter(([k]) => k !== 'rule').map(([k, v]) => ({ name: `${t.meta.name}/shadow/${k}`, effects: parseShadow(v) }));

const out = { project: t.meta.name, collections, variables, textStyles, effectStyles, counts: { variables: variables.length, textStyles: textStyles.length, effectStyles: effectStyles.length } };
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`wrote ${path.relative(process.cwd(), outPath)}: ${variables.length} variables (${variables.filter((v) => v.collection === 'Primitives').length} primitive, ${variables.filter((v) => v.collection === 'Semantic').length} semantic, ${variables.filter((v) => v.collection === 'Layout').length} layout), ${textStyles.length} text styles, ${effectStyles.length} effect styles`);
