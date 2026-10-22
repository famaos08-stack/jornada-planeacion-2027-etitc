/*
 * accion.js — Pestaña 2: Plan de acción.
 * Descarga del Plan de acción 2027 (consulta) y de la Plantilla de Formulación 2027 (para diligenciar),
 * cargue de la plantilla formulada por el área, validación con las mismas reglas de la «Alerta de consistencia»
 * y registro automático. El registro emite el pase QR: es el que permite entrar a la jornada.
 */
import { estado, area as areaPorId } from '../estado.js';
import { esc, on } from '../ui/dom.js';
import { abrirModal } from '../ui/modal.js';
import { icono } from '../ui/iconos.js';
import { montarFlujo } from '../ui/cargue.js';
import { montarPase } from '../ui/pase.js';
import { validarFormulacion } from '../lib/validar-accion.js';
import { entero, iniciales } from '../lib/formato.js';
import { fechaCorta } from '../lib/fechas.js';

let flujo = null;

function equipoHtml(registro) {
  const pases = (registro.pasesEquipo || []).map((id) => estado.consolidado.pases.find((p) => p.id === id)).filter(Boolean);
  if (!pases.length) return '';
  return `<div class="card card-tight"><h3>Pases del equipo</h3>
    <ul class="equipo-lista">${pases.map((p) => `<li><span class="avatar avatar-xs" aria-hidden="true">${esc(iniciales(p.n))}</span>
      <span class="equipo-info"><strong>${esc(p.n)}</strong><span class="mono">${esc(p.id)}</span></span>
      <button type="button" class="btn btn-sm" data-ver-pase="${esc(p.id)}">${icono('qr', 'icon-sm')}Ver</button></li>`).join('')}</ul></div>`;
}

function montar(panel, ctx) {
  const cfgApp = estado.datos.config;
  flujo = montarFlujo(panel, ctx, {
    tipo: 'accion',
    icono: 'formulacion',
    eyebrow: 'Plan de acción 2027',
    titulo: 'Formule su Plan de acción y obtenga su pase',
    lead: 'Descargue los archivos, diligencie la plantilla de su área y cárguela. Si queda bien formulada, recibe el <strong>código QR que le da entrada a la jornada</strong>.',
    plantillas: cfgApp.plantillas?.accion || [],
    nombreArchivo: 'la Plantilla de Formulación 2027',
    nombreCorto: 'Plan de acción',
    nombreCarpeta: 'Plan de acción',
    tituloFinal: 'Su pase',
    textoRegistrar: 'Registrar y obtener mi pase',
    mensajeExito: '¡Plan de acción registrado!',
    ayuda: [
      'En la hoja <strong>Buscador</strong> elija su área: verá las metas que le corresponden y sus compromisos 2026.',
      'Formule en las <strong>columnas amarillas</strong> de cada eje: acción, producto, fechas de 2027, responsable y dimensión del MIPG.',
      `${cfgApp.reglasPase?.exigirTodasLasMetas === false ? 'Formule al menos una acción completa' : 'Formule <strong>todas las metas asignadas</strong> a su área'} y verifique que la columna <strong>Alerta de consistencia</strong> diga OK.`,
      'Decida qué pasa con cada compromiso 2026 (se retoma, se ajusta o se cierra).',
      'Guarde el archivo en Excel (.xlsx) sin cambiar el nombre de las hojas.'
    ],
    validar(wb, ident) {
      const a = areaPorId(ident.areaId);
      return validarFormulacion(wb, { areaId: a.id, areaEtiqueta: a.etiqueta, anio: cfgApp.evento?.vigencia || 2027, exigirTodasLasMetas: cfgApp.reglasPase?.exigirTodasLasMetas !== false });
    },
    cifras: (r) => [
      { etiqueta: 'Metas asignadas', valor: entero(r.metasAsignadas || 0) },
      { etiqueta: 'Metas formuladas', valor: entero(r.metasFormuladas || 0), alerta: (r.metasFormuladas || 0) < (r.metasAsignadas || 0) },
      { etiqueta: 'Acciones en OK', valor: entero(r.accionesOk || 0) },
      { etiqueta: 'Con errores', valor: entero(r.accionesConErrores || 0), alerta: (r.accionesConErrores || 0) > 0 }
    ],
    estadoHero(i, registro) {
      if (!i) return `<div class="hero-chips"><span class="hero-chip">${icono('qr', 'icon-sm')}Sin plan registrado no hay pase</span></div>`;
      const a = areaPorId(i.areaId);
      return registro
        ? `<div class="hero-chips"><span class="hero-chip is-ok">${icono('checkCirculo', 'icon-sm')}${esc(a?.nombre || '')}: registrado el ${esc(fechaCorta(registro.fecha.slice(0, 10)))}</span>${registro.codigoPase ? `<span class="hero-chip mono">${esc(registro.codigoPase)}</span>` : ''}</div>`
        : `<div class="hero-chips"><span class="hero-chip is-pend">${icono('reloj', 'icon-sm')}${esc(a?.nombre || '')}: pendiente de registro</span></div>`;
    },
    async pintarFinal(cont, { registro, pase, ctx: c }) {
      if (!pase) {
        cont.innerHTML = `<div class="notice">${icono('info')}<div>El Plan de acción de su área quedó registrado (${esc(registro.id)}), pero este dispositivo no tiene el pase. Cargue de nuevo el archivo para emitirlo aquí, o busque el correo con su pase.</div></div>`;
        return;
      }
      await montarPase(cont, pase, {
        extra: `<div class="card card-tight siguiente">
          <span class="siguiente-ico">${icono('necesidades')}</span>
          <div><strong>Siguiente: Plan de necesidades</strong><p class="mb-0 muted">Registre los bienes y servicios que requieren sus acciones.</p></div>
          <button type="button" class="btn btn-primary btn-sm" data-ir-pestana="necesidades">Ir ${icono('flecha', 'icon-sm')}</button>
        </div>
        ${equipoHtml(registro)}
        <ul class="check-lista">
          <li>${icono('check', 'icon-sm')}<span>Presente el QR en el celular o impreso al ingresar a la jornada.</span></li>
          <li>${icono('check', 'icon-sm')}<span>El QR es personal e intransferible: cada integrante del equipo recibe el suyo.</span></li>
          ${registro.enlace ? `<li>${icono('enlace', 'icon-sm')}<span>Archivo: <a href="${esc(registro.enlace)}" target="_blank" rel="noopener">${esc(registro.archivo)}</a></span></li>` : ''}
        </ul>`
      });
      cont.querySelector('[data-ir-pestana]')?.addEventListener('click', () => c.ir('necesidades'));
      on(cont, 'click', '[data-ver-pase]', async (ev, b) => {
        const p = estado.consolidado.pases.find((x) => x.id === b.dataset.verPase);
        if (!p) return;
        const m = abrirModal({ titulo: `Pase de ${p.n}`, subtitulo: p.e, contenido: '<div data-modal-pase></div>' });
        await montarPase(m.cuerpo.querySelector('[data-modal-pase]'), p);
      });
    }
  });
}

export const pestanaAccion = {
  id: 'accion',
  titulo: 'Plan de acción',
  tituloCorto: 'Plan de acción',
  tituloMovil: 'Acción',
  icono: 'formulacion',
  montar,
  alMostrar() { flujo?.alMostrar(); }
};
