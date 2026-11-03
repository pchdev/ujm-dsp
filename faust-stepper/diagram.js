/*
 * Faust stepper — block-diagram layout, modelled on Faust's own SVG generator
 * (compiler/draw/schema): same unit sizes, sequential wire routing, and
 * recursion drawn with the feedback block rotated by 180° above the main one.
 * Every wire carries the id of the signal it transports, so values can be
 * shown on it.
 */
(function (root) {
'use strict';

const dWire = 8, dHorz = 4, dVert = 4;
const COLORS = { prim: '#4B71A1', num: '#f44800', ui: '#477881', bar: '#477881', slot: '#8a6d3b' };
const EPS = 1e-6;

const ID = { map: (p) => p, flip: false };
function rot(tf, cx, cy) {
  return { map: (p) => tf.map({ x: 2 * cx - p.x, y: 2 * cy - p.y }), flip: !tf.flip };
}
function line(ctx, tf, p, q, sig, cls) {
  const a = tf.map(p), b = tf.map(q);
  if (Math.abs(a.x - b.x) < EPS && Math.abs(a.y - b.y) < EPS) return;
  ctx.lines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, sig, cls });
}
function poly(ctx, tf, pts, sig, cls) {
  for (let i = 0; i + 1 < pts.length; i++) line(ctx, tf, pts[i], pts[i + 1], sig, cls);
}
function rectOf(tf, x, y, w, h) {
  const a = tf.map({ x, y }), b = tf.map({ x: x + w, y: y + h });
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
}
function textWidth(s, size) { return s.length * size * 0.56; }

/* ---------------------------------------------------------------- blocks */

function blockLabel(box) {
  switch (box.k) {
    case 'prim': return box.label;
    case 'num': return box.text;
    case 'slot': return box.name;
    case 'ui': case 'bar': return `${box.prim}(${box.label})`;
    default: return '?';
  }
}

class BlockS {
  constructor(box) {
    this.box = box;
    this.ins = box.ins; this.outs = box.outs;
    this.text = blockLabel(box);
    this.w = 2 * dHorz + Math.max(3 * dWire, textWidth(this.text, 7) + 8);
    this.h = 2 * dVert + Math.max(3 * dWire, Math.max(this.ins, this.outs) * dWire);
  }
  place(x, y) { this.x = x; this.y = y; }
  port(n, i, x) { return { x, y: this.y + (this.h - dWire * (n - 1)) / 2 + i * dWire }; }
  inPt(i) { return this.port(this.ins, i, this.x); }
  outPt(i) { return this.port(this.outs, i, this.x + this.w); }
  draw(ctx, tf) {
    const { x, y, w, h, box } = this;
    const r = rectOf(tf, x + dHorz, y + dVert, w - 2 * dHorz, h - 2 * dVert);
    const dot = tf.map({ x: x + dHorz + 2, y: y + dVert + 2 });
    ctx.blocks.push({ r, dot, text: this.text, color: COLORS[box.k] || COLORS.prim, kind: box.k, sig: box.outSigs[0] });
    for (let i = 0; i < this.ins; i++) {
      const p = this.inPt(i), q = { x: x + dHorz, y: p.y }, s = box.inSigs[i];
      line(ctx, tf, p, q, s);
      line(ctx, tf, { x: q.x - 2.5, y: q.y - 1.2 }, q, s, 'arrow');
      line(ctx, tf, { x: q.x - 2.5, y: q.y + 1.2 }, q, s, 'arrow');
    }
    for (let i = 0; i < this.outs; i++) {
      const q = this.outPt(i), p = { x: x + w - dHorz, y: q.y }, s = box.outSigs[i];
      line(ctx, tf, p, q, s);
      const at = tf.map({ x: p.x + 1.2, y: p.y - 1.3 });
      ctx.labels.push({ x: at.x, y: at.y, flip: tf.flip, sig: s, kind: box.k === 'num' ? 'num' : 'out' });
    }
  }
}

