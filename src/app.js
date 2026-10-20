/*
 * app.js — Arranque, enrutamiento de pestañas y estado global de la aplicación.
 *  1. Carga los datos de /data (con respaldo empaquetado en file://).
 *  2. Lee el consolidado guardado (formulaciones, pases, asistencia) desde el almacén configurado.
 *  3. Construye la navegación (pestañas según FEATURES), la franja de progreso y el enrutador por hash.
 * El estado compartido vive en estado.js; aquí solo se orquesta.
 */
import { FEATURES, PERSISTENCIA } from './config.js';
import { almacen } from './storage.js';
import { estado, fijarDatos, fijarConsolidado, on, emitir, dependencias } from './estado.js';
import { cargarDatos, cargarDesdeArchivos } from './lib/datos.js';
import { esperarLibrerias, avisarLibreriasFaltantes } from './lib/libs.js';
import { descargarTexto, obtenerLogo } from './lib/export.js';
import { crearPestanas } from './ui/tabs.js';
import { toast, toastError } from './ui/toast.js';
import { confirmar } from './ui/modal.js';
import { skeletonPestana } from './ui/skeleton.js';
import { icono } from './ui/iconos.js';
import { esc, qs } from './ui/dom.js';
import { entero } from './lib/formato.js';
import { fechaCorta } from './lib/fechas.js';
import { activarAnimaciones } from './ui/cards.js';
import { pestanaAgenda } from './tabs/agenda.js';
import { pestanaFormulacion } from './tabs/formulacion.js';
import { pestanaMetas } from './tabs/metas.js';
import { pestanaNecesidades } from './tabs/necesidades.js';
import { pestanaAdquisiciones } from './tabs/adquisiciones.js';
import { pestanaRiesgos } from './tabs/riesgos.js';
import { vistaEscaner } from './tabs/escaner.js';

// Registro de pestañas. El mapa de riesgos solo entra si la bandera está encendida.
const PESTANAS = [pestanaAgenda, pestanaFormulacion, pestanaMetas, pestanaNecesidades, pestanaAdquisiciones]
  .concat(FEATURES.mapaRiesgos ? [pestanaRiesgos] : []);
const VISTAS = [...PESTANAS, vistaEscaner];
const montadas = new Set();
let actual = null;
let navegacion = null;

const ctx = {
  almacen,
  ir: (id) => { if (location.hash !== `#${id}`) location.hash = id; else mostrar(id); },
  async refrescarConsolidado() {
    try { fijarConsolidado(await almacen.leerConsolidado()); } catch (e) { toastError('No se pudo leer la información guardada', e); }
  },
  pestanasActivas: PESTANAS.map((p) => p.id),
  riesgosActivo: FEATURES.mapaRiesgos
};

// ───────── Tema claro / oscuro ─────────
function pintarBotonTema() {
  const b = qs('#btn-tema');
  const oscuro = document.documentElement.getAttribute('data-theme') === 'dark';
  b.innerHTML = icono(oscuro ? 'sol' : 'luna', 'icon-sm');
  b.setAttribute('aria-label', oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
  b.setAttribute('aria-pressed', String(oscuro));
}
function iniciarTema() {
  pintarBotonTema();
  qs('#btn-tema').addEventListener('click', () => {
    const nuevo = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nuevo);
    try { localStorage.setItem('etitc-jp27:tema', nuevo); } catch { /* preferencia no crítica */ }
    pintarBotonTema();
    emitir('tema', nuevo);
  });
}

