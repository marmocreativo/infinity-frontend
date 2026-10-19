import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { auth } from '../lib/auth';
import { geocodeAddress, reverseGeocode } from '../lib/geocode';
import MapPicker from '../components/MapPicker';
import type { Order } from '../types';
import RoutePreviewMap from '../components/RoutePreviewMap';
import { LocateFixed } from 'lucide-react';

const TOTAL_STEPS = 3;

const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

interface RouteQuote {
  distance_km: number;
  duration_min: number;
  price: number;
  route: [number, number][];
  estimated: boolean;
}

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
  const [locating, setLocating] = useState(false);
  const [resolvingPickup, setResolvingPickup] = useState(false);

  // Prellena el contacto de recolección con el último pedido que tenga datos
  useEffect(() => {
    api.get<{ data: Order[] }>('/cliente/orders')
      .then((res) => {
        const sorted = [...res.data].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const last = sorted.find((o) => o.pickup.contact_name || o.pickup.contact_phone);
        if (!last) return;
        // Solo rellena si el usuario aún no escribió nada
        setPickupContactName((prev) => prev || last.pickup.contact_name || '');
        setPickupContactPhone((prev) => prev || last.pickup.contact_phone || '');
      })
      .catch(() => {
        // Si falla, el formulario queda vacío y el usuario lo llena a mano
      });
  }, []);

  // Actualiza coordenadas y autollena la dirección con geocodificación inversa
  async function updatePickupFromCoords(lat: number, lng: number) {
    setPickupCoords({ lat, lng });
    setResolvingPickup(true);
    const address = await reverseGeocode(lat, lng);
    setResolvingPickup(false);
    if (address) setPickupAddress(address);
  }

  function handleUseMyLocation() {
    setError(null);
    if (!navigator.geolocation) {
      setError('Tu dispositivo no soporta geolocalización.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await updatePickupFromCoords(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
      },
      () => {
        setLocating(false);
        setError('No se pudo obtener tu ubicación. Revisa los permisos del navegador.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryCoords, setDeliveryCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [deliveryContactName, setDeliveryContactName] = useState('');
  const [deliveryContactPhone, setDeliveryContactPhone] = useState('');
  const [geocoding, setGeocoding] = useState(false);

  const [notes, setNotes] = useState('');

  const [quote, setQuote] = useState<RouteQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Al llegar al paso de confirmación, pide ruta, km y precio al backend
  useEffect(() => {
    if (step !== 3 || !pickupCoords || !deliveryCoords) return;

    let cancelled = false;
    setQuote(null);
    setQuoteError(null);
    setQuoting(true);

    api.post<{ data: RouteQuote }>('/cliente/orders/quote', {
      pickup_lat: pickupCoords.lat,
      pickup_lng: pickupCoords.lng,
      delivery_lat: deliveryCoords.lat,
      delivery_lng: deliveryCoords.lng,
    })
      .then((res) => {
        if (!cancelled) setQuote(res.data);
      })
      .catch(() => {
        if (!cancelled) setQuoteError('No se pudo calcular la ruta y el precio. Intenta de nuevo.');
      })
      .finally(() => {
        if (!cancelled) setQuoting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [step, pickupCoords, deliveryCoords]);

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
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function handleBack() {
    setError(null);
    setStep((s) => Math.max(s - 1, 1));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // Evita crear el pedido con Enter antes de llegar a la confirmación
    if (step < TOTAL_STEPS) {
      handleNext();
      return;
    }
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
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
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

            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={locating}
              className="w-full flex items-center justify-center gap-2 bg-card border border-primary text-primary hover:opacity-90 disabled:opacity-50 font-body text-sm font-medium px-4 py-2 rounded-lg transition-opacity"
            >
              <LocateFixed size={16} />
              {locating ? 'Obteniendo ubicación...' : 'Pedir en mi ubicación'}
            </button>

            <MapPicker
              onSelect={(lat, lng) => updatePickupFromCoords(lat, lng)}
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
              <div className="relative">
                <input
                  className={inputClass}
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  required
                  placeholder="Calle, número, colonia"
                />
                {resolvingPickup && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-body text-xs text-muted-foreground">
                    Buscando...
                  </span>
                )}
              </div>
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

        {step === 3 && pickupCoords && deliveryCoords && (
          <>
            <section className="bg-card border border-border rounded-lg p-4 space-y-3">
              <h2 className="font-body text-sm font-semibold text-primary">
                Confirma tu pedido
              </h2>

              {quoting && (
                <div
                  className="flex items-center justify-center font-body text-sm text-muted-foreground border border-border rounded-lg"
                  style={{ height: '250px' }}
                >
                  Calculando ruta...
                </div>
              )}

              {quote && (
                <RoutePreviewMap
                  pickup={pickupCoords}
                  delivery={deliveryCoords}
                  route={quote.route}
                />
              )}

              {quoteError && (
                <p className="font-body text-sm text-status-cancelled">{quoteError}</p>
              )}

              {quote && (
                <>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="font-body text-xs text-muted-foreground">Distancia</p>
                      <p className="font-mono text-base text-foreground">
                        {quote.distance_km.toFixed(1)} km
                      </p>
                    </div>
                    <div>
                      <p className="font-body text-xs text-muted-foreground">Tiempo aprox.</p>
                      <p className="font-mono text-base text-foreground">
                        {Math.max(1, Math.round(quote.duration_min))} min
                      </p>
                    </div>
                    <div>
                      <p className="font-body text-xs text-muted-foreground">Precio</p>
                      <p className="font-mono text-lg text-primary font-semibold">
                        {money.format(quote.price)}
                      </p>
                    </div>
                  </div>

                  {quote.estimated && (
                    <p className="font-body text-xs text-muted-foreground">
                      No se pudo trazar la ruta exacta; la distancia y el precio son una estimación.
                    </p>
                  )}
                </>
              )}
            </section>

            <section className="bg-card border border-border rounded-lg p-4 space-y-3">
              <div>
                <p className="font-body text-xs text-muted-foreground mb-1">Recolección</p>
                <p className="font-body text-sm text-foreground">{pickupAddress}</p>
                {(pickupContactName || pickupContactPhone) && (
                  <p className="font-body text-xs text-muted-foreground">
                    Contacto: {pickupContactName} {pickupContactPhone}
                  </p>
                )}
              </div>
              <div>
                <p className="font-body text-xs text-muted-foreground mb-1">Entrega</p>
                <p className="font-body text-sm text-foreground">{deliveryAddress}</p>
                {(deliveryContactName || deliveryContactPhone) && (
                  <p className="font-body text-xs text-muted-foreground">
                    Contacto: {deliveryContactName} {deliveryContactPhone}
                  </p>
                )}
              </div>
              {notes && (
                <div>
                  <p className="font-body text-xs text-muted-foreground mb-1">Notas</p>
                  <p className="font-body text-sm text-foreground">{notes}</p>
                </div>
              )}
            </section>
          </>
        )}

        {error && <p className="font-body text-sm text-status-cancelled">{error}</p>}

        <div className="flex gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              className="flex-1 bg-card border border-border hover:opacity-90 text-foreground font-body font-medium px-4 py-2 rounded-lg transition-opacity"
            >
              Atrás
            </button>
          )}

          {step < TOTAL_STEPS ? (
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
              disabled={loading || quoting || !quote}
              className="flex-1 bg-primary hover:opacity-90 disabled:opacity-50 text-primary-foreground font-body font-medium px-4 py-2 rounded-lg transition-opacity glow-fill"
            >
              {loading ? 'Creando pedido...' : 'Confirmar y crear pedido'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}