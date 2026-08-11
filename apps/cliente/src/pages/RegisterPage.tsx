import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import MapPicker from '../components/MapPicker';
import type { LoginResponse } from '../types';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const inputClass =
    'w-full bg-base-dark text-base-light font-body px-3 py-2 rounded-lg border border-base-light/10 focus:border-primary focus:outline-none text-sm';
  const labelClass = 'block font-body text-sm text-base-light mb-1';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
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
    <div className="min-h-screen bg-base-navy flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md">
        <h1 className="font-heading text-2xl text-primary font-semibold mb-1">
          Infinity App
        </h1>
        <p className="font-body text-base-light/70 text-sm mb-8">
          Crea tu cuenta de clínica
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div>
            <label className={labelClass}>Teléfono (opcional)</label>
            <input
              className={inputClass}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <hr className="border-base-light/10" />

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
            <MapPicker onSelect={(lat, lng) => setCoords({ lat, lng })} />
          </div>

          {error && <p className="font-body text-sm text-status-cancelled">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-body font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="font-body text-sm text-base-light/70 mt-6 text-center">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-primary hover:text-primary-light">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
