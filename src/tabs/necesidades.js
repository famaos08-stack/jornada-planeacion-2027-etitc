/*
 * necesidades.js — Pestaña 4: tablero del plan de necesidades consolidado de todas las dependencias que cargaron.
 * Cifras, distribución por tipo y por trimestre, valor por dependencia agrupado por tipo de proceso,
 * tabla maestra con trazabilidad a la acción de origen, panel lateral de detalle y exportación a Excel.
 * Incluye cargue masivo de Excel para que la OAPDI consolide los archivos recibidos.
 */
import { estado, on as alEvento, dependencia, dependencias } from '../estado.js';
import { esc, on } from '../ui/dom.js';
import { icono } from '../ui/iconos.js';
import { toast, toastError } from '../ui/toast.js';
import { abrirPanel } from '../ui/modal.js';
import { crearTabla } from '../ui/table.js';
import { graficaBarras } from '../ui/graficas.js';
import { tarjetaCifra, estadoVacio, activarAnimaciones, animarNumero, barrasHorizontales, cadenaLogica } from '../ui/cards.js';
import { leerLibro, exportarExcel, xlsxDisponible } from '../lib/excel.js';
import { validarFormulacion, leerDependenciaDeLibro, TIPOS_NECESIDAD } from '../lib/validacion.js';
import { descargarBlob, obtenerLogo } from '../lib/export.js';
import { moneda, entero } from '../lib/formato.js';
import { fechaCorta } from '../lib/fechas.js';
import { PALETA, TIPOS_PROCESO, TIPOS_PROCESO_PLURAL } from '../config.js';

let raiz = null;
let ctxApp = null;
let tabla = null;
let medida = 'valor';
const nombreTipo = (id) => TIPOS_NECESIDAD.find((t) => t.id === id)?.nombre || 'Sin tipo';

// Aplana las formulaciones en filas de necesidades con su trazabilidad.
export function filasNecesidades() {
  const metas = estado.datos.metas?.metasInstitucionales || [];
  const lineas = metas.flatMap((m) => m.lineasPDI || []);
  return estado.consolidado.formulaciones.flatMap((f) => {
    const d = dependencia(f.dependencia);
    const acciones = new Map((f.acciones || []).map((a) => [a.codigo, a]));
    return (f.necesidades || []).map((n) => {
      const accion = n.codigoAccion ? acciones.get(n.codigoAccion) : null;
      return {
        ...n,
        dependencia: f.dependencia,
        depSigla: d?.sigla || f.dependencia,
        depNombre: d?.nombre || f.dependencia,
        tipoProceso: d?.tipoProceso || '',
        estadoFormulacion: f.estado,
        archivo: f.archivo,
        cargadoEn: f.cargadoEn,
        accion,
        meta: accion ? metas.find((m) => m.id === accion.metaId) : null,
        linea: accion ? lineas.find((l) => l.id === accion.lineaId) : null,
        adquisiciones: (f.adquisiciones || []).filter((a) => a.codigoNecesidad === n.codigo),
        trimestreTxt: n.trimestre ? `T${n.trimestre}` : '—'
      };
    });
  });
}

function trazabilidad(f) {
  if (f.accion) return `<span class="traza-ok"><span class="mono">${esc(f.accion.codigo)}</span> ${esc(f.accion.nombre)}</span>`;
  return `<span class="trace-missing">${icono('alerta', 'icon-sm')}sin acción asociada</span>`;
}

