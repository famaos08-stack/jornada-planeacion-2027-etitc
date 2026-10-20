/*
 * adquisiciones.js — Pestaña 5: Plan de adquisiciones.
 *  A. Calculador de fecha límite: desde la fecha en que se necesita operando y la modalidad, calcula hacia atrás
 *     (en días hábiles, sin sábados, domingos ni festivos) la fecha de radicación de estudios previos y el camino etapa por etapa.
 *  B. Consolidado: valor por modalidad y trimestre con acumulado, gráfica de congestión de radicaciones por mes
 *     y alertas de radicaciones a menos de 30 días.
 *
 * NOTA: los tiempos por modalidad vienen de data/modalidades.json y son PROVISIONALES.
 * Deben reemplazarse por los tiempos formalizados en el Manual de Contratación de la ETITC.
 */
import { estado, on as alEvento, dependencia, umbral } from '../estado.js';
import { esc, on } from '../ui/dom.js';
import { icono } from '../ui/iconos.js';
import { toastError } from '../ui/toast.js';
import { timelineHorizontal } from '../ui/timeline.js';
import { graficaBarras } from '../ui/graficas.js';
import { estadoVacio, activarAnimaciones, tarjetaCifra, animarNumero } from '../ui/cards.js';
import { caminoContratacion, hoyISO, fechaLarga, fechaCorta, diferenciaDias, trimestreDe, nombreMes, sumarDias } from '../lib/fechas.js';
import { moneda, entero } from '../lib/formato.js';
import { exportarExcel, xlsxDisponible } from '../lib/excel.js';
import { descargarBlob, obtenerLogo } from '../lib/export.js';
import { PALETA } from '../config.js';

let raiz = null;
const modalidades = () => estado.datos.modalidades?.modalidades || [];
const uvt = () => estado.datos.modalidades?.uvt?.valor || 0;
const totalHabiles = (m) => (m.etapas || []).reduce((s, e) => s + Number(e.diasHabiles || 0), 0) || Number(m.diasHabilesTotales) || 0;

