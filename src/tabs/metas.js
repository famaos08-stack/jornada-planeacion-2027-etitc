/*
 * metas.js — Pestaña 3: Metas 2027.
 *  A. De dónde venimos: línea de tiempo horizontal de hitos 2025–2026 (data/hitos.json).
 *  Bloque destacado: «Cómo vamos a reportar en 2027» con la comparación modelo 2026 vs. modelo 2027.
 *  B. Hacia dónde vamos: cascada navegable meta → líneas del PDI → dependencias y acciones que aportan.
 */
import { estado, on as alEvento, dependencia } from '../estado.js';
import { esc, on } from '../ui/dom.js';
import { icono } from '../ui/iconos.js';
import { timelineHorizontal } from '../ui/timeline.js';
import { activarAnimaciones, estadoVacio } from '../ui/cards.js';
import { entero, plural } from '../lib/formato.js';
import { TIPOS_PROCESO } from '../config.js';

const REGLA = 'En 2026 el plan se llenó de productos para dar cumplimiento. En 2027 el criterio cambia: la evidencia se consolida en informes macro de peso y valor, que recojan el cumplimiento de la meta de manera agregada, en lugar de calificar semana a semana lotes de productos menores. Se robustece la evidencia sin aumentar el volumen.';

let raiz = null;
const sel = { meta: null, linea: null };

// Acciones de todas las formulaciones cargadas, con su dependencia.
function accionesConsolidadas() {
  return estado.consolidado.formulaciones.flatMap((f) => (f.acciones || []).map((a) => ({ ...a, dependencia: f.dependencia })));
}

