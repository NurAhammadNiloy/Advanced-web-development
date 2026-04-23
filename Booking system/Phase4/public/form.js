
// ===============================
// Form handling for resources page
// ===============================

// -------------- Helpers --------------
function $(id) {
  return document.getElementById(id);
}

// Timestamp
function timestamp() {
  const now = new Date();
  return now.toISOString().replace('T', ' ').replace('Z', '');
}

function normalizeWhitespace(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

// -------------- Form wiring --------------
document.addEventListener("DOMContentLoaded", () => {
  const form = $("resourceForm");
  form.addEventListener("submit", onSubmit);
});

async function onSubmit(event) {
  event.preventDefault();
  const submitter = event.submitter;
  const actionValue = submitter && submitter.value ? submitter.value : "create";
  const selectedUnit = document.querySelector('input[name="resourcePriceUnit"]:checked')?.value ?? "";
  const priceRaw = $("resourcePrice")?.value ?? "";
  const resourcePrice = priceRaw === "" ? 0 : Number(priceRaw);

  const payload = {
    action: actionValue,
    resourceName: normalizeWhitespace($("resourceName")?.value ?? ""),
    resourceDescription: normalizeWhitespace($("resourceDescription")?.value ?? ""),
    resourceAvailable: $("resourceAvailable")?.checked ?? false,
    resourcePrice,
    resourcePriceUnit: selectedUnit
  };

  try {
    console.log("--------------------------");
    console.log("The request send to the server " + `[${timestamp()}]`);
    console.log("--------------------------");
    const response = await fetch("/api/resources", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const resp = await response.json();
    if (!response.ok) {
      const messages = Array.isArray(resp.errors)
        ? resp.errors.map((error) => `${error.field}: ${error.msg}`).join("\n")
        : (resp.error || "Request failed");
      throw new Error(`HTTP ${response.status} ${response.statusText}\n${messages}`);
    }

    // Creates an alert and a log message
    const created_at =resp.data.created_at.replace('T', ' ').replace('Z', '');
    
    let msg = "Name ➡️ "+ resp.data.name + "\n";
    msg += "Created at ➡️ " + created_at + "\n";
    msg += "ID in database ➡️ "+ resp.data.id + "\n";

    console.log("Server response " + `[${timestamp()}]`);
    console.log("--------------------------");
    console.log("Status ➡️ ", response.status);
    console.log("Name ➡️ ", resp.data.name);
    console.log("Description ➡️ ", resp.data.description);
    console.log("Availability ➡️ ", resp.data.available);
    console.log("Price ➡️ ", resp.data.price);
    console.log("Price unit ➡️ ", resp.data.price_unit);
    console.log("Created at ➡️ " + created_at);
    console.log("ID in database ➡️ "+ resp.data.id);
    console.log("--------------------------");
    alert(msg);

  } catch (err) {
    console.error("POST error:", err);
    alert(err.message);
  }
}
