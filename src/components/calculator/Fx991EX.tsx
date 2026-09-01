'use client';

/**
 * Casio fx-991EX ClassWiz — SVG body + working math engine
 * SVG drawn to match the official product photo exactly.
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
  fresh: boolean;          // true right after = pressed
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
  if (!Number.isInteger(n) || n < 0 || n > 170) return n > 170 ? Infinity : NaN;
  let r = 1; for (let i = 2; i <= n; i++) r *= i; return r;
}
function _nCr(n: number, r: number) {
  if (!Number.isInteger(n) || !Number.isInteger(r) || r < 0 || r > n || n < 0) return NaN;
  return factorial(n) / (factorial(r) * factorial(n - r));
}
function _nPr(n: number, r: number) {
  if (!Number.isInteger(n) || !Number.isInteger(r) || r < 0 || r > n || n < 0) return NaN;
  return factorial(n) / factorial(n - r);
}

function fmtNum(v: number): string {
  if (isNaN(v)) return 'Math ERROR';
  if (!isFinite(v)) return v > 0 ? '∞' : '-∞';
  const abs = Math.abs(v);
  if (abs !== 0 && (abs >= 1e10 || abs < 1e-9)) {
    const s = v.toExponential(6).replace(/\.?0+(e)/, '$1');
    const [mantissa, exp] = s.split('e');
    return `${mantissa}×10^${exp}`;
  }
  return parseFloat(v.toPrecision(10)).toString();
}

// ── Tokeniser ─────────────────────────────────────────────────────────────────

type Tok =
  | { t: 'num'; v: number }
  | { t: 'op';  v: string }
  | { t: 'lp' } | { t: 'rp' } | { t: 'comma' }
  | { t: 'fn';  v: string }
  | { t: 'end' };

function tokenise(src: string, ans: number, mem: Record<string, number>): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    if (/\s/.test(src[i])) { i++; continue; }

    // numbers
    if (/[\d.]/.test(src[i])) {
      let n = '';
      while (i < src.length && /[\d.]/.test(src[i])) n += src[i++];
      out.push({ t: 'num', v: parseFloat(n) }); continue;
    }

    // constants / variables
    if (src.startsWith('Ans', i))  { out.push({ t: 'num', v: ans });      i += 3; continue; }
    if (src[i] === 'π')             { out.push({ t: 'num', v: Math.PI }); i++;    continue; }
    if (src[i] === 'ℯ')             { out.push({ t: 'num', v: Math.E });  i++;    continue; }
    // memory A-F (not followed by more letters)
    if (/[A-F]/.test(src[i]) && !/[a-zA-Z(]/.test(src[i + 1] ?? '')) {
      out.push({ t: 'num', v: mem[src[i]] ?? 0 }); i++; continue;
    }

    // ×10^
    if (src.startsWith('×10^(', i)) { out.push({ t: 'op', v: 'E' }); i += 5; continue; }
    if (src.startsWith('×10^', i))  { out.push({ t: 'op', v: 'E' }); i += 4; continue; }

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
      if (src.startsWith(fn, i)) {
        out.push({ t: 'fn', v: fn }); i += fn.length;
        if (src[i] === '(') { out.push({ t: 'lp' }); i++; }
        matched = true; break;
      }
    }
    if (matched) continue;

    // operators
    const opMap: Record<string, string> = {
      '+':'+','−':'-','-':'-','×':'*','*':'*','÷':'/','/':'/',
      '^':'^','!':'!','%':'%',
    };
    if (opMap[src[i]]) { out.push({ t: 'op', v: opMap[src[i]] }); i++; continue; }
    if (src[i] === '(') { out.push({ t: 'lp' }); i++; continue; }
    if (src[i] === ')') { out.push({ t: 'rp' }); i++; continue; }
    if (src[i] === ',') { out.push({ t: 'comma' }); i++; continue; }
    i++;
  }
  out.push({ t: 'end' });
  return out;
}

// ── Recursive-descent parser ──────────────────────────────────────────────────

function calcEval(expr: string, angle: AngleUnit, ans: number, mem: Record<string, number>): number {
  if (!expr.trim()) return 0;
  // auto-close parens
  let e = expr;
  let open = 0;
  for (const c of e) { if (c === '(') open++; else if (c === ')') open--; }
  while (open-- > 0) e += ')';

  const toks = tokenise(e, ans, mem);
  let pos = 0;
  const cur = (): Tok => toks[pos];
  const eat = (): Tok => toks[pos++];

  const PREC: Record<string, number> = { '+':1,'-':1,'*':2,'/':2,'E':2,'^':4,'!':5,'%':5 };

  function parseExpr(minP = 0): number {
    let left = parseUnary();
    for (;;) {
      const t = cur();
      // implicit multiply
      if (t.t === 'lp' || t.t === 'fn' || t.t === 'num') {
        if (minP <= 2) { left *= parseUnary(); continue; }
        break;
      }
      if (t.t !== 'op') break;
      const p = PREC[t.v] ?? -1;
      if (p < minP) break;
      eat();
      if (t.v === '!') { left = factorial(left); continue; }
      if (t.v === '%') { left = left / 100; continue; }
      const rp = t.v === '^' ? p : p + 1;
      const right = parseExpr(rp);
      switch (t.v) {
        case '+': left += right; break;
        case '-': left -= right; break;
        case '*': left *= right; break;
        case '/': left /= right; break;
        case '^': left = Math.pow(left, right); break;
        case 'E': left = left * Math.pow(10, right); break;
      }
    }
    return left;
  }

  function parseUnary(): number {
    const t = cur();
    if (t.t === 'op' && t.v === '-') { eat(); return -parseUnary(); }
    if (t.t === 'op' && t.v === '+') { eat(); return  parseUnary(); }
    return parsePrimary();
  }

  function parsePrimary(): number {
    const t = eat();
    if (t.t === 'num') return t.v;
    if (t.t === 'lp') {
      const v = parseExpr(0);
      if (cur().t === 'rp') eat();
      return v;
    }
    if (t.t === 'fn') {
      if (t.v === 'nCr' || t.v === 'nPr') {
        const n = parseExpr(0);
        if (cur().t === 'comma') eat();
        const r = parseExpr(0);
        if (cur().t === 'rp') eat();
        return t.v === 'nCr' ? _nCr(n, r) : _nPr(n, r);
      }
      const a = parseExpr(0);
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

  return parseExpr(0);
}

// ─────────────────────────────── State ───────────────────────────────────────

const INIT: CS = {
  expr: '', result: '', shift: false, alpha: false, hyp: false,
  angle: 'DEG', mem: { A:0,B:0,C:0,D:0,E:0,F:0,M:0,X:0,Y:0 },
  ans: 0, err: null, fresh: false,
};

// ─────────────────────────────── Layout constants ────────────────────────────
// All measurements in SVG units. ViewBox = "0 0 280 560"

const VW = 280;
const VH = 560;

// ─────────────────────────────── Key definitions ─────────────────────────────

interface K {
  id: string; label: string;
  // label colours: 'w'=white 'y'=yellow 'r'=red/pink
  lc?: 'w'|'y'|'r';
  x: number; y: number; w: number; h: number;
  rx?: number;   // border-radius override
  // fill overrides
  fill?: string; stroke?: string; textFill?: string;
  fontSize?: number;
  act: string; sAct?: string; aAct?: string;
  // small labels above
  shiftLabel?: string; alphaLabel?: string;
}

// ── Button grid (SVG coordinates) ────────────────────────────────────────────
// Body inner starts at x=14, y=14. Width=252.
// Screen: y=74..178
// Nav row: y=190
// Fn rows: y=232,258,284,310
// Num rows: y=340,372,404,436

const COL = [18, 70, 122, 174, 226];  // 5 column left-edges
const CW  = 44;   // column width (each key)
const CW2 = 48;   // wider keys (DEL/AC)

// nav buttons (round)
const NAV_Y  = 196;
const NAV_R  = 16;   // radius

// fn row heights
const FN_H  = 22;
const FN_Y  = [234, 258, 282, 306];

// num row heights  
const NUM_H = 32;
const NUM_Y = [342, 378, 414, 450];

const KEYS: K[] = [
  // ── NAV ROW ──────────────────────────────────────────────────────────────
  // SHIFT (amber oval)
  { id:'SHIFT', label:'SHIFT', x:22,  y:NAV_Y-12, w:40, h:24, rx:12, fill:'#e8960a', stroke:'#a06000', textFill:'#fff', fontSize:8,  act:'SHIFT' },
  // ALPHA (red oval)
  { id:'ALPHA', label:'ALPHA', x:68,  y:NAV_Y-12, w:40, h:24, rx:12, fill:'#d01038', stroke:'#880020', textFill:'#fff', fontSize:8,  act:'ALPHA' },
  // D-pad up
  { id:'UP',    label:'▲',     x:150, y:NAV_Y-26, w:22, h:18, rx:4,  fill:'#666', stroke:'#333', textFill:'#ddd', fontSize:9, act:'UP',   shiftLabel:'STAT' },
  // D-pad left
  { id:'LEFT',  label:'◀',     x:122, y:NAV_Y-8,  w:18, h:18, rx:4,  fill:'#666', stroke:'#333', textFill:'#ddd', fontSize:9, act:'LEFT'  },
  // D-pad centre
  { id:'CTR',   label:'',      x:144, y:NAV_Y-8,  w:34, h:18, rx:8,  fill:'#888', stroke:'#555', textFill:'#fff', fontSize:8, act:'NOOP'  },
  // D-pad right
  { id:'RIGHT', label:'▶',     x:182, y:NAV_Y-8,  w:18, h:18, rx:4,  fill:'#666', stroke:'#333', textFill:'#ddd', fontSize:9, act:'RIGHT' },
  // D-pad down
  { id:'DOWN',  label:'▼',     x:150, y:NAV_Y+10, w:22, h:18, rx:4,  fill:'#666', stroke:'#333', textFill:'#ddd', fontSize:9, act:'DOWN', shiftLabel:'TABLE' },
  // MENU (small grey)
  { id:'MENU',  label:'MENU',  x:208, y:NAV_Y-12, w:30, h:24, rx:5,  fill:'#555', stroke:'#333', textFill:'#ccc', fontSize:7, act:'NOOP', shiftLabel:'SETUP' },
  // ON (small grey)
  { id:'ON',    label:'ON',    x:242, y:NAV_Y-12, w:26, h:24, rx:5,  fill:'#555', stroke:'#333', textFill:'#ccc', fontSize:7, act:'AC',   shiftLabel:'OFF' },

  // ── FN ROW 0: OPTN  CALC  [space]  ∫  x ─────────────────────────────────
  { id:'OPTN', label:'OPTN', x:18, y:FN_Y[0], w:50, h:FN_H, rx:3, fill:'#2a2a2a', stroke:'#111', textFill:'#e8e8e8', fontSize:8, act:'NOOP', shiftLabel:'QR' },
  { id:'CALC', label:'CALC', x:72, y:FN_Y[0], w:50, h:FN_H, rx:3, fill:'#2a2a2a', stroke:'#111', textFill:'#e8e8e8', fontSize:8, act:'NOOP', shiftLabel:'SOLVE' },
  { id:'INTG', label:'∫',    x:162,y:FN_Y[0], w:46, h:FN_H, rx:3, fill:'#2a2a2a', stroke:'#111', textFill:'#e8e8e8', fontSize:10,act:'NOOP', shiftLabel:'d/dx' },
  { id:'XVAR', label:'x',    x:212,y:FN_Y[0], w:46, h:FN_H, rx:3, fill:'#2a2a2a', stroke:'#111', textFill:'#e8e8e8', fontSize:10,act:'NOOP', shiftLabel:'Σ' },

  // ── FN ROW 1: ≡  √  x²  xᵐ  log□  ln ───────────────────────────────────
  { id:'FRAC', label:'≡',    x:18, y:FN_Y[1], w:40, h:FN_H, rx:3, fill:'#2a2a2a', stroke:'#111', textFill:'#e8e8e8', fontSize:11,act:'NOOP' },
  { id:'SQRT', label:'√',    x:62, y:FN_Y[1], w:40, h:FN_H, rx:3, fill:'#2a2a2a', stroke:'#111', textFill:'#e8e8e8', fontSize:11,act:'SQRT', shiftLabel:'³√' },
  { id:'SQ',   label:'x²',   x:106,y:FN_Y[1], w:40, h:FN_H, rx:3, fill:'#2a2a2a', stroke:'#111', textFill:'#e8e8e8', fontSize:9, act:'SQ',   shiftLabel:'x³' },
  { id:'POW',  label:'xᵐ',   x:150,y:FN_Y[1], w:40, h:FN_H, rx:3, fill:'#2a2a2a', stroke:'#111', textFill:'#e8e8e8', fontSize:9, act:'POW' },
  { id:'LOGB', label:'log□', x:194,y:FN_Y[1], w:36, h:FN_H, rx:3, fill:'#2a2a2a', stroke:'#111', textFill:'#e8e8e8', fontSize:7, act:'LOG',  shiftLabel:'10ˣ', sAct:'POW10' },
  { id:'LN',   label:'ln',   x:234,y:FN_Y[1], w:30, h:FN_H, rx:3, fill:'#2a2a2a', stroke:'#111', textFill:'#e8e8e8', fontSize:9, act:'LN',   shiftLabel:'eˣ',  sAct:'EXPX' },

  // ── FN ROW 2: (-)  °'"  x⁻¹  sin  cos  tan ──────────────────────────────
  { id:'NEG',  label:'(-)',  x:18, y:FN_Y[2], w:38, h:FN_H, rx:3, fill:'#2a2a2a', stroke:'#111', textFill:'#e8e8e8', fontSize:8, act:'NEG',  shiftLabel:'log', sAct:'LOG', alphaLabel:'A' },
  { id:'DMS',  label:"°'\"", x:60, y:FN_Y[2], w:38, h:FN_H, rx:3, fill:'#2a2a2a', stroke:'#111', textFill:'#e8e8e8', fontSize:8, act:'NOOP', alphaLabel:'B' },
  { id:'INV',  label:'x⁻¹', x:102,y:FN_Y[2], w:38, h:FN_H, rx:3, fill:'#2a2a2a', stroke:'#111', textFill:'#e8e8e8', fontSize:8, act:'INV',  shiftLabel:'x!', sAct:'FACT', alphaLabel:'C' },
  { id:'SIN',  label:'sin',  x:144,y:FN_Y[2], w:38, h:FN_H, rx:3, fill:'#2a2a2a', stroke:'#111', textFill:'#e8e8e8', fontSize:9, act:'SIN',  shiftLabel:'sin⁻¹', sAct:'ASIN', alphaLabel:'D' },
  { id:'COS',  label:'cos',  x:186,y:FN_Y[2], w:38, h:FN_H, rx:3, fill:'#2a2a2a', stroke:'#111', textFill:'#e8e8e8', fontSize:9, act:'COS',  shiftLabel:'cos⁻¹', sAct:'ACOS', alphaLabel:'E' },
  { id:'TAN',  label:'tan',  x:228,y:FN_Y[2], w:36, h:FN_H, rx:3, fill:'#2a2a2a', stroke:'#111', textFill:'#e8e8e8', fontSize:9, act:'TAN',  shiftLabel:'tan⁻¹', sAct:'ATAN', alphaLabel:'F' },

  // ── FN ROW 3: STO  ENG  (  )  S⟺D  M+ ──────────────────────────────────
  { id:'STO',  label:'STO',  x:18, y:FN_Y[3], w:38, h:FN_H, rx:3, fill:'#2a2a2a', stroke:'#111', textFill:'#e8e8e8', fontSize:8, act:'STO',  shiftLabel:'RCL', sAct:'RCL' },
  { id:'ENG',  label:'ENG',  x:60, y:FN_Y[3], w:38, h:FN_H, rx:3, fill:'#2a2a2a', stroke:'#111', textFill:'#e8e8e8', fontSize:8, act:'NOOP' },
  { id:'LPAR', label:'(',    x:102,y:FN_Y[3], w:38, h:FN_H, rx:3, fill:'#2a2a2a', stroke:'#111', textFill:'#e8e8e8', fontSize:11,act:'LPAR', shiftLabel:'Abs', sAct:'ABS' },
  { id:'RPAR', label:')',    x:144,y:FN_Y[3], w:38, h:FN_H, rx:3, fill:'#2a2a2a', stroke:'#111', textFill:'#e8e8e8', fontSize:11,act:'RPAR' },
  { id:'STOD', label:'S⟺D', x:186,y:FN_Y[3], w:38, h:FN_H, rx:3, fill:'#2a2a2a', stroke:'#111', textFill:'#e8e8e8', fontSize:7, act:'STOD', shiftLabel:'▶DEG', sAct:'TODEG' },
  { id:'MPLUS',label:'M+',   x:228,y:FN_Y[3], w:36, h:FN_H, rx:3, fill:'#2a2a2a', stroke:'#111', textFill:'#e8e8e8', fontSize:8, act:'MPLUS',shiftLabel:'M−',  sAct:'MMINUS' },

  // ── NUM ROW 0: 7  8  9  DEL  AC ──────────────────────────────────────────
  { id:'7',  label:'7',   x:18, y:NUM_Y[0], w:50, h:NUM_H, rx:5, fill:'#f2f2ee', stroke:'#c8c8c0', textFill:'#111', fontSize:16, act:'7',   shiftLabel:'CONST' },
  { id:'8',  label:'8',   x:72, y:NUM_Y[0], w:50, h:NUM_H, rx:5, fill:'#f2f2ee', stroke:'#c8c8c0', textFill:'#111', fontSize:16, act:'8',   shiftLabel:'CONV' },
  { id:'9',  label:'9',   x:126,y:NUM_Y[0], w:50, h:NUM_H, rx:5, fill:'#f2f2ee', stroke:'#c8c8c0', textFill:'#111', fontSize:16, act:'9',   shiftLabel:'RESET' },
  { id:'DEL',label:'DEL', x:180,y:NUM_Y[0], w:40, h:NUM_H, rx:5, fill:'#1840b8', stroke:'#0a2070', textFill:'#fff', fontSize:11, act:'DEL', shiftLabel:'INS', sAct:'INS' },
  { id:'AC', label:'AC',  x:224,y:NUM_Y[0], w:40, h:NUM_H, rx:5, fill:'#1840b8', stroke:'#0a2070', textFill:'#fff', fontSize:11, act:'AC',  shiftLabel:'OFF', sAct:'OFF' },

  // ── NUM ROW 1: 4  5  6  ×  ÷ ────────────────────────────────────────────
  { id:'4',  label:'4',  x:18, y:NUM_Y[1], w:50, h:NUM_H, rx:5, fill:'#f2f2ee', stroke:'#c8c8c0', textFill:'#111', fontSize:16, act:'4', shiftLabel:'nPr' },
  { id:'5',  label:'5',  x:72, y:NUM_Y[1], w:50, h:NUM_H, rx:5, fill:'#f2f2ee', stroke:'#c8c8c0', textFill:'#111', fontSize:16, act:'5' },
  { id:'6',  label:'6',  x:126,y:NUM_Y[1], w:50, h:NUM_H, rx:5, fill:'#f2f2ee', stroke:'#c8c8c0', textFill:'#111', fontSize:16, act:'6' },
  { id:'MUL',label:'×',  x:180,y:NUM_Y[1], w:40, h:NUM_H, rx:5, fill:'#f2f2ee', stroke:'#c8c8c0', textFill:'#111', fontSize:16, act:'×', shiftLabel:'nCr' },
  { id:'DIV',label:'÷',  x:224,y:NUM_Y[1], w:40, h:NUM_H, rx:5, fill:'#f2f2ee', stroke:'#c8c8c0', textFill:'#111', fontSize:16, act:'÷' },

  // ── NUM ROW 2: 1  2  3  +  − ────────────────────────────────────────────
  { id:'1',  label:'1',  x:18, y:NUM_Y[2], w:50, h:NUM_H, rx:5, fill:'#f2f2ee', stroke:'#c8c8c0', textFill:'#111', fontSize:16, act:'1' },
  { id:'2',  label:'2',  x:72, y:NUM_Y[2], w:50, h:NUM_H, rx:5, fill:'#f2f2ee', stroke:'#c8c8c0', textFill:'#111', fontSize:16, act:'2' },
  { id:'3',  label:'3',  x:126,y:NUM_Y[2], w:50, h:NUM_H, rx:5, fill:'#f2f2ee', stroke:'#c8c8c0', textFill:'#111', fontSize:16, act:'3' },
  { id:'ADD',label:'+',  x:180,y:NUM_Y[2], w:40, h:NUM_H, rx:5, fill:'#f2f2ee', stroke:'#c8c8c0', textFill:'#111', fontSize:16, act:'+', shiftLabel:'Pol' },
  { id:'SUB',label:'−',  x:224,y:NUM_Y[2], w:40, h:NUM_H, rx:5, fill:'#f2f2ee', stroke:'#c8c8c0', textFill:'#111', fontSize:16, act:'−', shiftLabel:'Rec' },

  // ── NUM ROW 3: 0  .  ×10ˣ  Ans  = ───────────────────────────────────────
  { id:'0',  label:'0',    x:18, y:NUM_Y[3], w:50, h:NUM_H, rx:5, fill:'#f2f2ee', stroke:'#c8c8c0', textFill:'#111', fontSize:16, act:'0',  shiftLabel:'Rnd' },
  { id:'DOT',label:'.',    x:72, y:NUM_Y[3], w:50, h:NUM_H, rx:5, fill:'#f2f2ee', stroke:'#c8c8c0', textFill:'#111', fontSize:18, act:'.',  shiftLabel:'Ran#' },
  { id:'EE', label:'×10ˣ', x:126,y:NUM_Y[3], w:50, h:NUM_H, rx:5, fill:'#f2f2ee', stroke:'#c8c8c0', textFill:'#111', fontSize:8,  act:'EE', shiftLabel:'π', sAct:'PI' },
  { id:'ANS',label:'Ans',  x:180,y:NUM_Y[3], w:40, h:NUM_H, rx:5, fill:'#f2f2ee', stroke:'#c8c8c0', textFill:'#111', fontSize:11, act:'ANS',shiftLabel:'%',  sAct:'PERCENT' },
  { id:'EQ', label:'=',    x:224,y:NUM_Y[3], w:40, h:NUM_H, rx:5, fill:'#f2f2ee', stroke:'#c8c8c0', textFill:'#111', fontSize:18, act:'=' },
];

// ─────────────────────────────── Component ───────────────────────────────────

interface Props { onClose: () => void }

export function Fx991EX({ onClose }: Props) {
  const [cs, setCS] = useState<CS>({ ...INIT });
  const [pos, setPos] = useState({ x: 60, y: 20 });
  const dragRef = useRef({ on: false, ox: 0, oy: 0 });

  // drag
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
    window.addEventListener('mouseup', mu);
    return () => { window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu); };
  }, []);

  // key press
  const press = useCallback((k: K) => {
    setCS(prev => {
      const act = prev.shift ? (k.sAct ?? k.act)
                : prev.alpha ? (k.aAct ?? k.act)
                : k.act;
      const base: CS = { ...prev, shift: false, alpha: false, err: null };

      const app = (tok: string): CS => {
        let e = base.expr;
        if (base.fresh) {
          // after = : operator continues with Ans, else start fresh
          if (/^[+−×÷\^]/.test(tok)) e = 'Ans';
          else if (!/^[)!%]/.test(tok)) e = '';
        }
        return { ...base, expr: e + tok, result: '', fresh: false };
      };

      const MULTI = [
        'sinh⁻¹(','cosh⁻¹(','tanh⁻¹(',
        'sin⁻¹(', 'cos⁻¹(', 'tan⁻¹(',
        'sinh(',  'cosh(',  'tanh(',
        'sin(',   'cos(',   'tan(',
        '×10^(',  'log(',   'ln(', 'eˣ(', '√(', 'abs(', 'nCr(', 'nPr(', '-(', '^(',
        '^(-1)', '^2', '^3',
      ];

      switch (act) {
        case 'SHIFT': return { ...prev, shift: !prev.shift, alpha: false };
        case 'ALPHA': return { ...prev, alpha: !prev.alpha, shift: false };
        case 'AC': case 'OFF': return { ...INIT, angle: prev.angle, mem: prev.mem };
        case 'HYP':   return { ...base, hyp: !prev.hyp };
        case 'NOOP':  return base;

        case 'DEL': {
          if (base.fresh) return { ...base, expr: '', result: '', fresh: false };
          const e = base.expr;
          for (const m of MULTI) if (e.endsWith(m)) return { ...base, expr: e.slice(0, -m.length) };
          return { ...base, expr: e.slice(0, -1) };
        }

        case 'TODEG': {
          const cyc: AngleUnit[] = ['DEG','RAD','GRAD'];
          return { ...base, angle: cyc[(cyc.indexOf(prev.angle) + 1) % 3] };
        }

        case '0':case '1':case '2':case '3':case '4':
        case '5':case '6':case '7':case '8':case '9':
        case '.': return app(act);
        case '+': case '−': case '×': case '÷': return app(act);

        case 'PI':      return app('π');
        case 'ECONST':  return app('ℯ');
        case 'ANS':     return app('Ans');
        case 'PERCENT': return app('%');
        case 'LPAR':    return app('(');
        case 'RPAR':    return app(')');
        case 'ABS':     return app('abs(');
        case 'NEG':     return app('-(');

        case 'SIN':  return app(prev.hyp ? 'sinh('   : 'sin(');
        case 'COS':  return app(prev.hyp ? 'cosh('   : 'cos(');
        case 'TAN':  return app(prev.hyp ? 'tanh('   : 'tan(');
        case 'ASIN': return app(prev.hyp ? 'sinh⁻¹(' : 'sin⁻¹(');
        case 'ACOS': return app(prev.hyp ? 'cosh⁻¹(' : 'cos⁻¹(');
        case 'ATAN': return app(prev.hyp ? 'tanh⁻¹(' : 'tan⁻¹(');

        case 'LOG':    return app('log(');
        case 'LN':     return app('ln(');
        case 'EXPX':   return app('eˣ(');
        case 'POW10':  return app('10^(');
        case 'SQRT':   return app('√(');
        case 'SQ':     return app('^2');
        case 'CUBE':   return app('^3');
        case 'POW':    return app('^(');
        case 'INV':    return app('^(-1)');
        case 'FACT':   return app('!');
        case 'EE':     return app('×10^(');
        case 'NCR':    return app('nCr(');
        case 'NPR':    return app('nPr(');

        case 'MPLUS': {
          const m = prev.mem.M + prev.ans;
          return { ...base, mem: { ...prev.mem, M: m }, result: `M=${fmtNum(m)}` };
        }
        case 'MMINUS': {
          const m = prev.mem.M - prev.ans;
          return { ...base, mem: { ...prev.mem, M: m }, result: `M=${fmtNum(m)}` };
        }
        case 'STO': return { ...base, result: 'STO: press A–F' };
        case 'RCL': return { ...base, result: 'RCL: press A–F' };

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

        case '=': {
          try {
            const val = calcEval(base.expr || '0', prev.angle, prev.ans, prev.mem);
            return { ...base, result: fmtNum(val), ans: isNaN(val) ? prev.ans : val, fresh: true };
          } catch {
            return { ...base, result: 'Syntax ERROR', err: 'Syntax ERROR', fresh: true };
          }
        }

        default: return base;
      }
    });
  }, []);

  const s = cs;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', left: pos.x, top: pos.y,
      zIndex: 9999, userSelect: 'none',
      filter: 'drop-shadow(0 12px 36px rgba(0,0,0,0.8))',
    }}>
      <svg
        width={VW} height={VH}
        viewBox={`0 0 ${VW} ${VH}`}
        style={{ display: 'block', cursor: 'default' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* ── Outer white/silver rim ──────────────────────────────────────── */}
        <rect x={0} y={0} width={VW} height={VH} rx={22} ry={22}
          fill="#d8d8d0" stroke="#b8b8b0" strokeWidth={1} />

        {/* ── Inner black textured face ───────────────────────────────────── */}
        <rect x={8} y={8} width={VW-16} height={VH-16} rx={16} ry={16}
          fill="#1c1c1c" />
        {/* subtle texture lines */}
        {Array.from({length:28}).map((_,i) => (
          <line key={i} x1={8} y1={28+i*18} x2={VW-8} y2={28+i*18}
            stroke="#222" strokeWidth={0.5} opacity={0.5} />
        ))}

        {/* ── Solar panel ─────────────────────────────────────────────────── */}
        <rect x={148} y={14} width={114} height={28} rx={4} fill="#0a0a0a" stroke="#444" strokeWidth={1}/>
        {Array.from({length:10}).map((_,i) => (
          <rect key={i} x={150+i*11} y={16} width={9} height={24} rx={1}
            fill="#111" stroke="#222" strokeWidth={0.5}/>
        ))}

        {/* ── CASIO branding ──────────────────────────────────────────────── */}
        <text x={18} y={30} fill="#fff" fontSize={14} fontWeight="900"
          fontFamily="Arial, sans-serif" letterSpacing="3">CASIO</text>
        <text x={18} y={42} fill="#999" fontSize={8}
          fontFamily="Arial, sans-serif" letterSpacing="1">fx-991EX</text>
        <text x={18} y={52} fill="#e8204a" fontSize={8.5} fontWeight="bold"
          fontFamily="'Courier New', monospace" letterSpacing="3">CLASSWIZ</text>

        {/* ── Drag handle (top strip, invisible) ──────────────────────────── */}
        <rect x={0} y={0} width={VW} height={70} rx={22} fill="transparent"
          onMouseDown={onDragStart} style={{ cursor:'grab' }} />

        {/* ── Close button ────────────────────────────────────────────────── */}
        <g onClick={onClose} style={{ cursor:'pointer' }}>
          <circle cx={VW-16} cy={16} r={9} fill="rgba(0,0,0,0.5)" />
          <text x={VW-16} y={20} textAnchor="middle" fill="#fff" fontSize={10}>×</text>
        </g>

        {/* ── Screen bezel ────────────────────────────────────────────────── */}
        <rect x={12} y={62} width={VW-24} height={104} rx={5} fill="#444" />
        {/* LCD panel */}
        <rect x={16} y={66} width={VW-32} height={96} rx={3} fill="#c8d8b8" />

        {/* ── LCD content (via foreignObject) ─────────────────────────────── */}
        <foreignObject x={16} y={66} width={VW-32} height={96}>
          <div
            style={{
              width: '100%', height: '100%',
              background: '#c8d8b8',
              borderRadius: 3,
              padding: '4px 8px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              fontFamily: 'monospace',
              overflow: 'hidden',
            }}
          >
            {/* Status row */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2 }}>
              <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                <span style={{ fontSize:8, color:'#1a2a04', fontWeight:'bold' }}>{s.angle}</span>
                {s.shift && <span style={{ fontSize:6.5, background:'#e8960a', color:'#fff', padding:'0 2px', borderRadius:1, fontWeight:'bold' }}>S</span>}
                {s.alpha && <span style={{ fontSize:6.5, background:'#d01038', color:'#fff', padding:'0 2px', borderRadius:1, fontWeight:'bold' }}>A</span>}
                {s.hyp   && <span style={{ fontSize:6.5, background:'#446',    color:'#fff', padding:'0 2px', borderRadius:1, fontWeight:'bold' }}>H</span>}
                {s.mem.M !== 0 && <span style={{ fontSize:6.5, background:'#338', color:'#fff', padding:'0 2px', borderRadius:1, fontWeight:'bold' }}>M</span>}
              </div>
              <span style={{ fontSize:8, color:'#1a2a04' }}>COMP</span>
            </div>

            {/* Expression line — small, right-aligned, shows what's being typed */}
            <div style={{
              flex:1,
              fontSize: 11,
              color: '#1a2a04',
              textAlign: 'right',
              wordBreak: 'break-all',
              lineHeight: 1.3,
              paddingTop: 2,
              minHeight: 14,
            }}>
              {/* Show expr while typing; after =, show expr above result */}
              {s.fresh ? s.expr : s.expr}
            </div>

            {/* Result line — large, right-aligned */}
            <div style={{
              fontSize: s.result.length > 12 ? 14 : 22,
              fontWeight: 'bold',
              color: s.err ? '#880000' : '#0a1a04',
              textAlign: 'right',
              lineHeight: 1.1,
              minHeight: 26,
            }}>
              {s.result
                ? s.result
                : s.expr
                  ? ''
                  : '0'}
            </div>
          </div>
        </foreignObject>

        {/* ── Buttons ─────────────────────────────────────────────────────── */}
        {KEYS.map(k => {
          const isActive = (k.act === 'SHIFT' && s.shift)
                        || (k.act === 'ALPHA' && s.alpha)
                        || (k.act === 'HYP'   && s.hyp);
          const fill   = isActive ? '#fff' : (k.fill ?? '#2a2a2a');
          const tFill  = isActive ? '#d01038' : (k.textFill ?? '#e8e8e8');
          const stroke = k.stroke ?? '#111';
          const rx     = k.rx ?? 3;
          const cx     = k.x + k.w / 2;
          const cy     = k.y + k.h / 2;
          const fs     = k.fontSize ?? 9;

          return (
            <g key={k.id}
              onMouseDown={e => { e.preventDefault(); press(k); }}
              style={{ cursor:'pointer' }}
            >
              {/* shift label above (yellow) */}
              {k.shiftLabel && (
                <text x={cx} y={k.y - 2} textAnchor="middle"
                  fill="#e8960a" fontSize={5.5} fontWeight="bold"
                  fontFamily="Arial, sans-serif">{k.shiftLabel}</text>
              )}
              {/* alpha label above (pink) */}
              {k.alphaLabel && (
                <text x={k.x + k.w - 2} y={k.y - 2} textAnchor="end"
                  fill="#e040a0" fontSize={5.5} fontWeight="bold"
                  fontFamily="Arial, sans-serif">{k.alphaLabel}</text>
              )}
              {/* key body */}
              <rect x={k.x} y={k.y} width={k.w} height={k.h} rx={rx} ry={rx}
                fill={fill} stroke={stroke} strokeWidth={0.8}
              />
              {/* 3D shadow line */}
              {!isActive && (
                <rect x={k.x} y={k.y + k.h} width={k.w} height={3} rx={2}
                  fill={stroke} opacity={0.7}/>
              )}
              {/* label */}
              <text x={cx} y={cy + fs * 0.38}
                textAnchor="middle"
                fill={tFill}
                fontSize={fs}
                fontWeight={k.act === '=' || /^\d$/.test(k.act) ? 'bold' : '600'}
                fontFamily="Arial, sans-serif"
              >{k.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Made with Bob
