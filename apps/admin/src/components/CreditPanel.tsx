import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Infinity as InfinityIcon } from 'lucide-react';
import { api, ApiError } from '../lib/api';

const money = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

interface CreditOrder {
  id: number;
  order_status: string;
  amount: number;
  created_at: string;
  due_at: string;
  days_left: number | null;
  status: 'open' | 'overdue' | 'paid';
  oxxo_reference: string | null;
}

interface Credit {
  credit_enabled: boolean;
  cycle_days: number;
  balance: number;
  debt: number;
  overdue_count: number;
  blocked: boolean;
  orders: CreditOrder[];
}

const dateLabel = (iso: string) => new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });

export default function CreditPanel({ clinicId }: { clinicId: number }) {
  const [data, setData] = useState<Credit | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number[]>([]);

  useEffect(() => {
    api.get<Credit>(`/admin/clinics/${clinicId}/credit`)
      .then(setData)
      .catch(() => setError('No se pudo cargar el crédito.'));
  }, [clinicId]);

  const unpaid = useMemo(() => (data?.orders ?? []).filter((o) => o.status !== 'paid'), [data]);
  const paid = useMemo(() => (data?.orders ?? []).filter((o) => o.status === 'paid'), [data]);
  const selectedTotal = unpaid.filter((o) => selected.includes(o.id)).reduce((s, o) => s + o.amount, 0);

  async function update(body: { enabled?: boolean; cycle_days?: number }, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;

    setBusy(true);
    setError(null);
    try {
      setData(await api.patch<Credit>(`/admin/clinics/${clinicId}/credit`, body));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar el cambio.');
    } finally {
      setBusy(false);
    }
  }

  async function registerPayment() {
    if (!window.confirm(`¿Registrar el pago de ${selected.length} pedido(s) por ${money(selectedTotal)}?`)) return;

    setBusy(true);
    setError(null);
    try {
      setData(await api.post<Credit>(`/admin/clinics/${clinicId}/credit/pay`, { order_ids: selected }));
      setSelected([]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo registrar el pago.');
    } finally {
      setBusy(false);
    }
  }

  function toggle(id: number) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  if (!data) {
    return error ? <p className="font-body text-sm text-status-cancelled">{error}</p> : null;
  }

  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <InfinityIcon size={18} className="text-primary" />
          <h2 className="font-heading text-lg text-foreground">Crédito Infinity</h2>
          <span
            className={`font-body text-xs px-2 py-0.5 rounded-full ${
              data.credit_enabled ? 'bg-status-delivered text-white' : 'bg-border text-muted-foreground'
            }`}
          >
            {data.credit_enabled ? 'Activo' : 'Inactivo'}
          </span>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={data.credit_enabled}
          aria-label="Activar Crédito Infinity"
          onClick={() =>
            update(
              { enabled: !data.credit_enabled },
              data.credit_enabled
                ? '¿Desactivar Crédito Infinity? Los pedidos ya hechos y su saldo se conservan.'
                : '¿Activar Crédito Infinity? La clínica podrá hacer pedidos sin pagar en el momento.'
            )
          }
          disabled={busy}
          className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${
            data.credit_enabled ? 'bg-primary' : 'bg-border'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
              data.credit_enabled ? 'translate-x-5' : ''
            }`}
          />
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <label className="font-body text-sm text-foreground">Plazo máximo por pedido</label>
        <select
          value={data.cycle_days}
          disabled={busy}
          onChange={(e) => update({ cycle_days: Number(e.target.value) })}
          className="bg-background text-foreground font-body text-sm px-3 py-1.5 rounded-lg border border-border focus:border-primary focus:outline-none"
        >
          <option value={7}>7 días (semanal)</option>
          <option value={15}>15 días (quincenal)</option>
        </select>
      </div>

      <p className="font-body text-xs text-muted-foreground">
        La clínica acumula pedidos a crédito y puede pagar uno o varios cuando quiera. Si un pedido pasa el plazo sin
        pagarse, no podrá crear pedidos nuevos hasta cubrirlo.
      </p>

      {data.blocked && (
        <div className="flex items-center gap-3 bg-status-cancelled/10 border border-status-cancelled rounded-lg px-4 py-3">
          <AlertTriangle size={18} className="text-status-cancelled shrink-0" />
          <p className="font-body text-sm text-foreground">
            {data.overdue_count} {data.overdue_count === 1 ? 'pedido vencido' : 'pedidos vencidos'} por{' '}
            <span className="font-mono font-semibold">{money(data.debt)}</span>: la clínica tiene los pedidos bloqueados.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-background border border-border rounded-lg p-3">
          <p className="font-body text-xs text-muted-foreground">Saldo por pagar</p>
          <p className="font-mono text-lg text-foreground">{money(data.balance)}</p>
        </div>
        <div className="bg-background border border-border rounded-lg p-3">
          <p className="font-body text-xs text-muted-foreground">Vencido</p>
          <p className={`font-mono text-lg ${data.debt > 0 ? 'text-status-cancelled' : 'text-foreground'}`}>
            {money(data.debt)}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-body text-sm font-semibold text-foreground">Pedidos por pagar ({unpaid.length})</h3>
          {unpaid.length > 0 && (
            <button
              type="button"
              onClick={() => setSelected(selected.length === unpaid.length ? [] : unpaid.map((o) => o.id))}
              className="font-body text-xs text-primary hover:underline"
            >
              {selected.length === unpaid.length ? 'Quitar selección' : 'Seleccionar todos'}
            </button>
          )}
        </div>

        {unpaid.length === 0 ? (
          <p className="font-body text-sm text-muted-foreground">Sin pedidos pendientes de pago.</p>
        ) : (
          <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
            {unpaid.map((o) => (
              <label key={o.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-background/40">
                <input
                  type="checkbox"
                  checked={selected.includes(o.id)}
                  onChange={() => toggle(o.id)}
                  className="w-4 h-4 accent-[var(--primary)] shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm text-foreground">
                    <Link
                      to={`/orders/${o.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-mono hover:text-primary hover:underline"
                    >
                      #{o.id}
                    </Link>
                    <span className="text-muted-foreground"> · {dateLabel(o.created_at)}</span>
                    {o.order_status === 'cancelled' && <span className="text-muted-foreground"> · cancelado</span>}
                  </p>
                  <p
                    className={`font-body text-xs ${
                      o.status === 'overdue' ? 'text-status-cancelled' : 'text-muted-foreground'
                    }`}
                  >
                    {o.status === 'overdue' ? `Vencido el ${dateLabel(o.due_at)}` : `Vence el ${dateLabel(o.due_at)}`}
                    {o.oxxo_reference && ` · ficha OXXO ${o.oxxo_reference} (esperando depósito)`}
                  </p>
                </div>
                <span className="font-mono text-sm text-foreground shrink-0">{money(o.amount)}</span>
              </label>
            ))}
          </div>
        )}

        {selected.length > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={registerPayment}
            className="w-full bg-primary hover:opacity-90 disabled:opacity-50 text-primary-foreground font-body text-sm font-medium px-4 py-2 rounded-lg transition-opacity"
          >
            Registrar pago de {selected.length} {selected.length === 1 ? 'pedido' : 'pedidos'} · {money(selectedTotal)}
          </button>
        )}
      </div>

      {paid.length > 0 && (
        <details>
          <summary className="font-body text-sm text-muted-foreground cursor-pointer">Pagados ({paid.length})</summary>
          <div className="mt-2 border border-border rounded-lg divide-y divide-border">
            {paid.slice(0, 50).map((o) => (
              <Link key={o.id} to={`/orders/${o.id}`} className="flex items-center justify-between px-4 py-2 hover:bg-background/40">
                <span className="font-body text-xs text-foreground">
                  <span className="font-mono">#{o.id}</span>
                  <span className="text-muted-foreground"> · {dateLabel(o.created_at)}</span>
                </span>
                <span className="font-mono text-xs text-muted-foreground">{money(o.amount)}</span>
              </Link>
            ))}
          </div>
        </details>
      )}

      {error && <p className="font-body text-sm text-status-cancelled">{error}</p>}
    </div>
  );
}
