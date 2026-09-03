import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Model Chip Zero-Pair",
  description: "Visualisasi konsep zero-pair dengan chip positif dan negatif untuk memahami penjumlahan bilangan bulat.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}