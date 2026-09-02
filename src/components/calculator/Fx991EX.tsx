'use client';

/**
 * Casio fx-991EX ClassWiz — pixel-accurate SVG replica
 * Behaviour matches the real device: SETUP, HYP, STO/RCL, S⟺D,
 * implicit multiply, nCr/nPr infix, cursor navigation, Pol/Rec, Ran#, % etc.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';

// ─────────────────────────────── Types ───────────────────────────────────────

type AngleUnit = 'DEG' | 'RAD' | 'GRAD';
type DispFmt   = 'NORM' | 'FIX' | 'SCI' | 'ENG';

/** Calculator state — everything the machine "remembers" */
interface CS {
  expr:    string;        // what the user has typed (shown top line)
  cursor:  number;        // insertion point (index into expr)
  result:  string;        // bottom line (empty while typing)
  shift:   boolean;
  alpha:   boolean;
  hyp:     boolean;
  angle:   AngleUnit;
  dispFmt: DispFmt;
  fixN:    number;        // digits for FIX/SCI/ENG
  mem:     Record<string, number>;
  ans:     number;
  err:     string | null;
  fresh:   boolean;       // true right after = ; next digit starts fresh
  // MENU / SETUP overlay
  menu:    'none' | 'main' | 'setup' | 'angle' | 'stoWait' | 'rclWait';
}

// ─────────────────────────────── Math helpers ────────────────────────────────

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
  if (!Number.isInteger(n) || n < 0 || n > 170) return n > 170 ? Infinity : NaN;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}
function _nCr(n: number, r: number) {
  if (!Number.isInteger(n) || !Number.isInteger(r) || r < 0 || r > n || n < 0) return NaN;
  return factorial(n) / (factorial(r) * factorial(n - r));
}
function _nPr(n: number, r: number) {
  if (!Number.isInteger(n) || !Number.isInteger(r) || r < 0 || r > n || n < 0) return NaN;
  return factorial(n) / factorial(n - r);
}

// ── Number formatting ────────────────────────────────────────────────────────

function fmtNum(v: number, fmt: DispFmt = 'NORM', fixN = 9): string {
  if (isNaN(v))      return 'Math ERROR';
  if (!isFinite(v))  return v > 0 ? '∞' : '-∞';

  const abs = Math.abs(v);

  if (fmt === 'FIX') return v.toFixed(fixN);
  if (fmt === 'SCI') {
    const s = v.toExponential(fixN);
    const [m, e] = s.split('e');
    return `${m}×10^${e}`;
  }
  if (fmt === 'ENG') {
    if (v === 0) return '0';
    const exp3 = Math.floor(Math.log10(abs) / 3) * 3;
    const mant = v / Math.pow(10, exp3);
    return `${parseFloat(mant.toPrecision(fixN + 1))}×10^${exp3}`;
  }
  // NORM
  if (abs !== 0 && (abs >= 1e10 || abs < 1e-9)) {
    const s = v.toExponential(6).replace(/\.?0+(e)/, '$1');
    const [m, e] = s.split('e');
    return `${m}×10^${e}`;
  }
  return parseFloat(v.toPrecision(10)).toString();
}

// Try to express v as a simple fraction p/q — returns null if not found
function toFrac(v: number): string | null {
  if (!isFinite(v) || isNaN(v)) return null;
  const sign = v < 0 ? '-' : '';
  const abs  = Math.abs(v);
  for (const q of [2,3,4,5,6,7,8,9,10,12,15,16,20,25,32,50,100]) {
    const p = Math.round(abs * q);
    if (p > 0 && Math.abs(p / q - abs) < 1e-10) {
      // simplify
      const g = gcd(p, q);
      return `${sign}${p/g}/${q/g}`;
    }
  }
  return null;
}
function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b); }

// ─────────────────────────────── Tokeniser ───────────────────────────────────

type Tok =
  | { t: 'num';   v: number }
  | { t: 'op';    v: string }
  | { t: 'lp' }
  | { t: 'rp' }
  | { t: 'comma' }
  | { t: 'fn';    v: string }
  | { t: 'end' };

// All multi-char function names that consume a '(' — longest first
const FN_NAMES = [
  'sinh⁻¹(','cosh⁻¹(','tanh⁻¹(',
  'sin⁻¹(', 'cos⁻¹(', 'tan⁻¹(',
  'sinh(',  'cosh(',  'tanh(',
  'sin(',   'cos(',   'tan(',
  'log(',   'ln(',    'eˣ(',   '√(', '∛(',
  'abs(',   'Pol(',   'Rec(',
  'nCr(',   'nPr(',
  '10^(',
];

