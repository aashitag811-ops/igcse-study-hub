import type { Metadata } from "next";
import { Playfair_Display, Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-heading",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-display",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Student Archive – Free IGCSE & A Level Past Papers",
  description: "Free Cambridge IGCSE and A Level past papers, mark schemes, examiner reports and interactive practice. Biology, Chemistry, Physics, Maths, Economics, Accounting and more. Built by students, for students.",
  keywords: "IGCSE past papers, A Level past papers, Cambridge IGCSE, Cambridge A Level, AS Level, Biology 0610, Chemistry 0620, Physics 0625, Biology 9700, Chemistry 9701, Physics 9702, Mathematics 9709, Economics 9708, free past papers, mark scheme, examiner report",
  openGraph: {
    title: "Student Archive – Free IGCSE & A Level Past Papers",
    description: "Free Cambridge IGCSE and A Level past papers, mark schemes and interactive practice. Biology, Chemistry, Physics, Maths, Economics and more.",
    url: "https://studentarchive.xyz",
    siteName: "Student Archive",
    type: "website",
  },
  metadataBase: new URL("https://studentarchive.xyz"),
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 0.5,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${playfair.variable} ${cormorant.variable} ${inter.variable} font-body`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

// Made with Bob
