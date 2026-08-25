# Configurar el receptor ZKTeco ADMS gratuito

Esta guía prepara el receptor antes de modificar el reloj. El equipo probado es un ZKTeco con plataforma ZMM510, servicio PUSH, modo ADMS, nombre de dominio y HTTPS.

## 1. Precauciones

- Guarda en un lugar privado la dirección actual del servidor del reloj.
- No publiques el número de serie, la MAC ni las credenciales de Firebase.
- No cambies el reloj hasta que la ruta `/salud` del receptor responda correctamente.
- El cambio de servidor puede desconectar el equipo del software que utiliza actualmente.

## 2. Crear una cuenta de servicio limitada

1. Abre Google Cloud Console con el proyecto de Firebase.
2. Entra a **IAM y administración → Cuentas de servicio**.
3. Crea una cuenta llamada `receptor-zkteco-adms`.
4. Asígnale únicamente el rol **Usuario de Cloud Datastore** (`roles/datastore.user`).
5. En la cuenta creada, abre **Claves → Agregar clave → Crear clave nueva → JSON**.
6. Descarga el JSON y consérvalo de forma privada.

Del archivo se utilizarán solamente:

- `client_email`
- `private_key`

No subas el JSON al repositorio ni lo compartas por chat. Una cuenta de servicio permite escribir directamente en Firestore y debe tratarse como una contraseña crítica.

## 3. Crear el Worker gratuito

1. Crea o abre una cuenta de Cloudflare.
2. En **Workers & Pages**, crea un Worker conectando este repositorio de GitHub.
3. Selecciona como directorio raíz `cloudflare/zkteco-adms`.
4. Usa `npm install` como comando de instalación y `npm run deploy` como comando de despliegue, si Cloudflare los solicita.
5. En la configuración del Worker agrega estos secretos:

| Nombre | Valor |
|---|---|
| `FIREBASE_CLIENT_EMAIL` | Valor `client_email` del JSON |
| `FIREBASE_PRIVATE_KEY` | Valor completo `private_key`, incluyendo BEGIN/END |

La variable no secreta `FIREBASE_PROJECT_ID` ya está configurada en `wrangler.toml`.

## 4. Comprobar el receptor

Abre la URL pública terminada en `workers.dev` y agrega `/salud`:

```text
https://NOMBRE_DEL_WORKER.SUBDOMINIO.workers.dev/salud
```

Debe responder un JSON con `ok: true` y `servicio: ZKTeco ADMS`.

## 5. Autorizar el reloj antes de conectarlo

1. Fusiona el PR correspondiente y abre el superadministrador.
2. Selecciona la empresa.
3. Entra a **Relojes**.
4. Registra nombre, modelo, número de serie exacto y sucursal.
5. En el reloj consulta el PIN o ID de un colaborador de prueba.
6. Vincula ese PIN con el colaborador dentro del superadministrador.

Un serial no registrado será rechazado. Un PIN no vinculado quedará en `marcacionesRelojPendientes` y no se contará como asistencia.

## 6. Prueba controlada del reloj

Realiza la prueba cuando no haya personal marcando:

1. Fotografía o anota la configuración actual para poder restaurarla.
2. Mantén **Modo de servidor: ADMS**.
3. Mantén **Habilitar nombre de dominio: activado**.
4. En **Dirección del servidor**, escribe únicamente el host del Worker, sin `/iclock` y sin rutas adicionales:

```text
NOMBRE_DEL_WORKER.SUBDOMINIO.workers.dev
```

5. Mantén **Servidor proxy: desactivado**.
6. Mantén **HTTPS: activado**.
7. Guarda y espera el indicador de conexión.
8. Realiza una sola marcación con el colaborador vinculado.
9. Revisa Firestore y la pantalla de Marcaciones del sistema.

Si el reloj no conecta o la marca no aparece, restaura inmediatamente la dirección anterior. No borres registros del reloj durante el piloto.

## 7. Consumo esperado

Los sondeos `getrequest` responden sin acceder a Firestore. Un lote real consulta el dispositivo, agrupa todos los PIN en una sola petición y guarda las marcaciones en un único commit. Los identificadores deterministas evitan duplicados cuando el reloj reintenta un envío.

En el plan gratuito, Cloudflare permite 100 000 solicitudes diarias y hasta 50 subsolicitudes externas por ejecución. Este receptor utiliza normalmente cuatro subsolicitudes por lote: autenticación (solo al renovar el token), reloj autorizado, vínculos agrupados y escritura. La lectura de vínculos se factura en Firestore por cada PIN único incluido en el lote, no por cada fila repetida.

## 8. Desactivar la integración

Puedes detenerla de dos maneras:

- Desactivar el reloj desde **Superadministrador → Empresa → Relojes**.
- Restaurar en el equipo la dirección del servidor anterior.
