# Rol de Monaguillos · Anunciación a María

App instalable para iPhone, Android y computadora. Interfaz en español y calendario de domingo a sábado. El código público no contiene nombres ni roles reales.

## Funciones

- Consulta mensual e historial por año y mes.
- Edición guiada: año → mes → semana → día → misas y participantes.
- Meses nuevos con fechas correctas y horarios habituales, sin copiar participantes.
- Domingos con cuatro horarios independientes y Capilla La Inmaculada a las 17:00.
- Mensajes generales del día, subtítulos y mensajes por misa; celebraciones adicionales.
- Nombres seleccionables sin duplicados en una misma misa. Se permite otra hora del mismo día.
- Alta, edición y eliminación de nombres con confirmación explícita. Recuperación de eliminados y conservación de sus participaciones anteriores.
- Panel semanal de monaguillos sin misa; actualización inmediata durante la edición. Recuento provisional cuando falten días por descargar o cargar.
- PNG del mes o de una semana, con vista previa, descarga, compartir y copia cuando el dispositivo lo permita.
- Guardado local en IndexedDB y archivos estáticos en caché para trabajar sin internet, después de la primera carga.
- Respaldo JSON privado e importación con combinación conservadora.
- Sincronización por registros con versiones, bloqueo del servidor, reintentos idempotentes y resolución de conflictos.
- Barrido diario para Web Push con GitHub Actions, sujeto a activar el servicio y registrar cada teléfono.

## Publicar gratis en GitHub Pages

1. Crear un repositorio público vacío, por ejemplo `rol-monaguillos`, y dar acceso a la conexión GitHub utilizada para subir el código.
2. Subir el contenido de este proyecto, **excluyendo `private/`**. La carpeta privada contiene datos reales y nunca debe publicarse.
3. En Settings → Pages → Build and deployment, seleccionar **GitHub Actions**.
4. El flujo `.github/workflows/pages.yml` ejecuta las pruebas y publica exclusivamente `dist/`.
5. En cada iPhone: abrir el enlace HTTPS en Safari → Compartir → Agregar a pantalla de inicio. Abrir desde el icono y cargar los datos con conexión.

La app no utiliza dependencias externas para consultar, editar ni generar PNG. No requiere dominio comprado. GitHub Pages y los ejecutores estándar de Actions son gratuitos para repositorios públicos, sujetos a sus límites. Google Apps Script tiene cuotas gratuitas. No activar facturación ni usar ejecutores de pago.

## Conectar el Google Sheets original

La primera configuración del servicio se realiza en la cuenta propietaria. La app no debe pedir una contraseña de Google ni publicar el archivo.

1. Abrir **el Google Sheets original**, no una exportación XLSX. Desde Extensiones → Apps Script, crear el proyecto vinculado.
2. Copiar el contenido de `backend/Code.gs` al editor. El archivo se genera con `node build-backend.mjs` a partir de los módulos fuente del repositorio.
3. Ejecutar `configurarConexion` una vez, revisar y autorizar los permisos de acceso al archivo que presenta Google.
4. Guardar las dos claves del registro de ejecución de forma privada: **clave de la app** y **clave del barrido**. Nunca copiarlas al repositorio. Volver a ejecutar esta función revoca las claves anteriores.
5. Implementar → Nueva implementación → Aplicación web. Ejecutar como propietario. Permitir el acceso de conexión a **Cualquier persona**: los datos siguen protegidos porque cada solicitud privada exige una clave aleatoria de alta entropía y el servidor verifica su hash. `doGet` no devuelve datos del rol.
6. Copiar el enlace terminado en `/exec` a Conexión y respaldos de la app, junto con la **clave de la app**. Utilizar la misma conexión en los dos teléfonos.
7. Pulsar Sincronizar y verificar que octubre coincide con el archivo original. Probar primero una edición reversible y revisar el resultado en Google Sheets.

El servidor toma el ID del archivo vinculado mediante `getActiveSpreadsheet()`. Nunca busca archivos por nombre ni crea una copia de respaldo como destino de escritura. Al abrir otro mes crea una pestaña con su nombre y año en ese mismo archivo. Clona el estilo de Octubre 2026 cuando está disponible y adapta filas, fechas y espacio. Las pestañas semanales históricas existentes no se modifican.

