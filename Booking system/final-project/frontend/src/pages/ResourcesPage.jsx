import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

const resourceSchema = z.object({
  resourceName: z
    .string()
    .trim()
    .min(5, "Resource name must be at least 5 characters long")
    .max(30, "Resource name must not exceed 30 characters")
    .regex(/^[a-zA-Z0-9äöåÄÖÅ \-]+$/, "Resource name can only contain letters, numbers, spaces and hyphens")
    .regex(/[a-zA-ZäöåÄÖÅ]/, "Resource name must contain at least one letter")
    .refine(val => !/\s{2,}/.test(val), "Resource name cannot contain double spaces")
    .refine(val => !/^(test|aaa+|12345|room|new resource)$/i.test(val), "Please provide a meaningful resource name"),
  resourceDescription: z
    .string()
    .trim()
    .min(10, "Resource description must be at least 10 characters long")
    .max(150, "Resource description must not exceed 150 characters")
    .regex(/[a-zA-ZäöåÄÖÅ]/, "Resource description must contain letters")
    .refine(val => !/(.)\1{3,}/.test(val), "Resource description cannot contain repeated junk characters")
    .refine(val => val.trim().split(/\s+/).length >= 2, "Resource description must contain at least 2 words"),
  resourcePrice: z
    .number()
    .min(0, "Price must be a non-negative number")
    .max(9999.99, "Price cannot exceed 9999.99")
    .refine(val => /^\d+(\.\d{1,2})?$/.test(val.toString()), "Price can have at most 2 decimal places and no scientific notation"),
  resourcePriceUnit: z
    .enum(["hour", "day", "week", "month"], {
      errorMap: () => ({ message: "Price unit must be 'hour', 'day', 'week', or 'month'" }),
    }),
  resourceAvailable: z.boolean(),
}).superRefine((data, ctx) => {
  if (data.resourceDescription.trim().toLowerCase() === data.resourceName.trim().toLowerCase()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Resource description cannot be identical to the resource name",
      path: ["resourceDescription"]
    });
  }
});

