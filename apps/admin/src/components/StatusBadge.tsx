import type { OrderStatus } from '../types';

const statusConfig: Record<OrderStatus, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-status-pending' },
  assigned: { label: 'Asignado', color: 'bg-status-assigned' },
  en_route_pickup: { label: 'En camino a recolectar', color: 'bg-status-enroute' },
  picked_up: { label: 'Recolectado', color: 'bg-status-enroute' },
  en_route_delivery: { label: 'En camino a entregar', color: 'bg-status-enroute' },
  delivered: { label: 'Entregado', color: 'bg-status-delivered' },
  cancelled: { label: 'Cancelado', color: 'bg-status-cancelled' },
};

export default function StatusBadge({ status }: { status: OrderStatus }) {
  const config = statusConfig[status];

  return (
    <span className={`${config.color} text-white font-body text-xs font-medium px-2 py-1 rounded-full`}>
      {config.label}
    </span>
  );
}
