import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Clinic {
  id: number;
  business_name: string;
  tax_id: string | null;
  default_address: string | null;
  user: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    status: 'active' | 'inactive' | 'suspended';
  };
}

export default function ClinicsPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);

  function loadClinics() {
    setLoading(true);
    api.get<{ data: Clinic[] }>('/admin/users/clinics')
      .then((res) => setClinics(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadClinics();
  }, []);

  async function toggleStatus(clinic: Clinic) {
    const newStatus = clinic.user.status === 'active' ? 'suspended' : 'active';
    await api.patch(`/admin/users/clinics/${clinic.id}/status`, { status: newStatus });
    loadClinics();
  }

  return (
    <div className="p-6">
      <h1 className="font-heading text-xl text-base-light font-semibold mb-6">Clínicas</h1>

      {loading ? (
        <p className="font-body text-base-light/70">Cargando...</p>
      ) : (
        <div className="bg-base-dark border border-base-light/10 rounded-lg overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-base-light/10">
                <th className="font-body text-xs text-base-light/50 font-medium px-4 py-3">Clínica</th>
                <th className="font-body text-xs text-base-light/50 font-medium px-4 py-3">Contacto</th>
                <th className="font-body text-xs text-base-light/50 font-medium px-4 py-3">Email</th>
                <th className="font-body text-xs text-base-light/50 font-medium px-4 py-3">Estado</th>
                <th className="font-body text-xs text-base-light/50 font-medium px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {clinics.map((clinic) => (
                <tr key={clinic.id} className="border-b border-base-light/5 last:border-0">
                  <td className="font-body text-sm text-base-light px-4 py-3">{clinic.business_name}</td>
                  <td className="font-body text-sm text-base-light px-4 py-3">{clinic.user.name}</td>
                  <td className="font-body text-sm text-base-light px-4 py-3">{clinic.user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`font-body text-xs px-2 py-1 rounded-full ${
                      clinic.user.status === 'active' ? 'bg-status-delivered text-white' : 'bg-status-cancelled text-white'
                    }`}>
                      {clinic.user.status === 'active' ? 'Activa' : 'Suspendida'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleStatus(clinic)}
                      className="font-body text-xs text-primary hover:text-primary-light"
                    >
                      {clinic.user.status === 'active' ? 'Suspender' : 'Reactivar'}
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
