import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

// Mismos colores que el mapa del mensajero: ámbar = recolección, verde = entrega
const pickupIcon = L.divIcon({
  className: '',
  html: `<div style="width:22px;height:22px;border-radius:50%;background:#F59E0B;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const deliveryIcon = L.divIcon({
  className: '',
  html: `<div style="width:22px;height:22px;border-radius:50%;background:#10B981;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

interface OrderMapFullProps {
  pickup: { lat: string; lng: string };
  delivery: { lat: string; lng: string };
  showRoute?: boolean;
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length < 2) return;
    // Más padding abajo porque la card de estado se encima al mapa
    map.fitBounds(L.latLngBounds(points), {
      paddingTopLeft: [40, 40],
      paddingBottomRight: [40, 64],
    });
  }, [points, map]);

  return null;
}

export default function OrderMapFull({ pickup, delivery, showRoute = false }: OrderMapFullProps) {
  const pickupPos = useMemo<[number, number]>(
    () => [Number(pickup.lat), Number(pickup.lng)],
    [pickup.lat, pickup.lng]
  );
  const deliveryPos = useMemo<[number, number]>(
    () => [Number(delivery.lat), Number(delivery.lng)],
    [delivery.lat, delivery.lng]
  );

  const [route, setRoute] = useState<[number, number][] | null>(null);

  // Ruta estimada: solo cuando el pedido está en tránsito o entregado
  useEffect(() => {
    if (!showRoute) {
      setRoute(null);
      return;
    }

    let cancelled = false;

    api.post<{ data: { route: [number, number][] } }>('/cliente/orders/quote', {
      pickup_lat: pickupPos[0],
      pickup_lng: pickupPos[1],
      delivery_lat: deliveryPos[0],
      delivery_lng: deliveryPos[1],
    })
      .then((res) => {
        if (!cancelled) setRoute(res.data.route);
      })
      .catch(() => {
        // Sin ruta: el mapa sigue mostrando solo los dos puntos
      });

    return () => {
      cancelled = true;
    };
  }, [showRoute, pickupPos, deliveryPos]);

  const fitPoints = useMemo<[number, number][]>(
    () => (route && route.length > 1 ? [pickupPos, deliveryPos, ...route] : [pickupPos, deliveryPos]),
    [route, pickupPos, deliveryPos]
  );

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
        {route && route.length > 1 && (
          <Polyline
            positions={route}
            pathOptions={{ color: '#38BDF8', weight: 5, opacity: 0.9, dashArray: '8 8' }}
          />
        )}
        <Marker position={pickupPos} icon={pickupIcon} />
        <Marker position={deliveryPos} icon={deliveryIcon} />
        <FitBounds points={fitPoints} />
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
      </div>
    </div>
  );
}