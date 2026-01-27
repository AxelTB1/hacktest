import express from "express";
import cors from "cors";
import morgan from "morgan";
import fetch from "node-fetch";
import dns from "dns";
import path from "path";
import { fileURLToPath } from "url";

// Basic in-memory storage for demo purposes
const domains = new Map(); // id -> { id, host, token, verified, createdAt, lastScan }
let idCounter = 1;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.disable("x-powered-by");

app.use(cors());
app.use(express.json({ limit: "200kb" }));
app.use(morgan("dev"));

// Serve frontend
const publicDir = path.join(__dirname, "..", "public");
app.use(express.static(publicDir));

// Helper to generate a simple verification token
function generateToken() {
  return (
    Math.random().toString(36).slice(2, 10) +
    "-" +
    Math.random().toString(36).slice(2, 10)
  );
}

// Normalize host (no protocol, no path)
function normalizeHost(host) {
  if (!host) return null;
  let trimmed = host.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = "https://" + trimmed;
  }
  try {
    const url = new URL(trimmed);
    return url.hostname;
  } catch {
    return null;
  }
}

// Try to fetch URL with https first, fallback to http
async function safeFetch(host, pathPart = "/", options = {}) {
  const httpsUrl = `https://${host}${pathPart}`;
  const httpUrl = `http://${host}${pathPart}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(httpsUrl, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    return { res, url: httpsUrl, usedHttps: true };
  } catch {
    try {
      const res = await fetch(httpUrl, { ...options, signal: controller.signal });
      clearTimeout(timeout);
      return { res, url: httpUrl, usedHttps: false };
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }
}

// Simple DNS TXT lookup helper (optional, best-effort)
function checkDnsTxt(host, token) {
  return new Promise((resolve) => {
    dns.resolveTxt(host, (err, records) => {
      if (err || !records) {
        return resolve(false);
      }
      const flat = records.flat().join(" ");
      resolve(flat.includes(token));
    });
  });
}

// API: register domain
app.post("/api/domains", (req, res) => {
  const { host } = req.body || {};
  const normalized = normalizeHost(host);
  if (!normalized) {
    return res.status(400).json({ error: "Ogiltigt domännamn." });
  }

  const id = String(idCounter++);
  const token = generateToken();
  const now = new Date().toISOString();

  const domain = {
    id,
    host: normalized,
    token,
    verified: false,
    createdAt: now,
    lastScan: null,
  };

  domains.set(id, domain);

  res.json({
    domain,
    instructions: {
      metaTag: `<meta name="website-inspector-verification" content="${token}">`,
      filePath: `https://${normalized}/.well-known/website-inspector-${token}.txt`,
      fileContent: token,
      dnsTxtName: normalized,
      dnsTxtValue: `website-inspector=${token}`,
    },
  });
});

// API: get domain info
app.get("/api/domains/:id", (req, res) => {
  const domain = domains.get(req.params.id);
  if (!domain) {
    return res.status(404).json({ error: "Domän hittades inte." });
  }
  res.json({ domain });
});

// API: verify ownership (meta/file/dns)
app.post("/api/domains/:id/verify", async (req, res) => {
  const domain = domains.get(req.params.id);
  if (!domain) {
    return res.status(404).json({ error: "Domän hittades inte." });
  }

  const { methods } = req.body || {};
  const methodsToCheck = methods && Array.isArray(methods) && methods.length
    ? methods
    : ["meta", "file", "dns"];

  const checks = {
    meta: false,
    file: false,
    dns: false,
  };

  try {
    if (methodsToCheck.includes("meta") || methodsToCheck.includes("file")) {
      const { res: httpRes, url } = await safeFetch(domain.host, "/");
      const body = await httpRes.text();

      if (methodsToCheck.includes("meta")) {
        const metaTag = `name="website-inspector-verification"`;
        if (body.includes(metaTag) && body.includes(domain.token)) {
          checks.meta = true;
        }
      }

      if (methodsToCheck.includes("file")) {
        try {
          const filePath = `/.well-known/website-inspector-${domain.token}.txt`;
          const { res: fileRes } = await safeFetch(domain.host, filePath);
          if (fileRes.ok) {
            const content = (await fileRes.text()).trim();
            if (content.includes(domain.token)) {
              checks.file = true;
            }
          }
        } catch {
          // ignore, stays false
        }
      }
    }

    if (methodsToCheck.includes("dns")) {
      checks.dns = await checkDnsTxt(domain.host, domain.token);
    }
  } catch (err) {
    return res.status(500).json({
      error: "Kunde inte verifiera domänen (nätverksfel).",
      details: err.message,
      checks,
    });
  }

  const verified = Object.values(checks).some(Boolean);
  domain.verified = verified;
  domains.set(domain.id, domain);

  res.json({
    domain,
    checks,
    verified,
    message: verified
      ? "Domänen är verifierad – du kontrollerar den här domänen."
      : "Ingen verifieringsmetod lyckades. Kontrollera att du följt instruktionerna.",
  });
});

