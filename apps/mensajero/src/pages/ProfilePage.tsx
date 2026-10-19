import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Camera } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { auth } from '../lib/auth';
import type { User } from '../types';
import Avatar from '../components/Avatar';

type VehicleType = 'motorcycle' | 'car' | 'bike';

interface ProfileResponse {
  user: User & { courier_profile?: { vehicle_type: VehicleType } | null };
}

const vehicleLabels: Record<VehicleType, string> = {
  motorcycle: 'Motocicleta',
  car: 'Automóvil',
  bike: 'Bicicleta',
};

// Recorta a cuadrado y reduce a máx. 512px para que la subida sea ligera
async function prepareAvatar(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const side = Math.min(bitmap.width, bitmap.height);
    const out = Math.min(512, side);

    const canvas = document.createElement('canvas');
    canvas.width = out;
    canvas.height = out;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      out,
      out
    );

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85)
    );
    if (!blob) return file;

    return new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

export default function ProfilePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<User | null>(auth.getUser());
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [vehicleType, setVehicleType] = useState<VehicleType>('motorcycle');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputClass =
    'w-full bg-card text-foreground font-body px-3 py-2 rounded-lg border border-border focus:border-primary focus:outline-none text-sm';
  const labelClass = 'block font-body text-sm text-foreground mb-1';

  // Carga datos frescos (incluye tipo de vehículo)
  useEffect(() => {
    api.get<ProfileResponse>('/mensajero/profile')
      .then((res) => {
        setUser(res.user);
        auth.updateStoredUser(res.user);
        setName(res.user.name);
        setPhone(res.user.phone ?? '');
        setVehicleType(res.user.courier_profile?.vehicle_type ?? 'motorcycle');
      })
      .catch(() => {
        // Se usan los datos guardados localmente
      });
  }, []);

  // Libera la URL temporal de la vista previa
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Selecciona un archivo de imagen.');
      return;
    }

    setError(null);
    const prepared = await prepareAvatar(file);
    setPhotoFile(prepared);
    setPreviewUrl(URL.createObjectURL(prepared));
    setRemovePhoto(false);
  }

  function handleRemovePhoto() {
    setPhotoFile(null);
    setPreviewUrl(null);
    setRemovePhoto(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('phone', phone);
      formData.append('vehicle_type', vehicleType);
      if (photoFile) {
        formData.append('photo', photoFile);
      } else if (removePhoto) {
        formData.append('remove_photo', '1');
      }

      const res = await api.post<ProfileResponse>('/mensajero/profile', formData);

      auth.updateStoredUser(res.user);
      setUser(res.user);
      setPhotoFile(null);
      setPreviewUrl(null);
      setRemovePhoto(false);
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) {
        const firstError =
          err.body && typeof err.body === 'object' && 'errors' in err.body
            ? Object.values((err.body as { errors: Record<string, string[]> }).errors)[0]?.[0]
            : null;
        setError(firstError ?? err.message);
      } else {
        setError('No se pudo actualizar tu perfil.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  const shownPhoto = previewUrl ?? (removePhoto ? null : user.photo_url ?? null);
  const hasPhoto = !!shownPhoto;

  return (
    <div className="p-4 max-w-md mx-auto pb-24">
      <h1 className="font-heading text-xl text-foreground font-semibold mb-4">Mi perfil</h1>

      <div className="flex flex-col items-center mb-8 mt-4">
        <div className="relative">
          <Avatar name={name || user.name} photoUrl={shownPhoto} size="xl" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 border-2 border-background glow-fill hover:opacity-90 transition-opacity"
            aria-label="Cambiar foto"
          >
            <Camera size={16} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {hasPhoto && (
          <button
            type="button"
            onClick={handleRemovePhoto}
            className="font-body text-xs text-muted-foreground hover:text-status-cancelled mt-3 transition-colors"
          >
            Quitar foto
          </button>
        )}

        <h2 className="font-heading text-lg text-foreground font-semibold mt-3">{user.name}</h2>
        <p className="font-body text-sm text-muted-foreground">{user.email}</p>
      </div>

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
          <input className={inputClass} value={user.email} disabled />
          <p className="font-body text-xs text-muted-foreground mt-1">
            El correo no se puede modificar desde aquí.
          </p>
        </div>

        <div>
          <label className={labelClass}>Teléfono</label>
          <input
            className={inputClass}
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div>
          <label className={labelClass}>Vehículo</label>
          <select
            className={inputClass}
            value={vehicleType}
            onChange={(e) => setVehicleType(e.target.value as VehicleType)}
          >
            {(Object.keys(vehicleLabels) as VehicleType[]).map((v) => (
              <option key={v} value={v}>
                {vehicleLabels[v]}
              </option>
            ))}
          </select>
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