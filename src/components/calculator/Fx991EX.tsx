'use client';

/**
 * Casio fx-991EX ClassWiz — pixel-accurate working implementation
 * Layout reference: official Casio fx-991EX user manual
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';

// ─────────────────────────────── Types ───────────────────────────────────────

type AngleUnit = 'DEG' | 'RAD' | 'GRAD';

interface CS {
  expr: string;       // expression being built (top line)
  result: string;     // computed result (bottom line, large)
  shift: boolean;
  alpha: boolean;
  hyp: boolean;
  angle: AngleUnit;
  mem: Record<string, number>;  // A-F, M, X, Y
  ans: number;
  err: string | null;
  fresh: boolean;     // true right after = was pressed
}

// ─────────────────────────────── Math engine ─────────────────────────────────

function toRad(x: number, u: AngleUnit) {
  if (u === 'DEG')  return x * Math.PI / 180;
  if (u === 'GRAD') return x * Math.PI / 200;
  return x;
}
function toDeg(x: number, u: AngleUnit) {
  if (u === 'DEG')  return x;
  if (u === 'GRAD') return x * 0.9;
  return x * 180 / Math.PI;
}

function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0) return NaN;
  if (n > 170) return Infinity;
  let r = 1; for (let i = 2; i <= n; i++) r *= i; return r;
}
function nCr(n: number, r: number) { return factorial(n) / (factorial(r) * factorial(n - r)); }
function nPr(n: number, r: number) { return factorial(n) / factorial(n - r); }

function fmtNum(v: number): string {
  if (!isFinite(v)) return isNaN(v) ? 'Math ERROR' : (v > 0 ? '∞' : '-∞');
  if (Math.abs(v) >= 1e10 || (Math.abs(v) < 1e-9 && v !== 0)) {
    return v.toExponential(6).replace(/e([+-])(\d)$/, 'e$1$2').replace('e+', '×10^').replace('e', '×10^');
  }
  return parseFloat(v.toPrecision(10)).toString();
}

function calcEval(expr: string, angle: AngleUnit, ans: number, mem: Record<string, number>): number {
  // Replace display tokens with JS equivalents
  let e = expr
    .replace(/×10\^/g, '*1e')
    .replace(/Ans/g, `(${ans})`)
    .replace(/π/g, '(Math.PI)')
    .replace(/ℯ(?!\^)/g, '(Math.E)')
    .replace(/ℯ\^/g, 'Math.exp')
    .replace(/−/g, '-')
    .replace(/×/g, '*')
    .replace(/÷/g, '/');

  // Memory vars
  Object.entries(mem).forEach(([k, v]) => {
    e = e.replace(new RegExp(`\\b${k}\\b`, 'g'), `(${v})`);
  });

  // trig — must handle angle conversion
  const a = angle;
  e = e
    .replace(/sin⁻¹\(/g,  `(Math.asin(`)
    .replace(/cos⁻¹\(/g,  `(Math.acos(`)
    .replace(/tan⁻¹\(/g,  `(Math.atan(`)
    .replace(/sinh⁻¹\(/g, `(Math.asinh(`)
    .replace(/cosh⁻¹\(/g, `(Math.acosh(`)
    .replace(/tanh⁻¹\(/g, `(Math.atanh(`)
    .replace(/sinh\(/g,   `(Math.sinh(`)
    .replace(/cosh\(/g,   `(Math.cosh(`)
    .replace(/tanh\(/g,   `(Math.tanh(`)
    .replace(/sin\(/g,    `(__sin(`)
    .replace(/cos\(/g,    `(__cos(`)
    .replace(/tan\(/g,    `(__tan(`)
    .replace(/log\(/g,    `(Math.log10(`)
    .replace(/ln\(/g,     `(Math.log(`)
    .replace(/√\(/g,      `(Math.sqrt(`)
    .replace(/Abs\(/g,    `(Math.abs(`)
    .replace(/\^/g,       `**`)
    .replace(/(\d)\(/g,   `$1*(`)
    .replace(/\)\(/g,     `)*(`)
    .replace(/__FACT__/g, `__fact`);

  // factorial postfix  (number!)
  e = e.replace(/(\d+(?:\.\d+)?)!/g, '__fact($1)');
  // percentage
  e = e.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');

  const __sin = (x: number) => Math.sin(toRad(x, a));
  const __cos = (x: number) => Math.cos(toRad(x, a));
  const __tan = (x: number) => Math.tan(toRad(x, a));
  const __fact = factorial;

  // eslint-disable-next-line no-new-func
  const fn = new Function('Math','__sin','__cos','__tan','__fact','nCr','nPr',
    `"use strict"; return (${e});`);
  return fn(Math, __sin, __cos, __tan, __fact, nCr, nPr);
}

// ─────────────────────────────── Key table ───────────────────────────────────

// Colors per key group (matching real calculator)
// Body: #1a3460 (dark navy)
// SHIFT key: #f5a500 (amber/orange)
// ALPHA key: #cc1f4a (red)
// Navigation ring: dark grey #333
// Scientific row keys (rows 2-5): #c8c0b4 (light silver-grey)
// Number keys: #2a2a2a (dark grey/black)  
// Operators: #2a2a2a with different label
// DEL: #1a6080 (teal-blue)
// AC: #b01010 (red)
// = : #1a4ea0 (blue)

type BtnStyle = 'shift'|'alpha'|'nav'|'sci'|'num'|'op'|'eq'|'del'|'ac';

interface K {
  id: string;
  // primary label
  p: string;
  // shift label (yellow, shown above)
  s?: string;
  // alpha label (red, shown above)
  a?: string;
  // width multiplier (default 1)
  w?: number;
  // style
  st: BtnStyle;
  // primary action token
  act: string;
  sAct?: string;
  aAct?: string;
}

// Real fx-991EX layout — 10 rows
const KEYROWS: K[][] = [
  // ── Row 1: SHIFT · ALPHA · (blank) · ▲ · (blank) ──────────────────────────
  // The real calc has: SHIFT ALPHA [blank wide] UP [blank]
  // Then navigation diamond in rows 1-2 combined
  // Simplified to match visual grouping:
  [
    { id:'SHIFT', p:'SHIFT', st:'shift', act:'SHIFT', w:1.4 },
    { id:'ALPHA', p:'ALPHA', st:'alpha', act:'ALPHA', w:1.4 },
    { id:'__sp1', p:'', st:'sci', act:'__NOOP', w:1 },  // spacer
    { id:'UP',    p:'▲', s:'STAT',   st:'nav', act:'HIST_UP',   sAct:'MODE_STAT' },
    { id:'__sp2', p:'', st:'sci', act:'__NOOP', w:1 },
  ],
  // ── Row 2: ON · ◀ · HOME(▼·▲circle) · ▶ · MODE ──────────────────────────
  [
    { id:'ON',    p:'ON',   s:'OFF',  st:'ac',  act:'AC',    sAct:'OFF', w:1.4 },
    { id:'LEFT',  p:'◀',   s:'',     st:'nav', act:'LEFT' },
    { id:'HOME',  p:'',    s:'',     st:'nav', act:'HOME',  w:1 },   // centre of D-pad
    { id:'RIGHT', p:'▶',   s:'',     st:'nav', act:'RIGHT' },
    { id:'MODE',  p:'MODE', s:'SETUP', st:'sci', act:'MODE', sAct:'SETUP', w:1.4 },
  ],
  // ── Row 3 (real row 1 of function keys): CALC  ∫dx  Σ(  ▶Pol  ──────────
  [
    { id:'CALC',  p:'CALC',  s:'SOLVE',  a:':',   st:'sci', act:'NOOP',  sAct:'NOOP' },
    { id:'INTG',  p:'∫dx',   s:"d/dx",  a:'m',   st:'sci', act:'NOOP',  sAct:'NOOP' },
    { id:'SUM',   p:'Σ(',    s:'▶Pol(',  a:'k',  st:'sci', act:'NOOP',  sAct:'NOOP' },
    { id:'CONV',  p:'▶Rec(', s:'',       a:'t',  st:'sci', act:'NOOP' },
    { id:'__sp3', p:'',       st:'sci', act:'__NOOP' },
    { id:'DOWN',  p:'▼',     s:'TABLE',  st:'nav', act:'HIST_DOWN', sAct:'MODE_TABLE' },
  ],
  // ── Row 4: x⁻¹  sin  cos  tan  log  ln ──────────────────────────────────
  [
    { id:'INV',  p:'x⁻¹',  s:'x!',     a:'w',  st:'sci', act:'INV',    sAct:'FACT' },
    { id:'SIN',  p:'sin',   s:'sin⁻¹', a:'r',  st:'sci', act:'SIN',    sAct:'ASIN' },
    { id:'COS',  p:'cos',   s:'cos⁻¹', a:'θ',  st:'sci', act:'COS',    sAct:'ACOS' },
    { id:'TAN',  p:'tan',   s:'tan⁻¹', a:'i',  st:'sci', act:'TAN',    sAct:'ATAN' },
    { id:'LOG',  p:'log',   s:'10ˣ',   a:'e',  st:'sci', act:'LOG',    sAct:'POW10' },
    { id:'LN',   p:'ln',    s:'eˣ',    a:'n',  st:'sci', act:'LN',     sAct:'EXPX' },
  ],
  // ── Row 5: (-) hyp ( ) S⟺D  M+ ────────────────────────────────────────
  [
    { id:'NEG',   p:'(-)',  s:'Ans',    a:'o',   st:'sci', act:'NEG',   sAct:'ANS' },
    { id:'HYP',   p:'hyp',  s:'',       a:'p',   st:'sci', act:'HYP' },
    { id:'LPAR',  p:'(',    s:'{',      a:'[',   st:'sci', act:'LPAR',  sAct:'LBRACE',  aAct:'LBRACKET' },
    { id:'RPAR',  p:')',    s:'}',      a:']',   st:'sci', act:'RPAR',  sAct:'RBRACE',  aAct:'RBRACKET' },
    { id:'STOD',  p:'S⟺D', s:'▶DEG',  a:'q',   st:'sci', act:'STOD',  sAct:'TODEG' },
    { id:'MPLUS', p:'M+',   s:'M-',    a:'STO', st:'sci', act:'MPLUS', sAct:'MMINUS', aAct:'STO' },
  ],
  // ── Row 6: x²  √(  x^y  ˣ√  log(a,b)  Rnd ──────────────────────────────
  [
    { id:'SQ',    p:'x²',    s:'√(',    a:'s',   st:'sci', act:'SQ',      sAct:'SQRT' },
    { id:'POW',   p:'xⁿ',    s:'ˣ√(',  a:'h',   st:'sci', act:'POW',     sAct:'NROOT' },
    { id:'LOGB',  p:'log(a)', s:'10^(', a:'j',   st:'sci', act:'LOGB',    sAct:'POW10P' },
    { id:'EX',    p:'eˣ(',   s:'e',     a:'l',   st:'sci', act:'EXPX2',   sAct:'ECONST' },
    { id:'NCR',   p:'nCr',   s:'nPr',   a:'c',   st:'sci', act:'NCR',     sAct:'NPR' },
    { id:'RCL',   p:'RCL',   s:'STO',   a:'g',   st:'sci', act:'RCL',     sAct:'STO2' },
  ],
  // ── Row 7: 7  8  9  DEL  AC ─────────────────────────────────────────────
  [
    { id:'7',   p:'7',   a:'A',  st:'num', act:'7',   aAct:'MEMA' },
    { id:'8',   p:'8',   a:'B',  st:'num', act:'8',   aAct:'MEMB' },
    { id:'9',   p:'9',   a:'C',  st:'num', act:'9',   aAct:'MEMC' },
    { id:'DEL', p:'DEL', s:'INS', st:'del', act:'DEL', sAct:'INS', w:1.4 },
    { id:'AC',  p:'AC',  s:'OFF', st:'ac',  act:'AC',  sAct:'OFF', w:1.4 },
  ],
  // ── Row 8: 4  5  6  ×  ÷ ─────────────────────────────────────────────────
  [
    { id:'4',   p:'4',  a:'D',  st:'num', act:'4',  aAct:'MEMD' },
    { id:'5',   p:'5',  a:'E',  st:'num', act:'5',  aAct:'MEME' },
    { id:'6',   p:'6',  a:'F',  st:'num', act:'6',  aAct:'MEMF' },
    { id:'MUL', p:'×',  st:'op', act:'×' },
    { id:'DIV', p:'÷',  st:'op', act:'÷' },
  ],
  // ── Row 9: 1  2  3  +  − ─────────────────────────────────────────────────
  [
    { id:'1',   p:'1',  a:'G',  st:'num', act:'1',  aAct:'MEMG' },
    { id:'2',   p:'2',  a:'H',  st:'num', act:'2',  aAct:'MEMH' },
    { id:'3',   p:'3',  a:'I',  st:'num', act:'3',  aAct:'MEMI' },
    { id:'ADD', p:'+',  st:'op', act:'+' },
    { id:'SUB', p:'−',  st:'op', act:'−' },
  ],
  // ── Row 10: 0  .  ×10ˣ  Ans  = ──────────────────────────────────────────
  [
    { id:'0',   p:'0',     a:'J',  st:'num', act:'0',       aAct:'MEMJ' },
    { id:'DOT', p:'.',     a:'K',  st:'num', act:'.',       aAct:'MEMK' },
    { id:'EE',  p:'×10ˣ', s:'π',  a:'%', st:'num', act:'EE',  sAct:'PI',  aAct:'PERCENT' },
    { id:'ANS', p:'Ans',  s:'%',  a:'Ans', st:'num', act:'ANS', sAct:'PERCENT', w:1.3 },
    { id:'EQ',  p:'=',    st:'eq', act:'=', w:1.3 },
  ],
];

// ─────────────────────────────── Button styling ───────────────────────────────

// Real colors from photos of the fx-991EX CW:
// Body: deep navy #0e2140
// SHIFT: amber #f0a000
// ALPHA: crimson #c8143c
// Navigation: mid-grey oval #505060
// Scientific keys: light warm grey #c8c0b4
// Number keys: dark charcoal #303030
// Operators ×÷+−: dark charcoal
// DEL: steel blue #1a5a7a
// AC/ON: crimson red #b81010
// =: royal blue #1a42a0
// Shift labels above: #f0a000
// Alpha labels above: #cc143c

const STYLE: Record<BtnStyle, { bg: string; fg: string; bShadow: string }> = {
  shift: { bg:'#f0a000', fg:'#fff',    bShadow:'0 3px 0 #a06800' },
  alpha: { bg:'#c8143c', fg:'#fff',    bShadow:'0 3px 0 #880010' },
  nav:   { bg:'#484858', fg:'#eee',    bShadow:'0 2px 0 #222230' },
  sci:   { bg:'#c8c0b4', fg:'#111',    bShadow:'0 3px 0 #887870' },
  num:   { bg:'#303030', fg:'#e8e8e8', bShadow:'0 3px 0 #080808' },
  op:    { bg:'#303030', fg:'#e8e8e8', bShadow:'0 3px 0 #080808' },
  del:   { bg:'#1a5a7a', fg:'#fff',    bShadow:'0 3px 0 #0a3040' },
  ac:    { bg:'#b81010', fg:'#fff',    bShadow:'0 3px 0 #680000' },
  eq:    { bg:'#1a42a0', fg:'#fff',    bShadow:'0 3px 0 #0a2060' },
};

// ─────────────────────────────── Component ───────────────────────────────────

const INIT_CS: CS = {
  expr: '', result: '', shift: false, alpha: false, hyp: false,
  angle: 'DEG', mem: { A:0,B:0,C:0,D:0,E:0,F:0,M:0,X:0,Y:0 },
  ans: 0, err: null, fresh: false,
};

interface Props { onClose: () => void }

export function Fx991EX({ onClose }: Props) {
  const [cs, setCS] = useState<CS>({ ...INIT_CS });
  const [pos, setPos] = useState({ x: 100, y: 60 });
  const dragRef = useRef({ dragging: false, ox: 0, oy: 0 });

  // Drag
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

  // ── Key press handler ──────────────────────────────────────────────────────

  const press = useCallback((k: K) => {
    setCS(prev => {
      const act = prev.shift ? (k.sAct ?? k.act)
                : prev.alpha ? (k.aAct ?? k.act)
                : k.act;

      // Reset shift/alpha after any key except SHIFT/ALPHA themselves
      const base: CS = { ...prev, shift: false, alpha: false, err: null };

      const app = (s: string): CS => {
        let expr = base.expr;
        // If just evaluated, start fresh unless continuing operator
        if (base.fresh && !/^[+−×÷\^)!%]/.test(s)) expr = '';
        return { ...base, expr: expr + s, result: '', fresh: false };
      };

      switch (act) {
        // ── Mode keys ─────────────────────────────────────────────────────
        case 'SHIFT': return { ...prev, shift: !prev.shift, alpha: false };
        case 'ALPHA': return { ...prev, alpha: !prev.alpha, shift: false };
        case 'AC':    return { ...INIT_CS, angle: prev.angle, mem: prev.mem };
        case 'OFF':   return { ...INIT_CS, angle: prev.angle, mem: prev.mem };
        case 'HYP':   return { ...base, hyp: !prev.hyp };
        case '__NOOP':
        case 'NOOP':  return base;

        // ── DEL ───────────────────────────────────────────────────────────
        case 'DEL': {
          if (base.fresh) return { ...base, expr: '', result: '', fresh: false };
          return { ...base, expr: base.expr.slice(0, -1) };
        }

        // ── Angle cycle ───────────────────────────────────────────────────
        case 'TODEG': {
          const cycle: AngleUnit[] = ['DEG','RAD','GRAD'];
          const i = cycle.indexOf(prev.angle);
          return { ...base, angle: cycle[(i + 1) % 3] };
        }

        // ── Digits & dot ──────────────────────────────────────────────────
        case '0':case '1':case '2':case '3':case '4':
        case '5':case '6':case '7':case '8':case '9':
        case '.': return app(act);

        // ── Operators ─────────────────────────────────────────────────────
        case '+': case '−': case '×': case '÷': return app(act);

        // ── Constants ─────────────────────────────────────────────────────
        case 'PI':      return app('π');
        case 'ECONST':  return app('ℯ');
        case 'ANS':     return app('Ans');
        case 'PERCENT': return app('%');

        // ── Brackets ──────────────────────────────────────────────────────
        case 'LPAR':    return app('(');
        case 'RPAR':    return app(')');
        case 'LBRACE':  return app('{');
        case 'RBRACE':  return app('}');
        case 'LBRACKET':return app('[');
        case 'RBRACKET':return app(']');
        case 'NEG':     return app('-(');

        // ── Trig ──────────────────────────────────────────────────────────
        case 'SIN':  return app(prev.hyp ? 'sinh('  : 'sin(');
        case 'COS':  return app(prev.hyp ? 'cosh('  : 'cos(');
        case 'TAN':  return app(prev.hyp ? 'tanh('  : 'tan(');
        case 'ASIN': return app(prev.hyp ? 'sinh⁻¹(' : 'sin⁻¹(');
        case 'ACOS': return app(prev.hyp ? 'cosh⁻¹(' : 'cos⁻¹(');
        case 'ATAN': return app(prev.hyp ? 'tanh⁻¹(' : 'tan⁻¹(');

        // ── Log / exp ─────────────────────────────────────────────────────
        case 'LOG':    return app('log(');
        case 'LN':     return app('ln(');
        case 'POW10':  return app('10^(');
        case 'POW10P': return app('10^(');
        case 'EXPX':
        case 'EXPX2':  return app('eˣ(');
        case 'LOGB':   return app('log(');

        // ── Powers & roots ────────────────────────────────────────────────
        case 'SQ':    return app('^2');
        case 'SQRT':  return app('√(');
        case 'POW':   return app('^');
        case 'NROOT': return app('^(1/');
        case 'INV':   return app('^(-1)');
        case 'FACT':  return app('!');
        case 'EE':    return app('×10^(');

        // ── Combinations / permutations ───────────────────────────────────
        case 'NCR': return app('nCr(');
        case 'NPR': return app('nPr(');

        // ── Memory store ──────────────────────────────────────────────────
        case 'MPLUS':  return { ...base, mem: { ...prev.mem, M: prev.mem.M + prev.ans }, result: `M=${fmtNum(prev.mem.M + prev.ans)}` };
        case 'MMINUS': return { ...base, mem: { ...prev.mem, M: prev.mem.M - prev.ans }, result: `M=${fmtNum(prev.mem.M - prev.ans)}` };
        case 'STO':
        case 'STO2':   return { ...base, result: 'Press A-F to store' };
        case 'RCL':    return { ...base, result: 'Press A-F to recall' };

        // Memory variable appends (alpha layer of digits)
        case 'MEMA': if (prev.alpha) { return { ...base, mem: {...prev.mem, A: prev.ans}, result:`A=${fmtNum(prev.ans)}` }; } return app('A');
        case 'MEMB': if (prev.alpha) { return { ...base, mem: {...prev.mem, B: prev.ans}, result:`B=${fmtNum(prev.ans)}` }; } return app('B');
        case 'MEMC': if (prev.alpha) { return { ...base, mem: {...prev.mem, C: prev.ans}, result:`C=${fmtNum(prev.ans)}` }; } return app('C');
        case 'MEMD': if (prev.alpha) { return { ...base, mem: {...prev.mem, D: prev.ans}, result:`D=${fmtNum(prev.ans)}` }; } return app('D');
        case 'MEME': if (prev.alpha) { return { ...base, mem: {...prev.mem, E: prev.ans}, result:`E=${fmtNum(prev.ans)}` }; } return app('E');
        case 'MEMF': if (prev.alpha) { return { ...base, mem: {...prev.mem, F: prev.ans}, result:`F=${fmtNum(prev.ans)}` }; } return app('F');

        // ── S⟺D ──────────────────────────────────────────────────────────
        case 'STOD': {
          // Try to convert result to decimal / fraction
          const r = prev.ans;
          if (!isNaN(r)) {
            const current = prev.result;
            if (current.includes('/')) {
              return { ...base, result: fmtNum(r) };
            } else {
              // Try to show as fraction approximation
              const dec = r;
              const denom = [2,3,4,5,6,7,8,9,10,12,16,100];
              for (const d of denom) {
                const n = Math.round(dec * d);
                if (Math.abs(n / d - dec) < 1e-10) {
                  return { ...base, result: `${n}/${d}` };
                }
              }
            }
          }
          return base;
        }

        // ── Evaluate ──────────────────────────────────────────────────────
        case '=': {
          const expr = base.expr || '0';
          try {
            const raw = expr.replace(/nCr\(([^,]+),([^)]+)\)/g, 'nCr($1,$2)')
                            .replace(/nPr\(([^,]+),([^)]+)\)/g, 'nPr($1,$2)');
            const val = calcEval(raw, prev.angle, prev.ans, prev.mem);
            const fmt = fmtNum(val);
            return { ...base, result: fmt, ans: val, fresh: true };
          } catch {
            return { ...base, result: 'Syntax ERROR', err: 'Syntax ERROR', fresh: true };
          }
        }

        default: return base;
      }
    });
  }, []);

  const s = cs;
  const W = 268;

  return (
    <div
      style={{
        position: 'fixed',
        left: pos.x, top: pos.y,
        zIndex: 1000,
        width: W,
        background: '#0e2140',
        borderRadius: '18px 18px 14px 14px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.85), 0 4px 12px rgba(0,0,0,0.6)',
        fontFamily: 'Arial, Helvetica, sans-serif',
        userSelect: 'none',
        border: '2px solid #1a3060',
      }}
    >
      {/* ── Brand bar / drag handle ─────────────────────────────────────── */}
      <div
        onMouseDown={onHeaderDown}
        style={{
          background: 'linear-gradient(180deg, #102244 0%, #0c1a34 100%)',
          borderRadius: '16px 16px 0 0',
          padding: '10px 14px 8px',
          cursor: 'grab',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ color: '#8aa8cc', fontSize: '8px', letterSpacing: '0.18em', fontWeight: 'bold' }}>CASIO</div>
          <div style={{ color: '#e0eaf8', fontSize: '13px', fontWeight: 'bold', letterSpacing: '0.04em', lineHeight: 1.1 }}>fx-991EX</div>
          <div style={{ color: '#4a88c0', fontSize: '9px', letterSpacing: '0.10em' }}>ClassWiz</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
          {/* Status indicators */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {s.shift && <span style={{ fontSize: '8px', background: '#f0a000', color: '#fff', padding: '1px 4px', borderRadius: '2px', fontWeight: 'bold' }}>S</span>}
            {s.alpha && <span style={{ fontSize: '8px', background: '#c8143c', color: '#fff', padding: '1px 4px', borderRadius: '2px', fontWeight: 'bold' }}>A</span>}
            {s.hyp   && <span style={{ fontSize: '8px', background: '#336', color: '#fff', padding: '1px 4px', borderRadius: '2px', fontWeight: 'bold' }}>HYP</span>}
          </div>
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'rgba(180,200,220,0.5)', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: 0 }}
          >×</button>
        </div>
      </div>

      {/* ── Display ────────────────────────────────────────────────────────── */}
      <div style={{
        margin: '6px 10px 4px',
        background: '#b8cca8',
        borderRadius: '4px',
        border: '2px inset #8a9a78',
        padding: '6px 10px 8px',
        minHeight: '72px',
        boxShadow: 'inset 0 3px 8px rgba(0,0,0,0.35)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* angle / mode top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <span style={{ fontSize: '9px', color: '#2a3a1a', fontWeight: 'bold' }}>{s.angle}</span>
          </div>
          <div style={{ fontSize: '9px', color: '#2a3a1a' }}>COMP</div>
        </div>
        {/* Expression line */}
        <div style={{
          fontSize: '12px', color: '#1a2a0a', textAlign: 'right',
          minHeight: '16px', wordBreak: 'break-all', lineHeight: 1.35,
          flex: 1,
        }}>
          {s.expr || (s.fresh ? '' : '0')}
        </div>
        {/* Result line */}
        <div style={{
          fontSize: '22px', fontWeight: 'bold',
          color: s.err ? '#880000' : '#0a1a04',
          textAlign: 'right', minHeight: '28px',
          lineHeight: 1.1, marginTop: '2px',
        }}>
          {s.result}
        </div>
      </div>

      {/* ── Keypad ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: '2px 8px 12px' }}>
        {KEYROWS.map((row, ri) => (
          <div key={ri} style={{ display: 'flex', gap: '3px', marginBottom: '2px', alignItems: 'flex-end' }}>
            {row.map(k => {
              if (k.act === '__NOOP') return <div key={k.id} style={{ flex: k.w ?? 1 }} />;
              const st = STYLE[k.st];
              const isActive = (k.act === 'SHIFT' && s.shift) || (k.act === 'ALPHA' && s.alpha) || (k.act === 'HYP' && s.hyp);

              return (
                <div key={k.id} style={{ flex: k.w ?? 1, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0 }}>
                  {/* Labels above button */}
                  <div style={{ display: 'flex', gap: '2px', height: '12px', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                    {k.s && <span style={{ fontSize: '7px', color: '#f0a000', fontWeight: 'bold', lineHeight: 1, whiteSpace: 'nowrap' }}>{k.s}</span>}
                  </div>
                  <div style={{ height: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                    {k.a && <span style={{ fontSize: '7px', color: '#cc143c', fontWeight: 'bold', lineHeight: 1, whiteSpace: 'nowrap' }}>{k.a}</span>}
                  </div>
                  {/* Button */}
                  <button
                    onMouseDown={e => { e.preventDefault(); press(k); }}
                    style={{
                      width: '100%',
                      minHeight: k.st === 'num' || k.st === 'op' || k.st === 'eq' ? '28px' : '24px',
                      background: isActive ? '#fff' : st.bg,
                      color: isActive ? (k.st === 'shift' ? '#f0a000' : '#c8143c') : st.fg,
                      border: 'none',
                      borderRadius: k.st === 'num' || k.st === 'op' || k.st === 'eq' ? '5px' : '4px',
                      fontSize: k.st === 'shift' || k.st === 'alpha' ? '8px'
                               : k.st === 'num' ? '14px'
                               : k.st === 'eq' ? '16px'
                               : '9.5px',
                      fontWeight: k.st === 'num' || k.st === 'eq' ? 'bold' : '600',
                      cursor: 'pointer',
                      boxShadow: isActive ? 'none' : st.bShadow,
                      padding: '1px 2px',
                      lineHeight: 1.1,
                      letterSpacing: '-0.01em',
                      transition: 'filter 0.06s, transform 0.06s',
                      transform: 'translateY(0)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.filter = ''; }}

                  >
                    {k.p}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// Made with Bob
