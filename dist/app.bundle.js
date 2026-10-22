/*
 * app.bundle.js — ARCHIVO GENERADO por tools/empaquetar.mjs el 2026-10-22T18:35:02.774Z. No editar a mano.
 * Contiene los 32 módulos de src/ como un script clásico para abrir la app con doble clic (file://).
 * Servida por HTTP, la aplicación usa directamente los módulos ES6 de src/ y este archivo no se carga.
 */
(function () {
'use strict';
var __m = {};
// ── src/config.js ──
__m["src/config.js"] = {};
(function () {
/*
 * config.js — Banderas de funcionalidad, rutas de datos y paleta.
 * La conexión con Microsoft 365 (SharePoint, lista de registro y correo) se configura en data/config.json → microsoft,
 * para que TIC pueda activarla sin tocar el código.
 */

// Banderas de funcionalidad. Con mapaRiesgos en true aparece la pestaña del mapa de riesgos.
const FEATURES = { mapaRiesgos: false };

// Prefijo de las claves de localStorage (respaldo de sesión en este navegador).
const PREFIJO_LOCAL = 'etitc-jp27';

// Archivos de datos que se cargan al inicio (todos en /data).
const ARCHIVOS_DATOS = {
  config: 'data/config.json',
  directorio: 'data/directorio.json',
  dependencias: 'data/dependencias.json',
  areas: 'data/areas.json',
  agenda: 'data/agenda.json',
  modalidades: 'data/modalidades.json',
  contratacion: 'data/contratacion.json',
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

Object.assign(__m["src/config.js"], { FEATURES, PREFIJO_LOCAL, ARCHIVOS_DATOS, PALETA, TIPOS_PROCESO, TIPOS_PROCESO_PLURAL });
})();

// ── src/storage.js ──
__m["src/storage.js"] = {};
(function () {
/*
 * storage.js — Respaldo de sesión en este navegador (localStorage).
 * Guarda los registros de cargue, los pases emitidos y la asistencia del escáner. Con el conector
 * Microsoft 365 activo, la fuente oficial es SharePoint (lista de registro) y esto es solo un espejo local;
 * sin conector, es el único registro del dispositivo y por eso la interfaz pide exportarlo.
 * Interfaz: guardarRegistro, guardarPase, guardarAsistencia, leerConsolidado, guardarMeta,
 *           reemplazarAsistencia, exportarRespaldo, importarRespaldo, borrarTodo.
 */
const { PREFIJO_LOCAL } = __m["src/config.js"];

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

const almacen = crearLocal();

Object.assign(__m["src/storage.js"], { almacen });
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

// «18, 19 y 20 de noviembre de 2026» a partir de una lista de fechas ISO (mismo mes) o un rango en otro caso.
function rangoFechasTexto(fechasISO) {
  const f = (fechasISO || []).filter(Boolean).sort();
  if (!f.length) return '';
  if (f.length === 1) return fechaLarga(f[0], { conDia: false });
  const mismoMes = f.every((x) => x.slice(0, 7) === f[0].slice(0, 7));
  if (!mismoMes) return `${fechaLarga(f[0], { conDia: false })} al ${fechaLarga(f[f.length - 1], { conDia: false })}`;
  const dias = f.map((x) => Number(x.slice(8)));
  const d = deISO(f[0]);
  return `${dias.slice(0, -1).join(', ')} y ${dias[dias.length - 1]} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

Object.assign(__m["src/lib/fechas.js"], { deISO, aISO, hoyISO, sumarDias, diferenciaDias, fechaLarga, fechaCorta, nombreMes, horaAMinutos, horaLegible, trimestreDe, leerTrimestre, leerFechaExcel, serieExcel, crearCalendario, caminoContratacion, rangoFechasTexto });
})();

// ── src/lib/similitud.js ──
__m["src/lib/similitud.js"] = {};
(function () {
/*
 * similitud.js — Similitud de Dice sobre bigramas de caracteres: 1 = textos idénticos, 0 = nada en común.
 * Se usa para reconocer nombres de acción escritos con pequeñas diferencias y para sugerir el área funcional.
 */
const { normalizar } = __m["src/lib/formato.js"];

function similitud(a, b) {
  const x = normalizar(a).replace(/\s+/g, ' ');
  const y = normalizar(b).replace(/\s+/g, ' ');
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.length < 2 || y.length < 2) return 0;
  const bigramas = (s) => { const m = new Map(); for (let i = 0; i < s.length - 1; i += 1) { const g = s.slice(i, i + 2); m.set(g, (m.get(g) || 0) + 1); } return m; };
  const bx = bigramas(x); const by = bigramas(y);
  let inter = 0;
  bx.forEach((n, g) => { inter += Math.min(n, by.get(g) || 0); });
  return (2 * inter) / (x.length - 1 + y.length - 1);
}

Object.assign(__m["src/lib/similitud.js"], { similitud });
})();

// ── src/estado.js ──
__m["src/estado.js"] = {};
(function () {
/*
 * estado.js — Estado global de la aplicación y bus de eventos.
 * app.js lo inicializa; las pestañas lo leen y se suscriben a cambios ('consolidado', 'datos', 'tema', 'sesion').
 */
const { normalizar } = __m["src/lib/formato.js"];
const { crearCalendario } = __m["src/lib/fechas.js"];
const { similitud } = __m["src/lib/similitud.js"];

const estado = {
  datos: null,
  origenDatos: {},
  consolidado: { registros: [], pases: [], asistencia: [], meta: {} },
  // Identificación compartida por las pestañas de cargue (se conserva en sessionStorage)
  identificacion: null,
  microsoft: { activo: false, cuenta: null, perfil: null },
  indices: { dependencias: new Map(), areas: new Map(), personasPorCorreo: new Map(), calendario: null, sal: '', prefijo: 'JP27' }
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
  estado.origenDatos = { ...estado.origenDatos, ...origen };
  estado.indices.dependencias = new Map((datos.dependencias?.dependencias || []).map((d) => [String(d.codigo), d]));
  estado.indices.areas = new Map((datos.areas?.areas || []).map((a) => [a.id, a]));
  indexarDirectorio(datos.directorio);
  estado.indices.calendario = crearCalendario(datos.festivos?.festivos || []);
  estado.indices.sal = datos.config?.pase?.salFirma || 'ETITC-JP27';
  estado.indices.prefijo = datos.config?.pase?.prefijo || 'JP27';
  emitir('datos', datos);
}

function indexarDirectorio(directorio) {
  const porCorreo = new Map();
  (directorio?.personas || []).forEach((p) => {
    if (!p.correo) return;
    const c = p.correo.trim().toLowerCase();
    if (!porCorreo.has(c)) porCorreo.set(c, []);
    porCorreo.get(c).push(p);
  });
  estado.indices.personasPorCorreo = porCorreo;
}

function fijarConsolidado(c) {
  estado.consolidado = { registros: [], pases: [], asistencia: [], meta: {}, ...c };
  emitir('consolidado', estado.consolidado);
}

function dependencia(codigo) { return estado.indices.dependencias.get(String(codigo)) || null; }
function nombreDependencia(codigo) { const d = dependencia(codigo); return d ? d.nombre : `Dependencia ${codigo}`; }
function dependencias() { return estado.datos?.dependencias?.dependencias || []; }
function area(id) { return estado.indices.areas.get(id) || null; }
function areas() { return estado.datos?.areas?.areas || []; }
function personasPorCorreo(correo) { return estado.indices.personasPorCorreo.get(String(correo || '').trim().toLowerCase()) || []; }

// Búsqueda por nombre o correo, sin tildes.
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

// Sugiere el área funcional de una persona: dentro de su dependencia, la de nombre más parecido a su grupo o cargo.
function sugerirArea(persona) {
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
function registroVigente(tipo, areaId) {
  return [...estado.consolidado.registros].filter((r) => r.tipo === tipo && r.area?.id === areaId)
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))[0] || null;
}

function umbral(nombre, defecto) { return estado.datos?.config?.umbrales?.[nombre] ?? defecto; }

Object.assign(__m["src/estado.js"], { on, emitir, fijarDatos, indexarDirectorio, fijarConsolidado, dependencia, nombreDependencia, dependencias, area, areas, personasPorCorreo, buscarPersonas, sugerirArea, registroVigente, umbral, estado });
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
  xlsx: { nombre: 'SheetJS (Excel)', presente: () => Boolean(window.XLSX && window.XLSX.utils), afecta: 'validación de las plantillas cargadas y exportación a Excel' },
  qrcode: { nombre: 'qrcode', presente: () => Boolean(window.QRCode && window.QRCode.toDataURL), afecta: 'generación del QR del pase' },
  escaner: { nombre: 'html5-qrcode', presente: () => Boolean(window.Html5Qrcode), afecta: 'lectura de QR con cámara (queda el registro manual)' },
  jspdf: { nombre: 'jsPDF', presente: () => Boolean(window.jspdf && window.jspdf.jsPDF), afecta: 'descarga del cronograma y del pase en PDF' },
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
const { fechaLarga, fechaCorta, rangoFechasTexto } = __m["src/lib/fechas.js"];

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

// ───────── Cronograma en PDF (texto nativo, nítido y liviano) ─────────
const TIPO_BLOQUE = { sesion: 'Sesión', taller: 'Taller', receso: 'Receso', llegada: 'Llegada' };

async function cronogramaAPdf({ agenda, evento, nombre = 'Cronograma_Jornada_Planeacion_2027.pdf' }) {
  if (!pdfDisponible()) throw new Error('La librería jsPDF no cargó: no es posible generar el PDF.');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const logo = await obtenerLogo();
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 15;
  const verde9 = [11, 77, 59]; const verde7 = [24, 139, 88]; const lima = [138, 208, 88]; const tinta = [19, 51, 42];
  const gris = [88, 112, 104]; const linea = [215, 228, 220]; const suave = [238, 244, 239];
  const dias = agenda.dias || [];
  const rangoFechas = rangoFechasTexto(dias.map((d) => d.fecha));
  let y = M;
  let pagina = 1;

  const encabezado = () => {
    doc.setFillColor(...verde9); doc.rect(0, 0, W, 34, 'F');
    doc.setFillColor(...lima); doc.rect(0, 34, W, 1.2, 'F');
    if (logo.dataUrl) { doc.setFillColor(255, 255, 255); doc.roundedRect(M, 6, 30, 22, 3, 3, 'F'); doc.addImage(logo.dataUrl, 'PNG', M + 1.5, 7.2, 27, 27 * (383 / 522)); }
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
    doc.text(agenda.titulo || evento.nombre, M + 36, 14);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(230, 244, 236);
    doc.text(agenda.lema || '', M + 36, 20);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...lima);
    doc.text(`${rangoFechas}${agenda.sede && agenda.sede !== 'Por confirmar' ? ` · ${agenda.sede}` : ''}`, M + 36, 26.5);
    y = 44;
  };
  const pie = () => {
    doc.setFontSize(7.5); doc.setTextColor(...gris); doc.setFont('helvetica', 'normal');
    doc.text(`${evento.oficina} · ${evento.institucion}`, M, H - 8);
    doc.text(`${agenda.nota || ''}`, M, H - 4.5);
    doc.text(`Página ${pagina}`, W - M, H - 8, { align: 'right' });
  };
  const saltoSi = (alto) => { if (y + alto > H - 16) { pie(); doc.addPage(); pagina += 1; encabezado(); } };

  encabezado();
  dias.forEach((dia) => {
    saltoSi(30);
    doc.setFillColor(...suave); doc.roundedRect(M, y, W - 2 * M, 14, 2.5, 2.5, 'F');
    doc.setFillColor(...verde7); doc.roundedRect(M, y, 26, 14, 2.5, 2.5, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text(`Día ${dia.numero}`, M + 13, y + 6.2, { align: 'center' });
    doc.setFontSize(7.5); doc.text(fechaLarga(dia.fecha, { conDia: false }).replace(/ de \d{4}$/, ''), M + 13, y + 10.8, { align: 'center' });
    doc.setTextColor(...tinta); doc.setFontSize(12.5); doc.text(dia.titulo, M + 31, y + 6.4);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...gris);
    doc.text(fechaLarga(dia.fecha), M + 31, y + 11);
    y += 18;
    (dia.bloques || []).forEach((b) => {
      const receso = b.tipo === 'receso' || b.tipo === 'llegada';
      const ancho = W - 2 * M - 64;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(receso ? 9 : 10);
      const titulo = doc.splitTextToSize(b.titulo, ancho);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.3);
      const detalle = !receso && b.detalle && b.detalle !== b.titulo ? doc.splitTextToSize(b.detalle, ancho) : [];
      const alto = Math.max(9, 3 + titulo.length * 4.3 + detalle.length * 3.7 + 2.5);
      saltoSi(alto + 2);
      if (receso) { doc.setFillColor(248, 250, 248); doc.rect(M, y - 1, W - 2 * M, alto, 'F'); }
      doc.setFillColor(...(receso ? linea : b.tipo === 'taller' ? lima : verde7)); doc.rect(M, y - 1, 1.3, alto, 'F');
      doc.setTextColor(...tinta); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
      doc.text(`${b.inicio}–${b.fin}`, M + 4, y + 3.4);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...gris);
      doc.text((TIPO_BLOQUE[b.tipo] || '').toUpperCase(), M + 4, y + 7);
      doc.setTextColor(...(receso ? gris : tinta)); doc.setFont('helvetica', 'bold'); doc.setFontSize(receso ? 9 : 10);
      doc.text(titulo, M + 30, y + 3.4);
      if (detalle.length) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8.3); doc.setTextColor(61, 89, 80); doc.text(detalle, M + 30, y + 3.4 + titulo.length * 4.3); }
      if (!receso) {
        doc.setFontSize(7.8); doc.setTextColor(...gris); doc.setFont('helvetica', 'bold');
        const resp = doc.splitTextToSize(b.responsable || '', 32);
        doc.text(resp, W - M - 32, y + 3.4);
        if (b.apoyo) { doc.setFont('helvetica', 'normal'); doc.text(doc.splitTextToSize(`OAP: ${b.apoyo}`, 32), W - M - 32, y + 3.4 + resp.length * 3.4); }
      }
      y += alto + 1.5;
      doc.setDrawColor(...linea); doc.line(M + 30, y - 1, W - M, y - 1);
    });
    if (dia.resultado) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
      const lineas = doc.splitTextToSize(`Resultado del día: ${dia.resultado}`, W - 2 * M - 8);
      saltoSi(lineas.length * 4 + 6);
      doc.setFillColor(230, 245, 236); doc.roundedRect(M, y, W - 2 * M, lineas.length * 4 + 4, 2, 2, 'F');
      doc.setTextColor(...verde9); doc.text(lineas, M + 4, y + 5);
      y += lineas.length * 4 + 8;
    }
    y += 4;
  });

  // Ruta de planeación (antes, durante, después)
  const ruta = agenda.ruta;
  if (ruta && ruta.fases && ruta.fases.length) {
    saltoSi(40);
    doc.setTextColor(...tinta); doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
    doc.text(ruta.titulo || 'Ruta de planeación', M, y + 4); y += 10;
    ruta.fases.forEach((fase) => {
      saltoSi(14);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...verde7);
      doc.text(fase.titulo.toUpperCase(), M, y + 3); y += 6;
      fase.hitos.forEach((h) => {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.8);
        const act = doc.splitTextToSize(h.actividad, W - 2 * M - 80);
        saltoSi(act.length * 4 + 3);
        doc.setTextColor(...tinta); doc.text(act, M + 4, y + 3);
        doc.setFont('helvetica', 'bold');
        const fechaTxt = h.desde === h.hasta ? fechaCorta(h.hasta) : `${fechaCorta(h.desde).replace(/ \d{4}$/, '')} – ${fechaCorta(h.hasta)}`;
        doc.text(fechaTxt, W - M - 72, y + 3);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(...gris);
        doc.text(doc.splitTextToSize(h.responsable, 38), W - M - 38, y + 3);
        y += act.length * 4 + 2.5;
        doc.setDrawColor(...linea); doc.line(M + 4, y - 0.5, W - M, y - 0.5);
      });
      y += 3;
    });
    if (ruta.resultado) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.8); doc.setTextColor(...verde9);
      saltoSi(8); doc.text(`Resultado: ${ruta.resultado}`, M, y + 4);
    }
  }
  pie();
  doc.setProperties({ title: `Cronograma — ${agenda.titulo || evento.nombre}`, author: `ETITC — ${evento.oficina}` });
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

function generarICS({ agenda, evento }) {
  const ahora = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const hora = (h) => `${h.replace(':', '')}00`;
  const lineas = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ETITC//Jornada de Planeacion Institucional 2027//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${escIcs(agenda.titulo || evento.nombre)}`, 'X-WR-TIMEZONE:America/Bogota',
    'BEGIN:VTIMEZONE', 'TZID:America/Bogota', 'BEGIN:STANDARD', 'DTSTART:19700101T000000', 'TZOFFSETFROM:-0500', 'TZOFFSETTO:-0500', 'TZNAME:COT', 'END:STANDARD', 'END:VTIMEZONE'
  ];
  (agenda.dias || []).forEach((dia) => {
    const f = dia.fecha.replace(/-/g, '');
    (dia.bloques || []).filter((b) => b.tipo !== 'receso').forEach((b) => {
      const desc = [`Día ${dia.numero}: ${dia.titulo}`, b.detalle, b.responsable ? `Responsable: ${b.responsable}` : '', b.apoyo ? `Acompañamiento de la OAP: ${b.apoyo}` : '', agenda.nota || ''].filter(Boolean).join('\n');
      lineas.push(
        'BEGIN:VEVENT',
        `UID:${b.id}-${f}@jornada-planeacion-2027.etitc`,
        `DTSTAMP:${ahora}`,
        `DTSTART;TZID=America/Bogota:${f}T${hora(b.inicio)}`,
        `DTEND;TZID=America/Bogota:${f}T${hora(b.fin)}`,
        `SUMMARY:${escIcs(`JP2027 · ${b.titulo}`)}`,
        `LOCATION:${escIcs(agenda.sede || '')}`,
        `DESCRIPTION:${escIcs(desc)}`,
        `CATEGORIES:${escIcs(dia.titulo)}`,
        'STATUS:CONFIRMED', 'TRANSP:OPAQUE',
        'BEGIN:VALARM', 'TRIGGER:-PT10M', 'ACTION:DISPLAY', `DESCRIPTION:${escIcs(b.titulo)}`, 'END:VALARM',
        'END:VEVENT'
      );
    });
  });
  lineas.push('END:VCALENDAR');
  return lineas.map(plegar).join('\r\n') + '\r\n';
}

Object.assign(__m["src/lib/export.js"], { descargarBlob, descargarTexto, copiarTexto, obtenerLogo, pdfDisponible, capturaDisponible, capturarElemento, elementoAPng, elementoAPdf, cronogramaAPdf, generarICS });
})();

// ── src/lib/microsoft.js ──
__m["src/lib/microsoft.js"] = {};
(function () {
/*
 * microsoft.js — Conector con Microsoft 365 de la ETITC (sin servidor propio y sin Power Automate Premium).
 * Cada persona inicia sesión con su cuenta @itc.edu.co (MSAL, flujo de redirección para aplicaciones de página única)
 * y la aplicación usa Microsoft Graph con permisos delegados para:
 *   1. guardar el Excel en la biblioteca de documentos del sitio de la Oficina Asesora de Planeación,
 *   2. crear el registro en la lista de SharePoint (dependencia, área, responsable, correos, enlace, resultado),
 *   3. enviar desde Outlook el correo con el pase QR,
 *   4. leer el directorio institucional desde SharePoint, para que no se publique en el sitio web.
 * La configuración vive en data/config.json → microsoft. Ver docs/Guia_instalacion_Microsoft365.
 */

const MSAL_URL = 'https://cdn.jsdelivr.net/npm/@azure/msal-browser@3.28.1/lib/msal-browser.min.js';
const MSAL_SRI = 'sha384-B5PXeUfgiegchZiX5iMRssMrHd9NfPhFnITob1HyW1CY76udptWpBsniaDsH/+BY';
const GRAPH = 'https://graph.microsoft.com/v1.0';
const ALCANCES = ['User.Read', 'Sites.ReadWrite.All', 'Mail.Send'];

let cfg = null;
let app = null;
let cuenta = null;
let simulado = null; // solo para pruebas automatizadas: window.__JP27_MS_SIMULADO__
const cache = { sitio: null, drive: null, listas: new Map() };

function configurado(c) { return Boolean(c && c.activo && c.tenantId && c.clientId && c.sitio); }
function disponible() { return Boolean(cfg && (app || simulado)); }
function cuentaActiva() { return cuenta; }

function cargarScript(src, integridad) {
  return new Promise((resolver, rechazar) => {
    if (window.msal) { resolver(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.integrity = integridad;
    s.crossOrigin = 'anonymous';
    s.onload = () => resolver();
    s.onerror = () => rechazar(new Error('No cargó la librería de inicio de sesión de Microsoft. Revise la conexión.'));
    document.head.appendChild(s);
  });
}

// Prepara MSAL y procesa el regreso del inicio de sesión. Devuelve la cuenta activa o null.
async function iniciar(c) {
  cfg = c;
  if (!configurado(c)) return null;
  simulado = window.__JP27_MS_SIMULADO__ || null;
  if (simulado) { cuenta = simulado.cuenta || null; return cuenta; }
  await cargarScript(MSAL_URL, MSAL_SRI);
  app = new window.msal.PublicClientApplication({
    auth: {
      clientId: c.clientId,
      authority: `https://login.microsoftonline.com/${c.tenantId}`,
      redirectUri: `${location.origin}${location.pathname}`,
      navigateToLoginRequestUrl: true
    },
    cache: { cacheLocation: 'sessionStorage', storeAuthStateInCookie: false }
  });
  await app.initialize();
  const respuesta = await app.handleRedirectPromise();
  if (respuesta && respuesta.account) app.setActiveAccount(respuesta.account);
  cuenta = app.getActiveAccount() || app.getAllAccounts()[0] || null;
  if (cuenta) app.setActiveAccount(cuenta);
  return cuenta;
}

async function iniciarSesion() {
  if (simulado) { cuenta = simulado.cuenta; return cuenta; }
  if (!app) throw new Error('El inicio de sesión con Microsoft no está configurado.');
  // Se guarda la vista actual para volver a ella después de la redirección
  try { sessionStorage.setItem('etitc-jp27:volver', location.hash); } catch { /* opcional */ }
  await app.loginRedirect({ scopes: ALCANCES, prompt: 'select_account' });
  return null;
}

async function cerrarSesion() {
  if (simulado) { cuenta = null; return; }
  if (app && cuenta) await app.logoutRedirect({ account: cuenta, postLogoutRedirectUri: `${location.origin}${location.pathname}` });
}

async function token() {
  if (simulado) return simulado.token || 'token-simulado';
  if (!app || !cuenta) throw new Error('Inicie sesión con su cuenta institucional de Microsoft 365.');
  try {
    const r = await app.acquireTokenSilent({ scopes: ALCANCES, account: cuenta });
    return r.accessToken;
  } catch (e) {
    if (e && /interaction_required|consent_required|login_required/i.test(`${e.errorCode} ${e.message}`)) {
      await app.acquireTokenRedirect({ scopes: ALCANCES, account: cuenta });
    }
    throw new Error('La sesión de Microsoft expiró. Vuelva a iniciar sesión.');
  }
}

// Traduce los errores de Graph a mensajes que una persona puede resolver.
function errorGraph(status, cuerpo, operacion) {
  const codigo = cuerpo && cuerpo.error ? cuerpo.error.code : '';
  if (status === 401) return new Error('Su sesión de Microsoft no es válida. Cierre sesión y vuelva a ingresar.');
  if (status === 403) return new Error(`Su cuenta no tiene permiso para ${operacion}. La Oficina Asesora de Planeación debe darle acceso de colaboración al sitio de la jornada.`);
  if (status === 404) return new Error(`No se encontró ${operacion.replace(/^(guardar|leer|crear) /, '')} en SharePoint. Revise la configuración (sitio, biblioteca o lista) con TIC.`);
  if (status === 409) return new Error('Ya existe un archivo con ese nombre y no se pudo reemplazar. Intente de nuevo.');
  if (status === 413) return new Error('El archivo es demasiado grande para subirlo.');
  if (status === 429 || status === 503) return new Error('Microsoft 365 está ocupado en este momento. Espere unos segundos e intente de nuevo.');
  if (codigo === 'ErrorAccessDenied' || codigo === 'MailboxNotEnabledForRESTAPI') return new Error('Su buzón no permite enviar correos desde aplicaciones. Descargue su pase desde la pantalla.');
  return new Error(`Microsoft 365 respondió con un error (${status}${codigo ? ` · ${codigo}` : ''}) al ${operacion}.`);
}

async function graph(metodo, ruta, { cuerpo = null, crudo = false, operacion = 'conectarse', encabezados = {} } = {}) {
  const t = await token();
  const opciones = { method: metodo, headers: { Authorization: `Bearer ${t}`, ...encabezados } };
  if (cuerpo !== null) {
    if (cuerpo instanceof Blob || cuerpo instanceof ArrayBuffer) opciones.body = cuerpo;
    else { opciones.body = JSON.stringify(cuerpo); opciones.headers['Content-Type'] = 'application/json'; }
  }
  let r;
  try { r = await fetch(ruta.startsWith('http') ? ruta : `${GRAPH}${ruta}`, opciones); }
  catch { throw new Error('No hay conexión con Microsoft 365. Revise su internet e intente de nuevo.'); }
  if (!r.ok) {
    let detalle = null;
    try { detalle = await r.json(); } catch { /* sin cuerpo */ }
    throw errorGraph(r.status, detalle, operacion);
  }
  if (crudo) return r;
  if (r.status === 202 || r.status === 204) return null;
  return r.json();
}

// ───────── Identidad ─────────
async function perfil() {
  return graph('GET', '/me?$select=displayName,mail,userPrincipalName,jobTitle,department,officeLocation', { operacion: 'leer su perfil' });
}

// ───────── SharePoint ─────────
async function sitioId() {
  if (cache.sitio) return cache.sitio;
  const s = await graph('GET', `/sites/${cfg.sitio}?$select=id,webUrl`, { operacion: 'leer el sitio de la jornada' });
  cache.sitio = s.id;
  return s.id;
}

async function driveId() {
  if (cache.drive) return cache.drive;
  const sitio = await sitioId();
  const r = await graph('GET', `/sites/${sitio}/drives?$select=id,name`, { operacion: 'leer la biblioteca de documentos' });
  const nombres = [cfg.biblioteca, 'Documentos', 'Documents', 'Documentos compartidos', 'Shared Documents'].filter(Boolean).map((n) => n.toLowerCase());
  const d = (r.value || []).find((x) => nombres.includes(String(x.name).toLowerCase())) || (r.value || [])[0];
  if (!d) throw new Error('El sitio de la jornada no tiene biblioteca de documentos.');
  cache.drive = d.id;
  return d.id;
}

async function listaId(nombre) {
  if (cache.listas.has(nombre)) return cache.listas.get(nombre);
  const sitio = await sitioId();
  const r = await graph('GET', `/sites/${sitio}/lists?$select=id,displayName&$filter=displayName eq '${nombre.replace(/'/g, "''")}'`, { operacion: `leer la lista ${nombre}` });
  const l = (r.value || [])[0];
  if (!l) throw new Error(`No existe la lista «${nombre}» en el sitio de la jornada. TIC debe crearla (ver la guía de instalación).`);
  cache.listas.set(nombre, l.id);
  return l.id;
}

// Nombres válidos para SharePoint: sin " * : < > ? / \ | # % ni puntos o espacios al inicio o al final.
function nombreSeguro(texto) {
  return String(texto || '').replace(/["*:<>?/\\|#%{}~&]/g, ' ').replace(/\s+/g, ' ').replace(/^[\s.]+|[\s.]+$/g, '').slice(0, 120) || 'archivo';
}
const ruta = (...partes) => partes.map((p) => encodeURIComponent(nombreSeguro(p))).join('/');

async function subirArchivo(archivo, carpetas, nombre) {
  const drive = await driveId();
  const destino = ruta(cfg.carpetaRaiz, ...carpetas, nombre);
  const item = await graph('PUT', `/drives/${drive}/root:/${destino}:/content?@microsoft.graph.conflictBehavior=rename`, {
    cuerpo: archivo,
    operacion: 'guardar el archivo en SharePoint',
    encabezados: { 'Content-Type': archivo.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
  });
  return { id: item.id, nombre: item.name, enlace: item.webUrl };
}

async function crearRegistro(nombreLista, campos) {
  const sitio = await sitioId();
  const lista = await listaId(nombreLista);
  const r = await graph('POST', `/sites/${sitio}/lists/${lista}/items`, { cuerpo: { fields: campos }, operacion: `crear el registro en la lista ${nombreLista}` });
  return r;
}

async function leerRegistros(nombreLista, maximo = 2000) {
  const sitio = await sitioId();
  const lista = await listaId(nombreLista);
  let url = `/sites/${sitio}/lists/${lista}/items?expand=fields&$top=500`;
  const salida = [];
  while (url && salida.length < maximo) {
    const r = await graph('GET', url, { operacion: `leer la lista ${nombreLista}` });
    (r.value || []).forEach((i) => salida.push(i.fields || {}));
    url = r['@odata.nextLink'] || null;
  }
  return salida;
}

// Directorio institucional guardado en SharePoint (no se publica en el sitio web).
async function leerDirectorio() {
  if (!cfg.rutaDirectorio) return null;
  const drive = await driveId();
  const r = await graph('GET', `/drives/${drive}/root:/${cfg.rutaDirectorio.split('/').map(encodeURIComponent).join('/')}:/content`, { crudo: true, operacion: 'leer el directorio' });
  return r.json();
}

// ───────── Correo ─────────
// adjuntos: [{ nombre, tipo, base64, cid }] — con cid el adjunto se muestra dentro del cuerpo (<img src="cid:...">)
async function enviarCorreo({ para = [], cc = [], asunto, html, adjuntos = [] }) {
  const destinatarios = (lista) => [...new Set(lista.filter(Boolean).map((c) => c.trim().toLowerCase()))].map((address) => ({ emailAddress: { address } }));
  const mensaje = {
    subject: asunto,
    body: { contentType: 'HTML', content: html },
    toRecipients: destinatarios(para),
    ccRecipients: destinatarios(cc.filter((c) => !para.map((p) => p.toLowerCase()).includes(String(c).toLowerCase()))),
    attachments: adjuntos.map((a) => ({
      '@odata.type': '#microsoft.graph.fileAttachment',
      name: a.nombre,
      contentType: a.tipo,
      contentBytes: a.base64,
      ...(a.cid ? { isInline: true, contentId: a.cid } : {})
    }))
  };
  await graph('POST', '/me/sendMail', { cuerpo: { message: mensaje, saveToSentItems: true }, operacion: 'enviar el correo' });
  return true;
}

Object.assign(__m["src/lib/microsoft.js"], { configurado, disponible, cuentaActiva, iniciar, iniciarSesion, cerrarSesion, perfil, nombreSeguro, subirArchivo, crearRegistro, leerRegistros, leerDirectorio, enviarCorreo, ALCANCES });
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

// definiciones: [{ id, titulo, tituloCorto, tituloMovil, icono }]. En celular se muestra tituloMovil en la barra inferior.
function crearPestanas(contenedor, definiciones, alSeleccionar) {
  contenedor.setAttribute('role', 'tablist');
  contenedor.setAttribute('aria-label', 'Secciones de la jornada');
  contenedor.innerHTML = definiciones.map((d) => `
    <button type="button" class="tab" role="tab" id="tab-${esc(d.id)}" aria-controls="panel-${esc(d.id)}" aria-selected="false" tabindex="-1" data-tab="${esc(d.id)}">
      <span class="tab-ico">${icono(d.icono, 'icon-sm')}</span><span class="tab-label">${esc(d.tituloCorto || d.titulo)}</span><span class="tab-label-movil" aria-hidden="true">${esc(d.tituloMovil || d.tituloCorto || d.titulo)}</span>
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
 * cards.js — Estados vacíos, cadena lógica, aparición de tarjetas, números que se animan y barras horizontales.
 */
const { esc, prefiereMenosMovimiento } = __m["src/ui/dom.js"];
const { icono } = __m["src/ui/iconos.js"];
const { formatear } = __m["src/lib/formato.js"];

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

Object.assign(__m["src/ui/cards.js"], { estadoVacio, cadenaLogica, animarNumero, activarAnimaciones, barrasHorizontales });
})();

// ── src/lib/libro.js ──
__m["src/lib/libro.js"] = {};
(function () {
/*
 * libro.js — Lectura de las plantillas institucionales con SheetJS.
 * Las plantillas de la Oficina Asesora de Planeación son libros protegidos con hojas ocultas y fórmulas.
 * Aquí se abren en el navegador (el archivo no sale del equipo) y se ofrecen utilidades para ubicar hojas
 * y columnas por el texto del encabezado, de modo que la validación no dependa de letras de columna fijas.
 */
const { normalizar } = __m["src/lib/formato.js"];
const { leerFechaExcel } = __m["src/lib/fechas.js"];

function xlsxDisponible() { return Boolean(window.XLSX && window.XLSX.utils); }

function libreria() {
  if (!xlsxDisponible()) throw new Error('La librería de Excel (SheetJS) no cargó. Revise su conexión a internet y recargue la página.');
  return window.XLSX;
}

// Abre un archivo Excel del usuario. Devuelve { nombreArchivo, tamano, wb }.
async function abrirLibro(archivo, { maxMB = 25 } = {}) {
  const X = libreria();
  if (!archivo) throw new Error('No se recibió ningún archivo.');
  if (!/\.(xlsx|xlsm|xls)$/i.test(archivo.name)) throw new Error('El archivo debe ser de Excel (.xlsx). Guárdelo desde Excel con ese formato y vuelva a intentarlo.');
  if (archivo.size > maxMB * 1024 * 1024) throw new Error(`El archivo pesa más de ${maxMB} MB. Verifique que sea la plantilla de la jornada.`);
  const datos = new Uint8Array(await archivo.arrayBuffer());
  try {
    const wb = X.read(datos, { type: 'array', cellDates: true, cellFormula: true, cellNF: false, cellStyles: false });
    return { nombreArchivo: archivo.name, tamano: archivo.size, wb };
  } catch (e) {
    throw new Error('No fue posible abrir el archivo. Puede estar dañado o protegido con contraseña de apertura.');
  }
}

// Ubica una hoja por nombre exacto normalizado o por prefijo (por ejemplo «eje1»).
function hoja(wb, nombre, { prefijo = false } = {}) {
  const objetivo = normalizar(nombre).replace(/[\s_]+/g, '');
  const clave = wb.SheetNames.find((n) => {
    const k = normalizar(n).replace(/[\s_]+/g, '');
    return prefijo ? k.startsWith(objetivo) : k === objetivo;
  });
  return clave ? { nombre: clave, ws: wb.Sheets[clave] } : null;
}

const direccion = (f, c) => `${columnaLetra(c)}${f}`;
function columnaLetra(c) { let s = ''; let x = c + 1; while (x > 0) { const m = (x - 1) % 26; s = String.fromCharCode(65 + m) + s; x = Math.floor((x - 1) / 26); } return s; }

// Valor de una celda (fila 1-based, columna 0-based). Si la fórmula no trae valor guardado y es una
// referencia simple a otra hoja (=Base_OAPDI!J5), se resuelve leyendo esa celda.
function valor(wb, ws, fila, col) {
  const celda = ws[direccion(fila, col)];
  if (!celda) return null;
  if (celda.v !== undefined && celda.v !== null && celda.v !== '') return celda.v;
  if (celda.f) {
    const m = /^'?([^'!]+)'?!\$?([A-Z]+)\$?(\d+)$/.exec(celda.f.trim());
    if (m && wb.Sheets[m[1]]) {
      const ref = wb.Sheets[m[1]][`${m[2]}${m[3]}`];
      return ref && ref.v !== undefined ? ref.v : null;
    }
  }
  return celda.v === undefined ? null : celda.v;
}

function rango(ws) {
  const X = libreria();
  return ws && ws['!ref'] ? X.utils.decode_range(ws['!ref']) : { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
}

/*
 * Busca la fila de encabezados (en las primeras maxFila filas) que contiene todos los textos obligatorios
 * y mapea cada clave a su columna. columnas = { clave: 'texto del encabezado' | ['alternativa', ...] }.
 * La comparación ignora tildes, mayúsculas y signos, y acepta que el encabezado empiece por el texto buscado.
 */
function encabezados(wb, ws, columnas, { maxFila = 15, obligatorias = [] } = {}) {
  const r = rango(ws);
  const ultimaFila = Math.min(r.e.r + 1, maxFila);
  const opciones = Object.fromEntries(Object.entries(columnas).map(([k, v]) => [k, (Array.isArray(v) ? v : [v]).map(norm)]));
  let mejor = null;
  for (let f = 1; f <= ultimaFila; f += 1) {
    const mapa = {};
    for (let c = r.s.c; c <= r.e.c; c += 1) {
      const t = norm(valor(wb, ws, f, c));
      if (!t) continue;
      for (const [k, alts] of Object.entries(opciones)) {
        if (mapa[k] === undefined && alts.some((a) => t === a || t.startsWith(a))) { mapa[k] = c; break; }
      }
    }
    const n = Object.keys(mapa).length;
    if (!mejor || n > mejor.n) mejor = { fila: f, mapa, n };
  }
  if (!mejor || mejor.n === 0) return null;
  const faltan = obligatorias.filter((k) => mejor.mapa[k] === undefined);
  return { fila: mejor.fila, col: mejor.mapa, faltan, ultimaFila: r.e.r + 1 };
}

function norm(v) { return normalizar(v).replace(/[^a-z0-9ñ ]/g, ' ').replace(/\s+/g, ' ').trim(); }

// Lee una fila como objeto según el mapa de columnas.
function filaComoObjeto(wb, ws, fila, col) {
  const o = { _fila: fila };
  for (const [k, c] of Object.entries(col)) o[k] = valor(wb, ws, fila, c);
  return o;
}

// Utilidades de valores
const vacio = (v) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
const texto = (v) => {
  if (vacio(v)) return '';
  if (v instanceof Date) return leerFechaExcel(v) || '';
  return String(v).trim();
};
// Una fecha válida es un Date o un número de serie de Excel (como en la función ISNUMBER de la plantilla).
function fechaValida(v) {
  if (v instanceof Date) return leerFechaExcel(v);
  if (typeof v === 'number' && Number.isFinite(v)) return leerFechaExcel(v);
  return null;
}
const esNumero = (v) => typeof v === 'number' && Number.isFinite(v);

Object.assign(__m["src/lib/libro.js"], { xlsxDisponible, abrirLibro, hoja, columnaLetra, valor, rango, encabezados, filaComoObjeto, fechaValida, vacio, texto, esNumero });
})();

// ── src/lib/excel.js ──
__m["src/lib/excel.js"] = {};
(function () {
/*
 * excel.js — Exportación a Excel con SheetJS: registro de formulaciones y asistencia, con encabezado
 * institucional y logo. (Las plantillas que diligencian las áreas son las oficiales de la Oficina Asesora de
 * Planeación y se descargan tal cual desde assets/plantillas; su lectura está en libro.js.)
 *
 * SheetJS Community no escribe estilos ni validaciones de datos, así que el libro se genera con SheetJS
 * y luego se post-procesa el paquete OOXML (zip) con XLSX.CFB para agregar: estilos institucionales,
 * listas desplegables, protección de celdas, paneles inmovilizados, cálculo al abrir y el logo.
 * Si el post-proceso falla por cualquier motivo se entrega el libro de SheetJS sin estilos (degradación).
 */
const { serieExcel, hoyISO, fechaLarga, horaLegible } = __m["src/lib/fechas.js"];

// Índices de estilo (cellXfs) definidos en estilosXml()
const S = {
  normal: 0, encabezado: 1, entrada: 2, entradaFecha: 3, formulaFecha: 4, titulo: 5, texto: 6, etiqueta: 7,
  entradaMoneda: 8, entradaNumero: 9, fechaBloqueada: 10, nota: 11, seccion: 12, subtitulo: 13,
  celda: 14, celdaMoneda: 15, celdaFecha: 16, celdaNumero: 17, cita: 18
};

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

Object.assign(__m["src/lib/excel.js"], { xlsxDisponible, exportarExcel });
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

// El área funcional (a) entra en la firma cuando está presente; los pases sin área siguen siendo válidos.
function firmar(pase, sal) {
  const cadena = [pase.id, pase.n, pase.c, pase.d, pase.e, pase.ts].join('|') + (pase.a ? `|${pase.a}` : '');
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

// Crea el contenido del pase: {"id","n","c","d","a","e","ts","h"} (a = área funcional, por ejemplo A05)
function crearPase({ nombre, cargo, dependencia, area = '', correo, prefijo, sal }) {
  const pase = { id: generarIdPase(dependencia, prefijo), n: nombre, c: cargo, d: dependencia, ...(area ? { a: area } : {}), e: correo, ts: Date.now(), h: '' };
  pase.h = firmar(pase, sal);
  return pase;
}

function contenidoQR(pase) {
  return JSON.stringify({ id: pase.id, n: pase.n, c: pase.c, d: pase.d, ...(pase.a ? { a: pase.a } : {}), e: pase.e, ts: pase.ts, h: pase.h });
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

// ── src/lib/registro.js ──
__m["src/lib/registro.js"] = {};
(function () {
/*
 * registro.js — Registro automático de las plantillas formuladas.
 * Cuando un cargue pasa la validación:
 *   1. guarda el Excel en SharePoint (con Microsoft 365) y obtiene el enlace donde reposa,
 *   2. crea el registro: dependencia, área, responsable, correos institucionales, enlace y resultado,
 *   3. en el Plan de acción emite el pase con QR firmado,
 *   4. envía desde Outlook el correo con el pase (o la confirmación del Plan de necesidades).
 * Sin Microsoft 365 configurado, registra en este navegador y el enlace lo escribe la persona.
 */
const { estado, area: areaPorId, dependencia, personasPorCorreo } = __m["src/estado.js"];
const { almacen } = __m["src/storage.js"];
const ms = __m["src/lib/microsoft.js"];
const { crearPase, contenidoQR, qrComoDataUrl, qrDisponible } = __m["src/lib/qr.js"];
const { fechaLarga, horaLegible, rangoFechasTexto } = __m["src/lib/fechas.js"];
const { moneda, entero, tituloLegible } = __m["src/lib/formato.js"];

// Columnas de la lista de SharePoint «JP27_Registro» (nombres internos; ver la guía de instalación).
const COLUMNAS_LISTA_REGISTRO = [
  ['Title', 'Código del registro'], ['Tipo', 'Plan de acción o Plan de necesidades'], ['AreaId', 'Id del área (A01–A47)'], ['Area', 'Área funcional'],
  ['Dependencia', 'Código y nombre de la dependencia'], ['Responsable', 'Nombre del responsable'], ['Cargo', 'Cargo del responsable'],
  ['CorreoResponsable', 'Correo institucional del responsable'], ['CorreosEquipo', 'Correos institucionales del equipo'], ['Archivo', 'Nombre del archivo cargado'],
  ['EnlaceArchivo', 'Enlace donde reposa la plantilla'], ['Estado', 'Resultado de la validación'], ['Advertencias', 'Número de advertencias'],
  ['Resumen', 'Resumen de lo cargado'], ['CodigoPase', 'Código del pase QR'], ['FechaCargue', 'Fecha y hora del cargue'], ['RegistradoPor', 'Cuenta que hizo el cargue']
];

const COLUMNAS_LISTA_ASISTENCIA = [
  ['Title', 'Clave del registro'], ['CodigoPase', 'Código del pase'], ['Nombre', 'Nombre'], ['Cargo', 'Cargo'], ['AreaId', 'Id del área'], ['Area', 'Área funcional'],
  ['Dependencia', 'Dependencia'], ['Correo', 'Correo'], ['HoraIngreso', 'Hora de ingreso'], ['Metodo', 'QR o manual']
];

const TIPOS = { accion: 'Plan de acción', necesidades: 'Plan de necesidades' };
const cfgMS = () => estado.datos?.config?.microsoft || {};
const microsoftListo = () => Boolean(estado.microsoft.activo && ms.disponible() && ms.cuentaActiva());

function codigoRegistro(tipo, areaId) {
  const f = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const sello = `${f.getFullYear()}${p(f.getMonth() + 1)}${p(f.getDate())}-${p(f.getHours())}${p(f.getMinutes())}`;
  const azar = Array.from(crypto.getRandomValues(new Uint8Array(3)), (b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');
  return `${tipo === 'accion' ? 'PA' : 'PN'}27-${areaId}-${sello}-${azar}`;
}

function resumenTexto(tipo, r) {
  if (tipo === 'accion') {
    return `${entero(r.metasAsignadas)} metas asignadas · ${entero(r.metasFormuladas)} formuladas · ${entero(r.accionesOk)} acciones en OK${r.adicionales ? ` · ${entero(r.adicionales)} adicionales` : ''}${r.compromisos?.total ? ` · ${r.compromisos.decididos}/${r.compromisos.total} compromisos 2026 decididos` : ''}`;
  }
  return `${entero(r.ok)} necesidades · ${moneda(r.valorTotal)} en total · ${moneda(r.valor2027)} en 2027${r.vigenciasFuturas ? ` · ${r.vigenciasFuturas} con vigencias futuras` : ''}`;
}

function paseExistente(ident) {
  return estado.consolidado.pases.find((p) => p.e === ident.correo && p.a === ident.areaId && p.n === ident.nombre) || null;
}

// Nombre legible desde el correo cuando la persona no está en el directorio: «ana.perez@…» → «Ana Perez».
function nombreDesdeCorreo(correo) {
  return String(correo).split('@')[0].split(/[._-]+/).filter(Boolean).map((x) => x.charAt(0).toUpperCase() + x.slice(1)).join(' ');
}

function paseEquipo(correo, a) {
  const p = personasPorCorreo(correo)[0] || null;
  const nombre = p?.nombre || nombreDesdeCorreo(correo);
  const previo = estado.consolidado.pases.find((x) => x.e === correo && x.a === a.id);
  if (previo) return previo;
  const pase = crearPase({
    nombre, cargo: p ? tituloLegible(p.cargo) : 'Equipo del área', dependencia: String(a.dependencia), area: a.id, correo,
    prefijo: estado.indices.prefijo, sal: estado.indices.sal
  });
  pase.emitido = new Date().toISOString();
  pase.verificado = Boolean(p);
  pase.equipo = true;
  return pase;
}

/*
 * registrarCargue({ tipo: 'accion'|'necesidades', ident, archivo: File, validacion, enlaceManual })
 * ident = { nombre, cargo, correo, areaId, correosEquipo: [], verificado }
 * Devuelve { registro, pase, correo: { enviado, motivo }, enlace }.
 */
async function registrarCargue({ tipo, ident, archivo, validacion, enlaceManual = '' }) {
  const a = areaPorId(ident.areaId);
  if (!a) throw new Error('Elija su área funcional antes de registrar.');
  const dep = dependencia(a.dependencia);
  const conMS = microsoftListo();
  const cfg = cfgMS();
  const id = codigoRegistro(tipo, a.id);

  // 1. Archivo en SharePoint
  let enlace = String(enlaceManual || '').trim();
  let origenEnlace = enlace ? 'manual' : '';
  if (conMS) {
    const fecha = new Date().toISOString().slice(0, 10);
    const subido = await ms.subirArchivo(archivo, [TIPOS[tipo], `${a.id} - ${a.nombre}`], `${a.id} ${TIPOS[tipo]} ${fecha} ${archivo.name}`);
    enlace = subido.enlace;
    origenEnlace = 'sharepoint';
  }

  // 2. Pase (solo Plan de acción)
  let pase = null;
  if (tipo === 'accion') {
    pase = paseExistente(ident) || crearPase({
      nombre: ident.nombre, cargo: ident.cargo, dependencia: String(a.dependencia), area: a.id, correo: ident.correo,
      prefijo: estado.indices.prefijo, sal: estado.indices.sal
    });
    pase.emitido = pase.emitido || new Date().toISOString();
    pase.verificado = ident.verificado !== false;
  }
  // Cada correo del equipo recibe su propio pase: el QR es personal
  const pasesEquipo = tipo === 'accion' ? (ident.correosEquipo || []).map((c) => paseEquipo(c, a)) : [];

  // 3. Registro
  const registro = {
    id, tipo, fecha: new Date().toISOString(),
    area: { id: a.id, nombre: a.nombre, etiqueta: a.etiqueta, dependencia: String(a.dependencia) },
    dependencia: { codigo: String(a.dependencia), nombre: dep ? dep.nombre : '' },
    responsable: { nombre: ident.nombre, cargo: ident.cargo, correo: ident.correo, verificado: ident.verificado !== false },
    correosEquipo: ident.correosEquipo || [],
    archivo: archivo.name, tamano: archivo.size, enlace, origenEnlace,
    estado: validacion.bloqueantes ? 'con-bloqueantes' : 'validada',
    resumen: validacion.resumen, resumenTexto: resumenTexto(tipo, validacion.resumen),
    bloqueantes: validacion.bloqueantes, advertencias: validacion.advertencias,
    hallazgos: (validacion.hallazgos || []).slice(0, 40),
    acciones: tipo === 'accion' ? (validacion.acciones || []).map((x) => x.nombre) : [],
    codigoPase: pase ? pase.id : (estado.consolidado.pases.find((p) => p.a === a.id && p.e === ident.correo)?.id || ''),
    pasesEquipo: pasesEquipo.map((p) => p.id),
    registradoPor: ms.cuentaActiva()?.username || ident.correo,
    sincronizado: false
  };
  if (conMS) {
    await ms.crearRegistro(cfg.listaRegistro, {
      Title: registro.id, Tipo: TIPOS[tipo], AreaId: a.id, Area: a.nombre, Dependencia: `${a.dependencia} · ${registro.dependencia.nombre}`,
      Responsable: ident.nombre, Cargo: ident.cargo, CorreoResponsable: ident.correo, CorreosEquipo: registro.correosEquipo.join('; '),
      Archivo: archivo.name, EnlaceArchivo: enlace, Estado: registro.estado === 'validada' ? 'Validada' : 'Con bloqueantes',
      Advertencias: registro.advertencias, Resumen: registro.resumenTexto, CodigoPase: [registro.codigoPase, ...registro.pasesEquipo].filter(Boolean).join('; '),
      FechaCargue: registro.fecha, RegistradoPor: registro.registradoPor
    });
    registro.sincronizado = true;
  }
  await almacen.guardarRegistro(registro);
  if (pase) await almacen.guardarPase(pase);
  for (const p of pasesEquipo) await almacen.guardarPase(p);

  // 4. Correo
  const correo = { enviado: false, motivo: conMS ? '' : 'local' };
  if (conMS && cfg.enviarCorreo !== false) {
    try {
      await enviarCorreoRegistro({ tipo, registro, pase, pasesEquipo });
      correo.enviado = true;
      // Cada integrante recibe su pase en un correo propio
      for (const p of pasesEquipo) {
        try { await enviarCorreoRegistro({ tipo, registro, pase: p, destinatario: p }); correo.equipo = (correo.equipo || 0) + 1; } catch (e) { console.error(e); correo.fallidos = (correo.fallidos || 0) + 1; }
      }
    } catch (e) {
      console.error(e);
      correo.motivo = e.message;
    }
  }
  return { registro, pase, pasesEquipo, correo, enlace };
}

// Correo HTML (tablas y estilos en línea: es lo que respetan Outlook y los clientes móviles).
async function enviarCorreoRegistro({ tipo, registro, pase, pasesEquipo = [], destinatario = null }) {
  const ev = estado.datos.config.evento;
  const agenda = estado.datos.agenda || {};
  const fechas = rangoFechasTexto((agenda.dias || []).map((d) => d.fecha));
  const cfg = cfgMS();
  const adjuntos = [];
  let bloqueQR = '';
  if (pase && qrDisponible()) {
    const url = await qrComoDataUrl(contenidoQR(pase), { tamano: 480 });
    const base64 = url.split(',')[1];
    adjuntos.push({ nombre: `Pase_${pase.id}.png`, tipo: 'image/png', base64, cid: 'pase-qr' });
    bloqueQR = `<tr><td align="center" style="padding:8px 24px 4px"><img src="cid:pase-qr" width="220" height="220" alt="Código QR del pase ${pase.id}" style="display:block;border:0"></td></tr>
      <tr><td align="center" style="padding:0 24px 18px;font:700 18px Consolas,monospace;letter-spacing:2px;color:#0b4d3b">${pase.id}</td></tr>`;
  }
  const fila = (k, v) => `<tr><td style="padding:6px 0;color:#587068;font:13px Arial,sans-serif;width:150px;vertical-align:top">${k}</td><td style="padding:6px 0;color:#13332a;font:600 13px Arial,sans-serif">${v}</td></tr>`;
  const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const titulo = tipo === 'accion' ? 'Su pase de acceso' : 'Plan de necesidades registrado';
  const intro = destinatario
    ? `${esc(registro.responsable.nombre)} registró el Plan de acción 2027 del área <b>${esc(registro.area.nombre)}</b> y le incluyó en el equipo. Este es su pase personal: preséntelo en el ingreso a la jornada.`
    : tipo === 'accion'
    ? `La formulación del Plan de acción 2027 del área <b>${esc(registro.area.nombre)}</b> quedó registrada y validada. Presente este código QR en el ingreso a la jornada.${pasesEquipo.length ? ` Cada integrante del equipo recibió su propio pase.` : ''}`
    : `El Plan de necesidades 2027 del área <b>${esc(registro.area.nombre)}</b> quedó registrado y validado.`;
  const html = `<!doctype html><html><body style="margin:0;background:#f4f7f4">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f4;padding:24px 12px"><tr><td align="center">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #d7e4dc">
    <tr><td style="background:#0b4d3b;padding:22px 24px;color:#ffffff">
      <div style="font:700 11px Arial,sans-serif;letter-spacing:2px;color:#8ad058;text-transform:uppercase">${esc(ev.nombreCorto || ev.nombre)}</div>
      <div style="font:800 22px Arial,sans-serif;margin-top:4px">${titulo}</div>
      <div style="font:13px Arial,sans-serif;color:#e6f4ec;margin-top:4px">${esc(fechas)}${agenda.sede && agenda.sede !== 'Por confirmar' ? ` · ${esc(agenda.sede)}` : ''}</div>
    </td></tr>
    <tr><td style="padding:20px 24px 6px;font:14px/1.55 Arial,sans-serif;color:#3d5950">${intro}</td></tr>
    ${bloqueQR}
    <tr><td style="padding:4px 24px 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${destinatario ? fila('Asistente', `${esc(destinatario.n)}<br><span style="font-weight:400;color:#587068">${esc(destinatario.e)}</span>`) : ''}
      ${fila('Responsable', `${esc(registro.responsable.nombre)}<br><span style="font-weight:400;color:#587068">${esc(registro.responsable.cargo)}</span>`)}
      ${!destinatario && pasesEquipo.length ? fila('Pases del equipo', pasesEquipo.map((p) => `${esc(p.n)} · ${esc(p.id)}`).join('<br>')) : ''}
      ${fila('Área funcional', `${esc(registro.area.id)} · ${esc(registro.area.nombre)}`)}
      ${fila('Dependencia', `${esc(registro.dependencia.codigo)} · ${esc(registro.dependencia.nombre)}`)}
      ${fila('Resumen', esc(registro.resumenTexto))}
      ${registro.advertencias ? fila('Advertencias', `${registro.advertencias} para revisar con la ${esc(ev.oficina)}`) : ''}
      ${fila('Archivo', registro.enlace ? `<a href="${esc(registro.enlace)}" style="color:#0f6b4b">${esc(registro.archivo)}</a>` : esc(registro.archivo))}
      ${fila('Registro', `${esc(registro.id)}<br><span style="font-weight:400;color:#587068">${esc(fechaLarga(registro.fecha.slice(0, 10)))}, ${esc(horaLegible(new Date(registro.fecha)))}</span>`)}
    </table></td></tr>
    <tr><td style="padding:14px 24px 22px;border-top:1px solid #d7e4dc;font:12px/1.5 Arial,sans-serif;color:#587068">
      ${esc(ev.oficina)} · ${esc(ev.institucion)}<br>Mensaje generado por el aplicativo de la jornada. Si tiene dudas, escriba a ${esc(ev.correoContacto)}.
    </td></tr>
  </table></td></tr></table></body></html>`;
  await ms.enviarCorreo({
    para: [destinatario ? destinatario.e : registro.responsable.correo],
    // En el Plan de acción el equipo recibe su propio pase, así que no se copia el QR del responsable
    cc: destinatario ? [] : [...(tipo === 'accion' ? [] : registro.correosEquipo), cfg.correoCopia].filter(Boolean),
    asunto: tipo === 'accion'
      ? `Pase de acceso ${pase.id} · ${ev.nombreCorto || ev.nombre} · ${registro.area.nombre}`
      : `Plan de necesidades registrado · ${registro.area.nombre} · ${ev.nombreCorto || ev.nombre}`,
    html,
    adjuntos
  });
}

// Registro de asistencia en SharePoint (si hay sesión de Microsoft). No bloquea el escáner si falla.
async function registrarAsistenciaEnLinea(r) {
  if (!microsoftListo()) return false;
  const a = r.area ? areaPorId(r.area) : null;
  await ms.crearRegistro(cfgMS().listaAsistencia, {
    Title: r.clave, CodigoPase: r.paseId || '', Nombre: r.nombre, Cargo: r.cargo || '', AreaId: r.area || '', Area: a ? a.nombre : '',
    Dependencia: r.dependencia ? `${r.dependencia} · ${dependencia(r.dependencia)?.nombre || ''}` : '', Correo: r.correo || '', HoraIngreso: r.hora, Metodo: r.metodo === 'QR' ? 'QR' : 'Manual'
  });
  return true;
}

// Registros para el panel de la Oficina Asesora de Planeación: SharePoint si hay sesión, si no los de este navegador.
async function leerRegistrosPanel() {
  if (microsoftListo()) {
    const filas = await ms.leerRegistros(cfgMS().listaRegistro);
    return filas.map((f) => ({
      id: f.Title, tipo: f.Tipo === 'Plan de acción' ? 'accion' : 'necesidades', fecha: f.FechaCargue || f.Created,
      area: { id: f.AreaId, nombre: f.Area }, dependencia: { codigo: String(f.Dependencia || '').slice(0, 3), nombre: String(f.Dependencia || '').slice(6) },
      responsable: { nombre: f.Responsable, cargo: f.Cargo, correo: f.CorreoResponsable }, correosEquipo: String(f.CorreosEquipo || '').split(/;\s*/).filter(Boolean),
      archivo: f.Archivo, enlace: f.EnlaceArchivo, estado: f.Estado === 'Validada' ? 'validada' : 'con-bloqueantes', advertencias: f.Advertencias,
      resumenTexto: f.Resumen, codigoPase: f.CodigoPase, registradoPor: f.RegistradoPor, origen: 'SharePoint'
    }));
  }
  return estado.consolidado.registros.map((r) => ({ ...r, origen: 'Este navegador' }));
}

Object.assign(__m["src/lib/registro.js"], { resumenTexto, registrarCargue, registrarAsistenciaEnLinea, leerRegistrosPanel, COLUMNAS_LISTA_REGISTRO, COLUMNAS_LISTA_ASISTENCIA, microsoftListo });
})();

// ── src/ui/cargue.js ──
__m["src/ui/cargue.js"] = {};
(function () {
/*
 * cargue.js — Flujo compartido de las pestañas Plan de acción y Plan de necesidades, pensado para celular:
 *   1. Descargue la plantilla   2. Identifíquese (directorio + área funcional + equipo)
 *   3. Cargue el archivo diligenciado (validación en el navegador)   4. Registro: pase QR o constancia.
 * Una tarea por pantalla, botones grandes y la identificación compartida entre ambas pestañas.
 */
const { PREFIJO_LOCAL } = __m["src/config.js"];
const { estado, on: alEvento, areas, area: areaPorId, dependencia, dependencias, personasPorCorreo, sugerirArea, registroVigente } = __m["src/estado.js"];
const { esc, on } = __m["src/ui/dom.js"];
const { icono } = __m["src/ui/iconos.js"];
const { toast, toastError } = __m["src/ui/toast.js"];
const { estadoVacio, activarAnimaciones } = __m["src/ui/cards.js"];
const { abrirLibro } = __m["src/lib/libro.js"];
const { exportarExcel, xlsxDisponible } = __m["src/lib/excel.js"];
const { descargarBlob, obtenerLogo } = __m["src/lib/export.js"];
const { registrarCargue, microsoftListo } = __m["src/lib/registro.js"];
const { normalizar, tituloLegible, iniciales, plural } = __m["src/lib/formato.js"];
const { fechaCorta, horaLegible } = __m["src/lib/fechas.js"];

const CLAVE_IDENT = `${PREFIJO_LOCAL}:identificacion`;
const dominio = () => estado.datos?.config?.dominioInstitucional || '@itc.edu.co';
const correoValido = (c) => /^[a-z0-9._%+-]+$/.test(String(c).split('@')[0] || '') && String(c).endsWith(dominio()) && String(c).length > dominio().length;

// ───────── Identificación compartida ─────────
function identificacion() {
  if (estado.identificacion) return estado.identificacion;
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE_IDENT) || 'null');
    if (v && v.completa && areaPorId(v.areaId)) estado.identificacion = v;
  } catch { /* sin almacenamiento */ }
  return estado.identificacion;
}
function guardarIdentificacion(v) {
  estado.identificacion = v;
  try { if (v) localStorage.setItem(CLAVE_IDENT, JSON.stringify(v)); else localStorage.removeItem(CLAVE_IDENT); } catch { /* opcional */ }
}

function opcionesArea(seleccion) {
  const porDep = new Map();
  areas().forEach((a) => { const k = String(a.dependencia); if (!porDep.has(k)) porDep.set(k, []); porDep.get(k).push(a); });
  const orden = dependencias().map((d) => String(d.codigo)).filter((c) => porDep.has(c));
  [...porDep.keys()].forEach((k) => { if (!orden.includes(k)) orden.push(k); });
  return `<option value="">Elija su área funcional…</option>${orden.map((k) => `<optgroup label="${esc(k)} · ${esc(dependencia(k)?.nombre || '')}">
    ${porDep.get(k).map((a) => `<option value="${esc(a.id)}" ${a.id === seleccion ? 'selected' : ''}>${esc(a.id)} · ${esc(a.nombre)}</option>`).join('')}</optgroup>`).join('')}`;
}

function tarjetaIdentidad(i, { cambiar = true } = {}) {
  const a = areaPorId(i.areaId);
  return `<div class="ident-mini">
    <span class="avatar avatar-sm" aria-hidden="true">${esc(iniciales(i.nombre))}</span>
    <div class="ident-mini-info"><strong>${esc(i.nombre)}</strong><span>${esc(a ? `${a.id} · ${a.nombre}` : '')}</span></div>
    ${cambiar ? `<button type="button" class="btn btn-sm btn-ghost" data-ir="2">Cambiar</button>` : ''}
  </div>`;
}

/*
 * montarFlujo(panel, ctx, cfg)
 * cfg = { tipo, eyebrow, titulo, lead, icono, plantillas, ayuda[], tituloFinal, textoRegistrar,
 *         validar(wb, ident) → resultado, cifras(resumen) → [{ etiqueta, valor, alerta }],
 *         pintarFinal(cont, { registro, pase, correo, nuevo }), avisoCargue(ident) → html, estadoHero(ident) → html }
 */
function montarFlujo(panel, ctx, cfg) {
  const s = { paso: 1, validacion: null, archivo: null, ultimo: null, filtro: 'todos' };
  const PASOS = [
    { n: 1, titulo: 'Descargue', sub: 'La plantilla' },
    { n: 2, titulo: 'Identifíquese', sub: 'Área y equipo' },
    { n: 3, titulo: 'Cargue', sub: 'El archivo diligenciado' },
    { n: 4, titulo: cfg.tituloFinal, sub: 'Registro automático' }
  ];

  panel.innerHTML = `<div class="container page page-app">
    <header class="app-hero reveal">
      <span class="eyebrow">${icono(cfg.icono, 'icon-sm')}${esc(cfg.eyebrow)}</span>
      <h1>${esc(cfg.titulo)}</h1>
      <p class="lead">${cfg.lead}</p>
      <div data-hero-estado></div>
    </header>
    <nav class="pasos" aria-label="Pasos"><ol class="stepper"></ol><div class="stepper-bar" aria-hidden="true"><span></span></div></nav>
    <div data-paso class="paso-cont"></div>
  </div>`;
  const cont = panel.querySelector('[data-paso]');

  const registroArea = () => { const i = identificacion(); return i ? registroVigente(cfg.tipo, i.areaId) : null; };
  const puedeIr = (n) => n <= 2 || (n === 3 && Boolean(identificacion())) || (n === 4 && Boolean(identificacion() && (s.ultimo || registroArea())));

  function pintarHero() {
    panel.querySelector('[data-hero-estado]').innerHTML = cfg.estadoHero ? cfg.estadoHero(identificacion(), registroArea()) : '';
  }
  function pintarStepper() {
    panel.querySelector('.stepper').innerHTML = PASOS.map((p) => {
      const hecho = p.n < s.paso && puedeIr(p.n + 1);
      const bloqueado = !puedeIr(p.n);
      return `<li class="step${p.n === s.paso ? ' is-current' : ''}${hecho ? ' is-done' : ''}">
        <button type="button" class="step-btn" data-ir="${p.n}" ${p.n === s.paso ? 'aria-current="step"' : ''} ${bloqueado ? 'aria-disabled="true"' : ''}>
          <span class="step-num">${hecho ? icono('check', 'icon-sm') : p.n}</span>
          <span class="step-text">${esc(p.titulo)}<small>${esc(p.sub)}</small></span>
        </button></li>`;
    }).join('');
    panel.querySelector('.stepper-bar > span').style.width = `${((s.paso - 1) / (PASOS.length - 1)) * 100}%`;
  }

  function ir(n, { foco = true } = {}) {
    if (!puedeIr(n)) n = identificacion() ? 3 : 2;
    s.paso = n;
    pintarStepper();
    pintarHero();
    cont.classList.remove('paso-enter');
    void cont.offsetWidth;
    cont.classList.add('paso-enter');
    if (n === 1) pasoDescarga();
    if (n === 2) pasoIdentificacion();
    if (n === 3) pasoCargue();
    if (n === 4) pasoFinal();
    activarAnimaciones(cont);
    if (foco) {
      const top = panel.querySelector('.pasos').getBoundingClientRect().top + window.scrollY - (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--alto-barra'), 10) || 64) - 8;
      if (window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' });
      const h = cont.querySelector('h2');
      if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
    }
  }

  // ───────── Paso 1 ─────────
  function pasoDescarga() {
    const lista = cfg.plantillas || [];
    cont.innerHTML = `<div class="stack">
      <h2 class="paso-titulo">Descargue ${lista.length > 1 ? 'los archivos' : 'la plantilla'}</h2>
      <div class="descargas">
        ${lista.map((p) => `<article class="descarga reveal">
          <span class="descarga-ico">${icono('excel', 'icon-lg')}</span>
          <div class="descarga-info">
            <div class="row" style="gap:8px"><strong>${esc(p.titulo)}</strong><span class="badge ${p.rol === 'Diligenciar' ? 'badge-solid' : ''}">${esc(p.rol)}</span></div>
            <p class="mb-0">${esc(p.descripcion)}</p>
          </div>
          <a class="btn btn-primary" href="${esc(p.archivo)}" download="${esc(p.nombreDescarga)}" data-descarga="${esc(p.id)}">${icono('descargar', 'icon-sm')}Descargar</a>
        </article>`).join('')}
      </div>
      ${cfg.ayuda?.length ? `<div class="card card-tight reveal"><h3>Al diligenciar, tenga en cuenta</h3><ul class="check-lista">${cfg.ayuda.map((t) => `<li>${icono('check', 'icon-sm')}<span>${t}</span></li>`).join('')}</ul></div>` : ''}
      <button type="button" class="btn btn-lg btn-block btn-primary" data-ir="${identificacion() ? 3 : 2}">Ya la diligencié: continuar ${icono('flecha', 'icon-sm')}</button>
    </div>`;
  }

  // ───────── Paso 2 ─────────
  function pasoIdentificacion() {
    const previo = identificacion() || {};
    const msActivo = estado.microsoft.activo && !estado.microsoft.error;
    const cuenta = estado.microsoft.cuenta;
    if (msActivo && !cuenta) {
      cont.innerHTML = `<div class="stack">
        <h2 class="paso-titulo">Ingrese con su cuenta institucional</h2>
        <div class="card ms-card reveal">
          <span class="ms-ico">${icono('persona', 'icon-lg')}</span>
          <p>El archivo se guarda en el SharePoint de la ${esc(estado.datos.config.evento.oficina)} y el ${cfg.tipo === 'accion' ? 'pase llega' : 'comprobante llega'} a su correo de Outlook. Para eso, ingrese con su cuenta <strong>${esc(dominio())}</strong>.</p>
          <button type="button" class="btn btn-lg btn-primary btn-block" data-ms-entrar>${icono('persona', 'icon-sm')}Ingresar con Microsoft 365</button>
        </div>
      </div>`;
      cont.querySelector('[data-ms-entrar]').addEventListener('click', async () => {
        try { await ctx.iniciarSesionMicrosoft(); } catch (e) { toastError('No se pudo iniciar sesión', e, e.message); }
      });
      return;
    }
    const correoInicial = cuenta ? String(cuenta.username || '').toLowerCase() : (previo.correo || '');
    cont.innerHTML = `<form class="stack" data-form-ident novalidate>
      <h2 class="paso-titulo">¿Quién registra?</h2>
      <div class="card reveal stack">
        <label class="field"><span class="field-label">Correo institucional</span>
          <div class="input-icon">${icono('correo')}<input class="input" name="correo" type="email" inputmode="email" autocomplete="email" placeholder="nombre.apellido${esc(dominio())}" value="${esc(correoInicial)}" ${cuenta ? 'readonly' : ''} required aria-describedby="correo-ayuda"></div>
          <span class="field-hint" id="correo-ayuda">${cuenta ? 'Tomado de su sesión de Microsoft 365.' : `Con él le buscamos en el directorio. Termina en ${esc(dominio())}.`}</span>
          <span class="field-error" data-error-correo role="alert"></span>
        </label>
        <div data-persona></div>
        <div class="grid-2 grid-form">
          <label class="field"><span class="field-label">Nombre del responsable</span><input class="input" name="nombre" autocomplete="name" required value="${esc(previo.correo === correoInicial ? previo.nombre || '' : '')}"></label>
          <label class="field"><span class="field-label">Cargo</span><input class="input" name="cargo" autocomplete="organization-title" required value="${esc(previo.correo === correoInicial ? previo.cargo || '' : '')}"></label>
        </div>
        <label class="field"><span class="field-label">Área funcional</span>
          <select class="select" name="area" required>${opcionesArea(previo.correo === correoInicial ? previo.areaId : '')}</select>
          <span class="field-hint" data-area-ayuda>Las 47 áreas de la plantilla, agrupadas por dependencia.</span>
        </label>
      </div>
      <div class="card reveal stack">
        <div><h3 class="mb-0">Equipo que recibe copia</h3><p class="muted mb-0">Correos institucionales de quienes formularon con usted (opcional).</p></div>
        <div class="chips-input" data-chips>
          <div class="chips-lista" data-chips-lista></div>
          <input class="chips-campo" type="email" inputmode="email" placeholder="correo${esc(dominio())} y Enter" aria-label="Agregar correo del equipo" data-chips-campo>
        </div>
        <span class="field-error" data-error-chips role="alert"></span>
        <div data-sugeridos></div>
      </div>
      <label class="consentimiento reveal"><input type="checkbox" name="consentimiento" required ${previo.consentimiento && previo.correo === correoInicial ? 'checked' : ''}>
        <span>${esc(estado.datos.config?.politicaDatos?.texto || 'Autorizo el tratamiento de mis datos para gestionar la jornada.')}${estado.datos.config?.politicaDatos?.url ? ` <a href="${esc(estado.datos.config.politicaDatos.url)}" target="_blank" rel="noopener">Política de tratamiento de datos</a>.` : ''}</span></label>
      <button type="submit" class="btn btn-lg btn-block btn-primary" data-continuar>Continuar ${icono('flecha', 'icon-sm')}</button>
    </form>`;

    const form = cont.querySelector('[data-form-ident]');
    const inCorreo = form.elements.correo;
    const inNombre = form.elements.nombre;
    const inCargo = form.elements.cargo;
    const selArea = form.elements.area;
    const cajaPersona = cont.querySelector('[data-persona]');
    let equipo = [...(previo.correo === correoInicial ? previo.correosEquipo || [] : [])];
    let persona = null;

    const pintarChips = () => {
      cont.querySelector('[data-chips-lista]').innerHTML = equipo.map((c) => `<span class="chip-correo">${esc(c)}<button type="button" aria-label="Quitar ${esc(c)}" data-quitar="${esc(c)}">${icono('cerrar', 'icon-sm')}</button></span>`).join('');
      pintarSugeridos();
    };
    const agregarCorreo = (texto) => {
      const err = cont.querySelector('[data-error-chips]');
      err.textContent = '';
      const lista = String(texto).split(/[\s,;]+/).map((x) => x.trim().toLowerCase()).filter(Boolean);
      for (let c of lista) {
        if (!c.includes('@')) c = `${c}${dominio()}`;
        if (!correoValido(c)) { err.textContent = `«${c}» no es un correo institucional válido (sin tildes ni espacios, termina en ${dominio()}).`; continue; }
        if (c === inCorreo.value.trim().toLowerCase() || equipo.includes(c)) continue;
        if (equipo.length >= 15) { err.textContent = 'Máximo 15 correos.'; break; }
        equipo.push(c);
      }
      pintarChips();
    };
    // Sugerencias del directorio: personas de la misma dependencia (y del mismo grupo primero)
    const pintarSugeridos = () => {
      const caja = cont.querySelector('[data-sugeridos]');
      const a = areaPorId(selArea.value);
      if (!a) { caja.innerHTML = ''; return; }
      const propio = inCorreo.value.trim().toLowerCase();
      const grupo = normalizar(persona?.grupo || a.nombre);
      const candidatos = (estado.datos.directorio?.personas || [])
        .filter((p) => String(p.dependencia) === String(a.dependencia) && p.correo && p.correo !== propio && !equipo.includes(p.correo.toLowerCase()))
        .map((p) => ({ p, s: normalizar(p.grupo || '') === grupo ? 0 : 1 }))
        .sort((x, y) => x.s - y.s || String(x.p.nombre).localeCompare(String(y.p.nombre)))
        .slice(0, 8);
      caja.innerHTML = candidatos.length ? `<div class="sugeridos"><span class="field-hint">Sugeridos del directorio · ${esc(dependencia(a.dependencia)?.nombre || a.dependencia)}</span>
        <div class="chips-sugeridos">${candidatos.map(({ p }) => `<button type="button" class="chip" data-sugerido="${esc(p.correo.toLowerCase())}">${icono('persona', 'icon-sm')}${esc(p.nombre || p.correo)}</button>`).join('')}</div></div>` : '';
    };

    const buscarPersona = () => {
      const correo = inCorreo.value.trim().toLowerCase();
      const err = cont.querySelector('[data-error-correo]');
      err.textContent = '';
      inCorreo.removeAttribute('aria-invalid');
      persona = null;
      if (!correo || !correo.includes('@')) { cajaPersona.innerHTML = ''; return; }
      if (!correoValido(correo)) {
        err.textContent = `Use su correo institucional terminado en ${dominio()}, sin tildes ni espacios.`;
        inCorreo.setAttribute('aria-invalid', 'true');
        cajaPersona.innerHTML = '';
        return;
      }
      const encontrados = personasPorCorreo(correo);
      if (!encontrados.length) {
        cajaPersona.innerHTML = `<div class="notice">${icono('info')}<div><strong>Correo no encontrado en el directorio.</strong> Puede continuar: el registro quedará como <em>no verificado</em> para revisión de la ${esc(estado.datos.config.evento.siglaOficina || 'OAP')}.</div></div>`;
        return;
      }
      if (encontrados.length > 1) {
        cajaPersona.innerHTML = `<div class="notice">${icono('personas')}<div><strong>Este buzón lo comparten ${encontrados.length} personas.</strong> Toque su nombre.
          <div class="chips-sugeridos" style="margin-top:8px">${encontrados.map((p) => `<button type="button" class="chip" data-elegir="${esc(p.id)}">${esc(p.nombre || 'Sin nombre')} · ${esc(tituloLegible(p.cargo))}</button>`).join('')}</div></div></div>`;
        return;
      }
      usarPersona(encontrados[0]);
    };
    const usarPersona = (p) => {
      persona = p;
      if (p.nombre) inNombre.value = p.nombre;
      if (p.cargo) inCargo.value = tituloLegible(p.cargo);
      const sug = sugerirArea(p);
      const ayuda = cont.querySelector('[data-area-ayuda]');
      if (sug && !selArea.value) { selArea.value = sug.id; ayuda.innerHTML = `${icono('chispa', 'icon-sm')} Sugerida por su grupo en el directorio: <strong>${esc(sug.nombre)}</strong>. Cámbiela si formula para otra área.`; }
      else if (!selArea.value) ayuda.textContent = `Su dependencia en el directorio: ${p.dependencia} · ${dependencia(p.dependencia)?.nombre || ''}. Elija el área para la que formula.`;
      cajaPersona.innerHTML = `<div class="persona-ok">${icono('usuarioCheck')}<span><strong>${esc(p.nombre || 'Persona del directorio')}</strong> · ${esc(tituloLegible(p.cargo))}<br><span class="muted">${esc(p.dependencia)} · ${esc(dependencia(p.dependencia)?.nombre || '')}${p.grupo ? ` · ${esc(p.grupo)}` : ''}</span></span></div>`;
      pintarSugeridos();
    };

    let t = null;
    inCorreo.addEventListener('input', () => { clearTimeout(t); t = setTimeout(buscarPersona, 250); });
    inCorreo.addEventListener('blur', () => { const v = inCorreo.value.trim(); if (v && !v.includes('@')) { inCorreo.value = `${v}${dominio()}`; buscarPersona(); } });
    selArea.addEventListener('change', () => {
      const a = areaPorId(selArea.value);
      cont.querySelector('[data-area-ayuda]').textContent = a ? `${a.proceso || ''}${a.revisar ? ' · La dependencia de esta área está por confirmar en el directorio.' : ''}` : '';
      pintarSugeridos();
    });
    const campo = cont.querySelector('[data-chips-campo]');
    campo.addEventListener('keydown', (ev) => {
      if (['Enter', ',', ';', ' '].includes(ev.key)) { ev.preventDefault(); if (campo.value.trim()) { agregarCorreo(campo.value); campo.value = ''; } }
      if (ev.key === 'Backspace' && !campo.value && equipo.length) { equipo.pop(); pintarChips(); }
    });
    campo.addEventListener('blur', () => { if (campo.value.trim()) { agregarCorreo(campo.value); campo.value = ''; } });
    campo.addEventListener('paste', (ev) => { const txt = ev.clipboardData?.getData('text'); if (txt && /[\s,;]/.test(txt)) { ev.preventDefault(); agregarCorreo(txt); } });
    on(cont, 'click', '[data-quitar]', (ev, b) => { equipo = equipo.filter((c) => c !== b.dataset.quitar); pintarChips(); });
    on(cont, 'click', '[data-sugerido]', (ev, b) => agregarCorreo(b.dataset.sugerido));
    on(cont, 'click', '[data-elegir]', (ev, b) => { const p = personasPorCorreo(inCorreo.value).find((x) => x.id === b.dataset.elegir); if (p) usarPersona(p); });
    cont.querySelector('[data-chips]').addEventListener('click', (ev) => { if (ev.target === ev.currentTarget || ev.target.matches('[data-chips-lista]')) campo.focus(); });

    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const correo = inCorreo.value.trim().toLowerCase();
      const faltan = [];
      if (!correoValido(correo)) faltan.push('un correo institucional válido');
      if (!inNombre.value.trim()) faltan.push('el nombre');
      if (!inCargo.value.trim()) faltan.push('el cargo');
      if (!selArea.value) faltan.push('el área funcional');
      if (!form.elements.consentimiento.checked) faltan.push('la autorización de tratamiento de datos');
      if (faltan.length) { toast({ tipo: 'warn', titulo: 'Faltan datos', mensaje: `Complete ${faltan.join(', ')}.` }); return; }
      const anterior = identificacion();
      const nuevo = {
        correo, nombre: inNombre.value.trim(), cargo: inCargo.value.trim(), areaId: selArea.value,
        correosEquipo: equipo, personaId: persona?.id || null,
        verificado: Boolean(persona) || Boolean(cuenta && cuenta.username?.toLowerCase() === correo),
        consentimiento: true, completa: true
      };
      if (!anterior || anterior.areaId !== nuevo.areaId || anterior.correo !== nuevo.correo) { s.validacion = null; s.archivo = null; s.ultimo = null; }
      guardarIdentificacion(nuevo);
      ctx.emitirIdentificacion?.();
      const a = areaPorId(nuevo.areaId);
      toast({ tipo: 'ok', titulo: `Hola, ${nuevo.nombre.split(' ')[0]}`, mensaje: `Registrará para ${a.nombre}.` });
      ir(3);
    });

    pintarChips();
    if (correoInicial) buscarPersona();
  }

  // ───────── Paso 3 ─────────
  function pasoCargue() {
    const i = identificacion();
    const previo = registroArea();
    const maxMB = estado.datos.config?.umbrales?.tamanoMaximoArchivoMB || 25;
    cont.innerHTML = `<div class="stack">
      ${tarjetaIdentidad(i)}
      <h2 class="paso-titulo">Cargue ${esc(cfg.nombreArchivo)}</h2>
      ${previo ? `<div class="notice notice-ok">${icono('checkCirculo')}<div><strong>Su área ya registró el ${esc(fechaCorta(previo.fecha.slice(0, 10)))}</strong> (${esc(previo.responsable?.nombre || '')}). Si carga una nueva versión, quedará como la vigente.
        <div class="btn-group" style="margin-top:8px"><button type="button" class="btn btn-sm" data-ir="4">Ver ${esc(cfg.tituloFinal.toLowerCase())}</button></div></div></div>` : ''}
      ${cfg.avisoCargue ? cfg.avisoCargue(i) : ''}
      <label class="dropzone" data-dropzone>
        <span class="dropzone-icon">${icono('subir', 'icon-lg')}</span>
        <strong class="ink">Toque para elegir el archivo</strong>
        <span class="muted">o arrástrelo aquí · Excel .xlsx · máximo ${maxMB} MB</span>
        <input type="file" accept=".xlsx,.xlsm,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" data-archivo aria-label="Elegir el archivo de Excel">
      </label>
      <p class="field-hint centro">${icono('ojo', 'icon-sm')} El archivo se revisa en su dispositivo${microsoftListo() ? ' y, al registrar, se guarda en SharePoint' : ''}.</p>
      <div data-resultado aria-live="polite"></div>
    </div>`;
    const zona = cont.querySelector('[data-dropzone]');
    const input = cont.querySelector('[data-archivo]');
    ['dragenter', 'dragover'].forEach((t) => zona.addEventListener(t, (ev) => { ev.preventDefault(); zona.classList.add('is-over'); }));
    ['dragleave', 'drop'].forEach((t) => zona.addEventListener(t, (ev) => { ev.preventDefault(); zona.classList.remove('is-over'); }));
    zona.addEventListener('drop', (ev) => { const f = ev.dataTransfer.files[0]; if (f) procesar(f); });
    input.addEventListener('change', () => { const f = input.files[0]; input.value = ''; if (f) procesar(f); });
    if (s.validacion && s.archivo) pintarResultado();
  }

  async function procesar(archivo) {
    const destino = cont.querySelector('[data-resultado]');
    destino.innerHTML = `<div class="card"><div class="row"><span class="spinner" aria-hidden="true"></span><strong class="ink">Revisando «${esc(archivo.name)}»…</strong></div><div class="skeleton skeleton-line" style="margin-top:16px"></div><div class="skeleton skeleton-line" style="width:70%"></div></div>`;
    await new Promise((r) => setTimeout(r, 30));
    try {
      if (!xlsxDisponible()) throw new Error('La librería de Excel no cargó. Revise su conexión y recargue la página.');
      const libro = await abrirLibro(archivo, { maxMB: estado.datos.config?.umbrales?.tamanoMaximoArchivoMB || 25 });
      s.validacion = cfg.validar(libro.wb, identificacion());
      s.archivo = archivo;
      pintarResultado();
      const b = s.validacion.bloqueantes;
      toast(b ? { tipo: 'warn', titulo: plural(b, 'punto por corregir', 'puntos por corregir'), mensaje: 'Corrija el archivo y vuelva a cargarlo.' }
        : { tipo: 'ok', titulo: 'Archivo válido', mensaje: 'Ya puede registrarlo.' });
    } catch (e) {
      console.error(e);
      s.validacion = null;
      destino.innerHTML = `<div class="notice notice-danger">${icono('alerta')}<div><strong>No se pudo leer el archivo.</strong> ${esc(e.message)}</div></div>`;
    }
  }

  function pintarResultado() {
    const v = s.validacion;
    const destino = cont.querySelector('[data-resultado]');
    const bloq = v.bloqueantes;
    const conMS = microsoftListo();
    const i = identificacion();
    const a = areaPorId(i.areaId);
    destino.innerHTML = `<div class="stack">
      <div class="resultado-banner ${bloq ? 'is-bloqueado' : 'is-ok'} reveal">
        <span class="resultado-ico">${icono(bloq ? 'bloqueo' : 'checkCirculo', 'icon-lg')}</span>
        <div><h3 class="mb-0">${bloq ? `${plural(bloq, 'punto bloquea', 'puntos bloquean')} el registro` : 'Archivo válido'}</h3>
          <p class="mb-0">${esc(s.archivo.name)}${v.advertencias ? ` · ${plural(v.advertencias, 'advertencia')}` : ''}</p></div>
      </div>
      <div class="cifras-mini">${cfg.cifras(v.resumen).map((c) => `<div class="cifra-mini${c.alerta ? ' is-alert' : ''}"><strong>${esc(c.valor)}</strong><span>${esc(c.etiqueta)}</span></div>`).join('')}</div>
      ${!bloq ? `<div class="card registrar-card reveal">
        <h3>Registrar ${esc(cfg.nombreCorto)}</h3>
        <dl class="dl-mini">
          <div><dt>Área</dt><dd>${esc(a.id)} · ${esc(a.nombre)}</dd></div>
          <div><dt>Dependencia</dt><dd>${esc(a.dependencia)} · ${esc(dependencia(a.dependencia)?.nombre || '')}</dd></div>
          <div><dt>Responsable</dt><dd>${esc(i.nombre)} · ${esc(i.correo)}</dd></div>
          ${i.correosEquipo.length ? `<div><dt>Copia a</dt><dd>${esc(i.correosEquipo.join(', '))}</dd></div>` : ''}
        </dl>
        ${conMS ? `<p class="field-hint">${icono('carpeta', 'icon-sm')} Se guardará en SharePoint › ${esc(estado.datos.config.microsoft.carpetaRaiz)} › ${esc(cfg.nombreCarpeta)} › ${esc(a.id)} - ${esc(a.nombre)}, y le llegará un correo${cfg.tipo === 'accion' ? ' con su pase QR' : ''}.</p>`
          : `<label class="field"><span class="field-label">Enlace donde reposa el archivo</span>
            <input class="input" name="enlace" type="url" inputmode="url" placeholder="https://itc-my.sharepoint.com/…" data-enlace>
            <span class="field-hint">Súbalo a su OneDrive o al SharePoint del área, use «Copiar vínculo» y péguelo aquí.</span></label>`}
        <button type="button" class="btn btn-lg btn-block btn-primary" data-registrar>${icono(cfg.tipo === 'accion' ? 'qr' : 'checkCirculo', 'icon-sm')}${esc(cfg.textoRegistrar)}</button>
      </div>` : ''}
      ${v.hallazgos.length ? `<div class="card reveal">
        <div class="card-head"><div><h3>${bloq ? 'Qué corregir' : 'Para revisar'}</h3><p>Cada punto indica la hoja, la fila y la corrección.</p></div>
          ${xlsxDisponible() ? `<button type="button" class="btn btn-sm" data-informe>${icono('excel', 'icon-sm')}Informe</button>` : ''}</div>
        <div class="chips-sugeridos" role="group" aria-label="Filtrar">
          ${[['todos', `Todos (${v.hallazgos.length})`], ['bloqueante', `Bloqueantes (${bloq})`], ['advertencia', `Advertencias (${v.advertencias})`]].map(([k, t]) => `<button type="button" class="chip" data-filtro="${k}" aria-pressed="${s.filtro === k}">${t}</button>`).join('')}
        </div>
        <ul class="findings" data-hallazgos></ul>
      </div>` : ''}
    </div>`;
    pintarHallazgos();
    activarAnimaciones(destino);
    if (!bloq) destino.querySelector('.registrar-card').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function pintarHallazgos() {
    const ul = cont.querySelector('[data-hallazgos]');
    if (!ul) return;
    const lista = s.validacion.hallazgos.filter((h) => s.filtro === 'todos' || h.severidad === s.filtro);
    ul.innerHTML = lista.length ? lista.slice(0, 60).map((h) => `<li class="finding ${h.severidad === 'bloqueante' ? 'finding-block' : 'finding-warn'}">
        <span class="finding-icon">${icono(h.severidad === 'bloqueante' ? 'bloqueo' : 'alerta', 'icon-sm')}</span>
        <div>
          <div class="finding-title">${esc(h.titulo)}</div>
          <div class="finding-meta"><span class="badge">Hoja ${esc(h.hoja)}</span>${h.fila ? `<span class="badge">Fila ${esc(h.fila)}</span>` : ''}</div>
          <p class="mb-0">${esc(h.detalle)}</p>
          <p class="finding-fix mb-0"><strong>Corrija:</strong> ${esc(h.correccion)}</p>
        </div></li>`).join('') + (lista.length > 60 ? `<li class="muted">… y ${lista.length - 60} más en el informe de Excel.</li>` : '')
      : `<li>${estadoVacio({ titulo: 'Nada en esta categoría', texto: 'Cambie el filtro para ver los demás puntos.', iconoNombre: 'checkCirculo' })}</li>`;
  }

  async function exportarInforme() {
    try {
      const i = identificacion();
      const a = areaPorId(i.areaId);
      const logo = await obtenerLogo();
      const r = exportarExcel({
        nombreArchivo: `JP2027_Revision_${cfg.tipo === 'accion' ? 'PlanAccion' : 'PlanNecesidades'}_${a.id}.xlsx`,
        logo: logo.bytes,
        hojas: [{
          nombre: 'Revisión', titulo: `Revisión del ${cfg.nombreCorto}`, subtitulo: `${a.etiqueta} · Archivo: ${s.archivo.name}`,
          columnas: [{ titulo: 'Severidad', ancho: 14 }, { titulo: 'Hoja', ancho: 22 }, { titulo: 'Fila', ancho: 8, tipo: 'numero' }, { titulo: 'Punto', ancho: 44 }, { titulo: 'Detalle', ancho: 60 }, { titulo: 'Corrección', ancho: 60 }],
          filas: s.validacion.hallazgos.map((h) => [h.severidad === 'bloqueante' ? 'Bloqueante' : 'Advertencia', h.hoja, h.fila, h.titulo, h.detalle, h.correccion])
        }]
      });
      descargarBlob(r.blob, r.nombre);
    } catch (e) { toastError('No se pudo exportar el informe', e, e.message); }
  }

  async function registrar(boton) {
    const i = identificacion();
    const campoEnlace = cont.querySelector('[data-enlace]');
    const enlace = campoEnlace ? campoEnlace.value.trim() : '';
    if (campoEnlace && enlace && !/^https:\/\/\S+$/i.test(enlace)) {
      campoEnlace.setAttribute('aria-invalid', 'true');
      toast({ tipo: 'warn', titulo: 'Enlace no válido', mensaje: 'Pegue el vínculo completo, empieza por https://' });
      return;
    }
    if (campoEnlace && !enlace) {
      campoEnlace.setAttribute('aria-invalid', 'true');
      campoEnlace.focus();
      toast({ tipo: 'warn', titulo: 'Falta el enlace', mensaje: 'Pegue el vínculo de OneDrive o SharePoint donde dejó el archivo, para que la OAP lo encuentre.' });
      return;
    }
    boton.disabled = true;
    boton.innerHTML = `<span class="spinner" aria-hidden="true"></span>${microsoftListo() ? 'Guardando en SharePoint…' : 'Registrando…'}`;
    try {
      const r = await registrarCargue({ tipo: cfg.tipo, ident: i, archivo: s.archivo, validacion: s.validacion, enlaceManual: enlace });
      await ctx.refrescarConsolidado();
      s.ultimo = { ...r, nuevo: true };
      s.validacion = null;
      s.archivo = null;
      ir(4);
    } catch (e) {
      toastError('No se pudo registrar', e, e.message);
      boton.disabled = false;
      boton.innerHTML = `${icono('refrescar', 'icon-sm')}Intentar de nuevo`;
    }
  }

  // ───────── Paso 4 ─────────
  function pasoFinal() {
    const i = identificacion();
    const registro = s.ultimo?.registro || registroArea();
    if (!registro) { ir(3); return; }
    const pase = s.ultimo?.pase || (registro.codigoPase ? estado.consolidado.pases.find((p) => p.id === registro.codigoPase) : null)
      || estado.consolidado.pases.find((p) => p.e === i.correo && p.a === i.areaId) || null;
    cont.innerHTML = `<div class="stack">
      ${s.ultimo?.nuevo ? `<div class="celebra reveal">${icono('checkCirculo', 'icon-lg')}<div><h2 class="mb-0">${esc(cfg.mensajeExito)}</h2><p class="mb-0">${esc(registro.id)} · ${esc(horaLegible(new Date(registro.fecha)))}</p></div></div>`
        : `<h2 class="paso-titulo">${esc(cfg.tituloFinal)}</h2>`}
      ${aviso(s.ultimo)}
      <div data-final></div>
      <div class="btn-group centro">
        <button type="button" class="btn btn-ghost" data-ir="3">${icono('refrescar', 'icon-sm')}Cargar una nueva versión</button>
        <button type="button" class="btn btn-ghost" data-otra>${icono('persona', 'icon-sm')}Registrar otra área</button>
      </div>
    </div>`;
    cfg.pintarFinal(cont.querySelector('[data-final]'), { registro, pase, ident: i, ctx });
    if (s.ultimo) s.ultimo.nuevo = false;
  }

  function aviso(ultimo) {
    if (!ultimo) return '';
    if (ultimo.correo.enviado) {
      const eq = ultimo.registro.correosEquipo.length;
      const detalleEquipo = !eq ? '' : cfg.tipo === 'accion'
        ? ` y ${plural(ultimo.correo.equipo || 0, 'pase personal enviado', 'pases personales enviados')} al equipo${ultimo.correo.fallidos ? ` (${plural(ultimo.correo.fallidos, 'envío falló', 'envíos fallaron')})` : ''}`
        : ` con copia a ${plural(eq, 'persona')} del equipo`;
      return `<div class="notice notice-ok">${icono('correo')}<div><strong>Correo enviado</strong> a ${esc(ultimo.registro.responsable.correo)}${detalleEquipo}.</div></div>`;
    }
    if (ultimo.correo.motivo === 'local') return `<div class="notice">${icono('info')}<div><strong>Registro guardado en este dispositivo.</strong> El envío automático de correos se activa cuando TIC configure Microsoft 365. Mientras tanto ${cfg.tipo === 'accion' ? 'guarde la imagen del pase' : 'guarde esta constancia'}.</div></div>`;
    return `<div class="notice notice-danger">${icono('alerta')}<div><strong>El registro quedó guardado, pero el correo no salió.</strong> ${esc(ultimo.correo.motivo)} ${cfg.tipo === 'accion' ? 'Guarde la imagen del pase.' : ''}</div></div>`;
  }

  // ───────── Eventos ─────────
  on(panel, 'click', '[data-ir]', (ev, b) => {
    const n = Number(b.dataset.ir);
    if (b.getAttribute('aria-disabled') === 'true') { toast({ tipo: 'info', titulo: 'Paso bloqueado', mensaje: n === 4 ? 'Primero registre su archivo.' : 'Primero identifíquese.' }); return; }
    ir(n);
  });
  on(panel, 'click', '[data-registrar]', (ev, b) => registrar(b));
  on(panel, 'click', '[data-informe]', exportarInforme);
  on(panel, 'click', '[data-filtro]', (ev, b) => {
    s.filtro = b.dataset.filtro;
    cont.querySelectorAll('[data-filtro]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    pintarHallazgos();
  });
  on(panel, 'click', '[data-otra]', () => { s.ultimo = null; s.validacion = null; s.archivo = null; guardarIdentificacion(null); ctx.emitirIdentificacion?.(); ir(2); });
  on(panel, 'click', '[data-descarga]', (ev, b) => toast({ tipo: 'ok', titulo: 'Descarga iniciada', mensaje: b.getAttribute('download') }));
  on(panel, 'input', '[data-enlace]', (ev, el) => el.removeAttribute('aria-invalid'));

  alEvento('sesion', () => { if (s.paso === 2) ir(2, { foco: false }); });
  alEvento('consolidado', () => pintarHero());
  alEvento('identificacion', () => { if (s.paso >= 2) ir(identificacion() ? Math.min(s.paso, 3) : 2, { foco: false }); else pintarHero(); });

  // Paso inicial: quien ya registró ve su resultado; quien ya se identificó, el cargue
  const i = identificacion();
  ir(i ? (registroArea() ? 4 : 1) : 1, { foco: false });

  return {
    alMostrar() { pintarHero(); if (s.paso === 4 || s.paso === 3) ir(s.paso, { foco: false }); }
  };
}

Object.assign(__m["src/ui/cargue.js"], { identificacion, montarFlujo });
})();

// ── src/tabs/calendario.js ──
__m["src/tabs/calendario.js"] = {};
(function () {
/*
 * calendario.js — Pestaña 1: Calendario de la Jornada de Planeación Institucional 2027.
 * Cuenta regresiva, descarga del cronograma en PDF y del calendario para Outlook (.ics),
 * agenda de los tres días con el bloque en curso resaltado, y la ruta de planeación (antes, durante, después).
 */
const { estado, on: alEvento, area: areaPorId } = __m["src/estado.js"];
const { esc, on } = __m["src/ui/dom.js"];
const { icono } = __m["src/ui/iconos.js"];
const { toast, toastError } = __m["src/ui/toast.js"];
const { cronogramaAPdf, generarICS, descargarTexto, pdfDisponible } = __m["src/lib/export.js"];
const { rangoFechasTexto, fechaCorta, hoyISO, deISO } = __m["src/lib/fechas.js"];
const { identificacion } = __m["src/ui/cargue.js"];

let raiz = null;
let ctxApp = null;
let diaSel = null;
let reloj = null;

const TIPOS = { llegada: 'Llegada', sesion: 'Sesión', taller: 'Taller', receso: 'Receso' };
const agenda = () => estado.datos.agenda || { dias: [] };
// Hora de Bogotá (UTC−5, sin horario de verano)
const instante = (fecha, hhmm) => new Date(`${fecha}T${hhmm}:00-05:00`);

function diaCorto(iso) {
  const d = deISO(iso);
  return d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '');
}

function estadoJornada(ahora = new Date()) {
  const dias = agenda().dias || [];
  if (!dias.length) return { fase: 'sin-datos' };
  const ini = instante(dias[0].fecha, dias[0].bloques?.[0]?.inicio || '08:00');
  const ultimo = dias[dias.length - 1];
  const fin = instante(ultimo.fecha, ultimo.bloques?.[ultimo.bloques.length - 1]?.fin || '17:00');
  if (ahora < ini) return { fase: 'antes', ms: ini - ahora };
  if (ahora > fin) return { fase: 'despues' };
  const hoy = dias.find((d) => d.fecha === new Date(ahora.getTime() - 5 * 3600000).toISOString().slice(0, 10));
  const bloque = hoy?.bloques.find((b) => ahora >= instante(hoy.fecha, b.inicio) && ahora < instante(hoy.fecha, b.fin));
  return { fase: 'durante', dia: hoy, bloque };
}

function pintarCuenta() {
  if (!raiz) return;
  const caja = raiz.querySelector('[data-cuenta]');
  const e = estadoJornada();
  if (e.fase === 'antes') {
    const d = Math.floor(e.ms / 86400000);
    const h = Math.floor((e.ms % 86400000) / 3600000);
    const m = Math.floor((e.ms % 3600000) / 60000);
    caja.innerHTML = `<div class="cuenta" role="timer" aria-label="Faltan ${d} días, ${h} horas y ${m} minutos">
      <div><strong>${d}</strong><span>${d === 1 ? 'día' : 'días'}</span></div>
      <div><strong>${String(h).padStart(2, '0')}</strong><span>horas</span></div>
      <div><strong>${String(m).padStart(2, '0')}</strong><span>min</span></div></div>`;
  } else if (e.fase === 'durante') {
    caja.innerHTML = `<div class="hero-estado"><span class="pulse" aria-hidden="true"></span><span><strong>En curso · Día ${e.dia?.numero || ''}</strong>${e.bloque ? ` · ${esc(e.bloque.titulo)}` : ''}</span></div>`;
  } else if (e.fase === 'despues') {
    caja.innerHTML = `<div class="hero-estado">${icono('checkCirculo', 'icon-sm')}<span><strong>La jornada finalizó.</strong> Gracias por participar.</span></div>`;
  } else caja.innerHTML = '';
  if (e.fase === 'durante') pintarDia(false);
}

function tarjetaPase() {
  const i = identificacion();
  const pase = i ? estado.consolidado.pases.find((p) => p.e === i.correo && p.a === i.areaId) : null;
  if (pase) {
    const a = areaPorId(pase.a);
    return `<a class="pase-cta is-ok" href="#accion">${icono('qr', 'icon-lg')}<span><strong>Su pase está listo</strong><small>${esc(pase.id)}${a ? ` · ${esc(a.nombre)}` : ''}</small></span>${icono('derecha', 'icon-sm')}</a>`;
  }
  return `<a class="pase-cta" href="#accion">${icono('qr', 'icon-lg')}<span><strong>Obtenga su pase de entrada</strong><small>Se emite al registrar el Plan de acción de su área. Sin pase no hay ingreso.</small></span>${icono('derecha', 'icon-sm')}</a>`;
}

function pintarDia(animar = true) {
  const dia = (agenda().dias || []).find((d) => d.id === diaSel);
  const cont = raiz.querySelector('[data-dia]');
  if (!dia) { cont.innerHTML = ''; return; }
  const ahora = new Date();
  const esHoy = dia.fecha === new Date(ahora.getTime() - 5 * 3600000).toISOString().slice(0, 10);
  raiz.querySelectorAll('[data-sel-dia]').forEach((b) => { const s = b.dataset.selDia === dia.id; b.setAttribute('aria-selected', String(s)); b.tabIndex = s ? 0 : -1; });
  cont.innerHTML = `<div class="dia-cabeza">
      <span class="dia-num">Día ${dia.numero}</span>
      <div><h3 class="mb-0">${esc(dia.titulo)}</h3><span class="muted">${esc(diaCorto(dia.fecha))} · ${esc(dia.bloques[0]?.inicio || '')}–${esc(dia.bloques[dia.bloques.length - 1]?.fin || '')}</span></div>
    </div>
    <ol class="agenda-lista">
      ${dia.bloques.map((b) => {
        const ini = instante(dia.fecha, b.inicio);
        const fin = instante(dia.fecha, b.fin);
        const actual = esHoy && ahora >= ini && ahora < fin;
        const pasado = ahora >= fin;
        if (b.tipo === 'receso' || b.tipo === 'llegada') {
          return `<li class="agenda-item is-breve${actual ? ' is-actual' : ''}${pasado ? ' is-pasado' : ''}">
            <span class="agenda-hora">${esc(b.inicio)}</span>
            <span class="agenda-breve">${icono(b.tipo === 'llegada' ? 'personas' : 'reloj', 'icon-sm')}${esc(b.titulo)} · ${esc(b.inicio)}–${esc(b.fin)}</span></li>`;
        }
        return `<li class="agenda-item tipo-${esc(b.tipo)}${actual ? ' is-actual' : ''}${pasado ? ' is-pasado' : ''}"${actual ? ' aria-current="time"' : ''}>
          <span class="agenda-hora">${esc(b.inicio)}<small>${esc(b.fin)}</small></span>
          <div class="agenda-card">
            <div class="row" style="gap:6px"><span class="badge ${b.tipo === 'taller' ? 'badge-solid' : ''}">${esc(TIPOS[b.tipo] || b.tipo)}</span>${actual ? '<span class="badge badge-ok"><span class="pulse" aria-hidden="true"></span>Ahora</span>' : ''}</div>
            <strong class="agenda-titulo">${esc(b.titulo)}</strong>
            ${b.detalle && b.detalle !== b.titulo ? `<p class="mb-0">${esc(b.detalle)}</p>` : ''}
            ${b.responsable ? `<span class="agenda-resp">${icono('persona', 'icon-sm')}${esc(b.responsable)}</span>` : ''}
          </div></li>`;
      }).join('')}
    </ol>
    ${dia.resultado ? `<div class="resultado-dia">${icono('diana')}<div><span class="eyebrow">Resultado del día</span><p class="mb-0">${esc(dia.resultado)}</p></div></div>` : ''}`;
  if (animar) { cont.classList.remove('paso-enter'); void cont.offsetWidth; cont.classList.add('paso-enter'); }
}

function pintarRuta() {
  const ruta = agenda().ruta;
  const cont = raiz.querySelector('[data-ruta]');
  if (!ruta) { cont.innerHTML = ''; return; }
  const hoy = hoyISO();
  const estadoHito = (h) => (h.hasta < hoy ? 'hecho' : h.desde <= hoy ? 'curso' : 'proximo');
  const etiqueta = { hecho: 'Cumplido', curso: 'En curso', proximo: 'Próximo' };
  const rango = (h) => (h.desde === h.hasta ? fechaCorta(h.desde) : `${fechaCorta(h.desde).replace(/ \d{4}$/, '')} – ${fechaCorta(h.hasta)}`);
  cont.innerHTML = `<div class="card-head"><div><h2 class="mb-0">${esc(ruta.titulo)}</h2><p>${esc(ruta.nota || '')}</p></div></div>
    <div class="ruta">
      ${ruta.fases.map((f) => `<section class="ruta-fase reveal" aria-label="${esc(f.titulo)}">
        <h3>${esc(f.titulo)}</h3>
        <ol class="ruta-hitos">${f.hitos.map((h) => { const e = estadoHito(h); return `<li class="hito is-${e}">
          <span class="hito-punto" aria-hidden="true">${e === 'hecho' ? icono('check', 'icon-sm') : ''}</span>
          <div><strong>${esc(h.actividad)}</strong><span class="hito-meta">${esc(rango(h))} · ${esc(h.responsable)}</span><span class="sr-only">${etiqueta[e]}</span></div>
          ${e === 'curso' ? '<span class="badge badge-ok">En curso</span>' : ''}</li>`; }).join('')}</ol>
      </section>`).join('')}
    </div>
    ${ruta.resultado ? `<div class="resultado-dia">${icono('bandera')}<div><span class="eyebrow">Resultado esperado</span><p class="mb-0">${esc(ruta.resultado)}</p></div></div>` : ''}`;
}

function montar(panel, ctx) {
  raiz = panel;
  ctxApp = ctx;
  const ag = agenda();
  const ev = estado.datos.config?.evento || {};
  const dias = ag.dias || [];
  const hoy = new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 10);
  diaSel = (dias.find((d) => d.fecha === hoy) || dias[0])?.id || null;

  panel.innerHTML = `<div class="container page page-app">
    <section class="hero-card hero-cal reveal">
      <span class="eyebrow">${icono('agenda', 'icon-sm')}${esc(ev.institucion || 'ETITC')}</span>
      <h1>${esc(ag.titulo || ev.nombre)}</h1>
      <p class="hero-lema">«${esc(ag.lema || ev.lema || '')}»</p>
      <div class="hero-datos">
        <span>${icono('agenda', 'icon-sm')}${esc(rangoFechasTexto(dias.map((d) => d.fecha)))}</span>
        <span>${icono('lugar', 'icon-sm')}${esc(ag.sede || 'Sede por confirmar')}</span>
        <span>${icono('reloj', 'icon-sm')}${esc(dias[0]?.bloques?.[0]?.inicio || '8:00')} a ${esc(dias[0]?.bloques?.[dias[0].bloques.length - 1]?.fin || '17:00')}</span>
      </div>
      <div data-cuenta></div>
      <div class="btn-grid hero-botones">
        <button type="button" class="btn btn-hero btn-lg" data-pdf>${icono('pdf', 'icon-sm')}Cronograma PDF</button>
        <button type="button" class="btn btn-lg btn-vidrio" data-ics>${icono('calendarioMas', 'icon-sm')}Agregar a Outlook</button>
      </div>
    </section>

    <div data-pase-cta>${tarjetaPase()}</div>

    <section class="card reveal" aria-label="Agenda por día">
      <div class="segmentado-dias" role="tablist" aria-label="Día de la jornada">
        ${dias.map((d) => `<button type="button" role="tab" data-sel-dia="${esc(d.id)}" aria-selected="false" tabindex="-1"><strong>Día ${d.numero}</strong><span>${esc(diaCorto(d.fecha))}</span></button>`).join('')}
      </div>
      <div data-dia aria-live="polite"></div>
      ${ag.nota ? `<p class="field-hint mb-0" style="margin-top:14px">${icono('info', 'icon-sm')} ${esc(ag.nota)}</p>` : ''}
    </section>

    <section class="card reveal" data-ruta></section>
  </div>`;

  pintarDia(false);
  pintarRuta();
  pintarCuenta();
  reloj = setInterval(pintarCuenta, 30000);

  on(panel, 'click', '[data-sel-dia]', (ev2, b) => { diaSel = b.dataset.selDia; pintarDia(); });
  panel.querySelector('.segmentado-dias').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const i = dias.findIndex((d) => d.id === diaSel);
    diaSel = dias[(i + (e.key === 'ArrowRight' ? 1 : dias.length - 1)) % dias.length].id;
    pintarDia();
    panel.querySelector(`[data-sel-dia="${diaSel}"]`).focus();
  });
  on(panel, 'click', '[data-pdf]', async (e2, b) => {
    try {
      if (!pdfDisponible()) throw new Error('La librería de PDF no cargó. Revise la conexión y recargue.');
      b.disabled = true;
      await cronogramaAPdf({ agenda: ag, evento: ev });
      toast({ tipo: 'ok', titulo: 'Cronograma descargado', mensaje: 'Cronograma_Jornada_Planeacion_2027.pdf' });
    } catch (e) { toastError('No se pudo generar el PDF', e, e.message); } finally { b.disabled = false; }
  });
  on(panel, 'click', '[data-ics]', () => {
    try {
      descargarTexto(generarICS({ agenda: ag, evento: ev }), 'Jornada_Planeacion_2027.ics', 'text/calendar;charset=utf-8');
      toast({ tipo: 'ok', titulo: 'Calendario descargado', mensaje: 'Ábralo para agregar las sesiones a Outlook o a su celular.' });
    } catch (e) { toastError('No se pudo crear el calendario', e, e.message); }
  });
  const refrescarPase = () => { const c = panel.querySelector('[data-pase-cta]'); if (c) c.innerHTML = tarjetaPase(); };
  alEvento('consolidado', refrescarPase);
  alEvento('identificacion', refrescarPase);
}

const pestanaCalendario = {
  id: 'calendario',
  titulo: 'Calendario',
  tituloCorto: 'Calendario',
  tituloMovil: 'Calendario',
  icono: 'agenda',
  montar,
  alMostrar() { pintarCuenta(); const c = raiz?.querySelector('[data-pase-cta]'); if (c) c.innerHTML = tarjetaPase(); if (!reloj) reloj = setInterval(pintarCuenta, 30000); },
  alOcultar() { clearInterval(reloj); reloj = null; }
};

Object.assign(__m["src/tabs/calendario.js"], { pestanaCalendario });
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

// ── src/ui/pase.js ──
__m["src/ui/pase.js"] = {};
(function () {
/*
 * pase.js — Tarjeta del pase de acceso (tipo pase de abordar) y sus acciones:
 * descargar PNG o PDF, compartir desde el celular (Web Share) y copiar el código.
 * La usan la pestaña Plan de acción (al registrar) y cualquier vista que deba volver a mostrar el pase.
 */
const { estado, area: areaPorId, dependencia } = __m["src/estado.js"];
const { esc, on } = __m["src/ui/dom.js"];
const { icono } = __m["src/ui/iconos.js"];
const { toast, toastError } = __m["src/ui/toast.js"];
const { contenidoQR, qrComoDataUrl, qrDisponible } = __m["src/lib/qr.js"];
const { obtenerLogo, elementoAPng, elementoAPdf, capturarElemento, capturaDisponible, pdfDisponible, copiarTexto } = __m["src/lib/export.js"];
const { rangoFechasTexto, fechaCorta } = __m["src/lib/fechas.js"];

function datosEvento() {
  const agenda = estado.datos?.agenda || {};
  return {
    nombre: estado.datos?.config?.evento?.nombreCorto || 'Jornada de Planeación 2027',
    fechas: rangoFechasTexto((agenda.dias || []).map((d) => d.fecha)),
    sede: agenda.sede && agenda.sede !== 'Por confirmar' ? agenda.sede : ''
  };
}

// HTML de la tarjeta. El QR se pinta después con pintarQR (es asíncrono).
function htmlPase(pase, logoDataUrl) {
  const a = pase.a ? areaPorId(pase.a) : null;
  const d = dependencia(pase.d);
  const ev = datosEvento();
  return `<article class="pase" data-pase aria-label="Pase de acceso de ${esc(pase.n)}">
    <div class="pase-head">
      <span class="pase-logo"><img src="${esc(logoDataUrl || 'assets/logo-etitc.png')}" alt="Logo de la Escuela Tecnológica Instituto Técnico Central"></span>
      <span class="pase-kicker">Pase de acceso</span>
      <span class="pase-evento">${esc(ev.nombre)}</span>
    </div>
    <div class="pase-persona">
      <strong class="pase-nombre">${esc(pase.n)}</strong>
      <span class="pase-cargo">${esc(pase.c)}</span>
    </div>
    <div class="pase-dep">
      <span class="pase-dep-cod">${esc(a ? a.id : pase.d)}</span>
      <span>${esc(a ? a.nombre : (d?.nombre || ''))}<small>${esc(pase.d)} · ${esc(d?.nombre || '')}</small></span>
    </div>
    <div class="pase-qr" data-qr><span class="spinner" aria-hidden="true"></span></div>
    <div class="pase-id mono">${esc(pase.id)}</div>
    <div class="pase-corte" aria-hidden="true"></div>
    <div class="pase-meta">
      <span><b>${esc(ev.fechas)}</b></span>
      ${ev.sede ? `<span>${esc(ev.sede)}</span>` : ''}
      <span>Emitido el ${esc(fechaCorta(String(pase.emitido || new Date(pase.ts).toISOString()).slice(0, 10)))} · personal e intransferible</span>
    </div>
  </article>`;
}

async function pintarQR(raiz, pase) {
  const caja = raiz.querySelector('[data-qr]');
  if (!caja) return;
  const intentar = async () => {
    const url = await qrComoDataUrl(contenidoQR(pase), { tamano: 400 });
    caja.innerHTML = `<img src="${url}" alt="Código QR del pase ${esc(pase.id)}" width="200" height="200">`;
  };
  try {
    if (!qrDisponible()) {
      // La librería puede estar terminando de cargar
      await new Promise((r) => setTimeout(r, 1200));
      if (!qrDisponible()) throw new Error('sin librería');
    }
    await intentar();
  } catch {
    caja.innerHTML = `<div class="pase-qr-fallback">${icono('qr', 'icon-lg')}<span>QR no disponible en este momento. En el ingreso pueden registrarle con el código de abajo.</span></div>`;
  }
}

// Monta el pase y sus botones dentro de «cont». Devuelve una promesa que termina cuando el QR está pintado.
async function montarPase(cont, pase, { extra = '' } = {}) {
  const logo = await obtenerLogo().catch(() => ({ dataUrl: null }));
  const puedeCompartir = Boolean(navigator.share && navigator.canShare);
  cont.innerHTML = `<div class="pase-layout">
    <div class="pase-wrap">${htmlPase(pase, logo.dataUrl)}</div>
    <div class="pase-acciones">
      <div class="btn-grid">
        <button type="button" class="btn btn-primary btn-lg" data-pase-accion="png" ${capturaDisponible() ? '' : 'disabled'}>${icono('imagen', 'icon-sm')}Guardar imagen</button>
        <button type="button" class="btn btn-lg" data-pase-accion="pdf" ${capturaDisponible() && pdfDisponible() ? '' : 'disabled'}>${icono('pdf', 'icon-sm')}PDF</button>
        ${puedeCompartir ? `<button type="button" class="btn btn-lg" data-pase-accion="compartir">${icono('enlace', 'icon-sm')}Compartir</button>` : ''}
        <button type="button" class="btn btn-lg" data-pase-accion="copiar">${icono('copiar', 'icon-sm')}Copiar código</button>
      </div>
      ${capturaDisponible() ? '' : '<p class="field-hint">La descarga como imagen no está disponible porque una librería no cargó. Tome una captura de pantalla del pase.</p>'}
      ${extra}
    </div>
  </div>`;
  await pintarQR(cont, pase);
  on(cont, 'click', '[data-pase-accion]', async (ev, b) => {
    const accion = b.dataset.paseAccion;
    const tarjeta = cont.querySelector('[data-pase]');
    try {
      b.disabled = true;
      if (accion === 'png') { await elementoAPng(tarjeta, `Pase_${pase.id}.png`); toast({ tipo: 'ok', titulo: 'Imagen guardada', mensaje: `Pase_${pase.id}.png` }); }
      if (accion === 'pdf') { await elementoAPdf(tarjeta, `Pase_${pase.id}.pdf`); toast({ tipo: 'ok', titulo: 'PDF descargado', mensaje: `Pase_${pase.id}.pdf` }); }
      if (accion === 'compartir') {
        const canvas = await capturarElemento(tarjeta, 2.5);
        const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
        const archivo = new File([blob], `Pase_${pase.id}.png`, { type: 'image/png' });
        const datos = { title: 'Pase de acceso — Jornada de Planeación 2027', text: `Mi pase ${pase.id}` };
        if (navigator.canShare({ files: [archivo] })) datos.files = [archivo];
        try { await navigator.share(datos); } catch (e) { if (e.name !== 'AbortError') throw e; }
      }
      if (accion === 'copiar') {
        const ok = await copiarTexto(pase.id);
        toast(ok ? { tipo: 'ok', titulo: 'Código copiado', mensaje: pase.id } : { tipo: 'warn', titulo: 'No se pudo copiar', mensaje: 'Su navegador bloqueó el portapapeles.' });
      }
    } catch (e) { toastError('No se pudo completar la acción', e, e.message); } finally { b.disabled = false; }
  });
}

Object.assign(__m["src/ui/pase.js"], { htmlPase, pintarQR, montarPase });
})();

// ── src/lib/validar-accion.js ──
__m["src/lib/validar-accion.js"] = {};
(function () {
/*
 * validar-accion.js — Validación de la «Plantilla de Formulación 2027» diligenciada por un área funcional.
 * Replica, fila por fila, la «Alerta de consistencia» de la propia plantilla (columna AF de las hojas de eje y
 * columna W de las acciones adicionales del buscador) y agrega revisiones de la cadena lógica:
 *   - todas las metas asignadas al área formuladas (configurable),
 *   - acciones adicionales del área,
 *   - decisión sobre los compromisos pendientes 2026.
 * Es una función pura sobre el libro leído con SheetJS: no toca el DOM y se prueba en Node.
 */
const { hoja, encabezados, filaComoObjeto, vacio, texto, fechaValida } = __m["src/lib/libro.js"];
const { normalizar } = __m["src/lib/formato.js"];

const EJES = ['Eje1', 'Eje2', 'Eje3', 'Eje4', 'Eje5', 'Eje6'];

const COLUMNAS_EJE = {
  idAsignacion: 'Id asignación', codigoMeta: 'Código meta', meta: 'Meta estratégica (PDI)', idArea: 'Id área', area: 'Área funcional',
  nombre: 'Nombre de la acción', descripcion: 'Descripción de la acción', producto: 'Producto esperado',
  inicio: 'Fecha de inicio', fin: 'Fecha de fin', responsable: 'Responsable (correo institucional)', indicador: 'Indicador de seguimiento',
  metaAccion: 'Meta 2027 de la acción', unidad: 'Unidad de medida', dimension: 'Dimensión de impacto',
  impacto: 'Indicador de impacto (Guía Metodológica)', retoma: '¿Retoma un compromiso pendiente 2026?', evidencia: 'Evidencia verificable',
  observaciones: 'Observaciones', alerta: 'Alerta de consistencia'
};

const COLUMNAS_ADICIONALES = {
  area: 'Área funcional (lista)', codigoMeta: 'Código de meta PDI (lista)', meta: 'Meta estratégica (PDI)', origen: 'Origen de la acción',
  nombre: 'Nombre de la acción', descripcion: 'Descripción de la acción', producto: 'Producto esperado',
  inicio: 'Fecha de inicio', fin: 'Fecha de fin', responsable: 'Responsable (correo institucional)', indicador: 'Indicador de seguimiento',
  metaAccion: 'Meta 2027 de la acción', unidad: 'Unidad de medida', dimension: 'Dimensión de impacto',
  impacto: 'Indicador de impacto (Guía Metodológica)', retoma: '¿Retoma un compromiso pendiente 2026?', evidencia: 'Evidencia verificable', alerta: 'Alerta de consistencia'
};

const ETIQUETAS = {
  producto: 'Producto esperado', inicio: 'Fecha de inicio', fin: 'Fecha de fin', responsable: 'Responsable', indicador: 'Indicador de seguimiento',
  metaAccion: 'Meta 2027 de la acción', dimension: 'Dimensión de impacto', impacto: 'Indicador de impacto', area: 'Área funcional',
  codigoMeta: 'Código de meta', origen: 'Origen de la acción'
};

// ¿La etiqueta de área del Excel («A05 · Planeación y Plan de Acción (101)») corresponde al área?
function esDelArea(valorCelda, areaId) {
  const t = texto(valorCelda).toUpperCase();
  return t === areaId || t.startsWith(`${areaId} `) || t.startsWith(`${areaId}·`);
}

// Asignaciones de la hoja oculta Base_OAPDI agrupadas por eje (E1-001 → eje 1), en su orden original.
function bloquesBase(wb) {
  const mapa = new Map();
  const h = hoja(wb, 'Base_OAPDI');
  if (!h) return mapa;
  const e = encabezados(wb, h.ws, { idAsignacion: 'Id asignación', codigoMeta: 'Código meta', meta: 'Meta estratégica (PDI)', idArea: 'Id área', area: 'Área funcional' });
  if (!e || e.col.idAsignacion === undefined || e.col.idArea === undefined) return mapa;
  for (let f = e.fila + 1; f <= e.ultimaFila; f += 1) {
    const o = filaComoObjeto(wb, h.ws, f, e.col);
    const m = /^E(\d)-/i.exec(texto(o.idAsignacion));
    if (!m) continue;
    const n = Number(m[1]);
    if (!mapa.has(n)) mapa.set(n, []);
    delete o._fila;
    mapa.get(n).push(o);
  }
  return mapa;
}

// Mapa «indicador de impacto» → «dimensiones permitidas», leído de la hoja oculta Catalogos del propio libro.
function catalogoImpacto(wb) {
  const h = hoja(wb, 'Catalogos');
  if (!h) return null;
  const e = encabezados(wb, h.ws, { imp: 'Indicador de impacto (etiqueta de lista)', dims: 'Dimensiones de la categoría' });
  if (!e || e.col.imp === undefined || e.col.dims === undefined) return null;
  const mapa = new Map();
  for (let f = e.fila + 1; f <= e.ultimaFila; f += 1) {
    const o = filaComoObjeto(wb, h.ws, f, { imp: e.col.imp, dims: e.col.dims });
    if (!vacio(o.imp)) mapa.set(normalizar(o.imp), texto(o.dims));
  }
  return mapa;
}

/*
 * Evalúa una acción con las mismas reglas y el mismo orden de la fórmula de la plantilla.
 * Devuelve { estado: 'pendiente'|'ok'|'error', mensaje, faltan }.
 */
function evaluar(o, requeridos, impactos, anio, campoNombre = 'nombre') {
  if (vacio(o[campoNombre])) return { estado: 'pendiente', mensaje: 'Pendiente por formular' };
  const faltan = requeridos.filter((k) => vacio(o[k]));
  if (faltan.length) return { estado: 'error', mensaje: 'Incompleta: faltan campos obligatorios', faltan };
  const ini = fechaValida(o.inicio);
  const fin = fechaValida(o.fin);
  if (!ini || !fin) return { estado: 'error', mensaje: 'Fecha inválida' };
  if (fin < ini) return { estado: 'error', mensaje: 'La fecha de fin es anterior a la de inicio' };
  if (ini.slice(0, 4) !== String(anio) || fin.slice(0, 4) !== String(anio)) return { estado: 'error', mensaje: `Fechas fuera de la vigencia ${anio}` };
  if (!/@itc\.edu\.co/i.test(texto(o.responsable))) return { estado: 'error', mensaje: 'El responsable no tiene correo institucional' };
  if (impactos) {
    const dims = impactos.get(normalizar(o.impacto));
    if (dims === undefined || !normalizar(dims).includes(normalizar(o.dimension))) return { estado: 'error', mensaje: 'La dimensión no corresponde al indicador de impacto' };
  }
  return { estado: 'ok', mensaje: 'OK' };
}

const CORRECCION = {
  'Incompleta: faltan campos obligatorios': 'Complete las columnas amarillas indicadas en esa fila.',
  'Fecha inválida': 'Escriba las fechas como fecha de Excel (dd/mm/aaaa), no como texto.',
  'La fecha de fin es anterior a la de inicio': 'Corrija las fechas: la de fin debe ser igual o posterior a la de inicio.',
  'Fechas fuera de la vigencia 2027': 'Las dos fechas deben estar dentro de 2027.',
  'El responsable no tiene correo institucional': 'Escriba el correo institucional del responsable (termina en @itc.edu.co), sin tildes.',
  'La dimensión no corresponde al indicador de impacto': 'Elija una dimensión que corresponda a la categoría del indicador de impacto (la columna «Categoría de impacto» de la plantilla lo indica).'
};

const productoNoValido = (p) => {
  const n = normalizar(p);
  return /(contrat\w* (de |del )?(personal|profesional|contratista)|estudios? previos)/.test(n);
};

/*
 * validarFormulacion(wb, { areaId, areaEtiqueta, anio=2027, exigirTodasLasMetas=true })
 * Devuelve { tipoDetectado, hallazgos, resumen, acciones, bloqueantes, advertencias }.
 */
function validarFormulacion(wb, opciones) {
  const { areaId, areaEtiqueta = areaId, anio = 2027, exigirTodasLasMetas = true } = opciones;
  const hallazgos = [];
  const agregar = (severidad, hojaN, fila, titulo, detalle, correccion) => hallazgos.push({ id: `H${hallazgos.length + 1}`, severidad, hoja: hojaN, fila, titulo, detalle, correccion });
  const resultado = (tipoDetectado, resumen = {}, acciones = []) => {
    const bloqueantes = hallazgos.filter((h) => h.severidad === 'bloqueante').length;
    return { tipoDetectado, hallazgos: ordenar(hallazgos), resumen: { ...resumen, bloqueantes, advertencias: hallazgos.length - bloqueantes }, acciones, bloqueantes, advertencias: hallazgos.length - bloqueantes };
  };

  // 1. ¿Es el libro correcto?
  if (hoja(wb, 'Formulación PDN 2027')) {
    agregar('bloqueante', '—', null, 'Este archivo es el Plan de Necesidades',
      'Cargó el libro «Plan de Necesidades 2027». En esta pestaña se carga la «Plantilla de Formulación 2027».',
      'Cargue aquí la Plantilla de Formulación diligenciada. El Plan de Necesidades se carga en la pestaña «Plan de necesidades».');
    return resultado('necesidades');
  }
  const hojasEje = EJES.map((e) => hoja(wb, e, { prefijo: true }));
  if (hojasEje.every((h) => !h) && (hoja(wb, 'Plan_Accion_2027') || hoja(wb, 'Acciones_2027'))) {
    agregar('bloqueante', '—', null, 'Este archivo es el libro de consulta «Plan de acción 2027»',
      'Ese libro es la propuesta de la Oficina Asesora de Planeación y no se diligencia.',
      'Cargue la «Plantilla de Formulación 2027» con las columnas amarillas diligenciadas.');
    return resultado('consulta');
  }
  const faltanEjes = EJES.filter((e, i) => !hojasEje[i]);
  if (faltanEjes.length === EJES.length) {
    agregar('bloqueante', '—', null, 'El archivo no es la Plantilla de Formulación 2027',
      'No se encontraron las hojas de los ejes (Eje1_Formacion a Eje6_Bienestar).',
      'Descargue la plantilla desde esta pestaña, diligénciela y cárguela sin cambiar el nombre de las hojas.');
    return resultado('desconocido');
  }
  if (faltanEjes.length) {
    agregar('bloqueante', '—', null, 'Faltan hojas de la plantilla',
      `No se encontraron las hojas: ${faltanEjes.join(', ')}.`,
      'No borre ni renombre hojas. Si las modificó, copie su información en una plantilla nueva.');
  }

  const impactos = catalogoImpacto(wb);
  if (!impactos) {
    agregar('advertencia', 'Catalogos', null, 'No se pudo revisar la dimensión de impacto',
      'La hoja oculta de catálogos no está o fue modificada; por eso no se verificó que cada dimensión corresponda a su indicador.',
      'Use la plantilla original sin modificar sus hojas ocultas.');
  }

  // 2. Metas asignadas al área en las hojas de eje
  const base = bloquesBase(wb);
  const filasArea = [];
  hojasEje.forEach((h, i) => {
    if (!h) return;
    const e = encabezados(wb, h.ws, COLUMNAS_EJE, { obligatorias: ['idArea', 'nombre', 'producto', 'inicio', 'fin', 'responsable'] });
    if (!e || e.faltan.length) {
      agregar('bloqueante', h.nombre, e ? e.fila : null, 'La hoja no tiene la estructura de la plantilla',
        `Faltan columnas: ${(e ? e.faltan : ['encabezados']).map((k) => COLUMNAS_EJE[k] || k).join(', ')}.`,
        'No inserte, borre ni renombre columnas de la plantilla.');
      return;
    }
    // Si el archivo se guardó con una herramienta que no calcula fórmulas, las columnas grises llegan vacías:
    // se reconstruyen desde la hoja oculta Base_OAPDI, que tiene las asignaciones del eje en el mismo orden.
    const bloque = base.get(i + 1) || [];
    let sinCalculo = true;
    for (let f = e.fila + 1; f <= Math.min(e.ultimaFila, e.fila + 5); f += 1) if (!vacio(filaComoObjeto(wb, h.ws, f, { x: e.col.idArea }).x)) sinCalculo = false;
    const ultima = sinCalculo ? Math.max(e.ultimaFila, e.fila + bloque.length) : e.ultimaFila;
    for (let f = e.fila + 1; f <= ultima; f += 1) {
      const o = filaComoObjeto(wb, h.ws, f, e.col);
      if (sinCalculo && bloque[f - e.fila - 1]) Object.assign(o, bloque[f - e.fila - 1]);
      if (texto(o.idArea).toUpperCase() !== areaId) continue;
      const ev = evaluar(o, ['producto', 'inicio', 'fin', 'responsable', 'indicador', 'metaAccion', 'dimension', 'impacto'], impactos, anio);
      filasArea.push({ ...o, hoja: h.nombre, ...ev });
    }
  });

  // 3. Acciones adicionales del área (parte inferior del buscador)
  const adicionales = [];
  const b = hoja(wb, 'Buscador_Formulacion');
  if (b) {
    const e = encabezados(wb, b.ws, COLUMNAS_ADICIONALES, { maxFila: 80, obligatorias: ['area', 'nombre'] });
    if (e && !e.faltan.length) {
      for (let f = e.fila + 1; f <= e.ultimaFila; f += 1) {
        const o = filaComoObjeto(wb, b.ws, f, e.col);
        if (!esDelArea(o.area, areaId) || vacio(o.nombre)) continue;
        const ev = evaluar(o, ['producto', 'inicio', 'fin', 'responsable', 'indicador', 'metaAccion', 'dimension', 'impacto', 'area', 'codigoMeta', 'origen'], impactos, anio);
        adicionales.push({ ...o, hoja: b.nombre, ...ev });
      }
    }
  }

  // 4. Hallazgos por fila con errores
  [...filasArea, ...adicionales].filter((x) => x.estado === 'error').forEach((x) => {
    const meta = texto(x.codigoMeta);
    const detalle = x.faltan
      ? `${meta ? `Meta ${meta}: ` : ''}«${texto(x.nombre)}». Faltan: ${x.faltan.map((k) => ETIQUETAS[k] || k).join(', ')}.`
      : `${meta ? `Meta ${meta}: ` : ''}«${texto(x.nombre)}».`;
    agregar('bloqueante', x.hoja, x._fila, x.mensaje, detalle, CORRECCION[x.mensaje] || 'Corrija la fila hasta que la columna «Alerta de consistencia» diga OK.');
  });

  // 5. Metas pendientes por formular (agrupadas por hoja)
  const pendientes = filasArea.filter((x) => x.estado === 'pendiente');
  const porHoja = new Map();
  pendientes.forEach((x) => { if (!porHoja.has(x.hoja)) porHoja.set(x.hoja, []); porHoja.get(x.hoja).push(x); });
  porHoja.forEach((lista, nombreHoja) => {
    const codigos = lista.map((x) => `${texto(x.codigoMeta)} (fila ${x._fila})`).join(', ');
    agregar(exigirTodasLasMetas ? 'bloqueante' : 'advertencia', nombreHoja, lista[0]._fila,
      lista.length === 1 ? 'Una meta asignada está sin formular' : `${lista.length} metas asignadas están sin formular`,
      `Su área tiene asignadas estas metas sin acción: ${codigos}.`,
      'Escriba en cada fila el nombre de la acción y complete las columnas amarillas. Si la meta no le corresponde, regístrelo en «Observaciones» y consúltelo con la Oficina Asesora de Planeación.');
  });

  const ok = [...filasArea, ...adicionales].filter((x) => x.estado === 'ok');
  if (!filasArea.length && !adicionales.length) {
    agregar('bloqueante', 'Buscador_Formulacion', null, 'No hay acciones para su área',
      `La plantilla no tiene metas asignadas al área ${areaEtiqueta} ni acciones adicionales registradas por ella.`,
      'Verifique que eligió bien su área. Si su área no tiene metas asignadas, registre sus acciones en «Acciones adicionales» del buscador.');
  } else if (!ok.length && !hallazgos.some((h) => h.severidad === 'bloqueante')) {
    agregar('bloqueante', 'Buscador_Formulacion', null, 'No hay ninguna acción formulada',
      'Ninguna fila de su área tiene la acción completa y en OK.', 'Formule al menos una acción completa.');
  }

  // 6. Advertencias de calidad sobre las acciones en OK
  ok.forEach((x) => {
    if (productoNoValido(x.producto)) {
      agregar('advertencia', x.hoja, x._fila, 'El producto parece una actividad, no un producto',
        `«${texto(x.producto)}»: la contratación de personal y los estudios previos sirven a un producto, pero no lo son.`,
        'Registre como producto el resultado verificable (informe, documento, sistema en operación…).');
    }
  });
  const sinEvidencia = ok.filter((x) => vacio(x.evidencia));
  if (sinEvidencia.length) {
    agregar('advertencia', sinEvidencia[0].hoja, sinEvidencia[0]._fila,
      sinEvidencia.length === 1 ? 'Una acción no tiene evidencia verificable' : `${sinEvidencia.length} acciones no tienen evidencia verificable`,
      `Filas: ${sinEvidencia.map((x) => `${x.hoja} ${x._fila}`).join(', ')}.`,
      'Indique el documento o registro que demostrará el cumplimiento (acta, radicado, informe…).');
  }
  const sinRetoma = ok.filter((x) => vacio(x.retoma));
  if (sinRetoma.length) {
    agregar('advertencia', sinRetoma[0].hoja, sinRetoma[0]._fila,
      'Falta indicar si retoma un compromiso 2026',
      `${sinRetoma.length} ${sinRetoma.length === 1 ? 'acción no indica' : 'acciones no indican'} si continúan o cierran un compromiso pendiente de 2026.`,
      'Marque Sí o No en «¿Retoma un compromiso pendiente 2026?».');
  }
  const conTildes = ok.filter((x) => /[áéíóúñ\s]/i.test(texto(x.responsable).trim()));
  if (conTildes.length) {
    agregar('advertencia', conTildes[0].hoja, conTildes[0]._fila, 'Correo de responsable con tildes o espacios',
      `Revise: ${conTildes.map((x) => texto(x.responsable)).slice(0, 3).join(', ')}.`, 'Los correos institucionales van sin tildes ni espacios.');
  }

  // 7. Compromisos pendientes 2026 del área
  const c = hoja(wb, 'Compromisos_2026');
  let compromisos = { total: 0, decididos: 0 };
  if (c) {
    const e = encabezados(wb, c.ws, { id: 'Id', idArea: 'Id área (propuesta)', compromiso: 'Compromiso o tarea', decision: 'Decisión del área' }, { maxFila: 8 });
    if (e && e.col.idArea !== undefined && e.col.decision !== undefined) {
      const propios = [];
      for (let f = e.fila + 1; f <= e.ultimaFila; f += 1) {
        const o = filaComoObjeto(wb, c.ws, f, e.col);
        if (texto(o.idArea).toUpperCase() === areaId) propios.push(o);
      }
      const sinDecision = propios.filter((o) => vacio(o.decision));
      compromisos = { total: propios.length, decididos: propios.length - sinDecision.length };
      if (sinDecision.length) {
        agregar('advertencia', c.nombre, sinDecision[0]._fila,
          sinDecision.length === 1 ? 'Un compromiso 2026 sin decisión' : `${sinDecision.length} compromisos 2026 sin decisión`,
          `Compromisos de su área sin decisión: ${sinDecision.map((o) => texto(o.id)).join(', ')}.`,
          'En la hoja Compromisos_2026 elija la decisión del área: se retoma, se cierra, se reasigna o no aplica.');
      }
    }
  }

  const acciones = ok.map((x) => ({ meta: texto(x.codigoMeta), nombre: texto(x.nombre), producto: texto(x.producto), inicio: fechaValida(x.inicio), fin: fechaValida(x.fin), responsable: texto(x.responsable), dimension: texto(x.dimension), hoja: x.hoja, fila: x._fila }));
  const resumen = {
    metasAsignadas: filasArea.length,
    metasFormuladas: filasArea.filter((x) => x.estado !== 'pendiente').length,
    accionesOk: ok.length,
    accionesConErrores: [...filasArea, ...adicionales].filter((x) => x.estado === 'error').length,
    pendientes: pendientes.length,
    adicionales: adicionales.length,
    compromisos,
    porEje: EJES.map((eje, i) => ({ eje, hoja: hojasEje[i]?.nombre || eje, metas: filasArea.filter((x) => x.hoja === hojasEje[i]?.nombre).length, ok: ok.filter((x) => x.hoja === hojasEje[i]?.nombre).length }))
  };
  return resultado('formulacion', resumen, acciones);
}

function ordenar(h) { return [...h].sort((a, b) => (a.severidad === b.severidad ? 0 : a.severidad === 'bloqueante' ? -1 : 1)); }

Object.assign(__m["src/lib/validar-accion.js"], { esDelArea, validarFormulacion });
})();

// ── src/tabs/accion.js ──
__m["src/tabs/accion.js"] = {};
(function () {
/*
 * accion.js — Pestaña 2: Plan de acción.
 * Descarga del Plan de acción 2027 (consulta) y de la Plantilla de Formulación 2027 (para diligenciar),
 * cargue de la plantilla formulada por el área, validación con las mismas reglas de la «Alerta de consistencia»
 * y registro automático. El registro emite el pase QR: es el que permite entrar a la jornada.
 */
const { estado, area: areaPorId } = __m["src/estado.js"];
const { esc, on } = __m["src/ui/dom.js"];
const { abrirModal } = __m["src/ui/modal.js"];
const { icono } = __m["src/ui/iconos.js"];
const { montarFlujo } = __m["src/ui/cargue.js"];
const { montarPase } = __m["src/ui/pase.js"];
const { validarFormulacion } = __m["src/lib/validar-accion.js"];
const { entero, iniciales } = __m["src/lib/formato.js"];
const { fechaCorta } = __m["src/lib/fechas.js"];

let flujo = null;

function equipoHtml(registro) {
  const pases = (registro.pasesEquipo || []).map((id) => estado.consolidado.pases.find((p) => p.id === id)).filter(Boolean);
  if (!pases.length) return '';
  return `<div class="card card-tight"><h3>Pases del equipo</h3>
    <ul class="equipo-lista">${pases.map((p) => `<li><span class="avatar avatar-xs" aria-hidden="true">${esc(iniciales(p.n))}</span>
      <span class="equipo-info"><strong>${esc(p.n)}</strong><span class="mono">${esc(p.id)}</span></span>
      <button type="button" class="btn btn-sm" data-ver-pase="${esc(p.id)}">${icono('qr', 'icon-sm')}Ver</button></li>`).join('')}</ul></div>`;
}

function montar(panel, ctx) {
  const cfgApp = estado.datos.config;
  flujo = montarFlujo(panel, ctx, {
    tipo: 'accion',
    icono: 'formulacion',
    eyebrow: 'Plan de acción 2027',
    titulo: 'Formule su Plan de acción y obtenga su pase',
    lead: 'Descargue los archivos, diligencie la plantilla de su área y cárguela. Si queda bien formulada, recibe el <strong>código QR que le da entrada a la jornada</strong>.',
    plantillas: cfgApp.plantillas?.accion || [],
    nombreArchivo: 'la Plantilla de Formulación 2027',
    nombreCorto: 'Plan de acción',
    nombreCarpeta: 'Plan de acción',
    tituloFinal: 'Su pase',
    textoRegistrar: 'Registrar y obtener mi pase',
    mensajeExito: '¡Plan de acción registrado!',
    ayuda: [
      'En la hoja <strong>Buscador</strong> elija su área: verá las metas que le corresponden y sus compromisos 2026.',
      'Formule en las <strong>columnas amarillas</strong> de cada eje: acción, producto, fechas de 2027, responsable y dimensión del MIPG.',
      `${cfgApp.reglasPase?.exigirTodasLasMetas === false ? 'Formule al menos una acción completa' : 'Formule <strong>todas las metas asignadas</strong> a su área'} y verifique que la columna <strong>Alerta de consistencia</strong> diga OK.`,
      'Decida qué pasa con cada compromiso 2026 (se retoma, se ajusta o se cierra).',
      'Guarde el archivo en Excel (.xlsx) sin cambiar el nombre de las hojas.'
    ],
    validar(wb, ident) {
      const a = areaPorId(ident.areaId);
      return validarFormulacion(wb, { areaId: a.id, areaEtiqueta: a.etiqueta, anio: cfgApp.evento?.vigencia || 2027, exigirTodasLasMetas: cfgApp.reglasPase?.exigirTodasLasMetas !== false });
    },
    cifras: (r) => [
      { etiqueta: 'Metas asignadas', valor: entero(r.metasAsignadas || 0) },
      { etiqueta: 'Metas formuladas', valor: entero(r.metasFormuladas || 0), alerta: (r.metasFormuladas || 0) < (r.metasAsignadas || 0) },
      { etiqueta: 'Acciones en OK', valor: entero(r.accionesOk || 0) },
      { etiqueta: 'Con errores', valor: entero(r.accionesConErrores || 0), alerta: (r.accionesConErrores || 0) > 0 }
    ],
    estadoHero(i, registro) {
      if (!i) return `<div class="hero-chips"><span class="hero-chip">${icono('qr', 'icon-sm')}Sin plan registrado no hay pase</span></div>`;
      const a = areaPorId(i.areaId);
      return registro
        ? `<div class="hero-chips"><span class="hero-chip is-ok">${icono('checkCirculo', 'icon-sm')}${esc(a?.nombre || '')}: registrado el ${esc(fechaCorta(registro.fecha.slice(0, 10)))}</span>${registro.codigoPase ? `<span class="hero-chip mono">${esc(registro.codigoPase)}</span>` : ''}</div>`
        : `<div class="hero-chips"><span class="hero-chip is-pend">${icono('reloj', 'icon-sm')}${esc(a?.nombre || '')}: pendiente de registro</span></div>`;
    },
    async pintarFinal(cont, { registro, pase, ctx: c }) {
      if (!pase) {
        cont.innerHTML = `<div class="notice">${icono('info')}<div>El Plan de acción de su área quedó registrado (${esc(registro.id)}), pero este dispositivo no tiene el pase. Cargue de nuevo el archivo para emitirlo aquí, o busque el correo con su pase.</div></div>`;
        return;
      }
      await montarPase(cont, pase, {
        extra: `<div class="card card-tight siguiente">
          <span class="siguiente-ico">${icono('necesidades')}</span>
          <div><strong>Siguiente: Plan de necesidades</strong><p class="mb-0 muted">Registre los bienes y servicios que requieren sus acciones.</p></div>
          <button type="button" class="btn btn-primary btn-sm" data-ir-pestana="necesidades">Ir ${icono('flecha', 'icon-sm')}</button>
        </div>
        ${equipoHtml(registro)}
        <ul class="check-lista">
          <li>${icono('check', 'icon-sm')}<span>Presente el QR en el celular o impreso al ingresar a la jornada.</span></li>
          <li>${icono('check', 'icon-sm')}<span>El QR es personal e intransferible: cada integrante del equipo recibe el suyo.</span></li>
          ${registro.enlace ? `<li>${icono('enlace', 'icon-sm')}<span>Archivo: <a href="${esc(registro.enlace)}" target="_blank" rel="noopener">${esc(registro.archivo)}</a></span></li>` : ''}
        </ul>`
      });
      cont.querySelector('[data-ir-pestana]')?.addEventListener('click', () => c.ir('necesidades'));
      on(cont, 'click', '[data-ver-pase]', async (ev, b) => {
        const p = estado.consolidado.pases.find((x) => x.id === b.dataset.verPase);
        if (!p) return;
        const m = abrirModal({ titulo: `Pase de ${p.n}`, subtitulo: p.e, contenido: '<div data-modal-pase></div>' });
        await montarPase(m.cuerpo.querySelector('[data-modal-pase]'), p);
      });
    }
  });
}

const pestanaAccion = {
  id: 'accion',
  titulo: 'Plan de acción',
  tituloCorto: 'Plan de acción',
  tituloMovil: 'Acción',
  icono: 'formulacion',
  montar,
  alMostrar() { flujo?.alMostrar(); }
};

Object.assign(__m["src/tabs/accion.js"], { pestanaAccion });
})();

// ── src/lib/validar-necesidades.js ──
__m["src/lib/validar-necesidades.js"] = {};
(function () {
/*
 * validar-necesidades.js — Validación del «Plan de Necesidades 2027» diligenciado por un área funcional.
 * Replica, en el mismo orden, la «Alerta de consistencia» de la plantilla (columna AJ de la hoja
 * «Formulación PDN 2027»). La primera regla que falla es la que se reporta, igual que en Excel.
 * Agrega la revisión de la cadena lógica: cada necesidad sirve a una acción, y las acciones propias deben
 * existir en la formulación del área cuando esta ya se registró.
 */
const { hoja, encabezados, filaComoObjeto, vacio, texto, esNumero } = __m["src/lib/libro.js"];
const { normalizar } = __m["src/lib/formato.js"];
const { esDelArea } = __m["src/lib/validar-accion.js"];
const { similitud } = __m["src/lib/similitud.js"];

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const TOPE_MINIMA_REFERENCIA_2025 = 39850000;

const COLUMNAS = {
  numero: 'N.° necesidad', area: 'Área funcional que formula', meta: 'Meta estratégica PDI', accion: 'Acción del Plan de Acción 2027',
  accionPropia: 'Nombre de la acción propia', tipo: 'Tipo de necesidad', justificacion: 'Justificación de la necesidad', objeto: 'Descripción del objeto contractual',
  unspsc: 'Código UNSPSC principal', unspscAdicionales: 'Códigos UNSPSC adicionales', mesInicio: 'Mes estimado de inicio', mesOfertas: 'Mes estimado de presentación',
  duracion: 'Duración del contrato', unidad: 'Unidad de duración', modalidad: 'Modalidad de selección', fuente: 'Fuente de los recursos', gasto: 'Tipo de gasto',
  rubro: 'Rubro presupuestal', valorTotal: 'Valor total estimado', valor2027: 'Valor estimado vigencia 2027', requiereVF: '¿Requiere vigencias futuras?',
  estadoVF: 'Estado de la solicitud de vigencias futuras', sede: 'Sede o lugar de ejecución', responsable: 'Nombre del responsable', cargo: 'Cargo del responsable',
  telefono: 'Teléfono', correo: 'Correo institucional del responsable', continua2026: '¿Continúa una necesidad 2026?', registro2026: 'N.° de registro 2026',
  prioridad: 'Prioridad', observaciones: 'Observaciones'
};

const OBLIGATORIOS = ['area', 'meta', 'accion', 'tipo', 'justificacion', 'objeto', 'unspsc', 'mesInicio', 'mesOfertas', 'duracion', 'unidad', 'modalidad', 'fuente', 'gasto', 'valorTotal', 'valor2027', 'requiereVF', 'responsable', 'cargo', 'correo', 'continua2026'];
const ETIQUETAS = {
  area: 'Área', meta: 'Meta PDI', accion: 'Acción', tipo: 'Tipo de necesidad', justificacion: 'Justificación', objeto: 'Objeto contractual', unspsc: 'UNSPSC',
  mesInicio: 'Mes de inicio', mesOfertas: 'Mes de ofertas', duracion: 'Duración', unidad: 'Unidad de duración', modalidad: 'Modalidad', fuente: 'Fuente',
  gasto: 'Tipo de gasto', valorTotal: 'Valor total', valor2027: 'Valor 2027', requiereVF: '¿Vigencias futuras?', responsable: 'Nombre del responsable',
  cargo: 'Cargo', correo: 'Correo', continua2026: '¿Continúa 2026?'
};

const CORRECCION = {
  'Incompleta: faltan campos obligatorios': 'Complete las columnas amarillas obligatorias de esa fila.',
  'Falta el nombre de la acción propia del área': 'Si eligió PROPIA, escriba en la columna I el nombre de la acción tal como quedó en su Plantilla de Formulación.',
  'La acción no corresponde a la meta seleccionada': 'Elija una acción de la lista que pertenezca a la meta, o cambie la meta.',
  'Código UNSPSC inválido: registre 8 dígitos': 'Escriba un solo código UNSPSC de 8 dígitos, como número. Use la hoja «Guía UNSPSC».',
  'UNSPSC a nivel de segmento o familia: use clase o producto': 'El código debe ser de clase (termina en 00) o de producto, no de segmento ni familia (termina en 0000).',
  'El mes de ofertas es anterior al de inicio del proceso': 'El mes de presentación de ofertas debe ser igual o posterior al mes de inicio del proceso.',
  'Duración inválida': 'Escriba la duración como un número mayor que cero y elija la unidad (días, meses o años).',
  'Valor inválido: registre solo números': 'Escriba los valores en pesos, solo números: sin puntos, sin $ y sin texto.',
  'Valor inválido: debe ser mayor que cero': 'El valor total y el valor 2027 deben ser mayores que cero.',
  'El valor de la vigencia 2027 supera el valor total': 'El valor de 2027 no puede ser mayor que el valor total del contrato.',
  'El valor total supera el de 2027: requiere vigencias futuras': 'Si el contrato se paga en más de una vigencia, marque Sí en vigencias futuras e indique el estado.',
  'Indique el estado de la solicitud de vigencias futuras': 'Elija el estado: no solicitadas, solicitadas o aprobadas.',
  'El valor supera el tope de mínima cuantía 2027': 'Revise la modalidad: por ese valor no procede mínima cuantía.',
  'El valor supera el tope de menor cuantía 2027': 'Revise la modalidad: por ese valor no procede selección abreviada de menor cuantía.',
  'El correo del responsable no es institucional válido': 'Escriba el correo institucional del supervisor (@itc.edu.co), sin tildes ni espacios.',
  'Indique el N.° de registro 2026 que continúa': 'Elija en la lista el número PN26-### de la necesidad 2026 que continúa.'
};

// Catálogo acción → meta y parámetros de la vigencia, leídos del propio libro.
function catalogos(wb) {
  const acciones = new Map();
  const h = hoja(wb, 'Catalogos');
  if (h) {
    const e = encabezados(wb, h.ws, { meta: 'Meta de la acción', accion: 'Acción del Plan de Acción 2027 (lista)' });
    if (e && e.col.meta !== undefined && e.col.accion !== undefined) {
      for (let f = e.fila + 1; f <= e.ultimaFila; f += 1) {
        const o = filaComoObjeto(wb, h.ws, f, e.col);
        if (!vacio(o.accion)) acciones.set(texto(o.accion), texto(o.meta));
      }
    }
  }
  const params = { topeMenor: null, topeMinima: null, fechaRemision: null };
  const t = hoja(wb, 'Tablero_Consistencia');
  if (t) {
    for (let f = 1; f <= 20; f += 1) {
      const etiqueta = normalizar(t.ws[`A${f}`]?.v);
      const v = t.ws[`B${f}`]?.v;
      if (etiqueta.startsWith('tope de menor cuantia') && esNumero(v)) params.topeMenor = v;
      if (etiqueta.startsWith('tope de minima cuantia') && esNumero(v)) params.topeMinima = v;
      if (etiqueta.startsWith('fecha limite de remision')) params.fechaRemision = v instanceof Date ? v : null;
    }
  }
  return { acciones, params };
}

// Réplica de la fórmula AJ: devuelve el primer mensaje que aplica, o 'OK'.
function evaluar(o, cat) {
  const faltan = OBLIGATORIOS.filter((k) => vacio(o[k]));
  if (faltan.length) return { mensaje: 'Incompleta: faltan campos obligatorios', faltan };
  const accion = texto(o.accion);
  if (accion.toUpperCase().startsWith('PROPIA') && vacio(o.accionPropia)) return { mensaje: 'Falta el nombre de la acción propia del área' };
  if (accion.toUpperCase().startsWith('A27')) {
    const metaAccion = cat.acciones.get(accion);
    if ((metaAccion ?? 'x') !== texto(o.meta).slice(0, 7)) return { mensaje: 'La acción no corresponde a la meta seleccionada' };
  }
  const u = o.unspsc;
  if (!esNumero(u) || u < 10000000 || u > 99999999) return { mensaje: 'Código UNSPSC inválido: registre 8 dígitos' };
  if (u % 10000 === 0) return { mensaje: 'UNSPSC a nivel de segmento o familia: use clase o producto' };
  const mi = MESES.indexOf(normalizar(o.mesInicio));
  const mo = MESES.indexOf(normalizar(o.mesOfertas));
  if (mi < 0 || mo < 0 || mo < mi) return { mensaje: 'El mes de ofertas es anterior al de inicio del proceso' };
  if (!esNumero(o.duracion) || o.duracion <= 0) return { mensaje: 'Duración inválida' };
  if (!esNumero(o.valorTotal) || !esNumero(o.valor2027)) return { mensaje: 'Valor inválido: registre solo números' };
  if (o.valorTotal <= 0 || o.valor2027 <= 0) return { mensaje: 'Valor inválido: debe ser mayor que cero' };
  if (o.valor2027 > o.valorTotal) return { mensaje: 'El valor de la vigencia 2027 supera el valor total' };
  const vf = normalizar(o.requiereVF);
  if (o.valor2027 < o.valorTotal && vf === 'no') return { mensaje: 'El valor total supera el de 2027: requiere vigencias futuras' };
  if (vf === 'si' && (vacio(o.estadoVF) || normalizar(o.estadoVF) === 'no aplica')) return { mensaje: 'Indique el estado de la solicitud de vigencias futuras' };
  const mod = normalizar(o.modalidad);
  if (mod === 'minima cuantia' && cat.params.topeMinima && o.valorTotal > cat.params.topeMinima) return { mensaje: 'El valor supera el tope de mínima cuantía 2027' };
  if (mod === 'seleccion abreviada de menor cuantia' && cat.params.topeMenor && o.valorTotal > cat.params.topeMenor) return { mensaje: 'El valor supera el tope de menor cuantía 2027' };
  const correo = texto(o.correo);
  if (!/@itc\.edu\.co/i.test(correo) || /[áéíóúñ ]/i.test(correo)) return { mensaje: 'El correo del responsable no es institucional válido' };
  if (normalizar(o.continua2026) === 'si' && vacio(o.registro2026)) return { mensaje: 'Indique el N.° de registro 2026 que continúa' };
  return { mensaje: 'OK' };
}

const filaConDatos = (o) => Object.entries(o).some(([k, v]) => k !== '_fila' && k !== 'numero' && !vacio(v));

/*
 * validarNecesidades(wb, { areaId, areaEtiqueta, accionesFormuladas: [nombres] | null })
 */
function validarNecesidades(wb, opciones) {
  const { areaId, areaEtiqueta = areaId, accionesFormuladas = null } = opciones;
  const hallazgos = [];
  const agregar = (severidad, hojaN, fila, titulo, detalle, correccion) => hallazgos.push({ id: `H${hallazgos.length + 1}`, severidad, hoja: hojaN, fila, titulo, detalle, correccion });
  const resultado = (tipoDetectado, resumen = {}, necesidades = []) => {
    const bloqueantes = hallazgos.filter((h) => h.severidad === 'bloqueante').length;
    const orden = [...hallazgos].sort((a, b) => (a.severidad === b.severidad ? 0 : a.severidad === 'bloqueante' ? -1 : 1));
    return { tipoDetectado, hallazgos: orden, resumen: { ...resumen, bloqueantes, advertencias: hallazgos.length - bloqueantes }, necesidades, bloqueantes, advertencias: hallazgos.length - bloqueantes };
  };

  const h = hoja(wb, 'Formulación PDN 2027');
  if (!h) {
    const esFormulacion = ['Eje1', 'Buscador_Formulacion'].some((n) => hoja(wb, n, { prefijo: true }));
    agregar('bloqueante', '—', null, esFormulacion ? 'Este archivo es la Plantilla de Formulación' : 'El archivo no es el Plan de Necesidades 2027',
      esFormulacion ? 'Cargó la Plantilla de Formulación 2027. En esta pestaña se carga el Plan de Necesidades.' : 'No se encontró la hoja «Formulación PDN 2027».',
      esFormulacion ? 'Cárguela en la pestaña «Plan de acción» y aquí cargue el Plan de Necesidades 2027.' : 'Descargue la plantilla desde esta pestaña, diligénciela y cárguela sin cambiar el nombre de las hojas.');
    return resultado(esFormulacion ? 'formulacion' : 'desconocido');
  }

  const e = encabezados(wb, h.ws, COLUMNAS, { obligatorias: ['area', 'meta', 'accion', 'unspsc', 'valorTotal', 'valor2027', 'correo'] });
  if (!e || e.faltan.length) {
    agregar('bloqueante', h.nombre, e ? e.fila : null, 'La hoja no tiene la estructura de la plantilla',
      `Faltan columnas: ${(e ? e.faltan : ['encabezados']).map((k) => COLUMNAS[k] || k).join(', ')}.`,
      'No inserte, borre ni renombre columnas de la plantilla.');
    return resultado('necesidades');
  }
  const cat = catalogos(wb);
  if (!cat.acciones.size) {
    agregar('advertencia', 'Catalogos', null, 'No se pudo revisar la relación acción–meta',
      'La hoja oculta de catálogos no está o fue modificada.', 'Use la plantilla original sin modificar sus hojas ocultas.');
  }

  const propias = [];
  const otrasAreas = new Set();
  const necesidades = [];
  for (let f = e.fila + 1; f <= e.ultimaFila; f += 1) {
    const o = filaComoObjeto(wb, h.ws, f, e.col);
    if (!filaConDatos(o)) continue;
    if (!vacio(o.area) && !esDelArea(o.area, areaId)) { otrasAreas.add(texto(o.area).slice(0, 3)); continue; }
    if (vacio(o.area) && !filaConDatos({ ...o, area: null })) continue;
    const ev = evaluar(o, cat);
    necesidades.push({ ...o, ...ev });
    if (ev.mensaje !== 'OK') {
      const detalle = ev.faltan
        ? `${texto(o.numero) || `Fila ${f}`}: faltan ${ev.faltan.map((k) => ETIQUETAS[k] || k).join(', ')}.`
        : `${texto(o.numero) || `Fila ${f}`}${o.objeto ? ` · «${texto(o.objeto).slice(0, 90)}»` : ''}.`;
      agregar('bloqueante', h.nombre, f, ev.mensaje, detalle, CORRECCION[ev.mensaje] || 'Corrija la fila hasta que la «Alerta de consistencia» diga OK.');
    }
    if (texto(o.accion).toUpperCase().startsWith('PROPIA') && !vacio(o.accionPropia)) propias.push({ fila: f, nombre: texto(o.accionPropia) });
  }

  if (!necesidades.length) {
    agregar('bloqueante', h.nombre, null, 'No hay necesidades de su área',
      `La hoja no tiene necesidades registradas por el área ${areaEtiqueta}.${otrasAreas.size ? ` Sí hay filas de otras áreas (${[...otrasAreas].join(', ')}).` : ''}`,
      'Verifique que eligió bien su área en la columna B. Si su área no necesita contratar nada, no es necesario cargar este archivo.');
  }

  const ok = necesidades.filter((n) => n.mensaje === 'OK');

  // Cadena lógica: las acciones propias deben existir en la formulación registrada del área
  if (accionesFormuladas && accionesFormuladas.length) {
    propias.forEach((p) => {
      const mejor = Math.max(0, ...accionesFormuladas.map((a) => similitud(a, p.nombre)));
      if (mejor < 0.72) {
        agregar('advertencia', h.nombre, p.fila, 'La acción propia no aparece en su formulación',
          `«${p.nombre}» no coincide con ninguna acción de la Plantilla de Formulación que registró su área.`,
          'Escriba el nombre de la acción tal como quedó en la plantilla. Toda necesidad debe servir a una acción formulada.');
      }
    });
  }

  // Referencia del tope de mínima cuantía cuando los topes 2027 aún no están certificados
  if (!cat.params.topeMinima) {
    const sospechosas = ok.filter((n) => normalizar(n.modalidad) === 'minima cuantia' && n.valorTotal > TOPE_MINIMA_REFERENCIA_2025);
    if (sospechosas.length) {
      agregar('advertencia', h.nombre, sospechosas[0]._fila,
        `${sospechosas.length === 1 ? 'Una necesidad' : `${sospechosas.length} necesidades`} en mínima cuantía con valor alto`,
        `Superan $39.850.000, el tope de mínima cuantía de 2025. Filas: ${sospechosas.map((n) => n._fila).join(', ')}. Los topes 2027 aún no están certificados.`,
        'Confirme la modalidad con el GIT de Contratación y Adquisiciones: en 2026 hubo 41 casos así.');
    }
  }
  const sinPrioridad = ok.filter((n) => vacio(n.prioridad));
  if (sinPrioridad.length) {
    agregar('advertencia', h.nombre, sinPrioridad[0]._fila, 'Necesidades sin prioridad',
      `${sinPrioridad.length} ${sinPrioridad.length === 1 ? 'necesidad no tiene' : 'necesidades no tienen'} prioridad.`,
      'Indique Alta, Media o Baja: sirve para decidir si el presupuesto no alcanza.');
  }

  const suma = (lista, k) => lista.reduce((s, n) => s + (esNumero(n[k]) ? n[k] : 0), 0);
  const agrupar = (k) => ok.reduce((m, n) => { const c = texto(n[k]) || 'Sin dato'; m[c] = (m[c] || 0) + (esNumero(n.valorTotal) ? n.valorTotal : 0); return m; }, {});
  const resumen = {
    necesidades: necesidades.length,
    ok: ok.length,
    conErrores: necesidades.length - ok.length,
    valorTotal: suma(ok, 'valorTotal'),
    valor2027: suma(ok, 'valor2027'),
    vigenciasFuturas: ok.filter((n) => normalizar(n.requiereVF) === 'si').length,
    porModalidad: agrupar('modalidad'),
    porTipo: agrupar('tipo'),
    acciones: [...new Set(ok.map((n) => texto(n.accion).split(' · ')[0]))],
    topes: cat.params
  };
  const lista = ok.map((n) => ({
    numero: texto(n.numero), objeto: texto(n.objeto), tipo: texto(n.tipo), modalidad: texto(n.modalidad), mesInicio: texto(n.mesInicio),
    valorTotal: n.valorTotal, valor2027: n.valor2027, accion: texto(n.accion), meta: texto(n.meta).slice(0, 7), fila: n._fila
  }));
  return resultado('necesidades', resumen, lista);
}

Object.assign(__m["src/lib/validar-necesidades.js"], { validarNecesidades });
})();

// ── src/tabs/necesidades.js ──
__m["src/tabs/necesidades.js"] = {};
(function () {
/*
 * necesidades.js — Pestaña 3: Plan de necesidades.
 * Descarga de la plantilla «Plan de Necesidades 2027», cargue del plan formulado por el área, validación con las
 * reglas de la columna «Alerta de consistencia» y cruce con las acciones del Plan de acción ya registrado.
 * El registro deja la constancia (dependencia, responsable, correos y enlace) y avisa por correo.
 */
const { estado, area: areaPorId, dependencia, registroVigente } = __m["src/estado.js"];
const { esc } = __m["src/ui/dom.js"];
const { icono } = __m["src/ui/iconos.js"];
const { montarFlujo } = __m["src/ui/cargue.js"];
const { validarNecesidades } = __m["src/lib/validar-necesidades.js"];
const { entero, moneda, monedaCompacta } = __m["src/lib/formato.js"];
const { fechaCorta, horaLegible } = __m["src/lib/fechas.js"];

let flujo = null;

function montar(panel, ctx) {
  const cfgApp = estado.datos.config;
  flujo = montarFlujo(panel, ctx, {
    tipo: 'necesidades',
    icono: 'necesidades',
    eyebrow: 'Plan de necesidades 2027',
    titulo: 'Registre lo que su área necesita contratar',
    lead: 'Cada bien, obra o servicio se amarra a una acción de su Plan de acción y, por ella, a una meta del PDI. Con este plan el GIT de Contratación arma el <strong>Plan Anual de Adquisiciones</strong>.',
    plantillas: cfgApp.plantillas?.necesidades || [],
    nombreArchivo: 'el Plan de Necesidades 2027',
    nombreCorto: 'Plan de necesidades',
    nombreCarpeta: 'Plan de necesidades',
    tituloFinal: 'Constancia',
    textoRegistrar: 'Registrar Plan de necesidades',
    mensajeExito: '¡Plan de necesidades registrado!',
    ayuda: [
      'Una necesidad por fila y un objeto por necesidad, en la hoja <strong>Formulación PDN 2027</strong>.',
      'Elija la <strong>acción del Plan de acción 2027</strong> a la que sirve: si no existe, primero formúlela en la plantilla.',
      'Código <strong>UNSPSC de 8 dígitos</strong>, valores en pesos solo con números y el valor 2027 sin superar el total.',
      'El mes de ofertas no puede ser anterior al mes de inicio; si se paga en varias vigencias, marque vigencias futuras.',
      'Responsable con correo institucional sin tildes, y la columna <strong>Alerta de consistencia</strong> en OK.'
    ],
    avisoCargue(i) {
      const pa = registroVigente('accion', i.areaId);
      return pa
        ? `<div class="notice">${icono('enlace')}<div>Se cruzará con las <strong>${entero(pa.acciones?.length || 0)} acciones</strong> del Plan de acción que su área registró el ${esc(fechaCorta(pa.fecha.slice(0, 10)))}.</div></div>`
        : `<div class="notice">${icono('info')}<div><strong>Su área aún no registra el Plan de acción en este dispositivo.</strong> Puede cargar las necesidades; el cruce con sus acciones propias se hará cuando la OAP consolide.
          <div class="btn-group" style="margin-top:8px"><a class="btn btn-sm" href="#accion">Ir al Plan de acción</a></div></div></div>`;
    },
    validar(wb, ident) {
      const a = areaPorId(ident.areaId);
      const pa = registroVigente('accion', a.id);
      return validarNecesidades(wb, { areaId: a.id, areaEtiqueta: a.etiqueta, accionesFormuladas: pa?.acciones?.length ? pa.acciones : null });
    },
    cifras: (r) => [
      { etiqueta: 'Necesidades', valor: entero(r.necesidades || 0) },
      { etiqueta: 'En OK', valor: entero(r.ok || 0) },
      { etiqueta: 'Con errores', valor: entero(r.conErrores || 0), alerta: (r.conErrores || 0) > 0 },
      { etiqueta: 'Valor total', valor: monedaCompacta(r.valorTotal || 0) }
    ],
    estadoHero(i, registro) {
      if (!i) return '';
      const a = areaPorId(i.areaId);
      return registro
        ? `<div class="hero-chips"><span class="hero-chip is-ok">${icono('checkCirculo', 'icon-sm')}${esc(a?.nombre || '')}: registrado el ${esc(fechaCorta(registro.fecha.slice(0, 10)))}</span></div>`
        : `<div class="hero-chips"><span class="hero-chip is-pend">${icono('reloj', 'icon-sm')}${esc(a?.nombre || '')}: pendiente de registro</span></div>`;
    },
    pintarFinal(cont, { registro, ctx: c }) {
      const r = registro.resumen || {};
      const modalidades = Object.entries(r.porModalidad || {}).sort((x, y) => y[1] - x[1]);
      cont.innerHTML = `<article class="constancia reveal">
        <header class="constancia-head">
          <span class="constancia-sello">${icono('checkCirculo', 'icon-lg')}</span>
          <div><span class="eyebrow">Constancia de registro</span><h3 class="mb-0">Plan de necesidades 2027</h3></div>
        </header>
        <dl class="dl-mini">
          <div><dt>Registro</dt><dd class="mono">${esc(registro.id)}</dd></div>
          <div><dt>Fecha</dt><dd>${esc(fechaCorta(registro.fecha.slice(0, 10)))}, ${esc(horaLegible(new Date(registro.fecha)))}</dd></div>
          <div><dt>Área</dt><dd>${esc(registro.area.id)} · ${esc(registro.area.nombre)}</dd></div>
          <div><dt>Dependencia</dt><dd>${esc(registro.dependencia.codigo)} · ${esc(registro.dependencia.nombre || dependencia(registro.dependencia.codigo)?.nombre || '')}</dd></div>
          <div><dt>Responsable</dt><dd>${esc(registro.responsable.nombre)} · ${esc(registro.responsable.correo)}</dd></div>
          ${registro.correosEquipo?.length ? `<div><dt>Equipo</dt><dd>${esc(registro.correosEquipo.join(', '))}</dd></div>` : ''}
          <div><dt>Archivo</dt><dd>${registro.enlace ? `<a href="${esc(registro.enlace)}" target="_blank" rel="noopener">${esc(registro.archivo)}</a>` : esc(registro.archivo)}</dd></div>
        </dl>
        <div class="cifras-mini">
          <div class="cifra-mini"><strong>${entero(r.ok || 0)}</strong><span>Necesidades</span></div>
          <div class="cifra-mini"><strong>${monedaCompacta(r.valorTotal || 0)}</strong><span>Valor total</span></div>
          <div class="cifra-mini"><strong>${monedaCompacta(r.valor2027 || 0)}</strong><span>Valor 2027</span></div>
          <div class="cifra-mini"><strong>${entero(r.vigenciasFuturas || 0)}</strong><span>Vigencias futuras</span></div>
        </div>
        ${modalidades.length ? `<div><span class="field-hint">Valor por modalidad estimada</span><ul class="modalidades-mini">${modalidades.map(([k, v]) => `<li><span>${esc(k)}</span><strong>${esc(monedaCompacta(v))}</strong></li>`).join('')}</ul></div>` : ''}
        ${registro.advertencias ? `<p class="field-hint mb-0">${icono('alerta', 'icon-sm')} ${entero(registro.advertencias)} advertencias quedaron registradas para revisión con la OAP. Valor total exacto: ${esc(moneda(r.valorTotal || 0))}.</p>` : ''}
      </article>
      <div class="card card-tight siguiente">
        <span class="siguiente-ico">${icono('adquisiciones')}</span>
        <div><strong>Siguiente: Plan de adquisiciones</strong><p class="mb-0 muted">Tiempos y temas contractuales que explicará el GIT de Contratación.</p></div>
        <button type="button" class="btn btn-primary btn-sm" data-ir-pestana>Ir ${icono('flecha', 'icon-sm')}</button>
      </div>`;
      cont.querySelector('[data-ir-pestana]').addEventListener('click', () => c.ir('adquisiciones'));
    }
  });
}

const pestanaNecesidades = {
  id: 'necesidades',
  titulo: 'Plan de necesidades',
  tituloCorto: 'Plan de necesidades',
  tituloMovil: 'Necesidades',
  icono: 'necesidades',
  montar,
  alMostrar() { flujo?.alMostrar(); }
};

Object.assign(__m["src/tabs/necesidades.js"], { pestanaNecesidades });
})();

// ── src/tabs/adquisiciones.js ──
__m["src/tabs/adquisiciones.js"] = {};
(function () {
/*
 * adquisiciones.js — Pestaña 4: Plan de adquisiciones.
 * Lo que explicará el GIT de Contratación y Adquisiciones: la ruta del plan de necesidades al Plan Anual de
 * Adquisiciones (publicación a más tardar el 31 de enero de 2027), las siete modalidades con sus tiempos,
 * una calculadora de la fecha límite de radicación, topes, campos que se revisan, lecciones de 2026 y normativa.
 */
const { estado } = __m["src/estado.js"];
const { esc, on } = __m["src/ui/dom.js"];
const { icono } = __m["src/ui/iconos.js"];
const { caminoContratacion, fechaLarga, fechaCorta, diferenciaDias, hoyISO, sumarDias } = __m["src/lib/fechas.js"];
const { entero, moneda } = __m["src/lib/formato.js"];

let raiz = null;

const datos = () => estado.datos.contratacion || {};
const modalidades = () => estado.datos.modalidades?.modalidades || [];

function pintarCalculo() {
  const cal = estado.indices.calendario;
  const id = raiz.querySelector('[name="modalidad"]').value;
  const fecha = raiz.querySelector('[name="fecha"]').value;
  const res = raiz.querySelector('[data-calculo]');
  const m = modalidades().find((x) => x.id === id);
  if (!m || !fecha) { res.innerHTML = ''; return; }
  const c = caminoContratacion(cal, m, fecha);
  const hoy = hoyISO();
  const margen = diferenciaDias(hoy, c.radicacion);
  const sinFestivos = !cal.cubreAnio(Number(c.radicacion.slice(0, 4))) || !cal.cubreAnio(Number(fecha.slice(0, 4)));
  const maxDias = Math.max(...c.etapas.map((e) => e.diasHabiles), 1);
  res.innerHTML = `<div class="calc-resultado ${margen < 0 ? 'is-tarde' : margen < (estado.datos.config?.umbrales?.diasAlertaRadicacion || 30) ? 'is-justo' : ''}">
      <span class="eyebrow">Radique a más tardar</span>
      <strong class="calc-fecha">${esc(fechaLarga(c.radicacion))}</strong>
      <span>${entero(c.totalHabiles)} días hábiles antes de tenerlo operando el ${esc(fechaCorta(fecha))}</span>
      <span class="calc-margen">${margen < 0 ? `${icono('alerta', 'icon-sm')}Esa fecha ya pasó: no alcanza con esta modalidad.` : margen === 0 ? `${icono('alerta', 'icon-sm')}Es hoy.` : `${icono('reloj', 'icon-sm')}Quedan ${entero(margen)} días calendario para radicar.`}</span>
    </div>
    <ol class="calc-etapas">${c.etapas.map((e) => `<li>
      <div class="row-between"><span>${esc(e.nombre)}</span><span class="nowrap muted">${entero(e.diasHabiles)} d · ${esc(fechaCorta(e.fin).replace(/ \d{4}$/, ''))}</span></div>
      <span class="calc-barra" aria-hidden="true"><span style="width:${(e.diasHabiles / maxDias) * 100}%"></span></span></li>`).join('')}</ol>
    ${sinFestivos ? `<p class="field-hint">${icono('info', 'icon-sm')} El calendario de festivos cargado no cubre todo ese periodo: el cálculo solo descuenta fines de semana fuera de 2026–2027.</p>` : ''}`;
}

function montar(panel) {
  raiz = panel;
  const c = datos();
  const mods = modalidades();
  const provisional = estado.datos.modalidades?.provisional;
  const pub = c.fechaPublicacion || '2027-01-31';
  const faltan = diferenciaDias(hoyISO(), pub);
  const fechaInicial = sumarDias(hoyISO() > '2027-01-15' ? hoyISO() : '2027-02-01', 30);
  const t = c.topes || {};

  panel.innerHTML = `<div class="container page page-app">
    <section class="hero-card reveal">
      <span class="eyebrow">${icono('adquisiciones', 'icon-sm')}GIT de Contratación y Adquisiciones</span>
      <h1>Plan de adquisiciones 2027</h1>
      <p class="hero-lema">${esc(c.titulo || '')}</p>
      <p>${esc(c.proposito || '')}</p>
      <div class="hero-chips">
        <span class="hero-chip is-gold">${icono('bandera', 'icon-sm')}Publicación del PAA: ${esc(fechaLarga(pub, { conDia: false }))}</span>
        ${faltan > 0 ? `<span class="hero-chip">${icono('reloj', 'icon-sm')}Faltan ${entero(faltan)} días</span>` : ''}
      </div>
    </section>

    <section class="card reveal" aria-labelledby="h-ruta-paa">
      <div class="card-head"><div><h2 id="h-ruta-paa" class="mb-0">De su necesidad al contrato</h2><p>${esc(c.fechaPublicacionTexto || '')}</p></div></div>
      <ol class="etapas-paa">${(c.etapas || []).map((e) => `<li class="etapa-paa">
        <span class="etapa-num">${e.numero}</span>
        <div><strong>${esc(e.titulo)}</strong><p class="mb-0">${esc(e.detalle)}</p>
          <span class="badge ${/Contrataci/i.test(e.responsable) ? 'badge-solid' : ''}">${esc(String(e.responsable).replace(/\s*\[PENDIENTE DE VERIFICAR\]/, ''))}</span>${/PENDIENTE/.test(e.responsable) ? ' <span class="badge badge-warn">Por confirmar</span>' : ''}</div>
      </li>`).join('')}</ol>
    </section>

    <section class="card calc reveal" aria-labelledby="h-calc">
      <div class="card-head"><div><h2 id="h-calc" class="mb-0">¿Cuándo debo radicar?</h2><p>Elija la modalidad y la fecha en que necesita el bien o servicio funcionando. Se cuentan días hábiles con los festivos de Colombia.</p></div></div>
      <div class="grid-2 grid-form">
        <label class="field"><span class="field-label">Modalidad</span><select class="select" name="modalidad">${mods.map((m) => `<option value="${esc(m.id)}" ${m.id === 'minima' ? 'selected' : ''}>${esc(m.nombre)}</option>`).join('')}</select></label>
        <label class="field"><span class="field-label">Lo necesito operando el</span><input class="input" type="date" name="fecha" value="${esc(fechaInicial)}" min="2026-01-01" max="2028-12-31"></label>
      </div>
      <div data-calculo aria-live="polite"></div>
      ${provisional ? `<p class="field-hint mb-0">${icono('alerta', 'icon-sm')} Tiempos de referencia: el GIT de Contratación confirmará los tiempos institucionales.</p>` : ''}
    </section>

    <section aria-labelledby="h-mod" class="stack">
      <h2 id="h-mod" class="mb-0">Las siete modalidades</h2>
      <div class="modalidades">${mods.map((m) => `<details class="modalidad reveal">
        <summary><span class="mod-dias"><strong>${entero(m.diasHabilesTotales)}</strong><small>días hábiles</small></span>
          <span class="mod-info"><strong>${esc(m.nombre)}</strong><span>${esc(m.criterio)}</span></span>${icono('abajo', 'icon-sm')}</summary>
        <div class="mod-cuerpo"><p>${esc(m.cuando)}</p>
          <ol class="mod-etapas">${(m.etapas || []).map((e) => `<li><span>${esc(e.nombre)}</span><span class="nowrap">${entero(e.diasHabiles)} d</span></li>`).join('')}</ol></div>
      </details>`).join('')}</div>
    </section>

    <section class="card reveal" aria-labelledby="h-topes">
      <div class="card-head"><div><h2 id="h-topes" class="mb-0">Topes de cuantía 2027</h2></div>${t.menorCuantia ? '' : '<span class="badge badge-warn">Por certificar</span>'}</div>
      <div class="topes">
        <div class="tope"><span>Menor cuantía</span><strong>${t.menorCuantia ? esc(moneda(t.menorCuantia)) : 'Pendiente'}</strong></div>
        <div class="tope"><span>Mínima cuantía</span><strong>${t.minimaCuantia ? esc(moneda(t.minimaCuantia)) : 'Pendiente'}</strong></div>
        <div class="tope"><span>SMMLV 2027</span><strong>${t.smmlv ? esc(moneda(t.smmlv)) : 'Pendiente'}</strong></div>
      </div>
      <p>${esc(t.regla || '')}</p>
      ${t.advertencia ? `<div class="notice">${icono('alerta')}<div>${esc(t.advertencia)}</div></div>` : ''}
      <p class="field-hint mb-0">${esc(String(t.estado || '').replace(/\[PENDIENTE DE VERIFICAR\]\s*/, ''))}</p>
    </section>

    <section class="card lecciones reveal" aria-labelledby="h-lec">
      <div class="card-head"><div><h2 id="h-lec" class="mb-0">Lo que aprendimos del plan 2026</h2><p>Errores encontrados al consolidar las necesidades del año pasado.</p></div></div>
      <div class="cifras-grandes">${(c.errores2026 || []).map((e) => `<div class="cifra-grande"><strong>${esc(e.cifra)}</strong><span>${esc(e.texto)}</span></div>`).join('')}</div>
    </section>

    <div class="grid-2">
      <section class="card reveal" aria-labelledby="h-campos">
        <h2 id="h-campos">Lo que revisa Contratación</h2>
        <dl class="campos">${(c.camposClave || []).map((x) => `<div><dt>${esc(x.campo)}</dt><dd>${esc(x.regla)}</dd></div>`).join('')}</dl>
      </section>
      <section class="card reveal" aria-labelledby="h-reglas">
        <h2 id="h-reglas">Reglas de oro</h2>
        <ul class="check-lista">${(c.reglas || []).map((r) => `<li>${icono('check', 'icon-sm')}<span>${esc(r)}</span></li>`).join('')}</ul>
      </section>
    </div>

    <section class="card reveal" aria-labelledby="h-norma">
      <h2 id="h-norma">Normativa</h2>
      <div class="acordeon">${(c.normativa || []).map((n) => `<details><summary>${esc(n.norma)}${icono('abajo', 'icon-sm')}</summary><p class="mb-0">${esc(n.contenido)}</p></details>`).join('')}</div>
      <details class="mas-info"><summary>Tipos de necesidad y fuentes de recursos${icono('abajo', 'icon-sm')}</summary>
        <div class="grid-2" style="margin-top:12px">
          <div><h4>Tipos de necesidad</h4><div class="chips-sugeridos">${(c.tiposNecesidad || []).map((x) => `<span class="chip">${esc(x)}</span>`).join('')}</div></div>
          <div><h4>Fuentes de recursos</h4><div class="chips-sugeridos">${(c.fuentes || []).map((x) => `<span class="chip">${esc(x)}</span>`).join('')}</div></div>
        </div></details>
      <p class="field-hint mb-0" style="margin-top:12px">Fuente: ${esc(c.fuente || '')}</p>
    </section>
  </div>`;

  pintarCalculo();
  on(panel, 'change', '[name="modalidad"], [name="fecha"]', pintarCalculo);
  on(panel, 'input', '[name="fecha"]', pintarCalculo);
}

const pestanaAdquisiciones = {
  id: 'adquisiciones',
  titulo: 'Plan de adquisiciones',
  tituloCorto: 'Plan de adquisiciones',
  tituloMovil: 'Adquisiciones',
  icono: 'adquisiciones',
  montar
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
 * Respaldo manual: código del pase o búsqueda por nombre o correo en el directorio (queda marcado «sin pase»).
 * La asistencia se guarda en este dispositivo y, con Microsoft 365, también en la lista de SharePoint.
 * El panel «Registros» muestra qué áreas ya registraron su Plan de acción y su Plan de necesidades.
 */
const { estado, on: alEvento, dependencia, dependencias, buscarPersonas, personasPorCorreo, nombreDependencia, area: areaPorId, areas } = __m["src/estado.js"];
const { esc, on } = __m["src/ui/dom.js"];
const { icono } = __m["src/ui/iconos.js"];
const { toast, toastError } = __m["src/ui/toast.js"];
const { confirmar } = __m["src/ui/modal.js"];
const { barrasHorizontales, animarNumero, activarAnimaciones } = __m["src/ui/cards.js"];
const { verificarPase } = __m["src/lib/qr.js"];
const { exportarExcel, xlsxDisponible } = __m["src/lib/excel.js"];
const { descargarBlob, obtenerLogo } = __m["src/lib/export.js"];
const { normalizar, tituloLegible, entero, iniciales } = __m["src/lib/formato.js"];
const { hoyISO, fechaCorta } = __m["src/lib/fechas.js"];
const { registrarAsistenciaEnLinea, leerRegistrosPanel, microsoftListo } = __m["src/lib/registro.js"];

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
  // En SharePoint sin detener la fila de ingreso; si falla queda en el dispositivo para exportar
  registrarAsistenciaEnLinea(registro).catch((e) => toastError('La asistencia quedó en el dispositivo, pero no llegó a SharePoint', e, e.message));
  return true;
}

// ───────── Pantalla completa de resultado ─────────
function mostrarOverlay(tipo, datos) {
  const ov = raiz.querySelector('[data-overlay]');
  clearTimeout(overlayTimer);
  const d = dependencia(datos.dependencia);
  const a = datos.area ? areaPorId(datos.area) : null;
  const lugar = a ? `${esc(a.id)} · ${esc(a.nombre)}` : `${esc(datos.dependencia)} · ${esc(d?.nombre || '')}`;
  const metodo = { QR: 'con QR', codigo: 'con código del pase', manual: 'manual sin pase' }[datos.metodo] || 'manual';
  const contenido = {
    ok: `<span class="ov-icono">${icono('check')}</span><span class="ov-estado">Bienvenido</span>
      <strong class="ov-nombre">${esc(datos.nombre)}</strong><span class="ov-cargo">${esc(datos.cargo || '')}</span>
      <span class="ov-dep">${lugar}</span><span class="ov-metodo">Registro ${metodo} · ${esc(horaCorta(datos.hora))}</span>`,
    duplicado: `<span class="ov-icono">${icono('alerta')}</span><span class="ov-estado">Ya registrado</span>
      <strong class="ov-nombre">${esc(datos.nombre)}</strong><span class="ov-dep">${lugar}</span>
      <span class="ov-primera">Primer ingreso a las <b>${esc(horaCorta(datos.hora))}</b> (${metodo})</span>`,
    rechazo: `<span class="ov-icono">${icono('cerrar')}</span><span class="ov-estado">Pase no válido</span>
      <strong class="ov-nombre">${esc(datos.motivo || 'El código no es un pase de la jornada.')}</strong>
      ${datos.nombre ? `<span class="ov-cargo">A nombre de: ${esc(datos.nombre)}</span>` : ''}<span class="ov-metodo">Sin pase válido no hay ingreso: la persona debe registrar el Plan de acción de su área.</span>`
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
  await registrar({ paseId: p.id, personaId: persona?.id || null, nombre: p.n, cargo: p.c, dependencia: String(p.d), area: p.a || '', correo: p.e || '', metodo: 'QR' });
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
  if (t.length < 2) { cont.innerHTML = '<p class="muted" style="font-size:.86rem">Escriba el código del pase (JP27-…) o al menos dos letras del nombre o del correo.</p>'; return; }
  // Código del pase dictado o leído del correo
  const codigo = t.toUpperCase().replace(/\s+/g, '');
  if (/^[A-Z0-9]+-\d{3}-[A-Z0-9]{3,5}$/.test(codigo) || codigo.startsWith(`${estado.indices.prefijo}-`)) {
    const pase = estado.consolidado.pases.find((x) => x.id === codigo);
    const a = pase?.a ? areaPorId(pase.a) : null;
    cont.innerHTML = pase
      ? `<ul class="manual-lista"><li class="manual-item"><span class="avatar avatar-sm" aria-hidden="true">${esc(iniciales(pase.n))}</span>
          <div class="manual-info"><strong>${esc(pase.n)}</strong><span>${esc(pase.c)}</span><span class="badge badge-ok">${esc(pase.id)}${a ? ` · ${esc(a.nombre)}` : ''}</span></div>
          ${buscarDuplicado({ paseId: pase.id }) ? '<span class="badge badge-warn">Ya ingresó</span>' : `<button type="button" class="btn btn-primary btn-sm" data-registrar-pase="${esc(pase.id)}">Registrar</button>`}</li></ul>`
      : `<div class="notice">${icono('info')}<div>Ese código no se emitió en este dispositivo${microsoftListo() ? '' : ' (sin Microsoft 365 cada equipo ve solo sus pases)'}. Pida a la persona que muestre el QR de su correo.</div></div>`;
    return;
  }
  const lista = buscarPersonas(t, 10);
  cont.innerHTML = lista.length ? `<ul class="manual-lista">${lista.map((p) => {
    const d = dependencia(p.dependencia);
    const nombre = p.nombre || 'Sin nombre en el directorio';
    const ya = buscarDuplicado({ personaId: p.id, nombre, correo: p.correo, dependencia: p.dependencia });
    return `<li class="manual-item">
      <span class="avatar avatar-sm" aria-hidden="true">${esc(iniciales(nombre))}</span>
      <div class="manual-info"><strong>${esc(nombre)}</strong><span>${esc(tituloLegible(p.cargo))}</span>
        <span class="row" style="gap:6px"><span class="badge proc-${esc(d?.tipoProceso || '')}"><span class="proc-dot"></span>${esc(p.dependencia)} · ${esc(d?.sigla || '')}</span>${p.correo ? `<span class="badge">${esc(p.correo)}</span>` : '<span class="badge badge-warn">Sin correo: solo registro manual</span>'}</span></div>
      ${ya ? `<span class="badge badge-warn">Ingresó ${esc(horaCorta(ya.hora))}</span>` : `<button type="button" class="btn btn-sm" data-registrar="${esc(p.id)}">Registrar sin pase</button>`}
    </li>`;
  }).join('')}</ul>` : `<div class="empty" style="padding:24px 12px"><p>No hay coincidencias en el directorio. Use el formulario de abajo para registrar a la persona.</p></div>`;
}

async function registrarManual(personaId) {
  const p = (estado.datos.directorio?.personas || []).find((x) => x.id === personaId);
  if (!p) return;
  const pase = estado.consolidado.pases.find((x) => x.e && x.e === p.correo);
  if (pase) { await registrarConPase(pase); return; }
  const seguir = await confirmar({ titulo: 'Ingreso sin pase', mensaje: 'Esta persona no presenta pase. Solo registre su ingreso si la Oficina Asesora de Planeación lo autoriza: quedará marcado como «sin pase».', aceptar: 'Registrar sin pase' });
  if (!seguir) return;
  let nombre = p.nombre;
  if (!nombre) {
    nombre = (window.prompt('El directorio no registra el nombre de esta persona. Escríbalo:') || '').trim();
    if (!nombre) return;
  }
  const ok = await registrar({ paseId: null, personaId: p.id, nombre, cargo: tituloLegible(p.cargo), dependencia: String(p.dependencia), correo: p.correo || '', metodo: 'manual' });
  if (ok) pintarResultadosManual(raiz.querySelector('#busqueda-manual').value);
}

async function registrarConPase(pase) {
  const persona = personasPorCorreo(pase.e).find((x) => !x.nombre || x.nombre === pase.n) || null;
  const ok = await registrar({ paseId: pase.id, personaId: persona?.id || null, nombre: pase.n, cargo: pase.c, dependencia: String(pase.d), area: pase.a || '', correo: pase.e || '', metodo: 'codigo' });
  if (ok) pintarResultadosManual(raiz.querySelector('#busqueda-manual').value);
}

// ───────── Contador y lista ─────────
function pintarContador() {
  if (!raiz) return;
  const lista = estado.consolidado.asistencia;
  const n = raiz.querySelector('[data-contador]');
  animarNumero(n, lista.length, 500);
  raiz.querySelector('[data-contador-pie]').textContent = `${new Set(lista.map((a) => a.area || a.dependencia)).size} áreas · ${lista.filter((a) => a.metodo === 'QR' || a.metodo === 'codigo').length} con pase · ${lista.filter((a) => a.metodo === 'manual').length} sin pase`;
  const items = dependencias().map((d) => ({ etiqueta: `${d.codigo} · ${d.sigla}`, valor: lista.filter((a) => String(a.dependencia) === String(d.codigo)).length, clase: `proc-${d.tipoProceso}`, proc: true }))
    .filter((i) => i.valor > 0).sort((a, b) => b.valor - a.valor);
  raiz.querySelector('[data-desglose]').innerHTML = items.length ? barrasHorizontales(items) : '<p class="muted mb-0">Aún no hay asistentes registrados.</p>';
  const recientes = [...lista].sort((a, b) => b.hora.localeCompare(a.hora)).slice(0, 6);
  raiz.querySelector('[data-recientes]').innerHTML = recientes.length ? recientes.map((a) => `<li><span class="mono">${esc(horaCorta(a.hora))}</span><span><strong>${esc(a.nombre)}</strong> · ${esc(a.area ? areaPorId(a.area)?.nombre || a.area : dependencia(a.dependencia)?.sigla || a.dependencia)}</span><span class="badge ${a.metodo === 'manual' ? 'badge-warn' : 'badge-ok'}">${{ QR: 'QR', codigo: 'Código' }[a.metodo] || 'Sin pase'}</span></li>`).join('') : '<li class="muted">Sin registros todavía.</li>';
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
        columnas: [{ titulo: 'Nombre', ancho: 36 }, { titulo: 'Cargo', ancho: 36 }, { titulo: 'Área funcional', ancho: 40 }, { titulo: 'Dependencia', ancho: 44 }, { titulo: 'Código de dependencia', ancho: 14 }, { titulo: 'Correo', ancho: 34 }, { titulo: 'Código del pase', ancho: 20 }, { titulo: 'Hora de ingreso', ancho: 22 }, { titulo: 'Método de registro', ancho: 18 }],
        filas: lista.map((a) => [a.nombre, a.cargo, a.area ? `${a.area} · ${areaPorId(a.area)?.nombre || ''}` : '', nombreDependencia(a.dependencia), a.dependencia, a.correo, a.paseId || '', new Date(a.hora).toLocaleString('es-CO'), { QR: 'QR', codigo: 'Código del pase' }[a.metodo] || 'Manual sin pase'])
      }]
    });
    descargarBlob(r.blob, r.nombre);
    await ctxApp.almacen.guardarMeta({ asistenciaExportada: lista.length });
    await ctxApp.refrescarConsolidado();
    toast({ tipo: 'ok', titulo: 'Asistencia exportada', mensaje: `${lista.length} registros en ${r.nombre}` });
  } catch (e) { toastError('No se pudo exportar la asistencia', e, e.message); }
}

// ───────── Registros por área (panel de la OAP) ─────────
let registrosCache = null;
async function pintarRegistros(forzar = false) {
  const caja = raiz.querySelector('[data-registros]');
  if (!registrosCache || forzar) {
    caja.innerHTML = '<div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line" style="width:70%"></div>';
    try { registrosCache = await leerRegistrosPanel(); } catch (e) { caja.innerHTML = `<div class="notice notice-danger">${icono('alerta')}<div>${esc(e.message)}</div></div>`; return; }
  }
  const vigente = (tipo, id) => registrosCache.filter((r) => r.tipo === tipo && r.area?.id === id).sort((x, y) => String(y.fecha).localeCompare(String(x.fecha)))[0];
  const filas = areas().map((a) => ({ a, pa: vigente('accion', a.id), pn: vigente('necesidades', a.id) }));
  const nPa = filas.filter((f) => f.pa).length;
  const nPn = filas.filter((f) => f.pn).length;
  raiz.querySelector('[data-origen-registros]').textContent = `Fuente: ${microsoftListo() ? 'SharePoint (todas las áreas)' : 'este navegador'} · ${registrosCache.length} registros`;
  const celda = (r) => (r ? `<a class="badge badge-ok" ${r.enlace ? `href="${esc(r.enlace)}" target="_blank" rel="noopener"` : ''} title="${esc(r.responsable?.nombre || '')} · ${esc(fechaCorta(String(r.fecha).slice(0, 10)))}">${icono('check', 'icon-sm')}${esc(fechaCorta(String(r.fecha).slice(0, 10)).replace(/ \d{4}$/, ''))}</a>` : '<span class="badge">Pendiente</span>');
  caja.innerHTML = `<div class="avance-areas">
      <div><strong>${nPa}/${filas.length}</strong><span>con Plan de acción</span><span class="pbar"><span style="width:${(nPa / filas.length) * 100}%"></span></span></div>
      <div><strong>${nPn}/${filas.length}</strong><span>con Plan de necesidades</span><span class="pbar gold"><span style="width:${(nPn / filas.length) * 100}%"></span></span></div>
    </div>
    <ul class="areas-lista">${filas.map(({ a, pa, pn }) => `<li><span class="areas-nombre"><strong>${esc(a.id)}</strong> ${esc(a.nombre)}<small>${esc(a.dependencia)} · ${esc(dependencia(a.dependencia)?.sigla || '')}${pa ? ` · ${esc(pa.responsable?.nombre || '')}` : ''}</small></span>
      <span class="areas-estado"><span class="sr-only">Plan de acción:</span>${celda(pa)}<span class="sr-only">Plan de necesidades:</span>${celda(pn)}</span></li>`).join('')}</ul>
    <p class="field-hint mb-0">Columnas: Plan de acción · Plan de necesidades. Toque una insignia para abrir el archivo.</p>`;
}

async function exportarRegistros() {
  try {
    if (!registrosCache) registrosCache = await leerRegistrosPanel();
    const logo = await obtenerLogo();
    const r = exportarExcel({
      nombreArchivo: `JP2027_Registros_${hoyISO()}.xlsx`,
      logo: logo.bytes,
      hojas: [{
        nombre: 'Registros', titulo: 'Registro de plantillas formuladas — Jornada de Planeación 2027', subtitulo: `${registrosCache.length} registros · ${microsoftListo() ? 'SharePoint' : 'este navegador'}`,
        columnas: [{ titulo: 'Código', ancho: 30 }, { titulo: 'Tipo', ancho: 20 }, { titulo: 'Área', ancho: 40 }, { titulo: 'Dependencia', ancho: 40 }, { titulo: 'Responsable', ancho: 32 }, { titulo: 'Cargo', ancho: 30 }, { titulo: 'Correo', ancho: 32 }, { titulo: 'Correos del equipo', ancho: 44 }, { titulo: 'Enlace', ancho: 50 }, { titulo: 'Estado', ancho: 16 }, { titulo: 'Resumen', ancho: 60 }, { titulo: 'Pase', ancho: 20 }, { titulo: 'Fecha', ancho: 20 }],
        filas: registrosCache.map((x) => [x.id, x.tipo === 'accion' ? 'Plan de acción' : 'Plan de necesidades', `${x.area?.id || ''} · ${x.area?.nombre || ''}`, `${x.dependencia?.codigo || ''} · ${x.dependencia?.nombre || ''}`, x.responsable?.nombre, x.responsable?.cargo, x.responsable?.correo, (x.correosEquipo || []).join('; '), x.enlace || '', x.estado === 'validada' ? 'Validada' : 'Con bloqueantes', x.resumenTexto || '', x.codigoPase || '', new Date(x.fecha).toLocaleString('es-CO')])
      }]
    });
    descargarBlob(r.blob, r.nombre);
  } catch (e) { toastError('No se pudo exportar', e, e.message); }
}

function montar(panel, ctx) {
  raiz = panel;
  ctxApp = ctx;
  panel.innerHTML = `<div class="container escaner">
    <div class="aviso-export" data-aviso-export role="status">
      ${icono('alerta', 'icon-sm')}
      <span><strong>${microsoftListo() ? 'La asistencia se guarda en SharePoint y en este dispositivo.' : 'La asistencia se guarda solo en este dispositivo.'}</strong> Expórtela a Excel antes de cerrar. <span data-sin-exportar></span></span>
      <button type="button" class="btn btn-sm" data-exportar ${xlsxDisponible() ? '' : 'disabled'}>${icono('excel', 'icon-sm')}Exportar</button>
    </div>

    <div class="escaner-grid">
      <div class="stack">
        <div class="contador-card">
          <span class="eyebrow">${icono('personas', 'icon-sm')}Asistentes registrados</span>
          <span class="contador-n" data-contador data-formato="entero">0</span>
          <span class="contador-pie" data-contador-pie></span>
        </div>

        <div class="segmentado-lg is-3" role="tablist" aria-label="Forma de registro">
          <button type="button" role="tab" id="m-camara" aria-controls="p-camara" aria-selected="true" data-modo="camara">${icono('camara', 'icon-sm')}Cámara</button>
          <button type="button" role="tab" id="m-manual" aria-controls="p-manual" aria-selected="false" tabindex="-1" data-modo="manual">${icono('teclado', 'icon-sm')}Manual</button>
          <button type="button" role="tab" id="m-registros" aria-controls="p-registros" aria-selected="false" tabindex="-1" data-modo="registros">${icono('baseDatos', 'icon-sm')}Áreas</button>
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
          <label class="field"><span class="field-label">Código del pase, nombre o correo</span>
            <div class="input-icon">${icono('buscar')}<input class="input" id="busqueda-manual" type="search" placeholder="JP27-101-ABCDE o nombre" autocomplete="off"></div></label>
          <div data-resultados-manual aria-live="polite" style="margin-top:12px"></div>
          <details class="manual-nuevo">
            <summary>¿No está en el directorio? Registrar manualmente</summary>
            <p class="field-hint" style="margin-top:8px">Queda marcado «sin pase». Úselo solo con autorización de la OAP.</p>
            <form class="stack" data-form-nuevo style="margin-top:12px">
              <label class="field"><span class="field-label">Nombre completo</span><input class="input" name="nombre" required></label>
              <label class="field"><span class="field-label">Cargo</span><input class="input" name="cargo"></label>
              <label class="field"><span class="field-label">Dependencia</span><select class="select" name="dependencia" required><option value="">Elija…</option>${dependencias().map((d) => `<option value="${esc(d.codigo)}">${esc(d.codigo)} · ${esc(d.nombre)}</option>`).join('')}</select></label>
              <label class="field"><span class="field-label">Correo (opcional)</span><input class="input" name="correo" type="email"></label>
              <button type="submit" class="btn btn-primary">Registrar asistencia</button>
            </form>
          </details>
        </div>

        <div class="card escaner-card" id="p-registros" role="tabpanel" aria-labelledby="m-registros" hidden>
          <div class="row-between"><div><h3 class="mb-0">Registros por área</h3><p class="field-hint mb-0" data-origen-registros></p></div>
            <div class="btn-group"><button type="button" class="btn btn-sm" data-recargar-registros>${icono('refrescar', 'icon-sm')}Actualizar</button>
            <button type="button" class="btn btn-sm" data-exportar-registros ${xlsxDisponible() ? '' : 'disabled'}>${icono('excel', 'icon-sm')}Excel</button></div></div>
          <div data-registros style="margin-top:12px"></div>
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
  on(panel, 'click', '[data-registrar-pase]', (ev, b) => { const p = estado.consolidado.pases.find((x) => x.id === b.dataset.registrarPase); if (p) registrarConPase(p); });
  on(panel, 'click', '[data-recargar-registros]', () => pintarRegistros(true));
  on(panel, 'click', '[data-exportar-registros]', exportarRegistros);
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
    const ok = await registrar({ paseId: null, personaId: null, nombre, cargo: String(f.get('cargo') || '').trim(), dependencia: dep, area: '', correo: String(f.get('correo') || '').trim().toLowerCase(), metodo: 'manual', noVerificado: true });
    if (ok) ev.target.reset();
  });
  on(panel, 'click', '[data-modo]', (ev, b) => cambiarModo(b.dataset.modo));
  panel.querySelector('.segmentado-lg').addEventListener('keydown', (ev) => {
    if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
    ev.preventDefault();
    const orden = ['camara', 'manual', 'registros'];
    cambiarModo(orden[(orden.indexOf(modo) + (ev.key === 'ArrowRight' ? 1 : 2)) % 3]);
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
  raiz.querySelector('#p-registros').hidden = nuevo !== 'registros';
  if (nuevo !== 'camara') detenerCamara();
  if (nuevo === 'manual') setTimeout(() => raiz.querySelector('#busqueda-manual').focus(), 50);
  if (nuevo === 'registros') pintarRegistros();
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
 * app.js — Arranque, enrutamiento de pestañas y conexión con Microsoft 365.
 *  1. Carga los datos de /data (con respaldo empaquetado en file://).
 *  2. Si el conector Microsoft 365 está configurado, procesa el inicio de sesión y lee el directorio privado.
 *  3. Lee el respaldo local (registros, pases, asistencia) y construye la navegación por hash.
 * Cuatro pestañas (Calendario, Plan de acción, Plan de necesidades, Plan de adquisiciones) y la vista Escáner.
 */
const { FEATURES } = __m["src/config.js"];
const { almacen } = __m["src/storage.js"];
const { estado, fijarDatos, fijarConsolidado, on, emitir, indexarDirectorio } = __m["src/estado.js"];
const { cargarDatos, cargarDesdeArchivos } = __m["src/lib/datos.js"];
const { esperarLibrerias, avisarLibreriasFaltantes } = __m["src/lib/libs.js"];
const { descargarTexto, obtenerLogo } = __m["src/lib/export.js"];
const ms = __m["src/lib/microsoft.js"];
const { crearPestanas } = __m["src/ui/tabs.js"];
const { toast, toastError } = __m["src/ui/toast.js"];
const { skeletonPestana } = __m["src/ui/skeleton.js"];
const { icono } = __m["src/ui/iconos.js"];
const { esc, qs } = __m["src/ui/dom.js"];
const { iniciales } = __m["src/lib/formato.js"];
const { activarAnimaciones } = __m["src/ui/cards.js"];
const { pestanaCalendario } = __m["src/tabs/calendario.js"];
const { pestanaAccion } = __m["src/tabs/accion.js"];
const { pestanaNecesidades } = __m["src/tabs/necesidades.js"];
const { pestanaAdquisiciones } = __m["src/tabs/adquisiciones.js"];
const { pestanaRiesgos } = __m["src/tabs/riesgos.js"];
const { vistaEscaner } = __m["src/tabs/escaner.js"];

const PESTANAS = [pestanaCalendario, pestanaAccion, pestanaNecesidades, pestanaAdquisiciones]
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
  riesgosActivo: FEATURES.mapaRiesgos,
  emitirIdentificacion: () => emitir('identificacion')
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

// ───────── Microsoft 365 ─────────
async function iniciarMicrosoft() {
  const cfg = estado.datos.config?.microsoft;
  if (!ms.configurado(cfg)) return;
  estado.microsoft.activo = true;
  try {
    const cuenta = await ms.iniciar(cfg);
    estado.microsoft.cuenta = cuenta;
    if (cuenta) {
      try { estado.microsoft.perfil = await ms.perfil(); } catch (e) { console.warn(e); }
      try {
        const dir = await ms.leerDirectorio();
        if (dir && Array.isArray(dir.personas)) {
          estado.datos.directorio = dir;
          indexarDirectorio(dir);
          estado.origenDatos.directorio = 'sharepoint';
        }
      } catch (e) { console.warn('No se leyó el directorio desde SharePoint', e); }
      try {
        const volver = sessionStorage.getItem('etitc-jp27:volver');
        if (volver) { sessionStorage.removeItem('etitc-jp27:volver'); if (volver !== location.hash) history.replaceState(null, '', volver); }
      } catch { /* opcional */ }
    }
  } catch (e) {
    estado.microsoft.error = e.message;
    toastError('No se pudo conectar con Microsoft 365', e, `${e.message} La aplicación sigue en modo local.`);
  }
  pintarSesion();
  emitir('sesion', estado.microsoft);
}

function pintarSesion() {
  const caja = qs('#sesion-microsoft');
  if (!estado.microsoft.activo) { caja.hidden = true; return; }
  caja.hidden = false;
  const c = estado.microsoft.cuenta;
  const p = estado.microsoft.perfil;
  if (!c) {
    caja.innerHTML = `<button type="button" class="btn btn-sm" data-ms="entrar">${icono('persona', 'icon-sm')}<span class="btn-texto">Ingresar</span></button>`;
  } else {
    const nombre = p?.displayName || c.name || c.username;
    caja.innerHTML = `<button type="button" class="avatar-btn" data-ms="menu" aria-haspopup="true" aria-expanded="false" title="${esc(nombre)} · ${esc(c.username)}">
      <span class="avatar avatar-xs" aria-hidden="true">${esc(iniciales(nombre))}</span><span class="sr-only">Sesión de ${esc(nombre)}</span></button>
      <div class="menu-ms" hidden><strong>${esc(nombre)}</strong><span>${esc(c.username)}</span>
      <button type="button" class="btn btn-sm btn-ghost" data-ms="salir">${icono('cerrar', 'icon-sm')}Cerrar sesión</button></div>`;
  }
}

function enlazarSesion() {
  const caja = qs('#sesion-microsoft');
  caja.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-ms]');
    if (!b) return;
    try {
      if (b.dataset.ms === 'entrar') { await ms.iniciarSesion(); estado.microsoft.cuenta = ms.cuentaActiva(); pintarSesion(); emitir('sesion', estado.microsoft); }
      if (b.dataset.ms === 'menu') {
        const m = caja.querySelector('.menu-ms');
        m.hidden = !m.hidden;
        b.setAttribute('aria-expanded', String(!m.hidden));
      }
      if (b.dataset.ms === 'salir') { await ms.cerrarSesion(); estado.microsoft.cuenta = null; pintarSesion(); emitir('sesion', estado.microsoft); }
    } catch (e) { toastError('No se pudo completar el inicio de sesión', e, e.message); }
  });
  document.addEventListener('click', (ev) => {
    const m = caja.querySelector('.menu-ms');
    if (m && !m.hidden && !caja.contains(ev.target)) { m.hidden = true; caja.querySelector('[data-ms="menu"]')?.setAttribute('aria-expanded', 'false'); }
  });
}

// Disponible para las pestañas que necesitan pedir el inicio de sesión
ctx.iniciarSesionMicrosoft = async () => { await ms.iniciarSesion(); estado.microsoft.cuenta = ms.cuentaActiva(); if (estado.microsoft.cuenta) { try { estado.microsoft.perfil = await ms.perfil(); } catch { /* opcional */ } } pintarSesion(); emitir('sesion', estado.microsoft); };

// ───────── Respaldo local (pie de página) ─────────
function pintarPie(origen, fechaEmpaquetado) {
  const pie = qs('#pie-acciones');
  const enDisco = Object.values(origen).includes('empaquetado');
  pie.innerHTML = `
    <button type="button" class="btn btn-sm btn-ghost" data-pie="respaldo">${icono('guardar', 'icon-sm')}Exportar respaldo</button>
    <button type="button" class="btn btn-sm btn-ghost" data-pie="importar">${icono('subir', 'icon-sm')}Importar respaldo</button>
    <input type="file" accept=".json,application/json" hidden data-pie-importar>
    ${enDisco ? `<button type="button" class="btn btn-sm btn-ghost" data-pie="carpeta">${icono('carpeta', 'icon-sm')}Cargar carpeta data</button><input type="file" webkitdirectory multiple hidden data-pie-carpeta>` : ''}`;
  pie.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-pie]');
    if (!b) return;
    if (b.dataset.pie === 'respaldo') {
      try {
        const r = await almacen.exportarRespaldo();
        descargarTexto(JSON.stringify(r, null, 2), `JP2027_respaldo_${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json`, 'application/json');
        await almacen.guardarMeta({ ultimoRespaldo: new Date().toISOString() });
        toast({ tipo: 'ok', titulo: 'Respaldo descargado', mensaje: 'Contiene los registros, pases y asistencia guardados en este navegador.' });
      } catch (e) { toastError('No se pudo exportar el respaldo', e); }
    }
    if (b.dataset.pie === 'importar') pie.querySelector('[data-pie-importar]').click();
    if (b.dataset.pie === 'carpeta') pie.querySelector('[data-pie-carpeta]').click();
  });
  pie.querySelector('[data-pie-importar]').addEventListener('change', async (ev) => {
    const f = ev.target.files[0];
    ev.target.value = '';
    if (!f) return;
    try {
      await almacen.importarRespaldo(JSON.parse(await f.text()));
      await ctx.refrescarConsolidado();
      toast({ tipo: 'ok', titulo: 'Respaldo importado', mensaje: 'Se combinó con la información de este navegador.' });
    } catch (e) { toastError('No se pudo importar el respaldo', e, e.message); }
  });
  const carpeta = pie.querySelector('[data-pie-carpeta]');
  if (carpeta) carpeta.addEventListener('change', async () => {
    try {
      const { datos, leidos } = await cargarDesdeArchivos(carpeta.files, estado.datos);
      if (!leidos.length) { toast({ tipo: 'warn', titulo: 'No se encontraron archivos de datos', mensaje: 'Elija la carpeta data del proyecto.' }); return; }
      fijarDatos(datos);
      toast({ tipo: 'ok', titulo: 'Datos actualizados', mensaje: `Se leyeron ${leidos.length} archivos. Recargando…` });
      setTimeout(() => location.reload(), 900);
    } catch (e) { toastError('No se pudieron leer los archivos', e, e.message); }
  });
  if (enDisco) {
    toast({ tipo: 'info', titulo: 'Abierto desde el disco', mensaje: `Se usa la copia empaquetada de los datos${fechaEmpaquetado ? ` (${fechaEmpaquetado.slice(0, 10)})` : ''}. Para la jornada publique el sitio en GitHub Pages.`, duracion: 9000 });
  }
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
  const medirBarra = () => document.documentElement.style.setProperty('--alto-barra', `${qs('.topbar').offsetHeight}px`);
  medirBarra();
  window.addEventListener('resize', medirBarra);
  navegacion = crearPestanas(qs('#pestanas'), PESTANAS, (id) => ctx.ir(id));
  enlazarSesion();

  let carga;
  try { carga = await cargarDatos(); } catch (e) { errorFatal(e); return; }
  fijarDatos(carga.datos, carga.origen);
  carga.problemas.forEach((p) => toast({ tipo: 'warn', titulo: `No se leyó ${p.ruta}`, mensaje: 'Esa sección se mostrará vacía. Revise que el archivo exista y sea JSON válido.' }));
  obtenerLogo().catch(() => null);

  try { fijarConsolidado(await almacen.leerConsolidado()); } catch (e) { toastError('No se pudo leer la información guardada', e, e.message); }
  await iniciarMicrosoft();

  qs('#contenido').innerHTML = '';
  window.addEventListener('hashchange', () => mostrar(idDesdeHash()));
  await mostrar(idDesdeHash());
  pintarPie(carga.origen, carga.fechaEmpaquetado);
  if (!almacen.persistente) toast({ tipo: 'warn', titulo: 'Sin almacenamiento local', mensaje: 'Este navegador no permite guardar datos (modo privado). Exporte la información antes de cerrar.', duracion: 12000 });

  await esperarLibrerias();
  avisarLibreriasFaltantes();
  emitir('librerias');

  window.addEventListener('beforeunload', (ev) => {
    const { asistencia, meta } = estado.consolidado;
    if (asistencia.length > (meta?.asistenciaExportada || 0)) { ev.preventDefault(); ev.returnValue = ''; }
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
else iniciar();



Object.assign(__m["src/app.js"], { on });
})();
})();
