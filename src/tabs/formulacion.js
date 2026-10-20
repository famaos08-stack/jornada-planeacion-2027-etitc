/*
 * formulacion.js — Pestaña 2 (crítica): Formulación y pase. Flujo de cuatro pasos:
 *   1. Identificación con correo institucional (autocompleta desde data/directorio.json).
 *   2. Descarga de la plantilla Excel construida en el momento.
 *   3. Cargue y validación del Excel en el navegador (hallazgos bloqueantes y advertencias).
 *   4. Emisión del pase de acceso con QR firmado (PNG, PDF y texto para correo).
 * Maneja las reglas del directorio real: correos sin registrar, buzones compartidos y registros sin nombre.
 */
import { estado, dependencia, dependencias, personasPorCorreo, umbral } from '../estado.js';
import { esc, on } from '../ui/dom.js';
import { icono } from '../ui/iconos.js';
import { toast, toastError } from '../ui/toast.js';
import { cadenaLogica, tarjetaCifra, activarAnimaciones, estadoVacio } from '../ui/cards.js';
import { graficaBarras } from '../ui/graficas.js';
import { generarPlantilla, leerLibro, exportarExcel, xlsxDisponible } from '../lib/excel.js';
import { validarFormulacion } from '../lib/validacion.js';
import { crearPase, contenidoQR, qrComoDataUrl, qrDisponible } from '../lib/qr.js';
import { descargarBlob, obtenerLogo, elementoAPng, elementoAPdf, copiarTexto, pdfDisponible, capturaDisponible } from '../lib/export.js';
import { moneda, monedaCompacta, iniciales, tituloLegible, plural } from '../lib/formato.js';
import { fechaLarga, fechaCorta } from '../lib/fechas.js';
import { TIPOS_PROCESO } from '../config.js';

const PASOS = [
  { n: 1, titulo: 'Identificación', sub: 'Correo institucional' },
  { n: 2, titulo: 'Plantilla', sub: 'Descargue el Excel' },
  { n: 3, titulo: 'Cargue y validación', sub: 'Revise los hallazgos' },
  { n: 4, titulo: 'Pase de acceso', sub: 'QR para el ingreso' }
];
const CLAVE_SESION = 'etitc-jp27:sesion';
let raiz = null;
let ctxApp = null;
let filtroHallazgos = 'todos';

// ───────── Sesión (conveniencia: sobrevive a una recarga; no es dato crítico) ─────────
function guardarSesion() {
  try { sessionStorage.setItem(CLAVE_SESION, JSON.stringify(estado.sesion)); } catch { /* opcional */ }
}
function recuperarSesion() {
  try {
    const s = JSON.parse(sessionStorage.getItem(CLAVE_SESION) || 'null');
    if (s && typeof s === 'object') Object.assign(estado.sesion, s);
  } catch { /* opcional */ }
}

const dominio = () => (estado.datos.config?.dominioInstitucional || estado.datos.directorio?.dominioInstitucional || '@itc.edu.co').toLowerCase();
const ident = () => estado.sesion.identificacion;

function puedeIr(n) {
  if (n === 1) return true;
  if (n === 2 || n === 3) return Boolean(ident()?.completa);
  if (n === 4) return Boolean(ident()?.completa && (estado.sesion.pase || (estado.sesion.validacion && estado.sesion.validacion.resumen.bloqueantes === 0)));
  return false;
}

