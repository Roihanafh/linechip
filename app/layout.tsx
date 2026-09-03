import type { Metadata } from "next";
import { Baloo_2, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const baloo2 = Baloo_2({
  variable: "--font-baloo2",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "LineChip — Platform Edukasi Matematika Interaktif",
    template: "%s | LineChip",
  },
  description:
    "LineChip hadir dengan visualisasi garis bilangan interaktif dan model chip zero-pair untuk membantu siswa SMP memahami bilangan bulat.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${baloo2.variable} ${plusJakarta.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body
        className="min-h-full flex flex-col"
        style={{
          fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif",
        }}
      >
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}