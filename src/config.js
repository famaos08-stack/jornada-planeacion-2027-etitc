/*
 * config.js — Banderas de funcionalidad, modo de persistencia, rutas de datos y paleta.
 * Es el único archivo que se edita para encender funciones opcionales o cambiar dónde se guardan los datos.
 */

// Banderas de funcionalidad. Con mapaRiesgos en true la pestaña aparece sin tocar nada más.
export const FEATURES = { mapaRiesgos: false };

// Persistencia: "local" (localStorage, por defecto) | "sharepoint" | "sheets".
// Las dos últimas son esqueletos: ver src/storage.js y la sección "Conectar SharePoint" del README.
export const PERSISTENCIA = {
  modo: 'local',
  prefijoLocal: 'etitc-jp27',
  sharepoint: {
    // TODO(OAPDI): completar al registrar la aplicación en Entra ID (Azure AD).
    tenantId: '',
    clientId: '',
    siteId: '',            // GET https://graph.microsoft.com/v1.0/sites/{host}:/sites/{ruta}
    listas: {
      formulaciones: '',   // id de la lista "JP27_Formulaciones"
      asistencia: '',      // id de la lista "JP27_Asistencia"
      pases: ''            // id de la lista "JP27_Pases"
    }
  },
  sheets: {
    // TODO(OAPDI): URL de la implementación de Apps Script publicada como aplicación web.
    webAppUrl: ''
  }
};

// Archivos de datos que se cargan al inicio (todos en /data).
export const ARCHIVOS_DATOS = {
  config: 'data/config.json',
  directorio: 'data/directorio.json',
  dependencias: 'data/dependencias.json',
  agenda: 'data/agenda.json',
  metas: 'data/metas.json',
  hitos: 'data/hitos.json',
  modalidades: 'data/modalidades.json',
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
  },
  procesos() {
    return {
      estrategico: this.leer('--proc-estrategico', '#188b58'),
      misional: this.leer('--proc-misional', '#3f6fb0'),
      apoyo: this.leer('--proc-apoyo', '#c08a1e'),
      evaluacion: this.leer('--proc-evaluacion', '#b85a7a')
    };
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
