import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { LocateFixed, Zap } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { auth } from '../lib/auth';
import { geocodeAddress, reverseGeocode } from '../lib/geocode';
import { isInMexico } from '../lib/mexico';
import MapPicker from '../components/MapPicker';
import RoutePreviewMap from '../components/RoutePreviewMap';
import type { Order } from '../types';

const TOTAL_STEPS = 3;

const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

interface RouteQuote {
  distance_km: number;
  duration_min: number;
  route_price: number;
  urgent_surcharge: number;
  route: [number, number][];
  estimated: boolean;
}

interface ServiceStatus {
  can_order: boolean;
  reason: 'after_cutoff' | 'no_couriers' | null;
  message: string | null;
  couriers_on_duty: number;
  per_km: number;
  urgent_surcharge: number;
  urgent_max_hours: number;
  cancellation_fee_percent: number;
  return_surcharge_percent: number;
}

export default function NewOrderPage() {
  const navigate = useNavigate();
  const user = auth.getUser();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [serviceStatus, setServiceStatus] = useState<ServiceStatus | null>(null);

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

  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryCoords, setDeliveryCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [deliveryContactName, setDeliveryContactName] = useState('');
  const [deliveryContactPhone, setDeliveryContactPhone] = useState('');
  const [geocoding, setGeocoding] = useState(false);

  const [notes, setNotes] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  const [quote, setQuote] = useState<RouteQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Horario, repartidores en turno y tarifas vigentes
  useEffect(() => {
    api.get<ServiceStatus>('/cliente/service-status')
      .then(setServiceStatus)
      .catch(() => {
        // Si falla, el backend igual valida al crear el pedido
      });
  }, []);

  // Prellena el contacto de recolección con el último pedido que tenga datos
  useEffect(() => {
    api.get<{ data: Order[] }>('/cliente/orders')
      .then((res) => {
        const sorted = [...res.data].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const last = sorted.find((o) => o.pickup.contact_name || o.pickup.contact_phone);
        if (!last) return;
        setPickupContactName((prev) => prev || last.pickup.contact_name || '');
        setPickupContactPhone((prev) => prev || last.pickup.contact_phone || '');
      })
      .catch(() => {
        // Si falla, el usuario lo llena a mano
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

  // Al llegar a la confirmación, calcula ruta y kilómetros
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

  const inputClass =
    'w-full bg-card text-foreground font-body px-3 py-2 rounded-lg border border-border focus:border-primary focus:outline-none text-sm';
  const labelClass = 'block font-body text-sm text-foreground mb-1';

  const blocked = serviceStatus !== null && !serviceStatus.can_order;
  const urgentSurcharge = quote?.urgent_surcharge ?? serviceStatus?.urgent_surcharge ?? 0;
  const total = quote ? quote.route_price + (isUrgent ? quote.urgent_surcharge : 0) : null;

  function validateStep(): boolean {
    setError(null);

    if (blocked && serviceStatus?.message) {
      setError(serviceStatus.message);
      return false;
    }

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
    if (pickupCoords && !isInMexico(pickupCoords.lat, pickupCoords.lng)) {
      setError('La ubicación de recolección debe estar dentro de México.');
      return false;
    }
    if (step >= 2 && deliveryCoords && !isInMexico(deliveryCoords.lat, deliveryCoords.lng)) {
      setError('La ubicación de entrega debe estar dentro de México.');
      return false;
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
        is_urgent: isUrgent,
      });

      navigate(`/orders/${res.data.id}`);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo crear el pedido. Verifica los datos.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24">
      <h1 className="font-heading text-xl text-foreground font-semibold mb-4">
        Nuevo pedido
      </h1>

      {blocked && serviceStatus?.message && (
        <div className="bg-status-cancelled/10 border border-status-cancelled/40 rounded-lg p-4 mb-4">
          <p className="font-body text-sm text-foreground font-medium mb-1">
            No es posible crear pedidos por ahora
          </p>
          <p className="font-body text-sm text-muted-foreground">{serviceStatus.message}</p>
        </div>
      )}

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

        {step === 3 && (
          <>
            <section className="bg-card border border-border rounded-lg p-4 space-y-3">
              <h2 className="font-body text-sm font-semibold text-primary">Confirma tu pedido</h2>

              {quoting && (
                <div
                  className="flex items-center justify-center font-body text-sm text-muted-foreground border border-border rounded-lg"
                  style={{ height: '250px' }}
                >
                  Calculando ruta...
                </div>
              )}

              {quote && pickupCoords && deliveryCoords && (
                <RoutePreviewMap pickup={pickupCoords} delivery={deliveryCoords} route={quote.route} />
              )}

              {quoteError && <p className="font-body text-sm text-status-cancelled">{quoteError}</p>}

              {quote && (
                <>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div>
                      <p className="font-body text-xs text-muted-foreground">Distancia</p>
                      <p className="font-mono text-base text-foreground">{quote.distance_km.toFixed(1)} km</p>
                    </div>
                    <div>
                      <p className="font-body text-xs text-muted-foreground">Tiempo aprox.</p>
                      <p className="font-mono text-base text-foreground">
                        {Math.max(1, Math.round(quote.duration_min))} min
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

            {/* Entrega urgente */}
            <label
              className={`flex items-start gap-3 rounded-lg p-4 cursor-pointer border-2 transition-colors ${
                isUrgent ? 'border-status-enroute bg-status-enroute/10' : 'border-border bg-card'
              }`}
            >
              <input
                type="checkbox"
                checked={isUrgent}
                onChange={(e) => setIsUrgent(e.target.checked)}
                className="mt-1 accent-primary"
              />
              <div className="flex-1">
                <p className="font-body text-sm text-foreground font-semibold flex items-center gap-1.5">
                  <Zap size={14} className="text-status-enroute" />
                  Entrega urgente
                  <span className="font-mono text-xs text-status-enroute">
                    +{money.format(urgentSurcharge)}
                  </span>
                </p>
                <p className="font-body text-xs text-muted-foreground mt-0.5">
                  Se entrega en máximo {serviceStatus?.urgent_max_hours ?? 2} horas, contadas desde que el
                  mensajero recolecta la muestra.
                </p>
              </div>
            </label>

            {/* Precio */}
            {quote && total !== null && (
              <section className="bg-card border border-border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between font-body text-sm">
                  <span className="text-muted-foreground">
                    Servicio ({quote.distance_km.toFixed(2)} km
                    {serviceStatus ? ` × ${money.format(serviceStatus.per_km)}` : ''})
                  </span>
                  <span className="font-mono text-foreground">{money.format(quote.route_price)}</span>
                </div>
                {isUrgent && (
                  <div className="flex items-center justify-between font-body text-sm">
                    <span className="text-muted-foreground">Cargo urgente</span>
                    <span className="font-mono text-foreground">{money.format(quote.urgent_surcharge)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="font-body text-sm text-foreground font-semibold">Total (IVA incluido)</span>
                  <span className="font-mono text-xl text-primary font-semibold">{money.format(total)}</span>
                </div>
              </section>
            )}

            {/* Resumen de direcciones */}
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

            {/* Políticas */}
            {serviceStatus && (
              <div className="font-body text-xs text-muted-foreground space-y-1 px-1">
                <p>
                  • Cancelar antes de que se asigne un mensajero no tiene costo. Ya asignado y antes de la
                  recolección, se cobra el {serviceStatus.cancellation_fee_percent}%.
                </p>
                <p>
                  • Si no se puede entregar (nadie recibe o el laboratorio está cerrado), la muestra regresa a
                  tu clínica con un cargo adicional del {serviceStatus.return_surcharge_percent}%.
                </p>
              </div>
            )}
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
              disabled={blocked}
              className="flex-1 bg-primary hover:opacity-90 disabled:opacity-50 text-primary-foreground font-body font-medium px-4 py-2 rounded-lg transition-opacity glow-fill"
            >
              Siguiente
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading || quoting || !quote || blocked}
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