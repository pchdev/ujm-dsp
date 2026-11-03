/* Faust stepper — user interface. */
(function () {
'use strict';
const { compile, Sim, makeFastRunner, formatValue, FaustError } = window.FaustCore;

const WINDOW = 300;        // samples kept (table rows, wire values) after a big jump
const SLOW_LIMIT = 20000;  // jumps longer than this use the compiled fast runner
const MAX_N = 1e10;        // ~15 s of computation; enough for int32 overflow (2^31)
const CHUNK = 2e7;         // samples per chunk between progress updates
const { render, layoutLabel } = window.FaustDiagram;

const EXAMPLES = [
  ['Counter: (_ + 1) ~ _', `// We connect the signal '1' and an empty signal
// to the operator '+'. The output of '+' is fed
// back to its first input, one sample later.
process = (_ + 1) ~ _;
//        (  A  ) ~ B
`],
  ['Counter: +(1) ~ _', 'process = +(1) ~ _;\n'],
  ['Feedback through B: _ ~ +(1)', `// Here B = +(1) is in the feedback path:
// y(n) = y(n-1) + 1
process = _ ~ +(1);
`],
  ['Modulo counter', `counter(n) = ((_ + 1) % n) ~ _;

process = counter(4);
`],
  ['Counter with increment & limit', `counter(i, n) = ((_ + i) % n) ~ _;

process = counter(0.25, 1.0);
`],
  ['Counter driven by a button', `// Toggle "play" in the Controls panel,
// then step: the counter only moves while it's on.
counter(i, n) = ((_ + i) % n) ~ _;

process = counter(button("play"), 8);
`],
  ['Bad counter: int overflow', `// From counter_samples.dsp. In bad_counter the modulo is applied
// *after* the recursion, so 'increment' grows forever and overflows
// int32 at n = 2147483647 (2^31 - 1). counter is the correct version.
//
// Type n = 2147483640 in the box above, then step forward.
increment = (_ + 1) ~ _;
bad_counter = increment % 48000;

counter = ((_ + 1) % 48000) ~ _;

process = bad_counter, counter;
`],
  ['Accumulator: + ~ _', `// y(n) = x(n) + y(n-1)
// Try it with the "step" or "ramp" input.
process = + ~ _;
`],
  ['Decay: + ~ *(0.5)', `// y(n) = x(n) + 0.5 * y(n-1)
process = + ~ *(0.5);
`],
  ['One-pole lowpass', `// y(n) = (1-a) * x(n) + a * y(n-1)
a = 0.75;
process = *(1 - a) : + ~ *(a);
`],
  ['Fibonacci', `// impulse = 1, 0, 0, 0, ...
impulse = 1 - 1';

// y(n) = x(n) + y(n-1) + y(n-2)
process = impulse : + ~ (_ <: _ + _');
`],
  ['Average of two samples (mem)', `// No recursion: mem delays by one sample.
process = _ <: _, mem :> /(2);
`],
  ['Delay line: @', `// x @ 3 is x delayed by 3 samples.
process = _ @ 3;
`],
  ['Feedback delay', `// n: delay length (in samples)
// f: feedback coefficient
dfb(n, f, x) = (x + (_ * f)) @ n ~ _;

process = dfb(2, 0.5);
`],
  ['Two counters in parallel', `counter(i, n) = ((_ + i) % n) ~ _;

process = counter(1, 3), counter(1, 5);
`],
];

const INPUT_TYPES = [
  ['impulse', 'Impulse 1, 0, 0, …'],
  ['step', 'Step 1, 1, 1, …'],
  ['ramp', 'Ramp 0, 1, 2, …'],
  ['alt', 'Alternating 1, -1, …'],
  ['sine', 'Sine (period 8)'],
  ['zero', 'Silence 0, 0, …'],
  ['custom', 'Custom list…'],
];
const WATCH_COLORS = ['#d33682', '#2aa198', '#b58900', '#6c71c4', '#cb4b16', '#859900', '#268bd2', '#dc322f'];

const $ = (id) => document.getElementById(id);
const el = {
  code: $('code'), error: $('error'), diagram: $('diagram'), table: $('table'), tableWrap: $('table-wrap'),
  n: $('n'), inputs: $('inputs'), inputsBox: $('inputs-box'), ui: $('ui'), uiBox: $('ui-box'),
  tip: $('tip'), examples: $('examples'), guess: $('guess'), play: $('play'), speed: $('speed'),
  speedV: $('speed-v'), codeView: $('code-view'),
};

const state = {
  compiled: null, sim: null, n: 0,
  watches: [], userWatchSigs: [],
  guess: false, revealed: new Set(),
  inputs: [], ui: new Map(),
  opts: { groups: true, showConst: false, full: false, sr: 48000 },
  zoom: null, svgSize: null, playTimer: null,
};

/* ---------------------------------------------------------- utilities */

function store(key, val) { try { localStorage.setItem('faust-stepper:' + key, val); } catch (e) { /* ignore */ } }
function load(key) { try { return localStorage.getItem('faust-stepper:' + key); } catch (e) { return null; } }

function parseHash() {
  const h = location.hash.replace(/^#/, '');
  const out = {};
  for (const part of h.split('&')) {
    if (!part) continue;
    const i = part.indexOf('=');
    const k = i < 0 ? part : part.slice(0, i);
    out[k] = i < 0 ? '1' : decodeURIComponent(part.slice(i + 1));
  }
  return out;
}

function inputValue(spec, n) {
  switch (spec.type) {
    case 'impulse': return n === 0 ? 1 : 0;
    case 'step': return 1;
    case 'ramp': return n;
    case 'alt': return n % 2 === 0 ? 1 : -1;
    case 'sine': return Math.sin(2 * Math.PI * n / 8);
    case 'zero': return 0;
    case 'custom': {
      const list = spec.list || [];
      if (spec.repeat && list.length) return list[n % list.length];
      return n < list.length ? list[n] : 0;
    }
    default: return 0;
  }
}
function parseCustom(spec) {
  const txt = spec.custom || '';
  spec.repeat = /\.\.\.|…/.test(txt);
  spec.list = txt.replace(/\.\.\.|…/g, ' ').split(/[\s,;]+/).filter(Boolean).map(Number).filter((v) => !Number.isNaN(v));
}

const nodeOf = (sig) => state.compiled.graph.nodes[sig];
const isConstSig = (sig) => ['num', 'in', 'ui'].includes(nodeOf(sig).op); // given, never guessed
function fmt(sig, n) {
  if (!state.sim || n >= state.sim.len) return '';
  return formatValue(state.sim.value(sig, n), nodeOf(sig).type, state.opts.full);
}

/* ------------------------------------------------------- signal names */

function describe(sig) {
  const c = state.compiled;
  const node = nodeOf(sig);
  const outIdx = c.outSigs.indexOf(sig);
  const parts = [];
  if (outIdx >= 0) parts.push(`output ${outIdx} of process`);
  switch (node.op) {
    case 'in': parts.push(`input ${node.ch} of process`); break;
    case 'num': parts.push(`constant ${node.box.text}`); break;
    case 'mem': parts.push(node.rec
      ? 'output of the z⁻¹ (one-sample delay) of a recursion: the fed-back value from sample n−1'
      : 'output of mem: its input one sample earlier'); break;
    case 'ui': parts.push(`${node.ui.prim}("${node.ui.label}")`); break;
    case 'bar': parts.push(`${node.ui.prim}("${node.ui.label}")`); break;
    case 'sum': parts.push('sum of the signals merged by :>'); break;
    case '@': parts.push('output of @ (variable delay)'); break;
    default: if (outIdx < 0) parts.push(`output of '${node.op}'`);
  }
  return parts.join(' — ') + ` (${node.type})`;
}

function shortNames() {
  const c = state.compiled;
  const names = new Map();
  const count = new Map();
  const recs = c.graph.nodes.filter((n) => n.op === 'mem' && n.rec).map((n) => n.id);
  const base = (sig) => {
    const node = nodeOf(sig);
    const o = c.outSigs.indexOf(sig);
    if (o >= 0) return `out${o}`;
    if (node.op === 'in') return `in${node.ch}`;
    if (node.op === 'mem' && node.rec) return recs.length > 1 ? `z⁻¹ #${recs.indexOf(sig) + 1}` : 'z⁻¹';
    if (node.op === 'ui' || node.op === 'bar') return node.ui.label;
    if (node.op === 'num') return node.box.text;
    if (node.op === 'sum') return ':> sum';
    return node.op;
  };
  return (sig) => {
    if (names.has(sig)) return names.get(sig);
    let b = base(sig);
    const k = (count.get(b) || 0) + 1;
    count.set(b, k);
    if (k > 1) b = `${b} (${k})`;
    names.set(sig, b);
    return b;
  };
}

/* ------------------------------------------------------------ compile */

let compileTimer = null;
function scheduleCompile() {
  clearTimeout(compileTimer);
  compileTimer = setTimeout(doCompile, 250);
}

function doCompile() {
  const src = el.code.value;
  if (!state.embed) store('code', src); // slides must not overwrite a student's own code
  el.codeView.textContent = src.trim();
  let c;
  try {
    c = compile(src, { sr: state.opts.sr });
  } catch (e) {
    showError(e);
    return;
  }
  hideError();
  const prevUserWatches = state.compiled ? [] : state.userWatchSigs;
  state.compiled = c;
  state.userWatchSigs = prevUserWatches;
  state.revealed.clear();
  setupInputs();
  setupUI();
  buildDiagram();
  defaultWatches();
  resetSim();
}

function showError(e) {
  let msg = e.message || String(e);
  if (e instanceof FaustError && e.pos) msg = `Line ${e.pos.line}, column ${e.pos.col}: ${msg}`;
  else if (!(e instanceof FaustError)) { msg = 'Internal error: ' + msg; console.error(e); }
  el.error.textContent = msg;
  el.error.hidden = false;
  el.diagram.classList.add('stale');
}
function hideError() {
  el.error.hidden = true;
  el.diagram.classList.remove('stale');
}

const io = {
  getInput: (ch, n) => inputValue(state.inputs[ch], n),
  getUI: (ui) => {
    const key = ui.prim + ':' + ui.label;
    return state.ui.has(key) ? state.ui.get(key) : ui.init;
  },
};

function resetSim() {
  state.sim = null;
  goTo(state.n, true);
}

// Makes sure sample n is computed. Small steps use the interpreter, which
// keeps every value; big jumps (or going back before the kept window) run
// the compiled fast runner from 0 and keep only the last WINDOW samples.
// Returns true when done synchronously, otherwise a Promise resolving to
// false if the user cancelled.
function computeTo(n, fresh) {
  const g = state.compiled.graph;
  const sim = fresh || !state.sim ? new Sim(g, io) : state.sim;
  if (n >= sim.base && n + 1 - sim.len <= SLOW_LIMIT) {
    sim.ensure(n + 1);
    state.sim = sim;
    return true;
  }
  return bigJump(n, sim);
}

async function bigJump(n, sim) {
  const g = state.compiled.graph;
  const start = Math.max(0, n + 1 - WINDOW);
  const runner = makeFastRunner(g, io, { window: WINDOW + 2 });
  if (!runner) { // cannot happen with valid Faust code; fall back to the (slow) interpreter
    if (n < sim.base) sim = new Sim(g, io);
    sim.ensure(n + 1);
    state.sim = sim;
    return true;
  }
  const token = {};
  state.busy = token;
  setBusy(0);
  try {
    for (let a = 0; a < start; a += CHUNK) {
      runner.run(a, Math.min(a + CHUNK, start));
      setBusy(Math.min(1, (a + CHUNK) / start));
      await new Promise((r) => setTimeout(r, 0));
      if (state.busy !== token) return false;
    }
  } finally {
    if (state.busy === token) { state.busy = null; setBusy(null); }
  }
  const s2 = new Sim(g, io);
  s2.rebase(start, runner);
  s2.ensure(n + 1);
  state.sim = s2;
  return true;
}

function setBusy(frac) {
  const b = $('busy');
  if (frac === null) { b.hidden = true; return; }
  b.hidden = false;
  $('busy-p').value = frac;
  $('busy-t').textContent = `Computing… ${Math.floor(frac * 100)}%`;
}

/* ------------------------------------------------------------- inputs */

function setupInputs() {
  const c = state.compiled;
  const nIn = c.box.ins;
  while (state.inputs.length < nIn) {
    state.inputs.push({ type: state.inputs.length === 0 && state.initialInput ? state.initialInput : 'impulse', custom: '1, 2, 3' });
  }
  el.inputsBox.hidden = nIn === 0;
  el.inputs.innerHTML = '';
  for (let ch = 0; ch < nIn; ch++) {
    const spec = state.inputs[ch];
    const row = document.createElement('div');
    row.className = 'row';
    const name = document.createElement('span');
    name.className = 'name'; name.textContent = `in${ch}`;
    const sel = document.createElement('select');
    sel.setAttribute('aria-label', `Signal for input ${ch}`);
    for (const [v, t] of INPUT_TYPES) {
      const o = document.createElement('option'); o.value = v; o.textContent = t; sel.appendChild(o);
    }
    sel.value = spec.type;
    const txt = document.createElement('input');
    txt.type = 'text'; txt.value = spec.custom; txt.hidden = spec.type !== 'custom';
    txt.placeholder = 'e.g. 1, 2, 3 (add ... to repeat)';
    txt.setAttribute('aria-label', `Custom values for input ${ch}`);
    sel.addEventListener('change', () => {
      spec.type = sel.value; txt.hidden = spec.type !== 'custom';
      parseCustom(spec); restartFromZero();
    });
    txt.addEventListener('input', () => { spec.custom = txt.value; parseCustom(spec); restartFromZero(); });
    parseCustom(spec);
    row.append(name, sel, txt);
    el.inputs.appendChild(row);
  }
}

// Inputs changed: history is no longer valid, recompute up to the current n.
function restartFromZero() {
  goTo(state.n, true);
}

/* ----------------------------------------------------------- controls */

function setupUI() {
  const { uis } = state.compiled;
  el.uiBox.hidden = uis.length === 0;
  el.ui.innerHTML = '';
  for (const u of uis) {
    const row = document.createElement('div');
    row.className = 'ui-row';
    const name = document.createElement('span');
    name.className = 'ui-name'; name.textContent = `${u.prim}("${u.label}")`;
    const val = document.createElement('span');
    val.className = 'ui-val'; val.dataset.key = u.key;
    row.append(name, val);
    if (!state.ui.has(u.key) && u.kind !== 'bargraph') state.ui.set(u.key, u.init);
    if (u.kind === 'button' || u.kind === 'checkbox') {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'toggle';
      const sync = () => {
        const on = state.ui.get(u.key) === 1;
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.textContent = u.kind === 'button' ? (on ? 'Pressed (1)' : 'Released (0)') : (on ? 'Checked (1)' : 'Unchecked (0)');
      };
      b.addEventListener('click', () => { state.ui.set(u.key, state.ui.get(u.key) === 1 ? 0 : 1); sync(); uiChanged(); });
      sync();
      row.appendChild(b);
      if (u.kind === 'button') name.title = 'A button stays pressed while you step, so you can see what happens sample by sample.';
    } else if (u.kind === 'slider') {
      const r = document.createElement('input');
      r.type = 'range'; r.min = u.min; r.max = u.max; r.step = u.step || 'any'; r.value = state.ui.get(u.key);
      r.setAttribute('aria-label', u.label);
      r.addEventListener('input', () => { state.ui.set(u.key, parseFloat(r.value)); uiChanged(); });
      row.appendChild(r);
    } else {
      const m = document.createElement('div');
      m.className = 'meter'; m.innerHTML = '<div></div>'; m.dataset.key = u.key;
      row.appendChild(m);
    }
    el.ui.appendChild(row);
  }
}

// A control moved: keep the past, recompute the current sample with the new value.
function uiChanged() {
  state.sim.truncate(state.n);
  state.sim.ensure(state.n + 1);
  update();
}

function updateUIValues() {
  const n = state.n;
  for (const u of state.compiled.uis) {
    const valEl = el.ui.querySelector(`.ui-val[data-key="${CSS.escape(u.key)}"]`);
    let v;
    if (u.kind === 'bargraph') {
      v = state.sim.value(u.nodes[0], n);
      const m = el.ui.querySelector(`.meter[data-key="${CSS.escape(u.key)}"] > div`);
      if (m) m.style.width = `${Math.max(0, Math.min(1, (v - u.min) / ((u.max - u.min) || 1))) * 100}%`;
    } else v = state.ui.get(u.key);
    if (valEl) valEl.textContent = formatValue(v, u.kind === 'bargraph' ? 'float' : 'float', state.opts.full);
  }
}

/* ------------------------------------------------------------ diagram */

function buildDiagram() {
  const { svg, width, height } = render(state.compiled, { groups: state.opts.groups });
  el.diagram.innerHTML = svg;
  state.svgSize = { width, height };
  applyZoom();
}

function fitScale() {
  const { width, height } = state.svgSize;
  const cw = el.diagram.clientWidth - 18, ch = el.diagram.clientHeight - 18;
  return Math.max(0.5, Math.min(cw / width, ch > 80 ? ch / height : Infinity, 4));
}
function applyZoom() {
  const svg = el.diagram.querySelector('svg');
  if (!svg || !state.svgSize) return;
  const s = state.zoom || fitScale();
  svg.setAttribute('width', Math.round(state.svgSize.width * s));
  svg.setAttribute('height', Math.round(state.svgSize.height * s));
}

/* ------------------------------------------------------------- watches */

function defaultWatches() {
  const c = state.compiled;
  const sigs = [];
  const add = (s) => { if (s !== undefined && !sigs.includes(s)) sigs.push(s); };
  c.inSigs.forEach(add);
  c.uis.forEach((u) => u.nodes.forEach(add));
  c.graph.nodes.filter((n) => n.op === 'mem' && n.rec).forEach((n) => add(n.id));
  c.outSigs.forEach(add);
  state.userWatchSigs.forEach(add);
  const name = shortNames();
  state.watches = sigs.map((sig, i) => ({ sig, name: name(sig), color: WATCH_COLORS[i % WATCH_COLORS.length] }));
  state.nameOf = name;
}

function toggleWatch(sig) {
  const i = state.watches.findIndex((w) => w.sig === sig);
  if (i >= 0) state.watches.splice(i, 1);
  else {
    const used = new Set(state.watches.map((w) => w.color));
    const color = WATCH_COLORS.find((c) => !used.has(c)) || WATCH_COLORS[state.watches.length % WATCH_COLORS.length];
    state.watches.push({ sig, name: state.nameOf(sig), color });
  }
  update();
}

/* -------------------------------------------------------------- update */

function update() {
  if (!state.compiled || !state.sim) return;
  const n = state.n;
  if (document.activeElement !== el.n) el.n.value = n;
  const svg = el.diagram.querySelector('svg');
  if (svg) {
    const watched = new Map(state.watches.map((w) => [w.sig, w.color]));
    svg.querySelectorAll('line.w').forEach((l) => {
      const s = +l.dataset.sig;
      const c = watched.get(s);
      l.classList.toggle('watched', !!c);
      l.style.stroke = c || '';
    });
    svg.querySelectorAll('g.val').forEach((g) => {
      const sig = +g.dataset.sig;
      const kind = g.classList.contains('val-num') ? 'num' : '';
      const hide = kind === 'num' && !state.opts.showConst;
      g.classList.toggle('hidden', hide);
      if (hide) return;
      const guessing = state.guess && !isConstSig(sig) && !state.revealed.has(sig);
      let text = guessing ? '?' : fmt(sig, n);
      if (g.dataset.name) text = `${g.dataset.name}: ${text}`;
      const old = g.dataset.text;
      layoutLabel(g, text);
      g.dataset.text = text;
      g.classList.toggle('guess', guessing);
      const changed = !guessing && n > state.sim.base && old !== undefined && old !== text && state.sim.value(sig, n) !== state.sim.value(sig, n - 1);
      g.classList.remove('changed');
      if (changed) { void g.getBBox(); g.classList.add('changed'); }
      const rect = g.querySelector('rect');
      const c = watched.get(sig);
      rect.style.stroke = c || '';
      rect.style.strokeWidth = c ? '0.6' : '';
    });
  }
  updateUIValues();
  renderTable();
  el.play.textContent = state.playTimer ? 'Pause' : 'Play';
  el.play.classList.toggle('on', !!state.playTimer);
}

function renderTable() {
  const n = state.n;
  const cols = state.watches;
  const parts = ['<thead><tr><th class="nh" scope="col">n</th>'];
  for (const w of cols) {
    parts.push(`<th scope="col" data-sig="${w.sig}" title="${escapeHtml(describe(w.sig))} — click to remove">` +
      `<span class="sw" style="background:${w.color}"></span>${escapeHtml(w.name)}</th>`);
  }
  parts.push('</tr></thead><tbody>');
  const first = Math.max(state.sim.base, n - 299);
  for (let k = first; k <= n; k++) {
    parts.push(`<tr data-n="${k}"${k === n ? ' class="cur"' : ''}><td class="nc">${k}</td>`);
    for (const w of cols) {
      const guessing = k === n && state.guess && !isConstSig(w.sig) && !state.revealed.has(w.sig);
      parts.push(guessing ? `<td class="qm" data-sig="${w.sig}" title="Click to reveal">?</td>` : `<td>${escapeHtml(fmt(w.sig, k))}</td>`);
    }
    parts.push('</tr>');
  }
  parts.push('</tbody>');
  el.table.innerHTML = parts.join('');
  scrollTableToEnd();
}

// The current sample is always the last row: keep it in view.
function scrollTableToEnd() { el.tableWrap.scrollTop = el.tableWrap.scrollHeight; }

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ----------------------------------------------------------- stepping */

function goTo(n, fresh) {
  if (!state.compiled || (state.busy && !fresh)) return;
  if (fresh) state.busy = null; // a recompilation cancels a running jump
  n = Math.min(MAX_N, Math.max(0, Math.floor(n) || 0));
  state.want = n;
  let r;
  try { r = computeTo(n, fresh); } catch (e) { showError(e); return; }
  if (r === true) { arrive(n); return; }
  r.then((done) => {
    if (done) arrive(n); else { state.want = null; update(); }
  }, showError);
}

function arrive(n) {
  if (n !== state.n) state.revealed.clear();
  state.n = n;
  if (state.want === n) state.want = null;
  update();
}
// Target of relative moves: includes a step that is still being computed, so
// fast repeated clicks / key presses all count.
const cur = () => (state.want ?? state.n);

function togglePlay() {
  if (state.playTimer) { clearInterval(state.playTimer); state.playTimer = null; update(); return; }
  const rate = +el.speed.value;
  state.playTimer = setInterval(() => goTo(cur() + 1), 1000 / rate);
  update();
}

/* ------------------------------------------------------------- events */

function sigFromEvent(e) {
  const t = e.target.closest('[data-sig]');
  if (!t || !el.diagram.contains(t)) return null;
  const s = +t.dataset.sig;
  return Number.isNaN(s) ? null : { sig: s, el: t };
}

function highlight(sig) {
  el.diagram.querySelectorAll('line.w.hl').forEach((l) => l.classList.remove('hl'));
  if (sig === null) return;
  el.diagram.querySelectorAll(`line.w[data-sig="${sig}"]`).forEach((l) => l.classList.add('hl'));
}

function showTip(e, sig) {
  const n = state.n;
  const guessing = state.guess && !isConstSig(sig) && !state.revealed.has(sig);
  const now = guessing ? '?' : fmt(sig, n);
  const prev = n > 0 ? fmt(sig, n - 1) : null;
  const watched = state.watches.some((w) => w.sig === sig);
  el.tip.innerHTML = `${escapeHtml(describe(sig))}<br>` +
    `at n = ${n}: <b>${escapeHtml(now)}</b>` +
    (prev !== null && !guessing ? ` &nbsp;·&nbsp; at n = ${n - 1}: <b>${escapeHtml(prev)}</b>` : '') +
    `<br><span style="opacity:.75">${guessing ? 'click the ? to reveal' : (watched ? 'click to remove from the table' : 'click to add to the table')}</span>`;
  el.tip.hidden = false;
  const x = Math.min(e.clientX + 14, window.innerWidth - el.tip.offsetWidth - 8);
  const y = Math.min(e.clientY + 14, window.innerHeight - el.tip.offsetHeight - 8);
  el.tip.style.left = x + 'px';
  el.tip.style.top = y + 'px';
}

function bind() {
  for (const [name, code] of EXAMPLES) {
    const o = document.createElement('option'); o.textContent = name; o.value = code; el.examples.appendChild(o);
  }
  const custom = document.createElement('option');
  custom.textContent = '(your code)'; custom.value = ''; custom.disabled = true;
  el.examples.prepend(custom);

  el.examples.addEventListener('change', () => {
    if (!el.examples.value) return;
    el.code.value = el.examples.value;
    state.n = 0; state.inputs = []; state.ui.clear(); state.zoom = null; state.compiled = null; state.userWatchSigs = [];
    doCompile();
  });
  el.code.addEventListener('input', () => { el.examples.selectedIndex = 0; scheduleCompile(); });
  el.code.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const s = el.code.selectionStart, t = el.code.selectionEnd;
      el.code.setRangeText('    ', s, t, 'end');
      scheduleCompile();
    }
  });

  $('reset').addEventListener('click', () => goTo(0));
  $('back').addEventListener('click', () => goTo(cur() - 1));
  $('fwd').addEventListener('click', () => goTo(cur() + 1));
  $('fwd10').addEventListener('click', () => goTo(cur() + 10));
  el.n.addEventListener('change', () => goTo(+el.n.value));
  el.n.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); goTo(+el.n.value); } });
  el.n.addEventListener('blur', () => { el.n.value = state.n; });
  $('busy-cancel').addEventListener('click', () => { state.busy = null; setBusy(null); update(); });
  el.play.addEventListener('click', togglePlay);
  el.speed.addEventListener('input', () => {
    el.speedV.textContent = `${el.speed.value}/s`;
    if (state.playTimer) { togglePlay(); togglePlay(); }
  });
  el.guess.addEventListener('change', () => { state.guess = el.guess.checked; state.revealed.clear(); update(); });

  $('zoom-in').addEventListener('click', () => { state.zoom = (state.zoom || fitScale()) * 1.25; applyZoom(); });
  $('zoom-out').addEventListener('click', () => { state.zoom = (state.zoom || fitScale()) / 1.25; applyZoom(); });
  $('zoom-fit').addEventListener('click', () => { state.zoom = null; applyZoom(); });
  // Re-fit whenever the diagram area changes size (window, help panel, table…).
  // (Also covers slides that are hidden at load time and shown later.)
  if (window.ResizeObserver) {
    new ResizeObserver(() => { if (!state.zoom) applyZoom(); }).observe(el.diagram);
    new ResizeObserver(scrollTableToEnd).observe(el.tableWrap);
  }
  else window.addEventListener('resize', () => { if (!state.zoom) applyZoom(); });

  $('opt-groups').addEventListener('change', (e) => { state.opts.groups = e.target.checked; buildDiagram(); update(); });
  $('opt-const').addEventListener('change', (e) => { state.opts.showConst = e.target.checked; update(); });
  $('opt-full').addEventListener('change', (e) => { state.opts.full = e.target.checked; update(); });
  $('opt-sr').addEventListener('change', (e) => {
    const v = Math.max(1, Math.round(+e.target.value || 48000));
    state.opts.sr = v; e.target.value = v; state.compiled = null; doCompile();
  });

  const helpBtn = $('help-btn');
  helpBtn.addEventListener('click', () => {
    const h = $('help');
    h.hidden = !h.hidden;
    helpBtn.setAttribute('aria-expanded', h.hidden ? 'false' : 'true');
    if (!state.zoom) requestAnimationFrame(applyZoom);
  });

  $('share').addEventListener('click', async () => {
    const url = location.href.split('#')[0] + '#code=' + encodeURIComponent(el.code.value);
    try { await navigator.clipboard.writeText(url); flashButton($('share'), 'Copied!'); }
    catch (e) { window.prompt('Copy this link:', url); }
  });

  // Diagram interaction
  el.diagram.addEventListener('mousemove', (e) => {
    const hit = sigFromEvent(e);
    if (!hit) { highlight(null); el.tip.hidden = true; return; }
    highlight(hit.sig);
    showTip(e, hit.sig);
  });
  el.diagram.addEventListener('mouseleave', () => { highlight(null); el.tip.hidden = true; });
  el.diagram.addEventListener('click', (e) => {
    const hit = sigFromEvent(e);
    if (!hit) return;
    if (state.guess && !state.revealed.has(hit.sig) && !isConstSig(hit.sig) && hit.el.classList.contains('val')) {
      state.revealed.add(hit.sig); update(); showTip(e, hit.sig); return;
    }
    toggleWatch(hit.sig);
    showTip(e, hit.sig);
  });

  el.table.addEventListener('click', (e) => {
    const qm = e.target.closest('td.qm');
    if (qm) { state.revealed.add(+qm.dataset.sig); update(); return; }
    const th = e.target.closest('th[data-sig]');
    if (th) { toggleWatch(+th.dataset.sig); return; }
    const tr = e.target.closest('tr[data-n]');
    if (tr) goTo(+tr.dataset.n);
  });

  document.addEventListener('keydown', (e) => {
    const t = e.target instanceof Element ? e.target : document.body;
    if (t.closest('textarea, input[type="text"], input[type="number"], select')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(cur() + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(cur() - 1); }
    else if (e.key === 'Home') { e.preventDefault(); goTo(0); }
    else if (e.key === ' ' && !t.closest('button')) { e.preventDefault(); togglePlay(); }
  });
}

