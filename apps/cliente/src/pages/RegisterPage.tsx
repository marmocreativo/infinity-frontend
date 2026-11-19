import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Building2,
  Calendar,
  Camera,
  Check,
  CreditCard,
  Bike,
  Banknote,
  Clock,
  FlaskConical,
  Infinity as InfinityIcon,
  MapPin,
  Navigation,
  Receipt,
  Store,
  TestTube,
  Zap,
} from 'lucide-react';
import { api, ApiError } from '../lib/api';
import MapPicker from '../components/MapPicker';
import OnboardingArt from '../components/OnboardingArt';
import type { LoginResponse } from '../types';

// ---- Pantallas de bienvenida: explican el negocio ----
const intro = [
  {
    title: 'Recolectamos y entregamos tus muestras',
    text: 'Un mensajero pasa por tu clínica, recoge la muestra y la lleva al laboratorio. Tú solo la preparas.',
    main: TestTube,
    satellites: [
      { icon: Building2, color: '#10B981' },
      { icon: FlaskConical, color: '#3B82F6' },
      { icon: MapPin, color: '#EC4899' },
    ],
  },
  {
    title: 'Síguelas en tiempo real',
    text: 'Ve en el mapa dónde va tu pedido, recibe avisos en cada paso y consulta las fotos de recolección y entrega.',
    main: Navigation,
    satellites: [
      { icon: Bike, color: '#10B981' },
      { icon: Bell, color: '#F59E0B' },
      { icon: Camera, color: '#8B5CF6' },
    ],
  },
  {
    title: 'Tarifas claras y horarios',
    text: 'Pagas por distancia, sin sorpresas. Si pides después de la hora límite, tu pedido se programa para el día siguiente. ¿Tienes prisa? Hay entrega urgente.',
    main: Clock,
    satellites: [
      { icon: Zap, color: '#F59E0B' },
      { icon: Calendar, color: '#3B82F6' },
      { icon: Receipt, color: '#10B981' },
    ],
  },
  {
    title: 'Paga como prefieras',
    text: 'Tarjeta, OXXO o efectivo al mensajero. Y si eres cliente de confianza, el Crédito Infinity te deja pagar todo a fin de mes.',
    main: CreditCard,
    satellites: [
      { icon: Store, color: '#EF4444' },
      { icon: Banknote, color: '#10B981' },
      { icon: InfinityIcon, color: '#8B5CF6' },
    ],
  },
];

// ---- Pasos de datos ----
const dataSteps = ['account', 'clinic', 'location', 'review'] as const;
type DataStep = (typeof dataSteps)[number];

const fieldStep: Record<string, DataStep> = {
  name: 'account',
  email: 'account',
  password: 'account',
  phone: 'account',
  business_name: 'clinic',
  tax_id: 'clinic',
  default_address: 'location',
  default_lat: 'location',
  default_lng: 'location',
};

const inputClass =
  'w-full bg-card text-foreground font-body px-3 py-2.5 rounded-lg border border-border focus:border-primary focus:outline-none text-sm';
const labelClass = 'block font-body text-sm text-foreground mb-1';

