/*
 * app.js — Arranque y enrutamiento de pestañas.
 *  1. Carga los datos de /data (con respaldo empaquetado en file://).
 *  2. Lee el respaldo local (descargas, pases y lecturas) y reintenta los envíos pendientes al registro en línea.
 *  3. Construye la navegación por hash: tres pestañas (Agenda, Plan de acción, Plan de necesidades),
 *     el lector de pases (#escaner) y el panel de la Oficina Asesora de Planeación (#admin).
 */
import { FEATURES } from './config.js';
import { almacen } from './storage.js';
import { estado, fijarDatos, fijarConsolidado, on, emitir } from './estado.js';
import { cargarDatos, cargarDesdeArchivos } from './lib/datos.js';
import { esperarLibrerias, avisarLibreriasFaltantes } from './lib/libs.js';
import { descargarTexto, obtenerLogo } from './lib/export.js';
import { vaciarCola } from './lib/remoto.js';
import { crearPestanas } from './ui/tabs.js';
import { toast, toastError } from './ui/toast.js';
import { skeletonPestana } from './ui/skeleton.js';
import { icono } from './ui/iconos.js';
import { esc, qs } from './ui/dom.js';
import { activarAnimaciones } from './ui/cards.js';
import { pestanaCalendario } from './tabs/calendario.js';
import { pestanaAccion } from './tabs/accion.js';
import { pestanaNecesidades } from './tabs/necesidades.js';
import { pestanaRiesgos } from './tabs/riesgos.js';
import { vistaEscaner } from './tabs/escaner.js';
import { vistaAdmin } from './tabs/admin.js';

const PESTANAS = [pestanaCalendario, pestanaAccion, pestanaNecesidades]
  .concat(FEATURES.mapaRiesgos ? [pestanaRiesgos] : []);
const VISTAS = [...PESTANAS, vistaEscaner, vistaAdmin];
const montadas = new Set();
let actual = null;
let navegacion = null;

