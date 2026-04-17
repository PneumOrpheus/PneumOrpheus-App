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

create table if not exists public.clinicians (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.patients (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  clinician_email text not null,
  name text not null,
  age integer check (age > 0 and age < 130),
  sex public.patient_sex,
  recent_analysis_ids text[] not null default '{}',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.analyses (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  clinician_email text not null,
  patient_id text not null references public.patients(id) on delete cascade,
  patient_name text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  modality public.analysis_modality not null,
  status public.analysis_status not null,
  findings text not null,
  classifications jsonb not null default '[]'::jsonb,
  plot_file_path text,
  plot_file_name text,
  plot_file_size_bytes bigint,
  plot_file_mime_type text,
  visualization_data jsonb,
  cancer_type text,
  classification_confidence double precision,
  reasoning text,
  proposed_tnm_stage text,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.patients alter column age drop not null;
alter table public.patients alter column sex drop not null;
alter table public.clinicians add column if not exists name text;
alter table public.patients add column if not exists clinician_email text;
alter table public.analyses add column if not exists clinician_email text;
alter table public.analyses add column if not exists plot_file_path text;
alter table public.analyses add column if not exists plot_file_name text;
alter table public.analyses add column if not exists plot_file_size_bytes bigint;
alter table public.analyses add column if not exists plot_file_mime_type text;
alter table public.analyses add column if not exists visualization_data jsonb;
alter table public.analyses add column if not exists cancer_type text;
alter table public.analyses add column if not exists classification_confidence double precision;
alter table public.analyses add column if not exists reasoning text;
alter table public.analyses add column if not exists proposed_tnm_stage text;
alter table public.analyses drop column if exists study_file_path;
alter table public.analyses drop column if exists study_file_name;
alter table public.analyses drop column if exists study_file_size_bytes;
alter table public.analyses drop column if exists study_file_mime_type;
alter table public.analyses drop column if exists grad_cam_file_path;
alter table public.analyses drop column if exists grad_cam_file_name;
alter table public.analyses drop column if exists grad_cam_file_size_bytes;
alter table public.analyses drop column if exists grad_cam_file_mime_type;
alter table public.analyses drop column if exists segmentation_data;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'patients'
      and column_name = 'email'
  ) then
    update public.patients as p
    set clinician_email = coalesce(p.clinician_email, au.email, p.email)
    from auth.users as au
    where au.id = p.user_id and p.clinician_email is null;
  else
    update public.patients as p
    set clinician_email = coalesce(p.clinician_email, au.email)
    from auth.users as au
    where au.id = p.user_id and p.clinician_email is null;
  end if;
end
$$;

update public.analyses as a
set clinician_email = coalesce(a.clinician_email, au.email)
from auth.users as au
where au.id = a.user_id and a.clinician_email is null;

insert into public.clinicians (id, email)
select distinct p.user_id, p.clinician_email
from public.patients as p
where p.clinician_email is not null
on conflict (id) do update
set email = excluded.email;

insert into public.clinicians (id, email)
select distinct a.user_id, a.clinician_email
from public.analyses as a
where a.clinician_email is not null
on conflict (id) do update
set email = excluded.email;

update public.clinicians as c
set name = coalesce(
  nullif(c.name, ''),
  nullif(trim(au.raw_user_meta_data ->> 'full_name'), ''),
  nullif(trim(au.raw_user_meta_data ->> 'name'), ''),
  split_part(c.email, '@', 1)
)
from auth.users as au
where au.id = c.id
  and (c.name is null or trim(c.name) = '');

alter table public.patients drop column if exists email;

create unique index if not exists idx_clinicians_email on public.clinicians(email);
create unique index if not exists idx_clinicians_id_email on public.clinicians(id, email);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'patients_clinician_fk'
      and conrelid = 'public.patients'::regclass
  ) then
    alter table public.patients
      add constraint patients_clinician_fk
      foreign key (user_id, clinician_email)
      references public.clinicians(id, email)
      on delete cascade;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'analyses_clinician_fk'
      and conrelid = 'public.analyses'::regclass
  ) then
    alter table public.analyses
      add constraint analyses_clinician_fk
      foreign key (user_id, clinician_email)
      references public.clinicians(id, email)
      on delete cascade;
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from public.patients where clinician_email is null) then
    alter table public.patients alter column clinician_email set not null;
  end if;

  if not exists (select 1 from public.analyses where clinician_email is null) then
    alter table public.analyses alter column clinician_email set not null;
  end if;
end
$$;

create index if not exists idx_patients_clinician on public.patients(user_id, clinician_email);
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

drop function if exists public.create_analysis_atomic(
  text,
  text,
  text,
  public.analysis_modality,
  text,
  text,
  bigint,
  text,
  text,
  text,
  bigint,
  text,
  public.analysis_status,
  text,
  jsonb,
  text,
  double precision,
  text,
  text
);

