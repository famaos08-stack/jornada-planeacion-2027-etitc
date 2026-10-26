/**
 * Registro en línea de la Jornada de Planeación Institucional 2027 (ETITC, Oficina Asesora de Planeación).
 * Aplicación web de Google Apps Script ligada a una hoja de cálculo de Google.
 *
 *  POST  { accion: 'descarga' | 'lectura' | 'activacion', token, datos }  → guarda una fila y responde JSON
 *  GET   ?accion=panel&clave=CLAVEADMIN                                  → devuelve descargas y lecturas
 *  GET   ?accion=ping                                                     → prueba de conexión
 *
 * Propiedades del script (las crea la función instalar):
 *  TOKEN          el mismo valor de data/config.json → registro.token
 *  CLAVEADMIN     la clave del panel de la Oficina Asesora de Planeación (no se publica en el sitio)
 *  CORREOOFICINA  correo de la Oficina: responde las dudas y, en modo RELEVO, recibe cada pase para reenviarlo
 *  MODOENVIO      DIRECTO: el pase sale de esta cuenta de Google hacia el participante.
 *                 RELEVO: el pase llega a CORREOOFICINA y un flujo de Power Automate lo reenvía desde Outlook.
 *
 * Instalación paso a paso: docs/REGISTRO_EN_LINEA.md
 */

// Antes de ejecutar instalar, escriba aquí la clave del panel. Después de instalar puede borrarla de esta línea.
var CLAVE_DEL_PANEL = 'ESCRIBA AQUI LA CLAVE DEL PANEL';
var DOMINIO = 'itc.edu.co';
var QR_PRUEBA = 'iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAIAAAD/gAIDAAAB+klEQVR4nO2cS27DMAwFm6LLHKln6GFzhh4pe3erDVEOSFo2MLNsHUsYMA/6RY/jOD4kx+fuDtwJZQGUBVAWQFkAZQGUBfiK/vH8+W5v7P36/bet9ZmoD5lnKkT9tLIAygIoCxBm1kr0Hc5AMyWTUxHT/bSyAMoCKAuQyqyVzHc7kx10DBWNxej7o7YyWFkAZQGUBcCZ1QWd31XGUF1YWQBlAZQF2JZZK1F+Zf5+JlYWQFkAZQFwZk3nRdf7J/ppZQGUBVAWIJVZE3tzE+OpiX6uWFkAZQGUBXjsOlNaOcfg3PAGKAugLECYWXRdfHqM05VllXGclQVQFkBZgNQ4i46JMmdHI7rmgxPr+lYWQFkAZQHa9g1pTlWyaf1s5Ww9zS8rC6AsgLIAqd/uVOZcmTOiK1FbNJvcN9yMsgDKAoSZVcmpid8JTpzPon2wsgDKAigLUJob0jFR5j3Ta2eVtTYrC6AsgLIAl7vXgXLm3Q9WFkBZAGUBLnevA33PmefmrSyAsgDKAmy71yHzfGa9rLIPSHPQygIoC6AswOXudcjs/dG9yEx+Oc5qRlkAZQG2ZVbXvmHXOS/PZzWjLICyAJe714G2S7OvsjZvZQGUBVAWYNu9Dpm26Dho4ozFipUFUBZAWYBt9zrcESsLoCyAsgDKAigLoCyAsgB/ZwMJojANCgEAAAAASUVORK5CYII=';
var VALORES = { TOKEN: 'JP27ETITC', CORREOOFICINA: 'plandeaccion@itc.edu.co', MODOENVIO: 'DIRECTO' };

var HOJAS = {
  Descargas: ['Fecha y hora', 'Correo', 'Nombre', 'Cargo', 'Código dependencia', 'Dependencia', 'Id área', 'Área funcional',
    'Responsable del cargue en el SUIE', 'Correo del responsable SUIE', 'Pase', 'Verificado en directorio', 'Descarga repetida',
    'Origen', 'Dispositivo', 'Correo enviado', 'Id registro'],
  Lecturas: ['Fecha y hora', 'Resultado', 'Día', 'Actividad', 'Id actividad', 'Lector', 'Correo del lector', 'Rol del lector',
    'Participante', 'Cargo', 'Código dependencia', 'Dependencia', 'Correo del participante', 'Pase', 'Método', 'Prueba', 'Dispositivo', 'Clave'],
  Activaciones: ['Fecha y hora', 'Lector', 'Correo del lector', 'Rol', 'Actividad', 'Prueba', 'Dispositivo']
};

