# SGO Rendiciones PWA

Aplicacion web progresiva para gestionar rendiciones de gastos con enfoque offline-first. Permite crear rendiciones, agrupar gastos, adjuntar comprobantes y enviar manualmente una rendicion individual a Firebase cuando existe conexion.

## Estado Actual Del Proyecto

El proyecto se encuentra avanzado hasta Sprint 4. La base local offline-first de Sprint 1 sigue vigente, pero ahora incluye autenticacion con Firebase, gastos con adjuntos, sincronizacion manual por rendicion, catalogos estructurados desde CSV, rutas con React Router y mejoras responsive para uso movil.

La aplicacion esta pensada para uso en terreno: los datos se crean primero en IndexedDB mediante Dexie y luego se sincronizan a Firestore/Storage solo cuando el usuario envia una rendicion especifica.

## Stack Tecnologico

- Vite
- React
- TypeScript
- React Router
- Dexie / IndexedDB
- Firebase Auth
- Firestore
- Firebase Storage
- PWA con manifest y service worker basico

## Funcionalidades Implementadas

### Gestion De Rendiciones

- Creacion, edicion, listado y eliminacion local de rendiciones editables.
- Una rendicion representa un grupo de gastos.
- Tipo de rendicion obligatorio desde catalogo.
- Estados locales y de sincronizacion:
  - `BORRADOR`
  - `PENDIENTE_ENVIO`
  - `ENVIANDO`
  - `ENVIADA`
  - `APROBADA`
  - `RECHAZADA`
  - `ERROR`
  - sync: `LOCAL`, `PENDING`, `SYNCED`, `ERROR`
- Las rendiciones enviadas quedan bloqueadas para edicion y eliminacion.
- Dashboard con busqueda por texto, filtro por estado, orden reciente y estadisticas minimas:
  - total rendiciones
  - total borradores
  - total enviadas
  - monto total acumulado

### Gestion De Gastos

Cada gasto pertenece a una rendicion e incluye:

- fecha
- glosa
- centro de negocio
- tipo de documento
- numero de documento
- tipo de gasto
- monto
- adjuntos/comprobantes

Los gastos solo pueden crearse, editarse o eliminarse si la rendicion sigue editable.

### Adjuntos Y Comprobantes

- Cada gasto requiere al menos 1 adjunto para que la rendicion pueda enviarse.
- Maximo 2 adjuntos por gasto.
- Tipos permitidos:
  - `image/jpeg`
  - `image/png`
  - `application/pdf`
- Imagenes JPEG/PNG mayores a 5 MB se comprimen localmente:
  - salida JPEG
  - ancho maximo 1600 px
  - calidad aproximada 0.75
- PDFs no se comprimen y se rechazan si superan 5 MB.
- Los adjuntos se guardan localmente como `Blob` en IndexedDB y se suben a Firebase Storage al enviar.

### Catalogos

La app usa catalogos estructurados cargados desde `docs/catalogos/`:

- `centros_negocio.csv`
- `tipos_documento.csv`
- `tipos_rendicion.csv`
- `tipos_gasto.csv`

Los catalogos se cargan automaticamente al iniciar la aplicacion y se almacenan localmente en Dexie si las tablas estan vacias. No se duplican seeds ni se eliminan datos existentes.

Los formularios usan selects/radio cards estrictos. Al seleccionar catalogos se guarda un snapshot completo para preservar la historia de la rendicion aunque el catalogo cambie despues.

Ejemplos de snapshots guardados:

- `tipo_rendicion_id`
- `tipo_rendicion_nombre`
- `tipo_rendicion_cuenta_contable`
- `centro_negocio_id`
- `centro_negocio_nombre`
- `centro_negocio_codigo`
- `tipo_documento_codigo`
- `tipo_documento_cuenta_contable`
- `tipo_gasto_cuenta_contable`

Los codigos internos y cuentas contables deben preservarse porque sirven para integraciones administrativas o exportaciones futuras.

### Offline-First

- Las rendiciones, gastos, adjuntos y catalogos se guardan localmente.
- La creacion y edicion funcionan sin conexion mientras el usuario ya tenga sesion local de Firebase.
- La busqueda y filtros operan sobre datos locales.
- El indicador online/offline muestra el estado de conexion.
- El envio a Firebase requiere conexion.

