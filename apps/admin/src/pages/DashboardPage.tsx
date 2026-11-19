import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { Order, OrderStatus } from '../types';
import StatusBadge from '../components/StatusBadge';
import OrderContactInfo from '../components/OrderContactInfo';
import CourierMapWidget from '../components/CourierMapWidget';
import { useActiveOrders } from '../hooks/useActiveOrders';
import { Users, Truck, Package, AlertTriangle, Crosshair, ExternalLink } from 'lucide-react';

interface OrdersResponse {
  data: Order[];
  meta?: { total?: number };
}

interface Courier {
  id: number;
  name: string;
  status: 'active' | 'inactive' | 'suspended';
}

type AssignmentMode = 'manual' | 'automatic';
type ListFilter = 'active' | '' | OrderStatus;

const filterOptions: { value: ListFilter; label: string }[] = [
  { value: 'active', label: 'Pendientes y en trayecto' },
  { value: '', label: 'Todos los pedidos' },
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
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [clinicCount, setClinicCount] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<ListFilter>('active');
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mode, setMode] = useState<AssignmentMode | null>(null);
  const [savingMode, setSavingMode] = useState(false);

  // Pedidos pendientes y en curso (alimentan el mapa y la vista por defecto)
  const { orders: activeOrders, reload: reloadActive } = useActiveOrders();

  // Cualquier otro filtro se pide al servidor
  const loadFiltered = useCallback(() => {
    if (filter === 'active') return;
    setLoading(true);
    const query = filter ? `?status=${filter}&per_page=50` : '?per_page=50';
    api.get<OrdersResponse>(`/admin/orders${query}`)
      .then((res) => setFilteredOrders(res.data))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    loadFiltered();
  }, [loadFiltered]);

  useEffect(() => {
    api.get<{ data: { id: number; name: string; status: Courier['status'] }[] }>('/admin/users/couriers?per_page=200')
      .then((res) => setCouriers(res.data.map((c) => ({ id: c.id, name: c.name, status: c.status }))));

    api.get<{ mode: AssignmentMode }>('/admin/assignment-settings')
      .then((res) => setMode(res.mode))
      .catch(() => {});

    api.get<{ data: unknown[] }>('/admin/users/clinics?per_page=200')
      .then((res) => setClinicCount(res.data.length));

    api.get<OrdersResponse>('/admin/orders?per_page=1')
      .then((res) => setTotalOrders(res.meta?.total ?? res.data.length))
      .catch(() => {});
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
      loadFiltered();
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

  const listOrders = filter === 'active' ? pendingOrInTransit : filteredOrders;

  // El mapa muestra los pedidos activos y, si seleccionas uno de otro estado, también ese
  const mapOrders = useMemo(() => {
    if (selectedId === null || activeOrders.some((o) => o.id === selectedId)) return activeOrders;
    const extra = filteredOrders.find((o) => o.id === selectedId);
    return extra ? [...activeOrders, extra] : activeOrders;
  }, [activeOrders, filteredOrders, selectedId]);

  // Los pedidos programados para un día futuro no cuentan como urgentes por asignar
  const today = new Date().toLocaleDateString('en-CA');
  const unassignedCount = activeOrders.filter(
    (o) => o.status === 'pending' && !o.awaiting_payment && !(o.scheduled_for && o.scheduled_for > today)
  ).length;

  const summary = [
    { icon: Package, value: totalOrders, label: 'Pedidos totales' },
    { icon: Truck, value: couriers.length, label: 'Mensajeros' },
    { icon: Users, value: clinicCount, label: 'Clínicas' },
  ];

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
        {/* Columna izquierda — mapa + resumen (2/3 del ancho en desktop) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Mapa — oculto en móvil */}
          <div className="hidden lg:block bg-card border border-border rounded-lg overflow-hidden" style={{ height: '620px' }}>
            <CourierMapWidget orders={mapOrders} selectedOrderId={selectedId} />
          </div>

          {/* Resumen — todo el ancho, 3 columnas */}
          <div className="grid grid-cols-3 gap-4">
            {summary.map(({ icon: Icon, value, label }) => (
              <div
                key={label}
                className="bg-card border border-border rounded-lg p-4 flex items-center gap-3"
              >
                <div className="bg-background border border-border rounded-lg p-2.5 shrink-0">
                  <Icon size={18} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-heading text-xl text-foreground font-semibold">{value}</p>
                  <p className="font-body text-xs text-muted-foreground truncate">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Columna derecha — pedidos con filtro (misma altura que la izquierda en desktop) */}
        <div className="relative h-[640px] lg:h-auto">
          <div className="lg:absolute lg:inset-0 bg-card border border-border rounded-lg overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-border shrink-0 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-body text-sm font-semibold text-foreground">Pedidos</h2>
                {unassignedCount > 0 && (
                  <span className="bg-status-enroute text-black font-body text-xs font-semibold px-2 py-0.5 rounded-full">
                    {unassignedCount} por asignar
                  </span>
                )}
              </div>
              <select
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value as ListFilter);
                  setSelectedId(null);
                }}
                className="w-full bg-background text-foreground font-body text-xs px-2 py-2 rounded border border-border focus:border-primary focus:outline-none"
              >
                {filterOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
              {filter !== 'active' && loading ? (
                <p className="font-body text-muted-foreground text-sm p-2">Cargando...</p>
              ) : listOrders.length === 0 ? (
                <p className="font-body text-muted-foreground text-sm p-2">
                  {filter === 'active' ? 'Todo al día — sin pedidos pendientes.' : 'Sin pedidos con este estado.'}
                </p>
              ) : (
                listOrders.map((order) => {
                  const isPending = order.status === 'pending';
                  const isSelected = selectedId === order.id;

                  return (
                    <div
                      key={order.id}
                      className={`rounded-lg p-3 ${
                        isPending
                          ? 'bg-status-enroute/10 border-2 border-status-enroute shadow-[0_0_14px_rgba(245,158,11,0.35)]'
                          : 'bg-background border border-border'
                      } ${isSelected ? 'ring-2 ring-primary' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-2 gap-2">
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

                      {isPending && order.awaiting_payment && (
                        <p className="font-body text-xs font-semibold text-muted-foreground mb-2">
                          Esperando pago por OXXO — se podrá asignar al confirmarlo
                        </p>
                      )}

                      {isPending && !order.awaiting_payment && (
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

                      {/* Pendientes y seleccionados muestran el detalle de contacto; el resto, solo la clínica */}
                      {isPending || isSelected ? (
                        <OrderContactInfo order={order} />
                      ) : (
                        <p className="font-body text-xs text-muted-foreground truncate">
                          {order.clinic.business_name}
                        </p>
                      )}

                      {order.courier && (
                        <p className="font-body text-xs text-muted-foreground mt-2">
                          Mensajero: <span className="text-foreground">{order.courier.name}</span>
                        </p>
                      )}

                      {isPending && !order.awaiting_payment && (
                        <select
                          defaultValue=""
                          disabled={assigningId === order.id}
                          onChange={(e) => handleAssign(order.id, Number(e.target.value))}
                          className="w-full mt-2 bg-card text-foreground font-body text-xs px-2 py-2 rounded border-2 border-status-enroute focus:outline-none"
                        >
                          <option value="" disabled>Asignar a...</option>
                          {assignableCouriers.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      )}

                      <div className="flex items-center gap-4 mt-3 pt-2 border-t border-border/60">
                        <button
                          type="button"
                          onClick={() => setSelectedId(isSelected ? null : order.id)}
                          className={`hidden lg:flex items-center gap-1 font-body text-xs hover:opacity-80 ${
                            isSelected ? 'text-primary font-semibold' : 'text-muted-foreground'
                          }`}
                        >
                          <Crosshair size={12} />
                          {isSelected ? 'Quitar realce' : 'Ver en el mapa'}
                        </button>
                        <Link
                          to={`/orders/${order.id}`}
                          className="flex items-center gap-1 font-body text-xs text-primary hover:underline ml-auto"
                        >
                          Ver detalle completo
                          <ExternalLink size={12} />
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
