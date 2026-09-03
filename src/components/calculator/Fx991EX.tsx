'use client';
/**
 * Casio fx-991EX ClassWiz — pixel-accurate SVG replica
 * Visual reference: official product photo + Casio fx-570_991EX User's Guide (EN)
 *
 * KEY LAYOUT (from manual + photo):
 *   Nav row  : SHIFT  ALPHA  [D-pad]  MENU/SETUP  ON
 *   FN row 0 : OPTN  CALC  ∫f□  x        (same row, right of D-pad area, 4-wide)
 *   FN row 1 : a b/c  √  x²  xᵐ  log□  ln
 *   FN row 2 : (-)  °'"  x⁻¹  sin  cos  tan
 *   FN row 3 : STO  ENG  (  )  S⟺D  M+
 *   Num row 0: 7  8  9  DEL  AC
 *   Num row 1: 4  5  6  ×  ÷
 *   Num row 2: 1  2  3  +  −
 *   Num row 3: 0  •  ×10ˣ  Ans  =
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';

// ─────────────────────────── Types ──────────────────────────────────────────

type AngleUnit = 'DEG' | 'RAD' | 'GRAD';

interface CS {
  expr:   string;
  cur:    number;
  result: string;
  shift:  boolean;
  alpha:  boolean;
  hyp:    boolean;
  angle:  AngleUnit;
  mem:    Record<string,number>;
  ans:    number;
  err:    boolean;
  fresh:  boolean;
  menu:   'none'|'mode'|'setup'|'stoWait'|'rclWait';
}

// ─────────────────────── Math helpers ───────────────────────────────────────

const PI = Math.PI;
const toRad = (x:number, u:AngleUnit) =>
  u==='DEG' ? x*PI/180 : u==='GRAD' ? x*PI/200 : x;
const fromRad = (x:number, u:AngleUnit) =>
  u==='DEG' ? x*180/PI : u==='GRAD' ? x*200/PI : x;

function fact(n:number): number {
  if(n<0||!Number.isInteger(n)) return NaN;
  if(n>170) return Infinity;
  let r=1; for(let i=2;i<=n;i++) r*=i; return r;
}
function nCr(n:number,r:number){ return fact(n)/(fact(r)*fact(n-r)); }
function nPr(n:number,r:number){ return fact(n)/fact(n-r); }
function gcd(a:number,b:number):number{ return b===0?a:gcd(b,a%b); }

function fmtNum(v:number): string {
  if(!isFinite(v)) return v>0?'∞':'-∞';
  if(isNaN(v)) return 'Math ERROR';
  const abs=Math.abs(v);
  if(abs===0) return '0';
  if(abs>=1e10||( abs<1e-9&&abs>0)){
    const e=Math.floor(Math.log10(abs));
    const m=v/Math.pow(10,e);
    return `${parseFloat(m.toPrecision(10))}×10^${e}`;
  }
  const s=parseFloat(v.toPrecision(10)).toString();
  return s;
}

function tryFrac(v:number): string|null {
  for(let d=2;d<=1000;d++){
    const n=Math.round(v*d);
    if(Math.abs(n/d-v)<1e-9){
      const g=gcd(Math.abs(n),d);
      const nn=n/g, dd=d/g;
      if(dd===1) return null;
      if(dd<=1000) return `${nn}/${dd}`;
    }
  }
  return null;
}

// ─────────────────────── Tokeniser ──────────────────────────────────────────

type Tok =
  | {t:'num';v:number}
  | {t:'op';v:string}
  | {t:'fn';v:string;args:number}
  | {t:'lp'}|{t:'rp'}|{t:'comma'}
  | {t:'end'};

const FN_LIST = [
  ['sinh⁻¹(',3],['cosh⁻¹(',3],['tanh⁻¹(',3],
  ['sin⁻¹(',3],['cos⁻¹(',3],['tan⁻¹(',3],
  ['sinh(',2],['cosh(',2],['tanh(',2],
  ['sin(',1],['cos(',1],['tan(',1],
  ['log(',1],['ln(',1],['eˣ(',1],['abs(',1],
  ['√(',1],['∛(',1],
  ['10^(',1],['×10^(',1],
  ['Pol(',2],['Rec(',2],['nCr(',2],['nPr(',2],
] as [string,number][];

function tokenise(src:string, ans:number, mem:Record<string,number>): Tok[] {
  const out:Tok[]=[];
  let i=0;
  const iMul=()=>{
    const last=out[out.length-1];
    if(last&&(last.t==='num'||last.t==='rp')) out.push({t:'op',v:'*'});
  };
  while(i<src.length){
    // whitespace
    if(src[i]===' '){i++;continue;}
    // Ans
    if(src.startsWith('Ans',i)){iMul();out.push({t:'num',v:ans});i+=3;continue;}
    // π
    if(src[i]==='π'){iMul();out.push({t:'num',v:PI});i++;continue;}
    // variables
    if(/^[A-FMxy]$/.test(src[i])){iMul();out.push({t:'num',v:mem[src[i]]??0});i++;continue;}
    // numbers
    if(/\d|\./.test(src[i])){
      iMul();
      let ns='';
      // handle ×10^ notation
      const sciM=src.slice(i).match(/^[\d.]+×10\^(\((-?\d+)\)|(-?\d+))/);
      if(sciM){
        const base=parseFloat(src.slice(i,i+sciM[0].indexOf('×')));
        const exp=parseInt(sciM[2]??sciM[3]);
        out.push({t:'num',v:base*Math.pow(10,exp)});
        i+=sciM[0].length;continue;
      }
      while(i<src.length&&(/\d|\./.test(src[i]))){ns+=src[i++];}
      out.push({t:'num',v:parseFloat(ns)});
      continue;
    }
    // functions
    let matched=false;
    for(const [fn,args] of FN_LIST){
      if(src.startsWith(fn,i)){
        iMul();
        out.push({t:'fn',v:fn.replace('(',''),args:args as number});
        out.push({t:'lp'});
        i+=fn.length; matched=true; break;
      }
    }
    if(matched) continue;
    // Parens / comma
    if(src[i]==='('){iMul();out.push({t:'lp'});i++;continue;}
    if(src[i]===')'){      out.push({t:'rp'});i++;continue;}
    if(src[i]===','){      out.push({t:'comma'});i++;continue;}
    // Operators
    const OPMAP:Record<string,string>={'+':'+','−':'-','×':'*','÷':'/','!':'!','%':'%','^':'^'};
    if(OPMAP[src[i]]){out.push({t:'op',v:OPMAP[src[i]]});i++;continue;}
    i++;
  }
  out.push({t:'end'});
  return out;
}

// ─────────────────────── Evaluator ──────────────────────────────────────────

function evaluate(expr:string, angle:AngleUnit, ans:number, mem:Record<string,number>): number {
  const toks=tokenise(expr,ans,mem);
  let pos=0;
  const peek=()=>toks[pos];
  const eat=()=>toks[pos++];

  function expr_(minP=0): number {
    let left=unary();
    while(true){
      const t=peek();
      if(t.t!=='op') break;
      const prec: Record<string,number>={'+':1,'-':1,'*':2,'/':2,'^':3,'!':4,'%':4};
      const p=prec[t.v]??-1;
      if(p<=minP) break;
      eat();
      if(t.v==='!'){left=fact(left);continue;}
      if(t.v==='%'){left=left/100;continue;}
      const right=t.v==='^'?expr_(p):expr_(p);
      if(t.v==='+') left+=right;
      else if(t.v==='-') left-=right;
      else if(t.v==='*') left*=right;
      else if(t.v==='/') left/=right;
      else if(t.v==='^') left=Math.pow(left,right);
    }
    return left;
  }

  function unary(): number {
    if(peek().t==='op'&&(peek() as {t:'op';v:string}).v==='-'){eat();return -primary();}
    return primary();
  }

  function primary(): number {
    const t=peek();
    if(t.t==='num'){eat();return t.v;}
    if(t.t==='lp'){
      eat(); const v=expr_(); eat(); return v;
    }
    if(t.t==='fn'){
      eat();eat(); // fn + lp
      const args:number[]=[];
      if(peek().t!=='rp'){
        args.push(expr_());
        while(peek().t==='comma'){eat();args.push(expr_());}
      }
      eat(); // rp
      const fn=t.v;
      const a=args[0]??0, b=args[1]??0;
      switch(fn){
        case 'sin':    return Math.sin(toRad(a,angle));
        case 'cos':    return Math.cos(toRad(a,angle));
        case 'tan':    return Math.tan(toRad(a,angle));
        case 'sin⁻¹': return fromRad(Math.asin(a),angle);
        case 'cos⁻¹': return fromRad(Math.acos(a),angle);
        case 'tan⁻¹': return fromRad(Math.atan(a),angle);
        case 'sinh':   return Math.sinh(a);
        case 'cosh':   return Math.cosh(a);
        case 'tanh':   return Math.tanh(a);
        case 'sinh⁻¹':return Math.asinh(a);
        case 'cosh⁻¹':return Math.acosh(a);
        case 'tanh⁻¹':return Math.atanh(a);
        case 'log':    return Math.log10(a);
        case 'ln':     return Math.log(a);
        case 'eˣ':     return Math.exp(a);
        case 'abs':    return Math.abs(a);
        case '√':     return Math.sqrt(a);
        case '∛':     return Math.cbrt(a);
        case '10^':    return Math.pow(10,a);
        case '×10^':   return a; // handled in tokeniser
        case 'Pol':    return Math.sqrt(a*a+b*b);
        case 'Rec':    return a*Math.cos(toRad(b,angle));
        case 'nCr':    return nCr(a,b);
        case 'nPr':    return nPr(a,b);
        default: return NaN;
      }
    }
    return NaN;
  }

  const result=expr_();
  return result;
}

// ─────────────────────── Initial state ──────────────────────────────────────

const INIT:CS = {
  expr:'',cur:0,result:'',shift:false,alpha:false,hyp:false,
  angle:'DEG',mem:{A:0,B:0,C:0,D:0,E:0,F:0,M:0,x:0,y:0},
  ans:0,err:false,fresh:false,menu:'none',
};

// ─────────────────────── Layout constants ───────────────────────────────────

// Overall body: matches the tall portrait aspect ratio from the photo
const VW = 300, VH = 620;

// Screen rect — taller green LCD
const SX = 18, SY = 62, SW = VW-36, SH = 80;

// Nav row — SHIFT, ALPHA, D-pad, MENU, ON
const NAV_Y = 164;
const NAV_H = 28;

// D-pad centre
const DX = 150, DY = NAV_Y + 16, DR = 26;

// FN rows — below nav row, 4 groups
const FH = 22, FG = 4;
const FY0 = NAV_Y + NAV_H + 8;  // OPTN/CALC/∫/x row
const FY = [
  FY0 + FH + FG,               // FN row 1 (fracs, √, x², ...)
  FY0 + 2*(FH+FG),             // FN row 2 ((-), °'", sin ...)
  FY0 + 3*(FH+FG),             // FN row 3 (STO, ENG, ...)
];

// Number rows
const NUM_Y0 = FY0 + 4*(FH+FG) + 2;
const NH = 36, NG = 5;
const NY_ = [
  NUM_Y0,
  NUM_Y0 + NH + NG,
  NUM_Y0 + 2*(NH+NG),
  NUM_Y0 + 3*(NH+NG),
];

// Key palette
const D_FILL  = '#1e1e1e';
const D_STR   = '#0a0a0a';
const W_FILL  = '#e8e8df';
const W_STR   = '#b0b0a0';
const BLU     = '#1848d0';
const BLU_STR = '#0c2890';
const ORG     = '#d07800';
const ORG_STR = '#904800';

// Column geometry for 5-wide rows (num keys)
const N_LEFT = 18;
const N_TOTAL = VW - 36;
const NW = (N_TOTAL - 4*NG) / 5;

// Column geometry for 6-wide fn rows
const F_LEFT = 18;
const F_TOTAL = VW - 36;
const F6W = (F_TOTAL - 5*FG) / 6;

// Column geometry for 4-wide FN row 0
const F4W = (F_TOTAL - 3*FG) / 4;

// ─────────────────────── Key interface ──────────────────────────────────────

interface K {
  id: string;
  label: string;
  x: number; y: number; w: number; h: number; rx?: number;
  fill: string; stroke: string; tFill: string; fs?: number;
  act: string; sAct?: string; aAct?: string;
  sLbl?: string; aLbl?: string;
  bold?: boolean;
}

// ─────────────────────── Key helpers ────────────────────────────────────────

function numKey(
  id: string, label: string, col: number, row: number,
  fill: string, stroke: string, tFill: string, fs: number, act: string,
  extra: Partial<K> = {}
): K {
  return {
    id, label,
    x: N_LEFT + col*(NW+NG),
    y: NY_[row],
    w: NW, h: NH, rx: 6,
    fill, stroke, tFill, fs, act, ...extra,
  };
}

function fn6Key(d: {
  id:string; label:string; act:string;
  sAct?:string; aAct?:string; sLbl?:string; aLbl?:string; fs?:number;
}, col: number, row: number): K {
  return {
    id: d.id, label: d.label,
    x: F_LEFT + col*(F6W+FG),
    y: FY[row],
    w: F6W, h: FH, rx: 4,
    fill: D_FILL, stroke: D_STR, tFill: '#cccccc', fs: d.fs ?? 8,
    act: d.act, sAct: d.sAct, aAct: d.aAct,
    sLbl: d.sLbl, aLbl: d.aLbl,
  };
}

// ─────────────────────── Key definitions ────────────────────────────────────

// Nav row: SHIFT (silver oval), ALPHA (silver oval), D-pad (invisible zones),
//          MENU (silver round), ON (silver round)
const NAV: K[] = [
  // SHIFT — silver oval, yellow text label
  { id:'SHIFT', label:'SHIFT',
    x:18, y:NAV_Y, w:42, h:NAV_H, rx:NAV_H/2,
    fill:'#9a9a9a', stroke:'#606060', tFill:'#fff', fs:7.5,
    act:'SHIFT' },
  // ALPHA — silver oval, red text label
  { id:'ALPHA', label:'ALPHA',
    x:64, y:NAV_Y, w:42, h:NAV_H, rx:NAV_H/2,
    fill:'#9a9a9a', stroke:'#606060', tFill:'#fff', fs:7.5,
    act:'ALPHA' },
  // D-pad invisible hit zones (drawn separately as SVG circles)
  { id:'UP',    label:'', x:DX-10, y:DY-DR,   w:20, h:DR-8,   rx:3, fill:'transparent', stroke:'none', tFill:'transparent', act:'CL' },
  { id:'LEFT',  label:'', x:DX-DR, y:DY-10,   w:DR-8, h:20,   rx:3, fill:'transparent', stroke:'none', tFill:'transparent', act:'CL' },
  { id:'CTR',   label:'', x:DX-8,  y:DY-8,    w:16, h:16,     rx:8, fill:'transparent', stroke:'none', tFill:'transparent', act:'NOOP' },
  { id:'RIGHT', label:'', x:DX+8,  y:DY-10,   w:DR-8, h:20,   rx:3, fill:'transparent', stroke:'none', tFill:'transparent', act:'CR' },
  { id:'DOWN',  label:'', x:DX-10, y:DY+8,    w:20, h:DR-8,   rx:3, fill:'transparent', stroke:'none', tFill:'transparent', act:'CR' },
  // MENU/SETUP — small silver round
  { id:'MENU', label:'MENU',
    x:216, y:NAV_Y, w:30, h:NAV_H, rx:NAV_H/2,
    fill:'#9a9a9a', stroke:'#606060', tFill:'#fff', fs:6.5,
    act:'MENU', sAct:'SETUP', sLbl:'SETUP' },
  // ON — small silver round
  { id:'ON', label:'ON',
    x:252, y:NAV_Y, w:30, h:NAV_H, rx:NAV_H/2,
    fill:'#9a9a9a', stroke:'#606060', tFill:'#fff', fs:6.5,
    act:'AC', sAct:'OFF', sLbl:'OFF' },
];

// FN row 0 — 4 dark keys: OPTN CALC ∫dx x
const FN0: K[] = [
  { id:'OPTN', label:'OPTN', x:F_LEFT+0*(F4W+FG), y:FY0, w:F4W, h:FH, rx:4,
    fill:D_FILL, stroke:D_STR, tFill:'#ccc', fs:8,
    act:'NOOP', sAct:'QR', sLbl:'QR' },
  { id:'CALC', label:'CALC', x:F_LEFT+1*(F4W+FG), y:FY0, w:F4W, h:FH, rx:4,
    fill:D_FILL, stroke:D_STR, tFill:'#ccc', fs:8,
    act:'NOOP', sAct:'SOLVE', sLbl:'SOLVE' },
  { id:'INTG', label:'∫f□',  x:F_LEFT+2*(F4W+FG), y:FY0, w:F4W, h:FH, rx:4,
    fill:D_FILL, stroke:D_STR, tFill:'#ccc', fs:8,
    act:'NOOP', sAct:'DDX', sLbl:'d/dx' },
  { id:'XVAR', label:'x',    x:F_LEFT+3*(F4W+FG), y:FY0, w:F4W, h:FH, rx:4,
    fill:D_FILL, stroke:D_STR, tFill:'#ccc', fs:10,
    act:'NOOP', sAct:'SUM', sLbl:'Σ' },
];

// FN row 1 — a b/c  √  x²  xᵐ  log□  ln
const FN1: K[] = [
  fn6Key({id:'FRAC',label:'a b/c',act:'FRAC',sAct:'IFRAC',sLbl:'d/c',fs:7},0,0),
  fn6Key({id:'SQRT',label:'√',    act:'SQRT',sAct:'CBRT', sLbl:'∛'       },1,0),
  fn6Key({id:'SQ',  label:'x²',   act:'SQ',  sAct:'CUBE', sLbl:'x³'      },2,0),
  fn6Key({id:'POW', label:'xᵐ',   act:'POW'                              },3,0),
  fn6Key({id:'LOG', label:'log□', act:'LOG', sAct:'POW10',sLbl:'10ˣ',fs:7.5},4,0),
  fn6Key({id:'LN',  label:'ln',   act:'LN',  sAct:'EXPX', sLbl:'eˣ'      },5,0),
];

// FN row 2 — (-)  °'"  x⁻¹  sin  cos  tan
const FN2: K[] = [
  fn6Key({id:'NEG', label:'(-)',  act:'NEG',               aLbl:'A',aAct:'MEM_A'},0,1),
  fn6Key({id:'DMS', label:"°'\"", act:'DMS',               aLbl:'B',aAct:'MEM_B',fs:7.5},1,1),
  fn6Key({id:'INV', label:'x⁻¹', act:'INV', sAct:'FACT',  sLbl:'x!',aLbl:'C',aAct:'MEM_C'},2,1),
  fn6Key({id:'SIN', label:'sin',  act:'SIN', sAct:'ASIN',  sLbl:'sin⁻¹',aLbl:'D',aAct:'MEM_D'},3,1),
  fn6Key({id:'COS', label:'cos',  act:'COS', sAct:'ACOS',  sLbl:'cos⁻¹',aLbl:'E',aAct:'MEM_E'},4,1),
  fn6Key({id:'TAN', label:'tan',  act:'TAN', sAct:'ATAN',  sLbl:'tan⁻¹',aLbl:'F',aAct:'MEM_F'},5,1),
];

// FN row 3 — STO  ENG  (  )  S⟺D  M+
const FN3: K[] = [
  fn6Key({id:'STO',  label:'STO',  act:'STO',  sAct:'RCL',   sLbl:'RCL'          },0,2),
  fn6Key({id:'ENG',  label:'ENG',  act:'ENG',  sAct:'ENGB',  sLbl:'←ENG'         },1,2),
  fn6Key({id:'LPAR', label:'(',    act:'LPAR', sAct:'ABS',   sLbl:'Abs', fs:10   },2,2),
  fn6Key({id:'RPAR', label:')',    act:'RPAR',                             fs:10   },3,2),
  fn6Key({id:'STOD', label:'S⇔D', act:'STOD', sAct:'TODEG', sLbl:'▶DEG',fs:7    },4,2),
  fn6Key({id:'MPLUS',label:'M+',   act:'MPLUS',sAct:'MMINUS',sLbl:'M−'           },5,2),
];

// Number rows
const NUM: K[] = [
  // Row 0: 7  8  9  DEL(blue)  AC(blue)
  numKey('7',  '7',  0, 0, W_FILL, W_STR, '#111', 18, '7',   {sLbl:'CONST', sAct:'NOOP', bold:true}),
  numKey('8',  '8',  1, 0, W_FILL, W_STR, '#111', 18, '8',   {sLbl:'CONV',  sAct:'NOOP', bold:true}),
  numKey('9',  '9',  2, 0, W_FILL, W_STR, '#111', 18, '9',   {sLbl:'CLR',   sAct:'NOOP', bold:true}),
  numKey('DEL','DEL',3, 0, BLU, BLU_STR, '#fff', 11, 'DEL',  {sLbl:'INS',   sAct:'INS'}),
  numKey('AC', 'AC', 4, 0, BLU, BLU_STR, '#fff', 11, 'AC',   {sLbl:'OFF',   sAct:'OFF'}),
  // Row 1: 4  5  6  ×  ÷  (all white)
  numKey('4',  '4',  0, 1, W_FILL, W_STR, '#111', 18, '4',   {sLbl:'nPr',   sAct:'NPR', bold:true}),
  numKey('5',  '5',  1, 1, W_FILL, W_STR, '#111', 18, '5',   {bold:true}),
  numKey('6',  '6',  2, 1, W_FILL, W_STR, '#111', 18, '6',   {bold:true}),
  numKey('MUL','×',  3, 1, W_FILL, W_STR, '#111', 16, '×',   {sLbl:'nCr',   sAct:'NCR'}),
  numKey('DIV','÷',  4, 1, W_FILL, W_STR, '#111', 16, '÷',   {aLbl:'y',     aAct:'MEM_y'}),
  // Row 2: 1  2  3  +  −  (all white)
  numKey('1',  '1',  0, 2, W_FILL, W_STR, '#111', 18, '1',   {bold:true}),
  numKey('2',  '2',  1, 2, W_FILL, W_STR, '#111', 18, '2',   {bold:true}),
  numKey('3',  '3',  2, 2, W_FILL, W_STR, '#111', 18, '3',   {bold:true}),
  numKey('ADD','+',  3, 2, W_FILL, W_STR, '#111', 15, '+',   {sLbl:'Pol',   sAct:'POL'}),
  numKey('SUB','−',  4, 2, W_FILL, W_STR, '#111', 15, '−',   {sLbl:'Rec',   sAct:'REC'}),
  // Row 3: 0  •  ×10ˣ  Ans  =
  numKey('0',    '0',    0, 3, W_FILL, W_STR, '#111', 18, '0',  {sLbl:'Rnd',  sAct:'RND', bold:true}),
  numKey('DOT',  '•',    1, 3, W_FILL, W_STR, '#111', 16, '.',  {sLbl:'Ran#', sAct:'RAN'}),
  numKey('EE',   '×10ˣ', 2, 3, W_FILL, W_STR, '#111',  7, 'EE', {sLbl:'π',    sAct:'PI'}),
  numKey('ANS',  'Ans',  3, 3, W_FILL, W_STR, '#111',  9, 'ANS',{sLbl:'%',    sAct:'PCT'}),
  numKey('EQ',   '=',    4, 3, ORG, ORG_STR, '#fff', 20, '=',   {bold:true}),
];

const ALL_KEYS: K[] = [...NAV, ...FN0, ...FN1, ...FN2, ...FN3, ...NUM];

// ──────────────────────── Component ─────────────────────────────────────────

interface Props { onClose: ()=>void }

export function Fx991EX({ onClose }: Props) {
  const [cs, setCS] = useState<CS>({...INIT});
  const [pos, setPos] = useState({ x: 60, y: 20 });
  const dragRef = useRef({ on: false, ox: 0, oy: 0 });

  // Drag
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

  // Key handler
  const press = useCallback((key: K) => {
    setCS(prev => {
      // ── Menu intercept ────────────────────────────────────────────────────
      if (prev.menu === 'mode') {
        if (key.act === '1' || key.act === 'AC') return { ...prev, menu: 'none' };
        return prev;
      }
      if (prev.menu === 'setup') {
        if (key.act === '1') return { ...prev, angle: 'DEG',  menu: 'none', shift: false };
        if (key.act === '2') return { ...prev, angle: 'RAD',  menu: 'none', shift: false };
        if (key.act === '3') return { ...prev, angle: 'GRAD', menu: 'none', shift: false };
        if (key.act === 'AC') return { ...prev, menu: 'none' };
        return prev;
      }
      if (prev.menu === 'stoWait') {
        const v = key.aLbl ?? '';
        if (/^[A-FMxy]$/.test(v)) {
          return { ...prev, menu: 'none', shift: false, alpha: false,
            mem: { ...prev.mem, [v]: prev.ans },
            result: `${v}=${fmtNum(prev.ans)}` };
        }
        if (key.act === 'AC') return { ...prev, menu: 'none' };
        return prev;
      }
      if (prev.menu === 'rclWait') {
        const v = key.aLbl ?? '';
        if (/^[A-FMxy]$/.test(v)) {
          const val = prev.mem[v] ?? 0;
          const ne = prev.expr + v;
          return { ...prev, menu: 'none', shift: false, alpha: false,
            expr: ne, cur: ne.length, result: fmtNum(val) };
        }
        if (key.act === 'AC') return { ...prev, menu: 'none' };
        return prev;
      }

      // ── Resolve action ────────────────────────────────────────────────────
      const act = prev.shift ? (key.sAct ?? key.act) : prev.alpha ? (key.aAct ?? key.act) : key.act;
      const base: CS = { ...prev, shift: false, alpha: false, err: false };

      // append token at cursor
      const app = (tok: string): CS => {
        let e = base.expr, c = base.cur;
        if (base.fresh) {
          if (/^[+−×÷^%]/.test(tok)) { e = 'Ans'; c = 3; }
          else if (!/^[)!]/.test(tok)) { e = ''; c = 0; }
        }
        const ne = e.slice(0, c) + tok + e.slice(c);
        return { ...base, expr: ne, cur: c + tok.length, result: '', fresh: false };
      };

      const MTOK = [
        'sinh⁻¹(','cosh⁻¹(','tanh⁻¹(',
        'sin⁻¹(','cos⁻¹(','tan⁻¹(',
        'sinh(','cosh(','tanh(',
        'sin(','cos(','tan(',
        '×10^(','log(','ln(','eˣ(','√(','∛(','abs(',
        'Pol(','Rec(','nCr(','nPr(','10^(',
        '^(-1)','^2','^3','−(',
      ];

      switch (act) {
        case 'SHIFT': return { ...prev, shift: !prev.shift, alpha: false };
        case 'ALPHA': return { ...prev, alpha: !prev.alpha, shift: false };
        case 'HYP':   return { ...base, hyp: !prev.hyp };
        case 'MENU':  return { ...base, menu: 'mode' };
        case 'SETUP': return { ...base, menu: 'setup' };
        case 'NOOP':  return base;
        case 'AC': case 'OFF':
          return { ...INIT, angle: prev.angle, mem: prev.mem };
        case 'CL': return { ...base, cur: Math.max(0, base.cur - 1) };
        case 'CR': return { ...base, cur: Math.min(base.expr.length, base.cur + 1) };

        case 'DEL': {
          if (base.fresh) return { ...base, expr: '', cur: 0, result: '', fresh: false };
          const e = base.expr, c = base.cur;
          if (c === 0) return base;
          for (const m of MTOK)
            if (e.slice(0, c).endsWith(m))
              return { ...base, expr: e.slice(0, c - m.length) + e.slice(c), cur: c - m.length };
          return { ...base, expr: e.slice(0, c - 1) + e.slice(c), cur: c - 1 };
        }

        case 'TODEG': {
          const cyc: AngleUnit[] = ['DEG','RAD','GRAD'];
          return { ...base, angle: cyc[(cyc.indexOf(prev.angle) + 1) % 3] };
        }

        case '0':case '1':case '2':case '3':case '4':
        case '5':case '6':case '7':case '8':case '9':
        case '.': return app(act);
        case '+':case '−':case '×':case '÷': return app(act);

        case 'PI':   return app('π');
        case 'ANS':  return app('Ans');
        case 'PCT':  return app('%');
        case 'LPAR': return app('(');
        case 'RPAR': return app(')');
        case 'NEG':  return app('−(');
        case 'DMS':  return app('°');

        case 'SQRT': return app('√(');
        case 'CBRT': return app('∛(');
        case 'SQ':   return app('^2');
        case 'CUBE': return app('^3');
        case 'POW':  return app('^(');
        case 'INV':  return app('^(-1)');
        case 'FACT': return app('!');
        case 'LOG':  return app('log(');
        case 'LN':   return app('ln(');
        case 'EXPX': return app('eˣ(');
        case 'POW10':return app('10^(');
        case 'EE':   return app('×10^(');
        case 'ABS':  return app('abs(');
        case 'FRAC': return app('(');
        case 'IFRAC':return app('(');

        case 'SIN':  return app(prev.hyp ? 'sinh('   : 'sin(');
        case 'COS':  return app(prev.hyp ? 'cosh('   : 'cos(');
        case 'TAN':  return app(prev.hyp ? 'tanh('   : 'tan(');
        case 'ASIN': return app(prev.hyp ? 'sinh⁻¹(' : 'sin⁻¹(');
        case 'ACOS': return app(prev.hyp ? 'cosh⁻¹(' : 'cos⁻¹(');
        case 'ATAN': return app(prev.hyp ? 'tanh⁻¹(' : 'tan⁻¹(');

        case 'NCR':  return app('nCr(');
        case 'NPR':  return app('nPr(');
        case 'POL':  return app('Pol(');
        case 'REC':  return app('Rec(');

        case 'STO':  return { ...base, menu: 'stoWait', result: 'STO▸' };
        case 'RCL':  return { ...base, menu: 'rclWait', result: 'RCL▸' };

        case 'MEM_A':case 'MEM_B':case 'MEM_C':
        case 'MEM_D':case 'MEM_E':case 'MEM_F':
        case 'MEM_M':case 'MEM_x':case 'MEM_y':
          return app(act.slice(4));

        case 'MPLUS': {
          const m = prev.mem.M + prev.ans;
          return { ...base, mem: { ...prev.mem, M: m }, result: `M=${fmtNum(m)}` };
        }
        case 'MMINUS': {
          const m = prev.mem.M - prev.ans;
          return { ...base, mem: { ...prev.mem, M: m }, result: `M=${fmtNum(m)}` };
        }

        case 'STOD': {
          const r = prev.ans;
          if (!isNaN(r) && isFinite(r)) {
            if (prev.result.includes('/')) return { ...base, result: fmtNum(r) };
            const frac = tryFrac(r);
            if (frac) return { ...base, result: frac };
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

        case 'RAN': {
          const r = parseFloat(Math.random().toFixed(3));
          return { ...base, result: fmtNum(r), ans: r, fresh: true };
        }
        case 'RND': {
          const r = parseFloat(prev.ans.toPrecision(10));
          return { ...base, result: fmtNum(r), ans: r, fresh: true };
        }

        case '=': {
          const e = base.expr.trim() || '0';
          try {
            const val = evaluate(e, prev.angle, prev.ans, prev.mem);
            if (!isFinite(val) && !isNaN(val))
              return { ...base, result: val > 0 ? '∞' : '-∞', ans: val, fresh: true };
            if (isNaN(val))
              return { ...base, result: 'Math ERROR', err: true, fresh: true };
            return { ...base, result: fmtNum(val), ans: val, fresh: true };
          } catch {
            return { ...base, result: 'Syntax ERROR', err: true, fresh: true };
          }
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '2px 4px' }}>
          {['1:COMP','2:CMPLX','3:BASE-N','4:MATRIX','5:VECTOR','6:STAT','7:TABLE','8:EQN'].map((m, i) => (
            <span key={i} style={{ fontSize: 6, background: m.startsWith('1') ? '#1a2a04' : 'transparent',
              color: m.startsWith('1') ? '#b8cca8' : '#182a04', padding: '0 1px', borderRadius: 1 }}>{m}</span>
          ))}
        </div>
        <div style={{ fontSize: 6, color: '#557755', marginTop: 3 }}>Press 1 for COMP · AC to close</div>
      </div>
    );
    if (s.menu === 'setup') return (
      <div style={{ padding: '3px 5px', fontSize: 7, color: '#182a04' }}>
        <div style={{ fontWeight: 'bold', borderBottom: '1px solid #9ab888', paddingBottom: 2, marginBottom: 3, fontSize: 8 }}>SETUP › Angle</div>
        {(['DEG','RAD','GRAD'] as AngleUnit[]).map((u, i) => (
          <div key={u} style={{ display: 'flex', gap: 5, alignItems: 'center', marginBottom: 1 }}>
            <span style={{ color: '#557755', fontSize: 7 }}>{i+1}:</span>
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

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999,
      userSelect: 'none',
      filter: 'drop-shadow(0 16px 48px rgba(0,0,0,0.85))',
    }}>
      <svg width={VW} height={VH} viewBox={`0 0 ${VW} ${VH}`}
        style={{ display: 'block', cursor: 'default' }} xmlns="http://www.w3.org/2000/svg">

        <defs>
          {/* Outer rim gradient — light grey/white edges */}
          <linearGradient id="fxRim" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="#e0e0d8"/>
            <stop offset="50%"  stopColor="#d0d0c8"/>
            <stop offset="100%" stopColor="#b8b8b0"/>
          </linearGradient>
          {/* D-pad outer ring */}
          <radialGradient id="fxDpad" cx="35%" cy="28%" r="75%">
            <stop offset="0%"   stopColor="#d8d8d0"/>
            <stop offset="60%"  stopColor="#909088"/>
            <stop offset="100%" stopColor="#606058"/>
          </radialGradient>
          {/* D-pad centre button */}
          <radialGradient id="fxDctr" cx="40%" cy="35%" r="65%">
            <stop offset="0%"   stopColor="#b0b0a8"/>
            <stop offset="100%" stopColor="#505048"/>
          </radialGradient>
          {/* Silver nav buttons */}
          <radialGradient id="fxSilver" cx="40%" cy="30%" r="70%">
            <stop offset="0%"   stopColor="#d8d8d0"/>
            <stop offset="100%" stopColor="#808078"/>
          </radialGradient>
          {/* White key gradient */}
          <linearGradient id="fxWkey" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#f4f4ec"/>
            <stop offset="100%" stopColor="#d8d8d0"/>
          </linearGradient>
          {/* Dark key gradient */}
          <linearGradient id="fxDkey" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#2c2c2c"/>
            <stop offset="100%" stopColor="#141414"/>
          </linearGradient>
          {/* Blue key gradient */}
          <linearGradient id="fxBkey" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#2858e0"/>
            <stop offset="100%" stopColor="#0c2090"/>
          </linearGradient>
          {/* Orange = key */}
          <linearGradient id="fxOkey" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#e89000"/>
            <stop offset="100%" stopColor="#a85800"/>
          </linearGradient>
        </defs>

        {/* ── Body outer rim (light grey border) ───────────────────────────── */}
        <rect x={0} y={0} width={VW} height={VH} rx={20} ry={20}
          fill="url(#fxRim)" stroke="#c0c0b8" strokeWidth={1.5}/>

        {/* ── Inner black face ─────────────────────────────────────────────── */}
        <rect x={8} y={8} width={VW-16} height={VH-16} rx={14} ry={14}
          fill="#161616"/>

        {/* ── Texture: subtle crosshatch on body ───────────────────────────── */}
        {Array.from({ length: 36 }, (_, i) => (
          <line key={`h${i}`} x1={8} y1={22+i*17} x2={VW-8} y2={22+i*17}
            stroke="#202020" strokeWidth={0.6} opacity={0.7}/>
        ))}

        {/* ── Top branding ─────────────────────────────────────────────────── */}
        {/* CASIO wordmark */}
        <text x={18} y={28} fill="#ffffff" fontSize={17} fontWeight="900"
          fontFamily="'Arial Black',Arial,sans-serif" letterSpacing="2.5">CASIO</text>
        {/* fx-991EX */}
        <text x={18} y={40} fill="#888880" fontSize={7}
          fontFamily="Arial,sans-serif" letterSpacing="1.2">fx-991EX</text>
        {/* CLASSWIZ */}
        <text x={18} y={50} fill="#e0204e" fontSize={7.5} fontWeight="bold"
          fontFamily="'Courier New',Courier,monospace" letterSpacing="3">CLASSWIZ</text>

        {/* ── Solar panel (top right) ───────────────────────────────────────── */}
        <rect x={160} y={12} width={VW-178} height={34} rx={3}
          fill="#050505" stroke="#222220" strokeWidth={0.8}/>
        {Array.from({ length: 9 }, (_, i) => (
          <rect key={`sol${i}`} x={162+i*12.4} y={14} width={10.5} height={30} rx={1.5}
            fill="#0a0a0a" stroke="#1c1c1c" strokeWidth={0.5}/>
        ))}

        {/* Drag handle */}
        <rect x={0} y={0} width={VW} height={58} rx={20}
          fill="transparent" onMouseDown={onDragStart} style={{ cursor: 'grab' }}/>

        {/* Close × */}
        <g onClick={onClose} style={{ cursor: 'pointer' }}>
          <circle cx={VW-12} cy={12} r={9} fill="rgba(0,0,0,0.5)"/>
          <text x={VW-12} y={16.5} textAnchor="middle" fill="#aaa" fontSize={11} fontWeight="bold">×</text>
        </g>

        {/* ── Screen bezel ─────────────────────────────────────────────────── */}
        <rect x={SX-4} y={SY-5} width={SW+8} height={SH+10} rx={6}
          fill="#1a1a1a" stroke="#0a0a0a" strokeWidth={1}/>
        {/* LCD green screen */}
        <rect x={SX} y={SY} width={SW} height={SH} rx={3}
          fill="#b8cca4"/>
        {/* Subtle scan lines */}
        {Array.from({ length: 18 }, (_, i) => (
          <line key={`sl${i}`} x1={SX} y1={SY+i*4.7} x2={SX+SW} y2={SY+i*4.7}
            stroke="#a8bc94" strokeWidth={0.4} opacity={0.5}/>
        ))}
        {/* Corner marks */}
        {[[SX+3,SY+3],[SX+SW-3,SY+3],[SX+3,SY+SH-3],[SX+SW-3,SY+SH-3]].map(([cx,cy],i)=>(
          <circle key={`cm${i}`} cx={cx} cy={cy} r={1.2} fill="#88a870"/>
        ))}

        {/* LCD content */}
        <foreignObject x={SX} y={SY} width={SW} height={SH}>
          <div style={{
            width: '100%', height: '100%',
            background: 'transparent', borderRadius: 3,
            padding: '4px 7px', boxSizing: 'border-box',
            display: 'flex', flexDirection: 'column',
            fontFamily: "'Courier New',Courier,monospace",
            overflow: 'hidden',
          }}>
            {menuOverlay ? (
              <div style={{ flex: 1 }}>{menuContent()}</div>
            ) : (
              <>
                {/* Status row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 1 }}>
                  <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                    <span style={{ fontSize: 7, color: '#1a2a04', fontWeight: 'bold' }}>
                      {s.angle === 'DEG' ? 'D' : s.angle === 'RAD' ? 'R' : 'G'}
                    </span>
                    {s.shift && <span style={{ fontSize: 5.5, background: '#d08000', color: '#fff', padding: '0 2px', borderRadius: 1, fontWeight: 'bold', lineHeight: '8px' }}>S</span>}
                    {s.alpha && <span style={{ fontSize: 5.5, background: '#c01030', color: '#fff', padding: '0 2px', borderRadius: 1, fontWeight: 'bold', lineHeight: '8px' }}>A</span>}
                    {s.hyp   && <span style={{ fontSize: 5.5, background: '#446688', color: '#fff', padding: '0 2px', borderRadius: 1, fontWeight: 'bold', lineHeight: '8px' }}>H</span>}
                    {s.mem.M !== 0 && <span style={{ fontSize: 5.5, background: '#334477', color: '#fff', padding: '0 2px', borderRadius: 1, fontWeight: 'bold', lineHeight: '8px' }}>M</span>}
                  </div>
                  <span style={{ fontSize: 6.5, color: '#1a2a04', letterSpacing: 0.5 }}>COMP</span>
                </div>
                {/* Expression line */}
                <div style={{
                  flex: 1, fontSize: s.expr.length > 28 ? 7 : s.expr.length > 18 ? 9 : 10,
                  color: '#182a04', textAlign: 'right',
                  wordBreak: 'break-all', lineHeight: 1.25, paddingTop: 1,
                }}>
                  {s.fresh ? s.expr : (s.expr.slice(0, s.cur) + '▏' + s.expr.slice(s.cur))}
                </div>
                {/* Result line */}
                <div style={{
                  fontSize: s.result.length > 16 ? 10 : s.result.length > 12 ? 13 : s.result.length > 8 ? 16 : 20,
                  fontWeight: 'bold',
                  color: s.err ? '#880000' : '#0a1804',
                  textAlign: 'right', lineHeight: 1.1, minHeight: 24,
                  letterSpacing: -0.5,
                }}>
                  {s.result || (s.expr ? '' : '0')}
                </div>
              </>
            )}
          </div>
        </foreignObject>

        {/* ── D-pad (large silver circular rocker) ─────────────────────────── */}
        {/* Outer ring */}
        <circle cx={DX} cy={DY} r={DR} fill="url(#fxDpad)" stroke="#404038" strokeWidth={1}/>
        {/* Cross dividers */}
        <rect x={DX-4} y={DY-DR} width={8} height={DR*2} fill="#505048" opacity={0.25}/>
        <rect x={DX-DR} y={DY-4} width={DR*2} height={8} fill="#505048" opacity={0.25}/>
        {/* Centre button */}
        <circle cx={DX} cy={DY} r={9} fill="url(#fxDctr)" stroke="#303028" strokeWidth={0.8}/>
        {/* Arrow labels */}
        <text x={DX}      y={DY-DR+10} textAnchor="middle" fill="#e8e8e0" fontSize={7} fontWeight="bold" fontFamily="Arial">▲</text>
        <text x={DX}      y={DY+DR-1}  textAnchor="middle" fill="#e8e8e0" fontSize={7} fontWeight="bold" fontFamily="Arial">▼</text>
        <text x={DX-DR+4} y={DY+2.5}   textAnchor="middle" fill="#e8e8e0" fontSize={7} fontWeight="bold" fontFamily="Arial">◀</text>
        <text x={DX+DR-4} y={DY+2.5}   textAnchor="middle" fill="#e8e8e0" fontSize={7} fontWeight="bold" fontFamily="Arial">▶</text>

        {/* ── Keys ─────────────────────────────────────────────────────────── */}
        {ALL_KEYS.map(key => {
          // D-pad invisible zones
          if (['UP','DOWN','LEFT','RIGHT','CTR'].includes(key.id))
            return (
              <rect key={key.id} x={key.x} y={key.y} width={key.w} height={key.h}
                fill="transparent" stroke="none" style={{ cursor: 'pointer' }}
                onMouseDown={e => { e.preventDefault(); press(key); }}/>
            );

          const isSh = key.id === 'SHIFT' && s.shift;
          const isAl = key.id === 'ALPHA' && s.alpha;
          const isHy = key.id === 'HYP'   && s.hyp;
          const active = isSh || isAl || isHy;

          // Pick fill gradient
          let bodyFill: string;
          if (active) {
            bodyFill = '#ffffff';
          } else if (key.fill === W_FILL) {
            bodyFill = 'url(#fxWkey)';
          } else if (key.fill === D_FILL) {
            bodyFill = 'url(#fxDkey)';
          } else if (key.fill === BLU) {
            bodyFill = 'url(#fxBkey)';
          } else if (key.fill === ORG) {
            bodyFill = 'url(#fxOkey)';
          } else if (key.fill === '#9a9a9a') {
            bodyFill = 'url(#fxSilver)';
          } else {
            bodyFill = key.fill;
          }

          const labelColor = active
            ? (isSh ? '#d08000' : isAl ? '#c01030' : '#4488bb')
            : key.tFill;

          const rx = key.rx ?? 5;
          const cx = key.x + key.w / 2;
          const cy = key.y + key.h / 2;
          const fs = key.fs ?? 8.5;

          // Secondary label colours (dim unless modifier is on)
          const sCol = s.shift ? '#ffaa00' : '#5a3800';
          const aCol = s.alpha ? '#ff50a0' : '#4a0e30';

          return (
            <g key={key.id} onMouseDown={e => { e.preventDefault(); press(key); }} style={{ cursor: 'pointer' }}>
              {/* SHIFT label above key */}
              {key.sLbl && (
                <text x={cx} y={key.y - 2} textAnchor="middle"
                  fill={sCol} fontSize={4.8} fontWeight="bold" fontFamily="Arial,sans-serif">
                  {key.sLbl}
                </text>
              )}
              {/* ALPHA label above key (right-aligned) */}
              {key.aLbl && (
                <text x={key.x + key.w} y={key.y - 2} textAnchor="end"
                  fill={aCol} fontSize={4.8} fontWeight="bold" fontFamily="Arial,sans-serif">
                  {key.aLbl}
                </text>
              )}
              {/* Key shadow */}
              <rect x={key.x} y={key.y + 2} width={key.w} height={key.h} rx={rx} ry={rx}
                fill={key.stroke} opacity={0.5}/>
              {/* Key body */}
              <rect x={key.x} y={key.y} width={key.w} height={key.h} rx={rx} ry={rx}
                fill={bodyFill} stroke={key.stroke} strokeWidth={0.8}/>
              {/* Key label */}
              <text x={cx} y={cy + fs * 0.37} textAnchor="middle"
                fill={labelColor} fontSize={fs}
                fontWeight={key.bold || key.id === 'EQ' ? 'bold' : '600'}
                fontFamily="Arial,sans-serif">
                {key.label}
              </text>
            </g>
          );
        })}

        {/* ── Bottom branding ───────────────────────────────────────────────── */}
        <text x={VW / 2} y={VH - 8} textAnchor="middle"
          fill="#303028" fontSize={6} fontFamily="Arial,sans-serif" letterSpacing={1.2}>
          NATURAL-V.P.A.M.
        </text>

      </svg>
    </div>
  );
}
