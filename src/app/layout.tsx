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
  title: "Student Archive – Free IGCSE Past Papers & Study Resources",
  description: "Free Cambridge IGCSE past papers, mark schemes, examiner reports and interactive practice for Biology, Chemistry, Physics, Maths, ICT and more. Built by students, for students.",
  keywords: "IGCSE past papers, Cambridge IGCSE, Biology 0610, Chemistry 0620, Physics 0625, free past papers, mark scheme, examiner report, IGCSE practice",
  openGraph: {
    title: "Student Archive – Free IGCSE Past Papers",
    description: "Free Cambridge IGCSE past papers, mark schemes and interactive practice. Biology, Chemistry, Physics, Maths, ICT and more.",
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
