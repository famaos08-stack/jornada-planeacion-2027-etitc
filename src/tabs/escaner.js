/*
 * escaner.js — Modo escáner (vista aparte, pensada para celular o tableta el día de la jornada).
 * Lee el QR del pase con la cámara trasera (html5-qrcode), verifica la firma, registra la asistencia y muestra
 * a pantalla completa por tres segundos: confirmación verde, aviso ámbar si ya ingresó o rechazo rojo.
 * Respaldo manual: código del pase o búsqueda por nombre o correo en el directorio (queda marcado «sin pase»).
 * La asistencia se guarda en este dispositivo y, con Microsoft 365, también en la lista de SharePoint.
 * El panel «Registros» muestra qué áreas ya registraron su Plan de acción y su Plan de necesidades.
 */
import { estado, on as alEvento, dependencia, dependencias, buscarPersonas, personasPorCorreo, nombreDependencia, area as areaPorId, areas } from '../estado.js';
import { esc, on } from '../ui/dom.js';
import { icono } from '../ui/iconos.js';
import { toast, toastError } from '../ui/toast.js';
import { confirmar } from '../ui/modal.js';
import { barrasHorizontales, animarNumero, activarAnimaciones } from '../ui/cards.js';
import { verificarPase } from '../lib/qr.js';
import { exportarExcel, xlsxDisponible } from '../lib/excel.js';
import { descargarBlob, obtenerLogo } from '../lib/export.js';
import { normalizar, tituloLegible, entero, iniciales } from '../lib/formato.js';
import { hoyISO, fechaCorta } from '../lib/fechas.js';
import { registrarAsistenciaEnLinea, leerRegistrosPanel, microsoftListo } from '../lib/registro.js';

let raiz = null;
let ctxApp = null;
let lector = null;
let camaraActiva = false;
let ultimoTexto = { texto: '', t: 0 };
let overlayTimer = null;
let modo = 'camara';

const segundos = () => estado.datos.config?.umbrales?.segundosConfirmacionEscaner || 3;
const horaCorta = (iso) => new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });

function buscarDuplicado(r) {
  return estado.consolidado.asistencia.find((x) => (r.paseId && x.paseId === r.paseId)
    || (r.personaId && x.personaId === r.personaId)
    || (r.correo && x.correo === r.correo && normalizar(x.nombre) === normalizar(r.nombre))
    || (!r.correo && !r.personaId && normalizar(x.nombre) === normalizar(r.nombre) && String(x.dependencia) === String(r.dependencia)));
}

async function registrar(r) {
  const dup = buscarDuplicado(r);
  if (dup) { mostrarOverlay('duplicado', { ...dup, intento: r }); return false; }
  const registro = {
    ...r,
    clave: r.paseId ? `P:${r.paseId}` : r.personaId ? `D:${r.personaId}` : `M:${normalizar(r.nombre)}:${r.dependencia}`,
    hora: new Date().toISOString(),
    depNombre: nombreDependencia(r.dependencia)
  };
  try {
    await ctxApp.almacen.guardarAsistencia(registro);
    await ctxApp.refrescarConsolidado();
  } catch (e) {
    toastError('No se pudo guardar el registro', e, e.message);
    return false;
  }
  mostrarOverlay('ok', registro);
  // En SharePoint sin detener la fila de ingreso; si falla queda en el dispositivo para exportar
  registrarAsistenciaEnLinea(registro).catch((e) => toastError('La asistencia quedó en el dispositivo, pero no llegó a SharePoint', e, e.message));
  return true;
}

