/*
 * adquisiciones.js — Pestaña 4: Plan de adquisiciones.
 * Lo que explicará el GIT de Contratación y Adquisiciones: la ruta del plan de necesidades al Plan Anual de
 * Adquisiciones (publicación a más tardar el 31 de enero de 2027), las siete modalidades con sus tiempos,
 * una calculadora de la fecha límite de radicación, topes, campos que se revisan, lecciones de 2026 y normativa.
 */
import { estado } from '../estado.js';
import { esc, on } from '../ui/dom.js';
import { icono } from '../ui/iconos.js';
import { caminoContratacion, fechaLarga, fechaCorta, diferenciaDias, hoyISO, sumarDias } from '../lib/fechas.js';
import { entero, moneda } from '../lib/formato.js';

let raiz = null;

const datos = () => estado.datos.contratacion || {};
const modalidades = () => estado.datos.modalidades?.modalidades || [];

function pintarCalculo() {
  const cal = estado.indices.calendario;
  const id = raiz.querySelector('[name="modalidad"]').value;
  const fecha = raiz.querySelector('[name="fecha"]').value;
  const res = raiz.querySelector('[data-calculo]');
  const m = modalidades().find((x) => x.id === id);
  if (!m || !fecha) { res.innerHTML = ''; return; }
  const c = caminoContratacion(cal, m, fecha);
  const hoy = hoyISO();
  const margen = diferenciaDias(hoy, c.radicacion);
  const sinFestivos = !cal.cubreAnio(Number(c.radicacion.slice(0, 4))) || !cal.cubreAnio(Number(fecha.slice(0, 4)));
  const maxDias = Math.max(...c.etapas.map((e) => e.diasHabiles), 1);
  res.innerHTML = `<div class="calc-resultado ${margen < 0 ? 'is-tarde' : margen < (estado.datos.config?.umbrales?.diasAlertaRadicacion || 30) ? 'is-justo' : ''}">
      <span class="eyebrow">Radique a más tardar</span>
      <strong class="calc-fecha">${esc(fechaLarga(c.radicacion))}</strong>
      <span>${entero(c.totalHabiles)} días hábiles antes de tenerlo operando el ${esc(fechaCorta(fecha))}</span>
      <span class="calc-margen">${margen < 0 ? `${icono('alerta', 'icon-sm')}Esa fecha ya pasó: no alcanza con esta modalidad.` : margen === 0 ? `${icono('alerta', 'icon-sm')}Es hoy.` : `${icono('reloj', 'icon-sm')}Quedan ${entero(margen)} días calendario para radicar.`}</span>
    </div>
    <ol class="calc-etapas">${c.etapas.map((e) => `<li>
      <div class="row-between"><span>${esc(e.nombre)}</span><span class="nowrap muted">${entero(e.diasHabiles)} d · ${esc(fechaCorta(e.fin).replace(/ \d{4}$/, ''))}</span></div>
      <span class="calc-barra" aria-hidden="true"><span style="width:${(e.diasHabiles / maxDias) * 100}%"></span></span></li>`).join('')}</ol>
    ${sinFestivos ? `<p class="field-hint">${icono('info', 'icon-sm')} El calendario de festivos cargado no cubre todo ese periodo: el cálculo solo descuenta fines de semana fuera de 2026–2027.</p>` : ''}`;
}

