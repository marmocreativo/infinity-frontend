import { useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { auth } from '../lib/auth';
import { impersonation } from '../lib/impersonation';

/** Aviso fijo mientras un administrador usa la app "como" otro usuario */
export default function ImpersonationBanner() {
  const navigate = useNavigate();

  if (!impersonation.isActive()) return null;

  const user = auth.getUser();

  async function handleExit() {
    await auth.logout(); // cierra el token temporal y limpia la marca de "Ver como"
    // Si la pestaña la abrió el panel de administración, se cierra; si no, vuelve al login
    window.close();
    navigate('/login');
  }

  return (
    <div className="sticky top-0 z-[60] bg-status-enroute text-black font-body text-xs flex items-center justify-between gap-3 px-4 py-2">
      <span className="flex items-center gap-2 min-w-0">
        <Eye size={14} className="shrink-0" />
        <span className="truncate">
          Modo «Ver como»: estás viendo la app como <strong>{user?.name ?? 'otro usuario'}</strong>
        </span>
      </span>
      <button onClick={handleExit} className="font-semibold underline shrink-0">
        Salir
      </button>
    </div>
  );
}
