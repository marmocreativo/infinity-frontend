import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface ShiftCurrentResponse {
  on_duty: boolean;
}

export function useShiftStatus() {
  // null = aún no se sabe (cargando o error de red)
  const [onDuty, setOnDuty] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    function load() {
      api.get<ShiftCurrentResponse>('/mensajero/shifts/current')
        .then((res) => {
          if (!cancelled) setOnDuty(res.on_duty);
        })
        .catch(() => {
          // Si falla la red no bloqueamos al mensajero
        });
    }

    load();

    // Re-consulta al volver a la app
    function handleVisibility() {
      if (document.visibilityState === 'visible') load();
    }
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return { onDuty, offDuty: onDuty === false };
}