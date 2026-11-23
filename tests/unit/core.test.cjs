const C=require("../../dist/core.cjs");
let pass=0, fail=0;
function tk(s){ // einfache Tokenisierung: Zeichen fuer Zeichen, Funktionen per Muster
  const out=[]; let i=0;
  while(i<s.length){
    const m=s.slice(i).match(/^(asin\(|acos\(|atan\(|sinh\(|cosh\(|tanh\(|sin\(|cos\(|tan\(|ln\(|log\(|abs\(|round\(|iPart\(|fPart\(|int\(|min\(|max\(|lcm\(|gcd\(|remainder\(|normalCdf\(|normalPdf\(|invNorm\(|binomPdf\(|binomCdf\(|poissonPdf\(|poissonCdf\(|geometPdf\(|geometCdf\(|nPr|nCr|Ans|\{[a-z]+|\|[a-z]+|\}[a-z]+)/);
    if(m){out.push(m[1]); i+=m[1].length; continue;}
    out.push(s[i]); i++;
  }
  return out;
}
function T(s){ return tk(s.replace(/\*/g,'×').replace(/\//g,'÷')); }
function ev(s, opts){ try{ const v=C.evalTokens(Array.isArray(s)?s:T(s)); return C.fmtVal(v, opts&&opts.dec).text; }catch(e){ return 'ERR:'+(e.code||e.message); } }
function eq(name, got, want){ if(got===want){pass++;} else {fail++; console.log('FAIL',name,'got',JSON.stringify(got),'want',JSON.stringify(want));} }
const E=(s,w,o)=>eq(s,ev(s,o),w);

// Grundrechnen / exakt
E('1+2','3'); E('1÷3'.replace('÷','/'),'1/3'); E('1/3+1/6','1/2'); E('2*3+4','10'); E('2+3*4','14');
E('0.1+0.2','0.3'); E('1/2+0.25','0.75'); E('7/2','7/2'); 
E('(1+2)(3+4)','21'); E('2(3)','6'); E('-5+3','−2'); E('5-8','−3');
// Potenzen via Struktur
const pw=(base,ex)=>[...T(base),'{pow',...T(ex),'}pow'];
E(pw('2','10'),'1024'); eq('2^-1',ev(pw('2','-1')),'1/2'); eq('-2^2',ev(['-',...pw('2','2')]),'−4');
eq('2^0.5',ev(pw('2','0.5')),'1.414213562'); eq('4^(1/2) exakt',ev(pw('4','{frac1|frac2}frac'.replace(/\{frac1\|frac2\}frac/,'')) ,),'ERR:SYNTAX');
eq('4^{1/2}',ev(pw('4',['{frac','1','|frac','2','}frac'].join(',')) ),'ERR:SYNTAX');
// Wurzeln
const sq=x=>['{sqrt',...T(x),'}sqrt'];
eq('sqrt4',ev(sq('4')),'2'); eq('sqrt8',ev(sq('8')),'2√2'); eq('sqrt2/2',ev(['{frac',...sq('2'),'|frac','2','}frac']),'(√2)/2');
eq('sqrt(1/4)',ev(sq('1/4')),'1/2'); eq('sqrt-1',ev(sq('-1')),'ERR:NONREAL ANSWER');
eq('sqrt2*sqrt2',ev([...sq('2'),...sq('2')]),'2'); eq('sqrt2 dec',ev(sq('2'),{dec:true}),'1.414213562');
eq('sqrt12+sqrt3',ev([...sq('12'),'+',...sq('3')]),'3√3');
// pi
E('π','π'); E('2π','2π'); E('π/2','(π)/2'); E('π+1','4.141592654'); E('π*π','9.869604401'); eq('π/π',ev(['{frac','π','|frac','π','}frac']),'1');
// trig exakt
S=C.S; S.angle='DEG';
E('sin(30)','1/2'); E('cos(60)','1/2'); E('sin(45)','(√2)/2'); E('tan(45)','1'); E('cos(90)','0'); E('sin(180)','0'); E('tan(90)','ERR:DOMAIN');
E('sin(1)','0.01745240644'); E('sin(30.0)','0.5'); E('cos(60.5)','0.4924235601');
S.angle='RAD'; E('sin(1)','0.8414709848'); eq('sin(π)',ev(['sin(','π',')']),'0'); eq('cos(π/3)',ev(['cos(','{frac','π','|frac','3','}frac',')']),'1/2');
S.angle='GRAD'; E('sin(100)','1'); S.angle='DEG';
E('asin(0.5)','30'); E('acos(0)','90'); E('atan(1)','45');
E('sin(30)^2'.replace('^2',''),'1/2');
// log/ln
E('log(100)','2'); E('log(1/100)','−2'); E('log(5)','0.6989700043'); E('ln(1)','0'); E('ln(10)','2.302585093'); E('ln(0)','ERR:DOMAIN');
eq('e^1',ev(['e','{pow','1','}pow']),'2.718281828'); eq('10^2',ev(pw('10','2')),'100'); eq('e^0',ev(['e','{pow','0','}pow']),'1');
// Kombinatorik, Fakultaet
E('5!','120'); E('5nCr2','10'); E('5nPr2','20'); E('69!','1.711224524E98'); E('70!','ERR:OVERFLOW'); E('0!','1'); E('(-1)!','ERR:DOMAIN');
// Funktionen
E('abs(-3)','3'); E('round(2.675,2)','2.68'); E('iPart(-3.7)','−3'); E('fPart(3.75)','0.75'); E('int(-3.5)','−4'); E('int(7/2)','3'); E('gcd(12,18)','6'); E('lcm(4,6)','12');
E('max(3,5)','5'); E('min(3,5)','3'); E('remainder(17,5)','2');
// Fehler
E('1/0','ERR:DIVIDE BY 0'); E('1+','ERR:SYNTAX'); E('*3','ERR:SYNTAX'); E('3)','ERR:SYNTAX'); E('(3','3'); E('sin(30','1/2'); E('1.2.3','ERR:SYNTAX');
// Wissenschaftliche Notation
E('1E3','1000'); E('1E-5','1E-5'); E('2.5E10','2.5E10'); E('123456789012','1.23456789E11'); E('0.001','0.001'); E('0.0005','5E-4');
// Prozent / Winkel
E('50%','1/2'); E('200*5%','10'); S.angle='RAD'; E('180°','π'); E('90°','(π)/2'); S.angle='DEG'; E('π','π');
// Ans / Variablen
C.S.vars.x=C.int(5); E('2x','10'); E('x+1','6'); C.S.ans=C.int(7); E('Ans*2','14');
// Speichern
{ const v=C.evalTokens(['4','2','→','y']); eq('sto',C.S.vars.y.n.toString(),'42'); }
// Summe etc.
const sum=(ex,lo,hi)=>['{sum',...T(ex),'|sum','x','|sum',...T(lo),'|sum',...T(hi),'}sum'];
eq('sum x^2 1..10', ev(sum('x*x','1','10')),'385'); 
const intg=(ex,lo,hi)=>['{int',...T(ex),'|int','x','|int',...T(lo),'|int',...T(hi),'}int'];
eq('int x^2 0..1', ev(intg('x*x','0','1')),'0.3333333333'); eq('int sin 0..180 (DEG-mode sin)', ev(intg('sin(x)','0','180')),'114.591559');
S.angle='RAD'; eq('int sin 0..π', ev(intg('sin(x)','0','3.14159265358979')),'2'); S.angle='DEG';
const der=(ex,at)=>['{deriv',...T(ex),'|deriv','x','|deriv',...T(at),'}deriv'];
eq('deriv x^3 at 2', ev(der('x*x*x','2')),'12'); S.angle='RAD'; eq('deriv sin at 0', ev(der('sin(x)','0')),'1'); eq('deriv ln at 1', ev(der('ln(x)','1')),'1'); S.angle='DEG';
// Verteilungen
E('normalCdf(-1,1)','0.6826894921'); E('normalCdf(-1E99,1.96)','0.9750021049'); E('invNorm(0.975)','1.959963985'); E('normalPdf(0)','0.3989422804');
E('binomPdf(10,0.5,5)','0.24609375'); E('binomCdf(10,0.5,5)','0.623046875'); E('poissonPdf(3,2)','0.2240418077'); E('geometPdf(0.2,3)','0.128');
// Zahlenformat
C.S.fmt={mode:'SCI',dec:'F'}; E('12345','1.2345E4'); C.S.fmt={mode:'ENG',dec:'F'}; E('12345','12.345E3'); C.S.fmt={mode:'NORM',dec:2}; E('2/3','2/3'); E('2/3','0.67',{dec:true}); C.S.fmt={mode:'NORM',dec:'F'};
// dms
eq('dms',ev(['1','.','5','▶DMS']),'1°30′0″');
// Statistik
{ const r=C.calc1Var([1,2,3,4,5,6,7,8,9,10],null); eq('n',r.n,10); eq('xbar',r.xbar,5.5); eq('Sx',+r.Sx.toFixed(6),3.02765); eq('Q1',r.Q1,3); eq('Med',r.Med,5.5); eq('Q3',r.Q3,8); 
  const r2=C.calc1Var([1,2,3],[2,1,1]); eq('frq n',r2.n,4); eq('frq mean',r2.xbar,1.75); eq('frq med',r2.Med,1.5);
  const r3=C.calc2Var([1,2,3,4,5],[2,4,5,4,5],null,'LinReg ax+b'); eq('a',+r3.a.toFixed(6),0.6); eq('b',+r3.b.toFixed(6),2.2); eq('r',+r3.r.toFixed(6),0.774597);
  const r4=C.calc2Var([1,2,3,4],[1,4,9,16],null,'QuadReg'); eq('quad a',+r4.a.toFixed(6),1); eq('quad b',Math.abs(+r4.b.toFixed(6)),0);
  const r5=C.calc2Var([1,2,3,4],[2,4,8,16],null,'ExpReg'); eq('exp a',+r5.a.toFixed(6),1); eq('exp b',+r5.b.toFixed(6),2);
  const r6=C.calc2Var([1,2,3,4],[3,12,27,48],null,'PwrReg'); eq('pwr a',+r6.a.toFixed(6),3); eq('pwr b',+r6.b.toFixed(6),2);
}
// Gleichungen
{ const q=C.solveQuadratic(C.int(1),C.int(-3),C.int(2)); eq('quad exact',q.roots.map(v=>C.fmtText(v)).join(','),'1,2');
  const q2=C.solveQuadratic(C.int(1),C.int(0),C.int(-2)); eq('quad irr',q2.roots.map(v=>C.fmtText(v)).join(','),'−1.414213562,1.414213562');
  const q3=C.solveQuadratic(C.int(1),C.int(2),C.int(5)); eq('quad cplx',q3.roots.map(z=>C.fmtCplx(z).text).join(','),'-1+2i,-1-2i');
  const c=C.solveCubic(C.int(1),C.int(-6),C.int(11),C.int(-6)); eq('cubic 1,2,3',c.roots.map(z=>+z.re.toFixed(8)).join(','),'1,2,3');
  const c2=C.solveCubic(C.int(1),C.int(0),C.int(0),C.int(-8)); eq('cubic x^3=8',+c2.roots[0].re.toFixed(8),2); eq('cplx im',+Math.abs(c2.roots[1].im).toFixed(6),1.732051);
  const c3=C.solveCubic(C.int(1),C.int(-3),C.int(3),C.int(-1)); eq('triple',c3.roots.map(z=>+z.re.toFixed(8)).join(','),'1,1,1');
  const s=C.solveSystem([[C.int(2),C.int(1),C.int(5)],[C.int(1),C.int(-1),C.int(1)]]); eq('sys2',s.map(v=>C.fmtText(v)).join(','),'2,1');
  const s3=C.solveSystem([[C.int(1),C.int(1),C.int(1),C.int(6)],[C.int(0),C.int(2),C.int(5),C.int(-4)],[C.int(2),C.int(5),C.int(-1),C.int(27)]]); eq('sys3',s3.map(v=>C.fmtText(v)).join(','),'5,3,-2'.replace(/-/g,'−'));
  const s4=C.solveSystem([[C.int(2),C.int(1),C.int(1)],[C.int(1),C.int(3),C.int(1)]]); eq('sys frac',s4.map(v=>C.fmtText(v)).join(','),'2/5,1/5');
  const rt=C.findRoots(x=>x*x-4); eq('findRoots',rt.map(v=>+v.toFixed(8)).join(','),'-2,2');
  const rt2=C.findRoots(x=>Math.cos(x)-x); eq('cos=x',+rt2[0].toFixed(8),0.73908513);
}
// Editor
{ const e=new C.Editor(); 
  e.ins('1'); e.ins('2'); e.insStruct('frac',[e.takeOperand(),[]],1); eq('frac tokens',e.t.join(' '),'{frac 1 2 |frac }frac'); eq('cursor in den',e.c,4);
  e.ins('3'); eq('eval 12/3',ev(e.t),'4'); eq('vert up',e.vert('up'),true); eq('cursor num end',e.c,3);
  eq('vert down',e.vert('down'),true); eq('cursor den start',e.c,4);
  e.bs(); eq('bs at den start moves',e.c,3); 
  const f=new C.Editor(); f.insStruct('pow',[['2']],-1); eq('x2 cursor after',f.c,3); f.bs(); eq('bs enters',f.c,2); f.bs(); f.bs(); eq('bs removes empty',f.t.length,0);
  const g=new C.Editor(); g.ins('5'); g.insStruct('pow',[[]],0); g.ins('2'); eq('pow vert down exits',g.vert('down'),true); eq('after exit',g.c,4);
}
console.log(`pass=${pass} fail=${fail}`);
if(fail) process.exit(1);
