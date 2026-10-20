/*
 * export.js — Descargas y exportaciones: archivos, portapapeles, logo institucional,
 * captura de elementos a PNG/PDF (html2canvas + jsPDF), agenda en PDF y calendario .ics para Outlook.
 */
import { fechaLarga, horaLegible, hoyISO } from './fechas.js';

export function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function descargarTexto(texto, nombre, mime = 'text/plain;charset=utf-8') {
  descargarBlob(new Blob([texto], { type: mime }), nombre);
}

export async function copiarTexto(texto) {
  try {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(texto); return true; }
  } catch { /* se intenta el método alterno */ }
  const ta = document.createElement('textarea');
  ta.value = texto;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  ta.remove();
  return ok;
}

// Logo como bytes (para Excel) y data URL (para PDF, canvas y pase). En file:// se usa la copia empaquetada.
let logoCache = null;
export async function obtenerLogo() {
  if (logoCache) return logoCache;
  const empaquetado = window.__ETITC_DATOS__ && window.__ETITC_DATOS__.__logo;
  try {
    if (location.protocol === 'file:' && empaquetado) throw new Error('usar empaquetado');
    const r = await fetch('assets/logo-etitc.png', { cache: 'force-cache' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const bytes = new Uint8Array(await r.arrayBuffer());
    logoCache = { bytes, dataUrl: `data:image/png;base64,${aBase64(bytes)}` };
  } catch {
    if (empaquetado) {
      const bin = atob(empaquetado);
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      logoCache = { bytes, dataUrl: `data:image/png;base64,${empaquetado}` };
    } else {
      logoCache = { bytes: null, dataUrl: null };
    }
  }
  return logoCache;
}

function aBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export function pdfDisponible() { return Boolean(window.jspdf && window.jspdf.jsPDF); }
export function capturaDisponible() { return Boolean(window.html2canvas); }

export async function capturarElemento(el, escala = 3, fondo = null) {
  if (!capturaDisponible()) throw new Error('La librería html2canvas no cargó: no es posible generar la imagen.');
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  return window.html2canvas(el, { scale: escala, backgroundColor: fondo, useCORS: true, logging: false });
}

export async function elementoAPng(el, nombre) {
  const canvas = await capturarElemento(el);
  await new Promise((resolver, rechazar) => canvas.toBlob((b) => {
    if (!b) { rechazar(new Error('No se pudo crear la imagen.')); return; }
    descargarBlob(b, nombre); resolver();
  }, 'image/png'));
}

export async function elementoAPdf(el, nombre) {
  if (!pdfDisponible()) throw new Error('La librería jsPDF no cargó: no es posible generar el PDF.');
  // Fondo blanco y JPEG: el PDF queda liviano para adjuntar por correo
  const canvas = await capturarElemento(el, 2.5, '#ffffff');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'portrait', compress: true });
  const anchoPag = doc.internal.pageSize.getWidth();
  const altoPag = doc.internal.pageSize.getHeight();
  const margen = 12;
  const proporcion = canvas.height / canvas.width;
  let ancho = anchoPag - margen * 2;
  let alto = ancho * proporcion;
  if (alto > altoPag - margen * 2) { alto = altoPag - margen * 2; ancho = alto / proporcion; }
  doc.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', (anchoPag - ancho) / 2, (altoPag - alto) / 2, ancho, alto);
  doc.setProperties({ title: 'Pase de acceso — Jornada de Planeación 2027', author: 'ETITC — OAPDI' });
  doc.save(nombre);
}

