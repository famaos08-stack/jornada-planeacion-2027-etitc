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
export function firmar(pase, sal) {
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

export function generarIdPase(codigoDependencia, prefijo = 'JP27') {
  return `${prefijo}-${codigoDependencia}-${aleatorio(5)}`;
}

// Crea el contenido del pase: {"id","n","c","d","a","e","ts","h"} (a = área funcional, por ejemplo A05)
export function crearPase({ nombre, cargo, dependencia, area = '', correo, prefijo, sal }) {
  const pase = { id: generarIdPase(dependencia, prefijo), n: nombre, c: cargo, d: dependencia, ...(area ? { a: area } : {}), e: correo, ts: Date.now(), h: '' };
  pase.h = firmar(pase, sal);
  return pase;
}

export function contenidoQR(pase) {
  return JSON.stringify({ id: pase.id, n: pase.n, c: pase.c, d: pase.d, ...(pase.a ? { a: pase.a } : {}), e: pase.e, ts: pase.ts, h: pase.h });
}

// Verifica el texto leído por la cámara. Devuelve { valido, motivo, pase }.
export function verificarPase(texto, { sal, prefijo = 'JP27', dependenciasValidas = null }) {
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

export function qrDisponible() { return Boolean(window.QRCode && (window.QRCode.toCanvas || window.QRCode.toDataURL)); }

// Genera la imagen del QR como data URL (PNG). Error de corrección M, módulos en verde institucional.
export async function qrComoDataUrl(texto, { tamano = 360, oscuro = '#0b4d3b' } = {}) {
  if (!qrDisponible()) throw new Error('La librería de códigos QR no cargó.');
  return window.QRCode.toDataURL(texto, { errorCorrectionLevel: 'M', margin: 1, width: tamano, color: { dark: oscuro, light: '#ffffff' } });
}
