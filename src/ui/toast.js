/*
 * toast.js — Avisos flotantes accesibles (aria-live). Todo error de la aplicación termina aquí, nunca en pantalla blanca.
 */
import { esc } from './dom.js';
import { icono } from './iconos.js';

let region = null;

function asegurarRegion() {
  if (region && document.body.contains(region)) return region;
  region = document.createElement('div');
  region.className = 'toast-region';
  region.setAttribute('role', 'status');
  region.setAttribute('aria-live', 'polite');
  document.body.appendChild(region);
  return region;
}

const ICONOS = { ok: 'checkCirculo', info: 'info', warn: 'alerta', error: 'bloqueo' };

// toast({ tipo: 'ok'|'info'|'warn'|'error', titulo, mensaje, duracion })
export function toast({ tipo = 'info', titulo = '', mensaje = '', duracion } = {}) {
  try {
    const r = asegurarRegion();
    const el = document.createElement('div');
    el.className = `toast toast-${tipo}`;
    if (tipo === 'error') el.setAttribute('role', 'alert');
    el.innerHTML = `${icono(ICONOS[tipo] || 'info')}
      <div>${titulo ? `<div class="toast-title">${esc(titulo)}</div>` : ''}<div class="toast-msg">${esc(mensaje)}</div></div>
      <button class="btn btn-ghost btn-icon btn-sm" type="button" aria-label="Cerrar aviso">${icono('cerrar', 'icon-sm')}</button>`;
    const cerrar = () => {
      if (!el.isConnected) return;
      el.classList.add('is-leaving');
      setTimeout(() => el.remove(), 260);
    };
    el.querySelector('button').addEventListener('click', cerrar);
    r.appendChild(el);
    // Máximo cuatro avisos simultáneos
    while (r.children.length > 4) r.firstElementChild.remove();
    const ms = duracion ?? (tipo === 'error' ? 9000 : tipo === 'warn' ? 7000 : 4200);
    if (ms > 0) setTimeout(cerrar, ms);
    return cerrar;
  } catch (e) {
    console.error('No se pudo mostrar el aviso', e, titulo, mensaje);
    return () => {};
  }
}

// Atajo para errores inesperados: mensaje claro al usuario y detalle técnico solo en consola.
export function toastError(titulo, error, mensaje = 'Intente de nuevo. Si el problema continúa, recargue la página.') {
  console.error(titulo, error);
  return toast({ tipo: 'error', titulo, mensaje });
}
