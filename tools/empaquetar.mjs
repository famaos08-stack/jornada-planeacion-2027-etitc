#!/usr/bin/env node
/*
 * empaquetar.mjs — Genera los dos archivos que permiten abrir index.html con doble clic (file://):
 *   dist/app.bundle.js     → todos los módulos ES6 de src/ en un solo script clásico (sin bundler externo).
 *   data/datos.bundle.js   → copia de los JSON de /data y del logo, para cuando el navegador bloquea fetch().
 *
 * No requiere npm install: solo Node.js 18 o superior.   Uso:  node tools/empaquetar.mjs
 * Ejecútelo cada vez que cambie algo en src/ o en data/ (el flujo de GitHub Actions también lo ejecuta).
 *
 * Convenciones que el empaquetador entiende (las sigue todo el código de src/):
 *   import { a, b as c } from './ruta.js';      import * as x from './ruta.js';
 *   export function f() {} · export async function f() {} · export const x = … · export class X {}
 *   export { a, b as c };
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, relative, resolve, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRADA = join(RAIZ, 'src', 'app.js');
const rel = (p) => relative(RAIZ, p).split('\\').join('/');

const RE_IMPORT = /^import\s+([\s\S]*?)\s+from\s+['"](.+?)['"];?[ \t]*$/gm;
const RE_IMPORT_SOLO = /^import\s+['"](.+?)['"];?[ \t]*$/gm;

const modulos = new Map(); // ruta → { codigo, deps }
const visitando = new Set();
const orden = [];

function visitar(ruta, cadena = []) {
  if (modulos.has(ruta)) return;
  if (visitando.has(ruta)) throw new Error(`Dependencia circular: ${[...cadena, ruta].map(rel).join(' → ')}`);
  visitando.add(ruta);
  const codigo = readFileSync(ruta, 'utf8');
  const deps = [];
  for (const m of codigo.matchAll(RE_IMPORT)) deps.push(resolve(dirname(ruta), m[2]));
  for (const m of codigo.matchAll(RE_IMPORT_SOLO)) deps.push(resolve(dirname(ruta), m[1]));
  deps.forEach((d) => visitar(d, [...cadena, ruta]));
  visitando.delete(ruta);
  modulos.set(ruta, { codigo, deps });
  orden.push(ruta);
}

function transformar(ruta, codigo) {
  const exportados = []; // [local, exportado]
  let c = codigo.replace(RE_IMPORT, (_, especificador, desde) => {
    const clave = rel(resolve(dirname(ruta), desde));
    const e = especificador.trim();
    if (e.startsWith('* as ')) return `const ${e.slice(5).trim()} = __m[${JSON.stringify(clave)}];`;
    if (!e.startsWith('{')) throw new Error(`${rel(ruta)}: import por defecto no soportado (${e}).`);
    const nombres = e.replace(/[{}]/g, '').split(',').map((s) => s.trim()).filter(Boolean)
      .map((s) => { const [a, b] = s.split(/\s+as\s+/); return b ? `${a.trim()}: ${b.trim()}` : a.trim(); });
    return `const { ${nombres.join(', ')} } = __m[${JSON.stringify(clave)}];`;
  });
  c = c.replace(RE_IMPORT_SOLO, '');
  c = c.replace(/^export\s+((?:async\s+)?function\*?\s+([A-Za-z_$][\w$]*))/gm, (_, decl, nombre) => { exportados.push([nombre, nombre]); return decl; });
  c = c.replace(/^export\s+((?:const|let|var|class)\s+([A-Za-z_$][\w$]*))/gm, (_, decl, nombre) => { exportados.push([nombre, nombre]); return decl; });
  c = c.replace(/^export\s*\{([^}]*)\};?[ \t]*$/gm, (_, lista) => {
    lista.split(',').map((s) => s.trim()).filter(Boolean).forEach((s) => {
      const [a, b] = s.split(/\s+as\s+/);
      exportados.push([a.trim(), (b || a).trim()]);
    });
    return '';
  });
  if (/^export\s/m.test(c)) throw new Error(`${rel(ruta)}: hay una forma de export que el empaquetador no reconoce.`);
  if (/\bimport\s*\(/.test(c) || /import\.meta/.test(c)) throw new Error(`${rel(ruta)}: import() dinámico o import.meta no están soportados.`);
  const asignacion = exportados.map(([l, e]) => (l === e ? l : `${e}: ${l}`)).join(', ');
  return `${c}\nObject.assign(__m[${JSON.stringify(rel(ruta))}], { ${asignacion} });`;
}

// ───────── 1. Paquete de la aplicación ─────────
visitar(ENTRADA);
const fecha = new Date().toISOString();
const partes = orden.map((ruta) => {
  const clave = rel(ruta);
  return `// ── ${clave} ──\n__m[${JSON.stringify(clave)}] = {};\n(function () {\n${transformar(ruta, modulos.get(ruta).codigo)}\n})();`;
});
const paquete = `/*
 * app.bundle.js — ARCHIVO GENERADO por tools/empaquetar.mjs el ${fecha}. No editar a mano.
 * Contiene los ${orden.length} módulos de src/ como un script clásico para abrir la app con doble clic (file://).
 * Servida por HTTP, la aplicación usa directamente los módulos ES6 de src/ y este archivo no se carga.
 */
(function () {
'use strict';
var __m = {};
${partes.join('\n\n')}
})();
`;
mkdirSync(join(RAIZ, 'dist'), { recursive: true });
writeFileSync(join(RAIZ, 'dist', 'app.bundle.js'), paquete);
execFileSync(process.execPath, ['--check', join(RAIZ, 'dist', 'app.bundle.js')]);
console.log(`dist/app.bundle.js · ${orden.length} módulos · ${(paquete.length / 1024).toFixed(0)} KB`);

// ───────── 2. Paquete de datos ─────────
const config = readFileSync(join(RAIZ, 'src', 'config.js'), 'utf8');
const bloque = /ARCHIVOS_DATOS\s*=\s*\{([\s\S]*?)\};/.exec(config);
if (!bloque) throw new Error('No se encontró ARCHIVOS_DATOS en src/config.js');
const archivos = Array.from(bloque[1].matchAll(/(\w+)\s*:\s*'([^']+)'/g)).map((m) => [m[1], m[2]]);
const datos = { __generado: fecha, __logo: readFileSync(join(RAIZ, 'assets', 'logo-etitc.png')).toString('base64') };
for (const [clave, ruta] of archivos) {
  try {
    datos[clave] = JSON.parse(readFileSync(join(RAIZ, ...ruta.split(posix.sep)), 'utf8'));
  } catch (e) {
    console.warn(`  Aviso: no se pudo empaquetar ${ruta} (${e.message})`);
  }
}
const salidaDatos = `/*
 * datos.bundle.js — ARCHIVO GENERADO por tools/empaquetar.mjs el ${fecha}. No editar a mano.
 * Copia de los JSON de /data y del logo para abrir la aplicación con doble clic (file://).
 * Si cambia algún JSON, vuelva a ejecutar: node tools/empaquetar.mjs
 */
window.__ETITC_DATOS__ = ${JSON.stringify(datos)};
`;
writeFileSync(join(RAIZ, 'data', 'datos.bundle.js'), salidaDatos);
console.log(`data/datos.bundle.js · ${archivos.length} archivos de datos + logo · ${(salidaDatos.length / 1024).toFixed(0)} KB`);
