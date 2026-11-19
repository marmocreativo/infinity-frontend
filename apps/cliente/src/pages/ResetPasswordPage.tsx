import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';
  const email = params.get('email') ?? '';

  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirmation) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await api.post(
        '/auth/reset-password',
        { token, email, password, password_confirmation: confirmation },
        { auth: false }
      );
      setDone(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  }

  const invalidLink = !token || !email;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col items-center">
        <img src="/logo.png" alt="Infinity App" className="w-48 mb-6" />

        <p className="font-body text-muted-foreground text-sm mb-8 text-center">Elige una nueva contraseña</p>

        {invalidLink ? (
          <div className="w-full space-y-4 text-center">
            <p className="font-body text-sm text-status-cancelled">El enlace no es válido.</p>
            <Link to="/forgot-password" className="font-body text-sm text-primary hover:opacity-80">
              Solicitar un enlace nuevo
            </Link>
          </div>
        ) : done ? (
          <div className="w-full space-y-4 text-center">
            <p className="font-body text-sm text-foreground">
              Contraseña actualizada. Te llevamos al inicio de sesión...
            </p>
            <Link to="/login" className="font-body text-sm text-primary hover:opacity-80">
              Ir ahora
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <p className="font-body text-xs text-muted-foreground text-center break-all">{email}</p>

            <div>
              <label className="block font-body text-sm text-foreground mb-1">Nueva contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-card text-foreground font-body px-3 py-2 rounded-lg border border-border focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-body text-sm text-foreground mb-1">Confirmar contraseña</label>
              <input
                type="password"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                required
                minLength={8}
                className="w-full bg-card text-foreground font-body px-3 py-2 rounded-lg border border-border focus:border-primary focus:outline-none"
              />
            </div>

            {error && (
              <p className="text-status-cancelled font-body text-sm">
                {error}{' '}
                {error.includes('expiró') && (
                  <Link to="/forgot-password" className="underline">
                    Solicitar otro enlace
                  </Link>
                )}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:opacity-90 disabled:opacity-50 text-primary-foreground font-body font-medium px-4 py-2 rounded-lg transition-opacity glow-fill"
            >
              {loading ? 'Guardando...' : 'Guardar contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
