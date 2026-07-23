create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'analysis_status') then
    create type public.analysis_status as enum ('Completed', 'In Review', 'Processing', 'Failed');
  end if;

  if not exists (select 1 from pg_type where typname = 'analysis_modality') then
    create type public.analysis_modality as enum ('Chest PET', 'CT Chest');
  end if;

  if not exists (select 1 from pg_type where typname = 'patient_sex') then
    create type public.patient_sex as enum ('Female', 'Male');
  end if;
end
$$;

-- Async job-polling pattern
alter type public.analysis_status add value if not exists 'Processing';
alter type public.analysis_status add value if not exists 'Failed';

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
  study_file_path text,
  study_file_name text,
  study_file_size_bytes bigint,
  study_file_mime_type text,
  grad_cam_study_file_path text,
  grad_cam_study_file_name text,
  grad_cam_study_file_size_bytes bigint,
  grad_cam_study_file_mime_type text,
  segmentation_roi_study_file_path text,
  segmentation_roi_study_file_name text,
  segmentation_roi_study_file_size_bytes bigint,
  segmentation_roi_study_file_mime_type text,
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
alter table public.analyses add column if not exists study_file_path text;
alter table public.analyses add column if not exists study_file_name text;
alter table public.analyses add column if not exists study_file_size_bytes bigint;
alter table public.analyses add column if not exists study_file_mime_type text;
alter table public.analyses add column if not exists grad_cam_study_file_path text;
alter table public.analyses add column if not exists grad_cam_study_file_name text;
alter table public.analyses add column if not exists grad_cam_study_file_size_bytes bigint;
alter table public.analyses add column if not exists grad_cam_study_file_mime_type text;
alter table public.analyses add column if not exists segmentation_roi_study_file_path text;
alter table public.analyses add column if not exists segmentation_roi_study_file_name text;
alter table public.analyses add column if not exists segmentation_roi_study_file_size_bytes bigint;
alter table public.analyses add column if not exists segmentation_roi_study_file_mime_type text;
alter table public.analyses add column if not exists visualization_data jsonb;
alter table public.analyses add column if not exists cancer_type text;
alter table public.analyses add column if not exists classification_confidence double precision;
alter table public.analyses add column if not exists reasoning text;
alter table public.analyses add column if not exists proposed_tnm_stage text;
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'analyses'
      and column_name = 'plot_file_path'
  ) then
    update public.analyses
    set study_file_path = coalesce(study_file_path, plot_file_path)
    where plot_file_path is not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'analyses'
      and column_name = 'plot_file_name'
  ) then
    update public.analyses
    set study_file_name = coalesce(study_file_name, plot_file_name)
    where plot_file_name is not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'analyses'
      and column_name = 'plot_file_size_bytes'
  ) then
    update public.analyses
    set study_file_size_bytes = coalesce(study_file_size_bytes, plot_file_size_bytes)
    where plot_file_size_bytes is not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'analyses'
      and column_name = 'plot_file_mime_type'
  ) then
    update public.analyses
    set study_file_mime_type = coalesce(study_file_mime_type, plot_file_mime_type)
    where plot_file_mime_type is not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'analyses'
      and column_name = 'grad_cam_plot_file_path'
  ) then
    update public.analyses
    set grad_cam_study_file_path = coalesce(grad_cam_study_file_path, grad_cam_plot_file_path)
    where grad_cam_plot_file_path is not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'analyses'
      and column_name = 'grad_cam_plot_file_name'
  ) then
    update public.analyses
    set grad_cam_study_file_name = coalesce(grad_cam_study_file_name, grad_cam_plot_file_name)
    where grad_cam_plot_file_name is not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'analyses'
      and column_name = 'grad_cam_plot_file_size_bytes'
  ) then
    update public.analyses
    set grad_cam_study_file_size_bytes = coalesce(grad_cam_study_file_size_bytes, grad_cam_plot_file_size_bytes)
    where grad_cam_plot_file_size_bytes is not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'analyses'
      and column_name = 'grad_cam_plot_file_mime_type'
  ) then
    update public.analyses
    set grad_cam_study_file_mime_type = coalesce(grad_cam_study_file_mime_type, grad_cam_plot_file_mime_type)
    where grad_cam_plot_file_mime_type is not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'analyses'
      and column_name = 'segmentation_roi_plot_file_path'
  ) then
    update public.analyses
    set segmentation_roi_study_file_path = coalesce(segmentation_roi_study_file_path, segmentation_roi_plot_file_path)
    where segmentation_roi_plot_file_path is not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'analyses'
      and column_name = 'segmentation_roi_plot_file_name'
  ) then
    update public.analyses
    set segmentation_roi_study_file_name = coalesce(segmentation_roi_study_file_name, segmentation_roi_plot_file_name)
    where segmentation_roi_plot_file_name is not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'analyses'
      and column_name = 'segmentation_roi_plot_file_size_bytes'
  ) then
    update public.analyses
    set segmentation_roi_study_file_size_bytes = coalesce(segmentation_roi_study_file_size_bytes, segmentation_roi_plot_file_size_bytes)
    where segmentation_roi_plot_file_size_bytes is not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'analyses'
      and column_name = 'segmentation_roi_plot_file_mime_type'
  ) then
    update public.analyses
    set segmentation_roi_study_file_mime_type = coalesce(segmentation_roi_study_file_mime_type, segmentation_roi_plot_file_mime_type)
    where segmentation_roi_plot_file_mime_type is not null;
  end if;
