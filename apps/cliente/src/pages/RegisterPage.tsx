import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import MapPicker from '../components/MapPicker';
import type { LoginResponse } from '../types';

const TOTAL_STEPS = 3;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const inputClass =
    'w-full bg-card text-foreground font-body px-3 py-2 rounded-lg border border-border focus:border-primary focus:outline-none text-sm';
  const labelClass = 'block font-body text-sm text-foreground mb-1';

  // Ubicación actual del dispositivo como default en el mapa
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        // Si el usuario niega el permiso o falla, se queda sin default (centro CDMX en MapPicker)
      }
    );
  }, []);

  function validateStep(): boolean {
    setError(null);
    if (step === 1) {
      if (!name || !email || password.length < 8) {
        setError('Completa nombre, correo y una contraseña de al menos 8 caracteres.');
        return false;
      }
    }
    if (step === 2) {
      if (!businessName) {
        setError('El nombre de la clínica es requerido.');
        return false;
      }
    }
    return true;
  }

  function handleNext() {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function handleBack() {
    setError(null);
    setStep((s) => Math.max(s - 1, 1));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validateStep()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await api.post<LoginResponse>(
        '/auth/register',
        {
          name,
          email,
          password,
          phone: phone || null,
          business_name: businessName,
          tax_id: taxId || null,
          default_address: address || null,
          default_lat: coords?.lat ?? null,
          default_lng: coords?.lng ?? null,
        },
        { auth: false }
      );

      localStorage.setItem('auth_token', res.token);
      localStorage.setItem('auth_user', JSON.stringify(res.user));

      navigate('/orders');
    } catch (err) {
      if (err instanceof ApiError) {
        const firstError = err.body && typeof err.body === 'object' && 'errors' in err.body
          ? Object.values((err.body as { errors: Record<string, string[]> }).errors)[0]?.[0]
          : null;
        setError(firstError ?? err.message);
      } else {
        setError('No se pudo completar el registro.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md flex flex-col items-center">
        <img src="/logo.png" alt="Infinity App" className="w-40 mb-6" />

        <p className="font-body text-muted-foreground text-sm mb-6 text-center">
          Crea tu cuenta de clínica
        </p>

        {/* Indicador de progreso */}
        <div className="w-full flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-primary' : 'bg-border'
              }`}
            />
          ))}
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          {step === 1 && (
            <>
              <h2 className="font-heading text-sm font-semibold text-foreground mb-1">
                Tus datos
              </h2>
              <div>
                <label className={labelClass}>Nombre completo</label>
                <input
                  className={inputClass}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Correo electrónico</label>
                <input
                  type="email"
                  className={inputClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Contraseña</label>
                <input
                  type="password"
                  className={inputClass}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="font-heading text-sm font-semibold text-foreground mb-1">
                Datos de la clínica
              </h2>
              <div>
                <label className={labelClass}>Nombre de la clínica</label>
                <input
                  className={inputClass}
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>RFC (opcional)</label>
                <input
                  className={inputClass}
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Teléfono (opcional)</label>
                <input
                  className={inputClass}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="font-heading text-sm font-semibold text-foreground mb-1">
                Ubicación
              </h2>
              <div>
                <label className={labelClass}>Dirección (opcional)</label>
                <input
                  className={inputClass}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Calle, número, colonia"
                />
              </div>
              <div>
                <label className={labelClass}>Ubicación en el mapa (opcional)</label>
                <MapPicker
                  onSelect={(lat, lng) => setCoords({ lat, lng })}
                  initialLat={coords?.lat}
                  initialLng={coords?.lng}
                />
              </div>
            </>
          )}

          {error && <p className="font-body text-sm text-status-cancelled">{error}</p>}

          <div className="flex gap-3 pt-2">
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 bg-card border border-border hover:opacity-90 text-foreground font-body font-medium px-4 py-2 rounded-lg transition-opacity"
              >
                Atrás
              </button>
            )}

            {step < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 bg-primary hover:opacity-90 text-primary-foreground font-body font-medium px-4 py-2 rounded-lg transition-opacity glow-fill"
              >
                Siguiente
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-primary hover:opacity-90 disabled:opacity-50 text-primary-foreground font-body font-medium px-4 py-2 rounded-lg transition-opacity glow-fill"
              >
                {loading ? 'Creando cuenta...' : 'Crear cuenta'}
              </button>
            )}
          </div>
        </form>

        <p className="font-body text-sm text-muted-foreground mt-6 text-center">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-primary hover:opacity-80">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}