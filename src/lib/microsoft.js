/*
 * microsoft.js — Conector con Microsoft 365 de la ETITC (sin servidor propio y sin Power Automate Premium).
 * Cada persona inicia sesión con su cuenta @itc.edu.co (MSAL, flujo de redirección para aplicaciones de página única)
 * y la aplicación usa Microsoft Graph con permisos delegados para:
 *   1. guardar el Excel en la biblioteca de documentos del sitio de la Oficina Asesora de Planeación,
 *   2. crear el registro en la lista de SharePoint (dependencia, área, responsable, correos, enlace, resultado),
 *   3. enviar desde Outlook el correo con el pase QR,
 *   4. leer el directorio institucional desde SharePoint, para que no se publique en el sitio web.
 * La configuración vive en data/config.json → microsoft. Ver docs/Guia_instalacion_Microsoft365.
 */

const MSAL_URL = 'https://cdn.jsdelivr.net/npm/@azure/msal-browser@3.28.1/lib/msal-browser.min.js';
const MSAL_SRI = 'sha384-B5PXeUfgiegchZiX5iMRssMrHd9NfPhFnITob1HyW1CY76udptWpBsniaDsH/+BY';
const GRAPH = 'https://graph.microsoft.com/v1.0';
export const ALCANCES = ['User.Read', 'Sites.ReadWrite.All', 'Mail.Send'];

let cfg = null;
let app = null;
let cuenta = null;
let simulado = null; // solo para pruebas automatizadas: window.__JP27_MS_SIMULADO__
const cache = { sitio: null, drive: null, listas: new Map() };

export function configurado(c) { return Boolean(c && c.activo && c.tenantId && c.clientId && c.sitio); }
export function disponible() { return Boolean(cfg && (app || simulado)); }
export function cuentaActiva() { return cuenta; }

