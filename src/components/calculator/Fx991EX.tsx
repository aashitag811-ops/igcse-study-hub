'use client';
/**
 * Casio fx-991EX ClassWiz — CSS-drawn virtual calculator.
 * Styled to match the real device photo closely.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type AngleUnit = 'DEG' | 'RAD' | 'GRAD';
type Menu = 'none' | 'mode' | 'setup' | 'stoWait' | 'rclWait';

interface CS {
  expr: string; cur: number; result: string;
  shift: boolean; alpha: boolean; hyp: boolean;
  angle: AngleUnit; mem: Record<string, number>;
  ans: number; err: boolean; fresh: boolean; menu: Menu;
}

// ─────────────────────────────────────────────────────────────────────────────
// Math helpers
// ─────────────────────────────────────────────────────────────────────────────
const PI = Math.PI;
const toRad   = (x: number, u: AngleUnit) => u==='DEG'?x*PI/180:u==='GRAD'?x*PI/200:x;
const fromRad = (x: number, u: AngleUnit) => u==='DEG'?x*180/PI:u==='GRAD'?x*200/PI:x;

function fact(n: number): number {
  if (!Number.isInteger(n)||n<0) return NaN;
  if (n>170) return Infinity;
  let r=1; for (let i=2;i<=n;i++) r*=i; return r;
}
function nCr(n:number,r:number) { return fact(n)/(fact(r)*fact(n-r)); }
function nPr(n:number,r:number) { return fact(n)/fact(n-r); }
function gcd(a:number,b:number):number { a=Math.abs(a);b=Math.abs(b); while(b){const t=b;b=a%b;a=t;} return a; }

function fmtNum(v: number): string {
  if (isNaN(v)) return 'Math ERROR';
  if (!isFinite(v)) return v>0?'×10^99':'-×10^99';
  if (v===0) return '0';
  const abs=Math.abs(v);
  if (abs>=1e10||(abs<1e-9&&abs>0)) {
    const e=Math.floor(Math.log10(abs));
    const m=v/Math.pow(10,e);
    return `${parseFloat(m.toPrecision(10))}×10^${e}`;
  }
  return parseFloat(v.toPrecision(10)).toString();
}

function tryFrac(v: number): string|null {
  if (!isFinite(v)||isNaN(v)||Number.isInteger(v)) return null;
  const sign=v<0?-1:1; v=Math.abs(v);
  const whole=Math.floor(v); const frac=v-whole;
  for (let d=2;d<=9999;d++) {
    const n=Math.round(frac*d);
    if (Math.abs(n/d-frac)<1e-10&&n!==0&&n!==d) {
      const g=gcd(n,d); const nd=n/g,dd=d/g;
      if (dd>9999) continue;
      if (whole>0) return `${sign<0?'-':''}${whole}┘${nd}/${dd}`;
      return `${sign<0?'-':''}${nd}/${dd}`;
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tokeniser + Evaluator
// ─────────────────────────────────────────────────────────────────────────────
type TokKind = 'num'|'op'|'fn'|'lp'|'rp'|'comma'|'eof';
type Tok = {t:TokKind; v:string|number};

const FNAMES = [
  'sinh⁻¹','cosh⁻¹','tanh⁻¹','sin⁻¹','cos⁻¹','tan⁻¹',
  'sinh','cosh','tanh','sin','cos','tan',
  'log','ln','eˣ','√','∛','abs','Pol','Rec','nCr','nPr','×10^','10^',
];

function tokenise(src:string,ans:number,mem:Record<string,number>):Tok[] {
  const ts:Tok[]=[];
  let s=src.replace(/÷/g,'/').replace(/×(?!10)/g,'*').replace(/−/g,'-');
  let i=0;
  const push=(t:TokKind,v:string|number)=>ts.push({t,v});
  const implMul=()=>{const l=ts[ts.length-1];if(l&&(l.t==='num'||l.t==='rp'))push('op','*');};
  while(i<s.length) {
    if(/\s/.test(s[i])){i++;continue;}
    if(s.startsWith('Ans',i)){implMul();push('num',ans);i+=3;continue;}
    if(s[i]==='π'){implMul();push('num',PI);i++;continue;}
    if(s[i]==='e'&&s[i+1]!=='ˣ'){implMul();push('num',Math.E);i++;continue;}
    if(/^[A-FMxy]$/.test(s[i])&&mem[s[i]]!==undefined){implMul();push('num',mem[s[i]]);i++;continue;}
    let matched=false;
    for(const fn of FNAMES){
      if(s.startsWith(fn,i)){implMul();push('fn',fn);i+=fn.length;if(s[i]==='('){push('lp','(');i++;}matched=true;break;}
    }
    if(matched)continue;
    if(/\d/.test(s[i])||s[i]==='.'){
      let nb=''; while(i<s.length&&(/\d/.test(s[i])||s[i]==='.'))nb+=s[i++];
      const sci=s.slice(i).match(/^×10\^(\((-?\d+)\)|(-?\d+))/);
      if(sci){push('num',parseFloat(nb)*Math.pow(10,parseInt(sci[2]??sci[3])));i+=sci[0].length;}
      else push('num',parseFloat(nb));
      continue;
    }
    if(s[i]==='('){implMul();push('lp','(');i++;continue;}
    if(s[i]===')'){push('rp',')');i++;continue;}
    if(s[i]===','){push('comma',',');i++;continue;}
    if(['+','-','*','/','%','^','!'].includes(s[i])){push('op',s[i]);i++;continue;}
    i++;
  }
  push('eof',''); return ts;
}

function evaluate(expr:string,angle:AngleUnit,ans:number,mem:Record<string,number>):number {
  let open=0; for(const c of expr){if(c==='(')open++;else if(c===')')open--;}
  const src=open>0?expr+')'.repeat(open):expr;
  const toks=tokenise(src,ans,mem); let pos=0;
  const peek=():Tok=>toks[pos]??{t:'eof',v:''};
  const eat=():Tok=>toks[pos++]??{t:'eof',v:''};
  function parseExpr(minP=0):number {
    let left=parseUnary();
    while(true){
      const t=peek(); if(t.t!=='op')break;
      const v=t.v as string;
      const prec:Record<string,number>={'+':1,'-':1,'*':2,'/':2,'^':3,'!':5,'%':5};
      const p=prec[v]??-1; if(p<=minP)break; eat();
      if(v==='!')  {left=fact(left);continue;}
      if(v==='%')  {left=left/100;continue;}
      const right=v==='^'?parseExpr(p-1):parseExpr(p);
      if(v==='+')left+=right; else if(v==='-')left-=right;
      else if(v==='*')left*=right; else if(v==='/')left/=right;
      else if(v==='^')left=Math.pow(left,right);
    }
    return left;
  }
  function parseUnary():number {
    const t=peek();
    if(t.t==='op'&&t.v==='-'){eat();return -parseUnary();}
    if(t.t==='op'&&t.v==='+'){eat();return +parseUnary();}
    return parsePrimary();
  }
  function parsePrimary():number {
    const t=peek();
    if(t.t==='num'){eat();return t.v as number;}
    if(t.t==='lp'){eat();const v=parseExpr();if(peek().t==='rp')eat();return v;}
    if(t.t==='fn'){
      eat(); if(peek().t==='lp')eat();
      const args:number[]=[];
      if(peek().t!=='rp'&&peek().t!=='eof'){
        args.push(parseExpr()); while(peek().t==='comma'){eat();args.push(parseExpr());}
      }
      if(peek().t==='rp')eat();
      const fn=t.v as string; const [a,b]=[args[0]??0,args[1]??0];
      switch(fn){
        case 'sin': return Math.sin(toRad(a,angle));
        case 'cos': return Math.cos(toRad(a,angle));
        case 'tan': return Math.tan(toRad(a,angle));
        case 'sin⁻¹': return fromRad(Math.asin(a),angle);
        case 'cos⁻¹': return fromRad(Math.acos(a),angle);
        case 'tan⁻¹': return fromRad(Math.atan(a),angle);
        case 'sinh': return Math.sinh(a); case 'cosh': return Math.cosh(a); case 'tanh': return Math.tanh(a);
        case 'sinh⁻¹': return Math.asinh(a); case 'cosh⁻¹': return Math.acosh(a); case 'tanh⁻¹': return Math.atanh(a);
        case 'log': return args.length>=2?Math.log(b)/Math.log(a):Math.log10(a);
        case 'ln': return Math.log(a); case 'eˣ': return Math.exp(a);
        case 'abs': return Math.abs(a); case '√': return Math.sqrt(a); case '∛': return Math.cbrt(a);
        case '10^': return Math.pow(10,a); case '×10^': return a;
        case 'nCr': return nCr(a,b); case 'nPr': return nPr(a,b);
        case 'Pol': return Math.sqrt(a*a+b*b); case 'Rec': return a*Math.cos(toRad(b,angle));
        default: return NaN;
      }
    }
    return NaN;
  }
  return parseExpr();
}

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────
const INIT: CS = {
  expr:'',cur:0,result:'',shift:false,alpha:false,hyp:false,
  angle:'DEG',mem:{A:0,B:0,C:0,D:0,E:0,F:0,M:0,x:0,y:0},
  ans:0,err:false,fresh:false,menu:'none',
};

const MULTI_TOKS=[
  'sinh⁻¹(','cosh⁻¹(','tanh⁻¹(','sin⁻¹(','cos⁻¹(','tan⁻¹(',
  'sinh(','cosh(','tanh(','sin(','cos(','tan(',
  'log(','ln(','eˣ(','√(','∛(','abs(','Pol(','Rec(',
  'nCr(','nPr(','×10^(','10^(','×10^','10^',
  '^(-1)','^2','^3','^(','−(',
].sort((a,b)=>b.length-a.length);

// ─────────────────────────────────────────────────────────────────────────────
// Key definitions
// ─────────────────────────────────────────────────────────────────────────────
interface KD {
  id:string; main:string; shift?:string; alpha?:string;
  act:string; sAct?:string; aAct?:string;
  color?:'white'|'blue'|'orange'|'dark'|'nav';
}

// On the real device: OPTN and CALC are on the left of the nav row,
// ∫f□ and x are on the right. They appear in a row WITH the d-pad in the middle.
const FN_ROW_LEFT: KD[] = [
  {id:'OPTN',main:'OPTN',shift:'QR',    act:'NOOP',sAct:'NOOP'},
  {id:'CALC',main:'CALC',shift:'SOLVE=',act:'NOOP',sAct:'NOOP'},
];
const FN_ROW_RIGHT: KD[] = [
  {id:'INTG',main:'∫f□', shift:'d/dx', act:'NOOP',sAct:'NOOP'},
  {id:'XVAR',main:'x',   shift:'Σ',    act:'XVAR',sAct:'NOOP'},
];

const ROW2: KD[] = [
  {id:'FRAC',main:'a b∕c',shift:'⬚b∕c', act:'LPAR', sAct:'LPAR'},
  {id:'SQRT',main:'√',    shift:'∛',    act:'SQRT', sAct:'CBRT'},
  {id:'SQ',  main:'x²',   shift:'x³',   act:'SQ',   sAct:'CUBE'},
  {id:'POW', main:'xᵐ',   shift:'x⁻¹', act:'POW',  sAct:'INV'},
  {id:'LOG', main:'log□', shift:'10^',  act:'LOG',  sAct:'POW10'},
  {id:'LN',  main:'ln',   shift:'eˣ',   act:'LN',   sAct:'EXPX'},
];
const ROW3: KD[] = [
  {id:'NEG', main:'(−)',  shift:'log□B', alpha:'A', act:'NEG',  sAct:'LOG2', aAct:'MEM_A'},
  {id:'DMS', main:"°'\"", shift:'°DMS', alpha:'B', act:'DMS',  sAct:'NOOP', aAct:'MEM_B'},
  {id:'INV', main:'x⁻¹', shift:'x!',   alpha:'C', act:'INV',  sAct:'FACT', aAct:'MEM_C'},
  {id:'SIN', main:'sin',  shift:'sin⁻¹',alpha:'D', act:'SIN',  sAct:'ASIN', aAct:'MEM_D'},
  {id:'COS', main:'cos',  shift:'cos⁻¹',alpha:'E', act:'COS',  sAct:'ACOS', aAct:'MEM_E'},
  {id:'TAN', main:'tan',  shift:'tan⁻¹',alpha:'F', act:'TAN',  sAct:'ATAN', aAct:'MEM_F'},
];
const ROW4: KD[] = [
  {id:'STO',  main:'STO', shift:'RCL',  act:'STO',  sAct:'RCL'},
  {id:'ENG',  main:'ENG', shift:'←ENG', act:'ENG',  sAct:'ENGB'},
  {id:'LPAR', main:'(',   shift:'Abs',  act:'LPAR', sAct:'ABS'},
  {id:'RPAR', main:')',   alpha:',',    act:'RPAR', aAct:'COMMA'},
  {id:'STOD', main:'S⇔D', shift:'►DEC',act:'STOD', sAct:'TODEC'},
  {id:'MPLUS',main:'M+',  shift:'M−',  alpha:'M',  act:'MPLUS',sAct:'MMINUS',aAct:'MEM_M'},
];
const NUM_ROW0: KD[] = [
  {id:'7',  main:'7', shift:'CONST', act:'7', color:'white'},
  {id:'8',  main:'8', shift:'CONV',  act:'8', color:'white'},
  {id:'9',  main:'9', shift:'CLR',   act:'9', color:'white'},
  {id:'DEL',main:'DEL',shift:'INS',  act:'DEL',sAct:'INS', color:'blue'},
  {id:'AC', main:'AC', shift:'OFF',  act:'AC', sAct:'OFF', color:'blue'},
];
const NUM_ROW1: KD[] = [
  {id:'4',  main:'4', act:'4', color:'white'},
  {id:'5',  main:'5', act:'5', color:'white'},
  {id:'6',  main:'6', act:'6', color:'white'},
  {id:'MUL',main:'×', shift:'nPr', act:'×', sAct:'NPR', color:'white'},
  {id:'DIV',main:'÷', shift:'nCr', alpha:'y', act:'÷', sAct:'NCR', aAct:'MEM_y', color:'white'},
];
const NUM_ROW2: KD[] = [
  {id:'1',  main:'1', act:'1', color:'white'},
  {id:'2',  main:'2', act:'2', color:'white'},
  {id:'3',  main:'3', act:'3', color:'white'},
  {id:'ADD',main:'+', shift:'Pol', act:'+', sAct:'POL', color:'white'},
  {id:'SUB',main:'−', shift:'Rec', act:'−', sAct:'REC', color:'white'},
];
const NUM_ROW3: KD[] = [
  {id:'0',  main:'0',    shift:'Rnd',  act:'0',   sAct:'RND',  color:'white'},
  {id:'DOT',main:'.',    shift:'Ran#', act:'.',    sAct:'RAN',  color:'white'},
  {id:'EE', main:'×10ˣ', shift:'π', alpha:'e', act:'EE', sAct:'PI', aAct:'EULER', color:'white'},
  {id:'ANS',main:'Ans',  shift:'%',   act:'ANS', sAct:'PCT',  color:'white'},
  {id:'EQ', main:'=',    act:'=', color:'orange'},
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
interface Props { onClose: () => void }

export function Fx991EX({ onClose }: Props) {
  const [cs, setCS] = useState<CS>({...INIT});
  const [pos, setPos] = useState({x:60,y:20});
  const dragRef = useRef({on:false,ox:0,oy:0});
  const rootRef = useRef<HTMLDivElement>(null);

  const onDragStart = useCallback((e:React.MouseEvent)=>{
    e.preventDefault();
    dragRef.current={on:true,ox:e.clientX-pos.x,oy:e.clientY-pos.y};
    document.body.style.userSelect='none';
  },[pos]);

  useEffect(()=>{
    const mm=(e:MouseEvent)=>{if(!dragRef.current.on)return;setPos({x:e.clientX-dragRef.current.ox,y:e.clientY-dragRef.current.oy});};
    const mu=()=>{dragRef.current.on=false;document.body.style.userSelect='';};
    window.addEventListener('mousemove',mm); window.addEventListener('mouseup',mu);
    return()=>{window.removeEventListener('mousemove',mm);window.removeEventListener('mouseup',mu);};
  },[]);

  useEffect(()=>{
    const handler=(e:KeyboardEvent)=>{
      if(!rootRef.current)return;
      const map:Record<string,string>={'0':'0','1':'1','2':'2','3':'3','4':'4','5':'5','6':'6','7':'7','8':'8','9':'9',
        '.':'.','+':`+`,'-':'−','*':'×','/':'÷','Enter':'=','=':'=','Backspace':'DEL','Delete':'AC',
        '(':'LPAR',')':'RPAR','%':'PCT','p':'PI','P':'PI'};
      const act=map[e.key]; if(!act)return; e.preventDefault();
      setCS(prev=>doPress({id:act,main:act,act},prev));
    };
    window.addEventListener('keydown',handler);
    return()=>window.removeEventListener('keydown',handler);
  },[]);

  const doPress=useCallback((k:KD,prev:CS):CS=>{
    if(prev.menu==='mode'){
      if(k.act==='1'||k.act==='AC')return{...prev,menu:'none'}; return prev;
    }
    if(prev.menu==='setup'){
      if(k.act==='1')return{...prev,angle:'DEG',menu:'none',shift:false};
      if(k.act==='2')return{...prev,angle:'RAD',menu:'none',shift:false};
      if(k.act==='3')return{...prev,angle:'GRAD',menu:'none',shift:false};
      if(k.act==='AC')return{...prev,menu:'none'}; return prev;
    }
    if(prev.menu==='stoWait'){
      const v=k.alpha??'';
      if(/^[A-FMxy]$/.test(v))return{...prev,menu:'none',shift:false,alpha:false,mem:{...prev.mem,[v]:prev.ans},result:`${v} = ${fmtNum(prev.ans)}`};
      if(k.act==='AC')return{...prev,menu:'none'}; return prev;
    }
    if(prev.menu==='rclWait'){
      const v=k.alpha??'';
      if(/^[A-FMxy]$/.test(v)){const val=prev.mem[v]??0;const ne=prev.expr.slice(0,prev.cur)+v+prev.expr.slice(prev.cur);return{...prev,menu:'none',shift:false,alpha:false,expr:ne,cur:prev.cur+1,result:fmtNum(val),fresh:false};}
      if(k.act==='AC')return{...prev,menu:'none'}; return prev;
    }

    const act=prev.shift?(k.sAct??k.act):prev.alpha?(k.aAct??k.act):k.act;
    const base:CS={...prev,shift:false,alpha:false,err:false};

    const app=(tok:string):CS=>{
      let e=base.expr,c=base.cur;
      if(base.fresh){
        if(/^[+\-−×÷^%]/.test(tok)){e='Ans';c=3;}
        else if(!/^[)!]/.test(tok)){e='';c=0;}
      }
      const ne=e.slice(0,c)+tok+e.slice(c);
      return{...base,expr:ne,cur:c+tok.length,result:'',fresh:false};
    };

    switch(act){
      case 'SHIFT': return{...prev,shift:!prev.shift,alpha:false};
      case 'ALPHA': return{...prev,alpha:!prev.alpha,shift:false};
      case 'HYP':   return{...base,hyp:!prev.hyp};
      case 'MENU':  return{...base,menu:'mode'};
      case 'SETUP': return{...base,menu:'setup'};
      case 'NOOP':  return base;
      case 'AC': case 'OFF': return{...INIT,angle:prev.angle,mem:prev.mem};
      case 'CL': return{...base,cur:Math.max(0,base.cur-1)};
      case 'CR': return{...base,cur:Math.min(base.expr.length,base.cur+1)};
      case 'CUP': return{...base,cur:0};
      case 'CDN': return{...base,cur:base.expr.length};
      case 'DEL':{
        if(base.fresh)return{...base,expr:'',cur:0,result:'',fresh:false};
        const{expr:e,cur:c}=base; if(c===0)return base;
        for(const m of MULTI_TOKS)if(e.slice(0,c).endsWith(m))return{...base,expr:e.slice(0,c-m.length)+e.slice(c),cur:c-m.length};
        return{...base,expr:e.slice(0,c-1)+e.slice(c),cur:c-1};
      }
      case '0':case '1':case '2':case '3':case '4':
      case '5':case '6':case '7':case '8':case '9':
      case '.': return app(act);
      case '+':case '−':case '×':case '÷': return app(act);
      case '^': return app('^(');
      case 'PI': return app('π'); case 'EULER': return app('e');
      case 'ANS': return app('Ans'); case 'PCT': return app('%'); case 'XVAR': return app('x');
      case 'LPAR': return app('('); case 'RPAR': return app(')'); case 'COMMA': return app(',');
      case 'NEG': return app('−('); case 'DMS': return app('°');
      case 'SQRT': return app('√('); case 'CBRT': return app('∛(');
      case 'SQ': return app('^2'); case 'CUBE': return app('^3');
      case 'POW': return app('^('); case 'INV': return app('^(-1)'); case 'FACT': return app('!');
      case 'LOG': return app('log('); case 'LOG2': return app('log(2,');
      case 'LN': return app('ln('); case 'EXPX': return app('eˣ('); case 'POW10': return app('10^(');
      case 'EE': return app('×10^('); case 'ABS': return app('abs(');
      case 'NCR': return app('nCr('); case 'NPR': return app('nPr(');
      case 'POL': return app('Pol('); case 'REC': return app('Rec(');
      case 'SIN': return app(prev.hyp?'sinh(':'sin(');
      case 'COS': return app(prev.hyp?'cosh(':'cos(');
      case 'TAN': return app(prev.hyp?'tanh(':'tan(');
      case 'ASIN': return app(prev.hyp?'sinh⁻¹(':'sin⁻¹(');
      case 'ACOS': return app(prev.hyp?'cosh⁻¹(':'cos⁻¹(');
      case 'ATAN': return app(prev.hyp?'tanh⁻¹(':'tan⁻¹(');
      case 'STO': return{...base,menu:'stoWait',result:'STO▸'};
      case 'RCL': return{...base,menu:'rclWait',result:'RCL▸'};
      case 'MEM_A':case 'MEM_B':case 'MEM_C':case 'MEM_D':
      case 'MEM_E':case 'MEM_F':case 'MEM_M':case 'MEM_x':case 'MEM_y':
        return app(act.slice(4));
      case 'MPLUS':{const m=prev.mem.M+prev.ans;return{...base,mem:{...prev.mem,M:m},result:`M = ${fmtNum(m)}`};}
      case 'MMINUS':{const m=prev.mem.M-prev.ans;return{...base,mem:{...prev.mem,M:m},result:`M = ${fmtNum(m)}`};}
      case 'STOD':{
        if(!isFinite(prev.ans)||isNaN(prev.ans))return base;
        if(prev.result.includes('/')||prev.result.includes('┘'))return{...base,result:fmtNum(prev.ans)};
        const fr=tryFrac(prev.ans); return fr?{...base,result:fr}:base;
      }
      case 'TODEC': return{...base,result:fmtNum(prev.ans)};
      case 'ENG':case 'ENGB':{
        if(isNaN(prev.ans)||!isFinite(prev.ans)||prev.ans===0)return base;
        const dir=act==='ENG'?1:-1;
        const absV=Math.abs(prev.ans);
        const exp=Math.floor(Math.log10(absV)/3)*3+dir*3;
        return{...base,result:`${parseFloat((prev.ans/Math.pow(10,exp)).toPrecision(6))}×10^${exp}`};
      }
      case 'RAN':{const r=parseFloat(Math.random().toFixed(3));return{...base,result:fmtNum(r),ans:r,fresh:true};}
      case 'RND':{const r=parseFloat(prev.ans.toPrecision(10));return{...base,result:fmtNum(r),ans:r,fresh:true};}
      case '=':{
        const e=base.expr.trim(); if(!e)return{...base,result:'0',ans:0,fresh:true};
        try{
          const val=evaluate(e,prev.angle,prev.ans,prev.mem);
          if(isNaN(val)||!isFinite(val))return{...base,result:'Math ERROR',err:true,fresh:true};
          return{...base,result:fmtNum(val),ans:val,fresh:true};
        }catch{return{...base,result:'Syntax ERROR',err:true,fresh:true};}
      }
      default: return base;
    }
  },[]);

  const press=useCallback((k:KD)=>setCS(prev=>doPress(k,prev)),[doPress]);
  const s=cs;

  // ── Menu content ──
  const menuContent=():React.ReactNode=>{
    if(s.menu==='mode')return(
      <div style={{padding:'4px 6px',color:'#182a04'}}>
        <div style={{fontWeight:'bold',borderBottom:'1px solid #8aaa78',paddingBottom:2,marginBottom:4,fontSize:10}}>MODE</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'2px 3px',fontSize:8.5}}>
          {['1:COMP','2:CMPLX','3:BASE-N','4:MATRIX','5:VECTOR','6:STAT','7:TABLE','8:EQN'].map(m=>(
            <span key={m} style={{background:m.startsWith('1')?'#2a4a14':'transparent',color:m.startsWith('1')?'#b8cca8':'#182a04',padding:'1px 2px',borderRadius:2}}>{m}</span>
          ))}
        </div>
        <div style={{fontSize:7.5,color:'#557755',marginTop:3}}>Press 1 for COMP · AC to close</div>
      </div>
    );
    if(s.menu==='setup')return(
      <div style={{padding:'4px 6px',color:'#182a04'}}>
        <div style={{fontWeight:'bold',fontSize:10,marginBottom:3}}>SETUP › Angle</div>
        {(['DEG','RAD','GRAD'] as AngleUnit[]).map((u,i)=>(
          <div key={u} style={{display:'flex',gap:5,fontSize:9.5,padding:'1px 0'}}>
            <span style={{color:'#557755'}}>{i+1}:</span>
            <span style={{fontWeight:u===s.angle?'bold':'normal',color:u===s.angle?'#0a1a04':'#335522'}}>{u}{u===s.angle?' ◀':''}</span>
          </div>
        ))}
      </div>
    );
    if(s.menu==='stoWait')return<div style={{padding:'5px 6px',fontSize:9.5,color:'#182a04'}}><b style={{fontSize:11}}>STO ▸</b><br/><span style={{fontSize:8.5,color:'#557755'}}>ALPHA + variable (A–F, M, x, y)</span></div>;
    if(s.menu==='rclWait')return<div style={{padding:'5px 6px',fontSize:9.5,color:'#182a04'}}><b style={{fontSize:11}}>RCL ▸</b><br/><span style={{fontSize:8.5,color:'#557755'}}>ALPHA + variable (A–F, M, x, y)</span></div>;
    return null;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render helpers
  // ─────────────────────────────────────────────────────────────────────────

  // A "cell" = label row (always rendered, may be empty) + key button below
  const cell=(k:KD,kw:number,kh:number)=>{
    const isShiftOn=k.id==='SHIFT'&&s.shift;
    const isAlphaOn=k.id==='ALPHA'&&s.alpha;
    // Key body colour
    let bg='#2a2a2a',fg='#e8e8e8';
    if(k.color==='white') {bg='#e8e8e8';fg='#111';}
    if(k.color==='blue')  {bg='#1648a0';fg='#fff';}
    if(k.color==='orange'){bg='#d95f00';fg='#fff';}
    if(k.color==='nav')   {bg='#3a3a3a';fg='#e0e0e0';}
    if(isShiftOn) bg='#bf7e00';
    if(isAlphaOn) bg='#9e1020';

    const fs=k.main.length>5?7:k.main.length>4?8:k.main.length>3?9:10;
    const hasLbl=!!(k.shift||k.alpha);

    return(
      <div key={k.id} style={{display:'flex',flexDirection:'column',alignItems:'center',flexShrink:0,width:kw}}>
        {/* label strip — only present if there are actual labels */}
        {hasLbl&&(
        <div style={{height:10,width:'100%',display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:1,boxSizing:'border-box'}}>
          {k.shift
            ? <span style={{flex:1,textAlign:'center',fontSize:7,color:'#ffbe00',fontFamily:'sans-serif',lineHeight:1,overflow:'hidden',whiteSpace:'nowrap',fontWeight:600,textShadow:'0 0 3px rgba(0,0,0,0.9)'}}>{k.shift}</span>
            : <span style={{flex:1}}/>
          }
          {k.alpha&&(
            <span style={{flex:1,textAlign:'center',fontSize:7,color:'#ff5577',fontFamily:'sans-serif',lineHeight:1,overflow:'hidden',whiteSpace:'nowrap',fontWeight:600,textShadow:'0 0 3px rgba(0,0,0,0.9)'}}>
              {k.alpha}
            </span>
          )}
        </div>
        )}
        {/* key button */}
        <div
          onMouseDown={e=>{e.preventDefault();press(k);}}
          style={{
            width:kw,height:kh,background:bg,borderRadius:4,
            border:`1px solid ${k.color==='white'?'#aaaaaa':'#3a3a3a'}`,
            cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
            boxSizing:'border-box',flexShrink:0,
            boxShadow:k.color==='white'
              ?'0 2px 0 #888, inset 0 1px 0 rgba(255,255,255,0.8)'
              :'0 2px 0 rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.1)',
            userSelect:'none',
          }}
          onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.filter='brightness(1.15)';}}
          onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.filter='';}}
        >
          <span style={{fontSize:fs,color:fg,fontFamily:"'Segoe UI',Arial,sans-serif",fontWeight:k.color==='white'?700:600,lineHeight:1,letterSpacing:-0.3,textAlign:'center',pointerEvents:'none'}}>
            {k.main}
          </span>
        </div>
      </div>
    );
  };

  // A round silver "nav" button (SHIFT, ALPHA, MENU, ON)
  const navBtn=(k:KD,diameter:number)=>{
    const isShiftOn=k.id==='SHIFT'&&s.shift;
    const isAlphaOn=k.id==='ALPHA'&&s.alpha;
    let bg='radial-gradient(circle at 38% 32%, #888 0%, #666 40%, #444 100%)';
    if(isShiftOn) bg='radial-gradient(circle at 38% 32%, #e8a020 0%, #b87800 60%, #8a5800 100%)';
    if(isAlphaOn) bg='radial-gradient(circle at 38% 32%, #e04060 0%, #a01030 60%, #780820 100%)';

    return(
      <div key={k.id} style={{display:'flex',flexDirection:'column',alignItems:'center',flexShrink:0,width:diameter}}>
        {k.shift&&(
        <div style={{height:10,width:'100%',marginBottom:1}}>
          <span style={{display:'block',textAlign:'center',fontSize:7,color:'#ffbe00',fontFamily:'sans-serif',lineHeight:1,fontWeight:600,textShadow:'0 0 3px rgba(0,0,0,0.9)'}}>{k.shift}</span>
        </div>
        )}
        <div
          onMouseDown={e=>{e.preventDefault();press(k);}}
          style={{
            width:diameter,height:diameter,borderRadius:'50%',
            background:bg,
            border:'1px solid #222',
            cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
            boxShadow:'0 2px 4px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.2)',
            userSelect:'none',flexShrink:0,
          }}
          onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.filter='brightness(1.2)';}}
          onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.filter='';}}
        >
          <span style={{fontSize:7,color:'#e8e8e8',fontFamily:"'Segoe UI',Arial,sans-serif",fontWeight:600,letterSpacing:0,textAlign:'center',pointerEvents:'none',lineHeight:1}}>
            {k.main}
          </span>
        </div>
      </div>
    );
  };

  // D-pad
  const dpad=(size:number)=>(
    <div style={{position:'relative',width:size,height:size,flexShrink:0}}>
      {/* ring */}
      <div style={{position:'absolute',inset:0,borderRadius:'50%',
        background:'radial-gradient(circle at 40% 35%, #686868 0%, #444 45%, #282828 100%)',
        border:'1px solid #1a1a1a',
        boxShadow:'0 3px 8px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)'}}/>
      {/* centre nub */}
      <div onMouseDown={e=>e.preventDefault()} style={{
        position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
        width:Math.round(size*0.35),height:Math.round(size*0.35),borderRadius:'50%',
        background:'radial-gradient(circle at 38% 32%, #909090 0%, #606060 50%, #383838 100%)',
        border:'1px solid #222',
        boxShadow:'0 1px 3px rgba(0,0,0,0.6)',cursor:'pointer'}}/>
      {/* arrows */}
      {([
        {label:'▲',act:'CUP', style:{top:3,    left:'50%',transform:'translateX(-50%)'}},
        {label:'▼',act:'CDN', style:{bottom:3, left:'50%',transform:'translateX(-50%)'}},
        {label:'◀',act:'CL',  style:{left:3,   top:'50%', transform:'translateY(-50%)'}},
        {label:'▶',act:'CR',  style:{right:3,  top:'50%', transform:'translateY(-50%)'}},
      ] as const).map(({label,act:dAct,style:ds})=>(
        <div key={label}
          onMouseDown={e=>{e.preventDefault();press({id:label,main:label,act:dAct});}}
          style={{position:'absolute',...ds,width:14,height:14,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'#cccccc',cursor:'pointer'}}
        >{label}</div>
      ))}
    </div>
  );

  // Layout numbers — real device aspect ratio ~1:2 (portrait), width ~260px in UI
  const W=260;
  const PAD=8;
  const G=4;  // gap
  // Inner usable width: 260 - 2*8 = 244
  // 6 fn-keys:   6*37 + 5*4 = 242  ≈244 ✓
  // 5 num-keys:  5*44 + 4*4 = 236  ≈244 ✓ (some leftover for visual breathing)
  const FKW=37,FKH=24;
  const NKW=44,NKH=32;
  // Wide fn keys for OPTN/CALC/∫/x row: those 4 share space with d-pad
  // 2 left + dpad(50) + 2 right, gap 4
  // width of L+R keys: (244 - 50 - 3*4) / 4 = (244 - 62) / 4 = 45.5 → 45
  const DPW=52;
  const WKW=Math.floor((244-DPW-3*G)/4);  // ≈ 46
  const NAV_D=28; // nav button diameter

  const row=(children:React.ReactNode,mb=G)=>(
    <div style={{display:'flex',flexDirection:'row',gap:G,alignItems:'flex-end',justifyContent:'center',marginBottom:mb}}>
      {children}
    </div>
  );

  return(
    <div ref={rootRef} style={{position:'fixed',left:pos.x,top:pos.y,zIndex:9999,userSelect:'none',
      filter:'drop-shadow(0 8px 32px rgba(0,0,0,0.85))'}}>

      {/* ── White outer frame ── */}
      <div style={{
        width:W, background:'#d0d0d0',
        borderRadius:14, padding:'3px 3px 6px',
        boxSizing:'border-box',
      }}>
        {/* ── Black body ── */}
        <div style={{
          background:'#1e1e1e',
          borderRadius:11, overflow:'hidden',
          boxShadow:'inset 0 0 0 1px #111',
        }}>

          {/* ── Branding (drag handle) ── */}
          <div onMouseDown={onDragStart} style={{
            padding:'8px 10px 5px', cursor:'grab',
            background:'linear-gradient(180deg,#252525 0%,#1e1e1e 100%)',
            position:'relative',
          }}>
            <button onClick={onClose} style={{
              position:'absolute',right:6,top:6,width:18,height:18,borderRadius:'50%',
              background:'rgba(255,255,255,0.15)',border:'none',color:'#bbb',
              fontSize:12,fontWeight:'bold',cursor:'pointer',
              display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1,padding:0,
            }}>×</button>

            {/* solar panel */}
            <div style={{
              position:'absolute',right:28,top:8,width:54,height:22,
              background:'#050a05',border:'1px solid #1a2a1a',borderRadius:3,
              display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'1px',padding:'2px',
            }}>
              {Array.from({length:14}).map((_,i)=><div key={i} style={{background:'#0b150b',borderRadius:1}}/>)}
            </div>

            <div style={{fontSize:17,fontWeight:900,color:'#ffffff',letterSpacing:2,lineHeight:1,fontFamily:'Arial,sans-serif'}}>CASIO</div>
            <div style={{fontSize:8,color:'#aaa',letterSpacing:0.5,marginTop:1,fontFamily:'Arial,sans-serif'}}>fx-991EX</div>
            <div style={{fontSize:8,fontWeight:700,color:'#e03050',letterSpacing:3,fontFamily:'Arial,sans-serif'}}>CLASSWIZ</div>
          </div>

          {/* ── LCD screen with black bezel ── */}
          <div style={{margin:'5px 8px 6px',background:'#111',borderRadius:4,padding:'3px',boxShadow:'inset 0 0 0 1px #000'}}>
            <div style={{
              background:'#b8cc9c',
              borderRadius:2,
              display:'flex',flexDirection:'column',justifyContent:'space-between',
              padding:'4px 8px 5px',
              height:74,
              fontFamily:"'Courier New',Courier,monospace",
              overflow:'hidden',
            }}>
              {s.menu!=='none'?(
                <div style={{flex:1}}>{menuContent()}</div>
              ):(
                <>
                  {/* status */}
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div style={{display:'flex',gap:3,alignItems:'center'}}>
                      <span style={{fontSize:9,color:'#1a3204',fontWeight:'bold'}}>{s.angle}</span>
                      {s.shift&&<span style={{fontSize:8,background:'#bf7e00',color:'#fff',padding:'0 3px',borderRadius:2,fontWeight:'bold'}}>S</span>}
                      {s.alpha&&<span style={{fontSize:8,background:'#9e1020',color:'#fff',padding:'0 3px',borderRadius:2,fontWeight:'bold'}}>A</span>}
                      {s.hyp  &&<span style={{fontSize:8,background:'#3a5888',color:'#fff',padding:'0 3px',borderRadius:2,fontWeight:'bold'}}>HYP</span>}
                      {s.mem.M!==0&&<span style={{fontSize:8,background:'#2a3a66',color:'#fff',padding:'0 3px',borderRadius:2,fontWeight:'bold'}}>M</span>}
                    </div>
                    <span style={{fontSize:9,color:'#2a4a04'}}>COMP</span>
                  </div>
                  {/* expression */}
                  <div style={{
                    fontSize:s.expr.length>28?10:s.expr.length>20?12:14,
                    color:'#1a3204',textAlign:'right',wordBreak:'break-all',lineHeight:1.3,
                  }}>
                    {s.expr?(s.fresh?s.expr:s.expr.slice(0,s.cur)+'▏'+s.expr.slice(s.cur)):<span style={{color:'#7a9a60'}}>‌</span>}
                  </div>
                  {/* result */}
                  <div style={{
                    fontSize:s.result.length>16?12:s.result.length>12?15:s.result.length>8?18:s.result.length>4?22:26,
                    fontWeight:'bold',color:s.err?'#991100':'#0a1a04',
                    textAlign:'right',lineHeight:1,letterSpacing:-0.5,
                  }}>
                    {s.result||'\u200b'}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Keypad ── */}
          <div style={{padding:`0 ${PAD}px 8px`,paddingTop:2}}>

            {/* Nav row: SHIFT ALPHA  [D-pad]  MENU ON */}
            <div style={{display:'flex',flexDirection:'row',gap:G,alignItems:'flex-end',justifyContent:'center',marginBottom:G}}>
              {navBtn({id:'SHIFT',main:'SHIFT',act:'SHIFT',shift:''},NAV_D)}
              {navBtn({id:'ALPHA',main:'ALPHA',act:'ALPHA'},NAV_D)}
              <div style={{flex:1}}/>
              {dpad(DPW)}
              <div style={{flex:1}}/>
              {navBtn({id:'MENU',main:'MENU',act:'MENU',sAct:'SETUP',shift:'SETUP'},NAV_D)}
              {navBtn({id:'ON',  main:'ON',  act:'AC',  sAct:'OFF',  shift:'OFF' },NAV_D)}
            </div>

            {/* OPTN/CALC ··· ∫f□ x  — left 2, flex gap, right 2 */}
            <div style={{display:'flex',flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',marginBottom:G}}>
              <div style={{display:'flex',gap:G}}>
                {cell({id:'OPTN',main:'OPTN',shift:'QR',    act:'NOOP'},WKW,FKH)}
                {cell({id:'CALC',main:'CALC',shift:'SOLVE=',act:'NOOP'},WKW,FKH)}
              </div>
              <div style={{display:'flex',gap:G}}>
                {cell({id:'INTG',main:'∫f□', shift:'d/dx',act:'NOOP'},WKW,FKH)}
                {cell({id:'XVAR',main:'x',   shift:'Σ',   act:'XVAR'},WKW,FKH)}
              </div>
            </div>

            {/* Row 2 */}
            {row(<>{ROW2.map(k=>cell(k,FKW,FKH))}</>)}
            {/* Row 3 */}
            {row(<>{ROW3.map(k=>cell(k,FKW,FKH))}</>)}
            {/* Row 4 */}
            {row(<>{ROW4.map(k=>cell(k,FKW,FKH))}</>,6)}

            {/* divider */}
            <div style={{height:1,background:'#2a2a2a',margin:'2px 0 4px'}}/>

            {/* Num rows */}
            {[NUM_ROW0,NUM_ROW1,NUM_ROW2,NUM_ROW3].map((nr,ri)=>(
              <div key={ri} style={{display:'flex',flexDirection:'row',gap:G,alignItems:'flex-end',justifyContent:'center',marginBottom:ri<3?G:0}}>
                {nr.map(k=>cell(k,NKW,NKH))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
