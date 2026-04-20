"use client";

import { Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type EditableFieldLabels = {
  findings: string;
  reasoning: string;
  predictedCancerType: string;
  topConfidence: string;
  proposedTnm: string;
  confidenceAltered: string;
  editField: string;
  saveClinicalUpdates: string;
};

type Props = {
  initialFindings: string;
  initialReasoning: string;
  initialCancerType: string;
  initialProposedTnmStage: string;
  classificationConfidence: number | null;
  noDataLabel: string;
  statusToggleButtonLabel: string;
  labels: EditableFieldLabels;
  saveClinicalFieldsAction: (formData: FormData) => Promise<void>;
  toggleStatusAction: () => Promise<void>;
};

type OpenEditors = {
  findings: boolean;
  reasoning: boolean;
  cancerType: boolean;
  proposedTnmStage: boolean;
};

const normalizeValue = (value: string) => value.trim();

export function AnalysisEditableFieldsForm({
  initialFindings,
  initialReasoning,
  initialCancerType,
  initialProposedTnmStage,
  classificationConfidence,
  noDataLabel,
  statusToggleButtonLabel,
  labels,
  saveClinicalFieldsAction,
  toggleStatusAction,
}: Props) {
  const [findings, setFindings] = useState(initialFindings);
  const [reasoning, setReasoning] = useState(initialReasoning);
  const [cancerType, setCancerType] = useState(initialCancerType);
  const [proposedTnmStage, setProposedTnmStage] = useState(initialProposedTnmStage);
  const [openEditors, setOpenEditors] = useState<OpenEditors>({
    findings: false,
    reasoning: false,
    cancerType: false,
    proposedTnmStage: false,
  });

  const formId = "clinical-fields-form";

  const findingsChanged = normalizeValue(findings) !== normalizeValue(initialFindings);
  const reasoningChanged = normalizeValue(reasoning) !== normalizeValue(initialReasoning);
  const cancerTypeChanged = normalizeValue(cancerType) !== normalizeValue(initialCancerType);
  const proposedTnmStageChanged = normalizeValue(proposedTnmStage) !== normalizeValue(initialProposedTnmStage);

  const hasUpdates = useMemo(
    () => findingsChanged || reasoningChanged || cancerTypeChanged || proposedTnmStageChanged,
    [findingsChanged, reasoningChanged, cancerTypeChanged, proposedTnmStageChanged],
  );

  const canSave = hasUpdates && normalizeValue(findings).length > 0;

  const toggleEditor = (field: keyof OpenEditors) => {
    setOpenEditors((previous) => ({
      ...previous,
      [field]: !previous[field],
    }));
  };

  return (
    <>
      <form id={formId} action={saveClinicalFieldsAction}>
        <input type="hidden" name="findings" value={findings} />
        <input type="hidden" name="reasoning" value={reasoning} />
        <input type="hidden" name="cancerType" value={cancerType} />
        <input type="hidden" name="proposedTnmStage" value={proposedTnmStage} />

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <Card className="rounded-lg border-zinc-200 p-3 ring-0 dark:border-zinc-700 sm:col-span-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <dt className="text-zinc-500 dark:text-zinc-400">{labels.findings}</dt>
                <dd className="mt-1 whitespace-pre-wrap break-words">{findings || noDataLabel}</dd>
              </div>
              <button
                type="button"
                onClick={() => toggleEditor("findings")}
                aria-label={labels.editField}
                className="inline-flex shrink-0 items-center rounded-md border border-zinc-300 p-2 text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <Pencil className="size-4" aria-hidden="true" />
              </button>
            </div>
            {openEditors.findings ? (
              <div className="mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-700">
                <textarea
                  value={findings}
                  onChange={(event) => setFindings(event.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            ) : null}
          </Card>

          <Card className="rounded-lg border-zinc-200 p-3 ring-0 dark:border-zinc-700 sm:col-span-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <dt className="text-zinc-500 dark:text-zinc-400">{labels.reasoning}</dt>
                <dd className="mt-1 whitespace-pre-wrap break-words">{reasoning || noDataLabel}</dd>
              </div>
              <button
                type="button"
                onClick={() => toggleEditor("reasoning")}
                aria-label={labels.editField}
                className="inline-flex shrink-0 items-center rounded-md border border-zinc-300 p-2 text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <Pencil className="size-4" aria-hidden="true" />
              </button>
            </div>
            {openEditors.reasoning ? (
              <div className="mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-700">
                <textarea
                  value={reasoning}
                  onChange={(event) => setReasoning(event.target.value)}
                  rows={4}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            ) : null}
          </Card>

          <Card className="rounded-lg border-zinc-200 p-3 ring-0 dark:border-zinc-700">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <dt className="text-zinc-500 dark:text-zinc-400">{labels.predictedCancerType}</dt>
                <dd className="mt-1 break-words font-medium">{cancerType || noDataLabel}</dd>
              </div>
              <button
                type="button"
                onClick={() => toggleEditor("cancerType")}
                aria-label={labels.editField}
                className="inline-flex shrink-0 items-center rounded-md border border-zinc-300 p-2 text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <Pencil className="size-4" aria-hidden="true" />
              </button>
            </div>
            {openEditors.cancerType ? (
              <div className="mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-700">
                <input
                  value={cancerType}
                  onChange={(event) => setCancerType(event.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            ) : null}
          </Card>

          <Card className="rounded-lg border-zinc-200 p-3 ring-0 dark:border-zinc-700">
            <dt className="text-zinc-500 dark:text-zinc-400">{labels.topConfidence}</dt>
            <dd className="mt-1 font-medium">
              {classificationConfidence !== null && classificationConfidence >= 0
                ? `${Math.round(classificationConfidence * 100)}%`
                : classificationConfidence !== null && classificationConfidence < 0
                  ? labels.confidenceAltered
                  : noDataLabel}
            </dd>
          </Card>

          <Card className="rounded-lg border-zinc-200 p-3 ring-0 dark:border-zinc-700 sm:col-span-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <dt className="text-zinc-500 dark:text-zinc-400">{labels.proposedTnm}</dt>
                <dd className="mt-1 break-words font-medium">{proposedTnmStage || noDataLabel}</dd>
              </div>
              <button
                type="button"
                onClick={() => toggleEditor("proposedTnmStage")}
                aria-label={labels.editField}
                className="inline-flex shrink-0 items-center rounded-md border border-zinc-300 p-2 text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <Pencil className="size-4" aria-hidden="true" />
              </button>
            </div>
            {openEditors.proposedTnmStage ? (
              <div className="mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-700">
                <input
                  value={proposedTnmStage}
                  onChange={(event) => setProposedTnmStage(event.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            ) : null}
          </Card>
        </dl>
      </form>

      <div className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <form action={toggleStatusAction}>
            <Button type="submit" variant="outline" className="text-lg cursor-pointer border-brand/40 text-brand hover:bg-brand/10 hover:text-brand p-6">
              {statusToggleButtonLabel}
            </Button>
          </form>

          <Button
            type="submit"
            form={formId}
            variant="outline"
            disabled={!canSave}
            className="text-lg border-brand/40 text-brand hover:bg-brand/10 hover:text-brand p-6 disabled:cursor-not-allowed disabled:border-zinc-300 disabled:text-zinc-400 dark:disabled:border-zinc-700 dark:disabled:text-zinc-500"
          >
            {labels.saveClinicalUpdates}
          </Button>
        </div>
      </div>
    </>
  );
}
