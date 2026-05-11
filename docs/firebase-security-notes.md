# Firebase Security Notes

Sprint 3 no escribe reglas Firebase desde codigo.

Las reglas definitivas deberan permitir:

- Usuario autenticado puede crear y leer sus propias rendiciones.
- Usuario autenticado puede escribir gastos solo bajo sus propias rendiciones.
- Usuario autenticado puede subir adjuntos asociados a sus propias rendiciones.
- ADMIN y SUPER_ADMIN podran leer todas las rendiciones en un sprint futuro.

El MVP usa los UUID locales como IDs remotos para evitar duplicados:

- `rendiciones/{rendicionId}`
- `rendiciones/{rendicionId}/gastos/{gastoId}`
- `adjuntos/{rendicionId}/{gastoId}/{adjuntoId}-{nombreSanitizado}`
