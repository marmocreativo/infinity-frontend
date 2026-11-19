import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ChevronLeft, Zap } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import type { Order } from '../types';
import StatusBadge from '../components/StatusBadge';
import OrderContactInfo from '../components/OrderContactInfo';

type LatLng = [number, number];

const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const num = (v: string | number | undefined | null) => Number(v ?? 0);

const eventLabels: Record<string, string> = {
  created: 'Pedido creado',
  assigned: 'Mensajero asignado',
  en_route_pickup: 'Mensajero en camino a recolectar',
  arrived_pickup: 'Mensajero llegó al punto de recolección',
  picked_up: 'Muestra recolectada',
  en_route_delivery: 'Mensajero en camino a entregar',
  delivered: 'Pedido entregado',
  cancelled: 'Pedido cancelado',
  returned: 'Retorno a remitente',
};

const evidenceLabels: Record<string, string> = {
  pickup: 'Recolección',
  delivery: 'Entrega',
  return: 'Retorno',
};

const paymentLabels: Record<string, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  failed: 'Fallido',
};

const dot = (color: string) =>
  L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);border-radius:50%"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

const pickupIcon = dot('#F59E0B');
const deliveryIcon = dot('#10B981');

function Fit({ points }: { points: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 15 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points.map((p) => p.join(',')).join(';'), map]);
  return null;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 font-body text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground text-right">{value}</span>
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [couriers, setCouriers] = useState<{ id: number; name: string; status: string }[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const load = useCallback(() => {
    return api.get<{ data: Order }>(`/admin/orders/${id}`)
      .then((res) => setOrder(res.data))
      .catch(() => setError('No se pudo cargar el pedido.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (order?.status === 'pending' && couriers.length === 0) {
      api.get<{ data: { id: number; name: string; status: string }[] }>('/admin/users/couriers')
        .then((res) => setCouriers(res.data.filter((c) => c.status === 'active')))
        .catch(() => {});
    }
  }, [order?.status, couriers.length]);

  async function handleMarkPaid() {
    if (!window.confirm('¿Confirmas que el pago de este pedido ya fue recibido?')) return;
    setMarkingPaid(true);
    setPayError(null);
    try {
      await api.post(`/admin/orders/${id}/mark-paid`);
      await load();
    } catch (err) {
      setPayError(err instanceof ApiError ? err.message : 'No se pudo marcar como pagado.');
    } finally {
      setMarkingPaid(false);
    }
  }

  async function handleAssign(courierId: number) {
    if (!courierId) return;
    setAssigning(true);
    setAssignError(null);
    try {
      await api.post(`/admin/orders/${id}/assign`, { courier_id: courierId });
      await load();
    } catch (err) {
      setAssignError(err instanceof ApiError ? err.message : 'No se pudo asignar el pedido.');
    } finally {
      setAssigning(false);
    }
  }

  const points = useMemo(() => {
    if (!order) return [];
    const stops = order.stops ?? [];
    const list: { pos: LatLng; label: string; icon: L.DivIcon; address: string }[] = [
      { pos: [Number(order.pickup.lat), Number(order.pickup.lng)], label: 'Recolección', icon: pickupIcon, address: order.pickup.address },
      ...stops.filter((s) => s.type === 'pickup').map((s) => ({
        pos: [Number(s.lat), Number(s.lng)] as LatLng,
        label: `Recolección extra ${s.sequence}`,
        icon: pickupIcon,
        address: s.address,
      })),
      { pos: [Number(order.delivery.lat), Number(order.delivery.lng)], label: 'Entrega', icon: deliveryIcon, address: order.delivery.address },
      ...stops.filter((s) => s.type === 'delivery').map((s) => ({
        pos: [Number(s.lat), Number(s.lng)] as LatLng,
        label: `Entrega extra ${s.sequence}`,
        icon: deliveryIcon,
        address: s.address,
      })),
    ];
    return list.filter((p) => p.pos.every((n) => Number.isFinite(n)));
  }, [order]);

  if (loading) return <p className="p-6 font-body text-muted-foreground">Cargando...</p>;
  if (error) return <p className="p-6 font-body text-status-cancelled">{error}</p>;
  if (!order) return null;

  const deadline = order.urgent_deadline_at ? new Date(order.urgent_deadline_at) : null;
  const evidences = order.evidences ?? [];
  const stops = order.stops ?? [];

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Link
          to="/dashboard"
          className="bg-card border border-border rounded-full p-2 text-foreground hover:bg-background transition-colors"
          aria-label="Volver"
        >
          <ChevronLeft size={16} />
        </Link>
        <h1 className="font-heading text-xl text-foreground font-semibold flex items-center gap-2">
          Pedido #{order.id}
          {order.is_urgent && (
            <span className="inline-flex items-center gap-1 bg-status-enroute text-black font-body text-[10px] font-bold px-1.5 py-0.5 rounded">
              <Zap size={10} /> URGENTE
            </span>
          )}
        </h1>
        <StatusBadge status={order.status} />
        <span className="font-body text-xs text-muted-foreground">
          Creado el {new Date(order.created_at).toLocaleString('es-MX')} · Asignación {order.assignment_type === 'automatic' ? 'automática' : 'manual'}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card border border-border rounded-lg overflow-hidden" style={{ height: '360px' }}>
            <MapContainer center={[19.4326, -99.1332]} zoom={12} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
              {points.length > 1 && (
                <Polyline
                  positions={points.map((p) => p.pos)}
                  pathOptions={{ color: '#FDE047', weight: 3, opacity: 0.8, dashArray: '8 8' }}
                />
              )}
              {points.map((p, i) => (
                <Marker key={i} position={p.pos} icon={p.icon}>
                  <Popup>
                    <strong>{p.label}</strong>
                    <br />
                    {p.address}
                  </Popup>
                </Marker>
              ))}
              <Fit points={points.map((p) => p.pos)} />
            </MapContainer>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="font-body text-sm font-semibold text-foreground">Contacto y recorrido</h2>
            <OrderContactInfo order={order} />
          </div>

          {stops.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-4 space-y-1">
              <h2 className="font-body text-sm font-semibold text-foreground mb-2">Paradas adicionales</h2>
              {stops.map((s) => (
                <Row
                  key={s.id}
                  label={`${s.type === 'pickup' ? 'Recolección' : 'Entrega'} extra ${s.sequence}`}
                  value={s.completed_at ? `✔ ${new Date(s.completed_at).toLocaleString('es-MX')}` : 'Pendiente'}
                />
              ))}
            </div>
          )}

          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="font-body text-sm font-semibold text-foreground mb-3">Evidencia fotográfica</h2>
            {evidences.length === 0 ? (
              <p className="font-body text-sm text-muted-foreground">Aún sin evidencias.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {evidences.map((ev, i) => {
                  const stop = ev.stop_id ? stops.find((s) => s.id === ev.stop_id) : null;
                  return (
                    <a key={i} href={ev.photo_url} target="_blank" rel="noreferrer">
                      <img
                        src={ev.photo_url}
                        alt={ev.type}
                        className="rounded-lg w-full h-32 object-cover bg-background"
                      />
                      <p className="font-body text-xs text-muted-foreground mt-1">
                        {evidenceLabels[ev.type] ?? ev.type}
                        {stop ? ` · parada ${stop.sequence}` : ''}
                        {' · '}
                        {new Date(ev.taken_at).toLocaleString('es-MX')}
                      </p>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Columna lateral */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-4 space-y-2">
            <h2 className="font-body text-sm font-semibold text-foreground mb-1">Mensajero</h2>
            {order.courier ? (
              <p className="font-body text-sm text-foreground">{order.courier.name}</p>
            ) : (
              <p className="font-body text-sm text-muted-foreground">Sin asignar.</p>
            )}
            {order.status === 'pending' && (
              <>
                <select
                  defaultValue=""
                  disabled={assigning}
                  onChange={(e) => handleAssign(Number(e.target.value))}
                  className="w-full bg-card text-foreground font-body text-xs px-2 py-2 rounded border-2 border-status-enroute focus:outline-none"
                >
                  <option value="" disabled>Asignar a...</option>
                  {couriers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {assignError && <p className="font-body text-xs text-status-cancelled">{assignError}</p>}
              </>
            )}
          </div>

          <div className="bg-card border border-border rounded-lg p-4 space-y-2">
            <h2 className="font-body text-sm font-semibold text-foreground mb-1">Pago y tarifa</h2>
            <Row label="Precio" value={money.format(num(order.price))} />
            <Row
              label="Método de pago"
              value={
                ({ card: 'Tarjeta', oxxo: 'OXXO', cash: 'Efectivo', credit: 'Crédito Infinity' } as Record<string, string>)[
                  order.payment_method ?? ''
                ] ?? 'Sin elegir'
              }
            />
            {order.payment_method === 'oxxo' && order.payment_reference && (
              <Row label="Referencia OXXO" value={order.payment_reference} />
            )}
            <Row label="Estado de pago" value={paymentLabels[order.payment_status] ?? order.payment_status} />
            <Row label="Pagado" value={money.format(num(order.amount_paid))} />
            <Row label="Saldo" value={money.format(num(order.amount_due))} />
            {order.payment_status !== 'paid' && order.payment_method !== 'credit' && num(order.price) > 0 && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleMarkPaid}
                  disabled={markingPaid}
                  className="w-full bg-primary hover:opacity-90 disabled:opacity-50 text-primary-foreground font-body text-sm font-medium px-3 py-2 rounded-lg transition-opacity"
                >
                  {markingPaid ? 'Guardando...' : 'Marcar como pagado'}
                </button>
                {payError && <p className="font-body text-xs text-status-cancelled mt-1">{payError}</p>}
              </div>
            )}
            {order.distance_km && <Row label="Distancia" value={`${order.distance_km} km`} />}
            {order.is_urgent && <Row label="Cargo urgente" value={money.format(num(order.urgent_surcharge))} />}
            {order.is_urgent && deadline && (
              <Row
                label="Hora límite"
                value={deadline.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
              />
            )}
            {num(order.cancellation_fee) > 0 && (
              <Row label="Cargo por cancelación" value={money.format(num(order.cancellation_fee))} />
            )}
            {num(order.return_surcharge) > 0 && (
              <Row label="Cargo por retorno" value={money.format(num(order.return_surcharge))} />
            )}
            {num(order.refunded_amount) > 0 && (
              <Row label="Reembolsado" value={money.format(num(order.refunded_amount))} />
            )}
            <Row label="Factura" value={order.requires_invoice ? 'Sí' : 'No'} />
            {order.return_reason && <Row label="Motivo de retorno" value={order.return_reason} />}
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="font-body text-sm font-semibold text-foreground mb-3">Historial</h2>
            {(order.events ?? []).length === 0 ? (
              <p className="font-body text-sm text-muted-foreground">Sin eventos.</p>
            ) : (
              <div className="space-y-2">
                {(order.events ?? []).map((ev, i) => (
                  <div key={i} className="flex items-start justify-between gap-3">
                    <span className="font-body text-sm text-foreground">
                      {eventLabels[ev.event_type] ?? ev.event_type}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground text-right shrink-0">
                      {new Date(ev.created_at).toLocaleString('es-MX')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
