# Registro en línea con Google Apps Script

El aplicativo guarda en una hoja de cálculo de Google cada descarga de la plantilla, cada activación de lector y cada lectura de pase QR. También envía el pase por correo. Funciona con una cuenta de Google de la Oficina Asesora de Planeación (famaos.08@gmail.com) y no requiere permisos de Tecnología.

Mientras no se configure, el aplicativo guarda todo en cada dispositivo y lo envía en cuanto se configure la dirección (cola con reintentos).

## Instalación (10 minutos)

1. Con la cuenta famaos.08@gmail.com cree una hoja de cálculo de Google llamada «Registro Jornada de Planeación 2027».
2. En la hoja abra **Extensiones → Apps Script**.
3. Borre el contenido del editor, pegue el código de [`apps-script/Codigo.gs`](../apps-script/Codigo.gs) y guarde.
4. En **Configuración del proyecto → Propiedades del script** agregue:
   - `TOKEN` = `JP27ETITC` (el mismo valor de `data/config.json → registro.token`)
   - `CLAVEADMIN` = la clave del panel de la Oficina (no se publica en el sitio)
   - `CORREOCOPIA` = `plandeaccion@itc.edu.co` (opcional; recibe copia de cada pase)
5. **Implementar → Nueva implementación → Aplicación web**. Ejecutar como: *Yo*. Quién tiene acceso: *Cualquier persona*. Autorice los permisos que pide Google (hoja de cálculo y envío de correo).
6. Copie la dirección de la aplicación web (termina en `/exec`).
7. En `data/config.json` pegue la dirección en `registro.url` y guarde el cambio en el repositorio. El sitio se actualiza en uno o dos minutos.
8. Pruebe: regístrese en el aplicativo y verifique la fila en la hoja **Descargas** y el correo con el pase.

La hoja crea sola tres pestañas: **Descargas**, **Lecturas** y **Activaciones**.

## Panel de la Oficina

En el aplicativo, pie de página → **Panel OAP**, escriba la `CLAVEADMIN`. El panel muestra descargas por dependencia, quién cargará en el SUIE, ingresos por actividad y lecturas por lector, y exporta todo a Excel.

## Límites y cuidados

- Una cuenta gratuita de Gmail envía cerca de cien correos al día. Si se supera, el registro queda guardado y la persona ve y descarga su pase en pantalla.
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

El sitio es estático. Tecnología puede (1) enlazarlo desde el portal, (2) crear un subdominio, por ejemplo `planeacion.itc.edu.co`, con un registro CNAME hacia `famaos08-stack.github.io` y configurarlo en *Settings → Pages → Custom domain* con *Enforce HTTPS*, o (3) copiar la carpeta a un servidor institucional con HTTPS. La cámara del lector exige HTTPS.