// ───────── Pantalla completa de resultado ─────────
function mostrarOverlay(tipo, datos) {
  const ov = raiz.querySelector('[data-overlay]');
  clearTimeout(overlayTimer);
  const d = dependencia(datos.dependencia);
  const a = datos.area ? areaPorId(datos.area) : null;
  const lugar = a ? `${esc(a.id)} · ${esc(a.nombre)}` : `${esc(datos.dependencia)} · ${esc(d?.nombre || '')}`;
  const metodo = { QR: 'con QR', codigo: 'con código del pase', manual: 'manual sin pase' }[datos.metodo] || 'manual';
  const contenido = {
    ok: `<span class="ov-icono">${icono('check')}</span><span class="ov-estado">Bienvenido</span>
      <strong class="ov-nombre">${esc(datos.nombre)}</strong><span class="ov-cargo">${esc(datos.cargo || '')}</span>
      <span class="ov-dep">${lugar}</span><span class="ov-metodo">Registro ${metodo} · ${esc(horaCorta(datos.hora))}</span>`,
    duplicado: `<span class="ov-icono">${icono('alerta')}</span><span class="ov-estado">Ya registrado</span>
      <strong class="ov-nombre">${esc(datos.nombre)}</strong><span class="ov-dep">${lugar}</span>
      <span class="ov-primera">Primer ingreso a las <b>${esc(horaCorta(datos.hora))}</b> (${metodo})</span>`,
    rechazo: `<span class="ov-icono">${icono('cerrar')}</span><span class="ov-estado">Pase no válido</span>
      <strong class="ov-nombre">${esc(datos.motivo || 'El código no es un pase de la jornada.')}</strong>
      ${datos.nombre ? `<span class="ov-cargo">A nombre de: ${esc(datos.nombre)}</span>` : ''}<span class="ov-metodo">Sin pase válido no hay ingreso: la persona debe registrar el Plan de acción de su área.</span>`
  }[tipo];
  ov.className = `escaner-overlay is-${tipo} is-open`;
  ov.innerHTML = `<div class="ov-cuerpo">${contenido}<span class="ov-barra" style="animation-duration:${segundos()}s"></span><span class="ov-toque">Toque para continuar</span></div>`;
  if (navigator.vibrate) { try { navigator.vibrate(tipo === 'ok' ? 80 : [60, 60, 60]); } catch { /* opcional */ } }
  overlayTimer = setTimeout(cerrarOverlay, segundos() * 1000);
}

function cerrarOverlay() {
  clearTimeout(overlayTimer);
  const ov = raiz.querySelector('[data-overlay]');
  if (!ov.classList.contains('is-open')) return;
  ov.classList.remove('is-open');
  if (lector && camaraActiva) { try { lector.resume(); } catch { /* ya reanudado */ } }
}

// ───────── Cámara ─────────
async function alLeer(texto) {
  const ahora = Date.now();
  if (texto === ultimoTexto.texto && ahora - ultimoTexto.t < 4000) return;
  if (raiz.querySelector('[data-overlay]').classList.contains('is-open')) return;
  ultimoTexto = { texto, t: ahora };
  if (lector && camaraActiva) { try { lector.pause(true); } catch { /* sin pausa */ } }
  procesarTexto(texto);
}

async function procesarTexto(texto) {
  const v = verificarPase(texto, { sal: estado.indices.sal, prefijo: estado.indices.prefijo, dependenciasValidas: new Set(dependencias().map((d) => String(d.codigo))) });
  if (!v.valido) { mostrarOverlay('rechazo', { motivo: v.motivo, nombre: v.pase?.n }); return; }
  const p = v.pase;
  const persona = personasPorCorreo(p.e).find((x) => !x.nombre || x.nombre === p.n) || null;
  await registrar({ paseId: p.id, personaId: persona?.id || null, nombre: p.n, cargo: p.c, dependencia: String(p.d), area: p.a || '', correo: p.e || '', metodo: 'QR' });
}

async function iniciarCamara() {
  const zona = raiz.querySelector('[data-camara-estado]');
  if (!window.Html5Qrcode) {
    zona.innerHTML = `<div class="notice notice-danger">${icono('alerta')}<div><strong>El lector de QR no cargó.</strong> Use el registro manual o recargue con conexión.</div></div>`;
    return;
  }
  try {
    if (!lector) lector = new window.Html5Qrcode('lector-qr', { verbose: false });
    zona.innerHTML = `<span class="spinner" aria-hidden="true"></span> Solicitando permiso de cámara…`;
    await lector.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: (w, h) => { const s = Math.floor(Math.min(w, h) * 0.72); return { width: s, height: s }; }, aspectRatio: 1 },
      alLeer,
      () => {}
    );
    camaraActiva = true;
    raiz.querySelector('[data-visor]').classList.add('is-activo');
    zona.innerHTML = `<span class="pulse" aria-hidden="true"></span> Cámara activa: apunte al QR del pase`;
    pintarBotonesCamara();
  } catch (e) {
    console.error(e);
    camaraActiva = false;
    const msg = String(e?.message || e);
    zona.innerHTML = `<div class="notice notice-danger">${icono('camara')}<div><strong>No se pudo abrir la cámara.</strong> ${/permission|NotAllowed/i.test(msg) ? 'Se negó el permiso: actívelo en la configuración del navegador.' : /secure|https/i.test(msg) ? 'La cámara requiere HTTPS (GitHub Pages) o localhost.' : 'Verifique que ninguna otra aplicación la esté usando.'} También puede leer el QR desde una foto o usar el registro manual.</div></div>`;
    pintarBotonesCamara();
  }
}

