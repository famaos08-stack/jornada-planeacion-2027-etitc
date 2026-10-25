/*
 * accion.js — Pestaña 2: Plan de acción.
 * Un único archivo para descargar, la Plantilla Plan de Acción 2027, habilitado por el formulario de registro.
 * Al registrarse la persona recibe su pase QR de ingreso. El cargue de la formulación se hace en el SUIE,
 * no en este aplicativo. También se descargan el manual de ejemplos y el instructivo de formulación (PDF).
 */
import { estado, on as alEvento, dependencia, area as areaPorId } from '../estado.js';
import { esc, on } from '../ui/dom.js';
import { icono } from '../ui/iconos.js';
import { toast } from '../ui/toast.js';
import { montarPase } from '../ui/pase.js';
import { registrarYDescargar, identificacion, paseDe, olvidarIdentificacion, descargarArchivo } from '../ui/registro-descarga.js';
import { fechaCorta, horaLegible } from '../lib/fechas.js';

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

export const pestanaAccion = {
  id: 'accion',
  titulo: 'Plan de acción',
  tituloCorto: 'Plan de acción',
  tituloMovil: 'Plan de acción',
  icono: 'formulacion',
  montar,
  alMostrar() { if (raiz) pintarEstado(); }
};
