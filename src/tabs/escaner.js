/*
 * escaner.js — Lector de pases QR (vista aparte, pensada para celular o tableta).
 * Solo lo activan los responsables de la actividad en curso según la agenda, con su correo institucional y su PIN.
 * Cada lectura queda registrada con fecha, hora, lector, participante, actividad y resultado; se guarda en el
 * dispositivo y se envía al registro en línea. Confirmación a pantalla completa: verde (bienvenido), ámbar (ya
 * registrado en esta actividad) o rojo (pase no válido).
 */
import { PREFIJO_LOCAL } from '../config.js';
import { estado, on as alEvento, dependencia, dependencias, nombreDependencia, area as areaPorId } from '../estado.js';
import { esc, on } from '../ui/dom.js';
import { icono } from '../ui/iconos.js';
import { toast, toastError } from '../ui/toast.js';
import { confirmar } from '../ui/modal.js';
import { animarNumero, activarAnimaciones } from '../ui/cards.js';
import { verificarPase } from '../lib/qr.js';
import { exportarExcel, xlsxDisponible } from '../lib/excel.js';
import { descargarBlob, obtenerLogo } from '../lib/export.js';
import { normalizar } from '../lib/formato.js';
import { hoyISO } from '../lib/fechas.js';
import { verificarLector, permiso, actividadEnCurso, actividadesDe, nombreRol } from '../lib/lectores.js';
import { buscarPorCorreo, normalizarCorreo } from '../lib/directorio.js';
import { enviar, remotoConfigurado, pendientes } from '../lib/remoto.js';

const CLAVE_LECTOR = `${PREFIJO_LOCAL}:lector`;
let raiz = null;
let ctxApp = null;
let lector = null;
let turno = null;
let lectorQR = null;
let camaraActiva = false;
let ultimoTexto = { texto: '', t: 0 };
let overlayTimer = null;
let relojTurno = null;
let modo = 'camara';

const segundos = () => estado.datos.config?.umbrales?.segundosConfirmacionEscaner || 3;
const horaCorta = (iso) => new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
const dispositivo = () => `${/iPhone|iPad/.test(navigator.userAgent) ? 'iOS' : /Android/.test(navigator.userAgent) ? 'Android' : 'Computador'}`;

function cargarLector() {
  try {
    const v = JSON.parse(sessionStorage.getItem(CLAVE_LECTOR) || localStorage.getItem(CLAVE_LECTOR) || 'null');
    if (v && Date.now() - v.desde < 12 * 3600000) return v;
  } catch { /* sin almacenamiento */ }
  return null;
}
function guardarLector(v) {
  try {
    if (v) { sessionStorage.setItem(CLAVE_LECTOR, JSON.stringify(v)); localStorage.setItem(CLAVE_LECTOR, JSON.stringify(v)); }
    else { sessionStorage.removeItem(CLAVE_LECTOR); localStorage.removeItem(CLAVE_LECTOR); }
  } catch { /* opcional */ }
}

const misLecturas = () => estado.consolidado.asistencia.filter((a) => a.lector && lector && a.lector.correo === lector.correo);
const actividadClave = () => (turno?.prueba ? 'ENSAYO' : turno?.bloque?.id || 'SIN-ACTIVIDAD');

function buscarDuplicado(r) {
  const act = actividadClave();
  return estado.consolidado.asistencia.find((x) => x.resultado !== 'rechazo' && x.resultado !== 'duplicado' && (x.actividad?.id || 'SIN-ACTIVIDAD') === act
    && ((r.paseId && x.paseId === r.paseId) || (r.correo && x.correo === r.correo) || (!r.correo && normalizar(x.nombre) === normalizar(r.nombre))));
}

