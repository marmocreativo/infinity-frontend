import type { Order } from '../types';

interface OrderTimelineProps {
  order: Order;
}

const STOPS = [
  { key: 'created', label: 'Solicitado' },
  { key: 'picked_up', label: 'Recolectado' },
  { key: 'en_route_delivery', label: 'En tránsito' },
  { key: 'delivered', label: 'Entregado' },
];

function getCurrentStage(order: Order): number {
  const eventTypes = new Set(order.events?.map((e) => e.event_type) ?? []);

  if (eventTypes.has('delivered') || order.status === 'delivered') return 3;
  if (eventTypes.has('en_route_delivery') || order.status === 'en_route_delivery') return 2;
  if (eventTypes.has('picked_up') || order.status === 'picked_up') return 1;
  return 0;
}

export default function OrderTimeline({ order }: OrderTimelineProps) {
  if (order.status === 'cancelled') {
    return (
      <div className="bg-status-cancelled/10 border border-status-cancelled/30 rounded-lg py-3 px-4 text-center">
        <span className="font-body text-sm text-status-cancelled font-medium">Pedido cancelado</span>
      </div>
    );
  }

  if (order.status === 'returned') {
    return (
      <div className="bg-status-cancelled/10 border border-status-cancelled/30 rounded-lg py-3 px-4 text-center">
        <span className="font-body text-sm text-status-cancelled font-medium">Retorno a remitente</span>
      </div>
    );
  }

  const currentStage = getCurrentStage(order);

  return (
    <div className="relative flex justify-between px-1 pt-1">
        <div className="absolute top-[13px] left-6 right-6 h-0.5 bg-border overflow-hidden">
    <div
        className="h-full bg-primary transition-all duration-300"
        style={{ width: `${(currentStage / (STOPS.length - 1)) * 100}%` }}
    />
    </div>

      {STOPS.map((stop, i) => (
        <div key={stop.key} className="relative z-10 flex flex-col items-center gap-1.5 w-16">
          <div
            className={`w-3 h-3 rounded-full border-2 transition-colors ${
              i <= currentStage ? 'bg-primary border-primary' : 'bg-card border-border'
            }`}
          />
          <span
            className={`text-[10px] font-body text-center leading-tight ${
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