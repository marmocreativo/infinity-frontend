import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CreditCard, Infinity as InfinityIcon, Store } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import CardFields, { emptyCard, validateCard, type CardValues } from '../components/CardFields';

const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

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

interface Billing {
  credit_enabled: boolean;
  cycle_days: number;
  balance: number;
  debt: number;
  overdue_count: number;
  blocked: boolean;
  next_due_at: string | null;
  orders: CreditOrder[];
}

type PayMethod = 'card' | 'oxxo';

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });

function dueText(o: CreditOrder): { text: string; cls: string } {
  if (o.status === 'paid') return { text: 'Pagado', cls: 'text-status-delivered' };
  if (o.status === 'overdue') return { text: `Vencido el ${dateLabel(o.due_at)}`, cls: 'text-status-cancelled' };

  const d = o.days_left ?? 0;
  if (d <= 0) return { text: 'Vence hoy', cls: 'text-status-enroute' };
  return { text: `Vence en ${d} ${d === 1 ? 'día' : 'días'}`, cls: d <= 2 ? 'text-status-enroute' : 'text-muted-foreground' };
}

export default function BillingPage() {
  const [data, setData] = useState<Billing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [showPay, setShowPay] = useState(false);
  const [method, setMethod] = useState<PayMethod>('card');
  const [card, setCard] = useState<CardValues>(emptyCard);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reference, setReference] = useState<{ ref: string; total: number } | null>(null);

  function load() {
    api.get<Billing>('/cliente/billing')
      .then(setData)
      .catch(() => setError('No se pudo cargar tu facturación.'));
  }

  useEffect(load, []);

  const unpaid = useMemo(() => (data?.orders ?? []).filter((o) => o.status !== 'paid'), [data]);
  const total = useMemo(
    () => unpaid.filter((o) => selected.includes(o.id)).reduce((sum, o) => sum + o.amount, 0),
    [unpaid, selected]
  );

  function toggle(id: number) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setShowPay(false);
    setPayError(null);
  }

  function selectAll(only?: 'overdue') {
    const ids = unpaid.filter((o) => !only || o.status === only).map((o) => o.id);
    setSelected(ids);
    setShowPay(false);
  }

  async function pay() {
    setPayError(null);

    if (method === 'card') {
      const invalid = validateCard(card);
      if (invalid) return setPayError(invalid);
    }

    setPaying(true);
    try {
      const res = await api.post<{ paid: boolean; total: number; reference?: string; billing: Billing }>(
        '/cliente/billing/pay',
        { order_ids: selected, method }
      );

      setData(res.billing);
      setSelected([]);
      setShowPay(false);
      setCard(emptyCard);

      if (res.paid) {
        setNotice(`Pago de ${money.format(res.total)} realizado.`);
        setReference(null);
      } else if (res.reference) {
        setNotice(null);
        setReference({ ref: res.reference, total: res.total });
      }
    } catch (err) {
      setPayError(err instanceof ApiError ? err.message : 'No se pudo procesar el pago.');
    } finally {
      setPaying(false);
    }
  }

  if (error) return <p className="p-4 font-body text-status-cancelled">{error}</p>;
  if (!data) return <p className="p-4 font-body text-muted-foreground">Cargando...</p>;

  const history = data.orders.filter((o) => o.status === 'paid');

  return (
    <div className="p-4 max-w-2xl mx-auto pb-32 space-y-4">
      <h1 className="font-heading text-xl text-foreground font-semibold">Facturación</h1>

      {data.blocked && (
        <div className="flex items-start gap-3 bg-status-cancelled/10 border-2 border-status-cancelled rounded-lg p-4">
          <AlertTriangle size={20} className="text-status-cancelled shrink-0 mt-0.5" />
          <div>
            <p className="font-body text-sm font-semibold text-foreground">
              Tienes {data.overdue_count} {data.overdue_count === 1 ? 'pedido vencido' : 'pedidos vencidos'} por{' '}
              {money.format(data.debt)}
            </p>
            <p className="font-body text-sm text-muted-foreground">
              Mientras haya pedidos vencidos no puedes crear pedidos nuevos. Págalos aquí abajo y se libera tu cuenta al
              instante.
            </p>
          </div>
        </div>
      )}

      {notice && (
        <div className="bg-status-delivered/10 border border-status-delivered/50 rounded-lg p-3 font-body text-sm text-foreground">
          {notice}
        </div>
      )}

      {reference && (
        <div className="bg-card border border-border rounded-lg p-4 text-center space-y-2">
          <p className="font-body text-xs text-muted-foreground">Referencia de pago OXXO</p>
          <p className="font-mono text-xl tracking-widest text-foreground">
            {reference.ref.replace(/(.{4})/g, '$1 ').trim()}
          </p>
          <p className="font-body text-sm text-foreground">
            Monto exacto: <span className="font-mono font-semibold">{money.format(reference.total)}</span>
          </p>
          <p className="font-body text-xs text-muted-foreground">
            Paga en caja de cualquier OXXO. Tus pedidos se marcarán como pagados cuando validemos el depósito.
          </p>
        </div>
      )}

      {!data.credit_enabled && data.orders.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-5 space-y-2">
          <div className="flex items-center gap-2">
            <InfinityIcon size={18} className="text-primary" />
            <p className="font-body text-sm font-semibold text-foreground">Crédito Infinity</p>
          </div>
          <p className="font-body text-sm text-muted-foreground">
            Aún no tienes activo el Crédito Infinity. Con él puedes hacer pedidos sin pagar en el momento y liquidarlos
            cuando quieras, dentro del plazo acordado. Es una opción para clientes de confianza: pide a Infinity que lo
            active para tu clínica.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="font-body text-xs text-muted-foreground mb-1">Saldo por pagar</p>
              <p className="font-mono text-xl text-foreground">{money.format(data.balance)}</p>
              <p className="font-body text-xs text-muted-foreground mt-1">
                Plazo por pedido: {data.cycle_days} días
              </p>
            </div>
            <div
              className={`rounded-lg p-4 border ${
                data.debt > 0 ? 'bg-status-cancelled/10 border-status-cancelled' : 'bg-card border-border'
              }`}
            >
              <p className="font-body text-xs text-muted-foreground mb-1">Vencido</p>
              <p className={`font-mono text-xl ${data.debt > 0 ? 'text-status-cancelled' : 'text-foreground'}`}>
                {money.format(data.debt)}
              </p>
              <p className="font-body text-xs text-muted-foreground mt-1">
                {data.debt > 0 ? 'Pedidos bloqueados' : 'Estás al corriente'}
              </p>
            </div>
          </div>

          {!data.credit_enabled && (
            <p className="font-body text-xs text-muted-foreground">
              Tu Crédito Infinity está desactivado: no puedes hacer pedidos nuevos a crédito, pero aquí puedes liquidar
              lo pendiente.
            </p>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="font-body text-sm font-semibold text-foreground">Pedidos por pagar</h2>
              {unpaid.length > 0 && (
                <div className="flex gap-3">
                  {data.overdue_count > 0 && (
                    <button type="button" onClick={() => selectAll('overdue')} className="font-body text-xs text-status-cancelled hover:underline">
                      Seleccionar vencidos
                    </button>
                  )}
                  <button type="button" onClick={() => selectAll()} className="font-body text-xs text-primary hover:underline">
                    Seleccionar todos
                  </button>
                </div>
              )}
            </div>

            {unpaid.length === 0 ? (
              <p className="font-body text-sm text-muted-foreground">No tienes pedidos pendientes de pago. 🎉</p>
            ) : (
              <div className="bg-card border border-border rounded-lg divide-y divide-border overflow-hidden">
                {unpaid.map((o) => {
                  const due = dueText(o);
                  const checked = selected.includes(o.id);

                  return (
                    <label key={o.id} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-background/40">
                      <input
                        type="checkbox"
                        checked={checked}
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
                        <p className={`font-body text-xs ${due.cls}`}>
                          {due.text}
                          {o.oxxo_reference && (
                            <span className="text-muted-foreground"> · ficha OXXO {o.oxxo_reference}</span>
                          )}
                        </p>
                      </div>
                      <span className="font-mono text-sm text-foreground shrink-0">{money.format(o.amount)}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {history.length > 0 && (
            <details className="bg-card border border-border rounded-lg">
              <summary className="px-4 py-3 font-body text-sm text-foreground cursor-pointer">
                Pagados ({history.length})
              </summary>
              <div className="divide-y divide-border border-t border-border">
                {history.slice(0, 50).map((o) => (
                  <Link key={o.id} to={`/orders/${o.id}`} className="flex items-center justify-between px-4 py-2.5 hover:bg-background/40">
                    <span className="font-body text-xs text-foreground">
                      <span className="font-mono">#{o.id}</span>
                      <span className="text-muted-foreground"> · {dateLabel(o.created_at)}</span>
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">{money.format(o.amount)}</span>
                  </Link>
                ))}
              </div>
            </details>
          )}
        </>
      )}

      {/* Barra de pago: aparece al seleccionar pedidos */}
      {selected.length > 0 && (
        <div className="fixed left-0 right-0 bottom-16 z-40 px-4">
          <div className="max-w-2xl mx-auto bg-card border border-border rounded-2xl p-4 shadow-2xl space-y-3">
            {!showPay ? (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-body text-xs text-muted-foreground">
                    {selected.length} {selected.length === 1 ? 'pedido' : 'pedidos'} seleccionados
                  </p>
                  <p className="font-mono text-lg text-foreground">{money.format(total)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPay(true)}
                  className="bg-primary hover:opacity-90 text-primary-foreground font-body text-sm font-medium px-5 py-2.5 rounded-full transition-opacity glow-fill"
                >
                  Pagar
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-body text-sm text-foreground">
                    Pagar <span className="font-mono font-semibold">{money.format(total)}</span>
                  </p>
                  <button type="button" onClick={() => setShowPay(false)} className="font-body text-xs text-muted-foreground hover:text-foreground">
                    Cancelar
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {([
                    ['card', 'Tarjeta', CreditCard],
                    ['oxxo', 'OXXO', Store],
                  ] as const).map(([value, label, Icon]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setMethod(value);
                        setPayError(null);
                      }}
                      className={`flex items-center justify-center gap-2 py-2 rounded-lg border font-body text-sm transition-colors ${
                        method === value ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground'
                      }`}
                    >
                      <Icon size={15} />
                      {label}
                    </button>
                  ))}
                </div>

                {method === 'card' ? (
                  <CardFields value={card} onChange={setCard} />
                ) : (
                  <p className="font-body text-xs text-muted-foreground">
                    Generamos una referencia para pagar en cualquier OXXO. Los pedidos se marcarán como pagados cuando
                    validemos el depósito.
                  </p>
                )}

                {payError && <p className="font-body text-sm text-status-cancelled">{payError}</p>}

                <button
                  type="button"
                  disabled={paying}
                  onClick={pay}
                  className="w-full bg-primary hover:opacity-90 disabled:opacity-50 text-primary-foreground font-body text-sm font-medium px-4 py-2.5 rounded-full transition-opacity glow-fill"
                >
                  {paying ? 'Procesando...' : method === 'card' ? `Pagar ${money.format(total)}` : 'Generar referencia'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
