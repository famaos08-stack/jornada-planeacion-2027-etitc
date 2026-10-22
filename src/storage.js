/*
 * storage.js — Respaldo de sesión en este navegador (localStorage).
 * Guarda los registros de cargue, los pases emitidos y la asistencia del escáner. Con el conector
 * Microsoft 365 activo, la fuente oficial es SharePoint (lista de registro) y esto es solo un espejo local;
 * sin conector, es el único registro del dispositivo y por eso la interfaz pide exportarlo.
 * Interfaz: guardarRegistro, guardarPase, guardarAsistencia, leerConsolidado, guardarMeta,
 *           reemplazarAsistencia, exportarRespaldo, importarRespaldo, borrarTodo.
 */
import { PREFIJO_LOCAL } from './config.js';

function crearLocal() {
  const CLAVES = { registros: `${PREFIJO_LOCAL}:registros`, pases: `${PREFIJO_LOCAL}:pases`, asistencia: `${PREFIJO_LOCAL}:asistencia`, meta: `${PREFIJO_LOCAL}:meta` };
  const memoria = {};
  let disponible = true;
  try { const k = `${PREFIJO_LOCAL}:prueba`; localStorage.setItem(k, '1'); localStorage.removeItem(k); } catch { disponible = false; }

  const leer = (k, defecto) => {
    try {
      const v = disponible ? localStorage.getItem(k) : memoria[k];
      return v ? JSON.parse(v) : defecto;
    } catch { return defecto; }
  };
  const escribir = (k, v) => {
    const s = JSON.stringify(v);
    if (!disponible) { memoria[k] = s; return; }
    try { localStorage.setItem(k, s); } catch (e) {
      memoria[k] = s;
      throw new Error('El navegador no tiene espacio para guardar el respaldo local. Exporte los datos ahora.');
    }
  };
  const unir = (lista, item, clave) => {
    const i = lista.findIndex((x) => x[clave] === item[clave]);
    if (i >= 0) lista[i] = item; else lista.push(item);
    return lista;
  };

  return {
    persistente: disponible,
    async guardarRegistro(r) { escribir(CLAVES.registros, unir(leer(CLAVES.registros, []), r, 'id')); return r; },
    async guardarPase(p) { escribir(CLAVES.pases, unir(leer(CLAVES.pases, []), p, 'id')); return p; },
    async guardarAsistencia(a) { const l = leer(CLAVES.asistencia, []); l.push(a); escribir(CLAVES.asistencia, l); return a; },
    async reemplazarAsistencia(lista) { escribir(CLAVES.asistencia, lista); },
    async leerConsolidado() {
      return { registros: leer(CLAVES.registros, []), pases: leer(CLAVES.pases, []), asistencia: leer(CLAVES.asistencia, []), meta: leer(CLAVES.meta, {}) };
    },
    async guardarMeta(cambios) { escribir(CLAVES.meta, { ...leer(CLAVES.meta, {}), ...cambios }); },
    async exportarRespaldo() {
      return { tipo: 'respaldo-jp2027', version: 2, generado: new Date().toISOString(), ...(await this.leerConsolidado()) };
    },
    async importarRespaldo(r) {
      if (!r || r.tipo !== 'respaldo-jp2027') throw new Error('El archivo no es un respaldo de la Jornada de Planeación 2027.');
      const actual = await this.leerConsolidado();
      const regs = new Map(actual.registros.map((x) => [x.id, x]));
      (r.registros || []).forEach((x) => regs.set(x.id, x));
      const pases = new Map(actual.pases.map((x) => [x.id, x]));
      (r.pases || []).forEach((x) => pases.set(x.id, x));
      const asis = new Map(actual.asistencia.map((x) => [x.clave, x]));
      (r.asistencia || []).forEach((x) => { if (!asis.has(x.clave)) asis.set(x.clave, x); });
      escribir(CLAVES.registros, [...regs.values()].sort((a, b) => String(a.fecha).localeCompare(String(b.fecha))));
      escribir(CLAVES.pases, [...pases.values()]);
      escribir(CLAVES.asistencia, [...asis.values()].sort((a, b) => String(a.hora).localeCompare(String(b.hora))));
    },
    async borrarTodo() { Object.values(CLAVES).forEach((k) => { try { localStorage.removeItem(k); } catch { delete memoria[k]; } }); }
  };
}

export const almacen = crearLocal();
