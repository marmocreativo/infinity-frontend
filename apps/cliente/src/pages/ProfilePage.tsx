import { useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import { auth } from '../lib/auth';
import Avatar from '../components/Avatar';

export default function ProfilePage() {
  const user = auth.getUser();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputClass =
    'w-full bg-card text-foreground font-body px-3 py-2 rounded-lg border border-border focus:border-primary focus:outline-none text-sm';
  const labelClass = 'block font-body text-sm text-foreground mb-1';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await api.put<{ data: typeof user }>('/cliente/profile', { name, phone: phone || null });
      if (res.data) {
        localStorage.setItem('auth_user', JSON.stringify({ ...user, ...res.data }));
      }
      setSuccess(true);
    } catch {
      setError('No se pudo actualizar tu perfil.');
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  return (
    <div className="p-4 max-w-md mx-auto pb-24">
      <div className="flex flex-col items-center mb-8 mt-4">
        <Avatar name={user.name} size="lg" />
        <h1 className="font-heading text-lg text-foreground font-semibold mt-3">
          {user.name}
        </h1>
        <p className="font-body text-sm text-muted-foreground">{user.email}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Nombre completo</label>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div>
          <label className={labelClass}>Correo electrónico</label>
          <input className={inputClass} value={user.email} disabled />
          <p className="font-body text-xs text-muted-foreground mt-1">
            El correo no se puede modificar desde aquí.
          </p>
        </div>

        <div>
          <label className={labelClass}>Teléfono</label>
          <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>

        {error && <p className="font-body text-sm text-status-cancelled">{error}</p>}
        {success && <p className="font-body text-sm text-status-delivered">Perfil actualizado ✓</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:opacity-90 disabled:opacity-50 text-primary-foreground font-body font-medium px-4 py-2 rounded-lg transition-opacity glow-fill"
        >
          {loading ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  );
}