Se crean pestañas auxiliares ocultas `_RolApp`, `_RolHashes`, `_RolRender`, `_RolHistorial` y `_RolPush` para versiones, detección de cambios directos, recuperación de renderizado, historial y suscripciones. Las claves se guardan en las propiedades privadas de Apps Script; no en las celdas.

Si se hacen modificaciones directamente en una pestaña mensual de Google, el servicio las vuelve a importar de forma conservadora y cambia sus versiones antes de aplicar ediciones del teléfono. Ante cambios concurrentes en el mismo día, el teléfono pide elegir la versión. Los nombres desconocidos escritos a mano en formatos no reconocidos se conservan como texto; revisar su asignación en la app.

## Carga inicial privada

El archivo inicial entregado por separado importa los datos de octubre y los nombres encontrados en las semanas históricas y la plantilla. Se carga desde Conexión y respaldos → Cargar archivo. No se incluye en GitHub ni en `dist/`.

Las variantes por acento se normalizan conservando la escritura acentuada. Las posibles variantes de identidad y los nombres que solo aparecen en pestañas históricas quedan pendientes de revisión. Estas variantes históricas no se cuentan como integrantes activos hasta resolverlas.

## Avisos automáticos con la app cerrada

El panel dentro de la app funciona sin conexión. Los avisos con la app cerrada requieren internet, la instalación en la pantalla de inicio y permiso de notificaciones. No dependen de que Safari mantenga ejecutándose la app en segundo plano.

1. Generar un par VAPID en un entorno privado con la biblioteca `web-push`: `npx web-push generate-vapid-keys`. No publicar la clave privada.
2. En Settings → Secrets and variables → Actions del repositorio, guardar:
   - `ROL_ENDPOINT`: enlace privado `/exec`.
   - `ROL_SCAN_KEY`: clave privada del barrido.
   - `VAPID_PUBLIC_KEY`: clave pública VAPID.
   - `VAPID_PRIVATE_KEY`: clave privada VAPID.
   - `VAPID_SUBJECT`: contacto VAPID válido, por ejemplo un `mailto:` propio.
3. En Apps Script, ejecutar `configurarNotificaciones` y poner únicamente la clave pública VAPID. Sincronizar los teléfonos; la app recibe automáticamente esa configuración. Desde el icono instalado, tocar Activar notificaciones y autorizar.
4. Ejecutar manualmente el flujo Revisar participación semanal y confirmar la recepción en ambos teléfonos. El flujo consulta el rol compartido actualizado, incluyendo cambios directos en Sheets.
5. El horario inicial es diariamente a las **18:17, America/Monterrey** (`17 0 * * *` en UTC). Revisa la semana en curso y la siguiente y envía un resumen solo si hay personas sin misa. No repite el mismo aviso el mismo día en el mismo teléfono.

Actions puede retrasar tareas programadas y puede desactivar la programación tras un periodo prolongado de inactividad del repositorio. El horario es aproximado. No mostrar los avisos como activados hasta probar el servicio completo. Los registros públicos del flujo solo muestran totales de envíos; no imprimen nombres ni claves.

## Pruebas y límites de esta entrega

- Ejecutar `node --test tests/*.test.mjs` (sin instalar paquetes).
- Regenerar el código de Apps Script con `node build-backend.mjs` tras editar módulos compartidos.
- Las pruebas cubren calendarios de 2025 a 2030, semanas entre meses y años, duplicados, participación, importación, unificación y conflictos entre teléfonos.
- El modo sin conexión requiere que la app y los datos se hayan cargado previamente. Los datos locales dependen del almacenamiento del navegador; los respaldos y la sincronización sirven para recuperarlos si se borran.
- Los cambios solo llegan al otro teléfono después de sincronizar. No se muestra un guardado local como si ya estuviera subido a Google.
- Los respaldos no contienen claves de conexión ni suscripciones Push.
- Pendiente de prueba real: publicación HTTPS, primera sincronización con Google, PNG en Safari y recepción Push en iPhone.

La vista previa del entorno de desarrollo no pudo iniciarse por una limitación del contenedor (`bwrap` no pudo montar `/proc`). Esto no es una prueba de funcionamiento visual en navegador. No se ha modificado el archivo original durante la preparación del código.
