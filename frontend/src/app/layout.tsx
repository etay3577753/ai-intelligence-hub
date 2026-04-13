import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "מרכז הבינה המלאכותית",
  description: "לוח השוואת מודלים של בינה מלאכותית",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className="dark">
      <body className="overflow-x-hidden max-w-full">{children}</body>
    </html>
  );
}
