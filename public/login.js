const loginForm = document.getElementById("login-form");
const statusEl = document.getElementById("login-status");
const fillDemoBtn = document.getElementById("fill-demo");

const ADMIN_CODE = "ADMIN-DEMO";
const DEMO_ACCOUNT = {
  username: "tester1",
  password: "123",
};

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

  const isDemoUser = email === DEMO_ACCOUNT.username;
  if (!email || (!isDemoUser && !email.includes("@"))) {
    setStatus(
      "error",
      "Please enter a valid email address or use the demo username."
    );
    return;
  }

  if (isDemoUser && password !== DEMO_ACCOUNT.password) {
    setStatus("error", "Incorrect demo password.");
    return;
  }

  if (!isDemoUser && password.length < 4) {
    setStatus("error", "Please enter a password with at least 4 characters.");
    return;
  }

  const isAdmin = adminCode.toUpperCase() === ADMIN_CODE;
  const betaAccess = isAdmin;

  const storedEmail = isDemoUser ? "tester1" : email;
  saveUserSession({ email: storedEmail, plan, isAdmin, betaAccess });

  if (isAdmin) {
    setStatus("ok", "Admin mode enabled. Redirecting to tools...");
  } else {
    setStatus("ok", "Logged in. Redirecting to tools...");
  }

  setTimeout(() => {
    window.location.href = "./tools.html";
  }, 900);
});

if (fillDemoBtn) {
  fillDemoBtn.addEventListener("click", () => {
    loginForm.email.value = DEMO_ACCOUNT.username;
    loginForm.password.value = DEMO_ACCOUNT.password;
    loginForm.plan.value = "pro";
    loginForm["admin-code"].value = "";
    setStatus(null, "");
  });
}
