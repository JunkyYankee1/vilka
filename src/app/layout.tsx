import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "next-themes";

export const metadata: Metadata = {
  title: "Вилка — быстрая доставка еды и продуктов",
  description:
    "Вилка — онлайн-сервис быстрой доставки еды и продуктов. Собираем за минуты, привозим в удобное время.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Migrate "system" theme to "light" if present
                  const savedTheme = localStorage.getItem('theme');
                  if (savedTheme === 'system' || savedTheme === null || savedTheme === undefined) {
                    localStorage.setItem('theme', 'light');
                  }
                } catch (e) {
                  // Ignore errors (e.g., in SSR or if localStorage is not available)
                }
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen w-full bg-background text-foreground transition-colors">
        <ThemeProvider 
          attribute="class" 
          defaultTheme="light" 
          enableSystem={false} 
          storageKey="theme"
          themes={["light", "dark"]}
        >
          <div className="flex min-h-screen w-full flex-col bg-background">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
