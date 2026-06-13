import type { Metadata } from "next";
import "highlight.js/styles/github-dark.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Luna IA",
  description: "Luna, a assistente virtual inteligente da Squid Telecom — telecomunicações, conectividade e inovação.",
  icons: { icon: "/logo-squid.svg" },
};

// HTML sempre dinâmico → não é cacheado como estático (sem s-maxage de 1 ano).
// Combinado com o Cache-Control "no-cache" do next.config, garante que cada
// deploy seja servido fresco, puxando os assets hasheados novos. Os assets em
// /_next/static seguem imutáveis (cache longo, seguro). Resolve o cache em todo
// deploy sem hard reload manual.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
