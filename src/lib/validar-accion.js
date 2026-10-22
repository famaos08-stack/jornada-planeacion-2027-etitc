/*
 * validar-accion.js — Validación de la «Plantilla de Formulación 2027» diligenciada por un área funcional.
 * Replica, fila por fila, la «Alerta de consistencia» de la propia plantilla (columna AF de las hojas de eje y
 * columna W de las acciones adicionales del buscador) y agrega revisiones de la cadena lógica:
 *   - todas las metas asignadas al área formuladas (configurable),
 *   - acciones adicionales del área,
 *   - decisión sobre los compromisos pendientes 2026.
 * Es una función pura sobre el libro leído con SheetJS: no toca el DOM y se prueba en Node.
 */
import { hoja, encabezados, filaComoObjeto, vacio, texto, fechaValida } from './libro.js';
import { normalizar } from './formato.js';

const EJES = ['Eje1', 'Eje2', 'Eje3', 'Eje4', 'Eje5', 'Eje6'];

const COLUMNAS_EJE = {
  idAsignacion: 'Id asignación', codigoMeta: 'Código meta', meta: 'Meta estratégica (PDI)', idArea: 'Id área', area: 'Área funcional',
  nombre: 'Nombre de la acción', descripcion: 'Descripción de la acción', producto: 'Producto esperado',
  inicio: 'Fecha de inicio', fin: 'Fecha de fin', responsable: 'Responsable (correo institucional)', indicador: 'Indicador de seguimiento',
  metaAccion: 'Meta 2027 de la acción', unidad: 'Unidad de medida', dimension: 'Dimensión de impacto',
  impacto: 'Indicador de impacto (Guía Metodológica)', retoma: '¿Retoma un compromiso pendiente 2026?', evidencia: 'Evidencia verificable',
  observaciones: 'Observaciones', alerta: 'Alerta de consistencia'
};

const COLUMNAS_ADICIONALES = {
  area: 'Área funcional (lista)', codigoMeta: 'Código de meta PDI (lista)', meta: 'Meta estratégica (PDI)', origen: 'Origen de la acción',
  nombre: 'Nombre de la acción', descripcion: 'Descripción de la acción', producto: 'Producto esperado',
  inicio: 'Fecha de inicio', fin: 'Fecha de fin', responsable: 'Responsable (correo institucional)', indicador: 'Indicador de seguimiento',
  metaAccion: 'Meta 2027 de la acción', unidad: 'Unidad de medida', dimension: 'Dimensión de impacto',
  impacto: 'Indicador de impacto (Guía Metodológica)', retoma: '¿Retoma un compromiso pendiente 2026?', evidencia: 'Evidencia verificable', alerta: 'Alerta de consistencia'
};

const ETIQUETAS = {
  producto: 'Producto esperado', inicio: 'Fecha de inicio', fin: 'Fecha de fin', responsable: 'Responsable', indicador: 'Indicador de seguimiento',
  metaAccion: 'Meta 2027 de la acción', dimension: 'Dimensión de impacto', impacto: 'Indicador de impacto', area: 'Área funcional',
  codigoMeta: 'Código de meta', origen: 'Origen de la acción'
};

// ¿La etiqueta de área del Excel («A05 · Planeación y Plan de Acción (101)») corresponde al área?
export function esDelArea(valorCelda, areaId) {
  const t = texto(valorCelda).toUpperCase();
  return t === areaId || t.startsWith(`${areaId} `) || t.startsWith(`${areaId}·`);
}

// Asignaciones de la hoja oculta Base_OAPDI agrupadas por eje (E1-001 → eje 1), en su orden original.
function bloquesBase(wb) {
  const mapa = new Map();
  const h = hoja(wb, 'Base_OAPDI');
  if (!h) return mapa;
  const e = encabezados(wb, h.ws, { idAsignacion: 'Id asignación', codigoMeta: 'Código meta', meta: 'Meta estratégica (PDI)', idArea: 'Id área', area: 'Área funcional' });
  if (!e || e.col.idAsignacion === undefined || e.col.idArea === undefined) return mapa;
  for (let f = e.fila + 1; f <= e.ultimaFila; f += 1) {
    const o = filaComoObjeto(wb, h.ws, f, e.col);
    const m = /^E(\d)-/i.exec(texto(o.idAsignacion));
    if (!m) continue;
    const n = Number(m[1]);
    if (!mapa.has(n)) mapa.set(n, []);
    delete o._fila;
    mapa.get(n).push(o);
  }
  return mapa;
}