function irPaso(n, { foco = true } = {}) {
  if (!puedeIr(n)) return;
  estado.sesion.paso = n;
  guardarSesion();
  pintarStepper();
  const cont = raiz.querySelector('[data-paso-cont]');
  cont.classList.remove('paso-enter');
  void cont.offsetWidth;
  cont.classList.add('paso-enter');
  if (n === 1) pintarPaso1(cont);
  if (n === 2) pintarPaso2(cont);
  if (n === 3) pintarPaso3(cont);
  if (n === 4) pintarPaso4(cont);
  activarAnimaciones(cont);
  if (foco) {
    const h = cont.querySelector('h2');
    if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
    raiz.querySelector('.stepper').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function pintarStepper() {
  const actual = estado.sesion.paso || 1;
  const ol = raiz.querySelector('.stepper');
  ol.innerHTML = PASOS.map((p) => {
    const hecho = p.n < actual || (p.n === 4 && estado.sesion.pase);
    const habil = puedeIr(p.n);
    return `<li class="step ${p.n === actual ? 'is-current' : ''} ${hecho && p.n !== actual ? 'is-done' : ''}">
      <button type="button" class="step-btn" data-ir="${p.n}" ${p.n === actual ? 'aria-current="step"' : ''} aria-disabled="${!habil}" aria-label="Paso ${p.n}: ${p.titulo}${hecho ? ' (completado)' : ''}">
        <span class="step-num">${hecho && p.n !== actual ? icono('check', 'icon-sm') : p.n}</span>
        <span class="step-text">${p.titulo}<small>${p.sub}</small></span>
      </button></li>`;
  }).join('');
  raiz.querySelector('.stepper-bar > span').style.width = `${((actual - 1) / 3) * 100}%`;
}

// ───────── Paso 1: identificación ─────────
function tarjetaPersona(p, { conNombreEditable = false } = {}) {
  const d = dependencia(p.dependencia);
  return `<div class="persona-card reveal">
    <span class="avatar" aria-hidden="true">${esc(iniciales(p.nombre || 'Sin nombre'))}</span>
    <div class="persona-info">
      <strong class="persona-nombre">${esc(p.nombre || 'Nombre no registrado en el directorio')}</strong>
      <span>${esc(tituloLegible(p.cargo))}</span>
      <span class="row" style="gap:6px;margin-top:4px">
        ${d ? `<span class="badge proc-${esc(d.tipoProceso)}"><span class="proc-dot"></span>${esc(d.codigo)} · ${esc(d.nombre)}</span>` : ''}
        <span class="badge">${esc(p.vinculacion === 'contratista' ? 'Contratista' : 'Funcionario')}</span>
        ${p.grupo ? `<span class="badge">${esc(p.grupo)}</span>` : ''}
      </span>
    </div>
    ${conNombreEditable ? '' : `<span class="badge badge-ok">${icono('usuarioCheck', 'icon-sm')}Verificado</span>`}
  </div>`;
}

function opcionesDependencia(sel) {
  return `<option value="">Elija su dependencia…</option>${dependencias().map((d) => `<option value="${esc(d.codigo)}" ${String(sel) === String(d.codigo) ? 'selected' : ''}>${esc(d.codigo)} · ${esc(d.nombre)}</option>`).join('')}`;
}

function pintarPaso1(cont) {
  const i = ident() || {};
  cont.innerHTML = `<div class="grid-2 paso-grid">
    <div class="card reveal">
      <h2>Identifíquese</h2>
      <p class="muted">Use su correo institucional. Lo buscamos en el Directorio de Funcionarios 2026 (corte ${esc(fechaCorta(estado.datos.directorio?.actualizado))}) para llenar sus datos.</p>
      <form class="stack" data-form-ident novalidate>
        <div class="field">
          <label class="field-label" for="correo">Correo institucional</label>
          <div class="input-icon">${icono('correo')}<input class="input" id="correo" name="correo" type="email" inputmode="email" autocomplete="email" placeholder="usuario${esc(dominio())}" value="${esc(i.correo || '')}" aria-describedby="correo-ayuda correo-error" required></div>
          <span class="field-hint" id="correo-ayuda">Solo se aceptan correos terminados en ${esc(dominio())}.</span>
          <span class="field-error" id="correo-error" role="alert"></span>
        </div>
        <div data-resultado aria-live="polite"></div>
        <div class="row-between">
          <span class="muted" style="font-size:.82rem">¿No tiene correo en el directorio? En el ingreso lo registran manualmente.</span>
          <button type="submit" class="btn btn-primary btn-lg" data-continuar disabled>Continuar ${icono('flecha', 'icon-sm')}</button>
        </div>
      </form>
    </div>
    <aside class="card card-flat aside-cadena reveal">
      <span class="eyebrow">${icono('capas', 'icon-sm')}Así funciona</span>
      <h3>Del correo al pase en cuatro pasos</h3>
      <ol class="mini-pasos">
        <li><strong>Identifíquese</strong> con su correo institucional.</li>
        <li><strong>Descargue la plantilla</strong> generada para su dependencia, con listas desplegables.</li>
        <li><strong>Cárguela</strong>: el aplicativo revisa la cadena lógica y le dice qué corregir, hoja por hoja y fila por fila.</li>
        <li><strong>Reciba su pase</strong> con QR para el ingreso a la jornada.</li>
      </ol>
      <hr>
      <p class="muted mb-0" style="font-size:.86rem">Regla de oro: nada existe aguas abajo sin su eslabón aguas arriba.</p>
      <div style="margin-top:12px">${cadenaLogica({ incluirRiesgos: ctxApp.riesgosActivo })}</div>
    </aside>
  </div>`;

  const form = cont.querySelector('[data-form-ident]');
  const input = cont.querySelector('#correo');
  const err = cont.querySelector('#correo-error');
  const res = cont.querySelector('[data-resultado]');
  const btn = cont.querySelector('[data-continuar]');
  let seleccion = null; // persona elegida del directorio
  let t = null;

  const evaluarCompleto = () => {
    const correo = input.value.trim().toLowerCase();
    const okDominio = correo.endsWith(dominio()) && correo.length > dominio().length;
    let ok = okDominio;
    const nombre = res.querySelector('[name="nombre"]');
    const cargo = res.querySelector('[name="cargo"]');
    const dep = res.querySelector('[name="dependencia"]');
    if (nombre && !nombre.value.trim()) ok = false;
    if (cargo && !cargo.value.trim()) ok = false;
    if (dep && !dep.value) ok = false;
    if (res.querySelector('[data-elegir]') && !seleccion) ok = false;
    btn.disabled = !ok;
  };

  const buscar = () => {
    const correo = input.value.trim().toLowerCase();
    seleccion = null;
    err.textContent = '';
    input.removeAttribute('aria-invalid');
    if (!correo) { res.innerHTML = ''; evaluarCompleto(); return; }
    if (!correo.includes('@')) { res.innerHTML = `<p class="field-hint">Complete el correo: ¿${esc(correo)}${esc(dominio())}?</p>`; evaluarCompleto(); return; }
    if (!correo.endsWith(dominio())) {
      err.textContent = `Use su correo institucional terminado en ${dominio()}.`;
      input.setAttribute('aria-invalid', 'true');
      res.innerHTML = '';
      evaluarCompleto();
      return;
    }
    const encontrados = personasPorCorreo(correo);
    if (!encontrados.length) {
      res.innerHTML = `<div class="notice reveal is-visible">${icono('info')}<div><strong>Correo no encontrado en el directorio.</strong> Puede continuar: su registro quedará como <em>no verificado</em> para revisión de la OAPDI. Complete sus datos.</div></div>
        <div class="grid-2" style="gap:14px;margin-top:14px">
          <label class="field"><span class="field-label">Nombre completo</span><input class="input" name="nombre" autocomplete="name" value="${esc(i.correo === correo ? i.nombre || '' : '')}" required></label>
          <label class="field"><span class="field-label">Cargo</span><input class="input" name="cargo" autocomplete="organization-title" value="${esc(i.correo === correo ? i.cargo || '' : '')}" required></label>
        </div>
        <label class="field" style="margin-top:14px"><span class="field-label">Dependencia</span><select class="select" name="dependencia" required>${opcionesDependencia(i.correo === correo ? i.dependencia : '')}</select></label>`;
    } else if (encontrados.length > 1) {
      res.innerHTML = `<div class="notice reveal is-visible">${icono('personas')}<div><strong>Este buzón lo comparten ${encontrados.length} personas en el directorio.</strong> Elija quién es usted.</div></div>
        <div class="elegir" role="radiogroup" aria-label="Elija su registro" data-elegir>
          ${encontrados.map((p) => `<label class="elegir-op"><input type="radio" name="persona" value="${esc(p.id)}"> ${tarjetaPersona(p).replace('reveal', 'reveal is-visible')}</label>`).join('')}
        </div><div data-extra></div>`;
    } else {
      seleccion = encontrados[0];
      res.innerHTML = tarjetaPersona(seleccion).replace('reveal', 'reveal is-visible') + extraPersona(seleccion, i);
    }
    evaluarCompleto();
  };

  const extraPersona = (p, previo) => {
    let html = '';
    if (!p.nombre) {
      html += `<label class="field" style="margin-top:14px"><span class="field-label">El directorio no registra su nombre. Escríbalo como debe aparecer en el pase</span>
        <input class="input" name="nombre" autocomplete="name" value="${esc(previo.personaId === p.id ? previo.nombre || '' : '')}" required></label>`;
    }
    if (p.revisarDependencia) {
      html += `<label class="field" style="margin-top:14px"><span class="field-label">Confirme su dependencia</span>
        <select class="select" name="dependencia" required>${opcionesDependencia(previo.personaId === p.id ? previo.dependencia : p.dependencia)}</select>
        <span class="field-hint">En el directorio su dependencia se infirió por el correo o el cargo; la OAPDI la validará.</span></label>`;
    }
    const pase = estado.consolidado.pases.find((x) => x.e === p.correo && (!p.nombre || x.n === p.nombre));
    if (pase) html += `<div class="notice notice-ok" style="margin-top:14px">${icono('checkCirculo')}<div><strong>Ya tiene un pase emitido</strong> (${esc(pase.id)}). Puede continuar para verlo o volver a cargar su formulación.</div></div>`;
    return html;
  };

  input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(buscar, 220); });
  input.addEventListener('blur', () => {
    const v = input.value.trim();
    if (v && !v.includes('@')) { input.value = `${v}${dominio()}`; buscar(); }
  });
  res.addEventListener('input', evaluarCompleto);
  res.addEventListener('change', (ev) => {
    if (ev.target.name === 'persona') {
      const correo = input.value.trim().toLowerCase();
      seleccion = personasPorCorreo(correo).find((p) => p.id === ev.target.value);
      res.querySelectorAll('.elegir-op').forEach((l) => l.classList.toggle('is-selected', l.contains(ev.target)));
      res.querySelector('[data-extra]').innerHTML = extraPersona(seleccion, i);
    }
    evaluarCompleto();
  });
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (btn.disabled) return;
    const correo = input.value.trim().toLowerCase();
    const nombreInput = res.querySelector('[name="nombre"]');
    const cargoInput = res.querySelector('[name="cargo"]');
    const depInput = res.querySelector('[name="dependencia"]');
    const nuevo = seleccion
      ? {
        correo,
        personaId: seleccion.id,
        nombre: (nombreInput ? nombreInput.value : seleccion.nombre).trim(),
        nombreIngresado: Boolean(nombreInput),
        cargo: tituloLegible(seleccion.cargo),
        dependencia: depInput ? depInput.value : seleccion.dependencia,
        verificado: true,
        revisarDependencia: Boolean(seleccion.revisarDependencia)
      }
      : { correo, personaId: null, nombre: nombreInput.value.trim(), cargo: cargoInput.value.trim(), dependencia: depInput.value, verificado: false };
    nuevo.completa = true;
    const cambio = !ident() || ident().correo !== nuevo.correo || ident().personaId !== nuevo.personaId;
    estado.sesion.identificacion = nuevo;
    if (cambio) { estado.sesion.validacion = null; estado.sesion.pase = buscarPaseExistente(nuevo); }
    toast({ tipo: 'ok', titulo: `Hola, ${nuevo.nombre.split(' ')[0] === 'Hno.' ? nuevo.nombre.split(' ').slice(0, 2).join(' ') : nuevo.nombre.split(' ')[0]}`, mensaje: `Formulará para ${dependencia(nuevo.dependencia)?.nombre || nuevo.dependencia}.` });
    irPaso(estado.sesion.pase ? 4 : 2);
  });
  if (input.value) buscar();
  setTimeout(() => input.focus(), 60);
}

