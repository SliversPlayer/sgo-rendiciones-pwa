import type { Rendicion } from '../types/rendicion';

type RendicionOwnerFields = Partial<
  Pick<Rendicion, 'id' | 'titulo' | 'uid' | 'usuario_id' | 'usuario_email' | 'usuario_nombre'>
>;

function normalizeOwnerValue(value?: string | null): string {
  return value?.trim() ?? '';
}

export function getRendicionOwnerId(rendicion: RendicionOwnerFields): string {
  return normalizeOwnerValue(rendicion.usuario_id) || normalizeOwnerValue(rendicion.uid);
}

export function isRendicionOwnedByUser(
  rendicion: RendicionOwnerFields,
  usuarioId: string,
): boolean {
  const expectedOwnerId = normalizeOwnerValue(usuarioId);
  const usuarioOwnerId = normalizeOwnerValue(rendicion.usuario_id);
  const uidOwnerId = normalizeOwnerValue(rendicion.uid);

  if (!expectedOwnerId || (!usuarioOwnerId && !uidOwnerId)) {
    return false;
  }

  if (usuarioOwnerId && usuarioOwnerId !== expectedOwnerId) {
    return false;
  }

  if (uidOwnerId && uidOwnerId !== expectedOwnerId) {
    return false;
  }

  return true;
}

export function reportInvalidRendicionOwner(
  rendicion: RendicionOwnerFields,
  context: string,
): void {
  console.warn('[SGO Rendiciones] Rendicion sin uid/usuario_id; se oculta en vista USER.', {
    context,
    id: rendicion.id,
    titulo: rendicion.titulo,
    usuario_id: rendicion.usuario_id,
    uid: rendicion.uid,
  });
}

export function getRendicionOwnerLabel(rendicion: RendicionOwnerFields): string {
  return (
    rendicion.usuario_nombre?.trim() ||
    rendicion.usuario_email?.trim() ||
    getRendicionOwnerId(rendicion) ||
    'Usuario sin identificar'
  );
}
