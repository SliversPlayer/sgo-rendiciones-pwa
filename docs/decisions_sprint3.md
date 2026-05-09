# Decisions - SGO Rendiciones PWA

## Proyecto

SGO Rendiciones es una PWA offline-first para gestión de rendiciones de gastos.

El sistema está orientado a:
- uso móvil
- trabajo en terreno
- funcionamiento offline
- posterior sincronización manual con Firebase

---

# Modelo de negocio

## Rendición

Una rendición representa:
- un viaje
- un evento
- una actividad
- un contexto específico de gastos

Una rendición contiene múltiples gastos.

---

## Gasto

Cada gasto posee:

- fecha
- glosa
- centro de costo
- tipo documento
- número documento
- tipo gasto
- monto
- adjuntos

---

# Adjuntos

## Reglas

Cada gasto:
- mínimo 1 adjunto obligatorio
- máximo 2 adjuntos

Tipos permitidos:
- image/jpeg
- image/png
- application/pdf

---

## Manejo de imágenes

Las imágenes:
- deben comprimirse automáticamente si superan 5MB
- deben convertirse a JPEG optimizado
- deben redimensionarse manteniendo proporción
- ancho máximo recomendado: 1600px
- calidad aproximada: 0.75

Si después de comprimir:
- el archivo sigue superando 5MB
→ rechazar adjunto

Los PDF:
- no se comprimen
- si superan 5MB → rechazar

---

## Persistencia

Los adjuntos:
- se almacenan localmente como Blob en IndexedDB
- se subirán posteriormente a Firebase Storage

---

# Offline-first

La aplicación debe funcionar completamente offline.

Toda la información:
- rendiciones
- gastos
- adjuntos

se guarda primero localmente.

---

# Sincronización

## Estrategia

La sincronización es:
- manual
- individual
- por rendición

No existe sincronización automática.

No existe envío masivo de todas las rendiciones.

---

## Flujo

Dashboard
→ abrir rendición
→ revisar gastos
→ botón "Enviar rendición"

---

## Envío

Al enviar:
- se envía únicamente la rendición abierta
- se envían todos sus gastos
- se envían todos sus adjuntos

---

## Persistencia después de envío

Después del envío:
- la copia local se mantiene
- la copia remota se almacena en Firebase

No eliminar datos locales después del envío.

---

# Estados

## Estados de rendición

- BORRADOR
- PENDIENTE_ENVIO
- ENVIANDO
- ENVIADA
- APROBADA
- RECHAZADA
- ERROR

---

## Reglas de estados

### BORRADOR
- editable

### ENVIADA
- solo lectura
- no editable

### RECHAZADA
- vuelve a editable
- regresa a BORRADOR

### ERROR
- permite reintento
- mantiene datos locales

---

# Edición y eliminación

## Rendiciones enviadas

No permitir:
- editar rendiciones ENVIADAS
- eliminar rendiciones ENVIADAS

---

# Prevención de duplicados

## IDs

Usar UUID v4.

El mismo ID local:
- será usado en Firebase

Ejemplo:
rendiciones/{rendicionId}

---

## Reintentos

Si el usuario reintenta:
- no duplicar documentos
- reutilizar IDs existentes

---

# Firebase

## Firestore

Colección principal:

rendiciones/{rendicionId}

Subcolección:

rendiciones/{rendicionId}/gastos/{gastoId}

No usar colección global de gastos en el MVP.

---

## Firebase Storage

Estructura:

adjuntos/{rendicionId}/{gastoId}/{archivo}

---

# Usuarios

## Authentication

Usar Firebase Authentication:
- email/password

No implementar:
- login mágico
- OAuth
- SSO
- registro público

---

## Creación de usuarios

Los usuarios:
- se crearán manualmente desde Firebase Console en el MVP

---

## Roles

Roles definidos:
- USER
- ADMIN
- SUPER_ADMIN

---

## Colección usuarios

usuarios/{uid}

Campos mínimos:
- uid
- email
- nombre
- rol
- activo
- created_at

---

# Seguridad

## Firestore Rules

Regla mínima:
- usuario autenticado solo puede escribir sus rendiciones

ADMIN y SUPER_ADMIN:
- podrán leer todas las rendiciones

---

## Storage Rules

Usuario autenticado:
- solo puede subir adjuntos asociados a sus rendiciones

---

# Sync Status

Cada rendición debe tener:

- LOCAL
- PENDING
- SYNCED
- ERROR

---

# Validaciones

## Gasto válido

Debe contener:
- fecha
- glosa
- centro de costo
- tipo documento
- número documento
- tipo gasto
- monto > 0
- mínimo 1 adjunto

---

## Rendición válida

Debe contener:
- al menos 1 gasto válido

---

# Routing

Rutas definidas:

/ → Dashboard

/rendicion/:id
→ Detalle rendición

/rendicion/:id/nuevo
→ Crear gasto

/rendicion/:id/editar/:gastoId
→ Editar gasto

---

# Arquitectura

## Frontend

Stack:
- React
- TypeScript
- Vite
- Dexie
- Firebase

---

## Capas

components → hooks → services → db.ts

---

## Restricciones

- No usar Dexie directamente en componentes
- Toda lógica de datos debe pasar por services
- Toda lógica de negocio debe pasar por hooks

---

# Logging

Usar helper de logging.

Evitar:
- console.log dispersos

---

# UX/UI

## Mobile-first

La interfaz debe priorizar:
- uso móvil
- botones grandes
- formularios simples
- feedback claro

---

## Estados visuales de sincronización

🟡 Pendiente  
🔵 Enviando  
🟢 Enviada  
🔴 Error  

---

# Sprint 3

Sprint 3 incluye únicamente:
- Firebase Auth
- Firestore
- Firebase Storage
- envío individual
- sincronización segura
- manejo de errores

No incluir todavía:
- panel admin
- aprobación/rechazo UI
- exportaciones
- voucher SII
- catálogos dinámicos