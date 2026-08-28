import type { Metadata } from "next";
import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="card relative w-full max-w-[440px] rounded-[20px] border border-navy-700/8 p-10 pb-8">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-3.5 flex h-17 w-17 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-gold to-gold-light shadow-[0_6px_20px_rgba(197,155,61,0.30)]">
            <span className="text-2xl">🏜️</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-800">Dunes Insolites</h1>
          <p className="mt-1 text-sm text-navy-700/50">Backoffice</p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
