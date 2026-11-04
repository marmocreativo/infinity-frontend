import { Phone, FileText } from 'lucide-react';
import type { Order } from '../types';

function Contact({ name, phone }: { name?: string | null; phone?: string | null }) {
  if (!name && !phone) {
    return <span className="text-muted-foreground">Sin datos de contacto</span>;
  }

  return (
    <span className="text-foreground">
      {name}
      {phone && (
        <a href={`tel:${phone}`} className="inline-flex items-center gap-1 ml-2 text-primary hover:underline">
          <Phone size={11} />
          {phone}
        </a>
      )}
    </span>
  );
}

function Point({
  label,
  address,
  name,
  phone,
}: {
  label: string;
  address: string;
  name?: string | null;
  phone?: string | null;
}) {
  return (
    <div className="border-l-2 border-border pl-2">
      <p className="font-body text-[11px] text-muted-foreground">{label}</p>
      <p className="font-body text-xs text-foreground">{address}</p>
      <p className="font-body text-xs">
        <Contact name={name} phone={phone} />
      </p>
    </div>
  );
}

/** Datos de contacto completos de un pedido: clínica, recolección, entrega y paradas */
export default function OrderContactInfo({ order }: { order: Order }) {
  const stops = order.stops ?? [];

  return (
    <div className="space-y-2 mt-2">
      <p className="font-body text-xs">
        <span className="text-muted-foreground">Clínica: </span>
        <span className="text-foreground font-medium">{order.clinic.business_name}</span>
        {(order.clinic.contact_name || order.clinic.phone) && (
          <>
            {' · '}
            <Contact name={order.clinic.contact_name} phone={order.clinic.phone} />
          </>
        )}
      </p>

      <Point
        label="Recolección"
        address={order.pickup.address}
        name={order.pickup.contact_name}
        phone={order.pickup.contact_phone}
      />
      {stops
        .filter((s) => s.type === 'pickup')
        .map((s) => (
          <Point
            key={s.id}
            label={`Recolección extra ${s.sequence}`}
            address={s.address}
            name={s.contact_name}
            phone={s.contact_phone}
          />
        ))}

      <Point
        label="Entrega"
        address={order.delivery.address}
        name={order.delivery.contact_name}
        phone={order.delivery.contact_phone}
      />
      {stops
        .filter((s) => s.type === 'delivery')
        .map((s) => (
          <Point
            key={s.id}
            label={`Entrega extra ${s.sequence}`}
            address={s.address}
            name={s.contact_name}
            phone={s.contact_phone}
          />
        ))}

      {order.requires_invoice && (
        <p className="font-body text-xs text-status-enroute font-medium flex items-center gap-1">
          <FileText size={12} /> Requiere factura
        </p>
      )}
      {order.notes && <p className="font-body text-xs text-muted-foreground">Notas: {order.notes}</p>}
    </div>
  );
}
