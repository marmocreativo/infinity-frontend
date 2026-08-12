import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import Avatar from '../components/Avatar';
import { Mail, Phone, MapPin, FileText } from 'lucide-react';

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
    <div className="p-4 sm:p-6">
      <h1 className="font-heading text-xl text-foreground font-semibold mb-6">Clínicas</h1>

      {loading ? (
        <p className="font-body text-muted-foreground">Cargando...</p>
      ) : clinics.length === 0 ? (
        <p className="font-body text-muted-foreground">Aún no hay clínicas registradas.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clinics.map((clinic) => (
            <div key={clinic.id} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={clinic.business_name} />
                  <div className="min-w-0">
                    <p className="font-body text-sm text-foreground font-medium truncate">
                      {clinic.business_name}
                    </p>
                    <p className="font-body text-xs text-muted-foreground truncate">
                      {clinic.user.name}
                    </p>
                  </div>
                </div>

                <span
                  className={`font-body text-xs px-2 py-1 rounded-full shrink-0 ${
                    clinic.user.status === 'active'
                      ? 'bg-status-delivered text-white'
                      : 'bg-status-cancelled text-white'
                  }`}
                >
                  {clinic.user.status === 'active' ? 'Activa' : 'Suspendida'}
                </span>
              </div>

              <div className="space-y-1.5 mb-3">
                <div className="flex items-center gap-2">
                  <Mail size={13} className="text-muted-foreground shrink-0" />
                  <span className="font-body text-xs text-muted-foreground truncate">{clinic.user.email}</span>
                </div>
                {clinic.user.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={13} className="text-muted-foreground shrink-0" />
                    <span className="font-body text-xs text-muted-foreground">{clinic.user.phone}</span>
                  </div>
                )}
                {clinic.default_address && (
                  <div className="flex items-center gap-2">
                    <MapPin size={13} className="text-muted-foreground shrink-0" />
                    <span className="font-body text-xs text-muted-foreground truncate">{clinic.default_address}</span>
                  </div>
                )}
                {clinic.tax_id && (
                  <div className="flex items-center gap-2">
                    <FileText size={13} className="text-muted-foreground shrink-0" />
                    <span className="font-body text-xs text-muted-foreground">{clinic.tax_id}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-border">
                <button
                  onClick={() => toggleStatus(clinic)}
                  className="font-body text-xs text-primary hover:opacity-80"
                >
                  {clinic.user.status === 'active' ? 'Suspender' : 'Reactivar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}