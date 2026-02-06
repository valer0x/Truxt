import type { Metadata } from "next";
import Providers from "@/ui/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "TRX — Anti-Phantom Load System",
  description: "IOTA-verified logistics load management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