function buscarPaseExistente(i) {
  return estado.consolidado.pases.find((p) => p.e === i.correo && p.n === i.nombre && String(p.d) === String(i.dependencia)) || null;
}

// ───────── Paso 2: plantilla ─────────
function pintarPaso2(cont) {
  const i = ident();
  const d = dependencia(i.dependencia);
  const max = umbral('maxAccionesPorDependencia', 15);
  cont.innerHTML = `<div class="grid-2 paso-grid">
    <div class="card reveal">
      <h2>Descargue su plantilla</h2>
      <p class="muted">Se construye en este momento para <strong>${esc(d ? `${d.codigo} · ${d.nombre}` : i.dependencia)}</strong>, con los catálogos vigentes de metas, líneas del PDI, modalidades y festivos.</p>
      <ul class="hojas-lista">
        <li><span class="hoja-ico">${icono('info', 'icon-sm')}</span><div><strong>Instructivo</strong><span>Qué se pide, la cadena lógica, la regla de evidencia macro y los errores más comunes.</span></div></li>
        <li><span class="hoja-ico">${icono('metas', 'icon-sm')}</span><div><strong>Acciones</strong><span>Meta 2027, línea del PDI, indicador y evidencia macro. Idealmente no más de ${max}.</span></div></li>
        <li><span class="hoja-ico">${icono('necesidades', 'icon-sm')}</span><div><strong>Necesidades</strong><span>Cada una amarrada al código de la acción que la origina.</span></div></li>
        <li><span class="hoja-ico">${icono('adquisiciones', 'icon-sm')}</span><div><strong>Adquisiciones</strong><span>Modalidad y fecha de operación; la fecha límite de radicación se calcula sola.</span></div></li>
        <li><span class="hoja-ico">${icono('capas', 'icon-sm')}</span><div><strong>Listas</strong><span>Catálogos de las listas desplegables. No se modifica.</span></div></li>
      </ul>
      ${xlsxDisponible() ? '' : `<div class="notice notice-danger" style="margin-bottom:14px">${icono('alerta')}<div>La librería de Excel no cargó, por eso no se puede generar la plantilla. Revise la conexión y recargue la página.</div></div>`}
      <div class="btn-group">
        <button type="button" class="btn btn-primary btn-lg" data-accion="plantilla" ${xlsxDisponible() ? '' : 'disabled'}>${icono('excel', 'icon-sm')}Descargar plantilla (.xlsx)</button>
        <button type="button" class="btn btn-lg" data-accion="ejemplo" ${xlsxDisponible() ? '' : 'disabled'}>${icono('ojo', 'icon-sm')}Ver un ejemplo diligenciado</button>
      </div>
    </div>
    <aside class="card card-flat reveal">
      <span class="eyebrow">${icono('chispa', 'icon-sm')}Antes de diligenciar</span>
      <h3>La cadena se respeta también en el Excel</h3>
      <div style="margin:12px 0 16px">${cadenaLogica({ activo: 'accion', incluirRiesgos: ctxApp.riesgosActivo })}</div>
      <ul class="check-lista">
        <li>${icono('check', 'icon-sm')}Las listas desplegables de códigos solo ofrecen acciones y necesidades que ya existen en el archivo.</li>
        <li>${icono('check', 'icon-sm')}No cambie el nombre de las hojas ni de los encabezados.</li>
        <li>${icono('check', 'icon-sm')}La evidencia es un informe macro por acción, no una lista de productos.</li>
        <li>${icono('check', 'icon-sm')}Puede cargar el archivo cuantas veces quiera: vale la última versión.</li>
      </ul>
      <button type="button" class="btn btn-block" data-ir="3" style="margin-top:16px">Ya la diligencié: ir a cargarla ${icono('flecha', 'icon-sm')}</button>
    </aside>
  </div>`;
  on(cont, 'click', '[data-accion]', async (ev, b) => {
    try {
      b.disabled = true;
      const logo = await obtenerLogo();
      const r = generarPlantilla({
        persona: i, dependencia: d, dependencias: dependencias(), metas: estado.datos.metas.metasInstitucionales,
        modalidades: estado.datos.modalidades.modalidades, festivos: estado.datos.festivos.festivos, config: estado.datos.config,
        logo: logo.bytes, ejemplo: b.dataset.accion === 'ejemplo'
      });
      descargarBlob(r.blob, r.nombre);
      toast({ tipo: 'ok', titulo: b.dataset.accion === 'ejemplo' ? 'Ejemplo descargado' : 'Plantilla descargada', mensaje: r.conFormato ? `${r.nombre} está lista para diligenciar.` : `${r.nombre} se generó sin formato institucional, pero es válida.` });
    } catch (e) { toastError('No se pudo generar la plantilla', e, e.message); } finally { b.disabled = false; }
  });
}

