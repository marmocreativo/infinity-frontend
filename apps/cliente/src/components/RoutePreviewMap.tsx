import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useMemo } from 'react';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const icon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface Point {
  lat: number;
  lng: number;
}

interface RoutePreviewMapProps {
  pickup: Point;
  delivery: Point;
  route: [number, number][];
}

function FitRoute({ points }: { points: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length < 2) return;
    map.fitBounds(L.latLngBounds(points), { padding: [30, 30] });
  }, [points, map]);

  return null;
}

export default function RoutePreviewMap({ pickup, delivery, route }: RoutePreviewMapProps) {
  const pickupPos: [number, number] = [pickup.lat, pickup.lng];
  const deliveryPos: [number, number] = [delivery.lat, delivery.lng];

  const points = useMemo<[number, number][]>(
    () => (route.length >= 2 ? route : [pickupPos, deliveryPos]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [route, pickup.lat, pickup.lng, delivery.lat, delivery.lng]
  );

  return (
    <div className="rounded-lg overflow-hidden border border-border" style={{ height: '250px' }}>
      <MapContainer center={pickupPos} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <Polyline positions={points} pathOptions={{ color: '#0ea5e9', weight: 5, opacity: 0.9 }} />
        <Marker position={pickupPos} icon={icon}>
          <Tooltip permanent direction="top" offset={[0, -36]}>Recolección</Tooltip>
        </Marker>
        <Marker position={deliveryPos} icon={icon}>
          <Tooltip permanent direction="top" offset={[0, -36]}>Entrega</Tooltip>
        </Marker>
        <FitRoute points={points} />
      </MapContainer>
    </div>
  );
}