// ───────── A. Calculador ─────────
function calcular() {
  const cont = raiz.querySelector('[data-calc-resultado]');
  const fecha = raiz.querySelector('#calc-fecha').value;
  const modId = raiz.querySelector('#calc-modalidad').value;
  const valor = Number(raiz.querySelector('#calc-valor').value || 0);
  const mod = modalidades().find((m) => m.id === modId);
  if (!fecha || !mod) {
    cont.innerHTML = `<div class="calc-guia">${icono('reloj', 'icon-lg')}<p class="mb-0">Indique la fecha en que necesita el bien o servicio operando y la modalidad: el aplicativo calcula hacia atrás cuándo debe radicar los estudios previos.</p></div>`;
    return;
  }
  const cal = estado.indices.calendario;
  const camino = caminoContratacion(cal, mod, fecha);
  const hoy = hoyISO();
  const vencida = camino.radicacion < hoy;
  const habilesRestantes = vencida ? 0 : cal.habilesEntre(hoy, camino.radicacion);
  const notas = [];
  if (!cal.esHabil(fecha)) notas.push(`La fecha elegida ${cal.esFestivo(fecha) ? `es festivo (${cal.nombreFestivo(fecha)})` : 'cae en fin de semana'}: el bien o servicio empezaría a operar el siguiente día hábil.`);
  const anios = new Set([camino.radicacion.slice(0, 4), fecha.slice(0, 4)]);
  anios.forEach((a) => { if (!cal.cubreAnio(a)) notas.push(`No hay festivos cargados para ${a}: el cálculo solo descuenta fines de semana. Agregue los festivos en data/festivos.json.`); });
  if (mod.topeUVT && valor && uvt() && valor > mod.topeUVT * uvt()) notas.push(`El valor (${moneda(valor)}) supera el tope de ${mod.nombre} (${entero(mod.topeUVT)} UVT ≈ ${moneda(mod.topeUVT * uvt())}). Revise la modalidad con Contratación.`);
  // Fecha más temprana alcanzable radicando el próximo día hábil
  const proximaRadicacion = cal.esHabil(hoy) ? hoy : cal.sumarHabiles(hoy, 1);
  const masTemprana = cal.sumarHabiles(proximaRadicacion, camino.totalHabiles);

  const items = camino.etapas.map((e) => ({
    titulo: e.nombre,
    subtitulo: `<span class="badge">${e.diasHabiles} ${e.diasHabiles === 1 ? 'día hábil' : 'días hábiles'}</span>`,
    cuerpo: `<span class="htl-fechas">${esc(fechaCorta(e.inicio))} <span aria-hidden="true">→</span><span class="sr-only">hasta</span> ${esc(fechaCorta(e.fin))}</span>`,
    estado: e.fin < hoy ? 'danger' : ''
  }));
  items.push({ titulo: 'En operación', subtitulo: '<span class="badge badge-ok">Meta</span>', cuerpo: `<span class="htl-fechas">${esc(fechaCorta(fecha))}</span>`, iconoNombre: 'bandera', estado: 'ok' });

  cont.innerHTML = `
    <div class="calc-veredicto ${vencida ? 'is-vencida' : 'is-ok'} reveal">
      <span class="calc-ico">${icono(vencida ? 'bloqueo' : 'agenda', 'icon-lg')}</span>
      <div>
        ${vencida
          ? `<span class="eyebrow">Fecha no alcanzable</span>
             <h3>Esa fecha de operación no es alcanzable por ${esc(mod.nombre.toLowerCase())}</h3>
             <p class="mb-0">La radicación de estudios previos debía hacerse a más tardar el <strong>${esc(fechaLarga(camino.radicacion))}</strong>. Radicando el ${esc(fechaCorta(proximaRadicacion))}, lo más pronto que estaría operando es el <strong>${esc(fechaLarga(masTemprana))}</strong>.</p>`
          : `<span class="eyebrow">Fecha límite de radicación de estudios previos</span>
             <h3 class="calc-fecha">${esc(fechaLarga(camino.radicacion))}</h3>
             <p class="mb-0">${esc(mod.nombre)} toma <strong>${camino.totalHabiles} días hábiles</strong>. ${habilesRestantes === 0 ? '<strong>Debe radicar hoy.</strong>' : `Le quedan <strong>${habilesRestantes} días hábiles</strong> (${diferenciaDias(hoy, camino.radicacion)} calendario) para radicar.`}</p>`}
      </div>
    </div>
    ${notas.map((n) => `<div class="notice" style="margin-top:12px">${icono('info', 'icon-sm')}<span>${esc(n)}</span></div>`).join('')}
    <div class="gantt reveal" aria-hidden="true">${camino.etapas.map((e, i) => `<span style="flex:${e.diasHabiles};--i:${i}" title="${esc(e.nombre)}: ${e.diasHabiles} días hábiles"></span>`).join('')}</div>
    <div class="gantt-ejes" aria-hidden="true"><span>Radicación · ${esc(fechaCorta(camino.radicacion))}</span><span>Operación · ${esc(fechaCorta(fecha))}</span></div>
    ${timelineHorizontal(items, { etiqueta: `Etapas de ${mod.nombre}`, clase: 'htl-etapas' })}
    <p class="muted" style="font-size:.8rem;margin-top:10px">Tiempos por modalidad provisionales (data/modalidades.json). Días hábiles: sin sábados, domingos ni festivos de Colombia.</p>`;
  activarAnimaciones(cont);
}

// ───────── B. Consolidado ─────────
function filasAdquisiciones() {
  return estado.consolidado.formulaciones.flatMap((f) => (f.adquisiciones || []).map((a) => {
    const mod = modalidades().find((m) => m.id === a.modalidadId);
    let radicacion = a.fechaRadicacion || null;
    if (!radicacion && mod && a.fechaOperacion) radicacion = caminoContratacion(estado.indices.calendario, mod, a.fechaOperacion).radicacion;
    const necesidad = (f.necesidades || []).find((n) => n.codigo === a.codigoNecesidad);
    return { ...a, dependencia: f.dependencia, modalidad: mod, radicacion, necesidad };
  }));
}

