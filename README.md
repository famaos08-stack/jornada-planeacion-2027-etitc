# Jornada de Planeación 2027 — ETITC

Aplicación web de una sola página para orquestar la jornada en la que todas las dependencias de la **Escuela Tecnológica Instituto Técnico Central (ETITC)** formulan su planeación 2027. Reemplaza el proceso de correos y archivos sueltos.

Responsable: **Oficina Asesora de Planeación y Desarrollo Institucional (OAPDI)**.

> **La cadena lógica que gobierna todo:** metas 2027 → plan de acción → plan de necesidades → plan de adquisiciones
> (el mapa de riesgos es una etapa opcional, apagada por defecto).
> Nada existe aguas abajo sin su eslabón aguas arriba: una necesidad sin acción es inválida y una adquisición sin necesidad también. La aplicación lo valida y lo hace visible.

---

## 1. Qué hace cada pestaña

| Pestaña | Para qué sirve |
|---|---|
| **Agenda** | Línea de tiempo del día. Marca el bloque en curso según la hora del dispositivo (con modo ensayo), atenúa los pasados, expande el guion de cada bloque, filtra por dependencia y exporta a **PDF** y a **.ics** (Outlook). |
| **Formulación y pase** | Flujo de 4 pasos: identificación con correo `@itc.edu.co` contra el directorio → descarga de la plantilla Excel generada en el momento → cargue y validación (bloqueantes y advertencias, con hoja, fila y qué corregir) → emisión del **pase con QR firmado** (PNG, PDF y texto para correo). |
| **Metas 2027** | A. Hitos 2025–2026. Bloque «Cómo vamos a reportar en 2027» (modelo 2026 vs. 2027). B. Cascada navegable meta → líneas del PDI → dependencias y acciones. |
| **Necesidades** | Tablero consolidado: cifras, distribución por tipo y trimestre, valor por dependencia agrupado por tipo de proceso, tabla maestra con búsqueda, orden, filtros, paginación, trazabilidad («sin acción asociada» en rojo), panel lateral y exportación a Excel. Incluye **cargue masivo** de los Excel recibidos. |
| **Adquisiciones** | A. Calculador hacia atrás de la fecha límite de radicación de estudios previos, en días hábiles de Colombia. B. Consolidado por modalidad y trimestre con acumulado, gráfica de congestión por mes y alertas a menos de 30 días. |
| **Mapa de riesgos** *(opcional)* | Matriz 5×5 de probabilidad por impacto, inventario por proceso con controles y responsables. Apagado por defecto. |
| **Modo escáner** (botón superior) | Para celular o tableta en el ingreso: lee el QR con la cámara trasera, confirma 3 s a pantalla completa (verde / ámbar si ya ingresó / rojo si es inválido o alterado), registro manual por nombre o correo, contador en vivo por dependencia y exportación de la asistencia a Excel. |

La franja superior muestra siempre cuántas dependencias **cargaron** su formulación, cuántas quedaron **validadas** (sin bloqueantes) y cuántos **pases** se emitieron, sobre las 17 dependencias del catálogo.

---

## 2. Cómo abrirla

### Opción A — Doble clic (file://)
Abra `index.html`. Los navegadores bloquean los módulos ES6 y la lectura de `/data` desde el disco, por eso en ese caso la aplicación carga automáticamente:

- `dist/app.bundle.js` — los módulos de `src/` en un solo script clásico.
- `data/datos.bundle.js` — copia de los JSON de `/data` y del logo.

Ambos se generan con `node tools/empaquetar.mjs` (Node 18+, **sin** `npm install`). Si cambia un JSON y abre con doble clic, vuelva a ejecutar ese comando, o use el botón **«Cargar carpeta data»** que aparece en el pie de página en ese modo.

> La cámara del modo escáner requiere HTTPS o `localhost`. Con doble clic puede no estar disponible según el navegador: use **«Leer desde foto»** o el registro manual, o sirva el sitio por HTTP.

### Opción B — Servidor local (recomendado para probar)
```bash
cd jornada-planeacion-2027
python3 -m http.server 8080      # o: npx serve .
# abrir http://localhost:8080
```

### Opción C — GitHub Pages (producción)
Ver la sección 3.

Las librerías externas se cargan desde jsDelivr con versión exacta y verificación de integridad (SRI): SheetJS `xlsx@0.18.5`, `qrcode@1.5.1`, `html5-qrcode@2.3.8`, `chart.js@4.4.1`, `jspdf@2.5.1`, `html2canvas@1.4.1`. Si alguna no carga, la aplicación avisa qué función queda limitada y sigue funcionando (por ejemplo, las gráficas se muestran como tablas).

---

## 3. Despliegue en GitHub Pages

