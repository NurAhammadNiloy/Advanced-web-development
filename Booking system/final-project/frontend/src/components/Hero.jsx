import { Link } from "react-router-dom";

const Hero = () => {
  const signedIn = Boolean(localStorage.getItem("token"));
  const role = localStorage.getItem("user_role") || "guest";

  return (
    <section className="grid gap-6 py-8 lg:grid-cols-[1.5fr_1fr] lg:py-12">
      <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm sm:p-10">
        <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white/80">
          Resource operations
        </span>
        <h1 className="mt-5 max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">
          Book rooms, equipment, and shared resources without schedule confusion.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-white/72">
          Browse live availability, reserve a time window, and let managers keep resource details accurate from one place.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link to="/resources" className="rounded-xl bg-white px-5 py-3 text-center text-sm font-bold text-slate-950 hover:bg-white/90">
            Browse resources
          </Link>
          <Link
            to={signedIn ? "/reservations" : "/login"}
            className="rounded-xl border border-white/20 px-5 py-3 text-center text-sm font-bold text-white hover:bg-white/10"
          >
            {signedIn ? "View reservations" : "Sign in"}
          </Link>
        </div>
      </div>

      <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-bold text-slate-950">Current access</h2>
        <div className="mt-5 grid gap-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Session</p>
            <p className="mt-1 text-sm font-semibold text-slate-950">{signedIn ? "Signed in" : "Guest"}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Role</p>
            <p className="mt-1 text-sm font-semibold capitalize text-slate-950">{role}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Next step</p>
            <p className="mt-1 text-sm text-slate-600">
              {signedIn ? "Create a booking or review your active reservations." : "Create an account, then reserve resources."}
            </p>
          </div>
        </div>
      </aside>
    </section>
  );
};

export default Hero;
