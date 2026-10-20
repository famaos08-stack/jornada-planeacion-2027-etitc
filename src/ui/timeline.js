/*
 * timeline.js — Líneas de tiempo: horizontal (hitos y etapas de contratación).
 * La línea vertical de la agenda vive en tabs/agenda.js porque su comportamiento es propio de esa pestaña.
 */
import { esc } from './dom.js';
import { icono } from './iconos.js';

// items: [{ titulo, subtitulo, cuerpo, pie, iconoNombre, estado: 'ok'|'danger'|'' , marca }]
export function timelineHorizontal(items, { etiqueta = 'Línea de tiempo', clase = '' } = {}) {
  return `<div class="htl ${clase}" role="list" aria-label="${esc(etiqueta)}">
    ${items.map((it, i) => `
      <div class="htl-item reveal ${it.estado ? `is-${it.estado}` : ''}" role="listitem">
        <div class="htl-marker">
          <span class="htl-dot">${it.iconoNombre ? icono(it.iconoNombre, 'icon-sm') : `<span class="num">${i + 1}</span>`}</span>
        </div>
        <div class="htl-card">
          ${it.marca ? `<span class="htl-mark">${it.marca}</span>` : ''}
          <h4>${esc(it.titulo)}</h4>
          ${it.subtitulo ? `<div class="htl-sub">${it.subtitulo}</div>` : ''}
          ${it.cuerpo ? `<div class="htl-body">${it.cuerpo}</div>` : ''}
          ${it.pie ? `<div class="htl-foot">${it.pie}</div>` : ''}
        </div>
      </div>`).join('')}
  </div>`;
}