// Analyze security headers and response
function analyzeSecurity(host, fetchResult, bodyText) {
  const { res, url, usedHttps } = fetchResult;
  const headers = Object.fromEntries(
    [...res.headers.entries()].map(([k, v]) => [k.toLowerCase(), v])
  );

  const issues = [];
  const recommendations = [];

  const hasHttps = usedHttps;
  if (!hasHttps) {
    issues.push("Webbplatsen svarar inte primärt över HTTPS.");
    recommendations.push(
      "Aktivera HTTPS och omdirigera all trafik från HTTP till HTTPS med HSTS."
    );
  }

  const hsts = headers["strict-transport-security"];
  const csp = headers["content-security-policy"];
  const xfo = headers["x-frame-options"];
  const xcto = headers["x-content-type-options"];
  const referrerPolicy = headers["referrer-policy"];
  const permissionsPolicy = headers["permissions-policy"] || headers["feature-policy"];

  if (!hsts) {
    recommendations.push("Lägg till Strict-Transport-Security (HSTS) header.");
  }
  if (!csp) {
    recommendations.push(
      "Lägg till en Content-Security-Policy (CSP) för att minska XSS-risker."
    );
  }
  if (!xfo) {
    recommendations.push(
      "Lägg till X-Frame-Options för att skydda mot clickjacking."
    );
  }
  if (!xcto) {
    recommendations.push(
      "Lägg till X-Content-Type-Options: nosniff för att förhindra MIME-sniffing."
    );
  }
  if (!referrerPolicy) {
    recommendations.push("Lägg till en Referrer-Policy header.");
  }
  if (!permissionsPolicy) {
    recommendations.push("Lägg till Permissions-Policy för att begränsa API:er i webbläsaren.");
  }

  const server = headers["server"];
  const poweredBy = headers["x-powered-by"];

  if (server) {
    issues.push("Server-header läcker teknisk information.");
    recommendations.push("Ta bort eller minimera innehållet i Server-headern.");
  }
  if (poweredBy) {
    issues.push("X-Powered-By läcker teknisk information.");
    recommendations.push("Ta bort X-Powered-By headern.");
  }

  const techHints = [];
  if (/wp-content|wp-includes/i.test(bodyText)) {
    techHints.push("WordPress");
  }
  if (/wp-json/i.test(bodyText)) {
    techHints.push("WordPress REST API");
  }
  if (/content=\"Drupal/i.test(bodyText)) {
    techHints.push("Drupal");
  }
  if (/<meta name=\"generator\"/i.test(bodyText)) {
    techHints.push("Generator-metatag hittad (ramverk/CMS kan exponeras).");
  }

  return {
    url,
    status: res.status,
    usedHttps,
    headers: {
      hsts: Boolean(hsts),
      csp: Boolean(csp),
      xFrameOptions: Boolean(xfo),
      xContentTypeOptions: Boolean(xcto),
      referrerPolicy: Boolean(referrerPolicy),
      permissionsPolicy: Boolean(permissionsPolicy),
      server: server || null,
      poweredBy: poweredBy || null,
    },
    techHints,
    issues,
    recommendations: Array.from(new Set(recommendations)),
  };
}

// API: run passive security scan
app.post("/api/domains/:id/scan", async (req, res) => {
  const domain = domains.get(req.params.id);
  if (!domain) {
    return res.status(404).json({ error: "Domän hittades inte." });
  }
  if (!domain.verified) {
    return res.status(403).json({
      error: "Domänen är inte verifierad.",
      message: "Du måste verifiera att du kontrollerar domänen innan du kan scanna den.",
    });
  }

  try {
    const fetchResult = await safeFetch(domain.host, "/");
    const body = await fetchResult.res.text();
    const analysis = analyzeSecurity(domain.host, fetchResult, body);

    const now = new Date().toISOString();
    domain.lastScan = {
      at: now,
      analysis,
    };
    domains.set(domain.id, domain);

    res.json({
      domain,
      scan: domain.lastScan,
    });
  } catch (err) {
    res.status(500).json({
      error: "Kunde inte scanna domänen (nätverksfel).",
      details: err.message,
    });
  }
});

// Fallback: serve index.html for any unknown path (SPA)
app.get("*", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Website Inspector server kör på http://localhost:${PORT}`);
});