function pintarConsolidado() {
  const cont = raiz.querySelector('[data-consolidado]');
  const filas = filasAdquisiciones();
  if (!filas.length) {
    cont.innerHTML = estadoVacio({
      titulo: 'Aún no hay adquisiciones consolidadas',
      texto: 'Las adquisiciones llegan de la hoja «Adquisiciones» de cada Excel validado en la pestaña Formulación y pase. Mientras tanto, use el calculador para planear sus fechas.',
      iconoNombre: 'adquisiciones',
      accion: `<a class="btn btn-primary" href="#formulacion">${icono('formulacion', 'icon-sm')}Ir a Formulación y pase</a>`
    });
    activarAnimaciones(cont);
    return;
  }
  const hoy = hoyISO();
  const dias = umbral('diasAlertaRadicacion', 30);
  const valorTotal = filas.reduce((s, a) => s + (a.valor || 0), 0);
  const conFecha = filas.filter((a) => a.radicacion);
  const proximas = conFecha.filter((a) => a.radicacion >= hoy && diferenciaDias(hoy, a.radicacion) < dias).sort((a, b) => a.radicacion.localeCompare(b.radicacion));
  const vencidas = conFecha.filter((a) => a.radicacion < hoy).sort((a, b) => a.radicacion.localeCompare(b.radicacion));

  const mods = modalidades();
  const claveMod = (a) => (a.modalidad ? a.modalidad.id : 'otra');
  const filasMod = [...mods.map((m) => ({ id: m.id, nombre: m.nombre })), { id: 'otra', nombre: 'Sin modalidad reconocida' }]
    .map((m) => {
      const lista = filas.filter((a) => claveMod(a) === m.id);
      const porT = [1, 2, 3, 4].map((t) => lista.filter((a) => trimestreDe(a.fechaOperacion) === t).reduce((s, a) => s + (a.valor || 0), 0));
      const sinFecha = lista.filter((a) => !a.fechaOperacion).reduce((s, a) => s + (a.valor || 0), 0);
      return { ...m, n: lista.length, porT, sinFecha, total: lista.reduce((s, a) => s + (a.valor || 0), 0) };
    }).filter((m) => m.n > 0);
  const totT = [0, 1, 2, 3].map((i) => filasMod.reduce((s, m) => s + m.porT[i], 0));
  const acumulado = totT.map((_, i) => totT.slice(0, i + 1).reduce((s, v) => s + v, 0));
  const totSinFecha = filasMod.reduce((s, m) => s + m.sinFecha, 0);

  // Congestión: radicaciones por mes
  const meses = new Map();
  conFecha.forEach((a) => { const k = a.radicacion.slice(0, 7); meses.set(k, (meses.get(k) || 0) + 1); });
  const clavesMes = Array.from(meses.keys()).sort();
  let serieMeses = [];
  if (clavesMes.length) {
    let k = clavesMes[0];
    while (k <= clavesMes[clavesMes.length - 1]) {
      serieMeses.push(k);
      const [y, m] = k.split('-').map(Number);
      k = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
    }
  }
  const conteos = serieMeses.map((k) => meses.get(k) || 0);
  const promedio = conteos.length ? conteos.reduce((s, v) => s + v, 0) / conteos.length : 0;
  const pico = Math.max(0, ...conteos);
  const colorBase = PALETA.leer('--g7', '#188b58');
  const colorPico = PALETA.leer('--cat-3', '#c08a1e');
  const colores = conteos.map((c) => (c > 1 && c >= promedio * 1.5 ? colorPico : colorBase));
  const mesesCongestionados = serieMeses.filter((_, i) => colores[i] === colorPico);

  const filaAlerta = (a, vencida) => {
    const d = dependencia(a.dependencia);
    const n = diferenciaDias(hoy, a.radicacion);
    return `<li class="alerta-item ${vencida ? 'is-vencida' : ''}">
      <span class="alerta-dias"><strong>${vencida ? Math.abs(n) : n}</strong><small>${vencida ? 'días de retraso' : n === 1 ? 'día' : 'días'}</small></span>
      <div><strong>${esc(a.necesidad?.descripcion || a.codigoNecesidad)}</strong>
      <span class="muted">${esc(d?.sigla || a.dependencia)} · ${esc(a.modalidad?.nombre || a.modalidadTexto || 'Sin modalidad')} · ${moneda(a.valor || 0)}</span>
      <span class="${vencida ? 'danger-text' : 'ink'}">Radicar ${vencida ? 'debió ser' : 'a más tardar'} el ${esc(fechaLarga(a.radicacion))}</span></div>
    </li>`;
  };

  const yaPintado = cont.querySelector('[data-cifras-adq]');
  if (!yaPintado) {
    cont.innerHTML = `
      <div class="grid-4" data-cifras-adq>
        ${tarjetaCifra({ etiqueta: 'Adquisiciones', valor: filas.length, iconoNombre: 'adquisiciones', id: 'a-total' })}
        ${tarjetaCifra({ etiqueta: 'Valor total', valor: valorTotal, formato: 'monedaCompacta', iconoNombre: 'dinero', id: 'a-valor' })}
        ${tarjetaCifra({ etiqueta: `Radicaciones en menos de ${dias} días`, valor: proximas.length, iconoNombre: 'reloj', id: 'a-prox' })}
        ${tarjetaCifra({ etiqueta: 'Radicaciones vencidas', valor: vencidas.length, iconoNombre: 'alerta', id: 'a-venc' })}
      </div>
      <div class="grid-2 adq-grid">
        <div class="card reveal"><div class="card-head"><div><h3>Congestión de radicaciones por mes</h3><p data-congestion-texto></p></div></div><div data-g-congestion></div>
          <div class="legend"><span><span class="dot" style="color:var(--g7)"></span>Radicaciones del mes</span><span><span class="dot" style="color:var(--cat-3)"></span>Mes congestionado (1,5 veces el promedio o más)</span></div></div>
        <div class="card reveal alertas-card"><div class="card-head"><div><h3>Alertas de radicación</h3><p>Adquisiciones que deben radicarse en menos de ${dias} días o que ya se vencieron.</p></div></div><div data-alertas></div></div>
      </div>
      <div class="card reveal" style="margin-top:22px">
        <div class="card-head"><div><h3>Valor por modalidad y trimestre de operación</h3><p>Trimestre en que se requiere el bien o servicio operando. La última fila acumula el valor a lo largo del año.</p></div>
        <button type="button" class="btn" data-exportar-adq ${xlsxDisponible() ? '' : 'disabled'}>${icono('excel', 'icon-sm')}Exportar adquisiciones</button></div>
        <div data-tabla-mod></div>
      </div>`;
    cont.querySelector('[data-exportar-adq]').addEventListener('click', () => exportarAdquisiciones(filasAdquisiciones()));
    activarAnimaciones(cont);
  } else {
    animarNumero(cont.querySelector('#a-total .stat-value'), filas.length);
    animarNumero(cont.querySelector('#a-valor .stat-value'), valorTotal);
    animarNumero(cont.querySelector('#a-prox .stat-value'), proximas.length);
    animarNumero(cont.querySelector('#a-venc .stat-value'), vencidas.length);
  }
  cont.querySelector('#a-prox').classList.toggle('is-alert', proximas.length > 0);
  cont.querySelector('#a-venc').classList.toggle('is-alert', vencidas.length > 0);
  cont.querySelector('[data-congestion-texto]').textContent = mesesCongestionados.length
    ? `Pico de ${pico} radicaciones. Meses congestionados: ${mesesCongestionados.map((k) => `${nombreMes(Number(k.slice(5)) - 1)} ${k.slice(0, 4)}`).join(', ')}.`
    : 'Las radicaciones están distribuidas sin picos marcados.';
  graficaBarras(cont.querySelector('[data-g-congestion]'), {
    etiquetas: serieMeses.map((k) => `${nombreMes(Number(k.slice(5)) - 1, true)} ${k.slice(2, 4)}`),
    series: [{ nombre: 'Radicaciones', datos: conteos, colores }],
    alto: 250, titulo: 'Radicaciones de estudios previos por mes'
  });
  cont.querySelector('[data-alertas]').innerHTML = proximas.length || vencidas.length
    ? `<ul class="alertas">${vencidas.map((a) => filaAlerta(a, true)).join('')}${proximas.map((a) => filaAlerta(a, false)).join('')}</ul>`
    : `<div class="empty" style="padding:28px 16px"><div class="empty-art" style="width:64px;height:64px">${icono('checkCirculo')}</div><p>No hay radicaciones en los próximos ${dias} días.</p></div>`;
  cont.querySelector('[data-tabla-mod]').innerHTML = `<div class="table-wrap"><table class="table" aria-label="Valor por modalidad y trimestre">
    <thead><tr><th scope="col">Modalidad</th><th scope="col" class="num">N.º</th>${[1, 2, 3, 4].map((t) => `<th scope="col" class="num">T${t}</th>`).join('')}${totSinFecha ? '<th scope="col" class="num">Sin fecha</th>' : ''}<th scope="col" class="num">Total</th></tr></thead>
    <tbody>${filasMod.map((m) => `<tr><th scope="row" style="background:none;position:static;font-size:.86rem">${esc(m.nombre)}</th><td class="num">${m.n}</td>${m.porT.map((v) => `<td class="num">${v ? moneda(v) : '<span class="muted">—</span>'}</td>`).join('')}${totSinFecha ? `<td class="num">${m.sinFecha ? moneda(m.sinFecha) : '—'}</td>` : ''}<td class="num"><strong>${moneda(m.total)}</strong></td></tr>`).join('')}</tbody>
    <tfoot>
      <tr><td>Total del trimestre</td><td class="num">${filas.length}</td>${totT.map((v) => `<td class="num">${moneda(v)}</td>`).join('')}${totSinFecha ? `<td class="num">${moneda(totSinFecha)}</td>` : ''}<td class="num">${moneda(valorTotal)}</td></tr>
      <tr><td>Valor acumulado</td><td></td>${acumulado.map((v) => `<td class="num">${moneda(v)}</td>`).join('')}${totSinFecha ? '<td></td>' : ''}<td></td></tr>
    </tfoot></table></div>`;
}