function prop_(k) { return PropertiesService.getScriptProperties().getProperty(k) || ''; }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function hoja_(nombre) {
  var libro = SpreadsheetApp.getActiveSpreadsheet();
  var h = libro.getSheetByName(nombre);
  if (!h) {
    h = libro.insertSheet(nombre);
    h.appendRow(HOJAS[nombre]);
    h.setFrozenRows(1);
    h.getRange(1, 1, 1, HOJAS[nombre].length).setFontWeight('bold').setBackground('#0b4d3b').setFontColor('#ffffff');
  }
  return h;
}

function fecha_(iso) {
  var d = iso ? new Date(iso) : new Date();
  return Utilities.formatDate(d, 'America/Bogota', 'yyyy-MM-dd HH:mm:ss');
}

function oficina_() { return prop_('CORREOOFICINA') || VALORES.CORREOOFICINA; }
function modo_() { return (prop_('MODOENVIO') || 'DIRECTO').toUpperCase(); }
function institucional_(c) { return new RegExp('^[^@\\s|;,<>]+@' + DOMINIO.replace(/\./g, '\\.') + '$', 'i').test(String(c || '').trim()); }

/** Paso 1. Ejecútela una vez desde el editor: crea las propiedades y las tres hojas, y pide los permisos. */
function instalar() {
  var p = PropertiesService.getScriptProperties();
  Object.keys(VALORES).forEach(function (k) { if (!p.getProperty(k)) p.setProperty(k, VALORES[k]); });
  if (CLAVE_DEL_PANEL && CLAVE_DEL_PANEL.indexOf('ESCRIBA') !== 0) p.setProperty('CLAVEADMIN', CLAVE_DEL_PANEL);
  Object.keys(HOJAS).forEach(hoja_);
  var h1 = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Hoja 1');
  if (h1 && h1.getLastRow() === 0 && SpreadsheetApp.getActiveSpreadsheet().getSheets().length > 1) SpreadsheetApp.getActiveSpreadsheet().deleteSheet(h1);
  Logger.log('Instalación lista. Modo de envío: ' + modo_() + '. Correo de la Oficina: ' + oficina_() + '. Clave del panel: '
    + (p.getProperty('CLAVEADMIN') ? 'configurada.' : 'FALTA. Escríbala en CLAVE_DEL_PANEL y ejecute instalar de nuevo.')
    + ' Correos disponibles hoy: ' + MailApp.getRemainingDailyQuota() + '.');
}

/** Paso 2. Envía un pase de prueba al correo de la Oficina. En modo RELEVO sirve también para probar el flujo de Power Automate. */
function probarCorreo() {
  enviarPase_({ correo: oficina_(), nombre: 'Prueba de la Oficina Asesora de Planeación', paseId: 'JP27PRUEBA', dependencia: '000',
    dependenciaNombre: 'Oficina Asesora de Planeación', responsableSuie: { nombre: 'Prueba', correo: oficina_() },
    qrPng: QR_PRUEBA });
  Logger.log('Correo de prueba enviado a ' + oficina_() + ' en modo ' + modo_() + '. Correos disponibles hoy: ' + MailApp.getRemainingDailyQuota() + '.');
}

/** Cambia el modo de envío. Ejecute usarRelevo cuando el flujo de Power Automate esté encendido, o usarDirecto para volver. */
function usarRelevo() { PropertiesService.getScriptProperties().setProperty('MODOENVIO', 'RELEVO'); Logger.log('Modo de envío: RELEVO.'); }
function usarDirecto() { PropertiesService.getScriptProperties().setProperty('MODOENVIO', 'DIRECTO'); Logger.log('Modo de envío: DIRECTO.'); }

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var cuerpo = JSON.parse(e.postData.contents || '{}');
    if (prop_('TOKEN') && cuerpo.token !== prop_('TOKEN')) return json_({ ok: false, error: 'Token no válido.' });
    var d = cuerpo.datos || {};
    if (cuerpo.accion === 'descarga') return json_(registrarDescarga_(d));
    if (cuerpo.accion === 'lectura') return json_(registrarLectura_(d));
    if (cuerpo.accion === 'activacion') {
      hoja_('Activaciones').appendRow([fecha_(d.hora), (d.lector || {}).nombre, (d.lector || {}).correo, (d.lector || {}).rol,
        d.actividad ? d.actividad.titulo : 'Coordinación', d.prueba ? 'Sí' : 'No', d.dispositivo || '']);
      return json_({ ok: true });
    }
    return json_({ ok: false, error: 'Acción desconocida.' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (x) { /* sin bloqueo */ }
  }
}

