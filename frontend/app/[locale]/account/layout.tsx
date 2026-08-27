import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import AccountNav from "@/components/AccountNav";

export const metadata: Metadata = {
  title: "Mon compte",
  robots: { index: false },
};

export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();
  if (!session) redirect({ href: "/login", locale });

  return (
    <section className="book-page">
      <div className="wrap">
        <AccountNav />
        {children}
      </div>
    </section>
  );
}
