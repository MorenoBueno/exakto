// Baut dist/index.html (eine einzige, eigenstaendige Datei) und dist/core.cjs (fuer Tests).
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = f => readFileSync(join(root, 'src', f), 'utf8');
const dist = join(root, 'dist');
mkdirSync(dist, { recursive: true });

const files = ['num.js', 'parse.js', 'editor.js', 'graphcore.js', 'eng.js', 'linalg.js', 'ui1.js', 'ui2.js', 'ui3.js', 'graph.js', 'tools.js', 'fmenu.js', 'settings.js'];
const js = files.map(src).join('\n');
const html = src('template.html').replace('/*CSS*/', () => src('style.css')).replace('/*JS*/', () => js);
if (/\/\*(CSS|JS)\*\//.test(html)) throw new Error('Platzhalter nicht ersetzt');
writeFileSync(join(dist, 'index.html'), html);

// Kern (ohne Oberflaeche) fuer Node-Tests
const exportsList = `S, CalcError, X, F, int, isRat, isInt, isZero, toNum, add, sub, mul, div, pow, neg, cmp, sqrtV,
  fmtVal, fmtText, fmtFloat, fmtAutoNum, fmtApprox, fmtCplx, floatHTML, fracHTML, radHTML, esc, MINUS, ratApprox,
  buildTree, isOpen, isSep, isClose, isPlain, kindOf, isVarTok, VARS, KIND_PARTS, VERT, structInfo,
  Editor, evalTokens, compileTokens, evalAst, parseTokens, CONSTS, CONVS, FN, cdfNorm, invNormStd,
  calc1Var, calc2Var, REG_TYPES, solveQuadratic, solveCubic, solveSystem, findRoots, expandData, toBig, ev, withLocal,
  curveFn, niceStep, sampleCurve, fitY, curveRoots, curveIntersections, curveExtrema, withDeadline, integrate, ENG,
  czMk, czAdd, czSub, czMul, czDiv, czConj, czAbs, czArgUnit, czFromPolar, czPowInt, czPow, czSqrt, czExp, czLn, czFmt,
  matAdd, matSub, matMul, matScale, matT, matDet, matInv, matRank, matRref, matTrace, matPow,
  vecAdd, vecSub, vecDot, vecCross, vecNorm, vecUnit, vecAngle, vecProj, polar, rect, primeFactors, divisors, divRem, setOp, setOf`;
const core = `const CORE=(function(){'use strict';\n${['num.js', 'parse.js', 'editor.js', 'graphcore.js', 'eng.js', 'linalg.js'].map(src).join('\n')}\nreturn { ${exportsList} };\n})();\nmodule.exports = CORE;\n`;
writeFileSync(join(dist, 'core.cjs'), core);

// statische Dateien (PWA, Icons)
const pub = join(root, 'public');
if (existsSync(pub)) cpSync(pub, dist, { recursive: true });
console.log(`dist/index.html  ${(html.length / 1024).toFixed(0)} KB`);
