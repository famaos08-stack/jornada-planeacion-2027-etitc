/*
 * excel.js — Lectura y escritura de Excel con SheetJS.
 *  - generarPlantilla(): construye en el momento la plantilla de formulación (5 hojas).
 *  - leerLibro(): lee .xlsx/.xls en el navegador y devuelve matrices de celdas por hoja.
 *  - exportarExcel(): exporta tablas (consolidados, asistencia) con encabezado institucional y logo.
 *
 * SheetJS Community no escribe estilos ni validaciones de datos, así que el libro se genera con SheetJS
 * y luego se post-procesa el paquete OOXML (zip) con XLSX.CFB para agregar: estilos institucionales,
 * listas desplegables, protección de celdas, paneles inmovilizados, cálculo al abrir y el logo.
 * Si el post-proceso falla por cualquier motivo se entrega el libro de SheetJS sin estilos (degradación).
 */
import { ESQUEMA, HOJAS, TIPOS_NECESIDAD } from './validacion.js';
import { serieExcel, hoyISO, fechaLarga, horaLegible } from './fechas.js';

// Índices de estilo (cellXfs) definidos en estilosXml()
const S = {
  normal: 0, encabezado: 1, entrada: 2, entradaFecha: 3, formulaFecha: 4, titulo: 5, texto: 6, etiqueta: 7,
  entradaMoneda: 8, entradaNumero: 9, fechaBloqueada: 10, nota: 11, seccion: 12, subtitulo: 13,
  celda: 14, celdaMoneda: 15, celdaFecha: 16, celdaNumero: 17, cita: 18
};

const FILAS_EDITABLES_DEFECTO = 300;

export function xlsxDisponible() { return Boolean(window.XLSX && window.XLSX.utils); }

function libreria() {
  if (!xlsxDisponible()) {
    throw new Error('La librería de Excel (SheetJS) no cargó. Revise su conexión a internet y recargue la página.');
  }
  return window.XLSX;
}

