import { FormEvent, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export function PasswordChangeGate() {
  const { changeTemporaryPassword, userProfile } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (newPassword.length < 8) {
      setFormError('El nuevo password debe tener al menos 8 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError('La confirmacion no coincide con el nuevo password.');
      return;
    }

    try {
      setIsSaving(true);
      setFormError(null);
      await changeTemporaryPassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'No se pudo cambiar el password.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="app-shell auth-shell">
      <section className="form-panel auth-panel" aria-labelledby="password-change-title">
        <div className="section-heading">
          <p className="eyebrow">Primer ingreso</p>
          <h1 id="password-change-title">Cambiar password</h1>
          <p className="header-copy">
            {userProfile?.nombre ?? 'Usuario'}, debes definir un nuevo password para continuar.
          </p>
        </div>

        <form className="rendicion-form" onSubmit={handleSubmit}>
          <label>
            <span>Nuevo password</span>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              autoFocus
            />
          </label>

          <label>
            <span>Confirmar password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
            />
          </label>

          {formError ? <p className="form-error">{formError}</p> : null}

          <button type="submit" className="button button-primary" disabled={isSaving}>
            {isSaving ? 'Actualizando...' : 'Guardar password'}
          </button>
        </form>
      </section>
    </main>
  );
}
