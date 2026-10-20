/*
 * skeleton.js — Marcadores de carga (skeletons) mientras llegan los datos.
 */

export function skeletonPestana() {
  return `<div class="container" aria-busy="true" aria-label="Cargando contenido">
    <div class="skeleton skeleton-title" style="margin-top:32px"></div>
    <div class="grid-4" style="margin-bottom:20px">
      ${'<div class="skeleton skeleton-card" style="height:110px"></div>'.repeat(4)}
    </div>
    <div class="grid-2">
      <div class="skeleton skeleton-card" style="height:280px"></div>
      <div class="skeleton skeleton-card" style="height:280px"></div>
    </div>
  </div>`;
}

export function skeletonLineas(n = 4) {
  return Array.from({ length: n }, (_, i) => `<div class="skeleton skeleton-line" style="width:${92 - i * 11}%"></div>`).join('');
}
