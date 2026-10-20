/*
 * validacion.js — Esquema de la plantilla y validación de la formulación cargada.
 * Es una función pura (no toca el DOM): recibe el libro ya leído como matrices de celdas y devuelve
 * hallazgos en lenguaje llano (hoja, fila y qué corregir), los datos normalizados y un resumen.
 * La plantilla Excel (lib/excel.js) usa este mismo esquema, así encabezados y reglas nunca se desalinean.
 */
import { normalizar, aNumero } from './formato.js';
import { leerTrimestre, leerFechaExcel, caminoContratacion, hoyISO, fechaCorta } from './fechas.js';

export const HOJAS = {
  instructivo: 'Instructivo',
  acciones: 'Acciones',
  necesidades: 'Necesidades',
  adquisiciones: 'Adquisiciones',
  listas: 'Listas'
};

// Columnas por hoja. "lista" es el nombre definido en la hoja Listas que alimenta la validación de datos.
export const ESQUEMA = {
  Acciones: [
    { clave: 'codigo', titulo: 'Código de acción', ancho: 15, obligatoria: true, ayuda: 'Código único, por ejemplo A-01' },
    { clave: 'linea', titulo: 'Línea del Plan de Desarrollo Institucional', ancho: 42, obligatoria: true, lista: 'LST_Lineas', alias: ['linea pdi', 'linea del pdi'] },
    { clave: 'meta', titulo: 'Meta institucional 2027 asociada', ancho: 40, obligatoria: true, lista: 'LST_Metas', alias: ['meta institucional', 'meta 2027'] },
    { clave: 'nombre', titulo: 'Nombre de la acción', ancho: 42, obligatoria: true },
    { clave: 'descripcion', titulo: 'Descripción', ancho: 50, obligatoria: true },
    { clave: 'indicador', titulo: 'Indicador', ancho: 36, obligatoria: true },
    { clave: 'unidad', titulo: 'Unidad de medida', ancho: 18, obligatoria: true },
    { clave: 'metaCuantitativa', titulo: 'Meta cuantitativa', ancho: 14, obligatoria: true, tipo: 'numero' },
    { clave: 'trimInicio', titulo: 'Trimestre de inicio', ancho: 13, obligatoria: true, lista: 'LST_Trimestres' },
    { clave: 'trimCierre', titulo: 'Trimestre de cierre', ancho: 13, obligatoria: true, lista: 'LST_Trimestres' },
    { clave: 'responsable', titulo: 'Responsable', ancho: 30, obligatoria: true },
    { clave: 'evidencia', titulo: 'Evidencia macro comprometida', ancho: 46, obligatoria: true }
  ],
  Necesidades: [
    { clave: 'codigo', titulo: 'Código de necesidad', ancho: 15, obligatoria: true, ayuda: 'Código único, por ejemplo N-01' },
    { clave: 'codigoAccion', titulo: 'Código de acción que la origina', ancho: 18, obligatoria: true, lista: 'LST_CodigosAccion', alias: ['codigo de accion'] },
    { clave: 'tipo', titulo: 'Tipo', ancho: 18, obligatoria: true, lista: 'LST_Tipos', alias: ['tipo de necesidad'] },
    { clave: 'descripcion', titulo: 'Descripción', ancho: 50, obligatoria: true },
    { clave: 'cantidad', titulo: 'Cantidad', ancho: 11, obligatoria: true, tipo: 'numero' },
    { clave: 'valor', titulo: 'Valor estimado', ancho: 18, obligatoria: true, tipo: 'moneda' },
    { clave: 'trimestre', titulo: 'Trimestre requerido', ancho: 13, obligatoria: true, lista: 'LST_Trimestres' },
    { clave: 'justificacion', titulo: 'Justificación', ancho: 50, obligatoria: true }
  ],
  Adquisiciones: [
    { clave: 'codigoNecesidad', titulo: 'Código de necesidad', ancho: 16, obligatoria: true, lista: 'LST_CodigosNecesidad' },
    { clave: 'modalidad', titulo: 'Modalidad de contratación', ancho: 34, obligatoria: true, lista: 'LST_Modalidades', alias: ['modalidad'] },
    { clave: 'valor', titulo: 'Valor', ancho: 18, obligatoria: true, tipo: 'moneda' },
    { clave: 'fechaOperacion', titulo: 'Fecha en que se requiere operando', ancho: 20, obligatoria: true, tipo: 'fecha', alias: ['fecha requerida', 'fecha en que se requiere'] },
    { clave: 'fechaRadicacionExcel', titulo: 'Fecha límite de radicación de estudios previos', ancho: 24, obligatoria: false, tipo: 'formula', alias: ['fecha limite de radicacion'] },
    { clave: 'observaciones', titulo: 'Observaciones', ancho: 44, obligatoria: false }
  ]
};

