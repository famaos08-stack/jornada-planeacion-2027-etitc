/*
 * estado.js — Estado global de la aplicación y bus de eventos.
 * app.js lo inicializa; las pestañas lo leen y se suscriben a cambios ('consolidado', 'datos', 'tema', 'sesion').
 */
import { crearCalendario } from './lib/fechas.js';
import { similitud } from './lib/similitud.js';

export const estado = {
  datos: null,
  origenDatos: {},
  consolidado: { descargas: [], pases: [], asistencia: [], meta: {} },
  // Identificación de quien descargó la plantilla en este dispositivo (se conserva en localStorage)
  identificacion: null,
  // Lector del escáner activo en este dispositivo
  lector: null,
  indices: { dependencias: new Map(), areas: new Map(), calendario: null, sal: '', prefijo: 'JP27' }
};

const oyentes = new Map();
export function on(evento, fn) {
  if (!oyentes.has(evento)) oyentes.set(evento, new Set());
  oyentes.get(evento).add(fn);
  return () => oyentes.get(evento).delete(fn);
}
export function emitir(evento, carga) {
  (oyentes.get(evento) || []).forEach((fn) => {
    try { fn(carga); } catch (e) { console.error(`Error en el oyente de «${evento}»`, e); }
  });
}

export function fijarDatos(datos, origen = {}) {
  estado.datos = datos;
  estado.origenDatos = { ...estado.origenDatos, ...origen };
  estado.indices.dependencias = new Map((datos.dependencias?.dependencias || []).map((d) => [String(d.codigo), d]));
  estado.indices.areas = new Map((datos.areas?.areas || []).map((a) => [a.id, a]));
  estado.indices.calendario = crearCalendario(datos.festivos?.festivos || []);
  estado.indices.sal = datos.config?.pase?.salFirma || 'ETITC-JP27';
  estado.indices.prefijo = datos.config?.pase?.prefijo || 'JP27';
  emitir('datos', datos);
}

export function fijarConsolidado(c) {
  estado.consolidado = { descargas: [], pases: [], asistencia: [], meta: {}, ...c };
  emitir('consolidado', estado.consolidado);
}

export function dependencia(codigo) { return estado.indices.dependencias.get(String(codigo)) || null; }
export function nombreDependencia(codigo) { const d = dependencia(codigo); return d ? d.nombre : `Dependencia ${codigo}`; }
export function dependencias() { return estado.datos?.dependencias?.dependencias || []; }
export function area(id) { return estado.indices.areas.get(id) || null; }
export function areas() { return estado.datos?.areas?.areas || []; }

// Sugiere el área funcional de una persona del directorio: dentro de su dependencia, la de nombre más parecido a su grupo o cargo.
export function sugerirArea(persona) {
  if (!persona) return null;
  const candidatas = areas().filter((a) => String(a.dependencia) === String(persona.d));
  if (!candidatas.length) return null;
  const pista = `${persona.g || ''} ${String(persona.c || '').split(' - ').slice(1).join(' ')}`;
  let mejor = null;
  candidatas.forEach((a) => {
    const s = Math.max(similitud(a.nombre, persona.g || ''), similitud(a.nombre, pista));
    if (!mejor || s > mejor.s) mejor = { a, s };
  });
  return mejor && mejor.s >= 0.45 ? mejor.a : (candidatas.length === 1 ? candidatas[0] : null);
}

export function umbral(nombre, defecto) { return estado.datos?.config?.umbrales?.[nombre] ?? defecto; }
