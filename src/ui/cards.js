/*
 * cards.js — Estados vacíos, cadena lógica, aparición de tarjetas, números que se animan y barras horizontales.
 */
import { esc, prefiereMenosMovimiento } from './dom.js';
import { icono } from './iconos.js';
import { formatear } from '../lib/formato.js';

// Estado vacío diseñado: nunca una tabla en blanco.
export function estadoVacio({ titulo, texto, iconoNombre = 'capas', accion = '' }) {
  return `<div class="empty reveal">
    <div class="empty-art">${icono(iconoNombre)}</div>
    <h3>${esc(titulo)}</h3>
    <p>${texto}</p>
    ${accion ? `<div class="btn-group" style="margin-top:8px">${accion}</div>` : ''}
  </div>`;
}

// La cadena lógica que gobierna la aplicación, visible donde importa.
export function cadenaLogica({ activo = '', incluirRiesgos = false } = {}) {
  const nodos = [
    ['metas', 'Metas 2027'],
    ['accion', 'Plan de acción'],
    ['necesidades', 'Plan de necesidades'],
    ['adquisiciones', 'Plan de adquisiciones']
  ];
  if (incluirRiesgos) nodos.push(['riesgos', 'Mapa de riesgos']);
  const flecha = `<span class="chain-arrow" aria-hidden="true">${icono('flecha', 'icon-sm')}</span>`;
  return `<ol class="chain" aria-label="Cadena lógica de la planeación" style="list-style:none;margin:0;padding:0">
    ${nodos.map(([k, t], i) => `${i ? `<li aria-hidden="true" style="display:contents">${flecha}</li>` : ''}<li class="chain-node${activo === k ? ' is-active' : ''}${k === 'riesgos' ? ' is-optional' : ''}"${activo === k ? ' aria-current="step"' : ''}><span class="chain-num">${i + 1}</span>${esc(t)}</li>`).join('')}
  </ol>`;
}

// Anima un número desde su valor actual hasta el destino.
export function animarNumero(el, destino, duracion = 900) {
  const formato = el.dataset.formato || 'entero';
  const desde = Number(el.dataset.actual || 0);
  const hasta = Number(destino) || 0;
  el.dataset.contar = String(hasta);
  if (prefiereMenosMovimiento() || desde === hasta) {
    el.textContent = formatear(hasta, formato);
    el.dataset.actual = String(hasta);
    return;
  }
  const t0 = performance.now();
  const paso = (t) => {
    const p = Math.min(1, (t - t0) / duracion);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = formatear(desde + (hasta - desde) * e, formato);
    if (p < 1) requestAnimationFrame(paso);
    else el.dataset.actual = String(hasta);
  };
  requestAnimationFrame(paso);
}

let observador = null;
function obtenerObservador() {
  if (observador || !('IntersectionObserver' in window)) return observador;
  observador = new IntersectionObserver((entradas) => {
    entradas.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target;
      observador.unobserve(el);
      if (el.classList.contains('reveal')) el.classList.add('is-visible');
      if (el.dataset.contar !== undefined) animarNumero(el, el.dataset.contar);
    });
  }, { threshold: 0.15 });
  return observador;
}

// Activa la aparición de tarjetas y los números animados dentro de una raíz.
export function activarAnimaciones(raiz) {
  const obs = obtenerObservador();
  const elementos = raiz.querySelectorAll('.reveal:not(.is-visible), [data-contar]');
  elementos.forEach((el, i) => {
    if (!obs) {
      el.classList.add('is-visible');
      if (el.dataset.contar !== undefined) animarNumero(el, el.dataset.contar, 0);
      return;
    }
    if (el.classList.contains('reveal')) el.style.transitionDelay = `${Math.min(i, 8) * 40}ms`;
    obs.observe(el);
  });
}

// Barras horizontales HTML (desgloses por dependencia), coloreadas por tipo de proceso.
export function barrasHorizontales(items, { formato = 'entero' } = {}) {
  const max = Math.max(1, ...items.map((i) => i.valor));
  return `<div class="hbars">${items.map((i) => `
    <div class="hbar ${i.clase || ''}">
      <span class="hbar-label">${i.proc ? '<span class="proc-dot"></span>' : ''}<span title="${esc(i.etiqueta)}">${esc(i.etiqueta)}</span></span>
      <span class="hbar-value">${formatear(i.valor, formato)}</span>
      <span class="hbar-track" aria-hidden="true"><span style="width:${Math.max(2, (i.valor / max) * 100)}%"></span></span>
    </div>`).join('')}</div>`;
}
