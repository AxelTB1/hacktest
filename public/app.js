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

let currentDomainId = null;
let currentDomainHost = null;

function setStatus(el, type, message) {
  el.classList.remove("ok", "warn", "error");
  if (type) el.classList.add(type);
  el.textContent = message || "";
}

async function apiRequest(path, options = {}) {
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
    const msg = (data && (data.error || data.message)) || "Något gick fel.";
    throw new Error(msg);
  }
  return data;
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
      "Lägg till en av verifieringsmetoderna ovan och klicka sedan på \"Kontrollera verifiering\"."
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
      "Registrera först en domän innan du försöker verifiera."
    );
    return;
  }

  setStatus(verifyStatus, null, "Kontrollerar verifiering...");

  try {
    const data = await apiRequest(`/api/domains/${currentDomainId}/verify`, {
      method: "POST",
      body: JSON.stringify({}),
    });

    if (data.verified) {
      setStatus(
        verifyStatus,
        "ok",
        "Domänen är verifierad – du kontrollerar den här domänen."
      );
      scanButton.disabled = false;
    } else {
      setStatus(
        verifyStatus,
        "warn",
        "Ingen verifieringsmetod hittades ännu. Det kan ta några minuter för DNS att spridas, eller så saknas meta-tagg/fil."
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
      "Du måste först registrera och verifiera en domän."
    );
    return;
  }

  setStatus(scanStatus, null, "Kör passiv säkerhetsscan...");
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
    scanHttps.textContent = analysis.usedHttps ? "Ja (HTTPS användes)" : "Nej (endast HTTP)";

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
      li.textContent = label + (present ? " ✓" : " – saknas");
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
      li.textContent = "Inga tydliga teknikindikationer hittades.";
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
      li.textContent = "Inga uppenbara problem hittades i den här grundläggande analysen.";
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
      li.textContent = "Inga fler rekommendationer just nu.";
      scanRecommendations.appendChild(li);
    }

    scanResult.classList.remove("hidden");
    setStatus(scanStatus, "ok", "Scan klar.");
  } catch (err) {
    setStatus(scanStatus, "error", err.message);
  }
});

