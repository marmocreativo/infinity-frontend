const inputClass =
  'w-full bg-background text-foreground font-body px-3 py-2 rounded-lg border border-border focus:border-primary focus:outline-none text-sm';

export interface CardValues {
  number: string;
  holder: string;
  expiry: string;
  cvc: string;
}

export const emptyCard: CardValues = { number: '', holder: '', expiry: '', cvc: '' };

function luhn(digits: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return digits.length >= 13 && sum % 10 === 0;
}

function formatCardNumber(v: string): string {
  return v.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

function validExpiry(v: string): boolean {
  const m = /^(\d{2})\/(\d{2})$/.exec(v);
  if (!m) return false;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return false;
  return new Date(year, month, 0, 23, 59, 59) >= new Date();
}

/** Devuelve el mensaje del primer error, o null si la tarjeta es válida */
export function validateCard(c: CardValues): string | null {
  if (!luhn(c.number.replace(/\D/g, ''))) return 'El número de tarjeta no es válido.';
  if (c.holder.trim().length < 3) return 'Escribe el nombre como aparece en la tarjeta.';
  if (!validExpiry(c.expiry)) return 'La fecha de vencimiento no es válida.';
  if (!/^\d{3,4}$/.test(c.cvc)) return 'El código de seguridad no es válido.';
  return null;
}

/** Campos de tarjeta. Los datos solo viven en el navegador; nunca se envían al servidor. */
export default function CardFields({ value, onChange }: { value: CardValues; onChange: (v: CardValues) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block font-body text-xs text-muted-foreground mb-1">Número de tarjeta</label>
        <input
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="0000 0000 0000 0000"
          value={value.number}
          onChange={(e) => onChange({ ...value, number: formatCardNumber(e.target.value) })}
          className={`${inputClass} font-mono`}
        />
      </div>
      <div>
        <label className="block font-body text-xs text-muted-foreground mb-1">Nombre en la tarjeta</label>
        <input
          autoComplete="cc-name"
          value={value.holder}
          onChange={(e) => onChange({ ...value, holder: e.target.value })}
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block font-body text-xs text-muted-foreground mb-1">Vencimiento</label>
          <input
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM/AA"
            value={value.expiry}
            onChange={(e) => onChange({ ...value, expiry: formatExpiry(e.target.value) })}
            className={`${inputClass} font-mono`}
          />
        </div>
        <div>
          <label className="block font-body text-xs text-muted-foreground mb-1">CVC</label>
          <input
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="123"
            maxLength={4}
            value={value.cvc}
            onChange={(e) => onChange({ ...value, cvc: e.target.value.replace(/\D/g, '') })}
            className={`${inputClass} font-mono`}
          />
        </div>
      </div>
    </div>
  );
}
