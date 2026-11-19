import { useEffect } from 'react';
import { api } from '../lib/api';

export const SHIFT_CHANGED_EVENT = 'shift-changed';

const SEND_EVERY_MS = 15000;

/**
 * Mientras el mensajero está en turno, envía su ubicación al servidor
 * para que administración lo vea en el mapa. Vive en el Layout, así que
 * funciona en cualquier pantalla (no solo con un pedido abierto).
 */
export function useLocationReporting() {
  useEffect(() => {
    // En modo "Ver como" no se reporta la ubicación del administrador
    if (localStorage.getItem('impersonating')) return;

    let watchId: number | null = null;
    let pollId: ReturnType<typeof setInterval> | null = null;
    let wakeLock: WakeLockSentinel | null = null;
    let lastSent = 0;
    let cancelled = false;

    // Mantiene la pantalla encendida mientras está en turno: los navegadores pausan el GPS
    // de una app en segundo plano o con la pantalla apagada
    async function keepAwake() {
      try {
        if ('wakeLock' in navigator && !wakeLock && document.visibilityState === 'visible') {
          wakeLock = await navigator.wakeLock.request('screen');
          wakeLock.addEventListener('release', () => {
            wakeLock = null;
          });
        }
      } catch {
        // Sin soporte o sin permiso: se sigue sin bloqueo de pantalla
      }
    }

    function stop() {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
      if (pollId !== null) {
        clearInterval(pollId);
        pollId = null;
      }
      wakeLock?.release().catch(() => {});
      wakeLock = null;
    }

    function send(pos: GeolocationPosition) {
      const now = Date.now();
      if (now - lastSent < SEND_EVERY_MS) return;
      lastSent = now;

      api
        .post('/mensajero/locations', {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          recorded_at: new Date(pos.timestamp).toISOString(),
        })
        .catch(() => {
          // Reintenta en la siguiente lectura
          lastSent = 0;
        });
    }

    function start() {
      if (watchId !== null || !navigator.geolocation) return;

      watchId = navigator.geolocation.watchPosition(send, () => {}, {
        enableHighAccuracy: true,
        maximumAge: 5000,
      });

      // watchPosition solo avisa cuando la posición cambia; si el mensajero está quieto
      // el mapa dejaría de recibir señales. Este sondeo confirma la posición cada 15 s.
      pollId = setInterval(() => {
        if (document.visibilityState !== 'visible') return;
        navigator.geolocation.getCurrentPosition(send, () => {}, {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 10000,
        });
      }, SEND_EVERY_MS);

      keepAwake();
    }

    function sync() {
      api
        .get<{ on_duty: boolean }>('/mensajero/shifts/current')
        .then((res) => {
          if (cancelled) return;
          if (res.on_duty) start();
          else stop();
        })
        .catch(() => {
          // Sin red: se conserva el estado actual
        });
    }

    sync();
    const interval = setInterval(sync, 60000);
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      // Al volver a la app: reporta de inmediato y recupera el bloqueo de pantalla
      lastSent = 0;
      sync();
      if (watchId !== null) keepAwake();
    };

    window.addEventListener(SHIFT_CHANGED_EVENT, sync);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener(SHIFT_CHANGED_EVENT, sync);
      document.removeEventListener('visibilitychange', onVisible);
      stop();
    };
  }, []);
}