async function registrar(r) {
  const base = {
    ...r,
    hora: new Date().toISOString(),
    lector: { nombre: lector.nombre, correo: lector.correo, rol: lector.rol },
    actividad: turno?.prueba ? { id: 'ENSAYO', titulo: 'Modo ensayo', dia: null, fecha: hoyISO() }
      : turno?.bloque ? { id: turno.bloque.id, titulo: turno.bloque.titulo, dia: turno.dia?.numero || null, fecha: turno.dia?.fecha || hoyISO(), inicio: turno.bloque.inicio, fin: turno.bloque.fin }
        : { id: 'SIN-ACTIVIDAD', titulo: 'Fuera de la agenda', dia: null, fecha: hoyISO() },
    prueba: Boolean(turno?.prueba),
    dispositivo: dispositivo(),
    depNombre: r.dependencia ? nombreDependencia(r.dependencia) : ''
  };
  const dup = r.resultado === 'rechazo' ? null : buscarDuplicado(r);
  const registro = { ...base, resultado: r.resultado || (dup ? 'duplicado' : 'ok'), clave: `${actividadClave()}|${r.paseId || r.correo || normalizar(r.nombre)}|${Date.now()}` };
  try {
    await ctxApp.almacen.guardarAsistencia(registro);
    await ctxApp.refrescarConsolidado();
  } catch (e) { toastError('No se pudo guardar la lectura', e, e.message); }
  enviar('lectura', registro);
  if (registro.resultado === 'rechazo') mostrarOverlay('rechazo', { motivo: r.motivo, nombre: r.nombre });
  else if (dup) mostrarOverlay('duplicado', { ...dup, intento: registro });
  else mostrarOverlay('ok', registro);
  return registro.resultado === 'ok';
}

// ───────── Pantalla completa de resultado ─────────
function mostrarOverlay(tipo, datos) {
  const ov = raiz.querySelector('[data-overlay]');
  clearTimeout(overlayTimer);
  const d = dependencia(datos.dependencia);
  const a = datos.area ? areaPorId(datos.area) : null;
  const lugar = a ? `${esc(a.nombre)}, ${esc(a.proceso)}` : esc(d?.nombre || '');
  const metodo = { QR: 'con QR', codigo: 'con el código del pase', manual: 'manual sin pase' }[datos.metodo] || '';
  const contenido = {
    ok: `<span class="ov-icono">${icono('check')}</span><span class="ov-estado">${turno?.prueba ? 'Ensayo · ' : ''}Bienvenido</span>
      <strong class="ov-nombre">${esc(datos.nombre)}</strong><span class="ov-cargo">${esc(datos.cargo || '')}</span>
      <span class="ov-dep">${lugar}</span><span class="ov-metodo">${esc(datos.actividad?.titulo || '')} · ${metodo} · ${esc(horaCorta(datos.hora))}</span>`,
    duplicado: `<span class="ov-icono">${icono('alerta')}</span><span class="ov-estado">Ya registrado en esta actividad</span>
      <strong class="ov-nombre">${esc(datos.nombre)}</strong><span class="ov-dep">${lugar}</span>
      <span class="ov-primera">Ingresó a las <b>${esc(horaCorta(datos.hora))}</b>, leído por ${esc(datos.lector?.nombre || '')}</span>`,
    rechazo: `<span class="ov-icono">${icono('cerrar')}</span><span class="ov-estado">Pase no válido</span>
      <strong class="ov-nombre">${esc(datos.motivo || 'El código no es un pase de la jornada.')}</strong>
      ${datos.nombre ? `<span class="ov-cargo">A nombre de: ${esc(datos.nombre)}</span>` : ''}<span class="ov-metodo">La persona debe descargar la plantilla en el aplicativo para obtener su pase.</span>`
  }[tipo];
  ov.className = `escaner-overlay is-${tipo} is-open`;
  ov.innerHTML = `<div class="ov-cuerpo">${contenido}<span class="ov-barra" style="animation-duration:${segundos()}s"></span><span class="ov-toque">Toque para continuar</span></div>`;
  if (navigator.vibrate) { try { navigator.vibrate(tipo === 'ok' ? 80 : [60, 60, 60]); } catch { /* opcional */ } }
  overlayTimer = setTimeout(cerrarOverlay, segundos() * 1000);
}

function cerrarOverlay() {
  clearTimeout(overlayTimer);
  const ov = raiz?.querySelector('[data-overlay]');
  if (!ov || !ov.classList.contains('is-open')) return;
  ov.classList.remove('is-open');
  if (lectorQR && camaraActiva) { try { lectorQR.resume(); } catch { /* ya reanudado */ } }
}

