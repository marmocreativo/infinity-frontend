import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, CircleMarker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Eye, EyeOff, Pencil, Trash2, Undo2, X } from 'lucide-react';
import { api, ApiError } from '../lib/api';

type LatLng = [number, number];

interface RedZone {
  id: number;
  name: string;
  polygon: LatLng[];
  is_active: boolean;
}

const inputClass =
  'w-full bg-background text-foreground font-body px-3 py-2 rounded-lg border border-border focus:border-primary focus:outline-none text-sm';

function DrawLayer({ drawing, onPoint }: { drawing: boolean; onPoint: (p: LatLng) => void }) {
  useMapEvents({
    click(e) {
      if (drawing) onPoint([Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6))]);
    },
  });

  // Cursor de cruz mientras se dibuja
  const map = useMap();
  useEffect(() => {
    map.getContainer().style.cursor = drawing ? 'crosshair' : '';
  }, [drawing, map]);

  return null;
}

function FitTo({ points, fitKey }: { points: LatLng[]; fitKey: string }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    map.fitBounds(L.latLngBounds(points), { padding: [50, 50], maxZoom: 15 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, map]);

  return null;
}

export default function RedZonesPage() {
  const [zones, setZones] = useState<RedZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [drawing, setDrawing] = useState(false);
  const [points, setPoints] = useState<LatLng[]>([]);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [focusId, setFocusId] = useState<number | null>(null);

  function load() {
    api.get<{ data: RedZone[] }>('/admin/red-zones')
      .then((res) => setZones(res.data))
      .catch(() => setError('No se pudieron cargar las zonas.'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function startDrawing() {
    setDrawing(true);
    setPoints([]);
    setName('');
    setFocusId(null);
    setError(null);
  }

  function cancelDrawing() {
    setDrawing(false);
    setPoints([]);
    setName('');
  }

  async function save() {
    if (points.length < 3) return setError('Marca al menos 3 puntos para cerrar la zona.');
    if (!name.trim()) return setError('Ponle un nombre a la zona.');

    setSaving(true);
    setError(null);
    try {
      await api.post('/admin/red-zones', { name: name.trim(), polygon: points, is_active: true });
      cancelDrawing();
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar la zona.');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(zone: RedZone) {
    await api.put(`/admin/red-zones/${zone.id}`, { is_active: !zone.is_active });
    load();
  }

  async function rename(zone: RedZone) {
    const next = window.prompt('Nuevo nombre de la zona', zone.name);
    if (!next || !next.trim() || next.trim() === zone.name) return;
    await api.put(`/admin/red-zones/${zone.id}`, { name: next.trim() });
    load();
  }

  async function remove(zone: RedZone) {
    if (!window.confirm(`¿Eliminar la zona "${zone.name}"? Los pedidos en esa área volverán a permitirse.`)) return;
    await api.delete(`/admin/red-zones/${zone.id}`);
    if (focusId === zone.id) setFocusId(null);
    load();
  }

  const focused = zones.find((z) => z.id === focusId) ?? null;
  const allPoints = useMemo(() => zones.flatMap((z) => z.polygon), [zones]);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-heading text-xl text-foreground font-semibold">Zonas rojas</h1>
          <p className="font-body text-xs text-muted-foreground mt-1">
            Áreas donde no se permite pedir recolección. Las clínicas marcadas como "Confiar en zona roja" no tienen
            esta limitación.
          </p>
        </div>
        {!drawing && (
          <button
            onClick={startDrawing}
            className="bg-primary hover:opacity-90 text-primary-foreground font-body text-sm font-medium px-4 py-2 rounded-lg transition-opacity"
          >
            Dibujar zona
          </button>
        )}
      </div>

      {drawing && (
        <div className="bg-card border border-status-cancelled/60 rounded-lg p-4 space-y-3">
          <p className="font-body text-sm text-foreground">
            Haz clic en el mapa para marcar las esquinas de la zona. Necesitas al menos 3 puntos.
            <span className="text-muted-foreground"> Llevas {points.length}.</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              className={inputClass}
              placeholder="Nombre de la zona (p. ej. Tepito)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setPoints((p) => p.slice(0, -1))}
                disabled={points.length === 0}
                className="flex items-center gap-1 border border-border text-foreground font-body text-sm px-3 py-2 rounded-lg disabled:opacity-40"
              >
                <Undo2 size={14} /> Deshacer
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="bg-status-cancelled text-white font-body text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar zona'}
              </button>
              <button onClick={cancelDrawing} className="flex items-center gap-1 text-muted-foreground font-body text-sm px-2">
                <X size={14} /> Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <p className="font-body text-sm text-status-cancelled">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-lg overflow-hidden" style={{ height: '620px' }}>
          <MapContainer center={[19.4326, -99.1332]} zoom={11} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            <DrawLayer drawing={drawing} onPoint={(p) => setPoints((prev) => [...prev, p])} />

            {zones.map((z) => (
              <Polygon
                key={z.id}
                positions={z.polygon}
                pathOptions={{
                  color: z.is_active ? '#EF4444' : '#9CA3AF',
                  fillColor: z.is_active ? '#EF4444' : '#9CA3AF',
                  fillOpacity: focusId === z.id ? 0.5 : 0.28,
                  weight: focusId === z.id ? 4 : 2,
                  dashArray: z.is_active ? undefined : '6 6',
                }}
                eventHandlers={{ click: () => !drawing && setFocusId(z.id) }}
              />
            ))}

            {/* Zona en dibujo */}
            {drawing && points.length >= 3 && (
              <Polygon positions={points} pathOptions={{ color: '#FDE047', fillColor: '#FDE047', fillOpacity: 0.25, weight: 3 }} />
            )}
            {drawing && points.length === 2 && (
              <Polyline positions={points} pathOptions={{ color: '#FDE047', weight: 3 }} />
            )}
            {drawing &&
              points.map((p, i) => (
                <CircleMarker key={i} center={p} radius={5} pathOptions={{ color: '#FDE047', fillColor: '#111827', fillOpacity: 1 }} />
              ))}

            <FitTo
              points={focused ? focused.polygon : allPoints}
              fitKey={focused ? `z-${focused.id}` : `all-${zones.length}`}
            />
          </MapContainer>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden flex flex-col" style={{ maxHeight: '620px' }}>
          <h2 className="font-body text-sm font-semibold text-foreground p-4 border-b border-border">
            Zonas ({zones.length})
          </h2>
          <div className="overflow-y-auto divide-y divide-border">
            {loading ? (
              <p className="font-body text-sm text-muted-foreground p-4">Cargando...</p>
            ) : zones.length === 0 ? (
              <p className="font-body text-sm text-muted-foreground p-4">
                Aún no hay zonas rojas. Pulsa "Dibujar zona" para crear la primera.
              </p>
            ) : (
              zones.map((z) => (
                <div
                  key={z.id}
                  className={`px-4 py-3 space-y-2 ${focusId === z.id ? 'bg-status-cancelled/10' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => setFocusId(focusId === z.id ? null : z.id)}
                    className="w-full text-left"
                  >
                    <p className="font-body text-sm text-foreground font-medium">{z.name}</p>
                    <p className="font-body text-xs text-muted-foreground">
                      {z.polygon.length} puntos · {z.is_active ? 'Activa' : 'Desactivada'}
                    </p>
                  </button>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => toggle(z)}
                      className="flex items-center gap-1 font-body text-xs text-primary hover:opacity-80"
                    >
                      {z.is_active ? <EyeOff size={12} /> : <Eye size={12} />}
                      {z.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                    <button onClick={() => rename(z)} className="flex items-center gap-1 font-body text-xs text-primary hover:opacity-80">
                      <Pencil size={12} /> Renombrar
                    </button>
                    <button onClick={() => remove(z)} className="flex items-center gap-1 font-body text-xs text-status-cancelled hover:opacity-80">
                      <Trash2 size={12} /> Eliminar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
