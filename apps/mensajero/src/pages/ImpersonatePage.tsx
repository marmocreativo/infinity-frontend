import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { impersonation } from '../lib/impersonation';
import type { User } from '../types';

const APP_ROLE = 'mensajero';

/**
 * Recibe el token temporal del panel de administración (en el hash de la URL,
 * para que no viaje a ningún servidor) e inicia la sesión como ese usuario.
 */
export default function ImpersonatePage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const token = params.get('token');

    // Quita el token de la barra de direcciones
    window.history.replaceState(null, '', window.location.pathname);

    if (!token) {
      setError('El enlace no es válido.');
      return;
    }

    localStorage.setItem('auth_token', token);

    api
      .get<{ user: User; role: string }>('/auth/me')
      .then((res) => {
        if (res.role !== APP_ROLE) {
          throw new Error('Esta cuenta no corresponde a esta app.');
        }
        localStorage.setItem('auth_user', JSON.stringify({ ...res.user, must_change_password: false }));
        impersonation.start('admin');
        navigate('/orders', { replace: true });
      })
      .catch((err) => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        setError(err instanceof Error && err.message ? err.message : 'No se pudo iniciar la sesión.');
      });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {error ? (
        <div className="text-center space-y-3">
          <p className="font-body text-sm text-status-cancelled">{error}</p>
          <Link to="/login" className="font-body text-sm text-primary">
            Ir al inicio de sesión
          </Link>
        </div>
      ) : (
        <p className="font-body text-sm text-muted-foreground">Iniciando sesión...</p>
      )}
    </div>
  );
}
