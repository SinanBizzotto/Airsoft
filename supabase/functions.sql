-- ===========================================================================
-- Serverseitige Anmeldelogik für Events
-- Im Supabase-Dashboard unter "SQL Editor" ausführen — nach policies.sql.
--
-- Warum: Die Prüfung „ist noch ein Platz frei?" im Browser ist nicht
-- verlässlich. Melden sich zwei Personen im selben Moment für den letzten
-- Platz an, lesen beide „1 Platz frei" und beide kommen durch. Diese Funktion
-- sperrt die Event-Zeile und macht Prüfung und Eintrag zu einem Schritt.
--
-- Ohne diese Datei funktioniert die Seite weiterhin — das Frontend fällt dann
-- auf die Prüfung im Browser zurück.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. Anmeldung: prüfen und eintragen in einer Transaktion
-- ---------------------------------------------------------------------------

create or replace function public.register_for_event(
  p_event_id uuid,
  p_name text,
  p_discord_name text,
  p_role text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event           public.events%rowtype;
  v_active          int;
  v_waitlist        int;
  v_status          text;
  v_position        int;
begin
  if coalesce(btrim(p_name), '') = '' or coalesce(btrim(p_discord_name), '') = '' then
    raise exception 'MISSING_FIELDS';
  end if;

  -- FOR UPDATE serialisiert gleichzeitige Anmeldungen auf dasselbe Event.
  select * into v_event
  from public.events
  where id = p_event_id
  for update;

  if not found then
    raise exception 'EVENT_NOT_FOUND';
  end if;

  if v_event.status in ('abgesagt', 'abgeschlossen') then
    raise exception 'REGISTRATION_CLOSED';
  end if;

  if exists (
    select 1
    from public.event_registrations
    where event_id = p_event_id
      and lower(btrim(discord_name)) = lower(btrim(p_discord_name))
      and registration_status is distinct from 'abgesagt'
  ) then
    raise exception 'ALREADY_REGISTERED';
  end if;

  select
    count(*) filter (
      where registration_status is distinct from 'abgesagt'
        and registration_status is distinct from 'warteliste'
    ),
    count(*) filter (where registration_status = 'warteliste')
  into v_active, v_waitlist
  from public.event_registrations
  where event_id = p_event_id;

  if v_event.max_participants is not null and v_active >= v_event.max_participants then
    v_status   := 'warteliste';
    v_position := v_waitlist + 1;
  else
    v_status   := 'angemeldet';
    v_position := null;
  end if;

  insert into public.event_registrations
    (event_id, name, discord_name, role, registration_status, waitlist_position)
  values
    (p_event_id, btrim(p_name), btrim(p_discord_name),
     nullif(btrim(coalesce(p_role, '')), ''), v_status, v_position);

  -- Event auf "voll" setzen, sobald der letzte Platz vergeben wurde.
  if v_status = 'angemeldet'
     and v_event.max_participants is not null
     and v_active + 1 >= v_event.max_participants
     and v_event.status not in ('voll', 'abgesagt', 'abgeschlossen')
  then
    update public.events set status = 'voll' where id = p_event_id;
  end if;

  return jsonb_build_object('status', v_status, 'waitlist_position', v_position);
end;
$$;

revoke all on function public.register_for_event(uuid, text, text, text) from public;
grant execute on function public.register_for_event(uuid, text, text, text) to anon, authenticated;


-- ---------------------------------------------------------------------------
-- 2. Warteliste lückenlos halten
--    Wird jemand von der Warteliste genommen oder abgesagt, rücken die
--    dahinter automatisch auf — sonst bleiben Plätze wie 1, 3, 4 stehen.
-- ---------------------------------------------------------------------------

create or replace function public.renumber_event_waitlist()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Der UPDATE unten löst denselben Trigger erneut aus; hier abbrechen.
  if pg_trigger_depth() > 1 then
    return null;
  end if;

  with ranked as (
    select
      id,
      row_number() over (partition by event_id order by created_at, id) as position
    from public.event_registrations
    where registration_status = 'warteliste'
  )
  update public.event_registrations r
  set waitlist_position = ranked.position
  from ranked
  where r.id = ranked.id
    and r.waitlist_position is distinct from ranked.position;

  return null;
end;
$$;

drop trigger if exists event_registrations_renumber on public.event_registrations;

create trigger event_registrations_renumber
after insert or update or delete on public.event_registrations
for each statement
execute function public.renumber_event_waitlist();


-- ---------------------------------------------------------------------------
-- 3. Kontrolle
-- ---------------------------------------------------------------------------

select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('register_for_event', 'renumber_event_waitlist');
