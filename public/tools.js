const toolsGrid = document.getElementById("tools-grid");
const statusEl = document.getElementById("tools-status");
const detailTitle = document.getElementById("tool-detail-title");
const detailSummary = document.getElementById("tool-detail-summary");
const detailBody = document.getElementById("tool-detail-body");

const TOOL_DATA = [
  {
    id: "header-scan",
    name: "Header & HTTPS snapshot",
    description:
      "Review security headers, HTTPS usage, and guidance with a demo output.",
    tier: "free",
    detail: {
      summary:
        "Run a simulated scan to see what a report looks like and which headers matter.",
      steps: [
        "Enter your domain in the App tab and verify it.",
        "Click “Run security scan” for live results (backend required).",
        "Use this demo output as a reference if the backend is not running.",
      ],
      demoOutput: {
        status: 200,
        https: "Enabled",
        missingHeaders: ["HSTS", "Content-Security-Policy", "Referrer-Policy"],
        recommendations: [
          "Add Strict-Transport-Security (HSTS).",
          "Create a Content-Security-Policy (CSP).",
          "Add Referrer-Policy and Permissions-Policy.",
        ],
      },
    },
  },
  {
    id: "dns-health",
    name: "DNS hygiene checklist",
    description:
      "A practical checklist for SPF, DKIM, and DMARC without touching DNS.",
    tier: "free",
    detail: {
      summary:
        "Mark items as you complete them. This list is safe and passive.",
      checklist: [
        "Confirm SPF record exists (example: v=spf1 include:_spf.google.com ~all).",
        "Ensure DKIM signing is enabled in your email provider.",
        "Create a DMARC policy (start with p=none, then move to quarantine/reject).",
        "Set a reporting mailbox for DMARC (rua/ruff).",
      ],
    },
  },
  {
    id: "osint-lite",
    name: "OSINT-lite snapshot",
    description:
      "A passive checklist to capture public metadata and exposure.",
    tier: "free",
    detail: {
      summary:
        "Use this checklist to gather public data before a security review.",
      checklist: [
        "Capture page title and description meta tags.",
        "Check robots.txt for disallowed paths.",
        "Identify public contact emails and admin endpoints.",
        "Document visible frameworks or generators.",
      ],
    },
  },
  {
    id: "security-checklist",
    name: "Security basics checklist",
    description:
      "A simple, working checklist for common security best practices.",
    tier: "free",
    detail: {
      summary:
        "Use this checklist to track foundational security tasks.",
      checklist: [
        "Enable HTTPS and redirect all HTTP traffic.",
        "Add HSTS, CSP, X-Frame-Options, and X-Content-Type-Options.",
        "Remove X-Powered-By/Server header details.",
        "Enable logging and alerting for suspicious traffic.",
      ],
    },
  },
  {
    id: "reporting",
    name: "Report generator",
    description: "Create exportable summaries for stakeholders (PDF/CSV).",
    tier: "pro",
    detail: {
      summary:
        "Pro users can export reports. In demo mode, this shows a sample layout.",
      steps: [
        "Complete a scan in the App.",
        "Click Export to generate PDF/CSV.",
        "Share the report with your team or client.",
      ],
      demoOutput: {
        reportName: "Website Inspector Report",
        sections: ["Overview", "Findings", "Recommendations"],
      },
    },
  },
  {
    id: "uptime",
    name: "Uptime & SLA overview",
    description: "Track response time trends and uptime signals.",
    tier: "pro",
    detail: {
      summary: "Pro users can monitor uptime. Demo shows sample values.",
      demoOutput: {
        uptime: "99.95%",
        avgResponse: "180ms",
        incidents: "0 (last 30 days)",
      },
    },
  },
  {
    id: "beta-attack-surface",
    name: "Beta: Attack surface mapping",
    description:
      "Map exposed services and subdomains (passive discovery only).",
    tier: "beta",
    detail: {
      summary:
        "Admin beta access required. Demo shows how the output looks.",
      demoOutput: {
        subdomains: ["api.example.com", "status.example.com"],
        services: ["HTTPS (443)", "SSH (22)"],
      },
    },
  },
  {
    id: "beta-ai",
    name: "Beta: AI risk prioritization",
    description:
      "Summarize risks and prioritize fixes with AI (demo output only).",
    tier: "beta",
    detail: {
      summary:
        "Admin beta access required. Use this to preview a prioritization report.",
      demoOutput: {
        topRisks: [
          "Missing CSP header",
          "No HSTS policy",
          "Server header exposure",
        ],
        nextSteps: [
          "Add CSP",
          "Enable HSTS",
          "Harden server header",
        ],
      },
    },
  },
];

