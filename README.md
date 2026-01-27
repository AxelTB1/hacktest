# Website Inspector

Website Inspector är en **laglig** säkerhets- och OSINT-demo för egna domäner.
Den här versionen innehåller en frontend med demo-inloggning, verktygssida och
adminmeny (alla lokalt i webbläsaren), samt en Node/Express-backend för
passiva analyser.

## Kom igång lokalt

```bash
npm install
npm run start
```

Öppna sedan `http://localhost:3000` i din webbläsare.

## Viktigt om demo-inloggning

`login.html` använder **endast** `localStorage` i webbläsaren för att simulera
roller och planer. Detta är **inte** säker autentisering. För en riktig produkt
behöver du koppla in:

- Backend med sessionshantering (JWT, cookies, etc.)
- Databas för användare och abonnemang
- Betalningsprovider (Stripe, Paddle, etc.)

## Deploya till GitHub Pages (frontend)

GitHub Pages kan endast serva **statisk** frontend. Så här gör du:

1. Skapa ett nytt repo på GitHub och pusha koden.
2. Flytta/bygg frontend till en statisk katalog (här: `public/`).
3. I GitHub: **Settings → Pages → Build and deployment**.
4. Välj **Deploy from a branch** och sätt `main` + `/public`.
5. Spara och vänta på att GitHub bygger sidan.

> Notera: API:et i `src/server.js` körs inte på GitHub Pages.

## Deploya backend (Node/Express)

För backend behöver du en separat host. Exempel (Render):

1. Skapa ett nytt **Web Service** på Render.
2. Koppla GitHub-repot.
3. Build command: `npm install`
4. Start command: `npm run start`
5. När tjänsten är live, uppdatera frontendens `apiBase` i `public/app.js` om du
   vill att frontend ska prata med den externa backend-URL:en.

## Nästa steg (för riktiga konton)

- Skapa endpoints för inloggning/roller.
- Lagra verktygsåtkomst i databasen.
- Bygg ett admin-API (istället för `localStorage`).
- Lägg till rate limiting, logging och observability.

## Säkerhetsnotis

Alla verktyg är **passiva** och är endast avsedda för domäner du äger eller har
skriftligt tillstånd att testa.