export const TIPOS_NECESIDAD = [
  { id: 'bien', nombre: 'Bien' },
  { id: 'servicio', nombre: 'Servicio' },
  { id: 'talento', nombre: 'Talento humano' },
  { id: 'infraestructura', nombre: 'Infraestructura' }
];

const vacio = (v) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
const texto = (v) => {
  if (vacio(v)) return '';
  if (v instanceof Date) return leerFechaExcel(v) || '';
  return String(v).trim();
};
const codigoNorm = (v) => texto(v).toUpperCase().replace(/\s+/g, '');

// Busca una hoja por nombre sin importar mayúsculas ni tildes.
export function encontrarHoja(libro, nombre) {
  const objetivo = normalizar(nombre);
  const clave = Object.keys(libro.hojas || {}).find((k) => normalizar(k) === objetivo);
  return clave ? { nombre: clave, filas: libro.hojas[clave] } : null;
}

// Localiza la fila de encabezados (entre las primeras 12) y mapea cada columna del esquema.
function leerTabla(filas, columnas) {
  let mejor = { indice: -1, mapa: {}, aciertos: 0 };
  const limite = Math.min(filas.length, 12);
  for (let i = 0; i < limite; i += 1) {
    const fila = filas[i] || [];
    const mapa = {};
    let aciertos = 0;
    fila.forEach((celda, j) => {
      const n = normalizar(celda);
      if (!n) return;
      const col = columnas.find((c) => mapa[c.clave] === undefined
        && (normalizar(c.titulo) === n || (c.alias || []).some((a) => n === a || n.startsWith(`${a} `))));
      if (col) { mapa[col.clave] = j; aciertos += 1; }
    });
    // Segundo intento: encabezado que empieza igual (por ejemplo con texto de ayuda agregado)
    fila.forEach((celda, j) => {
      const n = normalizar(celda);
      if (!n) return;
      const col = columnas.find((c) => mapa[c.clave] === undefined && n.startsWith(normalizar(c.titulo)));
      if (col && !Object.values(mapa).includes(j)) { mapa[col.clave] = j; aciertos += 1; }
    });
    if (aciertos > mejor.aciertos) mejor = { indice: i, mapa, aciertos };
  }
  if (mejor.aciertos < 2) return { encontrada: false, faltantes: columnas.filter((c) => c.obligatoria), registros: [] };
  const faltantes = columnas.filter((c) => c.obligatoria && mejor.mapa[c.clave] === undefined);
  const registros = [];
  for (let i = mejor.indice + 1; i < filas.length; i += 1) {
    const fila = filas[i] || [];
    const reg = { _fila: i + 1 };
    let conDatos = false;
    columnas.forEach((c) => {
      const j = mejor.mapa[c.clave];
      const v = j === undefined ? null : fila[j];
      reg[c.clave] = v === undefined ? null : v;
      if (c.tipo !== 'formula' && !vacio(v)) conDatos = true;
    });
    if (conDatos) registros.push(reg);
  }
  return { encontrada: true, faltantes, registros, filaEncabezado: mejor.indice + 1 };
}

