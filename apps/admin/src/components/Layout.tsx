import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../lib/auth';
import {
  Menu,
  X,
  ClipboardList,
  Radar,
  Bike,
  Building2,
  BarChart3,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import Avatar from './Avatar';

const navItems = [
  { to: '/dashboard', label: 'Pedidos', icon: ClipboardList },
  { to: '/tracking', label: 'Mensajeros en vivo', icon: Radar },
  { to: '/couriers', label: 'Mensajeros', icon: Bike },
  { to: '/clinics', label: 'Clínicas', icon: Building2 },
  { to: '/red-zones', label: 'Zonas rojas', icon: ShieldAlert },
  { to: '/reports', label: 'Reportes', icon: BarChart3 },
];

const COLLAPSED_KEY = 'sidebar_collapsed';

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = auth.getUser();
  const [sidebarOpen, setSidebarOpen] = useState(false); // offcanvas en móvil
  const [collapsed, setCollapsed] = useState(readCollapsed); // colapsado en desktop

  // Cierra el sidebar automáticamente al cambiar de ruta (navegación por link)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
      } catch {
        // sin almacenamiento: solo no se recuerda la preferencia
      }
      return next;
    });
  }

  async function handleLogout() {
    await auth.logout();
    navigate('/login');
  }

  // En móvil el menú siempre se muestra completo; el colapso solo aplica en desktop
  const compact = collapsed;

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Overlay — solo visible en móvil cuando el sidebar está abierto */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — offcanvas en móvil, fijo y colapsable en desktop */}
      <aside
        className={`fixed lg:sticky lg:top-0 lg:h-screen inset-y-0 left-0 z-40 w-60 ${compact ? 'lg:w-[72px]' : 'lg:w-60'}
          border-r border-white/5 py-4 flex flex-col bg-[oklch(0.17_0.006_255)] text-[oklch(0.97_0.003_255)]
          transform transition-all duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        <div className={`flex items-center mb-6 px-4 ${compact ? 'lg:justify-center' : 'justify-between'}`}>
          <img src="/logo.png" alt="Infinity App" className={`h-8 ${compact ? 'lg:hidden' : ''}`} />
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white/60 hover:text-white"
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
          <button
            onClick={toggleCollapsed}
            className="hidden lg:flex text-white/60 hover:text-white"
            aria-label={compact ? 'Expandir menú' : 'Contraer menú'}
            title={compact ? 'Expandir menú' : 'Contraer menú'}
          >
            {compact ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              location.pathname === item.to ||
              (item.to !== '/dashboard' && location.pathname.startsWith(item.to + '/')) ||
              (item.to === '/dashboard' && location.pathname.startsWith('/orders/'));

            return (
              <Link
                key={item.to}
                to={item.to}
                title={compact ? item.label : undefined}
                className={`flex items-center gap-3 font-body text-sm px-3 py-2.5 rounded-lg transition-colors ${
                  compact ? 'lg:justify-center lg:px-0' : ''
                } ${
                  active
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-white/65 hover:bg-white/8 hover:text-white'
                }`}
              >
                <Icon size={18} className="shrink-0" />
                <span className={compact ? 'lg:hidden' : ''}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User badge */}
        <div className="border-t border-white/10 pt-4 px-3">
          <div
            className={`flex items-center gap-3 rounded-xl bg-white/5 p-2.5 ${compact ? 'lg:justify-center lg:p-2' : ''}`}
            title={compact ? `${user?.name ?? ''} · ${user?.email ?? ''}` : undefined}
          >
            <Avatar name={user?.name ?? 'Admin'} size="sm" />
            <div className={`min-w-0 flex-1 ${compact ? 'lg:hidden' : ''}`}>
              <p className="font-body text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="font-body text-xs text-white/50 truncate">{user?.email}</p>
              <span className="inline-flex items-center gap-1 mt-1 font-body text-[10px] font-semibold uppercase tracking-wide text-primary">
                <ShieldCheck size={11} />
                Administrador
              </span>
            </div>
            <button
              onClick={handleLogout}
              className={`text-white/50 hover:text-status-cancelled transition-colors ${compact ? 'lg:hidden' : ''}`}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
          {compact && (
            <button
              onClick={handleLogout}
              className="hidden lg:flex w-full justify-center mt-3 text-white/50 hover:text-status-cancelled transition-colors"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header móvil — solo visible bajo lg, con botón hamburguesa */}
        <header className="lg:hidden flex items-center justify-between border-b border-border px-4 py-3">
          <img src="/logo.png" alt="Infinity App" className="h-7" />
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-foreground"
            aria-label="Abrir menú"
          >
            <Menu size={22} />
          </button>
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
