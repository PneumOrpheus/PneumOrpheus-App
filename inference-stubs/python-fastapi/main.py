from __future__ import annotations

from datetime import datetime, timezone
import hashlib
from typing import Any

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import JSONResponse


app = FastAPI(title="PneumOrpheus Inference Stub", version="0.1.0")


MOCK_CANCER_TYPES = [
    {
        "en": "Adenocarcinoma",
        "no": "Adenokarsinom",
        "tnm": "T1N0M0",
    },
    {
        "en": "Small Cell Carcinoma",
        "no": "Smaacellet karsinom",
        "tnm": "T2N1M0",
    },
    {
        "en": "Squamous Cell Carcinoma",
        "no": "Plateepitelkarsinom",
        "tnm": "T2N0M0",
    },
]


def build_mock_inference_from_bytes(file_bytes: bytes) -> dict[str, Any]:
    if not file_bytes:
        return {
            "cancerTypeEn": "Unknown",
            "cancerTypeNo": "Ukjent",
            "classificationConfidence": 0.0,
            "proposedTnm": "TXNXMX",
            "leftConfidence": 0.0,
            "rightConfidence": 0.0,
            "seed": "00" * 32,
        }

    digest = hashlib.sha256(file_bytes).hexdigest()
    cancer_index = int(digest[:2], 16) % len(MOCK_CANCER_TYPES)
    selected = MOCK_CANCER_TYPES[cancer_index]

    base_confidence = 0.72 + (int(digest[2:4], 16) / 255.0) * 0.23
    base_confidence = max(0.0, min(1.0, round(base_confidence, 2)))

    right_delta = 0.01 + (int(digest[4:6], 16) / 255.0) * 0.04
    right_confidence = max(0.0, min(1.0, round(base_confidence - right_delta, 2)))

    return {
        "cancerTypeEn": selected["en"],
        "cancerTypeNo": selected["no"],
        "classificationConfidence": base_confidence,
        "proposedTnm": selected["tnm"],
        "leftConfidence": base_confidence,
        "rightConfidence": right_confidence,
        "seed": digest,
    }


@app.get("/cancer")
def cancer() -> dict[str, str]:
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
    mock = build_mock_inference_from_bytes(file_bytes)
    predicted_type = mock["cancerTypeEn"]
    predicted_type_no = mock["cancerTypeNo"]
    confidence = mock["classificationConfidence"]
    proposed_tnm = mock["proposedTnm"]
    left_confidence = mock["leftConfidence"]
    right_confidence = mock["rightConfidence"]
    plot_file_name = f"{analysisId}_plot.nii.gz"
    base_slice = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII="

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
        "stubMetadata": {
            "inferenceMode": "content_hash_mock",
            "seed": mock["seed"],
        },
        "plotFilePath": f"manual-upload://{analysisId}/{plot_file_name}",
        "plotFileName": plot_file_name,
        "plotFileSizeBytes": len(file_bytes),
        "plotFileMimeType": "application/gzip",
        "visualizationData": {
            "imageFormat": "png",
            "totalSlices": 3,
            "defaultSliceIndex": 1,
            "slices": [
                {
                    "sliceIndex": 0,
                    "imageDataUrl": base_slice,
                    "hasOverlay": False,
                    "overlayCoverage": 0.0,
                },
                {
                    "sliceIndex": 1,
                    "imageDataUrl": base_slice,
                    "hasOverlay": True,
                    "overlayCoverage": round(left_confidence * 0.5, 2),
                },
                {
                    "sliceIndex": 2,
                    "imageDataUrl": base_slice,
                    "hasOverlay": True,
                    "overlayCoverage": round(right_confidence * 0.5, 2),
                },
            ],
        },
        "findings": {
            "en": (
                f"Model predicts {predicted_type} with {round(confidence * 100)}% confidence "
                "from deterministic mock inference based on uploaded study content."
            ),
            "no": (
                f"Modellen predikerer {predicted_type_no} med {round(confidence * 100)}% sannsynlighet "
                "fra deterministisk mock-inferens basert pa innholdet i opplastet studie."
            ),
        },
        "cancerType": {"en": predicted_type, "no": predicted_type_no},
        "classificationConfidence": confidence,
        "reasoning": {
            "en": (
                "This is a stub response. Classification is selected from uploaded bytes via deterministic hashing, "
                "not from a clinical model."
            ),
            "no": (
                "Dette er et stub-svar. Klassifikasjon velges fra opplastede bytes via deterministisk hashing, "
                "ikke fra en klinisk modell."
            ),
        },
        "proposedTnmStage": {"en": f"{proposed_tnm} (proposed)", "no": f"{proposed_tnm} (foreslatt)"},
        "classifications": [
            {
                "side": {"en": "Left", "no": "Venstre"},
                "prediction": {"en": predicted_type, "no": predicted_type_no},
                "confidence": left_confidence,
                "explanation": {
                    "en": "Left-side result derived from deterministic content-hash mock signal.",
                    "no": "Resultat for venstre side utledet fra deterministisk mock-signal basert pa innholdshash.",
                },
            },
            {
                "side": {"en": "Right", "no": "Hoyre"},
                "prediction": {"en": predicted_type, "no": predicted_type_no},
                "confidence": right_confidence,
                "explanation": {
                    "en": "Right-side result derived from deterministic content-hash mock signal.",
                    "no": "Resultat for hoyre side utledet fra deterministisk mock-signal basert pa innholdshash.",
                },
            },
        ],
    }

    return JSONResponse(content=response)