end
$$;

drop policy if exists "study_files_select_own" on storage.objects;
drop policy if exists "study_files_insert_own" on storage.objects;
drop policy if exists "study_files_update_own" on storage.objects;
drop policy if exists "study_files_delete_own" on storage.objects;

alter table public.analyses drop column if exists plot_file_path;
alter table public.analyses drop column if exists plot_file_name;
alter table public.analyses drop column if exists plot_file_size_bytes;
alter table public.analyses drop column if exists plot_file_mime_type;
alter table public.analyses drop column if exists grad_cam_plot_file_path;
alter table public.analyses drop column if exists grad_cam_plot_file_name;
alter table public.analyses drop column if exists grad_cam_plot_file_size_bytes;
alter table public.analyses drop column if exists grad_cam_plot_file_mime_type;
alter table public.analyses drop column if exists segmentation_roi_plot_file_path;
alter table public.analyses drop column if exists segmentation_roi_plot_file_name;
alter table public.analyses drop column if exists segmentation_roi_plot_file_size_bytes;
alter table public.analyses drop column if exists segmentation_roi_plot_file_mime_type;
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
  and p.user_id is not null
on conflict (id) do update
set email = excluded.email;

insert into public.clinicians (id, email)
select distinct a.user_id, a.clinician_email
from public.analyses as a
where a.clinician_email is not null
  and a.user_id is not null
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

-- Shared, static reference records (e.g. the "Ola Nordmann" demo patient) are
-- visible to every clinician. They are not owned by any individual user
-- (user_id is null), which is what keeps them out of reach of the ordinary
-- write policies below, all of which require auth.uid() = user_id.
alter table public.patients add column if not exists is_shared boolean not null default false;
alter table public.analyses add column if not exists is_shared boolean not null default false;

alter table public.patients alter column user_id drop not null;
alter table public.analyses alter column user_id drop not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'patients_shared_user_id_check'
      and conrelid = 'public.patients'::regclass
  ) then
    alter table public.patients
      add constraint patients_shared_user_id_check
      check ((is_shared and user_id is null) or (not is_shared and user_id is not null));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'analyses_shared_user_id_check'
      and conrelid = 'public.analyses'::regclass
  ) then
    alter table public.analyses
      add constraint analyses_shared_user_id_check
      check ((is_shared and user_id is null) or (not is_shared and user_id is not null));
  end if;
end
$$;

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

drop function if exists public.create_analysis_atomic(
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
);

