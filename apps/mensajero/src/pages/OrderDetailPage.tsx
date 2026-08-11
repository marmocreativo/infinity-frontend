import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { Order, OrderStatus } from '../types';
import StatusBadge from '../components/StatusBadge';
import PhotoCapture from '../components/PhotoCapture';

interface OrderResponse {
  data: Order;
}

const actionConfig: Partial<Record<OrderStatus, { label: string; endpoint: string; needsPhoto: boolean }>> = {
  assigned: { label: 'Iniciar recolección', endpoint: 'start-pickup', needsPhoto: false },
  en_route_pickup: { label: 'Confirmar recolección', endpoint: 'confirm-pickup', needsPhoto: true },
  picked_up: { label: 'Iniciar entrega', endpoint: 'start-delivery', needsPhoto: false },
  en_route_delivery: { label: 'Confirmar entrega', endpoint: 'confirm-delivery', needsPhoto: true },
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);

  function loadOrder() {
    api.get<OrderResponse>(`/mensajero/orders/${id}`)
      .then((res) => setOrder(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadOrder();
  }, [id]);

  const action = order ? actionConfig[order.status] : undefined;

  async function handleAction() {
    if (!order || !action) return;

    if (action.needsPhoto && !photo) {
      setError('Debes tomar una foto de evidencia.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (action.needsPhoto && photo) {
        const formData = new FormData();
        formData.append('photo', photo);
        await api.post(`/mensajero/orders/${order.id}/${action.endpoint}`, formData);
      } else {
        await api.post(`/mensajero/orders/${order.id}/${action.endpoint}`);
      }
      setPhoto(null);
      loadOrder();
    } catch {
      setError('No se pudo completar la acción.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="p-4 font-body text-base-light/70">Cargando...</p>;
  if (!order) return null;

  return (
    <div className="p-4 max-w-lg mx-auto pb-8">
      <button
        onClick={() => navigate('/orders')}
        className="font-body text-sm text-primary hover:text-primary-light mb-4"
      >
        ← Volver a mis pedidos
      </button>

      <div className="flex items-center justify-between mb-4">
        <h1 className="font-heading text-xl text-base-light font-semibold">
          Pedido #{order.id}
        </h1>
        <StatusBadge status={order.status} />
      </div>

      <div className="bg-base-dark border border-base-light/10 rounded-lg p-4 mb-4 space-y-3">
        <div>
          <p className="font-body text-xs text-base-light/50 mb-1">Clínica</p>
          <p className="font-body text-sm text-base-light">{order.clinic.business_name}</p>
        </div>
        <div>
          <p className="font-body text-xs text-base-light/50 mb-1">Recolección</p>
          <p className="font-body text-sm text-base-light">{order.pickup.address}</p>
          {order.pickup.contact_name && (
            <p className="font-body text-xs text-base-light/50">
              Contacto: {order.pickup.contact_name} {order.pickup.contact_phone}
            </p>
          )}
        </div>
        <div>
          <p className="font-body text-xs text-base-light/50 mb-1">Entrega</p>
          <p className="font-body text-sm text-base-light">{order.delivery.address}</p>
          {order.delivery.contact_name && (
            <p className="font-body text-xs text-base-light/50">
              Contacto: {order.delivery.contact_name} {order.delivery.contact_phone}
            </p>
          )}
        </div>
        {order.notes && (
          <div>
            <p className="font-body text-xs text-base-light/50 mb-1">Notas</p>
            <p className="font-body text-sm text-base-light">{order.notes}</p>
          </div>
        )}
      </div>

      {action && (
        <div className="bg-base-dark border border-base-light/10 rounded-lg p-4 space-y-3">
          {action.needsPhoto && (
            <PhotoCapture onCapture={setPhoto} />
          )}

          {error && <p className="font-body text-sm text-status-cancelled">{error}</p>}

          <button
            onClick={handleAction}
            disabled={submitting}
            className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-body font-medium px-4 py-3 rounded-lg transition-colors"
          >
            {submitting ? 'Procesando...' : action.label}
          </button>
        </div>
      )}

      {order.status === 'delivered' && order.evidences && (
        <div className="bg-base-dark border border-base-light/10 rounded-lg p-4 mt-4">
          <p className="font-body text-xs text-base-light/50 mb-3">Evidencia entregada</p>
          <div className="grid grid-cols-2 gap-3">
            {order.evidences.map((ev, i) => (
              <div key={i}>
                <img src={ev.photo_url} alt={ev.type} className="rounded-lg w-full h-32 object-cover" />
                <p className="font-body text-xs text-base-light/50 mt-1">
                  {ev.type === 'pickup' ? 'Recolección' : 'Entrega'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
