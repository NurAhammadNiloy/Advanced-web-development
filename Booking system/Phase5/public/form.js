// ===============================
// Form handling for resources page
// ===============================

// -------------- Helpers --------------
function $(id) {
  return document.getElementById(id);
}

function getFormMessageEl() {
  return document.getElementById("formMessage");
}

/**
 * Show a success/error/info message in the UI.
 * type: "success" | "error" | "info"
 */
function showFormMessage(type, message) {
  const el = getFormMessageEl();
  if (!el) return;

  // Base styling
  el.className = "mt-6 rounded-2xl border px-4 py-3 text-sm whitespace-pre-line";
  el.classList.remove("hidden");

  // Type-specific styling (Tailwind utility classes)
  if (type === "success") {
    el.classList.add("border-emerald-200", "bg-emerald-50", "text-emerald-900");
  } else if (type === "info") {
    el.classList.add("border-amber-200", "bg-amber-50", "text-amber-900");
  } else {
    // error (default)
    el.classList.add("border-rose-200", "bg-rose-50", "text-rose-900");
  }

  // Preserve line breaks
  el.textContent = message;

  // Bring message into view (nice UX after submit)
  el.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function clearFormMessage() {
  const el = getFormMessageEl();
  if (!el) return;
  el.textContent = "";
  el.classList.add("hidden");
}


/**
 * Build a readable message for field validation errors returned by the API.
 * Expected format: { errors: [ { field, msg }, ... ] }
 */
function buildValidationMessage(errors) {
  const labels = {
    action: "Action",
    resourceName: "Resource name",
    resourceDescription: "Resource description",
    resourceAvailable: "Availability",
    resourcePrice: "Price",
    resourcePriceUnit: "Price unit",
  };

  if (!Array.isArray(errors) || errors.length === 0) {
    return "The resource was not created because one or more fields were invalid. Please review the form and try again.";
  }

  const lines = errors.map((e) => {
    const field = labels[e.field] || e.field || "Field";
    const msg = e.msg || "Invalid value";
    return `• ${field}: ${msg}`;
  });

  return `The resource was not created because some values did not pass server validation.\n\nPlease correct the fields below and submit again:\n${lines.join("\n")}`;
}

/**
 * Build a readable message for generic API errors.
 */
function buildGenericErrorMessage(status, body) {
  const details = body?.details ? `\n\nDetails: ${body.details}` : "";
  const error = body?.error ? body.error : "Request failed";
  return `Server returned an error (${status}).\n\nReason: ${error}${details}`;
}

// -------------- Form wiring --------------
document.addEventListener("DOMContentLoaded", () => {
  const form = $("resourceForm");
  if (!form) return;
  form.addEventListener("submit", onSubmit);
});

async function onSubmit(event) {
  event.preventDefault();

  const submitter = event.submitter;
  const actionValue = submitter && submitter.value ? submitter.value : "create";

  const selectedUnit =
    document.querySelector('input[name="resourcePriceUnit"]:checked')?.value ?? "";

  const priceRaw = $("resourcePrice")?.value ?? "";
  const resourcePrice = priceRaw === "" ? 0 : Number(priceRaw);

  const payload = {
    action: actionValue,
    resourceName: $("resourceName")?.value ?? "",
    resourceDescription: $("resourceDescription")?.value ?? "",
    resourceAvailable: $("resourceAvailable")?.checked ?? false,
    resourcePrice,
    resourcePriceUnit: selectedUnit,
  };

  try {
    clearFormMessage();
    const response = await fetch("/api/resources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    let body = {};
    try {
      body = await response.json();
    } catch {
      body = {};
    }

    // -----------------------------------------
    // Error handling by HTTP status
    // -----------------------------------------
    if (!response.ok) {
      // 400 = server-side validation errors (we expect errors[])
      if (response.status === 400) {
        const msg = buildValidationMessage(body?.errors);
        showFormMessage("error", msg);
        return;
      }

      // 409 = duplicate resourceName (our new feature)
      if (response.status === 409) {
        const msg =
          body?.details ||
          "A resource with the same name already exists. Choose a different name or check the existing resource list.";
        showFormMessage("info", `Resource not created.\n\n${msg}`);
        return;
      }

      // Other errors (500, 404, etc.)
      showFormMessage("error", buildGenericErrorMessage(response.status, body));
      return;
    }

    // -----------------------------------------
    // Success handling (2xx)
    // -----------------------------------------
    // We expect: { ok: true, data: {...} }
    const createdAtIso = body?.data?.created_at || "";
    const createdAt = createdAtIso
      ? createdAtIso.replace("T", " ").replace("Z", "")
      : "";

    const msgLines = [];
    msgLines.push("Resource created successfully.");
    msgLines.push(`Name: ${body?.data?.name ?? ""}`);
    msgLines.push(`Database ID: ${body?.data?.id ?? ""}`);
    if (createdAt) msgLines.push(`Created at: ${createdAt}`);
    msgLines.push("You can now add another resource or review the new entry in the list.");

    const msg = msgLines.join("\n");
    showFormMessage("success", msg);

    // Notify UI layer (resources.js)
    if (typeof window.onResourceActionSuccess === "function") {
      window.onResourceActionSuccess({
        action: actionValue,
        data: "success"
      });
    }

  } catch (err) {
    // Network errors, CORS issues, server unreachable, etc.
    console.error("POST error:", err);
    showFormMessage("error", "Network error: Could not reach the server. Check your environment and try again.");
  }
}