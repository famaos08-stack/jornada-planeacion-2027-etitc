/*
 * app.bundle.js — ARCHIVO GENERADO por tools/empaquetar.mjs el 2026-10-26T23:55:28.324Z. No editar a mano.
 * Contiene los 30 módulos de src/ como un script clásico para abrir la app con doble clic (file://).
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
 * El registro en línea (descargas y lecturas del QR) se configura en data/config.json → registro.
 */

// Banderas de funcionalidad. Con mapaRiesgos en true aparece la pestaña del mapa de riesgos.
const FEATURES = { mapaRiesgos: false };

// Prefijo de las claves de localStorage (respaldo de sesión en este navegador).
const PREFIJO_LOCAL = 'etitc-jp27';

// Archivos de datos que se cargan al inicio (todos en /data).
const ARCHIVOS_DATOS = {
  config: 'data/config.json',
  directorio: 'data/directorio.cifrado.json',
  lectores: 'data/lectores.json',
  dependencias: 'data/dependencias.json',
  areas: 'data/areas.json',
  agenda: 'data/agenda.json',
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
 * storage.js — Respaldo en este navegador (localStorage).
 * Guarda las descargas registradas, los pases emitidos y las lecturas del escáner. Con el registro en línea
 * configurado (Apps Script), la fuente oficial es la hoja de cálculo y esto es un espejo local; sin él, es el
 * único registro del dispositivo y por eso la interfaz pide exportarlo.
 * Interfaz: guardarDescarga, guardarPase, guardarAsistencia, leerConsolidado, guardarMeta,
 *           reemplazarAsistencia, exportarRespaldo, importarRespaldo, borrarTodo.
 */
const { PREFIJO_LOCAL } = __m["src/config.js"];

function crearLocal() {
  const CLAVES = { descargas: `${PREFIJO_LOCAL}:descargas`, pases: `${PREFIJO_LOCAL}:pases`, asistencia: `${PREFIJO_LOCAL}:asistencia`, meta: `${PREFIJO_LOCAL}:meta` };
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
    async guardarDescarga(r) { escribir(CLAVES.descargas, unir(leer(CLAVES.descargas, []), r, 'id')); return r; },
    async guardarPase(p) { escribir(CLAVES.pases, unir(leer(CLAVES.pases, []), p, 'id')); return p; },
    async guardarAsistencia(a) { const l = leer(CLAVES.asistencia, []); l.push(a); escribir(CLAVES.asistencia, l); return a; },
    async reemplazarAsistencia(lista) { escribir(CLAVES.asistencia, lista); },
    async leerConsolidado() {
      return { descargas: leer(CLAVES.descargas, []), pases: leer(CLAVES.pases, []), asistencia: leer(CLAVES.asistencia, []), meta: leer(CLAVES.meta, {}) };
    },
    async guardarMeta(cambios) { escribir(CLAVES.meta, { ...leer(CLAVES.meta, {}), ...cambios }); },
    async exportarRespaldo() {
      return { tipo: 'respaldo-jp2027', version: 3, generado: new Date().toISOString(), ...(await this.leerConsolidado()) };
    },
    async importarRespaldo(r) {
      if (!r || r.tipo !== 'respaldo-jp2027') throw new Error('El archivo no es un respaldo de la Jornada de Planeación 2027.');
      const actual = await this.leerConsolidado();
      const regs = new Map(actual.descargas.map((x) => [x.id, x]));
      (r.descargas || []).forEach((x) => regs.set(x.id, x));
      const pases = new Map(actual.pases.map((x) => [x.id, x]));
      (r.pases || []).forEach((x) => pases.set(x.id, x));
      const asis = new Map(actual.asistencia.map((x) => [x.clave, x]));
      (r.asistencia || []).forEach((x) => { if (!asis.has(x.clave)) asis.set(x.clave, x); });
      escribir(CLAVES.descargas, [...regs.values()].sort((a, b) => String(a.fecha).localeCompare(String(b.fecha))));
      escribir(CLAVES.pases, [...pases.values()]);
      escribir(CLAVES.asistencia, [...asis.values()].sort((a, b) => String(a.hora).localeCompare(String(b.hora))));
    },
    async borrarTodo() { Object.values(CLAVES).forEach((k) => { try { localStorage.removeItem(k); } catch { delete memoria[k]; } }); }
  };
}

const almacen = crearLocal();

Object.assign(__m["src/storage.js"], { almacen });
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
const { crearCalendario } = __m["src/lib/fechas.js"];
const { similitud } = __m["src/lib/similitud.js"];

const estado = {
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
  estado.indices.calendario = crearCalendario(datos.festivos?.festivos || []);
  estado.indices.sal = datos.config?.pase?.salFirma || 'ETITC-JP27';
  estado.indices.prefijo = datos.config?.pase?.prefijo || 'JP27';
  emitir('datos', datos);
}

function fijarConsolidado(c) {
  estado.consolidado = { descargas: [], pases: [], asistencia: [], meta: {}, ...c };
  emitir('consolidado', estado.consolidado);
}

function dependencia(codigo) { return estado.indices.dependencias.get(String(codigo)) || null; }
function nombreDependencia(codigo) { const d = dependencia(codigo); return d ? d.nombre : `Dependencia ${codigo}`; }
function dependencias() { return estado.datos?.dependencias?.dependencias || []; }
function area(id) { return estado.indices.areas.get(id) || null; }
function areas() { return estado.datos?.areas?.areas || []; }

// Sugiere el área funcional de una persona del directorio: dentro de su dependencia, la de nombre más parecido a su grupo o cargo.
function sugerirArea(persona) {
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

function umbral(nombre, defecto) { return estado.datos?.config?.umbrales?.[nombre] ?? defecto; }

Object.assign(__m["src/estado.js"], { on, emitir, fijarDatos, fijarConsolidado, dependencia, nombreDependencia, dependencias, area, areas, sugerirArea, umbral, estado });
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
  directorio: (d) => Boolean(d && d.registros && d.sal),
  lectores: (d) => Array.isArray(d?.lectores),
  dependencias: (d) => Array.isArray(d?.dependencias),
  areas: (d) => Array.isArray(d?.areas),
  agenda: (d) => Array.isArray(d?.dias),
  festivos: (d) => Array.isArray(d?.festivos),
  riesgos: (d) => Array.isArray(d?.riesgos)
};

const VACIOS = {
  config: {}, agenda: { dias: [], ruta: { fases: [] } }, directorio: { registros: {}, sal: '', iteraciones: 1 }, lectores: { lectores: [], sal: '' },
  festivos: { festivos: [] }, riesgos: { riesgos: [], procesos: [], escalas: {} }
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
      const receso = b.tipo === 'receso';
      const ancho = W - 2 * M - 64;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(receso ? 9 : 10);
      const titulo = doc.splitTextToSize(b.titulo, ancho);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.3);
      const detalle = !receso && b.detalle && b.detalle !== b.titulo ? doc.splitTextToSize(b.detalle, ancho) : [];
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.8);
      const respTxt = b.responsables && b.responsables.length ? b.responsables.join(', ') : (b.responsable || '');
      const respLineas = receso || !respTxt ? [] : doc.splitTextToSize(respTxt, 32);
      const alto = Math.max(9, 3 + titulo.length * 4.3 + detalle.length * 3.7 + 2.5, 3 + respLineas.length * 3.4 + 2);
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
        const resp = respLineas;
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

