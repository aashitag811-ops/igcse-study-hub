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
  metadataBase: new URL("https://studentarchive.xyz"),

  title: {
    default: "Student Archive – Free Cambridge Past Papers, Topical MCQ & Resources",
    template: "%s | Student Archive",
  },
  description: "Free Cambridge past papers across 70+ subjects — IGCSE, A Level, O Level & IGCSE (9-1). Topical questions, MCQ practice, revision resources and integrated examiner reports, mark schemes, revision notes, flashcards and more.",
  keywords: [
    "Student Archive",
    "IGCSE past papers",
    "A Level past papers",
    "O Level past papers",
    "Cambridge IGCSE",
    "Cambridge A Level",
    "Cambridge O Level",
    "IGCSE 9-1",
    "AS Level",
    "free past papers",
    "topical questions",
    "topical MCQ",
    "mark scheme",
    "examiner report",
    "integrated examiner report",
    "revision notes",
    "flashcards",
    "Biology 0610",
    "Chemistry 0620",
    "Physics 0625",
    "Biology 9700",
    "Chemistry 9701",
    "Physics 9702",
    "Mathematics 9709",
    "Economics 9708",
    "studentarchive.xyz",
  ],
  authors: [{ name: "Student Archive", url: "https://studentarchive.xyz" }],
  creator: "Student Archive",
  publisher: "Student Archive",
  applicationName: "Student Archive",
  category: "education",

  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: [
      { url: "/favicon.png", type: "image/png" },
    ],
    shortcut: "/favicon.png",
  },

  openGraph: {
    title: "Student Archive – Free Cambridge Past Papers, Topical MCQ & Resources",
    description: "Free Cambridge past papers across 70+ subjects — IGCSE, A Level, O Level & IGCSE (9-1). Topical questions, MCQ practice, revision resources and integrated examiner reports.",
    url: "https://studentarchive.xyz",
    siteName: "Student Archive",
    type: "website",
    locale: "en_GB",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Student Archive – Free IGCSE & A Level Past Papers",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Student Archive – Free Cambridge Past Papers, Topical MCQ & Resources",
    description: "Free Cambridge past papers across 70+ subjects — IGCSE, A Level, O Level & IGCSE (9-1). Topical questions, MCQ practice, revision resources and integrated examiner reports.",
    images: ["/og-image.png"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  alternates: {
    canonical: "https://studentarchive.xyz",
  },
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
