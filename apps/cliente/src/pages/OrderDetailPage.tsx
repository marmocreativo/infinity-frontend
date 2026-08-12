import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { Order } from '../types';
import StatusBadge from '../components/StatusBadge';
import OrderTimeline from '../components/OrderTimeline';
import OrderMapFull from '../components/OrderMapFull';
import { ChevronDown, ChevronLeft } from 'lucide-react';

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
  const [historyOpen, setHistoryOpen] = useState(false);

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

  if (loading) return <p className="p-4 font-body text-muted-foreground">Cargando...</p>;
  if (error) return <p className="p-4 font-body text-status-cancelled">{error}</p>;
  if (!order) return null;

  return (
    <div className="pb-24">
      {/* Mapa prominente + botón volver flotante */}
      <div className="relative">
        <Link
          to="/orders"
          className="absolute top-4 left-4 z-20 bg-card/90 backdrop-blur-sm rounded-full p-2 border border-border"
        >
          <ChevronLeft size={18} className="text-foreground" />
        </Link>
        <OrderMapFull pickup={order.pickup} delivery={order.delivery} />
      </div>

      <div className="px-4">
        {/* Card encimada al mapa con status + timeline */}
        <div className="bg-card border border-border rounded-t-xl rounded-b-lg p-4 -mt-6 relative z-20 shadow-xl mb-4">
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-sm text-muted-foreground">Pedido #{order.id}</span>
            <StatusBadge status={order.status} />
          </div>
          <OrderTimeline order={order} />
        </div>

        {/* Datos del mensajero */}
        {order.courier && (
          <div className="bg-card border border-border rounded-lg p-4 mb-4">
            <p className="font-body text-xs text-muted-foreground mb-1">Mensajero asignado</p>
            <p className="font-body text-sm text-foreground font-medium">{order.courier.name}</p>
          </div>
        )}

        {/* Detalles del pedido */}
        <div className="bg-card border border-border rounded-lg p-4 mb-4 space-y-3">
          <div>
            <p className="font-body text-xs text-muted-foreground mb-1">Recolección</p>
            <p className="font-body text-sm text-foreground">{order.pickup.address}</p>
          </div>
          <div>
            <p className="font-body text-xs text-muted-foreground mb-1">Entrega</p>
            <p className="font-body text-sm text-foreground">{order.delivery.address}</p>
          </div>
          {order.notes && (
            <div>
              <p className="font-body text-xs text-muted-foreground mb-1">Notas</p>
              <p className="font-body text-sm text-foreground">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Pago */}
        <div className="bg-card border border-border rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-body text-xs text-muted-foreground mb-1">Pago</p>
              <p className="font-mono text-lg text-foreground">${order.price}</p>
            </div>
            {order.payment_status === 'paid' ? (
              <span className="text-status-delivered font-body text-sm font-medium">Pagado ✓</span>
            ) : (
              <button
                onClick={handlePay}
                disabled={paying}
                className="bg-primary hover:opacity-90 disabled:opacity-50 text-primary-foreground font-body text-sm font-medium px-4 py-2 rounded-lg transition-opacity glow-fill"
              >
                {paying ? 'Procesando...' : 'Pagar ahora'}
              </button>
            )}
          </div>
        </div>

        {/* Evidencia fotográfica */}
        {order.evidences && order.evidences.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-4 mb-4">
            <p className="font-body text-xs text-muted-foreground mb-3">Evidencia fotográfica</p>
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

        {/* Historial colapsable */}
        {order.events && order.events.length > 0 && (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setHistoryOpen((o) => !o)}
              className="w-full flex items-center justify-between p-4"
            >
              <span className="font-body text-xs text-muted-foreground">Historial</span>
              <ChevronDown
                size={16}
                className={`text-muted-foreground transition-transform ${historyOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {historyOpen && (
              <div className="px-4 pb-4 space-y-2">
                {order.events.map((event, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="font-body text-sm text-foreground">
                      {eventLabels[event.event_type] ?? event.event_type}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {new Date(event.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}