import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import type { Order, OrderStatus } from '../types';
import StatusBadge from '../components/StatusBadge';

interface OrdersResponse {
  data: Order[];
}

interface Courier {
  id: number;
  name: string;
}

const statusOptions: { value: OrderStatus | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'assigned', label: 'Asignado' },
  { value: 'en_route_pickup', label: 'En camino a recolectar' },
  { value: 'picked_up', label: 'Recolectado' },
  { value: 'en_route_delivery', label: 'En camino a entregar' },
  { value: 'delivered', label: 'Entregado' },
  { value: 'cancelled', label: 'Cancelado' },
];

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [assigningId, setAssigningId] = useState<number | null>(null);

  const loadOrders = useCallback(() => {
    setLoading(true);
    const query = statusFilter ? `?status=${statusFilter}` : '';
    api.get<OrdersResponse>(`/admin/orders${query}`)
      .then((res) => setOrders(res.data))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    api.get<{ data: { id: number; name: string; courier_profile: unknown }[] }>('/admin/users/couriers')
      .then((res) => setCouriers(res.data.map((c) => ({ id: c.id, name: c.name }))));
  }, []);

  async function handleAssign(orderId: number, courierId: number) {
    if (!courierId) return;
    setAssigningId(orderId);
    try {
      await api.post(`/admin/orders/${orderId}/assign`, { courier_id: courierId });
      loadOrders();
    } finally {
      setAssigningId(null);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-xl text-base-light font-semibold">
          Pedidos
        </h1>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OrderStatus | '')}
          className="bg-base-dark text-base-light font-body text-sm px-3 py-2 rounded-lg border border-base-light/10 focus:border-primary focus:outline-none"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="font-body text-base-light/70">Cargando...</p>
      ) : orders.length === 0 ? (
        <p className="font-body text-base-light/70">No hay pedidos con este filtro.</p>
      ) : (
        <div className="bg-base-dark border border-base-light/10 rounded-lg overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-base-light/10">
                <th className="font-body text-xs text-base-light/50 font-medium px-4 py-3">ID</th>
                <th className="font-body text-xs text-base-light/50 font-medium px-4 py-3">Clínica</th>
                <th className="font-body text-xs text-base-light/50 font-medium px-4 py-3">Estado</th>
                <th className="font-body text-xs text-base-light/50 font-medium px-4 py-3">Mensajero</th>
                <th className="font-body text-xs text-base-light/50 font-medium px-4 py-3">Precio</th>
                <th className="font-body text-xs text-base-light/50 font-medium px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-base-light/5 last:border-0">
                  <td className="font-mono text-sm text-base-light px-4 py-3">#{order.id}</td>
                  <td className="font-body text-sm text-base-light px-4 py-3">{order.clinic.business_name}</td>
                  <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                  <td className="font-body text-sm text-base-light px-4 py-3">
                    {order.courier?.name ?? '—'}
                  </td>
                  <td className="font-mono text-sm text-base-light px-4 py-3">${order.price}</td>
                  <td className="px-4 py-3">
                    {order.status === 'pending' && (
                      <select
                        defaultValue=""
                        disabled={assigningId === order.id}
                        onChange={(e) => handleAssign(order.id, Number(e.target.value))}
                        className="bg-base-navy text-base-light font-body text-xs px-2 py-1 rounded border border-base-light/10 focus:border-primary focus:outline-none"
                      >
                        <option value="" disabled>Asignar a...</option>
                        {couriers.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
