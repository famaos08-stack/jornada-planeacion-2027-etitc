/*
 * lectores.js — Quién puede leer pases y cuándo.
 * Solo leen los responsables de la actividad en curso según la agenda (data/agenda.json), identificados con su
 * correo institucional y un PIN personal. El archivo público data/lectores.json solo contiene resúmenes SHA-256.
 * Coordinadores: pueden leer en cualquier momento de la jornada. Apoyo: solo en los bloques de registro.
 * Modo ensayo: cualquier lector puede practicar fuera de la jornada; esas lecturas quedan marcadas como prueba.
 */
import { estado } from '../estado.js';
import { resumen, normalizarCorreo } from './directorio.js';
import { normalizar } from './formato.js';

const ROLES = { coordinador: 'Coordinación', moderador: 'Responsable de actividad', apoyo: 'Apoyo de registro' };
export const nombreRol = (r) => ROLES[r] || r;

export async function verificarLector(correo, pin) {
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
export function actividadEnCurso(ahora = new Date()) {
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

export function enJornada(ahora = new Date()) {
  const dias = estado.datos?.agenda?.dias || [];
  return dias.some((d) => ahora >= instante(d.fecha, '06:30') && ahora < instante(d.fecha, '19:00'));
}

const esResponsable = (lector, bloque) => (bloque.responsables || []).some((n) => normalizar(n) === normalizar(lector.nombre));

/*
 * permiso(lector, { ensayo }) → { ok, bloque, dia, prueba, motivo }
 */
export function permiso(lector, { ensayo = false, ahora = new Date() } = {}) {
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

export function proximaActividad(lector, ahora = new Date()) {
  for (const dia of estado.datos?.agenda?.dias || []) {
    for (const b of dia.bloques || []) {
      if (instante(dia.fecha, b.fin) > ahora && (esResponsable(lector, b) || (lector.rol === 'apoyo' && b.tipo === 'llegada'))) return { dia, bloque: b };
    }
  }
  return null;
}

export function actividadesDe(lector) {
  const out = [];
  (estado.datos?.agenda?.dias || []).forEach((dia) => (dia.bloques || []).forEach((b) => {
    if (esResponsable(lector, b) || (lector.rol === 'apoyo' && b.tipo === 'llegada')) out.push({ dia, bloque: b });
  }));
  return out;
}