// ── src/lib/remoto.js ──
__m["src/lib/remoto.js"] = {};
(function () {
/*
 * remoto.js — Registro en línea en una hoja de cálculo de Google mediante una aplicación web de Apps Script
 * (código en apps-script/Codigo.gs y guía en docs/REGISTRO_EN_LINEA.md).
 * Cada envío se guarda primero en una cola local y se reintenta hasta que llega: si no hay internet en el
 * auditorio, nada se pierde. Sin URL configurada, el aplicativo trabaja solo con el registro del dispositivo.
 */
const { PREFIJO_LOCAL } = __m["src/config.js"];
const { estado, emitir } = __m["src/estado.js"];

const CLAVE_COLA = `${PREFIJO_LOCAL}:cola`;
let enviando = false;

const cfg = () => estado.datos?.config?.registro || {};
const remotoConfigurado = () => Boolean(cfg().url);

function leerCola() {
  try { return JSON.parse(localStorage.getItem(CLAVE_COLA) || '[]'); } catch { return []; }
}
function escribirCola(c) {
  try { localStorage.setItem(CLAVE_COLA, JSON.stringify(c)); } catch { /* sin almacenamiento */ }
  emitir('cola', c.length);
}
const pendientes = () => leerCola().length;

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
async function enviar(accion, datos, { esperar = false } = {}) {
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

async function vaciarCola() {
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

async function leerPanel(claveAdmin) {
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

Object.assign(__m["src/lib/remoto.js"], { enviar, vaciarCola, leerPanel, remotoConfigurado, pendientes });
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

// ── src/lib/directorio.js ──
__m["src/lib/directorio.js"] = {};
(function () {
/*
 * directorio.js — Consulta del directorio institucional cifrado (data/directorio.cifrado.json).
 * El sitio es público: el directorio no se publica en claro. Cada registro está cifrado con una clave que se
 * deriva del propio correo, así que solo quien escribe un correo exacto ve el nombre, el cargo y la dependencia
 * que le corresponden. El índice es un resumen SHA-256 con sal, de modo que tampoco se expone la lista de correos.
 */
const { estado } = __m["src/estado.js"];

const enc = new TextEncoder();
const dec = new TextDecoder();
const cache = new Map();

const deB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const aHex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');

function cifradoDisponible() {
  return Boolean(window.crypto && window.crypto.subtle && estado.datos?.directorio?.registros);
}

function normalizarCorreo(correo) {
  return String(correo || '').trim().toLowerCase();
}

/*
 * buscarPorCorreo(correo) → [{ n: nombre, c: cargo, d: código de dependencia, g: grupo }] o [] si no está.
 * Un buzón compartido puede devolver varias personas.
 */
async function buscarPorCorreo(correo) {
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

async function resumen(texto) {
  return aHex(await crypto.subtle.digest('SHA-256', enc.encode(texto)));
}

Object.assign(__m["src/lib/directorio.js"], { cifradoDisponible, normalizarCorreo, buscarPorCorreo, resumen });
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

// ── src/ui/registro-descarga.js ──
__m["src/ui/registro-descarga.js"] = {};
(function () {
/*
 * registro-descarga.js — Formulario que habilita la descarga de la Plantilla Plan de Acción 2027.
 * Pide el correo institucional (con él se consulta el directorio cifrado y se completan nombre, cargo y dependencia),
 * la dependencia, el área funcional y quién cargará el documento en el SUIE. Al registrar:
 *   1. guarda la descarga en el dispositivo y la envía al registro en línea (hoja de Google),
 *   2. descarga la plantilla,
 *   3. emite el pase QR de ingreso a la jornada y lo envía por correo.
 */
const { PREFIJO_LOCAL } = __m["src/config.js"];
const { estado, dependencias, dependencia, areas, area: areaPorId, sugerirArea, emitir } = __m["src/estado.js"];
const { esc } = __m["src/ui/dom.js"];
const { icono } = __m["src/ui/iconos.js"];
const { abrirModal } = __m["src/ui/modal.js"];
const { toast, toastError } = __m["src/ui/toast.js"];
const { almacen } = __m["src/storage.js"];
const { buscarPorCorreo, normalizarCorreo, cifradoDisponible } = __m["src/lib/directorio.js"];
const { crearPase, contenidoQR, qrComoDataUrl, qrDisponible } = __m["src/lib/qr.js"];
const { enviar, remotoConfigurado } = __m["src/lib/remoto.js"];
const { descargarBlob } = __m["src/lib/export.js"];

const CLAVE_IDENT = `${PREFIJO_LOCAL}:descargador`;
const dominio = () => estado.datos?.config?.dominioInstitucional || '@itc.edu.co';
const correoValido = (c) => /^[a-z0-9._%+-]+$/.test(String(c).split('@')[0] || '') && String(c).endsWith(dominio()) && String(c).length > dominio().length;

function identificacion() {
  if (estado.identificacion) return estado.identificacion;
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE_IDENT) || 'null');
    if (v && v.correo) estado.identificacion = v;
  } catch { /* sin almacenamiento */ }
  return estado.identificacion;
}
function guardarIdentificacion(v) {
  estado.identificacion = v;
  try { if (v) localStorage.setItem(CLAVE_IDENT, JSON.stringify(v)); else localStorage.removeItem(CLAVE_IDENT); } catch { /* opcional */ }
  emitir('identificacion', v);
}
function olvidarIdentificacion() { guardarIdentificacion(null); }

function paseDe(ident) {
  if (!ident) return null;
  return estado.consolidado.pases.find((p) => p.id === ident.paseId) || estado.consolidado.pases.find((p) => p.e === ident.correo) || null;
}

const infoPlantilla = () => estado.datos?.config?.descargas?.plantilla || {};

// Descarga el archivo. En file:// y por HTTP funciona con un enlace con atributo download.
async function descargarArchivo(info) {
  try {
    const r = await fetch(info.archivo, { cache: 'no-cache' });
    if (!r.ok) throw new Error(String(r.status));
    descargarBlob(await r.blob(), info.nombreDescarga);
  } catch {
    const a = document.createElement('a');
    a.href = info.archivo;
    a.download = info.nombreDescarga;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

function dispositivo() {
  const ua = navigator.userAgent;
  const so = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'macOS' : 'Otro';
  return `${so} · ${/Mobi/.test(ua) ? 'celular' : 'computador'}`;
}

function opcionesDependencia(sel) {
  return `<option value="">Elija su dependencia…</option>${dependencias().map((d) => `<option value="${esc(d.codigo)}" ${String(d.codigo) === String(sel) ? 'selected' : ''}>${esc(d.codigo)} · ${esc(d.nombre)}</option>`).join('')}`;
}
function opcionesArea(dep, sel) {
  const lista = areas().filter((a) => !dep || String(a.dependencia) === String(dep));
  return `<option value="">${lista.length ? 'Elija el área (opcional)…' : 'Sin áreas para esta dependencia'}</option>${lista.map((a) => `<option value="${esc(a.id)}" ${a.id === sel ? 'selected' : ''}>${esc(a.nombre)}</option>`).join('')}`;
}

/*
 * registrarYDescargar({ ctx, origen }) — Abre el formulario; al enviarlo registra, descarga y devuelve { registro, pase, correo }.
 * Si la persona ya se registró en este dispositivo, descarga directo y registra la descarga repetida.
 */
async function registrarYDescargar({ ctx, origen = 'accion', forzarFormulario = false } = {}) {
  const previo = identificacion();
  if (previo && !forzarFormulario) {
    await descargarArchivo(infoPlantilla());
    const repetida = { ...previo, id: `D-${Date.now()}`, fecha: new Date().toISOString(), repetida: true, origen, dispositivo: dispositivo() };
    await almacen.guardarDescarga(repetida).catch(() => null);
    enviar('descarga', { ...repetida, qrPng: null });
    await ctx.refrescarConsolidado();
    toast({ tipo: 'ok', titulo: 'Descarga iniciada', mensaje: infoPlantilla().nombreDescarga });
    return { registro: repetida, pase: paseDe(previo), repetida: true };
  }
  return new Promise((resolver) => {
    const form = document.createElement('form');
    form.className = 'stack form-descarga';
    form.noValidate = true;
    form.innerHTML = `
      <p class="muted mb-0">Registre sus datos para descargar la plantilla. Al terminar recibirá su <strong>pase QR de ingreso</strong> a la jornada.</p>
      <label class="field"><span class="field-label">Correo institucional</span>
        <div class="input-icon">${icono('correo')}<input class="input" name="correo" type="email" inputmode="email" autocomplete="email" placeholder="usuario${esc(dominio())}" required data-autofoco></div>
        <span class="field-error" data-err-correo role="alert"></span></label>
      <div data-hallado aria-live="polite"></div>
      <div class="grid-2 grid-form">
        <label class="field"><span class="field-label">Nombre completo</span><input class="input" name="nombre" autocomplete="name" required></label>
        <label class="field"><span class="field-label">Cargo</span><input class="input" name="cargo" autocomplete="organization-title" required></label>
      </div>
      <label class="field"><span class="field-label">Dependencia</span><select class="select" name="dependencia" required>${opcionesDependencia('')}</select></label>
      <label class="field"><span class="field-label">Área funcional</span><select class="select" name="area">${opcionesArea('', '')}</select></label>
      <fieldset class="field fieldset-suie"><legend class="field-label">¿Quién cargará el documento formulado en el SUIE?</legend>
        <div class="segmentado-op" role="radiogroup">
          <label><input type="radio" name="quien" value="yo" checked> Yo mismo</label>
          <label><input type="radio" name="quien" value="otro"> Otra persona</label>
        </div>
        <div class="grid-2 grid-form" data-otro hidden>
          <label class="field"><span class="field-label">Nombre del responsable del cargue</span><input class="input" name="suieNombre"></label>
          <label class="field"><span class="field-label">Correo institucional del responsable</span><input class="input" name="suieCorreo" type="email" inputmode="email" placeholder="usuario${esc(dominio())}"></label>
        </div>
      </fieldset>
      <label class="consentimiento"><input type="checkbox" name="consentimiento" required>
        <span>${esc(estado.datos.config?.politicaDatos?.texto || '')}${estado.datos.config?.politicaDatos?.url ? ` <a href="${esc(estado.datos.config.politicaDatos.url)}" target="_blank" rel="noopener">Política de tratamiento de datos</a>.` : ''}</span></label>
      <button type="submit" class="btn btn-lg btn-block btn-primary" data-enviar>${icono('descargar', 'icon-sm')}Registrar y descargar</button>
      <p class="field-hint centro mb-0">${icono('reloj', 'icon-sm')} Se registran la fecha y la hora de la descarga.</p>`;
    let persona = null;
    let resuelto = false;
    const m = abrirModal({ titulo: 'Descargar la Plantilla Plan de Acción 2027', contenido: form, alCerrar: () => { if (!resuelto) resolver(null); } });
    const f = form.elements;
    const hallado = form.querySelector('[data-hallado]');
    const err = form.querySelector('[data-err-correo]');

    const buscar = async () => {
      const c = normalizarCorreo(f.correo.value);
      err.textContent = '';
      f.correo.removeAttribute('aria-invalid');
      persona = null;
      if (!c) { hallado.innerHTML = ''; return; }
      if (!c.includes('@')) return;
      if (!correoValido(c)) { err.textContent = `Use su correo institucional terminado en ${dominio()}, sin tildes ni espacios.`; f.correo.setAttribute('aria-invalid', 'true'); hallado.innerHTML = ''; return; }
      if (!cifradoDisponible()) { hallado.innerHTML = ''; return; }
      hallado.innerHTML = `<p class="field-hint"><span class="spinner" aria-hidden="true"></span> Buscando en el directorio…</p>`;
      const lista = await buscarPorCorreo(c);
      if (normalizarCorreo(f.correo.value) !== c) return;
      if (!lista.length) {
        hallado.innerHTML = `<div class="notice">${icono('info')}<div>Este correo no está en el directorio institucional. Puede continuar escribiendo sus datos: el registro quedará como <em>no verificado</em>.</div></div>`;
        return;
      }
      const usar = (p) => {
        persona = p;
        f.nombre.value = p.n || f.nombre.value;
        f.cargo.value = p.c || f.cargo.value;
        if (p.d && dependencia(p.d)) {
          f.dependencia.value = String(p.d);
          const sug = sugerirArea(p);
          f.area.innerHTML = opcionesArea(p.d, sug ? sug.id : '');
        }
        hallado.innerHTML = `<div class="persona-ok">${icono('usuarioCheck')}<span><strong>${esc(p.n || 'Persona del directorio')}</strong><br><span class="muted">${esc(p.c || '')}${p.d ? ` · ${esc(p.d)} ${esc(dependencia(p.d)?.nombre || '')}` : ''}</span></span></div>`;
      };
      if (lista.length === 1) { usar(lista[0]); return; }
      hallado.innerHTML = `<div class="notice">${icono('personas')}<div>Este buzón lo comparten ${lista.length} personas. Toque su nombre:<div class="chips-sugeridos" style="margin-top:8px">${lista.map((p, i) => `<button type="button" class="chip" data-p="${i}">${esc(p.n || 'Sin nombre')}</button>`).join('')}</div></div></div>`;
      hallado.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => usar(lista[Number(b.dataset.p)])));
    };
    let t = null;
    f.correo.addEventListener('input', () => { clearTimeout(t); t = setTimeout(buscar, 350); });
    f.correo.addEventListener('blur', () => { const v = f.correo.value.trim(); if (v && !v.includes('@')) { f.correo.value = `${v}${dominio()}`; } buscar(); });
    f.dependencia.addEventListener('change', () => { f.area.innerHTML = opcionesArea(f.dependencia.value, ''); });
    form.querySelectorAll('[name="quien"]').forEach((r) => r.addEventListener('change', () => { form.querySelector('[data-otro]').hidden = f.quien.value !== 'otro'; }));

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const correo = normalizarCorreo(f.correo.value);
      const faltan = [];
      if (!correoValido(correo)) faltan.push('un correo institucional válido');
      if (!f.nombre.value.trim()) faltan.push('el nombre');
      if (!f.cargo.value.trim()) faltan.push('el cargo');
      if (!f.dependencia.value) faltan.push('la dependencia');
      const otro = f.quien.value === 'otro';
      const suieCorreo = otro ? normalizarCorreo(f.suieCorreo.value) : correo;
      if (otro && (!f.suieNombre.value.trim() || !correoValido(suieCorreo))) faltan.push('el nombre y el correo institucional de quien cargará en el SUIE');
      if (!f.consentimiento.checked) faltan.push('la autorización de tratamiento de datos');
      if (faltan.length) { toast({ tipo: 'warn', titulo: 'Faltan datos', mensaje: `Complete ${faltan.join(', ')}.` }); return; }
      const boton = form.querySelector('[data-enviar]');
      boton.disabled = true;
      boton.innerHTML = '<span class="spinner" aria-hidden="true"></span>Registrando…';
      try {
        const a = f.area.value ? areaPorId(f.area.value) : null;
        const ident = {
          correo, nombre: f.nombre.value.trim(), cargo: f.cargo.value.trim(), dependencia: f.dependencia.value,
          dependenciaNombre: dependencia(f.dependencia.value)?.nombre || '', area: a ? a.id : '', areaNombre: a ? a.nombre : '',
          responsableSuie: { nombre: otro ? f.suieNombre.value.trim() : f.nombre.value.trim(), correo: suieCorreo, mismo: !otro },
          verificado: Boolean(persona)
        };
        let pase = estado.consolidado.pases.find((p) => p.e === correo) || null;
        if (!pase) {
          pase = crearPase({ nombre: ident.nombre, cargo: ident.cargo, dependencia: String(ident.dependencia), area: ident.area, correo, prefijo: estado.indices.prefijo, sal: estado.indices.sal });
          pase.emitido = new Date().toISOString();
          pase.verificado = ident.verificado;
          await almacen.guardarPase(pase);
        }
        ident.paseId = pase.id;
        const registro = { ...ident, id: `D-${Date.now()}`, fecha: new Date().toISOString(), origen, repetida: false, dispositivo: dispositivo() };
        await almacen.guardarDescarga(registro);
        guardarIdentificacion(ident);
        await ctx.refrescarConsolidado();
        await descargarArchivo(infoPlantilla());
        let qrPng = null;
        if (qrDisponible()) { try { qrPng = (await qrComoDataUrl(contenidoQR(pase), { tamano: 480 })).split(',')[1]; } catch { qrPng = null; } }
        let correoEstado = { enviado: false, motivo: 'local' };
        if (remotoConfigurado()) {
          const r = await Promise.race([
            enviar('descarga', { ...registro, qrPng, enviarCorreo: estado.datos.config?.registro?.enviarCorreo !== false }, { esperar: true }),
            new Promise((ok) => setTimeout(() => ok({ ok: false, error: 'tiempo', encolado: true }), 12000))
          ]);
          correoEstado = { enviado: Boolean(r.ok && r.correo), motivo: r.ok ? (r.correo ? '' : (r.motivoCorreo || 'sin correo')) : (r.error || 'pendiente') };
        }
        resuelto = true;
        m.cerrar();
        toast({ tipo: 'ok', titulo: 'Plantilla descargada', mensaje: `Su pase de ingreso es ${pase.id}.` });
        resolver({ registro, pase, correo: correoEstado });
      } catch (e) {
        toastError('No se pudo completar el registro', e, e.message);
        boton.disabled = false;
        boton.innerHTML = `${icono('refrescar', 'icon-sm')}Intentar de nuevo`;
      }
    });
  });
}

Object.assign(__m["src/ui/registro-descarga.js"], { identificacion, olvidarIdentificacion, paseDe, descargarArchivo, registrarYDescargar });
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
const { identificacion, paseDe } = __m["src/ui/registro-descarga.js"];

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
  const pase = paseDe(identificacion());
  if (pase) {
    const a = pase.a ? areaPorId(pase.a) : null;
    return `<a class="pase-cta is-ok" href="#accion">${icono('qr', 'icon-lg')}<span><strong>Su pase está listo</strong><small>${esc(pase.id)} · ${esc(pase.n)}${a ? `, ${esc(a.nombre)}` : ''}</small></span>${icono('derecha', 'icon-sm')}</a>`;
  }
  return `<a class="pase-cta" href="#accion">${icono('qr', 'icon-lg')}<span><strong>Obtenga su pase de ingreso</strong><small>Se entrega al descargar la Plantilla Plan de Acción 2027. Formúlela y cárguela en el SUIE: es su insumo de trabajo en la jornada.</small></span>${icono('derecha', 'icon-sm')}</a>`;
}

const chipsResp = (b) => (b.responsables || []).length
  ? `<span class="agenda-resp">${icono('persona', 'icon-sm')}<span>${(b.responsables || []).map((n) => esc(n)).join(', ')}</span></span>` : '';

function bloqueHtml(dia, b, ahora, esHoy) {
  const ini = instante(dia.fecha, b.inicio);
  const fin = instante(dia.fecha, b.fin);
  const actual = esHoy && ahora >= ini && ahora < fin;
  const pasado = ahora >= fin;
  if (b.tipo === 'receso') {
    return `<li class="agenda-item is-breve${actual ? ' is-actual' : ''}${pasado ? ' is-pasado' : ''}">
      <span class="agenda-hora">${esc(b.inicio)}</span>
      <span class="agenda-breve">${icono('reloj', 'icon-sm')}${esc(b.titulo)} · ${esc(b.inicio)} a ${esc(b.fin)}</span></li>`;
  }
  return `<li class="agenda-item tipo-${esc(b.tipo)}${actual ? ' is-actual' : ''}${pasado ? ' is-pasado' : ''}"${actual ? ' aria-current="time"' : ''}>
    <span class="agenda-hora">${esc(b.inicio)}<small>${esc(b.fin)}</small></span>
    <div class="agenda-card">
      <div class="row" style="gap:6px"><span class="badge ${b.tipo === 'taller' ? 'badge-solid' : ''}">${esc(TIPOS[b.tipo] || b.tipo)}</span>${actual ? '<span class="badge badge-ok"><span class="pulse" aria-hidden="true"></span>Ahora</span>' : ''}${b.tipo === 'llegada' ? `<span class="badge">${icono('qr', 'icon-sm')}Ingreso con pase</span>` : ''}</div>
      <strong class="agenda-titulo">${esc(b.titulo)}</strong>
      ${b.detalle && b.detalle !== b.titulo ? `<p class="mb-0">${esc(b.detalle)}</p>` : ''}
      ${chipsResp(b)}
    </div></li>`;
}

function bloqueAgrupado(dia, g, ahora, esHoy) {
  const bloques = g.ids.map((id) => dia.bloques.find((x) => x.id === id)).filter(Boolean);
  const ini = instante(dia.fecha, bloques[0].inicio);
  const fin = instante(dia.fecha, bloques[bloques.length - 1].fin);
  const actual = esHoy && ahora >= ini && ahora < fin;
  const pasado = ahora >= fin;
  return `<li class="agenda-item tipo-sesion is-grupo${actual ? ' is-actual' : ''}${pasado ? ' is-pasado' : ''}">
    <span class="agenda-hora">${esc(bloques[0].inicio)}<small>${esc(bloques[bloques.length - 1].fin)}</small></span>
    <div class="agenda-card">
      <div class="row" style="gap:6px"><span class="badge">Sesión central</span>${actual ? '<span class="badge badge-ok"><span class="pulse" aria-hidden="true"></span>Ahora</span>' : ''}</div>
      <strong class="agenda-titulo">${esc(g.titulo)}</strong>
      <p class="mb-0">${esc(g.detalle || '')}</p>
      <ol class="agenda-momentos">${bloques.map((b) => `<li class="${b.tipo === 'receso' ? 'is-receso' : ''}"><span class="mono">${esc(b.inicio)}</span><div><strong>${esc(b.titulo)}</strong>${b.tipo !== 'receso' ? chipsResp(b) : ''}</div></li>`).join('')}</ol>
    </div></li>`;
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
      ${(() => {
        const grupos = (agenda().agrupaciones || []).filter((g) => g.dia === dia.id);
        const enGrupo = new Map();
        grupos.forEach((g) => g.ids.forEach((id, k) => enGrupo.set(id, { g, primero: k === 0 })));
        return dia.bloques.map((b) => {
          const gi = enGrupo.get(b.id);
          if (gi && !gi.primero) return '';
          if (gi) return bloqueAgrupado(dia, gi.g, ahora, esHoy);
          return bloqueHtml(dia, b, ahora, esHoy);
        }).join('');
      })()}
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
        <span>${icono('reloj', 'icon-sm')}Desde las ${esc(dias[0]?.bloques?.[0]?.inicio || '8:00')}</span>
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

// ── src/tabs/accion.js ──
__m["src/tabs/accion.js"] = {};
(function () {
/*
 * accion.js — Pestaña 2: Plan de acción.
 * Un único archivo para descargar, la Plantilla Plan de Acción 2027, habilitado por el formulario de registro.
 * Al registrarse la persona recibe su pase QR de ingreso. El cargue de la formulación se hace en el SUIE,
 * no en este aplicativo. También se descargan el manual de ejemplos y el instructivo de formulación (PDF).
 */
const { estado, on: alEvento, dependencia, area: areaPorId } = __m["src/estado.js"];
const { esc, on } = __m["src/ui/dom.js"];
const { icono } = __m["src/ui/iconos.js"];
const { toast } = __m["src/ui/toast.js"];
const { montarPase } = __m["src/ui/pase.js"];
const { registrarYDescargar, identificacion, paseDe, olvidarIdentificacion, descargarArchivo } = __m["src/ui/registro-descarga.js"];
const { fechaCorta, horaLegible } = __m["src/lib/fechas.js"];

let raiz = null;
let ctxApp = null;
let ultimo = null;

const D = () => estado.datos.config?.descargas || {};

function tarjetaPdf(clave, iconoNombre) {
  const d = D()[clave];
  if (!d) return '';
  return `<article class="descarga descarga-pdf reveal">
    <span class="descarga-ico is-pdf">${icono(iconoNombre, 'icon-lg')}</span>
    <div class="descarga-info"><strong>${esc(d.titulo)}</strong><p class="mb-0">${esc(d.descripcion)}</p></div>
    <button type="button" class="btn" data-pdf="${esc(clave)}">${icono('descargar', 'icon-sm')}PDF</button>
  </article>`;
}

function pintarEstado() {
  const cont = raiz.querySelector('[data-estado]');
  const i = identificacion();
  const pase = paseDe(i);
  if (!i || !pase) {
    cont.innerHTML = '';
    raiz.querySelector('[data-btn-plantilla]').innerHTML = `${icono('descargar', 'icon-sm')}Registrarme y descargar`;
    return;
  }
  raiz.querySelector('[data-btn-plantilla]').innerHTML = `${icono('descargar', 'icon-sm')}Descargar de nuevo`;
  const desc = estado.consolidado.descargas.filter((d) => d.correo === i.correo).sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
  const primera = desc[0];
  cont.innerHTML = `<div class="stack">
    ${ultimo?.nuevo ? `<div class="celebra">${icono('checkCirculo', 'icon-lg')}<div><h2 class="mb-0">¡Descarga registrada!</h2><p class="mb-0">Este es su pase de ingreso a la jornada.</p></div></div>` : ''}
    ${avisoCorreo()}
    <div class="notice notice-paso">${icono('bandera')}<div><strong>Su siguiente paso: formule la plantilla y cárguela en el SUIE.</strong> Esa formulación es su insumo de ingreso y de trabajo en la jornada: sin ella no podrá avanzar en los talleres.</div></div>
    <div data-pase></div>
    <div class="card card-tight ident-registro">
      <dl class="dl-mini">
        <div><dt>Registrado</dt><dd>${esc(i.nombre)} · ${esc(i.correo)}</dd></div>
        <div><dt>Dependencia</dt><dd>${esc(i.dependencia)} · ${esc(dependencia(i.dependencia)?.nombre || i.dependenciaNombre || '')}${i.area ? `, ${esc(areaPorId(i.area)?.nombre || i.areaNombre)}` : ''}</dd></div>
        <div><dt>Carga en el SUIE</dt><dd>${esc(i.responsableSuie?.nombre || i.nombre)} · ${esc(i.responsableSuie?.correo || i.correo)}</dd></div>
        ${primera ? `<div><dt>Primera descarga</dt><dd>${esc(fechaCorta(primera.fecha.slice(0, 10)))}, ${esc(horaLegible(new Date(primera.fecha)))}${desc.length > 1 ? ` · ${desc.length} descargas en este dispositivo` : ''}</dd></div>` : ''}
      </dl>
      <button type="button" class="btn btn-sm btn-ghost" data-otra>${icono('persona', 'icon-sm')}Registrar a otra persona en este dispositivo</button>
    </div>
  </div>`;
  montarPase(cont.querySelector('[data-pase]'), pase);
  if (ultimo) ultimo.nuevo = false;
}

function avisoCorreo() {
  if (!ultimo || !ultimo.correo) return '';
  const c = ultimo.correo;
  if (c.enviado) return `<div class="notice notice-ok">${icono('correo')}<div><strong>Le enviamos el pase a ${esc(ultimo.registro.correo)}.</strong> Revise también la carpeta de correo no deseado.</div></div>`;
  if (c.motivo === 'local') return `<div class="notice">${icono('info')}<div><strong>Guarde la imagen de su pase.</strong> El envío automático por correo aún no está activo en este aplicativo.</div></div>`;
  return `<div class="notice">${icono('info')}<div><strong>Su descarga quedó registrada.</strong> El correo con el pase se enviará en cuanto haya conexión. Mientras tanto, guarde la imagen del pase.</div></div>`;
}

function montar(panel, ctx) {
  raiz = panel;
  ctxApp = ctx;
  const p = D().plantilla || {};
  panel.innerHTML = `<div class="container page page-app">
    <header class="app-hero reveal">
      <span class="eyebrow">${icono('formulacion', 'icon-sm')}Plan de acción 2027</span>
      <h1>Descargue la plantilla y obtenga su pase</h1>
      <p class="lead">Regístrese, descargue la <strong>Plantilla Plan de Acción 2027</strong>, formúlela y cárguela en el <strong>SUIE</strong>. Al registrarse recibe el <strong>código QR</strong> con el que ingresa a la jornada.</p>
    </header>
    <ol class="ruta-pasos reveal" aria-label="Cómo funciona">
      <li><span>1</span><div><strong>Regístrese y descargue</strong><small>Con su correo institucional</small></div></li>
      <li><span>2</span><div><strong>Formule y cargue en el SUIE</strong><small>Es su insumo de trabajo</small></div></li>
      <li><span>3</span><div><strong>Ingrese con su pase QR</strong><small>18, 19 y 20 de noviembre</small></div></li>
    </ol>
    <article class="descarga descarga-principal reveal">
      <span class="descarga-ico">${icono('excel', 'icon-lg')}</span>
      <div class="descarga-info">
        <div class="row" style="gap:8px"><strong>${esc(p.titulo || 'Plantilla Plan de Acción 2027')}</strong><span class="badge badge-solid">Diligenciar</span></div>
        <p class="mb-0">${esc(p.descripcion || '')}</p>
      </div>
      <button type="button" class="btn btn-primary btn-lg" data-btn-plantilla>${icono('descargar', 'icon-sm')}Registrarme y descargar</button>
    </article>
    <div data-estado aria-live="polite"></div>
    <section class="stack" aria-labelledby="h-apoyo">
      <h2 id="h-apoyo" class="paso-titulo">Para formular bien</h2>
      ${tarjetaPdf('manualEjemplos', 'diana')}
      ${tarjetaPdf('instructivo', 'formulacion')}
    </section>
    <div class="card card-tight reveal">
      <h3>Acción no es lo mismo que actividad</h3>
      <ul class="check-lista">
        <li>${icono('check', 'icon-sm')}<span>La <strong>acción</strong> dice qué resultado va a lograr el área y aporta directamente a una meta del PDI.</span></li>
        <li>${icono('check', 'icon-sm')}<span>Las <strong>actividades</strong> son los pasos que, sumados, producen la acción; cada una deja un <strong>producto</strong> verificable.</span></li>
        <li>${icono('check', 'icon-sm')}<span>Si lo que va a escribir es una tarea rutinaria (enviar correos, asistir a reuniones), no es una acción.</span></li>
      </ul>
    </div>
  </div>`;
  on(panel, 'click', '[data-btn-plantilla]', async (ev, b) => {
    b.disabled = true;
    try {
      const r = await registrarYDescargar({ ctx, origen: 'accion' });
      if (r && !r.repetida) { ultimo = { ...r, nuevo: true }; }
      pintarEstado();
      if (r && !r.repetida) raiz.querySelector('[data-estado]').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } finally { b.disabled = false; }
  });
  on(panel, 'click', '[data-pdf]', async (ev, b) => {
    const d = D()[b.dataset.pdf];
    await descargarArchivo(d);
    toast({ tipo: 'ok', titulo: 'Descarga iniciada', mensaje: d.nombreDescarga });
  });
  on(panel, 'click', '[data-otra]', async () => {
    olvidarIdentificacion();
    ultimo = null;
    pintarEstado();
    const r = await registrarYDescargar({ ctx, origen: 'accion', forzarFormulario: true });
    if (r) { ultimo = { ...r, nuevo: true }; pintarEstado(); }
  });
  alEvento('identificacion', () => pintarEstado());
  pintarEstado();
}

const pestanaAccion = {
  id: 'accion',
  titulo: 'Plan de acción',
  tituloCorto: 'Plan de acción',
  tituloMovil: 'Plan de acción',
  icono: 'formulacion',
  montar,
  alMostrar() { if (raiz) pintarEstado(); }
};

Object.assign(__m["src/tabs/accion.js"], { pestanaAccion });
})();

// ── src/tabs/necesidades.js ──
__m["src/tabs/necesidades.js"] = {};
(function () {
/*
 * necesidades.js — Pestaña 3: Plan de necesidades.
 * El formato está en la misma Plantilla Plan de Acción 2027 (hoja PlandeNecesidades), así que la descarga usa
 * el mismo registro. La pestaña explica cómo se relaciona cada necesidad con una acción, cómo buscar el código
 * UNSPSC en el clasificador de Colombia Compra Eficiente y qué errores de 2026 no deben repetirse.
 */
const { estado, on: alEvento } = __m["src/estado.js"];
const { esc, on } = __m["src/ui/dom.js"];
const { icono } = __m["src/ui/iconos.js"];
const { toast } = __m["src/ui/toast.js"];
const { registrarYDescargar, identificacion, descargarArchivo } = __m["src/ui/registro-descarga.js"];

let raiz = null;

const PASOS_UNSPSC = [
  ['Abra el clasificador', 'Entre al clasificador de bienes y servicios de Colombia Compra Eficiente con el botón de esta tarjeta.'],
  ['Piense en el bien o el servicio', 'Escriba en pocas palabras lo que va a contratar, por ejemplo «computador portátil» o «servicios de aseo», no el nombre de la acción.'],
  ['Busque por palabra o por código', 'Use el buscador. Si la Escuela usó un código parecido en 2026, también puede buscarlo por número.'],
  ['O navegue por niveles', 'Baje en orden por grupo, segmento, familia, clase y producto.'],
  ['Elija la denominación que mejor describe el objeto', 'Al seleccionarla, el clasificador muestra el código de ocho dígitos y su nombre.'],
  ['Prefiera el producto', 'Use los ocho dígitos del producto. Si el objeto agrupa varios productos, use la clase, que termina en 00.'],
  ['Regístrelo como número', 'Columna M de la hoja PlandeNecesidades, sin espacios ni puntos. Los códigos adicionales van en la columna N separados por punto y coma.'],
  ['Verifique la alerta', 'La columna «Alerta de consistencia» debe decir OK.']
];

const ERRORES = [['207', 'valores escritos como texto, con $, puntos o comas'], ['43', 'códigos UNSPSC vacíos, en texto o varios en una celda'], ['23', 'formas distintas de escribir la modalidad'], ['41', 'necesidades de mínima cuantía por encima del tope'], ['42', 'registros sin correo del responsable']];

function montar(panel, ctx) {
  raiz = panel;
  const url = estado.datos.config?.clasificadorUNSPSC || 'https://operaciones.colombiacompra.gov.co/clasificador-de-bienes-y-servicios';
  const man = estado.datos.config?.descargas?.manualEjemplos;
  panel.innerHTML = `<div class="container page page-app">
    <header class="app-hero reveal">
      <span class="eyebrow">${icono('necesidades', 'icon-sm')}Plan de necesidades 2027</span>
      <h1>Lo que su área necesita contratar</h1>
      <p class="lead">Cada bien, obra o servicio se amarra a una <strong>acción</strong> de su Plan de acción y, por ella, a una meta del PDI. Con este plan el GIT de Contratación arma el <strong>Plan Anual de Adquisiciones</strong>, que se publica a más tardar el 31 de enero de 2027.</p>
    </header>
    <ol class="cadena-pn reveal" aria-label="Cadena de la necesidad">
      <li><span>Meta del PDI</span></li><li><span>Acción 2027</span></li><li><span>Necesidad</span></li><li><span>Plan Anual de Adquisiciones</span></li>
    </ol>
    <article class="descarga descarga-principal reveal">
      <span class="descarga-ico">${icono('excel', 'icon-lg')}</span>
      <div class="descarga-info">
        <div class="row" style="gap:8px"><strong>Formato del Plan de Necesidades</strong><span class="badge badge-solid">Hoja PlandeNecesidades</span></div>
        <p class="mb-0">Viene dentro de la Plantilla Plan de Acción 2027, con su instructivo y el enlace al clasificador. Si ya descargó la plantilla, no necesita otro archivo.</p>
      </div>
      <button type="button" class="btn btn-primary btn-lg" data-descargar>${icono('descargar', 'icon-sm')}<span data-txt>Descargar</span></button>
    </article>
    <section class="card reveal" aria-labelledby="h-unspsc">
      <div class="card-head"><div><h2 id="h-unspsc" class="mb-0">El código UNSPSC, paso a paso</h2><p>Es obligatorio en cada necesidad (Decreto 1082 de 2015). Es el mismo código que usan SECOP II, los estudios previos y los pliegos.</p></div></div>
      <ol class="pasos-lista">${PASOS_UNSPSC.map(([t, d], i) => `<li><span class="pasos-n">${i + 1}</span><div><strong>${esc(t)}</strong><p class="mb-0">${esc(d)}</p></div></li>`).join('')}</ol>
      <a class="btn btn-primary btn-block" href="${esc(url)}" target="_blank" rel="noopener">${icono('buscar', 'icon-sm')}Abrir el clasificador de Colombia Compra Eficiente</a>
      <div class="niveles-unspsc">
        <div><strong>80</strong><span>Segmento</span></div><div><strong>8011</strong><span>Familia</span></div><div><strong>801116<em>00</em></strong><span>Clase</span></div><div class="is-ok"><strong>80111601</strong><span>Producto</span></div>
      </div>
    </section>
    <section class="card reveal" aria-labelledby="h-rel">
      <h2 id="h-rel">Cómo se relaciona con el Plan de acción</h2>
      <ul class="check-lista">
        <li>${icono('check', 'icon-sm')}<span>Primero se formula la acción y después lo que ella requiere contratar.</span></li>
        <li>${icono('check', 'icon-sm')}<span>En la columna H la lista muestra solo las acciones de la meta elegida. Si es una acción propia del área, elija PROPIA y escriba su nombre.</span></li>
        <li>${icono('check', 'icon-sm')}<span>La justificación dice qué producto de la acción no podría lograrse sin la compra: es la base de los estudios previos.</span></li>
        <li>${icono('check', 'icon-sm')}<span>Una necesidad por fila y un objeto por necesidad. Lo que el área hace con su personal de planta no es una necesidad.</span></li>
      </ul>
    </section>
    <section class="card lecciones reveal" aria-labelledby="h-err">
      <div class="card-head"><div><h2 id="h-err" class="mb-0">Lo que no debe repetirse</h2><p>Errores encontrados al consolidar el plan 2026. El formato 2027 los previene con listas y con la alerta de consistencia.</p></div></div>
      <div class="cifras-grandes">${ERRORES.map(([n, t]) => `<div class="cifra-grande"><strong>${n}</strong><span>${esc(t)}</span></div>`).join('')}</div>
    </section>
    ${man ? `<article class="descarga descarga-pdf reveal">
      <span class="descarga-ico is-pdf">${icono('diana', 'icon-lg')}</span>
      <div class="descarga-info"><strong>${esc(man.titulo)}</strong><p class="mb-0">Incluye ejemplos de necesidades por eje y lo que dice Colombia Compra Eficiente.</p></div>
      <button type="button" class="btn" data-pdf>${icono('descargar', 'icon-sm')}PDF</button>
    </article>` : ''}
  </div>`;
  const txt = () => { panel.querySelector('[data-txt]').textContent = identificacion() ? 'Descargar de nuevo' : 'Registrarme y descargar'; };
  txt();
  on(panel, 'click', '[data-descargar]', async (ev, b) => {
    b.disabled = true;
    try {
      const r = await registrarYDescargar({ ctx, origen: 'necesidades' });
      if (r && !r.repetida) {
        toast({ tipo: 'ok', titulo: 'Su pase está listo', mensaje: 'Lo encuentra en la pestaña Plan de acción.' });
        ctx.ir('accion');
      }
    } finally { b.disabled = false; txt(); }
  });
  on(panel, 'click', '[data-pdf]', async () => { await descargarArchivo(man); toast({ tipo: 'ok', titulo: 'Descarga iniciada', mensaje: man.nombreDescarga }); });
  alEvento('identificacion', txt);
}

const pestanaNecesidades = {
  id: 'necesidades',
  titulo: 'Plan de necesidades',
  tituloCorto: 'Plan de necesidades',
  tituloMovil: 'Necesidades',
  icono: 'necesidades',
  montar,
  alMostrar() { if (raiz) raiz.querySelector('[data-txt]').textContent = identificacion() ? 'Descargar de nuevo' : 'Registrarme y descargar'; }
};

Object.assign(__m["src/tabs/necesidades.js"], { pestanaNecesidades });
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

// ── src/lib/lectores.js ──
__m["src/lib/lectores.js"] = {};
(function () {
/*
 * lectores.js — Quién puede leer pases y cuándo.
 * Solo leen los responsables de la actividad en curso según la agenda (data/agenda.json), identificados con su
 * correo institucional y un PIN personal. El archivo público data/lectores.json solo contiene resúmenes SHA-256.
 * Coordinadores: pueden leer en cualquier momento de la jornada. Apoyo: solo en los bloques de registro.
 * Modo ensayo: cualquier lector puede practicar fuera de la jornada; esas lecturas quedan marcadas como prueba.
 */
const { estado } = __m["src/estado.js"];
const { resumen, normalizarCorreo } = __m["src/lib/directorio.js"];
const { normalizar } = __m["src/lib/formato.js"];

const ROLES = { coordinador: 'Coordinación', moderador: 'Responsable de actividad', apoyo: 'Apoyo de registro' };
const nombreRol = (r) => ROLES[r] || r;

async function verificarLector(correo, pin) {
  const dl = estado.datos?.lectores;
  if (!dl || !dl.lectores?.length) return null;
  const c = normalizarCorreo(correo);
  const h = await resumen(`${dl.sal}|${c}`);
  const l = dl.lectores.find((x) => x.h === h);
  if (!l) return { error: 'Este correo no está habilitado como lector. Solo leen los responsables de las actividades de la agenda.' };
  const p = await resumen(`${dl.sal}|${c}|${String(pin || '').trim()}`);
  if (p !== l.p) return { error: 'El PIN no coincide. Pídalo a la Oficina Asesora de Planeación.' };
  return { nombre: l.nombre, cargo: l.cargo, rol: l.rol, correo: c };
}

const instante = (fecha, hhmm) => new Date(`${fecha}T${hhmm}:00-05:00`);

// Bloque de la agenda que corresponde a este momento (con márgenes para el ingreso).
function actividadEnCurso(ahora = new Date()) {
  const reglas = estado.datos?.lectores?.reglas || { minutosAntes: 30, minutosDespues: 15 };
  const antes = reglas.minutosAntes * 60000;
  const despues = reglas.minutosDespues * 60000;
  const candidatos = [];
  (estado.datos?.agenda?.dias || []).forEach((dia) => (dia.bloques || []).forEach((b) => {
    const ini = instante(dia.fecha, b.inicio);
    const fin = instante(dia.fecha, b.fin);
    if (ahora >= ini - antes && ahora < fin.getTime() + despues) candidatos.push({ dia, bloque: b, ini, fin, enCurso: ahora >= ini && ahora < fin });
  }));
  if (!candidatos.length) return null;
  candidatos.sort((a, b) => (b.enCurso - a.enCurso) || (a.ini - b.ini));
  return candidatos;
}

function enJornada(ahora = new Date()) {
  const dias = estado.datos?.agenda?.dias || [];
  return dias.some((d) => ahora >= instante(d.fecha, '06:30') && ahora < instante(d.fecha, '19:00'));
}

const esResponsable = (lector, bloque) => (bloque.responsables || []).some((n) => normalizar(n) === normalizar(lector.nombre));

/*
 * permiso(lector, { ensayo }) → { ok, bloque, dia, prueba, motivo }
 */
function permiso(lector, { ensayo = false, ahora = new Date() } = {}) {
  if (ensayo) return { ok: true, prueba: true, bloque: null, dia: null };
  const cand = actividadEnCurso(ahora) || [];
  const propio = cand.find((x) => esResponsable(lector, x.bloque));
  if (propio) return { ok: true, bloque: propio.bloque, dia: propio.dia };
  if (lector.rol === 'apoyo') {
    const reg = cand.find((x) => x.bloque.tipo === 'llegada');
    if (reg) return { ok: true, bloque: reg.bloque, dia: reg.dia };
  }
  if (lector.rol === 'coordinador' && enJornada(ahora)) {
    const actual = cand.find((x) => x.bloque.tipo !== 'receso') || cand[0];
    return { ok: true, bloque: actual ? actual.bloque : null, dia: actual ? actual.dia : null };
  }
  const proximos = proximaActividad(lector, ahora);
  return {
    ok: false,
    motivo: proximos
      ? `En este momento no es responsable de una actividad en curso. Su próxima actividad es «${proximos.bloque.titulo}», el ${proximos.dia.numero === 1 ? 'día 1' : `día ${proximos.dia.numero}`} a las ${proximos.bloque.inicio}. Puede practicar en modo ensayo.`
      : 'En este momento no es responsable de una actividad en curso. Puede practicar en modo ensayo.'
  };
}

function proximaActividad(lector, ahora = new Date()) {
  for (const dia of estado.datos?.agenda?.dias || []) {
    for (const b of dia.bloques || []) {
      if (instante(dia.fecha, b.fin) > ahora && (esResponsable(lector, b) || (lector.rol === 'apoyo' && b.tipo === 'llegada'))) return { dia, bloque: b };
    }
  }
  return null;
}

function actividadesDe(lector) {
  const out = [];
  (estado.datos?.agenda?.dias || []).forEach((dia) => (dia.bloques || []).forEach((b) => {
    if (esResponsable(lector, b) || (lector.rol === 'apoyo' && b.tipo === 'llegada')) out.push({ dia, bloque: b });
  }));
  return out;
}

Object.assign(__m["src/lib/lectores.js"], { verificarLector, actividadEnCurso, enJornada, permiso, proximaActividad, actividadesDe, nombreRol });
})();

// ── src/tabs/escaner.js ──
__m["src/tabs/escaner.js"] = {};
(function () {
/*
 * escaner.js — Lector de pases QR (vista aparte, pensada para celular o tableta).
 * Solo lo activan los responsables de la actividad en curso según la agenda, con su correo institucional y su PIN.
 * Cada lectura queda registrada con fecha, hora, lector, participante, actividad y resultado; se guarda en el
 * dispositivo y se envía al registro en línea. Confirmación a pantalla completa: verde (bienvenido), ámbar (ya
 * registrado en esta actividad) o rojo (pase no válido).
 */
const { PREFIJO_LOCAL } = __m["src/config.js"];
const { estado, on: alEvento, dependencia, dependencias, nombreDependencia, area: areaPorId } = __m["src/estado.js"];
const { esc, on } = __m["src/ui/dom.js"];
const { icono } = __m["src/ui/iconos.js"];
const { toast, toastError } = __m["src/ui/toast.js"];
const { confirmar } = __m["src/ui/modal.js"];
const { animarNumero, activarAnimaciones } = __m["src/ui/cards.js"];
const { verificarPase } = __m["src/lib/qr.js"];
const { exportarExcel, xlsxDisponible } = __m["src/lib/excel.js"];
const { descargarBlob, obtenerLogo } = __m["src/lib/export.js"];
const { normalizar } = __m["src/lib/formato.js"];
const { hoyISO } = __m["src/lib/fechas.js"];
const { verificarLector, permiso, actividadEnCurso, actividadesDe, nombreRol } = __m["src/lib/lectores.js"];
const { buscarPorCorreo, normalizarCorreo } = __m["src/lib/directorio.js"];
const { enviar, remotoConfigurado, pendientes } = __m["src/lib/remoto.js"];

const CLAVE_LECTOR = `${PREFIJO_LOCAL}:lector`;
let raiz = null;
let ctxApp = null;
let lector = null;
let turno = null;
let lectorQR = null;
let camaraActiva = false;
let ultimoTexto = { texto: '', t: 0 };
let overlayTimer = null;
let relojTurno = null;
let modo = 'camara';

const segundos = () => estado.datos.config?.umbrales?.segundosConfirmacionEscaner || 3;
const horaCorta = (iso) => new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
const dispositivo = () => `${/iPhone|iPad/.test(navigator.userAgent) ? 'iOS' : /Android/.test(navigator.userAgent) ? 'Android' : 'Computador'}`;

function cargarLector() {
  try {
    const v = JSON.parse(sessionStorage.getItem(CLAVE_LECTOR) || localStorage.getItem(CLAVE_LECTOR) || 'null');
    if (v && Date.now() - v.desde < 12 * 3600000) return v;
  } catch { /* sin almacenamiento */ }
  return null;
}
function guardarLector(v) {
  try {
    if (v) { sessionStorage.setItem(CLAVE_LECTOR, JSON.stringify(v)); localStorage.setItem(CLAVE_LECTOR, JSON.stringify(v)); }
    else { sessionStorage.removeItem(CLAVE_LECTOR); localStorage.removeItem(CLAVE_LECTOR); }
  } catch { /* opcional */ }
}

const misLecturas = () => estado.consolidado.asistencia.filter((a) => a.lector && lector && a.lector.correo === lector.correo);
const actividadClave = () => (turno?.prueba ? 'ENSAYO' : turno?.bloque?.id || 'SIN-ACTIVIDAD');

function buscarDuplicado(r) {
  const act = actividadClave();
  return estado.consolidado.asistencia.find((x) => x.resultado !== 'rechazo' && x.resultado !== 'duplicado' && (x.actividad?.id || 'SIN-ACTIVIDAD') === act
    && ((r.paseId && x.paseId === r.paseId) || (r.correo && x.correo === r.correo) || (!r.correo && normalizar(x.nombre) === normalizar(r.nombre))));
}

async function registrar(r) {
  const base = {
    ...r,
    hora: new Date().toISOString(),
    lector: { nombre: lector.nombre, correo: lector.correo, rol: lector.rol },
    actividad: turno?.prueba ? { id: 'ENSAYO', titulo: 'Modo ensayo', dia: null, fecha: hoyISO() }
      : turno?.bloque ? { id: turno.bloque.id, titulo: turno.bloque.titulo, dia: turno.dia?.numero || null, fecha: turno.dia?.fecha || hoyISO(), inicio: turno.bloque.inicio, fin: turno.bloque.fin }
        : { id: 'SIN-ACTIVIDAD', titulo: 'Fuera de la agenda', dia: null, fecha: hoyISO() },
    prueba: Boolean(turno?.prueba),
    dispositivo: dispositivo(),
    depNombre: r.dependencia ? nombreDependencia(r.dependencia) : ''
  };
  const dup = r.resultado === 'rechazo' ? null : buscarDuplicado(r);
  const registro = { ...base, resultado: r.resultado || (dup ? 'duplicado' : 'ok'), clave: `${actividadClave()}|${r.paseId || r.correo || normalizar(r.nombre)}|${Date.now()}` };
  try {
    await ctxApp.almacen.guardarAsistencia(registro);
    await ctxApp.refrescarConsolidado();
  } catch (e) { toastError('No se pudo guardar la lectura', e, e.message); }
  enviar('lectura', registro);
  if (registro.resultado === 'rechazo') mostrarOverlay('rechazo', { motivo: r.motivo, nombre: r.nombre });
  else if (dup) mostrarOverlay('duplicado', { ...dup, intento: registro });
  else mostrarOverlay('ok', registro);
  return registro.resultado === 'ok';
}

// ───────── Pantalla completa de resultado ─────────
function mostrarOverlay(tipo, datos) {
  const ov = raiz.querySelector('[data-overlay]');
  clearTimeout(overlayTimer);
  const d = dependencia(datos.dependencia);
  const a = datos.area ? areaPorId(datos.area) : null;
  const lugar = a ? `${esc(a.nombre)}` : `${esc(datos.dependencia || '')} · ${esc(d?.nombre || '')}`;
  const metodo = { QR: 'con QR', codigo: 'con el código del pase', manual: 'manual sin pase' }[datos.metodo] || '';
  const contenido = {
    ok: `<span class="ov-icono">${icono('check')}</span><span class="ov-estado">${turno?.prueba ? 'Ensayo · ' : ''}Bienvenido</span>
      <strong class="ov-nombre">${esc(datos.nombre)}</strong><span class="ov-cargo">${esc(datos.cargo || '')}</span>
      <span class="ov-dep">${lugar}</span><span class="ov-metodo">${esc(datos.actividad?.titulo || '')} · ${metodo} · ${esc(horaCorta(datos.hora))}</span>`,
    duplicado: `<span class="ov-icono">${icono('alerta')}</span><span class="ov-estado">Ya registrado en esta actividad</span>
      <strong class="ov-nombre">${esc(datos.nombre)}</strong><span class="ov-dep">${lugar}</span>
      <span class="ov-primera">Ingresó a las <b>${esc(horaCorta(datos.hora))}</b>, leído por ${esc(datos.lector?.nombre || '')}</span>`,
    rechazo: `<span class="ov-icono">${icono('cerrar')}</span><span class="ov-estado">Pase no válido</span>
      <strong class="ov-nombre">${esc(datos.motivo || 'El código no es un pase de la jornada.')}</strong>
      ${datos.nombre ? `<span class="ov-cargo">A nombre de: ${esc(datos.nombre)}</span>` : ''}<span class="ov-metodo">La persona debe descargar la plantilla en el aplicativo para obtener su pase.</span>`
  }[tipo];
  ov.className = `escaner-overlay is-${tipo} is-open`;
  ov.innerHTML = `<div class="ov-cuerpo">${contenido}<span class="ov-barra" style="animation-duration:${segundos()}s"></span><span class="ov-toque">Toque para continuar</span></div>`;
  if (navigator.vibrate) { try { navigator.vibrate(tipo === 'ok' ? 80 : [60, 60, 60]); } catch { /* opcional */ } }
  overlayTimer = setTimeout(cerrarOverlay, segundos() * 1000);
}

function cerrarOverlay() {
  clearTimeout(overlayTimer);
  const ov = raiz?.querySelector('[data-overlay]');
  if (!ov || !ov.classList.contains('is-open')) return;
  ov.classList.remove('is-open');
  if (lectorQR && camaraActiva) { try { lectorQR.resume(); } catch { /* ya reanudado */ } }
}

// ───────── Cámara ─────────
async function alLeer(texto) {
  const ahora = Date.now();
  if (texto === ultimoTexto.texto && ahora - ultimoTexto.t < 4000) return;
  if (raiz.querySelector('[data-overlay]').classList.contains('is-open')) return;
  ultimoTexto = { texto, t: ahora };
  if (lectorQR && camaraActiva) { try { lectorQR.pause(true); } catch { /* sin pausa */ } }
  procesarTexto(texto, 'QR');
}

async function procesarTexto(texto, metodo) {
  if (!turnoValido()) return;
  const v = verificarPase(texto, { sal: estado.indices.sal, prefijo: estado.indices.prefijo, dependenciasValidas: new Set(dependencias().map((d) => String(d.codigo))) });
  if (!v.valido) { await registrar({ resultado: 'rechazo', motivo: v.motivo, nombre: v.pase?.n || '', paseId: v.pase?.id || '', metodo }); return; }
  const p = v.pase;
  await registrar({ paseId: p.id, nombre: p.n, cargo: p.c, dependencia: String(p.d), area: p.a || '', correo: p.e || '', metodo });
}

async function iniciarCamara() {
  const zona = raiz.querySelector('[data-camara-estado]');
  if (!window.Html5Qrcode) {
    zona.innerHTML = `<div class="notice notice-danger">${icono('alerta')}<div><strong>El lector de QR no cargó.</strong> Use la búsqueda manual o recargue con conexión.</div></div>`;
    return;
  }
  try {
    if (!lectorQR) lectorQR = new window.Html5Qrcode('lector-qr', { verbose: false });
    zona.innerHTML = '<span class="spinner" aria-hidden="true"></span> Solicitando permiso de cámara…';
    await lectorQR.start({ facingMode: 'environment' }, { fps: 10, qrbox: (w, h) => { const s = Math.floor(Math.min(w, h) * 0.72); return { width: s, height: s }; }, aspectRatio: 1 }, alLeer, () => {});
    camaraActiva = true;
    raiz.querySelector('[data-visor]').classList.add('is-activo');
    zona.innerHTML = '<span class="pulse" aria-hidden="true"></span> Cámara activa: apunte al QR del pase';
  } catch (e) {
    camaraActiva = false;
    const msg = String(e?.message || e);
    zona.innerHTML = `<div class="notice notice-danger">${icono('camara')}<div><strong>No se pudo abrir la cámara.</strong> ${/permission|NotAllowed/i.test(msg) ? 'Se negó el permiso: actívelo en la configuración del navegador.' : /secure|https/i.test(msg) ? 'La cámara requiere un sitio seguro (https).' : 'Verifique que ninguna otra aplicación la esté usando.'} También puede leer el QR desde una foto o buscar por código.</div></div>`;
  }
  pintarBotonesCamara();
}

async function detenerCamara() {
  if (lectorQR && camaraActiva) { try { await lectorQR.stop(); } catch { /* ya detenida */ } }
  camaraActiva = false;
  if (raiz && raiz.querySelector('[data-visor]')) {
    raiz.querySelector('[data-visor]').classList.remove('is-activo');
    raiz.querySelector('[data-camara-estado]').textContent = 'Cámara detenida.';
    pintarBotonesCamara();
  }
}

function pintarBotonesCamara() {
  const b = raiz.querySelector('[data-camara-toggle]');
  if (!b) return;
  b.innerHTML = camaraActiva ? `${icono('cerrar', 'icon-sm')}Detener cámara` : `${icono('camara', 'icon-sm')}Iniciar cámara`;
  b.classList.toggle('btn-primary', !camaraActiva);
}

async function leerFoto(archivo) {
  if (!window.Html5Qrcode) { toast({ tipo: 'warn', titulo: 'Lector no disponible', mensaje: 'Use la búsqueda manual.' }); return; }
  try {
    if (camaraActiva) await detenerCamara();
    const tmp = new window.Html5Qrcode('lector-archivo', { verbose: false });
    const texto = await tmp.scanFile(archivo, false);
    try { tmp.clear(); } catch { /* sin acción */ }
    await procesarTexto(texto, 'QR');
  } catch {
    mostrarOverlay('rechazo', { motivo: 'No se encontró un código QR legible en la foto.' });
  }
}

// ───────── Turno del lector ─────────
function turnoValido() {
  if (!lector) return false;
  const t = permiso(lector, { ensayo: lector.ensayo });
  turno = t;
  if (!t.ok) {
    detenerCamara();
    pintar();
    toast({ tipo: 'warn', titulo: 'Lector no habilitado en este momento', mensaje: t.motivo });
    return false;
  }
  return true;
}

// ───────── Búsqueda manual ─────────
async function buscarManual(texto) {
  const cont = raiz.querySelector('[data-resultados-manual]');
  const t = texto.trim();
  if (t.length < 4) { cont.innerHTML = '<p class="muted" style="font-size:.86rem">Escriba el código del pase (JP27…) o el correo institucional de la persona.</p>'; return; }
  const codigo = t.toUpperCase().replace(/\s+/g, '');
  if (codigo.startsWith(`${estado.indices.prefijo}-`)) {
    const pase = estado.consolidado.pases.find((x) => x.id === codigo);
    cont.innerHTML = pase
      ? `<ul class="manual-lista"><li class="manual-item"><div class="manual-info"><strong>${esc(pase.n)}</strong><span>${esc(pase.c)}</span><span class="badge badge-ok">${esc(pase.id)}</span></div>
          <button type="button" class="btn btn-primary btn-sm" data-registrar-pase="${esc(pase.id)}">Registrar</button></li></ul>`
      : `<div class="notice">${icono('info')}<div>Ese pase no se emitió en este dispositivo. Pida a la persona que muestre el QR de su correo o de su celular.</div></div>`;
    return;
  }
  const correo = normalizarCorreo(t);
  if (!correo.includes('@')) { cont.innerHTML = ''; return; }
  const lista = await buscarPorCorreo(correo);
  const pase = estado.consolidado.pases.find((x) => x.e === correo);
  if (pase) {
    cont.innerHTML = `<ul class="manual-lista"><li class="manual-item"><div class="manual-info"><strong>${esc(pase.n)}</strong><span>${esc(pase.c)}</span><span class="badge badge-ok">${esc(pase.id)}</span></div>
      <button type="button" class="btn btn-primary btn-sm" data-registrar-pase="${esc(pase.id)}">Registrar</button></li></ul>`;
    return;
  }
  cont.innerHTML = lista.length
    ? `<ul class="manual-lista">${lista.map((p, i) => `<li class="manual-item"><div class="manual-info"><strong>${esc(p.n)}</strong><span>${esc(p.c)}</span><span class="badge">${esc(p.d)} · ${esc(dependencia(p.d)?.sigla || '')}</span><span class="badge badge-warn">Sin pase en este dispositivo</span></div>
        <button type="button" class="btn btn-sm" data-sin-pase="${i}">Registrar sin pase</button></li>`).join('')}</ul>`
    : `<div class="notice">${icono('info')}<div>El correo no está en el directorio ni tiene un pase emitido en este dispositivo.</div></div>`;
  cont.querySelectorAll('[data-sin-pase]').forEach((b) => b.addEventListener('click', async () => {
    const p = lista[Number(b.dataset.sinPase)];
    const ok = await confirmar({ titulo: 'Ingreso sin pase', mensaje: 'Esta persona no presenta pase. Regístrela solo con autorización de la Oficina Asesora de Planeación: quedará marcada como «sin pase».', aceptar: 'Registrar sin pase' });
    if (ok && turnoValido()) await registrar({ paseId: '', nombre: p.n, cargo: p.c, dependencia: String(p.d || ''), area: '', correo, metodo: 'manual' });
  }));
}

// ───────── Pintado ─────────
function pintarActivacion() {
  const cand = actividadEnCurso() || [];
  const actual = cand.find((x) => x.enCurso) || cand[0];
  raiz.innerHTML = `<div class="container escaner">
    <div class="card activar-card">
      <span class="ms-ico">${icono('escaner', 'icon-lg')}</span>
      <h1 class="h-activar">Activar el lector de pases</h1>
      <p class="muted">Solo leen los <strong>responsables de la actividad en curso</strong> según la agenda, con su correo institucional y su PIN personal.</p>
      ${actual ? `<p class="actividad-ahora">${icono('reloj', 'icon-sm')}Ahora: <strong>${esc(actual.bloque.titulo)}</strong> (${esc(actual.bloque.inicio)} a ${esc(actual.bloque.fin)})</p>` : ''}
      <form class="stack" data-activar novalidate>
        <label class="field"><span class="field-label">Correo institucional</span><input class="input" name="correo" type="email" inputmode="email" autocomplete="email" required></label>
        <label class="field"><span class="field-label">PIN</span><input class="input" name="pin" type="password" inputmode="numeric" autocomplete="one-time-code" maxlength="8" required></label>
        <label class="switch"><input type="checkbox" name="ensayo"> Modo ensayo: practicar fuera de la jornada (las lecturas quedan marcadas como prueba)</label>
        <button type="submit" class="btn btn-lg btn-block btn-primary">${icono('usuarioCheck', 'icon-sm')}Activar</button>
      </form>
    </div>
  </div>
  <div class="escaner-overlay" data-overlay aria-live="assertive" role="status"></div>`;
  raiz.querySelector('[data-activar]').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const f = ev.target.elements;
    const r = await verificarLector(f.correo.value, f.pin.value);
    if (!r || r.error) { toast({ tipo: 'error', titulo: 'No se pudo activar el lector', mensaje: r?.error || 'Revise los datos.' }); return; }
    const t = permiso(r, { ensayo: f.ensayo.checked });
    if (!t.ok) { toast({ tipo: 'warn', titulo: `Hola, ${r.nombre.split(' ')[0]}`, mensaje: t.motivo, duracion: 12000 }); return; }
    lector = { ...r, ensayo: f.ensayo.checked, desde: Date.now() };
    guardarLector(lector);
    enviar('activacion', { lector: { nombre: r.nombre, correo: r.correo, rol: r.rol }, actividad: t.bloque ? { id: t.bloque.id, titulo: t.bloque.titulo } : null, prueba: Boolean(t.prueba), hora: new Date().toISOString(), dispositivo: dispositivo() });
    toast({ tipo: 'ok', titulo: `Lector activo: ${r.nombre}`, mensaje: t.prueba ? 'Modo ensayo.' : (t.bloque ? t.bloque.titulo : 'Coordinación de la jornada') });
    pintar();
  });
}

function pintarLector() {
  const t = turno;
  const acts = actividadesDe(lector);
  raiz.innerHTML = `<div class="container escaner">
    <div class="lector-barra" role="status">
      <span class="avatar avatar-sm" aria-hidden="true">${esc(lector.nombre.split(' ').map((x) => x[0]).slice(0, 2).join(''))}</span>
      <div class="lector-info"><strong>${esc(lector.nombre)}</strong><span>${esc(nombreRol(lector.rol))}${t?.prueba ? ' · <b>Modo ensayo</b>' : ''}</span>
        <span class="lector-act">${icono('reloj', 'icon-sm')}${t?.prueba ? 'Lecturas de prueba' : t?.bloque ? `${esc(t.bloque.titulo)} · ${esc(t.bloque.inicio)} a ${esc(t.bloque.fin)}` : 'Coordinación de la jornada'}</span></div>
      <button type="button" class="btn btn-sm btn-ghost" data-salir>${icono('cerrar', 'icon-sm')}Salir</button>
    </div>
    <div class="aviso-export" data-aviso-export role="status">${icono('baseDatos', 'icon-sm')}
      <span>${remotoConfigurado() ? '<strong>Cada lectura se envía al registro en línea.</strong>' : '<strong>Las lecturas se guardan en este dispositivo.</strong> Expórtelas al terminar.'} <span data-pendientes></span></span>
      <button type="button" class="btn btn-sm" data-exportar ${xlsxDisponible() ? '' : 'disabled'}>${icono('excel', 'icon-sm')}Excel</button>
    </div>
    <div class="escaner-grid">
      <div class="stack">
        <div class="contador-card">
          <span class="eyebrow">${icono('personas', 'icon-sm')}Sus lecturas en esta actividad</span>
          <span class="contador-n" data-contador data-formato="entero">0</span>
          <span class="contador-pie" data-contador-pie></span>
        </div>
        <div class="segmentado-lg is-3" role="tablist" aria-label="Forma de registro">
          <button type="button" role="tab" id="m-camara" aria-controls="p-camara" aria-selected="true" data-modo="camara">${icono('camara', 'icon-sm')}Cámara</button>
          <button type="button" role="tab" id="m-manual" aria-controls="p-manual" aria-selected="false" tabindex="-1" data-modo="manual">${icono('teclado', 'icon-sm')}Manual</button>
          <button type="button" role="tab" id="m-lecturas" aria-controls="p-lecturas" aria-selected="false" tabindex="-1" data-modo="lecturas">${icono('baseDatos', 'icon-sm')}Lecturas</button>
        </div>
        <div class="card escaner-card" id="p-camara" role="tabpanel" aria-labelledby="m-camara">
          <div class="visor" data-visor><div id="lector-qr"></div><span class="visor-marco" aria-hidden="true"></span></div>
          <div id="lector-archivo" hidden></div>
          <p class="camara-estado" data-camara-estado aria-live="polite">La cámara trasera lee el QR del pase.</p>
          <div class="btn-group escaner-botones">
            <button type="button" class="btn btn-lg btn-primary" data-camara-toggle></button>
            <label class="btn btn-lg">${icono('imagen', 'icon-sm')}Leer desde foto<input type="file" accept="image/*" capture="environment" hidden data-foto></label>
          </div>
        </div>
        <div class="card escaner-card" id="p-manual" role="tabpanel" aria-labelledby="m-manual" hidden>
          <label class="field"><span class="field-label">Código del pase o correo institucional</span>
            <div class="input-icon">${icono('buscar')}<input class="input" id="busqueda-manual" type="search" placeholder="JP27-101-ABCDE o usuario@itc.edu.co" autocomplete="off"></div></label>
          <div data-resultados-manual aria-live="polite" style="margin-top:12px"></div>
        </div>
        <div class="card escaner-card" id="p-lecturas" role="tabpanel" aria-labelledby="m-lecturas" hidden>
          <h3>Sus últimas lecturas</h3><ul class="recientes" data-recientes></ul>
        </div>
      </div>
      <div class="stack">
        <div class="card"><h3>Sus actividades en la agenda</h3>
          <ul class="mis-actividades">${acts.map(({ dia, bloque }) => `<li class="${t?.bloque?.id === bloque.id ? 'is-actual' : ''}"><span class="mono">Día ${dia.numero} · ${esc(bloque.inicio)}</span><span>${esc(bloque.titulo)}</span></li>`).join('') || '<li class="muted">Coordinación general de la jornada.</li>'}</ul></div>
        <div class="card"><h3>Este dispositivo</h3><p class="muted mb-0" data-resumen-disp></p>
          <hr><button type="button" class="btn btn-sm btn-danger" data-borrar>${icono('basura', 'icon-sm')}Vaciar lecturas de este dispositivo</button></div>
      </div>
    </div>
  </div>
  <div class="escaner-overlay" data-overlay aria-live="assertive" role="status"></div>`;
  pintarBotonesCamara();
  pintarContador();
  activarAnimaciones(raiz);
  if (!window.Html5Qrcode) raiz.querySelector('[data-camara-estado]').textContent = 'El lector de QR aún no carga. Si no aparece, use la búsqueda manual.';
  const busq = raiz.querySelector('#busqueda-manual');
  let tm = null;
  busq.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(() => buscarManual(busq.value), 300); });
  raiz.querySelector('[data-foto]').addEventListener('change', (ev) => { const f = ev.target.files[0]; ev.target.value = ''; if (f) leerFoto(f); });
}

function pintarContador() {
  if (!raiz || !lector || !raiz.querySelector('[data-contador]')) return;
  const mias = misLecturas().filter((a) => (a.actividad?.id || '') === actividadClave());
  animarNumero(raiz.querySelector('[data-contador]'), mias.filter((a) => a.resultado === 'ok').length, 500);
  raiz.querySelector('[data-contador-pie]').textContent = `${mias.filter((a) => a.resultado === 'duplicado').length} repetidas · ${mias.filter((a) => a.resultado === 'rechazo').length} rechazadas · ${misLecturas().length} lecturas suyas en total`;
  const rec = [...misLecturas()].sort((a, b) => b.hora.localeCompare(a.hora)).slice(0, 12);
  const etiqueta = { ok: ['badge-ok', 'Ingreso'], duplicado: ['badge-warn', 'Repetida'], rechazo: ['badge-danger', 'Rechazo'] };
  raiz.querySelector('[data-recientes]').innerHTML = rec.length ? rec.map((a) => `<li><span class="mono">${esc(horaCorta(a.hora))}</span><span><strong>${esc(a.nombre || 'Sin nombre')}</strong> · ${esc(a.actividad?.titulo || '')}</span><span class="badge ${etiqueta[a.resultado]?.[0] || ''}">${etiqueta[a.resultado]?.[1] || ''}</span></li>`).join('') : '<li class="muted">Sin lecturas todavía.</li>';
  const todo = estado.consolidado.asistencia;
  const pend = pendientes();
  raiz.querySelector('[data-resumen-disp]').textContent = `${todo.length} lecturas registradas en este dispositivo por ${new Set(todo.map((a) => a.lector?.correo).filter(Boolean)).size} lectores.`;
  raiz.querySelector('[data-pendientes]').textContent = remotoConfigurado() ? (pend ? `${pend} por enviar (se reintenta solo).` : 'Todo enviado.') : '';
}

function pintar() {
  if (!raiz) return;
  if (lector) turno = permiso(lector, { ensayo: lector.ensayo });
  if (!lector) { pintarActivacion(); return; }
  if (!turno.ok) {
    raiz.innerHTML = `<div class="container escaner"><div class="card activar-card"><span class="ms-ico">${icono('reloj', 'icon-lg')}</span>
      <h1 class="h-activar">${esc(lector.nombre)}, su turno de lectura no está activo</h1><p>${esc(turno.motivo)}</p>
      <div class="btn-group centro"><button type="button" class="btn btn-primary" data-reintentar>${icono('refrescar', 'icon-sm')}Verificar de nuevo</button><button type="button" class="btn" data-salir>Salir</button></div></div></div>
      <div class="escaner-overlay" data-overlay></div>`;
    return;
  }
  pintarLector();
}

async function exportarLecturas() {
  const lista = [...estado.consolidado.asistencia].sort((a, b) => a.hora.localeCompare(b.hora));
  if (!lista.length) { toast({ tipo: 'warn', titulo: 'Sin lecturas', mensaje: 'Aún no hay lecturas para exportar.' }); return; }
  try {
    const logo = await obtenerLogo();
    const r = exportarExcel({
      nombreArchivo: `JP2027_Lecturas_${hoyISO()}_${new Date().toTimeString().slice(0, 5).replace(':', '')}.xlsx`,
      logo: logo.bytes,
      hojas: [{
        nombre: 'Lecturas', titulo: 'Lecturas de pases, Jornada de Planeación 2027', subtitulo: `${lista.length} lecturas registradas en este dispositivo`,
        columnas: [{ titulo: 'Fecha y hora', ancho: 22 }, { titulo: 'Resultado', ancho: 12 }, { titulo: 'Actividad', ancho: 40 }, { titulo: 'Lector', ancho: 26 }, { titulo: 'Correo del lector', ancho: 30 }, { titulo: 'Participante', ancho: 32 }, { titulo: 'Cargo', ancho: 30 }, { titulo: 'Dependencia', ancho: 36 }, { titulo: 'Correo', ancho: 30 }, { titulo: 'Pase', ancho: 18 }, { titulo: 'Método', ancho: 14 }, { titulo: 'Prueba', ancho: 8 }],
        filas: lista.map((a) => [new Date(a.hora).toLocaleString('es-CO'), { ok: 'Ingreso', duplicado: 'Repetida', rechazo: 'Rechazo' }[a.resultado] || a.resultado, a.actividad?.titulo || '', a.lector?.nombre || '', a.lector?.correo || '', a.nombre, a.cargo, a.dependencia ? nombreDependencia(a.dependencia) : '', a.correo, a.paseId, a.metodo, a.prueba ? 'Sí' : 'No'])
      }]
    });
    descargarBlob(r.blob, r.nombre);
    await ctxApp.almacen.guardarMeta({ asistenciaExportada: estado.consolidado.asistencia.length });
    await ctxApp.refrescarConsolidado();
  } catch (e) { toastError('No se pudo exportar', e, e.message); }
}

function cambiarModo(nuevo) {
  modo = nuevo;
  raiz.querySelectorAll('[data-modo]').forEach((b) => { const a = b.dataset.modo === nuevo; b.setAttribute('aria-selected', String(a)); b.tabIndex = a ? 0 : -1; });
  ['camara', 'manual', 'lecturas'].forEach((m) => { raiz.querySelector(`#p-${m}`).hidden = m !== nuevo; });
  if (nuevo !== 'camara') detenerCamara();
  if (nuevo === 'manual') setTimeout(() => raiz.querySelector('#busqueda-manual').focus(), 50);
}

function montar(panel, ctx) {
  raiz = panel;
  ctxApp = ctx;
  lector = cargarLector();
  pintar();
  on(panel, 'click', '[data-camara-toggle]', () => { if (!turnoValido()) return; if (camaraActiva) detenerCamara(); else iniciarCamara(); });
  on(panel, 'click', '[data-overlay]', cerrarOverlay);
  on(panel, 'click', '[data-exportar]', exportarLecturas);
  on(panel, 'click', '[data-modo]', (ev, b) => cambiarModo(b.dataset.modo));
  on(panel, 'click', '[data-registrar-pase]', async (ev, b) => {
    const p = estado.consolidado.pases.find((x) => x.id === b.dataset.registrarPase);
    if (p && turnoValido()) await registrar({ paseId: p.id, nombre: p.n, cargo: p.c, dependencia: String(p.d), area: p.a || '', correo: p.e || '', metodo: 'codigo' });
  });
  on(panel, 'click', '[data-salir]', async () => { await detenerCamara(); lector = null; turno = null; guardarLector(null); pintar(); });
  on(panel, 'click', '[data-reintentar]', () => pintar());
  on(panel, 'click', '[data-borrar]', async () => {
    const ok = await confirmar({ titulo: 'Vaciar lecturas', mensaje: remotoConfigurado() ? 'Se borran las lecturas de este dispositivo. Las ya enviadas siguen en el registro en línea.' : 'Se borran las lecturas de este dispositivo. Expórtelas antes si no lo ha hecho.', aceptar: 'Vaciar', peligro: true });
    if (!ok) return;
    await ctx.almacen.reemplazarAsistencia([]);
    await ctx.refrescarConsolidado();
  });
  alEvento('consolidado', pintarContador);
  alEvento('cola', pintarContador);
  relojTurno = setInterval(() => {
    if (!lector || !raiz || raiz.hidden) return;
    const antes = turno?.bloque?.id;
    const t = permiso(lector, { ensayo: lector.ensayo });
    if (!t.ok || t.bloque?.id !== antes) { detenerCamara(); turno = t; pintar(); if (t.ok) toast({ tipo: 'info', titulo: 'Cambió la actividad', mensaje: t.bloque ? t.bloque.titulo : 'Coordinación' }); }
  }, 60000);
}

const vistaEscaner = {
  id: 'escaner',
  titulo: 'Lector de pases',
  icono: 'escaner',
  montar,
  alMostrar() { pintar(); },
  alOcultar() { detenerCamara(); cerrarOverlay(); }
};

Object.assign(__m["src/tabs/escaner.js"], { vistaEscaner });
})();

// ── src/tabs/admin.js ──
__m["src/tabs/admin.js"] = {};
(function () {
/*
 * admin.js — Panel de la Oficina Asesora de Planeación (vista #admin, enlace en el pie de página).
 * Con la clave de administración lee el registro en línea: quién descargó la plantilla, desde qué dependencia y a
 * qué hora, quién cargará en el SUIE, y cada lectura de QR por lector y por actividad. Sin registro en línea muestra
 * los datos de este dispositivo. Todo se exporta a Excel.
 */
const { estado, dependencias, nombreDependencia } = __m["src/estado.js"];
const { esc, on } = __m["src/ui/dom.js"];
const { icono } = __m["src/ui/iconos.js"];
const { toast, toastError } = __m["src/ui/toast.js"];
const { barrasHorizontales, activarAnimaciones } = __m["src/ui/cards.js"];
const { leerPanel, remotoConfigurado, pendientes } = __m["src/lib/remoto.js"];
const { exportarExcel, xlsxDisponible } = __m["src/lib/excel.js"];
const { descargarBlob, obtenerLogo } = __m["src/lib/export.js"];
const { hoyISO } = __m["src/lib/fechas.js"];
const { entero } = __m["src/lib/formato.js"];

let raiz = null;
let datos = null;

const fecha = (iso) => (iso ? new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : '');
const RES = { ok: 'Ingreso', duplicado: 'Repetida', rechazo: 'Rechazo' };

function normalizarRemoto(j) {
  return {
    origen: 'Registro en línea',
    descargas: (j.descargas || []).map((d) => ({ ...d, responsableSuie: d.responsableSuie || { nombre: d.suieNombre, correo: d.suieCorreo } })),
    lecturas: (j.lecturas || []).map((l) => ({ ...l, lector: l.lector || { nombre: l.lectorNombre, correo: l.lectorCorreo }, actividad: l.actividad || { titulo: l.actividadTitulo, id: l.actividadId } }))
  };
}
function datosLocales() {
  return { origen: 'Este dispositivo', descargas: estado.consolidado.descargas, lecturas: estado.consolidado.asistencia };
}

function pintarPanel() {
  const d = datos;
  const unicas = new Map();
  d.descargas.forEach((x) => { if (!unicas.has(x.correo)) unicas.set(x.correo, x); });
  const personas = [...unicas.values()];
  const deps = new Set(personas.map((x) => String(x.dependencia)));
  const reales = d.lecturas.filter((l) => !(l.prueba === true || l.prueba === 'Sí'));
  const ok = reales.filter((l) => l.resultado === 'ok');
  const porLector = new Map();
  reales.forEach((l) => {
    const k = l.lector?.nombre || 'Sin lector';
    if (!porLector.has(k)) porLector.set(k, { ok: 0, duplicado: 0, rechazo: 0 });
    porLector.get(k)[l.resultado] = (porLector.get(k)[l.resultado] || 0) + 1;
  });
  const porActividad = new Map();
  ok.forEach((l) => { const k = l.actividad?.titulo || 'Sin actividad'; porActividad.set(k, (porActividad.get(k) || 0) + 1); });
  const sinDescarga = dependencias().filter((x) => !deps.has(String(x.codigo)));
  raiz.querySelector('[data-panel]').innerHTML = `
    <p class="field-hint">Fuente: <strong>${esc(d.origen)}</strong>${remotoConfigurado() && pendientes() ? ` · ${pendientes()} envíos pendientes en este dispositivo` : ''}</p>
    <div class="cifras-mini cifras-admin">
      <div class="cifra-mini"><strong>${entero(personas.length)}</strong><span>Personas que descargaron</span></div>
      <div class="cifra-mini"><strong>${entero(deps.size)}/${entero(dependencias().length)}</strong><span>Dependencias con descarga</span></div>
      <div class="cifra-mini"><strong>${entero(ok.length)}</strong><span>Ingresos leídos</span></div>
      <div class="cifra-mini"><strong>${entero(porLector.size)}</strong><span>Lectores con lecturas</span></div>
    </div>
    <div class="grid-2">
      <section class="card"><h3>Descargas por dependencia</h3>${barrasHorizontales(dependencias().map((x) => ({ etiqueta: `${x.codigo} · ${x.sigla || x.nombre}`, valor: personas.filter((p) => String(p.dependencia) === String(x.codigo)).length })).filter((i) => i.valor).sort((a, b) => b.valor - a.valor)) || '<p class="muted">Sin descargas.</p>'}
        ${sinDescarga.length ? `<p class="field-hint" style="margin-top:12px"><strong>Sin descarga todavía:</strong> ${sinDescarga.map((x) => esc(`${x.codigo} ${x.sigla || x.nombre}`)).join(', ')}</p>` : ''}</section>
      <section class="card"><h3>Lecturas por lector</h3>
        <ul class="recientes">${[...porLector.entries()].sort((a, b) => b[1].ok - a[1].ok).map(([n, c]) => `<li><span class="mono">${entero(c.ok)}</span><span><strong>${esc(n)}</strong></span><span class="badge">${entero(c.duplicado || 0)} rep. · ${entero(c.rechazo || 0)} rech.</span></li>`).join('') || '<li class="muted">Sin lecturas.</li>'}</ul>
        <h3 style="margin-top:16px">Ingresos por actividad</h3>
        ${barrasHorizontales([...porActividad.entries()].map(([k, v]) => ({ etiqueta: k, valor: v })).sort((a, b) => b.valor - a.valor)) || '<p class="muted">Sin ingresos.</p>'}</section>
    </div>
    <section class="card"><div class="card-head"><div><h3 class="mb-0">Quién descargó</h3><p>Una fila por persona, con su primera descarga.</p></div></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Nombre</th><th>Dependencia</th><th>Carga en el SUIE</th><th>Pase</th></tr></thead>
      <tbody>${personas.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))).slice(0, 300).map((p) => `<tr><td class="nowrap">${esc(fecha(p.fecha))}</td><td><strong>${esc(p.nombre)}</strong><br><span class="muted">${esc(p.correo)}${p.verificado === false || p.verificado === 'No' ? ' · no verificado' : ''}</span></td><td>${esc(p.dependencia)} · ${esc(nombreDependencia(p.dependencia))}</td><td>${esc(p.responsableSuie?.nombre || '')}<br><span class="muted">${esc(p.responsableSuie?.correo || '')}</span></td><td class="mono">${esc(p.paseId || '')}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">Sin descargas.</td></tr>'}</tbody></table></div></section>`;
  activarAnimaciones(raiz);
}

async function exportar() {
  if (!datos) return;
  try {
    const logo = await obtenerLogo();
    const r = exportarExcel({
      nombreArchivo: `JP2027_Panel_${hoyISO()}.xlsx`,
      logo: logo.bytes,
      hojas: [
        { nombre: 'Descargas', titulo: 'Descargas de la Plantilla Plan de Acción 2027', subtitulo: `${datos.descargas.length} registros · ${datos.origen}`,
          columnas: [{ titulo: 'Fecha y hora', ancho: 20 }, { titulo: 'Nombre', ancho: 32 }, { titulo: 'Cargo', ancho: 30 }, { titulo: 'Correo', ancho: 30 }, { titulo: 'Dependencia', ancho: 36 }, { titulo: 'Área funcional', ancho: 30 }, { titulo: 'Responsable del cargue en el SUIE', ancho: 30 }, { titulo: 'Correo del responsable', ancho: 30 }, { titulo: 'Pase', ancho: 18 }, { titulo: 'Verificado', ancho: 10 }, { titulo: 'Repetida', ancho: 10 }, { titulo: 'Dispositivo', ancho: 18 }],
          filas: datos.descargas.map((x) => [fecha(x.fecha), x.nombre, x.cargo, x.correo, `${x.dependencia} · ${nombreDependencia(x.dependencia)}`, x.areaNombre || '', x.responsableSuie?.nombre || '', x.responsableSuie?.correo || '', x.paseId || '', x.verificado === false || x.verificado === 'No' ? 'No' : 'Sí', x.repetida === true || x.repetida === 'Sí' ? 'Sí' : 'No', x.dispositivo || ''])
        },
        { nombre: 'Lecturas', titulo: 'Lecturas de pases QR', subtitulo: `${datos.lecturas.length} lecturas · ${datos.origen}`,
          columnas: [{ titulo: 'Fecha y hora', ancho: 20 }, { titulo: 'Resultado', ancho: 12 }, { titulo: 'Actividad', ancho: 40 }, { titulo: 'Lector', ancho: 26 }, { titulo: 'Participante', ancho: 32 }, { titulo: 'Dependencia', ancho: 36 }, { titulo: 'Correo', ancho: 30 }, { titulo: 'Pase', ancho: 18 }, { titulo: 'Método', ancho: 12 }, { titulo: 'Prueba', ancho: 8 }],
          filas: datos.lecturas.map((l) => [fecha(l.hora), RES[l.resultado] || l.resultado, l.actividad?.titulo || '', l.lector?.nombre || '', l.nombre || '', l.dependencia ? `${l.dependencia} · ${nombreDependencia(l.dependencia)}` : '', l.correo || '', l.paseId || '', l.metodo || '', l.prueba === true || l.prueba === 'Sí' ? 'Sí' : 'No'])
        }
      ]
    });
    descargarBlob(r.blob, r.nombre);
  } catch (e) { toastError('No se pudo exportar', e, e.message); }
}

function montar(panel) {
  raiz = panel;
  panel.innerHTML = `<div class="container page page-app">
    <header class="app-hero">
      <span class="eyebrow">${icono('baseDatos', 'icon-sm')}Oficina Asesora de Planeación</span>
      <h1>Panel de seguimiento</h1>
      <p class="lead">Descargas de la plantilla por dependencia y lecturas de los pases por lector y por actividad.</p>
    </header>
    <form class="card card-tight row" data-clave>
      <label class="field" style="flex:1;min-width:220px"><span class="field-label">Clave de administración</span><input class="input" type="password" name="clave" autocomplete="current-password" ${remotoConfigurado() ? '' : 'disabled placeholder="Registro en línea sin configurar"'}></label>
      <div class="btn-group" style="align-self:flex-end">
        <button type="submit" class="btn btn-primary" ${remotoConfigurado() ? '' : 'disabled'}>${icono('refrescar', 'icon-sm')}Consultar en línea</button>
        <button type="button" class="btn" data-local>Ver este dispositivo</button>
        <button type="button" class="btn" data-exportar ${xlsxDisponible() ? '' : 'disabled'}>${icono('excel', 'icon-sm')}Excel</button>
      </div>
    </form>
    <div data-panel></div>
  </div>`;
  panel.querySelector('[data-clave]').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const clave = ev.target.elements.clave.value;
    try {
      raiz.querySelector('[data-panel]').innerHTML = '<div class="skeleton skeleton-card"></div>';
      datos = normalizarRemoto(await leerPanel(clave));
      pintarPanel();
    } catch (e) { toast({ tipo: 'error', titulo: 'No se pudo consultar', mensaje: e.message }); datos = datosLocales(); pintarPanel(); }
  });
  on(panel, 'click', '[data-local]', () => { datos = datosLocales(); pintarPanel(); });
  on(panel, 'click', '[data-exportar]', exportar);
  datos = datosLocales();
  pintarPanel();
}

const vistaAdmin = {
  id: 'admin',
  titulo: 'Panel de seguimiento',
  icono: 'baseDatos',
  montar,
  alMostrar() { if (datos && datos.origen === 'Este dispositivo') { datos = datosLocales(); pintarPanel(); } }
};

Object.assign(__m["src/tabs/admin.js"], { vistaAdmin });
})();

// ── src/app.js ──
__m["src/app.js"] = {};
(function () {
/*
 * app.js — Arranque y enrutamiento de pestañas.
 *  1. Carga los datos de /data (con respaldo empaquetado en file://).
 *  2. Lee el respaldo local (descargas, pases y lecturas) y reintenta los envíos pendientes al registro en línea.
 *  3. Construye la navegación por hash: tres pestañas (Agenda, Plan de acción, Plan de necesidades),
 *     el lector de pases (#escaner) y el panel de la Oficina Asesora de Planeación (#admin).
 */
const { FEATURES } = __m["src/config.js"];
const { almacen } = __m["src/storage.js"];
const { estado, fijarDatos, fijarConsolidado, on, emitir } = __m["src/estado.js"];
const { cargarDatos, cargarDesdeArchivos } = __m["src/lib/datos.js"];
const { esperarLibrerias, avisarLibreriasFaltantes } = __m["src/lib/libs.js"];
const { descargarTexto, obtenerLogo } = __m["src/lib/export.js"];
const { vaciarCola } = __m["src/lib/remoto.js"];
const { crearPestanas } = __m["src/ui/tabs.js"];
const { toast, toastError } = __m["src/ui/toast.js"];
const { skeletonPestana } = __m["src/ui/skeleton.js"];
const { icono } = __m["src/ui/iconos.js"];
const { esc, qs } = __m["src/ui/dom.js"];
const { activarAnimaciones } = __m["src/ui/cards.js"];
const { pestanaCalendario } = __m["src/tabs/calendario.js"];
const { pestanaAccion } = __m["src/tabs/accion.js"];
const { pestanaNecesidades } = __m["src/tabs/necesidades.js"];
const { pestanaRiesgos } = __m["src/tabs/riesgos.js"];
const { vistaEscaner } = __m["src/tabs/escaner.js"];
const { vistaAdmin } = __m["src/tabs/admin.js"];

const PESTANAS = [pestanaCalendario, pestanaAccion, pestanaNecesidades]
  .concat(FEATURES.mapaRiesgos ? [pestanaRiesgos] : []);
const VISTAS = [...PESTANAS, vistaEscaner, vistaAdmin];
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

// ───────── Respaldo local (pie de página) ─────────
function pintarPie(origen, fechaEmpaquetado) {
  const pie = qs('#pie-acciones');
  const enDisco = Object.values(origen).includes('empaquetado');
  pie.innerHTML = `
    <button type="button" class="btn btn-sm btn-ghost" data-pie="respaldo">${icono('guardar', 'icon-sm')}Exportar respaldo</button>
    <button type="button" class="btn btn-sm btn-ghost" data-pie="importar">${icono('subir', 'icon-sm')}Importar respaldo</button>
    <input type="file" accept=".json,application/json" hidden data-pie-importar>
    <a class="btn btn-sm btn-ghost" href="#admin">${icono('baseDatos', 'icon-sm')}Panel OAP</a>
    ${enDisco ? `<button type="button" class="btn btn-sm btn-ghost" data-pie="carpeta">${icono('carpeta', 'icon-sm')}Cargar carpeta data</button><input type="file" webkitdirectory multiple hidden data-pie-carpeta>` : ''}`;
  pie.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-pie]');
    if (!b) return;
    if (b.dataset.pie === 'respaldo') {
      try {
        const r = await almacen.exportarRespaldo();
        descargarTexto(JSON.stringify(r, null, 2), `JP2027_respaldo_${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json`, 'application/json');
        await almacen.guardarMeta({ ultimoRespaldo: new Date().toISOString() });
        toast({ tipo: 'ok', titulo: 'Respaldo descargado', mensaje: 'Contiene las descargas, los pases y las lecturas guardados en este navegador.' });
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
    if (vista.id === 'escaner' || vista.id === 'admin') panel.setAttribute('aria-label', vista.titulo);
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

  let carga;
  try { carga = await cargarDatos(); } catch (e) { errorFatal(e); return; }
  fijarDatos(carga.datos, carga.origen);
  carga.problemas.forEach((p) => toast({ tipo: 'warn', titulo: `No se leyó ${p.ruta}`, mensaje: 'Esa sección se mostrará vacía. Revise que el archivo exista y sea JSON válido.' }));
  obtenerLogo().catch(() => null);

  try { fijarConsolidado(await almacen.leerConsolidado()); } catch (e) { toastError('No se pudo leer la información guardada', e, e.message); }
  vaciarCola();

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
    if (!estado.datos?.config?.registro?.url && asistencia.length > (meta?.asistenciaExportada || 0)) { ev.preventDefault(); ev.returnValue = ''; }
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
else iniciar();



Object.assign(__m["src/app.js"], { on });
})();
})();
