/*
 * agenda.js — Pestaña 1: línea de tiempo vertical del día.
 * Marca el bloque en curso según la hora del dispositivo (con indicador pulsante), atenúa los pasados,
 * expande el detalle al hacer clic, filtra por dependencia y exporta a PDF y a .ics (Outlook).
 */
import { estado, dependencia, dependencias } from '../estado.js';
import { esc, on } from '../ui/dom.js';
import { icono } from '../ui/iconos.js';
import { toast, toastError } from '../ui/toast.js';
import { estadoVacio, activarAnimaciones } from '../ui/cards.js';
import { fechaLarga, hoyISO, horaAMinutos, diferenciaDias } from '../lib/fechas.js';
import { agendaAPdf, generarICS, descargarTexto, pdfDisponible } from '../lib/export.js';
import { TIPOS_PROCESO } from '../config.js';

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

export const pestanaAgenda = {
  id: 'agenda',
  titulo: 'Agenda',
  icono: 'agenda',
  montar,
  alMostrar() { pintarLineaConservandoAperturas(); }
};
