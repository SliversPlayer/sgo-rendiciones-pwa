# Decisiones del sistema

## Modelo

- 1 rendición = grupo de gastos
- 1 gasto = unidad de registro
- cada rendición representa un viaje, evento o contexto específico de gastos

---

## Adjuntos

- mínimo 1 adjunto obligatorio por gasto
- máximo 2 adjuntos por gasto

Tipos permitidos:
- image/jpeg
- image/png
- application/pdf

---

## Envío

- envío manual
- envío individual por rendición
- no existe envío masivo de todas las rendiciones

---

## Offline

- funcionamiento completamente offline
- persistencia local mediante IndexedDB
- envío manual posterior a Firebase

---

## Catálogos

- incluyen código interno para futuro voucher SII
- visibles como nombre amigable al usuario
- modificables posteriormente desde administración

---

## Identificadores

- UUID v4
- mismo ID local será utilizado en Firebase
- evitar duplicados mediante reutilización de IDs

---

## Firebase

- Firebase Authentication con email/password
- Firestore como base de datos remota
- Firebase Storage para adjuntos

---

## Sincronización

- sincronización manual
- una rendición a la vez
- mantener copia local después del envío
- no eliminar datos locales enviados

---

## Estados de rendición

- BORRADOR
- ENVIADA
- APROBADA
- RECHAZADA

---

## Reglas de edición

- rendiciones ENVIADAS no son editables
- rendiciones ENVIADAS no pueden eliminarse
- rendiciones RECHAZADAS permanecen editables y conservan la observacion de rechazo hasta el reenvio

---

## Arquitectura

- aplicación mobile-first
- arquitectura offline-first
- React + TypeScript + Vite
- IndexedDB mediante Dexie

---

## Usuarios

Roles definidos:
- USER
- ADMIN
- SUPERADMIN

Los usuarios:
- serán creados manualmente desde Firebase Console en el MVP
