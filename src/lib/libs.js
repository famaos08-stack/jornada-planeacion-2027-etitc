/*
 * libs.js — Verifica qué librerías externas (CDN) cargaron y avisa con claridad qué funciones quedan limitadas.
 * La aplicación nunca depende de que todas carguen: cada función consulta su librería antes de usarla.
 */
import { toast } from '../ui/toast.js';

export const LIBRERIAS = {
  xlsx: { nombre: 'SheetJS (Excel)', presente: () => Boolean(window.XLSX && window.XLSX.utils), afecta: 'validación de las plantillas cargadas y exportación a Excel' },
  qrcode: { nombre: 'qrcode', presente: () => Boolean(window.QRCode && window.QRCode.toDataURL), afecta: 'generación del QR del pase' },
  escaner: { nombre: 'html5-qrcode', presente: () => Boolean(window.Html5Qrcode), afecta: 'lectura de QR con cámara (queda el registro manual)' },
  jspdf: { nombre: 'jsPDF', presente: () => Boolean(window.jspdf && window.jspdf.jsPDF), afecta: 'descarga del cronograma y del pase en PDF' },
  html2canvas: { nombre: 'html2canvas', presente: () => Boolean(window.html2canvas), afecta: 'descarga del pase como imagen' }
};

export function libreriaPresente(clave) { return LIBRERIAS[clave] ? LIBRERIAS[clave].presente() : false; }

// Espera a que terminen de cargar los scripts diferidos (máximo unos segundos).
export function esperarLibrerias(maxMs = 6000) {
  return new Promise((resolver) => {
    const listo = () => Object.values(LIBRERIAS).every((l) => l.presente());
    if (listo() || document.readyState === 'complete') { resolver(); return; }
    const fin = setTimeout(resolver, maxMs);
    window.addEventListener('load', () => { clearTimeout(fin); resolver(); }, { once: true });
  });
}

export function avisarLibreriasFaltantes() {
  const faltantes = Object.values(LIBRERIAS).filter((l) => !l.presente());
  if (!faltantes.length) return [];
  toast({
    tipo: 'warn',
    titulo: faltantes.length === Object.keys(LIBRERIAS).length ? 'Sin conexión a las librerías externas' : 'Algunas funciones quedaron limitadas',
    mensaje: `No cargó: ${faltantes.map((l) => `${l.nombre} (${l.afecta})`).join('; ')}. El resto de la aplicación funciona. Revise la conexión y recargue.`,
    duracion: 12000
  });
  return faltantes;
}