// ───────── Cámara ─────────
async function alLeer(texto) {
  const ahora = Date.now();
  if (texto === ultimoTexto.texto && ahora - ultimoTexto.t < 4000) return;
  if (raiz.querySelector('[data-overlay]').classList.contains('is-open')) return;
  ultimoTexto = { texto, t: ahora };
  if (lectorQR && camaraActiva) { try { lectorQR.pause(true); } catch { /* sin pausa */ } }
  procesarTexto(texto, 'QR');
}

async function procesarTexto(texto, metodo) {
  if (!turnoValido()) return;
  const v = verificarPase(texto, { sal: estado.indices.sal, prefijo: estado.indices.prefijo, dependenciasValidas: new Set(dependencias().map((d) => String(d.codigo))) });
  if (!v.valido) { await registrar({ resultado: 'rechazo', motivo: v.motivo, nombre: v.pase?.n || '', paseId: v.pase?.id || '', metodo }); return; }
  const p = v.pase;
  await registrar({ paseId: p.id, nombre: p.n, cargo: p.c, dependencia: String(p.d), area: p.a || '', correo: p.e || '', metodo });
}

async function iniciarCamara() {
  const zona = raiz.querySelector('[data-camara-estado]');
  if (!window.Html5Qrcode) {
    zona.innerHTML = `<div class="notice notice-danger">${icono('alerta')}<div><strong>El lector de QR no cargó.</strong> Use la búsqueda manual o recargue con conexión.</div></div>`;
    return;
  }
  try {
    if (!lectorQR) lectorQR = new window.Html5Qrcode('lector-qr', { verbose: false });
    zona.innerHTML = '<span class="spinner" aria-hidden="true"></span> Solicitando permiso de cámara…';
    await lectorQR.start({ facingMode: 'environment' }, { fps: 10, qrbox: (w, h) => { const s = Math.floor(Math.min(w, h) * 0.72); return { width: s, height: s }; }, aspectRatio: 1 }, alLeer, () => {});
    camaraActiva = true;
    raiz.querySelector('[data-visor]').classList.add('is-activo');
    zona.innerHTML = '<span class="pulse" aria-hidden="true"></span> Cámara activa: apunte al QR del pase';
  } catch (e) {
    camaraActiva = false;
    const msg = String(e?.message || e);
    zona.innerHTML = `<div class="notice notice-danger">${icono('camara')}<div><strong>No se pudo abrir la cámara.</strong> ${/permission|NotAllowed/i.test(msg) ? 'Se negó el permiso: actívelo en la configuración del navegador.' : /secure|https/i.test(msg) ? 'La cámara requiere un sitio seguro (https).' : 'Verifique que ninguna otra aplicación la esté usando.'} También puede leer el QR desde una foto o buscar por código.</div></div>`;
  }
  pintarBotonesCamara();
}

async function detenerCamara() {
  if (lectorQR && camaraActiva) { try { await lectorQR.stop(); } catch { /* ya detenida */ } }
  camaraActiva = false;
  if (raiz && raiz.querySelector('[data-visor]')) {
    raiz.querySelector('[data-visor]').classList.remove('is-activo');
    raiz.querySelector('[data-camara-estado]').textContent = 'Cámara detenida.';
    pintarBotonesCamara();
  }
}

function pintarBotonesCamara() {
  const b = raiz.querySelector('[data-camara-toggle]');
  if (!b) return;
  b.innerHTML = camaraActiva ? `${icono('cerrar', 'icon-sm')}Detener cámara` : `${icono('camara', 'icon-sm')}Iniciar cámara`;
  b.classList.toggle('btn-primary', !camaraActiva);
}

