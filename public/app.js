const apiBase = "";

const registerForm = document.getElementById("register-form");
const domainInput = document.getElementById("domain-input");
const registerResult = document.getElementById("register-result");
const metaSnippetEl = document.getElementById("meta-snippet");
const fileUrlEl = document.getElementById("file-url");
const fileContentEl = document.getElementById("file-content");
const dnsRecordEl = document.getElementById("dns-record");
const verifyButton = document.getElementById("verify-button");
const verifyStatus = document.getElementById("verify-status");
const scanButton = document.getElementById("scan-button");
const scanStatus = document.getElementById("scan-status");
const scanResult = document.getElementById("scan-result");
const scanUrl = document.getElementById("scan-url");
const scanHttpStatus = document.getElementById("scan-http-status");
const scanHttps = document.getElementById("scan-https");
const scanHeaders = document.getElementById("scan-headers");
const scanTech = document.getElementById("scan-tech");
const scanIssues = document.getElementById("scan-issues");
const scanRecommendations = document.getElementById("scan-recommendations");
const demoBanner = document.getElementById("demo-banner");

let currentDomainId = null;
let currentDomainHost = null;

const DEMO_MODE =
  new URLSearchParams(window.location.search).get("demo") === "true" ||
  window.location.protocol === "file:" ||
  window.location.hostname.endsWith("github.io");

const DEMO_STORAGE_KEY = "wi_demo_domains";

function setStatus(el, type, message) {
  el.classList.remove("ok", "warn", "error");
  if (type) el.classList.add(type);
  el.textContent = message || "";
}

function setDemoBanner() {
  if (!demoBanner) return;
  demoBanner.classList.remove("status-warn", "status-ok");
  if (DEMO_MODE) {
    demoBanner.classList.add("status-warn");
    demoBanner.textContent =
      "Demo mode active: results are simulated because no backend is available.";
  } else {
    demoBanner.classList.add("status-ok");
    demoBanner.textContent =
      "Live mode: backend detected. Real scans and verification are enabled.";
  }
}

function normalizeHost(host) {
  if (!host) return null;
  let trimmed = host.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }
  try {
    const url = new URL(trimmed);
    return url.hostname;
  } catch {
    return null;
  }
}

function loadDemoDomains() {
  const raw = localStorage.getItem(DEMO_STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveDemoDomains(domains) {
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(domains));
}

function getDemoDomain(id) {
  return loadDemoDomains().find((domain) => domain.id === id) || null;
}

function buildInstructions(domain) {
  return {
    metaTag: `<meta name="website-inspector-verification" content="${domain.token}">`,
    filePath: `https://${domain.host}/.well-known/website-inspector-${domain.token}.txt`,
    fileContent: domain.token,
    dnsTxtName: domain.host,
    dnsTxtValue: `website-inspector=${domain.token}`,
  };
}

function createDemoDomain(host) {
  const id = `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const token =
    Math.random().toString(36).slice(2, 10) +
    "-" +
    Math.random().toString(36).slice(2, 10);
  const now = new Date().toISOString();
  return {
    id,
    host,
    token,
    verified: false,
    createdAt: now,
    lastScan: null,
  };
}

async function demoRequest(path, options = {}) {
  if (path === "/api/domains" && options.method === "POST") {
    const body = JSON.parse(options.body || "{}");
    const normalized = normalizeHost(body.host);
    if (!normalized) {
      throw new Error("Please enter a valid domain (example.com).");
    }
    const domain = createDemoDomain(normalized);
    const domains = loadDemoDomains();
    domains.push(domain);
    saveDemoDomains(domains);
    return { domain, instructions: buildInstructions(domain) };
  }

  const matchVerify = path.match(/\/api\/domains\/(.+)\/verify/);
  if (matchVerify && options.method === "POST") {
    const domain = getDemoDomain(matchVerify[1]);
    if (!domain) throw new Error("Domain not found in demo storage.");
    domain.verified = true;
    const domains = loadDemoDomains().map((item) =>
      item.id === domain.id ? domain : item
    );
    saveDemoDomains(domains);
    return {
      domain,
      checks: { meta: true, file: false, dns: false },
      verified: true,
      message: "Demo verification complete. You control this domain (simulated).",
    };
  }

  const matchScan = path.match(/\/api\/domains\/(.+)\/scan/);
  if (matchScan && options.method === "POST") {
    const domain = getDemoDomain(matchScan[1]);
    if (!domain) throw new Error("Domain not found in demo storage.");
    if (!domain.verified) {
      throw new Error("Please verify the domain before running a scan.");
    }

    const analysis = {
      url: `https://${domain.host}`,
      status: 200,
      usedHttps: true,
      headers: {
        hsts: false,
        csp: false,
        xFrameOptions: true,
        xContentTypeOptions: true,
        referrerPolicy: false,
        permissionsPolicy: false,
        server: "demo-server",
        poweredBy: null,
      },
      techHints: ["Static HTML", "Demo mode"],
      issues: [
        "Some security headers are missing (demo).",
        "Server header reveals technology (demo).",
      ],
      recommendations: [
        "Add HSTS and a Content-Security-Policy.",
        "Add Referrer-Policy and Permissions-Policy headers.",
        "Remove or minimize the Server header.",
      ],
    };

    const now = new Date().toISOString();
    domain.lastScan = { at: now, analysis };
    const domains = loadDemoDomains().map((item) =>
      item.id === domain.id ? domain : item
    );
    saveDemoDomains(domains);

    return { domain, scan: domain.lastScan };
  }

  throw new Error("Demo endpoint not implemented for this request.");
}