// ───────── Agenda en PDF (texto nativo, nítido y liviano) ─────────
export async function agendaAPdf({ agenda, bloques, filtroTexto = '', nombre = 'Agenda_JP2027.pdf', etiquetaModalidad }) {
  if (!pdfDisponible()) throw new Error('La librería jsPDF no cargó: no es posible generar el PDF.');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const logo = await obtenerLogo();
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 16;
  const verde9 = [11, 77, 59]; const verde7 = [24, 139, 88]; const tinta = [19, 51, 42]; const gris = [109, 132, 124]; const linea = [215, 228, 220];
  let y = M;

  const encabezado = () => {
    doc.setFillColor(...verde9);
    doc.rect(0, 0, W, 4, 'F');
    if (logo.dataUrl) doc.addImage(logo.dataUrl, 'PNG', M, 9, 30, 30 * (383 / 522));
    doc.setTextColor(...tinta); doc.setFont('helvetica', 'bold'); doc.setFontSize(17);
    doc.text('Jornada de Planeación 2027', M + 36, 17);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...gris);
    doc.text('Oficina Asesora de Planeación y Desarrollo Institucional · ETITC', M + 36, 23);
    const ancho = W - M - (M + 36);
    const ajustar = (t) => { const l = doc.splitTextToSize(t, ancho); return l.length > 1 ? `${l[0].replace(/\s+\S*$/, '')}…` : l[0]; };
    doc.text(ajustar(`${fechaLarga(agenda.fecha)} · ${agenda.sede || ''}`), M + 36, 28.5);
    if (filtroTexto) doc.text(ajustar(`Bloques para: ${filtroTexto}`), M + 36, 34);
    if (agenda.provisional) {
      doc.setFillColor(255, 244, 220); doc.setDrawColor(138, 90, 0);
      doc.roundedRect(W - M - 36, 10, 36, 8, 2, 2, 'FD');
      doc.setTextColor(138, 90, 0); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
      doc.text('PROVISIONAL', W - M - 18, 15.4, { align: 'center' });
    }
    y = 46;
    doc.setDrawColor(...linea); doc.line(M, y - 4, W - M, y - 4);
  };
  const pie = (n) => {
    doc.setFontSize(8); doc.setTextColor(...gris); doc.setFont('helvetica', 'normal');
    doc.text(`Generado el ${fechaLarga(hoyISO())}, ${horaLegible()}`, M, H - 8);
    doc.text(`Página ${n}`, W - M, H - 8, { align: 'right' });
  };

  let pagina = 1;
  encabezado();
  bloques.forEach((b) => {
    const anchoTexto = W - M * 2 - 34;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5);
    const titulo = doc.splitTextToSize(b.titulo, anchoTexto);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    const lineas = [];
    if (b.modulador) lineas.push(...doc.splitTextToSize(`Modula: ${b.modulador}${b.cargo ? ` — ${b.cargo}` : ''}`, anchoTexto));
    lineas.push(...doc.splitTextToSize(`Modalidad: ${etiquetaModalidad(b)}${b.sala ? ` · ${b.sala}` : ''}`, anchoTexto));
    if (b.entregable) lineas.push(...doc.splitTextToSize(`Entregable: ${b.entregable}`, anchoTexto));
    if (b.insumo) lineas.push(...doc.splitTextToSize(`Insumo: ${b.insumo}`, anchoTexto));
    lineas.push(...doc.splitTextToSize(`Convocadas: ${b.convocadasTexto}`, anchoTexto));
    const alto = 6 + titulo.length * 5.4 + lineas.length * 4.3 + 4;
    if (y + alto > H - 16) { pie(pagina); doc.addPage(); pagina += 1; encabezado(); }
    doc.setFillColor(...(b.modalidad === 'plenaria' ? verde9 : verde7));
    doc.roundedRect(M, y, 2.2, alto - 4, 1, 1, 'F');
    doc.setTextColor(...tinta); doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text(b.inicio, M + 6, y + 5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...gris);
    doc.text(b.fin, M + 6, y + 10);
    doc.setTextColor(...tinta); doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5);
    doc.text(titulo, M + 30, y + 5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(61, 89, 80);
    doc.text(lineas, M + 30, y + 5 + titulo.length * 5.4);
    y += alto;
    doc.setDrawColor(...linea); doc.line(M + 30, y - 2, W - M, y - 2);
    y += 2;
  });
  pie(pagina);
  doc.setProperties({ title: 'Agenda — Jornada de Planeación 2027', author: 'ETITC — OAPDI' });
  doc.save(nombre);
}

// ───────── Calendario .ics (Outlook, Google, Apple) ─────────
const escIcs = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

function plegar(linea) {
  // Pliega a 75 octetos según RFC 5545 (cuidando caracteres multibyte)
  const enc = new TextEncoder();
  if (enc.encode(linea).length <= 75) return linea;
  const partes = [];
  let actual = '';
  for (const ch of linea) {
    if (enc.encode(actual + ch).length > (partes.length ? 74 : 75)) { partes.push(actual); actual = ch; } else actual += ch;
  }
  partes.push(actual);
  return partes.join('\r\n ');
}

export function generarICS({ agenda, bloques, convocadasTexto }) {
  const f = String(agenda.fecha || '').replace(/-/g, '');
  const ahora = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const hora = (h) => `${h.replace(':', '')}00`;
  const lineas = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ETITC//Jornada de Planeacion 2027//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:Jornada de Planeación 2027', 'X-WR-TIMEZONE:America/Bogota',
    'BEGIN:VTIMEZONE', 'TZID:America/Bogota', 'BEGIN:STANDARD', 'DTSTART:19700101T000000', 'TZOFFSETFROM:-0500', 'TZOFFSETTO:-0500', 'TZNAME:COT', 'END:STANDARD', 'END:VTIMEZONE'
  ];
  bloques.forEach((b) => {
    const desc = [
      b.modulador ? `Modula: ${b.modulador}${b.cargo ? ` (${b.cargo})` : ''}` : '',
      `Modalidad: ${b.modalidad === 'mesa' ? 'Mesa de trabajo' : 'Plenaria'}`,
      b.insumo ? `Traer: ${b.insumo}` : '',
      b.entregable ? `Entregable: ${b.entregable}` : '',
      `Convocadas: ${convocadasTexto(b)}`,
      agenda.provisional ? 'AGENDA PROVISIONAL' : ''
    ].filter(Boolean).join('\n');
    lineas.push(
      'BEGIN:VEVENT',
      `UID:${b.id}-${f}@jornada-planeacion-2027.etitc`,
      `DTSTAMP:${ahora}`,
      `DTSTART;TZID=America/Bogota:${f}T${hora(b.inicio)}`,
      `DTEND;TZID=America/Bogota:${f}T${hora(b.fin)}`,
      `SUMMARY:${escIcs(`JP2027 · ${b.titulo}`)}`,
      `LOCATION:${escIcs([b.sala, agenda.sede].filter(Boolean).join(' — '))}`,
      `DESCRIPTION:${escIcs(desc)}`,
      `CATEGORIES:${b.modalidad === 'mesa' ? 'Mesa de trabajo' : 'Plenaria'}`,
      'STATUS:CONFIRMED', 'TRANSP:OPAQUE',
      'BEGIN:VALARM', 'TRIGGER:-PT10M', 'ACTION:DISPLAY', `DESCRIPTION:${escIcs(b.titulo)}`, 'END:VALARM',
      'END:VEVENT'
    );
  });
  lineas.push('END:VCALENDAR');
  return lineas.map(plegar).join('\r\n') + '\r\n';
}
