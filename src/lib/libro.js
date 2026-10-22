/*
 * libro.js — Lectura de las plantillas institucionales con SheetJS.
 * Las plantillas de la Oficina Asesora de Planeación son libros protegidos con hojas ocultas y fórmulas.
 * Aquí se abren en el navegador (el archivo no sale del equipo) y se ofrecen utilidades para ubicar hojas
 * y columnas por el texto del encabezado, de modo que la validación no dependa de letras de columna fijas.
 */
import { normalizar } from './formato.js';
import { leerFechaExcel } from './fechas.js';

export function xlsxDisponible() { return Boolean(window.XLSX && window.XLSX.utils); }

function libreria() {
  if (!xlsxDisponible()) throw new Error('La librería de Excel (SheetJS) no cargó. Revise su conexión a internet y recargue la página.');
  return window.XLSX;
}

// Abre un archivo Excel del usuario. Devuelve { nombreArchivo, tamano, wb }.
export async function abrirLibro(archivo, { maxMB = 25 } = {}) {
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
export function hoja(wb, nombre, { prefijo = false } = {}) {
  const objetivo = normalizar(nombre).replace(/[\s_]+/g, '');
  const clave = wb.SheetNames.find((n) => {
    const k = normalizar(n).replace(/[\s_]+/g, '');
    return prefijo ? k.startsWith(objetivo) : k === objetivo;
  });
  return clave ? { nombre: clave, ws: wb.Sheets[clave] } : null;
}

const direccion = (f, c) => `${columnaLetra(c)}${f}`;
export function columnaLetra(c) { let s = ''; let x = c + 1; while (x > 0) { const m = (x - 1) % 26; s = String.fromCharCode(65 + m) + s; x = Math.floor((x - 1) / 26); } return s; }

// Valor de una celda (fila 1-based, columna 0-based). Si la fórmula no trae valor guardado y es una
// referencia simple a otra hoja (=Base_OAPDI!J5), se resuelve leyendo esa celda.
export function valor(wb, ws, fila, col) {
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

export function rango(ws) {
  const X = libreria();
  return ws && ws['!ref'] ? X.utils.decode_range(ws['!ref']) : { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
}

/*
 * Busca la fila de encabezados (en las primeras maxFila filas) que contiene todos los textos obligatorios
 * y mapea cada clave a su columna. columnas = { clave: 'texto del encabezado' | ['alternativa', ...] }.
 * La comparación ignora tildes, mayúsculas y signos, y acepta que el encabezado empiece por el texto buscado.
 */
export function encabezados(wb, ws, columnas, { maxFila = 15, obligatorias = [] } = {}) {
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
export function filaComoObjeto(wb, ws, fila, col) {
  const o = { _fila: fila };
  for (const [k, c] of Object.entries(col)) o[k] = valor(wb, ws, fila, c);
  return o;
}

// Utilidades de valores
export const vacio = (v) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
export const texto = (v) => {
  if (vacio(v)) return '';
  if (v instanceof Date) return leerFechaExcel(v) || '';
  return String(v).trim();
};
// Una fecha válida es un Date o un número de serie de Excel (como en la función ISNUMBER de la plantilla).
export function fechaValida(v) {
  if (v instanceof Date) return leerFechaExcel(v);
  if (typeof v === 'number' && Number.isFinite(v)) return leerFechaExcel(v);
  return null;
}
export const esNumero = (v) => typeof v === 'number' && Number.isFinite(v);
