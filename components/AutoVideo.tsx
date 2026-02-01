"use client";

import { useEffect, useRef } from "react";

type AutoVideoProps = {
  src: string;
  poster?: string;
  className?: string;
  // % visible required to play (0.35 = 35%)
  threshold?: number;
};

export default function AutoVideo({
  src,
  poster,
  className,
  threshold = 0.35,
}: AutoVideoProps) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Always keep these on for autoplay policies (iOS/Safari included)
    el.muted = true;
    el.playsInline = true;

    // Pause by default until visible
    el.pause();

    // Use IntersectionObserver to play/pause
    const obs = new IntersectionObserver(
      async ([entry]) => {
        const v = ref.current;
        if (!v) return;

        const shouldPlay =
          entry.isIntersecting && entry.intersectionRatio >= threshold;

        try {
          if (shouldPlay) {
            // Try play (may still be blocked in some edge cases)
            const p = v.play();
            if (p && typeof p.then === "function") {
              await p;
            }
          } else {
            v.pause();
          }
        } catch {
          // If autoplay is blocked, we silently ignore.
          // User interaction will allow play later.
        }
      },
      {
        threshold: [0, threshold, 1],
      }
    );

    obs.observe(el);

    return () => {
      obs.disconnect();
    };
  }, [threshold]);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      className={className}
      // Keep these attributes for best compatibility
      muted
      playsInline
      loop
      preload="metadata"
    />
  );
}
