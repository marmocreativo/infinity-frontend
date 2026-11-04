import { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import MapPicker from './MapPicker';
import { geocodeAddress } from '../lib/geocode';

export interface StopForm {
  /** Id local solo para las keys de React */
  uid: number;
  type: 'pickup' | 'delivery';
  address: string;
  lat: number | null;
  lng: number | null;
  contactName: string;
  contactPhone: string;
}

interface StopFieldsProps {
  stop: StopForm;
  index: number;
  onChange: (patch: Partial<StopForm>) => void;
  onRemove: () => void;
}

const inputClass =
  'w-full bg-card text-foreground font-body px-3 py-2 rounded-lg border border-border focus:border-primary focus:outline-none text-sm';
const labelClass = 'block font-body text-sm text-foreground mb-1';

/** Parada adicional de recolección o entrega (dirección + mapa + contacto obligatorio) */
export default function StopFields({ stop, index, onChange, onRemove }: StopFieldsProps) {
  const [geocoding, setGeocoding] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRender = useRef(true);

  // Geocodifica la dirección mientras el usuario escribe
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (stop.address.trim().length < 6) return;

    debounceRef.current = setTimeout(async () => {
      setGeocoding(true);
      const result = await geocodeAddress(stop.address);
      setGeocoding(false);
      if (result) onChange({ lat: result.lat, lng: result.lng });
    }, 900);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stop.address]);

  const title = stop.type === 'pickup' ? 'Recolección adicional' : 'Entrega adicional';

  return (
    <div className="border border-border rounded-lg p-3 space-y-3 bg-background">
      <div className="flex items-center justify-between">
        <h3 className="font-body text-sm font-semibold text-primary">
          {title} {index}
        </h3>
        <button
          type="button"
          onClick={onRemove}
          className="text-muted-foreground hover:text-status-cancelled transition-colors"
          aria-label="Quitar parada"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div>
        <label className={labelClass}>Dirección</label>
        <div className="relative">
          <input
            className={inputClass}
            value={stop.address}
            onChange={(e) => onChange({ address: e.target.value })}
            required
            placeholder="Calle, número, colonia — el mapa se ajustará solo"
          />
          {geocoding && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 font-body text-xs text-muted-foreground">
              Buscando...
            </span>
          )}
        </div>
      </div>

      <MapPicker
        onSelect={(lat, lng) => onChange({ lat, lng })}
        initialLat={stop.lat ?? undefined}
        initialLng={stop.lng ?? undefined}
      />
      {stop.lat !== null && stop.lng !== null && (
        <p className="font-mono text-xs text-muted-foreground">
          {stop.lat.toFixed(6)}, {stop.lng.toFixed(6)}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Contacto *</label>
          <input
            className={inputClass}
            value={stop.contactName}
            onChange={(e) => onChange({ contactName: e.target.value })}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Teléfono *</label>
          <input
            type="tel"
            className={inputClass}
            value={stop.contactPhone}
            onChange={(e) => onChange({ contactPhone: e.target.value })}
            required
          />
        </div>
      </div>
    </div>
  );
}
