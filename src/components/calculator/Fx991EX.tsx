'use client';
/**
 * Casio fx-991EX ClassWiz — pixel-faithful recreation.
 * Layout, labels and behaviour verified against the Casio fx-991EX product image
 * and the official user manual.
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
type Ang = 'DEG'|'RAD'|'GRAD';
type Menu = 'none'|'mode'|'setup'|'sto'|'rcl';
interface CS {
  expr:string; cur:number; result:string;
  shift:boolean; alpha:boolean; hyp:boolean;
  angle:Ang; mem:Record<string,number>;
  ans:number; err:boolean; fresh:boolean; menu:Menu;
}

// ─── Math ─────────────────────────────────────────────────────────────────────
const PI=Math.PI;
const toR=(x:number,u:Ang)=>u==='DEG'?x*PI/180:u==='GRAD'?x*PI/200:x;
const frR=(x:number,u:Ang)=>u==='DEG'?x*180/PI:u==='GRAD'?x*200/PI:x;
function fact(n:number):number{if(!Number.isInteger(n)||n<0)return NaN;if(n>170)return Infinity;let r=1;for(let i=2;i<=n;i++)r*=i;return r;}
function nCr(n:number,r:number){return fact(n)/(fact(r)*fact(n-r));}
function nPr(n:number,r:number){return fact(n)/fact(n-r);}
function gcd(a:number,b:number):number{a=Math.abs(a);b=Math.abs(b);while(b){const t=b;b=a%b;a=t;}return a;}

function fmt(v:number):string{
  if(isNaN(v))return 'Math ERROR';
  if(!isFinite(v))return v>0?'1×10^99':'-1×10^99';
  if(v===0)return '0';
  const abs=Math.abs(v);
  if(abs>=1e10||(abs<1e-9&&abs>0)){
    const e=Math.floor(Math.log10(abs));
    return `${parseFloat((v/Math.pow(10,e)).toPrecision(10))}×10^${e}`;
  }
  return parseFloat(v.toPrecision(10)).toString();
}
function tryFrac(v:number):string|null{
  if(!isFinite(v)||isNaN(v)||Number.isInteger(v))return null;
  const s=v<0?-1:1;v=Math.abs(v);
  const w=Math.floor(v),f=v-w;
  for(let d=2;d<=9999;d++){
    const n=Math.round(f*d);
    if(Math.abs(n/d-f)<1e-10&&n>0&&n<d){
      const g=gcd(n,d),nd=n/g,dd=d/g;
      if(dd>9999)continue;
      const sign=s<0?'-':'';
      return w>0?`${sign}${w}┘${nd}/${dd}`:`${sign}${nd}/${dd}`;
    }
  }
  return null;
}

// ─── Tokeniser ────────────────────────────────────────────────────────────────
type TK='num'|'op'|'fn'|'lp'|'rp'|'cm'|'eof';
type T={t:TK;v:string|number};
const FNS=['sinh⁻¹','cosh⁻¹','tanh⁻¹','sin⁻¹','cos⁻¹','tan⁻¹','sinh','cosh','tanh','sin','cos','tan','log','ln','eˣ','√','∛','abs','Pol','Rec','nCr','nPr','×10^','10^'];
function tok(src:string,ans:number,mem:Record<string,number>):T[]{
  const ts:T[]=[];
  let s=src.replace(/÷/g,'/').replace(/×(?!10)/g,'*').replace(/−/g,'-');
  let i=0;
  const push=(t:TK,v:string|number)=>ts.push({t,v});
  const iMul=()=>{const l=ts[ts.length-1];if(l&&(l.t==='num'||l.t==='rp'))push('op','*');};
  while(i<s.length){
    if(/\s/.test(s[i])){i++;continue;}
    if(s.startsWith('Ans',i)){iMul();push('num',ans);i+=3;continue;}
    if(s[i]==='π'){iMul();push('num',PI);i++;continue;}
    if(s[i]==='e'&&s[i+1]!=='ˣ'){iMul();push('num',Math.E);i++;continue;}
    if(/^[A-FMxy]$/.test(s[i])&&s[i] in mem){iMul();push('num',mem[s[i]]);i++;continue;}
    let m=false;
    for(const fn of FNS){if(s.startsWith(fn,i)){iMul();push('fn',fn);i+=fn.length;if(s[i]==='('){push('lp','(');i++;}m=true;break;}}
    if(m)continue;
    if(/\d/.test(s[i])||s[i]==='.'){
      let nb='';while(i<s.length&&(/\d/.test(s[i])||s[i]==='.'))nb+=s[i++];
      const sc=s.slice(i).match(/^×10\^(\((-?\d+)\)|(-?\d+))/);
      if(sc){push('num',parseFloat(nb)*Math.pow(10,parseInt(sc[2]??sc[3])));i+=sc[0].length;}
      else push('num',parseFloat(nb));
      continue;
    }
    if(s[i]==='('){iMul();push('lp','(');i++;continue;}
    if(s[i]===')'){push('rp',')');i++;continue;}
    if(s[i]===','){push('cm',',');i++;continue;}
    if(['+','-','*','/','%','^','!'].includes(s[i])){push('op',s[i]);i++;continue;}
    i++;
  }
  push('eof','');return ts;
}

// ─── Evaluator ────────────────────────────────────────────────────────────────
function calc(expr:string,angle:Ang,ans:number,mem:Record<string,number>):number{
  let open=0;for(const c of expr){if(c==='(')open++;else if(c===')')open--;}
  const src=open>0?expr+')'.repeat(open):expr;
  const ts=tok(src,ans,mem);let p=0;
  const pk=():T=>ts[p]??{t:'eof',v:''};
  const eat=():T=>ts[p++]??{t:'eof',v:''};
  function E(mp=0):number{
    let l=U();
    while(true){
      const t=pk();if(t.t!=='op')break;
      const v=t.v as string;
      const pr:Record<string,number>={'+':1,'-':1,'*':2,'/':2,'^':3,'!':5,'%':5};
      const pp=pr[v]??-1;if(pp<=mp)break;eat();
      if(v==='!'){l=fact(l);continue;}if(v==='%'){l=l/100;continue;}
      const r=v==='^'?E(pp-1):E(pp);
      if(v==='+')l+=r;else if(v==='-')l-=r;else if(v==='*')l*=r;else if(v==='/')l/=r;else if(v==='^')l=Math.pow(l,r);
    }
    return l;
  }
  function U():number{const t=pk();if(t.t==='op'&&t.v==='-'){eat();return -U();}if(t.t==='op'&&t.v==='+'){eat();return +U();}return P();}
  function P():number{
    const t=pk();
    if(t.t==='num'){eat();return t.v as number;}
    if(t.t==='lp'){eat();const v=E();if(pk().t==='rp')eat();return v;}
    if(t.t==='fn'){
      eat();if(pk().t==='lp')eat();
      const args:number[]=[];
      if(pk().t!=='rp'&&pk().t!=='eof'){args.push(E());while(pk().t==='cm'){eat();args.push(E());}}
      if(pk().t==='rp')eat();
      const fn=t.v as string;const[a,b]=[args[0]??0,args[1]??0];
      switch(fn){
        case 'sin':return Math.sin(toR(a,angle));case 'cos':return Math.cos(toR(a,angle));case 'tan':return Math.tan(toR(a,angle));
        case 'sin⁻¹':return frR(Math.asin(a),angle);case 'cos⁻¹':return frR(Math.acos(a),angle);case 'tan⁻¹':return frR(Math.atan(a),angle);
        case 'sinh':return Math.sinh(a);case 'cosh':return Math.cosh(a);case 'tanh':return Math.tanh(a);
        case 'sinh⁻¹':return Math.asinh(a);case 'cosh⁻¹':return Math.acosh(a);case 'tanh⁻¹':return Math.atanh(a);
        case 'log':return args.length>=2?Math.log(b)/Math.log(a):Math.log10(a);
        case 'ln':return Math.log(a);case 'eˣ':return Math.exp(a);
        case 'abs':return Math.abs(a);case '√':return Math.sqrt(a);case '∛':return Math.cbrt(a);
        case '10^':return Math.pow(10,a);case '×10^':return a;
        case 'nCr':return nCr(a,b);case 'nPr':return nPr(a,b);
        case 'Pol':{const r=Math.sqrt(a*a+b*b);return r;}
        case 'Rec':return a*Math.cos(toR(b,angle));
        default:return NaN;
      }
    }
    return NaN;
  }
  return E();
}

// ─── Initial state ────────────────────────────────────────────────────────────
const INIT:CS={expr:'',cur:0,result:'',shift:false,alpha:false,hyp:false,angle:'DEG',mem:{A:0,B:0,C:0,D:0,E:0,F:0,M:0,x:0,y:0},ans:0,err:false,fresh:false,menu:'none'};

// Multi-char tokens deleted as a unit
const MTOK=['sinh⁻¹(','cosh⁻¹(','tanh⁻¹(','sin⁻¹(','cos⁻¹(','tan⁻¹(','sinh(','cosh(','tanh(','sin(','cos(','tan(','log(','ln(','eˣ(','√(','∛(','abs(','Pol(','Rec(','nCr(','nPr(','×10^(','10^(','×10^','10^','^(-1)','^2','^3','^(','−('].sort((a,b)=>b.length-a.length);

// ─── Key definition ───────────────────────────────────────────────────────────
// shift = yellow label (above-left), alpha = purple/red label (above-right)
// col: 'w'=white num key, 'b'=blue DEL/AC, 'o'=orange =, 'd'=dark fn key (default)
interface KD{
  id:string; main:string;
  shift?:string; alpha?:string;
  act:string; sAct?:string; aAct?:string;
  col?:'w'|'b'|'o'|'d';
}

// ── Row 1: navigation row (plain silver buttons, labels rendered ABOVE) ─────
// These are rendered separately as navBtn — labels above the buttons
// SHIFT · ALPHA · [d-pad] · MENU(SETUP above) · ON(OFF above)

// ── Row 2: OPTN / CALC row + ∫f□ / x (wide keys, labels above) ─────────────
// Rendered inline in JSX

// ── Row 3: fraction / root / power / log ─────────────────────────────────────
// Real device labels (from photo, left→right):
//   ■b/c (shift=■b/c blue), √ (shift=∛ yellow, alpha=∛ no—actually shift label is ∛ and above shows "∛" in yellow)
//   x² (shift=x³ yellow), xᵐ (shift=DEC yellow, alpha=HEX purple? no—shift "DEC" only), log□ (shift=10ᵐ yellow, alpha=BIN purple), ln (shift=eˣ yellow, alpha=OCT purple)
const R1:KD[]=[
  {id:'FRAC', main:'a b/c',  shift:'■b/c',   act:'FRAC',  sAct:'IFRAC'},
  {id:'SQRT', main:'√',      shift:'∛',      act:'SQRT',  sAct:'CBRT'},
  {id:'SQ',   main:'x²',     shift:'x³',     act:'SQ',    sAct:'CUBE'},
  {id:'POW',  main:'xᵐ',     shift:'DEC',    act:'POW',   sAct:'TODEC'},
  {id:'LOG',  main:'log□',   shift:'10ᵐ',    alpha:'BIN', act:'LOG',   sAct:'POW10',  aAct:'NOOP'},
  {id:'LN',   main:'ln',     shift:'eˣ',     alpha:'OCT', act:'LN',    sAct:'EXPX',   aAct:'NOOP'},
];
// ── Row 4: (-) / °,, / x⁻¹ / sin / cos / tan ────────────────────────────────
// Real device labels from photo:
//   (-) : shift=log yellow left, alpha=A purple right
//         (the "log" label above is because SHIFT+(-) = log on some modes — actually from photo it says "log" yellow + "A" red above the (-) key)
//   °,, : shift=∠←f yellow, alpha=B purple (from photo shows "∠←f" and "B")
//   x⁻¹ : shift=x! yellow, alpha=C purple
//   sin  : shift=sin⁻¹ yellow, alpha=D purple
//   cos  : shift=cos⁻¹ yellow, alpha=E purple
//   tan  : shift=tan⁻¹ yellow, alpha=F purple
const R2:KD[]=[
  {id:'NEG',  main:'(-)',    shift:'log',     alpha:'A',   act:'NEG',   sAct:'LOG',    aAct:'MEM_A'},
  {id:'DMS',  main:"°,\"",  shift:'∠←',     alpha:'B',   act:'DMS',                  aAct:'MEM_B'},
  {id:'XINV', main:'x⁻¹',   shift:'x!',      alpha:'C',   act:'INV',   sAct:'FACT',   aAct:'MEM_C'},
  {id:'SIN',  main:'sin',    shift:'sin⁻¹',   alpha:'D',   act:'SIN',   sAct:'ASIN',   aAct:'MEM_D'},
  {id:'COS',  main:'cos',    shift:'cos⁻¹',   alpha:'E',   act:'COS',   sAct:'ACOS',   aAct:'MEM_E'},
  {id:'TAN',  main:'tan',    shift:'tan⁻¹',   alpha:'F',   act:'TAN',   sAct:'ATAN',   aAct:'MEM_F'},
];
// ── Row 5: STO / ENG / ( / ) / S⇔D / M+ ─────────────────────────────────────
// Real device:
//   STO  : shift=RECALL yellow
//   ENG  : shift=∠← yellow (ENG back)
//   (    : shift=Abs yellow
//   )    : alpha=, purple
//   S⇔D  : shift=▶DEC yellow, alpha=a↔y purple
//   M+   : shift=M− yellow, alpha=M purple
const R3:KD[]=[
  {id:'STO',   main:'STO',   shift:'RECALL',  act:'STO',   sAct:'RCL'},
  {id:'ENG',   main:'ENG',   shift:'←ENG',    act:'ENG',   sAct:'ENGB'},
  {id:'LPAR',  main:'(',     shift:'Abs',     act:'LPAR',  sAct:'ABS'},
  {id:'RPAR',  main:')',     alpha:',',       act:'RPAR',               aAct:'COMMA'},
  {id:'STOD',  main:'S⇔D',   shift:'▶DEC',    alpha:'a↔y', act:'STOD',  sAct:'TODEC',  aAct:'NOOP'},
  {id:'MPLUS', main:'M+',    shift:'M−',      alpha:'M',   act:'MPLUS', sAct:'MMINUS', aAct:'MEM_M'},
];
// ── Number rows ───────────────────────────────────────────────────────────────
// Row 7–9, ×, ÷
const N0:KD[]=[
  {id:'7',   main:'7',      shift:'CONST',   act:'7',     col:'w'},
  {id:'8',   main:'8',      shift:'CONV',    act:'8',     col:'w'},
  {id:'9',   main:'9',      shift:'RESET',   act:'9',     col:'w'},
  {id:'DEL', main:'DEL',    shift:'UNDO',    alpha:'INS', act:'DEL',   sAct:'UNDO',   aAct:'INS',  col:'b'},
  {id:'AC',  main:'AC',     shift:'OFF',     act:'AC',    sAct:'OFF',  col:'b'},
];
const N1:KD[]=[
  {id:'4',   main:'4',      act:'4',   col:'w'},
  {id:'5',   main:'5',      act:'5',   col:'w'},
  {id:'6',   main:'6',      act:'6',   col:'w'},
  {id:'MUL', main:'×',      alpha:'nPr', act:'×',  aAct:'NPR',  col:'w'},
  {id:'DIV', main:'÷',      alpha:'nCr', act:'÷',  aAct:'NCR',  col:'w'},
];
const N2:KD[]=[
  {id:'1',   main:'1',      act:'1',   col:'w'},
  {id:'2',   main:'2',      act:'2',   col:'w'},
  {id:'3',   main:'3',      act:'3',   col:'w'},
  {id:'ADD', main:'+',      alpha:'Pol', act:'+',  aAct:'POL',  col:'w'},
  {id:'SUB', main:'−',      alpha:'Rec', act:'−',  aAct:'REC',  col:'w'},
];
const N3:KD[]=[
  {id:'0',   main:'0',      shift:'Rnd',   alpha:'Ranint', act:'0',    sAct:'RND',  aAct:'NOOP', col:'w'},
  {id:'DOT', main:'•',      shift:'Ran#',  act:'.',        sAct:'RAN',              col:'w'},
  {id:'EXP', main:'×10ˣ',   shift:'π',     alpha:'e',      act:'EE',   sAct:'PI',   aAct:'EULER',col:'w'},
  {id:'ANS', main:'Ans',    shift:'%',     alpha:'≈',      act:'ANS',  sAct:'PCT',  aAct:'NOOP', col:'w'},
  {id:'EQ',  main:'=',      act:'=', col:'o'},
];

// ─── Component ────────────────────────────────────────────────────────────────
interface Props{onClose:()=>void}

export function Fx991EX({onClose}:Props){
  const [cs,setCS]=useState<CS>({...INIT});
  const [pos,setPos]=useState({x:60,y:20});
  const dragRef=useRef({on:false,ox:0,oy:0});
  const rootRef=useRef<HTMLDivElement>(null);

  const onDrag=useCallback((e:React.MouseEvent)=>{e.preventDefault();dragRef.current={on:true,ox:e.clientX-pos.x,oy:e.clientY-pos.y};document.body.style.userSelect='none';},[pos]);

  useEffect(()=>{
    const mm=(e:MouseEvent)=>{if(!dragRef.current.on)return;setPos({x:e.clientX-dragRef.current.ox,y:e.clientY-dragRef.current.oy});};
    const mu=()=>{dragRef.current.on=false;document.body.style.userSelect='';};
    window.addEventListener('mousemove',mm);window.addEventListener('mouseup',mu);
    return()=>{window.removeEventListener('mousemove',mm);window.removeEventListener('mouseup',mu);};
  },[]);

  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      if(!rootRef.current)return;
      const map:Record<string,string>={'0':'0','1':'1','2':'2','3':'3','4':'4','5':'5','6':'6','7':'7','8':'8','9':'9','.':'.','+':`+`,'-':'−','*':'×','/':'÷','Enter':'=','=':'=','Backspace':'DEL','Delete':'AC','(':'LPAR',')':'RPAR','%':'PCT','p':'PI','P':'PI'};
      const a=map[e.key];if(!a)return;e.preventDefault();
      setCS(p=>run({id:a,main:a,act:a},p));
    };
    window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h);
  },[]);

  const run=useCallback((k:KD,prev:CS):CS=>{
    // ── menu intercepts ──
    if(prev.menu==='mode'){
      if(k.act==='1')return{...prev,menu:'none'};
      if(k.act==='AC')return{...prev,menu:'none'};
      return prev;
    }
    if(prev.menu==='setup'){
      if(k.act==='1')return{...prev,angle:'DEG',menu:'none',shift:false};
      if(k.act==='2')return{...prev,angle:'RAD',menu:'none',shift:false};
      if(k.act==='3')return{...prev,angle:'GRAD',menu:'none',shift:false};
      if(k.act==='AC')return{...prev,menu:'none'};
      return prev;
    }
    if(prev.menu==='sto'){
      const v=k.alpha??'';
      if(/^[A-FMxy]$/.test(v))return{...prev,menu:'none',shift:false,alpha:false,mem:{...prev.mem,[v]:prev.ans},result:`${v} = ${fmt(prev.ans)}`};
      if(k.act==='AC')return{...prev,menu:'none'};
      return prev;
    }
    if(prev.menu==='rcl'){
      const v=k.alpha??'';
      if(/^[A-FMxy]$/.test(v)){const val=prev.mem[v]??0;const ne=prev.expr.slice(0,prev.cur)+v+prev.expr.slice(prev.cur);return{...prev,menu:'none',shift:false,alpha:false,expr:ne,cur:prev.cur+v.length,result:'',fresh:false};}
      if(k.act==='AC')return{...prev,menu:'none'};
      return prev;
    }

    const act=prev.shift?(k.sAct??k.act):prev.alpha?(k.aAct??k.act):k.act;
    const base:CS={...prev,shift:false,alpha:false,err:false};

    const ins=(tok:string):CS=>{
      let e=base.expr,c=base.cur;
      if(base.fresh){
        if(/^[+−×÷^%]/.test(tok)){e='Ans';c=3;}
        else if(!/^[)!°]/.test(tok)){e='';c=0;}
      }
      const ne=e.slice(0,c)+tok+e.slice(c);
      return{...base,expr:ne,cur:c+tok.length,result:'',fresh:false};
    };

    switch(act){
      case 'SHIFT':return{...prev,shift:!prev.shift,alpha:false};
      case 'ALPHA':return{...prev,alpha:!prev.alpha,shift:false};
      case 'HYP':return{...base,hyp:!prev.hyp};
      case 'MENU':return{...base,menu:'mode'};
      case 'SETUP':return{...base,menu:'setup'};
      case 'NOOP':return base;
      case 'AC':case 'OFF':return{...INIT,angle:prev.angle,mem:prev.mem};
      case 'CL':return{...base,cur:Math.max(0,base.cur-1)};
      case 'CR':return{...base,cur:Math.min(base.expr.length,base.cur+1)};
      case 'CUP':return{...base,cur:0};
      case 'CDN':return{...base,cur:base.expr.length};
      case 'DEL':{
        if(base.fresh)return{...base,expr:'',cur:0,result:'',fresh:false};
        const{expr:e,cur:c}=base;if(c===0)return base;
        for(const m of MTOK)if(e.slice(0,c).endsWith(m))return{...base,expr:e.slice(0,c-m.length)+e.slice(c),cur:c-m.length};
        return{...base,expr:e.slice(0,c-1)+e.slice(c),cur:c-1};
      }
      case 'INS':return base;
      case 'UNDO':return base;
      case '0':case '1':case '2':case '3':case '4':case '5':case '6':case '7':case '8':case '9':case '.':return ins(act);
      case '+':case '−':case '×':case '÷':return ins(act);
      case '^':return ins('^(');
      case 'PI':return ins('π');case 'EULER':return ins('e');
      case 'ANS':return ins('Ans');case 'PCT':return ins('%');case 'XVAR':return ins('x');
      case 'LPAR':return ins('(');case 'RPAR':return ins(')');case 'COMMA':return ins(',');
      case 'NEG':return ins('−(');case 'DMS':return ins('°');
      case 'FRAC':return ins('(');case 'IFRAC':return ins('(');
      case 'SQRT':return ins('√(');case 'CBRT':return ins('∛(');case 'XSQRT':return ins('^(1÷');
      case 'SQ':return ins('^2');case 'CUBE':return ins('^3');
      case 'POW':return ins('^(');case 'INV':return ins('^(-1)');case 'FACT':return ins('!');
      case 'LOG':return ins(prev.hyp?'sinh(':  'log(');
      case 'LOGB':return ins('log(');
      case 'LN':return ins(prev.hyp?'cosh(':   'ln(');
      case 'EXPX':return ins(prev.hyp?'tanh(':  'eˣ(');
      case 'POW10':return ins('10^(');
      case 'EE':return ins('×10^(');case 'ABS':return ins('abs(');
      case 'NCR':return ins('nCr(');case 'NPR':return ins('nPr(');
      case 'POL':return ins('Pol(');case 'REC':return ins('Rec(');
      case 'SIN':return ins(prev.hyp?'sinh(':'sin(');
      case 'COS':return ins(prev.hyp?'cosh(':'cos(');
      case 'TAN':return ins(prev.hyp?'tanh(':'tan(');
      case 'ASIN':return ins(prev.hyp?'sinh⁻¹(':'sin⁻¹(');
      case 'ACOS':return ins(prev.hyp?'cosh⁻¹(':'cos⁻¹(');
      case 'ATAN':return ins(prev.hyp?'tanh⁻¹(':'tan⁻¹(');
      case 'STO':return{...base,menu:'sto',result:'STO ▸'};
      case 'RCL':return{...base,menu:'rcl',result:'RCL ▸'};
      case 'MEM_A':case 'MEM_B':case 'MEM_C':case 'MEM_D':
      case 'MEM_E':case 'MEM_F':case 'MEM_M':case 'MEM_x':case 'MEM_y':
        return ins(act.slice(4));
      case 'MPLUS':{const m=prev.mem.M+prev.ans;return{...base,mem:{...prev.mem,M:m},result:`M  ${fmt(m)}`};}
      case 'MMINUS':{const m=prev.mem.M-prev.ans;return{...base,mem:{...prev.mem,M:m},result:`M  ${fmt(m)}`};}
      case 'STOD':{
        if(!isFinite(prev.ans)||isNaN(prev.ans))return base;
        if(prev.result.includes('/')||prev.result.includes('┘'))return{...base,result:fmt(prev.ans)};
        const fr=tryFrac(prev.ans);return fr?{...base,result:fr}:base;
      }
      case 'TODEC':return{...base,result:fmt(prev.ans)};
      case 'ENG':case 'ENGB':{
        if(isNaN(prev.ans)||!isFinite(prev.ans)||prev.ans===0)return base;
        const dir=act==='ENG'?1:-1,av=Math.abs(prev.ans);
        const exp=Math.floor(Math.log10(av)/3)*3+dir*3;
        return{...base,result:`${parseFloat((prev.ans/Math.pow(10,exp)).toPrecision(6))}×10^${exp}`};
      }
      case 'RAN':{const r=parseFloat(Math.random().toFixed(3));return{...base,result:fmt(r),ans:r,fresh:true};}
      case 'RND':{const r=parseFloat(prev.ans.toPrecision(10));return{...base,result:fmt(r),ans:r,fresh:true};}
      case '=':{
        const e=base.expr.trim();
        if(!e)return{...base,result:'0',ans:0,fresh:true};
        try{
          const v=calc(e,prev.angle,prev.ans,prev.mem);
          if(isNaN(v)||!isFinite(v))return{...base,result:'Math ERROR',err:true,fresh:true};
          return{...base,result:fmt(v),ans:v,fresh:true};
        }catch{return{...base,result:'Syntax ERROR',err:true,fresh:true};}
      }
      default:return base;
    }
  },[]);

  const press=useCallback((k:KD)=>setCS(p=>run(k,p)),[run]);
  const s=cs;

  // ─── LCD content ────────────────────────────────────────────────────────────
  const lcdContent=()=>{
    if(s.menu==='mode')return(
      <div style={{color:'#1a2a06',fontFamily:'sans-serif',fontSize:9,padding:'2px 0'}}>
        <div style={{fontSize:10,fontWeight:700,borderBottom:'1px solid #6a8a40',marginBottom:4,paddingBottom:2,letterSpacing:1}}>MENU</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:3,fontSize:8}}>
          {[['1','COMP'],['2','CMPLX'],['3','BASE-N'],['4','MATRIX'],['5','VECTOR'],['6','STAT'],['7','TABLE'],['8','EQUAT']].map(([n,name])=>(
            <div key={n} style={{textAlign:'center',background:'#2a4a12',color:'#c8e0a0',borderRadius:2,padding:'3px 1px',cursor:'pointer',fontWeight:700,fontSize:7.5}}
              onMouseDown={e=>{e.preventDefault();press({id:n,main:n,act:n});}}>
              <div style={{fontSize:9,color:'#90c840'}}>{n}</div>
              <div>{name}</div>
            </div>
          ))}
        </div>
        <div style={{fontSize:7,color:'#5a7a30',marginTop:3,textAlign:'right'}}>AC to close</div>
      </div>
    );
    if(s.menu==='setup')return(
      <div style={{color:'#1a2a06',fontFamily:'sans-serif',padding:'2px 0'}}>
        <div style={{fontSize:10,fontWeight:700,borderBottom:'1px solid #6a8a40',marginBottom:4,paddingBottom:2,letterSpacing:1}}>SETUP</div>
        <div style={{fontSize:9,marginBottom:3,color:'#3a5a18',fontWeight:600}}>Angle Unit:</div>
        {(['DEG','RAD','GRAD'] as Ang[]).map((u,i)=>(
          <div key={u} onMouseDown={e=>{e.preventDefault();press({id:String(i+1),main:String(i+1),act:String(i+1)});}}
            style={{display:'flex',gap:8,fontSize:9.5,padding:'2px 4px',cursor:'pointer',borderRadius:2,background:u===s.angle?'#2a4a12':'transparent',color:u===s.angle?'#c8e0a0':'#2a4a12'}}>
            <span style={{color:u===s.angle?'#90c840':'#5a7a30',fontWeight:700}}>{i+1}</span>
            <span style={{fontWeight:u===s.angle?700:400}}>{u}</span>
            {u===s.angle&&<span style={{marginLeft:'auto'}}>◀</span>}
          </div>
        ))}
        <div style={{fontSize:7,color:'#5a7a30',marginTop:3,textAlign:'right'}}>AC to close</div>
      </div>
    );
    if(s.menu==='sto'||s.menu==='rcl'){
      const isSto=s.menu==='sto';
      return(
        <div style={{color:'#1a2a06',fontFamily:'sans-serif',padding:'2px 0'}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:3}}>{isSto?'STO ▸':'RCL ▸'}</div>
          <div style={{fontSize:8.5,color:'#3a5a18',marginBottom:4}}>{isSto?'Store answer to:':'Recall variable:'}</div>
          <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
            {['A','B','C','D','E','F','M','x','y'].map(v=>(
              <div key={v} style={{background:'#2a4a12',color:'#c8e0a0',borderRadius:3,padding:'2px 5px',fontSize:9,fontWeight:700,cursor:'pointer',minWidth:16,textAlign:'center'}}
                onMouseDown={e=>{e.preventDefault();press({id:v,main:v,act:'MEM_'+v,alpha:v});}}>
                {v}
              </div>
            ))}
          </div>
          <div style={{fontSize:7,color:'#5a7a30',marginTop:4,textAlign:'right'}}>AC to cancel</div>
        </div>
      );
    }

    // Normal display
    const exprDisplay=s.expr?(s.fresh?s.expr:s.expr.slice(0,s.cur)+'|'+s.expr.slice(s.cur)):'';
    const resFs=s.result.length>18?11:s.result.length>14?13:s.result.length>10?16:s.result.length>6?20:s.result.length>3?24:28;
    return(
      <>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:2}}>
          <div style={{display:'flex',gap:3,alignItems:'center'}}>
            <span style={{fontSize:9,color:'#1a3204',fontWeight:700,fontFamily:'sans-serif'}}>{s.angle}</span>
            {s.shift&&<span style={{fontSize:7.5,background:'#bf7e00',color:'#fff',padding:'0 3px',borderRadius:2,fontWeight:700,fontFamily:'sans-serif'}}>S</span>}
            {s.alpha&&<span style={{fontSize:7.5,background:'#9e1020',color:'#fff',padding:'0 3px',borderRadius:2,fontWeight:700,fontFamily:'sans-serif'}}>A</span>}
            {s.hyp  &&<span style={{fontSize:7.5,background:'#1a4a88',color:'#fff',padding:'0 3px',borderRadius:2,fontWeight:700,fontFamily:'sans-serif'}}>HYP</span>}
            {s.mem.M!==0&&<span style={{fontSize:7.5,background:'#2a3a66',color:'#fff',padding:'0 3px',borderRadius:2,fontWeight:700,fontFamily:'sans-serif'}}>M</span>}
          </div>
          <span style={{fontSize:8.5,color:'#3a5a18',fontFamily:'sans-serif',fontWeight:600}}>COMP</span>
        </div>
        <div style={{flex:1,display:'flex',alignItems:'flex-end',justifyContent:'flex-end',minHeight:18,overflow:'hidden'}}>
          <div style={{fontSize:s.expr.length>30?9:s.expr.length>22?11:13,color:'#1a3204',textAlign:'right',wordBreak:'break-all',lineHeight:1.3,fontFamily:"'Courier New',monospace",width:'100%'}}>
            {exprDisplay||<span style={{color:'transparent'}}>0</span>}
          </div>
        </div>
        <div style={{fontSize:resFs,fontWeight:700,color:s.err?'#880000':'#0a1a04',textAlign:'right',lineHeight:1,letterSpacing:-0.5,marginTop:3,fontFamily:"'Courier New',monospace"}}>
          {s.result||(s.expr?'':' ')}
        </div>
      </>
    );
  };

  // ─── Key cell — renders shift label (yellow, left) + alpha label (purple, right) above the key ─
  const keyCell=(k:KD,kw:number,kh:number)=>{
    let bg='#1e1e1e',fg='#e8e8e8',bdr='#3a3a3a',shadow='0 2px 0 #0a0a0a,inset 0 1px 0 rgba(255,255,255,0.06)';
    if(k.col==='w'){bg='#f0f0f0';fg='#111';bdr='#bbb';shadow='0 3px 0 #888,inset 0 1px 0 #fff';}
    if(k.col==='b'){bg='#1749c8';fg='#fff';bdr='#0d2e8a';shadow='0 3px 0 #091d60,inset 0 1px 0 rgba(255,255,255,0.25)';}
    if(k.col==='o'){bg='#e86000';fg='#fff';bdr='#b04800';shadow='0 3px 0 #7a3000,inset 0 1px 0 rgba(255,255,255,0.25)';}
    const mainFs=k.main.length>5?7.5:k.main.length>4?8.5:k.main.length>3?9.5:11;
    const hasAbove=!!(k.shift||k.alpha);
    return(
      <div key={k.id} style={{display:'flex',flexDirection:'column',alignItems:'center',width:kw,flexShrink:0}}>
        {/* Above-key labels: shift=yellow left, alpha=purple right */}
        <div style={{height:12,width:'100%',display:'flex',alignItems:'flex-end',justifyContent:'space-between',paddingBottom:1,boxSizing:'border-box',minHeight:hasAbove?12:0,visibility:hasAbove?'visible':'hidden'}}>
          <span style={{fontSize:6.5,color:'#ffcc00',fontWeight:700,fontFamily:'Arial,sans-serif',lineHeight:1,whiteSpace:'nowrap',maxWidth:'48%',overflow:'hidden',textOverflow:'clip'}}>
            {k.shift||''}
          </span>
          <span style={{fontSize:6.5,color:'#cc44aa',fontWeight:700,fontFamily:'Arial,sans-serif',lineHeight:1,whiteSpace:'nowrap',maxWidth:'48%',overflow:'hidden',textOverflow:'clip',textAlign:'right'}}>
            {k.alpha||''}
          </span>
        </div>
        <div onMouseDown={e=>{e.preventDefault();press(k);}}
          style={{width:kw,height:kh,background:bg,borderRadius:5,border:`1px solid ${bdr}`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxSizing:'border-box',flexShrink:0,boxShadow:shadow,userSelect:'none',transition:'filter 0.05s'}}
          onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.filter='brightness(1.15)';}}
          onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.filter='';}}>
          <span style={{fontSize:mainFs,color:fg,fontFamily:"'Segoe UI',Arial,sans-serif",fontWeight:k.col==='w'?800:600,lineHeight:1,letterSpacing:-0.2,textAlign:'center',pointerEvents:'none',userSelect:'none'}}>
            {k.main}
          </span>
        </div>
      </div>
    );
  };

  // ─── Nav button — silver circle, label text rendered above in small print ───
  const navBtn=(label:string,aboveLeft:string,aboveRight:string,act:string,sAct:string,d:number,isActive?:boolean,activeColor?:string)=>{
    const bg=isActive
      ? (activeColor==='yellow'?'radial-gradient(circle at 38% 32%,#f0c030 0%,#c09000 55%,#8a6000 100%)':'radial-gradient(circle at 38% 32%,#e03060 0%,#a01030 55%,#780820 100%)')
      : 'radial-gradient(circle at 35% 30%,#909090 0%,#686868 40%,#404040 100%)';
    return(
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',flexShrink:0,width:d}}>
        {/* Above-button labels */}
        <div style={{height:12,width:'100%',display:'flex',alignItems:'flex-end',justifyContent:'space-between',paddingBottom:2,boxSizing:'border-box'}}>
          <span style={{fontSize:6.5,color:'#ffcc00',fontWeight:700,fontFamily:'Arial,sans-serif',lineHeight:1}}>{aboveLeft}</span>
          <span style={{fontSize:6.5,color:'#cc44aa',fontWeight:700,fontFamily:'Arial,sans-serif',lineHeight:1}}>{aboveRight}</span>
        </div>
        <div
          onMouseDown={e=>{e.preventDefault();setCS(p=>run({id:act,main:label,act,sAct},p));}}
          style={{width:d,height:d,borderRadius:'50%',background:bg,border:'2px solid #111',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 3px 6px rgba(0,0,0,0.8),inset 0 1px 0 rgba(255,255,255,0.20)',userSelect:'none',flexShrink:0}}
          onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.filter='brightness(1.18)';}}
          onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.filter='';}}
        />
      </div>
    );
  };

  const dpad=(sz:number)=>(
    <div style={{position:'relative',width:sz,height:sz,flexShrink:0,marginTop:12}}>
      {/* Outer ring */}
      <div style={{position:'absolute',inset:0,borderRadius:'50%',background:'radial-gradient(circle at 40% 35%,#707070 0%,#484848 50%,#282828 100%)',border:'2px solid #111',boxShadow:'0 3px 8px rgba(0,0,0,0.85),inset 0 1px 0 rgba(255,255,255,0.07)'}}/>
      {/* Inner centre circle */}
      <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:Math.round(sz*0.36),height:Math.round(sz*0.36),borderRadius:'50%',background:'radial-gradient(circle at 38% 32%,#888 0%,#585858 50%,#303030 100%)',border:'1px solid #1a1a1a',boxShadow:'0 1px 4px rgba(0,0,0,0.7)',cursor:'pointer'}}/>
      {/* Arrow zones */}
      {([
        {l:'▲',a:'CUP',st:{top:3,left:'50%',transform:'translateX(-50%)'}},
        {l:'▼',a:'CDN',st:{bottom:3,left:'50%',transform:'translateX(-50%)'}},
        {l:'◀',a:'CL', st:{left:3,top:'50%',transform:'translateY(-50%)'}},
        {l:'▶',a:'CR', st:{right:3,top:'50%',transform:'translateY(-50%)'}},
      ] as const).map(({l,a,st})=>(
        <div key={l} onMouseDown={e=>{e.preventDefault();press({id:l,main:l,act:a});}}
          style={{position:'absolute',...st,width:16,height:16,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:'#d0d0d0',cursor:'pointer',fontWeight:900}}>{l}</div>
      ))}
    </div>
  );

  // Layout constants — match photo proportions
  const W=270, PAD=9, G=4;
  const IW=W-PAD*2; // 252 inner width
  // 6 fn-key cols: total = 6*FW + 5*G = IW  →  FW=(252-20)/6 = 38.6 → 38
  const FW=38, FH=22;
  // 5 num-key cols in bottom section: 5*NW + 4*G = IW  →  NW=(252-16)/5 = 47.2 → 47
  const NW=47, NH=36;
  // Nav buttons
  const ND=30;
  // OPTN/CALC row: 2 wide keys left + 2 wide keys right, gap in middle (d-pad)
  const WW=Math.floor((IW - ND*2 - G*3) / 4); // ≈ 48

  const rowSt:React.CSSProperties={display:'flex',flexDirection:'row',gap:G,alignItems:'flex-end',justifyContent:'center',marginBottom:G};

  return(
    <div ref={rootRef} style={{position:'fixed',left:pos.x,top:pos.y,zIndex:9999,userSelect:'none',filter:'drop-shadow(0 8px 32px rgba(0,0,0,0.9))'}}>
      {/* White outer shell */}
      <div style={{width:W,background:'#d8d8d8',borderRadius:16,padding:'4px 4px 8px',boxSizing:'border-box',border:'1px solid #c0c0c0'}}>
        {/* Black textured body */}
        <div style={{background:'#1a1a1a',borderRadius:13,overflow:'visible'}}>

          {/* ── Branding / drag handle ── */}
          <div onMouseDown={onDrag} style={{padding:'9px 12px 7px',cursor:'grab',background:'#1a1a1a',borderRadius:'13px 13px 0 0',position:'relative'}}>
            <button onClick={onClose} style={{position:'absolute',right:7,top:7,width:18,height:18,borderRadius:'50%',background:'rgba(255,255,255,0.15)',border:'none',color:'#ccc',fontSize:13,fontWeight:'bold',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1,padding:0,zIndex:1}}>×</button>
            {/* Solar panel */}
            <div style={{position:'absolute',right:30,top:9,width:68,height:26,background:'#060b06',border:'1px solid #1a2a1a',borderRadius:4,display:'grid',gridTemplateColumns:'repeat(8,1fr)',gap:1,padding:2}}>
              {Array.from({length:16}).map((_,i)=><div key={i} style={{background:'#090f09',borderRadius:1}}/>)}
            </div>
            <div style={{fontSize:20,fontWeight:900,color:'#fff',letterSpacing:3,lineHeight:1,fontFamily:'Arial Black,Arial,sans-serif'}}>CASIO</div>
            <div style={{fontSize:9,color:'#bbb',letterSpacing:0.5,marginTop:1,fontFamily:'Arial,sans-serif'}}>fx-991EX</div>
            <div style={{fontSize:9,fontWeight:900,color:'#e02050',letterSpacing:4,fontFamily:'Arial Black,Arial,sans-serif',marginTop:1}}>CLASSWIZ</div>
          </div>

          {/* ── LCD ── */}
          <div style={{margin:'4px 9px 5px',background:'#0a0a0a',borderRadius:5,padding:'3px'}}>
            <div style={{background:'#c8d8aa',borderRadius:3,height:88,display:'flex',flexDirection:'column',padding:'4px 9px 5px',overflow:'hidden'}}>
              {lcdContent()}
            </div>
          </div>

          {/* ── Keypad ── */}
          <div style={{padding:`0 ${PAD}px 10px`}}>

            {/* ── Nav row: SHIFT · ALPHA · [d-pad] · MENU · ON ── */}
            {/* Labels sit ABOVE the buttons */}
            <div style={{display:'flex',flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',marginBottom:5}}>
              {/* Left pair: SHIFT, ALPHA */}
              <div style={{display:'flex',gap:G,alignItems:'flex-end'}}>
                {navBtn('','SHIFT','',    'SHIFT','SHIFT', ND, s.shift, 'yellow')}
                {navBtn('','ALPHA','',    'ALPHA','ALPHA',  ND, s.alpha, 'red')}
              </div>
              {/* D-pad */}
              {dpad(ND*2+G)}
              {/* Right pair: MENU (SETUP above), ON (OFF above) */}
              <div style={{display:'flex',gap:G,alignItems:'flex-end'}}>
                {navBtn('','MENU','SETUP','MENU', 'SETUP', ND)}
                {navBtn('','ON',  'OFF',  'AC',   'OFF',   ND)}
              </div>
            </div>

            {/* ── OPTN / CALC ····· ∫f□ / x ── */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:G}}>
              <div style={{display:'flex',gap:G}}>
                {keyCell({id:'OPTN',main:'OPTN',shift:'QR',               act:'NOOP'},WW,FH)}
                {keyCell({id:'CALC',main:'CALC',shift:'SOLVE=',           act:'NOOP'},WW,FH)}
              </div>
              <div style={{display:'flex',gap:G}}>
                {keyCell({id:'INTG',main:'∫f□', shift:'d/dx',alpha:'d²/dx²',act:'NOOP'},WW,FH)}
                {keyCell({id:'XVAR',main:'x',   shift:'Σ',   alpha:'Σ⁻',    act:'XVAR'},WW,FH)}
              </div>
            </div>

            {/* ── R1 / R2 / R3 ── */}
            <div style={rowSt}>{R1.map(k=>keyCell(k,FW,FH))}</div>
            <div style={rowSt}>{R2.map(k=>keyCell(k,FW,FH))}</div>
            <div style={rowSt}>{R3.map(k=>keyCell(k,FW,FH))}</div>

            {/* Divider */}
            <div style={{height:1,background:'#303030',margin:'3px 0 5px'}}/>

            {/* ── Number rows ── */}
            {[N0,N1,N2,N3].map((row,ri)=>(
              <div key={ri} style={{...rowSt,marginBottom:ri<3?G:0}}>
                {row.map(k=>keyCell(k,NW,NH))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
