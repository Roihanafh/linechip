import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Simulasi Garis Bilangan",
  description: "Visualisasi animasi langkah-per-langkah penjumlahan dan pengurangan bilangan bulat di garis bilangan.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}