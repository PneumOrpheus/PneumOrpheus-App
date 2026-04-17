import type { AppLanguage } from "@/lib/i18n";

export type LocalizedTextMap = {
  en?: string;
  no?: string;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
};

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const getFirstString = (record: Record<string, unknown>, keys: string[]): string | null => {
  for (const key of keys) {
    const normalized = normalizeString(record[key]);
    if (normalized) {
      return normalized;
    }
  }

  return null;
};

const tryParseLocalizedJsonString = (value: string): LocalizedTextMap | null => {
  if (!(value.startsWith("{") && value.endsWith("}"))) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return parseLocalizedText(parsed);
  } catch {
    return null;
  }
};

export const parseLocalizedText = (value: unknown): LocalizedTextMap | null => {
  const asText = normalizeString(value);
  if (asText) {
    const parsedJson = tryParseLocalizedJsonString(asText);
    if (parsedJson) {
      return parsedJson;
    }

    return { en: asText, no: asText };
  }

  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const english = getFirstString(record, ["en", "english"]);
  const norwegian = getFirstString(record, ["no", "nb", "nn", "norwegian"]);
  const fallback = english ?? norwegian;

  if (!fallback) {
    return null;
  }

  return {
    en: english ?? fallback,
    no: norwegian ?? fallback,
  };
};

export const mergeLocalizedText = (baseValue: unknown, norwegianOverride: unknown): LocalizedTextMap | null => {
  const base = parseLocalizedText(baseValue);
  const override = parseLocalizedText(norwegianOverride);

  const english = base?.en ?? base?.no ?? override?.en ?? override?.no;
  const norwegian = override?.no ?? override?.en ?? base?.no ?? base?.en;

  if (!english && !norwegian) {
    return null;
  }

  const fallback = english ?? norwegian;
  return {
    en: english ?? fallback,
    no: norwegian ?? fallback,
  };
};

export const toStoredLocalizedText = (value: unknown): string | null => {
  const parsed = parseLocalizedText(value);
  if (!parsed) {
    return null;
  }

  const english = parsed.en ?? parsed.no;
  const norwegian = parsed.no ?? parsed.en;
  if (!english || !norwegian) {
    return null;
  }

  return JSON.stringify({ en: english, no: norwegian });
};

export const toStoredLocalizedJsonValue = (value: unknown): string | LocalizedTextMap | null => {
  const parsed = parseLocalizedText(value);
  if (!parsed) {
    return null;
  }

  const english = parsed.en ?? parsed.no;
  const norwegian = parsed.no ?? parsed.en;
  if (!english || !norwegian) {
    return null;
  }

  if (english === norwegian) {
    return english;
  }

  return { en: english, no: norwegian };
};

export const resolveLocalizedText = (value: unknown, language: AppLanguage): string | null => {
  const parsed = parseLocalizedText(value);
  if (!parsed) {
    return null;
  }

  if (language === "no") {
    return parsed.no ?? parsed.en ?? null;
  }

  return parsed.en ?? parsed.no ?? null;
};