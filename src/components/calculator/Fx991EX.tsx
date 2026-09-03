'use client';
/**
 * Casio fx-991EX ClassWiz — pixel-accurate SVG replica
 * Based on official product photo: black textured body, white rim border,
 * silver nav buttons, large D-pad, green LCD, blue DEL/AC, orange =
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';

type AngleUnit = 'DEG' | 'RAD' | 'GRAD';

interface CS {
  expr: string; cur: number; result: string;
  shift: boolean; alpha: boolean; hyp: boolean;
  angle: AngleUnit; mem: Record<string, number>;
  ans: number; err: boolean; fresh: boolean;
  menu: 'none' | 'mode' | 'setup' | 'stoWait' | 'rclWait';
}

const PI = Math.PI;
const toRad = (x: number, u: AngleUnit) =>
  u === 'DEG' ? x * PI / 180 : u === 'GRAD' ? x * PI / 200 : x;
const fromRad = (x: number, u: AngleUnit) =>
  u === 'DEG' ? x * 180 / PI : u === 'GRAD' ? x * 200 / PI : x;

function fact(n: number): number {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n > 170) return Infinity;
  let r = 1; for (let i = 2; i <= n; i++) r *= i; return r;
}
function nCr(n: number, r: number) { return fact(n) / (fact(r) * fact(n - r)); }
function nPr(n: number, r: number) { return fact(n) / fact(n - r); }
function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b); }

function fmtNum(v: number): string {
  if (!isFinite(v)) return v > 0 ? '∞' : '-∞';
  if (isNaN(v)) return 'Math ERROR';
  if (v === 0) return '0';
  const abs = Math.abs(v);
  if (abs >= 1e10 || (abs < 1e-9 && abs > 0)) {
    const e = Math.floor(Math.log10(abs));
    const m = v / Math.pow(10, e);
    return `${parseFloat(m.toPrecision(10))}×10^${e}`;
  }
  return parseFloat(v.toPrecision(10)).toString();
}

function tryFrac(v: number): string | null {
  for (let d = 2; d <= 1000; d++) {
    const n = Math.round(v * d);
    if (Math.abs(n / d - v) < 1e-9) {
      const g = gcd(Math.abs(n), d);
      const nn = n / g, dd = d / g;
      if (dd === 1) return null;
      if (dd <= 1000) return `${nn}/${dd}`;
    }
  }
  return null;
}

type Tok =
  | { t: 'num'; v: number } | { t: 'op'; v: string }
  | { t: 'fn'; v: string; args: number }
  | { t: 'lp' } | { t: 'rp' } | { t: 'comma' } | { t: 'end' };

const FN_LIST: [string, number][] = [
  ['sinh⁻¹(', 3], ['cosh⁻¹(', 3], ['tanh⁻¹(', 3],
  ['sin⁻¹(', 3], ['cos⁻¹(', 3], ['tan⁻¹(', 3],
  ['sinh(', 2], ['cosh(', 2], ['tanh(', 2],
  ['sin(', 1], ['cos(', 1], ['tan(', 1],
  ['log(', 1], ['ln(', 1], ['eˣ(', 1], ['abs(', 1],
  ['√(', 1], ['∛(', 1], ['10^(', 1], ['×10^(', 1],
  ['Pol(', 2], ['Rec(', 2], ['nCr(', 2], ['nPr(', 2],
];

function tokenise(src: string, ans: number, mem: Record<string, number>): Tok[] {
  const out: Tok[] = []; let i = 0;
  const iMul = () => { const l = out[out.length - 1]; if (l && (l.t === 'num' || l.t === 'rp')) out.push({ t: 'op', v: '*' }); };
  while (i < src.length) {
    if (src[i] === ' ') { i++; continue; }
    if (src.startsWith('Ans', i)) { iMul(); out.push({ t: 'num', v: ans }); i += 3; continue; }
    if (src[i] === 'π') { iMul(); out.push({ t: 'num', v: PI }); i++; continue; }
    if (/^[A-FMxy]$/.test(src[i])) { iMul(); out.push({ t: 'num', v: mem[src[i]] ?? 0 }); i++; continue; }
    if (/\d|\./.test(src[i])) {
      iMul();
      const sciM = src.slice(i).match(/^[\d.]+×10\^(\((-?\d+)\)|(-?\d+))/);
      if (sciM) {
        const base = parseFloat(src.slice(i, i + sciM[0].indexOf('×')));
        const exp = parseInt(sciM[2] ?? sciM[3]);
        out.push({ t: 'num', v: base * Math.pow(10, exp) }); i += sciM[0].length; continue;
      }
      let ns = ''; while (i < src.length && /\d|\./.test(src[i])) ns += src[i++];
      out.push({ t: 'num', v: parseFloat(ns) }); continue;
    }
    let matched = false;
    for (const [fn, args] of FN_LIST) {
      if (src.startsWith(fn, i)) {
        iMul(); out.push({ t: 'fn', v: fn.replace('(', ''), args }); out.push({ t: 'lp' });
        i += fn.length; matched = true; break;
      }
    }
    if (matched) continue;
    if (src[i] === '(') { iMul(); out.push({ t: 'lp' }); i++; continue; }
    if (src[i] === ')') { out.push({ t: 'rp' }); i++; continue; }
    if (src[i] === ',') { out.push({ t: 'comma' }); i++; continue; }
    const OPMAP: Record<string, string> = { '+': '+', '−': '-', '×': '*', '÷': '/', '!': '!', '%': '%', '^': '^' };
    if (OPMAP[src[i]]) { out.push({ t: 'op', v: OPMAP[src[i]] }); i++; continue; }
    i++;
  }
  out.push({ t: 'end' }); return out;
}

function evaluate(expr: string, angle: AngleUnit, ans: number, mem: Record<string, number>): number {
  const toks = tokenise(expr, ans, mem); let pos = 0;
  const peek = () => toks[pos]; const eat = () => toks[pos++];
  function expr_(minP = 0): number {
    let left = unary();
    while (true) {
      const t = peek(); if (t.t !== 'op') break;
      const prec: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3, '!': 4, '%': 4 };
      const p = prec[t.v] ?? -1; if (p <= minP) break;
      eat();
      if (t.v === '!') { left = fact(left); continue; }
      if (t.v === '%') { left = left / 100; continue; }
      const right = t.v === '^' ? expr_(p) : expr_(p);
      if (t.v === '+') left += right; else if (t.v === '-') left -= right;
      else if (t.v === '*') left *= right; else if (t.v === '/') left /= right;
      else if (t.v === '^') left = Math.pow(left, right);
    }
    return left;
  }
  function unary(): number {
    if (peek().t === 'op' && (peek() as { t: 'op'; v: string }).v === '-') { eat(); return -primary(); }
    return primary();
  }
  function primary(): number {
    const t = peek();
    if (t.t === 'num') { eat(); return t.v; }
    if (t.t === 'lp') { eat(); const v = expr_(); eat(); return v; }
    if (t.t === 'fn') {
      eat(); eat();
      const args: number[] = [];
      if (peek().t !== 'rp') { args.push(expr_()); while (peek().t === 'comma') { eat(); args.push(expr_()); } }
      eat();
      const fn = t.v; const a = args[0] ?? 0, b = args[1] ?? 0;
      switch (fn) {
        case 'sin': return Math.sin(toRad(a, angle));
        case 'cos': return Math.cos(toRad(a, angle));
        case 'tan': return Math.tan(toRad(a, angle));
        case 'sin⁻¹': return fromRad(Math.asin(a), angle);
        case 'cos⁻¹': return fromRad(Math.acos(a), angle);
        case 'tan⁻¹': return fromRad(Math.atan(a), angle);
        case 'sinh': return Math.sinh(a); case 'cosh': return Math.cosh(a); case 'tanh': return Math.tanh(a);
        case 'sinh⁻¹': return Math.asinh(a); case 'cosh⁻¹': return Math.acosh(a); case 'tanh⁻¹': return Math.atanh(a);
        case 'log': return Math.log10(a); case 'ln': return Math.log(a); case 'eˣ': return Math.exp(a);
        case 'abs': return Math.abs(a); case '√': return Math.sqrt(a); case '∛': return Math.cbrt(a);
        case '10^': return Math.pow(10, a); case '×10^': return a;
        case 'Pol': return Math.sqrt(a * a + b * b); case 'Rec': return a * Math.cos(toRad(b, angle));
        case 'nCr': return nCr(a, b); case 'nPr': return nPr(a, b);
        default: return NaN;
      }
    }
    return NaN;
  }
  return expr_();
}

const INIT: CS = {
  expr: '', cur: 0, result: '', shift: false, alpha: false, hyp: false,
  angle: 'DEG', mem: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, M: 0, x: 0, y: 0 },
  ans: 0, err: false, fresh: false, menu: 'none',
};

// ─── Layout ──────────────────────────────────────────────────────────────────
// Viewbox matches the real device proportions from the photo
const VW = 264, VH = 558;

// Outer white rim inset
const RIM = 7;

// Screen
const SX = 20, SY = 64, SW = VW - 40, SH = 72;

// ── NAV ROW ──
// In the photo: SHIFT(left), ALPHA(next), D-PAD(center-large), MENU(right), ON(far right)
// OPTN and CALC sit just below SHIFT/ALPHA; ∫f□ and x sit just below MENU/ON
const NAV_Y = 152;  // y of nav row buttons

// D-pad
const DX = VW / 2, DY = NAV_Y + 17, DR = 24;

// SHIFT / ALPHA — small silver oval buttons
const SHX = 18, SHY = NAV_Y, SHW = 38, SHH = 24, SHR = 12;
const ALX = 60, ALY = NAV_Y, ALW = 38, ALH = 24, ALR = 12;

// MENU / ON — small silver round buttons  
const MNX = 188, MNY = NAV_Y, MNW = 30, MNH = 24, MNR = 12;
const ONX = 222, ONY = NAV_Y, ONW = 30, ONH = 24, ONR = 12;

// FN row 0 (OPTN CALC on left, ∫f□ x on right) — below nav row
const R0Y = NAV_Y + 34;
const R0H = 20;
// OPTN and CALC fill left half, ∫f□ and x fill right half
const LHALF_W = (DX - RIM - 4) / 2 - 2;  // width of each of OPTN/CALC
const RHALF_W = (VW - RIM - DX - 4) / 2 - 2; // width of each of ∫f□/x

// FN rows 1-3 (6 wide)
const FH = 20, FG = 4;
const FX = RIM + 1;
const FW = VW - 2 * (RIM + 1);
const F6W = (FW - 5 * FG) / 6;
const FY1 = R0Y + R0H + FG;
const FY2 = FY1 + FH + FG;
const FY3 = FY2 + FH + FG;

// Number rows
const NX = RIM + 1;
const NW_TOTAL = VW - 2 * (RIM + 1);
const NG = 5;
const NKW = (NW_TOTAL - 4 * NG) / 5;
const NKH = 34;
const NK_GAP = 4;
const NY0 = FY3 + FH + NK_GAP + 2;
const NY1 = NY0 + NKH + NK_GAP;
const NY2 = NY1 + NKH + NK_GAP;
const NY3 = NY2 + NKH + NK_GAP;

// colours
const DK = '#1c1c1c'; const DKS = '#080808';      // dark fn keys
const WK = '#e6e6de'; const WKS = '#a8a8a0';      // white num keys
const BK = '#1650d8'; const BKS = '#0c2898';      // blue DEL/AC
const OK = '#d07800'; const OKS = '#884800';      // orange =

interface K {
  id: string; label: string;
  x: number; y: number; w: number; h: number; rx: number;
  fill: string; stroke: string; tFill: string; fs: number;
  act: string; sAct?: string; aAct?: string;
  sLbl?: string; aLbl?: string; bold?: boolean;
}

// helpers
function nk(id: string, lbl: string, col: number, row: number,
  fill: string, str: string, tf: string, fs: number, act: string, extra: Partial<K> = {}): K {
  const ys = [NY0, NY1, NY2, NY3];
  return { id, label: lbl, x: NX + col * (NKW + NG), y: ys[row], w: NKW, h: NKH, rx: 6, fill, stroke: str, tFill: tf, fs, act, ...extra };
}

function fk(id: string, lbl: string, col: number, y: number,
  sLbl?: string, sAct?: string, aLbl?: string, aAct?: string, fs = 8): K {
  return {
    id, label: lbl, x: FX + col * (F6W + FG), y, w: F6W, h: FH, rx: 4,
    fill: DK, stroke: DKS, tFill: '#c8c8c8', fs, act: id,
    sLbl, sAct, aLbl, aAct,
  };
}

// ─── Key definitions ─────────────────────────────────────────────────────────

const NAV_KEYS: K[] = [
  // SHIFT — silver oval
  { id: 'SHIFT', label: 'SHIFT', x: SHX, y: SHY, w: SHW, h: SHH, rx: SHR, fill: '#949494', stroke: '#585858', tFill: '#ffffff', fs: 7, act: 'SHIFT' },
  // ALPHA — silver oval
  { id: 'ALPHA', label: 'ALPHA', x: ALX, y: ALY, w: ALW, h: ALH, rx: ALR, fill: '#949494', stroke: '#585858', tFill: '#ffffff', fs: 7, act: 'ALPHA' },
  // D-pad invisible zones
  { id: 'UP',    label: '', x: DX - 11, y: DY - DR,      w: 22, h: DR - 9, rx: 3, fill: 'transparent', stroke: 'none', tFill: 'transparent', fs: 0, act: 'CL' },
  { id: 'LEFT',  label: '', x: DX - DR, y: DY - 10,      w: DR - 9, h: 20, rx: 3, fill: 'transparent', stroke: 'none', tFill: 'transparent', fs: 0, act: 'CL' },
  { id: 'CTR',   label: '', x: DX - 9,  y: DY - 9,       w: 18, h: 18,     rx: 9, fill: 'transparent', stroke: 'none', tFill: 'transparent', fs: 0, act: 'NOOP' },
  { id: 'RIGHT', label: '', x: DX + 9,  y: DY - 10,      w: DR - 9, h: 20, rx: 3, fill: 'transparent', stroke: 'none', tFill: 'transparent', fs: 0, act: 'CR' },
  { id: 'DOWN',  label: '', x: DX - 11, y: DY + 9,       w: 22, h: DR - 9, rx: 3, fill: 'transparent', stroke: 'none', tFill: 'transparent', fs: 0, act: 'CR' },
  // MENU — silver round with SETUP label above
  { id: 'MENU', label: 'MENU', x: MNX, y: MNY, w: MNW, h: MNH, rx: MNR, fill: '#949494', stroke: '#585858', tFill: '#ffffff', fs: 6.5, act: 'MENU', sAct: 'SETUP', sLbl: 'SETUP' },
  // ON — silver round with OFF label above
  { id: 'ON', label: 'ON', x: ONX, y: ONY, w: ONW, h: ONH, rx: ONR, fill: '#949494', stroke: '#585858', tFill: '#ffffff', fs: 6.5, act: 'AC', sAct: 'OFF', sLbl: 'OFF' },
];

// FN row 0 — OPTN CALC on left side, ∫f□ x on right side (4 keys, split around D-pad)
const FN0_KEYS: K[] = [
  { id: 'OPTN', label: 'OPTN', x: RIM + 1, y: R0Y, w: LHALF_W, h: R0H, rx: 4, fill: DK, stroke: DKS, tFill: '#c8c8c8', fs: 7.5, act: 'NOOP', sAct: 'QR', sLbl: 'QR' },
  { id: 'CALC', label: 'CALC', x: RIM + 1 + LHALF_W + 4, y: R0Y, w: LHALF_W, h: R0H, rx: 4, fill: DK, stroke: DKS, tFill: '#c8c8c8', fs: 7.5, act: 'NOOP', sAct: 'SOLVE', sLbl: 'SOLVE' },
  { id: 'INTG', label: '∫f□', x: DX + 4, y: R0Y, w: RHALF_W, h: R0H, rx: 4, fill: DK, stroke: DKS, tFill: '#c8c8c8', fs: 7.5, act: 'NOOP', sAct: 'DDX', sLbl: 'd/dx' },
  { id: 'XVAR', label: 'x', x: DX + 4 + RHALF_W + 4, y: R0Y, w: RHALF_W, h: R0H, rx: 4, fill: DK, stroke: DKS, tFill: '#c8c8c8', fs: 9, act: 'NOOP', sAct: 'SUM', sLbl: 'Σ' },
];

// FN rows 1-3
const FN1_KEYS: K[] = [
  fk('FRAC', 'a b/c', 0, FY1, 'd/c', 'IFRAC', undefined, undefined, 7),
  fk('SQRT', '√',     1, FY1, '∛',   'CBRT'),
  fk('SQ',   'x²',    2, FY1, 'x³',  'CUBE'),
  fk('POW',  'xᵐ',   3, FY1),
  fk('LOG',  'log□',  4, FY1, '10ˣ', 'POW10', undefined, undefined, 7.5),
  fk('LN',   'ln',    5, FY1, 'eˣ',  'EXPX'),
];

const FN2_KEYS: K[] = [
  fk('NEG',  '(-)',   0, FY2, undefined, undefined, 'A', 'MEM_A'),
  fk('DMS',  "°'\"", 1, FY2, undefined, undefined, 'B', 'MEM_B', 7.5),
  fk('INV',  'x⁻¹',  2, FY2, 'x!',  'FACT',      'C', 'MEM_C'),
  fk('SIN',  'sin',   3, FY2, 'sin⁻¹', 'ASIN',    'D', 'MEM_D'),
  fk('COS',  'cos',   4, FY2, 'cos⁻¹', 'ACOS',    'E', 'MEM_E'),
  fk('TAN',  'tan',   5, FY2, 'tan⁻¹', 'ATAN',    'F', 'MEM_F'),
];

const FN3_KEYS: K[] = [
  fk('STO',   'STO',  0, FY3, 'RCL',   'RCL'),
  fk('ENG',   'ENG',  1, FY3, '←ENG',  'ENGB'),
  fk('LPAR',  '(',    2, FY3, 'Abs',   'ABS', undefined, undefined, 10),
  fk('RPAR',  ')',    3, FY3, undefined, undefined, undefined, undefined, 10),
  fk('STOD',  'S⇔D', 4, FY3, '▶DEG',  'TODEG', undefined, undefined, 7),
  fk('MPLUS', 'M+',   5, FY3, 'M−',    'MMINUS'),
];

const NUM_KEYS: K[] = [
  nk('7',   '7',   0, 0, WK, WKS, '#111', 18, '7',   { sLbl: 'CONST', sAct: 'NOOP', bold: true }),
  nk('8',   '8',   1, 0, WK, WKS, '#111', 18, '8',   { sLbl: 'CONV',  sAct: 'NOOP', bold: true }),
  nk('9',   '9',   2, 0, WK, WKS, '#111', 18, '9',   { sLbl: 'CLR',   sAct: 'NOOP', bold: true }),
  nk('DEL', 'DEL', 3, 0, BK, BKS, '#fff', 11, 'DEL', { sLbl: 'INS',   sAct: 'INS' }),
  nk('AC',  'AC',  4, 0, BK, BKS, '#fff', 11, 'AC',  { sLbl: 'OFF',   sAct: 'OFF' }),
  nk('4',   '4',   0, 1, WK, WKS, '#111', 18, '4',   { sLbl: 'nPr',   sAct: 'NPR', bold: true }),
  nk('5',   '5',   1, 1, WK, WKS, '#111', 18, '5',   { bold: true }),
  nk('6',   '6',   2, 1, WK, WKS, '#111', 18, '6',   { bold: true }),
  nk('MUL', '×',   3, 1, WK, WKS, '#111', 16, '×',   { sLbl: 'nCr',   sAct: 'NCR' }),
  nk('DIV', '÷',   4, 1, WK, WKS, '#111', 16, '÷',   { aLbl: 'y',     aAct: 'MEM_y' }),
  nk('1',   '1',   0, 2, WK, WKS, '#111', 18, '1',   { bold: true }),
  nk('2',   '2',   1, 2, WK, WKS, '#111', 18, '2',   { bold: true }),
  nk('3',   '3',   2, 2, WK, WKS, '#111', 18, '3',   { bold: true }),
  nk('ADD', '+',   3, 2, WK, WKS, '#111', 16, '+',   { sLbl: 'Pol',   sAct: 'POL' }),
  nk('SUB', '−',   4, 2, WK, WKS, '#111', 16, '−',   { sLbl: 'Rec',   sAct: 'REC' }),
  nk('0',   '0',   0, 3, WK, WKS, '#111', 18, '0',   { sLbl: 'Rnd',   sAct: 'RND', bold: true }),
  nk('DOT', '•',   1, 3, WK, WKS, '#111', 16, '.',   { sLbl: 'Ran#',  sAct: 'RAN' }),
  nk('EE',  '×10ˣ',2, 3, WK, WKS, '#111',  7, 'EE',  { sLbl: 'π',     sAct: 'PI' }),
  nk('ANS', 'Ans', 3, 3, WK, WKS, '#111',  9, 'ANS', { sLbl: '%',     sAct: 'PCT' }),
  nk('EQ',  '=',   4, 3, OK, OKS, '#fff', 20, '=',   { bold: true }),
];

const ALL_KEYS: K[] = [...NAV_KEYS, ...FN0_KEYS, ...FN1_KEYS, ...FN2_KEYS, ...FN3_KEYS, ...NUM_KEYS];

// ─── Component ───────────────────────────────────────────────────────────────

interface Props { onClose: () => void }

export function Fx991EX({ onClose }: Props) {
  const [cs, setCS] = useState<CS>({ ...INIT });
  const [pos, setPos] = useState({ x: 60, y: 20 });
  const dragRef = useRef({ on: false, ox: 0, oy: 0 });

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

  const press = useCallback((key: K) => {
    setCS(prev => {
      if (prev.menu === 'mode') {
        if (key.act === '1' || key.act === 'AC') return { ...prev, menu: 'none' };
        return prev;
      }
      if (prev.menu === 'setup') {
        if (key.act === '1') return { ...prev, angle: 'DEG', menu: 'none', shift: false };
        if (key.act === '2') return { ...prev, angle: 'RAD', menu: 'none', shift: false };
        if (key.act === '3') return { ...prev, angle: 'GRAD', menu: 'none', shift: false };
        if (key.act === 'AC') return { ...prev, menu: 'none' };
        return prev;
      }
      if (prev.menu === 'stoWait') {
        const v = key.aLbl ?? '';
        if (/^[A-FMxy]$/.test(v)) return { ...prev, menu: 'none', shift: false, alpha: false, mem: { ...prev.mem, [v]: prev.ans }, result: `${v}=${fmtNum(prev.ans)}` };
        if (key.act === 'AC') return { ...prev, menu: 'none' };
        return prev;
      }
      if (prev.menu === 'rclWait') {
        const v = key.aLbl ?? '';
        if (/^[A-FMxy]$/.test(v)) { const val = prev.mem[v] ?? 0; const ne = prev.expr + v; return { ...prev, menu: 'none', shift: false, alpha: false, expr: ne, cur: ne.length, result: fmtNum(val) }; }
        if (key.act === 'AC') return { ...prev, menu: 'none' };
        return prev;
      }

      const act = prev.shift ? (key.sAct ?? key.act) : prev.alpha ? (key.aAct ?? key.act) : key.act;
      const base: CS = { ...prev, shift: false, alpha: false, err: false };

      const app = (tok: string): CS => {
        let e = base.expr, c = base.cur;
        if (base.fresh) {
          if (/^[+−×÷^%]/.test(tok)) { e = 'Ans'; c = 3; }
          else if (!/^[)!]/.test(tok)) { e = ''; c = 0; }
        }
        const ne = e.slice(0, c) + tok + e.slice(c);
        return { ...base, expr: ne, cur: c + tok.length, result: '', fresh: false };
      };

      const MTOK = ['sinh⁻¹(', 'cosh⁻¹(', 'tanh⁻¹(', 'sin⁻¹(', 'cos⁻¹(', 'tan⁻¹(', 'sinh(', 'cosh(', 'tanh(', 'sin(', 'cos(', 'tan(', '×10^(', 'log(', 'ln(', 'eˣ(', '√(', '∛(', 'abs(', 'Pol(', 'Rec(', 'nCr(', 'nPr(', '10^(', '^(-1)', '^2', '^3', '−('];

      switch (act) {
        case 'SHIFT': return { ...prev, shift: !prev.shift, alpha: false };
        case 'ALPHA': return { ...prev, alpha: !prev.alpha, shift: false };
        case 'HYP':   return { ...base, hyp: !prev.hyp };
        case 'MENU':  return { ...base, menu: 'mode' };
        case 'SETUP': return { ...base, menu: 'setup' };
        case 'NOOP':  return base;
        case 'AC': case 'OFF': return { ...INIT, angle: prev.angle, mem: prev.mem };
        case 'CL': return { ...base, cur: Math.max(0, base.cur - 1) };
        case 'CR': return { ...base, cur: Math.min(base.expr.length, base.cur + 1) };
        case 'DEL': {
          if (base.fresh) return { ...base, expr: '', cur: 0, result: '', fresh: false };
          const e = base.expr, c = base.cur; if (c === 0) return base;
          for (const m of MTOK) if (e.slice(0, c).endsWith(m)) return { ...base, expr: e.slice(0, c - m.length) + e.slice(c), cur: c - m.length };
          return { ...base, expr: e.slice(0, c - 1) + e.slice(c), cur: c - 1 };
        }
        case 'TODEG': { const cyc: AngleUnit[] = ['DEG', 'RAD', 'GRAD']; return { ...base, angle: cyc[(cyc.indexOf(prev.angle) + 1) % 3] }; }
        case '0': case '1': case '2': case '3': case '4':
        case '5': case '6': case '7': case '8': case '9':
        case '.': return app(act);
        case '+': case '−': case '×': case '÷': return app(act);
        case 'PI': return app('π'); case 'ANS': return app('Ans'); case 'PCT': return app('%');
        case 'LPAR': return app('('); case 'RPAR': return app(')');
        case 'NEG': return app('−('); case 'DMS': return app('°');
        case 'SQRT': return app('√('); case 'CBRT': return app('∛(');
        case 'SQ': return app('^2'); case 'CUBE': return app('^3'); case 'POW': return app('^(');
        case 'INV': return app('^(-1)'); case 'FACT': return app('!');
        case 'LOG': return app('log('); case 'LN': return app('ln(');
        case 'EXPX': return app('eˣ('); case 'POW10': return app('10^(');
        case 'EE': return app('×10^('); case 'ABS': return app('abs(');
        case 'FRAC': return app('('); case 'IFRAC': return app('(');
        case 'SIN': return app(prev.hyp ? 'sinh(' : 'sin(');
        case 'COS': return app(prev.hyp ? 'cosh(' : 'cos(');
        case 'TAN': return app(prev.hyp ? 'tanh(' : 'tan(');
        case 'ASIN': return app(prev.hyp ? 'sinh⁻¹(' : 'sin⁻¹(');
        case 'ACOS': return app(prev.hyp ? 'cosh⁻¹(' : 'cos⁻¹(');
        case 'ATAN': return app(prev.hyp ? 'tanh⁻¹(' : 'tan⁻¹(');
        case 'NCR': return app('nCr('); case 'NPR': return app('nPr(');
        case 'POL': return app('Pol('); case 'REC': return app('Rec(');
        case 'STO': return { ...base, menu: 'stoWait', result: 'STO▸' };
        case 'RCL': return { ...base, menu: 'rclWait', result: 'RCL▸' };
        case 'MEM_A': case 'MEM_B': case 'MEM_C': case 'MEM_D':
        case 'MEM_E': case 'MEM_F': case 'MEM_M': case 'MEM_x': case 'MEM_y':
          return app(act.slice(4));
        case 'MPLUS': { const m = prev.mem.M + prev.ans; return { ...base, mem: { ...prev.mem, M: m }, result: `M=${fmtNum(m)}` }; }
        case 'MMINUS': { const m = prev.mem.M - prev.ans; return { ...base, mem: { ...prev.mem, M: m }, result: `M=${fmtNum(m)}` }; }
        case 'STOD': {
          const r = prev.ans;
          if (!isNaN(r) && isFinite(r)) {
            if (prev.result.includes('/')) return { ...base, result: fmtNum(r) };
            const frac = tryFrac(r); if (frac) return { ...base, result: frac };
          }
          return base;
        }
        case 'ENG': case 'ENGB': {
          if (!isNaN(prev.ans) && isFinite(prev.ans) && prev.ans !== 0) {
            const dir = act === 'ENG' ? 1 : -1;
            const abs = Math.abs(prev.ans);
            const exp = Math.floor(Math.log10(abs) / 3) * 3 + dir * 3;
            const mant = prev.ans / Math.pow(10, exp);
            return { ...base, result: `${parseFloat(mant.toPrecision(6))}×10^${exp}` };
          }
          return base;
        }
        case 'RAN': { const r = parseFloat(Math.random().toFixed(3)); return { ...base, result: fmtNum(r), ans: r, fresh: true }; }
        case 'RND': { const r = parseFloat(prev.ans.toPrecision(10)); return { ...base, result: fmtNum(r), ans: r, fresh: true }; }
        case '=': {
          const e = base.expr.trim() || '0';
          try {
            const val = evaluate(e, prev.angle, prev.ans, prev.mem);
            if (!isFinite(val) && !isNaN(val)) return { ...base, result: val > 0 ? '∞' : '-∞', ans: val, fresh: true };
            if (isNaN(val)) return { ...base, result: 'Math ERROR', err: true, fresh: true };
            return { ...base, result: fmtNum(val), ans: val, fresh: true };
          } catch { return { ...base, result: 'Syntax ERROR', err: true, fresh: true }; }
        }
        default: return base;
      }
    });
  }, []);

  const s = cs;
  const menuOverlay = s.menu !== 'none';

  const menuContent = () => {
    if (s.menu === 'mode') return (
      <div style={{ padding: '3px 5px', fontSize: 7, color: '#182a04' }}>
        <div style={{ fontWeight: 'bold', borderBottom: '1px solid #9ab888', paddingBottom: 2, marginBottom: 3, fontSize: 8 }}>MODE</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '2px 3px' }}>
          {['1:COMP', '2:CMPLX', '3:BASE-N', '4:MATRIX', '5:VECTOR', '6:STAT', '7:TABLE', '8:EQN'].map((m, i) => (
            <span key={i} style={{ fontSize: 5.5, background: m.startsWith('1') ? '#1a2a04' : 'transparent', color: m.startsWith('1') ? '#b8cca8' : '#182a04', padding: '0 1px', borderRadius: 1 }}>{m}</span>
          ))}
        </div>
        <div style={{ fontSize: 5.5, color: '#557755', marginTop: 3 }}>Press 1 for COMP · AC to close</div>
      </div>
    );
    if (s.menu === 'setup') return (
      <div style={{ padding: '3px 5px', fontSize: 7, color: '#182a04' }}>
        <div style={{ fontWeight: 'bold', borderBottom: '1px solid #9ab888', paddingBottom: 2, marginBottom: 3, fontSize: 8 }}>SETUP › Angle</div>
        {(['DEG', 'RAD', 'GRAD'] as AngleUnit[]).map((u, i) => (
          <div key={u} style={{ display: 'flex', gap: 5, alignItems: 'center', marginBottom: 2 }}>
            <span style={{ color: '#557755', fontSize: 7 }}>{i + 1}:</span>
            <span style={{ fontWeight: u === s.angle ? 'bold' : 'normal', fontSize: 8 }}>{u === 'DEG' ? 'Degree' : u === 'RAD' ? 'Radian' : 'Gradian'}</span>
            {u === s.angle && <span style={{ fontSize: 7, color: '#336633' }}>◀</span>}
          </div>
        ))}
      </div>
    );
    if (s.menu === 'stoWait') return (
      <div style={{ padding: '4px 6px', fontSize: 8, color: '#182a04' }}>
        <div style={{ fontWeight: 'bold', marginBottom: 3 }}>STO▸</div>
        <div style={{ fontSize: 7, color: '#557755' }}>Press ALPHA + variable</div>
        <div style={{ fontSize: 6, color: '#777', marginTop: 2 }}>(A B C D E F M x y)</div>
      </div>
    );
    if (s.menu === 'rclWait') return (
      <div style={{ padding: '4px 6px', fontSize: 8, color: '#182a04' }}>
        <div style={{ fontWeight: 'bold', marginBottom: 3 }}>RCL▸</div>
        <div style={{ fontSize: 7, color: '#557755' }}>Press ALPHA + variable</div>
        <div style={{ fontSize: 6, color: '#777', marginTop: 2 }}>(A B C D E F M x y)</div>
      </div>
    );
    return null;
  };

  return (
    <div style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999, userSelect: 'none', filter: 'drop-shadow(0 12px 40px rgba(0,0,0,0.9))' }}>
      <svg width={VW} height={VH} viewBox={`0 0 ${VW} ${VH}`} style={{ display: 'block' }} xmlns="http://www.w3.org/2000/svg">
        <defs>
          {/* White outer rim */}
          <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e8e8e0" />
            <stop offset="100%" stopColor="#c8c8c0" />
          </linearGradient>
          {/* D-pad outer ring */}
          <radialGradient id="dpad" cx="35%" cy="28%" r="72%">
            <stop offset="0%" stopColor="#d4d4cc" />
            <stop offset="55%" stopColor="#8c8c84" />
            <stop offset="100%" stopColor="#5c5c54" />
          </radialGradient>
          {/* D-pad centre */}
          <radialGradient id="dctr" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#b0b0a8" />
            <stop offset="100%" stopColor="#484840" />
          </radialGradient>
          {/* Silver buttons */}
          <radialGradient id="silver" cx="40%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#d8d8d0" />
            <stop offset="100%" stopColor="#787870" />
          </radialGradient>
          {/* White keys */}
          <linearGradient id="wkey" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f2f2ea" />
            <stop offset="100%" stopColor="#d4d4cc" />
          </linearGradient>
          {/* Dark keys */}
          <linearGradient id="dkey" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a2a2a" />
            <stop offset="100%" stopColor="#111111" />
          </linearGradient>
          {/* Blue keys */}
          <linearGradient id="bkey" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2060e8" />
            <stop offset="100%" stopColor="#0c2898" />
          </linearGradient>
          {/* Orange = */}
          <linearGradient id="okey" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e89000" />
            <stop offset="100%" stopColor="#a05800" />
          </linearGradient>
        </defs>

        {/* ── White outer rim ── */}
        <rect x={0} y={0} width={VW} height={VH} rx={16} ry={16} fill="url(#rim)" stroke="#b0b0a8" strokeWidth={1} />

        {/* ── Black body (inset) ── */}
        <rect x={RIM} y={RIM} width={VW - 2 * RIM} height={VH - 2 * RIM} rx={10} ry={10} fill="#161616" />

        {/* ── Texture: fine horizontal lines on black body ── */}
        {Array.from({ length: 40 }, (_, i) => (
          <line key={i} x1={RIM} y1={RIM + 10 + i * 14} x2={VW - RIM} y2={RIM + 10 + i * 14}
            stroke="#1f1f1f" strokeWidth={0.5} opacity={0.9} />
        ))}

        {/* ── Top branding ── */}
        {/* CASIO — bold white, top-left */}
        <text x={18} y={26} fill="#ffffff" fontSize={16} fontWeight="900"
          fontFamily="'Arial Black',Arial,sans-serif" letterSpacing="2">CASIO</text>
        {/* fx-991EX */}
        <text x={18} y={37} fill="#777770" fontSize={6.5}
          fontFamily="Arial,sans-serif" letterSpacing="1">fx-991EX</text>
        {/* CLASSWIZ — red dot-matrix style */}
        <text x={18} y={47} fill="#e0204e" fontSize={7.5} fontWeight="bold"
          fontFamily="'Courier New',Courier,monospace" letterSpacing="3">CLASSWIZ</text>

        {/* ── Solar panel (top-right) ── */}
        <rect x={148} y={11} width={VW - 162} height={32} rx={2} fill="#040404" stroke="#1c1c1c" strokeWidth={0.8} />
        {Array.from({ length: 8 }, (_, i) => (
          <rect key={i} x={150 + i * 13} y={13} width={11} height={28} rx={1}
            fill="#080808" stroke="#181818" strokeWidth={0.5} />
        ))}

        {/* Drag handle */}
        <rect x={0} y={0} width={VW} height={55} rx={16} fill="transparent"
          onMouseDown={onDragStart} style={{ cursor: 'grab' }} />

        {/* Close button */}
        <g onClick={onClose} style={{ cursor: 'pointer' }}>
          <circle cx={VW - 11} cy={11} r={8} fill="rgba(0,0,0,0.45)" />
          <text x={VW - 11} y={15} textAnchor="middle" fill="#bbb" fontSize={10} fontWeight="bold">×</text>
        </g>

        {/* ── Screen bezel ── */}
        <rect x={SX - 3} y={SY - 4} width={SW + 6} height={SH + 8} rx={5} fill="#141414" stroke="#080808" strokeWidth={1} />
        {/* LCD green */}
        <rect x={SX} y={SY} width={SW} height={SH} rx={3} fill="#b4c8a0" />
        {/* Scan lines */}
        {Array.from({ length: 16 }, (_, i) => (
          <line key={i} x1={SX} y1={SY + i * 4.7} x2={SX + SW} y2={SY + i * 4.7}
            stroke="#a4b890" strokeWidth={0.4} opacity={0.5} />
        ))}
        {/* Corner marks */}
        {[[SX + 3, SY + 3], [SX + SW - 3, SY + 3], [SX + 3, SY + SH - 3], [SX + SW - 3, SY + SH - 3]].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={1.1} fill="#84a870" />
        ))}

        {/* LCD content */}
        <foreignObject x={SX} y={SY} width={SW} height={SH}>
          <div style={{ width: '100%', height: '100%', padding: '3px 6px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', fontFamily: "'Courier New',Courier,monospace", overflow: 'hidden' }}>
            {menuOverlay ? (
              <div style={{ flex: 1 }}>{menuContent()}</div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 1 }}>
                  <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                    <span style={{ fontSize: 7, color: '#1a2a04', fontWeight: 'bold' }}>
                      {s.angle === 'DEG' ? 'D' : s.angle === 'RAD' ? 'R' : 'G'}
                    </span>
                    {s.shift && <span style={{ fontSize: 5.5, background: '#c08000', color: '#fff', padding: '0 2px', borderRadius: 1, fontWeight: 'bold', lineHeight: '8px' }}>S</span>}
                    {s.alpha && <span style={{ fontSize: 5.5, background: '#b01028', color: '#fff', padding: '0 2px', borderRadius: 1, fontWeight: 'bold', lineHeight: '8px' }}>A</span>}
                    {s.hyp && <span style={{ fontSize: 5.5, background: '#446688', color: '#fff', padding: '0 2px', borderRadius: 1, fontWeight: 'bold', lineHeight: '8px' }}>H</span>}
                    {s.mem.M !== 0 && <span style={{ fontSize: 5.5, background: '#334477', color: '#fff', padding: '0 2px', borderRadius: 1, fontWeight: 'bold', lineHeight: '8px' }}>M</span>}
                  </div>
                  <span style={{ fontSize: 6.5, color: '#1a2a04' }}>COMP</span>
                </div>
                <div style={{ flex: 1, fontSize: s.expr.length > 26 ? 7 : s.expr.length > 18 ? 9 : 10, color: '#182a04', textAlign: 'right', wordBreak: 'break-all', lineHeight: 1.2, paddingTop: 1 }}>
                  {s.fresh ? s.expr : (s.expr.slice(0, s.cur) + '▏' + s.expr.slice(s.cur))}
                </div>
                <div style={{ fontSize: s.result.length > 16 ? 10 : s.result.length > 12 ? 13 : s.result.length > 8 ? 16 : 20, fontWeight: 'bold', color: s.err ? '#880000' : '#0a1804', textAlign: 'right', lineHeight: 1.1, minHeight: 22, letterSpacing: -0.3 }}>
                  {s.result || (s.expr ? '' : '0')}
                </div>
              </>
            )}
          </div>
        </foreignObject>

        {/* ── Nav row labels above buttons ── */}
        {/* SETUP above MENU */}
        <text x={MNX + MNW / 2} y={NAV_Y - 3} textAnchor="middle"
          fill={s.shift ? '#ffaa00' : '#5a3800'} fontSize={5} fontWeight="bold" fontFamily="Arial,sans-serif">SETUP</text>
        {/* OFF above ON */}
        <text x={ONX + ONW / 2} y={NAV_Y - 3} textAnchor="middle"
          fill={s.shift ? '#ffaa00' : '#5a3800'} fontSize={5} fontWeight="bold" fontFamily="Arial,sans-serif">OFF</text>

        {/* ── D-pad (large silver rocker) ── */}
        {/* Outer disc */}
        <circle cx={DX} cy={DY} r={DR} fill="url(#dpad)" stroke="#383830" strokeWidth={0.8} />
        {/* Cross guides */}
        <rect x={DX - 4} y={DY - DR} width={8} height={DR * 2} fill="#484840" opacity={0.22} />
        <rect x={DX - DR} y={DY - 4} width={DR * 2} height={8} fill="#484840" opacity={0.22} />
        {/* Centre button */}
        <circle cx={DX} cy={DY} r={8} fill="url(#dctr)" stroke="#282820" strokeWidth={0.7} />
        {/* Arrow marks */}
        <text x={DX} y={DY - DR + 10} textAnchor="middle" fill="#e8e8e0" fontSize={7} fontWeight="bold" fontFamily="Arial">▲</text>
        <text x={DX} y={DY + DR - 1} textAnchor="middle" fill="#e8e8e0" fontSize={7} fontWeight="bold" fontFamily="Arial">▼</text>
        <text x={DX - DR + 4} y={DY + 2.5} textAnchor="middle" fill="#e8e8e0" fontSize={7} fontWeight="bold" fontFamily="Arial">◀</text>
        <text x={DX + DR - 4} y={DY + 2.5} textAnchor="middle" fill="#e8e8e0" fontSize={7} fontWeight="bold" fontFamily="Arial">▶</text>

        {/* ── Render all keys ── */}
        {ALL_KEYS.map(key => {
          if (['UP', 'DOWN', 'LEFT', 'RIGHT', 'CTR'].includes(key.id))
            return <rect key={key.id} x={key.x} y={key.y} width={key.w} height={key.h} fill="transparent" stroke="none" style={{ cursor: 'pointer' }} onMouseDown={e => { e.preventDefault(); press(key); }} />;

          const isSh = key.id === 'SHIFT' && s.shift;
          const isAl = key.id === 'ALPHA' && s.alpha;
          const active = isSh || isAl;

          let bodyFill: string;
          if (active) bodyFill = '#ffffff';
          else if (key.fill === WK) bodyFill = 'url(#wkey)';
          else if (key.fill === DK) bodyFill = 'url(#dkey)';
          else if (key.fill === BK) bodyFill = 'url(#bkey)';
          else if (key.fill === OK) bodyFill = 'url(#okey)';
          else if (key.fill === '#949494') bodyFill = 'url(#silver)';
          else bodyFill = key.fill;

          const labelColor = active ? (isSh ? '#c08000' : '#b01028') : key.tFill;
          const cx = key.x + key.w / 2, cy = key.y + key.h / 2;
          const fs = key.fs ?? 8;
          const sCol = s.shift ? '#ffaa00' : '#503000';
          const aCol = s.alpha ? '#ff40a0' : '#480e2e';

          return (
            <g key={key.id} onMouseDown={e => { e.preventDefault(); press(key); }} style={{ cursor: 'pointer' }}>
              {key.sLbl && key.id !== 'MENU' && key.id !== 'ON' && (
                <text x={cx} y={key.y - 2} textAnchor="middle" fill={sCol} fontSize={4.5} fontWeight="bold" fontFamily="Arial,sans-serif">{key.sLbl}</text>
              )}
              {key.aLbl && (
                <text x={key.x + key.w} y={key.y - 2} textAnchor="end" fill={aCol} fontSize={4.5} fontWeight="bold" fontFamily="Arial,sans-serif">{key.aLbl}</text>
              )}
              {/* Shadow */}
              <rect x={key.x} y={key.y + 2} width={key.w} height={key.h} rx={key.rx} ry={key.rx} fill={key.stroke} opacity={0.45} />
              {/* Body */}
              <rect x={key.x} y={key.y} width={key.w} height={key.h} rx={key.rx} ry={key.rx} fill={bodyFill} stroke={key.stroke} strokeWidth={0.7} />
              {/* Label */}
              <text x={cx} y={cy + fs * 0.37} textAnchor="middle" fill={labelColor} fontSize={fs}
                fontWeight={key.bold ? 'bold' : '600'} fontFamily="Arial,sans-serif">{key.label}</text>
            </g>
          );
        })}

        {/* ── Bottom text ── */}
        <text x={VW / 2} y={VH - 9} textAnchor="middle" fill="#2a2a22" fontSize={5.5} fontFamily="Arial,sans-serif" letterSpacing={1.2}>NATURAL-V.P.A.M.</text>

      </svg>
    </div>
  );
}
