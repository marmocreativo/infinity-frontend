import { useState, type FormEvent } from 'react';
import { CreditCard, Store, Banknote, Lock } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import type { Order } from '../types';
import CardFields, { emptyCard, validateCard, type CardValues } from './CardFields';

const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

type Tab = 'card' | 'oxxo' | 'cash';

const tabs: { value: Tab; label: string; icon: typeof CreditCard }[] = [
  { value: 'card', label: 'Tarjeta', icon: CreditCard },
  { value: 'oxxo', label: 'OXXO', icon: Store },
  { value: 'cash', label: 'Efectivo', icon: Banknote },
];

interface Props {
  order: Order;
  amountDue: number;
  onChanged: () => void;
}

export default function PaymentPanel({ order, amountDue, onChanged }: Props) {
  const initial: Tab = order.payment_method === 'oxxo' || order.payment_method === 'cash' ? order.payment_method : 'card';
  const [tab, setTab] = useState<Tab>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Datos de tarjeta: solo viven en este formulario, nunca se envían al servidor
  const [card, setCard] = useState<CardValues>(emptyCard);

  async function submit(method: Tab) {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/cliente/orders/${order.id}/pay`, { method });
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo procesar el pago.');
    } finally {
      setBusy(false);
    }
  }

  function handleCard(e: FormEvent) {
    e.preventDefault();
    const invalid = validateCard(card);
    if (invalid) return setError(invalid);

    submit('card');
  }

  return (
    <div className="border-t border-border pt-4 space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {tabs.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setTab(value);
              setError(null);
            }}
            className={`flex flex-col items-center gap-1 py-2 rounded-lg border font-body text-xs transition-colors ${
              tab === value ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'card' && (
        <form onSubmit={handleCard} className="space-y-3">
          <CardFields value={card} onChange={setCard} />
          <button
            type="submit"
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:opacity-90 disabled:opacity-50 text-primary-foreground font-body text-sm font-medium px-4 py-2.5 rounded-lg transition-opacity glow-fill"
          >
            <Lock size={14} />
            {busy ? 'Procesando...' : `Pagar ${money.format(amountDue)}`}
          </button>
        </form>
      )}

      {tab === 'oxxo' && (
        <div className="space-y-3">
          {order.payment_method === 'oxxo' && order.payment_reference ? (
            <div className="bg-background border border-border rounded-lg p-4 text-center space-y-2">
              <p className="font-body text-xs text-muted-foreground">Referencia de pago</p>
              <p className="font-mono text-xl tracking-widest text-foreground">
                {order.payment_reference.replace(/(.{4})/g, '$1 ').trim()}
              </p>
              <p className="font-body text-sm text-foreground">
                Monto exacto: <span className="font-mono font-semibold">{money.format(amountDue)}</span>
              </p>
              <p className="font-body text-xs text-muted-foreground">
                Muestra esta referencia en caja de cualquier OXXO. Tu pedido se confirmará cuando validemos el pago.
              </p>
            </div>
          ) : (
            <>
              <p className="font-body text-sm text-muted-foreground">
                Generamos una ficha con una referencia para que pagues en efectivo en cualquier tienda OXXO.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => submit('oxxo')}
                className="w-full bg-primary hover:opacity-90 disabled:opacity-50 text-primary-foreground font-body text-sm font-medium px-4 py-2.5 rounded-lg transition-opacity glow-fill"
              >
                {busy ? 'Generando...' : 'Generar ficha de pago'}
              </button>
            </>
          )}
        </div>
      )}

      {tab === 'cash' && (
        <div className="space-y-3">
          <p className="font-body text-sm text-muted-foreground">
            Pagas <span className="font-mono text-foreground">{money.format(amountDue)}</span> en efectivo al mensajero
            al momento de la entrega. Procura llevar el monto exacto.
          </p>
          {order.payment_method === 'cash' ? (
            <p className="font-body text-sm text-status-delivered font-medium">Pago en efectivo seleccionado ✓</p>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => submit('cash')}
              className="w-full bg-primary hover:opacity-90 disabled:opacity-50 text-primary-foreground font-body text-sm font-medium px-4 py-2.5 rounded-lg transition-opacity glow-fill"
            >
              {busy ? 'Guardando...' : 'Pagaré en efectivo'}
            </button>
          )}
        </div>
      )}

      {error && <p className="font-body text-sm text-status-cancelled">{error}</p>}
    </div>
  );
}
