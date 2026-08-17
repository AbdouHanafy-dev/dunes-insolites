import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";
import AuthLayout from "@/components/AuthLayout";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to manage your Dunes Insolites desert bookings.",
  robots: { index: false },
};

export default function LoginPage() {
  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Log in."
      lead="Pick up where you left off — your upcoming trips, past rides, and photos from the dunes."
      image="/images/gate.jpg"
    >
      <AuthForm mode="login" />
    </AuthLayout>
  );
}
