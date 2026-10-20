/*
 * dom.js — Utilidades mínimas de DOM: escape de HTML, selección, creación desde plantilla y delegación de eventos.
 */

const MAPA_ESCAPE = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

// Escapa texto para insertarlo de forma segura en plantillas HTML.
export function esc(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor).replace(/[&<>"']/g, (c) => MAPA_ESCAPE[c]);
}

export function qs(selector, raiz = document) { return raiz.querySelector(selector); }
export function qsa(selector, raiz = document) { return Array.from(raiz.querySelectorAll(selector)); }

// Crea un elemento a partir de una cadena HTML (devuelve el primer nodo).
export function crear(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

// Delegación de eventos: on(raiz, 'click', '[data-accion]', fn)
export function on(raiz, tipo, selector, fn) {
  raiz.addEventListener(tipo, (ev) => {
    const objetivo = ev.target.closest(selector);
    if (objetivo && raiz.contains(objetivo)) fn(ev, objetivo);
  });
}

// Identificador único corto para enlazar etiquetas y controles ARIA.
let contador = 0;
export function uid(prefijo = 'id') { contador += 1; return `${prefijo}-${contador}`; }

// Espera un cuadro de animación (útil para disparar transiciones CSS).
export function siguienteCuadro() { return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); }

export function prefiereMenosMovimiento() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
