begin;

create extension if not exists citext with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  auth_subject text primary key,
  handle extensions.citext not null unique,
  avatar_seed text not null,
  bankroll bigint not null default 960 check (bankroll >= 0),
  last_rescue_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(handle::text) between 3 and 16),
  check (handle::text ~ '^[A-Za-z0-9][A-Za-z0-9 ._''-]{2,15}$')
);

create table if not exists public.party_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  name text not null default 'NINE SIX TABLE' check (char_length(name) between 3 and 28),
  host_subject text not null references public.profiles(auth_subject),
  visibility text not null check (visibility in ('public', 'private')),
  tone text not null default 'adult' check (tone in ('adult', 'pg')),
  max_seats smallint not null check (max_seats between 2 and 9),
  stake integer not null check (stake in (25, 50, 100, 250)),
  status text not null default 'open' check (status in ('open', 'active', 'finished', 'closed')),
  lock_at timestamptz,
  chat_closes_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists public.room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.party_rooms(id) on delete cascade,
  auth_subject text not null references public.profiles(auth_subject) on delete cascade,
  seat_no smallint not null check (seat_no between 1 and 9),
  ready boolean not null default false,
  connected boolean not null default true,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (room_id, auth_subject),
  unique (room_id, seat_no)
);

create table if not exists public.party_matches (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.party_rooms(id) on delete cascade,
  sequence integer not null,
  status text not null default 'active' check (status in ('active', 'finished', 'cancelled')),
  stake integer not null check (stake in (25, 50, 100, 250)),
  pot bigint not null check (pot >= 0),
  current_seat smallint check (current_seat between 1 and 9),
  turn_deadline timestamptz,
  winner_subject text references public.profiles(auth_subject),
  win_reason text check (win_reason in ('perfect', 'exact-96', 'last-standing', 'no-survivor', 'cancelled')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  settled_at timestamptz,
  unique (room_id, sequence)
);

create table if not exists public.match_players (
  match_id uuid not null references public.party_matches(id) on delete cascade,
  auth_subject text not null references public.profiles(auth_subject),
  seat_no smallint not null check (seat_no between 1 and 9),
  bank integer not null default 0 check (bank between 0 and 96),
  boofballs smallint not null default 0 check (boofballs between 0 and 4),
  timeout_streak smallint not null default 0 check (timeout_streak between 0 and 2),
  status text not null default 'active' check (status in ('active', 'walkout', 'forfeit', 'winner', 'lost')),
  disconnected_until timestamptz,
  joined_at timestamptz not null default now(),
  primary key (match_id, auth_subject),
  unique (match_id, seat_no)
);

create table if not exists public.party_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.party_matches(id) on delete cascade,
  sequence bigint not null,
  type text not null,
  actor_subject text references public.profiles(auth_subject),
  request_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (match_id, sequence),
  unique (match_id, request_id)
);

create table if not exists public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  auth_subject text not null references public.profiles(auth_subject),
  match_id uuid references public.party_matches(id),
  entry_type text not null check (entry_type in ('opening-balance', 'ante', 'payout', 'daily-rescue', 'admin-adjustment')),
  amount bigint not null check (amount <> 0),
  balance_after bigint not null check (balance_after >= 0),
  idempotency_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.party_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.party_rooms(id) on delete cascade,
  sender_subject text not null references public.profiles(auth_subject),
  kind text not null default 'text' check (kind in ('text', 'taunt')),
  body text not null check (char_length(body) between 1 and 160),
  taunt_key text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_subject text not null references public.profiles(auth_subject),
  message_id uuid not null references public.party_messages(id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 80),
  evidence jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (reporter_subject, message_id)
);

create table if not exists public.player_blocks (
  blocker_subject text not null references public.profiles(auth_subject) on delete cascade,
  blocked_subject text not null references public.profiles(auth_subject) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_subject, blocked_subject),
  check (blocker_subject <> blocked_subject)
);

create table if not exists public.party_stats (
  auth_subject text primary key references public.profiles(auth_subject) on delete cascade,
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  perfects integer not null default 0 check (perfects >= 0),
  biggest_pot bigint not null default 0 check (biggest_pot >= 0),
  win_streak integer not null default 0 check (win_streak >= 0),
  best_win_streak integer not null default 0 check (best_win_streak >= 0),
  walkouts integer not null default 0 check (walkouts >= 0),
  matches_played integer not null default 0 check (matches_played >= 0),
  updated_at timestamptz not null default now()
);

create index if not exists party_rooms_lobby_idx on public.party_rooms (status, visibility, stake, tone, created_at desc);
create index if not exists room_members_room_idx on public.room_members (room_id, seat_no);
create index if not exists party_matches_room_idx on public.party_matches (room_id, sequence desc);
create index if not exists match_players_turn_idx on public.match_players (match_id, status, seat_no);
create index if not exists party_events_match_idx on public.party_events (match_id, sequence desc);
create index if not exists party_messages_room_idx on public.party_messages (room_id, created_at desc);
create index if not exists party_messages_expiry_idx on public.party_messages (expires_at);
create index if not exists wallet_ledger_subject_idx on public.wallet_ledger (auth_subject, created_at desc);

create or replace function public.party_subject()
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'sub'), '');
$$;

create or replace function public.party_require_subject()
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  v_subject text := public.party_subject();
begin
  if v_subject = '' then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  return v_subject;
end;
$$;

create or replace function public.party_is_room_member(p_room_id uuid, p_subject text default public.party_subject())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.room_members rm
    where rm.room_id = p_room_id
      and rm.auth_subject = p_subject
  );
$$;

create or replace function public.party_topic_room_member(p_topic text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_room_id uuid;
begin
  if p_topic !~ '^room:[0-9a-fA-F-]{36}$' then
    return false;
  end if;
  v_room_id := substring(p_topic from 6)::uuid;
  return public.party_is_room_member(v_room_id, public.party_subject());
exception when others then
  return false;
end;
$$;

create or replace function public.party_new_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  loop
    v_code := upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 6));
    exit when not exists (select 1 from public.party_rooms where code = v_code);
  end loop;
  return v_code;
end;
$$;

