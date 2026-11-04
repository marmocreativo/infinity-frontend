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
    let watchId: number | null = null;
    let lastSent = 0;
    let cancelled = false;

    function stop() {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
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
    const onVisible = () => document.visibilityState === 'visible' && sync();

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
