import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../lib/api';

interface Courier {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: 'active' | 'inactive' | 'suspended';
  courier_profile: { vehicle_type: string; is_on_duty: boolean };
}

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

  const inputClass = 'w-full bg-base-navy text-base-light font-body px-3 py-2 rounded-lg border border-base-light/10 focus:border-primary focus:outline-none text-sm';

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-xl text-base-light font-semibold">Mensajeros</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary hover:bg-primary-dark text-white font-body text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {showForm ? 'Cancelar' : '+ Nuevo mensajero'}
        </button>
      </div>

      {newCredentials && (
        <div className="bg-status-delivered/10 border border-status-delivered rounded-lg p-4 mb-4">
          <p className="font-body text-sm text-base-light font-medium mb-1">
            Mensajero creado. Comparte estas credenciales:
          </p>
          <p className="font-mono text-sm text-base-light">Email: {newCredentials.email}</p>
          <p className="font-mono text-sm text-base-light">Password: {newCredentials.password}</p>
          <button
            onClick={() => setNewCredentials(null)}
            className="font-body text-xs text-base-light/70 hover:text-base-light mt-2"
          >
            Cerrar
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-base-dark border border-base-light/10 rounded-lg p-4 mb-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-body text-sm text-base-light mb-1">Nombre</label>
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="block font-body text-sm text-base-light mb-1">Email</label>
              <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="block font-body text-sm text-base-light mb-1">Teléfono</label>
              <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <label className="block font-body text-sm text-base-light mb-1">Vehículo</label>
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
            className="bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-body text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {creating ? 'Creando...' : 'Crear mensajero'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="font-body text-base-light/70">Cargando...</p>
      ) : (
        <div className="bg-base-dark border border-base-light/10 rounded-lg overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-base-light/10">
                <th className="font-body text-xs text-base-light/50 font-medium px-4 py-3">Nombre</th>
                <th className="font-body text-xs text-base-light/50 font-medium px-4 py-3">Email</th>
                <th className="font-body text-xs text-base-light/50 font-medium px-4 py-3">Vehículo</th>
                <th className="font-body text-xs text-base-light/50 font-medium px-4 py-3">Estado</th>
                <th className="font-body text-xs text-base-light/50 font-medium px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {couriers.map((courier) => (
                <tr key={courier.id} className="border-b border-base-light/5 last:border-0">
                  <td className="font-body text-sm text-base-light px-4 py-3">{courier.name}</td>
                  <td className="font-body text-sm text-base-light px-4 py-3">{courier.email}</td>
                  <td className="font-body text-sm text-base-light px-4 py-3">{courier.courier_profile?.vehicle_type}</td>
                  <td className="px-4 py-3">
                    <span className={`font-body text-xs px-2 py-1 rounded-full ${
                      courier.status === 'active' ? 'bg-status-delivered text-white' : 'bg-status-cancelled text-white'
                    }`}>
                      {courier.status === 'active' ? 'Activo' : 'Suspendido'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleStatus(courier)}
                      className="font-body text-xs text-primary hover:text-primary-light"
                    >
                      {courier.status === 'active' ? 'Suspender' : 'Reactivar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
