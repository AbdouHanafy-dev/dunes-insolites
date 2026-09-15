"use client";

import { useEffect, useRef, useState } from "react";

/**
 * On request: soft background music on the launch-countdown page. No
 * browser allows autoplay-with-sound (only muted autoplay, which is what
 * the background video already relies on) — so "on by default" is
 * approximated as closely as a browser permits: playback starts on the
 * visitor's very first interaction with the page (click/touch/scroll/key),
 * not only if they specifically hit this button. This button still exists
 * so the choice is always visible and reversible — mute at any time, or
 * restart it if the browser blocked the very first attempt.
 */
export default function MaintenanceMusic({ labels }: { labels: { on: string; off: string } }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = 0.35;

    const tryPlay = () => {
      audio.play().catch(() => {
        // Still blocked (e.g. this "interaction" doesn't count in this
        // browser) — the button stays available to try again explicitly.
      });
    };

    // First real interaction anywhere on the page, not just this button —
    // the closest a browser allows to "starts on its own".
    const events: (keyof DocumentEventMap)[] = ["click", "touchstart", "keydown", "scroll"];
    events.forEach((e) => document.addEventListener(e, tryPlay, { once: true, passive: true }));

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      events.forEach((e) => document.removeEventListener(e, tryPlay));
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, []);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }

  return (
    <>
      <audio ref={audioRef} loop preload="none" aria-hidden="true">
        <source src="/audio/maintenance-ambience.mp3" type="audio/mpeg" />
      </audio>
      <button
        type="button"
        onClick={toggle}
        className="maint-music-toggle"
        aria-label={playing ? labels.on : labels.off}
        aria-pressed={playing}
      >
        {playing ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M4 9v6h4l5 5V4L8 9H4z" />
            <path d="M16.5 8.5a5 5 0 0 1 0 7" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M4 9v6h4l5 5V4L8 9H4z" />
            <line x1="16" y1="8" x2="21" y2="16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="21" y1="8" x2="16" y2="16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        )}
      </button>
    </>
  );
}
