import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Penjumlahan Bilangan Bulat",
  description: "Visualisasi animasi penjumlahan bilangan bulat di garis bilangan dengan dua fase gerak.",
};

export default function PenjumlahanLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
