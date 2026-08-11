import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { Order } from '../types';
import OrderCard from '../components/OrderCard';

interface OrdersResponse {
  data: Order[];
}

export default function OrdersListPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<OrdersResponse>('/cliente/orders')
      .then((res) => setOrders(res.data))
      .catch(() => setError('No se pudieron cargar los pedidos.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-xl text-base-light font-semibold">
          Mis pedidos
        </h1>
        <Link
          to="/orders/new"
          className="bg-primary hover:bg-primary-dark text-white font-body text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Nuevo pedido
        </Link>
      </div>

      {loading && <p className="font-body text-base-light/70">Cargando...</p>}
      {error && <p className="font-body text-status-cancelled">{error}</p>}

      {!loading && !error && orders.length === 0 && (
        <p className="font-body text-base-light/70">Aún no tienes pedidos.</p>
      )}

      <div className="space-y-3">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    </div>
  );
}
