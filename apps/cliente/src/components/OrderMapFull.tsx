import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';

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

interface OrderMapFullProps {
  pickup: { lat: string; lng: string };
  delivery: { lat: string; lng: string };
}

function FitBounds({ pickup, delivery }: OrderMapFullProps) {
  const map = useMap();

  useEffect(() => {
    const bounds = L.latLngBounds(
      [Number(pickup.lat), Number(pickup.lng)],
      [Number(delivery.lat), Number(delivery.lng)]
    );
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [pickup, delivery, map]);

  return null;
}

export default function OrderMapFull({ pickup, delivery }: OrderMapFullProps) {
  const pickupPos: [number, number] = [Number(pickup.lat), Number(pickup.lng)];
  const deliveryPos: [number, number] = [Number(delivery.lat), Number(delivery.lng)];

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
        <Marker position={pickupPos} icon={icon} />
        <Marker position={deliveryPos} icon={icon} />
        <FitBounds pickup={pickup} delivery={delivery} />
      </MapContainer>
    </div>
  );
}