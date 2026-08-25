-- ===========================================================================
-- Row Level Security für AS BS 04
-- Im Supabase-Dashboard unter "SQL Editor" ausführen.
--
-- Hintergrund: Der Key in VITE_SUPABASE_ANON_KEY ist öffentlich — er steht im
-- ausgelieferten JavaScript-Bundle und ist mit einem Rechtsklick auslesbar.
-- Der einzige Schutz der Daten sind deshalb diese Policies.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. applications — DRINGEND
--    Anonyme Besucher dürfen bewerben (INSERT), aber nichts lesen.
--    Lesen, Ändern und Löschen nur für eingeloggte Admins.
-- ---------------------------------------------------------------------------

alter table public.applications enable row level security;

-- Bestehende, zu offene Policies entfernen. Welche das sind, zeigt:
--   select policyname, cmd, roles from pg_policies where tablename = 'applications';
-- Danach hier eintragen und ausführen:
-- drop policy "<name der alten policy>" on public.applications;

drop policy if exists "applications_insert_anon"        on public.applications;
drop policy if exists "applications_select_authenticated" on public.applications;
drop policy if exists "applications_update_authenticated" on public.applications;
drop policy if exists "applications_delete_authenticated" on public.applications;

create policy "applications_insert_anon"
  on public.applications for insert
  to anon, authenticated
  with check (true);

create policy "applications_select_authenticated"
  on public.applications for select
  to authenticated
  using (true);

create policy "applications_update_authenticated"
  on public.applications for update
  to authenticated
  using (true) with check (true);

create policy "applications_delete_authenticated"
  on public.applications for delete
  to authenticated
  using (true);


-- ---------------------------------------------------------------------------
-- 2. events — öffentlich lesbar (keine personenbezogenen Daten),
--    schreiben nur für Admins.
--    Achtung: `notes` ist als interne Spalte gedacht, wird über diese Policy
--    aber mit ausgeliefert. Wer das nicht will, legt eine View mit nur den
--    öffentlichen Spalten an und liest im Frontend aus dieser.
-- ---------------------------------------------------------------------------

alter table public.events enable row level security;

drop policy if exists "events_select_public"         on public.events;
drop policy if exists "events_write_authenticated"   on public.events;

create policy "events_select_public"
  on public.events for select
  to anon, authenticated
  using (true);

create policy "events_write_authenticated"
  on public.events for all
  to authenticated
  using (true) with check (true);


-- ---------------------------------------------------------------------------
-- 3. event_registrations — enthält Namen und Discord-Handles.
--    Anonym anmelden ja, anonym die Teilnehmerliste lesen nein.
-- ---------------------------------------------------------------------------

alter table public.event_registrations enable row level security;

drop policy if exists "event_registrations_insert_anon"          on public.event_registrations;
drop policy if exists "event_registrations_select_authenticated" on public.event_registrations;
drop policy if exists "event_registrations_write_authenticated"  on public.event_registrations;

create policy "event_registrations_insert_anon"
  on public.event_registrations for insert
  to anon, authenticated
  with check (true);

create policy "event_registrations_select_authenticated"
  on public.event_registrations for select
  to authenticated
  using (true);

create policy "event_registrations_write_authenticated"
  on public.event_registrations for update
  to authenticated
  using (true) with check (true);

create policy "event_registrations_delete_authenticated"
  on public.event_registrations for delete
  to authenticated
  using (true);


-- ---------------------------------------------------------------------------
-- 4. Belegungszahlen für die öffentliche Seite
--    Punkt 3 nimmt anonymen Besuchern die Sicht auf die Anmeldungen — damit
--    kann die Startseite die Belegung nicht mehr selbst zählen. Diese View
--    liefert ausschliesslich Zahlen, keine Namen.
-- ---------------------------------------------------------------------------

create or replace view public.event_capacity
with (security_invoker = false) as
  select
    e.id as event_id,
    count(*) filter (
      where r.registration_status is distinct from 'abgesagt'
        and r.registration_status is distinct from 'warteliste'
    )::int as registrations_count,
    count(*) filter (
      where r.registration_status = 'warteliste'
    )::int as waitlist_count
  from public.events e
  left join public.event_registrations r on r.event_id = e.id
  group by e.id;

grant select on public.event_capacity to anon, authenticated;


-- ---------------------------------------------------------------------------
-- 5. Kontrolle — nach dem Ausführen sollte hier nichts mehr auftauchen,
--    das `anon` ein SELECT auf applications oder event_registrations erlaubt.
-- ---------------------------------------------------------------------------

select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
order by tablename, cmd;
