/* tokens.js — shared between build.mjs (Node) and the visualizer (browser).
   Pure functions only. No imports. Exposed on globalThis.DSTokens in the browser,
   module.exports in Node. */
(function (root) {
  'use strict';

  const REF = /^\{([a-zA-Z0-9_.-]+)\}$/;

  function getPath(obj, path) {
    return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  }

  /** Resolve "{neutral.50}" against color.primitives, then whole token tree. Recursive. */
  function resolveRef(tokens, value, depth) {
    depth = depth || 0;
    if (typeof value !== 'string' || depth > 8) return value;
    const m = value.match(REF);
    if (!m) return value;
    const p = m[1];
    let v = getPath(tokens.color && tokens.color.primitives, p);
    if (v === undefined) v = getPath(tokens, p);
    if (v === undefined) return value; // leave unresolved so validate can flag it
    return resolveRef(tokens, v, depth + 1);
  }

  function semantic(tokens, mode) {
    const src = (tokens.color && tokens.color.semantic && tokens.color.semantic[mode]) || {};
    const out = {};
    for (const k of Object.keys(src)) out[k] = resolveRef(tokens, src[k]);
    return out;
  }

  function fontStack(f) {
    if (!f) return 'inherit';
    const fam = /[\s]/.test(f.family) ? `'${f.family}'` : f.family;
    return f.fallback ? `${fam}, ${f.fallback}` : fam;
  }

  function fontKey(k) { return k.replace(/[^a-zA-Z0-9]+/g, '-'); }

  /** Emit CSS custom properties. Light semantic on :root, dark under [data-theme="dark"]. */
  function tokensToCSS(tokens) {
    const L = [];
    const push = (k, v) => L.push(`  --${k}: ${v};`);

    // Fonts
    for (const [k, f] of Object.entries(tokens.fonts || {})) push(`font-${k}`, fontStack(f));

    // Type scale
    for (const [k, t] of Object.entries((tokens.type && tokens.type.scale) || {})) {
      const key = fontKey(k);
      push(`text-${key}`, `${t.size}px`);
      push(`leading-${key}`, t.lineHeight);
      push(`weight-${key}`, t.weight);
      push(`tracking-${key}`, `${t.tracking || 0}em`);
      push(`face-${key}`, `var(--font-${t.font || 'body'})`);
    }
    if (tokens.type) push('text-base', `${tokens.type.baseSize || 16}px`);

    // Primitives
    for (const [ramp, steps] of Object.entries((tokens.color && tokens.color.primitives) || {}))
      for (const [step, hex] of Object.entries(steps)) push(`${ramp}-${step}`, hex);

    // Spacing
    push('grid', `${(tokens.spacing && tokens.spacing.grid) || 8}px`);
    for (const [k, v] of Object.entries((tokens.spacing && tokens.spacing.scale) || {}))
      push(`space-${fontKey(k)}`, `${v}px`);

    // Radius
    for (const [k, v] of Object.entries((tokens.radius && tokens.radius.scale) || {}))
      push(`radius-${fontKey(k)}`, `${v}px`);
    const rd = (tokens.radius && tokens.radius.defaults) || {};
    for (const [k, v] of Object.entries(rd)) push(`radius-${k}`, `var(--radius-${fontKey(v)})`);

    // Layout
    const lay = tokens.layout || {};
    if (lay.containerMax) push('container-max', `${lay.containerMax}px`);
    if (lay.gutter) push('gutter', `${lay.gutter}px`);
    for (const [k, v] of Object.entries(lay.margin || {})) push(`margin-${k}`, `${v}px`);
    if (lay.safeArea && lay.safeArea.touchTarget) push('touch-target', `${lay.safeArea.touchTarget}px`);
    if (lay.safeArea && lay.safeArea.readingMeasure) push('measure', `${lay.safeArea.readingMeasure}ch`);

    // Elevation
    for (const [k, v] of Object.entries(tokens.elevation || {})) if (k !== 'rule') push(`shadow-${k}`, v);

    // Motion
    const mo = tokens.motion || {};
    for (const [k, v] of Object.entries(mo.duration || {})) push(`duration-${k}`, `${v}ms`);
    for (const [k, v] of Object.entries(mo.easing || {})) push(`ease-${k}`, v);

    // Components
    const c = tokens.components || {};
    if (c.control) {
      for (const [k, v] of Object.entries(c.control.height || {})) push(`control-h-${k}`, `${v}px`);
      for (const [k, v] of Object.entries(c.control.paddingX || {})) push(`control-px-${k}`, `${v}px`);
      for (const [k, v] of Object.entries(c.control.iconSize || {})) push(`control-icon-${k}`, `${v}px`);
      if (c.control.gap != null) push('control-gap', `${c.control.gap}px`);
      if (c.control.radius) push('control-radius', `var(--radius-${fontKey(c.control.radius)})`);
    }
    if (c.card) {
      push('card-pad', `${c.card.padding}px`);
      push('card-radius', `var(--radius-${fontKey(c.card.radius)})`);
    }
    if (c.input) {
      push('input-h', `${c.input.height}px`);
      push('input-px', `${c.input.paddingX}px`);
      push('input-radius', `var(--radius-${fontKey(c.input.radius)})`);
      push('focus-ring', `${c.input.focusRing || 2}px`);
    }
    if (c.badge) { push('badge-h', `${c.badge.height}px`); push('badge-px', `${c.badge.paddingX}px`); push('badge-radius', `var(--radius-${fontKey(c.badge.radius)})`); }
    if (c.dialog) { push('dialog-max', `${c.dialog.maxWidth}px`); push('dialog-pad', `${c.dialog.padding}px`); push('dialog-radius', `var(--radius-${fontKey(c.dialog.radius)})`); }
    if (c.avatar) for (const [k, v] of Object.entries(c.avatar.size || {})) push(`avatar-${k}`, `${v}px`);

    // Semantic (light default)
    const light = semantic(tokens, 'light');
    const dark = semantic(tokens, 'dark');
    const sem = (o) => Object.entries(o).map(([k, v]) => `  --${k}: ${v};`).join('\n');

    return [
      ':root {',
      L.join('\n'),
      sem(light),
      '  color-scheme: light;',
      '}',
      '',
      '[data-theme="dark"] {',
      sem(dark),
      '  color-scheme: dark;',
      '}',
      ''
    ].join('\n');
  }

  /* ---------- color math ---------- */
  function hexToRgb(hex) {
    if (typeof hex !== 'string') return null;
    let h = hex.trim();
    const rgba = h.match(/^rgba?\(([^)]+)\)$/i);
    if (rgba) { const p = rgba[1].split(',').map(Number); return { r: p[0], g: p[1], b: p[2] }; }
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    const n = parseInt(h.slice(0, 6), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
  }
  function luminance(hex) {
    const c = hexToRgb(hex);
    if (!c) return null;
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }
  function contrast(a, b) {
    const la = luminance(a), lb = luminance(b);
    if (la == null || lb == null) return null;
    const [hi, lo] = la > lb ? [la, lb] : [lb, la];
    return (hi + 0.05) / (lo + 0.05);
  }
  function wcag(ratio, large) {
    if (ratio == null) return '—';
    if (ratio >= 7) return 'AAA';
    if (ratio >= 4.5) return 'AA';
    if (ratio >= 3) return large ? 'AA' : 'AA-lg';
    return 'FAIL';
  }

  /** Pairs to audit: [fg, bg, label, isLargeOnly] */
  function contrastPairs(tokens, mode) {
    const s = semantic(tokens, mode);
    const P = [
      ['foreground', 'background', 'Body text on page'],
      ['muted-foreground', 'background', 'Muted text on page'],
      ['card-foreground', 'card', 'Text on card'],
      ['muted-foreground', 'card', 'Muted text on card'],
      ['primary-foreground', 'primary', 'Primary button label'],
      ['secondary-foreground', 'secondary', 'Secondary button label'],
      ['accent-foreground', 'accent', 'Accent label'],
      ['destructive-foreground', 'destructive', 'Destructive button label'],
      ['primary', 'background', 'Primary as text/link', true],
      ['destructive', 'background', 'Error text', true],
      ['border', 'background', 'Border vs page (3:1 for UI)', true],
      ['input', 'background', 'Input border vs page', true],
      ['ring', 'background', 'Focus ring vs page', true]
    ];
    return P.filter(([f, b]) => s[f] && s[b]).map(([f, b, label, large]) => {
      const r = contrast(s[f], s[b]);
      return { fg: f, bg: b, fgHex: s[f], bgHex: s[b], label, large: !!large, ratio: r, grade: wcag(r, large) };
    });
  }

  const api = { resolveRef, semantic, fontStack, fontKey, tokensToCSS, hexToRgb, rgbToHex, luminance, contrast, wcag, contrastPairs };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DSTokens = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
