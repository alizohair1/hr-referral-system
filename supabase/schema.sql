-- ============================================================
-- HR REFERRAL SYSTEM — DATABASE SCHEMA  (safe to re-run)
-- Run this in the Supabase SQL Editor (Project > SQL Editor > New query).
-- This script is idempotent: running it on a fresh OR partially set-up
-- database will not error on "already exists".
-- ============================================================

-- ---------- ENUMS ----------
do $$ begin
  create type user_role as enum ('admin', 'bl', 'hr');
exception when duplicate_object then null; end $$;

do $$ begin
  create type app_stage as enum (
    'inbox','inprocess','background_check','decision_pending','accepted','rejected'
  );
exception when duplicate_object then null; end $$;

-- ---------- PROFILES (extends auth.users) ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  email       text not null,
  role        user_role not null default 'bl',
  branch      text,
  must_change_password boolean not null default false,
  created_at  timestamptz not null default now()
);
-- add column if an older profiles table already existed
alter table public.profiles add column if not exists must_change_password boolean not null default false;

-- ---------- REFERRALS ----------
create table if not exists public.referrals (
  id                uuid primary key default gen_random_uuid(),
  candidate_name    text not null,
  candidate_email   text,
  candidate_phone   text,
  position          text,
  experience_years  numeric,
  current_company   text,
  notes             text,
  cv_path           text,
  cv_name           text,
  cv_mime           text,
  referred_by       uuid not null references public.profiles(id),
  branch            text,
  stage             app_stage not null default 'inbox',
  claimed_by        uuid references public.profiles(id),
  claimed_at        timestamptz,
  decision_reason   text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
-- add CV metadata columns if an older referrals table already existed
alter table public.referrals add column if not exists cv_name text;
alter table public.referrals add column if not exists cv_mime text;

create index if not exists referrals_stage_idx        on public.referrals(stage);
create index if not exists referrals_referred_by_idx  on public.referrals(referred_by);
create index if not exists referrals_claimed_by_idx   on public.referrals(claimed_by);

-- ---------- AUDIT TRAIL ----------
create table if not exists public.referral_events (
  id           uuid primary key default gen_random_uuid(),
  referral_id  uuid not null references public.referrals(id) on delete cascade,
  actor_id     uuid references public.profiles(id),
  from_stage   app_stage,
  to_stage     app_stage,
  note         text,
  created_at   timestamptz not null default now()
);
create index if not exists referral_events_ref_idx on public.referral_events(referral_id);

-- ---------- CUSTOM FORM FIELDS (admin-defined refer form) ----------
create table if not exists public.form_fields (
  id          uuid primary key default gen_random_uuid(),
  label       text not null,
  field_type  text not null default 'short_text',  -- short_text|long_text|number|dropdown|checkboxes|date|yesno
  options     jsonb not null default '[]'::jsonb,    -- choices for dropdown/checkboxes
  required    boolean not null default false,
  sort_order  integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists form_fields_sort_idx on public.form_fields(sort_order);

-- flexible answers to the custom fields, keyed by field id
alter table public.referrals add column if not exists answers jsonb not null default '{}'::jsonb;

-- ============================================================
-- FUNCTIONS & TRIGGERS  (create or replace = safe to re-run)
-- ============================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_referrals_touch on public.referrals;
create trigger trg_referrals_touch
  before update on public.referrals
  for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, role, branch, must_change_password)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'bl'),
    new.raw_user_meta_data->>'branch',
    coalesce((new.raw_user_meta_data->>'must_change_password')::boolean, false)
  );
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- atomic claim: only one HR can ever win
create or replace function public.claim_referral(p_referral_id uuid)
returns public.referrals
language plpgsql security definer set search_path = public as $$
declare v_role user_role; v_row public.referrals;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role not in ('hr','admin') then raise exception 'Only HR can claim referrals'; end if;

  update public.referrals
     set stage='inprocess', claimed_by=auth.uid(), claimed_at=now()
   where id=p_referral_id and stage='inbox' and claimed_by is null
  returning * into v_row;

  if v_row.id is null then raise exception 'Referral already claimed or unavailable'; end if;

  insert into public.referral_events(referral_id, actor_id, from_stage, to_stage, note)
  values (p_referral_id, auth.uid(), 'inbox', 'inprocess', 'Claimed');
  return v_row;
