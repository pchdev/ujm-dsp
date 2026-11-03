/*
 * Faust stepper — core: lexer, parser, expansion to block diagrams,
 * signal graph propagation, type inference and sample-by-sample evaluation.
 *
 * Supports a teaching subset of Faust:
 *   _ ! numbers  + - * / % ^ < <= > >= == != & | xor << >>  @  mem  '
 *   : , <: :> ~   partial application +(1)   definitions f(x,y) = ...;
 *   with { }  \(x).(...)  par/seq/sum/prod  button/checkbox/hslider/vslider/nentry
 *   hbargraph/vbargraph  int float abs floor ceil sqrt exp log sin cos tan
 *   min max pow fmod select2 attach  ma.SR ma.PI ba.if
 *
 * Classic script (no modules) so it works from file:// ; also exports for node.
 */
(function (root) {
'use strict';

class FaustError extends Error {
  constructor(msg, pos) { super(msg); this.pos = pos || null; }
}

/* ------------------------------------------------------------------ lexer */

const PUNCT2 = ['<:', ':>', '<=', '>=', '==', '!=', '<<', '>>'];
const PUNCT1 = "~,:();='@+-*/%^<>&|!{}[].\\_";

function lex(src) {
  const toks = [];
  let i = 0, line = 1, col = 1;
  const adv = (k) => {
    for (let j = 0; j < k; j++) {
      if (src[i] === '\n') { line++; col = 1; } else col++;
      i++;
    }
  };
  while (i < src.length) {
    const c = src[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { adv(1); continue; }
    if (src.startsWith('//', i)) { while (i < src.length && src[i] !== '\n') adv(1); continue; }
    if (src.startsWith('/*', i)) {
      const e = src.indexOf('*/', i + 2);
      adv((e < 0 ? src.length : e + 2) - i);
      continue;
    }
    const pos = { line, col, offset: i };
    const rest = src.slice(i, i + 64);
    let m;
    if ((m = /^(?:\d+\.\d*|\.\d+|\d+)(?:[eE][+-]?\d+)?/.exec(rest)) && (/\d/.test(c) || /^\.\d/.test(rest))) {
      const text = m[0];
      toks.push({ t: 'num', v: parseFloat(text), isInt: /^\d+$/.test(text), text, pos, end: i + text.length });
      adv(text.length);
      if (src[i] === 'f') adv(1);
      continue;
    }
    if ((m = /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*/.exec(src.slice(i))) && m[0] !== '_') {
      toks.push({ t: 'id', v: m[0], pos, end: i + m[0].length });
      adv(m[0].length);
      continue;
    }
    if (c === '"') {
      let j = i + 1, s = '';
      while (j < src.length && src[j] !== '"') {
        if (src[j] === '\\' && j + 1 < src.length) { s += src[j + 1]; j += 2; } else s += src[j++];
      }
      if (j >= src.length) throw new FaustError('Unterminated string', pos);
      toks.push({ t: 'str', v: s, pos, end: j + 1 });
      adv(j + 1 - i);
      continue;
    }
    const two = src.slice(i, i + 2);
    if (PUNCT2.includes(two)) { toks.push({ t: 'p', v: two, pos, end: i + 2 }); adv(2); continue; }
    if (PUNCT1.includes(c)) { toks.push({ t: 'p', v: c, pos, end: i + 1 }); adv(1); continue; }
    throw new FaustError(`Unexpected character '${c}'`, pos);
  }
  toks.push({ t: 'eof', v: '<end of file>', pos: { line, col, offset: i }, end: i });
  return toks;
}

/* ----------------------------------------------------------------- parser */

// Faust priorities (faustparser.y), low to high, all left-associative.
const BIN = {
  '<:': 1, ':>': 1, ':': 2, ',': 3, '~': 4,
  '<': 5, '<=': 5, '>': 5, '>=': 5, '==': 5, '!=': 5,
  '+': 6, '-': 6, '|': 6,
  '*': 7, '/': 7, '%': 7, '&': 7, 'xor': 7, '<<': 7, '>>': 7,
  '^': 8, '@': 9,
};
const COMPOSITION = { '<:': 'split', ':>': 'merge', ':': 'seq', ',': 'par', '~': 'rec' };
const OPBOX = ['+', '-', '*', '/', '%', '^', '<', '<=', '>', '>=', '==', '!=', '&', '|', '<<', '>>', '@'];

class Parser {
  constructor(src) { this.src = src; this.toks = lex(src); this.i = 0; }
  peek(k = 0) { return this.toks[this.i + k]; }
  next() { return this.toks[this.i++]; }
  isP(v, k = 0) { const t = this.peek(k); return t.t === 'p' && t.v === v; }
  isId(v, k = 0) { const t = this.peek(k); return t.t === 'id' && t.v === v; }
  expectP(v) {
    const t = this.next();
    if (t.t !== 'p' || t.v !== v) throw new FaustError(`Expected '${v}' but found '${t.v}'`, t.pos);
    return t;
  }
  expectId() {
    const t = this.next();
    if (t.t !== 'id') throw new FaustError(`Expected a name but found '${t.v}'`, t.pos);
    return t;
  }

  program() {
    const defs = [];
    while (this.peek().t !== 'eof') {
      if (this.isId('import')) {
        this.next(); this.expectP('(');
        const t = this.next();
        if (t.t !== 'str') throw new FaustError('import expects a file name string', t.pos);
        this.expectP(')'); this.expectP(';');
        continue;
      }
      if (this.isId('declare')) {
        while (this.peek().t !== 'eof' && !this.isP(';')) this.next();
        this.expectP(';');
        continue;
      }
      defs.push(this.definition());
    }
    return defs;
  }

  definition() {
    const nameTok = this.expectId();
    const params = [];
    if (this.isP('(')) {
      this.next();
      for (;;) {
        const t = this.next();
        if (t.t !== 'id') {
          throw new FaustError(`Function parameters must be names (pattern matching isn't supported here), found '${t.v}'`, t.pos);
        }
        params.push(t.v);
        if (this.isP(',')) { this.next(); continue; }
        this.expectP(')');
        break;
      }
    }
    const eq = this.next();
    if (eq.t !== 'p' || eq.v !== '=') {
      throw new FaustError(`Expected '=' after '${nameTok.v}' but found '${eq.v}'`, eq.pos);
    }
    const body = this.expr(1, false);
    const semi = this.next();
    if (semi.t !== 'p' || semi.v !== ';') {
      throw new FaustError(`Expected ';' at the end of the definition of '${nameTok.v}' but found '${semi.v}'`, semi.pos);
    }
    return { name: nameTok.v, params, body, pos: nameTok.pos };
  }

  binOp(t) {
    if (t.t === 'p' && Object.prototype.hasOwnProperty.call(BIN, t.v)) return t.v;
    if (t.t === 'id' && t.v === 'xor') return 'xor';
    return null;
  }

  expr(minPrec, noPar) {
    const start = this.peek();
    let left = this.postfix();
    for (;;) {
      const t = this.peek();
      const op = this.binOp(t);
      if (!op) break;
      const p = BIN[op];
      if (p < minPrec) break;
      if (noPar && op === ',') break;
      this.next();
      const right = this.expr(p + 1, noPar);
      left = COMPOSITION[op]
        ? { k: 'comp', op: COMPOSITION[op], sym: op, a: left, b: right, pos: t.pos }
        : { k: 'infix', op, a: left, b: right, pos: t.pos };
      left.src = [start.pos.offset, this.toks[this.i - 1].end];
    }
    if (minPrec <= 1 && this.isId('with')) {
      const w = this.next();
      this.expectP('{');
      const defs = [];
      while (!this.isP('}')) {
        if (this.peek().t === 'eof') throw new FaustError("Missing '}' to close 'with'", w.pos);
        defs.push(this.definition());
      }
      this.expectP('}');
      left = { k: 'with', e: left, defs, pos: w.pos, src: left.src };
    }
    return left;
  }

  postfix() {
    const start = this.peek();
    let e = this.primary();
    for (;;) {
      if (this.isP('(')) {
        const open = this.next();
        const args = [];
        if (!this.isP(')')) {
          for (;;) {
            args.push(this.expr(1, true));
            if (this.isP(',')) { this.next(); continue; }
            break;
          }
        }
        this.expectP(')');
        e = { k: 'app', f: e, args, pos: open.pos };
      } else if (this.isP("'")) {
        const t = this.next();
        e = { k: 'mem1', a: e, pos: t.pos };
      } else break;
      e.src = [start.pos.offset, this.toks[this.i - 1].end];
    }
    return e;
  }

  primary() {
    const t = this.next();
    const node = (n) => { n.pos = t.pos; n.src = [t.pos.offset, this.toks[this.i - 1].end]; return n; };
    if (t.t === 'num') return node({ k: 'num', v: t.v, isInt: t.isInt, text: t.text });
    if (t.t === 'str') return node({ k: 'str', v: t.v });
    if (t.t === 'p') {
      if (t.v === '_') return node({ k: 'wire' });
      if (t.v === '!') return node({ k: 'cut' });
      if (t.v === '(') {
        const e = this.expr(1, false);
        this.expectP(')');
        return e;
      }
      if (t.v === '-' && this.peek().t === 'num' && this.peek().pos.offset === t.pos.offset + 1) {
        const n = this.next();
        return node({ k: 'num', v: -n.v, isInt: n.isInt, text: '-' + n.text });
      }
      if (t.v === '\\') {
        this.expectP('(');
        const params = [];
        for (;;) {
          params.push(this.expectId().v);
          if (this.isP(',')) { this.next(); continue; }
          break;
        }
        this.expectP(')'); this.expectP('.'); this.expectP('(');
        const body = this.expr(1, false);
        this.expectP(')');
        return node({ k: 'lambda', params, body });
      }
      if (OPBOX.includes(t.v)) return node({ k: 'op', op: t.v });
    }
    if (t.t === 'id') {
      if (['par', 'seq', 'sum', 'prod'].includes(t.v) && this.isP('(')) {
        this.next();
        const v = this.expectId().v;
        this.expectP(',');
        const n = this.expr(1, true);
        this.expectP(',');
        const e = this.expr(1, true);
        this.expectP(')');
        return node({ k: 'iter', kind: t.v, v, n, e });
      }
      if (t.v === 'xor') return node({ k: 'op', op: 'xor' });
      if (['with', 'import', 'declare'].includes(t.v)) {
        throw new FaustError(`Unexpected keyword '${t.v}'`, t.pos);
      }
      return node({ k: 'id', name: t.v });
    }
    throw new FaustError(`Unexpected '${t.v}'`, t.pos);
  }
}

/* ------------------------------------------------------------ primitives */

const PRIMS = {
  '+': [2, 1], '-': [2, 1], '*': [2, 1], '/': [2, 1], '%': [2, 1], '^': [2, 1],
  '<': [2, 1], '<=': [2, 1], '>': [2, 1], '>=': [2, 1], '==': [2, 1], '!=': [2, 1],
  '&': [2, 1], '|': [2, 1], 'xor': [2, 1], '<<': [2, 1], '>>': [2, 1],
  '@': [2, 1], mem: [1, 1],
  int: [1, 1], float: [1, 1], abs: [1, 1], floor: [1, 1], ceil: [1, 1], rint: [1, 1],
  sqrt: [1, 1], exp: [1, 1], log: [1, 1], log10: [1, 1],
  sin: [1, 1], cos: [1, 1], tan: [1, 1], asin: [1, 1], acos: [1, 1], atan: [1, 1],
  atan2: [2, 1], pow: [2, 1], fmod: [2, 1], min: [2, 1], max: [2, 1],
  select2: [3, 1], attach: [2, 1],
};
const UI_PRIMS = {
  button: 'button', checkbox: 'checkbox',
  hslider: 'slider', vslider: 'slider', nentry: 'slider',
  hbargraph: 'bargraph', vbargraph: 'bargraph',
};
const LIB_HINT = /^(os|no|en|fi|de|re|ef|si|an|aa|co|sp|pm|ho|dm|mi|ve|wa|sy|ba|ma)\./;

const PRELUDE = `
ma.PI = 3.141592653589793;
ba.if(c, t, e) = select2(c, e, t);
`;

/* ---------------------------------------------------------- box algebra */

let boxUid = 0;
function mkBox(k, props, pos) {
  const b = Object.assign({ k, uid: ++boxUid }, props);
  if (pos) b.pos = pos;
  switch (k) {
    case 'wire': b.ins = 1; b.outs = 1; break;
    case 'cut': b.ins = 1; b.outs = 0; break;
    case 'num': case 'slot': b.ins = 0; b.outs = 1; break;
    case 'ui': b.ins = 0; b.outs = 1; break;
    case 'bar': b.ins = 1; b.outs = 1; break;
    case 'prim': b.ins = PRIMS[b.name][0]; b.outs = PRIMS[b.name][1]; break;
    case 'group': b.ins = b.child.ins; b.outs = b.child.outs; break;
    case 'abs': b.ins = b.slots.length + b.body.ins; b.outs = b.body.outs; break;
    case 'seq': {
      const { a, b: c } = b;
      if (a.outs !== c.ins) {
        throw new FaustError(
          `Sequential composition A : B needs as many outputs in A as inputs in B, ` +
          `but A has ${plural(a.outs, 'output')} and B has ${plural(c.ins, 'input')}`, pos);
      }
      b.ins = a.ins; b.outs = c.outs; break;
    }
    case 'par': b.ins = b.a.ins + b.b.ins; b.outs = b.a.outs + b.b.outs; break;
    case 'split': {
      const { a, b: c } = b;
      if (a.outs === 0 || c.ins % a.outs !== 0) {
        throw new FaustError(
          `Split composition A <: B needs the inputs of B to be a multiple of the outputs of A, ` +
          `but A has ${plural(a.outs, 'output')} and B has ${plural(c.ins, 'input')}`, pos);
      }
      b.ins = a.ins; b.outs = c.outs; break;
    }
    case 'merge': {
      const { a, b: c } = b;
      if (c.ins === 0 || a.outs % c.ins !== 0) {
        throw new FaustError(
          `Merge composition A :> B needs the outputs of A to be a multiple of the inputs of B, ` +
          `but A has ${plural(a.outs, 'output')} and B has ${plural(c.ins, 'input')}`, pos);
      }
      b.ins = a.ins; b.outs = c.outs; break;
    }
    case 'rec': {
      const { a, b: c } = b;
      if (c.ins > a.outs || c.outs > a.ins) {
        throw new FaustError(
          `Recursive composition A ~ B needs B to have at most as many inputs as A has outputs ` +
          `and at most as many outputs as A has inputs; here A is ${a.ins}→${a.outs} and B is ${c.ins}→${c.outs}`, pos);
      }
      b.ins = a.ins - c.outs; b.outs = a.outs; break;
    }
    default: throw new Error('unknown box ' + k);
  }
  return b;
}
function plural(n, w) { return `${n} ${w}${n === 1 ? '' : 's'}`; }

function cloneBox(b) {
  if (!b || typeof b !== 'object') return b;
  if (b.k === 'closure' || b.k === 'strv' || b.k === 'builtin') return b;
  const c = Object.assign({}, b, { uid: ++boxUid });
  for (const key of ['a', 'b', 'child', 'body']) if (b[key]) c[key] = cloneBox(b[key]);
  return c;
}

/* ------------------------------------------------------------- expansion */

class Env {
  constructor(parent) { this.parent = parent; this.map = new Map(); }
  lookup(name) {
    for (let e = this; e; e = e.parent) if (e.map.has(name)) return e.map.get(name);
    return null;
  }
}

class Expander {
  constructor(src, opts) {
    this.src = src;
    this.opts = opts || {};
    this.depth = 0;
    this.slotUid = 0;
  }

  srcOf(ast) {
    if (!ast.src) return '';
    return this.src.slice(ast.src[0], ast.src[1]).replace(/\s+/g, ' ').trim();
  }

  scope(defs, parent, isUser) {
    const env = new Env(parent);
    for (const d of defs) env.map.set(d.name, { kind: 'def', def: d, env, isUser });
    return env;
  }

  expand(ast, env) {
    if (++this.depth > 400) {
      throw new FaustError('Expansion is too deep: is there a recursive definition? (use ~ for recursion)', ast.pos);
    }
    try { return this.expand1(ast, env); } finally { this.depth--; }
  }

  expand1(ast, env) {
    switch (ast.k) {
      case 'num': return mkBox('num', { v: ast.v, isInt: ast.isInt, text: ast.text }, ast.pos);
      case 'wire': return mkBox('wire', {}, ast.pos);
      case 'cut': return mkBox('cut', {}, ast.pos);
      case 'str': return { k: 'strv', v: ast.v };
      case 'op': return mkBox('prim', { name: ast.op, label: ast.op }, ast.pos);
      case 'id': return this.lookup(ast.name, env, ast.pos);
      case 'comp': {
        const a = this.toBox(this.expand(ast.a, env), ast.a);
        const b = this.toBox(this.expand(ast.b, env), ast.b);
        return mkBox(ast.op, { a, b }, ast.pos);
      }
      case 'infix': {
        const a = this.toBox(this.expand(ast.a, env), ast.a);
        const b = this.toBox(this.expand(ast.b, env), ast.b);
        const prim = mkBox('prim', { name: ast.op, label: ast.op }, ast.pos);
        const par = mkBox('par', { a, b }, ast.pos);
        if (a.outs + b.outs !== 2) {
          throw new FaustError(`The infix operator '${ast.op}' needs one signal on each side, ` +
            `but got ${a.outs} on the left and ${b.outs} on the right`, ast.pos);
        }
        return mkBox('seq', { a: par, b: prim }, ast.pos);
      }
      case 'mem1': {
        const a = this.toBox(this.expand(ast.a, env), ast.a);
        return mkBox('seq', { a, b: mkBox('prim', { name: 'mem', label: 'mem' }, ast.pos) }, ast.pos);
      }
      case 'app': {
        const f = this.expand(ast.f, env);
        const args = ast.args.map((a) => this.expand(a, env));
        return this.apply(f, args, ast, env);
      }
      case 'with': return this.expand(ast.e, this.scope(ast.defs, env, true));
      case 'lambda': return { k: 'closure', params: ast.params, body: ast.body, env, name: null, bound: [], label: '\\(' + ast.params.join(',') + ')' };
      case 'iter': {
        const n = this.constEval(this.toBox(this.expand(ast.n, env), ast.n), ast.n.pos);
        const count = Math.trunc(n);
        if (!(count >= 1) || count > 64) {
          throw new FaustError(`${ast.kind}(i, n, ...) needs 1 ≤ n ≤ 64 here (got ${n})`, ast.pos);
        }
        let acc = null;
        for (let i = 0; i < count; i++) {
          const e2 = new Env(env);
          e2.map.set(ast.v, { kind: 'value', value: mkBox('num', { v: i, isInt: true, text: String(i) }) });
          const bi = this.toBox(this.expand(ast.e, e2), ast.e);
          if (!acc) { acc = bi; continue; }
          if (ast.kind === 'par') acc = mkBox('par', { a: acc, b: bi }, ast.pos);
          else if (ast.kind === 'seq') acc = mkBox('seq', { a: acc, b: bi }, ast.pos);
          else {
            const op = ast.kind === 'sum' ? '+' : '*';
            acc = mkBox('seq', { a: mkBox('par', { a: acc, b: bi }), b: mkBox('prim', { name: op, label: op }) }, ast.pos);
          }
        }
        return acc;
      }
      default: throw new FaustError('Unsupported expression', ast.pos);
    }
  }

  lookup(name, env, pos) {
    const e = env.lookup(name);
    if (e) {
      if (e.kind === 'value') return cloneBox(e.value);
      const d = e.def;
      if (d.params.length > 0) {
        return { k: 'closure', params: d.params, body: d.body, env: e.env, name: d.name, bound: [], boundSrc: [], isUser: e.isUser };
      }
      if (name === 'ma.SR') return mkBox('num', { v: this.opts.sr || 48000, isInt: true, text: 'ma.SR' }, pos);
      const v = this.expand(d.body, e.env);
      return this.maybeGroup(v, d.name, e.isUser);
    }
    if (name === 'ma.SR') return mkBox('num', { v: this.opts.sr || 48000, isInt: true, text: 'ma.SR' }, pos);
    if (PRIMS[name]) return mkBox('prim', { name, label: name }, pos);
    if (UI_PRIMS[name]) return { k: 'builtin', name };
    if (LIB_HINT.test(name)) {
      throw new FaustError(`'${name}' comes from the Faust libraries, which the stepper doesn't include ` +
        `(only ma.SR, ma.PI and ba.if are available). Write it with basic primitives instead.`, pos);
    }
    throw new FaustError(`Unknown name '${name}'`, pos);
  }

  maybeGroup(v, name, isUser) {
    if (!isUser || !v || !v.k || v.k === 'closure' || v.k === 'strv' || v.k === 'builtin') return v;
    if (['wire', 'cut', 'num', 'prim', 'ui', 'slot'].includes(v.k)) return v;
    if (v.k === 'group' && v.name === name) return v;
    return mkBox('group', { name, child: v });
  }

  toBox(v, ast) {
    if (!v) throw new FaustError('Empty expression', ast && ast.pos);
    if (v.k === 'strv') throw new FaustError('A string can only be used as a label argument', ast && ast.pos);
    if (v.k === 'builtin') throw new FaustError(`'${v.name}' needs its arguments, e.g. ${v.name}("label"${v.name === 'button' || v.name === 'checkbox' ? '' : ', ...'})`, ast && ast.pos);
    if (v.k === 'closure') return this.abstractionToBox(v, ast);
    return v;
  }

  // A function used without (all) its arguments becomes a block whose first
  // inputs feed its remaining parameters (Faust's abstraction-to-box rule).
  abstractionToBox(c, ast) {
    const rest = c.params.slice(c.bound.length);
    const env = new Env(c.env);
    c.params.slice(0, c.bound.length).forEach((p, i) => env.map.set(p, { kind: 'value', value: c.bound[i] }));
    const slots = rest.map((p) => {
      const s = mkBox('slot', { key: ++this.slotUid, name: p });
      env.map.set(p, { kind: 'value', value: s });
      return s;
    });
    const body = this.toBox(this.expand(c.body, env), c.body);
    const name = c.name ? (c.bound.length ? `${c.name}(${c.boundSrc.join(', ')})` : c.name) : c.label;
    return mkBox('abs', { name, slots, body }, ast && ast.pos);
  }

  apply(f, args, ast, env) {
    if (f.k === 'closure') {
      const all = f.bound.concat(args);
      const allSrc = (f.boundSrc || []).concat(ast.args.map((a) => this.srcOf(a)));
      if (all.length < f.params.length) return Object.assign({}, f, { bound: all, boundSrc: allSrc });
      const e2 = new Env(f.env);
      f.params.forEach((p, i) => e2.map.set(p, { kind: 'value', value: all[i] }));
      let v = this.expand(f.body, e2);
      const label = f.name ? `${f.name}(${allSrc.slice(0, f.params.length).join(', ')})` : null;
      if (label) v = this.maybeGroup(v, label, f.isUser);
      const extra = all.slice(f.params.length);
      if (extra.length) return this.applyBox(this.toBox(v, ast), extra, ast);
      return v;
    }
    if (f.k === 'builtin') return this.makeUI(f.name, args, ast);
    if (f.k === 'strv') throw new FaustError('A string cannot be applied to arguments', ast.pos);
    return this.applyBox(f, args, ast);
  }

  applyBox(f, args, ast) {
    const boxes = args.map((a, i) => this.toBox(a, ast.args[i]));
    const nOut = boxes.reduce((s, b) => s + b.outs, 0);
    if (nOut > f.ins) {
      throw new FaustError(`Too many arguments: this block has ${plural(f.ins, 'input')} but receives ${nOut}`, ast.pos);
    }
    let lhs = null;
    for (let i = 0; i < f.ins - nOut; i++) {
      const w = mkBox('wire', {});
      lhs = lhs ? mkBox('par', { a: lhs, b: w }) : w;
    }
    for (const b of boxes) lhs = lhs ? mkBox('par', { a: lhs, b }) : b;
    if (!lhs) return f;
    return mkBox('seq', { a: lhs, b: f }, ast.pos);
  }

  makeUI(name, args, ast) {
    const kind = UI_PRIMS[name];
    const label = args[0] && args[0].k === 'strv' ? args[0].v : null;
    if (label === null) throw new FaustError(`${name} expects a label string as first argument`, ast.pos);
    const nums = args.slice(1).map((a, i) => this.constEval(this.toBox(a, ast.args[i + 1]), ast.args[i + 1].pos));
    const shortLabel = label.replace(/\[[^\]]*\]/g, '').trim();
    if (kind === 'button' || kind === 'checkbox') {
      if (nums.length) throw new FaustError(`${name} only takes a label`, ast.pos);
      return mkBox('ui', { kind, prim: name, label: shortLabel, init: 0, min: 0, max: 1, step: 1 }, ast.pos);
    }
    if (kind === 'slider') {
      if (nums.length !== 4) throw new FaustError(`${name}("label", init, min, max, step) expects 4 numbers`, ast.pos);
      const [init, min, max, step] = nums;
      return mkBox('ui', { kind, prim: name, label: shortLabel, init, min, max, step }, ast.pos);
    }
    if (nums.length !== 2) throw new FaustError(`${name}("label", min, max) expects 2 numbers`, ast.pos);
    return mkBox('bar', { kind, prim: name, label: shortLabel, min: nums[0], max: nums[1] }, ast.pos);
  }

  constEval(box, pos) {
    if (box.ins !== 0 || box.outs !== 1) {
      throw new FaustError(`Expected a constant number here (got a block with ${box.ins} inputs and ${box.outs} outputs)`, pos);
    }
    const g = new Graph();
    const [sig] = propagate(box, [], g);
    inferTypes(g);
    const bad = g.nodes.find((n) => ['mem', '@', 'ui', 'in', 'bar'].includes(n.op));
    if (bad) throw new FaustError('Expected a constant number here (it must not depend on time or on the GUI)', pos);
    const sim = new Sim(g, { getInput: () => 0, getUI: () => 0 });
    sim.step();
    return sim.value(sig, 0);
  }
}

/* ----------------------------------------------------------- signal graph */

class Graph {
  constructor() { this.nodes = []; }
  add(op, args, extra) {
    const n = Object.assign({ id: this.nodes.length, op, args: args || [] }, extra || {});
    this.nodes.push(n);
    return n.id;
  }
}

function propagate(box, ins, g, slots) {
  slots = slots || new Map();
  let outs;
  switch (box.k) {
    case 'wire': outs = ins; break;
    case 'cut': outs = []; break;
    case 'num': outs = [g.add('num', [], { v: box.v, isInt: box.isInt, box })]; break;
    case 'prim': outs = [g.add(box.name, ins, { box })]; break;
    case 'ui': outs = [g.add('ui', [], { ui: box, box })]; break;
    case 'bar': outs = [g.add('bar', ins, { ui: box, box })]; break;
    case 'slot': {
      if (!slots.has(box.key)) throw new FaustError(`Parameter '${box.name}' used outside its function`, box.pos);
      outs = [slots.get(box.key)];
      break;
    }
    case 'seq': outs = propagate(box.b, propagate(box.a, ins, g, slots), g, slots); break;
    case 'par': {
      const o1 = propagate(box.a, ins.slice(0, box.a.ins), g, slots);
      const o2 = propagate(box.b, ins.slice(box.a.ins), g, slots);
      outs = o1.concat(o2);
      break;
    }
    case 'split': {
      const o1 = propagate(box.a, ins, g, slots);
      const bi = [];
      for (let j = 0; j < box.b.ins; j++) bi.push(o1[j % o1.length]);
      outs = propagate(box.b, bi, g, slots);
      break;
    }
    case 'merge': {
      const o1 = propagate(box.a, ins, g, slots);
      const m = box.b.ins;
      const merged = [];
      for (let j = 0; j < m; j++) {
        const list = o1.filter((_, i) => i % m === j);
        merged.push(list.length === 1 ? list[0] : g.add('sum', list, { box }));
      }
      box.mergeSigs = merged;
      outs = propagate(box.b, merged, g, slots);
      break;
    }
    case 'rec': {
      // Faust semantics: y = A(B(mem(y)), x) — the one-sample delay sits on
      // A's outputs, before B (where Faust draws its little delay sign).
      const D = [];
      for (let j = 0; j < box.b.ins; j++) D.push(g.add('mem', [null], { box, rec: true, recIndex: j }));
      const Z = propagate(box.b, D, g, slots);
      const y = propagate(box.a, Z.concat(ins), g, slots);
      D.forEach((d, j) => { g.nodes[d].args[0] = y[j]; });
      box.D = D; box.Z = Z;
      outs = y;
      break;
    }
    case 'group': outs = propagate(box.child, ins, g, slots); break;
    case 'abs': {
      const s2 = new Map(slots);
      box.slots.forEach((s, i) => s2.set(s.key, ins[i]));
      outs = propagate(box.body, ins.slice(box.slots.length), g, s2);
      break;
    }
    default: throw new Error('propagate: ' + box.k);
  }
  box.inSigs = ins;
  box.outSigs = outs;
  return outs;
}

/* ----------------------------------------------------------------- types */

const INT_RESULT = new Set(['<', '<=', '>', '>=', '==', '!=', '&', '|', 'xor', '<<', '>>', 'int']);
const FLOAT_RESULT = new Set(['/', 'float', 'sqrt', 'exp', 'log', 'log10', 'sin', 'cos', 'tan',
  'asin', 'acos', 'atan', 'atan2', 'pow', '^', 'fmod', 'ui', 'in', 'bar']);

function inferTypes(g) {
  const T = g.nodes.map((n) => (n.op === 'num' ? (n.isInt ? 'int' : 'float') : 'int'));
  const join = (...ts) => (ts.some((t) => t === 'float') ? 'float' : 'int');
  for (let iter = 0; iter < 50; iter++) {
    let changed = false;
    for (const n of g.nodes) {
      let t;
      const a = n.args.map((x) => T[x]);
      if (n.op === 'num') continue;
      if (INT_RESULT.has(n.op)) t = 'int';
      else if (FLOAT_RESULT.has(n.op)) t = 'float';
      else if (n.op === 'select2') t = join(a[1], a[2]);
      else if (n.op === 'mem' || n.op === '@' || n.op === 'attach') t = a[0];
      else if (n.op === 'abs' || n.op === 'floor' || n.op === 'ceil' || n.op === 'rint') t = n.op === 'abs' ? a[0] : 'float';
      else t = join(...a); // + - * % min max sum
      if (t !== T[n.id]) { T[n.id] = t; changed = true; }
    }
    if (!changed) break;
  }
  g.nodes.forEach((n, i) => { n.type = T[i]; });
}

/* ------------------------------------------------------------ evaluation */

const f32 = Math.fround;

class Sim {
  // History is kept for samples [base, len). Samples before `base` were
  // computed by a fast runner (see makeFastRunner); only the values that
  // delays need are still available, through `seed` ring buffers.
  constructor(g, io) {
    this.g = g;
    this.io = io;
    this.hist = g.nodes.map(() => []);
    this.base = 0;
    this.len = 0;
    this.seed = null;
  }
  value(id, n) { return n >= this.base ? this.hist[id][n - this.base] : undefined; }
  read(id, k) {
    if (k < 0) return 0;
    if (k >= this.base) return this.hist[id][k - this.base];
    const r = this.seed && this.seed.rings[id];
    return r ? r[k & this.seed.mask] : 0;
  }
  truncate(len) {
    if (len >= this.len) return;
    if (len < this.base) throw new Error('truncate below base');
    for (const h of this.hist) h.length = len - this.base;
    this.len = len;
  }
  // Continue from sample `n`, given the ring buffers of a fast runner that computed [0, n).
  rebase(n, runner) {
    this.hist = this.g.nodes.map(() => []);
    this.base = n; this.len = n;
    this.seed = n > 0 ? { rings: runner.rings, mask: runner.mask } : null;
  }
  step() {
    const n = this.len;
    for (let i = 0; i < this.g.nodes.length; i++) this.eval(i, n);
    this.len++;
  }
  ensure(len) { while (this.len < len) this.step(); }

  eval(id, n) {
    const h = this.hist[id];
    const at = n - this.base;
    if (h.length > at) return h[at];
    const node = this.g.nodes[id];
    const isInt = node.type === 'int';
    const A = (k) => this.eval(node.args[k], n);
    let r;
    switch (node.op) {
      case 'num': r = node.v; break;
      case 'in': r = this.io.getInput(node.ch, n); break;
      case 'ui': r = this.io.getUI(node.ui, n); break;
      case 'bar': case 'attach': r = A(0); if (node.op === 'attach') A(1); break;
      case 'mem': r = n === 0 ? 0 : this.read(node.args[0], n - 1); break;
      case '@': {
        let d = Math.trunc(A(1));
        if (!(d >= 0)) d = 0;
        const idx = n - d;
        r = idx < 0 ? 0 : (idx === n ? A(0) : this.read(node.args[0], idx));
        break;
      }
      case '+': r = A(0) + A(1); break;
      case '-': r = A(0) - A(1); break;
      case '*': r = isInt ? Math.imul(A(0), A(1)) : A(0) * A(1); break;
      case '/': r = A(0) / A(1); break;
      case '%': { const a = A(0), b = A(1); r = isInt ? (b === 0 ? 0 : a % b) : a % b; break; }
      case '^': case 'pow': r = Math.pow(A(0), A(1)); break;
      case '<': r = A(0) < A(1) ? 1 : 0; break;
      case '<=': r = A(0) <= A(1) ? 1 : 0; break;
      case '>': r = A(0) > A(1) ? 1 : 0; break;
      case '>=': r = A(0) >= A(1) ? 1 : 0; break;
      case '==': r = A(0) === A(1) ? 1 : 0; break;
      case '!=': r = A(0) !== A(1) ? 1 : 0; break;
      case '&': r = A(0) & A(1); break;
      case '|': r = A(0) | A(1); break;
      case 'xor': r = A(0) ^ A(1); break;
      case '<<': r = A(0) << A(1); break;
      case '>>': r = A(0) >> A(1); break;
      case 'int': r = Math.trunc(A(0)); break;
      case 'float': r = A(0); break;
      case 'abs': r = Math.abs(A(0)); break;
      case 'floor': r = Math.floor(A(0)); break;
      case 'ceil': r = Math.ceil(A(0)); break;
      case 'rint': r = Math.round(A(0)); break;
      case 'sqrt': r = Math.sqrt(A(0)); break;
      case 'exp': r = Math.exp(A(0)); break;
      case 'log': r = Math.log(A(0)); break;
      case 'log10': r = Math.log10(A(0)); break;
      case 'sin': r = Math.sin(A(0)); break;
      case 'cos': r = Math.cos(A(0)); break;
      case 'tan': r = Math.tan(A(0)); break;
      case 'asin': r = Math.asin(A(0)); break;
      case 'acos': r = Math.acos(A(0)); break;
      case 'atan': r = Math.atan(A(0)); break;
      case 'atan2': r = Math.atan2(A(0), A(1)); break;
      case 'fmod': r = A(0) % A(1); break;
      case 'min': r = Math.min(A(0), A(1)); break;
      case 'max': r = Math.max(A(0), A(1)); break;
      case 'select2': { const s = A(0); const a = A(1), b = A(2); r = Math.trunc(s) === 0 ? a : b; break; }
      case 'sum': r = node.args.reduce((s, _, k) => s + A(k), 0); break;
      default: throw new Error('eval: ' + node.op);
    }
    if (isInt) r = Number.isFinite(r) ? (r | 0) : 0;
    else r = f32(r);
    h[at] = r;
    return r;
  }
}

/* ------------------------------------------------------------ fast runner */

// Compiles the signal graph to a straight-line JavaScript loop (same int32 /
// float32 semantics as Sim.eval) that only keeps ring buffers for delayed
// signals. Used to jump to very large n (e.g. 2^31 to show int overflow).
// Returns null when the graph cannot be ordered (should not happen in Faust).
const VAR_DELAY_MAX = 1 << 16;

function topoOrder(g) {
  const N = g.nodes.length, mark = new Uint8Array(N), order = [];
  const deps = (n) => (n.op === 'mem' ? [] : n.args);
  for (let r = 0; r < N; r++) {
    if (mark[r]) continue;
    const stack = [[r, 0]];
    mark[r] = 1;
    while (stack.length) {
      const top = stack[stack.length - 1];
      const d = deps(g.nodes[top[0]]);
      if (top[1] < d.length) {
        const c = d[top[1]++];
        if (mark[c] === 1) return null;
        if (!mark[c]) { mark[c] = 1; stack.push([c, 0]); }
      } else { mark[top[0]] = 2; order.push(top[0]); stack.pop(); }
    }
  }
  return order;
}

function makeFastRunner(g, io, opts) {
  const order = topoOrder(g);
  if (!order) return null;
  const needRing = new Set();
  let maxDelay = 1;
  for (const n of g.nodes) {
    if (n.op === 'mem') needRing.add(n.args[0]);
    if (n.op === '@') {
      needRing.add(n.args[0]);
      const dn = g.nodes[n.args[1]];
      maxDelay = Math.max(maxDelay, dn.op === 'num' ? Math.max(0, Math.trunc(dn.v)) : VAR_DELAY_MAX);
    }
  }
  let size = 1;
  while (size < Math.max(maxDelay + 1, (opts && opts.window) || 0, 2)) size <<= 1;
  const mask = size - 1;
  // Values are exact int32 / float32, so typed rings lose nothing (and are ~3x faster).
  const rings = g.nodes.map((n) => (!needRing.has(n.id) ? null
    : n.type === 'int' ? new Int32Array(size) : new Float32Array(size)));
  const uiVals = g.nodes.map((n) => (n.op === 'ui' ? io.getUI(n.ui, 0) : 0));

  const v = (i) => 'v' + i;
  const lines = [];
  for (const id of order) {
    const n = g.nodes[id];
    const a = n.args.map(v);
    const isInt = n.type === 'int';
    let e;
    switch (n.op) {
      case 'num': e = String(n.v); break;
      case 'in': e = `inp(${n.ch}, n)`; break;
      case 'ui': e = `ui[${id}]`; break;
      case 'bar': case 'attach': case 'float': e = a[0]; break;
      // Unwritten ring slots are 0, which is exactly the value before n = 0.
      case 'mem': e = `r${n.args[0]}[(k - 1) & ${mask}]`; break;
      case '@':
        lines.push(`let d${id} = Math.trunc(${a[1]}); if (!(d${id} >= 0)) d${id} = 0; if (d${id} > ${mask}) d${id} = ${mask};`);
        e = `(d${id} === 0 ? ${a[0]} : r${n.args[0]}[(k - d${id}) & ${mask}])`;
        break;
      case '+': e = `${a[0]} + ${a[1]}`; break;
      case '-': e = `${a[0]} - ${a[1]}`; break;
      case '*': e = isInt ? `Math.imul(${a[0]}, ${a[1]})` : `${a[0]} * ${a[1]}`; break;
      case '/': e = `${a[0]} / ${a[1]}`; break;
      case '%': e = isInt ? `(${a[1]} === 0 ? 0 : ${a[0]} % ${a[1]})` : `${a[0]} % ${a[1]}`; break;
      case 'fmod': e = `${a[0]} % ${a[1]}`; break;
      case '^': case 'pow': e = `Math.pow(${a[0]}, ${a[1]})`; break;
      case '<': case '<=': case '>': case '>=': e = `(${a[0]} ${n.op} ${a[1]} ? 1 : 0)`; break;
      case '==': e = `(${a[0]} === ${a[1]} ? 1 : 0)`; break;
      case '!=': e = `(${a[0]} !== ${a[1]} ? 1 : 0)`; break;
      case '&': case '|': case '<<': case '>>': e = `(${a[0]} ${n.op} ${a[1]})`; break;
      case 'xor': e = `(${a[0]} ^ ${a[1]})`; break;
      case 'int': e = `Math.trunc(${a[0]})`; break;
      case 'rint': e = `Math.round(${a[0]})`; break;
      case 'abs': case 'floor': case 'ceil': case 'sqrt': case 'exp': case 'log': case 'log10':
      case 'sin': case 'cos': case 'tan': case 'asin': case 'acos': case 'atan':
        e = `Math.${n.op}(${a[0]})`; break;
      case 'atan2': case 'min': case 'max': e = `Math.${n.op}(${a[0]}, ${a[1]})`; break;
      case 'select2': e = `(Math.trunc(${a[0]}) === 0 ? ${a[1]} : ${a[2]})`; break;
      case 'sum': e = a.join(' + '); break;
      default: return null;
    }
    lines.push(`const ${v(id)} = ${isInt ? `((${e}) | 0)` : `f32(${e})`};`);
    if (rings[id]) lines.push(`r${id}[k] = ${v(id)};`);
  }
  const ringDecl = rings.map((r, i) => (r ? `const r${i} = R[${i}];` : '')).join('\n');
  const body = `${ringDecl}
return function run(n0, n1) {
  // n may exceed int32: ring positions use a separate int32 index k.
  let k = n0 % ${size};
  for (let n = n0; n < n1; n++) {
    ${lines.join('\n    ')}
    k = (k + 1) & ${mask};
  }
};`;
  // eslint-disable-next-line no-new-func
  const run = new Function('R', 'inp', 'ui', 'f32', body)(rings, (ch, n) => io.getInput(ch, n), uiVals, Math.fround);
  return { run, rings, mask };
}

/* --------------------------------------------------------------- compile */

function compile(src, opts) {
  opts = opts || {};
  boxUid = 0;
  const prelude = new Parser(PRELUDE).program();
  const user = new Parser(src).program();
  const ex = new Expander(src, opts);
  const preEnv = ex.scope(prelude, null, false);
  // The prelude is parsed from its own source: keep labels sane.
  const userEnv = ex.scope(user, preEnv, true);
  if (!userEnv.map.has('process')) throw new FaustError("No 'process' definition found", { line: 1, col: 1 });
  const procDef = userEnv.map.get('process').def;
  if (procDef.params.length) throw new FaustError("'process' cannot have parameters", procDef.pos);
  let box = ex.toBox(ex.expand(procDef.body, userEnv), procDef.body);
  if (box.k === 'group' && box.name === 'process') box = box.child;

  const g = new Graph();
  const inSigs = [];
  for (let c = 0; c < box.ins; c++) inSigs.push(g.add('in', [], { ch: c }));
  const outSigs = propagate(box, inSigs, g);
  inferTypes(g);

  const uis = [];
  const seen = new Map();
  for (const n of g.nodes) {
    if (n.op !== 'ui' && n.op !== 'bar') continue;
    const key = n.ui.prim + ':' + n.ui.label;
    if (!seen.has(key)) { seen.set(key, { key, ...n.ui, nodes: [] }); uis.push(seen.get(key)); }
    seen.get(key).nodes.push(n.id);
    n.uiKey = key;
  }
  return { box, graph: g, inSigs, outSigs, uis };
}

function formatValue(v, type, full) {
  if (v === undefined || v === null) return '';
  if (Number.isNaN(v)) return 'nan';
  if (v === Infinity) return 'inf';
  if (v === -Infinity) return '-inf';
  if (type === 'int') return String(v);
  if (full) return String(parseFloat(v.toPrecision(9)));
  const s = String(parseFloat(v.toPrecision(6)));
  return /[.e]/.test(s) ? s : s + '.0';
}

const api = { FaustError, lex, Parser, compile, Sim, makeFastRunner, Graph, propagate, inferTypes, formatValue, PRIMS };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
else root.FaustCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
