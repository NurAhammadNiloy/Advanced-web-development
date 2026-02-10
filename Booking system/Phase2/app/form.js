// ===============================
// Form handling for resources page
// ===============================

// -------------- Constants --------------
const VALID_PATTERN = /^[a-zA-Z0-9äöåÄÖÅ ]+$/;

const VALID_CLASSES = ["border-green-500", "bg-green-100", "focus:ring-green-500/30"];
const INVALID_CLASSES = ["border-red-500", "bg-red-100", "focus:ring-red-500/30"];
const NEUTRAL_CLASSES = ["focus:border-brand-blue", "focus:ring-brand-blue/30"];

// -------------- Helpers --------------
function $(id) {
  return document.getElementById(id);
}

function cleanString(v) {
  return (v ?? "").toString().trim();
}

function markTouched(el) {
  if (!el) return;
  el.dataset.touched = "true";
}

function setValidity(el, ok) {
  if (!el) return;
  
  // Remove all validation classes
  el.classList.remove(...VALID_CLASSES, ...INVALID_CLASSES, ...NEUTRAL_CLASSES);
  el.classList.add("focus:ring-2");
  
  // If not touched, show neutral state
  if (el.dataset.touched !== "true") {
    el.classList.add(...NEUTRAL_CLASSES);
    return;
  }
  
  // Apply valid or invalid styling
  if (ok) {
    el.classList.add(...VALID_CLASSES);
  } else {
    el.classList.add(...INVALID_CLASSES);
  }
}

function isMeaningful(value, minLen, maxLen) {
  const s = cleanString(value);
  if (s.length < minLen) return false;
  if (typeof maxLen === "number" && s.length > maxLen) return false;
  return true;
}

function matchesPattern(value) {
  const s = cleanString(value);
  return s.length === 0 || VALID_PATTERN.test(s);
}

function validateName() {
  const el = $("resourceName");
  const value = cleanString(el?.value);
  const lengthOk = isMeaningful(value, 5, 30);
  const patternOk = matchesPattern(value);
  const ok = lengthOk && patternOk;
  setValidity(el, ok);
  return ok;
}

function validateDescription() {
  const el = $("resourceDescription");
  const value = cleanString(el?.value);
  const lengthOk = isMeaningful(value, 10, 50);
  const patternOk = matchesPattern(value);
  const ok = lengthOk && patternOk;
  setValidity(el, ok);
  return ok;
}

function validatePrice() {
  const el = $("resourcePrice");
  if (!el) return true; // Price field optional if not present
  
  const value = el.value.trim();
  // Empty is invalid - price is required
  if (value === "") {
    setValidity(el, false);
    return false;
  }
  
  const num = parseFloat(value);
  const ok = !isNaN(num) && num >= 0;
  setValidity(el, ok);
  return ok;
}

function allValid() {
  return validateName() && validateDescription() && validatePrice();
}

function updateCreateButton() {
  const btn = $("createResourceBtn");
  if (!btn) return;
  btn.disabled = !allValid();
}

function showError(message) {
  const el = $("formErrorMessage");
  if (!el) return;
  el.textContent = message;
  el.classList.remove("hidden");
}

function hideError() {
  const el = $("formErrorMessage");
  if (!el) return;
  el.textContent = "";
  el.classList.add("hidden");
}

export function getCleanResourcePayload() {
  // Get the selected price unit from radio buttons
  const priceUnitRadios = document.querySelectorAll('input[name="resourcePriceUnit"]');
  let selectedPriceUnit = "hour"; // default
  priceUnitRadios.forEach(radio => {
    if (radio.checked) selectedPriceUnit = radio.value;
  });

  return {
    resourceName: cleanString($("resourceName")?.value),
    resourceDescription: cleanString($("resourceDescription")?.value),
    resourceAvailable: $("resourceAvailable")?.checked ?? false,
    resourcePrice: parseFloat($("resourcePrice")?.value) || 0,
    resourcePriceUnit: selectedPriceUnit
  };
}

export function validateBeforeSubmit() {
  markTouched($("resourceName"));
  markTouched($("resourceDescription"));
  markTouched($("resourcePrice"));
  const ok = allValid();
  updateCreateButton();
  return ok;
}

// -------------- Form wiring --------------
document.addEventListener("DOMContentLoaded", () => {
  const form = $("resourceForm");
  if (!form) {
    console.warn("resourceForm not found. Ensure the form has id=\"resourceForm\".");
    return;
  }

  const createBtn = $("createResourceBtn");
  if (createBtn) createBtn.disabled = true;

  const nameEl = $("resourceName");
  const descEl = $("resourceDescription");
  const priceEl = $("resourcePrice");

  // Name field listeners
  nameEl?.addEventListener("blur", () => {
    markTouched(nameEl);
    updateCreateButton();
  });
  nameEl?.addEventListener("input", updateCreateButton);

  // Description field listeners
  descEl?.addEventListener("blur", () => {
    markTouched(descEl);
    updateCreateButton();
  });
  descEl?.addEventListener("input", updateCreateButton);

  // Price field listeners
  priceEl?.addEventListener("blur", () => {
    markTouched(priceEl);
    updateCreateButton();
  });
  priceEl?.addEventListener("input", updateCreateButton);

  updateCreateButton();

  form.addEventListener("submit", (e) => {
    hideError();
    
    if (!validateBeforeSubmit()) {
      e.preventDefault();
      e.stopPropagation();
      showError("Please correct the highlighted fields before submitting.");
      return;
    }

    // Get clean payload for submission
    const payload = getCleanResourcePayload();
    console.log("Submitting resource:", payload);
    
    // For now, prevent default form submission (no backend yet)
    // When backend is added, this can be replaced with fetch()
    e.preventDefault();
    
    // Simulate successful submission feedback
    hideError();
    alert("Resource data is valid and ready to submit!\n\n" + JSON.stringify(payload, null, 2));
  });
});
