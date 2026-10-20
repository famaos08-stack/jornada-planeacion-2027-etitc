/*
 * graficas.js — Envoltorio de Chart.js con la identidad ETITC: barras delgadas con extremos redondeados,
 * una sola escala, cuadrícula discreta, tooltips y vista de tabla alterna. Si Chart.js no carga,
 * se muestra la tabla accesible en su lugar (degradación elegante).
 */
import { esc } from './dom.js';
import { icono } from './iconos.js';
import { PALETA } from '../config.js';
import { formatear } from '../lib/formato.js';

const instancias = new WeakMap();

function tablaRespaldo(etiquetas, series, formato) {
  return `<div class="table-wrap chart-fallback"><table class="table">
    <thead><tr><th scope="col">Categoría</th>${series.map((s) => `<th scope="col" class="num">${esc(s.nombre)}</th>`).join('')}</tr></thead>
    <tbody>${etiquetas.map((e, i) => `<tr><td>${esc(e)}</td>${series.map((s) => `<td class="num">${formatear(s.datos[i], s.formato || formato)}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></div>`;
}

// Dibuja una gráfica de barras. series: [{ nombre, datos: [], color? }]
export function graficaBarras(contenedor, { etiquetas, series, formato = 'entero', horizontal = false, apilada = false, alto = 260, titulo = '' }) {
  const anterior = instancias.get(contenedor);
  if (anterior) { try { anterior.destroy(); } catch { /* sin acción */ } }
  const hayDatos = series.some((s) => s.datos.some((v) => Number(v) > 0));
  const leyenda = series.length > 1
    ? `<div class="legend">${series.map((s, i) => `<span><span class="dot" style="color:${s.color || PALETA.categorica()[i % 4]}"></span>${esc(s.nombre)}</span>`).join('')}</div>`
    : '';
  contenedor.innerHTML = `
    <div class="chart-actions" style="justify-content:flex-end;margin-bottom:6px">
      <button type="button" class="btn btn-ghost btn-sm" data-ver-tabla aria-pressed="false">${icono('capas', 'icon-sm')}Ver como tabla</button>
    </div>
    <div class="chart-box" style="height:${alto}px"><canvas role="img" aria-label="${esc(titulo || 'Gráfica')}"></canvas></div>
    <div class="chart-table" hidden>${tablaRespaldo(etiquetas, series, formato)}</div>${leyenda}`;
  const caja = contenedor.querySelector('.chart-box');
  const tabla = contenedor.querySelector('.chart-table');
  const boton = contenedor.querySelector('[data-ver-tabla]');
  boton.addEventListener('click', () => {
    const verTabla = boton.getAttribute('aria-pressed') !== 'true';
    boton.setAttribute('aria-pressed', String(verTabla));
    boton.lastChild.textContent = verTabla ? 'Ver como gráfica' : 'Ver como tabla';
    caja.hidden = verTabla; tabla.hidden = !verTabla;
  });

  if (!window.Chart) {
    caja.hidden = true; tabla.hidden = false; boton.hidden = true;
    tabla.insertAdjacentHTML('afterbegin', '<p class="muted" style="font-size:.8rem">La librería de gráficas no cargó; se muestran los datos en tabla.</p>');
    return null;
  }
  if (!hayDatos) {
    caja.innerHTML = `<div class="empty" style="height:100%;padding:20px;border-style:dashed"><div class="empty-art" style="width:64px;height:64px">${icono('tendencia')}</div><p>Aún no hay datos para graficar.</p></div>`;
  }
  const texto = PALETA.leer('--muted', '#6d847c');
  const linea = PALETA.leer('--line', '#d7e4dc');
  const tinta = PALETA.leer('--ink', '#13332a');
  const superficie = PALETA.leer('--surface', '#ffffff');
  const cat = PALETA.categorica();
  if (!hayDatos) return null;
  const chart = new window.Chart(caja.querySelector('canvas'), {
    type: 'bar',
    data: {
      labels: etiquetas,
      datasets: series.map((s, i) => ({
        label: s.nombre,
        data: s.datos,
        backgroundColor: s.colores || s.color || (series.length === 1 ? PALETA.leer('--g7', '#188b58') : cat[i % 4]),
        borderRadius: 4,
        borderSkipped: 'start',
        borderColor: superficie,
        borderWidth: apilada ? { top: 2 } : 0,
        maxBarThickness: 34,
        categoryPercentage: 0.7,
        barPercentage: 0.86
      }))
    },
    options: {
      indexAxis: horizontal ? 'y' : 'x',
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 700, easing: 'easeOutCubic' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: tinta,
          titleColor: '#fff',
          bodyColor: '#fff',
          padding: 10,
          cornerRadius: 10,
          callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${formatear(ctx.parsed[horizontal ? 'x' : 'y'], series[ctx.datasetIndex].formato || formato)}` }
        }
      },
      scales: {
        x: {
          stacked: apilada,
          grid: { display: horizontal, color: linea, drawTicks: false },
          border: { display: false },
          ticks: { color: texto, font: { family: 'Inter', size: 12 }, maxRotation: 0, autoSkipPadding: 12, ...(horizontal ? { maxTicksLimit: 5, callback: (v) => formatear(v, formato === 'moneda' ? 'monedaCompacta' : formato) } : {}) }
        },
        y: {
          stacked: apilada,
          beginAtZero: true,
          grid: { display: !horizontal, color: linea, drawTicks: false },
          border: { display: false },
          ticks: { color: texto, font: { family: 'Inter', size: 12 }, ...(horizontal ? {} : { precision: 0, maxTicksLimit: 6, callback: (v) => formatear(v, formato === 'moneda' ? 'monedaCompacta' : formato) }) }
        }
      }
    }
  });
  instancias.set(contenedor, chart);
  return chart;
}
