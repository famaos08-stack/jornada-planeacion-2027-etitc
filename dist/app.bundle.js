/*
 * app.bundle.js — ARCHIVO GENERADO por tools/empaquetar.mjs el 2026-10-20T17:56:26.551Z. No editar a mano.
 * Contiene los 29 módulos de src/ como un script clásico para abrir la app con doble clic (file://).
 * Servida por HTTP, la aplicación usa directamente los módulos ES6 de src/ y este archivo no se carga.
 */
(function () {
'use strict';
var __m = {};
// ── src/config.js ──
__m["src/config.js"] = {};
(function () {
/*
 * config.js — Banderas de funcionalidad, modo de persistencia, rutas de datos y paleta.
 * Es el único archivo que se edita para encender funciones opcionales o cambiar dónde se guardan los datos.
 */

// Banderas de funcionalidad. Con mapaRiesgos en true la pestaña aparece sin tocar nada más.
const FEATURES = { mapaRiesgos: false };

// Persistencia: "local" (localStorage, por defecto) | "sharepoint" | "sheets".
// Las dos últimas son esqueletos: ver src/storage.js y la sección "Conectar SharePoint" del README.
const PERSISTENCIA = {
  modo: 'local',
  prefijoLocal: 'etitc-jp27',
  sharepoint: {
    // TODO(OAPDI): completar al registrar la aplicación en Entra ID (Azure AD).
    tenantId: '',
    clientId: '',
    siteId: '',            // GET https://graph.microsoft.com/v1.0/sites/{host}:/sites/{ruta}
    listas: {
      formulaciones: '',   // id de la lista "JP27_Formulaciones"
      asistencia: '',      // id de la lista "JP27_Asistencia"
      pases: ''            // id de la lista "JP27_Pases"
    }
  },
  sheets: {
    // TODO(OAPDI): URL de la implementación de Apps Script publicada como aplicación web.
    webAppUrl: ''
  }
};

// Archivos de datos que se cargan al inicio (todos en /data).
const ARCHIVOS_DATOS = {
  config: 'data/config.json',
  directorio: 'data/directorio.json',
  dependencias: 'data/dependencias.json',
  agenda: 'data/agenda.json',
  metas: 'data/metas.json',
  hitos: 'data/hitos.json',
  modalidades: 'data/modalidades.json',
  festivos: 'data/festivos.json',
  riesgos: 'data/riesgos.json'
};

// Paleta: lee los tokens CSS en tiempo de ejecución para que las gráficas sigan el tema activo.
const PALETA = {
  leer(nombre, respaldo) {
    try {
      const v = getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
      return v || respaldo;
    } catch { return respaldo; }
  },
  categorica() {
    return ['--cat-1', '--cat-2', '--cat-3', '--cat-4'].map((v, i) => this.leer(v, ['#188b58', '#3f6fb0', '#c08a1e', '#b85a7a'][i]));
  },
  procesos() {
    return {
      estrategico: this.leer('--proc-estrategico', '#188b58'),
      misional: this.leer('--proc-misional', '#3f6fb0'),
      apoyo: this.leer('--proc-apoyo', '#c08a1e'),
      evaluacion: this.leer('--proc-evaluacion', '#b85a7a')
    };
  }
};

// Nombres legibles de los tipos de proceso del mapa institucional.
const TIPOS_PROCESO = {
  estrategico: 'Estratégico',
  misional: 'Misional',
  apoyo: 'De apoyo',
  evaluacion: 'De evaluación'
};

const TIPOS_PROCESO_PLURAL = {
  estrategico: 'Procesos estratégicos',
  misional: 'Procesos misionales',
  apoyo: 'Procesos de apoyo',
  evaluacion: 'Procesos de evaluación'
};

Object.assign(__m["src/config.js"], { FEATURES, PERSISTENCIA, ARCHIVOS_DATOS, PALETA, TIPOS_PROCESO, TIPOS_PROCESO_PLURAL });
})();

// ── src/storage.js ──
__m["src/storage.js"] = {};
(function () {
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
const { PERSISTENCIA } = __m["src/config.js"];

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
function crearAlmacen(modo = PERSISTENCIA.modo) {
  if (modo === 'sharepoint') return crearSharePoint();
  if (modo === 'sheets') return crearSheets();
  return crearLocal();
}

const almacen = crearAlmacen();

Object.assign(__m["src/storage.js"], { crearAlmacen, almacen });
})();

// ── src/lib/formato.js ──
__m["src/lib/formato.js"] = {};
(function () {
/*
 * formato.js — Formato de cifras en español de Colombia y normalización de texto para comparaciones.
 */

const fmtMoneda = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const fmtNumero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });
const fmtEntero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

function moneda(v) { return fmtMoneda.format(Number(v) || 0); }
function numero(v) { return fmtNumero.format(Number(v) || 0); }
function entero(v) { return fmtEntero.format(Math.round(Number(v) || 0)); }
function porcentaje(v, decimales = 0) { return `${(Number(v) || 0).toFixed(decimales).replace('.', ',')} %`; }

// Moneda compacta para cifras grandes: $ 1.250 M, $ 3,4 mil M
function monedaCompacta(v) {
  const n = Number(v) || 0;
  const abs = Math.abs(n);
  if (abs >= 1e12) return `$ ${fmtNumero.format(+(n / 1e12).toFixed(1))} B`;
  if (abs >= 1e9) return `$ ${fmtNumero.format(+(n / 1e9).toFixed(1))} mil M`;
  if (abs >= 1e6) return `$ ${fmtEntero.format(n / 1e6)} M`;
  return moneda(n);
}

function formatear(v, formato) {
  switch (formato) {
    case 'moneda': return moneda(v);
    case 'monedaCompacta': return monedaCompacta(v);
    case 'porcentaje': return porcentaje(v);
    case 'numero': return numero(v);
    default: return entero(v);
  }
}

// Convierte "$ 12.500.000,50", "12500000", 12500000 → número. Devuelve null si no es interpretable.
function aNumero(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  let s = String(v).trim().replace(/[$\s]|COP/gi, '');
  if (!s) return null;
  const tieneComa = s.includes(',');
  const puntos = (s.match(/\./g) || []).length;
  if (tieneComa) s = s.replace(/\./g, '').replace(',', '.');          // 12.500.000,50
  else if (puntos > 1 || /^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ''); // 12.500.000
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// Minúsculas, sin tildes, espacios simples. Para comparar encabezados y nombres.
function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ@.\-\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function plural(n, singular, pluralTexto) {
  return `${entero(n)} ${n === 1 ? singular : (pluralTexto || `${singular}s`)}`;
}

// Iniciales para avatares.
function iniciales(nombre) {
  const partes = String(nombre || '').replace(/^hno\.?\s+/i, '').split(/\s+/).filter(Boolean);
  return partes.slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';
}

// Convierte texto en MAYÚSCULAS del directorio a formato título legible (cargos).
function tituloLegible(texto) {
  const s = String(texto || '').trim();
  if (!s || s !== s.toUpperCase()) return s;
  const menores = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'en', 'a', 'al']);
  return s.toLowerCase().split(/\s+/).map((p, i) => (i > 0 && menores.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1))).join(' ');
}

Object.assign(__m["src/lib/formato.js"], { moneda, numero, entero, porcentaje, monedaCompacta, formatear, aNumero, normalizar, plural, iniciales, tituloLegible });
})();

// ── src/lib/fechas.js ──
__m["src/lib/fechas.js"] = {};
(function () {
/*
 * fechas.js — Fechas y días hábiles de Colombia.
 * Las fechas se manejan como cadenas ISO "AAAA-MM-DD" y se convierten a Date al mediodía local
 * para evitar saltos por zona horaria. El cálculo replica la función DIA.LAB / WORKDAY de Excel:
 * se excluyen sábados, domingos y los festivos de data/festivos.json.
 */

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function deISO(iso) {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
}

function aISO(fecha) {
  if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) return null;
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function hoyISO() { return aISO(new Date()); }

function sumarDias(iso, n) {
  const f = deISO(iso);
  f.setDate(f.getDate() + n);
  return aISO(f);
}

function diferenciaDias(desdeISO, hastaISO) {
  return Math.round((deISO(hastaISO) - deISO(desdeISO)) / 86400000);
}

// "jueves 19 de noviembre de 2026"
function fechaLarga(iso, { conDia = true } = {}) {
  const f = deISO(iso);
  if (!f) return '';
  return `${conDia ? `${DIAS[f.getDay()]} ` : ''}${f.getDate()} de ${MESES[f.getMonth()]} de ${f.getFullYear()}`;
}

// "19 nov 2026"
function fechaCorta(iso) {
  const f = deISO(iso);
  if (!f) return '';
  return `${f.getDate()} ${MESES_CORTOS[f.getMonth()]} ${f.getFullYear()}`;
}

function nombreMes(indice, corto = false) { return (corto ? MESES_CORTOS : MESES)[indice]; }

function horaAMinutos(hhmm) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm || ''));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

function horaLegible(fecha = new Date()) {
  return fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// Trimestre (1–4) de una fecha ISO.
function trimestreDe(iso) {
  const f = deISO(iso);
  return f ? Math.floor(f.getMonth() / 3) + 1 : null;
}

// Interpreta "T1", "1", "Trimestre 2", "I", "Q3", "tercer trimestre" → 1..4
function leerTrimestre(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor === 'number') return valor >= 1 && valor <= 4 ? Math.trunc(valor) : null;
  const s = String(valor).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const romanos = { iv: 4, iii: 3, ii: 2, i: 1 };
  let m = /(?:^|[^a-z])(?:t|q|trim(?:estre)?\.?)\s*([1-4])\b/.exec(s) || /^([1-4])$/.exec(s) || /\b([1-4])\b/.exec(s);
  if (m) return Number(m[1]);
  m = /^(?:trimestre\s+)?(iv|iii|ii|i)$/.exec(s);
  if (m) return romanos[m[1]];
  const palabras = { primer: 1, primero: 1, segundo: 2, tercer: 3, tercero: 3, cuarto: 4 };
  for (const [p, n] of Object.entries(palabras)) if (s.includes(p)) return n;
  return null;
}

// Fecha de Excel (Date de SheetJS, número de serie o texto) → ISO
function leerFechaExcel(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  if (valor instanceof Date) {
    if (Number.isNaN(valor.getTime())) return null;
    // SheetJS entrega la fecha en UTC a medianoche; sumamos 12 h para no caer en el día anterior.
    const f = new Date(valor.getTime() + 12 * 3600 * 1000);
    return aISO(new Date(f.getUTCFullYear(), f.getUTCMonth(), f.getUTCDate(), 12));
  }
  if (typeof valor === 'number' && valor > 20000 && valor < 80000) {
    const base = Date.UTC(1899, 11, 30);
    const f = new Date(base + Math.round(valor) * 86400000);
    return aISO(new Date(f.getUTCFullYear(), f.getUTCMonth(), f.getUTCDate(), 12));
  }
  const s = String(valor).trim();
  let m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(s);
  if (m) return aISO(new Date(+m[1], +m[2] - 1, +m[3], 12));
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/.exec(s);
  if (m) return aISO(new Date(+m[3], +m[2] - 1, +m[1], 12));
  return null;
}

// Serie de Excel para una fecha ISO (usado al escribir festivos en la plantilla).
function serieExcel(iso) {
  const f = deISO(iso);
  return Math.round((Date.UTC(f.getFullYear(), f.getMonth(), f.getDate()) - Date.UTC(1899, 11, 30)) / 86400000);
}

// Calendario hábil con los festivos cargados.
function crearCalendario(festivos = []) {
  const mapa = new Map(festivos.map((f) => [f.fecha, f.nombre]));
  const anios = new Set(festivos.map((f) => Number(String(f.fecha).slice(0, 4))));

  const esFestivo = (iso) => mapa.has(iso);
  const esFinDeSemana = (iso) => { const d = deISO(iso).getDay(); return d === 0 || d === 6; };
  const esHabil = (iso) => !esFinDeSemana(iso) && !esFestivo(iso);

  // Equivalente a WORKDAY(inicio, n, festivos): n puede ser negativo. Con n = 0 devuelve la misma fecha.
  function sumarHabiles(iso, n) {
    let actual = iso;
    let restantes = Math.abs(n);
    const paso = n < 0 ? -1 : 1;
    while (restantes > 0) {
      actual = sumarDias(actual, paso);
      if (esHabil(actual)) restantes -= 1;
    }
    return actual;
  }

  function habilesEntre(desdeISO, hastaISO) {
    if (!desdeISO || !hastaISO) return 0;
    let n = 0; let actual = desdeISO;
    const paso = desdeISO <= hastaISO ? 1 : -1;
    while (actual !== hastaISO) {
      actual = sumarDias(actual, paso);
      if (esHabil(actual)) n += paso;
    }
    return n;
  }

  return {
    esFestivo,
    nombreFestivo: (iso) => mapa.get(iso) || '',
    esFinDeSemana,
    esHabil,
    sumarHabiles,
    habilesEntre,
    cubreAnio: (anio) => anios.has(Number(anio)),
    anios: () => Array.from(anios).sort()
  };
}

// Camino de contratación hacia atrás: desde la fecha en que se necesita operando hasta la radicación.
// Devuelve la fecha de radicación y las etapas con sus fechas de inicio y fin (todas hábiles).
function caminoContratacion(calendario, modalidad, fechaOperacionISO) {
  const etapas = (modalidad.etapas || []).filter((e) => Number(e.diasHabiles) > 0);
  const total = etapas.length
    ? etapas.reduce((s, e) => s + Number(e.diasHabiles), 0)
    : Number(modalidad.diasHabilesTotales) || 0;
  const radicacion = calendario.sumarHabiles(fechaOperacionISO, -total);
  let acumulado = 0;
  const detalle = etapas.map((e) => {
    const inicio = calendario.sumarHabiles(radicacion, acumulado);
    acumulado += Number(e.diasHabiles);
    const fin = calendario.sumarHabiles(radicacion, acumulado);
    return { nombre: e.nombre, diasHabiles: Number(e.diasHabiles), inicio, fin };
  });
  return { radicacion, totalHabiles: total, etapas: detalle, operacion: fechaOperacionISO };
}

Object.assign(__m["src/lib/fechas.js"], { deISO, aISO, hoyISO, sumarDias, diferenciaDias, fechaLarga, fechaCorta, nombreMes, horaAMinutos, horaLegible, trimestreDe, leerTrimestre, leerFechaExcel, serieExcel, crearCalendario, caminoContratacion });
})();

