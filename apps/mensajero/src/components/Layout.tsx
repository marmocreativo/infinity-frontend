import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../lib/auth';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = auth.getUser();

  async function handleLogout() {
    await auth.logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-base-navy text-base-light flex flex-col">
      <header className="border-b border-base-light/10 px-4 py-3 flex items-center justify-between">
        <span className="font-heading text-lg text-primary font-semibold">
          Infinity App
        </span>
        <button
          onClick={handleLogout}
          className="font-body text-sm text-base-light/70 hover:text-status-cancelled transition-colors"
        >
          Salir
        </button>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <nav className="border-t border-base-light/10 flex">
        <Link
          to="/orders"
          className={`flex-1 text-center py-3 font-body text-sm ${
            location.pathname === '/orders' ? 'text-primary font-medium' : 'text-base-light/70'
          }`}
        >
          Pedidos
        </Link>
        <Link
          to="/shift"
          className={`flex-1 text-center py-3 font-body text-sm ${
            location.pathname === '/shift' ? 'text-primary font-medium' : 'text-base-light/70'
          }`}
        >
          Turno
        </Link>
      </nav>
      <p className="font-body text-xs text-base-light/40 text-center pb-1">
        {user?.name}
      </p>
    </div>
  );
}
