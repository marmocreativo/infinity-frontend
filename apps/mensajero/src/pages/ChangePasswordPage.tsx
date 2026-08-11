import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { auth } from '../lib/auth';
import type { User } from '../types';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.put<{ user: User }>('/password', { password });
      auth.updateStoredUser(res.user);
      navigate('/orders');
    } catch {
      setError('No se pudo actualizar la contraseña.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-base-navy flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="font-heading text-2xl text-primary font-semibold mb-1">
          Crea tu nueva contraseña
        </h1>
        <p className="font-body text-base-light/70 text-sm mb-8">
          Por seguridad, debes cambiar la contraseña temporal antes de continuar.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-body text-sm text-base-light mb-1">
              Nueva contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full bg-base-dark text-base-light font-body px-3 py-2 rounded-lg border border-base-light/10 focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-body text-sm text-base-light mb-1">
              Confirma la contraseña
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full bg-base-dark text-base-light font-body px-3 py-2 rounded-lg border border-base-light/10 focus:border-primary focus:outline-none"
            />
          </div>

          {error && (
            <p className="text-status-cancelled font-body text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-body font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {loading ? 'Guardando...' : 'Continuar'}
          </button>
        </form>
      </div>
    </div>
  );
}
