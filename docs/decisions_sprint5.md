# decisions_sprint5.md

# Sprint 5 — Flujo administrativo mínimo

## Objetivo

Implementar el primer flujo administrativo real del sistema:

* revisión de rendiciones
* aprobación
* rechazo
* observaciones administrativas
* panel admin mínimo

SIN transformar todavía el sistema en un ERP complejo.

---

# Estados de rendición

Estados válidos:

* BORRADOR
* ENVIADA
* APROBADA
* RECHAZADA

NO implementar:

* EN_REVISION
* estados intermedios adicionales

---

# Flujo de estados

Flujo permitido:

BORRADOR
→ ENVIADA
→ APROBADA

BORRADOR
→ ENVIADA
→ RECHAZADA
→ RECHAZADA editable nuevamente
→ ENVIADA

---

# Rechazo

## Reglas

Al rechazar:

* el ADMIN/SUPERADMIN debe ingresar una observación obligatoria
* la rendición vuelve a editable para el usuario
* la rendición permanece en estado RECHAZADA hasta el reenvío
* el usuario puede corregir y reenviar

---

## Observación de rechazo

Usar:

* texto libre simple

NO implementar:

* plantillas de rechazo
* motivos predefinidos
* categorías de rechazo

---

# Roles

Roles válidos:

* USER
* ADMIN
* SUPERADMIN

---

# Permisos

## USER

Puede:

* crear rendiciones
* editar borradores
* eliminar borradores
* enviar rendiciones
* corregir rendiciones rechazadas
* reenviar rendiciones rechazadas
* ver sus propias rendiciones

NO puede:

* aprobar
* rechazar
* acceder panel admin
* modificar estados manualmente

---

## ADMIN

Puede:

* acceder panel admin
* listar rendiciones enviadas
* abrir detalle
* aprobar
* rechazar
* ingresar observaciones administrativas

NO puede:

* editar gastos
* modificar rendiciones
* alterar información contable manualmente

---

## SUPERADMIN

Mismos permisos ADMIN.

Preparado para futuras funcionalidades:

* administración usuarios
* administración catálogos
* analytics
* configuraciones

NO implementar todavía esas funciones.

---

# Panel Admin

## Objetivo

Panel administrativo mínimo y funcional.

NO construir ERP complejo todavía.

---

## Debe incluir

* listado de rendiciones ENVIADAS
* filtro básico por estado
* apertura detalle rendición
* botón aprobar
* botón rechazar
* observación rechazo

---

## NO incluir todavía

* dashboards complejos
* analytics avanzados
* edición masiva
* exportaciones
* gráficos
* realtime
* auditoría compleja

---

# Administración offline

NO implementar funcionamiento offline para panel admin.

Razón:

* el admin trabaja sobre datos centralizados en Firebase
* aprobación requiere información remota actualizada
* no tiene sentido aprobar datos solo locales

---

# Firebase

## Fuente principal admin

El panel admin trabaja directamente sobre Firestore.

NO usar Dexie como fuente principal administrativa.

---

# Realtime

NO implementar realtime Firestore todavía.

Usar:

* fetch manual
* refresh simple
* consultas directas

---

# Observaciones administrativas

Guardar:

* fecha rechazo
* usuario rechazo
* observación rechazo

Guardar también:

* fecha aprobación
* usuario aprobación

---

# Auditoría mínima

Cada rendición aprobada/rechazada debe conservar:

* quién aprobó/rechazó
* cuándo ocurrió
* observación si aplica

---

# UI/UX

## Usuario

Debe ver claramente:

* estado actual
* observación rechazo si existe
* posibilidad de corregir si fue rechazada

---

## Admin

Debe tener:

* interfaz simple
* revisión rápida
* acceso fácil a comprobantes

---

# Restricciones importantes

NO permitir:

* edición admin de gastos
* modificación admin de montos
* cambios manuales de snapshots
* modificación manual de datos contables

Admin:

* aprueba
* rechaza
* comenta

---

# Objetivo arquitectónico

Conservar:

* simplicidad
* trazabilidad
* estabilidad
* consistencia de datos

Evitar:

* complejidad prematura
* lógica administrativa excesiva
* workflows empresariales avanzados todavía
