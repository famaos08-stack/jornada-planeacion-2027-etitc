/*
 * riesgos.js — Pestaña 6 (opcional): Mapa de riesgos.
 * Se activa solo con FEATURES.mapaRiesgos = true en src/config.js; con false no aparece en la navegación ni en conteos.
 * Matriz de probabilidad por impacto 5x5, inventario de riesgos por proceso del mapa institucional, controles y responsables.
 */
import { estado, dependencia } from '../estado.js';
import { esc, on } from '../ui/dom.js';
import { icono } from '../ui/iconos.js';
import { estadoVacio, cadenaLogica, activarAnimaciones } from '../ui/cards.js';
import { TIPOS_PROCESO_PLURAL } from '../config.js';

let raiz = null;
const filtro = { celda: null, proceso: '' };

function zona(p, i) {
  const v = p * i;
  if (v >= 15) return { id: 'extrema', nombre: 'Extrema' };
  if (v >= 10) return { id: 'alta', nombre: 'Alta' };
  if (v >= 5) return { id: 'moderada', nombre: 'Moderada' };
  return { id: 'baja', nombre: 'Baja' };
}

function pintar() {
  const datos = estado.datos.riesgos || {};
  const riesgos = datos.riesgos || [];
  const procesos = datos.procesos || [];
  const escP = datos.escalas?.probabilidad || ['1', '2', '3', '4', '5'];
  const escI = datos.escalas?.impacto || ['1', '2', '3', '4', '5'];
  const proc = (id) => procesos.find((p) => p.id === id);
  const cont = raiz.querySelector('[data-riesgos]');
  if (!riesgos.length) { cont.innerHTML = estadoVacio({ titulo: 'Sin riesgos registrados', texto: 'Cargue el inventario en data/riesgos.json.', iconoNombre: 'riesgos' }); return; }

  const visibles = riesgos.filter((r) => (!filtro.proceso || r.proceso === filtro.proceso)
    && (!filtro.celda || (r.probabilidad === filtro.celda[0] && r.impacto === filtro.celda[1])));
  const base = riesgos.filter((r) => !filtro.proceso || r.proceso === filtro.proceso);

  let matriz = '<div class="matriz" role="grid" aria-label="Matriz de probabilidad por impacto">';
  matriz += '<div class="matriz-eje-y" aria-hidden="true">Probabilidad</div>';
  for (let p = 5; p >= 1; p -= 1) {
    matriz += `<div class="matriz-fila" role="row"><span class="matriz-et" role="rowheader">${p} · ${esc(escP[p - 1])}</span>`;
    for (let i = 1; i <= 5; i += 1) {
      const n = base.filter((r) => r.probabilidad === p && r.impacto === i).length;
      const z = zona(p, i);
      const sel = filtro.celda && filtro.celda[0] === p && filtro.celda[1] === i;
      matriz += `<button type="button" role="gridcell" class="celda zona-${z.id} ${sel ? 'is-sel' : ''} ${n ? '' : 'is-vacia'}" data-celda="${p},${i}" aria-pressed="${sel}" aria-label="Probabilidad ${p}, impacto ${i}: ${n} riesgos, zona ${z.nombre}">${n || ''}</button>`;
    }
    matriz += '</div>';
  }
  matriz += `<div class="matriz-fila matriz-pie" aria-hidden="true"><span></span>${escI.map((t, k) => `<span>${k + 1} · ${esc(t)}</span>`).join('')}</div><div class="matriz-eje-x" aria-hidden="true">Impacto</div></div>`;

  const grupos = ['estrategico', 'misional', 'apoyo', 'evaluacion'].map((tp) => ({
    tp, procesos: procesos.filter((p) => p.tipoProceso === tp).map((p) => ({ ...p, riesgos: visibles.filter((r) => r.proceso === p.id) })).filter((p) => p.riesgos.length)
  })).filter((g) => g.procesos.length);

  cont.innerHTML = `<div class="grid-2 riesgos-grid">
    <div class="card reveal">
      <div class="card-head"><div><h2>Matriz 5 × 5</h2><p>Haga clic en una celda para filtrar el inventario.</p></div>${filtro.celda ? '<button type="button" class="btn btn-sm" data-limpiar>Quitar filtro</button>' : ''}</div>
      ${matriz}
      <div class="legend">${[['baja', 'Baja'], ['moderada', 'Moderada'], ['alta', 'Alta'], ['extrema', 'Extrema']].map(([k, t]) => `<span><span class="celda-mini zona-${k}"></span>${t}</span>`).join('')}</div>
    </div>
    <div class="card reveal">
      <div class="card-head"><div><h2>Inventario por proceso</h2><p>${visibles.length} de ${riesgos.length} riesgos${filtro.celda ? ` · probabilidad ${filtro.celda[0]}, impacto ${filtro.celda[1]}` : ''}</p></div>
        <select class="select" data-proceso aria-label="Filtrar por proceso" style="max-width:240px"><option value="">Todos los procesos</option>${procesos.map((p) => `<option value="${esc(p.id)}" ${filtro.proceso === p.id ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('')}</select></div>
      <div class="riesgos-lista">
        ${grupos.length ? grupos.map((g) => `<div class="grupo-proc"><span class="grupo-proc-tit proc-${g.tp}"><span class="proc-dot"></span>${esc(TIPOS_PROCESO_PLURAL[g.tp])}</span>
          ${g.procesos.map((p) => p.riesgos.map((r) => {
            const z = zona(r.probabilidad, r.impacto);
            return `<article class="riesgo">
              <div class="row-between"><span class="badge zona-badge zona-${z.id}">${z.nombre} · ${r.probabilidad * r.impacto}</span><span class="muted mono">${esc(r.id)} · ${esc(p.nombre)}</span></div>
              <h4>${esc(r.descripcion)}</h4>
              <dl class="dl"><dt>Causa</dt><dd>${esc(r.causa)}</dd><dt>Consecuencia</dt><dd>${esc(r.consecuencia)}</dd><dt>Responsable</dt><dd>${esc(r.responsable)}</dd>
              <dt>Dependencias</dt><dd>${(p.dependencias || []).map((c) => esc(dependencia(c)?.sigla || c)).join(', ')}</dd></dl>
              <ul class="controles">${(r.controles || []).map((c) => `<li>${icono('riesgos', 'icon-sm')}<span><strong>${esc(c.tipo)}:</strong> ${esc(c.descripcion)} <span class="muted">· ${esc(c.responsable)}</span></span></li>`).join('')}</ul>
            </article>`;
          }).join('')).join('')}</div>`).join('') : '<p class="muted">No hay riesgos con ese filtro.</p>'}
      </div>
    </div>
  </div>`;
  activarAnimaciones(cont);
}

function montar(panel) {
  raiz = panel;
  panel.innerHTML = `<div class="container page">
    <header class="page-head reveal">
      <div><span class="eyebrow">${icono('riesgos', 'icon-sm')}Mapa de riesgos · etapa opcional</span>
      <h1>Riesgos que pueden afectar el plan 2027</h1>
      <p class="lead">Matriz de probabilidad por impacto e inventario por proceso del mapa institucional.</p></div>
      ${cadenaLogica({ activo: 'riesgos', incluirRiesgos: true })}
    </header>
    ${estado.datos.riesgos?.provisional ? `<div class="prov-banner reveal">${icono('info', 'icon-sm')}<span><strong>Datos provisionales.</strong> ${esc(estado.datos.riesgos.aviso || '')}</span></div>` : ''}
    <div data-riesgos></div>
  </div>`;
  on(panel, 'click', '[data-celda]', (ev, b) => {
    const [p, i] = b.dataset.celda.split(',').map(Number);
    filtro.celda = filtro.celda && filtro.celda[0] === p && filtro.celda[1] === i ? null : [p, i];
    pintar();
  });
  on(panel, 'click', '[data-limpiar]', () => { filtro.celda = null; pintar(); });
  on(panel, 'change', '[data-proceso]', (ev, s) => { filtro.proceso = s.value; pintar(); });
  pintar();
}

export const pestanaRiesgos = {
  id: 'riesgos',
  titulo: 'Mapa de riesgos',
  tituloCorto: 'Riesgos',
  icono: 'riesgos',
  montar
};
