import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin, FileText } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import Avatar from '../components/Avatar';
import ImpersonateButton from '../components/ImpersonateButton';
import OrderStatsPanel, { useAllOrders } from '../components/OrderStatsPanel';
import CreditPanel from '../components/CreditPanel';

interface Clinic {
  id: number;
  business_name: string;
  tax_id: string | null;
  default_address: string | null;
  trust_red_zone?: boolean;
  user: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    status: 'active' | 'inactive' | 'suspended';
  };
}

export default function ClinicDetailPage() {
  const { id } = useParams();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  const { orders, loading: ordersLoading } = useAllOrders(`clinic_id=${id}`);
  const [savingTrust, setSavingTrust] = useState(false);
  const [trustError, setTrustError] = useState<string | null>(null);

  async function toggleTrust() {
    if (!clinic) return;
    const next = !clinic.trust_red_zone;
    if (
      !window.confirm(
        next
          ? '¿Confiar en esta clínica? Podrá pedir recolecciones aunque su ubicación o el punto de recolección estén en una zona roja.'
          : '¿Volver a aplicar las zonas rojas a esta clínica?'
      )
    )
      return;

    setSavingTrust(true);
    setTrustError(null);
    try {
      await api.patch(`/admin/clinics/${clinic.id}/red-zone-trust`, { trusted: next });
      setClinic({ ...clinic, trust_red_zone: next });
    } catch (err) {
      setTrustError(err instanceof ApiError ? err.message : 'No se pudo guardar el cambio.');
    } finally {
      setSavingTrust(false);
    }
  }

  useEffect(() => {
    api
      .get<{ data: Clinic[] }>('/admin/users/clinics?per_page=200')
      .then((res) => setClinic(res.data.find((c) => String(c.id) === id) ?? null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6 font-body text-muted-foreground">Cargando...</div>;

  if (!clinic) {
    return (
      <div className="p-6 space-y-3">
        <p className="font-body text-muted-foreground">No se encontró la clínica.</p>
        <Link to="/clinics" className="font-body text-sm text-primary">Volver a clínicas</Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      <Link to="/clinics" className="inline-flex items-center gap-1.5 font-body text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Clínicas
      </Link>

      <div className="bg-card border border-border rounded-lg p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <Avatar name={clinic.business_name} size="lg" />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-heading text-xl text-foreground">{clinic.business_name}</h1>
            <span
              className={`font-body text-xs px-2 py-0.5 rounded-full ${
                clinic.user.status === 'active' ? 'bg-status-delivered text-white' : 'bg-status-cancelled text-white'
              }`}
            >
              {clinic.user.status === 'active' ? 'Activa' : 'Suspendida'}
            </span>
          </div>
          <p className="font-body text-sm text-muted-foreground">Contacto: {clinic.user.name}</p>
          <div className="flex flex-wrap gap-x-5 gap-y-1 font-body text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Mail size={13} />{clinic.user.email}</span>
            {clinic.user.phone && <span className="inline-flex items-center gap-1.5"><Phone size={13} />{clinic.user.phone}</span>}
            {clinic.default_address && <span className="inline-flex items-center gap-1.5"><MapPin size={13} />{clinic.default_address}</span>}
            {clinic.tax_id && <span className="inline-flex items-center gap-1.5"><FileText size={13} />{clinic.tax_id}</span>}
          </div>
        </div>
        <ImpersonateButton userId={clinic.user.id} disabled={clinic.user.status !== 'active'} />
      </div>

      <div className="bg-card border border-border rounded-lg p-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-lg text-foreground">Confiar en zona roja</h2>
          <p className="font-body text-xs text-muted-foreground mt-1">
            Quita la limitación de las zonas rojas para esta clínica: podrá pedir recolecciones aunque su ubicación o el
            punto de recolección estén dentro de una.
          </p>
          {trustError && <p className="font-body text-xs text-status-cancelled mt-1">{trustError}</p>}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={Boolean(clinic.trust_red_zone)}
          aria-label="Confiar en zona roja"
          onClick={toggleTrust}
          disabled={savingTrust}
          className={`relative w-11 h-6 rounded-full shrink-0 transition-colors disabled:opacity-50 ${
            clinic.trust_red_zone ? 'bg-primary' : 'bg-border'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
              clinic.trust_red_zone ? 'translate-x-5' : ''
            }`}
          />
        </button>
      </div>

      <CreditPanel clinicId={clinic.id} />

      <OrderStatsPanel orders={orders} loading={ordersLoading} mode="clinic" />
    </div>
  );
}
