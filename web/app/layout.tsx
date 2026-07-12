import type { ReactNode } from "react";

export const metadata = {
  title: "DryRun — the interview compiler",
  description:
    "Diff a job description and a resume into evidenced gaps, then compile a personalized interview environment.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
