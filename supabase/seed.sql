-- Seeds starter data for the first auth user in auth.users.
-- Run this after applying supabase/schema.sql.

with target_user as (
  select
    id,
    email,
    coalesce(
      nullif(trim(raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(raw_user_meta_data ->> 'name'), ''),
      split_part(email, '@', 1)
    ) as name
  from auth.users
  order by created_at asc
  limit 1
)
insert into public.clinicians (id, email, name)
select id, email, name
from target_user
where id is not null and email is not null
on conflict (id) do update
set
  email = excluded.email,
  name = excluded.name;

with target_user as (
  select id, email
  from auth.users
  order by created_at asc
  limit 1
)
insert into public.patients (id, user_id, clinician_email, name, age, sex, recent_analysis_ids)
select *
from (
  select
    'P-2001'::text,
    (select id from target_user),
    (select email from target_user),
    'Marina Solberg'::text,
    61,
    'Female'::public.patient_sex,
    array['A-1042']::text[]
  union all
  select
    'P-2002'::text,
    (select id from target_user),
    (select email from target_user),
    'Erik Vollen'::text,
    67,
    'Male'::public.patient_sex,
    array['A-1043']::text[]
  union all
  select
    'P-2003'::text,
    (select id from target_user),
    (select email from target_user),
    'Aisha Khan'::text,
    49,
    'Female'::public.patient_sex,
    array['A-1044']::text[]
) as seed_rows(id, user_id, clinician_email, name, age, sex, recent_analysis_ids)
where (select id from target_user) is not null
  and (select email from target_user) is not null
on conflict (id) do update
set
  user_id = excluded.user_id,
  clinician_email = excluded.clinician_email,
  name = excluded.name,
  age = excluded.age,
  sex = excluded.sex,
  recent_analysis_ids = excluded.recent_analysis_ids;

with target_user as (
  select id, email
  from auth.users
  order by created_at asc
  limit 1
)
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
  classifications
)
select *
from (
  select
    'A-1042'::text,
    (select id from target_user),
    (select email from target_user),
    'P-2001'::text,
    'Marina Solberg'::text,
    '2026-03-10T09:00:00Z'::timestamptz,
    'CT Chest'::public.analysis_modality,
    'Completed'::public.analysis_status,
    'Findings are consistent with Adenocarcinoma pattern, with bilateral lower-lobe involvement.'::text,
    '[{"side":"Left","prediction":"Adenocarcinoma","confidence":0.91,"explanation":"Peripheral gland-forming lesion pattern with lower-lobe predominance."},{"side":"Right","prediction":"Adenocarcinoma","confidence":0.88,"explanation":"Focal right lower-zone density consistent with adenocarcinoma morphology."}]'::jsonb
  union all
  select
    'A-1043'::text,
    (select id from target_user),
    (select email from target_user),
    'P-2002'::text,
    'Erik Vollen'::text,
    '2026-03-12T12:00:00Z'::timestamptz,
    'Chest PET'::public.analysis_modality,
    'Completed'::public.analysis_status,
    'Central hilar mass pattern suggestive of Small Cell Carcinoma.'::text,
    '[{"side":"Left","prediction":"Small Cell Carcinoma","confidence":0.84,"explanation":"Central perihilar soft-tissue mass pattern with aggressive growth characteristics."},{"side":"Right","prediction":"Small Cell Carcinoma","confidence":0.82,"explanation":"Mediastinal-adjacent lesion profile typical of small cell histology."}]'::jsonb
  union all
  select
    'A-1044'::text,
    (select id from target_user),
    (select email from target_user),
    'P-2003'::text,
    'Aisha Khan'::text,
    '2026-03-14T15:30:00Z'::timestamptz,
    'CT Chest'::public.analysis_modality,
    'In Review'::public.analysis_status,
    'Upper-lobe cavitary lesion pattern compatible with Squamous Cell Carcinoma.'::text,
    '[{"side":"Left","prediction":"Squamous Cell Carcinoma","confidence":0.93,"explanation":"Upper-lobe cavitary lesion morphology with squamous differentiation features."},{"side":"Right","prediction":"Squamous Cell Carcinoma","confidence":0.92,"explanation":"Irregular hilar-adjacent mass contour consistent with squamous-cell-like presentation."}]'::jsonb
) as seed_rows(
  id,
  user_id,
  clinician_email,
  patient_id,
  patient_name,
  created_at,
  modality,
  status,
  findings,
  classifications
)
where (select id from target_user) is not null
  and (select email from target_user) is not null
on conflict (id) do update
set
  user_id = excluded.user_id,
  clinician_email = excluded.clinician_email,
  patient_id = excluded.patient_id,
  patient_name = excluded.patient_name,
  created_at = excluded.created_at,
  modality = excluded.modality,
  status = excluded.status,
  findings = excluded.findings,
  classifications = excluded.classifications;