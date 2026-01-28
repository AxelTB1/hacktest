const loginForm = document.getElementById("login-form");
const statusEl = document.getElementById("login-status");

const ADMIN_CODE = "ADMIN-DEMO";

function setStatus(type, message) {
  statusEl.classList.remove("ok", "warn", "error");
  if (type) statusEl.classList.add(type);
  statusEl.textContent = message;
}

function saveUserSession({ email, plan, isAdmin, betaAccess }) {
  const payload = {
    email,
    plan,
    isAdmin,
    betaAccess,
    loggedInAt: new Date().toISOString(),
  };
  localStorage.setItem("wi_user", JSON.stringify(payload));
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const email = loginForm.email.value.trim();
  const password = loginForm.password.value.trim();
  const plan = loginForm.plan.value;
  const adminCode = loginForm["admin-code"].value.trim();

  if (!email || !email.includes("@")) {
    setStatus("error", "Please enter a valid email address.");
    return;
  }

  if (password.length < 4) {
    setStatus("error", "Please enter a password with at least 4 characters.");
    return;
  }

  const isAdmin = adminCode.toUpperCase() === ADMIN_CODE;
  const betaAccess = isAdmin;

  saveUserSession({ email, plan, isAdmin, betaAccess });

  if (isAdmin) {
    setStatus("ok", "Admin mode enabled. Redirecting to tools...");
  } else {
    setStatus("ok", "Logged in. Redirecting to tools...");
  }

  setTimeout(() => {
    window.location.href = "./tools.html";
  }, 900);
});
