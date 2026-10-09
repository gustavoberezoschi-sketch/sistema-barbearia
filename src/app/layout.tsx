import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";

const titulo = Bricolage_Grotesque({ subsets: ["latin"], variable: "--fonte-titulo", display: "swap" });
const texto = Figtree({ subsets: ["latin"], variable: "--fonte-texto", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Sistema Barbearia", template: "%s · Sistema Barbearia" },
  description: "Agendamento online e gestão completa para barbearias",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1f1a17" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${titulo.variable} ${texto.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
