# Website Inspector (GitHub Pages preview)

Det här repot innehåller en statisk frontend och en enkel Node/Express-backend.
GitHub Pages kan **endast** köra den statiska frontenden – backend körs inte där.

## 🔗 Live preview

När du har aktiverat GitHub Pages får du din preview här:

```
https://axeltb1.github.io/
```

> Om du använder ett annat repo än ditt användarnamn (`axeltb1.github.io`) kommer
> länken istället vara `https://axeltb1.github.io/<reponamn>/`.

---

## ✅ Snabbstart lokalt (frontend)

Du kan öppna frontenden direkt i webbläsaren:

1. Öppna `public/index.html` i webbläsaren.
2. Navigera mellan sidorna via länkarna i UI:t.

> Detta läser allt lokalt i webbläsaren och kräver ingen server.

---

## ✅ Snabbstart lokalt (backend + frontend)

Vill du köra API:t lokalt (för demo-funktioner):

```bash
npm install
npm run start
```

Öppna sedan:

```
http://localhost:3000
```

---

## 🚀 Deploy till GitHub Pages (steg-för-steg)

1. **Skapa repo på GitHub**
   - Skapa ett repo och pusha upp den här koden.

2. **Gå till Pages-inställningar**
   - `Settings → Pages → Build and deployment`

3. **Välj branch och katalog**
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **/public**

4. **Spara**
   - Vänta 1–2 minuter tills GitHub har byggt sidan.

5. **Öppna preview-länken**
   - `https://axeltb1.github.io/` (om du använder repo med samma namn)

---

## ⚠️ Viktigt: backend körs inte på GitHub Pages

GitHub Pages stödjer bara statisk frontend. Om du vill ha API:t live:

- Host backend separat (t.ex. Render, Railway, Fly.io)
- Uppdatera `apiBase` i `public/app.js` till din backend-URL

---

## 📁 Viktiga filer

- `public/index.html` – startsida
- `public/tools.html` – verktyg
- `public/admin.html` – admin
- `public/app.js` – logik för frontend
- `src/server.js` – backend/API (körs lokalt eller på separat host)

---

## ✅ Säkerhetsnotis

Alla verktyg är **passiva** och är endast avsedda för domäner du äger eller har
skriftligt tillstånd att testa.