async function leerFoto(archivo) {
  if (!window.Html5Qrcode) { toast({ tipo: 'warn', titulo: 'Lector no disponible', mensaje: 'Use la búsqueda manual.' }); return; }
  try {
    if (camaraActiva) await detenerCamara();
    const tmp = new window.Html5Qrcode('lector-archivo', { verbose: false });
    const texto = await tmp.scanFile(archivo, false);
    try { tmp.clear(); } catch { /* sin acción */ }
    await procesarTexto(texto, 'QR');
  } catch {
    mostrarOverlay('rechazo', { motivo: 'No se encontró un código QR legible en la foto.' });
  }
}

// ───────── Turno del lector ─────────
function turnoValido() {
  if (!lector) return false;
  const t = permiso(lector, { ensayo: lector.ensayo });
  turno = t;
  if (!t.ok) {
    detenerCamara();
    pintar();
    toast({ tipo: 'warn', titulo: 'Lector no habilitado en este momento', mensaje: t.motivo });
    return false;
  }
  return true;
}

// ───────── Búsqueda manual ─────────
async function buscarManual(texto) {
  const cont = raiz.querySelector('[data-resultados-manual]');
  const t = texto.trim();
  if (t.length < 4) { cont.innerHTML = '<p class="muted" style="font-size:.86rem">Escriba el código del pase (JP27…) o el correo institucional de la persona.</p>'; return; }
  const codigo = t.toUpperCase().replace(/\s+/g, '');
  if (codigo.startsWith(`${estado.indices.prefijo}-`)) {
    const pase = estado.consolidado.pases.find((x) => x.id === codigo);
    cont.innerHTML = pase
      ? `<ul class="manual-lista"><li class="manual-item"><div class="manual-info"><strong>${esc(pase.n)}</strong><span>${esc(pase.c)}</span><span class="badge badge-ok">${esc(pase.id)}</span></div>
          <button type="button" class="btn btn-primary btn-sm" data-registrar-pase="${esc(pase.id)}">Registrar</button></li></ul>`
      : `<div class="notice">${icono('info')}<div>Ese pase no se emitió en este dispositivo. Pida a la persona que muestre el QR de su correo o de su celular.</div></div>`;
    return;
  }
  const correo = normalizarCorreo(t);
  if (!correo.includes('@')) { cont.innerHTML = ''; return; }
  const lista = await buscarPorCorreo(correo);
  const pase = estado.consolidado.pases.find((x) => x.e === correo);
  if (pase) {
    cont.innerHTML = `<ul class="manual-lista"><li class="manual-item"><div class="manual-info"><strong>${esc(pase.n)}</strong><span>${esc(pase.c)}</span><span class="badge badge-ok">${esc(pase.id)}</span></div>
      <button type="button" class="btn btn-primary btn-sm" data-registrar-pase="${esc(pase.id)}">Registrar</button></li></ul>`;
    return;
  }
  cont.innerHTML = lista.length
    ? `<ul class="manual-lista">${lista.map((p, i) => `<li class="manual-item"><div class="manual-info"><strong>${esc(p.n)}</strong><span>${esc(p.c)}</span><span class="badge">${esc(p.d)} · ${esc(dependencia(p.d)?.sigla || '')}</span><span class="badge badge-warn">Sin pase en este dispositivo</span></div>
        <button type="button" class="btn btn-sm" data-sin-pase="${i}">Registrar sin pase</button></li>`).join('')}</ul>`
    : `<div class="notice">${icono('info')}<div>El correo no está en el directorio ni tiene un pase emitido en este dispositivo.</div></div>`;
  cont.querySelectorAll('[data-sin-pase]').forEach((b) => b.addEventListener('click', async () => {
    const p = lista[Number(b.dataset.sinPase)];
    const ok = await confirmar({ titulo: 'Ingreso sin pase', mensaje: 'Esta persona no presenta pase. Regístrela solo con autorización de la Oficina Asesora de Planeación: quedará marcada como «sin pase».', aceptar: 'Registrar sin pase' });
    if (ok && turnoValido()) await registrar({ paseId: '', nombre: p.n, cargo: p.c, dependencia: String(p.d || ''), area: '', correo, metodo: 'manual' });
  }));
}

