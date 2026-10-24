import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Order } from '../types';

export const ACTIVE_STATUSES = [
  'pending',
  'assigned',
  'en_route_pickup',
  'picked_up',
  'en_route_delivery',
];

// Pedidos pendientes y en curso, con refresco automático
export function useActiveOrders(intervalMs = 30000) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    return api
      .get<{ data: Order[] }>(`/admin/orders?status=${ACTIVE_STATUSES.join(',')}&per_page=50`)
      .then((res) => setOrders(res.data))
      .catch(() => {
        // Se conserva la lista anterior si falla la red
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
    const id = setInterval(reload, intervalMs);
    return () => clearInterval(id);
  }, [reload, intervalMs]);

  return { orders, loading, reload };
}