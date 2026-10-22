/*
 * export.js — Descargas y exportaciones: archivos, portapapeles, logo institucional,
 * captura de elementos a PNG/PDF (html2canvas + jsPDF), agenda en PDF y calendario .ics para Outlook.
 */
import { fechaLarga, fechaCorta, rangoFechasTexto } from './fechas.js';

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

// ───────── Cronograma en PDF (texto nativo, nítido y liviano) ─────────
const TIPO_BLOQUE = { sesion: 'Sesión', taller: 'Taller', receso: 'Receso', llegada: 'Llegada' };

export async function cronogramaAPdf({ agenda, evento, nombre = 'Cronograma_Jornada_Planeacion_2027.pdf' }) {
  if (!pdfDisponible()) throw new Error('La librería jsPDF no cargó: no es posible generar el PDF.');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const logo = await obtenerLogo();
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 15;
  const verde9 = [11, 77, 59]; const verde7 = [24, 139, 88]; const lima = [138, 208, 88]; const tinta = [19, 51, 42];
  const gris = [88, 112, 104]; const linea = [215, 228, 220]; const suave = [238, 244, 239];
  const dias = agenda.dias || [];
  const rangoFechas = rangoFechasTexto(dias.map((d) => d.fecha));
  let y = M;
  let pagina = 1;

  const encabezado = () => {
    doc.setFillColor(...verde9); doc.rect(0, 0, W, 34, 'F');
    doc.setFillColor(...lima); doc.rect(0, 34, W, 1.2, 'F');
    if (logo.dataUrl) { doc.setFillColor(255, 255, 255); doc.roundedRect(M, 6, 30, 22, 3, 3, 'F'); doc.addImage(logo.dataUrl, 'PNG', M + 1.5, 7.2, 27, 27 * (383 / 522)); }
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
    doc.text(agenda.titulo || evento.nombre, M + 36, 14);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(230, 244, 236);
    doc.text(agenda.lema || '', M + 36, 20);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...lima);
    doc.text(`${rangoFechas}${agenda.sede && agenda.sede !== 'Por confirmar' ? ` · ${agenda.sede}` : ''}`, M + 36, 26.5);
    y = 44;
  };
  const pie = () => {
    doc.setFontSize(7.5); doc.setTextColor(...gris); doc.setFont('helvetica', 'normal');
    doc.text(`${evento.oficina} · ${evento.institucion}`, M, H - 8);
    doc.text(`${agenda.nota || ''}`, M, H - 4.5);
    doc.text(`Página ${pagina}`, W - M, H - 8, { align: 'right' });
  };
  const saltoSi = (alto) => { if (y + alto > H - 16) { pie(); doc.addPage(); pagina += 1; encabezado(); } };

  encabezado();
  dias.forEach((dia) => {
    saltoSi(30);
    doc.setFillColor(...suave); doc.roundedRect(M, y, W - 2 * M, 14, 2.5, 2.5, 'F');
    doc.setFillColor(...verde7); doc.roundedRect(M, y, 26, 14, 2.5, 2.5, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text(`Día ${dia.numero}`, M + 13, y + 6.2, { align: 'center' });
    doc.setFontSize(7.5); doc.text(fechaLarga(dia.fecha, { conDia: false }).replace(/ de \d{4}$/, ''), M + 13, y + 10.8, { align: 'center' });
    doc.setTextColor(...tinta); doc.setFontSize(12.5); doc.text(dia.titulo, M + 31, y + 6.4);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...gris);
    doc.text(fechaLarga(dia.fecha), M + 31, y + 11);
    y += 18;
    (dia.bloques || []).forEach((b) => {
      const receso = b.tipo === 'receso' || b.tipo === 'llegada';
      const ancho = W - 2 * M - 64;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(receso ? 9 : 10);
      const titulo = doc.splitTextToSize(b.titulo, ancho);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.3);
      const detalle = !receso && b.detalle && b.detalle !== b.titulo ? doc.splitTextToSize(b.detalle, ancho) : [];
      const alto = Math.max(9, 3 + titulo.length * 4.3 + detalle.length * 3.7 + 2.5);
      saltoSi(alto + 2);
      if (receso) { doc.setFillColor(248, 250, 248); doc.rect(M, y - 1, W - 2 * M, alto, 'F'); }
      doc.setFillColor(...(receso ? linea : b.tipo === 'taller' ? lima : verde7)); doc.rect(M, y - 1, 1.3, alto, 'F');
      doc.setTextColor(...tinta); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
      doc.text(`${b.inicio}–${b.fin}`, M + 4, y + 3.4);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...gris);
      doc.text((TIPO_BLOQUE[b.tipo] || '').toUpperCase(), M + 4, y + 7);
      doc.setTextColor(...(receso ? gris : tinta)); doc.setFont('helvetica', 'bold'); doc.setFontSize(receso ? 9 : 10);
      doc.text(titulo, M + 30, y + 3.4);
      if (detalle.length) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8.3); doc.setTextColor(61, 89, 80); doc.text(detalle, M + 30, y + 3.4 + titulo.length * 4.3); }
      if (!receso) {
        doc.setFontSize(7.8); doc.setTextColor(...gris); doc.setFont('helvetica', 'bold');
        const resp = doc.splitTextToSize(b.responsable || '', 32);
        doc.text(resp, W - M - 32, y + 3.4);
        if (b.apoyo) { doc.setFont('helvetica', 'normal'); doc.text(doc.splitTextToSize(`OAP: ${b.apoyo}`, 32), W - M - 32, y + 3.4 + resp.length * 3.4); }
      }
      y += alto + 1.5;
      doc.setDrawColor(...linea); doc.line(M + 30, y - 1, W - M, y - 1);
    });
    if (dia.resultado) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
      const lineas = doc.splitTextToSize(`Resultado del día: ${dia.resultado}`, W - 2 * M - 8);
      saltoSi(lineas.length * 4 + 6);
      doc.setFillColor(230, 245, 236); doc.roundedRect(M, y, W - 2 * M, lineas.length * 4 + 4, 2, 2, 'F');
      doc.setTextColor(...verde9); doc.text(lineas, M + 4, y + 5);
      y += lineas.length * 4 + 8;
    }
    y += 4;
  });

  // Ruta de planeación (antes, durante, después)
  const ruta = agenda.ruta;
  if (ruta && ruta.fases && ruta.fases.length) {
    saltoSi(40);
    doc.setTextColor(...tinta); doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
    doc.text(ruta.titulo || 'Ruta de planeación', M, y + 4); y += 10;
    ruta.fases.forEach((fase) => {
      saltoSi(14);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...verde7);
      doc.text(fase.titulo.toUpperCase(), M, y + 3); y += 6;
      fase.hitos.forEach((h) => {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.8);
        const act = doc.splitTextToSize(h.actividad, W - 2 * M - 80);
        saltoSi(act.length * 4 + 3);
        doc.setTextColor(...tinta); doc.text(act, M + 4, y + 3);
        doc.setFont('helvetica', 'bold');
        const fechaTxt = h.desde === h.hasta ? fechaCorta(h.hasta) : `${fechaCorta(h.desde).replace(/ \d{4}$/, '')} – ${fechaCorta(h.hasta)}`;
        doc.text(fechaTxt, W - M - 72, y + 3);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(...gris);
        doc.text(doc.splitTextToSize(h.responsable, 38), W - M - 38, y + 3);
        y += act.length * 4 + 2.5;
        doc.setDrawColor(...linea); doc.line(M + 4, y - 0.5, W - M, y - 0.5);
      });
      y += 3;
    });
    if (ruta.resultado) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.8); doc.setTextColor(...verde9);
      saltoSi(8); doc.text(`Resultado: ${ruta.resultado}`, M, y + 4);
    }
  }
  pie();
  doc.setProperties({ title: `Cronograma — ${agenda.titulo || evento.nombre}`, author: `ETITC — ${evento.oficina}` });
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

