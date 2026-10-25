/*
 * calendario.js — Pestaña 1: Calendario de la Jornada de Planeación Institucional 2027.
 * Cuenta regresiva, descarga del cronograma en PDF y del calendario para Outlook (.ics),
 * agenda de los tres días con el bloque en curso resaltado, y la ruta de planeación (antes, durante, después).
 */
import { estado, on as alEvento, area as areaPorId } from '../estado.js';
import { esc, on } from '../ui/dom.js';
import { icono } from '../ui/iconos.js';
import { toast, toastError } from '../ui/toast.js';
import { cronogramaAPdf, generarICS, descargarTexto, pdfDisponible } from '../lib/export.js';
import { rangoFechasTexto, fechaCorta, hoyISO, deISO } from '../lib/fechas.js';
import { identificacion, paseDe } from '../ui/registro-descarga.js';

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

export const pestanaCalendario = {
  id: 'calendario',
  titulo: 'Calendario',
  tituloCorto: 'Calendario',
  tituloMovil: 'Calendario',
  icono: 'agenda',
  montar,
  alMostrar() { pintarCuenta(); const c = raiz?.querySelector('[data-pase-cta]'); if (c) c.innerHTML = tarjetaPase(); if (!reloj) reloj = setInterval(pintarCuenta, 30000); },
  alOcultar() { clearInterval(reloj); reloj = null; }
};
