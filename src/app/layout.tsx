import type { Metadata } from "next";
import localFont from "next/font/local";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext"
import { ToastProviderWrapper } from "@/components/ui/ToastProviderWrapper";

// Fallback: Geist local (mantido para compatibilidade)
const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

// Aura: Outfit (UI limpa) + JetBrains Mono (dados/métricas)
const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

const seoTitle = 'Aura — Triângulo de Qualidade'
const seoDescription =
  'Transforme o Triângulo da Qualidade em objeto geométrico calculável. Gestão de projetos com motor CDT, zonas MATED e simulação what-if.'

export const metadata: Metadata = {
  title: {
    default: seoTitle,
    template: '%s | Aura',
  },
  description: seoDescription,
  keywords: [
    'gestão de projetos',
    'triângulo da qualidade',
    'PMBOK',
    'CDT',
    'MATED',
    'escopo prazo custo',
  ],
  authors: [{ name: 'AURA' }],
  openGraph: {
    title: seoTitle,
    description: seoDescription,
    type: 'website',
    locale: 'pt_BR',
  },
  twitter: {
    card: 'summary_large_image',
    title: seoTitle,
    description: seoDescription,
  },
  icons: {
    icon: '/icon-aura.png',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon-aura.png" type="image/png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('aura-theme');
                  if (theme === 'light') {
                    document.documentElement.classList.remove('dark');
                  } else {
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${outfit.variable} ${jetbrainsMono.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ToastProviderWrapper>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ToastProviderWrapper>
      </body>
    </html>
  );
}
