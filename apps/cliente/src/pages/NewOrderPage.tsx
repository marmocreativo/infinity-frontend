import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import MapPicker from '../components/MapPicker';

export default function NewOrderPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [pickupContactName, setPickupContactName] = useState('');
  const [pickupContactPhone, setPickupContactPhone] = useState('');

  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryCoords, setDeliveryCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [deliveryContactName, setDeliveryContactName] = useState('');
  const [deliveryContactPhone, setDeliveryContactPhone] = useState('');

  const [notes, setNotes] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!pickupCoords || !deliveryCoords) {
      setError('Selecciona ambos puntos en el mapa (recolección y entrega).');
      return;
    }

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

  const inputClass =
    'w-full bg-base-dark text-base-light font-body px-3 py-2 rounded-lg border border-base-light/10 focus:border-primary focus:outline-none text-sm';
  const labelClass = 'block font-body text-sm text-base-light mb-1';

  return (
    <div className="p-4 max-w-2xl mx-auto pb-12">
      <h1 className="font-heading text-xl text-base-light font-semibold mb-6">
        Nuevo pedido
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="bg-base-dark border border-base-light/10 rounded-lg p-4 space-y-3">
          <h2 className="font-body text-sm font-semibold text-primary">Punto de recolección</h2>

          <MapPicker onSelect={(lat, lng) => setPickupCoords({ lat, lng })} />
          {pickupCoords && (
            <p className="font-mono text-xs text-base-light/50">
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

        <section className="bg-base-dark border border-base-light/10 rounded-lg p-4 space-y-3">
          <h2 className="font-body text-sm font-semibold text-primary">Punto de entrega</h2>

          <MapPicker onSelect={(lat, lng) => setDeliveryCoords({ lat, lng })} />
          {deliveryCoords && (
            <p className="font-mono text-xs text-base-light/50">
              {deliveryCoords.lat.toFixed(6)}, {deliveryCoords.lng.toFixed(6)}
            </p>
          )}

          <div>
            <label className={labelClass}>Dirección</label>
            <input
              className={inputClass}
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              required
              placeholder="Calle, número, colonia"
            />
          </div>
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

        {error && <p className="font-body text-sm text-status-cancelled">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-body font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {loading ? 'Creando pedido...' : 'Crear pedido'}
        </button>
      </form>
    </div>
  );
}