function flashButton(b, text) {
  const old = b.textContent;
  b.textContent = text;
  setTimeout(() => { b.textContent = old; }, 1400);
}

/* --------------------------------------------------------------- init */

function init() {
  bind();
  const h = parseHash();
  if (h.embed) {
    state.embed = true;
    document.body.classList.add('embed');
    const edit = $('open-editor');
    edit.hidden = false;
    edit.addEventListener('click', () => {
      const url = location.href.split('#')[0] + '#code=' + encodeURIComponent(el.code.value);
      window.open(url, '_blank', 'noopener');
    });
  }
  if (h.theme === 'light' || h.theme === 'dark') document.documentElement.dataset.theme = h.theme;
  if (h.guess) { state.guess = true; el.guess.checked = true; }
  if (h.input) state.initialInput = h.input;
  if (h.groups === '0') { state.opts.groups = false; $('opt-groups').checked = false; }
  let code = h.code;
  if (!code) code = load('code');
  if (!code) code = EXAMPLES[0][1];
  el.code.value = code;
  const ex = EXAMPLES.findIndex(([, c]) => c === code);
  el.examples.selectedIndex = ex >= 0 ? ex + 1 : 0;
  doCompile();
  if (h.n && state.sim) goTo(parseInt(h.n, 10) || 0);
}

init();
})();
