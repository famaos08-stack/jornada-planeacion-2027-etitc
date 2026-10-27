/*
 * pase.js — Tarjeta del pase de acceso (tipo pase de abordar) y sus acciones:
 * descargar PNG o PDF, compartir desde el celular (Web Share) y copiar el código.
 * La usan la pestaña Plan de acción (al registrar) y cualquier vista que deba volver a mostrar el pase.
 */
import { estado, area as areaPorId, dependencia } from '../estado.js';
import { esc, on } from './dom.js';
import { icono } from './iconos.js';
import { toast, toastError } from './toast.js';
import { contenidoQR, qrComoDataUrl, qrDisponible } from '../lib/qr.js';
import { obtenerLogo, elementoAPng, elementoAPdf, capturarElemento, capturaDisponible, pdfDisponible, copiarTexto } from '../lib/export.js';
import { rangoFechasTexto, fechaCorta } from '../lib/fechas.js';

function datosEvento() {
  const agenda = estado.datos?.agenda || {};
  return {
    nombre: estado.datos?.config?.evento?.nombreCorto || 'Jornada de Planeación 2027',
    fechas: rangoFechasTexto((agenda.dias || []).map((d) => d.fecha)),
    sede: agenda.sede && agenda.sede !== 'Por confirmar' ? agenda.sede : ''
  };
}

// HTML de la tarjeta. El QR se pinta después con pintarQR (es asíncrono).
export function htmlPase(pase, logoDataUrl) {
  const a = pase.a ? areaPorId(pase.a) : null;
  const d = dependencia(pase.d);
  const ev = datosEvento();
  return `<article class="pase" data-pase aria-label="Pase de acceso de ${esc(pase.n)}">
    <div class="pase-head">
      <span class="pase-logo"><img src="${esc(logoDataUrl || 'assets/logo-etitc.png')}" alt="Logo de la Escuela Tecnológica Instituto Técnico Central"></span>
      <span class="pase-kicker">Pase de acceso</span>
      <span class="pase-evento">${esc(ev.nombre)}</span>
    </div>
    <div class="pase-persona">
      <strong class="pase-nombre">${esc(pase.n)}</strong>
      <span class="pase-cargo">${esc(pase.c)}</span>
    </div>
    <div class="pase-dep">
      <span class="pase-dep-cod">${esc(a ? a.id : 'ETITC')}</span>
      <span>${esc(a ? a.nombre : (d?.nombre || ''))}<small>${esc(a ? a.proceso : (d?.nombre || ''))}</small></span>
    </div>
    <div class="pase-qr" data-qr><span class="spinner" aria-hidden="true"></span></div>
    <div class="pase-id mono">${esc(pase.id)}</div>
    <div class="pase-corte" aria-hidden="true"></div>
    <div class="pase-meta">
      <span><b>${esc(ev.fechas)}</b></span>
      ${ev.sede ? `<span>${esc(ev.sede)}</span>` : ''}
      <span>Emitido el ${esc(fechaCorta(String(pase.emitido || new Date(pase.ts).toISOString()).slice(0, 10)))} · personal e intransferible</span>
    </div>
  </article>`;
}

export async function pintarQR(raiz, pase) {
  const caja = raiz.querySelector('[data-qr]');
  if (!caja) return;
  const intentar = async () => {
    const url = await qrComoDataUrl(contenidoQR(pase), { tamano: 400 });
    caja.innerHTML = `<img src="${url}" alt="Código QR del pase ${esc(pase.id)}" width="200" height="200">`;
  };
  try {
    if (!qrDisponible()) {
      // La librería puede estar terminando de cargar
      await new Promise((r) => setTimeout(r, 1200));
      if (!qrDisponible()) throw new Error('sin librería');
    }
    await intentar();
  } catch {
    caja.innerHTML = `<div class="pase-qr-fallback">${icono('qr', 'icon-lg')}<span>QR no disponible en este momento. En el ingreso pueden registrarle con el código de abajo.</span></div>`;
  }
}

// Monta el pase y sus botones dentro de «cont». Devuelve una promesa que termina cuando el QR está pintado.
export async function montarPase(cont, pase, { extra = '' } = {}) {
  const logo = await obtenerLogo().catch(() => ({ dataUrl: null }));
  const puedeCompartir = Boolean(navigator.share && navigator.canShare);
  cont.innerHTML = `<div class="pase-layout">
    <div class="pase-wrap">${htmlPase(pase, logo.dataUrl)}</div>
    <div class="pase-acciones">
      <div class="btn-grid">
        <button type="button" class="btn btn-primary btn-lg" data-pase-accion="png" ${capturaDisponible() ? '' : 'disabled'}>${icono('imagen', 'icon-sm')}Guardar imagen</button>
        <button type="button" class="btn btn-lg" data-pase-accion="pdf" ${capturaDisponible() && pdfDisponible() ? '' : 'disabled'}>${icono('pdf', 'icon-sm')}PDF</button>
        ${puedeCompartir ? `<button type="button" class="btn btn-lg" data-pase-accion="compartir">${icono('enlace', 'icon-sm')}Compartir</button>` : ''}
        <button type="button" class="btn btn-lg" data-pase-accion="copiar">${icono('copiar', 'icon-sm')}Copiar código</button>
      </div>
      ${capturaDisponible() ? '' : '<p class="field-hint">La descarga como imagen no está disponible porque una librería no cargó. Tome una captura de pantalla del pase.</p>'}
      ${extra}
    </div>
  </div>`;
  await pintarQR(cont, pase);
  on(cont, 'click', '[data-pase-accion]', async (ev, b) => {
    const accion = b.dataset.paseAccion;
    const tarjeta = cont.querySelector('[data-pase]');
    try {
      b.disabled = true;
      if (accion === 'png') { await elementoAPng(tarjeta, `Pase_${pase.id}.png`); toast({ tipo: 'ok', titulo: 'Imagen guardada', mensaje: `Pase_${pase.id}.png` }); }
      if (accion === 'pdf') { await elementoAPdf(tarjeta, `Pase_${pase.id}.pdf`); toast({ tipo: 'ok', titulo: 'PDF descargado', mensaje: `Pase_${pase.id}.pdf` }); }
      if (accion === 'compartir') {
        const canvas = await capturarElemento(tarjeta, 2.5);
        const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
        const archivo = new File([blob], `Pase_${pase.id}.png`, { type: 'image/png' });
        const datos = { title: 'Pase de acceso — Jornada de Planeación 2027', text: `Mi pase ${pase.id}` };
        if (navigator.canShare({ files: [archivo] })) datos.files = [archivo];
        try { await navigator.share(datos); } catch (e) { if (e.name !== 'AbortError') throw e; }
      }
      if (accion === 'copiar') {
        const ok = await copiarTexto(pase.id);
        toast(ok ? { tipo: 'ok', titulo: 'Código copiado', mensaje: pase.id } : { tipo: 'warn', titulo: 'No se pudo copiar', mensaje: 'Su navegador bloqueó el portapapeles.' });
      }
    } catch (e) { toastError('No se pudo completar la acción', e, e.message); } finally { b.disabled = false; }
  });
}