function tokenise(src: string, ans: number, mem: Record<string, number>): Tok[] {
  const out: Tok[] = [];
  let i = 0;

  const last = (): Tok | undefined => out[out.length - 1];

  // helper: implicit ×  between two adjacent terms
  const implicitMul = () => {
    const l = last();
    if (!l) return;
    if (l.t === 'num' || l.t === 'rp') out.push({ t: 'op', v: '*' });
  };

  while (i < src.length) {
    if (/\s/.test(src[i])) { i++; continue; }

    // ── digits / decimal ────────────────────────────────────────────────
    if (/[\d.]/.test(src[i])) {
      implicitMul();
      let n = '';
      while (i < src.length && /[\d.]/.test(src[i])) n += src[i++];
      out.push({ t: 'num', v: parseFloat(n) });
      continue;
    }

    // ── constants ───────────────────────────────────────────────────────
    if (src.startsWith('Ans', i))  { implicitMul(); out.push({ t:'num', v:ans });      i += 3; continue; }
    if (src[i] === 'π')             { implicitMul(); out.push({ t:'num', v:Math.PI }); i++;    continue; }
    if (src[i] === 'ℯ')             { implicitMul(); out.push({ t:'num', v:Math.E });  i++;    continue; }

    // memory variables A–F  (only if NOT followed by an alpha that continues a fn name)
    if (/[A-F]/.test(src[i]) && !/[a-zA-Z⁻(]/.test(src[i+1] ?? '')) {
      implicitMul();
      out.push({ t:'num', v: mem[src[i]] ?? 0 });
      i++; continue;
    }

    // ── ×10^  ───────────────────────────────────────────────────────────
    if (src.startsWith('×10^(', i)) { out.push({ t:'op', v:'E' }); i += 5; continue; }
    if (src.startsWith('×10^',  i)) { out.push({ t:'op', v:'E' }); i += 4; continue; }

    // ── named functions  ────────────────────────────────────────────────
    let matched = false;
    for (const fn of FN_NAMES) {
      if (src.startsWith(fn, i)) {
        implicitMul();
        out.push({ t:'fn', v: fn.slice(0,-1) });
        out.push({ t:'lp' });
        i += fn.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // ── 10^( without × prefix ───────────────────────────────────────────
    if (src.startsWith('10^(', i)) {
      implicitMul();
      out.push({ t:'fn', v:'10^' });
      out.push({ t:'lp' });
      i += 4; continue;
    }

    // ── parentheses / comma ─────────────────────────────────────────────
    if (src[i] === '(') { implicitMul(); out.push({ t:'lp' });    i++; continue; }
    if (src[i] === ')') {                out.push({ t:'rp' });    i++; continue; }
    if (src[i] === ',') {                out.push({ t:'comma' }); i++; continue; }

    // ── infix operators ─────────────────────────────────────────────────
    const OP: Record<string,string> = {
      '+':'+', '−':'-', '×':'*', '÷':'/', '^':'^', '%':'%', '!':'!',
    };
    if (OP[src[i]]) { out.push({ t:'op', v:OP[src[i]] }); i++; continue; }

    i++; // skip unknown char
  }
  out.push({ t:'end' });
  return out;
}

// ─────────────────────────────── Parser / Evaluator ──────────────────────────

function calcEval(
  expr: string,
  angle: AngleUnit,
  ans:   number,
  mem:   Record<string, number>,
): number {
  // Auto-close open parens
  let s = expr;
  const openP  = (s.match(/\(/g) || []).length;
  const closeP = (s.match(/\)/g) || []).length;
  if (openP > closeP) s += ')'.repeat(openP - closeP);

  const toks = tokenise(s, ans, mem);
  let pos = 0;
  const peek = (): Tok => toks[pos];
  const eat  = (): Tok => toks[pos++];

  const PREC: Record<string,number> = {
    '+':1, '-':1, '*':2, '/':2, 'E':3, '^':4, 'nCr':2, 'nPr':2,
  };

  function parseExpr(minP = 0): number {
    let left = parseUnary();
    while (true) {
      const t = peek();
      if (t.t !== 'op') break;
      const p = PREC[t.v] ?? -1;
      if (p < minP) break;
      eat();
      const right = t.v === '^' ? parseExpr(p) : parseExpr(p + 1);
      switch (t.v) {
        case '+':   left = left + right; break;
        case '-':   left = left - right; break;
        case '*':   left = left * right; break;
        case '/':   left = left / right; break;
        case 'E':   left = left * Math.pow(10, right); break;
        case '^':   left = Math.pow(left, right); break;
        case 'nCr': left = _nCr(left, right); break;
        case 'nPr': left = _nPr(left, right); break;
      }
    }
    // postfix ! and %
    const p1 = peek(); if (p1.t === 'op' && p1.v === '!') { eat(); left = factorial(left); }
    const p2 = peek(); if (p2.t === 'op' && p2.v === '%') { eat(); left = left / 100; }
    return left;
  }

  function parseUnary(): number {
    const pu = peek();
    if (pu.t === 'op' && pu.v === '-') { eat(); return -parsePrimary(); }
    return parsePrimary();
  }

  function parsePrimary(): number {
    const t = peek();

    if (t.t === 'num') { eat(); return t.v; }

    if (t.t === 'lp') {
      eat();
      const v = parseExpr();
      if (peek().t === 'rp') eat();
      return v;
    }

    if (t.t === 'fn') {
      eat();
      if (peek().t === 'lp') eat();
      const a = parseExpr();
      let b: number | undefined;
      if (peek().t === 'comma') { eat(); b = parseExpr(); }
      if (peek().t === 'rp') eat();

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
        case 'sinh⁻¹': return Math.asinh(a);
        case 'cosh⁻¹': return Math.acosh(a);
        case 'tanh⁻¹': return Math.atanh(a);
        case 'log':    return b !== undefined ? Math.log(b) / Math.log(a) : Math.log10(a);
        case 'ln':     return Math.log(a);
        case 'eˣ':     return Math.exp(a);
        case '√':      return Math.sqrt(a);
        case '∛':      return Math.cbrt(a);
        case 'abs':    return Math.abs(a);
        case '10^':    return Math.pow(10, a);
        case 'nCr':    return b !== undefined ? _nCr(a, b) : NaN;
        case 'nPr':    return b !== undefined ? _nPr(a, b) : NaN;
        case 'Pol': {
          // Pol(x,y) → r; stores θ in Y mem; returns r
          if (b === undefined) return NaN;
          return Math.sqrt(a*a + b*b);
        }
        case 'Rec': {
          // Rec(r,θ) → x; stores y in Y mem; returns x
          if (b === undefined) return NaN;
          return a * Math.cos(toRad(b, angle));
        }
        default: return NaN;
      }
    }

    return 0;
  }

  return parseExpr();
}

// ─────────────────────────────── Initial state ───────────────────────────────

const INIT: CS = {
  expr: '', cursor: 0,
  result: '', shift: false, alpha: false, hyp: false,
  angle: 'DEG', dispFmt: 'NORM', fixN: 9,
  mem: { A:0, B:0, C:0, D:0, E:0, F:0, M:0, X:0, Y:0 },
  ans: 0, err: null, fresh: false,
  menu: 'none',
};

// ─────────────────────────────── Layout constants ────────────────────────────

const VW = 300;
const VH = 580;

const SCR_X = 14;
const SCR_Y = 60;
const SCR_W = VW - 28;
const SCR_H = 96;

const NAV_Y = 176;

const FN_GAP = 5;
const FN_H   = 22;
const FN_Y0  = 222;
const FNR = [
  FN_Y0,
  FN_Y0 +   (FN_H + FN_GAP),
  FN_Y0 + 2*(FN_H + FN_GAP),
  FN_Y0 + 3*(FN_H + FN_GAP),
];

const NUM_GAP = 6;
const NUM_H   = 34;
const NUM_Y0  = 320;
const NUMR = [
  NUM_Y0,
  NUM_Y0 +   (NUM_H + NUM_GAP),
  NUM_Y0 + 2*(NUM_H + NUM_GAP),
  NUM_Y0 + 3*(NUM_H + NUM_GAP),
];

// Key colours
const DARK   = '#252525';
const DSTK   = '#111';
const WHITE  = '#e8e8e0';
const WSTK   = '#b8b8b0';
const BLUE   = '#1640c8';
const BLSTK  = '#0a2070';
const ORANGE = '#e87810';
const ORSTK  = '#a04800';

// ─────────────────────────────── Key interface ───────────────────────────────

interface K {
  id: string;
  label: string;
  x: number; y: number; w: number; h: number;
  rx?: number;
  fill: string; stroke: string; textFill: string;
  fontSize?: number;
  // primary action, SHIFT action, ALPHA action
  act: string; sAct?: string; aAct?: string;
  shiftLabel?: string; alphaLabel?: string;
}

// ─────────────────────────────── Key definitions ─────────────────────────────

const FN0_X  = 14;
const FN0_W  = VW - 28;
const FN0_KW = (FN0_W - 3*5) / 4;   // 4 keys in row 0
const FN6_KW = (FN0_W - 5*5) / 6;   // 6 keys in rows 1–3
const NUM_KW = (FN0_W - 4*NUM_GAP) / 5;

// Nav row
const NAV_KEYS: K[] = [
  { id:'SHIFT', label:'SHIFT', x:14,  y:NAV_Y,    w:44, h:26, rx:13,
    fill:'#e8960a', stroke:'#a06000', textFill:'#fff', fontSize:8,   act:'SHIFT' },
  { id:'ALPHA', label:'ALPHA', x:62,  y:NAV_Y,    w:44, h:26, rx:13,
    fill:'#cc1030', stroke:'#880020', textFill:'#fff', fontSize:8,   act:'ALPHA' },
  // D-pad transparent hit zones
  { id:'UP',    label:'', x:122, y:NAV_Y-2,  w:28, h:16, rx:3, fill:'transparent', stroke:'none', textFill:'transparent', act:'CUR_LEFT'  },
  { id:'LEFT',  label:'', x:108, y:NAV_Y+14, w:16, h:18, rx:3, fill:'transparent', stroke:'none', textFill:'transparent', act:'CUR_LEFT'  },
  { id:'CTR',   label:'', x:126, y:NAV_Y+14, w:24, h:18, rx:12,fill:'transparent', stroke:'none', textFill:'transparent', act:'NOOP'      },
  { id:'RIGHT', label:'', x:152, y:NAV_Y+14, w:16, h:18, rx:3, fill:'transparent', stroke:'none', textFill:'transparent', act:'CUR_RIGHT' },
  { id:'DOWN',  label:'', x:122, y:NAV_Y+34, w:28, h:16, rx:3, fill:'transparent', stroke:'none', textFill:'transparent', act:'CUR_RIGHT' },
  { id:'MENU', label:'MENU', x:198, y:NAV_Y, w:38, h:26, rx:5,
    fill:'#333', stroke:'#1a1a1a', textFill:'#bbb', fontSize:7.5, act:'MENU', shiftLabel:'SETUP', sAct:'SETUP' },
  { id:'ON',   label:'ON',   x:244, y:NAV_Y, w:42, h:26, rx:5,
    fill:'#333', stroke:'#1a1a1a', textFill:'#bbb', fontSize:7.5, act:'AC',   shiftLabel:'OFF',   sAct:'OFF'   },
];

// FN row 0 — 4 keys
const FN0: K[] = [
  { id:'OPTN', label:'OPTN', x:FN0_X+0*(FN0_KW+5), y:FNR[0], w:FN0_KW, h:FN_H, rx:4,
    fill:DARK, stroke:DSTK, textFill:'#ddd', fontSize:8.5, act:'NOOP', shiftLabel:'QR' },
  { id:'CALC', label:'CALC', x:FN0_X+1*(FN0_KW+5), y:FNR[0], w:FN0_KW, h:FN_H, rx:4,
    fill:DARK, stroke:DSTK, textFill:'#ddd', fontSize:8.5, act:'NOOP', shiftLabel:'SOLVE' },
  { id:'INTG', label:'∫dx',  x:FN0_X+2*(FN0_KW+5), y:FNR[0], w:FN0_KW, h:FN_H, rx:4,
    fill:DARK, stroke:DSTK, textFill:'#ddd', fontSize:9,   act:'NOOP', shiftLabel:'d/dx' },
  { id:'XVAR', label:'x',    x:FN0_X+3*(FN0_KW+5), y:FNR[0], w:FN0_KW, h:FN_H, rx:4,
    fill:DARK, stroke:DSTK, textFill:'#ddd', fontSize:11,  act:'NOOP', shiftLabel:'Σ'    },
];

// FN rows 1–3 — 6 keys each
type FnDef = {
  id:string; label:string; act:string;
  sAct?:string; aAct?:string;
  shiftLabel?:string; alphaLabel?:string;
  fontSize?:number;
};

function fn6row(defs: FnDef[], yIdx: number): K[] {
  return defs.map((d, i) => ({
    id: d.id, label: d.label,
    x: FN0_X + i*(FN6_KW+5), y: FNR[yIdx], w: FN6_KW, h: FN_H, rx: 4,
    fill: DARK, stroke: DSTK, textFill: '#ddd',
    fontSize: d.fontSize ?? 9,
    act: d.act, sAct: d.sAct, aAct: d.aAct,
    shiftLabel: d.shiftLabel, alphaLabel: d.alphaLabel,
  }));
}

const FN1 = fn6row([
  { id:'FRAC',  label:'a b/c', act:'FRAC', shiftLabel:'d/c',   fontSize:7  },
  { id:'SQRT',  label:'√',     act:'SQRT', sAct:'CBRT',  shiftLabel:'∛'     },
  { id:'SQ',    label:'x²',    act:'SQ',   sAct:'CUBE',  shiftLabel:'x³'    },
  { id:'POW',   label:'xᵐ',    act:'POW',                fontSize:9          },
  { id:'LOGB',  label:'log',   act:'LOG',  sAct:'POW10', shiftLabel:'10ˣ'   },
  { id:'LN',    label:'ln',    act:'LN',   sAct:'EXPX',  shiftLabel:'eˣ'    },
], 1);

const FN2 = fn6row([
  { id:'NEG',   label:'(-)',   act:'NEG',  sAct:'NOOP', shiftLabel:'',   alphaLabel:'A' },
  { id:'DMS',   label:"°'\"", act:'NOOP',              alphaLabel:'B',  fontSize:8      },
  { id:'INV',   label:'x⁻¹',  act:'INV',  sAct:'FACT', shiftLabel:'x!', alphaLabel:'C' },
  { id:'SIN',   label:'sin',   act:'SIN',  sAct:'ASIN', shiftLabel:'sin⁻¹', alphaLabel:'D' },
  { id:'COS',   label:'cos',   act:'COS',  sAct:'ACOS', shiftLabel:'cos⁻¹', alphaLabel:'E' },
  { id:'TAN',   label:'tan',   act:'TAN',  sAct:'ATAN', shiftLabel:'tan⁻¹', alphaLabel:'F' },
], 2);

const FN3 = fn6row([
  { id:'STO',   label:'STO',  act:'STO',   sAct:'RCL',   shiftLabel:'RCL'               },
  { id:'ENG',   label:'ENG',  act:'ENG',   sAct:'ENGB',  shiftLabel:'←ENG'              },
  { id:'LPAR',  label:'(',    act:'LPAR',  sAct:'ABS',   shiftLabel:'Abs', fontSize:11   },
  { id:'RPAR',  label:')',    act:'RPAR',                                  fontSize:11   },
  { id:'STOD',  label:'S⟺D', act:'STOD',  sAct:'TODEG', shiftLabel:'▶DEG',fontSize:7   },
  { id:'MPLUS', label:'M+',   act:'MPLUS', sAct:'MMINUS',shiftLabel:'M−'               },
], 3);

// Helper for number-area keys
function nk(
  id:string, label:string, xi:number, yi:number,
  fill:string, stroke:string, tFill:string,
  fs:number, act:string, extras: Partial<K> = {}
): K {
  return {
    id, label,
    x: FN0_X + xi*(NUM_KW+NUM_GAP),
    y: NUMR[yi],
    w: NUM_KW, h: NUM_H, rx: 5,
    fill, stroke, textFill: tFill, fontSize: fs,
    act, ...extras,
  };
}

const NUM_KEYS: K[] = [
  // Row 0: 7  8  9  DEL  AC
  nk('7',  '7',  0,0, WHITE,WSTK,'#111',18,'7', {shiftLabel:'CONST'}),
  nk('8',  '8',  1,0, WHITE,WSTK,'#111',18,'8', {shiftLabel:'CONV'}),
  nk('9',  '9',  2,0, WHITE,WSTK,'#111',18,'9', {shiftLabel:'CLR'}),
  nk('DEL','DEL',3,0, BLUE,BLSTK,'#fff',11,'DEL',{shiftLabel:'INS', sAct:'INS'}),
  nk('AC', 'AC', 4,0, BLUE,BLSTK,'#fff',11,'AC', {shiftLabel:'OFF', sAct:'OFF'}),
  // Row 1: 4  5  6  ×  ÷
  nk('4',  '4',  0,1, WHITE,WSTK,'#111',18,'4', {shiftLabel:'nPr', sAct:'NPR'}),
  nk('5',  '5',  1,1, WHITE,WSTK,'#111',18,'5'),
  nk('6',  '6',  2,1, WHITE,WSTK,'#111',18,'6'),
  nk('MUL','×',  3,1, WHITE,WSTK,'#111',16,'×', {shiftLabel:'nCr', sAct:'NCR'}),
  nk('DIV','÷',  4,1, WHITE,WSTK,'#111',16,'÷'),
  // Row 2: 1  2  3  +  −
  nk('1',  '1',  0,2, WHITE,WSTK,'#111',18,'1'),
  nk('2',  '2',  1,2, WHITE,WSTK,'#111',18,'2'),
  nk('3',  '3',  2,2, WHITE,WSTK,'#111',18,'3'),
  nk('ADD','+',  3,2, WHITE,WSTK,'#111',16,'+', {shiftLabel:'Pol', sAct:'POL'}),
  nk('SUB','−',  4,2, WHITE,WSTK,'#111',16,'−', {shiftLabel:'Rec', sAct:'REC'}),
  // Row 3: 0  .  ×10ˣ  Ans  =
  nk('0',   '0',   0,3, WHITE,WSTK,'#111',18,'0',  {shiftLabel:'Rnd',  sAct:'RND'}),
  nk('DOT', '.',   1,3, WHITE,WSTK,'#111',20,'.',  {shiftLabel:'Ran#', sAct:'RANNUM'}),
  nk('EE',  '×10ˣ',2,3, WHITE,WSTK,'#111', 8,'EE', {shiftLabel:'π',    sAct:'PI'}),
  nk('ANS', 'Ans', 3,3, WHITE,WSTK,'#111',10,'ANS',{shiftLabel:'%',    sAct:'PERCENT'}),
  nk('EQ',  '=',   4,3, ORANGE,ORSTK,'#fff',20,'='),
];

const ALL_KEYS: K[] = [...NAV_KEYS, ...FN0, ...FN1, ...FN2, ...FN3, ...NUM_KEYS];

// ─────────────────────────────── HYP key ─────────────────────────────────────
// Real device: the HYP key is a separate small key below ALPHA and before the D-pad.
// We implement it as part of the SHIFT-ALPHA row by repurposing the gap.
// Actually on the fx-991EX the HYP key appears in FN row 0 (the OPTN/CALC area).
// For our layout we wire it via a SHIFT+SIN-style modifier, plus expose a virtual HYP button.

// ─────────────────────────────── Component ───────────────────────────────────

interface Props { onClose: () => void }

export function Fx991EX({ onClose }: Props) {
  const [cs, setCS] = useState<CS>({ ...INIT });
  const [pos, setPos] = useState({ x: 60, y: 20 });
  const dragRef = useRef({ on: false, ox: 0, oy: 0 });

  // ── Drag ─────────────────────────────────────────────────────────────────
  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { on: true, ox: e.clientX - pos.x, oy: e.clientY - pos.y };
    document.body.style.userSelect = 'none';
  }, [pos]);

  useEffect(() => {
    const mm = (e: MouseEvent) => {
      if (!dragRef.current.on) return;
      setPos({ x: e.clientX - dragRef.current.ox, y: e.clientY - dragRef.current.oy });
    };
    const mu = () => { dragRef.current.on = false; document.body.style.userSelect = ''; };
    window.addEventListener('mousemove', mm);
    window.addEventListener('mouseup',  mu);
    return () => {
      window.removeEventListener('mousemove', mm);
      window.removeEventListener('mouseup',   mu);
    };
  }, []);

  // ── Key handler ──────────────────────────────────────────────────────────
  const press = useCallback((k: K) => {
    setCS(prev => {
      // ── Menu / overlay intercept ──────────────────────────────────────
      if (prev.menu === 'main') {
        // Main menu: 1=COMP (only mode we support). Any other key dismisses.
        if (k.act === '1') return { ...prev, menu: 'none' };
        if (k.act === 'AC') return { ...prev, menu: 'none' };
        return prev;
      }
      if (prev.menu === 'setup') {
        // SETUP menu: 1=DEG, 2=RAD, 3=GRAD
        if (k.act === '1') return { ...prev, angle: 'DEG',  menu: 'none', shift:false };
        if (k.act === '2') return { ...prev, angle: 'RAD',  menu: 'none', shift:false };
        if (k.act === '3') return { ...prev, angle: 'GRAD', menu: 'none', shift:false };
        if (k.act === 'AC') return { ...prev, menu: 'none' };
        return prev;
      }
      if (prev.menu === 'stoWait') {
        // STO: next alpha key (A–F) stores Ans
        const var_ = k.alphaLabel ?? '';
        if (/^[A-FM]$/.test(var_)) {
          return { ...prev, menu:'none', shift:false, alpha:false,
            mem: { ...prev.mem, [var_]: prev.ans },
            result: `${var_}=${fmtNum(prev.ans, prev.dispFmt, prev.fixN)}` };
        }
        if (k.act === 'AC') return { ...prev, menu:'none' };
        return prev; // wait for valid key
      }
      if (prev.menu === 'rclWait') {
        // RCL: recall variable
        const var_ = k.alphaLabel ?? '';
        if (/^[A-FM]$/.test(var_)) {
          const val = prev.mem[var_] ?? 0;
          const newExpr = prev.expr + (var_);
          return { ...prev, menu:'none', shift:false, alpha:false,
            expr: newExpr, cursor: newExpr.length,
            result: fmtNum(val, prev.dispFmt, prev.fixN) };
        }
        if (k.act === 'AC') return { ...prev, menu:'none' };
        return prev;
      }

      // ── Resolve action ────────────────────────────────────────────────
      const act = prev.shift ? (k.sAct ?? k.act)
                : prev.alpha ? (k.aAct ?? k.act)
                : k.act;

      // Clear modifiers on every real key press
      const base: CS = { ...prev, shift: false, alpha: false, err: null };

      // ── Append token at cursor ─────────────────────────────────────────
      const app = (tok: string): CS => {
        let e = base.expr;
        let cur = base.cursor;

        if (base.fresh) {
          // After =: operator continues with Ans, digit/fn starts fresh
          if (/^[+−×÷\^%]/.test(tok)) {
            e = 'Ans'; cur = 3;
          } else if (!/^[)!]/.test(tok)) {
            e = ''; cur = 0;
          }
        }

        const newExpr = e.slice(0, cur) + tok + e.slice(cur);
        return { ...base, expr: newExpr, cursor: cur + tok.length, result: '', fresh: false };
      };

      // Tokens that DEL should remove as a whole unit
      const MULTI_TOKENS = [
        'sinh⁻¹(','cosh⁻¹(','tanh⁻¹(',
        'sin⁻¹(', 'cos⁻¹(', 'tan⁻¹(',
        'sinh(',  'cosh(',  'tanh(',
        'sin(',   'cos(',   'tan(',
        '×10^(',  'log(',   'ln(', 'eˣ(', '√(', '∛(', 'abs(',
        'Pol(',   'Rec(',   'nCr(','nPr(',
        '10^(',   '^(-1)',  '^2',  '^3',  '−(',
      ];

      switch (act) {
        // ── Mode keys ──────────────────────────────────────────────────
        case 'SHIFT': return { ...prev, shift: !prev.shift, alpha: false };
        case 'ALPHA': return { ...prev, alpha: !prev.alpha, shift: false };
        case 'HYP':   return { ...base, hyp: !prev.hyp };
        case 'MENU':  return { ...base, menu: 'main' };
        case 'SETUP': return { ...base, menu: 'setup' };
        case 'NOOP':  return base;

        case 'AC':
        case 'OFF':
          return { ...INIT, angle: prev.angle, mem: prev.mem, dispFmt: prev.dispFmt, fixN: prev.fixN };

        // ── Cursor navigation ──────────────────────────────────────────
        case 'CUR_LEFT':
          return { ...base, cursor: Math.max(0, base.cursor - 1) };
        case 'CUR_RIGHT':
          return { ...base, cursor: Math.min(base.expr.length, base.cursor + 1) };

        // ── Delete ─────────────────────────────────────────────────────
        case 'DEL': {
          if (base.fresh) return { ...base, expr: '', cursor: 0, result: '', fresh: false };
          const e   = base.expr;
          const cur = base.cursor;
          if (cur === 0) return base;
          // Try removing a multi-char token ending at cursor
          for (const m of MULTI_TOKENS) {
            if (e.slice(0, cur).endsWith(m)) {
              const newExpr = e.slice(0, cur - m.length) + e.slice(cur);
              return { ...base, expr: newExpr, cursor: cur - m.length };
            }
          }
          return { ...base, expr: e.slice(0, cur-1) + e.slice(cur), cursor: cur - 1 };
        }

        // ── Angle unit cycling ─────────────────────────────────────────
        case 'TODEG': {
          const cyc: AngleUnit[] = ['DEG','RAD','GRAD'];
          return { ...base, angle: cyc[(cyc.indexOf(prev.angle)+1) % 3] };
        }

        // ── Digits & basic operators ───────────────────────────────────
        case '0':case '1':case '2':case '3':case '4':
        case '5':case '6':case '7':case '8':case '9':
        case '.':
          return app(act);
        case '+': case '−': case '×': case '÷':
          return app(act);

        // ── Constants ──────────────────────────────────────────────────
        case 'PI':      return app('π');
        case 'ECONST':  return app('ℯ');
        case 'ANS':     return app('Ans');
        case 'PERCENT': return app('%');
        case 'LPAR':    return app('(');
        case 'RPAR':    return app(')');
        case 'NEG':     return app('−(');

        // ── Functions ──────────────────────────────────────────────────
        case 'ABS':  return app('abs(');
        case 'SQRT': return app('√(');
        case 'CBRT': return app('∛(');
        case 'SQ':   return app('^2');
        case 'CUBE': return app('^3');
        case 'POW':  return app('^(');
        case 'POW10':return app('10^(');
        case 'EXPX': return app('eˣ(');
        case 'INV':  return app('^(-1)');
        case 'FACT': return app('!');
        case 'LOG':  return app('log(');
        case 'LN':   return app('ln(');
        case 'EE':   return app('×10^(');
        case 'FRAC': return app('(');   // fraction start = open paren in this engine

        // ── Trig — respect HYP and SHIFT ──────────────────────────────
        case 'SIN':  return app(prev.hyp ? 'sinh('   : 'sin(');
        case 'COS':  return app(prev.hyp ? 'cosh('   : 'cos(');
        case 'TAN':  return app(prev.hyp ? 'tanh('   : 'tan(');
        case 'ASIN': return app(prev.hyp ? 'sinh⁻¹(' : 'sin⁻¹(');
        case 'ACOS': return app(prev.hyp ? 'cosh⁻¹(' : 'cos⁻¹(');
        case 'ATAN': return app(prev.hyp ? 'tanh⁻¹(' : 'tan⁻¹(');

        // ── nCr / nPr ──────────────────────────────────────────────────
        case 'NCR': return app('nCr(');
        case 'NPR': return app('nPr(');

        // ── Pol / Rec ──────────────────────────────────────────────────
        case 'POL': return app('Pol(');
        case 'REC': return app('Rec(');

        // ── Random ─────────────────────────────────────────────────────
        case 'RANNUM': {
          const r = parseFloat(Math.random().toFixed(3));
          return { ...base, result: fmtNum(r, prev.dispFmt, prev.fixN), ans: r, fresh: true };
        }
        case 'RND': {
          // Round Ans to current display precision
          const factor = Math.pow(10, prev.fixN);
          const r = Math.round(prev.ans * factor) / factor;
          return { ...base, result: fmtNum(r, prev.dispFmt, prev.fixN), ans: r, fresh: true };
        }

        // ── Memory ─────────────────────────────────────────────────────
        case 'STO': return { ...base, menu: 'stoWait', result: 'STO→' };
        case 'RCL': return { ...base, menu: 'rclWait', result: 'RCL←' };

        case 'MPLUS': {
          const m = prev.mem.M + prev.ans;
          return { ...base, mem: { ...prev.mem, M: m }, result: `M=${fmtNum(m, prev.dispFmt, prev.fixN)}` };
        }
        case 'MMINUS': {
          const m = prev.mem.M - prev.ans;
          return { ...base, mem: { ...prev.mem, M: m }, result: `M=${fmtNum(m, prev.dispFmt, prev.fixN)}` };
        }

        // ── S⟺D ────────────────────────────────────────────────────────
        case 'STOD': {
          const r = prev.ans;
          if (!isNaN(r) && isFinite(r)) {
            // If currently showing decimal, try fraction
            if (!prev.result.includes('/')) {
              const frac = toFrac(r);
              if (frac) return { ...base, result: frac };
            }
            // Already fraction → switch to decimal
            return { ...base, result: fmtNum(r, prev.dispFmt, prev.fixN) };
          }
          return base;
        }

        // ── ENG shift ──────────────────────────────────────────────────
        case 'ENG': {
          // Shift result exponent +3
          if (prev.result && !isNaN(prev.ans)) {
            return { ...base, dispFmt: 'ENG', fixN: 3,
              result: fmtNum(prev.ans, 'ENG', 3) };
          }
          return base;
        }
        case 'ENGB': {
          // Shift result exponent -3
          if (prev.result && !isNaN(prev.ans)) {
            return { ...base, dispFmt: 'NORM', fixN: 9,
              result: fmtNum(prev.ans, 'NORM', 9) };
          }
          return base;
        }

        // ── Equals ─────────────────────────────────────────────────────
        case '=': {
          const exprToEval = base.expr.trim() || '0';
          try {
            const val = calcEval(exprToEval, prev.angle, prev.ans, prev.mem);
            if (isNaN(val))
              return { ...base, result: 'Math ERROR', err: 'Math ERROR', fresh: true };
            return {
              ...base,
              result: fmtNum(val, prev.dispFmt, prev.fixN),
              ans: val, fresh: true,
            };
          } catch {
            return { ...base, result: 'Syntax ERROR', err: 'Syntax ERROR', fresh: true };
          }
        }

        default: return base;
      }
    });
  }, []);

  const s = cs;

  // D-pad centre
  const DP_CX = 150;
  const DP_CY = NAV_Y + 24;
  const DP_R  = 26;

  // ── Menu overlay screens ─────────────────────────────────────────────────
  const menuOverlay = s.menu !== 'none';

  const menuContent = () => {
    if (s.menu === 'main') return (
      <div style={{ display:'flex', flexDirection:'column', gap:3, fontSize:8, color:'#182a04', padding:2 }}>
        <div style={{ fontWeight:'bold', fontSize:8.5, marginBottom:3, borderBottom:'1px solid #9ab888', paddingBottom:2 }}>
          MODE
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:3 }}>
          {[['1','COMP'],['2','STAT'],['3','TABLE'],['4','EQN'],['5','RATIO'],['6','CMPLX']].map(([n,m]) => (
            <span key={n} style={{
              background: n==='1' ? '#1a2a04' : 'transparent',
              color: n==='1' ? '#b8cca8' : '#182a04',
              padding:'1px 2px', borderRadius:1, fontSize:7.5,
            }}>{n}:{m}</span>
          ))}
        </div>
        <div style={{ fontSize:6.5, color:'#557755', marginTop:2 }}>Press 1 for COMP</div>
      </div>
    );
    if (s.menu === 'setup') return (
      <div style={{ display:'flex', flexDirection:'column', gap:2, fontSize:8, color:'#182a04', padding:2 }}>
        <div style={{ fontWeight:'bold', fontSize:8.5, marginBottom:3, borderBottom:'1px solid #9ab888', paddingBottom:2 }}>
          SETUP
        </div>
        {[['1','Deg','DEG'],['2','Rad','RAD'],['3','Grad','GRAD']].map(([n,lbl,u]) => (
          <div key={n} style={{ display:'flex', gap:4, alignItems:'center' }}>
            <span style={{ color:'#557755', fontSize:7 }}>{n}:</span>
            <span style={{
              fontWeight: u===s.angle ? 'bold' : 'normal',
              textDecoration: u===s.angle ? 'underline' : 'none',
              fontSize:8,
            }}>{lbl}</span>
            {u===s.angle && <span style={{ fontSize:6, color:'#557755' }}>✓</span>}
          </div>
        ))}
      </div>
    );
    if (s.menu === 'stoWait') return (
      <div style={{ fontSize:8, color:'#182a04', padding:4 }}>
        <div style={{ fontWeight:'bold', marginBottom:4 }}>STO →</div>
        <div style={{ color:'#557755', fontSize:7 }}>Press A–F or M</div>
        <div style={{ fontSize:6.5, marginTop:2, color:'#888' }}>(ALPHA + letter key)</div>
      </div>
    );
    if (s.menu === 'rclWait') return (
      <div style={{ fontSize:8, color:'#182a04', padding:4 }}>
        <div style={{ fontWeight:'bold', marginBottom:4 }}>RCL ←</div>
        <div style={{ color:'#557755', fontSize:7 }}>Press A–F or M</div>
        <div style={{ fontSize:6.5, marginTop:2, color:'#888' }}>(ALPHA + letter key)</div>
      </div>
    );
    return null;
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', left: pos.x, top: pos.y,
      zIndex: 9999, userSelect: 'none',
      filter: 'drop-shadow(0 16px 40px rgba(0,0,0,0.85))',
    }}>
      <svg
        width={VW} height={VH}
        viewBox={`0 0 ${VW} ${VH}`}
        style={{ display:'block', cursor:'default' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* ── Gradient defs ─────────────────────────────────────────────── */}
        <defs>
          <linearGradient id="rimGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="#e8e8e0"/>
            <stop offset="50%"  stopColor="#d0d0c8"/>
            <stop offset="100%" stopColor="#c0c0b8"/>
          </linearGradient>
          <radialGradient id="dpadGrad" cx="50%" cy="35%" r="60%">
            <stop offset="0%"   stopColor="#d8d8d0"/>
            <stop offset="100%" stopColor="#888880"/>
          </radialGradient>
          <radialGradient id="dpadCtr" cx="50%" cy="40%" r="55%">
            <stop offset="0%"   stopColor="#b0b0a8"/>
            <stop offset="100%" stopColor="#606058"/>
          </radialGradient>
          <linearGradient id="keyWGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#f0f0e8"/>
            <stop offset="100%" stopColor="#d8d8d0"/>
          </linearGradient>
          <linearGradient id="keyDGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#303030"/>
            <stop offset="100%" stopColor="#1a1a1a"/>
          </linearGradient>
        </defs>

        {/* ── Outer silver/white rim ─────────────────────────────────────── */}
        <rect x={0} y={0} width={VW} height={VH} rx={20} ry={20}
          fill="url(#rimGrad)" stroke="#a0a098" strokeWidth={1} />

        {/* ── Inner black textured face ──────────────────────────────────── */}
        <rect x={7} y={7} width={VW-14} height={VH-14} rx={14} ry={14}
          fill="#1a1a1a" />
        {Array.from({length:32}).map((_,i) => (
          <line key={i} x1={7} y1={22+i*17} x2={VW-7} y2={22+i*17}
            stroke="#232323" strokeWidth={0.6} opacity={0.6} />
        ))}

        {/* ── CASIO branding ─────────────────────────────────────────────── */}
        <text x={16} y={28} fill="#fff" fontSize={16} fontWeight="900"
          fontFamily="Arial Black, Arial, sans-serif" letterSpacing="2.5">CASIO</text>
        <text x={16} y={40} fill="#888" fontSize={7.5}
          fontFamily="Arial, sans-serif" letterSpacing="1.2">fx-991EX</text>
        <text x={16} y={52} fill="#e0205a" fontSize={8} fontWeight="bold"
          fontFamily="'Courier New', Courier, monospace" letterSpacing="3.5">CLASSWIZ</text>

        {/* ── Solar panel ───────────────────────────────────────────────── */}
        <rect x={168} y={14} width={118} height={32} rx={4}
          fill="#080808" stroke="#3a3a3a" strokeWidth={0.8}/>
        {Array.from({length:11}).map((_,i) => (
          <rect key={i} x={170+i*10.5} y={16} width={9} height={28} rx={1.5}
            fill="#0f0f0f" stroke="#252525" strokeWidth={0.5}/>
        ))}

        {/* ── Drag handle ───────────────────────────────────────────────── */}
        <rect x={0} y={0} width={VW} height={64} rx={20}
          fill="transparent"
          onMouseDown={onDragStart} style={{ cursor:'grab' }} />

        {/* ── Close button ──────────────────────────────────────────────── */}
        <g onClick={onClose} style={{ cursor:'pointer' }}>
          <circle cx={VW-14} cy={14} r={10} fill="rgba(0,0,0,0.45)" />
          <text x={VW-14} y={18.5} textAnchor="middle" fill="#ccc" fontSize={11} fontWeight="bold">×</text>
        </g>

        {/* ── Screen bezel ──────────────────────────────────────────────── */}
        <rect x={SCR_X-2} y={SCR_Y-4} width={SCR_W+4} height={SCR_H+8} rx={6}
          fill="#333" />
        <rect x={SCR_X} y={SCR_Y} width={SCR_W} height={SCR_H} rx={4}
          fill="#b8cca8" />
        {Array.from({length:20}).map((_,i) => (
          <line key={i} x1={SCR_X} y1={SCR_Y+i*5} x2={SCR_X+SCR_W} y2={SCR_Y+i*5}
            stroke="#a8bc98" strokeWidth={0.4} opacity={0.7}/>
        ))}

        {/* ── LCD content ───────────────────────────────────────────────── */}
        <foreignObject x={SCR_X} y={SCR_Y} width={SCR_W} height={SCR_H}>
          <div style={{
            width:'100%', height:'100%',
            background:'transparent', borderRadius:4,
            padding:'4px 7px', boxSizing:'border-box',
            display:'flex', flexDirection:'column',
            fontFamily:"'Courier New', Courier, monospace",
            overflow:'hidden',
          }}>
            {menuOverlay ? (
              // ── Menu overlay ────────────────────────────────────────────
              <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
                {menuContent()}
              </div>
            ) : (
              <>
                {/* Status bar */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:1 }}>
                  <div style={{ display:'flex', gap:3, alignItems:'center' }}>
                    <span style={{ fontSize:7.5, color:'#1a2a04', fontWeight:'bold', letterSpacing:1 }}>{s.angle}</span>
                    {s.dispFmt !== 'NORM' && (
                      <span style={{ fontSize:6.5, color:'#1a2a04' }}>{s.dispFmt}</span>
                    )}
                    {s.shift && <span style={{ fontSize:6, background:'#e8960a', color:'#fff', padding:'0 2px', borderRadius:1, fontWeight:'bold', lineHeight:'9px' }}>S</span>}
                    {s.alpha && <span style={{ fontSize:6, background:'#cc1030', color:'#fff', padding:'0 2px', borderRadius:1, fontWeight:'bold', lineHeight:'9px' }}>A</span>}
                    {s.hyp   && <span style={{ fontSize:6, background:'#446688', color:'#fff', padding:'0 2px', borderRadius:1, fontWeight:'bold', lineHeight:'9px' }}>H</span>}
                    {s.mem.M !== 0 && <span style={{ fontSize:6, background:'#335588', color:'#fff', padding:'0 2px', borderRadius:1, fontWeight:'bold', lineHeight:'9px' }}>M</span>}
                  </div>
                  <span style={{ fontSize:7, color:'#1a2a04', letterSpacing:0.5 }}>COMP</span>
                </div>

                {/* Expression line — top, small, right-aligned, shows what user typed */}
                <div style={{
                  flex: 1,
                  fontSize: s.expr.length > 30 ? 7 : s.expr.length > 20 ? 9 : 11,
                  color: '#182a04',
                  textAlign: 'right',
                  wordBreak: 'break-all',
                  lineHeight: 1.25,
                  paddingTop: 1,
                  whiteSpace: 'pre',
                  overflow: 'hidden',
                }}>
                  {/* Show cursor blinking effect using a bar */}
                  {s.fresh
                    ? s.expr
                    : s.expr.slice(0, s.cursor) + '|' + s.expr.slice(s.cursor)
                  }
                </div>

                {/* Result line — bottom, large, right-aligned */}
                <div style={{
                  fontSize: s.result.length > 16 ? 11
                           : s.result.length > 12 ? 13
                           : s.result.length > 8  ? 16
                           : 22,
                  fontWeight: 'bold',
                  color: s.err ? '#880000' : '#0a1804',
                  textAlign: 'right',
                  lineHeight: 1.1,
                  minHeight: 26,
                  letterSpacing: -0.5,
                }}>
                  {s.result ? s.result : (!s.expr ? '0' : '')}
                </div>
              </>
            )}
          </div>
        </foreignObject>

        {/* LCD corner dots */}
        <circle cx={SCR_X+4}       cy={SCR_Y+4}       r={1.5} fill="#9ab888" />
        <circle cx={SCR_X+SCR_W-4} cy={SCR_Y+4}       r={1.5} fill="#9ab888" />
        <circle cx={SCR_X+4}       cy={SCR_Y+SCR_H-4} r={1.5} fill="#9ab888" />
        <circle cx={SCR_X+SCR_W-4} cy={SCR_Y+SCR_H-4} r={1.5} fill="#9ab888" />

        {/* ── D-pad ─────────────────────────────────────────────────────── */}
        <circle cx={DP_CX} cy={DP_CY} r={DP_R} fill="url(#dpadGrad)" stroke="#606058" strokeWidth={1}/>
        <rect x={DP_CX-7} y={DP_CY-DP_R} width={14} height={DP_R*2} fill="#787870" opacity={0.3}/>
        <rect x={DP_CX-DP_R} y={DP_CY-7} width={DP_R*2} height={14} fill="#787870" opacity={0.3}/>
        <circle cx={DP_CX} cy={DP_CY} r={9} fill="url(#dpadCtr)" stroke="#505048" strokeWidth={0.8}/>
        <text x={DP_CX}       y={DP_CY-DP_R+11} textAnchor="middle" fill="#fff" fontSize={9} fontWeight="bold" fontFamily="Arial">▲</text>
        <text x={DP_CX}       y={DP_CY+DP_R-3}  textAnchor="middle" fill="#fff" fontSize={9} fontWeight="bold" fontFamily="Arial">▼</text>
        <text x={DP_CX-DP_R+5} y={DP_CY+3.5}   textAnchor="middle" fill="#fff" fontSize={9} fontWeight="bold" fontFamily="Arial">◀</text>
        <text x={DP_CX+DP_R-5} y={DP_CY+3.5}   textAnchor="middle" fill="#fff" fontSize={9} fontWeight="bold" fontFamily="Arial">▶</text>

        {/* ── HYP virtual key (between ALPHA and D-pad) ───────────────── */}
        <g onMouseDown={e => { e.preventDefault(); press({ id:'HYP',label:'hyp',x:0,y:0,w:0,h:0,fill:'',stroke:'',textFill:'',act:'HYP' }); }}
           style={{ cursor:'pointer' }}>
          <rect x={110} y={NAV_Y} width={28} height={14} rx={7}
            fill={s.hyp ? '#fff' : '#3a6a9a'} stroke={s.hyp ? '#3a6a9a' : '#1a4a7a'} strokeWidth={0.8}/>
          <text x={124} y={NAV_Y+9.5} textAnchor="middle"
            fill={s.hyp ? '#3a6a9a' : '#ddeeff'} fontSize={6.5} fontWeight="bold" fontFamily="Arial">hyp</text>
        </g>

        {/* ── All keys ──────────────────────────────────────────────────── */}
        {ALL_KEYS.map(k => {
          if (['UP','DOWN','LEFT','RIGHT','CTR'].includes(k.id)) {
            // Invisible d-pad hit zones
            return (
              <rect key={k.id}
                x={k.x} y={k.y} width={k.w} height={k.h}
                fill="transparent" stroke="none" style={{ cursor:'pointer' }}
                onMouseDown={e => { e.preventDefault(); press(k); }}
              />
            );
          }

          const isActive = (k.id === 'SHIFT' && s.shift)
                        || (k.id === 'ALPHA' && s.alpha);
          const fill   = isActive ? '#fff'    : k.fill;
          const tFill  = isActive ? '#cc1030' : k.textFill;
          const rx     = k.rx ?? 4;
          const cx     = k.x + k.w / 2;
          const cy     = k.y + k.h / 2;
          const fs     = k.fontSize ?? 9;

          // Show shift label in yellow only when shift is active and key has sAct
          const showShiftHint = s.shift && k.shiftLabel;
          // Show alpha label in red only when alpha is active
          const showAlphaHint = s.alpha && k.alphaLabel;

          return (
            <g key={k.id}
              onMouseDown={e => { e.preventDefault(); press(k); }}
              style={{ cursor:'pointer' }}
            >
              {/* shift label above */}
              {k.shiftLabel && (
                <text x={cx} y={k.y - 2} textAnchor="middle"
                  fill={showShiftHint ? '#e8960a' : '#886600'} fontSize={5.5} fontWeight="bold"
                  fontFamily="Arial, sans-serif">{k.shiftLabel}</text>
              )}
              {/* alpha label top-right */}
              {k.alphaLabel && (
                <text x={k.x + k.w - 1} y={k.y - 2} textAnchor="end"
                  fill={showAlphaHint ? '#e040a0' : '#883368'} fontSize={5.5} fontWeight="bold"
                  fontFamily="Arial, sans-serif">{k.alphaLabel}</text>
              )}
              {/* key shadow */}
              <rect x={k.x} y={k.y+2} width={k.w} height={k.h}
                rx={rx} ry={rx} fill={k.stroke} opacity={0.5}/>
              {/* key body */}
              <rect x={k.x} y={k.y} width={k.w} height={k.h}
                rx={rx} ry={rx}
                fill={k.fill === WHITE ? 'url(#keyWGrad)' : k.fill === DARK ? 'url(#keyDGrad)' : fill}
                stroke={k.stroke} strokeWidth={0.7}/>
              {/* active highlight */}
              {isActive && (
                <rect x={k.x} y={k.y} width={k.w} height={k.h}
                  rx={rx} ry={rx} fill="#fff" stroke={k.stroke} strokeWidth={0.7}/>
              )}
              {/* label */}
              <text
                x={cx} y={cy + fs * 0.37}
                textAnchor="middle"
                fill={isActive ? '#cc1030' : tFill}
                fontSize={fs}
                fontWeight={k.id === 'EQ' || /^\d$/.test(k.id) ? 'bold' : '600'}
                fontFamily="Arial, sans-serif"
              >{k.label}</text>
            </g>
          );
        })}

        {/* ── Bottom branding ───────────────────────────────────────────── */}
        <text x={VW/2} y={VH-10} textAnchor="middle"
          fill="#444" fontSize={7} fontFamily="Arial, sans-serif" letterSpacing={1}>
          NATURAL-V.P.A.M.
        </text>

      </svg>
    </div>
  );
}

// Made with Bob
