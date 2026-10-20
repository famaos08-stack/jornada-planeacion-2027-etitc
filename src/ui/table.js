/*
 * table.js — Tabla maestra reutilizable: búsqueda, ordenamiento por cualquier columna, filtros, paginación,
 * filas navegables con teclado y estado vacío cuando el filtro no devuelve resultados.
 */
import { esc, uid } from './dom.js';
import { icono } from './iconos.js';
import { normalizar, entero } from '../lib/formato.js';

export function crearTabla(contenedor, opciones) {
  const {
    columnas,
    filtros = [],
    busqueda = true,
    placeholder = 'Buscar…',
    porPagina = 12,
    alClicFila = null,
    vacio = 'No hay registros que coincidan con la búsqueda o los filtros.',
    accionesHtml = '',
    alCambiar = null,
    etiqueta = 'Tabla de datos',
    pieTotales = null
  } = opciones;
  let filas = opciones.filas || [];
  const estado = { texto: '', orden: null, dir: 1, pagina: 1, filtros: {} };
  const idBusq = uid('busq');

  contenedor.innerHTML = `
    <div class="table-tools">
      ${busqueda ? `<label class="input-icon" for="${idBusq}"><span class="sr-only">Buscar en la tabla</span>${icono('buscar')}<input id="${idBusq}" class="input" type="search" placeholder="${esc(placeholder)}" autocomplete="off"></label>` : ''}
      ${filtros.map((f) => `<label class="sr-only" for="${idBusq}-${f.clave}">${esc(f.etiqueta)}</label>
        <select class="select" id="${idBusq}-${f.clave}" data-filtro="${esc(f.clave)}">
          <option value="">${esc(f.etiqueta)}: todas</option>
          ${f.opciones.map((o) => `<option value="${esc(o.valor)}">${esc(o.texto)}</option>`).join('')}
        </select>`).join('')}
      ${accionesHtml}
    </div>
    <div class="table-wrap"><table class="table" aria-label="${esc(etiqueta)}">
      <thead><tr>${columnas.map((c) => `<th scope="col" class="${c.tipo === 'numero' || c.tipo === 'moneda' ? 'num' : ''}" ${c.ordenable === false ? '' : 'aria-sort="none"'} data-col="${esc(c.clave)}">
        ${c.ordenable === false ? esc(c.titulo) : `<button type="button">${esc(c.titulo)}<span class="sort-ind">${icono('abajo', 'icon-sm')}</span></button>`}</th>`).join('')}</tr></thead>
      <tbody></tbody>
      <tfoot></tfoot>
    </table></div>
    <div class="table-foot"><span data-conteo aria-live="polite"></span><div class="pager"></div></div>`;

  const tbody = contenedor.querySelector('tbody');
  const tfoot = contenedor.querySelector('tfoot');
  const conteo = contenedor.querySelector('[data-conteo]');
  const pager = contenedor.querySelector('.pager');

  const valorDe = (c, f) => (c.valor ? c.valor(f) : f[c.clave]);

  function filtradas() {
    const t = normalizar(estado.texto);
    let r = filas.filter((f) => {
      for (const fl of filtros) {
        const v = estado.filtros[fl.clave];
        if (v && String(fl.valorDe ? fl.valorDe(f) : f[fl.clave]) !== v) return false;
      }
      if (!t) return true;
      return columnas.some((c) => normalizar(valorDe(c, f)).includes(t));
    });
    if (estado.orden) {
      const c = columnas.find((x) => x.clave === estado.orden);
      const numerica = c.tipo === 'numero' || c.tipo === 'moneda';
      r = [...r].sort((a, b) => {
        const va = valorDe(c, a); const vb = valorDe(c, b);
        if (numerica) return ((Number(va) || 0) - (Number(vb) || 0)) * estado.dir;
        return String(va ?? '').localeCompare(String(vb ?? ''), 'es', { numeric: true, sensitivity: 'base' }) * estado.dir;
      });
    }
    return r;
  }

  function pintar() {
    const lista = filtradas();
    const paginas = Math.max(1, Math.ceil(lista.length / porPagina));
    estado.pagina = Math.min(estado.pagina, paginas);
    const desde = (estado.pagina - 1) * porPagina;
    const pagina = lista.slice(desde, desde + porPagina);
    if (!pagina.length) {
      tbody.innerHTML = `<tr><td colspan="${columnas.length}"><div class="empty" style="border:0;padding:32px 12px">
        <div class="empty-art" style="width:72px;height:72px">${icono('buscar')}</div><p>${esc(vacio)}</p></div></td></tr>`;
    } else {
      tbody.innerHTML = pagina.map((f, i) => `<tr data-i="${desde + i}" ${alClicFila ? 'class="is-clickable" tabindex="0"' : ''}>
        ${columnas.map((c) => `<td class="${c.tipo === 'numero' || c.tipo === 'moneda' ? 'num' : ''} ${c.clase || ''}">${c.render ? c.render(f) : esc(valorDe(c, f))}</td>`).join('')}</tr>`).join('');
    }
    tfoot.innerHTML = pieTotales && lista.length ? pieTotales(lista) : '';
    conteo.textContent = lista.length
      ? `Mostrando ${entero(desde + 1)}–${entero(desde + pagina.length)} de ${entero(lista.length)} registros`
      : 'Sin registros para mostrar';
    pager.innerHTML = paginas > 1 ? `
      <button type="button" class="btn btn-sm btn-icon" data-pag="prev" ${estado.pagina === 1 ? 'disabled' : ''} aria-label="Página anterior"><span style="transform:rotate(180deg);display:grid">${icono('derecha', 'icon-sm')}</span></button>
      <span class="num">Página ${estado.pagina} de ${paginas}</span>
      <button type="button" class="btn btn-sm btn-icon" data-pag="next" ${estado.pagina === paginas ? 'disabled' : ''} aria-label="Página siguiente">${icono('derecha', 'icon-sm')}</button>` : '';
    contenedor._lista = lista;
    if (alCambiar) alCambiar(lista);
  }

  // Eventos
  const inputBusq = contenedor.querySelector(`#${idBusq}`);
  if (inputBusq) inputBusq.addEventListener('input', () => { estado.texto = inputBusq.value; estado.pagina = 1; pintar(); });
  contenedor.querySelectorAll('[data-filtro]').forEach((s) => s.addEventListener('change', () => {
    estado.filtros[s.dataset.filtro] = s.value; estado.pagina = 1; pintar();
  }));
  contenedor.querySelectorAll('th[aria-sort] button').forEach((b) => b.addEventListener('click', () => {
    const th = b.closest('th');
    const col = th.dataset.col;
    if (estado.orden === col) estado.dir *= -1; else { estado.orden = col; estado.dir = 1; }
    contenedor.querySelectorAll('th[aria-sort]').forEach((x) => x.setAttribute('aria-sort', 'none'));
    th.setAttribute('aria-sort', estado.dir === 1 ? 'ascending' : 'descending');
    pintar();
  }));
  pager.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-pag]');
    if (!b || b.disabled) return;
    estado.pagina += b.dataset.pag === 'next' ? 1 : -1;
    pintar();
    contenedor.querySelector('.table-wrap').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
  if (alClicFila) {
    const abrirFila = (tr) => { const f = contenedor._lista[Number(tr.dataset.i)]; if (f) alClicFila(f, tr); };
    tbody.addEventListener('click', (ev) => { const tr = ev.target.closest('tr[data-i]'); if (tr) abrirFila(tr); });
    tbody.addEventListener('keydown', (ev) => {
      const tr = ev.target.closest('tr[data-i]');
      if (!tr) return;
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); abrirFila(tr); }
      if (ev.key === 'ArrowDown' && tr.nextElementSibling) { ev.preventDefault(); tr.nextElementSibling.focus(); }
      if (ev.key === 'ArrowUp' && tr.previousElementSibling) { ev.preventDefault(); tr.previousElementSibling.focus(); }
    });
  }

  pintar();
  return {
    actualizar(nuevas) { filas = nuevas || []; pintar(); },
    filtradas: () => contenedor._lista || [],
    fijarFiltro(clave, valor) {
      estado.filtros[clave] = valor;
      const s = contenedor.querySelector(`[data-filtro="${clave}"]`);
      if (s) s.value = valor;
      estado.pagina = 1;
      pintar();
    }
  };
}