### Sincronizacion Con Firebase

- La sincronizacion es manual e individual por rendicion.
- No existe envio masivo de todas las rendiciones.
- Al enviar una rendicion:
  - se valida que exista usuario autenticado
  - se valida conexion online
  - se valida que haya al menos 1 gasto
  - se valida tipo de rendicion
  - se validan gastos, montos, catalogos y adjuntos
  - se suben adjuntos a Firebase Storage
  - se guarda la rendicion en Firestore
  - se guardan los gastos en la subcoleccion `rendiciones/{rendicionId}/gastos`
  - se reutilizan los IDs locales para evitar duplicados en reintentos
  - la rendicion local queda `ENVIADA` y `SYNCED`
- Si ocurre un error, la rendicion queda en `ERROR` y permite reintento.

### Rutas Y Navegacion

La navegacion usa React Router con rutas protegidas por autenticacion.

Rutas principales:

- `/` -> Dashboard
- `/login` -> Login
- `/rendiciones/:id` -> Detalle de rendicion
- `/rendiciones/:id/gastos/nuevo` -> Crear gasto
- `/rendiciones/:id/gastos/:gastoId` -> Editar gasto

Tambien existen redirects de compatibilidad para rutas antiguas `/rendicion/...`.

### UX Responsive

- Interfaz mobile-first.
- Botones grandes y formularios simples.
- Acciones sticky en formularios cuando corresponde.
- En mobile, los botones apilados de creacion/edicion priorizan la accion principal:
  - `Guardar` sobre `Cancelar`
  - `Guardar gasto` sobre `Cancelar`
- En detalle de rendicion, el orden visual de acciones principales es:
  - `Volver`
  - `Enviar rendicion`
  - `Agregar gasto`
- Selects con feedback visual.
- Badges de estado.
- Skeletons simples en carga.
- Cards responsive para rendiciones y gastos.

## Modelo Funcional

Una rendicion agrupa multiples gastos. Cada gasto contiene informacion contable, catalogos seleccionados y comprobantes.

El usuario trabaja localmente primero. Cuando la rendicion esta completa y hay conexion, puede enviarla manualmente a Firebase. Una rendicion enviada queda bloqueada para evitar cambios posteriores sobre informacion ya sincronizada.

## Instalacion Y Ejecucion Local

Instalar dependencias:

```bash
npm install
```

Levantar servidor de desarrollo:

```bash
npm run dev
```

Generar build de produccion:

```bash
npm run build
```

Ejecutar validacion automatica disponible:

```bash
npm test
```

Ejecutar smoke real contra Firebase con las cuentas base:

```powershell
$env:SGO_SMOKE_PASSWORD='password-compartido'
npm run test:smoke:firebase
```

Previsualizar el build:

```bash
npm run preview
```

Actualmente `npm test` ejecuta el typecheck de TypeScript y pruebas locales con `node --test` para configuracion, reglas Firebase y resguardos offline/PWA. El smoke Firebase valida autenticacion, perfil y permisos basicos reales para `superadmin@sgo.cl`, `admin@sgo.cl` y `user@sgo.cl`.

## Deploy En Vercel

El proyecto incluye `vercel.json` para desplegar la app Vite como SPA:

- build command: `npm run build`
- output directory: `dist`
- rewrite de rutas a `/index.html`
- cache largo para `/assets/*`
- `no-cache` para `index.html` y `sw.js`

Configurar en Vercel las mismas variables `VITE_*` usadas localmente antes de desplegar.

## Variables De Entorno

La integracion Firebase usa variables `VITE_*`. No existe un `.env.example` en el repo, pero la app espera:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Estas variables deben definirse en `.env` local o en el entorno de despliegue. Existe un `.env.example` con la plantilla esperada. No se deben versionar secretos ni configuraciones privadas.

## Estructura Del Proyecto

