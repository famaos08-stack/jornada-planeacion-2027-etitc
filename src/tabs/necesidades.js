/*
 * necesidades.js — Pestaña 3: Plan de necesidades.
 * El formato está en la misma Plantilla Plan de Acción 2027 (hoja PlandeNecesidades), así que la descarga usa
 * el mismo registro. La pestaña explica cómo se relaciona cada necesidad con una acción, cómo buscar el código
 * UNSPSC en el clasificador de Colombia Compra Eficiente y qué errores de 2026 no deben repetirse.
 */
import { estado, on as alEvento } from '../estado.js';
import { esc, on } from '../ui/dom.js';
import { icono } from '../ui/iconos.js';
import { toast } from '../ui/toast.js';
import { registrarYDescargar, identificacion, descargarArchivo } from '../ui/registro-descarga.js';

let raiz = null;

const PASOS_UNSPSC = [
  ['Abra el clasificador', 'Entre al clasificador de bienes y servicios de Colombia Compra Eficiente con el botón de esta tarjeta.'],
  ['Piense en el bien o el servicio', 'Escriba en pocas palabras lo que va a contratar, por ejemplo «computador portátil» o «servicios de aseo», no el nombre de la acción.'],
  ['Busque por palabra o por código', 'Use el buscador. Si la Escuela usó un código parecido en 2026, también puede buscarlo por número.'],
  ['O navegue por niveles', 'Baje en orden por grupo, segmento, familia, clase y producto.'],
  ['Elija la denominación que mejor describe el objeto', 'Al seleccionarla, el clasificador muestra el código de ocho dígitos y su nombre.'],
  ['Prefiera el producto', 'Use los ocho dígitos del producto. Si el objeto agrupa varios productos, use la clase, que termina en 00.'],
  ['Regístrelo como número', 'Columna M de la hoja PlandeNecesidades, sin espacios ni puntos. Los códigos adicionales van en la columna N separados por punto y coma.'],
  ['Verifique la alerta', 'La columna «Alerta de consistencia» debe decir OK.']
];

const ERRORES = [['207', 'valores escritos como texto, con $, puntos o comas'], ['43', 'códigos UNSPSC vacíos, en texto o varios en una celda'], ['23', 'formas distintas de escribir la modalidad'], ['41', 'necesidades de mínima cuantía por encima del tope'], ['42', 'registros sin correo del responsable']];

