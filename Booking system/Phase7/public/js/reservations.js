import { initAuthUI, requireAuthOrBlockPage, logout, getTokenPayload } from "./auth-ui.js";

initAuthUI();
if (!requireAuthOrBlockPage()) {
  throw new Error("Authentication required");
}

window.logout = logout;

const form = document.getElementById("reservationForm");
const listEl = document.getElementById("reservationList");
const messageEl = document.getElementById("formMessage");
const clearBtn = document.getElementById("clearReservation");
const resourcePicker = document.getElementById("resourcePicker");
const resourceHintsEl = document.getElementById("resourceHints");

const reservationIdInput = document.getElementById("reservationId");
const resourceIdInput = document.getElementById("resourceId");
const userIdInput = document.getElementById("userId");
const startTimeInput = document.getElementById("startTime");
const endTimeInput = document.getElementById("endTime");
const noteInput = document.getElementById("note");
const statusInput = document.getElementById("status");

let reservationsCache = [];
let resourcesCache = [];

if (!form || !listEl || !clearBtn) {
  throw new Error("Reservations UI failed to initialize");
}

function ensureFormEditable() {
  const controls = form.querySelectorAll("input, textarea, select, button");

  controls.forEach((control) => {
    if (control.id === "reservationId") return;
    control.disabled = false;
    if ("readOnly" in control) {
      control.readOnly = false;
    }
  });
}

function showMessage(type, text) {
  if (!messageEl) return;

  const typeClasses = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    error: "border-rose-200 bg-rose-50 text-rose-900",
    info: "border-amber-200 bg-amber-50 text-amber-900",
  };

  messageEl.className = `mt-6 rounded-2xl border px-4 py-3 text-sm whitespace-pre-line ${typeClasses[type] || typeClasses.info}`;
  messageEl.textContent = text;
  messageEl.classList.remove("hidden");
}

function clearMessage() {
  if (!messageEl) return;
  messageEl.className = "hidden mt-6 rounded-2xl border px-4 py-3 text-sm";
  messageEl.textContent = "";
}

