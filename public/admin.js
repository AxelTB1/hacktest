const statusEl = document.getElementById("admin-status");
const toggleBetaBtn = document.getElementById("toggle-beta");
const planButtons = document.querySelectorAll("button[data-plan]");
const createAdminBtn = document.getElementById("create-admin");
const logoutBtn = document.getElementById("logout");
const secretToggleBtn = document.getElementById("toggle-admin-secret");
const secretPanel = document.getElementById("admin-secret-panel");
const secretInput = document.getElementById("admin-secret-input");
const secretSubmit = document.getElementById("admin-secret-submit");
const secretStatus = document.getElementById("admin-secret-status");

const ADMIN_SECRET = "test";

function getUserSession() {
  const raw = localStorage.getItem("wi_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveUserSession(user) {
  localStorage.setItem("wi_user", JSON.stringify(user));
}

function setStatus(message, type = "info") {
  statusEl.textContent = message;
  statusEl.classList.remove("status-ok", "status-warn");
  if (type === "ok") statusEl.classList.add("status-ok");
  if (type === "warn") statusEl.classList.add("status-warn");
}

function setSecretStatus(type, message) {
  secretStatus.classList.remove("ok", "warn", "error");
  if (type) secretStatus.classList.add(type);
  secretStatus.textContent = message;
}

function ensureAdminSession() {
  const existing = getUserSession();
  const user = existing || {
    email: "admin@demo.local",
    plan: "pro",
    isAdmin: true,
    betaAccess: true,
    loggedInAt: new Date().toISOString(),
  };

  user.isAdmin = true;
  user.betaAccess = true;
  if (!user.plan) {
    user.plan = "pro";
  }

  saveUserSession(user);
  updateAdminState();
}

function updateAdminState() {
  const user = getUserSession();
  if (!user || !user.isAdmin) {
    setStatus(
      "No admin session found. Log in with the admin code or create an admin demo.",
      "warn"
    );
    toggleBetaBtn.disabled = true;
    planButtons.forEach((btn) => (btn.disabled = true));
    return;
  }

  toggleBetaBtn.disabled = false;
  planButtons.forEach((btn) => (btn.disabled = false));

  const planLabel = user.plan === "pro" ? "Pro" : "Free";
  const betaLabel = user.betaAccess ? "On" : "Off";
  setStatus(
    `Admin active: ${user.email} • Plan: ${planLabel} • Beta: ${betaLabel}`,
    "ok"
  );
}

createAdminBtn.addEventListener("click", () => {
  const user = {
    email: "admin@demo.local",
    plan: "pro",
    isAdmin: true,
    betaAccess: true,
    loggedInAt: new Date().toISOString(),
  };
  saveUserSession(user);
  updateAdminState();
});

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("wi_user");
  updateAdminState();
});

planButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const user = getUserSession();
    if (!user || !user.isAdmin) return;
    user.plan = btn.dataset.plan;
    saveUserSession(user);
    updateAdminState();
  });
});

toggleBetaBtn.addEventListener("click", () => {
  const user = getUserSession();
  if (!user || !user.isAdmin) return;
  user.betaAccess = !user.betaAccess;
  saveUserSession(user);
  updateAdminState();
});

if (secretToggleBtn) {
  secretToggleBtn.addEventListener("click", () => {
    secretPanel.classList.toggle("hidden");
    setSecretStatus(null, "");
  });
}

if (secretSubmit) {
  secretSubmit.addEventListener("click", () => {
    const value = secretInput.value.trim();
    if (!value) {
      setSecretStatus("warn", "Enter the admin password.");
      return;
    }
    if (value === ADMIN_SECRET) {
      ensureAdminSession();
      setSecretStatus("ok", "Admin access unlocked.");
      secretInput.value = "";
    } else {
      setSecretStatus("error", "Incorrect password.");
    }
  });
}

updateAdminState();
