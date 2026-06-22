import { useRef, useEffect, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface ScrollRevealProps {
  children: ReactNode;
  direction?: "up" | "down" | "left" | "right";
  delay?: number;
  duration?: number;
  distance?: number;
  once?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function ScrollReveal({
  children,
  direction = "up",
  delay = 0,
  duration = 0.7,
  distance = 40,
  once = true,
  className,
  style,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const getTransform = () => {
      switch (direction) {
        case "up": return { y: distance };
        case "down": return { y: -distance };
        case "left": return { x: distance };
        case "right": return { x: -distance };
        default: return { y: distance };
      }
    };

    const fromVars = { opacity: 0, ...getTransform() };

    const st = ScrollTrigger.create({
      trigger: el,
      start: "top 88%",
      toggleActions: once ? "play none none none" : "play none none reverse",
      onEnter: () => {
        gsap.to(el, {
          opacity: 1,
          x: 0,
          y: 0,
          duration,
          delay,
          ease: "power2.out",
          overwrite: "auto",
        });
      },
    });

    // Set initial state
    gsap.set(el, fromVars);

    return () => {
      st.kill();
    };
  }, [direction, delay, duration, distance, once]);

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
