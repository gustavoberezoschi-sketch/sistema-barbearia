import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sistema Barbearia",
  description: "Agendamento online e gestão para barbearias",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#d97706" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