// ───────── Pintado ─────────
function pintarActivacion() {
  const cand = actividadEnCurso() || [];
  const actual = cand.find((x) => x.enCurso) || cand[0];
  raiz.innerHTML = `<div class="container escaner">
    <div class="card activar-card">
      <span class="ms-ico">${icono('escaner', 'icon-lg')}</span>
      <h1 class="h-activar">Activar el lector de pases</h1>
      <p class="muted">Solo leen los <strong>responsables de la actividad en curso</strong> según la agenda, con su correo institucional y su PIN personal.</p>
      ${actual ? `<p class="actividad-ahora">${icono('reloj', 'icon-sm')}Ahora: <strong>${esc(actual.bloque.titulo)}</strong> (${esc(actual.bloque.inicio)} a ${esc(actual.bloque.fin)})</p>` : ''}
      <form class="stack" data-activar novalidate>
        <label class="field"><span class="field-label">Correo institucional</span><input class="input" name="correo" type="email" inputmode="email" autocomplete="email" required></label>
        <label class="field"><span class="field-label">PIN</span><input class="input" name="pin" type="password" inputmode="numeric" autocomplete="one-time-code" maxlength="8" required></label>
        <label class="switch"><input type="checkbox" name="ensayo"> Modo ensayo: practicar fuera de la jornada (las lecturas quedan marcadas como prueba)</label>
        <button type="submit" class="btn btn-lg btn-block btn-primary">${icono('usuarioCheck', 'icon-sm')}Activar</button>
      </form>
    </div>
  </div>
  <div class="escaner-overlay" data-overlay aria-live="assertive" role="status"></div>`;
  raiz.querySelector('[data-activar]').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const f = ev.target.elements;
    const r = await verificarLector(f.correo.value, f.pin.value);
    if (!r || r.error) { toast({ tipo: 'error', titulo: 'No se pudo activar el lector', mensaje: r?.error || 'Revise los datos.' }); return; }
    const t = permiso(r, { ensayo: f.ensayo.checked });
    if (!t.ok) { toast({ tipo: 'warn', titulo: `Hola, ${r.nombre.split(' ')[0]}`, mensaje: t.motivo, duracion: 12000 }); return; }
    lector = { ...r, ensayo: f.ensayo.checked, desde: Date.now() };
    guardarLector(lector);
    enviar('activacion', { lector: { nombre: r.nombre, correo: r.correo, rol: r.rol }, actividad: t.bloque ? { id: t.bloque.id, titulo: t.bloque.titulo } : null, prueba: Boolean(t.prueba), hora: new Date().toISOString(), dispositivo: dispositivo() });
    toast({ tipo: 'ok', titulo: `Lector activo: ${r.nombre}`, mensaje: t.prueba ? 'Modo ensayo.' : (t.bloque ? t.bloque.titulo : 'Coordinación de la jornada') });
    pintar();
  });
}

