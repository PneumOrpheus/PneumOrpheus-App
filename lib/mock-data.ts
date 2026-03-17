export type Classification = {
  side: "Left" | "Right";
  prediction: "Normal" | "Pneumonia" | "COPD pattern";
  confidence: number;
  explanation: string;
};

export type Analysis = {
  id: string;
  patientId: string;
  patientName: string;
  createdAt: string;
  modality: "Chest X-ray" | "CT Chest";
  status: "Completed" | "In Review";
  findings: string;
  classifications: Classification[];
};

export type Patient = {
  id: string;
  name: string;
  age: number;
  sex: "Female" | "Male";
  email: string;
  recentAnalysisIds: string[];
};

export const analyses: Analysis[] = [
  {
    id: "A-1042",
    patientId: "P-2001",
    patientName: "Marina Solberg",
    createdAt: "2026-03-10",
    modality: "Chest X-ray",
    status: "Completed",
    findings: "Bilateral patchy lower-lobe opacities consistent with infectious process.",
    classifications: [
      {
        side: "Left",
        prediction: "Pneumonia",
        confidence: 0.91,
        explanation: "Increased perihilar and lower-lobe opacities with asymmetric airspace density.",
      },
      {
        side: "Right",
        prediction: "Pneumonia",
        confidence: 0.88,
        explanation: "Focal right lower-zone opacity and bronchovascular prominence.",
      },
    ],
  },
  {
    id: "A-1043",
    patientId: "P-2002",
    patientName: "Erik Vollen",
    createdAt: "2026-03-12",
    modality: "CT Chest",
    status: "Completed",
    findings: "Hyperinflation pattern with mild emphysematous changes.",
    classifications: [
      {
        side: "Left",
        prediction: "COPD pattern",
        confidence: 0.84,
        explanation: "Reduced parenchymal attenuation and chronic hyperinflation changes.",
      },
      {
        side: "Right",
        prediction: "COPD pattern",
        confidence: 0.82,
        explanation: "Flattened diaphragmatic contour and emphysematous lucencies.",
      },
    ],
  },
  {
    id: "A-1044",
    patientId: "P-2003",
    patientName: "Aisha Khan",
    createdAt: "2026-03-14",
    modality: "Chest X-ray",
    status: "In Review",
    findings: "No acute cardiopulmonary abnormalities detected by the model.",
    classifications: [
      {
        side: "Left",
        prediction: "Normal",
        confidence: 0.93,
        explanation: "No focal infiltrate or suspicious pleural findings.",
      },
      {
        side: "Right",
        prediction: "Normal",
        confidence: 0.92,
        explanation: "Lung expansion and vascular markings within expected range.",
      },
    ],
  },
];

export const patients: Patient[] = [
  {
    id: "P-2001",
    name: "Marina Solberg",
    age: 61,
    sex: "Female",
    email: "marina.solberg@example.com",
    recentAnalysisIds: ["A-1042"],
  },
  {
    id: "P-2002",
    name: "Erik Vollen",
    age: 67,
    sex: "Male",
    email: "erik.vollen@example.com",
    recentAnalysisIds: ["A-1043"],
  },
  {
    id: "P-2003",
    name: "Aisha Khan",
    age: 49,
    sex: "Female",
    email: "aisha.khan@example.com",
    recentAnalysisIds: ["A-1044"],
  },
];

export function getAnalysisById(id: string) {
  return analyses.find((analysis) => analysis.id === id);
}

export function getPatientById(id: string) {
  return patients.find((patient) => patient.id === id);
}
