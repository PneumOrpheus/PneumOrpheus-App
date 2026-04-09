"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import HeaderSignOutButton from "@/components/header-sign-out-button";
import ThemeToggle from "@/components/theme-toggle";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/sign-in" || pathname === "/sign-up";

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/upload", label: "New Report" },
    { href: "/analyses", label: "Analyses" },
    { href: "/patients", label: "Patients" },
  ];

  const logoBlock = (
    <Image
      src="/PneumOrpheus-logo-full.svg"
      alt="PneumOrpheus logo"
      width={300}
      height={90}
      className="h-12 w-auto shrink-0"
      priority
    />
  );

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="border-b border-brand/20 bg-white dark:bg-zinc-950">
        <div className="mx-auto flex w-full max-w-6xl items-center px-6 py-4">
          {isAuthPage ? (
            <>
              <span className="inline-flex items-center" aria-label="PneumOrpheus logo">
                {logoBlock}
              </span>
              <div className="ml-auto">
                <ThemeToggle />
              </div>
            </>
          ) : (
            <>
              <Link href="/" className="inline-flex items-center text-zinc-900 dark:text-zinc-100" aria-label="PneumOrpheus logo">
                {logoBlock}
              </Link>

              <nav className="ml-auto flex flex-wrap items-center gap-2 text-sm">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-md px-3 py-1.5 text-zinc-700 transition hover:bg-brand/10 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
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