function montar(panel) {
  raiz = panel;
  const c = datos();
  const mods = modalidades();
  const provisional = estado.datos.modalidades?.provisional;
  const pub = c.fechaPublicacion || '2027-01-31';
  const faltan = diferenciaDias(hoyISO(), pub);
  const fechaInicial = sumarDias(hoyISO() > '2027-01-15' ? hoyISO() : '2027-02-01', 30);
  const t = c.topes || {};

  panel.innerHTML = `<div class="container page page-app">
    <section class="hero-card reveal">
      <span class="eyebrow">${icono('adquisiciones', 'icon-sm')}GIT de Contratación y Adquisiciones</span>
      <h1>Plan de adquisiciones 2027</h1>
      <p class="hero-lema">${esc(c.titulo || '')}</p>
      <p>${esc(c.proposito || '')}</p>
      <div class="hero-chips">
        <span class="hero-chip is-gold">${icono('bandera', 'icon-sm')}Publicación del PAA: ${esc(fechaLarga(pub, { conDia: false }))}</span>
        ${faltan > 0 ? `<span class="hero-chip">${icono('reloj', 'icon-sm')}Faltan ${entero(faltan)} días</span>` : ''}
      </div>
    </section>

    <section class="card reveal" aria-labelledby="h-ruta-paa">
      <div class="card-head"><div><h2 id="h-ruta-paa" class="mb-0">De su necesidad al contrato</h2><p>${esc(c.fechaPublicacionTexto || '')}</p></div></div>
      <ol class="etapas-paa">${(c.etapas || []).map((e) => `<li class="etapa-paa">
        <span class="etapa-num">${e.numero}</span>
        <div><strong>${esc(e.titulo)}</strong><p class="mb-0">${esc(e.detalle)}</p>
          <span class="badge ${/Contrataci/i.test(e.responsable) ? 'badge-solid' : ''}">${esc(String(e.responsable).replace(/\s*\[PENDIENTE DE VERIFICAR\]/, ''))}</span>${/PENDIENTE/.test(e.responsable) ? ' <span class="badge badge-warn">Por confirmar</span>' : ''}</div>
      </li>`).join('')}</ol>
    </section>

    <section class="card calc reveal" aria-labelledby="h-calc">
      <div class="card-head"><div><h2 id="h-calc" class="mb-0">¿Cuándo debo radicar?</h2><p>Elija la modalidad y la fecha en que necesita el bien o servicio funcionando. Se cuentan días hábiles con los festivos de Colombia.</p></div></div>
      <div class="grid-2 grid-form">
        <label class="field"><span class="field-label">Modalidad</span><select class="select" name="modalidad">${mods.map((m) => `<option value="${esc(m.id)}" ${m.id === 'minima' ? 'selected' : ''}>${esc(m.nombre)}</option>`).join('')}</select></label>
        <label class="field"><span class="field-label">Lo necesito operando el</span><input class="input" type="date" name="fecha" value="${esc(fechaInicial)}" min="2026-01-01" max="2028-12-31"></label>
      </div>
      <div data-calculo aria-live="polite"></div>
      ${provisional ? `<p class="field-hint mb-0">${icono('alerta', 'icon-sm')} Tiempos de referencia: el GIT de Contratación confirmará los tiempos institucionales.</p>` : ''}
    </section>

    <section aria-labelledby="h-mod" class="stack">
      <h2 id="h-mod" class="mb-0">Las siete modalidades</h2>
      <div class="modalidades">${mods.map((m) => `<details class="modalidad reveal">
        <summary><span class="mod-dias"><strong>${entero(m.diasHabilesTotales)}</strong><small>días hábiles</small></span>
          <span class="mod-info"><strong>${esc(m.nombre)}</strong><span>${esc(m.criterio)}</span></span>${icono('abajo', 'icon-sm')}</summary>
        <div class="mod-cuerpo"><p>${esc(m.cuando)}</p>
          <ol class="mod-etapas">${(m.etapas || []).map((e) => `<li><span>${esc(e.nombre)}</span><span class="nowrap">${entero(e.diasHabiles)} d</span></li>`).join('')}</ol></div>
      </details>`).join('')}</div>
    </section>

    <section class="card reveal" aria-labelledby="h-topes">
      <div class="card-head"><div><h2 id="h-topes" class="mb-0">Topes de cuantía 2027</h2></div>${t.menorCuantia ? '' : '<span class="badge badge-warn">Por certificar</span>'}</div>
      <div class="topes">
        <div class="tope"><span>Menor cuantía</span><strong>${t.menorCuantia ? esc(moneda(t.menorCuantia)) : 'Pendiente'}</strong></div>
        <div class="tope"><span>Mínima cuantía</span><strong>${t.minimaCuantia ? esc(moneda(t.minimaCuantia)) : 'Pendiente'}</strong></div>
        <div class="tope"><span>SMMLV 2027</span><strong>${t.smmlv ? esc(moneda(t.smmlv)) : 'Pendiente'}</strong></div>
      </div>
      <p>${esc(t.regla || '')}</p>
      ${t.advertencia ? `<div class="notice">${icono('alerta')}<div>${esc(t.advertencia)}</div></div>` : ''}
      <p class="field-hint mb-0">${esc(String(t.estado || '').replace(/\[PENDIENTE DE VERIFICAR\]\s*/, ''))}</p>
    </section>

    <section class="card lecciones reveal" aria-labelledby="h-lec">
      <div class="card-head"><div><h2 id="h-lec" class="mb-0">Lo que aprendimos del plan 2026</h2><p>Errores encontrados al consolidar las necesidades del año pasado.</p></div></div>
      <div class="cifras-grandes">${(c.errores2026 || []).map((e) => `<div class="cifra-grande"><strong>${esc(e.cifra)}</strong><span>${esc(e.texto)}</span></div>`).join('')}</div>
    </section>

    <div class="grid-2">
      <section class="card reveal" aria-labelledby="h-campos">
        <h2 id="h-campos">Lo que revisa Contratación</h2>
        <dl class="campos">${(c.camposClave || []).map((x) => `<div><dt>${esc(x.campo)}</dt><dd>${esc(x.regla)}</dd></div>`).join('')}</dl>
      </section>
      <section class="card reveal" aria-labelledby="h-reglas">
        <h2 id="h-reglas">Reglas de oro</h2>
        <ul class="check-lista">${(c.reglas || []).map((r) => `<li>${icono('check', 'icon-sm')}<span>${esc(r)}</span></li>`).join('')}</ul>
      </section>
    </div>

    <section class="card reveal" aria-labelledby="h-norma">
      <h2 id="h-norma">Normativa</h2>
      <div class="acordeon">${(c.normativa || []).map((n) => `<details><summary>${esc(n.norma)}${icono('abajo', 'icon-sm')}</summary><p class="mb-0">${esc(n.contenido)}</p></details>`).join('')}</div>
      <details class="mas-info"><summary>Tipos de necesidad y fuentes de recursos${icono('abajo', 'icon-sm')}</summary>
        <div class="grid-2" style="margin-top:12px">
          <div><h4>Tipos de necesidad</h4><div class="chips-sugeridos">${(c.tiposNecesidad || []).map((x) => `<span class="chip">${esc(x)}</span>`).join('')}</div></div>
          <div><h4>Fuentes de recursos</h4><div class="chips-sugeridos">${(c.fuentes || []).map((x) => `<span class="chip">${esc(x)}</span>`).join('')}</div></div>
        </div></details>
      <p class="field-hint mb-0" style="margin-top:12px">Fuente: ${esc(c.fuente || '')}</p>
    </section>
  </div>`;

  pintarCalculo();
  on(panel, 'change', '[name="modalidad"], [name="fecha"]', pintarCalculo);
  on(panel, 'input', '[name="fecha"]', pintarCalculo);
}

export const pestanaAdquisiciones = {
  id: 'adquisiciones',
  titulo: 'Plan de adquisiciones',
  tituloCorto: 'Plan de adquisiciones',
  tituloMovil: 'Adquisiciones',
  icono: 'adquisiciones',
  montar
};
