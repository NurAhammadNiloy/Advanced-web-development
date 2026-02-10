const actions = document.getElementById("resourceActions");

function addButton({ label, type = "button", value, classes }) {
  const btn = document.createElement("button");
  btn.type = type;
  btn.textContent = label;
  btn.name = "action";
  btn.value = value;
  btn.className = `
    w-full rounded-2xl px-6 py-3 text-sm font-semibold transition-all duration-200 ease-out
    ${classes}
  `;
  actions.appendChild(btn);
}

// Example roles
const role = "admin"; // "reserver" | "admin"

if (role === "reserver") {
  addButton({
    label: "Create",
    type: "submit",
    classes: "bg-brand-primary text-white hover:bg-brand-dark/80 shadow-soft"
  });
}

if (role === "admin") {
  addButton({
    label: "Create",
    type: "submit",
    value: "create",
    classes: "bg-brand-primary text-white hover:bg-brand-dark/80 shadow-soft"
  });
  addButton({
    label: "Update",
    value: "update",
    classes: "border border-brand-blue text-brand-blue hover:bg-brand-dark hover:text-white"
  });
  addButton({
    label: "Delete",
    value: "delete",
    classes: "border border-brand-rose text-brand-rose hover:bg-brand-rose hover:text-white"
  });
}
