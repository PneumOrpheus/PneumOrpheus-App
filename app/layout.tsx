import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import AppShell from "@/components/app-shell";
import { LanguageProvider } from "@/components/language-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { LANG_COOKIE_NAME, normalizeLanguage } from "@/lib/i18n";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PneumOrpheus",
  description: "AI-driven pulmonary diagnostic assistant for cancer detection and analysis.",
  icons: {
    icon: [{ url: "/PneumOrpheus-logo-icon.png", type: "image/png", sizes: "512x512" }],
    shortcut: "/PneumOrpheus-logo-icon.png",
    apple: "/PneumOrpheus-logo-icon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialLanguage = normalizeLanguage(cookieStore.get(LANG_COOKIE_NAME)?.value);

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-background text-foreground antialiased`}
      >
        <ThemeProvider>
          <LanguageProvider initialLanguage={initialLanguage}>
            <AppShell>{children}</AppShell>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
