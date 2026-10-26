/**
 * Registro en línea de la Jornada de Planeación Institucional 2027 (ETITC, Oficina Asesora de Planeación).
 * Aplicación web de Google Apps Script ligada a una hoja de cálculo de Google, que es el respaldo de datos del aplicativo.
 *
 *  POST  { accion: 'descarga' | 'lectura' | 'activacion', token, datos }  → guarda una fila y responde JSON
 *  GET   ?accion=panel&clave=CLAVEADMIN                                  → devuelve descargas y lecturas
 *  GET   ?accion=ping                                                     → prueba de conexión
 *
 * Hojas del libro (las crea la función instalar):
 *  Resumen               cifras generales: áreas con descarga y pendientes, personas, pases enviados, ingresos por día
 *  Seguimiento por área  las 45 áreas funcionales: si descargó, cuántas veces, quiénes, primera y última descarga, responsable SUIE
 *  Descargas             una fila por cada descarga de la plantilla, con fecha, hora, persona, dependencia y área
 *  Lecturas              una fila por cada lectura de pase QR en las actividades de la jornada
 *  Activaciones          una fila por cada activación de un lector de pases
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
var ZONA = 'America/Bogota';
var QR_PRUEBA = 'iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAIAAAD/gAIDAAAB+klEQVR4nO2cS27DMAwFm6LLHKln6GFzhh4pe3erDVEOSFo2MLNsHUsYMA/6RY/jOD4kx+fuDtwJZQGUBVAWQFkAZQGUBfiK/vH8+W5v7P36/bet9ZmoD5lnKkT9tLIAygIoCxBm1kr0Hc5AMyWTUxHT/bSyAMoCKAuQyqyVzHc7kx10DBWNxej7o7YyWFkAZQGUBcCZ1QWd31XGUF1YWQBlAZQF2JZZK1F+Zf5+JlYWQFkAZQFwZk3nRdf7J/ppZQGUBVAWIJVZE3tzE+OpiX6uWFkAZQGUBXjsOlNaOcfg3PAGKAugLECYWXRdfHqM05VllXGclQVQFkBZgNQ4i46JMmdHI7rmgxPr+lYWQFkAZQHa9g1pTlWyaf1s5Ww9zS8rC6AsgLIAqd/uVOZcmTOiK1FbNJvcN9yMsgDKAoSZVcmpid8JTpzPon2wsgDKAigLUJob0jFR5j3Ta2eVtTYrC6AsgLIAl7vXgXLm3Q9WFkBZAGUBLnevA33PmefmrSyAsgDKAmy71yHzfGa9rLIPSHPQygIoC6AswOXudcjs/dG9yEx+Oc5qRlkAZQG2ZVbXvmHXOS/PZzWjLICyAJe714G2S7OvsjZvZQGUBVAWYNu9Dpm26Dho4ozFipUFUBZAWYBt9zrcESsLoCyAsgDKAigLoCyAsgB/ZwMJojANCgEAAAAASUVORK5CYII=';
var VALORES = { TOKEN: 'JP27ETITC', CORREOOFICINA: 'plandeaccion@itc.edu.co', MODOENVIO: 'DIRECTO' };

// Áreas funcionales de data/areas.json: id, código de dependencia, dependencia, área.
var AREAS = [
  ['A01', '100', 'Rectoría', 'Despacho de Rectoría'],
  ['A02', '100', 'Rectoría', 'Comunicaciones y Mercadeo'],
  ['A03', '100', 'Rectoría', 'Internacionalización (ORII)'],
  ['A04', '102', 'Control Interno', 'Control Interno'],
  ['A05', '101', 'Oficina Asesora de Planeación y Desarrollo Institucional', 'Planeación y Plan de Acción'],
  ['A06', '101', 'Oficina Asesora de Planeación y Desarrollo Institucional', 'Gestión de Proyectos'],
  ['A07', '101', 'Oficina Asesora de Planeación y Desarrollo Institucional', 'Autoevaluación y Acreditación'],
  ['A08', '101', 'Oficina Asesora de Planeación y Desarrollo Institucional', 'Aseguramiento de la Calidad, MIPG y Registros Calificados'],
  ['A09', '132', 'GIT Informática y Telecomunicaciones', 'Seguridad Digital y Continuidad'],
  ['A10', '101', 'Oficina Asesora de Planeación y Desarrollo Institucional', 'Gestión Ambiental'],
  ['A11', '110', 'Secretaría General', 'Despacho de Secretaría General'],
  ['A12', '110', 'Secretaría General', 'Gestión Jurídica'],
  ['A13', '110', 'Secretaría General', 'Control Disciplinario'],
  ['A14', '130', 'Vicerrectoría Administrativa y Financiera', 'Contratación y Adquisiciones'],
  ['A15', '120', 'Vicerrectoría Académica', 'Despacho de la Vicerrectoría Académica'],
  ['A16', '123', 'Facultades', 'Coordinación de Especializaciones'],
  ['A19', '101', 'Oficina Asesora de Planeación y Desarrollo Institucional', 'Regionalización'],
  ['A20', '121', 'GIT Biblioteca y Recursos Académicos', 'GIT Biblioteca y Recursos Académicos'],
  ['A21', '122', 'GIT Bienestar Universitario', 'GIT Bienestar Universitario'],
  ['A22', '123', 'Facultades', 'Facultad de Electromecánica'],
  ['A23', '123', 'Facultades', 'Facultad de Mecánica'],
  ['A24', '123', 'Facultades', 'Facultad de Mecatrónica'],
  ['A25', '123', 'Facultades', 'Facultad de Procesos Industriales'],
  ['A26', '123', 'Facultades', 'Facultad de Sistemas'],
  ['A27', '124', 'Instituto de Bachillerato Técnico Industrial', 'IBTI'],
  ['A28', '125', 'GIT Talleres y Laboratorios', 'GIT Talleres y Laboratorios'],
  ['A29', '126', 'GIT Registro y Control', 'GIT Registro, Control y Admisiones'],
  ['A30', '130', 'Vicerrectoría Administrativa y Financiera', 'Despacho de la Vicerrectoría Administrativa y Financiera'],
  ['A31', '130', 'Vicerrectoría Administrativa y Financiera', 'Recursos Físicos e Infraestructura'],
  ['A32', '131', 'GIT Gestión Documental y Atención al Ciudadano', 'Gestión Documental'],
  ['A33', '131', 'GIT Gestión Documental y Atención al Ciudadano', 'Atención al Ciudadano'],
  ['A34', '132', 'GIT Informática y Telecomunicaciones', 'GIT Informática y Telecomunicaciones'],
  ['A35', '133', 'GIT Talento Humano', 'GIT Talento Humano'],
  ['A36', '133', 'GIT Talento Humano', 'Seguridad y Salud en el Trabajo'],
  ['A37', '133', 'GIT Talento Humano', 'Bienestar Laboral'],
  ['A38', '140', 'Vicerrectoría de Investigación, Extensión y Transferencia', 'Despacho de la VIET'],
  ['A39', '140', 'Vicerrectoría de Investigación, Extensión y Transferencia', 'Investigación (grupos, semilleros, revista, centro de pensamiento)'],
  ['A40', '140', 'Vicerrectoría de Investigación, Extensión y Transferencia', 'Innovación y Laboratorio Inteligente'],
  ['A41', '141', 'GIT Extensión y Proyección Social', 'GIT Extensión y Proyección Social (incluye ETDH)'],
  ['A42', '141', 'GIT Extensión y Proyección Social', 'Centro de Lenguas (CEL)'],
  ['A43', '141', 'GIT Extensión y Proyección Social', 'Egresados y Bolsa de Empleo'],
  ['A44', '100', 'Rectoría', 'Sedes y Campus'],
  ['A45', '120', 'Vicerrectoría Académica', 'Sedes Tintal, Soacha UPK y Viotá'],
  ['A46', '123', 'Facultades', 'Facultad de Inteligencia Artificial (Acuerdo 010 de 2025)'],
  ['A47', '130', 'Vicerrectoría Administrativa y Financiera', 'Gestión Financiera (Presupuesto, Contabilidad, Tesorería)']
];

var HOJAS = {
  Descargas: ['Fecha y hora', 'Fecha', 'Hora', 'Correo', 'Nombre', 'Cargo', 'Código dependencia', 'Dependencia', 'Id área', 'Área funcional',
    'Responsable del cargue en el SUIE', 'Correo del responsable SUIE', 'Pase', 'Verificado en directorio', 'Descarga repetida',
    'Origen', 'Dispositivo', 'Correo enviado', 'Id registro'],
  Lecturas: ['Fecha y hora', 'Fecha', 'Hora', 'Resultado', 'Día', 'Actividad', 'Id actividad', 'Lector', 'Correo del lector', 'Rol del lector',
    'Participante', 'Cargo', 'Código dependencia', 'Dependencia', 'Correo del participante', 'Pase', 'Método', 'Prueba', 'Dispositivo', 'Clave'],
  Activaciones: ['Fecha y hora', 'Fecha', 'Hora', 'Lector', 'Correo del lector', 'Rol', 'Actividad', 'Prueba', 'Dispositivo'],
  'Seguimiento por área': ['Id área', 'Código dependencia', 'Dependencia', 'Área funcional', '¿Descargó?', 'Descargas', 'Personas que descargaron',
    'Primera descarga', 'Última descarga', 'Responsable del cargue en el SUIE', 'Correo del responsable SUIE', 'Nombres de quienes descargaron']
};
var ORDEN = ['Resumen', 'Seguimiento por área', 'Descargas', 'Lecturas', 'Activaciones'];
var TEXTO = ['Código dependencia', 'Id área', 'Pase', 'Id registro', 'Id actividad', 'Clave', 'Día'];
var VERDE = '#0b4d3b';

function prop_(k) { return PropertiesService.getScriptProperties().getProperty(k) || ''; }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function libro_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function hoja_(nombre) {
  var h = libro_().getSheetByName(nombre);
  if (h) return h;
  h = libro_().insertSheet(nombre);
  if (nombre === 'Resumen') return h;
  var enc = HOJAS[nombre];
  h.getRange(1, 1, 1, enc.length).setValues([enc]).setFontWeight('bold').setBackground(VERDE).setFontColor('#ffffff').setWrap(true);
  h.setFrozenRows(1);
  enc.forEach(function (k, i) {
    var col = h.getRange(2, i + 1, h.getMaxRows() - 1, 1);
    if (k === 'Fecha y hora' || k === 'Primera descarga' || k === 'Última descarga') col.setNumberFormat('yyyy-mm-dd hh:mm:ss');
    else if (k === 'Fecha') col.setNumberFormat('dd/mm/yyyy');
    else if (k === 'Hora') col.setNumberFormat('hh:mm:ss am/pm');
    else if (TEXTO.indexOf(k) >= 0) col.setNumberFormat('@');
    h.setColumnWidth(i + 1, /Correo|Nombre|Dependencia|Área|Responsable|Actividad|Participante|Lector$|Dispositivo/.test(k) ? 210 : 115);
  });
  return h;
}

// Evita que un texto escrito por un usuario se interprete como fórmula en la hoja.
function seguro_(v) { return typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v; }

// Arma la fila en el orden de los encabezados; la fecha va en tres columnas (fecha y hora, fecha, hora) con el mismo valor.
function agregar_(nombre, o) {
  var momento = o.momento ? new Date(o.momento) : new Date();
  if (isNaN(momento.getTime())) momento = new Date();
  var fila = HOJAS[nombre].map(function (k) {
    if (k === 'Fecha y hora' || k === 'Fecha' || k === 'Hora') return momento;
    var v = o[k];
    return v === undefined || v === null ? '' : seguro_(v);
  });
  hoja_(nombre).appendRow(fila);
}

function si_(b) { return b ? 'Sí' : 'No'; }
function oficina_() { return prop_('CORREOOFICINA') || VALORES.CORREOOFICINA; }
function modo_() { return (prop_('MODOENVIO') || 'DIRECTO').toUpperCase(); }
function institucional_(c) { return new RegExp('^[^@\\s|;,<>]+@' + DOMINIO.replace(/\./g, '\\.') + '$', 'i').test(String(c || '').trim()); }

/** Paso 1. Ejecútela una vez desde el editor: crea las propiedades y las hojas, y pide los permisos. */
function instalar() {
  var p = PropertiesService.getScriptProperties();
  Object.keys(VALORES).forEach(function (k) { if (!p.getProperty(k)) p.setProperty(k, VALORES[k]); });
  if (CLAVE_DEL_PANEL && CLAVE_DEL_PANEL.indexOf('ESCRIBA') !== 0) p.setProperty('CLAVEADMIN', CLAVE_DEL_PANEL);
  var libro = libro_();
  libro.setSpreadsheetTimeZone(ZONA);
  var avisos = [];
  ORDEN.forEach(function (n) {
    var h = hoja_(n);
    if (HOJAS[n]) {
      var enc = h.getRange(1, 1, 1, HOJAS[n].length).getDisplayValues()[0];
      if (enc.join('|') !== HOJAS[n].join('|')) avisos.push('La hoja «' + n + '» tiene encabezados de una versión anterior: bórrela y ejecute instalar de nuevo.');
    }
  });
  ORDEN.forEach(function (n, i) { libro.setActiveSheet(libro.getSheetByName(n)); libro.moveActiveSheet(i + 1); });
  ['Hoja 1', 'Sheet1', 'Hoja1'].forEach(function (n) { var h = libro.getSheetByName(n); if (h && h.getLastRow() === 0) libro.deleteSheet(h); });
  actualizarSeguimiento();
  // Recalcula el resumen cada cinco minutos para reflejar las lecturas de pases durante la jornada.
  if (!ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'actualizarSeguimiento'; })) {
    ScriptApp.newTrigger('actualizarSeguimiento').timeBased().everyMinutes(5).create();
  }
  libro.setActiveSheet(libro.getSheetByName('Resumen'));
  Logger.log('Instalación lista. Modo de envío: ' + modo_() + '. Correo de la Oficina: ' + oficina_() + '. Clave del panel: '
    + (p.getProperty('CLAVEADMIN') ? 'configurada.' : 'FALTA. Escríbala en CLAVE_DEL_PANEL y ejecute instalar de nuevo.')
    + ' Correos disponibles hoy: ' + MailApp.getRemainingDailyQuota() + '.' + (avisos.length ? ' ATENCIÓN: ' + avisos.join(' ') : ''));
}

