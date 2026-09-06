// app/login/page.tsx
import type { Metadata } from "next";
import { LoginClient } from "./LoginClient";

export const metadata: Metadata = {
  title: "Masuk",
  description: "Masuk ke akun LineChip Anda untuk melanjutkan petualangan matematika.",
};

export default function LoginPage() {
  return <LoginClient />;
}