async function exportarAdquisiciones(filas) {
  try {
    const logo = await obtenerLogo();
    const r = exportarExcel({
      nombreArchivo: `JP2027_Adquisiciones_consolidado_${hoyISO()}.xlsx`,
      logo: logo.bytes,
      hojas: [{
        nombre: 'Adquisiciones', titulo: 'Plan de adquisiciones 2027 — consolidado', subtitulo: `${entero(filas.length)} adquisiciones · ${moneda(filas.reduce((s, a) => s + (a.valor || 0), 0))} · tiempos por modalidad provisionales`,
        columnas: [{ titulo: 'Código dependencia', ancho: 12 }, { titulo: 'Dependencia', ancho: 40 }, { titulo: 'Código de necesidad', ancho: 14 }, { titulo: 'Necesidad', ancho: 44 },
          { titulo: 'Modalidad', ancho: 30 }, { titulo: 'Valor', ancho: 18, tipo: 'moneda' }, { titulo: 'Fecha requerida operando', ancho: 16, tipo: 'fecha' },
          { titulo: 'Fecha límite de radicación', ancho: 16, tipo: 'fecha' }, { titulo: 'Días hábiles del trámite', ancho: 12, tipo: 'numero' }, { titulo: 'Observaciones', ancho: 40 }],
        filas: filas.map((a) => [a.dependencia, dependencia(a.dependencia)?.nombre || '', a.codigoNecesidad, a.necesidad?.descripcion || '', a.modalidad?.nombre || a.modalidadTexto,
          a.valor || 0, a.fechaOperacion, a.radicacion, a.modalidad ? totalHabiles(a.modalidad) : null, a.observaciones])
      }]
    });
    descargarBlob(r.blob, r.nombre);
  } catch (e) { toastError('No se pudo exportar', e, e.message); }
}

