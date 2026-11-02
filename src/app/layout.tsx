import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/lib/auth-context";
import { PopupProvider } from "@/lib/popup-context";

export const metadata: Metadata = {
  title: "PAKDEE (พักดี) - ระบบบริหารจัดการหอพักและอพาร์ตเมนต์",
  description: "ระบบจัดการหอพักครบวงจร รองรับรายเดือน รายวัน หลายอาคาร จดมิเตอร์น้ำไฟ และออกบิลพร้อมเพย์",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col antialiased selection:bg-emerald-500 selection:text-white">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <PopupProvider>{children}</PopupProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