// Mapa «indicador de impacto» → «dimensiones permitidas», leído de la hoja oculta Catalogos del propio libro.
function catalogoImpacto(wb) {
  const h = hoja(wb, 'Catalogos');
  if (!h) return null;
  const e = encabezados(wb, h.ws, { imp: 'Indicador de impacto (etiqueta de lista)', dims: 'Dimensiones de la categoría' });
  if (!e || e.col.imp === undefined || e.col.dims === undefined) return null;
  const mapa = new Map();
  for (let f = e.fila + 1; f <= e.ultimaFila; f += 1) {
    const o = filaComoObjeto(wb, h.ws, f, { imp: e.col.imp, dims: e.col.dims });
    if (!vacio(o.imp)) mapa.set(normalizar(o.imp), texto(o.dims));
  }
  return mapa;
}

/*
 * Evalúa una acción con las mismas reglas y el mismo orden de la fórmula de la plantilla.
 * Devuelve { estado: 'pendiente'|'ok'|'error', mensaje, faltan }.
 */
function evaluar(o, requeridos, impactos, anio, campoNombre = 'nombre') {
  if (vacio(o[campoNombre])) return { estado: 'pendiente', mensaje: 'Pendiente por formular' };
  const faltan = requeridos.filter((k) => vacio(o[k]));
  if (faltan.length) return { estado: 'error', mensaje: 'Incompleta: faltan campos obligatorios', faltan };
  const ini = fechaValida(o.inicio);
  const fin = fechaValida(o.fin);
  if (!ini || !fin) return { estado: 'error', mensaje: 'Fecha inválida' };
  if (fin < ini) return { estado: 'error', mensaje: 'La fecha de fin es anterior a la de inicio' };
  if (ini.slice(0, 4) !== String(anio) || fin.slice(0, 4) !== String(anio)) return { estado: 'error', mensaje: `Fechas fuera de la vigencia ${anio}` };
  if (!/@itc\.edu\.co/i.test(texto(o.responsable))) return { estado: 'error', mensaje: 'El responsable no tiene correo institucional' };
  if (impactos) {
    const dims = impactos.get(normalizar(o.impacto));
    if (dims === undefined || !normalizar(dims).includes(normalizar(o.dimension))) return { estado: 'error', mensaje: 'La dimensión no corresponde al indicador de impacto' };
  }
  return { estado: 'ok', mensaje: 'OK' };
}

const CORRECCION = {
  'Incompleta: faltan campos obligatorios': 'Complete las columnas amarillas indicadas en esa fila.',
  'Fecha inválida': 'Escriba las fechas como fecha de Excel (dd/mm/aaaa), no como texto.',
  'La fecha de fin es anterior a la de inicio': 'Corrija las fechas: la de fin debe ser igual o posterior a la de inicio.',
  'Fechas fuera de la vigencia 2027': 'Las dos fechas deben estar dentro de 2027.',
  'El responsable no tiene correo institucional': 'Escriba el correo institucional del responsable (termina en @itc.edu.co), sin tildes.',
  'La dimensión no corresponde al indicador de impacto': 'Elija una dimensión que corresponda a la categoría del indicador de impacto (la columna «Categoría de impacto» de la plantilla lo indica).'
};

const productoNoValido = (p) => {
  const n = normalizar(p);
  return /(contrat\w* (de |del )?(personal|profesional|contratista)|estudios? previos)/.test(n);
};

/*
 * validarFormulacion(wb, { areaId, areaEtiqueta, anio=2027, exigirTodasLasMetas=true })
 * Devuelve { tipoDetectado, hallazgos, resumen, acciones, bloqueantes, advertencias }.
 */
