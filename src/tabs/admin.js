/*
 * admin.js — Panel de la Oficina Asesora de Planeación (vista #admin, enlace en el pie de página).
 * Con la clave de administración lee el registro en línea: quién descargó la plantilla, desde qué proceso y área y a
 * qué hora, quién cargará en el SUIE, y cada lectura de QR por lector y por actividad. Sin registro en línea muestra
 * los datos de este dispositivo. Todo se exporta a Excel.
 */
import { estado, procesos, area as areaPorId, nombreDependencia } from '../estado.js';

// Proceso de un registro: el de su área funcional; los registros sin área quedan aparte
const procesoDe = (x) => areaPorId(x.area)?.proceso || x.proceso || 'Sin área funcional';
const lugarDe = (x) => (x.area && areaPorId(x.area) ? `${areaPorId(x.area).proceso}, ${x.areaNombre || areaPorId(x.area).nombre}` : (x.areaNombre || nombreDependencia(x.dependencia)));
import { esc, on } from '../ui/dom.js';
import { icono } from '../ui/iconos.js';
import { toast, toastError } from '../ui/toast.js';
import { barrasHorizontales, activarAnimaciones } from '../ui/cards.js';
import { leerPanel, remotoConfigurado, pendientes } from '../lib/remoto.js';
import { exportarExcel, xlsxDisponible } from '../lib/excel.js';
import { descargarBlob, obtenerLogo } from '../lib/export.js';
import { hoyISO } from '../lib/fechas.js';
import { entero } from '../lib/formato.js';

let raiz = null;
let datos = null;

const fecha = (iso) => (iso ? new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : '');
const RES = { ok: 'Ingreso', duplicado: 'Repetida', rechazo: 'Rechazo' };

function normalizarRemoto(j) {
  return {
    origen: 'Registro en línea',
    descargas: (j.descargas || []).map((d) => ({ ...d, responsableSuie: d.responsableSuie || { nombre: d.suieNombre, correo: d.suieCorreo } })),
    lecturas: (j.lecturas || []).map((l) => ({ ...l, lector: l.lector || { nombre: l.lectorNombre, correo: l.lectorCorreo }, actividad: l.actividad || { titulo: l.actividadTitulo, id: l.actividadId } }))
  };
}
function datosLocales() {
  return { origen: 'Este dispositivo', descargas: estado.consolidado.descargas, lecturas: estado.consolidado.asistencia };
}