// ───────── Franja de progreso institucional ─────────
function pintarFranja() {
  const franja = qs('#franja-progreso');
  const total = dependencias().length || 1;
  const { formulaciones, pases } = estado.consolidado;
  const cargadas = new Set(formulaciones.map((f) => f.dependencia)).size;
  const validadas = new Set(formulaciones.filter((f) => f.estado === 'validada').map((f) => f.dependencia)).size;
  const depsConPase = new Set(pases.map((p) => String(p.d))).size;
  const pct = (n) => `${Math.min(100, Math.round((n / total) * 100))}%`;
  if (!franja.dataset.listo) {
    franja.innerHTML = `<div class="container progress-inner">
      <div class="pmeter"><div class="pmeter-head"><span class="pmeter-label">Formulación cargada</span><span class="pmeter-value" data-m="cargadas"></span></div><div class="pbar deep"><span data-b="cargadas"></span></div></div>
      <div class="pmeter"><div class="pmeter-head"><span class="pmeter-label">Formulación validada</span><span class="pmeter-value" data-m="validadas"></span></div><div class="pbar"><span data-b="validadas"></span></div></div>
      <div class="pmeter"><div class="pmeter-head"><span class="pmeter-label">Pases emitidos</span><span class="pmeter-value" data-m="pases"></span></div><div class="pbar gold"><span data-b="pases"></span></div></div>
      <div class="progress-actions">
        <button type="button" class="btn btn-sm" data-accion="respaldo" title="Descarga todo lo guardado en este navegador">${icono('guardar', 'icon-sm')}Exportar respaldo</button>
        <button type="button" class="btn btn-sm btn-ghost" data-accion="importar" title="Combina un respaldo .json con lo guardado">${icono('subir', 'icon-sm')}Importar</button>
        <input type="file" accept=".json,application/json" hidden data-importar>
      </div>
    </div>`;
    franja.dataset.listo = '1';
    franja.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-accion]');
      if (!b) return;
      if (b.dataset.accion === 'respaldo') exportarRespaldo();
      if (b.dataset.accion === 'importar') franja.querySelector('[data-importar]').click();
    });
    franja.querySelector('[data-importar]').addEventListener('change', async (ev) => {
      const f = ev.target.files[0];
      ev.target.value = '';
      if (!f) return;
      try {
        await almacen.importarRespaldo(JSON.parse(await f.text()));
        await ctx.refrescarConsolidado();
        toast({ tipo: 'ok', titulo: 'Respaldo importado', mensaje: 'Se combinó con la información de este navegador.' });
      } catch (e) { toastError('No se pudo importar el respaldo', e, e.message); }
    });
  }
  const fijar = (k, n, extra) => {
    franja.querySelector(`[data-m="${k}"]`).innerHTML = `${entero(n)}<small> / ${total}${extra || ''}</small>`;
    franja.querySelector(`[data-b="${k}"]`).style.width = pct(k === 'pases' ? depsConPase : n);
  };
  fijar('cargadas', cargadas);
  fijar('validadas', validadas);
  franja.querySelector('[data-m="pases"]').innerHTML = `${entero(pases.length)}<small> · ${depsConPase}/${total}<span class="solo-ancho"> dependencias</span></small>`;
  franja.querySelector('[data-b="pases"]').style.width = pct(depsConPase);
  franja.querySelector('[data-b="cargadas"]').parentElement.setAttribute('aria-label', `${cargadas} de ${total} dependencias con formulación cargada`);
}

async function exportarRespaldo() {
  try {
    const r = await almacen.exportarRespaldo();
    descargarTexto(JSON.stringify(r, null, 2), `JP2027_respaldo_${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json`, 'application/json');
    await almacen.guardarMeta({ ultimoRespaldo: new Date().toISOString() });
    toast({ tipo: 'ok', titulo: 'Respaldo descargado', mensaje: 'Guárdelo en la carpeta compartida de la OAPDI.' });
  } catch (e) { toastError('No se pudo exportar el respaldo', e); }
}

// ───────── Enrutamiento ─────────
function idDesdeHash() {
  const h = decodeURIComponent(location.hash.replace('#', '')).split('/')[0];
  return VISTAS.some((v) => v.id === h) ? h : PESTANAS[0].id;
}