async function detenerCamara() {
  if (lector && camaraActiva) { try { await lector.stop(); } catch { /* ya detenida */ } }
  camaraActiva = false;
  if (raiz) {
    raiz.querySelector('[data-visor]').classList.remove('is-activo');
    raiz.querySelector('[data-camara-estado]').textContent = 'Cámara detenida.';
    pintarBotonesCamara();
  }
}

function pintarBotonesCamara() {
  const b = raiz.querySelector('[data-camara-toggle]');
  b.innerHTML = camaraActiva ? `${icono('cerrar', 'icon-sm')}Detener cámara` : `${icono('camara', 'icon-sm')}Iniciar cámara`;
  b.classList.toggle('btn-primary', !camaraActiva);
}

async function leerFoto(archivo) {
  if (!window.Html5Qrcode) { toast({ tipo: 'warn', titulo: 'Lector no disponible', mensaje: 'Use el registro manual.' }); return; }
  try {
    const estabaActiva = camaraActiva;
    if (estabaActiva) await detenerCamara();
    const tmp = new window.Html5Qrcode('lector-archivo', { verbose: false });
    const texto = await tmp.scanFile(archivo, false);
    try { tmp.clear(); } catch { /* sin acción */ }
    await procesarTexto(texto);
  } catch (e) {
    console.error(e);
    mostrarOverlay('rechazo', { motivo: 'No se encontró un código QR legible en la foto.' });
  }
}

// ───────── Manual ─────────
function pintarResultadosManual(texto) {
  const cont = raiz.querySelector('[data-resultados-manual]');
  const t = texto.trim();
  if (t.length < 2) { cont.innerHTML = '<p class="muted" style="font-size:.86rem">Escriba el código del pase (JP27-…) o al menos dos letras del nombre o del correo.</p>'; return; }
  // Código del pase dictado o leído del correo
  const codigo = t.toUpperCase().replace(/\s+/g, '');
  if (/^[A-Z0-9]+-\d{3}-[A-Z0-9]{3,5}$/.test(codigo) || codigo.startsWith(`${estado.indices.prefijo}-`)) {
    const pase = estado.consolidado.pases.find((x) => x.id === codigo);
    const a = pase?.a ? areaPorId(pase.a) : null;
    cont.innerHTML = pase
      ? `<ul class="manual-lista"><li class="manual-item"><span class="avatar avatar-sm" aria-hidden="true">${esc(iniciales(pase.n))}</span>
          <div class="manual-info"><strong>${esc(pase.n)}</strong><span>${esc(pase.c)}</span><span class="badge badge-ok">${esc(pase.id)}${a ? ` · ${esc(a.nombre)}` : ''}</span></div>
          ${buscarDuplicado({ paseId: pase.id }) ? '<span class="badge badge-warn">Ya ingresó</span>' : `<button type="button" class="btn btn-primary btn-sm" data-registrar-pase="${esc(pase.id)}">Registrar</button>`}</li></ul>`
      : `<div class="notice">${icono('info')}<div>Ese código no se emitió en este dispositivo${microsoftListo() ? '' : ' (sin Microsoft 365 cada equipo ve solo sus pases)'}. Pida a la persona que muestre el QR de su correo.</div></div>`;
    return;
  }
  const lista = buscarPersonas(t, 10);
  cont.innerHTML = lista.length ? `<ul class="manual-lista">${lista.map((p) => {
    const d = dependencia(p.dependencia);
    const nombre = p.nombre || 'Sin nombre en el directorio';
    const ya = buscarDuplicado({ personaId: p.id, nombre, correo: p.correo, dependencia: p.dependencia });
    return `<li class="manual-item">
      <span class="avatar avatar-sm" aria-hidden="true">${esc(iniciales(nombre))}</span>
      <div class="manual-info"><strong>${esc(nombre)}</strong><span>${esc(tituloLegible(p.cargo))}</span>
        <span class="row" style="gap:6px"><span class="badge proc-${esc(d?.tipoProceso || '')}"><span class="proc-dot"></span>${esc(p.dependencia)} · ${esc(d?.sigla || '')}</span>${p.correo ? `<span class="badge">${esc(p.correo)}</span>` : '<span class="badge badge-warn">Sin correo: solo registro manual</span>'}</span></div>
      ${ya ? `<span class="badge badge-warn">Ingresó ${esc(horaCorta(ya.hora))}</span>` : `<button type="button" class="btn btn-sm" data-registrar="${esc(p.id)}">Registrar sin pase</button>`}
    </li>`;
  }).join('')}</ul>` : `<div class="empty" style="padding:24px 12px"><p>No hay coincidencias en el directorio. Use el formulario de abajo para registrar a la persona.</p></div>`;
}