// Similitud de Dice sobre bigramas: 1 = idénticos.
export function similitud(a, b) {
  const x = normalizar(a).replace(/\s+/g, ' ');
  const y = normalizar(b).replace(/\s+/g, ' ');
  if (!x || !y) return 0;
  if (x === y) return 1;
  const bigramas = (s) => { const m = new Map(); for (let i = 0; i < s.length - 1; i += 1) { const g = s.slice(i, i + 2); m.set(g, (m.get(g) || 0) + 1); } return m; };
  const bx = bigramas(x); const by = bigramas(y);
  let inter = 0;
  bx.forEach((n, g) => { inter += Math.min(n, by.get(g) || 0); });
  return (2 * inter) / (x.length - 1 + y.length - 1);
}

// Reconoce un valor de catálogo escrito como "M1 — Nombre", "M1" o solo el nombre.
function reconocer(valor, catalogo) {
  const n = normalizar(valor);
  if (!n) return null;
  return catalogo.find((item) => {
    const id = normalizar(item.id);
    return n === id || n.startsWith(`${id} `) || n === normalizar(item.nombre) || n.endsWith(` ${normalizar(item.nombre)}`);
  }) || null;
}

export function reconocerTipo(valor) {
  const n = normalizar(valor);
  if (!n) return null;
  if (n.startsWith('bien')) return 'bien';
  if (n.startsWith('servicio')) return 'servicio';
  if (n.includes('talento') || n.includes('humano') || n.includes('personal')) return 'talento';
  if (n.includes('infraestructura') || n.includes('obra')) return 'infraestructura';
  return null;
}

// Lee el código de dependencia escrito en la hoja Instructivo de la plantilla (si existe).
export function leerDependenciaDeLibro(libro) {
  const hoja = encontrarHoja(libro, HOJAS.instructivo);
  if (!hoja) return null;
  for (const fila of hoja.filas.slice(0, 20)) {
    const i = (fila || []).findIndex((c) => normalizar(c).startsWith('dependencia que formula'));
    if (i >= 0) {
      const m = /(\d{3})/.exec(texto(fila[i + 1]));
      return m ? m[1] : null;
    }
  }
  return null;
}

/*
 * Valida la formulación. contexto = { metas, modalidades, calendario, umbrales, dependencia }
 *  - metas: data/metas.json (metasInstitucionales)
 *  - modalidades: data/modalidades.json (modalidades)
 *  - calendario: crearCalendario(festivos)
 */
