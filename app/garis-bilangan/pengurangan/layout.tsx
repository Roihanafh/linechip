import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pengurangan Bilangan Bulat",
  description: "Visualisasi animasi pengurangan bilangan bulat di garis bilangan dengan dua fase gerak.",
};

export default function PenguranganLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
