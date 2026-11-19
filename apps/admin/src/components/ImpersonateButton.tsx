import { useState } from 'react';
import { Eye } from 'lucide-react';
import { api, ApiError } from '../lib/api';

interface ImpersonationResponse {
  token: string;
  role: string;
  app_url: string;
}

/**
 * "Ver como": abre la app del usuario (clínica o mensajero) en una pestaña nueva
 * con una sesión temporal iniciada como ese usuario.
 */
export default function ImpersonateButton({ userId, disabled }: { userId: number; disabled?: boolean }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    // La pestaña se abre de inmediato (dentro del clic) para que el navegador no la bloquee
    const win = window.open('', '_blank');
    setLoading(true);
    try {
      const res = await api.post<ImpersonationResponse>(`/admin/users/${userId}/impersonate`);
      const url = `${res.app_url}/impersonate#token=${encodeURIComponent(res.token)}`;
      if (win) {
        win.location.href = url;
      } else {
        window.location.href = url;
      }
    } catch (err) {
      win?.close();
      alert(err instanceof ApiError ? err.message : 'No se pudo iniciar la sesión.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      title={disabled ? 'Solo disponible para usuarios activos' : 'Entrar a su app como este usuario'}
      className="flex items-center gap-1 font-body text-xs text-primary hover:opacity-80 disabled:opacity-40"
    >
      <Eye size={12} />
      {loading ? 'Abriendo...' : 'Ver como'}
    </button>
  );
}
