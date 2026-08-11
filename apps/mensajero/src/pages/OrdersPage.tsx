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

  const activeOrders = orders.filter((o) => activeStatuses.includes(o.status));
  const completedOrders = orders.filter((o) => o.status === 'delivered');

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="font-heading text-xl text-base-light font-semibold mb-4">
        Mis pedidos
      </h1>

      {loading ? (
        <p className="font-body text-base-light/70">Cargando...</p>
      ) : (
        <>
          <h2 className="font-body text-sm font-semibold text-primary mb-2">Activos</h2>
          {activeOrders.length === 0 ? (
            <p className="font-body text-sm text-base-light/50 mb-6">No tienes pedidos activos.</p>
          ) : (
            <div className="space-y-3 mb-6">
              {activeOrders.map((order) => (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="block bg-base-dark border border-base-light/10 rounded-lg p-4 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-mono text-sm text-base-light/70">Pedido #{order.id}</span>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="font-body text-sm text-base-light">{order.clinic.business_name}</p>
                </Link>
              ))}
            </div>
          )}

          {completedOrders.length > 0 && (
            <>
              <h2 className="font-body text-sm font-semibold text-base-light/50 mb-2">Completados</h2>
              <div className="space-y-2">
                {completedOrders.map((order) => (
                  <Link
                    key={order.id}
                    to={`/orders/${order.id}`}
                    className="block bg-base-dark/50 border border-base-light/5 rounded-lg p-3 opacity-60"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-base-light/70">#{order.id}</span>
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
