# SGO Rendiciones — Design System

## Propósito

Este documento define los estándares visuales, de experiencia de usuario (UX), diseño de interfaz (UI) y consistencia general del proyecto SGO Rendiciones.

Todo nuevo desarrollo frontend deberá respetar estas directrices.

Este documento es la fuente oficial de verdad para decisiones visuales del proyecto.

---

# Filosofía del producto

SGO Rendiciones es una aplicación corporativa orientada a:

* gestión de rendiciones
* uso en terreno
* operación móvil
* funcionamiento offline
* sincronización posterior
* simplicidad operacional

La aplicación debe sentirse:

* moderna
* profesional
* rápida
* clara
* confiable
* estable

Debe evitarse:

* sobrecarga visual
* exceso de colores
* animaciones innecesarias
* formularios complejos
* componentes inconsistentes
* elementos que cambien de posición según el contenido

---

# Principios UX

## Mobile First

Toda funcionalidad debe diseñarse primero para teléfonos móviles.

Posteriormente debe adaptarse a:

* tablet
* notebook
* desktop

---

## Baja fricción

Las tareas principales deben requerir la menor cantidad de pasos posible.

Ejemplos:

* crear rendición
* agregar gasto
* adjuntar documento
* enviar rendición
* aprobar rendición

---

## Consistencia

Todos los componentes deben mantener:

* mismos colores
* mismos espaciados
* mismas jerarquías visuales
* mismos estilos de interacción

---

# Identidad visual

## Estilo general

La interfaz debe ser:

* limpia
* moderna
* corporativa
* minimalista

Inspiración:

* Notion
* Linear
* Stripe Dashboard
* aplicaciones SaaS modernas

---

# Colores

## Fondo principal

```css
#F5F7FA
```

## Fondo de cards

```css
#FFFFFF
```

## Texto principal

```css
#1F2937
```

## Texto secundario

```css
#6B7280
```

## Bordes

```css
#E5E7EB
```

## Acción principal

```css
#2563EB
```

## Acción de peligro

```css
#DC2626
```

## Éxito

```css
#16A34A
```

## Advertencia

```css
#F59E0B
```

---

# Tipografía

Preferencia:

```css
font-family: Inter, Roboto, system-ui, sans-serif;
```

Jerarquía sugerida:

* H1: 28–32px
* H2: 22–26px
* H3: 18–20px
* Texto normal: 14–16px
* Texto secundario: 12–14px

---

# Espaciado

Utilizar escala consistente:

```text
4px
8px
12px
16px
24px
32px
```

Evitar valores arbitrarios.

---

# Estados de Rendición

## BORRADOR

* Color gris
* Editable
* Visible solo para propietario

## ENVIADA

* Color azul
* Visible para ADMIN

## APROBADA

* Color verde

## RECHAZADA

* Color rojo
* Debe mostrar observación si existe

---

# Estados de Sincronización

## Respaldado

* Verde o neutro
* Texto: "Respaldado"

## Pendiente

* Amarillo
* Texto: "Pendiente de sincronización"

## Error

* Rojo
* Texto: "Error de sincronización"

---

# Cards

Las cards son el principal contenedor visual del sistema.

Todas las cards deben:

* mantener altura consistente
* usar layout vertical
* mantener contenido separado de acciones

Implementación recomendada:

```css
.card {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.card-content {
  flex: 1;
}

.card-actions {
  margin-top: auto;
}
```

---

# Regla fundamental de Cards

Contenido arriba.

Acciones abajo.

Siempre.

Los botones nunca deben desplazarse por diferencias de longitud del contenido.

---

# Cards de Rendiciones (Usuario)

Contenido:

* nombre/título
* tipo de rendición
* fecha
* monto
* estado
* estado de sincronización
* observaciones si existen

Acciones:

```text
[Ver gastos] [Editar]
[Eliminar]
```

Reglas:

* No colocar los tres botones en una misma fila.
* No generar overflow horizontal.
* Mantener botones alineados.

---

# Cards Administrativas

Contenido:

* usuario
* fecha
* monto
* estado
* observación

Acción:

```text
[Revisar]
```

Reglas:

* Botón anclado abajo.
* Cards alineadas visualmente.
* El contenido no debe mover el botón.

