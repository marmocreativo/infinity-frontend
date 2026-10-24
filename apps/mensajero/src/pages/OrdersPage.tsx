import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';
import type { Order } from '../types';
import StatusBadge from '../components/StatusBadge';
import { useShiftStatus } from '../hooks/useShiftStatus';

interface OrdersResponse {
  data: Order[];
}

const activeStatuses = ['assigned', 'en_route_pickup', 'picked_up', 'en_route_delivery'];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { offDuty } = useShiftStatus();

  useEffect(() => {
    api.get<OrdersResponse>('/mensajero/orders')
      .then((res) => setOrders(res.data))
      .finally(() => setLoading(false));
  }, []);

  const featuredOrders = orders.filter((o) => o.status === 'assigned');
  const otherActiveOrders = orders.filter(
    (o) => activeStatuses.includes(o.status) && o.status !== 'assigned'
  );
  const completedOrders = orders.filter((o) => o.status === 'delivered' || o.status === 'returned');

  // Sin turno iniciado, los pedidos se ven en gris
  const mutedClass = 'grayscale opacity-60';

  return (
    <div className="p-4 max-w-lg mx-auto pb-24">
      <h1 className="font-heading text-xl text-foreground font-semibold mb-4">
        Mis pedidos
      </h1>

      {offDuty && (
        <div className="flex items-start gap-3 bg-status-enroute/10 border border-status-enroute/40 rounded-lg p-4 mb-4">
          <AlertTriangle size={20} className="text-status-enroute shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-body text-sm text-foreground font-medium">Tu turno no ha iniciado</p>
            <p className="font-body text-xs text-muted-foreground mt-0.5">
              Inicia tu turno para poder atender tus pedidos.
            </p>
            <Link
              to="/shift"
              className="inline-block mt-2 bg-primary text-primary-foreground font-body text-xs font-medium px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
            >
              Iniciar turno
            </Link>
          </div>
        </div>
      )}

      {loading ? (
        <p className="font-body text-muted-foreground">Cargando...</p>
      ) : (
        <>
          {/* Destacados — pedidos recién asignados */}
          {featuredOrders.length > 0 && (
            <div className="space-y-3 mb-6">
              {featuredOrders.map((order) => (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className={`block bg-card rounded-lg p-5 transition-opacity ${
                    offDuty
                      ? `border border-border ${mutedClass}`
                      : 'border-2 border-primary glow-border hover:opacity-95'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="font-mono text-sm text-muted-foreground flex items-center gap-2">
                      Pedido #{order.id}
                      {order.is_urgent && (
                        <span className="bg-status-enroute text-black font-body text-[10px] font-bold px-1.5 py-0.5 rounded">
                          URGENTE
                        </span>
                      )}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>

                  <p className="font-body text-base text-foreground font-semibold mb-3">
                    {order.clinic.business_name}
                  </p>

                  <p className="font-body text-sm text-foreground mb-1">
                    <span className="text-muted-foreground">De:</span> {order.pickup.address}
                  </p>
                  <p className="font-body text-sm text-foreground">
                    <span className="text-muted-foreground">A:</span> {order.delivery.address}
                  </p>
                </Link>
              ))}
            </div>
          )}

          {/* Activos — resto de pedidos en curso */}
          {otherActiveOrders.length > 0 && (
            <>
              <h2 className="font-body text-sm font-semibold text-primary mb-2">Activos</h2>
              <div className="space-y-3 mb-6">
                {otherActiveOrders.map((order) => (
                  <Link
                    key={order.id}
                    to={`/orders/${order.id}`}
                    className={`block bg-card border border-border rounded-lg p-4 transition-colors ${
                      offDuty ? mutedClass : 'hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-mono text-sm text-muted-foreground flex items-center gap-2">
                      Pedido #{order.id}
                      {order.is_urgent && (
                        <span className="bg-status-enroute text-black font-body text-[10px] font-bold px-1.5 py-0.5 rounded">
                          URGENTE
                        </span>
                      )}
                    </span>
                      <StatusBadge status={order.status} />
                    </div>

                    <p className="font-body text-sm text-foreground mb-1">
                      <span className="text-muted-foreground">De:</span> {order.pickup.address}
                    </p>
                    <p className="font-body text-sm text-foreground">
                      <span className="text-muted-foreground">A:</span> {order.delivery.address}
                    </p>
                  </Link>
                ))}
              </div>
            </>
          )}

          {featuredOrders.length === 0 && otherActiveOrders.length === 0 && (
            <p className="font-body text-sm text-muted-foreground mb-6">No tienes pedidos activos.</p>
          )}

          {/* Completados */}
          {completedOrders.length > 0 && (
            <>
              <h2 className="font-body text-sm font-semibold text-muted-foreground mb-2">Completados</h2>
              <div className="space-y-2">
                {completedOrders.map((order) => (
                  <Link
                    key={order.id}
                    to={`/orders/${order.id}`}
                    className="block bg-card/50 border border-border/50 rounded-lg p-3 opacity-60 hover:opacity-80 transition-opacity"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-muted-foreground">#{order.id}</span>
                      <StatusBadge status={order.status} />
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}