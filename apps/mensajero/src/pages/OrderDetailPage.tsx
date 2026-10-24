import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import type { Order, OrderStatus } from '../types';
import StatusBadge from '../components/StatusBadge';
import PhotoCapture from '../components/PhotoCapture';
import OrderMapMensajero from '../components/OrderMapMensajero';
import OrderTimelineMensajero from '../components/OrderTimelineMensajero';
import AddressActions from '../components/AddressActions';
import { useShiftStatus } from '../hooks/useShiftStatus';
import { AlertTriangle, ChevronLeft, Zap } from 'lucide-react';

interface OrderResponse {
  data: Order;
}

const actionConfig: Partial<Record<OrderStatus, { label: string; endpoint: string; needsPhoto: boolean }>> = {
  assigned: { label: 'Iniciar recolección', endpoint: 'start-pickup', needsPhoto: false },
  en_route_pickup: { label: 'Confirmar recolección', endpoint: 'confirm-pickup', needsPhoto: true },
  picked_up: { label: 'Iniciar entrega', endpoint: 'start-delivery', needsPhoto: false },
  en_route_delivery: { label: 'Confirmar entrega', endpoint: 'confirm-delivery', needsPhoto: true },
};

const problemReasons = [
  { value: 'no_recipient', label: 'Nadie recibió el pedido' },
  { value: 'lab_closed', label: 'El laboratorio está cerrado' },
  { value: 'other', label: 'Otro motivo' },
];

