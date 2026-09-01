'use client';

/**
 * Casio fx-991EX ClassWiz — pixel-accurate floating calculator
 * Matches the real physical device layout and colour scheme.
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
    return v.toExponential(9).replace(/\.?0+e/, 'e');
  }
  const s = parseFloat(v.toPrecision(10)).toString();
  return s;
}

function calcEval(expr: string, angle: AngleUnit, ans: number, mem: Record<string, number>): number {
  let e = expr;
  // substitutions
  e = e.replace(/Ans/g, `(${ans})`);
  e = e.replace(/π/g, `(${Math.PI})`);
  e = e.replace(/ℯ/g, `(${Math.E})`);
  Object.entries(mem).forEach(([k, v]) => { e = e.replace(new RegExp(`\\b${k}\\b`, 'g'), `(${v})`); });
  // trig
  e = e.replace(/sinh\(([^)]+)\)/g, (_,x) => `(Math.sinh(${x}))`);
  e = e.replace(/cosh\(([^)]+)\)/g, (_,x) => `(Math.cosh(${x}))`);
  e = e.replace(/tanh\(([^)]+)\)/g, (_,x) => `(Math.tanh(${x}))`);
  e = e.replace(/sinh⁻¹\(([^)]+)\)/g, (_,x) => `(Math.asinh(${x}))`);
  e = e.replace(/cosh⁻¹\(([^)]+)\)/g, (_,x) => `(Math.acosh(${x}))`);
  e = e.replace(/tanh⁻¹\(([^)]+)\)/g, (_,x) => `(Math.atanh(${x}))`);
  e = e.replace(/sin⁻¹\(([^)]+)\)/g, (_,x) => `(${angle==='RAD'?1:angle==='GRAD'?200/Math.PI:180/Math.PI}*Math.asin(${x}))`);
  e = e.replace(/cos⁻¹\(([^)]+)\)/g, (_,x) => `(${angle==='RAD'?1:angle==='GRAD'?200/Math.PI:180/Math.PI}*Math.acos(${x}))`);
  e = e.replace(/tan⁻¹\(([^)]+)\)/g, (_,x) => `(${angle==='RAD'?1:angle==='GRAD'?200/Math.PI:180/Math.PI}*Math.atan(${x}))`);
  e = e.replace(/sin\(([^)]+)\)/g, (_,x) => `(Math.sin(${toRad(parseFloat(x),angle)}))`);
  e = e.replace(/cos\(([^)]+)\)/g, (_,x) => `(Math.cos(${toRad(parseFloat(x),angle)}))`);
  e = e.replace(/tan\(([^)]+)\)/g, (_,x) => `(Math.tan(${toRad(parseFloat(x),angle)}))`);
  e = e.replace(/log\(([^)]+)\)/g, (_,x) => `(Math.log10(${x}))`);
  e = e.replace(/ln\(([^)]+)\)/g, (_,x) => `(Math.log(${x}))`);
  e = e.replace(/√\(([^)]+)\)/g, (_,x) => `(Math.sqrt(${x}))`);
  e = e.replace(/eˣ\(([^)]+)\)/g, (_,x) => `(Math.exp(${x}))`);
  e = e.replace(/10\^\(([^)]+)\)/g, (_,x) => `(Math.pow(10,${x}))`);
  e = e.replace(/nCr\(([^,]+),([^)]+)\)/g, (_,n,r) => `(${nCr(parseFloat(n),parseFloat(r))})`);
  e = e.replace(/nPr\(([^,]+),([^)]+)\)/g, (_,n,r) => `(${nPr(parseFloat(n),parseFloat(r))})`);
  e = e.replace(/\^/g, '**');
  e = e.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
  e = e.replace(/(\d)!/g, (_,n) => `(${factorial(parseFloat(n))})`);
  // eslint-disable-next-line no-new-func
  const result = Function(`"use strict"; return (${e})`)();
  return typeof result === 'number' ? result : NaN;
}

// ─────────────────────────────── Key definitions ─────────────────────────────

type BtnStyle = 'shift'|'alpha'|'nav'|'sci'|'num'|'op'|'eq'|'del'|'ac'|'blank';

interface K {
  id: string;
  p: string;          // primary label
  s?: string;         // shift label (yellow, above)
  a?: string;         // alpha label (red, above)
  w?: number;         // flex width multiplier
  st: BtnStyle;
  act: string;
  sAct?: string;
  aAct?: string;
}

// Real fx-991EX key layout — matches the physical device row by row
const KEYROWS: K[][] = [
  // Row 1: SHIFT · ALPHA · [gap] · ▲ · [gap]
  [
    { id:'SHIFT', p:'SHIFT',  st:'shift', act:'SHIFT', w:1.3 },
    { id:'ALPHA', p:'ALPHA',  st:'alpha', act:'ALPHA', w:1.3 },
    { id:'_g1',   p:'',       st:'blank', act:'__NOOP', w:1.0 },
    { id:'UP',    p:'▲',      s:'STAT',   st:'nav',   act:'HIST_UP',  sAct:'NOOP', w:1.0 },
    { id:'_g2',   p:'',       st:'blank', act:'__NOOP', w:1.0 },
  ],
  // Row 2: ON · ◀ · [d-pad center] · ▶ · MODE
  [
    { id:'ON',    p:'ON',     s:'OFF',   st:'ac',  act:'AC',   sAct:'OFF',   w:1.3 },
    { id:'LEFT',  p:'◀',                 st:'nav', act:'LEFT',               w:1.0 },
    { id:'_ctr',  p:'',                  st:'nav', act:'HOME',               w:1.0 },
    { id:'RIGHT', p:'▶',                 st:'nav', act:'RIGHT',              w:1.0 },
    { id:'MODE',  p:'MODE',  s:'SETUP',  st:'sci', act:'NOOP', sAct:'NOOP', w:1.3 },
  ],
  // Row 3: OPTN · CALC · ∫dx · Σ( · ▶Rec( · ▼
  [
    { id:'OPTN',  p:'OPTN',  s:'SOLVE',  a:':',  st:'sci', act:'NOOP' },
    { id:'CALC',  p:'CALC',  s:'d/dx',   a:'m',  st:'sci', act:'NOOP' },
    { id:'INTG',  p:'∫dx',   s:'Pol(',   a:'k',  st:'sci', act:'NOOP' },
    { id:'SUM',   p:'Σ(',    s:'▶Rec(',  a:'t',  st:'sci', act:'NOOP' },
    { id:'_g3',   p:'',       st:'blank', act:'__NOOP', w:0.6 },
    { id:'DOWN',  p:'▼',     s:'TABLE',  st:'nav', act:'HIST_DOWN', sAct:'NOOP', w:1.0 },
  ],
  // Row 4: x⁻¹ · sin · cos · tan · logₐ · ln
  [
    { id:'INV',  p:'x⁻¹',  s:'x!',      a:'w',  st:'sci', act:'INV',   sAct:'FACT' },
    { id:'SIN',  p:'sin',  s:'sin⁻¹',   a:'r',  st:'sci', act:'SIN',   sAct:'ASIN' },
    { id:'COS',  p:'cos',  s:'cos⁻¹',   a:'θ',  st:'sci', act:'COS',   sAct:'ACOS' },
    { id:'TAN',  p:'tan',  s:'tan⁻¹',   a:'i',  st:'sci', act:'TAN',   sAct:'ATAN' },
    { id:'LOG',  p:'log',  s:'10ˣ',     a:'e',  st:'sci', act:'LOG',   sAct:'POW10' },
    { id:'LN',   p:'ln',   s:'eˣ',      a:'n',  st:'sci', act:'LN',    sAct:'EXPX' },
  ],
  // Row 5: (-) · hyp · ( · ) · S⟺D · M+
  [
    { id:'NEG',   p:'(-)',  s:'Ans',    a:'o',   st:'sci', act:'NEG',   sAct:'ANS' },
    { id:'HYP',   p:'hyp',             a:'p',   st:'sci', act:'HYP' },
    { id:'LPAR',  p:'(',   s:'{',      a:'[',   st:'sci', act:'LPAR',  sAct:'LBRACE',  aAct:'LBRACKET' },
    { id:'RPAR',  p:')',   s:'}',      a:']',   st:'sci', act:'RPAR',  sAct:'RBRACE',  aAct:'RBRACKET' },
    { id:'STOD',  p:'S⟺D', s:'▶DEG',  a:'q',   st:'sci', act:'STOD',  sAct:'TODEG' },
    { id:'MPLUS', p:'M+',  s:'M-',    a:'STO', st:'sci', act:'MPLUS', sAct:'MMINUS', aAct:'STO' },
  ],
  // Row 6: x² · xⁿ · log(a,b) · eˣ( · nCr · RCL
  [
    { id:'SQ',    p:'x²',    s:'√(',    a:'s',  st:'sci', act:'SQ',    sAct:'SQRT' },
    { id:'POW',   p:'xⁿ',    s:'ˣ√(',  a:'h',  st:'sci', act:'POW',   sAct:'NROOT' },
    { id:'LOGB',  p:'log(a)', s:'10^(', a:'j',  st:'sci', act:'LOGB',  sAct:'POW10P' },
    { id:'EX',    p:'eˣ(',   s:'e',     a:'l',  st:'sci', act:'EXPX2', sAct:'ECONST' },
    { id:'NCR',   p:'nCr',   s:'nPr',   a:'c',  st:'sci', act:'NCR',   sAct:'NPR' },
    { id:'RCL',   p:'RCL',   s:'STO',   a:'g',  st:'sci', act:'RCL',   sAct:'STO2' },
  ],
  // Row 7: 7 · 8 · 9 · DEL · AC
  [
    { id:'7',   p:'7',   a:'A',   st:'num', act:'7',   aAct:'MEMA', w:1 },
    { id:'8',   p:'8',   a:'B',   st:'num', act:'8',   aAct:'MEMB', w:1 },
    { id:'9',   p:'9',   a:'C',   st:'num', act:'9',   aAct:'MEMC', w:1 },
    { id:'DEL', p:'DEL', s:'INS', st:'del', act:'DEL', sAct:'INS',  w:1.35 },
    { id:'AC',  p:'AC',  s:'OFF', st:'ac',  act:'AC',  sAct:'OFF',  w:1.35 },
  ],
  // Row 8: 4 · 5 · 6 · × · ÷
  [
    { id:'4',   p:'4',  a:'D',  st:'num', act:'4',  aAct:'MEMD' },
    { id:'5',   p:'5',  a:'E',  st:'num', act:'5',  aAct:'MEME' },
    { id:'6',   p:'6',  a:'F',  st:'num', act:'6',  aAct:'MEMF' },
    { id:'MUL', p:'×',          st:'op',  act:'×' },
    { id:'DIV', p:'÷',          st:'op',  act:'÷' },
  ],
  // Row 9: 1 · 2 · 3 · + · −
  [
    { id:'1',   p:'1',  a:'G',  st:'num', act:'1',  aAct:'MEMG' },
    { id:'2',   p:'2',  a:'H',  st:'num', act:'2',  aAct:'MEMH' },
    { id:'3',   p:'3',  a:'I',  st:'num', act:'3',  aAct:'MEMI' },
    { id:'ADD', p:'+',          st:'op',  act:'+' },
    { id:'SUB', p:'−',          st:'op',  act:'−' },
  ],
  // Row 10: 0 · . · ×10ˣ · Ans · =
  [
    { id:'0',   p:'0',     a:'J',  st:'num', act:'0',         aAct:'MEMJ',    w:1 },
    { id:'DOT', p:'.',     a:'K',  st:'num', act:'.',         aAct:'MEMK',    w:1 },
    { id:'EE',  p:'×10ˣ', s:'π',  a:'%',    st:'num', act:'EE',  sAct:'PI',  aAct:'PERCENT', w:1 },
    { id:'ANS', p:'Ans',  s:'%',  a:'Ans',  st:'num', act:'ANS', sAct:'PERCENT',              w:1.35 },
    { id:'EQ',  p:'=',            st:'eq',  act:'=',                                          w:1.35 },
  ],
];

// ─────────────────────────────── Colours ─────────────────────────────────────

// Exact colours from high-res photos of the physical fx-991EX CW
const C = {
  body:     '#1a1a1a',   // near-black body
  bodyRim:  '#2a2a2a',
  shift:    '#e8960a',   // amber gold
  shiftDk:  '#a06400',
  alpha:    '#d0103a',   // vivid red
  alphaDk:  '#880020',
  nav:      '#5a5a6a',   // mid grey
  navDk:    '#2a2a3a',
  sci:      '#7a7a7a',   // medium grey (scientific keys)
  sciDk:    '#3a3a3a',
  num:      '#3c3c3c',   // dark charcoal (number keys)
  numDk:    '#111',
  op:       '#3c3c3c',
  opDk:     '#111',
  del:      '#3c3c3c',   // dark with red label
  delDk:    '#111',
  ac:       '#c01818',   // red
  acDk:     '#700808',
  eq:       '#1840b0',   // royal blue
  eqDk:     '#0a2060',
  lcd:      '#b0c890',   // green-grey LCD
  lcdText:  '#1a2a0a',
};

const BTN: Record<BtnStyle, { bg: string; fg: string; shadow: string }> = {
  shift: { bg: C.shift,  fg: '#fff',     shadow: `0 3px 0 ${C.shiftDk}` },
  alpha: { bg: C.alpha,  fg: '#fff',     shadow: `0 3px 0 ${C.alphaDk}` },
  nav:   { bg: C.nav,    fg: '#e8e8f0',  shadow: `0 3px 0 ${C.navDk}`   },
  sci:   { bg: C.sci,    fg: '#f0f0f0',  shadow: `0 3px 0 ${C.sciDk}`   },
  num:   { bg: C.num,    fg: '#f0f0f0',  shadow: `0 3px 0 ${C.numDk}`   },
  op:    { bg: C.op,     fg: '#f0f0f0',  shadow: `0 3px 0 ${C.opDk}`    },
  del:   { bg: C.del,    fg: '#ff6060',  shadow: `0 3px 0 ${C.delDk}`   },
  ac:    { bg: C.ac,     fg: '#fff',     shadow: `0 3px 0 ${C.acDk}`    },
  eq:    { bg: C.eq,     fg: '#fff',     shadow: `0 3px 0 ${C.eqDk}`    },
  blank: { bg: 'transparent', fg: 'transparent', shadow: 'none' },
};

// ─────────────────────────────── Initial state ───────────────────────────────

const INIT_CS: CS = {
  expr: '', result: '', shift: false, alpha: false, hyp: false,
  angle: 'DEG', mem: { A:0,B:0,C:0,D:0,E:0,F:0,M:0,X:0,Y:0 },
  ans: 0, err: null, fresh: false,
};

// ─────────────────────────────── Component ───────────────────────────────────

interface Props { onClose: () => void }

export function Fx991EX({ onClose }: Props) {
  const [cs, setCS] = useState<CS>({ ...INIT_CS });
  const [pos, setPos] = useState({ x: 80, y: 40 });
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

  // ── Key handler ──────────────────────────────────────────────────────────────

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
        case 'AC':      return { ...INIT_CS, angle: prev.angle, mem: prev.mem };
        case 'OFF':     return { ...INIT_CS, angle: prev.angle, mem: prev.mem };
        case 'HYP':     return { ...base, hyp: !prev.hyp };
        case '__NOOP':
        case 'NOOP':    return base;

        case 'DEL': {
          if (base.fresh) return { ...base, expr: '', result: '', fresh: false };
          return { ...base, expr: base.expr.slice(0, -1) };
        }

        case 'TODEG': {
          const cycle: AngleUnit[] = ['DEG','RAD','GRAD'];
          const i = cycle.indexOf(prev.angle);
          return { ...base, angle: cycle[(i + 1) % 3] };
        }

        case '0':case '1':case '2':case '3':case '4':
        case '5':case '6':case '7':case '8':case '9':
        case '.': return app(act);

        case '+': case '−': case '×': case '÷': return app(act);

        case 'PI':      return app('π');
        case 'ECONST':  return app('ℯ');
        case 'ANS':     return app('Ans');
        case 'PERCENT': return app('%');

        case 'LPAR':      return app('(');
        case 'RPAR':      return app(')');
        case 'LBRACE':    return app('{');
        case 'RBRACE':    return app('}');
        case 'LBRACKET':  return app('[');
        case 'RBRACKET':  return app(']');
        case 'NEG':       return app('-(');

        case 'SIN':  return app(prev.hyp ? 'sinh('   : 'sin(');
        case 'COS':  return app(prev.hyp ? 'cosh('   : 'cos(');
        case 'TAN':  return app(prev.hyp ? 'tanh('   : 'tan(');
        case 'ASIN': return app(prev.hyp ? 'sinh⁻¹(' : 'sin⁻¹(');
        case 'ACOS': return app(prev.hyp ? 'cosh⁻¹(' : 'cos⁻¹(');
        case 'ATAN': return app(prev.hyp ? 'tanh⁻¹(' : 'tan⁻¹(');

        case 'LOG':    return app('log(');
        case 'LN':     return app('ln(');
        case 'POW10':
        case 'POW10P': return app('10^(');
        case 'EXPX':
        case 'EXPX2':  return app('eˣ(');
        case 'LOGB':   return app('log(');

        case 'SQ':    return app('^2');
        case 'SQRT':  return app('√(');
        case 'POW':   return app('^(');
        case 'NROOT': return app('^(1/');
        case 'INV':   return app('^(-1)');
        case 'FACT':  return app('!');
        case 'EE':    return app('×10^(');

        case 'NCR': return app('nCr(');
        case 'NPR': return app('nPr(');

        case 'MPLUS':  return { ...base, mem: { ...prev.mem, M: prev.mem.M + prev.ans }, result: `M=${fmtNum(prev.mem.M + prev.ans)}` };
        case 'MMINUS': return { ...base, mem: { ...prev.mem, M: prev.mem.M - prev.ans }, result: `M=${fmtNum(prev.mem.M - prev.ans)}` };
        case 'STO':
        case 'STO2':   return { ...base, result: 'Press A–F to store' };
        case 'RCL':    return { ...base, result: 'Press A–F to recall' };

        case 'MEMA': return prev.alpha ? { ...base, mem: {...prev.mem, A: prev.ans}, result:`A=${fmtNum(prev.ans)}` } : app('A');
        case 'MEMB': return prev.alpha ? { ...base, mem: {...prev.mem, B: prev.ans}, result:`B=${fmtNum(prev.ans)}` } : app('B');
        case 'MEMC': return prev.alpha ? { ...base, mem: {...prev.mem, C: prev.ans}, result:`C=${fmtNum(prev.ans)}` } : app('C');
        case 'MEMD': return prev.alpha ? { ...base, mem: {...prev.mem, D: prev.ans}, result:`D=${fmtNum(prev.ans)}` } : app('D');
        case 'MEME': return prev.alpha ? { ...base, mem: {...prev.mem, E: prev.ans}, result:`E=${fmtNum(prev.ans)}` } : app('E');
        case 'MEMF': return prev.alpha ? { ...base, mem: {...prev.mem, F: prev.ans}, result:`F=${fmtNum(prev.ans)}` } : app('F');

        case 'STOD': {
          const r = prev.ans;
          if (!isNaN(r)) {
            if (prev.result.includes('/')) return { ...base, result: fmtNum(r) };
            for (const d of [2,3,4,5,6,7,8,9,10,12,16,100]) {
              const n = Math.round(r * d);
              if (Math.abs(n / d - r) < 1e-10) return { ...base, result: `${n}/${d}` };
            }
          }
          return base;
        }

        case '=': {
          const expr = base.expr || '0';
          try {
            const val = calcEval(expr, prev.angle, prev.ans, prev.mem);
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

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{
      position: 'fixed',
      left: pos.x,
      top: pos.y,
      zIndex: 9999,
      width: 256,
      background: C.body,
      borderRadius: '16px 16px 12px 12px',
      boxShadow: '0 24px 64px rgba(0,0,0,0.9), 0 2px 0 #444 inset',
      fontFamily: '"Arial Narrow", Arial, sans-serif',
      userSelect: 'none',
      border: `1px solid #444`,
    }}>

      {/* ── Solar strip ─────────────────────────────────────────────────────── */}
      <div style={{
        height: 14,
        margin: '0 20px',
        background: 'linear-gradient(180deg, #555 0%, #333 40%, #444 100%)',
        borderRadius: '0 0 4px 4px',
        border: '1px solid #222',
        borderTop: 'none',
        display: 'flex',
        overflow: 'hidden',
        gap: 2,
        padding: '3px 4px',
      }}>
        {Array.from({length: 18}).map((_,i) => (
          <div key={i} style={{ flex:1, background:'#222', borderRadius:1 }} />
        ))}
      </div>

      {/* ── Brand / drag handle ──────────────────────────────────────────────── */}
      <div
        onMouseDown={onHeaderDown}
        style={{
          padding: '4px 12px 2px',
          cursor: 'grab',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{
            color: '#fff',
            fontSize: '8.5px',
            fontWeight: 'bold',
            letterSpacing: '0.22em',
            lineHeight: 1.2,
          }}>CASIO</div>
          <div style={{
            color: '#fff',
            fontSize: '18px',
            fontWeight: 'bold',
            letterSpacing: '0.02em',
            lineHeight: 1.1,
          }}>fx-991EX</div>
          <div style={{
            color: '#e8204a',
            fontSize: '9px',
            fontStyle: 'italic',
            letterSpacing: '0.06em',
            lineHeight: 1.2,
          }}>ClassWiz</div>
        </div>
        {/* status badges + close */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2, paddingTop:2 }}>
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={onClose}
            style={{
              background:'transparent', border:'none',
              color:'rgba(200,200,200,0.45)', cursor:'pointer',
              fontSize:16, lineHeight:1, padding:0, marginBottom:2,
            }}
          >×</button>
          <div style={{ display:'flex', gap:3 }}>
            {s.shift && <span style={{ fontSize:7, background:'#e8960a', color:'#fff', padding:'1px 3px', borderRadius:2, fontWeight:'bold' }}>S</span>}
            {s.alpha && <span style={{ fontSize:7, background:'#d0103a', color:'#fff', padding:'1px 3px', borderRadius:2, fontWeight:'bold' }}>A</span>}
            {s.hyp   && <span style={{ fontSize:7, background:'#446', color:'#fff', padding:'1px 3px', borderRadius:2, fontWeight:'bold' }}>H</span>}
          </div>
        </div>
      </div>

      {/* ── Display ──────────────────────────────────────────────────────────── */}
      <div style={{
        margin: '4px 10px 6px',
        background: C.lcd,
        borderRadius: 4,
        border: '2px solid #7a8a60',
        boxShadow: 'inset 0 3px 8px rgba(0,0,0,0.30)',
        padding: '5px 8px 6px',
        minHeight: 68,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Mode indicators */}
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:1 }}>
          <span style={{ fontSize:8, color:C.lcdText, fontWeight:'bold' }}>{s.angle}</span>
          <span style={{ fontSize:8, color:C.lcdText }}>COMP</span>
        </div>
        {/* Expression */}
        <div style={{
          fontSize: 11,
          color: C.lcdText,
          textAlign: 'right',
          wordBreak: 'break-all',
          minHeight: 15,
          lineHeight: 1.3,
          flex: 1,
        }}>
          {s.expr || (s.fresh ? '' : '')}
        </div>
        {/* Result */}
        <div style={{
          fontSize: 22,
          fontWeight: 'bold',
          color: s.err ? '#880000' : C.lcdText,
          textAlign: 'right',
          minHeight: 26,
          lineHeight: 1.1,
          marginTop: 1,
        }}>
          {s.result || (s.expr === '' && !s.fresh ? '0' : '')}
        </div>
      </div>

      {/* ── Keypad ───────────────────────────────────────────────────────────── */}
      <div style={{ padding: '0 7px 10px' }}>
        {KEYROWS.map((row, ri) => {
          // row heights differ between sci rows and num rows
          const isNumRow = ri >= 6;
          const rowGap = isNumRow ? 4 : 3;
          return (
            <div key={ri} style={{
              display: 'flex',
              gap: rowGap,
              marginBottom: isNumRow ? 4 : 2,
              alignItems: 'flex-end',
            }}>
              {row.map(k => {
                if (k.act === '__NOOP') {
                  return <div key={k.id} style={{ flex: k.w ?? 1 }} />;
                }

                const st = BTN[k.st];
                const isActive = (k.act === 'SHIFT' && s.shift)
                               || (k.act === 'ALPHA' && s.alpha)
                               || (k.act === 'HYP'   && s.hyp);

                const btnH = isNumRow ? 30
                           : (k.st === 'shift' || k.st === 'alpha' || k.st === 'ac') ? 22
                           : k.st === 'nav' ? 20
                           : 18;

                const fontSize = isNumRow ? 15
                               : (k.st === 'shift' || k.st === 'alpha') ? 7.5
                               : k.st === 'ac' ? 10
                               : k.st === 'del' ? 9
                               : 8.5;

                return (
                  <div key={k.id} style={{ flex: k.w ?? 1, display:'flex', flexDirection:'column', alignItems:'center', minWidth:0 }}>
                    {/* Shift label (yellow, above) */}
                    <div style={{ height: 11, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {k.s && (
                        <span style={{ fontSize:6.5, color:'#e8960a', fontWeight:'bold', lineHeight:1, whiteSpace:'nowrap' }}>
                          {k.s}
                        </span>
                      )}
                    </div>
                    {/* Alpha label (red, above) */}
                    <div style={{ height: 9, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {k.a && (
                        <span style={{ fontSize:6, color:'#e84060', fontWeight:'bold', lineHeight:1, whiteSpace:'nowrap' }}>
                          {k.a}
                        </span>
                      )}
                    </div>
                    {/* Button */}
                    <button
                      onMouseDown={e => { e.preventDefault(); press(k); }}
                      style={{
                        width: '100%',
                        height: btnH,
                        background: isActive ? '#fff' : st.bg,
                        color: isActive
                          ? (k.st === 'shift' ? '#e8960a' : '#d0103a')
                          : st.fg,
                        border: 'none',
                        borderRadius: isNumRow ? 5 : k.st === 'nav' ? '50%' : 3,
                        fontSize,
                        fontWeight: isNumRow || k.st === 'eq' ? 'bold' : '600',
                        cursor: 'pointer',
                        boxShadow: isActive ? 'none' : st.shadow,
                        padding: '0 1px',
                        lineHeight: 1,
                        letterSpacing: '-0.01em',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.25)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = ''; }}
                    >
                      {k.p}
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Made with Bob
