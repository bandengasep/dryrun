import type { ReactNode } from "react";
import { Fraunces, Instrument_Sans, Google_Sans_Code } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./components/AuthContext";
import Navbar from "./components/Navbar";

// Three faces, three jobs (Paper "Dryrun-WebApp" theme tile):
//   Fraunces          — display. The one warm, bookish voice on the page.
//   Instrument Sans   — every piece of UI text.
//   Google Sans Code  — the evidence voice: quotes, spans, ids, stage traces.
//     Anything the product claims came from a document is set in it, so the
//     typeface itself signals "this is quoted, not written".
//
// Loaded through next/font/google rather than a <link> to fonts.googleapis.com:
// the files are self-hosted at build time, which removes a render-blocking
// third-party round trip and the layout shift that came with it.

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument-sans",
});

const googleSansCode = Google_Sans_Code({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-google-sans-code",
});

export const metadata = {
  title: "DryRun — rehearse the interview you're about to have",
  description:
    "Diff a job description against a resume into evidenced gaps, compile the questions you'll actually face, rehearse them against an AI interviewer, and get a debrief that quotes your own answers back to you.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${instrumentSans.variable} ${googleSansCode.variable}`}
    >
      <body>
        <AuthProvider>
          <Navbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
