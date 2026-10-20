/*
 * storage.js — Persistencia desacoplada con una interfaz única:
 *   guardarFormulacion(formulacion), guardarAsistencia(registro), leerConsolidado()
 * más utilidades: guardarPase, reemplazarAsistencia, exportarRespaldo, importarRespaldo, borrarTodo.
 *
 * Tres implementaciones intercambiables desde src/config.js (PERSISTENCIA.modo):
 *   "local"      → localStorage (activa por defecto). Solo es respaldo de sesión en ESTE navegador:
 *                  hay que exportar a Excel o JSON para no perder datos.
 *   "sharepoint" → esqueleto para listas de Microsoft 365 vía Graph API (autenticación pendiente).
 *   "sheets"     → esqueleto para Google Sheets vía Apps Script Web App (autenticación pendiente).
 */
import { PERSISTENCIA } from './config.js';

// ─────────────────────────── Implementación local ───────────────────────────
function crearLocal() {
  const p = PERSISTENCIA.prefijoLocal;
  const CLAVES = { formulaciones: `${p}:formulaciones`, pases: `${p}:pases`, asistencia: `${p}:asistencia`, meta: `${p}:meta` };
  const memoria = {};
  let disponible = true;
  try { const k = `${p}:prueba`; localStorage.setItem(k, '1'); localStorage.removeItem(k); } catch { disponible = false; }

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
      const err = new Error('El navegador no tiene espacio para guardar el respaldo local. Exporte los datos ahora.');
      err.causa = e;
      throw err;
    }
  };

  return {
    modo: 'local',
    persistente: disponible,
    async guardarFormulacion(f) {
      const todas = leer(CLAVES.formulaciones, {});
      todas[f.dependencia] = f; // una formulación vigente por dependencia: la última cargada
      escribir(CLAVES.formulaciones, todas);
      return f;
    },
    async guardarPase(pase) {
      const pases = leer(CLAVES.pases, []);
      const i = pases.findIndex((x) => x.id === pase.id);
      if (i >= 0) pases[i] = pase; else pases.push(pase);
      escribir(CLAVES.pases, pases);
      return pase;
    },
    async guardarAsistencia(registro) {
      const lista = leer(CLAVES.asistencia, []);
      lista.push(registro);
      escribir(CLAVES.asistencia, lista);
      return registro;
    },
    async reemplazarAsistencia(lista) { escribir(CLAVES.asistencia, lista); },
    async leerConsolidado() {
      return {
        formulaciones: Object.values(leer(CLAVES.formulaciones, {})),
        pases: leer(CLAVES.pases, []),
        asistencia: leer(CLAVES.asistencia, []),
        meta: leer(CLAVES.meta, {})
      };
    },
    async guardarMeta(cambios) { escribir(CLAVES.meta, { ...leer(CLAVES.meta, {}), ...cambios }); },
    async exportarRespaldo() {
      const c = await this.leerConsolidado();
      return { tipo: 'respaldo-jp2027', version: 1, generado: new Date().toISOString(), ...c };
    },
    async importarRespaldo(r, { combinar = true } = {}) {
      if (!r || r.tipo !== 'respaldo-jp2027') throw new Error('El archivo no es un respaldo de la Jornada de Planeación 2027.');
      const actual = combinar ? await this.leerConsolidado() : { formulaciones: [], pases: [], asistencia: [] };
      const forms = Object.fromEntries(actual.formulaciones.map((f) => [f.dependencia, f]));
      (r.formulaciones || []).forEach((f) => {
        if (!forms[f.dependencia] || String(f.cargadoEn) > String(forms[f.dependencia].cargadoEn)) forms[f.dependencia] = f;
      });
      const pases = new Map(actual.pases.map((x) => [x.id, x]));
      (r.pases || []).forEach((x) => pases.set(x.id, x));
      const asis = new Map(actual.asistencia.map((x) => [x.clave, x]));
      (r.asistencia || []).forEach((x) => { if (!asis.has(x.clave)) asis.set(x.clave, x); });
      escribir(CLAVES.formulaciones, forms);
      escribir(CLAVES.pases, Array.from(pases.values()));
      escribir(CLAVES.asistencia, Array.from(asis.values()).sort((a, b) => String(a.hora).localeCompare(String(b.hora))));
    },
    async borrarTodo() { Object.values(CLAVES).forEach((k) => { try { localStorage.removeItem(k); } catch { delete memoria[k]; } }); }
  };
}

// ─────────────────────────── Esqueleto SharePoint ───────────────────────────
/*
 * Contrato: tres listas de SharePoint en el sitio de la OAPDI.
 *   JP27_Formulaciones: Title (código dependencia), Estado, CargadoEn, Persona, Correo, Json (texto multilínea)
 *   JP27_Pases:         Title (id del pase), Nombre, Cargo, Dependencia, Correo, Ts, Firma
 *   JP27_Asistencia:    Title (clave), Nombre, Cargo, Dependencia, Correo, Hora, Metodo
 * Puntos de integración:
 *   1) Registrar una aplicación de página única (SPA) en Entra ID con permiso delegado Sites.ReadWrite.All.
 *   2) Cargar MSAL.js desde CDN con versión fija y obtener el token (loginPopup / acquireTokenSilent).
 *   3) Llamar a Graph:
 *      POST https://graph.microsoft.com/v1.0/sites/{siteId}/lists/{listId}/items  { fields: {...} }
 *      GET  https://graph.microsoft.com/v1.0/sites/{siteId}/lists/{listId}/items?expand=fields&$top=999
 */