class CableS {
  constructor(box) { this.box = box; this.ins = 1; this.outs = 1; this.w = 0; this.h = dWire; }
  place(x, y) { this.x = x; this.y = y; }
  inPt() { return { x: this.x, y: this.y + dWire / 2 }; }
  outPt() { return this.inPt(); }
  draw() {}
}

class CutS {
  constructor(box) { this.box = box; this.ins = 1; this.outs = 0; this.w = 0; this.h = dWire; }
  place(x, y) { this.x = x; this.y = y; }
  inPt() { return { x: this.x, y: this.y + dWire / 2 }; }
  draw(ctx, tf) { const p = tf.map(this.inPt()); ctx.cuts.push(p); }
}

/* ----------------------------------------------------------- composition */

// Common helper: lines from a slot edge to a child's (possibly inset) port.
function extIn(ctx, tf, edgeX, child, i, sig) {
  const p = child.inPt(i);
  line(ctx, tf, { x: edgeX, y: p.y }, p, sig);
}
function extOut(ctx, tf, edgeX, child, i, sig) {
  const p = child.outPt(i);
  line(ctx, tf, p, { x: edgeX, y: p.y }, sig);
}

class SeqS {
  constructor(box, a, b) {
    this.box = box; this.a = a; this.b = b;
    this.ins = a.ins; this.outs = b.outs;
    this.h = Math.max(a.h, b.h);
    a.place(0, (this.h - a.h) / 2);
    b.place(0, (this.h - b.h) / 2);
    let up = 0, down = 0;
    for (let i = 0; i < a.outs; i++) {
      const d = b.inPt(i).y - a.outPt(i).y;
      if (d > EPS) down++; else if (d < -EPS) up++;
    }
    this.gap = dWire * Math.max(up, down);
    this.w = a.w + this.gap + b.w;
  }
  place(x, y) {
    this.x = x; this.y = y;
    this.a.place(x, y + (this.h - this.a.h) / 2);
    this.b.place(x + this.a.w + this.gap, y + (this.h - this.b.h) / 2);
  }
  inPt(i) { return this.a.inPt(i); }
  outPt(i) { return this.b.outPt(i); }
  draw(ctx, tf) {
    const { a, b, box } = this;
    a.draw(ctx, tf); b.draw(ctx, tf);
    const downs = [], ups = [];
    for (let i = 0; i < a.outs; i++) {
      const p = a.outPt(i), q = b.inPt(i);
      if (q.y - p.y > EPS) downs.push(i);
      else if (p.y - q.y > EPS) ups.push(i);
      else line(ctx, tf, p, q, box.a.outSigs[i]);
    }
    // Lowest descending wire turns first, highest ascending wire turns first: no crossings.
    downs.sort((i, j) => a.outPt(j).y - a.outPt(i).y);
    ups.sort((i, j) => a.outPt(i).y - a.outPt(j).y);
    for (const list of [downs, ups]) {
      list.forEach((i, k) => {
        const p = a.outPt(i), q = b.inPt(i);
        const xv = a.x + a.w + dWire * (k + 1);
        poly(ctx, tf, [p, { x: xv, y: p.y }, { x: xv, y: q.y }, q], box.a.outSigs[i]);
      });
    }
  }
}

class ParS {
  constructor(box, a, b) {
    this.box = box; this.a = a; this.b = b;
    this.ins = a.ins + b.ins; this.outs = a.outs + b.outs;
    this.w = Math.max(a.w, b.w); this.h = a.h + b.h;
  }
  place(x, y) {
    this.x = x; this.y = y;
    this.a.place(x + (this.w - this.a.w) / 2, y);
    this.b.place(x + (this.w - this.b.w) / 2, y + this.a.h);
  }
  inPt(i) {
    const { a, b } = this;
    return { x: this.x, y: i < a.ins ? a.inPt(i).y : b.inPt(i - a.ins).y };
  }
  outPt(i) {
    const { a, b } = this;
    return { x: this.x + this.w, y: i < a.outs ? a.outPt(i).y : b.outPt(i - a.outs).y };
  }
  draw(ctx, tf) {
    const { a, b, box } = this;
    a.draw(ctx, tf); b.draw(ctx, tf);
    for (let i = 0; i < a.ins; i++) extIn(ctx, tf, this.x, a, i, box.a.inSigs[i]);
    for (let i = 0; i < b.ins; i++) extIn(ctx, tf, this.x, b, i, box.b.inSigs[i]);
    for (let i = 0; i < a.outs; i++) extOut(ctx, tf, this.x + this.w, a, i, box.a.outSigs[i]);
    for (let i = 0; i < b.outs; i++) extOut(ctx, tf, this.x + this.w, b, i, box.b.outSigs[i]);
  }
}

