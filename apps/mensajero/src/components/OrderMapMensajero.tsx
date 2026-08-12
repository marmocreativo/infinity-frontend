import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useState } from 'react';

interface OrderMapMensajeroProps {
  pickup: { lat: string; lng: string };
  delivery: { lat: string; lng: string };
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

function FitAllBounds({
  pickup,
  delivery,
  self,
}: {
  pickup: [number, number];
  delivery: [number, number];
  self: [number, number] | null;
}) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = [pickup, delivery];
    if (self) points.push(self);
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [pickup, delivery, self, map]);

  return null;
}

export default function OrderMapMensajero({ pickup, delivery }: OrderMapMensajeroProps) {
  const pickupPos: [number, number] = [Number(pickup.lat), Number(pickup.lng)];
  const deliveryPos: [number, number] = [Number(delivery.lat), Number(delivery.lng)];
  const [selfPos, setSelfPos] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => setSelfPos([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

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
        <Marker position={pickupPos} icon={pickupIcon} />
        <Marker position={deliveryPos} icon={deliveryIcon} />
        {selfPos && <Marker position={selfPos} icon={selfIcon} />}
        <FitAllBounds pickup={pickupPos} delivery={deliveryPos} self={selfPos} />
      </MapContainer>

      <div className="absolute bottom-3 left-3 z-[500] bg-card/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2 flex flex-col gap-1.5">
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
      </div>
    </div>
  );
}