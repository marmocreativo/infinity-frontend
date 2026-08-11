import { Link } from 'react-router-dom';
import type { Order } from '../types';
import StatusBadge from './StatusBadge';

export default function OrderCard({ order }: { order: Order }) {
  return (
    <Link
      to={`/orders/${order.id}`}
      className="block bg-base-dark border border-base-light/10 rounded-lg p-4 hover:border-primary/50 transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <span className="font-mono text-sm text-base-light/70">Pedido #{order.id}</span>
        <StatusBadge status={order.status} />
      </div>

      <p className="font-body text-sm text-base-light mb-1">
        <span className="text-base-light/50">De:</span> {order.pickup.address}
      </p>
      <p className="font-body text-sm text-base-light">
        <span className="text-base-light/50">A:</span> {order.delivery.address}
      </p>

      {order.courier && (
        <p className="font-body text-xs text-base-light/50 mt-2">
          Mensajero: {order.courier.name}
        </p>
      )}
    </Link>
  );
}
