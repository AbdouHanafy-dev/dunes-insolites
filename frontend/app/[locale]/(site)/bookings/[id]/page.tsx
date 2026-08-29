import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import BookingConfirmation from "@/components/BookingConfirmation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.bookingConfirmation" });
  return { title: t("title"), robots: { index: false } };
}

export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <section className="book-page">
      <div className="wrap">
        <BookingConfirmation id={id} />
      </div>
    </section>
  );
}
