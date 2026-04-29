export function formatDisplayDate(value: string): string {
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function nowIso(): string {
  return new Date().toISOString();
}
