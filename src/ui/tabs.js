/*
 * tabs.js — Pestañas accesibles (patrón WAI-ARIA Tabs): roles, foco itinerante,
 * flechas izquierda/derecha, Inicio/Fin y activación con Enter o Espacio.
 */
import { esc } from './dom.js';
import { icono } from './iconos.js';

// definiciones: [{ id, titulo, tituloCorto, icono }]
export function crearPestanas(contenedor, definiciones, alSeleccionar) {
  contenedor.setAttribute('role', 'tablist');
  contenedor.setAttribute('aria-label', 'Secciones de la jornada');
  contenedor.innerHTML = definiciones.map((d) => `
    <button type="button" class="tab" role="tab" id="tab-${esc(d.id)}" aria-controls="panel-${esc(d.id)}" aria-selected="false" tabindex="-1" data-tab="${esc(d.id)}">
      ${icono(d.icono, 'icon-sm')}<span class="tab-label">${esc(d.tituloCorto || d.titulo)}</span>
    </button>`).join('');

  const botones = () => Array.from(contenedor.querySelectorAll('[role="tab"]'));

  contenedor.addEventListener('click', (ev) => {
    const b = ev.target.closest('[role="tab"]');
    if (b) alSeleccionar(b.dataset.tab, { foco: false });
  });
  contenedor.addEventListener('keydown', (ev) => {
    const lista = botones();
    const i = lista.indexOf(document.activeElement);
    if (i < 0) return;
    let j = null;
    if (ev.key === 'ArrowRight') j = (i + 1) % lista.length;
    else if (ev.key === 'ArrowLeft') j = (i - 1 + lista.length) % lista.length;
    else if (ev.key === 'Home') j = 0;
    else if (ev.key === 'End') j = lista.length - 1;
    if (j === null) return;
    ev.preventDefault();
    lista[j].focus();
    // Activación automática al mover con flechas (las pestañas cargan rápido)
    alSeleccionar(lista[j].dataset.tab, { foco: false });
  });

  return {
    marcar(id) {
      botones().forEach((b) => {
        const activo = b.dataset.tab === id;
        b.setAttribute('aria-selected', activo ? 'true' : 'false');
        b.tabIndex = activo ? 0 : -1;
        if (activo) b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      });
      // Sin pestaña activa (vista escáner): la primera sigue siendo alcanzable con Tab
      if (!botones().some((b) => b.dataset.tab === id) && botones()[0]) botones()[0].tabIndex = 0;
    },
    insignia(id, texto) {
      const b = contenedor.querySelector(`[data-tab="${id}"]`);
      if (!b) return;
      let s = b.querySelector('.tab-badge');
      if (!texto) { if (s) s.remove(); return; }
      if (!s) { s = document.createElement('span'); s.className = 'tab-badge'; b.appendChild(s); }
      s.textContent = texto;
    }
  };
}
