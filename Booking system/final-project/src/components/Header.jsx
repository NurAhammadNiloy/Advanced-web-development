import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <header className="sticky top-0 z-40 bg-brand-dark text-white shadow-soft">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-3 flex-1">
            <img src="/logo.svg" alt="Booking System" className="h-10 w-10" />
            <div className="leading-tight">
              <span className="block text-sm font-semibold">Booking System</span>
              <span className="block text-xs text-white/70">Secure resource booking</span>
            </div>
          </Link>

          <nav className="flex items-center gap-3">
            <Link
              to="/resources"
              className="res-link rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/10 w-40 text-center cursor-not-allowed pointer-events-none"
            >
              Resources
            </Link>
            <Link
              to="/reservations"
              className="res-link rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/10 w-40 text-center cursor-not-allowed pointer-events-none"
            >
              Reservations
            </Link>
            <Link
              to="/register"
              className="auth-link rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/10 w-40 text-center"
            >
              Register
            </Link>
            <Link
              to="/login"
              className="auth-link rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/10 w-40 text-center"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