end; $$;

-- move stage + log it
create or replace function public.move_stage(p_referral_id uuid, p_to_stage app_stage, p_reason text default null)
returns public.referrals
language plpgsql security definer set search_path = public as $$
declare v_role user_role; v_from app_stage; v_row public.referrals;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role not in ('hr','admin') then raise exception 'Only HR can move referrals'; end if;

  select stage into v_from from public.referrals where id = p_referral_id;
  update public.referrals set stage=p_to_stage, decision_reason=coalesce(p_reason, decision_reason)
   where id=p_referral_id returning * into v_row;

  insert into public.referral_events(referral_id, actor_id, from_stage, to_stage, note)
  values (p_referral_id, auth.uid(), v_from, p_to_stage, p_reason);
  return v_row;
end; $$;

-- clear the forced-password-change flag for the current user
create or replace function public.clear_password_change_flag()
returns void language plpgsql security definer set search_path = public as $$
begin update public.profiles set must_change_password=false where id=auth.uid(); end; $$;

-- current user's role helper
create or replace function public.my_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ============================================================
-- ROW LEVEL SECURITY  (drop-if-exists makes policies re-runnable)
-- ============================================================
alter table public.profiles        enable row level security;
alter table public.referrals       enable row level security;
alter table public.referral_events enable row level security;
alter table public.form_fields     enable row level security;

drop policy if exists "anyone authed reads fields" on public.form_fields;
create policy "anyone authed reads fields" on public.form_fields for select to authenticated
  using ( true );

drop policy if exists "admin writes fields" on public.form_fields;
create policy "admin writes fields" on public.form_fields for all
  using ( public.my_role() = 'admin' )
  with check ( public.my_role() = 'admin' );

drop policy if exists "read own or admin reads all" on public.profiles;
create policy "read own or admin reads all" on public.profiles for select
  using ( id = auth.uid() or public.my_role() = 'admin' );

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update
  using ( id = auth.uid() or public.my_role() = 'admin' );

drop policy if exists "select referrals by role" on public.referrals;
create policy "select referrals by role" on public.referrals for select
  using ( public.my_role() in ('hr','admin') or referred_by = auth.uid() );

drop policy if exists "bl insert own referrals" on public.referrals;
create policy "bl insert own referrals" on public.referrals for insert
  with check ( referred_by = auth.uid() );

drop policy if exists "admin update referrals" on public.referrals;
create policy "admin update referrals" on public.referrals for update
  using ( public.my_role() = 'admin' );

drop policy if exists "select events by role" on public.referral_events;
create policy "select events by role" on public.referral_events for select
  using (
    public.my_role() in ('hr','admin')
    or exists (select 1 from public.referrals r where r.id = referral_id and r.referred_by = auth.uid())
  );

-- ============================================================
-- STORAGE BUCKET for CVs
-- ============================================================
insert into storage.buckets (id, name, public)
values ('cvs', 'cvs', false)
on conflict (id) do nothing;

drop policy if exists "authenticated upload cvs" on storage.objects;
create policy "authenticated upload cvs" on storage.objects for insert to authenticated
  with check ( bucket_id = 'cvs' );

drop policy if exists "read cvs by role" on storage.objects;
create policy "read cvs by role" on storage.objects for select to authenticated
  using ( bucket_id = 'cvs' );

-- ============================================================
-- SEED default refer-form fields (only if table is empty).
-- These mirror the original built-in fields so nothing is lost;
-- admins can edit/delete/reorder them freely.
-- ============================================================
insert into public.form_fields (label, field_type, options, required, sort_order)
select * from (values
  ('Candidate email',   'short_text', '[]'::jsonb, true,  1),
  ('Phone',             'short_text', '[]'::jsonb, false, 2),
  ('Position',          'short_text', '[]'::jsonb, true,  3),
  ('Experience (years)','number',     '[]'::jsonb, false, 4),
  ('Current company',   'short_text', '[]'::jsonb, false, 5),
  ('Notes',             'long_text',  '[]'::jsonb, false, 6)
) as v(label, field_type, options, required, sort_order)
where not exists (select 1 from public.form_fields);

-- if upgrading an older DB, relax NOT NULL on now-custom columns
alter table public.referrals alter column candidate_email drop not null;
alter table public.referrals alter column position drop not null;
