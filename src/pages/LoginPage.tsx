import { FormEvent, useState } from 'react';
import { PasswordResetModal } from '../components/PasswordResetModal';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const { authError, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPasswordResetOpen, setIsPasswordResetOpen] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password) {
      setFormError('Ingresa email y password.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      await login(email, password);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo iniciar sesion.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="app-shell auth-shell">
      <section className="form-panel auth-panel" aria-labelledby="login-title">
        <div className="section-heading">
          <p className="eyebrow">SGO Rendiciones PWA</p>
          <h1 id="login-title">Iniciar sesion</h1>
          <p className="header-copy">Ingresa con tu cuenta corporativa para gestionar rendiciones.</p>
        </div>

        <form className="rendicion-form" onSubmit={handleSubmit}>
          <label>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="usuario@empresa.cl"
              autoFocus
            />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="Password"
            />
          </label>

          {formError || authError ? (
            <p className="form-error">{formError ?? authError}</p>
          ) : null}

          <button type="submit" className="button button-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Ingresando...' : 'Ingresar'}
          </button>

          <button
            type="button"
            className="auth-link-button"
            onClick={() => {
              setFormError(null);
              setIsPasswordResetOpen(true);
            }}
          >
            Recuperar contrasena
          </button>
        </form>
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
