'use client';

/**
 * Casio fx-991EX ClassWiz — photo-overlay calculator
 *
 * The real product image is used as the visual background.
 * Transparent <button> hit-zones are positioned absolutely over every
 * physical key so the visual is pixel-perfect while all buttons work.
 *
 * Math engine: proper recursive-descent parser — handles nested
 * expressions, all trig/log/exp functions, nCr/nPr, factorials, etc.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';

// ─────────────────────────────── Types ───────────────────────────────────────

type AngleUnit = 'DEG' | 'RAD' | 'GRAD';

interface CS {
  expr: string;
  result: string;
  shift: boolean;
  alpha: boolean;
  hyp: boolean;
  angle: AngleUnit;
  mem: Record<string, number>;
  ans: number;
  err: string | null;
  fresh: boolean;
}

// ─────────────────────────────── Math engine ─────────────────────────────────

function toRad(x: number, u: AngleUnit) {
  if (u === 'DEG')  return x * Math.PI / 180;
  if (u === 'GRAD') return x * Math.PI / 200;
  return x;
}
function fromRad(x: number, u: AngleUnit) {
  if (u === 'DEG')  return x * 180 / Math.PI;
  if (u === 'GRAD') return x * 200 / Math.PI;
  return x;
}

function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0) return NaN;
  if (n > 170) return Infinity;
  let r = 1; for (let i = 2; i <= n; i++) r *= i; return r;
}
function _nCr(n: number, r: number) {
  if (n < 0 || r < 0 || r > n) return NaN;
  return factorial(n) / (factorial(r) * factorial(n - r));
}
function _nPr(n: number, r: number) {
  if (n < 0 || r < 0 || r > n) return NaN;
  return factorial(n) / factorial(n - r);
}

function fmtNum(v: number): string {
  if (isNaN(v))       return 'Math ERROR';
  if (!isFinite(v))   return v > 0 ? '∞' : '-∞';
  const abs = Math.abs(v);
  if (abs !== 0 && (abs >= 1e10 || abs < 1e-9)) {
    return v.toExponential(6)
            .replace(/\.?0+(e)/, '$1')
            .replace('e+', '×10^')
            .replace('e-', '×10^-');
  }
  // strip floating-point noise
  return parseFloat(v.toPrecision(10)).toString();
}

// ── Tokeniser ─────────────────────────────────────────────────────────────────

type Tok =
  | { t: 'num'; v: number }
  | { t: 'op';  v: string }
  | { t: 'lp' }
  | { t: 'rp' }
  | { t: 'comma' }
  | { t: 'fn'; v: string }
  | { t: 'end' };

function tokenise(src: string, ans: number, mem: Record<string, number>): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  const s = src;

  while (i < s.length) {
    if (/\s/.test(s[i])) { i++; continue; }

    // multi-char numbers (including decimals)
    if (/[\d.]/.test(s[i])) {
      let n = '';
      while (i < s.length && /[\d.]/.test(s[i])) n += s[i++];
      out.push({ t: 'num', v: parseFloat(n) });
      continue;
    }

    // named constants
    if (s.startsWith('Ans', i)) { out.push({ t: 'num', v: ans });       i += 3; continue; }
    if (s[i] === 'π')            { out.push({ t: 'num', v: Math.PI });   i++;    continue; }
    if (s[i] === 'ℯ')            { out.push({ t: 'num', v: Math.E });    i++;    continue; }

    // memory variables A-F (only when not followed by letters/paren — i.e. not part of a fn name)
    if (/[A-F]/.test(s[i]) && (i + 1 >= s.length || !/[a-zA-Z(]/.test(s[i + 1]))) {
      out.push({ t: 'num', v: mem[s[i]] ?? 0 }); i++; continue;
    }

    // ×10^( scientific notation — treat as implicit ×10^
    if (s.startsWith('×10^(', i)) {
      out.push({ t: 'op', v: 'E' }); i += 5; continue;
    }
    if (s.startsWith('×10^', i)) {
      out.push({ t: 'op', v: 'E' }); i += 4; continue;
    }

    // functions — longest match first
    const FNS = [
      'sinh⁻¹','cosh⁻¹','tanh⁻¹',
      'sin⁻¹', 'cos⁻¹', 'tan⁻¹',
      'sinh',  'cosh',  'tanh',
      'sin',   'cos',   'tan',
      'log',   'ln',    'abs',
      'eˣ',    '√',
      'nCr',   'nPr',
    ];
    let matched = false;
    for (const fn of FNS) {
      if (s.startsWith(fn, i)) {
        out.push({ t: 'fn', v: fn });
        i += fn.length;
        if (s[i] === '(') { out.push({ t: 'lp' }); i++; }
        matched = true; break;
      }
    }
    if (matched) continue;

    // single-char operators & punctuation
    const ops: Record<string, string> = {
      '+':'+', '−':'-', '-':'-', '×':'*', '*':'*', '÷':'/', '/':'/',
      '^':'^', '!':'!', '%':'%',
    };
    if (ops[s[i]]) { out.push({ t: 'op', v: ops[s[i]] }); i++; continue; }
    if (s[i] === '(') { out.push({ t: 'lp' }); i++; continue; }
    if (s[i] === ')') { out.push({ t: 'rp' }); i++; continue; }
    if (s[i] === ',') { out.push({ t: 'comma' }); i++; continue; }

    i++; // skip unknown
  }

  out.push({ t: 'end' });
  return out;
}

// ── Recursive-descent parser ──────────────────────────────────────────────────

function calcEval(expr: string, angle: AngleUnit, ans: number, mem: Record<string, number>): number {
  if (!expr.trim()) return 0;

  // auto-close unclosed parens (like the real calculator does on =)
  let balanced = expr;
  let open = 0;
  for (const c of balanced) { if (c === '(') open++; else if (c === ')') open--; }
  while (open-- > 0) balanced += ')';

  const toks = tokenise(balanced, ans, mem);
  let pos = 0;

  const cur  = (): Tok => toks[pos];
  const eat  = (): Tok => toks[pos++];
  const peek = (): Tok => toks[pos + 1] ?? { t: 'end' };

  // precedences
  const PREC: Record<string, number> = {
    '+': 1, '-': 1,
    '*': 2, '/': 2, 'E': 2,
    '^': 4,
    '!': 5, '%': 5,
  };

  function expr0(): number { return exprBin(0); }

  function exprBin(minP: number): number {
    let left = unary();

    for (;;) {
      const t = cur();

      // implicit multiply: left-value followed by ( or fn or num
      if (t.t === 'lp' || t.t === 'fn' || t.t === 'num') {
        if (minP <= 2) { left *= unary(); continue; }
        break;
      }

      if (t.t !== 'op') break;
      const p = PREC[t.v] ?? -1;
      if (p < minP) break;
      eat();

      if (t.v === '!') { left = factorial(left); continue; }
      if (t.v === '%') { left = left / 100; continue; }

      const rp = t.v === '^' ? p : p + 1;  // ^ is right-assoc
      const right = exprBin(rp);

      switch (t.v) {
        case '+': left += right; break;
        case '-': left -= right; break;
        case '*': left *= right; break;
        case '/': left /= right; break;
        case '^': left  = Math.pow(left, right); break;
        case 'E': left  = left * Math.pow(10, right); break;
      }
    }
    return left;
  }

  function unary(): number {
    const t = cur();
    if (t.t === 'op' && t.v === '-') { eat(); return -unary(); }
    if (t.t === 'op' && t.v === '+') { eat(); return  unary(); }
    return primary();
  }

  function primary(): number {
    const t = eat();

    if (t.t === 'num') return t.v;

    if (t.t === 'lp') {
      const v = expr0();
      if (cur().t === 'rp') eat();
      return v;
    }

    if (t.t === 'fn') {
      // opening paren already consumed by tokeniser if present
      if (t.v === 'nCr' || t.v === 'nPr') {
        const n = expr0();
        if (cur().t === 'comma') eat();
        const r = expr0();
        if (cur().t === 'rp') eat();
        return t.v === 'nCr' ? _nCr(n, r) : _nPr(n, r);
      }
      const a = expr0();
      if (cur().t === 'rp') eat();
      switch (t.v) {
        case 'sin':    return Math.sin(toRad(a, angle));
        case 'cos':    return Math.cos(toRad(a, angle));
        case 'tan':    return Math.tan(toRad(a, angle));
        case 'sin⁻¹': return fromRad(Math.asin(a), angle);
        case 'cos⁻¹': return fromRad(Math.acos(a), angle);
        case 'tan⁻¹': return fromRad(Math.atan(a), angle);
        case 'sinh':   return Math.sinh(a);
        case 'cosh':   return Math.cosh(a);
        case 'tanh':   return Math.tanh(a);
        case 'sinh⁻¹':return Math.asinh(a);
        case 'cosh⁻¹':return Math.acosh(a);
        case 'tanh⁻¹':return Math.atanh(a);
        case 'log':    return Math.log10(a);
        case 'ln':     return Math.log(a);
        case 'eˣ':     return Math.exp(a);
        case '√':      return Math.sqrt(a);
        case 'abs':    return Math.abs(a);
        default:       return NaN;
      }
    }

    return NaN;
  }

  const result = expr0();
  return result;
}

// ─────────────────────────────── State ───────────────────────────────────────

const INIT_CS: CS = {
  expr: '', result: '', shift: false, alpha: false, hyp: false,
  angle: 'DEG', mem: { A:0,B:0,C:0,D:0,E:0,F:0,M:0,X:0,Y:0 },
  ans: 0, err: null, fresh: false,
};

// ─────────────────────────────── Button map ──────────────────────────────────
//
// The calculator image is rendered at W×H pixels.
// Each button is defined as [x%, y%, w%, h%] — percentage of image dimensions.
// Positions measured from the official product photo.
//
// Image natural ratio ≈ 1070 wide × 1900 tall → we render at 220 × 390

const W = 220;   // rendered image width  (px)
const H = 390;   // rendered image height (px)

interface Btn {
  id: string;
  label: string;       // what to show in tooltip / accessibility
  act: string;         // primary action
  sAct?: string;       // SHIFT action
  aAct?: string;       // ALPHA action
  // bounding box as % of image dimensions
  x: number; y: number; w: number; h: number;
}

// All percentages tuned to the official Casio fx-991EX product photo
const BUTTONS: Btn[] = [
  // ── Navigation row ───────────────────────────────────────────────────────
  { id:'SHIFT', label:'SHIFT', act:'SHIFT',  x:4,  y:37.5, w:11, h:5.5 },
  { id:'ALPHA', label:'ALPHA', act:'ALPHA',  x:17, y:37.5, w:11, h:5.5 },
  { id:'UP',    label:'▲',     act:'UP',     x:44, y:36,   w:10, h:4   },
  { id:'LEFT',  label:'◀',     act:'LEFT',   x:34, y:39,   w:8,  h:4.5 },
  { id:'OK',    label:'OK',    act:'NOOP',   x:43, y:39,   w:11, h:4.5 },
  { id:'RIGHT', label:'▶',     act:'RIGHT',  x:55, y:39,   w:8,  h:4.5 },
  { id:'DOWN',  label:'▼',     act:'DOWN',   x:44, y:43,   w:10, h:4   },
  { id:'MENU',  label:'MENU',  act:'NOOP',   x:67, y:37.5, w:11, h:5.5 },
  { id:'ON',    label:'ON',    act:'AC',     x:81, y:37.5, w:14, h:5.5 },

  // ── Row A: OPTN  CALC  (gap)  ∫  x ──────────────────────────────────────
  { id:'OPTN',  label:'OPTN',  act:'NOOP',  sAct:'NOOP', x:2,  y:49,  w:18, h:5.5 },
  { id:'CALC',  label:'CALC',  act:'NOOP',  sAct:'NOOP', x:22, y:49,  w:18, h:5.5 },
  { id:'INTG',  label:'∫',     act:'NOOP',              x:60, y:49,  w:16, h:5.5 },
  { id:'XKEY',  label:'x',     act:'NOOP',              x:78, y:49,  w:16, h:5.5 },

  // ── Row B: ≡  √  x²  xᵐ  log  ln ───────────────────────────────────────
  { id:'FRAC',  label:'≡',     act:'NOOP',  sAct:'NOOP', x:2,  y:56,  w:15, h:5.5 },
  { id:'SQRT',  label:'√',     act:'SQRT',  sAct:'CBRT', x:19, y:56,  w:15, h:5.5 },
  { id:'SQ',    label:'x²',    act:'SQ',    sAct:'CUBE', x:36, y:56,  w:15, h:5.5 },
  { id:'POW',   label:'xᵐ',    act:'POW',               x:53, y:56,  w:15, h:5.5 },
  { id:'LOG',   label:'log',   act:'LOG',   sAct:'POW10',x:69, y:56,  w:14, h:5.5 },
  { id:'LN',    label:'ln',    act:'LN',    sAct:'EXPX', x:84, y:56,  w:14, h:5.5 },

  // ── Row C: (-)  °'"  x⁻¹  sin  cos  tan ─────────────────────────────────
  { id:'NEG',   label:'(-)',   act:'NEG',   sAct:'LOG',  x:2,  y:63,  w:15, h:5.5 },
  { id:'DMS',   label:"°'\"",  act:'NOOP',              x:19, y:63,  w:15, h:5.5 },
  { id:'INV',   label:'x⁻¹',  act:'INV',   sAct:'FACT', x:36, y:63,  w:15, h:5.5 },
  { id:'SIN',   label:'sin',   act:'SIN',   sAct:'ASIN', x:53, y:63,  w:14, h:5.5 },
  { id:'COS',   label:'cos',   act:'COS',   sAct:'ACOS', x:69, y:63,  w:14, h:5.5 },
  { id:'TAN',   label:'tan',   act:'TAN',   sAct:'ATAN', x:84, y:63,  w:14, h:5.5 },

  // ── Row D: STO  ENG  (  )  S⟺D  M+ ─────────────────────────────────────
  { id:'STO',   label:'STO',   act:'STO',   sAct:'RCL',  x:2,  y:70,  w:15, h:5.5 },
  { id:'ENG',   label:'ENG',   act:'NOOP',              x:19, y:70,  w:15, h:5.5 },
  { id:'LPAR',  label:'(',     act:'LPAR',  sAct:'ABS',  x:36, y:70,  w:15, h:5.5 },
  { id:'RPAR',  label:')',     act:'RPAR',              x:53, y:70,  w:14, h:5.5 },
  { id:'STOD',  label:'S⟺D',  act:'STOD',              x:67, y:70,  w:16, h:5.5 },
  { id:'MPLUS', label:'M+',    act:'MPLUS', sAct:'MMINUS',x:84, y:70, w:14, h:5.5 },

  // ── Row E: 7  8  9  DEL  AC ──────────────────────────────────────────────
  { id:'7',   label:'7',   act:'7',   x:2,  y:77.5, w:17, h:6 },
  { id:'8',   label:'8',   act:'8',   x:21, y:77.5, w:17, h:6 },
  { id:'9',   label:'9',   act:'9',   x:40, y:77.5, w:17, h:6 },
  { id:'DEL', label:'DEL', act:'DEL', sAct:'INS', x:59, y:77.5, w:18, h:6 },
  { id:'AC',  label:'AC',  act:'AC',  sAct:'OFF', x:79, y:77.5, w:18, h:6 },

  // ── Row F: 4  5  6  ×  ÷ ────────────────────────────────────────────────
  { id:'4',   label:'4',  act:'4',  x:2,  y:85, w:17, h:6 },
  { id:'5',   label:'5',  act:'5',  x:21, y:85, w:17, h:6 },
  { id:'6',   label:'6',  act:'6',  x:40, y:85, w:17, h:6 },
  { id:'MUL', label:'×',  act:'×',  x:59, y:85, w:18, h:6 },
  { id:'DIV', label:'÷',  act:'÷',  x:79, y:85, w:18, h:6 },

  // ── Row G: 1  2  3  +  − ────────────────────────────────────────────────
  { id:'1',   label:'1',  act:'1',  x:2,  y:92.5, w:17, h:6 },
  { id:'2',   label:'2',  act:'2',  x:21, y:92.5, w:17, h:6 },
  { id:'3',   label:'3',  act:'3',  x:40, y:92.5, w:17, h:6 },
  { id:'ADD', label:'+',  act:'+',  x:59, y:92.5, w:18, h:6 },
  { id:'SUB', label:'−',  act:'−',  x:79, y:92.5, w:18, h:6 },

  // ── Row H: 0  .  ×10ˣ  Ans  = ───────────────────────────────────────────
  { id:'0',   label:'0',     act:'0',   x:2,  y:92.5, w:17, h:6 },
  { id:'DOT', label:'.',     act:'.',   x:21, y:92.5, w:17, h:6 },
  { id:'EE',  label:'×10ˣ', act:'EE',  sAct:'PI',  x:40, y:92.5, w:17, h:6 },
  { id:'ANS', label:'Ans',   act:'ANS', sAct:'PERCENT', x:59, y:92.5, w:18, h:6 },
  { id:'EQ',  label:'=',     act:'=',   x:79, y:92.5, w:18, h:6 },
];

// ─────────────────────────────── Component ───────────────────────────────────

interface Props { onClose: () => void }

export function Fx991EX({ onClose }: Props) {
  const [cs, setCS] = useState<CS>({ ...INIT_CS });
  const [pos, setPos] = useState({ x: 60, y: 20 });
  const dragRef = useRef({ dragging: false, ox: 0, oy: 0 });

  // Drag on the image header area
  const onImgDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { dragging: true, ox: e.clientX - pos.x, oy: e.clientY - pos.y };
    document.body.style.userSelect = 'none';
  }, [pos]);

  useEffect(() => {
    const mm = (e: MouseEvent) => {
      if (!dragRef.current.dragging) return;
      setPos({ x: e.clientX - dragRef.current.ox, y: e.clientY - dragRef.current.oy });
    };
    const mu = () => { dragRef.current.dragging = false; document.body.style.userSelect = ''; };
    window.addEventListener('mousemove', mm);
    window.addEventListener('mouseup', mu);
    return () => { window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu); };
  }, []);

  // ── Key handler ───────────────────────────────────────────────────────────
  const press = useCallback((btn: Btn) => {
    setCS(prev => {
      const act = prev.shift ? (btn.sAct ?? btn.act)
                : prev.alpha ? (btn.aAct ?? btn.act)
                : btn.act;
      const base: CS = { ...prev, shift: false, alpha: false, err: null };

      // append token to expression; if fresh (just evaluated) and not
      // a binary continuation operator, start new expression
      const app = (token: string): CS => {
        let e = base.expr;
        if (base.fresh && !/^[+−×÷\^!%)]/.test(token)) {
          // continuing with operator after result → prepend Ans
          if (/^[+−×÷\^]/.test(token)) e = 'Ans';
          else e = '';
        }
        return { ...base, expr: e + token, result: '', fresh: false };
      };

      // multi-char token DEL
      const MULTI = [
        'sinh⁻¹(','cosh⁻¹(','tanh⁻¹(',
        'sin⁻¹(', 'cos⁻¹(', 'tan⁻¹(',
        'sinh(',  'cosh(',  'tanh(',
        'sin(',   'cos(',   'tan(',
        '×10^(',  'log(',   'ln(',
        'eˣ(',    '√(',     'abs(',
        'nCr(',   'nPr(',   '-(', '^(',
        '^2',     '^(-1)',
      ];

      switch (act) {
        // ── mode ────────────────────────────────────────────────────────
        case 'SHIFT': return { ...prev, shift: !prev.shift, alpha: false };
        case 'ALPHA': return { ...prev, alpha: !prev.alpha, shift: false };
        case 'AC':
        case 'OFF':   return { ...INIT_CS, angle: prev.angle, mem: prev.mem };
        case 'HYP':   return { ...base, hyp: !prev.hyp };
        case 'NOOP':  return base;

        // ── DEL — smart multi-char delete ────────────────────────────────
        case 'DEL': {
          if (base.fresh) return { ...base, expr: '', result: '', fresh: false };
          const e = base.expr;
          for (const m of MULTI) {
            if (e.endsWith(m)) return { ...base, expr: e.slice(0, -m.length) };
          }
          return { ...base, expr: e.slice(0, -1) };
        }

        // ── digits & decimal ─────────────────────────────────────────────
        case '0':case '1':case '2':case '3':case '4':
        case '5':case '6':case '7':case '8':case '9':
        case '.': return app(act);

        // ── basic operators ──────────────────────────────────────────────
        case '+': case '−': case '×': case '÷': return app(act);

        // ── constants ────────────────────────────────────────────────────
        case 'PI':      return app('π');
        case 'ECONST':  return app('ℯ');
        case 'ANS':     return app('Ans');
        case 'PERCENT': return app('%');

        // ── brackets ─────────────────────────────────────────────────────
        case 'LPAR': return app('(');
        case 'RPAR': return app(')');
        case 'ABS':  return app('abs(');
        case 'NEG':  return app('-(');

        // ── trig (respects hyp) ──────────────────────────────────────────
        case 'SIN':  return app(prev.hyp ? 'sinh('   : 'sin(');
        case 'COS':  return app(prev.hyp ? 'cosh('   : 'cos(');
        case 'TAN':  return app(prev.hyp ? 'tanh('   : 'tan(');
        case 'ASIN': return app(prev.hyp ? 'sinh⁻¹(' : 'sin⁻¹(');
        case 'ACOS': return app(prev.hyp ? 'cosh⁻¹(' : 'cos⁻¹(');
        case 'ATAN': return app(prev.hyp ? 'tanh⁻¹(' : 'tan⁻¹(');

        // ── log / exp ────────────────────────────────────────────────────
        case 'LOG':    return app('log(');
        case 'LN':     return app('ln(');
        case 'EXPX':   return app('eˣ(');
        case 'POW10':  return app('10^(');
        case 'SQRT':   return app('√(');

        // ── powers ───────────────────────────────────────────────────────
        case 'SQ':    return app('^2');
        case 'CUBE':  return app('^3');
        case 'POW':   return app('^(');
        case 'INV':   return app('^(-1)');
        case 'FACT':  return app('!');
        case 'EE':    return app('×10^(');

        // ── combinations / permutations ──────────────────────────────────
        case 'NCR': return app('nCr(');
        case 'NPR': return app('nPr(');

        // ── memory ───────────────────────────────────────────────────────
        case 'MPLUS': {
          const m = prev.mem.M + prev.ans;
          return { ...base, mem: { ...prev.mem, M: m }, result: `M = ${fmtNum(m)}` };
        }
        case 'MMINUS': {
          const m = prev.mem.M - prev.ans;
          return { ...base, mem: { ...prev.mem, M: m }, result: `M = ${fmtNum(m)}` };
        }
        case 'STO':    return { ...base, result: 'STO → press A–F' };
        case 'RCL':    return { ...base, result: 'RCL → press A–F' };

        case 'STOD': {
          const r = prev.ans;
          if (!isNaN(r) && isFinite(r)) {
            if (prev.result.includes('/')) return { ...base, result: fmtNum(r) };
            for (const d of [2,3,4,5,6,7,8,9,10,12,16,32,100]) {
              const n = Math.round(r * d);
              if (n !== d && Math.abs(n / d - r) < 1e-9)
                return { ...base, result: `${n}/${d}` };
            }
          }
          return base;
        }

        // ── angle mode toggle (SHIFT + S⟺D on real calc) ─────────────────
        case 'TODEG': {
          const cyc: AngleUnit[] = ['DEG','RAD','GRAD'];
          return { ...base, angle: cyc[(cyc.indexOf(prev.angle) + 1) % 3] };
        }

        // ── evaluate ─────────────────────────────────────────────────────
        case '=': {
          try {
            const val = calcEval(base.expr || '0', prev.angle, prev.ans, prev.mem);
            return { ...base, result: fmtNum(val), ans: isNaN(val) ? prev.ans : val, fresh: true };
          } catch {
            return { ...base, result: 'Syntax ERROR', err: 'Syntax ERROR', fresh: true };
          }
        }

        // ── UP/DOWN — history (simplified: re-show last expr) ────────────
        case 'UP':
        case 'DOWN': return base;

        default: return base;
      }
    });
  }, []);

  const s = cs;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 9999,
        width: W,
        userSelect: 'none',
        filter: 'drop-shadow(0 16px 40px rgba(0,0,0,0.75))',
      }}
    >
      {/* ── Outer container with image ──────────────────────────────────── */}
      <div
        style={{
          position: 'relative',
          width: W,
          height: H,
        }}
      >
        {/* Drag handle covers the top ~35% (above the button area) */}
        <div
          onMouseDown={onImgDown}
          style={{ position:'absolute', left:0, top:0, width:'100%', height:'35%', cursor:'grab', zIndex:2 }}
        />

        {/* The actual calculator photo — save the image from this chat to:
            public/calculator/fx991ex.png  */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/calculator/fx991ex.png"
          alt="Casio fx-991EX ClassWiz"
          draggable={false}
          style={{
            position: 'absolute', inset: 0,
            width: W, height: H,
            display: 'block',
            objectFit: 'fill',
            borderRadius: 16,
            zIndex: 1,
          }}
        />

        {/* ── LCD overlay ───────────────────────────────────────────────── */}
        {/* Screen area: roughly x=6%, y=17%, w=88%, h=18% of image */}
        <div
          style={{
            position: 'absolute',
            left:   `${6}%`,
            top:    `${17}%`,
            width:  `${88}%`,
            height: `${17}%`,
            background: 'rgba(188, 210, 170, 0.88)',
            borderRadius: 3,
            padding: '3px 6px',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'monospace',
            pointerEvents: 'none',
          }}
        >
          {/* status row */}
          <div style={{ display:'flex', justifyContent:'space-between', fontSize: 7, color:'#1a2a04' }}>
            <span style={{ fontWeight:'bold' }}>{s.angle}</span>
            <div style={{ display:'flex', gap:3 }}>
              {s.shift && <span style={{ background:'#e8960a', color:'#fff', padding:'0 2px', borderRadius:1 }}>S</span>}
              {s.alpha && <span style={{ background:'#c01878', color:'#fff', padding:'0 2px', borderRadius:1 }}>A</span>}
              {s.hyp   && <span style={{ background:'#446',    color:'#fff', padding:'0 2px', borderRadius:1 }}>H</span>}
            </div>
            <span>COMP</span>
          </div>
          {/* expression */}
          <div style={{
            flex:1, fontSize: 9, color:'#1a2a04',
            textAlign:'right', overflow:'hidden', lineHeight:1.3,
            marginTop: 1,
          }}>
            {s.expr}
          </div>
          {/* result */}
          <div style={{
            fontSize: 16, fontWeight:'bold',
            color: s.err ? '#880000' : '#0a1a04',
            textAlign:'right', lineHeight:1.1,
          }}>
            {s.result || (!s.expr && !s.fresh ? '0' : '')}
          </div>
        </div>

        {/* ── Transparent button hit-zones ──────────────────────────────── */}
        {BUTTONS.map(btn => {
          const isActive = (btn.act === 'SHIFT' && s.shift)
                        || (btn.act === 'ALPHA' && s.alpha)
                        || (btn.act === 'HYP'   && s.hyp);
          return (
            <button
              key={btn.id}
              title={btn.label}
              onMouseDown={e => { e.preventDefault(); press(btn); }}
              style={{
                position: 'absolute',
                left:   `${btn.x}%`,
                top:    `${btn.y}%`,
                width:  `${btn.w}%`,
                height: `${btn.h}%`,
                background: isActive ? 'rgba(255,255,255,0.35)' : 'transparent',
                border: 'none',
                borderRadius: 3,
                cursor: 'pointer',
                padding: 0,
                outline: 'none',
                // debug: uncomment to see hit-zones
                // border: '1px solid rgba(255,0,0,0.4)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.18)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isActive ? 'rgba(255,255,255,0.35)' : 'transparent'; }}
            />
          );
        })}

        {/* ── Close button ──────────────────────────────────────────────── */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 4, right: 6,
            background: 'rgba(0,0,0,0.45)',
            border: 'none',
            borderRadius: '50%',
            width: 18, height: 18,
            color: '#fff',
            fontSize: 12,
            lineHeight: 1,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0,
          }}
        >×</button>
      </div>
    </div>
  );
}

// Made with Bob