function pintarLector() {
  const t = turno;
  const acts = actividadesDe(lector);
  raiz.innerHTML = `<div class="container escaner">
    <div class="lector-barra" role="status">
      <span class="avatar avatar-sm" aria-hidden="true">${esc(lector.nombre.split(' ').map((x) => x[0]).slice(0, 2).join(''))}</span>
      <div class="lector-info"><strong>${esc(lector.nombre)}</strong><span>${esc(nombreRol(lector.rol))}${t?.prueba ? ' · <b>Modo ensayo</b>' : ''}</span>
        <span class="lector-act">${icono('reloj', 'icon-sm')}${t?.prueba ? 'Lecturas de prueba' : t?.bloque ? `${esc(t.bloque.titulo)} · ${esc(t.bloque.inicio)} a ${esc(t.bloque.fin)}` : 'Coordinación de la jornada'}</span></div>
      <button type="button" class="btn btn-sm btn-ghost" data-salir>${icono('cerrar', 'icon-sm')}Salir</button>
    </div>
    <div class="aviso-export" data-aviso-export role="status">${icono('baseDatos', 'icon-sm')}
      <span>${remotoConfigurado() ? '<strong>Cada lectura se envía al registro en línea.</strong>' : '<strong>Las lecturas se guardan en este dispositivo.</strong> Expórtelas al terminar.'} <span data-pendientes></span></span>
      <button type="button" class="btn btn-sm" data-exportar ${xlsxDisponible() ? '' : 'disabled'}>${icono('excel', 'icon-sm')}Excel</button>
    </div>
    <div class="escaner-grid">
      <div class="stack">
        <div class="contador-card">
          <span class="eyebrow">${icono('personas', 'icon-sm')}Sus lecturas en esta actividad</span>
          <span class="contador-n" data-contador data-formato="entero">0</span>
          <span class="contador-pie" data-contador-pie></span>
        </div>
        <div class="segmentado-lg is-3" role="tablist" aria-label="Forma de registro">
          <button type="button" role="tab" id="m-camara" aria-controls="p-camara" aria-selected="true" data-modo="camara">${icono('camara', 'icon-sm')}Cámara</button>
          <button type="button" role="tab" id="m-manual" aria-controls="p-manual" aria-selected="false" tabindex="-1" data-modo="manual">${icono('teclado', 'icon-sm')}Manual</button>
          <button type="button" role="tab" id="m-lecturas" aria-controls="p-lecturas" aria-selected="false" tabindex="-1" data-modo="lecturas">${icono('baseDatos', 'icon-sm')}Lecturas</button>
        </div>
        <div class="card escaner-card" id="p-camara" role="tabpanel" aria-labelledby="m-camara">
          <div class="visor" data-visor><div id="lector-qr"></div><span class="visor-marco" aria-hidden="true"></span></div>
          <div id="lector-archivo" hidden></div>
          <p class="camara-estado" data-camara-estado aria-live="polite">La cámara trasera lee el QR del pase.</p>
          <div class="btn-group escaner-botones">
            <button type="button" class="btn btn-lg btn-primary" data-camara-toggle></button>
            <label class="btn btn-lg">${icono('imagen', 'icon-sm')}Leer desde foto<input type="file" accept="image/*" capture="environment" hidden data-foto></label>
          </div>
        </div>
        <div class="card escaner-card" id="p-manual" role="tabpanel" aria-labelledby="m-manual" hidden>
          <label class="field"><span class="field-label">Código del pase o correo institucional</span>
            <div class="input-icon">${icono('buscar')}<input class="input" id="busqueda-manual" type="search" placeholder="JP27-101-ABCDE o usuario@itc.edu.co" autocomplete="off"></div></label>
          <div data-resultados-manual aria-live="polite" style="margin-top:12px"></div>
        </div>
        <div class="card escaner-card" id="p-lecturas" role="tabpanel" aria-labelledby="m-lecturas" hidden>
          <h3>Sus últimas lecturas</h3><ul class="recientes" data-recientes></ul>
        </div>
      </div>
      <div class="stack">
        <div class="card"><h3>Sus actividades en la agenda</h3>
          <ul class="mis-actividades">${acts.map(({ dia, bloque }) => `<li class="${t?.bloque?.id === bloque.id ? 'is-actual' : ''}"><span class="mono">Día ${dia.numero} · ${esc(bloque.inicio)}</span><span>${esc(bloque.titulo)}</span></li>`).join('') || '<li class="muted">Coordinación general de la jornada.</li>'}</ul></div>
        <div class="card"><h3>Este dispositivo</h3><p class="muted mb-0" data-resumen-disp></p>
          <hr><button type="button" class="btn btn-sm btn-danger" data-borrar>${icono('basura', 'icon-sm')}Vaciar lecturas de este dispositivo</button></div>
      </div>
    </div>
  </div>
  <div class="escaner-overlay" data-overlay aria-live="assertive" role="status"></div>`;
  pintarBotonesCamara();
  pintarContador();
  activarAnimaciones(raiz);
  if (!window.Html5Qrcode) raiz.querySelector('[data-camara-estado]').textContent = 'El lector de QR aún no carga. Si no aparece, use la búsqueda manual.';
  const busq = raiz.querySelector('#busqueda-manual');
  let tm = null;
  busq.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(() => buscarManual(busq.value), 300); });
  raiz.querySelector('[data-foto]').addEventListener('change', (ev) => { const f = ev.target.files[0]; ev.target.value = ''; if (f) leerFoto(f); });
}

