/*
 * validar-necesidades.js — Validación del «Plan de Necesidades 2027» diligenciado por un área funcional.
 * Replica, en el mismo orden, la «Alerta de consistencia» de la plantilla (columna AJ de la hoja
 * «Formulación PDN 2027»). La primera regla que falla es la que se reporta, igual que en Excel.
 * Agrega la revisión de la cadena lógica: cada necesidad sirve a una acción, y las acciones propias deben
 * existir en la formulación del área cuando esta ya se registró.
 */
import { hoja, encabezados, filaComoObjeto, vacio, texto, esNumero } from './libro.js';
import { normalizar } from './formato.js';
import { esDelArea } from './validar-accion.js';
import { similitud } from './similitud.js';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const TOPE_MINIMA_REFERENCIA_2025 = 39850000;

const COLUMNAS = {
  numero: 'N.° necesidad', area: 'Área funcional que formula', meta: 'Meta estratégica PDI', accion: 'Acción del Plan de Acción 2027',
  accionPropia: 'Nombre de la acción propia', tipo: 'Tipo de necesidad', justificacion: 'Justificación de la necesidad', objeto: 'Descripción del objeto contractual',
  unspsc: 'Código UNSPSC principal', unspscAdicionales: 'Códigos UNSPSC adicionales', mesInicio: 'Mes estimado de inicio', mesOfertas: 'Mes estimado de presentación',
  duracion: 'Duración del contrato', unidad: 'Unidad de duración', modalidad: 'Modalidad de selección', fuente: 'Fuente de los recursos', gasto: 'Tipo de gasto',
  rubro: 'Rubro presupuestal', valorTotal: 'Valor total estimado', valor2027: 'Valor estimado vigencia 2027', requiereVF: '¿Requiere vigencias futuras?',
  estadoVF: 'Estado de la solicitud de vigencias futuras', sede: 'Sede o lugar de ejecución', responsable: 'Nombre del responsable', cargo: 'Cargo del responsable',
  telefono: 'Teléfono', correo: 'Correo institucional del responsable', continua2026: '¿Continúa una necesidad 2026?', registro2026: 'N.° de registro 2026',
  prioridad: 'Prioridad', observaciones: 'Observaciones'
};

const OBLIGATORIOS = ['area', 'meta', 'accion', 'tipo', 'justificacion', 'objeto', 'unspsc', 'mesInicio', 'mesOfertas', 'duracion', 'unidad', 'modalidad', 'fuente', 'gasto', 'valorTotal', 'valor2027', 'requiereVF', 'responsable', 'cargo', 'correo', 'continua2026'];
const ETIQUETAS = {
  area: 'Área', meta: 'Meta PDI', accion: 'Acción', tipo: 'Tipo de necesidad', justificacion: 'Justificación', objeto: 'Objeto contractual', unspsc: 'UNSPSC',
  mesInicio: 'Mes de inicio', mesOfertas: 'Mes de ofertas', duracion: 'Duración', unidad: 'Unidad de duración', modalidad: 'Modalidad', fuente: 'Fuente',
  gasto: 'Tipo de gasto', valorTotal: 'Valor total', valor2027: 'Valor 2027', requiereVF: '¿Vigencias futuras?', responsable: 'Nombre del responsable',
  cargo: 'Cargo', correo: 'Correo', continua2026: '¿Continúa 2026?'
};

const CORRECCION = {
  'Incompleta: faltan campos obligatorios': 'Complete las columnas amarillas obligatorias de esa fila.',
  'Falta el nombre de la acción propia del área': 'Si eligió PROPIA, escriba en la columna I el nombre de la acción tal como quedó en su Plantilla de Formulación.',
  'La acción no corresponde a la meta seleccionada': 'Elija una acción de la lista que pertenezca a la meta, o cambie la meta.',
  'Código UNSPSC inválido: registre 8 dígitos': 'Escriba un solo código UNSPSC de 8 dígitos, como número. Use la hoja «Guía UNSPSC».',
  'UNSPSC a nivel de segmento o familia: use clase o producto': 'El código debe ser de clase (termina en 00) o de producto, no de segmento ni familia (termina en 0000).',
  'El mes de ofertas es anterior al de inicio del proceso': 'El mes de presentación de ofertas debe ser igual o posterior al mes de inicio del proceso.',
  'Duración inválida': 'Escriba la duración como un número mayor que cero y elija la unidad (días, meses o años).',
  'Valor inválido: registre solo números': 'Escriba los valores en pesos, solo números: sin puntos, sin $ y sin texto.',
  'Valor inválido: debe ser mayor que cero': 'El valor total y el valor 2027 deben ser mayores que cero.',
  'El valor de la vigencia 2027 supera el valor total': 'El valor de 2027 no puede ser mayor que el valor total del contrato.',
  'El valor total supera el de 2027: requiere vigencias futuras': 'Si el contrato se paga en más de una vigencia, marque Sí en vigencias futuras e indique el estado.',
  'Indique el estado de la solicitud de vigencias futuras': 'Elija el estado: no solicitadas, solicitadas o aprobadas.',
  'El valor supera el tope de mínima cuantía 2027': 'Revise la modalidad: por ese valor no procede mínima cuantía.',
  'El valor supera el tope de menor cuantía 2027': 'Revise la modalidad: por ese valor no procede selección abreviada de menor cuantía.',
  'El correo del responsable no es institucional válido': 'Escriba el correo institucional del supervisor (@itc.edu.co), sin tildes ni espacios.',
  'Indique el N.° de registro 2026 que continúa': 'Elija en la lista el número PN26-### de la necesidad 2026 que continúa.'
};