function getUserSession() {
  const raw = localStorage.getItem("wi_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function formatTier(tier) {
  if (tier === "free") return "Free";
  if (tier === "pro") return "Pro";
  if (tier === "beta") return "Beta";
  return "";
}

function hasAccess(user, tier) {
  if (tier === "free") return true;
  if (tier === "pro") return user?.plan === "pro";
  if (tier === "beta") return Boolean(user?.betaAccess);
  return false;
}

function renderStatus(user) {
  if (!user) {
    statusEl.textContent =
      "You are not logged in. Log in to unlock premium and beta tools.";
    return;
  }

  const planLabel = user.plan === "pro" ? "Pro" : "Free";
  const adminLabel = user.isAdmin ? "Admin" : "Standard";
  statusEl.textContent = `Logged in as ${user.email} • Plan: ${planLabel} • Role: ${adminLabel}`;
}

function renderChecklist(items = []) {
  const list = document.createElement("ul");
  list.className = "tool-checklist";

  items.forEach((item) => {
    const li = document.createElement("li");
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    const text = document.createElement("span");
    text.textContent = item;
    label.append(checkbox, text);
    li.append(label);
    list.appendChild(li);
  });

  return list;
}

function renderDemoOutput(output) {
  const pre = document.createElement("pre");
  pre.className = "code-block";
  pre.textContent = JSON.stringify(output, null, 2);
  return pre;
}

function renderToolDetail(tool, allowed) {
  detailTitle.textContent = tool.name;
  detailSummary.textContent = tool.detail?.summary || "";
  detailBody.innerHTML = "";

  if (!allowed) {
    const locked = document.createElement("p");
    locked.className = "muted";
    locked.textContent =
      "This tool is locked for your plan. Upgrade or request admin access.";
    detailBody.appendChild(locked);
    return;
  }

  if (tool.detail?.steps?.length) {
    const stepsTitle = document.createElement("h3");
    stepsTitle.textContent = "Steps";
    const stepsList = document.createElement("ol");
    stepsList.className = "tool-steps";
    tool.detail.steps.forEach((step) => {
      const li = document.createElement("li");
      li.textContent = step;
      stepsList.appendChild(li);
    });
    detailBody.append(stepsTitle, stepsList);
  }

  if (tool.detail?.checklist?.length) {
    const checklistTitle = document.createElement("h3");
    checklistTitle.textContent = "Checklist";
    detailBody.append(checklistTitle, renderChecklist(tool.detail.checklist));
  }

  if (tool.detail?.demoOutput) {
    const demoTitle = document.createElement("h3");
    demoTitle.textContent = "Demo output";
    detailBody.append(demoTitle, renderDemoOutput(tool.detail.demoOutput));
  }
}

function renderTools(user) {
  toolsGrid.innerHTML = "";

  TOOL_DATA.forEach((tool) => {
    const card = document.createElement("article");
    card.className = "tool-card";

    const allowed = hasAccess(user, tool.tier);
    if (!allowed) card.classList.add("locked");

    const badge = document.createElement("div");
    badge.className = "tool-badge";
    badge.textContent = formatTier(tool.tier);

    const title = document.createElement("h3");
    title.textContent = tool.name;

    const description = document.createElement("p");
    description.textContent = tool.description;

    const footer = document.createElement("div");
    footer.className = "tool-footer";

    const action = document.createElement("button");
    action.className = "btn-secondary";
    action.textContent = allowed ? "Open" : "Locked";
    action.disabled = !allowed;
    action.addEventListener("click", () => renderToolDetail(tool, allowed));

    const lockText = document.createElement("span");
    lockText.className = "tool-lock";
    if (!allowed) {
      if (tool.tier === "pro") {
        lockText.textContent = "Requires Pro ($19.99/month).";
      } else if (tool.tier === "beta") {
        lockText.textContent = "Requires admin + beta access.";
      }
    } else {
      lockText.textContent = "Available";
    }

    footer.append(action, lockText);
    card.append(badge, title, description, footer);
    toolsGrid.appendChild(card);
  });
}

const user = getUserSession();
renderStatus(user);
renderTools(user);
renderToolDetail(TOOL_DATA[0], hasAccess(user, TOOL_DATA[0].tier));

window.addEventListener("storage", () => {
  const updatedUser = getUserSession();
  renderStatus(updatedUser);
  renderTools(updatedUser);
});
