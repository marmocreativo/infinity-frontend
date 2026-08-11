import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { Order } from '../types';
import StatusBadge from '../components/StatusBadge';

interface OrderResponse {
  data: Order;
}

const eventLabels: Record<string, string> = {
  created: 'Pedido creado',
  assigned: 'Mensajero asignado',
  en_route_pickup: 'Mensajero en camino a recolectar',
  picked_up: 'Muestra recolectada',
  en_route_delivery: 'Mensajero en camino a entregar',
  delivered: 'Pedido entregado',
  cancelled: 'Pedido cancelado',
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    api.get<OrderResponse>(`/cliente/orders/${id}`)
      .then((res) => setOrder(res.data))
      .catch(() => setError('No se pudo cargar el pedido.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handlePay() {
    setPaying(true);
    try {
      await api.post(`/cliente/orders/${id}/pay`);
      const res = await api.get<OrderResponse>(`/cliente/orders/${id}`);
      setOrder(res.data);
    } catch {
      setError('No se pudo procesar el pago.');
    } finally {
      setPaying(false);
    }
  }

  if (loading) return <p className="p-4 font-body text-base-light/70">Cargando...</p>;
  if (error) return <p className="p-4 font-body text-status-cancelled">{error}</p>;
  if (!order) return null;

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <Link to="/orders" className="font-body text-sm text-primary hover:text-primary-light mb-4 inline-block">
        ← Volver a mis pedidos
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-xl text-base-light font-semibold">
          Pedido #{order.id}
        </h1>
        <StatusBadge status={order.status} />
      </div>

      <div className="bg-base-dark border border-base-light/10 rounded-lg p-4 mb-4 space-y-3">
        <div>
          <p className="font-body text-xs text-base-light/50 mb-1">Recolección</p>
          <p className="font-body text-sm text-base-light">{order.pickup.address}</p>
        </div>
        <div>
          <p className="font-body text-xs text-base-light/50 mb-1">Entrega</p>
          <p className="font-body text-sm text-base-light">{order.delivery.address}</p>
        </div>
        {order.courier && (
          <div>
            <p className="font-body text-xs text-base-light/50 mb-1">Mensajero</p>
            <p className="font-body text-sm text-base-light">{order.courier.name}</p>
          </div>
        )}
        {order.notes && (
          <div>
            <p className="font-body text-xs text-base-light/50 mb-1">Notas</p>
            <p className="font-body text-sm text-base-light">{order.notes}</p>
          </div>
        )}
      </div>

      <div className="bg-base-dark border border-base-light/10 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-body text-xs text-base-light/50 mb-1">Pago</p>
            <p className="font-mono text-lg text-base-light">${order.price}</p>
          </div>
          {order.payment_status === 'paid' ? (
            <span className="text-status-delivered font-body text-sm font-medium">Pagado ✓</span>
          ) : (
            <button
              onClick={handlePay}
              disabled={paying}
              className="bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-body text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {paying ? 'Procesando...' : 'Pagar ahora'}
            </button>
          )}
        </div>
      </div>

      {order.evidences && order.evidences.length > 0 && (
        <div className="bg-base-dark border border-base-light/10 rounded-lg p-4 mb-4">
          <p className="font-body text-xs text-base-light/50 mb-3">Evidencia fotográfica</p>
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

      {order.events && order.events.length > 0 && (
        <div className="bg-base-dark border border-base-light/10 rounded-lg p-4">
          <p className="font-body text-xs text-base-light/50 mb-3">Historial</p>
          <div className="space-y-2">
            {order.events.map((event, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="font-body text-sm text-base-light">
                  {eventLabels[event.event_type] ?? event.event_type}
                </span>
                <span className="font-mono text-xs text-base-light/50">
                  {new Date(event.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