// Pseudoaleatorio determinista para que el diagrama 2026 sea estable entre recargas.
function semilla(n) { let s = n; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

function svgModelo2026() {
  const r = semilla(2026);
  const piezas = [];
  for (let i = 0; i < 42; i += 1) {
    const x = 12 + (i % 7) * 27 + r() * 12;
    const y = 12 + Math.floor(i / 7) * 30 + r() * 12;
    piezas.push({ x, y, s: 7 + r() * 5, o: 0.45 + r() * 0.5 });
  }
  return `<svg viewBox="0 0 330 210" class="modelo-svg" role="img" aria-label="Modelo 2026: muchos productos pequeños con trazabilidad dispersa hacia la meta">
    ${piezas.map((p, i) => (i % 2 === 0 ? `<path d="M${(p.x + p.s / 2).toFixed(1)} ${(p.y + p.s / 2).toFixed(1)} C ${(230).toFixed(0)} ${(p.y + 10).toFixed(1)}, 250 105, 286 105" fill="none" stroke="currentColor" stroke-opacity=".18" stroke-width="1" stroke-dasharray="2 3"/>` : '')).join('')}
    ${piezas.map((p) => `<rect x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" width="${p.s.toFixed(1)}" height="${p.s.toFixed(1)}" rx="2" class="pieza" fill-opacity="${p.o.toFixed(2)}"/>`).join('')}
    <circle cx="300" cy="105" r="20" class="diana-externa"/><circle cx="300" cy="105" r="11" class="diana-media"/><circle cx="300" cy="105" r="4" class="diana-centro"/>
  </svg>`;
}

function svgModelo2027() {
  const ys = [24, 82, 140];
  return `<svg viewBox="0 0 330 210" class="modelo-svg" role="img" aria-label="Modelo 2027: pocos informes macro con trazabilidad concentrada hacia la meta">
    ${ys.map((y) => `<path d="M136 ${y + 22} C 220 ${y + 22}, 240 105, 280 105" fill="none" class="traza-fuerte" stroke-width="3.2" stroke-linecap="round"/>`).join('')}
    ${ys.map((y, i) => `<g><rect x="14" y="${y}" width="122" height="44" rx="10" class="informe"/>
      <rect x="26" y="${y + 12}" width="62" height="6" rx="3" class="informe-linea"/><rect x="26" y="${y + 25}" width="88" height="5" rx="2.5" class="informe-linea suave"/>
      <text x="120" y="${y + 19}" text-anchor="end" class="informe-num">${i + 1}</text></g>`).join('')}
    <circle cx="300" cy="105" r="20" class="diana-externa"/><circle cx="300" cy="105" r="11" class="diana-media"/><circle cx="300" cy="105" r="4" class="diana-centro"/>
  </svg>`;
}

function seccionHitos() {
  const hitos = [...(estado.datos.hitos?.hitos || [])].sort((a, b) => (a.anio - b.anio) || ((a.orden || 0) - (b.orden || 0)));
  if (!hitos.length) return estadoVacio({ titulo: 'Sin hitos registrados', texto: 'Agregue hitos en data/hitos.json para mostrar de dónde venimos.', iconoNombre: 'bandera' });
  return timelineHorizontal(hitos.map((h) => ({
    titulo: h.titulo,
    marca: `<span class="badge badge-solid">${esc(h.anio)}</span>`,
    iconoNombre: h.icono || 'bandera',
    cuerpo: `<p>${esc(h.descripcion)}</p>`,
    pie: h.impacto ? `<span class="eyebrow">${icono('tendencia', 'icon-sm')}Impacto</span><p class="mb-0">${esc(h.impacto)}</p>` : ''
  })), { etiqueta: 'Hitos 2025 y 2026', clase: 'htl-hitos' });
}

function pintarCascada() {
  const metas = estado.datos.metas?.metasInstitucionales || [];
  const cont = raiz.querySelector('[data-cascada]');
  if (!metas.length) { cont.innerHTML = estadoVacio({ titulo: 'Sin metas cargadas', texto: 'Agregue las metas 2027 en data/metas.json.', iconoNombre: 'metas' }); return; }
  const acciones = accionesConsolidadas();
  const porMeta = (m) => acciones.filter((a) => a.metaId === m.id);
  const porLinea = (l) => acciones.filter((a) => a.lineaId === l.id);
  if (!sel.meta || !metas.some((m) => m.id === sel.meta)) sel.meta = metas[0].id;
  const meta = metas.find((m) => m.id === sel.meta);
  if (sel.linea && !meta.lineasPDI.some((l) => l.id === sel.linea)) sel.linea = null;
  const linea = sel.linea ? meta.lineasPDI.find((l) => l.id === sel.linea) : null;

  // Dependencias de la línea: responsables según metas.json + las que reportaron acciones en ella
  let filasDep = [];
  if (linea) {
    const accs = porLinea(linea);
    const codigos = new Set([...(linea.dependenciasResponsables || []).map(String), ...accs.map((a) => String(a.dependencia))]);
    filasDep = Array.from(codigos).map((c) => ({
      codigo: c,
      dep: dependencia(c),
      responsable: (linea.dependenciasResponsables || []).map(String).includes(c),
      acciones: accs.filter((a) => String(a.dependencia) === c)
    })).sort((a, b) => b.acciones.length - a.acciones.length || a.codigo.localeCompare(b.codigo));
  }

  cont.innerHTML = `<div class="cascada">
    <div class="cascada-col" aria-labelledby="cas-metas">
      <h3 class="cascada-titulo" id="cas-metas"><span class="chain-num">1</span>Metas institucionales</h3>
      <div class="cascada-lista">
        ${metas.map((m) => {
          const n = porMeta(m).length;
          return `<button type="button" class="nodo nodo-meta ${m.id === sel.meta ? 'is-sel' : ''}" data-meta="${esc(m.id)}" aria-pressed="${m.id === sel.meta}" aria-controls="cas-lineas">
            <span class="nodo-id">${esc(m.id)}</span>
            <span class="nodo-cuerpo"><strong>${esc(m.nombre)}</strong><span>${esc(m.descripcion || '')}</span>
            <span class="nodo-cifras"><span>${plural((m.lineasPDI || []).length, 'línea', 'líneas')}</span><span>${plural(n, 'acción', 'acciones')}</span></span></span>
            <span class="nodo-flecha">${icono('derecha', 'icon-sm')}</span>
          </button>`;
        }).join('')}
      </div>
    </div>
    <div class="cascada-col" id="cas-lineas" aria-live="polite">
      <h3 class="cascada-titulo"><span class="chain-num">2</span>Líneas del PDI de ${esc(meta.id)}</h3>
      <div class="cascada-lista cascada-anim" data-k="${esc(meta.id)}">
        ${(meta.lineasPDI || []).map((l) => {
          const accs = porLinea(l);
          const deps = new Set([...(l.dependenciasResponsables || []), ...accs.map((a) => a.dependencia)].map(String));
          return `<button type="button" class="nodo nodo-linea ${l.id === sel.linea ? 'is-sel' : ''}" data-linea="${esc(l.id)}" aria-pressed="${l.id === sel.linea}" aria-controls="cas-deps">
            <span class="nodo-id">${esc(l.id)}</span>
            <span class="nodo-cuerpo"><strong>${esc(l.nombre)}</strong>
            <span class="nodo-cifras"><span>${plural(deps.size, 'dependencia', 'dependencias')}</span><span>${plural(accs.length, 'acción', 'acciones')}</span></span></span>
            <span class="nodo-flecha">${icono('derecha', 'icon-sm')}</span>
          </button>`;
        }).join('') || '<p class="muted">Esta meta no tiene líneas registradas.</p>'}
      </div>
    </div>
    <div class="cascada-col" id="cas-deps" aria-live="polite">
      <h3 class="cascada-titulo"><span class="chain-num">3</span>Dependencias y acciones</h3>
      <div class="cascada-lista cascada-anim" data-k="${esc(sel.linea || 'nada')}">
        ${!linea ? `<div class="cascada-guia">${icono('derecha')}<p class="mb-0">Elija una línea del PDI para ver qué dependencias la tienen comprometida y cuántas acciones aportan.</p></div>` : filasDep.map((f) => `
          <div class="nodo nodo-dep proc-${esc(f.dep?.tipoProceso || '')}">
            <span class="proc-dot" aria-hidden="true"></span>
            <span class="nodo-cuerpo"><strong>${esc(f.codigo)} · ${esc(f.dep?.nombre || 'Dependencia no catalogada')}</strong>
              <span class="row" style="gap:6px">${f.responsable ? '<span class="badge">Responsable en el PDI</span>' : '<span class="badge badge-warn">Aporta sin ser responsable</span>'}<span class="badge">${esc(TIPOS_PROCESO[f.dep?.tipoProceso] || '')}</span></span>
              ${f.acciones.length ? `<ul class="nodo-acciones">${f.acciones.slice(0, 4).map((a) => `<li><span class="mono">${esc(a.codigo)}</span> ${esc(a.nombre)}</li>`).join('')}${f.acciones.length > 4 ? `<li class="muted">y ${f.acciones.length - 4} más…</li>` : ''}</ul>` : ''}
            </span>
            <span class="nodo-total ${f.acciones.length ? '' : 'is-cero'}"><span>${entero(f.acciones.length)}</span><small>${f.acciones.length === 1 ? 'acción' : 'acciones'}</small></span>
          </div>`).join('')}
        ${linea && !acciones.length ? '<p class="muted" style="font-size:.84rem;margin-top:8px">Las acciones aparecerán cuando las dependencias carguen su formulación en la pestaña 2.</p>' : ''}
      </div>
    </div>
  </div>`;
}

function montar(panel) {
  raiz = panel;
  const provHitos = estado.datos.hitos?.provisional;
  const provMetas = estado.datos.metas?.provisional;
  panel.innerHTML = `<div class="container page">
    <header class="page-head reveal">
      <div>
        <span class="eyebrow">${icono('metas', 'icon-sm')}Metas 2027</span>
        <h1>De dónde venimos y hacia dónde vamos</h1>
        <p class="lead">Los hitos 2025–2026 son el punto de partida; las metas 2027 ordenan todo lo que se formula en la jornada.</p>
      </div>
    </header>

    <section class="seccion reveal" aria-labelledby="sec-a">
      <div class="seccion-head">
        <span class="seccion-letra" aria-hidden="true">A</span>
        <div><h2 id="sec-a">De dónde venimos</h2><p class="muted mb-0">Hitos institucionales 2025 y 2026.</p></div>
        ${provHitos ? '<span class="badge badge-prov">Provisional</span>' : ''}
      </div>
      ${seccionHitos()}
    </section>

    <section class="hero-card reportar reveal" aria-labelledby="como-reportar">
      <div class="reportar-grid">
        <div>
          <span class="eyebrow">${icono('chispa', 'icon-sm')}La regla nueva</span>
          <h2 id="como-reportar">Cómo vamos a reportar en 2027</h2>
          <blockquote class="regla-cita"><p>${esc(REGLA)}</p></blockquote>
        </div>
        <div class="comparacion">
          <figure class="modelo modelo-2026">
            <figcaption><span class="modelo-anio">2026</span><strong>Muchos productos pequeños</strong><span>Trazabilidad dispersa</span></figcaption>
            ${svgModelo2026()}
            <ul class="modelo-rasgos"><li>Lotes de productos menores</li><li>Calificación semana a semana</li><li>Evidencia fragmentada</li></ul>
          </figure>
          <span class="comparacion-vs" aria-hidden="true">${icono('flecha')}</span>
          <figure class="modelo modelo-2027">
            <figcaption><span class="modelo-anio">2027</span><strong>Pocos informes macro</strong><span>Trazabilidad concentrada</span></figcaption>
            ${svgModelo2027()}
            <ul class="modelo-rasgos"><li>Informes de peso y valor</li><li>Cumplimiento agregado por meta</li><li>Más evidencia, no más volumen</li></ul>
          </figure>
        </div>
      </div>
    </section>

    <section class="seccion reveal" aria-labelledby="sec-b">
      <div class="seccion-head">
        <span class="seccion-letra" aria-hidden="true">B</span>
        <div><h2 id="sec-b">Hacia dónde vamos</h2><p class="muted mb-0">Meta institucional → líneas del Plan de Desarrollo Institucional → acciones por dependencia. Haga clic para navegar.</p></div>
        ${provMetas ? '<span class="badge badge-prov">Provisional</span>' : ''}
      </div>
      <div data-cascada></div>
    </section>
  </div>`;
  on(panel, 'click', '[data-meta]', (ev, b) => { sel.meta = b.dataset.meta; sel.linea = null; pintarCascada(); panel.querySelector(`[data-meta="${sel.meta}"]`).focus(); });
  on(panel, 'click', '[data-linea]', (ev, b) => {
    sel.linea = b.dataset.linea; pintarCascada();
    panel.querySelector(`[data-linea="${sel.linea}"]`).focus();
    if (window.innerWidth < 900) panel.querySelector('#cas-deps').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  pintarCascada();
  alEvento('consolidado', () => { if (raiz) { pintarCascada(); } });
}

export const pestanaMetas = {
  id: 'metas',
  titulo: 'Metas 2027',
  icono: 'metas',
  montar,
  alMostrar() { pintarCascada(); activarAnimaciones(raiz); }
};
