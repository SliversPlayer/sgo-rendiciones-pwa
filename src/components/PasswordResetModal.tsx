import { FormEvent, useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

interface PasswordResetModalProps {
  initialEmail: string;
  onClose: () => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESET_CONFIRMATION_MESSAGE =
  'Si el correo esta registrado en el sistema, recibira instrucciones para restablecer su contrasena.';

function getEmailValidationError(email: string): string | null {
  const normalizedEmail = email.trim();

  if (!normalizedEmail) {
    return 'Debe ingresar un correo electronico.';
  }

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    return 'Correo electronico invalido.';
  }

  return null;
}

export function PasswordResetModal({ initialEmail, onClose }: PasswordResetModalProps) {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState(initialEmail.trim());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = getEmailValidationError(email);

    if (validationError) {
      setSuccessMessage(null);
      setFormError(validationError);
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      await requestPasswordReset(email);
      setSuccessMessage(RESET_CONFIRMATION_MESSAGE);
    } catch (error) {
      setSuccessMessage(null);
      setFormError(
        error instanceof Error
          ? error.message
          : 'No se pudo enviar el enlace de recuperacion. Intenta nuevamente.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="filter-modal password-reset-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-reset-title"
        aria-describedby={successMessage ? 'password-reset-success' : undefined}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            onClose();
          }
        }}
      >
        <form onSubmit={handleSubmit} noValidate>
          <div className="filter-modal-header">
            <div>
              <p className="eyebrow">Recuperacion</p>
              <h2 id="password-reset-title">Restablecer password</h2>
            </div>
            <button
              type="button"
              className="modal-close-button"
              onClick={onClose}
              aria-label="Cerrar recuperacion de password"
            >
              X
            </button>
          </div>

          <div className="filter-modal-body">
            <div className="filter-form-grid">
              <label>
                <span>Correo electronico</span>
                <input
                  ref={emailInputRef}
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setFormError(null);
                    setSuccessMessage(null);
                  }}
                  autoComplete="email"
                  placeholder="usuario@empresa.cl"
                  disabled={isSubmitting || !!successMessage}
                  required
                />
              </label>

              {formError ? (
                <p className="form-error" role="alert">
                  {formError}
                </p>
              ) : null}
              {successMessage ? (
                <p id="password-reset-success" className="notice notice-success" role="status">
                  {successMessage}
                </p>
              ) : null}
            </div>
          </div>

          <div className="filter-modal-actions">
            {successMessage ? (
              <button type="button" className="button button-primary" onClick={onClose}>
                Volver al inicio de sesion
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button type="submit" className="button button-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Enviando...' : 'Enviar enlace de recuperacion'}
                </button>
              </>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
