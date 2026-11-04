import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Order } from '../types';
import Avatar from '../components/Avatar';
import { Package } from 'lucide-react';

interface CourierSummary {
  courier_id: number;
  name: string;
  total_delivered: number;
}

interface ClinicOption {
  id: number;
  business_name: string;
}

// Primer y último día del mes (YYYY-MM) para filtrar el listado
function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` };
}

export default function ReportsPage() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [clinicId, setClinicId] = useState('');
  const [clinics, setClinics] = useState<ClinicOption[]>([]);
  const [summary, setSummary] = useState<CourierSummary[]>([]);
  const [deliveredOrders, setDeliveredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ data: ClinicOption[] }>('/admin/users/clinics?per_page=200')
      .then((res) => setClinics(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const { from, to } = monthRange(month);
    const clinicParam = clinicId ? `&clinic_id=${clinicId}` : '';

    Promise.all([
      api.get<{ couriers: CourierSummary[] }>(`/admin/reports/couriers-summary?month=${month}${clinicParam}`),
      api.get<{ data: Order[] }>(
        `/admin/reports/orders?status=delivered&from=${from}&to=${to}&per_page=100${clinicParam}`
      ),
    ])
      .then(([summaryRes, ordersRes]) => {
        setSummary(summaryRes.couriers);
        setDeliveredOrders(ordersRes.data);
      })
      .finally(() => setLoading(false));
  }, [month, clinicId]);

  const maxDelivered = Math.max(...summary.map((s) => s.total_delivered), 1);

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-xl text-foreground font-semibold">Reportes</h1>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <select
            value={clinicId}
            onChange={(e) => setClinicId(e.target.value)}
            aria-label="Filtrar por cliente"
            className="bg-card text-foreground font-body text-sm px-3 py-2 rounded-lg border border-border focus:border-primary focus:outline-none max-w-[220px]"
          >
            <option value="">Todos los clientes</option>
            {clinics.map((c) => (
              <option key={c.id} value={c.id}>{c.business_name}</option>
            ))}
          </select>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="bg-card text-foreground font-body text-sm px-3 py-2 rounded-lg border border-border focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <p className="font-body text-muted-foreground">Cargando...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna principal — histórico de pedidos entregados */}
          <section className="lg:col-span-2">
            <h2 className="font-body text-sm font-semibold text-foreground mb-3">
              Pedidos entregados en el mes ({deliveredOrders.length})
            </h2>
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              {deliveredOrders.length === 0 ? (
                <p className="font-body text-muted-foreground text-sm p-4">Sin pedidos entregados con estos filtros.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="font-body text-xs text-muted-foreground font-medium px-4 py-3">ID</th>
                        <th className="font-body text-xs text-muted-foreground font-medium px-4 py-3">Clínica</th>
                        <th className="font-body text-xs text-muted-foreground font-medium px-4 py-3">Mensajero</th>
                        <th className="font-body text-xs text-muted-foreground font-medium px-4 py-3">Factura</th>
                        <th className="font-body text-xs text-muted-foreground font-medium px-4 py-3">Precio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deliveredOrders.map((order) => (
                        <tr key={order.id} className="border-b border-border/50 last:border-0">
                          <td className="font-mono text-sm text-foreground px-4 py-3">#{order.id}</td>
                          <td className="font-body text-sm text-foreground px-4 py-3">{order.clinic.business_name}</td>
                          <td className="font-body text-sm text-foreground px-4 py-3">{order.courier?.name ?? '—'}</td>
                          <td className="font-body text-sm text-foreground px-4 py-3">{order.requires_invoice ? 'Sí' : 'No'}</td>
                          <td className="font-mono text-sm text-foreground px-4 py-3">${order.price}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* Columna derecha — entregas por mensajero, como cartas */}
          <section>
            <h2 className="font-body text-sm font-semibold text-foreground mb-3">
              Entregas por mensajero este mes
            </h2>

            {summary.length === 0 ? (
              <p className="font-body text-muted-foreground text-sm">Sin datos para este mes.</p>
            ) : (
              <div className="space-y-3">
                {summary
                  .slice()
                  .sort((a, b) => b.total_delivered - a.total_delivered)
                  .map((s) => (
                    <div key={s.courier_id} className="bg-card border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar name={s.name} size="sm" />
                          <p className="font-body text-sm text-foreground font-medium truncate">{s.name}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Package size={14} className="text-primary" />
                          <span className="font-heading text-lg text-foreground font-semibold">
                            {s.total_delivered}
                          </span>
                        </div>
                      </div>

                      {/* Barra de progreso relativa al mensajero con más entregas */}
                      <div className="h-1.5 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${(s.total_delivered / maxDelivered) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}