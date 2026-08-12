import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import Avatar from '../components/Avatar';
import { Bike, Car, Truck, Phone, Mail } from 'lucide-react';

interface Courier {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: 'active' | 'inactive' | 'suspended';
  courier_profile: { vehicle_type: string; is_on_duty: boolean };
}

const vehicleIcons: Record<string, typeof Bike> = {
  motorcycle: Truck,
  car: Car,
  bike: Bike,
};

const vehicleLabels: Record<string, string> = {
  motorcycle: 'Motocicleta',
  car: 'Auto',
  bike: 'Bicicleta',
};

export default function CouriersPage() {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCredentials, setNewCredentials] = useState<{ email: string; password: string } | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleType, setVehicleType] = useState('motorcycle');

  function loadCouriers() {
    setLoading(true);
    api.get<{ data: Courier[] }>('/admin/users/couriers')
      .then((res) => setCouriers(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadCouriers();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await api.post<{ credentials: { email: string; password: string } }>('/admin/users/couriers', {
        name,
        email,
        phone: phone || null,
        vehicle_type: vehicleType,
      });
      setNewCredentials(res.credentials);
      setName('');
      setEmail('');
      setPhone('');
      setShowForm(false);
      loadCouriers();
    } finally {
      setCreating(false);
    }
  }

  async function toggleStatus(courier: Courier) {
    const newStatus = courier.status === 'active' ? 'suspended' : 'active';
    await api.patch(`/admin/users/couriers/${courier.id}/status`, { status: newStatus });
    loadCouriers();
  }

  const inputClass =
    'w-full bg-background text-foreground font-body px-3 py-2 rounded-lg border border-border focus:border-primary focus:outline-none text-sm';

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-xl text-foreground font-semibold">Mensajeros</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary hover:opacity-90 text-primary-foreground font-body text-sm font-medium px-4 py-2 rounded-lg transition-opacity glow-fill"
        >
          {showForm ? 'Cancelar' : '+ Nuevo mensajero'}
        </button>
      </div>

      {newCredentials && (
        <div className="bg-status-delivered/10 border border-status-delivered rounded-lg p-4 mb-6">
          <p className="font-body text-sm text-foreground font-medium mb-1">
            Mensajero creado. Comparte estas credenciales:
          </p>
          <p className="font-mono text-sm text-foreground">Email: {newCredentials.email}</p>
          <p className="font-mono text-sm text-foreground">Password: {newCredentials.password}</p>
          <button
            onClick={() => setNewCredentials(null)}
            className="font-body text-xs text-muted-foreground hover:text-foreground mt-2"
          >
            Cerrar
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-card border border-border rounded-lg p-4 mb-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-body text-sm text-foreground mb-1">Nombre</label>
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="block font-body text-sm text-foreground mb-1">Email</label>
              <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="block font-body text-sm text-foreground mb-1">Teléfono</label>
              <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <label className="block font-body text-sm text-foreground mb-1">Vehículo</label>
              <select className={inputClass} value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
                <option value="motorcycle">Motocicleta</option>
                <option value="car">Auto</option>
                <option value="bike">Bicicleta</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={creating}
            className="bg-primary hover:opacity-90 disabled:opacity-50 text-primary-foreground font-body text-sm font-medium px-4 py-2 rounded-lg transition-opacity glow-fill"
          >
            {creating ? 'Creando...' : 'Crear mensajero'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="font-body text-muted-foreground">Cargando...</p>
      ) : couriers.length === 0 ? (
        <p className="font-body text-muted-foreground">Aún no hay mensajeros registrados.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {couriers.map((courier) => {
            const VehicleIcon = vehicleIcons[courier.courier_profile?.vehicle_type] ?? Truck;
            const isOnDuty = courier.courier_profile?.is_on_duty;

            return (
              <div key={courier.id} className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={courier.name} />
                    <div className="min-w-0">
                      <p className="font-body text-sm text-foreground font-medium truncate">{courier.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <VehicleIcon size={12} className="text-muted-foreground shrink-0" />
                        <span className="font-body text-xs text-muted-foreground">
                          {vehicleLabels[courier.courier_profile?.vehicle_type] ?? '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`font-body text-xs px-2 py-1 rounded-full shrink-0 ${
                      courier.status === 'active'
                        ? 'bg-status-delivered text-white'
                        : 'bg-status-cancelled text-white'
                    }`}
                  >
                    {courier.status === 'active' ? 'Activo' : 'Suspendido'}
                  </span>
                </div>

                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-2">
                    <Mail size={13} className="text-muted-foreground shrink-0" />
                    <span className="font-body text-xs text-muted-foreground truncate">{courier.email}</span>
                  </div>
                  {courier.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={13} className="text-muted-foreground shrink-0" />
                      <span className="font-body text-xs text-muted-foreground">{courier.phone}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${isOnDuty ? 'bg-status-delivered' : 'bg-muted-foreground'}`} />
                    <span className="font-body text-xs text-muted-foreground">
                      {isOnDuty ? 'En turno' : 'Fuera de turno'}
                    </span>
                  </div>

                  <button
                    onClick={() => toggleStatus(courier)}
                    className="font-body text-xs text-primary hover:opacity-80"
                  >
                    {courier.status === 'active' ? 'Suspender' : 'Reactivar'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}