function montar(panel) {
  raiz = panel;
  const mods = modalidades();
  const prov = estado.datos.modalidades?.provisional;
  const minFecha = sumarDias(hoyISO(), 1);
  panel.innerHTML = `<div class="container page">
    <header class="page-head reveal">
      <div>
        <span class="eyebrow">${icono('adquisiciones', 'icon-sm')}Plan de adquisiciones</span>
        <h1>Cuándo radicar para tenerlo a tiempo</h1>
        <p class="lead">El calendario se calcula hacia atrás desde la fecha en que se necesita operando, en días hábiles de Colombia.</p>
      </div>
    </header>
    ${prov ? `<div class="prov-banner reveal">${icono('info', 'icon-sm')}<span><strong>Tiempos provisionales.</strong> ${esc(estado.datos.modalidades._comentario || 'Reemplazar por los tiempos formalizados en la ETITC.')}</span></div>` : ''}

    <section class="card calc reveal" aria-labelledby="calc-titulo">
      <div class="card-head"><div><span class="eyebrow">Herramienta A</span><h2 id="calc-titulo">Calculador de fecha límite</h2><p>¿Para cuándo lo necesita funcionando? Le decimos cuándo radicar los estudios previos.</p></div></div>
      <form class="calc-form" data-calc novalidate>
        <label class="field"><span class="field-label">Fecha en que lo necesita operando</span><input class="input" type="date" id="calc-fecha" min="${minFecha}" value="2027-03-01" required></label>
        <label class="field"><span class="field-label">Modalidad de contratación</span>
          <select class="select" id="calc-modalidad">${mods.map((m, i) => `<option value="${esc(m.id)}" ${i === 1 ? 'selected' : ''}>${esc(m.nombre)} · ${totalHabiles(m)} días hábiles</option>`).join('')}</select></label>
        <label class="field"><span class="field-label">Valor estimado (opcional)</span><input class="input" type="number" min="0" step="1000" id="calc-valor" inputmode="numeric" placeholder="Para revisar el tope"></label>
      </form>
      <div data-calc-resultado aria-live="polite"></div>
    </section>

    <section class="seccion" aria-labelledby="cons-titulo" style="margin-top:34px">
      <div class="seccion-head"><span class="seccion-letra" aria-hidden="true">B</span><div><h2 id="cons-titulo">Consolidado de adquisiciones</h2><p class="muted mb-0">Lo que reportaron las dependencias en la hoja Adquisiciones.</p></div></div>
      <div data-consolidado></div>
    </section>
  </div>`;
  if (!mods.length) panel.querySelector('[data-calc-resultado]').innerHTML = estadoVacio({ titulo: 'Sin modalidades', texto: 'Cargue data/modalidades.json para usar el calculador.', iconoNombre: 'adquisiciones' });
  on(panel, 'input', '[data-calc] input, [data-calc] select', () => { try { calcular(); } catch (e) { toastError('No se pudo calcular', e); } });
  on(panel, 'change', '[data-calc] select', () => calcular());
  if (mods.length) calcular();
  pintarConsolidado();
  alEvento('consolidado', () => { if (raiz) pintarConsolidado(); });
  alEvento('tema', () => { if (raiz && !raiz.hidden) pintarConsolidado(); });
  alEvento('librerias', () => { if (raiz) pintarConsolidado(); });
}

export const pestanaAdquisiciones = {
  id: 'adquisiciones',
  titulo: 'Plan de adquisiciones',
  tituloCorto: 'Adquisiciones',
  icono: 'adquisiciones',
  montar,
  alMostrar() { pintarConsolidado(); }
};
