import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { auth } from '../lib/auth';
import type { Order } from '../types';
import Avatar from '../components/Avatar';
import OrderTimeline from '../components/OrderTimeline';
import { Search } from 'lucide-react';

interface OrdersResponse {
  data: Order[];
  meta?: { current_page: number; last_page: number };
}

function eventDate(order: Order, type: string): string | null {
  const ev = order.events?.find((e) => e.event_type === type);
  return ev ? ev.created_at : null;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function OrderCard({ order }: { order: Order }) {
  return (
    <Link
      to={`/orders/${order.id}`}
      className="block bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
    >
      <p className="font-mono text-sm text-muted-foreground mb-2">Pedido #{order.id}</p>
      <p className="font-body text-sm text-foreground truncate mb-3">
        <span className="text-muted-foreground">Destino:</span> {order.delivery.address}
      </p>

      {order.courier && order.status !== 'delivered' && order.status !== 'cancelled' && (
        <div className="flex items-center gap-2 mb-4">
          <Avatar name={order.courier.name} photoUrl={order.courier.photo_url} size="sm" />
          <div className="min-w-0">
            <p className="font-body text-xs text-muted-foreground leading-tight">Tu repartidor</p>
            <p className="font-body text-sm text-foreground font-medium truncate leading-tight">
              {order.courier.name}
            </p>
          </div>
        </div>
      )}

      <OrderTimeline order={order} />
    </Link>
  );
}

export default function OrdersListPage() {
  const user = auth.getUser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      try {
        let page = 1;
        let lastPage = 1;
        let all: Order[] = [];

        do {
          const res = await api.get<OrdersResponse>(`/cliente/orders?page=${page}`);
          all = [...all, ...res.data];
          lastPage = res.meta?.last_page ?? 1;
          page++;
        } while (page <= lastPage);

        if (!cancelled) setOrders(all);
      } catch {
        if (!cancelled) setError('No se pudieron cargar los pedidos.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAll();

    return () => {
      cancelled = true;
    };
  }, []);

  const activeOrders = useMemo(
    () => orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled'),
    [orders]
  );

  const clinicName = orders[0]?.clinic.business_name;

  const historicalOrders = useMemo(() => {
    const finished = orders.filter((o) => o.status === 'delivered' || o.status === 'cancelled');
    if (!search.trim()) return finished;

    const q = search.trim().toLowerCase();
    return finished.filter((o) => {
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

      {/* Fila 2 — pedidos en curso */}
      {activeOrders.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}

      {/* Fila 3 — histórico */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading text-base text-foreground font-semibold">Historial</h2>
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
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      </div>
    </div>
  );
}