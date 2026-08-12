import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { auth } from '../lib/auth';
import { geocodeAddress } from '../lib/geocode';
import MapPicker from '../components/MapPicker';

const TOTAL_STEPS = 2;

export default function NewOrderPage() {
  const navigate = useNavigate();
  const user = auth.getUser();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pickupAddress, setPickupAddress] = useState(user?.default_address ?? '');
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(
    user?.default_lat && user?.default_lng
      ? { lat: Number(user.default_lat), lng: Number(user.default_lng) }
      : null
  );
  const [pickupContactName, setPickupContactName] = useState('');
  const [pickupContactPhone, setPickupContactPhone] = useState('');

  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryCoords, setDeliveryCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [deliveryContactName, setDeliveryContactName] = useState('');
  const [deliveryContactPhone, setDeliveryContactPhone] = useState('');
  const [geocoding, setGeocoding] = useState(false);

  const [notes, setNotes] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Geocodifica la dirección de entrega mientras el usuario escribe (con debounce)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (deliveryAddress.trim().length < 6) return;

    debounceRef.current = setTimeout(async () => {
      setGeocoding(true);
      const result = await geocodeAddress(deliveryAddress);
      setGeocoding(false);
      if (result) {
        setDeliveryCoords({ lat: result.lat, lng: result.lng });
      }
    }, 900);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [deliveryAddress]);

  const inputClass =
    'w-full bg-card text-foreground font-body px-3 py-2 rounded-lg border border-border focus:border-primary focus:outline-none text-sm';
  const labelClass = 'block font-body text-sm text-foreground mb-1';

  function validateStep(): boolean {
    setError(null);
    if (step === 1) {
      if (!pickupAddress || !pickupCoords) {
        setError('Confirma la dirección y ubicación de recolección.');
        return false;
      }
    }
    if (step === 2) {
      if (!deliveryAddress || !deliveryCoords) {
        setError('Escribe la dirección de entrega y confirma la ubicación en el mapa.');
        return false;
      }
    }
    return true;
  }

  function handleNext() {
    if (!validateStep()) return;
    setStep(2);
  }

  function handleBack() {
    setError(null);
    setStep(1);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validateStep() || !pickupCoords || !deliveryCoords) return;

    setLoading(true);
    setError(null);

    try {
      const res = await api.post<{ data: { id: number } }>('/cliente/orders', {
        pickup_address: pickupAddress,
        pickup_lat: pickupCoords.lat,
        pickup_lng: pickupCoords.lng,
        pickup_contact_name: pickupContactName || null,
        pickup_contact_phone: pickupContactPhone || null,
        delivery_address: deliveryAddress,
        delivery_lat: deliveryCoords.lat,
        delivery_lng: deliveryCoords.lng,
        delivery_contact_name: deliveryContactName || null,
        delivery_contact_phone: deliveryContactPhone || null,
        notes: notes || null,
      });

      navigate(`/orders/${res.data.id}`);
    } catch {
      setError('No se pudo crear el pedido. Verifica los datos.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24">
      <h1 className="font-heading text-xl text-foreground font-semibold mb-4">
        Nuevo pedido
      </h1>

      {/* Indicador de progreso */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              s <= step ? 'bg-primary' : 'bg-border'
            }`}
          />
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {step === 1 && (
          <section className="bg-card border border-border rounded-lg p-4 space-y-3">
            <h2 className="font-body text-sm font-semibold text-primary">
              Punto de recolección
            </h2>
            <p className="font-body text-xs text-muted-foreground -mt-2">
              Prellenado con la dirección de tu clínica. Ajusta el mapa si es necesario.
            </p>

            <MapPicker
              onSelect={(lat, lng) => setPickupCoords({ lat, lng })}
              initialLat={pickupCoords?.lat}
              initialLng={pickupCoords?.lng}
            />
            {pickupCoords && (
              <p className="font-mono text-xs text-muted-foreground">
                {pickupCoords.lat.toFixed(6)}, {pickupCoords.lng.toFixed(6)}
              </p>
            )}

            <div>
              <label className={labelClass}>Dirección</label>
              <input
                className={inputClass}
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                required
                placeholder="Calle, número, colonia"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Contacto (opcional)</label>
                <input
                  className={inputClass}
                  value={pickupContactName}
                  onChange={(e) => setPickupContactName(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Teléfono (opcional)</label>
                <input
                  className={inputClass}
                  value={pickupContactPhone}
                  onChange={(e) => setPickupContactPhone(e.target.value)}
                />
              </div>
            </div>
          </section>
        )}

        {step === 2 && (
          <>
            <section className="bg-card border border-border rounded-lg p-4 space-y-3">
              <h2 className="font-body text-sm font-semibold text-primary">
                Punto de entrega
              </h2>

              <div>
                <label className={labelClass}>Dirección</label>
                <div className="relative">
                  <input
                    className={inputClass}
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    required
                    placeholder="Escribe la dirección — el mapa se ajustará automáticamente"
                  />
                  {geocoding && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-body text-xs text-muted-foreground">
                      Buscando...
                    </span>
                  )}
                </div>
                <p className="font-body text-xs text-muted-foreground mt-1">
                  Puedes ajustar el punto exacto haciendo click en el mapa.
                </p>
              </div>

              <MapPicker
                onSelect={(lat, lng) => setDeliveryCoords({ lat, lng })}
                initialLat={deliveryCoords?.lat}
                initialLng={deliveryCoords?.lng}
              />
              {deliveryCoords && (
                <p className="font-mono text-xs text-muted-foreground">
                  {deliveryCoords.lat.toFixed(6)}, {deliveryCoords.lng.toFixed(6)}
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Contacto (opcional)</label>
                  <input
                    className={inputClass}
                    value={deliveryContactName}
                    onChange={(e) => setDeliveryContactName(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Teléfono (opcional)</label>
                  <input
                    className={inputClass}
                    value={deliveryContactPhone}
                    onChange={(e) => setDeliveryContactPhone(e.target.value)}
                  />
                </div>
              </div>
            </section>

            <div>
              <label className={labelClass}>Notas (opcional)</label>
              <textarea
                className={inputClass}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </>
        )}

        {error && <p className="font-body text-sm text-status-cancelled">{error}</p>}

        <div className="flex gap-3">
          {step === 2 && (
            <button
              type="button"
              onClick={handleBack}
              className="flex-1 bg-card border border-border hover:opacity-90 text-foreground font-body font-medium px-4 py-2 rounded-lg transition-opacity"
            >
              Atrás
            </button>
          )}

          {step === 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex-1 bg-primary hover:opacity-90 text-primary-foreground font-body font-medium px-4 py-2 rounded-lg transition-opacity glow-fill"
            >
              Siguiente
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary hover:opacity-90 disabled:opacity-50 text-primary-foreground font-body font-medium px-4 py-2 rounded-lg transition-opacity glow-fill"
            >
              {loading ? 'Creando pedido...' : 'Crear pedido'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}