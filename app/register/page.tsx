// app/register/page.tsx
import type { Metadata } from "next";
import { RegisterClient } from "./RegisterClient";

export const metadata: Metadata = {
  title: "Daftar Akun",
  description: "Buat akun LineChip gratis dan mulai petualangan belajar matematika interaktif.",
};

export default function RegisterPage() {
  return <RegisterClient />;
}
