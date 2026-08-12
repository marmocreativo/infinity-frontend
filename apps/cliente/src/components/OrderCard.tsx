import { Link } from 'react-router-dom';
import type { Order } from '../types';
import StatusBadge from './StatusBadge';

export default function OrderCard({ order }: { order: Order }) {
  return (
    <Link
      to={`/orders/${order.id}`}
      className="block bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <span className="font-mono text-sm text-muted-foreground">Pedido #{order.id}</span>
        <StatusBadge status={order.status} />
      </div>

      <p className="font-body text-sm text-foreground mb-1">
        <span className="text-muted-foreground">De:</span> {order.pickup.address}
      </p>
      <p className="font-body text-sm text-foreground">
        <span className="text-muted-foreground">A:</span> {order.delivery.address}
      </p>

      {order.courier && (
        <p className="font-body text-xs text-muted-foreground mt-2">
          Mensajero: {order.courier.name}
        </p>
      )}
    </Link>
  );
}