import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "sonner";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const title = "Sable";
const titleLong = "Sable — Email Agents for the Enterprise";
const description =
  "Configure email-driven AI agents — prompts, guardrails, tools, knowledge — and deploy them with a click. Multi-tenant from day one.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: titleLong, template: `%s · ${title}` },
  description,
  applicationName: title,
  appleWebApp: { capable: true, title, statusBarStyle: "black-translucent" },
  openGraph: {
    type: "website",
    siteName: title,
    title: titleLong,
    description,
    url: siteUrl,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: titleLong,
    description,
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className={`${GeistSans.className} antialiased`}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            classNames: {
              toast:
                "!bg-[var(--color-surface-strong)] !backdrop-blur-xl !border !border-[var(--color-border)] !text-[var(--color-foreground)]",
            },
          }}
        />
      </body>
    </html>
  );
}