function registrarDescarga_(d) {
  var h = hoja_('Descargas');
  var suie = d.responsableSuie || {};
  var correo = { enviado: false, motivo: '' };
  if (!d.repetida && d.enviarCorreo !== false && d.qrPng) {
    try { enviarPase_(d); correo.enviado = true; } catch (err) { correo.motivo = String(err); }
  }
  h.appendRow([fecha_(d.fecha), d.correo, d.nombre, d.cargo, d.dependencia, d.dependenciaNombre || '', d.area || '', d.areaNombre || '',
    suie.nombre || '', suie.correo || '', d.paseId || '', d.verificado ? 'Sí' : 'No', d.repetida ? 'Sí' : 'No', d.origen || '',
    d.dispositivo || '', correo.enviado ? 'Sí' : (d.repetida ? '' : 'No'), d.id || '']);
  return { ok: true, correo: correo.enviado, motivoCorreo: correo.motivo };
}

function registrarLectura_(d) {
  var h = hoja_('Lecturas');
  var a = d.actividad || {};
  var l = d.lector || {};
  h.appendRow([fecha_(d.hora), { ok: 'Ingreso', duplicado: 'Repetida', rechazo: 'Rechazo' }[d.resultado] || d.resultado, a.dia || '', a.titulo || '', a.id || '',
    l.nombre || '', l.correo || '', l.rol || '', d.nombre || '', d.cargo || '', d.dependencia || '', d.depNombre || '', d.correo || '',
    d.paseId || '', d.metodo || '', d.prueba ? 'Sí' : 'No', d.dispositivo || '', d.clave || '']);
  return { ok: true };
}

