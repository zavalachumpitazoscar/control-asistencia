# Bot de marcación por WhatsApp

El webhook identifica al colaborador mediante `contacto.telefono`, muestra opciones de marcación, solicita una ubicación nativa de WhatsApp y después una fotografía. La marcación se registra en `marcaciones` con `origen: WHATSAPP`.

## Requisitos

- Aplicación de Meta con WhatsApp Business Platform (Cloud API).
- Número de WhatsApp aprobado y su `PHONE_NUMBER_ID`.
- Bucket de Firebase Storage.
- Los teléfonos de colaboradores deben ser únicos e incluir los nueve dígitos peruanos o el prefijo `51`.
- Cada colaborador debe estar activo, tener sucursal y la sucursal debe tener `geocercaMovil`.

## Secretos

Ejecutar desde la raíz del proyecto. No guardar los valores en GitHub:

```bash
firebase functions:secrets:set WHATSAPP_VERIFY_TOKEN
firebase functions:secrets:set WHATSAPP_ACCESS_TOKEN
firebase functions:secrets:set WHATSAPP_PHONE_NUMBER_ID
firebase functions:secrets:set WHATSAPP_APP_SECRET
firebase functions:secrets:set WHATSAPP_STORAGE_BUCKET
firebase deploy --only functions:whatsappWebhook
```

Configurar en Meta la URL devuelta por Firebase para `whatsappWebhook`, usar el mismo `WHATSAPP_VERIFY_TOKEN` y suscribir el campo `messages`.

## Seguridad y limitación de origen

El webhook valida la firma `X-Hub-Signature-256`, usa hora del servidor, exige ubicación, geocerca, foto, secuencia diaria y evita documentos duplicados. Meta no informa al webhook si un mensaje provino de WhatsApp Web, Desktop o la aplicación móvil; por ello el registro conserva `riesgos.origenDispositivoNoDisponibleEnApi: true`. La ubicación debe recibirse como mensaje nativo `location`; texto o enlaces de mapas no son aceptados.
