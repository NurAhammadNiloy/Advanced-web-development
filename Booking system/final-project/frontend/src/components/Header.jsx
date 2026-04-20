import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";

const linkClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-white/70 ${
    isActive ? "bg-white text-slate-950" : "text-white/82 hover:bg-white/10 hover:text-white"
  }`;

const Header = ({ showToast }) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [auth, setAuth] = useState({
    token: localStorage.getItem("token"),
    role: localStorage.getItem("user_role"),
    firstName: localStorage.getItem("user_firstName"),
  });

  useEffect(() => {
    const sync = () =>
      setAuth({
        token: localStorage.getItem("token"),
        role: localStorage.getItem("user_role"),
        firstName: localStorage.getItem("user_firstName"),
      });
    window.addEventListener("storage", sync);
    window.addEventListener("auth-change", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("auth-change", sync);
    };
  }, []);

  const closeMenu = () => setMenuOpen(false);

  const handleLogout = async () => {
    if (!window.confirm("Sign out of Booking System?")) return;
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // The local session still needs to end if the network is unavailable.
    }
    ["token", "user_id", "user_role", "user_firstName", "user_lastName", "user_email", "user_dob"].forEach((key) =>
      localStorage.removeItem(key)
    );
    window.dispatchEvent(new Event("auth-change"));
    showToast?.("Signed out.", "info");
    navigate("/login");
  };

  const nav = (
    <>
      <NavLink onClick={closeMenu} to="/resources" className={linkClass}>Resources</NavLink>
      {auth.token && <NavLink onClick={closeMenu} to="/reservations" className={linkClass}>Reservations</NavLink>}
      {auth.token ? (
        <>
          <NavLink onClick={closeMenu} to="/profile" className={linkClass}>Profile</NavLink>
          <button
            onClick={handleLogout}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-white/82 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/70"
          >
            Sign out
          </button>
        </>
      ) : (
        <>
          <NavLink onClick={closeMenu} to="/register" className={linkClass}>Create account</NavLink>
          <NavLink onClick={closeMenu} to="/login" className={linkClass}>Sign in</NavLink>
        </>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 bg-slate-950 text-white shadow-sm">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-slate-950">
        Skip to content
      </a>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex min-h-16 items-center justify-between gap-4 py-3">
          <Link to="/" onClick={closeMenu} className="flex items-center gap-3">
            <img src="/logo.svg" alt="" className="h-10 w-10" />
            <div className="leading-tight">
              <span className="block text-sm font-bold tracking-wide">Booking System</span>
              <span className="block text-xs text-white/64">
                {auth.token ? `Signed in${auth.firstName ? ` as ${auth.firstName}` : ""}` : "Resource scheduling"}
              </span>
            </div>
          </Link>

          <nav aria-label="Primary navigation" className="hidden items-center gap-1 lg:flex">
            {nav}
          </nav>

          <button
            type="button"
            aria-label="Open navigation menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
            className="rounded-lg border border-white/20 p-2 lg:hidden"
          >
            <span className="block h-0.5 w-6 bg-white" />
            <span className="mt-1.5 block h-0.5 w-6 bg-white" />
            <span className="mt-1.5 block h-0.5 w-6 bg-white" />
          </button>
        </div>

        {menuOpen && (
          <nav aria-label="Mobile navigation" className="grid gap-2 border-t border-white/10 pb-4 pt-3 lg:hidden">
            {nav}
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
