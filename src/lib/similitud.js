/*
 * similitud.js — Similitud de Dice sobre bigramas de caracteres: 1 = textos idénticos, 0 = nada en común.
 * Se usa para reconocer nombres de acción escritos con pequeñas diferencias y para sugerir el área funcional.
 */
import { normalizar } from './formato.js';

export function similitud(a, b) {
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
