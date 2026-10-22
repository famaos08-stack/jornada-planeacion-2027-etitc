# Jornada de Planeación 2027 — ETITC

Aplicación web (sitio estático, sin servidor) de la **Oficina Asesora de Planeación** de la **Escuela Tecnológica Instituto Técnico Central** para la Jornada de Planeación Institucional 2027 (18, 19 y 20 de noviembre de 2026). Diseñada primero para el celular: una tarea por pantalla y barra de pestañas inferior.

**Regla de la jornada:** quien no registra la formulación del Plan de acción de su área no recibe pase QR y no ingresa.

## 1. Las cuatro pestañas y el escáner

| Pestaña | Qué hace |
|---|---|
| **Calendario** | Cuenta regresiva, agenda de los tres días con el bloque en curso resaltado, resultado esperado por día, ruta de planeación (antes, durante, después) y descarga del **cronograma en PDF** y del calendario **.ics** para Outlook. |
| **Plan de acción** | 1) Descarga del *Plan de acción 2027* (consulta) y de la *Plantilla de Formulación 2027*. 2) Identificación: correo `@itc.edu.co` buscado en el directorio, nombre y cargo, **área funcional** (lista de las 47 áreas agrupadas por dependencia, con sugerencia automática) y correos del equipo (con sugeridos del directorio). 3) Cargue de la plantilla diligenciada y validación con las mismas reglas de la columna «Alerta de consistencia» del libro. 4) **Registro automático** y **pase QR** (imagen, PDF, compartir) para el responsable y para cada integrante del equipo. |
| **Plan de necesidades** | Descarga de la plantilla *Plan de Necesidades 2027*, cargue, validación (17 reglas de la plantilla) y cruce con las acciones del Plan de acción registrado. Registro automático y constancia. |
| **Plan de adquisiciones** | Lo que explica el GIT de Contratación: ruta de 7 etapas hasta la publicación del PAA (31 de enero de 2027), calculadora de la fecha límite de radicación por modalidad en días hábiles con festivos de Colombia, las 7 modalidades, topes de cuantía, campos que se revisan, errores del plan 2026 y normativa. |
| **Escáner** (botón superior) | Lee el QR con la cámara, verifica la firma y registra la asistencia (verde: bienvenido · ámbar: ya ingresó · rojo: pase no válido). Búsqueda por código del pase o, con autorización, ingreso «sin pase». Modo **Áreas**: qué áreas ya registraron cada plan, con enlace al archivo y exportación a Excel. |

### Qué guarda el registro automático

Por cada cargue validado: código del registro, tipo de plan, **dependencia**, **área funcional**, **responsable**, cargo, **correo institucional**, **correos del equipo**, nombre del archivo, **enlace donde reposa la plantilla**, resultado de la validación, resumen y códigos de los pases.

## 2. Dos modos de funcionamiento

- **Modo local (activo hoy):** todo ocurre en el navegador. El registro y los pases quedan en el dispositivo; la persona pega el enlace de OneDrive/SharePoint donde dejó su archivo y descarga su pase. El pie de página permite **exportar e importar respaldos**.
- **Modo Microsoft 365 (lo activa TIC):** inicio de sesión institucional, el archivo se guarda en SharePoint en una carpeta por área, el registro va a la lista `JP27_Registro`, el pase llega por **correo de Outlook** y la asistencia va a `JP27_Asistencia`. El directorio real se lee desde SharePoint y no se publica. Guía paso a paso: [`docs/INSTALACION_MICROSOFT365.md`](docs/INSTALACION_MICROSOFT365.md) (también en PDF en `docs/`).

## 3. Cómo abrirla

- **GitHub Pages (producción):** *Settings → Pages → Source: GitHub Actions*. El flujo `.github/workflows/pages.yml` publica el sitio en cada cambio a `main`. La cámara del escáner exige HTTPS.
- **Servidor local:** `npx http-server -p 8080 -c-1` y abrir `http://localhost:8080`.
- **Doble clic (file://):** funciona con la copia empaquetada (`dist/app.bundle.js` y `data/datos.bundle.js`). Después de cambiar código o datos ejecute `node tools/empaquetar.mjs`.

## 4. Datos (`/data`)

| Archivo | Contenido |
|---|---|
| `config.json` | Evento, dominio, sal del pase, regla `reglasPase.exigirTodasLasMetas`, plantillas descargables, política de datos, umbrales y sección `microsoft`. |
| `agenda.json` | Los tres días con sus bloques y la ruta de planeación. |
| `areas.json` | Las 47 áreas funcionales (id A01–A47, dependencia, proceso). Las marcadas `revisar` tienen la dependencia por confirmar. |
| `dependencias.json`, `directorio.json` | Catálogo de dependencias y directorio. **El directorio publicado es de prueba (personas ficticias);** el real va en SharePoint. |
| `modalidades.json`, `contratacion.json`, `festivos.json` | Tiempos por modalidad (provisionales hasta que Contratación los confirme), contenido de la pestaña de adquisiciones y festivos 2026–2027. |
| `assets/plantillas/` | Las tres plantillas oficiales que se descargan. |

**Antes de la jornada:** cambie `pase.salFirma` en `config.json` y no lo vuelva a cambiar (los pases emitidos con otra sal se rechazan).

## 5. Validación de las plantillas

`src/lib/validar-accion.js` y `src/lib/validar-necesidades.js` replican las fórmulas de «Alerta de consistencia» de las plantillas oficiales (hojas de los ejes, filas adicionales del Buscador y hoja «Formulación PDN 2027»). Detectan además el archivo equivocado, metas pendientes, compromisos 2026 sin decisión y necesidades que no corresponden a acciones formuladas. Cada hallazgo indica hoja, fila y corrección, y se exporta a Excel.

Con `reglasPase.exigirTodasLasMetas: true` el pase solo se emite cuando todas las metas asignadas al área quedan formuladas y en OK.

## 6. Seguridad y datos personales

- El QR contiene `{"id","n","c","d","a","e","ts","h"}` con una firma que detecta pases alterados; no es criptografía fuerte (la sal está en un archivo público). El control real es el registro de asistencia.
- El directorio real nunca se sube al repositorio. Con Microsoft 365 se lee desde SharePoint con la sesión de la persona.
- Las plantillas de `assets/plantillas/` quedan descargables desde el sitio público. Si no se desea, súbalas a SharePoint y cambie el campo `archivo` de cada plantilla en `config.json` por el enlace.

## 7. Estructura

```
index.html              Punto de entrada (módulos por HTTP, paquete en file://)
src/app.js              Arranque, pestañas, sesión de Microsoft 365, respaldo
src/tabs/               calendario, accion, necesidades, adquisiciones, escaner, riesgos (apagada)
src/ui/cargue.js        Flujo compartido descarga → identificación → cargue → registro
src/ui/pase.js          Tarjeta del pase y sus acciones
src/lib/                Validadores, lectura de Excel, registro, Microsoft Graph, QR, fechas, exportaciones
data/                   Datos de la jornada
docs/                   Guía de instalación para TIC
tools/empaquetar.mjs    Genera la copia para abrir con doble clic
```

Librerías externas con versión fija e integridad (SRI): SheetJS 0.18.5, qrcode 1.5.1, html5-qrcode 2.3.8, jsPDF 2.5.1, html2canvas 1.4.1 y, solo con Microsoft 365, MSAL 3.28.1. Si alguna no carga, la aplicación avisa y sigue funcionando en lo que no depende de ella.