class FanS { // split (<:) and merge (:>)
  constructor(box, a, b, isSplit) {
    this.box = box; this.a = a; this.b = b; this.isSplit = isSplit;
    this.ins = a.ins; this.outs = b.outs;
    this.h = Math.max(a.h, b.h);
    this.gap = Math.max(2 * dWire, Math.round(this.h / 4));
    this.w = a.w + this.gap + b.w;
  }
  place(x, y) {
    this.x = x; this.y = y;
    this.a.place(x, y + (this.h - this.a.h) / 2);
    this.b.place(x + this.a.w + this.gap, y + (this.h - this.b.h) / 2);
  }
  inPt(i) { return this.a.inPt(i); }
  outPt(i) { return this.b.outPt(i); }
  draw(ctx, tf) {
    const { a, b, box } = this;
    a.draw(ctx, tf); b.draw(ctx, tf);
    if (this.isSplit) {
      for (let j = 0; j < b.ins; j++) {
        const i = j % a.outs;
        line(ctx, tf, a.outPt(i), b.inPt(j), box.a.outSigs[i]);
      }
    } else {
      for (let i = 0; i < a.outs; i++) {
        const j = i % b.ins;
        line(ctx, tf, a.outPt(i), b.inPt(j), box.a.outSigs[i]);
      }
      for (let j = 0; j < b.ins; j++) {
        if (a.outs / b.ins > 1) {
          const p = b.inPt(j);
          ctx.merges.push({ ...tf.map(p), sig: box.mergeSigs[j], flip: tf.flip });
        }
      }
    }
  }
}

class RecS {
  constructor(box, a, b) {
    this.box = box; this.a = a; this.b = b;
    this.ins = a.ins - b.outs; this.outs = a.outs;
    this.W = Math.max(a.w, b.w);
    this.mL = dWire * b.outs;
    this.mR = dWire * (b.ins + 1);
    this.vgap = 2 * dWire;
    this.w = this.mL + this.W + this.mR;
    this.h = b.h + this.vgap + a.h;
  }
  place(x, y) {
    this.x = x; this.y = y;
    const { a, b, W, mL } = this;
    b.place(x + mL + (W - b.w) / 2, y);
    a.place(x + mL + (W - a.w) / 2, y + b.h + this.vgap);
  }
  rotB(p) {
    const { b } = this;
    return { x: 2 * (b.x + b.w / 2) - p.x, y: 2 * (b.y + b.h / 2) - p.y };
  }
  inPt(k) { return { x: this.x, y: this.a.inPt(this.b.outs + k).y }; }
  outPt(i) { return { x: this.x + this.w, y: this.a.outPt(i).y }; }
  draw(ctx, tf) {
    const { a, b, box, mL, W } = this;
    const slotL = this.x + mL, slotR = this.x + mL + W;
    a.draw(ctx, tf);
    b.draw(ctx, rot(tf, b.x + b.w / 2, b.y + b.h / 2));

    for (let i = 0; i < a.ins; i++) extIn(ctx, tf, slotL, a, i, box.a.inSigs[i]);
    for (let i = 0; i < a.outs; i++) extOut(ctx, tf, slotR, a, i, box.a.outSigs[i]);

    // Feedback: A output i --z⁻¹--> B input i (B is drawn rotated, its inputs face right).
    for (let i = 0; i < b.ins; i++) {
      const y = box.a.outSigs[i], d = box.D[i];
      const src = { x: slotR, y: a.outPt(i).y };
      const bi = this.rotB(b.inPt(i));
      const dst = { x: slotR, y: bi.y };
      line(ctx, tf, dst, bi, d);
      const xv = slotR + dWire * (i + 1);
      const my = (src.y + dst.y) / 2;
      poly(ctx, tf, [src, { x: xv, y: src.y }, { x: xv, y: my + 3.5 }], y);
      poly(ctx, tf, [{ x: xv, y: my - 3.5 }, { x: xv, y: dst.y }, dst], d);
      const c = tf.map({ x: xv, y: my });
      ctx.delays.push({ x: c.x, y: c.y, sigIn: y, sigOut: d });
      const at = tf.map({ x: xv + 4.6, y: my });
      ctx.labels.push({ x: at.x, y: at.y, flip: tf.flip, sig: d, kind: 'delay' });
    }
    // Feedforward: B output j --> A input j.
    for (let j = 0; j < b.outs; j++) {
      const s = box.Z[j];
      const bo = this.rotB(b.outPt(j));
      line(ctx, tf, bo, { x: slotL, y: bo.y }, s);
      const xv = slotL - dWire * j;
      const ay = a.inPt(j).y;
      poly(ctx, tf, [{ x: slotL, y: bo.y }, { x: xv, y: bo.y }, { x: xv, y: ay }, { x: slotL, y: ay }], s);
    }
    for (let k = 0; k < this.ins; k++) {
      const p = this.inPt(k);
      line(ctx, tf, p, { x: slotL, y: p.y }, box.inSigs[k]);
    }
    for (let i = 0; i < this.outs; i++) {
      const p = this.outPt(i);
      line(ctx, tf, { x: slotR, y: p.y }, p, box.outSigs[i]);
    }
  }
}

