const statusEl = document.getElementById("admin-status");
const toggleBetaBtn = document.getElementById("toggle-beta");
const planButtons = document.querySelectorAll("button[data-plan]");
const createAdminBtn = document.getElementById("create-admin");
const logoutBtn = document.getElementById("logout");

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

function updateAdminState() {
  const user = getUserSession();
  if (!user || !user.isAdmin) {
    setStatus(
      "Ingen admin-session hittades. Logga in med admin-kod eller skapa en admin-demo.",
      "warn"
    );
    toggleBetaBtn.disabled = true;
    planButtons.forEach((btn) => (btn.disabled = true));
    return;
  }

  toggleBetaBtn.disabled = false;
  planButtons.forEach((btn) => (btn.disabled = false));

  const planLabel = user.plan === "pro" ? "Pro" : "Free";
  const betaLabel = user.betaAccess ? "På" : "Av";
  setStatus(
    `Admin aktiv: ${user.email} • Plan: ${planLabel} • Beta: ${betaLabel}`,
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

updateAdminState();