drop function if exists public.create_analysis_atomic(
  text,
  text,
  text,
  public.analysis_modality,
  text,
  text,
  bigint,
  text,
  text,
  public.analysis_status,
  text,
  jsonb,
  jsonb,
  text,
  double precision,
  text,
  text
);

drop function if exists public.create_analysis_atomic(
  text,
  text,
  text,
  public.analysis_modality,
  text,
  text,
  bigint,
  text,
  public.analysis_status,
  text,
  jsonb,
  text,
  double precision,
  text,
  text
);

create or replace function public.create_analysis_atomic(
  p_analysis_id text,
  p_patient_id text,
  p_patient_name text,
  p_modality public.analysis_modality,
  p_plot_file_path text default null,
  p_plot_file_name text default null,
  p_plot_file_size_bytes bigint default null,
  p_plot_file_mime_type text default null,
  p_visualization_data jsonb default null,
  p_status public.analysis_status default 'In Review',
  p_findings text default 'Report submitted. Processing in progress.',
  p_classifications jsonb default '[]'::jsonb,
  p_cancer_type text default null,
  p_classification_confidence double precision default null,
  p_reasoning text default null,
  p_proposed_tnm_stage text default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_ids text[];
  current_clinician_email text;
  current_clinician_name text;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  current_clinician_email := nullif(auth.jwt() ->> 'email', '');

  if current_clinician_email is null then
    raise exception 'Clinician email is required in auth context';
  end if;

  current_clinician_name := coalesce(
    nullif(trim(auth.jwt() -> 'user_metadata' ->> 'full_name'), ''),
    nullif(trim(auth.jwt() -> 'user_metadata' ->> 'name'), ''),
    split_part(current_clinician_email, '@', 1)
  );

  insert into public.clinicians (
    id,
    email,
    name
  )
  values (
    auth.uid(),
    current_clinician_email,
    current_clinician_name
  )
  on conflict (id) do update
    set
      email = excluded.email,
      name = coalesce(excluded.name, public.clinicians.name);

  insert into public.patients (
    id,
    user_id,
    clinician_email,
    name
  )
  values (
    p_patient_id,
    auth.uid(),
    current_clinician_email,
    p_patient_name
  )
  on conflict (id) do update
    set
      name = excluded.name,
      user_id = excluded.user_id,
      clinician_email = excluded.clinician_email;

  insert into public.analyses (
    id,
    user_id,
    clinician_email,
    patient_id,
    patient_name,
    modality,
    status,
    findings,
    classifications,
    plot_file_path,
    plot_file_name,
    plot_file_size_bytes,
    plot_file_mime_type,
    visualization_data,
    cancer_type,
    classification_confidence,
    reasoning,
    proposed_tnm_stage
  )
  values (
    p_analysis_id,
    auth.uid(),
    current_clinician_email,
    p_patient_id,
    p_patient_name,
    p_modality,
    p_status,
    p_findings,
    coalesce(p_classifications, '[]'::jsonb),
    p_plot_file_path,
    p_plot_file_name,
    p_plot_file_size_bytes,
    p_plot_file_mime_type,
    p_visualization_data,
    p_cancer_type,
    p_classification_confidence,
    p_reasoning,
    p_proposed_tnm_stage
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
  jsonb,
  public.analysis_status,
  text,
  jsonb,
  text,
  double precision,
  text,
  text
) to authenticated;

drop trigger if exists set_patients_updated_at on public.patients;
create trigger set_patients_updated_at
before update on public.patients
for each row
execute procedure public.handle_updated_at();

drop trigger if exists set_clinicians_updated_at on public.clinicians;
create trigger set_clinicians_updated_at
before update on public.clinicians
for each row
execute procedure public.handle_updated_at();

drop trigger if exists set_analyses_updated_at on public.analyses;
create trigger set_analyses_updated_at
before update on public.analyses
for each row
execute procedure public.handle_updated_at();

alter table public.clinicians enable row level security;
alter table public.patients enable row level security;
alter table public.analyses enable row level security;

drop policy if exists "clinicians_select_own" on public.clinicians;
create policy "clinicians_select_own"
on public.clinicians
for select
using (auth.uid() = id);

drop policy if exists "clinicians_insert_own" on public.clinicians;
create policy "clinicians_insert_own"
on public.clinicians
for insert
with check (auth.uid() = id);

drop policy if exists "clinicians_update_own" on public.clinicians;
create policy "clinicians_update_own"
on public.clinicians
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "clinicians_delete_own" on public.clinicians;
create policy "clinicians_delete_own"
on public.clinicians
for delete
using (auth.uid() = id);

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
using (
  bucket_id = 'study-files'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1
      from public.analyses as a
      where a.user_id = auth.uid()
        and (
          a.plot_file_path = storage.objects.name
          or a.plot_file_path = 'study-files/' || storage.objects.name
        )
    )
  )
);

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