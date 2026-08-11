import { Outlet, Link, useNavigate } from 'react-router-dom';
import { auth } from '../lib/auth';

export default function Layout() {
  const navigate = useNavigate();
  const user = auth.getUser();

  async function handleLogout() {
    await auth.logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-base-navy text-base-light">
      <header className="border-b border-base-light/10 px-4 py-3 flex items-center justify-between">
        <Link to="/orders" className="font-heading text-lg text-primary font-semibold">
          Infinity App
        </Link>
        <div className="flex items-center gap-4">
          <span className="font-body text-sm text-base-light/70 hidden sm:inline">
            {user?.name}
          </span>
          <button
            onClick={handleLogout}
            className="font-body text-sm text-base-light/70 hover:text-status-cancelled transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}
