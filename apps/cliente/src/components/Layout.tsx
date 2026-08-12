import { Outlet, useNavigate } from 'react-router-dom';
import { auth } from '../lib/auth';
import BottomNav from './BottomNav';
import { LogOut } from 'lucide-react';

export default function Layout() {
  const navigate = useNavigate();

  async function handleLogout() {
    await auth.logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-4 py-3 flex items-center justify-between">
        <img src="/logo.png" alt="Infinity App" className="h-7" />
        <button
          onClick={handleLogout}
          className="text-muted-foreground hover:text-status-cancelled transition-colors"
          aria-label="Cerrar sesión"
        >
          <LogOut size={18} />
        </button>
      </header>

      <main>
        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
}