async function apiRequest(path, options = {}) {
  if (DEMO_MODE) {
    return demoRequest(path, options);
  }

  try {
    const res = await fetch(apiBase + path, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    let data = null;
    try {
      data = await res.json();
    } catch {
      // ignore
    }
    if (!res.ok) {
      const msg = (data && (data.error || data.message)) || "Something went wrong.";
      throw new Error(msg);
    }
    return data;
  } catch (err) {
    throw new Error(
      "Backend not reachable. Start the server with `npm run start` or use demo mode."
    );
  }
}

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const host = domainInput.value.trim();
  if (!host) return;

  setStatus(verifyStatus, null, "");
  setStatus(scanStatus, null, "");
  scanResult.classList.add("hidden");
  scanButton.disabled = true;

  try {
    const data = await apiRequest("/api/domains", {
      method: "POST",
      body: JSON.stringify({ host }),
    });

    const { domain, instructions } = data;
    currentDomainId = domain.id;
    currentDomainHost = domain.host;

    registerResult.classList.remove("hidden");

    metaSnippetEl.textContent = instructions.metaTag;
    fileUrlEl.textContent = instructions.filePath;
    fileContentEl.textContent = instructions.fileContent;
    dnsRecordEl.textContent = `${instructions.dnsTxtName}  TXT  "${instructions.dnsTxtValue}"`;

    setStatus(
      verifyStatus,
      "warn",
      "Add one verification method and click “Check verification”."
    );
  } catch (err) {
    setStatus(verifyStatus, "error", err.message);
  }
});

verifyButton.addEventListener("click", async () => {
  if (!currentDomainId) {
    setStatus(
      verifyStatus,
      "error",
      "Register a domain before attempting verification."
    );
    return;
  }

  setStatus(verifyStatus, null, "Checking verification...");

  try {
    const data = await apiRequest(`/api/domains/${currentDomainId}/verify`, {
      method: "POST",
      body: JSON.stringify({}),
    });

    if (data.verified) {
      setStatus(
        verifyStatus,
        "ok",
        "Domain verified — you control this domain."
      );
      scanButton.disabled = false;
    } else {
      setStatus(
        verifyStatus,
        "warn",
        "No verification method found yet. DNS may take time to propagate, or your meta tag/file is missing."
      );
      scanButton.disabled = true;
    }
  } catch (err) {
    setStatus(verifyStatus, "error", err.message);
  }
});

scanButton.addEventListener("click", async () => {
  if (!currentDomainId) {
    setStatus(
      scanStatus,
      "error",
      "You must register and verify a domain first."
    );
    return;
  }

  setStatus(scanStatus, null, "Running passive security scan...");
  scanResult.classList.add("hidden");
  scanHeaders.innerHTML = "";
  scanTech.innerHTML = "";
  scanIssues.innerHTML = "";
  scanRecommendations.innerHTML = "";

  try {
    const data = await apiRequest(`/api/domains/${currentDomainId}/scan`, {
      method: "POST",
      body: JSON.stringify({}),
    });

    const { scan } = data;
    const analysis = scan.analysis;

    scanUrl.textContent = analysis.url;
    scanHttpStatus.textContent = `${analysis.status}`;
    scanHttps.textContent = analysis.usedHttps
      ? "Yes (HTTPS used)"
      : "No (HTTP only)";

    const headerItems = [
      ["HSTS", analysis.headers.hsts],
      ["Content-Security-Policy", analysis.headers.csp],
      ["X-Frame-Options", analysis.headers.xFrameOptions],
      ["X-Content-Type-Options", analysis.headers.xContentTypeOptions],
      ["Referrer-Policy", analysis.headers.referrerPolicy],
      ["Permissions-Policy", analysis.headers.permissionsPolicy],
    ];

    headerItems.forEach(([label, present]) => {
      const li = document.createElement("li");
      li.textContent = label + (present ? " ✓" : " – missing");
      li.classList.add(present ? "pill-ok" : "pill-missing");
      scanHeaders.appendChild(li);
    });

    if (analysis.headers.server || analysis.headers.poweredBy) {
      const li = document.createElement("li");
      li.textContent = `Server: ${analysis.headers.server || "-"}, Powered-By: ${
        analysis.headers.poweredBy || "-"
      }`;
      li.classList.add("pill-neutral");
      scanHeaders.appendChild(li);
    }

    if (analysis.techHints && analysis.techHints.length) {
      analysis.techHints.forEach((hint) => {
        const li = document.createElement("li");
        li.textContent = hint;
        li.classList.add("pill-neutral");
        scanTech.appendChild(li);
      });
    } else {
      const li = document.createElement("li");
      li.textContent = "No obvious technology indicators found.";
      li.classList.add("pill-neutral");
      scanTech.appendChild(li);
    }

    if (analysis.issues && analysis.issues.length) {
      analysis.issues.forEach((issue) => {
        const li = document.createElement("li");
        li.textContent = issue;
        scanIssues.appendChild(li);
      });
    } else {
      const li = document.createElement("li");
      li.textContent = "No major issues found in this basic analysis.";
      scanIssues.appendChild(li);
    }

    if (analysis.recommendations && analysis.recommendations.length) {
      analysis.recommendations.forEach((rec) => {
        const li = document.createElement("li");
        li.textContent = rec;
        scanRecommendations.appendChild(li);
      });
    } else {
      const li = document.createElement("li");
      li.textContent = "No additional recommendations right now.";
      scanRecommendations.appendChild(li);
    }

    scanResult.classList.remove("hidden");
    setStatus(scanStatus, "ok", "Scan complete.");
  } catch (err) {
    setStatus(scanStatus, "error", err.message);
  }
});

setDemoBanner();