async function mostrar(id) {
  const vista = VISTAS.find((v) => v.id === id) || PESTANAS[0];
  if (actual === vista.id) return;
  const main = qs('#contenido');
  const anterior = actual ? qs(`#panel-${actual}`) : null;
  actual = vista.id;
  navegacion.marcar(vista.id);
  qs('#btn-escaner').classList.toggle('is-active', vista.id === 'escaner');
  qs('#btn-escaner').setAttribute('aria-current', vista.id === 'escaner' ? 'page' : 'false');
  document.body.classList.toggle('modo-escaner', vista.id === 'escaner');
  window.dispatchEvent(new Event('resize'));

  if (anterior) {
    const v = VISTAS.find((x) => `panel-${x.id}` === anterior.id);
    if (v && v.alOcultar) { try { v.alOcultar(); } catch (e) { console.error(e); } }
    anterior.classList.remove('panel-enter');
    anterior.hidden = true;
  }
  let panel = qs(`#panel-${vista.id}`);
  if (!panel) {
    panel = document.createElement('section');
    panel.id = `panel-${vista.id}`;
    panel.className = 'tab-panel';
    if (vista.id === 'escaner') panel.setAttribute('aria-label', 'Modo escáner');
    else { panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', `tab-${vista.id}`); panel.tabIndex = -1; }
    main.appendChild(panel);
  }
  panel.hidden = false;
  if (!montadas.has(vista.id)) {
    panel.innerHTML = skeletonPestana();
    try {
      await vista.montar(panel, ctx);
      montadas.add(vista.id);
    } catch (e) {
      console.error(e);
      panel.innerHTML = `<div class="container" style="padding:32px 0"><div class="notice notice-danger">${icono('alerta')}<div><strong>Esta sección no pudo cargarse.</strong><br>${esc(e.message || 'Error inesperado')}. Las demás pestañas siguen funcionando; recargue para intentarlo de nuevo.</div></div></div>`;
    }
  } else if (vista.alMostrar) {
    try { vista.alMostrar(); } catch (e) { console.error(e); }
  }
  activarAnimaciones(panel);
  panel.classList.remove('panel-enter');
  void panel.offsetWidth;
  panel.classList.add('panel-enter');
  document.title = `${vista.titulo} — Jornada de Planeación 2027`;
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

// ───────── Avisos de entorno ─────────
function avisosEntorno(origen, fechaEmpaquetado) {
  const empaquetados = Object.entries(origen).filter(([, o]) => o === 'empaquetado').map(([k]) => k);
  if (empaquetados.length) {
    toast({
      tipo: 'info',
      titulo: 'Abierto desde el disco',
      mensaje: `El navegador no permite leer /data con doble clic; se usa la copia empaquetada${fechaEmpaquetado ? ` del ${fechaCorta(fechaEmpaquetado.slice(0, 10))}` : ''}. Si actualizó los JSON, use «Cargar carpeta data» en el pie de página o sirva el sitio por HTTP.`,
      duracion: 11000
    });
    const pie = qs('#pie-datos');
    pie.innerHTML = `<button type="button" class="btn btn-sm btn-ghost">${icono('carpeta', 'icon-sm')}Cargar carpeta data</button><input type="file" webkitdirectory multiple hidden accept=".json">`;
    const input = pie.querySelector('input');
    pie.querySelector('button').addEventListener('click', () => input.click());
    input.addEventListener('change', async () => {
      try {
        const { datos, leidos } = await cargarDesdeArchivos(input.files, estado.datos);
        if (!leidos.length) { toast({ tipo: 'warn', titulo: 'No se encontraron archivos de datos', mensaje: 'Elija la carpeta data del proyecto.' }); return; }
        fijarDatos(datos, estado.origenDatos);
        toast({ tipo: 'ok', titulo: 'Datos actualizados', mensaje: `Se leyeron ${leidos.length} archivos. Recargando las pestañas…` });
        setTimeout(() => location.reload(), 900);
      } catch (e) { toastError('No se pudieron leer los archivos', e, e.message); }
    });
  }
  if (PERSISTENCIA.modo === 'local' && !almacen.persistente) {
    toast({ tipo: 'warn', titulo: 'Sin almacenamiento local', mensaje: 'Este navegador no permite guardar datos (modo privado). Exporte la información antes de cerrar.', duracion: 12000 });
  }
}

function errorFatal(e) {
  console.error(e);
  qs('#contenido').innerHTML = `<div class="container" style="padding:40px 0">
    <div class="empty">
      <div class="empty-art">${icono('alerta')}</div>
      <h2>No fue posible cargar los datos de la jornada</h2>
      <p>${esc(e.message || 'Error inesperado')}</p>
      <p class="muted">Si abrió el archivo con doble clic, verifique que existan <span class="mono">data/datos.bundle.js</span> y <span class="mono">dist/app.bundle.js</span>, o sirva la carpeta por HTTP (ver README).</p>
      <div class="btn-group" style="margin-top:8px"><button type="button" class="btn btn-primary" onclick="location.reload()">${icono('refrescar', 'icon-sm')}Reintentar</button></div>
    </div></div>`;
}

// ───────── Arranque ─────────
async function iniciar() {
  if (window.__ETITC_ARRANCADO__) return;
  window.__ETITC_ARRANCADO__ = true;

  window.addEventListener('error', (ev) => { if (ev.error) toastError('Ocurrió un error inesperado', ev.error); });
  window.addEventListener('unhandledrejection', (ev) => toastError('Una operación no terminó bien', ev.reason));

  iniciarTema();
  // Altura real de la barra superior (cambia con el ancho): la usan los elementos fijos al desplazar
  const medirBarra = () => document.documentElement.style.setProperty('--alto-barra', `${qs('.topbar').offsetHeight}px`);
  medirBarra();
  window.addEventListener('resize', medirBarra);
  navegacion = crearPestanas(qs('#pestanas'), PESTANAS, (id) => ctx.ir(id));

  let carga;
  try { carga = await cargarDatos(); } catch (e) { errorFatal(e); return; }
  fijarDatos(carga.datos, carga.origen);
  carga.problemas.forEach((p) => toast({ tipo: 'warn', titulo: `No se leyó ${p.ruta}`, mensaje: 'Esa sección se mostrará vacía. Revise que el archivo exista y sea JSON válido.' }));

  // En file:// el logo de la barra se sirve desde la copia empaquetada para que las capturas no se bloqueen
  obtenerLogo().catch(() => null);

  try { fijarConsolidado(await almacen.leerConsolidado()); } catch (e) { toastError('No se pudo leer la información guardada', e, e.message); }
  on('consolidado', pintarFranja);
  on('datos', pintarFranja);
  pintarFranja();

  qs('#contenido').innerHTML = '';
  window.addEventListener('hashchange', () => mostrar(idDesdeHash()));
  await mostrar(idDesdeHash());
  avisosEntorno(carga.origen, carga.fechaEmpaquetado);

  await esperarLibrerias();
  avisarLibreriasFaltantes();
  emitir('librerias');

  // Advertencia al cerrar si hay asistencia sin exportar
  window.addEventListener('beforeunload', (ev) => {
    const { asistencia, meta } = estado.consolidado;
    if (asistencia.length > (meta?.asistenciaExportada || 0)) { ev.preventDefault(); ev.returnValue = ''; }
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
else iniciar();
