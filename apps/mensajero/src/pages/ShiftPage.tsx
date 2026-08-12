import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Shift } from '../types';
import { Power } from 'lucide-react';

interface ShiftCurrentResponse {
  on_duty: boolean;
  shift: Shift | null;
}

function formatElapsed(startedAt: string): string {
  const start = new Date(startedAt).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - start) / 1000));
  const h = Math.floor(diffSec / 3600);
  const m = Math.floor((diffSec % 3600) / 60);
  const s = diffSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function ShiftPage() {
  const [onDuty, setOnDuty] = useState(false);
  const [shift, setShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState('00:00:00');

  function loadStatus() {
    setLoading(true);
    api.get<ShiftCurrentResponse>('/mensajero/shifts/current')
      .then((res) => {
        setOnDuty(res.on_duty);
        setShift(res.shift);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadStatus();
  }, []);

  // Contador de tiempo en vivo mientras está en turno
  useEffect(() => {
    if (!onDuty || !shift) return;

    setElapsed(formatElapsed(shift.started_at));
    const interval = setInterval(() => {
      setElapsed(formatElapsed(shift.started_at));
    }, 1000);

    return () => clearInterval(interval);
  }, [onDuty, shift]);

  async function handleToggle() {
    setToggling(true);
    setError(null);
    try {
      if (onDuty) {
        await api.post('/mensajero/shifts/end');
      } else {
        await api.post('/mensajero/shifts/start');
      }
      loadStatus();
    } catch {
      setError('No se pudo actualizar tu estado de turno.');
    } finally {
      setToggling(false);
    }
  }

  if (loading) {
    return <p className="p-4 font-body text-muted-foreground">Cargando...</p>;
  }

  return (
    <div className="p-4 max-w-sm mx-auto text-center pt-16 pb-24">
      {/* Anillo futurista */}
      <div className="relative w-48 h-48 mx-auto mb-8 flex items-center justify-center">
        {onDuty && (
          <>
            {/* Anillo giratorio con gradiente */}
            <div
              className="absolute inset-0 rounded-full animate-spin-slow"
              style={{
                background: 'conic-gradient(from 0deg, transparent, var(--primary), transparent 40%)',
                padding: '3px',
                WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), black calc(100% - 3px))',
                mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), black calc(100% - 3px))',
              }}
            />
            {/* Pulso exterior */}
            <div className="absolute inset-0 rounded-full border-2 border-primary animate-pulse-ring" />
          </>
        )}

        {/* Círculo central */}
        <div
          className={`relative w-40 h-40 rounded-full flex flex-col items-center justify-center gap-1 border-2 transition-all duration-500 ${
            onDuty
              ? 'border-primary bg-card glow-fill'
              : 'border-border bg-card'
          }`}
        >
          <Power
            size={28}
            className={onDuty ? 'text-primary mb-1' : 'text-muted-foreground mb-1'}
          />
          <span className={`font-heading text-sm font-semibold ${onDuty ? 'text-foreground' : 'text-muted-foreground'}`}>
            {onDuty ? 'En labores' : 'Fuera de turno'}
          </span>
          {onDuty && (
            <span className="font-mono text-lg text-primary tracking-wider mt-1">
              {elapsed}
            </span>
          )}
        </div>
      </div>

      {onDuty && shift && (
        <p className="font-body text-sm text-muted-foreground mb-6">
          Iniciaste turno a las {new Date(shift.started_at).toLocaleTimeString()}
        </p>
      )}

      {error && <p className="font-body text-sm text-status-cancelled mb-4">{error}</p>}

      <button
        onClick={handleToggle}
        disabled={toggling}
        className={`w-full font-body font-medium px-4 py-3 rounded-lg transition-all disabled:opacity-50 ${
          onDuty
            ? 'bg-status-cancelled hover:opacity-90 text-white'
            : 'bg-primary hover:opacity-90 text-primary-foreground glow-fill'
        }`}
      >
        {toggling ? 'Actualizando...' : onDuty ? 'Terminar labores' : 'Iniciar labores'}
      </button>

      {onDuty && (
        <p className="font-body text-xs text-muted-foreground mt-4">
          Mientras estés en labores, tu ubicación se comparte en tiempo real con el equipo de administración.
        </p>
      )}
    </div>
  );
}