async function registrarManual(personaId) {
  const p = (estado.datos.directorio?.personas || []).find((x) => x.id === personaId);
  if (!p) return;
  const pase = estado.consolidado.pases.find((x) => x.e && x.e === p.correo);
  if (pase) { await registrarConPase(pase); return; }
  const seguir = await confirmar({ titulo: 'Ingreso sin pase', mensaje: 'Esta persona no presenta pase. Solo registre su ingreso si la Oficina Asesora de Planeación lo autoriza: quedará marcado como «sin pase».', aceptar: 'Registrar sin pase' });
  if (!seguir) return;
  let nombre = p.nombre;
  if (!nombre) {
    nombre = (window.prompt('El directorio no registra el nombre de esta persona. Escríbalo:') || '').trim();
    if (!nombre) return;
  }
  const ok = await registrar({ paseId: null, personaId: p.id, nombre, cargo: tituloLegible(p.cargo), dependencia: String(p.dependencia), correo: p.correo || '', metodo: 'manual' });
  if (ok) pintarResultadosManual(raiz.querySelector('#busqueda-manual').value);
}

async function registrarConPase(pase) {
  const persona = personasPorCorreo(pase.e).find((x) => !x.nombre || x.nombre === pase.n) || null;
  const ok = await registrar({ paseId: pase.id, personaId: persona?.id || null, nombre: pase.n, cargo: pase.c, dependencia: String(pase.d), area: pase.a || '', correo: pase.e || '', metodo: 'codigo' });
  if (ok) pintarResultadosManual(raiz.querySelector('#busqueda-manual').value);
}

// ───────── Contador y lista ─────────
function pintarContador() {
  if (!raiz) return;
  const lista = estado.consolidado.asistencia;
  const n = raiz.querySelector('[data-contador]');
  animarNumero(n, lista.length, 500);
  raiz.querySelector('[data-contador-pie]').textContent = `${new Set(lista.map((a) => a.area || a.dependencia)).size} áreas · ${lista.filter((a) => a.metodo === 'QR' || a.metodo === 'codigo').length} con pase · ${lista.filter((a) => a.metodo === 'manual').length} sin pase`;
  const items = dependencias().map((d) => ({ etiqueta: `${d.codigo} · ${d.sigla}`, valor: lista.filter((a) => String(a.dependencia) === String(d.codigo)).length, clase: `proc-${d.tipoProceso}`, proc: true }))
    .filter((i) => i.valor > 0).sort((a, b) => b.valor - a.valor);
  raiz.querySelector('[data-desglose]').innerHTML = items.length ? barrasHorizontales(items) : '<p class="muted mb-0">Aún no hay asistentes registrados.</p>';
  const recientes = [...lista].sort((a, b) => b.hora.localeCompare(a.hora)).slice(0, 6);
  raiz.querySelector('[data-recientes]').innerHTML = recientes.length ? recientes.map((a) => `<li><span class="mono">${esc(horaCorta(a.hora))}</span><span><strong>${esc(a.nombre)}</strong> · ${esc(a.area ? areaPorId(a.area)?.nombre || a.area : dependencia(a.dependencia)?.sigla || a.dependencia)}</span><span class="badge ${a.metodo === 'manual' ? 'badge-warn' : 'badge-ok'}">${{ QR: 'QR', codigo: 'Código' }[a.metodo] || 'Sin pase'}</span></li>`).join('') : '<li class="muted">Sin registros todavía.</li>';
  const sinExportar = lista.length - (estado.consolidado.meta?.asistenciaExportada || 0);
  raiz.querySelector('[data-sin-exportar]').textContent = sinExportar > 0 ? `${sinExportar} ${sinExportar === 1 ? 'registro sin exportar' : 'registros sin exportar'}` : 'Todo exportado';
  raiz.querySelector('[data-aviso-export]').classList.toggle('is-pendiente', sinExportar > 0);
}