1. Cree un repositorio (por ejemplo `oapdi-etitc/jornada-planeacion-2027`) y suba todo el contenido de esta carpeta a la rama `main`.
2. En GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Cada `push` a `main` ejecuta `.github/workflows/pages.yml`, que:
   - valida que todos los JSON de `/data` sean válidos (si alguno está mal formado, no publica),
   - regenera `dist/app.bundle.js` y `data/datos.bundle.js`,
   - publica el sitio.
4. La URL queda en la pestaña **Actions** del flujo y en **Settings → Pages** (`https://<organización>.github.io/<repositorio>/`).

El archivo `.nojekyll` evita que GitHub procese el sitio con Jekyll.

---

## 4. Cómo reemplazar los datos (`/data`)

Todo dato vive en `/data`; no hay datos quemados en el código. Después de editar, haga `push` (o ejecute `node tools/empaquetar.mjs` si usa doble clic).

> **Antes de usar la aplicación en la jornada real**, reemplace `data/directorio.json` por el directorio verdadero. El que viene publicado es de ejemplo (ver la tabla). Tenga presente que, al ser un sitio estático sin servidor, todo lo que esté en `/data` queda accesible para cualquiera que tenga el enlace del sitio.

| Archivo | Estado | Qué contiene / cómo reemplazarlo |
|---|---|---|
| `directorio.json` | **De ejemplo (ficticio)** | ⚠️ El archivo publicado contiene **14 personas ficticias**, no el directorio real. Al ser un sitio estático, cualquiera con el enlace puede descargar este archivo, por eso no se publican los datos personales de las 319 personas reales. **La OAPDI debe reemplazarlo** por el directorio real (`directorio.json` con corte del 28/09/2026) cuando autorice esa exposición, conservando exactamente la estructura `personas[]` con `id, nombre, cargo, correo, extension, dependencia, grupo, vinculacion, revisarDependencia, correoDuplicado`. El archivo de ejemplo incluye a propósito los tres casos difíciles: personas sin correo, un buzón compartido por dos personas y un registro sin nombre. |
| `dependencias.json` | **Real** (17 dependencias) | Estructura orgánica (Decreto 902 de 2013, Resolución 215 de 2022) con `tipoProceso`: `estrategico`, `misional`, `apoyo` o `evaluacion`. |
| `agenda.json` | Provisional | Fecha, sede y bloques. Cada bloque: `id, inicio, fin, titulo, modulador, cargo, modalidad (plenaria/mesa), tema, sala, entregable, insumo, guion[], dependencias[]` (`["todas"]` o códigos). Bloques con el mismo horario se muestran en paralelo. |
| `metas.json` | Provisional | `metasInstitucionales[]` con `lineasPDI[]` y `dependenciasResponsables[]`. Los `id` (M1, L1.1…) aparecen en la plantilla Excel: no los repita. |
| `hitos.json` | Provisional | Hitos 2025–2026. Para agregar uno, copie un objeto y cambie `anio, orden, icono, titulo, descripcion, impacto`. Íconos: `insignia, edificio, alianza, bandera, metas, tendencia`. |
| `modalidades.json` | **Provisional** | Modalidades y etapas en días hábiles. **Reemplace los tiempos por los del Manual de Contratación de la ETITC.** El total se calcula sumando las etapas. Incluye el valor UVT (provisional). |
| `festivos.json` | Verificar | Festivos de Colombia 2026 y 2027 (Ley Emiliani). Agregue 2028 cuando se necesite: el calculador avisa si un año no tiene festivos cargados. |
| `config.json` | Provisional | Textos del evento, dominio institucional, **sal de firma del pase**, umbrales (máximo de acciones, días de alerta, similitud de nombres, etc.). |
| `riesgos.json` | Provisional | Solo se usa con el mapa de riesgos activo: escalas, procesos y riesgos con controles. |

Los archivos provisionales muestran un aviso visible en la interfaz mientras tengan `"provisional": true`. Al reemplazarlos con datos aprobados, cambie ese campo a `false`.

---

## 5. Cómo activar el mapa de riesgos

En `src/config.js`:

```js
export const FEATURES = { mapaRiesgos: true };
```

La pestaña aparece en la navegación y la cadena lógica muestra la quinta etapa. Con `false` no aparece en ningún lugar ni en ningún conteo. Si usa doble clic, ejecute luego `node tools/empaquetar.mjs`.

---

## 6. Persistencia y cómo conectar SharePoint

`src/storage.js` expone una interfaz única: `guardarFormulacion`, `guardarAsistencia`, `leerConsolidado` (más `guardarPase`, `exportarRespaldo`, `importarRespaldo`). La implementación se elige en `src/config.js`:

```js
export const PERSISTENCIA = { modo: 'local' /* 'sharepoint' | 'sheets' */, ... };
```

