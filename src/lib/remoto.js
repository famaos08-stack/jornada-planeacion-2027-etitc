/*
 * remoto.js — Registro en línea en una hoja de cálculo de Google mediante una aplicación web de Apps Script
 * (código en apps-script/Codigo.gs y guía en docs/REGISTRO_EN_LINEA.md).
 * Cada envío se guarda primero en una cola local y se reintenta hasta que llega: si no hay internet en el
 * auditorio, nada se pierde. Sin URL configurada, el aplicativo trabaja solo con el registro del dispositivo.
 */
import { PREFIJO_LOCAL } from '../config.js';
import { estado, emitir } from '../estado.js';

const CLAVE_COLA = `${PREFIJO_LOCAL}:cola`;
let enviando = false;

const cfg = () => estado.datos?.config?.registro || {};
export const remotoConfigurado = () => Boolean(cfg().url);

function leerCola() {
  try { return JSON.parse(localStorage.getItem(CLAVE_COLA) || '[]'); } catch { return []; }
}
function escribirCola(c) {
  try { localStorage.setItem(CLAVE_COLA, JSON.stringify(c)); } catch { /* sin almacenamiento */ }
  emitir('cola', c.length);
}
export const pendientes = () => leerCola().length;

async function post(accion, datos) {
  // text/plain evita la verificación previa de CORS; Apps Script responde JSON tras su redirección.
  const r = await fetch(cfg().url, { method: 'POST', body: JSON.stringify({ accion, token: cfg().token || '', datos }), redirect: 'follow' });
  if (!r.ok) throw new Error(`El servidor de registro respondió ${r.status}.`);
  const j = await r.json().catch(() => ({ ok: true }));
  if (j && j.ok === false) throw new Error(j.error || 'El registro en línea rechazó el envío.');
  return j;
}

/*
 * enviar(accion, datos, { esperar }) — Encola y envía. Con esperar = true devuelve la respuesta del servidor
 * (por ejemplo, si el correo con el pase salió); si falla, el envío queda en la cola.
 */
export async function enviar(accion, datos, { esperar = false } = {}) {
  const item = { accion, datos, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
  if (!remotoConfigurado()) return { ok: false, local: true };
  if (!esperar) {
    escribirCola([...leerCola(), item]);
    vaciarCola();
    return { ok: true, encolado: true };
  }
  try {
    return await post(accion, datos);
  } catch (e) {
    escribirCola([...leerCola(), item]);
    return { ok: false, error: e.message, encolado: true };
  }
}

export async function vaciarCola() {
  if (enviando || !remotoConfigurado() || !navigator.onLine) return;
  enviando = true;
  try {
    let cola = leerCola();
    while (cola.length) {
      const [primero] = cola;
      try { await post(primero.accion, primero.datos); } catch { break; }
      cola = leerCola().filter((x) => x.id !== primero.id);
      escribirCola(cola);
    }
  } finally {
    enviando = false;
  }
}

/*
 * sincronizarPrevios(descargas) — Envía una sola vez las descargas que este dispositivo registró antes de que el
 * registro en línea estuviera conectado (config.json → registro.desde). No reenvía el pase por correo.
 */
const CLAVE_SINCRONIZADOS = `${PREFIJO_LOCAL}:sincronizados`;
export function sincronizarPrevios(descargas = []) {
  const desde = Date.parse(cfg().desde || '');
  if (!remotoConfigurado() || Number.isNaN(desde)) return 0;
  let hechos;
  try { hechos = new Set(JSON.parse(localStorage.getItem(CLAVE_SINCRONIZADOS) || '[]')); } catch { hechos = new Set(); }
  const previas = descargas.filter((d) => d && d.id && !hechos.has(d.id) && Date.parse(d.fecha) < desde);
  if (!previas.length) return 0;
  const cola = leerCola();
  previas.forEach((d) => {
    cola.push({ accion: 'descarga', datos: { ...d, qrPng: null, enviarCorreo: false, origen: `${d.origen || 'accion'} sincronizado` }, id: `S-${d.id}` });
    hechos.add(d.id);
  });
  escribirCola(cola);
  try { localStorage.setItem(CLAVE_SINCRONIZADOS, JSON.stringify([...hechos])); } catch { /* sin almacenamiento */ }
  vaciarCola();
  return previas.length;
}

export async function leerPanel(claveAdmin) {
  if (!remotoConfigurado()) throw new Error('El registro en línea no está configurado. Se muestran solo los datos de este dispositivo.');
  const u = new URL(cfg().url);
  u.searchParams.set('accion', 'panel');
  u.searchParams.set('clave', claveAdmin);
  const r = await fetch(u.toString(), { redirect: 'follow' });
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || 'No fue posible leer el panel.');
  return j;
}

window.addEventListener('online', () => vaciarCola());
