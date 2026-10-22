---
title: "Jornada de Planeación 2027 — Guía de instalación con Microsoft 365"
subtitle: "Para el equipo de TIC de la ETITC · Oficina Asesora de Planeación"
lang: es-CO
---

# Qué se va a activar

El aplicativo (sitio estático en GitHub Pages) ya funciona en **modo local**: valida las plantillas, registra los cargues y emite el pase QR en el navegador de cada persona. Con esta configuración pasa a **modo Microsoft 365**:

1. Las personas ingresan con su cuenta institucional `@itc.edu.co`.
2. Cada plantilla cargada (Plan de acción y Plan de necesidades) se guarda en una biblioteca de SharePoint, en una carpeta por área.
3. Se crea un registro en la lista **JP27_Registro**: dependencia, área, responsable, cargo, correos institucionales del equipo y el **enlace donde reposa el archivo**.
4. Se envía desde Outlook (cuenta de quien registra) el correo con el **pase QR**, y cada integrante del equipo recibe su propio pase.
5. El escáner guarda la asistencia en la lista **JP27_Asistencia**.
6. El directorio institucional se lee desde SharePoint y **no se publica** en el sitio web.

No se requiere Power Automate, licencias premium ni servidor: todo usa Microsoft Graph con permisos delegados (cada acción se hace con la cuenta de la persona que inicia sesión).

Tiempo estimado: 45 a 60 minutos. Requiere un administrador global o de aplicaciones de Entra ID para el consentimiento.

# Paso 1. Publicar el sitio y anotar la URL

1. En GitHub, repositorio `jornada-planeacion-2027-etitc` → **Settings → Pages → Source: GitHub Actions**.
2. Espere a que termine el flujo «Publicar en GitHub Pages» (pestaña **Actions**).
3. Anote la URL exacta del sitio, por ejemplo: `https://famaos08-stack.github.io/jornada-planeacion-2027-etitc/`

Esa URL (con la barra final) es la **URI de redirección** del paso 2.

# Paso 2. Registrar la aplicación en Entra ID

Portal: <https://entra.microsoft.com> → **Identidad → Aplicaciones → Registros de aplicaciones → Nuevo registro**.

| Campo | Valor |
|---|---|
| Nombre | `Jornada de Planeación 2027 — ETITC` |
| Tipos de cuenta | **Solo las cuentas de este directorio organizativo** (inquilino único) |
| URI de redirección | Plataforma **Aplicación de página única (SPA)** → la URL del paso 1 |

Después de crearla, en **Información general** anote:

- **Id. de aplicación (cliente)** → `clientId`
- **Id. de directorio (inquilino)** → `tenantId`

En **Autenticación** agregue también, si se va a probar en un equipo, `http://localhost:8080/` como URI SPA. No active «flujos implícitos»: MSAL usa código de autorización con PKCE.

## Permisos de API

**Permisos de API → Agregar un permiso → Microsoft Graph → Permisos delegados**:

| Permiso | Para qué |
|---|---|
| `User.Read` | Nombre y correo de quien ingresa |
| `Sites.ReadWrite.All` | Guardar el archivo en la biblioteca y escribir en las listas |
| `Mail.Send` | Enviar el pase desde el buzón de quien registra |

Luego pulse **Conceder consentimiento de administrador para ETITC**. Los tres deben quedar con marca verde.

> Si la política de seguridad no permite `Sites.ReadWrite.All` para toda la organización, puede usarse `Sites.Selected` y conceder acceso solo al sitio del paso 3 (requiere un paso adicional con Graph o PowerShell PnP: `Grant-PnPAzureADAppSitePermission`). El aplicativo funciona igual.

# Paso 3. Preparar el sitio de SharePoint

1. Cree (o reutilice) el sitio de comunicación o de grupo de la Oficina Asesora de Planeación, por ejemplo `https://itc.sharepoint.com/sites/PlaneacionInstitucional`.
2. En la biblioteca **Documentos** cree la carpeta `Jornada de Planeacion 2027`. El aplicativo crea solo las subcarpetas `Plan de acción/A05 - …` y `Plan de necesidades/A05 - …`.
3. Dentro de ella cree la carpeta `Configuracion` y suba el archivo **`directorio.json`** real (lo entrega la OAP; tiene la misma estructura que `data/directorio.json`). Ruta final: `Jornada de Planeacion 2027/Configuracion/directorio.json`.
4. **Permisos del sitio**: todas las personas que registran deben poder **Contribuir** (agregar archivos y elementos de lista). Lo más simple es dar *Colaborar* a un grupo de seguridad con los líderes y enlaces de planeación de las 47 áreas. La carpeta `Configuracion` puede quedar con lectura para ese grupo.

## Lista JP27_Registro

**Nuevo → Lista → Lista en blanco**, nombre exacto `JP27_Registro`. Cree las columnas con estos **nombres exactos** (el nombre interno se toma del nombre con que se crea; créelas sin tildes ni espacios y después, si quiere, cambie solo el nombre visible):