// ───────── Paso 3: cargue y validación ─────────
function pintarPaso3(cont) {
  const i = ident();
  const previa = estado.consolidado.formulaciones.find((f) => f.dependencia === i.dependencia);
  cont.innerHTML = `<div class="stack">
    <div class="card reveal">
      <div class="card-head"><div><h2>Cargue su Excel diligenciado</h2><p>Se lee en su navegador: el archivo no se envía a ningún servidor.</p></div></div>
      <label class="dropzone" data-dropzone>
        <span class="dropzone-icon">${icono('subir', 'icon-lg')}</span>
        <strong class="ink">Arrastre aquí el archivo o haga clic para buscarlo</strong>
        <span class="muted">Formatos .xlsx o .xls · máximo 15 MB</span>
        <input type="file" accept=".xlsx,.xls,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" data-archivo aria-label="Elegir el archivo de Excel">
      </label>
      ${previa && previa.estado === 'validada' && !estado.sesion.validacion ? `<div class="notice notice-ok" style="margin-top:14px">${icono('checkCirculo')}<div style="flex:1"><strong>Su dependencia ya tiene una formulación validada</strong>, cargada por ${esc(previa.persona?.nombre || 'otra persona')} el ${esc(fechaCorta(String(previa.cargadoEn).slice(0, 10)))} (${esc(previa.archivo)}).
        <div class="btn-group" style="margin-top:10px"><button type="button" class="btn btn-sm btn-primary" data-usar-previa>Usarla para emitir mi pase</button></div></div></div>` : ''}
    </div>
    <div data-resultado-validacion></div>
  </div>`;
  const zona = cont.querySelector('[data-dropzone]');
  const inputArchivo = cont.querySelector('[data-archivo]');
  ['dragenter', 'dragover'].forEach((t) => zona.addEventListener(t, (ev) => { ev.preventDefault(); zona.classList.add('is-over'); }));
  ['dragleave', 'drop'].forEach((t) => zona.addEventListener(t, (ev) => { ev.preventDefault(); zona.classList.remove('is-over'); }));
  zona.addEventListener('drop', (ev) => { const f = ev.dataTransfer.files[0]; if (f) procesarArchivo(f, cont); });
  inputArchivo.addEventListener('change', () => { const f = inputArchivo.files[0]; inputArchivo.value = ''; if (f) procesarArchivo(f, cont); });
  const usar = cont.querySelector('[data-usar-previa]');
  if (usar) usar.addEventListener('click', () => {
    estado.sesion.validacion = { archivo: previa.archivo, resumen: previa.resumen, hallazgos: previa.hallazgos, reutilizada: true };
    guardarSesion();
    irPaso(4);
  });
  if (estado.sesion.validacion) pintarResultado(cont.querySelector('[data-resultado-validacion]'), estado.sesion.validacion);
}

