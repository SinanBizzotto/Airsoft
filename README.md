# Airsoft Squad Basel 04 — Website

Öffentliche Team-Website mit Recruitment-Formular, Event-Anmeldung und einem
geschützten Admin-Bereich. React + Vite im Frontend, Supabase für Datenbank und
Login, Deployment auf Vercel.

## Schnellstart

```bash
npm install
cp .env.example .env   # Werte aus dem Supabase-Projekt eintragen
npm run dev
```

| Befehl            | Zweck                                  |
| ----------------- | -------------------------------------- |
| `npm run dev`     | Entwicklungsserver mit Hot Reload      |
| `npm run build`   | Produktionsbuild nach `dist/`          |
| `npm run preview` | Produktionsbuild lokal testen          |
| `npm run lint`    | ESLint über das gesamte Projekt        |

## Umgebungsvariablen

| Variable                 | Beschreibung                             |
| ------------------------ | ---------------------------------------- |
| `VITE_SUPABASE_URL`      | Projekt-URL aus Supabase                 |
| `VITE_SUPABASE_ANON_KEY` | Öffentlicher Anon Key aus Supabase       |

Alles mit `VITE_`-Prefix landet im Client-Bundle und ist öffentlich einsehbar.
Der Service-Role-Key darf hier niemals eingetragen werden. Die `.env` ist
bewusst nicht im Repository.

## Routen

| Route           | Inhalt                                                |
| --------------- | ----------------------------------------------------- |
| `/`             | Startseite: Team, Werte, Gear, Events, FAQ, Bewerbung |
| `/impressum`    | Impressum                                             |
| `/datenschutz`  | Datenschutzerklärung                                  |
| `/admin`        | Recruitment-Dashboard (Login erforderlich)            |
| `/admin/events` | Event-Verwaltung (Login erforderlich)                 |

Das Routing läuft über die History API (`src/lib/router.js`). Damit ein direkter
Aufruf von `/admin` funktioniert, leitet `vercel.json` alle Pfade auf `index.html`.

## Deployment

Die Seite läuft auf Vercel im Projekt **`airsoft`** (Team `sinanbizzottos-projects`)
unter `www.airsoftsquadbasel.ch`. Das Projekt ist mit dem GitHub-Repository
**`SinanBizzotto/Airsoft`** verknüpft — jeder Push auf den Produktions-Branch löst
automatisch ein neues Deployment aus.

Dieser Ordner ist **kein Git-Repository**. Änderungen hier gehen erst live, wenn sie
im verknüpften GitHub-Repo landen:

```bash
git clone https://github.com/SinanBizzotto/Airsoft.git
# Dateien aus diesem Ordner hineinkopieren (ohne node_modules, dist, .env)
git add -A && git commit -m "Website überarbeitet" && git push
```

Ein direktes `vercel --prod` würde ebenfalls deployen, aber Repo und Produktion
auseinanderlaufen lassen — der nächste Git-Push überschreibt es wieder.

## Projektstruktur

```
public/            Favicon, Manifest, robots.txt, Sitemap, OG-Image
src/
  components/      Wiederverwendbare Bausteine (Navbar, Footer, Lightbox, …)
  data/site.js     Redaktionelle Inhalte der Startseite
  lib/             Router, Supabase-Client, Auth-Hook, Formatierung
  pages/           Home, Legal, NotFound, Login, Admin, EventsAdmin
  styles/          CSS des Admin-Bereichs
  App.css          Styles der öffentlichen Seite
  index.css        Design-Tokens und globale Basis
```

Inhalte wie Mitglieder, Werte, Gear-Regeln, FAQ und Social-Links werden in
[`src/data/site.js`](src/data/site.js) gepflegt — dort reicht eine Textänderung,
ohne Komponenten anzufassen.

## Supabase

Erwartete Tabellen:

- **`applications`** — `callsign`, `age`, `region`, `discord_name`,
  `preferred_role`, `camo`, `motivation`, `status`, `internal_rating`, `notes`,
  `archived`, `reviewed_at`, `created_at`
- **`events`** — `title`, `event_type`, `event_date`, `location`, `field_name`,
  `description`, `status`, `max_participants`, `required_camo`, `required_gear`,
  `notes`
- **`event_registrations`** — `event_id`, `name`, `discord_name`, `role`,
  `registration_status`, `waitlist_position`, `confirmed_at`, `cancelled_at`,
  `created_at`

### Row Level Security

`VITE_SUPABASE_ANON_KEY` steht im ausgelieferten JavaScript-Bundle und ist für
jeden Besucher im Quelltext lesbar. Das ist bei Supabase so vorgesehen — der
einzige Schutz der Daten sind die RLS-Policies.

Anonyme Besucher dürfen deshalb ausschliesslich:

- in `applications` und `event_registrations` **einfügen** (`insert`),
- `events` und die View `event_capacity` **lesen** (`select`).

Alles andere gehört hinter den authentifizierten Zugriff. Die passenden Policies
liegen ausführbar in [`supabase/policies.sql`](supabase/policies.sql).

Prüfen lässt sich das jederzeit von aussen — die folgende Anfrage darf **keine**
Zeilen liefern:

```bash
curl -s "$VITE_SUPABASE_URL/rest/v1/applications?select=id" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY"
```

### SQL-Dateien

Beide im Supabase-Dashboard unter „SQL Editor" ausführen, in dieser Reihenfolge:

| Datei | Zweck |
| ----- | ----- |
| [`supabase/policies.sql`](supabase/policies.sql) | Row Level Security und die View `event_capacity` |
| [`supabase/functions.sql`](supabase/functions.sql) | Anmeldung als atomare Postgres-Funktion, lückenlose Warteliste |

Die Seite funktioniert auch ohne sie — dann greifen die Rückfallebenen im
Frontend. Erst mit ihnen sind die Daten aber geschützt und die Belegung korrekt.

### Ablauf der Event-Anmeldung

In der Datenbank liegt bereits ein Trigger, der beim Eintragen in ein volles
Event `EVENT_FULL` (Fehlercode `P0001`) wirft. Über die Kapazität entscheidet
also die Datenbank, nicht der Browser. Das Frontend geht so vor:

1. `register_for_event` aufrufen — die Funktion sperrt die Event-Zeile und
   entscheidet Platz, Wartelistenposition und Doppelanmeldung in einem Schritt.
2. Fehlt die Funktion (`PGRST202`), regulär eintragen; wirft der Trigger
   `EVENT_FULL`, wird stattdessen auf die Warteliste eingetragen.

Ohne `functions.sql` fehlt nur die Prüfung auf Doppelanmeldungen, und die
Wartelistenpositionen bleiben leer.