function cargarScript(src, integridad) {
  return new Promise((resolver, rechazar) => {
    if (window.msal) { resolver(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.integrity = integridad;
    s.crossOrigin = 'anonymous';
    s.onload = () => resolver();
    s.onerror = () => rechazar(new Error('No cargó la librería de inicio de sesión de Microsoft. Revise la conexión.'));
    document.head.appendChild(s);
  });
}

// Prepara MSAL y procesa el regreso del inicio de sesión. Devuelve la cuenta activa o null.
export async function iniciar(c) {
  cfg = c;
  if (!configurado(c)) return null;
  simulado = window.__JP27_MS_SIMULADO__ || null;
  if (simulado) { cuenta = simulado.cuenta || null; return cuenta; }
  await cargarScript(MSAL_URL, MSAL_SRI);
  app = new window.msal.PublicClientApplication({
    auth: {
      clientId: c.clientId,
      authority: `https://login.microsoftonline.com/${c.tenantId}`,
      redirectUri: `${location.origin}${location.pathname}`,
      navigateToLoginRequestUrl: true
    },
    cache: { cacheLocation: 'sessionStorage', storeAuthStateInCookie: false }
  });
  await app.initialize();
  const respuesta = await app.handleRedirectPromise();
  if (respuesta && respuesta.account) app.setActiveAccount(respuesta.account);
  cuenta = app.getActiveAccount() || app.getAllAccounts()[0] || null;
  if (cuenta) app.setActiveAccount(cuenta);
  return cuenta;
}

export async function iniciarSesion() {
  if (simulado) { cuenta = simulado.cuenta; return cuenta; }
  if (!app) throw new Error('El inicio de sesión con Microsoft no está configurado.');
  // Se guarda la vista actual para volver a ella después de la redirección
  try { sessionStorage.setItem('etitc-jp27:volver', location.hash); } catch { /* opcional */ }
  await app.loginRedirect({ scopes: ALCANCES, prompt: 'select_account' });
  return null;
}

export async function cerrarSesion() {
  if (simulado) { cuenta = null; return; }
  if (app && cuenta) await app.logoutRedirect({ account: cuenta, postLogoutRedirectUri: `${location.origin}${location.pathname}` });
}

async function token() {
  if (simulado) return simulado.token || 'token-simulado';
  if (!app || !cuenta) throw new Error('Inicie sesión con su cuenta institucional de Microsoft 365.');
  try {
    const r = await app.acquireTokenSilent({ scopes: ALCANCES, account: cuenta });
    return r.accessToken;
  } catch (e) {
    if (e && /interaction_required|consent_required|login_required/i.test(`${e.errorCode} ${e.message}`)) {
      await app.acquireTokenRedirect({ scopes: ALCANCES, account: cuenta });
    }
    throw new Error('La sesión de Microsoft expiró. Vuelva a iniciar sesión.');
  }
}

// Traduce los errores de Graph a mensajes que una persona puede resolver.
function errorGraph(status, cuerpo, operacion) {
  const codigo = cuerpo && cuerpo.error ? cuerpo.error.code : '';
  if (status === 401) return new Error('Su sesión de Microsoft no es válida. Cierre sesión y vuelva a ingresar.');
  if (status === 403) return new Error(`Su cuenta no tiene permiso para ${operacion}. La Oficina Asesora de Planeación debe darle acceso de colaboración al sitio de la jornada.`);
  if (status === 404) return new Error(`No se encontró ${operacion.replace(/^(guardar|leer|crear) /, '')} en SharePoint. Revise la configuración (sitio, biblioteca o lista) con TIC.`);
  if (status === 409) return new Error('Ya existe un archivo con ese nombre y no se pudo reemplazar. Intente de nuevo.');
  if (status === 413) return new Error('El archivo es demasiado grande para subirlo.');
  if (status === 429 || status === 503) return new Error('Microsoft 365 está ocupado en este momento. Espere unos segundos e intente de nuevo.');
  if (codigo === 'ErrorAccessDenied' || codigo === 'MailboxNotEnabledForRESTAPI') return new Error('Su buzón no permite enviar correos desde aplicaciones. Descargue su pase desde la pantalla.');
  return new Error(`Microsoft 365 respondió con un error (${status}${codigo ? ` · ${codigo}` : ''}) al ${operacion}.`);
}

async function graph(metodo, ruta, { cuerpo = null, crudo = false, operacion = 'conectarse', encabezados = {} } = {}) {
  const t = await token();
  const opciones = { method: metodo, headers: { Authorization: `Bearer ${t}`, ...encabezados } };
  if (cuerpo !== null) {
    if (cuerpo instanceof Blob || cuerpo instanceof ArrayBuffer) opciones.body = cuerpo;
    else { opciones.body = JSON.stringify(cuerpo); opciones.headers['Content-Type'] = 'application/json'; }
  }
  let r;
  try { r = await fetch(ruta.startsWith('http') ? ruta : `${GRAPH}${ruta}`, opciones); }
  catch { throw new Error('No hay conexión con Microsoft 365. Revise su internet e intente de nuevo.'); }
  if (!r.ok) {
    let detalle = null;
    try { detalle = await r.json(); } catch { /* sin cuerpo */ }
    throw errorGraph(r.status, detalle, operacion);
  }
  if (crudo) return r;
  if (r.status === 202 || r.status === 204) return null;
  return r.json();
}

// ───────── Identidad ─────────
export async function perfil() {
  return graph('GET', '/me?$select=displayName,mail,userPrincipalName,jobTitle,department,officeLocation', { operacion: 'leer su perfil' });
}

// ───────── SharePoint ─────────
async function sitioId() {
  if (cache.sitio) return cache.sitio;
  const s = await graph('GET', `/sites/${cfg.sitio}?$select=id,webUrl`, { operacion: 'leer el sitio de la jornada' });
  cache.sitio = s.id;
  return s.id;
}

async function driveId() {
  if (cache.drive) return cache.drive;
  const sitio = await sitioId();
  const r = await graph('GET', `/sites/${sitio}/drives?$select=id,name`, { operacion: 'leer la biblioteca de documentos' });
  const nombres = [cfg.biblioteca, 'Documentos', 'Documents', 'Documentos compartidos', 'Shared Documents'].filter(Boolean).map((n) => n.toLowerCase());
  const d = (r.value || []).find((x) => nombres.includes(String(x.name).toLowerCase())) || (r.value || [])[0];
  if (!d) throw new Error('El sitio de la jornada no tiene biblioteca de documentos.');
  cache.drive = d.id;
  return d.id;
}

async function listaId(nombre) {
  if (cache.listas.has(nombre)) return cache.listas.get(nombre);
  const sitio = await sitioId();
  const r = await graph('GET', `/sites/${sitio}/lists?$select=id,displayName&$filter=displayName eq '${nombre.replace(/'/g, "''")}'`, { operacion: `leer la lista ${nombre}` });
  const l = (r.value || [])[0];
  if (!l) throw new Error(`No existe la lista «${nombre}» en el sitio de la jornada. TIC debe crearla (ver la guía de instalación).`);
  cache.listas.set(nombre, l.id);
  return l.id;
}

// Nombres válidos para SharePoint: sin " * : < > ? / \ | # % ni puntos o espacios al inicio o al final.
export function nombreSeguro(texto) {
  return String(texto || '').replace(/["*:<>?/\\|#%{}~&]/g, ' ').replace(/\s+/g, ' ').replace(/^[\s.]+|[\s.]+$/g, '').slice(0, 120) || 'archivo';
}
const ruta = (...partes) => partes.map((p) => encodeURIComponent(nombreSeguro(p))).join('/');

export async function subirArchivo(archivo, carpetas, nombre) {
  const drive = await driveId();
  const destino = ruta(cfg.carpetaRaiz, ...carpetas, nombre);
  const item = await graph('PUT', `/drives/${drive}/root:/${destino}:/content?@microsoft.graph.conflictBehavior=rename`, {
    cuerpo: archivo,
    operacion: 'guardar el archivo en SharePoint',
    encabezados: { 'Content-Type': archivo.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
  });
  return { id: item.id, nombre: item.name, enlace: item.webUrl };
}

export async function crearRegistro(nombreLista, campos) {
  const sitio = await sitioId();
  const lista = await listaId(nombreLista);
  const r = await graph('POST', `/sites/${sitio}/lists/${lista}/items`, { cuerpo: { fields: campos }, operacion: `crear el registro en la lista ${nombreLista}` });
  return r;
}

export async function leerRegistros(nombreLista, maximo = 2000) {
  const sitio = await sitioId();
  const lista = await listaId(nombreLista);
  let url = `/sites/${sitio}/lists/${lista}/items?expand=fields&$top=500`;
  const salida = [];
  while (url && salida.length < maximo) {
    const r = await graph('GET', url, { operacion: `leer la lista ${nombreLista}` });
    (r.value || []).forEach((i) => salida.push(i.fields || {}));
    url = r['@odata.nextLink'] || null;
  }
  return salida;
}

// Directorio institucional guardado en SharePoint (no se publica en el sitio web).
export async function leerDirectorio() {
  if (!cfg.rutaDirectorio) return null;
  const drive = await driveId();
  const r = await graph('GET', `/drives/${drive}/root:/${cfg.rutaDirectorio.split('/').map(encodeURIComponent).join('/')}:/content`, { crudo: true, operacion: 'leer el directorio' });
  return r.json();
}

// ───────── Correo ─────────
// adjuntos: [{ nombre, tipo, base64, cid }] — con cid el adjunto se muestra dentro del cuerpo (<img src="cid:...">)
export async function enviarCorreo({ para = [], cc = [], asunto, html, adjuntos = [] }) {
  const destinatarios = (lista) => [...new Set(lista.filter(Boolean).map((c) => c.trim().toLowerCase()))].map((address) => ({ emailAddress: { address } }));
  const mensaje = {
    subject: asunto,
    body: { contentType: 'HTML', content: html },
    toRecipients: destinatarios(para),
    ccRecipients: destinatarios(cc.filter((c) => !para.map((p) => p.toLowerCase()).includes(String(c).toLowerCase()))),
    attachments: adjuntos.map((a) => ({
      '@odata.type': '#microsoft.graph.fileAttachment',
      name: a.nombre,
      contentType: a.tipo,
      contentBytes: a.base64,
      ...(a.cid ? { isInline: true, contentId: a.cid } : {})
    }))
  };
  await graph('POST', '/me/sendMail', { cuerpo: { message: mensaje, saveToSentItems: true }, operacion: 'enviar el correo' });
  return true;
}