const escXml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function estilosXml() {
  const borde = '<border><left style="thin"><color rgb="FFD7E4DC"/></left><right style="thin"><color rgb="FFD7E4DC"/></right><top style="thin"><color rgb="FFD7E4DC"/></top><bottom style="thin"><color rgb="FFD7E4DC"/></bottom><diagonal/></border>';
  const xf = (attrs, inner = '') => `<xf ${attrs} xfId="0"${inner ? `>${inner}</xf>` : '/>'}`;
  const libre = '<protection locked="0"/>';
  const xfs = [
    xf('numFmtId="0" fontId="0" fillId="0" borderId="0"'),
    xf('numFmtId="0" fontId="1" fillId="2" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"', '<alignment horizontal="center" vertical="center" wrapText="1"/>'),
    xf('numFmtId="0" fontId="0" fillId="0" borderId="1" applyBorder="1" applyAlignment="1" applyProtection="1"', `<alignment vertical="top" wrapText="1"/>${libre}`),
    xf('numFmtId="164" fontId="0" fillId="0" borderId="1" applyNumberFormat="1" applyBorder="1" applyAlignment="1" applyProtection="1"', `<alignment horizontal="center" vertical="top"/>${libre}`),
    xf('numFmtId="164" fontId="3" fillId="3" borderId="1" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"', '<alignment horizontal="center" vertical="top"/>'),
    xf('numFmtId="0" fontId="2" fillId="0" borderId="0" applyFont="1" applyAlignment="1"', '<alignment vertical="center"/>'),
    xf('numFmtId="0" fontId="0" fillId="0" borderId="0" applyAlignment="1"', '<alignment vertical="top" wrapText="1"/>'),
    xf('numFmtId="0" fontId="3" fillId="0" borderId="0" applyFont="1" applyAlignment="1"', '<alignment vertical="top" wrapText="1"/>'),
    xf('numFmtId="165" fontId="0" fillId="0" borderId="1" applyNumberFormat="1" applyBorder="1" applyAlignment="1" applyProtection="1"', `<alignment vertical="top"/>${libre}`),
    xf('numFmtId="0" fontId="0" fillId="0" borderId="1" applyBorder="1" applyAlignment="1" applyProtection="1"', `<alignment horizontal="center" vertical="top"/>${libre}`),
    xf('numFmtId="164" fontId="0" fillId="0" borderId="1" applyNumberFormat="1" applyBorder="1" applyAlignment="1"', '<alignment horizontal="center"/>'),
    xf('numFmtId="0" fontId="4" fillId="4" borderId="0" applyFont="1" applyFill="1" applyAlignment="1"', '<alignment vertical="top" wrapText="1"/>'),
    xf('numFmtId="0" fontId="5" fillId="5" borderId="0" applyFont="1" applyFill="1" applyAlignment="1"', '<alignment vertical="center" indent="1"/>'),
    xf('numFmtId="0" fontId="4" fillId="0" borderId="0" applyFont="1" applyAlignment="1"', '<alignment vertical="top" wrapText="1"/>'),
    xf('numFmtId="0" fontId="0" fillId="0" borderId="1" applyBorder="1" applyAlignment="1"', '<alignment vertical="top" wrapText="1"/>'),
    xf('numFmtId="165" fontId="0" fillId="0" borderId="1" applyNumberFormat="1" applyBorder="1" applyAlignment="1"', '<alignment vertical="top"/>'),
    xf('numFmtId="164" fontId="0" fillId="0" borderId="1" applyNumberFormat="1" applyBorder="1" applyAlignment="1"', '<alignment horizontal="center" vertical="top"/>'),
    xf('numFmtId="0" fontId="0" fillId="0" borderId="1" applyBorder="1" applyAlignment="1"', '<alignment horizontal="right" vertical="top"/>'),
    xf('numFmtId="0" fontId="3" fillId="3" borderId="0" applyFont="1" applyFill="1" applyAlignment="1"', '<alignment vertical="top" wrapText="1" indent="1"/>')
  ];
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="&quot;$&quot;\\ #,##0"/></numFmts>
<fonts count="6">
<font><sz val="11"/><color rgb="FF13332A"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="18"/><color rgb="FF0B4D3B"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="11"/><color rgb="FF0B4D3B"/><name val="Calibri"/><family val="2"/></font>
<font><i/><sz val="10"/><color rgb="FF5A6F68"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="12"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>
</fonts>
<fills count="6">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF0B4D3B"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFEEF4EF"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFFF4DC"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF188B58"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>${borde}</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
<dxfs count="0"/><tableStyles count="0" defaultTableStyle="TableStyleMedium9" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>`;
}

// ───────── Acceso al paquete zip ─────────
function abrirPaquete(u8) {
  const X = libreria();
  const cfb = X.CFB.read(u8, { type: 'array' });
  const indice = (ruta) => cfb.FullPaths.findIndex((p) => p.endsWith(`/${ruta}`));
  const leer = (ruta) => { const i = indice(ruta); return i < 0 ? null : new TextDecoder().decode(cfb.FileIndex[i].content); };
  const escribir = (ruta, contenido) => {
    const datos = typeof contenido === 'string' ? new TextEncoder().encode(contenido) : contenido;
    const i = indice(ruta);
    if (i >= 0) { cfb.FileIndex[i].content = datos; cfb.FileIndex[i].size = datos.length; } else X.CFB.utils.cfb_add(cfb, ruta, datos);
  };
  const cerrar = () => new Uint8Array(X.CFB.write(cfb, { fileType: 'zip', type: 'array', compression: true }));
  return { leer, escribir, cerrar };
}

const letraCol = (n) => { let s = ''; let x = n + 1; while (x > 0) { const m = (x - 1) % 26; s = String.fromCharCode(65 + m) + s; x = Math.floor((x - 1) / 26); } return s; };
const numeroCol = (letras) => letras.split('').reduce((n, c) => n * 26 + (c.charCodeAt(0) - 64), 0) - 1;

// Aplica estilos celda a celda según una función (col, fila) → índice de estilo o undefined.
function estilizarCeldas(xml, fn) {
  return xml.replace(/<c r="([A-Z]+)(\d+)"([^>]*?)(\/?)>/g, (todo, col, fila, attrs, cierre) => {
    const s = fn(numeroCol(col), Number(fila));
    if (s === undefined) return todo;
    const limpio = attrs.replace(/\s+s="\d+"/, '');
    return `<c r="${col}${fila}"${limpio} s="${s}"${cierre}>`;
  });
}

function xmlValidaciones(validaciones) {
  if (!validaciones.length) return '';
  const items = validaciones.map((v) => {
    const comun = `allowBlank="1" showInputMessage="1" showErrorMessage="1" errorTitle="${escXml(v.tituloError || 'Valor no válido')}" error="${escXml(v.error || 'Elija un valor de la lista.')}"${v.prompt ? ` promptTitle="${escXml(v.promptTitulo || 'Ayuda')}" prompt="${escXml(v.prompt)}"` : ''} sqref="${v.rango}"`;
    if (v.tipo === 'lista') return `<dataValidation type="list" ${comun}><formula1>${escXml(v.fuente)}</formula1></dataValidation>`;
    if (v.tipo === 'decimal') return `<dataValidation type="decimal" operator="greaterThanOrEqual" ${comun}><formula1>${v.minimo ?? 0}</formula1></dataValidation>`;
    if (v.tipo === 'fecha') return `<dataValidation type="date" operator="between" ${comun}><formula1>${v.desde}</formula1><formula2>${v.hasta}</formula2></dataValidation>`;
    return '';
  }).join('');
  return `<dataValidations count="${validaciones.length}">${items}</dataValidations>`;
}

/*
 * Post-proceso de una hoja. op = {
 *   colEstilos: [índice de estilo por columna] | null, anchos: [wch],
 *   estiloCelda: fn(col, fila) → estilo, congelarFila: n, ocultarCuadricula, proteger,
 *   validaciones: [], colorPestana: 'FF0B4D3B', drawingRelId
 * }
 */
// Inserta un fragmento antes del primer elemento encontrado (respeta el orden del esquema OOXML).
function insertarAntes(xml, marcas, fragmento) {
  const posiciones = marcas.map((m) => xml.indexOf(m)).filter((i) => i >= 0);
  const i = Math.min(...posiciones);
  return `${xml.slice(0, i)}${fragmento}${xml.slice(i)}`;
}

function procesarHoja(xml, op) {
  let x = xml;
  if (op.colorPestana && !x.includes('<sheetPr')) x = x.replace('<dimension', `<sheetPr><tabColor rgb="${op.colorPestana}"/></sheetPr><dimension`);
  const vista = `<sheetView workbookViewId="0"${op.ocultarCuadricula ? ' showGridLines="0"' : ''}${op.zoom ? ` zoomScale="${op.zoom}" zoomScaleNormal="${op.zoom}"` : ''}>${op.congelarFila ? `<pane ySplit="${op.congelarFila}" topLeftCell="A${op.congelarFila + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${op.congelarFila + 1}" sqref="A${op.congelarFila + 1}"/>` : ''}</sheetView>`;
  if (/<sheetViews>.*?<\/sheetViews>/.test(x)) x = x.replace(/<sheetViews>.*?<\/sheetViews>/, `<sheetViews>${vista}</sheetViews>`);
  else x = x.replace(/(<dimension[^>]*\/>)/, `$1<sheetViews>${vista}</sheetViews>`);
  if (op.anchos) {
    const cols = op.anchos.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${(w + 0.83).toFixed(2)}" customWidth="1"${op.colEstilos && op.colEstilos[i] !== undefined ? ` style="${op.colEstilos[i]}"` : ''}/>`).join('');
    if (/<cols>.*?<\/cols>/.test(x)) x = x.replace(/<cols>.*?<\/cols>/, `<cols>${cols}</cols>`);
    else x = x.replace('<sheetData', `<cols>${cols}</cols><sheetData`);
  }
  if (op.estiloCelda) x = estilizarCeldas(x, op.estiloCelda);
  // Evita la marca verde de "número almacenado como texto" en todo el rango (SheetJS la agrega)
  let cola = '';
  if (op.proteger) cola += '<sheetProtection sheet="1" objects="1" scenarios="1" formatColumns="0" formatRows="0"/>';
  x = x.replace('</sheetData>', `</sheetData>${cola}`);
  const dv = xmlValidaciones(op.validaciones || []);
  if (dv) x = insertarAntes(x, ['<hyperlinks', '<printOptions', '<pageMargins', '<pageSetup', '<headerFooter', '<rowBreaks', '<colBreaks', '<ignoredErrors', '<drawing', '<legacyDrawing', '<tableParts', '<extLst', '</worksheet>'], dv);
  if (op.drawingRelId) x = insertarAntes(x, ['<legacyDrawing', '<picture', '<oleObjects', '<controls', '<tableParts', '<extLst', '</worksheet>'], `<drawing r:id="${op.drawingRelId}"/>`);
  return x;
}

