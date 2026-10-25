/*
 * directorio.js — Consulta del directorio institucional cifrado (data/directorio.cifrado.json).
 * El sitio es público: el directorio no se publica en claro. Cada registro está cifrado con una clave que se
 * deriva del propio correo, así que solo quien escribe un correo exacto ve el nombre, el cargo y la dependencia
 * que le corresponden. El índice es un resumen SHA-256 con sal, de modo que tampoco se expone la lista de correos.
 */
import { estado } from '../estado.js';

const enc = new TextEncoder();
const dec = new TextDecoder();
const cache = new Map();

const deB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const aHex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');

export function cifradoDisponible() {
  return Boolean(window.crypto && window.crypto.subtle && estado.datos?.directorio?.registros);
}

export function normalizarCorreo(correo) {
  return String(correo || '').trim().toLowerCase();
}

/*
 * buscarPorCorreo(correo) → [{ n: nombre, c: cargo, d: código de dependencia, g: grupo }] o [] si no está.
 * Un buzón compartido puede devolver varias personas.
 */
export async function buscarPorCorreo(correo) {
  const c = normalizarCorreo(correo);
  if (!c.includes('@')) return [];
  if (cache.has(c)) return cache.get(c);
  const dir = estado.datos?.directorio;
  if (!cifradoDisponible()) return [];
  const indice = aHex(await crypto.subtle.digest('SHA-256', enc.encode(`${dir.sal}|${c}`))).slice(0, 32);
  const reg = dir.registros[indice];
  if (!reg) { cache.set(c, []); return []; }
  const base = await crypto.subtle.importKey('raw', enc.encode(c), 'PBKDF2', false, ['deriveKey']);
  const clave = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: deB64(dir.sal), iterations: dir.iteraciones, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  try {
    const plano = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(reg.iv) }, clave, deB64(reg.ct));
    const personas = JSON.parse(dec.decode(plano));
    cache.set(c, personas);
    return personas;
  } catch {
    cache.set(c, []);
    return [];
  }
}

export async function resumen(texto) {
  return aHex(await crypto.subtle.digest('SHA-256', enc.encode(texto)));
}