export default function RegisterPage() {
  const navigate = useNavigate();

  // Posición dentro del flujo: 0..intro.length-1 = bienvenida; después los pasos de datos
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
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

  const total = intro.length + dataSteps.length;
  const inIntro = index < intro.length;
  const dataStep: DataStep | null = inIntro ? null : dataSteps[index - intro.length];

  // Ubicación actual del dispositivo como punto inicial del mapa (solo al llegar a ese paso)
  useEffect(() => {
    if (dataStep !== 'location' || coords || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        // Sin permiso: el mapa abre en el centro de CDMX
      }
    );
  }, [dataStep, coords]);

  function validate(): boolean {
    setError(null);

    if (dataStep === 'account') {
      if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
        setError('Completa tu nombre, un correo válido y una contraseña de al menos 8 caracteres.');
        return false;
      }
    }
    if (dataStep === 'clinic' && !businessName.trim()) {
      setError('El nombre de la clínica es requerido.');
      return false;
    }
    return true;
  }

  function next() {
    if (!validate()) return;
    setIndex((i) => Math.min(i + 1, total - 1));
  }

  function back() {
    setError(null);
    setIndex((i) => Math.max(i - 1, 0));
  }

  function skipIntro() {
    setIndex(intro.length);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (dataStep !== 'review') return next();

    setLoading(true);
    setError(null);

    try {
      const res = await api.post<LoginResponse>(
        '/auth/register',
        {
          name: name.trim(),
          email: email.trim(),
          password,
          phone: phone || null,
          business_name: businessName.trim(),
          tax_id: taxId || null,
          default_address: address || null,
          default_lat: coords?.lat ?? null,
          default_lng: coords?.lng ?? null,
        },
        { auth: false }
      );

      localStorage.setItem('auth_token', res.token);
      localStorage.setItem('auth_user', JSON.stringify(res.user));

      setDone(true);
    } catch (err) {
      if (err instanceof ApiError) {
        const errors =
          err.body && typeof err.body === 'object' && 'errors' in err.body
            ? (err.body as { errors: Record<string, string[]> }).errors
            : null;
        const [field, messages] = errors ? Object.entries(errors)[0] ?? [] : [];

        setError((messages as string[] | undefined)?.[0] ?? err.message);

        // Lleva al paso donde está el campo con error (p. ej. un correo ya registrado)
        const target = field ? fieldStep[field as string] : undefined;
        if (target) setIndex(intro.length + dataSteps.indexOf(target));
      } else {
        setError('No se pudo completar el registro.');
      }
    } finally {
      setLoading(false);
    }
  }

  // ---- Pantalla final ----
  if (done) {
    return (
      <div className="min-h-dvh bg-background flex justify-center">
        <div className="w-full max-w-md min-h-dvh flex flex-col items-center justify-center text-center px-6 animate-in fade-in zoom-in-95 duration-500">
          <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center mb-6">
            <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center glow-fill">
              <Check size={30} className="text-primary-foreground" strokeWidth={3} />
            </div>
          </div>
          <h1 className="font-heading text-2xl text-foreground font-semibold mb-2">
            ¡Bienvenido, {name.trim().split(' ')[0]}!
          </h1>
          <p className="font-body text-sm text-muted-foreground mb-8">
            Tu cuenta de <span className="text-foreground">{businessName}</span> está lista. Ya puedes pedir tu primera
            recolección.
          </p>
          <button
            onClick={() => navigate('/orders/new')}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:opacity-90 text-primary-foreground font-body font-medium px-4 py-3.5 rounded-full transition-opacity glow-fill"
          >
            Hacer mi primer pedido
            <ArrowRight size={18} />
          </button>
          <button
            onClick={() => navigate('/orders')}
            className="mt-4 font-body text-sm text-muted-foreground hover:text-foreground"
          >
            Ir a mis pedidos
          </button>
        </div>
      </div>
    );
  }

  const slide = inIntro ? intro[index] : null;

  return (
    <div className="min-h-dvh bg-background flex justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-md min-h-dvh flex flex-col px-6 pt-5 pb-6">
        {/* Barra superior */}
        <div className="flex items-center justify-between h-10">
          {index > 0 ? (
            <button
              type="button"
              onClick={back}
              aria-label="Atrás"
              className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-foreground hover:bg-card"
            >
              <ArrowLeft size={20} />
            </button>
          ) : (
            <span />
          )}
          {inIntro && (
            <button type="button" onClick={skipIntro} className="font-body text-sm text-muted-foreground hover:text-foreground">
              Omitir
            </button>
          )}
        </div>

        {/* Contenido del paso (se remonta en cada paso para animar la entrada) */}
        <div key={index} className="flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-right-6 duration-300 py-4">
          {slide && (
            <div className="space-y-8">
              <OnboardingArt main={slide.main} satellites={slide.satellites} />
              <div className="text-center space-y-3">
                <h1 className="font-heading text-2xl text-foreground font-semibold leading-tight">{slide.title}</h1>
                <p className="font-body text-sm text-muted-foreground leading-relaxed">{slide.text}</p>
              </div>
            </div>
          )}

          {dataStep === 'account' && (
            <div className="space-y-4">
              <div className="mb-2">
                <h1 className="font-heading text-2xl text-foreground font-semibold">Crea tu cuenta</h1>
                <p className="font-body text-sm text-muted-foreground mt-1">Con estos datos entrarás a la app.</p>
              </div>
              <div>
                <label className={labelClass}>Tu nombre completo</label>
                <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              </div>
              <div>
                <label className={labelClass}>Correo electrónico</label>
                <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </div>
              <div>
                <label className={labelClass}>Contraseña</label>
                <input
                  type="password"
                  className={inputClass}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                />
              </div>
              <div>
                <label className={labelClass}>Teléfono (opcional)</label>
                <input type="tel" className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
              </div>
            </div>
          )}

          {dataStep === 'clinic' && (
            <div className="space-y-4">
              <div className="mb-2">
                <h1 className="font-heading text-2xl text-foreground font-semibold">Tu clínica</h1>
                <p className="font-body text-sm text-muted-foreground mt-1">Así aparecerá en tus pedidos y facturas.</p>
              </div>
              <div>
                <label className={labelClass}>Nombre de la clínica</label>
                <input className={inputClass} value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>RFC (opcional)</label>
                <input className={inputClass} value={taxId} onChange={(e) => setTaxId(e.target.value.toUpperCase())} />
                <p className="font-body text-xs text-muted-foreground mt-1">Lo usamos si pides factura.</p>
              </div>
            </div>
          )}

          {dataStep === 'location' && (
            <div className="space-y-4">
              <div className="mb-2">
                <h1 className="font-heading text-2xl text-foreground font-semibold">¿Dónde recogemos?</h1>
                <p className="font-body text-sm text-muted-foreground mt-1">
                  Guardamos esta dirección para que tus pedidos salgan más rápido. Puedes cambiarla en cada pedido.
                </p>
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
                <label className={labelClass}>Marca el punto en el mapa (opcional)</label>
                <MapPicker
                  onSelect={(lat, lng) => setCoords({ lat, lng })}
                  initialLat={coords?.lat}
                  initialLng={coords?.lng}
                />
              </div>
            </div>
          )}

          {dataStep === 'review' && (
            <div className="space-y-5">
              <div className="mb-2">
                <h1 className="font-heading text-2xl text-foreground font-semibold">Todo listo</h1>
                <p className="font-body text-sm text-muted-foreground mt-1">Revisa tus datos antes de crear la cuenta.</p>
              </div>
              <div className="bg-card border border-border rounded-2xl divide-y divide-border">
                {[
                  { label: 'Nombre', value: name },
                  { label: 'Correo', value: email },
                  { label: 'Teléfono', value: phone || '—' },
                  { label: 'Clínica', value: businessName },
                  { label: 'RFC', value: taxId || '—' },
                  { label: 'Dirección', value: address || (coords ? 'Ubicación marcada en el mapa' : '—') },
                ].map((row) => (
                  <div key={row.label} className="flex items-start justify-between gap-4 px-4 py-3">
                    <span className="font-body text-xs text-muted-foreground shrink-0">{row.label}</span>
                    <span className="font-body text-sm text-foreground text-right break-words min-w-0">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && <p className="font-body text-sm text-status-cancelled mb-3 text-center">{error}</p>}

        {/* Progreso */}
        <div className="flex items-center justify-center gap-1.5 mb-5">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? 'w-6 bg-primary' : i < index ? 'w-1.5 bg-primary/50' : 'w-1.5 bg-border'
              }`}
            />
          ))}
        </div>

        {/* Acción principal */}
        {dataStep === 'review' ? (
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:opacity-90 disabled:opacity-50 text-primary-foreground font-body font-medium px-4 py-3.5 rounded-full transition-opacity glow-fill"
          >
            {loading ? 'Creando cuenta...' : 'Crear mi cuenta'}
            {!loading && <ArrowRight size={18} />}
          </button>
        ) : (
          <button
            type="button"
            onClick={next}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:opacity-90 text-primary-foreground font-body font-medium px-4 py-3.5 rounded-full transition-opacity glow-fill"
          >
            {index === intro.length - 1 ? 'Comenzar' : 'Continuar'}
            <ArrowRight size={18} />
          </button>
        )}

        <p className="font-body text-xs text-muted-foreground mt-4 text-center">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-foreground font-medium hover:text-primary">
            Inicia sesión
          </Link>
        </p>
      </form>
    </div>
  );
}
