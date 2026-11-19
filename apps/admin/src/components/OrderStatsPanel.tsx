import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import StatusBadge from './StatusBadge';
import type { Order } from '../types';

/** Descarga todos los pedidos que cumplan el filtro (hasta 1000), paginando de 100 en 100 */
export function useAllOrders(filter: string) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function load() {
      const all: Order[] = [];
      for (let page = 1; page <= 10; page++) {
        const res = await api.get<{ data: Order[]; meta?: { last_page?: number } }>(
          `/admin/reports/orders?${filter}&per_page=100&page=${page}`
        );
        all.push(...res.data);
        if (page >= (res.meta?.last_page ?? 1)) break;
      }
      if (!cancelled) setOrders(all);
    }

    load()
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [filter]);

  return { orders, loading };
}

type Period = '30' | '90' | '365' | 'all';

const periodLabels: Record<Period, string> = {
  '30': 'Últimos 30 días',
  '90': 'Últimos 90 días',
  '365': 'Último año',
  all: 'Todo el historial',
};

const money = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

const IN_PROGRESS = ['assigned', 'en_route_pickup', 'arrived_pickup', 'picked_up', 'en_route_delivery'];

function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '—';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h} h ${m} min`;
}

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <p className="font-body text-xs text-muted-foreground mb-1">{label}</p>
      <p className="font-heading text-2xl text-foreground">{value}</p>
      {hint && <p className="font-body text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

interface Props {
  orders: Order[];
  loading: boolean;
  /** courier: muestra clínicas atendidas; clinic: muestra mensajeros que la atienden */
  mode: 'courier' | 'clinic';
}

export default function OrderStatsPanel({ orders, loading, mode }: Props) {
  const [period, setPeriod] = useState<Period>('90');

  const filtered = useMemo(() => {
    if (period === 'all') return orders;
    const since = Date.now() - Number(period) * 86400000;
    return orders.filter((o) => new Date(o.created_at).getTime() >= since);
  }, [orders, period]);

  const stats = useMemo(() => {
    const delivered = filtered.filter((o) => o.status === 'delivered');
    const cancelled = filtered.filter((o) => o.status === 'cancelled');
    const returned = filtered.filter((o) => o.status === 'returned');
    const active = filtered.filter((o) => IN_PROGRESS.includes(o.status) || o.status === 'pending');
    const closed = delivered.length + cancelled.length + returned.length;

    const revenue = delivered.reduce((sum, o) => sum + Number(o.price || 0), 0);
    const km = delivered.reduce((sum, o) => sum + Number(o.distance_km || 0), 0);
    const urgent = filtered.filter((o) => o.is_urgent).length;

    const durations = delivered
      .map((o) => (new Date(o.updated_at).getTime() - new Date(o.created_at).getTime()) / 60000)
      .filter((m) => m > 0 && m < 60 * 24 * 7);
    const avgMinutes = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    // Entregas por mes (últimos 6 meses)
    const months: { key: string; label: string; count: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('es-MX', { month: 'short' }),
        count: 0,
      });
    }
    for (const o of delivered) {
      const d = new Date(o.updated_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const m = months.find((x) => x.key === key);
      if (m) m.count++;
    }

    // Ranking de contrapartes
    const counter = new Map<string, { name: string; count: number }>();
    for (const o of delivered) {
      const who = mode === 'courier' ? o.clinic : o.courier;
      if (!who) continue;
      const name = mode === 'courier' ? (who as Order['clinic']).business_name : (who as { name: string }).name;
      const entry = counter.get(String(who.id)) ?? { name, count: 0 };
      entry.count++;
      counter.set(String(who.id), entry);
    }
    const ranking = [...counter.values()].sort((a, b) => b.count - a.count).slice(0, 5);

    return {
      total: filtered.length,
      delivered: delivered.length,
      cancelled: cancelled.length,
      returned: returned.length,
      active: active.length,
      successRate: closed ? Math.round((delivered.length / closed) * 100) : null,
      revenue,
      km,
      urgent,
      avgMinutes,
      months,
      ranking,
    };
  }, [filtered, mode]);

  const maxMonth = Math.max(1, ...stats.months.map((m) => m.count));
  const recent = filtered.slice(0, 10);

  if (loading) {
    return <p className="font-body text-muted-foreground text-sm">Cargando estadísticas...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg text-foreground">Resumen</h2>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
          className="bg-card text-foreground font-body text-sm px-3 py-1.5 rounded-lg border border-border focus:border-primary focus:outline-none"
        >
          {(Object.keys(periodLabels) as Period[]).map((p) => (
            <option key={p} value={p}>
              {periodLabels[p]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Pedidos" value={stats.total} hint={stats.active ? `${stats.active} en curso` : undefined} />
        <StatCard
          label="Entregados"
          value={stats.delivered}
          hint={stats.successRate !== null ? `${stats.successRate}% de los cerrados` : undefined}
        />
        <StatCard
          label="Cancelados / retornos"
          value={`${stats.cancelled} / ${stats.returned}`}
        />
        <StatCard label="Urgentes" value={stats.urgent} />
        <StatCard
          label={mode === 'courier' ? 'Valor entregado' : 'Gasto en entregas'}
          value={money(stats.revenue)}
        />
        <StatCard label="Distancia recorrida" value={`${stats.km.toFixed(1)} km`} />
        <StatCard label="Tiempo medio de entrega" value={formatDuration(stats.avgMinutes)} hint="Desde que se pide hasta que se entrega" />
        <StatCard
          label="Promedio por pedido"
          value={stats.delivered ? money(stats.revenue / stats.delivered) : '—'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-body text-sm font-semibold text-foreground mb-4">Entregas por mes</h3>
          <div className="flex items-end gap-3 h-36">
            {stats.months.map((m) => (
              <div key={m.key} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                <span className="font-mono text-xs text-muted-foreground">{m.count}</span>
                <div
                  className="w-full rounded-t bg-primary/80"
                  style={{ height: `${Math.max(4, (m.count / maxMonth) * 100)}%`, minHeight: '4px' }}
                />
                <span className="font-body text-xs text-muted-foreground capitalize">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-body text-sm font-semibold text-foreground mb-3">
            {mode === 'courier' ? 'Clínicas más atendidas' : 'Mensajeros que la atienden'}
          </h3>
          {stats.ranking.length === 0 ? (
            <p className="font-body text-sm text-muted-foreground">Sin entregas en este periodo.</p>
          ) : (
            <ul className="space-y-2">
              {stats.ranking.map((r, i) => (
                <li key={r.name} className="flex items-center justify-between gap-3">
                  <span className="font-body text-sm text-foreground truncate">
                    <span className="font-mono text-xs text-muted-foreground mr-2">{i + 1}.</span>
                    {r.name}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground shrink-0">{r.count} entregas</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <h3 className="font-body text-sm font-semibold text-foreground p-4 border-b border-border">
          Pedidos recientes
        </h3>
        {recent.length === 0 ? (
          <p className="font-body text-sm text-muted-foreground p-4">Sin pedidos en este periodo.</p>
        ) : (
          <div className="divide-y divide-border">
            {recent.map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <Link to={`/orders/${o.id}`} className="font-mono text-sm text-primary hover:underline">
                    #{o.id}
                  </Link>
                  <p className="font-body text-xs text-muted-foreground truncate">
                    {mode === 'courier' ? o.clinic.business_name : (o.courier?.name ?? 'Sin mensajero')}
                    {' · '}
                    {new Date(o.created_at).toLocaleDateString('es-MX')}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-xs text-muted-foreground">{money(Number(o.price || 0))}</span>
                  <StatusBadge status={o.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
