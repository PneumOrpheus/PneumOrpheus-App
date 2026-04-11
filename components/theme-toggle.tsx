"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useLanguage } from "@/components/language-provider";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useLanguage();
  const isClient = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );
  const isDark = isClient && resolvedTheme === "dark";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t.theme.toggleLabel}
          title={t.theme.toggleLabel}
          className={cn(
            buttonVariants({ variant: "outline", size: "icon-sm" }),
            "border-brand/30 cursor-pointer data-[state=open]:bg-accent"
          )}
        >
          {isDark ? (
            <Moon className="h-[1.2rem] w-[1.2rem]" />
          ) : (
            <Sun className="h-[1.2rem] w-[1.2rem]" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>{t.theme.light}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>{t.theme.dark}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>{t.theme.system}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}