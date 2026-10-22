/*
 * cargue.js — Flujo compartido de las pestañas Plan de acción y Plan de necesidades, pensado para celular:
 *   1. Descargue la plantilla   2. Identifíquese (directorio + área funcional + equipo)
 *   3. Cargue el archivo diligenciado (validación en el navegador)   4. Registro: pase QR o constancia.
 * Una tarea por pantalla, botones grandes y la identificación compartida entre ambas pestañas.
 */
import { PREFIJO_LOCAL } from '../config.js';
import { estado, on as alEvento, areas, area as areaPorId, dependencia, dependencias, personasPorCorreo, sugerirArea, registroVigente } from '../estado.js';
import { esc, on } from './dom.js';
import { icono } from './iconos.js';
import { toast, toastError } from './toast.js';
import { estadoVacio, activarAnimaciones } from './cards.js';
import { abrirLibro } from '../lib/libro.js';
import { exportarExcel, xlsxDisponible } from '../lib/excel.js';
import { descargarBlob, obtenerLogo } from '../lib/export.js';
import { registrarCargue, microsoftListo } from '../lib/registro.js';
import { normalizar, tituloLegible, iniciales, plural } from '../lib/formato.js';
import { fechaCorta, horaLegible } from '../lib/fechas.js';

const CLAVE_IDENT = `${PREFIJO_LOCAL}:identificacion`;
const dominio = () => estado.datos?.config?.dominioInstitucional || '@itc.edu.co';
const correoValido = (c) => /^[a-z0-9._%+-]+$/.test(String(c).split('@')[0] || '') && String(c).endsWith(dominio()) && String(c).length > dominio().length;

// ───────── Identificación compartida ─────────
export function identificacion() {
  if (estado.identificacion) return estado.identificacion;
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE_IDENT) || 'null');
    if (v && v.completa && areaPorId(v.areaId)) estado.identificacion = v;
  } catch { /* sin almacenamiento */ }
  return estado.identificacion;
}
function guardarIdentificacion(v) {
  estado.identificacion = v;
  try { if (v) localStorage.setItem(CLAVE_IDENT, JSON.stringify(v)); else localStorage.removeItem(CLAVE_IDENT); } catch { /* opcional */ }
}

function opcionesArea(seleccion) {
  const porDep = new Map();
  areas().forEach((a) => { const k = String(a.dependencia); if (!porDep.has(k)) porDep.set(k, []); porDep.get(k).push(a); });
  const orden = dependencias().map((d) => String(d.codigo)).filter((c) => porDep.has(c));
  [...porDep.keys()].forEach((k) => { if (!orden.includes(k)) orden.push(k); });
  return `<option value="">Elija su área funcional…</option>${orden.map((k) => `<optgroup label="${esc(k)} · ${esc(dependencia(k)?.nombre || '')}">
    ${porDep.get(k).map((a) => `<option value="${esc(a.id)}" ${a.id === seleccion ? 'selected' : ''}>${esc(a.id)} · ${esc(a.nombre)}</option>`).join('')}</optgroup>`).join('')}`;
}

function tarjetaIdentidad(i, { cambiar = true } = {}) {
  const a = areaPorId(i.areaId);
  return `<div class="ident-mini">
    <span class="avatar avatar-sm" aria-hidden="true">${esc(iniciales(i.nombre))}</span>
    <div class="ident-mini-info"><strong>${esc(i.nombre)}</strong><span>${esc(a ? `${a.id} · ${a.nombre}` : '')}</span></div>
    ${cambiar ? `<button type="button" class="btn btn-sm btn-ghost" data-ir="2">Cambiar</button>` : ''}
  </div>`;
}

/*
 * montarFlujo(panel, ctx, cfg)
 * cfg = { tipo, eyebrow, titulo, lead, icono, plantillas, ayuda[], tituloFinal, textoRegistrar,
 *         validar(wb, ident) → resultado, cifras(resumen) → [{ etiqueta, valor, alerta }],
 *         pintarFinal(cont, { registro, pase, correo, nuevo }), avisoCargue(ident) → html, estadoHero(ident) → html }
 */