- **`local` (activo):** `localStorage` del navegador. Es solo un **respaldo de sesión en ese equipo**. Use **«Exportar respaldo»** (franja superior) para descargar un `.json` con todo, e **«Importar»** para combinar respaldos de varios equipos. El modo escáner muestra un aviso permanente y pide confirmación al cerrar si hay asistencia sin exportar.
- **`sharepoint` (esqueleto):**
  1. Cree en el sitio de la OAPDI tres listas: `JP27_Formulaciones` (Title, Estado, CargadoEn, Persona, Correo, Json multilínea), `JP27_Pases` (Title, Nombre, Cargo, Dependencia, Correo, Ts, Firma) y `JP27_Asistencia` (Title, Nombre, Cargo, Dependencia, Correo, Hora, Metodo).
  2. Registre una aplicación de página única en **Entra ID** con permiso delegado `Sites.ReadWrite.All` y la URL de GitHub Pages como URI de redirección.
  3. Complete `tenantId`, `clientId`, `siteId` y los id de las listas en `PERSISTENCIA.sharepoint`.
  4. Implemente `obtenerToken()` en `storage.js` con MSAL.js (cargado desde CDN con versión fija). Los llamados a Graph (`POST/GET /sites/{siteId}/lists/{listId}/items`) ya están escritos.
- **`sheets` (esqueleto):** publique una aplicación web de Apps Script y ponga su URL en `PERSISTENCIA.sheets.webAppUrl`. Contrato mínimo:

```js
// Apps Script (Código.gs) — ejemplo mínimo
function doPost(e) {
  const { accion, datos } = JSON.parse(e.postData.contents);
  const hoja = SpreadsheetApp.getActive().getSheetByName(accion) || SpreadsheetApp.getActive().insertSheet(accion);
  hoja.appendRow([new Date(), JSON.stringify(datos)]);
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}
function doGet(e) {
  const leer = (n) => { const h = SpreadsheetApp.getActive().getSheetByName(n); return h ? h.getDataRange().getValues().map((f) => JSON.parse(f[1])) : []; };
  return ContentService.createTextOutput(JSON.stringify({ formulaciones: leer('formulacion'), pases: leer('pase'), asistencia: leer('asistencia') }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

La autenticación de SharePoint y Sheets **no** está implementada: hay `TODO(OAPDI)` en los puntos exactos.

---

## 7. La plantilla Excel

Se genera en el navegador con SheetJS y luego se le aplica formato institucional editando el paquete OOXML:

- **Instructivo** con el logo, la dependencia que formula, la cadena lógica, la regla de evidencia macro y los errores comunes.
- **Acciones / Necesidades / Adquisiciones** con encabezados `#0b4d3b` y texto blanco, fila de títulos inmovilizada, anchos ajustados, celdas de entrada desbloqueadas y el resto protegido (protección sin contraseña: *Revisar → Desproteger hoja*).
- **Listas desplegables** que leen de la hoja **Listas** mediante nombres definidos: metas, líneas, trimestres, tipos, modalidades y, para respetar la cadena, los **códigos de acción** existentes (en Necesidades) y los **códigos de necesidad** existentes (en Adquisiciones).
- **Fórmula** de fecha límite de radicación: `DIA.LAB` (WORKDAY) hacia atrás con los días de la modalidad y los festivos. El aplicativo hace el mismo cálculo; fue verificado contra un cálculo independiente de días hábiles.

El botón **«Ver un ejemplo diligenciado»** descarga una plantilla con datos coherentes para capacitación.

---

## 8. Seguridad del pase

El QR contiene `{"id","n","c","d","e","ts","h"}`. `h` es una firma (hash cyrb53 con la sal de `data/config.json`) que detecta pases editados a mano. **No es criptografía fuerte**: en un sitio estático la sal es pública. Sirve para el control de ingreso, no como credencial. Cambie la sal antes de emitir pases reales y no la cambie después.

---

## 9. Estructura de archivos

```
index.html                 Entrada (módulos por HTTP, paquete en file://)
assets/                    logo-etitc.png y su sello recortado para la barra
data/*.json                Datos (ver sección 4) · datos.bundle.js (generado)
dist/app.bundle.js         Paquete generado para file://
tools/empaquetar.mjs       Empaquetador sin dependencias
src/config.js              Banderas, persistencia, rutas de datos, paleta
src/app.js                 Arranque, enrutamiento y franja de progreso
src/estado.js              Estado global y bus de eventos
src/storage.js             Persistencia local / SharePoint / Sheets
src/ui/                    tabs, cards, table, timeline, modal, toast, skeleton, graficas, iconos, dom
src/tabs/                  agenda, formulacion, metas, necesidades, adquisiciones, riesgos, escaner
src/lib/                   excel, qr, fechas, validacion, export, datos, libs, formato
src/styles/                tokens.css, base.css, components.css, tabs.css
```

