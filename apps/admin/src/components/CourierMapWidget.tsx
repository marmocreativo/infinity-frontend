import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../lib/api';
import { createEcho } from '../lib/echo';
import type { CourierOnDuty, Order } from '../types';
import StatusBadge from './StatusBadge';

type LatLng = [number, number];

function escapeHtml(value: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return value.replace(/[&<>"']/g, (c) => map[c]);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

// Se reutiliza el mismo icono mientras no cambie el mensajero o su foto,
// para que no parpadee en cada actualización de ubicación
const courierIconCache = new Map<string, L.DivIcon>();

function courierIcon(name: string, photoUrl?: string | null): L.DivIcon {
  const key = `${name}|${photoUrl ?? ''}`;
  const cached = courierIconCache.get(key);
  if (cached) return cached;

  const initials = escapeHtml(getInitials(name));
  const img = photoUrl
    ? `<img src="${escapeHtml(photoUrl)}" alt="" onerror="this.remove()" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block" />`
    : '';

  // Las iniciales quedan detrás: si la foto no carga, se ven ellas
  const icon = L.divIcon({
    className: '',
    html: `<div style="position:relative;width:44px;height:44px;border-radius:50%;overflow:hidden;background:#38BDF8;border:3px solid #38BDF8;box-shadow:0 2px 6px rgba(0,0,0,0.5);box-sizing:border-box;display:flex;align-items:center;justify-content:center;color:#0b1220;font:600 14px sans-serif">${initials}${img}</div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -24],
  });

  courierIconCache.set(key, icon);
  return icon;
}

const dotStyle = 'border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);border-radius:50%;';

const pickupIcon = L.divIcon({
  className: '',
  html: `<div style="width:16px;height:16px;background:#F59E0B;${dotStyle}"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Recolección de un pedido sin asignar: punto ámbar que pulsa
const pendingPickupIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:20px;height:20px;">
    <span class="animate-ping" style="position:absolute;inset:0;border-radius:50%;background:#F59E0B;opacity:.6"></span>
    <span style="position:absolute;inset:2px;background:#F59E0B;${dotStyle}"></span>
  </div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const deliveryIcon = L.divIcon({
  className: '',
  html: `<div style="width:16px;height:16px;background:#10B981;${dotStyle}"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

interface LocationUpdatePayload {
  courier_id: number;
  shift_id: number;
  lat: string;
  lng: string;
  recorded_at: string;
}

// Rutas ya calculadas (sobreviven a re-renders y recargas de la lista)
const routeCache = new Map<string, LatLng[]>();

async function fetchRoute(from: LatLng, to: LatLng): Promise<LatLng[] | null> {
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`
    );
    const data = await res.json();
    if (data.code !== 'Ok') return null;

    return data.routes[0].geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng] as LatLng
    );
  } catch {
    return null;
  }
}

function FitToOrders({ points, fitKey }: { points: LatLng[]; fitKey: string }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 14 });
    // Solo reajusta cuando cambia el conjunto de pedidos, no en cada refresco
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, map]);

  return null;
}

interface CourierMapWidgetProps {
  orders?: Order[];
}

