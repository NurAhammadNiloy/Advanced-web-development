const Header = () => {
  return (
    <header className="sticky top-0 z-40 bg-brand-dark text-white shadow-soft">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex h-16 items-center justify-between">
          <a href="/" className="flex items-center gap-3 flex-1">
            <img src="/logo.svg" alt="Booking System" className="h-10 w-10" />
            <div className="leading-tight">
              <span className="block text-sm font-semibold">Booking System</span>
              <span className="block text-xs text-white/70">Secure resource booking</span>
            </div>
          </a>

          <nav className="flex items-center gap-3">
            <a
              href="/resources"
              className="res-link rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/10 w-40 text-center cursor-not-allowed pointer-events-none"
            >
              Resources
            </a>
            <a
              href="/reservations"
              className="res-link rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/10 w-40 text-center cursor-not-allowed pointer-events-none"
            >
              Reservations
            </a>
            <a
              href="/register"
              className="auth-link rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/10 w-40 text-center"
            >
              Register
            </a>
            <a
              href="/login"
              className="auth-link rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/10 w-40 text-center"
            >
              Sign in
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