/** Paso 2. Envía un pase de prueba al correo de la Oficina. En modo RELEVO sirve también para probar el flujo de Power Automate. */
function probarCorreo() {
  enviarPase_({ correo: oficina_(), nombre: 'Prueba de la Oficina Asesora de Planeación', paseId: 'JP27PRUEBA', dependencia: '101',
    dependenciaNombre: 'Oficina Asesora de Planeación', responsableSuie: { nombre: 'Prueba', correo: oficina_() }, qrPng: QR_PRUEBA });
  Logger.log('Correo de prueba enviado a ' + oficina_() + ' en modo ' + modo_() + '. Correos disponibles hoy: ' + MailApp.getRemainingDailyQuota() + '.');
}

/** Cambia el modo de envío. Ejecute usarRelevo cuando el flujo de Power Automate esté encendido, o usarDirecto para volver. */
function usarRelevo() { PropertiesService.getScriptProperties().setProperty('MODOENVIO', 'RELEVO'); Logger.log('Modo de envío: RELEVO.'); }
function usarDirecto() { PropertiesService.getScriptProperties().setProperty('MODOENVIO', 'DIRECTO'); Logger.log('Modo de envío: DIRECTO.'); }

/** Menú en la hoja de cálculo para actualizar el seguimiento a mano. */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Jornada 2027').addItem('Actualizar resumen y seguimiento', 'actualizarSeguimiento').addToUi();
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
      var l = d.lector || {};
      agregar_('Activaciones', { momento: d.hora, 'Lector': l.nombre, 'Correo del lector': l.correo, 'Rol': l.rol,
        'Actividad': d.actividad ? d.actividad.titulo : 'Coordinación', 'Prueba': si_(d.prueba), 'Dispositivo': d.dispositivo });
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
  var suie = d.responsableSuie || {};
  var correo = { enviado: false, motivo: '' };
  if (!d.repetida && d.enviarCorreo !== false && d.qrPng) {
    try { enviarPase_(d); correo.enviado = true; } catch (err) { correo.motivo = String(err); }
  }
  agregar_('Descargas', { momento: d.fecha, 'Correo': d.correo, 'Nombre': d.nombre, 'Cargo': d.cargo, 'Código dependencia': d.dependencia,
    'Dependencia': d.dependenciaNombre, 'Id área': d.area, 'Área funcional': d.areaNombre, 'Responsable del cargue en el SUIE': suie.nombre,
    'Correo del responsable SUIE': suie.correo, 'Pase': d.paseId, 'Verificado en directorio': si_(d.verificado), 'Descarga repetida': si_(d.repetida),
    'Origen': d.origen, 'Dispositivo': d.dispositivo, 'Correo enviado': correo.enviado ? 'Sí' : (d.repetida ? '' : 'No'), 'Id registro': d.id });
  try { actualizarSeguimiento(); } catch (err) { /* el registro ya quedó guardado */ }
  return { ok: true, correo: correo.enviado, motivoCorreo: correo.motivo };
}

