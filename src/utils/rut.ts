const RUT_BODY_PATTERN = /^[1-9]\d{0,7}$/;
const RUT_DV_PATTERN = /^[0-9K]$/;

function splitRut(value: string): { body: string; dv: string } | null {
  const cleaned = value.trim().replace(/\./g, '').replace(/\s/g, '').toUpperCase();

  if (!cleaned) {
    return null;
  }

  if (cleaned.includes('-')) {
    const parts = cleaned.split('-');

    if (parts.length !== 2) {
      return null;
    }

    return {
      body: parts[0],
      dv: parts[1],
    };
  }

  if (cleaned.length < 2) {
    return null;
  }

  return {
    body: cleaned.slice(0, -1),
    dv: cleaned.slice(-1),
  };
}

function getExpectedRutDv(body: string): string {
  let sum = 0;
  let multiplier = 2;

  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = 11 - (sum % 11);

  if (remainder === 11) {
    return '0';
  }

  if (remainder === 10) {
    return 'K';
  }

  return String(remainder);
}

export function normalizeRut(value: string): string {
  const rut = splitRut(value);

  if (!rut) {
    return '';
  }

  const body = rut.body.replace(/^0+/, '') || '0';
  const dv = rut.dv.toUpperCase();

  if (!RUT_BODY_PATTERN.test(body) || !RUT_DV_PATTERN.test(dv)) {
    return '';
  }

  return `${body}-${dv}`;
}

export function validateRut(value: string): boolean {
  const rut = splitRut(value);

  if (!rut) {
    return false;
  }

  const body = rut.body.replace(/^0+/, '') || '0';
  const dv = rut.dv.toUpperCase();

  if (!RUT_BODY_PATTERN.test(body) || !RUT_DV_PATTERN.test(dv)) {
    return false;
  }

  return getExpectedRutDv(body) === dv;
}

export function formatRut(value?: string): string {
  if (!value) {
    return '';
  }

  const normalized = normalizeRut(value);
  const rut = splitRut(normalized);

  if (!rut) {
    return value;
  }

  const formattedBody = rut.body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formattedBody}-${rut.dv}`;
}