async function exportarAsistencia() {
  const lista = [...estado.consolidado.asistencia].sort((a, b) => a.hora.localeCompare(b.hora));
  if (!lista.length) { toast({ tipo: 'warn', titulo: 'Sin registros', mensaje: 'Aún no hay asistencia para exportar.' }); return; }
  try {
    const logo = await obtenerLogo();
    const r = exportarExcel({
      nombreArchivo: `JP2027_Asistencia_${hoyISO()}_${new Date().toTimeString().slice(0, 5).replace(':', '')}.xlsx`,
      logo: logo.bytes,
      hojas: [{
        nombre: 'Asistencia', titulo: 'Lista de asistencia — Jornada de Planeación 2027', subtitulo: `${entero(lista.length)} asistentes registrados en este dispositivo`,
        columnas: [{ titulo: 'Nombre', ancho: 36 }, { titulo: 'Cargo', ancho: 36 }, { titulo: 'Área funcional', ancho: 40 }, { titulo: 'Dependencia', ancho: 44 }, { titulo: 'Código de dependencia', ancho: 14 }, { titulo: 'Correo', ancho: 34 }, { titulo: 'Código del pase', ancho: 20 }, { titulo: 'Hora de ingreso', ancho: 22 }, { titulo: 'Método de registro', ancho: 18 }],
        filas: lista.map((a) => [a.nombre, a.cargo, a.area ? `${a.area} · ${areaPorId(a.area)?.nombre || ''}` : '', nombreDependencia(a.dependencia), a.dependencia, a.correo, a.paseId || '', new Date(a.hora).toLocaleString('es-CO'), { QR: 'QR', codigo: 'Código del pase' }[a.metodo] || 'Manual sin pase'])
      }]
    });
    descargarBlob(r.blob, r.nombre);
    await ctxApp.almacen.guardarMeta({ asistenciaExportada: lista.length });
    await ctxApp.refrescarConsolidado();
    toast({ tipo: 'ok', titulo: 'Asistencia exportada', mensaje: `${lista.length} registros en ${r.nombre}` });
  } catch (e) { toastError('No se pudo exportar la asistencia', e, e.message); }
}

// ───────── Registros por área (panel de la OAP) ─────────
let registrosCache = null;
async function pintarRegistros(forzar = false) {
  const caja = raiz.querySelector('[data-registros]');
  if (!registrosCache || forzar) {
    caja.innerHTML = '<div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line" style="width:70%"></div>';
    try { registrosCache = await leerRegistrosPanel(); } catch (e) { caja.innerHTML = `<div class="notice notice-danger">${icono('alerta')}<div>${esc(e.message)}</div></div>`; return; }
  }
  const vigente = (tipo, id) => registrosCache.filter((r) => r.tipo === tipo && r.area?.id === id).sort((x, y) => String(y.fecha).localeCompare(String(x.fecha)))[0];
  const filas = areas().map((a) => ({ a, pa: vigente('accion', a.id), pn: vigente('necesidades', a.id) }));
  const nPa = filas.filter((f) => f.pa).length;
  const nPn = filas.filter((f) => f.pn).length;
  raiz.querySelector('[data-origen-registros]').textContent = `Fuente: ${microsoftListo() ? 'SharePoint (todas las áreas)' : 'este navegador'} · ${registrosCache.length} registros`;
  const celda = (r) => (r ? `<a class="badge badge-ok" ${r.enlace ? `href="${esc(r.enlace)}" target="_blank" rel="noopener"` : ''} title="${esc(r.responsable?.nombre || '')} · ${esc(fechaCorta(String(r.fecha).slice(0, 10)))}">${icono('check', 'icon-sm')}${esc(fechaCorta(String(r.fecha).slice(0, 10)).replace(/ \d{4}$/, ''))}</a>` : '<span class="badge">Pendiente</span>');
  caja.innerHTML = `<div class="avance-areas">
      <div><strong>${nPa}/${filas.length}</strong><span>con Plan de acción</span><span class="pbar"><span style="width:${(nPa / filas.length) * 100}%"></span></span></div>
      <div><strong>${nPn}/${filas.length}</strong><span>con Plan de necesidades</span><span class="pbar gold"><span style="width:${(nPn / filas.length) * 100}%"></span></span></div>
    </div>
    <ul class="areas-lista">${filas.map(({ a, pa, pn }) => `<li><span class="areas-nombre"><strong>${esc(a.id)}</strong> ${esc(a.nombre)}<small>${esc(a.dependencia)} · ${esc(dependencia(a.dependencia)?.sigla || '')}${pa ? ` · ${esc(pa.responsable?.nombre || '')}` : ''}</small></span>
      <span class="areas-estado"><span class="sr-only">Plan de acción:</span>${celda(pa)}<span class="sr-only">Plan de necesidades:</span>${celda(pn)}</span></li>`).join('')}</ul>
    <p class="field-hint mb-0">Columnas: Plan de acción · Plan de necesidades. Toque una insignia para abrir el archivo.</p>`;
}

