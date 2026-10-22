/*
 * datos.js — Carga de los archivos JSON de /data al iniciar.
 * Servido por HTTP se leen con fetch. Abierto con doble clic (file://) el navegador bloquea fetch,
 * así que se usa la copia empaquetada data/datos.bundle.js (generada por tools/empaquetar.mjs) o,
 * si el usuario lo prefiere, puede elegir la carpeta /data desde el disco.
 */
import { ARCHIVOS_DATOS } from '../config.js';

const OBLIGATORIOS = ['dependencias', 'areas', 'config'];

// Estructura mínima esperada por clave; se usa para detectar archivos mal formados.
const VALIDADORES = {
  config: (d) => d && typeof d === 'object',
  directorio: (d) => Array.isArray(d?.personas),
  dependencias: (d) => Array.isArray(d?.dependencias),
  areas: (d) => Array.isArray(d?.areas),
  agenda: (d) => Array.isArray(d?.dias),
  modalidades: (d) => Array.isArray(d?.modalidades),
  contratacion: (d) => Array.isArray(d?.etapas),
  festivos: (d) => Array.isArray(d?.festivos),
  riesgos: (d) => Array.isArray(d?.riesgos)
};

const VACIOS = {
  config: {}, agenda: { dias: [], ruta: { fases: [] } }, contratacion: { etapas: [], normativa: [], reglas: [], errores2026: [], camposClave: [] },
  modalidades: { modalidades: [] }, festivos: { festivos: [] }, riesgos: { riesgos: [], procesos: [], escalas: {} }
};

async function leerJson(ruta) {
  const r = await fetch(ruta, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// Devuelve { datos, origen: {clave: 'red'|'empaquetado'|'vacio'}, problemas: [] }
export async function cargarDatos() {
  const empaquetado = window.__ETITC_DATOS__ || null;
  const datos = {};
  const origen = {};
  const problemas = [];
  await Promise.all(Object.entries(ARCHIVOS_DATOS).map(async ([clave, ruta]) => {
    try {
      const d = await leerJson(ruta);
      if (!VALIDADORES[clave](d)) throw new Error('estructura inesperada');
      datos[clave] = d; origen[clave] = 'red';
    } catch (e) {
      if (empaquetado && empaquetado[clave] && VALIDADORES[clave](empaquetado[clave])) {
        datos[clave] = empaquetado[clave]; origen[clave] = 'empaquetado';
      } else {
        datos[clave] = VACIOS[clave] ?? null; origen[clave] = 'vacio';
        problemas.push({ clave, ruta, motivo: e.message });
      }
    }
  }));
  const faltan = OBLIGATORIOS.filter((k) => origen[k] === 'vacio');
  if (faltan.length) {
    const err = new Error(`No se pudieron leer los archivos obligatorios: ${faltan.map((k) => ARCHIVOS_DATOS[k]).join(', ')}.`);
    err.problemas = problemas;
    throw err;
  }
  return { datos, origen, problemas, fechaEmpaquetado: empaquetado ? empaquetado.__generado : null };
}

// Lectura de la carpeta /data elegida por el usuario (útil en file:// tras actualizar los JSON).
export async function cargarDesdeArchivos(listaArchivos, datosActuales) {
  const porNombre = new Map(Array.from(listaArchivos).map((f) => [f.name.toLowerCase(), f]));
  const nuevos = { ...datosActuales };
  const leidos = [];
  for (const [clave, ruta] of Object.entries(ARCHIVOS_DATOS)) {
    const archivo = porNombre.get(ruta.split('/').pop().toLowerCase());
    if (!archivo) continue;
    const d = JSON.parse(await archivo.text());
    if (!VALIDADORES[clave](d)) throw new Error(`${archivo.name} no tiene la estructura esperada.`);
    nuevos[clave] = d;
    leidos.push(archivo.name);
  }
  return { datos: nuevos, leidos };
}