```text
docs/
  catalogos/              CSV usados para seed local de catalogos
  decisions*.md           decisiones de arquitectura y producto
  dev-rules.md            reglas de desarrollo
  firebase-security-notes.md
  sprints.md

public/
  manifest.webmanifest    metadata PWA
  sw.js                   service worker basico
  icons/

src/
  components/             componentes UI reutilizables
  hooks/                  estado, formularios, auth, catalogos y sync
  pages/                  pantallas principales
  services/               Dexie, Firebase, catalogos, rendiciones, gastos y sync
  services/firebase/      inicializacion Firebase
  types/                  contratos TypeScript
  utils/                  fechas, IDs, estados, adjuntos, compresion y formato
  App.tsx                 rutas y proteccion por auth
  main.tsx                bootstrap React, Router, AuthProvider y service worker
  styles.css              estilos globales responsive
```

## Flujo De Uso

1. Iniciar sesion con usuario Firebase.
2. Crear una rendicion.
3. Seleccionar tipo de rendicion.
4. Agregar uno o mas gastos.
5. Seleccionar centro de negocio, tipo documento y tipo gasto.
6. Adjuntar comprobantes.
7. Revisar que la rendicion este valida.
8. Enviar la rendicion manualmente.
9. Revisar la copia enviada en Firestore y adjuntos en Storage.

## Validaciones Importantes

- La rendicion requiere titulo y tipo de rendicion.
- La rendicion debe tener al menos 1 gasto para enviarse.
- Cada gasto requiere:
  - fecha valida
  - glosa
  - centro de negocio
  - tipo documento
  - numero documento
  - tipo gasto
  - monto mayor a 0
  - al menos 1 adjunto
- Cada gasto permite maximo 2 adjuntos.
- Solo se permiten JPEG, PNG y PDF.
- PDFs mayores a 5 MB se rechazan.
- Imagenes mayores a 5 MB se intentan comprimir; si siguen superando 5 MB se rechazan.
- Rendiciones enviadas o sincronizadas no pueden reenviarse ni editarse.
- El envio requiere conexion online.
- Los errores de sync se guardan en la rendicion para informar y permitir reintento.

## Pruebas Manuales Recomendadas

- Iniciar sesion correctamente.
- Crear rendicion con tipo de rendicion.
- Cancelar la creacion de una rendicion.
- Editar una rendicion en borrador.
- Agregar gasto con catalogos validos.
- Adjuntar imagen JPEG/PNG.
- Adjuntar PDF valido.
- Probar limite de 2 adjuntos por gasto.
- Probar rechazo de PDF mayor a 5 MB.
- Probar modo offline creando o editando datos locales.
- Volver online y enviar una rendicion individual.
- Confirmar que Firestore tenga `rendiciones/{id}` y subcoleccion `gastos`.
- Confirmar que Storage tenga archivos en `adjuntos/{rendicionId}/{gastoId}/`.
- Confirmar snapshots de catalogos en Firestore.
- Verificar que una rendicion enviada quede bloqueada.
- Probar responsive mobile:
  - `Guardar` sobre `Cancelar` en rendicion
  - `Guardar gasto` sobre `Cancelar` en gasto
  - `Enviar rendicion` antes que `Agregar gasto` en detalle

## Roadmap / Proximos Sprints

- Panel administrativo.
- Mantencion administrativa de catalogos.
- Roles/permisos avanzados.
- Aprobaciones y rechazos.
- Exportacion CSV/Excel.
- Voucher SII.
- Reportes o dashboards mas completos.
- Auditoria y trazabilidad.
- Hardening de validaciones.
- Tests automatizados.
- Despliegue productivo y revision de reglas Firebase.

## Notas De Desarrollo

- Mantener el enfoque offline-first.
- No cambiar estructuras Dexie sin migraciones seguras.
- Mantener consistencia entre datos locales y payloads enviados a Firebase.
- Preservar UUID locales al sincronizar para evitar duplicados.
- Preservar codigos internos y cuentas contables de catalogos.
- No implementar sync automatico ni envio masivo sin decision explicita.
- Revisar `docs/dev-rules.md`, `docs/decisions.md`, `docs/decisions_sprint3.md` y `docs/sprints.md` antes de cambios grandes.

## Instrucciones para IA

Todo cambio visual debe respetar `design-system.md`.

Antes de modificar UI:
1. Leer design-system.md.
2. Aplicar sus reglas.
3. Reportar desviaciones encontradas.
