interface ConnectionStatusProps {
  isOnline: boolean;
}

export function ConnectionStatus({ isOnline }: ConnectionStatusProps) {
  return (
    <div
      className={`connection-status ${isOnline ? 'is-online' : 'is-offline'}`}
      aria-live="polite"
      title={
        isOnline
          ? 'Con conexion disponible'
          : 'Sin conexion. Puede seguir trabajando y sincronizar despues.'
      }
    >
      <span className={`connection-dot ${isOnline ? 'is-online' : 'is-offline'}`} />
      <span>{isOnline ? 'Online' : 'Offline'}</span>
    </div>
  );
}
