import { useEffect, useRef, useCallback } from "react";
import gsap from "gsap";

/**
 * Splits an element's text content into word spans.
 * The text remains visible throughout — spans are created inline
 * so GSAP can animate them FROM a state (not TO invisible).
 */
export function splitElement(el: HTMLElement): HTMLSpanElement[] {
  const text = el.textContent || "";
  // Don't clear text — build spans directly
  el.textContent = "";
  el.style.display = "inline-block";

  const words = text.split(/(\s+)/).filter(Boolean);
  const spans: HTMLSpanElement[] = [];

  words.forEach((word) => {
    const span = document.createElement("span");
    span.textContent = word;
    span.style.display = "inline-block";
    span.style.whiteSpace = "pre-wrap";
    span.dataset.splitWord = "true";
    el.appendChild(span);
    spans.push(span);
  });

  return spans;
}

/**
 * Creates a GSAP from-tween for word spans.
 * Spans are visible by default — this just animates them in gracefully.
 */
export function animateWords(
  spans: HTMLSpanElement[],
  fromVars: gsap.TweenVars = {},
  toVars: gsap.TweenVars = {}
) {
  const f = { opacity: 0, y: 24, rotateX: -15, ...fromVars };
  const t = {
    opacity: 1,
    y: 0,
    rotateX: 0,
    duration: 0.5,
    stagger: 0.04,
    ease: "power2.out",
    ...toVars,
  };

  gsap.fromTo(spans, f, t);
}

/**
 * Hook: splits heading text into word spans and returns a ref + animate().
 * Word spans are VISIBLE by default — call animate() to trigger the reveal animation.
 * This avoids blank headings when ScrollTrigger hasn't fired yet.
 */
export function useTextSplit() {
  const ref = useRef<HTMLElement>(null);
  const spansRef = useRef<HTMLSpanElement[]>([]);

  const animate = useCallback((fromVars: gsap.TweenVars = {}) => {
    const spans = spansRef.current;
    if (!spans.length) return;
    gsap.fromTo(
      spans,
      { opacity: 0, y: 24, rotateX: -15, ...fromVars },
      {
        opacity: 1,
        y: 0,
        rotateX: 0,
        duration: 0.45,
        stagger: 0.035,
        ease: "power2.out",
      }
    );
  }, []);

  // Split on mount — no hiding
  useEffect(() => {
    if (!ref.current) return;
    spansRef.current = splitElement(ref.current);
  }, []);

  return { ref, animate, spans: spansRef };
}

export default useTextSplit;