// ── src/estado.js ──
__m["src/estado.js"] = {};
(function () {
/*
 * estado.js — Estado global de la aplicación y bus de eventos.
 * app.js lo inicializa; las pestañas lo leen y se suscriben a cambios ('consolidado', 'datos', 'tema').
 */
const { normalizar } = __m["src/lib/formato.js"];
const { crearCalendario } = __m["src/lib/fechas.js"];

const estado = {
  datos: null,          // contenido de /data
  origenDatos: {},      // de dónde salió cada archivo
  consolidado: { formulaciones: [], pases: [], asistencia: [], meta: {} },
  sesion: { identificacion: null, validacion: null, pase: null, paso: 1 },
  indices: { dependencias: new Map(), personasPorCorreo: new Map(), calendario: null, sal: '', prefijo: 'JP27' }
};

const oyentes = new Map();
function on(evento, fn) {
  if (!oyentes.has(evento)) oyentes.set(evento, new Set());
  oyentes.get(evento).add(fn);
  return () => oyentes.get(evento).delete(fn);
}
function emitir(evento, carga) {
  (oyentes.get(evento) || []).forEach((fn) => {
    try { fn(carga); } catch (e) { console.error(`Error en el oyente de «${evento}»`, e); }
  });
}

function fijarDatos(datos, origen = {}) {
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

function fijarConsolidado(c) {
  estado.consolidado = { formulaciones: [], pases: [], asistencia: [], meta: {}, ...c };
  emitir('consolidado', estado.consolidado);
}

function dependencia(codigo) { return estado.indices.dependencias.get(String(codigo)) || null; }
function nombreDependencia(codigo) { const d = dependencia(codigo); return d ? d.nombre : `Dependencia ${codigo}`; }
function dependencias() { return estado.datos?.dependencias?.dependencias || []; }
function personasPorCorreo(correo) { return estado.indices.personasPorCorreo.get(String(correo || '').trim().toLowerCase()) || []; }

// Búsqueda por nombre o correo, sin tildes. Devuelve hasta "limite" personas.
function buscarPersonas(texto, limite = 12) {
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

function umbral(nombre, defecto) { return estado.datos?.config?.umbrales?.[nombre] ?? defecto; }

Object.assign(__m["src/estado.js"], { on, emitir, fijarDatos, fijarConsolidado, dependencia, nombreDependencia, dependencias, personasPorCorreo, buscarPersonas, umbral, estado });
})();

// ── src/lib/datos.js ──
__m["src/lib/datos.js"] = {};
(function () {
/*
 * datos.js — Carga de los archivos JSON de /data al iniciar.
 * Servido por HTTP se leen con fetch. Abierto con doble clic (file://) el navegador bloquea fetch,
 * así que se usa la copia empaquetada data/datos.bundle.js (generada por tools/empaquetar.mjs) o,
 * si el usuario lo prefiere, puede elegir la carpeta /data desde el disco.
 */
const { ARCHIVOS_DATOS } = __m["src/config.js"];

const OBLIGATORIOS = ['directorio', 'dependencias'];

// Estructura mínima esperada por clave; se usa para detectar archivos mal formados.
const VALIDADORES = {
  config: (d) => d && typeof d === 'object',
  directorio: (d) => Array.isArray(d?.personas),
  dependencias: (d) => Array.isArray(d?.dependencias),
  agenda: (d) => Array.isArray(d?.bloques),
  metas: (d) => Array.isArray(d?.metasInstitucionales),
  hitos: (d) => Array.isArray(d?.hitos),
  modalidades: (d) => Array.isArray(d?.modalidades),
  festivos: (d) => Array.isArray(d?.festivos),
  riesgos: (d) => Array.isArray(d?.riesgos)
};

const VACIOS = {
  config: {}, agenda: { fecha: '', sede: '', bloques: [] }, metas: { metasInstitucionales: [] }, hitos: { hitos: [] },
  modalidades: { modalidades: [] }, festivos: { festivos: [] }, riesgos: { riesgos: [], procesos: [], escalas: {} }
};

async function leerJson(ruta) {
  const r = await fetch(ruta, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// Devuelve { datos, origen: {clave: 'red'|'empaquetado'|'vacio'}, problemas: [] }
async function cargarDatos() {
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
async function cargarDesdeArchivos(listaArchivos, datosActuales) {
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

Object.assign(__m["src/lib/datos.js"], { cargarDatos, cargarDesdeArchivos });
})();

// ── src/ui/dom.js ──
__m["src/ui/dom.js"] = {};
(function () {
/*
 * dom.js — Utilidades mínimas de DOM: escape de HTML, selección, creación desde plantilla y delegación de eventos.
 */

const MAPA_ESCAPE = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

// Escapa texto para insertarlo de forma segura en plantillas HTML.
function esc(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor).replace(/[&<>"']/g, (c) => MAPA_ESCAPE[c]);
}

function qs(selector, raiz = document) { return raiz.querySelector(selector); }
function qsa(selector, raiz = document) { return Array.from(raiz.querySelectorAll(selector)); }

// Crea un elemento a partir de una cadena HTML (devuelve el primer nodo).
function crear(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

// Delegación de eventos: on(raiz, 'click', '[data-accion]', fn)
function on(raiz, tipo, selector, fn) {
  raiz.addEventListener(tipo, (ev) => {
    const objetivo = ev.target.closest(selector);
    if (objetivo && raiz.contains(objetivo)) fn(ev, objetivo);
  });
}

// Identificador único corto para enlazar etiquetas y controles ARIA.
let contador = 0;
function uid(prefijo = 'id') { contador += 1; return `${prefijo}-${contador}`; }

// Espera un cuadro de animación (útil para disparar transiciones CSS).
function siguienteCuadro() { return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); }

function prefiereMenosMovimiento() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

Object.assign(__m["src/ui/dom.js"], { esc, qs, qsa, crear, on, uid, siguienteCuadro, prefiereMenosMovimiento });
})();

// ── src/ui/iconos.js ──
__m["src/ui/iconos.js"] = {};
(function () {
/*
 * iconos.js — Íconos SVG inline (trazo currentColor, 24x24). Nada de emojis como íconos.
 */

const TRAZOS = {
  agenda: '<rect x="3" y="4.5" width="18" height="16" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4M7.5 13.5h3M7.5 17h6"/>',
  formulacion: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
  metas: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  necesidades: '<path d="M21 8 12 3 3 8l9 5z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/>',
  adquisiciones: '<path d="M3 4h2.5l2.2 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2"/><circle cx="10" cy="20.5" r="1.2"/><circle cx="17" cy="20.5" r="1.2"/>',
  riesgos: '<path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z"/><path d="M12 8v5M12 16.5v.5"/>',
  escaner: '<path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M7 12h10"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 14h3v3M21 14v.01M14 21h3M20 18v3M17 17.5V21"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  luna: '<path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"/>',
  descargar: '<path d="M12 3v12M7 10l5 5 5-5M4 19h16"/>',
  subir: '<path d="M12 16V4M7 9l5-5 5 5M4 19h16"/>',
  excel: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 12l5 6M14 12l-5 6"/>',
  pdf: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M8.5 17v-4h1.5a1.3 1.3 0 0 1 0 2.6H8.5M13 13v4h1a2 2 0 0 0 0-4z"/>',
  imagen: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
  calendarioMas: '<rect x="3" y="4.5" width="18" height="16" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4M12 12.5v5M9.5 15h5"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  checkCirculo: '<circle cx="12" cy="12" r="9"/><path d="m8 12.3 2.8 2.8L16.5 9.5"/>',
  alerta: '<path d="M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4.5M12 17v.01"/>',
  bloqueo: '<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5v.01"/>',
  cerrar: '<path d="M6 6l12 12M18 6 6 18"/>',
  derecha: '<path d="m9 6 6 6-6 6"/>',
  abajo: '<path d="m6 9 6 6 6-6"/>',
  flecha: '<path d="M4 12h15M13 6l6 6-6 6"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  personas: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 20a6.5 6.5 0 0 0-3-5.5"/>',
  persona: '<circle cx="12" cy="8" r="4"/><path d="M4 20.5a8 8 0 0 1 16 0"/>',
  lugar: '<path d="M12 21s7-6.2 7-11.5a7 7 0 1 0-14 0C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  buscar: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  filtro: '<path d="M3 5h18l-7 8.5V20l-4-2v-4.5z"/>',
  copiar: '<rect x="8" y="8" width="13" height="13" rx="2.5"/><path d="M16 8V5.5A2.5 2.5 0 0 0 13.5 3h-8A2.5 2.5 0 0 0 3 5.5v8A2.5 2.5 0 0 0 5.5 16H8"/>',
  correo: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>',
  edificio: '<path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 9h2a2 2 0 0 1 2 2v10M2 21h20M8 7h4M8 11h4M8 15h4"/>',
  insignia: '<circle cx="12" cy="9" r="6"/><path d="m8.5 13.8-1.5 7.2 5-2.7 5 2.7-1.5-7.2"/>',
  alianza: '<path d="m11 17 2 2a1.4 1.4 0 0 0 2-2M14 14l2.5 2.5a1.4 1.4 0 0 0 2-2l-3.9-3.9a2.8 2.8 0 0 0-4 0l-.9.9a1.4 1.4 0 0 1-2-2l2.8-2.8a5.2 5.2 0 0 1 6.6-.6l.4.3a3 3 0 0 0 1.8.6H21M21 4v9h-2M3 4l-.1 9h1.6l5.8 5.8a1.4 1.4 0 0 0 2-2M3 5h7"/>',
  capas: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  camara: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
  teclado: '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
  basura: '<path d="M4 7h16M10 11v6M14 11v6M5.5 7l1 12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
  baseDatos: '<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  tendencia: '<path d="m3 17 6-6 4 4 8-8M15 7h6v6"/>',
  ojo: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  dinero: '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.8"/><path d="M6 9.5v5M18 9.5v5"/>',
  enlace: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
  bandera: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  refrescar: '<path d="M20 11a8 8 0 0 0-14.7-4.4L3 9M4 13a8 8 0 0 0 14.7 4.4L21 15M3 4v5h5M21 20v-5h-5"/>',
  carpeta: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  guardar: '<path d="M5 3h11l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M7 3v5h8M7 21v-7h10v7"/>',
  menos: '<path d="M5 12h14"/>',
  usuarioCheck: '<circle cx="9" cy="8" r="4"/><path d="M2 20.5a7 7 0 0 1 12.5-4.3M15.5 18.5l2 2 4-4.5"/>',
  chispa: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  diana: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12 21 3M17 3h4v4"/>'
};

// Devuelve el SVG del ícono con la clase indicada. aria-hidden porque siempre va con texto visible o etiqueta.
function icono(nombre, clase = 'icon') {
  const d = TRAZOS[nombre] || TRAZOS.info;
  return `<svg class="${clase}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
}

Object.assign(__m["src/ui/iconos.js"], { icono });
})();

// ── src/ui/toast.js ──
__m["src/ui/toast.js"] = {};
(function () {
/*
 * toast.js — Avisos flotantes accesibles (aria-live). Todo error de la aplicación termina aquí, nunca en pantalla blanca.
 */
const { esc } = __m["src/ui/dom.js"];
const { icono } = __m["src/ui/iconos.js"];

let region = null;

function asegurarRegion() {
  if (region && document.body.contains(region)) return region;
  region = document.createElement('div');
  region.className = 'toast-region';
  region.setAttribute('role', 'status');
  region.setAttribute('aria-live', 'polite');
  document.body.appendChild(region);
  return region;
}

const ICONOS = { ok: 'checkCirculo', info: 'info', warn: 'alerta', error: 'bloqueo' };

// toast({ tipo: 'ok'|'info'|'warn'|'error', titulo, mensaje, duracion })
function toast({ tipo = 'info', titulo = '', mensaje = '', duracion } = {}) {
  try {
    const r = asegurarRegion();
    const el = document.createElement('div');
    el.className = `toast toast-${tipo}`;
    if (tipo === 'error') el.setAttribute('role', 'alert');
    el.innerHTML = `${icono(ICONOS[tipo] || 'info')}
      <div>${titulo ? `<div class="toast-title">${esc(titulo)}</div>` : ''}<div class="toast-msg">${esc(mensaje)}</div></div>
      <button class="btn btn-ghost btn-icon btn-sm" type="button" aria-label="Cerrar aviso">${icono('cerrar', 'icon-sm')}</button>`;
    const cerrar = () => {
      if (!el.isConnected) return;
      el.classList.add('is-leaving');
      setTimeout(() => el.remove(), 260);
    };
    el.querySelector('button').addEventListener('click', cerrar);
    r.appendChild(el);
    // Máximo cuatro avisos simultáneos
    while (r.children.length > 4) r.firstElementChild.remove();
    const ms = duracion ?? (tipo === 'error' ? 9000 : tipo === 'warn' ? 7000 : 4200);
    if (ms > 0) setTimeout(cerrar, ms);
    return cerrar;
  } catch (e) {
    console.error('No se pudo mostrar el aviso', e, titulo, mensaje);
    return () => {};
  }
}

// Atajo para errores inesperados: mensaje claro al usuario y detalle técnico solo en consola.
function toastError(titulo, error, mensaje = 'Intente de nuevo. Si el problema continúa, recargue la página.') {
  console.error(titulo, error);
  return toast({ tipo: 'error', titulo, mensaje });
}

Object.assign(__m["src/ui/toast.js"], { toast, toastError });
})();

// ── src/lib/libs.js ──
__m["src/lib/libs.js"] = {};
(function () {
/*
 * libs.js — Verifica qué librerías externas (CDN) cargaron y avisa con claridad qué funciones quedan limitadas.
 * La aplicación nunca depende de que todas carguen: cada función consulta su librería antes de usarla.
 */
const { toast } = __m["src/ui/toast.js"];

const LIBRERIAS = {
  xlsx: { nombre: 'SheetJS (Excel)', presente: () => Boolean(window.XLSX && window.XLSX.utils), afecta: 'plantilla, cargue y exportación a Excel' },
  qrcode: { nombre: 'qrcode', presente: () => Boolean(window.QRCode && window.QRCode.toDataURL), afecta: 'generación del QR del pase' },
  escaner: { nombre: 'html5-qrcode', presente: () => Boolean(window.Html5Qrcode), afecta: 'lectura de QR con cámara (queda el registro manual)' },
  chart: { nombre: 'Chart.js', presente: () => Boolean(window.Chart), afecta: 'gráficas (se muestran como tablas)' },
  jspdf: { nombre: 'jsPDF', presente: () => Boolean(window.jspdf && window.jspdf.jsPDF), afecta: 'exportación a PDF' },
  html2canvas: { nombre: 'html2canvas', presente: () => Boolean(window.html2canvas), afecta: 'descarga del pase como imagen' }
};

function libreriaPresente(clave) { return LIBRERIAS[clave] ? LIBRERIAS[clave].presente() : false; }

// Espera a que terminen de cargar los scripts diferidos (máximo unos segundos).
function esperarLibrerias(maxMs = 6000) {
  return new Promise((resolver) => {
    const listo = () => Object.values(LIBRERIAS).every((l) => l.presente());
    if (listo() || document.readyState === 'complete') { resolver(); return; }
    const fin = setTimeout(resolver, maxMs);
    window.addEventListener('load', () => { clearTimeout(fin); resolver(); }, { once: true });
  });
}

function avisarLibreriasFaltantes() {
  const faltantes = Object.values(LIBRERIAS).filter((l) => !l.presente());
  if (!faltantes.length) return [];
  toast({
    tipo: 'warn',
    titulo: faltantes.length === Object.keys(LIBRERIAS).length ? 'Sin conexión a las librerías externas' : 'Algunas funciones quedaron limitadas',
    mensaje: `No cargó: ${faltantes.map((l) => `${l.nombre} (${l.afecta})`).join('; ')}. El resto de la aplicación funciona. Revise la conexión y recargue.`,
    duracion: 12000
  });
  return faltantes;
}

Object.assign(__m["src/lib/libs.js"], { libreriaPresente, esperarLibrerias, avisarLibreriasFaltantes, LIBRERIAS });
})();

// ── src/lib/export.js ──
__m["src/lib/export.js"] = {};
(function () {
/*
 * export.js — Descargas y exportaciones: archivos, portapapeles, logo institucional,
 * captura de elementos a PNG/PDF (html2canvas + jsPDF), agenda en PDF y calendario .ics para Outlook.
 */
const { fechaLarga, horaLegible, hoyISO } = __m["src/lib/fechas.js"];

function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function descargarTexto(texto, nombre, mime = 'text/plain;charset=utf-8') {
  descargarBlob(new Blob([texto], { type: mime }), nombre);
}

async function copiarTexto(texto) {
  try {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(texto); return true; }
  } catch { /* se intenta el método alterno */ }
  const ta = document.createElement('textarea');
  ta.value = texto;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  ta.remove();
  return ok;
}

// Logo como bytes (para Excel) y data URL (para PDF, canvas y pase). En file:// se usa la copia empaquetada.
let logoCache = null;
async function obtenerLogo() {
  if (logoCache) return logoCache;
  const empaquetado = window.__ETITC_DATOS__ && window.__ETITC_DATOS__.__logo;
  try {
    if (location.protocol === 'file:' && empaquetado) throw new Error('usar empaquetado');
    const r = await fetch('assets/logo-etitc.png', { cache: 'force-cache' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const bytes = new Uint8Array(await r.arrayBuffer());
    logoCache = { bytes, dataUrl: `data:image/png;base64,${aBase64(bytes)}` };
  } catch {
    if (empaquetado) {
      const bin = atob(empaquetado);
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      logoCache = { bytes, dataUrl: `data:image/png;base64,${empaquetado}` };
    } else {
      logoCache = { bytes: null, dataUrl: null };
    }
  }
  return logoCache;
}

function aBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function pdfDisponible() { return Boolean(window.jspdf && window.jspdf.jsPDF); }
function capturaDisponible() { return Boolean(window.html2canvas); }

async function capturarElemento(el, escala = 3, fondo = null) {
  if (!capturaDisponible()) throw new Error('La librería html2canvas no cargó: no es posible generar la imagen.');
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  return window.html2canvas(el, { scale: escala, backgroundColor: fondo, useCORS: true, logging: false });
}

async function elementoAPng(el, nombre) {
  const canvas = await capturarElemento(el);
  await new Promise((resolver, rechazar) => canvas.toBlob((b) => {
    if (!b) { rechazar(new Error('No se pudo crear la imagen.')); return; }
    descargarBlob(b, nombre); resolver();
  }, 'image/png'));
}

async function elementoAPdf(el, nombre) {
  if (!pdfDisponible()) throw new Error('La librería jsPDF no cargó: no es posible generar el PDF.');
  // Fondo blanco y JPEG: el PDF queda liviano para adjuntar por correo
  const canvas = await capturarElemento(el, 2.5, '#ffffff');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'portrait', compress: true });
  const anchoPag = doc.internal.pageSize.getWidth();
  const altoPag = doc.internal.pageSize.getHeight();
  const margen = 12;
  const proporcion = canvas.height / canvas.width;
  let ancho = anchoPag - margen * 2;
  let alto = ancho * proporcion;
  if (alto > altoPag - margen * 2) { alto = altoPag - margen * 2; ancho = alto / proporcion; }
  doc.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', (anchoPag - ancho) / 2, (altoPag - alto) / 2, ancho, alto);
  doc.setProperties({ title: 'Pase de acceso — Jornada de Planeación 2027', author: 'ETITC — OAPDI' });
  doc.save(nombre);
}

// ───────── Agenda en PDF (texto nativo, nítido y liviano) ─────────
async function agendaAPdf({ agenda, bloques, filtroTexto = '', nombre = 'Agenda_JP2027.pdf', etiquetaModalidad }) {
  if (!pdfDisponible()) throw new Error('La librería jsPDF no cargó: no es posible generar el PDF.');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const logo = await obtenerLogo();
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 16;
  const verde9 = [11, 77, 59]; const verde7 = [24, 139, 88]; const tinta = [19, 51, 42]; const gris = [109, 132, 124]; const linea = [215, 228, 220];
  let y = M;

  const encabezado = () => {
    doc.setFillColor(...verde9);
    doc.rect(0, 0, W, 4, 'F');
    if (logo.dataUrl) doc.addImage(logo.dataUrl, 'PNG', M, 9, 30, 30 * (383 / 522));
    doc.setTextColor(...tinta); doc.setFont('helvetica', 'bold'); doc.setFontSize(17);
    doc.text('Jornada de Planeación 2027', M + 36, 17);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...gris);
    doc.text('Oficina Asesora de Planeación y Desarrollo Institucional · ETITC', M + 36, 23);
    const ancho = W - M - (M + 36);
    const ajustar = (t) => { const l = doc.splitTextToSize(t, ancho); return l.length > 1 ? `${l[0].replace(/\s+\S*$/, '')}…` : l[0]; };
    doc.text(ajustar(`${fechaLarga(agenda.fecha)} · ${agenda.sede || ''}`), M + 36, 28.5);
    if (filtroTexto) doc.text(ajustar(`Bloques para: ${filtroTexto}`), M + 36, 34);
    if (agenda.provisional) {
      doc.setFillColor(255, 244, 220); doc.setDrawColor(138, 90, 0);
      doc.roundedRect(W - M - 36, 10, 36, 8, 2, 2, 'FD');
      doc.setTextColor(138, 90, 0); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
      doc.text('PROVISIONAL', W - M - 18, 15.4, { align: 'center' });
    }
    y = 46;
    doc.setDrawColor(...linea); doc.line(M, y - 4, W - M, y - 4);
  };
  const pie = (n) => {
    doc.setFontSize(8); doc.setTextColor(...gris); doc.setFont('helvetica', 'normal');
    doc.text(`Generado el ${fechaLarga(hoyISO())}, ${horaLegible()}`, M, H - 8);
    doc.text(`Página ${n}`, W - M, H - 8, { align: 'right' });
  };

  let pagina = 1;
  encabezado();
  bloques.forEach((b) => {
    const anchoTexto = W - M * 2 - 34;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5);
    const titulo = doc.splitTextToSize(b.titulo, anchoTexto);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    const lineas = [];
    if (b.modulador) lineas.push(...doc.splitTextToSize(`Modula: ${b.modulador}${b.cargo ? ` — ${b.cargo}` : ''}`, anchoTexto));
    lineas.push(...doc.splitTextToSize(`Modalidad: ${etiquetaModalidad(b)}${b.sala ? ` · ${b.sala}` : ''}`, anchoTexto));
    if (b.entregable) lineas.push(...doc.splitTextToSize(`Entregable: ${b.entregable}`, anchoTexto));
    if (b.insumo) lineas.push(...doc.splitTextToSize(`Insumo: ${b.insumo}`, anchoTexto));
    lineas.push(...doc.splitTextToSize(`Convocadas: ${b.convocadasTexto}`, anchoTexto));
    const alto = 6 + titulo.length * 5.4 + lineas.length * 4.3 + 4;
    if (y + alto > H - 16) { pie(pagina); doc.addPage(); pagina += 1; encabezado(); }
    doc.setFillColor(...(b.modalidad === 'plenaria' ? verde9 : verde7));
    doc.roundedRect(M, y, 2.2, alto - 4, 1, 1, 'F');
    doc.setTextColor(...tinta); doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text(b.inicio, M + 6, y + 5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...gris);
    doc.text(b.fin, M + 6, y + 10);
    doc.setTextColor(...tinta); doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5);
    doc.text(titulo, M + 30, y + 5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(61, 89, 80);
    doc.text(lineas, M + 30, y + 5 + titulo.length * 5.4);
    y += alto;
    doc.setDrawColor(...linea); doc.line(M + 30, y - 2, W - M, y - 2);
    y += 2;
  });
  pie(pagina);
  doc.setProperties({ title: 'Agenda — Jornada de Planeación 2027', author: 'ETITC — OAPDI' });
  doc.save(nombre);
}

// ───────── Calendario .ics (Outlook, Google, Apple) ─────────
const escIcs = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

function plegar(linea) {
  // Pliega a 75 octetos según RFC 5545 (cuidando caracteres multibyte)
  const enc = new TextEncoder();
  if (enc.encode(linea).length <= 75) return linea;
  const partes = [];
  let actual = '';
  for (const ch of linea) {
    if (enc.encode(actual + ch).length > (partes.length ? 74 : 75)) { partes.push(actual); actual = ch; } else actual += ch;
  }
  partes.push(actual);
  return partes.join('\r\n ');
}

function generarICS({ agenda, bloques, convocadasTexto }) {
  const f = String(agenda.fecha || '').replace(/-/g, '');
  const ahora = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const hora = (h) => `${h.replace(':', '')}00`;
  const lineas = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ETITC//Jornada de Planeacion 2027//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:Jornada de Planeación 2027', 'X-WR-TIMEZONE:America/Bogota',
    'BEGIN:VTIMEZONE', 'TZID:America/Bogota', 'BEGIN:STANDARD', 'DTSTART:19700101T000000', 'TZOFFSETFROM:-0500', 'TZOFFSETTO:-0500', 'TZNAME:COT', 'END:STANDARD', 'END:VTIMEZONE'
  ];
  bloques.forEach((b) => {
    const desc = [
      b.modulador ? `Modula: ${b.modulador}${b.cargo ? ` (${b.cargo})` : ''}` : '',
      `Modalidad: ${b.modalidad === 'mesa' ? 'Mesa de trabajo' : 'Plenaria'}`,
      b.insumo ? `Traer: ${b.insumo}` : '',
      b.entregable ? `Entregable: ${b.entregable}` : '',
      `Convocadas: ${convocadasTexto(b)}`,
      agenda.provisional ? 'AGENDA PROVISIONAL' : ''
    ].filter(Boolean).join('\n');
    lineas.push(
      'BEGIN:VEVENT',
      `UID:${b.id}-${f}@jornada-planeacion-2027.etitc`,
      `DTSTAMP:${ahora}`,
      `DTSTART;TZID=America/Bogota:${f}T${hora(b.inicio)}`,
      `DTEND;TZID=America/Bogota:${f}T${hora(b.fin)}`,
      `SUMMARY:${escIcs(`JP2027 · ${b.titulo}`)}`,
      `LOCATION:${escIcs([b.sala, agenda.sede].filter(Boolean).join(' — '))}`,
      `DESCRIPTION:${escIcs(desc)}`,
      `CATEGORIES:${b.modalidad === 'mesa' ? 'Mesa de trabajo' : 'Plenaria'}`,
      'STATUS:CONFIRMED', 'TRANSP:OPAQUE',
      'BEGIN:VALARM', 'TRIGGER:-PT10M', 'ACTION:DISPLAY', `DESCRIPTION:${escIcs(b.titulo)}`, 'END:VALARM',
      'END:VEVENT'
    );
  });
  lineas.push('END:VCALENDAR');
  return lineas.map(plegar).join('\r\n') + '\r\n';
}

Object.assign(__m["src/lib/export.js"], { descargarBlob, descargarTexto, copiarTexto, obtenerLogo, pdfDisponible, capturaDisponible, capturarElemento, elementoAPng, elementoAPdf, agendaAPdf, generarICS });
})();

// ── src/ui/tabs.js ──
__m["src/ui/tabs.js"] = {};
(function () {
/*
 * tabs.js — Pestañas accesibles (patrón WAI-ARIA Tabs): roles, foco itinerante,
 * flechas izquierda/derecha, Inicio/Fin y activación con Enter o Espacio.
 */
const { esc } = __m["src/ui/dom.js"];
const { icono } = __m["src/ui/iconos.js"];

// definiciones: [{ id, titulo, tituloCorto, icono }]
function crearPestanas(contenedor, definiciones, alSeleccionar) {
  contenedor.setAttribute('role', 'tablist');
  contenedor.setAttribute('aria-label', 'Secciones de la jornada');
  contenedor.innerHTML = definiciones.map((d) => `
    <button type="button" class="tab" role="tab" id="tab-${esc(d.id)}" aria-controls="panel-${esc(d.id)}" aria-selected="false" tabindex="-1" data-tab="${esc(d.id)}">
      ${icono(d.icono, 'icon-sm')}<span class="tab-label">${esc(d.tituloCorto || d.titulo)}</span>
    </button>`).join('');

  const botones = () => Array.from(contenedor.querySelectorAll('[role="tab"]'));

  contenedor.addEventListener('click', (ev) => {
    const b = ev.target.closest('[role="tab"]');
    if (b) alSeleccionar(b.dataset.tab, { foco: false });
  });
  contenedor.addEventListener('keydown', (ev) => {
    const lista = botones();
    const i = lista.indexOf(document.activeElement);
    if (i < 0) return;
    let j = null;
    if (ev.key === 'ArrowRight') j = (i + 1) % lista.length;
    else if (ev.key === 'ArrowLeft') j = (i - 1 + lista.length) % lista.length;
    else if (ev.key === 'Home') j = 0;
    else if (ev.key === 'End') j = lista.length - 1;
    if (j === null) return;
    ev.preventDefault();
    lista[j].focus();
    // Activación automática al mover con flechas (las pestañas cargan rápido)
    alSeleccionar(lista[j].dataset.tab, { foco: false });
  });

  return {
    marcar(id) {
      botones().forEach((b) => {
        const activo = b.dataset.tab === id;
        b.setAttribute('aria-selected', activo ? 'true' : 'false');
        b.tabIndex = activo ? 0 : -1;
        if (activo) b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      });
      // Sin pestaña activa (vista escáner): la primera sigue siendo alcanzable con Tab
      if (!botones().some((b) => b.dataset.tab === id) && botones()[0]) botones()[0].tabIndex = 0;
    },
    insignia(id, texto) {
      const b = contenedor.querySelector(`[data-tab="${id}"]`);
      if (!b) return;
      let s = b.querySelector('.tab-badge');
      if (!texto) { if (s) s.remove(); return; }
      if (!s) { s = document.createElement('span'); s.className = 'tab-badge'; b.appendChild(s); }
      s.textContent = texto;
    }
  };
}

Object.assign(__m["src/ui/tabs.js"], { crearPestanas });
})();

// ── src/ui/modal.js ──
__m["src/ui/modal.js"] = {};
(function () {
/*
 * modal.js — Modal centrado y panel lateral deslizante con trampa de foco, cierre con Escape y retorno del foco.
 */
const { esc } = __m["src/ui/dom.js"];
const { icono } = __m["src/ui/iconos.js"];

const ENFOCABLES = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function abrir({ tipo, titulo, subtitulo = '', contenido = '', pie = '', alCerrar }) {
  const previo = document.activeElement;
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  const panel = document.createElement('div');
  const idTitulo = `dlg-${Date.now()}`;
  panel.className = tipo === 'drawer' ? 'drawer' : 'modal';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', idTitulo);
  const cab = tipo === 'drawer' ? 'drawer' : 'modal';
  panel.innerHTML = `
    <div class="${cab}-head">
      <div><h2 id="${idTitulo}">${esc(titulo)}</h2>${subtitulo ? `<p class="muted mb-0">${esc(subtitulo)}</p>` : ''}</div>
      <button type="button" class="btn btn-ghost btn-icon" data-cerrar aria-label="Cerrar">${icono('cerrar')}</button>
    </div>
    <div class="${cab}-body"></div>
    ${pie ? `<div class="${cab}-foot"></div>` : ''}`;
  const cuerpo = panel.querySelector(`.${cab}-body`);
  if (typeof contenido === 'string') cuerpo.innerHTML = contenido; else cuerpo.appendChild(contenido);
  if (pie) {
    const p = panel.querySelector(`.${cab}-foot`);
    if (typeof pie === 'string') p.innerHTML = pie; else p.appendChild(pie);
  }
  document.body.append(overlay, panel);
  document.body.style.overflow = 'hidden';

  const cerrar = () => {
    overlay.classList.remove('is-open');
    panel.classList.remove('is-open');
    document.removeEventListener('keydown', teclado, true);
    document.body.style.overflow = '';
    setTimeout(() => { overlay.remove(); panel.remove(); }, 380);
    if (previo && previo.focus) previo.focus();
    if (alCerrar) alCerrar();
  };
  const teclado = (ev) => {
    if (ev.key === 'Escape') { ev.preventDefault(); cerrar(); return; }
    if (ev.key !== 'Tab') return;
    const f = Array.from(panel.querySelectorAll(ENFOCABLES)).filter((n) => n.offsetParent !== null);
    if (!f.length) return;
    const primero = f[0];
    const ultimo = f[f.length - 1];
    if (ev.shiftKey && document.activeElement === primero) { ev.preventDefault(); ultimo.focus(); }
    else if (!ev.shiftKey && document.activeElement === ultimo) { ev.preventDefault(); primero.focus(); }
  };
  document.addEventListener('keydown', teclado, true);
  overlay.addEventListener('click', cerrar);
  panel.querySelectorAll('[data-cerrar]').forEach((b) => b.addEventListener('click', cerrar));
  requestAnimationFrame(() => requestAnimationFrame(() => {
    overlay.classList.add('is-open');
    panel.classList.add('is-open');
    const objetivo = panel.querySelector('[data-autofoco]') || panel.querySelector('[data-cerrar]');
    if (objetivo) objetivo.focus();
  }));
  return { panel, cuerpo, cerrar };
}

function abrirModal(opciones) { return abrir({ ...opciones, tipo: 'modal' }); }
function abrirPanel(opciones) { return abrir({ ...opciones, tipo: 'drawer' }); }

// Confirmación simple con promesa.
function confirmar({ titulo, mensaje, aceptar = 'Aceptar', cancelar = 'Cancelar', peligro = false }) {
  return new Promise((resolver) => {
    let respondido = false;
    const pie = document.createElement('div');
    pie.className = 'btn-group';
    pie.innerHTML = `<button type="button" class="btn" data-r="no">${esc(cancelar)}</button>
      <button type="button" class="btn ${peligro ? 'btn-danger' : 'btn-primary'}" data-r="si" data-autofoco>${esc(aceptar)}</button>`;
    const m = abrirModal({ titulo, contenido: `<p>${esc(mensaje)}</p>`, pie, alCerrar: () => { if (!respondido) resolver(false); } });
    pie.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-r]');
      if (!b) return;
      respondido = true;
      resolver(b.dataset.r === 'si');
      m.cerrar();
    });
  });
}

Object.assign(__m["src/ui/modal.js"], { abrirModal, abrirPanel, confirmar });
})();

// ── src/ui/skeleton.js ──
__m["src/ui/skeleton.js"] = {};
(function () {
/*
 * skeleton.js — Marcadores de carga (skeletons) mientras llegan los datos.
 */

function skeletonPestana() {
  return `<div class="container" aria-busy="true" aria-label="Cargando contenido">
    <div class="skeleton skeleton-title" style="margin-top:32px"></div>
    <div class="grid-4" style="margin-bottom:20px">
      ${'<div class="skeleton skeleton-card" style="height:110px"></div>'.repeat(4)}
    </div>
    <div class="grid-2">
      <div class="skeleton skeleton-card" style="height:280px"></div>
      <div class="skeleton skeleton-card" style="height:280px"></div>
    </div>
  </div>`;
}

function skeletonLineas(n = 4) {
  return Array.from({ length: n }, (_, i) => `<div class="skeleton skeleton-line" style="width:${92 - i * 11}%"></div>`).join('');
}

Object.assign(__m["src/ui/skeleton.js"], { skeletonPestana, skeletonLineas });
})();

// ── src/ui/cards.js ──
__m["src/ui/cards.js"] = {};
(function () {
/*
 * cards.js — Tarjetas de cifra, estados vacíos, cadena lógica, aparición de tarjetas y números que se animan.
 */
const { esc, prefiereMenosMovimiento } = __m["src/ui/dom.js"];
const { icono } = __m["src/ui/iconos.js"];
const { formatear } = __m["src/lib/formato.js"];

// Tarjeta de cifra con número animado. formato: 'entero' | 'moneda' | 'monedaCompacta' | 'porcentaje'
function tarjetaCifra({ etiqueta, valor = 0, formato = 'entero', pie = '', iconoNombre = 'tendencia', alerta = false, id = '' }) {
  return `<div class="stat reveal${alerta ? ' is-alert' : ''}" ${id ? `id="${esc(id)}"` : ''}>
    <span class="stat-icon">${icono(iconoNombre)}</span>
    <span class="stat-label">${esc(etiqueta)}</span>
    <span class="stat-value" data-contar="${Number(valor) || 0}" data-formato="${formato}">${formatear(0, formato)}</span>
    ${pie ? `<span class="stat-foot">${pie}</span>` : ''}
  </div>`;
}

// Estado vacío diseñado: nunca una tabla en blanco.
function estadoVacio({ titulo, texto, iconoNombre = 'capas', accion = '' }) {
  return `<div class="empty reveal">
    <div class="empty-art">${icono(iconoNombre)}</div>
    <h3>${esc(titulo)}</h3>
    <p>${texto}</p>
    ${accion ? `<div class="btn-group" style="margin-top:8px">${accion}</div>` : ''}
  </div>`;
}

// La cadena lógica que gobierna la aplicación, visible donde importa.
function cadenaLogica({ activo = '', incluirRiesgos = false } = {}) {
  const nodos = [
    ['metas', 'Metas 2027'],
    ['accion', 'Plan de acción'],
    ['necesidades', 'Plan de necesidades'],
    ['adquisiciones', 'Plan de adquisiciones']
  ];
  if (incluirRiesgos) nodos.push(['riesgos', 'Mapa de riesgos']);
  const flecha = `<span class="chain-arrow" aria-hidden="true">${icono('flecha', 'icon-sm')}</span>`;
  return `<ol class="chain" aria-label="Cadena lógica de la planeación" style="list-style:none;margin:0;padding:0">
    ${nodos.map(([k, t], i) => `${i ? `<li aria-hidden="true" style="display:contents">${flecha}</li>` : ''}<li class="chain-node${activo === k ? ' is-active' : ''}${k === 'riesgos' ? ' is-optional' : ''}"${activo === k ? ' aria-current="step"' : ''}><span class="chain-num">${i + 1}</span>${esc(t)}</li>`).join('')}
  </ol>`;
}

// Anima un número desde su valor actual hasta el destino.
function animarNumero(el, destino, duracion = 900) {
  const formato = el.dataset.formato || 'entero';
  const desde = Number(el.dataset.actual || 0);
  const hasta = Number(destino) || 0;
  el.dataset.contar = String(hasta);
  if (prefiereMenosMovimiento() || desde === hasta) {
    el.textContent = formatear(hasta, formato);
    el.dataset.actual = String(hasta);
    return;
  }
  const t0 = performance.now();
  const paso = (t) => {
    const p = Math.min(1, (t - t0) / duracion);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = formatear(desde + (hasta - desde) * e, formato);
    if (p < 1) requestAnimationFrame(paso);
    else el.dataset.actual = String(hasta);
  };
  requestAnimationFrame(paso);
}

let observador = null;
function obtenerObservador() {
  if (observador || !('IntersectionObserver' in window)) return observador;
  observador = new IntersectionObserver((entradas) => {
    entradas.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target;
      observador.unobserve(el);
      if (el.classList.contains('reveal')) el.classList.add('is-visible');
      if (el.dataset.contar !== undefined) animarNumero(el, el.dataset.contar);
    });
  }, { threshold: 0.15 });
  return observador;
}

// Activa la aparición de tarjetas y los números animados dentro de una raíz.
function activarAnimaciones(raiz) {
  const obs = obtenerObservador();
  const elementos = raiz.querySelectorAll('.reveal:not(.is-visible), [data-contar]');
  elementos.forEach((el, i) => {
    if (!obs) {
      el.classList.add('is-visible');
      if (el.dataset.contar !== undefined) animarNumero(el, el.dataset.contar, 0);
      return;
    }
    if (el.classList.contains('reveal')) el.style.transitionDelay = `${Math.min(i, 8) * 40}ms`;
    obs.observe(el);
  });
}

// Barras horizontales HTML (desgloses por dependencia), coloreadas por tipo de proceso.
function barrasHorizontales(items, { formato = 'entero' } = {}) {
  const max = Math.max(1, ...items.map((i) => i.valor));
  return `<div class="hbars">${items.map((i) => `
    <div class="hbar ${i.clase || ''}">
      <span class="hbar-label">${i.proc ? '<span class="proc-dot"></span>' : ''}<span title="${esc(i.etiqueta)}">${esc(i.etiqueta)}</span></span>
      <span class="hbar-value">${formatear(i.valor, formato)}</span>
      <span class="hbar-track" aria-hidden="true"><span style="width:${Math.max(2, (i.valor / max) * 100)}%"></span></span>
    </div>`).join('')}</div>`;
}

Object.assign(__m["src/ui/cards.js"], { tarjetaCifra, estadoVacio, cadenaLogica, animarNumero, activarAnimaciones, barrasHorizontales });
})();

// ── src/tabs/agenda.js ──
__m["src/tabs/agenda.js"] = {};
(function () {
/*
 * agenda.js — Pestaña 1: línea de tiempo vertical del día.
 * Marca el bloque en curso según la hora del dispositivo (con indicador pulsante), atenúa los pasados,
 * expande el detalle al hacer clic, filtra por dependencia y exporta a PDF y a .ics (Outlook).
 */
const { estado, dependencia, dependencias } = __m["src/estado.js"];
const { esc, on } = __m["src/ui/dom.js"];
const { icono } = __m["src/ui/iconos.js"];
const { toast, toastError } = __m["src/ui/toast.js"];
const { estadoVacio, activarAnimaciones } = __m["src/ui/cards.js"];
const { fechaLarga, hoyISO, horaAMinutos, diferenciaDias } = __m["src/lib/fechas.js"];
const { agendaAPdf, generarICS, descargarTexto, pdfDisponible } = __m["src/lib/export.js"];
const { TIPOS_PROCESO } = __m["src/config.js"];

const TEMAS = {
  metas: 'Metas 2027', accion: 'Plan de acción', necesidades: 'Plan de necesidades', adquisiciones: 'Plan de adquisiciones',
  cierre: 'Cierre y compromisos', logistica: 'Logística', receso: 'Receso', riesgos: 'Mapa de riesgos'
};

const etiquetaModalidad = (b) => (b.modalidad === 'mesa' ? 'Mesa de trabajo' : 'Plenaria');
const esTodas = (b) => (b.dependencias || []).some((d) => String(d).toLowerCase() === 'todas');

function convocadasTexto(b) {
  if (esTodas(b)) return 'Todas las dependencias';
  return (b.dependencias || []).map((c) => { const d = dependencia(c); return d ? `${d.sigla} (${d.codigo})` : c; }).join(', ');
}

let raiz = null;
let reloj = null;
const filtro = { dep: '', ensayo: false };

function minutosAhora() { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); }

// Estado temporal de un bloque: 'pasado' | 'actual' | 'futuro'
function estadoBloque(b, agenda) {
  const hoy = hoyISO();
  const mismoDia = agenda.fecha === hoy || filtro.ensayo;
  if (!mismoDia) return agenda.fecha && agenda.fecha < hoy ? 'pasado' : 'futuro';
  const ahora = minutosAhora();
  const ini = horaAMinutos(b.inicio); const fin = horaAMinutos(b.fin);
  if (ahora >= fin) return 'pasado';
  if (ahora >= ini) return 'actual';
  return 'futuro';
}

function bloquesFiltrados(agenda) {
  return (agenda.bloques || [])
    .filter((b) => !filtro.dep || esTodas(b) || (b.dependencias || []).map(String).includes(filtro.dep))
    .sort((a, b) => horaAMinutos(a.inicio) - horaAMinutos(b.inicio));
}

function chipsConvocadas(b) {
  if (esTodas(b)) return '<span class="badge">Todas las dependencias</span>';
  return (b.dependencias || []).map((c) => {
    const d = dependencia(c);
    return `<span class="badge proc-${esc(d?.tipoProceso || '')}" title="${esc(d ? `${d.nombre} · proceso ${TIPOS_PROCESO[d.tipoProceso] || ''}` : c)}"><span class="proc-dot"></span>${esc(d ? d.sigla : c)}</span>`;
  }).join('');
}

function tarjetaBloque(b, agenda) {
  const est = estadoBloque(b, agenda);
  const receso = b.tema === 'receso';
  const idDet = `det-${b.id}`;
  if (receso) {
    return `<article class="bloque bloque-receso is-${est}" data-bloque="${esc(b.id)}">
      <div class="bloque-receso-in">${icono('reloj', 'icon-sm')}<strong>${esc(b.titulo)}</strong><span class="muted">${esc(b.inicio)} – ${esc(b.fin)}</span>${est === 'actual' ? '<span class="badge badge-ok"><span class="pulse" aria-hidden="true"></span>Ahora</span>' : ''}</div>
    </article>`;
  }
  return `<article class="bloque is-${est} modalidad-${esc(b.modalidad)}" data-bloque="${esc(b.id)}">
    <button type="button" class="bloque-toggle" aria-expanded="false" aria-controls="${idDet}">
      <span class="bloque-top">
        <span class="badge ${b.modalidad === 'mesa' ? '' : 'badge-solid'}">${icono(b.modalidad === 'mesa' ? 'personas' : 'agenda', 'icon-sm')}${etiquetaModalidad(b)}</span>
        <span class="badge">${esc(TEMAS[b.tema] || b.tema || '')}</span>
        ${est === 'actual' ? '<span class="badge badge-ok bloque-ahora"><span class="pulse" aria-hidden="true"></span>En curso</span>' : ''}
        ${est === 'pasado' ? '<span class="badge">Finalizado</span>' : ''}
        <span class="bloque-chevron">${icono('abajo', 'icon-sm')}</span>
      </span>
      <span class="bloque-titulo">${esc(b.titulo)}</span>
      ${b.modulador ? `<span class="bloque-mod">${icono('persona', 'icon-sm')}<span><strong>${esc(b.modulador)}</strong>${b.cargo ? ` · ${esc(b.cargo)}` : ''}</span></span>` : ''}
      ${b.entregable ? `<span class="bloque-entregable">${icono('bandera', 'icon-sm')}<span>${esc(b.entregable)}</span></span>` : ''}
    </button>
    <div class="bloque-convocadas" aria-label="Dependencias convocadas">${chipsConvocadas(b)}</div>
    <div class="bloque-detalle" id="${idDet}" hidden>
      <div class="grid-2">
        <div>
          <h4>Guion de la ${b.modalidad === 'mesa' ? 'mesa' : 'sesión'}</h4>
          ${(b.guion || []).length ? `<ol class="guion">${b.guion.map((g) => `<li>${esc(g)}</li>`).join('')}</ol>` : '<p class="muted">Sin guion registrado.</p>'}
        </div>
        <div class="stack" style="gap:12px">
          <div class="detalle-caja"><span class="eyebrow">${icono('subir', 'icon-sm')}Insumo que debe traer</span><p class="mb-0">${esc(b.insumo || 'No aplica')}</p></div>
          <div class="detalle-caja"><span class="eyebrow">${icono('bandera', 'icon-sm')}Entregable de salida</span><p class="mb-0">${esc(b.entregable || 'No aplica')}</p></div>
          ${b.sala ? `<div class="detalle-caja"><span class="eyebrow">${icono('lugar', 'icon-sm')}Lugar</span><p class="mb-0">${esc(b.sala)}</p></div>` : ''}
        </div>
      </div>
    </div>
  </article>`;
}

function pintarLinea() {
  const agenda = estado.datos.agenda;
  const cont = raiz.querySelector('[data-linea]');
  const lista = bloquesFiltrados(agenda);
  if (!lista.length) {
    cont.innerHTML = estadoVacio({ titulo: 'No hay bloques para esta dependencia', texto: 'La dependencia elegida no está convocada a ningún bloque además de las plenarias. Pruebe con «Todas las dependencias».', iconoNombre: 'agenda' });
    activarAnimaciones(cont);
    return;
  }
  // Agrupa por franja horaria para mostrar mesas en paralelo lado a lado
  const grupos = [];
  lista.forEach((b) => {
    const g = grupos.find((x) => x.inicio === b.inicio && x.fin === b.fin);
    if (g) g.bloques.push(b); else grupos.push({ inicio: b.inicio, fin: b.fin, bloques: [b] });
  });
  cont.innerHTML = `<ol class="vtl" aria-label="Bloques de la jornada">${grupos.map((g) => {
    const est = g.bloques.map((b) => estadoBloque(b, agenda));
    const e = est.includes('actual') ? 'actual' : est.every((x) => x === 'pasado') ? 'pasado' : 'futuro';
    const receso = g.bloques.every((b) => b.tema === 'receso');
    return `<li class="vtl-row is-${e}${receso ? ' is-receso' : ''}">
      <div class="vtl-hora"><span class="vtl-ini">${esc(g.inicio)}</span><span class="vtl-fin">${esc(g.fin)}</span></div>
      <div class="vtl-rail" aria-hidden="true"><span class="vtl-dot">${e === 'actual' ? '<span class="pulse"></span>' : ''}</span></div>
      <div class="vtl-cards ${g.bloques.length > 1 ? 'is-paralelo' : ''}">
        ${g.bloques.length > 1 ? `<span class="paralelo-tag">${icono('capas', 'icon-sm')}${g.bloques.length} mesas en paralelo</span>` : ''}
        ${g.bloques.map((b) => tarjetaBloque(b, agenda)).join('')}
      </div>
    </li>`;
  }).join('')}</ol>`;
  pintarEstado();
}

function pintarEstado() {
  const agenda = estado.datos.agenda;
  const caja = raiz.querySelector('[data-estado-dia]');
  const hoy = hoyISO();
  const actual = (agenda.bloques || []).find((b) => estadoBloque(b, agenda) === 'actual');
  if (!agenda.fecha) { caja.innerHTML = '<span class="muted">La agenda no tiene fecha definida.</span>'; return; }
  if (agenda.fecha > hoy && !filtro.ensayo) {
    const n = diferenciaDias(hoy, agenda.fecha);
    caja.innerHTML = `${icono('reloj', 'icon-sm')}<span>Faltan <strong>${n} ${n === 1 ? 'día' : 'días'}</strong> para la jornada. Active el modo ensayo para ver la agenda con la hora de hoy.</span>`;
  } else if (agenda.fecha < hoy && !filtro.ensayo) {
    caja.innerHTML = `${icono('checkCirculo', 'icon-sm')}<span>La jornada ya se realizó. Los bloques se muestran como finalizados.</span>`;
  } else if (actual) {
    caja.innerHTML = `<span class="pulse" aria-hidden="true"></span><span>En curso: <strong>${esc(actual.titulo)}</strong> (${esc(actual.inicio)} – ${esc(actual.fin)})</span>`;
  } else {
    caja.innerHTML = `${icono('reloj', 'icon-sm')}<span>No hay un bloque en curso en este momento.</span>`;
  }
}

function montar(panel) {
  raiz = panel;
  const agenda = estado.datos.agenda || { bloques: [] };
  const bloques = agenda.bloques || [];
  const plenarias = bloques.filter((b) => b.modalidad === 'plenaria' && b.tema !== 'receso').length;
  const mesas = bloques.filter((b) => b.modalidad === 'mesa').length;
  const horas = bloques.length ? (horaAMinutos(bloques[bloques.length - 1].fin) - horaAMinutos(bloques[0].inicio)) / 60 : 0;
  panel.innerHTML = `<div class="container page">
    <div class="hero-card page-hero reveal">
      <div class="hero-grid">
        <div>
          <span class="eyebrow">${icono('agenda', 'icon-sm')}Agenda del día</span>
          <h1>Jornada de Planeación 2027</h1>
          <p class="hero-lead">${esc(fechaLarga(agenda.fecha) || 'Fecha por definir')} · ${esc(agenda.sede || 'Sede por definir')}</p>
          <div class="hero-estado" data-estado-dia aria-live="polite"></div>
        </div>
        <div class="hero-mini">
          <div><span class="hero-mini-n" data-contar="${bloques.length}">0</span><span>bloques</span></div>
          <div><span class="hero-mini-n" data-contar="${plenarias}">0</span><span>plenarias</span></div>
          <div><span class="hero-mini-n" data-contar="${mesas}">0</span><span>mesas</span></div>
          <div><span class="hero-mini-n" data-contar="${horas}" data-formato="numero">0</span><span>horas</span></div>
        </div>
      </div>
    </div>
    ${agenda.provisional ? `<div class="prov-banner reveal">${icono('info', 'icon-sm')}<span><strong>Datos provisionales.</strong> ${esc(agenda.aviso || 'Agenda de ejemplo pendiente de aprobación.')}</span></div>` : ''}
    <div class="card toolbar reveal">
      <div class="toolbar-left">
        <label class="field" style="min-width:260px">
          <span class="field-label">Ver bloques de la dependencia</span>
          <select class="select" data-filtro-dep>
            <option value="">Todas las dependencias</option>
            ${dependencias().map((d) => `<option value="${esc(d.codigo)}">${esc(d.codigo)} · ${esc(d.nombre)}</option>`).join('')}
          </select>
        </label>
        <label class="switch"><input type="checkbox" data-ensayo> Modo ensayo: usar la hora de hoy</label>
      </div>
      <div class="btn-group">
        <button type="button" class="btn" data-accion="pdf">${icono('pdf', 'icon-sm')}Descargar PDF</button>
        <button type="button" class="btn btn-primary" data-accion="ics">${icono('calendarioMas', 'icon-sm')}Agregar a Outlook (.ics)</button>
      </div>
    </div>
    <div data-linea></div>
  </div>`;

  const sel = panel.querySelector('[data-filtro-dep]');
  const ident = estado.sesion.identificacion;
  if (ident && ident.dependencia) { sel.value = ident.dependencia; filtro.dep = ident.dependencia; }
  sel.addEventListener('change', () => { filtro.dep = sel.value; pintarLinea(); activarAnimaciones(panel); });
  panel.querySelector('[data-ensayo]').addEventListener('change', (ev) => { filtro.ensayo = ev.target.checked; pintarLinea(); });

  on(panel, 'click', '.bloque-toggle', (ev, b) => {
    const abierto = b.getAttribute('aria-expanded') === 'true';
    b.setAttribute('aria-expanded', String(!abierto));
    const det = panel.querySelector(`#${b.getAttribute('aria-controls')}`);
    det.hidden = abierto;
    b.closest('.bloque').classList.toggle('is-open', !abierto);
  });
  on(panel, 'click', '[data-accion]', async (ev, b) => {
    const lista = bloquesFiltrados(agenda);
    const textoFiltro = filtro.dep ? `${filtro.dep} · ${dependencia(filtro.dep)?.nombre || ''}` : '';
    if (b.dataset.accion === 'pdf') {
      if (!pdfDisponible()) { toast({ tipo: 'warn', titulo: 'PDF no disponible', mensaje: 'La librería jsPDF no cargó. Revise la conexión y recargue.' }); return; }
      try {
        b.disabled = true;
        await agendaAPdf({ agenda, bloques: lista.map((x) => ({ ...x, convocadasTexto: convocadasTexto(x) })), filtroTexto: textoFiltro, etiquetaModalidad, nombre: `Agenda_JP2027${filtro.dep ? `_${filtro.dep}` : ''}.pdf` });
        toast({ tipo: 'ok', titulo: 'Agenda descargada', mensaje: 'El PDF incluye los bloques del filtro actual.' });
      } catch (e) { toastError('No se pudo generar el PDF', e, e.message); } finally { b.disabled = false; }
    }
    if (b.dataset.accion === 'ics') {
      try {
        const sinRecesos = lista.filter((x) => x.tema !== 'receso');
        descargarTexto(generarICS({ agenda, bloques: sinRecesos, convocadasTexto }), `Agenda_JP2027${filtro.dep ? `_${filtro.dep}` : ''}.ics`, 'text/calendar;charset=utf-8');
        toast({ tipo: 'ok', titulo: 'Calendario descargado', mensaje: `Abra el archivo .ics para agregar ${sinRecesos.length} bloques a Outlook.` });
      } catch (e) { toastError('No se pudo generar el calendario', e); }
    }
  });

  pintarLinea();
  clearInterval(reloj);
  reloj = setInterval(() => { if (!panel.hidden) pintarLineaConservandoAperturas(); }, 30000);
}

// Repinta cada 30 s sin cerrar los bloques que el usuario abrió.
function pintarLineaConservandoAperturas() {
  const abiertos = Array.from(raiz.querySelectorAll('.bloque.is-open')).map((b) => b.dataset.bloque);
  pintarLinea();
  abiertos.forEach((id) => { const t = raiz.querySelector(`[data-bloque="${id}"] .bloque-toggle`); if (t) t.click(); });
  raiz.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
}

const pestanaAgenda = {
  id: 'agenda',
  titulo: 'Agenda',
  icono: 'agenda',
  montar,
  alMostrar() { pintarLineaConservandoAperturas(); }
};

Object.assign(__m["src/tabs/agenda.js"], { pestanaAgenda });
})();

// ── src/ui/graficas.js ──
__m["src/ui/graficas.js"] = {};
(function () {
/*
 * graficas.js — Envoltorio de Chart.js con la identidad ETITC: barras delgadas con extremos redondeados,
 * una sola escala, cuadrícula discreta, tooltips y vista de tabla alterna. Si Chart.js no carga,
 * se muestra la tabla accesible en su lugar (degradación elegante).
 */
const { esc } = __m["src/ui/dom.js"];
const { icono } = __m["src/ui/iconos.js"];
const { PALETA } = __m["src/config.js"];
const { formatear } = __m["src/lib/formato.js"];

const instancias = new WeakMap();

function tablaRespaldo(etiquetas, series, formato) {
  return `<div class="table-wrap chart-fallback"><table class="table">
    <thead><tr><th scope="col">Categoría</th>${series.map((s) => `<th scope="col" class="num">${esc(s.nombre)}</th>`).join('')}</tr></thead>
    <tbody>${etiquetas.map((e, i) => `<tr><td>${esc(e)}</td>${series.map((s) => `<td class="num">${formatear(s.datos[i], s.formato || formato)}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></div>`;
}

// Dibuja una gráfica de barras. series: [{ nombre, datos: [], color? }]
function graficaBarras(contenedor, { etiquetas, series, formato = 'entero', horizontal = false, apilada = false, alto = 260, titulo = '' }) {
  const anterior = instancias.get(contenedor);
  if (anterior) { try { anterior.destroy(); } catch { /* sin acción */ } }
  const hayDatos = series.some((s) => s.datos.some((v) => Number(v) > 0));
  const leyenda = series.length > 1
    ? `<div class="legend">${series.map((s, i) => `<span><span class="dot" style="color:${s.color || PALETA.categorica()[i % 4]}"></span>${esc(s.nombre)}</span>`).join('')}</div>`
    : '';
  contenedor.innerHTML = `
    <div class="chart-actions" style="justify-content:flex-end;margin-bottom:6px">
      <button type="button" class="btn btn-ghost btn-sm" data-ver-tabla aria-pressed="false">${icono('capas', 'icon-sm')}Ver como tabla</button>
    </div>
    <div class="chart-box" style="height:${alto}px"><canvas role="img" aria-label="${esc(titulo || 'Gráfica')}"></canvas></div>
    <div class="chart-table" hidden>${tablaRespaldo(etiquetas, series, formato)}</div>${leyenda}`;
  const caja = contenedor.querySelector('.chart-box');
  const tabla = contenedor.querySelector('.chart-table');
  const boton = contenedor.querySelector('[data-ver-tabla]');
  boton.addEventListener('click', () => {
    const verTabla = boton.getAttribute('aria-pressed') !== 'true';
    boton.setAttribute('aria-pressed', String(verTabla));
    boton.lastChild.textContent = verTabla ? 'Ver como gráfica' : 'Ver como tabla';
    caja.hidden = verTabla; tabla.hidden = !verTabla;
  });

  if (!window.Chart) {
    caja.hidden = true; tabla.hidden = false; boton.hidden = true;
    tabla.insertAdjacentHTML('afterbegin', '<p class="muted" style="font-size:.8rem">La librería de gráficas no cargó; se muestran los datos en tabla.</p>');
    return null;
  }
  if (!hayDatos) {
    caja.innerHTML = `<div class="empty" style="height:100%;padding:20px;border-style:dashed"><div class="empty-art" style="width:64px;height:64px">${icono('tendencia')}</div><p>Aún no hay datos para graficar.</p></div>`;
  }
  const texto = PALETA.leer('--muted', '#6d847c');
  const linea = PALETA.leer('--line', '#d7e4dc');
  const tinta = PALETA.leer('--ink', '#13332a');
  const superficie = PALETA.leer('--surface', '#ffffff');
  const cat = PALETA.categorica();
  if (!hayDatos) return null;
  const chart = new window.Chart(caja.querySelector('canvas'), {
    type: 'bar',
    data: {
      labels: etiquetas,
      datasets: series.map((s, i) => ({
        label: s.nombre,
        data: s.datos,
        backgroundColor: s.colores || s.color || (series.length === 1 ? PALETA.leer('--g7', '#188b58') : cat[i % 4]),
        borderRadius: 4,
        borderSkipped: 'start',
        borderColor: superficie,
        borderWidth: apilada ? { top: 2 } : 0,
        maxBarThickness: 34,
        categoryPercentage: 0.7,
        barPercentage: 0.86
      }))
    },
    options: {
      indexAxis: horizontal ? 'y' : 'x',
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 700, easing: 'easeOutCubic' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: tinta,
          titleColor: '#fff',
          bodyColor: '#fff',
          padding: 10,
          cornerRadius: 10,
          callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${formatear(ctx.parsed[horizontal ? 'x' : 'y'], series[ctx.datasetIndex].formato || formato)}` }
        }
      },
      scales: {
        x: {
          stacked: apilada,
          grid: { display: horizontal, color: linea, drawTicks: false },
          border: { display: false },
          ticks: { color: texto, font: { family: 'Inter', size: 12 }, maxRotation: 0, autoSkipPadding: 12, ...(horizontal ? { maxTicksLimit: 5, callback: (v) => formatear(v, formato === 'moneda' ? 'monedaCompacta' : formato) } : {}) }
        },
        y: {
          stacked: apilada,
          beginAtZero: true,
          grid: { display: !horizontal, color: linea, drawTicks: false },
          border: { display: false },
          ticks: { color: texto, font: { family: 'Inter', size: 12 }, ...(horizontal ? {} : { precision: 0, maxTicksLimit: 6, callback: (v) => formatear(v, formato === 'moneda' ? 'monedaCompacta' : formato) }) }
        }
      }
    }
  });
  instancias.set(contenedor, chart);
  return chart;
}

Object.assign(__m["src/ui/graficas.js"], { graficaBarras });
})();

// ── src/lib/validacion.js ──
__m["src/lib/validacion.js"] = {};
(function () {
/*
 * validacion.js — Esquema de la plantilla y validación de la formulación cargada.
 * Es una función pura (no toca el DOM): recibe el libro ya leído como matrices de celdas y devuelve
 * hallazgos en lenguaje llano (hoja, fila y qué corregir), los datos normalizados y un resumen.
 * La plantilla Excel (lib/excel.js) usa este mismo esquema, así encabezados y reglas nunca se desalinean.
 */
const { normalizar, aNumero } = __m["src/lib/formato.js"];
const { leerTrimestre, leerFechaExcel, caminoContratacion, hoyISO, fechaCorta } = __m["src/lib/fechas.js"];

const HOJAS = {
  instructivo: 'Instructivo',
  acciones: 'Acciones',
  necesidades: 'Necesidades',
  adquisiciones: 'Adquisiciones',
  listas: 'Listas'
};

// Columnas por hoja. "lista" es el nombre definido en la hoja Listas que alimenta la validación de datos.
const ESQUEMA = {
  Acciones: [
    { clave: 'codigo', titulo: 'Código de acción', ancho: 15, obligatoria: true, ayuda: 'Código único, por ejemplo A-01' },
    { clave: 'linea', titulo: 'Línea del Plan de Desarrollo Institucional', ancho: 42, obligatoria: true, lista: 'LST_Lineas', alias: ['linea pdi', 'linea del pdi'] },
    { clave: 'meta', titulo: 'Meta institucional 2027 asociada', ancho: 40, obligatoria: true, lista: 'LST_Metas', alias: ['meta institucional', 'meta 2027'] },
    { clave: 'nombre', titulo: 'Nombre de la acción', ancho: 42, obligatoria: true },
    { clave: 'descripcion', titulo: 'Descripción', ancho: 50, obligatoria: true },
    { clave: 'indicador', titulo: 'Indicador', ancho: 36, obligatoria: true },
    { clave: 'unidad', titulo: 'Unidad de medida', ancho: 18, obligatoria: true },
    { clave: 'metaCuantitativa', titulo: 'Meta cuantitativa', ancho: 14, obligatoria: true, tipo: 'numero' },
    { clave: 'trimInicio', titulo: 'Trimestre de inicio', ancho: 13, obligatoria: true, lista: 'LST_Trimestres' },
    { clave: 'trimCierre', titulo: 'Trimestre de cierre', ancho: 13, obligatoria: true, lista: 'LST_Trimestres' },
    { clave: 'responsable', titulo: 'Responsable', ancho: 30, obligatoria: true },
    { clave: 'evidencia', titulo: 'Evidencia macro comprometida', ancho: 46, obligatoria: true }
  ],
  Necesidades: [
    { clave: 'codigo', titulo: 'Código de necesidad', ancho: 15, obligatoria: true, ayuda: 'Código único, por ejemplo N-01' },
    { clave: 'codigoAccion', titulo: 'Código de acción que la origina', ancho: 18, obligatoria: true, lista: 'LST_CodigosAccion', alias: ['codigo de accion'] },
    { clave: 'tipo', titulo: 'Tipo', ancho: 18, obligatoria: true, lista: 'LST_Tipos', alias: ['tipo de necesidad'] },
    { clave: 'descripcion', titulo: 'Descripción', ancho: 50, obligatoria: true },
    { clave: 'cantidad', titulo: 'Cantidad', ancho: 11, obligatoria: true, tipo: 'numero' },
    { clave: 'valor', titulo: 'Valor estimado', ancho: 18, obligatoria: true, tipo: 'moneda' },
    { clave: 'trimestre', titulo: 'Trimestre requerido', ancho: 13, obligatoria: true, lista: 'LST_Trimestres' },
    { clave: 'justificacion', titulo: 'Justificación', ancho: 50, obligatoria: true }
  ],
  Adquisiciones: [
    { clave: 'codigoNecesidad', titulo: 'Código de necesidad', ancho: 16, obligatoria: true, lista: 'LST_CodigosNecesidad' },
    { clave: 'modalidad', titulo: 'Modalidad de contratación', ancho: 34, obligatoria: true, lista: 'LST_Modalidades', alias: ['modalidad'] },
    { clave: 'valor', titulo: 'Valor', ancho: 18, obligatoria: true, tipo: 'moneda' },
    { clave: 'fechaOperacion', titulo: 'Fecha en que se requiere operando', ancho: 20, obligatoria: true, tipo: 'fecha', alias: ['fecha requerida', 'fecha en que se requiere'] },
    { clave: 'fechaRadicacionExcel', titulo: 'Fecha límite de radicación de estudios previos', ancho: 24, obligatoria: false, tipo: 'formula', alias: ['fecha limite de radicacion'] },
    { clave: 'observaciones', titulo: 'Observaciones', ancho: 44, obligatoria: false }
  ]
};

const TIPOS_NECESIDAD = [
  { id: 'bien', nombre: 'Bien' },
  { id: 'servicio', nombre: 'Servicio' },
  { id: 'talento', nombre: 'Talento humano' },
  { id: 'infraestructura', nombre: 'Infraestructura' }
];

const vacio = (v) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
const texto = (v) => {
  if (vacio(v)) return '';
  if (v instanceof Date) return leerFechaExcel(v) || '';
  return String(v).trim();
};
const codigoNorm = (v) => texto(v).toUpperCase().replace(/\s+/g, '');

// Busca una hoja por nombre sin importar mayúsculas ni tildes.
function encontrarHoja(libro, nombre) {
  const objetivo = normalizar(nombre);
  const clave = Object.keys(libro.hojas || {}).find((k) => normalizar(k) === objetivo);
  return clave ? { nombre: clave, filas: libro.hojas[clave] } : null;
}

// Localiza la fila de encabezados (entre las primeras 12) y mapea cada columna del esquema.
function leerTabla(filas, columnas) {
  let mejor = { indice: -1, mapa: {}, aciertos: 0 };
  const limite = Math.min(filas.length, 12);
  for (let i = 0; i < limite; i += 1) {
    const fila = filas[i] || [];
    const mapa = {};
    let aciertos = 0;
    fila.forEach((celda, j) => {
      const n = normalizar(celda);
      if (!n) return;
      const col = columnas.find((c) => mapa[c.clave] === undefined
        && (normalizar(c.titulo) === n || (c.alias || []).some((a) => n === a || n.startsWith(`${a} `))));
      if (col) { mapa[col.clave] = j; aciertos += 1; }
    });
    // Segundo intento: encabezado que empieza igual (por ejemplo con texto de ayuda agregado)
    fila.forEach((celda, j) => {
      const n = normalizar(celda);
      if (!n) return;
      const col = columnas.find((c) => mapa[c.clave] === undefined && n.startsWith(normalizar(c.titulo)));
      if (col && !Object.values(mapa).includes(j)) { mapa[col.clave] = j; aciertos += 1; }
    });
    if (aciertos > mejor.aciertos) mejor = { indice: i, mapa, aciertos };
  }
  if (mejor.aciertos < 2) return { encontrada: false, faltantes: columnas.filter((c) => c.obligatoria), registros: [] };
  const faltantes = columnas.filter((c) => c.obligatoria && mejor.mapa[c.clave] === undefined);
  const registros = [];
  for (let i = mejor.indice + 1; i < filas.length; i += 1) {
    const fila = filas[i] || [];
    const reg = { _fila: i + 1 };
    let conDatos = false;
    columnas.forEach((c) => {
      const j = mejor.mapa[c.clave];
      const v = j === undefined ? null : fila[j];
      reg[c.clave] = v === undefined ? null : v;
      if (c.tipo !== 'formula' && !vacio(v)) conDatos = true;
    });
    if (conDatos) registros.push(reg);
  }
  return { encontrada: true, faltantes, registros, filaEncabezado: mejor.indice + 1 };
}

// Similitud de Dice sobre bigramas: 1 = idénticos.
function similitud(a, b) {
  const x = normalizar(a).replace(/\s+/g, ' ');
  const y = normalizar(b).replace(/\s+/g, ' ');
  if (!x || !y) return 0;
  if (x === y) return 1;
  const bigramas = (s) => { const m = new Map(); for (let i = 0; i < s.length - 1; i += 1) { const g = s.slice(i, i + 2); m.set(g, (m.get(g) || 0) + 1); } return m; };
  const bx = bigramas(x); const by = bigramas(y);
  let inter = 0;
  bx.forEach((n, g) => { inter += Math.min(n, by.get(g) || 0); });
  return (2 * inter) / (x.length - 1 + y.length - 1);
}

// Reconoce un valor de catálogo escrito como "M1 — Nombre", "M1" o solo el nombre.
function reconocer(valor, catalogo) {
  const n = normalizar(valor);
  if (!n) return null;
  return catalogo.find((item) => {
    const id = normalizar(item.id);
    return n === id || n.startsWith(`${id} `) || n === normalizar(item.nombre) || n.endsWith(` ${normalizar(item.nombre)}`);
  }) || null;
}

function reconocerTipo(valor) {
  const n = normalizar(valor);
  if (!n) return null;
  if (n.startsWith('bien')) return 'bien';
  if (n.startsWith('servicio')) return 'servicio';
  if (n.includes('talento') || n.includes('humano') || n.includes('personal')) return 'talento';
  if (n.includes('infraestructura') || n.includes('obra')) return 'infraestructura';
  return null;
}

// Lee el código de dependencia escrito en la hoja Instructivo de la plantilla (si existe).
function leerDependenciaDeLibro(libro) {
  const hoja = encontrarHoja(libro, HOJAS.instructivo);
  if (!hoja) return null;
  for (const fila of hoja.filas.slice(0, 20)) {
    const i = (fila || []).findIndex((c) => normalizar(c).startsWith('dependencia que formula'));
    if (i >= 0) {
      const m = /(\d{3})/.exec(texto(fila[i + 1]));
      return m ? m[1] : null;
    }
  }
  return null;
}

/*
 * Valida la formulación. contexto = { metas, modalidades, calendario, umbrales, dependencia }
 *  - metas: data/metas.json (metasInstitucionales)
 *  - modalidades: data/modalidades.json (modalidades)
 *  - calendario: crearCalendario(festivos)
 */
function validarFormulacion(libro, contexto) {
  const { metas = [], modalidades = [], calendario = null, umbrales = {}, dependencia = null } = contexto || {};
  const maxAcciones = umbrales.maxAccionesPorDependencia ?? 15;
  const umbralSimilitud = umbrales.similitudNombresAcciones ?? 0.86;
  const hallazgos = [];
  const agregar = (severidad, hoja, fila, titulo, detalle, correccion, regla) => {
    hallazgos.push({ id: `H${hallazgos.length + 1}`, severidad, hoja, fila, titulo, detalle, correccion, regla });
  };
  const lineas = metas.flatMap((m) => (m.lineasPDI || []).map((l) => ({ ...l, metaId: m.id })));

  // 1. Hojas y columnas obligatorias
  const tablas = {};
  for (const nombreHoja of ['Acciones', 'Necesidades', 'Adquisiciones']) {
    const hoja = encontrarHoja(libro, nombreHoja);
    if (!hoja) {
      agregar('bloqueante', nombreHoja, null, `Falta la hoja «${nombreHoja}»`,
        `El archivo no tiene una hoja llamada ${nombreHoja}. Sin ella no se puede revisar la cadena metas → acción → necesidad → adquisición.`,
        'Descargue de nuevo la plantilla del paso 2 y pase allí su información. No cambie el nombre de las hojas.', 'hoja-faltante');
      tablas[nombreHoja] = { encontrada: false, registros: [] };
      continue;
    }
    const t = leerTabla(hoja.filas, ESQUEMA[nombreHoja]);
    tablas[nombreHoja] = t;
    if (t.faltantes.length) {
      agregar('bloqueante', nombreHoja, t.filaEncabezado || 1,
        `Faltan columnas en la hoja ${nombreHoja}`,
        `No se encontraron estas columnas: ${t.faltantes.map((c) => `«${c.titulo}»`).join(', ')}.`,
        'No borre ni cambie el texto de la fila de títulos. Si la modificó, copie de nuevo los encabezados desde la plantilla.', 'columna-faltante');
    }
  }

  // 2. Acciones
  const filasAcc = tablas.Acciones.registros || [];
  const acciones = filasAcc.map((r) => {
    const metaCat = reconocer(r.meta, metas);
    const lineaCat = reconocer(r.linea, lineas);
    return {
      _fila: r._fila,
      codigo: codigoNorm(r.codigo),
      lineaTexto: texto(r.linea),
      lineaId: lineaCat ? lineaCat.id : null,
      metaTexto: texto(r.meta),
      metaId: metaCat ? metaCat.id : (lineaCat ? lineaCat.metaId : null),
      nombre: texto(r.nombre),
      descripcion: texto(r.descripcion),
      indicador: texto(r.indicador),
      unidad: texto(r.unidad),
      metaCuantitativaTexto: texto(r.metaCuantitativa),
      metaCuantitativa: aNumero(r.metaCuantitativa),
      trimInicioTexto: texto(r.trimInicio),
      trimInicio: leerTrimestre(r.trimInicio),
      trimCierreTexto: texto(r.trimCierre),
      trimCierre: leerTrimestre(r.trimCierre),
      responsable: texto(r.responsable),
      evidencia: texto(r.evidencia),
      _metaCat: metaCat,
      _lineaCat: lineaCat
    };
  });

  if (tablas.Acciones.encontrada !== false && !tablas.Acciones.faltantes?.length && acciones.length === 0) {
    agregar('bloqueante', 'Acciones', null, 'No hay acciones registradas',
      'La hoja Acciones está vacía. Todo el plan nace de las acciones: sin ellas no puede haber necesidades ni adquisiciones.',
      'Registre al menos una acción, con su meta 2027, su línea del PDI y su indicador.', 'cero-acciones');
  }

  const codigosAcc = new Map();
  acciones.forEach((a) => {
    const f = a._fila;
    if (!a.codigo) {
      agregar('bloqueante', 'Acciones', f, 'Acción sin código',
        `La acción «${a.nombre || 'sin nombre'}» no tiene código, así que ninguna necesidad puede amarrarse a ella.`,
        'Escriba un código único en la columna «Código de acción», por ejemplo A-01.', 'codigo-accion');
    } else if (codigosAcc.has(a.codigo)) {
      agregar('bloqueante', 'Acciones', f, `Código de acción repetido: ${a.codigo}`,
        `El código ${a.codigo} ya se usó en la fila ${codigosAcc.get(a.codigo)}. Las necesidades no sabrían a cuál de las dos acciones pertenecen.`,
        'Dé a cada acción un código distinto (A-01, A-02, …).', 'codigo-accion');
    } else codigosAcc.set(a.codigo, f);

    if (!a.metaTexto) {
      agregar('bloqueante', 'Acciones', f, 'Acción sin meta institucional 2027',
        `La acción ${a.codigo || ''} «${a.nombre}» no dice a qué meta 2027 aporta.`.replace('  ', ' '),
        'Elija la meta en la lista desplegable de la columna «Meta institucional 2027 asociada».', 'sin-meta');
    } else if (!a._metaCat) {
      agregar('advertencia', 'Acciones', f, 'Meta 2027 no reconocida',
        `«${a.metaTexto}» no coincide con ninguna meta del catálogo institucional.`,
        'Use la lista desplegable para que la acción aparezca en la cascada de metas.', 'meta-catalogo');
    }
    if (!a.lineaTexto) {
      agregar('bloqueante', 'Acciones', f, 'Acción sin línea del Plan de Desarrollo Institucional',
        `La acción ${a.codigo || ''} «${a.nombre}» no tiene línea del PDI.`.replace('  ', ' '),
        'Elija la línea en la lista desplegable de la columna «Línea del Plan de Desarrollo Institucional».', 'sin-linea');
    } else if (!a._lineaCat) {
      agregar('advertencia', 'Acciones', f, 'Línea del PDI no reconocida',
        `«${a.lineaTexto}» no coincide con ninguna línea del catálogo.`,
        'Use la lista desplegable de la columna de línea.', 'linea-catalogo');
    } else if (a._metaCat && a._lineaCat.metaId !== a._metaCat.id) {
      agregar('advertencia', 'Acciones', f, 'La línea no pertenece a la meta elegida',
        `La línea ${a._lineaCat.id} pertenece a la meta ${a._lineaCat.metaId}, pero la acción dice meta ${a._metaCat.id}.`,
        'Revise que meta y línea correspondan. En la pestaña Metas 2027 puede ver qué líneas tiene cada meta.', 'linea-meta');
    }

    // Indicador completo
    if (!a.indicador) {
      agregar('bloqueante', 'Acciones', f, 'Acción sin indicador',
        `La acción ${a.codigo || ''} no tiene indicador, así que no hay cómo medir su cumplimiento.`.replace('  ', ' '),
        'Escriba el indicador, su unidad de medida y la meta cuantitativa.', 'indicador');
    } else {
      const faltan = [];
      if (!a.unidad) faltan.push('unidad de medida');
      if (!a.metaCuantitativaTexto) faltan.push('meta cuantitativa');
      if (faltan.length) {
        agregar('bloqueante', 'Acciones', f, `Indicador sin ${faltan.join(' ni ')}`,
          `El indicador «${a.indicador}» no tiene ${faltan.join(' ni ')}.`,
          'Complete la unidad (por ejemplo «informe», «porcentaje», «estudiantes») y la meta en número.', 'indicador');
      } else if (a.metaCuantitativa === null) {
        agregar('bloqueante', 'Acciones', f, 'La meta cuantitativa no es un número',
          `En «Meta cuantitativa» dice «${a.metaCuantitativaTexto}».`,
          'Escriba solo el número (por ejemplo 4 o 85). La unidad va en «Unidad de medida».', 'indicador');
      }
    }

    // Trimestres
    if (a.trimInicioTexto && a.trimInicio === null) {
      agregar('advertencia', 'Acciones', f, 'Trimestre de inicio no reconocido', `«${a.trimInicioTexto}» no es un trimestre.`, 'Use T1, T2, T3 o T4.', 'trimestre');
    }
    if (a.trimCierreTexto && a.trimCierre === null) {
      agregar('advertencia', 'Acciones', f, 'Trimestre de cierre no reconocido', `«${a.trimCierreTexto}» no es un trimestre.`, 'Use T1, T2, T3 o T4.', 'trimestre');
    }
    if (a.trimInicio && a.trimCierre && a.trimCierre < a.trimInicio) {
      agregar('bloqueante', 'Acciones', f, 'La acción termina antes de empezar',
        `Inicia en T${a.trimInicio} pero cierra en T${a.trimCierre}.`,
        'Corrija los trimestres: el de cierre debe ser igual o posterior al de inicio.', 'trimestres-orden');
    }
    if (!a.evidencia) {
      agregar('advertencia', 'Acciones', f, 'Acción sin evidencia macro comprometida',
        `La acción ${a.codigo || ''} no dice con qué informe macro demostrará su cumplimiento.`.replace('  ', ' '),
        'En 2027 la evidencia se consolida en informes macro de peso y valor. Describa el informe que recogerá el cumplimiento.', 'evidencia');
    }
    const otrosVacios = [['nombre', 'Nombre de la acción'], ['descripcion', 'Descripción'], ['responsable', 'Responsable'], ['trimInicioTexto', 'Trimestre de inicio'], ['trimCierreTexto', 'Trimestre de cierre']]
      .filter(([k]) => !a[k]).map(([, t]) => t);
    if (otrosVacios.length) {
      agregar('advertencia', 'Acciones', f, 'Campos sin diligenciar', `Faltan: ${otrosVacios.join(', ')}.`, 'Complete los campos para que la acción se entienda sola.', 'vacios');
    }
  });

  if (acciones.length > maxAcciones) {
    agregar('advertencia', 'Acciones', null, `Hay ${acciones.length} acciones: señal de atomización`,
      `El tope sugerido es ${maxAcciones} acciones por dependencia. Muchas acciones pequeñas dispersan la trazabilidad y multiplican el reporte.`,
      'Agrupe las acciones que apuntan al mismo resultado en una sola acción con un informe macro como evidencia.', 'atomizacion');
  }

  // Nombres repetidos o casi idénticos: un hallazgo por grupo, anclado en la primera acción del grupo
  const asignadas = new Set();
  for (let i = 0; i < acciones.length; i += 1) {
    if (asignadas.has(i) || !acciones[i].nombre) continue;
    const grupo = [];
    let identico = true;
    for (let j = i + 1; j < acciones.length; j += 1) {
      if (asignadas.has(j) || !acciones[j].nombre) continue;
      const s = similitud(acciones[i].nombre, acciones[j].nombre);
      if (s >= umbralSimilitud) { grupo.push(j); asignadas.add(j); if (s < 1) identico = false; }
    }
    if (!grupo.length) continue;
    const filas = grupo.map((j) => acciones[j]._fila);
    agregar('advertencia', 'Acciones', acciones[i]._fila,
      identico ? 'Nombre de acción repetido' : (grupo.length > 1 ? `${grupo.length + 1} acciones con nombres casi idénticos` : 'Nombre de acción casi idéntico a otro'),
      `«${acciones[i].nombre}» (fila ${acciones[i]._fila}) se ${identico ? 'repite' : 'parece mucho a'} ${filas.length === 1 ? `la acción de la fila ${filas[0]}` : `las acciones de las filas ${filas.join(', ')}`}.`,
      'Si son la misma acción, únalas en una sola con un informe macro como evidencia. Si son distintas, use nombres que muestren la diferencia.', 'duplicado');
  }

  // 3. Necesidades
  const necesidades = (tablas.Necesidades.registros || []).map((r) => ({
    _fila: r._fila,
    codigo: codigoNorm(r.codigo),
    codigoAccion: codigoNorm(r.codigoAccion),
    tipo: reconocerTipo(r.tipo),
    tipoTexto: texto(r.tipo),
    descripcion: texto(r.descripcion),
    cantidad: aNumero(r.cantidad),
    valor: aNumero(r.valor),
    trimestreTexto: texto(r.trimestre),
    trimestre: leerTrimestre(r.trimestre),
    justificacion: texto(r.justificacion)
  }));
  const codigosNec = new Map();
  necesidades.forEach((n) => {
    const f = n._fila;
    n.accionExiste = Boolean(n.codigoAccion && codigosAcc.has(n.codigoAccion));
    if (!n.codigo) {
      agregar('bloqueante', 'Necesidades', f, 'Necesidad sin código',
        `La necesidad «${n.descripcion || 'sin descripción'}» no tiene código, así que no puede pasar al plan de adquisiciones.`,
        'Escriba un código único en «Código de necesidad», por ejemplo N-01.', 'codigo-necesidad');
    } else if (codigosNec.has(n.codigo)) {
      agregar('bloqueante', 'Necesidades', f, `Código de necesidad repetido: ${n.codigo}`,
        `El código ${n.codigo} ya se usó en la fila ${codigosNec.get(n.codigo)}.`,
        'Dé a cada necesidad un código distinto (N-01, N-02, …).', 'codigo-necesidad');
    } else codigosNec.set(n.codigo, f);

    if (!n.codigoAccion) {
      agregar('bloqueante', 'Necesidades', f, 'Necesidad sin acción que la origine',
        `La necesidad ${n.codigo || ''} no dice qué acción la origina. Una necesidad sin acción no tiene razón de ser en el plan.`.replace('  ', ' '),
        'En «Código de acción que la origina» elija el código de una acción de la hoja Acciones.', 'necesidad-sin-accion');
    } else if (!n.accionExiste) {
      agregar('bloqueante', 'Necesidades', f, 'La necesidad apunta a una acción que no existe',
        `La necesidad ${n.codigo || ''} dice que la origina la acción ${n.codigoAccion}, pero en la hoja Acciones no hay ninguna acción con ese código.`.replace('  ', ' '),
        `Corrija el código (los que existen son: ${Array.from(codigosAcc.keys()).slice(0, 8).join(', ') || 'ninguno'}${codigosAcc.size > 8 ? ', …' : ''}) o cree primero la acción.`, 'necesidad-sin-accion');
    }
    if (n.valor === null || n.valor === 0) {
      agregar('advertencia', 'Necesidades', f, 'Necesidad sin valor estimado',
        `La necesidad ${n.codigo || ''} tiene el valor estimado ${n.valor === 0 ? 'en cero' : 'vacío'}.`.replace('  ', ' '),
        'Estime el valor en pesos, aunque sea aproximado. Sin valor no entra bien al consolidado.', 'valor-cero');
    }
    if (n.tipoTexto && !n.tipo) {
      agregar('advertencia', 'Necesidades', f, 'Tipo de necesidad no reconocido', `«${n.tipoTexto}» no es un tipo válido.`, 'Use: bien, servicio, talento humano o infraestructura.', 'tipo');
    }
    if (n.trimestreTexto && !n.trimestre) {
      agregar('advertencia', 'Necesidades', f, 'Trimestre requerido no reconocido', `«${n.trimestreTexto}» no es un trimestre.`, 'Use T1, T2, T3 o T4.', 'trimestre');
    }
    const otros = [['tipoTexto', 'Tipo'], ['descripcion', 'Descripción'], ['trimestreTexto', 'Trimestre requerido'], ['justificacion', 'Justificación']].filter(([k]) => !n[k]).map(([, t]) => t);
    if (n.cantidad === null) otros.push('Cantidad');
    if (otros.length) agregar('advertencia', 'Necesidades', f, 'Campos sin diligenciar', `Faltan: ${otros.join(', ')}.`, 'Complete los campos de la necesidad.', 'vacios');
  });

  // 4. Adquisiciones
  const hoy = hoyISO();
  const adquisiciones = (tablas.Adquisiciones.registros || []).map((r) => {
    const mod = reconocer(r.modalidad, modalidades);
    return {
      _fila: r._fila,
      codigoNecesidad: codigoNorm(r.codigoNecesidad),
      modalidadTexto: texto(r.modalidad),
      modalidadId: mod ? mod.id : null,
      _mod: mod,
      valor: aNumero(r.valor),
      fechaOperacionTexto: texto(r.fechaOperacion),
      fechaOperacion: leerFechaExcel(r.fechaOperacion),
      observaciones: texto(r.observaciones)
    };
  });
  adquisiciones.forEach((a) => {
    const f = a._fila;
    a.necesidadExiste = Boolean(a.codigoNecesidad && codigosNec.has(a.codigoNecesidad));
    if (!a.codigoNecesidad) {
      agregar('bloqueante', 'Adquisiciones', f, 'Adquisición sin necesidad',
        'Esta adquisición no dice a qué necesidad responde. No se puede comprar algo que no nace de una necesidad del plan.',
        'Elija en «Código de necesidad» un código de la hoja Necesidades.', 'adquisicion-sin-necesidad');
    } else if (!a.necesidadExiste) {
      agregar('bloqueante', 'Adquisiciones', f, 'La adquisición apunta a una necesidad que no existe',
        `El código ${a.codigoNecesidad} no está en la hoja Necesidades.`,
        `Corrija el código (los que existen son: ${Array.from(codigosNec.keys()).slice(0, 8).join(', ') || 'ninguno'}${codigosNec.size > 8 ? ', …' : ''}) o registre primero la necesidad.`, 'adquisicion-sin-necesidad');
    }
    if (a.modalidadTexto && !a._mod) {
      agregar('advertencia', 'Adquisiciones', f, 'Modalidad de contratación no reconocida', `«${a.modalidadTexto}» no está en la lista de modalidades.`, 'Elija la modalidad en la lista desplegable para calcular la fecha de radicación.', 'modalidad');
    }
    if (!a.modalidadTexto) agregar('advertencia', 'Adquisiciones', f, 'Adquisición sin modalidad', 'Sin modalidad no se puede calcular la fecha límite de radicación.', 'Elija la modalidad de contratación.', 'modalidad');
    if (a.fechaOperacionTexto && !a.fechaOperacion) {
      agregar('advertencia', 'Adquisiciones', f, 'Fecha no reconocida', `«${a.fechaOperacionTexto}» no es una fecha válida.`, 'Escriba la fecha como dd/mm/aaaa.', 'fecha');
    }
    if (!a.fechaOperacionTexto) agregar('advertencia', 'Adquisiciones', f, 'Adquisición sin fecha de operación', 'Falta la fecha en que se requiere el bien o servicio operando.', 'Escriba la fecha (dd/mm/aaaa) para calcular cuándo radicar.', 'fecha');
    if (a.valor === null || a.valor === 0) agregar('advertencia', 'Adquisiciones', f, 'Adquisición sin valor', 'El valor está vacío o en cero.', 'Escriba el valor estimado de la compra.', 'valor-cero');
    if (a._mod && a.fechaOperacion && calendario) {
      const camino = caminoContratacion(calendario, a._mod, a.fechaOperacion);
      a.fechaRadicacion = camino.radicacion;
      a.totalHabiles = camino.totalHabiles;
      if (camino.radicacion < hoy) {
        agregar('advertencia', 'Adquisiciones', f, 'Fecha de operación no alcanzable',
          `Por ${a._mod.nombre} se debía radicar a más tardar el ${fechaCorta(camino.radicacion)}, fecha que ya pasó.`,
          'Mueva la fecha de operación o revise la modalidad con el calculador de la pestaña Plan de adquisiciones.', 'no-alcanzable');
      }
    }
  });

  // 5. Dependencia de la plantilla
  const depLibro = leerDependenciaDeLibro(libro);
  if (dependencia && depLibro && depLibro !== dependencia) {
    agregar('advertencia', 'Instructivo', null, 'La plantilla es de otra dependencia',
      `El archivo se generó para la dependencia ${depLibro}, pero usted se identificó con la dependencia ${dependencia}.`,
      'Confirme que cargó el archivo correcto. La formulación quedará a nombre de la dependencia con la que se identificó.', 'dependencia');
  }

  // Limpieza de campos internos
  acciones.forEach((a) => { delete a._metaCat; delete a._lineaCat; });
  adquisiciones.forEach((a) => { delete a._mod; });

  const bloqueantes = hallazgos.filter((h) => h.severidad === 'bloqueante').length;
  const advertencias = hallazgos.length - bloqueantes;
  return {
    hallazgos: hallazgos.sort((a, b) => (a.severidad === b.severidad ? 0 : a.severidad === 'bloqueante' ? -1 : 1)),
    acciones,
    necesidades,
    adquisiciones,
    dependenciaLibro: depLibro,
    resumen: resumir(acciones, necesidades, adquisiciones, bloqueantes, advertencias)
  };
}

function resumir(acciones, necesidades, adquisiciones, bloqueantes = 0, advertencias = 0) {
  const porTrimestre = [1, 2, 3, 4].map((t) => ({
    t,
    acciones: acciones.filter((a) => a.trimInicio === t).length,
    necesidades: necesidades.filter((n) => n.trimestre === t).length,
    valorNecesidades: necesidades.filter((n) => n.trimestre === t).reduce((s, n) => s + (n.valor || 0), 0)
  }));
  return {
    acciones: acciones.length,
    necesidades: necesidades.length,
    adquisiciones: adquisiciones.length,
    valorNecesidades: necesidades.reduce((s, n) => s + (n.valor || 0), 0),
    valorAdquisiciones: adquisiciones.reduce((s, a) => s + (a.valor || 0), 0),
    porTrimestre,
    bloqueantes,
    advertencias
  };
}

Object.assign(__m["src/lib/validacion.js"], { encontrarHoja, similitud, reconocerTipo, leerDependenciaDeLibro, validarFormulacion, resumir, HOJAS, ESQUEMA, TIPOS_NECESIDAD });
})();

// ── src/lib/excel.js ──
__m["src/lib/excel.js"] = {};
(function () {
/*
 * excel.js — Lectura y escritura de Excel con SheetJS.
 *  - generarPlantilla(): construye en el momento la plantilla de formulación (5 hojas).
 *  - leerLibro(): lee .xlsx/.xls en el navegador y devuelve matrices de celdas por hoja.
 *  - exportarExcel(): exporta tablas (consolidados, asistencia) con encabezado institucional y logo.
 *
 * SheetJS Community no escribe estilos ni validaciones de datos, así que el libro se genera con SheetJS
 * y luego se post-procesa el paquete OOXML (zip) con XLSX.CFB para agregar: estilos institucionales,
 * listas desplegables, protección de celdas, paneles inmovilizados, cálculo al abrir y el logo.
 * Si el post-proceso falla por cualquier motivo se entrega el libro de SheetJS sin estilos (degradación).
 */
const { ESQUEMA, HOJAS, TIPOS_NECESIDAD } = __m["src/lib/validacion.js"];
const { serieExcel, hoyISO, fechaLarga, horaLegible } = __m["src/lib/fechas.js"];

// Índices de estilo (cellXfs) definidos en estilosXml()
const S = {
  normal: 0, encabezado: 1, entrada: 2, entradaFecha: 3, formulaFecha: 4, titulo: 5, texto: 6, etiqueta: 7,
  entradaMoneda: 8, entradaNumero: 9, fechaBloqueada: 10, nota: 11, seccion: 12, subtitulo: 13,
  celda: 14, celdaMoneda: 15, celdaFecha: 16, celdaNumero: 17, cita: 18
};

const FILAS_EDITABLES_DEFECTO = 300;

function xlsxDisponible() { return Boolean(window.XLSX && window.XLSX.utils); }

function libreria() {
  if (!xlsxDisponible()) {
    throw new Error('La librería de Excel (SheetJS) no cargó. Revise su conexión a internet y recargue la página.');
  }
  return window.XLSX;
}

const escXml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function estilosXml() {
  const borde = '<border><left style="thin"><color rgb="FFD7E4DC"/></left><right style="thin"><color rgb="FFD7E4DC"/></right><top style="thin"><color rgb="FFD7E4DC"/></top><bottom style="thin"><color rgb="FFD7E4DC"/></bottom><diagonal/></border>';
  const xf = (attrs, inner = '') => `<xf ${attrs} xfId="0"${inner ? `>${inner}</xf>` : '/>'}`;
  const libre = '<protection locked="0"/>';
  const xfs = [
    xf('numFmtId="0" fontId="0" fillId="0" borderId="0"'),
    xf('numFmtId="0" fontId="1" fillId="2" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"', '<alignment horizontal="center" vertical="center" wrapText="1"/>'),
    xf('numFmtId="0" fontId="0" fillId="0" borderId="1" applyBorder="1" applyAlignment="1" applyProtection="1"', `<alignment vertical="top" wrapText="1"/>${libre}`),
    xf('numFmtId="164" fontId="0" fillId="0" borderId="1" applyNumberFormat="1" applyBorder="1" applyAlignment="1" applyProtection="1"', `<alignment horizontal="center" vertical="top"/>${libre}`),
    xf('numFmtId="164" fontId="3" fillId="3" borderId="1" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"', '<alignment horizontal="center" vertical="top"/>'),
    xf('numFmtId="0" fontId="2" fillId="0" borderId="0" applyFont="1" applyAlignment="1"', '<alignment vertical="center"/>'),
    xf('numFmtId="0" fontId="0" fillId="0" borderId="0" applyAlignment="1"', '<alignment vertical="top" wrapText="1"/>'),
    xf('numFmtId="0" fontId="3" fillId="0" borderId="0" applyFont="1" applyAlignment="1"', '<alignment vertical="top" wrapText="1"/>'),
    xf('numFmtId="165" fontId="0" fillId="0" borderId="1" applyNumberFormat="1" applyBorder="1" applyAlignment="1" applyProtection="1"', `<alignment vertical="top"/>${libre}`),
    xf('numFmtId="0" fontId="0" fillId="0" borderId="1" applyBorder="1" applyAlignment="1" applyProtection="1"', `<alignment horizontal="center" vertical="top"/>${libre}`),
    xf('numFmtId="164" fontId="0" fillId="0" borderId="1" applyNumberFormat="1" applyBorder="1" applyAlignment="1"', '<alignment horizontal="center"/>'),
    xf('numFmtId="0" fontId="4" fillId="4" borderId="0" applyFont="1" applyFill="1" applyAlignment="1"', '<alignment vertical="top" wrapText="1"/>'),
    xf('numFmtId="0" fontId="5" fillId="5" borderId="0" applyFont="1" applyFill="1" applyAlignment="1"', '<alignment vertical="center" indent="1"/>'),
    xf('numFmtId="0" fontId="4" fillId="0" borderId="0" applyFont="1" applyAlignment="1"', '<alignment vertical="top" wrapText="1"/>'),
    xf('numFmtId="0" fontId="0" fillId="0" borderId="1" applyBorder="1" applyAlignment="1"', '<alignment vertical="top" wrapText="1"/>'),
    xf('numFmtId="165" fontId="0" fillId="0" borderId="1" applyNumberFormat="1" applyBorder="1" applyAlignment="1"', '<alignment vertical="top"/>'),
    xf('numFmtId="164" fontId="0" fillId="0" borderId="1" applyNumberFormat="1" applyBorder="1" applyAlignment="1"', '<alignment horizontal="center" vertical="top"/>'),
    xf('numFmtId="0" fontId="0" fillId="0" borderId="1" applyBorder="1" applyAlignment="1"', '<alignment horizontal="right" vertical="top"/>'),
    xf('numFmtId="0" fontId="3" fillId="3" borderId="0" applyFont="1" applyFill="1" applyAlignment="1"', '<alignment vertical="top" wrapText="1" indent="1"/>')
  ];
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="&quot;$&quot;\\ #,##0"/></numFmts>
<fonts count="6">
<font><sz val="11"/><color rgb="FF13332A"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="18"/><color rgb="FF0B4D3B"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="11"/><color rgb="FF0B4D3B"/><name val="Calibri"/><family val="2"/></font>
<font><i/><sz val="10"/><color rgb="FF5A6F68"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="12"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>
</fonts>
<fills count="6">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF0B4D3B"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFEEF4EF"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFFF4DC"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF188B58"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>${borde}</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
<dxfs count="0"/><tableStyles count="0" defaultTableStyle="TableStyleMedium9" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>`;
}

// ───────── Acceso al paquete zip ─────────
function abrirPaquete(u8) {
  const X = libreria();
  const cfb = X.CFB.read(u8, { type: 'array' });
  const indice = (ruta) => cfb.FullPaths.findIndex((p) => p.endsWith(`/${ruta}`));
  const leer = (ruta) => { const i = indice(ruta); return i < 0 ? null : new TextDecoder().decode(cfb.FileIndex[i].content); };
  const escribir = (ruta, contenido) => {
    const datos = typeof contenido === 'string' ? new TextEncoder().encode(contenido) : contenido;
    const i = indice(ruta);
    if (i >= 0) { cfb.FileIndex[i].content = datos; cfb.FileIndex[i].size = datos.length; } else X.CFB.utils.cfb_add(cfb, ruta, datos);
  };
  const cerrar = () => new Uint8Array(X.CFB.write(cfb, { fileType: 'zip', type: 'array', compression: true }));
  return { leer, escribir, cerrar };
}

const letraCol = (n) => { let s = ''; let x = n + 1; while (x > 0) { const m = (x - 1) % 26; s = String.fromCharCode(65 + m) + s; x = Math.floor((x - 1) / 26); } return s; };
const numeroCol = (letras) => letras.split('').reduce((n, c) => n * 26 + (c.charCodeAt(0) - 64), 0) - 1;

// Aplica estilos celda a celda según una función (col, fila) → índice de estilo o undefined.
function estilizarCeldas(xml, fn) {
  return xml.replace(/<c r="([A-Z]+)(\d+)"([^>]*?)(\/?)>/g, (todo, col, fila, attrs, cierre) => {
    const s = fn(numeroCol(col), Number(fila));
    if (s === undefined) return todo;
    const limpio = attrs.replace(/\s+s="\d+"/, '');
    return `<c r="${col}${fila}"${limpio} s="${s}"${cierre}>`;
  });
}

function xmlValidaciones(validaciones) {
  if (!validaciones.length) return '';
  const items = validaciones.map((v) => {
    const comun = `allowBlank="1" showInputMessage="1" showErrorMessage="1" errorTitle="${escXml(v.tituloError || 'Valor no válido')}" error="${escXml(v.error || 'Elija un valor de la lista.')}"${v.prompt ? ` promptTitle="${escXml(v.promptTitulo || 'Ayuda')}" prompt="${escXml(v.prompt)}"` : ''} sqref="${v.rango}"`;
    if (v.tipo === 'lista') return `<dataValidation type="list" ${comun}><formula1>${escXml(v.fuente)}</formula1></dataValidation>`;
    if (v.tipo === 'decimal') return `<dataValidation type="decimal" operator="greaterThanOrEqual" ${comun}><formula1>${v.minimo ?? 0}</formula1></dataValidation>`;
    if (v.tipo === 'fecha') return `<dataValidation type="date" operator="between" ${comun}><formula1>${v.desde}</formula1><formula2>${v.hasta}</formula2></dataValidation>`;
    return '';
  }).join('');
  return `<dataValidations count="${validaciones.length}">${items}</dataValidations>`;
}

/*
 * Post-proceso de una hoja. op = {
 *   colEstilos: [índice de estilo por columna] | null, anchos: [wch],
 *   estiloCelda: fn(col, fila) → estilo, congelarFila: n, ocultarCuadricula, proteger,
 *   validaciones: [], colorPestana: 'FF0B4D3B', drawingRelId
 * }
 */
// Inserta un fragmento antes del primer elemento encontrado (respeta el orden del esquema OOXML).
function insertarAntes(xml, marcas, fragmento) {
  const posiciones = marcas.map((m) => xml.indexOf(m)).filter((i) => i >= 0);
  const i = Math.min(...posiciones);
  return `${xml.slice(0, i)}${fragmento}${xml.slice(i)}`;
}

function procesarHoja(xml, op) {
  let x = xml;
  if (op.colorPestana && !x.includes('<sheetPr')) x = x.replace('<dimension', `<sheetPr><tabColor rgb="${op.colorPestana}"/></sheetPr><dimension`);
  const vista = `<sheetView workbookViewId="0"${op.ocultarCuadricula ? ' showGridLines="0"' : ''}${op.zoom ? ` zoomScale="${op.zoom}" zoomScaleNormal="${op.zoom}"` : ''}>${op.congelarFila ? `<pane ySplit="${op.congelarFila}" topLeftCell="A${op.congelarFila + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${op.congelarFila + 1}" sqref="A${op.congelarFila + 1}"/>` : ''}</sheetView>`;
  if (/<sheetViews>.*?<\/sheetViews>/.test(x)) x = x.replace(/<sheetViews>.*?<\/sheetViews>/, `<sheetViews>${vista}</sheetViews>`);
  else x = x.replace(/(<dimension[^>]*\/>)/, `$1<sheetViews>${vista}</sheetViews>`);
  if (op.anchos) {
    const cols = op.anchos.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${(w + 0.83).toFixed(2)}" customWidth="1"${op.colEstilos && op.colEstilos[i] !== undefined ? ` style="${op.colEstilos[i]}"` : ''}/>`).join('');
    if (/<cols>.*?<\/cols>/.test(x)) x = x.replace(/<cols>.*?<\/cols>/, `<cols>${cols}</cols>`);
    else x = x.replace('<sheetData', `<cols>${cols}</cols><sheetData`);
  }
  if (op.estiloCelda) x = estilizarCeldas(x, op.estiloCelda);
  // Evita la marca verde de "número almacenado como texto" en todo el rango (SheetJS la agrega)
  let cola = '';
  if (op.proteger) cola += '<sheetProtection sheet="1" objects="1" scenarios="1" formatColumns="0" formatRows="0"/>';
  x = x.replace('</sheetData>', `</sheetData>${cola}`);
  const dv = xmlValidaciones(op.validaciones || []);
  if (dv) x = insertarAntes(x, ['<hyperlinks', '<printOptions', '<pageMargins', '<pageSetup', '<headerFooter', '<rowBreaks', '<colBreaks', '<ignoredErrors', '<drawing', '<legacyDrawing', '<tableParts', '<extLst', '</worksheet>'], dv);
  if (op.drawingRelId) x = insertarAntes(x, ['<legacyDrawing', '<picture', '<oleObjects', '<controls', '<tableParts', '<extLst', '</worksheet>'], `<drawing r:id="${op.drawingRelId}"/>`);
  return x;
}

// Inserta el logo institucional como imagen flotante en la hoja n (1 = primera).
function agregarLogo(paquete, n, bytes, { altoPx = 74, col = 0, fila = 0 } = {}) {
  const anchoPx = Math.round(altoPx * (522 / 383));
  const emu = (px) => Math.round(px * 9525);
  paquete.escribir(`xl/media/logo-etitc-${n}.png`, bytes);
  paquete.escribir(`xl/drawings/drawing${n}.xml`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><xdr:oneCellAnchor><xdr:from><xdr:col>${col}</xdr:col><xdr:colOff>${emu(8)}</xdr:colOff><xdr:row>${fila}</xdr:row><xdr:rowOff>${emu(6)}</xdr:rowOff></xdr:from><xdr:ext cx="${emu(anchoPx)}" cy="${emu(altoPx)}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="2" name="Logo ETITC" descr="Logo de la Escuela Tecnológica Instituto Técnico Central"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${emu(anchoPx)}" cy="${emu(altoPx)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>`);
  paquete.escribir(`xl/drawings/_rels/drawing${n}.xml.rels`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdImg1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/logo-etitc-${n}.png"/></Relationships>`);
  const relRuta = `xl/worksheets/_rels/sheet${n}.xml.rels`;
  const relDibujo = `<Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${n}.xml"/>`;
  const existente = paquete.leer(relRuta);
  paquete.escribir(relRuta, existente
    ? existente.replace('</Relationships>', `${relDibujo}</Relationships>`)
    : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relDibujo}</Relationships>`);
  let tipos = paquete.leer('[Content_Types].xml');
  if (!tipos.includes('Extension="png"')) tipos = tipos.replace('<Default Extension="xml"', '<Default Extension="png" ContentType="image/png"/><Default Extension="xml"');
  tipos = tipos.replace('</Types>', `<Override PartName="/xl/drawings/drawing${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>`);
  paquete.escribir('[Content_Types].xml', tipos);
  return 'rIdLogo';
}

function postProcesar(u8, { hojas, logo, calcularAlAbrir = false }) {
  const p = abrirPaquete(u8);
  p.escribir('xl/styles.xml', estilosXml());
  hojas.forEach((op, i) => {
    const n = i + 1;
    const ruta = `xl/worksheets/sheet${n}.xml`;
    const xml = p.leer(ruta);
    if (!xml) return;
    let drawingRelId = null;
    if (op.logo && logo) drawingRelId = agregarLogo(p, n, logo, op.logo === true ? {} : op.logo);
    p.escribir(ruta, procesarHoja(xml, { ...op, drawingRelId }));
  });
  if (calcularAlAbrir) {
    let wb = p.leer('xl/workbook.xml');
    const calc = '<calcPr calcId="191029" fullCalcOnLoad="1"/>';
    wb = wb.includes('</definedNames>') ? wb.replace('</definedNames>', `</definedNames>${calc}`) : wb.replace('</sheets>', `</sheets>${calc}`);
    p.escribir('xl/workbook.xml', wb);
  }
  return p.cerrar();
}

function escribirLibro(wb, opcionesPost) {
  const X = libreria();
  const base = new Uint8Array(X.write(wb, { type: 'array', bookType: 'xlsx', compression: true }));
  try {
    return { bytes: postProcesar(base, opcionesPost), conFormato: true };
  } catch (e) {
    console.warn('No se pudo aplicar el formato institucional al Excel; se entrega sin formato.', e);
    return { bytes: base, conFormato: false };
  }
}

const tipoMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// ───────── Plantilla de formulación ─────────
/*
 * ctx = { persona: {nombre, correo, cargo}, dependencia: {codigo, nombre}, dependencias, metas, modalidades,
 *         festivos, config, logo (Uint8Array|null), ejemplo: false }
 */
function generarPlantilla(ctx) {
  const X = libreria();
  const filasEd = ctx.config?.plantilla?.filasEditables || FILAS_EDITABLES_DEFECTO;
  const ultima = filasEd + 1;
  const tipos = ctx.config?.plantilla?.tiposNecesidad || TIPOS_NECESIDAD.map((t) => t.nombre);
  const trimestres = ctx.config?.plantilla?.trimestres || ['T1', 'T2', 'T3', 'T4'];
  const metas = ctx.metas || [];
  const lineas = metas.flatMap((m) => (m.lineasPDI || []).map((l) => ({ ...l, metaId: m.id })));
  const deps = ctx.dependencias || [];
  const mods = ctx.modalidades || [];
  const fest = ctx.festivos || [];
  const dep = ctx.dependencia;
  const etiquetaDep = (d) => `${d.codigo} — ${d.nombre}`;
  const wb = X.utils.book_new();
  const umbral = ctx.config?.umbrales?.maxAccionesPorDependencia ?? 15;

  // Hoja Instructivo
  const regla = 'En 2026 el plan se llenó de productos para dar cumplimiento. En 2027 el criterio cambia: la evidencia se consolida en informes macro de peso y valor, que recojan el cumplimiento de la meta de manera agregada, en lugar de calificar semana a semana lotes de productos menores. Se robustece la evidencia sin aumentar el volumen.';
  const sec = (t) => [t, ''];
  const inst = [
    [null, null], [null, 'Jornada de Planeación 2027 — Plantilla de formulación'], [null, 'Oficina Asesora de Planeación y Desarrollo Institucional · Escuela Tecnológica Instituto Técnico Central'], [null, null],
    [null, null],
    ['Dependencia que formula', dep ? etiquetaDep(dep) : ' '],
    ['Diligenciado por', ctx.persona?.nombre || ' '],
    ['Correo institucional', ctx.persona?.correo || ' '],
    ['Plantilla generada', `${fechaLarga(hoyISO())}, ${horaLegible()}`],
    [null, null],
    sec('QUÉ SE PIDE'),
    ['Objetivo', 'Formular la planeación 2027 de la dependencia en un solo archivo: las acciones que aportan a las metas institucionales, las necesidades que esas acciones generan y las adquisiciones que resuelven esas necesidades.'],
    ['Entrega', 'Cargue este archivo en el aplicativo de la jornada (pestaña «Formulación y pase», paso 3). Si no tiene errores bloqueantes, el aplicativo emite su pase de acceso.'],
    [null, null],
    sec('LA CADENA LÓGICA'),
    ['Regla', 'Metas 2027  →  Plan de acción  →  Plan de necesidades  →  Plan de adquisiciones'],
    ['Qué significa', 'Nada existe aguas abajo sin su eslabón aguas arriba. Toda acción aporta a una meta 2027 y a una línea del PDI. Toda necesidad nace de una acción (columna «Código de acción que la origina»). Toda adquisición resuelve una necesidad (columna «Código de necesidad»). Una necesidad sin acción o una adquisición sin necesidad son inválidas.'],
    [null, null],
    sec('HOJA POR HOJA'),
    ['Acciones', `Una fila por acción. Use códigos únicos (A-01, A-02…). Elija meta y línea en las listas desplegables. El indicador debe tener unidad de medida y meta cuantitativa (solo el número). Sugerencia: no más de ${umbral} acciones por dependencia.`],
    ['Necesidades', 'Una fila por necesidad. Use códigos únicos (N-01, N-02…). En «Código de acción que la origina» elija el código de una acción de la hoja Acciones. Tipo: bien, servicio, talento humano o infraestructura. Valor estimado en pesos.'],
    ['Adquisiciones', 'Una fila por compra o contrato. En «Código de necesidad» elija una necesidad de la hoja Necesidades. Elija la modalidad y la fecha en que necesita el bien o servicio operando: la columna «Fecha límite de radicación de estudios previos» se calcula sola, en días hábiles, descontando fines de semana y festivos.'],
    ['Listas', 'Contiene los catálogos que alimentan las listas desplegables (dependencias, metas, líneas, modalidades, trimestres, tipos y festivos). No la modifique.'],
    [null, null],
    sec('CÓMO VAMOS A REPORTAR EN 2027'),
    ['Regla de evidencia macro', regla],
    ['En la práctica', 'En la columna «Evidencia macro comprometida» describa el informe que consolidará el cumplimiento de la acción (por ejemplo: «Informe semestral de permanencia con análisis por sede»), no la lista de productos menores.'],
    [null, null],
    sec('ERRORES MÁS COMUNES'),
    ['1', 'Necesidades que apuntan a un código de acción que no existe o que se escribió distinto (A1 en vez de A-01).'],
    ['2', 'Adquisiciones sin código de necesidad, o con un código que no está en la hoja Necesidades.'],
    ['3', 'Acciones sin meta 2027 o sin línea del PDI.'],
    ['4', 'Indicadores sin unidad de medida o con texto en «Meta cuantitativa» (escriba solo el número).'],
    ['5', 'Trimestre de cierre anterior al trimestre de inicio.'],
    ['6', `Atomizar: más de ${umbral} acciones pequeñas en lugar de pocas acciones con informes macro.`],
    ['7', 'Valores estimados en cero o vacíos.'],
    ['8', 'Cambiar el nombre de las hojas o de los encabezados: el aplicativo ya no podrá leer el archivo.'],
    [null, null],
    sec('CÓMO SE VALIDA'),
    ['Bloqueante', 'Impide emitir el pase. Debe corregirse y volver a cargar el archivo.'],
    ['Advertencia', 'Deja emitir el pase, pero queda registrada para la revisión de la OAPDI.'],
    [null, null],
    ['Datos provisionales', 'Las metas, líneas del PDI, modalidades y tiempos de contratación de esta plantilla son PROVISIONALES hasta su aprobación por la OAPDI.']
  ];
  const wsI = X.utils.aoa_to_sheet(inst);
  wsI['!cols'] = [{ wch: 30 }, { wch: 112 }];
  wsI['!rows'] = [{ hpt: 20 }, { hpt: 30 }, { hpt: 18 }, { hpt: 18 }];
  X.utils.book_append_sheet(wb, wsI, HOJAS.instructivo);
  const filaSeccion = new Set(inst.map((r, i) => (r[1] === '' && r[0] && r[0] === r[0].toUpperCase() ? i + 1 : null)).filter(Boolean));
  const filaRegla = inst.findIndex((r) => r[0] === 'Regla de evidencia macro') + 1;
  const filaProv = inst.length;

  // Hojas de datos
  const hojaDatos = (nombre) => {
    const cols = ESQUEMA[nombre];
    const ws = X.utils.aoa_to_sheet([cols.map((c) => c.titulo)]);
    ws['!cols'] = cols.map((c) => ({ wch: c.ancho }));
    ws['!rows'] = [{ hpt: 42 }];
    ws['!ref'] = `A1:${letraCol(cols.length - 1)}${ultima}`;
    return ws;
  };
  const wsA = hojaDatos('Acciones');
  const wsN = hojaDatos('Necesidades');
  const wsQ = hojaDatos('Adquisiciones');
  for (let r = 2; r <= ultima; r += 1) {
    wsQ[`E${r}`] = { t: 'n', f: `IF(OR(B${r}="",D${r}=""),"",IFERROR(WORKDAY(D${r},-VLOOKUP(B${r},TablaModalidades,2,FALSE),Festivos),"Revise la modalidad"))` };
  }

  // Ejemplo diligenciado (para capacitación y pruebas)
  if (ctx.ejemplo) llenarEjemplo(X, { wsA, wsN, wsQ, metas, lineas, mods, dep });

  X.utils.book_append_sheet(wb, wsA, HOJAS.acciones);
  X.utils.book_append_sheet(wb, wsN, HOJAS.necesidades);
  X.utils.book_append_sheet(wb, wsQ, HOJAS.adquisiciones);

  // Hoja Listas
  const listas = [['Dependencias', 'Metas institucionales 2027', 'Líneas del PDI', 'Modalidades de contratación', 'Días hábiles del trámite', 'Trimestres', 'Tipos de necesidad', 'Festivos', 'Nombre del festivo']];
  const largo = Math.max(deps.length, metas.length, lineas.length, mods.length, trimestres.length, tipos.length, fest.length);
  for (let i = 0; i < largo; i += 1) {
    const m = mods[i];
    listas.push([
      deps[i] ? etiquetaDep(deps[i]) : null,
      metas[i] ? `${metas[i].id} — ${metas[i].nombre}` : null,
      lineas[i] ? `${lineas[i].id} — ${lineas[i].nombre}` : null,
      m ? m.nombre : null,
      m ? (m.etapas || []).reduce((s, e) => s + Number(e.diasHabiles || 0), 0) || m.diasHabilesTotales : null,
      trimestres[i] || null,
      tipos[i] || null,
      fest[i] ? serieExcel(fest[i].fecha) : null,
      fest[i] ? fest[i].nombre : null
    ]);
  }
  const wsL = X.utils.aoa_to_sheet(listas);
  wsL['!cols'] = [{ wch: 52 }, { wch: 44 }, { wch: 52 }, { wch: 36 }, { wch: 14 }, { wch: 11 }, { wch: 18 }, { wch: 13 }, { wch: 30 }];
  wsL['!rows'] = [{ hpt: 32 }];
  X.utils.book_append_sheet(wb, wsL, HOJAS.listas);

  const rango = (col, n) => `Listas!$${col}$2:$${col}$${Math.max(2, n + 1)}`;
  wb.Workbook = {
    Names: [
      { Name: 'LST_Dependencias', Ref: rango('A', deps.length) },
      { Name: 'LST_Metas', Ref: rango('B', metas.length) },
      { Name: 'LST_Lineas', Ref: rango('C', lineas.length) },
      { Name: 'LST_Modalidades', Ref: rango('D', mods.length) },
      { Name: 'TablaModalidades', Ref: `Listas!$D$2:$E$${Math.max(2, mods.length + 1)}` },
      { Name: 'LST_Trimestres', Ref: rango('F', trimestres.length) },
      { Name: 'LST_Tipos', Ref: rango('G', tipos.length) },
      { Name: 'Festivos', Ref: rango('H', fest.length) },
      { Name: 'LST_CodigosAccion', Ref: `Acciones!$A$2:$A$${ultima}` },
      { Name: 'LST_CodigosNecesidad', Ref: `Necesidades!$A$2:$A$${ultima}` }
    ]
  };

  const estiloColumna = (c) => ({ numero: S.entradaNumero, moneda: S.entradaMoneda, fecha: S.entradaFecha, formula: S.formulaFecha }[c.tipo] ?? S.entrada);
  const opsDatos = (nombre, validaciones, extra = {}) => ({
    anchos: ESQUEMA[nombre].map((c) => c.ancho),
    colEstilos: ESQUEMA[nombre].map(estiloColumna),
    estiloCelda: (col, fila) => (fila === 1 ? S.encabezado : (ESQUEMA[nombre][col] ? estiloColumna(ESQUEMA[nombre][col]) : undefined)),
    congelarFila: 1,
    proteger: true,
    colorPestana: 'FF188B58',
    validaciones,
    ...extra
  });
  const r = (col) => `${col}2:${col}${ultima}`;
  const lista = (col, fuente, prompt) => ({ tipo: 'lista', rango: r(col), fuente, prompt, error: 'Elija un valor de la lista desplegable.' });
  const numeroPos = (col, prompt) => ({ tipo: 'decimal', rango: r(col), minimo: 0, prompt, error: 'Escriba un número mayor o igual a cero, sin texto.' });

  const { bytes, conFormato } = escribirLibro(wb, {
    logo: ctx.logo,
    calcularAlAbrir: true,
    hojas: [
      {
        anchos: [30, 112],
        estiloCelda: (col, fila) => {
          if (fila === 2 && col === 1) return S.titulo;
          if (fila === 3 && col === 1) return S.subtitulo;
          if (fila >= 6 && fila <= 9) return col === 0 ? S.etiqueta : (fila <= 8 ? S.entrada : S.texto);
          if (filaSeccion.has(fila)) return S.seccion;
          if (fila === filaRegla && col === 1) return S.cita;
          if (fila === filaProv) return S.nota;
          return col === 0 ? S.etiqueta : S.texto;
        },
        ocultarCuadricula: true,
        proteger: true,
        colorPestana: 'FF0B4D3B',
        logo: { altoPx: 74, col: 0, fila: 0 },
        validaciones: [{ tipo: 'lista', rango: 'B6', fuente: 'LST_Dependencias', prompt: 'Elija su dependencia de la lista.', error: 'Elija una dependencia de la lista.' }]
      },
      opsDatos('Acciones', [
        lista('B', 'LST_Lineas', 'Elija la línea del Plan de Desarrollo Institucional.'),
        lista('C', 'LST_Metas', 'Elija la meta institucional 2027 a la que aporta.'),
        numeroPos('H', 'Solo el número. La unidad va en la columna anterior.'),
        lista('I', 'LST_Trimestres'), lista('J', 'LST_Trimestres')
      ]),
      opsDatos('Necesidades', [
        lista('B', 'LST_CodigosAccion', 'Elija el código de una acción de la hoja Acciones.'),
        lista('C', 'LST_Tipos'),
        numeroPos('E'), numeroPos('F', 'Valor en pesos colombianos.'),
        lista('G', 'LST_Trimestres')
      ]),
      opsDatos('Adquisiciones', [
        lista('A', 'LST_CodigosNecesidad', 'Elija el código de una necesidad de la hoja Necesidades.'),
        lista('B', 'LST_Modalidades'),
        numeroPos('C', 'Valor en pesos colombianos.'),
        { tipo: 'fecha', rango: r('D'), desde: serieExcel('2026-01-01'), hasta: serieExcel('2028-12-31'), prompt: 'Fecha en que necesita el bien o servicio operando (dd/mm/aaaa).', error: 'Escriba una fecha entre 2026 y 2028 con formato dd/mm/aaaa.' }
      ]),
      {
        anchos: [52, 44, 52, 36, 14, 11, 18, 13, 30],
        estiloCelda: (col, fila) => (fila === 1 ? S.encabezado : col === 7 ? S.fechaBloqueada : S.celda),
        congelarFila: 1,
        proteger: true,
        colorPestana: 'FF6D847C'
      }
    ]
  });
  const sufijo = dep ? `${dep.codigo}-${(dep.sigla || '').replace(/[^A-Za-z0-9]/g, '')}` : 'ETITC';
  return {
    blob: new Blob([bytes], { type: tipoMime }),
    nombre: `JP2027_${ctx.ejemplo ? 'Ejemplo' : 'Plantilla'}_${sufijo}.xlsx`,
    conFormato
  };
}

// Datos de ejemplo coherentes con el catálogo (sirven para capacitación y para probar la validación).
function llenarEjemplo(X, { wsA, wsN, wsQ, metas, lineas, mods, dep }) {
  const l = (i) => (lineas[i] ? `${lineas[i].id} — ${lineas[i].nombre}` : '');
  const m = (id) => { const x = metas.find((y) => y.id === id); return x ? `${x.id} — ${x.nombre}` : ''; };
  const linea0 = lineas[0] || { metaId: metas[0]?.id };
  const linea1 = lineas[3] || linea0;
  const mod = (id) => (mods.find((x) => x.id === id) || mods[0] || {}).nombre || '';
  const responsable = dep ? `Coordinación ${dep.sigla || dep.nombre}` : 'Coordinación de la dependencia';
  X.utils.sheet_add_aoa(wsA, [
    ['A-01', l(0), m(linea0.metaId), 'Autoevaluación de programas con plan de mejoramiento', 'Ciclo de autoevaluación de los programas con plan de mejoramiento priorizado', 'Programas autoevaluados', 'Programas', 5, 'T1', 'T3', responsable, 'Informe consolidado de autoevaluación y plan de mejoramiento 2027'],
    ['A-02', l(3), m(linea1.metaId), 'Dotación de talleres para nuevas sedes', 'Equipamiento de los talleres de las sedes en ampliación', 'Talleres dotados en operación', 'Talleres', 3, 'T2', 'T4', responsable, 'Informe semestral de dotación y uso de talleres por sede']
  ], { origin: 'A2' });
  X.utils.sheet_add_aoa(wsN, [
    ['N-01', 'A-01', 'Servicio', 'Acompañamiento experto para la autoevaluación', 1, 45000000, 'T1', 'Se requiere apoyo metodológico externo para el ciclo'],
    ['N-02', 'A-02', 'Bien', 'Bancos de trabajo y herramientas para taller', 12, 180000000, 'T2', 'Dotación mínima para operar los talleres de la nueva sede'],
    ['N-03', 'A-02', 'Infraestructura', 'Adecuación eléctrica de talleres', 1, 95000000, 'T2', 'Los equipos requieren red eléctrica trifásica']
  ], { origin: 'A2' });
  X.utils.sheet_add_aoa(wsQ, [
    ['N-01', mod('minima'), 45000000, null, null, 'Contrato de consultoría'],
    ['N-02', mod('abreviada'), 180000000, null, null, 'Compra consolidada con otras dependencias'],
    ['N-03', mod('abreviada'), 95000000, null, null, 'Obra menor']
  ], { origin: 'A2' });
  const fechas = ['2027-03-01', '2027-06-01', '2027-05-03'];
  fechas.forEach((f, i) => { wsQ[`D${i + 2}`] = { t: 'n', v: serieExcel(f) }; });
}

// ───────── Lectura ─────────
async function leerLibro(archivo) {
  const X = libreria();
  if (!archivo) throw new Error('No se recibió ningún archivo.');
  if (archivo.size > 15 * 1024 * 1024) throw new Error('El archivo pesa más de 15 MB. Verifique que sea la plantilla de la jornada.');
  if (!/\.(xlsx|xls|xlsm)$/i.test(archivo.name)) throw new Error('El archivo debe ser de Excel (.xlsx o .xls).');
  const datos = new Uint8Array(await archivo.arrayBuffer());
  let wb;
  try {
    wb = X.read(datos, { type: 'array', cellDates: true, cellFormula: false });
  } catch (e) {
    throw new Error('No fue posible abrir el archivo. Puede estar dañado o protegido con contraseña.');
  }
  const hojas = {};
  wb.SheetNames.forEach((nombre) => {
    const ws = wb.Sheets[nombre];
    if (!ws || !ws['!ref']) { hojas[nombre] = []; return; }
    const r = X.utils.decode_range(ws['!ref']);
    hojas[nombre] = X.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, blankrows: true, range: { s: { r: 0, c: 0 }, e: r.e } });
  });
  return { nombreArchivo: archivo.name, hojas };
}

// ───────── Exportación de tablas ─────────
/*
 * hojas: [{ nombre, titulo, subtitulo, columnas: [{ titulo, ancho, tipo: 'texto'|'moneda'|'fecha'|'numero' }], filas: [[...]] }]
 */
function exportarExcel({ nombreArchivo, hojas, logo = null }) {
  const X = libreria();
  const wb = X.utils.book_new();
  const FILA_ENC = 6;
  const ops = [];
  hojas.forEach((h) => {
    // El título va en la primera columna que queda libre a la derecha del logo (unos 115 px)
    const px = (c) => (c?.ancho || 18) * 7 + 5;
    const colTit = px(h.columnas[0]) >= 118 ? 1 : 2;
    const enCol = (v) => { const f = [null, null, null]; f[colTit] = v; return f.slice(0, colTit + 1); };
    const aoa = [
      [null], enCol(h.titulo || ''), enCol(h.subtitulo || ''), enCol(`Generado el ${fechaLarga(hoyISO())}, ${horaLegible()} · Jornada de Planeación 2027 · OAPDI`), [null],
      h.columnas.map((c) => c.titulo),
      ...h.filas.map((f) => f.map((v, i) => {
        const t = h.columnas[i]?.tipo;
        if (v === null || v === undefined || v === '') return null;
        if (t === 'fecha') return /^\d{4}-\d{2}-\d{2}/.test(String(v)) ? serieExcel(String(v).slice(0, 10)) : v;
        if (t === 'moneda' || t === 'numero') return Number(v);
        return v;
      }))
    ];
    const ws = X.utils.aoa_to_sheet(aoa);
    ws['!cols'] = h.columnas.map((c) => ({ wch: c.ancho || 18 }));
    ws['!rows'] = [{ hpt: 22 }, { hpt: 26 }, { hpt: 18 }, { hpt: 18 }, { hpt: 8 }, { hpt: 34 }];
    if (h.filas.length) ws['!autofilter'] = { ref: `A${FILA_ENC}:${letraCol(h.columnas.length - 1)}${FILA_ENC + h.filas.length}` };
    X.utils.book_append_sheet(wb, ws, h.nombre.slice(0, 31));
    const estiloDato = (c) => ({ moneda: S.celdaMoneda, fecha: S.celdaFecha, numero: S.celdaNumero }[c?.tipo] ?? S.celda);
    ops.push({
      anchos: h.columnas.map((c) => c.ancho || 18),
      estiloCelda: (col, fila) => {
        if (fila === 2) return S.titulo;
        if (fila === 3 || fila === 4) return S.subtitulo;
        if (fila === FILA_ENC) return S.encabezado;
        if (fila > FILA_ENC) return estiloDato(h.columnas[col]);
        return undefined;
      },
      congelarFila: FILA_ENC,
      colorPestana: 'FF188B58',
      logo: { altoPx: 74, col: 0, fila: 0 }
    });
  });
  const { bytes } = escribirLibro(wb, { hojas: ops, logo });
  return { blob: new Blob([bytes], { type: tipoMime }), nombre: nombreArchivo };
}

Object.assign(__m["src/lib/excel.js"], { xlsxDisponible, generarPlantilla, leerLibro, exportarExcel });
})();

// ── src/lib/qr.js ──
__m["src/lib/qr.js"] = {};
(function () {
/*
 * qr.js — Pases de acceso: identificador único, contenido del QR, firma simple y verificación.
 * La firma (hash) permite detectar pases alterados a mano. No es criptografía fuerte: la sal vive en
 * data/config.json, que es público en un sitio estático. Sirve para el control de ingreso, no como credencial.
 */

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O ni 1/I para evitar confusiones al dictarlo

// cyrb53: hash rápido de 53 bits con buena dispersión.
function cyrb53(texto, semilla = 0) {
  let h1 = 0xdeadbeef ^ semilla; let h2 = 0x41c6ce57 ^ semilla;
  for (let i = 0; i < texto.length; i += 1) {
    const ch = texto.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

function firmar(pase, sal) {
  const cadena = [pase.id, pase.n, pase.c, pase.d, pase.e, pase.ts].join('|');
  const a = cyrb53(`${sal}|${cadena}`, 27).toString(36);
  const b = cyrb53(`${cadena}|${sal}`, 2027).toString(36);
  return `${a}${b}`.toUpperCase().slice(0, 12);
}

function aleatorio(n) {
  const bytes = new Uint8Array(n);
  (globalThis.crypto || window.crypto).getRandomValues(bytes);
  return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join('');
}

function generarIdPase(codigoDependencia, prefijo = 'JP27') {
  return `${prefijo}-${codigoDependencia}-${aleatorio(5)}`;
}

// Crea el contenido del pase: {"id","n","c","d","e","ts","h"}
function crearPase({ nombre, cargo, dependencia, correo, prefijo, sal }) {
  const pase = { id: generarIdPase(dependencia, prefijo), n: nombre, c: cargo, d: dependencia, e: correo, ts: Date.now(), h: '' };
  pase.h = firmar(pase, sal);
  return pase;
}

function contenidoQR(pase) {
  return JSON.stringify({ id: pase.id, n: pase.n, c: pase.c, d: pase.d, e: pase.e, ts: pase.ts, h: pase.h });
}

// Verifica el texto leído por la cámara. Devuelve { valido, motivo, pase }.
function verificarPase(texto, { sal, prefijo = 'JP27', dependenciasValidas = null }) {
  let pase;
  try { pase = JSON.parse(String(texto).trim()); } catch { return { valido: false, motivo: 'El código leído no es un pase de la jornada.' }; }
  if (!pase || typeof pase !== 'object') return { valido: false, motivo: 'El código leído no es un pase de la jornada.' };
  const faltan = ['id', 'n', 'd', 'ts', 'h'].filter((k) => pase[k] === undefined || pase[k] === null || pase[k] === '');
  if (faltan.length) return { valido: false, motivo: 'Al pase le faltan datos: no fue emitido por el aplicativo.' };
  const patron = new RegExp(`^${prefijo}-(\\d{3})-[${ALFABETO}]{5}$`);
  const m = patron.exec(pase.id);
  if (!m || m[1] !== String(pase.d)) return { valido: false, motivo: 'El identificador del pase no tiene el formato de la jornada.', pase };
  if (dependenciasValidas && !dependenciasValidas.has(String(pase.d))) return { valido: false, motivo: 'La dependencia del pase no existe en el catálogo.', pase };
  if (firmar(pase, sal) !== String(pase.h).toUpperCase()) return { valido: false, motivo: 'La firma no coincide: el pase fue alterado o emitido con otra configuración.', pase };
  return { valido: true, pase };
}

function qrDisponible() { return Boolean(window.QRCode && (window.QRCode.toCanvas || window.QRCode.toDataURL)); }

// Genera la imagen del QR como data URL (PNG). Error de corrección M, módulos en verde institucional.
async function qrComoDataUrl(texto, { tamano = 360, oscuro = '#0b4d3b' } = {}) {
  if (!qrDisponible()) throw new Error('La librería de códigos QR no cargó.');
  return window.QRCode.toDataURL(texto, { errorCorrectionLevel: 'M', margin: 1, width: tamano, color: { dark: oscuro, light: '#ffffff' } });
}

Object.assign(__m["src/lib/qr.js"], { firmar, generarIdPase, crearPase, contenidoQR, verificarPase, qrDisponible, qrComoDataUrl });
})();

// ── src/tabs/formulacion.js ──
__m["src/tabs/formulacion.js"] = {};
(function () {
/*
 * formulacion.js — Pestaña 2 (crítica): Formulación y pase. Flujo de cuatro pasos:
 *   1. Identificación con correo institucional (autocompleta desde data/directorio.json).
 *   2. Descarga de la plantilla Excel construida en el momento.
 *   3. Cargue y validación del Excel en el navegador (hallazgos bloqueantes y advertencias).
 *   4. Emisión del pase de acceso con QR firmado (PNG, PDF y texto para correo).
 * Maneja las reglas del directorio real: correos sin registrar, buzones compartidos y registros sin nombre.
 */
const { estado, dependencia, dependencias, personasPorCorreo, umbral } = __m["src/estado.js"];
const { esc, on } = __m["src/ui/dom.js"];
const { icono } = __m["src/ui/iconos.js"];
const { toast, toastError } = __m["src/ui/toast.js"];
const { cadenaLogica, tarjetaCifra, activarAnimaciones, estadoVacio } = __m["src/ui/cards.js"];
const { graficaBarras } = __m["src/ui/graficas.js"];
const { generarPlantilla, leerLibro, exportarExcel, xlsxDisponible } = __m["src/lib/excel.js"];
const { validarFormulacion } = __m["src/lib/validacion.js"];
const { crearPase, contenidoQR, qrComoDataUrl, qrDisponible } = __m["src/lib/qr.js"];
const { descargarBlob, obtenerLogo, elementoAPng, elementoAPdf, copiarTexto, pdfDisponible, capturaDisponible } = __m["src/lib/export.js"];
const { moneda, monedaCompacta, iniciales, tituloLegible, plural } = __m["src/lib/formato.js"];
const { fechaLarga, fechaCorta } = __m["src/lib/fechas.js"];
const { TIPOS_PROCESO } = __m["src/config.js"];

const PASOS = [
  { n: 1, titulo: 'Identificación', sub: 'Correo institucional' },
  { n: 2, titulo: 'Plantilla', sub: 'Descargue el Excel' },
  { n: 3, titulo: 'Cargue y validación', sub: 'Revise los hallazgos' },
  { n: 4, titulo: 'Pase de acceso', sub: 'QR para el ingreso' }
];
const CLAVE_SESION = 'etitc-jp27:sesion';
let raiz = null;
let ctxApp = null;
let filtroHallazgos = 'todos';

// ───────── Sesión (conveniencia: sobrevive a una recarga; no es dato crítico) ─────────
function guardarSesion() {
  try { sessionStorage.setItem(CLAVE_SESION, JSON.stringify(estado.sesion)); } catch { /* opcional */ }
}
function recuperarSesion() {
  try {
    const s = JSON.parse(sessionStorage.getItem(CLAVE_SESION) || 'null');
    if (s && typeof s === 'object') Object.assign(estado.sesion, s);
  } catch { /* opcional */ }
}

const dominio = () => (estado.datos.config?.dominioInstitucional || estado.datos.directorio?.dominioInstitucional || '@itc.edu.co').toLowerCase();
const ident = () => estado.sesion.identificacion;

function puedeIr(n) {
  if (n === 1) return true;
  if (n === 2 || n === 3) return Boolean(ident()?.completa);
  if (n === 4) return Boolean(ident()?.completa && (estado.sesion.pase || (estado.sesion.validacion && estado.sesion.validacion.resumen.bloqueantes === 0)));
  return false;
}

function irPaso(n, { foco = true } = {}) {
  if (!puedeIr(n)) return;
  estado.sesion.paso = n;
  guardarSesion();
  pintarStepper();
  const cont = raiz.querySelector('[data-paso-cont]');
  cont.classList.remove('paso-enter');
  void cont.offsetWidth;
  cont.classList.add('paso-enter');
  if (n === 1) pintarPaso1(cont);
  if (n === 2) pintarPaso2(cont);
  if (n === 3) pintarPaso3(cont);
  if (n === 4) pintarPaso4(cont);
  activarAnimaciones(cont);
  if (foco) {
    const h = cont.querySelector('h2');
    if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
    raiz.querySelector('.stepper').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function pintarStepper() {
  const actual = estado.sesion.paso || 1;
  const ol = raiz.querySelector('.stepper');
  ol.innerHTML = PASOS.map((p) => {
    const hecho = p.n < actual || (p.n === 4 && estado.sesion.pase);
    const habil = puedeIr(p.n);
    return `<li class="step ${p.n === actual ? 'is-current' : ''} ${hecho && p.n !== actual ? 'is-done' : ''}">
      <button type="button" class="step-btn" data-ir="${p.n}" ${p.n === actual ? 'aria-current="step"' : ''} aria-disabled="${!habil}" aria-label="Paso ${p.n}: ${p.titulo}${hecho ? ' (completado)' : ''}">
        <span class="step-num">${hecho && p.n !== actual ? icono('check', 'icon-sm') : p.n}</span>
        <span class="step-text">${p.titulo}<small>${p.sub}</small></span>
      </button></li>`;
  }).join('');
  raiz.querySelector('.stepper-bar > span').style.width = `${((actual - 1) / 3) * 100}%`;
}

// ───────── Paso 1: identificación ─────────
function tarjetaPersona(p, { conNombreEditable = false } = {}) {
  const d = dependencia(p.dependencia);
  return `<div class="persona-card reveal">
    <span class="avatar" aria-hidden="true">${esc(iniciales(p.nombre || 'Sin nombre'))}</span>
    <div class="persona-info">
      <strong class="persona-nombre">${esc(p.nombre || 'Nombre no registrado en el directorio')}</strong>
      <span>${esc(tituloLegible(p.cargo))}</span>
      <span class="row" style="gap:6px;margin-top:4px">
        ${d ? `<span class="badge proc-${esc(d.tipoProceso)}"><span class="proc-dot"></span>${esc(d.codigo)} · ${esc(d.nombre)}</span>` : ''}
        <span class="badge">${esc(p.vinculacion === 'contratista' ? 'Contratista' : 'Funcionario')}</span>
        ${p.grupo ? `<span class="badge">${esc(p.grupo)}</span>` : ''}
      </span>
    </div>
    ${conNombreEditable ? '' : `<span class="badge badge-ok">${icono('usuarioCheck', 'icon-sm')}Verificado</span>`}
  </div>`;
}

function opcionesDependencia(sel) {
  return `<option value="">Elija su dependencia…</option>${dependencias().map((d) => `<option value="${esc(d.codigo)}" ${String(sel) === String(d.codigo) ? 'selected' : ''}>${esc(d.codigo)} · ${esc(d.nombre)}</option>`).join('')}`;
}

function pintarPaso1(cont) {
  const i = ident() || {};
  cont.innerHTML = `<div class="grid-2 paso-grid">
    <div class="card reveal">
      <h2>Identifíquese</h2>
      <p class="muted">Use su correo institucional. Lo buscamos en el Directorio de Funcionarios 2026 (corte ${esc(fechaCorta(estado.datos.directorio?.actualizado))}) para llenar sus datos.</p>
      <form class="stack" data-form-ident novalidate>
        <div class="field">
          <label class="field-label" for="correo">Correo institucional</label>
          <div class="input-icon">${icono('correo')}<input class="input" id="correo" name="correo" type="email" inputmode="email" autocomplete="email" placeholder="usuario${esc(dominio())}" value="${esc(i.correo || '')}" aria-describedby="correo-ayuda correo-error" required></div>
          <span class="field-hint" id="correo-ayuda">Solo se aceptan correos terminados en ${esc(dominio())}.</span>
          <span class="field-error" id="correo-error" role="alert"></span>
        </div>
        <div data-resultado aria-live="polite"></div>
        <div class="row-between">
          <span class="muted" style="font-size:.82rem">¿No tiene correo en el directorio? En el ingreso lo registran manualmente.</span>
          <button type="submit" class="btn btn-primary btn-lg" data-continuar disabled>Continuar ${icono('flecha', 'icon-sm')}</button>
        </div>
      </form>
    </div>
    <aside class="card card-flat aside-cadena reveal">
      <span class="eyebrow">${icono('capas', 'icon-sm')}Así funciona</span>
      <h3>Del correo al pase en cuatro pasos</h3>
      <ol class="mini-pasos">
        <li><strong>Identifíquese</strong> con su correo institucional.</li>
        <li><strong>Descargue la plantilla</strong> generada para su dependencia, con listas desplegables.</li>
        <li><strong>Cárguela</strong>: el aplicativo revisa la cadena lógica y le dice qué corregir, hoja por hoja y fila por fila.</li>
        <li><strong>Reciba su pase</strong> con QR para el ingreso a la jornada.</li>
      </ol>
      <hr>
      <p class="muted mb-0" style="font-size:.86rem">Regla de oro: nada existe aguas abajo sin su eslabón aguas arriba.</p>
      <div style="margin-top:12px">${cadenaLogica({ incluirRiesgos: ctxApp.riesgosActivo })}</div>
    </aside>
  </div>`;

  const form = cont.querySelector('[data-form-ident]');
  const input = cont.querySelector('#correo');
  const err = cont.querySelector('#correo-error');
  const res = cont.querySelector('[data-resultado]');
  const btn = cont.querySelector('[data-continuar]');
  let seleccion = null; // persona elegida del directorio
  let t = null;

  const evaluarCompleto = () => {
    const correo = input.value.trim().toLowerCase();
    const okDominio = correo.endsWith(dominio()) && correo.length > dominio().length;
    let ok = okDominio;
    const nombre = res.querySelector('[name="nombre"]');
    const cargo = res.querySelector('[name="cargo"]');
    const dep = res.querySelector('[name="dependencia"]');
    if (nombre && !nombre.value.trim()) ok = false;
    if (cargo && !cargo.value.trim()) ok = false;
    if (dep && !dep.value) ok = false;
    if (res.querySelector('[data-elegir]') && !seleccion) ok = false;
    btn.disabled = !ok;
  };

  const buscar = () => {
    const correo = input.value.trim().toLowerCase();
    seleccion = null;
    err.textContent = '';
    input.removeAttribute('aria-invalid');
    if (!correo) { res.innerHTML = ''; evaluarCompleto(); return; }
    if (!correo.includes('@')) { res.innerHTML = `<p class="field-hint">Complete el correo: ¿${esc(correo)}${esc(dominio())}?</p>`; evaluarCompleto(); return; }
    if (!correo.endsWith(dominio())) {
      err.textContent = `Use su correo institucional terminado en ${dominio()}.`;
      input.setAttribute('aria-invalid', 'true');
      res.innerHTML = '';
      evaluarCompleto();
      return;
    }
    const encontrados = personasPorCorreo(correo);
    if (!encontrados.length) {
      res.innerHTML = `<div class="notice reveal is-visible">${icono('info')}<div><strong>Correo no encontrado en el directorio.</strong> Puede continuar: su registro quedará como <em>no verificado</em> para revisión de la OAPDI. Complete sus datos.</div></div>
        <div class="grid-2" style="gap:14px;margin-top:14px">
          <label class="field"><span class="field-label">Nombre completo</span><input class="input" name="nombre" autocomplete="name" value="${esc(i.correo === correo ? i.nombre || '' : '')}" required></label>
          <label class="field"><span class="field-label">Cargo</span><input class="input" name="cargo" autocomplete="organization-title" value="${esc(i.correo === correo ? i.cargo || '' : '')}" required></label>
        </div>
        <label class="field" style="margin-top:14px"><span class="field-label">Dependencia</span><select class="select" name="dependencia" required>${opcionesDependencia(i.correo === correo ? i.dependencia : '')}</select></label>`;
    } else if (encontrados.length > 1) {
      res.innerHTML = `<div class="notice reveal is-visible">${icono('personas')}<div><strong>Este buzón lo comparten ${encontrados.length} personas en el directorio.</strong> Elija quién es usted.</div></div>
        <div class="elegir" role="radiogroup" aria-label="Elija su registro" data-elegir>
          ${encontrados.map((p) => `<label class="elegir-op"><input type="radio" name="persona" value="${esc(p.id)}"> ${tarjetaPersona(p).replace('reveal', 'reveal is-visible')}</label>`).join('')}
        </div><div data-extra></div>`;
    } else {
      seleccion = encontrados[0];
      res.innerHTML = tarjetaPersona(seleccion).replace('reveal', 'reveal is-visible') + extraPersona(seleccion, i);
    }
    evaluarCompleto();
  };

  const extraPersona = (p, previo) => {
    let html = '';
    if (!p.nombre) {
      html += `<label class="field" style="margin-top:14px"><span class="field-label">El directorio no registra su nombre. Escríbalo como debe aparecer en el pase</span>
        <input class="input" name="nombre" autocomplete="name" value="${esc(previo.personaId === p.id ? previo.nombre || '' : '')}" required></label>`;
    }
    if (p.revisarDependencia) {
      html += `<label class="field" style="margin-top:14px"><span class="field-label">Confirme su dependencia</span>
        <select class="select" name="dependencia" required>${opcionesDependencia(previo.personaId === p.id ? previo.dependencia : p.dependencia)}</select>
        <span class="field-hint">En el directorio su dependencia se infirió por el correo o el cargo; la OAPDI la validará.</span></label>`;
    }
    const pase = estado.consolidado.pases.find((x) => x.e === p.correo && (!p.nombre || x.n === p.nombre));
    if (pase) html += `<div class="notice notice-ok" style="margin-top:14px">${icono('checkCirculo')}<div><strong>Ya tiene un pase emitido</strong> (${esc(pase.id)}). Puede continuar para verlo o volver a cargar su formulación.</div></div>`;
    return html;
  };

  input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(buscar, 220); });
  input.addEventListener('blur', () => {
    const v = input.value.trim();
    if (v && !v.includes('@')) { input.value = `${v}${dominio()}`; buscar(); }
  });
  res.addEventListener('input', evaluarCompleto);
  res.addEventListener('change', (ev) => {
    if (ev.target.name === 'persona') {
      const correo = input.value.trim().toLowerCase();
      seleccion = personasPorCorreo(correo).find((p) => p.id === ev.target.value);
      res.querySelectorAll('.elegir-op').forEach((l) => l.classList.toggle('is-selected', l.contains(ev.target)));
      res.querySelector('[data-extra]').innerHTML = extraPersona(seleccion, i);
    }
    evaluarCompleto();
  });
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (btn.disabled) return;
    const correo = input.value.trim().toLowerCase();
    const nombreInput = res.querySelector('[name="nombre"]');
    const cargoInput = res.querySelector('[name="cargo"]');
    const depInput = res.querySelector('[name="dependencia"]');
    const nuevo = seleccion
      ? {
        correo,
        personaId: seleccion.id,
        nombre: (nombreInput ? nombreInput.value : seleccion.nombre).trim(),
        nombreIngresado: Boolean(nombreInput),
        cargo: tituloLegible(seleccion.cargo),
        dependencia: depInput ? depInput.value : seleccion.dependencia,
        verificado: true,
        revisarDependencia: Boolean(seleccion.revisarDependencia)
      }
      : { correo, personaId: null, nombre: nombreInput.value.trim(), cargo: cargoInput.value.trim(), dependencia: depInput.value, verificado: false };
    nuevo.completa = true;
    const cambio = !ident() || ident().correo !== nuevo.correo || ident().personaId !== nuevo.personaId;
    estado.sesion.identificacion = nuevo;
    if (cambio) { estado.sesion.validacion = null; estado.sesion.pase = buscarPaseExistente(nuevo); }
    toast({ tipo: 'ok', titulo: `Hola, ${nuevo.nombre.split(' ')[0] === 'Hno.' ? nuevo.nombre.split(' ').slice(0, 2).join(' ') : nuevo.nombre.split(' ')[0]}`, mensaje: `Formulará para ${dependencia(nuevo.dependencia)?.nombre || nuevo.dependencia}.` });
    irPaso(estado.sesion.pase ? 4 : 2);
  });
  if (input.value) buscar();
  setTimeout(() => input.focus(), 60);
}

function buscarPaseExistente(i) {
  return estado.consolidado.pases.find((p) => p.e === i.correo && p.n === i.nombre && String(p.d) === String(i.dependencia)) || null;
}

// ───────── Paso 2: plantilla ─────────
function pintarPaso2(cont) {
  const i = ident();
  const d = dependencia(i.dependencia);
  const max = umbral('maxAccionesPorDependencia', 15);
  cont.innerHTML = `<div class="grid-2 paso-grid">
    <div class="card reveal">
      <h2>Descargue su plantilla</h2>
      <p class="muted">Se construye en este momento para <strong>${esc(d ? `${d.codigo} · ${d.nombre}` : i.dependencia)}</strong>, con los catálogos vigentes de metas, líneas del PDI, modalidades y festivos.</p>
      <ul class="hojas-lista">
        <li><span class="hoja-ico">${icono('info', 'icon-sm')}</span><div><strong>Instructivo</strong><span>Qué se pide, la cadena lógica, la regla de evidencia macro y los errores más comunes.</span></div></li>
        <li><span class="hoja-ico">${icono('metas', 'icon-sm')}</span><div><strong>Acciones</strong><span>Meta 2027, línea del PDI, indicador y evidencia macro. Idealmente no más de ${max}.</span></div></li>
        <li><span class="hoja-ico">${icono('necesidades', 'icon-sm')}</span><div><strong>Necesidades</strong><span>Cada una amarrada al código de la acción que la origina.</span></div></li>
        <li><span class="hoja-ico">${icono('adquisiciones', 'icon-sm')}</span><div><strong>Adquisiciones</strong><span>Modalidad y fecha de operación; la fecha límite de radicación se calcula sola.</span></div></li>
        <li><span class="hoja-ico">${icono('capas', 'icon-sm')}</span><div><strong>Listas</strong><span>Catálogos de las listas desplegables. No se modifica.</span></div></li>
      </ul>
      ${xlsxDisponible() ? '' : `<div class="notice notice-danger" style="margin-bottom:14px">${icono('alerta')}<div>La librería de Excel no cargó, por eso no se puede generar la plantilla. Revise la conexión y recargue la página.</div></div>`}
      <div class="btn-group">
        <button type="button" class="btn btn-primary btn-lg" data-accion="plantilla" ${xlsxDisponible() ? '' : 'disabled'}>${icono('excel', 'icon-sm')}Descargar plantilla (.xlsx)</button>
        <button type="button" class="btn btn-lg" data-accion="ejemplo" ${xlsxDisponible() ? '' : 'disabled'}>${icono('ojo', 'icon-sm')}Ver un ejemplo diligenciado</button>
      </div>
    </div>
    <aside class="card card-flat reveal">
      <span class="eyebrow">${icono('chispa', 'icon-sm')}Antes de diligenciar</span>
      <h3>La cadena se respeta también en el Excel</h3>
      <div style="margin:12px 0 16px">${cadenaLogica({ activo: 'accion', incluirRiesgos: ctxApp.riesgosActivo })}</div>
      <ul class="check-lista">
        <li>${icono('check', 'icon-sm')}Las listas desplegables de códigos solo ofrecen acciones y necesidades que ya existen en el archivo.</li>
        <li>${icono('check', 'icon-sm')}No cambie el nombre de las hojas ni de los encabezados.</li>
        <li>${icono('check', 'icon-sm')}La evidencia es un informe macro por acción, no una lista de productos.</li>
        <li>${icono('check', 'icon-sm')}Puede cargar el archivo cuantas veces quiera: vale la última versión.</li>
      </ul>
      <button type="button" class="btn btn-block" data-ir="3" style="margin-top:16px">Ya la diligencié: ir a cargarla ${icono('flecha', 'icon-sm')}</button>
    </aside>
  </div>`;
  on(cont, 'click', '[data-accion]', async (ev, b) => {
    try {
      b.disabled = true;
      const logo = await obtenerLogo();
      const r = generarPlantilla({
        persona: i, dependencia: d, dependencias: dependencias(), metas: estado.datos.metas.metasInstitucionales,
        modalidades: estado.datos.modalidades.modalidades, festivos: estado.datos.festivos.festivos, config: estado.datos.config,
        logo: logo.bytes, ejemplo: b.dataset.accion === 'ejemplo'
      });
      descargarBlob(r.blob, r.nombre);
      toast({ tipo: 'ok', titulo: b.dataset.accion === 'ejemplo' ? 'Ejemplo descargado' : 'Plantilla descargada', mensaje: r.conFormato ? `${r.nombre} está lista para diligenciar.` : `${r.nombre} se generó sin formato institucional, pero es válida.` });
    } catch (e) { toastError('No se pudo generar la plantilla', e, e.message); } finally { b.disabled = false; }
  });
}

// ───────── Paso 3: cargue y validación ─────────
function pintarPaso3(cont) {
  const i = ident();
  const previa = estado.consolidado.formulaciones.find((f) => f.dependencia === i.dependencia);
  cont.innerHTML = `<div class="stack">
    <div class="card reveal">
      <div class="card-head"><div><h2>Cargue su Excel diligenciado</h2><p>Se lee en su navegador: el archivo no se envía a ningún servidor.</p></div></div>
      <label class="dropzone" data-dropzone>
        <span class="dropzone-icon">${icono('subir', 'icon-lg')}</span>
        <strong class="ink">Arrastre aquí el archivo o haga clic para buscarlo</strong>
        <span class="muted">Formatos .xlsx o .xls · máximo 15 MB</span>
        <input type="file" accept=".xlsx,.xls,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" data-archivo aria-label="Elegir el archivo de Excel">
      </label>
      ${previa && previa.estado === 'validada' && !estado.sesion.validacion ? `<div class="notice notice-ok" style="margin-top:14px">${icono('checkCirculo')}<div style="flex:1"><strong>Su dependencia ya tiene una formulación validada</strong>, cargada por ${esc(previa.persona?.nombre || 'otra persona')} el ${esc(fechaCorta(String(previa.cargadoEn).slice(0, 10)))} (${esc(previa.archivo)}).
        <div class="btn-group" style="margin-top:10px"><button type="button" class="btn btn-sm btn-primary" data-usar-previa>Usarla para emitir mi pase</button></div></div></div>` : ''}
    </div>
    <div data-resultado-validacion></div>
  </div>`;
  const zona = cont.querySelector('[data-dropzone]');
  const inputArchivo = cont.querySelector('[data-archivo]');
  ['dragenter', 'dragover'].forEach((t) => zona.addEventListener(t, (ev) => { ev.preventDefault(); zona.classList.add('is-over'); }));
  ['dragleave', 'drop'].forEach((t) => zona.addEventListener(t, (ev) => { ev.preventDefault(); zona.classList.remove('is-over'); }));
  zona.addEventListener('drop', (ev) => { const f = ev.dataTransfer.files[0]; if (f) procesarArchivo(f, cont); });
  inputArchivo.addEventListener('change', () => { const f = inputArchivo.files[0]; inputArchivo.value = ''; if (f) procesarArchivo(f, cont); });
  const usar = cont.querySelector('[data-usar-previa]');
  if (usar) usar.addEventListener('click', () => {
    estado.sesion.validacion = { archivo: previa.archivo, resumen: previa.resumen, hallazgos: previa.hallazgos, reutilizada: true };
    guardarSesion();
    irPaso(4);
  });
  if (estado.sesion.validacion) pintarResultado(cont.querySelector('[data-resultado-validacion]'), estado.sesion.validacion);
}

async function procesarArchivo(archivo, cont) {
  const destino = cont.querySelector('[data-resultado-validacion]');
  destino.innerHTML = `<div class="card"><div class="row">${'<span class="spinner" aria-hidden="true"></span>'}<strong class="ink" aria-live="polite">Leyendo y validando «${esc(archivo.name)}»…</strong></div><div class="skeleton skeleton-line" style="margin-top:18px"></div><div class="skeleton skeleton-line" style="width:70%"></div></div>`;
  try {
    const libro = await leerLibro(archivo);
    const i = ident();
    const r = validarFormulacion(libro, {
      metas: estado.datos.metas.metasInstitucionales,
      modalidades: estado.datos.modalidades.modalidades,
      calendario: estado.indices.calendario,
      umbrales: estado.datos.config?.umbrales,
      dependencia: i.dependencia
    });
    const formulacion = {
      dependencia: i.dependencia,
      archivo: archivo.name,
      cargadoEn: new Date().toISOString(),
      persona: { nombre: i.nombre, correo: i.correo, cargo: i.cargo, verificado: i.verificado },
      estado: r.resumen.bloqueantes ? 'con-bloqueantes' : 'validada',
      hallazgos: r.hallazgos,
      resumen: r.resumen,
      acciones: r.acciones,
      necesidades: r.necesidades,
      adquisiciones: r.adquisiciones
    };
    try {
      await ctxApp.almacen.guardarFormulacion(formulacion);
      await ctxApp.refrescarConsolidado();
    } catch (e) { toastError('La validación terminó, pero no se pudo guardar el respaldo local', e, e.message); }
    estado.sesion.validacion = { archivo: archivo.name, resumen: r.resumen, hallazgos: r.hallazgos };
    guardarSesion();
    pintarStepper();
    pintarResultado(destino, estado.sesion.validacion);
    toast(r.resumen.bloqueantes
      ? { tipo: 'warn', titulo: r.resumen.bloqueantes === 1 ? '1 hallazgo bloqueante' : `${r.resumen.bloqueantes} hallazgos bloqueantes`, mensaje: 'Corrija el archivo y vuelva a cargarlo.' }
      : { tipo: 'ok', titulo: 'Formulación válida', mensaje: r.resumen.advertencias ? `Quedan ${plural(r.resumen.advertencias, 'advertencia')} registradas. Ya puede emitir su pase.` : 'Sin hallazgos. Ya puede emitir su pase.' });
  } catch (e) {
    console.error(e);
    destino.innerHTML = `<div class="notice notice-danger reveal is-visible">${icono('alerta')}<div><strong>No se pudo leer el archivo.</strong> ${esc(e.message)}</div></div>`;
  }
}

function pintarResultado(destino, v) {
  const r = v.resumen;
  const bloq = r.bloqueantes;
  destino.innerHTML = `<div class="stack">
    <div class="resultado-banner ${bloq ? 'is-bloqueado' : 'is-ok'} reveal">
      <span class="resultado-ico">${icono(bloq ? 'bloqueo' : 'checkCirculo', 'icon-lg')}</span>
      <div>
        <h2 class="mb-0">${bloq ? `${bloq === 1 ? '1 error bloqueante impide' : `${bloq} errores bloqueantes impiden`} emitir el pase` : 'Formulación válida: puede emitir su pase'}</h2>
        <p class="mb-0">${esc(v.archivo)} · ${plural(r.advertencias, 'advertencia')} ${r.advertencias === 1 ? 'registrada' : 'registradas'}${v.reutilizada ? ' · formulación reutilizada de su dependencia' : ''}</p>
      </div>
      <div class="btn-group">
        ${v.hallazgos.length ? `<button type="button" class="btn ${bloq ? '' : 'btn-hero'}" data-informe>${icono('excel', 'icon-sm')}Informe de hallazgos</button>` : ''}
        <button type="button" class="btn ${bloq ? 'btn-primary' : 'btn-hero'}" data-ir="4" ${bloq ? 'disabled aria-disabled="true"' : ''}>${icono('qr', 'icon-sm')}Emitir mi pase</button>
      </div>
    </div>
    <div class="grid-4">
      ${tarjetaCifra({ etiqueta: 'Acciones', valor: r.acciones, iconoNombre: 'metas', pie: r.acciones > umbral('maxAccionesPorDependencia', 15) ? 'Por encima del tope sugerido' : 'Registradas en la hoja Acciones', alerta: r.acciones === 0 })}
      ${tarjetaCifra({ etiqueta: 'Necesidades', valor: r.necesidades, iconoNombre: 'necesidades', pie: 'Amarradas a una acción' })}
      ${tarjetaCifra({ etiqueta: 'Adquisiciones', valor: r.adquisiciones, iconoNombre: 'adquisiciones', pie: `Valor ${monedaCompacta(r.valorAdquisiciones)}` })}
      ${tarjetaCifra({ etiqueta: 'Valor total de necesidades', valor: r.valorNecesidades, formato: 'monedaCompacta', iconoNombre: 'dinero', pie: moneda(r.valorNecesidades) })}
    </div>
    <div class="grid-2 resultado-grid">
      <div class="card reveal">
        <div class="card-head"><div><h3>Distribución por trimestre</h3><p>Acciones según su trimestre de inicio y necesidades según el trimestre en que se requieren.</p></div></div>
        <div data-grafica-trim></div>
      </div>
      <div class="card reveal">
        <div class="card-head">
          <div><h3>Hallazgos</h3><p>Cada hallazgo dice la hoja, la fila y qué corregir.</p></div>
          <div class="btn-group" role="group" aria-label="Filtrar hallazgos">
            ${[['todos', `Todos (${v.hallazgos.length})`], ['bloqueante', `Bloqueantes (${bloq})`], ['advertencia', `Advertencias (${r.advertencias})`]].map(([k, t]) => `<button type="button" class="chip" data-filtro-h="${k}" aria-pressed="${filtroHallazgos === k}">${t}</button>`).join('')}
          </div>
        </div>
        <div data-hallazgos class="hallazgos-scroll"></div>
      </div>
    </div>
  </div>`;
  const pintarHallazgos = () => {
    const lista = v.hallazgos.filter((h) => filtroHallazgos === 'todos' || h.severidad === filtroHallazgos);
    destino.querySelector('[data-hallazgos]').innerHTML = lista.length
      ? `<ul class="findings">${lista.map((h, k) => `<li class="finding ${h.severidad === 'bloqueante' ? 'finding-block' : 'finding-warn'}" style="animation-delay:${Math.min(k, 12) * 30}ms">
          <span class="finding-icon">${icono(h.severidad === 'bloqueante' ? 'bloqueo' : 'alerta', 'icon-sm')}</span>
          <div>
            <div class="finding-title">${esc(h.titulo)}</div>
            <div class="finding-meta"><span class="badge ${h.severidad === 'bloqueante' ? 'badge-danger' : 'badge-warn'}">${h.severidad === 'bloqueante' ? 'Bloqueante' : 'Advertencia'}</span><span class="badge">Hoja ${esc(h.hoja)}</span>${h.fila ? `<span class="badge">Fila ${h.fila}</span>` : ''}</div>
            <p class="mb-0">${esc(h.detalle)}</p>
            <p class="finding-fix mb-0"><strong>Qué corregir:</strong> ${esc(h.correccion)}</p>
          </div></li>`).join('')}</ul>`
      : estadoVacio({ titulo: filtroHallazgos === 'todos' ? 'Sin hallazgos' : 'Nada en esta categoría', texto: 'La formulación cumple la cadena lógica y las reglas de la jornada.', iconoNombre: 'checkCirculo' });
    activarAnimaciones(destino);
  };
  on(destino, 'click', '[data-filtro-h]', (ev, b) => {
    filtroHallazgos = b.dataset.filtroH;
    destino.querySelectorAll('[data-filtro-h]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    pintarHallazgos();
  });
  const informe = destino.querySelector('[data-informe]');
  if (informe) informe.addEventListener('click', async () => {
    try {
      const logo = await obtenerLogo();
      const i = ident();
      const r2 = exportarExcel({
        nombreArchivo: `JP2027_Hallazgos_${i.dependencia}.xlsx`,
        logo: logo.bytes,
        hojas: [{
          nombre: 'Hallazgos', titulo: 'Informe de hallazgos de validación', subtitulo: `${i.dependencia} · ${dependencia(i.dependencia)?.nombre || ''} · Archivo: ${v.archivo}`,
          columnas: [{ titulo: 'Severidad', ancho: 14 }, { titulo: 'Hoja', ancho: 16 }, { titulo: 'Fila', ancho: 8, tipo: 'numero' }, { titulo: 'Hallazgo', ancho: 44 }, { titulo: 'Detalle', ancho: 60 }, { titulo: 'Qué corregir', ancho: 60 }],
          filas: v.hallazgos.map((h) => [h.severidad === 'bloqueante' ? 'Bloqueante' : 'Advertencia', h.hoja, h.fila, h.titulo, h.detalle, h.correccion])
        }]
      });
      descargarBlob(r2.blob, r2.nombre);
    } catch (e) { toastError('No se pudo exportar el informe', e, e.message); }
  });
  pintarHallazgos();
  graficaBarras(destino.querySelector('[data-grafica-trim]'), {
    etiquetas: r.porTrimestre.map((t) => `T${t.t}`),
    series: [
      { nombre: 'Acciones que inician', datos: r.porTrimestre.map((t) => t.acciones) },
      { nombre: 'Necesidades requeridas', datos: r.porTrimestre.map((t) => t.necesidades) }
    ],
    titulo: 'Acciones y necesidades por trimestre',
    alto: 240
  });
  activarAnimaciones(destino);
}

// ───────── Paso 4: pase ─────────
async function pintarPaso4(cont) {
  const i = ident();
  const v = estado.sesion.validacion;
  if (!estado.sesion.pase) {
    if (!v || v.resumen.bloqueantes) {
      cont.innerHTML = estadoVacio({ titulo: 'Aún no puede emitir su pase', texto: 'Primero cargue una formulación sin errores bloqueantes en el paso 3.', iconoNombre: 'qr', accion: '<button type="button" class="btn btn-primary" data-ir="3">Ir al paso 3</button>' });
      return;
    }
    const existente = buscarPaseExistente(i);
    const pase = existente || crearPase({ nombre: i.nombre, cargo: i.cargo, dependencia: String(i.dependencia), correo: i.correo, prefijo: estado.indices.prefijo, sal: estado.indices.sal });
    pase.verificado = i.verificado;
    pase.emitido = pase.emitido || new Date().toISOString();
    try {
      await ctxApp.almacen.guardarPase(pase);
      await ctxApp.refrescarConsolidado();
    } catch (e) { toastError('El pase se emitió, pero no se pudo guardar el respaldo local', e, e.message); }
    estado.sesion.pase = pase;
    guardarSesion();
    pintarStepper();
    if (!existente) toast({ tipo: 'ok', titulo: 'Pase emitido', mensaje: `Su identificador es ${pase.id}. Descárguelo o guarde una captura.` });
  }
  const p = estado.sesion.pase;
  const d = dependencia(p.d);
  const agenda = estado.datos.agenda || {};
  const logo = await obtenerLogo();
  cont.innerHTML = `<div class="pase-layout">
    <div class="pase-wrap reveal">
      <article class="pase" data-pase aria-label="Pase de acceso">
        <div class="pase-head">
          <span class="pase-logo"><img src="${esc(logo.dataUrl || 'assets/logo-etitc.png')}" alt="Logo de la Escuela Tecnológica Instituto Técnico Central"></span>
          <span class="pase-kicker">Pase de acceso</span>
          <span class="pase-evento">Jornada de Planeación 2027</span>
        </div>
        <div class="pase-persona">
          <strong class="pase-nombre">${esc(p.n)}</strong>
          <span class="pase-cargo">${esc(p.c)}</span>
        </div>
        <div class="pase-dep">
          <span class="pase-dep-cod">${esc(p.d)}</span>
          <span>${esc(d ? d.nombre : '')}${d ? `<small>Proceso ${esc((TIPOS_PROCESO[d.tipoProceso] || '').toLowerCase())}</small>` : ''}</span>
        </div>
        <div class="pase-qr" data-qr><span class="spinner" aria-hidden="true"></span></div>
        <div class="pase-id mono">${esc(p.id)}</div>
        <div class="pase-meta">
          <span>${esc(p.e)}</span>
          <span>${esc(fechaLarga(agenda.fecha))}${p.verificado === false ? ' · <b>No verificado</b>' : ''}</span>
        </div>
      </article>
    </div>
    <div class="card reveal">
      <span class="eyebrow">${icono('checkCirculo', 'icon-sm')}Listo para el ingreso</span>
      <h2>Su pase de acceso</h2>
      <p class="muted">Preséntelo en el celular o impreso. El QR contiene sus datos y una firma que permite detectar pases alterados.</p>
      <dl class="dl">
        <dt>Identificador</dt><dd class="mono">${esc(p.id)}</dd>
        <dt>Emitido</dt><dd>${esc(new Date(p.ts).toLocaleString('es-CO'))}</dd>
        <dt>Registro</dt><dd>${p.verificado === false ? '<span class="badge badge-warn">No verificado en el directorio</span>' : '<span class="badge badge-ok">Verificado en el directorio</span>'}</dd>
        ${v ? `<dt>Formulación</dt><dd>${plural(v.resumen.acciones, 'acción', 'acciones')} · ${plural(v.resumen.necesidades, 'necesidad', 'necesidades')} · ${plural(v.resumen.adquisiciones, 'adquisición', 'adquisiciones')}</dd>` : ''}
      </dl>
      <div class="btn-group" style="margin-top:20px">
        <button type="button" class="btn btn-primary" data-pase-accion="png" ${capturaDisponible() ? '' : 'disabled'}>${icono('imagen', 'icon-sm')}Descargar PNG</button>
        <button type="button" class="btn" data-pase-accion="pdf" ${capturaDisponible() && pdfDisponible() ? '' : 'disabled'}>${icono('pdf', 'icon-sm')}Descargar PDF</button>
        <button type="button" class="btn" data-pase-accion="copiar">${icono('copiar', 'icon-sm')}Copiar texto para correo</button>
      </div>
      ${capturaDisponible() ? '' : '<p class="field-hint" style="margin-top:10px">La descarga como imagen no está disponible porque html2canvas no cargó. Puede tomar una captura de pantalla del pase.</p>'}
      <hr>
      <div class="btn-group">
        <button type="button" class="btn btn-ghost" data-pase-accion="agenda">${icono('agenda', 'icon-sm')}Ver la agenda de mi dependencia</button>
        <button type="button" class="btn btn-ghost" data-pase-accion="nueva">${icono('refrescar', 'icon-sm')}Cargar una nueva versión</button>
        <button type="button" class="btn btn-ghost" data-pase-accion="otra">${icono('persona', 'icon-sm')}Identificar a otra persona</button>
      </div>
    </div>
  </div>`;

  const cajaQR = cont.querySelector('[data-qr]');
  try {
    if (!qrDisponible()) throw new Error('sin librería');
    const url = await qrComoDataUrl(contenidoQR(p), { tamano: 420 });
    cajaQR.innerHTML = `<img src="${url}" alt="Código QR del pase ${esc(p.id)}" width="200" height="200">`;
  } catch {
    cajaQR.innerHTML = `<div class="pase-qr-fallback">${icono('qr', 'icon-lg')}<span>QR no disponible. En el ingreso pueden registrarlo con su identificador.</span></div>`;
  }

  on(cont, 'click', '[data-pase-accion]', async (ev, b) => {
    const accion = b.dataset.paseAccion;
    const tarjeta = cont.querySelector('[data-pase]');
    try {
      if (accion === 'png') { b.disabled = true; await elementoAPng(tarjeta, `Pase_${p.id}.png`); toast({ tipo: 'ok', titulo: 'Imagen descargada', mensaje: `Pase_${p.id}.png` }); }
      if (accion === 'pdf') { b.disabled = true; await elementoAPdf(tarjeta, `Pase_${p.id}.pdf`); toast({ tipo: 'ok', titulo: 'PDF descargado', mensaje: `Pase_${p.id}.pdf` }); }
      if (accion === 'copiar') {
        const ok = await copiarTexto(textoConfirmacion(p, v));
        toast(ok ? { tipo: 'ok', titulo: 'Texto copiado', mensaje: 'Péguelo en el correo de confirmación a la OAPDI.' } : { tipo: 'warn', titulo: 'No se pudo copiar', mensaje: 'Su navegador bloqueó el portapapeles.' });
      }
      if (accion === 'agenda') ctxApp.ir('agenda');
      if (accion === 'nueva') { estado.sesion.validacion = null; guardarSesion(); irPaso(3); }
      if (accion === 'otra') { estado.sesion = { identificacion: null, validacion: null, pase: null, paso: 1 }; guardarSesion(); irPaso(1); }
    } catch (e) { toastError('No se pudo completar la acción', e, e.message); } finally { b.disabled = false; }
  });
}

function textoConfirmacion(p, v) {
  const d = dependencia(p.d);
  const agenda = estado.datos.agenda || {};
  const contacto = estado.datos.config?.evento?.correoContacto || 'planeacion@itc.edu.co';
  return [
    'Asunto: Pase de acceso — Jornada de Planeación 2027',
    '',
    'Cordial saludo:',
    '',
    `Confirmo que la dependencia ${p.d} – ${d ? d.nombre : ''} cargó su formulación 2027 en el aplicativo de la jornada y obtuvo el pase de acceso.`,
    '',
    `• Pase: ${p.id}`,
    `• Asistente: ${p.n} – ${p.c}`,
    `• Correo: ${p.e}`,
    v ? `• Formulación: ${v.resumen.acciones} acciones, ${v.resumen.necesidades} necesidades (${moneda(v.resumen.valorNecesidades)}) y ${v.resumen.adquisiciones} adquisiciones. Advertencias registradas: ${v.resumen.advertencias}.` : '',
    `• Jornada: ${fechaLarga(agenda.fecha)} · ${agenda.sede || ''}`,
    '',
    `Copia a: ${contacto}`,
    '',
    'Atentamente,',
    p.n
  ].filter((l) => l !== null).join('\n');
}

function montar(panel, ctx) {
  raiz = panel;
  ctxApp = ctx;
  recuperarSesion();
  if (!estado.sesion.paso) estado.sesion.paso = 1;
  panel.innerHTML = `<div class="container page">
    <header class="page-head reveal">
      <div>
        <span class="eyebrow">${icono('formulacion', 'icon-sm')}Formulación y pase</span>
        <h1>Formule su planeación 2027 y obtenga su pase</h1>
        <p class="lead">Un solo archivo por dependencia, validado en el momento contra la cadena lógica de la planeación.</p>
      </div>
      ${cadenaLogica({ incluirRiesgos: ctx.riesgosActivo })}
    </header>
    <nav class="card card-tight stepper-card reveal" aria-label="Pasos de la formulación">
      <ol class="stepper"></ol>
      <div class="stepper-bar" aria-hidden="true"><span></span></div>
    </nav>
    <div data-paso-cont class="paso-cont"></div>
  </div>`;
  on(panel, 'click', '[data-ir]', (ev, b) => {
    if (b.getAttribute('aria-disabled') === 'true' || b.disabled) {
      if (b.classList.contains('step-btn')) toast({ tipo: 'info', titulo: 'Paso bloqueado', mensaje: 'Complete primero los pasos anteriores.' });
      return;
    }
    irPaso(Number(b.dataset.ir));
  });
  if (!puedeIr(estado.sesion.paso)) estado.sesion.paso = 1;
  irPaso(estado.sesion.paso, { foco: false });
}

const pestanaFormulacion = {
  id: 'formulacion',
  titulo: 'Formulación y pase',
  tituloCorto: 'Formulación y pase',
  icono: 'formulacion',
  montar,
  alMostrar() { pintarStepper(); }
};

Object.assign(__m["src/tabs/formulacion.js"], { pestanaFormulacion });
})();

// ── src/ui/timeline.js ──
__m["src/ui/timeline.js"] = {};
(function () {
/*
 * timeline.js — Líneas de tiempo: horizontal (hitos y etapas de contratación).
 * La línea vertical de la agenda vive en tabs/agenda.js porque su comportamiento es propio de esa pestaña.
 */
const { esc } = __m["src/ui/dom.js"];
const { icono } = __m["src/ui/iconos.js"];

// items: [{ titulo, subtitulo, cuerpo, pie, iconoNombre, estado: 'ok'|'danger'|'' , marca }]
function timelineHorizontal(items, { etiqueta = 'Línea de tiempo', clase = '' } = {}) {
  return `<div class="htl ${clase}" role="list" aria-label="${esc(etiqueta)}">
    ${items.map((it, i) => `
      <div class="htl-item reveal ${it.estado ? `is-${it.estado}` : ''}" role="listitem">
        <div class="htl-marker">
          <span class="htl-dot">${it.iconoNombre ? icono(it.iconoNombre, 'icon-sm') : `<span class="num">${i + 1}</span>`}</span>
        </div>
        <div class="htl-card">
          ${it.marca ? `<span class="htl-mark">${it.marca}</span>` : ''}
          <h4>${esc(it.titulo)}</h4>
          ${it.subtitulo ? `<div class="htl-sub">${it.subtitulo}</div>` : ''}
          ${it.cuerpo ? `<div class="htl-body">${it.cuerpo}</div>` : ''}
          ${it.pie ? `<div class="htl-foot">${it.pie}</div>` : ''}
        </div>
      </div>`).join('')}
  </div>`;
}

Object.assign(__m["src/ui/timeline.js"], { timelineHorizontal });
})();

// ── src/tabs/metas.js ──
__m["src/tabs/metas.js"] = {};
(function () {
/*
 * metas.js — Pestaña 3: Metas 2027.
 *  A. De dónde venimos: línea de tiempo horizontal de hitos 2025–2026 (data/hitos.json).
 *  Bloque destacado: «Cómo vamos a reportar en 2027» con la comparación modelo 2026 vs. modelo 2027.
 *  B. Hacia dónde vamos: cascada navegable meta → líneas del PDI → dependencias y acciones que aportan.
 */
const { estado, on: alEvento, dependencia } = __m["src/estado.js"];
const { esc, on } = __m["src/ui/dom.js"];
const { icono } = __m["src/ui/iconos.js"];
const { timelineHorizontal } = __m["src/ui/timeline.js"];
const { activarAnimaciones, estadoVacio } = __m["src/ui/cards.js"];
const { entero, plural } = __m["src/lib/formato.js"];
const { TIPOS_PROCESO } = __m["src/config.js"];

const REGLA = 'En 2026 el plan se llenó de productos para dar cumplimiento. En 2027 el criterio cambia: la evidencia se consolida en informes macro de peso y valor, que recojan el cumplimiento de la meta de manera agregada, en lugar de calificar semana a semana lotes de productos menores. Se robustece la evidencia sin aumentar el volumen.';

let raiz = null;
const sel = { meta: null, linea: null };

// Acciones de todas las formulaciones cargadas, con su dependencia.
function accionesConsolidadas() {
  return estado.consolidado.formulaciones.flatMap((f) => (f.acciones || []).map((a) => ({ ...a, dependencia: f.dependencia })));
}

// Pseudoaleatorio determinista para que el diagrama 2026 sea estable entre recargas.
function semilla(n) { let s = n; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

function svgModelo2026() {
  const r = semilla(2026);
  const piezas = [];
  for (let i = 0; i < 42; i += 1) {
    const x = 12 + (i % 7) * 27 + r() * 12;
    const y = 12 + Math.floor(i / 7) * 30 + r() * 12;
    piezas.push({ x, y, s: 7 + r() * 5, o: 0.45 + r() * 0.5 });
  }
  return `<svg viewBox="0 0 330 210" class="modelo-svg" role="img" aria-label="Modelo 2026: muchos productos pequeños con trazabilidad dispersa hacia la meta">
    ${piezas.map((p, i) => (i % 2 === 0 ? `<path d="M${(p.x + p.s / 2).toFixed(1)} ${(p.y + p.s / 2).toFixed(1)} C ${(230).toFixed(0)} ${(p.y + 10).toFixed(1)}, 250 105, 286 105" fill="none" stroke="currentColor" stroke-opacity=".18" stroke-width="1" stroke-dasharray="2 3"/>` : '')).join('')}
    ${piezas.map((p) => `<rect x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" width="${p.s.toFixed(1)}" height="${p.s.toFixed(1)}" rx="2" class="pieza" fill-opacity="${p.o.toFixed(2)}"/>`).join('')}
    <circle cx="300" cy="105" r="20" class="diana-externa"/><circle cx="300" cy="105" r="11" class="diana-media"/><circle cx="300" cy="105" r="4" class="diana-centro"/>
  </svg>`;
}

function svgModelo2027() {
  const ys = [24, 82, 140];
  return `<svg viewBox="0 0 330 210" class="modelo-svg" role="img" aria-label="Modelo 2027: pocos informes macro con trazabilidad concentrada hacia la meta">
    ${ys.map((y) => `<path d="M136 ${y + 22} C 220 ${y + 22}, 240 105, 280 105" fill="none" class="traza-fuerte" stroke-width="3.2" stroke-linecap="round"/>`).join('')}
    ${ys.map((y, i) => `<g><rect x="14" y="${y}" width="122" height="44" rx="10" class="informe"/>
      <rect x="26" y="${y + 12}" width="62" height="6" rx="3" class="informe-linea"/><rect x="26" y="${y + 25}" width="88" height="5" rx="2.5" class="informe-linea suave"/>
      <text x="120" y="${y + 19}" text-anchor="end" class="informe-num">${i + 1}</text></g>`).join('')}
    <circle cx="300" cy="105" r="20" class="diana-externa"/><circle cx="300" cy="105" r="11" class="diana-media"/><circle cx="300" cy="105" r="4" class="diana-centro"/>
  </svg>`;
}

function seccionHitos() {
  const hitos = [...(estado.datos.hitos?.hitos || [])].sort((a, b) => (a.anio - b.anio) || ((a.orden || 0) - (b.orden || 0)));
  if (!hitos.length) return estadoVacio({ titulo: 'Sin hitos registrados', texto: 'Agregue hitos en data/hitos.json para mostrar de dónde venimos.', iconoNombre: 'bandera' });
  return timelineHorizontal(hitos.map((h) => ({
    titulo: h.titulo,
    marca: `<span class="badge badge-solid">${esc(h.anio)}</span>`,
    iconoNombre: h.icono || 'bandera',
    cuerpo: `<p>${esc(h.descripcion)}</p>`,
    pie: h.impacto ? `<span class="eyebrow">${icono('tendencia', 'icon-sm')}Impacto</span><p class="mb-0">${esc(h.impacto)}</p>` : ''
  })), { etiqueta: 'Hitos 2025 y 2026', clase: 'htl-hitos' });
}

function pintarCascada() {
  const metas = estado.datos.metas?.metasInstitucionales || [];
  const cont = raiz.querySelector('[data-cascada]');
  if (!metas.length) { cont.innerHTML = estadoVacio({ titulo: 'Sin metas cargadas', texto: 'Agregue las metas 2027 en data/metas.json.', iconoNombre: 'metas' }); return; }
  const acciones = accionesConsolidadas();
  const porMeta = (m) => acciones.filter((a) => a.metaId === m.id);
  const porLinea = (l) => acciones.filter((a) => a.lineaId === l.id);
  if (!sel.meta || !metas.some((m) => m.id === sel.meta)) sel.meta = metas[0].id;
  const meta = metas.find((m) => m.id === sel.meta);
  if (sel.linea && !meta.lineasPDI.some((l) => l.id === sel.linea)) sel.linea = null;
  const linea = sel.linea ? meta.lineasPDI.find((l) => l.id === sel.linea) : null;

  // Dependencias de la línea: responsables según metas.json + las que reportaron acciones en ella
  let filasDep = [];
  if (linea) {
    const accs = porLinea(linea);
    const codigos = new Set([...(linea.dependenciasResponsables || []).map(String), ...accs.map((a) => String(a.dependencia))]);
    filasDep = Array.from(codigos).map((c) => ({
      codigo: c,
      dep: dependencia(c),
      responsable: (linea.dependenciasResponsables || []).map(String).includes(c),
      acciones: accs.filter((a) => String(a.dependencia) === c)
    })).sort((a, b) => b.acciones.length - a.acciones.length || a.codigo.localeCompare(b.codigo));
  }

  cont.innerHTML = `<div class="cascada">
    <div class="cascada-col" aria-labelledby="cas-metas">
      <h3 class="cascada-titulo" id="cas-metas"><span class="chain-num">1</span>Metas institucionales</h3>
      <div class="cascada-lista">
        ${metas.map((m) => {
          const n = porMeta(m).length;
          return `<button type="button" class="nodo nodo-meta ${m.id === sel.meta ? 'is-sel' : ''}" data-meta="${esc(m.id)}" aria-pressed="${m.id === sel.meta}" aria-controls="cas-lineas">
            <span class="nodo-id">${esc(m.id)}</span>
            <span class="nodo-cuerpo"><strong>${esc(m.nombre)}</strong><span>${esc(m.descripcion || '')}</span>
            <span class="nodo-cifras"><span>${plural((m.lineasPDI || []).length, 'línea', 'líneas')}</span><span>${plural(n, 'acción', 'acciones')}</span></span></span>
            <span class="nodo-flecha">${icono('derecha', 'icon-sm')}</span>
          </button>`;
        }).join('')}
      </div>
    </div>
    <div class="cascada-col" id="cas-lineas" aria-live="polite">
      <h3 class="cascada-titulo"><span class="chain-num">2</span>Líneas del PDI de ${esc(meta.id)}</h3>
      <div class="cascada-lista cascada-anim" data-k="${esc(meta.id)}">
        ${(meta.lineasPDI || []).map((l) => {
          const accs = porLinea(l);
          const deps = new Set([...(l.dependenciasResponsables || []), ...accs.map((a) => a.dependencia)].map(String));
          return `<button type="button" class="nodo nodo-linea ${l.id === sel.linea ? 'is-sel' : ''}" data-linea="${esc(l.id)}" aria-pressed="${l.id === sel.linea}" aria-controls="cas-deps">
            <span class="nodo-id">${esc(l.id)}</span>
            <span class="nodo-cuerpo"><strong>${esc(l.nombre)}</strong>
            <span class="nodo-cifras"><span>${plural(deps.size, 'dependencia', 'dependencias')}</span><span>${plural(accs.length, 'acción', 'acciones')}</span></span></span>
            <span class="nodo-flecha">${icono('derecha', 'icon-sm')}</span>
          </button>`;
        }).join('') || '<p class="muted">Esta meta no tiene líneas registradas.</p>'}
      </div>
    </div>
    <div class="cascada-col" id="cas-deps" aria-live="polite">
      <h3 class="cascada-titulo"><span class="chain-num">3</span>Dependencias y acciones</h3>
      <div class="cascada-lista cascada-anim" data-k="${esc(sel.linea || 'nada')}">
        ${!linea ? `<div class="cascada-guia">${icono('derecha')}<p class="mb-0">Elija una línea del PDI para ver qué dependencias la tienen comprometida y cuántas acciones aportan.</p></div>` : filasDep.map((f) => `
          <div class="nodo nodo-dep proc-${esc(f.dep?.tipoProceso || '')}">
            <span class="proc-dot" aria-hidden="true"></span>
            <span class="nodo-cuerpo"><strong>${esc(f.codigo)} · ${esc(f.dep?.nombre || 'Dependencia no catalogada')}</strong>
              <span class="row" style="gap:6px">${f.responsable ? '<span class="badge">Responsable en el PDI</span>' : '<span class="badge badge-warn">Aporta sin ser responsable</span>'}<span class="badge">${esc(TIPOS_PROCESO[f.dep?.tipoProceso] || '')}</span></span>
              ${f.acciones.length ? `<ul class="nodo-acciones">${f.acciones.slice(0, 4).map((a) => `<li><span class="mono">${esc(a.codigo)}</span> ${esc(a.nombre)}</li>`).join('')}${f.acciones.length > 4 ? `<li class="muted">y ${f.acciones.length - 4} más…</li>` : ''}</ul>` : ''}
            </span>
            <span class="nodo-total ${f.acciones.length ? '' : 'is-cero'}"><span>${entero(f.acciones.length)}</span><small>${f.acciones.length === 1 ? 'acción' : 'acciones'}</small></span>
          </div>`).join('')}
        ${linea && !acciones.length ? '<p class="muted" style="font-size:.84rem;margin-top:8px">Las acciones aparecerán cuando las dependencias carguen su formulación en la pestaña 2.</p>' : ''}
      </div>
    </div>
  </div>`;
}

function montar(panel) {
  raiz = panel;
  const provHitos = estado.datos.hitos?.provisional;
  const provMetas = estado.datos.metas?.provisional;
  panel.innerHTML = `<div class="container page">
    <header class="page-head reveal">
      <div>
        <span class="eyebrow">${icono('metas', 'icon-sm')}Metas 2027</span>
        <h1>De dónde venimos y hacia dónde vamos</h1>
        <p class="lead">Los hitos 2025–2026 son el punto de partida; las metas 2027 ordenan todo lo que se formula en la jornada.</p>
      </div>
    </header>

    <section class="seccion reveal" aria-labelledby="sec-a">
      <div class="seccion-head">
        <span class="seccion-letra" aria-hidden="true">A</span>
        <div><h2 id="sec-a">De dónde venimos</h2><p class="muted mb-0">Hitos institucionales 2025 y 2026.</p></div>
        ${provHitos ? '<span class="badge badge-prov">Provisional</span>' : ''}
      </div>
      ${seccionHitos()}
    </section>

    <section class="hero-card reportar reveal" aria-labelledby="como-reportar">
      <div class="reportar-grid">
        <div>
          <span class="eyebrow">${icono('chispa', 'icon-sm')}La regla nueva</span>
          <h2 id="como-reportar">Cómo vamos a reportar en 2027</h2>
          <blockquote class="regla-cita"><p>${esc(REGLA)}</p></blockquote>
        </div>
        <div class="comparacion">
          <figure class="modelo modelo-2026">
            <figcaption><span class="modelo-anio">2026</span><strong>Muchos productos pequeños</strong><span>Trazabilidad dispersa</span></figcaption>
            ${svgModelo2026()}
            <ul class="modelo-rasgos"><li>Lotes de productos menores</li><li>Calificación semana a semana</li><li>Evidencia fragmentada</li></ul>
          </figure>
          <span class="comparacion-vs" aria-hidden="true">${icono('flecha')}</span>
          <figure class="modelo modelo-2027">
            <figcaption><span class="modelo-anio">2027</span><strong>Pocos informes macro</strong><span>Trazabilidad concentrada</span></figcaption>
            ${svgModelo2027()}
            <ul class="modelo-rasgos"><li>Informes de peso y valor</li><li>Cumplimiento agregado por meta</li><li>Más evidencia, no más volumen</li></ul>
          </figure>
        </div>
      </div>
    </section>

    <section class="seccion reveal" aria-labelledby="sec-b">
      <div class="seccion-head">
        <span class="seccion-letra" aria-hidden="true">B</span>
        <div><h2 id="sec-b">Hacia dónde vamos</h2><p class="muted mb-0">Meta institucional → líneas del Plan de Desarrollo Institucional → acciones por dependencia. Haga clic para navegar.</p></div>
        ${provMetas ? '<span class="badge badge-prov">Provisional</span>' : ''}
      </div>
      <div data-cascada></div>
    </section>
  </div>`;
  on(panel, 'click', '[data-meta]', (ev, b) => { sel.meta = b.dataset.meta; sel.linea = null; pintarCascada(); panel.querySelector(`[data-meta="${sel.meta}"]`).focus(); });
  on(panel, 'click', '[data-linea]', (ev, b) => {
    sel.linea = b.dataset.linea; pintarCascada();
    panel.querySelector(`[data-linea="${sel.linea}"]`).focus();
    if (window.innerWidth < 900) panel.querySelector('#cas-deps').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  pintarCascada();
  alEvento('consolidado', () => { if (raiz) { pintarCascada(); } });
}

const pestanaMetas = {
  id: 'metas',
  titulo: 'Metas 2027',
  icono: 'metas',
  montar,
  alMostrar() { pintarCascada(); activarAnimaciones(raiz); }
};

Object.assign(__m["src/tabs/metas.js"], { pestanaMetas });
})();

// ── src/ui/table.js ──
__m["src/ui/table.js"] = {};
(function () {
/*
 * table.js — Tabla maestra reutilizable: búsqueda, ordenamiento por cualquier columna, filtros, paginación,
 * filas navegables con teclado y estado vacío cuando el filtro no devuelve resultados.
 */
const { esc, uid } = __m["src/ui/dom.js"];
const { icono } = __m["src/ui/iconos.js"];
const { normalizar, entero } = __m["src/lib/formato.js"];

function crearTabla(contenedor, opciones) {
  const {
    columnas,
    filtros = [],
    busqueda = true,
    placeholder = 'Buscar…',
    porPagina = 12,
    alClicFila = null,
    vacio = 'No hay registros que coincidan con la búsqueda o los filtros.',
    accionesHtml = '',
    alCambiar = null,
    etiqueta = 'Tabla de datos',
    pieTotales = null
  } = opciones;
  let filas = opciones.filas || [];
  const estado = { texto: '', orden: null, dir: 1, pagina: 1, filtros: {} };
  const idBusq = uid('busq');

  contenedor.innerHTML = `
    <div class="table-tools">
      ${busqueda ? `<label class="input-icon" for="${idBusq}"><span class="sr-only">Buscar en la tabla</span>${icono('buscar')}<input id="${idBusq}" class="input" type="search" placeholder="${esc(placeholder)}" autocomplete="off"></label>` : ''}
      ${filtros.map((f) => `<label class="sr-only" for="${idBusq}-${f.clave}">${esc(f.etiqueta)}</label>
        <select class="select" id="${idBusq}-${f.clave}" data-filtro="${esc(f.clave)}">
          <option value="">${esc(f.etiqueta)}: todas</option>
          ${f.opciones.map((o) => `<option value="${esc(o.valor)}">${esc(o.texto)}</option>`).join('')}
        </select>`).join('')}
      ${accionesHtml}
    </div>
    <div class="table-wrap"><table class="table" aria-label="${esc(etiqueta)}">
      <thead><tr>${columnas.map((c) => `<th scope="col" class="${c.tipo === 'numero' || c.tipo === 'moneda' ? 'num' : ''}" ${c.ordenable === false ? '' : 'aria-sort="none"'} data-col="${esc(c.clave)}">
        ${c.ordenable === false ? esc(c.titulo) : `<button type="button">${esc(c.titulo)}<span class="sort-ind">${icono('abajo', 'icon-sm')}</span></button>`}</th>`).join('')}</tr></thead>
      <tbody></tbody>
      <tfoot></tfoot>
    </table></div>
    <div class="table-foot"><span data-conteo aria-live="polite"></span><div class="pager"></div></div>`;

  const tbody = contenedor.querySelector('tbody');
  const tfoot = contenedor.querySelector('tfoot');
  const conteo = contenedor.querySelector('[data-conteo]');
  const pager = contenedor.querySelector('.pager');

  const valorDe = (c, f) => (c.valor ? c.valor(f) : f[c.clave]);

  function filtradas() {
    const t = normalizar(estado.texto);
    let r = filas.filter((f) => {
      for (const fl of filtros) {
        const v = estado.filtros[fl.clave];
        if (v && String(fl.valorDe ? fl.valorDe(f) : f[fl.clave]) !== v) return false;
      }
      if (!t) return true;
      return columnas.some((c) => normalizar(valorDe(c, f)).includes(t));
    });
    if (estado.orden) {
      const c = columnas.find((x) => x.clave === estado.orden);
      const numerica = c.tipo === 'numero' || c.tipo === 'moneda';
      r = [...r].sort((a, b) => {
        const va = valorDe(c, a); const vb = valorDe(c, b);
        if (numerica) return ((Number(va) || 0) - (Number(vb) || 0)) * estado.dir;
        return String(va ?? '').localeCompare(String(vb ?? ''), 'es', { numeric: true, sensitivity: 'base' }) * estado.dir;
      });
    }
    return r;
  }

  function pintar() {
    const lista = filtradas();
    const paginas = Math.max(1, Math.ceil(lista.length / porPagina));
    estado.pagina = Math.min(estado.pagina, paginas);
    const desde = (estado.pagina - 1) * porPagina;
    const pagina = lista.slice(desde, desde + porPagina);
    if (!pagina.length) {
      tbody.innerHTML = `<tr><td colspan="${columnas.length}"><div class="empty" style="border:0;padding:32px 12px">
        <div class="empty-art" style="width:72px;height:72px">${icono('buscar')}</div><p>${esc(vacio)}</p></div></td></tr>`;
    } else {
      tbody.innerHTML = pagina.map((f, i) => `<tr data-i="${desde + i}" ${alClicFila ? 'class="is-clickable" tabindex="0"' : ''}>
        ${columnas.map((c) => `<td class="${c.tipo === 'numero' || c.tipo === 'moneda' ? 'num' : ''} ${c.clase || ''}">${c.render ? c.render(f) : esc(valorDe(c, f))}</td>`).join('')}</tr>`).join('');
    }
    tfoot.innerHTML = pieTotales && lista.length ? pieTotales(lista) : '';
    conteo.textContent = lista.length
      ? `Mostrando ${entero(desde + 1)}–${entero(desde + pagina.length)} de ${entero(lista.length)} registros`
      : 'Sin registros para mostrar';
    pager.innerHTML = paginas > 1 ? `
      <button type="button" class="btn btn-sm btn-icon" data-pag="prev" ${estado.pagina === 1 ? 'disabled' : ''} aria-label="Página anterior"><span style="transform:rotate(180deg);display:grid">${icono('derecha', 'icon-sm')}</span></button>
      <span class="num">Página ${estado.pagina} de ${paginas}</span>
      <button type="button" class="btn btn-sm btn-icon" data-pag="next" ${estado.pagina === paginas ? 'disabled' : ''} aria-label="Página siguiente">${icono('derecha', 'icon-sm')}</button>` : '';
    contenedor._lista = lista;
    if (alCambiar) alCambiar(lista);
  }

  // Eventos
  const inputBusq = contenedor.querySelector(`#${idBusq}`);
  if (inputBusq) inputBusq.addEventListener('input', () => { estado.texto = inputBusq.value; estado.pagina = 1; pintar(); });
  contenedor.querySelectorAll('[data-filtro]').forEach((s) => s.addEventListener('change', () => {
    estado.filtros[s.dataset.filtro] = s.value; estado.pagina = 1; pintar();
  }));
  contenedor.querySelectorAll('th[aria-sort] button').forEach((b) => b.addEventListener('click', () => {
    const th = b.closest('th');
    const col = th.dataset.col;
    if (estado.orden === col) estado.dir *= -1; else { estado.orden = col; estado.dir = 1; }
    contenedor.querySelectorAll('th[aria-sort]').forEach((x) => x.setAttribute('aria-sort', 'none'));
    th.setAttribute('aria-sort', estado.dir === 1 ? 'ascending' : 'descending');
    pintar();
  }));
  pager.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-pag]');
    if (!b || b.disabled) return;
    estado.pagina += b.dataset.pag === 'next' ? 1 : -1;
    pintar();
    contenedor.querySelector('.table-wrap').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
  if (alClicFila) {
    const abrirFila = (tr) => { const f = contenedor._lista[Number(tr.dataset.i)]; if (f) alClicFila(f, tr); };
    tbody.addEventListener('click', (ev) => { const tr = ev.target.closest('tr[data-i]'); if (tr) abrirFila(tr); });
    tbody.addEventListener('keydown', (ev) => {
      const tr = ev.target.closest('tr[data-i]');
      if (!tr) return;
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); abrirFila(tr); }
      if (ev.key === 'ArrowDown' && tr.nextElementSibling) { ev.preventDefault(); tr.nextElementSibling.focus(); }
      if (ev.key === 'ArrowUp' && tr.previousElementSibling) { ev.preventDefault(); tr.previousElementSibling.focus(); }
    });
  }

  pintar();
  return {
    actualizar(nuevas) { filas = nuevas || []; pintar(); },
    filtradas: () => contenedor._lista || [],
    fijarFiltro(clave, valor) {
      estado.filtros[clave] = valor;
      const s = contenedor.querySelector(`[data-filtro="${clave}"]`);
      if (s) s.value = valor;
      estado.pagina = 1;
      pintar();
    }
  };
}

Object.assign(__m["src/ui/table.js"], { crearTabla });
})();

// ── src/tabs/necesidades.js ──
__m["src/tabs/necesidades.js"] = {};
(function () {
/*
 * necesidades.js — Pestaña 4: tablero del plan de necesidades consolidado de todas las dependencias que cargaron.
 * Cifras, distribución por tipo y por trimestre, valor por dependencia agrupado por tipo de proceso,
 * tabla maestra con trazabilidad a la acción de origen, panel lateral de detalle y exportación a Excel.
 * Incluye cargue masivo de Excel para que la OAPDI consolide los archivos recibidos.
 */
const { estado, on: alEvento, dependencia, dependencias } = __m["src/estado.js"];
const { esc, on } = __m["src/ui/dom.js"];
const { icono } = __m["src/ui/iconos.js"];
const { toast, toastError } = __m["src/ui/toast.js"];
const { abrirPanel } = __m["src/ui/modal.js"];
const { crearTabla } = __m["src/ui/table.js"];
const { graficaBarras } = __m["src/ui/graficas.js"];
const { tarjetaCifra, estadoVacio, activarAnimaciones, animarNumero, barrasHorizontales, cadenaLogica } = __m["src/ui/cards.js"];
const { leerLibro, exportarExcel, xlsxDisponible } = __m["src/lib/excel.js"];
const { validarFormulacion, leerDependenciaDeLibro, TIPOS_NECESIDAD } = __m["src/lib/validacion.js"];
const { descargarBlob, obtenerLogo } = __m["src/lib/export.js"];
const { moneda, entero } = __m["src/lib/formato.js"];
const { fechaCorta } = __m["src/lib/fechas.js"];
const { PALETA, TIPOS_PROCESO, TIPOS_PROCESO_PLURAL } = __m["src/config.js"];

let raiz = null;
let ctxApp = null;
let tabla = null;
let medida = 'valor';
const nombreTipo = (id) => TIPOS_NECESIDAD.find((t) => t.id === id)?.nombre || 'Sin tipo';

// Aplana las formulaciones en filas de necesidades con su trazabilidad.
function filasNecesidades() {
  const metas = estado.datos.metas?.metasInstitucionales || [];
  const lineas = metas.flatMap((m) => m.lineasPDI || []);
  return estado.consolidado.formulaciones.flatMap((f) => {
    const d = dependencia(f.dependencia);
    const acciones = new Map((f.acciones || []).map((a) => [a.codigo, a]));
    return (f.necesidades || []).map((n) => {
      const accion = n.codigoAccion ? acciones.get(n.codigoAccion) : null;
      return {
        ...n,
        dependencia: f.dependencia,
        depSigla: d?.sigla || f.dependencia,
        depNombre: d?.nombre || f.dependencia,
        tipoProceso: d?.tipoProceso || '',
        estadoFormulacion: f.estado,
        archivo: f.archivo,
        cargadoEn: f.cargadoEn,
        accion,
        meta: accion ? metas.find((m) => m.id === accion.metaId) : null,
        linea: accion ? lineas.find((l) => l.id === accion.lineaId) : null,
        adquisiciones: (f.adquisiciones || []).filter((a) => a.codigoNecesidad === n.codigo),
        trimestreTxt: n.trimestre ? `T${n.trimestre}` : '—'
      };
    });
  });
}

function trazabilidad(f) {
  if (f.accion) return `<span class="traza-ok"><span class="mono">${esc(f.accion.codigo)}</span> ${esc(f.accion.nombre)}</span>`;
  return `<span class="trace-missing">${icono('alerta', 'icon-sm')}sin acción asociada</span>`;
}

function abrirDetalle(f) {
  const nodo = (num, titulo, cuerpo, ok = true) => `<li class="traza-nodo ${ok ? '' : 'is-roto'}"><span class="chain-num">${num}</span><div><span class="eyebrow">${esc(titulo)}</span>${cuerpo}</div></li>`;
  const contenido = `
    <div class="stack">
      <div class="row" style="gap:6px">
        <span class="badge proc-${esc(f.tipoProceso)}"><span class="proc-dot"></span>${esc(f.dependencia)} · ${esc(f.depNombre)}</span>
        <span class="badge">${esc(nombreTipo(f.tipo))}</span>
        <span class="badge">${esc(f.trimestreTxt)}</span>
        <span class="badge ${f.estadoFormulacion === 'validada' ? 'badge-ok' : 'badge-danger'}">${f.estadoFormulacion === 'validada' ? 'Formulación validada' : 'Formulación con bloqueantes'}</span>
      </div>
      <dl class="dl">
        <dt>Descripción</dt><dd>${esc(f.descripcion || '—')}</dd>
        <dt>Cantidad</dt><dd>${f.cantidad === null || f.cantidad === undefined ? '—' : entero(f.cantidad)}</dd>
        <dt>Valor estimado</dt><dd><strong>${moneda(f.valor || 0)}</strong></dd>
        <dt>Justificación</dt><dd>${esc(f.justificacion || '—')}</dd>
        <dt>Archivo</dt><dd>${esc(f.archivo)} · ${esc(fechaCorta(String(f.cargadoEn).slice(0, 10)))}</dd>
      </dl>
      <h3 style="margin-top:8px">Trazabilidad en la cadena lógica</h3>
      <ol class="traza">
        ${nodo(1, 'Meta 2027', f.meta ? `<strong>${esc(f.meta.id)} · ${esc(f.meta.nombre)}</strong>` : '<span class="muted">Sin meta identificada</span>', Boolean(f.meta))}
        ${nodo(2, 'Línea del PDI', f.linea ? `<strong>${esc(f.linea.id)} · ${esc(f.linea.nombre)}</strong>` : '<span class="muted">Sin línea identificada</span>', Boolean(f.linea))}
        ${nodo(3, 'Acción que la origina', f.accion
          ? `<strong>${esc(f.accion.codigo)} · ${esc(f.accion.nombre)}</strong><p class="mb-0 muted">Indicador: ${esc(f.accion.indicador)} · Meta ${esc(f.accion.metaCuantitativaTexto)} ${esc(f.accion.unidad)} · Evidencia: ${esc(f.accion.evidencia || 'sin evidencia macro')}</p>`
          : `<strong class="danger-text">Sin acción asociada</strong><p class="mb-0 muted">${f.codigoAccion ? `El código ${esc(f.codigoAccion)} no existe en la hoja Acciones.` : 'No se indicó el código de acción.'} Esta necesidad no es válida en el plan.</p>`, Boolean(f.accion))}
        ${nodo(4, 'Necesidad', `<strong>${esc(f.codigo)} · ${esc(f.descripcion)}</strong>`)}
        ${nodo(5, 'Adquisiciones', f.adquisiciones.length
          ? `<ul class="nodo-acciones">${f.adquisiciones.map((a) => `<li>${esc(a.modalidadTexto || 'Sin modalidad')} · ${moneda(a.valor || 0)}${a.fechaRadicacion ? ` · radicar antes del ${esc(fechaCorta(a.fechaRadicacion))}` : ''}</li>`).join('')}</ul>`
          : '<span class="muted">Aún no tiene adquisición asociada (puede resolverse sin compra).</span>', true)}
      </ol>
    </div>`;
  abrirPanel({ titulo: `Necesidad ${f.codigo}`, subtitulo: `${f.depSigla} · ${moneda(f.valor || 0)}`, contenido });
}

function pintar() {
  const filas = filasNecesidades();
  const cont = raiz.querySelector('[data-tablero]');
  if (!estado.consolidado.formulaciones.length) {
    tabla = null;
    cont.innerHTML = estadoVacio({
      titulo: 'Aún no hay necesidades consolidadas',
      texto: 'Este tablero se alimenta de los Excel validados en la pestaña <strong>Formulación y pase</strong>. Cuando una dependencia carga su archivo, sus necesidades aparecen aquí con la acción que las origina. La OAPDI también puede cargar de una vez los archivos recibidos por correo.',
      iconoNombre: 'necesidades',
      accion: `<a class="btn btn-primary" href="#formulacion">${icono('formulacion', 'icon-sm')}Ir a Formulación y pase</a><button type="button" class="btn" data-cargue-masivo>${icono('subir', 'icon-sm')}Cargar Excel de dependencias</button>`
    }) + `<div class="vacio-cadena">${cadenaLogica({ activo: 'necesidades' })}</div>`;
    activarAnimaciones(cont);
    return;
  }
  const total = filas.length;
  const valor = filas.reduce((s, f) => s + (f.valor || 0), 0);
  const conAccion = filas.filter((f) => f.accion).length;
  const depsReportaron = new Set(estado.consolidado.formulaciones.map((f) => f.dependencia)).size;
  const totalDeps = dependencias().length;
  if (!cont.querySelector('[data-cifras]')) {
    cont.innerHTML = `
      <div class="grid-4" data-cifras>
        ${tarjetaCifra({ etiqueta: 'Necesidades registradas', valor: total, iconoNombre: 'necesidades', id: 'c-total' })}
        ${tarjetaCifra({ etiqueta: 'Valor total consolidado', valor, formato: 'monedaCompacta', iconoNombre: 'dinero', id: 'c-valor', pie: `<span data-valor-exacto>${moneda(valor)}</span>` })}
        ${tarjetaCifra({ etiqueta: 'Dependencias que reportaron', valor: depsReportaron, iconoNombre: 'edificio', id: 'c-deps', pie: `de ${totalDeps} del catálogo` })}
        ${tarjetaCifra({ etiqueta: 'Con acción asociada', valor: total ? (conAccion / total) * 100 : 0, formato: 'porcentaje', iconoNombre: 'enlace', id: 'c-traza', pie: `<span data-sin-accion></span>` })}
      </div>
      <div class="row-between" style="margin:26px 0 12px">
        <h2 class="mb-0">Distribución</h2>
        <div class="segmentado" role="group" aria-label="Medida de las gráficas">
          <button type="button" class="chip" data-medida="valor" aria-pressed="true">Valor</button>
          <button type="button" class="chip" data-medida="cantidad" aria-pressed="false">Número de necesidades</button>
        </div>
      </div>
      <div class="grid-3 tablero-graficas">
        <div class="card reveal"><h3>Por tipo</h3><p class="muted" style="font-size:.84rem">Bien, servicio, talento humano e infraestructura.</p><div data-g-tipo></div></div>
        <div class="card reveal"><h3>Por trimestre requerido</h3><p class="muted" style="font-size:.84rem">Cuándo se necesita cada cosa en 2027.</p><div data-g-trim></div></div>
        <div class="card reveal"><h3>Por dependencia</h3><p class="muted" style="font-size:.84rem">Agrupadas por tipo de proceso del mapa institucional.</p><div data-g-dep class="dep-scroll"></div></div>
      </div>
      <div class="card reveal" style="margin-top:22px">
        <div class="card-head"><div><h2>Tabla maestra</h2><p>Haga clic en una fila para ver su trazabilidad completa.</p></div></div>
        <div data-tabla></div>
      </div>`;
    on(cont, 'click', '[data-medida]', (ev, b) => {
      medida = b.dataset.medida;
      cont.querySelectorAll('[data-medida]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      pintarGraficas(filasNecesidades());
    });
    activarAnimaciones(cont);
  } else {
    animarNumero(cont.querySelector('#c-total .stat-value'), total);
    animarNumero(cont.querySelector('#c-valor .stat-value'), valor);
    animarNumero(cont.querySelector('#c-deps .stat-value'), depsReportaron);
    animarNumero(cont.querySelector('#c-traza .stat-value'), total ? (conAccion / total) * 100 : 0);
    cont.querySelector('[data-valor-exacto]').textContent = moneda(valor);
  }
  cont.querySelector('#c-traza').classList.toggle('is-alert', conAccion < total);
  cont.querySelector('[data-sin-accion]').innerHTML = conAccion < total ? `<span class="danger-text">${total - conAccion} sin acción asociada</span>` : 'Toda necesidad nace de una acción';
  pintarGraficas(filas);
  pintarTabla(filas);
}

function pintarGraficas(filas) {
  const cont = raiz.querySelector('[data-tablero]');
  const agregado = (lista) => (medida === 'valor' ? lista.reduce((s, f) => s + (f.valor || 0), 0) : lista.length);
  const formato = medida === 'valor' ? 'moneda' : 'entero';
  const cat = PALETA.categorica();
  graficaBarras(cont.querySelector('[data-g-tipo]'), {
    etiquetas: TIPOS_NECESIDAD.map((t) => t.nombre),
    series: [{ nombre: medida === 'valor' ? 'Valor' : 'Necesidades', datos: TIPOS_NECESIDAD.map((t) => agregado(filas.filter((f) => f.tipo === t.id))), colores: cat }],
    formato, horizontal: true, alto: 230, titulo: 'Necesidades por tipo'
  });
  graficaBarras(cont.querySelector('[data-g-trim]'), {
    etiquetas: ['T1', 'T2', 'T3', 'T4'],
    series: [{ nombre: medida === 'valor' ? 'Valor' : 'Necesidades', datos: [1, 2, 3, 4].map((t) => agregado(filas.filter((f) => f.trimestre === t))) }],
    formato, alto: 230, titulo: 'Necesidades por trimestre'
  });
  const grupos = ['estrategico', 'misional', 'apoyo', 'evaluacion'].map((tp) => {
    const items = dependencias().filter((d) => d.tipoProceso === tp)
      .map((d) => ({ etiqueta: `${d.codigo} · ${d.sigla}`, valor: agregado(filas.filter((f) => String(f.dependencia) === String(d.codigo))), clase: `proc-${tp}`, proc: true }))
      .filter((i) => i.valor > 0).sort((a, b) => b.valor - a.valor);
    return { tp, items };
  }).filter((g) => g.items.length);
  cont.querySelector('[data-g-dep]').innerHTML = grupos.length
    ? grupos.map((g) => `<div class="grupo-proc"><span class="grupo-proc-tit proc-${g.tp}"><span class="proc-dot"></span>${esc(TIPOS_PROCESO_PLURAL[g.tp])}</span>${barrasHorizontales(g.items, { formato: medida === 'valor' ? 'monedaCompacta' : 'entero' })}</div>`).join('')
    : '<p class="muted">Sin datos.</p>';
}

function pintarTabla(filas) {
  const cont = raiz.querySelector('[data-tabla]');
  if (tabla) { tabla.actualizar(filas); return; }
  const depsConDatos = Array.from(new Set(filas.map((f) => f.dependencia))).sort();
  tabla = crearTabla(cont, {
    etiqueta: 'Necesidades consolidadas',
    filas,
    placeholder: 'Buscar por descripción, código, acción o dependencia…',
    porPagina: estado.datos.config?.umbrales?.filasPorPagina || 12,
    filtros: [
      { clave: 'dependencia', etiqueta: 'Dependencia', opciones: dependencias().map((d) => ({ valor: d.codigo, texto: `${d.codigo} · ${d.sigla}${depsConDatos.includes(d.codigo) ? '' : ' (sin datos)'}` })) },
      { clave: 'tipo', etiqueta: 'Tipo', opciones: TIPOS_NECESIDAD.map((t) => ({ valor: t.id, texto: t.nombre })) },
      { clave: 'trimestre', etiqueta: 'Trimestre', opciones: [1, 2, 3, 4].map((t) => ({ valor: String(t), texto: `T${t}` })) }
    ],
    accionesHtml: `<button type="button" class="btn" data-exportar ${xlsxDisponible() ? '' : 'disabled'}>${icono('excel', 'icon-sm')}Exportar filtrado</button>`,
    columnas: [
      { clave: 'dependencia', titulo: 'Dependencia', valor: (f) => `${f.dependencia} ${f.depSigla}`, render: (f) => `<span class="dep-cel proc-${esc(f.tipoProceso)}"><span class="proc-dot"></span><span><strong>${esc(f.depSigla)}</strong><small>${esc(f.dependencia)}</small></span></span>` },
      { clave: 'codigo', titulo: 'Código', render: (f) => `<span class="mono">${esc(f.codigo || '—')}</span>` },
      { clave: 'descripcion', titulo: 'Descripción', clase: 'col-ancha' },
      { clave: 'tipo', titulo: 'Tipo', valor: (f) => nombreTipo(f.tipo) },
      { clave: 'trimestre', titulo: 'Trim.', valor: (f) => f.trimestreTxt },
      { clave: 'valor', titulo: 'Valor estimado', tipo: 'moneda', render: (f) => (f.valor ? moneda(f.valor) : '<span class="danger-text">$ 0</span>') },
      { clave: 'traza', titulo: 'Acción que la origina', valor: (f) => (f.accion ? `${f.accion.codigo} ${f.accion.nombre}` : 'sin acción asociada'), render: trazabilidad, clase: 'col-ancha' }
    ],
    alClicFila: abrirDetalle,
    pieTotales: (lista) => `<tr><td colspan="5">Total filtrado (${entero(lista.length)})</td><td class="num">${moneda(lista.reduce((s, f) => s + (f.valor || 0), 0))}</td><td></td></tr>`
  });
  cont.querySelector('[data-exportar]').addEventListener('click', exportarFiltrado);
}

async function exportarFiltrado() {
  try {
    const lista = tabla.filtradas();
    if (!lista.length) { toast({ tipo: 'warn', titulo: 'Nada para exportar', mensaje: 'El filtro actual no tiene registros.' }); return; }
    const logo = await obtenerLogo();
    const r = exportarExcel({
      nombreArchivo: `JP2027_Necesidades_consolidado_${new Date().toISOString().slice(0, 10)}.xlsx`,
      logo: logo.bytes,
      hojas: [{
        nombre: 'Necesidades', titulo: 'Plan de necesidades 2027 — consolidado', subtitulo: `${entero(lista.length)} necesidades · ${moneda(lista.reduce((s, f) => s + (f.valor || 0), 0))}`,
        columnas: [
          { titulo: 'Código dependencia', ancho: 12 }, { titulo: 'Dependencia', ancho: 40 }, { titulo: 'Tipo de proceso', ancho: 16 },
          { titulo: 'Código de necesidad', ancho: 14 }, { titulo: 'Descripción', ancho: 50 }, { titulo: 'Tipo', ancho: 16 }, { titulo: 'Cantidad', ancho: 10, tipo: 'numero' },
          { titulo: 'Valor estimado', ancho: 18, tipo: 'moneda' }, { titulo: 'Trimestre requerido', ancho: 12 }, { titulo: 'Código de acción', ancho: 14 },
          { titulo: 'Acción que la origina', ancho: 44 }, { titulo: 'Meta 2027', ancho: 30 }, { titulo: 'Línea PDI', ancho: 36 }, { titulo: 'Trazabilidad', ancho: 22 }, { titulo: 'Justificación', ancho: 50 }, { titulo: 'Estado de la formulación', ancho: 20 }
        ],
        filas: lista.map((f) => [f.dependencia, f.depNombre, TIPOS_PROCESO[f.tipoProceso] || '', f.codigo, f.descripcion, nombreTipo(f.tipo), f.cantidad, f.valor || 0, f.trimestreTxt, f.codigoAccion,
          f.accion ? f.accion.nombre : '', f.meta ? `${f.meta.id} — ${f.meta.nombre}` : '', f.linea ? `${f.linea.id} — ${f.linea.nombre}` : '',
          f.accion ? 'Con acción asociada' : 'SIN ACCIÓN ASOCIADA', f.justificacion, f.estadoFormulacion === 'validada' ? 'Validada' : 'Con bloqueantes'])
      }]
    });
    descargarBlob(r.blob, r.nombre);
    toast({ tipo: 'ok', titulo: 'Consolidado exportado', mensaje: `${lista.length} filas en ${r.nombre}` });
  } catch (e) { toastError('No se pudo exportar', e, e.message); }
}

// Cargue masivo para la OAPDI: lee varios Excel, identifica la dependencia en la hoja Instructivo y los valida.
async function cargueMasivo(archivos) {
  let ok = 0; const fallos = [];
  for (const archivo of archivos) {
    try {
      const libro = await leerLibro(archivo);
      const cod = leerDependenciaDeLibro(libro) || (/(\d{3})/.exec(archivo.name) || [])[1];
      if (!cod || !dependencia(cod)) { fallos.push(`${archivo.name}: no indica la dependencia (celda «Dependencia que formula» del Instructivo).`); continue; }
      const r = validarFormulacion(libro, { metas: estado.datos.metas.metasInstitucionales, modalidades: estado.datos.modalidades.modalidades, calendario: estado.indices.calendario, umbrales: estado.datos.config?.umbrales, dependencia: cod });
      await ctxApp.almacen.guardarFormulacion({
        dependencia: cod, archivo: archivo.name, cargadoEn: new Date().toISOString(),
        persona: { nombre: 'Cargue masivo OAPDI', correo: '', cargo: '' },
        estado: r.resumen.bloqueantes ? 'con-bloqueantes' : 'validada',
        hallazgos: r.hallazgos, resumen: r.resumen, acciones: r.acciones, necesidades: r.necesidades, adquisiciones: r.adquisiciones
      });
      ok += 1;
    } catch (e) { fallos.push(`${archivo.name}: ${e.message}`); }
  }
  await ctxApp.refrescarConsolidado();
  if (ok) toast({ tipo: 'ok', titulo: `${ok} ${ok === 1 ? 'archivo consolidado' : 'archivos consolidados'}`, mensaje: 'Las formulaciones con bloqueantes quedan marcadas como «cargadas» pero no «validadas».' });
  if (fallos.length) toast({ tipo: 'warn', titulo: `${fallos.length} ${fallos.length === 1 ? 'archivo no se pudo cargar' : 'archivos no se pudieron cargar'}`, mensaje: fallos.join(' · '), duracion: 14000 });
}

function montar(panel, ctx) {
  raiz = panel;
  ctxApp = ctx;
  panel.innerHTML = `<div class="container page">
    <header class="page-head reveal">
      <div>
        <span class="eyebrow">${icono('necesidades', 'icon-sm')}Plan de necesidades</span>
        <h1>Necesidades consolidadas de la ETITC</h1>
        <p class="lead">Lo que cada dependencia necesita para cumplir sus acciones 2027, con su trazabilidad hasta la meta.</p>
      </div>
      <div class="btn-group">
        <button type="button" class="btn" data-cargue-masivo ${xlsxDisponible() ? '' : 'disabled'}>${icono('subir', 'icon-sm')}Cargar Excel de dependencias</button>
        <input type="file" multiple accept=".xlsx,.xls" hidden data-input-masivo>
      </div>
    </header>
    <div data-tablero></div>
  </div>`;
  const input = panel.querySelector('[data-input-masivo]');
  on(panel, 'click', '[data-cargue-masivo]', () => {
    if (!xlsxDisponible()) { toast({ tipo: 'warn', titulo: 'Excel no disponible', mensaje: 'La librería SheetJS no cargó.' }); return; }
    input.click();
  });
  input.addEventListener('change', async () => {
    const lista = Array.from(input.files); input.value = '';
    if (lista.length) await cargueMasivo(lista);
  });
  pintar();
  alEvento('consolidado', () => { if (raiz) pintar(); });
  alEvento('tema', () => { if (raiz && !raiz.hidden && estado.consolidado.formulaciones.length) pintarGraficas(filasNecesidades()); });
  alEvento('librerias', () => { if (raiz && estado.consolidado.formulaciones.length) pintarGraficas(filasNecesidades()); });
}

const pestanaNecesidades = {
  id: 'necesidades',
  titulo: 'Plan de necesidades',
  tituloCorto: 'Necesidades',
  icono: 'necesidades',
  montar,
  alMostrar() { if (estado.consolidado.formulaciones.length) pintarGraficas(filasNecesidades()); }
};

Object.assign(__m["src/tabs/necesidades.js"], { filasNecesidades, pestanaNecesidades });
})();

// ── src/tabs/adquisiciones.js ──
__m["src/tabs/adquisiciones.js"] = {};
(function () {
/*
 * adquisiciones.js — Pestaña 5: Plan de adquisiciones.
 *  A. Calculador de fecha límite: desde la fecha en que se necesita operando y la modalidad, calcula hacia atrás
 *     (en días hábiles, sin sábados, domingos ni festivos) la fecha de radicación de estudios previos y el camino etapa por etapa.
 *  B. Consolidado: valor por modalidad y trimestre con acumulado, gráfica de congestión de radicaciones por mes
 *     y alertas de radicaciones a menos de 30 días.
 *
 * NOTA: los tiempos por modalidad vienen de data/modalidades.json y son PROVISIONALES.
 * Deben reemplazarse por los tiempos formalizados en el Manual de Contratación de la ETITC.
 */
const { estado, on: alEvento, dependencia, umbral } = __m["src/estado.js"];
const { esc, on } = __m["src/ui/dom.js"];
const { icono } = __m["src/ui/iconos.js"];
const { toastError } = __m["src/ui/toast.js"];
const { timelineHorizontal } = __m["src/ui/timeline.js"];
const { graficaBarras } = __m["src/ui/graficas.js"];
const { estadoVacio, activarAnimaciones, tarjetaCifra, animarNumero } = __m["src/ui/cards.js"];
const { caminoContratacion, hoyISO, fechaLarga, fechaCorta, diferenciaDias, trimestreDe, nombreMes, sumarDias } = __m["src/lib/fechas.js"];
const { moneda, entero } = __m["src/lib/formato.js"];
const { exportarExcel, xlsxDisponible } = __m["src/lib/excel.js"];
const { descargarBlob, obtenerLogo } = __m["src/lib/export.js"];
const { PALETA } = __m["src/config.js"];

let raiz = null;
const modalidades = () => estado.datos.modalidades?.modalidades || [];
const uvt = () => estado.datos.modalidades?.uvt?.valor || 0;
const totalHabiles = (m) => (m.etapas || []).reduce((s, e) => s + Number(e.diasHabiles || 0), 0) || Number(m.diasHabilesTotales) || 0;

// ───────── A. Calculador ─────────
function calcular() {
  const cont = raiz.querySelector('[data-calc-resultado]');
  const fecha = raiz.querySelector('#calc-fecha').value;
  const modId = raiz.querySelector('#calc-modalidad').value;
  const valor = Number(raiz.querySelector('#calc-valor').value || 0);
  const mod = modalidades().find((m) => m.id === modId);
  if (!fecha || !mod) {
    cont.innerHTML = `<div class="calc-guia">${icono('reloj', 'icon-lg')}<p class="mb-0">Indique la fecha en que necesita el bien o servicio operando y la modalidad: el aplicativo calcula hacia atrás cuándo debe radicar los estudios previos.</p></div>`;
    return;
  }
  const cal = estado.indices.calendario;
  const camino = caminoContratacion(cal, mod, fecha);
  const hoy = hoyISO();
  const vencida = camino.radicacion < hoy;
  const habilesRestantes = vencida ? 0 : cal.habilesEntre(hoy, camino.radicacion);
  const notas = [];
  if (!cal.esHabil(fecha)) notas.push(`La fecha elegida ${cal.esFestivo(fecha) ? `es festivo (${cal.nombreFestivo(fecha)})` : 'cae en fin de semana'}: el bien o servicio empezaría a operar el siguiente día hábil.`);
  const anios = new Set([camino.radicacion.slice(0, 4), fecha.slice(0, 4)]);
  anios.forEach((a) => { if (!cal.cubreAnio(a)) notas.push(`No hay festivos cargados para ${a}: el cálculo solo descuenta fines de semana. Agregue los festivos en data/festivos.json.`); });
  if (mod.topeUVT && valor && uvt() && valor > mod.topeUVT * uvt()) notas.push(`El valor (${moneda(valor)}) supera el tope de ${mod.nombre} (${entero(mod.topeUVT)} UVT ≈ ${moneda(mod.topeUVT * uvt())}). Revise la modalidad con Contratación.`);
  // Fecha más temprana alcanzable radicando el próximo día hábil
  const proximaRadicacion = cal.esHabil(hoy) ? hoy : cal.sumarHabiles(hoy, 1);
  const masTemprana = cal.sumarHabiles(proximaRadicacion, camino.totalHabiles);

  const items = camino.etapas.map((e) => ({
    titulo: e.nombre,
    subtitulo: `<span class="badge">${e.diasHabiles} ${e.diasHabiles === 1 ? 'día hábil' : 'días hábiles'}</span>`,
    cuerpo: `<span class="htl-fechas">${esc(fechaCorta(e.inicio))} <span aria-hidden="true">→</span><span class="sr-only">hasta</span> ${esc(fechaCorta(e.fin))}</span>`,
    estado: e.fin < hoy ? 'danger' : ''
  }));
  items.push({ titulo: 'En operación', subtitulo: '<span class="badge badge-ok">Meta</span>', cuerpo: `<span class="htl-fechas">${esc(fechaCorta(fecha))}</span>`, iconoNombre: 'bandera', estado: 'ok' });

  cont.innerHTML = `
    <div class="calc-veredicto ${vencida ? 'is-vencida' : 'is-ok'} reveal">
      <span class="calc-ico">${icono(vencida ? 'bloqueo' : 'agenda', 'icon-lg')}</span>
      <div>
        ${vencida
          ? `<span class="eyebrow">Fecha no alcanzable</span>
             <h3>Esa fecha de operación no es alcanzable por ${esc(mod.nombre.toLowerCase())}</h3>
             <p class="mb-0">La radicación de estudios previos debía hacerse a más tardar el <strong>${esc(fechaLarga(camino.radicacion))}</strong>. Radicando el ${esc(fechaCorta(proximaRadicacion))}, lo más pronto que estaría operando es el <strong>${esc(fechaLarga(masTemprana))}</strong>.</p>`
          : `<span class="eyebrow">Fecha límite de radicación de estudios previos</span>
             <h3 class="calc-fecha">${esc(fechaLarga(camino.radicacion))}</h3>
             <p class="mb-0">${esc(mod.nombre)} toma <strong>${camino.totalHabiles} días hábiles</strong>. ${habilesRestantes === 0 ? '<strong>Debe radicar hoy.</strong>' : `Le quedan <strong>${habilesRestantes} días hábiles</strong> (${diferenciaDias(hoy, camino.radicacion)} calendario) para radicar.`}</p>`}
      </div>
    </div>
    ${notas.map((n) => `<div class="notice" style="margin-top:12px">${icono('info', 'icon-sm')}<span>${esc(n)}</span></div>`).join('')}
    <div class="gantt reveal" aria-hidden="true">${camino.etapas.map((e, i) => `<span style="flex:${e.diasHabiles};--i:${i}" title="${esc(e.nombre)}: ${e.diasHabiles} días hábiles"></span>`).join('')}</div>
    <div class="gantt-ejes" aria-hidden="true"><span>Radicación · ${esc(fechaCorta(camino.radicacion))}</span><span>Operación · ${esc(fechaCorta(fecha))}</span></div>
    ${timelineHorizontal(items, { etiqueta: `Etapas de ${mod.nombre}`, clase: 'htl-etapas' })}
    <p class="muted" style="font-size:.8rem;margin-top:10px">Tiempos por modalidad provisionales (data/modalidades.json). Días hábiles: sin sábados, domingos ni festivos de Colombia.</p>`;
  activarAnimaciones(cont);
}

// ───────── B. Consolidado ─────────
function filasAdquisiciones() {
  return estado.consolidado.formulaciones.flatMap((f) => (f.adquisiciones || []).map((a) => {
    const mod = modalidades().find((m) => m.id === a.modalidadId);
    let radicacion = a.fechaRadicacion || null;
    if (!radicacion && mod && a.fechaOperacion) radicacion = caminoContratacion(estado.indices.calendario, mod, a.fechaOperacion).radicacion;
    const necesidad = (f.necesidades || []).find((n) => n.codigo === a.codigoNecesidad);
    return { ...a, dependencia: f.dependencia, modalidad: mod, radicacion, necesidad };
  }));
}

function pintarConsolidado() {
  const cont = raiz.querySelector('[data-consolidado]');
  const filas = filasAdquisiciones();
  if (!filas.length) {
    cont.innerHTML = estadoVacio({
      titulo: 'Aún no hay adquisiciones consolidadas',
      texto: 'Las adquisiciones llegan de la hoja «Adquisiciones» de cada Excel validado en la pestaña Formulación y pase. Mientras tanto, use el calculador para planear sus fechas.',
      iconoNombre: 'adquisiciones',
      accion: `<a class="btn btn-primary" href="#formulacion">${icono('formulacion', 'icon-sm')}Ir a Formulación y pase</a>`
    });
    activarAnimaciones(cont);
    return;
  }
  const hoy = hoyISO();
  const dias = umbral('diasAlertaRadicacion', 30);
  const valorTotal = filas.reduce((s, a) => s + (a.valor || 0), 0);
  const conFecha = filas.filter((a) => a.radicacion);
  const proximas = conFecha.filter((a) => a.radicacion >= hoy && diferenciaDias(hoy, a.radicacion) < dias).sort((a, b) => a.radicacion.localeCompare(b.radicacion));
  const vencidas = conFecha.filter((a) => a.radicacion < hoy).sort((a, b) => a.radicacion.localeCompare(b.radicacion));

  const mods = modalidades();
  const claveMod = (a) => (a.modalidad ? a.modalidad.id : 'otra');
  const filasMod = [...mods.map((m) => ({ id: m.id, nombre: m.nombre })), { id: 'otra', nombre: 'Sin modalidad reconocida' }]
    .map((m) => {
      const lista = filas.filter((a) => claveMod(a) === m.id);
      const porT = [1, 2, 3, 4].map((t) => lista.filter((a) => trimestreDe(a.fechaOperacion) === t).reduce((s, a) => s + (a.valor || 0), 0));
      const sinFecha = lista.filter((a) => !a.fechaOperacion).reduce((s, a) => s + (a.valor || 0), 0);
      return { ...m, n: lista.length, porT, sinFecha, total: lista.reduce((s, a) => s + (a.valor || 0), 0) };
    }).filter((m) => m.n > 0);
  const totT = [0, 1, 2, 3].map((i) => filasMod.reduce((s, m) => s + m.porT[i], 0));
  const acumulado = totT.map((_, i) => totT.slice(0, i + 1).reduce((s, v) => s + v, 0));
  const totSinFecha = filasMod.reduce((s, m) => s + m.sinFecha, 0);

  // Congestión: radicaciones por mes
  const meses = new Map();
  conFecha.forEach((a) => { const k = a.radicacion.slice(0, 7); meses.set(k, (meses.get(k) || 0) + 1); });
  const clavesMes = Array.from(meses.keys()).sort();
  let serieMeses = [];
  if (clavesMes.length) {
    let k = clavesMes[0];
    while (k <= clavesMes[clavesMes.length - 1]) {
      serieMeses.push(k);
      const [y, m] = k.split('-').map(Number);
      k = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
    }
  }
  const conteos = serieMeses.map((k) => meses.get(k) || 0);
  const promedio = conteos.length ? conteos.reduce((s, v) => s + v, 0) / conteos.length : 0;
  const pico = Math.max(0, ...conteos);
  const colorBase = PALETA.leer('--g7', '#188b58');
  const colorPico = PALETA.leer('--cat-3', '#c08a1e');
  const colores = conteos.map((c) => (c > 1 && c >= promedio * 1.5 ? colorPico : colorBase));
  const mesesCongestionados = serieMeses.filter((_, i) => colores[i] === colorPico);

  const filaAlerta = (a, vencida) => {
    const d = dependencia(a.dependencia);
    const n = diferenciaDias(hoy, a.radicacion);
    return `<li class="alerta-item ${vencida ? 'is-vencida' : ''}">
      <span class="alerta-dias"><strong>${vencida ? Math.abs(n) : n}</strong><small>${vencida ? 'días de retraso' : n === 1 ? 'día' : 'días'}</small></span>
      <div><strong>${esc(a.necesidad?.descripcion || a.codigoNecesidad)}</strong>
      <span class="muted">${esc(d?.sigla || a.dependencia)} · ${esc(a.modalidad?.nombre || a.modalidadTexto || 'Sin modalidad')} · ${moneda(a.valor || 0)}</span>
      <span class="${vencida ? 'danger-text' : 'ink'}">Radicar ${vencida ? 'debió ser' : 'a más tardar'} el ${esc(fechaLarga(a.radicacion))}</span></div>
    </li>`;
  };

  const yaPintado = cont.querySelector('[data-cifras-adq]');
  if (!yaPintado) {
    cont.innerHTML = `
      <div class="grid-4" data-cifras-adq>
        ${tarjetaCifra({ etiqueta: 'Adquisiciones', valor: filas.length, iconoNombre: 'adquisiciones', id: 'a-total' })}
        ${tarjetaCifra({ etiqueta: 'Valor total', valor: valorTotal, formato: 'monedaCompacta', iconoNombre: 'dinero', id: 'a-valor' })}
        ${tarjetaCifra({ etiqueta: `Radicaciones en menos de ${dias} días`, valor: proximas.length, iconoNombre: 'reloj', id: 'a-prox' })}
        ${tarjetaCifra({ etiqueta: 'Radicaciones vencidas', valor: vencidas.length, iconoNombre: 'alerta', id: 'a-venc' })}
      </div>
      <div class="grid-2 adq-grid">
        <div class="card reveal"><div class="card-head"><div><h3>Congestión de radicaciones por mes</h3><p data-congestion-texto></p></div></div><div data-g-congestion></div>
          <div class="legend"><span><span class="dot" style="color:var(--g7)"></span>Radicaciones del mes</span><span><span class="dot" style="color:var(--cat-3)"></span>Mes congestionado (1,5 veces el promedio o más)</span></div></div>
        <div class="card reveal alertas-card"><div class="card-head"><div><h3>Alertas de radicación</h3><p>Adquisiciones que deben radicarse en menos de ${dias} días o que ya se vencieron.</p></div></div><div data-alertas></div></div>
      </div>
      <div class="card reveal" style="margin-top:22px">
        <div class="card-head"><div><h3>Valor por modalidad y trimestre de operación</h3><p>Trimestre en que se requiere el bien o servicio operando. La última fila acumula el valor a lo largo del año.</p></div>
        <button type="button" class="btn" data-exportar-adq ${xlsxDisponible() ? '' : 'disabled'}>${icono('excel', 'icon-sm')}Exportar adquisiciones</button></div>
        <div data-tabla-mod></div>
      </div>`;
    cont.querySelector('[data-exportar-adq]').addEventListener('click', () => exportarAdquisiciones(filasAdquisiciones()));
    activarAnimaciones(cont);
  } else {
    animarNumero(cont.querySelector('#a-total .stat-value'), filas.length);
    animarNumero(cont.querySelector('#a-valor .stat-value'), valorTotal);
    animarNumero(cont.querySelector('#a-prox .stat-value'), proximas.length);
    animarNumero(cont.querySelector('#a-venc .stat-value'), vencidas.length);
  }
  cont.querySelector('#a-prox').classList.toggle('is-alert', proximas.length > 0);
  cont.querySelector('#a-venc').classList.toggle('is-alert', vencidas.length > 0);
  cont.querySelector('[data-congestion-texto]').textContent = mesesCongestionados.length
    ? `Pico de ${pico} radicaciones. Meses congestionados: ${mesesCongestionados.map((k) => `${nombreMes(Number(k.slice(5)) - 1)} ${k.slice(0, 4)}`).join(', ')}.`
    : 'Las radicaciones están distribuidas sin picos marcados.';
  graficaBarras(cont.querySelector('[data-g-congestion]'), {
    etiquetas: serieMeses.map((k) => `${nombreMes(Number(k.slice(5)) - 1, true)} ${k.slice(2, 4)}`),
    series: [{ nombre: 'Radicaciones', datos: conteos, colores }],
    alto: 250, titulo: 'Radicaciones de estudios previos por mes'
  });
  cont.querySelector('[data-alertas]').innerHTML = proximas.length || vencidas.length
    ? `<ul class="alertas">${vencidas.map((a) => filaAlerta(a, true)).join('')}${proximas.map((a) => filaAlerta(a, false)).join('')}</ul>`
    : `<div class="empty" style="padding:28px 16px"><div class="empty-art" style="width:64px;height:64px">${icono('checkCirculo')}</div><p>No hay radicaciones en los próximos ${dias} días.</p></div>`;
  cont.querySelector('[data-tabla-mod]').innerHTML = `<div class="table-wrap"><table class="table" aria-label="Valor por modalidad y trimestre">
    <thead><tr><th scope="col">Modalidad</th><th scope="col" class="num">N.º</th>${[1, 2, 3, 4].map((t) => `<th scope="col" class="num">T${t}</th>`).join('')}${totSinFecha ? '<th scope="col" class="num">Sin fecha</th>' : ''}<th scope="col" class="num">Total</th></tr></thead>
    <tbody>${filasMod.map((m) => `<tr><th scope="row" style="background:none;position:static;font-size:.86rem">${esc(m.nombre)}</th><td class="num">${m.n}</td>${m.porT.map((v) => `<td class="num">${v ? moneda(v) : '<span class="muted">—</span>'}</td>`).join('')}${totSinFecha ? `<td class="num">${m.sinFecha ? moneda(m.sinFecha) : '—'}</td>` : ''}<td class="num"><strong>${moneda(m.total)}</strong></td></tr>`).join('')}</tbody>
    <tfoot>
      <tr><td>Total del trimestre</td><td class="num">${filas.length}</td>${totT.map((v) => `<td class="num">${moneda(v)}</td>`).join('')}${totSinFecha ? `<td class="num">${moneda(totSinFecha)}</td>` : ''}<td class="num">${moneda(valorTotal)}</td></tr>
      <tr><td>Valor acumulado</td><td></td>${acumulado.map((v) => `<td class="num">${moneda(v)}</td>`).join('')}${totSinFecha ? '<td></td>' : ''}<td></td></tr>
    </tfoot></table></div>`;
}

async function exportarAdquisiciones(filas) {
  try {
    const logo = await obtenerLogo();
    const r = exportarExcel({
      nombreArchivo: `JP2027_Adquisiciones_consolidado_${hoyISO()}.xlsx`,
      logo: logo.bytes,
      hojas: [{
        nombre: 'Adquisiciones', titulo: 'Plan de adquisiciones 2027 — consolidado', subtitulo: `${entero(filas.length)} adquisiciones · ${moneda(filas.reduce((s, a) => s + (a.valor || 0), 0))} · tiempos por modalidad provisionales`,
        columnas: [{ titulo: 'Código dependencia', ancho: 12 }, { titulo: 'Dependencia', ancho: 40 }, { titulo: 'Código de necesidad', ancho: 14 }, { titulo: 'Necesidad', ancho: 44 },
          { titulo: 'Modalidad', ancho: 30 }, { titulo: 'Valor', ancho: 18, tipo: 'moneda' }, { titulo: 'Fecha requerida operando', ancho: 16, tipo: 'fecha' },
          { titulo: 'Fecha límite de radicación', ancho: 16, tipo: 'fecha' }, { titulo: 'Días hábiles del trámite', ancho: 12, tipo: 'numero' }, { titulo: 'Observaciones', ancho: 40 }],
        filas: filas.map((a) => [a.dependencia, dependencia(a.dependencia)?.nombre || '', a.codigoNecesidad, a.necesidad?.descripcion || '', a.modalidad?.nombre || a.modalidadTexto,
          a.valor || 0, a.fechaOperacion, a.radicacion, a.modalidad ? totalHabiles(a.modalidad) : null, a.observaciones])
      }]
    });
    descargarBlob(r.blob, r.nombre);
  } catch (e) { toastError('No se pudo exportar', e, e.message); }
}

function montar(panel) {
  raiz = panel;
  const mods = modalidades();
  const prov = estado.datos.modalidades?.provisional;
  const minFecha = sumarDias(hoyISO(), 1);
  panel.innerHTML = `<div class="container page">
    <header class="page-head reveal">
      <div>
        <span class="eyebrow">${icono('adquisiciones', 'icon-sm')}Plan de adquisiciones</span>
        <h1>Cuándo radicar para tenerlo a tiempo</h1>
        <p class="lead">El calendario se calcula hacia atrás desde la fecha en que se necesita operando, en días hábiles de Colombia.</p>
      </div>
    </header>
    ${prov ? `<div class="prov-banner reveal">${icono('info', 'icon-sm')}<span><strong>Tiempos provisionales.</strong> ${esc(estado.datos.modalidades._comentario || 'Reemplazar por los tiempos formalizados en la ETITC.')}</span></div>` : ''}

    <section class="card calc reveal" aria-labelledby="calc-titulo">
      <div class="card-head"><div><span class="eyebrow">Herramienta A</span><h2 id="calc-titulo">Calculador de fecha límite</h2><p>¿Para cuándo lo necesita funcionando? Le decimos cuándo radicar los estudios previos.</p></div></div>
      <form class="calc-form" data-calc novalidate>
        <label class="field"><span class="field-label">Fecha en que lo necesita operando</span><input class="input" type="date" id="calc-fecha" min="${minFecha}" value="2027-03-01" required></label>
        <label class="field"><span class="field-label">Modalidad de contratación</span>
          <select class="select" id="calc-modalidad">${mods.map((m, i) => `<option value="${esc(m.id)}" ${i === 1 ? 'selected' : ''}>${esc(m.nombre)} · ${totalHabiles(m)} días hábiles</option>`).join('')}</select></label>
        <label class="field"><span class="field-label">Valor estimado (opcional)</span><input class="input" type="number" min="0" step="1000" id="calc-valor" inputmode="numeric" placeholder="Para revisar el tope"></label>
      </form>
      <div data-calc-resultado aria-live="polite"></div>
    </section>

    <section class="seccion" aria-labelledby="cons-titulo" style="margin-top:34px">
      <div class="seccion-head"><span class="seccion-letra" aria-hidden="true">B</span><div><h2 id="cons-titulo">Consolidado de adquisiciones</h2><p class="muted mb-0">Lo que reportaron las dependencias en la hoja Adquisiciones.</p></div></div>
      <div data-consolidado></div>
    </section>
  </div>`;
  if (!mods.length) panel.querySelector('[data-calc-resultado]').innerHTML = estadoVacio({ titulo: 'Sin modalidades', texto: 'Cargue data/modalidades.json para usar el calculador.', iconoNombre: 'adquisiciones' });
  on(panel, 'input', '[data-calc] input, [data-calc] select', () => { try { calcular(); } catch (e) { toastError('No se pudo calcular', e); } });
  on(panel, 'change', '[data-calc] select', () => calcular());
  if (mods.length) calcular();
  pintarConsolidado();
  alEvento('consolidado', () => { if (raiz) pintarConsolidado(); });
  alEvento('tema', () => { if (raiz && !raiz.hidden) pintarConsolidado(); });
  alEvento('librerias', () => { if (raiz) pintarConsolidado(); });
}

const pestanaAdquisiciones = {
  id: 'adquisiciones',
  titulo: 'Plan de adquisiciones',
  tituloCorto: 'Adquisiciones',
  icono: 'adquisiciones',
  montar,
  alMostrar() { pintarConsolidado(); }
};

Object.assign(__m["src/tabs/adquisiciones.js"], { pestanaAdquisiciones });
})();

// ── src/tabs/riesgos.js ──
__m["src/tabs/riesgos.js"] = {};
(function () {
/*
 * riesgos.js — Pestaña 6 (opcional): Mapa de riesgos.
 * Se activa solo con FEATURES.mapaRiesgos = true en src/config.js; con false no aparece en la navegación ni en conteos.
 * Matriz de probabilidad por impacto 5x5, inventario de riesgos por proceso del mapa institucional, controles y responsables.
 */
const { estado, dependencia } = __m["src/estado.js"];
const { esc, on } = __m["src/ui/dom.js"];
const { icono } = __m["src/ui/iconos.js"];
const { estadoVacio, cadenaLogica, activarAnimaciones } = __m["src/ui/cards.js"];
const { TIPOS_PROCESO_PLURAL } = __m["src/config.js"];

let raiz = null;
const filtro = { celda: null, proceso: '' };

function zona(p, i) {
  const v = p * i;
  if (v >= 15) return { id: 'extrema', nombre: 'Extrema' };
  if (v >= 10) return { id: 'alta', nombre: 'Alta' };
  if (v >= 5) return { id: 'moderada', nombre: 'Moderada' };
  return { id: 'baja', nombre: 'Baja' };
}

function pintar() {
  const datos = estado.datos.riesgos || {};
  const riesgos = datos.riesgos || [];
  const procesos = datos.procesos || [];
  const escP = datos.escalas?.probabilidad || ['1', '2', '3', '4', '5'];
  const escI = datos.escalas?.impacto || ['1', '2', '3', '4', '5'];
  const proc = (id) => procesos.find((p) => p.id === id);
  const cont = raiz.querySelector('[data-riesgos]');
  if (!riesgos.length) { cont.innerHTML = estadoVacio({ titulo: 'Sin riesgos registrados', texto: 'Cargue el inventario en data/riesgos.json.', iconoNombre: 'riesgos' }); return; }

  const visibles = riesgos.filter((r) => (!filtro.proceso || r.proceso === filtro.proceso)
    && (!filtro.celda || (r.probabilidad === filtro.celda[0] && r.impacto === filtro.celda[1])));
  const base = riesgos.filter((r) => !filtro.proceso || r.proceso === filtro.proceso);

  let matriz = '<div class="matriz" role="grid" aria-label="Matriz de probabilidad por impacto">';
  matriz += '<div class="matriz-eje-y" aria-hidden="true">Probabilidad</div>';
  for (let p = 5; p >= 1; p -= 1) {
    matriz += `<div class="matriz-fila" role="row"><span class="matriz-et" role="rowheader">${p} · ${esc(escP[p - 1])}</span>`;
    for (let i = 1; i <= 5; i += 1) {
      const n = base.filter((r) => r.probabilidad === p && r.impacto === i).length;
      const z = zona(p, i);
      const sel = filtro.celda && filtro.celda[0] === p && filtro.celda[1] === i;
      matriz += `<button type="button" role="gridcell" class="celda zona-${z.id} ${sel ? 'is-sel' : ''} ${n ? '' : 'is-vacia'}" data-celda="${p},${i}" aria-pressed="${sel}" aria-label="Probabilidad ${p}, impacto ${i}: ${n} riesgos, zona ${z.nombre}">${n || ''}</button>`;
    }
    matriz += '</div>';
  }
  matriz += `<div class="matriz-fila matriz-pie" aria-hidden="true"><span></span>${escI.map((t, k) => `<span>${k + 1} · ${esc(t)}</span>`).join('')}</div><div class="matriz-eje-x" aria-hidden="true">Impacto</div></div>`;

  const grupos = ['estrategico', 'misional', 'apoyo', 'evaluacion'].map((tp) => ({
    tp, procesos: procesos.filter((p) => p.tipoProceso === tp).map((p) => ({ ...p, riesgos: visibles.filter((r) => r.proceso === p.id) })).filter((p) => p.riesgos.length)
  })).filter((g) => g.procesos.length);

  cont.innerHTML = `<div class="grid-2 riesgos-grid">
    <div class="card reveal">
      <div class="card-head"><div><h2>Matriz 5 × 5</h2><p>Haga clic en una celda para filtrar el inventario.</p></div>${filtro.celda ? '<button type="button" class="btn btn-sm" data-limpiar>Quitar filtro</button>' : ''}</div>
      ${matriz}
      <div class="legend">${[['baja', 'Baja'], ['moderada', 'Moderada'], ['alta', 'Alta'], ['extrema', 'Extrema']].map(([k, t]) => `<span><span class="celda-mini zona-${k}"></span>${t}</span>`).join('')}</div>
    </div>
    <div class="card reveal">
      <div class="card-head"><div><h2>Inventario por proceso</h2><p>${visibles.length} de ${riesgos.length} riesgos${filtro.celda ? ` · probabilidad ${filtro.celda[0]}, impacto ${filtro.celda[1]}` : ''}</p></div>
        <select class="select" data-proceso aria-label="Filtrar por proceso" style="max-width:240px"><option value="">Todos los procesos</option>${procesos.map((p) => `<option value="${esc(p.id)}" ${filtro.proceso === p.id ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('')}</select></div>
      <div class="riesgos-lista">
        ${grupos.length ? grupos.map((g) => `<div class="grupo-proc"><span class="grupo-proc-tit proc-${g.tp}"><span class="proc-dot"></span>${esc(TIPOS_PROCESO_PLURAL[g.tp])}</span>
          ${g.procesos.map((p) => p.riesgos.map((r) => {
            const z = zona(r.probabilidad, r.impacto);
            return `<article class="riesgo">
              <div class="row-between"><span class="badge zona-badge zona-${z.id}">${z.nombre} · ${r.probabilidad * r.impacto}</span><span class="muted mono">${esc(r.id)} · ${esc(p.nombre)}</span></div>
              <h4>${esc(r.descripcion)}</h4>
              <dl class="dl"><dt>Causa</dt><dd>${esc(r.causa)}</dd><dt>Consecuencia</dt><dd>${esc(r.consecuencia)}</dd><dt>Responsable</dt><dd>${esc(r.responsable)}</dd>
              <dt>Dependencias</dt><dd>${(p.dependencias || []).map((c) => esc(dependencia(c)?.sigla || c)).join(', ')}</dd></dl>
              <ul class="controles">${(r.controles || []).map((c) => `<li>${icono('riesgos', 'icon-sm')}<span><strong>${esc(c.tipo)}:</strong> ${esc(c.descripcion)} <span class="muted">· ${esc(c.responsable)}</span></span></li>`).join('')}</ul>
            </article>`;
          }).join('')).join('')}</div>`).join('') : '<p class="muted">No hay riesgos con ese filtro.</p>'}
      </div>
    </div>
  </div>`;
  activarAnimaciones(cont);
}

function montar(panel) {
  raiz = panel;
  panel.innerHTML = `<div class="container page">
    <header class="page-head reveal">
      <div><span class="eyebrow">${icono('riesgos', 'icon-sm')}Mapa de riesgos · etapa opcional</span>
      <h1>Riesgos que pueden afectar el plan 2027</h1>
      <p class="lead">Matriz de probabilidad por impacto e inventario por proceso del mapa institucional.</p></div>
      ${cadenaLogica({ activo: 'riesgos', incluirRiesgos: true })}
    </header>
    ${estado.datos.riesgos?.provisional ? `<div class="prov-banner reveal">${icono('info', 'icon-sm')}<span><strong>Datos provisionales.</strong> ${esc(estado.datos.riesgos.aviso || '')}</span></div>` : ''}
    <div data-riesgos></div>
  </div>`;
  on(panel, 'click', '[data-celda]', (ev, b) => {
    const [p, i] = b.dataset.celda.split(',').map(Number);
    filtro.celda = filtro.celda && filtro.celda[0] === p && filtro.celda[1] === i ? null : [p, i];
    pintar();
  });
  on(panel, 'click', '[data-limpiar]', () => { filtro.celda = null; pintar(); });
  on(panel, 'change', '[data-proceso]', (ev, s) => { filtro.proceso = s.value; pintar(); });
  pintar();
}

const pestanaRiesgos = {
  id: 'riesgos',
  titulo: 'Mapa de riesgos',
  tituloCorto: 'Riesgos',
  icono: 'riesgos',
  montar
};

Object.assign(__m["src/tabs/riesgos.js"], { pestanaRiesgos });
})();

// ── src/tabs/escaner.js ──
__m["src/tabs/escaner.js"] = {};
(function () {
/*
 * escaner.js — Modo escáner (vista aparte, pensada para celular o tableta el día de la jornada).
 * Lee el QR del pase con la cámara trasera (html5-qrcode), verifica la firma, registra la asistencia y muestra
 * a pantalla completa por tres segundos: confirmación verde, aviso ámbar si ya ingresó o rechazo rojo.
 * Respaldo manual: búsqueda por nombre o correo contra el directorio (incluye a quienes no tienen correo).
 * La asistencia se guarda en localStorage y debe exportarse a Excel al cerrar.
 */
const { estado, on: alEvento, dependencia, dependencias, buscarPersonas, personasPorCorreo, nombreDependencia } = __m["src/estado.js"];
const { esc, on } = __m["src/ui/dom.js"];
const { icono } = __m["src/ui/iconos.js"];
const { toast, toastError } = __m["src/ui/toast.js"];
const { confirmar } = __m["src/ui/modal.js"];
const { barrasHorizontales, animarNumero, activarAnimaciones } = __m["src/ui/cards.js"];
const { verificarPase } = __m["src/lib/qr.js"];
const { exportarExcel, xlsxDisponible } = __m["src/lib/excel.js"];
const { descargarBlob, obtenerLogo } = __m["src/lib/export.js"];
const { normalizar, tituloLegible, entero, iniciales } = __m["src/lib/formato.js"];
const { hoyISO } = __m["src/lib/fechas.js"];

let raiz = null;
let ctxApp = null;
let lector = null;
let camaraActiva = false;
let ultimoTexto = { texto: '', t: 0 };
let overlayTimer = null;
let modo = 'camara';

const segundos = () => estado.datos.config?.umbrales?.segundosConfirmacionEscaner || 3;
const horaCorta = (iso) => new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });

function buscarDuplicado(r) {
  return estado.consolidado.asistencia.find((x) => (r.paseId && x.paseId === r.paseId)
    || (r.personaId && x.personaId === r.personaId)
    || (r.correo && x.correo === r.correo && normalizar(x.nombre) === normalizar(r.nombre))
    || (!r.correo && !r.personaId && normalizar(x.nombre) === normalizar(r.nombre) && String(x.dependencia) === String(r.dependencia)));
}

async function registrar(r) {
  const dup = buscarDuplicado(r);
  if (dup) { mostrarOverlay('duplicado', { ...dup, intento: r }); return false; }
  const registro = {
    ...r,
    clave: r.paseId ? `P:${r.paseId}` : r.personaId ? `D:${r.personaId}` : `M:${normalizar(r.nombre)}:${r.dependencia}`,
    hora: new Date().toISOString(),
    depNombre: nombreDependencia(r.dependencia)
  };
  try {
    await ctxApp.almacen.guardarAsistencia(registro);
    await ctxApp.refrescarConsolidado();
  } catch (e) {
    toastError('No se pudo guardar el registro', e, e.message);
    return false;
  }
  mostrarOverlay('ok', registro);
  return true;
}

// ───────── Pantalla completa de resultado ─────────
function mostrarOverlay(tipo, datos) {
  const ov = raiz.querySelector('[data-overlay]');
  clearTimeout(overlayTimer);
  const d = dependencia(datos.dependencia);
  const contenido = {
    ok: `<span class="ov-icono">${icono('check')}</span><span class="ov-estado">Bienvenido</span>
      <strong class="ov-nombre">${esc(datos.nombre)}</strong><span class="ov-cargo">${esc(datos.cargo || '')}</span>
      <span class="ov-dep">${esc(datos.dependencia)} · ${esc(d?.nombre || '')}</span><span class="ov-metodo">Registro ${datos.metodo === 'QR' ? 'con QR' : 'manual'} · ${esc(horaCorta(datos.hora))}</span>`,
    duplicado: `<span class="ov-icono">${icono('alerta')}</span><span class="ov-estado">Ya registrado</span>
      <strong class="ov-nombre">${esc(datos.nombre)}</strong><span class="ov-dep">${esc(datos.dependencia)} · ${esc(d?.nombre || '')}</span>
      <span class="ov-primera">Primer ingreso a las <b>${esc(horaCorta(datos.hora))}</b> (${datos.metodo === 'QR' ? 'QR' : 'manual'})</span>`,
    rechazo: `<span class="ov-icono">${icono('cerrar')}</span><span class="ov-estado">Pase no válido</span>
      <strong class="ov-nombre">${esc(datos.motivo || 'El código no es un pase de la jornada.')}</strong>
      ${datos.nombre ? `<span class="ov-cargo">A nombre de: ${esc(datos.nombre)}</span>` : ''}<span class="ov-metodo">Use el registro manual si la persona está convocada.</span>`
  }[tipo];
  ov.className = `escaner-overlay is-${tipo} is-open`;
  ov.innerHTML = `<div class="ov-cuerpo">${contenido}<span class="ov-barra" style="animation-duration:${segundos()}s"></span><span class="ov-toque">Toque para continuar</span></div>`;
  if (navigator.vibrate) { try { navigator.vibrate(tipo === 'ok' ? 80 : [60, 60, 60]); } catch { /* opcional */ } }
  overlayTimer = setTimeout(cerrarOverlay, segundos() * 1000);
}

function cerrarOverlay() {
  clearTimeout(overlayTimer);
  const ov = raiz.querySelector('[data-overlay]');
  if (!ov.classList.contains('is-open')) return;
  ov.classList.remove('is-open');
  if (lector && camaraActiva) { try { lector.resume(); } catch { /* ya reanudado */ } }
}

// ───────── Cámara ─────────
async function alLeer(texto) {
  const ahora = Date.now();
  if (texto === ultimoTexto.texto && ahora - ultimoTexto.t < 4000) return;
  if (raiz.querySelector('[data-overlay]').classList.contains('is-open')) return;
  ultimoTexto = { texto, t: ahora };
  if (lector && camaraActiva) { try { lector.pause(true); } catch { /* sin pausa */ } }
  procesarTexto(texto);
}

async function procesarTexto(texto) {
  const v = verificarPase(texto, { sal: estado.indices.sal, prefijo: estado.indices.prefijo, dependenciasValidas: new Set(dependencias().map((d) => String(d.codigo))) });
  if (!v.valido) { mostrarOverlay('rechazo', { motivo: v.motivo, nombre: v.pase?.n }); return; }
  const p = v.pase;
  const persona = personasPorCorreo(p.e).find((x) => !x.nombre || x.nombre === p.n) || null;
  await registrar({ paseId: p.id, personaId: persona?.id || null, nombre: p.n, cargo: p.c, dependencia: String(p.d), correo: p.e || '', metodo: 'QR' });
}

async function iniciarCamara() {
  const zona = raiz.querySelector('[data-camara-estado]');
  if (!window.Html5Qrcode) {
    zona.innerHTML = `<div class="notice notice-danger">${icono('alerta')}<div><strong>El lector de QR no cargó.</strong> Use el registro manual o recargue con conexión.</div></div>`;
    return;
  }
  try {
    if (!lector) lector = new window.Html5Qrcode('lector-qr', { verbose: false });
    zona.innerHTML = `<span class="spinner" aria-hidden="true"></span> Solicitando permiso de cámara…`;
    await lector.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: (w, h) => { const s = Math.floor(Math.min(w, h) * 0.72); return { width: s, height: s }; }, aspectRatio: 1 },
      alLeer,
      () => {}
    );
    camaraActiva = true;
    raiz.querySelector('[data-visor]').classList.add('is-activo');
    zona.innerHTML = `<span class="pulse" aria-hidden="true"></span> Cámara activa: apunte al QR del pase`;
    pintarBotonesCamara();
  } catch (e) {
    console.error(e);
    camaraActiva = false;
    const msg = String(e?.message || e);
    zona.innerHTML = `<div class="notice notice-danger">${icono('camara')}<div><strong>No se pudo abrir la cámara.</strong> ${/permission|NotAllowed/i.test(msg) ? 'Se negó el permiso: actívelo en la configuración del navegador.' : /secure|https/i.test(msg) ? 'La cámara requiere HTTPS (GitHub Pages) o localhost.' : 'Verifique que ninguna otra aplicación la esté usando.'} También puede leer el QR desde una foto o usar el registro manual.</div></div>`;
    pintarBotonesCamara();
  }
}

async function detenerCamara() {
  if (lector && camaraActiva) { try { await lector.stop(); } catch { /* ya detenida */ } }
  camaraActiva = false;
  if (raiz) {
    raiz.querySelector('[data-visor]').classList.remove('is-activo');
    raiz.querySelector('[data-camara-estado]').textContent = 'Cámara detenida.';
    pintarBotonesCamara();
  }
}

function pintarBotonesCamara() {
  const b = raiz.querySelector('[data-camara-toggle]');
  b.innerHTML = camaraActiva ? `${icono('cerrar', 'icon-sm')}Detener cámara` : `${icono('camara', 'icon-sm')}Iniciar cámara`;
  b.classList.toggle('btn-primary', !camaraActiva);
}

async function leerFoto(archivo) {
  if (!window.Html5Qrcode) { toast({ tipo: 'warn', titulo: 'Lector no disponible', mensaje: 'Use el registro manual.' }); return; }
  try {
    const estabaActiva = camaraActiva;
    if (estabaActiva) await detenerCamara();
    const tmp = new window.Html5Qrcode('lector-archivo', { verbose: false });
    const texto = await tmp.scanFile(archivo, false);
    try { tmp.clear(); } catch { /* sin acción */ }
    await procesarTexto(texto);
  } catch (e) {
    console.error(e);
    mostrarOverlay('rechazo', { motivo: 'No se encontró un código QR legible en la foto.' });
  }
}

// ───────── Manual ─────────
function pintarResultadosManual(texto) {
  const cont = raiz.querySelector('[data-resultados-manual]');
  const t = texto.trim();
  if (t.length < 2) { cont.innerHTML = '<p class="muted" style="font-size:.86rem">Escriba al menos dos letras del nombre o del correo.</p>'; return; }
  const lista = buscarPersonas(t, 10);
  cont.innerHTML = lista.length ? `<ul class="manual-lista">${lista.map((p) => {
    const d = dependencia(p.dependencia);
    const nombre = p.nombre || 'Sin nombre en el directorio';
    const ya = buscarDuplicado({ personaId: p.id, nombre, correo: p.correo, dependencia: p.dependencia });
    return `<li class="manual-item">
      <span class="avatar avatar-sm" aria-hidden="true">${esc(iniciales(nombre))}</span>
      <div class="manual-info"><strong>${esc(nombre)}</strong><span>${esc(tituloLegible(p.cargo))}</span>
        <span class="row" style="gap:6px"><span class="badge proc-${esc(d?.tipoProceso || '')}"><span class="proc-dot"></span>${esc(p.dependencia)} · ${esc(d?.sigla || '')}</span>${p.correo ? `<span class="badge">${esc(p.correo)}</span>` : '<span class="badge badge-warn">Sin correo: solo registro manual</span>'}</span></div>
      ${ya ? `<span class="badge badge-warn">Ingresó ${esc(horaCorta(ya.hora))}</span>` : `<button type="button" class="btn btn-primary btn-sm" data-registrar="${esc(p.id)}">Registrar</button>`}
    </li>`;
  }).join('')}</ul>` : `<div class="empty" style="padding:24px 12px"><p>No hay coincidencias en el directorio. Use el formulario de abajo para registrar a la persona.</p></div>`;
}

async function registrarManual(personaId) {
  const p = (estado.datos.directorio?.personas || []).find((x) => x.id === personaId);
  if (!p) return;
  let nombre = p.nombre;
  if (!nombre) {
    nombre = (window.prompt('El directorio no registra el nombre de esta persona. Escríbalo:') || '').trim();
    if (!nombre) return;
  }
  const ok = await registrar({ paseId: null, personaId: p.id, nombre, cargo: tituloLegible(p.cargo), dependencia: String(p.dependencia), correo: p.correo || '', metodo: 'manual' });
  if (ok) pintarResultadosManual(raiz.querySelector('#busqueda-manual').value);
}

// ───────── Contador y lista ─────────
function pintarContador() {
  if (!raiz) return;
  const lista = estado.consolidado.asistencia;
  const n = raiz.querySelector('[data-contador]');
  animarNumero(n, lista.length, 500);
  raiz.querySelector('[data-contador-pie]').textContent = `${new Set(lista.map((a) => a.dependencia)).size} dependencias · ${lista.filter((a) => a.metodo === 'QR').length} con QR · ${lista.filter((a) => a.metodo !== 'QR').length} manuales`;
  const items = dependencias().map((d) => ({ etiqueta: `${d.codigo} · ${d.sigla}`, valor: lista.filter((a) => String(a.dependencia) === String(d.codigo)).length, clase: `proc-${d.tipoProceso}`, proc: true }))
    .filter((i) => i.valor > 0).sort((a, b) => b.valor - a.valor);
  raiz.querySelector('[data-desglose]').innerHTML = items.length ? barrasHorizontales(items) : '<p class="muted mb-0">Aún no hay asistentes registrados.</p>';
  const recientes = [...lista].sort((a, b) => b.hora.localeCompare(a.hora)).slice(0, 6);
  raiz.querySelector('[data-recientes]').innerHTML = recientes.length ? recientes.map((a) => `<li><span class="mono">${esc(horaCorta(a.hora))}</span><span><strong>${esc(a.nombre)}</strong> · ${esc(dependencia(a.dependencia)?.sigla || a.dependencia)}</span><span class="badge ${a.metodo === 'QR' ? 'badge-ok' : ''}">${a.metodo === 'QR' ? 'QR' : 'Manual'}</span></li>`).join('') : '<li class="muted">Sin registros todavía.</li>';
  const sinExportar = lista.length - (estado.consolidado.meta?.asistenciaExportada || 0);
  raiz.querySelector('[data-sin-exportar]').textContent = sinExportar > 0 ? `${sinExportar} ${sinExportar === 1 ? 'registro sin exportar' : 'registros sin exportar'}` : 'Todo exportado';
  raiz.querySelector('[data-aviso-export]').classList.toggle('is-pendiente', sinExportar > 0);
}

async function exportarAsistencia() {
  const lista = [...estado.consolidado.asistencia].sort((a, b) => a.hora.localeCompare(b.hora));
  if (!lista.length) { toast({ tipo: 'warn', titulo: 'Sin registros', mensaje: 'Aún no hay asistencia para exportar.' }); return; }
  try {
    const logo = await obtenerLogo();
    const r = exportarExcel({
      nombreArchivo: `JP2027_Asistencia_${hoyISO()}_${new Date().toTimeString().slice(0, 5).replace(':', '')}.xlsx`,
      logo: logo.bytes,
      hojas: [{
        nombre: 'Asistencia', titulo: 'Lista de asistencia — Jornada de Planeación 2027', subtitulo: `${entero(lista.length)} asistentes registrados en este dispositivo`,
        columnas: [{ titulo: 'Nombre', ancho: 36 }, { titulo: 'Cargo', ancho: 36 }, { titulo: 'Dependencia', ancho: 44 }, { titulo: 'Código de dependencia', ancho: 14 }, { titulo: 'Correo', ancho: 34 }, { titulo: 'Hora de ingreso', ancho: 22 }, { titulo: 'Método de registro', ancho: 16 }],
        filas: lista.map((a) => [a.nombre, a.cargo, nombreDependencia(a.dependencia), a.dependencia, a.correo, new Date(a.hora).toLocaleString('es-CO'), a.metodo === 'QR' ? 'QR' : 'Manual'])
      }]
    });
    descargarBlob(r.blob, r.nombre);
    await ctxApp.almacen.guardarMeta({ asistenciaExportada: lista.length });
    await ctxApp.refrescarConsolidado();
    toast({ tipo: 'ok', titulo: 'Asistencia exportada', mensaje: `${lista.length} registros en ${r.nombre}` });
  } catch (e) { toastError('No se pudo exportar la asistencia', e, e.message); }
}

function montar(panel, ctx) {
  raiz = panel;
  ctxApp = ctx;
  panel.innerHTML = `<div class="container escaner">
    <div class="aviso-export" data-aviso-export role="status">
      ${icono('alerta', 'icon-sm')}
      <span><strong>La asistencia se guarda solo en este dispositivo.</strong> Expórtela a Excel antes de cerrar. <span data-sin-exportar></span></span>
      <button type="button" class="btn btn-sm" data-exportar ${xlsxDisponible() ? '' : 'disabled'}>${icono('excel', 'icon-sm')}Exportar</button>
    </div>

    <div class="escaner-grid">
      <div class="stack">
        <div class="contador-card">
          <span class="eyebrow">${icono('personas', 'icon-sm')}Asistentes registrados</span>
          <span class="contador-n" data-contador data-formato="entero">0</span>
          <span class="contador-pie" data-contador-pie></span>
        </div>

        <div class="segmentado-lg" role="tablist" aria-label="Forma de registro">
          <button type="button" role="tab" id="m-camara" aria-controls="p-camara" aria-selected="true" data-modo="camara">${icono('camara', 'icon-sm')}Cámara</button>
          <button type="button" role="tab" id="m-manual" aria-controls="p-manual" aria-selected="false" tabindex="-1" data-modo="manual">${icono('teclado', 'icon-sm')}Manual</button>
        </div>

        <div class="card escaner-card" id="p-camara" role="tabpanel" aria-labelledby="m-camara">
          <div class="visor" data-visor><div id="lector-qr"></div><span class="visor-marco" aria-hidden="true"></span></div>
          <div id="lector-archivo" hidden></div>
          <p class="camara-estado" data-camara-estado aria-live="polite">La cámara trasera se usa para leer el QR del pase.</p>
          <div class="btn-group escaner-botones">
            <button type="button" class="btn btn-lg btn-primary" data-camara-toggle></button>
            <label class="btn btn-lg">${icono('imagen', 'icon-sm')}Leer desde foto<input type="file" accept="image/*" capture="environment" hidden data-foto></label>
          </div>
        </div>

        <div class="card escaner-card" id="p-manual" role="tabpanel" aria-labelledby="m-manual" hidden>
          <label class="field"><span class="field-label">Buscar en el directorio</span>
            <div class="input-icon">${icono('buscar')}<input class="input" id="busqueda-manual" type="search" placeholder="Nombre o correo" autocomplete="off"></div></label>
          <div data-resultados-manual aria-live="polite" style="margin-top:12px"></div>
          <details class="manual-nuevo">
            <summary>¿No está en el directorio? Registrar manualmente</summary>
            <form class="stack" data-form-nuevo style="margin-top:12px">
              <label class="field"><span class="field-label">Nombre completo</span><input class="input" name="nombre" required></label>
              <label class="field"><span class="field-label">Cargo</span><input class="input" name="cargo"></label>
              <label class="field"><span class="field-label">Dependencia</span><select class="select" name="dependencia" required><option value="">Elija…</option>${dependencias().map((d) => `<option value="${esc(d.codigo)}">${esc(d.codigo)} · ${esc(d.nombre)}</option>`).join('')}</select></label>
              <label class="field"><span class="field-label">Correo (opcional)</span><input class="input" name="correo" type="email"></label>
              <button type="submit" class="btn btn-primary">Registrar asistencia</button>
            </form>
          </details>
        </div>
      </div>

      <div class="stack">
        <div class="card"><h3>Por dependencia</h3><div data-desglose></div></div>
        <div class="card"><h3>Últimos registros</h3><ul class="recientes" data-recientes></ul>
          <hr><button type="button" class="btn btn-sm btn-danger" data-borrar>${icono('basura', 'icon-sm')}Vaciar asistencia de este dispositivo</button></div>
      </div>
    </div>
  </div>
  <div class="escaner-overlay" data-overlay aria-live="assertive" role="status"></div>`;

  pintarBotonesCamara();
  pintarContador();
  activarAnimaciones(panel);

  on(panel, 'click', '[data-camara-toggle]', () => (camaraActiva ? detenerCamara() : iniciarCamara()));
  panel.querySelector('[data-foto]').addEventListener('change', (ev) => { const f = ev.target.files[0]; ev.target.value = ''; if (f) leerFoto(f); });
  panel.querySelector('[data-overlay]').addEventListener('click', cerrarOverlay);
  on(panel, 'click', '[data-exportar]', exportarAsistencia);
  on(panel, 'click', '[data-registrar]', (ev, b) => registrarManual(b.dataset.registrar));
  on(panel, 'click', '[data-borrar]', async () => {
    const sinExportar = estado.consolidado.asistencia.length - (estado.consolidado.meta?.asistenciaExportada || 0);
    const ok = await confirmar({ titulo: 'Vaciar la asistencia', mensaje: sinExportar > 0 ? `Hay ${sinExportar} registros sin exportar que se perderán. ¿Vaciar de todas formas?` : 'Se borrará la lista de este dispositivo (ya fue exportada).', aceptar: 'Vaciar', peligro: true });
    if (!ok) return;
    try { await ctx.almacen.reemplazarAsistencia([]); await ctx.almacen.guardarMeta({ asistenciaExportada: 0 }); await ctx.refrescarConsolidado(); toast({ tipo: 'ok', titulo: 'Asistencia vaciada', mensaje: 'El dispositivo quedó listo para una nueva jornada.' }); } catch (e) { toastError('No se pudo vaciar', e, e.message); }
  });
  const busq = panel.querySelector('#busqueda-manual');
  let t = null;
  busq.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => pintarResultadosManual(busq.value), 160); });
  panel.querySelector('[data-form-nuevo]').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const f = new FormData(ev.target);
    const nombre = String(f.get('nombre') || '').trim();
    const dep = String(f.get('dependencia') || '');
    if (!nombre || !dep) { toast({ tipo: 'warn', titulo: 'Faltan datos', mensaje: 'Nombre y dependencia son obligatorios.' }); return; }
    const ok = await registrar({ paseId: null, personaId: null, nombre, cargo: String(f.get('cargo') || '').trim(), dependencia: dep, correo: String(f.get('correo') || '').trim().toLowerCase(), metodo: 'manual', noVerificado: true });
    if (ok) ev.target.reset();
  });
  on(panel, 'click', '[data-modo]', (ev, b) => cambiarModo(b.dataset.modo));
  panel.querySelector('.segmentado-lg').addEventListener('keydown', (ev) => {
    if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
    ev.preventDefault();
    cambiarModo(modo === 'camara' ? 'manual' : 'camara');
    panel.querySelector(`[data-modo="${modo}"]`).focus();
  });
  alEvento('consolidado', pintarContador);
  if (!window.Html5Qrcode) {
    panel.querySelector('[data-camara-estado]').innerHTML = 'El lector de QR aún no carga. Si no aparece en unos segundos, use el registro manual.';
    alEvento('librerias', () => { if (!window.Html5Qrcode) cambiarModo('manual'); });
  }
}

function cambiarModo(nuevo) {
  modo = nuevo;
  raiz.querySelectorAll('[data-modo]').forEach((b) => {
    const activo = b.dataset.modo === nuevo;
    b.setAttribute('aria-selected', String(activo));
    b.tabIndex = activo ? 0 : -1;
  });
  raiz.querySelector('#p-camara').hidden = nuevo !== 'camara';
  raiz.querySelector('#p-manual').hidden = nuevo !== 'manual';
  if (nuevo === 'manual') { detenerCamara(); setTimeout(() => raiz.querySelector('#busqueda-manual').focus(), 50); }
}

const vistaEscaner = {
  id: 'escaner',
  titulo: 'Modo escáner',
  icono: 'escaner',
  montar,
  alMostrar() { pintarContador(); },
  alOcultar() { detenerCamara(); cerrarOverlay(); }
};

Object.assign(__m["src/tabs/escaner.js"], { vistaEscaner });
})();

// ── src/app.js ──
__m["src/app.js"] = {};
(function () {
/*
 * app.js — Arranque, enrutamiento de pestañas y estado global de la aplicación.
 *  1. Carga los datos de /data (con respaldo empaquetado en file://).
 *  2. Lee el consolidado guardado (formulaciones, pases, asistencia) desde el almacén configurado.
 *  3. Construye la navegación (pestañas según FEATURES), la franja de progreso y el enrutador por hash.
 * El estado compartido vive en estado.js; aquí solo se orquesta.
 */
const { FEATURES, PERSISTENCIA } = __m["src/config.js"];
const { almacen } = __m["src/storage.js"];
const { estado, fijarDatos, fijarConsolidado, on, emitir, dependencias } = __m["src/estado.js"];
const { cargarDatos, cargarDesdeArchivos } = __m["src/lib/datos.js"];
const { esperarLibrerias, avisarLibreriasFaltantes } = __m["src/lib/libs.js"];
const { descargarTexto, obtenerLogo } = __m["src/lib/export.js"];
const { crearPestanas } = __m["src/ui/tabs.js"];
const { toast, toastError } = __m["src/ui/toast.js"];
const { confirmar } = __m["src/ui/modal.js"];
const { skeletonPestana } = __m["src/ui/skeleton.js"];
const { icono } = __m["src/ui/iconos.js"];
const { esc, qs } = __m["src/ui/dom.js"];
const { entero } = __m["src/lib/formato.js"];
const { fechaCorta } = __m["src/lib/fechas.js"];
const { activarAnimaciones } = __m["src/ui/cards.js"];
const { pestanaAgenda } = __m["src/tabs/agenda.js"];
const { pestanaFormulacion } = __m["src/tabs/formulacion.js"];
const { pestanaMetas } = __m["src/tabs/metas.js"];
const { pestanaNecesidades } = __m["src/tabs/necesidades.js"];
const { pestanaAdquisiciones } = __m["src/tabs/adquisiciones.js"];
const { pestanaRiesgos } = __m["src/tabs/riesgos.js"];
const { vistaEscaner } = __m["src/tabs/escaner.js"];

// Registro de pestañas. El mapa de riesgos solo entra si la bandera está encendida.
const PESTANAS = [pestanaAgenda, pestanaFormulacion, pestanaMetas, pestanaNecesidades, pestanaAdquisiciones]
  .concat(FEATURES.mapaRiesgos ? [pestanaRiesgos] : []);
const VISTAS = [...PESTANAS, vistaEscaner];
const montadas = new Set();
let actual = null;
let navegacion = null;

const ctx = {
  almacen,
  ir: (id) => { if (location.hash !== `#${id}`) location.hash = id; else mostrar(id); },
  async refrescarConsolidado() {
    try { fijarConsolidado(await almacen.leerConsolidado()); } catch (e) { toastError('No se pudo leer la información guardada', e); }
  },
  pestanasActivas: PESTANAS.map((p) => p.id),
  riesgosActivo: FEATURES.mapaRiesgos
};

// ───────── Tema claro / oscuro ─────────
function pintarBotonTema() {
  const b = qs('#btn-tema');
  const oscuro = document.documentElement.getAttribute('data-theme') === 'dark';
  b.innerHTML = icono(oscuro ? 'sol' : 'luna', 'icon-sm');
  b.setAttribute('aria-label', oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
  b.setAttribute('aria-pressed', String(oscuro));
}
function iniciarTema() {
  pintarBotonTema();
  qs('#btn-tema').addEventListener('click', () => {
    const nuevo = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nuevo);
    try { localStorage.setItem('etitc-jp27:tema', nuevo); } catch { /* preferencia no crítica */ }
    pintarBotonTema();
    emitir('tema', nuevo);
  });
}

// ───────── Franja de progreso institucional ─────────
function pintarFranja() {
  const franja = qs('#franja-progreso');
  const total = dependencias().length || 1;
  const { formulaciones, pases } = estado.consolidado;
  const cargadas = new Set(formulaciones.map((f) => f.dependencia)).size;
  const validadas = new Set(formulaciones.filter((f) => f.estado === 'validada').map((f) => f.dependencia)).size;
  const depsConPase = new Set(pases.map((p) => String(p.d))).size;
  const pct = (n) => `${Math.min(100, Math.round((n / total) * 100))}%`;
  if (!franja.dataset.listo) {
    franja.innerHTML = `<div class="container progress-inner">
      <div class="pmeter"><div class="pmeter-head"><span class="pmeter-label">Formulación cargada</span><span class="pmeter-value" data-m="cargadas"></span></div><div class="pbar deep"><span data-b="cargadas"></span></div></div>
      <div class="pmeter"><div class="pmeter-head"><span class="pmeter-label">Formulación validada</span><span class="pmeter-value" data-m="validadas"></span></div><div class="pbar"><span data-b="validadas"></span></div></div>
      <div class="pmeter"><div class="pmeter-head"><span class="pmeter-label">Pases emitidos</span><span class="pmeter-value" data-m="pases"></span></div><div class="pbar gold"><span data-b="pases"></span></div></div>
      <div class="progress-actions">
        <button type="button" class="btn btn-sm" data-accion="respaldo" title="Descarga todo lo guardado en este navegador">${icono('guardar', 'icon-sm')}Exportar respaldo</button>
        <button type="button" class="btn btn-sm btn-ghost" data-accion="importar" title="Combina un respaldo .json con lo guardado">${icono('subir', 'icon-sm')}Importar</button>
        <input type="file" accept=".json,application/json" hidden data-importar>
      </div>
    </div>`;
    franja.dataset.listo = '1';
    franja.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-accion]');
      if (!b) return;
      if (b.dataset.accion === 'respaldo') exportarRespaldo();
      if (b.dataset.accion === 'importar') franja.querySelector('[data-importar]').click();
    });
    franja.querySelector('[data-importar]').addEventListener('change', async (ev) => {
      const f = ev.target.files[0];
      ev.target.value = '';
      if (!f) return;
      try {
        await almacen.importarRespaldo(JSON.parse(await f.text()));
        await ctx.refrescarConsolidado();
        toast({ tipo: 'ok', titulo: 'Respaldo importado', mensaje: 'Se combinó con la información de este navegador.' });
      } catch (e) { toastError('No se pudo importar el respaldo', e, e.message); }
    });
  }
  const fijar = (k, n, extra) => {
    franja.querySelector(`[data-m="${k}"]`).innerHTML = `${entero(n)}<small> / ${total}${extra || ''}</small>`;
    franja.querySelector(`[data-b="${k}"]`).style.width = pct(k === 'pases' ? depsConPase : n);
  };
  fijar('cargadas', cargadas);
  fijar('validadas', validadas);
  franja.querySelector('[data-m="pases"]').innerHTML = `${entero(pases.length)}<small> · ${depsConPase}/${total}<span class="solo-ancho"> dependencias</span></small>`;
  franja.querySelector('[data-b="pases"]').style.width = pct(depsConPase);
  franja.querySelector('[data-b="cargadas"]').parentElement.setAttribute('aria-label', `${cargadas} de ${total} dependencias con formulación cargada`);
}

async function exportarRespaldo() {
  try {
    const r = await almacen.exportarRespaldo();
    descargarTexto(JSON.stringify(r, null, 2), `JP2027_respaldo_${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json`, 'application/json');
    await almacen.guardarMeta({ ultimoRespaldo: new Date().toISOString() });
    toast({ tipo: 'ok', titulo: 'Respaldo descargado', mensaje: 'Guárdelo en la carpeta compartida de la OAPDI.' });
  } catch (e) { toastError('No se pudo exportar el respaldo', e); }
}

// ───────── Enrutamiento ─────────
function idDesdeHash() {
  const h = decodeURIComponent(location.hash.replace('#', '')).split('/')[0];
  return VISTAS.some((v) => v.id === h) ? h : PESTANAS[0].id;
}

async function mostrar(id) {
  const vista = VISTAS.find((v) => v.id === id) || PESTANAS[0];
  if (actual === vista.id) return;
  const main = qs('#contenido');
  const anterior = actual ? qs(`#panel-${actual}`) : null;
  actual = vista.id;
  navegacion.marcar(vista.id);
  qs('#btn-escaner').classList.toggle('is-active', vista.id === 'escaner');
  qs('#btn-escaner').setAttribute('aria-current', vista.id === 'escaner' ? 'page' : 'false');
  document.body.classList.toggle('modo-escaner', vista.id === 'escaner');
  window.dispatchEvent(new Event('resize'));

  if (anterior) {
    const v = VISTAS.find((x) => `panel-${x.id}` === anterior.id);
    if (v && v.alOcultar) { try { v.alOcultar(); } catch (e) { console.error(e); } }
    anterior.classList.remove('panel-enter');
    anterior.hidden = true;
  }
  let panel = qs(`#panel-${vista.id}`);
  if (!panel) {
    panel = document.createElement('section');
    panel.id = `panel-${vista.id}`;
    panel.className = 'tab-panel';
    if (vista.id === 'escaner') panel.setAttribute('aria-label', 'Modo escáner');
    else { panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', `tab-${vista.id}`); panel.tabIndex = -1; }
    main.appendChild(panel);
  }
  panel.hidden = false;
  if (!montadas.has(vista.id)) {
    panel.innerHTML = skeletonPestana();
    try {
      await vista.montar(panel, ctx);
      montadas.add(vista.id);
    } catch (e) {
      console.error(e);
      panel.innerHTML = `<div class="container" style="padding:32px 0"><div class="notice notice-danger">${icono('alerta')}<div><strong>Esta sección no pudo cargarse.</strong><br>${esc(e.message || 'Error inesperado')}. Las demás pestañas siguen funcionando; recargue para intentarlo de nuevo.</div></div></div>`;
    }
  } else if (vista.alMostrar) {
    try { vista.alMostrar(); } catch (e) { console.error(e); }
  }
  activarAnimaciones(panel);
  panel.classList.remove('panel-enter');
  void panel.offsetWidth;
  panel.classList.add('panel-enter');
  document.title = `${vista.titulo} — Jornada de Planeación 2027`;
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

// ───────── Avisos de entorno ─────────
function avisosEntorno(origen, fechaEmpaquetado) {
  const empaquetados = Object.entries(origen).filter(([, o]) => o === 'empaquetado').map(([k]) => k);
  if (empaquetados.length) {
    toast({
      tipo: 'info',
      titulo: 'Abierto desde el disco',
      mensaje: `El navegador no permite leer /data con doble clic; se usa la copia empaquetada${fechaEmpaquetado ? ` del ${fechaCorta(fechaEmpaquetado.slice(0, 10))}` : ''}. Si actualizó los JSON, use «Cargar carpeta data» en el pie de página o sirva el sitio por HTTP.`,
      duracion: 11000
    });
    const pie = qs('#pie-datos');
    pie.innerHTML = `<button type="button" class="btn btn-sm btn-ghost">${icono('carpeta', 'icon-sm')}Cargar carpeta data</button><input type="file" webkitdirectory multiple hidden accept=".json">`;
    const input = pie.querySelector('input');
    pie.querySelector('button').addEventListener('click', () => input.click());
    input.addEventListener('change', async () => {
      try {
        const { datos, leidos } = await cargarDesdeArchivos(input.files, estado.datos);
        if (!leidos.length) { toast({ tipo: 'warn', titulo: 'No se encontraron archivos de datos', mensaje: 'Elija la carpeta data del proyecto.' }); return; }
        fijarDatos(datos, estado.origenDatos);
        toast({ tipo: 'ok', titulo: 'Datos actualizados', mensaje: `Se leyeron ${leidos.length} archivos. Recargando las pestañas…` });
        setTimeout(() => location.reload(), 900);
      } catch (e) { toastError('No se pudieron leer los archivos', e, e.message); }
    });
  }
  if (PERSISTENCIA.modo === 'local' && !almacen.persistente) {
    toast({ tipo: 'warn', titulo: 'Sin almacenamiento local', mensaje: 'Este navegador no permite guardar datos (modo privado). Exporte la información antes de cerrar.', duracion: 12000 });
  }
}

function errorFatal(e) {
  console.error(e);
  qs('#contenido').innerHTML = `<div class="container" style="padding:40px 0">
    <div class="empty">
      <div class="empty-art">${icono('alerta')}</div>
      <h2>No fue posible cargar los datos de la jornada</h2>
      <p>${esc(e.message || 'Error inesperado')}</p>
      <p class="muted">Si abrió el archivo con doble clic, verifique que existan <span class="mono">data/datos.bundle.js</span> y <span class="mono">dist/app.bundle.js</span>, o sirva la carpeta por HTTP (ver README).</p>
      <div class="btn-group" style="margin-top:8px"><button type="button" class="btn btn-primary" onclick="location.reload()">${icono('refrescar', 'icon-sm')}Reintentar</button></div>
    </div></div>`;
}

// ───────── Arranque ─────────
async function iniciar() {
  if (window.__ETITC_ARRANCADO__) return;
  window.__ETITC_ARRANCADO__ = true;

  window.addEventListener('error', (ev) => { if (ev.error) toastError('Ocurrió un error inesperado', ev.error); });
  window.addEventListener('unhandledrejection', (ev) => toastError('Una operación no terminó bien', ev.reason));

  iniciarTema();
  // Altura real de la barra superior (cambia con el ancho): la usan los elementos fijos al desplazar
  const medirBarra = () => document.documentElement.style.setProperty('--alto-barra', `${qs('.topbar').offsetHeight}px`);
  medirBarra();
  window.addEventListener('resize', medirBarra);
  navegacion = crearPestanas(qs('#pestanas'), PESTANAS, (id) => ctx.ir(id));

  let carga;
  try { carga = await cargarDatos(); } catch (e) { errorFatal(e); return; }
  fijarDatos(carga.datos, carga.origen);
  carga.problemas.forEach((p) => toast({ tipo: 'warn', titulo: `No se leyó ${p.ruta}`, mensaje: 'Esa sección se mostrará vacía. Revise que el archivo exista y sea JSON válido.' }));

  // En file:// el logo de la barra se sirve desde la copia empaquetada para que las capturas no se bloqueen
  obtenerLogo().catch(() => null);

  try { fijarConsolidado(await almacen.leerConsolidado()); } catch (e) { toastError('No se pudo leer la información guardada', e, e.message); }
  on('consolidado', pintarFranja);
  on('datos', pintarFranja);
  pintarFranja();

  qs('#contenido').innerHTML = '';
  window.addEventListener('hashchange', () => mostrar(idDesdeHash()));
  await mostrar(idDesdeHash());
  avisosEntorno(carga.origen, carga.fechaEmpaquetado);

  await esperarLibrerias();
  avisarLibreriasFaltantes();
  emitir('librerias');

  // Advertencia al cerrar si hay asistencia sin exportar
  window.addEventListener('beforeunload', (ev) => {
    const { asistencia, meta } = estado.consolidado;
    if (asistencia.length > (meta?.asistenciaExportada || 0)) { ev.preventDefault(); ev.returnValue = ''; }
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
else iniciar();

Object.assign(__m["src/app.js"], {  });
})();
})();
