import type { Rendicion, RendicionEstado } from '../types/rendicion';

const EDITABLE_ESTADOS: RendicionEstado[] = ['BORRADOR', 'RECHAZADA'];

export function isRendicionEditable(rendicion?: Pick<Rendicion, 'estado'> | null): boolean {
  return Boolean(rendicion && EDITABLE_ESTADOS.includes(rendicion.estado));
}

export function getEstadoLabel(estado: RendicionEstado): string {
  const labels: Record<RendicionEstado, string> = {
    BORRADOR: 'Borrador',
    ENVIADA: 'Enviada',
    APROBADA: 'Aprobada',
    RECHAZADA: 'Rechazada',
  };

  return labels[estado];
}
