# Configurar avisos de eliminaciones por Telegram

Esta automatización revisa cada 10 minutos las solicitudes pendientes de eliminación en Firebase Authentication. Cuando encuentra una solicitud nueva, envía un mensaje privado por Telegram y la marca como notificada para no repetir el aviso.

La automatización **no elimina usuarios de Authentication**. La eliminación seguirá siendo manual desde Firebase Console.

## 1. Crear el bot

1. Abre Telegram y busca la cuenta verificada `@BotFather`.
2. Envía `/newbot`.
3. Escribe el nombre que desees, por ejemplo `Control Empresarial Alertas`.
4. Define un usuario terminado en `bot`, por ejemplo `control_empresarial_alertas_bot`.
5. BotFather entregará un token. No lo publiques, no lo envíes por chat y no lo coloques en ningún archivo del repositorio.
6. Abre el bot recién creado y presiona **Iniciar** o envía `/start`.

## 2. Obtener el Chat ID

Después de enviar `/start`, abre temporalmente esta dirección en tu navegador reemplazando `TOKEN` por el token de BotFather:

`https://api.telegram.org/botTOKEN/getUpdates`

Busca dentro del resultado `chat`, luego `id`. Ese número es tu `TELEGRAM_CHAT_ID`. Si el número comienza con signo negativo, conserva también el signo.

Por seguridad, cierra esa pestaña y elimina la dirección del historial del navegador, porque contiene el token.

## 3. Registrar los secretos en GitHub

En el repositorio abre:

**Settings → Secrets and variables → Actions → New repository secret**

Crea estos cinco secretos:

| Secreto | Contenido |
| --- | --- |
| `TELEGRAM_BOT_TOKEN` | Token entregado por BotFather |
| `TELEGRAM_CHAT_ID` | Número obtenido con `getUpdates` |
| `FIREBASE_API_KEY` | Web API Key de Firebase, en Project settings |
| `FIREBASE_SUPERADMIN_EMAIL` | Correo de acceso del superadministrador |
| `FIREBASE_SUPERADMIN_PASSWORD` | Contraseña actual del superadministrador |

Los secretos quedan ocultos y no se guardan dentro del código público.

## 4. Hacer una prueba

1. En GitHub abre la pestaña **Actions**.
2. Selecciona **Avisar eliminaciones pendientes por Telegram**.
3. Presiona **Run workflow**.
4. Si ya existe una eliminación pendiente sin notificar, el bot enviará el mensaje.
5. Las siguientes comprobaciones se realizarán automáticamente cada 10 minutos.

Si no existen solicitudes nuevas, la ejecución finalizará correctamente con el mensaje `No hay eliminaciones nuevas para notificar.`

## Seguridad

- Nunca escribas los tokens o contraseñas directamente en el archivo YAML.
- Si cambias la contraseña del superadministrador, actualiza también el secreto `FIREBASE_SUPERADMIN_PASSWORD`.
- Si crees que el token del bot fue expuesto, revócalo desde BotFather y actualiza `TELEGRAM_BOT_TOKEN`.
