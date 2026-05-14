import { NavLink, useNavigate } from 'react-router-dom';
import { signOut } from '../lib/auth';
import { useAuth } from '../hooks/useAuth';
import { PresenceCluster } from './PresenceCluster';

const navItems = [
  { to: '/',           label: 'Feed'      },
  { to: '/dashboard',  label: 'Dashboard' },
  { to: '/pulse',      label: 'Pulse'     },
  { to: '/admin',      label: 'Admin', adminOnly: true },
];

export function Layout({ children }) {
  const { profile } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-dark-grey">
      {/* Header */}
      <header
        className="flex items-center justify-between px-6 py-3 shadow-sm"
        style={{ backgroundColor: '#73000A' }}
      >
        {/* Left: wordmark */}
        <div className="flex items-center gap-3">
          <span className="text-white font-bold text-base tracking-tight">
            POAA Field Notes
          </span>
        </div>

        {/* Center: nav */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            if (item.adminOnly && !profile?.is_admin) return null;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  [
                    'px-3 py-1.5 rounded text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-white text-garnet'
                      : 'text-white hover:bg-white/20',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Right: presence + user info + sign out */}
        <div className="flex items-center gap-4">
          <PresenceCluster />
          {profile && (
            <span className="text-white/80 text-sm">{profile.initials}</span>
          )}
          <button
            onClick={handleSignOut}
            className="text-white/80 hover:text-white text-sm underline underline-offset-2"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className="px-6 py-6 max-w-screen-x