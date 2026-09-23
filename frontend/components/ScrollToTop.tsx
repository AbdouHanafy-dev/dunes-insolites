"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

/** Scroll distance (px) after which the button appears - roughly the first screen. */
const SHOW_AFTER = 480;

/**
 * "Back to top" - hidden on the first screen, fades in once the visitor has
 * scrolled past it. One passive scroll listener, throttled to a frame, so it
 * costs nothing on the Core Web Vitals this site ranks on. Honours
 * prefers-reduced-motion (jumps instead of gliding) and is removed from the
 * tab order while hidden.
 */
export default function ScrollToTop() {
  const t = useTranslations("footer");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setVisible(window.scrollY > SHOW_AFTER);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  function toTop() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <button
      type="button"
      className="scroll-top"
      data-visible={visible}
      onClick={toTop}
      aria-label={t("backToTop")}
      title={t("backToTop")}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
    >
      <span aria-hidden="true">↑</span>
    </button>
  );
}
