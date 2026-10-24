import CourierMapWidget from '../components/CourierMapWidget';
import { useActiveOrders } from '../hooks/useActiveOrders';

export default function TrackingPage() {
  const { orders } = useActiveOrders();

  return (
    <div className="p-6">
      <div className="bg-card border border-border rounded-lg overflow-hidden" style={{ height: '600px' }}>
        <CourierMapWidget orders={orders} />
      </div>
    </div>
  );
}