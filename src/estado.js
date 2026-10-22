/*
 * estado.js — Estado global de la aplicación y bus de eventos.
 * app.js lo inicializa; las pestañas lo leen y se suscriben a cambios ('consolidado', 'datos', 'tema', 'sesion').
 */
import { normalizar } from './lib/formato.js';
import { crearCalendario } from './lib/fechas.js';
import { similitud } from './lib/similitud.js';

export const estado = {
  datos: null,
  origenDatos: {},
  consolidado: { registros: [], pases: [], asistencia: [], meta: {} },
  // Identificación compartida por las pestañas de cargue (se conserva en sessionStorage)
  identificacion: null,
  microsoft: { activo: false, cuenta: null, perfil: null },
  indices: { dependencias: new Map(), areas: new Map(), personasPorCorreo: new Map(), calendario: null, sal: '', prefijo: 'JP27' }
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
  indexarDirectorio(datos.directorio);
  estado.indices.calendario = crearCalendario(datos.festivos?.festivos || []);
  estado.indices.sal = datos.config?.pase?.salFirma || 'ETITC-JP27';
  estado.indices.prefijo = datos.config?.pase?.prefijo || 'JP27';
  emitir('datos', datos);
}

export function indexarDirectorio(directorio) {
  const porCorreo = new Map();
  (directorio?.personas || []).forEach((p) => {
    if (!p.correo) return;
    const c = p.correo.trim().toLowerCase();
    if (!porCorreo.has(c)) porCorreo.set(c, []);
    porCorreo.get(c).push(p);
  });
  estado.indices.personasPorCorreo = porCorreo;
}

export function fijarConsolidado(c) {
  estado.consolidado = { registros: [], pases: [], asistencia: [], meta: {}, ...c };
  emitir('consolidado', estado.consolidado);
}

export function dependencia(codigo) { return estado.indices.dependencias.get(String(codigo)) || null; }
export function nombreDependencia(codigo) { const d = dependencia(codigo); return d ? d.nombre : `Dependencia ${codigo}`; }
export function dependencias() { return estado.datos?.dependencias?.dependencias || []; }
export function area(id) { return estado.indices.areas.get(id) || null; }
export function areas() { return estado.datos?.areas?.areas || []; }
export function personasPorCorreo(correo) { return estado.indices.personasPorCorreo.get(String(correo || '').trim().toLowerCase()) || []; }

// Búsqueda por nombre o correo, sin tildes.
export function buscarPersonas(texto, limite = 12) {
  const t = normalizar(texto);
  if (t.length < 2) return [];
  const partes = t.split(' ');
  return (estado.datos?.directorio?.personas || [])
    .filter((p) => {
      const base = `${normalizar(p.nombre)} ${normalizar(p.correo)} ${normalizar(p.cargo)}`;
      return partes.every((x) => base.includes(x));
    })
    .slice(0, limite);
}

// Sugiere el área funcional de una persona: dentro de su dependencia, la de nombre más parecido a su grupo o cargo.
export function sugerirArea(persona) {
  if (!persona) return null;
  const candidatas = areas().filter((a) => String(a.dependencia) === String(persona.dependencia));
  if (!candidatas.length) return null;
  const pista = `${persona.grupo || ''} ${String(persona.cargo || '').split(' - ').slice(1).join(' ')}`;
  let mejor = null;
  candidatas.forEach((a) => {
    const s = Math.max(similitud(a.nombre, persona.grupo || ''), similitud(a.nombre, pista));
    if (!mejor || s > mejor.s) mejor = { a, s };
  });
  return mejor && mejor.s >= 0.45 ? mejor.a : (candidatas.length === 1 ? candidatas[0] : null);
}

// Último registro de un tipo para un área (el vigente).
export function registroVigente(tipo, areaId) {
  return [...estado.consolidado.registros].filter((r) => r.tipo === tipo && r.area?.id === areaId)
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))[0] || null;
}

export function umbral(nombre, defecto) { return estado.datos?.config?.umbrales?.[nombre] ?? defecto; }
