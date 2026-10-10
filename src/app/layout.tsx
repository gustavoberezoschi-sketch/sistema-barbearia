import type { Metadata, Viewport } from "next";
import { Figtree, Geist } from "next/font/google";
import "./globals.css";

const titulo = Geist({ subsets: ["latin"], variable: "--fonte-titulo", display: "swap" });
const texto = Figtree({ subsets: ["latin"], variable: "--fonte-texto", display: "swap" });

export const metadata: Metadata = {
  title: { default: "KlarezaBarber", template: "%s · KlarezaBarber" },
  description: "KlarezaBarber: agendamento online e gestão completa para barbearias",
  applicationName: "KlarezaBarber",
  appleWebApp: { capable: true, title: "KlarezaBarber", statusBarStyle: "default" },
  icons: { apple: "/icone/180" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0f0f0e" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${titulo.variable} ${texto.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
