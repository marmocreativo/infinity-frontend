import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import type { Order } from '../types';
import StatusBadge from '../components/StatusBadge';
import OrderTimeline from '../components/OrderTimeline';
import OrderMapFull from '../components/OrderMapFull';
import Avatar from '../components/Avatar';
import { AlertTriangle, ChevronDown, ChevronLeft, Zap } from 'lucide-react';

interface OrderResponse {
  data: Order;
}

const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const num = (v: string | number | undefined | null) => Number(v ?? 0);

const eventLabels: Record<string, string> = {
  created: 'Pedido creado',
  assigned: 'Mensajero asignado',
  en_route_pickup: 'Mensajero en camino a recolectar',
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

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    api.get<OrderResponse>(`/cliente/orders/${id}`)
      .then((res) => setOrder(res.data))
      .catch(() => setError('No se pudo cargar el pedido.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handlePay() {
    setPaying(true);
    setActionError(null);
    try {
      await api.post(`/cliente/orders/${id}/pay`);
      const res = await api.get<OrderResponse>(`/cliente/orders/${id}`);
      setOrder(res.data);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'No se pudo procesar el pago.');
    } finally {
      setPaying(false);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    setActionError(null);
    try {
      const res = await api.post<OrderResponse>(`/cliente/orders/${id}/cancel`);
      setOrder(res.data);
      setConfirmCancel(false);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'No se pudo cancelar el pedido.');
    } finally {
      setCancelling(false);
    }
  }

  if (loading) return <p className="p-4 font-body text-muted-foreground">Cargando...</p>;
  if (error) return <p className="p-4 font-body text-status-cancelled">{error}</p>;
  if (!order) return null;

  const price = num(order.price);
  const amountDue = order.amount_due ?? (order.payment_status === 'paid' ? 0 : price);
  const amountPaid = num(order.amount_paid);
  const refunded = num(order.refunded_amount);
  const cancelFee = num(order.cancel_fee_preview);
  const quoted = num(order.quoted_price);
  const cancelPct = quoted > 0 ? Math.round((cancelFee / quoted) * 100) : 0;
  const refundIfCancelled = Math.max(0, amountPaid - cancelFee);
  const deadline = order.urgent_deadline_at ? new Date(order.urgent_deadline_at) : null;
  const isFinished = order.status === 'cancelled' || order.status === 'returned';

  return (
    <div className="pb-24">
      {/* Mapa prominente + botón volver flotante */}
      <div className="relative">
        <Link
          to="/orders"
          className="absolute top-4 left-4 z-20 bg-card/90 backdrop-blur-sm rounded-full p-2 border border-border"
        >
          <ChevronLeft size={18} className="text-foreground" />
        </Link>
        <OrderMapFull
          pickup={order.pickup}
          delivery={order.delivery}
          showRoute={
            order.status === 'en_route_delivery' ||
            order.status === 'delivered' ||
            order.status === 'returned'
          }
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
          <OrderTimeline order={order} />

          {order.is_urgent && deadline && !isFinished && order.status !== 'delivered' && (
            <p className="font-body text-xs text-status-enroute mt-3 text-center">
              Hora límite de entrega:{' '}
              {deadline.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>

        {/* Retorno a remitente */}
        {order.status === 'returned' && (
          <div className="bg-status-cancelled/10 border border-status-cancelled/40 rounded-lg p-4 mb-4">
            <p className="font-body text-sm text-foreground font-semibold mb-1 flex items-center gap-2">
              <AlertTriangle size={16} className="text-status-cancelled" />
              No se pudo entregar tu pedido
            </p>
            {order.return_reason && (
              <p className="font-body text-sm text-muted-foreground mb-1">{order.return_reason}</p>
            )}
            <p className="font-body text-xs text-muted-foreground">
              La muestra regresará a tu clínica. Se aplicó un cargo adicional de{' '}
              {money.format(num(order.return_surcharge))}.
            </p>
          </div>
        )}

        {/* Datos del mensajero */}
        {order.courier && (
          <div className="bg-card border border-border rounded-lg p-4 mb-4 flex items-center gap-4">
            <Avatar name={order.courier.name} photoUrl={order.courier.photo_url} size="lg" />
            <div className="min-w-0">
              <p className="font-body text-xs text-muted-foreground mb-0.5">
                {order.status === 'delivered' ? 'Entregado por' : 'Tu repartidor'}
              </p>
              <p className="font-heading text-base text-foreground font-semibold truncate">
                {order.courier.name}
              </p>
            </div>
          </div>
        )}

        {/* Detalles del pedido */}
        <div className="bg-card border border-border rounded-lg p-4 mb-4 space-y-3">
          <div>
            <p className="font-body text-xs text-muted-foreground mb-1">Recolección</p>
            <p className="font-body text-sm text-foreground">{order.pickup.address}</p>
          </div>
          <div>
            <p className="font-body text-xs text-muted-foreground mb-1">Entrega</p>
            <p className="font-body text-sm text-foreground">{order.delivery.address}</p>
          </div>
          {order.notes && (
            <div>
              <p className="font-body text-xs text-muted-foreground mb-1">Notas</p>
              <p className="font-body text-sm text-foreground">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Pago */}
        <div className="bg-card border border-border rounded-lg p-4 mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-body text-xs text-muted-foreground mb-1">
                {price === 0 ? 'Cargo' : amountPaid > 0 && amountDue > 0 ? 'Saldo por pagar' : 'Pago'}
              </p>
              <p className="font-mono text-lg text-foreground">
                {price === 0
                  ? 'Sin cargo'
                  : amountDue > 0
                    ? money.format(amountDue)
                    : money.format(price)}
              </p>
            </div>

            {price === 0 ? null : amountDue > 0 ? (
              <button
                onClick={handlePay}
                disabled={paying}
                className="bg-primary hover:opacity-90 disabled:opacity-50 text-primary-foreground font-body text-sm font-medium px-4 py-2 rounded-lg transition-opacity glow-fill"
              >
                {paying ? 'Procesando...' : 'Pagar ahora'}
              </button>
            ) : (
              <span className="text-status-delivered font-body text-sm font-medium">Pagado ✓</span>
            )}
          </div>

          {(order.is_urgent || num(order.cancellation_fee) > 0 || num(order.return_surcharge) > 0 || refunded > 0) && (
            <div className="border-t border-border pt-3 space-y-1">
              {order.is_urgent && (
                <div className="flex justify-between font-body text-xs text-muted-foreground">
                  <span>Incluye cargo urgente</span>
                  <span className="font-mono">{money.format(num(order.urgent_surcharge))}</span>
                </div>
              )}
              {num(order.cancellation_fee) > 0 && (
                <div className="flex justify-between font-body text-xs text-muted-foreground">
                  <span>Cargo por cancelación</span>
                  <span className="font-mono">{money.format(num(order.cancellation_fee))}</span>
                </div>
              )}
              {num(order.return_surcharge) > 0 && (
                <div className="flex justify-between font-body text-xs text-muted-foreground">
                  <span>Cargo por retorno a remitente</span>
                  <span className="font-mono">{money.format(num(order.return_surcharge))}</span>
                </div>
              )}
              {refunded > 0 && (
                <div className="flex justify-between font-body text-xs text-status-delivered">
                  <span>Reembolsado</span>
                  <span className="font-mono">{money.format(refunded)}</span>
                </div>
              )}
            </div>
          )}

          {actionError && <p className="font-body text-sm text-status-cancelled">{actionError}</p>}
        </div>

        {/* Cancelación */}
        {order.can_cancel && (
          <div className="bg-card border border-border rounded-lg p-4 mb-4">
            {!confirmCancel ? (
              <button
                onClick={() => setConfirmCancel(true)}
                className="w-full font-body text-sm text-status-cancelled border border-status-cancelled/40 rounded-lg py-2 hover:bg-status-cancelled/10 transition-colors"
              >
                Cancelar pedido
              </button>
            ) : (
              <div className="space-y-3">
                <p className="font-body text-sm text-foreground font-medium">
                  ¿Cancelar el pedido #{order.id}?
                </p>
                <p className="font-body text-xs text-muted-foreground">
                  {cancelFee === 0
                    ? 'Como aún no tiene mensajero asignado, no se te cobrará nada.'
                    : `Como ya tiene mensajero asignado, se cobrará ${money.format(cancelFee)} (${cancelPct}% del servicio).`}
                  {amountPaid > 0 && refundIfCancelled > 0 &&
                    ` Se te reembolsarán ${money.format(refundIfCancelled)}.`}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmCancel(false)}
                    disabled={cancelling}
                    className="flex-1 bg-background border border-border text-foreground font-body text-sm py-2 rounded-lg"
                  >
                    No, conservar
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="flex-1 bg-status-cancelled text-white font-body text-sm font-medium py-2 rounded-lg disabled:opacity-50"
                  >
                    {cancelling ? 'Cancelando...' : 'Sí, cancelar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Evidencia fotográfica */}
        {order.evidences && order.evidences.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-4 mb-4">
            <p className="font-body text-xs text-muted-foreground mb-3">Evidencia fotográfica</p>
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

        {/* Historial colapsable */}
        {order.events && order.events.length > 0 && (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setHistoryOpen((o) => !o)}
              className="w-full flex items-center justify-between p-4"
            >
              <span className="font-body text-xs text-muted-foreground">Historial</span>
              <ChevronDown
                size={16}
                className={`text-muted-foreground transition-transform ${historyOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {historyOpen && (
              <div className="px-4 pb-4 space-y-2">
                {order.events.map((event, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="font-body text-sm text-foreground">
                      {eventLabels[event.event_type] ?? event.event_type}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {new Date(event.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}