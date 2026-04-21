import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

function ReservationsPage({ showToast }) {
  const [reservations, setReservations] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchReservations = useCallback(async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/reservations", {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token") || ""}`,
          },
        });
        if (response.status === 401) {
          throw new Error("Authentication required to view reservations.");
        }
        if (!response.ok) {
          throw new Error("Failed to load reservations");
        }
        const data = await response.json();
        setReservations(data.data || []);
        setError(null);
      } catch (err) {
        setError(err.message);
        showToast?.(err.message, "error");
      } finally {
        setLoading(false);
      }
  }, [showToast]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  async function cancelReservation(id) {
    if (!window.confirm("Cancel this reservation?")) return;
    setActionLoadingId(id);
    try {
      const response = await fetch(`/api/reservations/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${localStorage.getItem("token") || ""}` },
      });
      if (!response.ok && response.status !== 204) {
        const data = await response.json();
        throw new Error(data.error || "Could not cancel reservation");
      }
      showToast?.("Reservation cancelled.", "success");
      await fetchReservations();
    } catch (error) {
      showToast?.(error.message, "error");
    } finally {
      setActionLoadingId(null);
    }
  }

  const filteredReservations = reservations.filter((reservation) => {
    const haystack = `${reservation.id} ${reservation.resource_name} ${reservation.status}`.toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  });
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filteredReservations.length / pageSize));
  const visibleReservations = filteredReservations.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="w-full flex-grow flex items-start justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-3xl p-10 shadow-[0_4px_40px_rgb(0,0,0,0.06)] flex flex-col relative mx-auto my-8">
        
        <div className="w-max px-3.5 py-1.5 bg-[#f0f9f6] text-[#418a6e] text-[11px] font-bold rounded-full mb-6">
          My Bookings
        </div>
        
        <h1 className="text-[28px] font-semibold leading-tight text-gray-900 mb-2">Reservations</h1>
        <p className="text-gray-500 mb-8 text-[13px]">Manage your upcoming resource bookings.</p>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="sr-only" htmlFor="reservationSearch">Search reservations</label>
          <input
            id="reservationSearch"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#e10e49] sm:max-w-sm"
            placeholder="Search reservations..."
          />
          <span className="text-sm font-semibold text-gray-500">{filteredReservations.length} result{filteredReservations.length === 1 ? "" : "s"}</span>
        </div>

        {loading && (
          <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-100 border-dashed animate-pulse">
            <p className="text-gray-400 text-[13px] font-medium mb-4">Loading your reservations...</p>
            <div className="h-6 bg-gray-200 rounded w-1/2 mx-auto mb-2"></div>
            <div className="h-6 bg-gray-200 rounded w-1/3 mx-auto"></div>
          </div>
        )}
        {!loading && error && (
          <div className="bg-red-50 text-[#e10e49] p-4 rounded-2xl mb-6 text-[13px] font-medium border border-red-100 flex items-center justify-between">
            <span>{error}</span>
            <Link to="/login" className="bg-white text-sm font-bold px-4 py-2 rounded-xl text-gray-900 hover:bg-gray-50 ml-4 border border-gray-200">
              Log in
            </Link>
          </div>
        )}
        {!loading && !error && reservations.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-2xl" aria-hidden="true">0</div>
            <p className="text-gray-500 text-[13px] font-medium mb-4">You have no active reservations right now.</p>
            <Link to="/resources" className="inline-block mt-4 bg-[#e10e49] hover:bg-[#c00a3d] text-white px-6 py-2.5 rounded-full text-sm font-bold transition-all">
              Book a Resource
            </Link>
          </div>
        ) : null}
        {!loading && !error && reservations.length > 0 && filteredReservations.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
            <p className="text-gray-500 text-[13px] font-medium">No reservations match your search.</p>
          </div>
        )}
        {!loading && !error && visibleReservations.length > 0 && (
          <>
          <div className="border border-gray-100 rounded-2xl overflow-x-auto shadow-sm">
            <table className="min-w-full divide-y divide-gray-100 bg-white">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Resource</th>
                  <th className="px-6 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Start</th>
                  <th className="px-6 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">End</th>
                  <th className="px-6 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-[12px] font-bold text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleReservations.map(reser => (
                  <tr key={reser.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-[13px] font-semibold text-gray-900">#{reser.id}</td>
                    <td className="px-6 py-4 text-[13px] font-medium text-gray-800">{reser.resource_name || 'Resource ' + reser.resource_id}</td>
                    <td className="px-6 py-4 text-[13px] text-gray-500">{new Date(reser.start_time).toLocaleString()}</td>
                    <td className="px-6 py-4 text-[13px] text-gray-500">{new Date(reser.end_time).toLocaleString()}</td>
                    <td className="px-6 py-4 text-[13px]">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${reser.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}> 
                        {reser.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-[13px]">
                      <button
                        type="button"
                        disabled={actionLoadingId === reser.id}
                        onClick={() => cancelReservation(reser.id)}
                        className="rounded-full border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {actionLoadingId === reser.id ? "Cancelling..." : "Cancel"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button type="button" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold disabled:opacity-50">Previous</button>
            <span className="text-sm font-semibold text-gray-500">Page {page} of {totalPages}</span>
            <button type="button" disabled={page === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold disabled:opacity-50">Next</button>
          </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ReservationsPage;
