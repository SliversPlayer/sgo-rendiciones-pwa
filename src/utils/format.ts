export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatTipoRendicionNombre(
  id?: string | null,
  nombre?: string | null,
  fallback = 'Sin tipo',
): string {
  const value = nombre?.trim();

  if (id === 'TR_FONDOS_POR_RENDIR' || value?.toUpperCase() === 'FONDOS POR RENDIR') {
    return 'Fondos por rendir';
  }

  return value || fallback;
}
