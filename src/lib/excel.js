/*
 * excel.js — Exportación a Excel con SheetJS: registro de formulaciones y asistencia, con encabezado
 * institucional y logo. (Las plantillas que diligencian las áreas son las oficiales de la Oficina Asesora de
 * Planeación y se descargan tal cual desde assets/plantillas; su lectura está en libro.js.)
 *
 * SheetJS Community no escribe estilos ni validaciones de datos, así que el libro se genera con SheetJS
 * y luego se post-procesa el paquete OOXML (zip) con XLSX.CFB para agregar: estilos institucionales,
 * listas desplegables, protección de celdas, paneles inmovilizados, cálculo al abrir y el logo.
 * Si el post-proceso falla por cualquier motivo se entrega el libro de SheetJS sin estilos (degradación).
 */
import { serieExcel, hoyISO, fechaLarga, horaLegible } from './fechas.js';

// Índices de estilo (cellXfs) definidos en estilosXml()
const S = {
  normal: 0, encabezado: 1, entrada: 2, entradaFecha: 3, formulaFecha: 4, titulo: 5, texto: 6, etiqueta: 7,
  entradaMoneda: 8, entradaNumero: 9, fechaBloqueada: 10, nota: 11, seccion: 12, subtitulo: 13,
  celda: 14, celdaMoneda: 15, celdaFecha: 16, celdaNumero: 17, cita: 18
};

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
