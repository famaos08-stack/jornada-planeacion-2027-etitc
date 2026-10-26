# Jornada de Planeación 2027 — ETITC

Aplicativo web (sitio estático, sin servidor) de la **Oficina Asesora de Planeación** de la **Escuela Tecnológica Instituto Técnico Central** para la Jornada de Planeación Institucional 2027 (18, 19 y 20 de noviembre de 2026). Diseñado primero para el celular (iPhone y Android) y también para el computador.

Desarrollo y ajustes: **Fabián Ospina**, profesional de Plan de Acción, Oficina Asesora de Planeación.

## Qué hace

| Pestaña | Contenido |
|---|---|
| **Agenda** | Los tres días con horarios, talleres y responsables. En el día 1, logros y transformaciones, grandes apuestas del PDI y tendencias van en un solo bloque. Descarga del cronograma en PDF y del calendario para Outlook. |
| **Plan de acción** | Un solo archivo: la **Plantilla Plan de Acción 2027**. Para descargarla, la persona se registra con su correo institucional (el directorio cifrado completa nombre, cargo y dependencia), elige dependencia y área e indica quién cargará el documento en el SUIE. Al registrarse recibe su **pase QR** de ingreso. Además: Manual de ejemplos e Instructivo de formulación en PDF. |
| **Plan de necesidades** | Relación necesidad, acción y meta; código UNSPSC paso a paso con enlace al clasificador de Colombia Compra Eficiente; errores 2026; descarga del formato (hoja PlandeNecesidades de la misma plantilla). |
| **Lector QR** | Solo lo activan los responsables de la actividad en curso según la agenda, con correo institucional y PIN. Cada lectura queda con fecha, hora, lector, participante, actividad y resultado. Modo ensayo para practicar. |
| **Panel OAP** (`#admin`) | Quién descargó, por dependencia, responsables del cargue en el SUIE, ingresos por actividad y lecturas por lector; exportación a Excel. |

El cargue de la formulación se hace en el **SUIE**, no en el aplicativo.

## Registro en línea

Descargas, activaciones y lecturas se envían a una hoja de cálculo de Google mediante Google Apps Script (cuenta de la Oficina), con cola y reintentos si no hay internet. Instalación: [`docs/REGISTRO_EN_LINEA.md`](docs/REGISTRO_EN_LINEA.md). Código: [`apps-script/Codigo.gs`](apps-script/Codigo.gs). Sin configurar, todo queda en cada dispositivo y se puede exportar.

## Datos (`/data`)

| Archivo | Contenido |
|---|---|
| `config.json` | Evento, clave interna de firma del pase QR (pase.salFirma), archivos descargables, registro en línea (`registro.url`). |
| `agenda.json` | Días, bloques con `responsables`, agrupación del bloque central y ruta de planeación. |
| `lectores.json` | Lectores habilitados (solo resúmenes SHA-256 de correo y PIN). |
| `directorio.cifrado.json` | Directorio institucional cifrado por correo (sin extensiones). |
| `dependencias.json`, `areas.json`, `festivos.json` | Catálogos. |

Antes de difundir el enlace cambie la clave interna de firma del pase QR (`pase.salFirma` en `config.json`) y no la vuelva a cambiar, porque los pases ya entregados dejarían de servir.

## Documentos (`assets/`)

- `plantillas/Plantilla_Plan_de_Accion_2027.xlsx`: libro unificado (instructivos, Plan_Acción_2027 con acciones y actividades, Acciones_2027, Formulación_Ejes_2027, Buscador, Importación al SUIE y PlandeNecesidades).
- `documentos/`: Manual de ejemplos, Instructivo de formulación y Manual de uso del aplicativo (PDF).

## Cómo abrirlo

- **GitHub Pages**: el flujo de `.github/workflows` publica cada cambio a `main`.
- **Servidor local**: `npx http-server -p 8080 -c-1` y abrir `http://localhost:8080`.
- **Doble clic (file://)**: usa `dist/app.bundle.js` y `data/datos.bundle.js`; después de cambiar código o datos ejecute `node tools/empaquetar.mjs`.

## Enlace institucional

Tecnología puede enlazar el sitio desde el portal, crear un subdominio (CNAME a `famaos08-stack.github.io` y *Custom domain* en *Settings → Pages*) o alojar la carpeta en un servidor institucional con HTTPS. Detalle en `docs/REGISTRO_EN_LINEA.md`.

## Estructura

```
index.html               Punto de entrada
src/app.js               Arranque y navegación
src/tabs/                calendario, accion, necesidades, escaner, admin, riesgos (apagada)
src/ui/registro-descarga.js  Formulario de registro y descarga
src/ui/pase.js           Pase QR y sus acciones
src/lib/                 directorio cifrado, lectores, registro en línea, QR, fechas, exportaciones
apps-script/Codigo.gs    Registro en línea (Google Apps Script)
tools/                   empaquetar, cifrar-directorio, lectores
```