create or replace function public.create_analysis_atomic(
  p_analysis_id text,
  p_patient_id text,
  p_patient_name text,
  p_modality public.analysis_modality,
  p_study_file_path text default null,
  p_study_file_name text default null,
  p_study_file_size_bytes bigint default null,
  p_study_file_mime_type text default null,
  p_grad_cam_study_file_path text default null,
  p_grad_cam_study_file_name text default null,
  p_grad_cam_study_file_size_bytes bigint default null,
  p_grad_cam_study_file_mime_type text default null,
  p_segmentation_roi_study_file_path text default null,
  p_segmentation_roi_study_file_name text default null,
  p_segmentation_roi_study_file_size_bytes bigint default null,
  p_segmentation_roi_study_file_mime_type text default null,
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
  current_clinician_email text;
  current_clinician_name text;
begin
  if exists (select 1 from public.patients where id = p_patient_id and is_shared) then
    raise exception 'Cannot modify the shared demo patient record';
  end if;

  if exists (select 1 from public.analyses where id = p_analysis_id and is_shared) then
    raise exception 'Cannot modify the shared demo analysis record';
  end if;

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
    study_file_path,
    study_file_name,
    study_file_size_bytes,
    study_file_mime_type,
    grad_cam_study_file_path,
    grad_cam_study_file_name,
    grad_cam_study_file_size_bytes,
    grad_cam_study_file_mime_type,
    segmentation_roi_study_file_path,
    segmentation_roi_study_file_name,
    segmentation_roi_study_file_size_bytes,
    segmentation_roi_study_file_mime_type,
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
    p_study_file_path,
    p_study_file_name,
    p_study_file_size_bytes,
    p_study_file_mime_type,
    p_grad_cam_study_file_path,
    p_grad_cam_study_file_name,
    p_grad_cam_study_file_size_bytes,
    p_grad_cam_study_file_mime_type,
    p_segmentation_roi_study_file_path,
    p_segmentation_roi_study_file_name,
    p_segmentation_roi_study_file_size_bytes,
    p_segmentation_roi_study_file_mime_type,
    p_visualization_data,
    p_cancer_type,
    p_classification_confidence,
    p_reasoning,
    p_proposed_tnm_stage
  );

  update public.patients
  set recent_analysis_ids = (
    case
      when coalesce(
        array_length(
          array_prepend(
            p_analysis_id,
            array_remove(coalesce(public.patients.recent_analysis_ids, '{}'::text[]), p_analysis_id)
          ),
          1
        ),
        0
      ) > 20 then (
        array_prepend(
          p_analysis_id,
          array_remove(coalesce(public.patients.recent_analysis_ids, '{}'::text[]), p_analysis_id)
        )
      )[1:20]
      else array_prepend(
        p_analysis_id,
        array_remove(coalesce(public.patients.recent_analysis_ids, '{}'::text[]), p_analysis_id)
      )
    end
  )
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
  text,
  bigint,
  text,
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
using (auth.uid() = user_id or is_shared);

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
using (auth.uid() = user_id or is_shared);

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
      where (a.user_id = auth.uid() or a.is_shared)
        and (
          a.study_file_path = storage.objects.name
          or a.study_file_path = 'study-files/' || storage.objects.name
          or a.grad_cam_study_file_path = storage.objects.name
          or a.grad_cam_study_file_path = 'study-files/' || storage.objects.name
          or a.segmentation_roi_study_file_path = storage.objects.name
          or a.segmentation_roi_study_file_path = 'study-files/' || storage.objects.name
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

-- Static, shared "Ola Nordmann" demo patient + analysis. Visible to every
-- clinician (see the "or is_shared" select policies above), owned by no one
-- (user_id is null), and therefore unreachable by every insert/update/delete
-- policy, which all require auth.uid() = user_id.
insert into public.patients (
  id,
  user_id,
  clinician_email,
  name,
  age,
  sex,
  recent_analysis_ids,
  is_shared,
  created_at
)
values (
  'P-DEMO-01',
  null,
  'system@pneumorpheus.app',
  'Ola Nordmann',
  45,
  'Male',
  array['A-DEMO-01']::text[],
  true,
  '2024-01-01T00:00:00Z'::timestamptz
)
on conflict (id) do update
set
  user_id = null,
  clinician_email = excluded.clinician_email,
  name = excluded.name,
  age = excluded.age,
  sex = excluded.sex,
  recent_analysis_ids = excluded.recent_analysis_ids,
  is_shared = true;

insert into public.analyses (
  id,
  user_id,
  clinician_email,
  patient_id,
  patient_name,
  created_at,
  modality,
  status,
  findings,
  classifications,
  is_shared
)
values (
  'A-DEMO-01',
  null,
  'system@pneumorpheus.app',
  'P-DEMO-01',
  'Ola Nordmann',
  '2024-01-01T00:00:00Z'::timestamptz,
  'CT Chest'::public.analysis_modality,
  'Completed'::public.analysis_status,
  'Example report included by default for every clinician account. Imaging shows no suspicious pulmonary nodules or masses; findings are within normal limits. This entry is static and cannot be edited or deleted.'::text,
  '[{"side":"Right","prediction":"Benign","confidence":0.98,"explanation":"No suspicious nodules identified. Static example classification shown for reference only."}]'::jsonb,
  true
)
on conflict (id) do update
set
  user_id = null,
  clinician_email = excluded.clinician_email,
  patient_id = excluded.patient_id,
  patient_name = excluded.patient_name,
  modality = excluded.modality,
  status = excluded.status,
  findings = excluded.findings,
  classifications = excluded.classifications,
  is_shared = true;