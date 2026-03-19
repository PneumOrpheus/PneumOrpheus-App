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
  age integer check (age > 0 and age < 130),
  sex public.patient_sex,
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
  study_file_path text,
  study_file_name text,
  study_file_size_bytes bigint,
  study_file_mime_type text,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.patients alter column age drop not null;
alter table public.patients alter column sex drop not null;
alter table public.analyses add column if not exists study_file_path text;
alter table public.analyses add column if not exists study_file_name text;
alter table public.analyses add column if not exists study_file_size_bytes bigint;
alter table public.analyses add column if not exists study_file_mime_type text;

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

create or replace function public.create_analysis_atomic(
  p_analysis_id text,
  p_patient_id text,
  p_patient_name text,
  p_modality public.analysis_modality,
  p_study_file_path text,
  p_study_file_name text,
  p_study_file_size_bytes bigint,
  p_study_file_mime_type text,
  p_clinician_email text,
  p_findings text default 'Report submitted. Processing in progress.'
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_ids text[];
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  insert into public.patients (
    id,
    user_id,
    name,
    email
  )
  values (
    p_patient_id,
    auth.uid(),
    p_patient_name,
    p_clinician_email
  )
  on conflict (id) do update
    set
      name = excluded.name,
      email = excluded.email,
      user_id = excluded.user_id;

  insert into public.analyses (
    id,
    user_id,
    patient_id,
    patient_name,
    modality,
    status,
    findings,
    classifications,
    study_file_path,
    study_file_name,
    study_file_size_bytes,
    study_file_mime_type
  )
  values (
    p_analysis_id,
    auth.uid(),
    p_patient_id,
    p_patient_name,
    p_modality,
    'In Review',
    p_findings,
    '[]'::jsonb,
    p_study_file_path,
    p_study_file_name,
    p_study_file_size_bytes,
    p_study_file_mime_type
  );

  select recent_analysis_ids
  into current_ids
  from public.patients
  where id = p_patient_id and user_id = auth.uid()
  for update;

  current_ids := array_remove(coalesce(current_ids, '{}'::text[]), p_analysis_id);
  current_ids := array_prepend(p_analysis_id, current_ids);

  if coalesce(array_length(current_ids, 1), 0) > 20 then
    current_ids := current_ids[1:20];
  end if;

  update public.patients
  set recent_analysis_ids = current_ids
  where id = p_patient_id and user_id = auth.uid();
end;
$$;

grant execute on function public.create_analysis_atomic(
  text,
  text,
  text,
  public.analysis_modality,
  text,
  text,
  bigint,
  text,
  text,
  text
) to authenticated;

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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'study-files',
  'study-files',
  false,
  26214400,
  array['application/dicom', 'application/gzip', 'application/x-gzip', 'application/octet-stream']
)
on conflict (id) do nothing;

drop policy if exists "study_files_select_own" on storage.objects;
create policy "study_files_select_own"
on storage.objects
for select
to authenticated
using (bucket_id = 'study-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "study_files_insert_own" on storage.objects;
create policy "study_files_insert_own"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'study-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "study_files_update_own" on storage.objects;
create policy "study_files_update_own"
on storage.objects
for update
to authenticated
using (bucket_id = 'study-files' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'study-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "study_files_delete_own" on storage.objects;
create policy "study_files_delete_own"
on storage.objects
for delete
to authenticated
using (bucket_id = 'study-files' and (storage.foldername(name))[1] = auth.uid()::text);