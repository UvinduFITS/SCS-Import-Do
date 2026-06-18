import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** Logo with graceful fallback: /logo.png -> /logo.svg -> text badge. */
function Logo() {
  const [src, setSrc] = useState('/logo.png');
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-bold tracking-wide text-white">
        FITS EXPRESS
      </span>
    );
  }
  return (
    <img
      src={src}
      alt="Company logo"
      className="h-9 w-auto"
      onError={() => {
        if (src.endsWith('.png')) setSrc('/logo.svg');
        else setFailed(true);
      }}
    />
  );
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-4 py-2 text-sm font-semibold transition ${
    isActive ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
  }`;

export function Header() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="hidden text-lg font-bold tracking-wide text-slate-800 lg:block">
            SCS IMPORT DO
          </span>
        </div>

        <nav className="flex items-center gap-1.5">
          <NavLink to="/import-do" className={linkClass}>
            New Form
          </NavLink>
          <NavLink to="/history" className={linkClass}>
            History
          </NavLink>
          {isAdmin && (
            <NavLink to="/users" className={linkClass}>
              Users
            </NavLink>
          )}

          {user && (
            <div className="ml-2 flex items-center gap-3 border-l border-slate-200 pl-3">
              <div className="hidden text-right sm:block">
                <div className="text-sm font-medium leading-tight text-slate-700">{user.name || user.email}</div>
                <div className="text-xs leading-tight text-slate-400">
                  {user.email} · <span className="uppercase">{user.role}</span>
                </div>
              </div>
              <button className="btn-secondary" onClick={handleLogout}>
                Logout
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
