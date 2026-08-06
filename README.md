# my-pain

Fitness- & Schmerz-Tracking: Trainings (Oberkörper/Unterkörper/Ganzkörper) loggen und dabei Schmerz, Schlaf und Stimmung vor jedem Training erfassen, um den Verlauf über Zeit zu sehen.

## Stack

- Next.js 14 (App Router, TypeScript), Tailwind CSS
- Firebase Auth (E-Mail/Passwort) + Firestore
- Recharts für Verlaufsdiagramme
- Deployment: Vercel

## Lokales Setup

1. Abhängigkeiten installieren:

   ```bash
   npm install
   ```

2. Firebase-Projekt anlegen (falls noch nicht geschehen):
   - [Firebase Console](https://console.firebase.google.com/) → neues Projekt
   - **Authentication** → Sign-in-Methode **E-Mail/Passwort** aktivieren
   - **Firestore Database** → im produktiven Modus anlegen (Region z.B. `eur3`)
   - Unter Projekteinstellungen → "Web-App hinzufügen", die Config-Werte kopieren

3. `.env.local` aus der Vorlage erstellen und mit den Firebase-Werten befüllen:

   ```bash
   cp .env.local.example .env.local
   ```

4. Übungskatalog & Trainingsvorlagen einmalig in Firestore seeden:
   - In der Firebase Console unter Projekteinstellungen → Dienstkonten → "Neuen privaten Schlüssel generieren" (JSON-Datei herunterladen, **niemals committen**)
   - Pfad zur Datei in `.env.local` unter `SEED_SERVICE_ACCOUNT_PATH` eintragen
   - Ausführen:

     ```bash
     npm run seed
     ```

5. Firestore-Regeln deployen (via [Firebase CLI](https://firebase.google.com/docs/cli) oder manuell in der Console unter Firestore → Regeln den Inhalt von `firestore.rules` einfügen)

6. Dev-Server starten:

   ```bash
   npm run dev
   ```

## Deployment (Vercel)

1. Neues Projekt in Vercel anlegen, GitHub-Repo `swjnmang/my-pain` verknüpfen
2. Unter Project Settings → Environment Variables alle `NEXT_PUBLIC_FIREBASE_*` Werte aus `.env.local` eintragen (der `SEED_SERVICE_ACCOUNT_PATH` wird dort **nicht** benötigt, das Seeden läuft nur lokal)
3. Deploy auslösen (automatisch bei Push auf `main`)

## Vor jedem Push

```bash
npm run check
```

führt Lint, Typecheck und Build aus.
