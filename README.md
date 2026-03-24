This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Environment Variables

Create a `.env.local` file in the project root with:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
INFERENCE_API_URL=https://your-inference-backend.example.com/infer
```

Optional backend auth token:

```bash
INFERENCE_API_KEY=your_backend_bearer_token
```

Optional fallback (if your Supabase project uses this naming):

```bash
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_anon_key
```

For email confirmation redirects, set your Supabase Auth redirect URL to:

```bash
http://localhost:3000/auth/callback
```

## Inference Backend Contract

When a report is uploaded, `POST /api/reports` forwards the uploaded study file and metadata to `INFERENCE_API_URL` using `multipart/form-data`.

Request fields sent to the backend:

- `analysisId`
- `patientId`
- `patientName`
- `modality`
- `clinicianEmail`
- `studyFile` (the uploaded DICOM/NIfTI file)

Expected JSON response (flexible keys supported):

- `segmentationData` (or `segmentation` / `segmentationMask`)
- `cancerType` (or `classification.label` / `classificationType`)
- `classificationConfidence` (0..1 or 0..100)
- `reasoning` (or `rationale`)
- `proposedTnmStage` (or `tnmStage`)
- `findings` (optional summary string)
- `classifications` (optional list of per-region/side predictions)

A ready-to-run FastAPI stub implementation for this contract is available in [inference-stubs/README.md](inference-stubs/README.md).

## Database Schema

Apply the schema in [supabase/schema.sql](supabase/schema.sql) in your Supabase SQL editor.
It creates `patients` and `analyses` tables, enums, indexes, update triggers, and RLS policies scoped per authenticated user.

For local/demo starter data, run [supabase/seed.sql](supabase/seed.sql) after schema setup.
It inserts/upserts sample patients and analyses for the oldest user in `auth.users`.
Seeded analysis classes are `Adenocarcinoma`, `Small Cell Carcinoma`, and `Squamous Cell Carcinoma`.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Azure DevOps Deployment

This repository is prepared for Azure DevOps CI/CD using [azure-pipelines.yml](azure-pipelines.yml).

### What the pipeline does

- Validates the Next.js app (`npm ci`, `npm run lint`, `npm run build`)
- Builds and pushes 2 container images to ACR:
	- Main web app (`Dockerfile`)
	- Python inference server (`inference-stubs/python-fastapi/Dockerfile`)
- Optionally deploys those images to Azure Web App for Containers

### Required Azure Pipeline variables

Update these defaults in [azure-pipelines.yml](azure-pipelines.yml) or set them in your pipeline UI/variable group:

- `dockerRegistryServiceConnection` (Azure DevOps service connection to ACR)
- `azureSubscriptionServiceConnection` (for deploy tasks)
- `acrLoginServer` (for example: `myregistry.azurecr.io`)
- `keyVaultName`
- `webAppResourceGroup`
- `inferenceApiUrl`
- `keyVaultSupabaseUrlSecretName` (default: `NEXT_PUBLIC_SUPABASE_URL`)
- `keyVaultSupabaseAnonKeySecretName` (default: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`)
- `keyVaultInferenceApiKeySecretName` (optional)
- `appImageRepository`
- `inferencePythonImageRepository`

Optional deploy targets (leave empty to skip deploy):

- `webAppName`
- `webAppInferencePythonName`

### Required Azure App Settings

The pipeline now sets app settings during deploy:

- Pulls `NEXT_PUBLIC_SUPABASE_URL` and Supabase publishable key from Azure Key Vault
- Sets `INFERENCE_API_URL` from pipeline variable `inferenceApiUrl`
- Sets `INFERENCE_API_KEY` from Key Vault when `keyVaultInferenceApiKeySecretName` is provided
- Sets `WEBSITES_PORT` (`3000` for web app, `8001` for inference apps)

### Key Vault permissions

The service principal used by `azureSubscriptionServiceConnection` must have access to read secrets from your Key Vault (RBAC role like `Key Vault Secrets User`, or equivalent access policy).

Local `.env` remains for local development only; production secrets should stay in Azure Key Vault.

### Health probes

- Web app health endpoint: `/api/health`
- Inference stubs health endpoint: `/health`

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Alternative Deploy Targets

The app remains compatible with generic Next.js container deployment targets beyond Azure.