function getAuthHeaders(includeJson = false) {
  const token = localStorage.getItem("token");
  const headers = {};

  if (includeJson) {
    headers["Content-Type"] = "application/json";
    headers.Accept = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function readBody(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json().catch(() => ({}));
  }

  const raw = await response.text().catch(() => "");
  return { error: raw || "Request failed" };
}

function toInputDateTimeValue(isoString) {
  if (!isoString) return "";

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function toIsoString(inputValue) {
  if (!inputValue) return "";

  const date = new Date(inputValue);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString();
}

function setDefaultUserId() {
  const payload = getTokenPayload();
  if (!payload) return;

  if (!userIdInput.value && payload.sub) {
    userIdInput.value = String(payload.sub);
  }
}

function attachNumericInputGuard(inputEl) {
  if (!inputEl) return;

  inputEl.addEventListener("input", () => {
    inputEl.value = inputEl.value.replace(/\D+/g, "");
  });
}

function getPayloadFromForm() {
  return {
    resourceId: Number(resourceIdInput.value),
    userId: Number(userIdInput.value),
    startTime: toIsoString(startTimeInput.value),
    endTime: toIsoString(endTimeInput.value),
    note: noteInput.value.trim(),
    status: statusInput.value,
  };
}

function validatePayload(payload) {
  if (!Number.isFinite(payload.resourceId) || payload.resourceId < 1) {
    return "Resource ID must be a positive number.";
  }

  if (!Number.isFinite(payload.userId) || payload.userId < 1) {
    return "User ID must be a positive number.";
  }

  if (!payload.startTime || !payload.endTime) {
    return "Start time and end time are required.";
  }

  if (new Date(payload.endTime) <= new Date(payload.startTime)) {
    return "End time must be after start time.";
  }

  return null;
}

function fillForm(reservation) {
  reservationIdInput.value = String(reservation.id);
  resourceIdInput.value = String(reservation.resource_id ?? "");
  userIdInput.value = String(reservation.user_id ?? "");
  startTimeInput.value = toInputDateTimeValue(reservation.start_time);
  endTimeInput.value = toInputDateTimeValue(reservation.end_time);
  noteInput.value = reservation.note || "";
  statusInput.value = reservation.status || "active";
}

function clearForm() {
  reservationIdInput.value = "";
  resourceIdInput.value = "";
  startTimeInput.value = "";
  endTimeInput.value = "";
  noteInput.value = "";
  statusInput.value = "active";
  setDefaultUserId();
  highlightSelected(null);
}

function highlightSelected(id) {
  listEl.querySelectorAll("[data-reservation-id]").forEach((button) => {
    const selected = Number(button.dataset.reservationId) === Number(id);
    button.classList.toggle("ring-2", selected);
    button.classList.toggle("ring-brand-blue/40", selected);
    button.classList.toggle("bg-brand-blue/5", selected);
  });
}

function renderList(items) {
  if (!listEl) return;

  if (!items.length) {
    listEl.innerHTML = '<p class="text-sm text-black/60">No reservations yet.</p>';
    return;
  }

  listEl.innerHTML = items
    .map((reservation) => {
      const start = reservation.start_time ? new Date(reservation.start_time).toLocaleString() : "-";
      const end = reservation.end_time ? new Date(reservation.end_time).toLocaleString() : "-";

      return `
        <button
          type="button"
          data-reservation-id="${reservation.id}"
          class="w-full text-left rounded-2xl border border-black/10 bg-white px-4 py-3 transition hover:bg-black/5"
          title="Select reservation"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="font-semibold truncate">Reservation #${reservation.id}</div>
              <div class="mt-1 text-xs text-black/60 truncate">Resource ${reservation.resource_id} | User ${reservation.user_id}</div>
              <div class="mt-1 text-xs text-black/60 truncate">${start} -> ${end}</div>
            </div>
            <span class="rounded-full border border-black/10 px-2 py-1 text-xs text-black/70">${reservation.status || "active"}</span>
          </div>
        </button>
      `;
    })
    .join("");

  listEl.querySelectorAll("[data-reservation-id]").forEach((button) => {
    button.addEventListener("click", () => {
      clearMessage();
      const id = Number(button.dataset.reservationId);
      const reservation = reservationsCache.find((item) => Number(item.id) === id);
      if (!reservation) return;

      fillForm(reservation);
      highlightSelected(id);
    });
  });
}

function renderResourcePicker(resources) {
  if (!resourcePicker) return;

  resourcePicker.innerHTML = '<option value="">Select a resource</option>';

  resources.forEach((resource) => {
    const option = document.createElement("option");
    option.value = String(resource.id);
    option.textContent = `${resource.id} - ${resource.name || "Unnamed"}`;
    resourcePicker.appendChild(option);
  });
}

function renderResourceHints(resources) {
  if (!resourceHintsEl) return;

  if (!resources.length) {
    resourceHintsEl.innerHTML = "<p>No resources found. Create one in Resources page.</p>";
    return;
  }

  resourceHintsEl.innerHTML = resources
    .map((resource) => `<p>${resource.id} -> ${resource.name || "Unnamed"}</p>`)
    .join("");
}

async function loadResources() {
  try {
    const response = await fetch("/api/resources", {
      headers: getAuthHeaders(),
    });

    const body = await readBody(response);

    if (!response.ok) {
      renderResourcePicker([]);
      renderResourceHints([]);
      return;
    }

    resourcesCache = Array.isArray(body.data) ? body.data : [];
    renderResourcePicker(resourcesCache);
    renderResourceHints(resourcesCache);
  } catch (err) {
    console.error("Load resources failed:", err);
    renderResourcePicker([]);
    renderResourceHints([]);
  }
}

async function loadReservations() {
  try {
    const response = await fetch("/api/reservations", {
      headers: getAuthHeaders(),
    });

    const body = await readBody(response);

    if (!response.ok) {
      showMessage("error", body.error || `Failed to load reservations (${response.status})`);
      renderList([]);
      return;
    }

    reservationsCache = Array.isArray(body.data) ? body.data : [];
    renderList(reservationsCache);
  } catch (err) {
    console.error("Load reservations failed:", err);
    showMessage("error", "Network error while loading reservations.");
    renderList([]);
  }
}

async function submitReservation(action) {
  const payload = getPayloadFromForm();

  if (action !== "delete") {
    const validationError = validatePayload(payload);
    if (validationError) {
      showMessage("error", validationError);
      return;
    }
  }

  const id = reservationIdInput.value;
  let method = "POST";
  let url = "/api/reservations";
  let body = null;

  if (action === "create") {
    method = "POST";
    body = JSON.stringify(payload);
  } else if (action === "update") {
    if (!id) {
      showMessage("error", "Select a reservation before updating.");
      return;
    }

    method = "PUT";
    url = `/api/reservations/${id}`;
    body = JSON.stringify(payload);
  } else if (action === "delete") {
    if (!id) {
      showMessage("error", "Select a reservation before deleting.");
      return;
    }

    method = "DELETE";
    url = `/api/reservations/${id}`;
  }

  try {
    const response = await fetch(url, {
      method,
      headers: body ? getAuthHeaders(true) : getAuthHeaders(),
      body,
    });

    const responseBody = response.status === 204 ? {} : await readBody(response);

    if (!response.ok) {
      showMessage("error", responseBody.error || `Request failed (${response.status})`);
      return;
    }

    if (action === "create") {
      showMessage("success", "Reservation created successfully.");
    } else if (action === "update") {
      showMessage("success", "Reservation updated successfully.");
    } else {
      showMessage("success", "Reservation deleted successfully.");
    }

    clearForm();
    await loadReservations();
  } catch (err) {
    console.error("Reservation action failed:", err);
    showMessage("error", "Network error while sending reservation request.");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage();

  const action = event.submitter?.value;
  if (!action) return;

  await submitReservation(action);
});

clearBtn.addEventListener("click", () => {
  clearMessage();
  clearForm();
});

if (resourcePicker) {
  resourcePicker.addEventListener("change", () => {
    if (!resourcePicker.value) return;
    resourceIdInput.value = resourcePicker.value;
    resourceIdInput.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

ensureFormEditable();
attachNumericInputGuard(resourceIdInput);
attachNumericInputGuard(userIdInput);
setDefaultUserId();
loadResources();
loadReservations();