| Nombre interno | Tipo |
|---|---|
| Title (ya existe) | Una línea de texto — código del registro |
| Tipo | Una línea de texto |
| AreaId | Una línea de texto |
| Area | Una línea de texto |
| Dependencia | Una línea de texto |
| Responsable | Una línea de texto |
| Cargo | Una línea de texto |
| CorreoResponsable | Una línea de texto |
| CorreosEquipo | Varias líneas de texto (texto sin formato) |
| Archivo | Una línea de texto |
| EnlaceArchivo | Varias líneas de texto (texto sin formato) |
| Estado | Una línea de texto |
| Advertencias | Número |
| Resumen | Varias líneas de texto (texto sin formato) |
| CodigoPase | Varias líneas de texto (texto sin formato) |
| FechaCargue | Una línea de texto (fecha ISO) |
| RegistradoPor | Una línea de texto |

## Lista JP27_Asistencia

Nombre exacto `JP27_Asistencia`, columnas (todas «Una línea de texto»):

`Title` (ya existe), `CodigoPase`, `Nombre`, `Cargo`, `AreaId`, `Area`, `Dependencia`, `Correo`, `HoraIngreso`, `Metodo`.

Los colaboradores del escáner (personal de logística) también necesitan permiso *Colaborar* sobre esta lista.

# Paso 4. Activar el conector en el aplicativo

Edite `data/config.json` en el repositorio, sección `microsoft`:

```json
"microsoft": {
  "activo": true,
  "tenantId": "<Id. de directorio (inquilino)>",
  "clientId": "<Id. de aplicación (cliente)>",
  "sitio": "itc.sharepoint.com:/sites/PlaneacionInstitucional",
  "biblioteca": "Documentos",
  "carpetaRaiz": "Jornada de Planeacion 2027",
  "listaRegistro": "JP27_Registro",
  "listaAsistencia": "JP27_Asistencia",
  "rutaDirectorio": "Jornada de Planeacion 2027/Configuracion/directorio.json",
  "correoCopia": "planeacion@itc.edu.co",
  "enviarCorreo": true
}
```

- `sitio` va en formato `dominio:/sites/NombreDelSitio` (sin `https://`).
- `biblioteca` es el nombre visible de la biblioteca (en sitios en español suele ser «Documentos»).
- En la misma configuración cambie `pase.salFirma` por un texto propio **antes** de emitir pases reales, y no lo vuelva a cambiar.

Guarde el cambio (commit). GitHub Pages se publica de nuevo en uno o dos minutos. Si se trabaja con la copia local, ejecute `node tools/empaquetar.mjs` para actualizar la versión que abre con doble clic.

# Paso 5. Prueba de aceptación (15 minutos)

1. Abra el sitio en el celular, pestaña **Plan de acción** → paso 2 → **Ingresar con Microsoft 365**. Debe volver al aplicativo con la sesión iniciada (avatar arriba a la derecha).
2. Identifíquese, elija un área, agregue un correo de prueba del equipo y cargue una plantilla diligenciada correctamente.
3. Verifique:
   - el archivo en `Documentos/Jornada de Planeacion 2027/Plan de acción/<área>`;
   - un elemento nuevo en **JP27_Registro** con el enlace del archivo;
   - el correo con el QR en la bandeja del responsable y otro en la del integrante del equipo.
4. Abra **Escáner** en otro celular, lea el QR del correo: pantalla verde con nombre y área, y un elemento nuevo en **JP27_Asistencia**.
5. En el escáner, modo **Áreas**: debe mostrar el área como registrada, leyendo desde SharePoint.

# Errores frecuentes

| Mensaje en el aplicativo | Causa y solución |
|---|---|
| «AADSTS50011: redirect URI mismatch» | La URI SPA no coincide exactamente con la URL del sitio (revise la barra final). |
| «AADSTS65001: consentimiento» | Falta **Conceder consentimiento de administrador**. |
| «No tiene permiso…» (403) | La persona no tiene *Colaborar* en el sitio o la lista. |
| «No se encontró…» (404) | Nombre del sitio, biblioteca, lista o ruta del directorio distinto al de `config.json`. |
| El correo no sale | El buzón de la persona no tiene licencia de Exchange Online o falta `Mail.Send`. El registro igual queda guardado y la persona puede descargar su pase. |

# Seguridad y datos personales

- El sitio público no contiene el directorio real: se lee desde SharePoint solo con sesión institucional.
- Los permisos son delegados: nadie puede hacer más de lo que ya puede hacer en SharePoint y Outlook con su propia cuenta.
- El QR lleva una firma que detecta pases alterados; no es una credencial criptográfica. El control final es el registro de asistencia.
- Las plantillas de `assets/plantillas/` se descargan desde el sitio público. Si la OAP prefiere no publicarlas, súbalas a SharePoint y cambie en `config.json` la propiedad `archivo` de cada plantilla por el enlace de SharePoint.

Contacto funcional: Oficina Asesora de Planeación — planeacion@itc.edu.co
