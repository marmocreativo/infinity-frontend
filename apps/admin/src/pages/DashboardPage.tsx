import { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../lib/api';
import type { Order, OrderStatus } from '../types';
import StatusBadge from '../components/StatusBadge';
import OrderContactInfo from '../components/OrderContactInfo';
import CourierMapWidget from '../components/CourierMapWidget';
import { useActiveOrders } from '../hooks/useActiveOrders';
import { Users, Truck, Package, AlertTriangle, ChevronDown } from 'lucide-react';

interface OrdersResponse {
  data: Order[];
}

interface Courier {
  id: number;
  name: string;
  status: 'active' | 'inactive' | 'suspended';
}

type AssignmentMode = 'manual' | 'automatic';

const statusOptions: { value: OrderStatus | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'assigned', label: 'Asignado' },
  { value: 'en_route_pickup', label: 'En camino a recolectar' },
  { value: 'arrived_pickup', label: 'En punto de recolección' },
  { value: 'picked_up', label: 'Recolectado' },
  { value: 'en_route_delivery', label: 'En camino a entregar' },
  { value: 'delivered', label: 'Entregado' },
  { value: 'cancelled', label: 'Cancelado' },
  { value: 'returned', label: 'Retorno a remitente' },
];

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [clinicCount, setClinicCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [mode, setMode] = useState<AssignmentMode | null>(null);
  const [savingMode, setSavingMode] = useState(false);

  // Pedidos pendientes y en curso (independiente del filtro de "Todos los pedidos")
  const { orders: activeOrders, reload: reloadActive } = useActiveOrders();

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
    api.get<{ data: { id: number; name: string; status: Courier['status'] }[] }>('/admin/users/couriers')
      .then((res) => setCouriers(res.data.map((c) => ({ id: c.id, name: c.name, status: c.status }))));

    api.get<{ mode: AssignmentMode }>('/admin/assignment-settings')
      .then((res) => setMode(res.mode))
      .catch(() => {});

    api.get<{ data: unknown[] }>('/admin/users/clinics')
      .then((res) => setClinicCount(res.data.length));
  }, []);

  async function handleToggleMode() {
    if (!mode) return;
    const next: AssignmentMode = mode === 'manual' ? 'automatic' : 'manual';
    setSavingMode(true);
    try {
      const res = await api.put<{ mode: AssignmentMode }>('/admin/assignment-settings', { mode: next });
      setMode(res.mode);
    } finally {
      setSavingMode(false);
    }
  }

  // Solo se puede asignar a mensajeros activos (los suspendidos no aparecen)
  const assignableCouriers = couriers.filter((c) => c.status === 'active');

  async function handleAssign(orderId: number, courierId: number) {
    if (!courierId) return;
    setAssigningId(orderId);
    try {
      await api.post(`/admin/orders/${orderId}/assign`, { courier_id: courierId });
      loadOrders();
      reloadActive();
    } finally {
      setAssigningId(null);
    }
  }

  // Pendientes (sin asignar) primero, del más antiguo al más reciente; luego los demás
  const pendingOrInTransit = useMemo(() => {
    const pending = activeOrders
      .filter((o) => o.status === 'pending')
      .sort((a, b) => a.id - b.id);
    const rest = activeOrders.filter((o) => o.status !== 'pending');
    return [...pending, ...rest];
  }, [activeOrders]);

  const unassignedCount = activeOrders.filter((o) => o.status === 'pending').length;

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h1 className="font-heading text-xl text-foreground font-semibold">Dashboard</h1>

        {mode && (
          <div className="flex items-center gap-3 bg-card border border-border rounded-lg px-3 py-2">
            <div>
              <p className="font-body text-xs text-foreground font-medium">
                Asignación {mode === 'manual' ? 'manual' : 'automática'}
              </p>
              <p className="font-body text-[11px] text-muted-foreground">
                {mode === 'manual'
                  ? 'Tú asignas cada pedido.'
                  : 'Se asigna al mensajero activo más cercano.'}
              </p>
            </div>
            <button
              onClick={handleToggleMode}
              disabled={savingMode}
              role="switch"
              aria-checked={mode === 'automatic'}
              aria-label="Activar asignación automática"
              className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${
                mode === 'automatic' ? 'bg-primary' : 'bg-border'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  mode === 'automatic' ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>
        )}
      </div>

      {unassignedCount > 0 && (
        <div className="flex items-center gap-3 bg-status-enroute/10 border-2 border-status-enroute rounded-lg px-4 py-3 mb-4">
          <AlertTriangle size={20} className="text-status-enroute shrink-0" />
          <p className="font-body text-sm text-foreground">
            <span className="font-semibold">
              {unassignedCount} {unassignedCount === 1 ? 'pedido sin asignar' : 'pedidos sin asignar'}
            </span>
            {' '}— asigna un mensajero desde la columna derecha.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Columna izquierda — mapa + stats (2/3 del ancho en desktop) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Mapa — oculto en móvil según el boceto */}
          <div className="hidden lg:block bg-card border border-border rounded-lg overflow-hidden" style={{ height: '420px' }}>
            <CourierMapWidget orders={activeOrders} />
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
                    {orders.map((order) => {
                      const open = expandedId === order.id;

                      return (
                        <div
                          key={order.id}
                          className={
                            order.status === 'pending'
                              ? 'bg-status-enroute/10 border-l-4 border-status-enroute'
                              : ''
                          }
                        >
                          <button
                            type="button"
                            onClick={() => setExpandedId(open ? null : order.id)}
                            className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-background/50 transition-colors"
                          >
                            <div className="min-w-0">
                              <p className="font-mono text-xs text-foreground">#{order.id}</p>
                              <p className="font-body text-xs text-muted-foreground truncate max-w-[140px]">
                                {order.clinic.business_name}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <StatusBadge status={order.status} />
                              <ChevronDown
                                size={14}
                                className={`text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
                              />
                            </div>
                          </button>
                          {open && (
                            <div className="px-4 pb-3">
                              <OrderContactInfo order={order} />
                              {order.courier && (
                                <p className="font-body text-xs text-muted-foreground mt-2">
                                  Mensajero: <span className="text-foreground">{order.courier.name}</span>
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
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
          <div className="p-4 border-b border-border shrink-0 flex items-center justify-between">
            <h2 className="font-body text-sm font-semibold text-foreground">Pendientes y en trayecto</h2>
            {unassignedCount > 0 && (
              <span className="bg-status-enroute text-black font-body text-xs font-semibold px-2 py-0.5 rounded-full">
                {unassignedCount} por asignar
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {pendingOrInTransit.length === 0 ? (
              <p className="font-body text-muted-foreground text-sm p-2">Todo al día — sin pedidos pendientes.</p>
            ) : (
              pendingOrInTransit.map((order) => {
                const isPending = order.status === 'pending';

                return (
                  <div
                    key={order.id}
                    className={
                      isPending
                        ? 'bg-status-enroute/10 border-2 border-status-enroute rounded-lg p-3 shadow-[0_0_14px_rgba(245,158,11,0.35)]'
                        : 'bg-background border border-border rounded-lg p-3'
                    }
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-sm text-foreground flex items-center gap-2">
                        #{order.id}
                        {order.is_urgent && (
                          <span className="bg-status-cancelled text-white font-body text-[10px] font-bold px-1.5 py-0.5 rounded">
                            URGENTE
                          </span>
                        )}
                      </span>
                      <StatusBadge status={order.status} />
                    </div>

                    {isPending && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-enroute opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-status-enroute" />
                        </span>
                        <span className="font-body text-xs font-semibold text-status-enroute">
                          Requiere asignación
                        </span>
                      </div>
                    )}

                    <OrderContactInfo order={order} />
                    <div className="mb-2" />

                    {!isPending && order.courier && (
                      <p className="font-body text-xs text-muted-foreground">
                        Mensajero: <span className="text-foreground">{order.courier.name}</span>
                      </p>
                    )}

                    {isPending && (
                      <select
                        defaultValue=""
                        disabled={assigningId === order.id}
                        onChange={(e) => handleAssign(order.id, Number(e.target.value))}
                        className="w-full bg-card text-foreground font-body text-xs px-2 py-2 rounded border-2 border-status-enroute focus:outline-none"
                      >
                        <option value="" disabled>Asignar a...</option>
                        {assignableCouriers.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}