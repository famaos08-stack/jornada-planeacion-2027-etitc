/*
 * cifrar-directorio.mjs — Genera data/directorio.cifrado.json a partir del directorio institucional privado.
 * Cada registro queda cifrado con una clave derivada del propio correo (PBKDF2 + AES-GCM): el aplicativo solo
 * puede mostrar el nombre, el cargo y la dependencia de quien escribe un correo que existe en el directorio.
 * No se publican extensiones ni la lista de correos (el índice es un resumen SHA-256 con sal).
 * Uso: node tools/cifrar-directorio.mjs <directorio-privado.json> [salida]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';

const [, , entrada, salida = 'data/directorio.cifrado.json'] = process.argv;
if (!entrada) { console.error('Uso: node tools/cifrar-directorio.mjs <directorio-privado.json> [salida]'); process.exit(1); }
const ITER = 60000;
const enc = new TextEncoder();
const b64 = (u8) => Buffer.from(u8).toString('base64');
const hex = (buf) => Buffer.from(buf).toString('hex');
const sal = crypto.getRandomValues(new Uint8Array(16));
const salB64 = b64(sal);

const titulo = (s) => {
  const t = String(s || '').trim();
  if (!t || t !== t.toUpperCase()) return t;
  const menores = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'en', 'a', 'al']);
  return t.toLowerCase().split(/\s+/).map((p, i) => (i > 0 && menores.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1))).join(' ');
};

async function indice(correo) {
  return hex(await crypto.subtle.digest('SHA-256', enc.encode(`${salB64}|${correo}`))).slice(0, 32);
}
async function clave(correo) {
  const base = await crypto.subtle.importKey('raw', enc.encode(correo), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: sal, iterations: ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
}

const dir = JSON.parse(readFileSync(entrada, 'utf8'));
const porCorreo = new Map();
for (const p of dir.personas || []) {
  const c = String(p.correo || '').trim().toLowerCase();
  if (!c || !c.includes('@')) continue;
  if (!porCorreo.has(c)) porCorreo.set(c, []);
  porCorreo.get(c).push({ n: p.nombre || '', c: titulo(p.cargo), d: String(p.dependencia || ''), g: p.grupo || '' });
}
const registros = {};
for (const [correo, personas] of porCorreo) {
  const k = await clave(correo);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, enc.encode(JSON.stringify(personas))));
  registros[await indice(correo)] = { iv: b64(iv), ct: b64(ct) };
}
const out = {
  version: 1,
  descripcion: 'Directorio institucional cifrado. Cada registro solo se descifra con el correo institucional exacto de la persona.',
  actualizado: dir.actualizado || new Date().toISOString().slice(0, 10),
  dominio: dir.dominioInstitucional || '@itc.edu.co',
  algoritmo: 'PBKDF2-SHA256 + AES-GCM-256',
  iteraciones: ITER,
  sal: salB64,
  total: Object.keys(registros).length,
  registros
};
writeFileSync(salida, JSON.stringify(out));
console.log(`Directorio cifrado: ${out.total} correos → ${salida}`);
