/*
 * config.js — Banderas de funcionalidad, rutas de datos y paleta.
 * La conexión con Microsoft 365 (SharePoint, lista de registro y correo) se configura en data/config.json → microsoft,
 * para que TIC pueda activarla sin tocar el código.
 */

// Banderas de funcionalidad. Con mapaRiesgos en true aparece la pestaña del mapa de riesgos.
export const FEATURES = { mapaRiesgos: false };

// Prefijo de las claves de localStorage (respaldo de sesión en este navegador).
export const PREFIJO_LOCAL = 'etitc-jp27';

// Archivos de datos que se cargan al inicio (todos en /data).
export const ARCHIVOS_DATOS = {
  config: 'data/config.json',
  directorio: 'data/directorio.json',
  dependencias: 'data/dependencias.json',
  areas: 'data/areas.json',
  agenda: 'data/agenda.json',
  modalidades: 'data/modalidades.json',
  contratacion: 'data/contratacion.json',
  festivos: 'data/festivos.json',
  riesgos: 'data/riesgos.json'
};

// Paleta: lee los tokens CSS en tiempo de ejecución para que las gráficas sigan el tema activo.
export const PALETA = {
  leer(nombre, respaldo) {
    try {
      const v = getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
      return v || respaldo;
    } catch { return respaldo; }
  },
  categorica() {
    return ['--cat-1', '--cat-2', '--cat-3', '--cat-4'].map((v, i) => this.leer(v, ['#188b58', '#3f6fb0', '#c08a1e', '#b85a7a'][i]));
  }
};

// Nombres legibles de los tipos de proceso del mapa institucional.
export const TIPOS_PROCESO = {
  estrategico: 'Estratégico',
  misional: 'Misional',
  apoyo: 'De apoyo',
  evaluacion: 'De evaluación'
};

export const TIPOS_PROCESO_PLURAL = {
  estrategico: 'Procesos estratégicos',
  misional: 'Procesos misionales',
  apoyo: 'Procesos de apoyo',
  evaluacion: 'Procesos de evaluación'
};