async function exportarRegistros() {
  try {
    if (!registrosCache) registrosCache = await leerRegistrosPanel();
    const logo = await obtenerLogo();
    const r = exportarExcel({
      nombreArchivo: `JP2027_Registros_${hoyISO()}.xlsx`,
      logo: logo.bytes,
      hojas: [{
        nombre: 'Registros', titulo: 'Registro de plantillas formuladas — Jornada de Planeación 2027', subtitulo: `${registrosCache.length} registros · ${microsoftListo() ? 'SharePoint' : 'este navegador'}`,
        columnas: [{ titulo: 'Código', ancho: 30 }, { titulo: 'Tipo', ancho: 20 }, { titulo: 'Área', ancho: 40 }, { titulo: 'Dependencia', ancho: 40 }, { titulo: 'Responsable', ancho: 32 }, { titulo: 'Cargo', ancho: 30 }, { titulo: 'Correo', ancho: 32 }, { titulo: 'Correos del equipo', ancho: 44 }, { titulo: 'Enlace', ancho: 50 }, { titulo: 'Estado', ancho: 16 }, { titulo: 'Resumen', ancho: 60 }, { titulo: 'Pase', ancho: 20 }, { titulo: 'Fecha', ancho: 20 }],
        filas: registrosCache.map((x) => [x.id, x.tipo === 'accion' ? 'Plan de acción' : 'Plan de necesidades', `${x.area?.id || ''} · ${x.area?.nombre || ''}`, `${x.dependencia?.codigo || ''} · ${x.dependencia?.nombre || ''}`, x.responsable?.nombre, x.responsable?.cargo, x.responsable?.correo, (x.correosEquipo || []).join('; '), x.enlace || '', x.estado === 'validada' ? 'Validada' : 'Con bloqueantes', x.resumenTexto || '', x.codigoPase || '', new Date(x.fecha).toLocaleString('es-CO')])
      }]
    });
    descargarBlob(r.blob, r.nombre);
  } catch (e) { toastError('No se pudo exportar', e, e.message); }
}