function pintarContador() {
  if (!raiz || !lector || !raiz.querySelector('[data-contador]')) return;
  const mias = misLecturas().filter((a) => (a.actividad?.id || '') === actividadClave());
  animarNumero(raiz.querySelector('[data-contador]'), mias.filter((a) => a.resultado === 'ok').length, 500);
  raiz.querySelector('[data-contador-pie]').textContent = `${mias.filter((a) => a.resultado === 'duplicado').length} repetidas · ${mias.filter((a) => a.resultado === 'rechazo').length} rechazadas · ${misLecturas().length} lecturas suyas en total`;
  const rec = [...misLecturas()].sort((a, b) => b.hora.localeCompare(a.hora)).slice(0, 12);
  const etiqueta = { ok: ['badge-ok', 'Ingreso'], duplicado: ['badge-warn', 'Repetida'], rechazo: ['badge-danger', 'Rechazo'] };
  raiz.querySelector('[data-recientes]').innerHTML = rec.length ? rec.map((a) => `<li><span class="mono">${esc(horaCorta(a.hora))}</span><span><strong>${esc(a.nombre || 'Sin nombre')}</strong> · ${esc(a.actividad?.titulo || '')}</span><span class="badge ${etiqueta[a.resultado]?.[0] || ''}">${etiqueta[a.resultado]?.[1] || ''}</span></li>`).join('') : '<li class="muted">Sin lecturas todavía.</li>';
  const todo = estado.consolidado.asistencia;
  const pend = pendientes();
  raiz.querySelector('[data-resumen-disp]').textContent = `${todo.length} lecturas registradas en este dispositivo por ${new Set(todo.map((a) => a.lector?.correo).filter(Boolean)).size} lectores.`;
  raiz.querySelector('[data-pendientes]').textContent = remotoConfigurado() ? (pend ? `${pend} por enviar (se reintenta solo).` : 'Todo enviado.') : '';
}

function pintar() {
  if (!raiz) return;
  if (lector) turno = permiso(lector, { ensayo: lector.ensayo });
  if (!lector) { pintarActivacion(); return; }
  if (!turno.ok) {
    raiz.innerHTML = `<div class="container escaner"><div class="card activar-card"><span class="ms-ico">${icono('reloj', 'icon-lg')}</span>
      <h1 class="h-activar">${esc(lector.nombre)}, su turno de lectura no está activo</h1><p>${esc(turno.motivo)}</p>
      <div class="btn-group centro"><button type="button" class="btn btn-primary" data-reintentar>${icono('refrescar', 'icon-sm')}Verificar de nuevo</button><button type="button" class="btn" data-salir>Salir</button></div></div></div>
      <div class="escaner-overlay" data-overlay></div>`;
    return;
  }
  pintarLector();
}

async function exportarLecturas() {
  const lista = [...estado.consolidado.asistencia].sort((a, b) => a.hora.localeCompare(b.hora));
  if (!lista.length) { toast({ tipo: 'warn', titulo: 'Sin lecturas', mensaje: 'Aún no hay lecturas para exportar.' }); return; }
  try {
    const logo = await obtenerLogo();
    const r = exportarExcel({
      nombreArchivo: `JP2027_Lecturas_${hoyISO()}_${new Date().toTimeString().slice(0, 5).replace(':', '')}.xlsx`,
      logo: logo.bytes,
      hojas: [{
        nombre: 'Lecturas', titulo: 'Lecturas de pases, Jornada de Planeación 2027', subtitulo: `${lista.length} lecturas registradas en este dispositivo`,
        columnas: [{ titulo: 'Fecha y hora', ancho: 22 }, { titulo: 'Resultado', ancho: 12 }, { titulo: 'Actividad', ancho: 40 }, { titulo: 'Lector', ancho: 26 }, { titulo: 'Correo del lector', ancho: 30 }, { titulo: 'Participante', ancho: 32 }, { titulo: 'Cargo', ancho: 30 }, { titulo: 'Dependencia', ancho: 36 }, { titulo: 'Correo', ancho: 30 }, { titulo: 'Pase', ancho: 18 }, { titulo: 'Método', ancho: 14 }, { titulo: 'Prueba', ancho: 8 }],
        filas: lista.map((a) => [new Date(a.hora).toLocaleString('es-CO'), { ok: 'Ingreso', duplicado: 'Repetida', rechazo: 'Rechazo' }[a.resultado] || a.resultado, a.actividad?.titulo || '', a.lector?.nombre || '', a.lector?.correo || '', a.nombre, a.cargo, a.dependencia ? nombreDependencia(a.dependencia) : '', a.correo, a.paseId, a.metodo, a.prueba ? 'Sí' : 'No'])
      }]
    });
    descargarBlob(r.blob, r.nombre);
    await ctxApp.almacen.guardarMeta({ asistenciaExportada: estado.consolidado.asistencia.length });
    await ctxApp.refrescarConsolidado();
  } catch (e) { toastError('No se pudo exportar', e, e.message); }
}

