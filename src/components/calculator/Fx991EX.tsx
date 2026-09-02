'use client';

/**
 * Casio fx-991EX ClassWiz — pixel-accurate SVG replica
 * Layout based on the official Casio fx-991EX product photo.
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

    if (/[\d.]/.test(src[i])) {
      let n = '';
      while (i < src.length && /[\d.]/.test(src[i])) n += src[i++];
      out.push({ t: 'num', v: parseFloat(n) }); continue;
    }

    if (src.startsWith('Ans', i))  { out.push({ t: 'num', v: ans });      i += 3; continue; }
    if (src[i] === 'π')             { out.push({ t: 'num', v: Math.PI }); i++;    continue; }
    if (src[i] === 'ℯ')             { out.push({ t: 'num', v: Math.E });  i++;    continue; }
    if (/[A-F]/.test(src[i]) && !/[a-zA-Z(]/.test(src[i + 1] ?? '')) {
      out.push({ t: 'num', v: mem[src[i]] ?? 0 }); i++; continue;
    }

    if (src.startsWith('×10^(', i)) { out.push({ t: 'op', v: 'E' }); i += 5; continue; }
    if (src.startsWith('×10^', i))  { out.push({ t: 'op', v: 'E' }); i += 4; continue; }

    const FNS = [
      'sinh⁻¹(','cosh⁻¹(','tanh⁻¹(',
      'sin⁻¹(', 'cos⁻¹(', 'tan⁻¹(',
      'sinh(',  'cosh(',  'tanh(',
      'sin(',   'cos(',   'tan(',
      'log(',   'ln(',    'eˣ(',  '√(', 'abs(',
      'nCr(',   'nPr(',
    ];
    let matched = false;
    for (const fn of FNS) {
      if (src.startsWith(fn, i)) {
        out.push({ t: 'fn', v: fn.slice(0, -1) });
        out.push({ t: 'lp' });
        i += fn.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    if (src[i] === '(') { out.push({ t: 'lp' });     i++; continue; }
    if (src[i] === ')') { out.push({ t: 'rp' });     i++; continue; }
    if (src[i] === ',') { out.push({ t: 'comma' });  i++; continue; }

    if (src.startsWith('nCr', i)) { out.push({ t: 'op', v: 'nCr' }); i += 3; continue; }
    if (src.startsWith('nPr', i)) { out.push({ t: 'op', v: 'nPr' }); i += 3; continue; }

    const OPS: Record<string,string> = { '+':'+', '−':'-', '×':'*', '÷':'/', '^':'^', '%':'%', '!':'!' };
    if (OPS[src[i]]) { out.push({ t: 'op', v: OPS[src[i]] }); i++; continue; }

    i++;
  }
  out.push({ t: 'end' });
  return out;
}

function calcEval(expr: string, angle: AngleUnit, ans: number, mem: Record<string, number>): number {
  // auto-close parens
  let s = expr;
  const open = (s.match(/\(/g) || []).length;
  const close = (s.match(/\)/g) || []).length;
  if (open > close) s += ')'.repeat(open - close);

  const toks = tokenise(s, ans, mem);
  let pos = 0;
  const peek = () => toks[pos];
  const eat  = () => toks[pos++];

  const PREC: Record<string, number> = {
    '+': 1, '-': 1, '*': 2, '/': 2, 'E': 3, '^': 4, 'nCr': 2, 'nPr': 2
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
      if      (t.v === '+')   left = left + right;
      else if (t.v === '-')   left = left - right;
      else if (t.v === '*')   left = left * right;
      else if (t.v === '/')   left = left / right;
      else if (t.v === 'E')   left = left * Math.pow(10, right);
      else if (t.v === '^')   left = Math.pow(left, right);
      else if (t.v === 'nCr') left = _nCr(left, right);
      else if (t.v === 'nPr') left = _nPr(left, right);
    }
    const p1 = peek(); if (p1.t === 'op' && p1.v === '!') { eat(); left = factorial(left); }
    const p2 = peek(); if (p2.t === 'op' && p2.v === '%') { eat(); left = left / 100; }
    return left;
  }

  function parseUnary(): number {
    const pu = peek(); if (pu.t === 'op' && pu.v === '-') { eat(); return -parsePrimary(); }
    return parsePrimary();
  }

  function parsePrimary(): number {
    const t = peek();
    if (t.t === 'num') { eat(); return t.v; }
    if (t.t === 'lp') {
      eat(); const v = parseExpr(); if (peek().t === 'rp') eat(); return v;
    }
    if (t.t === 'fn') {
      eat();
      if (peek().t === 'lp') eat();
      const a = parseExpr();
      let b: number | undefined;
      if (peek().t === 'comma') { eat(); b = parseExpr(); }
      if (peek().t === 'rp') eat();
      const fn = t.v;
      if (fn === 'sin')    return Math.sin(toRad(a, angle));
      if (fn === 'cos')    return Math.cos(toRad(a, angle));
      if (fn === 'tan')    return Math.tan(toRad(a, angle));
      if (fn === 'sin⁻¹') return fromRad(Math.asin(a), angle);
      if (fn === 'cos⁻¹') return fromRad(Math.acos(a), angle);
      if (fn === 'tan⁻¹') return fromRad(Math.atan(a), angle);
      if (fn === 'sinh')   return Math.sinh(a);
      if (fn === 'cosh')   return Math.cosh(a);
      if (fn === 'tanh')   return Math.tanh(a);
      if (fn === 'sinh⁻¹') return Math.asinh(a);
      if (fn === 'cosh⁻¹') return Math.acosh(a);
      if (fn === 'tanh⁻¹') return Math.atanh(a);
      if (fn === 'log')    return b !== undefined ? Math.log(b) / Math.log(a) : Math.log10(a);
      if (fn === 'ln')     return Math.log(a);
      if (fn === 'eˣ')     return Math.exp(a);
      if (fn === '√')      return Math.sqrt(a);
      if (fn === 'abs')    return Math.abs(a);
      if (fn === 'nCr')    return b !== undefined ? _nCr(a, b) : NaN;
      if (fn === 'nPr')    return b !== undefined ? _nPr(a, b) : NaN;
      return NaN;
    }
    return 0;
  }

  return parseExpr();
}

// ─────────────────────────────── Initial state ───────────────────────────────

const INIT: CS = {
  expr: '', result: '', shift: false, alpha: false, hyp: false,
  angle: 'DEG', mem: { A:0, B:0, C:0, D:0, E:0, F:0, M:0 }, ans: 0, err: null, fresh: false,
};

// ─────────────────────────────── Layout constants ────────────────────────────

// ViewBox: 300 wide × 580 tall — matches the slim portrait ratio of the real device
const VW = 300;
const VH = 580;

// ── Key geometry ─────────────────────────────────────────────────────────────
// All measurements in SVG units (px at 1:1).

// Screen area
const SCR_X = 14;
const SCR_Y = 60;
const SCR_W = VW - 28;
const SCR_H = 96;

// Nav row  (SHIFT / ALPHA / D-pad / MENU / ON)
const NAV_Y = 176;

// Function rows — 4 rows of 6 small dark keys
// Real device rows: row0 has 4 wide keys, rows 1-3 have 6 keys each
const FN_GAP = 5;    // gap between function keys
const FN_H   = 22;   // height of each fn key
const FN_Y0  = 222;  // y of first fn row
const FNR = [FN_Y0, FN_Y0 + FN_H + FN_GAP, FN_Y0 + 2*(FN_H + FN_GAP), FN_Y0 + 3*(FN_H + FN_GAP)];

// Number rows — 4 rows of 5 keys
const NUM_GAP = 6;
const NUM_H   = 34;
const NUM_Y0  = 320;
const NUMR = [NUM_Y0, NUM_Y0 + NUM_H + NUM_GAP, NUM_Y0 + 2*(NUM_H + NUM_GAP), NUM_Y0 + 3*(NUM_H + NUM_GAP)];

// Key colour palette
const DARK  = '#252525';  // dark body keys
const DSTK  = '#111';
const WHITE = '#e8e8e0';  // white number keys
const WSTK  = '#b8b8b0';
const BLUE  = '#1640c8';  // DEL / AC
const BLSTK = '#0a2070';
const ORANGE= '#e87810';  // = key
const ORSTK = '#a04800';

// ─────────────────────────────── Key interface ───────────────────────────────

interface K {
  id: string;
  label: string;
  x: number; y: number; w: number; h: number;
  rx?: number;
  fill: string; stroke: string; textFill: string;
  fontSize?: number;
  act: string; sAct?: string; aAct?: string;
  shiftLabel?: string; alphaLabel?: string;
  bold?: boolean;
}

// ─────────────────────────────── Key definitions ─────────────────────────────

// Helper: evenly space N keys across width W starting at x0, with gap g
function row(
  ids: string[], labels: string[], y: number, h: number,
  fills: string[], strokes: string[], textFills: string[],
  acts: string[], fontSizes: number[],
  x0 = 14, totalW = VW - 28, gap = 5,
  extras: Partial<K>[] = []
): K[] {
  const n = ids.length;
  const kw = (totalW - gap * (n - 1)) / n;
  return ids.map((id, i) => ({
    id, label: labels[i],
    x: x0 + i * (kw + gap), y, w: kw, h,
    fill: fills[i], stroke: strokes[i], textFill: textFills[i],
    fontSize: fontSizes[i],
    act: acts[i],
    rx: 4,
    ...extras[i],
  }));
}

// ── Nav row: custom positions (not evenly spaced — D-pad is big) ──────────────
const NAV_KEYS: K[] = [
  // SHIFT — amber pill
  { id:'SHIFT', label:'SHIFT', x:14,  y:NAV_Y, w:44, h:26, rx:13,
    fill:'#e8960a', stroke:'#a06000', textFill:'#fff', fontSize:8, act:'SHIFT',
    shiftLabel:'', bold:true },
  // ALPHA — red pill
  { id:'ALPHA', label:'ALPHA', x:62,  y:NAV_Y, w:44, h:26, rx:13,
    fill:'#cc1030', stroke:'#880020', textFill:'#fff', fontSize:8, act:'ALPHA',
    shiftLabel:'', bold:true },
  // D-pad hit zones (drawn separately in SVG)
  { id:'UP',    label:'', x:122, y:NAV_Y-2,  w:28, h:16, rx:3, fill:'transparent', stroke:'none', textFill:'transparent', act:'UP'   },
  { id:'LEFT',  label:'', x:108, y:NAV_Y+14, w:16, h:18, rx:3, fill:'transparent', stroke:'none', textFill:'transparent', act:'LEFT' },
  { id:'CTR',   label:'', x:126, y:NAV_Y+14, w:24, h:18, rx:12,fill:'transparent', stroke:'none', textFill:'transparent', act:'NOOP' },
  { id:'RIGHT', label:'', x:152, y:NAV_Y+14, w:16, h:18, rx:3, fill:'transparent', stroke:'none', textFill:'transparent', act:'RIGHT'},
  { id:'DOWN',  label:'', x:122, y:NAV_Y+34, w:28, h:16, rx:3, fill:'transparent', stroke:'none', textFill:'transparent', act:'DOWN' },
  // MENU
  { id:'MENU', label:'MENU', x:198, y:NAV_Y,   w:38, h:26, rx:5,
    fill:'#333', stroke:'#1a1a1a', textFill:'#bbb', fontSize:7.5, act:'NOOP', shiftLabel:'SETUP' },
  // ON
  { id:'ON',   label:'ON',   x:244, y:NAV_Y,   w:42, h:26, rx:5,
    fill:'#333', stroke:'#1a1a1a', textFill:'#bbb', fontSize:7.5, act:'AC', shiftLabel:'OFF' },
];

// ── Function row 0: OPTN  CALC  ∫dx  x  (4 keys) ─────────────────────────────
const FN0_X = 14;
const FN0_W = VW - 28;
const FN0_KW = (FN0_W - 3*5) / 4;
const FN0: K[] = [
  { id:'OPTN', label:'OPTN', x:FN0_X + 0*(FN0_KW+5), y:FNR[0], w:FN0_KW, h:FN_H, rx:4,
    fill:DARK, stroke:DSTK, textFill:'#ddd', fontSize:8.5, act:'NOOP', shiftLabel:'QR' },
  { id:'CALC', label:'CALC', x:FN0_X + 1*(FN0_KW+5), y:FNR[0], w:FN0_KW, h:FN_H, rx:4,
    fill:DARK, stroke:DSTK, textFill:'#ddd', fontSize:8.5, act:'NOOP', shiftLabel:'SOLVE' },
  { id:'INTG', label:'∫dx',  x:FN0_X + 2*(FN0_KW+5), y:FNR[0], w:FN0_KW, h:FN_H, rx:4,
    fill:DARK, stroke:DSTK, textFill:'#ddd', fontSize:9,   act:'NOOP', shiftLabel:'d/dx' },
  { id:'XVAR', label:'x',    x:FN0_X + 3*(FN0_KW+5), y:FNR[0], w:FN0_KW, h:FN_H, rx:4,
    fill:DARK, stroke:DSTK, textFill:'#ddd', fontSize:11,  act:'NOOP', shiftLabel:'Σ' },
];

// ── Function rows 1-3: 6 keys each ───────────────────────────────────────────
const FN6_KW = (FN0_W - 5*5) / 6;
function fn6row(rowDefs: {id:string,label:string,act:string,sAct?:string,aAct?:string,shiftLabel?:string,alphaLabel?:string,fontSize?:number}[], yIdx: number): K[] {
  return rowDefs.map((d, i) => ({
    id: d.id, label: d.label,
    x: FN0_X + i * (FN6_KW + 5), y: FNR[yIdx], w: FN6_KW, h: FN_H, rx: 4,
    fill: DARK, stroke: DSTK, textFill: '#ddd',
    fontSize: d.fontSize ?? 9,
    act: d.act, sAct: d.sAct, aAct: d.aAct,
    shiftLabel: d.shiftLabel, alphaLabel: d.alphaLabel,
  }));
}

const FN1: K[] = fn6row([
  { id:'FRAC', label:'a b/c', act:'NOOP',                        shiftLabel:'d/c',   fontSize:7   },
  { id:'SQRT', label:'√',    act:'SQRT',  sAct:'CBRT',           shiftLabel:'³√'                  },
  { id:'SQ',   label:'x²',   act:'SQ',    sAct:'CUBE',           shiftLabel:'x³'                  },
  { id:'POW',  label:'xᵐ',   act:'POW'                                                            },
  { id:'LOGB', label:'log',  act:'LOG',   sAct:'POW10',          shiftLabel:'10ˣ'                 },
  { id:'LN',   label:'ln',   act:'LN',    sAct:'EXPX',           shiftLabel:'eˣ'                  },
], 1);

const FN2: K[] = fn6row([
  { id:'NEG',  label:'(-)',  act:'NEG',   sAct:'LOG',            shiftLabel:'log',  alphaLabel:'A' },
  { id:'DMS',  label:"°'\"", act:'NOOP',                                            alphaLabel:'B', fontSize:8 },
  { id:'INV',  label:'x⁻¹', act:'INV',   sAct:'FACT',           shiftLabel:'x!',   alphaLabel:'C' },
  { id:'SIN',  label:'sin',  act:'SIN',   sAct:'ASIN',           shiftLabel:'sin⁻¹',alphaLabel:'D' },
  { id:'COS',  label:'cos',  act:'COS',   sAct:'ACOS',           shiftLabel:'cos⁻¹',alphaLabel:'E' },
  { id:'TAN',  label:'tan',  act:'TAN',   sAct:'ATAN',           shiftLabel:'tan⁻¹',alphaLabel:'F' },
], 2);

const FN3: K[] = fn6row([
  { id:'STO',  label:'STO',  act:'STO',   sAct:'RCL',            shiftLabel:'RCL'                 },
  { id:'ENG',  label:'ENG',  act:'NOOP',                         shiftLabel:'←ENG'                },
  { id:'LPAR', label:'(',    act:'LPAR',  sAct:'ABS',            shiftLabel:'Abs',  fontSize:11    },
  { id:'RPAR', label:')',    act:'RPAR',                                             fontSize:11    },
  { id:'STOD', label:'S⟺D', act:'STOD',  sAct:'TODEG',          shiftLabel:'▶DEG', fontSize:7     },
  { id:'MPLUS',label:'M+',   act:'MPLUS', sAct:'MMINUS',         shiftLabel:'M−'                  },
], 3);

// ── Number rows ───────────────────────────────────────────────────────────────
// Row layout: 3 wide white keys + 2 narrower right keys (DEL/AC or operators)
// Real device: all 5 keys same width in num rows, but = key is orange and same size

const NUM_KW  = (FN0_W - 4*NUM_GAP) / 5;

function numKey(id: string, label: string, x: number, y: number, w: number,
                fill: string, stroke: string, textFill: string,
                fontSize: number, act: string,
                extras: Partial<K> = {}): K {
  return { id, label, x, y, w, h: NUM_H, rx: 5, fill, stroke, textFill, fontSize, act, ...extras };
}

const NUM_KEYS: K[] = [
  // Row 0: 7  8  9  DEL  AC
  numKey('7',   '7',   FN0_X + 0*(NUM_KW+NUM_GAP), NUMR[0], NUM_KW, WHITE,WSTK,'#111', 18,'7', {shiftLabel:'CONST'}),
  numKey('8',   '8',   FN0_X + 1*(NUM_KW+NUM_GAP), NUMR[0], NUM_KW, WHITE,WSTK,'#111', 18,'8', {shiftLabel:'CONV'}),
  numKey('9',   '9',   FN0_X + 2*(NUM_KW+NUM_GAP), NUMR[0], NUM_KW, WHITE,WSTK,'#111', 18,'9', {shiftLabel:'CLR'}),
  numKey('DEL', 'DEL', FN0_X + 3*(NUM_KW+NUM_GAP), NUMR[0], NUM_KW, BLUE, BLSTK,'#fff',11,'DEL',{shiftLabel:'INS',sAct:'INS'}),
  numKey('AC',  'AC',  FN0_X + 4*(NUM_KW+NUM_GAP), NUMR[0], NUM_KW, BLUE, BLSTK,'#fff',11,'AC', {shiftLabel:'OFF',sAct:'OFF'}),

  // Row 1: 4  5  6  ×  ÷
  numKey('4',   '4',   FN0_X + 0*(NUM_KW+NUM_GAP), NUMR[1], NUM_KW, WHITE,WSTK,'#111', 18,'4', {shiftLabel:'nPr'}),
  numKey('5',   '5',   FN0_X + 1*(NUM_KW+NUM_GAP), NUMR[1], NUM_KW, WHITE,WSTK,'#111', 18,'5'),
  numKey('6',   '6',   FN0_X + 2*(NUM_KW+NUM_GAP), NUMR[1], NUM_KW, WHITE,WSTK,'#111', 18,'6'),
  numKey('MUL', '×',   FN0_X + 3*(NUM_KW+NUM_GAP), NUMR[1], NUM_KW, WHITE,WSTK,'#111', 16,'×', {shiftLabel:'nCr'}),
  numKey('DIV', '÷',   FN0_X + 4*(NUM_KW+NUM_GAP), NUMR[1], NUM_KW, WHITE,WSTK,'#111', 16,'÷'),

  // Row 2: 1  2  3  +  −
  numKey('1',   '1',   FN0_X + 0*(NUM_KW+NUM_GAP), NUMR[2], NUM_KW, WHITE,WSTK,'#111', 18,'1'),
  numKey('2',   '2',   FN0_X + 1*(NUM_KW+NUM_GAP), NUMR[2], NUM_KW, WHITE,WSTK,'#111', 18,'2'),
  numKey('3',   '3',   FN0_X + 2*(NUM_KW+NUM_GAP), NUMR[2], NUM_KW, WHITE,WSTK,'#111', 18,'3'),
  numKey('ADD', '+',   FN0_X + 3*(NUM_KW+NUM_GAP), NUMR[2], NUM_KW, WHITE,WSTK,'#111', 16,'+', {shiftLabel:'Pol'}),
  numKey('SUB', '−',   FN0_X + 4*(NUM_KW+NUM_GAP), NUMR[2], NUM_KW, WHITE,WSTK,'#111', 16,'−', {shiftLabel:'Rec'}),

  // Row 3: 0  .  ×10ˣ  Ans  =
  numKey('0',   '0',    FN0_X + 0*(NUM_KW+NUM_GAP), NUMR[3], NUM_KW, WHITE,WSTK,'#111', 18,'0',  {shiftLabel:'Rnd'}),
  numKey('DOT', '.',    FN0_X + 1*(NUM_KW+NUM_GAP), NUMR[3], NUM_KW, WHITE,WSTK,'#111', 20,'.', {shiftLabel:'Ran#'}),
  numKey('EE',  '×10ˣ', FN0_X + 2*(NUM_KW+NUM_GAP), NUMR[3], NUM_KW, WHITE,WSTK,'#111',  8,'EE', {shiftLabel:'π',sAct:'PI'}),
  numKey('ANS', 'Ans',  FN0_X + 3*(NUM_KW+NUM_GAP), NUMR[3], NUM_KW, WHITE,WSTK,'#111', 10,'ANS',{shiftLabel:'%',sAct:'PERCENT'}),
  numKey('EQ',  '=',   FN0_X + 4*(NUM_KW+NUM_GAP), NUMR[3], NUM_KW, ORANGE,ORSTK,'#fff',20,'='),
];

const ALL_KEYS: K[] = [...NAV_KEYS, ...FN0, ...FN1, ...FN2, ...FN3, ...NUM_KEYS];

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

  const press = useCallback((k: K) => {
    setCS(prev => {
      const act = prev.shift ? (k.sAct ?? k.act)
                : prev.alpha ? (k.aAct ?? k.act)
                : k.act;
      const base: CS = { ...prev, shift: false, alpha: false, err: null };

      const app = (tok: string): CS => {
        let e = base.expr;
        if (base.fresh) {
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
        case 'CBRT':   return app('nCr(3,');  // approximate — real device has ³√
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
        case 'STO': return { ...base, result: 'STO → A-F' };
        case 'RCL': return { ...base, result: 'RCL ← A-F' };

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

  // ── D-pad geometry ────────────────────────────────────────────────────────
  const DP_CX = 150;  // centre of d-pad
  const DP_CY = NAV_Y + 24;
  const DP_R  = 26;   // outer circle radius

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
        style={{ display: 'block', cursor: 'default' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* ── Outer silver/white rim ─────────────────────────────────────── */}
        <rect x={0} y={0} width={VW} height={VH} rx={20} ry={20}
          fill="url(#rimGrad)" stroke="#a0a098" strokeWidth={1} />

        {/* ── Inner black textured face ──────────────────────────────────── */}
        <rect x={7} y={7} width={VW-14} height={VH-14} rx={14} ry={14}
          fill="#1a1a1a" />
        {/* subtle horizontal texture lines */}
        {Array.from({length:32}).map((_,i) => (
          <line key={i} x1={7} y1={22+i*17} x2={VW-7} y2={22+i*17}
            stroke="#232323" strokeWidth={0.6} opacity={0.6} />
        ))}

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
        </defs>

        {/* ── CASIO branding ─────────────────────────────────────────────── */}
        <text x={16} y={28} fill="#ffffff" fontSize={16} fontWeight="900"
          fontFamily="Arial Black, Arial, sans-serif" letterSpacing="2.5">CASIO</text>
        <text x={16} y={40} fill="#888" fontSize={7.5}
          fontFamily="Arial, sans-serif" letterSpacing="1.2">fx-991EX</text>
        {/* CLASSWIZ in hot-pink dot-matrix style */}
        <text x={16} y={52} fill="#e0205a" fontSize={8} fontWeight="bold"
          fontFamily="'Courier New', Courier, monospace" letterSpacing="3.5">CLASSWIZ</text>

        {/* ── Solar panel (right of branding) ───────────────────────────── */}
        <rect x={168} y={14} width={118} height={32} rx={4}
          fill="#080808" stroke="#3a3a3a" strokeWidth={0.8}/>
        {Array.from({length:11}).map((_,i) => (
          <rect key={i} x={170+i*10.5} y={16} width={9} height={28} rx={1.5}
            fill="#0f0f0f" stroke="#252525" strokeWidth={0.5}/>
        ))}

        {/* ── Drag handle (top area, invisible) ─────────────────────────── */}
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
        {/* LCD panel background */}
        <rect x={SCR_X} y={SCR_Y} width={SCR_W} height={SCR_H} rx={4}
          fill="#b8cca8" />
        {/* subtle LCD scan lines */}
        {Array.from({length:20}).map((_,i) => (
          <line key={i} x1={SCR_X} y1={SCR_Y+i*5} x2={SCR_X+SCR_W} y2={SCR_Y+i*5}
            stroke="#a8bc98" strokeWidth={0.4} opacity={0.7}/>
        ))}

        {/* ── LCD content ───────────────────────────────────────────────── */}
        <foreignObject x={SCR_X} y={SCR_Y} width={SCR_W} height={SCR_H}>
          <div
            style={{
              width: '100%', height: '100%',
              background: 'transparent',
              borderRadius: 4,
              padding: '5px 8px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              fontFamily: "'Courier New', Courier, monospace",
              overflow: 'hidden',
            }}
          >
            {/* Status bar */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2 }}>
              <div style={{ display:'flex', gap:3, alignItems:'center' }}>
                <span style={{ fontSize:7.5, color:'#1a2a04', fontWeight:'bold', letterSpacing:1 }}>{s.angle}</span>
                {s.shift && <span style={{ fontSize:6, background:'#e8960a', color:'#fff', padding:'0 2px', borderRadius:1, fontWeight:'bold', lineHeight:'9px' }}>S</span>}
                {s.alpha && <span style={{ fontSize:6, background:'#cc1030', color:'#fff', padding:'0 2px', borderRadius:1, fontWeight:'bold', lineHeight:'9px' }}>A</span>}
                {s.hyp   && <span style={{ fontSize:6, background:'#446688', color:'#fff', padding:'0 2px', borderRadius:1, fontWeight:'bold', lineHeight:'9px' }}>H</span>}
                {s.mem.M !== 0 && <span style={{ fontSize:6, background:'#335588', color:'#fff', padding:'0 2px', borderRadius:1, fontWeight:'bold', lineHeight:'9px' }}>M</span>}
              </div>
              <span style={{ fontSize:7, color:'#1a2a04', letterSpacing:0.5 }}>COMP</span>
            </div>

            {/* Expression line */}
            <div style={{
              flex: 1,
              fontSize: 11,
              color: '#182a04',
              textAlign: 'right',
              wordBreak: 'break-all',
              lineHeight: 1.25,
              paddingTop: 1,
            }}>
              {s.expr || (s.fresh ? '' : '')}
            </div>

            {/* Result line */}
            <div style={{
              fontSize: s.result.length > 14 ? 13 : (s.result.length > 10 ? 16 : 22),
              fontWeight: 'bold',
              color: s.err ? '#880000' : '#0a1804',
              textAlign: 'right',
              lineHeight: 1.1,
              minHeight: 26,
              letterSpacing: -0.5,
            }}>
              {s.result ? s.result : (!s.expr ? '0' : '')}
            </div>
          </div>
        </foreignObject>

        {/* ── Screen corner indicators ───────────────────────────────────── */}
        {/* Tiny dots in corners of LCD to simulate real display corners */}
        <circle cx={SCR_X+4}       cy={SCR_Y+4}       r={1.5} fill="#9ab888" />
        <circle cx={SCR_X+SCR_W-4} cy={SCR_Y+4}       r={1.5} fill="#9ab888" />
        <circle cx={SCR_X+4}       cy={SCR_Y+SCR_H-4} r={1.5} fill="#9ab888" />
        <circle cx={SCR_X+SCR_W-4} cy={SCR_Y+SCR_H-4} r={1.5} fill="#9ab888" />

        {/* ── D-pad — circular silver rocker ────────────────────────────── */}
        {/* Outer circle */}
        <circle cx={DP_CX} cy={DP_CY} r={DP_R} fill="url(#dpadGrad)" stroke="#606058" strokeWidth={1}/>
        {/* Darker cross channels to show 4-way rocker shape */}
        <rect x={DP_CX-8} y={DP_CY-DP_R} width={16} height={DP_R*2}
          fill="#787870" opacity={0.35} />
        <rect x={DP_CX-DP_R} y={DP_CY-8} width={DP_R*2} height={16}
          fill="#787870" opacity={0.35} />
        {/* Center circle */}
        <circle cx={DP_CX} cy={DP_CY} r={9} fill="url(#dpadCtr)" stroke="#505048" strokeWidth={0.8}/>
        {/* Arrow labels */}
        <text x={DP_CX} y={DP_CY-DP_R+11} textAnchor="middle" fill="#fff" fontSize={9} fontWeight="bold" fontFamily="Arial">▲</text>
        <text x={DP_CX} y={DP_CY+DP_R-3}  textAnchor="middle" fill="#fff" fontSize={9} fontWeight="bold" fontFamily="Arial">▼</text>
        <text x={DP_CX-DP_R+5} y={DP_CY+3.5} textAnchor="middle" fill="#fff" fontSize={9} fontWeight="bold" fontFamily="Arial">◀</text>
        <text x={DP_CX+DP_R-5} y={DP_CY+3.5} textAnchor="middle" fill="#fff" fontSize={9} fontWeight="bold" fontFamily="Arial">▶</text>

        {/* ── Buttons ──────────────────────────────────────────────────────── */}
        {ALL_KEYS.map(k => {
          // Skip d-pad ghost keys — they use transparent fill, drawn via d-pad SVG above
          if (['UP','DOWN','LEFT','RIGHT','CTR'].includes(k.id)) {
            return (
              <rect key={k.id}
                x={k.x} y={k.y} width={k.w} height={k.h}
                fill="transparent" stroke="none"
                style={{ cursor:'pointer' }}
                onMouseDown={e => { e.preventDefault(); press(k); }}
              />
            );
          }

          const isActive = (k.id === 'SHIFT' && s.shift)
                        || (k.id === 'ALPHA' && s.alpha);
          const fill   = isActive ? '#fff'    : k.fill;
          const tFill  = isActive ? '#cc1030' : k.textFill;
          const stroke = k.stroke;
          const rx     = k.rx ?? 4;
          const cx     = k.x + k.w / 2;
          const cy     = k.y + k.h / 2;
          const fs     = k.fontSize ?? 9;

          return (
            <g key={k.id}
              onMouseDown={e => { e.preventDefault(); press(k); }}
              style={{ cursor:'pointer' }}
            >
              {/* shift label */}
              {k.shiftLabel && (
                <text x={cx} y={k.y - 2} textAnchor="middle"
                  fill="#e8960a" fontSize={5.5} fontWeight="bold"
                  fontFamily="Arial, sans-serif">{k.shiftLabel}</text>
              )}
              {/* alpha label */}
              {k.alphaLabel && (
                <text x={k.x + k.w - 2} y={k.y - 2} textAnchor="end"
                  fill="#e040a0" fontSize={5.5} fontWeight="bold"
                  fontFamily="Arial, sans-serif">{k.alphaLabel}</text>
              )}
              {/* key body shadow */}
              <rect x={k.x} y={k.y+2} width={k.w} height={k.h}
                rx={rx} ry={rx} fill={stroke} opacity={0.5}/>
              {/* key body */}
              <rect x={k.x} y={k.y} width={k.w} height={k.h}
                rx={rx} ry={rx} fill={fill} stroke={stroke} strokeWidth={0.7}/>
              {/* key label */}
              <text
                x={cx} y={cy + fs * 0.37}
                textAnchor="middle"
                fill={tFill}
                fontSize={fs}
                fontWeight={k.id === 'EQ' || /^\d$/.test(k.id) ? 'bold' : '600'}
                fontFamily="Arial, sans-serif"
              >{k.label}</text>
            </g>
          );
        })}

        {/* ── Bottom brand strip ─────────────────────────────────────────── */}
        <text x={VW/2} y={VH-10} textAnchor="middle"
          fill="#444" fontSize={7} fontFamily="Arial, sans-serif" letterSpacing={1}>
          NATURAL-V.P.A.M.
        </text>

      </svg>
    </div>
  );
}

// Made with Bob