---

# Botones

## Primario

Usos:

* guardar
* crear
* enviar
* aprobar

Debe destacar visualmente.

---

## Secundario

Usos:

* cancelar
* volver
* cerrar

Debe ser menos dominante.

---

## Peligroso

Usos:

* eliminar
* rechazar
* desactivar

Debe usar color rojo o borde rojo.

Acciones críticas deben solicitar confirmación.

---

# Formularios

Todos los campos deben:

* tener altura consistente
* padding consistente
* mensajes de error visibles

---

# Selects

Deben:

* mostrar únicamente opciones válidas
* evitar listas vacías
* tener placeholder claro

Si no existen opciones:

* deshabilitar control
* informar claramente al usuario

---

# Campo Monto

No debe utilizar spinners HTML.

No deben mostrarse flechas de incremento/decremento.

Debe favorecer ingreso rápido de números grandes.

---

# RUT

El RUT es un dato maestro de usuario.

## Visualización

Mostrar:

```text
12.345.678-5
```

## Almacenamiento

Guardar:

```text
12345678-5
```

## Validación

Utilizar algoritmo chileno Módulo 11.

No utilizar únicamente expresiones regulares.

## Unicidad

No permitir usuarios duplicados por RUT.

## Edición

El RUT se edita dentro del formulario normal del usuario.

No debe existir botón independiente:

```text
Editar RUT
```

---

# Login

Debe ser simple.

Campos:

* correo
* contraseña

Acciones:

* iniciar sesión
* recuperación de contraseña

---

# Recuperación de Contraseña

Utilizar mecanismo nativo de Firebase Auth.

Mensaje recomendado:

```text
Si el correo está registrado, recibirá instrucciones para recuperar su contraseña.
```

Nunca informar si el correo existe o no.

---

# Cambio Obligatorio de Contraseña

Si:

```text
mustChangePassword === true
```

Entonces:

* bloquear acceso normal
* exigir cambio de contraseña
* impedir uso de la aplicación hasta completar el cambio

---

# Navegación por Roles

## USER

No debe visualizar:

* Panel Admin
* Panel Superadmin

## ADMIN

Debe visualizar:

* Panel Admin

No debe visualizar:

* Panel Superadmin

## SUPERADMIN

Debe visualizar:

* Panel Superadmin

---

# Panel Admin

Debe mostrar:

* ENVIADAS
* APROBADAS
* RECHAZADAS

No debe mostrar:

* BORRADORES

---

# Panel Superadmin

Debe permitir:

* crear usuarios
* cambiar roles
* activar/desactivar usuarios
* administrar catálogos

Debe mantener coherencia visual con el resto del sistema.

---

# Catálogos

Catálogos administrables:

* Centro de negocio
* Tipo de documento
* Tipo de gasto
* Tipo de rendición

Reglas:

* No eliminar físicamente registros.
* Solo activar/desactivar.
* Los elementos inactivos no aparecen en formularios nuevos.
* Los históricos conservan snapshot.

---

# Offline

El usuario debe comprender claramente:

* si está online
* si está offline
* si existen cambios pendientes

Mensaje sugerido:

```text
Sin conexión. Puede seguir trabajando y los cambios se sincronizarán cuando vuelva a estar online.
```

---

# Errores

Los mensajes deben ser:

* claros
* amigables
* accionables

Evitar:

* códigos internos
* mensajes técnicos
* errores de Firebase visibles al usuario

---

# Responsive

Toda pantalla debe probarse en:

* móvil vertical
* móvil horizontal
* tablet
* desktop

No debe existir:

* overflow horizontal roto
* botones fuera de pantalla
* cards deformadas

---

# Animaciones

Las animaciones deben ser:

* mínimas
* rápidas
* discretas

Priorizar claridad y velocidad.

---

# Restricciones

Las mejoras visuales no deben:

* romper Firebase
* romper Firestore
* romper Dexie
* romper sincronización offline
* romper aislamiento por usuario
* romper permisos
* alterar reglas de negocio

---

# Fuera de Alcance

Este documento no regula:

* Voucher
* DTE
* Integración SII
* Auditoría avanzada
* Reportes avanzados
* Dashboards ejecutivos

Estas funcionalidades se definirán en documentos independientes.