function toDateTimeLocal(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getDefaultStartDate() {
  const date = new Date();
  date.setMinutes(date.getMinutes() + (30 - (date.getMinutes() % 30 || 30)) + 30, 0, 0);
  return date;
}

function formatDuration(startValue, endValue) {
  if (!startValue || !endValue) return "Choose a start and end time";
  const diffMs = new Date(endValue) - new Date(startValue);
  if (diffMs <= 0 || Number.isNaN(diffMs)) return "End time must be after start time";
  const totalMinutes = Math.round(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  return `${minutes}m`;
}

function ResourcesPage({ showToast }) {
  const [resources, setResources] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingResource, setBookingResource] = useState(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [bookingError, setBookingError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [newResourceName, setNewResourceName] = useState("");
  const [newResourceDesc, setNewResourceDesc] = useState("");
  const [newResourcePrice, setNewResourcePrice] = useState("");
  const [newResourcePriceUnit, setNewResourcePriceUnit] = useState("hour");
  const [newResourceAvailable, setNewResourceAvailable] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({});
  const [modalError, setModalError] = useState(null);

  const navigate = useNavigate();
  const userRole = localStorage.getItem("user_role");
  const bookingDurationText = formatDuration(startTime, endTime);
  const bookingHours = startTime && endTime ? Math.max(0, (new Date(endTime) - new Date(startTime)) / 36e5) : 0;
  const estimatedTotal = bookingResource && bookingResource.price_unit === "hour"
    ? Number(bookingResource.price || 0) * bookingHours
    : null;
  const minBookingTime = toDateTimeLocal(new Date(Date.now() + 5 * 60000));

  const fetchResources = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/resources", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      if (response.status === 401) {
        throw new Error("Authentication required");
      }
      if (!response.ok) {
        throw new Error("Failed to load resources");
      }
      const data = await response.json();
      setResources(data.data || []);
      setError(null);
    } catch (err) {
      setError(err.message);
      showToast?.(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const handleCreateResource = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    setModalError(null);
    
    try {
      resourceSchema.parse({
        resourceName: newResourceName,
        resourceDescription: newResourceDesc,
        resourcePrice: parseFloat(newResourcePrice || 0),
        resourcePriceUnit: newResourcePriceUnit,
        resourceAvailable: newResourceAvailable,
      });
    } catch (err) {
      if (err && err.issues) {
        const errors = {};
        err.issues.forEach(e => {
          if (e.path && e.path.length > 0) errors[e.path[0]] = e.message;
        });
        setFieldErrors(errors);
        return;
      }
      setModalError(err.message);
      return;
    }

    try {
      const response = await fetch("/api/resources", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({
          resourceName: newResourceName,
          resourceDescription: newResourceDesc,
          resourceAvailable: newResourceAvailable,
          resourcePrice: parseFloat(newResourcePrice || 0),
          resourcePriceUnit: newResourcePriceUnit
        }),
      });

      if (!response.ok) {
        const d = await response.json();
        throw new Error(d.error || "Creation failed");
      }
      
      closeModals();
      await fetchResources();
      showToast?.("Resource created.", "success");
    } catch (err) {
      setModalError(err.message);
      showToast?.(err.message, "error");
    }
  };

  const handleUpdateResource = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    setModalError(null);
    
    try {
      resourceSchema.parse({
        resourceName: newResourceName,
        resourceDescription: newResourceDesc,
        resourcePrice: parseFloat(newResourcePrice || 0),
        resourcePriceUnit: newResourcePriceUnit,
        resourceAvailable: newResourceAvailable,
      });
    } catch (err) {
      if (err && err.issues) {
        const errors = {};
        err.issues.forEach(e => {
          if (e.path && e.path.length > 0) errors[e.path[0]] = e.message;
        });
        setFieldErrors(errors);
        return;
      }
      setModalError(err.message);
      return;
    }

    try {
      const response = await fetch(`/api/resources/${editingResource.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({
          resourceName: newResourceName,
          resourceDescription: newResourceDesc,
          resourceAvailable: newResourceAvailable,
          resourcePrice: parseFloat(newResourcePrice || 0),
          resourcePriceUnit: newResourcePriceUnit
        }),
      });

      if (!response.ok) {
        const d = await response.json();
        throw new Error(d.error || "Update failed");
      }
      
      closeModals();
      await fetchResources();
      showToast?.("Resource updated.", "success");
    } catch (err) {
      setModalError(err.message);
      showToast?.(err.message, "error");
    }
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setEditingResource(null);
    setNewResourceName("");
    setNewResourceDesc("");
    setNewResourcePrice("");
    setNewResourcePriceUnit("hour");
    setNewResourceAvailable(true);
    setFieldErrors({});
    setModalError(null);
  };

  const handleDeleteResource = async (id) => {
    if (!window.confirm("Are you sure you want to delete this resource? This cannot be undone.")) return;
    setActionLoading(true);
    try {
      const response = await fetch(`/api/resources/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });

      if (!response.ok) {
        const d = await response.json();
        showToast && showToast(d.error || "Delete failed", "error");
        throw new Error(d.error || "Delete failed");
      }
      fetchResources();
      showToast && showToast("Resource deleted", "success");
    } catch (err) {
      showToast && showToast("Error deleting resource: " + err.message, "error");
    }
  };

  const openUpdateModal = (res) => {
    setEditingResource(res);
    setNewResourceName(res.name);
    setNewResourceDesc(res.description);
    setNewResourcePrice(res.price);
    setNewResourcePriceUnit(res.price_unit || "hour");
    setNewResourceAvailable(res.available);
  };

  const openBookingModal = (res) => {
    const start = getDefaultStartDate();
    const end = new Date(start.getTime() + 60 * 60000);
    setBookingResource(res);
    setStartTime(toDateTimeLocal(start));
    setEndTime(toDateTimeLocal(end));
    setBookingError(null);
  };

  const closeBookingModal = () => {
    setBookingResource(null);
    setStartTime("");
    setEndTime("");
    setBookingError(null);
  };

  const applyDuration = (minutes) => {
    const start = startTime ? new Date(startTime) : getDefaultStartDate();
    const end = new Date(start.getTime() + minutes * 60000);
    setStartTime(toDateTimeLocal(start));
    setEndTime(toDateTimeLocal(end));
    setBookingError(null);
  };

  const handleBook = async (e) => {
    e.preventDefault();
    setBookingError(null);

    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();

    if (start <= now) {
      setBookingError("Start time must be in the future.");
      return;
    }
    if (start >= end) {
      setBookingError("End time must be after start time.");
      return;
    }

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({
          resourceId: Number(bookingResource.id),
          startTime,
          endTime,
          note: "Booked via UI"
        }),
      });

      if (!response.ok) {
        const d = await response.json();
        throw new Error(d.error || "Booking failed");
      }
      
      setBookingResource(null);
      setStartTime("");
      setEndTime("");
      showToast?.("Booking created.", "success");
      navigate("/reservations");
    } catch (err) {
      setBookingError(err.message);
      showToast?.(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredResources = resources.filter((res) => {
    const haystack = `${res.name} ${res.description} ${res.price_unit}`.toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  });
  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(filteredResources.length / pageSize));
  const visibleResources = filteredResources.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="w-full flex-grow flex flex-col p-4 max-w-6xl mx-auto my-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="w-max px-3.5 py-1.5 bg-[#f0f9f6] text-[#418a6e] text-[11px] font-bold rounded-full mb-2">
            Resource Management
          </div>
          <h1 className="text-[28px] font-semibold leading-tight text-gray-900">Available Resources</h1>
        </div>
        
        {userRole === "manager" && (
          <button 
            onClick={() => setShowCreateModal(true)} 
            className="px-5 py-2.5 rounded-full text-sm font-bold bg-[#418a6e] text-white hover:bg-[#326953] transition-colors shadow-soft"
          >
            + Create Resource
          </button>
        )}
      </div>
      <p className="text-gray-500 mb-8 text-[13px]">Browse our facilities and make your bookings securely.</p>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="sr-only" htmlFor="resourceSearch">Search resources</label>
        <input
          id="resourceSearch"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#e10e49] sm:max-w-sm"
          placeholder="Search resources..."
        />
        <span className="text-sm font-semibold text-gray-500">{filteredResources.length} result{filteredResources.length === 1 ? "" : "s"}</span>
      </div>

      {loading && (
        <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-100 border-dashed animate-pulse">
          <p className="text-gray-400 text-[13px] font-medium mb-4">Loading resources...</p>
          <div className="h-6 bg-gray-200 rounded w-1/2 mx-auto mb-2"></div>
          <div className="h-6 bg-gray-200 rounded w-1/3 mx-auto"></div>
        </div>
      )}
      {!loading && error && (
        <div className="bg-red-50 text-[#e10e49] p-4 rounded-2xl mb-6 text-[13px] font-medium border border-red-100">
          {error} <Link to="/login" className="underline ml-2">Click here to log in</Link>
        </div>
      )}
      {!loading && !error && resources.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-2xl" aria-hidden="true">+</div>
          <p className="text-gray-500 text-[13px] font-medium">No resources found. Try another search or ask a manager to add one.</p>
        </div>
      )}
      {!loading && !error && resources.length > 0 && filteredResources.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
          <p className="text-gray-500 text-[13px] font-medium">No resources match your search.</p>
        </div>
      )}
      {!loading && !error && visibleResources.length > 0 && (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleResources.map(res => (
            <div key={res.id} className="bg-white p-6 rounded-3xl shadow-[0_4px_40px_rgb(0,0,0,0.06)] border border-gray-100 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-lg font-bold text-gray-900">{res.name}</h2>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${res.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {res.available ? 'Available' : 'Unavailable'}
                  </span>
                </div>
                <p className="text-gray-500 text-[13px] leading-relaxed mb-6">
                  {res.description || "No description provided."}
                </p>
              </div>
              <div className="pt-4 border-t border-gray-100 flex justify-between items-center mt-auto">
                <span className="font-semibold text-gray-900">€{Number(res.price || 0).toFixed(2)} {res.price_unit && <span className="text-gray-400 font-normal text-[12px]">/ {res.price_unit}</span>}</span>
                <div className="flex gap-2">
                  {userRole === "manager" && (
                    <>
                      <button onClick={() => openUpdateModal(res)} className="text-[12px] font-bold text-[#418a6e] hover:bg-[#f0f9f6] px-3 py-2 rounded-full transition-colors flex items-center justify-center">Edit</button>
                      <button onClick={() => handleDeleteResource(res.id)} className="text-[12px] font-bold text-red-500 hover:bg-red-50 px-3 py-2 rounded-full transition-colors flex items-center justify-center">Delete</button>
                    </>
                  )}
                  <button onClick={() => openBookingModal(res)} className="text-[12px] font-bold text-[#e10e49] border border-[#e10e49]/20 hover:bg-red-50 px-4 py-2 rounded-full transition-colors ml-1">
                    Book
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button type="button" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold disabled:opacity-50">Previous</button>
          <span className="text-sm font-semibold text-gray-500">Page {page} of {totalPages}</span>
          <button type="button" disabled={page === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold disabled:opacity-50">Next</button>
        </div>
        </>
      )}

      {bookingResource && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="booking-title">
            <div className="grid lg:grid-cols-[1fr_1.15fr]">
              <aside className="bg-slate-950 p-6 text-white sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/50">Booking request</p>
                    <h2 id="booking-title" className="mt-3 text-2xl font-bold">{bookingResource.name}</h2>
                  </div>
                  <button
                    type="button"
                    onClick={closeBookingModal}
                    aria-label="Close booking dialog"
                    className="rounded-full border border-white/15 px-3 py-1.5 text-sm font-bold text-white/70 hover:bg-white/10 hover:text-white"
                  >
                    X
                  </button>
                </div>
                <p className="mt-5 text-sm leading-6 text-white/68">{bookingResource.description || "No description provided for this resource."}</p>

                <div className="mt-8 grid gap-3">
                  <div className="rounded-2xl bg-white/8 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-white/50">Rate</p>
                    <p className="mt-1 text-lg font-bold">€{Number(bookingResource.price || 0).toFixed(2)} <span className="text-sm font-medium text-white/55">/ {bookingResource.price_unit || "hour"}</span></p>
                  </div>
                  <div className="rounded-2xl bg-white/8 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-white/50">Estimated duration</p>
                    <p className="mt-1 text-lg font-bold">{bookingDurationText}</p>
                  </div>
                  <div className="rounded-2xl bg-[#e10e49] p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-white/70">Estimated total</p>
                    <p className="mt-1 text-2xl font-black">
                      {estimatedTotal === null ? "Shown after approval" : `€${estimatedTotal.toFixed(2)}`}
                    </p>
                  </div>
                </div>
              </aside>

              <form onSubmit={handleBook} className="p-6 sm:p-8">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-slate-950">Choose your time</h3>
                  <p className="mt-1 text-sm text-slate-500">Pick a future window. The system checks for overlapping bookings before confirming.</p>
                </div>

                {bookingError && (
                  <div role="alert" className="mb-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-600">
                    {bookingError}
                  </div>
                )}

                <div className="grid gap-4">
                  <div>
                    <label className="block text-[13px] font-bold text-slate-900 mb-1.5" htmlFor="bookingStart">Start time</label>
                    <input
                      id="bookingStart"
                      type="datetime-local"
                      required
                      min={minBookingTime}
                      className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:border-[#e10e49]"
                      value={startTime}
                      onChange={(e) => {
                        setStartTime(e.target.value);
                        setBookingError(null);
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-bold text-slate-900 mb-1.5" htmlFor="bookingEnd">End time</label>
                    <input
                      id="bookingEnd"
                      type="datetime-local"
                      required
                      min={startTime || minBookingTime}
                      className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:border-[#e10e49]"
                      value={endTime}
                      onChange={(e) => {
                        setEndTime(e.target.value);
                        setBookingError(null);
                      }}
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Quick duration</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[30, 60, 120].map((minutes) => (
                      <button
                        key={minutes}
                        type="button"
                        onClick={() => applyDuration(minutes)}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:border-[#e10e49] hover:bg-red-50 hover:text-[#e10e49]"
                      >
                        {minutes < 60 ? "30 min" : `${minutes / 60} hour${minutes === 60 ? "" : "s"}`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-semibold text-slate-500">Summary</span>
                    <span className="text-sm font-black text-slate-950">{bookingDurationText}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">You will be redirected to your reservations after confirmation.</p>
                </div>

                <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button type="button" onClick={closeBookingModal} className="rounded-xl px-5 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={actionLoading} className="rounded-xl bg-[#e10e49] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-red-900/10 hover:bg-[#c00a3d] transition-colors disabled:opacity-50">
                    {actionLoading ? "Creating booking..." : "Confirm booking"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-1">Resource form</h2>
            <p className="mb-8 text-sm text-black/60">
                All fields are required. Fill in the details below. Use Create for new items, Update for
                existing ones, and Delete to remove.
            </p>

            {modalError && (<div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium border border-red-100">{modalError}</div>)}<form onSubmit={handleCreateResource} className="space-y-6" noValidate>
              {/* Resource name */}
              <div>
                <label className="block text-sm font-semibold mb-1.5 cursor-pointer" htmlFor="resourceName">Resource name</label>
                <input id="resourceName" type="text" required minLength="5" maxLength="30" className={`w-full rounded-2xl border ${fieldErrors.resourceName ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : 'border-black/10 focus:border-[#418a6e] focus:ring-[#418a6e]/30'} bg-white px-4 py-3 text-sm outline-none focus:ring-2 transition-all duration-200 ease-out`} value={newResourceName} onChange={(e) => { setNewResourceName(e.target.value); setFieldErrors({...fieldErrors, resourceName: undefined}); }} />
                {fieldErrors.resourceName ? (
                  <p className="mt-2 text-xs text-red-500">{fieldErrors.resourceName}</p>
                ) : (
                  <p className="mt-2 text-xs text-black/50">
                      Use a short, unique name users recognize (5–30 characters). Use letters, numbers,
                      and spaces only.
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold mb-1.5 cursor-pointer" htmlFor="resourceDesc">Resource description</label>
                <textarea id="resourceDesc" rows={3} required minLength="10" maxLength="150" className={`w-full rounded-2xl border ${fieldErrors.resourceDescription ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : 'border-black/10 focus:border-[#418a6e] focus:ring-[#418a6e]/30'} bg-white px-4 py-3 text-sm outline-none focus:ring-2 transition-all duration-200 ease-out resize-none`} value={newResourceDesc} onChange={(e) => { setNewResourceDesc(e.target.value); setFieldErrors({...fieldErrors, resourceDescription: undefined}); }}></textarea>
                {fieldErrors.resourceDescription ? (
                  <p className="mt-2 text-xs text-red-500">{fieldErrors.resourceDescription}</p>
                ) : (
                  <p className="mt-2 text-xs text-black/50">
                      Keep it practical: what it is, and who it’s for (10–150 characters). Use letters,
                      numbers, and spaces only.
                  </p>
                )}
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                {/* Availability (Switch) */}
                <div className="lg:col-span-1">
                    <span className="block text-sm font-semibold mb-2">
                        Availability
                    </span>
                    <div className="ml-1 mt-2 mb-3 flex items-center min-h-[48px]">
                        <label className="inline-flex items-center cursor-pointer select-none">
                            <input type="checkbox" id="resourceAvailable" name="resourceAvailable" checked={newResourceAvailable} onChange={(e) => setNewResourceAvailable(e.target.checked)} className="sr-only peer" />
                            <div className="relative w-11 h-6 rounded-full bg-black/20 peer-checked:bg-[#418a6e] transition-all duration-200 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-5 after:h-5 after:bg-white after:rounded-full after:transition-all duration-200 peer-checked:after:translate-x-5"></div>
                            <span className="ml-3 text-sm text-black/70">
                                Available
                            </span>
                        </label>
                    </div>
                    <p className="mt-2 text-xs text-black/50">
                        When enabled, the resource is available for normal booking.
                    </p>
                </div>

                {/* Price */}
                <div className="lg:col-span-2">
                    <label className="block text-sm font-semibold" htmlFor="resourcePrice">
                        Price
                    </label>

                    {/* Price value */}
                    <div className="mt-2 flex gap-2 items-stretch">
                          <input id="resourcePrice" name="resourcePrice" type="number" placeholder="0.00" min="0" step="0.01" required value={newResourcePrice} onChange={(e) => { setNewResourcePrice(e.target.value); setFieldErrors({...fieldErrors, resourcePrice: undefined}); }} className={`w-full max-w-[180px] rounded-2xl border ${fieldErrors.resourcePrice ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : 'border-black/10 focus:border-[#418a6e] focus:ring-[#418a6e]/30'} bg-white px-4 py-3 text-sm outline-none focus:ring-2 transition-all duration-200 ease-out`} />
                          <span className="inline-flex items-center rounded-2xl border border-black/10 bg-black/5 px-4 text-sm font-semibold text-black/70">
                              €
                          </span>
                      </div>
                      {fieldErrors.resourcePrice && (
                        <p className="mt-2 text-xs text-red-500">{fieldErrors.resourcePrice}</p>
                      )}
                      
                      {/* Price unit (Radio buttons) */}
                      <div className="mt-4 flex flex-wrap gap-4">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="resourcePriceUnit" value="hour" checked={newResourcePriceUnit === "hour"} onChange={(e) => setNewResourcePriceUnit(e.target.value)} className="text-[#418a6e] focus:ring-[#418a6e]" />
                            <span className="text-sm">hour</span>
                        </label>
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="resourcePriceUnit" value="day" checked={newResourcePriceUnit === "day"} onChange={(e) => setNewResourcePriceUnit(e.target.value)} className="text-[#418a6e] focus:ring-[#418a6e]" />
                            <span className="text-sm">day</span>
                        </label>
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="resourcePriceUnit" value="week" checked={newResourcePriceUnit === "week"} onChange={(e) => setNewResourcePriceUnit(e.target.value)} className="text-[#418a6e] focus:ring-[#418a6e]" />
                            <span className="text-sm">week</span>
                        </label>
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="resourcePriceUnit" value="month" checked={newResourcePriceUnit === "month"} onChange={(e) => setNewResourcePriceUnit(e.target.value)} className="text-[#418a6e] focus:ring-[#418a6e]" />
                            <span className="text-sm">month</span>
                        </label>
                    </div>

                    <p className="mt-2 text-xs text-black/50">
                        Set the price per selected time unit. Use 0 for free resources.
                    </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-end gap-3 mt-8 border-t border-black/10 pt-6">
                <button type="button" onClick={() => setShowCreateModal(false)} className="w-full sm:w-auto rounded-2xl border border-black/10 px-6 py-3 text-sm font-semibold transition-all duration-200 ease-out hover:bg-black/5">Cancel</button>
                <button type="submit" className="w-full sm:w-auto rounded-2xl bg-[#e10e49] text-white shadow-soft px-6 py-3 text-sm font-semibold transition-all duration-200 ease-out hover:bg-[#c00a3d]">Create Resource</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingResource && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-1">Update Resource</h2>
            <p className="mb-8 text-sm text-black/60">
                Update the details for "{editingResource.name}".
            </p>

            {modalError && (<div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium border border-red-100">{modalError}</div>)}<form onSubmit={handleUpdateResource} className="space-y-6" noValidate>
              {/* Resource name */}
              <div>
                <label className="block text-sm font-semibold mb-1.5 cursor-pointer" htmlFor="editResourceName">Resource name</label>
                <input id="editResourceName" type="text" required minLength="5" maxLength="30" className={`w-full rounded-2xl border ${fieldErrors.resourceName ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : 'border-black/10 focus:border-[#418a6e] focus:ring-[#418a6e]/30'} bg-white px-4 py-3 text-sm outline-none focus:ring-2 transition-all duration-200 ease-out`} value={newResourceName} onChange={(e) => { setNewResourceName(e.target.value); setFieldErrors({...fieldErrors, resourceName: undefined}); }} />
                {fieldErrors.resourceName ? (
                  <p className="mt-2 text-xs text-red-500">{fieldErrors.resourceName}</p>
                ) : (
                  <p className="mt-2 text-xs text-black/50">
                      Use a short, unique name users recognize (5–30 characters). Use letters, numbers,
                      and spaces only.
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold mb-1.5 cursor-pointer" htmlFor="editResourceDesc">Resource description</label>
                <textarea id="editResourceDesc" rows={3} required minLength="10" maxLength="150" className={`w-full rounded-2xl border ${fieldErrors.resourceDescription ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : 'border-black/10 focus:border-[#418a6e] focus:ring-[#418a6e]/30'} bg-white px-4 py-3 text-sm outline-none focus:ring-2 transition-all duration-200 ease-out resize-none`} value={newResourceDesc} onChange={(e) => { setNewResourceDesc(e.target.value); setFieldErrors({...fieldErrors, resourceDescription: undefined}); }}></textarea>
                {fieldErrors.resourceDescription ? (
                  <p className="mt-2 text-xs text-red-500">{fieldErrors.resourceDescription}</p>
                ) : (
                  <p className="mt-2 text-xs text-black/50">
                      Keep it practical: what it is, and who it’s for (10–150 characters). Use letters,
                      numbers, and spaces only.
                  </p>
                )}
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                {/* Availability (Switch) */}
                <div className="lg:col-span-1">
                    <span className="block text-sm font-semibold mb-2">
                        Availability
                    </span>
                    <div className="ml-1 mt-2 mb-3 flex items-center min-h-[48px]">
                        <label className="inline-flex items-center cursor-pointer select-none">
                            <input type="checkbox" id="editResourceAvailable" name="editResourceAvailable" checked={newResourceAvailable} onChange={(e) => setNewResourceAvailable(e.target.checked)} className="sr-only peer" />
                            <div className="relative w-11 h-6 rounded-full bg-black/20 peer-checked:bg-[#418a6e] transition-all duration-200 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-5 after:h-5 after:bg-white after:rounded-full after:transition-all duration-200 peer-checked:after:translate-x-5"></div>
                            <span className="ml-3 text-sm text-black/70">
                                Available
                            </span>
                        </label>
                    </div>
                    <p className="mt-2 text-xs text-black/50">
                        When enabled, the resource is available for normal booking.
                    </p>
                </div>

                {/* Price */}
                <div className="lg:col-span-2">
                    <label className="block text-sm font-semibold" htmlFor="editResourcePrice">
                        Price
                    </label>

                    {/* Price value */}
                    <div className="mt-2 flex gap-2 items-stretch">
                          <input id="editResourcePrice" name="editResourcePrice" type="number" placeholder="0.00" min="0" step="0.01" required value={newResourcePrice} onChange={(e) => { setNewResourcePrice(e.target.value); setFieldErrors({...fieldErrors, resourcePrice: undefined}); }} className={`w-full max-w-[180px] rounded-2xl border ${fieldErrors.resourcePrice ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : 'border-black/10 focus:border-[#418a6e] focus:ring-[#418a6e]/30'} bg-white px-4 py-3 text-sm outline-none focus:ring-2 transition-all duration-200 ease-out`} />
                          <span className="inline-flex items-center rounded-2xl border border-black/10 bg-black/5 px-4 text-sm font-semibold text-black/70">
                              €
                          </span>
                      </div>
                      {fieldErrors.resourcePrice && (
                        <p className="mt-2 text-xs text-red-500">{fieldErrors.resourcePrice}</p>
                      )}
                      
                      {/* Price unit (Radio buttons) */}
                      <div className="mt-4 flex flex-wrap gap-4">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="editResourcePriceUnit" value="hour" checked={newResourcePriceUnit === "hour"} onChange={(e) => setNewResourcePriceUnit(e.target.value)} className="text-[#418a6e] focus:ring-[#418a6e]" />
                            <span className="text-sm">hour</span>
                        </label>
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="editResourcePriceUnit" value="day" checked={newResourcePriceUnit === "day"} onChange={(e) => setNewResourcePriceUnit(e.target.value)} className="text-[#418a6e] focus:ring-[#418a6e]" />
                            <span className="text-sm">day</span>
                        </label>
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="editResourcePriceUnit" value="week" checked={newResourcePriceUnit === "week"} onChange={(e) => setNewResourcePriceUnit(e.target.value)} className="text-[#418a6e] focus:ring-[#418a6e]" />
                            <span className="text-sm">week</span>
                        </label>
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="editResourcePriceUnit" value="month" checked={newResourcePriceUnit === "month"} onChange={(e) => setNewResourcePriceUnit(e.target.value)} className="text-[#418a6e] focus:ring-[#418a6e]" />
                            <span className="text-sm">month</span>
                        </label>
                    </div>

                    <p className="mt-2 text-xs text-black/50">
                        Set the price per selected time unit. Use 0 for free resources.
                    </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-end gap-3 mt-8 border-t border-black/10 pt-6">
                <button type="button" onClick={() => setEditingResource(null)} className="w-full sm:w-auto rounded-2xl border border-black/10 px-6 py-3 text-sm font-semibold transition-all duration-200 ease-out hover:bg-black/5">Cancel</button>
                <button type="submit" className="w-full sm:w-auto rounded-2xl bg-[#418a6e] text-white shadow-soft px-6 py-3 text-sm font-semibold transition-all duration-200 ease-out hover:bg-[#326953]">Update Resource</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResourcesPage;



