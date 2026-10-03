import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { ToastProvider } from "@/components/toast";
import { SITE_URL } from "@/lib/format";
import "./globals.css";

const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
});

const body = Jost({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "DMS – Direct Message Us | Cropped Fur Jackets",
    template: "%s | DMS – Direct Message Us",
  },
  description:
    "DMS is a ladies' boutique for cropped jackets, especially fur and faux-fur crops. Browse, then message us on Messenger, Instagram or Direct Ask to order.",
  applicationName: "DMS",
  appleWebApp: { capable: true, title: "DMS", statusBarStyle: "default" },
  openGraph: {
    type: "website",
    siteName: "DMS – Direct Message Us",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FCFAF8" },
    { media: "(prefers-color-scheme: dark)", color: "#131011" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <ToastProvider>{children}</ToastProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
