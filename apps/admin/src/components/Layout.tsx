import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../lib/auth';
import { Menu, X } from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Pedidos' },
  { to: '/tracking', label: 'Mensajeros en vivo' },
  { to: '/couriers', label: 'Mensajeros' },
  { to: '/clinics', label: 'Clínicas' },
  { to: '/reports', label: 'Reportes' },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = auth.getUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Cierra el sidebar automáticamente al cambiar de ruta (navegación por link)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  async function handleLogout() {
    await auth.logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Overlay — solo visible en móvil cuando el sidebar está abierto */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — offcanvas en móvil, fijo en desktop */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-56 border-r border-border p-4 flex flex-col bg-background
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        <div className="flex items-center justify-between mb-8">
          <img src="/logo.png" alt="Infinity App" className="h-8" />
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-muted-foreground hover:text-foreground"
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`block font-body text-sm px-3 py-2 rounded-lg transition-colors ${
                location.pathname === item.to
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-card'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-border pt-4">
          <p className="font-body text-sm text-muted-foreground mb-2">{user?.name}</p>
          <button
            onClick={handleLogout}
            className="font-body text-sm text-muted-foreground hover:text-status-cancelled transition-colors"
          >
            Cerrar sesión
          </button>
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