class GroupS {
  constructor(box, child, name, slots) {
    this.box = box; this.c = child; this.name = name;
    this.slots = slots || [];
    this.ins = child.ins + this.slots.length; this.outs = child.outs;
    this.mg = dWire;
    this.top = this.mg + this.slots.length * dWire;
    this.w = Math.max(child.w + 2 * this.mg, textWidth(name, 6) + 2 * this.mg + 6);
    this.h = child.h + this.top + this.mg;
  }
  place(x, y) {
    this.x = x; this.y = y;
    this.c.place(x + (this.w - this.c.w) / 2, y + this.top);
  }
  inPt(i) {
    const k = this.slots.length;
    if (i < k) return { x: this.x, y: this.y + this.mg + dWire / 2 + i * dWire };
    return { x: this.x, y: this.c.inPt(i - k).y };
  }
  outPt(i) { return { x: this.x + this.w, y: this.c.outPt(i).y }; }
  draw(ctx, tf) {
    const { c, box, mg } = this;
    const k = this.slots.length;
    c.draw(ctx, tf);
    const r = rectOf(tf, this.x + mg / 2, this.y + mg / 2, this.w - mg, this.h - mg);
    const lp = tf.map({ x: this.x + mg / 2 + 3, y: this.y + mg / 2 });
    ctx.groups.push({ r, name: this.name, lx: tf.flip ? lp.x - textWidth(this.name, 6) : lp.x, ly: lp.y });
    for (let i = 0; i < k; i++) {
      const p = this.inPt(i);
      line(ctx, tf, p, { x: p.x + mg + 2, y: p.y }, box.inSigs[i]);
      const t = tf.map({ x: p.x + mg + 3, y: p.y });
      ctx.slotTags.push({ x: t.x, y: t.y, text: this.slots[i].name, flip: tf.flip });
    }
    for (let i = 0; i < c.ins; i++) extIn(ctx, tf, this.x, c, i, box.inSigs[k + i]);
    for (let i = 0; i < c.outs; i++) extOut(ctx, tf, this.x + this.w, c, i, box.outSigs[i]);
  }
}

