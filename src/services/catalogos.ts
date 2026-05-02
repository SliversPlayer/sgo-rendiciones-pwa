import type { CatalogoItem } from '../types/catalogo';

export const centrosCosto: CatalogoItem[] = [
  { id: 'cc-operaciones', nombre: 'Operaciones', codigo: 'CC-001' },
  { id: 'cc-comercial', nombre: 'Comercial', codigo: 'CC-002' },
  { id: 'cc-administracion', nombre: 'Administracion', codigo: 'CC-003' },
];

export const tiposDocumento: CatalogoItem[] = [
  { id: 'td-boleta', nombre: 'Boleta', codigo: '39' },
  { id: 'td-factura', nombre: 'Factura', codigo: '33' },
  { id: 'td-recibo', nombre: 'Recibo', codigo: 'REC' },
];

export const tiposGasto: CatalogoItem[] = [
  { id: 'tg-alimentacion', nombre: 'Alimentacion', codigo: 'GTO-001' },
  { id: 'tg-transporte', nombre: 'Transporte', codigo: 'GTO-002' },
  { id: 'tg-alojamiento', nombre: 'Alojamiento', codigo: 'GTO-003' },
  { id: 'tg-materiales', nombre: 'Materiales', codigo: 'GTO-004' },
];

export function findCatalogoItem(items: CatalogoItem[], id: string): CatalogoItem | undefined {
  return items.find((item) => item.id === id);
}
