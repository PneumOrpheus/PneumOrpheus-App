create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'analysis_status') then
    create type public.analysis_status as enum ('Completed', 'In Review');
  end if;

  if not exists (select 1 from pg_type where typname = 'analysis_modality') then
    create type public.analysis_modality as enum ('Chest PET', 'CT Chest');
  end if;

  if not exists (select 1 from pg_type where typname = 'patient_sex') then
    create type public.patient_sex as enum ('Female', 'Male');
  end if;
end
$$;

create table if not exists public.patients (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  age integer not null check (age > 0 and age < 130),
  sex public.patient_sex not null,
  email text not null,
  recent_analysis_ids text[] not null default '{}',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.analyses (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  patient_id text not null references public.patients(id) on delete cascade,
  patient_name text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  modality public.analysis_modality not null,
  status public.analysis_status not null,
  findings text not null,
  classifications jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_patients_user_id on public.patients(user_id);
create index if not exists idx_analyses_user_id on public.analyses(user_id);
create index if not exists idx_analyses_user_id_created_at on public.analyses(user_id, created_at desc);
create index if not exists idx_analyses_patient_id on public.analyses(patient_id);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists set_patients_updated_at on public.patients;
create trigger set_patients_updated_at
before update on public.patients
for each row
execute procedure public.handle_updated_at();

drop trigger if exists set_analyses_updated_at on public.analyses;
create trigger set_analyses_updated_at
before update on public.analyses
for each row
execute procedure public.handle_updated_at();

alter table public.patients enable row level security;
alter table public.analyses enable row level security;

drop policy if exists "patients_select_own" on public.patients;
create policy "patients_select_own"
on public.patients
for select
using (auth.uid() = user_id);

drop policy if exists "patients_insert_own" on public.patients;
create policy "patients_insert_own"
on public.patients
for insert
with check (auth.uid() = user_id);

drop policy if exists "patients_update_own" on public.patients;
create policy "patients_update_own"
on public.patients
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "patients_delete_own" on public.patients;
create policy "patients_delete_own"
on public.patients
for delete
using (auth.uid() = user_id);

drop policy if exists "analyses_select_own" on public.analyses;
create policy "analyses_select_own"
on public.analyses
for select
using (auth.uid() = user_id);

drop policy if exists "analyses_insert_own" on public.analyses;
create policy "analyses_insert_own"
on public.analyses
for insert
with check (auth.uid() = user_id);

drop policy if exists "analyses_update_own" on public.analyses;
create policy "analyses_update_own"
on public.analyses
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "analyses_delete_own" on public.analyses;
create policy "analyses_delete_own"
on public.analyses
for delete
using (auth.uid() = user_id);