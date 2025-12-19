import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Entrenador AI",
  icons: {
    icon: "/entrenador-favicon.ico",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-white flex flex-col min-h-screen text-gray-900 justify-center items-center">
        {children}
      </body>
    </html>
  );
}
