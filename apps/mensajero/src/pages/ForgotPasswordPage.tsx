import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/forgot-password', { email }, { auth: false });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col items-center">
        <img src="/logo.png" alt="Infinity App" className="w-48 mb-6" />

        <p className="font-body text-muted-foreground text-sm mb-8 text-center">
          Recupera tu contraseña
        </p>

        {sent ? (
          <div className="w-full space-y-4 text-center">
            <p className="font-body text-sm text-foreground">
              Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña.
              Revisa tu bandeja de entrada (y la carpeta de spam).
            </p>
            <Link to="/login" className="inline-block font-body text-sm text-primary hover:opacity-80">
              Volver a iniciar sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div>
              <label className="block font-body text-sm text-foreground mb-1">Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-card text-foreground font-body px-3 py-2 rounded-lg border border-border focus:border-primary focus:outline-none"
              />
            </div>

            {error && <p className="text-status-cancelled font-body text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:opacity-90 disabled:opacity-50 text-primary-foreground font-body font-medium px-4 py-2 rounded-lg transition-opacity glow-fill"
            >
              {loading ? 'Enviando...' : 'Enviar enlace'}
            </button>

            <p className="text-center">
              <Link to="/login" className="font-body text-sm text-muted-foreground hover:text-foreground">
                Volver a iniciar sesión
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