---

## 10. Preguntas frecuentes (equipo OAPDI)

**¿Dónde quedan las formulaciones que cargan las dependencias?**
En el navegador donde se cargaron (modo `local`). Para consolidar en un solo equipo: pida a las dependencias que envíen el Excel y use **Necesidades → «Cargar Excel de dependencias»** (acepta varios archivos a la vez; la dependencia se lee de la hoja Instructivo). También puede combinar respaldos `.json` con **Importar**.

**¿Qué diferencia hay entre «cargada» y «validada»?**
Cargada: la dependencia subió un archivo. Validada: ese archivo no tiene errores bloqueantes. Solo una formulación validada permite emitir el pase. Si una dependencia carga varias veces, vale la última versión.

**El directorio solo muestra 14 personas de ejemplo. ¿Por qué?**
Porque el sitio publicado es estático: cualquiera con el enlace puede descargar `data/directorio.json`. Para no exponer los datos personales de las 319 personas reales, se publicó un directorio ficticio. Reemplácelo por el real cuando la OAPDI lo autorice (sección 4). Mientras tanto, todo el resto de la aplicación funciona igual y quien no esté en el directorio puede identificarse escribiendo sus datos.

**Una persona no aparece en el directorio. ¿Puede formular?**
Sí. Si su correo termina en `@itc.edu.co` puede continuar escribiendo nombre, cargo y dependencia; queda marcada como **no verificada** (se ve en el pase y en la pantalla del pase).

**¿Y quienes no tienen correo (18 personas)?**
No pueden identificarse por correo ni recibir pase por correo. En el ingreso se registran en el **modo escáner → Manual**, buscando por nombre.

**Dos personas comparten el mismo correo.**
Pasa con tres buzones del directorio (`emitc@`, `tallermetalisteria@`, `auxsalascomputo1@`). Al escribir el correo, el aplicativo muestra ambas personas y pide elegir.

**El directorio no trae el nombre de alguien.**
Dos registros llegan sin nombre (Jurídica y Contabilidad). El aplicativo pide escribir el nombre antes de emitir el pase o de registrar la asistencia manual.

**Usamos varios celulares para el ingreso. ¿Cómo junto la asistencia?**
Cada celular guarda su propia lista. Al terminar, exporte desde cada uno (botón **Exportar** del escáner) y una los Excel, o use **Exportar respaldo** e **Importar** en un solo equipo: los registros repetidos no se duplican.

**¿Cómo cambio el máximo de 15 acciones o los 30 días de alerta?**
En `data/config.json → umbrales`.

**¿Puedo cambiar los tiempos de contratación?**
Sí, en `data/modalidades.json`. El calculador y la fórmula de la plantilla usan esos tiempos. Las plantillas descargadas antes del cambio conservan los tiempos viejos en su hoja Listas.

**El pase se ve, pero no descarga la imagen.**
La descarga usa html2canvas desde CDN. Si no cargó, el aplicativo lo avisa; tome una captura de pantalla del pase, que contiene el QR válido.

**¿Funciona sin internet?**
La interfaz, el cálculo de fechas, el directorio y la asistencia manual sí. Excel, QR, gráficas y PDF dependen de las librerías del CDN: el aplicativo indica cuáles faltan.

---

## 11. Accesibilidad

Pestañas con el patrón WAI-ARIA (`tablist`/`tab`/`tabpanel`, flechas, Inicio y Fin), foco visible en todos los controles, enlace «Saltar al contenido», tablas ordenables con `aria-sort`, filas navegables con teclado, avisos con `aria-live`, modales y panel lateral con trampa de foco y cierre con Escape, gráficas con vista alterna en tabla, paleta categórica validada para daltonismo y respeto de `prefers-reduced-motion`.

> Notas de contraste (medidas con la fórmula WCAG):
> - El gris obligatorio `--muted` (#6d847c) da 3,7:1 sobre `--bg`, por debajo de AA. Las variables oficiales no se tocaron: el texto secundario usa el token derivado `--muted-texto` (#587068, 4,9:1) y `--muted` queda para íconos y bordes. Igual con el verde: el texto verde sobre blanco usa `--g8` (6,5:1) porque `--g7` da 4,3:1.
> - La píldora activa usa `--g7` con texto blanco, tal como pide la identidad visual: 4,3:1, apenas por debajo de 4,5:1 para texto normal. Si la OAPDI prefiere cumplir AA estricto, cambie el fondo de `.tab[aria-selected="true"]` a `--g8` (6,5:1) en `src/styles/components.css`.