function cambiarModo(nuevo) {
  modo = nuevo;
  raiz.querySelectorAll('[data-modo]').forEach((b) => { const a = b.dataset.modo === nuevo; b.setAttribute('aria-selected', String(a)); b.tabIndex = a ? 0 : -1; });
  ['camara', 'manual', 'lecturas'].forEach((m) => { raiz.querySelector(`#p-${m}`).hidden = m !== nuevo; });
  if (nuevo !== 'camara') detenerCamara();
  if (nuevo === 'manual') setTimeout(() => raiz.querySelector('#busqueda-manual').focus(), 50);
}

function montar(panel, ctx) {
  raiz = panel;
  ctxApp = ctx;
  lector = cargarLector();
  pintar();
  on(panel, 'click', '[data-camara-toggle]', () => { if (!turnoValido()) return; if (camaraActiva) detenerCamara(); else iniciarCamara(); });
  on(panel, 'click', '[data-overlay]', cerrarOverlay);
  on(panel, 'click', '[data-exportar]', exportarLecturas);
  on(panel, 'click', '[data-modo]', (ev, b) => cambiarModo(b.dataset.modo));
  on(panel, 'click', '[data-registrar-pase]', async (ev, b) => {
    const p = estado.consolidado.pases.find((x) => x.id === b.dataset.registrarPase);
    if (p && turnoValido()) await registrar({ paseId: p.id, nombre: p.n, cargo: p.c, dependencia: String(p.d), area: p.a || '', correo: p.e || '', metodo: 'codigo' });
  });
  on(panel, 'click', '[data-salir]', async () => { await detenerCamara(); lector = null; turno = null; guardarLector(null); pintar(); });
  on(panel, 'click', '[data-reintentar]', () => pintar());
  on(panel, 'click', '[data-borrar]', async () => {
    const ok = await confirmar({ titulo: 'Vaciar lecturas', mensaje: remotoConfigurado() ? 'Se borran las lecturas de este dispositivo. Las ya enviadas siguen en el registro en línea.' : 'Se borran las lecturas de este dispositivo. Expórtelas antes si no lo ha hecho.', aceptar: 'Vaciar', peligro: true });
    if (!ok) return;
    await ctx.almacen.reemplazarAsistencia([]);
    await ctx.refrescarConsolidado();
  });
  alEvento('consolidado', pintarContador);
  alEvento('cola', pintarContador);
  relojTurno = setInterval(() => {
    if (!lector || !raiz || raiz.hidden) return;
    const antes = turno?.bloque?.id;
    const t = permiso(lector, { ensayo: lector.ensayo });
    if (!t.ok || t.bloque?.id !== antes) { detenerCamara(); turno = t; pintar(); if (t.ok) toast({ tipo: 'info', titulo: 'Cambió la actividad', mensaje: t.bloque ? t.bloque.titulo : 'Coordinación' }); }
  }, 60000);
}

export const vistaEscaner = {
  id: 'escaner',
  titulo: 'Lector de pases',
  icono: 'escaner',
  montar,
  alMostrar() { pintar(); },
  alOcultar() { detenerCamara(); cerrarOverlay(); }
};
