const toolsGrid = document.getElementById("tools-grid");
const statusEl = document.getElementById("tools-status");

const TOOL_DATA = [
  {
    id: "header-scan",
    name: "Header & HTTPS-analys",
    description:
      "Analyserar säkerhetsheaders, HTTPS-status och ger rekommendationer.",
    tier: "free",
  },
  {
    id: "dns-health",
    name: "DNS-hälsa (passiv)",
    description:
      "Checklistor för SPF, DKIM och DMARC utan aktiva ändringar.",
    tier: "free",
  },
  {
    id: "osint-lite",
    name: "OSINT-light",
    description:
      "Samlar publika metadata (titel, meta-taggar, robots.txt).",
    tier: "free",
  },
  {
    id: "reporting",
    name: "Rapportgenerator",
    description:
      "Skapar export för ledning/klient i PDF/CSV-format.",
    tier: "pro",
  },
  {
    id: "uptime",
    name: "Uptime & SLA",
    description:
      "Passiv övervakning av svarstider och SLA-trender.",
    tier: "pro",
  },
  {
    id: "beta-attack-surface",
    name: "Beta: Attack Surface Mapping",
    description:
      "Kartlägger exponerade tjänster och subdomäner (endast passiv).",
    tier: "beta",
  },
  {
    id: "beta-ai",
    name: "Beta: AI-baserad riskbedömning",
    description:
      "Sammanfattar risker och prioriterar åtgärder med AI.",
    tier: "beta",
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
      "Du är inte inloggad. Logga in för att låsa upp premium- och beta-verktyg.";
    return;
  }

  const planLabel = user.plan === "pro" ? "Pro" : "Free";
  const adminLabel = user.isAdmin ? "Admin" : "Standard";
  statusEl.textContent = `Inloggad som ${user.email} • Plan: ${planLabel} • Roll: ${adminLabel}`;
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
    action.textContent = allowed ? "Öppna" : "Låst";
    action.disabled = !allowed;

    const lockText = document.createElement("span");
    lockText.className = "tool-lock";
    if (!allowed) {
      if (tool.tier === "pro") {
        lockText.textContent = "Kräver Pro (19,99 USD/mån).";
      } else if (tool.tier === "beta") {
        lockText.textContent = "Kräver admin + betaåtkomst.";
      }
    } else {
      lockText.textContent = "Tillgänglig";
    }

    footer.append(action, lockText);
    card.append(badge, title, description, footer);
    toolsGrid.appendChild(card);
  });
}

const user = getUserSession();
renderStatus(user);
renderTools(user);
