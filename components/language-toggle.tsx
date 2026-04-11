"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/language-provider";

export default function LanguageToggle() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();

  const nextLanguage = language === "en" ? "no" : "en";
  const iconSrc = language === "en" ? "/english.png" : "/norwegian.png";
  const ariaLabel = language === "en" ? t.language.switchToNorwegian : t.language.switchToEnglish;

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={ariaLabel}
      onClick={() => {
        setLanguage(nextLanguage);
        router.refresh();
      }}
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        "h-8 gap-2 border-brand/30 px-2.5 cursor-pointer"
      )}
    >
      <Image
        src={iconSrc}
        alt={language === "en" ? t.language.english : t.language.norwegian}
        width={16}
        height={16}
        className="h-4 w-4 rounded-sm object-cover"
      />
      <span className="text-xs font-medium uppercase">{language === "en" ? "EN" : "NO"}</span>
    </button>
  );
}
