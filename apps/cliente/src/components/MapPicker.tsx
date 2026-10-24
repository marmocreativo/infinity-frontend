import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useState } from 'react';
import { isInMexico, MEXICO_BOUNDS } from '../lib/mexico';

// Fix del ícono default de Leaflet que no carga bien con bundlers como Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const defaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface MapPickerProps {
  onSelect: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
}

function ClickHandler({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Fuerza el recentrado del mapa cuando la posición cambia por fuera de un click
// (ej. cuando llega la geolocalización del dispositivo de forma asíncrona)
function RecenterOnChange({ position }: { position: [number, number] | null }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView(position, map.getZoom());
    }
  }, [position, map]);

  return null;
}

export default function MapPicker({ onSelect, initialLat, initialLng }: MapPickerProps) {
  const defaultCenter: [number, number] = [19.4326, -99.1332]; // CDMX como centro default
  const [position, setPosition] = useState<[number, number] | null>(
    initialLat && initialLng ? [initialLat, initialLng] : null
  );

  // Sincroniza cuando initialLat/initialLng llegan después del montaje
  // (ej. geolocalización del navegador resuelta de forma asíncrona)
  useEffect(() => {
    if (initialLat && initialLng) {
      setPosition([initialLat, initialLng]);
    }
  }, [initialLat, initialLng]);

  function handleSelect(lat: number, lng: number) {
    if (!isInMexico(lat, lng)) return;
    setPosition([lat, lng]);
    onSelect(lat, lng);
  }

  return (
    <div className="rounded-lg overflow-hidden border border-border" style={{ height: '250px' }}>
      <MapContainer
        center={position ?? defaultCenter}
        zoom={13}
        minZoom={5}
        maxBounds={MEXICO_BOUNDS}
        maxBoundsViscosity={1}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <ClickHandler onSelect={handleSelect} />
        <RecenterOnChange position={position} />
        {position && <Marker position={position} icon={defaultIcon} />}
      </MapContainer>
    </div>
  );
}