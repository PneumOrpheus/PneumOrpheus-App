"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import HeaderSignOutButton from "@/components/header-sign-out-button";

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
    <>
      <Image
        src="/pneumorpheus.svg"
        alt="PneumOrpheus logo"
        width={96}
        height={96}
        className="h-20 w-20 shrink-0"
        priority
      />
      <span className="tracking-tight text-2xl">PneumOrpheus</span>
    </>
  );

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="border-b border-brand/20 bg-white dark:bg-zinc-950">
        <div className="mx-auto flex w-full max-w-6xl items-center px-6 py-4">
          {isAuthPage ? (
            <span className="inline-flex items-center" aria-label="PneumOrpheus logo">
              {logoBlock}
            </span>
          ) : (
            <>
              <Link href="/" className="inline-flex items-center text-zinc-900" aria-label="PneumOrpheus logo">
                {logoBlock}
              </Link>

              <nav className="ml-auto flex flex-wrap items-center gap-2 text-sm">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-md px-3 py-1.5 text-zinc-700 transition hover:bg-brand/10 hover:text-zinc-900"
                  >
                    {item.label}
                  </Link>
                ))}
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