create or replace function public.party_safe_handle(p_desired text, p_subject text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_handle text;
begin
  v_handle := trim(regexp_replace(coalesce(p_desired, 'PLAYER 96'), '[^A-Za-z0-9 ._''-]', '', 'g'));
  if char_length(v_handle) < 3 then v_handle := 'PLAYER 96'; end if;
  v_handle := left(v_handle, 16);
  if exists (select 1 from public.profiles where handle = v_handle and auth_subject <> p_subject) then
    v_handle := left(v_handle, 11) || '-' || upper(substr(md5(p_subject), 1, 4));
  end if;
  return v_handle;
end;
$$;

create or replace function public.party_next_active_seat(p_match_id uuid, p_current_seat integer)
returns smallint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    min(mp.seat_no) filter (where mp.seat_no > p_current_seat),
    min(mp.seat_no)
  )::smallint
  from public.match_players mp
  where mp.match_id = p_match_id
    and mp.status = 'active';
$$;

create or replace function public.party_next_event_sequence(p_match_id uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(max(pe.sequence), 0) + 1
  from public.party_events pe
  where pe.match_id = p_match_id;
$$;

create or replace function public.party_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function public.party_touch_updated_at();

drop trigger if exists party_rooms_touch_updated_at on public.party_rooms;
create trigger party_rooms_touch_updated_at before update on public.party_rooms
for each row execute function public.party_touch_updated_at();

create or replace view public.party_public_rooms
with (security_invoker = false)
as
select
  pr.id,
  pr.code,
  pr.name,
  pr.stake,
  pr.tone,
  pr.max_seats,
  pr.visibility,
  pr.status,
  pr.created_at,
  count(rm.id)::integer as seated,
  (pr.stake * count(rm.id))::bigint as pot_preview
from public.party_rooms pr
left join public.room_members rm on rm.room_id = pr.id
where pr.visibility = 'public'
  and pr.status = 'open'
group by pr.id;

create or replace view public.party_leaderboard
with (security_invoker = true)
as
select
  p.auth_subject,
  p.handle,
  p.avatar_seed,
  ps.wins,
  ps.perfects,
  ps.biggest_pot,
  ps.best_win_streak as win_streak,
  ps.walkouts
from public.party_stats ps
join public.profiles p on p.auth_subject = ps.auth_subject;

create or replace view public.party_room_members_view
with (security_invoker = true)
as
select
  rm.room_id,
  rm.auth_subject,
  p.handle,
  p.avatar_seed,
  rm.seat_no,
  rm.ready,
  rm.connected,
  false as is_bot,
  rm.joined_at,
  rm.last_seen_at
from public.room_members rm
join public.profiles p on p.auth_subject = rm.auth_subject;

create or replace view public.party_match_players_view
with (security_invoker = true)
as
select
  mp.match_id,
  mp.auth_subject,
  p.handle,
  p.avatar_seed,
  mp.seat_no,
  mp.bank,
  mp.boofballs,
  mp.timeout_streak,
  mp.status,
  mp.disconnected_until,
  false as is_bot
from public.match_players mp
join public.profiles p on p.auth_subject = mp.auth_subject;

create or replace view public.party_messages_view
with (security_invoker = true)
as
select
  pm.id,
  pm.room_id,
  pm.sender_subject,
  p.handle,
  p.avatar_seed,
  pm.kind,
  pm.body,
  pm.taunt_key,
  pm.created_at
from public.party_messages pm
join public.profiles p on p.auth_subject = pm.sender_subject
where pm.expires_at > now()
  and not exists (
    select 1 from public.player_blocks pb
    where pb.blocker_subject = public.party_subject()
      and pb.blocked_subject = pm.sender_subject
  );

create or replace function public.party_upsert_profile(p_handle text, p_avatar_seed text default null)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subject text := public.party_require_subject();
  v_profile public.profiles;
  v_new boolean;
begin
  v_new := not exists (select 1 from public.profiles where auth_subject = v_subject);

  insert into public.profiles (auth_subject, handle, avatar_seed)
  values (
    v_subject,
    public.party_safe_handle(p_handle, v_subject),
    coalesce(nullif(p_avatar_seed, ''), v_subject)
  )
  on conflict (auth_subject) do update
  set avatar_seed = excluded.avatar_seed,
      updated_at = now()
  returning * into v_profile;

  insert into public.party_stats (auth_subject)
  values (v_subject)
  on conflict (auth_subject) do nothing;

  if v_new then
    insert into public.wallet_ledger (
      auth_subject, entry_type, amount, balance_after, idempotency_key, metadata
    ) values (
      v_subject, 'opening-balance', 960, 960, 'opening:' || v_subject, '{"cash_value":false}'::jsonb
    ) on conflict (idempotency_key) do nothing;
  end if;

  return v_profile;
end;
$$;

create or replace function public.party_create_room(
  p_visibility text,
  p_tone text,
  p_max_seats integer,
  p_stake integer,
  p_name text default null
)
returns public.party_rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subject text := public.party_require_subject();
  v_room public.party_rooms;
begin
  if not public.party_flag('party') then raise exception 'Party Mode is paused'; end if;
  if p_visibility = 'public' and not public.party_flag('public_rooms') then raise exception 'Public tables are paused'; end if;
  if p_visibility not in ('public', 'private') then raise exception 'Invalid table access'; end if;
  if p_tone not in ('adult', 'pg') then raise exception 'Invalid table tone'; end if;
  if p_max_seats not between 2 and 9 then raise exception 'Tables hold 2 to 9 players'; end if;
  if p_stake not in (25, 50, 100, 250) then raise exception 'Invalid table stake'; end if;
  if not exists (select 1 from public.profiles where auth_subject = v_subject) then
    raise exception 'Create a profile before opening a table';
  end if;

  insert into public.party_rooms (
    code, name, host_subject, visibility, tone, max_seats, stake
  ) values (
    public.party_new_code(),
    left(coalesce(nullif(trim(p_name), ''), 'NINE SIX TABLE'), 28),
    v_subject,
    p_visibility,
    p_tone,
    p_max_seats,
    p_stake
  ) returning * into v_room;

  insert into public.room_members (room_id, auth_subject, seat_no)
  values (v_room.id, v_subject, 1);

  return v_room;
end;
$$;

create or replace function public.party_join_room(p_room_id uuid default null, p_code text default null)
returns public.party_rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subject text := public.party_require_subject();
  v_room public.party_rooms;
  v_seat smallint;
begin
  if not public.party_flag('party') then raise exception 'Party Mode is paused'; end if;
  if not exists (select 1 from public.profiles where auth_subject = v_subject) then
    raise exception 'Create a profile before joining a table';
  end if;

  select * into v_room
  from public.party_rooms
  where (p_room_id is not null and id = p_room_id)
     or (p_room_id is null and p_code is not null and code = upper(trim(p_code)))
  order by created_at desc
  limit 1
  for update;

  if v_room.id is null then raise exception 'Table not found'; end if;
  if v_room.visibility = 'public' and not public.party_flag('public_rooms') then raise exception 'Public tables are paused'; end if;
  if v_room.status <> 'open' or v_room.lock_at is not null then raise exception 'That roster is already locked'; end if;

  if exists (
    select 1 from public.room_members
    where room_id = v_room.id and auth_subject = v_subject
  ) then
    return v_room;
  end if;

  select seat::smallint into v_seat
  from generate_series(1, v_room.max_seats) seat
  where not exists (
    select 1 from public.room_members rm
    where rm.room_id = v_room.id and rm.seat_no = seat
  )
  order by seat
  limit 1;

  if v_seat is null then raise exception 'That table is full'; end if;

  insert into public.room_members (room_id, auth_subject, seat_no)
  values (v_room.id, v_subject, v_seat);
  return v_room;
end;
$$;

create or replace function public.party_quick_match(p_stake integer, p_tone text)
returns public.party_rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subject text := public.party_require_subject();
  v_room public.party_rooms;
begin
  if not public.party_flag('party') then raise exception 'Party Mode is paused'; end if;
  if not public.party_flag('public_rooms') then raise exception 'Public tables are paused'; end if;
  if p_stake not in (25, 50, 100, 250) then raise exception 'Invalid table stake'; end if;
  if p_tone not in ('adult', 'pg') then raise exception 'Invalid table tone'; end if;

  select pr.* into v_room
  from public.party_rooms pr
  where pr.visibility = 'public'
    and pr.status = 'open'
    and pr.lock_at is null
    and pr.stake = p_stake
    and pr.tone = p_tone
    and not exists (
      select 1 from public.room_members own
      where own.room_id = pr.id and own.auth_subject = v_subject
    )
    and (select count(*) from public.room_members rm where rm.room_id = pr.id) < pr.max_seats
  order by pr.created_at
  limit 1
  for update skip locked;

  if v_room.id is null then
    return public.party_create_room('public', p_tone, 6, p_stake, 'QUICK MATCH 96');
  end if;
  return public.party_join_room(v_room.id, null);
end;
$$;

create or replace function public.party_set_ready(p_room_id uuid, p_ready boolean)
returns public.party_rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subject text := public.party_require_subject();
  v_room public.party_rooms;
  v_ready_count integer;
  v_balance bigint;
begin
  if not public.party_flag('party') then raise exception 'Party Mode is paused'; end if;
  if not public.party_flag('wallet_settlement') then raise exception 'Wallet settlement is paused'; end if;
  select * into v_room from public.party_rooms where id = p_room_id for update;
  if v_room.id is null or not public.party_is_room_member(p_room_id, v_subject) then raise exception 'Table membership required'; end if;
  if v_room.status <> 'open' then raise exception 'The match is already active'; end if;
  if v_room.lock_at is not null and v_room.lock_at <= now() then raise exception 'The roster lock has fired'; end if;

  if p_ready then
    select bankroll into v_balance from public.profiles where auth_subject = v_subject for update;
    if v_balance < v_room.stake then raise exception 'Not enough fictional chips for this stake'; end if;
  end if;

  update public.room_members
  set ready = p_ready, last_seen_at = now(), connected = true
  where room_id = p_room_id and auth_subject = v_subject;

  select count(*) into v_ready_count from public.room_members where room_id = p_room_id and ready;
  update public.party_rooms
  set lock_at = case
    when v_ready_count >= 2 then coalesce(lock_at, now() + interval '5 seconds')
    else null
  end
  where id = p_room_id
  returning * into v_room;
  return v_room;
end;
$$;

create or replace function public.party_start_match(p_room_id uuid)
returns public.party_matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subject text := public.party_require_subject();
  v_room public.party_rooms;
  v_match public.party_matches;
  v_member record;
  v_ready_count integer;
  v_sequence integer;
  v_balance bigint;
begin
  if not public.party_flag('party') then raise exception 'Party Mode is paused'; end if;
  if not public.party_flag('wallet_settlement') then raise exception 'Wallet settlement is paused'; end if;
  select * into v_room from public.party_rooms where id = p_room_id for update;
  if v_room.id is null or not public.party_is_room_member(p_room_id, v_subject) then raise exception 'Table membership required'; end if;

  if v_room.status = 'active' then
    select * into v_match from public.party_matches where room_id = p_room_id and status = 'active' order by sequence desc limit 1;
    return v_match;
  end if;
  if v_room.status <> 'open' then raise exception 'That table cannot start'; end if;
  if v_room.lock_at is null or v_room.lock_at > now() then raise exception 'The five-second lock is still running'; end if;

  select count(*) into v_ready_count from public.room_members where room_id = p_room_id and ready;
  if v_ready_count < 2 then raise exception 'Two ready players are required'; end if;

  for v_member in
    select rm.auth_subject, rm.seat_no
    from public.room_members rm
    where rm.room_id = p_room_id and rm.ready
    order by rm.seat_no
    for update
  loop
    select bankroll into v_balance from public.profiles where auth_subject = v_member.auth_subject for update;
    if v_balance < v_room.stake then
      raise exception '% no longer has enough fictional chips', v_member.auth_subject;
    end if;
  end loop;

  select coalesce(max(sequence), 0) + 1 into v_sequence
  from public.party_matches where room_id = p_room_id;

  insert into public.party_matches (
    room_id, sequence, stake, pot, current_seat, turn_deadline
  )
  select
    p_room_id,
    v_sequence,
    v_room.stake,
    v_room.stake * count(*),
    min(seat_no),
    now() + interval '20 seconds'
  from public.room_members
  where room_id = p_room_id and ready
  returning * into v_match;

  insert into public.match_players (match_id, auth_subject, seat_no)
  select v_match.id, auth_subject, seat_no
  from public.room_members
  where room_id = p_room_id and ready;

  for v_member in
    select auth_subject from public.match_players where match_id = v_match.id order by seat_no
  loop
    update public.profiles
    set bankroll = bankroll - v_room.stake
    where auth_subject = v_member.auth_subject
    returning bankroll into v_balance;

    insert into public.wallet_ledger (
      auth_subject, match_id, entry_type, amount, balance_after, idempotency_key, metadata
    ) values (
      v_member.auth_subject,
      v_match.id,
      'ante',
      -v_room.stake,
      v_balance,
      'ante:' || v_match.id || ':' || v_member.auth_subject,
      jsonb_build_object('stake', v_room.stake, 'cash_value', false)
    );
  end loop;

  delete from public.room_members where room_id = p_room_id and not ready;
  update public.party_rooms set status = 'active', lock_at = null where id = p_room_id;

  insert into public.party_events (match_id, sequence, type, actor_subject, payload)
  values (
    v_match.id,
    1,
    'match-started',
    v_subject,
    jsonb_build_object('pot', v_match.pot, 'stake', v_match.stake, 'seats', v_ready_count)
  );
  return v_match;
end;
$$;

create or replace function public.party_finish_match(p_match_id uuid, p_winner_subject text, p_reason text)
returns public.party_matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.party_matches;
  v_balance bigint;
begin
  if not public.party_flag('wallet_settlement') then raise exception 'Wallet settlement is paused'; end if;
  select * into v_match from public.party_matches where id = p_match_id for update;
  if v_match.id is null then raise exception 'Match not found'; end if;
  if v_match.status = 'finished' then return v_match; end if;
  if p_reason not in ('perfect', 'exact-96', 'last-standing', 'no-survivor') then raise exception 'Invalid settlement reason'; end if;
  if p_winner_subject is not null and not exists (
    select 1 from public.match_players
    where match_id = p_match_id and auth_subject = p_winner_subject and status = 'active'
  ) then
    raise exception 'Winner is not active in this match';
  end if;

  update public.party_matches
  set status = 'finished',
      winner_subject = p_winner_subject,
      win_reason = p_reason,
      current_seat = null,
      turn_deadline = null,
      finished_at = now(),
      settled_at = now()
  where id = p_match_id
  returning * into v_match;

  update public.match_players
  set status = case
    when auth_subject = p_winner_subject then 'winner'
    when status = 'active' then 'lost'
    else status
  end
  where match_id = p_match_id;

  insert into public.party_stats (auth_subject)
  select auth_subject from public.match_players where match_id = p_match_id
  on conflict (auth_subject) do nothing;

  update public.party_stats ps
  set losses = losses + 1,
      matches_played = matches_played + 1,
      win_streak = 0,
      updated_at = now()
  where ps.auth_subject in (
    select auth_subject from public.match_players
    where match_id = p_match_id
      and (p_winner_subject is null or auth_subject <> p_winner_subject)
  );

  if p_winner_subject is not null then
    update public.profiles
    set bankroll = bankroll + v_match.pot
    where auth_subject = p_winner_subject
    returning bankroll into v_balance;

    insert into public.wallet_ledger (
      auth_subject, match_id, entry_type, amount, balance_after, idempotency_key, metadata
    ) values (
      p_winner_subject,
      p_match_id,
      'payout',
      v_match.pot,
      v_balance,
      'payout:' || p_match_id,
      jsonb_build_object('reason', p_reason, 'cash_value', false)
    ) on conflict (idempotency_key) do nothing;

    update public.party_stats
    set wins = wins + 1,
        matches_played = matches_played + 1,
        perfects = perfects + case when p_reason = 'perfect' then 1 else 0 end,
        biggest_pot = greatest(biggest_pot, v_match.pot),
        win_streak = win_streak + 1,
        best_win_streak = greatest(best_win_streak, win_streak + 1),
        updated_at = now()
    where auth_subject = p_winner_subject;
  end if;

  update public.party_rooms
  set status = 'finished', chat_closes_at = now() + interval '5 minutes'
  where id = v_match.room_id;

  insert into public.party_events (match_id, sequence, type, actor_subject, payload)
  values (
    p_match_id,
    public.party_next_event_sequence(p_match_id),
    'match-won',
    p_winner_subject,
    jsonb_build_object('reason', p_reason, 'pot', v_match.pot, 'winner_subject', p_winner_subject)
  );
  return v_match;
end;
$$;

create or replace function public.party_take_turn(p_match_id uuid, p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subject text := public.party_require_subject();
  v_match public.party_matches;
  v_player public.match_players;
  v_existing jsonb;
  v_d9 smallint;
  v_d6 smallint;
  v_card text;
  v_card_gap smallint;
  v_raw smallint;
  v_calculated integer;
  v_paid integer;
  v_bank_before integer;
  v_bank_after integer;
  v_boofballs smallint;
  v_perfect boolean;
  v_no_score boolean;
  v_bust boolean := false;
  v_exact boolean := false;
  v_status text;
  v_active_count integer;
  v_last_subject text;
  v_payload jsonb;
begin
  if not public.party_flag('party') then raise exception 'Party Mode is paused'; end if;
  if p_request_id is null then raise exception 'A turn request id is required'; end if;
  select payload into v_existing
  from public.party_events
  where match_id = p_match_id and request_id = p_request_id;
  if found then return v_existing; end if;

  select * into v_match from public.party_matches where id = p_match_id for update;
  if v_match.id is null then raise exception 'Match not found'; end if;
  if v_match.status <> 'active' then raise exception 'That match is finished'; end if;
  if v_match.turn_deadline <= now() then raise exception 'Turn clock expired'; end if;

  select * into v_player
  from public.match_players
  where match_id = p_match_id and seat_no = v_match.current_seat
  for update;
  if v_player.auth_subject <> v_subject then raise exception 'It is not your turn'; end if;
  if v_player.status <> 'active' then raise exception 'This seat is not active'; end if;

  v_d9 := floor(random() * 9)::smallint + 1;
  v_d6 := floor(random() * 6)::smallint + 1;
  v_card := (array['J', 'Q', 'K'])[floor(random() * 3)::integer + 1];
  v_card_gap := case when v_card = 'Q' then 0 else 1 end;
  v_raw := (9 - v_d9) + (6 - v_d6) + v_card_gap;
  v_perfect := v_d9 = 9 and v_d6 = 6 and v_card = 'Q';
  v_no_score := not v_perfect and v_raw > 9;
  v_calculated := case
    when v_perfect then 96
    when v_no_score then 0
    when v_raw <= 6 then v_raw * 9
    else v_raw
  end;
  v_bank_before := v_player.bank;
  v_bank_after := v_bank_before;
  v_paid := v_calculated;
  v_boofballs := v_player.boofballs;
  v_status := v_player.status;

  if v_perfect then
    v_bank_after := 96;
    v_exact := true;
  elsif v_no_score then
    v_paid := 0;
    v_boofballs := least(4, v_boofballs + 1);
    if v_boofballs >= 4 then v_status := 'walkout'; end if;
  elsif v_bank_before + v_calculated > 96 then
    v_bank_after := 69;
    v_paid := 0;
    v_bust := true;
  else
    v_bank_after := v_bank_before + v_calculated;
    v_exact := v_bank_after = 96;
  end if;

  update public.match_players
  set bank = v_bank_after,
      boofballs = v_boofballs,
      timeout_streak = 0,
      status = v_status,
      disconnected_until = null
  where match_id = p_match_id and auth_subject = v_subject;

  if v_status = 'walkout' and v_player.status <> 'walkout' then
    update public.party_stats set walkouts = walkouts + 1, updated_at = now()
    where auth_subject = v_subject;
  end if;

  v_payload := jsonb_build_object(
    'd9', v_d9,
    'd6', v_d6,
    'card_rank', v_card,
    'gaps', jsonb_build_array(9 - v_d9, 6 - v_d6, v_card_gap),
    'raw_score', v_raw,
    'calculated_score', v_calculated,
    'hand_score', v_paid,
    'bank_before', v_bank_before,
    'bank_after', v_bank_after,
    'lane', case when v_perfect then 'perfect' when v_no_score then 'no-score' when v_raw <= 6 then 'money' else 'bank' end,
    'perfect', v_perfect,
    'bust', v_bust,
    'boofballs', v_boofballs,
    'player_status', v_status
  );

  insert into public.party_events (match_id, sequence, type, actor_subject, request_id, payload)
  values (
    p_match_id,
    public.party_next_event_sequence(p_match_id),
    'hand-settled',
    v_subject,
    p_request_id,
    v_payload
  );

  if v_perfect then
    perform public.party_finish_match(p_match_id, v_subject, 'perfect');
  elsif v_exact then
    perform public.party_finish_match(p_match_id, v_subject, 'exact-96');
  else
    select count(*), min(auth_subject) into v_active_count, v_last_subject
    from public.match_players where match_id = p_match_id and status = 'active';
    if v_active_count = 1 then
      perform public.party_finish_match(p_match_id, v_last_subject, 'last-standing');
    elsif v_active_count = 0 then
      perform public.party_finish_match(p_match_id, null, 'no-survivor');
    else
      update public.party_matches
      set current_seat = public.party_next_active_seat(p_match_id, v_match.current_seat),
          turn_deadline = now() + interval '20 seconds'
      where id = p_match_id;
    end if;
  end if;
  return v_payload;
end;
$$;

create or replace function public.party_advance_timeout(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.party_matches;
  v_player public.match_players;
  v_streak smallint;
  v_status text;
  v_active_count integer;
  v_last_subject text;
  v_payload jsonb;
begin
  perform public.party_require_subject();
  select * into v_match from public.party_matches where id = p_match_id for update;
  if v_match.id is null then raise exception 'Match not found'; end if;
  if v_match.status <> 'active' then return jsonb_build_object('status', v_match.status); end if;
  if not public.party_is_room_member(v_match.room_id) then raise exception 'Table membership required'; end if;
  if v_match.turn_deadline > now() then
    return jsonb_build_object('status', 'waiting', 'turn_deadline', v_match.turn_deadline);
  end if;

  select * into v_player
  from public.match_players
  where match_id = p_match_id and seat_no = v_match.current_seat
  for update;
  if v_player.auth_subject is null then raise exception 'Current seat not found'; end if;

  v_streak := least(2, v_player.timeout_streak + 1);
  v_status := case when v_streak >= 2 then 'forfeit' else v_player.status end;
  update public.match_players
  set timeout_streak = v_streak, status = v_status
  where match_id = p_match_id and auth_subject = v_player.auth_subject;

  v_payload := jsonb_build_object(
    'timeout_streak', v_streak,
    'player_status', v_status,
    'seat_no', v_player.seat_no
  );
  insert into public.party_events (match_id, sequence, type, actor_subject, payload)
  values (
    p_match_id,
    public.party_next_event_sequence(p_match_id),
    'turn-timeout',
    v_player.auth_subject,
    v_payload
  );

  select count(*), min(auth_subject) into v_active_count, v_last_subject
  from public.match_players where match_id = p_match_id and status = 'active';
  if v_active_count = 1 then
    perform public.party_finish_match(p_match_id, v_last_subject, 'last-standing');
  elsif v_active_count = 0 then
    perform public.party_finish_match(p_match_id, null, 'no-survivor');
  else
    update public.party_matches
    set current_seat = public.party_next_active_seat(p_match_id, v_match.current_seat),
        turn_deadline = now() + interval '20 seconds'
    where id = p_match_id;
  end if;
  return v_payload;
end;
$$;

create or replace function public.party_forfeit_match(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subject text := public.party_require_subject();
  v_match public.party_matches;
  v_player public.match_players;
  v_active_count integer;
  v_last_subject text;
begin
  select * into v_match from public.party_matches where id = p_match_id for update;
  if v_match.id is null then raise exception 'Match not found'; end if;
  if v_match.status <> 'active' then return jsonb_build_object('status', v_match.status); end if;

  select * into v_player
  from public.match_players
  where match_id = p_match_id and auth_subject = v_subject
  for update;
  if v_player.auth_subject is null then raise exception 'You are not in this match'; end if;
  if v_player.status <> 'active' then return jsonb_build_object('status', v_player.status); end if;

  update public.match_players set status = 'forfeit' where match_id = p_match_id and auth_subject = v_subject;
  insert into public.party_events (match_id, sequence, type, actor_subject, payload)
  values (
    p_match_id,
    public.party_next_event_sequence(p_match_id),
    'player-forfeit',
    v_subject,
    jsonb_build_object('seat_no', v_player.seat_no)
  );

  select count(*), min(auth_subject) into v_active_count, v_last_subject
  from public.match_players where match_id = p_match_id and status = 'active';
  if v_active_count = 1 then
    perform public.party_finish_match(p_match_id, v_last_subject, 'last-standing');
  elsif v_active_count = 0 then
    perform public.party_finish_match(p_match_id, null, 'no-survivor');
  elsif v_match.current_seat = v_player.seat_no then
    update public.party_matches
    set current_seat = public.party_next_active_seat(p_match_id, v_match.current_seat),
        turn_deadline = now() + interval '20 seconds'
    where id = p_match_id;
  end if;
  return jsonb_build_object('status', 'forfeit');
end;
$$;

create or replace function public.party_settle_match(p_match_id uuid)
returns public.party_matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.party_matches;
  v_winner public.match_players;
  v_active_count integer;
begin
  perform public.party_require_subject();
  select * into v_match from public.party_matches where id = p_match_id for update;
  if v_match.id is null or not public.party_is_room_member(v_match.room_id) then raise exception 'Table membership required'; end if;
  if v_match.status = 'finished' then return v_match; end if;

  select count(*) into v_active_count from public.match_players where match_id = p_match_id and status = 'active';
  select * into v_winner
  from public.match_players
  where match_id = p_match_id
    and status = 'active'
    and bank = 96
  order by seat_no
  limit 1;

  if v_winner.auth_subject is not null then
    return public.party_finish_match(p_match_id, v_winner.auth_subject, 'exact-96');
  elsif v_active_count = 1 then
    select * into v_winner from public.match_players where match_id = p_match_id and status = 'active';
    return public.party_finish_match(p_match_id, v_winner.auth_subject, 'last-standing');
  elsif v_active_count = 0 then
    return public.party_finish_match(p_match_id, null, 'no-survivor');
  end if;
  raise exception 'Match has no valid settlement condition';
end;
$$;

create or replace function public.party_propose_rematch(p_room_id uuid, p_stake integer)
returns public.party_rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subject text := public.party_require_subject();
  v_room public.party_rooms;
begin
  if p_stake not in (25, 50, 100, 250) then raise exception 'Invalid table stake'; end if;
  select * into v_room from public.party_rooms where id = p_room_id for update;
  if v_room.id is null or not public.party_is_room_member(p_room_id, v_subject) then raise exception 'Table membership required'; end if;
  if v_room.status <> 'finished' then raise exception 'Finish the active table first'; end if;

  update public.room_members
  set ready = false, connected = true, last_seen_at = now()
  where room_id = p_room_id;
  update public.party_rooms
  set status = 'open', stake = p_stake, lock_at = null, chat_closes_at = null, closed_at = null
  where id = p_room_id
  returning * into v_room;
  return v_room;
end;
$$;

create or replace function public.party_claim_daily_rescue()
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subject text := public.party_require_subject();
  v_profile public.profiles;
begin
  if not public.party_flag('wallet_settlement') then raise exception 'Wallet operations are paused'; end if;
  select * into v_profile from public.profiles where auth_subject = v_subject for update;
  if v_profile.auth_subject is null then raise exception 'Profile not found'; end if;
  if v_profile.bankroll >= 96 then raise exception 'Rescue unlocks below 96 chips'; end if;
  if v_profile.last_rescue_on = (now() at time zone 'utc')::date then raise exception 'Today''s rescue was already claimed'; end if;

  update public.profiles
  set bankroll = bankroll + 96, last_rescue_on = (now() at time zone 'utc')::date
  where auth_subject = v_subject
  returning * into v_profile;

  insert into public.wallet_ledger (
    auth_subject, entry_type, amount, balance_after, idempotency_key, metadata
  ) values (
    v_subject,
    'daily-rescue',
    96,
    v_profile.bankroll,
    'rescue:' || (now() at time zone 'utc')::date || ':' || v_subject,
    '{"cash_value":false}'::jsonb
  ) on conflict (idempotency_key) do nothing;
  return v_profile;
end;
$$;

create or replace function public.party_leave_room(p_room_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subject text := public.party_require_subject();
  v_room public.party_rooms;
  v_next_host text;
begin
  select * into v_room from public.party_rooms where id = p_room_id for update;
  if v_room.id is null or not public.party_is_room_member(p_room_id, v_subject) then return false; end if;
  if v_room.status = 'active' then raise exception 'Forfeit before leaving an active table'; end if;

  delete from public.room_members where room_id = p_room_id and auth_subject = v_subject;
  if not exists (select 1 from public.room_members where room_id = p_room_id) then
    update public.party_rooms set status = 'closed', closed_at = now() where id = p_room_id;
  elsif v_room.host_subject = v_subject then
    select auth_subject into v_next_host from public.room_members where room_id = p_room_id order by seat_no limit 1;
    update public.party_rooms set host_subject = v_next_host where id = p_room_id;
  end if;
  return true;
end;
$$;

create or replace function public.party_kick_member(p_room_id uuid, p_member_subject text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subject text := public.party_require_subject();
  v_room public.party_rooms;
begin
  select * into v_room from public.party_rooms where id = p_room_id for update;
  if v_room.host_subject <> v_subject then raise exception 'Only the host can remove a player'; end if;
  if v_room.status <> 'open' or v_room.lock_at is not null then raise exception 'The roster is already locking'; end if;
  if p_member_subject = v_subject then raise exception 'Use leave table instead'; end if;
  delete from public.room_members where room_id = p_room_id and auth_subject = p_member_subject;
  return found;
end;
$$;

create or replace function public.party_set_presence(p_room_id uuid, p_connected boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subject text := public.party_require_subject();
begin
  update public.room_members
  set connected = p_connected, last_seen_at = now()
  where room_id = p_room_id and auth_subject = v_subject;
  if not found then raise exception 'Table membership required'; end if;
  if not p_connected then
    update public.match_players mp
    set disconnected_until = now() + interval '45 seconds'
    from public.party_matches pm
    where pm.room_id = p_room_id and pm.status = 'active'
      and mp.match_id = pm.id and mp.auth_subject = v_subject;
  else
    update public.match_players mp
    set disconnected_until = null
    from public.party_matches pm
    where pm.room_id = p_room_id and pm.status = 'active'
      and mp.match_id = pm.id and mp.auth_subject = v_subject;
  end if;
  return true;
end;
$$;

create or replace function public.party_block_player(p_blocked_subject text, p_blocked boolean default true)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subject text := public.party_require_subject();
begin
  if p_blocked_subject = v_subject then raise exception 'You cannot block yourself'; end if;
  if p_blocked then
    insert into public.player_blocks (blocker_subject, blocked_subject)
    values (v_subject, p_blocked_subject)
    on conflict do nothing;
  else
    delete from public.player_blocks
    where blocker_subject = v_subject and blocked_subject = p_blocked_subject;
  end if;
  return true;
end;
$$;

create or replace function public.party_moderated_message(
  p_subject text,
  p_room_id uuid,
  p_body text,
  p_kind text default 'text',
  p_taunt_key text default null
)
returns public.party_messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.party_rooms;
  v_message public.party_messages;
  v_body text := trim(regexp_replace(coalesce(p_body, ''), '[[:cntrl:]]', ' ', 'g'));
begin
  if auth.role() <> 'service_role' then raise exception 'Service authorization required'; end if;
  if not public.party_flag('chat') then raise exception 'Table chat is paused'; end if;
  if p_kind not in ('text', 'taunt') then raise exception 'Invalid message kind'; end if;
  if char_length(v_body) not between 1 and 160 then raise exception 'Messages must be 1 to 160 characters'; end if;

  select * into v_room from public.party_rooms where id = p_room_id;
  if v_room.id is null or not public.party_is_room_member(p_room_id, p_subject) then raise exception 'Table membership required'; end if;
  if v_room.chat_closes_at is not null and v_room.chat_closes_at <= now() then raise exception 'Table chat is closed'; end if;
  if exists (
    select 1 from public.party_messages
    where room_id = p_room_id and sender_subject = p_subject and created_at > now() - interval '1 second'
  ) then raise exception 'Wait one second between messages'; end if;
  if (
    select count(*) from public.party_messages
    where room_id = p_room_id and sender_subject = p_subject and created_at > now() - interval '10 seconds'
  ) >= 5 then raise exception 'Chat burst limit reached'; end if;

  insert into public.party_messages (room_id, sender_subject, kind, body, taunt_key)
  values (p_room_id, p_subject, p_kind, v_body, p_taunt_key)
  returning * into v_message;
  return v_message;
end;
$$;

create or replace function public.party_create_report(
  p_reporter_subject text,
  p_message_id uuid,
  p_reason text
)
returns public.reports
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_message public.party_messages;
  v_report public.reports;
begin
  if auth.role() <> 'service_role' then raise exception 'Service authorization required'; end if;
  select * into v_message from public.party_messages where id = p_message_id;
  if v_message.id is null then raise exception 'Message not found'; end if;
  if not public.party_is_room_member(v_message.room_id, p_reporter_subject) then raise exception 'Table membership required'; end if;

  insert into public.reports (reporter_subject, message_id, reason, evidence)
  values (
    p_reporter_subject,
    p_message_id,
    left(coalesce(nullif(trim(p_reason), ''), 'table-conduct'), 80),
    jsonb_build_object(
      'room_id', v_message.room_id,
      'sender_subject', v_message.sender_subject,
      'kind', v_message.kind,
      'body', v_message.body,
      'created_at', v_message.created_at
    )
  )
  on conflict (reporter_subject, message_id) do update
  set reason = excluded.reason, evidence = excluded.evidence
  returning * into v_report;
  return v_report;
end;
$$;

create or replace function public.party_delete_expired_chat()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count bigint;
begin
  if auth.role() <> 'service_role' then raise exception 'Service authorization required'; end if;
  delete from public.party_messages where expires_at <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.create_room(
  p_visibility text,
  p_tone text,
  p_max_seats integer,
  p_stake integer,
  p_name text default null
)
returns public.party_rooms
language sql
set search_path = ''
as $$ select public.party_create_room(p_visibility, p_tone, p_max_seats, p_stake, p_name); $$;

create or replace function public.join_room(p_room_id uuid default null, p_code text default null)
returns public.party_rooms
language sql
set search_path = ''
as $$ select public.party_join_room(p_room_id, p_code); $$;

create or replace function public.set_ready(p_room_id uuid, p_ready boolean)
returns public.party_rooms
language sql
set search_path = ''
as $$ select public.party_set_ready(p_room_id, p_ready); $$;

create or replace function public.start_match(p_room_id uuid)
returns public.party_matches
language sql
set search_path = ''
as $$ select public.party_start_match(p_room_id); $$;

create or replace function public.take_turn(p_match_id uuid, p_request_id uuid)
returns jsonb
language sql
set search_path = ''
as $$ select public.party_take_turn(p_match_id, p_request_id); $$;

create or replace function public.advance_timeout(p_match_id uuid)
returns jsonb
language sql
set search_path = ''
as $$ select public.party_advance_timeout(p_match_id); $$;

create or replace function public.forfeit_match(p_match_id uuid)
returns jsonb
language sql
set search_path = ''
as $$ select public.party_forfeit_match(p_match_id); $$;

create or replace function public.settle_match(p_match_id uuid)
returns public.party_matches
language sql
set search_path = ''
as $$ select public.party_settle_match(p_match_id); $$;

create or replace function public.propose_rematch(p_room_id uuid, p_stake integer)
returns public.party_rooms
language sql
set search_path = ''
as $$ select public.party_propose_rematch(p_room_id, p_stake); $$;

create or replace function public.claim_daily_rescue()
returns public.profiles
language sql
set search_path = ''
as $$ select public.party_claim_daily_rescue(); $$;

create table if not exists public.party_runtime_flags (
  singleton boolean primary key default true check (singleton),
  party_enabled boolean not null default true,
  public_rooms_enabled boolean not null default true,
  chat_enabled boolean not null default true,
  wallet_settlement_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.party_runtime_flags (singleton)
values (true)
on conflict (singleton) do nothing;

create or replace function public.party_flag(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_name
    when 'party' then party_enabled
    when 'public_rooms' then public_rooms_enabled
    when 'chat' then chat_enabled
    when 'wallet_settlement' then wallet_settlement_enabled
    else false
  end
  from public.party_runtime_flags
  where singleton;
$$;

alter table public.profiles enable row level security;
alter table public.party_rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.party_matches enable row level security;
alter table public.match_players enable row level security;
alter table public.party_events enable row level security;
alter table public.wallet_ledger enable row level security;
alter table public.party_messages enable row level security;
alter table public.reports enable row level security;
alter table public.player_blocks enable row level security;
alter table public.party_stats enable row level security;
alter table public.party_runtime_flags enable row level security;

drop policy if exists profiles_read_authenticated on public.profiles;
create policy profiles_read_authenticated on public.profiles
for select to authenticated using (true);

drop policy if exists rooms_read_public_or_member on public.party_rooms;
create policy rooms_read_public_or_member on public.party_rooms
for select to authenticated using (
  (visibility = 'public' and status = 'open')
  or public.party_is_room_member(id)
);

drop policy if exists room_members_read_table on public.room_members;
create policy room_members_read_table on public.room_members
for select to authenticated using (public.party_is_room_member(room_id));

drop policy if exists matches_read_table on public.party_matches;
create policy matches_read_table on public.party_matches
for select to authenticated using (public.party_is_room_member(room_id));

drop policy if exists match_players_read_table on public.match_players;
create policy match_players_read_table on public.match_players
for select to authenticated using (
  exists (
    select 1 from public.party_matches pm
    where pm.id = match_id and public.party_is_room_member(pm.room_id)
  )
);

drop policy if exists events_read_table on public.party_events;
create policy events_read_table on public.party_events
for select to authenticated using (
  exists (
    select 1 from public.party_matches pm
    where pm.id = match_id and public.party_is_room_member(pm.room_id)
  )
);

drop policy if exists ledger_read_own on public.wallet_ledger;
create policy ledger_read_own on public.wallet_ledger
for select to authenticated using (auth_subject = public.party_subject());

drop policy if exists messages_read_table on public.party_messages;
create policy messages_read_table on public.party_messages
for select to authenticated using (
  expires_at > now()
  and public.party_is_room_member(room_id)
  and not exists (
    select 1 from public.player_blocks pb
    where pb.blocker_subject = public.party_subject()
      and pb.blocked_subject = sender_subject
  )
);

drop policy if exists reports_read_own on public.reports;
create policy reports_read_own on public.reports
for select to authenticated using (reporter_subject = public.party_subject());

drop policy if exists blocks_read_own on public.player_blocks;
create policy blocks_read_own on public.player_blocks
for select to authenticated using (blocker_subject = public.party_subject());

drop policy if exists stats_read_authenticated on public.party_stats;
create policy stats_read_authenticated on public.party_stats
for select to authenticated using (true);

do $$
declare
  v_proc regprocedure;
begin
  for v_proc in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and (p.proname like 'party_%' or p.proname in (
        'create_room', 'join_room', 'set_ready', 'start_match', 'take_turn',
        'advance_timeout', 'forfeit_match', 'settle_match', 'propose_rematch',
        'claim_daily_rescue'
      ))
  loop
    execute format('revoke all on function %s from public, anon, authenticated', v_proc);
  end loop;
end;
$$;

grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant select on public.party_rooms to authenticated;
grant select on public.room_members to authenticated;
grant select on public.party_matches to authenticated;
grant select on public.match_players to authenticated;
grant select on public.party_events to authenticated;
grant select on public.wallet_ledger to authenticated;
grant select on public.party_messages to authenticated;
grant select on public.reports to authenticated;
grant select on public.player_blocks to authenticated;
grant select on public.party_stats to authenticated;
grant select on public.party_public_rooms to authenticated;
grant select on public.party_leaderboard to authenticated;
grant select on public.party_room_members_view to authenticated;
grant select on public.party_match_players_view to authenticated;
grant select on public.party_messages_view to authenticated;

grant execute on function public.party_subject() to authenticated;
grant execute on function public.party_is_room_member(uuid, text) to authenticated;
grant execute on function public.party_topic_room_member(text) to authenticated;
grant execute on function public.party_upsert_profile(text, text) to authenticated;
grant execute on function public.party_create_room(text, text, integer, integer, text) to authenticated;
grant execute on function public.party_join_room(uuid, text) to authenticated;
grant execute on function public.party_quick_match(integer, text) to authenticated;
grant execute on function public.party_set_ready(uuid, boolean) to authenticated;
grant execute on function public.party_start_match(uuid) to authenticated;
grant execute on function public.party_take_turn(uuid, uuid) to authenticated;
grant execute on function public.party_advance_timeout(uuid) to authenticated;
grant execute on function public.party_forfeit_match(uuid) to authenticated;
grant execute on function public.party_settle_match(uuid) to authenticated;
grant execute on function public.party_propose_rematch(uuid, integer) to authenticated;
grant execute on function public.party_claim_daily_rescue() to authenticated;
grant execute on function public.party_leave_room(uuid) to authenticated;
grant execute on function public.party_kick_member(uuid, text) to authenticated;
grant execute on function public.party_set_presence(uuid, boolean) to authenticated;
grant execute on function public.party_block_player(text, boolean) to authenticated;

grant execute on function public.create_room(text, text, integer, integer, text) to authenticated;
grant execute on function public.join_room(uuid, text) to authenticated;
grant execute on function public.set_ready(uuid, boolean) to authenticated;
grant execute on function public.start_match(uuid) to authenticated;
grant execute on function public.take_turn(uuid, uuid) to authenticated;
grant execute on function public.advance_timeout(uuid) to authenticated;
grant execute on function public.forfeit_match(uuid) to authenticated;
grant execute on function public.settle_match(uuid) to authenticated;
grant execute on function public.propose_rematch(uuid, integer) to authenticated;
grant execute on function public.claim_daily_rescue() to authenticated;

grant execute on function public.party_moderated_message(text, uuid, text, text, text) to service_role;
grant execute on function public.party_create_report(text, uuid, text) to service_role;
grant execute on function public.party_delete_expired_chat() to service_role;

alter table realtime.messages enable row level security;
drop policy if exists nine_six_room_realtime_read on realtime.messages;
create policy nine_six_room_realtime_read on realtime.messages
for select to authenticated
using (public.party_topic_room_member(realtime.topic()));

drop policy if exists nine_six_room_realtime_send on realtime.messages;
create policy nine_six_room_realtime_send on realtime.messages
for insert to authenticated
with check (public.party_topic_room_member(realtime.topic()));

do $$
declare
  v_table text;
begin
  foreach v_table in array array['party_rooms', 'room_members', 'party_matches', 'match_players', 'party_events', 'party_messages']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = v_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    end if;
  end loop;
end;
$$;

commit;