// Inserta el logo institucional como imagen flotante en la hoja n (1 = primera).
function agregarLogo(paquete, n, bytes, { altoPx = 74, col = 0, fila = 0 } = {}) {
  const anchoPx = Math.round(altoPx * (522 / 383));
  const emu = (px) => Math.round(px * 9525);
  paquete.escribir(`xl/media/logo-etitc-${n}.png`, bytes);
  paquete.escribir(`xl/drawings/drawing${n}.xml`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><xdr:oneCellAnchor><xdr:from><xdr:col>${col}</xdr:col><xdr:colOff>${emu(8)}</xdr:colOff><xdr:row>${fila}</xdr:row><xdr:rowOff>${emu(6)}</xdr:rowOff></xdr:from><xdr:ext cx="${emu(anchoPx)}" cy="${emu(altoPx)}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="2" name="Logo ETITC" descr="Logo de la Escuela Tecnológica Instituto Técnico Central"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${emu(anchoPx)}" cy="${emu(altoPx)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>`);
  paquete.escribir(`xl/drawings/_rels/drawing${n}.xml.rels`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdImg1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/logo-etitc-${n}.png"/></Relationships>`);
  const relRuta = `xl/worksheets/_rels/sheet${n}.xml.rels`;
  const relDibujo = `<Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${n}.xml"/>`;
  const existente = paquete.leer(relRuta);
  paquete.escribir(relRuta, existente
    ? existente.replace('</Relationships>', `${relDibujo}</Relationships>`)
    : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relDibujo}</Relationships>`);
  let tipos = paquete.leer('[Content_Types].xml');
  if (!tipos.includes('Extension="png"')) tipos = tipos.replace('<Default Extension="xml"', '<Default Extension="png" ContentType="image/png"/><Default Extension="xml"');
  tipos = tipos.replace('</Types>', `<Override PartName="/xl/drawings/drawing${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>`);
  paquete.escribir('[Content_Types].xml', tipos);
  return 'rIdLogo';
}

function postProcesar(u8, { hojas, logo, calcularAlAbrir = false }) {
  const p = abrirPaquete(u8);
  p.escribir('xl/styles.xml', estilosXml());
  hojas.forEach((op, i) => {
    const n = i + 1;
    const ruta = `xl/worksheets/sheet${n}.xml`;
    const xml = p.leer(ruta);
    if (!xml) return;
    let drawingRelId = null;
    if (op.logo && logo) drawingRelId = agregarLogo(p, n, logo, op.logo === true ? {} : op.logo);
    p.escribir(ruta, procesarHoja(xml, { ...op, drawingRelId }));
  });
  if (calcularAlAbrir) {
    let wb = p.leer('xl/workbook.xml');
    const calc = '<calcPr calcId="191029" fullCalcOnLoad="1"/>';
    wb = wb.includes('</definedNames>') ? wb.replace('</definedNames>', `</definedNames>${calc}`) : wb.replace('</sheets>', `</sheets>${calc}`);
    p.escribir('xl/workbook.xml', wb);
  }
  return p.cerrar();
}

function escribirLibro(wb, opcionesPost) {
  const X = libreria();
  const base = new Uint8Array(X.write(wb, { type: 'array', bookType: 'xlsx', compression: true }));
  try {
    return { bytes: postProcesar(base, opcionesPost), conFormato: true };
  } catch (e) {
    console.warn('No se pudo aplicar el formato institucional al Excel; se entrega sin formato.', e);
    return { bytes: base, conFormato: false };
  }
}

const tipoMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// ───────── Plantilla de formulación ─────────
/*
 * ctx = { persona: {nombre, correo, cargo}, dependencia: {codigo, nombre}, dependencias, metas, modalidades,
 *         festivos, config, logo (Uint8Array|null), ejemplo: false }
 */
export function generarPlantilla(ctx) {
  const X = libreria();
  const filasEd = ctx.config?.plantilla?.filasEditables || FILAS_EDITABLES_DEFECTO;
  const ultima = filasEd + 1;
  const tipos = ctx.config?.plantilla?.tiposNecesidad || TIPOS_NECESIDAD.map((t) => t.nombre);
  const trimestres = ctx.config?.plantilla?.trimestres || ['T1', 'T2', 'T3', 'T4'];
  const metas = ctx.metas || [];
  const lineas = metas.flatMap((m) => (m.lineasPDI || []).map((l) => ({ ...l, metaId: m.id })));
  const deps = ctx.dependencias || [];
  const mods = ctx.modalidades || [];
  const fest = ctx.festivos || [];
  const dep = ctx.dependencia;
  const etiquetaDep = (d) => `${d.codigo} — ${d.nombre}`;
  const wb = X.utils.book_new();
  const umbral = ctx.config?.umbrales?.maxAccionesPorDependencia ?? 15;

  // Hoja Instructivo
  const regla = 'En 2026 el plan se llenó de productos para dar cumplimiento. En 2027 el criterio cambia: la evidencia se consolida en informes macro de peso y valor, que recojan el cumplimiento de la meta de manera agregada, en lugar de calificar semana a semana lotes de productos menores. Se robustece la evidencia sin aumentar el volumen.';
  const sec = (t) => [t, ''];
  const inst = [
    [null, null], [null, 'Jornada de Planeación 2027 — Plantilla de formulación'], [null, 'Oficina Asesora de Planeación y Desarrollo Institucional · Escuela Tecnológica Instituto Técnico Central'], [null, null],
    [null, null],
    ['Dependencia que formula', dep ? etiquetaDep(dep) : ' '],
    ['Diligenciado por', ctx.persona?.nombre || ' '],
    ['Correo institucional', ctx.persona?.correo || ' '],
    ['Plantilla generada', `${fechaLarga(hoyISO())}, ${horaLegible()}`],
    [null, null],
    sec('QUÉ SE PIDE'),
    ['Objetivo', 'Formular la planeación 2027 de la dependencia en un solo archivo: las acciones que aportan a las metas institucionales, las necesidades que esas acciones generan y las adquisiciones que resuelven esas necesidades.'],
    ['Entrega', 'Cargue este archivo en el aplicativo de la jornada (pestaña «Formulación y pase», paso 3). Si no tiene errores bloqueantes, el aplicativo emite su pase de acceso.'],
    [null, null],
    sec('LA CADENA LÓGICA'),
    ['Regla', 'Metas 2027  →  Plan de acción  →  Plan de necesidades  →  Plan de adquisiciones'],
    ['Qué significa', 'Nada existe aguas abajo sin su eslabón aguas arriba. Toda acción aporta a una meta 2027 y a una línea del PDI. Toda necesidad nace de una acción (columna «Código de acción que la origina»). Toda adquisición resuelve una necesidad (columna «Código de necesidad»). Una necesidad sin acción o una adquisición sin necesidad son inválidas.'],
    [null, null],
    sec('HOJA POR HOJA'),
    ['Acciones', `Una fila por acción. Use códigos únicos (A-01, A-02…). Elija meta y línea en las listas desplegables. El indicador debe tener unidad de medida y meta cuantitativa (solo el número). Sugerencia: no más de ${umbral} acciones por dependencia.`],
    ['Necesidades', 'Una fila por necesidad. Use códigos únicos (N-01, N-02…). En «Código de acción que la origina» elija el código de una acción de la hoja Acciones. Tipo: bien, servicio, talento humano o infraestructura. Valor estimado en pesos.'],
    ['Adquisiciones', 'Una fila por compra o contrato. En «Código de necesidad» elija una necesidad de la hoja Necesidades. Elija la modalidad y la fecha en que necesita el bien o servicio operando: la columna «Fecha límite de radicación de estudios previos» se calcula sola, en días hábiles, descontando fines de semana y festivos.'],
    ['Listas', 'Contiene los catálogos que alimentan las listas desplegables (dependencias, metas, líneas, modalidades, trimestres, tipos y festivos). No la modifique.'],
    [null, null],
    sec('CÓMO VAMOS A REPORTAR EN 2027'),
    ['Regla de evidencia macro', regla],
    ['En la práctica', 'En la columna «Evidencia macro comprometida» describa el informe que consolidará el cumplimiento de la acción (por ejemplo: «Informe semestral de permanencia con análisis por sede»), no la lista de productos menores.'],
    [null, null],
    sec('ERRORES MÁS COMUNES'),
    ['1', 'Necesidades que apuntan a un código de acción que no existe o que se escribió distinto (A1 en vez de A-01).'],
    ['2', 'Adquisiciones sin código de necesidad, o con un código que no está en la hoja Necesidades.'],
    ['3', 'Acciones sin meta 2027 o sin línea del PDI.'],
    ['4', 'Indicadores sin unidad de medida o con texto en «Meta cuantitativa» (escriba solo el número).'],
    ['5', 'Trimestre de cierre anterior al trimestre de inicio.'],
    ['6', `Atomizar: más de ${umbral} acciones pequeñas en lugar de pocas acciones con informes macro.`],
    ['7', 'Valores estimados en cero o vacíos.'],
    ['8', 'Cambiar el nombre de las hojas o de los encabezados: el aplicativo ya no podrá leer el archivo.'],
    [null, null],
    sec('CÓMO SE VALIDA'),
    ['Bloqueante', 'Impide emitir el pase. Debe corregirse y volver a cargar el archivo.'],
    ['Advertencia', 'Deja emitir el pase, pero queda registrada para la revisión de la OAPDI.'],
    [null, null],
    ['Datos provisionales', 'Las metas, líneas del PDI, modalidades y tiempos de contratación de esta plantilla son PROVISIONALES hasta su aprobación por la OAPDI.']
  ];
  const wsI = X.utils.aoa_to_sheet(inst);
  wsI['!cols'] = [{ wch: 30 }, { wch: 112 }];
  wsI['!rows'] = [{ hpt: 20 }, { hpt: 30 }, { hpt: 18 }, { hpt: 18 }];
  X.utils.book_append_sheet(wb, wsI, HOJAS.instructivo);
  const filaSeccion = new Set(inst.map((r, i) => (r[1] === '' && r[0] && r[0] === r[0].toUpperCase() ? i + 1 : null)).filter(Boolean));
  const filaRegla = inst.findIndex((r) => r[0] === 'Regla de evidencia macro') + 1;
  const filaProv = inst.length;

  // Hojas de datos
  const hojaDatos = (nombre) => {
    const cols = ESQUEMA[nombre];
    const ws = X.utils.aoa_to_sheet([cols.map((c) => c.titulo)]);
    ws['!cols'] = cols.map((c) => ({ wch: c.ancho }));
    ws['!rows'] = [{ hpt: 42 }];
    ws['!ref'] = `A1:${letraCol(cols.length - 1)}${ultima}`;
    return ws;
  };
  const wsA = hojaDatos('Acciones');
  const wsN = hojaDatos('Necesidades');
  const wsQ = hojaDatos('Adquisiciones');
  for (let r = 2; r <= ultima; r += 1) {
    wsQ[`E${r}`] = { t: 'n', f: `IF(OR(B${r}="",D${r}=""),"",IFERROR(WORKDAY(D${r},-VLOOKUP(B${r},TablaModalidades,2,FALSE),Festivos),"Revise la modalidad"))` };
  }

  // Ejemplo diligenciado (para capacitación y pruebas)
  if (ctx.ejemplo) llenarEjemplo(X, { wsA, wsN, wsQ, metas, lineas, mods, dep });

  X.utils.book_append_sheet(wb, wsA, HOJAS.acciones);
  X.utils.book_append_sheet(wb, wsN, HOJAS.necesidades);
  X.utils.book_append_sheet(wb, wsQ, HOJAS.adquisiciones);

  // Hoja Listas
  const listas = [['Dependencias', 'Metas institucionales 2027', 'Líneas del PDI', 'Modalidades de contratación', 'Días hábiles del trámite', 'Trimestres', 'Tipos de necesidad', 'Festivos', 'Nombre del festivo']];
  const largo = Math.max(deps.length, metas.length, lineas.length, mods.length, trimestres.length, tipos.length, fest.length);
  for (let i = 0; i < largo; i += 1) {
    const m = mods[i];
    listas.push([
      deps[i] ? etiquetaDep(deps[i]) : null,
      metas[i] ? `${metas[i].id} — ${metas[i].nombre}` : null,
      lineas[i] ? `${lineas[i].id} — ${lineas[i].nombre}` : null,
      m ? m.nombre : null,
      m ? (m.etapas || []).reduce((s, e) => s + Number(e.diasHabiles || 0), 0) || m.diasHabilesTotales : null,
      trimestres[i] || null,
      tipos[i] || null,
      fest[i] ? serieExcel(fest[i].fecha) : null,
      fest[i] ? fest[i].nombre : null
    ]);
  }
  const wsL = X.utils.aoa_to_sheet(listas);
  wsL['!cols'] = [{ wch: 52 }, { wch: 44 }, { wch: 52 }, { wch: 36 }, { wch: 14 }, { wch: 11 }, { wch: 18 }, { wch: 13 }, { wch: 30 }];
  wsL['!rows'] = [{ hpt: 32 }];
  X.utils.book_append_sheet(wb, wsL, HOJAS.listas);

  const rango = (col, n) => `Listas!$${col}$2:$${col}$${Math.max(2, n + 1)}`;
  wb.Workbook = {
    Names: [
      { Name: 'LST_Dependencias', Ref: rango('A', deps.length) },
      { Name: 'LST_Metas', Ref: rango('B', metas.length) },
      { Name: 'LST_Lineas', Ref: rango('C', lineas.length) },
      { Name: 'LST_Modalidades', Ref: rango('D', mods.length) },
      { Name: 'TablaModalidades', Ref: `Listas!$D$2:$E$${Math.max(2, mods.length + 1)}` },
      { Name: 'LST_Trimestres', Ref: rango('F', trimestres.length) },
      { Name: 'LST_Tipos', Ref: rango('G', tipos.length) },
      { Name: 'Festivos', Ref: rango('H', fest.length) },
      { Name: 'LST_CodigosAccion', Ref: `Acciones!$A$2:$A$${ultima}` },
      { Name: 'LST_CodigosNecesidad', Ref: `Necesidades!$A$2:$A$${ultima}` }
    ]
  };

  const estiloColumna = (c) => ({ numero: S.entradaNumero, moneda: S.entradaMoneda, fecha: S.entradaFecha, formula: S.formulaFecha }[c.tipo] ?? S.entrada);
  const opsDatos = (nombre, validaciones, extra = {}) => ({
    anchos: ESQUEMA[nombre].map((c) => c.ancho),
    colEstilos: ESQUEMA[nombre].map(estiloColumna),
    estiloCelda: (col, fila) => (fila === 1 ? S.encabezado : (ESQUEMA[nombre][col] ? estiloColumna(ESQUEMA[nombre][col]) : undefined)),
    congelarFila: 1,
    proteger: true,
    colorPestana: 'FF188B58',
    validaciones,
    ...extra
  });
  const r = (col) => `${col}2:${col}${ultima}`;
  const lista = (col, fuente, prompt) => ({ tipo: 'lista', rango: r(col), fuente, prompt, error: 'Elija un valor de la lista desplegable.' });
  const numeroPos = (col, prompt) => ({ tipo: 'decimal', rango: r(col), minimo: 0, prompt, error: 'Escriba un número mayor o igual a cero, sin texto.' });

  const { bytes, conFormato } = escribirLibro(wb, {
    logo: ctx.logo,
    calcularAlAbrir: true,
    hojas: [
      {
        anchos: [30, 112],
        estiloCelda: (col, fila) => {
          if (fila === 2 && col === 1) return S.titulo;
          if (fila === 3 && col === 1) return S.subtitulo;
          if (fila >= 6 && fila <= 9) return col === 0 ? S.etiqueta : (fila <= 8 ? S.entrada : S.texto);
          if (filaSeccion.has(fila)) return S.seccion;
          if (fila === filaRegla && col === 1) return S.cita;
          if (fila === filaProv) return S.nota;
          return col === 0 ? S.etiqueta : S.texto;
        },
        ocultarCuadricula: true,
        proteger: true,
        colorPestana: 'FF0B4D3B',
        logo: { altoPx: 74, col: 0, fila: 0 },
        validaciones: [{ tipo: 'lista', rango: 'B6', fuente: 'LST_Dependencias', prompt: 'Elija su dependencia de la lista.', error: 'Elija una dependencia de la lista.' }]
      },
      opsDatos('Acciones', [
        lista('B', 'LST_Lineas', 'Elija la línea del Plan de Desarrollo Institucional.'),
        lista('C', 'LST_Metas', 'Elija la meta institucional 2027 a la que aporta.'),
        numeroPos('H', 'Solo el número. La unidad va en la columna anterior.'),
        lista('I', 'LST_Trimestres'), lista('J', 'LST_Trimestres')
      ]),
      opsDatos('Necesidades', [
        lista('B', 'LST_CodigosAccion', 'Elija el código de una acción de la hoja Acciones.'),
        lista('C', 'LST_Tipos'),
        numeroPos('E'), numeroPos('F', 'Valor en pesos colombianos.'),
        lista('G', 'LST_Trimestres')
      ]),
      opsDatos('Adquisiciones', [
        lista('A', 'LST_CodigosNecesidad', 'Elija el código de una necesidad de la hoja Necesidades.'),
        lista('B', 'LST_Modalidades'),
        numeroPos('C', 'Valor en pesos colombianos.'),
        { tipo: 'fecha', rango: r('D'), desde: serieExcel('2026-01-01'), hasta: serieExcel('2028-12-31'), prompt: 'Fecha en que necesita el bien o servicio operando (dd/mm/aaaa).', error: 'Escriba una fecha entre 2026 y 2028 con formato dd/mm/aaaa.' }
      ]),
      {
        anchos: [52, 44, 52, 36, 14, 11, 18, 13, 30],
        estiloCelda: (col, fila) => (fila === 1 ? S.encabezado : col === 7 ? S.fechaBloqueada : S.celda),
        congelarFila: 1,
        proteger: true,
        colorPestana: 'FF6D847C'
      }
    ]
  });
  const sufijo = dep ? `${dep.codigo}-${(dep.sigla || '').replace(/[^A-Za-z0-9]/g, '')}` : 'ETITC';
  return {
    blob: new Blob([bytes], { type: tipoMime }),
    nombre: `JP2027_${ctx.ejemplo ? 'Ejemplo' : 'Plantilla'}_${sufijo}.xlsx`,
    conFormato
  };
}

// Datos de ejemplo coherentes con el catálogo (sirven para capacitación y para probar la validación).
function llenarEjemplo(X, { wsA, wsN, wsQ, metas, lineas, mods, dep }) {
  const l = (i) => (lineas[i] ? `${lineas[i].id} — ${lineas[i].nombre}` : '');
  const m = (id) => { const x = metas.find((y) => y.id === id); return x ? `${x.id} — ${x.nombre}` : ''; };
  const linea0 = lineas[0] || { metaId: metas[0]?.id };
  const linea1 = lineas[3] || linea0;
  const mod = (id) => (mods.find((x) => x.id === id) || mods[0] || {}).nombre || '';
  const responsable = dep ? `Coordinación ${dep.sigla || dep.nombre}` : 'Coordinación de la dependencia';
  X.utils.sheet_add_aoa(wsA, [
    ['A-01', l(0), m(linea0.metaId), 'Autoevaluación de programas con plan de mejoramiento', 'Ciclo de autoevaluación de los programas con plan de mejoramiento priorizado', 'Programas autoevaluados', 'Programas', 5, 'T1', 'T3', responsable, 'Informe consolidado de autoevaluación y plan de mejoramiento 2027'],
    ['A-02', l(3), m(linea1.metaId), 'Dotación de talleres para nuevas sedes', 'Equipamiento de los talleres de las sedes en ampliación', 'Talleres dotados en operación', 'Talleres', 3, 'T2', 'T4', responsable, 'Informe semestral de dotación y uso de talleres por sede']
  ], { origin: 'A2' });
  X.utils.sheet_add_aoa(wsN, [
    ['N-01', 'A-01', 'Servicio', 'Acompañamiento experto para la autoevaluación', 1, 45000000, 'T1', 'Se requiere apoyo metodológico externo para el ciclo'],
    ['N-02', 'A-02', 'Bien', 'Bancos de trabajo y herramientas para taller', 12, 180000000, 'T2', 'Dotación mínima para operar los talleres de la nueva sede'],
    ['N-03', 'A-02', 'Infraestructura', 'Adecuación eléctrica de talleres', 1, 95000000, 'T2', 'Los equipos requieren red eléctrica trifásica']
  ], { origin: 'A2' });
  X.utils.sheet_add_aoa(wsQ, [
    ['N-01', mod('minima'), 45000000, null, null, 'Contrato de consultoría'],
    ['N-02', mod('abreviada'), 180000000, null, null, 'Compra consolidada con otras dependencias'],
    ['N-03', mod('abreviada'), 95000000, null, null, 'Obra menor']
  ], { origin: 'A2' });
  const fechas = ['2027-03-01', '2027-06-01', '2027-05-03'];
  fechas.forEach((f, i) => { wsQ[`D${i + 2}`] = { t: 'n', v: serieExcel(f) }; });
}

// ───────── Lectura ─────────
export async function leerLibro(archivo) {
  const X = libreria();
  if (!archivo) throw new Error('No se recibió ningún archivo.');
  if (archivo.size > 15 * 1024 * 1024) throw new Error('El archivo pesa más de 15 MB. Verifique que sea la plantilla de la jornada.');
  if (!/\.(xlsx|xls|xlsm)$/i.test(archivo.name)) throw new Error('El archivo debe ser de Excel (.xlsx o .xls).');
  const datos = new Uint8Array(await archivo.arrayBuffer());
  let wb;
  try {
    wb = X.read(datos, { type: 'array', cellDates: true, cellFormula: false });
  } catch (e) {
    throw new Error('No fue posible abrir el archivo. Puede estar dañado o protegido con contraseña.');
  }
  const hojas = {};
  wb.SheetNames.forEach((nombre) => {
    const ws = wb.Sheets[nombre];
    if (!ws || !ws['!ref']) { hojas[nombre] = []; return; }
    const r = X.utils.decode_range(ws['!ref']);
    hojas[nombre] = X.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, blankrows: true, range: { s: { r: 0, c: 0 }, e: r.e } });
  });
  return { nombreArchivo: archivo.name, hojas };
}

