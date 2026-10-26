# Registro en línea con Google Apps Script

El aplicativo guarda en una hoja de cálculo de Google cada descarga de la plantilla, cada activación de lector y cada lectura de pase QR, y envía el pase por correo. No requiere servidores ni permisos de Tecnología.

Mientras no se configure, el aplicativo guarda todo en cada dispositivo y lo envía en cuanto se configure la dirección (cola con reintentos).

La ETITC usa Microsoft 365 y Google solo permite que Apps Script envíe correos desde una cuenta con Gmail. Por eso la hoja y el programa viven en una cuenta de Gmail de la Oficina, con `plandeaccion@itc.edu.co` como correo de recuperación, dirección de respuesta y copia de cada pase. Con el modo RELEVO, un flujo de Power Automate reenvía cada pase desde `plandeaccion@itc.edu.co`.

## Instalación

1. En una ventana privada (InPrivate o incógnito) con **una sola** cuenta abierta, la de Gmail de la Oficina, cree una hoja llamada «Registro Jornada de Planeación 2027». Con varias cuentas abiertas Google falla al autorizar («error desconocido»).
2. **Extensiones → Apps Script**. Pegue el código de [`apps-script/Codigo.gs`](../apps-script/Codigo.gs) y escriba la clave del panel en `CLAVE_DEL_PANEL`.
3. Ejecute la función `instalar`, autorice (Configuración avanzada → Ir a … (no seguro) → Permitir). Crea las propiedades `TOKEN`, `CORREOOFICINA`, `MODOENVIO` y `CLAVEADMIN`, y las hojas **Descargas**, **Lecturas** y **Activaciones**. Después vuelva a dejar el texto de ejemplo en `CLAVE_DEL_PANEL`.
4. Ejecute `probarCorreo`: llega un pase de prueba a `plandeaccion@itc.edu.co`.
5. **Implementar → Nueva implementación → Aplicación web**. Ejecutar como: *Yo*. Quién tiene acceso: *Cualquier usuario*. Copie la dirección que termina en `/exec` y pruébela con `?accion=ping`.
6. Pegue la dirección en `data/config.json → registro.url`. El sitio se actualiza en uno o dos minutos.

## Modos de envío

- `DIRECTO` (inicial): el pase sale de la cuenta de Gmail, con respuesta y copia a `plandeaccion@itc.edu.co`.
- `RELEVO` (función `usarRelevo`): el pase llega a `plandeaccion@itc.edu.co` con el asunto `JP27RELEVO | para | copia | asunto` y el QR adjunto; un flujo de Power Automate («Cuando llega un correo electrónico nuevo (V3)» → «Seleccionar» → «Enviar un correo electrónico (V2)») lo reenvía desde Outlook. `usarDirecto` vuelve al modo inicial.

Los pases solo se envían a correos `@itc.edu.co`. El paso a paso completo, con el flujo de Power Automate, está en el *Instructivo de enlace institucional y registro automático* de la Oficina.

## Panel de la Oficina

En el aplicativo, pie de página → **Panel OAP**, escriba la `CLAVEADMIN`. El panel muestra descargas por dependencia, quién cargará en el SUIE, ingresos por actividad y lecturas por lector, y exporta todo a Excel.

## Límites y cuidados

- Una cuenta gratuita de Gmail envía hasta cien destinatarios al día: unos cuarenta pases en modo DIRECTO y cien en modo RELEVO. Si se supera, el registro queda guardado y la persona ve y descarga su pase en pantalla.
- Si cambia el código, cree una **nueva versión** de la misma implementación para conservar la dirección.
- Al terminar la jornada, comparta la hoja con la Oficina Asesora de Planeación para el informe de asistencia.

## Lectores y PIN

`data/lectores.json` guarda solo resúmenes SHA-256 del correo y del PIN de cada lector. Para cambiar lectores o PIN:

```bash
node tools/lectores.mjs lectores-privado.json PIN_lectores.csv
```

`lectores-privado.json` (no se sube al repositorio): `[{ "nombre": "Fabián Ospina", "correo": "…@itc.edu.co", "cargo": "…", "rol": "coordinador|moderador|apoyo" }]`. El nombre debe coincidir con el de los responsables en `data/agenda.json`.

## Directorio cifrado

`data/directorio.cifrado.json` se genera desde el directorio institucional privado:

```bash
node tools/cifrar-directorio.mjs directorio-privado.json
```

Cada registro se cifra con una clave derivada del propio correo (PBKDF2 y AES-GCM): el sitio solo muestra nombre, cargo y dependencia a quien escribe un correo exacto. No se publican extensiones ni la lista de correos.

## Enlace institucional

El sitio es estático y se publica con el subdominio `jornada2027.etitc.edu.co`. Tecnología crea dos registros en la zona DNS: un CNAME `jornada2027` hacia `famaos08-stack.github.io` y el TXT de verificación de GitHub. Después, y nunca antes, se escribe el dominio en *Settings → Pages → Custom domain* y se marca *Enforce HTTPS*. El enlace de github.io redirige solo al subdominio. La cámara del lector exige HTTPS.