// Catálogo acción → meta y parámetros de la vigencia, leídos del propio libro.
function catalogos(wb) {
  const acciones = new Map();
  const h = hoja(wb, 'Catalogos');
  if (h) {
    const e = encabezados(wb, h.ws, { meta: 'Meta de la acción', accion: 'Acción del Plan de Acción 2027 (lista)' });
    if (e && e.col.meta !== undefined && e.col.accion !== undefined) {
      for (let f = e.fila + 1; f <= e.ultimaFila; f += 1) {
        const o = filaComoObjeto(wb, h.ws, f, e.col);
        if (!vacio(o.accion)) acciones.set(texto(o.accion), texto(o.meta));
      }
    }
  }
  const params = { topeMenor: null, topeMinima: null, fechaRemision: null };
  const t = hoja(wb, 'Tablero_Consistencia');
  if (t) {
    for (let f = 1; f <= 20; f += 1) {
      const etiqueta = normalizar(t.ws[`A${f}`]?.v);
      const v = t.ws[`B${f}`]?.v;
      if (etiqueta.startsWith('tope de menor cuantia') && esNumero(v)) params.topeMenor = v;
      if (etiqueta.startsWith('tope de minima cuantia') && esNumero(v)) params.topeMinima = v;
      if (etiqueta.startsWith('fecha limite de remision')) params.fechaRemision = v instanceof Date ? v : null;
    }
  }
  return { acciones, params };
}

// Réplica de la fórmula AJ: devuelve el primer mensaje que aplica, o 'OK'.
function evaluar(o, cat) {
  const faltan = OBLIGATORIOS.filter((k) => vacio(o[k]));
  if (faltan.length) return { mensaje: 'Incompleta: faltan campos obligatorios', faltan };
  const accion = texto(o.accion);
  if (accion.toUpperCase().startsWith('PROPIA') && vacio(o.accionPropia)) return { mensaje: 'Falta el nombre de la acción propia del área' };
  if (accion.toUpperCase().startsWith('A27')) {
    const metaAccion = cat.acciones.get(accion);
    if ((metaAccion ?? 'x') !== texto(o.meta).slice(0, 7)) return { mensaje: 'La acción no corresponde a la meta seleccionada' };
  }
  const u = o.unspsc;
  if (!esNumero(u) || u < 10000000 || u > 99999999) return { mensaje: 'Código UNSPSC inválido: registre 8 dígitos' };
  if (u % 10000 === 0) return { mensaje: 'UNSPSC a nivel de segmento o familia: use clase o producto' };
  const mi = MESES.indexOf(normalizar(o.mesInicio));
  const mo = MESES.indexOf(normalizar(o.mesOfertas));
  if (mi < 0 || mo < 0 || mo < mi) return { mensaje: 'El mes de ofertas es anterior al de inicio del proceso' };
  if (!esNumero(o.duracion) || o.duracion <= 0) return { mensaje: 'Duración inválida' };
  if (!esNumero(o.valorTotal) || !esNumero(o.valor2027)) return { mensaje: 'Valor inválido: registre solo números' };
  if (o.valorTotal <= 0 || o.valor2027 <= 0) return { mensaje: 'Valor inválido: debe ser mayor que cero' };
  if (o.valor2027 > o.valorTotal) return { mensaje: 'El valor de la vigencia 2027 supera el valor total' };
  const vf = normalizar(o.requiereVF);
  if (o.valor2027 < o.valorTotal && vf === 'no') return { mensaje: 'El valor total supera el de 2027: requiere vigencias futuras' };
  if (vf === 'si' && (vacio(o.estadoVF) || normalizar(o.estadoVF) === 'no aplica')) return { mensaje: 'Indique el estado de la solicitud de vigencias futuras' };
  const mod = normalizar(o.modalidad);
  if (mod === 'minima cuantia' && cat.params.topeMinima && o.valorTotal > cat.params.topeMinima) return { mensaje: 'El valor supera el tope de mínima cuantía 2027' };
  if (mod === 'seleccion abreviada de menor cuantia' && cat.params.topeMenor && o.valorTotal > cat.params.topeMenor) return { mensaje: 'El valor supera el tope de menor cuantía 2027' };
  const correo = texto(o.correo);
  if (!/@itc\.edu\.co/i.test(correo) || /[áéíóúñ ]/i.test(correo)) return { mensaje: 'El correo del responsable no es institucional válido' };
  if (normalizar(o.continua2026) === 'si' && vacio(o.registro2026)) return { mensaje: 'Indique el N.° de registro 2026 que continúa' };
  return { mensaje: 'OK' };
}

