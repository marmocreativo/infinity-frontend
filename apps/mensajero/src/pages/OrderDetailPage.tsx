import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { Order, OrderStatus } from '../types';
import StatusBadge from '../components/StatusBadge';
import PhotoCapture from '../components/PhotoCapture';
import OrderMapMensajero from '../components/OrderMapMensajero';
import OrderTimelineMensajero from '../components/OrderTimelineMensajero';
import { ChevronLeft } from 'lucide-react';

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

  if (loading) return <p className="p-4 font-body text-muted-foreground">Cargando...</p>;
  if (!order) return null;

  return (
    <div className="pb-24">
      {/* Mapa prominente + botón volver flotante */}
      <div className="relative">
        <button
          onClick={() => navigate('/orders')}
          className="absolute top-4 left-4 z-20 bg-card/90 backdrop-blur-sm rounded-full p-2 border border-border"
        >
          <ChevronLeft size={18} className="text-foreground" />
        </button>
        <OrderMapMensajero pickup={order.pickup} delivery={order.delivery} />
      </div>

      <div className="px-4">
        {/* Card encimada al mapa con status + timeline */}
        <div className="bg-card border border-border rounded-t-xl rounded-b-lg p-4 -mt-6 relative z-20 shadow-xl mb-4">
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-sm text-muted-foreground">Pedido #{order.id}</span>
            <StatusBadge status={order.status} />
          </div>
          <OrderTimelineMensajero order={order} />
        </div>

        {/* Acción según el estado actual */}
        {action && (
          <div className="bg-card border border-border rounded-lg p-4 mb-4 space-y-3">
            {action.needsPhoto && <PhotoCapture onCapture={setPhoto} />}

            {error && <p className="font-body text-sm text-status-cancelled">{error}</p>}

            <button
              onClick={handleAction}
              disabled={submitting}
              className="w-full bg-primary hover:opacity-90 disabled:opacity-50 text-primary-foreground font-body font-medium px-4 py-3 rounded-lg transition-opacity glow-fill"
            >
              {submitting ? 'Procesando...' : action.label}
            </button>
          </div>
        )}

        {/* Detalles del pedido */}
        <div className="bg-card border border-border rounded-lg p-4 mb-4 space-y-3">
          <div>
            <p className="font-body text-xs text-muted-foreground mb-1">Clínica</p>
            <p className="font-body text-sm text-foreground">{order.clinic.business_name}</p>
          </div>
          <div>
            <p className="font-body text-xs text-muted-foreground mb-1">Recolección</p>
            <p className="font-body text-sm text-foreground">{order.pickup.address}</p>
            {order.pickup.contact_name && (
              <p className="font-body text-xs text-muted-foreground">
                Contacto: {order.pickup.contact_name} {order.pickup.contact_phone}
              </p>
            )}
          </div>
          <div>
            <p className="font-body text-xs text-muted-foreground mb-1">Entrega</p>
            <p className="font-body text-sm text-foreground">{order.delivery.address}</p>
            {order.delivery.contact_name && (
              <p className="font-body text-xs text-muted-foreground">
                Contacto: {order.delivery.contact_name} {order.delivery.contact_phone}
              </p>
            )}
          </div>
          {order.notes && (
            <div>
              <p className="font-body text-xs text-muted-foreground mb-1">Notas</p>
              <p className="font-body text-sm text-foreground">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Evidencia entregada */}
        {order.status === 'delivered' && order.evidences && (
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="font-body text-xs text-muted-foreground mb-3">Evidencia entregada</p>
            <div className="grid grid-cols-2 gap-3">
              {order.evidences.map((ev, i) => (
                <div key={i}>
                  <img src={ev.photo_url} alt={ev.type} className="rounded-lg w-full h-32 object-cover" />
                  <p className="font-body text-xs text-muted-foreground mt-1">
                    {ev.type === 'pickup' ? 'Recolección' : 'Entrega'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}