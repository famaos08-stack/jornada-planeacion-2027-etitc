/*
 * necesidades.js — Pestaña 3: Plan de necesidades.
 * Descarga de la plantilla «Plan de Necesidades 2027», cargue del plan formulado por el área, validación con las
 * reglas de la columna «Alerta de consistencia» y cruce con las acciones del Plan de acción ya registrado.
 * El registro deja la constancia (dependencia, responsable, correos y enlace) y avisa por correo.
 */
import { estado, area as areaPorId, dependencia, registroVigente } from '../estado.js';
import { esc } from '../ui/dom.js';
import { icono } from '../ui/iconos.js';
import { montarFlujo } from '../ui/cargue.js';
import { validarNecesidades } from '../lib/validar-necesidades.js';
import { entero, moneda, monedaCompacta } from '../lib/formato.js';
import { fechaCorta, horaLegible } from '../lib/fechas.js';

let flujo = null;

function montar(panel, ctx) {
  const cfgApp = estado.datos.config;
  flujo = montarFlujo(panel, ctx, {
    tipo: 'necesidades',
    icono: 'necesidades',
    eyebrow: 'Plan de necesidades 2027',
    titulo: 'Registre lo que su área necesita contratar',
    lead: 'Cada bien, obra o servicio se amarra a una acción de su Plan de acción y, por ella, a una meta del PDI. Con este plan el GIT de Contratación arma el <strong>Plan Anual de Adquisiciones</strong>.',
    plantillas: cfgApp.plantillas?.necesidades || [],
    nombreArchivo: 'el Plan de Necesidades 2027',
    nombreCorto: 'Plan de necesidades',
    nombreCarpeta: 'Plan de necesidades',
    tituloFinal: 'Constancia',
    textoRegistrar: 'Registrar Plan de necesidades',
    mensajeExito: '¡Plan de necesidades registrado!',
    ayuda: [
      'Una necesidad por fila y un objeto por necesidad, en la hoja <strong>Formulación PDN 2027</strong>.',
      'Elija la <strong>acción del Plan de acción 2027</strong> a la que sirve: si no existe, primero formúlela en la plantilla.',
      'Código <strong>UNSPSC de 8 dígitos</strong>, valores en pesos solo con números y el valor 2027 sin superar el total.',
      'El mes de ofertas no puede ser anterior al mes de inicio; si se paga en varias vigencias, marque vigencias futuras.',
      'Responsable con correo institucional sin tildes, y la columna <strong>Alerta de consistencia</strong> en OK.'
    ],
    avisoCargue(i) {
      const pa = registroVigente('accion', i.areaId);
      return pa
        ? `<div class="notice">${icono('enlace')}<div>Se cruzará con las <strong>${entero(pa.acciones?.length || 0)} acciones</strong> del Plan de acción que su área registró el ${esc(fechaCorta(pa.fecha.slice(0, 10)))}.</div></div>`
        : `<div class="notice">${icono('info')}<div><strong>Su área aún no registra el Plan de acción en este dispositivo.</strong> Puede cargar las necesidades; el cruce con sus acciones propias se hará cuando la OAP consolide.
          <div class="btn-group" style="margin-top:8px"><a class="btn btn-sm" href="#accion">Ir al Plan de acción</a></div></div></div>`;
    },
    validar(wb, ident) {
      const a = areaPorId(ident.areaId);
      const pa = registroVigente('accion', a.id);
      return validarNecesidades(wb, { areaId: a.id, areaEtiqueta: a.etiqueta, accionesFormuladas: pa?.acciones?.length ? pa.acciones : null });
    },
    cifras: (r) => [
      { etiqueta: 'Necesidades', valor: entero(r.necesidades || 0) },
      { etiqueta: 'En OK', valor: entero(r.ok || 0) },
      { etiqueta: 'Con errores', valor: entero(r.conErrores || 0), alerta: (r.conErrores || 0) > 0 },
      { etiqueta: 'Valor total', valor: monedaCompacta(r.valorTotal || 0) }
    ],
    estadoHero(i, registro) {
      if (!i) return '';
      const a = areaPorId(i.areaId);
      return registro
        ? `<div class="hero-chips"><span class="hero-chip is-ok">${icono('checkCirculo', 'icon-sm')}${esc(a?.nombre || '')}: registrado el ${esc(fechaCorta(registro.fecha.slice(0, 10)))}</span></div>`
        : `<div class="hero-chips"><span class="hero-chip is-pend">${icono('reloj', 'icon-sm')}${esc(a?.nombre || '')}: pendiente de registro</span></div>`;
    },
    pintarFinal(cont, { registro, ctx: c }) {
      const r = registro.resumen || {};
      const modalidades = Object.entries(r.porModalidad || {}).sort((x, y) => y[1] - x[1]);
      cont.innerHTML = `<article class="constancia reveal">
        <header class="constancia-head">
          <span class="constancia-sello">${icono('checkCirculo', 'icon-lg')}</span>
          <div><span class="eyebrow">Constancia de registro</span><h3 class="mb-0">Plan de necesidades 2027</h3></div>
        </header>
        <dl class="dl-mini">
          <div><dt>Registro</dt><dd class="mono">${esc(registro.id)}</dd></div>
          <div><dt>Fecha</dt><dd>${esc(fechaCorta(registro.fecha.slice(0, 10)))}, ${esc(horaLegible(new Date(registro.fecha)))}</dd></div>
          <div><dt>Área</dt><dd>${esc(registro.area.id)} · ${esc(registro.area.nombre)}</dd></div>
          <div><dt>Dependencia</dt><dd>${esc(registro.dependencia.codigo)} · ${esc(registro.dependencia.nombre || dependencia(registro.dependencia.codigo)?.nombre || '')}</dd></div>
          <div><dt>Responsable</dt><dd>${esc(registro.responsable.nombre)} · ${esc(registro.responsable.correo)}</dd></div>
          ${registro.correosEquipo?.length ? `<div><dt>Equipo</dt><dd>${esc(registro.correosEquipo.join(', '))}</dd></div>` : ''}
          <div><dt>Archivo</dt><dd>${registro.enlace ? `<a href="${esc(registro.enlace)}" target="_blank" rel="noopener">${esc(registro.archivo)}</a>` : esc(registro.archivo)}</dd></div>
        </dl>
        <div class="cifras-mini">
          <div class="cifra-mini"><strong>${entero(r.ok || 0)}</strong><span>Necesidades</span></div>
          <div class="cifra-mini"><strong>${monedaCompacta(r.valorTotal || 0)}</strong><span>Valor total</span></div>
          <div class="cifra-mini"><strong>${monedaCompacta(r.valor2027 || 0)}</strong><span>Valor 2027</span></div>
          <div class="cifra-mini"><strong>${entero(r.vigenciasFuturas || 0)}</strong><span>Vigencias futuras</span></div>
        </div>
        ${modalidades.length ? `<div><span class="field-hint">Valor por modalidad estimada</span><ul class="modalidades-mini">${modalidades.map(([k, v]) => `<li><span>${esc(k)}</span><strong>${esc(monedaCompacta(v))}</strong></li>`).join('')}</ul></div>` : ''}
        ${registro.advertencias ? `<p class="field-hint mb-0">${icono('alerta', 'icon-sm')} ${entero(registro.advertencias)} advertencias quedaron registradas para revisión con la OAP. Valor total exacto: ${esc(moneda(r.valorTotal || 0))}.</p>` : ''}
      </article>
      <div class="card card-tight siguiente">
        <span class="siguiente-ico">${icono('adquisiciones')}</span>
        <div><strong>Siguiente: Plan de adquisiciones</strong><p class="mb-0 muted">Tiempos y temas contractuales que explicará el GIT de Contratación.</p></div>
        <button type="button" class="btn btn-primary btn-sm" data-ir-pestana>Ir ${icono('flecha', 'icon-sm')}</button>
      </div>`;
      cont.querySelector('[data-ir-pestana]').addEventListener('click', () => c.ir('adquisiciones'));
    }
  });
}

export const pestanaNecesidades = {
  id: 'necesidades',
  titulo: 'Plan de necesidades',
  tituloCorto: 'Plan de necesidades',
  tituloMovil: 'Necesidades',
  icono: 'necesidades',
  montar,
  alMostrar() { flujo?.alMostrar(); }
};
