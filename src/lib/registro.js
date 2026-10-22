/*
 * registro.js — Registro automático de las plantillas formuladas.
 * Cuando un cargue pasa la validación:
 *   1. guarda el Excel en SharePoint (con Microsoft 365) y obtiene el enlace donde reposa,
 *   2. crea el registro: dependencia, área, responsable, correos institucionales, enlace y resultado,
 *   3. en el Plan de acción emite el pase con QR firmado,
 *   4. envía desde Outlook el correo con el pase (o la confirmación del Plan de necesidades).
 * Sin Microsoft 365 configurado, registra en este navegador y el enlace lo escribe la persona.
 */
import { estado, area as areaPorId, dependencia, personasPorCorreo } from '../estado.js';
import { almacen } from '../storage.js';
import * as ms from './microsoft.js';
import { crearPase, contenidoQR, qrComoDataUrl, qrDisponible } from './qr.js';
import { fechaLarga, horaLegible, rangoFechasTexto } from './fechas.js';
import { moneda, entero, tituloLegible } from './formato.js';

// Columnas de la lista de SharePoint «JP27_Registro» (nombres internos; ver la guía de instalación).
export const COLUMNAS_LISTA_REGISTRO = [
  ['Title', 'Código del registro'], ['Tipo', 'Plan de acción o Plan de necesidades'], ['AreaId', 'Id del área (A01–A47)'], ['Area', 'Área funcional'],
  ['Dependencia', 'Código y nombre de la dependencia'], ['Responsable', 'Nombre del responsable'], ['Cargo', 'Cargo del responsable'],
  ['CorreoResponsable', 'Correo institucional del responsable'], ['CorreosEquipo', 'Correos institucionales del equipo'], ['Archivo', 'Nombre del archivo cargado'],
  ['EnlaceArchivo', 'Enlace donde reposa la plantilla'], ['Estado', 'Resultado de la validación'], ['Advertencias', 'Número de advertencias'],
  ['Resumen', 'Resumen de lo cargado'], ['CodigoPase', 'Código del pase QR'], ['FechaCargue', 'Fecha y hora del cargue'], ['RegistradoPor', 'Cuenta que hizo el cargue']
];

export const COLUMNAS_LISTA_ASISTENCIA = [
  ['Title', 'Clave del registro'], ['CodigoPase', 'Código del pase'], ['Nombre', 'Nombre'], ['Cargo', 'Cargo'], ['AreaId', 'Id del área'], ['Area', 'Área funcional'],
  ['Dependencia', 'Dependencia'], ['Correo', 'Correo'], ['HoraIngreso', 'Hora de ingreso'], ['Metodo', 'QR o manual']
];

const TIPOS = { accion: 'Plan de acción', necesidades: 'Plan de necesidades' };
const cfgMS = () => estado.datos?.config?.microsoft || {};
export const microsoftListo = () => Boolean(estado.microsoft.activo && ms.disponible() && ms.cuentaActiva());

