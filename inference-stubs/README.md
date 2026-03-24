# Inference Endpoint Stubs

This folder contains the minimal FastAPI model-server stub that matches the upload contract used by `POST /api/reports`.

## Contract

`POST /infer` with `multipart/form-data` fields:

- `analysisId`
- `patientId`
- `patientName`
- `modality`
- `clinicianEmail`
- `studyFile` (DICOM or NIfTI)

Returns JSON including:

- `segmentationData`
- `cancerType`
- `classificationConfidence`
- `reasoning`
- `proposedTnmStage`
- `findings`
- `classifications`

## Python (FastAPI)

Location: `inference-stubs/python-fastapi`

```bash
cd inference-stubs/python-fastapi
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

Container:

```bash
docker build -t pneumorpheus-inference-python -f inference-stubs/python-fastapi/Dockerfile inference-stubs/python-fastapi
docker run --rm -p 8001:8001 pneumorpheus-inference-python
```

## Wire to the Next.js app

In your app `.env.local`:

```bash
INFERENCE_API_URL=http://localhost:8001/infer
```

Optional auth if your backend requires it:

```bash
INFERENCE_API_KEY=your_token
```
