import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { Order } from '../types';
import StatusBadge from '../components/StatusBadge';

interface OrdersResponse {
  data: Order[];
}

const activeStatuses = ['assigned', 'en_route_pickup', 'picked_up', 'en_route_delivery'];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<OrdersResponse>('/mensajero/orders')
      .then((res) => setOrders(res.data))
      .finally(() => setLoading(false));
  }, []);

  const featuredOrders = orders.filter((o) => o.status === 'assigned');
  const otherActiveOrders = orders.filter(
    (o) => activeStatuses.includes(o.status) && o.status !== 'assigned'
  );
  const completedOrders = orders.filter((o) => o.status === 'delivered');

  return (
    <div className="p-4 max-w-lg mx-auto pb-24">
      <h1 className="font-heading text-xl text-foreground font-semibold mb-4">
        Mis pedidos
      </h1>

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
                  className="block bg-card border-2 border-primary rounded-lg p-5 glow-border transition-opacity hover:opacity-95"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="font-mono text-sm text-muted-foreground">Pedido #{order.id}</span>
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
                    className="block bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-mono text-sm text-muted-foreground">Pedido #{order.id}</span>
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