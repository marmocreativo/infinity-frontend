import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useMemo, useState } from 'react';
import type { OrderStatus } from '../types';

type LatLng = [number, number];

interface RouteInfo {
  points: LatLng[];
  distanceKm: number | null;
  durationMin: number | null;
}

interface OrderMapMensajeroProps {
  pickup: { lat: string; lng: string };
  delivery: { lat: string; lng: string };
  status: OrderStatus;
}

const pickupIcon = L.divIcon({
  className: '',
  html: `<div style="width:20px;height:20px;border-radius:50%;background:#F59E0B;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const deliveryIcon = L.divIcon({
  className: '',
  html: `<div style="width:20px;height:20px;border-radius:50%;background:#10B981;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const selfIcon = L.divIcon({
  className: '',
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#4FA8FF;border:3px solid white;box-shadow:0 0 0 4px rgba(79,168,255,0.35)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Puntos por los que debe pasar la ruta según el avance del pedido
function buildWaypoints(
  status: OrderStatus,
  self: LatLng | null,
  pickup: LatLng,
  delivery: LatLng
): LatLng[] {
  const beforePickup = status === 'assigned' || status === 'en_route_pickup';
  const afterPickup = status === 'picked_up' || status === 'en_route_delivery';

  if (beforePickup) return self ? [self, pickup, delivery] : [pickup, delivery];
  if (afterPickup) return self ? [self, delivery] : [pickup, delivery];
  return [pickup, delivery];
}

async function fetchRoute(waypoints: LatLng[]): Promise<RouteInfo | null> {
  if (waypoints.length < 2) return null;

  const coords = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(';');

  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
    );
    const data = await res.json();
    if (data.code !== 'Ok') return null;

    const r = data.routes[0];
    return {
      points: r.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng] as LatLng),
      distanceKm: r.distance / 1000,
      durationMin: r.duration / 60,
    };
  } catch {
    return null;
  }
}

function FitBounds({ points, fitKey }: { points: LatLng[]; fitKey: string }) {
  const map = useMap();

  useEffect(() => {
    if (points.length < 2) return;
    // Más padding abajo porque la card de estado se encima al mapa
    map.fitBounds(L.latLngBounds(points), {
      paddingTopLeft: [40, 40],
      paddingBottomRight: [40, 64],
    });
    // Solo reajusta cuando cambia fitKey, para no pelear con el usuario al mover el mapa
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, map]);

  return null;
}

export default function OrderMapMensajero({ pickup, delivery, status }: OrderMapMensajeroProps) {
  const pickupPos = useMemo<LatLng>(
    () => [Number(pickup.lat), Number(pickup.lng)],
    [pickup.lat, pickup.lng]
  );
  const deliveryPos = useMemo<LatLng>(
    () => [Number(delivery.lat), Number(delivery.lng)],
    [delivery.lat, delivery.lng]
  );

  const [selfPos, setSelfPos] = useState<LatLng | null>(null);
  const [route, setRoute] = useState<RouteInfo | null>(null);

  // Ubicación en vivo del mensajero
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => setSelfPos([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Se recalcula la ruta solo si te moviste ~100 m o cambió el estado del pedido
  const selfKey = selfPos ? `${selfPos[0].toFixed(3)},${selfPos[1].toFixed(3)}` : 'none';

  useEffect(() => {
    let cancelled = false;
    const waypoints = buildWaypoints(status, selfPos, pickupPos, deliveryPos);

    fetchRoute(waypoints).then((info) => {
      if (cancelled) return;
      // Si falla OSRM, se dibuja una línea recta entre los puntos
      setRoute(info ?? { points: waypoints, distanceKm: null, durationMin: null });
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, selfKey, pickupPos, deliveryPos]);

  const fitPoints = useMemo<LatLng[]>(
    () => [pickupPos, deliveryPos, ...(selfPos ? [selfPos] : []), ...(route?.points ?? [])],
    [pickupPos, deliveryPos, selfPos, route]
  );

  const fitKey = `${status}|${selfPos ? 'self' : 'noself'}|${route ? 'route' : 'noroute'}`;

  return (
    <div className="relative z-0 w-full" style={{ aspectRatio: '2 / 3', maxHeight: '55vh' }}>
      <MapContainer
        center={pickupPos}
        zoom={13}
        zoomControl={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        {route && route.points.length > 1 && (
          <Polyline
            positions={route.points}
            pathOptions={{ color: '#38BDF8', weight: 5, opacity: 0.9, dashArray: '8 8' }}
          />
        )}
        <Marker position={pickupPos} icon={pickupIcon} />
        <Marker position={deliveryPos} icon={deliveryIcon} />
        {selfPos && <Marker position={selfPos} icon={selfIcon} />}
        <FitBounds points={fitPoints} fitKey={fitKey} />
      </MapContainer>

      {/* Leyenda arriba a la derecha (abajo la tapa la card de estado) */}
      <div className="absolute top-4 right-4 z-[500] bg-card/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2 flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-status-enroute shrink-0" />
          <span className="font-body text-xs text-foreground">Recolección</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-status-delivered shrink-0" />
          <span className="font-body text-xs text-foreground">Entrega</span>
        </div>
        {selfPos && (
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
            <span className="font-body text-xs text-foreground">Tu ubicación</span>
          </div>
        )}
        {route?.distanceKm != null && route.durationMin != null && (
          <p className="font-mono text-xs text-muted-foreground border-t border-border pt-1.5">
            ≈ {route.distanceKm.toFixed(1)} km · {Math.max(1, Math.round(route.durationMin))} min
          </p>
        )}
      </div>
    </div>
  );
}