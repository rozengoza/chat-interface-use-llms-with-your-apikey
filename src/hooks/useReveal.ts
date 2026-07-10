import { useEffect, useRef } from "react";

/**
 * Attaches an IntersectionObserver that adds `.is-visible` the first time the
 * element scrolls into view, then disconnects. Pair with the `.reveal` /
 * `.reveal-group` CSS classes in landing.css — the class toggle drives a CSS
 * transition, so there's no per-frame JS and no animation library on the
 * critical path.
 */
export function useReveal<T extends HTMLElement>(options?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("is-visible");
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          observer.unobserve(el);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px", ...options }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}