function codigoRegistro(tipo, areaId) {
  const f = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const sello = `${f.getFullYear()}${p(f.getMonth() + 1)}${p(f.getDate())}-${p(f.getHours())}${p(f.getMinutes())}`;
  const azar = Array.from(crypto.getRandomValues(new Uint8Array(3)), (b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');
  return `${tipo === 'accion' ? 'PA' : 'PN'}27-${areaId}-${sello}-${azar}`;
}

export function resumenTexto(tipo, r) {
  if (tipo === 'accion') {
    return `${entero(r.metasAsignadas)} metas asignadas · ${entero(r.metasFormuladas)} formuladas · ${entero(r.accionesOk)} acciones en OK${r.adicionales ? ` · ${entero(r.adicionales)} adicionales` : ''}${r.compromisos?.total ? ` · ${r.compromisos.decididos}/${r.compromisos.total} compromisos 2026 decididos` : ''}`;
  }
  return `${entero(r.ok)} necesidades · ${moneda(r.valorTotal)} en total · ${moneda(r.valor2027)} en 2027${r.vigenciasFuturas ? ` · ${r.vigenciasFuturas} con vigencias futuras` : ''}`;
}

function paseExistente(ident) {
  return estado.consolidado.pases.find((p) => p.e === ident.correo && p.a === ident.areaId && p.n === ident.nombre) || null;
}

// Nombre legible desde el correo cuando la persona no está en el directorio: «ana.perez@…» → «Ana Perez».
function nombreDesdeCorreo(correo) {
  return String(correo).split('@')[0].split(/[._-]+/).filter(Boolean).map((x) => x.charAt(0).toUpperCase() + x.slice(1)).join(' ');
}

function paseEquipo(correo, a) {
  const p = personasPorCorreo(correo)[0] || null;
  const nombre = p?.nombre || nombreDesdeCorreo(correo);
  const previo = estado.consolidado.pases.find((x) => x.e === correo && x.a === a.id);
  if (previo) return previo;
  const pase = crearPase({
    nombre, cargo: p ? tituloLegible(p.cargo) : 'Equipo del área', dependencia: String(a.dependencia), area: a.id, correo,
    prefijo: estado.indices.prefijo, sal: estado.indices.sal
  });
  pase.emitido = new Date().toISOString();
  pase.verificado = Boolean(p);
  pase.equipo = true;
  return pase;
}

/*
 * registrarCargue({ tipo: 'accion'|'necesidades', ident, archivo: File, validacion, enlaceManual })
 * ident = { nombre, cargo, correo, areaId, correosEquipo: [], verificado }
 * Devuelve { registro, pase, correo: { enviado, motivo }, enlace }.
 */
export async function registrarCargue({ tipo, ident, archivo, validacion, enlaceManual = '' }) {
  const a = areaPorId(ident.areaId);
  if (!a) throw new Error('Elija su área funcional antes de registrar.');
  const dep = dependencia(a.dependencia);
  const conMS = microsoftListo();
  const cfg = cfgMS();
  const id = codigoRegistro(tipo, a.id);

  // 1. Archivo en SharePoint
  let enlace = String(enlaceManual || '').trim();
  let origenEnlace = enlace ? 'manual' : '';
  if (conMS) {
    const fecha = new Date().toISOString().slice(0, 10);
    const subido = await ms.subirArchivo(archivo, [TIPOS[tipo], `${a.id} - ${a.nombre}`], `${a.id} ${TIPOS[tipo]} ${fecha} ${archivo.name}`);
    enlace = subido.enlace;
    origenEnlace = 'sharepoint';
  }

  // 2. Pase (solo Plan de acción)
  let pase = null;
  if (tipo === 'accion') {
    pase = paseExistente(ident) || crearPase({
      nombre: ident.nombre, cargo: ident.cargo, dependencia: String(a.dependencia), area: a.id, correo: ident.correo,
      prefijo: estado.indices.prefijo, sal: estado.indices.sal
    });
    pase.emitido = pase.emitido || new Date().toISOString();
    pase.verificado = ident.verificado !== false;
  }
  // Cada correo del equipo recibe su propio pase: el QR es personal
  const pasesEquipo = tipo === 'accion' ? (ident.correosEquipo || []).map((c) => paseEquipo(c, a)) : [];

  // 3. Registro
  const registro = {
    id, tipo, fecha: new Date().toISOString(),
    area: { id: a.id, nombre: a.nombre, etiqueta: a.etiqueta, dependencia: String(a.dependencia) },
    dependencia: { codigo: String(a.dependencia), nombre: dep ? dep.nombre : '' },
    responsable: { nombre: ident.nombre, cargo: ident.cargo, correo: ident.correo, verificado: ident.verificado !== false },
    correosEquipo: ident.correosEquipo || [],
    archivo: archivo.name, tamano: archivo.size, enlace, origenEnlace,
    estado: validacion.bloqueantes ? 'con-bloqueantes' : 'validada',
    resumen: validacion.resumen, resumenTexto: resumenTexto(tipo, validacion.resumen),
    bloqueantes: validacion.bloqueantes, advertencias: validacion.advertencias,
    hallazgos: (validacion.hallazgos || []).slice(0, 40),
    acciones: tipo === 'accion' ? (validacion.acciones || []).map((x) => x.nombre) : [],
    codigoPase: pase ? pase.id : (estado.consolidado.pases.find((p) => p.a === a.id && p.e === ident.correo)?.id || ''),
    pasesEquipo: pasesEquipo.map((p) => p.id),
    registradoPor: ms.cuentaActiva()?.username || ident.correo,
    sincronizado: false
  };
  if (conMS) {
    await ms.crearRegistro(cfg.listaRegistro, {
      Title: registro.id, Tipo: TIPOS[tipo], AreaId: a.id, Area: a.nombre, Dependencia: `${a.dependencia} · ${registro.dependencia.nombre}`,
      Responsable: ident.nombre, Cargo: ident.cargo, CorreoResponsable: ident.correo, CorreosEquipo: registro.correosEquipo.join('; '),
      Archivo: archivo.name, EnlaceArchivo: enlace, Estado: registro.estado === 'validada' ? 'Validada' : 'Con bloqueantes',
      Advertencias: registro.advertencias, Resumen: registro.resumenTexto, CodigoPase: [registro.codigoPase, ...registro.pasesEquipo].filter(Boolean).join('; '),
      FechaCargue: registro.fecha, RegistradoPor: registro.registradoPor
    });
    registro.sincronizado = true;
  }
  await almacen.guardarRegistro(registro);
  if (pase) await almacen.guardarPase(pase);
  for (const p of pasesEquipo) await almacen.guardarPase(p);

  // 4. Correo
  const correo = { enviado: false, motivo: conMS ? '' : 'local' };
  if (conMS && cfg.enviarCorreo !== false) {
    try {
      await enviarCorreoRegistro({ tipo, registro, pase, pasesEquipo });
      correo.enviado = true;
      // Cada integrante recibe su pase en un correo propio
      for (const p of pasesEquipo) {
        try { await enviarCorreoRegistro({ tipo, registro, pase: p, destinatario: p }); correo.equipo = (correo.equipo || 0) + 1; } catch (e) { console.error(e); correo.fallidos = (correo.fallidos || 0) + 1; }
      }
    } catch (e) {
      console.error(e);
      correo.motivo = e.message;
    }
  }
  return { registro, pase, pasesEquipo, correo, enlace };
}

// Correo HTML (tablas y estilos en línea: es lo que respetan Outlook y los clientes móviles).
async function enviarCorreoRegistro({ tipo, registro, pase, pasesEquipo = [], destinatario = null }) {
  const ev = estado.datos.config.evento;
  const agenda = estado.datos.agenda || {};
  const fechas = rangoFechasTexto((agenda.dias || []).map((d) => d.fecha));
  const cfg = cfgMS();
  const adjuntos = [];
  let bloqueQR = '';
  if (pase && qrDisponible()) {
    const url = await qrComoDataUrl(contenidoQR(pase), { tamano: 480 });
    const base64 = url.split(',')[1];
    adjuntos.push({ nombre: `Pase_${pase.id}.png`, tipo: 'image/png', base64, cid: 'pase-qr' });
    bloqueQR = `<tr><td align="center" style="padding:8px 24px 4px"><img src="cid:pase-qr" width="220" height="220" alt="Código QR del pase ${pase.id}" style="display:block;border:0"></td></tr>
      <tr><td align="center" style="padding:0 24px 18px;font:700 18px Consolas,monospace;letter-spacing:2px;color:#0b4d3b">${pase.id}</td></tr>`;
  }
  const fila = (k, v) => `<tr><td style="padding:6px 0;color:#587068;font:13px Arial,sans-serif;width:150px;vertical-align:top">${k}</td><td style="padding:6px 0;color:#13332a;font:600 13px Arial,sans-serif">${v}</td></tr>`;
  const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const titulo = tipo === 'accion' ? 'Su pase de acceso' : 'Plan de necesidades registrado';
  const intro = destinatario
    ? `${esc(registro.responsable.nombre)} registró el Plan de acción 2027 del área <b>${esc(registro.area.nombre)}</b> y le incluyó en el equipo. Este es su pase personal: preséntelo en el ingreso a la jornada.`
    : tipo === 'accion'
    ? `La formulación del Plan de acción 2027 del área <b>${esc(registro.area.nombre)}</b> quedó registrada y validada. Presente este código QR en el ingreso a la jornada.${pasesEquipo.length ? ` Cada integrante del equipo recibió su propio pase.` : ''}`
    : `El Plan de necesidades 2027 del área <b>${esc(registro.area.nombre)}</b> quedó registrado y validado.`;
  const html = `<!doctype html><html><body style="margin:0;background:#f4f7f4">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f4;padding:24px 12px"><tr><td align="center">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #d7e4dc">
    <tr><td style="background:#0b4d3b;padding:22px 24px;color:#ffffff">
      <div style="font:700 11px Arial,sans-serif;letter-spacing:2px;color:#8ad058;text-transform:uppercase">${esc(ev.nombreCorto || ev.nombre)}</div>
      <div style="font:800 22px Arial,sans-serif;margin-top:4px">${titulo}</div>
      <div style="font:13px Arial,sans-serif;color:#e6f4ec;margin-top:4px">${esc(fechas)}${agenda.sede && agenda.sede !== 'Por confirmar' ? ` · ${esc(agenda.sede)}` : ''}</div>
    </td></tr>
    <tr><td style="padding:20px 24px 6px;font:14px/1.55 Arial,sans-serif;color:#3d5950">${intro}</td></tr>
    ${bloqueQR}
    <tr><td style="padding:4px 24px 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${destinatario ? fila('Asistente', `${esc(destinatario.n)}<br><span style="font-weight:400;color:#587068">${esc(destinatario.e)}</span>`) : ''}
      ${fila('Responsable', `${esc(registro.responsable.nombre)}<br><span style="font-weight:400;color:#587068">${esc(registro.responsable.cargo)}</span>`)}
      ${!destinatario && pasesEquipo.length ? fila('Pases del equipo', pasesEquipo.map((p) => `${esc(p.n)} · ${esc(p.id)}`).join('<br>')) : ''}
      ${fila('Área funcional', `${esc(registro.area.id)} · ${esc(registro.area.nombre)}`)}
      ${fila('Dependencia', `${esc(registro.dependencia.codigo)} · ${esc(registro.dependencia.nombre)}`)}
      ${fila('Resumen', esc(registro.resumenTexto))}
      ${registro.advertencias ? fila('Advertencias', `${registro.advertencias} para revisar con la ${esc(ev.oficina)}`) : ''}
      ${fila('Archivo', registro.enlace ? `<a href="${esc(registro.enlace)}" style="color:#0f6b4b">${esc(registro.archivo)}</a>` : esc(registro.archivo))}
      ${fila('Registro', `${esc(registro.id)}<br><span style="font-weight:400;color:#587068">${esc(fechaLarga(registro.fecha.slice(0, 10)))}, ${esc(horaLegible(new Date(registro.fecha)))}</span>`)}
    </table></td></tr>
    <tr><td style="padding:14px 24px 22px;border-top:1px solid #d7e4dc;font:12px/1.5 Arial,sans-serif;color:#587068">
      ${esc(ev.oficina)} · ${esc(ev.institucion)}<br>Mensaje generado por el aplicativo de la jornada. Si tiene dudas, escriba a ${esc(ev.correoContacto)}.
    </td></tr>
  </table></td></tr></table></body></html>`;
  await ms.enviarCorreo({
    para: [destinatario ? destinatario.e : registro.responsable.correo],
    // En el Plan de acción el equipo recibe su propio pase, así que no se copia el QR del responsable
    cc: destinatario ? [] : [...(tipo === 'accion' ? [] : registro.correosEquipo), cfg.correoCopia].filter(Boolean),
    asunto: tipo === 'accion'
      ? `Pase de acceso ${pase.id} · ${ev.nombreCorto || ev.nombre} · ${registro.area.nombre}`
      : `Plan de necesidades registrado · ${registro.area.nombre} · ${ev.nombreCorto || ev.nombre}`,
    html,
    adjuntos
  });
}

// Registro de asistencia en SharePoint (si hay sesión de Microsoft). No bloquea el escáner si falla.
export async function registrarAsistenciaEnLinea(r) {
  if (!microsoftListo()) return false;
  const a = r.area ? areaPorId(r.area) : null;
  await ms.crearRegistro(cfgMS().listaAsistencia, {
    Title: r.clave, CodigoPase: r.paseId || '', Nombre: r.nombre, Cargo: r.cargo || '', AreaId: r.area || '', Area: a ? a.nombre : '',
    Dependencia: r.dependencia ? `${r.dependencia} · ${dependencia(r.dependencia)?.nombre || ''}` : '', Correo: r.correo || '', HoraIngreso: r.hora, Metodo: r.metodo === 'QR' ? 'QR' : 'Manual'
  });
  return true;
}

// Registros para el panel de la Oficina Asesora de Planeación: SharePoint si hay sesión, si no los de este navegador.
export async function leerRegistrosPanel() {
  if (microsoftListo()) {
    const filas = await ms.leerRegistros(cfgMS().listaRegistro);
    return filas.map((f) => ({
      id: f.Title, tipo: f.Tipo === 'Plan de acción' ? 'accion' : 'necesidades', fecha: f.FechaCargue || f.Created,
      area: { id: f.AreaId, nombre: f.Area }, dependencia: { codigo: String(f.Dependencia || '').slice(0, 3), nombre: String(f.Dependencia || '').slice(6) },
      responsable: { nombre: f.Responsable, cargo: f.Cargo, correo: f.CorreoResponsable }, correosEquipo: String(f.CorreosEquipo || '').split(/;\s*/).filter(Boolean),
      archivo: f.Archivo, enlace: f.EnlaceArchivo, estado: f.Estado === 'Validada' ? 'validada' : 'con-bloqueantes', advertencias: f.Advertencias,
      resumenTexto: f.Resumen, codigoPase: f.CodigoPase, registradoPor: f.RegistradoPor, origen: 'SharePoint'
    }));
  }
  return estado.consolidado.registros.map((r) => ({ ...r, origen: 'Este navegador' }));
}
