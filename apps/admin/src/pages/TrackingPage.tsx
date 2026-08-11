import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../lib/api';
import { createEcho } from '../lib/echo';
import type { CourierOnDuty } from '../types';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const courierIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface LocationUpdatePayload {
  courier_id: number;
  shift_id: number;
  lat: string;
  lng: string;
  recorded_at: string;
}

export default function TrackingPage() {
  const [couriers, setCouriers] = useState<CourierOnDuty[]>([]);
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

  const defaultCenter: [number, number] = [19.4326, -99.1332];
  const withLocation = couriers.filter((c) => c.last_location);

  return (
    <div className="p-6">
      <h1 className="font-heading text-xl text-base-light font-semibold mb-4">
        Mensajeros en vivo
      </h1>

      <p className="font-body text-sm text-base-light/70 mb-4">
        {withLocation.length === 0
          ? 'No hay mensajeros en turno con ubicación registrada.'
          : `${withLocation.length} mensajero(s) en turno`}
      </p>

      <div className="rounded-lg overflow-hidden border border-base-light/10" style={{ height: '600px' }}>
        <MapContainer center={defaultCenter} zoom={12} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          {withLocation.map((courier) => (
            <Marker
              key={courier.id}
              position={[Number(courier.last_location!.lat), Number(courier.last_location!.lng)]}
              icon={courierIcon}
            >
              <Popup>
                <strong>{courier.name}</strong>
                <br />
                Última actualización: {new Date(courier.last_location!.recorded_at).toLocaleTimeString()}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
