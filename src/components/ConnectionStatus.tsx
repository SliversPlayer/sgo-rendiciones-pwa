interface ConnectionStatusProps {
  isOnline: boolean;
}

export function ConnectionStatus({ isOnline }: ConnectionStatusProps) {
  return (
    <div className="connection-status" aria-live="polite">
      <span className={`connection-dot ${isOnline ? 'is-online' : 'is-offline'}`} />
      <span>{isOnline ? 'Online' : 'Offline'}</span>
    </div>
  );
}
