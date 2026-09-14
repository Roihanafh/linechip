import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Model Chip Pengurangan",
  description: "Visualisasi konsep pengurangan bilangan bulat menggunakan model chip dengan prinsip a − b = a + (−b).",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