function enviarPase_(d) {
  if (!institucional_(d.correo)) throw new Error('El correo ' + d.correo + ' no es institucional; el pase se muestra solo en pantalla.');
  var relevo = modo_() === 'RELEVO';
  var nombreQr = 'Pase_' + String(d.paseId || 'JP27').replace(/[^A-Za-z0-9]/g, '') + '.png';
  var qr = Utilities.newBlob(Utilities.base64Decode(d.qrPng), 'image/png', nombreQr);
  var esc = function (t) { return String(t || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var suie = d.responsableSuie || {};
  var imagen = relevo
    ? '<div style="font-size:14px;color:#0b4d3b;font-weight:bold;padding:8px 24px">Su código QR va adjunto en este correo (archivo ' + nombreQr + '). Ábralo en el celular o imprímalo.</div>'
    : '<img src="cid:qr" width="220" height="220" alt="Código QR del pase ' + esc(d.paseId) + '">';
  var html = '<div style="font-family:Arial,sans-serif;background:#f4f7f4;padding:20px">'
    + '<table role="presentation" width="100%" style="max-width:560px;margin:auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #d7e4dc">'
    + '<tr><td style="background:#0b4d3b;color:#fff;padding:20px 24px"><div style="font-size:11px;letter-spacing:2px;color:#8ad058;font-weight:bold">JORNADA DE PLANEACIÓN 2027</div>'
    + '<div style="font-size:22px;font-weight:bold;margin-top:4px">Su pase de ingreso</div><div style="font-size:13px;color:#e6f4ec">18, 19 y 20 de noviembre de 2026</div></td></tr>'
    + '<tr><td style="padding:18px 24px;color:#3d5950;font-size:14px;line-height:1.55">Hola, ' + esc(d.nombre) + '. Registramos la descarga de la <b>Plantilla Plan de Acción 2027</b>. '
    + 'Presente este código QR en el ingreso a cada actividad de la jornada.</td></tr>'
    + '<tr><td align="center">' + imagen + '</td></tr>'
    + '<tr><td align="center" style="font:bold 18px Consolas,monospace;letter-spacing:2px;color:#0b4d3b;padding:6px 0 14px">' + esc(d.paseId) + '</td></tr>'
    + '<tr><td style="padding:0 24px 18px"><div style="background:#fff4dc;border-radius:12px;padding:12px 14px;color:#13332a;font-size:13px;line-height:1.5">'
    + '<b>Su siguiente paso:</b> formule la plantilla y cárguela en el SUIE. Esa formulación es su insumo de ingreso y de trabajo en la jornada.</div></td></tr>'
    + '<tr><td style="padding:0 24px 18px;font-size:13px;color:#3d5950">Dependencia: <b>' + esc(d.dependencia) + ' ' + esc(d.dependenciaNombre) + '</b><br>'
    + 'Responsable del cargue en el SUIE: <b>' + esc(suie.nombre) + '</b> (' + esc(suie.correo) + ')</td></tr>'
    + '<tr><td style="padding:14px 24px;border-top:1px solid #d7e4dc;font-size:12px;color:#587068">Oficina Asesora de Planeación, Escuela Tecnológica Instituto Técnico Central. '
    + 'Mensaje automático del aplicativo de la jornada. Dudas: ' + esc(oficina_()) + '</td></tr></table></div>';
  var asunto = 'Pase de ingreso ' + d.paseId + ', Jornada de Planeación 2027';
  var copia = institucional_(suie.correo) && suie.correo.toLowerCase() !== String(d.correo).toLowerCase() ? suie.correo.trim() : '';
  if (relevo) {
    // Formato que lee el flujo de Power Automate: JP27RELEVO | para | copia | asunto
    MailApp.sendEmail(oficina_(), 'JP27RELEVO | ' + d.correo.trim() + ' | ' + (copia || oficina_()) + ' | ' + asunto, 'Pase ' + d.paseId,
      { htmlBody: html, attachments: [qr], name: 'Registro Jornada de Planeación 2027' });
    return;
  }
  var opciones = { htmlBody: html, inlineImages: { qr: qr }, attachments: [qr.copyBlob().setName(nombreQr)],
    name: 'Jornada de Planeación 2027 ETITC', replyTo: oficina_() };
  var cc = [copia, oficina_()].filter(function (c) { return c && c.toLowerCase() !== String(d.correo).trim().toLowerCase(); });
  if (cc.length) opciones.cc = cc.join(',');
  MailApp.sendEmail(d.correo.trim(), asunto, 'Su pase de ingreso es ' + d.paseId + '.', opciones);
}

function filas_(nombre) {
  var h = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombre);
  if (!h || h.getLastRow() < 2) return [];
  var v = h.getRange(1, 1, h.getLastRow(), h.getLastColumn()).getDisplayValues();
  var enc = v.shift();
  return v.map(function (f) { var o = {}; enc.forEach(function (k, i) { o[k] = f[i]; }); return o; });
}

function doGet(e) {
  var p = e.parameter || {};
  if (p.accion === 'ping') return json_({ ok: true, hora: fecha_(), modo: modo_() });
  if (p.accion === 'panel') {
    if (!prop_('CLAVEADMIN') || p.clave !== prop_('CLAVEADMIN')) return json_({ ok: false, error: 'Clave de administración no válida.' });
    var desc = filas_('Descargas').map(function (r) {
      return { fecha: r['Fecha y hora'].replace(' ', 'T') + '-05:00', correo: r['Correo'], nombre: r['Nombre'], cargo: r['Cargo'], dependencia: r['Código dependencia'],
        areaNombre: r['Área funcional'], responsableSuie: { nombre: r['Responsable del cargue en el SUIE'], correo: r['Correo del responsable SUIE'] },
        paseId: r['Pase'], verificado: r['Verificado en directorio'], repetida: r['Descarga repetida'], dispositivo: r['Dispositivo'] };
    });
    var lect = filas_('Lecturas').map(function (r) {
      return { hora: r['Fecha y hora'].replace(' ', 'T') + '-05:00', resultado: { Ingreso: 'ok', Repetida: 'duplicado', Rechazo: 'rechazo' }[r['Resultado']] || r['Resultado'],
        actividad: { titulo: r['Actividad'], id: r['Id actividad'] }, lector: { nombre: r['Lector'], correo: r['Correo del lector'] }, nombre: r['Participante'],
        dependencia: r['Código dependencia'], correo: r['Correo del participante'], paseId: r['Pase'], metodo: r['Método'], prueba: r['Prueba'] };
    });
    return json_({ ok: true, descargas: desc, lecturas: lect });
  }
  return json_({ ok: true, servicio: 'Registro Jornada de Planeación 2027' });
}
