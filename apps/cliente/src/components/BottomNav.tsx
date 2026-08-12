import { NavLink } from 'react-router-dom';
import { ClipboardList, Plus, User } from 'lucide-react';

export default function BottomNav() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center gap-1 font-body text-xs transition-colors ${
      isActive ? 'text-primary' : 'text-muted-foreground'
    }`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-6 py-2 flex items-center justify-between z-50">
      <NavLink to="/orders" end className={linkClass}>
        <ClipboardList size={20} />
        Pedidos
      </NavLink>

      <NavLink
        to="/orders/new"
        className="bg-primary text-primary-foreground rounded-full w-14 h-14 flex items-center justify-center -translate-y-4 glow-fill hover:opacity-90 transition-opacity shadow-lg"
      >
        <Plus size={26} />
      </NavLink>

      <NavLink to="/profile" className={linkClass}>
        <User size={20} />
        Mi perfil
      </NavLink>
    </nav>
  );
}