import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";
import AuthLayout from "@/components/AuthLayout";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create a Dunes Insolites account to manage your Sahara bookings.",
  robots: { index: false },
};

export default function SignupPage() {
  return (
    <AuthLayout
      eyebrow="Join us"
      title="Create an account."
      lead="Keep your bookings in one place, rebook a favourite ride in two taps, and get your trip photos the morning after."
      image="/images/camel.jpg"
    >
      <AuthForm mode="signup" />
    </AuthLayout>
  );
}