function registrarLectura_(d) {
  var a = d.actividad || {};
  var l = d.lector || {};
  agregar_('Lecturas', { momento: d.hora, 'Resultado': { ok: 'Ingreso', duplicado: 'Repetida', rechazo: 'Rechazo' }[d.resultado] || d.resultado,
    'Día': a.dia, 'Actividad': a.titulo, 'Id actividad': a.id, 'Lector': l.nombre, 'Correo del lector': l.correo, 'Rol del lector': l.rol,
    'Participante': d.nombre, 'Cargo': d.cargo, 'Código dependencia': d.dependencia, 'Dependencia': d.depNombre, 'Correo del participante': d.correo,
    'Pase': d.paseId, 'Método': d.metodo, 'Prueba': si_(d.prueba), 'Dispositivo': d.dispositivo, 'Clave': d.clave });
  return { ok: true };
}

// Lee una hoja como lista de objetos con los valores reales (las fechas llegan como fechas).
function objetos_(nombre) {
  var h = libro_().getSheetByName(nombre);
  if (!h || h.getLastRow() < 2) return [];
  var v = h.getRange(1, 1, h.getLastRow(), h.getLastColumn()).getValues();
  var enc = v.shift();
  return v.map(function (f) { var o = {}; enc.forEach(function (k, i) { o[k] = f[i]; }); return o; });
}