function build(box, opts) {
  switch (box.k) {
    case 'wire': return new CableS(box);
    case 'cut': return new CutS(box);
    case 'num': case 'prim': case 'ui': case 'bar': case 'slot': return new BlockS(box);
    case 'seq': return new SeqS(box, build(box.a, opts), build(box.b, opts));
    case 'par': return new ParS(box, build(box.a, opts), build(box.b, opts));
    case 'split': return new FanS(box, build(box.a, opts), build(box.b, opts), true);
    case 'merge': return new FanS(box, build(box.a, opts), build(box.b, opts), false);
    case 'rec': return new RecS(box, build(box.a, opts), build(box.b, opts));
    case 'group': {
      const c = build(box.child, opts);
      return opts.groups ? new GroupS(box, c, box.name) : c;
    }
    case 'abs': return new GroupS(box, build(box.body, opts), box.name, box.slots);
    default: throw new Error('layout: ' + box.k);
  }
}

/* ---------------------------------------------------------------- render */

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const f = (v) => +v.toFixed(2);

function render(compiled, opts) {
  opts = Object.assign({ groups: true }, opts);
  const { box } = compiled;
  const procBox = { k: 'group', name: 'process', child: box, ins: box.ins, outs: box.outs, inSigs: box.inSigs, outSigs: box.outSigs };
  const s = new GroupS(procBox, build(box, opts), 'process');
  const padL = box.ins ? 42 : 8, padR = box.outs ? 46 : 8, padT = 4, padB = 4;
  s.place(padL, padT);
  const ctx = { lines: [], blocks: [], labels: [], groups: [], delays: [], cuts: [], merges: [], slotTags: [] };
  s.draw(ctx, ID);
  const ios = [];
  for (let i = 0; i < box.ins; i++) {
    const p = s.inPt(i);
    const q = { x: p.x - 12, y: p.y };
    line(ctx, ID, q, p, compiled.inSigs[i]);
    line(ctx, ID, { x: p.x - 2.5, y: p.y - 1.2 }, p, compiled.inSigs[i], 'arrow');
    line(ctx, ID, { x: p.x - 2.5, y: p.y + 1.2 }, p, compiled.inSigs[i], 'arrow');
    ios.push({ x: q.x - 1, y: p.y, sig: compiled.inSigs[i], kind: 'in', name: `in${i}` });
  }
  for (let i = 0; i < box.outs; i++) {
    const p = s.outPt(i);
    const q = { x: p.x + 12, y: p.y };
    line(ctx, ID, p, q, compiled.outSigs[i]);
    line(ctx, ID, { x: q.x - 2.5, y: q.y - 1.2 }, q, compiled.outSigs[i], 'arrow');
    line(ctx, ID, { x: q.x - 2.5, y: q.y + 1.2 }, q, compiled.outSigs[i], 'arrow');
    ios.push({ x: q.x + 1, y: p.y, sig: compiled.outSigs[i], kind: 'pout', name: `out${i}` });
  }
  const W = padL + s.w + padR, H = padT + s.h + padB;

  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(W)} ${f(H)}" class="fs-svg" data-w="${f(W)}" data-h="${f(H)}">`);
  out.push(`<rect class="bg" x="0" y="0" width="${f(W)}" height="${f(H)}"/>`);
  out.push('<g class="groups">');
  for (const g of ctx.groups) {
    out.push(`<rect class="grp" x="${f(g.r.x)}" y="${f(g.r.y)}" width="${f(g.r.w)}" height="${f(g.r.h)}"/>`);
    const tw = textWidth(g.name, 6);
    out.push(`<rect class="grp-bg" x="${f(g.lx - 1.5)}" y="${f(g.ly - 3.5)}" width="${f(tw + 3)}" height="7"/>`);
    out.push(`<text class="grp-t" x="${f(g.lx)}" y="${f(g.ly + 2.1)}">${esc(g.name)}</text>`);
  }
  out.push('</g><g class="wires">');
  for (const l of ctx.lines) {
    out.push(`<line class="w${l.cls ? ' ' + l.cls : ''}" data-sig="${l.sig}" x1="${f(l.x1)}" y1="${f(l.y1)}" x2="${f(l.x2)}" y2="${f(l.y2)}"/>`);
  }
  for (const c of ctx.cuts) out.push(`<circle class="cut" cx="${f(c.x)}" cy="${f(c.y)}" r="1.2"/>`);
  for (const m of ctx.merges) out.push(`<circle class="merge" data-sig="${m.sig}" cx="${f(m.x)}" cy="${f(m.y)}" r="1"/>`);
  out.push('</g><g class="blocks">');
  for (const b of ctx.blocks) {
    const { r } = b;
    out.push(`<g class="blk blk-${b.kind}" data-sig="${b.sig}">`);
    out.push(`<rect class="shadow" x="${f(r.x + 1)}" y="${f(r.y + 1)}" width="${f(r.w)}" height="${f(r.h)}"/>`);
    out.push(`<rect class="body" x="${f(r.x)}" y="${f(r.y)}" width="${f(r.w)}" height="${f(r.h)}" fill="${b.color}"/>`);
    out.push(`<text class="blk-t" x="${f(r.x + r.w / 2)}" y="${f(r.y + r.h / 2 + 2.4)}">${esc(b.text)}</text>`);
    out.push(`<circle class="odot" cx="${f(b.dot.x)}" cy="${f(b.dot.y)}" r="1"/>`);
    out.push('</g>');
  }
  for (const t of ctx.slotTags) {
    out.push(`<text class="slot-t" x="${f(t.x)}" y="${f(t.y + 1.8)}" text-anchor="${t.flip ? 'end' : 'start'}">${esc(t.text)}</text>`);
  }
  for (const d of ctx.delays) {
    out.push(`<g class="dly" data-sig="${d.sigOut}"><rect x="${f(d.x - 3.5)}" y="${f(d.y - 3.5)}" width="7" height="7" rx="1"/>` +
      `<text x="${f(d.x)}" y="${f(d.y + 1.6)}">z⁻¹</text></g>`);
  }
  out.push('</g><g class="hits">');
  for (const l of ctx.lines) {
    if (l.cls === 'arrow') continue;
    out.push(`<line class="hit" data-sig="${l.sig}" x1="${f(l.x1)}" y1="${f(l.y1)}" x2="${f(l.x2)}" y2="${f(l.y2)}"/>`);
  }
  out.push('</g><g class="vals">');
  const labels = ctx.labels.concat(ios);
  for (const l of labels) {
    let anchor;
    if (l.kind === 'delay') anchor = l.flip ? 'em' : 'sm';
    else if (l.kind === 'in') anchor = 'em';
    else if (l.kind === 'pout') anchor = 'sm';
    else anchor = l.flip ? 'eb' : 'sa';
    out.push(`<g class="val val-${l.kind}" data-sig="${l.sig}" data-anchor="${anchor}"${l.name ? ` data-name="${l.name}"` : ''} transform="translate(${f(l.x)},${f(l.y)})"><rect/><text/></g>`);
  }
  out.push('</g></svg>');
  return { svg: out.join(''), width: W, height: H };
}

