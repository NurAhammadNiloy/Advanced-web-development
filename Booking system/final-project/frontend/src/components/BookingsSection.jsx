import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const BookingsSection = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadResources() {
      try {
        const response = await fetch("/api/resources");
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load resources");
        setResources((data.data || []).slice(0, 4));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadResources();
  }, []);

  return (
    <section className="pb-16">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Live resource snapshot</h2>
            <p className="mt-1 text-sm text-slate-600">A quick look at resources currently available in the system.</p>
          </div>
          <Link to="/resources" className="rounded-xl bg-[#e10e49] px-5 py-3 text-center text-sm font-bold text-white">
            View all
          </Link>
        </div>

        {loading && (
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div role="alert" className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && resources.length === 0 && (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl" aria-hidden="true">+</div>
            <p className="text-sm font-semibold text-gray-500">No resources are available yet.</p>
          </div>
        )}

        {!loading && !error && resources.length > 0 && (
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {resources.map((resource) => (
              <article key={resource.id} className="rounded-2xl border border-slate-200 p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bold text-gray-900">{resource.name}</h3>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${resource.available ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {resource.available ? "Open" : "Closed"}
                  </span>
                </div>
                <p className="mt-3 max-h-10 overflow-hidden text-sm leading-5 text-gray-500">{resource.description || "No description provided."}</p>
                <p className="mt-4 text-sm font-bold text-gray-900">€{Number(resource.price || 0).toFixed(2)} / {resource.price_unit || "hour"}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default BookingsSection;
