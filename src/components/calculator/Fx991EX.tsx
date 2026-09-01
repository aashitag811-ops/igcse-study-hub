'use client';

/**
 * Casio fx-991EX ClassWiz — pixel-accurate floating overlay
 * Visual reference: official product photo (high-res front view)
 *
 * Layout facts from the photo:
 *  - Outer casing: white/light-grey rounded rim, black textured inner face
 *  - CASIO: large bold white top-left; solar panel: dark rect top-right
 *  - fx-991EX: small grey; CLASSWIZ: hot-pink dot-matrix below
 *  - Screen: pale blue-grey-green LCD, wide
 *  - Nav row: 5 metallic silver round buttons (SHIFT, ALPHA, D-pad×3, MENU, ON)
 *  - Function keys (4 rows): dark rounded-rect, same colour as body, white labels
 *  - Number pad: WHITE keys, black text
 *  - DEL, AC: BLUE keys, white text
 *  - ×, ÷, +, −, Ans, = : WHITE keys (same as digits)
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
function _nCr(n: number, r: number) { return factorial(n) / (factorial(r) * factorial(n - r)); }
function _nPr(n: number, r: number) { return factorial(n) / factorial(n - r); }

function fmtNum(v: number): string {
  if (isNaN(v))       return 'Math ERROR';
  if (!isFinite(v))   return v > 0 ? '∞' : '-∞';
  const abs = Math.abs(v);
  if (abs !== 0 && (abs >= 1e10 || abs < 1e-9)) {
    return v.toExponential(6).replace(/\.?0+e/, 'e').replace('e+', '×10^').replace('e-', '×10^-');
  }
  return parseFloat(v.toPrecision(10)).toString();
}

// ── Tokeniser + recursive-descent evaluator ──────────────────────────────────
// Handles: +−×÷^  sin/cos/tan/ln/log/√/abs  sin⁻¹ etc  sinh/cosh/tanh
//          nCr(n,r)  nPr(n,r)  n!  π  ℯ  Ans  A-F  -(  implicit multiply

type Token =
  | { t: 'num'; v: number }
  | { t: 'op';  v: string }
  | { t: 'lp' }
  | { t: 'rp' }
  | { t: 'comma' }
  | { t: 'fn';  v: string }   // sin, cos, log, √, etc.
  | { t: 'end' };

function tokenise(src: string, angle: AngleUnit, ans: number, mem: Record<string, number>): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  const peek = () => src[i] ?? '';

  while (i < src.length) {
    // whitespace
    if (/\s/.test(src[i])) { i++; continue; }

    // numbers
    if (/[\d.]/.test(src[i])) {
      let s = '';
      while (i < src.length && /[\d.]/.test(src[i])) s += src[i++];
      tokens.push({ t: 'num', v: parseFloat(s) });
      continue;
    }

    // named constants / variables
    if (src.startsWith('Ans', i))  { tokens.push({ t: 'num', v: ans });           i += 3; continue; }
    if (src[i] === 'π')             { tokens.push({ t: 'num', v: Math.PI });       i++;    continue; }
    if (src[i] === 'ℯ')             { tokens.push({ t: 'num', v: Math.E });        i++;    continue; }
    // memory A–F
    if (/[A-F]/.test(src[i]) && (i + 1 >= src.length || !/[a-zA-Z(]/.test(src[i+1]))) {
      tokens.push({ t: 'num', v: mem[src[i]] ?? 0 }); i++; continue;
    }

    // functions — longest match first
    const FNS = [
      'sinh⁻¹', 'cosh⁻¹', 'tanh⁻¹',
      'sin⁻¹',  'cos⁻¹',  'tan⁻¹',
      'sinh',   'cosh',   'tanh',
      'sin',    'cos',    'tan',
      'log₀',   'log',    'ln',
      'eˣ',     '√',      'abs',
      'nCr',    'nPr',
    ];
    let matched = false;
    for (const fn of FNS) {
      if (src.startsWith(fn, i)) {
        tokens.push({ t: 'fn', v: fn });
        i += fn.length;
        // consume opening ( if present
        if (src[i] === '(') { tokens.push({ t: 'lp' }); i++; }
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // ×10^ — scientific notation entry
    if (src.startsWith('×10^', i)) {
      i += 4;
      // skip optional (
      if (src[i] === '(') i++;
      tokens.push({ t: 'op', v: 'E' });
      continue;
    }

    // operators
    if (src[i] === '+') { tokens.push({ t: 'op', v: '+' }); i++; continue; }
    if (src[i] === '−' || src[i] === '-') { tokens.push({ t: 'op', v: '-' }); i++; continue; }
    if (src[i] === '×' || src[i] === '*') { tokens.push({ t: 'op', v: '*' }); i++; continue; }
    if (src[i] === '÷' || src[i] === '/') { tokens.push({ t: 'op', v: '/' }); i++; continue; }
    if (src[i] === '^') { tokens.push({ t: 'op', v: '^' }); i++; continue; }
    if (src[i] === '!') { tokens.push({ t: 'op', v: '!' }); i++; continue; }
    if (src[i] === '%') { tokens.push({ t: 'op', v: '%' }); i++; continue; }
    if (src[i] === '(') { tokens.push({ t: 'lp' }); i++; continue; }
    if (src[i] === ')') { tokens.push({ t: 'rp' }); i++; continue; }
    if (src[i] === ',') { tokens.push({ t: 'comma' }); i++; continue; }

    // skip unknown chars
    i++;
  }

  tokens.push({ t: 'end' });
  return tokens;
}

// Pratt / recursive descent parser
function parse(tokens: Token[], angle: AngleUnit): number {
  let pos = 0;
  const cur  = () => tokens[pos];
  const eat  = () => tokens[pos++];

  function parseExpr(minPrec = 0): number {
    let left = parseUnary();

    for (;;) {
      const tok = cur();
      if (tok.t === 'end' || tok.t === 'rp' || tok.t === 'comma') break;

      // implicit multiply: number/rp followed by lp/fn/num
      if ((tok.t === 'lp' || tok.t === 'fn' || tok.t === 'num')) {
        if (minPrec <= 3) {
          left = left * parseUnary();
          continue;
        }
        break;
      }

      if (tok.t !== 'op') break;

      const prec = { '+': 1, '-': 1, '*': 2, '/': 2, 'E': 2, '^': 4, '!': 5, '%': 5 }[tok.v] ?? -1;
      if (prec < minPrec) break;

      eat();

      if (tok.v === '!') { left = factorial(left); continue; }
      if (tok.v === '%') { left = left / 100; continue; }

      const rightPrec = tok.v === '^' ? prec : prec + 1;
      const right = parseExpr(rightPrec);

      switch (tok.v) {
        case '+': left = left + right; break;
        case '-': left = left - right; break;
        case '*': left = left * right; break;
        case '/': left = left / right; break;
        case '^': left = Math.pow(left, right); break;
        case 'E': left = left * Math.pow(10, right); break;
      }
    }
    return left;
  }

  function parseUnary(): number {
    const tok = cur();
    if (tok.t === 'op' && tok.v === '-') { eat(); return -parseUnary(); }
    if (tok.t === 'op' && tok.v === '+') { eat(); return  parseUnary(); }
    return parsePrimary();
  }

  function parsePrimary(): number {
    const tok = eat();
    if (tok.t === 'num') return tok.v;

    if (tok.t === 'lp') {
      const v = parseExpr(0);
      if (cur().t === 'rp') eat();
      return v;
    }

    if (tok.t === 'fn') {
      // argument(s) already consumed opening paren by tokeniser
      // if next token is lp it means double-(( — eat it
      const needClose = (cur().t !== 'end' && cur().t !== 'rp' && cur().t !== 'comma');

      if (tok.v === 'nCr' || tok.v === 'nPr') {
        const n = parseExpr(0);
        if (cur().t === 'comma') eat();
        const r = parseExpr(0);
        if (cur().t === 'rp') eat();
        return tok.v === 'nCr' ? _nCr(n, r) : _nPr(n, r);
      }

      const arg = parseExpr(0);
      if (cur().t === 'rp') eat();

      switch (tok.v) {
        case 'sin':    return Math.sin(toRad(arg, angle));
        case 'cos':    return Math.cos(toRad(arg, angle));
        case 'tan':    return Math.tan(toRad(arg, angle));
        case 'sin⁻¹': return fromRad(Math.asin(arg), angle);
        case 'cos⁻¹': return fromRad(Math.acos(arg), angle);
        case 'tan⁻¹': return fromRad(Math.atan(arg), angle);
        case 'sinh':   return Math.sinh(arg);
        case 'cosh':   return Math.cosh(arg);
        case 'tanh':   return Math.tanh(arg);
        case 'sinh⁻¹':return Math.asinh(arg);
        case 'cosh⁻¹':return Math.acosh(arg);
        case 'tanh⁻¹':return Math.atanh(arg);
        case 'log':    return Math.log10(arg);
        case 'log₀':   return Math.log10(arg); // placeholder
        case 'ln':     return Math.log(arg);
        case 'eˣ':     return Math.exp(arg);
        case '√':      return Math.sqrt(arg);
        case 'abs':    return Math.abs(arg);
        default:       return NaN;
      }
      void needClose;
    }

    return NaN;
  }

  return parseExpr(0);
}

function calcEval(expr: string, angle: AngleUnit, ans: number, mem: Record<string, number>): number {
  if (!expr.trim()) return 0;
  const tokens = tokenise(expr, angle, ans, mem);
  return parse(tokens, angle);
}

// ─────────────────────────────── Key definitions ─────────────────────────────

// Button visual categories
// 'nav'   — silver metallic round (SHIFT, ALPHA, D-pad, MENU, ON)
// 'fn'    — dark body-colour rounded-rect (sci function keys)
// 'num'   — WHITE rounded-rect (0-9, operators, Ans, =)
// 'del'   — BLUE (DEL, AC)
// 'blank' — invisible spacer

type BtnStyle = 'nav' | 'fn' | 'num' | 'del' | 'blank';

interface K {
  id:   string;
  p:    string;       // primary label
  s?:   string;       // shift label (yellow, printed above on body)
  a?:   string;       // alpha label (red/purple, printed above on body)
  w?:   number;       // flex-width multiplier (default 1)
  st:   BtnStyle;
  act:  string;
  sAct?: string;
  aAct?: string;
}

// ── Key grid — matches physical layout exactly ────────────────────────────────
//
// Navigation row is rendered separately as a special D-pad cluster, not in KEYROWS.
//
// KEYROWS covers only the 8 rows below the nav row:
//   Row A: OPTN  CALC  [∫/d-icon spacer]  ∫⌐  x
//   Row B: ≡(fraction)  √  x²  xᵐ  log□  ln
//   Row C: (-)  °'"  x⁻¹  sin  cos  tan
//   Row D: STO  ENG  (  )  S⟺D  M+
//   Row E: 7  8  9  DEL  AC
//   Row F: 4  5  6  ×  ÷
//   Row G: 1  2  3  +  −
//   Row H: 0  .  ×10ˣ  Ans  =

const KEYROWS: K[][] = [
  // Row A — top function row
  [
    { id:'OPTN',  p:'OPTN',  s:'QR',    a:'',    st:'fn',  act:'NOOP', w:1 },
    { id:'CALC',  p:'CALC',  s:'SOLVE', a:'',    st:'fn',  act:'NOOP', w:1 },
    { id:'_ga1',  p:'',      st:'blank', act:'__NOOP', w:0.5 },
    { id:'INTG',  p:'∫⌐',   s:'d/dx',  a:'',    st:'fn',  act:'NOOP', w:1 },
    { id:'SUMX',  p:'x',     s:'Σ',     a:'',    st:'fn',  act:'NOOP', w:1 },
  ],
  // Row B — powers / roots / log
  [
    { id:'FRAC',  p:'≡',     s:'⬚/⬚',  a:'',    st:'fn',  act:'NOOP',   w:1 },
    { id:'SQRT',  p:'√',     s:'³√',   a:'',    st:'fn',  act:'SQRT',   w:1 },
    { id:'SQ',    p:'x²',    s:'x³',   a:'',    st:'fn',  act:'SQ',     w:1 },
    { id:'POW',   p:'xᵐ',    s:'',     a:'',    st:'fn',  act:'POW',    w:1 },
    { id:'LOGB',  p:'log□',  s:'10^',  a:'',    st:'fn',  act:'LOG',    w:1 },
    { id:'LN',    p:'ln',    s:'eˣ',   a:'',    st:'fn',  act:'LN',     w:1, sAct:'EXPX' },
  ],
  // Row C — trig
  [
    { id:'NEG',   p:'(-)',   s:'log',   a:'A',   st:'fn',  act:'NEG',   sAct:'LOGB', w:1 },
    { id:'DMS',   p:'°\'"',  s:'←',    a:'B',   st:'fn',  act:'NOOP',  w:1 },
    { id:'INV',   p:'x⁻¹',  s:'x!',   a:'C',   st:'fn',  act:'INV',   sAct:'FACT', w:1 },
    { id:'SIN',   p:'sin',   s:'sin⁻¹',a:'D',   st:'fn',  act:'SIN',   sAct:'ASIN', w:1 },
    { id:'COS',   p:'cos',   s:'cos⁻¹',a:'E',   st:'fn',  act:'COS',   sAct:'ACOS', w:1 },
    { id:'TAN',   p:'tan',   s:'tan⁻¹',a:'F',   st:'fn',  act:'TAN',   sAct:'ATAN', w:1 },
  ],
  // Row D — STO / ENG / brackets / S⟺D / M+
  [
    { id:'STO',   p:'STO',   s:'RCL',  a:'',    st:'fn',  act:'STO2',  sAct:'RCL',  w:1 },
    { id:'ENG',   p:'ENG',   s:'←',    a:'',    st:'fn',  act:'NOOP',  w:1 },
    { id:'LPAR',  p:'(',     s:'Abs',  a:'',    st:'fn',  act:'LPAR',  sAct:'ABS',  w:1 },
    { id:'RPAR',  p:')',     s:',',    a:'',    st:'fn',  act:'RPAR',  w:1 },
    { id:'STOD',  p:'S⟺D', s:'a⇔b', a:'',    st:'fn',  act:'STOD',  w:1 },
    { id:'MPLUS', p:'M+',    s:'M−',  a:'',    st:'fn',  act:'MPLUS', sAct:'MMINUS', w:1 },
  ],
  // Row E — numbers 7-9, DEL, AC
  [
    { id:'7',   p:'7',    a:'',  st:'num', act:'7',   w:1 },
    { id:'8',   p:'8',    a:'',  st:'num', act:'8',   w:1 },
    { id:'9',   p:'9',    a:'',  st:'num', act:'9',   w:1 },
    { id:'DEL', p:'DEL',  s:'INS', st:'del', act:'DEL', sAct:'INS', w:1 },
    { id:'AC',  p:'AC',   s:'OFF', st:'del', act:'AC',  sAct:'OFF', w:1 },
  ],
  // Row F
  [
    { id:'4',   p:'4',   st:'num', act:'4' },
    { id:'5',   p:'5',   st:'num', act:'5' },
    { id:'6',   p:'6',   st:'num', act:'6' },
    { id:'MUL', p:'×',   st:'num', act:'×' },
    { id:'DIV', p:'÷',   st:'num', act:'÷' },
  ],
  // Row G
  [
    { id:'1',   p:'1',   st:'num', act:'1' },
    { id:'2',   p:'2',   st:'num', act:'2' },
    { id:'3',   p:'3',   st:'num', act:'3' },
    { id:'ADD', p:'+',   st:'num', act:'+' },
    { id:'SUB', p:'−',   st:'num', act:'−' },
  ],
  // Row H
  [
    { id:'0',   p:'0',     s:'Rnd',  st:'num', act:'0',         w:1 },
    { id:'DOT', p:'•',     s:'Ran#', st:'num', act:'.',         w:1 },
    { id:'EE',  p:'×10ˣ', s:'π',    st:'num', act:'EE',  sAct:'PI',  w:1 },
    { id:'ANS', p:'Ans',   s:'%',    st:'num', act:'ANS', sAct:'PERCENT', w:1 },
    { id:'EQ',  p:'=',     s:'≈',    st:'num', act:'=',         w:1 },
  ],
];

// ─────────────────────────────── Colours ─────────────────────────────────────

// From the official product photo:
const BG_BODY  = '#1c1c1c';   // textured black face
const BG_RIM   = '#d8d8d0';   // outer white/silver rim
const BG_LCD   = '#c8d8b8';   // pale green LCD
const LCD_TXT  = '#1a2a08';

// Button backgrounds
const BG_NAV   = 'linear-gradient(145deg, #888 0%, #ccc 40%, #999 70%, #666 100%)'; // silver metallic
const BG_FN    = '#2e2e2e';   // dark (matches body)
const BG_NUM   = '#f0f0ec';   // white/off-white
const BG_DEL   = '#2050c8';   // blue

// Button text
const FG_NAV   = '#fff';
const FG_FN    = '#e8e8e8';
const FG_NUM   = '#111';
const FG_DEL   = '#fff';

// Shadows
const SH_NAV   = '0 3px 0 #333, 0 1px 3px rgba(0,0,0,0.6)';
const SH_FN    = '0 2px 0 #111';
const SH_NUM   = '0 2px 0 #aaa';
const SH_DEL   = '0 2px 0 #0a2880';

// ─────────────────────────────── State ───────────────────────────────────────

const INIT_CS: CS = {
  expr: '', result: '', shift: false, alpha: false, hyp: false,
  angle: 'DEG', mem: { A:0,B:0,C:0,D:0,E:0,F:0,M:0,X:0,Y:0 },
  ans: 0, err: null, fresh: false,
};

// ─────────────────────────────── Component ───────────────────────────────────

interface Props { onClose: () => void }

export function Fx991EX({ onClose }: Props) {
  const [cs, setCS] = useState<CS>({ ...INIT_CS });
  const [pos, setPos] = useState({ x: 60, y: 30 });
  const dragRef = useRef({ dragging: false, ox: 0, oy: 0 });

  // ── Drag ──────────────────────────────────────────────────────────────────
  const onHeaderDown = useCallback((e: React.MouseEvent) => {
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
  const press = useCallback((k: K) => {
    setCS(prev => {
      const act = prev.shift ? (k.sAct ?? k.act)
                : prev.alpha ? (k.aAct ?? k.act)
                : k.act;
      const base: CS = { ...prev, shift: false, alpha: false, err: null };

      const app = (s: string): CS => {
        let expr = base.expr;
        if (base.fresh && !/^[+−×÷\^)!%]/.test(s)) expr = '';
        return { ...base, expr: expr + s, result: '', fresh: false };
      };

      switch (act) {
        case 'SHIFT':   return { ...prev, shift: !prev.shift, alpha: false };
        case 'ALPHA':   return { ...prev, alpha: !prev.alpha, shift: false };
        case 'AC':
        case 'OFF':     return { ...INIT_CS, angle: prev.angle, mem: prev.mem };
        case 'HYP':     return { ...base, hyp: !prev.hyp };
        case '__NOOP':
        case 'NOOP':    return base;

        case 'DEL': {
          if (base.fresh) return { ...base, expr: '', result: '', fresh: false };
          // delete multi-char tokens intelligently
          const e = base.expr;
          const multiEnds = ['sin⁻¹(','cos⁻¹(','tan⁻¹(','sinh⁻¹(','cosh⁻¹(','tanh⁻¹(','sinh(','cosh(','tanh(','sin(','cos(','tan(','log(','ln(','eˣ(','√(','nCr(','nPr(','×10^(','-('];
          for (const m of multiEnds) {
            if (e.endsWith(m)) return { ...base, expr: e.slice(0, -m.length) };
          }
          return { ...base, expr: e.slice(0, -1) };
        }

        case 'TODEG': {
          const cycle: AngleUnit[] = ['DEG','RAD','GRAD'];
          return { ...base, angle: cycle[(cycle.indexOf(prev.angle) + 1) % 3] };
        }

        case '0':case '1':case '2':case '3':case '4':
        case '5':case '6':case '7':case '8':case '9':
        case '.': return app(act);

        case '+': case '−': case '×': case '÷': return app(act);

        case 'PI':      return app('π');
        case 'ECONST':  return app('ℯ');
        case 'ANS':     return app('Ans');
        case 'PERCENT': return app('%');

        case 'LPAR': return app('(');
        case 'RPAR': return app(')');
        case 'ABS':  return app('abs(');
        case 'NEG':  return app('-(');

        case 'SIN':  return app(prev.hyp ? 'sinh('    : 'sin(');
        case 'COS':  return app(prev.hyp ? 'cosh('    : 'cos(');
        case 'TAN':  return app(prev.hyp ? 'tanh('    : 'tan(');
        case 'ASIN': return app(prev.hyp ? 'sinh⁻¹('  : 'sin⁻¹(');
        case 'ACOS': return app(prev.hyp ? 'cosh⁻¹('  : 'cos⁻¹(');
        case 'ATAN': return app(prev.hyp ? 'tanh⁻¹('  : 'tan⁻¹(');

        case 'LOG':   return app('log(');
        case 'LOGB':  return app('log(');
        case 'LN':    return app('ln(');
        case 'EXPX':  return app('eˣ(');
        case 'POW10': return app('10^(');
        case 'SQRT':  return app('√(');

        case 'SQ':    return app('^2');
        case 'POW':   return app('^(');
        case 'INV':   return app('^(-1)');
        case 'FACT':  return app('!');
        case 'EE':    return app('×10^(');

        case 'NCR': return app('nCr(');
        case 'NPR': return app('nPr(');

        case 'MPLUS':  {
          const m = prev.mem.M + prev.ans;
          return { ...base, mem: { ...prev.mem, M: m }, result: `M=${fmtNum(m)}` };
        }
        case 'MMINUS': {
          const m = prev.mem.M - prev.ans;
          return { ...base, mem: { ...prev.mem, M: m }, result: `M=${fmtNum(m)}` };
        }
        case 'STO2': return { ...base, result: 'STO: press A–F' };
        case 'RCL':  return { ...base, result: 'RCL: press A–F' };

        case 'STOD': {
          const r = prev.ans;
          if (isNaN(r)) return base;
          if (prev.result.includes('/')) return { ...base, result: fmtNum(r) };
          for (const d of [2,3,4,5,6,7,8,9,10,12,16,100]) {
            const n = Math.round(r * d);
            if (Math.abs(n / d - r) < 1e-10 && n !== d) return { ...base, result: `${n}/${d}` };
          }
          return base;
        }

        case '=': {
          try {
            const val = calcEval(base.expr || '0', prev.angle, prev.ans, prev.mem);
            return { ...base, result: fmtNum(val), ans: val, fresh: true };
          } catch {
            return { ...base, result: 'Syntax ERROR', err: 'Syntax ERROR', fresh: true };
          }
        }

        default: return base;
      }
    });
  }, []);

  const s = cs;

  // ── Helpers ──────────────────────────────────────────────────────────────
  function navBtn(label: string, title: string, act: string, extraStyle?: React.CSSProperties) {
    return (
      <button
        key={act + label}
        title={title}
        onMouseDown={e => { e.preventDefault(); press({ id: act, p: label, st: 'nav', act }); }}
        style={{
          width: 32, height: 32,
          background: BG_NAV,
          border: '1px solid #555',
          borderRadius: '50%',
          color: FG_NAV,
          fontSize: 11,
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: SH_NAV,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 0,
          ...extraStyle,
        }}
      >{label}</button>
    );
  }

  function renderKey(k: K) {
    if (k.act === '__NOOP') return <div key={k.id} style={{ flex: k.w ?? 1 }} />;

    const isActive = (k.act === 'SHIFT' && s.shift)
                  || (k.act === 'ALPHA' && s.alpha)
                  || (k.act === 'HYP'   && s.hyp);

    const isNumRow = k.st === 'num';
    const isFn     = k.st === 'fn';
    const isDel    = k.st === 'del';

    const bg     = isActive ? '#fff'    : isDel ? BG_DEL : isFn ? BG_FN : BG_NUM;
    const fg     = isActive ? '#d0103a' : isDel ? FG_DEL : isFn ? FG_FN : FG_NUM;
    const sh     = isDel ? SH_DEL : isFn ? SH_FN : SH_NUM;
    const h      = isNumRow || isDel ? 34 : 24;
    const fsize  = isNumRow || isDel ? 14 : 9;
    const fw     = isNumRow || isDel ? 'bold' : '600';
    const br     = isNumRow || isDel ? 5 : 3;

    return (
      <div key={k.id} style={{ flex: k.w ?? 1, display:'flex', flexDirection:'column', alignItems:'center', minWidth:0 }}>
        {/* Shift label */}
        <div style={{ height:10, display:'flex', alignItems:'center', justifyContent:'center' }}>
          {k.s && <span style={{ fontSize:5.5, color:'#e8960a', fontWeight:'bold', lineHeight:1, whiteSpace:'nowrap', letterSpacing:'-0.02em' }}>{k.s}</span>}
        </div>
        {/* Alpha label */}
        <div style={{ height:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
          {k.a && <span style={{ fontSize:5.5, color:'#e040a0', fontWeight:'bold', lineHeight:1, whiteSpace:'nowrap' }}>{k.a}</span>}
        </div>
        {/* Button */}
        <button
          onMouseDown={e => { e.preventDefault(); press(k); }}
          style={{
            width:'100%', height: h,
            background: bg, color: fg,
            border: isDel || isNumRow ? '1px solid #ccc' : '1px solid #111',
            borderRadius: br,
            fontSize: fsize, fontWeight: fw,
            cursor: 'pointer',
            boxShadow: isActive ? 'none' : sh,
            padding: '0 1px', lineHeight: 1,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.15)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = ''; }}
        >{k.p}</button>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed',
      left: pos.x, top: pos.y,
      zIndex: 9999,
      width: 268,
      background: BG_RIM,
      borderRadius: 18,
      boxShadow: '0 20px 60px rgba(0,0,0,0.85)',
      fontFamily: '"Arial Narrow", Arial, sans-serif',
      userSelect: 'none',
      padding: '6px 6px 10px',
    }}>

      {/* ── Inner black face ─────────────────────────────────────────────── */}
      <div style={{
        background: BG_BODY,
        borderRadius: 13,
        overflow: 'hidden',
        paddingBottom: 8,
      }}>

        {/* ── Top bar: CASIO + solar ────────────────────────────────────── */}
        <div
          onMouseDown={onHeaderDown}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            padding: '8px 12px 4px',
            cursor: 'grab',
          }}
        >
          {/* Left: branding */}
          <div>
            <div style={{ color: '#fff', fontSize: 15, fontWeight: 900, letterSpacing: '0.12em', lineHeight: 1.1 }}>
              CASIO
            </div>
            <div style={{ color: '#aaa', fontSize: 8.5, letterSpacing: '0.04em', lineHeight: 1.2 }}>fx-991EX</div>
            <div style={{
              color: '#e8204a',
              fontSize: 9,
              fontWeight: 'bold',
              letterSpacing: '0.22em',
              lineHeight: 1.1,
              fontFamily: '"Courier New", monospace',
            }}>CLASSWIZ</div>
          </div>
          {/* Right: solar panel + close */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={onClose}
              style={{ background:'transparent', border:'none', color:'rgba(200,200,200,0.4)', cursor:'pointer', fontSize:16, lineHeight:1, padding:0 }}
            >×</button>
            {/* Solar panel */}
            <div style={{
              width: 72, height: 22,
              background: 'linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)',
              border: '1px solid #555',
              borderRadius: 3,
            }} />
          </div>
        </div>

        {/* ── LCD display ─────────────────────────────────────────────────── */}
        <div style={{ margin: '4px 10px 6px', padding: 3, background: '#555', borderRadius: 4 }}>
          <div style={{
            background: BG_LCD,
            borderRadius: 2,
            padding: '5px 9px 6px',
            minHeight: 66,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.2)',
          }}>
            {/* Status row */}
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:1 }}>
              <div style={{ display:'flex', gap:5, alignItems:'center' }}>
                <span style={{ fontSize:7.5, color:LCD_TXT, fontWeight:'bold' }}>{s.angle}</span>
                {s.shift && <span style={{ fontSize:6.5, background:'#e8960a', color:'#fff', padding:'0 2px', borderRadius:1, fontWeight:'bold' }}>S</span>}
                {s.alpha && <span style={{ fontSize:6.5, background:'#d0103a', color:'#fff', padding:'0 2px', borderRadius:1, fontWeight:'bold' }}>A</span>}
                {s.hyp   && <span style={{ fontSize:6.5, background:'#446',    color:'#fff', padding:'0 2px', borderRadius:1, fontWeight:'bold' }}>H</span>}
              </div>
              <span style={{ fontSize:7.5, color:LCD_TXT }}>COMP</span>
            </div>
            {/* Expression line */}
            <div style={{
              flex:1, fontSize:10.5, color:LCD_TXT,
              textAlign:'right', wordBreak:'break-all', lineHeight:1.35, minHeight:14,
            }}>
              {s.expr}
            </div>
            {/* Result line */}
            <div style={{
              fontSize: 22, fontWeight:'bold',
              color: s.err ? '#880000' : LCD_TXT,
              textAlign:'right', minHeight:26, lineHeight:1.1, marginTop:1,
            }}>
              {s.result || (!s.expr && !s.fresh ? '0' : '')}
            </div>
          </div>
        </div>

        {/* ── Navigation row ──────────────────────────────────────────────── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'2px 14px 4px' }}>
          {/* SHIFT */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
            <span style={{ fontSize:6, color:'#e8960a', fontWeight:'bold' }}>SHIFT</span>
            {navBtn('', 'SHIFT', 'SHIFT', { width:28, height:28 })}
          </div>

          {/* ALPHA */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
            <span style={{ fontSize:6, color:'#e040a0', fontWeight:'bold' }}>ALPHA</span>
            {navBtn('', 'ALPHA', 'ALPHA', { width:28, height:28 })}
          </div>

          {/* D-pad cluster */}
          <div style={{ position:'relative', width:64, height:64 }}>
            {/* outer ring */}
            <div style={{
              position:'absolute', inset:0,
              background: 'radial-gradient(circle at 40% 35%, #aaa 0%, #777 40%, #444 100%)',
              borderRadius:'50%',
              boxShadow:'0 4px 8px rgba(0,0,0,0.7)',
            }} />
            {/* centre dot */}
            <div style={{
              position:'absolute',
              top:'50%', left:'50%',
              transform:'translate(-50%,-50%)',
              width:20, height:20,
              background:'radial-gradient(circle at 40% 35%, #999 0%, #555 100%)',
              borderRadius:'50%',
              boxShadow:'0 1px 3px rgba(0,0,0,0.6)',
            }} />
            {/* ▲ */}
            <button onMouseDown={e=>{e.preventDefault();press({id:'UP',p:'▲',st:'nav',act:'HIST_UP'});}}
              style={{ position:'absolute', top:2, left:'50%', transform:'translateX(-50%)', background:'transparent', border:'none', color:'#ddd', fontSize:11, cursor:'pointer', padding:'2px 6px' }}>▲</button>
            {/* ▼ */}
            <button onMouseDown={e=>{e.preventDefault();press({id:'DN',p:'▼',st:'nav',act:'HIST_DOWN'});}}
              style={{ position:'absolute', bottom:2, left:'50%', transform:'translateX(-50%)', background:'transparent', border:'none', color:'#ddd', fontSize:11, cursor:'pointer', padding:'2px 6px' }}>▼</button>
            {/* ◀ */}
            <button onMouseDown={e=>{e.preventDefault();press({id:'LT',p:'◀',st:'nav',act:'LEFT'});}}
              style={{ position:'absolute', left:2, top:'50%', transform:'translateY(-50%)', background:'transparent', border:'none', color:'#ddd', fontSize:11, cursor:'pointer', padding:'4px 3px' }}>◀</button>
            {/* ▶ */}
            <button onMouseDown={e=>{e.preventDefault();press({id:'RT',p:'▶',st:'nav',act:'RIGHT'});}}
              style={{ position:'absolute', right:2, top:'50%', transform:'translateY(-50%)', background:'transparent', border:'none', color:'#ddd', fontSize:11, cursor:'pointer', padding:'4px 3px' }}>▶</button>
          </div>

          {/* MENU */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
            <span style={{ fontSize:6, color:'#bbb', fontWeight:'bold' }}>MENU</span>
            {navBtn('', 'MENU', 'NOOP', { width:28, height:28 })}
          </div>

          {/* ON */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
            <span style={{ fontSize:6, color:'#bbb', fontWeight:'bold' }}>ON</span>
            {navBtn('', 'ON', 'AC', { width:28, height:28 })}
          </div>
        </div>

        {/* ── Key rows ────────────────────────────────────────────────────── */}
        <div style={{ padding:'0 8px' }}>
          {KEYROWS.map((row, ri) => (
            <div key={ri} style={{
              display:'flex',
              gap: ri >= 4 ? 5 : 4,
              marginBottom: ri >= 4 ? 5 : 2,
              alignItems:'flex-end',
            }}>
              {row.map(k => renderKey(k))}
            </div>
          ))}
        </div>

      </div>{/* end inner black face */}
    </div>
  );
}

// Made with Bob
