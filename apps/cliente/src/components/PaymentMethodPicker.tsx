import { CreditCard, Store, Banknote, Infinity as InfinityIcon } from 'lucide-react';

export type PaymentMethod = 'card' | 'oxxo' | 'cash' | 'credit';

export const methodLabels: Record<PaymentMethod, string> = {
  card: 'Tarjeta',
  oxxo: 'OXXO',
  cash: 'Efectivo',
  credit: 'Crédito Infinity',
};

const options: { value: PaymentMethod; icon: typeof CreditCard; hint: string }[] = [
  { value: 'card', icon: CreditCard, hint: 'Débito o crédito' },
  { value: 'oxxo', icon: Store, hint: 'Paga en tienda con una ficha' },
  { value: 'cash', icon: Banknote, hint: 'Al mensajero, al entregar' },
  { value: 'credit', icon: InfinityIcon, hint: 'Se cobra a fin de mes' },
];

interface Props {
  value: PaymentMethod;
  onChange: (m: PaymentMethod) => void;
  creditEnabled: boolean;
}

export default function PaymentMethodPicker({ value, onChange, creditEnabled }: Props) {
  const visible = options.filter((o) => o.value !== 'credit' || creditEnabled);

  return (
    <div className="grid grid-cols-2 gap-2">
      {visible.map(({ value: v, icon: Icon, hint }) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`flex items-start gap-3 text-left p-3 rounded-lg border transition-colors ${
            value === v ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/50'
          }`}
        >
          <Icon size={18} className={value === v ? 'text-primary mt-0.5' : 'text-muted-foreground mt-0.5'} />
          <span className="min-w-0">
            <span className="block font-body text-sm font-semibold text-foreground">{methodLabels[v]}</span>
            <span className="block font-body text-xs text-muted-foreground">{hint}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
