import type { Metadata } from "next";
import BookingConfirmation from "@/components/BookingConfirmation";

export const metadata: Metadata = {
  title: "Your booking",
  robots: { index: false },
};

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
