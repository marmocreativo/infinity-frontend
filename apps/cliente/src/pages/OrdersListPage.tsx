import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { auth } from '../lib/auth';
import type { Order } from '../types';
import StatusBadge from '../components/StatusBadge';
import Avatar from '../components/Avatar';
import OrderMapPreview from '../components/OrderMapPreview';
import { Search } from 'lucide-react';

interface OrdersResponse {
  data: Order[];
}

function eventDate(order: Order, type: string): string | null {
  const ev = order.events?.find((e) => e.event_type === type);
  return ev ? ev.created_at : null;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function OrdersListPage() {
  const user = auth.getUser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get<OrdersResponse>('/cliente/orders')
      .then((res) => setOrders(res.data))
      .catch(() => setError('No se pudieron cargar los pedidos.'))
      .finally(() => setLoading(false));
  }, []);

  const activeOrder = useMemo(
    () => orders.find((o) => o.status !== 'delivered' && o.status !== 'cancelled'),
    [orders]
  );

  const clinicName = orders[0]?.clinic.business_name;

  const historicalOrders = useMemo(() => {
    const delivered = orders.filter((o) => o.status === 'delivered');
    if (!search.trim()) return delivered;

    const q = search.trim().toLowerCase();
    return delivered.filter((o) => {
      const idMatch = String(o.id).includes(q);
      const deliveredAt = eventDate(o, 'delivered');
      const dateMatch = deliveredAt ? formatDate(deliveredAt).toLowerCase().includes(q) : false;
      return idMatch || dateMatch;
    });
  }, [orders, search]);

  if (!user) return null;

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24 space-y-6">
      {/* Fila 1 — perfil */}
      <Link to="/profile" className="flex items-center gap-3 bg-card border border-border rounded-lg p-3 hover:border-primary/50 transition-colors">
        <Avatar name={user.name} />
        <div className="min-w-0">
          <p className="font-body text-sm text-foreground font-medium truncate">{user.name}</p>
          <p className="font-body text-xs text-muted-foreground truncate">
            {clinicName ?? 'Sin pedidos aún'}
          </p>
        </div>
      </Link>

      {/* Fila 2 — pedido activo */}
      {activeOrder && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <OrderMapPreview pickup={activeOrder.pickup} delivery={activeOrder.delivery} />
          <Link to={`/orders/${activeOrder.id}`} className="block p-4 hover:bg-border/20 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-sm text-muted-foreground">Pedido #{activeOrder.id}</span>
              <StatusBadge status={activeOrder.status} />
            </div>
            <p className="font-body text-sm text-foreground truncate">
              <span className="text-muted-foreground">De:</span> {activeOrder.pickup.address}
            </p>
            <p className="font-body text-sm text-foreground truncate">
              <span className="text-muted-foreground">A:</span> {activeOrder.delivery.address}
            </p>
          </Link>
        </div>
      )}

      {/* Fila 3 — histórico */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading text-base text-foreground font-semibold">Pedidos entregados</h2>
        </div>

        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por número o fecha..."
            className="w-full bg-card text-foreground font-body text-sm pl-9 pr-3 py-2 rounded-lg border border-border focus:border-primary focus:outline-none"
          />
        </div>

        {loading && <p className="font-body text-muted-foreground text-sm">Cargando...</p>}
        {error && <p className="font-body text-status-cancelled text-sm">{error}</p>}

        {!loading && !error && historicalOrders.length === 0 && (
          <p className="font-body text-muted-foreground text-sm">
            {search ? 'Sin resultados para tu búsqueda.' : 'Aún no tienes pedidos entregados.'}
          </p>
        )}

        <div className="space-y-3">
          {historicalOrders.map((order) => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="block bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-sm text-muted-foreground">Pedido #{order.id}</span>
                <StatusBadge status={order.status} />
              </div>

              <div className="flex items-center gap-3 font-body text-xs text-muted-foreground mb-2">
                <span>Solicitado: {formatDate(order.created_at)}</span>
                <span>·</span>
                <span>Recolectado: {formatDate(eventDate(order, 'picked_up'))}</span>
                <span>·</span>
                <span>Entregado: {formatDate(eventDate(order, 'delivered'))}</span>
              </div>

              <p className="font-body text-sm text-foreground truncate">
                {order.pickup.address} <span className="text-muted-foreground">→</span> {order.delivery.address}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}