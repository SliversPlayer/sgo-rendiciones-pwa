# SGO Rendiciones PWA

Base Sprint 1 de una PWA offline-first para gestion local de rendiciones.

## Stack

- React
- TypeScript
- Vite
- Dexie.js sobre IndexedDB
- Service Worker y manifest PWA basicos

## Ejecutar

```bash
npm install
npm run dev
```

Para validar el build:

```bash
npm run build
npm run preview
```

La PWA queda disponible offline despues de la primera carga gracias al service worker. En desarrollo, los navegadores pueden tratar el cache de forma distinta; para probar comportamiento PWA real se recomienda `npm run build` y `npm run preview`.

## Arquitectura

```text
src/
  components/  UI reutilizable
  hooks/       estado online/offline y rendiciones
  pages/       pantallas de la app
  services/    IndexedDB y operaciones locales
  types/       contratos TypeScript
  utils/       usuario demo, fechas e ids
```

## Alcance Sprint 1

Incluye crear, listar, editar y eliminar rendiciones en estado `BORRADOR`, persistidas localmente en IndexedDB para el usuario demo `demo-user`.

No incluye gastos, adjuntos, Firebase, login real, aprobaciones, exportaciones, catalogos editables ni voucher CSV.
