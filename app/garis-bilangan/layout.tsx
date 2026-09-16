import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Garis Bilangan",
  description: "Visualisasi animasi penjumlahan dan pengurangan bilangan bulat di garis bilangan.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}