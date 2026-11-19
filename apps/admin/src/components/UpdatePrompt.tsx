import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { APP_VERSION, compareVersions } from '../lib/version';

const DECLINED_KEY = 'update_declined_for';
const APPLIED_KEY = 'update_applied_for';

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Borra cachés y service workers de la app (sin tocar el de las notificaciones push) y recarga */
async function hardReload(serverVersion: string) {
  // Marca la versión a la que se intentó actualizar para no entrar en bucle
  // si el servidor anuncia una versión que este build aún no trae
  storage()?.setItem(APPLIED_KEY, serverVersion);

  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        regs
          .filter((r) => !(r.active?.scriptURL ?? r.waiting?.scriptURL ?? '').includes('firebase-messaging-sw'))
          .map((r) => r.unregister())
      );
    }

    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }

    // Refresca el index.html en la caché HTTP del navegador
    await fetch(window.location.href, { cache: 'reload' });
  } catch {
    // Si algo falla, igual se recarga
  }

  window.location.reload();
}

/**
 * Al abrir la app (y al volver a ella) consulta la versión vigente en el servidor.
 * Si la de esta app es menor, pide confirmar la actualización y recarga sin caché.
 */
export default function UpdatePrompt() {
  const [serverVersion, setServerVersion] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await api.get<{ version: string }>('/app-version', { auth: false, cache: 'no-store' });
        if (cancelled || !res.version) return;

        if (compareVersions(APP_VERSION, res.version) >= 0) return;

        const s = storage();
        // No insistir con una versión que ya se rechazó o que ya se intentó aplicar
        if (s?.getItem(DECLINED_KEY) === res.version) return;
        if (s?.getItem(APPLIED_KEY) === res.version) return;

        setServerVersion(res.version);
      } catch {
        // Sin conexión o servidor caído: se revisa en la próxima apertura
      }
    }

    check();

    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  if (!serverVersion) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center">
          <RefreshCw size={22} className="text-primary" />
        </div>
        <div className="space-y-1">
          <h2 className="font-heading text-lg text-foreground">Hay una nueva versión</h2>
          <p className="font-body text-sm text-muted-foreground">
            Tienes la versión {APP_VERSION} y ya está disponible la {serverVersion}. Actualiza para ver los últimos
            cambios; la app se recargará.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            disabled={updating}
            onClick={() => {
              storage()?.setItem(DECLINED_KEY, serverVersion);
              setServerVersion(null);
            }}
            className="flex-1 bg-background border border-border text-foreground font-body text-sm px-4 py-2 rounded-lg disabled:opacity-50"
          >
            Más tarde
          </button>
          <button
            type="button"
            disabled={updating}
            onClick={() => {
              setUpdating(true);
              hardReload(serverVersion);
            }}
            className="flex-1 bg-primary text-primary-foreground font-body text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50 glow-fill"
          >
            {updating ? 'Actualizando...' : 'Actualizar ahora'}
          </button>
        </div>
      </div>
    </div>
  );
}
