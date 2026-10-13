#!/usr/bin/env node
/**
 * Reads an SVG the person already has, for a figure built from it:
 *
 *   node <skill folder>/read.mjs <file.svg> [--name <name>]
 *
 * It writes, in the working directory, hairline-<name>-source.png, the SVG
 * drawn at 400 × 400 on white, and hairline-<name>-source.txt, the card: the
 * viewBox, the title and ids, the ink's box, and one line per painted shape
 * with its type, group, box, centre, fill or stroke, and its relation to the
 * shape it sits in or touches. source.md says how to read it. The boxes come
 * from the browser look.mjs installs; without one the card is reduced to what
 * the XML says, and no picture is written. The SVG gives the identity, not
 * the paths: nothing here is traced.
 */
import { basename } from "node:path";

/** The card lists this many shapes at most; the rest are counted on its last line. */
const LISTED = 24;
/** A shape smaller than this share of the ink's box, both ways, is counted, not listed. */
const SMALL = 0.02;
/** Boxes this close, as a share of the ink's size, touch; a mirror matches within it too. */
const NEAR = 0.05;

const SHAPES = ["path", "rect", "circle", "ellipse", "line", "polyline", "polygon"];
const UNREAD = ["text", "image", "foreignObject"];
/** Elements whose children are not painted where they stand. */
const HIDDEN = ["defs", "symbol", "clipPath", "mask", "pattern", "marker"];

/** A name build.mjs accepts: --name, else the file's, lowercased, runs of anything else as one hyphen, a digit first prefixed with x. */
export function nameFor(file, given = null) {
  const raw = (given ?? basename(file).replace(/\.svg$/i, "")).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return /^[a-z]/.test(raw) ? raw : `x${raw}`;
}

/** The tags of an SVG in order, with their attributes; comments, CDATA and declarations skipped. Enough to count, never to draw. */
function tags(xml) {
  const out = [];
  const re = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<[?!][\s\S]*?>|<\/([\w:.-]+)\s*>|<([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/g;
  for (let m; (m = re.exec(xml));) {
    if (m[1]) out.push({ close: m[1] });
    else if (m[2]) {
      const attrs = {};
      for (const a of m[3].matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) attrs[a[1]] = a[2] ?? a[3];
      out.push({ open: m[2], attrs, self: !!m[4] });
    }
  }
  return out;
}

/** A length attribute as a number, units dropped; null when it is not one. */
const len = (v) => (v === undefined ? null : Number.isFinite(parseFloat(v)) ? parseFloat(v) : null);

/** What the XML alone says of the SVG. An object with `error` when it cannot be read as one. */
export function scan(xml, fileName) {
  const list = tags(xml);
  const root = list.find((t) => t.open === "svg");
  if (!root) return { error: `${fileName} is not an SVG: no <svg> root` };
  let viewBox = (root.attrs.viewBox ?? "").trim().split(/[\s,]+/).map(Number);
  let synthesised = false;
  if (viewBox.length !== 4 || !viewBox.every(Number.isFinite) || !(viewBox[2] > 0 && viewBox[3] > 0)) {
    const w = len(root.attrs.width), h = len(root.attrs.height);
    if (!(w > 0) || !(h > 0)) return { error: `${fileName} has no viewBox and no width and height: the card cannot be measured` };
    viewBox = [0, 0, w, h];
    synthesised = true;
  }
  const ids = [], counts = {}, notRead = {}, open = [];
  let groups = 0;
  const title = /<title[^>]*>([\s\S]*?)<\/title>/.exec(xml)?.[1].trim() || null;
  for (const t of list) {
    if (t.close) { open.pop(); continue; }
    if (t.attrs.id) ids.push(t.attrs.id);
    const hidden = open.some((o) => HIDDEN.includes(o)) || HIDDEN.includes(t.open);
    if (!t.self) open.push(t.open);
    if (hidden) continue;
    if (t.open === "g") groups++;
    else if (SHAPES.includes(t.open)) counts[t.open] = (counts[t.open] ?? 0) + 1;
    else if (UNREAD.includes(t.open)) notRead[t.open] = (notRead[t.open] ?? 0) + 1;
    else if (t.open === "use" && !(t.attrs.href ?? t.attrs["xlink:href"] ?? "").startsWith("#")) notRead.use = (notRead.use ?? 0) + 1;
  }
  return { file: fileName, viewBox, synthesised, title, ids, groups, counts, notRead };
}

const r1 = (v) => Math.round(v * 10) / 10;
const span = (b) => `${r1(b.x)}..${r1(b.x + b.w)} × ${r1(b.y)}..${r1(b.y + b.h)}`;
const centre = (b) => [b.x + b.w / 2, b.y + b.h / 2];
const area = (b) => b.w * b.h;
const inside = (a, b) => a.x >= b.x - 1e-6 && a.y >= b.y - 1e-6 && a.x + a.w <= b.x + b.w + 1e-6 && a.y + a.h <= b.y + b.h + 1e-6 && area(a) < area(b);

/** One relation per shape, read from the boxes: inside the largest shape that holds it; else the mirror of an earlier shape; else touching the largest it touches; else nothing. */
export function relate(shapes, ink) {
  const near = NEAR * Math.max(ink.w, ink.h);
  const gap = (a, b) => Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w), 0) + Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h), 0);
  const side = (a, b) => {
    const [ax, ay] = centre(a), [bx, by] = centre(b);
    return Math.abs(ax - bx) * b.h >= Math.abs(ay - by) * b.w ? (ax < bx ? "left of" : "right of") : (ay < by ? "above" : "below");
  };
  const third = (a, b) => { const k = (centre(a)[1] - b.y) / b.h; return k < 1 / 3 ? "upper third" : k > 2 / 3 ? "lower third" : "middle"; };
  const axis = ink.x + ink.w / 2;
  return shapes.map((s) => {
    const others = shapes.filter((o) => o !== s);
    const holder = others.filter((o) => inside(s.box, o.box)).sort((a, b) => area(b.box) - area(a.box))[0];
    if (holder) return `inside #${holder.i}, ${third(s.box, holder.box)}`;
    const mirror = others.find((o) => o.i < s.i && Math.abs(o.box.w - s.box.w) <= near && Math.abs(o.box.h - s.box.h) <= near
      && Math.abs(o.box.y - s.box.y) <= near && Math.abs(axis - centre(o.box)[0] - (centre(s.box)[0] - axis)) <= near
      && Math.abs(centre(s.box)[0] - axis) > near);
    if (mirror) return `mirror of #${mirror.i}`;
    const touched = others.filter((o) => area(o.box) > area(s.box) && gap(s.box, o.box) <= near).sort((a, b) => area(b.box) - area(a.box))[0];
    if (touched) return `${side(s.box, touched.box)} #${touched.i}, touching`;
    return "";
  });
}

