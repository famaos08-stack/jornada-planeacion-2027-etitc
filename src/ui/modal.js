/*
 * modal.js — Modal centrado y panel lateral deslizante con trampa de foco, cierre con Escape y retorno del foco.
 */
import { esc } from './dom.js';
import { icono } from './iconos.js';

const ENFOCABLES = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function abrir({ tipo, titulo, subtitulo = '', contenido = '', pie = '', alCerrar }) {
  const previo = document.activeElement;
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  const panel = document.createElement('div');
  const idTitulo = `dlg-${Date.now()}`;
  panel.className = tipo === 'drawer' ? 'drawer' : 'modal';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', idTitulo);
  const cab = tipo === 'drawer' ? 'drawer' : 'modal';
  panel.innerHTML = `
    <div class="${cab}-head">
      <div><h2 id="${idTitulo}">${esc(titulo)}</h2>${subtitulo ? `<p class="muted mb-0">${esc(subtitulo)}</p>` : ''}</div>
      <button type="button" class="btn btn-ghost btn-icon" data-cerrar aria-label="Cerrar">${icono('cerrar')}</button>
    </div>
    <div class="${cab}-body"></div>
    ${pie ? `<div class="${cab}-foot"></div>` : ''}`;
  const cuerpo = panel.querySelector(`.${cab}-body`);
  if (typeof contenido === 'string') cuerpo.innerHTML = contenido; else cuerpo.appendChild(contenido);
  if (pie) {
    const p = panel.querySelector(`.${cab}-foot`);
    if (typeof pie === 'string') p.innerHTML = pie; else p.appendChild(pie);
  }
  document.body.append(overlay, panel);
  document.body.style.overflow = 'hidden';

  const cerrar = () => {
    overlay.classList.remove('is-open');
    panel.classList.remove('is-open');
    document.removeEventListener('keydown', teclado, true);
    document.body.style.overflow = '';
    setTimeout(() => { overlay.remove(); panel.remove(); }, 380);
    if (previo && previo.focus) previo.focus();
    if (alCerrar) alCerrar();
  };
  const teclado = (ev) => {
    if (ev.key === 'Escape') { ev.preventDefault(); cerrar(); return; }
    if (ev.key !== 'Tab') return;
    const f = Array.from(panel.querySelectorAll(ENFOCABLES)).filter((n) => n.offsetParent !== null);
    if (!f.length) return;
    const primero = f[0];
    const ultimo = f[f.length - 1];
    if (ev.shiftKey && document.activeElement === primero) { ev.preventDefault(); ultimo.focus(); }
    else if (!ev.shiftKey && document.activeElement === ultimo) { ev.preventDefault(); primero.focus(); }
  };
  document.addEventListener('keydown', teclado, true);
  overlay.addEventListener('click', cerrar);
  panel.querySelectorAll('[data-cerrar]').forEach((b) => b.addEventListener('click', cerrar));
  requestAnimationFrame(() => requestAnimationFrame(() => {
    overlay.classList.add('is-open');
    panel.classList.add('is-open');
    const objetivo = panel.querySelector('[data-autofoco]') || panel.querySelector('[data-cerrar]');
    if (objetivo) objetivo.focus();
  }));
  return { panel, cuerpo, cerrar };
}

export function abrirModal(opciones) { return abrir({ ...opciones, tipo: 'modal' }); }
export function abrirPanel(opciones) { return abrir({ ...opciones, tipo: 'drawer' }); }

// Confirmación simple con promesa.
export function confirmar({ titulo, mensaje, aceptar = 'Aceptar', cancelar = 'Cancelar', peligro = false }) {
  return new Promise((resolver) => {
    let respondido = false;
    const pie = document.createElement('div');
    pie.className = 'btn-group';
    pie.innerHTML = `<button type="button" class="btn" data-r="no">${esc(cancelar)}</button>
      <button type="button" class="btn ${peligro ? 'btn-danger' : 'btn-primary'}" data-r="si" data-autofoco>${esc(aceptar)}</button>`;
    const m = abrirModal({ titulo, contenido: `<p>${esc(mensaje)}</p>`, pie, alCerrar: () => { if (!respondido) resolver(false); } });
    pie.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-r]');
      if (!b) return;
      respondido = true;
      resolver(b.dataset.r === 'si');
      m.cerrar();
    });
  });
}
