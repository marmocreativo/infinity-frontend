import type { Order, OrderStatus } from '../types';

interface OrderTimelineMensajeroProps {
  order: Order;
}

const STOPS: { status: OrderStatus; label: string }[] = [
  { status: 'assigned', label: 'Asignado' },
  { status: 'en_route_pickup', label: 'A recolectar' },
  { status: 'picked_up', label: 'Recolectado' },
  { status: 'en_route_delivery', label: 'A entregar' },
  { status: 'delivered', label: 'Entregado' },
];

function getCurrentStageIndex(status: OrderStatus): number {
  const idx = STOPS.findIndex((s) => s.status === status);
  return idx === -1 ? 0 : idx;
}

export default function OrderTimelineMensajero({ order }: OrderTimelineMensajeroProps) {
  if (order.status === 'cancelled') {
    return (
      <div className="bg-status-cancelled/10 border border-status-cancelled/30 rounded-lg py-3 px-4 text-center">
        <span className="font-body text-sm text-status-cancelled font-medium">Pedido cancelado</span>
      </div>
    );
  }

  if (order.status === 'pending') {
    return (
      <div className="bg-status-pending/10 border border-status-pending/30 rounded-lg py-3 px-4 text-center">
        <span className="font-body text-sm text-muted-foreground font-medium">Aún sin asignar</span>
      </div>
    );
  }

  const currentStage = getCurrentStageIndex(order.status);

  return (
    <div className="relative flex justify-between px-1 pt-1">
      <div className="absolute top-[13px] left-5 right-5 h-0.5 bg-border overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${(currentStage / (STOPS.length - 1)) * 100}%` }}
        />
      </div>

      {STOPS.map((stop, i) => (
        <div key={stop.status} className="relative z-10 flex flex-col items-center gap-1.5 w-14">
          <div
            className={`w-3 h-3 rounded-full border-2 transition-colors ${
              i <= currentStage ? 'bg-primary border-primary' : 'bg-card border-border'
            }`}
          />
          <span
            className={`text-[9px] font-body text-center leading-tight ${
              i <= currentStage ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            {stop.label}
          </span>
        </div>
      ))}
    </div>
  );
}