async function procesarArchivo(archivo, cont) {
  const destino = cont.querySelector('[data-resultado-validacion]');
  destino.innerHTML = `<div class="card"><div class="row">${'<span class="spinner" aria-hidden="true"></span>'}<strong class="ink" aria-live="polite">Leyendo y validando «${esc(archivo.name)}»…</strong></div><div class="skeleton skeleton-line" style="margin-top:18px"></div><div class="skeleton skeleton-line" style="width:70%"></div></div>`;
  try {
    const libro = await leerLibro(archivo);
    const i = ident();
    const r = validarFormulacion(libro, {
      metas: estado.datos.metas.metasInstitucionales,
      modalidades: estado.datos.modalidades.modalidades,
      calendario: estado.indices.calendario,
      umbrales: estado.datos.config?.umbrales,
      dependencia: i.dependencia
    });
    const formulacion = {
      dependencia: i.dependencia,
      archivo: archivo.name,
      cargadoEn: new Date().toISOString(),
      persona: { nombre: i.nombre, correo: i.correo, cargo: i.cargo, verificado: i.verificado },
      estado: r.resumen.bloqueantes ? 'con-bloqueantes' : 'validada',
      hallazgos: r.hallazgos,
      resumen: r.resumen,
      acciones: r.acciones,
      necesidades: r.necesidades,
      adquisiciones: r.adquisiciones
    };
    try {
      await ctxApp.almacen.guardarFormulacion(formulacion);
      await ctxApp.refrescarConsolidado();
    } catch (e) { toastError('La validación terminó, pero no se pudo guardar el respaldo local', e, e.message); }
    estado.sesion.validacion = { archivo: archivo.name, resumen: r.resumen, hallazgos: r.hallazgos };
    guardarSesion();
    pintarStepper();
    pintarResultado(destino, estado.sesion.validacion);
    toast(r.resumen.bloqueantes
      ? { tipo: 'warn', titulo: r.resumen.bloqueantes === 1 ? '1 hallazgo bloqueante' : `${r.resumen.bloqueantes} hallazgos bloqueantes`, mensaje: 'Corrija el archivo y vuelva a cargarlo.' }
      : { tipo: 'ok', titulo: 'Formulación válida', mensaje: r.resumen.advertencias ? `Quedan ${plural(r.resumen.advertencias, 'advertencia')} registradas. Ya puede emitir su pase.` : 'Sin hallazgos. Ya puede emitir su pase.' });
  } catch (e) {
    console.error(e);
    destino.innerHTML = `<div class="notice notice-danger reveal is-visible">${icono('alerta')}<div><strong>No se pudo leer el archivo.</strong> ${esc(e.message)}</div></div>`;
  }
}