export function montarFlujo(panel, ctx, cfg) {
  const s = { paso: 1, validacion: null, archivo: null, ultimo: null, filtro: 'todos' };
  const PASOS = [
    { n: 1, titulo: 'Descargue', sub: 'La plantilla' },
    { n: 2, titulo: 'Identifíquese', sub: 'Área y equipo' },
    { n: 3, titulo: 'Cargue', sub: 'El archivo diligenciado' },
    { n: 4, titulo: cfg.tituloFinal, sub: 'Registro automático' }
  ];

  panel.innerHTML = `<div class="container page page-app">
    <header class="app-hero reveal">
      <span class="eyebrow">${icono(cfg.icono, 'icon-sm')}${esc(cfg.eyebrow)}</span>
      <h1>${esc(cfg.titulo)}</h1>
      <p class="lead">${cfg.lead}</p>
      <div data-hero-estado></div>
    </header>
    <nav class="pasos" aria-label="Pasos"><ol class="stepper"></ol><div class="stepper-bar" aria-hidden="true"><span></span></div></nav>
    <div data-paso class="paso-cont"></div>
  </div>`;
  const cont = panel.querySelector('[data-paso]');

  const registroArea = () => { const i = identificacion(); return i ? registroVigente(cfg.tipo, i.areaId) : null; };
  const puedeIr = (n) => n <= 2 || (n === 3 && Boolean(identificacion())) || (n === 4 && Boolean(identificacion() && (s.ultimo || registroArea())));

  function pintarHero() {
    panel.querySelector('[data-hero-estado]').innerHTML = cfg.estadoHero ? cfg.estadoHero(identificacion(), registroArea()) : '';
  }
  function pintarStepper() {
    panel.querySelector('.stepper').innerHTML = PASOS.map((p) => {
      const hecho = p.n < s.paso && puedeIr(p.n + 1);
      const bloqueado = !puedeIr(p.n);
      return `<li class="step${p.n === s.paso ? ' is-current' : ''}${hecho ? ' is-done' : ''}">
        <button type="button" class="step-btn" data-ir="${p.n}" ${p.n === s.paso ? 'aria-current="step"' : ''} ${bloqueado ? 'aria-disabled="true"' : ''}>
          <span class="step-num">${hecho ? icono('check', 'icon-sm') : p.n}</span>
          <span class="step-text">${esc(p.titulo)}<small>${esc(p.sub)}</small></span>
        </button></li>`;
    }).join('');
    panel.querySelector('.stepper-bar > span').style.width = `${((s.paso - 1) / (PASOS.length - 1)) * 100}%`;
  }

  function ir(n, { foco = true } = {}) {
    if (!puedeIr(n)) n = identificacion() ? 3 : 2;
    s.paso = n;
    pintarStepper();
    pintarHero();
    cont.classList.remove('paso-enter');
    void cont.offsetWidth;
    cont.classList.add('paso-enter');
    if (n === 1) pasoDescarga();
    if (n === 2) pasoIdentificacion();
    if (n === 3) pasoCargue();
    if (n === 4) pasoFinal();
    activarAnimaciones(cont);
    if (foco) {
      const top = panel.querySelector('.pasos').getBoundingClientRect().top + window.scrollY - (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--alto-barra'), 10) || 64) - 8;
      if (window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' });
      const h = cont.querySelector('h2');
      if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
    }
  }

  // ───────── Paso 1 ─────────
  function pasoDescarga() {
    const lista = cfg.plantillas || [];
    cont.innerHTML = `<div class="stack">
      <h2 class="paso-titulo">Descargue ${lista.length > 1 ? 'los archivos' : 'la plantilla'}</h2>
      <div class="descargas">
        ${lista.map((p) => `<article class="descarga reveal">
          <span class="descarga-ico">${icono('excel', 'icon-lg')}</span>
          <div class="descarga-info">
            <div class="row" style="gap:8px"><strong>${esc(p.titulo)}</strong><span class="badge ${p.rol === 'Diligenciar' ? 'badge-solid' : ''}">${esc(p.rol)}</span></div>
            <p class="mb-0">${esc(p.descripcion)}</p>
          </div>
          <a class="btn btn-primary" href="${esc(p.archivo)}" download="${esc(p.nombreDescarga)}" data-descarga="${esc(p.id)}">${icono('descargar', 'icon-sm')}Descargar</a>
        </article>`).join('')}
      </div>
      ${cfg.ayuda?.length ? `<div class="card card-tight reveal"><h3>Al diligenciar, tenga en cuenta</h3><ul class="check-lista">${cfg.ayuda.map((t) => `<li>${icono('check', 'icon-sm')}<span>${t}</span></li>`).join('')}</ul></div>` : ''}
      <button type="button" class="btn btn-lg btn-block btn-primary" data-ir="${identificacion() ? 3 : 2}">Ya la diligencié: continuar ${icono('flecha', 'icon-sm')}</button>
    </div>`;
  }

  // ───────── Paso 2 ─────────
  function pasoIdentificacion() {
    const previo = identificacion() || {};
    const msActivo = estado.microsoft.activo && !estado.microsoft.error;
    const cuenta = estado.microsoft.cuenta;
    if (msActivo && !cuenta) {
      cont.innerHTML = `<div class="stack">
        <h2 class="paso-titulo">Ingrese con su cuenta institucional</h2>
        <div class="card ms-card reveal">
          <span class="ms-ico">${icono('persona', 'icon-lg')}</span>
          <p>El archivo se guarda en el SharePoint de la ${esc(estado.datos.config.evento.oficina)} y el ${cfg.tipo === 'accion' ? 'pase llega' : 'comprobante llega'} a su correo de Outlook. Para eso, ingrese con su cuenta <strong>${esc(dominio())}</strong>.</p>
          <button type="button" class="btn btn-lg btn-primary btn-block" data-ms-entrar>${icono('persona', 'icon-sm')}Ingresar con Microsoft 365</button>
        </div>
      </div>`;
      cont.querySelector('[data-ms-entrar]').addEventListener('click', async () => {
        try { await ctx.iniciarSesionMicrosoft(); } catch (e) { toastError('No se pudo iniciar sesión', e, e.message); }
      });
      return;
    }
    const correoInicial = cuenta ? String(cuenta.username || '').toLowerCase() : (previo.correo || '');
    cont.innerHTML = `<form class="stack" data-form-ident novalidate>
      <h2 class="paso-titulo">¿Quién registra?</h2>
      <div class="card reveal stack">
        <label class="field"><span class="field-label">Correo institucional</span>
          <div class="input-icon">${icono('correo')}<input class="input" name="correo" type="email" inputmode="email" autocomplete="email" placeholder="nombre.apellido${esc(dominio())}" value="${esc(correoInicial)}" ${cuenta ? 'readonly' : ''} required aria-describedby="correo-ayuda"></div>
          <span class="field-hint" id="correo-ayuda">${cuenta ? 'Tomado de su sesión de Microsoft 365.' : `Con él le buscamos en el directorio. Termina en ${esc(dominio())}.`}</span>
          <span class="field-error" data-error-correo role="alert"></span>
        </label>
        <div data-persona></div>
        <div class="grid-2 grid-form">
          <label class="field"><span class="field-label">Nombre del responsable</span><input class="input" name="nombre" autocomplete="name" required value="${esc(previo.correo === correoInicial ? previo.nombre || '' : '')}"></label>
          <label class="field"><span class="field-label">Cargo</span><input class="input" name="cargo" autocomplete="organization-title" required value="${esc(previo.correo === correoInicial ? previo.cargo || '' : '')}"></label>
        </div>
        <label class="field"><span class="field-label">Área funcional</span>
          <select class="select" name="area" required>${opcionesArea(previo.correo === correoInicial ? previo.areaId : '')}</select>
          <span class="field-hint" data-area-ayuda>Las 47 áreas de la plantilla, agrupadas por dependencia.</span>
        </label>
      </div>
      <div class="card reveal stack">
        <div><h3 class="mb-0">Equipo que recibe copia</h3><p class="muted mb-0">Correos institucionales de quienes formularon con usted (opcional).</p></div>
        <div class="chips-input" data-chips>
          <div class="chips-lista" data-chips-lista></div>
          <input class="chips-campo" type="email" inputmode="email" placeholder="correo${esc(dominio())} y Enter" aria-label="Agregar correo del equipo" data-chips-campo>
        </div>
        <span class="field-error" data-error-chips role="alert"></span>
        <div data-sugeridos></div>
      </div>
      <label class="consentimiento reveal"><input type="checkbox" name="consentimiento" required ${previo.consentimiento && previo.correo === correoInicial ? 'checked' : ''}>
        <span>${esc(estado.datos.config?.politicaDatos?.texto || 'Autorizo el tratamiento de mis datos para gestionar la jornada.')}${estado.datos.config?.politicaDatos?.url ? ` <a href="${esc(estado.datos.config.politicaDatos.url)}" target="_blank" rel="noopener">Política de tratamiento de datos</a>.` : ''}</span></label>
      <button type="submit" class="btn btn-lg btn-block btn-primary" data-continuar>Continuar ${icono('flecha', 'icon-sm')}</button>
    </form>`;

    const form = cont.querySelector('[data-form-ident]');
    const inCorreo = form.elements.correo;
    const inNombre = form.elements.nombre;
    const inCargo = form.elements.cargo;
    const selArea = form.elements.area;
    const cajaPersona = cont.querySelector('[data-persona]');
    let equipo = [...(previo.correo === correoInicial ? previo.correosEquipo || [] : [])];
    let persona = null;

    const pintarChips = () => {
      cont.querySelector('[data-chips-lista]').innerHTML = equipo.map((c) => `<span class="chip-correo">${esc(c)}<button type="button" aria-label="Quitar ${esc(c)}" data-quitar="${esc(c)}">${icono('cerrar', 'icon-sm')}</button></span>`).join('');
      pintarSugeridos();
    };
    const agregarCorreo = (texto) => {
      const err = cont.querySelector('[data-error-chips]');
      err.textContent = '';
      const lista = String(texto).split(/[\s,;]+/).map((x) => x.trim().toLowerCase()).filter(Boolean);
      for (let c of lista) {
        if (!c.includes('@')) c = `${c}${dominio()}`;
        if (!correoValido(c)) { err.textContent = `«${c}» no es un correo institucional válido (sin tildes ni espacios, termina en ${dominio()}).`; continue; }
        if (c === inCorreo.value.trim().toLowerCase() || equipo.includes(c)) continue;
        if (equipo.length >= 15) { err.textContent = 'Máximo 15 correos.'; break; }
        equipo.push(c);
      }
      pintarChips();
    };
    // Sugerencias del directorio: personas de la misma dependencia (y del mismo grupo primero)
    const pintarSugeridos = () => {
      const caja = cont.querySelector('[data-sugeridos]');
      const a = areaPorId(selArea.value);
      if (!a) { caja.innerHTML = ''; return; }
      const propio = inCorreo.value.trim().toLowerCase();
      const grupo = normalizar(persona?.grupo || a.nombre);
      const candidatos = (estado.datos.directorio?.personas || [])
        .filter((p) => String(p.dependencia) === String(a.dependencia) && p.correo && p.correo !== propio && !equipo.includes(p.correo.toLowerCase()))
        .map((p) => ({ p, s: normalizar(p.grupo || '') === grupo ? 0 : 1 }))
        .sort((x, y) => x.s - y.s || String(x.p.nombre).localeCompare(String(y.p.nombre)))
        .slice(0, 8);
      caja.innerHTML = candidatos.length ? `<div class="sugeridos"><span class="field-hint">Sugeridos del directorio · ${esc(dependencia(a.dependencia)?.nombre || a.dependencia)}</span>
        <div class="chips-sugeridos">${candidatos.map(({ p }) => `<button type="button" class="chip" data-sugerido="${esc(p.correo.toLowerCase())}">${icono('persona', 'icon-sm')}${esc(p.nombre || p.correo)}</button>`).join('')}</div></div>` : '';
    };

    const buscarPersona = () => {
      const correo = inCorreo.value.trim().toLowerCase();
      const err = cont.querySelector('[data-error-correo]');
      err.textContent = '';
      inCorreo.removeAttribute('aria-invalid');
      persona = null;
      if (!correo || !correo.includes('@')) { cajaPersona.innerHTML = ''; return; }
      if (!correoValido(correo)) {
        err.textContent = `Use su correo institucional terminado en ${dominio()}, sin tildes ni espacios.`;
        inCorreo.setAttribute('aria-invalid', 'true');
        cajaPersona.innerHTML = '';
        return;
      }
      const encontrados = personasPorCorreo(correo);
      if (!encontrados.length) {
        cajaPersona.innerHTML = `<div class="notice">${icono('info')}<div><strong>Correo no encontrado en el directorio.</strong> Puede continuar: el registro quedará como <em>no verificado</em> para revisión de la ${esc(estado.datos.config.evento.siglaOficina || 'OAP')}.</div></div>`;
        return;
      }
      if (encontrados.length > 1) {
        cajaPersona.innerHTML = `<div class="notice">${icono('personas')}<div><strong>Este buzón lo comparten ${encontrados.length} personas.</strong> Toque su nombre.
          <div class="chips-sugeridos" style="margin-top:8px">${encontrados.map((p) => `<button type="button" class="chip" data-elegir="${esc(p.id)}">${esc(p.nombre || 'Sin nombre')} · ${esc(tituloLegible(p.cargo))}</button>`).join('')}</div></div></div>`;
        return;
      }
      usarPersona(encontrados[0]);
    };
    const usarPersona = (p) => {
      persona = p;
      if (p.nombre) inNombre.value = p.nombre;
      if (p.cargo) inCargo.value = tituloLegible(p.cargo);
      const sug = sugerirArea(p);
      const ayuda = cont.querySelector('[data-area-ayuda]');
      if (sug && !selArea.value) { selArea.value = sug.id; ayuda.innerHTML = `${icono('chispa', 'icon-sm')} Sugerida por su grupo en el directorio: <strong>${esc(sug.nombre)}</strong>. Cámbiela si formula para otra área.`; }
      else if (!selArea.value) ayuda.textContent = `Su dependencia en el directorio: ${p.dependencia} · ${dependencia(p.dependencia)?.nombre || ''}. Elija el área para la que formula.`;
      cajaPersona.innerHTML = `<div class="persona-ok">${icono('usuarioCheck')}<span><strong>${esc(p.nombre || 'Persona del directorio')}</strong> · ${esc(tituloLegible(p.cargo))}<br><span class="muted">${esc(p.dependencia)} · ${esc(dependencia(p.dependencia)?.nombre || '')}${p.grupo ? ` · ${esc(p.grupo)}` : ''}</span></span></div>`;
      pintarSugeridos();
    };

    let t = null;
    inCorreo.addEventListener('input', () => { clearTimeout(t); t = setTimeout(buscarPersona, 250); });
    inCorreo.addEventListener('blur', () => { const v = inCorreo.value.trim(); if (v && !v.includes('@')) { inCorreo.value = `${v}${dominio()}`; buscarPersona(); } });
    selArea.addEventListener('change', () => {
      const a = areaPorId(selArea.value);
      cont.querySelector('[data-area-ayuda]').textContent = a ? `${a.proceso || ''}${a.revisar ? ' · La dependencia de esta área está por confirmar en el directorio.' : ''}` : '';
      pintarSugeridos();
    });
    const campo = cont.querySelector('[data-chips-campo]');
    campo.addEventListener('keydown', (ev) => {
      if (['Enter', ',', ';', ' '].includes(ev.key)) { ev.preventDefault(); if (campo.value.trim()) { agregarCorreo(campo.value); campo.value = ''; } }
      if (ev.key === 'Backspace' && !campo.value && equipo.length) { equipo.pop(); pintarChips(); }
    });
    campo.addEventListener('blur', () => { if (campo.value.trim()) { agregarCorreo(campo.value); campo.value = ''; } });
    campo.addEventListener('paste', (ev) => { const txt = ev.clipboardData?.getData('text'); if (txt && /[\s,;]/.test(txt)) { ev.preventDefault(); agregarCorreo(txt); } });
    on(cont, 'click', '[data-quitar]', (ev, b) => { equipo = equipo.filter((c) => c !== b.dataset.quitar); pintarChips(); });
    on(cont, 'click', '[data-sugerido]', (ev, b) => agregarCorreo(b.dataset.sugerido));
    on(cont, 'click', '[data-elegir]', (ev, b) => { const p = personasPorCorreo(inCorreo.value).find((x) => x.id === b.dataset.elegir); if (p) usarPersona(p); });
    cont.querySelector('[data-chips]').addEventListener('click', (ev) => { if (ev.target === ev.currentTarget || ev.target.matches('[data-chips-lista]')) campo.focus(); });

    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const correo = inCorreo.value.trim().toLowerCase();
      const faltan = [];
      if (!correoValido(correo)) faltan.push('un correo institucional válido');
      if (!inNombre.value.trim()) faltan.push('el nombre');
      if (!inCargo.value.trim()) faltan.push('el cargo');
      if (!selArea.value) faltan.push('el área funcional');
      if (!form.elements.consentimiento.checked) faltan.push('la autorización de tratamiento de datos');
      if (faltan.length) { toast({ tipo: 'warn', titulo: 'Faltan datos', mensaje: `Complete ${faltan.join(', ')}.` }); return; }
      const anterior = identificacion();
      const nuevo = {
        correo, nombre: inNombre.value.trim(), cargo: inCargo.value.trim(), areaId: selArea.value,
        correosEquipo: equipo, personaId: persona?.id || null,
        verificado: Boolean(persona) || Boolean(cuenta && cuenta.username?.toLowerCase() === correo),
        consentimiento: true, completa: true
      };
      if (!anterior || anterior.areaId !== nuevo.areaId || anterior.correo !== nuevo.correo) { s.validacion = null; s.archivo = null; s.ultimo = null; }
      guardarIdentificacion(nuevo);
      ctx.emitirIdentificacion?.();
      const a = areaPorId(nuevo.areaId);
      toast({ tipo: 'ok', titulo: `Hola, ${nuevo.nombre.split(' ')[0]}`, mensaje: `Registrará para ${a.nombre}.` });
      ir(3);
    });

    pintarChips();
    if (correoInicial) buscarPersona();
  }

  // ───────── Paso 3 ─────────
  function pasoCargue() {
    const i = identificacion();
    const previo = registroArea();
    const maxMB = estado.datos.config?.umbrales?.tamanoMaximoArchivoMB || 25;
    cont.innerHTML = `<div class="stack">
      ${tarjetaIdentidad(i)}
      <h2 class="paso-titulo">Cargue ${esc(cfg.nombreArchivo)}</h2>
      ${previo ? `<div class="notice notice-ok">${icono('checkCirculo')}<div><strong>Su área ya registró el ${esc(fechaCorta(previo.fecha.slice(0, 10)))}</strong> (${esc(previo.responsable?.nombre || '')}). Si carga una nueva versión, quedará como la vigente.
        <div class="btn-group" style="margin-top:8px"><button type="button" class="btn btn-sm" data-ir="4">Ver ${esc(cfg.tituloFinal.toLowerCase())}</button></div></div></div>` : ''}
      ${cfg.avisoCargue ? cfg.avisoCargue(i) : ''}
      <label class="dropzone" data-dropzone>
        <span class="dropzone-icon">${icono('subir', 'icon-lg')}</span>
        <strong class="ink">Toque para elegir el archivo</strong>
        <span class="muted">o arrástrelo aquí · Excel .xlsx · máximo ${maxMB} MB</span>
        <input type="file" accept=".xlsx,.xlsm,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" data-archivo aria-label="Elegir el archivo de Excel">
      </label>
      <p class="field-hint centro">${icono('ojo', 'icon-sm')} El archivo se revisa en su dispositivo${microsoftListo() ? ' y, al registrar, se guarda en SharePoint' : ''}.</p>
      <div data-resultado aria-live="polite"></div>
    </div>`;
    const zona = cont.querySelector('[data-dropzone]');
    const input = cont.querySelector('[data-archivo]');
    ['dragenter', 'dragover'].forEach((t) => zona.addEventListener(t, (ev) => { ev.preventDefault(); zona.classList.add('is-over'); }));
    ['dragleave', 'drop'].forEach((t) => zona.addEventListener(t, (ev) => { ev.preventDefault(); zona.classList.remove('is-over'); }));
    zona.addEventListener('drop', (ev) => { const f = ev.dataTransfer.files[0]; if (f) procesar(f); });
    input.addEventListener('change', () => { const f = input.files[0]; input.value = ''; if (f) procesar(f); });
    if (s.validacion && s.archivo) pintarResultado();
  }

  async function procesar(archivo) {
    const destino = cont.querySelector('[data-resultado]');
    destino.innerHTML = `<div class="card"><div class="row"><span class="spinner" aria-hidden="true"></span><strong class="ink">Revisando «${esc(archivo.name)}»…</strong></div><div class="skeleton skeleton-line" style="margin-top:16px"></div><div class="skeleton skeleton-line" style="width:70%"></div></div>`;
    await new Promise((r) => setTimeout(r, 30));
    try {
      if (!xlsxDisponible()) throw new Error('La librería de Excel no cargó. Revise su conexión y recargue la página.');
      const libro = await abrirLibro(archivo, { maxMB: estado.datos.config?.umbrales?.tamanoMaximoArchivoMB || 25 });
      s.validacion = cfg.validar(libro.wb, identificacion());
      s.archivo = archivo;
      pintarResultado();
      const b = s.validacion.bloqueantes;
      toast(b ? { tipo: 'warn', titulo: plural(b, 'punto por corregir', 'puntos por corregir'), mensaje: 'Corrija el archivo y vuelva a cargarlo.' }
        : { tipo: 'ok', titulo: 'Archivo válido', mensaje: 'Ya puede registrarlo.' });
    } catch (e) {
      console.error(e);
      s.validacion = null;
      destino.innerHTML = `<div class="notice notice-danger">${icono('alerta')}<div><strong>No se pudo leer el archivo.</strong> ${esc(e.message)}</div></div>`;
    }
  }

  function pintarResultado() {
    const v = s.validacion;
    const destino = cont.querySelector('[data-resultado]');
    const bloq = v.bloqueantes;
    const conMS = microsoftListo();
    const i = identificacion();
    const a = areaPorId(i.areaId);
    destino.innerHTML = `<div class="stack">
      <div class="resultado-banner ${bloq ? 'is-bloqueado' : 'is-ok'} reveal">
        <span class="resultado-ico">${icono(bloq ? 'bloqueo' : 'checkCirculo', 'icon-lg')}</span>
        <div><h3 class="mb-0">${bloq ? `${plural(bloq, 'punto bloquea', 'puntos bloquean')} el registro` : 'Archivo válido'}</h3>
          <p class="mb-0">${esc(s.archivo.name)}${v.advertencias ? ` · ${plural(v.advertencias, 'advertencia')}` : ''}</p></div>
      </div>
      <div class="cifras-mini">${cfg.cifras(v.resumen).map((c) => `<div class="cifra-mini${c.alerta ? ' is-alert' : ''}"><strong>${esc(c.valor)}</strong><span>${esc(c.etiqueta)}</span></div>`).join('')}</div>
      ${!bloq ? `<div class="card registrar-card reveal">
        <h3>Registrar ${esc(cfg.nombreCorto)}</h3>
        <dl class="dl-mini">
          <div><dt>Área</dt><dd>${esc(a.id)} · ${esc(a.nombre)}</dd></div>
          <div><dt>Dependencia</dt><dd>${esc(a.dependencia)} · ${esc(dependencia(a.dependencia)?.nombre || '')}</dd></div>
          <div><dt>Responsable</dt><dd>${esc(i.nombre)} · ${esc(i.correo)}</dd></div>
          ${i.correosEquipo.length ? `<div><dt>Copia a</dt><dd>${esc(i.correosEquipo.join(', '))}</dd></div>` : ''}
        </dl>
        ${conMS ? `<p class="field-hint">${icono('carpeta', 'icon-sm')} Se guardará en SharePoint › ${esc(estado.datos.config.microsoft.carpetaRaiz)} › ${esc(cfg.nombreCarpeta)} › ${esc(a.id)} - ${esc(a.nombre)}, y le llegará un correo${cfg.tipo === 'accion' ? ' con su pase QR' : ''}.</p>`
          : `<label class="field"><span class="field-label">Enlace donde reposa el archivo</span>
            <input class="input" name="enlace" type="url" inputmode="url" placeholder="https://itc-my.sharepoint.com/…" data-enlace>
            <span class="field-hint">Súbalo a su OneDrive o al SharePoint del área, use «Copiar vínculo» y péguelo aquí.</span></label>`}
        <button type="button" class="btn btn-lg btn-block btn-primary" data-registrar>${icono(cfg.tipo === 'accion' ? 'qr' : 'checkCirculo', 'icon-sm')}${esc(cfg.textoRegistrar)}</button>
      </div>` : ''}
      ${v.hallazgos.length ? `<div class="card reveal">
        <div class="card-head"><div><h3>${bloq ? 'Qué corregir' : 'Para revisar'}</h3><p>Cada punto indica la hoja, la fila y la corrección.</p></div>
          ${xlsxDisponible() ? `<button type="button" class="btn btn-sm" data-informe>${icono('excel', 'icon-sm')}Informe</button>` : ''}</div>
        <div class="chips-sugeridos" role="group" aria-label="Filtrar">
          ${[['todos', `Todos (${v.hallazgos.length})`], ['bloqueante', `Bloqueantes (${bloq})`], ['advertencia', `Advertencias (${v.advertencias})`]].map(([k, t]) => `<button type="button" class="chip" data-filtro="${k}" aria-pressed="${s.filtro === k}">${t}</button>`).join('')}
        </div>
        <ul class="findings" data-hallazgos></ul>
      </div>` : ''}
    </div>`;
    pintarHallazgos();
    activarAnimaciones(destino);
    if (!bloq) destino.querySelector('.registrar-card').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function pintarHallazgos() {
    const ul = cont.querySelector('[data-hallazgos]');
    if (!ul) return;
    const lista = s.validacion.hallazgos.filter((h) => s.filtro === 'todos' || h.severidad === s.filtro);
    ul.innerHTML = lista.length ? lista.slice(0, 60).map((h) => `<li class="finding ${h.severidad === 'bloqueante' ? 'finding-block' : 'finding-warn'}">
        <span class="finding-icon">${icono(h.severidad === 'bloqueante' ? 'bloqueo' : 'alerta', 'icon-sm')}</span>
        <div>
          <div class="finding-title">${esc(h.titulo)}</div>
          <div class="finding-meta"><span class="badge">Hoja ${esc(h.hoja)}</span>${h.fila ? `<span class="badge">Fila ${esc(h.fila)}</span>` : ''}</div>
          <p class="mb-0">${esc(h.detalle)}</p>
          <p class="finding-fix mb-0"><strong>Corrija:</strong> ${esc(h.correccion)}</p>
        </div></li>`).join('') + (lista.length > 60 ? `<li class="muted">… y ${lista.length - 60} más en el informe de Excel.</li>` : '')
      : `<li>${estadoVacio({ titulo: 'Nada en esta categoría', texto: 'Cambie el filtro para ver los demás puntos.', iconoNombre: 'checkCirculo' })}</li>`;
  }

  async function exportarInforme() {
    try {
      const i = identificacion();
      const a = areaPorId(i.areaId);
      const logo = await obtenerLogo();
      const r = exportarExcel({
        nombreArchivo: `JP2027_Revision_${cfg.tipo === 'accion' ? 'PlanAccion' : 'PlanNecesidades'}_${a.id}.xlsx`,
        logo: logo.bytes,
        hojas: [{
          nombre: 'Revisión', titulo: `Revisión del ${cfg.nombreCorto}`, subtitulo: `${a.etiqueta} · Archivo: ${s.archivo.name}`,
          columnas: [{ titulo: 'Severidad', ancho: 14 }, { titulo: 'Hoja', ancho: 22 }, { titulo: 'Fila', ancho: 8, tipo: 'numero' }, { titulo: 'Punto', ancho: 44 }, { titulo: 'Detalle', ancho: 60 }, { titulo: 'Corrección', ancho: 60 }],
          filas: s.validacion.hallazgos.map((h) => [h.severidad === 'bloqueante' ? 'Bloqueante' : 'Advertencia', h.hoja, h.fila, h.titulo, h.detalle, h.correccion])
        }]
      });
      descargarBlob(r.blob, r.nombre);
    } catch (e) { toastError('No se pudo exportar el informe', e, e.message); }
  }

  async function registrar(boton) {
    const i = identificacion();
    const campoEnlace = cont.querySelector('[data-enlace]');
    const enlace = campoEnlace ? campoEnlace.value.trim() : '';
    if (campoEnlace && enlace && !/^https:\/\/\S+$/i.test(enlace)) {
      campoEnlace.setAttribute('aria-invalid', 'true');
      toast({ tipo: 'warn', titulo: 'Enlace no válido', mensaje: 'Pegue el vínculo completo, empieza por https://' });
      return;
    }
    if (campoEnlace && !enlace) {
      campoEnlace.setAttribute('aria-invalid', 'true');
      campoEnlace.focus();
      toast({ tipo: 'warn', titulo: 'Falta el enlace', mensaje: 'Pegue el vínculo de OneDrive o SharePoint donde dejó el archivo, para que la OAP lo encuentre.' });
      return;
    }
    boton.disabled = true;
    boton.innerHTML = `<span class="spinner" aria-hidden="true"></span>${microsoftListo() ? 'Guardando en SharePoint…' : 'Registrando…'}`;
    try {
      const r = await registrarCargue({ tipo: cfg.tipo, ident: i, archivo: s.archivo, validacion: s.validacion, enlaceManual: enlace });
      await ctx.refrescarConsolidado();
      s.ultimo = { ...r, nuevo: true };
      s.validacion = null;
      s.archivo = null;
      ir(4);
    } catch (e) {
      toastError('No se pudo registrar', e, e.message);
      boton.disabled = false;
      boton.innerHTML = `${icono('refrescar', 'icon-sm')}Intentar de nuevo`;
    }
  }

  // ───────── Paso 4 ─────────
  function pasoFinal() {
    const i = identificacion();
    const registro = s.ultimo?.registro || registroArea();
    if (!registro) { ir(3); return; }
    const pase = s.ultimo?.pase || (registro.codigoPase ? estado.consolidado.pases.find((p) => p.id === registro.codigoPase) : null)
      || estado.consolidado.pases.find((p) => p.e === i.correo && p.a === i.areaId) || null;
    cont.innerHTML = `<div class="stack">
      ${s.ultimo?.nuevo ? `<div class="celebra reveal">${icono('checkCirculo', 'icon-lg')}<div><h2 class="mb-0">${esc(cfg.mensajeExito)}</h2><p class="mb-0">${esc(registro.id)} · ${esc(horaLegible(new Date(registro.fecha)))}</p></div></div>`
        : `<h2 class="paso-titulo">${esc(cfg.tituloFinal)}</h2>`}
      ${aviso(s.ultimo)}
      <div data-final></div>
      <div class="btn-group centro">
        <button type="button" class="btn btn-ghost" data-ir="3">${icono('refrescar', 'icon-sm')}Cargar una nueva versión</button>
        <button type="button" class="btn btn-ghost" data-otra>${icono('persona', 'icon-sm')}Registrar otra área</button>
      </div>
    </div>`;
    cfg.pintarFinal(cont.querySelector('[data-final]'), { registro, pase, ident: i, ctx });
    if (s.ultimo) s.ultimo.nuevo = false;
  }

  function aviso(ultimo) {
    if (!ultimo) return '';
    if (ultimo.correo.enviado) {
      const eq = ultimo.registro.correosEquipo.length;
      const detalleEquipo = !eq ? '' : cfg.tipo === 'accion'
        ? ` y ${plural(ultimo.correo.equipo || 0, 'pase personal enviado', 'pases personales enviados')} al equipo${ultimo.correo.fallidos ? ` (${plural(ultimo.correo.fallidos, 'envío falló', 'envíos fallaron')})` : ''}`
        : ` con copia a ${plural(eq, 'persona')} del equipo`;
      return `<div class="notice notice-ok">${icono('correo')}<div><strong>Correo enviado</strong> a ${esc(ultimo.registro.responsable.correo)}${detalleEquipo}.</div></div>`;
    }
    if (ultimo.correo.motivo === 'local') return `<div class="notice">${icono('info')}<div><strong>Registro guardado en este dispositivo.</strong> El envío automático de correos se activa cuando TIC configure Microsoft 365. Mientras tanto ${cfg.tipo === 'accion' ? 'guarde la imagen del pase' : 'guarde esta constancia'}.</div></div>`;
    return `<div class="notice notice-danger">${icono('alerta')}<div><strong>El registro quedó guardado, pero el correo no salió.</strong> ${esc(ultimo.correo.motivo)} ${cfg.tipo === 'accion' ? 'Guarde la imagen del pase.' : ''}</div></div>`;
  }

  // ───────── Eventos ─────────
  on(panel, 'click', '[data-ir]', (ev, b) => {
    const n = Number(b.dataset.ir);
    if (b.getAttribute('aria-disabled') === 'true') { toast({ tipo: 'info', titulo: 'Paso bloqueado', mensaje: n === 4 ? 'Primero registre su archivo.' : 'Primero identifíquese.' }); return; }
    ir(n);
  });
  on(panel, 'click', '[data-registrar]', (ev, b) => registrar(b));
  on(panel, 'click', '[data-informe]', exportarInforme);
  on(panel, 'click', '[data-filtro]', (ev, b) => {
    s.filtro = b.dataset.filtro;
    cont.querySelectorAll('[data-filtro]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    pintarHallazgos();
  });
  on(panel, 'click', '[data-otra]', () => { s.ultimo = null; s.validacion = null; s.archivo = null; guardarIdentificacion(null); ctx.emitirIdentificacion?.(); ir(2); });
  on(panel, 'click', '[data-descarga]', (ev, b) => toast({ tipo: 'ok', titulo: 'Descarga iniciada', mensaje: b.getAttribute('download') }));
  on(panel, 'input', '[data-enlace]', (ev, el) => el.removeAttribute('aria-invalid'));

  alEvento('sesion', () => { if (s.paso === 2) ir(2, { foco: false }); });
  alEvento('consolidado', () => pintarHero());
  alEvento('identificacion', () => { if (s.paso >= 2) ir(identificacion() ? Math.min(s.paso, 3) : 2, { foco: false }); else pintarHero(); });

  // Paso inicial: quien ya registró ve su resultado; quien ya se identificó, el cargue
  const i = identificacion();
  ir(i ? (registroArea() ? 4 : 1) : 1, { foco: false });

  return {
    alMostrar() { pintarHero(); if (s.paso === 4 || s.paso === 3) ir(s.paso, { foco: false }); }
  };
}
