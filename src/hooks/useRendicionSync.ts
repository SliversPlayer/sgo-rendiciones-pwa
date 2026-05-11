import { useState } from 'react';
import { sendRendicion } from '../services/syncService';
import { useAuth } from './useAuth';

export function useRendicionSync() {
  const { currentUser } = useAuth();
  const [isSending, setIsSending] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);

  async function send(rendicionId: string) {
    try {
      setIsSending(true);
      setSyncError(null);
      setSyncSuccess(null);
      await sendRendicion(rendicionId, currentUser);
      setSyncSuccess('Rendicion enviada correctamente.');
    } catch (error) {
      setSyncError(
        error instanceof Error
          ? error.message
          : 'No se pudo enviar la rendicion. Intenta nuevamente.',
      );
    } finally {
      setIsSending(false);
    }
  }

  return {
    isSending,
    syncError,
    syncSuccess,
    send,
  };
}
