# Website Inspector (GitHub Pages Preview)

This repo ships a **static frontend** and a small **Node/Express backend**.
GitHub Pages can only host the static frontend, so the backend does **not** run
there. To keep the preview useful, the frontend includes a **Demo Mode** that
simulates data when no backend is available.

---

## 🔗 Live Preview

After you enable GitHub Pages, your preview will be here:

```
https://axeltb1.github.io/
```

> If your repo is not named `axeltb1.github.io`, the URL becomes
> `https://axeltb1.github.io/<repo-name>/`.

---

## ✅ Quick Start (Static Frontend Only)

You can open the frontend directly in your browser (Demo Mode will activate):

1. Open `public/index.html` in your browser.
2. Use the app, tools, login, and admin pages.

No server is required for this demo experience.

---

## ✅ Quick Start (Frontend + Backend)

Run the API locally for real scans:

```bash
npm install
npm run start
```

Open:

```
http://localhost:3000
```

---

## 🚀 Deploy to GitHub Pages (Step-by-step)

1. **Create a GitHub repo** and push this code.
2. Go to **Settings → Pages → Build and deployment**.
3. Select:
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **/public**
4. Save and wait ~1–2 minutes for the build.
5. Open your preview link.

---

## 🧪 Demo Mode (Works on GitHub Pages)

When the backend is unavailable, the app runs in **Demo Mode** automatically:

- Domain registration works with **simulated tokens**.
- Verification always succeeds (demo simulation).
- Scans return **sample security results**.
- Tools show **working demo outputs** and checklists.
- Admin panel updates access roles using `localStorage`.

> This is perfect for a GitHub Pages preview. For real scans, use the backend.

---

## 🔐 Login + Admin (Demo)

Everything is client-only for the preview:

- Login uses **localStorage** (no real accounts).
- Use this admin code to unlock admin tools:

```
ADMIN-DEMO
```

---

## ⚠️ Backend Hosting (Required for real scanning)

GitHub Pages cannot run Node/Express. To enable real scanning:

1. Host the backend on a service like **Render**, **Railway**, or **Fly.io**.
2. Update `apiBase` in `public/app.js` to your backend URL.

---

## 📁 Key Files

- `public/index.html` – landing + app flow
- `public/tools.html` – tool overview
- `public/admin.html` – admin controls
- `public/app.js` – frontend logic + demo mode
- `src/server.js` – backend API (run locally / on a server)

---

## ✅ Security Notice

All tools are **passive** and intended only for domains you own or have written
permission to test.