// ───────── Exportación de tablas ─────────
/*
 * hojas: [{ nombre, titulo, subtitulo, columnas: [{ titulo, ancho, tipo: 'texto'|'moneda'|'fecha'|'numero' }], filas: [[...]] }]
 */
export function exportarExcel({ nombreArchivo, hojas, logo = null }) {
  const X = libreria();
  const wb = X.utils.book_new();
  const FILA_ENC = 6;
  const ops = [];
  hojas.forEach((h) => {
    // El título va en la primera columna que queda libre a la derecha del logo (unos 115 px)
    const px = (c) => (c?.ancho || 18) * 7 + 5;
    const colTit = px(h.columnas[0]) >= 118 ? 1 : 2;
    const enCol = (v) => { const f = [null, null, null]; f[colTit] = v; return f.slice(0, colTit + 1); };
    const aoa = [
      [null], enCol(h.titulo || ''), enCol(h.subtitulo || ''), enCol(`Generado el ${fechaLarga(hoyISO())}, ${horaLegible()} · Jornada de Planeación 2027 · OAPDI`), [null],
      h.columnas.map((c) => c.titulo),
      ...h.filas.map((f) => f.map((v, i) => {
        const t = h.columnas[i]?.tipo;
        if (v === null || v === undefined || v === '') return null;
        if (t === 'fecha') return /^\d{4}-\d{2}-\d{2}/.test(String(v)) ? serieExcel(String(v).slice(0, 10)) : v;
        if (t === 'moneda' || t === 'numero') return Number(v);
        return v;
      }))
    ];
    const ws = X.utils.aoa_to_sheet(aoa);
    ws['!cols'] = h.columnas.map((c) => ({ wch: c.ancho || 18 }));
    ws['!rows'] = [{ hpt: 22 }, { hpt: 26 }, { hpt: 18 }, { hpt: 18 }, { hpt: 8 }, { hpt: 34 }];
    if (h.filas.length) ws['!autofilter'] = { ref: `A${FILA_ENC}:${letraCol(h.columnas.length - 1)}${FILA_ENC + h.filas.length}` };
    X.utils.book_append_sheet(wb, ws, h.nombre.slice(0, 31));
    const estiloDato = (c) => ({ moneda: S.celdaMoneda, fecha: S.celdaFecha, numero: S.celdaNumero }[c?.tipo] ?? S.celda);
    ops.push({
      anchos: h.columnas.map((c) => c.ancho || 18),
      estiloCelda: (col, fila) => {
        if (fila === 2) return S.titulo;
        if (fila === 3 || fila === 4) return S.subtitulo;
        if (fila === FILA_ENC) return S.encabezado;
        if (fila > FILA_ENC) return estiloDato(h.columnas[col]);
        return undefined;
      },
      congelarFila: FILA_ENC,
      colorPestana: 'FF188B58',
      logo: { altoPx: 74, col: 0, fila: 0 }
    });
  });
  const { bytes } = escribirLibro(wb, { hojas: ops, logo });
  return { blob: new Blob([bytes], { type: tipoMime }), nombre: nombreArchivo };
}
