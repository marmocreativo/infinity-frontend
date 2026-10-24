import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import { errorMessage } from '../lib/errors';
import { geocodeMexico } from '../lib/geocode';
import Avatar from '../components/Avatar';
import { Mail, Phone, MapPin, FileText, Pencil } from 'lucide-react';

interface Clinic {
  id: number;
  business_name: string;
  tax_id: string | null;
  default_address: string | null;
  default_lat: string | null;
  default_lng: string | null;
  user: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    status: 'active' | 'inactive' | 'suspended';
  };
}

const inputClass =
  'w-full bg-background text-foreground font-body px-3 py-2 rounded-lg border border-border focus:border-primary focus:outline-none text-sm';

const labelClass = 'block font-body text-sm text-foreground mb-1';

function EditClinicForm({
  clinic,
  onCancel,
  onSaved,
}: {
  clinic: Clinic;
  onCancel: () => void;
  onSaved: (updated: Clinic) => void;
}) {
  const [businessName, setBusinessName] = useState(clinic.business_name);
  const [userName, setUserName] = useState(clinic.user.name);
  const [email, setEmail] = useState(clinic.user.email);
  const [phone, setPhone] = useState(clinic.user.phone ?? '');
  const [taxId, setTaxId] = useState(clinic.tax_id ?? '');
  const [address, setAddress] = useState(clinic.default_address ?? '');
  const [lat, setLat] = useState(clinic.default_lat ?? '');
  const [lng, setLng] = useState(clinic.default_lng ?? '');

  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  async function handleLocate() {
    setHint(null);
    setError(null);
    setLocating(true);
    const result = await geocodeMexico(address);
    setLocating(false);

    if (!result) {
      setError('No se encontró esa dirección en México. Prueba con más detalle (calle, colonia y ciudad).');
      return;
    }

    setLat(result.lat.toFixed(7));
    setLng(result.lng.toFixed(7));
    setHint('Coordenadas actualizadas a partir de la dirección.');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const updated = await api.put<Clinic>(`/admin/users/clinics/${clinic.id}`, {
        name: userName,
        email,
        phone: phone || null,
        business_name: businessName,
        tax_id: taxId || null,
        default_address: address || null,
        default_lat: lat === '' ? null : Number(lat),
        default_lng: lng === '' ? null : Number(lng),
      });
      onSaved(updated);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="font-body text-sm font-semibold text-primary">Editar clínica</p>

      <div>
        <label className={labelClass}>Nombre de la clínica</label>
        <input className={inputClass} value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
      </div>
      <div>
        <label className={labelClass}>Nombre del responsable</label>
        <input className={inputClass} value={userName} onChange={(e) => setUserName(e.target.value)} required />
      </div>
      <div>
        <label className={labelClass}>Email</label>
        <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Teléfono</label>
          <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>RFC</label>
          <input className={inputClass} value={taxId} onChange={(e) => setTaxId(e.target.value)} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Dirección</label>
        <input
          className={inputClass}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Calle, número, colonia, ciudad"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Latitud</label>
          <input
            className={inputClass}
            inputMode="decimal"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="19.4326"
          />
        </div>
        <div>
          <label className={labelClass}>Longitud</label>
          <input
            className={inputClass}
            inputMode="decimal"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="-99.1332"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleLocate}
        disabled={locating || !address.trim()}
        className="w-full bg-background border border-primary text-primary font-body text-xs font-medium px-3 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {locating ? 'Buscando...' : 'Ubicar dirección (llenar coordenadas)'}
      </button>
      <p className="font-body text-xs text-muted-foreground">
        Si cambias la dirección, actualiza también las coordenadas: son las que usa la app del cliente para
        prellenar el mapa.
      </p>

      {hint && <p className="font-body text-xs text-status-delivered">{hint}</p>}
      {error && <p className="font-body text-sm text-status-cancelled">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-background border border-border text-foreground font-body text-sm px-3 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-primary hover:opacity-90 disabled:opacity-50 text-primary-foreground font-body text-sm font-medium px-3 py-2 rounded-lg transition-opacity glow-fill"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}

export default function ClinicsPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);

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

  function handleSaved(updated: Clinic) {
    setClinics((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
    setEditingId(null);
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="font-heading text-xl text-foreground font-semibold mb-6">Clínicas</h1>

      {loading ? (
        <p className="font-body text-muted-foreground">Cargando...</p>
      ) : clinics.length === 0 ? (
        <p className="font-body text-muted-foreground">Aún no hay clínicas registradas.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
          {clinics.map((clinic) => (
            <div key={clinic.id} className="bg-card border border-border rounded-lg p-4">
              {editingId === clinic.id ? (
                <EditClinicForm
                  clinic={clinic}
                  onCancel={() => setEditingId(null)}
                  onSaved={handleSaved}
                />
              ) : (
                <>
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

                  <div className="flex items-center justify-end gap-4 pt-3 border-t border-border">
                    <button
                      onClick={() => setEditingId(clinic.id)}
                      className="flex items-center gap-1 font-body text-xs text-primary hover:opacity-80"
                    >
                      <Pencil size={12} />
                      Editar
                    </button>
                    <button
                      onClick={() => toggleStatus(clinic)}
                      className="font-body text-xs text-primary hover:opacity-80"
                    >
                      {clinic.user.status === 'active' ? 'Suspender' : 'Reactivar'}
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}