export function validarFormulacion(wb, opciones) {
  const { areaId, areaEtiqueta = areaId, anio = 2027, exigirTodasLasMetas = true } = opciones;
  const hallazgos = [];
  const agregar = (severidad, hojaN, fila, titulo, detalle, correccion) => hallazgos.push({ id: `H${hallazgos.length + 1}`, severidad, hoja: hojaN, fila, titulo, detalle, correccion });
  const resultado = (tipoDetectado, resumen = {}, acciones = []) => {
    const bloqueantes = hallazgos.filter((h) => h.severidad === 'bloqueante').length;
    return { tipoDetectado, hallazgos: ordenar(hallazgos), resumen: { ...resumen, bloqueantes, advertencias: hallazgos.length - bloqueantes }, acciones, bloqueantes, advertencias: hallazgos.length - bloqueantes };
  };

  // 1. ¿Es el libro correcto?
  if (hoja(wb, 'Formulación PDN 2027')) {
    agregar('bloqueante', '—', null, 'Este archivo es el Plan de Necesidades',
      'Cargó el libro «Plan de Necesidades 2027». En esta pestaña se carga la «Plantilla de Formulación 2027».',
      'Cargue aquí la Plantilla de Formulación diligenciada. El Plan de Necesidades se carga en la pestaña «Plan de necesidades».');
    return resultado('necesidades');
  }
  const hojasEje = EJES.map((e) => hoja(wb, e, { prefijo: true }));
  if (hojasEje.every((h) => !h) && (hoja(wb, 'Plan_Accion_2027') || hoja(wb, 'Acciones_2027'))) {
    agregar('bloqueante', '—', null, 'Este archivo es el libro de consulta «Plan de acción 2027»',
      'Ese libro es la propuesta de la Oficina Asesora de Planeación y no se diligencia.',
      'Cargue la «Plantilla de Formulación 2027» con las columnas amarillas diligenciadas.');
    return resultado('consulta');
  }
  const faltanEjes = EJES.filter((e, i) => !hojasEje[i]);
  if (faltanEjes.length === EJES.length) {
    agregar('bloqueante', '—', null, 'El archivo no es la Plantilla de Formulación 2027',
      'No se encontraron las hojas de los ejes (Eje1_Formacion a Eje6_Bienestar).',
      'Descargue la plantilla desde esta pestaña, diligénciela y cárguela sin cambiar el nombre de las hojas.');
    return resultado('desconocido');
  }
  if (faltanEjes.length) {
    agregar('bloqueante', '—', null, 'Faltan hojas de la plantilla',
      `No se encontraron las hojas: ${faltanEjes.join(', ')}.`,
      'No borre ni renombre hojas. Si las modificó, copie su información en una plantilla nueva.');
  }

  const impactos = catalogoImpacto(wb);
  if (!impactos) {
    agregar('advertencia', 'Catalogos', null, 'No se pudo revisar la dimensión de impacto',
      'La hoja oculta de catálogos no está o fue modificada; por eso no se verificó que cada dimensión corresponda a su indicador.',
      'Use la plantilla original sin modificar sus hojas ocultas.');
  }

  // 2. Metas asignadas al área en las hojas de eje
  const base = bloquesBase(wb);
  const filasArea = [];
  hojasEje.forEach((h, i) => {
    if (!h) return;
    const e = encabezados(wb, h.ws, COLUMNAS_EJE, { obligatorias: ['idArea', 'nombre', 'producto', 'inicio', 'fin', 'responsable'] });
    if (!e || e.faltan.length) {
      agregar('bloqueante', h.nombre, e ? e.fila : null, 'La hoja no tiene la estructura de la plantilla',
        `Faltan columnas: ${(e ? e.faltan : ['encabezados']).map((k) => COLUMNAS_EJE[k] || k).join(', ')}.`,
        'No inserte, borre ni renombre columnas de la plantilla.');
      return;
    }
    // Si el archivo se guardó con una herramienta que no calcula fórmulas, las columnas grises llegan vacías:
    // se reconstruyen desde la hoja oculta Base_OAPDI, que tiene las asignaciones del eje en el mismo orden.
    const bloque = base.get(i + 1) || [];
    let sinCalculo = true;
    for (let f = e.fila + 1; f <= Math.min(e.ultimaFila, e.fila + 5); f += 1) if (!vacio(filaComoObjeto(wb, h.ws, f, { x: e.col.idArea }).x)) sinCalculo = false;
    const ultima = sinCalculo ? Math.max(e.ultimaFila, e.fila + bloque.length) : e.ultimaFila;
    for (let f = e.fila + 1; f <= ultima; f += 1) {
      const o = filaComoObjeto(wb, h.ws, f, e.col);
      if (sinCalculo && bloque[f - e.fila - 1]) Object.assign(o, bloque[f - e.fila - 1]);
      if (texto(o.idArea).toUpperCase() !== areaId) continue;
      const ev = evaluar(o, ['producto', 'inicio', 'fin', 'responsable', 'indicador', 'metaAccion', 'dimension', 'impacto'], impactos, anio);
      filasArea.push({ ...o, hoja: h.nombre, ...ev });
    }
  });

  // 3. Acciones adicionales del área (parte inferior del buscador)
  const adicionales = [];
  const b = hoja(wb, 'Buscador_Formulacion');
  if (b) {
    const e = encabezados(wb, b.ws, COLUMNAS_ADICIONALES, { maxFila: 80, obligatorias: ['area', 'nombre'] });
    if (e && !e.faltan.length) {
      for (let f = e.fila + 1; f <= e.ultimaFila; f += 1) {
        const o = filaComoObjeto(wb, b.ws, f, e.col);
        if (!esDelArea(o.area, areaId) || vacio(o.nombre)) continue;
        const ev = evaluar(o, ['producto', 'inicio', 'fin', 'responsable', 'indicador', 'metaAccion', 'dimension', 'impacto', 'area', 'codigoMeta', 'origen'], impactos, anio);
        adicionales.push({ ...o, hoja: b.nombre, ...ev });
      }
    }
  }

  // 4. Hallazgos por fila con errores
  [...filasArea, ...adicionales].filter((x) => x.estado === 'error').forEach((x) => {
    const meta = texto(x.codigoMeta);
    const detalle = x.faltan
      ? `${meta ? `Meta ${meta}: ` : ''}«${texto(x.nombre)}». Faltan: ${x.faltan.map((k) => ETIQUETAS[k] || k).join(', ')}.`
      : `${meta ? `Meta ${meta}: ` : ''}«${texto(x.nombre)}».`;
    agregar('bloqueante', x.hoja, x._fila, x.mensaje, detalle, CORRECCION[x.mensaje] || 'Corrija la fila hasta que la columna «Alerta de consistencia» diga OK.');
  });

  // 5. Metas pendientes por formular (agrupadas por hoja)
  const pendientes = filasArea.filter((x) => x.estado === 'pendiente');
  const porHoja = new Map();
  pendientes.forEach((x) => { if (!porHoja.has(x.hoja)) porHoja.set(x.hoja, []); porHoja.get(x.hoja).push(x); });
  porHoja.forEach((lista, nombreHoja) => {
    const codigos = lista.map((x) => `${texto(x.codigoMeta)} (fila ${x._fila})`).join(', ');
    agregar(exigirTodasLasMetas ? 'bloqueante' : 'advertencia', nombreHoja, lista[0]._fila,
      lista.length === 1 ? 'Una meta asignada está sin formular' : `${lista.length} metas asignadas están sin formular`,
      `Su área tiene asignadas estas metas sin acción: ${codigos}.`,
      'Escriba en cada fila el nombre de la acción y complete las columnas amarillas. Si la meta no le corresponde, regístrelo en «Observaciones» y consúltelo con la Oficina Asesora de Planeación.');
  });

  const ok = [...filasArea, ...adicionales].filter((x) => x.estado === 'ok');
  if (!filasArea.length && !adicionales.length) {
    agregar('bloqueante', 'Buscador_Formulacion', null, 'No hay acciones para su área',
      `La plantilla no tiene metas asignadas al área ${areaEtiqueta} ni acciones adicionales registradas por ella.`,
      'Verifique que eligió bien su área. Si su área no tiene metas asignadas, registre sus acciones en «Acciones adicionales» del buscador.');
  } else if (!ok.length && !hallazgos.some((h) => h.severidad === 'bloqueante')) {
    agregar('bloqueante', 'Buscador_Formulacion', null, 'No hay ninguna acción formulada',
      'Ninguna fila de su área tiene la acción completa y en OK.', 'Formule al menos una acción completa.');
  }

  // 6. Advertencias de calidad sobre las acciones en OK
  ok.forEach((x) => {
    if (productoNoValido(x.producto)) {
      agregar('advertencia', x.hoja, x._fila, 'El producto parece una actividad, no un producto',
        `«${texto(x.producto)}»: la contratación de personal y los estudios previos sirven a un producto, pero no lo son.`,
        'Registre como producto el resultado verificable (informe, documento, sistema en operación…).');
    }
  });
  const sinEvidencia = ok.filter((x) => vacio(x.evidencia));
  if (sinEvidencia.length) {
    agregar('advertencia', sinEvidencia[0].hoja, sinEvidencia[0]._fila,
      sinEvidencia.length === 1 ? 'Una acción no tiene evidencia verificable' : `${sinEvidencia.length} acciones no tienen evidencia verificable`,
      `Filas: ${sinEvidencia.map((x) => `${x.hoja} ${x._fila}`).join(', ')}.`,
      'Indique el documento o registro que demostrará el cumplimiento (acta, radicado, informe…).');
  }
  const sinRetoma = ok.filter((x) => vacio(x.retoma));
  if (sinRetoma.length) {
    agregar('advertencia', sinRetoma[0].hoja, sinRetoma[0]._fila,
      'Falta indicar si retoma un compromiso 2026',
      `${sinRetoma.length} ${sinRetoma.length === 1 ? 'acción no indica' : 'acciones no indican'} si continúan o cierran un compromiso pendiente de 2026.`,
      'Marque Sí o No en «¿Retoma un compromiso pendiente 2026?».');
  }
  const conTildes = ok.filter((x) => /[áéíóúñ\s]/i.test(texto(x.responsable).trim()));
  if (conTildes.length) {
    agregar('advertencia', conTildes[0].hoja, conTildes[0]._fila, 'Correo de responsable con tildes o espacios',
      `Revise: ${conTildes.map((x) => texto(x.responsable)).slice(0, 3).join(', ')}.`, 'Los correos institucionales van sin tildes ni espacios.');
  }

  // 7. Compromisos pendientes 2026 del área
  const c = hoja(wb, 'Compromisos_2026');
  let compromisos = { total: 0, decididos: 0 };
  if (c) {
    const e = encabezados(wb, c.ws, { id: 'Id', idArea: 'Id área (propuesta)', compromiso: 'Compromiso o tarea', decision: 'Decisión del área' }, { maxFila: 8 });
    if (e && e.col.idArea !== undefined && e.col.decision !== undefined) {
      const propios = [];
      for (let f = e.fila + 1; f <= e.ultimaFila; f += 1) {
        const o = filaComoObjeto(wb, c.ws, f, e.col);
        if (texto(o.idArea).toUpperCase() === areaId) propios.push(o);
      }
      const sinDecision = propios.filter((o) => vacio(o.decision));
      compromisos = { total: propios.length, decididos: propios.length - sinDecision.length };
      if (sinDecision.length) {
        agregar('advertencia', c.nombre, sinDecision[0]._fila,
          sinDecision.length === 1 ? 'Un compromiso 2026 sin decisión' : `${sinDecision.length} compromisos 2026 sin decisión`,
          `Compromisos de su área sin decisión: ${sinDecision.map((o) => texto(o.id)).join(', ')}.`,
          'En la hoja Compromisos_2026 elija la decisión del área: se retoma, se cierra, se reasigna o no aplica.');
      }
    }
  }

  const acciones = ok.map((x) => ({ meta: texto(x.codigoMeta), nombre: texto(x.nombre), producto: texto(x.producto), inicio: fechaValida(x.inicio), fin: fechaValida(x.fin), responsable: texto(x.responsable), dimension: texto(x.dimension), hoja: x.hoja, fila: x._fila }));
  const resumen = {
    metasAsignadas: filasArea.length,
    metasFormuladas: filasArea.filter((x) => x.estado !== 'pendiente').length,
    accionesOk: ok.length,
    accionesConErrores: [...filasArea, ...adicionales].filter((x) => x.estado === 'error').length,
    pendientes: pendientes.length,
    adicionales: adicionales.length,
    compromisos,
    porEje: EJES.map((eje, i) => ({ eje, hoja: hojasEje[i]?.nombre || eje, metas: filasArea.filter((x) => x.hoja === hojasEje[i]?.nombre).length, ok: ok.filter((x) => x.hoja === hojasEje[i]?.nombre).length }))
  };
  return resultado('formulacion', resumen, acciones);
}

function ordenar(h) { return [...h].sort((a, b) => (a.severidad === b.severidad ? 0 : a.severidad === 'bloqueante' ? -1 : 1)); }