/** Recalcula las hojas Resumen y Seguimiento por área a partir de Descargas y Lecturas. Se ejecuta con cada descarga y cada cinco minutos. */
function actualizarSeguimiento() {
  var desc = objetos_('Descargas');
  var lect = objetos_('Lecturas').filter(function (r) { return r['Prueba'] !== 'Sí'; });
  var porArea = {};
  desc.forEach(function (r) {
    var id = String(r['Id área'] || '');
    if (!id) return;
    var x = porArea[id] = porArea[id] || { n: 0, correos: {}, nombres: [], primera: null, ultima: null, suie: '', suieCorreo: '' };
    var f = r['Fecha y hora'] instanceof Date ? r['Fecha y hora'] : null;
    x.n++;
    var c = String(r['Correo'] || '').toLowerCase();
    if (c && !x.correos[c]) { x.correos[c] = 1; x.nombres.push(r['Nombre'] || c); }
    if (f && (!x.primera || f < x.primera)) x.primera = f;
    if (f && (!x.ultima || f >= x.ultima)) { x.ultima = f; x.suie = r['Responsable del cargue en el SUIE']; x.suieCorreo = r['Correo del responsable SUIE']; }
  });

  var seg = hoja_('Seguimiento por área');
  var filas = AREAS.map(function (a) {
    var x = porArea[a[0]];
    return [a[0], a[1], a[2], a[3], si_(!!x), x ? x.n : 0, x ? x.nombres.length : 0, x && x.primera ? x.primera : '', x && x.ultima ? x.ultima : '',
      x ? x.suie || '' : '', x ? x.suieCorreo || '' : '', x ? x.nombres.join(', ') : ''].map(seguro_);
  });
  if (seg.getLastRow() > 1) seg.getRange(2, 1, seg.getLastRow() - 1, HOJAS['Seguimiento por área'].length).clearContent().setBackground(null);
  seg.getRange(2, 1, filas.length, filas[0].length).setValues(filas);
  seg.getRange(2, 5, filas.length, 1).setBackgrounds(filas.map(function (f) { return [f[4] === 'Sí' ? '#d9efe0' : '#fbe3e1']; })).setFontWeight('bold');

  var conArea = Object.keys(porArea).filter(function (id) { return AREAS.some(function (a) { return a[0] === id; }); }).length;
  var personas = {}, deps = {}, enviados = 0, verificados = 0, sinArea = 0, ultima = null;
  desc.forEach(function (r) {
    var c = String(r['Correo'] || '').toLowerCase();
    if (c) personas[c] = 1;
    if (r['Código dependencia'] !== '') deps[String(r['Código dependencia'])] = 1;
    if (r['Correo enviado'] === 'Sí') enviados++;
    if (r['Verificado en directorio'] === 'Sí' && r['Descarga repetida'] !== 'Sí') verificados++;
    if (!r['Id área']) sinArea++;
    if (r['Fecha y hora'] instanceof Date && (!ultima || r['Fecha y hora'] > ultima)) ultima = r['Fecha y hora'];
  });
  var ingresos = {}, asistentes = {};
  lect.forEach(function (r) {
    if (r['Resultado'] !== 'Ingreso') return;
    var dia = String(r['Día'] || 'Sin día');
    ingresos[dia] = (ingresos[dia] || 0) + 1;
    asistentes[String(r['Pase'] || r['Correo del participante'])] = 1;
  });
  var tabla = [
    ['Indicador', 'Valor'],
    ['Actualizado', new Date()],
    ['Áreas funcionales que ya descargaron la plantilla', conArea + ' de ' + AREAS.length],
    ['Áreas funcionales pendientes de descargar', AREAS.length - conArea],
    ['Dependencias con al menos una descarga', Object.keys(deps).length],
    ['Personas que descargaron (correos distintos)', Object.keys(personas).length],
    ['Descargas totales, incluidas las repetidas', desc.length],
    ['Registros verificados en el directorio', verificados],
    ['Descargas sin área funcional elegida', sinArea],
    ['Pases enviados por correo', enviados],
    ['Última descarga', ultima || 'Sin descargas'],
    ['Personas que ingresaron a la jornada', Object.keys(asistentes).length]
  ];
  ['1', '2', '3'].concat(Object.keys(ingresos).filter(function (k) { return ['1', '2', '3'].indexOf(k) < 0; })).forEach(function (k) {
    tabla.push([/^\d+$/.test(k) ? 'Ingresos registrados el día ' + k : 'Ingresos registrados: ' + k, ingresos[k] || 0]);
  });
  var res = hoja_('Resumen');
  res.clear();
  res.getRange(1, 1).setValue('Jornada de Planeación Institucional 2027: registro de descargas y asistencia').setFontWeight('bold').setFontSize(13).setFontColor(VERDE);
  res.getRange(3, 1, tabla.length, 2).setValues(tabla).setVerticalAlignment('middle');
  res.getRange(3, 1, 1, 2).setFontWeight('bold').setBackground(VERDE).setFontColor('#ffffff');
  res.getRange(4, 2).setNumberFormat('dd/mm/yyyy hh:mm:ss am/pm');
  res.getRange(13, 2).setNumberFormat('dd/mm/yyyy hh:mm:ss am/pm');
  res.getRange(4, 2, tabla.length - 1, 1).setHorizontalAlignment('left').setFontWeight('bold');
  res.setColumnWidth(1, 360);
  res.setColumnWidth(2, 210);
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

// Para el panel: textos, con las fechas en formato fijo aunque la hoja cambie de formato.
function filas_(nombre) {
  return objetos_(nombre).map(function (r) {
    var o = {};
    Object.keys(r).forEach(function (k) { o[k] = r[k] instanceof Date ? Utilities.formatDate(r[k], ZONA, 'yyyy-MM-dd HH:mm:ss') : String(r[k]); });
    return o;
  });
}

function doGet(e) {
  var p = e.parameter || {};
  if (p.accion === 'ping') return json_({ ok: true, hora: Utilities.formatDate(new Date(), ZONA, 'yyyy-MM-dd HH:mm:ss'), modo: modo_() });
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
