import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Shift } from '../types';

interface ShiftCurrentResponse {
  on_duty: boolean;
  shift: Shift | null;
}

export default function ShiftPage() {
  const [onDuty, setOnDuty] = useState(false);
  const [shift, setShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    return <p className="p-4 font-body text-base-light/70">Cargando...</p>;
  }

  return (
    <div className="p-4 max-w-sm mx-auto text-center pt-12">
      <div
        className={`w-32 h-32 rounded-full mx-auto mb-6 flex items-center justify-center border-4 ${
          onDuty ? 'border-status-delivered bg-status-delivered/10' : 'border-base-light/20 bg-base-dark'
        }`}
      >
        <span className="font-heading text-lg text-base-light">
          {onDuty ? 'En labores' : 'Fuera de turno'}
        </span>
      </div>

      {onDuty && shift && (
        <p className="font-body text-sm text-base-light/70 mb-6">
          Iniciaste turno a las {new Date(shift.started_at).toLocaleTimeString()}
        </p>
      )}

      {error && <p className="font-body text-sm text-status-cancelled mb-4">{error}</p>}

      <button
        onClick={handleToggle}
        disabled={toggling}
        className={`w-full font-body font-medium px-4 py-3 rounded-lg transition-colors disabled:opacity-50 ${
          onDuty
            ? 'bg-status-cancelled hover:bg-red-600 text-white'
            : 'bg-primary hover:bg-primary-dark text-white'
        }`}
      >
        {toggling ? 'Actualizando...' : onDuty ? 'Terminar labores' : 'Iniciar labores'}
      </button>

      {onDuty && (
        <p className="font-body text-xs text-base-light/50 mt-4">
          Mientras estés en labores, tu ubicación se comparte en tiempo real con el equipo de administración.
        </p>
      )}
    </div>
  );
}
