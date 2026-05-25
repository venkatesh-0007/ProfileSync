import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/context/UserContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ProfileSync | Update Your Professional Identity Everywhere",
  description: "ProfileSync helps users update their professional profile photo across multiple platforms from one dashboard.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logo-192.png", sizes: "192x192", type: "image/png" },
      { url: "/logo-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/logo-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} font-sans antialiased h-full`}
    >
      <body className="min-h-full flex flex-col bg-black">
        <UserProvider>
          {children}
        </UserProvider>
      </body>
    </html>
  );
}