function pintarPanel() {
  const d = datos;
  const unicas = new Map();
  d.descargas.forEach((x) => { if (!unicas.has(x.correo)) unicas.set(x.correo, x); });
  const personas = [...unicas.values()];
  const procs = new Set(personas.map(procesoDe));
  const reales = d.lecturas.filter((l) => !(l.prueba === true || l.prueba === 'Sí'));
  const ok = reales.filter((l) => l.resultado === 'ok');
  const porLector = new Map();
  reales.forEach((l) => {
    const k = l.lector?.nombre || 'Sin lector';
    if (!porLector.has(k)) porLector.set(k, { ok: 0, duplicado: 0, rechazo: 0 });
    porLector.get(k)[l.resultado] = (porLector.get(k)[l.resultado] || 0) + 1;
  });
  const porActividad = new Map();
  ok.forEach((l) => { const k = l.actividad?.titulo || 'Sin actividad'; porActividad.set(k, (porActividad.get(k) || 0) + 1); });
  const sinDescarga = procesos().filter((x) => !procs.has(x));
  raiz.querySelector('[data-panel]').innerHTML = `
    <p class="field-hint">Fuente: <strong>${esc(d.origen)}</strong>${remotoConfigurado() && pendientes() ? ` · ${pendientes()} envíos pendientes en este dispositivo` : ''}</p>
    <div class="cifras-mini cifras-admin">
      <div class="cifra-mini"><strong>${entero(personas.length)}</strong><span>Personas que descargaron</span></div>
      <div class="cifra-mini"><strong>${entero(procesos().filter((x) => procs.has(x)).length)}/${entero(procesos().length)}</strong><span>Procesos con descarga</span></div>
      <div class="cifra-mini"><strong>${entero(ok.length)}</strong><span>Ingresos leídos</span></div>
      <div class="cifra-mini"><strong>${entero(porLector.size)}</strong><span>Lectores con lecturas</span></div>
    </div>
    <div class="grid-2">
      <section class="card"><h3>Descargas por proceso</h3>${barrasHorizontales([...procesos(), 'Sin área funcional'].map((x) => ({ etiqueta: x, valor: personas.filter((p) => procesoDe(p) === x).length })).filter((i) => i.valor).sort((a, b) => b.valor - a.valor)) || '<p class="muted">Sin descargas.</p>'}
        ${sinDescarga.length ? `<p class="field-hint" style="margin-top:12px"><strong>Sin descarga todavía:</strong> ${sinDescarga.map((x) => esc(x)).join(', ')}</p>` : ''}</section>
      <section class="card"><h3>Lecturas por lector</h3>
        <ul class="recientes">${[...porLector.entries()].sort((a, b) => b[1].ok - a[1].ok).map(([n, c]) => `<li><span class="mono">${entero(c.ok)}</span><span><strong>${esc(n)}</strong></span><span class="badge">${entero(c.duplicado || 0)} rep. · ${entero(c.rechazo || 0)} rech.</span></li>`).join('') || '<li class="muted">Sin lecturas.</li>'}</ul>
        <h3 style="margin-top:16px">Ingresos por actividad</h3>
        ${barrasHorizontales([...porActividad.entries()].map(([k, v]) => ({ etiqueta: k, valor: v })).sort((a, b) => b.valor - a.valor)) || '<p class="muted">Sin ingresos.</p>'}</section>
    </div>
    <section class="card"><div class="card-head"><div><h3 class="mb-0">Quién descargó</h3><p>Una fila por persona, con su primera descarga.</p></div></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Nombre</th><th>Proceso y área</th><th>Carga en el SUIE</th><th>Pase</th></tr></thead>
      <tbody>${personas.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))).slice(0, 300).map((p) => `<tr><td class="nowrap">${esc(fecha(p.fecha))}</td><td><strong>${esc(p.nombre)}</strong><br><span class="muted">${esc(p.correo)}${p.verificado === false || p.verificado === 'No' ? ' · no verificado' : ''}</span></td><td>${esc(lugarDe(p))}</td><td>${esc(p.responsableSuie?.nombre || '')}<br><span class="muted">${esc(p.responsableSuie?.correo || '')}</span></td><td class="mono">${esc(p.paseId || '')}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">Sin descargas.</td></tr>'}</tbody></table></div></section>`;
  activarAnimaciones(raiz);
}