function pintarResultado(destino, v) {
  const r = v.resumen;
  const bloq = r.bloqueantes;
  destino.innerHTML = `<div class="stack">
    <div class="resultado-banner ${bloq ? 'is-bloqueado' : 'is-ok'} reveal">
      <span class="resultado-ico">${icono(bloq ? 'bloqueo' : 'checkCirculo', 'icon-lg')}</span>
      <div>
        <h2 class="mb-0">${bloq ? `${bloq === 1 ? '1 error bloqueante impide' : `${bloq} errores bloqueantes impiden`} emitir el pase` : 'Formulación válida: puede emitir su pase'}</h2>
        <p class="mb-0">${esc(v.archivo)} · ${plural(r.advertencias, 'advertencia')} ${r.advertencias === 1 ? 'registrada' : 'registradas'}${v.reutilizada ? ' · formulación reutilizada de su dependencia' : ''}</p>
      </div>
      <div class="btn-group">
        ${v.hallazgos.length ? `<button type="button" class="btn ${bloq ? '' : 'btn-hero'}" data-informe>${icono('excel', 'icon-sm')}Informe de hallazgos</button>` : ''}
        <button type="button" class="btn ${bloq ? 'btn-primary' : 'btn-hero'}" data-ir="4" ${bloq ? 'disabled aria-disabled="true"' : ''}>${icono('qr', 'icon-sm')}Emitir mi pase</button>
      </div>
    </div>
    <div class="grid-4">
      ${tarjetaCifra({ etiqueta: 'Acciones', valor: r.acciones, iconoNombre: 'metas', pie: r.acciones > umbral('maxAccionesPorDependencia', 15) ? 'Por encima del tope sugerido' : 'Registradas en la hoja Acciones', alerta: r.acciones === 0 })}
      ${tarjetaCifra({ etiqueta: 'Necesidades', valor: r.necesidades, iconoNombre: 'necesidades', pie: 'Amarradas a una acción' })}
      ${tarjetaCifra({ etiqueta: 'Adquisiciones', valor: r.adquisiciones, iconoNombre: 'adquisiciones', pie: `Valor ${monedaCompacta(r.valorAdquisiciones)}` })}
      ${tarjetaCifra({ etiqueta: 'Valor total de necesidades', valor: r.valorNecesidades, formato: 'monedaCompacta', iconoNombre: 'dinero', pie: moneda(r.valorNecesidades) })}
    </div>
    <div class="grid-2 resultado-grid">
      <div class="card reveal">
        <div class="card-head"><div><h3>Distribución por trimestre</h3><p>Acciones según su trimestre de inicio y necesidades según el trimestre en que se requieren.</p></div></div>
        <div data-grafica-trim></div>
      </div>
      <div class="card reveal">
        <div class="card-head">
          <div><h3>Hallazgos</h3><p>Cada hallazgo dice la hoja, la fila y qué corregir.</p></div>
          <div class="btn-group" role="group" aria-label="Filtrar hallazgos">
            ${[['todos', `Todos (${v.hallazgos.length})`], ['bloqueante', `Bloqueantes (${bloq})`], ['advertencia', `Advertencias (${r.advertencias})`]].map(([k, t]) => `<button type="button" class="chip" data-filtro-h="${k}" aria-pressed="${filtroHallazgos === k}">${t}</button>`).join('')}
          </div>
        </div>
        <div data-hallazgos class="hallazgos-scroll"></div>
      </div>
    </div>
  </div>`;
  const pintarHallazgos = () => {
    const lista = v.hallazgos.filter((h) => filtroHallazgos === 'todos' || h.severidad === filtroHallazgos);
    destino.querySelector('[data-hallazgos]').innerHTML = lista.length
      ? `<ul class="findings">${lista.map((h, k) => `<li class="finding ${h.severidad === 'bloqueante' ? 'finding-block' : 'finding-warn'}" style="animation-delay:${Math.min(k, 12) * 30}ms">
          <span class="finding-icon">${icono(h.severidad === 'bloqueante' ? 'bloqueo' : 'alerta', 'icon-sm')}</span>
          <div>
            <div class="finding-title">${esc(h.titulo)}</div>
            <div class="finding-meta"><span class="badge ${h.severidad === 'bloqueante' ? 'badge-danger' : 'badge-warn'}">${h.severidad === 'bloqueante' ? 'Bloqueante' : 'Advertencia'}</span><span class="badge">Hoja ${esc(h.hoja)}</span>${h.fila ? `<span class="badge">Fila ${h.fila}</span>` : ''}</div>
            <p class="mb-0">${esc(h.detalle)}</p>
            <p class="finding-fix mb-0"><strong>Qué corregir:</strong> ${esc(h.correccion)}</p>
          </div></li>`).join('')}</ul>`
      : estadoVacio({ titulo: filtroHallazgos === 'todos' ? 'Sin hallazgos' : 'Nada en esta categoría', texto: 'La formulación cumple la cadena lógica y las reglas de la jornada.', iconoNombre: 'checkCirculo' });
    activarAnimaciones(destino);
  };
  on(destino, 'click', '[data-filtro-h]', (ev, b) => {
    filtroHallazgos = b.dataset.filtroH;
    destino.querySelectorAll('[data-filtro-h]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    pintarHallazgos();
  });
  const informe = destino.querySelector('[data-informe]');
  if (informe) informe.addEventListener('click', async () => {
    try {
      const logo = await obtenerLogo();
      const i = ident();
      const r2 = exportarExcel({
        nombreArchivo: `JP2027_Hallazgos_${i.dependencia}.xlsx`,
        logo: logo.bytes,
        hojas: [{
          nombre: 'Hallazgos', titulo: 'Informe de hallazgos de validación', subtitulo: `${i.dependencia} · ${dependencia(i.dependencia)?.nombre || ''} · Archivo: ${v.archivo}`,
          columnas: [{ titulo: 'Severidad', ancho: 14 }, { titulo: 'Hoja', ancho: 16 }, { titulo: 'Fila', ancho: 8, tipo: 'numero' }, { titulo: 'Hallazgo', ancho: 44 }, { titulo: 'Detalle', ancho: 60 }, { titulo: 'Qué corregir', ancho: 60 }],
          filas: v.hallazgos.map((h) => [h.severidad === 'bloqueante' ? 'Bloqueante' : 'Advertencia', h.hoja, h.fila, h.titulo, h.detalle, h.correccion])
        }]
      });
      descargarBlob(r2.blob, r2.nombre);
    } catch (e) { toastError('No se pudo exportar el informe', e, e.message); }
  });
  pintarHallazgos();
  graficaBarras(destino.querySelector('[data-grafica-trim]'), {
    etiquetas: r.porTrimestre.map((t) => `T${t.t}`),
    series: [
      { nombre: 'Acciones que inician', datos: r.porTrimestre.map((t) => t.acciones) },
      { nombre: 'Necesidades requeridas', datos: r.porTrimestre.map((t) => t.necesidades) }
    ],
    titulo: 'Acciones y necesidades por trimestre',
    alto: 240
  });
  activarAnimaciones(destino);
}

// ───────── Paso 4: pase ─────────
async function pintarPaso4(cont) {
  const i = ident();
  const v = estado.sesion.validacion;
  if (!estado.sesion.pase) {
    if (!v || v.resumen.bloqueantes) {
      cont.innerHTML = estadoVacio({ titulo: 'Aún no puede emitir su pase', texto: 'Primero cargue una formulación sin errores bloqueantes en el paso 3.', iconoNombre: 'qr', accion: '<button type="button" class="btn btn-primary" data-ir="3">Ir al paso 3</button>' });
      return;
    }
    const existente = buscarPaseExistente(i);
    const pase = existente || crearPase({ nombre: i.nombre, cargo: i.cargo, dependencia: String(i.dependencia), correo: i.correo, prefijo: estado.indices.prefijo, sal: estado.indices.sal });
    pase.verificado = i.verificado;
    pase.emitido = pase.emitido || new Date().toISOString();
    try {
      await ctxApp.almacen.guardarPase(pase);
      await ctxApp.refrescarConsolidado();
    } catch (e) { toastError('El pase se emitió, pero no se pudo guardar el respaldo local', e, e.message); }
    estado.sesion.pase = pase;
    guardarSesion();
    pintarStepper();
    if (!existente) toast({ tipo: 'ok', titulo: 'Pase emitido', mensaje: `Su identificador es ${pase.id}. Descárguelo o guarde una captura.` });
  }
  const p = estado.sesion.pase;
  const d = dependencia(p.d);
  const agenda = estado.datos.agenda || {};
  const logo = await obtenerLogo();
  cont.innerHTML = `<div class="pase-layout">
    <div class="pase-wrap reveal">
      <article class="pase" data-pase aria-label="Pase de acceso">
        <div class="pase-head">
          <span class="pase-logo"><img src="${esc(logo.dataUrl || 'assets/logo-etitc.png')}" alt="Logo de la Escuela Tecnológica Instituto Técnico Central"></span>
          <span class="pase-kicker">Pase de acceso</span>
          <span class="pase-evento">Jornada de Planeación 2027</span>
        </div>
        <div class="pase-persona">
          <strong class="pase-nombre">${esc(p.n)}</strong>
          <span class="pase-cargo">${esc(p.c)}</span>
        </div>
        <div class="pase-dep">
          <span class="pase-dep-cod">${esc(p.d)}</span>
          <span>${esc(d ? d.nombre : '')}${d ? `<small>Proceso ${esc((TIPOS_PROCESO[d.tipoProceso] || '').toLowerCase())}</small>` : ''}</span>
        </div>
        <div class="pase-qr" data-qr><span class="spinner" aria-hidden="true"></span></div>
        <div class="pase-id mono">${esc(p.id)}</div>
        <div class="pase-meta">
          <span>${esc(p.e)}</span>
          <span>${esc(fechaLarga(agenda.fecha))}${p.verificado === false ? ' · <b>No verificado</b>' : ''}</span>
        </div>
      </article>
    </div>
    <div class="card reveal">
      <span class="eyebrow">${icono('checkCirculo', 'icon-sm')}Listo para el ingreso</span>
      <h2>Su pase de acceso</h2>
      <p class="muted">Preséntelo en el celular o impreso. El QR contiene sus datos y una firma que permite detectar pases alterados.</p>
      <dl class="dl">
        <dt>Identificador</dt><dd class="mono">${esc(p.id)}</dd>
        <dt>Emitido</dt><dd>${esc(new Date(p.ts).toLocaleString('es-CO'))}</dd>
        <dt>Registro</dt><dd>${p.verificado === false ? '<span class="badge badge-warn">No verificado en el directorio</span>' : '<span class="badge badge-ok">Verificado en el directorio</span>'}</dd>
        ${v ? `<dt>Formulación</dt><dd>${plural(v.resumen.acciones, 'acción', 'acciones')} · ${plural(v.resumen.necesidades, 'necesidad', 'necesidades')} · ${plural(v.resumen.adquisiciones, 'adquisición', 'adquisiciones')}</dd>` : ''}
      </dl>
      <div class="btn-group" style="margin-top:20px">
        <button type="button" class="btn btn-primary" data-pase-accion="png" ${capturaDisponible() ? '' : 'disabled'}>${icono('imagen', 'icon-sm')}Descargar PNG</button>
        <button type="button" class="btn" data-pase-accion="pdf" ${capturaDisponible() && pdfDisponible() ? '' : 'disabled'}>${icono('pdf', 'icon-sm')}Descargar PDF</button>
        <button type="button" class="btn" data-pase-accion="copiar">${icono('copiar', 'icon-sm')}Copiar texto para correo</button>
      </div>
      ${capturaDisponible() ? '' : '<p class="field-hint" style="margin-top:10px">La descarga como imagen no está disponible porque html2canvas no cargó. Puede tomar una captura de pantalla del pase.</p>'}
      <hr>
      <div class="btn-group">
        <button type="button" class="btn btn-ghost" data-pase-accion="agenda">${icono('agenda', 'icon-sm')}Ver la agenda de mi dependencia</button>
        <button type="button" class="btn btn-ghost" data-pase-accion="nueva">${icono('refrescar', 'icon-sm')}Cargar una nueva versión</button>
        <button type="button" class="btn btn-ghost" data-pase-accion="otra">${icono('persona', 'icon-sm')}Identificar a otra persona</button>
      </div>
    </div>
  </div>`;

  const cajaQR = cont.querySelector('[data-qr]');
  try {
    if (!qrDisponible()) throw new Error('sin librería');
    const url = await qrComoDataUrl(contenidoQR(p), { tamano: 420 });
    cajaQR.innerHTML = `<img src="${url}" alt="Código QR del pase ${esc(p.id)}" width="200" height="200">`;
  } catch {
    cajaQR.innerHTML = `<div class="pase-qr-fallback">${icono('qr', 'icon-lg')}<span>QR no disponible. En el ingreso pueden registrarlo con su identificador.</span></div>`;
  }

  on(cont, 'click', '[data-pase-accion]', async (ev, b) => {
    const accion = b.dataset.paseAccion;
    const tarjeta = cont.querySelector('[data-pase]');
    try {
      if (accion === 'png') { b.disabled = true; await elementoAPng(tarjeta, `Pase_${p.id}.png`); toast({ tipo: 'ok', titulo: 'Imagen descargada', mensaje: `Pase_${p.id}.png` }); }
      if (accion === 'pdf') { b.disabled = true; await elementoAPdf(tarjeta, `Pase_${p.id}.pdf`); toast({ tipo: 'ok', titulo: 'PDF descargado', mensaje: `Pase_${p.id}.pdf` }); }
      if (accion === 'copiar') {
        const ok = await copiarTexto(textoConfirmacion(p, v));
        toast(ok ? { tipo: 'ok', titulo: 'Texto copiado', mensaje: 'Péguelo en el correo de confirmación a la OAPDI.' } : { tipo: 'warn', titulo: 'No se pudo copiar', mensaje: 'Su navegador bloqueó el portapapeles.' });
      }
      if (accion === 'agenda') ctxApp.ir('agenda');
      if (accion === 'nueva') { estado.sesion.validacion = null; guardarSesion(); irPaso(3); }
      if (accion === 'otra') { estado.sesion = { identificacion: null, validacion: null, pase: null, paso: 1 }; guardarSesion(); irPaso(1); }
    } catch (e) { toastError('No se pudo completar la acción', e, e.message); } finally { b.disabled = false; }
  });
}

function textoConfirmacion(p, v) {
  const d = dependencia(p.d);
  const agenda = estado.datos.agenda || {};
  const contacto = estado.datos.config?.evento?.correoContacto || 'planeacion@itc.edu.co';
  return [
    'Asunto: Pase de acceso — Jornada de Planeación 2027',
    '',
    'Cordial saludo:',
    '',
    `Confirmo que la dependencia ${p.d} – ${d ? d.nombre : ''} cargó su formulación 2027 en el aplicativo de la jornada y obtuvo el pase de acceso.`,
    '',
    `• Pase: ${p.id}`,
    `• Asistente: ${p.n} – ${p.c}`,
    `• Correo: ${p.e}`,
    v ? `• Formulación: ${v.resumen.acciones} acciones, ${v.resumen.necesidades} necesidades (${moneda(v.resumen.valorNecesidades)}) y ${v.resumen.adquisiciones} adquisiciones. Advertencias registradas: ${v.resumen.advertencias}.` : '',
    `• Jornada: ${fechaLarga(agenda.fecha)} · ${agenda.sede || ''}`,
    '',
    `Copia a: ${contacto}`,
    '',
    'Atentamente,',
    p.n
  ].filter((l) => l !== null).join('\n');
}

function montar(panel, ctx) {
  raiz = panel;
  ctxApp = ctx;
  recuperarSesion();
  if (!estado.sesion.paso) estado.sesion.paso = 1;
  panel.innerHTML = `<div class="container page">
    <header class="page-head reveal">
      <div>
        <span class="eyebrow">${icono('formulacion', 'icon-sm')}Formulación y pase</span>
        <h1>Formule su planeación 2027 y obtenga su pase</h1>
        <p class="lead">Un solo archivo por dependencia, validado en el momento contra la cadena lógica de la planeación.</p>
      </div>
      ${cadenaLogica({ incluirRiesgos: ctx.riesgosActivo })}
    </header>
    <nav class="card card-tight stepper-card reveal" aria-label="Pasos de la formulación">
      <ol class="stepper"></ol>
      <div class="stepper-bar" aria-hidden="true"><span></span></div>
    </nav>
    <div data-paso-cont class="paso-cont"></div>
  </div>`;
  on(panel, 'click', '[data-ir]', (ev, b) => {
    if (b.getAttribute('aria-disabled') === 'true' || b.disabled) {
      if (b.classList.contains('step-btn')) toast({ tipo: 'info', titulo: 'Paso bloqueado', mensaje: 'Complete primero los pasos anteriores.' });
      return;
    }
    irPaso(Number(b.dataset.ir));
  });
  if (!puedeIr(estado.sesion.paso)) estado.sesion.paso = 1;
  irPaso(estado.sesion.paso, { foco: false });
}

export const pestanaFormulacion = {
  id: 'formulacion',
  titulo: 'Formulación y pase',
  tituloCorto: 'Formulación y pase',
  icono: 'formulacion',
  montar,
  alMostrar() { pintarStepper(); }
};