const filaConDatos = (o) => Object.entries(o).some(([k, v]) => k !== '_fila' && k !== 'numero' && !vacio(v));

/*
 * validarNecesidades(wb, { areaId, areaEtiqueta, accionesFormuladas: [nombres] | null })
 */
export function validarNecesidades(wb, opciones) {
  const { areaId, areaEtiqueta = areaId, accionesFormuladas = null } = opciones;
  const hallazgos = [];
  const agregar = (severidad, hojaN, fila, titulo, detalle, correccion) => hallazgos.push({ id: `H${hallazgos.length + 1}`, severidad, hoja: hojaN, fila, titulo, detalle, correccion });
  const resultado = (tipoDetectado, resumen = {}, necesidades = []) => {
    const bloqueantes = hallazgos.filter((h) => h.severidad === 'bloqueante').length;
    const orden = [...hallazgos].sort((a, b) => (a.severidad === b.severidad ? 0 : a.severidad === 'bloqueante' ? -1 : 1));
    return { tipoDetectado, hallazgos: orden, resumen: { ...resumen, bloqueantes, advertencias: hallazgos.length - bloqueantes }, necesidades, bloqueantes, advertencias: hallazgos.length - bloqueantes };
  };

  const h = hoja(wb, 'Formulación PDN 2027');
  if (!h) {
    const esFormulacion = ['Eje1', 'Buscador_Formulacion'].some((n) => hoja(wb, n, { prefijo: true }));
    agregar('bloqueante', '—', null, esFormulacion ? 'Este archivo es la Plantilla de Formulación' : 'El archivo no es el Plan de Necesidades 2027',
      esFormulacion ? 'Cargó la Plantilla de Formulación 2027. En esta pestaña se carga el Plan de Necesidades.' : 'No se encontró la hoja «Formulación PDN 2027».',
      esFormulacion ? 'Cárguela en la pestaña «Plan de acción» y aquí cargue el Plan de Necesidades 2027.' : 'Descargue la plantilla desde esta pestaña, diligénciela y cárguela sin cambiar el nombre de las hojas.');
    return resultado(esFormulacion ? 'formulacion' : 'desconocido');
  }

  const e = encabezados(wb, h.ws, COLUMNAS, { obligatorias: ['area', 'meta', 'accion', 'unspsc', 'valorTotal', 'valor2027', 'correo'] });
  if (!e || e.faltan.length) {
    agregar('bloqueante', h.nombre, e ? e.fila : null, 'La hoja no tiene la estructura de la plantilla',
      `Faltan columnas: ${(e ? e.faltan : ['encabezados']).map((k) => COLUMNAS[k] || k).join(', ')}.`,
      'No inserte, borre ni renombre columnas de la plantilla.');
    return resultado('necesidades');
  }
  const cat = catalogos(wb);
  if (!cat.acciones.size) {
    agregar('advertencia', 'Catalogos', null, 'No se pudo revisar la relación acción–meta',
      'La hoja oculta de catálogos no está o fue modificada.', 'Use la plantilla original sin modificar sus hojas ocultas.');
  }

  const propias = [];
  const otrasAreas = new Set();
  const necesidades = [];
  for (let f = e.fila + 1; f <= e.ultimaFila; f += 1) {
    const o = filaComoObjeto(wb, h.ws, f, e.col);
    if (!filaConDatos(o)) continue;
    if (!vacio(o.area) && !esDelArea(o.area, areaId)) { otrasAreas.add(texto(o.area).slice(0, 3)); continue; }
    if (vacio(o.area) && !filaConDatos({ ...o, area: null })) continue;
    const ev = evaluar(o, cat);
    necesidades.push({ ...o, ...ev });
    if (ev.mensaje !== 'OK') {
      const detalle = ev.faltan
        ? `${texto(o.numero) || `Fila ${f}`}: faltan ${ev.faltan.map((k) => ETIQUETAS[k] || k).join(', ')}.`
        : `${texto(o.numero) || `Fila ${f}`}${o.objeto ? ` · «${texto(o.objeto).slice(0, 90)}»` : ''}.`;
      agregar('bloqueante', h.nombre, f, ev.mensaje, detalle, CORRECCION[ev.mensaje] || 'Corrija la fila hasta que la «Alerta de consistencia» diga OK.');
    }
    if (texto(o.accion).toUpperCase().startsWith('PROPIA') && !vacio(o.accionPropia)) propias.push({ fila: f, nombre: texto(o.accionPropia) });
  }

  if (!necesidades.length) {
    agregar('bloqueante', h.nombre, null, 'No hay necesidades de su área',
      `La hoja no tiene necesidades registradas por el área ${areaEtiqueta}.${otrasAreas.size ? ` Sí hay filas de otras áreas (${[...otrasAreas].join(', ')}).` : ''}`,
      'Verifique que eligió bien su área en la columna B. Si su área no necesita contratar nada, no es necesario cargar este archivo.');
  }

  const ok = necesidades.filter((n) => n.mensaje === 'OK');

  // Cadena lógica: las acciones propias deben existir en la formulación registrada del área
  if (accionesFormuladas && accionesFormuladas.length) {
    propias.forEach((p) => {
      const mejor = Math.max(0, ...accionesFormuladas.map((a) => similitud(a, p.nombre)));
      if (mejor < 0.72) {
        agregar('advertencia', h.nombre, p.fila, 'La acción propia no aparece en su formulación',
          `«${p.nombre}» no coincide con ninguna acción de la Plantilla de Formulación que registró su área.`,
          'Escriba el nombre de la acción tal como quedó en la plantilla. Toda necesidad debe servir a una acción formulada.');
      }
    });
  }

  // Referencia del tope de mínima cuantía cuando los topes 2027 aún no están certificados
  if (!cat.params.topeMinima) {
    const sospechosas = ok.filter((n) => normalizar(n.modalidad) === 'minima cuantia' && n.valorTotal > TOPE_MINIMA_REFERENCIA_2025);
    if (sospechosas.length) {
      agregar('advertencia', h.nombre, sospechosas[0]._fila,
        `${sospechosas.length === 1 ? 'Una necesidad' : `${sospechosas.length} necesidades`} en mínima cuantía con valor alto`,
        `Superan $39.850.000, el tope de mínima cuantía de 2025. Filas: ${sospechosas.map((n) => n._fila).join(', ')}. Los topes 2027 aún no están certificados.`,
        'Confirme la modalidad con el GIT de Contratación y Adquisiciones: en 2026 hubo 41 casos así.');
    }
  }
  const sinPrioridad = ok.filter((n) => vacio(n.prioridad));
  if (sinPrioridad.length) {
    agregar('advertencia', h.nombre, sinPrioridad[0]._fila, 'Necesidades sin prioridad',
      `${sinPrioridad.length} ${sinPrioridad.length === 1 ? 'necesidad no tiene' : 'necesidades no tienen'} prioridad.`,
      'Indique Alta, Media o Baja: sirve para decidir si el presupuesto no alcanza.');
  }

  const suma = (lista, k) => lista.reduce((s, n) => s + (esNumero(n[k]) ? n[k] : 0), 0);
  const agrupar = (k) => ok.reduce((m, n) => { const c = texto(n[k]) || 'Sin dato'; m[c] = (m[c] || 0) + (esNumero(n.valorTotal) ? n.valorTotal : 0); return m; }, {});
  const resumen = {
    necesidades: necesidades.length,
    ok: ok.length,
    conErrores: necesidades.length - ok.length,
    valorTotal: suma(ok, 'valorTotal'),
    valor2027: suma(ok, 'valor2027'),
    vigenciasFuturas: ok.filter((n) => normalizar(n.requiereVF) === 'si').length,
    porModalidad: agrupar('modalidad'),
    porTipo: agrupar('tipo'),
    acciones: [...new Set(ok.map((n) => texto(n.accion).split(' · ')[0]))],
    topes: cat.params
  };
  const lista = ok.map((n) => ({
    numero: texto(n.numero), objeto: texto(n.objeto), tipo: texto(n.tipo), modalidad: texto(n.modalidad), mesInicio: texto(n.mesInicio),
    valorTotal: n.valorTotal, valor2027: n.valor2027, accion: texto(n.accion), meta: texto(n.meta).slice(0, 7), fila: n._fila
  }));
  return resultado('necesidades', resumen, lista);
}