function montar(panel, ctx) {
  raiz = panel;
  ctxApp = ctx;
  panel.innerHTML = `<div class="container escaner">
    <div class="aviso-export" data-aviso-export role="status">
      ${icono('alerta', 'icon-sm')}
      <span><strong>${microsoftListo() ? 'La asistencia se guarda en SharePoint y en este dispositivo.' : 'La asistencia se guarda solo en este dispositivo.'}</strong> Expórtela a Excel antes de cerrar. <span data-sin-exportar></span></span>
      <button type="button" class="btn btn-sm" data-exportar ${xlsxDisponible() ? '' : 'disabled'}>${icono('excel', 'icon-sm')}Exportar</button>
    </div>

    <div class="escaner-grid">
      <div class="stack">
        <div class="contador-card">
          <span class="eyebrow">${icono('personas', 'icon-sm')}Asistentes registrados</span>
          <span class="contador-n" data-contador data-formato="entero">0</span>
          <span class="contador-pie" data-contador-pie></span>
        </div>

        <div class="segmentado-lg is-3" role="tablist" aria-label="Forma de registro">
          <button type="button" role="tab" id="m-camara" aria-controls="p-camara" aria-selected="true" data-modo="camara">${icono('camara', 'icon-sm')}Cámara</button>
          <button type="button" role="tab" id="m-manual" aria-controls="p-manual" aria-selected="false" tabindex="-1" data-modo="manual">${icono('teclado', 'icon-sm')}Manual</button>
          <button type="button" role="tab" id="m-registros" aria-controls="p-registros" aria-selected="false" tabindex="-1" data-modo="registros">${icono('baseDatos', 'icon-sm')}Áreas</button>
        </div>

        <div class="card escaner-card" id="p-camara" role="tabpanel" aria-labelledby="m-camara">
          <div class="visor" data-visor><div id="lector-qr"></div><span class="visor-marco" aria-hidden="true"></span></div>
          <div id="lector-archivo" hidden></div>
          <p class="camara-estado" data-camara-estado aria-live="polite">La cámara trasera se usa para leer el QR del pase.</p>
          <div class="btn-group escaner-botones">
            <button type="button" class="btn btn-lg btn-primary" data-camara-toggle></button>
            <label class="btn btn-lg">${icono('imagen', 'icon-sm')}Leer desde foto<input type="file" accept="image/*" capture="environment" hidden data-foto></label>
          </div>
        </div>

        <div class="card escaner-card" id="p-manual" role="tabpanel" aria-labelledby="m-manual" hidden>
          <label class="field"><span class="field-label">Código del pase, nombre o correo</span>
            <div class="input-icon">${icono('buscar')}<input class="input" id="busqueda-manual" type="search" placeholder="JP27-101-ABCDE o nombre" autocomplete="off"></div></label>
          <div data-resultados-manual aria-live="polite" style="margin-top:12px"></div>
          <details class="manual-nuevo">
            <summary>¿No está en el directorio? Registrar manualmente</summary>
            <p class="field-hint" style="margin-top:8px">Queda marcado «sin pase». Úselo solo con autorización de la OAP.</p>
            <form class="stack" data-form-nuevo style="margin-top:12px">
              <label class="field"><span class="field-label">Nombre completo</span><input class="input" name="nombre" required></label>
              <label class="field"><span class="field-label">Cargo</span><input class="input" name="cargo"></label>
              <label class="field"><span class="field-label">Dependencia</span><select class="select" name="dependencia" required><option value="">Elija…</option>${dependencias().map((d) => `<option value="${esc(d.codigo)}">${esc(d.codigo)} · ${esc(d.nombre)}</option>`).join('')}</select></label>
              <label class="field"><span class="field-label">Correo (opcional)</span><input class="input" name="correo" type="email"></label>
              <button type="submit" class="btn btn-primary">Registrar asistencia</button>
            </form>
          </details>
        </div>

        <div class="card escaner-card" id="p-registros" role="tabpanel" aria-labelledby="m-registros" hidden>
          <div class="row-between"><div><h3 class="mb-0">Registros por área</h3><p class="field-hint mb-0" data-origen-registros></p></div>
            <div class="btn-group"><button type="button" class="btn btn-sm" data-recargar-registros>${icono('refrescar', 'icon-sm')}Actualizar</button>
            <button type="button" class="btn btn-sm" data-exportar-registros ${xlsxDisponible() ? '' : 'disabled'}>${icono('excel', 'icon-sm')}Excel</button></div></div>
          <div data-registros style="margin-top:12px"></div>
        </div>
      </div>

      <div class="stack">
        <div class="card"><h3>Por dependencia</h3><div data-desglose></div></div>
        <div class="card"><h3>Últimos registros</h3><ul class="recientes" data-recientes></ul>
          <hr><button type="button" class="btn btn-sm btn-danger" data-borrar>${icono('basura', 'icon-sm')}Vaciar asistencia de este dispositivo</button></div>
      </div>
    </div>
  </div>
  <div class="escaner-overlay" data-overlay aria-live="assertive" role="status"></div>`;

  pintarBotonesCamara();
  pintarContador();
  activarAnimaciones(panel);

  on(panel, 'click', '[data-camara-toggle]', () => (camaraActiva ? detenerCamara() : iniciarCamara()));
  panel.querySelector('[data-foto]').addEventListener('change', (ev) => { const f = ev.target.files[0]; ev.target.value = ''; if (f) leerFoto(f); });
  panel.querySelector('[data-overlay]').addEventListener('click', cerrarOverlay);
  on(panel, 'click', '[data-exportar]', exportarAsistencia);
  on(panel, 'click', '[data-registrar]', (ev, b) => registrarManual(b.dataset.registrar));
  on(panel, 'click', '[data-registrar-pase]', (ev, b) => { const p = estado.consolidado.pases.find((x) => x.id === b.dataset.registrarPase); if (p) registrarConPase(p); });
  on(panel, 'click', '[data-recargar-registros]', () => pintarRegistros(true));
  on(panel, 'click', '[data-exportar-registros]', exportarRegistros);
  on(panel, 'click', '[data-borrar]', async () => {
    const sinExportar = estado.consolidado.asistencia.length - (estado.consolidado.meta?.asistenciaExportada || 0);
    const ok = await confirmar({ titulo: 'Vaciar la asistencia', mensaje: sinExportar > 0 ? `Hay ${sinExportar} registros sin exportar que se perderán. ¿Vaciar de todas formas?` : 'Se borrará la lista de este dispositivo (ya fue exportada).', aceptar: 'Vaciar', peligro: true });
    if (!ok) return;
    try { await ctx.almacen.reemplazarAsistencia([]); await ctx.almacen.guardarMeta({ asistenciaExportada: 0 }); await ctx.refrescarConsolidado(); toast({ tipo: 'ok', titulo: 'Asistencia vaciada', mensaje: 'El dispositivo quedó listo para una nueva jornada.' }); } catch (e) { toastError('No se pudo vaciar', e, e.message); }
  });
  const busq = panel.querySelector('#busqueda-manual');
  let t = null;
  busq.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => pintarResultadosManual(busq.value), 160); });
  panel.querySelector('[data-form-nuevo]').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const f = new FormData(ev.target);
    const nombre = String(f.get('nombre') || '').trim();
    const dep = String(f.get('dependencia') || '');
    if (!nombre || !dep) { toast({ tipo: 'warn', titulo: 'Faltan datos', mensaje: 'Nombre y dependencia son obligatorios.' }); return; }
    const ok = await registrar({ paseId: null, personaId: null, nombre, cargo: String(f.get('cargo') || '').trim(), dependencia: dep, area: '', correo: String(f.get('correo') || '').trim().toLowerCase(), metodo: 'manual', noVerificado: true });
    if (ok) ev.target.reset();
  });
  on(panel, 'click', '[data-modo]', (ev, b) => cambiarModo(b.dataset.modo));
  panel.querySelector('.segmentado-lg').addEventListener('keydown', (ev) => {
    if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
    ev.preventDefault();
    const orden = ['camara', 'manual', 'registros'];
    cambiarModo(orden[(orden.indexOf(modo) + (ev.key === 'ArrowRight' ? 1 : 2)) % 3]);
    panel.querySelector(`[data-modo="${modo}"]`).focus();
  });
  alEvento('consolidado', pintarContador);
  if (!window.Html5Qrcode) {
    panel.querySelector('[data-camara-estado]').innerHTML = 'El lector de QR aún no carga. Si no aparece en unos segundos, use el registro manual.';
    alEvento('librerias', () => { if (!window.Html5Qrcode) cambiarModo('manual'); });
  }
}

function cambiarModo(nuevo) {
  modo = nuevo;
  raiz.querySelectorAll('[data-modo]').forEach((b) => {
    const activo = b.dataset.modo === nuevo;
    b.setAttribute('aria-selected', String(activo));
    b.tabIndex = activo ? 0 : -1;
  });
  raiz.querySelector('#p-camara').hidden = nuevo !== 'camara';
  raiz.querySelector('#p-manual').hidden = nuevo !== 'manual';
  raiz.querySelector('#p-registros').hidden = nuevo !== 'registros';
  if (nuevo !== 'camara') detenerCamara();
  if (nuevo === 'manual') setTimeout(() => raiz.querySelector('#busqueda-manual').focus(), 50);
  if (nuevo === 'registros') pintarRegistros();
}

export const vistaEscaner = {
  id: 'escaner',
  titulo: 'Modo escáner',
  icono: 'escaner',
  montar,
  alMostrar() { pintarContador(); },
  alOcultar() { detenerCamara(); cerrarOverlay(); }
};