export default function CourierMapWidget({ orders = [] }: CourierMapWidgetProps) {
  const [couriers, setCouriers] = useState<CourierOnDuty[]>([]);
  const [routes, setRoutes] = useState<Record<number, LatLng[]>>({});
  const echoRef = useRef<ReturnType<typeof createEcho> | null>(null);

  useEffect(() => {
    api.get<{ data: CourierOnDuty[] }>('/admin/couriers/on-duty')
      .then((res) => setCouriers(res.data));

    const echo = createEcho();
    echoRef.current = echo;

    echo.private('admin.courier-tracking')
      .listen('.courier.location.updated', (payload: LocationUpdatePayload) => {
        setCouriers((prev) =>
          prev.map((c) =>
            c.id === payload.courier_id
              ? {
                  ...c,
                  last_location: {
                    lat: payload.lat,
                    lng: payload.lng,
                    recorded_at: payload.recorded_at,
                  },
                }
              : c
          )
        );
      });

    return () => {
      echo.leave('admin.courier-tracking');
      echo.disconnect();
    };
  }, []);

  // Pedidos con coordenadas válidas
  const mapOrders = useMemo(
    () =>
      orders
        .map((o) => ({
          order: o,
          pickup: [Number(o.pickup.lat), Number(o.pickup.lng)] as LatLng,
          delivery: [Number(o.delivery.lat), Number(o.delivery.lng)] as LatLng,
        }))
        .filter(
          (m) => m.pickup.every((n) => Number.isFinite(n)) && m.delivery.every((n) => Number.isFinite(n))
        ),
    [orders]
  );

  // Calcula las rutas de una en una (y con pausa) para no saturar OSRM
  useEffect(() => {
    let cancelled = false;

    async function loadRoutes() {
      for (const m of mapOrders) {
        const key = `${m.pickup.join(',')};${m.delivery.join(',')}`;
        let points = routeCache.get(key);

        if (!points) {
          const fetched = await fetchRoute(m.pickup, m.delivery);
          if (cancelled) return;

          if (fetched) {
            routeCache.set(key, fetched);
            points = fetched;
          } else {
            // Si falla OSRM: línea recta (no se cachea para reintentar después)
            points = [m.pickup, m.delivery];
          }

          await new Promise((resolve) => setTimeout(resolve, 250));
        }

        const resolved = points;
        setRoutes((prev) => (prev[m.order.id] === resolved ? prev : { ...prev, [m.order.id]: resolved }));
      }
    }

    loadRoutes();

    return () => {
      cancelled = true;
    };
  }, [mapOrders]);

  const defaultCenter: LatLng = [19.4326, -99.1332];
  const withLocation = couriers.filter((c) => c.last_location);
  const pendingCount = orders.filter((o) => o.status === 'pending').length;

  const fitPoints = useMemo<LatLng[]>(
    () => mapOrders.flatMap((m) => [m.pickup, m.delivery]),
    [mapOrders]
  );
  const fitKey = mapOrders.map((m) => m.order.id).join(',');

  // Primero las rutas en curso y al final las pendientes, para que queden encima
  const orderedForDraw = [
    ...mapOrders.filter((m) => m.order.status !== 'pending'),
    ...mapOrders.filter((m) => m.order.status === 'pending'),
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="font-body text-sm font-semibold text-foreground">Mensajeros en vivo</h2>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <span className="font-body text-xs font-semibold text-status-enroute">
              {pendingCount} por asignar
            </span>
          )}
          <span className="font-body text-xs text-muted-foreground">
            {withLocation.length === 0 ? 'Sin ubicaciones' : `${withLocation.length} en turno`}
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        <MapContainer center={defaultCenter} zoom={12} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />

          {/* Rutas estimadas */}
          {orderedForDraw.map(({ order }) => {
            const points = routes[order.id];
            if (!points || points.length < 2) return null;
            const isPending = order.status === 'pending';

            return (
              <Polyline
                key={`route-${order.id}`}
                positions={points}
                pathOptions={{
                  color: isPending ? '#F59E0B' : '#38BDF8',
                  weight: isPending ? 6 : 4,
                  opacity: 0.9,
                  dashArray: isPending ? '10 8' : undefined,
                }}
              >
                <Popup>
                  <div className="space-y-1">
                    <strong>Pedido #{order.id}</strong>
                    <div>{order.clinic.business_name}</div>
                    <StatusBadge status={order.status} />
                  </div>
                </Popup>
              </Polyline>
            );
          })}

          {/* Puntos de recolección y entrega */}
          {orderedForDraw.map(({ order, pickup, delivery }) => (
            <span key={`pts-${order.id}`}>
              <Marker
                position={pickup}
                icon={order.status === 'pending' ? pendingPickupIcon : pickupIcon}
                zIndexOffset={order.status === 'pending' ? 500 : 0}
              >
                <Popup>
                  <strong>Recolección · Pedido #{order.id}</strong>
                  <br />
                  {order.pickup.address}
                </Popup>
              </Marker>
              <Marker position={delivery} icon={deliveryIcon}>
                <Popup>
                  <strong>Entrega · Pedido #{order.id}</strong>
                  <br />
                  {order.delivery.address}
                </Popup>
              </Marker>
            </span>
          ))}

          {/* Mensajeros en turno */}
          {withLocation.map((courier) => (
            <Marker
              key={courier.id}
              position={[Number(courier.last_location!.lat), Number(courier.last_location!.lng)]}
              icon={courierIcon(courier.name, courier.photo_url)}
              zIndexOffset={1000}
            >
              <Popup>
                <strong>{courier.name}</strong>
                <br />
                Última actualización: {new Date(courier.last_location!.recorded_at).toLocaleTimeString()}
              </Popup>
            </Marker>
          ))}

          <FitToOrders points={fitPoints} fitKey={fitKey} />
        </MapContainer>

        {/* Leyenda */}
        <div className="absolute bottom-3 left-3 z-[500] bg-card/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2 flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="w-5 border-t-4 border-dashed border-status-enroute shrink-0" />
            <span className="font-body text-xs text-foreground">Sin asignar</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 border-t-4 border-sky-400 shrink-0" />
            <span className="font-body text-xs text-foreground">En curso</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-status-enroute shrink-0" />
            <span className="font-body text-xs text-foreground">Recolección</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-status-delivered shrink-0" />
            <span className="font-body text-xs text-foreground">Entrega</span>
          </div>
        </div>
      </div>
    </div>
  );
}