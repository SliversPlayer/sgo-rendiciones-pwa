import { FormEvent, useState } from 'react';
import { PasswordResetModal } from '../components/PasswordResetModal';
import { useAuth } from '../hooks/useAuth';

interface IconProps {
  className?: string;
}

function FolderCheckIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
      <path d="m9 13 2 2 4-4" />
    </svg>
  );
}

function MailIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function LockIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.06 12.35a1 1 0 0 1 0-.7A10.75 10.75 0 0 1 12 5a10.75 10.75 0 0 1 9.94 6.65 1 1 0 0 1 0 .7A10.75 10.75 0 0 1 12 19a10.75 10.75 0 0 1-9.94-6.65" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5a10.75 10.75 0 0 1 9.94 6.65 1 1 0 0 1 0 .7 10.8 10.8 0 0 1-2.3 3.6" />
      <path d="M6.61 6.61A10.86 10.86 0 0 0 2.06 11.65a1 1 0 0 0 0 .7A10.75 10.75 0 0 0 12 19a10.95 10.95 0 0 0 5.39-1.39" />
      <line x1="2" x2="22" y1="2" y2="22" />
      <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88" />
    </svg>
  );
}

function CircleAlertIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}

function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function ShieldCheckIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function LoginPage() {
  const { authError, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPasswordResetOpen, setIsPasswordResetOpen] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const displayedError = formError ?? (authError ? 'Correo o contraseña incorrectos.' : null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password) {
      setFormError('Completa correo corporativo y contraseña.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      await login(email, password);
    } catch {
      setFormError('Correo o contraseña incorrectos.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="app-shell auth-shell">
      <section className="form-panel auth-panel login-card" aria-labelledby="login-title">
        <div className="login-brand-block">
          <div className="login-logo" aria-hidden="true">
            <FolderCheckIcon className="login-logo-icon" />
          </div>
          <p className="login-brand-name">SGO Rendiciones</p>
        </div>

        <div className="login-heading">
          <h1 id="login-title">Iniciar Sesión</h1>
          <p>Gestiona tus rendiciones de forma simple, segura y trazable.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-field">
            <span>Correo Corporativo</span>
            <span className="login-input-shell">
              <MailIcon className="login-input-icon" />
              <input
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setFormError(null);
                }}
                autoComplete="email"
                placeholder="usuario@empresa.cl"
                autoFocus
              />
            </span>
          </label>

          <label className="login-field">
            <span>Contraseña</span>
            <span className="login-input-shell has-action">
              <LockIcon className="login-input-icon" />
              <input
                type={isPasswordVisible ? 'text' : 'password'}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setFormError(null);
                }}
                autoComplete="current-password"
                placeholder="Ingresa tu contraseña"
              />
              <button
                type="button"
                className="login-icon-button"
                onClick={() => setIsPasswordVisible((current) => !current)}
                aria-label={isPasswordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {isPasswordVisible ? (
                  <EyeOffIcon className="login-action-icon" />
                ) : (
                  <EyeIcon className="login-action-icon" />
                )}
              </button>
            </span>
          </label>

          {displayedError ? (
            <p className="login-error" role="alert">
              <CircleAlertIcon className="login-error-icon" />
              <span>{displayedError}</span>
            </p>
          ) : null}

          <button type="submit" className="login-submit-button" disabled={isSubmitting}>
            <span>{isSubmitting ? 'Ingresando...' : 'Ingresar'}</span>
            <ArrowRightIcon className="login-submit-icon" />
          </button>

          <button
            type="button"
            className="login-recovery-button"
            onClick={() => {
              setFormError(null);
              setIsPasswordResetOpen(true);
            }}
          >
            Recuperar contraseña
          </button>
        </form>

        <div className="login-trust-footer">
          <ShieldCheckIcon className="login-footer-icon" />
          <span>Sistema interno de rendiciones corporativas</span>
        </div>
      </section>

      {isPasswordResetOpen ? (
        <PasswordResetModal
          initialEmail={email}
          onClose={() => setIsPasswordResetOpen(false)}
        />
      ) : null}
    </main>
  );
}
