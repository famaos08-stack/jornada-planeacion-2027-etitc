/*
 * estado.js — Estado global de la aplicación y bus de eventos.
 * app.js lo inicializa; las pestañas lo leen y se suscriben a cambios ('consolidado', 'datos', 'tema').
 */
import { normalizar } from './lib/formato.js';
import { crearCalendario } from './lib/fechas.js';

export const estado = {
  datos: null,          // contenido de /data
  origenDatos: {},      // de dónde salió cada archivo
  consolidado: { formulaciones: [], pases: [], asistencia: [], meta: {} },
  sesion: { identificacion: null, validacion: null, pase: null, paso: 1 },
  indices: { dependencias: new Map(), personasPorCorreo: new Map(), calendario: null, sal: '', prefijo: 'JP27' }
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
  estado.origenDatos = origen;
  const deps = datos.dependencias?.dependencias || [];
  estado.indices.dependencias = new Map(deps.map((d) => [String(d.codigo), d]));
  const porCorreo = new Map();
  (datos.directorio?.personas || []).forEach((p) => {
    if (!p.correo) return;
    const c = p.correo.trim().toLowerCase();
    if (!porCorreo.has(c)) porCorreo.set(c, []);
    porCorreo.get(c).push(p);
  });
  estado.indices.personasPorCorreo = porCorreo;
  estado.indices.calendario = crearCalendario(datos.festivos?.festivos || []);
  estado.indices.sal = datos.config?.pase?.salFirma || 'ETITC-JP27';
  estado.indices.prefijo = datos.config?.pase?.prefijo || 'JP27';
  emitir('datos', datos);
}

export function fijarConsolidado(c) {
  estado.consolidado = { formulaciones: [], pases: [], asistencia: [], meta: {}, ...c };
  emitir('consolidado', estado.consolidado);
}

export function dependencia(codigo) { return estado.indices.dependencias.get(String(codigo)) || null; }
export function nombreDependencia(codigo) { const d = dependencia(codigo); return d ? d.nombre : `Dependencia ${codigo}`; }
export function dependencias() { return estado.datos?.dependencias?.dependencias || []; }
export function personasPorCorreo(correo) { return estado.indices.personasPorCorreo.get(String(correo || '').trim().toLowerCase()) || []; }

// Búsqueda por nombre o correo, sin tildes. Devuelve hasta "limite" personas.
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

export function umbral(nombre, defecto) { return estado.datos?.config?.umbrales?.[nombre] ?? defecto; }
