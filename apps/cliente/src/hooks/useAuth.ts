import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../lib/auth';
import { ApiError } from '../lib/api';
import { setupPushNotifications } from '../lib/firebase';

export function useAuth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await auth.login(email, password);

      if (result.role !== 'cliente') {
        setError('Esta cuenta no tiene acceso a la app de clientes.');
        await auth.logout();
        return;
      }

      setupPushNotifications();

      navigate('/orders');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('No se pudo conectar con el servidor.');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  return { login, loading, error };
}