/** The box round a list of boxes. */
const union = (boxes) => {
  const x0 = Math.min(...boxes.map((b) => b.x)), y0 = Math.min(...boxes.map((b) => b.y));
  return { x: x0, y: y0, w: Math.max(...boxes.map((b) => b.x + b.w)) - x0, h: Math.max(...boxes.map((b) => b.y + b.h)) - y0 };
};
const ratio = (w, h) => (w >= h ? `${r1(w / h)}:1` : `1:${r1(h / w)}`);
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const pad = (s, n) => String(s).padEnd(n);

/** The card. With `shapes` null it is the reduced card: what scan() read, and a line saying the rest was not taken. */
export function card(info, shapes = null) {
  const [vx, vy, vw, vh] = info.viewBox;
  const total = shapes ? shapes.length : Object.values(info.counts).reduce((a, b) => a + b, 0);
  const lines = [
    `${info.file}  viewBox ${vx} ${vy} ${vw} ${vh}${info.synthesised ? " (from width and height)" : ""}  (${ratio(vw, vh)})  ${plural(total, "shape")} in ${plural(info.groups, "group")}`,
    `title: ${info.title ? `"${info.title}"` : "none"}   ids: ${info.ids.length ? info.ids.join(", ") : "none"}`,
  ];
  const unread = Object.entries(info.notRead).map(([k, n]) => `${n} <${k}>${k === "use" ? " outside the file" : ""}`);
  if (!shapes) {
    lines.push(`shapes: ${Object.entries(info.counts).map(([k, n]) => `${n} ${k}`).join(", ") || "none"}`);
    if (unread.length) lines.push(`not read: ${unread.join(", ")}`);
    lines.push("no browser: boxes and the picture were not taken; read the SVG's own text for them");
    return lines.join("\n");
  }
  if (!shapes.length) {
    lines.push("ink: none: nothing is painted");
    if (unread.length) lines.push(`not read: ${unread.join(", ")}`);
    return lines.join("\n");
  }
  const all = union(shapes.map((s) => s.box));
  const small = shapes.filter((s) => s.box.w < SMALL * all.w && s.box.h < SMALL * all.h);
  const listed = shapes.filter((s) => !small.includes(s));
  /* the ink is the listed shapes' box: a speck at the corner does not stretch it */
  const ink = union((listed.length ? listed : shapes).map((s) => s.box));
  lines.push(`ink: ${span(ink)}  (${Math.round((ink.w / vw) * 100)}% × ${Math.round((ink.h / vh) * 100)}% of the viewBox)`, "");
  const rel = relate(listed, ink);
  const shown = listed.slice(0, LISTED);
  shown.forEach((s, k) => {
    const [cx, cy] = centre(s.box);
    const paint = [s.filled && "filled", s.stroke !== null && `stroke ${r1(s.stroke)}`].filter(Boolean).join(", ") || "no paint";
    const shape = [s.closed ? "closed" : "open", s.kind].filter(Boolean).join(", ");
    const tall = s.box.h > s.box.w * 1.5 ? `  (tall, ${ratio(s.box.w, s.box.h)})` : s.box.w > s.box.h * 1.5 ? `  (wide, ${ratio(s.box.w, s.box.h)})` : "";
    const note = rel[k] ? `  ${rel[k]}` : tall;
    lines.push(`#${pad(s.i, 2)} ${pad(s.type, 7)} ${pad(s.group ? `g#${s.group}` : "-", 9)} box ${span(s.box)}  centre ${r1(cx)},${r1(cy)}  ${paint}  ${shape}${note}`);
  });
  if (listed.length > shown.length) lines.push(`and ${listed.length - shown.length} more shapes`);
  if (small.length) lines.push(`and ${plural(small.length, "small shape")}`);
  if (unread.length) lines.push(`not read: ${unread.join(", ")}`);
  return lines.slice(0, 30).join("\n");
}
