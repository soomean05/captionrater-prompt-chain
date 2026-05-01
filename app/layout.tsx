import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Prompt Chain Tool",
  description: "Manage humor flavors and test caption generation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} relative flex min-h-screen flex-col overflow-x-hidden bg-background text-foreground antialiased`}
      >
        <div className="pointer-events-none fixed inset-0 -z-30 bg-background" aria-hidden />
        <div
          className="pointer-events-none fixed inset-0 -z-20 overflow-hidden"
          aria-hidden
        >
          <div className="absolute -left-[20%] -top-[10%] h-[28rem] w-[28rem] rounded-full bg-violet-500/18 blur-[100px] dark:bg-violet-500/11" />
          <div className="absolute -right-[15%] top-[15%] h-[26rem] w-[26rem] rounded-full bg-fuchsia-500/14 blur-[90px] dark:bg-fuchsia-500/09" />
          <div className="absolute bottom-[-20%] left-[30%] h-[22rem] w-[42rem] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[100px] dark:bg-violet-400/06" />
        </div>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
