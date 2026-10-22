/*
 * fechas.js — Fechas y días hábiles de Colombia.
 * Las fechas se manejan como cadenas ISO "AAAA-MM-DD" y se convierten a Date al mediodía local
 * para evitar saltos por zona horaria. El cálculo replica la función DIA.LAB / WORKDAY de Excel:
 * se excluyen sábados, domingos y los festivos de data/festivos.json.
 */

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export function deISO(iso) {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
}

export function aISO(fecha) {
  if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) return null;
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function hoyISO() { return aISO(new Date()); }

export function sumarDias(iso, n) {
  const f = deISO(iso);
  f.setDate(f.getDate() + n);
  return aISO(f);
}

export function diferenciaDias(desdeISO, hastaISO) {
  return Math.round((deISO(hastaISO) - deISO(desdeISO)) / 86400000);
}

// "jueves 19 de noviembre de 2026"
export function fechaLarga(iso, { conDia = true } = {}) {
  const f = deISO(iso);
  if (!f) return '';
  return `${conDia ? `${DIAS[f.getDay()]} ` : ''}${f.getDate()} de ${MESES[f.getMonth()]} de ${f.getFullYear()}`;
}

// "19 nov 2026"
export function fechaCorta(iso) {
  const f = deISO(iso);
  if (!f) return '';
  return `${f.getDate()} ${MESES_CORTOS[f.getMonth()]} ${f.getFullYear()}`;
}

export function nombreMes(indice, corto = false) { return (corto ? MESES_CORTOS : MESES)[indice]; }

export function horaAMinutos(hhmm) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm || ''));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export function horaLegible(fecha = new Date()) {
  return fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// Trimestre (1–4) de una fecha ISO.
export function trimestreDe(iso) {
  const f = deISO(iso);
  return f ? Math.floor(f.getMonth() / 3) + 1 : null;
}

// Interpreta "T1", "1", "Trimestre 2", "I", "Q3", "tercer trimestre" → 1..4
export function leerTrimestre(valor) {
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
export function leerFechaExcel(valor) {
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
export function serieExcel(iso) {
  const f = deISO(iso);
  return Math.round((Date.UTC(f.getFullYear(), f.getMonth(), f.getDate()) - Date.UTC(1899, 11, 30)) / 86400000);
}

// Calendario hábil con los festivos cargados.
export function crearCalendario(festivos = []) {
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
export function caminoContratacion(calendario, modalidad, fechaOperacionISO) {
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
export function rangoFechasTexto(fechasISO) {
  const f = (fechasISO || []).filter(Boolean).sort();
  if (!f.length) return '';
  if (f.length === 1) return fechaLarga(f[0], { conDia: false });
  const mismoMes = f.every((x) => x.slice(0, 7) === f[0].slice(0, 7));
  if (!mismoMes) return `${fechaLarga(f[0], { conDia: false })} al ${fechaLarga(f[f.length - 1], { conDia: false })}`;
  const dias = f.map((x) => Number(x.slice(8)));
  const d = deISO(f[0]);
  return `${dias.slice(0, -1).join(', ')} y ${dias[dias.length - 1]} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}
