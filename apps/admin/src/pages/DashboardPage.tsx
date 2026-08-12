import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { Order, OrderStatus } from '../types';
import StatusBadge from '../components/StatusBadge';
import CourierMapWidget from '../components/CourierMapWidget';
import { Users, Truck, Package } from 'lucide-react';

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
  const [clinicCount, setClinicCount] = useState(0);
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

    api.get<{ data: unknown[] }>('/admin/users/clinics')
      .then((res) => setClinicCount(res.data.length));
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

  // Pendientes o en trayecto — columna derecha del bento
  const pendingOrInTransit = useMemo(
    () =>
      orders.filter((o) =>
        ['pending', 'assigned', 'en_route_pickup', 'picked_up', 'en_route_delivery'].includes(o.status)
      ),
    [orders]
  );

  return (
    <div className="p-4 sm:p-6">
      <h1 className="font-heading text-xl text-foreground font-semibold mb-6">
        Dashboard
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Columna izquierda — mapa + stats (2/3 del ancho en desktop) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Mapa — oculto en móvil según el boceto */}
          <div className="hidden lg:block bg-card border border-border rounded-lg overflow-hidden" style={{ height: '420px' }}>
            <CourierMapWidget />
          </div>

          {/* Fila de 2 cards: lista de pedidos con scroll + stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Card: lista de todos los pedidos con scroll */}
            <div className="bg-card border border-border rounded-lg overflow-hidden flex flex-col" style={{ height: '320px' }}>
              <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
                <h2 className="font-body text-sm font-semibold text-foreground">Todos los pedidos</h2>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as OrderStatus | '')}
                  className="bg-background text-foreground font-body text-xs px-2 py-1 rounded border border-border focus:border-primary focus:outline-none"
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <p className="font-body text-muted-foreground text-sm p-4">Cargando...</p>
                ) : orders.length === 0 ? (
                  <p className="font-body text-muted-foreground text-sm p-4">Sin pedidos.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {orders.map((order) => (
                      <Link
                        key={order.id}
                        to={`/orders/${order.id}`}
                        className="flex items-center justify-between px-4 py-2.5 hover:bg-background/50 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="font-mono text-xs text-foreground">#{order.id}</p>
                          <p className="font-body text-xs text-muted-foreground truncate max-w-[140px]">
                            {order.clinic.business_name}
                          </p>
                        </div>
                        <StatusBadge status={order.status} />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Card: stats de clientes, mensajeros y pedidos */}
            <div className="bg-card border border-border rounded-lg p-4" style={{ height: '320px' }}>
              <h2 className="font-body text-sm font-semibold text-foreground mb-4">Resumen</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-background border border-border rounded-lg p-2.5">
                    <Package size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-heading text-xl text-foreground font-semibold">{orders.length}</p>
                    <p className="font-body text-xs text-muted-foreground">Pedidos totales</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-background border border-border rounded-lg p-2.5">
                    <Truck size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-heading text-xl text-foreground font-semibold">{couriers.length}</p>
                    <p className="font-body text-xs text-muted-foreground">Mensajeros</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-background border border-border rounded-lg p-2.5">
                    <Users size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-heading text-xl text-foreground font-semibold">{clinicCount}</p>
                    <p className="font-body text-xs text-muted-foreground">Clínicas</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Columna derecha — pedidos pendientes/en trayecto */}
        <div className="bg-card border border-border rounded-lg overflow-hidden flex flex-col" style={{ height: '756px' }}>
          <div className="p-4 border-b border-border shrink-0">
            <h2 className="font-body text-sm font-semibold text-foreground">Pendientes y en trayecto</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {pendingOrInTransit.length === 0 ? (
              <p className="font-body text-muted-foreground text-sm p-2">Todo al día — sin pedidos pendientes.</p>
            ) : (
              pendingOrInTransit.map((order) => (
                <div key={order.id} className="bg-background border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm text-foreground">#{order.id}</span>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="font-body text-xs text-foreground truncate">
                    <span className="text-muted-foreground">De:</span> {order.pickup.address}
                  </p>
                  <p className="font-body text-xs text-foreground truncate mb-2">
                    <span className="text-muted-foreground">A:</span> {order.delivery.address}
                  </p>

                  {order.status === 'pending' && (
                    <select
                      defaultValue=""
                      disabled={assigningId === order.id}
                      onChange={(e) => handleAssign(order.id, Number(e.target.value))}
                      className="w-full bg-card text-foreground font-body text-xs px-2 py-1.5 rounded border border-border focus:border-primary focus:outline-none"
                    >
                      <option value="" disabled>Asignar a...</option>
                      {couriers.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}