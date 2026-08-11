import { useState, type FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useAuth();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    login(email, password);
  }

  return (
    <div className="min-h-screen bg-base-navy flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="font-heading text-2xl text-primary font-semibold mb-1">
          Infinity App — Admin
        </h1>
        <p className="font-body text-base-light/70 text-sm mb-8">
          Panel de administración
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-body text-sm text-base-light mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-base-dark text-base-light font-body px-3 py-2 rounded-lg border border-base-light/10 focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-body text-sm text-base-light mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
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
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