// Sizes the pill of a value label once its text is known.
const LABEL_FONT = 4.8, CHAR_W = LABEL_FONT * 0.6, PILL_H = 6;
function layoutLabel(g, text) {
  const t = g.querySelector('text'), r = g.querySelector('rect');
  t.textContent = text;
  const w = text.length * CHAR_W + 2.6;
  const a = g.getAttribute('data-anchor');
  let rx, ry;
  if (a === 'sa') { rx = 0; ry = -PILL_H; }        // start, above the wire
  else if (a === 'eb') { rx = -w; ry = 0; }        // end, below the wire (rotated blocks)
  else if (a === 'sm') { rx = 0; ry = -PILL_H / 2; } // start, vertically centred
  else { rx = -w; ry = -PILL_H / 2; }              // end, vertically centred
  r.setAttribute('x', f(rx)); r.setAttribute('y', f(ry));
  r.setAttribute('width', f(w)); r.setAttribute('height', PILL_H); r.setAttribute('rx', 1.4);
  t.setAttribute('x', f(rx + w / 2)); t.setAttribute('y', f(ry + PILL_H / 2 + LABEL_FONT * 0.36));
}

const api = { render, layoutLabel, dWire };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
else root.FaustDiagram = api;
})(typeof window !== 'undefined' ? window : globalThis);
