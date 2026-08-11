import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Order } from '../types';
import StatusBadge from '../components/StatusBadge';

interface CourierSummary {
  courier_id: number;
  name: string;
  total_delivered: number;
}

export default function ReportsPage() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [summary, setSummary] = useState<CourierSummary[]>([]);
  const [deliveredOrders, setDeliveredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<{ couriers: CourierSummary[] }>(`/admin/reports/couriers-summary?month=${month}`),
      api.get<{ data: Order[] }>('/admin/reports/orders?status=delivered'),
    ])
      .then(([summaryRes, ordersRes]) => {
        setSummary(summaryRes.couriers);
        setDeliveredOrders(ordersRes.data);
      })
      .finally(() => setLoading(false));
  }, [month]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-xl text-base-light font-semibold">Reportes</h1>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="bg-base-dark text-base-light font-body text-sm px-3 py-2 rounded-lg border border-base-light/10 focus:border-primary focus:outline-none"
        />
      </div>

      {loading ? (
        <p className="font-body text-base-light/70">Cargando...</p>
      ) : (
        <>
          <section className="mb-8">
            <h2 className="font-body text-sm font-semibold text-primary mb-3">
              Entregas por mensajero este mes
            </h2>
            <div className="bg-base-dark border border-base-light/10 rounded-lg overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-base-light/10">
                    <th className="font-body text-xs text-base-light/50 font-medium px-4 py-3">Mensajero</th>
                    <th className="font-body text-xs text-base-light/50 font-medium px-4 py-3">Entregas</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((s) => (
                    <tr key={s.courier_id} className="border-b border-base-light/5 last:border-0">
                      <td className="font-body text-sm text-base-light px-4 py-3">{s.name}</td>
                      <td className="font-mono text-sm text-base-light px-4 py-3">{s.total_delivered}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="font-body text-sm font-semibold text-primary mb-3">
              Pedidos entregados (histórico)
            </h2>
            <div className="bg-base-dark border border-base-light/10 rounded-lg overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-base-light/10">
                    <th className="font-body text-xs text-base-light/50 font-medium px-4 py-3">ID</th>
                    <th className="font-body text-xs text-base-light/50 font-medium px-4 py-3">Clínica</th>
                    <th className="font-body text-xs text-base-light/50 font-medium px-4 py-3">Mensajero</th>
                    <th className="font-body text-xs text-base-light/50 font-medium px-4 py-3">Estado</th>
                    <th className="font-body text-xs text-base-light/50 font-medium px-4 py-3">Precio</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveredOrders.map((order) => (
                    <tr key={order.id} className="border-b border-base-light/5 last:border-0">
                      <td className="font-mono text-sm text-base-light px-4 py-3">#{order.id}</td>
                      <td className="font-body text-sm text-base-light px-4 py-3">{order.clinic.business_name}</td>
                      <td className="font-body text-sm text-base-light px-4 py-3">{order.courier?.name ?? '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                      <td className="font-mono text-sm text-base-light px-4 py-3">${order.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
