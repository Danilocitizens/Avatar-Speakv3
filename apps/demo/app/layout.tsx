import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Entrenador AI",
  icons: {
    icon: "/heygen-logo.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-zinc-900 flex flex-col min-h-screen text-white justify-center items-center">
        {children}
      </body>
    </html>
  );
}
