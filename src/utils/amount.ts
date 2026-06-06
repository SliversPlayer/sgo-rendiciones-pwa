export const INVALID_POSITIVE_AMOUNT_MESSAGE = 'Ingresa un monto valido mayor a 0.';

export function parseFiniteAmount(value: string | number | null | undefined): number | null {
  if (typeof value === 'string') {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return null;
    }

    const amount = Number(trimmedValue);
    return Number.isFinite(amount) ? amount : null;
  }

  if (typeof value !== 'number') {
    return null;
  }

  return Number.isFinite(value) ? value : null;
}

export function parsePositiveFiniteAmount(value: string | number | null | undefined): number | null {
  const amount = parseFiniteAmount(value);
  return amount !== null && amount > 0 ? amount : null;
}

export function isPositiveFiniteAmount(value: number): boolean {
  return parsePositiveFiniteAmount(value) !== null;
}
