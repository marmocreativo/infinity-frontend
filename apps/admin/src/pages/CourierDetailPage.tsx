import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Bike, Car, Truck, Mail, Phone } from 'lucide-react';
import { api } from '../lib/api';
import Avatar from '../components/Avatar';
import ImpersonateButton from '../components/ImpersonateButton';
import OrderStatsPanel, { useAllOrders } from '../components/OrderStatsPanel';

interface Courier {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: 'active' | 'inactive' | 'suspended';
  courier_profile: { vehicle_type: string; is_on_duty: boolean };
}

const vehicleIcons: Record<string, typeof Bike> = { motorcycle: Truck, car: Car, bike: Bike };
const vehicleLabels: Record<string, string> = { motorcycle: 'Motocicleta', car: 'Auto', bike: 'Bicicleta' };

export default function CourierDetailPage() {
  const { id } = useParams();
  const [courier, setCourier] = useState<Courier | null>(null);
  const [loading, setLoading] = useState(true);
  const { orders, loading: ordersLoading } = useAllOrders(`courier_id=${id}`);

  useEffect(() => {
    api
      .get<{ data: Courier[] }>('/admin/users/couriers?per_page=200')
      .then((res) => setCourier(res.data.find((c) => String(c.id) === id) ?? null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6 font-body text-muted-foreground">Cargando...</div>;

  if (!courier) {
    return (
      <div className="p-6 space-y-3">
        <p className="font-body text-muted-foreground">No se encontró al mensajero.</p>
        <Link to="/couriers" className="font-body text-sm text-primary">Volver a mensajeros</Link>
      </div>
    );
  }

  const VehicleIcon = vehicleIcons[courier.courier_profile?.vehicle_type] ?? Truck;
  const onDuty = courier.courier_profile?.is_on_duty;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      <Link to="/couriers" className="inline-flex items-center gap-1.5 font-body text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Mensajeros
      </Link>

      <div className="bg-card border border-border rounded-lg p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <Avatar name={courier.name} size="lg" />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-heading text-xl text-foreground">{courier.name}</h1>
            <span
              className={`font-body text-xs px-2 py-0.5 rounded-full ${
                courier.status === 'active' ? 'bg-status-delivered text-white' : 'bg-status-cancelled text-white'
              }`}
            >
              {courier.status === 'active' ? 'Activo' : 'Suspendido'}
            </span>
            <span className="inline-flex items-center gap-1.5 font-body text-xs text-muted-foreground">
              <span className={`w-1.5 h-1.5 rounded-full ${onDuty ? 'bg-status-delivered' : 'bg-muted-foreground'}`} />
              {onDuty ? 'En turno' : 'Fuera de turno'}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 font-body text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Mail size={13} />{courier.email}</span>
            {courier.phone && <span className="inline-flex items-center gap-1.5"><Phone size={13} />{courier.phone}</span>}
            <span className="inline-flex items-center gap-1.5">
              <VehicleIcon size={13} />
              {vehicleLabels[courier.courier_profile?.vehicle_type] ?? '—'}
            </span>
          </div>
        </div>
        <ImpersonateButton userId={courier.id} disabled={courier.status !== 'active'} />
      </div>

      <OrderStatsPanel orders={orders} loading={ordersLoading} mode="courier" />
    </div>
  );
}