const ctx = {
  almacen,
  ir: (id) => { if (location.hash !== `#${id}`) location.hash = id; else mostrar(id); },
  async refrescarConsolidado() {
    try { fijarConsolidado(await almacen.leerConsolidado()); } catch (e) { toastError('No se pudo leer la información guardada', e); }
  },
  riesgosActivo: FEATURES.mapaRiesgos,
  emitirIdentificacion: () => emitir('identificacion')
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

// ───────── Respaldo local (pie de página) ─────────
function pintarPie(origen, fechaEmpaquetado) {
  const pie = qs('#pie-acciones');
  const enDisco = Object.values(origen).includes('empaquetado');
  pie.innerHTML = `
    <button type="button" class="btn btn-sm btn-ghost" data-pie="respaldo">${icono('guardar', 'icon-sm')}Exportar respaldo</button>
    <button type="button" class="btn btn-sm btn-ghost" data-pie="importar">${icono('subir', 'icon-sm')}Importar respaldo</button>
    <input type="file" accept=".json,application/json" hidden data-pie-importar>
    <a class="btn btn-sm btn-ghost" href="#admin">${icono('baseDatos', 'icon-sm')}Panel OAP</a>
    ${enDisco ? `<button type="button" class="btn btn-sm btn-ghost" data-pie="carpeta">${icono('carpeta', 'icon-sm')}Cargar carpeta data</button><input type="file" webkitdirectory multiple hidden data-pie-carpeta>` : ''}`;
  pie.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-pie]');
    if (!b) return;
    if (b.dataset.pie === 'respaldo') {
      try {
        const r = await almacen.exportarRespaldo();
        descargarTexto(JSON.stringify(r, null, 2), `JP2027_respaldo_${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json`, 'application/json');
        await almacen.guardarMeta({ ultimoRespaldo: new Date().toISOString() });
        toast({ tipo: 'ok', titulo: 'Respaldo descargado', mensaje: 'Contiene las descargas, los pases y las lecturas guardados en este navegador.' });
      } catch (e) { toastError('No se pudo exportar el respaldo', e); }
    }
    if (b.dataset.pie === 'importar') pie.querySelector('[data-pie-importar]').click();
    if (b.dataset.pie === 'carpeta') pie.querySelector('[data-pie-carpeta]').click();
  });
  pie.querySelector('[data-pie-importar]').addEventListener('change', async (ev) => {
    const f = ev.target.files[0];
    ev.target.value = '';
    if (!f) return;
    try {
      await almacen.importarRespaldo(JSON.parse(await f.text()));
      await ctx.refrescarConsolidado();
      toast({ tipo: 'ok', titulo: 'Respaldo importado', mensaje: 'Se combinó con la información de este navegador.' });
    } catch (e) { toastError('No se pudo importar el respaldo', e, e.message); }
  });
  const carpeta = pie.querySelector('[data-pie-carpeta]');
  if (carpeta) carpeta.addEventListener('change', async () => {
    try {
      const { datos, leidos } = await cargarDesdeArchivos(carpeta.files, estado.datos);
      if (!leidos.length) { toast({ tipo: 'warn', titulo: 'No se encontraron archivos de datos', mensaje: 'Elija la carpeta data del proyecto.' }); return; }
      fijarDatos(datos);
      toast({ tipo: 'ok', titulo: 'Datos actualizados', mensaje: `Se leyeron ${leidos.length} archivos. Recargando…` });
      setTimeout(() => location.reload(), 900);
    } catch (e) { toastError('No se pudieron leer los archivos', e, e.message); }
  });
  if (enDisco) {
    toast({ tipo: 'info', titulo: 'Abierto desde el disco', mensaje: `Se usa la copia empaquetada de los datos${fechaEmpaquetado ? ` (${fechaEmpaquetado.slice(0, 10)})` : ''}. Para la jornada publique el sitio en GitHub Pages.`, duracion: 9000 });
  }
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
    if (vista.id === 'escaner' || vista.id === 'admin') panel.setAttribute('aria-label', vista.titulo);
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
  const medirBarra = () => document.documentElement.style.setProperty('--alto-barra', `${qs('.topbar').offsetHeight}px`);
  medirBarra();
  window.addEventListener('resize', medirBarra);
  navegacion = crearPestanas(qs('#pestanas'), PESTANAS, (id) => ctx.ir(id));

  let carga;
  try { carga = await cargarDatos(); } catch (e) { errorFatal(e); return; }
  fijarDatos(carga.datos, carga.origen);
  carga.problemas.forEach((p) => toast({ tipo: 'warn', titulo: `No se leyó ${p.ruta}`, mensaje: 'Esa sección se mostrará vacía. Revise que el archivo exista y sea JSON válido.' }));
  obtenerLogo().catch(() => null);

  try { fijarConsolidado(await almacen.leerConsolidado()); } catch (e) { toastError('No se pudo leer la información guardada', e, e.message); }
  vaciarCola();

  qs('#contenido').innerHTML = '';
  window.addEventListener('hashchange', () => mostrar(idDesdeHash()));
  await mostrar(idDesdeHash());
  pintarPie(carga.origen, carga.fechaEmpaquetado);
  if (!almacen.persistente) toast({ tipo: 'warn', titulo: 'Sin almacenamiento local', mensaje: 'Este navegador no permite guardar datos (modo privado). Exporte la información antes de cerrar.', duracion: 12000 });

  await esperarLibrerias();
  avisarLibreriasFaltantes();
  emitir('librerias');

  window.addEventListener('beforeunload', (ev) => {
    const { asistencia, meta } = estado.consolidado;
    if (!estado.datos?.config?.registro?.url && asistencia.length > (meta?.asistenciaExportada || 0)) { ev.preventDefault(); ev.returnValue = ''; }
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
else iniciar();

export { on };
