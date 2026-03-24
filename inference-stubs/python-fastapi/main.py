from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import JSONResponse


app = FastAPI(title="PneumOrpheus Inference Stub", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/infer")
async def infer(
    analysisId: str = Form(...),
    patientId: str = Form(...),
    patientName: str = Form(...),
    modality: str = Form(...),
    clinicianEmail: str = Form(...),
    studyFile: UploadFile = File(...),
) -> JSONResponse:
    file_bytes = await studyFile.read()
    file_name = studyFile.filename or "study-file"
    suffix = "".join(Path(file_name).suffixes).lower()
    is_nifti = suffix in {".nii", ".nii.gz"}

    predicted_type = "Small Cell Carcinoma" if is_nifti else "Adenocarcinoma"
    confidence = 0.89 if is_nifti else 0.86
    proposed_tnm = "T2N1M0" if is_nifti else "T1N0M0"

    response: dict[str, Any] = {
        "analysisId": analysisId,
        "patientId": patientId,
        "patientName": patientName,
        "modality": modality,
        "clinicianEmail": clinicianEmail,
        "receivedAt": datetime.now(timezone.utc).isoformat(),
        "sourceFile": {
            "name": file_name,
            "mimeType": studyFile.content_type or "application/octet-stream",
            "sizeBytes": len(file_bytes),
        },
        "findings": (
            f"Model predicts {predicted_type} with {round(confidence * 100)}% confidence "
            "based on lesion morphology and density patterns in the uploaded study."
        ),
        "cancerType": predicted_type,
        "classificationConfidence": confidence,
        "reasoning": (
            "Detected malignant-appearing lesion distribution, margin irregularity, and intensity profile "
            "compatible with the predicted subtype."
        ),
        "proposedTnmStage": proposed_tnm,
        "classifications": [
            {
                "side": "Left",
                "prediction": predicted_type,
                "confidence": confidence,
                "explanation": "Primary left-side lesion demonstrates dominant malignant signature.",
            },
            {
                "side": "Right",
                "prediction": predicted_type,
                "confidence": max(0.0, min(1.0, confidence - 0.03)),
                "explanation": "Secondary right-side suspicious region with supporting radiographic traits.",
            },
        ],
        "segmentationData": {
            "format": "polygon",
            "labels": ["tumor", "nodule"],
            "regions": [
                {
                    "id": "region-1",
                    "label": "tumor",
                    "sliceIndex": 42,
                    "points": [[120, 88], [158, 92], [162, 133], [124, 130]],
                },
                {
                    "id": "region-2",
                    "label": "nodule",
                    "sliceIndex": 47,
                    "points": [[210, 160], [228, 164], [232, 184], [214, 182]],
                },
            ],
        },
    }

    return JSONResponse(content=response)