async function exportar() {
  if (!datos) return;
  try {
    const logo = await obtenerLogo();
    const r = exportarExcel({
      nombreArchivo: `JP2027_Panel_${hoyISO()}.xlsx`,
      logo: logo.bytes,
      hojas: [
        { nombre: 'Descargas', titulo: 'Descargas de la Plantilla Plan de Acción 2027', subtitulo: `${datos.descargas.length} registros · ${datos.origen}`,
          columnas: [{ titulo: 'Fecha y hora', ancho: 20 }, { titulo: 'Nombre', ancho: 32 }, { titulo: 'Cargo', ancho: 30 }, { titulo: 'Correo', ancho: 30 }, { titulo: 'Proceso', ancho: 36 }, { titulo: 'Área funcional', ancho: 30 }, { titulo: 'Responsable del cargue en el SUIE', ancho: 30 }, { titulo: 'Correo del responsable', ancho: 30 }, { titulo: 'Pase', ancho: 18 }, { titulo: 'Verificado', ancho: 10 }, { titulo: 'Repetida', ancho: 10 }, { titulo: 'Dispositivo', ancho: 18 }],
          filas: datos.descargas.map((x) => [fecha(x.fecha), x.nombre, x.cargo, x.correo, procesoDe(x), x.areaNombre || '', x.responsableSuie?.nombre || '', x.responsableSuie?.correo || '', x.paseId || '', x.verificado === false || x.verificado === 'No' ? 'No' : 'Sí', x.repetida === true || x.repetida === 'Sí' ? 'Sí' : 'No', x.dispositivo || ''])
        },
        { nombre: 'Lecturas', titulo: 'Lecturas de pases QR', subtitulo: `${datos.lecturas.length} lecturas · ${datos.origen}`,
          columnas: [{ titulo: 'Fecha y hora', ancho: 20 }, { titulo: 'Resultado', ancho: 12 }, { titulo: 'Actividad', ancho: 40 }, { titulo: 'Lector', ancho: 26 }, { titulo: 'Participante', ancho: 32 }, { titulo: 'Proceso y área', ancho: 36 }, { titulo: 'Correo', ancho: 30 }, { titulo: 'Pase', ancho: 18 }, { titulo: 'Método', ancho: 12 }, { titulo: 'Prueba', ancho: 8 }],
          filas: datos.lecturas.map((l) => [fecha(l.hora), RES[l.resultado] || l.resultado, l.actividad?.titulo || '', l.lector?.nombre || '', l.nombre || '', l.area || l.dependencia ? lugarDe(l) : '', l.correo || '', l.paseId || '', l.metodo || '', l.prueba === true || l.prueba === 'Sí' ? 'Sí' : 'No'])
        }
      ]
    });
    descargarBlob(r.blob, r.nombre);
  } catch (e) { toastError('No se pudo exportar', e, e.message); }
}

function montar(panel) {
  raiz = panel;
  panel.innerHTML = `<div class="container page page-app">
    <header class="app-hero">
      <span class="eyebrow">${icono('baseDatos', 'icon-sm')}Oficina Asesora de Planeación</span>
      <h1>Panel de seguimiento</h1>
      <p class="lead">Descargas de la plantilla por proceso y lecturas de los pases por lector y por actividad.</p>
    </header>
    <form class="card card-tight row" data-clave>
      <label class="field" style="flex:1;min-width:220px"><span class="field-label">Clave de administración</span><input class="input" type="password" name="clave" autocomplete="current-password" ${remotoConfigurado() ? '' : 'disabled placeholder="Registro en línea sin configurar"'}></label>
      <div class="btn-group" style="align-self:flex-end">
        <button type="submit" class="btn btn-primary" ${remotoConfigurado() ? '' : 'disabled'}>${icono('refrescar', 'icon-sm')}Consultar en línea</button>
        <button type="button" class="btn" data-local>Ver este dispositivo</button>
        <button type="button" class="btn" data-exportar ${xlsxDisponible() ? '' : 'disabled'}>${icono('excel', 'icon-sm')}Excel</button>
      </div>
    </form>
    <div data-panel></div>
  </div>`;
  panel.querySelector('[data-clave]').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const clave = ev.target.elements.clave.value;
    try {
      raiz.querySelector('[data-panel]').innerHTML = '<div class="skeleton skeleton-card"></div>';
      datos = normalizarRemoto(await leerPanel(clave));
      pintarPanel();
    } catch (e) { toast({ tipo: 'error', titulo: 'No se pudo consultar', mensaje: e.message }); datos = datosLocales(); pintarPanel(); }
  });
  on(panel, 'click', '[data-local]', () => { datos = datosLocales(); pintarPanel(); });
  on(panel, 'click', '[data-exportar]', exportar);
  datos = datosLocales();
  pintarPanel();
}

export const vistaAdmin = {
  id: 'admin',
  titulo: 'Panel de seguimiento',
  icono: 'baseDatos',
  montar,
  alMostrar() { if (datos && datos.origen === 'Este dispositivo') { datos = datosLocales(); pintarPanel(); } }
};
