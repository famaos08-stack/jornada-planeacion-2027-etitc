/*
 * registro-descarga.js — Formulario que habilita la descarga de la Plantilla Plan de Acción 2027.
 * Pide el correo institucional (con él se consulta el directorio cifrado y se completan nombre, cargo y dependencia),
 * la dependencia, el área funcional y quién cargará el documento en el SUIE. Al registrar:
 *   1. guarda la descarga en el dispositivo y la envía al registro en línea (hoja de Google),
 *   2. descarga la plantilla,
 *   3. emite el pase QR de ingreso a la jornada y lo envía por correo.
 */
import { PREFIJO_LOCAL } from '../config.js';
import { estado, dependencias, dependencia, areas, area as areaPorId, sugerirArea, emitir } from '../estado.js';
import { esc } from './dom.js';
import { icono } from './iconos.js';
import { abrirModal } from './modal.js';
import { toast, toastError } from './toast.js';
import { almacen } from '../storage.js';
import { buscarPorCorreo, normalizarCorreo, cifradoDisponible } from '../lib/directorio.js';
import { crearPase, contenidoQR, qrComoDataUrl, qrDisponible } from '../lib/qr.js';
import { enviar, remotoConfigurado } from '../lib/remoto.js';
import { descargarBlob } from '../lib/export.js';

const CLAVE_IDENT = `${PREFIJO_LOCAL}:descargador`;
const dominio = () => estado.datos?.config?.dominioInstitucional || '@itc.edu.co';
const correoValido = (c) => /^[a-z0-9._%+-]+$/.test(String(c).split('@')[0] || '') && String(c).endsWith(dominio()) && String(c).length > dominio().length;

export function identificacion() {
  if (estado.identificacion) return estado.identificacion;
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE_IDENT) || 'null');
    if (v && v.correo) estado.identificacion = v;
  } catch { /* sin almacenamiento */ }
  return estado.identificacion;
}
function guardarIdentificacion(v) {
  estado.identificacion = v;
  try { if (v) localStorage.setItem(CLAVE_IDENT, JSON.stringify(v)); else localStorage.removeItem(CLAVE_IDENT); } catch { /* opcional */ }
  emitir('identificacion', v);
}
export function olvidarIdentificacion() { guardarIdentificacion(null); }

export function paseDe(ident) {
  if (!ident) return null;
  return estado.consolidado.pases.find((p) => p.id === ident.paseId) || estado.consolidado.pases.find((p) => p.e === ident.correo) || null;
}

const infoPlantilla = () => estado.datos?.config?.descargas?.plantilla || {};

