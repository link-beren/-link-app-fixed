import { NavLink } from 'react-router-dom';
import { Dumbbell, Home, Salad, Settings, Swords } from 'lucide-react';

const TABS = [
  { to: '/', label: 'בית', icon: Home, end: true },
  { to: '/crossfit', label: 'קרוספיט', icon: Dumbbell, end: false },
  { to: '/judo', label: 'ג׳ודו', icon: Swords, end: false },
  { to: '/nutrition', label: 'תזונה', icon: Salad, end: false },
  { to: '/settings', label: 'הגדרות', icon: Settings, end: false },
] as const;

export function BottomNav() {
  return (
    <nav
      className="safe-bottom safe-x sticky bottom-0 z-10 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95"
      aria-label="ניווט ראשי"
    >
      <ul className="flex justify-around">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex min-h-11 flex-col items-center gap-0.5 py-2 text-xs font-medium ${
                  isActive ? 'text-teal-500' : 'text-slate-500 dark:text-slate-400'
                }`
              }
            >
              <Icon aria-hidden="true" size={22} />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
