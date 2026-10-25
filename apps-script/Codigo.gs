/**
 * Registro en línea de la Jornada de Planeación Institucional 2027 (ETITC, Oficina Asesora de Planeación).
 * Aplicación web de Google Apps Script ligada a una hoja de cálculo de Google.
 *
 *  POST  { accion: 'descarga' | 'lectura' | 'activacion', token, datos }  → guarda una fila y responde JSON
 *  GET   ?accion=panel&clave=CLAVE_ADMIN                                  → devuelve descargas y lecturas
 *  GET   ?accion=ping                                                     → prueba de conexión
 *
 * Propiedades del script (Configuración del proyecto → Propiedades del script):
 *  TOKEN        el mismo valor de data/config.json → registro.token
 *  CLAVE_ADMIN  la clave del panel de la Oficina Asesora de Planeación (no se publica en el sitio)
 *  CORREO_COPIA opcional: correo que recibe copia de cada pase (por ejemplo, plandeaccion@itc.edu.co)
 *
 * Instalación paso a paso: docs/REGISTRO_EN_LINEA.md
 */

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
  var qr = Utilities.newBlob(Utilities.base64Decode(d.qrPng), 'image/png', 'pase.png');
  var esc = function (t) { return String(t || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var html = '<div style="font-family:Arial,sans-serif;background:#f4f7f4;padding:20px">'
    + '<table role="presentation" width="100%" style="max-width:560px;margin:auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #d7e4dc">'
    + '<tr><td style="background:#0b4d3b;color:#fff;padding:20px 24px"><div style="font-size:11px;letter-spacing:2px;color:#8ad058;font-weight:bold">JORNADA DE PLANEACIÓN 2027</div>'
    + '<div style="font-size:22px;font-weight:bold;margin-top:4px">Su pase de ingreso</div><div style="font-size:13px;color:#e6f4ec">18, 19 y 20 de noviembre de 2026</div></td></tr>'
    + '<tr><td style="padding:18px 24px;color:#3d5950;font-size:14px;line-height:1.55">Hola, ' + esc(d.nombre) + '. Registramos la descarga de la <b>Plantilla Plan de Acción 2027</b>. '
    + 'Presente este código QR en el ingreso a cada actividad de la jornada.</td></tr>'
    + '<tr><td align="center"><img src="cid:qr" width="220" height="220" alt="Código QR del pase ' + esc(d.paseId) + '"></td></tr>'
    + '<tr><td align="center" style="font:bold 18px Consolas,monospace;letter-spacing:2px;color:#0b4d3b;padding:6px 0 14px">' + esc(d.paseId) + '</td></tr>'
    + '<tr><td style="padding:0 24px 18px"><div style="background:#fff4dc;border-radius:12px;padding:12px 14px;color:#13332a;font-size:13px;line-height:1.5">'
    + '<b>Su siguiente paso:</b> formule la plantilla y cárguela en el SUIE. Esa formulación es su insumo de ingreso y de trabajo en la jornada.</div></td></tr>'
    + '<tr><td style="padding:0 24px 18px;font-size:13px;color:#3d5950">Dependencia: <b>' + esc(d.dependencia) + ' ' + esc(d.dependenciaNombre) + '</b><br>'
    + 'Responsable del cargue en el SUIE: <b>' + esc((d.responsableSuie || {}).nombre) + '</b> (' + esc((d.responsableSuie || {}).correo) + ')</td></tr>'
    + '<tr><td style="padding:14px 24px;border-top:1px solid #d7e4dc;font-size:12px;color:#587068">Oficina Asesora de Planeación, Escuela Tecnológica Instituto Técnico Central. '
    + 'Mensaje automático del aplicativo de la jornada. Dudas: planeacion@itc.edu.co</td></tr></table></div>';
  var opciones = { htmlBody: html, inlineImages: { qr: qr }, name: 'Jornada de Planeación 2027 ETITC', replyTo: 'planeacion@itc.edu.co' };
  var cc = [];
  if (d.responsableSuie && d.responsableSuie.correo && d.responsableSuie.correo !== d.correo) cc.push(d.responsableSuie.correo);
  if (prop_('CORREO_COPIA')) cc.push(prop_('CORREO_COPIA'));
  if (cc.length) opciones.cc = cc.join(',');
  MailApp.sendEmail(d.correo, 'Pase de ingreso ' + d.paseId + ' · Jornada de Planeación 2027', 'Su pase de ingreso es ' + d.paseId + '.', opciones);
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
  if (p.accion === 'ping') return json_({ ok: true, hora: fecha_() });
  if (p.accion === 'panel') {
    if (!prop_('CLAVE_ADMIN') || p.clave !== prop_('CLAVE_ADMIN')) return json_({ ok: false, error: 'Clave de administración no válida.' });
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