export function generarICS({ agenda, evento }) {
  const ahora = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const hora = (h) => `${h.replace(':', '')}00`;
  const lineas = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ETITC//Jornada de Planeacion Institucional 2027//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${escIcs(agenda.titulo || evento.nombre)}`, 'X-WR-TIMEZONE:America/Bogota',
    'BEGIN:VTIMEZONE', 'TZID:America/Bogota', 'BEGIN:STANDARD', 'DTSTART:19700101T000000', 'TZOFFSETFROM:-0500', 'TZOFFSETTO:-0500', 'TZNAME:COT', 'END:STANDARD', 'END:VTIMEZONE'
  ];
  (agenda.dias || []).forEach((dia) => {
    const f = dia.fecha.replace(/-/g, '');
    (dia.bloques || []).filter((b) => b.tipo !== 'receso').forEach((b) => {
      const desc = [`Día ${dia.numero}: ${dia.titulo}`, b.detalle, b.responsable ? `Responsable: ${b.responsable}` : '', b.apoyo ? `Acompañamiento de la OAP: ${b.apoyo}` : '', agenda.nota || ''].filter(Boolean).join('\n');
      lineas.push(
        'BEGIN:VEVENT',
        `UID:${b.id}-${f}@jornada-planeacion-2027.etitc`,
        `DTSTAMP:${ahora}`,
        `DTSTART;TZID=America/Bogota:${f}T${hora(b.inicio)}`,
        `DTEND;TZID=America/Bogota:${f}T${hora(b.fin)}`,
        `SUMMARY:${escIcs(`JP2027 · ${b.titulo}`)}`,
        `LOCATION:${escIcs(agenda.sede || '')}`,
        `DESCRIPTION:${escIcs(desc)}`,
        `CATEGORIES:${escIcs(dia.titulo)}`,
        'STATUS:CONFIRMED', 'TRANSP:OPAQUE',
        'BEGIN:VALARM', 'TRIGGER:-PT10M', 'ACTION:DISPLAY', `DESCRIPTION:${escIcs(b.titulo)}`, 'END:VALARM',
        'END:VEVENT'
      );
    });
  });
  lineas.push('END:VCALENDAR');
  return lineas.map(plegar).join('\r\n') + '\r\n';
}
