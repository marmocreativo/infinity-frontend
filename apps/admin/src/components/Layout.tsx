import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../lib/auth';

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

  async function handleLogout() {
    await auth.logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-base-navy text-base-light flex">
      <aside className="w-56 border-r border-base-light/10 p-4 flex flex-col">
        <h1 className="font-heading text-lg text-primary font-semibold mb-8">
          Infinity App
        </h1>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`block font-body text-sm px-3 py-2 rounded-lg transition-colors ${
                location.pathname === item.to
                  ? 'bg-primary text-white'
                  : 'text-base-light/70 hover:bg-base-dark'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-base-light/10 pt-4">
          <p className="font-body text-sm text-base-light/70 mb-2">{user?.name}</p>
          <button
            onClick={handleLogout}
            className="font-body text-sm text-base-light/70 hover:text-status-cancelled transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
