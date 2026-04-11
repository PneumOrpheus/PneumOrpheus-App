import { cookies } from "next/headers";
import { AppLanguage, getTranslations, LANG_COOKIE_NAME, normalizeLanguage } from "@/lib/i18n";

export async function getServerLanguage(): Promise<AppLanguage> {
  const cookieStore = await cookies();
  const cookieLanguage = cookieStore.get(LANG_COOKIE_NAME)?.value;
  return normalizeLanguage(cookieLanguage);
}

export async function getServerI18n() {
  const language = await getServerLanguage();
  const t = getTranslations(language);

  return { language, t };
}
