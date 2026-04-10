"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import HeaderSignOutButton from "@/components/header-sign-out-button";
import ThemeToggle from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const isClient = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );
  const isAuthPage = pathname === "/sign-in" || pathname === "/sign-up";

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/upload", label: "New Report" },
    { href: "/analyses", label: "Analyses" },
    { href: "/patients", label: "Patients" },
  ];

  const logoSrc =
    isClient && resolvedTheme === "dark"
      ? "/PneumOrpheus-logo-full-white.svg"
      : "/PneumOrpheus-logo-full.svg";

  const logoBlock = (
    <Image
      src={logoSrc}
      alt="PneumOrpheus logo"
      width={200}
      height={70}
      className="w-50 h-auto shrink-0"
      priority
    />
  );

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="border-b border-brand/20 bg-white dark:bg-zinc-950">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 md:flex-nowrap md:gap-4">
          {isAuthPage ? (
            <div className="ml-auto">
              <ThemeToggle />
            </div>
          ) : (
            <>
              <Link href="/" className="inline-flex shrink-0 items-center text-zinc-900 dark:text-zinc-100" aria-label="PneumOrpheus logo">
                {logoBlock}
              </Link>

              <nav className="ml-auto flex flex-wrap items-center justify-end gap-2 text-sm max-md:w-full">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "sm" }),
                      "h-8 text-zinc-700 dark:text-zinc-300"
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
                <ThemeToggle />
                <HeaderSignOutButton />
              </nav>
            </>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}