const evidenceLabels: Record<string, string> = {
  pickup: 'Recolección',
  delivery: 'Entrega',
  return: 'Retorno',
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { offDuty } = useShiftStatus();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);

  // Reporte de problema en la entrega
  const [showProblem, setShowProblem] = useState(false);
  const [reason, setReason] = useState('no_recipient');
  const [problemNotes, setProblemNotes] = useState('');
  const [problemPhoto, setProblemPhoto] = useState<File | null>(null);
  const [problemError, setProblemError] = useState<string | null>(null);
  const [problemSubmitting, setProblemSubmitting] = useState(false);

  function loadOrder() {
    api.get<OrderResponse>(`/mensajero/orders/${id}`)
      .then((res) => setOrder(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadOrder();
  }, [id]);

  const action = order ? actionConfig[order.status] : undefined;
  const canReportProblem = order?.status === 'picked_up' || order?.status === 'en_route_delivery';
  const deadline = order?.urgent_deadline_at ? new Date(order.urgent_deadline_at) : null;
  const deadlinePassed = deadline ? deadline.getTime() < Date.now() : false;

  async function handleAction() {
    if (!order || !action || offDuty) return;

    if (action.needsPhoto && !photo) {
      setError('Debes tomar una foto de evidencia.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (action.needsPhoto && photo) {
        const formData = new FormData();
        formData.append('photo', photo);
        await api.post(`/mensajero/orders/${order.id}/${action.endpoint}`, formData);
      } else {
        await api.post(`/mensajero/orders/${order.id}/${action.endpoint}`);
      }
      setPhoto(null);
      loadOrder();
    } catch {
      setError('No se pudo completar la acción.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReportProblem() {
    if (!order || offDuty) return;

    if (!problemPhoto) {
      setProblemError('Toma una foto como evidencia del problema.');
      return;
    }
    if (reason === 'other' && !problemNotes.trim()) {
      setProblemError('Describe el motivo del retorno.');
      return;
    }

    setProblemSubmitting(true);
    setProblemError(null);

    try {
      const formData = new FormData();
      formData.append('photo', problemPhoto);
      formData.append('reason', reason);
      if (problemNotes.trim()) formData.append('notes', problemNotes.trim());

      await api.post(`/mensajero/orders/${order.id}/report-problem`, formData);

      setShowProblem(false);
      setProblemPhoto(null);
      setProblemNotes('');
      loadOrder();
    } catch (err) {
      setProblemError(err instanceof ApiError ? err.message : 'No se pudo registrar el problema.');
    } finally {
      setProblemSubmitting(false);
    }
  }

  if (loading) return <p className="p-4 font-body text-muted-foreground">Cargando...</p>;
  if (!order) return null;

  return (
    <div className="pb-24">
      {/* Mapa prominente + botón volver flotante */}
      <div className="relative">
        <button
          onClick={() => navigate('/orders')}
          className="absolute top-4 left-4 z-20 bg-card/90 backdrop-blur-sm rounded-full p-2 border border-border"
        >
          <ChevronLeft size={18} className="text-foreground" />
        </button>
        <OrderMapMensajero
          pickup={order.pickup}
          delivery={order.delivery}
          status={order.status}
        />
      </div>

      <div className="px-4">
        {/* Card encimada al mapa con status + timeline */}
        <div className="bg-card border border-border rounded-t-xl rounded-b-lg p-4 -mt-6 relative z-20 shadow-xl mb-4">
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-sm text-muted-foreground flex items-center gap-2">
              Pedido #{order.id}
              {order.is_urgent && (
                <span className="inline-flex items-center gap-1 bg-status-enroute text-black font-body text-[10px] font-bold px-1.5 py-0.5 rounded">
                  <Zap size={10} /> URGENTE
                </span>
              )}
            </span>
            <StatusBadge status={order.status} />
          </div>
          <OrderTimelineMensajero order={order} />

          {order.is_urgent && deadline && (order.status === 'picked_up' || order.status === 'en_route_delivery') && (
            <p
              className={`font-body text-xs mt-3 text-center font-medium ${
                deadlinePassed ? 'text-status-cancelled' : 'text-status-enroute'
              }`}
            >
              {deadlinePassed ? 'Se pasó la hora límite: ' : 'Entregar antes de las '}
              {deadline.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
          {order.is_urgent && !deadline && order.status !== 'delivered' && order.status !== 'returned' && order.status !== 'cancelled' && (
            <p className="font-body text-xs mt-3 text-center text-status-enroute">
              Urgente: tendrás 2 horas para entregar a partir de la recolección.
            </p>
          )}
        </div>

        {/* Retorno registrado */}
        {order.status === 'returned' && order.return_reason && (
          <div className="bg-status-cancelled/10 border border-status-cancelled/40 rounded-lg p-4 mb-4">
            <p className="font-body text-sm text-foreground font-semibold mb-1">Retorno a remitente</p>
            <p className="font-body text-sm text-muted-foreground">{order.return_reason}</p>
          </div>
        )}

        {/* Acción según el estado actual */}
        {action && (
          <div className="bg-card border border-border rounded-lg p-4 mb-4 space-y-3">
            {offDuty && (
              <div className="flex items-start gap-2 bg-status-enroute/10 border border-status-enroute/40 rounded-lg p-3">
                <AlertTriangle size={16} className="text-status-enroute shrink-0 mt-0.5" />
                <p className="font-body text-xs text-foreground">
                  Tu turno no ha iniciado. Inícialo para poder realizar acciones en este pedido.{' '}
                  <Link to="/shift" className="text-primary font-medium underline">
                    Ir a turno
                  </Link>
                </p>
              </div>
            )}

            {action.needsPhoto && (
              <div className={offDuty ? 'pointer-events-none opacity-50' : ''}>
                <PhotoCapture onCapture={setPhoto} />
              </div>
            )}

            {error && <p className="font-body text-sm text-status-cancelled">{error}</p>}

            <button
              onClick={handleAction}
              disabled={submitting || offDuty}
              className={`w-full font-body font-medium px-4 py-3 rounded-lg transition-opacity ${
                offDuty
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'bg-primary hover:opacity-90 disabled:opacity-50 text-primary-foreground glow-fill'
              }`}
            >
              {submitting ? 'Procesando...' : action.label}
            </button>

            {/* No se pudo entregar */}
            {canReportProblem && !showProblem && (
              <button
                onClick={() => setShowProblem(true)}
                disabled={offDuty}
                className="w-full font-body text-sm text-status-cancelled border border-status-cancelled/40 rounded-lg py-2 hover:bg-status-cancelled/10 transition-colors disabled:opacity-50"
              >
                No pude entregar
              </button>
            )}
          </div>
        )}

        {/* Panel de problema en la entrega */}
        {canReportProblem && showProblem && (
          <div className="bg-card border border-status-cancelled/40 rounded-lg p-4 mb-4 space-y-3">
            <p className="font-body text-sm text-foreground font-semibold">
              Retorno a remitente
            </p>
            <p className="font-body text-xs text-muted-foreground">
              La muestra regresará a la clínica y se le aplicará un cargo adicional. Toma una foto que muestre
              el problema (puerta cerrada, nadie atiende, etc.).
            </p>

            <div className="space-y-2">
              {problemReasons.map((r) => (
                <label
                  key={r.value}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer ${
                    reason === r.value ? 'border-primary bg-primary/10' : 'border-border'
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="accent-primary"
                  />
                  <span className="font-body text-sm text-foreground">{r.label}</span>
                </label>
              ))}
            </div>

            <textarea
              value={problemNotes}
              onChange={(e) => setProblemNotes(e.target.value)}
              rows={2}
              placeholder={reason === 'other' ? 'Describe el motivo (obligatorio)' : 'Notas (opcional)'}
              className="w-full bg-background text-foreground font-body px-3 py-2 rounded-lg border border-border focus:border-primary focus:outline-none text-sm"
            />

            <PhotoCapture onCapture={setProblemPhoto} />

            {problemError && <p className="font-body text-sm text-status-cancelled">{problemError}</p>}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowProblem(false);
                  setProblemError(null);
                }}
                disabled={problemSubmitting}
                className="flex-1 bg-background border border-border text-foreground font-body text-sm py-2 rounded-lg"
              >
                Volver
              </button>
              <button
                onClick={handleReportProblem}
                disabled={problemSubmitting || offDuty}
                className="flex-1 bg-status-cancelled text-white font-body text-sm font-medium py-2 rounded-lg disabled:opacity-50"
              >
                {problemSubmitting ? 'Enviando...' : 'Marcar retorno'}
              </button>
            </div>
          </div>
        )}

        {/* Detalles del pedido */}
        <div className="bg-card border border-border rounded-lg p-4 mb-4 space-y-4">
          <div>
            <p className="font-body text-xs text-muted-foreground mb-1">Clínica</p>
            <p className="font-body text-sm text-foreground">{order.clinic.business_name}</p>
          </div>
          <div>
            <p className="font-body text-xs text-muted-foreground mb-1">Recolección</p>
            <p className="font-body text-sm text-foreground">{order.pickup.address}</p>
            {order.pickup.contact_name && (
              <p className="font-body text-xs text-muted-foreground">
                Contacto: {order.pickup.contact_name} {order.pickup.contact_phone}
              </p>
            )}
            <AddressActions
              address={order.pickup.address}
              lat={order.pickup.lat}
              lng={order.pickup.lng}
              label={`Recolección — Pedido #${order.id}`}
            />
          </div>
          <div>
            <p className="font-body text-xs text-muted-foreground mb-1">Entrega</p>
            <p className="font-body text-sm text-foreground">{order.delivery.address}</p>
            {order.delivery.contact_name && (
              <p className="font-body text-xs text-muted-foreground">
                Contacto: {order.delivery.contact_name} {order.delivery.contact_phone}
              </p>
            )}
            <AddressActions
              address={order.delivery.address}
              lat={order.delivery.lat}
              lng={order.delivery.lng}
              label={`Entrega — Pedido #${order.id}`}
            />
          </div>
          {order.notes && (
            <div>
              <p className="font-body text-xs text-muted-foreground mb-1">Notas</p>
              <p className="font-body text-sm text-foreground">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Evidencias */}
        {(order.status === 'delivered' || order.status === 'returned') &&
          order.evidences &&
          order.evidences.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="font-body text-xs text-muted-foreground mb-3">Evidencias</p>
              <div className="grid grid-cols-2 gap-3">
                {order.evidences.map((ev, i) => (
                  <div key={i}>
                    <img src={ev.photo_url} alt={ev.type} className="rounded-lg w-full h-32 object-cover" />
                    <p className="font-body text-xs text-muted-foreground mt-1">
                      {evidenceLabels[ev.type] ?? ev.type}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}