// Descarga el archivo. En file:// y por HTTP funciona con un enlace con atributo download.
export async function descargarArchivo(info) {
  try {
    const r = await fetch(info.archivo, { cache: 'no-cache' });
    if (!r.ok) throw new Error(String(r.status));
    descargarBlob(await r.blob(), info.nombreDescarga);
  } catch {
    const a = document.createElement('a');
    a.href = info.archivo;
    a.download = info.nombreDescarga;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

function dispositivo() {
  const ua = navigator.userAgent;
  const so = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'macOS' : 'Otro';
  return `${so} · ${/Mobi/.test(ua) ? 'celular' : 'computador'}`;
}

function opcionesDependencia(sel) {
  return `<option value="">Elija su dependencia…</option>${dependencias().map((d) => `<option value="${esc(d.codigo)}" ${String(d.codigo) === String(sel) ? 'selected' : ''}>${esc(d.codigo)} · ${esc(d.nombre)}</option>`).join('')}`;
}
function opcionesArea(dep, sel) {
  const lista = areas().filter((a) => !dep || String(a.dependencia) === String(dep));
  return `<option value="">${lista.length ? 'Elija el área (opcional)…' : 'Sin áreas para esta dependencia'}</option>${lista.map((a) => `<option value="${esc(a.id)}" ${a.id === sel ? 'selected' : ''}>${esc(a.nombre)}</option>`).join('')}`;
}

/*
 * registrarYDescargar({ ctx, origen }) — Abre el formulario; al enviarlo registra, descarga y devuelve { registro, pase, correo }.
 * Si la persona ya se registró en este dispositivo, descarga directo y registra la descarga repetida.
 */
export async function registrarYDescargar({ ctx, origen = 'accion', forzarFormulario = false } = {}) {
  const previo = identificacion();
  if (previo && !forzarFormulario) {
    await descargarArchivo(infoPlantilla());
    const repetida = { ...previo, id: `D-${Date.now()}`, fecha: new Date().toISOString(), repetida: true, origen, dispositivo: dispositivo() };
    await almacen.guardarDescarga(repetida).catch(() => null);
    enviar('descarga', { ...repetida, qrPng: null });
    await ctx.refrescarConsolidado();
    toast({ tipo: 'ok', titulo: 'Descarga iniciada', mensaje: infoPlantilla().nombreDescarga });
    return { registro: repetida, pase: paseDe(previo), repetida: true };
  }
  return new Promise((resolver) => {
    const form = document.createElement('form');
    form.className = 'stack form-descarga';
    form.noValidate = true;
    form.innerHTML = `
      <p class="muted mb-0">Registre sus datos para descargar la plantilla. Al terminar recibirá su <strong>pase QR de ingreso</strong> a la jornada.</p>
      <label class="field"><span class="field-label">Correo institucional</span>
        <div class="input-icon">${icono('correo')}<input class="input" name="correo" type="email" inputmode="email" autocomplete="email" placeholder="usuario${esc(dominio())}" required data-autofoco></div>
        <span class="field-error" data-err-correo role="alert"></span></label>
      <div data-hallado aria-live="polite"></div>
      <div class="grid-2 grid-form">
        <label class="field"><span class="field-label">Nombre completo</span><input class="input" name="nombre" autocomplete="name" required></label>
        <label class="field"><span class="field-label">Cargo</span><input class="input" name="cargo" autocomplete="organization-title" required></label>
      </div>
      <label class="field"><span class="field-label">Dependencia</span><select class="select" name="dependencia" required>${opcionesDependencia('')}</select></label>
      <label class="field"><span class="field-label">Área funcional</span><select class="select" name="area">${opcionesArea('', '')}</select></label>
      <fieldset class="field fieldset-suie"><legend class="field-label">¿Quién cargará el documento formulado en el SUIE?</legend>
        <div class="segmentado-op" role="radiogroup">
          <label><input type="radio" name="quien" value="yo" checked> Yo mismo</label>
          <label><input type="radio" name="quien" value="otro"> Otra persona</label>
        </div>
        <div class="grid-2 grid-form" data-otro hidden>
          <label class="field"><span class="field-label">Nombre del responsable del cargue</span><input class="input" name="suieNombre"></label>
          <label class="field"><span class="field-label">Correo institucional del responsable</span><input class="input" name="suieCorreo" type="email" inputmode="email" placeholder="usuario${esc(dominio())}"></label>
        </div>
      </fieldset>
      <label class="consentimiento"><input type="checkbox" name="consentimiento" required>
        <span>${esc(estado.datos.config?.politicaDatos?.texto || '')}${estado.datos.config?.politicaDatos?.url ? ` <a href="${esc(estado.datos.config.politicaDatos.url)}" target="_blank" rel="noopener">Política de tratamiento de datos</a>.` : ''}</span></label>
      <button type="submit" class="btn btn-lg btn-block btn-primary" data-enviar>${icono('descargar', 'icon-sm')}Registrar y descargar</button>
      <p class="field-hint centro mb-0">${icono('reloj', 'icon-sm')} Se registran la fecha y la hora de la descarga.</p>`;
    let persona = null;
    let resuelto = false;
    const m = abrirModal({ titulo: 'Descargar la Plantilla Plan de Acción 2027', contenido: form, alCerrar: () => { if (!resuelto) resolver(null); } });
    const f = form.elements;
    const hallado = form.querySelector('[data-hallado]');
    const err = form.querySelector('[data-err-correo]');

    const buscar = async () => {
      const c = normalizarCorreo(f.correo.value);
      err.textContent = '';
      f.correo.removeAttribute('aria-invalid');
      persona = null;
      if (!c) { hallado.innerHTML = ''; return; }
      if (!c.includes('@')) return;
      if (!correoValido(c)) { err.textContent = `Use su correo institucional terminado en ${dominio()}, sin tildes ni espacios.`; f.correo.setAttribute('aria-invalid', 'true'); hallado.innerHTML = ''; return; }
      if (!cifradoDisponible()) { hallado.innerHTML = ''; return; }
      hallado.innerHTML = `<p class="field-hint"><span class="spinner" aria-hidden="true"></span> Buscando en el directorio…</p>`;
      const lista = await buscarPorCorreo(c);
      if (normalizarCorreo(f.correo.value) !== c) return;
      if (!lista.length) {
        hallado.innerHTML = `<div class="notice">${icono('info')}<div>Este correo no está en el directorio institucional. Puede continuar escribiendo sus datos: el registro quedará como <em>no verificado</em>.</div></div>`;
        return;
      }
      const usar = (p) => {
        persona = p;
        f.nombre.value = p.n || f.nombre.value;
        f.cargo.value = p.c || f.cargo.value;
        if (p.d && dependencia(p.d)) {
          f.dependencia.value = String(p.d);
          const sug = sugerirArea(p);
          f.area.innerHTML = opcionesArea(p.d, sug ? sug.id : '');
        }
        hallado.innerHTML = `<div class="persona-ok">${icono('usuarioCheck')}<span><strong>${esc(p.n || 'Persona del directorio')}</strong><br><span class="muted">${esc(p.c || '')}${p.d ? ` · ${esc(p.d)} ${esc(dependencia(p.d)?.nombre || '')}` : ''}</span></span></div>`;
      };
      if (lista.length === 1) { usar(lista[0]); return; }
      hallado.innerHTML = `<div class="notice">${icono('personas')}<div>Este buzón lo comparten ${lista.length} personas. Toque su nombre:<div class="chips-sugeridos" style="margin-top:8px">${lista.map((p, i) => `<button type="button" class="chip" data-p="${i}">${esc(p.n || 'Sin nombre')}</button>`).join('')}</div></div></div>`;
      hallado.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => usar(lista[Number(b.dataset.p)])));
    };
    let t = null;
    f.correo.addEventListener('input', () => { clearTimeout(t); t = setTimeout(buscar, 350); });
    f.correo.addEventListener('blur', () => { const v = f.correo.value.trim(); if (v && !v.includes('@')) { f.correo.value = `${v}${dominio()}`; } buscar(); });
    f.dependencia.addEventListener('change', () => { f.area.innerHTML = opcionesArea(f.dependencia.value, ''); });
    form.querySelectorAll('[name="quien"]').forEach((r) => r.addEventListener('change', () => { form.querySelector('[data-otro]').hidden = f.quien.value !== 'otro'; }));

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const correo = normalizarCorreo(f.correo.value);
      const faltan = [];
      if (!correoValido(correo)) faltan.push('un correo institucional válido');
      if (!f.nombre.value.trim()) faltan.push('el nombre');
      if (!f.cargo.value.trim()) faltan.push('el cargo');
      if (!f.dependencia.value) faltan.push('la dependencia');
      const otro = f.quien.value === 'otro';
      const suieCorreo = otro ? normalizarCorreo(f.suieCorreo.value) : correo;
      if (otro && (!f.suieNombre.value.trim() || !correoValido(suieCorreo))) faltan.push('el nombre y el correo institucional de quien cargará en el SUIE');
      if (!f.consentimiento.checked) faltan.push('la autorización de tratamiento de datos');
      if (faltan.length) { toast({ tipo: 'warn', titulo: 'Faltan datos', mensaje: `Complete ${faltan.join(', ')}.` }); return; }
      const boton = form.querySelector('[data-enviar]');
      boton.disabled = true;
      boton.innerHTML = '<span class="spinner" aria-hidden="true"></span>Registrando…';
      try {
        const a = f.area.value ? areaPorId(f.area.value) : null;
        const ident = {
          correo, nombre: f.nombre.value.trim(), cargo: f.cargo.value.trim(), dependencia: f.dependencia.value,
          dependenciaNombre: dependencia(f.dependencia.value)?.nombre || '', area: a ? a.id : '', areaNombre: a ? a.nombre : '',
          responsableSuie: { nombre: otro ? f.suieNombre.value.trim() : f.nombre.value.trim(), correo: suieCorreo, mismo: !otro },
          verificado: Boolean(persona)
        };
        let pase = estado.consolidado.pases.find((p) => p.e === correo) || null;
        if (!pase) {
          pase = crearPase({ nombre: ident.nombre, cargo: ident.cargo, dependencia: String(ident.dependencia), area: ident.area, correo, prefijo: estado.indices.prefijo, sal: estado.indices.sal });
          pase.emitido = new Date().toISOString();
          pase.verificado = ident.verificado;
          await almacen.guardarPase(pase);
        }
        ident.paseId = pase.id;
        const registro = { ...ident, id: `D-${Date.now()}`, fecha: new Date().toISOString(), origen, repetida: false, dispositivo: dispositivo() };
        await almacen.guardarDescarga(registro);
        guardarIdentificacion(ident);
        await ctx.refrescarConsolidado();
        await descargarArchivo(infoPlantilla());
        let qrPng = null;
        if (qrDisponible()) { try { qrPng = (await qrComoDataUrl(contenidoQR(pase), { tamano: 480 })).split(',')[1]; } catch { qrPng = null; } }
        let correoEstado = { enviado: false, motivo: 'local' };
        if (remotoConfigurado()) {
          const r = await Promise.race([
            enviar('descarga', { ...registro, qrPng, enviarCorreo: estado.datos.config?.registro?.enviarCorreo !== false }, { esperar: true }),
            new Promise((ok) => setTimeout(() => ok({ ok: false, error: 'tiempo', encolado: true }), 12000))
          ]);
          correoEstado = { enviado: Boolean(r.ok && r.correo), motivo: r.ok ? (r.correo ? '' : (r.motivoCorreo || 'sin correo')) : (r.error || 'pendiente') };
        }
        resuelto = true;
        m.cerrar();
        toast({ tipo: 'ok', titulo: 'Plantilla descargada', mensaje: `Su pase de ingreso es ${pase.id}.` });
        resolver({ registro, pase, correo: correoEstado });
      } catch (e) {
        toastError('No se pudo completar el registro', e, e.message);
        boton.disabled = false;
        boton.innerHTML = `${icono('refrescar', 'icon-sm')}Intentar de nuevo`;
      }
    });
  });
}
