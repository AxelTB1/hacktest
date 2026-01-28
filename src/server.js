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
    return res.status(400).json({ error: "Invalid domain name." });
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
    return res.status(404).json({ error: "Domain not found." });
  }
  res.json({ domain });
});

// API: verify ownership (meta/file/dns)
app.post("/api/domains/:id/verify", async (req, res) => {
  const domain = domains.get(req.params.id);
  if (!domain) {
    return res.status(404).json({ error: "Domain not found." });
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
      error: "Unable to verify domain (network error).",
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
      ? "Domain verified — you control this domain."
      : "No verification method succeeded. Double-check the instructions.",
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
    issues.push("The website does not primarily respond over HTTPS.");
    recommendations.push(
      "Enable HTTPS and redirect all traffic from HTTP to HTTPS using HSTS."
    );
  }

  const hsts = headers["strict-transport-security"];
  const csp = headers["content-security-policy"];
  const xfo = headers["x-frame-options"];
  const xcto = headers["x-content-type-options"];
  const referrerPolicy = headers["referrer-policy"];
  const permissionsPolicy = headers["permissions-policy"] || headers["feature-policy"];

  if (!hsts) {
    recommendations.push("Add the Strict-Transport-Security (HSTS) header.");
  }
  if (!csp) {
    recommendations.push(
      "Add a Content-Security-Policy (CSP) to reduce XSS risk."
    );
  }
  if (!xfo) {
    recommendations.push(
      "Add X-Frame-Options to protect against clickjacking."
    );
  }
  if (!xcto) {
    recommendations.push(
      "Add X-Content-Type-Options: nosniff to prevent MIME sniffing."
    );
  }
  if (!referrerPolicy) {
    recommendations.push("Add a Referrer-Policy header.");
  }
  if (!permissionsPolicy) {
    recommendations.push(
      "Add Permissions-Policy to limit sensitive browser APIs."
    );
  }

  const server = headers["server"];
  const poweredBy = headers["x-powered-by"];

  if (server) {
    issues.push("Server header leaks technical information.");
    recommendations.push("Remove or minimize the Server header contents.");
  }
  if (poweredBy) {
    issues.push("X-Powered-By leaks technical information.");
    recommendations.push("Remove the X-Powered-By header.");
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
    techHints.push("Generator meta tag found (framework/CMS may be exposed).");
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
    return res.status(404).json({ error: "Domain not found." });
  }
  if (!domain.verified) {
    return res.status(403).json({
      error: "Domain not verified.",
      message: "Verify that you control the domain before running a scan.",
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
      error: "Unable to scan domain (network error).",
      details: err.message,
    });
  }
});

// Fallback: serve index.html for any unknown path (SPA)
app.get("*", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Website Inspector server running at http://localhost:${PORT}`);
});
