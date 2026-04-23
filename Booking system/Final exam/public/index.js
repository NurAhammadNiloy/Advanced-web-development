const customerList = document.getElementById("customer-list");
const customerForm = document.getElementById("customer-management-form");
const customerId = document.getElementById("customer-id");
const firstName = document.getElementById("first-name");
const lastName = document.getElementById("last-name");
const email = document.getElementById("email");
const phone = document.getElementById("phone");
const birthDate = document.getElementById("birth-date");
const saveButton = document.getElementById("save-customer");
const deleteButton = document.getElementById("delete-customer");
const clearButton = document.getElementById("clear-form");
const formStatus = document.getElementById("form-status");

let customers = [];
let selectedCustomerId = null;

function showMessage(message, type) {
  formStatus.textContent = message;
  formStatus.className = "form-status";

  if (type) {
    formStatus.classList.add(type);
  }
}

function getDateValue(value) {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

function getCustomerFromForm() {
  return {
    first_name: firstName.value.trim(),
    last_name: lastName.value.trim(),
    email: email.value.trim(),
    phone: phone.value.trim(),
    birth_date: birthDate.value,
  };
}

function clearForm(keepMessage) {
  selectedCustomerId = null;
  customerId.value = "";
  customerForm.reset();
  saveButton.textContent = "Add customer";
  deleteButton.disabled = true;

  if (!keepMessage) {
    showMessage("");
  }

  showCustomers();
}

function fillForm(customer) {
  selectedCustomerId = customer.id;
  customerId.value = customer.id;
  firstName.value = customer.first_name || "";
  lastName.value = customer.last_name || "";
  email.value = customer.email || "";
  phone.value = customer.phone || "";
  birthDate.value = getDateValue(customer.birth_date);

  saveButton.textContent = "Update customer";
  deleteButton.disabled = false;
  showMessage("Selected " + customer.first_name + " " + customer.last_name + ".", "info");
  showCustomers();
}

function createCustomerCard(customer) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "customer-card";

  if (customer.id === selectedCustomerId) {
    card.classList.add("selected");
  }

  const nameLine = document.createElement("strong");
  nameLine.textContent = customer.first_name + " " + customer.last_name;

  const emailLine = document.createElement("span");
  emailLine.textContent = customer.email;

  const phoneLine = document.createElement("span");
  phoneLine.textContent = customer.phone || "No phone number";

  const birthDateLine = document.createElement("span");
  if (customer.birth_date) {
    birthDateLine.textContent = "Born " + getDateValue(customer.birth_date);
  } else {
    birthDateLine.textContent = "No birth date";
  }

  card.appendChild(nameLine);
  card.appendChild(emailLine);
  card.appendChild(phoneLine);
  card.appendChild(birthDateLine);

  card.addEventListener("click", function () {
    fillForm(customer);
  });

  return card;
}

function showCustomers() {
  customerList.innerHTML = "";

  if (customers.length === 0) {
    customerList.innerHTML = "<p>No customers found.</p>";
    return;
  }

  for (const customer of customers) {
    const card = createCustomerCard(customer);
    customerList.appendChild(card);
  }
}

async function loadCustomers() {
  try {
    const response = await fetch("/api/persons");

    if (!response.ok) {
      throw new Error("Could not load customers.");
    }

    customers = await response.json();
    showCustomers();
  } catch (error) {
    console.error(error);
    customerList.innerHTML = "<p class='error-text'>Error loading customers.</p>";
  }
}

async function saveCustomer(event) {
  event.preventDefault();

  const customerData = getCustomerFromForm();
  let apiUrl = "/api/persons";
  let requestMethod = "POST";
  let successMessage = "Customer added.";

  if (selectedCustomerId) {
    apiUrl = "/api/persons/" + selectedCustomerId;
    requestMethod = "PUT";
    successMessage = "Customer updated.";
  }

  saveButton.disabled = true;
  showMessage("Saving customer...", "info");

  try {
    const response = await fetch(apiUrl, {
      method: requestMethod,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(customerData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Could not save customer.");
    }

    clearForm(true);
    showMessage(successMessage, "success");
    await loadCustomers();
  } catch (error) {
    console.error(error);
    showMessage(error.message, "error");
  } finally {
    saveButton.disabled = false;
  }
}

async function deleteCustomer() {
  if (!selectedCustomerId) {
    return;
  }

  const selectedCustomer = customers.find(function (customer) {
    return customer.id === selectedCustomerId;
  });

  let customerName = "this customer";
  if (selectedCustomer) {
    customerName = selectedCustomer.first_name + " " + selectedCustomer.last_name;
  }

  const shouldDelete = window.confirm("Delete " + customerName + "?");

  if (!shouldDelete) {
    return;
  }

  deleteButton.disabled = true;
  showMessage("Deleting customer...", "info");

  try {
    const response = await fetch("/api/persons/" + selectedCustomerId, {
      method: "DELETE",
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Could not delete customer.");
    }

    clearForm(true);
    showMessage("Customer deleted.", "success");
    await loadCustomers();
  } catch (error) {
    console.error(error);
    showMessage(error.message, "error");
    deleteButton.disabled = false;
  }
}

customerForm.addEventListener("submit", saveCustomer);
deleteButton.addEventListener("click", deleteCustomer);
clearButton.addEventListener("click", function () {
  clearForm(false);
});

loadCustomers();