function abrirDetalle(f) {
  const nodo = (num, titulo, cuerpo, ok = true) => `<li class="traza-nodo ${ok ? '' : 'is-roto'}"><span class="chain-num">${num}</span><div><span class="eyebrow">${esc(titulo)}</span>${cuerpo}</div></li>`;
  const contenido = `
    <div class="stack">
      <div class="row" style="gap:6px">
        <span class="badge proc-${esc(f.tipoProceso)}"><span class="proc-dot"></span>${esc(f.dependencia)} · ${esc(f.depNombre)}</span>
        <span class="badge">${esc(nombreTipo(f.tipo))}</span>
        <span class="badge">${esc(f.trimestreTxt)}</span>
        <span class="badge ${f.estadoFormulacion === 'validada' ? 'badge-ok' : 'badge-danger'}">${f.estadoFormulacion === 'validada' ? 'Formulación validada' : 'Formulación con bloqueantes'}</span>
      </div>
      <dl class="dl">
        <dt>Descripción</dt><dd>${esc(f.descripcion || '—')}</dd>
        <dt>Cantidad</dt><dd>${f.cantidad === null || f.cantidad === undefined ? '—' : entero(f.cantidad)}</dd>
        <dt>Valor estimado</dt><dd><strong>${moneda(f.valor || 0)}</strong></dd>
        <dt>Justificación</dt><dd>${esc(f.justificacion || '—')}</dd>
        <dt>Archivo</dt><dd>${esc(f.archivo)} · ${esc(fechaCorta(String(f.cargadoEn).slice(0, 10)))}</dd>
      </dl>
      <h3 style="margin-top:8px">Trazabilidad en la cadena lógica</h3>
      <ol class="traza">
        ${nodo(1, 'Meta 2027', f.meta ? `<strong>${esc(f.meta.id)} · ${esc(f.meta.nombre)}</strong>` : '<span class="muted">Sin meta identificada</span>', Boolean(f.meta))}
        ${nodo(2, 'Línea del PDI', f.linea ? `<strong>${esc(f.linea.id)} · ${esc(f.linea.nombre)}</strong>` : '<span class="muted">Sin línea identificada</span>', Boolean(f.linea))}
        ${nodo(3, 'Acción que la origina', f.accion
          ? `<strong>${esc(f.accion.codigo)} · ${esc(f.accion.nombre)}</strong><p class="mb-0 muted">Indicador: ${esc(f.accion.indicador)} · Meta ${esc(f.accion.metaCuantitativaTexto)} ${esc(f.accion.unidad)} · Evidencia: ${esc(f.accion.evidencia || 'sin evidencia macro')}</p>`
          : `<strong class="danger-text">Sin acción asociada</strong><p class="mb-0 muted">${f.codigoAccion ? `El código ${esc(f.codigoAccion)} no existe en la hoja Acciones.` : 'No se indicó el código de acción.'} Esta necesidad no es válida en el plan.</p>`, Boolean(f.accion))}
        ${nodo(4, 'Necesidad', `<strong>${esc(f.codigo)} · ${esc(f.descripcion)}</strong>`)}
        ${nodo(5, 'Adquisiciones', f.adquisiciones.length
          ? `<ul class="nodo-acciones">${f.adquisiciones.map((a) => `<li>${esc(a.modalidadTexto || 'Sin modalidad')} · ${moneda(a.valor || 0)}${a.fechaRadicacion ? ` · radicar antes del ${esc(fechaCorta(a.fechaRadicacion))}` : ''}</li>`).join('')}</ul>`
          : '<span class="muted">Aún no tiene adquisición asociada (puede resolverse sin compra).</span>', true)}
      </ol>
    </div>`;
  abrirPanel({ titulo: `Necesidad ${f.codigo}`, subtitulo: `${f.depSigla} · ${moneda(f.valor || 0)}`, contenido });
}

