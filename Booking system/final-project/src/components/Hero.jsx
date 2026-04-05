const Hero = () => {
  return (
    <section className="py-16 grid gap-12 lg:grid-cols-12 items-stretch">
      <div className="lg:col-span-7">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-green/10 px-4 py-1 text-sm font-semibold text-brand-green">
          Privacy-First Availability Overview
        </span>

        <h1 className="mt-4 text-4xl font-semibold leading-tight">
          Simplify Resource Booking – Securely
        </h1>

        <p className="mt-4 text-lg max-w-2xl text-black/70">
          Simplify resource and user management in one secure system. Show
          availability publicly without exposing personal details.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-4">
          <a
            href="/login"
            className="w-full rounded-2xl bg-brand-primary px-6 py-3 text-sm font-semibold text-white shadow-soft hover:bg-brand-dark/80 text-center transition-all duration-200 ease-out"
          >
            Get started
          </a>
          <a
            href="/bookings"
            className="w-full rounded-2xl border border-brand-blue px-6 py-3 text-sm font-semibold hover:bg-brand-dark/80 hover:text-white text-center transition-all duration-200 ease-out"
          >
            View bookings
          </a>
        </div>
      </div>

      <aside className="lg:col-span-5">
        <div className="h-full rounded-3xl bg-white p-8 shadow-soft flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h2 id="welcome-message" className="text-xl font-semibold">
              Welcome!
            </h2>
            <span
              id="user-badge"
              className="rounded-full bg-brand-rose/10 px-3 py-1 text-xs font-semibold text-brand-rose"
            >
              Guest
            </span>
          </div>

          <p className="mt-4 text-sm text-black/70">
            <span id="status-block-top" className="block">
              Sign in to manage your reservations and view booking owners.
            </span>
            <span id="status-block-middle" className="block mt-2">
              Administrators and managers get extended rights and gain access to
              broader functionalities than a reserver.
            </span>
            <span
              id="status-block-bottom"
              className="block mt-2 font-medium text-black/80"
            >
              Don’t have an account yet? Register to get started.
            </span>
          </p>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <a
              href="/register"
              id="status-btn-left"
              className="rounded-xl border border-brand-dark px-4 py-3 text-center text-sm font-semibold hover:bg-brand-dark/80 hover:text-white transition-all duration-200 ease-out"
            >
              Register
            </a>
            <a
              href="/login"
              className="auth-link rounded-xl bg-brand-primary px-4 py-3 text-center text-sm font-semibold text-white hover:bg-brand-dark/80 transition-all duration-200 ease-out"
            >
              Sign in
            </a>
          </div>
        </div>
      </aside>
    </section>
  );
};

export default Hero;