function montar(panel, ctx) {
  raiz = panel;
  const url = estado.datos.config?.clasificadorUNSPSC || 'https://operaciones.colombiacompra.gov.co/clasificador-de-bienes-y-servicios';
  const man = estado.datos.config?.descargas?.manualEjemplos;
  panel.innerHTML = `<div class="container page page-app">
    <header class="app-hero reveal">
      <span class="eyebrow">${icono('necesidades', 'icon-sm')}Plan de necesidades 2027</span>
      <h1>Lo que su área necesita contratar</h1>
      <p class="lead">Cada bien, obra o servicio se amarra a una <strong>acción</strong> de su Plan de acción y, por ella, a una meta del PDI. Con este plan el GIT de Contratación arma el <strong>Plan Anual de Adquisiciones</strong>, que se publica a más tardar el 31 de enero de 2027.</p>
    </header>
    <ol class="cadena-pn reveal" aria-label="Cadena de la necesidad">
      <li><span>Meta del PDI</span></li><li><span>Acción 2027</span></li><li><span>Necesidad</span></li><li><span>Plan Anual de Adquisiciones</span></li>
    </ol>
    <article class="descarga descarga-principal reveal">
      <span class="descarga-ico">${icono('excel', 'icon-lg')}</span>
      <div class="descarga-info">
        <div class="row" style="gap:8px"><strong>Formato del Plan de Necesidades</strong><span class="badge badge-solid">Hoja PlandeNecesidades</span></div>
        <p class="mb-0">Viene dentro de la Plantilla Plan de Acción 2027, con su instructivo y el enlace al clasificador. Si ya descargó la plantilla, no necesita otro archivo.</p>
      </div>
      <button type="button" class="btn btn-primary btn-lg" data-descargar>${icono('descargar', 'icon-sm')}<span data-txt>Descargar</span></button>
    </article>
    <section class="card reveal" aria-labelledby="h-unspsc">
      <div class="card-head"><div><h2 id="h-unspsc" class="mb-0">El código UNSPSC, paso a paso</h2><p>Es obligatorio en cada necesidad (Decreto 1082 de 2015). Es el mismo código que usan SECOP II, los estudios previos y los pliegos.</p></div></div>
      <ol class="pasos-lista">${PASOS_UNSPSC.map(([t, d], i) => `<li><span class="pasos-n">${i + 1}</span><div><strong>${esc(t)}</strong><p class="mb-0">${esc(d)}</p></div></li>`).join('')}</ol>
      <a class="btn btn-primary btn-block" href="${esc(url)}" target="_blank" rel="noopener">${icono('buscar', 'icon-sm')}Abrir el clasificador de Colombia Compra Eficiente</a>
      <div class="niveles-unspsc">
        <div><strong>80</strong><span>Segmento</span></div><div><strong>8011</strong><span>Familia</span></div><div><strong>801116<em>00</em></strong><span>Clase</span></div><div class="is-ok"><strong>80111601</strong><span>Producto</span></div>
      </div>
    </section>
    <section class="card reveal" aria-labelledby="h-rel">
      <h2 id="h-rel">Cómo se relaciona con el Plan de acción</h2>
      <ul class="check-lista">
        <li>${icono('check', 'icon-sm')}<span>Primero se formula la acción y después lo que ella requiere contratar.</span></li>
        <li>${icono('check', 'icon-sm')}<span>En la columna H la lista muestra solo las acciones de la meta elegida. Si es una acción propia del área, elija PROPIA y escriba su nombre.</span></li>
        <li>${icono('check', 'icon-sm')}<span>La justificación dice qué producto de la acción no podría lograrse sin la compra: es la base de los estudios previos.</span></li>
        <li>${icono('check', 'icon-sm')}<span>Una necesidad por fila y un objeto por necesidad. Lo que el área hace con su personal de planta no es una necesidad.</span></li>
      </ul>
    </section>
    <section class="card lecciones reveal" aria-labelledby="h-err">
      <div class="card-head"><div><h2 id="h-err" class="mb-0">Lo que no debe repetirse</h2><p>Errores encontrados al consolidar el plan 2026. El formato 2027 los previene con listas y con la alerta de consistencia.</p></div></div>
      <div class="cifras-grandes">${ERRORES.map(([n, t]) => `<div class="cifra-grande"><strong>${n}</strong><span>${esc(t)}</span></div>`).join('')}</div>
    </section>
    ${man ? `<article class="descarga descarga-pdf reveal">
      <span class="descarga-ico is-pdf">${icono('diana', 'icon-lg')}</span>
      <div class="descarga-info"><strong>${esc(man.titulo)}</strong><p class="mb-0">Incluye ejemplos de necesidades por eje y lo que dice Colombia Compra Eficiente.</p></div>
      <button type="button" class="btn" data-pdf>${icono('descargar', 'icon-sm')}PDF</button>
    </article>` : ''}
  </div>`;
  const txt = () => { panel.querySelector('[data-txt]').textContent = identificacion() ? 'Descargar de nuevo' : 'Registrarme y descargar'; };
  txt();
  on(panel, 'click', '[data-descargar]', async (ev, b) => {
    b.disabled = true;
    try {
      const r = await registrarYDescargar({ ctx, origen: 'necesidades' });
      if (r && !r.repetida) {
        toast({ tipo: 'ok', titulo: 'Su pase está listo', mensaje: 'Lo encuentra en la pestaña Plan de acción.' });
        ctx.ir('accion');
      }
    } finally { b.disabled = false; txt(); }
  });
  on(panel, 'click', '[data-pdf]', async () => { await descargarArchivo(man); toast({ tipo: 'ok', titulo: 'Descarga iniciada', mensaje: man.nombreDescarga }); });
  alEvento('identificacion', txt);
}

export const pestanaNecesidades = {
  id: 'necesidades',
  titulo: 'Plan de necesidades',
  tituloCorto: 'Plan de necesidades',
  tituloMovil: 'Necesidades',
  icono: 'necesidades',
  montar,
  alMostrar() { if (raiz) raiz.querySelector('[data-txt]').textContent = identificacion() ? 'Descargar de nuevo' : 'Registrarme y descargar'; }
};