function pintar() {
  const filas = filasNecesidades();
  const cont = raiz.querySelector('[data-tablero]');
  if (!estado.consolidado.formulaciones.length) {
    tabla = null;
    cont.innerHTML = estadoVacio({
      titulo: 'Aún no hay necesidades consolidadas',
      texto: 'Este tablero se alimenta de los Excel validados en la pestaña <strong>Formulación y pase</strong>. Cuando una dependencia carga su archivo, sus necesidades aparecen aquí con la acción que las origina. La OAPDI también puede cargar de una vez los archivos recibidos por correo.',
      iconoNombre: 'necesidades',
      accion: `<a class="btn btn-primary" href="#formulacion">${icono('formulacion', 'icon-sm')}Ir a Formulación y pase</a><button type="button" class="btn" data-cargue-masivo>${icono('subir', 'icon-sm')}Cargar Excel de dependencias</button>`
    }) + `<div class="vacio-cadena">${cadenaLogica({ activo: 'necesidades' })}</div>`;
    activarAnimaciones(cont);
    return;
  }
  const total = filas.length;
  const valor = filas.reduce((s, f) => s + (f.valor || 0), 0);
  const conAccion = filas.filter((f) => f.accion).length;
  const depsReportaron = new Set(estado.consolidado.formulaciones.map((f) => f.dependencia)).size;
  const totalDeps = dependencias().length;
  if (!cont.querySelector('[data-cifras]')) {
    cont.innerHTML = `
      <div class="grid-4" data-cifras>
        ${tarjetaCifra({ etiqueta: 'Necesidades registradas', valor: total, iconoNombre: 'necesidades', id: 'c-total' })}
        ${tarjetaCifra({ etiqueta: 'Valor total consolidado', valor, formato: 'monedaCompacta', iconoNombre: 'dinero', id: 'c-valor', pie: `<span data-valor-exacto>${moneda(valor)}</span>` })}
        ${tarjetaCifra({ etiqueta: 'Dependencias que reportaron', valor: depsReportaron, iconoNombre: 'edificio', id: 'c-deps', pie: `de ${totalDeps} del catálogo` })}
        ${tarjetaCifra({ etiqueta: 'Con acción asociada', valor: total ? (conAccion / total) * 100 : 0, formato: 'porcentaje', iconoNombre: 'enlace', id: 'c-traza', pie: `<span data-sin-accion></span>` })}
      </div>
      <div class="row-between" style="margin:26px 0 12px">
        <h2 class="mb-0">Distribución</h2>
        <div class="segmentado" role="group" aria-label="Medida de las gráficas">
          <button type="button" class="chip" data-medida="valor" aria-pressed="true">Valor</button>
          <button type="button" class="chip" data-medida="cantidad" aria-pressed="false">Número de necesidades</button>
        </div>
      </div>
      <div class="grid-3 tablero-graficas">
        <div class="card reveal"><h3>Por tipo</h3><p class="muted" style="font-size:.84rem">Bien, servicio, talento humano e infraestructura.</p><div data-g-tipo></div></div>
        <div class="card reveal"><h3>Por trimestre requerido</h3><p class="muted" style="font-size:.84rem">Cuándo se necesita cada cosa en 2027.</p><div data-g-trim></div></div>
        <div class="card reveal"><h3>Por dependencia</h3><p class="muted" style="font-size:.84rem">Agrupadas por tipo de proceso del mapa institucional.</p><div data-g-dep class="dep-scroll"></div></div>
      </div>
      <div class="card reveal" style="margin-top:22px">
        <div class="card-head"><div><h2>Tabla maestra</h2><p>Haga clic en una fila para ver su trazabilidad completa.</p></div></div>
        <div data-tabla></div>
      </div>`;
    on(cont, 'click', '[data-medida]', (ev, b) => {
      medida = b.dataset.medida;
      cont.querySelectorAll('[data-medida]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      pintarGraficas(filasNecesidades());
    });
    activarAnimaciones(cont);
  } else {
    animarNumero(cont.querySelector('#c-total .stat-value'), total);
    animarNumero(cont.querySelector('#c-valor .stat-value'), valor);
    animarNumero(cont.querySelector('#c-deps .stat-value'), depsReportaron);
    animarNumero(cont.querySelector('#c-traza .stat-value'), total ? (conAccion / total) * 100 : 0);
    cont.querySelector('[data-valor-exacto]').textContent = moneda(valor);
  }
  cont.querySelector('#c-traza').classList.toggle('is-alert', conAccion < total);
  cont.querySelector('[data-sin-accion]').innerHTML = conAccion < total ? `<span class="danger-text">${total - conAccion} sin acción asociada</span>` : 'Toda necesidad nace de una acción';
  pintarGraficas(filas);
  pintarTabla(filas);
}

function pintarGraficas(filas) {
  const cont = raiz.querySelector('[data-tablero]');
  const agregado = (lista) => (medida === 'valor' ? lista.reduce((s, f) => s + (f.valor || 0), 0) : lista.length);
  const formato = medida === 'valor' ? 'moneda' : 'entero';
  const cat = PALETA.categorica();
  graficaBarras(cont.querySelector('[data-g-tipo]'), {
    etiquetas: TIPOS_NECESIDAD.map((t) => t.nombre),
    series: [{ nombre: medida === 'valor' ? 'Valor' : 'Necesidades', datos: TIPOS_NECESIDAD.map((t) => agregado(filas.filter((f) => f.tipo === t.id))), colores: cat }],
    formato, horizontal: true, alto: 230, titulo: 'Necesidades por tipo'
  });
  graficaBarras(cont.querySelector('[data-g-trim]'), {
    etiquetas: ['T1', 'T2', 'T3', 'T4'],
    series: [{ nombre: medida === 'valor' ? 'Valor' : 'Necesidades', datos: [1, 2, 3, 4].map((t) => agregado(filas.filter((f) => f.trimestre === t))) }],
    formato, alto: 230, titulo: 'Necesidades por trimestre'
  });
  const grupos = ['estrategico', 'misional', 'apoyo', 'evaluacion'].map((tp) => {
    const items = dependencias().filter((d) => d.tipoProceso === tp)
      .map((d) => ({ etiqueta: `${d.codigo} · ${d.sigla}`, valor: agregado(filas.filter((f) => String(f.dependencia) === String(d.codigo))), clase: `proc-${tp}`, proc: true }))
      .filter((i) => i.valor > 0).sort((a, b) => b.valor - a.valor);
    return { tp, items };
  }).filter((g) => g.items.length);
  cont.querySelector('[data-g-dep]').innerHTML = grupos.length
    ? grupos.map((g) => `<div class="grupo-proc"><span class="grupo-proc-tit proc-${g.tp}"><span class="proc-dot"></span>${esc(TIPOS_PROCESO_PLURAL[g.tp])}</span>${barrasHorizontales(g.items, { formato: medida === 'valor' ? 'monedaCompacta' : 'entero' })}</div>`).join('')
    : '<p class="muted">Sin datos.</p>';
}

function pintarTabla(filas) {
  const cont = raiz.querySelector('[data-tabla]');
  if (tabla) { tabla.actualizar(filas); return; }
  const depsConDatos = Array.from(new Set(filas.map((f) => f.dependencia))).sort();
  tabla = crearTabla(cont, {
    etiqueta: 'Necesidades consolidadas',
    filas,
    placeholder: 'Buscar por descripción, código, acción o dependencia…',
    porPagina: estado.datos.config?.umbrales?.filasPorPagina || 12,
    filtros: [
      { clave: 'dependencia', etiqueta: 'Dependencia', opciones: dependencias().map((d) => ({ valor: d.codigo, texto: `${d.codigo} · ${d.sigla}${depsConDatos.includes(d.codigo) ? '' : ' (sin datos)'}` })) },
      { clave: 'tipo', etiqueta: 'Tipo', opciones: TIPOS_NECESIDAD.map((t) => ({ valor: t.id, texto: t.nombre })) },
      { clave: 'trimestre', etiqueta: 'Trimestre', opciones: [1, 2, 3, 4].map((t) => ({ valor: String(t), texto: `T${t}` })) }
    ],
    accionesHtml: `<button type="button" class="btn" data-exportar ${xlsxDisponible() ? '' : 'disabled'}>${icono('excel', 'icon-sm')}Exportar filtrado</button>`,
    columnas: [
      { clave: 'dependencia', titulo: 'Dependencia', valor: (f) => `${f.dependencia} ${f.depSigla}`, render: (f) => `<span class="dep-cel proc-${esc(f.tipoProceso)}"><span class="proc-dot"></span><span><strong>${esc(f.depSigla)}</strong><small>${esc(f.dependencia)}</small></span></span>` },
      { clave: 'codigo', titulo: 'Código', render: (f) => `<span class="mono">${esc(f.codigo || '—')}</span>` },
      { clave: 'descripcion', titulo: 'Descripción', clase: 'col-ancha' },
      { clave: 'tipo', titulo: 'Tipo', valor: (f) => nombreTipo(f.tipo) },
      { clave: 'trimestre', titulo: 'Trim.', valor: (f) => f.trimestreTxt },
      { clave: 'valor', titulo: 'Valor estimado', tipo: 'moneda', render: (f) => (f.valor ? moneda(f.valor) : '<span class="danger-text">$ 0</span>') },
      { clave: 'traza', titulo: 'Acción que la origina', valor: (f) => (f.accion ? `${f.accion.codigo} ${f.accion.nombre}` : 'sin acción asociada'), render: trazabilidad, clase: 'col-ancha' }
    ],
    alClicFila: abrirDetalle,
    pieTotales: (lista) => `<tr><td colspan="5">Total filtrado (${entero(lista.length)})</td><td class="num">${moneda(lista.reduce((s, f) => s + (f.valor || 0), 0))}</td><td></td></tr>`
  });
  cont.querySelector('[data-exportar]').addEventListener('click', exportarFiltrado);
}

async function exportarFiltrado() {
  try {
    const lista = tabla.filtradas();
    if (!lista.length) { toast({ tipo: 'warn', titulo: 'Nada para exportar', mensaje: 'El filtro actual no tiene registros.' }); return; }
    const logo = await obtenerLogo();
    const r = exportarExcel({
      nombreArchivo: `JP2027_Necesidades_consolidado_${new Date().toISOString().slice(0, 10)}.xlsx`,
      logo: logo.bytes,
      hojas: [{
        nombre: 'Necesidades', titulo: 'Plan de necesidades 2027 — consolidado', subtitulo: `${entero(lista.length)} necesidades · ${moneda(lista.reduce((s, f) => s + (f.valor || 0), 0))}`,
        columnas: [
          { titulo: 'Código dependencia', ancho: 12 }, { titulo: 'Dependencia', ancho: 40 }, { titulo: 'Tipo de proceso', ancho: 16 },
          { titulo: 'Código de necesidad', ancho: 14 }, { titulo: 'Descripción', ancho: 50 }, { titulo: 'Tipo', ancho: 16 }, { titulo: 'Cantidad', ancho: 10, tipo: 'numero' },
          { titulo: 'Valor estimado', ancho: 18, tipo: 'moneda' }, { titulo: 'Trimestre requerido', ancho: 12 }, { titulo: 'Código de acción', ancho: 14 },
          { titulo: 'Acción que la origina', ancho: 44 }, { titulo: 'Meta 2027', ancho: 30 }, { titulo: 'Línea PDI', ancho: 36 }, { titulo: 'Trazabilidad', ancho: 22 }, { titulo: 'Justificación', ancho: 50 }, { titulo: 'Estado de la formulación', ancho: 20 }
        ],
        filas: lista.map((f) => [f.dependencia, f.depNombre, TIPOS_PROCESO[f.tipoProceso] || '', f.codigo, f.descripcion, nombreTipo(f.tipo), f.cantidad, f.valor || 0, f.trimestreTxt, f.codigoAccion,
          f.accion ? f.accion.nombre : '', f.meta ? `${f.meta.id} — ${f.meta.nombre}` : '', f.linea ? `${f.linea.id} — ${f.linea.nombre}` : '',
          f.accion ? 'Con acción asociada' : 'SIN ACCIÓN ASOCIADA', f.justificacion, f.estadoFormulacion === 'validada' ? 'Validada' : 'Con bloqueantes'])
      }]
    });
    descargarBlob(r.blob, r.nombre);
    toast({ tipo: 'ok', titulo: 'Consolidado exportado', mensaje: `${lista.length} filas en ${r.nombre}` });
  } catch (e) { toastError('No se pudo exportar', e, e.message); }
}

// Cargue masivo para la OAPDI: lee varios Excel, identifica la dependencia en la hoja Instructivo y los valida.
async function cargueMasivo(archivos) {
  let ok = 0; const fallos = [];
  for (const archivo of archivos) {
    try {
      const libro = await leerLibro(archivo);
      const cod = leerDependenciaDeLibro(libro) || (/(\d{3})/.exec(archivo.name) || [])[1];
      if (!cod || !dependencia(cod)) { fallos.push(`${archivo.name}: no indica la dependencia (celda «Dependencia que formula» del Instructivo).`); continue; }
      const r = validarFormulacion(libro, { metas: estado.datos.metas.metasInstitucionales, modalidades: estado.datos.modalidades.modalidades, calendario: estado.indices.calendario, umbrales: estado.datos.config?.umbrales, dependencia: cod });
      await ctxApp.almacen.guardarFormulacion({
        dependencia: cod, archivo: archivo.name, cargadoEn: new Date().toISOString(),
        persona: { nombre: 'Cargue masivo OAPDI', correo: '', cargo: '' },
        estado: r.resumen.bloqueantes ? 'con-bloqueantes' : 'validada',
        hallazgos: r.hallazgos, resumen: r.resumen, acciones: r.acciones, necesidades: r.necesidades, adquisiciones: r.adquisiciones
      });
      ok += 1;
    } catch (e) { fallos.push(`${archivo.name}: ${e.message}`); }
  }
  await ctxApp.refrescarConsolidado();
  if (ok) toast({ tipo: 'ok', titulo: `${ok} ${ok === 1 ? 'archivo consolidado' : 'archivos consolidados'}`, mensaje: 'Las formulaciones con bloqueantes quedan marcadas como «cargadas» pero no «validadas».' });
  if (fallos.length) toast({ tipo: 'warn', titulo: `${fallos.length} ${fallos.length === 1 ? 'archivo no se pudo cargar' : 'archivos no se pudieron cargar'}`, mensaje: fallos.join(' · '), duracion: 14000 });
}

function montar(panel, ctx) {
  raiz = panel;
  ctxApp = ctx;
  panel.innerHTML = `<div class="container page">
    <header class="page-head reveal">
      <div>
        <span class="eyebrow">${icono('necesidades', 'icon-sm')}Plan de necesidades</span>
        <h1>Necesidades consolidadas de la ETITC</h1>
        <p class="lead">Lo que cada dependencia necesita para cumplir sus acciones 2027, con su trazabilidad hasta la meta.</p>
      </div>
      <div class="btn-group">
        <button type="button" class="btn" data-cargue-masivo ${xlsxDisponible() ? '' : 'disabled'}>${icono('subir', 'icon-sm')}Cargar Excel de dependencias</button>
        <input type="file" multiple accept=".xlsx,.xls" hidden data-input-masivo>
      </div>
    </header>
    <div data-tablero></div>
  </div>`;
  const input = panel.querySelector('[data-input-masivo]');
  on(panel, 'click', '[data-cargue-masivo]', () => {
    if (!xlsxDisponible()) { toast({ tipo: 'warn', titulo: 'Excel no disponible', mensaje: 'La librería SheetJS no cargó.' }); return; }
    input.click();
  });
  input.addEventListener('change', async () => {
    const lista = Array.from(input.files); input.value = '';
    if (lista.length) await cargueMasivo(lista);
  });
  pintar();
  alEvento('consolidado', () => { if (raiz) pintar(); });
  alEvento('tema', () => { if (raiz && !raiz.hidden && estado.consolidado.formulaciones.length) pintarGraficas(filasNecesidades()); });
  alEvento('librerias', () => { if (raiz && estado.consolidado.formulaciones.length) pintarGraficas(filasNecesidades()); });
}

export const pestanaNecesidades = {
  id: 'necesidades',
  titulo: 'Plan de necesidades',
  tituloCorto: 'Necesidades',
  icono: 'necesidades',
  montar,
  alMostrar() { if (estado.consolidado.formulaciones.length) pintarGraficas(filasNecesidades()); }
};
