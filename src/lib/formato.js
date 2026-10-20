/*
 * formato.js — Formato de cifras en español de Colombia y normalización de texto para comparaciones.
 */

const fmtMoneda = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const fmtNumero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });
const fmtEntero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

export function moneda(v) { return fmtMoneda.format(Number(v) || 0); }
export function numero(v) { return fmtNumero.format(Number(v) || 0); }
export function entero(v) { return fmtEntero.format(Math.round(Number(v) || 0)); }
export function porcentaje(v, decimales = 0) { return `${(Number(v) || 0).toFixed(decimales).replace('.', ',')} %`; }

// Moneda compacta para cifras grandes: $ 1.250 M, $ 3,4 mil M
export function monedaCompacta(v) {
  const n = Number(v) || 0;
  const abs = Math.abs(n);
  if (abs >= 1e12) return `$ ${fmtNumero.format(+(n / 1e12).toFixed(1))} B`;
  if (abs >= 1e9) return `$ ${fmtNumero.format(+(n / 1e9).toFixed(1))} mil M`;
  if (abs >= 1e6) return `$ ${fmtEntero.format(n / 1e6)} M`;
  return moneda(n);
}

export function formatear(v, formato) {
  switch (formato) {
    case 'moneda': return moneda(v);
    case 'monedaCompacta': return monedaCompacta(v);
    case 'porcentaje': return porcentaje(v);
    case 'numero': return numero(v);
    default: return entero(v);
  }
}

// Convierte "$ 12.500.000,50", "12500000", 12500000 → número. Devuelve null si no es interpretable.
export function aNumero(v) {
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
export function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ@.\-\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function plural(n, singular, pluralTexto) {
  return `${entero(n)} ${n === 1 ? singular : (pluralTexto || `${singular}s`)}`;
}

// Iniciales para avatares.
export function iniciales(nombre) {
  const partes = String(nombre || '').replace(/^hno\.?\s+/i, '').split(/\s+/).filter(Boolean);
  return partes.slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';
}

// Convierte texto en MAYÚSCULAS del directorio a formato título legible (cargos).
export function tituloLegible(texto) {
  const s = String(texto || '').trim();
  if (!s || s !== s.toUpperCase()) return s;
  const menores = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'en', 'a', 'al']);
  return s.toLowerCase().split(/\s+/).map((p, i) => (i > 0 && menores.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1))).join(' ');
}
