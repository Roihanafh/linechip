import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Antibodi vs Kuman",
  description: "Game drag-and-drop chip ke Reaktor Netral untuk belajar penjumlahan bilangan bulat.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}