export function validarFormulacion(libro, contexto) {
  const { metas = [], modalidades = [], calendario = null, umbrales = {}, dependencia = null } = contexto || {};
  const maxAcciones = umbrales.maxAccionesPorDependencia ?? 15;
  const umbralSimilitud = umbrales.similitudNombresAcciones ?? 0.86;
  const hallazgos = [];
  const agregar = (severidad, hoja, fila, titulo, detalle, correccion, regla) => {
    hallazgos.push({ id: `H${hallazgos.length + 1}`, severidad, hoja, fila, titulo, detalle, correccion, regla });
  };
  const lineas = metas.flatMap((m) => (m.lineasPDI || []).map((l) => ({ ...l, metaId: m.id })));

  // 1. Hojas y columnas obligatorias
  const tablas = {};
  for (const nombreHoja of ['Acciones', 'Necesidades', 'Adquisiciones']) {
    const hoja = encontrarHoja(libro, nombreHoja);
    if (!hoja) {
      agregar('bloqueante', nombreHoja, null, `Falta la hoja «${nombreHoja}»`,
        `El archivo no tiene una hoja llamada ${nombreHoja}. Sin ella no se puede revisar la cadena metas → acción → necesidad → adquisición.`,
        'Descargue de nuevo la plantilla del paso 2 y pase allí su información. No cambie el nombre de las hojas.', 'hoja-faltante');
      tablas[nombreHoja] = { encontrada: false, registros: [] };
      continue;
    }
    const t = leerTabla(hoja.filas, ESQUEMA[nombreHoja]);
    tablas[nombreHoja] = t;
    if (t.faltantes.length) {
      agregar('bloqueante', nombreHoja, t.filaEncabezado || 1,
        `Faltan columnas en la hoja ${nombreHoja}`,
        `No se encontraron estas columnas: ${t.faltantes.map((c) => `«${c.titulo}»`).join(', ')}.`,
        'No borre ni cambie el texto de la fila de títulos. Si la modificó, copie de nuevo los encabezados desde la plantilla.', 'columna-faltante');
    }
  }

  // 2. Acciones
  const filasAcc = tablas.Acciones.registros || [];
  const acciones = filasAcc.map((r) => {
    const metaCat = reconocer(r.meta, metas);
    const lineaCat = reconocer(r.linea, lineas);
    return {
      _fila: r._fila,
      codigo: codigoNorm(r.codigo),
      lineaTexto: texto(r.linea),
      lineaId: lineaCat ? lineaCat.id : null,
      metaTexto: texto(r.meta),
      metaId: metaCat ? metaCat.id : (lineaCat ? lineaCat.metaId : null),
      nombre: texto(r.nombre),
      descripcion: texto(r.descripcion),
      indicador: texto(r.indicador),
      unidad: texto(r.unidad),
      metaCuantitativaTexto: texto(r.metaCuantitativa),
      metaCuantitativa: aNumero(r.metaCuantitativa),
      trimInicioTexto: texto(r.trimInicio),
      trimInicio: leerTrimestre(r.trimInicio),
      trimCierreTexto: texto(r.trimCierre),
      trimCierre: leerTrimestre(r.trimCierre),
      responsable: texto(r.responsable),
      evidencia: texto(r.evidencia),
      _metaCat: metaCat,
      _lineaCat: lineaCat
    };
  });

  if (tablas.Acciones.encontrada !== false && !tablas.Acciones.faltantes?.length && acciones.length === 0) {
    agregar('bloqueante', 'Acciones', null, 'No hay acciones registradas',
      'La hoja Acciones está vacía. Todo el plan nace de las acciones: sin ellas no puede haber necesidades ni adquisiciones.',
      'Registre al menos una acción, con su meta 2027, su línea del PDI y su indicador.', 'cero-acciones');
  }

  const codigosAcc = new Map();
  acciones.forEach((a) => {
    const f = a._fila;
    if (!a.codigo) {
      agregar('bloqueante', 'Acciones', f, 'Acción sin código',
        `La acción «${a.nombre || 'sin nombre'}» no tiene código, así que ninguna necesidad puede amarrarse a ella.`,
        'Escriba un código único en la columna «Código de acción», por ejemplo A-01.', 'codigo-accion');
    } else if (codigosAcc.has(a.codigo)) {
      agregar('bloqueante', 'Acciones', f, `Código de acción repetido: ${a.codigo}`,
        `El código ${a.codigo} ya se usó en la fila ${codigosAcc.get(a.codigo)}. Las necesidades no sabrían a cuál de las dos acciones pertenecen.`,
        'Dé a cada acción un código distinto (A-01, A-02, …).', 'codigo-accion');
    } else codigosAcc.set(a.codigo, f);

    if (!a.metaTexto) {
      agregar('bloqueante', 'Acciones', f, 'Acción sin meta institucional 2027',
        `La acción ${a.codigo || ''} «${a.nombre}» no dice a qué meta 2027 aporta.`.replace('  ', ' '),
        'Elija la meta en la lista desplegable de la columna «Meta institucional 2027 asociada».', 'sin-meta');
    } else if (!a._metaCat) {
      agregar('advertencia', 'Acciones', f, 'Meta 2027 no reconocida',
        `«${a.metaTexto}» no coincide con ninguna meta del catálogo institucional.`,
        'Use la lista desplegable para que la acción aparezca en la cascada de metas.', 'meta-catalogo');
    }
    if (!a.lineaTexto) {
      agregar('bloqueante', 'Acciones', f, 'Acción sin línea del Plan de Desarrollo Institucional',
        `La acción ${a.codigo || ''} «${a.nombre}» no tiene línea del PDI.`.replace('  ', ' '),
        'Elija la línea en la lista desplegable de la columna «Línea del Plan de Desarrollo Institucional».', 'sin-linea');
    } else if (!a._lineaCat) {
      agregar('advertencia', 'Acciones', f, 'Línea del PDI no reconocida',
        `«${a.lineaTexto}» no coincide con ninguna línea del catálogo.`,
        'Use la lista desplegable de la columna de línea.', 'linea-catalogo');
    } else if (a._metaCat && a._lineaCat.metaId !== a._metaCat.id) {
      agregar('advertencia', 'Acciones', f, 'La línea no pertenece a la meta elegida',
        `La línea ${a._lineaCat.id} pertenece a la meta ${a._lineaCat.metaId}, pero la acción dice meta ${a._metaCat.id}.`,
        'Revise que meta y línea correspondan. En la pestaña Metas 2027 puede ver qué líneas tiene cada meta.', 'linea-meta');
    }

    // Indicador completo
    if (!a.indicador) {
      agregar('bloqueante', 'Acciones', f, 'Acción sin indicador',
        `La acción ${a.codigo || ''} no tiene indicador, así que no hay cómo medir su cumplimiento.`.replace('  ', ' '),
        'Escriba el indicador, su unidad de medida y la meta cuantitativa.', 'indicador');
    } else {
      const faltan = [];
      if (!a.unidad) faltan.push('unidad de medida');
      if (!a.metaCuantitativaTexto) faltan.push('meta cuantitativa');
      if (faltan.length) {
        agregar('bloqueante', 'Acciones', f, `Indicador sin ${faltan.join(' ni ')}`,
          `El indicador «${a.indicador}» no tiene ${faltan.join(' ni ')}.`,
          'Complete la unidad (por ejemplo «informe», «porcentaje», «estudiantes») y la meta en número.', 'indicador');
      } else if (a.metaCuantitativa === null) {
        agregar('bloqueante', 'Acciones', f, 'La meta cuantitativa no es un número',
          `En «Meta cuantitativa» dice «${a.metaCuantitativaTexto}».`,
          'Escriba solo el número (por ejemplo 4 o 85). La unidad va en «Unidad de medida».', 'indicador');
      }
    }

    // Trimestres
    if (a.trimInicioTexto && a.trimInicio === null) {
      agregar('advertencia', 'Acciones', f, 'Trimestre de inicio no reconocido', `«${a.trimInicioTexto}» no es un trimestre.`, 'Use T1, T2, T3 o T4.', 'trimestre');
    }
    if (a.trimCierreTexto && a.trimCierre === null) {
      agregar('advertencia', 'Acciones', f, 'Trimestre de cierre no reconocido', `«${a.trimCierreTexto}» no es un trimestre.`, 'Use T1, T2, T3 o T4.', 'trimestre');
    }
    if (a.trimInicio && a.trimCierre && a.trimCierre < a.trimInicio) {
      agregar('bloqueante', 'Acciones', f, 'La acción termina antes de empezar',
        `Inicia en T${a.trimInicio} pero cierra en T${a.trimCierre}.`,
        'Corrija los trimestres: el de cierre debe ser igual o posterior al de inicio.', 'trimestres-orden');
    }
    if (!a.evidencia) {
      agregar('advertencia', 'Acciones', f, 'Acción sin evidencia macro comprometida',
        `La acción ${a.codigo || ''} no dice con qué informe macro demostrará su cumplimiento.`.replace('  ', ' '),
        'En 2027 la evidencia se consolida en informes macro de peso y valor. Describa el informe que recogerá el cumplimiento.', 'evidencia');
    }
    const otrosVacios = [['nombre', 'Nombre de la acción'], ['descripcion', 'Descripción'], ['responsable', 'Responsable'], ['trimInicioTexto', 'Trimestre de inicio'], ['trimCierreTexto', 'Trimestre de cierre']]
      .filter(([k]) => !a[k]).map(([, t]) => t);
    if (otrosVacios.length) {
      agregar('advertencia', 'Acciones', f, 'Campos sin diligenciar', `Faltan: ${otrosVacios.join(', ')}.`, 'Complete los campos para que la acción se entienda sola.', 'vacios');
    }
  });

  if (acciones.length > maxAcciones) {
    agregar('advertencia', 'Acciones', null, `Hay ${acciones.length} acciones: señal de atomización`,
      `El tope sugerido es ${maxAcciones} acciones por dependencia. Muchas acciones pequeñas dispersan la trazabilidad y multiplican el reporte.`,
      'Agrupe las acciones que apuntan al mismo resultado en una sola acción con un informe macro como evidencia.', 'atomizacion');
  }

  // Nombres repetidos o casi idénticos: un hallazgo por grupo, anclado en la primera acción del grupo
  const asignadas = new Set();
  for (let i = 0; i < acciones.length; i += 1) {
    if (asignadas.has(i) || !acciones[i].nombre) continue;
    const grupo = [];
    let identico = true;
    for (let j = i + 1; j < acciones.length; j += 1) {
      if (asignadas.has(j) || !acciones[j].nombre) continue;
      const s = similitud(acciones[i].nombre, acciones[j].nombre);
      if (s >= umbralSimilitud) { grupo.push(j); asignadas.add(j); if (s < 1) identico = false; }
    }
    if (!grupo.length) continue;
    const filas = grupo.map((j) => acciones[j]._fila);
    agregar('advertencia', 'Acciones', acciones[i]._fila,
      identico ? 'Nombre de acción repetido' : (grupo.length > 1 ? `${grupo.length + 1} acciones con nombres casi idénticos` : 'Nombre de acción casi idéntico a otro'),
      `«${acciones[i].nombre}» (fila ${acciones[i]._fila}) se ${identico ? 'repite' : 'parece mucho a'} ${filas.length === 1 ? `la acción de la fila ${filas[0]}` : `las acciones de las filas ${filas.join(', ')}`}.`,
      'Si son la misma acción, únalas en una sola con un informe macro como evidencia. Si son distintas, use nombres que muestren la diferencia.', 'duplicado');
  }

  // 3. Necesidades
  const necesidades = (tablas.Necesidades.registros || []).map((r) => ({
    _fila: r._fila,
    codigo: codigoNorm(r.codigo),
    codigoAccion: codigoNorm(r.codigoAccion),
    tipo: reconocerTipo(r.tipo),
    tipoTexto: texto(r.tipo),
    descripcion: texto(r.descripcion),
    cantidad: aNumero(r.cantidad),
    valor: aNumero(r.valor),
    trimestreTexto: texto(r.trimestre),
    trimestre: leerTrimestre(r.trimestre),
    justificacion: texto(r.justificacion)
  }));
  const codigosNec = new Map();
  necesidades.forEach((n) => {
    const f = n._fila;
    n.accionExiste = Boolean(n.codigoAccion && codigosAcc.has(n.codigoAccion));
    if (!n.codigo) {
      agregar('bloqueante', 'Necesidades', f, 'Necesidad sin código',
        `La necesidad «${n.descripcion || 'sin descripción'}» no tiene código, así que no puede pasar al plan de adquisiciones.`,
        'Escriba un código único en «Código de necesidad», por ejemplo N-01.', 'codigo-necesidad');
    } else if (codigosNec.has(n.codigo)) {
      agregar('bloqueante', 'Necesidades', f, `Código de necesidad repetido: ${n.codigo}`,
        `El código ${n.codigo} ya se usó en la fila ${codigosNec.get(n.codigo)}.`,
        'Dé a cada necesidad un código distinto (N-01, N-02, …).', 'codigo-necesidad');
    } else codigosNec.set(n.codigo, f);

    if (!n.codigoAccion) {
      agregar('bloqueante', 'Necesidades', f, 'Necesidad sin acción que la origine',
        `La necesidad ${n.codigo || ''} no dice qué acción la origina. Una necesidad sin acción no tiene razón de ser en el plan.`.replace('  ', ' '),
        'En «Código de acción que la origina» elija el código de una acción de la hoja Acciones.', 'necesidad-sin-accion');
    } else if (!n.accionExiste) {
      agregar('bloqueante', 'Necesidades', f, 'La necesidad apunta a una acción que no existe',
        `La necesidad ${n.codigo || ''} dice que la origina la acción ${n.codigoAccion}, pero en la hoja Acciones no hay ninguna acción con ese código.`.replace('  ', ' '),
        `Corrija el código (los que existen son: ${Array.from(codigosAcc.keys()).slice(0, 8).join(', ') || 'ninguno'}${codigosAcc.size > 8 ? ', …' : ''}) o cree primero la acción.`, 'necesidad-sin-accion');
    }
    if (n.valor === null || n.valor === 0) {
      agregar('advertencia', 'Necesidades', f, 'Necesidad sin valor estimado',
        `La necesidad ${n.codigo || ''} tiene el valor estimado ${n.valor === 0 ? 'en cero' : 'vacío'}.`.replace('  ', ' '),
        'Estime el valor en pesos, aunque sea aproximado. Sin valor no entra bien al consolidado.', 'valor-cero');
    }
    if (n.tipoTexto && !n.tipo) {
      agregar('advertencia', 'Necesidades', f, 'Tipo de necesidad no reconocido', `«${n.tipoTexto}» no es un tipo válido.`, 'Use: bien, servicio, talento humano o infraestructura.', 'tipo');
    }
    if (n.trimestreTexto && !n.trimestre) {
      agregar('advertencia', 'Necesidades', f, 'Trimestre requerido no reconocido', `«${n.trimestreTexto}» no es un trimestre.`, 'Use T1, T2, T3 o T4.', 'trimestre');
    }
    const otros = [['tipoTexto', 'Tipo'], ['descripcion', 'Descripción'], ['trimestreTexto', 'Trimestre requerido'], ['justificacion', 'Justificación']].filter(([k]) => !n[k]).map(([, t]) => t);
    if (n.cantidad === null) otros.push('Cantidad');
    if (otros.length) agregar('advertencia', 'Necesidades', f, 'Campos sin diligenciar', `Faltan: ${otros.join(', ')}.`, 'Complete los campos de la necesidad.', 'vacios');
  });

  // 4. Adquisiciones
  const hoy = hoyISO();
  const adquisiciones = (tablas.Adquisiciones.registros || []).map((r) => {
    const mod = reconocer(r.modalidad, modalidades);
    return {
      _fila: r._fila,
      codigoNecesidad: codigoNorm(r.codigoNecesidad),
      modalidadTexto: texto(r.modalidad),
      modalidadId: mod ? mod.id : null,
      _mod: mod,
      valor: aNumero(r.valor),
      fechaOperacionTexto: texto(r.fechaOperacion),
      fechaOperacion: leerFechaExcel(r.fechaOperacion),
      observaciones: texto(r.observaciones)
    };
  });
  adquisiciones.forEach((a) => {
    const f = a._fila;
    a.necesidadExiste = Boolean(a.codigoNecesidad && codigosNec.has(a.codigoNecesidad));
    if (!a.codigoNecesidad) {
      agregar('bloqueante', 'Adquisiciones', f, 'Adquisición sin necesidad',
        'Esta adquisición no dice a qué necesidad responde. No se puede comprar algo que no nace de una necesidad del plan.',
        'Elija en «Código de necesidad» un código de la hoja Necesidades.', 'adquisicion-sin-necesidad');
    } else if (!a.necesidadExiste) {
      agregar('bloqueante', 'Adquisiciones', f, 'La adquisición apunta a una necesidad que no existe',
        `El código ${a.codigoNecesidad} no está en la hoja Necesidades.`,
        `Corrija el código (los que existen son: ${Array.from(codigosNec.keys()).slice(0, 8).join(', ') || 'ninguno'}${codigosNec.size > 8 ? ', …' : ''}) o registre primero la necesidad.`, 'adquisicion-sin-necesidad');
    }
    if (a.modalidadTexto && !a._mod) {
      agregar('advertencia', 'Adquisiciones', f, 'Modalidad de contratación no reconocida', `«${a.modalidadTexto}» no está en la lista de modalidades.`, 'Elija la modalidad en la lista desplegable para calcular la fecha de radicación.', 'modalidad');
    }
    if (!a.modalidadTexto) agregar('advertencia', 'Adquisiciones', f, 'Adquisición sin modalidad', 'Sin modalidad no se puede calcular la fecha límite de radicación.', 'Elija la modalidad de contratación.', 'modalidad');
    if (a.fechaOperacionTexto && !a.fechaOperacion) {
      agregar('advertencia', 'Adquisiciones', f, 'Fecha no reconocida', `«${a.fechaOperacionTexto}» no es una fecha válida.`, 'Escriba la fecha como dd/mm/aaaa.', 'fecha');
    }
    if (!a.fechaOperacionTexto) agregar('advertencia', 'Adquisiciones', f, 'Adquisición sin fecha de operación', 'Falta la fecha en que se requiere el bien o servicio operando.', 'Escriba la fecha (dd/mm/aaaa) para calcular cuándo radicar.', 'fecha');
    if (a.valor === null || a.valor === 0) agregar('advertencia', 'Adquisiciones', f, 'Adquisición sin valor', 'El valor está vacío o en cero.', 'Escriba el valor estimado de la compra.', 'valor-cero');
    if (a._mod && a.fechaOperacion && calendario) {
      const camino = caminoContratacion(calendario, a._mod, a.fechaOperacion);
      a.fechaRadicacion = camino.radicacion;
      a.totalHabiles = camino.totalHabiles;
      if (camino.radicacion < hoy) {
        agregar('advertencia', 'Adquisiciones', f, 'Fecha de operación no alcanzable',
          `Por ${a._mod.nombre} se debía radicar a más tardar el ${fechaCorta(camino.radicacion)}, fecha que ya pasó.`,
          'Mueva la fecha de operación o revise la modalidad con el calculador de la pestaña Plan de adquisiciones.', 'no-alcanzable');
      }
    }
  });

  // 5. Dependencia de la plantilla
  const depLibro = leerDependenciaDeLibro(libro);
  if (dependencia && depLibro && depLibro !== dependencia) {
    agregar('advertencia', 'Instructivo', null, 'La plantilla es de otra dependencia',
      `El archivo se generó para la dependencia ${depLibro}, pero usted se identificó con la dependencia ${dependencia}.`,
      'Confirme que cargó el archivo correcto. La formulación quedará a nombre de la dependencia con la que se identificó.', 'dependencia');
  }

  // Limpieza de campos internos
  acciones.forEach((a) => { delete a._metaCat; delete a._lineaCat; });
  adquisiciones.forEach((a) => { delete a._mod; });

  const bloqueantes = hallazgos.filter((h) => h.severidad === 'bloqueante').length;
  const advertencias = hallazgos.length - bloqueantes;
  return {
    hallazgos: hallazgos.sort((a, b) => (a.severidad === b.severidad ? 0 : a.severidad === 'bloqueante' ? -1 : 1)),
    acciones,
    necesidades,
    adquisiciones,
    dependenciaLibro: depLibro,
    resumen: resumir(acciones, necesidades, adquisiciones, bloqueantes, advertencias)
  };
}

export function resumir(acciones, necesidades, adquisiciones, bloqueantes = 0, advertencias = 0) {
  const porTrimestre = [1, 2, 3, 4].map((t) => ({
    t,
    acciones: acciones.filter((a) => a.trimInicio === t).length,
    necesidades: necesidades.filter((n) => n.trimestre === t).length,
    valorNecesidades: necesidades.filter((n) => n.trimestre === t).reduce((s, n) => s + (n.valor || 0), 0)
  }));
  return {
    acciones: acciones.length,
    necesidades: necesidades.length,
    adquisiciones: adquisiciones.length,
    valorNecesidades: necesidades.reduce((s, n) => s + (n.valor || 0), 0),
    valorAdquisiciones: adquisiciones.reduce((s, a) => s + (a.valor || 0), 0),
    porTrimestre,
    bloqueantes,
    advertencias
  };
}
