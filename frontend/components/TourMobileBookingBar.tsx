"use client";

import { PriceText } from "@/components/Price";
import { useEffect, useState } from "react";

export default function TourMobileBookingBar({
  priceLabel,
  unitLabel,
  actionLabel,
  cancellationLabel,
}: {
  priceLabel: string;
  unitLabel: string;
  actionLabel: string;
  cancellationLabel?: string;
}) {
  const [formVisible, setFormVisible] = useState(false);

  useEffect(() => {
    const form = document.getElementById("reserve");
    if (!form) return;

    const observer = new IntersectionObserver(
      ([entry]) => setFormVisible(entry.isIntersecting),
      { threshold: 0.05 },
    );
    observer.observe(form);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="tour-mobile-booking-bar" data-hidden={formVisible} aria-hidden={formVisible}>
      {cancellationLabel && <p>{cancellationLabel}</p>}
      <div>
        <span className="tour-mobile-booking-price">
          <small><PriceText text={priceLabel} /></small>
          <strong>{unitLabel}</strong>
        </span>
        <a href="#reserve" tabIndex={formVisible ? -1 : undefined}>{actionLabel}</a>
      </div>
    </div>
  );
}
