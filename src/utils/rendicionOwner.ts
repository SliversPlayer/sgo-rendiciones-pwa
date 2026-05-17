import type { Rendicion } from '../types/rendicion';

type RendicionOwnerFields = Pick<Rendicion, 'usuario_id' | 'usuario_email' | 'usuario_nombre'>;

export function getRendicionOwnerLabel(rendicion: RendicionOwnerFields): string {
  return (
    rendicion.usuario_nombre?.trim() ||
    rendicion.usuario_email?.trim() ||
    rendicion.usuario_id.trim() ||
    'Usuario sin identificar'
  );
}
