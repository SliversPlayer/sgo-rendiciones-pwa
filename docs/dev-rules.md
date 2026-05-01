# Reglas de desarrollo - SGO Rendiciones

## Principios generales

- Mantener código simple, claro y modular
- No sobreingeniería
- No duplicar lógica
- Priorizar mantenibilidad

---

## Arquitectura obligatoria

Flujo de capas:

components → hooks → services → db.ts

Reglas:

- Components: solo UI
- Hooks: lógica de negocio
- Services: acceso a datos
- db.ts: única definición de IndexedDB

Prohibido:
- usar Dexie directamente en componentes

---

## Manejo de datos

- IDs: usar UUID v4
- Fechas: usar ISO 8601 (toISOString)

Ejemplo:
```ts
new Date().toISOString()