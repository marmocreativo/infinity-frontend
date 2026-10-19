import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { auth } from '../lib/auth';
import Avatar from './Avatar';
import { ClipboardList, Clock, LogOut, User as UserIcon } from 'lucide-react';

export default function Layout() {
  const navigate = useNavigate();
  const user = auth.getUser();

  async function handleLogout() {
    await auth.logout();
    navigate('/login');
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center gap-1 flex-1 py-3 font-body text-xs transition-colors ${
      isActive ? 'text-primary font-medium' : 'text-muted-foreground'
    }`;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border px-4 py-3 flex items-center justify-between">
        <img src="/logo.png" alt="Infinity App" className="h-7" />
        <div className="flex items-center gap-3">
          {user && (
            <Link to="/profile" className="flex items-center gap-2" aria-label="Mi perfil">
              <span className="font-body text-sm text-muted-foreground hidden sm:inline">
                {user.name}
              </span>
              <Avatar name={user.name} photoUrl={user.photo_url} size="sm" />
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="text-muted-foreground hover:text-status-cancelled transition-colors"
            aria-label="Cerrar sesión"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="flex-1 pb-20">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border flex z-50">
        <NavLink to="/orders" className={linkClass}>
          <ClipboardList size={20} />
          Pedidos
        </NavLink>
        <NavLink to="/shift" className={linkClass}>
          <Clock size={20} />
          Turno
        </NavLink>
        <NavLink to="/profile" className={linkClass}>
          <UserIcon size={20} />
          Perfil
        </NavLink>
      </nav>
    </div>
  );
}