function crearSharePoint() {
  const cfg = PERSISTENCIA.sharepoint;
  const base = `https://graph.microsoft.com/v1.0/sites/${cfg.siteId}/lists`;
  async function obtenerToken() {
    // TODO(OAPDI): implementar con MSAL.js. No se implementa aquí la autenticación.
    throw new Error('La conexión con SharePoint aún no está configurada (falta la autenticación con Microsoft 365).');
  }
  async function crearItem(listId, fields) {
    const token = await obtenerToken();
    const r = await fetch(`${base}/${listId}/items`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
    if (!r.ok) throw new Error(`SharePoint respondió ${r.status}`);
    return r.json();
  }
  async function leerItems(listId) {
    const token = await obtenerToken();
    const r = await fetch(`${base}/${listId}/items?expand=fields&$top=999`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(`SharePoint respondió ${r.status}`);
    return (await r.json()).value.map((i) => i.fields);
  }
  return {
    modo: 'sharepoint',
    persistente: true,
    guardarFormulacion: (f) => crearItem(cfg.listas.formulaciones, { Title: f.dependencia, Estado: f.estado, CargadoEn: f.cargadoEn, Persona: f.persona?.nombre, Correo: f.persona?.correo, Json: JSON.stringify(f) }),
    guardarPase: (p) => crearItem(cfg.listas.pases, { Title: p.id, Nombre: p.n, Cargo: p.c, Dependencia: p.d, Correo: p.e, Ts: String(p.ts), Firma: p.h }),
    guardarAsistencia: (a) => crearItem(cfg.listas.asistencia, { Title: a.clave, Nombre: a.nombre, Cargo: a.cargo, Dependencia: a.dependencia, Correo: a.correo, Hora: a.hora, Metodo: a.metodo }),
    async reemplazarAsistencia() { throw new Error('TODO(OAPDI): borrar y reescribir la lista JP27_Asistencia.'); },
    async leerConsolidado() {
      const [f, p, a] = await Promise.all([leerItems(cfg.listas.formulaciones), leerItems(cfg.listas.pases), leerItems(cfg.listas.asistencia)]);
      return {
        formulaciones: f.map((x) => JSON.parse(x.Json)),
        pases: p.map((x) => ({ id: x.Title, n: x.Nombre, c: x.Cargo, d: x.Dependencia, e: x.Correo, ts: Number(x.Ts), h: x.Firma })),
        asistencia: a.map((x) => ({ clave: x.Title, nombre: x.Nombre, cargo: x.Cargo, dependencia: x.Dependencia, correo: x.Correo, hora: x.Hora, metodo: x.Metodo })),
        meta: {}
      };
    },
    async guardarMeta() {},
    async exportarRespaldo() { return { tipo: 'respaldo-jp2027', version: 1, generado: new Date().toISOString(), ...(await this.leerConsolidado()) }; },
    async importarRespaldo() { throw new Error('TODO(OAPDI): importar respaldos directamente a SharePoint.'); },
    async borrarTodo() { throw new Error('Por seguridad, el borrado en SharePoint se hace desde la lista.'); }
  };
}

// ─────────────────────────── Esqueleto Google Sheets ───────────────────────────
/*
 * Contrato con una aplicación web de Apps Script (doPost / doGet) publicada por la OAPDI:
 *   POST {webAppUrl}  body: { accion: 'formulacion'|'pase'|'asistencia', datos: {...} }  → { ok: true }
 *   GET  {webAppUrl}?accion=consolidado → { formulaciones: [], pases: [], asistencia: [] }
 * Apps Script no envía encabezados CORS en POST con JSON: se usa Content-Type text/plain para evitar
 * la verificación previa (preflight). El README incluye un ejemplo de doPost/doGet.
 */
function crearSheets() {
  const url = PERSISTENCIA.sheets.webAppUrl;
  async function enviar(accion, datos) {
    if (!url) throw new Error('La conexión con Google Sheets aún no está configurada (falta webAppUrl en src/config.js).');
    // TODO(OAPDI): definir la autenticación (por ejemplo, restringir la aplicación web al dominio itc.edu.co).
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ accion, datos }) });
    if (!r.ok) throw new Error(`Google Sheets respondió ${r.status}`);
    return r.json();
  }
  return {
    modo: 'sheets',
    persistente: true,
    guardarFormulacion: (f) => enviar('formulacion', f),
    guardarPase: (p) => enviar('pase', p),
    guardarAsistencia: (a) => enviar('asistencia', a),
    async reemplazarAsistencia(lista) { return enviar('reemplazarAsistencia', lista); },
    async leerConsolidado() {
      if (!url) throw new Error('La conexión con Google Sheets aún no está configurada.');
      const r = await fetch(`${url}?accion=consolidado`);
      if (!r.ok) throw new Error(`Google Sheets respondió ${r.status}`);
      return { meta: {}, ...(await r.json()) };
    },
    async guardarMeta() {},
    async exportarRespaldo() { return { tipo: 'respaldo-jp2027', version: 1, generado: new Date().toISOString(), ...(await this.leerConsolidado()) }; },
    async importarRespaldo() { throw new Error('TODO(OAPDI): importar respaldos a Google Sheets.'); },
    async borrarTodo() { throw new Error('Por seguridad, el borrado en Google Sheets se hace desde la hoja.'); }
  };
}

// Fábrica: devuelve la implementación elegida en config.js. Si la elegida no está lista, cae a "local".
export function crearAlmacen(modo = PERSISTENCIA.modo) {
  if (modo === 'sharepoint') return crearSharePoint();
  if (modo === 'sheets') return crearSheets();
  return crearLocal();
}

export const almacen = crearAlmacen();
